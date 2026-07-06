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

      {/* Progreso (FIN-008): racha + nivel + reto del mes */}
      {gamification.data ? <ProgressBlock profile={gamification.data} /> : null}
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

      {/* FIN-014: patrimonio + ahorro total */}
      <Row style={{ gap: spacing.md }}>
        <Card style={{ flex: 1, backgroundColor: colors.primaryDark, borderColor: colors.primaryDark }}>
          <Text style={{ color: colors.textInverse, opacity: 0.8 }}>🏛️ Patrimonio</Text>
          <Text style={{ color: colors.textInverse, fontSize: 20, fontWeight: '800' }}>
            {formatMoney(dashboard.data?.netWorth.netWorth ?? 0)}
          </Text>
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
            <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '600' }}>
              ¿Cuánto tendrías en unos años? →
            </Text>
          </Card>
        </Pressable>
      </Row>

      {/* Deuda total — tarjeta destacada */}
      <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary }}>
        <Text style={{ color: colors.textInverse, opacity: 0.8 }}>Deuda total</Text>
        <Text style={{ color: colors.textInverse, fontSize: 32, fontWeight: '800' }}>
          {formatMoney(summary.data?.totalDebt ?? 0)}
        </Text>
        <Text style={{ color: colors.textInverse, opacity: 0.8, marginTop: 4 }}>
          {summary.data?.debtsCount ?? 0} deuda(s) · cuotas del mes{' '}
          {formatMoney(summary.data?.monthlyPaymentsTotal ?? 0)}
        </Text>
      </Card>

      {/* Flujo del ciclo (FIN-016): fijo + variable diferenciados */}
      <Row style={{ gap: spacing.md }}>
        <FlowStat label="Ingresos" flow={dashboard.data?.income} color={colors.success} />
        <FlowStat label="Gastos" flow={dashboard.data?.expense} color={colors.danger} />
      </Row>
      <Card>
        <Text style={{ color: colors.textMuted }}>
          Flujo estimado{dashboard.data ? ` · ${dashboard.data.period.label}` : ' del mes'}
        </Text>
        <Text
          style={{
            fontSize: 24,
            fontWeight: '800',
            color: (dashboard.data?.estimatedCashflow ?? 0) >= 0 ? colors.success : colors.danger,
          }}
        >
          {formatMoney(dashboard.data?.estimatedCashflow ?? 0)}
        </Text>
      </Card>

      {/* Próximos pagos */}
      <Text style={{ fontSize: 16, fontWeight: '700', marginVertical: spacing.sm }}>
        Próximos pagos
      </Text>
      {summary.data?.upcoming?.length ? (
        summary.data.upcoming.map((u) => (
          <Card key={u.debtId}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ fontWeight: '600', color: colors.text }}>{u.name}</Text>
              <Text style={{ fontWeight: '700', color: colors.primary }}>
                {formatMoney(u.amount)}
              </Text>
            </Row>
          </Card>
        ))
      ) : (
        <Text style={{ color: colors.textMuted }}>Sin pagos próximos registrados.</Text>
      )}

      {/* Gastos: fijo + variable por categoría */}
      {dashboard.data && (dashboard.data.expense.total > 0 || dashboard.data.expense.byCategory.length > 0) ? (
        <>
          <Text style={{ fontSize: 16, fontWeight: '700', marginVertical: spacing.sm }}>
            ¿En qué se te va la plata?
          </Text>
          <Card>
            {dashboard.data.expense.fixed > 0 ? (
              <Row style={{ justifyContent: 'space-between', marginBottom: spacing.sm }}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>📌 Gastos fijos</Text>
                <Text style={{ color: colors.textMuted }}>{formatMoney(dashboard.data.expense.fixed)}</Text>
              </Row>
            ) : null}
            {dashboard.data.expense.byCategory.map((c) => (
              <CategoryBar key={c.name} c={c} />
            ))}
          </Card>
        </>
      ) : null}

      {/* Ingresos: fijo + variable por categoría (FIN-014) */}
      {dashboard.data && dashboard.data.income.total > 0 ? (
        <>
          <Text style={{ fontSize: 16, fontWeight: '700', marginVertical: spacing.sm }}>
            ¿De dónde llega la plata?
          </Text>
          <Card>
            {dashboard.data.income.fixed > 0 ? (
              <Row style={{ justifyContent: 'space-between', marginBottom: spacing.sm }}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>📌 Ingresos fijos</Text>
                <Text style={{ color: colors.textMuted }}>{formatMoney(dashboard.data.income.fixed)}</Text>
              </Row>
            ) : null}
            {dashboard.data.income.byCategory.map((c) => (
              <CategoryBar key={c.name} c={c} />
            ))}
          </Card>
        </>
      ) : null}

      {/* Movimientos recientes: completos desde el servidor (FIN-014);
          caché local como respaldo offline */}
      <Text style={{ fontSize: 16, fontWeight: '700', marginVertical: spacing.sm }}>
        Movimientos recientes
      </Text>
      {dashboard.data?.recentTransactions.length ? (
        dashboard.data.recentTransactions.map((t) => {
          const meta = KIND_META[t.kind] ?? KIND_META.transferencia;
          return (
            <Card key={t.id} style={{ paddingVertical: spacing.sm }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Row style={{ gap: spacing.sm, flex: 1 }}>
                  <Text style={{ fontSize: 18 }}>{t.category?.icon ?? meta.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '600', color: colors.text }} numberOfLines={1}>
                      {t.note || t.category?.name || t.debtName || t.kind}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                      {formatDate(t.occurredAt)}
                      {t.debtName ? ` · ${t.debtName}` : ''}
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

/** FIN-014: total con desglose fijo/variable. */
function FlowStat({ label, flow, color }: { label: string; flow?: FlowSection; color: string }) {
  return (
    <Card style={{ flex: 1 }}>
      <Text style={{ color: colors.textMuted }}>{label}</Text>
      <Text style={{ fontSize: 18, fontWeight: '800', color }}>{formatMoney(flow?.total ?? 0)}</Text>
      {flow && flow.total > 0 ? (
        <Text style={{ color: colors.textMuted, fontSize: 11 }}>
          {formatMoney(flow.fixed)} fijo · {formatMoney(flow.variable)} variable
        </Text>
      ) : null}
    </Card>
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

/** Bloque de progreso (FIN-008 §8): racha + nivel + reto, tono sobrio. */
function ProgressBlock({ profile }: { profile: GamificationProfile }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const pct =
    profile.level.nextAt && profile.level.nextAt > 0
      ? Math.min(100, Math.round((profile.xp / profile.level.nextAt) * 100))
      : 100;
  const ch = profile.challenge;
  return (
    <Pressable onPress={() => navigation.navigate('Achievements')}>
      <Card style={{ paddingVertical: spacing.sm }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={{ fontWeight: '700', color: colors.text }}>
            🔥 {profile.streak.current} sem · Nivel {profile.level.number} ({profile.level.name})
          </Text>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>{profile.xp} XP →</Text>
        </Row>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.border, marginTop: 8, overflow: 'hidden' }}>
          <View style={{ width: `${pct}%`, height: 6, backgroundColor: colors.primary }} />
        </View>
        {ch && ch.status === 'active' ? (
          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 8 }}>
            🎯 Reto del mes: {ch.title}
            {ch.progress && 'covered' in ch.progress
              ? ` (${ch.progress.covered}/${ch.progress.required} semanas)`
              : ''}
          </Text>
        ) : ch?.status === 'completed' ? (
          <Text style={{ color: colors.success, fontSize: 12, marginTop: 8 }}>
            ✅ Reto del mes completado: {ch.title}
          </Text>
        ) : null}
      </Card>
    </Pressable>
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
