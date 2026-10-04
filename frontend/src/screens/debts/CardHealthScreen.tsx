import React, { useState } from 'react';
import { View } from 'react-native';
import { Text } from '../../components/AppText';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Card, ErrorState, Field, FormScroll, GroupLabel, Ico, Money, Pill, Row, Skeleton } from '../../components/ui';
import { colors, radius, spacing, type } from '../../theme/colors';
import { formatDate, formatMoney, parseAmount } from '../../utils/format';
import { debtsApi } from '../../api/endpoints';
import { CardHealth, CardStatement } from '../../api/types';
import { DebtsStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<DebtsStackParamList, 'CardHealth'>;

const LEVEL: Record<NonNullable<CardHealth['utilization']['level']>, { label: string; tone: 'ok' | 'warn' | 'neg' | 'neutral' }> = {
  meta: { label: 'En la meta', tone: 'ok' },
  bien: { label: 'Bien', tone: 'ok' },
  atencion: { label: 'Atención', tone: 'warn' },
  alto: { label: 'Alto', tone: 'neg' },
  critico: { label: 'Muy alto', tone: 'neg' },
};
const pct = (f: number) => `${Math.round(f * 100)} %`;
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const today = () => new Date().toISOString().slice(0, 10);

/** Barra del cupo con las marcas de la meta (30 %) y el alto (70 %). */
function UsageBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(1, value));
  const color = v <= 0.3 ? colors.primary : v <= 0.7 ? colors.warning : colors.danger;
  return (
    <View style={{ marginTop: spacing.sm }}>
      <View style={{ height: 10, borderRadius: 5, backgroundColor: colors.surfaceAlt, overflow: 'hidden' }}>
        <View style={{ width: `${Math.max(v * 100, v > 0 ? 2 : 0)}%`, height: '100%', backgroundColor: color }} />
      </View>
      {[0.3, 0.7].map((m) => (
        <View key={m} style={{ position: 'absolute', left: `${m * 100}%`, top: -3, width: 2, height: 16, backgroundColor: colors.text, opacity: 0.5 }} />
      ))}
      <View style={{ height: 16, marginTop: 4 }}>
        <Text style={{ position: 'absolute', left: '30%', marginLeft: -16, color: colors.textFaint, ...type.caption }}>Meta 30 %</Text>
        <Text style={{ position: 'absolute', left: '70%', marginLeft: -14, color: colors.textFaint, ...type.caption }}>Alto 70 %</Text>
      </View>
    </View>
  );
}

/**
 * FIN-061 Fase 2.4 · Salud de tu tarjeta (boceto aprobado 2026-10-04): uso del cupo con
 * metas, PAGO SUGERIDO antes que el mínimo (rompe el ancla del mínimo), avisos de cuotas
 * y avances, y los datos del extracto (corte, pago, saldo, mínimo, total, cupo).
 */
