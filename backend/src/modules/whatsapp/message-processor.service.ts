import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionsService } from '../transactions/transactions.service';
import { TxKindDto } from '../transactions/dto/transaction.dto';
import { WhatsappLinkService } from './whatsapp-link.service';
import { ruleParse } from './nlp/rule.parser';
import { looksLikeOtp } from './otp.util';
import { InboundMessage } from './whatsapp.provider';

const fmt = (n: number) =>
  '$' + Math.round(n).toLocaleString('es-CO');

/**
 * Procesa un mensaje entrante de WhatsApp y devuelve el texto de respuesta del
 * bot. Es donde se resuelve identidad, se parsea, se registra la transacción y
 * se maneja la ambigüedad.
 */
@Injectable()
export class MessageProcessorService {
  private readonly logger = new Logger(MessageProcessorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly links: WhatsappLinkService,
    private readonly transactions: TransactionsService,
  ) {}

  async process(msg: InboundMessage): Promise<string> {
    const phone = msg.fromPhoneE164;
    const text = (msg.text ?? '').trim();

    // 1) ¿número vinculado?
    const userId = await this.links.resolveUserId(phone);

    if (!userId) {
      // ¿es un OTP para completar la vinculación?
      if (looksLikeOtp(text)) {
        const ok = await this.links.tryVerify(phone, text.trim());
        if (ok) {
          return '✅ ¡Listo! Tu WhatsApp quedó vinculado. Ya puedes registrar gastos, ingresos y pagos escribiéndome. Escribe "ayuda" para ver ejemplos.';
        }
        return '❌ Ese código no es válido o expiró. Genera uno nuevo en la app (Ajustes → WhatsApp).';
      }
      return '👋 ¡Hola! Soy ToCosas. Para registrar tus movimientos aquí, vincula este número: abre la app → Ajustes → WhatsApp y escríbeme el código de 6 dígitos que verás.';
    }

    // 2) usuario vinculado → interpretar
    if (msg.type === 'image') {
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
        return this.buildSummary(userId);
      case 'deshacer':
        return this.undoLast(userId);
      case 'registrar_transaccion':
        return this.registerTransaction(userId, parsed);
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
    parsed: ReturnType<typeof ruleParse>,
  ): Promise<string> {
    if (parsed.amount === null) {
      return '🤔 Entendí que quieres registrar algo, pero no vi el monto. ¿Cuánto fue? (ej: "$45.000)';
    }
    if (!parsed.kind) {
      return '🤔 ¿Ese movimiento fue un *gasto*, un *ingreso* o un *pago de deuda*?';
    }

    // Resolver categoría y entidad por nombre (best-effort).
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

    // Para pago de deuda, intentar resolver la deuda destino.
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
      { source: 'whatsapp', rawMessage: parsed.note, parseConfidence: parsed.confidence },
    );

    // Confirmación amable.
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
    const monthly = debts.reduce((a, d) => a + Number(d.monthlyPayment ?? 0), 0);
    const dash = await this.transactions.monthlyDashboard(userId);

    return [
      `📊 *Tu resumen*`,
      `Deuda total: ${fmt(totalDebt)} (${debts.length} deuda${debts.length === 1 ? '' : 's'})`,
      `Cuotas del mes: ${fmt(monthly)}`,
      `Ingresos del mes: ${fmt(dash.income)} · Gastos: ${fmt(dash.expense)}`,
      `Flujo estimado: ${fmt(dash.estimatedCashflow)} ${dash.estimatedCashflow >= 0 ? '👍' : '⚠️'}`,
    ].join('\n');
  }

  private async undoLast(userId: string): Promise<string> {
    const last = await this.prisma.transaction.findFirst({
      where: { userId, deletedAt: null, source: 'whatsapp' },
      orderBy: { createdAt: 'desc' },
    });
    if (!last) return 'No encontré un movimiento reciente para deshacer.';
    await this.prisma.transaction.update({
      where: { id: last.id },
      data: { deletedAt: new Date() },
    });
    return `🗑️ Listo, borré tu último movimiento de ${fmt(Number(last.amount))}.`;
  }

  private humanDate(iso: string): string {
    const today = new Date().toISOString().slice(0, 10);
    if (iso === today) return 'hoy';
    const [y, m, d] = iso.split('-');
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `el ${parseInt(d, 10)} de ${months[parseInt(m, 10) - 1]}`;
  }
}
