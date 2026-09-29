import React from 'react';
import { Pressable, SectionList, Text, View } from 'react-native';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Button, Card, Ico, ProgressBar, Row, Screen } from '../../components/ui';
import { colors, debtShareColors, spacing } from '../../theme/colors';
import { formatDate, formatMoney, formatPercent } from '../../utils/format';
import { Debt, DebtsSummary, toNumber } from '../../api/types';
import { debtsApi } from '../../api/endpoints';
import { useApi } from '../../utils/useApi';
import { DebtsStackParamList, RootStackParamList } from '../../navigation/types';

/**
 * FIN-022 · Experiencia de Deudas (ARQ-0022, DEC-0022): de archivador a
 * estrategia — frente completo (P1) → orden de ataque del motor (P2) → costo
 * en pesos por tarjeta (P3). La lista principal conserva su orden por
 * vencimiento (reordenarla en silencio fue rechazado en el ARQ).
 */
type Props = NativeStackScreenProps<DebtsStackParamList, 'DebtsList'>;

/** Opción B (elegida por el Fundador, 2026-09-29): agrupadas por urgencia. */
const SOON_DAYS = 30;

type DebtSection = { key: string; title: string; tone: string; data: Debt[] };

function groupByUrgency(all: Debt[]): DebtSection[] {
  const now = Date.now();
  const overdue: Debt[] = [];
  const soon: Debt[] = [];
  const later: Debt[] = [];
  const closed: Debt[] = [];
  for (const d of all) {
    if (d.status !== 'activa') closed.push(d);
    else if (d.overdueDays) overdue.push(d);
    else if (d.nextDueDate && new Date(d.nextDueDate).getTime() - now <= SOON_DAYS * 86_400_000) soon.push(d);
    else later.push(d);
  }
  return [
    { key: 'overdue', title: 'VENCIDAS', tone: colors.danger, data: overdue },
    { key: 'soon', title: `VENCEN EN LOS PRÓXIMOS ${SOON_DAYS} DÍAS`, tone: colors.warning, data: soon },
    { key: 'later', title: 'MÁS ADELANTE', tone: colors.primaryDark, data: later },
    { key: 'closed', title: 'PAGADAS O CERRADAS', tone: colors.textMuted, data: closed },
  ].filter((s) => s.data.length > 0);
}

export function DebtsListScreen({ navigation }: Props) {
  const { data, loading, error, reload } = useApi(() => debtsApi.list(), []);
  const summary = useApi(() => debtsApi.summary(), []);
  const reloadSummary = summary.reload;

  useFocusEffect(
    React.useCallback(() => {
      void reload();
      void reloadSummary();
    }, [reload, reloadSummary]),
  );

  const active = (data ?? []).filter((d) => d.status === 'activa');
  const sections = groupByUrgency(data ?? []);

  return (
    <Screen>
      <SectionList
        sections={sections}
        keyExtractor={(d) => d.id}
        stickySectionHeadersEnabled={false}
        refreshing={loading}
        onRefresh={() => {
          void reload();
          void reloadSummary();
        }}
        ListHeaderComponent={
          <View>
            {error ? <Text style={{ color: colors.danger, marginBottom: 8 }}>{error}</Text> : null}
            <FrontHero summary={summary.data} debts={active} />
            <Button title="+ Nueva deuda" onPress={() => navigation.navigate('AddDebt')} />
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text
            style={{
              color: section.tone,
              fontSize: 12,
              fontWeight: '800',
              letterSpacing: 0.8,
              marginTop: spacing.md,
              marginBottom: spacing.xs,
            }}
          >
            {section.title}
          </Text>
        )}
        ListEmptyComponent={
          !loading ? (
            <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl }}>
              Aún no tienes deudas. Agrega la primera para ver tu plan de pago.
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate('DebtDetail', { debtId: item.id, name: item.name })}
          >
            <DebtCard debt={item} />
          </Pressable>
        )}
        ListFooterComponent={
          <View style={{ marginTop: spacing.md }}>
            <AttackPlan onDebt={(d) => navigation.navigate('DebtDetail', { debtId: d.debtId, name: d.name })} />
          </View>
        }
      />
    </Screen>
  );
}

/** "7 oct" — la fecha corta de las tarjetas (el año solo si no es el actual). */
function shortDate(iso: string): string {
  const d = new Date(iso);
  const sameYear = d.getUTCFullYear() === new Date().getUTCFullYear();
  return d
    .toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
      ...(sameYear ? {} : { year: 'numeric' }),
      timeZone: 'UTC',
    })
    .replace('.', '');
}

