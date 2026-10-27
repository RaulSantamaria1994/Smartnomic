export interface BaseUrlEnv {
  BETTER_AUTH_URL?: string | undefined;
  /** Dominio público que Railway da al servicio, sin protocolo. */
  RAILWAY_PUBLIC_DOMAIN?: string | undefined;
}

/**
 * URL pública del servidor. Si no se configura BETTER_AUTH_URL, se usa el dominio que
 * Railway da al servicio; en desarrollo, localhost.
 */
export function resolveBaseUrl(
  env: BaseUrlEnv,
  options: { production: boolean; port: number },
): string {
  const configured = env.BETTER_AUTH_URL?.trim();
  if (configured) {
    if (!/^https?:\/\//i.test(configured) || !URL.canParse(configured)) {
      throw new Error(
        `BETTER_AUTH_URL debe ser una dirección completa que empiece por https:// ` +
          `(por ejemplo, https://smartnomic.up.railway.app), pero vale «${configured}».`,
      );
    }
    return configured.replace(/\/+$/, '');
  }

  const railway = env.RAILWAY_PUBLIC_DOMAIN?.trim();
  if (railway) return `https://${railway.replace(/^https?:\/\//i, '').replace(/\/+$/, '')}`;

  if (options.production) {
    throw new Error('Falta BETTER_AUTH_URL: la dirección pública del servidor (https://…).');
  }
  return `http://localhost:${options.port}`;
}
