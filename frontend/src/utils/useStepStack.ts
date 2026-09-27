import { useCallback, useState } from 'react';

/**
 * SPRINT-PULIDO-001 (P0.1) · Pila de pasos REAL para flujos guiados no lineales.
 *
 * El árbol de un wizard puede bifurcar (p. ej. por método de pago), así que un
 * contador no basta: se guarda el historial exacto de pasos visitados y "atrás"
 * hace `pop` restaurando el paso anterior tal cual. Los DATOS diligenciados viven
 * fuera de la pila (en los estados del formulario) y NUNCA se borran al retroceder
 * — regla explícita del Fundador.
 *
 * Mecanismo genérico y reutilizable (declarado para `AddDebtScreen` como candidata).
 */
export function useStepStack<T>(initial: T) {
  const [stack, setStack] = useState<T[]>([initial]);

  const current = stack[stack.length - 1];
  const canGoBack = stack.length > 1;

  /** Avanza a un paso nuevo (lo apila — el historial queda intacto). */
  const push = useCallback((step: T) => {
    setStack((s) => [...s, step]);
  }, []);

  /** Vuelve exactamente un paso (no borra datos del formulario). */
  const pop = useCallback(() => {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  }, []);

  /** Reinicia el flujo al paso inicial (p. ej. "Registrar otra cosa"). */
  const reset = useCallback(() => {
    setStack([initial]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { current, canGoBack, push, pop, reset };
}
