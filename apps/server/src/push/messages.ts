import { formatCents } from '@smartnomic/domain';
import type { PushMessage } from './expo';

/**
 * Texto de los avisos de actividad (especificación 014, RF-1402). Es el único sitio donde se
 * escribe lo que dice un aviso. Con la app cerrada el sistema lo muestra tal cual llega, así
 * que el importe se formatea aquí con la función común de `packages/domain` (constitución,
 * art. III.2). Nunca lleva notas, descripciones ni saldos.
 */

/** Lo que cambió un miembro, con lo justo para escribir el aviso. */
export type ActivityChange =
  | {
      kind: 'expense' | 'income';
      amountCents: number;
      /** `null` si el movimiento no tiene categoría. */
      categoryName: string | null;
      date: string;
    }
  | { kind: 'payment'; ruleId: string; dueDate: string; ruleName: string; amountCents: number }
  | {
      kind: 'deposit' | 'withdrawal';
      goalId: string;
      goalName: string;
      amountCents: number;
    };

/** Pantalla a la que lleva el aviso al tocarlo (RF-1406). */
export type ActivityTarget =
  | { kind: 'transaction'; date: string }
  | { kind: 'occurrence'; ruleId: string; dueDate: string }
  | { kind: 'savings'; goalId: string }
  | { kind: 'month' };

// `type` y no `interface`: así encaja en `PushMessage.data` (un objeto con claves de texto).
export type ActivityData = {
  type: 'activity';
  householdId: string;
  target: ActivityTarget;
};

export interface ActivityDigest {
  householdId: string;
  householdName: string;
  currency: string;
  /** `null` si el miembro ya no existe al enviar: el aviso sale sin nombre. */
  authorName: string | null;
  changes: readonly ActivityChange[];
}

export interface ActivityNotification extends Omit<PushMessage, 'to' | 'data'> {
  data: ActivityData;
}

/** Canal de Android de estos avisos, separado de los recordatorios de pagos (RF-1408). */
export const ACTIVITY_CHANNEL = 'actividad';
const TTL_SECONDS = 24 * 60 * 60;

export function activityNotification(digest: ActivityDigest): ActivityNotification {
  const { changes } = digest;
  const only = changes.length === 1 ? changes[0] : undefined;
  return {
    title: digest.householdName,
    body: only ? describeOne(digest, only) : describeMany(digest),
    data: {
      type: 'activity',
      householdId: digest.householdId,
      target: only ? targetOf(only) : { kind: 'month' },
    },
    channelId: ACTIVITY_CHANNEL,
    priority: 'high',
    ttl: TTL_SECONDS,
    sound: 'default',
  };
}

/** «Juan ha apuntado…» o, sin autor, «Se ha apuntado…». */
function sentence(authorName: string | null, active: string, passive: string): string {
  return authorName ? `${authorName} ${active}` : passive;
}

function describeOne(digest: ActivityDigest, change: ActivityChange): string {
  const money = formatCents(change.amountCents, digest.currency);
  const who = digest.authorName;
  switch (change.kind) {
    case 'expense': {
      const place = change.categoryName ? ` en ${change.categoryName}` : '';
      return sentence(who, `ha apuntado ${money}${place}`, `Se ha apuntado ${money}${place}`);
    }
    case 'income': {
      const place = change.categoryName ? ` en ${change.categoryName}` : '';
      return sentence(
        who,
        `ha apuntado un ingreso de ${money}${place}`,
        `Se ha apuntado un ingreso de ${money}${place}`,
      );
    }
    case 'payment':
      return sentence(
        who,
        `ha pagado ${change.ruleName} (${money})`,
        `Se ha pagado ${change.ruleName} (${money})`,
      );
    case 'deposit':
      return sentence(
        who,
        `ha aportado ${money} a ${change.goalName}`,
        `Se ha aportado ${money} a ${change.goalName}`,
      );
    case 'withdrawal':
      return sentence(
        who,
        `ha sacado ${money} de ${change.goalName}`,
        `Se ha sacado ${money} de ${change.goalName}`,
      );
  }
}

/** Varios cambios: solo cuántos y de qué tipo, sin importes ni nombres. */
function describeMany(digest: ActivityDigest): string {
  const { changes, authorName: who } = digest;
  const n = changes.length;
  const kinds = new Set(changes.map((c) => group(c)));
  if (kinds.size === 1 && kinds.has('transaction')) {
    return sentence(who, `ha apuntado ${n} movimientos`, `Se han apuntado ${n} movimientos`);
  }
  if (kinds.size === 1 && kinds.has('payment')) {
    return sentence(who, `ha pagado ${n} recibos`, `Se han pagado ${n} recibos`);
  }
  if (kinds.size === 1 && kinds.has('savings')) {
    return sentence(
      who,
      `ha hecho ${n} movimientos en huchas`,
      `Se han hecho ${n} movimientos en huchas`,
    );
  }
  return sentence(who, `ha hecho ${n} cambios`, `Se han hecho ${n} cambios`);
}

function group(change: ActivityChange): 'transaction' | 'payment' | 'savings' {
  if (change.kind === 'expense' || change.kind === 'income') return 'transaction';
  return change.kind === 'payment' ? 'payment' : 'savings';
}

function targetOf(change: ActivityChange): ActivityTarget {
  switch (change.kind) {
    case 'expense':
    case 'income':
      return { kind: 'transaction', date: change.date };
    case 'payment':
      return { kind: 'occurrence', ruleId: change.ruleId, dueDate: change.dueDate };
    case 'deposit':
    case 'withdrawal':
      return { kind: 'savings', goalId: change.goalId };
  }
}
