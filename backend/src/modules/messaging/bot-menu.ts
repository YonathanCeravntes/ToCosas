/**
 * FIN-055 · Personalización del bot de Telegram (boceto aprobado por el Fundador
 * 2026-09-30): perfil, menú de comandos, botones fijos y botones bajo cada gasto.
 * Aquí solo viven los textos y el reconocimiento de comandos; la lógica usa los
 * servicios de siempre (ConversationService).
 */

/** Botón bajo un mensaje: `data` vuelve como callback (máx. 64 bytes). */
export interface BotButton {
  text: string;
  data: string;
}

/** Respuesta del bot con botones opcionales. WhatsApp usa solo `text`. */
export interface BotReply {
  text: string;
  /** Botones bajo el mensaje, en filas. */
  buttons?: BotButton[][];
  /** Muestra (o renueva) los 4 botones fijos del teclado. */
  mainKeyboard?: boolean;
}

export const BOT_NAME = 'Millo';

/** Pantalla vacía antes de "Iniciar" (máx. 512 caracteres). */
export const BOT_DESCRIPTION =
  'Soy Millo, tu copiloto de plata. Escríbeme tus gastos como se los dirías a un amigo, ' +
  'mándame fotos de facturas y extractos, y te digo cuánto te queda este mes.\n\n' +
  '• "almuerzo 18.500" y queda anotado\n' +
  '• Guardo tus facturas para la renta\n' +
  '• Te aviso antes de cada pago';

/** "Acerca de" del perfil (máx. 120 caracteres). */
export const BOT_SHORT_DESCRIPTION = 'Tu plata, clara. Registra gastos, guarda facturas y controla tus deudas.';

/** Menú "/" — sin /gasto ni /ingreso: basta con escribir el movimiento. */
export const BOT_COMMANDS = [
  { command: 'queda', description: '¿Cuánto me queda?' },
  { command: 'pagos', description: 'Próximos pagos' },
  { command: 'deudas', description: 'Mis deudas y el plan' },
  { command: 'documentos', description: 'Guardar facturas' },
  { command: 'app', description: 'Abrir Millo' },
  { command: 'ayuda', description: 'Qué puedo hacer' },
] as const;

/** Los 4 botones fijos del teclado, en 2 filas. */
export const MAIN_KEYBOARD = [
  ['Anotar gasto', '¿Cuánto me queda?'],
  ['Guardar factura', 'Mis deudas'],
];

export type MenuAction = 'start' | 'gasto' | 'queda' | 'pagos' | 'deudas' | 'documentos' | 'app' | 'ayuda';

const COMMANDS: Record<string, MenuAction> = {
  start: 'start',
  gasto: 'gasto',
  queda: 'queda',
  pagos: 'pagos',
  deudas: 'deudas',
  documentos: 'documentos',
  app: 'app',
  ayuda: 'ayuda',
  help: 'ayuda',
};

/** Textos EXACTOS de los botones fijos (sin tildes ni signos). */
const LABELS: Record<string, MenuAction> = {
  'anotar gasto': 'gasto',
  'cuanto me queda': 'queda',
  'guardar factura': 'documentos',
  'mis deudas': 'deudas',
};

/** "/queda", "/queda@Millo_bot" o el texto de un botón fijo → acción. "/start 123456" no (es vinculación). */
export function parseMenuCommand(text: string): MenuAction | null {
  const t = text.trim();
  const cmd = /^\/([a-z]+)(@\w+)?$/i.exec(t);
  if (cmd) return COMMANDS[cmd[1].toLowerCase()] ?? null;
  const plain = t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[¿?¡!.]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return LABELS[plain] ?? null;
}

export type BotCallback =
  | { kind: 'undo'; txId: string }
  | { kind: 'categories'; txId: string }
  | { kind: 'set_category'; txId: string; prefix: string }
  | { kind: 'other_category'; txId: string };

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const CALLBACK = new RegExp(`^(un|ct|co|sc):(${UUID})(?::([0-9a-f]{8}))?$`);

/**
 * Callbacks compactos (Telegram limita `data` a 64 bytes):
 * `un:<tx>` deshacer · `ct:<tx>` ver categorías · `sc:<tx>:<8 hex de la categoría>` · `co:<tx>` otra.
 */
export function parseCallback(data: string): BotCallback | null {
  const m = CALLBACK.exec(data.trim());
  if (!m) return null;
  const [, op, txId, prefix] = m;
  if (op === 'un') return { kind: 'undo', txId };
  if (op === 'ct') return { kind: 'categories', txId };
  if (op === 'co') return { kind: 'other_category', txId };
  return prefix ? { kind: 'set_category', txId, prefix } : null;
}

export const txButtons = (txId: string): BotButton[][] => [
  [
    { text: 'Cambiar categoría', data: `ct:${txId}` },
    { text: 'Deshacer', data: `un:${txId}` },
  ],
];
