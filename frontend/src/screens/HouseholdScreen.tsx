import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, Share, Switch, View } from 'react-native';
import { Text } from '../components/AppText';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Chip, ErrorState, Field, FormScroll, GroupLabel, Money, Pill, ProgressBar, Row, SegmentBar, Skeleton } from '../components/ui';
import { chartColors, colors, radius, spacing, type } from '../theme/colors';
import { formatMoney, parseAmount } from '../utils/format';
import { debtsApi, budgetApi, householdApi } from '../api/endpoints';
import { Debt, FixedItem, HouseholdMonth, HouseholdState, toNumber } from '../api/types';

/* Colores de persona en el hogar (FIN-060): colors.primary = tú, colors.partner = tu pareja. Lo de la casa va en neutros. */
/** Tarjeta plana (vacíos y cuadre): no compite con los datos. */
const FLAT = { backgroundColor: colors.surfaceAlt, borderColor: colors.surfaceAlt } as const;

const shortDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : '';

/**
 * FIN-059 · Millo en pareja (Fundador, 2026-10-03, "Aprobado. Darle, de una").
 * "Tuyo, mío y nuestro": cada uno con su Millo privado y "Nuestro mes" con lo de la casa,
 * el aporte justo, el cuadre, las metas juntos y la privacidad con salida de un toque.
 */
