import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * Guarda el archivo en la caché de la app y abre el menú de compartir para que la persona
 * lo guarde donde quiera (Drive, correo, Descargas…).
 */
export async function saveJsonFile(name: string, content: string): Promise<void> {
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  await file.write(content);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: name });
}
