/**
 * FIN-032 (DEC-0032) · La ÚNICA autoridad de "tipo de producto".
 *
 * Este registro es el único lugar del sistema que traduce `DebtType → comportamiento`
 * (patrón de fuente única, como EMERGENCY_FUND_MILESTONES / attackOrder). Después de
 * FIN-032, `debtType === '<literal>'` NO puede aparecer en ningún otro archivo —
 * ni backend ni frontend (el frontend lo consume por el endpoint del catálogo). Todo
 * lo demás despacha por `scheduleModel` (un valor), nunca por el tipo.
 *
 * Los 4 arquetipos divergentes (DEC-0030 §6) caben en 3 `scheduleModel` YA existentes:
 *  - `amortizado`            → plan de contrato (FIN-012): hipoteca, libranza, personal…
 *  - `cuotas_por_compra`     → planes por compra (FIN-031): tarjeta, fintech rotativo
 *  - `saldo_y_cuota_pactada` → cuota pactada + saldo por pagos, SIN fecha de libertad
 *                              falsa (§29.2): gota a gota, préstamo familiar/informal
 * Lo divergente por arquetipo es un FLAG DE DATOS (paymentSource/rate/capabilities),
 * no un número aparte — esa es la tesis que la prueba de los 4 arquetipos verifica.
 */

export type ScheduleModel = 'amortizado' | 'cuotas_por_compra' | 'saldo_y_cuota_pactada';
export type RateSemantics = 'fija' | 'fija_o_variable' | 'opcional';
export type PaymentSource = 'cuenta' | 'nomina' | 'informal';

/** Especificación de un campo del alta (guardarraíl B: el mínimo obligatorio por tipo). */
export interface FieldSpec {
  /** Clave del CreateDebtDto que alimenta. */
  key: 'name' | 'currentBalance' | 'termMonths' | 'interestRate' | 'creditLimit' | 'monthlyPayment' | 'rateKind' | 'paymentDay';
  label: string;
  kind: 'text' | 'money' | 'int' | 'rate' | 'select';
  placeholder?: string;
  /** Solo para kind 'select' (p. ej. tasa fija/variable). */
  options?: Array<{ value: string; label: string }>;
}

export interface ProductCapabilities {
  /** Tiene cupo (tarjeta/rotativo). */
  creditLimit?: boolean;
  /** Acepta compras a cuotas sobre el producto (FIN-031). */
  installmentPurchases?: boolean;
  /** Admite seguros endosables (hipoteca/vehículo, FIN-013). */
  endorsableInsurance?: boolean;
}

// --- FIN-036 · Política de actualización por modalidad (config-sin-código) ---
/**
 * Cuándo se pregunta por un campo. `nunca` = calma (jamás se repregunta);
 * `al_corte_si_variable` = solo si la deuda declaró tasa variable (condición
 * determinista sobre `Debt.rateKind`, no heurística). Por DEC-0036 §3 NO existe
 * una cadencia que escriba sin confirmación: toda cadencia aplica por nivel 2
 * (propuesto → confirmado → reversible); auto-aplicar queda para una DEC futura.
 */
export type UpdateCadence = 'al_corte' | 'al_corte_si_variable' | 'anual' | 'una_vez' | 'nunca';

export interface UpdatePolicyRule {
  /** Campo EXISTENTE de `Debt` que la confirmación puede actualizar (§32). */
  field: 'creditLimit' | 'interestRate' | 'monthlyPayment';
  /** Cómo se nombra en la pregunta ("¿Cambió …?"). */
  label: string;
  cadence: UpdateCadence;
}

// --- FIN-037 · Lecturas de profundidad por modalidad (config-sin-código) ---
/**
 * Una LECTURA es un derivado honesto sobre datos ya registrados (display-only,
 * sin mutación). Se computa SOLO en `DepthReadingService` (única autoridad §32,
 * composición de funciones puras existentes). Agregar una lectura a una modalidad
 * = una fila aquí. Los EVENTOS mutadores (avance/retanqueo/nota crédito/gracia)
 * NO viven aquí: entran por la cola de intake Beta-guiada (DEC-0037 §4), cada uno
 * con su mini-ciclo, política de reversión y nivel de confirmación declarados.
 */
export type DepthReadingKind = 'costo_real_informal' | 'sobrecupo';

