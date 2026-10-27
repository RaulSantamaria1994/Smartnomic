import type { TransactionKind } from './summary';

export interface DefaultCategory {
  kind: TransactionKind;
  name: string;
  icon: string;
  color: string;
}

/** Categorías con las que empieza cada hogar (especificación 001, RF-020). */
export const DEFAULT_CATEGORIES: readonly DefaultCategory[] = [
  { kind: 'income', name: 'Nómina', icon: '💼', color: '#1E7A3C' },
  { kind: 'income', name: 'Otros ingresos', icon: '💰', color: '#2E8B57' },
  { kind: 'expense', name: 'Vivienda', icon: '🏠', color: '#8E5A2B' },
  { kind: 'expense', name: 'Suministros', icon: '💡', color: '#C28A00' },
  { kind: 'expense', name: 'Supermercado', icon: '🛒', color: '#2F7D32' },
  { kind: 'expense', name: 'Transporte', icon: '🚗', color: '#1F5FBF' },
  { kind: 'expense', name: 'Salud', icon: '🩺', color: '#C62828' },
  { kind: 'expense', name: 'Educación', icon: '🎓', color: '#5E35B1' },
  { kind: 'expense', name: 'Ocio', icon: '🎉', color: '#D81B60' },
  { kind: 'expense', name: 'Ropa', icon: '👕', color: '#00838F' },
  { kind: 'expense', name: 'Suscripciones', icon: '📺', color: '#6D4C41' },
  { kind: 'expense', name: 'Seguros', icon: '🛡️', color: '#455A64' },
  { kind: 'expense', name: 'Otros gastos', icon: '📦', color: '#757575' },
];
