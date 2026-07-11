import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Button, Card, Row } from '../components/ui';
import { colors, radius, spacing } from '../theme/colors';
import { formatDate, formatMoney } from '../utils/format';
import { useApi } from '../utils/useApi';
import { dashboardApi, debtsApi, gamificationApi } from '../api/endpoints';
import { FlowSection, GamificationProfile } from '../api/types';
import { useAuthStore } from '../store/auth.store';
import { useSync } from '../offline/useSync';
import { LocalTransaction, transactionsRepo } from '../offline/transactionsRepo';

const KIND_META: Record<string, { emoji: string; sign: string; color: string }> = {
  ingreso: { emoji: '💵', sign: '+', color: colors.success },
  gasto: { emoji: '🛒', sign: '-', color: colors.danger },
  pago_deuda: { emoji: '💳', sign: '-', color: colors.primary },
  transferencia: { emoji: '🔁', sign: '', color: colors.textMuted },
};

export function DashboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useAuthStore((s) => s.user);
  const dashboard = useApi(() => dashboardApi.home(), []);
  const summary = useApi(() => debtsApi.summary(), []);
  const gamification = useApi(() => gamificationApi.profile(), []);
  const sync = useSync();
  const [recent, setRecent] = useState<LocalTransaction[]>([]);

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

  const loading = dashboard.loading || summary.loading;
  const reload = () => {
    void dashboard.reload();
    void summary.reload();
    void sync.sync();
    void loadRecent();
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.md }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
    >
      <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: spacing.md }}>
        Hola{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''} 👋
      </Text>

      {/* FIN-017 P2: hero ÚNICO — el dato accionable del ciclo, con interpretación */}
      <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary }}>
        <Text style={{ color: colors.textInverse, opacity: 0.85 }}>
          Te queda este ciclo{dashboard.data ? ` · ${dashboard.data.period.label}` : ''}
        </Text>
        <Text style={{ color: colors.textInverse, fontSize: 36, fontWeight: '800' }}>
          {formatMoney(dashboard.data?.estimatedCashflow ?? 0)}
        </Text>
        {dashboard.data?.interpretation.cashflow ? (
          <Text style={{ color: colors.textInverse, opacity: 0.9, marginTop: 4 }}>
            {LEVEL_EMOJI[dashboard.data.interpretation.cashflow.level]}{' '}
            {dashboard.data.interpretation.cashflow.text}
          </Text>
        ) : null}
      </Card>

      {/* FIN-017 §4.5: gamificación compactada a UNA línea tocable (FIN-008 vive) */}
      {gamification.data ? <ProgressLine profile={gamification.data} /> : null}
      {gamification.data ? <CelebrationModal profile={gamification.data} onClosed={() => void gamification.reload()} /> : null}

      {sync.pending > 0 ? (
        <Pressable onPress={() => void sync.sync()}>
          <View
            style={{
              backgroundColor: '#FFF6E5',
              borderColor: colors.warning,
              borderWidth: 1,
              borderRadius: radius.md,
              padding: spacing.md,
              marginBottom: spacing.md,
            }}
          >
            <Text style={{ color: colors.warning, fontWeight: '600' }}>
              {sync.syncing
                ? '🔄 Sincronizando…'
                : `☁️ ${sync.pending} cambio(s) sin sincronizar · toca para reintentar`}
            </Text>
          </View>
        </Pressable>
      ) : null}

      {/* FIN-017 P2: Deuda total pasa a tarjeta normal (el hero es único) */}
      <Card>
        <Text style={{ color: colors.textMuted }}>💳 Deuda total</Text>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text }}>
          {formatMoney(summary.data?.totalDebt ?? 0)}
        </Text>
        {/* FIN-017: UNA sola cifra de cuota — la misma pagada-del-ciclo que usa la
            interpretación (hallazgo del CTO: no mezclar programado con pagado). */}
        <Text style={{ color: colors.textMuted, marginTop: 4, fontSize: 13 }}>
          {summary.data?.debtsCount ?? 0} deuda(s) ·{' '}
          {formatMoney(dashboard.data?.debtPayments ?? 0)} pagado este ciclo
        </Text>
        {dashboard.data?.interpretation.debt ? (
          <Text style={{ color: colors.textMuted, marginTop: 4, fontSize: 13 }}>
            {LEVEL_EMOJI[dashboard.data.interpretation.debt.level]}{' '}
            {dashboard.data.interpretation.debt.text}
          </Text>
        ) : null}
        {/* FIN-018 D3-B (DEC-018): TODA la deuda vive en un solo bloque — el próximo
            pago (con fecha, absorbe D6) va aquí; la lista completa, en Deudas. */}
        {summary.data?.upcoming?.[0] ? (
          <Text style={{ color: colors.text, marginTop: 6, fontSize: 13, fontWeight: '600' }}>
            📅 Próximo: {summary.data.upcoming[0].name} ·{' '}
            {formatMoney(summary.data.upcoming[0].amount)} · vence{' '}
            {shortDate(summary.data.upcoming[0].dueDate)}
          </Text>
        ) : null}
      </Card>

      {/* Patrimonio + ahorro: par del mismo peso (sin tarjeta oscura).
          D4 (corrección trivial autorizada): stretch para alturas iguales. */}
      <Row style={{ gap: spacing.md, alignItems: 'stretch' }}>
        <Card style={{ flex: 1 }}>
          <Text style={{ color: colors.textMuted }}>🏛️ Patrimonio</Text>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>
            {formatMoney(dashboard.data?.netWorth.netWorth ?? 0)}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 11 }}>lo tuyo, menos deudas</Text>
        </Card>
        <Pressable
          style={{ flex: 1 }}
          onPress={() => navigation.navigate('Simulator', { scenario: 'proyeccion_ahorro' })}
        >
          <Card style={{ flex: 1 }}>
            <Text style={{ color: colors.textMuted }}>🐷 Ahorro total</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.success }}>
              {formatMoney(dashboard.data?.savings.total ?? 0)}
            </Text>
            {dashboard.data?.interpretation.savings ? (
              <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                {dashboard.data.interpretation.savings.text}
              </Text>
            ) : null}
            <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '600', marginTop: 2 }}>
              ¿Cuánto tendrías en unos años? →
            </Text>
          </Card>
        </Pressable>
      </Row>

      {/* Ingresos y gastos del ciclo (glosario FIN-017 P4) */}
      <Row style={{ gap: spacing.md }}>
        <FlowStat label="Ingresos" flow={dashboard.data?.income} color={colors.success} />
        <FlowStat label="Gastos" flow={dashboard.data?.expense} color={colors.danger} />
      </Row>

      {/* FIN-018 D3-B: la sección "Próximos pagos" desaparece — el próximo pago
          vive en la tarjeta de Deuda total; la lista completa, en la pestaña Deudas. */}

      {/* Gastos del día a día por categoría (D5-A: el total fijo ya está en la
          tarjeta Gastos; el título aclara el alcance) */}
      {dashboard.data && dashboard.data.expense.byCategory.length > 0 ? (
        <>
          <Text style={{ fontSize: 16, fontWeight: '700', marginVertical: spacing.sm }}>
            ¿En qué se te va la plata? · día a día
          </Text>
          <Card>
            {dashboard.data.expense.byCategory.map((c) => (
              <CategoryBar key={c.name} c={c} />
            ))}
          </Card>
        </>
      ) : null}

      {/* Ingresos del día a día por categoría (D5-A + D7-B) */}
      {dashboard.data && dashboard.data.income.variable > 0 ? (
        <>
          <Text style={{ fontSize: 16, fontWeight: '700', marginVertical: spacing.sm }}>
            ¿De dónde llega la plata? · día a día
          </Text>
          <Card>
            {dashboard.data.income.byCategory.every((c) => c.name === 'Sin categoría') ? (
              /* FIN-018 D7-B: sin categorías reales la lista no informa nada —
                 se convierte en invitación accionable (sección estable). */
              <Pressable onPress={() => navigation.navigate('Main', { screen: 'Add' } as never)}>
                <Text style={{ color: colors.primary, fontWeight: '600' }}>
                  🏷️ Tus ingresos aún no tienen categoría — toca para organizarlos →
                </Text>
              </Pressable>
            ) : (
              dashboard.data.income.byCategory.map((c) => <CategoryBar key={c.name} c={c} />)
            )}
          </Card>
        </>
      ) : null}

      {/* Movimientos recientes: completos desde el servidor (FIN-014);
          caché local como respaldo offline */}
      <Text style={{ fontSize: 16, fontWeight: '700', marginVertical: spacing.sm }}>
        Movimientos recientes
      </Text>
      {dashboard.data?.recentTransactions.length ? (
        /* FIN-018 pieza 7 (DEC-018 §6.1): vista EJECUTIVA — 4 filas densas en una
           sola tarjeta; el enlace comunica el paso a la vista de DETALLE. */
        <Card>
          {dashboard.data.recentTransactions.slice(0, 4).map((t, i) => {
            const meta = KIND_META[t.kind] ?? KIND_META.transferencia;
            return (
              <Row
                key={t.id}
                style={{
                  justifyContent: 'space-between',
                  paddingVertical: 7,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: colors.border,
                }}
              >
                <Row style={{ gap: 8, flex: 1 }}>
                  <Text style={{ fontSize: 15 }}>{t.category?.icon ?? meta.emoji}</Text>
                  <Text style={{ color: colors.text, flex: 1, fontSize: 13 }} numberOfLines={1}>
                    {t.note || t.category?.name || t.debtName || t.kind}
                    <Text style={{ color: colors.textMuted }}> · {shortDate(t.occurredAt)}</Text>
                  </Text>
                </Row>
                <Text style={{ fontWeight: '700', color: meta.color, fontSize: 13 }}>
                  {meta.sign}
                  {formatMoney(t.amount)}
                </Text>
              </Row>
            );
          })}
          <Pressable
            onPress={() => navigation.navigate('Main', { screen: 'Add' } as never)}
            style={{ marginTop: spacing.sm }}
          >
            <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>
              Ver el detalle completo de tus movimientos →
            </Text>
          </Pressable>
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
                    <Text style={{ fontWeight: '600', color: colors.text }} numberOfLines={1}>
                      {t.note || t.kind}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                      {formatDate(t.occurred_at)}
                      {t.id.startsWith('local:') ? ' · sin sincronizar' : ''}
                    </Text>
                  </View>
                </Row>
                <Text style={{ fontWeight: '700', color: meta.color }}>
                  {meta.sign}
                  {formatMoney(t.amount)}
                </Text>
              </Row>
            </Card>
          );
        })
      ) : (
        <Text style={{ color: colors.textMuted }}>
          Aún no registras movimientos. Usa la pestaña "Registrar" o WhatsApp.
        </Text>
      )}

      {summary.error ? (
        <Text style={{ color: colors.danger, marginTop: spacing.md }}>
          Sin conexión con el backend. Tus datos locales siguen disponibles.
        </Text>
      ) : null}
    </ScrollView>
  );
}

