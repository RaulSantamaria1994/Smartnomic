/** Celda mínima de la cuadrícula de iconos: por encima de los 44 px táctiles (RF-404). */
export const MIN_ICON_CELL = 48;

/** Tantas columnas como quepan con celdas de al menos `MIN_ICON_CELL`. */
export const iconColumnsFor = (width: number, gap: number) =>
  Math.max(1, Math.floor((width + gap) / (MIN_ICON_CELL + gap)));
