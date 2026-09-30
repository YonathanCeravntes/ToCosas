import React, { useState } from 'react';
import { Alert, Modal, Platform, Pressable, Text, View } from 'react-native';
import { DatePicker } from '../../components/DatePicker';
import { Button, Card, Field, Ico } from '../../components/ui';
import { colors, radius, spacing } from '../../theme/colors';
import { formatLocalDate, parseAmount } from '../../utils/format';
import { transactionsApi } from '../../api/endpoints';
import { useBottomInset } from '../../navigation/insets';

/**
 * FIN-028 (DEC-0028 P2/P3/P6) · Corregir un movimiento debe ser tan fácil como
 * registrarlo (DEC-028-010). Edición rápida (monto/fecha/nota) + anulación con
 * confirmación previa (DEC-028-003). Guardarraíl P6: en un pago de deuda,
 * monto/fecha no se editan en sitio — el usuario anula y registra de nuevo.
 */
export interface EditableMovement {
  id: string;
  kind: string;
  amount: number;
  occurredAt: string;
  note: string | null;
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
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reinicia los campos cada vez que se abre con un movimiento distinto.
  React.useEffect(() => {
    if (!movement) return;
    setAmount(String(Math.round(movement.amount)));
    setNote(movement.note ?? '');
    setDate(new Date(movement.occurredAt));
    setError(null);
  }, [movement?.id]);

  if (!movement) return null;

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
      if (date && date.toISOString() !== movement.occurredAt) patch.occurredAt = date.toISOString();
    }
    if (note !== (movement.note ?? '')) patch.note = note;
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
        <View style={{ backgroundColor: colors.bg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.md, paddingBottom: spacing.md + bottomInset }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: spacing.sm }}>
            Editar movimiento
          </Text>

          {isDebt ? (
            <Card style={{ borderColor: colors.warning, borderWidth: 1 }}>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                Es un pago de deuda: para cambiar el monto o la fecha, anúlalo y regístralo de nuevo
                — así el saldo de tu deuda queda correcto. Aquí puedes ajustar la nota.
              </Text>
            </Card>
          ) : (
            <>
              <Field label="Monto" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="0" />
              <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 6 }}>Fecha</Text>
              <Pressable
                onPress={() => setShowPicker(true)}
                style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: spacing.md, marginBottom: spacing.md }}
              >
                <Text style={{ color: colors.text }}><Ico name="calendar-outline" /> {date ? formatLocalDate(date) : '—'}</Text>
              </Pressable>
              {showPicker ? (
                <DatePicker
                  value={date ?? new Date()}
                  mode="date"
                  onChange={(_, d) => {
                    setShowPicker(Platform.OS === 'ios');
                    if (d) setDate(d);
                  }}
                />
              ) : null}
            </>
          )}

          <Field label="Nota" value={note} onChangeText={setNote} placeholder="Descripción" />

          {error ? <Text style={{ color: colors.danger, marginBottom: 8 }}>{error}</Text> : null}

          <Button title="Guardar" onPress={() => void save()} loading={busy} />
          <Pressable onPress={anular} disabled={busy} style={{ alignItems: 'center', paddingVertical: spacing.sm }}>
            <Text style={{ color: colors.danger, fontWeight: '700' }}><Ico name="trash-outline" color={colors.danger} /> Anular movimiento</Text>
          </Pressable>
          <Pressable onPress={onClose} disabled={busy} style={{ alignItems: 'center', paddingVertical: 4 }}>
            <Text style={{ color: colors.textMuted }}>Cerrar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
