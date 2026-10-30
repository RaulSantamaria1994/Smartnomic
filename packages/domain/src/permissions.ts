/** Roles de un miembro del hogar (especificación 001, RF-006). */
export const ROLES = ['owner', 'editor', 'viewer'] as const;
export type Role = (typeof ROLES)[number];

export const ACTIONS = [
  /** Ver movimientos, pagos, categorías y miembros. */
  'household.view',
  /** Cambiar los ajustes del hogar (inicio de mes, hora de avisos). */
  'household.update',
  /** Invitar, anular invitaciones, cambiar roles, quitar miembros y pasar la propiedad. */
  'members.manage',
  /** Salir del hogar. */
  'household.leave',
  /** Crear, editar, borrar y restaurar movimientos. */
  'transactions.write',
  /** Crear, editar, desactivar y borrar pagos recurrentes. */
  'recurring.write',
  /** Marcar vencimientos como pagados u omitidos. */
  'occurrences.resolve',
  /** Crear, renombrar y archivar categorías. */
  'categories.write',
  /** Crear, editar y cerrar huchas; aportar, sacar y saltar meses (especificación 005). */
  'savings.write',
  /** Exportar todos los datos del hogar. */
  'data.export',
  /** Activar o desactivar los propios avisos. */
  'reminders.manageOwn',
] as const;
export type Action = (typeof ACTIONS)[number];

const VIEWER: readonly Action[] = [
  'household.view',
  'data.export',
  'reminders.manageOwn',
  'household.leave',
];

const EDITOR: readonly Action[] = [
  ...VIEWER,
  'transactions.write',
  'recurring.write',
  'occurrences.resolve',
  'categories.write',
  'savings.write',
];

// El propietario no puede salir: antes tiene que pasar la propiedad a otro miembro.
const OWNER: readonly Action[] = ACTIONS.filter((action) => action !== 'household.leave');

const PERMISSIONS: Record<Role, ReadonlySet<Action>> = {
  owner: new Set(OWNER),
  editor: new Set(EDITOR),
  viewer: new Set(VIEWER),
};

export function can(role: Role, action: Action): boolean {
  return PERMISSIONS[role].has(action);
}
