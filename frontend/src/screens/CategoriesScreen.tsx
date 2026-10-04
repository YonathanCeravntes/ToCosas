import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../components/AppText';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { Card, EmptyState, ErrorState, FormScroll, Ico, Money, ProgressBar, Row, SegmentBar, Skeleton } from '../components/ui';
import { CategoryGlyph, categoryShade, incomeSourceColors } from '../components/CategoryGlyph';
import { colors, radius, spacing, type } from '../theme/colors';
import { formatMoney } from '../utils/format';
import { dashboardApi } from '../api/endpoints';
import { HomeDashboard, HomeDebt, HomeIncomeSource } from '../api/types';
import { useApi } from '../utils/useApi';

type Tab = 'gastos' | 'ingresos';

/**
 * FIN-056 (boceto 3) · "En qué se te va", completo. Inicio muestra tres categorías y
 * "Ver todo" abría Mi mes, que no tiene categorías (BT-029). Esta pantalla lista las del
 * ciclo con su barra y, al tocar una, abre sus movimientos. Cero cálculos: las cifras
 * son las mismas que ya trae Inicio (`/dashboard/home`, §32).
 *
 * FIN-057 · Dos pestañas: Gastos (con la fila de deudas abierta por deuda) e Ingresos
 * ("Cómo te llega la plata", una fila por fuente).
 */
export function CategoriesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Categories'>>();
  const [tab, setTab] = useState<Tab>(route.params?.tab ?? 'gastos');
  const { data, loading, error, reload } = useApi(() => dashboardApi.home(), [], { cacheKey: 'home' });
  useFocusEffect(React.useCallback(() => { void reload(); }, [reload]));
  useEffect(() => {
    navigation.setOptions({ title: tab === 'gastos' ? 'En qué se te va' : 'Cómo te llega la plata' });
  }, [navigation, tab]);

  if (error && !data) return <FormScroll><ErrorState message={error} onRetry={() => void reload()} /></FormScroll>;
  if (!data) return <FormScroll><Skeleton hero lines={2} /><Skeleton lines={5} /></FormScroll>;

  const hasIncome = (data.income.sources?.length ?? 0) > 0 || data.income.total > 0;

  return (
    <FormScroll onRefresh={reload}>
      <View style={{ flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 3, marginBottom: spacing.sm }} accessibilityRole="tablist">
        {(['gastos', 'ingresos'] as Tab[]).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t }}
            style={{ flex: 1, paddingVertical: 8, borderRadius: radius.sm, backgroundColor: tab === t ? colors.surface : 'transparent', alignItems: 'center' }}
          >
            <Text style={{ color: tab === t ? colors.text : colors.textMuted, fontWeight: '600', ...type.body }}>{t === 'gastos' ? 'Gastos' : 'Ingresos'}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'gastos' ? (
        <ExpensesTab data={data} loading={loading} navigation={navigation} />
      ) : hasIncome ? (
        <IncomeTab data={data} loading={loading} navigation={navigation} />
      ) : (
        <EmptyState icon="wallet-outline" title="Aún no hay ingresos este ciclo" body="Cuando registres un ingreso, o declares tu salario en Mi mes, aquí verás de dónde te llega la plata." />
      )}
    </FormScroll>
  );
}

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Home = HomeDashboard;

