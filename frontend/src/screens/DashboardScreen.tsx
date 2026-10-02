import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { Button, Card, ErrorState, GroupLabel, Ico, ProgressBar, Row, SegmentBar, Skeleton } from '../components/ui';
import { IncomeSplit } from '../components/IncomeSplit';
import { CategoryGlyph } from '../components/CategoryGlyph';
import { colors, radius, spacing, type } from '../theme/colors';
import { formatLocalDate, formatMoney } from '../utils/format';
import { useApi } from '../utils/useApi';
import { dashboardApi, debtsApi, gamificationApi } from '../api/endpoints';
import { FlowSection, GamificationProfile, HomeDebt, HomeIncomeSource } from '../api/types';
import { useAuthStore } from '../store/auth.store';
import { useSync } from '../offline/useSync';
import { LocalTransaction, transactionsRepo } from '../offline/transactionsRepo';
import { EditTransactionModal, EditableMovement } from './transactions/EditTransactionModal';

const KIND_META: Record<string, { sign: string; color: string }> = {
  ingreso: { sign: '+', color: colors.success },
  gasto: { sign: '-', color: colors.danger },
  pago_deuda: { sign: '-', color: colors.primary },
  transferencia: { sign: '', color: colors.textMuted },
};

/** Semáforo de interpretación (antes emojis 🟢🟡🔴, DEC-0040 §7). */
const LEVEL_COLOR: Record<string, string> = { verde: colors.success, amarillo: colors.warning, rojo: colors.danger };

