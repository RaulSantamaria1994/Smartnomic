// Tipos globales de Expo (process.env, require de Metro…). Expo genera también
// expo-env.d.ts al arrancar, pero ese archivo no se versiona.
/// <reference types="expo/types" />

// Imágenes empaquetadas por Metro (el icono de la marca, por ejemplo).
declare module '*.png' {
  import type { ImageSourcePropType } from 'react-native';
  const source: ImageSourcePropType;
  export default source;
}
