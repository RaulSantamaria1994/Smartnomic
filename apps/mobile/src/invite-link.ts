import { Platform } from 'react-native';
import { API_URL } from './config';

/**
 * Enlace para compartir una invitación. Abre la web de Smartnomic (la sirve el mismo
 * servidor); quien tenga la app también puede escribir el código.
 */
export function invitationLink(code: string): string {
  const origin =
    Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : API_URL;
  return `${origin}/invitacion/${code}`;
}