export function DashboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useAuthStore((s) => s.user);
  // BT-037: las tres fuentes se pintan con lo de la última vez y se refrescan en silencio.
  const dashboard = useApi(() => dashboardApi.home(), [], { cacheKey: 'home' });
  const summary = useApi(() => debtsApi.summary(), [], { cacheKey: 'debts-summary' });
  const gamification = useApi(() => gamificationApi.profile(), [], { cacheKey: 'gamification' });
  const sync = useSync();
  const [recent, setRecent] = useState<LocalTransaction[]>([]);
  // FIN-028: movimiento en edición (toque en una fila de "Movimientos recientes").
  const [editing, setEditing] = useState<EditableMovement | null>(null);

  const loadRecent = useCallback(async () => {
    try {
      setRecent(await transactionsRepo.list(5));
    } catch {
      /* la caché local puede no estar lista aún */
    }
  }, []);

  useEffect(() => {
    void loadRecent();
  }, [loadRecent, sync.lastResult]);

  const reloadDashboard = dashboard.reload;
  const reloadSummary = summary.reload;
  const reloadGamification = gamification.reload;

  // BP-03 (misma causa raíz que el P0-2 del sprint): Inicio mostraba cifras viejas
  // al volver desde Registrar. Recarga las 3 fuentes cada vez que gana foco.
  useFocusEffect(
    useCallback(() => {
      void reloadDashboard();
      void reloadSummary();
      void reloadGamification();
    }, [reloadDashboard, reloadSummary, reloadGamification]),
  );

  // El control de "refrescar" solo gira cuando la persona lo pide o no hay nada que mostrar.
  const [pulling, setPulling] = useState(false);
  const loading = (dashboard.loading || summary.loading) && !dashboard.data;
  const reload = async () => {
    setPulling(true);
    try {
      await Promise.all([dashboard.reload(), summary.reload(), gamification.reload(), sync.sync(), loadRecent()]);
    } finally {
      setPulling(false);
    }
  };

  const d = dashboard.data;
  const cycle = d ? cycleProgress(d.period.start, d.period.end) : null;
  const firstName = user?.fullName ? user.fullName.split(' ')[0] : null;

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.md }}
      refreshControl={<RefreshControl refreshing={pulling} onRefresh={() => void reload()} tintColor={colors.primary} />}
    >
      <Row style={{ justifyContent: 'space-between', marginBottom: spacing.md }}>
        <Text style={{ color: colors.text, ...type.heading }} accessibilityRole="header">
          Hola{firstName ? `, ${firstName}` : ''}
        </Text>
        <Pressable
          onPress={() => navigation.navigate('Copilot')}
          accessibilityRole="button"
          accessibilityLabel="Abrir el Copiloto"
          hitSlop={8}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primaryDark} />
        </Pressable>
      </Row>

      {/* Hero ÚNICO (FIN-017/018/020, §32): la cifra viene del servicio único de
          Presupuesto. Tocarlo abre Presupuesto, la casa del detalle (FIN-038). */}
      {dashboard.error && !d ? (
        <ErrorState message={friendlyError(dashboard.error)} onRetry={() => void reload()} />
      ) : !d && loading ? (
        <Skeleton hero lines={3} />
      ) : d ? (
        <Pressable onPress={() => navigation.navigate('Budget')} accessibilityRole="button" accessibilityLabel={`Te queda para gastar ${formatMoney(d.teQueda.amount)}. Abrir Mi mes`}>
          {/* Inicio · opción G (Fundador, 2026-09-29): tarjeta blanca + barra que reparte
              el ingreso del ciclo. Todas las cifras salen de `teQueda` (§32). */}
          <Card style={{ padding: spacing.md }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ color: colors.textMuted, ...type.small }}>Te queda para gastar</Text>
              <Row style={{ gap: 2 }}>
                <Text style={{ color: colors.textMuted, ...type.small }}>hasta el {shortDate(d.teQueda.until)}</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.textFaint} />
              </Row>
            </Row>
            <Text style={{ color: d.teQueda.amount < 0 ? colors.danger : colors.text, fontSize: 32, fontWeight: '800', marginTop: 2 }}>
              {formatMoney(d.teQueda.amount)}
            </Text>
            {d.teQueda.perDay !== null && d.teQueda.amount > 0 ? (
              <Text style={{ color: colors.textMuted, ...type.small }}>
                ≈ {formatMoney(d.teQueda.perDay)} por día · {d.teQueda.daysLeft} día{d.teQueda.daysLeft === 1 ? '' : 's'}
              </Text>
            ) : null}
            <IncomeSplit teQueda={d.teQueda} />
            {d.interpretation.cashflow ? (
              <Text style={{ color: colors.textMuted, ...type.small, marginTop: spacing.sm }}>
                <Ico name="ellipse" size={10} color={LEVEL_COLOR[d.interpretation.cashflow.level] ?? colors.textMuted} /> {d.interpretation.cashflow.text}
              </Text>
            ) : null}
            {cycle ? (
              <Text style={{ color: colors.textFaint, ...type.caption, marginTop: spacing.xs }}>
                Día {cycle.day} de {cycle.total} del ciclo · {d.period.label}
              </Text>
            ) : null}
          </Card>
        </Pressable>
      ) : null}

      {gamification.data ? <CelebrationModal profile={gamification.data} onClosed={() => void gamification.reload()} /> : null}

      {sync.pending > 0 ? (
        <Pressable onPress={() => void sync.sync()} accessibilityRole="button" accessibilityLabel="Reintentar sincronización">
          <View style={{ backgroundColor: colors.warningSoft, borderColor: colors.warning, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md }}>
            <Row style={{ gap: spacing.sm }}>
              <Ionicons name={sync.syncing ? 'sync-outline' : 'cloud-upload-outline'} size={18} color={colors.warning} />
              <Text style={{ color: colors.warning, ...type.body, fontWeight: '600', flex: 1 }}>
                {sync.syncing ? 'Sincronizando…' : `${sync.pending} cambio(s) sin sincronizar · toca para reintentar`}
              </Text>
            </Row>
          </View>
        </Pressable>
      ) : null}

      {/* DEC-0040 §7 (orden de Inicio): Inicio responde solo "¿cómo voy este ciclo?":
          Te queda → este mes → próximo pago → en qué se va → últimos movimientos.
          Patrimonio y ahorro viven en Salud ("Lo que tienes"), que es su casa. */}
      <GroupLabel title="Este mes" />
      <Row style={{ gap: spacing.md, alignItems: 'stretch' }}>
        <FlowStat label="Gastos" flow={d?.expense} color={colors.text} onPress={() => navigation.navigate('Transactions', { kind: 'gasto' })} />
        <FlowStat label="Ingresos" flow={d?.income} color={colors.primary} onPress={() => navigation.navigate('Transactions', { kind: 'ingreso' })} />
      </Row>

      {/* FIN-017 P2: la deuda como tarjeta normal (el hero es único). */}
      {summary.data && summary.data.debtsCount > 0 ? (
        <>
          <GroupLabel title={summary.data.upcoming?.[0] ? 'Próximo pago' : 'Tus deudas'} tone={summary.data.upcoming?.[0] ? colors.warningDeep : colors.primaryDark} />
          <Pressable
            onPress={() =>
              (navigation as unknown as { navigate: (name: string, params?: unknown) => void }).navigate('Debts', { screen: 'DebtsList' })
            }
            accessibilityRole="button"
            accessibilityLabel="Ver mis deudas"
          >
            <Card>
              {summary.data.upcoming?.[0] ? (
                <Row style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 }} numberOfLines={1}>
                    {summary.data.upcoming[0].name}
                  </Text>
                  <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>{formatMoney(summary.data.upcoming[0].amount)}</Text>
                </Row>
              ) : null}
              <Row style={{ justifyContent: 'space-between', marginTop: 4, gap: 8 }}>
                <Text style={{ color: colors.textMuted, ...type.small, flex: 1 }}>
                  Debes {formatMoney(summary.data.totalDebt)} en {summary.data.debtsCount} deuda{summary.data.debtsCount === 1 ? '' : 's'}
                </Text>
                {summary.data.upcoming?.[0] ? (
                  <Text style={{ color: colors.textMuted, ...type.small }}>vence {shortDate(summary.data.upcoming[0].dueDate)}</Text>
                ) : null}
              </Row>
              <Text style={{ color: colors.textFaint, ...type.caption, marginTop: 2 }}>
                {formatMoney(d?.debtPayments ?? 0)} pagado desde el {d ? shortDate(d.period.start) : '—'}
              </Text>
              {d?.interpretation.debt ? (
                <Text style={{ color: colors.textMuted, ...type.small, marginTop: spacing.xs }}>
                  <Ico name="ellipse" size={10} color={LEVEL_COLOR[d.interpretation.debt.level] ?? colors.textMuted} /> {d.interpretation.debt.text}
                </Text>
              ) : null}
              {/* FIN-018 4ª iteración — puente narrativo: margen verde + deuda viva → abono. */}
              {d?.interpretation.cashflow?.level === 'verde' && summary.data.upcoming?.[0] ? (
                <Pressable
                  onPress={() =>
                    // BT-039: `initial: false` deja Mis deudas debajo, así "atrás" funciona.
                    (navigation as unknown as { navigate: (name: string, params: unknown) => void }).navigate('Debts', {
                      screen: 'DebtDetail',
                      initial: false,
                      params: { debtId: summary.data!.upcoming[0].debtId, name: summary.data!.upcoming[0].name },
                    })
                  }
                  accessibilityRole="link"
                  style={{ marginTop: spacing.sm }}
                >
                  <Text style={{ color: colors.primary, ...type.small, fontWeight: '700' }}>
                    Tienes margen: adelanta un pago y ahorra intereses →
                  </Text>
                </Pressable>
              ) : null}
            </Card>
          </Pressable>
        </>
      ) : null}

      {/* FIN-057 (boceto A): las cuotas de deudas entran a la foto, siempre visibles mientras
          haya deudas; el porcentaje es sobre gastos + pagos de deudas (decisión del Fundador). */}
      {d && (d.expense.byCategory.length > 0 || (d.debt && (d.debt.paid > 0 || d.debt.committed > 0))) ? (
        <>
          <GroupLabel
            title="En qué se te va"
            action="Ver todo"
            onAction={() => navigation.navigate('Categories', { tab: 'gastos' })}
          />
          <Card>
            {(() => {
              const showDebt = !!d.debt && (d.debt.paid > 0 || d.debt.committed > 0);
              const cats = d.expense.byCategory.slice(0, showDebt ? 2 : 3);
              const rows: React.ReactNode[] = cats.map((c) => <CategoryBar key={c.id ?? c.name} c={c} />);
              if (showDebt && d.debt) {
                const debtRow = (
                  <DebtRow
                    key="deudas"
                    debt={d.debt}
                    onPress={() => (navigation as unknown as { navigate: (name: string, params?: unknown) => void }).navigate('Debts', { screen: 'DebtsList' })}
                  />
                );
                // La fila entra en su lugar por monto (la cuota del mes), pero nunca sale de la lista.
                const idx = cats.findIndex((c) => c.amount < debtAmount(d.debt!));
                rows.splice(idx === -1 ? rows.length : idx, 0, debtRow);
              }
              return rows;
            })()}
          </Card>
        </>
      ) : null}

      {/* FIN-057 (boceto B): "Cómo te llega la plata" — solo cuando hay más de una fuente;
          para quien vive de un salario, Inicio no cambia. */}
      {d && d.income.sources && d.income.sources.length > 1 ? (
        <>
          <GroupLabel
            title="Cómo te llega la plata"
            action="Ver todo"
            onAction={() => navigation.navigate('Categories', { tab: 'ingresos' })}
          />
          <Card>
            <SegmentBar
              height={10}
              parts={d.income.sources.map((s) => ({ key: s.id, label: s.name, value: s.amount, color: s.kind === 'fijo' ? colors.primary : s.color }))}
            />
            <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
              {d.income.sources.slice(0, 3).map((s) => (
                <SourceRow
                  key={s.id}
                  s={s}
                  onPress={() =>
                    s.kind === 'fijo'
                      ? navigation.navigate('Budget')
                      : navigation.navigate('Transactions', { kind: 'ingreso', ...(s.id !== 'sin' ? { categoryId: s.id } : {}) })
                  }
                />
              ))}
            </View>
          </Card>
        </>
      ) : null}

      {d && d.income.variable > 0 && d.income.byCategory.every((c) => c.name === 'Sin categoría') ? (
        <Card>
          <Pressable onPress={() => navigation.navigate('Main', { screen: 'Add' } as never)} accessibilityRole="link">
            <Row style={{ gap: spacing.sm }}>
              <Ionicons name="pricetag-outline" size={18} color={colors.primary} />
              <Text style={{ color: colors.primary, ...type.body, fontWeight: '600', flex: 1 }}>
                Tus ingresos del día a día aún no tienen categoría · toca para organizarlos
              </Text>
            </Row>
          </Pressable>
        </Card>
      ) : null}

      {/* Movimientos recientes (FIN-014/018/028) — el detalle completo vive en el
          historial (FIN-038), no en Registrar. */}
      <GroupLabel title="Movimientos recientes" action="Ver todos" onAction={() => navigation.navigate('Transactions')} />
      {!d && loading ? (
        <Skeleton lines={3} />
      ) : d?.recentTransactions.length ? (
        <Card>
          {d.recentTransactions.slice(0, 4).map((t, i) => {
            const meta = KIND_META[t.kind] ?? KIND_META.transferencia;
            return (
              <Pressable
                key={t.id}
                onPress={() => setEditing({ id: t.id, kind: t.kind, amount: t.amount, occurredAt: t.occurredAt, note: t.note, categoryId: t.categoryId })}
                accessibilityRole="button"
                accessibilityLabel={`Editar ${t.note || t.category?.name || t.debtName || t.kind}`}
              >
                <Row style={{ justifyContent: 'space-between', paddingVertical: 7, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border }}>
                  <Row style={{ gap: spacing.sm, flex: 1 }}>
                    <CategoryGlyph size="sm" emoji={t.category?.icon} kind={t.kind} color={t.category?.color} />
                    <Text style={{ color: colors.text, flex: 1, ...type.small }} numberOfLines={1}>
                      {t.note || t.category?.name || t.debtName || t.kind}
                      <Text style={{ color: colors.textMuted }}> · {shortDate(t.occurredAt)}</Text>
                    </Text>
                  </Row>
                  <Text style={{ fontWeight: '700', color: meta.color, ...type.small }}>
                    {meta.sign}
                    {formatMoney(t.amount)}
                  </Text>
                </Row>
              </Pressable>
            );
          })}
        </Card>
      ) : recent.length ? (
        recent.map((t) => {
          const meta = KIND_META[t.kind] ?? KIND_META.transferencia;
          return (
            <Card key={t.id} style={{ paddingVertical: spacing.sm }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Row style={{ gap: spacing.sm, flex: 1 }}>
                  <CategoryGlyph emoji={t.category_icon} kind={t.kind} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '600', color: colors.text, ...type.body }} numberOfLines={1}>
                      {t.note || t.kind}
                    </Text>
                    <Text style={{ color: colors.textMuted, ...type.small }}>
                      {formatLocalDate(t.occurred_at)}
                      {t.id.startsWith('local:') ? ' · sin sincronizar' : ''}
                    </Text>
                  </View>
                </Row>
                <Text style={{ fontWeight: '700', color: meta.color, ...type.body }}>
                  {meta.sign}
                  {formatMoney(t.amount)}
                </Text>
              </Row>
            </Card>
          );
        })
      ) : !loading ? (
        <Card>
          <Text style={{ color: colors.textMuted, ...type.body }}>
            Aún no registras movimientos. Usa el botón central o escríbele a Millo por Telegram.
          </Text>
          <Button title="Registrar el primero" onPress={() => navigation.navigate('Main', { screen: 'Add' } as never)} />
        </Card>
      ) : null}

      {/* FIN-018 D2: la gamificación cierra el recorrido. */}
      {gamification.data ? <ProgressLine profile={gamification.data} /> : null}

      {summary.error && d ? (
        <Text style={{ color: colors.textMuted, ...type.small, marginTop: spacing.sm }}>
          No pude actualizar el resumen de deudas ({friendlyError(summary.error)}).
        </Text>
      ) : null}

      <EditTransactionModal movement={editing} onClose={() => setEditing(null)} onChanged={() => void reload()} />
    </ScrollView>
  );
}

