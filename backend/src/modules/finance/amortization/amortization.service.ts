import { Injectable } from '@nestjs/common';
import { round2, sumMoney } from '../../../common/money.util';
import { toMonthlyEffectiveRate } from './interest.util';
import {
  AmortizationEntry,
  AmortizationInput,
  AmortizationResult,
} from './amortization.types';

/**
 * Motor de amortización.
 *
 * Implementa el sistema francés (cuota fija) y el alemán (abono a capital
 * constante), con soporte de abonos extra a capital. Es puro y determinista:
 * no toca la base de datos, lo que lo hace 100% testeable.
 */
@Injectable()
export class AmortizationService {
  /** Tope de seguridad para evitar bucles infinitos ante entradas patológicas. */
  private static readonly MAX_PERIODS = 12 * 100; // 100 años

  /**
   * Calcula la cuota mensual del sistema francés.
   *   cuota = P * i / (1 - (1+i)^-n)      (si i > 0)
   *   cuota = P / n                        (si i = 0)
   */
  computeMonthlyPayment(principal: number, monthlyRate: number, termMonths: number): number {
    if (termMonths <= 0) {
      throw new Error('El plazo (termMonths) debe ser mayor a 0');
    }
    if (principal <= 0) {
      throw new Error('El principal debe ser mayor a 0');
    }
    if (monthlyRate === 0) {
      return round2(principal / termMonths);
    }
    const factor = 1 - Math.pow(1 + monthlyRate, -termMonths);
    return round2((principal * monthlyRate) / factor);
  }

  /** Genera la tabla de amortización completa. */
  buildSchedule(input: AmortizationInput): AmortizationResult {
    this.validate(input);

    const system = input.system ?? 'frances';
    const extraMonthly = round2(input.extraMonthly ?? 0);
    const monthlyRate = toMonthlyEffectiveRate(input.interestRate, input.rateBasis);
    const basePayment = this.computeMonthlyPayment(
      input.principal,
      monthlyRate,
      input.termMonths,
    );
    // Abono a capital fijo (sistema alemán).
    const germanPrincipal = round2(input.principal / input.termMonths);

    const entries: AmortizationEntry[] = [];
    let balance = round2(input.principal);
    let period = 0;

    while (balance > 0.005 && period < AmortizationService.MAX_PERIODS) {
      period += 1;
      const openingBalance = balance;
      const interestPart = round2(openingBalance * monthlyRate);

      // Porción de capital "programada" según el sistema.
      let scheduledPrincipal =
        system === 'aleman'
          ? germanPrincipal
          : round2(basePayment - interestPart);

      // La porción de capital nunca puede ser negativa (tasa muy alta / cuota baja).
      if (scheduledPrincipal < 0) scheduledPrincipal = 0;

      let extraPayment = extraMonthly;
      let totalPrincipal = round2(scheduledPrincipal + extraPayment);

      // Última cuota: si el capital a pagar cubre o supera el saldo, se liquida.
      if (totalPrincipal >= openingBalance || period >= input.termMonths + this.extraBuffer(extraMonthly)) {
        // Ajuste final: se paga exactamente el saldo pendiente. El capital total
        // liquidado (openingBalance) se reparte de forma consistente entre la
        // porción programada y el abono extra, para que
        //   sum(principalPart) + sum(extraPayment) === principal.
        const usedScheduled = round2(Math.min(scheduledPrincipal, openingBalance));
        extraPayment = round2(openingBalance - usedScheduled);
        const payment = round2(usedScheduled + extraPayment + interestPart);
        entries.push({
          periodNo: period,
          dueDate: this.addMonths(input.startDate, period),
          openingBalance,
          payment,
          interestPart,
          principalPart: usedScheduled,
          extraPayment,
          closingBalance: 0,
        });
        balance = 0;
        break;
      }

      const closingBalance = round2(openingBalance - totalPrincipal);
      const payment = round2(scheduledPrincipal + interestPart + extraPayment);
      entries.push({
        periodNo: period,
        dueDate: this.addMonths(input.startDate, period),
        openingBalance,
        payment,
        interestPart,
        principalPart: round2(scheduledPrincipal + 0), // capital programado del periodo
        extraPayment,
        closingBalance,
      });
      balance = closingBalance;
    }

    const totalInterest = sumMoney(entries.map((e) => e.interestPart));
    const totalPaid = sumMoney(entries.map((e) => e.payment));

    return {
      monthlyRate,
      monthlyPayment: basePayment,
      numberOfPayments: entries.length,
      totalInterest,
      totalPaid,
      payoffDate: entries.length ? entries[entries.length - 1].dueDate : this.addMonths(input.startDate, 0),
      entries,
    };
  }

  /**
   * Simula el impacto de un abono extra mensual: cuánto interés y cuántos meses
   * se ahorran frente al plan base.
   */
  simulateExtraPayment(
    input: AmortizationInput,
    extraMonthly: number,
  ): {
    baseline: { months: number; totalInterest: number; payoffDate: string };
    withExtra: { months: number; totalInterest: number; payoffDate: string };
    interestSaved: number;
    monthsSaved: number;
  } {
    const baseline = this.buildSchedule({ ...input, extraMonthly: 0 });
    const withExtra = this.buildSchedule({ ...input, extraMonthly });
    return {
      baseline: {
        months: baseline.numberOfPayments,
        totalInterest: baseline.totalInterest,
        payoffDate: baseline.payoffDate,
      },
      withExtra: {
        months: withExtra.numberOfPayments,
        totalInterest: withExtra.totalInterest,
        payoffDate: withExtra.payoffDate,
      },
      interestSaved: round2(baseline.totalInterest - withExtra.totalInterest),
      monthsSaved: baseline.numberOfPayments - withExtra.numberOfPayments,
    };
  }

