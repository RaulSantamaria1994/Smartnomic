/** En la web Google no usa deep link: la cookie la pone el navegador. */
export async function captureAuthCallback(): Promise<void> {}

export function subscribeAuthCallback(): { remove: () => void } {
  return { remove() {} };
}
