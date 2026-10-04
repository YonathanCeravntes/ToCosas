import React, { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { Text } from '../components/AppText';
import { useFocusEffect } from '@react-navigation/native';
import { Button, Card, Chip, ErrorState, Field, FormScroll, GroupLabel, HeroCard, Ico, Money, ProgressBar, Row, Skeleton } from '../components/ui';
import { colors, spacing, type } from '../theme/colors';
import { formatMoney, parseAmount } from '../utils/format';
import { planApi } from '../api/endpoints';
import { AnnualExpense, CushionTiers, Windfall, WindfallKind } from '../api/types';

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const WINDFALL_LABEL: Record<WindfallKind, string> = {
  prima_junio: 'Prima de junio',
  prima_diciembre: 'Prima de diciembre',
  intereses_cesantias: 'Intereses de cesantías',
};
/** Repartos sugeridos: deuda cara · colchón · libre. */
const PRESETS: Array<[number, number, number]> = [
  [60, 20, 20],
  [40, 40, 20],
  [80, 0, 20],
];

function dateLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} de ${MONTHS[m - 1]}${y !== new Date().getFullYear() ? ` de ${y}` : ''}`;
}

/**
 * FIN-061 Fase 2.5 · Plata del año (boceto aprobado 2026-10-04): colchón por escalones
 * en meses de lo esencial (sin cesantías), gastos grandes del año repartidos entre los
 * meses que faltan, y primas e intereses de cesantías planeados antes de que lleguen.
 */
export function YearPlanScreen() {
  const [cushion, setCushion] = useState<CushionTiers | null>(null);
  const [annual, setAnnual] = useState<{ items: AnnualExpense[]; monthlyTotal: number } | null>(null);
  const [windfalls, setWindfalls] = useState<Windfall[] | null>(null);
  const [onlyIncome, setOnlyIncome] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = React.useCallback(async (only = onlyIncome) => {
    setError(null);
    try {
      const [c, a, w] = await Promise.all([planApi.cushion(only), planApi.annual(), planApi.windfalls()]);
      setCushion(c);
      setAnnual(a);
      setWindfalls(w);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [onlyIncome]);

  useFocusEffect(React.useCallback(() => { void load(); }, [load]));

  const addAnnual = async () => {
    const n = parseAmount(amount);
    if (!name.trim() || Number.isNaN(n) || n <= 0 || !month) {
      setError('Escribe el nombre, el valor y el mes en que se paga.');
      return;
    }
    setSaving(true);
    try {
      await planApi.createAnnual({ name: name.trim(), amount: n, month });
      setName('');
      setAmount('');
      setMonth(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const setSplit = async (w: Windfall, [debtPct, cushionPct, freePct]: [number, number, number]) => {
    try {
      const saved = await planApi.setWindfall(w.kind, { debtPct, cushionPct, freePct });
      setWindfalls((ws) => ws?.map((x) => (x.kind === saved.kind ? saved : x)) ?? ws);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (error && !cushion) return <FormScroll><ErrorState message={error} onRetry={() => void load()} /></FormScroll>;
  if (!cushion || !annual || !windfalls) return <FormScroll><Skeleton hero lines={3} /><Skeleton lines={5} /></FormScroll>;

  const total = cushion.tiers.length;
  const cur = cushion.current ? cushion.tiers[cushion.current - 1] : null;

  return (
    <FormScroll onRefresh={() => load()}>
      {/* Tu colchón por escalones */}
      <HeroCard>
        <Text style={{ color: colors.onPrimaryFaint, ...type.label }}>
          {cur ? `Tu colchón · escalón ${cur.step} de ${total}` : 'Tu colchón · completo'}
        </Text>
        <Text style={{ color: colors.textInverse, ...type.title, fontSize: 19, marginTop: 6 }}>
          {cur ? `${cur.months} ${cur.months === 1 ? 'mes' : 'meses'} de lo esencial` : `${cushion.monthsCovered} meses cubiertos`}
        </Text>
        <Text style={{ color: colors.onPrimaryMuted, ...type.small, marginTop: 2 }}>
          {cur ? `${formatMoney(cur.target)} · ` : ''}lo esencial es {formatMoney(cushion.essentialMonthly)} al mes
        </Text>
        <View style={{ marginTop: spacing.sm }}>
          <ProgressBar value={cushion.progress} color={colors.textInverse} track={colors.onPrimaryTrack} label="Avance del escalón" />
        </View>
        <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
          <Text style={{ color: colors.textInverse, ...type.small, fontWeight: '600' }}>{formatMoney(cushion.saved)} guardados</Text>
          <Text style={{ color: colors.onPrimaryMuted, ...type.small }}>{Math.round(cushion.progress * 100)} %</Text>
        </Row>
      </HeroCard>

      <Card style={{ paddingVertical: 0 }}>
        {cushion.tiers.map((t, i) => (
          <Row key={t.step} style={{ gap: spacing.sm, paddingVertical: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.surfaceAlt }}>
            <Ico name={t.reached ? 'checkmark-circle' : 'ellipse-outline'} color={t.reached ? colors.primary : colors.textFaint} size={18} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, ...type.body, fontWeight: '600' }}>
                Escalón {t.step} · {t.months} {t.months === 1 ? 'mes' : 'meses'}
              </Text>
              <Text style={{ color: colors.textFaint, ...type.small }}>{t.why}</Text>
            </View>
            <Text style={{ color: colors.textMuted, ...type.small }}>{formatMoney(t.target)}</Text>
          </Row>
        ))}
        <Row style={{ justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.surfaceAlt }}>
          <Text style={{ color: colors.textMuted, ...type.small, flex: 1 }}>Soy el único ingreso de mi casa</Text>
          <Switch
            value={onlyIncome}
            onValueChange={(v) => { setOnlyIncome(v); void load(v); }}
            trackColor={{ true: colors.primary, false: colors.border }}
            accessibilityLabel="Soy el único ingreso de mi casa"
          />
        </Row>
      </Card>
      <Text style={{ color: colors.textFaint, ...type.caption, marginTop: -spacing.xs }}>
        Tus cesantías no cuentan aquí: son tuyas, pero solo se retiran para vivienda, educación o al terminar tu contrato. Cuenta lo que tengas en cuentas marcadas como fondo de emergencia.
      </Text>

      {/* Gastos grandes del año */}
      <GroupLabel title="Gastos grandes del año" />
      <Card>
        {annual.items.length === 0 ? (
          <Text style={{ color: colors.textMuted, ...type.small }}>
            SOAT, predial, matrículas, útiles de enero, regalos de diciembre… Anótalos y Millo aparta un poquito cada mes para que no lleguen de sorpresa.
          </Text>
        ) : (
          annual.items.map((a, i) => (
            <Row key={a.id} style={{ gap: spacing.sm, paddingVertical: 8, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.surfaceAlt }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, ...type.body, fontWeight: '600' }}>{a.name} · {MONTHS[a.month - 1]}</Text>
                <Text style={{ color: colors.textFaint, ...type.small }}>{formatMoney(a.amount)} en {a.monthsLeft} {a.monthsLeft === 1 ? 'mes' : 'meses'}</Text>
              </View>
              <Text style={{ color: colors.primary, ...type.body, fontWeight: '600' }}>{formatMoney(a.monthly)}/mes</Text>
              <Pressable
                onPress={() => void planApi.removeAnnual(a.id).then(() => load())}
                accessibilityRole="button"
                accessibilityLabel={`Quitar ${a.name}`}
                hitSlop={10}
              >
                <Ico name="close" color={colors.textFaint} size={16} />
              </Pressable>
            </Row>
          ))
        )}
        {annual.monthlyTotal > 0 ? (
          <Text style={{ color: colors.textMuted, ...type.small, marginTop: spacing.sm }}>
            Apartas {formatMoney(annual.monthlyTotal)} al mes. Ya se descuentan de tu margen y cuentan en tu colchón.
          </Text>
        ) : null}
      </Card>
      <Card>
        <Field label="¿Qué es?" value={name} onChangeText={setName} placeholder="SOAT" />
        <Field label="Valor" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="620.000" />
        <Text style={{ color: colors.textMuted, ...type.label, marginBottom: 6 }}>Mes en que se paga</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.sm }}>
          {MONTHS.map((m, i) => (
            <Chip key={m} label={m.slice(0, 3)} active={month === i + 1} onPress={() => setMonth(i + 1)} />
          ))}
        </View>
        <Button title="Agregar" onPress={() => void addAnnual()} loading={saving} />
        {error ? <Text style={{ color: colors.danger, ...type.small, marginTop: 6 }}>{error}</Text> : null}
      </Card>

      {/* Plata extra */}
      <GroupLabel title="Plata extra del año" />
      <Text style={{ color: colors.textFaint, ...type.small, marginTop: -spacing.xs, marginBottom: spacing.sm }}>
        Nunca entra en tu margen del mes: se planea antes de que llegue.
      </Text>
      {windfalls.map((w) => (
        <Card key={w.kind}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ color: colors.text, ...type.title, fontSize: 15 }}>{WINDFALL_LABEL[w.kind]}</Text>
            <Text style={{ color: w.planNow ? colors.warningDeep : colors.textFaint, ...type.small, fontWeight: w.planNow ? '600' : '400' }}>
              {w.planNow ? `Llega en ${w.daysLeft} días` : dateLabel(w.date)}
            </Text>
          </Row>
          {w.estimated == null ? (
            <Text style={{ color: colors.textMuted, ...type.small, marginTop: 4 }}>
              {w.kind === 'intereses_cesantias'
                ? 'Registra tus cesantías en Cuentas y patrimonio para estimarlos (12 % al año, en enero).'
                : 'Marca en Mi perfil de ingresos que recibes prima y la estimamos (medio salario).'}
            </Text>
          ) : (
            <>
              <Money value={w.estimated} size={22} style={{ marginTop: 4 }} />
              <View style={{ gap: 4, marginTop: spacing.sm }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.textMuted, ...type.small }}>A tu deuda más cara ({w.debtPct} %)</Text>
                  <Text style={{ color: colors.text, ...type.small, fontWeight: '600' }}>{formatMoney(w.toDebt ?? 0)}</Text>
                </Row>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.textMuted, ...type.small }}>A tu colchón ({w.cushionPct} %)</Text>
                  <Text style={{ color: colors.text, ...type.small, fontWeight: '600' }}>{formatMoney(w.toCushion ?? 0)}</Text>
                </Row>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.textMuted, ...type.small }}>Libre para ti ({w.freePct} %)</Text>
                  <Text style={{ color: colors.primary, ...type.small, fontWeight: '600' }}>{formatMoney(w.free ?? 0)}</Text>
                </Row>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm }}>
                {PRESETS.map((p) => (
                  <Chip
                    key={p.join('-')}
                    label={p.join(' / ')}
                    active={w.debtPct === p[0] && w.cushionPct === p[1] && w.freePct === p[2]}
                    onPress={() => void setSplit(w, p)}
                  />
                ))}
              </View>
            </>
          )}
        </Card>
      ))}
      <Text style={{ color: colors.textFaint, ...type.caption, textAlign: 'center', marginVertical: spacing.lg }}>
        Deuda / colchón / libre. El 20 % libre es tuyo: también se vale disfrutar.
      </Text>
    </FormScroll>
  );
}
