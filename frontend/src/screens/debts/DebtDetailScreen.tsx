import React, { useCallback, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, ErrorState, Field, FormScroll, HeroCard, Ico, Row, Skeleton } from '../../components/ui';
import { colors, radius, spacing, type } from '../../theme/colors';
import { formatDate, formatMoney, parseAmount, parseDecimal } from '../../utils/format';
import { AmortizationEntry, CardSummary, Debt, DebtInsurance, PaymentBreakdown, PrepayEffect, PrepayReceipt, toNumber } from '../../api/types';
import { debtsApi, simulationsApi, SimulateResult } from '../../api/endpoints';
import { useApi } from '../../utils/useApi';
import { DebtsStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<DebtsStackParamList, 'DebtDetail'>;

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
  const [showPlan, setShowPlan] = useState(false);
  const [extra, setExtra] = useState('');
  const [sim, setSim] = useState<SimulateResult | null>(null);
  const [scoreDelta, setScoreDelta] = useState<number | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  const runSim = async () => {
    const value = parseAmount(extra); // §39
    if (!value) return;
    setSimLoading(true);
    try {
      setSim(await debtsApi.simulateExtra(debtId, value));
      // FIN-007: impacto en el Score vía el simulador unificado.
      const impact = await simulationsApi
        .run({ type: 'abono_extra', debtId, extraMonthly: value })
        .catch(() => null);
      setScoreDelta(impact ? impact.delta.score : null);
    } finally {
      setSimLoading(false);
    }
  };

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
  //  - `cuotas_por_compra` (tarjeta/fintech): oculta el hero de saldo fijo y muestra
  //    la sección de cupo/compras (la espina, FIN-031);
  //  - `amortizado`: hero + toda la UI de amortización (plan, abono, simulador…);
  //  - `saldo_y_cuota_pactada` (informal): hero de saldo + cuota pactada, SIN plan de
  //    pago ni fecha de libertad falsa (§29.2).
  const model = data.scheduleModel ?? 'amortizado';
  const hasCard = !!data.capabilities?.installmentPurchases;
  const isAmortized = model === 'amortizado';

  return (
    <FormScroll onRefresh={refreshAll}>
      {model !== 'cuotas_por_compra' ? (
        <HeroCard>
          <Text style={{ color: colors.onPrimaryMuted, ...type.body }}>Saldo pendiente</Text>
          <Text style={{ color: colors.textInverse, ...type.hero }}>
            {formatMoney(toNumber(data.currentBalance))}
          </Text>
          <Text style={{ color: colors.onPrimaryMuted, ...type.body, marginTop: spacing.xs }}>
            Cuota mensual {formatMoney(toNumber(data.monthlyPayment))}
          </Text>
          {/* Informal (§29.2): se dice la verdad — sin cronograma, no hay fecha falsa. */}
          {model === 'saldo_y_cuota_pactada' ? (
            <Text style={{ color: colors.onPrimaryFaint, ...type.small, marginTop: spacing.xs }}>
              Sin cronograma formal — registras el saldo y tu cuota pactada.
            </Text>
          ) : null}
        </HeroCard>
      ) : null}

      {/* SPRINT-PULIDO-001 P3 (punto 10): de un vistazo — próximo vencimiento, días
          restantes y último pago. Datos que YA viajan en el payload; solo se pintan. */}
      <AtAGlance debt={data} amort={amort} />

      {/* FIN-044: renegociación (cuotas, tasa fija/variable, cuota, día de pago, desde cuándo). */}
      {model !== 'cuotas_por_compra' ? (
        <Button
          title="Renegociar / actualizar condiciones"
          icon="swap-horizontal-outline"
          variant="secondary"
          onPress={() => stackNav.navigate('RenegotiateDebt', { debtId, name: data.name })}
        />
      ) : null}

      {/* FIN-031/032: productos con cupo (tarjeta/fintech) — compras a cuotas. */}
      {hasCard ? <CardSection debtId={debtId} tick={tick} onChanged={() => void reload()} /> : null}

      {/* FIN-036: confirmación de actualización por corte (nivel 2, §42). */}
      <ReviewSection debtId={debtId} tick={tick} onChanged={() => void reload()} />

      {/* FIN-037: lecturas de profundidad — derivadas por la única autoridad del
          backend; aquí SOLO se renderizan (§32). Informan sin culpar (§29.2). */}
      {(data.depthReadings ?? []).map((r) => (
        <Card
          key={r.kind}
          style={r.severity === 'warning' ? { borderColor: colors.warning, borderWidth: 2 } : undefined}
        >
          <Text style={{ fontWeight: '700', fontSize: 15, color: colors.text }}>
            <Ico name={r.severity === 'warning' ? 'warning-outline' : 'bulb-outline'} color={r.severity === 'warning' ? colors.warning : colors.primary} /> {r.title}
          </Text>
          <Text style={{ color: colors.text, marginTop: 6, fontSize: 13, lineHeight: 19 }}>{r.body}</Text>
        </Card>
      ))}

      {/* FIN-024 P2: bloque de conciliación — solo si la cuota está vencida.
          Afirma lo OBSERVABLE ("no está registrada"), nunca el impago (§29.2). */}
      {data.overdueDays ? <OverdueBlock days={data.overdueDays} /> : null}

      {/* Resumen del crédito: cuándo termina, intereses y total a pagar */}
      {isAmortized && data.projection ? (
        <Card>
          <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: spacing.sm }}>
            <Ico name="calendar-outline" size={15} /> Resumen del crédito
          </Text>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ color: colors.textMuted }}>Terminas de pagar</Text>
            <Text style={{ fontWeight: '800', color: colors.text }}>
              {data.projection.payoffDate ? formatDate(data.projection.payoffDate) : '—'}
            </Text>
          </Row>
          <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={{ color: colors.textMuted }}>Cuotas restantes</Text>
            <Text style={{ fontWeight: '700', color: colors.text }}>
              {data.projection.numberOfPayments}
            </Text>
          </Row>
          <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={{ color: colors.textMuted }}>Total en intereses</Text>
            <Text style={{ fontWeight: '800', color: colors.danger }}>
              {formatMoney(data.projection.totalInterest)}
            </Text>
          </Row>
          <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={{ color: colors.textMuted }}>Total a pagar</Text>
            <Text style={{ fontWeight: '800', color: colors.text }}>
              {formatMoney(data.projection.totalPaid)}
            </Text>
          </Row>
        </Card>
      ) : null}

      {/* FIN-012: abono a capital y pago total anticipado (REALES) */}
      {isAmortized && data.status === 'activa' ? (
        <PrepaySection debtId={debtId} balance={toNumber(data.currentBalance)} onChanged={() => void reload()} />
      ) : null}

      {/* FIN-013: seguros del crédito y desglose de cuota real */}
      {isAmortized ? (
        <InsuranceSection
          debtId={debtId}
          insurances={data.insurances ?? []}
          breakdown={data.paymentBreakdown}
          onChanged={() => void reload()}
        />
      ) : null}

      {/* Simulador de abono extra */}
      {isAmortized ? (
      <Card>
        <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: spacing.sm }}>
          <Ico name="bulb-outline" size={15} color={colors.primary} /> Simulador de abono extra
        </Text>
        <Field
          label="¿Cuánto extra al mes?"
          value={extra}
          onChangeText={setExtra}
          keyboardType="numeric"
          placeholder="100000"
        />
        <Button title="Calcular ahorro" onPress={runSim} loading={simLoading} />
        {sim ? (
          <View style={{ marginTop: spacing.md }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ color: colors.textMuted }}>Ahorro en intereses</Text>
              <Text style={{ fontWeight: '800', color: colors.success }}>
                {formatMoney(sim.interestSaved)}
              </Text>
            </Row>
            <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={{ color: colors.textMuted }}>Meses que te ahorras</Text>
              <Text style={{ fontWeight: '800', color: colors.primary }}>{sim.monthsSaved}</Text>
            </Row>
            <Text style={{ color: colors.textMuted, marginTop: 4 }}>
              Nueva liquidación: {formatDate(sim.withExtra.payoffDate)}
            </Text>
            {scoreDelta !== null ? (
              <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
                <Text style={{ color: colors.textMuted }}>Impacto en tu Score</Text>
                <Text style={{ fontWeight: '800', color: scoreDelta >= 0 ? colors.success : colors.danger }}>
                  {scoreDelta >= 0 ? '+' : ''}{scoreDelta} pts
                </Text>
              </Row>
            ) : null}
          </View>
        ) : null}
      </Card>
      ) : null}

      {/* Tabla de amortización — colapsada por defecto (jerarquía, BP-16). */}
      {isAmortized && amort.length > 0 ? (
        <>
          <Pressable
            onPress={() => setShowPlan((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ expanded: showPlan }}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: spacing.sm, minHeight: 44 }}
          >
            <Text style={{ color: colors.text, ...type.title }}>Plan de pago · {amort.length} cuotas</Text>
            <Ionicons name={showPlan ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
          </Pressable>
          {showPlan ? amort.slice(0, 12).map((e) => (
            <Card key={e.periodNo} style={{ paddingVertical: spacing.sm }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={{ fontWeight: '600' }}>#{e.periodNo} · {formatDate(e.dueDate)}</Text>
                <Text style={{ fontWeight: '700' }}>{formatMoney(toNumber(e.payment))}</Text>
              </Row>
              <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  Capital {formatMoney(toNumber(e.principalPart))}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  Interés {formatMoney(toNumber(e.interestPart))}
                </Text>
              </Row>
            </Card>
          )) : null}
          {showPlan && amort.length > 12 ? (
            <Text style={{ color: colors.textMuted, textAlign: 'center', marginBottom: spacing.lg }}>
              … y {amort.length - 12} cuotas más
            </Text>
          ) : null}
        </>
      ) : null}
    </FormScroll>
  );
}