const LEVEL_EMOJI: Record<string, string> = { verde: '🟢', amarillo: '🟡', rojo: '🔴' };

/** FIN-018 D3-B: fecha corta para la línea de próximo pago ("28 jul"). */
function shortDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

/** FIN-014 + glosario FIN-017 P4: total con desglose en lenguaje cotidiano. */
function FlowStat({ label, flow, color }: { label: string; flow?: FlowSection; color: string }) {
  return (
    <Card style={{ flex: 1 }}>
      <Text style={{ color: colors.textMuted }}>{label}</Text>
      <Text style={{ fontSize: 18, fontWeight: '800', color }}>{formatMoney(flow?.total ?? 0)}</Text>
      {flow && flow.total > 0 ? (
        <Text style={{ color: colors.textMuted, fontSize: 11 }}>
          {formatMoney(flow.fixed)} fijos del mes · {formatMoney(flow.variable)} del día a día
        </Text>
      ) : null}
    </Card>
  );
}

/** FIN-017 §4.5: la racha vive de verse — una sola línea tocable, sin barra. */
function ProgressLine({ profile }: { profile: GamificationProfile }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <Pressable onPress={() => navigation.navigate('Achievements')}>
      <Card style={{ paddingVertical: spacing.sm }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={{ color: colors.text, fontSize: 13 }}>
            🔥 {profile.streak.current} sem · Nivel {profile.level.number} ({profile.level.name})
          </Text>
          <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
            {profile.xp} XP →
          </Text>
        </Row>
      </Card>
    </Pressable>
  );
}

