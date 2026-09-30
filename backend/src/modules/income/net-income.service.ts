import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface NetIncomeDeduction {
  name: string;
  kind: string;
  amount: number;
  withheldAtSource: boolean;
  /** Día del mes de la fuente que la origina (para anclar su compromiso en
   *  SpendableService — null si la fuente no declaró día). */
  sourceDayOfMonth: number | null;
}

/**
 * FIN-027 (DEC-0027) · Ingreso bruto → deducciones → ingreso NETO disponible.
 */
export interface NetIncomeSummary {
  /** Suma de fuentes FIJAS (bruto, antes de deducciones). */
  grossFixedTotal: number;
  /** Suma de fuentes VARIABLES (estimado — nunca certeza, §29). */
  grossVariableEstimate: number;
  /** Deducciones activas de fuentes fijas, con su monto ya calculado. */
  deductions: NetIncomeDeduction[];
  /** grossFixedTotal − deducciones de fuentes fijas. */
  netFixedTotal: number;
  /** netFixedTotal + grossVariableEstimate (estimación combinada del mes). */
  netMonthlyEstimate: number;
  /** Deducciones que la usuaria paga ella misma (withheldAtSource=false) —
   *  compromiso del ciclo, no solo descuento del neto (DEC-0027 P2). */
  selfPaidDeductionsTotal: number;
  /** true si hay al menos una deducción activa (para el copy de Salud). */
  hasDeductions: boolean;
}

/**
 * FIN-027 (DEC-0027 P1/P3) · Fuente ÚNICA del ingreso neto disponible (§32),
 * patrón `SpendableService`/`DebtOutlayService`: módulo HOJA, un solo cálculo,
 * todos los consumidores lo inyectan. Sin perfil/fuentes configuradas, todos
 * los totales son 0 — regresión garantizada para quien no usa el modelo nuevo
 * (DEC §5.4).
 */
@Injectable()
export class NetIncomeService {
  constructor(private readonly prisma: PrismaService) {}

  async compute(userId: string): Promise<NetIncomeSummary> {
    const sources = await this.prisma.incomeSource.findMany({
      where: { userId, deletedAt: null, isActive: true },
      include: { deductions: { where: { deletedAt: null, isActive: true } } },
    });

    let grossFixedTotal = 0;
    let grossVariableEstimate = 0;
    let deductionsTotal = 0;
    let selfPaidDeductionsTotal = 0;
    const deductions: NetIncomeDeduction[] = [];

    for (const s of sources) {
      const amount = Number(s.amount);
      if (s.isVariable) {
        grossVariableEstimate += amount;
        continue; // Las deducciones declaradas se asumen sobre la fuente FIJA.
      }
      grossFixedTotal += amount;
      for (const d of s.deductions) {
        const base = d.base === 'parcial' ? Number(d.baseAmount ?? 0) : amount;
        const computed = d.percent != null ? round2((base * Number(d.percent)) / 100) : round2(Number(d.fixedAmount ?? 0));
        deductionsTotal += computed;
        if (!d.withheldAtSource) selfPaidDeductionsTotal += computed;
        deductions.push({
          name: d.name,
          kind: d.kind,
          amount: computed,
          withheldAtSource: d.withheldAtSource,
          sourceDayOfMonth: s.dayOfMonth,
        });
      }
    }

    const netFixedTotal = round2(Math.max(0, grossFixedTotal - deductionsTotal));
    return {
      grossFixedTotal: round2(grossFixedTotal),
      grossVariableEstimate: round2(grossVariableEstimate),
      deductions,
      netFixedTotal,
      netMonthlyEstimate: round2(netFixedTotal + grossVariableEstimate),
      selfPaidDeductionsTotal: round2(selfPaidDeductionsTotal),
      hasDeductions: deductions.length > 0,
    };
  }
}
