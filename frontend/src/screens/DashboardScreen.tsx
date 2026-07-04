import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Card, Row } from '../components/ui';
import { colors, radius, spacing } from '../theme/colors';
import { formatDate, formatMoney } from '../utils/format';
import { useApi } from '../utils/useApi';
import { debtsApi, transactionsApi } from '../api/endpoints';
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
  const user = useAuthStore((s) => s.user);
  const dashboard = useApi(() => transactionsApi.dashboard(), []);
  const summary = useApi(() => debtsApi.summary(), []);
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

      {/* Flujo del mes */}
      <Row style={{ gap: spacing.md }}>
        <Stat label="Ingresos" value={dashboard.data?.income ?? 0} color={colors.success} />
        <Stat label="Gastos" value={dashboard.data?.expense ?? 0} color={colors.danger} />
      </Row>
      <Card>
        <Text style={{ color: colors.textMuted }}>Flujo estimado del mes</Text>
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

      {/* Gastos por categoría (barras visuales) */}
      {dashboard.data?.byCategory?.length ? (
        <>
          <Text style={{ fontSize: 16, fontWeight: '700', marginVertical: spacing.sm }}>
            ¿En qué se te va la plata?
          </Text>
          <Card>
            {dashboard.data.byCategory.map((c) => (
              <View key={c.name} style={{ marginBottom: spacing.sm }}>
                <Row style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                  <Row style={{ gap: 6 }}>
                    <Text style={{ fontSize: 16 }}>{c.icon}</Text>
                    <Text style={{ color: colors.text, fontWeight: '600' }}>{c.name}</Text>
                  </Row>
                  <Text style={{ color: colors.textMuted }}>
                    {formatMoney(c.amount)} · {c.percent}%
                  </Text>
                </Row>
                {/* Barra de progreso proporcional al gasto */}
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
            ))}
          </Card>
        </>
      ) : null}

      {/* Movimientos recientes (desde la caché local: visible offline) */}
      <Text style={{ fontSize: 16, fontWeight: '700', marginVertical: spacing.sm }}>
        Movimientos recientes
      </Text>
      {recent.length ? (
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

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card style={{ flex: 1 }}>
      <Text style={{ color: colors.textMuted }}>{label}</Text>
      <Text style={{ fontSize: 18, fontWeight: '800', color }}>{formatMoney(value)}</Text>
    </Card>
  );
}