export function CardHealthScreen({ route }: Props) {
  const { debtId } = route.params;
  const [health, setHealth] = useState<CardHealth | null>(null);
  const [statements, setStatements] = useState<CardStatement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [f, setF] = useState({ closingDate: '', dueDate: '', balance: '', minimum: '', total: '', limit: '', fee: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = React.useCallback(async () => {
    setError(null);
    try {
      const [h, s] = await Promise.all([debtsApi.cardHealth(debtId), debtsApi.cardStatements(debtId)]);
      setHealth(h);
      setStatements(s);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [debtId]);

  useFocusEffect(React.useCallback(() => { void load(); }, [load]));

  const num = (v: string) => {
    const n = parseAmount(v);
    return Number.isNaN(n) || n <= 0 ? undefined : n;
  };

  const save = async () => {
    const balance = parseAmount(f.balance);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.closingDate) || Number.isNaN(balance)) {
      setFormError('Escribe la fecha de corte (AAAA-MM-DD) y el saldo al corte.');
      return;
    }
    if (f.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(f.dueDate)) {
      setFormError('La fecha de pago va como AAAA-MM-DD.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await debtsApi.saveCardStatement(debtId, {
        closingDate: f.closingDate,
        dueDate: f.dueDate || undefined,
        statementBalance: balance,
        minimumPayment: num(f.minimum),
        totalPayment: num(f.total),
        creditLimit: num(f.limit),
        handlingFee: num(f.fee),
      });
      setFormOpen(false);
      setF({ closingDate: '', dueDate: '', balance: '', minimum: '', total: '', limit: '', fee: '' });
      await load();
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (error && !health) return <FormScroll><ErrorState message={error} onRetry={() => void load()} /></FormScroll>;
  if (!health) return <FormScroll><Skeleton hero lines={3} /><Skeleton lines={4} /></FormScroll>;

  const u = health.utilization;
  const p = health.payment;
  const lvl = u.level ? LEVEL[u.level] : null;
  const byStmt = u.byStatement;
  const twoHigh = byStmt.length >= 2 && byStmt[0].utilization > 0.7 && byStmt[1].utilization > 0.7;

  return (
    <FormScroll onRefresh={load}>
      {/* Uso del cupo */}
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={{ color: colors.textFaint, ...type.label }}>Uso del cupo</Text>
          {lvl ? <Pill label={lvl.label} tone={lvl.tone} /> : null}
        </Row>
        {u.current != null ? (
          <>
            <Text style={{ color: colors.text, ...type.display, marginTop: 4 }}>{pct(u.current)}</Text>
            <UsageBar value={u.current} />
            {u.toHealthy > 0 ? (
              <Text style={{ color: colors.textMuted, ...type.small, marginTop: spacing.xs }}>
                {twoHigh ? 'Dos cortes seguidos sobre 70 %. ' : ''}Con {formatMoney(u.toHealthy)} de abono bajas a 50 %, y eso ayuda a tu historial.
              </Text>
            ) : u.toGoal > 0 ? (
              <Text style={{ color: colors.textMuted, ...type.small, marginTop: spacing.xs }}>
                Con {formatMoney(u.toGoal)} más de abono llegas a la meta de 30 %.
              </Text>
            ) : (
              <Text style={{ color: colors.primary, ...type.small, marginTop: spacing.xs, fontWeight: '600' }}>Vas en la meta: menos de 30 % del cupo.</Text>
            )}
          </>
        ) : (
          <Text style={{ color: colors.textMuted, ...type.small, marginTop: 4 }}>Agrega el cupo (en el extracto o en Editar datos) para ver cuánto usas.</Text>
        )}
      </Card>

      {/* Pago: sugerido primero */}
      <GroupLabel title={p.dueDate ? `Para el ${formatDate(p.dueDate)}` : 'Tu próximo pago'} />
      <Card>
        <Text style={{ color: colors.textFaint, ...type.label }}>Pago sugerido</Text>
        {p.suggested != null ? <Money value={p.suggested} size={28} color={colors.primary} style={{ marginTop: 2 }} /> : <Text style={{ color: colors.textMuted, ...type.body }}>—</Text>}
        <Text style={{ color: colors.textMuted, ...type.small }}>
          Tu cuota de {formatMoney(p.cuota)}{p.planExtra > 0 ? ` + ${formatMoney(p.planExtra)} de tu plan` : ''}
        </Text>
        <View style={{ height: 1, backgroundColor: colors.surfaceAlt, marginVertical: spacing.sm }} />
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={{ color: colors.textMuted, ...type.body }}>Pago total</Text>
          <Text style={{ color: colors.text, ...type.body, fontWeight: '600' }}>{p.total != null ? formatMoney(p.total) : '—'}</Text>
        </Row>
        <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
          <Text style={{ color: colors.textFaint, ...type.small }}>Pago mínimo</Text>
          <Text style={{ color: colors.textFaint, ...type.small }}>{p.minimum != null ? formatMoney(p.minimum) : '—'}</Text>
        </Row>
      </Card>

      {/* Avisos */}
      {/* El aviso de uso del cupo ya va en la tarjeta de arriba. */}
      {health.alerts.filter((a) => a.kind !== 'cupo_alto').map((a) => (
        <Card key={`${a.kind}-${a.title}`} style={a.rule === 2 || a.rule === 8 || a.rule === 11 ? { borderColor: colors.warningDeep, borderWidth: 1 } : undefined}>
          <Text style={{ color: colors.text, ...type.title, fontSize: 15 }}>{a.title}</Text>
          <Text style={{ color: colors.textMuted, ...type.small, marginTop: 4 }}>{a.body}</Text>
        </Card>
      ))}

      {health.releaseCalendar && health.releaseCalendar.length > 0 ? (
        <>
          <GroupLabel title="Cuándo se liberan tus cuotas" />
          <Card style={{ paddingVertical: 0 }}>
            {health.releaseCalendar.slice(0, 8).map((r, i) => (
              <Row key={r.month} style={{ justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.surfaceAlt }}>
                <Text style={{ color: colors.text, ...type.body }}>{MONTHS[Number(r.month.slice(5, 7)) - 1]} {r.month.slice(0, 4)}</Text>
                <Text style={{ color: colors.primary, ...type.body, fontWeight: '600' }}>+{formatMoney(r.frees)} al mes</Text>
              </Row>
            ))}
          </Card>
        </>
      ) : null}

      {health.cycle ? (
        <>
          <GroupLabel title="Este ciclo con la tarjeta" />
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text, ...type.body, fontWeight: '600' }}>{formatMoney(health.cycle.spent)}</Text>
              {health.cycle.average != null ? <Text style={{ color: colors.textFaint, ...type.small }}>tu promedio: {formatMoney(health.cycle.average)}</Text> : null}
            </Row>
            {health.cycle.byCategory.slice(0, 5).map((c) => (
              <Row key={c.name} style={{ justifyContent: 'space-between', marginTop: 4 }}>
                <Text style={{ color: colors.textMuted, ...type.small }}>{c.name}</Text>
                <Text style={{ color: colors.textMuted, ...type.small }}>{formatMoney(c.amount)}</Text>
              </Row>
            ))}
          </Card>
        </>
      ) : null}

      {health.ifClosed?.totalUtilizationIfClosed != null ? (
        <Card>
          <Text style={{ color: colors.text, ...type.title, fontSize: 15 }}>¿Piensas cerrarla?</Text>
          <Text style={{ color: colors.textMuted, ...type.small, marginTop: 4 }}>
            Hoy usas {pct(health.ifClosed.totalUtilizationNow ?? 0)} de todo tu cupo; sin esta tarjeta pasarías a {pct(health.ifClosed.totalUtilizationIfClosed)}. Si cierras una, conserva la más antigua y sin cuota de manejo.
          </Text>
        </Card>
      ) : null}

      {/* Datos del extracto */}
      <GroupLabel title="Tus extractos" action={formOpen ? undefined : 'Agregar'} onAction={() => { setFormOpen(true); setF((x) => ({ ...x, closingDate: x.closingDate || today() })); }} />
      {formOpen ? (
        <Card>
          <Field label="Fecha de corte" value={f.closingDate} onChangeText={(v) => setF({ ...f, closingDate: v })} placeholder="2026-09-28" />
          <Field label="Fecha límite de pago" value={f.dueDate} onChangeText={(v) => setF({ ...f, dueDate: v })} placeholder="2026-10-15" />
          <Field label="Saldo al corte" value={f.balance} onChangeText={(v) => setF({ ...f, balance: v })} keyboardType="numeric" placeholder="4.180.000" />
          <Field label="Pago mínimo" value={f.minimum} onChangeText={(v) => setF({ ...f, minimum: v })} keyboardType="numeric" />
          <Field label="Pago total" value={f.total} onChangeText={(v) => setF({ ...f, total: v })} keyboardType="numeric" />
          <Field label="Cupo total" value={f.limit} onChangeText={(v) => setF({ ...f, limit: v })} keyboardType="numeric" />
          <Field label="Cuota de manejo (si la cobran)" value={f.fee} onChangeText={(v) => setF({ ...f, fee: v })} keyboardType="numeric" />
          {formError ? <Text style={{ color: colors.danger, ...type.small, marginBottom: 6 }}>{formError}</Text> : null}
          <Button title="Guardar extracto" onPress={() => void save()} loading={saving} />
          <Button title="Cancelar" variant="ghost" onPress={() => setFormOpen(false)} />
        </Card>
      ) : null}
      {statements.length === 0 && !formOpen ? (
        <Card>
          <Text style={{ color: colors.textMuted, ...type.small }}>
            <Ico name="document-text-outline" color={colors.textFaint} /> Con los datos de tu extracto (o enviándolo al bot de Telegram) Millo te dice cuánto pagar y si pagas solo el mínimo.
          </Text>
        </Card>
      ) : (
        statements.map((s) => (
          <View key={s.id} style={{ backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.xs, borderWidth: 1, borderColor: colors.border }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text, ...type.body, fontWeight: '600' }}>Corte {formatDate(s.closingDate)}</Text>
              <Text style={{ color: colors.text, ...type.body }}>{formatMoney(s.statementBalance)}</Text>
            </Row>
            <Text style={{ color: colors.textFaint, ...type.caption }}>
              {s.minimumPayment != null ? `Mínimo ${formatMoney(s.minimumPayment)}` : ''}
              {s.dueDate ? ` · paga hasta ${formatDate(s.dueDate)}` : ''}
              {s.creditLimit != null ? ` · cupo ${formatMoney(s.creditLimit)}` : ''}
            </Text>
          </View>
        ))
      )}
      <Text style={{ color: colors.textFaint, ...type.caption, textAlign: 'center', marginVertical: spacing.lg }}>
        Orientación educativa con tus datos; no es asesoría financiera regulada.
      </Text>
    </FormScroll>
  );
}
