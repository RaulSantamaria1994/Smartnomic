import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { api } from '../api/client';
import { useHousehold } from '../households/active';
import { permissionStatus, requestPermission } from '../reminders/reminders';
import { authClient } from '../session/auth-client';
import { useNotificationPermission } from '../state/permission';
import { ensureActivityChannel, getPushToken, onPushTokenChanged, pushSupported } from './push';
import { needsRegistration } from './registration';
import { readRegistration, writeRegistration } from './registration-storage';

/**
 * Registra este dispositivo para recibir avisos de lo que apuntan otros miembros (especificación
 * 014, RF-1409). Con el permiso de notificaciones concedido, al abrir la app y al volver a primer
 * plano obtiene el token de Expo Push y, si no es el que ya se registró con esta sesión, lo envía
 * al servidor (escenarios 3.1 y 3.2). Si Android cambia el token, vuelve a hacerlo. Si falla (sin
 * conexión, sin Firebase en la compilación), se reintenta la próxima vez: nunca rompe la app.
 * En la web no hace nada (RF-1412).
 */
export function usePushRegistration(): void {
  const { me } = useHousehold();
  const session = authClient.useSession();
  const sessionId = session.data?.session.id;
  const setPermission = useNotificationPermission((state) => state.set);
  // Hay algún hogar con los avisos de actividad activados (lo están al entrar en un hogar).
  const wanted = (me.data?.households ?? []).some(
    ({ member }) => member.activityAlertsEnabled !== false,
  );
  const running = useRef(false);

  const register = useCallback(async () => {
    if (!pushSupported || !sessionId || !wanted || running.current) return;
    running.current = true;
    try {
      let status = await permissionStatus();
      if (status === 'undetermined') status = await requestPermission();
      setPermission(status);
      if (status !== 'granted') return;
      await ensureActivityChannel();
      const token = await getPushToken();
      if (!token) return;
      const current = { token, sessionId };
      if (!needsRegistration(await readRegistration(), current)) return;
      await api.registerPushDevice(token);
      await writeRegistration(current);
    } catch {
      // Sin conexión o sin Firebase: se reintenta al abrir la app o al volver a primer plano.
    } finally {
      running.current = false;
    }
  }, [sessionId, wanted, setPermission]);

  useEffect(() => {
    void register();
  }, [register]);

  // Al volver a primer plano: el permiso pudo concederse desde los ajustes del sistema.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void register();
    });
    return () => subscription.remove();
  }, [register]);

  // Android puede cambiar el token del dispositivo.
  useEffect(() => onPushTokenChanged(() => void register()), [register]);
}
