import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DebtOutlayService } from '../debts/debt-outlay.service';
import { TransactionsService } from '../transactions/transactions.service';
import { TxKindDto } from '../transactions/dto/transaction.dto';
import { ruleParse } from '../whatsapp/nlp/rule.parser';
import { looksLikeOtp } from '../whatsapp/otp.util';

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

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
 * Núcleo conversacional agnóstico del canal: interpreta lenguaje natural,
 * registra transacciones y responde. Lo usan tanto WhatsApp como Telegram; la
 * identidad y la vinculación las aporta cada canal.
 */
@Injectable()
export class ConversationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactions: TransactionsService,
    private readonly debtOutlay: DebtOutlayService,
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
      case 'deshacer':
        return this.undoLast(input.userId, input.source);
      case 'registrar_transaccion':
        return this.registerTransaction(input.userId, input.source, parsed);
      default:
        return '🤔 No entendí bien. Puedes escribir algo como "Pagué $200.000 al crédito de Bancolombia" o "resumen". Escribe "ayuda" para ejemplos.';
    }
  }

  private helpText(): string {
    return [
      '🧾 *Puedo ayudarte a registrar tus finanzas:*',
      '• "Gasté $45.000 en almuerzo"',
      '• "Me llegó ingreso de $1.200.000 por freelance"',
      '• "Pagué $250.000 a Bancolombia cuota crédito"',
      '',
      '📊 También puedo darte info:',
      '• "resumen" — tu panorama del mes',
      '• "mis deudas" — saldos pendientes',
      '• "deshacer" — borra el último movimiento',
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
    if (parsed.kind === 'pago_deuda' && debtId) {
      const debt = await this.prisma.debt.findUnique({ where: { id: debtId } });
      return `✅ Registré tu pago de ${fmt(parsed.amount)}${debt ? ` a ${debt.name}` : ''} ${when}. Nuevo saldo: ${fmt(Number(debt?.currentBalance ?? 0))}.`;
    }
    const label = parsed.kind === 'ingreso' ? 'ingreso' : parsed.kind === 'gasto' ? 'gasto' : 'movimiento';
    const cat = parsed.categoryGuess ? ` en ${parsed.categoryGuess}` : '';
    void tx;
    return `✅ Registré tu ${label} de ${fmt(parsed.amount)}${cat} ${when}.`;
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
    return `🗑️ Listo, borré tu último movimiento de ${fmt(Number(last.amount))}.`;
  }

  private humanDate(iso: string): string {
    const today = new Date().toISOString().slice(0, 10);
    if (iso === today) return 'hoy';
    const [, m, d] = iso.split('-');
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `el ${parseInt(d, 10)} de ${months[parseInt(m, 10) - 1]}`;
  }
}
