import { create } from 'zustand';

/** Movimiento recién borrado que todavía se puede recuperar. */
interface UndoState {
  pending: { householdId: string; transactionId: string } | null;
  offer: (householdId: string, transactionId: string) => void;
  dismiss: () => void;
}

export const useUndo = create<UndoState>((set) => ({
  pending: null,
  offer: (householdId, transactionId) => set({ pending: { householdId, transactionId } }),
  dismiss: () => set({ pending: null }),
}));
