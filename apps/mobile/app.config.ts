import fs from 'node:fs';
import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * `google-services.json` lleva la clave de API de Google y no se sube al repositorio.
 * - En EAS llega como variable de tipo archivo `GOOGLE_SERVICES_JSON` (la ruta del archivo).
 * - En local, el archivo `apps/mobile/google-services.json` (ignorado por Git).
 * Sin ninguno de los dos, la app compila igual pero no recibe avisos push.
 */
const googleServicesFile =
  process.env.GOOGLE_SERVICES_JSON ??
  (fs.existsSync('./google-services.json') ? './google-services.json' : undefined);

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  android: {
    ...config.android,
    ...(googleServicesFile ? { googleServicesFile } : {}),
  },
});