function CategoryBar({ c }: { c: { name: string; icon: string; color: string; amount: number; percent: number } }) {
  return (
    <View style={{ marginBottom: spacing.sm }}>
      <Row style={{ justifyContent: 'space-between', marginBottom: 4 }}>
        <Row style={{ gap: 6 }}>
          <Text style={{ fontSize: 16 }}>{c.icon}</Text>
          <Text style={{ color: colors.text, fontWeight: '600' }}>{c.name}</Text>
        </Row>
        <Text style={{ color: colors.textMuted }}>
          {formatMoney(c.amount)} · {c.percent}%
        </Text>
      </Row>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' }}>
        <View
          style={{
            height: 8,
            width: `${Math.max(c.percent, 3)}%`,
            backgroundColor: c.color,
            borderRadius: 4,
          }}
        />
      </View>
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
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: '#00000088', justifyContent: 'center', padding: spacing.lg }}>
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center' }}>
          <Text style={{ fontSize: 40 }}>🏆</Text>
          <Text style={{ fontWeight: '800', fontSize: 18, color: colors.text, marginTop: 8, textAlign: 'center' }}>
            {first.title}
          </Text>
          <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 20 }}>
            {first.condition} · +{first.xp} XP
          </Text>
          {fresh.length > 1 ? (
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
              y {fresh.length - 1} logro(s) más en tu perfil
            </Text>
          ) : null}
          <Button title="Seguir" onPress={() => void close()} />
        </View>
      </View>
    </Modal>
  );
}