/** P1 — El frente completo: cuánto debo, qué me cuesta al mes, cuándo salgo y cuánto pesa cada deuda. */
function FrontHero({ summary, debts }: { summary: DebtsSummary | null; debts: Debt[] }) {
  if (!summary || summary.debtsCount === 0) return null;
  // Fecha de libertad TOTAL = máx payoffDate de las amortizaciones existentes
  // (misma fuente del detalle — ARQ-0022 P1); sin proyecciones no se muestra.
  const freeDate = debts
    .map((d) => d.projection?.payoffDate ?? null)
    .filter((p): p is string => p !== null)
    .sort()
    .pop();
  // Barra total: el peso de cada deuda activa en el saldo (misma cifra de la lista).
  const parts = debts
    .map((d) => ({ id: d.id, name: d.name, balance: toNumber(d.currentBalance) }))
    .filter((p) => p.balance > 0);
  const total = parts.reduce((a, p) => a + p.balance, 0);
  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>
          Debes · {summary.debtsCount} deuda{summary.debtsCount === 1 ? '' : 's'}
        </Text>
        {/* "Tus cuotas suman": contrato programado — NUNCA "pagas al mes"
            (desembolso real con seguros aparte = FIN-023; pagado del ciclo = Inicio). */}
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>
          Cuotas {formatMoney(summary.monthlyPaymentsTotal)}/mes
        </Text>
      </Row>
      <Text style={{ color: colors.text, fontSize: 30, fontWeight: '800', marginTop: 2 }}>
        {formatMoney(summary.totalDebt)}
      </Text>
      {total > 0 && parts.length > 1 ? (
        <>
          <View style={{ flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', gap: 2, marginTop: spacing.sm }}>
            {parts.map((p, i) => (
              <View
                key={p.id}
                style={{ flex: p.balance / total, backgroundColor: debtShareColors[i % debtShareColors.length] }}
              />
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 4, marginTop: spacing.sm }}>
            {parts.map((p, i) => (
              <Row key={p.id} style={{ gap: 6 }}>
                <View
                  style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: debtShareColors[i % debtShareColors.length] }}
                />
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  {p.name} {Math.round((p.balance / total) * 100)}%
                </Text>
              </Row>
            ))}
          </View>
        </>
      ) : null}
      {/* FIN-023 P4: el desembolso real, SOLO si difiere de las cuotas (§29.1). */}
      {summary.totalMonthlyOutlay > summary.monthlyPaymentsTotal ? (
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: spacing.sm }}>
          Con seguros y cargos: {formatMoney(summary.totalMonthlyOutlay)} al mes
        </Text>
      ) : null}
      {freeDate ? (
        <Text style={{ color: colors.primaryDark, fontWeight: '700', marginTop: spacing.sm }}>
          <Ico name="flag-outline" color={colors.primary} /> Libre de todo: {formatDate(freeDate)}
        </Text>
      ) : null}
    </Card>
  );
}

/**
 * P2 — FIN-045 (Fundador, 2026-09-29): el orden de ataque es el del plan para
 * LIBERAR FLUJO (la que más cuota libera por peso primero), el mismo que da la
 * jugada de Salud. El simulador queda para comparar otros órdenes.
 */
function AttackPlan({ onDebt }: { onDebt: (d: { debtId: string; name: string }) => void }) {
  const rootNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data: plan, reload } = useApi(() => debtsApi.cashflowPlan(), []);
  useFocusEffect(
    React.useCallback(() => {
      void reload();
    }, [reload]),
  );
  if (!plan || plan.steps.length === 0) return null;

  return (
    <Card style={{ borderColor: colors.primary, borderWidth: 2 }}>
      <Text style={{ fontWeight: '800', fontSize: 15, color: colors.text }}>Tu orden para liberar plata</Text>
      <Text style={{ color: colors.textMuted, marginTop: 4, fontSize: 13, lineHeight: 19 }}>
        {plan.toDebt > 0
          ? `Abona ${formatMoney(plan.toDebt)} al mes a la primera; al terminarla, su cuota se suma a la siguiente.`
          : 'Cuando te sobre plata, abónale primero a la que más cuota libera.'}
      </Text>
      <View style={{ marginTop: spacing.sm, gap: 8 }}>
        {plan.steps.map((s) => (
          <Pressable key={s.debtId} onPress={() => onDebt({ debtId: s.debtId, name: s.name })} accessibilityRole="button">
            <Row style={{ justifyContent: 'space-between', gap: 8 }}>
              <Text style={{ color: colors.text, flex: 1, fontWeight: s.order === 1 ? '700' : '400' }} numberOfLines={1}>
                {s.order}º {s.name}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>libera {formatMoney(s.payment)}/mes</Text>
            </Row>
          </Pressable>
        ))}
      </View>
      <Row style={{ justifyContent: 'space-between', marginTop: spacing.sm }}>
        <Pressable onPress={() => rootNav.navigate('CashflowPlan')} accessibilityRole="link" hitSlop={8}>
          <Text style={{ color: colors.primary, fontWeight: '800' }}>Ver mi plan →</Text>
        </Pressable>
        <Pressable
          onPress={() => rootNav.navigate('Simulator', { scenario: 'estrategia_deudas', params: { extraBudget: plan.toDebt } })}
          accessibilityRole="link"
          hitSlop={8}
        >
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>
            <Ico name="flask-outline" color={colors.textMuted} /> Comparar
          </Text>
        </Pressable>
      </Row>
    </Card>
  );
}

