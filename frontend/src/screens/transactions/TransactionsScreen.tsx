import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, SectionList, Text, TextInput, View } from 'react-native';
import { RouteProp, useFocusEffect, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Chip, EmptyState, ErrorState, GroupLabel, Row, Skeleton } from '../../components/ui';
import { CategoryGlyph } from '../../components/CategoryGlyph';
import { colors, radius, spacing, type } from '../../theme/colors';
import { formatMoney } from '../../utils/format';
import { transactionsApi } from '../../api/endpoints';
import { Transaction, TxKind, toNumber } from '../../api/types';
import { RootStackParamList } from '../../navigation/types';
import { EditTransactionModal, EditableMovement } from './EditTransactionModal';

const PAGE = 40;

// Movimientos · opción 1 (Fundador, 2026-09-29): mismo lenguaje de color de Mis
// deudas — lo que sale en texto oscuro, lo que entra en verde (sin rojo por gastar).
const KIND_META: Record<string, { sign: string; color: string; label: string }> = {
  ingreso: { sign: '+', color: colors.primary, label: 'Ingresos' },
  gasto: { sign: '−', color: colors.text, label: 'Gastos' },
  pago_deuda: { sign: '−', color: colors.text, label: 'Pagos de deuda' },
  transferencia: { sign: '', color: colors.textMuted, label: 'Transferencias' },
};

const SOURCE_LABEL: Record<string, string> = { telegram: 'Telegram', whatsapp: 'WhatsApp', bot: 'el bot' };

/** Clave de día LOCAL ("2026-09-28") y su título ("DOMINGO 28 SEP" / "HOY" / "AYER"). */
function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function dayTitle(key: string): string {
  const today = dayKey(new Date().toISOString());
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (key === today) return 'Hoy';
  if (key === dayKey(y.toISOString())) return 'Ayer';
  const [yy, mm, dd] = key.split('-').map(Number);
  const d = new Date(yy, mm - 1, dd);
  const sameYear = yy === new Date().getFullYear();
  return d
    .toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) })
    .replace(/\./g, '')
    .replace(',', '');
}

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

  // DEC-0040 §8: deslizar hacia abajo para actualizar (mismo gesto que Inicio y las
  // pantallas con FormScroll). `load` ya pone `loading`; el control usa su propio flag
  // para no mostrar el esqueleto encima de la lista.
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

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

  const sections = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of items) {
      const k = dayKey(t.occurredAt);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(t);
    }
    return [...map.entries()].map(([key, data]) => {
      let net = 0;
      for (const t of data) {
        const a = toNumber(t.amount);
        if (t.kind === 'ingreso') net += a;
        else if (t.kind === 'gasto' || t.kind === 'pago_deuda') net -= a;
      }
      return { key, title: dayTitle(key), net, data };
    });
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
            <Chip key={k} label={k === 'pago_deuda' ? 'Deudas' : KIND_META[k].label} active={kind === k} onPress={() => setKind(kind === k ? undefined : k)} />
          ))}
        </View>
        {items.length > 0 ? (
          <Row style={{ gap: spacing.md, alignItems: 'stretch', marginBottom: spacing.xs }}>
            <Card style={{ flex: 1, marginBottom: 0, paddingVertical: spacing.sm }}>
              <Text style={{ color: colors.textMuted, ...type.small }}>Entró</Text>
              <Text style={{ color: colors.primary, fontSize: 18, fontWeight: '800' }}>{formatMoney(totals.inc)}</Text>
            </Card>
            <Card style={{ flex: 1, marginBottom: 0, paddingVertical: spacing.sm }}>
              <Text style={{ color: colors.textMuted, ...type.small }}>Salió</Text>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{formatMoney(totals.out)}</Text>
            </Card>
          </Row>
        ) : null}
        {items.length > 0 && !end ? (
          <Text style={{ color: colors.textFaint, ...type.caption }}>Totales de los {items.length} movimientos cargados</Text>
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
        <SectionList
          sections={sections}
          keyExtractor={(t) => t.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ padding: spacing.md, paddingTop: 0 }}
          onEndReached={() => void loadMore()}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={colors.primary} colors={[colors.primary]} />}
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title={debouncedQ || kind ? 'Nada con ese filtro' : 'Aún no hay movimientos'}
              body={debouncedQ || kind ? 'Prueba con otra palabra o quita el filtro.' : 'Registra tu primer gasto o ingreso desde el botón central.'}
            />
          }
          renderSectionHeader={({ section }) => (
            <Row style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
              <GroupLabel title={section.title} />
              <Text style={{ color: colors.textMuted, ...type.caption }}>
                {section.net > 0 ? '+' : section.net < 0 ? '−' : ''}
                {formatMoney(Math.abs(section.net))}
              </Text>
            </Row>
          )}
          ListFooterComponent={
            more ? (
              <Text style={{ color: colors.textMuted, textAlign: 'center', ...type.small, marginTop: spacing.md }}>Cargando más…</Text>
            ) : items.length > 0 ? (
              <Text style={{ color: colors.textFaint, textAlign: 'center', ...type.caption, marginTop: spacing.md }}>
                Toca un movimiento para editarlo o borrarlo.
              </Text>
            ) : null
          }
          renderItem={({ item: t, index, section }) => {
            const meta = KIND_META[t.kind] ?? KIND_META.transferencia;
            const first = index === 0;
            const last = index === section.data.length - 1;
            const title = t.note || t.category?.name || t.debt?.name || meta.label;
            const detail = [
              t.category?.name && t.note ? t.category.name : null,
              t.debt?.name && t.note ? t.debt.name : null,
              // FIN-047: los gastos fijos se registran solos.
              t.fixedItemId && t.source === 'system' ? 'automático (gasto fijo)' : t.source && SOURCE_LABEL[t.source] ? `por ${SOURCE_LABEL[t.source]}` : null,
            ].filter(Boolean).join(' · ');
            return (
              <Pressable
                onPress={() => setEditing({ id: t.id, kind: t.kind, amount: toNumber(t.amount), occurredAt: t.occurredAt, note: t.note })}
                accessibilityRole="button"
                accessibilityLabel={`${title}, ${meta.sign}${formatMoney(toNumber(t.amount))}`}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
                  borderColor: colors.border,
                  borderLeftWidth: 1,
                  borderRightWidth: 1,
                  borderTopWidth: first ? 1 : 0,
                  borderBottomWidth: last ? 1 : 0,
                  borderTopLeftRadius: first ? radius.md : 0,
                  borderTopRightRadius: first ? radius.md : 0,
                  borderBottomLeftRadius: last ? radius.md : 0,
                  borderBottomRightRadius: last ? radius.md : 0,
                })}
              >
                <Row
                  style={{
                    gap: spacing.sm,
                    paddingVertical: 12,
                    marginHorizontal: spacing.md,
                    borderTopWidth: first ? 0 : 1,
                    borderTopColor: colors.surfaceAlt,
                  }}
                >
                  <CategoryGlyph emoji={t.category?.icon} kind={t.kind} color={t.category?.color} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, ...type.body, fontWeight: '700' }} numberOfLines={1}>
                      {title}
                    </Text>
                    {detail ? (
                      <Text style={{ color: colors.textMuted, ...type.small }} numberOfLines={1}>
                        {detail}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={{ color: meta.color, ...type.body, fontWeight: '800' }}>
                    {meta.sign}
                    {formatMoney(toNumber(t.amount))}
                  </Text>
                </Row>
              </Pressable>
            );
          }}
        />
      )}

      <EditTransactionModal movement={editing} onClose={() => setEditing(null)} onChanged={() => void load()} />
    </View>
  );
}
