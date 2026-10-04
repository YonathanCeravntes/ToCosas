import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../components/AppText';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Card, EmptyState, ErrorState, Field, FormScroll, GroupLabel, HeroCard, Ico, ProgressBar, Row, Skeleton } from '../components/ui';
import { colors, spacing, type } from '../theme/colors';
import { formatMoney, parseAmount } from '../utils/format';
import { debtsApi } from '../api/endpoints';
import { CashflowPlan, CashflowPlanStep } from '../api/types';
import { RootStackParamList } from '../navigation/types';

/** "ene 2027" para el mes N contado desde hoy (1 = el próximo). */
export function monthLabel(n: number | null): string {
  if (n === null) return 'más de 50 años';
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + n, 1);
  return d.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' }).replace('.', '');
}

/** "4 meses" / "1 mes". */
export function monthsText(n: number | null): string {
  if (n === null) return 'más de 50 años';
  return `${n} mes${n === 1 ? '' : 'es'}`;
}

/**
 * FIN-045 · Plan para liberar flujo (Fundador, 2026-09-29). En vez de "Simularlo",
 * Millo dice qué hacer: a qué deuda abonar primero (la que más cuota libera por
 * peso), con cuánto (la mitad de lo libre) y, sin colchón, cuánto guardar en paralelo.
 * Las cifras vienen del backend (`/debts/cashflow-plan`, fuentes únicas §32).
 */
