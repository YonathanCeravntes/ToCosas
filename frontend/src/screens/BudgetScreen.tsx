import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../components/AppText';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Button, Card, ErrorState, Field, FormScroll, GroupLabel, Ico, IconButton, Row, SegmentBar, Skeleton } from '../components/ui';
import { colors, radius, spacing, type } from '../theme/colors';
import { formatMoney, parseAmount } from '../utils/format';
import { CashflowPlan, Category, MonthlyBudget, TeQueda } from '../api/types';
import { CategoryGlyph } from '../components/CategoryGlyph';
import { budgetApi, categoriesApi, debtsApi, incomeApi, insightsApi } from '../api/endpoints';
import { isProposal, ProposalCard } from '../components/ProposalCard';
import { useApi } from '../utils/useApi';
import { confirmRemove } from '../utils/confirm';
import { fixedOrder } from '../utils/fixedTypes';

/**
 * FIN-050 · "Mi mes" (antes Presupuesto), opción 1 del Fundador (2026-09-29):
 *  - La cuenta del mes a la vista: Te entra − Comprometido − Día a día = Libre.
 *    Es "Te queda" (§32) partido en tres; el backend entrega cada parte.
 *  - Lo comprometido, uno por uno: Pagado/Registrado o lo que Falta.
 *  - Con lo libre → el plan para liberar flujo (FIN-045).
 *  - Editar fijos e ingresos queda en un enlace discreto al final (FIN-047/048).
 * Esta pantalla no calcula nada: todo viene del backend.
 */
export function BudgetScreen() {
  const { data, loading, error, reload } = useApi(() => budgetApi.monthly(), [], { cacheKey: 'budget-monthly' });
  const plan = useApi(() => debtsApi.cashflowPlan(), [], { cacheKey: 'cashflow-plan' });
  // FIN-046 Fase 4: propuestas de gasto fijo / ingreso aparecen también aquí, donde aplican.
  const proposals = useApi(() => insightsApi.list().then((l) => l.filter(isProposal)), []);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const reloadPlan = plan.reload;
  const [editing, setEditing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      void reload();
      void reloadPlan();
      void proposals.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reload, reloadPlan]),
  );

  const refresh = React.useCallback(() => Promise.all([reload(), reloadPlan()]), [reload, reloadPlan]);

  if (error && !data) return <FormScroll><ErrorState message={error} onRetry={() => void refresh()} /></FormScroll>;
  if (!data) return <FormScroll><Skeleton hero lines={3} /><Skeleton lines={4} /></FormScroll>;

  const committedTotal = (data.teQueda.committedPaid ?? 0) + data.teQueda.protectedTotal;

  return (
    <FormScroll onRefresh={refresh}>
      <MonthCard teQueda={data.teQueda} label={data.period.label} loading={loading} />
      {/* FIN-056: con el mes vacío, la invitación va arriba (antes quedaba escondida al final). */}
      {data.incomes.length === 0 && !editing ? (
        <Pressable onPress={() => setEditing(true)} accessibilityRole="button" style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, backgroundColor: colors.surface }}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>Arma tu mes en un minuto</Text>
          <Text style={{ color: colors.textMuted, ...type.small, marginTop: 2 }}>Agrega lo que te entra y lo que pagas cada mes: así "Te queda" será real.</Text>
          <Text style={{ color: colors.primary, fontWeight: '800', marginTop: spacing.sm }}>Agregar ingresos y fijos →</Text>
        </Pressable>
      ) : null}
      <FreeMoney teQueda={data.teQueda} plan={plan.data} />
      {(proposals.data ?? []).map((p) => (
        <ProposalCard key={p.id} insight={p} onDone={() => void Promise.all([refresh(), proposals.reload()])} />
      ))}

      <CommittedList teQueda={data.teQueda} total={committedTotal} />
      {data.debtChargesSeparate > 0 ? (
        <Text style={{ color: colors.textFaint, ...type.caption, marginTop: -spacing.xs, marginBottom: spacing.sm }}>
          Las cuotas incluyen los seguros y cargos que pagas aparte.
        </Text>
      ) : null}

      {data.incomes.length > 0 ? (
        <>
          <GroupLabel title="Te entra" />
          <Card style={{ paddingVertical: 0 }}>
            {data.incomes.map((i, idx) => (
              <Row key={i.id} style={{ paddingVertical: 12, gap: spacing.sm, borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: colors.surfaceAlt }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>{i.name}</Text>
                  <Text style={{ color: colors.textMuted, ...type.small }}>{i.dayOfMonth ? `Llega el día ${i.dayOfMonth}` : 'Cada mes'}</Text>
                </View>
                <Text style={{ color: colors.primary, fontWeight: '800' }}>{formatMoney(i.amount)}</Text>
              </Row>
            ))}
          </Card>
        </>
      ) : null}

      <Pressable
        onPress={() => setEditing(!editing)}
        accessibilityRole="button"
        accessibilityState={{ expanded: editing }}
        style={{ alignItems: 'center', paddingVertical: spacing.md }}
      >
        <Text style={{ color: colors.primary, fontWeight: '800' }}>
          {editing ? 'Cerrar edición' : 'Editar fijos e ingresos'}
        </Text>
      </Pressable>
      {editing ? (
        <>
          <IncomesSection items={data.incomes} onChanged={refresh} onProfile={() => navigation.navigate('IncomeProfile')} />
          <ExpensesSection items={data.expenses} onChanged={refresh} />
        </>
      ) : null}

    </FormScroll>
  );
}