export function HouseholdScreen() {
  const [state, setState] = useState<HouseholdState | null>(null);
  const [month, setMonth] = useState<HouseholdMonth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError(null);
    try {
      const s = await householdApi.state();
      setState(s);
      setMonth(s.household?.partner ? await householdApi.month() : null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (error && !state) return <FormScroll><ErrorState message={error} onRetry={() => void load()} /></FormScroll>;
  if (loading && !state) return <FormScroll><Skeleton hero lines={3} /><Skeleton lines={4} /></FormScroll>;
  const h = state?.household ?? null;

  return (
    <FormScroll onRefresh={load}>
      {!h ? <Welcome onDone={setState} /> : null}
      {h && !h.partner ? <WaitingPartner household={h} onChanged={setState} /> : null}
      {h && h.partner && month ? <OurMonth month={month} household={h} onChanged={load} /> : null}
      {h ? <HouseItems onChanged={load} /> : null}
      {h ? <Privacy household={h} onChanged={load} onLeft={() => { setState({ household: null }); setMonth(null); }} /> : null}
    </FormScroll>
  );
}

// ---------------------------------------------------------------------------
// Antes de entrar: qué es, qué se comparte y qué no, consentimiento
// ---------------------------------------------------------------------------

function Welcome({ onDone }: { onDone: (s: HouseholdState) => void }) {
  const [accepted, setAccepted] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const run = async (what: 'create' | 'join') => {
    if (!accepted) { setErr('Para seguir, acepta cómo se comparten los datos.'); return; }
    if (what === 'join' && code.trim().length < 4) { setErr('Escribe el código que te pasó tu pareja.'); return; }
    setBusy(what); setErr(null);
    try {
      onDone(what === 'create' ? await householdApi.create() : await householdApi.join(code));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <Card>
        <Row style={{ gap: spacing.sm, alignItems: 'center' }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="heart-outline" size={20} color={colors.primary} />
          </View>
          <Text style={{ color: colors.text, ...type.title, flex: 1 }}>La plata de la casa, en pareja</Text>
        </Row>
        <Text style={{ color: colors.textMuted, ...type.body, marginTop: spacing.sm }}>
          Cada uno sigue con su Millo. Juntos ven lo de la casa: cuánto les queda, cuánto pone cada uno según lo que gana, quién le pasa a quién al final del mes y sus metas.
        </Text>
      </Card>

      <GroupLabel title="Qué se comparte y qué no" />
      <Card>
        {[
          { icon: 'home-outline', t: 'Solo lo que marques "de la casa"', d: 'Arriendo, mercado, servicios, las deudas de los dos.' },
          { icon: 'lock-closed-outline', t: 'Tus gastos personales son privados', d: 'Tu pareja nunca ve en qué gastas lo tuyo.' },
          { icon: 'pie-chart-outline', t: 'Del ingreso, solo el porcentaje', d: 'Y solo si lo activas, para el aporte justo. Nunca el monto.' },
          { icon: 'exit-outline', t: 'Sales cuando quieras, en un toque', d: 'Sin pedir permiso. Cada uno se lleva lo suyo.' },
        ].map((x, i) => (
          <Row key={x.t} style={{ gap: spacing.sm, alignItems: 'flex-start', marginTop: i === 0 ? 0 : spacing.sm }}>
            <Ionicons name={x.icon as never} size={18} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, ...type.body, fontWeight: '600' }}>{x.t}</Text>
              <Text style={{ color: colors.textFaint, ...type.small }}>{x.d}</Text>
            </View>
          </Row>
        ))}
        <Pressable
          onPress={() => setAccepted(!accepted)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: accepted }}
          style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center', marginTop: spacing.md, paddingTop: spacing.sm, minHeight: 44, borderTopWidth: 1, borderTopColor: colors.surfaceAlt }}
        >
          <Ionicons name={accepted ? 'checkbox' : 'square-outline'} size={22} color={accepted ? colors.primary : colors.textMuted} />
          <Text style={{ color: colors.text, ...type.small, flex: 1 }}>
            Acepto compartir con mi pareja solo lo de la casa, como se explica arriba (Ley 1581). Puedo cambiarlo o salir cuando quiera.
          </Text>
        </Pressable>
      </Card>

      {err ? <Text style={{ color: colors.danger, ...type.small, marginTop: spacing.sm }}>{err}</Text> : null}
      <Button title="Crear y invitar a mi pareja" icon="person-add-outline" onPress={() => void run('create')} loading={busy === 'create'} />

      <GroupLabel title="¿Tu pareja ya te invitó?" />
      <Card>
        <Field label="Código de invitación" value={code} onChangeText={(t) => setCode(t.toUpperCase())} autoCapitalize="characters" placeholder="K7M2QX" />
        <Button title="Unirme" variant="secondary" onPress={() => void run('join')} loading={busy === 'join'} />
      </Card>
    </>
  );
}

// ---------------------------------------------------------------------------
// Esperando a la pareja: el código para compartir
// ---------------------------------------------------------------------------

function WaitingPartner({ household, onChanged }: { household: NonNullable<HouseholdState['household']>; onChanged: (s: HouseholdState) => void }) {
  const [busy, setBusy] = useState(false);
  const code = household.invite?.code ?? null;
  const message = code
    ? `Únete a nuestro Millo en pareja: abre Millo → Más → Millo en pareja → "Unirme" y escribe el código ${code}. Vence en 7 días.`
    : '';

  const share = async () => {
    try { await Share.share({ message }); } catch { /* cancelado */ }
  };
  const fresh = async () => {
    setBusy(true);
    try { onChanged(await householdApi.invite()); } finally { setBusy(false); }
  };

  return (
    <>
      <Card>
        <Text style={{ color: colors.textFaint, ...type.small }}>Esperando a tu pareja</Text>
        <Text style={{ color: colors.text, ...type.title, marginTop: 2 }}>Pásale este código</Text>
        {code ? (
          <>
            <Text selectable style={{ color: colors.primary, fontSize: 36, fontWeight: '600', letterSpacing: 6, textAlign: 'center', marginVertical: spacing.md, fontVariant: ['tabular-nums'] }}>{code}</Text>
            <Text style={{ color: colors.textFaint, ...type.small, textAlign: 'center' }}>Vence el {shortDate(household.invite!.expiresAt)}. Tu pareja lo escribe en Más → Millo en pareja → Unirme.</Text>
            <Button title="Compartir el código" icon="share-social-outline" onPress={() => void share()} />
          </>
        ) : (
          <Text style={{ color: colors.textMuted, ...type.body, marginTop: spacing.sm }}>El código anterior venció.</Text>
        )}
        <Button title="Generar un código nuevo" variant="ghost" onPress={() => void fresh()} loading={busy} />
      </Card>
      <Text style={{ color: colors.textFaint, ...type.small, marginTop: spacing.sm }}>
        Mientras tanto ya puedes marcar gastos, gastos fijos y deudas como "de la casa": cuando tu pareja entre, aparecen en Nuestro mes.
      </Text>
    </>
  );
}

// ---------------------------------------------------------------------------
// Nuestro mes
// ---------------------------------------------------------------------------

function OurMonth({ month, household, onChanged }: { month: HouseholdMonth; household: NonNullable<HouseholdState['household']>; onChanged: () => void }) {
  const partner = household.partner!.name;
  const leftKnown = month.left !== null;
  const pendingFixed = month.fixed.reduce((a, f) => a + f.pending, 0);
  const pendingDebts = month.debts.reduce((a, d) => a + d.pending, 0);

  return (
    <>
      <Row style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
        <Text style={{ color: colors.text, ...type.heading }} accessibilityRole="header">Nuestro mes</Text>
        <Row>
          <Avatar letter="T" color={colors.primary} />
          <Avatar letter={partner.charAt(0)} color={colors.partner} overlap />
        </Row>
      </Row>

      <Card>
        <Text style={{ color: colors.textFaint, ...type.small }}>
          {leftKnown ? `Nos queda para la casa · ${month.period.label}` : `Van de la casa · ${month.period.label}`}
        </Text>
        <Money
          value={leftKnown ? Math.abs(month.left!) : month.spent}
          size={36}
          color={leftKnown && (month.left ?? 0) < 0 ? colors.dangerDeep : colors.text}
          style={{ marginVertical: 2 }}
        />
        <Text style={{ color: colors.textMuted, ...type.small }}>
          {leftKnown
            ? `${(month.left ?? 0) < 0 ? 'Nos pasamos ' : ''}de ${formatMoney(month.budget!)} para la casa · ${formatMoney(month.spent)} ya salió · ${formatMoney(month.committedPending)} por pagar`
            : month.committedPending > 0
              ? `Faltan ${formatMoney(month.committedPending)} de fijos y cuotas de la casa`
              : 'Pongan cuánto quieren gastar en la casa para ver cuánto les queda'}
        </Text>
        {month.spent + month.committedPending > 0 ? (
          <View style={{ marginTop: spacing.sm }}>
            <SegmentBar
              height={10}
              parts={[
                { key: 'salio', label: 'Ya salió', value: month.spent, color: colors.textMuted },
                { key: 'fijos', label: 'Fijos por pagar', value: pendingFixed, color: colors.primary },
                { key: 'cuotas', label: 'Cuotas por pagar', value: pendingDebts, color: chartColors[4] },
                ...(leftKnown && (month.left ?? 0) > 0 ? [{ key: 'libre', label: 'Libre', value: month.left!, color: colors.border }] : []),
              ]}
            />
          </View>
        ) : null}
      </Card>

      <FairShareCard month={month} household={household} onChanged={onChanged} />

      {month.fixed.length || month.debts.length ? (
        <>
          <GroupLabel title="Fijos y cuotas de la casa" />
          <Card>
            {month.fixed.map((f) => (
              <Line key={f.id} label={f.name} sub={`${f.owner}${f.dayOfMonth ? ` · día ${f.dayOfMonth}` : ''}${f.pending > 0 ? ` · faltan ${formatMoney(f.pending)}` : ' · pagado'}`} value={formatMoney(f.amount)} />
            ))}
            {month.debts.map((d) => (
              <Line key={d.id} label={d.name} sub={`Cuota · ${d.owner}${d.nextDueDate ? ` · vence ${shortDate(d.nextDueDate)}` : ''}${d.pending > 0 ? ` · faltan ${formatMoney(d.pending)}` : ' · al día'}`} value={formatMoney(d.monthly)} tone={colors.debt} />
            ))}
          </Card>
        </>
      ) : null}

      {month.partnerDebts.length ? (
        <>
          <GroupLabel title={`Deudas de ${partner}`} />
          <Card>
            {month.partnerDebts.map((p) => (
              <View key={p.name}>
                <Line label={`${p.count} deuda${p.count === 1 ? '' : 's'}`} sub={`Debe ${formatMoney(p.balance)} en total`} value={`${formatMoney(p.monthly)}/mes`} tone={colors.debt} />
              </View>
            ))}
            <Text style={{ color: colors.textFaint, ...type.caption, marginTop: 4 }}>{partner} eligió mostrarte solo estos totales.</Text>
          </Card>
        </>
      ) : null}

      <Goals month={month} onChanged={onChanged} />

      {month.recent.length ? (
        <>
          <GroupLabel title="Lo último de la casa" />
          <Card style={{ paddingVertical: 4 }}>
            {month.recent.slice(0, 8).map((t, i) => (
              <Row key={t.id} style={{ justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.surfaceAlt, gap: spacing.sm }}>
                <Row style={{ gap: spacing.sm, flex: 1 }}>
                  <Avatar letter={t.isMe ? 'T' : t.who.charAt(0)} color={t.isMe ? colors.primary : colors.partner} small />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, ...type.body }} numberOfLines={1}>{t.label}</Text>
                    <Text style={{ color: colors.textFaint, ...type.caption }}>{t.who} · {shortDate(t.occurredAt)}</Text>
                  </View>
                </Row>
                <Text style={{ color: colors.text, ...type.body, fontWeight: '600' }}>{formatMoney(t.amount)}</Text>
              </Row>
            ))}
          </Card>
        </>
      ) : (
        <Card style={[FLAT, { marginTop: spacing.md }]}>
          <Text style={{ color: colors.textFaint, ...type.label, marginBottom: 4 }}>Mes sin gastos de la casa</Text>
          <Text style={{ color: colors.textFaint, ...type.small }}>
            Aún no hay gastos de la casa este mes. Al registrar, elige "De la casa", o escríbele al bot "mercado 186.000 casa".
          </Text>
        </Card>
      )}
    </>
  );
}

