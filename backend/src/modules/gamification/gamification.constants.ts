/**
 * Gamificación (FIN-008 / DEC-0008). Catálogo curado en código: hitos
 * financieros REALES, tono sobrio (mandato ARQ-0001: sin infantilizar).
 * Los textos entran al test de genericidad (sin marcas, DEC-0005 §14.2).
 */

export interface AchievementDef {
  code: string;
  title: string;
  body: string;
  condition: string; // visible en la pantalla de Logros (transparencia)
  xp: number;
}

export const ACHIEVEMENT_CATALOG: AchievementDef[] = [
  { code: 'primer_movimiento', title: 'Primer paso', body: 'Registraste tu primer movimiento. Todo control empieza por ver los números.', condition: 'Registra tu primer movimiento', xp: 10 },
  { code: 'primera_deuda', title: 'Deuda sobre la mesa', body: 'Registraste tu primera deuda. Conocerla es el primer paso para vencerla.', condition: 'Registra tu primera deuda', xp: 15 },
  { code: 'primera_cuenta', title: 'Patrimonio visible', body: 'Registraste tu primera cuenta. Ya sabes con qué cuentas.', condition: 'Registra tu primera cuenta o activo', xp: 15 },
  { code: 'primer_presupuesto', title: 'Reglas del juego', body: 'Definiste tu primer compromiso fijo. Tu presupuesto empieza a tener forma.', condition: 'Registra tu primer ingreso o gasto fijo', xp: 15 },
  { code: 'primera_simulacion', title: 'Decidir con datos', body: 'Corriste tu primera simulación. Probar antes de decidir es de estrategas.', condition: 'Ejecuta tu primera simulación', xp: 10 },
  { code: 'racha_4', title: 'Un mes de constancia', body: 'Cuatro semanas seguidas registrando. La constancia es el hábito que más paga.', condition: 'Racha de 4 semanas registrando', xp: 25 },
  { code: 'racha_12', title: 'Un trimestre firme', body: 'Doce semanas consecutivas. Esto ya es un hábito de verdad.', condition: 'Racha de 12 semanas registrando', xp: 60 },
  { code: 'fondo_3m', title: 'Colchón inicial', body: 'Tu fondo de emergencia cubre 3 meses de gastos esenciales.', condition: 'Fondo de emergencia ≥ 3 meses', xp: 50 },
  { code: 'fondo_6m', title: 'Fondo de emergencia completo', body: 'Seis meses de gastos cubiertos. Los imprevistos ya no te definen.', condition: 'Fondo de emergencia ≥ 6 meses', xp: 100 },
  { code: 'deuda_saldada', title: 'Deuda saldada', body: 'Terminaste de pagar una deuda. Ese dinero mensual vuelve a ser tuyo.', condition: 'Salda una deuda por completo', xp: 80 },
  { code: 'score_saludable', title: 'Finanzas saludables', body: 'Tu Score Millo alcanzó la banda saludable.', condition: 'Score en banda saludable', xp: 60 },
  { code: 'score_elite', title: 'Nivel élite', body: 'Tu Score Millo alcanzó la banda élite. Muy pocos llegan aquí.', condition: 'Score en banda élite', xp: 120 },
];

/** Umbrales de nivel (XP acumulado) — 7 niveles, nombres sobrios. */
export const LEVELS: Array<{ level: number; name: string; minXp: number }> = [
  { level: 1, name: 'Inicio', minXp: 0 },
  { level: 2, name: 'En marcha', minXp: 50 },
  { level: 3, name: 'Constante', minXp: 120 },
  { level: 4, name: 'Disciplinado', minXp: 220 },
  { level: 5, name: 'Sólido', minXp: 350 },
  { level: 6, name: 'Avanzado', minXp: 520 },
  { level: 7, name: 'Referente', minXp: 750 },
];

/** Bono de racha: best × 5, con tope de 26 semanas (medio año). */
export const STREAK_XP_PER_WEEK = 5;
export const STREAK_XP_CAP_WEEKS = 26;
/** XP por reto mensual completado. */
export const CHALLENGE_XP = 30;

export const CHALLENGE_DEFS: Record<string, { title: string; body: string }> = {
  registro_constante: {
    title: 'Registro constante',
    body: 'Registra al menos un movimiento en todas las semanas del mes.',
  },
  flujo_positivo: {
    title: 'Mes en positivo',
    body: 'Termina el mes con más ingresos que salidas.',
  },
  bajo_promedio: {
    title: 'Bajo tu promedio',
    body: 'Mantén tu categoría de gasto flexible por debajo de tu promedio de los últimos meses.',
  },
};
