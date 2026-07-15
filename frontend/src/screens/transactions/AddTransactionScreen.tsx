import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Button, Card, Field } from '../../components/ui';
import { colors, radius, spacing } from '../../theme/colors';
import { Category, TxKind } from '../../api/types';
import { categoriesApi } from '../../api/endpoints';
import { transactionsRepo } from '../../offline/transactionsRepo';
import { runSync } from '../../offline/syncEngine';
import { formatLocalDate } from '../../utils/format';

const KINDS: Array<{ key: TxKind; label: string; emoji: string }> = [
  { key: 'gasto', label: 'Gasto', emoji: '🛒' },
  { key: 'ingreso', label: 'Ingreso', emoji: '💵' },
  { key: 'pago_deuda', label: 'Pago deuda', emoji: '💳' },
];

export function AddTransactionScreen() {
  const [kind, setKind] = useState<TxKind>('gasto');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [occurredAt, setOccurredAt] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Cargar categorías según el tipo elegido.
  useEffect(() => {
    let active = true;
    setSelectedCat(null);
    categoriesApi
      .list(kind)
      .then((cats) => {
        if (active) setCategories(cats);
      })
      .catch(() => {
        if (active) setCategories([]);
      });
    return () => {
      active = false;
    };
  }, [kind]);

  const amountPreview = useMemo(() => {
    const n = parseFloat(amount.replace(/[^\d.]/g, '')) || 0;
    return n ? '$' + Math.round(n).toLocaleString('es-CO') : '$0';
  }, [amount]);

  const onSubmit = async () => {
    const value = parseFloat(amount.replace(/[^\d.]/g, '')) || 0;
    if (!value) {
      setFeedback('Ingresa un monto válido.');
      return;
    }
    setLoading(true);
    setFeedback(null);
    try {
      await transactionsRepo.add({
        kind,
        amount: value,
        occurredAt: occurredAt.toISOString(),
        note: note || selectedCat?.name || undefined,
        categoryId: selectedCat?.id,
        categoryIcon: selectedCat?.icon ?? undefined,
      });
      setAmount('');
      setNote('');
      setSelectedCat(null);
      setOccurredAt(new Date());
      const result = await runSync();
      setFeedback(
        result.skipped
          ? '✅ Guardado. Se sincronizará al reconectar.'
          : '✅ ¡Registrado!',
      );
    } catch {
      setFeedback('✅ Guardado localmente. Se subirá al reconectar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md }}>
      {/* Monto grande, tipo calculadora */}
      <Card style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
        <Text style={{ color: colors.textMuted }}>Monto</Text>
        <Text style={{ fontSize: 36, fontWeight: '800', color: colors.text }}>{amountPreview}</Text>
      </Card>

      {/* Selector de tipo */}
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
        {KINDS.map((k) => (
          <Pressable
            key={k.key}
            onPress={() => setKind(k.key)}
            style={{
              flex: 1,
              padding: spacing.sm,
              borderRadius: radius.md,
              alignItems: 'center',
              backgroundColor: kind === k.key ? colors.primary : colors.surface,
              borderWidth: 1,
              borderColor: kind === k.key ? colors.primary : colors.border,
            }}
          >
            <Text style={{ fontSize: 20 }}>{k.emoji}</Text>
            <Text
              style={{
                marginTop: 2,
                fontSize: 12,
                fontWeight: '600',
                color: kind === k.key ? colors.textInverse : colors.text,
              }}
            >
              {k.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Field label="¿Cuánto?" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="45000" />

      {/* Selector de fecha del movimiento */}
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 6 }}>
        Fecha
      </Text>
      <Pressable
        onPress={() => setShowDatePicker(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.sm,
          paddingHorizontal: spacing.md,
          paddingVertical: 12,
          marginBottom: spacing.md,
        }}
      >
        {/* Instante real del día del usuario (picker local) → fecha local. */}
        <Text style={{ fontSize: 16, color: colors.text }}>📅 {formatLocalDate(occurredAt)}</Text>
        <Text style={{ color: colors.primary, fontWeight: '600' }}>Cambiar</Text>
      </Pressable>
      {showDatePicker ? (
        <DateTimePicker
          value={occurredAt}
          mode="date"
          maximumDate={new Date()}
          onChange={(event, selected) => {
            if (Platform.OS !== 'ios') setShowDatePicker(false);
            if (event.type === 'set' && selected) setOccurredAt(selected);
          }}
        />
      ) : null}

      {/* Grilla de categorías con iconos */}
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: spacing.sm }}>
        Categoría
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md }}>
        {categories.map((cat) => {
          const active = selectedCat?.id === cat.id;
          return (
            <Pressable
              key={cat.id}
              onPress={() => setSelectedCat(active ? null : cat)}
              style={{
                width: '22%',
                aspectRatio: 1,
                borderRadius: radius.md,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: active ? (cat.color ?? colors.primary) + '22' : colors.surface,
                borderWidth: 2,
                borderColor: active ? (cat.color ?? colors.primary) : colors.border,
              }}
            >
              <Text style={{ fontSize: 24 }}>{cat.icon ?? '🏷️'}</Text>
              <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }} numberOfLines={1}>
                {cat.name}
              </Text>
            </Pressable>
          );
        })}
        {categories.length === 0 ? (
          <Text style={{ color: colors.textMuted }}>Cargando categorías…</Text>
        ) : null}
      </View>

      <Field label="Nota (opcional)" value={note} onChangeText={setNote} placeholder="detalle…" />

      {feedback ? (
        <Text style={{ color: feedback.startsWith('✅') ? colors.success : colors.danger, marginBottom: 8 }}>
          {feedback}
        </Text>
      ) : null}

      <Button title="Registrar" onPress={onSubmit} loading={loading} />

      <Card style={{ marginTop: spacing.lg, backgroundColor: '#EAF7F1', borderColor: colors.primaryLight }}>
        <Text style={{ fontWeight: '700', color: colors.primaryDark }}>💬 Tip</Text>
        <Text style={{ color: colors.text, marginTop: 4 }}>
          También puedes registrar por WhatsApp: escribe "Gasté $45.000 en almuerzo" a tu número de
          Millo. Vincúlalo en Ajustes.
        </Text>
      </Card>
    </ScrollView>
  );
}
