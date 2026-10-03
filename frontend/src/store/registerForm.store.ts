import { create } from 'zustand';

/**
 * FIN-060 · Botón central de Registrar como "✓ Guardar".
 *
 * AddTransactionScreen publica aquí si su formulario está activo y listo; la barra de
 * pestañas (MainTabs → RegisterTabButton) lo lee para pintar "+" o "✓" y, al tocar,
 * llama `submit` (listo) o `nudge` (falta algo: muestra qué y enfoca el campo).
 */
export interface RegisterFormState {
  /** La pantalla Registrar está enfocada en un paso con acción final. */
  active: boolean;
  /** El formulario pasa la validación y se puede guardar. */
  ready: boolean;
  /** La acción del botón final del paso actual. */
  submit: (() => void) | null;
  /** Pide foco/aviso del campo que falta (no guarda nada). */
  nudge: (() => void) | null;
  setActive: (active: boolean) => void;
  setReady: (ready: boolean) => void;
  setSubmit: (submit: (() => void) | null) => void;
  setNudge: (nudge: (() => void) | null) => void;
  /** Vuelve al estado inicial (pestaña normal con "+"). */
  clear: () => void;
}

export const useRegisterForm = create<RegisterFormState>((set) => ({
  active: false,
  ready: false,
  submit: null,
  nudge: null,
  setActive: (active) => set({ active }),
  setReady: (ready) => set({ ready }),
  setSubmit: (submit) => set({ submit }),
  setNudge: (nudge) => set({ nudge }),
  clear: () => set({ active: false, ready: false, submit: null, nudge: null }),
}));
