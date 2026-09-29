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
            <AttackPlan
              summary={summary.data}
              debts={active}
              onDebt={(d) => navigation.navigate('DebtDetail', { debtId: d.debtId, name: d.name })}
            />
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

const STRATEGY_LABEL: Record<string, { name: string; plain: string }> = {
  avalanche: { name: 'avalancha', plain: 'la más cara primero' },
  snowball: { name: 'bola de nieve', plain: 'la más pequeña primero' },
};

/** P2 — El orden de ataque DEL MOTOR (FIN-007); con 1 deuda muta a la jugada
 *  de abono; con 0 o sin comparación válida, no existe (§29.1). */
function AttackPlan({
  summary,
  debts,
  onDebt,
}: {
  summary: DebtsSummary | null;
  debts: Debt[];
  onDebt: (d: { debtId: string; name: string }) => void;
}) {
  const rootNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const strategy = summary?.strategy ?? null;

  if (!strategy) {
    // Degradación declarada (ARQ P2): con UNA deuda la decisión no es el orden
    // sino el abono — puente a la casa del abono real (el detalle).
    if (debts.length === 1) {
      const d = debts[0];
      return (
        <Card style={{ borderColor: colors.primary, borderWidth: 2 }}>
          <Text style={{ fontWeight: '700', fontSize: 15, color: colors.text }}>
            <Ico name="star" color={colors.accent} /> Tu jugada con esta deuda
          </Text>
          <Text style={{ color: colors.textMuted, marginTop: 4, fontSize: 13, lineHeight: 19 }}>
            Cada peso extra que le abones a {d.name} te ahorra intereses y adelanta tu fecha de
            libertad.
          </Text>
          <Pressable
            onPress={() => onDebt({ debtId: d.id, name: d.name })}
            style={{ marginTop: spacing.sm }}
          >
            <Text style={{ color: colors.primary, fontWeight: '700' }}><Ico name="cash-outline" color={colors.primary} /> Abonar o simularlo →</Text>
          </Pressable>
        </Card>
      );
    }
    return null;
  }

  const rec = STRATEGY_LABEL[strategy.recommended];
  const other = STRATEGY_LABEL[strategy.recommended === 'avalanche' ? 'snowball' : 'avalanche'];
  // DEC-0022 §5.2: la cifra ES la diferencia entre estrategias — el copy lo dice
  // tal cual, y con diferencia ~0 no se muestra "$0".
  const showSavings = strategy.interestDifference >= 1000;

  return (
    <Card style={{ borderColor: colors.primary, borderWidth: 2 }}>
      <Text style={{ fontWeight: '700', fontSize: 15, color: colors.text }}>
        <Ico name="star" color={colors.accent} /> Tu orden de ataque — {rec.name}
      </Text>
      <Text style={{ color: colors.textMuted, marginTop: 4, fontSize: 13, lineHeight: 19 }}>
        {showSavings
          ? `Pagar ${rec.plain} (${rec.name}) en vez de ${other.plain} (${other.name}) te ahorra ${formatMoney(strategy.interestDifference)} en intereses.`
          : `Con tus deudas de hoy, ambos órdenes cuestan casi lo mismo — este es el recomendado (${rec.plain}).`}
      </Text>
      <View style={{ marginTop: spacing.sm, gap: 6 }}>
        {strategy.attackOrder.map((d, i) => (
          <Pressable key={d.debtId} onPress={() => onDebt(d)}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text, flex: 1 }} numberOfLines={1}>
                {i === 0 ? <Ico name="locate-outline" color={colors.primary} /> : null}{i === 0 ? ' ' : '    '}
                {i + 1}º {d.name}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                {formatPercent(d.ratePct)} {d.rateBasis}
              </Text>
            </Row>
          </Pressable>
        ))}
      </View>
      <Pressable
        onPress={() =>
          // FIN-026 P2: llega con el contrato del bloque (extraBudget 0 = piso,
          // DEC-0022 §5.3) — la MISMA cifra, explicada en pantalla.
          rootNav.navigate('Simulator', {
            scenario: 'estrategia_deudas',
            params: { extraBudget: 0 },
          })
        }
        style={{ marginTop: spacing.sm }}
      >
        <Text style={{ color: colors.primary, fontWeight: '700' }}><Ico name="flask-outline" color={colors.primary} /> Verlo en el simulador →</Text>
      </Pressable>
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
