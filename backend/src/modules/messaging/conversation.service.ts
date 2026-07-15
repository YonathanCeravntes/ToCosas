import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
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
  type: 'text' | 'image' | 'other';
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
  ) {}

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

    // 2) Vinculado → interpretar.
    if (input.type === 'image') {
      return '📸 Recibí tu comprobante. La lectura automática (OCR) estará disponible pronto; por ahora regístralo con un mensaje, ej: "Gasté $45.000 en mercado".';
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
    ].join('\n');
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
