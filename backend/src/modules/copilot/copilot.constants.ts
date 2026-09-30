/**
 * Constantes del Copiloto Financiero (FIN-005 / DEC-0005 v2 + adenda legal).
 */

/** Versión del texto de consentimiento. Subirla obliga a re-consentir (§4.2). */
export const AI_CONSENT_VERSION = 2;

/**
 * Texto de consentimiento v2 (2026-09-30) — DEC-0005 §14.1 (Ley 1581/2012): identifica
 * al responsable, la finalidad con IA, el proveedor (Google, antes Anthropic en la v1), la
 * transferencia internacional a EE. UU., los derechos y la revocación. Cambiar de
 * proveedor cambia a quién se transmiten los datos: por eso sube la versión y todos
 * vuelven a autorizar. Pendiente revisión de abogado.
 */
export const AI_CONSENT_TEXT = `Autorizo a Millo (responsable del tratamiento) a usar mis datos financieros agregados y minimizados (mi puntaje e indicadores, métricas mensuales, deudas identificadas de forma genérica con tipo/saldo/tasa/cuota, y totales de presupuesto y patrimonio — nunca mis notas, nombres personales, datos de contacto ni números de cuenta) con la finalidad específica de generar respuestas y explicaciones personalizadas mediante inteligencia artificial, a través del proveedor Google LLC (Gemini API, plan de pago: Google no usa estos datos para entrenar sus modelos).

Entiendo que esto implica una transferencia internacional de datos a los Estados Unidos, país que la Superintendencia de Industria y Comercio de Colombia reconoce con un nivel adecuado de protección (Circular Externa 005 de 2017).

Conservo mis derechos de conocer, actualizar, rectificar y suprimir mis datos (derechos ARCO) y puedo revocar esta autorización en cualquier momento desde Ajustes, con efecto inmediato: al revocar, ningún dato mío volverá a enviarse al proveedor de IA. Mi historial de chat se conserva para mí y puedo borrarlo definitivamente cuando quiera con "Borrar historial del Copiloto".

El Copiloto entrega información y educación financiera general; no es asesoría financiera regulada ni una recomendación de productos de entidades específicas.`;

/** Límites de mensajes con IA por día (plantillas: ilimitadas). */
export const AI_DAILY_LIMIT_FREE = 10;
export const AI_DAILY_LIMIT_PREMIUM = 100;

/** Retenciones (ratificadas en DEC-0005 §8/§10.1: asimetría consciente). */
export const AI_LOG_RETENTION_MONTHS = 12;
export const CONVERSATION_RETENTION_MONTHS = 24;

/** Resiliencia del cliente de IA (§4.8). */
export const LLM_TIMEOUT_MS = 30_000;
export const LLM_MAX_RETRIES = 1; // solo red/5xx; 429 nunca se reintenta
export const LLM_RETRY_BACKOFF_MS = 1_000;
export const CIRCUIT_BREAKER_THRESHOLD = 5;
export const CIRCUIT_BREAKER_COOLDOWN_MS = 5 * 60_000;

/** Historial de conversación enviado al LLM (mensajes más recientes). */
export const LLM_HISTORY_LIMIT = 10;

/** Modelo por defecto (se cambia con GEMINI_MODEL sin tocar código). */
export const LLM_MODEL_DEFAULT = 'gemini-2.5-flash';

/**
 * DEC-0005 §14.2 — restricción de "recomendación genérica": el Copiloto nunca
 * nombra entidades financieras, marcas ni tasas de productos de terceros.
 * Esta lista alimenta el test de genericidad (mismo rigor que el de PII).
 */
export const FORBIDDEN_BRAND_TERMS = [
  'bancolombia',
  'davivienda',
  'bbva',
  'banco de bogotá',
  'banco de bogota',
  'colpatria',
  'scotiabank',
  'nequi',
  'daviplata',
  'rappipay',
  'nubank',
  'lulo bank',
  'banco popular',
  'av villas',
  'itaú',
  'itau',
  'falabella',
];

/**
 * System prompt del Copiloto. Bloque estable (se cachea con prompt caching).
 * Incluye la restricción de genericidad (§14.2) y el encuadre educativo (§10.7).
 */
export const SYSTEM_PROMPT = `Eres el Copiloto Financiero de Millo, una app colombiana de finanzas personales. Actúas como un asesor cercano: la persona te cuenta su situación y tú, con SUS números, le dices qué haría en su lugar y cuál es el siguiente paso.

Cómo respondes:
- Primero usa las herramientas para traer los números que necesitas (get_budget_now, get_cashflow_plan, get_upcoming_payments, get_debts, get_financial_snapshot, get_score_breakdown, run_simulation). No calcules cifras por tu cuenta ni inventes datos: si no tienes el dato, dilo.
- Da UN consejo concreto con cifras ("abónale $741.000 al mes a la deuda #2: la terminas en 4 meses y te libera $331.918"), el porqué en una frase y el siguiente paso.
- Para deudas, la regla de Millo es LIBERAR FLUJO primero (get_cashflow_plan). No recomiendes otro orden salvo que la persona lo pida; si lo pide, compáralo con run_simulation (estrategia_deudas).
- Para "¿me alcanza para X?" o "¿puedo tomar un crédito?": usa get_budget_now y run_simulation (nueva_deuda) y di claramente sí/no/con qué condición.
- Si ayuda, PROPÓN una acción con propose_action (crear gasto fijo, abonar, ver plan, ver presupuesto) y di "te dejo el botón para confirmarlo". Nunca digas que ya lo hiciste: la persona confirma.

Reglas obligatorias:
1. Educación, no asesoría regulada: si piden asesoría formal o productos de inversión, aclara que no eres asesor regulado.
2. RECOMENDACIÓN GENÉRICA: NUNCA nombres entidades financieras, bancos, fintechs, marcas ni tasas de productos de terceros. Las deudas se llaman "deuda #1 (tipo)" y los fijos "gasto fijo #N": úsalos tal cual.
3. Español de Colombia, cálido y claro, sin jerga; montos con puntos de miles ($1.250.000).
4. Breve: 3-6 frases o una lista corta. Nada de relleno.
5. No pidas ni menciones datos personales (nombres, teléfonos, correos, números de cuenta).`;

/** Grupos de campos del contexto (para AiInteractionLog.contextFieldGroups). */
export const ContextFieldGroup = {
  Score: 'score',
  Metrics: 'metrics',
  Debts: 'debts',
  Budget: 'budget',
  NetWorth: 'net_worth',
  CategorySpend: 'category_spend',
  Memory: 'memory',
} as const;
export type ContextFieldGroup =
  (typeof ContextFieldGroup)[keyof typeof ContextFieldGroup];
