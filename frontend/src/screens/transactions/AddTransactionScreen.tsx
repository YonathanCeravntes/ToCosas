import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Button, Card, Field } from '../../components/ui';
import { colors, radius, spacing } from '../../theme/colors';
import { Category, Debt, TxKind } from '../../api/types';
import { budgetApi, categoriesApi, debtsApi, transactionsApi } from '../../api/endpoints';
import { transactionsRepo } from '../../offline/transactionsRepo';
import { runSync } from '../../offline/syncEngine';
import { formatLocalDate, formatMoney } from '../../utils/format';

/**
 * FIN-035 · Registrar como puerta única del ecosistema.
 *
 * Una decisión por pantalla (gobierna la carga cognitiva, NO el número de pasos):
 * "¿qué registrar?" → el flujo se ARMA según la elección, heredando el contexto
 * para pedir lo mínimo (guardarraíl H). El efectivo se resuelve en pocos toques y
 * NUNCA pregunta cuotas (obs. 4); la tarjeta solo pide los deltas y reusa el path
 * de compra de FIN-031 (obs. 8 — el MISMO motor que el bot).
 *
 * Patrón de confirmación (DEC-0035): nivel 1 (hecho directo) = **commit + acuse +
 * deshacer** (igual que el bot). El acuse ENUMERA lo que se movió (§42 visible) y
 * "Deshacer" revierte reusando `transactions.remove`/`voidPurchase` — el Motor
 * recomputa; nunca se cablea por `sourceTransactionId` (reservado/null).
 */

type Flow = 'gasto' | 'ingreso' | 'pago_deuda';
type Step = 'tipo' | 'monto' | 'metodo' | 'detalle' | 'tarjeta' | 'cuotas' | 'deuda' | 'acuse';
type PayMethod = 'efectivo' | 'cuenta' | 'debito' | 'credito' | 'billetera';

const FLOWS: Array<{ key: Flow; label: string; emoji: string; sub: string }> = [
  { key: 'gasto', label: 'Un gasto', emoji: '🛒', sub: 'Compré o pagué algo' },
  { key: 'ingreso', label: 'Un ingreso', emoji: '💵', sub: 'Me entró plata' },
  { key: 'pago_deuda', label: 'Un pago de deuda', emoji: '💳', sub: 'Le aboné a una deuda' },
];

// Contextual (obs. 4): solo "crédito" abre la ruta de cuotas; el resto es caja.
const METHODS: Array<{ key: PayMethod; label: string; emoji: string }> = [
  { key: 'efectivo', label: 'Efectivo', emoji: '💵' },
  { key: 'cuenta', label: 'Cuenta / transferencia', emoji: '🏦' },
  { key: 'debito', label: 'Débito', emoji: '💳' },
  { key: 'credito', label: 'Tarjeta de crédito', emoji: '🪙' },
  { key: 'billetera', label: 'Billetera (Nequi…)', emoji: '📱' },
];

