import { create } from 'zustand';
import type { PermissionStatus } from '../reminders/reminders';

/** Permiso de notificaciones del dispositivo, para avisar si falta (RF-035). */
export const useNotificationPermission = create<{
  status: PermissionStatus | null;
  set: (status: PermissionStatus) => void;
}>((set) => ({ status: null, set: (status) => set({ status }) }));
