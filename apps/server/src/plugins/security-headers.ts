import type { FastifyInstance } from 'fastify';

/**
 * Política de contenido de la web. Los scripts, las fuentes y la API son del propio
 * dominio; React Native Web inyecta estilos en tiempo de ejecución, por eso los estilos
 * admiten `unsafe-inline` (los scripts no). Nadie puede meter la web en un iframe.
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

/**
 * Cabeceras de seguridad en todas las respuestas. Las de la API, con datos personales y
 * económicos, no se guardan en ninguna caché.
 */
export function registerSecurityHeaders(app: FastifyInstance, options: { hsts: boolean }): void {
  app.addHook('onSend', async (request, reply, payload) => {
    reply.header('content-security-policy', CONTENT_SECURITY_POLICY);
    reply.header('x-content-type-options', 'nosniff');
    reply.header('x-frame-options', 'DENY');
    // Las invitaciones llevan el código en la URL: no se manda a otros sitios.
    reply.header('referrer-policy', 'no-referrer');
    reply.header('permissions-policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    reply.header('cross-origin-opener-policy', 'same-origin');
    if (options.hsts)
      reply.header('strict-transport-security', 'max-age=31536000; includeSubDomains');
    if (request.url.startsWith('/api/')) reply.header('cache-control', 'no-store');
    return payload;
  });
}