export function CashflowPlanScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [override, setOverride] = useState<number | undefined>(undefined);
  const [input, setInput] = useState('');
  const [plan, setPlan] = useState<CashflowPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = React.useCallback(async (monthly?: number) => {
    setLoading(true);
    setError(null);
    try {
      setPlan(await debtsApi.cashflowPlan(monthly));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      void load(override);
    }, [load, override]),
  );

  const openDebt = (s: CashflowPlanStep) =>
    navigation.navigate('Main', { screen: 'Debts', params: { screen: 'DebtDetail', initial: false, params: { debtId: s.debtId, name: s.name } } });

  if (error && !plan) return <FormScroll><ErrorState message={error} onRetry={() => void load(override)} /></FormScroll>;
  if (!plan) return <FormScroll><Skeleton hero lines={3} /><Skeleton lines={4} /></FormScroll>;
  if (plan.steps.length === 0) {
    return (
      <FormScroll>
        <EmptyState icon="checkmark-circle-outline" title="No tienes deudas activas" body="Cuando registres una, aquí verás a cuál abonarle primero." />
      </FormScroll>
    );
  }

  const first = plan.steps[0];
  const topRate = Math.max(...plan.steps.map((s) => s.annualRatePct));
  let freedSoFar = 0;

  return (
    <FormScroll onRefresh={() => load(override)}>
      {/* Lo que hay que hacer ESTE mes. */}
      <HeroCard>
        <Text style={{ color: colors.onPrimaryFaint, ...type.label }}>Este mes</Text>
        {plan.toDebt > 0 ? (
          <>
            <Text style={{ color: colors.textInverse, ...type.title, fontSize: 19, lineHeight: 25, marginTop: 6 }}>
              Abona {formatMoney(plan.toDebt)} a {first.name}
            </Text>
            {plan.toColchon > 0 ? (
              <Text style={{ color: colors.textInverse, ...type.body, fontSize: 15, marginTop: 2 }}>
                y guarda {formatMoney(plan.toColchon)} para tu colchón
              </Text>
            ) : null}
            <Text style={{ color: colors.onPrimaryFaint, ...type.small, marginTop: spacing.sm }}>
              {override != null
                ? `Con el monto que escribiste (${formatMoney(plan.proposal)} al mes).`
                : plan.margin?.source === 'estable'
                  ? `Es la mitad de lo que te queda libre en un mes normal (${formatMoney(plan.free)}), ya descontando tu gasto típico${plan.margin.annualSetAside > 0 ? ' y lo que apartas para los gastos grandes del año' : ''}.`
                  : `Es la mitad de lo que te queda libre este mes (${formatMoney(plan.free)}); la otra mitad queda para tu día a día.`}
            </Text>
            <Text style={{ color: colors.textInverse, ...type.body, fontWeight: '600', marginTop: spacing.sm }}>
              La terminas en {monthsText(first.monthWithPlan)} y te libera {formatMoney(first.payment)} al mes.
            </Text>
          </>
        ) : (
          <>
            <Text style={{ color: colors.textInverse, ...type.title, marginTop: 6 }}>
              Este mes no te queda plata libre para abonar
            </Text>
            <Text style={{ color: colors.onPrimaryFaint, ...type.small, marginTop: 4 }}>
              Paga tus cuotas al día. Cuando te sobre algo, empieza por {first.name}: es la que más plata te libera.
            </Text>
          </>
        )}
      </HeroCard>

      {plan.toDebt > 0 ? (
        <Card>
          <Text style={{ color: colors.text, ...type.title, fontSize: 15 }}>¿Por qué {first.name} primero?</Text>
          <Text style={{ color: colors.textMuted, ...type.small, marginTop: 4 }}>
            Por cada $100 que le abonas, liberas ${first.freesPerHundred.toLocaleString('es-CO')} de cuota al mes: es la que más flujo te
            devuelve.{first.annualRatePct >= topRate && topRate > 0 ? ` Además es la de tasa más alta (${first.annualRatePct.toLocaleString('es-CO')}% EA).` : ''}
          </Text>
          <Pressable onPress={() => openDebt(first)} accessibilityRole="button" style={{ marginTop: spacing.sm }}>
            <Text style={{ color: colors.primary, fontWeight: '600', ...type.body }}>
              Abonar a {first.name} <Ico name="arrow-forward" size={13} color={colors.primary} />
            </Text>
          </Pressable>
        </Card>
      ) : null}

      {/* FIN-061 F2 (decisión 3): una sola regla de orden, y el costo de la otra a la vista. */}
      {plan.alternative && !plan.alternative.sameOrder ? (
        <Card>
          <Text style={{ color: colors.text, ...type.title, fontSize: 15 }}>¿Y si pagas primero la de tasa más alta?</Text>
          <Text style={{ color: colors.textMuted, ...type.small, marginTop: 4 }}>
            {plan.alternative.difference > 0
              ? `Pagarías ${formatMoney(plan.alternative.difference)} menos de intereses en total, pero tardarías más en liberar cuota cada mes. Este plan prioriza que te quede plata libre antes.`
              : 'Pagarías lo mismo o más de intereses: este orden te conviene en las dos cosas.'}
          </Text>
        </Card>
      ) : null}

      <GroupLabel title="Tu camino" />
      <Card style={{ paddingVertical: 0 }}>
        {plan.steps.map((s, i) => {
          freedSoFar += s.payment;
          // FIN-060: la primera en verde (empiezas aquí), la última en dorado (el día que
          // quedas libre de todo) y las del medio en el azul de la serie de deudas.
          const last = i === plan.steps.length - 1 && i > 0;
          const badgeBg = i === 0 ? colors.primary : last ? colors.goldSoft : colors.debtSoft;
          const badgeFg = i === 0 ? colors.textInverse : last ? colors.goldText : colors.debt;
          const gain = s.monthWithout !== null && s.monthWithPlan !== null ? s.monthWithout - s.monthWithPlan : null;
          return (
            <Pressable
              key={s.debtId}
              onPress={() => openDebt(s)}
              accessibilityRole="button"
              style={{ paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.surfaceAlt }}
            >
              <Row style={{ gap: spacing.sm, alignItems: 'flex-start' }}>
                <View
                  style={{
                    width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: badgeBg,
                  }}
                >
                  <Text style={{ color: badgeFg, fontWeight: '600', fontSize: 13 }}>{s.order}</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Text style={{ color: colors.text, fontWeight: '600', ...type.body, flex: 1 }} numberOfLines={1}>{s.name}</Text>
                    <Text style={{ color: colors.text, fontWeight: '600', ...type.body }}>{formatMoney(s.balance)}</Text>
                  </Row>
                  <Text style={{ color: colors.textMuted, ...type.small }}>
                    La terminas en {monthLabel(s.monthWithPlan)}
                    {gain && gain > 0 ? ` · ${monthsText(gain)} antes` : ''}
                  </Text>
                  <Text style={{ color: colors.primary, ...type.small, fontWeight: '600' }}>
                    Libera {formatMoney(s.payment)} al mes · quedas con {formatMoney(freedSoFar)} más libres
                  </Text>
                </View>
              </Row>
            </Pressable>
          );
        })}
      </Card>
      <Text style={{ color: colors.textFaint, ...type.caption, marginTop: -spacing.xs, marginBottom: spacing.sm }}>
        Cuando terminas una, su cuota se suma al abono de la siguiente.
      </Text>

      {plan.toColchon > 0 ? (
        <>
          <GroupLabel title="Tu colchón en paralelo" />
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text, fontWeight: '600', ...type.body }}>{formatMoney(plan.toColchon)} al mes</Text>
              <Text style={{ color: colors.textMuted, ...type.small }}>listo en {monthsText(plan.colchonMonths)}</Text>
            </Row>
            <View style={{ marginTop: spacing.sm }}>
              <ProgressBar value={plan.colchonTarget > 0 ? plan.emergencyBalance / plan.colchonTarget : 0} color={colors.primary} height={8} label="Avance del colchón" />
            </View>
            <Text style={{ color: colors.textMuted, ...type.small, marginTop: 6 }}>
              Meta: 1 mes de gastos esenciales ({formatMoney(plan.colchonTarget)}); llevas {formatMoney(plan.emergencyBalance)} y te faltan {formatMoney(plan.colchonGap)}. Así un imprevisto no te obliga a endeudarte otra
              vez. Al completarlo, esa plata también se va a tus deudas.
            </Text>
          </Card>
        </>
      ) : null}

      <GroupLabel title="Ajusta el monto" />
      <Card>
        <Field
          label="¿Cuánto puedes abonar al mes?"
          value={input}
          onChangeText={setInput}
          keyboardType="numeric"
          placeholder={plan.proposal.toLocaleString('es-CO')}
        />
        <Row style={{ gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Button
              title="Recalcular"
              onPress={() => {
                const n = parseAmount(input);
                if (!Number.isNaN(n) && n >= 0) setOverride(n);
              }}
              loading={loading}
            />
          </View>
          {override != null ? (
            <View style={{ flex: 1 }}>
              <Button title="Usar la propuesta" variant="secondary" onPress={() => { setOverride(undefined); setInput(''); }} />
            </View>
          ) : null}
        </Row>
      </Card>

      <Pressable
        onPress={() => navigation.navigate('Simulator', { scenario: 'estrategia_deudas', params: { extraBudget: plan.toDebt } })}
        accessibilityRole="link"
        style={{ alignItems: 'center', paddingVertical: spacing.md }}
      >
        <Text style={{ color: colors.primary, fontWeight: '600', ...type.body }}>
          <Ico name="flask-outline" color={colors.primary} /> Comparar otros órdenes en el simulador
        </Text>
      </Pressable>
      <Text style={{ color: colors.textFaint, ...type.caption, textAlign: 'center', marginBottom: spacing.lg }}>
        Proyección educativa con tus datos de hoy; no es asesoría financiera regulada.
      </Text>
    </FormScroll>
  );
}
