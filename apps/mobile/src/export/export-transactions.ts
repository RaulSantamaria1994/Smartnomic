import type { SearchFilters } from '@smartnomic/api';
import { api } from '../api/client';
import { saveFile } from './save-file';

/**
 * Exporta a CSV los movimientos que cumplen los filtros de la búsqueda (especificación 010):
 * en el navegador se descarga y en Android se abre el menú de compartir.
 */
export async function exportTransactions(
  householdId: string,
  filters: SearchFilters,
): Promise<void> {
  const { fileName, csv } = await api.exportTransactions(householdId, filters);
  await saveFile(fileName, csv, 'text/csv');
}