function ExpensesTab({ data, loading, navigation }: { data: Home; loading: boolean; navigation: Nav }) {
  const cats = data.expense.byCategory;
  const debt = data.debt;
  const showDebt = !!debt && (debt.paid > 0 || debt.committed > 0);
  // FIN-057 (decisión 2, ajuste del Fundador): la base del porcentaje es gastos + cuotas del
  // mes (la comprometida aunque no haya llegado su fecha, o lo pagado si fue más).
  const debtMonth = debt ? debt.amount ?? Math.max(debt.committed, debt.paid) : 0;
  const total = data.expense.totalWithDebt ?? data.expense.total + debtMonth;
  const uncategorized = cats.find((c) => c.id == null || c.name === 'Sin categoría');

  return (
    <>
      <Card>
        <Text style={{ color: colors.textMuted, ...type.small }}>Sale de tu bolsillo este ciclo · {data.period.label}</Text>
        {loading && !total ? (
          <Text style={{ color: colors.text, fontSize: 34, fontWeight: '600', marginTop: 2 }}>…</Text>
        ) : (
          <Money value={total} size={34} style={{ marginTop: 2 }} />
        )}
        <Text style={{ color: colors.textFaint, ...type.small }}>
          {formatMoney(data.expense.fixed)} fijos del mes · {formatMoney(data.expense.variable)} del día a día
          {showDebt ? ` · ${formatMoney(debtMonth)} en cuotas` : ''}
        </Text>
        {cats.length + (showDebt ? 1 : 0) > 1 ? (
          <View style={{ marginTop: spacing.sm }}>
            <SegmentBar
              height={12}
              parts={[
                ...cats.map((c, i) => ({ key: `${c.id ?? 'sin'}-${i}`, label: c.name, value: c.amount, color: categoryShade(i, c.id == null) })),
                ...(showDebt ? [{ key: 'deudas', label: 'Cuotas de deudas', value: debtMonth, color: colors.debt }] : []),
              ]}
            />
          </View>
        ) : null}
      </Card>

      {cats.length === 0 && !showDebt ? (
        <EmptyState icon="pie-chart-outline" title="Aún no hay gastos este ciclo" body="Registra el primero desde el botón central y aquí verás en qué se te va." />
      ) : (
        <Card style={{ paddingVertical: 0 }}>
          {showDebt && debt ? <DebtRows debt={debt} first navigation={navigation} /> : null}
          {cats.map((c, i) => (
            <Pressable
              key={`${c.id ?? 'sin'}-${i}`}
              onPress={() => navigation.navigate('Transactions', { kind: 'gasto', ...(c.id ? { categoryId: c.id } : {}) })}
              accessibilityRole="button"
              accessibilityLabel={`${c.name}: ${formatMoney(c.amount)}, ${c.percent} por ciento. Ver movimientos`}
              style={{ paddingVertical: 12, borderTopWidth: i === 0 && !showDebt ? 0 : 1, borderTopColor: colors.surfaceAlt }}
            >
              <Row style={{ gap: spacing.sm, alignItems: 'center' }}>
                <CategoryGlyph emoji={c.icon} kind="gasto" />
                <View style={{ flex: 1, gap: 4 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Text style={{ color: colors.text, fontWeight: '600', flex: 1, marginRight: spacing.sm }} numberOfLines={1}>{c.name}</Text>
                    <Text style={{ color: colors.text, fontWeight: '600' }}>{formatMoney(c.amount)}</Text>
                  </Row>
                  <ProgressBar value={c.percent / 100} color={categoryShade(i, c.id == null)} track={colors.surfaceAlt} height={6} label={`${c.name} ${c.percent}%`} />
                  <Text style={{ color: c.id == null ? colors.warningDeep : colors.textMuted, ...type.small, fontWeight: c.id == null ? '600' : '400' }}>
                    {c.percent} % de lo que sale{c.id == null ? ' · toca para organizarlos' : ''}
                  </Text>
                </View>
                <Ico name="chevron-forward" size={16} color={colors.textFaint} />
              </Row>
            </Pressable>
          ))}
        </Card>
      )}
      <Text style={{ color: colors.textFaint, ...type.caption, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.lg }}>
        Toca una categoría para ver sus movimientos.{uncategorized ? ' En cada movimiento puedes cambiar la categoría; Millo aprende para la próxima.' : ''}
        {showDebt ? ' Las compras a cuotas con tarjeta aparecen aquí cuando pagas la cuota.' : ''}
      </Text>
    </>
  );
}

/**
 * FIN-057 · La fila de deudas abierta por deuda: "Tarjeta $420.000 · Crédito del carro $200.000".
 * Lleva la cuota del mes aunque no haya llegado su fecha (ajuste del Fundador); pagado aparte.
 */
function DebtRows({ debt, first, navigation }: { debt: HomeDebt; first: boolean; navigation: Nav }) {
  const go = (params?: unknown) => (navigation as unknown as { navigate: (name: string, params?: unknown) => void }).navigate('Debts', params ?? { screen: 'DebtsList' });
  const amount = debt.amount ?? Math.max(debt.committed, debt.paid);
  const shown = debt.byDebt.filter((d) => d.paid > 0 || d.committed > 0);
  const status =
    debt.remaining <= 0
      ? 'al día este mes'
      : debt.paid > 0
        ? `pagado ${formatMoney(debt.paid)} · faltan ${formatMoney(debt.remaining)}`
        : `aún sin pagar · vence${debt.nextDueDate ? ` el ${new Date(debt.nextDueDate).getUTCDate()}` : ' este mes'}`;
  return (
    <View style={{ paddingVertical: 12, borderTopWidth: first ? 0 : 1, borderTopColor: colors.surfaceAlt }}>
      <Pressable onPress={() => go()} accessibilityRole="button" accessibilityLabel={`Cuotas de deudas: ${formatMoney(amount)} este mes, ${debt.percent} por ciento, ${status}. Ver mis deudas`}>
        <Row style={{ gap: spacing.sm, alignItems: 'center' }}>
          <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: colors.debtSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="card-outline" size={18} color={colors.debt} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>Cuotas de deudas</Text>
              <Text style={{ color: colors.text, fontWeight: '600' }}>{formatMoney(amount)}</Text>
            </Row>
            <ProgressBar value={debt.percent / 100} color={colors.debt} track={colors.surfaceAlt} height={6} label={`Cuotas de deudas ${debt.percent}%`} />
            <Text style={{ color: colors.debt, ...type.small, fontWeight: '600' }}>
              {debt.percent} % de lo que sale · {status}
            </Text>
          </View>
          <Ico name="chevron-forward" size={16} color={colors.textFaint} />
        </Row>
      </Pressable>
      {shown.length > 0 ? (
        <View style={{ marginLeft: 42, marginTop: spacing.xs, gap: 6 }}>
          {shown.map((d) => {
            const monthly = d.amount ?? Math.max(d.committed, d.paid);
            const detail = d.paid <= 0 ? 'sin pagar' : d.paid >= d.committed ? 'pagada' : `pagado ${formatMoney(d.paid)}`;
            return (
              <Pressable
                key={d.debtId}
                onPress={() => go({ screen: 'DebtDetail', initial: false, params: { debtId: d.debtId, name: d.name } })}
                accessibilityRole="button"
                accessibilityLabel={`${d.name}: cuota de ${formatMoney(monthly)}, ${detail}`}
              >
                <Row style={{ justifyContent: 'space-between', gap: spacing.sm }}>
                  <Text style={{ color: colors.textMuted, ...type.small, flex: 1 }} numberOfLines={1}>{d.name}</Text>
                  <Text style={{ color: colors.textMuted, ...type.small }}>
                    {formatMoney(monthly)} · {detail}
                  </Text>
                </Row>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function IncomeTab({ data, loading, navigation }: { data: Home; loading: boolean; navigation: Nav }) {
  const sources: HomeIncomeSource[] = data.income.sources ?? [];
  const total = sources.reduce((a, s) => a + s.amount, 0) || data.income.total;
  const extra = sources.filter((s) => s.kind !== 'fijo').reduce((a, s) => a + s.amount, 0);
  const fixed = sources.find((s) => s.kind === 'fijo')?.amount ?? 0;
  const tints = incomeSourceColors(sources);

  return (
    <>
      <Card>
        <Text style={{ color: colors.textMuted, ...type.small }}>Te entró este ciclo · {data.period.label}</Text>
        {loading && !total ? (
          <Text style={{ color: colors.primary, fontSize: 34, fontWeight: '600', marginTop: 2 }}>…</Text>
        ) : (
          <Money value={total} size={34} color={colors.primary} style={{ marginTop: 2 }} />
        )}
        <Text style={{ color: colors.textFaint, ...type.small }}>
          {fixed > 0 ? `${formatMoney(fixed)} de salario` : ''}{fixed > 0 && extra > 0 ? ' · ' : ''}{extra > 0 ? `${formatMoney(extra)} extra` : ''}
        </Text>
        {sources.length > 1 ? (
          <View style={{ marginTop: spacing.sm }}>
            <SegmentBar height={12} parts={sources.map((s, i) => ({ key: s.id, label: s.name, value: s.amount, color: tints[i] }))} />
          </View>
        ) : null}
      </Card>

      {sources.length === 0 ? (
        <EmptyState icon="wallet-outline" title="Aún no hay ingresos este ciclo" body="Cuando registres un ingreso, o declares tu salario en Mi mes, aquí verás de dónde te llega la plata." />
      ) : (
        <Card style={{ paddingVertical: 0 }}>
          {sources.map((s, i) => {
            const detail: string[] = [];
            if (s.kind === 'fijo') detail.push('fijo, el que declaraste en Mi mes');
            else if (s.count > 0) detail.push(`${s.count} ${s.count === 1 ? 'vez' : 'veces'}${s.count > 1 ? ` · unos ${formatMoney(s.amount / s.count)} cada una` : ''}`);
            if (s.kind !== 'fijo' && s.previous > 0) detail.push(`el ciclo pasado ${formatMoney(s.previous)}`);
            if (s.id === 'sin') detail.push('toca para organizarlos');
            return (
              <Pressable
                key={s.id}
                onPress={() =>
                  s.kind === 'fijo'
                    ? navigation.navigate('Budget')
                    : navigation.navigate('Transactions', { kind: 'ingreso', ...(s.id !== 'sin' ? { categoryId: s.id } : {}) })
                }
                accessibilityRole="button"
                accessibilityLabel={`${s.name}: ${formatMoney(s.amount)}, ${s.percent} por ciento. ${s.kind === 'fijo' ? 'Abrir Mi mes' : 'Ver movimientos'}`}
                style={{ paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.surfaceAlt }}
              >
                <Row style={{ gap: spacing.sm, alignItems: 'center' }}>
                  <CategoryGlyph emoji={s.icon} kind="ingreso" />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Text style={{ color: colors.text, fontWeight: '600', flex: 1, marginRight: spacing.sm }} numberOfLines={1}>{s.name}</Text>
                      <Text style={{ color: colors.text, fontWeight: '600' }}>{formatMoney(s.amount)}</Text>
                    </Row>
                    <ProgressBar value={s.percent / 100} color={tints[i]} track={colors.surfaceAlt} height={6} label={`${s.name} ${s.percent}%`} />
                    <Text style={{ color: s.id === 'sin' ? colors.warningDeep : colors.textMuted, ...type.small, fontWeight: s.id === 'sin' ? '600' : '400' }}>
                      {s.percent} % de lo que te entró{detail.length ? ` · ${detail.join(' · ')}` : ''}
                    </Text>
                  </View>
                  <Ico name="chevron-forward" size={16} color={colors.textFaint} />
                </Row>
              </Pressable>
            );
          })}
        </Card>
      )}
      <Text style={{ color: colors.textFaint, ...type.caption, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.lg }}>
        El salario es el que declaraste en Mi mes (o lo que registraste como Salario, si fue más). Lo extra cuenta en "Te queda" solo si tiene su categoría: Plataformas, Ventas, Freelance…
      </Text>
    </>
  );
}
