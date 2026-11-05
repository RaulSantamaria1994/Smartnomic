import type { Category, Transaction } from '@smartnomic/api';
import { Amount, CategoryIcon, ListRow } from '../design';
import { formatMoney } from '../format';
import { es } from '../i18n/es';

/**
 * Fila de un movimiento: icono y nombre de la categoría, cuándo, la nota y quién lo apuntó, y
 * el importe. La usan «Mes» (con «Hoy», «Ayer»…) y la búsqueda (con la fecha completa, porque
 * mezcla años).
 */
export function TransactionRow({
  transaction,
  when,
  category,
  author,
  onPress,
}: {
  transaction: Transaction;
  /** Cuándo, ya escrito: «Hoy», «martes, 27 de octubre» o «27/10/2026». */
  when: string;
  category: Category | undefined;
  author: string | null;
  onPress: (() => void) | undefined;
}) {
  const name = category?.name ?? '—';
  const detail = [when, transaction.note, author && es.household.byMember(author)]
    .filter(Boolean)
    .join(' · ');
  return (
    <ListRow
      title={name}
      detail={detail}
      leading={<CategoryIcon icon={category?.icon} tone={category?.color} />}
      trailing={<Amount cents={transaction.amountCents} kind={transaction.kind} />}
      onPress={onPress}
      accessibilityLabel={`${name}, ${formatMoney(transaction.amountCents)}, ${detail}`}
    />
  );
}