/** Resumen de un vistazo (P3 punto 10). Solo pinta lo que el payload ya trae. */
function AtAGlance({ debt, amort }: { debt: Debt; amort: AmortizationEntry[] }) {
  const items: Array<{ icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string; tone?: string }> = [];
  if (debt.nextDueDate) {
    const days = Math.ceil((new Date(debt.nextDueDate).getTime() - Date.now()) / 86_400_000);
    items.push({
      icon: 'calendar-outline',
      label: 'Próximo vencimiento',
      value: `${formatDate(debt.nextDueDate)}${days >= 0 ? ` · en ${days} día${days === 1 ? '' : 's'}` : ''}`,
      tone: days < 0 ? colors.warning : undefined,
    });
  }
  const paid = amort.filter((e) => e.paidAt).sort((a, b) => String(b.paidAt).localeCompare(String(a.paidAt)))[0];
  if (paid?.paidAt) {
    items.push({ icon: 'checkmark-circle-outline', label: 'Último pago', value: `${formatDate(paid.paidAt)} · ${formatMoney(toNumber(paid.payment))}` });
  }
  if (debt.projection?.payoffDate) {
    items.push({ icon: 'flag-outline', label: 'Libre de esta deuda', value: formatDate(debt.projection.payoffDate) });
  }
  if (items.length === 0) return null;
  return (
    <Card>
      {items.map((it, i) => (
        <Row key={it.label} style={{ justifyContent: 'space-between', marginTop: i === 0 ? 0 : spacing.sm }}>
          <Row style={{ gap: spacing.sm, flex: 1 }}>
            <Ionicons name={it.icon} size={18} color={it.tone ?? colors.primary} />
            <Text style={{ color: colors.textMuted, ...type.body }}>{it.label}</Text>
          </Row>
          <Text style={{ color: it.tone ?? colors.text, ...type.body, fontWeight: '700' }}>{it.value}</Text>
        </Row>
      ))}
    </Card>
  );
}

