import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { DatePicker } from '../../components/DatePicker';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Field, IconButton, Row, Toast, ToastSpec } from '../../components/ui';
import { CategoryGlyph } from '../../components/CategoryGlyph';
import { colors, radius, spacing, type } from '../../theme/colors';
import { Category, Debt, TxKind } from '../../api/types';
import { budgetApi, categoriesApi, debtsApi, gamificationApi, transactionsApi } from '../../api/endpoints';
import { transactionsRepo } from '../../offline/transactionsRepo';
import { runSync } from '../../offline/syncEngine';
import { formatLocalDate, formatMoney, parseAmount } from '../../utils/format';

/**
 * FIN-035 · Registrar como puerta única del ecosistema.
 *
 * Una decisión por pantalla: "¿qué registrar?" → el flujo se ARMA según la elección
 * pidiendo lo mínimo (guardarraíl H). El efectivo NUNCA pregunta cuotas; la tarjeta
 * solo pide los deltas y reusa el path de compra de FIN-031 (el MISMO motor que el bot).
 *
 * SPRINT-PULIDO-001 (Fundador, 2026-07-18):
 *  P0-1 · Pila de pasos REAL + botón "Atrás" que restaura lo diligenciado (nunca lo
 *         borra) + el botón físico/gesto de Android hace `pop` en vez de saltar de pestaña.
 *  P1   · Acuse contextual para los 3 tipos (ingreso incluido), consecuencias en lenguaje
 *         humano, y el fallback offline conserva el contexto.
 *  P2   · "Deshacer" con cuenta regresiva visible (Toast) y logros in-line.
 *
 * Patrón de confirmación (DEC-0035): commit + acuse + deshacer. El acuse ENUMERA lo
 * que se movió (§42) y "Deshacer" revierte reusando `transactions.remove`/`voidPurchase`.
 */

type Flow = 'gasto' | 'ingreso' | 'pago_deuda';
type Step = 'tipo' | 'monto' | 'metodo' | 'detalle' | 'tarjeta' | 'cuotas' | 'deuda' | 'acuse';
type PayMethod = 'efectivo' | 'cuenta' | 'debito' | 'credito' | 'billetera';

const UNDO_SECONDS = 12;

const FLOWS: Array<{ key: Flow; label: string; icon: React.ComponentProps<typeof Ionicons>['name']; sub: string }> = [
  { key: 'gasto', label: 'Un gasto', icon: 'cart-outline', sub: 'Compré o pagué algo' },
  { key: 'ingreso', label: 'Un ingreso', icon: 'cash-outline', sub: 'Me entró plata' },
  { key: 'pago_deuda', label: 'Un pago de deuda', icon: 'card-outline', sub: 'Le aboné a una deuda' },
];

