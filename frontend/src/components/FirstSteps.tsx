import React, { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Text } from './AppText';
import { Card, PaceBar } from './ui';
import { budgetApi, copilotApi, debtsApi, householdApi, incomeApi, transactionsApi } from '../api/endpoints';
import { useAuthStore } from '../store/auth.store';
import { getPref, setPref } from '../utils/prefs';
import { colors, spacing, type } from '../theme/colors';

/**
 * FIN-060 · "Primeros pasos" en Inicio (patrón YNAB/Monarch; Appcues: +15–25 % de
 * finalización con avance visible). Arranca con "Crear tu cuenta" ya hecho y cada paso
 * se marca solo cuando la persona lo hace (se consulta lo que ya existe). Se oculta
 * con "Ocultar" o al completar los obligatorios.
 */
type Step = { key: string; label: string; done: boolean; optional?: boolean; go: () => void };

const pk = (userId: string, k: string) => `firststeps.${k}.${userId}`;

async function has<T>(p: Promise<T[]>): Promise<boolean> {
  try {
    return (await p).length > 0;
  } catch {
    return false;
  }
}

export function FirstSteps() {
  const nav = useNavigation<any>();
  const userId = useAuthStore((s) => s.user?.id);
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [hidden, setHidden] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    if ((await getPref(pk(userId, 'hidden'))) === '1') {
      setHidden(true);
      return;
    }
    const [income, expense, debt, noDebt, budget, telegram, copilot, partner] = await Promise.all([
      has(incomeApi.listSources()),
      has(transactionsApi.list({ kind: 'gasto', limit: 1 })),
      has(debtsApi.list()),
      getPref(pk(userId, 'nodebt')).then((v) => v === '1'),
      has(budgetApi.listFixed()),
      getPref(pk(userId, 'telegram')).then((v) => v === '1'),
      has(copilotApi.conversations()),
      householdApi.state().then((s) => !!s.household).catch(() => false),
    ]);
    const mark = (k: string) => void setPref(pk(userId, k), '1');
    const list: Step[] = [
      { key: 'cuenta', label: 'Crear tu cuenta', done: true, go: () => undefined },
      { key: 'gasto', label: 'Registrar tu primer gasto', done: expense, go: () => nav.navigate('Main', { screen: 'Add' }) },
      { key: 'ingreso', label: 'Contar cuánto ganas', done: income, go: () => nav.navigate('IncomeProfile') },
      { key: 'deuda', label: 'Agregar una deuda', done: debt || noDebt, go: () => nav.navigate('Main', { screen: 'Debts', params: { screen: 'AddDebt' } }) },
      { key: 'presupuesto', label: 'Armar tu presupuesto', done: budget, go: () => nav.navigate('Budget') },
      {
        key: 'telegram',
        label: 'Conectar Telegram',
        done: telegram,
        go: () => {
          mark('telegram');
          nav.navigate('LinkTelegram');
        },
      },
      { key: 'copiloto', label: 'Preguntarle al Copiloto', done: copilot, go: () => nav.navigate('Copilot') },
      { key: 'pareja', label: 'Invitar a tu pareja', done: partner, optional: true, go: () => nav.navigate('Household') },
    ];
    const pending = list.filter((s) => !s.done && !s.optional).length;
    setHidden(pending === 0);
    setSteps(list);
  }, [userId, nav]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (hidden || !steps || !userId) return null;
  const done = steps.filter((s) => s.done).length;

  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text accessibilityRole="header" style={{ ...type.bodyLg, fontWeight: '600', color: colors.text }}>
          Primeros pasos
        </Text>
        <Text style={{ ...type.small, color: colors.textFaint }}>{`${done} de ${steps.length}`}</Text>
      </View>
      <View style={{ marginTop: spacing.sm, marginBottom: spacing.xs }}>
        <PaceBar used={done / steps.length} color={colors.gold} />
      </View>
      {steps.map((s) => (
        <Pressable
          key={s.key}
          onPress={s.done ? undefined : s.go}
          disabled={s.done}
          accessibilityRole="button"
          accessibilityState={{ checked: s.done, disabled: s.done }}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 9, opacity: pressed ? 0.6 : 1 })}
        >
          <Ionicons
            name={s.done ? 'checkmark-circle' : 'ellipse-outline'}
            size={18}
            color={s.done ? colors.primary : colors.textFaint}
          />
          <Text style={{ ...type.body, flex: 1, color: s.done ? colors.textFaint : colors.text }}>
            {s.label}
            {s.optional ? <Text style={{ color: colors.textFaint }}> (opcional)</Text> : null}
          </Text>
          {s.done ? null : <Ionicons name="chevron-forward" size={16} color={colors.primary} />}
        </Pressable>
      ))}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs }}>
        {steps.find((s) => s.key === 'deuda' && !s.done) ? (
          <Pressable
            onPress={() => {
              void setPref(pk(userId, 'nodebt'), '1');
              void load();
            }}
            accessibilityRole="button"
            hitSlop={8}
          >
            <Text style={{ ...type.small, fontWeight: '600', color: colors.textFaint }}>No tengo deudas</Text>
          </Pressable>
        ) : <View />}
        <Pressable
          onPress={() => {
            void setPref(pk(userId, 'hidden'), '1');
            setHidden(true);
          }}
          accessibilityRole="button"
          hitSlop={8}
        >
          <Text style={{ ...type.small, fontWeight: '600', color: colors.textFaint }}>Ocultar</Text>
        </Pressable>
      </View>
    </Card>
  );
}
