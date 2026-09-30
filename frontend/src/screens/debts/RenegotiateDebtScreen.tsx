import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Card, Chip, ErrorState, Field, FormScroll, Ico, Row, SectionHeader, Skeleton } from '../../components/ui';
import { DatePicker } from '../../components/DatePicker';
import { colors, radius, spacing, type } from '../../theme/colors';
import { formatDate, formatMoney, parseAmount, parseDecimal } from '../../utils/format';
import { debtsApi } from '../../api/endpoints';
import { RenegotiateInput, RenegotiationPreview, toNumber } from '../../api/types';
import { useApi } from '../../utils/useApi';
import { DebtsStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<DebtsStackParamList, 'RenegotiateDebt'>;

const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * FIN-044 · Renegociar un crédito. El usuario dice qué pactó con la entidad (cuotas,
 * tasa y su tipo, cuota, saldo), responde "¿desde cuándo aplica?" y "¿el día de pago
 * sigue igual?", ve ANTES → DESPUÉS y confirma. Nada cambia hasta confirmar (§42).
 */
export function RenegotiateDebtScreen({ route, navigation }: Props) {
  const { debtId } = route.params;
  const debt = useApi(() => debtsApi.get(debtId), [debtId]);
  const history = useApi(() => debtsApi.renegotiations(debtId), [debtId]);

  const [installments, setInstallments] = useState('');
  const [rate, setRate] = useState('');
  const [rateKind, setRateKind] = useState<'fija' | 'variable' | null>(null);
  const [payment, setPayment] = useState('');
  const [balance, setBalance] = useState('');
  const [keepCycle, setKeepCycle] = useState(true);
  const [newDay, setNewDay] = useState('');
  const [fromNext, setFromNext] = useState(true);
  const [fromDate, setFromDate] = useState<Date>(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [preview, setPreview] = useState<RenegotiationPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const d = debt.data;
  const informal = d?.scheduleModel === 'saldo_y_cuota_pactada';
  const currentKind = (d?.rateKind as 'fija' | 'variable' | undefined) ?? 'fija';

  const input = useMemo<RenegotiateInput>(() => {
    const dto: RenegotiateInput = {};
    const n = parseAmount(installments);
    if (installments.trim() && n > 0) dto.remainingInstallments = Math.round(n);
    const r = parseDecimal(rate);
    if (rate.trim() && !Number.isNaN(r)) dto.interestRate = r;
    if (rateKind && rateKind !== currentKind) dto.rateKind = rateKind;
    const p = parseAmount(payment);
    if (payment.trim() && p > 0) dto.monthlyPayment = p;
    const b = parseAmount(balance);
    if (balance.trim() && b >= 0) dto.currentBalance = b;
    dto.keepCycle = keepCycle;
    if (!keepCycle) {
      const day = parseAmount(newDay);
      if (day >= 1 && day <= 31) dto.paymentDay = Math.round(day);
    }
    if (!fromNext) dto.effectiveFrom = isoDate(fromDate);
    return dto;
  }, [installments, rate, rateKind, currentKind, payment, balance, keepCycle, newDay, fromNext, fromDate]);

  const invalidate = () => setPreview(null);

  const onPreview = async () => {
    setError(null);
    if (!keepCycle && !input.paymentDay) {
      setError('Escribe el nuevo día de pago (1 a 31).');
      return;
    }
    setBusy(true);
    try {
      setPreview(await debtsApi.renegotiatePreview(debtId, input));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onConfirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await debtsApi.renegotiate(debtId, input);
      navigation.goBack();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (debt.error && !d) return <FormScroll><ErrorState message={debt.error} onRetry={() => void debt.reload()} /></FormScroll>;
  if (!d) return <FormScroll><Skeleton lines={6} /></FormScroll>;

  return (
    <FormScroll>
      <Card>
        <Text style={{ color: colors.textMuted, ...type.small }}>Hoy</Text>
        <Text style={{ color: colors.text, ...type.body }}>
          Saldo {formatMoney(toNumber(d.currentBalance))} · cuota {formatMoney(toNumber(d.monthlyPayment))}
          {d.termMonths ? ` · ${d.termMonths} cuotas` : ''} · tasa {toNumber(d.interestRate)}% {d.rateBasis} {d.rateKind ?? 'fija'}
          {d.paymentDay ? ` · día ${d.paymentDay}` : ''}
        </Text>
        <Text style={{ color: colors.textFaint, ...type.caption, marginTop: spacing.xs }}>
          Llena solo lo que cambió. Lo que dejes vacío se conserva.
        </Text>
      </Card>

      <SectionHeader title="¿Qué pactaste?" icon="create-outline" />
      <Card>
        {!informal ? (
          <Field label="Cuotas que faltan" value={installments} onChangeText={(t) => { setInstallments(t); invalidate(); }} keyboardType="numeric" placeholder={d.termMonths ? String(d.termMonths) : '60'} />
        ) : null}
        <Field label={`Tasa (% ${d.rateBasis})`} value={rate} onChangeText={(t) => { setRate(t); invalidate(); }} keyboardType="decimal-pad" placeholder={String(toNumber(d.interestRate))} />
        <Text style={{ color: colors.text, fontWeight: '600', marginBottom: spacing.xs }}>Tipo de tasa</Text>
        <Row style={{ gap: spacing.sm, marginBottom: spacing.md }}>
          <Chip label="Fija" active={(rateKind ?? currentKind) === 'fija'} onPress={() => { setRateKind('fija'); invalidate(); }} />
          <Chip label="Variable" active={(rateKind ?? currentKind) === 'variable'} onPress={() => { setRateKind('variable'); invalidate(); }} />
        </Row>
        <Field
          label={informal ? 'Cuota pactada' : 'Cuota pactada (opcional: si no das cuotas, las calculo con ella)'}
          value={payment}
          onChangeText={(t) => { setPayment(t); invalidate(); }}
          keyboardType="numeric"
          placeholder={String(Math.round(toNumber(d.monthlyPayment)))}
        />
        <Field label="Saldo recompuesto por la entidad (opcional)" value={balance} onChangeText={(t) => { setBalance(t); invalidate(); }} keyboardType="numeric" placeholder={String(Math.round(toNumber(d.currentBalance)))} />
      </Card>

      <SectionHeader title="¿Desde cuándo aplica?" icon="calendar-outline" />
      <Card>
        <Row style={{ gap: spacing.sm, flexWrap: 'wrap' }}>
          <Chip label={d.nextDueDate ? `Próxima cuota (${formatDate(d.nextDueDate)})` : 'Próxima cuota'} active={fromNext} onPress={() => { setFromNext(true); invalidate(); }} />
          <Chip label="Otra fecha" active={!fromNext} onPress={() => { setFromNext(false); setShowPicker(true); invalidate(); }} />
        </Row>
        {!fromNext ? (
          <Pressable onPress={() => setShowPicker(true)} style={{ marginTop: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: spacing.md }}>
            <Text style={{ color: colors.text }}><Ico name="calendar-outline" /> {formatDate(fromDate)}</Text>
          </Pressable>
        ) : null}
        {showPicker && !fromNext ? (
          <DatePicker value={fromDate} onChange={(e, s) => { setShowPicker(false); if (e.type === 'set' && s) { setFromDate(s); invalidate(); } }} />
        ) : null}
        <Text style={{ color: colors.textFaint, ...type.caption, marginTop: spacing.sm }}>
          Lo que ya pagaste no cambia: el plan nuevo arranca del saldo pendiente.
        </Text>
      </Card>

      <SectionHeader title="¿El día de pago sigue igual?" icon="repeat-outline" />
      <Card>
        <Row style={{ gap: spacing.sm }}>
          <Chip label={d.paymentDay ? `Sí, día ${d.paymentDay}` : 'Sí'} active={keepCycle} onPress={() => { setKeepCycle(true); invalidate(); }} />
          <Chip label="No, cambió" active={!keepCycle} onPress={() => { setKeepCycle(false); invalidate(); }} />
        </Row>
        {!keepCycle ? (
          <View style={{ marginTop: spacing.sm }}>
            <Field label="Nuevo día de pago" value={newDay} onChangeText={(t) => { setNewDay(t); invalidate(); }} keyboardType="numeric" placeholder="15" />
          </View>
        ) : null}
      </Card>

      {error ? <Text style={{ color: colors.danger, marginVertical: spacing.sm }}>{error}</Text> : null}

      {!preview ? (
        <Button title="Ver cómo queda" icon="eye-outline" onPress={() => void onPreview()} loading={busy} />
      ) : (
        <Card style={{ borderColor: colors.primary, borderWidth: 2 }}>
          <Text style={{ color: colors.text, ...type.title }}>Antes → después</Text>
          <Text style={{ color: colors.textMuted, ...type.small, marginBottom: spacing.sm }}>
            Aplica desde la cuota del {formatDate(preview.effectiveFrom)}
            {preview.keptCycle ? ' · mismo día de pago' : ` · nuevo día de pago: ${preview.after.paymentDay}`}
          </Text>
          {preview.changes.length === 0 ? (
            <Text style={{ color: colors.textMuted }}>Con esos datos no cambia nada.</Text>
          ) : (
            preview.changes.map((c) => (
              <Text key={c} style={{ color: colors.text, ...type.body, marginBottom: 2 }}>• {c}</Text>
            ))
          )}
          {preview.after.payoffDate ? (
            <Text style={{ color: colors.text, ...type.body }}>
              • Terminas: {preview.before.payoffDate ? formatDate(preview.before.payoffDate) : '—'} → {formatDate(preview.after.payoffDate)}
            </Text>
          ) : null}
          {preview.after.remainingInterest != null && preview.before.remainingInterest != null ? (
            <Text style={{ color: colors.text, ...type.body }}>
              • Intereses por pagar: {formatMoney(preview.before.remainingInterest)} → {formatMoney(preview.after.remainingInterest)}
            </Text>
          ) : null}
          <View style={{ marginTop: spacing.md }}>
            <Button title="Confirmar renegociación" icon="checkmark-circle-outline" onPress={() => void onConfirm()} loading={busy} disabled={preview.changes.length === 0} />
            <Button title="Seguir editando" variant="ghost" onPress={() => setPreview(null)} />
          </View>
        </Card>
      )}

      {(history.data ?? []).length > 0 ? (
        <>
          <SectionHeader title="Renegociaciones anteriores" icon="time-outline" />
          {(history.data ?? []).map((h) => (
            <Card key={h.id} style={{ paddingVertical: spacing.sm }}>
              <Text style={{ color: colors.text, ...type.body, fontWeight: '600' }}>
                Desde {formatDate(h.effectiveFrom)} · registrada {formatDate(h.createdAt)}
              </Text>
              <Text style={{ color: colors.textMuted, ...type.small }}>
                Cuota {formatMoney(h.before.monthlyPayment ?? 0)} → {formatMoney(h.after.monthlyPayment ?? 0)} · tasa {h.before.interestRate}% → {h.after.interestRate}% ({h.after.rateKind})
                {h.after.remainingInstallments != null ? ` · ${h.after.remainingInstallments} cuotas` : ''}
                {h.note ? ` · ${h.note}` : ''}
              </Text>
            </Card>
          ))}
        </>
      ) : null}
    </FormScroll>
  );
}
