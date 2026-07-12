import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Button, Card, Field, Row } from '../components/ui';
import { colors, radius, spacing } from '../theme/colors';
import { formatMoney } from '../utils/format';
import { FixedKind, MonthlyBudget, Recommendation, TeQueda, toNumber } from '../api/types';
import { budgetApi, recommendationsApi } from '../api/endpoints';
import { useApi } from '../utils/useApi';

/**
 * FIN-020 · Experiencia de Presupuesto (ARQ-0020 v1.1, DEC-0020).
 *
 * Zona de decisión primero (número → por día → protegido → destino), casa de
 * los compromisos después (P6). El "Te queda" viene del servicio ÚNICO del
 * backend (§32) — esta pantalla NO calcula nada.
 */
const KINDS: Array<{ key: FixedKind; label: string; emoji: string }> = [
  { key: 'gasto', label: 'Gasto fijo', emoji: '🏠' },
  { key: 'ingreso', label: 'Ingreso fijo', emoji: '💵' },
];

export function BudgetScreen() {
  const { data, loading, reload } = useApi(() => budgetApi.monthly(), []);
  const recs = useApi(() => recommendationsApi.list(), []);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const reloadRecs = recs.reload;

  useFocusEffect(
    React.useCallback(() => {
      void reload();
      void reloadRecs();
    }, [reload, reloadRecs]),
  );

  const onRemove = async (id: string) => {
    await budgetApi.removeFixed(id);
    await reload();
  };

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md }}>
      {/* P1+P3 — el número oficial y su reparto por día */}
      <TeQuedaHero teQueda={data?.teQueda ?? null} loading={loading} />

      {/* P4 — lo protegido, visible: la resta deja de ser una caja negra */}
      {data?.teQueda ? <ProtectedTimeline teQueda={data.teQueda} /> : null}

      {/* P5 — qué hacer con lo libre: decidir, no solo calcular */}
      {data?.teQueda ? <FreeMoneyBridge teQueda={data.teQueda} recs={recs.data ?? []} /> : null}

      {/* P6 — la casa de los compromisos (materia prima), debajo de la decisión */}
      <NewFixedForm onSaved={reload} />

      {data ? (
        <>
          <FixedList
            title="💵 Ingresos fijos"
            items={data.incomes}
            color={colors.success}
            onRemove={onRemove}
          />
          <FixedList
            title="🏠 Gastos fijos"
            items={data.expenses}
            color={colors.danger}
            onRemove={onRemove}
          />
          {data.debts.length > 0 ? (
            <Card>
              <Text style={{ fontWeight: '700', marginBottom: spacing.sm }}>
                💳 Cuotas de deuda (inflexibles)
              </Text>
              {data.debts.map((d) => (
                <Row key={d.debtId} style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ color: colors.text }}>{d.name}</Text>
                  <Text style={{ fontWeight: '700', color: colors.warning }}>
                    {formatMoney(d.amount)}
                  </Text>
                </Row>
              ))}
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
                Se calculan automáticamente desde tus deudas.
              </Text>
            </Card>
          ) : null}
        </>
      ) : null}

      <Button
        title="🏦 Cuentas y patrimonio"
        variant="secondary"
        onPress={() => navigation.navigate('Accounts')}
      />
    </ScrollView>
  );
}

/** P1 (Alt A) + P3 (Alt A): el valor del servicio único y su "por día". */
function TeQuedaHero({ teQueda, loading }: { teQueda: TeQueda | null; loading: boolean }) {
  if (!teQueda) {
    return (
      <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary }}>
        <Text style={{ color: colors.textInverse, opacity: 0.9 }}>
          {loading ? 'Calculando tu presupuesto…' : 'Sin datos'}
        </Text>
      </Card>
    );
  }
  const negative = teQueda.amount < 0;
  return (
    <Card style={{ backgroundColor: colors.primary, borderColor: colors.primary }}>
      <Text style={{ color: colors.textInverse, opacity: 0.85 }}>
        Te queda para gastar · hasta el {shortDate(teQueda.until)}
      </Text>
      <Text
        style={{
          color: negative ? colors.accent : colors.textInverse,
          fontSize: 34,
          fontWeight: '800',
        }}
      >
        {formatMoney(teQueda.amount)}
      </Text>
      {teQueda.perDay !== null ? (
        <Text style={{ color: colors.textInverse, opacity: 0.85, marginTop: 2 }}>
          ≈ {formatMoney(teQueda.perDay)} por día ({teQueda.daysLeft} día
          {teQueda.daysLeft === 1 ? '' : 's'})
        </Text>
      ) : (
        // Margen negativo: honesto y sin juicio (§29.2) — la explicación está
        // justo debajo, en la lista de lo protegido.
        <Text style={{ color: colors.textInverse, opacity: 0.85, marginTop: 2 }}>
          Ya está apartado lo que viene — abajo ves qué es
        </Text>
      )}
    </Card>
  );
}

