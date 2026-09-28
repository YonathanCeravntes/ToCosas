import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { ConsentService } from '../copilot/consent.service';
import { BudgetService } from '../budget/budget.service';
import { FixedKindDto } from '../budget/dto/fixed-item.dto';
import { DebtsService } from '../debts/debts.service';
import { CardService } from '../debts/card.service';
import { DebtTypeDto, RateBasisDto, RateKindDto } from '../debts/dto/debt.dto';
import { DocumentExtractionService, SUPPORTED_MEDIA } from './document-extraction.service';
import {
  DocumentProposal,
  PROPOSAL_TTL_MINUTES,
  applyFix,
  describeProposal,
  parseReply,
  toProposal,
} from './document-proposal';
import { DebtOutlayService } from '../debts/debt-outlay.service';
import { SimulationsService } from '../simulations/simulations.service';
import { TransactionsService } from '../transactions/transactions.service';
import { TxKindDto } from '../transactions/dto/transaction.dto';
import { ruleParse } from '../whatsapp/nlp/rule.parser';
import { looksLikeOtp } from '../whatsapp/otp.util';

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');
/** FIN-029 (DEC-0029 §5.1): todo acuse dice DÓNDE queda el movimiento. */
const SEEN_IN_APP = ' Lo ves en tus movimientos en la app.';

/** Canal de origen del mensaje (para `source` de la transacción). */
export type ChannelSource = 'whatsapp' | 'telegram';

export interface ConversationInput {
  /** userId ya resuelto por el servicio de vinculación del canal, o null. */
  userId: string | null;
  text: string;
  type: 'text' | 'image' | 'document' | 'other';
  /** FIN-042: descarga perezosa del adjunto (foto/PDF). Solo se invoca con consentimiento. */
  file?: () => Promise<{ data: Buffer; mimeType: string }>;
  /** Etiqueta visible del canal, p. ej. "WhatsApp" o "Telegram". */
  channelLabel: string;
  source: ChannelSource;
  /** Verifica un OTP recibido en el canal (delegado al link service). */
  verify: (code: string) => Promise<boolean>;
}

/**
 * FIN-029 · Motor Conversacional ÚNICO agnóstico del canal (DEC-0029 P1):
 * interpreta lenguaje natural, actúa sobre el DOMINIO (el servicio central de
 * movimientos de FIN-028, el simulador de FIN-007) y responde. Lo consumen los
 * adaptadores de canal (WhatsApp y Telegram) — que solo hacen transporte y
 * vinculación. NUNCA hay una segunda lógica financiera aquí: se invocan
 * servicios existentes.
 *
 * Modo actual: plantilla-primero (reglas deterministas). La capa de IA de
 * respaldo (tools 1:1 con el dominio sobre vistas minimizadas) queda diseñada
 * pero BLOQUEADA por el gate DPA+PIA (DEC-0029 §6, `PRODUCCION.md` §1): no se
 * enciende con datos reales hasta cerrar el gate legal.
 *
 * Principios traducidos al canal (DEC-0029 §5, condiciones del CPSAO):
 *  - Acuse explícito de TODO movimiento (nunca cambia estado en silencio).
 *  - Honestidad al no entender (jamás un falso "ya lo anoté").
 *  - `simular` solo MUESTRA escenarios, no empuja decisiones.
 *  - Paywall honesto al agotar la cuota de IA.
 */
