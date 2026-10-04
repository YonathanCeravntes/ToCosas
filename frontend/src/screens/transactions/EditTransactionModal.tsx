import React, { useEffect, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { Text } from '../../components/AppText';
import { DatePicker } from '../../components/DatePicker';
import { Button, Card, Field, Ico } from '../../components/ui';
import { CategoryGlyph } from '../../components/CategoryGlyph';
import { colors, radius, spacing, type } from '../../theme/colors';
import { formatLocalDate, parseAmount } from '../../utils/format';
import { fromApiDate, toApiDate } from '../../utils/dates';
import { loadCategoriesByUsage, TOP_CATEGORIES } from '../../utils/categoryUsage';
import { transactionsApi } from '../../api/endpoints';
import { Category } from '../../api/types';
import { useBottomInset } from '../../navigation/insets';

/**
 * FIN-028 (DEC-0028 P2/P3/P6) · Corregir un movimiento debe ser tan fácil como
 * registrarlo (DEC-028-010). Edición rápida (monto/fecha/nota) + anulación con
 * confirmación previa (DEC-028-003). Guardarraíl P6: en un pago de deuda,
 * monto/fecha no se editan en sitio — el usuario anula y registra de nuevo.
 *
 * FIN-056 (boceto 2): también la CATEGORÍA. Al cambiarla, el servidor aprende el
 * comercio (FIN-046 Fase 4): la próxima vez que se escriba esa nota irá ahí.
 */
export interface EditableMovement {
  id: string;
  kind: string;
  amount: number;
  occurredAt: string;
  note: string | null;
  categoryId?: string | null;
}

export function EditTransactionModal({
  movement,
  onClose,
  onChanged,
}: {
  movement: EditableMovement | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const bottomInset = useBottomInset(); // BT-012: la hoja no debe quedar bajo la barra del sistema
  const isDebt = movement?.kind === 'pago_deuda';
  const hasCategory = movement?.kind === 'gasto' || movement?.kind === 'ingreso';
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reinicia los campos cada vez que se abre con un movimiento distinto.
  useEffect(() => {
    if (!movement) return;
    setAmount(String(Math.round(movement.amount)));
    setNote(movement.note ?? '');
    setDate(fromApiDate(movement.occurredAt));
    setCategoryId(movement.categoryId ?? null);
    setShowAll(false);
    setError(null);
    if (movement.kind === 'gasto' || movement.kind === 'ingreso') {
      loadCategoriesByUsage(movement.kind).then(setCategories).catch(() => setCategories([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movement?.id]);

  if (!movement) return null;

  // Las más usadas primero; la actual siempre visible aunque no esté entre ellas.
  const dayToDay = categories.filter((c) => !c.isFixed);
  const shown = showAll ? dayToDay : [...dayToDay.slice(0, TOP_CATEGORIES), ...dayToDay.slice(TOP_CATEGORIES).filter((c) => c.id === categoryId)];
  const truncated = dayToDay.length > shown.length;
  const changedCategory = hasCategory && categoryId !== (movement.categoryId ?? null) && !!categoryId;

  const save = async () => {
    setError(null);
    const patch: Record<string, string | number> = {};
    if (!isDebt) {
      const value = parseAmount(amount); // §39
      if (!value || value <= 0) {
        setError('Ingresa un monto válido');
        return;
      }
      if (value !== Math.round(movement.amount)) patch.amount = value;
      // BT-027: la fecha viaja como día local (mediodía UTC), igual que al registrar.
      if (date && toApiDate(date) !== movement.occurredAt && toApiDate(date) !== toApiDate(fromApiDate(movement.occurredAt))) patch.occurredAt = toApiDate(date);
    }
    if (note !== (movement.note ?? '')) patch.note = note;
    if (changedCategory && categoryId) patch.categoryId = categoryId;
    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }
    setBusy(true);
    try {
      await transactionsApi.update(movement.id, patch);
      onChanged();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const anular = () => {
    // DEC-028-003: confirmación explícita antes de anular (cero borrados accidentales).
    Alert.alert(
      'Anular movimiento',
      'Se quitará de tus cuentas y de tus cálculos. Podrás recuperarlo más adelante. ¿Anular este movimiento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Anular',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setBusy(true);
              try {
                await transactionsApi.remove(movement.id);
                onChanged();
                onClose();
              } catch (e) {
                setError((e as Error).message);
                setBusy(false);
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: colors.scrim }}>
        <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, maxHeight: '92%', paddingBottom: spacing.md + bottomInset }}>
          <ScrollView contentContainerStyle={{ padding: spacing.md }} keyboardShouldPersistTaps="handled">
            <Text style={{ color: colors.text, ...type.title, marginBottom: spacing.md }} accessibilityRole="header">Editar movimiento</Text>

            {isDebt ? (
              <Card style={{ borderColor: colors.warningDeep, borderWidth: 1, backgroundColor: colors.warningSoft }}>
                <Text style={{ color: colors.textMuted, ...type.small }}>
                  Es un pago de deuda: para cambiar el monto o la fecha, anúlalo y regístralo de nuevo
                  — así el saldo de tu deuda queda correcto. Aquí puedes ajustar la nota.
                </Text>
              </Card>
            ) : (
              <>
                <Field label="Monto" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="0" />
                <Text style={{ color: colors.textMuted, ...type.small, fontWeight: '600', marginBottom: 6 }}>Fecha</Text>
                <Pressable
                  onPress={() => setShowPicker(true)}
                  accessibilityRole="button"
                  style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: spacing.md, paddingVertical: 12, minHeight: 44, marginBottom: spacing.md, backgroundColor: colors.surface }}
                >
                  <Ico name="calendar-outline" color={colors.textFaint} size={16} />
                  <Text style={{ color: colors.text, ...type.bodyLg }}>{date ? formatLocalDate(date) : '—'}</Text>
                </Pressable>
                {showPicker ? (
                  <DatePicker
                    value={date ?? new Date()}
                    mode="date"
                    maximumDate={new Date()}
                    onChange={(_, d) => {
                      setShowPicker(Platform.OS === 'ios');
                      if (d) setDate(d);
                    }}
                  />
                ) : null}
              </>
            )}

            {hasCategory ? (
              <View style={{ marginBottom: spacing.md }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ color: colors.textMuted, ...type.small, fontWeight: '600' }}>Categoría</Text>
                  {truncated || showAll ? (
                    <Pressable onPress={() => setShowAll(!showAll)} accessibilityRole="button" hitSlop={8}>
                      <Text style={{ color: colors.primary, ...type.small, fontWeight: '600' }}>{showAll ? 'Menos' : `Ver todas (${dayToDay.length})`}</Text>
                    </Pressable>
                  ) : null}
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  {shown.map((c) => {
                    const on = categoryId === c.id;
                    return (
                      <Pressable
                        key={c.id}
                        onPress={() => setCategoryId(c.id)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: on }}
                        accessibilityLabel={c.name}
                        style={{ height: 36, paddingHorizontal: 10, borderRadius: radius.full, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: on ? colors.primarySoft : colors.surface, borderWidth: on ? 1.5 : 1, borderColor: on ? colors.primary : colors.border }}
                      >
                        <CategoryGlyph size="sm" emoji={c.icon} kind={movement.kind === 'ingreso' ? 'ingreso' : 'gasto'} />
                        <Text style={{ color: on ? colors.primaryDark : colors.text, ...type.small, fontWeight: on ? '600' : '500' }}>{c.name}</Text>
                      </Pressable>
                    );
                  })}
                  {categories.length === 0 ? <Text style={{ color: colors.textMuted, ...type.small }}>Cargando categorías…</Text> : null}
                </View>
                {changedCategory && movement.note ? (
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: colors.primarySoft, borderRadius: radius.sm, padding: spacing.sm, marginTop: spacing.sm }}>
                    <Ico name="bulb-outline" color={colors.primaryDark} size={16} />
                    <Text style={{ color: colors.primaryDark, ...type.small, flex: 1 }}>
                      Millo aprende: la próxima vez que escribas «{movement.note}» irá a esta categoría.
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            <Field label="Nota" value={note} onChangeText={setNote} placeholder="Descripción" />

            {error ? <Text style={{ color: colors.danger, marginBottom: 8 }}>{error}</Text> : null}

            <Button title="Guardar" onPress={() => void save()} loading={busy} />
            <Pressable onPress={anular} disabled={busy} accessibilityRole="button" style={{ alignItems: 'center', paddingVertical: spacing.sm, minHeight: 44, justifyContent: 'center' }}>
              <Text style={{ color: colors.danger, ...type.body, fontWeight: '600' }}><Ico name="trash-outline" color={colors.danger} /> Anular movimiento</Text>
            </Pressable>
            <Pressable onPress={onClose} disabled={busy} accessibilityRole="button" style={{ alignItems: 'center', paddingVertical: 4, minHeight: 40, justifyContent: 'center' }}>
              <Text style={{ color: colors.textFaint, ...type.body }}>Cerrar</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
