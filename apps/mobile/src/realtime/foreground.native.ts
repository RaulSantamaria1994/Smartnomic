import { AppState } from 'react-native';

/** En Android: la app está en primer plano (especificación 012, la conexión solo entonces). */
export function isForeground(): boolean {
  return AppState.currentState === 'active';
}

export function onForegroundChange(listener: (foreground: boolean) => void): () => void {
  const subscription = AppState.addEventListener('change', (state) => listener(state === 'active'));
  return () => subscription.remove();
}
