import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Text } from '../../components/AppText';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Card, ErrorState, Field, FormScroll, GroupLabel, Ico, Money, ProgressBar, Row, SegmentBar, Skeleton } from '../../components/ui';
import { Segmented, SoftChip } from '../../components/DebtControls';
import { colors, radius, spacing, type } from '../../theme/colors';
import { formatDate, formatMoney, parseAmount, parseDecimal } from '../../utils/format';
import { AmortizationEntry, Debt, DebtInsurance, PaymentBreakdown, PrepayEffect, PrepayReceipt, ScheduleModel, toNumber } from '../../api/types';
import { debtsApi, simulationsApi, SimulateResult } from '../../api/endpoints';
import { useApi } from '../../utils/useApi';
import { DebtsStackParamList } from '../../navigation/types';
import { confirmRemove } from '../../utils/confirm';

type Props = NativeStackScreenProps<DebtsStackParamList, 'DebtDetail'>;

/**
 * FIN-058 (Fundador, 2026-10-02: "la pantalla se ve vetusta, no se alinea al diseño actual").
 * El detalle habla el idioma de Inicio: cabecera blanca con la cifra protagonista, chips con
 * lo que antes había que buscar, tres secciones con etiqueta ("Este crédito", "Adelanta
 * plata", "Plan de pago") y una sola tarjeta para abonar o simular. Ninguna cifra ni cálculo
 * cambia: todo sale de los mismos datos y endpoints de antes (§32).
 */
