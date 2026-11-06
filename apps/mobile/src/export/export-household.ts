import { api } from '../api/client';
import { saveFile } from './save-file';

/** Descarga todos los datos del hogar en un archivo JSON (RF-038). */
export async function exportHousehold(householdId: string): Promise<void> {
  const data = await api.exportHousehold(householdId);
  const day = data.exportedAt.slice(0, 10);
  await saveFile(`smartnomic-${day}.json`, JSON.stringify(data, null, 2), 'application/json');
}
