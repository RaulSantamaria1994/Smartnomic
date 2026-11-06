import { z } from 'zod';
import { searchQuerySchema } from './search';

/**
 * Filtros de `GET /api/households/:householdId/transactions/export` (especificación 010): los
 * mismos de la búsqueda, pero sin cursor, porque el archivo lleva todos los movimientos.
 */
export const exportQuerySchema = searchQuerySchema.refine((q) => q.cursor === undefined, {
  message: 'La exportación no va por páginas: quita el cursor.',
  path: ['cursor'],
});

/** El archivo ya hecho: su nombre y su texto (CSV para Excel en español). */
export const csvExportSchema = z.object({
  fileName: z.string().regex(/^smartnomic-movimientos-\d{4}-\d{2}-\d{2}\.csv$/),
  csv: z.string(),
});

export type CsvExport = z.infer<typeof csvExportSchema>;
