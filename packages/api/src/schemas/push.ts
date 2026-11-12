import { z } from 'zod';

// Avisos push de cambios de otros miembros (especificación 014).

/** `ExponentPushToken[…]` o `ExpoPushToken[…]`: lo que devuelve `getExpoPushTokenAsync`. */
export const EXPO_PUSH_TOKEN = /^Expo(nent)?PushToken\[[A-Za-z0-9_-]{1,200}\]$/;

const expoPushTokenSchema = z.string().regex(EXPO_PUSH_TOKEN, { message: 'Token no válido.' });

/**
 * Cuerpo de `PUT /api/push-device`: el token de este móvil, que el servidor ata a la sesión
 * de la petición (RF-1409). Nada más: el usuario sale de la sesión, nunca del cuerpo.
 */
export const pushDeviceSchema = z.object({ token: expoPushTokenSchema }).strict();

export type PushDeviceInput = z.infer<typeof pushDeviceSchema>;

/** Cuerpo de `DELETE /api/push-device`: el token que se da de baja. */
export const deletePushDeviceSchema = pushDeviceSchema;