/** La cuenta del mes: Te entra − Comprometido − Día a día = Libre (misma fuente §32). */
function MonthCard({ teQueda, label, loading }: { teQueda: TeQueda; label: string; loading: boolean }) {
  const income = teQueda.incomeBase ?? 0;
  const committed = (teQueda.committedPaid ?? 0) + teQueda.protectedTotal;
  const daily = teQueda.dailySpent ?? 0;
  const free = teQueda.amount;
  const negative = free < 0;
  return (
    <Card>
      <Text style={{ color: colors.textMuted, ...type.small, marginBottom: spacing.sm }}>Así va tu plata · {label}</Text>
      <SegmentBar
        parts={[
          { key: 'comp', label: 'Comprometido', value: committed, color: colors.textMuted },
          { key: 'dia', label: 'Día a día', value: daily, color: colors.warning },
          { key: 'libre', label: 'Libre', value: Math.max(0, free), color: colors.primary },
        ]}
      />
      <View style={{ marginTop: spacing.md, gap: 8 }}>
        <EqLine label="Te entra" value={formatMoney(income)} bold />
        {/* FIN-057: la base se arma por partes; si hay plata extra (Didi, ventas…) se dice. */}
        {(teQueda.incomeVariableBase ?? 0) > 0 && (teQueda.incomeFixedBase ?? 0) > 0 ? (
          <Text style={{ color: colors.textFaint, ...type.small, marginTop: -4 }}>
            {formatMoney(teQueda.incomeFixedBase ?? 0)} de salario + {formatMoney(teQueda.incomeVariableBase ?? 0)} extra
          </Text>
        ) : null}
        <EqLine label="− Comprometido (fijos y deudas)" value={formatMoney(committed)} dot={colors.textMuted} />
        <EqLine label="− Día a día (ya gastado)" value={formatMoney(daily)} dot={colors.warning} />
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <Row style={{ justifyContent: 'space-between' }}>
          <Row style={{ gap: 8 }}>
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: negative ? colors.dangerDeep : colors.primary }} />
            <Text style={{ color: colors.text, fontWeight: '800' }}>= {negative ? 'Te falta' : 'Libre'}</Text>
          </Row>
          <Text style={{ color: negative ? colors.dangerDeep : colors.primary, fontSize: 22, fontWeight: '800' }}>
            {loading && !teQueda ? '…' : formatMoney(negative ? -free : free)}
          </Text>
        </Row>
      </View>
      <Text style={{ color: colors.textFaint, ...type.small, marginTop: spacing.sm }}>
        {teQueda.perDay !== null
          ? `Quedan ${teQueda.daysLeft} día${teQueda.daysLeft === 1 ? '' : 's'} · unos ${formatMoney(teQueda.perDay)} por día · hasta el ${shortDate(teQueda.until)}`
          : `Ciclo hasta el ${shortDate(teQueda.until)}`}
      </Text>
      {income === 0 ? (
        <Text style={{ color: colors.warningDeep, ...type.small, marginTop: 4 }}>
          Aún no tienes ingresos fijos. Agrégalos en "Editar fijos e ingresos" para ver tu mes completo.
        </Text>
      ) : null}
    </Card>
  );
}

