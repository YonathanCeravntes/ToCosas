import React from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Button, Card, Row, Screen } from '../../components/ui';
import { colors, spacing } from '../../theme/colors';
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

  return (
    <Screen>
      <FlatList
        data={data ?? []}
        keyExtractor={(d) => d.id}
        refreshing={loading}
        onRefresh={() => {
          void reload();
          void reloadSummary();
        }}
        ListHeaderComponent={
          <View>
            {error ? <Text style={{ color: colors.danger, marginBottom: 8 }}>{error}</Text> : null}
            <FrontHero summary={summary.data} debts={active} />
            <AttackPlan
              summary={summary.data}
              debts={active}
              onDebt={(d) => navigation.navigate('DebtDetail', { debtId: d.debtId, name: d.name })}
            />
            <Button title="+ Nueva deuda" onPress={() => navigation.navigate('AddDebt')} />
          </View>
        }
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
      />
    </Screen>
  );
}

/** P1 — El frente completo: cuánto debo, qué me cuesta al mes y cuándo salgo. */
function FrontHero({ summary, debts }: { summary: DebtsSummary | null; debts: Debt[] }) {
  if (!summary || summary.debtsCount === 0) return null;
  // Fecha de libertad TOTAL = máx payoffDate de las amortizaciones existentes
  // (misma fuente del detalle — ARQ-0022 P1); sin proyecciones no se muestra.
  const freeDate = debts
    .map((d) => d.projection?.payoffDate ?? null)
    .filter((p): p is string => p !== null)
    .sort()
    .pop();
  return (
    <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary }}>
      <Text style={{ color: colors.textInverse, opacity: 0.85 }}>
        Debes · {summary.debtsCount} deuda{summary.debtsCount === 1 ? '' : 's'}
      </Text>
      <Text style={{ color: colors.textInverse, fontSize: 32, fontWeight: '800' }}>
        {formatMoney(summary.totalDebt)}
      </Text>
      {/* "Tus cuotas suman": contrato programado — NUNCA "pagas al mes"
          (desembolso real con seguros aparte = FIN-023; pagado del ciclo = Inicio). */}
      <Text style={{ color: colors.textInverse, opacity: 0.85, marginTop: 4 }}>
        Tus cuotas suman {formatMoney(summary.monthlyPaymentsTotal)} al mes
      </Text>
      {freeDate ? (
        <Text style={{ color: colors.textInverse, fontWeight: '700', marginTop: 6 }}>
          🏁 Libre de todo: {formatDate(freeDate)}
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
            ⭐ Tu jugada con esta deuda
          </Text>
          <Text style={{ color: colors.textMuted, marginTop: 4, fontSize: 13, lineHeight: 19 }}>
            Cada peso extra que le abones a {d.name} te ahorra intereses y adelanta tu fecha de
            libertad.
          </Text>
          <Pressable
            onPress={() => onDebt({ debtId: d.id, name: d.name })}
            style={{ marginTop: spacing.sm }}
          >
            <Text style={{ color: colors.primary, fontWeight: '700' }}>💸 Abonar o simularlo →</Text>
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
        ⭐ Tu orden de ataque — {rec.name}
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
                {i === 0 ? '🎯 ' : '     '}
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
        onPress={() => rootNav.navigate('Simulator', { scenario: 'estrategia_deudas' })}
        style={{ marginTop: spacing.sm }}
      >
        <Text style={{ color: colors.primary, fontWeight: '700' }}>🧪 Verlo en el simulador →</Text>
      </Pressable>
    </Card>
  );
}

/** P3 — La tarjeta con el costo en pesos y la fecha que importa este mes. */
function DebtCard({ debt }: { debt: Debt }) {
  const remaining = debt.projection?.totalInterest ?? null;
  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 }} numberOfLines={1}>
          {debt.name}
        </Text>
        <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>
          {formatMoney(toNumber(debt.currentBalance))}
        </Text>
      </Row>
      <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
        <Text style={{ color: colors.textMuted, flex: 1, marginRight: 8 }}>
          {formatPercent(toNumber(debt.interestRate))} {debt.rateBasis} · Cuota{' '}
          {formatMoney(toNumber(debt.monthlyPayment))}
        </Text>
        {/* P4: fecha visible con etiqueta NEUTRA si ya pasó — el dominio mora es
            FIN-024, aquí no se juzga ni se detecta nada. */}
        {debt.nextDueDate ? (
          <Text style={{ color: colors.textMuted }}>
            vence {formatDate(debt.nextDueDate)}
            {new Date(debt.nextDueDate) < new Date() ? ' (ya pasó)' : ''}
          </Text>
        ) : null}
      </Row>
      {remaining !== null && remaining > 0 ? (
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 6 }}>
          Intereses restantes: {formatMoney(remaining)}
        </Text>
      ) : null}
      {debt.projection?.payoffDate ? (
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
          🏁 Terminas de pagar el {formatDate(debt.projection.payoffDate)}
        </Text>
      ) : null}
    </Card>
  );
}
