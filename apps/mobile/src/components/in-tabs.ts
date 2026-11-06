import { createContext, useContext } from 'react';

/**
 * Pantallas dentro de las pestañas: la barra inferior ya deja sitio a los botones del móvil.
 * Las demás (apuntar, editar…) tienen que dejarlo ellas.
 */
export const InTabsContext = createContext(false);

export function useInTabs(): boolean {
  return useContext(InTabsContext);
}