/** FIN-031 · Tarjeta de crédito: cupo/saldo (derivados), compras a cuotas con
 *  su trazabilidad (G) y registro de una compra nueva (baja fricción, H). */
function CardSection({ debtId, tick, onChanged }: { debtId: string; tick: number; onChanged: () => void }) {
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
      setAck(`✅ ${res.acknowledgment}${res.summary.availableCredit != null ? ` Cupo disponible: ${formatMoney(res.summary.availableCredit)}.` : ''}`);
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
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
      <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: spacing.sm }}><Ico name="card-outline" size={16} /> Tu tarjeta</Text>
      {ack ? (
        <View style={{ backgroundColor: colors.successSoft, borderRadius: radius.sm, padding: spacing.sm, marginBottom: spacing.sm }}>
          <Text style={{ color: colors.primaryDark, ...type.body }}>{ack}</Text>
        </View>
      ) : null}
      {data.creditLimit != null ? (
        <>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ color: colors.textMuted }}>Cupo disponible</Text>
            {/* FIN-037: en sobrecupo el disponible es negativo — verde mentiría (§29.2). */}
            <Text style={{ fontWeight: '800', color: (data.availableCredit ?? 0) < 0 ? colors.warning : colors.success }}>
              {formatMoney(data.availableCredit ?? 0)}
            </Text>
          </Row>
          <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={{ color: colors.textMuted }}>Utilizado</Text>
            <Text style={{ color: colors.text }}>
              {formatMoney(data.usedAmount)} de {formatMoney(data.creditLimit)}
            </Text>
          </Row>
        </>
      ) : (
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>
          Registra el cupo de tu tarjeta al editarla para ver cuánto te queda.
        </Text>
      )}

      {data.purchases.length > 0 ? (
        <View style={{ marginTop: spacing.md }}>
          <Text style={{ fontWeight: '600', color: colors.text, marginBottom: 6 }}>Tus compras a cuotas</Text>
          {data.purchases.map((p, idx) => (
            <Pressable key={p.id} onPress={() => voidPurchase(p.id, p.canVoid)} accessibilityRole="button" accessibilityLabel={`${p.note || 'Compra'} de ${formatMoney(p.amount)}, ${p.canVoid ? 'toca para anular' : 'con pagos aplicados'}`}>
              <Row style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text }} numberOfLines={1}>
                    {idx === 0 ? <Text style={{ color: colors.primary, fontWeight: '700' }}>Última · </Text> : null}
                    {p.note || `Compra de ${formatMoney(p.amount)}`}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                    {/* Trazabilidad (G): de dónde salió cada cuota. */}
                    {p.installmentsCount} cuota{p.installmentsCount === 1 ? '' : 's'} · {formatDate(p.occurredAt)} ·{' '}
                    {p.paidInstallments} pagada{p.paidInstallments === 1 ? '' : 's'}
                  </Text>
                </View>
                <Text style={{ fontWeight: '700', color: colors.text }}>{formatMoney(p.pendingBalance)}</Text>
              </Row>
            </Pressable>
          ))}
        </View>
      ) : null}

      {open ? (
        <View style={{ marginTop: spacing.sm }}>
          <Field label="Monto de la compra" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="600000" />
          <Field label="¿En cuántas cuotas?" value={installments} onChangeText={setInstallments} keyboardType="numeric" placeholder="3" />
          <Row style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
            {[
              { v: false, label: 'Sin interés' },
              { v: true, label: 'Con interés' },
            ].map((opt) => (
              <Pressable
                key={String(opt.v)}
                onPress={() => setWithInterest(opt.v)}
                style={{
                  flex: 1,
                  padding: spacing.sm,
                  borderRadius: radius.md,
                  alignItems: 'center',
                  backgroundColor: withInterest === opt.v ? colors.primary : colors.surface,
                  borderWidth: 1,
                  borderColor: withInterest === opt.v ? colors.primary : colors.border,
                }}
              >
                <Text style={{ color: withInterest === opt.v ? colors.textInverse : colors.text, fontSize: 12 }}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </Row>
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
    <Card style={{ borderColor: colors.primary, borderWidth: 2 }}>
      <Text style={{ fontWeight: '700', fontSize: 15, color: colors.text }}><Ico name="search-outline" size={15} /> Una confirmación rápida</Text>
      {ack ? (
        <Text style={{ color: colors.textMuted, marginTop: 6, fontSize: 13 }}>{ack}</Text>
      ) : null}
      {mine.map((r) => (
        <View key={r.field} style={{ marginTop: spacing.sm }}>
          <Text style={{ color: colors.text, fontSize: 14, lineHeight: 20 }}>
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
                style={{ flex: 1, padding: spacing.sm, borderRadius: radius.md, alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
              >
                <Text style={{ color: colors.text, fontSize: 13 }}>No cambió</Text>
              </Pressable>
              <Pressable
                onPress={() => setEditing(r.field)}
                disabled={busy}
                style={{ flex: 1, padding: spacing.sm, borderRadius: radius.md, alignItems: 'center', backgroundColor: colors.primary, borderWidth: 1, borderColor: colors.primary }}
              >
                <Text style={{ color: colors.textInverse, fontSize: 13 }}>Sí, cambió</Text>
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
    <Card style={{ borderColor: colors.warning, borderWidth: 2 }}>
      <Text style={{ fontWeight: '700', fontSize: 15, color: colors.text }}>
        ⏰ Esta cuota venció hace {days} día{days === 1 ? '' : 's'}
      </Text>
      <Text style={{ color: colors.textMuted, marginTop: 4, fontSize: 13, lineHeight: 19 }}>
        No hay un pago registrado para esta cuota. Si ya la pagaste por otro medio, regístrala
        para que tus números digan la verdad; si no, cada día suma intereses — abajo puedes
        abonar directamente.
      </Text>
      <Pressable onPress={() => navigation.navigate('Add')} style={{ marginTop: spacing.sm }}>
        <Text style={{ color: colors.primary, fontWeight: '700' }}><Ico name="checkmark-circle-outline" color={colors.primary} /> Registrar el pago →</Text>
      </Pressable>
    </Card>
  );
}

/** FIN-012: abono a capital con preview=recibo (misma función pura en backend). */
function PrepaySection({
  debtId,
  balance,
  onChanged,
}: {
  debtId: string;
  balance: number;
  onChanged: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [effect, setEffect] = useState<PrepayEffect>('reducir_plazo');
  const [receipt, setReceipt] = useState<PrepayReceipt | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = () => parseAmount(amount); // §39

  const preview = async () => {
    const value = parsed();
    if (!value) return;
    setBusy(true);
    setError(null);
    try {
      setReceipt(await debtsApi.prepayPreview(debtId, value, effect));
    } catch (e) {
      setError((e as Error).message);
      setReceipt(null);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    const value = parsed();
    if (!value) return;
    setBusy(true);
    setError(null);
    try {
      await debtsApi.prepay(debtId, value, effect);
      setAmount('');
      setReceipt(null);
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const payoff = () => {
    Alert.alert(
      'Pagar totalmente',
      `Se registrará un pago por ${formatMoney(balance)} y la deuda quedará saldada. ¿Continuar?`,
      [
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
      ],
    );
  };

  return (
    <Card>
      <Text style={{ fontWeight: '700', fontSize: 16 }}><Ico name="cash-outline" size={16} /> Abonar a capital</Text>
      {/* FIN-018 4ª iteración (CPSAO): el término se mantiene por precisión,
          acompañado del beneficio en lenguaje llano. */}
      <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2, marginBottom: spacing.sm }}>
        Adelanta plata a tu deuda: pagas menos intereses y terminas antes (o bajas tu cuota).
      </Text>
      <Field
        label="¿Cuánto quieres abonar?"
        value={amount}
        onChangeText={(t) => {
          setAmount(t);
          setReceipt(null);
        }}
        keyboardType="numeric"
        placeholder="2000000"
      />
      <Row style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
        {(
          [
            { v: 'reducir_plazo', label: 'Terminar antes' },
            { v: 'reducir_cuota', label: 'Bajar la cuota' },
          ] as Array<{ v: PrepayEffect; label: string }>
        ).map((opt) => (
          <Pressable
            key={opt.v}
            onPress={() => {
              setEffect(opt.v);
              setReceipt(null);
            }}
            style={{
              flex: 1,
              padding: spacing.sm,
              borderRadius: radius.md,
              alignItems: 'center',
              backgroundColor: effect === opt.v ? colors.primary : colors.surface,
              borderWidth: 1,
              borderColor: effect === opt.v ? colors.primary : colors.border,
            }}
          >
            <Text style={{ color: effect === opt.v ? colors.textInverse : colors.text, fontSize: 13 }}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </Row>

      {error ? <Text style={{ color: colors.danger, marginBottom: 8 }}>{error}</Text> : null}

      {receipt ? (
        <View style={{ marginBottom: spacing.sm }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ color: colors.textMuted }}>Intereses que te ahorras</Text>
            <Text style={{ fontWeight: '800', color: colors.success }}>
              {formatMoney(receipt.interestSaved)}
            </Text>
          </Row>
          {receipt.effect === 'reducir_plazo' ? (
            <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={{ color: colors.textMuted }}>Cuotas restantes</Text>
              <Text style={{ fontWeight: '700', color: colors.text }}>
                {receipt.before.months} → {receipt.after.months}
              </Text>
            </Row>
          ) : (
            <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={{ color: colors.textMuted }}>Nueva cuota</Text>
              <Text style={{ fontWeight: '700', color: colors.text }}>
                {formatMoney(receipt.newMonthlyPayment)} (−{formatMoney(receipt.paymentSaved)})
              </Text>
            </Row>
          )}
          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
            Nueva liquidación: {formatDate(receipt.after.payoffDate)} · saldo {formatMoney(receipt.newBalance)}
          </Text>
          <Button icon="checkmark-circle-outline" title="Confirmar abono" onPress={() => void confirm()} loading={busy} />
        </View>
      ) : (
        <Button title="Ver efecto del abono" variant="secondary" onPress={() => void preview()} loading={busy} />
      )}

      <Button title={`Pagar totalmente (${formatMoney(balance)})`} variant="secondary" onPress={payoff} />
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
}: {
  debtId: string;
  insurances: DebtInsurance[];
  breakdown?: PaymentBreakdown;
  onChanged: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  // FIN-023: el alta distingue seguro vs cuota de manejo (cargo del banco).
  const [isCargo, setIsCargo] = useState(false);
  const [name, setName] = useState('');
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

  const remove = async (ins: DebtInsurance) => {
    await debtsApi.removeInsurance(ins.id);
    onChanged();
  };

  return (
    <Card>
      <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: spacing.sm }}>
        <Ico name="shield-checkmark-outline" size={15} /> Seguros y cargos del crédito
      </Text>

      {breakdown && breakdown.insuranceMonthlyTotal > 0 ? (
        <View style={{ marginBottom: spacing.sm }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ color: colors.textMuted }}>Cuota del crédito</Text>
            <Text style={{ color: colors.text }}>{formatMoney(breakdown.basePayment)}</Text>
          </Row>
          {breakdown.insuranceFinanced > 0 ? (
            <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={{ color: colors.textMuted }}>Seguros y cargos en la cuota</Text>
              <Text style={{ color: colors.textMuted }}>{formatMoney(breakdown.insuranceFinanced)}</Text>
            </Row>
          ) : null}
          {breakdown.insuranceSeparate > 0 ? (
            <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={{ color: colors.textMuted }}>+ Seguros y cargos aparte</Text>
              <Text style={{ color: colors.text }}>{formatMoney(breakdown.insuranceSeparate)}</Text>
            </Row>
          ) : null}
          <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={{ fontWeight: '700', color: colors.text }}>Desembolso mensual real</Text>
            <Text style={{ fontWeight: '800', color: colors.text }}>
              {formatMoney(breakdown.totalMonthlyOutlay)}
            </Text>
          </Row>
        </View>
      ) : null}

      {insurances.map((ins) => (
        <Row key={ins.id} style={{ justifyContent: 'space-between', marginBottom: 6, opacity: ins.active ? 1 : 0.45 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '600' }}>{ins.name}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>
              {INSURANCE_KIND_LABEL[ins.kind] ?? ins.kind} · {ins.financed ? 'en la cuota' : 'aparte'}
              {ins.endorsed ? ' · endosado' : ''}
              {!ins.active ? ' · inactivo' : ''}
            </Text>
          </View>
          <Text style={{ fontWeight: '700', color: colors.text, marginRight: spacing.sm }}>
            {formatMoney(toNumber(ins.monthlyPremium))}
          </Text>
          <Pressable onPress={() => void toggleActive(ins)} style={{ marginRight: spacing.sm }}>
            <Text style={{ fontSize: 16 }}>{ins.active ? '⏸️' : '▶️'}</Text>
          </Pressable>
          <Pressable onPress={() => void remove(ins)}>
            <Ico name="trash-outline" size={18} color={colors.textMuted} />
          </Pressable>
        </Row>
      ))}

      {insurances.length === 0 && !showForm ? (
        <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: spacing.sm }}>
          Registra los seguros del crédito (vida, incendio…) para ver tu cuota real. Si aportas tu
          propia póliza (endoso), aquí ves cuánto te ahorras.
        </Text>
      ) : null}

      {showForm ? (
        <View style={{ marginTop: spacing.sm }}>
          <Row style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
            {[
              { v: false, label: 'Seguro' },
              { v: true, label: 'Cuota de manejo' },
            ].map((opt) => (
              <Pressable
                key={String(opt.v)}
                onPress={() => {
                  setIsCargo(opt.v);
                  if (opt.v && !name) setName('Cuota de manejo');
                }}
                style={{
                  flex: 1,
                  padding: spacing.sm,
                  borderRadius: radius.md,
                  alignItems: 'center',
                  backgroundColor: isCargo === opt.v ? colors.primary : colors.surface,
                  borderWidth: 1,
                  borderColor: isCargo === opt.v ? colors.primary : colors.border,
                }}
              >
                <Text style={{ color: isCargo === opt.v ? colors.textInverse : colors.text, fontSize: 12 }}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </Row>
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
          <Row style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
            {[
              { v: true, label: 'Va dentro de la cuota' },
              { v: false, label: 'Se paga aparte' },
            ].map((opt) => (
              <Pressable
                key={String(opt.v)}
                onPress={() => setFinanced(opt.v)}
                style={{
                  flex: 1,
                  padding: spacing.sm,
                  borderRadius: radius.md,
                  alignItems: 'center',
                  backgroundColor: financed === opt.v ? colors.primary : colors.surface,
                  borderWidth: 1,
                  borderColor: financed === opt.v ? colors.primary : colors.border,
                }}
              >
                <Text style={{ color: financed === opt.v ? colors.textInverse : colors.text, fontSize: 12 }}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </Row>
          <Button title={isCargo ? 'Guardar cargo' : 'Guardar seguro'} onPress={() => void add()} loading={saving} />
        </View>
      ) : (
        <Button icon="add-circle-outline" title="Agregar seguro o cargo" variant="secondary" onPress={() => setShowForm(true)} />
      )}
    </Card>
  );
}
