import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EntitlementsService } from '../billing/entitlements.service';
import { EngineService } from '../financial-engine/engine.service';
import { NetIncomeService } from '../income/net-income.service';
import { MetricKey } from '../financial-engine/engine.constants';
import { monthStart, monthStartMinus } from '../financial-engine/metrics/series.util';
import { PILLAR_WEIGHTS, PillarKey, scoreBand, SCORE_VERSION } from './score.util';

const fmtPct = (n: number) => `${Math.round(n * 1000) / 10}%`;
const fmtMonths = (n: number) => `${Math.round(n * 10) / 10} meses`;

type Level = 'verde' | 'amarillo' | 'rojo';

export interface IndicatorOut {
  key: string;
  title: string;
  value: number | null;
  display: string;
  level: Level | 'sin_datos';
  meaning: string;
  howComputed: string;
  ranges: string;
  actions: string[];
}

const PILLAR_LABELS: Record<PillarKey, string> = {
  liquidity: 'Liquidez',
  debt: 'Endeudamiento',
  savings: 'Ahorro',
  wealth: 'Patrimonio',
};

/**
 * Capa 2 · Salud Financiera (FIN-004). Compone la respuesta desde las lecturas
 * que el Motor ya persistió (no recalcula nada). Explicaciones 100% plantilla
 * determinista (cero IA, DEC-0001 §10.6 sigue vigente para FIN-005).
 */