/** P4 (Alt A): línea de tiempo de lo pendiente del ciclo, fijos + cuotas. */
function ProtectedTimeline({ teQueda }: { teQueda: TeQueda }) {
  if (teQueda.pendingCommitments.length === 0) return null;
  return (
    <Card>
      <Text style={{ fontWeight: '700', fontSize: 15, color: colors.text }}>
        🛡️ Protegido para lo que viene: {formatMoney(teQueda.protectedTotal)}
      </Text>
      <View style={{ marginTop: spacing.sm, gap: 8 }}>
        {teQueda.pendingCommitments.map((c, i) => (
          <Row key={`${c.name}-${i}`} style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text }} numberOfLines={1}>
                {c.kind === 'cuota' ? '💳' : '🏠'} {c.name}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                {/* §4.1-bis: etiqueta NEUTRA — no afirmamos pago, solo la fecha. */}
                {c.date === null
                  ? 'sin fecha fija'
                  : c.datePassed
                    ? `ya pasó su fecha (${shortDate(c.date)})`
                    : shortDate(c.date)}
              </Text>
            </View>
            <Text style={{ fontWeight: '700', color: colors.text }}>{formatMoney(c.amount)}</Text>
          </Row>
        ))}
      </View>
      <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: spacing.sm }}>
        Esto ya está descontado del número de arriba.
      </Text>
    </Card>
  );
}

/** P5 (Alt A): el destino del dinero libre sale del motor real (FIN-007);
 *  con margen negativo, aviso honesto + palanca de recorte. */
function FreeMoneyBridge({ teQueda, recs }: { teQueda: TeQueda; recs: Recommendation[] }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const SIM_BY_KIND: Record<string, string> = {
    estrategia: 'estrategia_deudas',
    recorte_categoria: 'reducir_gastos',
    fondo_emergencia: 'proyeccion_ahorro',
  };
  const goSimulator = (scenario?: string) =>
    navigation.navigate('Simulator', scenario ? { scenario } : undefined);

  if (teQueda.amount < 0) {
    return (
      <Card style={{ borderColor: colors.warning, borderWidth: 2 }}>
        <Text style={{ fontWeight: '700', fontSize: 15, color: colors.text }}>
          ⚠️ Este mes no alcanza para todo
        </Text>
        <Text style={{ color: colors.textMuted, marginTop: 4, fontSize: 13, lineHeight: 19 }}>
          Lo comprometido supera lo que ha entrado. Mira qué gasto puedes mover — pequeños
          recortes cambian el cierre del mes.
        </Text>
        <Pressable onPress={() => goSimulator('reducir_gastos')} style={{ marginTop: spacing.sm }}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>
            🧪 Simular un recorte →
          </Text>
        </Pressable>
      </Card>
    );
  }

  if (teQueda.amount === 0) return null;

  const top = recs.find((r) => r.status === 'new' || r.status === 'seen') ?? recs[0] ?? null;
  return (
    <Card style={{ borderColor: colors.primary, borderWidth: 2 }}>
      <Text style={{ fontWeight: '700', fontSize: 15, color: colors.text }}>
        ⭐ Con lo libre: tu mejor destino
      </Text>
      {top ? (
        <>
          <Text style={{ color: colors.text, marginTop: 6, fontWeight: '600' }}>{top.title}</Text>
          <Text style={{ color: colors.textMuted, marginTop: 4, fontSize: 13, lineHeight: 19 }}>
            {top.body}
          </Text>
          <Pressable
            onPress={() => goSimulator(SIM_BY_KIND[top.kind])}
            style={{ marginTop: spacing.sm }}
          >
            <Text style={{ color: colors.primary, fontWeight: '700' }}>🧪 Simularlo →</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={{ color: colors.textMuted, marginTop: 4, fontSize: 13, lineHeight: 19 }}>
            Tienes {formatMoney(teQueda.amount)} sin destino. Prueba en el simulador qué pasa si
            los apartas.
          </Text>
          <Pressable onPress={() => goSimulator()} style={{ marginTop: spacing.sm }}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>🧪 Ir al simulador →</Text>
          </Pressable>
        </>
      )}
    </Card>
  );
}