/**
 * P3 — Cada deuda con su barra: en créditos, cuánto llevas pagado a capital
 * (monto original − saldo); en tarjetas, cuánto del cupo usas (no tienen un
 * monto original que se vaya pagando).
 */
function DebtCard({ debt }: { debt: Debt }) {
  const balance = toNumber(debt.currentBalance);
  const isCard = debt.scheduleModel === 'cuotas_por_compra';
  const original = toNumber(debt.originalAmount);
  const limit = debt.creditLimit != null ? toNumber(debt.creditLimit) : 0;

  let bar: { ratio: number; color: string; left: string } | null = null;
  let flag: { text: string; color: string } | null = null;
  if (isCard) {
    if (limit > 0) {
      const use = balance / limit;
      bar = {
        ratio: use,
        color: use > 1 ? colors.danger : use > 0.8 ? colors.warning : colors.primary,
        left: `Usas ${Math.round(use * 100)}% del cupo de ${formatMoney(limit)}`,
      };
      if (use > 1) flag = { text: 'sobrecupo', color: colors.danger };
    }
  } else if (original > balance) {
    const paid = Math.min(1, (original - balance) / original);
    bar = {
      ratio: paid,
      color: colors.primary,
      left: `${Math.round(paid * 100)}% pagado a capital de ${formatMoney(original)}`,
    };
  } else if (debt.status === 'activa') {
    // Registrada sin el monto inicial (se guardó el saldo de ese día): barra vacía
    // y la pista para completarlo en el detalle.
    bar = { ratio: 0, color: colors.primary, left: 'Toca para agregar cuánto te prestaron' };
  }
  const closed = debt.status !== 'activa';

  return (
    <Card style={closed ? { opacity: 0.6 } : undefined}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, flex: 1, marginRight: 8 }} numberOfLines={1}>
          {debt.name}
          {flag ? <Text style={{ fontSize: 12, color: flag.color }}> · {flag.text}</Text> : null}
        </Text>
        <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>{formatMoney(balance)}</Text>
      </Row>
      {bar ? (
        <View style={{ marginTop: spacing.sm }}>
          <ProgressBar value={bar.ratio} color={bar.color} height={6} label={bar.left} />
        </View>
      ) : null}
      <Row style={{ justifyContent: 'space-between', marginTop: 6, gap: 8 }}>
        <Text style={{ color: colors.textMuted, fontSize: 12, flex: 1 }}>
          {bar ? bar.left : `${formatPercent(toNumber(debt.interestRate))} ${debt.rateBasis}`}
        </Text>
        {/* FIN-024 P2: estado de mora derivado por el backend (helper único).
            Naranja, no rojo — es un aviso, no un juicio (§29.2). */}
        {debt.overdueDays ? (
          <Text style={{ color: colors.warning, fontWeight: '700', fontSize: 12 }}>
            venció hace {debt.overdueDays} día{debt.overdueDays === 1 ? '' : 's'}
          </Text>
        ) : debt.nextDueDate && !closed ? (
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>
            {shortDate(debt.nextDueDate)} · {formatMoney(toNumber(debt.monthlyPayment))}
          </Text>
        ) : null}
      </Row>
      {bar ? (
        <Text style={{ color: colors.textFaint, fontSize: 12, marginTop: 2 }}>
          {formatPercent(toNumber(debt.interestRate))} {debt.rateBasis}
          {debt.projection?.payoffDate && !isCard ? ` · terminas ${shortDate(debt.projection.payoffDate)}` : ''}
        </Text>
      ) : null}
    </Card>
  );
}