@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: EngineService,
    private readonly entitlements: EntitlementsService,
    // FIN-027 (DEC-0027 §5.1): nota de copy obligatoria cuando el Score usa
    // ingreso NETO (cambio de base) — costo de honestidad, no regaño.
    private readonly netIncome: NetIncomeService,
  ) {}

  async score(userId: string, now: Date = new Date()) {
    const current = monthStart(now);
    const previous = monthStartMinus(now, 1);
    const [readings, prevReadings, cold, income] = await Promise.all([
      this.readMonth(userId, current),
      this.readMonth(userId, previous),
      this.engine.coldStartStatus(userId, now),
      this.netIncome.compute(userId),
    ]);

    const score = readings.get('score') ?? null;
    const prevScore = prevReadings.get('score') ?? null;

    const pillars = (Object.keys(PILLAR_WEIGHTS) as PillarKey[]).map((key) => {
      const value = readings.get(`score.${key}`) ?? null;
      const prev = prevReadings.get(`score.${key}`) ?? null;
      return {
        key,
        label: PILLAR_LABELS[key],
        weight: PILLAR_WEIGHTS[key],
        value,
        status: value === null ? 'unavailable' : 'ok',
        delta: value !== null && prev !== null ? Math.round((value - prev) * 10) / 10 : null,
      };
    });

    return {
      period: current.toISOString().slice(0, 7),
      score,
      band: score !== null ? scoreBand(score) : null,
      version: readings.get('score.version') ?? SCORE_VERSION,
      delta: score !== null && prevScore !== null ? score - prevScore : null,
      deltaByPillar: pillars
        .filter((p) => p.delta !== null && p.delta !== 0)
        .map((p) => ({ pillar: p.label, delta: p.delta })),
      pillars,
      coldStart: cold,
      indicators: this.buildIndicators(readings),
      // FIN-027 (DEC-0027 §5.1): requisito del DEC, no opcional. Neutraliza el
      // riesgo de que configurar bien los datos se sienta como castigo (§29.2).
      netIncomeNotice: income.hasDeductions
        ? 'Tu Score se calcula con tu ingreso real después de deducciones — es más preciso, no que hayas empeorado.'
        : null,
      disclaimer:
        'El Score Millo y sus indicadores son información educativa sobre tus hábitos financieros. ' +
        'No son asesoría financiera ni un puntaje crediticio, y no se comparten con entidades.',
    };
  }

  /** Histórico mensual del Score — feature premium (DEC-0001 §10.8).
   *  FIN-009: la autorización la decide EntitlementsService leyendo
   *  Subscription (DEC-0009 §10.4) — nunca la caché `plan`. */
  async scoreHistory(userId: string) {
    if (!(await this.entitlements.hasPremium(userId))) {
      // Telemetría de intención de pago (señal de monetización).
      this.logger.log(`[monetización] intento de histórico con plan free user=${userId}`);
      throw new ForbiddenException({ code: 'PREMIUM_REQUIRED', message: 'El histórico del Score es una función premium.' });
    }
    const rows = await this.prisma.metricReading.findMany({
      where: { userId, metricKey: 'score', period: 'month' },
      orderBy: { capturedAt: 'asc' },
    });
    return rows.map((r) => ({
      period: r.capturedAt.toISOString().slice(0, 7),
      score: Number(r.value),
    }));
  }

  private async readMonth(userId: string, capturedAt: Date): Promise<Map<string, number>> {
    const rows = await this.prisma.metricReading.findMany({
      where: { userId, period: 'month', capturedAt },
    });
    return new Map(rows.map((r) => [r.metricKey, Number(r.value)]));
  }

  /** Los 3 indicadores del primer hito (DEC-0001 §10.9), con plantillas. */
  private buildIndicators(readings: Map<string, number>): IndicatorOut[] {
    const dti = readings.get(MetricKey.Dti) ?? null;
    const fund = readings.get(MetricKey.EmergencyFundMonths) ?? null;
    const savings = readings.get(MetricKey.SavingsRate) ?? null;

    return [
      {
        key: 'dti',
        title: 'Endeudamiento',
        value: dti,
        display: dti !== null ? fmtPct(dti) : '—',
        level: dti === null ? 'sin_datos' : dti < 0.2 ? 'verde' : dti <= 0.35 ? 'amarillo' : 'rojo',
        meaning: 'Qué parte de tu ingreso mensual se va en cuotas de deuda.',
        howComputed:
          dti !== null
            ? `Tus cuotas mensuales divididas entre tu ingreso de referencia dan ${fmtPct(dti)}.`
            : 'Aún no hay datos de cuotas o ingresos este mes.',
        ranges: 'Verde <20% · Amarillo 20–35% · Rojo >35%',
        actions: [
          'Prioriza la deuda con la tasa más alta.',
          'Usa el simulador de abono extra en el detalle de tu deuda.',
        ],
      },
      {
        key: 'emergency_fund',
        title: 'Fondo de emergencia',
        value: fund,
        display: fund !== null ? fmtMonths(fund) : '—',
        level: fund === null ? 'sin_datos' : fund >= 6 ? 'verde' : fund >= 3 ? 'amarillo' : 'rojo',
        meaning: 'Cuántos meses de gastos esenciales cubres si pierdes tus ingresos.',
        howComputed:
          fund !== null
            ? `Tu fondo de emergencia dividido entre tu gasto esencial mensual cubre ${fmtMonths(fund)}.`
            : 'Marca una cuenta como fondo de emergencia y registra tus gastos fijos para calcularlo.',
        ranges: 'Verde ≥6 meses · Amarillo 3–6 · Rojo <3',
        actions: [
          'Marca una cuenta como fondo de emergencia en Cuentas.',
          'Aporta un monto fijo mensual hasta llegar a 6 meses.',
        ],
      },
      {
        key: 'savings_rate',
        title: 'Capacidad de ahorro',
        value: savings,
        display: savings !== null ? fmtPct(savings) : '—',
        level:
          savings === null ? 'sin_datos' : savings > 0.2 ? 'verde' : savings >= 0.1 ? 'amarillo' : 'rojo',
        meaning: 'Qué parte de tu ingreso te queda libre cada mes después de gastos y cuotas.',
        howComputed:
          savings !== null
            ? `Tu flujo del mes dividido entre tu ingreso de referencia es ${fmtPct(savings)}.`
            : 'Registra tus ingresos y gastos del mes para calcularla.',
        ranges: 'Verde >20% · Amarillo 10–20% · Rojo <10%',
        actions: [
          'Revisa tus gastos fijos en Presupuesto.',
          'Recorta la categoría donde más gastas este mes.',
        ],
      },
    ];
  }
}