function FairShareCard({ month, household, onChanged }: { month: HouseholdMonth; household: NonNullable<HouseholdState['household']>; onChanged: () => void }) {
  const f = month.fair;
  const setMode = async (mode: 'proporcional' | 'mitad') => {
    await householdApi.update({ splitMode: mode }).catch(() => undefined);
    onChanged();
  };
  return (
    <>
      <GroupLabel title="Aporte justo" />
      <Card>
        <Row style={{ gap: 6, marginBottom: spacing.sm }}>
          <Chip label="Según lo que gana cada uno" active={household.splitMode === 'proporcional'} onPress={() => void setMode('proporcional')} />
          <Chip label="Mitad y mitad" active={household.splitMode === 'mitad'} onPress={() => void setMode('mitad')} />
        </Row>
        {f.rows.length > 1 ? (
          <SegmentBar height={10} parts={f.rows.map((r) => ({ key: r.who, label: `${r.who} ${r.percent} %`, value: Math.max(r.percent, 0.01), color: r.isMe ? colors.primary : colors.partner }))} />
        ) : null}
        {f.rows.map((r) => (
          <View key={r.who} style={{ marginTop: spacing.sm }}>
            <Row style={{ justifyContent: 'space-between', marginBottom: 5 }}>
              <Text style={{ color: r.isMe ? colors.primary : colors.partner, ...type.body, fontWeight: '600' }}>{r.who} · {r.percent} %</Text>
              <Text style={{ color: colors.text, ...type.body, fontWeight: '600' }}>
                {formatMoney(r.paid)} <Text style={{ color: colors.textFaint, ...type.small, fontWeight: '400' }}>de {formatMoney(r.due)}</Text>
              </Text>
            </Row>
            <ProgressBar value={r.due > 0 ? Math.min(1, r.paid / r.due) : 0} color={r.isMe ? colors.primary : colors.partner} height={6} label={`${r.who} puso ${formatMoney(r.paid)} de ${formatMoney(r.due)}`} />
          </View>
        ))}
        {f.fallbackReason === 'sin_ingreso_compartido' ? (
          <Text style={{ color: colors.warningDeep, ...type.small, marginTop: spacing.sm }}>
            Va mitad y mitad porque alguno no ha activado "Compartir mi proporción de ingreso" en Privacidad.
          </Text>
        ) : null}
        {f.settlement ? (
          <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 12, marginTop: spacing.md }}>
            <Text style={{ color: colors.text, ...type.body, fontWeight: '600' }}>
              {f.settlement.fromIsMe ? `Le pasas ${formatMoney(f.settlement.amount)} a ${f.settlement.to}` : `${f.settlement.from} te pasa ${formatMoney(f.settlement.amount)}`} para quedar parejos
            </Text>
            <Text style={{ color: colors.textFaint, ...type.caption, marginTop: 2 }}>Es el cuadre de lo que va del mes; al cierre queda el definitivo.</Text>
          </View>
        ) : f.total > 0 ? (
          <Text style={{ color: colors.primary, ...type.small, marginTop: spacing.sm, fontWeight: '600' }}>Van parejos este mes.</Text>
        ) : null}
      </Card>
    </>
  );
}

