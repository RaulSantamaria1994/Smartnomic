// En la web no se guarda la caché: el navegador necesita conexión (constitución, art. IX.3).
import type { Persister } from '@tanstack/react-query-persist-client';

export const persister: Persister | undefined = undefined;