@Injectable()
export class ConversationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactions: TransactionsService,
    private readonly debtOutlay: DebtOutlayService,
    // FIN-029 (§5.3): el bot invoca el simulador del dominio (FIN-007), no
    // reimplementa nada — mismo motor, con la cuota de IA de FIN-009.
    private readonly simulations: SimulationsService,
    // FIN-042: lectura de documentos con IA (consentimiento específico + extracción).
    private readonly consent: ConsentService,
    private readonly docs: DocumentExtractionService,
    // DebtsModule no puede importarse aquí (ciclo Debts→Reminders→Telegram→Messaging):
    // el alta de deudas se resuelve en runtime contra el contenedor.
    private readonly moduleRef: ModuleRef,
    // Gastos fijos por chat: mismo servicio que Presupuesto (§32, una autoridad).
    private readonly budget: BudgetService,
  ) {}

  private readonly logger = new Logger(ConversationService.name);

  async handle(input: ConversationInput): Promise<string> {
    const text = (input.text ?? '').trim();

    // 1) Sin vincular → intentar OTP o dar instrucciones.
    if (!input.userId) {
      if (looksLikeOtp(text)) {
        const ok = await input.verify(text);
        if (ok) {
          return `✅ ¡Listo! Tu ${input.channelLabel} quedó vinculado. Ya puedes registrar gastos, ingresos y pagos escribiéndome. Escribe "ayuda" para ver ejemplos.`;
        }
        return `❌ Ese código no es válido o expiró. Genera uno nuevo en la app (Ajustes → ${input.channelLabel}).`;
      }
      return `👋 ¡Hola! Soy Millo. Para registrar tus movimientos aquí, vincula esta cuenta: abre la app → Ajustes → ${input.channelLabel} y escríbeme el código de 6 dígitos que verás.`;
    }

    // 2) Vinculado → documentos (FIN-042) y propuestas pendientes primero.
    if (input.type === 'image' || input.type === 'document') {
      return this.handleDocument(input);
    }
    if (/^revocar\s+documentos\b/i.test(text)) {
      await this.prisma.userSettings.upsert({
        where: { userId: input.userId },
        create: { userId: input.userId, docsAiConsentAt: null },
        update: { docsAiConsentAt: null },
      });
      await this.clearPending(input.userId, input.source);
      return '✅ Listo, retiré el permiso: no volveré a enviar tus documentos a la IA hasta que escribas "autorizo".';
    }
    if (/^autorizo\b/i.test(text)) {
      await this.prisma.userSettings.upsert({
        where: { userId: input.userId },
        create: { userId: input.userId, docsAiConsentAt: new Date() },
        update: { docsAiConsentAt: new Date() },
      });
      return '✅ Listo. Ahora envíame la foto o el PDF del extracto o comprobante y te propongo qué registrar.';
    }
    const pendingReply = await this.handlePendingReply(input, text);
    if (pendingReply) return pendingReply;

    const fixed = parseFixedExpense(text);
    if (fixed) {
      if (fixed.error) return fixed.error;
      await this.budget.create(input.userId, { kind: FixedKindDto.gasto, name: fixed.name!, amount: fixed.amount!, dayOfMonth: fixed.day ?? undefined });
      return (
        `✅ Guardé el gasto fijo *${fixed.name}* de ${fmt(fixed.amount!)} al mes` +
        (fixed.day ? ` (día ${fixed.day})` : '') +
        `. Desde ahora queda apartado en "Te queda". Lo ves en Presupuesto → Gastos fijos.`
      );
    }

    const parsed = ruleParse(text, { today: new Date() });

    switch (parsed.intent) {
      case 'saludo':
        return '👋 ¡Hola! Cuéntame un movimiento (ej: "Gasté $30.000 en almuerzo") o escribe "resumen".';
      case 'ayuda':
        return this.helpText();
      case 'cancelar':
        return '👍 Listo, cancelado.';
      case 'consulta_resumen':
        return this.buildSummary(input.userId);
      case 'consulta_simulacion':
        return this.simulate(input.userId, parsed);
      case 'deshacer':
        return this.undoLast(input.userId, input.source);
      case 'registrar_transaccion':
        return this.registerTransaction(input.userId, input.source, parsed);
      default:
        // FIN-029 (§5.2): honestidad — se dice claro que no se entendió y se
        // ofrece el camino; JAMÁS un falso "ya lo anoté".
        return '🤔 No te entendí. Puedes decir algo como "Gasté $45.000 en mercado", "Pagué $200.000 al crédito" o "resumen". Escribe "ayuda" para ejemplos.';
    }
  }

  private helpText(): string {
    return [
      '🧾 *Puedo ayudarte a registrar tus finanzas:*',
      '• "Gasté $45.000 en almuerzo"',
      '• "Me llegó ingreso de $1.200.000 por freelance"',
      '• "Pagué $250.000 a mi crédito"',
      '',
      '📊 También puedo darte info:',
      '• "resumen" — tu panorama del mes',
      '• "mis deudas" — saldos pendientes',
      '• "¿qué pasa si abono $200.000 a mi deuda?" — simula un escenario',
      '• "deshacer" — anula el último movimiento',
      '• "gasto fijo arriendo 1.200.000 día 5" — crea un gasto fijo mensual',
      '',
      '📎 Y puedes enviarme la FOTO o el PDF de un extracto de tarjeta o crédito, o de un comprobante: te propongo la deuda o el gasto y tú confirmas.',
    ].join('\n');
  }

  // ---------------------------------------------------------------------------
  // FIN-042 · Documentos: foto/PDF → IA → propuesta → confirmación → dominio
  // ---------------------------------------------------------------------------

  private static readonly DOCS_CONSENT_TEXT =
    '📎 Para leer tu documento lo envío a la inteligencia artificial de Millo (proveedor Anthropic, EE. UU.). ' +
    'Un extracto contiene datos personales; Millo NO los guarda: solo toma saldo, cupo, cuota, tasa y fechas, y descarta el archivo. ' +
    'Si estás de acuerdo, responde *autorizo* y vuelve a enviarme el documento. Para retirar el permiso escribe "revocar documentos".';

  private async handleDocument(input: ConversationInput): Promise<string> {
    const userId = input.userId as string;
    if (!this.docs.isAvailable()) {
      return '📎 Recibí tu documento, pero la lectura con IA no está disponible en este momento. Regístralo con un mensaje, ej: "Gasté $45.000 en mercado".';
    }
    const settings = await this.prisma.userSettings.findUnique({ where: { userId } });
    if (!settings?.docsAiConsentAt) return ConversationService.DOCS_CONSENT_TEXT;
    if (!input.file) return '📎 No pude recibir el archivo. Envíalo de nuevo como foto o PDF.';

    let file: { data: Buffer; mimeType: string };
    try {
      file = await input.file();
    } catch (e) {
      const code = (e as Error).message;
      if (code === 'file_too_large') return '📎 El archivo pesa más de 8 MB. Envía una foto más liviana o el PDF del extracto.';
      this.logger.warn(`Descarga de adjunto falló: ${code}`);
      return '📎 No pude descargar el archivo. Inténtalo de nuevo en un momento.';
    }
    if (!SUPPORTED_MEDIA.has(file.mimeType)) {
      return '📎 Solo puedo leer fotos (JPG, PNG) o PDF. Envíame el extracto en uno de esos formatos.';
    }

    let extraction;
    try {
      extraction = await this.docs.extract(userId, file);
    } catch (e) {
      this.logger.warn(`Extracción falló: ${(e as Error).message}`);
      return '📎 No logré leer el documento ahora mismo. Inténtalo de nuevo en unos minutos o regístralo con un mensaje.';
    }

    const proposal = toProposal(extraction);
    if (!proposal || extraction.kind === 'desconocido' || (extraction.confidence ?? 0) < 0.35) {
      const why = extraction.notes ? ` (${extraction.notes})` : '';
      return `🤔 No reconocí un extracto ni un comprobante con datos suficientes${why}. Prueba con una foto más nítida, o dime los datos: "Gasté $45.000 en mercado".`;
    }
    await this.savePending(userId, input.source, proposal);
    return describeProposal(proposal);
  }

  /** Respuesta a una propuesta viva: sí / no / corrección. Null si no hay propuesta o el texto no le habla. */
  private async handlePendingReply(input: ConversationInput, text: string): Promise<string | null> {
    const userId = input.userId as string;
    const pending = await this.prisma.botPendingAction.findUnique({ where: { userId_source: { userId, source: input.source } } });
    if (!pending) return null;
    if (pending.expiresAt < new Date()) {
      await this.clearPending(userId, input.source);
      return null;
    }
    const proposal = pending.payload as unknown as DocumentProposal;
    const reply = parseReply(text);
    if (reply.type === 'no') {
      await this.clearPending(userId, input.source);
      return '👍 Listo, no registré nada. Si quieres, envíame otro documento o dime el movimiento en texto.';
    }
    if (reply.type === 'fix') {
      const res = applyFix(proposal, reply.field, reply.value);
      if ('error' in res) return res.error;
      await this.savePending(userId, input.source, res.proposal);
      return describeProposal(res.proposal);
    }
    if (reply.type === 'yes') {
      try {
        const ack = await this.applyProposal(userId, input.source, proposal);
        await this.clearPending(userId, input.source);
        return ack;
      } catch (e) {
        this.logger.error(`applyProposal falló: ${(e as Error).message}`);
        return `❌ No pude registrarlo: ${(e as Error).message}. Corrige el dato y responde *sí* de nuevo, o responde *no*.`;
      }
    }
    return null; // el texto no responde a la propuesta: sigue el flujo normal (resumen, gasto, etc.)
  }

  /** Ejecuta la propuesta SOLO por los servicios del dominio (nunca lógica financiera aquí). */
  private async applyProposal(userId: string, source: ChannelSource, p: DocumentProposal): Promise<string> {
    const today = new Date().toISOString().slice(0, 10);
    if (p.kind === 'comprobante') {
      await this.transactions.create(
        userId,
        {
          kind: 'gasto' as unknown as TxKindDto,
          amount: p.amount,
          occurredAt: `${p.occurredAt}T12:00:00Z`,
          note: p.merchant ? `Compra en ${p.merchant}` : 'Compra (comprobante)',
        },
        { source, rawMessage: 'comprobante', parseConfidence: 0.8 },
      );
      return `✅ Registré tu gasto de ${fmt(p.amount)}${p.merchant ? ` en ${p.merchant}` : ''} (${p.occurredAt}).${SEEN_IN_APP}`;
    }

    const debts = this.moduleRef.get(DebtsService, { strict: false });
    const entity = p.entityName
      ? await this.prisma.financialEntity.findFirst({
          where: { name: { contains: p.entityName, mode: 'insensitive' }, OR: [{ userId }, { isGlobal: true }] },
        })
      : null;
    const rate = p.annualEffectiveRate ?? 0;

    if (p.kind === 'extracto_tarjeta') {
      const cards = this.moduleRef.get(CardService, { strict: false });
      const { debt } = await debts.create(userId, {
        name: p.name,
        entityId: entity?.id,
        debtType: DebtTypeDto.tarjeta_credito,
        originalAmount: 0,
        currentBalance: 0,
        startDate: today,
        interestRate: rate,
        rateBasis: RateBasisDto.EA,
        rateKind: RateKindDto.fija,
        creditLimit: p.creditLimit ?? undefined,
        paymentDay: p.paymentDay ?? undefined,
      });
      if (p.balance > 0) {
        await cards.registerPurchase(userId, {
          debtId: debt.id,
          amount: p.balance,
          installments: p.installments,
          withInterest: false,
          note: 'Saldo del extracto',
        });
      }
      return (
        `✅ Creé la tarjeta *${p.name}* con saldo ${fmt(p.balance)}` +
        (p.creditLimit != null ? ` y cupo ${fmt(p.creditLimit)}` : '') +
        `. Repartí el saldo en ${p.installments} cuota${p.installments === 1 ? '' : 's'} de ≈ ${fmt(p.balance / p.installments)}. ` +
        `Puedes ajustar cuotas, tasa y día de pago en Deudas → ${p.name}.`
      );
    }

    const term = p.remainingInstallments ?? (p.monthlyPayment ? Math.min(360, Math.max(1, Math.ceil(p.balance / p.monthlyPayment))) : 12);
    const { debt } = await debts.create(userId, {
      name: p.name,
      entityId: entity?.id,
      debtType: DebtTypeDto.credito_personal,
      originalAmount: p.balance,
      currentBalance: p.balance,
      startDate: today,
      termMonths: term,
      interestRate: rate,
      rateBasis: RateBasisDto.EA,
      rateKind: RateKindDto.fija,
      monthlyPayment: p.monthlyPayment ?? undefined,
      paymentDay: p.paymentDay ?? undefined,
    });
    return (
      `✅ Creé la deuda *${p.name}* con saldo ${fmt(p.balance)}, ${term} cuota${term === 1 ? '' : 's'}` +
      (p.monthlyPayment ? ` de ≈ ${fmt(p.monthlyPayment)}` : '') +
      (rate ? ` y tasa ${rate.toFixed(2).replace(/\.?0+$/, '')}% EA` : '') +
      `. Revisa el plan en Deudas → ${debt.name}.`
    );
  }

  private async savePending(userId: string, source: ChannelSource, proposal: DocumentProposal): Promise<void> {
    const expiresAt = new Date(Date.now() + PROPOSAL_TTL_MINUTES * 60_000);
    const payload = proposal as unknown as object;
    await this.prisma.botPendingAction.upsert({
      where: { userId_source: { userId, source } },
      create: { userId, source, kind: proposal.kind, payload, expiresAt },
      update: { kind: proposal.kind, payload, expiresAt },
    });
  }

  private async clearPending(userId: string, source: ChannelSource): Promise<void> {
    await this.prisma.botPendingAction.deleteMany({ where: { userId, source } });
  }

  private async registerTransaction(
    userId: string,
    source: ChannelSource,
    parsed: ReturnType<typeof ruleParse>,
  ): Promise<string> {
    if (parsed.amount === null) {
      return '🤔 Entendí que quieres registrar algo, pero no vi el monto. ¿Cuánto fue? (ej: "$45.000)';
    }
    if (!parsed.kind) {
      return '🤔 ¿Ese movimiento fue un *gasto*, un *ingreso* o un *pago de deuda*?';
    }

    const categoryId = parsed.categoryGuess
      ? (
          await this.prisma.category.findFirst({
            where: {
              name: { equals: parsed.categoryGuess, mode: 'insensitive' },
              OR: [{ userId }, { isGlobal: true }],
            },
          })
        )?.id
      : undefined;

    const entity = parsed.entityGuess
      ? await this.prisma.financialEntity.findFirst({
          where: {
            name: { equals: parsed.entityGuess, mode: 'insensitive' },
            OR: [{ userId }, { isGlobal: true }],
          },
        })
      : null;

    let debtId: string | undefined;
    if (parsed.kind === 'pago_deuda') {
      const debts = await this.prisma.debt.findMany({
        where: {
          userId,
          deletedAt: null,
          status: 'activa',
          ...(entity ? { entityId: entity.id } : {}),
        },
      });
      if (debts.length === 1) {
        debtId = debts[0].id;
      } else if (debts.length > 1) {
        const opts = debts.map((d, i) => `${i + 1}️⃣ ${d.name}`).join('\n');
        return `Tienes varias deudas${entity ? ` con ${entity.name}` : ''} 💳 ¿A cuál abonaste?\n${opts}\n(Responde el número o el nombre)`;
      }
    }

    const tx = await this.transactions.create(
      userId,
      {
        kind: parsed.kind as unknown as TxKindDto,
        amount: parsed.amount,
        occurredAt: `${parsed.dateISO}T12:00:00Z`,
        categoryId,
        entityId: entity?.id,
        debtId,
        note: parsed.note,
      },
      { source, rawMessage: parsed.note, parseConfidence: parsed.confidence },
    );

    const when = this.humanDate(parsed.dateISO);
    // FIN-029 (§5.1): acuse explícito con el DÓNDE — la usuaria nunca descubre
    // un movimiento que no vio nacer.
    if (parsed.kind === 'pago_deuda' && debtId) {
      const debt = await this.prisma.debt.findUnique({ where: { id: debtId } });
      return `✅ Registré tu pago de ${fmt(parsed.amount)}${debt ? ` a ${debt.name}` : ''} ${when}. Nuevo saldo: ${fmt(Number(debt?.currentBalance ?? 0))}.${SEEN_IN_APP}`;
    }
    const label = parsed.kind === 'ingreso' ? 'ingreso' : parsed.kind === 'gasto' ? 'gasto' : 'movimiento';
    const cat = parsed.categoryGuess ? ` en ${parsed.categoryGuess}` : '';
    void tx;
    return `✅ Registré tu ${label} de ${fmt(parsed.amount)}${cat} ${when}.${SEEN_IN_APP}`;
  }

  /**
   * FIN-029 (DEC-0029 §5.3) · "¿Qué pasa si abono $X a mi deuda?" — MUESTRA el
   * escenario (mismo motor de FIN-007), nunca empuja una decisión ("deberías").
   * Usa la cuota de IA de FIN-009 con paywall honesto (§5.4).
   */
  private async simulate(userId: string, parsed: ReturnType<typeof ruleParse>): Promise<string> {
    if (parsed.amount === null) {
      return '🤔 Puedo simular un abono extra a tu deuda — dime el monto (ej: "¿qué pasa si abono $200.000 a mi deuda?").';
    }
    const debts = await this.prisma.debt.findMany({
      where: { userId, deletedAt: null, status: 'activa' },
      orderBy: { interestRate: 'desc' },
    });
    if (debts.length === 0) {
      return '🎉 No tienes deudas activas, así que no hay abono que simular.';
    }
    // Con varias, se simula sobre la de mayor tasa (la que más te cuesta) y se
    // dice explícitamente — sin decidir por la usuaria.
    const target = debts[0];
    try {
      const sim = await this.simulations.run(userId, {
        type: 'abono_extra',
        debtId: target.id,
        extraMonthly: parsed.amount,
      });
      const s = sim.specifics;
      const months = Number(s.monthsSaved ?? 0);
      const saved = Number(s.interestSaved ?? 0);
      const scenario =
        months > 0 || saved > 0
          ? `Si abonas ${fmt(parsed.amount)} extra al mes a tu ${target.name}: terminas ${months} mes${months === 1 ? '' : 'es'} antes y te ahorras ${fmt(saved)} en intereses.`
          : `Con ${fmt(parsed.amount)} extra al mes a tu ${target.name} el ahorro es mínimo con las condiciones actuales.`;
      // §5.3: se muestra el escenario y se ofrece profundizar en la app — sin
      // "deberías", sin empujar la decisión.
      return `🧪 ${scenario}${debts.length > 1 ? ' (Simulé sobre la deuda de mayor tasa.)' : ''} Puedes probar otros montos en el simulador de la app.`;
    } catch (e) {
      // §5.4: paywall honesto — informa el límite y el valor, sin cortar en seco.
      if (e instanceof ForbiddenException) {
        return 'Llegaste a tus simulaciones gratis del mes. En la app puedes ver tus escenarios, y con Millo+ son ilimitadas — sin apuro.';
      }
      throw e;
    }
  }

  private async buildSummary(userId: string): Promise<string> {
    const debts = await this.prisma.debt.findMany({
      where: { userId, deletedAt: null, status: 'activa' },
    });
    const totalDebt = debts.reduce((a, d) => a + Number(d.currentBalance), 0);
    // FIN-023 (DEC-0023 §5): desembolso REAL (cuota + seguros/cargos aparte).
    const monthly = (await this.debtOutlay.outlaysByUser(userId)).totalOutlay;
    const dash = await this.transactions.monthlyDashboard(userId);

    return [
      `📊 *Tu resumen*`,
      `Deuda total: ${fmt(totalDebt)} (${debts.length} deuda${debts.length === 1 ? '' : 's'})`,
      `Al mes en deudas: ${fmt(monthly)} (cuotas, seguros y cargos)`,
      `Ingresos del mes: ${fmt(dash.income)} · Gastos: ${fmt(dash.expense)}`,
      `Flujo estimado: ${fmt(dash.estimatedCashflow)} ${dash.estimatedCashflow >= 0 ? '👍' : '⚠️'}`,
    ].join('\n');
  }

  private async undoLast(userId: string, source: ChannelSource): Promise<string> {
    const last = await this.prisma.transaction.findFirst({
      where: { userId, deletedAt: null, source },
      orderBy: { createdAt: 'desc' },
    });
    if (!last) return 'No encontré un movimiento reciente para deshacer.';
    // FIN-028 (DEC-0028 P4): la anulación pasa por el servicio central único —
    // así emite el evento y el Motor recalcula (antes escribía directo).
    await this.transactions.remove(userId, last.id);
    // FIN-029 (§5.1): acuse explícito también al anular.
    return `🗑️ Listo, anulé tu último movimiento de ${fmt(Number(last.amount))}.${SEEN_IN_APP}`;
  }

  private humanDate(iso: string): string {
    const today = new Date().toISOString().slice(0, 10);
    if (iso === today) return 'hoy';
    const [, m, d] = iso.split('-');
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `el ${parseInt(d, 10)} de ${months[parseInt(m, 10) - 1]}`;
  }
}