function Goals({ month, onChanged }: { month: HouseholdMonth; onChanged: () => void }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [give, setGive] = useState<{ id: string; amount: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const add = async () => {
    const amount = parseAmount(target);
    if (!name.trim() || !amount) { setErr('Ponle nombre y monto a la meta.'); return; }
    try {
      await householdApi.createGoal({ name: name.trim(), targetAmount: amount });
      setAdding(false); setName(''); setTarget(''); setErr(null);
      onChanged();
    } catch (e) { setErr((e as Error).message); }
  };
  const contribute = async () => {
    if (!give) return;
    const amount = parseAmount(give.amount);
    if (!amount) return;
    try {
      await householdApi.contribute(give.id, amount);
      setGive(null);
      onChanged();
    } catch (e) { setErr((e as Error).message); }
  };

  return (
    <>
      <GroupLabel title="Metas juntos" action={adding ? 'Cerrar' : '+ Nueva'} onAction={() => setAdding(!adding)} />
      {adding ? (
        <Card>
          <Field label="¿Para qué ahorran?" value={name} onChangeText={setName} placeholder="Viaje a Cartagena" />
          <Field label="¿Cuánto necesitan?" value={target} onChangeText={setTarget} keyboardType="numeric" placeholder="3.000.000" />
          {err ? <Text style={{ color: colors.danger, ...type.small }}>{err}</Text> : null}
          <Button title="Crear meta" onPress={() => void add()} />
        </Card>
      ) : null}
      {month.goals.length === 0 && !adding ? (
        <Card style={FLAT}>
          <Text style={{ color: colors.textFaint, ...type.label, marginBottom: 4 }}>Sin metas todavía</Text>
          <Text style={{ color: colors.textMuted, ...type.body }}>El viaje, la cuota inicial, el colchón de la casa: créenla y cada uno va sumando.</Text>
        </Card>
      ) : null}
      {month.goals.map((g) => (
        <Card key={g.id}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm }}>
            <Text style={{ color: colors.text, ...type.body, fontWeight: '600', flex: 1 }}>{g.name}</Text>
            <Pill label={`${g.percent} %`} tone="gold" />
          </Row>
          <Text style={{ color: colors.textMuted, ...type.small }}>{formatMoney(g.saved)} de {formatMoney(g.target)}</Text>
          <View style={{ marginTop: 6 }}><ProgressBar value={g.percent / 100} color={colors.gold} height={8} label={`${g.name} ${g.percent}%`} /></View>
          <Text style={{ color: colors.textFaint, ...type.caption, marginTop: 5 }}>
            {g.byMember.map((b, i) => (
              <Text key={b.who}>
                {i > 0 ? ' · ' : ''}
                <Text style={{ color: month.members.find((m) => m.who === b.who)?.isMe ? colors.primary : colors.partner }}>{'\u25CF'} </Text>
                {`${b.who}: ${formatMoney(b.amount)}`}
              </Text>
            ))}
            {g.percent >= 100 ? ' · ¡Lo lograron!' : g.eta ? ` · a este ritmo llegan en ${new Date(g.eta).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}` : ''}
          </Text>
          {give?.id === g.id ? (
            <View style={{ marginTop: spacing.sm }}>
              <Field label="¿Cuánto pusiste?" value={give.amount} onChangeText={(t) => setGive({ id: g.id, amount: t })} keyboardType="numeric" placeholder="200.000" />
              <Row style={{ gap: spacing.sm }}>
                <View style={{ flex: 1 }}><Button title="Cancelar" variant="secondary" onPress={() => setGive(null)} /></View>
                <View style={{ flex: 1 }}><Button title="Sumar" onPress={() => void contribute()} /></View>
              </Row>
            </View>
          ) : g.percent < 100 ? (
            <Pressable onPress={() => setGive({ id: g.id, amount: '' })} accessibilityRole="button" style={{ marginTop: spacing.sm, minHeight: 32, justifyContent: 'center' }}>
              <Text style={{ color: colors.primary, ...type.body, fontWeight: '600' }}>+ Sumar lo que puse</Text>
            </Pressable>
          ) : null}
        </Card>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Lo de la casa: qué gastos fijos y deudas propias cuentan en el hogar
// ---------------------------------------------------------------------------

function HouseItems({ onChanged }: { onChanged: () => void }) {
  const [fixed, setFixed] = useState<FixedItem[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const [f, d] = await Promise.all([budgetApi.listFixed().catch(() => []), debtsApi.list().catch(() => [])]);
    setFixed(f.filter((x) => x.kind === 'gasto' && x.isActive));
    setDebts(d.filter((x) => x.status === 'activa'));
  }, []);
  useEffect(() => { if (open) void load(); }, [open, load]);

  const toggleFixed = async (f: FixedItem, on: boolean) => {
    setFixed((cur) => cur.map((x) => (x.id === f.id ? { ...x, householdId: on ? 'si' : null } : x)));
    await budgetApi.updateFixed(f.id, { household: on }).catch(() => undefined);
    onChanged();
  };
  const toggleDebt = async (d: Debt, on: boolean) => {
    setDebts((cur) => cur.map((x) => (x.id === d.id ? { ...x, householdId: on ? 'si' : null } : x)));
    await householdApi.shareDebt(d.id, on).catch(() => undefined);
    onChanged();
  };

  return (
    <>
      <GroupLabel title="Lo tuyo que es de la casa" action={open ? 'Cerrar' : 'Elegir'} onAction={() => setOpen(!open)} />
      {open ? (
        <Card>
          <Text style={{ color: colors.textMuted, ...type.small, marginBottom: spacing.sm }}>Marca tus gastos fijos y deudas que son de los dos. Lo demás sigue siendo solo tuyo.</Text>
          {fixed.length === 0 && debts.length === 0 ? <Text style={{ color: colors.textFaint, ...type.small }}>No tienes gastos fijos ni deudas activas.</Text> : null}
          {fixed.map((f) => (
            <ToggleRow key={f.id} label={f.name} sub={`Gasto fijo · ${formatMoney(toNumber(f.amount))}`} value={!!f.householdId} onChange={(v) => void toggleFixed(f, v)} />
          ))}
          {debts.map((d) => (
            <ToggleRow key={d.id} label={d.name} sub="Deuda · su cuota cuenta en Nuestro mes" value={!!d.householdId} onChange={(v) => void toggleDebt(d, v)} />
          ))}
        </Card>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// Privacidad y salir
// ---------------------------------------------------------------------------

function Privacy({ household, onChanged, onLeft }: { household: NonNullable<HouseholdState['household']>; onChanged: () => void; onLeft: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [budget, setBudget] = useState(household.monthlyBudget ? String(Math.round(household.monthlyBudget)) : '');
  const partner = household.partner?.name ?? 'tu pareja';

  const setMe = async (patch: { shareIncome?: boolean; shareDebts?: boolean }) => {
    await householdApi.updateMe(patch).catch(() => undefined);
    onChanged();
  };
  const saveBudget = async () => {
    const n = parseAmount(budget);
    await householdApi.update({ monthlyBudget: n > 0 ? n : null }).catch(() => undefined);
    onChanged();
  };
  const leave = async () => {
    setBusy(true);
    try {
      await householdApi.leave();
      onLeft();
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <>
      <GroupLabel title="Presupuesto de la casa" />
      <Card>
        <Field label="¿Cuánto quieren gastar en la casa al mes?" value={budget} onChangeText={setBudget} keyboardType="numeric" placeholder="3.840.000" hint="Con este monto Millo les dice cuánto les queda. Déjalo vacío si no lo quieren usar." />
        <Button title="Guardar" variant="secondary" onPress={() => void saveBudget()} />
      </Card>

      <GroupLabel title="Tu privacidad" />
      <Card>
        <ToggleRow label="Compartir mi proporción de ingreso" sub={`Para el aporte justo. ${partner} ve solo el porcentaje, nunca el monto.`} value={household.me.shareIncome} onChange={(v) => void setMe({ shareIncome: v })} />
        <ToggleRow label="Mostrar el total de mis deudas" sub="Solo la cuota del mes y el saldo total. Nunca las compras ni los nombres." value={household.me.shareDebts} onChange={(v) => void setMe({ shareDebts: v })} />
        <ToggleRow label="Mis gastos personales" sub="Siempre privados. No se pueden compartir." value={false} disabled onChange={() => undefined} />
      </Card>

      {confirming ? (
        <Card style={{ borderColor: colors.danger, borderWidth: 1 }}>
          <Text style={{ color: colors.text, ...type.body, fontWeight: '600' }}>¿Salir de Millo en pareja?</Text>
          <Text style={{ color: colors.textMuted, ...type.small, marginTop: 4 }}>
            Dejas de compartir al instante. Tus gastos fijos y deudas vuelven a ser solo tuyos. No necesitas el permiso de {partner}.
          </Text>
          <Row style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            <View style={{ flex: 1 }}><Button title="Cancelar" variant="secondary" onPress={() => setConfirming(false)} /></View>
            <View style={{ flex: 1 }}><Button title="Salir" variant="danger" onPress={() => void leave()} loading={busy} /></View>
          </Row>
        </Card>
      ) : (
        <Pressable onPress={() => setConfirming(true)} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center', alignItems: 'center', marginTop: spacing.sm }}>
          <Text style={{ color: colors.danger, ...type.body, fontWeight: '600' }}>Salir de Millo en pareja</Text>
        </Pressable>
      )}
      <Text style={{ color: colors.textFaint, ...type.caption, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.lg }}>
        Controlar la plata de la pareja es una forma de violencia. Si necesitas ayuda: Línea Púrpura 01 8000 112 137 (Bogotá) o Línea 155 (nacional).
      </Text>
    </>
  );
}

// ---------------------------------------------------------------------------

function ToggleRow({ label, sub, value, onChange, disabled }: { label: string; sub: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <Row style={{ justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.surfaceAlt, opacity: disabled ? 0.55 : 1 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: disabled ? colors.textMuted : colors.text, ...type.body, fontWeight: '600' }}>{label}</Text>
        <Text style={{ color: colors.textFaint, ...type.caption }}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={Platform.OS === 'android' ? colors.surface : undefined}
        accessibilityLabel={label}
      />
    </Row>
  );
}

function Line({ label, sub, value, tone }: { label: string; sub: string; value: string; tone?: string }) {
  return (
    <Row style={{ justifyContent: 'space-between', paddingVertical: 6, gap: spacing.sm }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, ...type.body, fontWeight: '600' }} numberOfLines={1}>{label}</Text>
        <Text style={{ color: colors.textFaint, ...type.caption }}>{sub}</Text>
      </View>
      <Text style={{ color: tone ?? colors.text, ...type.body, fontWeight: '600' }}>{value}</Text>
    </Row>
  );
}

function Avatar({ letter, color, overlap, small }: { letter: string; color: string; overlap?: boolean; small?: boolean }) {
  const size = small ? 24 : 30;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.bg, marginLeft: overlap ? -8 : 0 }}>
      <Text style={{ color: colors.textInverse, fontSize: small ? 11 : 13, fontWeight: '600' }}>{letter.toUpperCase()}</Text>
    </View>
  );
}
