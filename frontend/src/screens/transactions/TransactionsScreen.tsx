import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { RouteProp, useFocusEffect, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Chip, EmptyState, ErrorState, Row, Skeleton } from '../../components/ui';
import { CategoryGlyph } from '../../components/CategoryGlyph';
import { colors, radius, spacing, type } from '../../theme/colors';
import { formatLocalDate, formatMoney } from '../../utils/format';
import { transactionsApi } from '../../api/endpoints';
import { Transaction, TxKind, toNumber } from '../../api/types';
import { RootStackParamList } from '../../navigation/types';
import { EditTransactionModal, EditableMovement } from './EditTransactionModal';

const PAGE = 40;

const KIND_META: Record<string, { sign: string; color: string; label: string }> = {
  ingreso: { sign: '+', color: colors.success, label: 'Ingresos' },
  gasto: { sign: '-', color: colors.danger, label: 'Gastos' },
  pago_deuda: { sign: '-', color: colors.primary, label: 'Pagos de deuda' },
  transferencia: { sign: '', color: colors.textMuted, label: 'Transferencias' },
};

/**
 * FIN-038 · Historial de movimientos: lo que Inicio prometía con "ver el detalle
 * completo" y no existía. Lista infinita (cursor `before`), filtro por tipo,
 * búsqueda por nota y totales del resultado. Cada fila abre la edición rápida de
 * FIN-028. Solo lectura de la fuente única del backend — no calcula nada nuevo.
 */
export function TransactionsScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'Transactions'>>();
  const [kind, setKind] = useState<TxKind | undefined>(route.params?.kind as TxKind | undefined);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [end, setEnd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditableMovement | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => clearTimeout(id);
  }, [q]);

  const baseQuery = useMemo(
    () => ({ kind, q: debouncedQ || undefined, debtId: route.params?.debtId, categoryId: route.params?.categoryId, limit: PAGE }),
    [kind, debouncedQ, route.params?.debtId, route.params?.categoryId],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await transactionsApi.list(baseQuery);
      setItems(rows);
      setEnd(rows.length < PAGE);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [baseQuery]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const loadMore = async () => {
    if (more || end || items.length === 0) return;
    setMore(true);
    try {
      const last = items[items.length - 1];
      const rows = await transactionsApi.list({ ...baseQuery, before: last.occurredAt });
      setItems((prev) => [...prev, ...rows.filter((r) => !prev.some((p) => p.id === r.id))]);
      if (rows.length < PAGE) setEnd(true);
    } catch {
      /* el pie muestra reintento implícito al volver a scrollear */
    } finally {
      setMore(false);
    }
  };

  const totals = useMemo(() => {
    let inc = 0;
    let out = 0;
    for (const t of items) {
      const a = toNumber(t.amount);
      if (t.kind === 'ingreso') inc += a;
      else if (t.kind === 'gasto' || t.kind === 'pago_deuda') out += a;
    }
    return { inc, out };
  }, [items]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ padding: spacing.md, paddingBottom: 0 }}>
        <Row
          style={{
            backgroundColor: colors.surface,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: spacing.md,
            gap: spacing.sm,
            minHeight: 44,
          }}
        >
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Buscar por nota (arriendo, mercado…)"
            placeholderTextColor={colors.textFaint}
            accessibilityLabel="Buscar movimientos"
            style={{ flex: 1, color: colors.text, ...type.body, paddingVertical: 10 }}
          />
          {q ? (
            <Pressable onPress={() => setQ('')} accessibilityLabel="Borrar búsqueda" hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </Row>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginVertical: spacing.sm }}>
          <Chip label="Todos" active={!kind} onPress={() => setKind(undefined)} />
          {(['gasto', 'ingreso', 'pago_deuda'] as TxKind[]).map((k) => (
            <Chip key={k} label={KIND_META[k].label} active={kind === k} onPress={() => setKind(kind === k ? undefined : k)} />
          ))}
        </View>
        {items.length > 0 ? (
          <Text style={{ color: colors.textMuted, ...type.small, marginBottom: spacing.sm }}>
            {items.length}
            {end ? '' : '+'} movimientos · entró {formatMoney(totals.inc)} · salió {formatMoney(totals.out)}
          </Text>
        ) : null}
      </View>

      {loading ? (
        <View style={{ padding: spacing.md }}>
          <Skeleton lines={2} />
          <Skeleton lines={2} />
          <Skeleton lines={2} />
        </View>
      ) : error ? (
        <View style={{ padding: spacing.md }}>
          <ErrorState message={error} onRetry={() => void load()} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ padding: spacing.md, paddingTop: 0 }}
          onEndReached={() => void loadMore()}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title={debouncedQ || kind ? 'Nada con ese filtro' : 'Aún no hay movimientos'}
              body={debouncedQ || kind ? 'Prueba con otra palabra o quita el filtro.' : 'Registra tu primer gasto o ingreso desde el botón central.'}
            />
          }
          ListFooterComponent={
            more ? <Text style={{ color: colors.textMuted, textAlign: 'center', ...type.small }}>Cargando más…</Text> : null
          }
          renderItem={({ item: t }) => {
            const meta = KIND_META[t.kind] ?? KIND_META.transferencia;
            return (
              <Pressable
                onPress={() => setEditing({ id: t.id, kind: t.kind, amount: toNumber(t.amount), occurredAt: t.occurredAt, note: t.note })}
                accessibilityRole="button"
                accessibilityLabel={`${t.note || t.category?.name || t.debt?.name || t.kind}, ${meta.sign}${formatMoney(toNumber(t.amount))}`}
              >
                <Card style={{ paddingVertical: spacing.sm, marginBottom: spacing.sm }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Row style={{ gap: spacing.sm, flex: 1 }}>
                      <CategoryGlyph emoji={t.category?.icon} kind={t.kind} color={t.category?.color} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, ...type.body, fontWeight: '600' }} numberOfLines={1}>
                          {t.note || t.category?.name || t.debt?.name || meta.label}
                        </Text>
                        <Text style={{ color: colors.textMuted, ...type.small }}>
                          {formatLocalDate(t.occurredAt)}
                          {t.debt?.name && t.note ? ` · ${t.debt.name}` : ''}
                          {t.source && t.source !== 'app' ? ` · ${t.source}` : ''}
                        </Text>
                      </View>
                    </Row>
                    <Text style={{ color: meta.color, ...type.body, fontWeight: '800' }}>
                      {meta.sign}
                      {formatMoney(toNumber(t.amount))}
                    </Text>
                  </Row>
                </Card>
              </Pressable>
            );
          }}
        />
      )}

      <EditTransactionModal movement={editing} onClose={() => setEditing(null)} onChanged={() => void load()} />
    </View>
  );
}
