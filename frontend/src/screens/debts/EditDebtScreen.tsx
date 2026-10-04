import React, { useEffect, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Text } from '../../components/AppText';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Card, ErrorState, Field, FormScroll, Ico, Row, Skeleton } from '../../components/ui';
import { RateInput } from '../../components/RateInput';
import { colors, radius, spacing, type } from '../../theme/colors';
import { formatMoney, parseAmount, parseDecimal } from '../../utils/format';
import { eaToMonthly, RateUnit, toEA } from '../../utils/rates';
import { debtsApi, entitiesApi } from '../../api/endpoints';
import { FinancialEntity, toNumber } from '../../api/types';
import { useApi } from '../../utils/useApi';
import { DebtsStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<DebtsStackParamList, 'EditDebt'>;

/**
 * FIN-056 (boceto 4) · Editar una deuda sin borrarla y crearla de nuevo: nombre,
 * entidad, cupo (tarjetas), día de pago y, en tarjetas, la tasa. Cuotas, plazo y
 * cuota pactada siguen en Renegociar, que recalcula el plan de pago (FIN-044).
 * Decisión del Arquitecto pendiente de confirmar por el Fundador (auditoría 2026-09-30).
 */
export function EditDebtScreen({ route, navigation }: Props) {
  const { debtId } = route.params;
  const debt = useApi(() => debtsApi.get(debtId), [debtId]);
  const d = debt.data;
  const isCard = d?.scheduleModel === 'cuotas_por_compra';

  const [name, setName] = useState('');
  const [entity, setEntity] = useState<FinancialEntity | null>(null);
  const [entityTouched, setEntityTouched] = useState(false);
  const [query, setQuery] = useState('');
  const [entities, setEntities] = useState<FinancialEntity[]>([]);
  const [pickingEntity, setPickingEntity] = useState(false);
  const [limit, setLimit] = useState('');
  const [day, setDay] = useState('');
  const [rate, setRate] = useState('');
  const [unit, setUnit] = useState<RateUnit>('mensual');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!d) return;
    setName(d.name);
    setLimit(d.creditLimit != null ? String(Math.round(toNumber(d.creditLimit))) : '');
    setDay(d.paymentDay ? String(d.paymentDay) : '');
    setEntity(d.entity ? { id: d.entity.id, name: d.entity.name, type: 'banco', isGlobal: true } : null);
    const ea = toNumber(d.interestRate);
    // La tasa se muestra como mensual (la que la gente conoce) partiendo de la EA guardada.
    setRate(ea > 0 ? String(Math.round(eaToMonthly(d.rateBasis === 'EA' ? ea : ea) * 100) / 100).replace('.', ',') : '');
    setUnit('mensual');
  }, [d]);

  useEffect(() => {
    if (!pickingEntity) return;
    let alive = true;
    entitiesApi.search(query || undefined).then((r) => alive && setEntities(r)).catch(() => alive && setEntities([]));
    return () => { alive = false; };
  }, [query, pickingEntity]);

  const save = async () => {
    if (!d) return;
    setError(null);
    const patch: Record<string, unknown> = {};
    if (name.trim() && name.trim() !== d.name) patch.name = name.trim();
    if (entityTouched) patch.entityId = entity?.id ?? null;
    const dayN = day.trim() ? parseInt(day, 10) : null;
    if (day.trim() && (Number.isNaN(dayN) || dayN! < 1 || dayN! > 31)) return setError('El día de pago debe estar entre 1 y 31.');
    if ((dayN ?? null) !== (d.paymentDay ?? null)) patch.paymentDay = dayN;
    if (isCard) {
      const lim = limit.trim() ? parseAmount(limit) : null;
      if (limit.trim() && (Number.isNaN(lim) || lim! <= 0)) return setError('Escribe el cupo total de la tarjeta.');
      if ((lim ?? null) !== (d.creditLimit != null ? toNumber(d.creditLimit) : null)) patch.creditLimit = lim;
      const r = parseDecimal(rate);
      if (rate.trim() && (Number.isNaN(r) || r < 0)) return setError('Escribe la tasa como te la cobran (p. ej. 2,1).');
      if (rate.trim()) {
        const ea = toEA(r, unit);
        if (Math.abs(ea - toNumber(d.interestRate)) > 0.005) { patch.interestRate = ea; patch.rateBasis = 'EA'; }
      }
    }
    if (Object.keys(patch).length === 0) { navigation.goBack(); return; }
    setBusy(true);
    try {
      await debtsApi.update(debtId, patch);
      navigation.goBack();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    if (!d) return;
    Alert.alert('Eliminar esta deuda', `Se quitará ${d.name} de tu lista y de tus cálculos. Sus pagos registrados quedan en tus movimientos. ¿Eliminar?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setBusy(true);
            try {
              await debtsApi.remove(debtId);
              navigation.navigate('DebtsList');
            } catch (e) {
              setError((e as Error).message);
              setBusy(false);
            }
          })();
        },
      },
    ]);
  };

  if (debt.error && !d) return <FormScroll><ErrorState message={debt.error} onRetry={() => void debt.reload()} /></FormScroll>;
  if (!d) return <FormScroll><Skeleton lines={6} /></FormScroll>;

  if (pickingEntity) {
    return (
      <FormScroll>
        <Text style={{ color: colors.text, ...type.title, marginBottom: spacing.sm }}>¿Con qué entidad?</Text>
        <Field label="Busca tu banco o entidad" value={query} onChangeText={setQuery} placeholder="Bancolombia, Nequi, Davivienda…" autoFocus />
        <Pressable onPress={() => { setEntity(null); setEntityTouched(true); setPickingEntity(false); }} accessibilityRole="button" style={{ minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.textFaint, justifyContent: 'center', paddingHorizontal: spacing.md, marginBottom: spacing.sm }}>
          <Text style={{ color: colors.text, fontWeight: '600', ...type.body }}>Sin entidad</Text>
        </Pressable>
        <Card style={{ paddingVertical: 0 }}>
          {entities.slice(0, 12).map((e, i) => (
            <Pressable key={e.id} onPress={() => { setEntity(e); setEntityTouched(true); setPickingEntity(false); }} accessibilityRole="button" style={{ minHeight: 52, justifyContent: 'center', borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.surfaceAlt }}>
              <Text style={{ color: colors.text, fontWeight: '600', ...type.body }}>{e.name}</Text>
            </Pressable>
          ))}
        </Card>
        <Button title="Cancelar" variant="ghost" onPress={() => setPickingEntity(false)} />
      </FormScroll>
    );
  }

  return (
    <FormScroll>
      <Card>
        <Field label="Nombre" value={name} onChangeText={setName} placeholder="Tarjeta Visa" />
        <Text style={{ color: colors.textMuted, ...type.small, fontWeight: '600', marginBottom: 6 }}>Entidad</Text>
        <Pressable onPress={() => { setQuery(''); setPickingEntity(true); }} accessibilityRole="button" style={{ minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: spacing.md, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md, backgroundColor: colors.surface }}>
          <Text style={{ color: entity ? colors.text : colors.textMuted, ...type.bodyLg }}>{entity?.name ?? 'Sin entidad'}</Text>
          <Text style={{ color: colors.primary, ...type.small, fontWeight: '600' }}>Cambiar</Text>
        </Pressable>
        {isCard ? <Field label="Cupo total" value={limit} onChangeText={setLimit} keyboardType="numeric" placeholder="5.000.000" hint="Con el cupo, Millo te muestra cuánto te queda disponible." /> : null}
        {isCard ? <RateInput value={rate} unit={unit} onChange={(v, u) => { setRate(v); setUnit(u); }} /> : null}
        <Field label="Día de pago" value={day} onChangeText={setDay} keyboardType="numeric" placeholder="15" hint="Para avisarte antes de cada cuota." />
      </Card>

      {!isCard ? (
        <Card style={{ backgroundColor: colors.warningSoft, borderColor: colors.warningSoft }}>
          <Row style={{ gap: spacing.sm, alignItems: 'flex-start' }}>
            <Ico name="information-circle-outline" color={colors.warningDeep} size={18} />
            <Text style={{ color: colors.text, ...type.small, flex: 1, lineHeight: 18 }}>
              Las cuotas, el plazo, la tasa y la cuota pactada se cambian en{' '}
              <Text onPress={() => navigation.navigate('RenegotiateDebt', { debtId, name: d.name })} style={{ color: colors.primary, fontWeight: '600' }}>Renegociar</Text>
              , para que tu plan de pago quede bien. Hoy: {formatMoney(toNumber(d.monthlyPayment))} de cuota{d.termMonths ? ` · ${d.termMonths} cuotas` : ''}.
            </Text>
          </Row>
        </Card>
      ) : null}

      {error ? <Text style={{ color: colors.danger, marginBottom: spacing.sm }}>{error}</Text> : null}
      <Button title="Guardar cambios" onPress={() => void save()} loading={busy} />
      <View style={{ marginTop: spacing.sm }}>
        <Button title="Eliminar esta deuda" icon="trash-outline" variant="dangerOutline" onPress={remove} disabled={busy} />
      </View>
    </FormScroll>
  );
}