/** P6: alta de compromiso con tap honesto — colapsado anuncia su contenido. */
function NewFixedForm({ onSaved }: { onSaved: () => Promise<unknown> }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<FixedKind>('gasto');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('');
  const [saving, setSaving] = useState(false);

  const onAdd = async () => {
    const value = parseFloat(amount.replace(/[^\d.]/g, '')) || 0;
    if (!name.trim() || !value) return;
    setSaving(true);
    try {
      await budgetApi.createFixed({
        kind,
        name: name.trim(),
        amount: value,
        dayOfMonth: day ? Math.min(31, Math.max(1, parseInt(day, 10))) : undefined,
      });
      setName('');
      setAmount('');
      setDay('');
      setOpen(false);
      await onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <Pressable onPress={() => setOpen((v) => !v)}>
        <Text style={{ fontWeight: '700', fontSize: 16 }}>
          ➕ Nuevo compromiso fijo {open ? '' : '(gasto o ingreso) →'}
        </Text>
      </Pressable>
      {open ? (
        <View style={{ marginTop: spacing.sm }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
            {KINDS.map((k) => (
              <Pressable
                key={k.key}
                onPress={() => setKind(k.key)}
                style={{
                  flex: 1,
                  padding: spacing.sm,
                  borderRadius: radius.md,
                  alignItems: 'center',
                  backgroundColor: kind === k.key ? colors.primary : colors.surface,
                  borderWidth: 1,
                  borderColor: kind === k.key ? colors.primary : colors.border,
                }}
              >
                <Text style={{ fontSize: 18 }}>{k.emoji}</Text>
                <Text
                  style={{
                    marginTop: 2,
                    fontSize: 12,
                    fontWeight: '600',
                    color: kind === k.key ? colors.textInverse : colors.text,
                  }}
                >
                  {k.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Field label="Nombre" value={name} onChangeText={setName} placeholder="Arriendo, salario…" />
          <Field label="Monto mensual" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="1200000" />
          <Field label="Día del mes (opcional)" value={day} onChangeText={setDay} keyboardType="numeric" placeholder="5" />
          <Button title="Agregar" onPress={onAdd} loading={saving} />
        </View>
      ) : null}
    </Card>
  );
}

function FixedList({
  title,
  items,
  color,
  onRemove,
}: {
  title: string;
  items: Array<{ id: string; name: string; amount: number; dayOfMonth: number | null }>;
  color: string;
  onRemove: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <Card>
      <Text style={{ fontWeight: '700', marginBottom: spacing.sm }}>{title}</Text>
      {items.map((i) => (
        <Row key={i.id} style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text }}>{i.name}</Text>
            {i.dayOfMonth ? (
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>Día {i.dayOfMonth}</Text>
            ) : null}
          </View>
          <Text style={{ fontWeight: '700', color }}>{formatMoney(toNumber(i.amount))}</Text>
          <Pressable onPress={() => onRemove(i.id)} style={{ marginLeft: spacing.md }}>
            <Text style={{ color: colors.textMuted, fontSize: 18 }}>🗑️</Text>
          </Pressable>
        </Row>
      ))}
    </Card>
  );
}

/** Fecha corta "28 jul" (mismo formato de Inicio, FIN-018 D3-B). */
function shortDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}