export function DebtDetailScreen({ route, navigation: stackNav }: Props) {
  const { debtId } = route.params;
  const { data, loading, error, reload } = useApi(() => debtsApi.get(debtId), [debtId]);
  // SPRINT-PULIDO-001 P0-2: la pantalla fragmenta sus datos en 3 hooks (detalle,
  // CardSection, ReviewSection) sin invalidación cruzada y NO se recargaba al ganar
  // foco → tras "Deshacer" en Registrar se veía la instancia congelada. `tick` obliga
  // a las 3 fuentes a recargar cada vez que la pantalla vuelve a estar al frente.
  const [tick, setTick] = useState(0);
  useFocusEffect(
    useCallback(() => {
      void reload();
      setTick((t) => t + 1);
    }, [reload]),
  );
  const refreshAll = useCallback(async () => {
    setTick((t) => t + 1);
    await reload();
  }, [reload]);

  // P3 (punto 12): error VISIBLE con reintento — nunca un "Cargando…" eterno.
  if (error && !data) {
    return (
      <FormScroll>
        <ErrorState message={error} onRetry={() => void reload()} />
      </FormScroll>
    );
  }
  if (!data) {
    return (
      <FormScroll>
        <Skeleton hero lines={3} />
        <Skeleton lines={4} />
        <Skeleton lines={3} />
      </FormScroll>
    );
  }

  const amort = data.amortization ?? [];
  // FIN-032: el detalle decide sus secciones por MODELO de cronograma (del
  // descriptor), NUNCA por el tipo. Un solo despacho por `scheduleModel`:
  //  - `cuotas_por_compra` (tarjeta/fintech): cabecera de cupo y la sección de compras;
  //  - `amortizado`: cabecera + toda la UI de amortización (plan, abono, simulador…);
  //  - `saldo_y_cuota_pactada` (informal): cabecera de saldo + cuota pactada, SIN plan de
  //    pago ni fecha de libertad falsa (§29.2).
  const model: ScheduleModel = data.scheduleModel ?? 'amortizado';
  const hasCard = !!data.capabilities?.installmentPurchases;
  const isAmortized = model === 'amortizado';
  const isActive = data.status === 'activa';

  return (
    <FormScroll onRefresh={refreshAll}>
      <DebtHeader debt={data} amort={amort} model={model} onChanged={() => void reload()} />

      {/* FIN-056 (boceto 4): editar datos; FIN-044: renegociar condiciones. */}
      <Row style={{ gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Button title="Editar datos" icon="create-outline" variant="secondary" onPress={() => stackNav.navigate('EditDebt', { debtId, name: data.name })} />
        </View>
        {model !== 'cuotas_por_compra' ? (
          <View style={{ flex: 1 }}>
            <Button title="Renegociar" icon="swap-horizontal-outline" variant="secondary" onPress={() => stackNav.navigate('RenegotiateDebt', { debtId, name: data.name })} />
          </View>
        ) : null}
      </Row>

      {/* FIN-036: confirmación de actualización por corte (nivel 2, §42). */}
      <ReviewSection debtId={debtId} tick={tick} onChanged={() => void reload()} />

      {/* FIN-037: lecturas de profundidad — derivadas por la única autoridad del
          backend; aquí SOLO se renderizan (§32). Informan sin culpar (§29.2). */}
      {(data.depthReadings ?? []).map((r) => (
        <Card
          key={r.kind}
          style={r.severity === 'warning' ? { borderColor: colors.warningDeep, borderWidth: 1.5 } : undefined}
        >
          <Text style={{ ...type.title, fontSize: 15, color: colors.text }}>
            <Ico name={r.severity === 'warning' ? 'warning-outline' : 'bulb-outline'} size={15} color={r.severity === 'warning' ? colors.warningDeep : colors.textFaint} /> {r.title}
          </Text>
          <Text style={{ color: colors.textMuted, marginTop: 6, ...type.small }}>{r.body}</Text>
        </Card>
      ))}

      {/* FIN-024 P2: bloque de conciliación — solo si la cuota está vencida.
          Afirma lo OBSERVABLE ("no está registrada"), nunca el impago (§29.2). */}
      {data.overdueDays ? <OverdueBlock days={data.overdueDays} /> : null}

      {/* FIN-031/032: productos con cupo (tarjeta/fintech) — compras a cuotas. */}
      {hasCard ? (
        <>
          <GroupLabel title="Tu tarjeta" />
          <CardSection debtId={debtId} tick={tick} onChanged={() => void reload()} onEdit={() => stackNav.navigate('EditDebt', { debtId, name: data.name })} />
          {/* BT-040: la cuota de manejo y el seguro de la tarjeta no tenían dónde registrarse
              (la sección solo salía en créditos); el servidor ya los contaba en "Te queda". */}
          <InsuranceSection
            debtId={debtId}
            insurances={data.insurances ?? []}
            breakdown={data.paymentBreakdown}
            onChanged={() => void reload()}
            variant="card"
          />
        </>
      ) : null}

      {/* Este crédito: cuándo termina, cuotas, intereses, total; seguros y cargos. */}
      {isAmortized ? (
        <>
          <GroupLabel title="Este crédito" />
          {data.projection ? <CreditTiles debt={data} amort={amort} /> : null}
          <InsuranceSection
            debtId={debtId}
            insurances={data.insurances ?? []}
            breakdown={data.paymentBreakdown}
            onChanged={() => void reload()}
          />
        </>
      ) : null}

      {/* FIN-012 + simulador (FIN-007) en una sola tarjeta (FIN-058, decisión 1). */}
      {isAmortized && isActive ? (
        <>
          <GroupLabel title="Adelanta plata" />
          <AdvanceSection debtId={debtId} balance={toNumber(data.currentBalance)} monthlyPayment={toNumber(data.monthlyPayment)} onChanged={() => void reload()} />
        </>
      ) : null}

      {/* Plan de pago plegado con la próxima cuota a la vista (FIN-058, decisión 4). */}
      {isAmortized && amort.length > 0 ? <PaymentPlan amort={amort} /> : null}
    </FormScroll>
  );
}

// ---------------------------------------------------------------------------
// FIN-058 · Cabecera
// ---------------------------------------------------------------------------

/** "28,3 % EA" / "2,1 % mensual". */
function rateLabel(debt: Debt): string | null {
  const r = toNumber(debt.interestRate);
  if (!(r > 0)) return null;
  const basis = debt.rateBasis === 'EA' ? 'EA' : debt.rateBasis === 'MV' ? 'mensual' : debt.rateBasis;
  return `${r.toLocaleString('es-CO', { maximumFractionDigits: 1 })} % ${basis}`;
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

type ChipTone = 'neutral' | 'ok' | 'warn' | 'gold';

function InfoChip({ label, tone = 'neutral' }: { label: string; tone?: ChipTone }) {
  const bg = tone === 'ok' ? colors.primarySoft : tone === 'warn' ? colors.warningSoft : tone === 'gold' ? colors.goldSoft : colors.surfaceAlt;
  const fg = tone === 'ok' ? colors.primaryDark : tone === 'warn' ? colors.warningDeep : tone === 'gold' ? colors.goldText : colors.textMuted;
  return (
    <View style={{ backgroundColor: bg, borderRadius: radius.full, paddingVertical: 3, paddingHorizontal: 10 }}>
      <Text style={{ color: fg, ...type.small, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

function DebtHeader({ debt, amort, model, onChanged }: { debt: Debt; amort: AmortizationEntry[]; model: ScheduleModel; onChanged: () => void }) {
  const balance = toNumber(debt.currentBalance);
  const monthly = toNumber(debt.monthlyPayment);
  const isCard = model === 'cuotas_por_compra';
  const limit = debt.creditLimit != null ? toNumber(debt.creditLimit) : null;
  const rate = rateLabel(debt);
  const overdue = debt.overdueDays ?? 0;
  const days = debt.nextDueDate ? daysUntil(debt.nextDueDate) : null;

  const dueChip = overdue > 0
    ? { label: `Venció hace ${overdue} día${overdue === 1 ? '' : 's'}`, tone: 'warn' as const }
    : days !== null && debt.nextDueDate
      ? { label: `${isCard ? 'Corte' : 'Vence'} ${days <= 0 ? 'hoy' : `en ${days} día${days === 1 ? '' : 's'}`} · ${formatDate(debt.nextDueDate)}`, tone: days <= 7 ? ('warn' as const) : ('neutral' as const) }
      : null;

  const lastPaid = amort.filter((e) => e.paidAt).sort((a, b) => String(b.paidAt).localeCompare(String(a.paidAt)))[0];
  const chips: Array<{ label: string; tone?: ChipTone }> = [];
  if (model === 'amortizado' && debt.projection) {
    chips.push({ label: `${debt.projection.numberOfPayments} cuotas restantes` });
    if (debt.projection.payoffDate) chips.push({ label: `Libre el ${formatDate(debt.projection.payoffDate)}`, tone: 'gold' });
  }
  if (model === 'saldo_y_cuota_pactada') chips.push({ label: 'Sin cronograma formal' });
  if (lastPaid?.paidAt) chips.push({ label: `Último pago ${formatDate(lastPaid.paidAt)}` });
  if (debt.nextDueDate && overdue === 0) chips.push({ label: 'Al día', tone: 'ok' });
  if (debt.status !== 'activa') chips.push({ label: debt.status === 'pagada' ? 'Pagada' : debt.status, tone: 'ok' });

  const caption = isCard
    ? `${monthly > 0 ? `Cuota del mes ${formatMoney(monthly)}` : 'Sin cuota este mes'}${rate ? ` · ${rate}` : ''}`
    : `${monthly > 0 ? `${model === 'saldo_y_cuota_pactada' ? 'Cuota pactada' : 'Cuota'} de ${formatMoney(monthly)} al mes` : 'Sin cuota definida'}${rate ? ` · ${rate}` : ''}`;

  return (
    <Card>
      <Row style={{ justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm }}>
        <Text style={{ color: colors.textMuted, ...type.small }}>{isCard ? 'Usas del cupo' : 'Debes'}</Text>
        {dueChip ? <InfoChip label={dueChip.label} tone={dueChip.tone} /> : null}
      </Row>
      <Money value={formatMoney(balance)} size={34} style={{ marginTop: 2 }} />
      <Text style={{ color: colors.textMuted, ...type.small }}>{caption}</Text>

      {isCard ? <CardUsage used={balance} limit={limit} /> : <CapitalProgress debt={debt} onChanged={onChanged} />}

      {chips.length ? (
        <Row style={{ flexWrap: 'wrap', gap: 6, marginTop: spacing.sm }}>
          {chips.map((c) => (
            <InfoChip key={c.label} label={c.label} tone={c.tone} />
          ))}
        </Row>
      ) : null}
    </Card>
  );
}

/** Tarjeta: barra de uso del cupo (roja en sobrecupo — FIN-037, §29.2). */
function CardUsage({ used, limit }: { used: number; limit: number | null }) {
  if (!limit || limit <= 0) {
    return <Text style={{ color: colors.textFaint, ...type.small, marginTop: spacing.sm }}>Sin cupo registrado: agrégalo en Editar datos para ver cuánto te queda.</Text>;
  }
  const ratio = used / limit;
  const over = ratio > 1;
  return (
    <View style={{ marginTop: spacing.sm }}>
      <ProgressBar value={Math.min(1, ratio)} color={over ? colors.danger : ratio > 0.8 ? colors.warning : colors.primary} height={8} label={`Usas ${Math.round(ratio * 100)} % del cupo`} />
      <Text style={{ color: over ? colors.dangerDeep : colors.textMuted, ...type.small, marginTop: 6 }}>
        Usas {Math.round(ratio * 100)} % del cupo de {formatMoney(limit)}{over ? ` · ${formatMoney(used - limit)} por encima` : ` · disponible ${formatMoney(limit - used)}`}
      </Text>
    </View>
  );
}

/**
 * Barra "pagado a capital" = (monto inicial − saldo) / monto inicial. Al registrar sin el
 * monto inicial se guarda el saldo de ese día: aquí se puede corregir. FIN-058: ya no ocupa
 * una tarjeta vacía; sin monto inicial es una línea discreta dentro de la cabecera.
 */
function CapitalProgress({ debt, onChanged }: { debt: Debt; onChanged: () => void }) {
  const balance = toNumber(debt.currentBalance);
  const original = toNumber(debt.originalAmount);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const known = original > balance;
  const paid = known ? original - balance : 0;

  const save = async () => {
    const n = parseAmount(value);
    if (Number.isNaN(n) || n <= 0) {
      setErr('Escribe el monto que te prestaron.');
      return;
    }
    if (n < balance) {
      setErr(`Debe ser mayor o igual al saldo de hoy (${formatMoney(balance)}).`);
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await debtsApi.setOriginalAmount(debt.id, n);
      setEditing(false);
      onChanged();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ marginTop: spacing.sm }}>
      {known ? (
        <SegmentBar
          height={10}
          parts={[
            { key: 'pagado', label: 'Pagado', value: paid, color: colors.primary },
            { key: 'falta', label: 'Faltan', value: balance, color: colors.border },
          ]}
        />
      ) : null}
      {editing ? (
        <View style={{ marginTop: spacing.sm }}>
          <Field label="¿Cuánto te prestaron al inicio?" value={value} onChangeText={setValue} keyboardType="numeric" placeholder="Ej: 80.000.000" />
          {err ? <Text style={{ color: colors.danger, marginBottom: 6 }}>{err}</Text> : null}
          <Row style={{ gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button title="Cancelar" variant="secondary" onPress={() => setEditing(false)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Guardar" onPress={save} loading={saving} />
            </View>
          </Row>
        </View>
      ) : (
        <Pressable
          onPress={() => {
            setValue(known ? String(Math.round(original)) : '');
            setErr(null);
            setEditing(true);
          }}
          accessibilityRole="button"
          style={{ marginTop: 6, minHeight: 28, justifyContent: 'center' }}
        >
          <Text style={{ color: known ? colors.textFaint : colors.primary, ...type.small, fontWeight: known ? '400' : '600' }}>
            {known
              ? `Te prestaron ${formatMoney(original)} · has pagado ${formatMoney(paid)} · cambiar`
              : '¿Cuánto te prestaron al inicio? Agrégalo y verás cuánto llevas pagado'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// FIN-058 · "Este crédito": cuatro mosaicos
// ---------------------------------------------------------------------------

function CreditTiles({ debt, amort }: { debt: Debt; amort: AmortizationEntry[] }) {
  const p = debt.projection!;
  const total = amort.length > 0 ? amort.length : debt.termMonths ?? null;
  const tiles: Array<{ label: string; value: string }> = [
    { label: 'Terminas de pagar', value: p.payoffDate ? formatDate(p.payoffDate) : '—' },
    { label: 'Cuotas restantes', value: total && total >= p.numberOfPayments ? `${p.numberOfPayments} de ${total}` : String(p.numberOfPayments) },
    { label: 'Intereses por pagar', value: formatMoney(p.totalInterest) },
    { label: 'Total que pagarás', value: formatMoney(p.totalPaid) },
  ];
  return (
    <Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {tiles.map((t) => (
          <View key={t.label} style={{ flexBasis: '47%', flexGrow: 1, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.surfaceAlt, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 12, minWidth: 0 }}>
            <Text style={{ color: colors.textFaint, ...type.caption }}>{t.label}</Text>
            <Text style={{ color: colors.text, ...type.body, fontWeight: '600', marginTop: 2 }} numberOfLines={1}>{t.value}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// FIN-058 · Plan de pago plegado
// ---------------------------------------------------------------------------

function PaymentPlan({ amort }: { amort: AmortizationEntry[] }) {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const next = amort.find((e) => !e.paidAt) ?? amort[0];
  const rows = open ? (showAll ? amort : amort.slice(0, 12)) : [];
  return (
    <>
      <GroupLabel title="Plan de pago" action={open ? 'Ocultar' : `Ver las ${amort.length} cuotas`} onAction={() => setOpen((v) => !v)} />
      <Card>
        {!open && next ? (
          <>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text, fontWeight: '600', ...type.body }}>Próxima · {formatDate(next.dueDate)}</Text>
              <Text style={{ color: colors.text, fontWeight: '600', ...type.body }}>{formatMoney(toNumber(next.payment))}</Text>
            </Row>
            <Text style={{ color: colors.textMuted, ...type.small, marginTop: 2 }}>
              Capital {formatMoney(toNumber(next.principalPart))} · Interés {formatMoney(toNumber(next.interestPart))} · cuota #{next.periodNo}
            </Text>
          </>
        ) : null}
        {rows.map((e, i) => (
          <View key={e.periodNo} style={{ paddingVertical: 8, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.surfaceAlt, opacity: e.paidAt ? 0.55 : 1 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text, fontWeight: '600', ...type.body }}>
                #{e.periodNo} · {formatDate(e.dueDate)}{e.paidAt ? ' · pagada' : ''}
              </Text>
              <Text style={{ color: colors.text, fontWeight: '600', ...type.body }}>{formatMoney(toNumber(e.payment))}</Text>
            </Row>
            <Text style={{ color: colors.textMuted, ...type.small }}>
              Capital {formatMoney(toNumber(e.principalPart))} · Interés {formatMoney(toNumber(e.interestPart))}
            </Text>
          </View>
        ))}
        {open && amort.length > 12 && !showAll ? (
          <Pressable onPress={() => setShowAll(true)} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: colors.primary, fontWeight: '600', ...type.body }}>Ver las {amort.length - 12} cuotas restantes</Text>
          </Pressable>
        ) : null}
      </Card>
    </>
  );
}

/** FIN-031 · Tarjeta de crédito: cupo/saldo (derivados), compras a cuotas con
 *  su trazabilidad (G) y registro de una compra nueva (baja fricción, H). */
function CardSection({ debtId, tick, onChanged, onEdit }: { debtId: string; tick: number; onChanged: () => void; onEdit: () => void }) {
  const { data, error: loadError, reload } = useApi(() => debtsApi.cardSummary(debtId), [debtId, tick]);
  const [open, setOpen] = useState(false);
  // P1(d): la MISMA acción desde aquí y desde Registrar da el MISMO acuse.
  const [ack, setAck] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [installments, setInstallments] = useState('1');
  const [withInterest, setWithInterest] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    void reload();
    onChanged();
  };

  const add = async () => {
    const value = parseAmount(amount); // §39
    const n = Math.max(1, parseInt(installments, 10) || 1);
    if (!value) return;
    setSaving(true);
    setError(null);
    try {
      const res = await debtsApi.registerPurchase(debtId, { amount: value, installments: n, withInterest });
      setAmount('');
      setInstallments('1');
      setWithInterest(false);
      setOpen(false);
      setAck(`${res.acknowledgment}${res.summary.availableCredit != null ? ` Cupo disponible: ${formatMoney(res.summary.availableCredit)}.` : ''}`);
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // FIN-043: tocar una compra ofrece repartir su saldo pendiente o anularla.
  const [resplitId, setResplitId] = useState<string | null>(null);
  const [resplitN, setResplitN] = useState('');
  // BT-020: acciones EN LÍNEA (no un menú emergente, que en web no se ve).
  const [actionsId, setActionsId] = useState<string | null>(null);
  const onPurchase = (id: string) => {
    setActionsId(actionsId === id ? null : id);
    setResplitId(null);
  };
  const doResplit = async () => {
    const n = Math.round(parseAmount(resplitN));
    if (!resplitId || !(n >= 1 && n <= 72)) {
      Alert.alert('Número de cuotas', 'Escribe un número entre 1 y 72.');
      return;
    }
    try {
      await debtsApi.resplitPurchase(resplitId, n);
      setResplitId(null);
      setActionsId(null);
      refresh();
    } catch (e) {
      Alert.alert('No se pudo cambiar', (e as Error).message);
    }
  };

  const voidPurchase = (id: string, canVoid: boolean) => {
    if (!canVoid) {
      Alert.alert(
        'No se puede anular',
        'Esta compra ya tiene pagos aplicados. Para corregirla, primero anula esos pagos o ajusta el saldo — no puedo borrarla sin falsear tu historial.',
      );
      return;
    }
    Alert.alert('Anular compra', '¿Anular esta compra y sus cuotas? Se revertirá el saldo de la tarjeta.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Anular',
        style: 'destructive',
        onPress: () => void debtsApi.voidPurchase(id).then(refresh),
      },
    ]);
  };

  if (!data) {
    // P3 (punto 12): antes retornaba null en silencio ante un error.
    return loadError ? <ErrorState message={loadError} onRetry={() => void reload()} /> : null;
  }

  return (
    <Card>
      <Text style={{ ...type.title, fontSize: 15, color: colors.text, marginBottom: spacing.sm }}><Ico name="card-outline" size={15} color={colors.textFaint} /> Tu tarjeta</Text>
      {ack ? (
        <View style={{ backgroundColor: colors.successSoft, borderRadius: radius.sm, padding: spacing.sm, marginBottom: spacing.sm }}>
          <Text style={{ color: colors.primaryDark, ...type.body }}><Ico name="checkmark-circle-outline" color={colors.primaryDark} /> {ack}</Text>
        </View>
      ) : null}
      {data.creditLimit != null ? (
        <>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ color: colors.textMuted, ...type.body }}>Cupo disponible</Text>
            {/* FIN-037: en sobrecupo el disponible es negativo — verde mentiría (§29.2). */}
            <Text style={{ fontWeight: '600', ...type.body, color: (data.availableCredit ?? 0) < 0 ? colors.warningDeep : colors.primary }}>
              {formatMoney(data.availableCredit ?? 0)}
            </Text>
          </Row>
          <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={{ color: colors.textMuted, ...type.body }}>Utilizado</Text>
            <Text style={{ color: colors.text, ...type.body }}>
              {formatMoney(data.usedAmount)} de {formatMoney(data.creditLimit)}
            </Text>
          </Row>
        </>
      ) : (
        <Pressable onPress={onEdit} accessibilityRole="link">
          <Text style={{ color: colors.textMuted, ...type.small }}>
            Aún no tiene cupo registrado. <Text style={{ color: colors.primary, fontWeight: '600' }}>Agrégalo en Editar datos</Text> para ver cuánto te queda.
          </Text>
        </Pressable>
      )}

      {data.purchases.length > 0 ? (
        <View style={{ marginTop: spacing.md }}>
          <Text style={{ fontWeight: '600', color: colors.text, ...type.body, marginBottom: 2 }}>Tus compras a cuotas</Text>
          {data.purchases.map((p, idx) => (
            <View key={p.id} style={{ borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: colors.surfaceAlt }}>
            <Pressable onPress={() => onPurchase(p.id)} accessibilityRole="button" accessibilityLabel={`${p.note || 'Compra'} de ${formatMoney(p.amount)}, toca para cambiar cuotas o anular`}>
              <Row style={{ justifyContent: 'space-between', paddingVertical: 10, gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, ...type.body }} numberOfLines={1}>
                    {idx === 0 ? <Text style={{ color: colors.primary, fontWeight: '600' }}>Última · </Text> : null}
                    {p.note || `Compra de ${formatMoney(p.amount)}`}
                  </Text>
                  <Text style={{ color: colors.textFaint, ...type.caption }}>
                    {/* Trazabilidad (G): de dónde salió cada cuota. */}
                    {p.installmentsCount} cuota{p.installmentsCount === 1 ? '' : 's'} · {formatDate(p.occurredAt)} ·{' '}
                    {p.paidInstallments} pagada{p.paidInstallments === 1 ? '' : 's'}
                  </Text>
                </View>
                <Text style={{ fontWeight: '600', color: colors.text, ...type.body }}>{formatMoney(p.pendingBalance)}</Text>
              </Row>
            </Pressable>
            {actionsId === p.id && resplitId !== p.id ? (
              <Row style={{ gap: spacing.sm, marginBottom: spacing.sm, flexWrap: 'wrap' }}>
                <View style={{ flex: 1, minWidth: 150 }}>
                  <Button title="Cambiar número de cuotas" icon="git-branch-outline" variant="secondary" onPress={() => { setResplitId(p.id); setResplitN(''); }} />
                </View>
                <View style={{ flex: 1, minWidth: 110 }}>
                  <Button title="Anular" icon="trash-outline" variant="ghost" onPress={() => voidPurchase(p.id, p.canVoid)} />
                </View>
              </Row>
            ) : null}
            {resplitId === p.id ? (
              <View style={{ backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.sm }}>
                <Field label={`¿En cuántas cuotas repartes ${formatMoney(p.pendingBalance)}?`} value={resplitN} onChangeText={setResplitN} keyboardType="numeric" placeholder="16" />
                {parseAmount(resplitN) >= 1 ? (
                  <Text style={{ color: colors.textMuted, ...type.small, marginBottom: spacing.sm }}>
                    ≈ {formatMoney(p.pendingBalance / Math.round(parseAmount(resplitN)))} por cuota
                  </Text>
                ) : null}
                <Button title="Repartir" onPress={() => void doResplit()} />
                <Button title="Cancelar" variant="ghost" onPress={() => { setResplitId(null); setActionsId(null); }} />
              </View>
            ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {open ? (
        <View style={{ marginTop: spacing.sm }}>
          <Field label="Monto de la compra" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="600000" />
          <Field label="¿En cuántas cuotas?" value={installments} onChangeText={setInstallments} keyboardType="numeric" placeholder="3" />
          <Segmented
            style={{ marginBottom: spacing.sm }}
            value={withInterest}
            onChange={setWithInterest}
            options={[
              { value: false, label: 'Sin interés' },
              { value: true, label: 'Con interés' },
            ]}
          />
          {error ? <Text style={{ color: colors.danger, marginBottom: 8 }}>{error}</Text> : null}
          <Button title="Registrar compra" onPress={() => void add()} loading={saving} />
        </View>
      ) : (
        <Button icon="add-circle-outline" title="Registrar una compra" variant="secondary" onPress={() => setOpen(true)} />
      )}
    </Card>
  );
}

/** FIN-036 · Confirmación de actualización por corte (nivel 2, §42): la pregunta
 *  se PROPONE ("¿Cambió el cupo? Estaba en $X"), el usuario confirma o descarta —
 *  nunca un cambio silencioso. "No cambió" congela hasta el próximo corte (calma). */
function ReviewSection({ debtId, tick, onChanged }: { debtId: string; tick: number; onChanged: () => void }) {
  const { data, error: loadError, reload } = useApi(() => debtsApi.pendingReviews(), [debtId, tick]);
  const [editing, setEditing] = useState<string | null>(null);
  const [newValue, setNewValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [ack, setAck] = useState<string | null>(null);

  const mine = (data ?? []).filter((r) => r.debtId === debtId);
  if (!data && loadError) return <ErrorState message={loadError} onRetry={() => void reload()} />;
  if (mine.length === 0 && !ack) return null;

  const answer = async (field: string, changed: boolean) => {
    // §39: la tasa admite decimal regional; cupo/cuota son montos enteros.
    const value = changed
      ? field === 'interestRate' ? parseDecimal(newValue) : parseAmount(newValue)
      : undefined;
    if (changed && !value) return;
    setBusy(true);
    try {
      const r = await debtsApi.answerReview(debtId, field, { changed, newValue: value });
      setAck(r.acknowledgment);
      setEditing(null);
      setNewValue('');
      void reload();
      // Solo un CAMBIO confirmado recarga el detalle (el nuevo valor debe verse).
      // "No cambió" no recarga nada: así el acuse de calma queda visible (§42).
      if (changed) onChanged();
    } catch {
      /* la pregunta sigue visible; sin cambio silencioso */
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ borderColor: colors.primary, borderWidth: 1.5 }}>
      <Text style={{ ...type.title, fontSize: 15, color: colors.text }}><Ico name="search-outline" size={15} color={colors.textFaint} /> Una confirmación rápida</Text>
      {ack ? (
        <Text style={{ color: colors.textMuted, marginTop: 6, ...type.small }}>{ack}</Text>
      ) : null}
      {mine.map((r) => (
        <View key={r.field} style={{ marginTop: spacing.sm }}>
          <Text style={{ color: colors.text, ...type.body }}>
            ¿Cambió {r.label}?
            {r.currentValue != null ? ` Estaba en ${formatMoney(r.currentValue)}.` : ''}
          </Text>
          {editing === r.field ? (
            <View style={{ marginTop: spacing.sm }}>
              <Field
                label={`Nuevo valor de ${r.label}`}
                value={newValue}
                onChangeText={setNewValue}
                keyboardType="numeric"
                placeholder={r.currentValue != null ? String(r.currentValue) : ''}
              />
              <Button title="Confirmar el cambio" onPress={() => void answer(r.field, true)} loading={busy} />
            </View>
          ) : (
            <Row style={{ gap: spacing.sm, marginTop: spacing.sm }}>
              <Pressable
                onPress={() => void answer(r.field, false)}
                disabled={busy}
                style={{ flex: 1, minHeight: 44, justifyContent: 'center', padding: spacing.sm, borderRadius: radius.md, alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
              >
                <Text style={{ color: colors.text, fontWeight: '600', ...type.body }}>No cambió</Text>
              </Pressable>
              <Pressable
                onPress={() => setEditing(r.field)}
                disabled={busy}
                style={{ flex: 1, minHeight: 44, justifyContent: 'center', padding: spacing.sm, borderRadius: radius.md, alignItems: 'center', backgroundColor: colors.primary, borderWidth: 1, borderColor: colors.primary }}
              >
                <Text style={{ color: colors.textInverse, fontWeight: '600', ...type.body }}>Sí, cambió</Text>
              </Pressable>
            </Row>
          )}
        </View>
      ))}
      {/* P1(c): la promesa de calma viaja UNA vez, dentro del `ack` del backend. */}
    </Card>
  );
}

/** FIN-024 P2: la cuota venció y no hay pago registrado — conciliar o actuar. */
function OverdueBlock({ days }: { days: number }) {
  // Salto de tab (Registrar = ruta 'Add'): bubbling al navegador padre.
  const navigation = useNavigation<{ navigate: (r: string) => void }>();
  return (
    <Card style={{ borderColor: colors.warningDeep, borderWidth: 1.5 }}>
      <Text style={{ ...type.title, fontSize: 15, color: colors.text }}>
        <Ico name="alarm-outline" size={15} color={colors.warningDeep} /> Esta cuota venció hace {days} día{days === 1 ? '' : 's'}
      </Text>
      <Text style={{ color: colors.textMuted, marginTop: 4, ...type.small }}>
        No hay un pago registrado para esta cuota. Si ya la pagaste por otro medio, regístrala
        para que tus números digan la verdad; si no, cada día suma intereses — abajo puedes
        abonar directamente.
      </Text>
      <Pressable onPress={() => navigation.navigate('Add')} style={{ marginTop: spacing.sm }}>
        <Text style={{ color: colors.primary, fontWeight: '600', ...type.body }}>
          Registrar el pago <Ico name="arrow-forward" size={13} color={colors.primary} />
        </Text>
      </Pressable>
    </Card>
  );
}

/**
 * FIN-058 · "Adelanta plata": una sola tarjeta para el abono real (FIN-012, con el recibo del
 * backend como preview) y la simulación de un extra mensual (FIN-007). Montos rápidos en el
 * idioma de la persona (media cuota, una cuota, dos cuotas); el efecto se calcula al elegir el
 * monto, sin botón intermedio. Mismos endpoints y cálculos de siempre (§32).
 */
function AdvanceSection({
  debtId,
  balance,
  monthlyPayment,
  onChanged,
}: {
  debtId: string;
  balance: number;
  monthlyPayment: number;
  onChanged: () => void;
}) {
  const [mode, setMode] = useState<'una_vez' | 'cada_mes'>('una_vez');
  const [effect, setEffect] = useState<PrepayEffect>('reducir_plazo');
  const [pick, setPick] = useState<number | 'otro' | null>(null);
  const [custom, setCustom] = useState('');
  const [receipt, setReceipt] = useState<PrepayReceipt | null>(null);
  const [sim, setSim] = useState<SimulateResult | null>(null);
  const [scoreDelta, setScoreDelta] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roundTo = (n: number, step: number) => Math.max(step, Math.round(n / step) * step);
  // Decisión 2 del Fundador: los montos rápidos salen de la cuota (½, 1 y 2 cuotas).
  const quick: Array<{ label: string; value: number }> =
    monthlyPayment > 0
      ? [
          { label: 'Media cuota', value: roundTo(monthlyPayment / 2, 1000) },
          { label: 'Una cuota', value: roundTo(monthlyPayment, 1000) },
          { label: 'Dos cuotas', value: roundTo(monthlyPayment * 2, 1000) },
        ]
      : [
          { label: '$ 200.000', value: 200_000 },
          { label: '$ 500.000', value: 500_000 },
          { label: '$ 1.000.000', value: 1_000_000 },
        ];
  const amount = pick === 'otro' ? parseAmount(custom) : (pick ?? 0); // §39

  // El efecto se calcula solo, con una pequeña espera mientras la persona escribe.
  useEffect(() => {
    setReceipt(null);
    setSim(null);
    setScoreDelta(null);
    setError(null);
    if (!(amount > 0)) return;
    if (mode === 'una_vez' && amount > balance) {
      setError(`No puede superar el saldo de hoy (${formatMoney(balance)}).`);
      return;
    }
    let alive = true;
    const id = setTimeout(async () => {
      setBusy(true);
      try {
        if (mode === 'una_vez') {
          const r = await debtsApi.prepayPreview(debtId, amount, effect);
          if (alive) setReceipt(r);
        } else {
          const s = await debtsApi.simulateExtra(debtId, amount);
          if (!alive) return;
          setSim(s);
          // FIN-007: impacto en el Score vía el simulador unificado.
          const impact = await simulationsApi.run({ type: 'abono_extra', debtId, extraMonthly: amount }).catch(() => null);
          if (alive) setScoreDelta(impact ? impact.delta.score : null);
        }
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        if (alive) setBusy(false);
      }
    }, pick === 'otro' ? 500 : 0);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [amount, mode, effect, debtId, balance, pick]);

  const confirm = async () => {
    if (!(amount > 0)) return;
    setBusy(true);
    setError(null);
    try {
      await debtsApi.prepay(debtId, amount, effect);
      setPick(null);
      setCustom('');
      setReceipt(null);
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const payoff = () => {
    Alert.alert('Pagar todo', `Se registrará un pago por ${formatMoney(balance)} y la deuda quedará saldada. ¿Continuar?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Pagar todo',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await debtsApi.payoff(debtId);
              onChanged();
            } catch (e) {
              setError((e as Error).message);
            }
          })();
        },
      },
    ]);
  };

  const months = (n: number) => `${n} mes${n === 1 ? '' : 'es'}`;
  const effectText = (() => {
    if (busy) return 'Calculando…';
    if (!(amount > 0)) return mode === 'una_vez' ? 'Elige cuánto adelantas hoy y verás qué cambia.' : 'Elige cuánto extra pondrías cada mes y verás qué cambia.';
    if (mode === 'una_vez' && receipt) {
      const base = `Con ${formatMoney(amount)} hoy te ahorras ${formatMoney(receipt.interestSaved)} en intereses`;
      return receipt.effect === 'reducir_plazo'
        ? `${base} y terminas ${months(receipt.monthsSaved)} antes (${formatDate(receipt.after.payoffDate)}). El saldo quedaría en ${formatMoney(receipt.newBalance)}.`
        : `${base} y tu cuota baja a ${formatMoney(receipt.newMonthlyPayment)} (−${formatMoney(receipt.paymentSaved)}). El saldo quedaría en ${formatMoney(receipt.newBalance)}.`;
    }
    if (mode === 'cada_mes' && sim) {
      return `Con ${formatMoney(amount)} extra cada mes te ahorras ${formatMoney(sim.interestSaved)} en intereses y terminas ${months(sim.monthsSaved)} antes (${formatDate(sim.withExtra.payoffDate)}).${scoreDelta !== null ? ` Tu Score ${scoreDelta >= 0 ? 'sube' : 'baja'} ~${Math.abs(scoreDelta)} pts.` : ''}`;
    }
    return null;
  })();

  return (
    <Card>
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: 'una_vez', label: 'Una vez' },
          { value: 'cada_mes', label: 'Cada mes' },
        ]}
      />
      <Text style={{ color: colors.textMuted, ...type.small, marginTop: spacing.sm }}>
        {mode === 'una_vez' ? 'Un abono a capital hoy: pagas menos intereses y terminas antes, o bajas la cuota.' : '¿Y si pusieras un poco más cada mes? Mira cuánto te ahorrarías.'}
      </Text>
      <Row style={{ flexWrap: 'wrap', gap: 6, marginTop: spacing.sm }}>
        {quick.map((q) => (
          <SoftChip key={q.label} label={q.label} active={pick === q.value} onPress={() => setPick(pick === q.value ? null : q.value)} />
        ))}
        <SoftChip label="Otro" active={pick === 'otro'} onPress={() => setPick('otro')} />
      </Row>
      {pick === 'otro' ? (
        <View style={{ marginTop: spacing.sm }}>
          <Field label={mode === 'una_vez' ? '¿Cuánto abonas hoy?' : '¿Cuánto extra cada mes?'} value={custom} onChangeText={setCustom} keyboardType="numeric" placeholder={monthlyPayment > 0 ? String(Math.round(monthlyPayment)) : '500000'} />
        </View>
      ) : pick !== null ? (
        <Text style={{ color: colors.textFaint, ...type.caption, marginTop: 6 }}>{formatMoney(amount)}</Text>
      ) : null}
      {mode === 'una_vez' ? (
        <Row style={{ gap: 6, marginTop: spacing.sm }}>
          <SoftChip label="Terminar antes" active={effect === 'reducir_plazo'} onPress={() => setEffect('reducir_plazo')} />
          <SoftChip label="Bajar la cuota" active={effect === 'reducir_cuota'} onPress={() => setEffect('reducir_cuota')} />
        </Row>
      ) : null}

      {error ? <Text style={{ color: colors.danger, ...type.small, marginTop: spacing.sm }}>{error}</Text> : null}
      {effectText ? (
        <View style={{ backgroundColor: colors.primarySoft, borderRadius: radius.sm, padding: spacing.sm, marginTop: spacing.sm }} accessibilityLiveRegion="polite">
          <Text style={{ color: colors.primaryDark, ...type.body }}>{effectText}</Text>
        </View>
      ) : null}

      {mode === 'una_vez' && receipt && !busy ? (
        <View style={{ marginTop: spacing.sm }}>
          <Button icon="checkmark-circle-outline" title={`Registrar abono de ${formatMoney(amount)}`} onPress={() => void confirm()} loading={busy} />
        </View>
      ) : null}
      {mode === 'cada_mes' && sim ? (
        <Text style={{ color: colors.textFaint, ...type.caption, marginTop: spacing.sm }}>
          Es una simulación. Para hacerlo de verdad, registra el abono cada mes o renegocia la cuota.
        </Text>
      ) : null}
      {mode === 'una_vez' ? (
        <Pressable onPress={payoff} accessibilityRole="button" style={{ marginTop: spacing.sm, minHeight: 32, justifyContent: 'center' }}>
          <Text style={{ color: colors.textMuted, ...type.small, fontWeight: '600' }}>Pagar todo ({formatMoney(balance)})</Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

const INSURANCE_KIND_LABEL: Record<string, string> = {
  vida_deudor: 'Vida deudor',
  incendio_terremoto: 'Incendio/terremoto',
  todo_riesgo: 'Todo riesgo',
  desempleo: 'Desempleo',
  // FIN-023: cargo del banco (típico de tarjetas) — no es una póliza.
  cuota_manejo: 'Cuota de manejo',
  otro: 'Otro',
};

function InsuranceSection({
  debtId,
  insurances,
  breakdown,
  onChanged,
  variant = 'credit',
}: {
  debtId: string;
  insurances: DebtInsurance[];
  breakdown?: PaymentBreakdown;
  onChanged: () => void;
  /** BT-040: en una tarjeta el cargo típico es la cuota de manejo (sale preseleccionada). */
  variant?: 'credit' | 'card';
}) {
  const isCard = variant === 'card';
  const [showForm, setShowForm] = useState(false);
  // FIN-023: el alta distingue seguro vs cuota de manejo (cargo del banco).
  const [isCargo, setIsCargo] = useState(isCard);
  const [name, setName] = useState(isCard ? 'Cuota de manejo' : '');
  const [premium, setPremium] = useState('');
  const [financed, setFinanced] = useState(true);
  const [saving, setSaving] = useState(false);

  const add = async () => {
    const value = parseAmount(premium); // §39
    if (!name.trim() || !value) return;
    setSaving(true);
    try {
      await debtsApi.createInsurance(debtId, {
        // La cuota de manejo NUNCA lleva endoso/aseguradora (el API lo rechaza).
        kind: isCargo ? 'cuota_manejo' : undefined,
        name: name.trim(),
        monthlyPremium: value,
        financed,
      });
      setName('');
      setPremium('');
      setShowForm(false);
      onChanged();
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (ins: DebtInsurance) => {
    await debtsApi.updateInsurance(ins.id, { active: !ins.active });
    onChanged();
  };

  const remove = (ins: DebtInsurance) =>
    confirmRemove(ins.name, 'Dejará de contar en tu cuota real.', () => debtsApi.removeInsurance(ins.id).then(onChanged));

  return (
    <Card>
      <Text style={{ ...type.title, fontSize: 15, color: colors.text, marginBottom: spacing.sm }}>
        <Ico name="shield-checkmark-outline" size={15} color={colors.textFaint} /> {isCard ? 'Cargos de la tarjeta' : 'Seguros y cargos del crédito'}
      </Text>

      {breakdown && breakdown.insuranceMonthlyTotal > 0 ? (
        <View style={{ marginBottom: spacing.sm }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ color: colors.textMuted, ...type.small }}>{isCard ? 'Cuotas del mes' : 'Cuota del crédito'}</Text>
            <Text style={{ color: colors.text, ...type.small }}>{formatMoney(breakdown.basePayment)}</Text>
          </Row>
          {breakdown.insuranceFinanced > 0 ? (
            <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={{ color: colors.textMuted, ...type.small }}>Seguros y cargos en la cuota</Text>
              <Text style={{ color: colors.textMuted, ...type.small }}>{formatMoney(breakdown.insuranceFinanced)}</Text>
            </Row>
          ) : null}
          {breakdown.insuranceSeparate > 0 ? (
            <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={{ color: colors.textMuted, ...type.small }}>+ Seguros y cargos aparte</Text>
              <Text style={{ color: colors.text, ...type.small }}>{formatMoney(breakdown.insuranceSeparate)}</Text>
            </Row>
          ) : null}
          <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={{ fontWeight: '600', color: colors.text, ...type.body }}>Desembolso mensual real</Text>
            <Text style={{ fontWeight: '600', color: colors.text, ...type.body }}>
              {formatMoney(breakdown.totalMonthlyOutlay)}
            </Text>
          </Row>
        </View>
      ) : null}

      {insurances.map((ins, idx) => (
        <Row key={ins.id} style={{ justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: colors.surfaceAlt, opacity: ins.active ? 1 : 0.45 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '600', ...type.body }}>{ins.name}</Text>
            <Text style={{ color: colors.textFaint, ...type.caption }}>
              {INSURANCE_KIND_LABEL[ins.kind] ?? ins.kind} · {ins.financed ? 'en la cuota' : 'aparte'}
              {ins.endorsed ? ' · endosado' : ''}
              {!ins.active ? ' · inactivo' : ''}
            </Text>
          </View>
          <Text style={{ fontWeight: '600', color: colors.text, ...type.body, marginRight: spacing.sm }}>
            {formatMoney(toNumber(ins.monthlyPremium))}
          </Text>
          <Pressable
            onPress={() => void toggleActive(ins)}
            style={{ marginRight: spacing.sm }}
            accessibilityRole="button"
            accessibilityLabel={ins.active ? 'Pausar seguro' : 'Activar seguro'}
          >
            <Ico name={ins.active ? 'pause-circle-outline' : 'play-circle-outline'} size={20} color={colors.textFaint} />
          </Pressable>
          <Pressable onPress={() => remove(ins)} accessibilityRole="button" accessibilityLabel={`Eliminar ${ins.name}`}>
            <Ico name="trash-outline" size={18} color={colors.textFaint} />
          </Pressable>
        </Row>
      ))}

      {insurances.length === 0 && !showForm ? (
        <Text style={{ color: colors.textMuted, ...type.small, marginBottom: spacing.sm }}>
          {isCard
            ? 'Registra la cuota de manejo (o el seguro de la tarjeta) para que cuente en la cuota del mes y en "Te queda". Si envías el extracto por Telegram, Millo la lee sola.'
            : 'Registra los seguros del crédito (vida, incendio…) para ver tu cuota real. Si aportas tu propia póliza (endoso), aquí ves cuánto te ahorras.'}
        </Text>
      ) : null}

      {showForm ? (
        <View style={{ marginTop: spacing.sm }}>
          <Segmented
            style={{ marginBottom: spacing.sm }}
            value={isCargo}
            onChange={(v) => {
              setIsCargo(v);
              if (v && !name) setName('Cuota de manejo');
            }}
            options={[
              { value: false, label: 'Seguro' },
              { value: true, label: 'Cuota de manejo' },
            ]}
          />
          <Field
            label={isCargo ? 'Nombre del cargo' : 'Nombre del seguro'}
            value={name}
            onChangeText={setName}
            placeholder={isCargo ? 'Cuota de manejo' : 'Seguro de vida deudor'}
          />
          <Field
            label={isCargo ? 'Cargo mensual' : 'Prima mensual'}
            value={premium}
            onChangeText={setPremium}
            keyboardType="numeric"
            placeholder={isCargo ? '30000' : '45000'}
          />
          <Segmented
            style={{ marginBottom: spacing.sm }}
            value={financed}
            onChange={setFinanced}
            options={[
              { value: true, label: 'Va dentro de la cuota' },
              { value: false, label: 'Se paga aparte' },
            ]}
          />
          <Button title={isCargo ? 'Guardar cargo' : 'Guardar seguro'} onPress={() => void add()} loading={saving} />
        </View>
      ) : (
        <Button icon="add-circle-outline" title={isCard ? 'Agregar cuota de manejo o seguro' : 'Agregar seguro o cargo'} variant="secondary" onPress={() => setShowForm(true)} />
      )}
    </Card>
  );
}