/** Copy honesto según la causa (antes "Sin conexión" para cualquier error). */
function friendlyError(message: string): string {
  if (/tardó demasiado|reactiv/i.test(message)) return 'El servidor se está despertando; reintenta en unos segundos.';
  if (/conectar|conexión|network/i.test(message)) return 'Sin conexión. Tus datos locales siguen disponibles.';
  return message;
}

/** Posición dentro del ciclo financiero (FIN-016) para la barra del hero. */
function cycleProgress(startIso: string, endIso: string): { day: number; total: number; ratio: number } | null {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  const now = Date.now();
  const total = Math.max(1, Math.round((end - start) / 86_400_000) + 1);
  const day = Math.min(total, Math.max(1, Math.floor((now - start) / 86_400_000) + 1));
  return { day, total, ratio: day / total };
}

/** FIN-018 D3-B: fecha corta para líneas densas ("28 jul"). */
function shortDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

/** FIN-014 + glosario FIN-017 P4: total con desglose en lenguaje cotidiano. */
function FlowStat({ label, flow, color, onPress }: { label: string; flow?: FlowSection; color: string; onPress: () => void }) {
  return (
    <Pressable style={{ flex: 1 }} onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label} del ciclo: ${formatMoney(flow?.total ?? 0)}. Ver movimientos`}>
      <Card style={{ flex: 1 }}>
        <Text style={{ color: colors.textMuted, ...type.small }}>{label}</Text>
        {flow ? (
          <Text style={{ color, ...type.title, fontVariant: ['tabular-nums'] }}>{formatMoney(flow.total)}</Text>
        ) : (
          // BT-037: mientras carga no se muestra "$ 0" (no es cierto, es que no ha llegado).
          <View style={{ height: 18, width: '55%', borderRadius: radius.sm, backgroundColor: colors.surfaceAlt, marginVertical: 3 }} />
        )}
        {flow && flow.total > 0 ? (
          <Text style={{ color: colors.textFaint, ...type.caption }}>
            {formatMoney(flow.fixed)} fijos del mes · {formatMoney(flow.variable)} del día a día
          </Text>
        ) : null}
      </Card>
    </Pressable>
  );
}

/** FIN-017 §4.5: la racha vive de verse — una sola línea tocable. */
function ProgressLine({ profile }: { profile: GamificationProfile }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <Pressable onPress={() => navigation.navigate('Achievements')} accessibilityRole="button" accessibilityLabel="Ver mi progreso">
      <Card style={{ paddingVertical: spacing.sm }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Row style={{ gap: spacing.xs }}>
            <Ionicons name="flame" size={16} color={colors.accent} />
            <Text style={{ color: colors.text, ...type.small }}>
              {profile.streak.current} semana{profile.streak.current === 1 ? '' : 's'} seguida{profile.streak.current === 1 ? '' : 's'} · Nivel {profile.level.number} ({profile.level.name})
            </Text>
          </Row>
          <Text style={{ color: colors.primary, ...type.small, fontWeight: '700' }}>{profile.xp} XP →</Text>
        </Row>
      </Card>
    </Pressable>
  );
}

/** La cuota comprometida del mes, o lo pagado si fue más (respuestas viejas en caché no traen `amount`). */
function debtAmount(debt: HomeDebt): number {
  return debt.amount ?? Math.max(debt.committed, debt.paid);
}

/**
 * FIN-057 · La fila morada de deudas en "En qué se te va": la cuota del mes aunque su fecha no
 * haya llegado (Fundador: "al tener pago mes a mes, debe reflejarse ahí"); abajo, pagado y falta.
 */
function DebtRow({ debt, onPress }: { debt: HomeDebt; onPress: () => void }) {
  const amount = debtAmount(debt);
  const status =
    debt.remaining <= 0
      ? debt.paid > debt.committed
        ? `Pagaste ${formatMoney(debt.paid)} · las cuotas de este mes están al día`
        : 'Las cuotas de este mes están al día'
      : debt.paid > 0
        ? `Pagado ${formatMoney(debt.paid)} · faltan ${formatMoney(debt.remaining)}${debt.nextDueDate ? ` · vence el ${shortDate(debt.nextDueDate)}` : ''}`
        : `Aún sin pagar este mes${debt.nextDueDate ? ` · vence el ${shortDate(debt.nextDueDate)}` : ''}`;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Cuotas de deudas: ${formatMoney(amount)} este mes, ${debt.percent} por ciento. ${status}. Ver mis deudas`}
      style={{ marginBottom: spacing.sm }}
    >
      <Row style={{ justifyContent: 'space-between', marginBottom: spacing.xs }}>
        <Row style={{ gap: 6 }}>
          <View style={{ width: 24, height: 24, borderRadius: 7, backgroundColor: colors.debtSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="card-outline" size={14} color={colors.debt} />
          </View>
          <Text style={{ color: colors.text, ...type.body, fontWeight: '600' }}>Cuotas de deudas</Text>
        </Row>
        <Text style={{ color: colors.textMuted, ...type.small }}>
          {formatMoney(amount)} · {debt.percent}%
        </Text>
      </Row>
      <ProgressBar value={debt.percent / 100} color={colors.debt} height={6} label={`Cuotas de deudas ${debt.percent}%`} />
      <Text style={{ color: colors.debt, ...type.caption, marginTop: 4 }}>{status}</Text>
    </Pressable>
  );
}