const METHODS: Array<{ key: PayMethod; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = [
  { key: 'efectivo', label: 'Efectivo', icon: 'cash-outline' },
  { key: 'cuenta', label: 'Cuenta / transferencia', icon: 'business-outline' },
  { key: 'debito', label: 'Débito', icon: 'card-outline' },
  { key: 'credito', label: 'Tarjeta de crédito', icon: 'card' },
  { key: 'billetera', label: 'Billetera (Nequi…)', icon: 'phone-portrait-outline' },
];

const STEP_TITLE: Record<Step, string> = {
  tipo: '¿Qué quieres registrar?',
  monto: '¿Cuánto?',
  metodo: '¿Cómo pagaste?',
  tarjeta: '¿Con cuál tarjeta?',
  cuotas: '¿A cuántas cuotas?',
  deuda: '¿A cuál deuda le abonaste?',
  detalle: 'Un último detalle',
  acuse: 'Listo',
};

export function AddTransactionScreen() {
  // P0-1: historial real de pasos (el árbol bifurca por flow/method — un contador no basta).
  const [history, setHistory] = useState<Step[]>(['tipo']);
  const step = history[history.length - 1];
  const [flow, setFlow] = useState<Flow | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PayMethod | null>(null);
  const [occurredAt, setOccurredAt] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [note, setNote] = useState('');
  const [cards, setCards] = useState<Debt[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [selectedCard, setSelectedCard] = useState<Debt | null>(null);
  const [installments, setInstallments] = useState('1');
  const [withInterest, setWithInterest] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Resultado del commit: acuse que ENUMERA + acción de deshacer (§42).
  const [acuse, setAcuse] = useState<string[]>([]);
  const [undo, setUndo] = useState<null | (() => Promise<void>)>(null);
  const [undone, setUndone] = useState(false);
  const [toast, setToast] = useState<ToastSpec | null>(null);
  const [celebration, setCelebration] = useState<string | null>(null);
  const undoRef = useRef<null | (() => Promise<void>)>(null);

  // §39 (BT-001): "45.000" son cuarenta y cinco mil — parser regional único.
  const value = useMemo(() => parseAmount(amount) || 0, [amount]);

  const go = (next: Step) => setHistory((h) => [...h, next]);
  const back = useCallback(() => {
    // Los datos ya diligenciados se conservan (regla explícita del Fundador).
    setError(null);
    setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h));
  }, []);

  // P0-1: el botón físico/gesto de Android retrocede UN paso del wizard, no de pestaña.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (history.length > 1 && step !== 'acuse') {
          back();
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [history.length, step, back]),
  );

  useEffect(() => {
    if (flow !== 'gasto' && flow !== 'ingreso') return;
    let active = true;
    categoriesApi.list(flow).then((c) => active && setCategories(c)).catch(() => active && setCategories([]));
    return () => { active = false; };
  }, [flow]);

  const reset = () => {
    setHistory(['tipo']); setFlow(null); setAmount(''); setMethod(null); setSelectedCat(null);
    setNote(''); setSelectedCard(null); setSelectedDebt(null); setInstallments('1');
    setWithInterest(false); setError(null); setAcuse([]); setUndo(null); setUndone(false);
    setOccurredAt(new Date()); setCelebration(null); setToast(null);
    undoRef.current = null;
  };
  const [, setSelectedDebt] = useState<Debt | null>(null);

  const pickFlow = (f: Flow) => {
    setFlow(f); go('monto');
    if (f === 'pago_deuda' || f === 'gasto') debtsApi.list().then((all) => {
      setDebts(all.filter((d) => d.status === 'activa'));
      setCards(all.filter((d) => d.capabilities?.installmentPurchases));
    }).catch(() => {});
  };

  /** P2 (punto 7): reutiliza la señal del motor de gamificación — un logro nuevo
   *  tras esta acción se celebra AQUÍ, in-line, sin inventar reglas nuevas. */
  const checkCelebration = async () => {
    try {
      const profile = await gamificationApi.profile();
      const fresh = profile.achievements.find((a) => a.unlockedAt && !a.seenAt);
      if (fresh) {
        setCelebration(`🏆 Logro: ${fresh.title} · +${fresh.xp} XP`);
        await gamificationApi.markSeen().catch(() => undefined);
      }
    } catch {
      /* la celebración es opcional */
    }
  };

  const armUndo = (fn: () => Promise<void>, what: string) => {
    undoRef.current = fn;
    setUndo(() => fn);
    setToast({
      message: `${what} registrado.`,
      actionLabel: 'Deshacer',
      seconds: UNDO_SECONDS,
      onAction: async () => {
        await onUndo();
      },
    });
  };

  // --- Commit: nivel 1 (hecho directo) = commit + acuse + deshacer ---
  const commitCashTx = async (kind: TxKind, debtId?: string) => {
    setBusy(true); setError(null);
    const label = kind === 'ingreso' ? 'ingreso' : kind === 'pago_deuda' ? 'pago' : 'gasto';
    try {
      const tx = await transactionsApi.create({
        kind, amount: value, occurredAt: occurredAt.toISOString(),
        categoryId: selectedCat?.id, note: note || selectedCat?.name || undefined, debtId,
      });
      // P1: el acuse ENUMERA la cascada (§42) para los 3 tipos, con consecuencias
      // en lenguaje humano — solo con lo que ya se calcula (sin llamadas nuevas al Motor).
      const lines: string[] = [`✅ Registré tu ${label} de ${formatMoney(value)}${selectedCat ? ` en ${selectedCat.name}` : ''}.`];
      // FIN-047: era un gasto fijo → se cruzó con él (no se cuenta doble).
      if (tx.fixedItemId) lines.push('Ya lo tenías como gasto fijo: quedó cruzado y no se cuenta doble.');
      if (kind === 'gasto' || kind === 'ingreso') {
        const b = await budgetApi.monthly().catch(() => null);
        if (b) lines.push(`${kind === 'gasto' ? 'Actualicé tu presupuesto:' : 'Sumó a tu ingreso del ciclo:'} te quedan ${formatMoney(b.teQueda.amount)} hasta el ${shortDate(b.teQueda.until)}.`);
        lines.push(kind === 'gasto' ? 'Tu Score y tus indicadores lo tendrán en cuenta en el próximo cálculo.' : 'Tus indicadores de ingreso y ahorro se recalculan solos.');
      } else if (kind === 'pago_deuda' && debtId) {
        const d = await debtsApi.get(debtId).catch(() => null);
        if (d) {
          lines.push(`Actualicé tu deuda: nuevo saldo de ${d.name} ${formatMoney(Number(d.currentBalance))}${d.nextDueDate ? ` · próxima cuota ${shortDate(d.nextDueDate)}` : ''}.`);
          if (d.status === 'pagada') lines.push('🎉 Esta deuda quedó saldada.');
        }
        lines.push('También descontó de "Te queda" y de tu deuda total en Inicio.');
      }
      setAcuse(lines);
      // Deshacer = el MISMO camino que undoLast del bot (transactions.remove); el Motor recomputa.
      armUndo(async () => { await transactionsApi.remove(tx.id); }, `Tu ${label} de ${formatMoney(value)}`);
      go('acuse');
      void checkCelebration();
    } catch {
      // Sin conexión: offline-first (se sincroniza al reconectar) — P1: conserva el contexto.
      await transactionsRepo.add({
        kind, amount: value, occurredAt: occurredAt.toISOString(),
        note: note || selectedCat?.name || undefined, categoryId: selectedCat?.id,
        categoryIcon: selectedCat?.icon ?? undefined, debtId,
      });
      await runSync().catch(() => {});
      setAcuse([
        `✅ Guardé tu ${label} de ${formatMoney(value)}${selectedCat ? ` en ${selectedCat.name}` : ''} en este teléfono.`,
        'No hay conexión ahora: se enviará solo al reconectar y ahí se actualizarán "Te queda", tus deudas y tu Score.',
      ]);
      setUndo(null);
      go('acuse');
    } finally {
      setBusy(false);
    }
  };

  // Gasto con crédito = compra a cuotas (FIN-031). NO crea un gasto en caja (evita
  // el doble conteo); su reversión es la política §4.5 de FIN-031 (voidPurchase).
  const commitCardPurchase = async () => {
    if (!selectedCard) return;
    setBusy(true); setError(null);
    try {
      const n = Math.max(1, parseInt(installments, 10) || 1);
      const res = await debtsApi.registerPurchase(selectedCard.id, {
        amount: value, installments: n, withInterest, note: note || selectedCat?.name || undefined,
      });
      const lines = ['✅ ' + res.acknowledgment];
      if (res.summary.availableCredit != null) {
        lines.push(`Cupo disponible de ${selectedCard.name}: ${formatMoney(res.summary.availableCredit)}.`);
      }
      lines.push(n > 1 ? `Las ${n} cuotas ya cuentan en "lo comprometido" de cada mes.` : 'La cuota ya cuenta en "lo comprometido" del mes.');
      setAcuse(lines);
      const purchaseId = res.summary.purchases[0]?.id;
      if (purchaseId) armUndo(async () => { await debtsApi.voidPurchase(purchaseId); }, `Tu compra de ${formatMoney(value)}`);
      else setUndo(null);
      go('acuse');
      void checkCelebration();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onUndo = async () => {
    const fn = undoRef.current;
    if (!fn) return;
    setBusy(true); setError(null);
    try { await fn(); setUndone(true); setUndo(null); undoRef.current = null; setToast(null); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  // ---------- Render por paso (una decisión por pantalla) ----------
  const canBack = history.length > 1 && step !== 'acuse';
  const wrap = (children: React.ReactNode) => (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
        <Row style={{ gap: spacing.xs, marginBottom: spacing.md }}>
          {canBack ? (
            <IconButton icon="arrow-back" label="Volver al paso anterior" onPress={back} color={colors.text} size={24} style={{ marginLeft: -spacing.sm }} />
          ) : null}
          <Text style={{ color: colors.text, ...type.heading, flex: 1 }} accessibilityRole="header">
            {step === 'detalle' && flow === 'ingreso' ? '¿De qué fue?' : STEP_TITLE[step]}
          </Text>
        </Row>
        {step !== 'tipo' && step !== 'acuse' ? <Breadcrumb history={history} flow={flow} /> : null}
        {children}
        {error ? <Text style={{ color: colors.danger, ...type.body, marginTop: spacing.sm }} accessibilityRole="alert">{error}</Text> : null}
      </ScrollView>
      <Toast spec={toast} onHide={() => setToast(null)} />
    </View>
  );

  const amountBig = (
    <Card style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
      <Text style={{ color: colors.textMuted, ...type.body }}>Monto</Text>
      <Text style={{ color: colors.text, ...type.hero }}>{value ? formatMoney(value) : '$0'}</Text>
    </Card>
  );

  if (step === 'tipo') {
    return wrap(
      <>
        {FLOWS.map((f) => (
          <OptionRow key={f.key} icon={f.icon} title={f.label} sub={f.sub} onPress={() => pickFlow(f.key)} />
        ))}
      </>,
    );
  }

  if (step === 'monto') {
    const next = () => {
      if (!value) { setError('Ingresa un monto.'); return; }
      setError(null);
      go(flow === 'gasto' ? 'metodo' : flow === 'pago_deuda' ? 'deuda' : 'detalle');
    };
    return wrap(
      <>
        {amountBig}
        <Field label="Monto" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="45.000" autoFocus hint="Puedes escribir 45000 o 45.000 — es lo mismo." />
        <Button title="Siguiente" icon="arrow-forward" onPress={next} />
      </>,
    );
  }

  if (step === 'metodo') {
    return wrap(
      <>
        {METHODS.map((m) => (
          <OptionRow
            key={m.key}
            icon={m.icon}
            title={m.label}
            selected={method === m.key}
            onPress={() => {
              setMethod(m.key);
              // Efectivo/cuenta/débito/billetera NUNCA preguntan cuotas.
              go(m.key === 'credito' ? 'tarjeta' : 'detalle');
            }}
          />
        ))}
      </>,
    );
  }

  if (step === 'tarjeta') {
    return wrap(
      <>
        {cards.length === 0 ? (
          <Card>
            <Text style={{ color: colors.textMuted, ...type.body }}>No tienes tarjetas registradas. Agrégala en Deudas → Nueva deuda.</Text>
          </Card>
        ) : cards.map((c) => (
          <OptionRow key={c.id} icon="card" title={c.name} selected={selectedCard?.id === c.id} onPress={() => { setSelectedCard(c); go('cuotas'); }} />
        ))}
      </>,
    );
  }

  if (step === 'cuotas') {
    return wrap(
      <>
        {amountBig}
        <Field label="Número de cuotas" value={installments} onChangeText={setInstallments} keyboardType="numeric" placeholder="1" />
        <Row style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
          {[{ v: false, l: 'Sin interés' }, { v: true, l: 'Con interés' }].map((o) => (
            <Pressable
              key={String(o.v)}
              onPress={() => setWithInterest(o.v)}
              accessibilityRole="radio"
              accessibilityState={{ checked: withInterest === o.v }}
              style={{ flex: 1, padding: spacing.sm, minHeight: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: withInterest === o.v ? colors.primary : colors.surface, borderWidth: 1, borderColor: withInterest === o.v ? colors.primary : colors.border }}
            >
              <Text style={{ color: withInterest === o.v ? colors.textInverse : colors.text, ...type.small }}>{o.l}</Text>
            </Pressable>
          ))}
        </Row>
        <Field label="Nota (opcional)" value={note} onChangeText={setNote} placeholder="¿Qué compraste?" />
        <Button title="Registrar compra" onPress={() => void commitCardPurchase()} loading={busy} />
      </>,
    );
  }

  if (step === 'deuda') {
    return wrap(
      <>
        {amountBig}
        {debts.length === 0 ? (
          <Card><Text style={{ color: colors.textMuted, ...type.body }}>No tienes deudas activas.</Text></Card>
        ) : debts.map((d) => (
          <Pressable
            key={d.id}
            onPress={() => { setSelectedDebt(d); void commitCashTx('pago_deuda', d.id); }}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={`Abonar a ${d.name}, saldo ${formatMoney(Number(d.currentBalance))}`}
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, minHeight: 56, marginBottom: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, opacity: busy ? 0.6 : 1 }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, ...type.body, fontWeight: '700' }}>{d.name}</Text>
              {d.nextDueDate ? <Text style={{ color: colors.textMuted, ...type.small }}>vence {shortDate(d.nextDueDate)}</Text> : null}
            </View>
            <Text style={{ color: colors.textMuted, ...type.body }}>{formatMoney(Number(d.currentBalance))}</Text>
          </Pressable>
        ))}
      </>,
    );
  }

  if (step === 'detalle') {
    return wrap(
      <>
        {amountBig}
        <Text style={{ color: colors.textMuted, ...type.small, fontWeight: '600', marginBottom: 6 }}>Fecha</Text>
        <Pressable
          onPress={() => setShowDatePicker(true)}
          accessibilityRole="button"
          accessibilityLabel={`Fecha ${formatLocalDate(occurredAt)}, cambiar`}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 12, minHeight: 44, marginBottom: spacing.md }}
        >
          <Row style={{ gap: spacing.sm }}>
            <Ionicons name="calendar-outline" size={18} color={colors.text} />
            <Text style={{ color: colors.text, ...type.bodyLg }}>{formatLocalDate(occurredAt)}</Text>
          </Row>
          <Text style={{ color: colors.primary, ...type.body, fontWeight: '600' }}>Cambiar</Text>
        </Pressable>
        {showDatePicker ? (
          <DatePicker value={occurredAt} mode="date" maximumDate={new Date()} onChange={(e, s) => { if (Platform.OS !== 'ios') setShowDatePicker(false); if (e.type === 'set' && s) setOccurredAt(s); }} />
        ) : null}

        <Text style={{ color: colors.textMuted, ...type.small, fontWeight: '600', marginBottom: spacing.sm }}>Categoría</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md }}>
          {categories.map((cat) => {
            const active = selectedCat?.id === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() => setSelectedCat(active ? null : cat)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={cat.name}
                style={{ width: '22%', aspectRatio: 1, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? (cat.color ?? colors.primary) + '22' : colors.surface, borderWidth: 2, borderColor: active ? (cat.color ?? colors.primary) : colors.border }}
              >
                <CategoryGlyph size="lg" emoji={cat.icon} kind={flow === 'ingreso' ? 'ingreso' : 'gasto'} color={cat.color} />
                <Text style={{ color: colors.textMuted, ...type.caption, marginTop: 2 }} numberOfLines={1}>{cat.name}</Text>
              </Pressable>
            );
          })}
        </View>
        <Field label="Nota (opcional)" value={note} onChangeText={setNote} placeholder="detalle…" />
        <Button title="Registrar" onPress={() => void commitCashTx(flow === 'ingreso' ? 'ingreso' : 'gasto')} loading={busy} />
      </>,
    );
  }

  // step 'acuse' — la cascada es VISIBLE y REVERSIBLE (§42).
  return wrap(
    <>
      <Card style={{ backgroundColor: colors.successSoft, borderColor: colors.primaryLight }}>
        {acuse.map((line, i) => (
          <Text key={i} style={{ color: i === 0 ? colors.primaryDark : colors.text, ...type.bodyLg, fontWeight: i === 0 ? '700' : '400', marginTop: i === 0 ? 0 : spacing.xs }}>
            {line}
          </Text>
        ))}
      </Card>
      {celebration ? (
        <Card style={{ backgroundColor: colors.warningSoft, borderColor: colors.accent }}>
          <Text style={{ color: colors.text, ...type.body, fontWeight: '700' }}>{celebration}</Text>
        </Card>
      ) : null}
      {undone ? (
        <Text style={{ color: colors.textMuted, ...type.body, marginTop: spacing.md, textAlign: 'center' }}>Deshecho. Todo volvió a como estaba.</Text>
      ) : undo ? (
        <Pressable onPress={() => void onUndo()} disabled={busy} accessibilityRole="button" style={{ marginTop: spacing.md, alignItems: 'center', minHeight: 44, justifyContent: 'center' }}>
          <Text style={{ color: colors.danger, ...type.body, fontWeight: '700' }}>↩︎ Deshacer</Text>
        </Pressable>
      ) : null}
      <View style={{ marginTop: spacing.lg }}>
        <Button title="Registrar otra cosa" icon="add" onPress={reset} />
      </View>
    </>,
  );
}

function shortDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

/** Migas de pan: el usuario ve de dónde viene y a qué vuelve con "Atrás". */
function Breadcrumb({ history, flow }: { history: Step[]; flow: Flow | null }) {
  const label = (s: Step) =>
    s === 'tipo' ? (flow === 'gasto' ? 'Gasto' : flow === 'ingreso' ? 'Ingreso' : flow === 'pago_deuda' ? 'Pago de deuda' : 'Tipo')
    : s === 'monto' ? 'Monto' : s === 'metodo' ? 'Método' : s === 'tarjeta' ? 'Tarjeta' : s === 'cuotas' ? 'Cuotas' : s === 'deuda' ? 'Deuda' : s === 'detalle' ? 'Detalle' : '';
  return (
    <Text style={{ color: colors.textFaint, ...type.small, marginBottom: spacing.md }}>
      {history.map(label).filter(Boolean).join('  ›  ')}
    </Text>
  );
}

function OptionRow({ icon, title, sub, selected, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; sub?: string; selected?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={sub ? `${title}. ${sub}` : title}
      accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, minHeight: 60, marginBottom: spacing.sm,
        borderRadius: radius.md, backgroundColor: pressed ? colors.surfaceAlt : colors.surface, borderWidth: 1, borderColor: selected ? colors.primary : colors.border,
      })}
    >
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={22} color={colors.primaryDark} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, ...type.bodyLg, fontWeight: '700' }}>{title}</Text>
        {sub ? <Text style={{ color: colors.textMuted, ...type.small }}>{sub}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
    </Pressable>
  );
}
