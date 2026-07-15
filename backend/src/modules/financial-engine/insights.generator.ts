import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { InsightsService } from '../insights/insights.service';
import { scoreBand } from '../health/score.util';
import { MetricKey } from './engine.constants';
import { monthStart, monthStartMinus } from './metrics/series.util';

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');
const pct = (n: number) => `${Math.round(n * 1000) / 10}%`;

const BAND_ORDER = ['critico', 'fragil', 'estable', 'saludable', 'elite'];

/**
 * Generadores deterministas de insights (FIN-006 §4.3). Corren en el ciclo
 * nightly (invocados por TrendsJob) + un generador por evento (deuda saldada).
 * Textos por plantilla — sin marcas ni entidades (DEC-0005 §14.2 aplica).
 */
@Injectable()
export class InsightsGenerator {
  private readonly logger = new Logger(InsightsGenerator.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly insights: InsightsService,
  ) {}

  /** Ciclo mensual: se invoca por usuario tras calcular tendencias. */
  async generateForUser(userId: string, now: Date = new Date()): Promise<number> {
    const period = monthStart(now).toISOString().slice(0, 7);
    const cur = await this.readMonth(userId, monthStart(now));
    const prev = await this.readMonth(userId, monthStartMinus(now, 1));
    let created = 0;

    // Sobregiro del mes (riesgo/critical).
    const cashflow = cur.get(MetricKey.Cashflow);
    if (cashflow !== undefined && cashflow < 0) {
      created += await this.emit({
        userId,
        type: 'riesgo',
        severity: 'critical',
        title: 'Este mes estás gastando más de lo que ingresa',
        body: `Tu flujo del mes va en ${fmt(cashflow)}. Revisa tus gastos para evitar un sobregiro.`,
        dedupeKey: `riesgo_sobregiro:${period}`,
        metricKey: MetricKey.Cashflow,
        payload: { cashflow },
      });
    }

    // DTI cruza a zona roja (riesgo/warning).
    const dti = cur.get(MetricKey.Dti);
    const prevDti = prev.get(MetricKey.Dti);
    if (dti !== undefined && dti > 0.35 && (prevDti === undefined || prevDti <= 0.35)) {
      created += await this.emit({
        userId,
        type: 'riesgo',
        severity: 'warning',
        title: 'Tu endeudamiento entró en zona alta',
        body: `Tus cuotas ya toman ${pct(dti)} de tu ingreso (umbral sano: 35%). Prioriza la deuda más cara.`,
        dedupeKey: `riesgo_dti:${period}`,
        metricKey: MetricKey.Dti,
        payload: { dti, prevDti: prevDti ?? null },
      });
    }

    // Fondo de emergencia logrado (logro/info).
    const fund = cur.get(MetricKey.EmergencyFundMonths);
    const prevFund = prev.get(MetricKey.EmergencyFundMonths);
    if (fund !== undefined && fund >= 6 && (prevFund === undefined || prevFund < 6)) {
      created += await this.emit({
        userId,
        type: 'logro',
        severity: 'info',
        title: '🎉 ¡Fondo de emergencia completo!',
        body: `Ya cubres ${Math.round(fund * 10) / 10} meses de gastos esenciales. Ese colchón te protege de imprevistos.`,
        dedupeKey: `logro_fondo:${period}`,
        metricKey: MetricKey.EmergencyFundMonths,
        payload: { months: fund },
      });
    }

    // Cambio de banda del Score: sube (logro) o baja (riesgo — DEC-0006 §10.2).
    const score = cur.get('score');
    const prevScore = prev.get('score');
    if (score !== undefined && prevScore !== undefined) {
      const curBand = BAND_ORDER.indexOf(scoreBand(score));
      const prevBand = BAND_ORDER.indexOf(scoreBand(prevScore));
      if (curBand > prevBand) {
        created += await this.emit({
          userId,
          type: 'logro',
          severity: 'info',
          title: `🏆 Tu Score subió a "${scoreBand(score)}"`,
          body: `Pasaste de ${prevScore} a ${score} puntos. Tu salud financiera va en la dirección correcta.`,
          dedupeKey: `logro_banda:${period}`,
          metricKey: 'score',
          payload: { score, prevScore },
        });
      } else if (curBand < prevBand) {
        created += await this.emit({
          userId,
          type: 'riesgo',
          severity: 'warning',
          title: `Tu Score bajó a "${scoreBand(score)}"`,
          body: `Pasaste de ${prevScore} a ${score} puntos. Entra a Salud para ver qué pilar cayó y cómo recuperarlo.`,
          dedupeKey: `riesgo_banda:${period}`,
          metricKey: 'score',
          payload: { score, prevScore },
        });
      }
    }

    // Cambio de tendencia (signo se invierte) en flujo o patrimonio.
    for (const key of [MetricKey.TrendCashflow, MetricKey.TrendNetWorth]) {
      const t = cur.get(key);
      const p = prev.get(key);
      if (t !== undefined && p !== undefined && Math.sign(t) !== Math.sign(p) && t !== 0 && p !== 0) {
        const improving = t > 0;
        created += await this.emit({
          userId,
          type: 'cambio_tendencia',
          severity: 'info',
          title: improving ? '📈 Tu tendencia se volvió positiva' : '📉 Tu tendencia cambió de dirección',
          body: improving
            ? `La métrica ${key.replace('trend.', '')} venía cayendo y ahora sube. ¡Sigue así!`
            : `La métrica ${key.replace('trend.', '')} venía subiendo y ahora cae. Vale la pena revisar qué cambió.`,
          dedupeKey: `tendencia_${key}:${period}`,
          metricKey: key,
          payload: { slope: t, prevSlope: p },
        });
      }
    }

    return created;
  }

  /** Evento único: deuda saldada. El payload de debt.updated no trae balance
   *  (ver ARQ-0006 §4.3): se consulta la deuda y la clave usa el debtId
   *  (DEC-0006 §10.3 — idempotencia por entidad, no por mes). */
  @OnEvent('debt.updated')
  async onDebtUpdated(payload: { userId?: string }): Promise<void> {
    if (!payload?.userId) return;
    try {
      const paid = await this.prisma.debt.findMany({
        where: { userId: payload.userId, deletedAt: null, status: 'pagada' },
      });
      for (const debt of paid) {
        await this.emit({
          userId: payload.userId,
          type: 'logro',
          severity: 'info',
          title: '🎉 ¡Saldaste una deuda!',
          body: `Terminaste de pagar una de tus deudas (${debt.debtType}). Ese dinero mensual ahora puede trabajar para ti.`,
          dedupeKey: `logro_deuda_saldada:${debt.id}`,
          payload: { debtId: debt.id, debtType: debt.debtType },
        });
      }
    } catch (e) {
      this.logger.error(`Insight deuda saldada falló: ${(e as Error).message}`);
    }
  }

  private async emit(input: Parameters<InsightsService['createIfNew']>[0]): Promise<number> {
    const created = await this.insights.createIfNew(input);
    return created ? 1 : 0;
  }

  private async readMonth(userId: string, capturedAt: Date): Promise<Map<string, number>> {
    const rows = await this.prisma.metricReading.findMany({
      where: { userId, period: 'month', capturedAt },
    });
    return new Map(rows.map((r) => [r.metricKey, Number(r.value)]));
  }
}
