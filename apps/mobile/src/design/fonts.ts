import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFonts } from 'expo-font';

/**
 * La app usa la fuente del sistema (especificación 006, RF-602); solo se carga la de los
 * iconos, para que no aparezcan vacíos al abrir.
 */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts(MaterialCommunityIcons.font);
  return loaded || error !== null;
}
