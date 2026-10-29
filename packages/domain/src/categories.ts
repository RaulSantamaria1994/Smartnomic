import type { CategoryIconId } from './categoryIcons';
import type { TransactionKind } from './summary';

export interface DefaultCategory {
  kind: TransactionKind;
  name: string;
  icon: CategoryIconId;
  color: string;
}

/** Categorías con las que empieza cada hogar (especificación 001, RF-020). */
export const DEFAULT_CATEGORIES: readonly DefaultCategory[] = [
  { kind: 'income', name: 'Nómina', icon: 'salary', color: '#1E7A3C' },
  { kind: 'income', name: 'Otros ingresos', icon: 'cash', color: '#2E8B57' },
  { kind: 'expense', name: 'Vivienda', icon: 'home', color: '#8E5A2B' },
  { kind: 'expense', name: 'Suministros', icon: 'utilities', color: '#C28A00' },
  { kind: 'expense', name: 'Supermercado', icon: 'groceries', color: '#2F7D32' },
  { kind: 'expense', name: 'Transporte', icon: 'car', color: '#1F5FBF' },
  { kind: 'expense', name: 'Salud', icon: 'health', color: '#C62828' },
  { kind: 'expense', name: 'Educación', icon: 'education', color: '#5E35B1' },
  { kind: 'expense', name: 'Ocio', icon: 'leisure', color: '#D81B60' },
  { kind: 'expense', name: 'Ropa', icon: 'clothes', color: '#00838F' },
  { kind: 'expense', name: 'Suscripciones', icon: 'subscriptions', color: '#6D4C41' },
  { kind: 'expense', name: 'Seguros', icon: 'insurance', color: '#455A64' },
  { kind: 'expense', name: 'Otros gastos', icon: 'other', color: '#757575' },
];
