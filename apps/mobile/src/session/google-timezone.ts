import { api } from '../api/client';

/** Tras entrar (también si Google redirige a `/` en la web), aplica la zona si el hogar es nuevo. */
export async function applyDeviceTimezone(): Promise<void> {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  await api.putTimezone(timezone).catch(() => undefined);
}
