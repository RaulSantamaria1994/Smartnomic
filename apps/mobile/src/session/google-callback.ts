/** En la web Google no usa deep link: la cookie la pone el navegador. */
export async function applyAuthCallbackUrl(_url: string | null): Promise<void> {}

export async function captureAuthCallback(): Promise<void> {}

export function subscribeAuthCallback(): { remove: () => void } {
  return { remove() {} };
}

export async function sessionFromGoogleCallback(): Promise<boolean> {
  return false;
}
