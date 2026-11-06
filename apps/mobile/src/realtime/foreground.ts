/** En la web: la pestaña está a la vista (especificación 012, la conexión solo entonces). */
export function isForeground(): boolean {
  return typeof document === 'undefined' || document.visibilityState === 'visible';
}

export function onForegroundChange(listener: (foreground: boolean) => void): () => void {
  if (typeof document === 'undefined') return () => undefined;
  const handler = () => listener(isForeground());
  document.addEventListener('visibilitychange', handler);
  return () => document.removeEventListener('visibilitychange', handler);
}
