import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Keyboard, Platform, Pressable, ScrollView, View } from 'react-native';
import { Text, TextInput } from '../../components/AppText';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { DatePicker } from '../../components/DatePicker';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Field, Ico, IconButton, Money, Row, Toast, ToastSpec, useKeyboardInset } from '../../components/ui';
import { useRegisterForm } from '../../store/registerForm.store';
import { CategoryGlyph } from '../../components/CategoryGlyph';
import { colors, radius, spacing, type } from '../../theme/colors';
import { Category, Debt, TxKind } from '../../api/types';
import { budgetApi, debtsApi, gamificationApi, householdApi, incomeApi, PaymentMethod, transactionsApi } from '../../api/endpoints';
import { ApiError } from '../../api/client';
import { transactionsRepo } from '../../offline/transactionsRepo';
import { runSync } from '../../offline/syncEngine';
import { formatMoney, parseAmount } from '../../utils/format';
import { fixedOrder, OTHER_FIXED } from '../../utils/fixedTypes';
import { toApiDate } from '../../utils/dates';
import { getPref, setPref } from '../../utils/prefs';
import { loadCategoriesByUsage, TOP_CATEGORIES } from '../../utils/categoryUsage';

/**
 * FIN-035 · Registrar como puerta única del ecosistema.
 *
 * FIN-056 (boceto 1, Fundador 2026-09-30): "Registrar rápido". Antes un gasto de efectivo
 * pedía 5 pantallas (tipo → monto → cómo pagaste → detalle → listo); ahora todo va en UNA:
 * el tipo arriba (Gasto · Ingreso · Deuda), el monto, las categorías que más usas, el medio
 * de pago (se recuerda el último) y, plegados, la fecha, "cada mes" y la nota. Se conserva
 * todo lo que ya funcionaba: tarjeta de crédito → compra a cuotas (FIN-031), "cada mes" →
 * gasto/ingreso fijo (FIN-049), acuse que enumera + deshacer (DEC-0035), offline-first,
 * logros in-line (SPRINT-PULIDO-001).
 *
 * BT-027: la fecha viaja como día local a mediodía UTC (`toApiDate`), no como la hora del
 * teléfono: un gasto de las 9 p. m. ya no cae en el día (ni en el mes) siguiente.
 * BT-028: solo se guarda "sin conexión" cuando de verdad no hay red; un rechazo del
 * servidor se muestra como error.
 */

type Flow = 'gasto' | 'ingreso' | 'pago_deuda';
type Step = 'form' | 'tarjeta' | 'cuotas' | 'deuda' | 'acuse';
/** Chips de "¿Cómo pagaste?": los tres de caja + la tarjeta de crédito (que es una compra). */
type PayChoice = 'efectivo' | 'transferencia' | 'debito' | 'credito';

const UNDO_SECONDS = 12;
const PAY_PREF = 'lastPayMethod';

const FLOWS: Array<{ key: Flow; label: string }> = [
  { key: 'gasto', label: 'Gasto' },
  { key: 'ingreso', label: 'Ingreso' },
  { key: 'pago_deuda', label: 'Deuda' },
];