export interface ProductTypeDescriptor {
  debtType: string;
  label: string;
  scheduleModel: ScheduleModel;
  rate: RateSemantics;
  paymentSource: PaymentSource;
  capabilities: ProductCapabilities;
  requiredFields: FieldSpec[];
  optionalFields: FieldSpec[];
  /** FIN-036: qué campos se revisan y con qué cadencia (vacío = nunca pregunta). */
  updatePolicy: UpdatePolicyRule[];
  /** FIN-037: qué lecturas de profundidad aplican (vacío = ninguna). */
  depthReadings: DepthReadingKind[];
}

// --- Campos reutilizables (para no repetir la spec en cada tipo) ---
const F = {
  name: { key: 'name', label: 'Nombre', kind: 'text' } as FieldSpec,
  balance: { key: 'currentBalance', label: 'Saldo pendiente', kind: 'money', placeholder: '3000000' } as FieldSpec,
  monto: { key: 'currentBalance', label: 'Monto de la compra', kind: 'money', placeholder: '600000' } as FieldSpec,
  cupo: { key: 'creditLimit', label: 'Cupo total', kind: 'money', placeholder: '3000000' } as FieldSpec,
  plazo: { key: 'termMonths', label: 'Plazo (meses)', kind: 'int', placeholder: '24' } as FieldSpec,
  cuotasN: { key: 'termMonths', label: '¿En cuántas cuotas?', kind: 'int', placeholder: '3' } as FieldSpec,
  tasa: { key: 'interestRate', label: 'Tasa (% EA)', kind: 'rate', placeholder: '28' } as FieldSpec,
  tasaOpcional: { key: 'interestRate', label: 'Tasa (% EA, opcional)', kind: 'rate', placeholder: '0' } as FieldSpec,
  cuotaPactada: { key: 'monthlyPayment', label: 'Cuota mensual pactada', kind: 'money', placeholder: '150000' } as FieldSpec,
  diaPago: { key: 'paymentDay', label: 'Día de pago (opcional)', kind: 'int', placeholder: '5' } as FieldSpec,
  tasaKind: {
    key: 'rateKind', label: 'Tasa fija o variable', kind: 'select',
    options: [{ value: 'fija', label: 'Fija' }, { value: 'variable', label: 'Variable' }],
  } as FieldSpec,
};

// Bloques de fields para los modelos comunes.
const AMORTIZADO_REQ = [F.name, F.balance, F.plazo, F.tasa];
const PACTADA_REQ = [F.name, F.balance, F.cuotaPactada];
const CARD_REQ = [F.name, F.cupo];

// FIN-036 · Reglas de actualización compartidas (agregar una regla = una fila).
const R = {
  cupoAlCorte: { field: 'creditLimit', label: 'el cupo total', cadence: 'al_corte' } as UpdatePolicyRule,
  tasaSiVariable: { field: 'interestRate', label: 'la tasa', cadence: 'al_corte_si_variable' } as UpdatePolicyRule,
  cuotaPactadaAlCorte: { field: 'monthlyPayment', label: 'la cuota pactada', cadence: 'al_corte' } as UpdatePolicyRule,
};
// Un contrato de tasa fija NO se repregunta (calma): updatePolicy vacío.
const CARD_POLICY = [R.cupoAlCorte, R.tasaSiVariable];