function EqLine({ label, value, dot, bold }: { label: string; value: string; dot?: string; bold?: boolean }) {
  return (
    <Row style={{ justifyContent: 'space-between', gap: spacing.sm }}>
      <Row style={{ gap: 8, flex: 1 }}>
        {dot ? <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: dot }} /> : null}
        <Text style={{ color: colors.text, ...type.body }} numberOfLines={1}>{label}</Text>
      </Row>
      <Text style={{ color: colors.text, fontWeight: bold ? '800' : '700' }}>{value}</Text>
    </Row>
  );
}

/** Con lo libre: la jugada del plan (FIN-045); sin margen, aviso honesto. */
function FreeMoney({ teQueda, plan }: { teQueda: TeQueda; plan: CashflowPlan | null }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  if (teQueda.amount < 0) {
    return (
      <Card style={{ borderColor: colors.warning, borderWidth: 2 }}>
        <Text style={{ fontWeight: '800', fontSize: 15, color: colors.text }}>Este mes no alcanza para todo</Text>
        <Text style={{ color: colors.textMuted, marginTop: 4, ...type.small, lineHeight: 19 }}>
          Lo comprometido supera lo que entra. Mira qué gasto puedes mover: pequeños recortes cambian el cierre del mes.
        </Text>
        <Pressable onPress={() => navigation.navigate('Simulator', { scenario: 'reducir_gastos' })} accessibilityRole="link" style={{ marginTop: spacing.sm }}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>Simular un recorte →</Text>
        </Pressable>
      </Card>
    );
  }
  const step = plan?.steps[0];
  if (!plan || !step || plan.toDebt <= 0) return null;
  return (
    <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary }}>
      <Text style={{ color: colors.onPrimaryMuted, fontSize: 12, fontWeight: '800', letterSpacing: 0.8 }}>CON LO LIBRE</Text>
      <Text style={{ color: colors.textInverse, fontSize: 17, fontWeight: '800', marginTop: 6 }}>
        Abónale {formatMoney(plan.toDebt)} a {step.name}
      </Text>
      <Text style={{ color: colors.onPrimaryMuted, ...type.small, marginTop: 4, lineHeight: 19 }}>
        Te libera {formatMoney(step.payment)} al mes cuando la termines.
        {plan.toColchon > 0 ? ` Y guarda ${formatMoney(plan.toColchon)} para tu colchón.` : ''}
      </Text>
      <Pressable
        onPress={() => navigation.navigate('CashflowPlan')}
        accessibilityRole="button"
        style={{ alignSelf: 'flex-start', marginTop: spacing.md, backgroundColor: colors.surface, borderRadius: radius.full, paddingVertical: 9, paddingHorizontal: 16 }}
      >
        <Text style={{ color: colors.primaryDark, fontWeight: '800' }}>Ver mi plan</Text>
      </Pressable>
    </Card>
  );
}