export function AddTransactionScreen() {
  const [step, setStep] = useState<Step>('tipo');
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
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [installments, setInstallments] = useState('1');
  const [withInterest, setWithInterest] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Resultado del commit: el acuse que ENUMERA y la acción de deshacer (§42).
  const [acuse, setAcuse] = useState<string | null>(null);
  const [undo, setUndo] = useState<null | (() => Promise<void>)>(null);
  const [undone, setUndone] = useState(false);

  const value = useMemo(() => parseFloat(amount.replace(/[^\d.]/g, '')) || 0, [amount]);

  useEffect(() => {
    if (flow !== 'gasto' && flow !== 'ingreso') return;
    let active = true;
    categoriesApi.list(flow).then((c) => active && setCategories(c)).catch(() => active && setCategories([]));
    return () => { active = false; };
  }, [flow]);

  const reset = () => {
    setStep('tipo'); setFlow(null); setAmount(''); setMethod(null); setSelectedCat(null);
    setNote(''); setSelectedCard(null); setSelectedDebt(null); setInstallments('1');
    setWithInterest(false); setError(null); setAcuse(null); setUndo(null); setUndone(false);
    setOccurredAt(new Date());
  };

  const pickFlow = (f: Flow) => {
    setFlow(f); setStep('monto');
    if (f === 'pago_deuda' || f === 'gasto') debtsApi.list().then((all) => {
      setDebts(all.filter((d) => d.status === 'activa'));
      setCards(all.filter((d) => d.capabilities?.installmentPurchases));
    }).catch(() => {});
  };

  // --- Commit: nivel 1 (hecho directo) = commit + acuse + deshacer ---
  const commitCashTx = async (kind: TxKind, debtId?: string) => {
    setBusy(true); setError(null);
    try {
      const tx = await transactionsApi.create({
        kind, amount: value, occurredAt: occurredAt.toISOString(),
        categoryId: selectedCat?.id, note: note || selectedCat?.name || undefined, debtId,
      });
      // Acuse que ENUMERA la cascada (§42 visible): lee "Te queda" real.
      let tail = '';
      if (kind === 'gasto') {
        const b = await budgetApi.monthly().catch(() => null);
        if (b) tail = ` Te queda ${formatMoney(b.teQueda.amount)}.`;
      } else if (kind === 'pago_deuda' && debtId) {
        const d = await debtsApi.get(debtId).catch(() => null);
        if (d) tail = ` Nuevo saldo de ${d.name}: ${formatMoney(Number(d.currentBalance))}.`;
      }
      const label = kind === 'ingreso' ? 'ingreso' : kind === 'pago_deuda' ? 'pago' : 'gasto';
      setAcuse(`✅ Registré tu ${label} de ${formatMoney(value)}.${tail}`);
      // Deshacer = el MISMO camino que undoLast del bot (transactions.remove); el
      // Motor recomputa. Nunca vía sourceTransactionId.
      setUndo(() => async () => { await transactionsApi.remove(tx.id); });
      setStep('acuse');
    } catch {
      // Sin conexión: se preserva el offline-first (se sincroniza al reconectar).
      await transactionsRepo.add({
        kind, amount: value, occurredAt: occurredAt.toISOString(),
        note: note || selectedCat?.name || undefined, categoryId: selectedCat?.id,
        categoryIcon: selectedCat?.icon ?? undefined, debtId,
      });
      await runSync().catch(() => {});
      setAcuse(`✅ Guardado. Se sincronizará al reconectar.`);
      setUndo(null);
      setStep('acuse');
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
      setAcuse('✅ ' + res.acknowledgment);
      const purchaseId = res.summary.purchases[0]?.id;
      setUndo(purchaseId ? () => async () => { await debtsApi.voidPurchase(purchaseId); } : null);
      setStep('acuse');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onUndo = async () => {
    if (!undo) return;
    setBusy(true); setError(null);
    try { await undo(); setUndone(true); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  // ---------- Render por paso (una decisión por pantalla) ----------
  const wrap = (children: React.ReactNode) => (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md }} keyboardShouldPersistTaps="handled">
      {children}
      {error ? <Text style={{ color: colors.danger, marginTop: spacing.sm }}>{error}</Text> : null}
    </ScrollView>
  );
  const H = ({ children }: { children: React.ReactNode }) => (
    <Text style={{ fontWeight: '800', fontSize: 20, color: colors.text, marginBottom: spacing.md }}>{children}</Text>
  );
  const amountBig = (
    <Card style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
      <Text style={{ color: colors.textMuted }}>Monto</Text>
      <Text style={{ fontSize: 36, fontWeight: '800', color: colors.text }}>{value ? formatMoney(value) : '$0'}</Text>
    </Card>
  );

  if (step === 'tipo') {
    return wrap(
      <>
        <H>¿Qué quieres registrar?</H>
        {FLOWS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => pickFlow(f.key)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, marginBottom: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
          >
            <Text style={{ fontSize: 28 }}>{f.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', fontSize: 16, color: colors.text }}>{f.label}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>{f.sub}</Text>
            </View>
            <Text style={{ color: colors.textMuted }}>›</Text>
          </Pressable>
        ))}
      </>,
    );
  }

  if (step === 'monto') {
    const next = () => {
      if (!value) { setError('Ingresa un monto.'); return; }
      setError(null);
      setStep(flow === 'gasto' ? 'metodo' : flow === 'pago_deuda' ? 'deuda' : 'detalle');
    };
    return wrap(
      <>
        <H>¿Cuánto?</H>
        {amountBig}
        <Field label="Monto" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="45000" />
        <Button title="Siguiente" onPress={next} />
      </>,
    );
  }

  if (step === 'metodo') {
    return wrap(
      <>
        <H>¿Cómo pagaste?</H>
        {METHODS.map((m) => (
          <Pressable
            key={m.key}
            onPress={() => {
              setMethod(m.key);
              // Contextual (obs. 4): efectivo/cuenta/débito/billetera NUNCA preguntan cuotas.
              if (m.key === 'credito') setStep('tarjeta');
              else setStep('detalle');
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, marginBottom: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
          >
            <Text style={{ fontSize: 22 }}>{m.emoji}</Text>
            <Text style={{ flex: 1, fontWeight: '600', color: colors.text }}>{m.label}</Text>
            <Text style={{ color: colors.textMuted }}>›</Text>
          </Pressable>
        ))}
      </>,
    );
  }

  if (step === 'tarjeta') {
    return wrap(
      <>
        <H>¿Con cuál tarjeta?</H>
        {cards.length === 0 ? (
          <Text style={{ color: colors.textMuted }}>No tienes tarjetas registradas. Agrégala en Deudas → Nueva.</Text>
        ) : cards.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => { setSelectedCard(c); setStep('cuotas'); }}
            style={{ padding: spacing.md, marginBottom: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
          >
            <Text style={{ fontWeight: '700', color: colors.text }}>💳 {c.name}</Text>
          </Pressable>
        ))}
      </>,
    );
  }

  if (step === 'cuotas') {
    // Solo los DELTAS que la tarjeta no sabe (guardarraíl H): cuántas cuotas y si cobra interés.
    return wrap(
      <>
        <H>¿A cuántas cuotas?</H>
        {amountBig}
        <Field label="Número de cuotas" value={installments} onChangeText={setInstallments} keyboardType="numeric" placeholder="1" />
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.sm }}>
          {[{ v: false, l: 'Sin interés' }, { v: true, l: 'Con interés' }].map((o) => (
            <Pressable
              key={String(o.v)}
              onPress={() => setWithInterest(o.v)}
              style={{ flex: 1, padding: spacing.sm, borderRadius: radius.md, alignItems: 'center', backgroundColor: withInterest === o.v ? colors.primary : colors.surface, borderWidth: 1, borderColor: withInterest === o.v ? colors.primary : colors.border }}
            >
              <Text style={{ color: withInterest === o.v ? colors.textInverse : colors.text, fontSize: 13 }}>{o.l}</Text>
            </Pressable>
          ))}
        </View>
        <Button title="Registrar compra" onPress={() => void commitCardPurchase()} loading={busy} />
      </>,
    );
  }

  if (step === 'deuda') {
    return wrap(
      <>
        <H>¿A cuál deuda le abonaste?</H>
        {debts.length === 0 ? (
          <Text style={{ color: colors.textMuted }}>No tienes deudas activas.</Text>
        ) : debts.map((d) => (
          <Pressable
            key={d.id}
            onPress={() => { setSelectedDebt(d); void commitCashTx('pago_deuda', d.id); }}
            style={{ flexDirection: 'row', justifyContent: 'space-between', padding: spacing.md, marginBottom: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
          >
            <Text style={{ fontWeight: '700', color: colors.text }}>{d.name}</Text>
            <Text style={{ color: colors.textMuted }}>{formatMoney(Number(d.currentBalance))}</Text>
          </Pressable>
        ))}
      </>,
    );
  }

  if (step === 'detalle') {
    return wrap(
      <>
        <H>{flow === 'ingreso' ? '¿De qué fue?' : 'Un último detalle'}</H>
        {amountBig}
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 6 }}>Fecha</Text>
        <Pressable
          onPress={() => setShowDatePicker(true)}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 12, marginBottom: spacing.md }}
        >
          <Text style={{ fontSize: 16, color: colors.text }}>📅 {formatLocalDate(occurredAt)}</Text>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>Cambiar</Text>
        </Pressable>
        {showDatePicker ? (
          <DateTimePicker value={occurredAt} mode="date" maximumDate={new Date()} onChange={(e, s) => { if (Platform.OS !== 'ios') setShowDatePicker(false); if (e.type === 'set' && s) setOccurredAt(s); }} />
        ) : null}

        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: spacing.sm }}>Categoría</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md }}>
          {categories.map((cat) => {
            const active = selectedCat?.id === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() => setSelectedCat(active ? null : cat)}
                style={{ width: '22%', aspectRatio: 1, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? (cat.color ?? colors.primary) + '22' : colors.surface, borderWidth: 2, borderColor: active ? (cat.color ?? colors.primary) : colors.border }}
              >
                <Text style={{ fontSize: 24 }}>{cat.icon ?? '🏷️'}</Text>
                <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }} numberOfLines={1}>{cat.name}</Text>
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
      <Card style={{ backgroundColor: '#EAF7F1', borderColor: colors.primaryLight }}>
        <Text style={{ color: colors.primaryDark, fontSize: 16, lineHeight: 22 }}>{acuse}</Text>
      </Card>
      {undone ? (
        <Text style={{ color: colors.textMuted, marginTop: spacing.md, textAlign: 'center' }}>Deshecho. Todo volvió a como estaba.</Text>
      ) : undo ? (
        <Pressable onPress={() => void onUndo()} disabled={busy} style={{ marginTop: spacing.md, alignItems: 'center' }}>
          <Text style={{ color: colors.danger, fontWeight: '700' }}>↩︎ Deshacer</Text>
        </Pressable>
      ) : null}
      <View style={{ marginTop: spacing.lg }}>
        <Button title="Registrar otra cosa" onPress={reset} />
      </View>
    </>,
  );
}
