import { create } from 'zustand';
import { getPref, setPref } from '../utils/prefs';

/**
 * FIN-060 · Recorrido de bienvenida. Se muestra una vez por persona y dispositivo
 * (`tour.v1.<id>`); "Ver el recorrido otra vez" (Ajustes) lo vuelve a abrir. La
 * versión en la clave permite relanzar un recorrido nuevo en el futuro.
 */
const key = (userId: string) => `tour.v1.${userId}`;

interface TourState {
  step: number | null;
  start: () => void;
  next: (total: number) => void;
  finish: (userId?: string) => void;
  maybeAutoStart: (userId: string) => Promise<void>;
}

export const useTourStore = create<TourState>((set, get) => ({
  step: null,
  start: () => set({ step: 0 }),
  next: (total) => {
    const s = get().step;
    set({ step: s == null || s + 1 >= total ? null : s + 1 });
  },
  finish: (userId) => {
    set({ step: null });
    if (userId) void setPref(key(userId), 'seen');
  },
  maybeAutoStart: async (userId) => {
    if (get().step != null) return;
    const seen = await getPref(key(userId));
    if (seen) return;
    await setPref(key(userId), 'seen');
    set({ step: 0 });
  },
}));