/** FIN-057 · Una fuente de "Cómo te llega la plata" (con carreras y ciclo anterior). */
function SourceRow({ s, onPress }: { s: HomeIncomeSource; onPress: () => void }) {
  const detail: string[] = [];
  if (s.kind === 'fijo') detail.push('fijo');
  else if (s.count > 0) detail.push(`${s.count} ${s.count === 1 ? 'vez' : 'veces'}${s.count > 1 ? ` · unos ${formatMoney(s.amount / s.count)} cada una` : ''}`);
  if (s.previous > 0 && s.kind !== 'fijo') detail.push(`el ciclo pasado ${formatMoney(s.previous)}`);
  if (s.id === 'sin') detail.push('toca para organizarlos');
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${s.name}: ${formatMoney(s.amount)}, ${s.percent} por ciento`}>
      <Row style={{ justifyContent: 'space-between', gap: spacing.sm }}>
        <Row style={{ gap: 6, flex: 1 }}>
          <CategoryGlyph size="sm" emoji={s.icon} kind="ingreso" color={s.kind === 'fijo' ? colors.primary : s.color} />
          <Text style={{ color: colors.text, ...type.body, fontWeight: '600' }} numberOfLines={1}>{s.name}</Text>
        </Row>
        <Text style={{ color: colors.text, ...type.small, fontWeight: '700' }}>
          {formatMoney(s.amount)} · {s.percent}%
        </Text>
      </Row>
      {detail.length ? (
        <Text style={{ color: s.id === 'sin' ? colors.warningDeep : colors.textFaint, ...type.caption, marginLeft: 30 }}>{detail.join(' · ')}</Text>
      ) : null}
    </Pressable>
  );
}

function CategoryBar({ c }: { c: { name: string; icon: string; color: string; amount: number; percent: number } }) {
  return (
    <View style={{ marginBottom: spacing.sm }}>
      <Row style={{ justifyContent: 'space-between', marginBottom: spacing.xs }}>
        <Row style={{ gap: 6 }}>
          <CategoryGlyph size="sm" emoji={c.icon} kind="gasto" color={c.color} />
          <Text style={{ color: colors.text, ...type.body, fontWeight: '600' }}>{c.name}</Text>
        </Row>
        <Text style={{ color: colors.textMuted, ...type.small }}>
          {formatMoney(c.amount)} · {c.percent}%
        </Text>
      </Row>
      <ProgressBar value={c.percent / 100} color={colors.primary} height={6} label={`${c.name} ${c.percent}%`} />
    </View>
  );
}

/** Celebración in-app (FIN-008 §4.5): logros no vistos, uno a la vez, sobrio. */
function CelebrationModal({ profile, onClosed }: { profile: GamificationProfile; onClosed: () => void }) {
  const fresh = profile.achievements.filter((a) => a.unlockedAt && !a.seenAt);
  const [visible, setVisible] = useState(fresh.length > 0);
  if (fresh.length === 0) return null;
  const first = fresh[0];
  const close = async () => {
    setVisible(false);
    await gamificationApi.markSeen().catch(() => undefined);
    onClosed();
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => void close()}>
      <View style={{ flex: 1, backgroundColor: colors.scrim, justifyContent: 'center', padding: spacing.lg }}>
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center' }}>
          <Ionicons name="trophy" size={40} color={colors.accent} />
          <Text style={{ color: colors.text, ...type.title, marginTop: spacing.sm, textAlign: 'center' }}>{first.title}</Text>
          <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 6, ...type.body }}>
            {first.condition} · +{first.xp} XP
          </Text>
          {fresh.length > 1 ? (
            <Text style={{ color: colors.textMuted, ...type.small, marginTop: spacing.xs }}>
              y {fresh.length - 1} logro(s) más en tu perfil
            </Text>
          ) : null}
          <View style={{ alignSelf: 'stretch' }}>
            <Button title="Seguir" onPress={() => void close()} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
