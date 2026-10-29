/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Ajusta el proyecto Android que genera `expo prebuild` para compilar el APK en GitHub
 * Actions (.github/workflows/android.yml):
 *
 * - `ANDROID_VERSION_CODE`: número de versión de Android (el de la ejecución), para que
 *   cada APK se pueda instalar encima del anterior.
 * - `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` y
 *   `ANDROID_KEY_PASSWORD`: si están, el APK se firma con esa clave. Si no, se queda con
 *   la clave de depuración de la plantilla de Expo (sirve para probar, no para publicar).
 *
 *   node apps/mobile/scripts/prepare-android-ci.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

const GRADLE = path.join(__dirname, '..', 'android', 'app', 'build.gradle');
let gradle = fs.readFileSync(GRADLE, 'utf8');

/** Sustituye una vez y falla si la plantilla ha cambiado y ya no encuentra el texto. */
function replace(from, to) {
  if (!gradle.includes(from)) throw new Error(`No encuentro en build.gradle: ${from}`);
  gradle = gradle.replace(from, to);
}

const versionCode = process.env.ANDROID_VERSION_CODE;
if (versionCode) {
  if (!/^\d+$/.test(versionCode)) throw new Error('ANDROID_VERSION_CODE debe ser un número');
  if (!/versionCode \d+/.test(gradle)) throw new Error('No encuentro versionCode');
  gradle = gradle.replace(/versionCode \d+/, `versionCode ${versionCode}`);
  console.log(`versionCode ${versionCode}`);
}

const keystore = process.env.ANDROID_KEYSTORE_PATH;
if (keystore) {
  for (const name of ['ANDROID_KEYSTORE_PASSWORD', 'ANDROID_KEY_ALIAS', 'ANDROID_KEY_PASSWORD']) {
    if (!process.env[name]) throw new Error(`Falta ${name}`);
  }
  // Las contraseñas se leen del entorno al compilar; no se escriben en el archivo.
  replace(
    '    signingConfigs {\n',
    `    signingConfigs {
        release {
            storeFile file(System.getenv('ANDROID_KEYSTORE_PATH'))
            storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
            keyAlias System.getenv('ANDROID_KEY_ALIAS')
            keyPassword System.getenv('ANDROID_KEY_PASSWORD')
        }
`,
  );
  const release = gradle.indexOf('        release {', gradle.indexOf('buildTypes {'));
  const debugSigning = gradle.indexOf('signingConfig signingConfigs.debug', release);
  if (release < 0 || debugSigning < 0) throw new Error('No encuentro la firma de release');
  gradle =
    gradle.slice(0, debugSigning) +
    'signingConfig signingConfigs.release' +
    gradle.slice(debugSigning + 'signingConfig signingConfigs.debug'.length);
  console.log('Firma: clave propia');
} else {
  console.log('Firma: clave de depuración de la plantilla (sin secretos de firma)');
}

fs.writeFileSync(GRADLE, gradle);
