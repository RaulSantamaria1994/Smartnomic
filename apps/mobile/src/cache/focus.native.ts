import { focusManager } from '@tanstack/react-query';
import { AppState } from 'react-native';

/**
 * Al volver la app a primer plano, TanStack Query recarga lo que esté desfasado, así se
 * ven los cambios de otros miembros del hogar (T084).
 */
export function watchAppFocus(): void {
  focusManager.setEventListener((setFocused) => {
    const subscription = AppState.addEventListener('change', (state) =>
      setFocused(state === 'active'),
    );
    return () => subscription.remove();
  });
}
