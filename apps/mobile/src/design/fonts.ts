import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_500Medium } from '@expo-google-fonts/plus-jakarta-sans/500Medium';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans/800ExtraBold';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFonts } from 'expo-font';
import { fontFamily } from './tokens';

/**
 * Plus Jakarta Sans en los cinco pesos que usa la app. Se importa cada peso por separado
 * para no meter en el paquete las cursivas ni los pesos que no se usan. Los iconos de
 * categoría se cargan a la vez para que no aparezcan vacíos al abrir (especificación 004).
 */
const fonts = {
  ...MaterialCommunityIcons.font,
  [fontFamily.regular]: PlusJakartaSans_400Regular,
  [fontFamily.medium]: PlusJakartaSans_500Medium,
  [fontFamily.semibold]: PlusJakartaSans_600SemiBold,
  [fontFamily.bold]: PlusJakartaSans_700Bold,
  [fontFamily.extrabold]: PlusJakartaSans_800ExtraBold,
};

/** `true` cuando la fuente está lista (o falló: entonces se usa la del sistema). */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts(fonts);
  return loaded || error !== null;
}