export const PRODUCT_TYPE_DESCRIPTORS: Record<string, ProductTypeDescriptor> = {
  tarjeta_credito: {
    debtType: 'tarjeta_credito', label: 'Tarjeta de crédito', scheduleModel: 'cuotas_por_compra',
    rate: 'fija', paymentSource: 'cuenta', capabilities: { creditLimit: true, installmentPurchases: true },
    requiredFields: CARD_REQ, updatePolicy: CARD_POLICY, depthReadings: ['sobrecupo'], optionalFields: [F.tasa, F.diaPago],
  },
  fintech: {
    debtType: 'fintech', label: 'Tarjeta/cupo fintech (Nu, RappiCard…)', scheduleModel: 'cuotas_por_compra',
    rate: 'fija', paymentSource: 'cuenta', capabilities: { creditLimit: true, installmentPurchases: true },
    requiredFields: CARD_REQ, updatePolicy: CARD_POLICY, depthReadings: ['sobrecupo'], optionalFields: [F.tasa, F.diaPago],
  },
  compra_a_cuotas: {
    debtType: 'compra_a_cuotas', label: 'Compra a cuotas (Addi, Sistecrédito…)', scheduleModel: 'amortizado',
    rate: 'fija', paymentSource: 'cuenta', capabilities: {},
    requiredFields: [F.name, F.monto, F.cuotasN, F.tasaOpcional], updatePolicy: [], depthReadings: [], optionalFields: [F.diaPago],
  },
  credito_personal: {
    debtType: 'credito_personal', label: 'Crédito personal', scheduleModel: 'amortizado',
    rate: 'fija', paymentSource: 'cuenta', capabilities: {},
    requiredFields: AMORTIZADO_REQ, updatePolicy: [], depthReadings: [], optionalFields: [F.diaPago],
  },
  libre_inversion: {
    debtType: 'libre_inversion', label: 'Libre inversión', scheduleModel: 'amortizado',
    rate: 'fija', paymentSource: 'cuenta', capabilities: {},
    requiredFields: AMORTIZADO_REQ, updatePolicy: [], depthReadings: [], optionalFields: [F.diaPago],
  },
  libranza: {
    debtType: 'libranza', label: 'Libranza (descuento de nómina)', scheduleModel: 'amortizado',
    rate: 'fija', paymentSource: 'nomina', capabilities: {},
    requiredFields: AMORTIZADO_REQ, updatePolicy: [], depthReadings: [], optionalFields: [F.diaPago],
  },
  hipotecario: {
    debtType: 'hipotecario', label: 'Hipoteca', scheduleModel: 'amortizado',
    rate: 'fija_o_variable', paymentSource: 'cuenta', capabilities: { endorsableInsurance: true },
    requiredFields: AMORTIZADO_REQ, updatePolicy: [R.tasaSiVariable], depthReadings: [], optionalFields: [F.tasaKind, F.diaPago],
  },
  vehiculo: {
    debtType: 'vehiculo', label: 'Crédito de vehículo', scheduleModel: 'amortizado',
    rate: 'fija', paymentSource: 'cuenta', capabilities: { endorsableInsurance: true },
    requiredFields: AMORTIZADO_REQ, updatePolicy: [], depthReadings: [], optionalFields: [F.diaPago],
  },
  educativo: {
    debtType: 'educativo', label: 'Crédito educativo', scheduleModel: 'amortizado',
    rate: 'fija', paymentSource: 'cuenta', capabilities: {},
    requiredFields: AMORTIZADO_REQ, updatePolicy: [], depthReadings: [], optionalFields: [F.diaPago],
  },
  gota_a_gota: {
    debtType: 'gota_a_gota', label: 'Gota a gota', scheduleModel: 'saldo_y_cuota_pactada',
    rate: 'opcional', paymentSource: 'informal', capabilities: {},
    requiredFields: PACTADA_REQ, updatePolicy: [R.cuotaPactadaAlCorte], depthReadings: ['costo_real_informal'], optionalFields: [F.tasaOpcional],
  },
  prestamo_familiar: {
    debtType: 'prestamo_familiar', label: 'Préstamo familiar / entre personas', scheduleModel: 'saldo_y_cuota_pactada',
    rate: 'opcional', paymentSource: 'informal', capabilities: {},
    requiredFields: PACTADA_REQ, updatePolicy: [R.cuotaPactadaAlCorte], depthReadings: ['costo_real_informal'], optionalFields: [F.tasaOpcional],
  },
  // Comodín (guardarraíl F): un producto no catalogado usa el descriptor por defecto.
  otro: {
    debtType: 'otro', label: 'Otro', scheduleModel: 'amortizado',
    rate: 'fija', paymentSource: 'cuenta', capabilities: {},
    requiredFields: [F.name, F.balance, F.plazo], updatePolicy: [], depthReadings: [], optionalFields: [F.tasa, F.diaPago],
  },
};

/** El descriptor del tipo (cae a `otro` si el tipo no está catalogado — guardarraíl F). */
export function descriptorFor(debtType: string): ProductTypeDescriptor {
  return PRODUCT_TYPE_DESCRIPTORS[debtType] ?? PRODUCT_TYPE_DESCRIPTORS.otro;
}

/** El modelo de cronograma del tipo — el ÚNICO valor por el que se despacha (nunca el tipo). */
export function scheduleModelFor(debtType: string): ScheduleModel {
  return descriptorFor(debtType).scheduleModel;
}

/** El catálogo como lista (para el endpoint que alimenta el alta del frontend). */
export function productCatalog(): ProductTypeDescriptor[] {
  return Object.values(PRODUCT_TYPE_DESCRIPTORS);
}
