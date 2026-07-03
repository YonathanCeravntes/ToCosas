import React from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { Card, Row } from '../components/ui';
import { colors, spacing } from '../theme/colors';
import { formatMoney } from '../utils/format';
import { useApi } from '../utils/useApi';
import { debtsApi, transactionsApi } from '../api/endpoints';
import { useAuthStore } from '../store/auth.store';

export function DashboardScreen() {
  const user = useAuthStore((s) => s.user);
  const dashboard = useApi(() => transactionsApi.dashboard(), []);
  const summary = useApi(() => debtsApi.summary(), []);

  const loading = dashboard.loading || summary.loading;
  const reload = () => {
    void dashboard.reload();
    void summary.reload();
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

      {summary.error ? (
        <Text style={{ color: colors.danger, marginTop: spacing.md }}>
          No se pudo cargar. Revisa la conexión con el backend.
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