/**
 * "gasto fijo <nombre> <monto> [día N]" → alta de FixedItem. Formato regional (§39):
 * "1.200.000", "1200000", "1,2 millones" no; solo números con puntos de miles.
 */
export function parseFixedExpense(text: string): { name?: string; amount?: number; day?: number; error?: string } | null {
  const m = /^(?:gasto\s+fijo|fijo)\s+(.+)$/i.exec(text.trim());
  if (!m) return null;
  let rest = m[1].trim();
  let day: number | undefined;
  const dm = /\s+(?:el\s+)?d[ií]a\s+(\d{1,2})\s*$/i.exec(rest);
  if (dm) {
    day = Number(dm[1]);
    rest = rest.slice(0, dm.index).trim();
  }
  const am = /^(.*?)\s*\$?\s*(\d{1,3}(?:\.\d{3})+|\d+)\s*$/.exec(rest);
  if (!am || !am[1].trim()) {
    return { error: 'Para un gasto fijo dime nombre y monto, ej: "gasto fijo arriendo 1.200.000 día 5".' };
  }
  const amount = Number(am[2].replace(/\./g, ''));
  if (!(amount > 0)) return { error: 'El monto del gasto fijo debe ser mayor a 0.' };
  if (day !== undefined && (day < 1 || day > 31)) return { error: 'El día debe estar entre 1 y 31.' };
  return { name: am[1].trim(), amount, day };
}