/** Lo comprometido del ciclo, uno por uno: lo que falta primero (por fecha) y luego lo ya pagado. */
function CommittedList({ teQueda, total }: { teQueda: TeQueda; total: number }) {
  const paid = teQueda.paidCommitments ?? [];
  const pending = teQueda.pendingCommitments;
  if (paid.length === 0 && pending.length === 0) return null;
  const rows = [
    ...pending.map((c) => ({
      name: c.name,
      amount: c.amount,
      kind: c.kind,
      // §4.1-bis: si ya pasó su fecha y no se ha registrado, etiqueta neutra (nunca "pagado").
      sub: c.date === null ? 'Sin fecha fija' : c.datePassed ? `Ya pasó su fecha (${shortDate(c.date)})` : `${c.kind === 'cuota' ? 'Cuota' : 'Se registra solo'} · ${shortDate(c.date)}`,
      tag: 'Falta' as const,
    })),
    ...paid.map((c) => ({
      name: c.name,
      amount: c.amount,
      kind: c.kind,
      sub: c.kind === 'cuota' ? 'Pago registrado este mes' : 'Registrado este mes',
      tag: (c.kind === 'cuota' ? 'Pagado' : 'Registrado') as 'Pagado' | 'Registrado',
    })),
  ];
  return (
    <>
      <GroupLabel title={`Comprometido · ${formatMoney(total)}`} />
      <Card style={{ paddingVertical: 0 }}>
        {rows.map((r, i) => {
          const done = r.tag !== 'Falta';
          return (
            <Row key={`${r.tag}-${r.name}-${i}`} style={{ paddingVertical: 12, gap: spacing.sm, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.surfaceAlt }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: done ? colors.primarySoft : colors.warningSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Ico name={r.kind === 'cuota' ? 'card-outline' : 'home-outline'} color={done ? colors.primaryDark : colors.warningDeep} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>{r.name}</Text>
                <Text style={{ color: colors.textMuted, ...type.small }} numberOfLines={1}>{r.sub}</Text>
              </View>
              <Text style={{ fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden', color: done ? colors.primaryDark : colors.warningDeep, backgroundColor: done ? colors.primarySoft : colors.warningSoft }}>
                {r.tag}
              </Text>
              <Text style={{ color: colors.text, fontWeight: '800' }}>{formatMoney(r.amount)}</Text>
            </Row>
          );
        })}
      </Card>
      <Text style={{ color: colors.textFaint, ...type.caption, marginTop: -spacing.xs, marginBottom: spacing.sm }}>
        Lo que falta ya está apartado: no cuenta como libre.
      </Text>
    </>
  );
}

type Editable = { id: string; name: string; amount: number; dayOfMonth: number | null; notes?: string | null };

/** Fila editable (nombre, monto y día) — mismo patrón para ingresos y gastos fijos. */
function EditableRow({
  item,
  first,
  subtitle,
  amountColor,
  onSave,
  onRemove,
  leading,
  withNote,
}: {
  item: Editable;
  first: boolean;
  subtitle?: string;
  amountColor: string;
  onSave: (input: { name: string; amount: number; dayOfMonth: number | null; notes?: string | null }) => Promise<unknown>;
  onRemove: () => void;
  /** FIN-048: ícono del tipo y nota editable (gastos fijos). */
  leading?: React.ReactNode;
  withNote?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [amount, setAmount] = useState(String(Math.round(item.amount)));
  const [day, setDay] = useState(item.dayOfMonth ? String(item.dayOfMonth) : '');
  const [note, setNote] = useState(item.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    const value = parseAmount(amount); // §39
    const d = day.trim() ? parseInt(day, 10) : null;
    if (!name.trim() || Number.isNaN(value) || value <= 0) {
      setErr('Escribe el nombre y el monto mensual.');
      return;
    }
    if (d !== null && (Number.isNaN(d) || d < 1 || d > 31)) {
      setErr('El día debe estar entre 1 y 31.');
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await onSave({ name: name.trim(), amount: value, dayOfMonth: d, ...(withNote ? { notes: note.trim() || null } : {}) });
      setEditing(false);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ paddingVertical: 12, borderTopWidth: first ? 0 : 1, borderTopColor: colors.surfaceAlt }}>
      {editing ? (
        <View>
          <Field label="Nombre" value={name} onChangeText={setName} />
          <Row style={{ gap: spacing.sm, alignItems: 'flex-start' }}>
            <View style={{ flex: 2 }}>
              <Field label="Monto mensual" value={amount} onChangeText={setAmount} keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Día" value={day} onChangeText={setDay} keyboardType="numeric" placeholder="5" />
            </View>
          </Row>
          {withNote ? <Field label="Nota (opcional)" value={note} onChangeText={setNote} placeholder="Ej: apartamento 301, luz y agua…" /> : null}
          {err ? <Text style={{ color: colors.danger, marginBottom: 6 }}>{err}</Text> : null}
          <Row style={{ gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button title="Cancelar" variant="secondary" onPress={() => { setEditing(false); setErr(null); }} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Guardar" onPress={() => void save()} loading={saving} />
            </View>
          </Row>
        </View>
      ) : (
        <Row style={{ gap: spacing.sm }}>
          {leading}
          <Pressable
            style={{ flex: 1 }}
            onPress={() => setEditing(true)}
            accessibilityRole="button"
            accessibilityLabel={`Editar ${item.name}`}
          >
            <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>
              {item.name}
              {item.notes ? <Text style={{ color: colors.textMuted, fontWeight: '400' }}> · {item.notes}</Text> : null}
            </Text>
            <Text style={{ color: colors.textMuted, ...type.small }}>
              {subtitle ?? (item.dayOfMonth ? `Día ${item.dayOfMonth}` : 'Sin día fijo')}
            </Text>
          </Pressable>
          <Pressable onPress={() => setEditing(true)} accessibilityRole="button" accessibilityLabel={`Editar ${item.name}`}>
            <Text style={{ color: amountColor, fontWeight: '800' }}>
              {formatMoney(item.amount)} <Ico name="pencil-outline" color={colors.primary} />
            </Text>
          </Pressable>
          <IconButton icon="trash-outline" label={`Eliminar ${item.name}`} onPress={onRemove} />
        </Row>
      )}
    </View>
  );
}

/** Formulario de alta (se abre con "+ Agregar"). */
function NewItemForm({
  title,
  placeholder,
  onCreate,
  onDone,
}: {
  title: string;
  placeholder: string;
  onCreate: (input: { name: string; amount: number; dayOfMonth?: number }) => Promise<unknown>;
  onDone: () => void;
}) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const add = async () => {
    const value = parseAmount(amount); // §39
    if (!name.trim() || Number.isNaN(value) || value <= 0) {
      setErr('Escribe el nombre y el monto mensual.');
      return;
    }
    const d = day.trim() ? Math.min(31, Math.max(1, parseInt(day, 10))) : undefined;
    setSaving(true);
    setErr(null);
    try {
      await onCreate({ name: name.trim(), amount: value, dayOfMonth: Number.isNaN(d as number) ? undefined : d });
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Card>
      <Text style={{ fontWeight: '800', fontSize: 15, color: colors.text, marginBottom: spacing.sm }}>{title}</Text>
      <Field label="Nombre" value={name} onChangeText={setName} placeholder={placeholder} />
      <Row style={{ gap: spacing.sm, alignItems: 'flex-start' }}>
        <View style={{ flex: 2 }}>
          <Field label="Monto mensual" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="1.200.000" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Día del mes" value={day} onChangeText={setDay} keyboardType="numeric" placeholder="5" />
        </View>
      </Row>
      {err ? <Text style={{ color: colors.danger, marginBottom: 6 }}>{err}</Text> : null}
      <Button title="Agregar" onPress={() => void add()} loading={saving} />
    </Card>
  );
}

function IncomesSection({ items, onChanged, onProfile }: { items: MonthlyBudget['incomes']; onChanged: () => Promise<unknown>; onProfile: () => void }) {
  const [adding, setAdding] = useState(false);
  return (
    <>
      <GroupLabel title="Ingresos fijos" action={adding ? 'Cerrar' : '+ Agregar'} onAction={() => setAdding(!adding)} />
      {items.length > 0 ? (
        <Card style={{ paddingVertical: 0 }}>
          {items.map((i, idx) => (
            <EditableRow
              key={i.id}
              item={i}
              first={idx === 0}
              subtitle={i.dayOfMonth ? `Te llega el día ${i.dayOfMonth}` : 'Cada mes'}
              amountColor={colors.primary}
              onSave={async (input) => {
                await incomeApi.updateSource(i.id, { name: input.name, amount: input.amount, dayOfMonth: input.dayOfMonth ?? undefined });
                await onChanged();
              }}
              onRemove={() =>
                confirmRemove(i.name, 'Dejará de contar en tu ingreso.', async () => {
                  await incomeApi.removeSource(i.id);
                  await onChanged();
                })
              }
            />
          ))}
        </Card>
      ) : !adding ? (
        <Card><Text style={{ color: colors.textMuted, ...type.small }}>Aún no tienes ingresos fijos. Agrega tu salario o lo que te llega cada mes.</Text></Card>
      ) : null}
      {adding ? (
        <NewItemForm
          title="Nuevo ingreso fijo"
          placeholder="Salario, arriendo que recibes…"
          onCreate={async (input) => {
            await incomeApi.createSource({ name: input.name, amount: input.amount, dayOfMonth: input.dayOfMonth });
            await onChanged();
          }}
          onDone={() => setAdding(false)}
        />
      ) : null}
      <Pressable onPress={onProfile} accessibilityRole="link" style={{ marginTop: -spacing.xs, marginBottom: spacing.sm }}>
        <Text style={{ color: colors.primary, fontWeight: '700', ...type.small }}>Deducciones y tipo de ingreso → Mi perfil de ingresos</Text>
      </Pressable>
    </>
  );
}

/** FIN-047: cuándo se registró o se registrará solo este gasto fijo. */
function fixedStatus(e: MonthlyBudget['expenses'][number]): string {
  const c = e.thisCycle;
  if (!c) return e.dayOfMonth ? `Día ${e.dayOfMonth}` : 'Cada mes';
  if (c.status === 'registrado') return c.auto ? `Se registró solo el ${shortDate(c.date)}` : `Lo registraste el ${shortDate(c.date)}`;
  const past = new Date(c.date).getTime() < Date.now() - 86_400_000;
  return past ? 'Apartado este mes · se registra solo desde el próximo' : `Se registra solo el ${shortDate(c.date)}`;
}

function ExpensesSection({ items, onChanged }: { items: MonthlyBudget['expenses']; onChanged: () => Promise<unknown> }) {
  const [adding, setAdding] = useState(false);
  return (
    <>
      <GroupLabel title="Gastos fijos" action={adding ? 'Cerrar' : '+ Agregar'} onAction={() => setAdding(!adding)} />
      <Text style={{ color: colors.textMuted, ...type.small, marginTop: -spacing.xs, marginBottom: spacing.sm }}>
        Se registran solos el día que tocan: no tienes que anotarlos. Si igual lo registras, Millo lo cruza y no lo cuenta doble.
      </Text>
      {items.length > 0 ? (
        <Card style={{ paddingVertical: 0 }}>
          {items.map((e, idx) => (
            <EditableRow
              key={e.id}
              item={e}
              first={idx === 0}
              subtitle={fixedStatus(e)}
              amountColor={colors.text}
              withNote
              leading={<CategoryGlyph emoji={e.type?.icon} kind="gasto" color={e.type?.color} />}
              onSave={async (input) => {
                await budgetApi.updateFixed(e.id, { name: input.name, amount: input.amount, dayOfMonth: input.dayOfMonth ?? undefined, notes: input.notes ?? undefined });
                await onChanged();
              }}
              onRemove={() =>
                confirmRemove(e.name, 'Dejará de registrarse y de contar en tu presupuesto.', async () => {
                  await budgetApi.removeFixed(e.id);
                  await onChanged();
                })
              }
            />
          ))}
        </Card>
      ) : !adding ? (
        <Card><Text style={{ color: colors.textMuted, ...type.small }}>Agrega lo que pagas cada mes: arriendo, servicios, internet, suscripciones…</Text></Card>
      ) : null}
      {adding ? <NewFixedExpenseForm onChanged={onChanged} onDone={() => setAdding(false)} /> : null}
    </>
  );
}

/**
 * FIN-048 (Fundador, 2026-09-29): nuevo gasto fijo = elegir el TIPO (lista con ícono),
 * luego monto, día y una nota opcional con información de más. "Otro fijo" pide nombre.
 */
function NewFixedExpenseForm({ onChanged, onDone }: { onChanged: () => Promise<unknown>; onDone: () => void }) {
  const [types, setTypes] = useState<Category[]>([]);
  const [typeSel, setTypeSel] = useState<Category | null>(null);
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    categoriesApi
      .list('gasto')
      .then((c) => alive && setTypes(c.filter((x) => x.isFixed).sort((a, b) => fixedOrder(a.name) - fixedOrder(b.name))))
      .catch(() => alive && setTypes([]));
    return () => {
      alive = false;
    };
  }, []);

  const isOther = typeSel?.name === 'Otro fijo';
  const add = async () => {
    const value = parseAmount(amount); // §39
    if (!typeSel) return setErr('Elige el tipo de gasto fijo.');
    if (isOther && !note.trim()) return setErr('Escribe qué es (p. ej. "Cuota del carro de mi papá").');
    if (Number.isNaN(value) || value <= 0) return setErr('Escribe el monto mensual.');
    const d = day.trim() ? parseInt(day, 10) : undefined;
    if (d !== undefined && (Number.isNaN(d) || d < 1 || d > 31)) return setErr('El día debe estar entre 1 y 31.');
    setSaving(true);
    setErr(null);
    try {
      await budgetApi.createFixed({
        kind: 'gasto',
        name: isOther ? note.trim() : typeSel.name,
        amount: value,
        dayOfMonth: d,
        categoryId: typeSel.id,
        notes: isOther ? undefined : note.trim() || undefined,
      });
      await onChanged();
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <Text style={{ fontWeight: '800', fontSize: 15, color: colors.text, marginBottom: spacing.sm }}>Nuevo gasto fijo</Text>
      <Text style={{ color: colors.textMuted, ...type.small, fontWeight: '600', marginBottom: spacing.sm }}>¿Qué pagas cada mes?</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md }}>
        {types.map((t) => {
          const active = typeSel?.id === t.id;
          return (
            <Pressable
              key={t.id}
              onPress={() => setTypeSel(active ? null : t)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={t.name}
              style={{
                width: '30.5%', minHeight: 78, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', padding: 6, gap: 4,
                backgroundColor: active ? colors.primarySoft : colors.surface, borderWidth: active ? 2 : 1, borderColor: active ? colors.primary : colors.border,
              }}
            >
              <CategoryGlyph emoji={t.icon} kind="gasto" color={t.color} />
              <Text style={{ color: active ? colors.primaryDark : colors.text, fontSize: 11, fontWeight: active ? '800' : '600', textAlign: 'center' }} numberOfLines={2} adjustsFontSizeToFit>
                {t.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {typeSel ? (
        <>
          <Row style={{ gap: spacing.sm, alignItems: 'flex-start' }}>
            <View style={{ flex: 2 }}>
              <Field label="Monto mensual" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="1.200.000" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Día del mes" value={day} onChangeText={setDay} keyboardType="numeric" placeholder="5" />
            </View>
          </Row>
          <Field
            label={isOther ? '¿Qué es?' : 'Nota (opcional)'}
            value={note}
            onChangeText={setNote}
            placeholder={isOther ? 'Ej: cuota del carro de mi papá' : 'Ej: apartamento 301, luz y agua…'}
          />
        </>
      ) : null}
      {err ? <Text style={{ color: colors.danger, marginBottom: 6 }}>{err}</Text> : null}
      <Button title="Agregar gasto fijo" onPress={() => void add()} loading={saving} disabled={!typeSel} />
    </Card>
  );
}

/** Fecha corta "28 sep" (mismo formato de Inicio). */
function shortDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' }).replace('.', '');
}
