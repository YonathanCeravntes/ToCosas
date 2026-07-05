/**
 * Constantes del Copiloto Financiero (FIN-005 / DEC-0005 v2 + adenda legal).
 */

/** Versión del texto de consentimiento. Subirla obliga a re-consentir (§4.2). */
export const AI_CONSENT_VERSION = 1;

/**
 * Texto de consentimiento v1 — DEC-0005 §14.1 (memorando legal, Ley 1581/2012):
 * identifica al responsable, la finalidad específica con IA/Anthropic, la
 * transferencia internacional a EE.UU., los derechos ARCO y la revocación.
 */
export const AI_CONSENT_TEXT = `Autorizo a Millo (responsable del tratamiento) a usar mis datos financieros agregados y minimizados (mi puntaje e indicadores, métricas mensuales, deudas identificadas de forma genérica con tipo/saldo/tasa/cuota, y totales de presupuesto y patrimonio — nunca mis notas, nombres personales, datos de contacto ni números de cuenta) con la finalidad específica de generar respuestas y explicaciones personalizadas mediante inteligencia artificial, a través del proveedor Anthropic PBC.

Entiendo que esto implica una transferencia internacional de datos a los Estados Unidos, país que no cuenta con un nivel adecuado de protección de datos según los criterios de la Superintendencia de Industria y Comercio de Colombia.

Conservo mis derechos de conocer, actualizar, rectificar y suprimir mis datos (derechos ARCO) y puedo revocar esta autorización en cualquier momento desde Ajustes, con efecto inmediato: al revocar, ningún dato mío volverá a enviarse al proveedor de IA. Mi historial de chat se conserva para mí y puedo borrarlo definitivamente cuando quiera con "Borrar historial del Copiloto".

El Copiloto entrega información y educación financiera general; no es asesoría financiera regulada ni una recomendación de productos de entidades específicas.`;

/** Límites de mensajes con IA por día (plantillas: ilimitadas). */
export const AI_DAILY_LIMIT_FREE = 10;
export const AI_DAILY_LIMIT_PREMIUM = 100;

/** Retenciones (ratificadas en DEC-0005 §8/§10.1: asimetría consciente). */
export const AI_LOG_RETENTION_MONTHS = 12;
export const CONVERSATION_RETENTION_MONTHS = 24;

/** Resiliencia del cliente Anthropic (§4.8). */
export const LLM_TIMEOUT_MS = 30_000;
export const LLM_MAX_RETRIES = 1; // solo red/5xx; 429 nunca se reintenta
export const LLM_RETRY_BACKOFF_MS = 1_000;
export const CIRCUIT_BREAKER_THRESHOLD = 5;
export const CIRCUIT_BREAKER_COOLDOWN_MS = 5 * 60_000;

/** Historial de conversación enviado al LLM (mensajes más recientes). */
export const LLM_HISTORY_LIMIT = 10;

export const LLM_MODEL_DEFAULT = 'claude-haiku-4-5-20251001';

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
export const SYSTEM_PROMPT = `Eres el Copiloto Financiero de Millo, una app colombiana de finanzas personales. Tu función es INTERPRETAR la información financiera ya calculada que recibes en el contexto — nunca calcular cifras nuevas ni inventar datos.

Reglas obligatorias:
1. Educación, no asesoría: entregas información y educación financiera general. No eres un asesor financiero regulado y lo aclaras si el usuario pide asesoría formal.
2. RECOMENDACIÓN GENÉRICA: NUNCA nombres entidades financieras, bancos, fintechs, marcas ni tasas de productos de terceros. Di "una entidad financiera" o "tu banco", jamás nombres propios de empresas. No compares productos comerciales.
3. Ancla cada afirmación en los números del contexto o de las herramientas. Si no tienes el dato, dilo — no lo estimes.
4. Las deudas y gastos fijos llegan como "deuda #1 (hipotecario)", "gasto fijo #2": úsalos tal cual; el usuario sabe a qué se refieren.
5. Responde en español, cálido y claro, sin jerga innecesaria. Explica los términos técnicos con el ejemplo real del usuario.
6. Sé breve: 2-4 frases para respuestas simples, listas cortas cuando ayuden.
7. No pidas ni menciones datos personales (nombres, teléfonos, correos, números de cuenta).`;

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
