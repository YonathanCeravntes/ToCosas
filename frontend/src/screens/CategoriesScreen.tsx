import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Card, EmptyState, ErrorState, FormScroll, Ico, ProgressBar, Row, Skeleton } from '../components/ui';
import { CategoryGlyph } from '../components/CategoryGlyph';
import { colors, spacing, type } from '../theme/colors';
import { formatMoney } from '../utils/format';
import { dashboardApi } from '../api/endpoints';
import { useApi } from '../utils/useApi';

/**
 * FIN-056 (boceto 3) · "En qué se te va", completo. Inicio muestra tres categorías y
 * "Ver todo" abría Mi mes, que no tiene categorías (BT-029). Esta pantalla lista las del
 * ciclo con su barra y, al tocar una, abre sus movimientos. Cero cálculos: las cifras
 * son las mismas que ya trae Inicio (`/dashboard/home`, §32).
 */
export function CategoriesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data, loading, error, reload } = useApi(() => dashboardApi.home(), []);
  useFocusEffect(React.useCallback(() => { void reload(); }, [reload]));

  if (error && !data) return <FormScroll><ErrorState message={error} onRetry={() => void reload()} /></FormScroll>;
  if (!data) return <FormScroll><Skeleton hero lines={2} /><Skeleton lines={5} /></FormScroll>;

  const cats = data.expense.byCategory;
  const total = data.expense.total;
  const uncategorized = cats.find((c) => c.id == null || c.name === 'Sin categoría');

  return (
    <FormScroll onRefresh={reload}>
      <Card>
        <Text style={{ color: colors.textMuted, ...type.small }}>Gastos de este ciclo · {data.period.label}</Text>
        <Text style={{ color: colors.text, fontSize: 30, fontWeight: '800', marginTop: 2 }}>{loading && !total ? '…' : formatMoney(total)}</Text>
        <Text style={{ color: colors.textFaint, ...type.small }}>
          {formatMoney(data.expense.fixed)} fijos del mes · {formatMoney(data.expense.variable)} del día a día
        </Text>
        {cats.length > 1 ? (
          <View style={{ flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', gap: 2, marginTop: spacing.sm }}>
            {cats.map((c, i) => (
              <View key={`${c.id ?? 'sin'}-${i}`} style={{ flex: Math.max(c.amount, 1), backgroundColor: c.color }} />
            ))}
          </View>
        ) : null}
      </Card>

      {cats.length === 0 ? (
        <EmptyState icon="pie-chart-outline" title="Aún no hay gastos este ciclo" body="Registra el primero desde el botón central y aquí verás en qué se te va." />
      ) : (
        <Card style={{ paddingVertical: 0 }}>
          {cats.map((c, i) => (
            <Pressable
              key={`${c.id ?? 'sin'}-${i}`}
              onPress={() => navigation.navigate('Transactions', { kind: 'gasto', ...(c.id ? { categoryId: c.id } : {}) })}
              accessibilityRole="button"
              accessibilityLabel={`${c.name}: ${formatMoney(c.amount)}, ${c.percent} por ciento. Ver movimientos`}
              style={{ paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.surfaceAlt }}
            >
              <Row style={{ gap: spacing.sm, alignItems: 'center' }}>
                <CategoryGlyph emoji={c.icon} kind="gasto" color={c.color} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>{c.name}</Text>
                    <Text style={{ color: colors.text, fontWeight: '800' }}>{formatMoney(c.amount)}</Text>
                  </Row>
                  <ProgressBar value={c.percent / 100} color={c.color} height={6} label={`${c.name} ${c.percent}%`} />
                  <Text style={{ color: c.id == null ? colors.warningDeep : colors.textMuted, ...type.small, fontWeight: c.id == null ? '700' : '400' }}>
                    {c.percent} % de tus gastos{c.id == null ? ' · toca para organizarlos' : ''}
                  </Text>
                </View>
                <Ico name="chevron-forward" size={16} color={colors.textFaint} />
              </Row>
            </Pressable>
          ))}
        </Card>
      )}
      <Text style={{ color: colors.textFaint, ...type.caption, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.lg }}>
        Toca una categoría para ver sus movimientos.{uncategorized ? ' En cada movimiento puedes cambiar la categoría; Millo aprende para la próxima.' : ''} Las cuotas de deudas están en Mis deudas.
      </Text>
    </FormScroll>
  );
}
