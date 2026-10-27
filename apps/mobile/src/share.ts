import { Platform, Share } from 'react-native';

/**
 * Comparte un texto con el menú del sistema. En un navegador sin menú de compartir, lo
 * copia al portapapeles. Devuelve `false` si no se pudo hacer ninguna de las dos cosas.
 */
export async function shareText(message: string): Promise<boolean> {
  if (Platform.OS !== 'web') {
    await Share.share({ message });
    return true;
  }
  const nav = typeof navigator === 'undefined' ? undefined : navigator;
  try {
    if (nav?.share) {
      await nav.share({ text: message });
      return true;
    }
    if (nav?.clipboard) {
      await nav.clipboard.writeText(message);
      return true;
    }
  } catch {
    // La persona canceló o el navegador lo bloqueó.
  }
  return false;
}