  // --- FIN-012 (DEC-0012 §4.1): abono ÚNICO a capital — métodos ADITIVOS ---
  // NUNCA usan extraMonthly/simulateExtraPayment (esa función modela una cuota
  // extra RECURRENTE mensual; usarla para un abono único infla el ahorro).

  /**
   * Plan restante real de una deuda viva: camina el cronograma con CUOTA FIJA
   * dada sobre un saldo dado, hasta liquidar. No recalcula la cuota, la respeta.
   */
  remainingSchedule(
    balance: number,
    monthlyRate: number,
    payment: number,
    from: Date,
  ): { months: number; totalInterest: number; payoffDate: string; entries: AmortizationEntry[] } {
    if (balance <= 0) throw new Error('balance debe ser > 0');
    if (payment <= round2(balance * monthlyRate)) {
      throw new Error('La cuota no cubre ni el interés del periodo: el saldo nunca bajaría');
    }
    const entries: AmortizationEntry[] = [];
    let bal = round2(balance);
    let period = 0;
    while (bal > 0.005 && period < AmortizationService.MAX_PERIODS) {
      period += 1;
      const interestPart = round2(bal * monthlyRate);
      let principalPart = round2(payment - interestPart);
      let pay = payment;
      // Última cuota: se liquida el saldo. Un residuo de redondeo ≤ $1 (la cuota
      // redondeada a centavos deja centavos vivos) se absorbe aquí, como hace la
      // banca — evita una "cuota fantasma" de centavos al final del plan.
      if (principalPart >= bal || round2(bal - principalPart) <= 1) {
        principalPart = bal;
        pay = round2(bal + interestPart);
      }
      const closing = round2(bal - principalPart);
      entries.push({
        periodNo: period,
        dueDate: this.addMonths(from, period),
        openingBalance: bal,
        payment: pay,
        interestPart,
        principalPart,
        extraPayment: 0,
        closingBalance: closing,
      });
      bal = closing;
    }
    return {
      months: entries.length,
      totalInterest: sumMoney(entries.map((e) => e.interestPart)),
      payoffDate: entries.length ? entries[entries.length - 1].dueDate : this.addMonths(from, 0),
      entries,
    };
  }

  /**
   * Recibo de un abono único a capital: plan restante ANTES vs. DESPUÉS.
   *  - reducir_plazo: misma cuota sobre (balance − amount) → menos cuotas.
   *  - reducir_cuota: mismo plazo restante, nueva cuota exacta por fórmula
   *    cerrada (computeMonthlyPayment).
   * El preview y el recibo persistido usan ESTA misma función (DEC-0012 §4.4).
   */
  prepaymentReceipt(
    balance: number,
    monthlyRate: number,
    payment: number,
    remainingMonths: number,
    amount: number,
    effect: 'reducir_plazo' | 'reducir_cuota',
    from: Date,
  ) {
    if (amount <= 0) throw new Error('El abono debe ser mayor a 0');
    if (amount >= balance) {
      throw new Error('El abono cubre todo el saldo: usa el pago total anticipado');
    }
    const before = this.remainingSchedule(balance, monthlyRate, payment, from);
    const newBalance = round2(balance - amount);
    const newPayment =
      effect === 'reducir_cuota'
        ? this.computeMonthlyPayment(newBalance, monthlyRate, remainingMonths)
        : payment;
    const after = this.remainingSchedule(newBalance, monthlyRate, newPayment, from);
    return {
      effect,
      amount: round2(amount),
      newBalance,
      newMonthlyPayment: newPayment,
      before: { months: before.months, totalInterest: before.totalInterest, payoffDate: before.payoffDate },
      after: { months: after.months, totalInterest: after.totalInterest, payoffDate: after.payoffDate },
      interestSaved: round2(before.totalInterest - after.totalInterest),
      monthsSaved: before.months - after.months,
      paymentSaved: round2(payment - newPayment),
      afterEntries: after.entries,
    };
  }

  // --- helpers ---

  private extraBuffer(extraMonthly: number): number {
    // Sin abono extra, el plan dura exactamente termMonths → sin buffer.
    // Con abono extra termina antes, nunca después, así que el buffer no aplica;
    // se conserva por robustez ante redondeos.
    return extraMonthly > 0 ? 0 : 0;
  }

  private validate(input: AmortizationInput): void {
    if (input.principal <= 0) throw new Error('principal debe ser > 0');
    if (input.termMonths <= 0) throw new Error('termMonths debe ser > 0');
    if (input.interestRate < 0) throw new Error('interestRate no puede ser negativa');
    if ((input.extraMonthly ?? 0) < 0) throw new Error('extraMonthly no puede ser negativo');
  }

  /** Devuelve la fecha (YYYY-MM-DD) resultante de sumar `months` a la fecha base. */
  private addMonths(base: Date, months: number): string {
    const d = new Date(base.getTime());
    const targetMonth = d.getUTCMonth() + months;
    const year = d.getUTCFullYear() + Math.floor(targetMonth / 12);
    const month = ((targetMonth % 12) + 12) % 12;
    // Ajuste de fin de mes (p. ej. 31 en meses de 30 días).
    const day = Math.min(
      d.getUTCDate(),
      new Date(Date.UTC(year, month + 1, 0)).getUTCDate(),
    );
    const result = new Date(Date.UTC(year, month, day));
    return result.toISOString().slice(0, 10);
  }
}