const PAY_CHOICES: Array<{ key: PayChoice; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = [
  { key: 'efectivo', label: 'Efectivo', icon: 'cash-outline' },
  { key: 'transferencia', label: 'Cuenta o Nequi', icon: 'phone-portrait-outline' },
  { key: 'debito', label: 'Débito', icon: 'card-outline' },
  { key: 'credito', label: 'Tarjeta de crédito', icon: 'card' },
];

/** Lo que se guarda en el movimiento (FIN-056): débito y crédito son "tarjeta". */
const toPaymentMethod = (c: PayChoice | null): PaymentMethod | undefined =>
  c === 'efectivo' ? 'efectivo' : c === 'transferencia' ? 'transferencia' : c === 'debito' || c === 'credito' ? 'tarjeta' : undefined;

const STEP_TITLE: Record<Step, string> = {
  form: 'Registrar',
  tarjeta: '¿Con cuál tarjeta?',
  cuotas: '¿A cuántas cuotas?',
  deuda: '¿A cuál deuda le abonaste?',
  acuse: 'Listo',
};

export function AddTransactionScreen() {
  // P0-1: historial real de pasos (tarjeta → cuotas bifurca); "Atrás" restaura lo diligenciado.
  const [history, setHistory] = useState<Step[]>(['form']);
  const step = history[history.length - 1];
  const [flow, setFlow] = useState<Flow>('gasto');
  const [amount, setAmount] = useState('');
  const [pay, setPay] = useState<PayChoice | null>(null);
  const [remembered, setRemembered] = useState<PayChoice | null>(null);
  const [occurredAt, setOccurredAt] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [catsFailed, setCatsFailed] = useState(false);
  const [catsTry, setCatsTry] = useState(0);
  const [showAllCats, setShowAllCats] = useState(false);
  // FIN-049: elegir aquí si se repite cada mes (fijo) o no.
  const [monthly, setMonthly] = useState(false);
  const [payDay, setPayDay] = useState('');
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
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
  // FIN-059: Millo en pareja — "Mío / De la casa" solo aparece si la persona está en un hogar.
  const [inHouse, setInHouse] = useState(false);
  const [house, setHouse] = useState(false);
  const undoRef = useRef<null | (() => Promise<void>)>(null);

  // §39 (BT-001): "45.000" son cuarenta y cinco mil — parser regional único.
  const value = useMemo(() => parseAmount(amount) || 0, [amount]);

  const go = (next: Step) => setHistory((h) => [...h, next]);
  const back = useCallback(() => {
    setError(null);
    setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h));
  }, []);

  const reset = useCallback(() => {
    setHistory(['form']); setAmount(''); setSelectedCat(null); setNote(''); setShowNote(false);
    setSelectedCard(null); setInstallments('1'); setWithInterest(false); setError(null);
    setAcuse([]); setUndo(null); setUndone(false); setOccurredAt(new Date()); setCelebration(null);
    setToast(null); setMonthly(false); setPayDay(''); setShowAllCats(false); setHouse(false);
    undoRef.current = null;
  }, []);

  // El medio de pago de la última vez queda elegido de entrada (un toque menos).
  useEffect(() => {
    void getPref(PAY_PREF).then((v) => {
      if (v && PAY_CHOICES.some((c) => c.key === v)) {
        setRemembered(v as PayChoice);
        setPay((cur) => cur ?? (v as PayChoice));
      }
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      // BT-032: al volver horas después, el acuse viejo no debe seguir ahí.
      if (step === 'acuse') reset();
      householdApi.state().then((h) => setInHouse(!!h.household)).catch(() => {});
      // Deudas activas (para abonar) y tarjetas (para compras a cuotas).
      debtsApi
        .list()
        .then((all) => {
          setDebts(all.filter((d) => d.status === 'activa'));
          setCards(all.filter((d) => d.capabilities?.installmentPurchases));
        })
        .catch(() => {});
      // P0-1: el botón físico/gesto de Android retrocede UN paso, no de pestaña.
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (history.length > 1 && step !== 'acuse') {
          back();
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [history.length, step, back, reset]),
  );

  useEffect(() => {
    if (flow !== 'gasto' && flow !== 'ingreso') return;
    let active = true;
    setCatsFailed(false);
    loadCategoriesByUsage(flow)
      .then((c) => { if (active) setCategories(c); })
      .catch(() => { if (active) { setCategories([]); setCatsFailed(true); } });
    return () => { active = false; };
  }, [flow, catsTry]);

  // Gasto: "Solo esta vez" = categorías del día a día (las más usadas primero); "Cada mes" =
  // tipos de gasto fijo. Ingreso: las mismas categorías en los dos casos.
  const shownCats = useMemo(() => {
    const base = flow === 'gasto'
      ? monthly
        ? categories.filter((c) => c.isFixed).sort((a, b) => fixedOrder(a.name) - fixedOrder(b.name))
        : categories.filter((c) => !c.isFixed)
      : categories;
    const short = !(monthly && flow === 'gasto') && !showAllCats && base.length > TOP_CATEGORIES + 1;
    return { list: short ? base.slice(0, TOP_CATEGORIES) : base, truncated: short, total: base.length };
  }, [categories, flow, monthly, showAllCats]);

  const pickFlow = (f: Flow) => {
    if (f === flow) return;
    setFlow(f); setSelectedCat(null); setMonthly(false); setShowAllCats(false); setError(null);
  };

  const pickPay = (c: PayChoice) => {
    setPay(c);
    setError(null);
    if (c === 'credito') {
      if (!value) { setError('Escribe el monto antes de elegir la tarjeta.'); return; }
      go('tarjeta');
      return;
    }
    void setPref(PAY_PREF, c);
  };

  /** P2 (punto 7): un logro nuevo tras esta acción se celebra AQUÍ, in-line. */
  const checkCelebration = async () => {
    try {
      const profile = await gamificationApi.profile();
      const fresh = profile.achievements.find((a) => a.unlockedAt && !a.seenAt);
      if (fresh) {
        setCelebration(`Logro: ${fresh.title} · +${fresh.xp} XP`);
        await gamificationApi.markSeen().catch(() => undefined);
      }
    } catch {
      /* la celebración es opcional */
    }
  };

  const armUndo = (fn: () => Promise<void>, what: string) => {
    undoRef.current = fn;
    setUndo(() => fn);
    setToast({ message: `${what} registrado.`, actionLabel: 'Deshacer', seconds: UNDO_SECONDS, onAction: async () => { await onUndo(); } });
  };

  // --- Commit: nivel 1 (hecho directo) = commit + acuse + deshacer ---
  const commitCashTx = async (kind: TxKind, debtId?: string) => {
    setBusy(true); setError(null);
    const label = kind === 'ingreso' ? 'ingreso' : kind === 'pago_deuda' ? 'pago' : 'gasto';
    const paymentMethod = kind === 'gasto' ? toPaymentMethod(pay) : undefined;
    try {
      const tx = await transactionsApi.create({
        kind, amount: value, occurredAt: toApiDate(occurredAt),
        categoryId: selectedCat?.id, note: note || selectedCat?.name || undefined, debtId, paymentMethod,
        household: kind === 'gasto' && house ? true : undefined,
      });
      // P1: el acuse ENUMERA la cascada (§42) con consecuencias en lenguaje humano.
      const lines: string[] = [`Registré tu ${label} de ${formatMoney(value)}${selectedCat ? ` en ${selectedCat.name}` : ''}.`];
      if (tx.fixedItemId) lines.push('Ya lo tenías como gasto fijo: quedó cruzado y no se cuenta doble.');
      if (kind === 'gasto' && house) lines.push('Es de la casa: ya suma en Nuestro mes y en el aporte de cada uno.');
      if (kind === 'gasto' || kind === 'ingreso') {
        const b = await budgetApi.monthly().catch(() => null);
        if (b) lines.push(`${kind === 'gasto' ? 'Actualicé tu presupuesto:' : 'Sumó a tu ingreso del ciclo:'} te quedan ${formatMoney(b.teQueda.amount)} hasta el ${shortDate(b.teQueda.until)}.`);
        lines.push(kind === 'gasto' ? 'Tu Score y tus indicadores lo tendrán en cuenta en el próximo cálculo.' : 'Tus indicadores de ingreso y ahorro se recalculan solos.');
      } else if (kind === 'pago_deuda' && debtId) {
        const d = await debtsApi.get(debtId).catch(() => null);
        if (d) {
          lines.push(`Actualicé tu deuda: nuevo saldo de ${d.name} ${formatMoney(Number(d.currentBalance))}${d.nextDueDate ? ` · próxima cuota ${shortDate(d.nextDueDate)}` : ''}.`);
          if (d.status === 'pagada') lines.push('Esta deuda quedó saldada.');
        }
        lines.push('También descontó de "Te queda" y de tu deuda total en Inicio.');
      }
      setAcuse(lines);
      armUndo(async () => { await transactionsApi.remove(tx.id); }, `Tu ${label} de ${formatMoney(value)}`);
      go('acuse');
      void checkCelebration();
    } catch (e) {
      // BT-028: solo SIN RED se guarda en el teléfono (offline-first, se sincroniza al volver).
      const offline = e instanceof ApiError && e.status === 0;
      if (!offline) {
        setError(`No pude guardarlo: ${(e as Error).message}`);
        return;
      }
      await transactionsRepo.add({
        kind, amount: value, occurredAt: toApiDate(occurredAt),
        note: note || selectedCat?.name || undefined, categoryId: selectedCat?.id,
        categoryIcon: selectedCat?.icon ?? undefined, debtId,
      });
      await runSync().catch(() => {});
      setAcuse([
        `Guardé tu ${label} de ${formatMoney(value)}${selectedCat ? ` en ${selectedCat.name}` : ''} en este teléfono.`,
        'No hay conexión ahora: se enviará solo al reconectar y ahí se actualizarán "Te queda", tus deudas y tu Score.',
      ]);
      setUndo(null);
      go('acuse');
    } finally {
      setBusy(false);
    }
  };

  /** FIN-049: "Cada mes". Crea el fijo y registra el de ESTE mes ya enlazado (nada a medias). */
  const commitMonthly = async (kind: 'gasto' | 'ingreso') => {
    const isOther = kind === 'gasto' && selectedCat?.name === OTHER_FIXED;
    if (kind === 'gasto' && !selectedCat) { setError('Elige qué tipo de gasto fijo es.'); return; }
    if (isOther && !note.trim()) { setError('Escribe qué es en la nota (p. ej. "Cuota del carro").'); return; }
    const day = payDay.trim() ? parseInt(payDay, 10) : occurredAt.getDate();
    if (Number.isNaN(day) || day < 1 || day > 31) { setError('El día debe estar entre 1 y 31.'); return; }
    const name = kind === 'gasto' ? (isOther ? note.trim() : selectedCat!.name) : (note.trim() || selectedCat?.name || 'Ingreso fijo');
    setBusy(true); setError(null);
    let undoFixed: (() => Promise<unknown>) | null = null;
    try {
      if (kind === 'gasto') {
        const fixed = await budgetApi.createFixed({ kind: 'gasto', name, amount: value, dayOfMonth: day, categoryId: selectedCat!.id, notes: isOther ? undefined : note.trim() || undefined, household: house || undefined });
        undoFixed = () => budgetApi.removeFixed(fixed.id);
        const tx = await transactionsApi.create({ kind: 'gasto', amount: value, occurredAt: toApiDate(occurredAt), categoryId: selectedCat!.id, note: name, fixedItemId: fixed.id, paymentMethod: toPaymentMethod(pay), household: house || undefined });
        const lines = [
          `Registré tu gasto de ${formatMoney(value)} en ${name}.`,
          `Quedó como gasto fijo: desde el próximo mes se registra solo el día ${day}. No tienes que volver a anotarlo.`,
        ];
        const b = await budgetApi.monthly().catch(() => null);
        if (b) lines.push(`Actualicé tu presupuesto: te quedan ${formatMoney(b.teQueda.amount)} hasta el ${shortDate(b.teQueda.until)}.`);
        lines.push('Puedes cambiar el monto o el día en Mi mes → Editar fijos e ingresos.');
        setAcuse(lines);
        const rm = undoFixed;
        armUndo(async () => { await transactionsApi.remove(tx.id); await rm(); }, `Tu gasto fijo de ${formatMoney(value)}`);
      } else {
        const source = await incomeApi.createSource({ name, amount: value, dayOfMonth: day });
        undoFixed = () => incomeApi.removeSource(source.id);
        const tx = await transactionsApi.create({ kind: 'ingreso', amount: value, occurredAt: toApiDate(occurredAt), categoryId: selectedCat?.id, note: name });
        const lines = [
          `Registré tu ingreso de ${formatMoney(value)}${selectedCat ? ` en ${selectedCat.name}` : ''}.`,
          `Quedó como ingreso fijo (${name}, día ${day}): tu presupuesto ya cuenta con él cada mes.`,
        ];
        const b = await budgetApi.monthly().catch(() => null);
        if (b) lines.push(`Te quedan ${formatMoney(b.teQueda.amount)} hasta el ${shortDate(b.teQueda.until)}.`);
        lines.push('Deducciones y cambios en Mi mes → Editar fijos e ingresos.');
        setAcuse(lines);
        const rm = undoFixed;
        armUndo(async () => { await transactionsApi.remove(tx.id); await rm(); }, `Tu ingreso fijo de ${formatMoney(value)}`);
      }
      go('acuse');
      void checkCelebration();
    } catch (e) {
      if (undoFixed) await undoFixed().catch(() => undefined);
      setError(`No pude guardarlo: ${(e as Error).message}. Revisa tu conexión e inténtalo de nuevo.`);
    } finally {
      setBusy(false);
    }
  };

  // Gasto con crédito = compra a cuotas (FIN-031). NO crea un gasto en caja (evita el doble conteo).
  const commitCardPurchase = async () => {
    if (!selectedCard) return;
    setBusy(true); setError(null);
    try {
      const n = Math.max(1, parseInt(installments, 10) || 1);
      const res = await debtsApi.registerPurchase(selectedCard.id, { amount: value, installments: n, withInterest, note: note || selectedCat?.name || undefined });
      const lines = [res.acknowledgment];
      if (res.summary.availableCredit != null) lines.push(`Cupo disponible de ${selectedCard.name}: ${formatMoney(res.summary.availableCredit)}.`);
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

  const submitForm = () => {
    if (!value) { setError('Escribe cuánto fue.'); return; }
    if (flow === 'pago_deuda') { setError(null); go('deuda'); return; }
    setError(null);
    void (monthly ? commitMonthly(flow) : commitCashTx(flow));
  };

  // ---------- Render ----------
  const canBack = history.length > 1 && step !== 'acuse';
  const wrap = (children: React.ReactNode) => (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
        <Row style={{ gap: spacing.xs, marginBottom: spacing.md, justifyContent: 'space-between' }}>
          <Row style={{ gap: spacing.xs, flex: 1 }}>
            {canBack ? <IconButton icon="arrow-back" label="Volver al paso anterior" onPress={back} color={colors.text} size={24} style={{ marginLeft: -spacing.sm }} /> : null}
            <Text style={{ color: colors.text, ...type.heading }} accessibilityRole="header">{STEP_TITLE[step]}</Text>
          </Row>
          {step === 'form' ? (
            <Row style={{ backgroundColor: colors.surfaceAlt, borderRadius: radius.full, padding: 3, gap: 2 }} accessibilityRole="tablist">
              {FLOWS.map((f) => {
                const on = flow === f.key;
                return (
                  <Pressable
                    key={f.key}
                    onPress={() => pickFlow(f.key)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: on }}
                    style={{ height: 32, paddingHorizontal: 12, borderRadius: radius.full, justifyContent: 'center', backgroundColor: on ? colors.surface : 'transparent' }}
                  >
                    <Text style={{ color: on ? colors.primaryDark : colors.textMuted, ...type.small, fontWeight: on ? '800' : '600' }}>{f.label}</Text>
                  </Pressable>
                );
              })}
            </Row>
          ) : null}
        </Row>
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

  if (step === 'tarjeta') {
    return wrap(
      <>
        {amountBig}
        {cards.length === 0 ? (
          <Card><Text style={{ color: colors.textMuted, ...type.body }}>No tienes tarjetas registradas. Agrégala en Deudas → Nueva deuda, o elige otro medio de pago.</Text></Card>
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
            onPress={() => void commitCashTx('pago_deuda', d.id)}
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

  if (step === 'form') {
    const isMonthlyFixed = monthly && flow === 'gasto';
    const catLabel = flow === 'pago_deuda' ? null : isMonthlyFixed ? '¿QUÉ PAGAS CADA MES?' : shownCats.truncated ? 'CATEGORÍA · LAS QUE MÁS USAS' : 'CATEGORÍA';
    const title = flow === 'pago_deuda'
      ? 'Elegir la deuda'
      : monthly
        ? (flow === 'ingreso' ? 'Registrar ingreso fijo' : 'Registrar gasto fijo')
        : value
          ? `Registrar ${formatMoney(value)}${selectedCat ? ` en ${selectedCat.name}` : ''}`
          : 'Registrar';
    return wrap(
      <>
        <Card style={{ alignItems: 'center', paddingVertical: spacing.md }}>
          <Text style={{ color: colors.textMuted, ...type.small }}>{flow === 'ingreso' ? '¿Cuánto te entró?' : flow === 'pago_deuda' ? '¿Cuánto abonaste?' : '¿Cuánto?'}</Text>
          <Text style={{ color: colors.text, ...type.hero }}>{value ? formatMoney(value) : '$0'}</Text>
          <View style={{ alignSelf: 'stretch', marginTop: spacing.sm, marginBottom: -spacing.md }}>
            <Field label="Monto" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="45.000" autoFocus hint="Escribe 45000 o 45.000, es lo mismo." />
          </View>
        </Card>

        {catLabel ? (
          <>
            <Row style={{ justifyContent: 'space-between', marginBottom: spacing.sm }}>
              <Text style={{ color: colors.textMuted, ...type.small, fontWeight: '700' }}>{catLabel}</Text>
              {shownCats.truncated || (showAllCats && !isMonthlyFixed) ? (
                <Pressable onPress={() => setShowAllCats(!showAllCats)} accessibilityRole="button" hitSlop={8}>
                  <Text style={{ color: colors.primary, ...type.small, fontWeight: '700' }}>{showAllCats ? 'Menos' : `Todas (${shownCats.total})`}</Text>
                </Pressable>
              ) : null}
            </Row>
            {catsFailed ? (
              <Pressable onPress={() => setCatsTry((n) => n + 1)} accessibilityRole="button" style={{ padding: spacing.md, marginBottom: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
                <Text style={{ color: colors.text, ...type.body }}>No pude cargar las categorías.</Text>
                <Text style={{ color: colors.primary, ...type.body, fontWeight: '700', marginTop: 2 }}>Reintentar</Text>
              </Pressable>
            ) : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md }}>
              {shownCats.list.map((cat) => {
                const active = selectedCat?.id === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => setSelectedCat(active ? null : cat)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={cat.name}
                    style={{ width: isMonthlyFixed ? '30.5%' : '22%', minHeight: 74, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', padding: 2, backgroundColor: active ? (cat.color ?? colors.primary) + '22' : colors.surface, borderWidth: 2, borderColor: active ? (cat.color ?? colors.primary) : colors.border }}
                  >
                    <CategoryGlyph size="lg" emoji={cat.icon} kind={flow === 'ingreso' ? 'ingreso' : 'gasto'} color={cat.color} />
                    <Text style={{ color: active ? colors.text : colors.textMuted, ...type.caption, fontWeight: active ? '800' : '400', marginTop: 2, textAlign: 'center' }} numberOfLines={2} adjustsFontSizeToFit>{cat.name}</Text>
                  </Pressable>
                );
              })}
              {shownCats.truncated ? (
                <Pressable onPress={() => setShowAllCats(true)} accessibilityRole="button" accessibilityLabel="Ver todas las categorías" style={{ width: '22%', minHeight: 74, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: colors.textFaint, backgroundColor: colors.surface }}>
                  <Ionicons name="grid-outline" size={22} color={colors.primary} />
                  <Text style={{ color: colors.textMuted, ...type.caption, marginTop: 2 }}>Todas</Text>
                </Pressable>
              ) : null}
            </View>
          </>
        ) : null}

        {flow === 'gasto' ? (
          <>
            <Text style={{ color: colors.textMuted, ...type.small, fontWeight: '700', marginBottom: spacing.sm }}>¿CÓMO PAGASTE?</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md }}>
              {PAY_CHOICES.map((c) => {
                const on = pay === c.key;
                const isLast = remembered === c.key && on;
                return (
                  <Pressable
                    key={c.key}
                    onPress={() => pickPay(c.key)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={`${c.label}${isLast ? ', como la última vez' : ''}`}
                    style={{ height: 38, paddingHorizontal: 12, borderRadius: radius.full, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: on ? colors.primarySoft : colors.surface, borderWidth: on ? 2 : 1, borderColor: on ? colors.primary : colors.border }}
                  >
                    <Ionicons name={c.icon} size={15} color={on ? colors.primaryDark : colors.textMuted} />
                    <Text style={{ color: on ? colors.primaryDark : colors.text, ...type.small, fontWeight: on ? '800' : '600' }}>
                      {c.label}{isLast ? ' · como la última vez' : ''}{c.key === 'credito' ? ' ›' : ''}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        {/* FIN-059: un toque para que el gasto cuente en Nuestro mes (Millo en pareja). */}
        {flow === 'gasto' && inHouse ? (
          <Row style={{ backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 3, marginBottom: spacing.md }} accessibilityRole="radiogroup">
            {[{ v: false, l: 'Mío', i: 'person-outline' }, { v: true, l: 'De la casa', i: 'home-outline' }].map((o) => {
              const on = house === o.v;
              return (
                <Pressable key={o.l} onPress={() => setHouse(o.v)} accessibilityRole="radio" accessibilityState={{ checked: on }} style={{ flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: radius.sm, backgroundColor: on ? colors.surface : 'transparent' }}>
                  <Ionicons name={o.i as never} size={15} color={on ? colors.primaryDark : colors.textMuted} />
                  <Text style={{ color: on ? colors.text : colors.textMuted, ...type.body, fontWeight: '700' }}>{o.l}</Text>
                </Pressable>
              );
            })}
          </Row>
        ) : null}

        {flow !== 'pago_deuda' ? (
          <Card style={{ padding: 0 }}>
            <Pressable onPress={() => setShowDatePicker(!showDatePicker)} accessibilityRole="button" accessibilityLabel={`Fecha ${humanDate(occurredAt)}, cambiar`} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: 12, minHeight: 44 }}>
              <Text style={{ color: colors.text, ...type.body, fontWeight: '600' }}>Fecha</Text>
              <Text style={{ color: colors.primary, ...type.body, fontWeight: '700' }}>{humanDate(occurredAt)} ›</Text>
            </Pressable>
            {showDatePicker ? (
              <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.sm }}>
                <DatePicker value={occurredAt} mode="date" maximumDate={new Date()} onChange={(e, s) => { if (Platform.OS !== 'ios') setShowDatePicker(false); if (e.type === 'set' && s) setOccurredAt(s); }} />
              </View>
            ) : null}
            <View style={{ height: 1, backgroundColor: colors.surfaceAlt }} />
            {/* FIN-049: decidir aquí mismo si se repite cada mes. */}
            <Row style={{ justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: 8, minHeight: 44 }}>
              <Text style={{ color: colors.text, ...type.body, fontWeight: '600' }}>¿Se repite cada mes?</Text>
              <Row style={{ backgroundColor: colors.surfaceAlt, borderRadius: radius.full, padding: 2, gap: 2 }}>
                {[{ v: false, l: 'No' }, { v: true, l: 'Sí, es fijo' }].map((o) => {
                  const on = monthly === o.v;
                  return (
                    <Pressable key={String(o.v)} onPress={() => { if (!on) { setMonthly(o.v); setSelectedCat(null); setError(null); } }} accessibilityRole="radio" accessibilityState={{ checked: on }} style={{ height: 28, paddingHorizontal: 10, borderRadius: radius.full, justifyContent: 'center', backgroundColor: on ? colors.surface : 'transparent' }}>
                      <Text style={{ color: on ? colors.primaryDark : colors.textMuted, ...type.small, fontWeight: on ? '800' : '600' }}>{o.l}</Text>
                    </Pressable>
                  );
                })}
              </Row>
            </Row>
            {monthly ? (
              <View style={{ paddingHorizontal: spacing.md }}>
                <Field
                  label={flow === 'ingreso' ? '¿Qué día te llega?' : '¿Qué día lo pagas?'}
                  value={payDay}
                  onChangeText={setPayDay}
                  keyboardType="numeric"
                  placeholder={String(occurredAt.getDate())}
                  hint={flow === 'ingreso' ? 'Cuenta en tu presupuesto cada mes desde ya.' : `Desde el próximo mes se registra solo ese día (${payDay.trim() || occurredAt.getDate()}).`}
                />
              </View>
            ) : null}
            <View style={{ height: 1, backgroundColor: colors.surfaceAlt }} />
            {showNote || (monthly && (flow === 'ingreso' || selectedCat?.name === OTHER_FIXED)) ? (
              <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
                <Field
                  label={monthly && flow === 'gasto' && selectedCat?.name === OTHER_FIXED ? '¿Qué es?' : monthly && flow === 'ingreso' ? 'Nombre (opcional)' : 'Nota (opcional)'}
                  value={note}
                  onChangeText={setNote}
                  placeholder={monthly ? (flow === 'ingreso' ? 'Ej: salario, arriendo que recibo…' : 'Ej: apartamento 301, plan de datos…') : 'Ej: almuerzo con Ana'}
                />
              </View>
            ) : (
              <Pressable onPress={() => setShowNote(true)} accessibilityRole="button" style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: 12, minHeight: 44 }}>
                <Text style={{ color: colors.text, ...type.body, fontWeight: '600' }}>Nota</Text>
                <Text style={{ color: colors.textFaint, ...type.body }}>Opcional ›</Text>
              </Pressable>
            )}
          </Card>
        ) : null}

        <View style={{ marginTop: spacing.sm }}>
          <Button title={title} icon={flow === 'pago_deuda' ? 'arrow-forward' : undefined} onPress={submitForm} loading={busy} />
        </View>
      </>,
    );
  }

  // step 'acuse' — la cascada es VISIBLE y REVERSIBLE (§42).
  return wrap(
    <>
      <Card style={{ backgroundColor: colors.successSoft, borderColor: colors.primaryLight }}>
        {acuse.map((line, i) => (
          <Text key={i} style={{ color: i === 0 ? colors.primaryDark : colors.text, ...type.bodyLg, fontWeight: i === 0 ? '700' : '400', marginTop: i === 0 ? 0 : spacing.xs }}>{line}</Text>
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

/** "Hoy, 30 sep" / "Ayer, 29 sep" / "27 sep". */
function humanDate(d: Date): string {
  const today = new Date();
  const same = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const y = new Date(today); y.setDate(today.getDate() - 1);
  const s = d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }).replace('.', '');
  return same(d, today) ? `Hoy, ${s}` : same(d, y) ? `Ayer, ${s}` : s;
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
