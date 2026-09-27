import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { Button, Card, ErrorState, HeroCard, ProgressBar, Row, SectionHeader, Skeleton } from '../components/ui';
import { colors, radius, spacing, type } from '../theme/colors';
import { formatLocalDate, formatMoney } from '../utils/format';
import { useApi } from '../utils/useApi';
import { dashboardApi, debtsApi, gamificationApi } from '../api/endpoints';
import { FlowSection, GamificationProfile } from '../api/types';
import { useAuthStore } from '../store/auth.store';
import { useSync } from '../offline/useSync';
import { LocalTransaction, transactionsRepo } from '../offline/transactionsRepo';
import { EditTransactionModal, EditableMovement } from './transactions/EditTransactionModal';

const KIND_META: Record<string, { emoji: string; sign: string; color: string }> = {
  ingreso: { emoji: '💵', sign: '+', color: colors.success },
  gasto: { emoji: '🛒', sign: '-', color: colors.danger },
  pago_deuda: { emoji: '💳', sign: '-', color: colors.primary },
  transferencia: { emoji: '🔁', sign: '', color: colors.textMuted },
};

const LEVEL_EMOJI: Record<string, string> = { verde: '🟢', amarillo: '🟡', rojo: '🔴' };

export function DashboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useAuthStore((s) => s.user);
  const dashboard = useApi(() => dashboardApi.home(), []);
  const summary = useApi(() => debtsApi.summary(), []);
  const gamification = useApi(() => gamificationApi.profile(), []);
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

  const loading = dashboard.loading || summary.loading;
  const reload = () => {
    void dashboard.reload();
    void summary.reload();
    void gamification.reload();
    void sync.sync();
    void loadRecent();
  };

  const d = dashboard.data;
  const cycle = d ? cycleProgress(d.period.start, d.period.end) : null;
  const firstName = user?.fullName ? user.fullName.split(' ')[0] : null;

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.md }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.primary} />}
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
        <ErrorState message={friendlyError(dashboard.error)} onRetry={reload} />
      ) : !d && loading ? (
        <Skeleton hero lines={3} />
      ) : d ? (
        <Pressable onPress={() => navigation.navigate('Budget')} accessibilityRole="button" accessibilityLabel={`Te queda para gastar ${formatMoney(d.teQueda.amount)}. Abrir presupuesto`}>
          <HeroCard>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ color: colors.onPrimaryMuted, ...type.body }}>
                Te queda para gastar · hasta el {shortDate(d.teQueda.until)}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.onPrimaryMuted} />
            </Row>
            <Text style={{ color: colors.textInverse, ...type.hero }}>{formatMoney(d.teQueda.amount)}</Text>
            {d.teQueda.perDay !== null && d.teQueda.amount > 0 ? (
              <Text style={{ color: colors.onPrimaryMuted, ...type.body }}>
                ≈ {formatMoney(d.teQueda.perDay)} por día · {d.teQueda.daysLeft} día{d.teQueda.daysLeft === 1 ? '' : 's'}
              </Text>
            ) : null}
            {d.interpretation.cashflow ? (
              <Text style={{ color: colors.onPrimaryMuted, ...type.body, marginTop: spacing.xs }}>
                {LEVEL_EMOJI[d.interpretation.cashflow.level]} {d.interpretation.cashflow.text}
              </Text>
            ) : null}
            {cycle ? (
              <View style={{ marginTop: spacing.sm }}>
                <ProgressBar value={cycle.ratio} color={colors.textInverse} track={colors.onPrimaryTrack} height={5} label="Avance del ciclo" />
                <Text style={{ color: colors.onPrimaryFaint, ...type.caption, marginTop: spacing.xxs }}>
                  Día {cycle.day} de {cycle.total} del ciclo · {d.period.label}
                </Text>
              </View>
            ) : null}
          </HeroCard>
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

      {/* FIN-017 P2: Deuda total como tarjeta normal (el hero es único). */}
      <Pressable
        onPress={() =>
          (navigation as unknown as { navigate: (name: string, params?: unknown) => void }).navigate('Debts', { screen: 'DebtsList' })
        }
        accessibilityRole="button"
        accessibilityLabel="Ver mis deudas"
      >
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ color: colors.textMuted, ...type.body }}>Deuda total</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
          </Row>
          <Text style={{ color: colors.text, ...type.display }}>{formatMoney(summary.data?.totalDebt ?? 0)}</Text>
          <Text style={{ color: colors.textMuted, ...type.small, marginTop: spacing.xxs }}>
            {summary.data?.debtsCount ?? 0} deuda(s) · {formatMoney(d?.debtPayments ?? 0)} pagado desde el {d ? shortDate(d.period.start) : '—'}
          </Text>
          {d?.interpretation.debt ? (
            <Text style={{ color: colors.textMuted, ...type.small, marginTop: spacing.xxs }}>
              {LEVEL_EMOJI[d.interpretation.debt.level]} {d.interpretation.debt.text}
            </Text>
          ) : null}
          {summary.data?.upcoming?.[0] ? (
            <Row style={{ gap: spacing.xs, marginTop: spacing.sm }}>
              <Ionicons name="calendar-outline" size={14} color={colors.text} />
              <Text style={{ color: colors.text, ...type.small, fontWeight: '600', flex: 1 }}>
                Próximo: {summary.data.upcoming[0].name} · {formatMoney(summary.data.upcoming[0].amount)} · vence {shortDate(summary.data.upcoming[0].dueDate)}
              </Text>
            </Row>
          ) : null}
          {/* FIN-018 4ª iteración — puente narrativo: margen verde + deuda viva → abono. */}
          {d?.interpretation.cashflow?.level === 'verde' && summary.data?.upcoming?.[0] ? (
            <Pressable
              onPress={() =>
                (navigation as unknown as { navigate: (name: string, params: unknown) => void }).navigate('Debts', {
                  screen: 'DebtDetail',
                  params: { debtId: summary.data!.upcoming[0].debtId, name: summary.data!.upcoming[0].name },
                })
              }
              accessibilityRole="link"
              style={{ marginTop: spacing.sm }}
            >
              <Text style={{ color: colors.primary, ...type.small, fontWeight: '700' }}>
                💡 Tienes margen: adelanta un pago y ahorra intereses →
              </Text>
            </Pressable>
          ) : null}
        </Card>
      </Pressable>

      {/* Patrimonio + ahorro: par del mismo peso. */}
      <Row style={{ gap: spacing.md, alignItems: 'stretch' }}>
        <Pressable style={{ flex: 1 }} onPress={() => navigation.navigate('Accounts')} accessibilityRole="button" accessibilityLabel="Cuentas y patrimonio">
          <Card style={{ flex: 1 }}>
            <Text style={{ color: colors.textMuted, ...type.small }}>Patrimonio</Text>
            <Text style={{ color: colors.text, ...type.title, fontVariant: ['tabular-nums'] }}>{formatMoney(d?.netWorth.netWorth ?? 0)}</Text>
            <Text style={{ color: colors.textFaint, ...type.caption }}>lo tuyo, menos deudas</Text>
          </Card>
        </Pressable>
        <Pressable style={{ flex: 1 }} onPress={() => navigation.navigate('Simulator', { scenario: 'proyeccion_ahorro' })} accessibilityRole="button" accessibilityLabel="Proyectar mi ahorro">
          <Card style={{ flex: 1 }}>
            <Text style={{ color: colors.textMuted, ...type.small }}>Ahorro total</Text>
            <Text style={{ color: colors.success, ...type.title, fontVariant: ['tabular-nums'] }}>{formatMoney(d?.savings.total ?? 0)}</Text>
            {d?.interpretation.savings ? (
              <Text style={{ color: colors.textFaint, ...type.caption }}>{d.interpretation.savings.text}</Text>
            ) : null}
            <Text style={{ color: colors.primary, ...type.caption, fontWeight: '700', marginTop: spacing.xxs }}>¿Cuánto tendrías en unos años? →</Text>
          </Card>
        </Pressable>
      </Row>

      {/* Ingresos y gastos del ciclo (glosario FIN-017 P4) */}
      <Row style={{ gap: spacing.md }}>
        <FlowStat label="Ingresos" flow={d?.income} color={colors.success} onPress={() => navigation.navigate('Transactions', { kind: 'ingreso' })} />
        <FlowStat label="Gastos" flow={d?.expense} color={colors.danger} onPress={() => navigation.navigate('Transactions', { kind: 'gasto' })} />
      </Row>

      {d && d.expense.byCategory.length > 0 ? (
        <>
          <SectionHeader title="¿En qué se te va la plata? · día a día" />
          <Card>
            {d.expense.byCategory.map((c) => (
              <CategoryBar key={c.name} c={c} />
            ))}
          </Card>
        </>
      ) : null}

      {d && d.income.variable > 0 ? (
        <>
          <SectionHeader title="¿De dónde llega la plata? · día a día" />
          <Card>
            {d.income.byCategory.every((c) => c.name === 'Sin categoría') ? (
              <Pressable onPress={() => navigation.navigate('Main', { screen: 'Add' } as never)} accessibilityRole="link">
                <Text style={{ color: colors.primary, ...type.body, fontWeight: '600' }}>
                  🏷️ Tus ingresos aún no tienen categoría — toca para organizarlos →
                </Text>
              </Pressable>
            ) : (
              d.income.byCategory.map((c) => <CategoryBar key={c.name} c={c} />)
            )}
          </Card>
        </>
      ) : null}

      {/* Movimientos recientes (FIN-014/018/028) — el detalle completo vive en el
          historial (FIN-038), no en Registrar. */}
      <SectionHeader title="Movimientos recientes" action="Ver todos" onAction={() => navigation.navigate('Transactions')} />
      {d?.recentTransactions.length ? (
        <Card>
          {d.recentTransactions.slice(0, 4).map((t, i) => {
            const meta = KIND_META[t.kind] ?? KIND_META.transferencia;
            return (
              <Pressable
                key={t.id}
                onPress={() => setEditing({ id: t.id, kind: t.kind, amount: t.amount, occurredAt: t.occurredAt, note: t.note })}
                accessibilityRole="button"
                accessibilityLabel={`Editar ${t.note || t.category?.name || t.debtName || t.kind}`}
              >
                <Row style={{ justifyContent: 'space-between', paddingVertical: 7, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border }}>
                  <Row style={{ gap: spacing.sm, flex: 1 }}>
                    <Text style={{ fontSize: 15 }}>{t.category?.icon ?? meta.emoji}</Text>
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
                  <Text style={{ fontSize: 18 }}>{t.category_icon ?? meta.emoji}</Text>
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
            Aún no registras movimientos. Usa el botón central o WhatsApp/Telegram.
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

      <EditTransactionModal movement={editing} onClose={() => setEditing(null)} onChanged={reload} />
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
        <Text style={{ color, ...type.title, fontVariant: ['tabular-nums'] }}>{formatMoney(flow?.total ?? 0)}</Text>
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
              {profile.streak.current} sem · Nivel {profile.level.number} ({profile.level.name})
            </Text>
          </Row>
          <Text style={{ color: colors.primary, ...type.small, fontWeight: '700' }}>{profile.xp} XP →</Text>
        </Row>
      </Card>
    </Pressable>
  );
}

function CategoryBar({ c }: { c: { name: string; icon: string; color: string; amount: number; percent: number } }) {
  return (
    <View style={{ marginBottom: spacing.sm }}>
      <Row style={{ justifyContent: 'space-between', marginBottom: spacing.xs }}>
        <Row style={{ gap: 6 }}>
          <Text style={{ fontSize: 16 }}>{c.icon}</Text>
          <Text style={{ color: colors.text, ...type.body, fontWeight: '600' }}>{c.name}</Text>
        </Row>
        <Text style={{ color: colors.textMuted, ...type.small }}>
          {formatMoney(c.amount)} · {c.percent}%
        </Text>
      </Row>
      <ProgressBar value={c.percent / 100} color={c.color} label={`${c.name} ${c.percent}%`} />
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
