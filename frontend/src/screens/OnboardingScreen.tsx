import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Chip, Field, HeroCard, ProgressBar, Row } from '../components/ui';
import { colors, spacing, type } from '../theme/colors';
import { authApi, incomeApi } from '../api/endpoints';
import { WorkProfile } from '../api/types';
import { formatMoney, parseAmount } from '../utils/format';
import { useAuthStore } from '../store/auth.store';
import { RootStackParamList } from '../navigation/types';

type Step = 'bienvenida' | 'ingreso' | 'deuda';

const WORK: Array<{ key: WorkProfile; label: string }> = [
  { key: 'empleado', label: 'Empleado/a' },
  { key: 'independiente', label: 'Independiente' },
  { key: 'empresario', label: 'Tengo negocio' },
  { key: 'pensionado', label: 'Pensionado/a' },
  { key: 'estudiante', label: 'Estudiante' },
  { key: 'otro', label: 'Otro' },
];

/**
 * FIN-038 · Onboarding de 3 pasos. Promesa §11 de la visión: valor real en menos de
 * un minuto. Al terminar, Inicio ya tiene un ingreso declarado (→ "Te queda" real) y,
 * si aplica, el usuario cae directo en el alta de su primera deuda. Todo es opcional:
 * "Saltar" nunca deja al usuario atrapado.
 */
export function OnboardingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, patchUser } = useAuthStore();
  const [step, setStep] = useState<Step>('bienvenida');
  const [work, setWork] = useState<WorkProfile>('empleado');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const name = user?.fullName?.split(' ')[0];
  const value = parseAmount(amount) || 0;
  const progress = step === 'bienvenida' ? 1 / 3 : step === 'ingreso' ? 2 / 3 : 1;

  const finish = async (goToDebt: boolean) => {
    setBusy(true);
    try {
      await authApi.onboardingDone().catch(() => undefined);
      await patchUser({ onboardingDone: true });
      // Reemplaza la pila: Onboarding no vuelve a aparecer.
      navigation.reset({
        index: 0,
        routes: goToDebt
          ? [{ name: 'Main', params: { screen: 'Debts', params: { screen: 'AddDebt' } } }]
          : [{ name: 'Main' }],
      });
    } finally {
      setBusy(false);
    }
  };

  const saveIncome = async () => {
    setError(null);
    if (!value) {
      setError('Escribe cuánto te entra al mes, aunque sea aproximado.');
      return;
    }
    setBusy(true);
    try {
      await incomeApi.setProfile(work).catch(() => undefined);
      await incomeApi.createSource({
        name: work === 'empleado' || work === 'pensionado' ? 'Salario' : 'Ingreso principal',
        amount: value,
        isVariable: work === 'independiente' || work === 'empresario',
        dayOfMonth: day ? Math.min(31, Math.max(1, parseInt(day, 10))) : undefined,
      });
      setStep('deuda');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingTop: spacing.xxl }} keyboardShouldPersistTaps="handled">
        <ProgressBar value={progress} label="Progreso del inicio" />
        <Text style={{ color: colors.textMuted, ...type.small, marginTop: spacing.xs, marginBottom: spacing.lg }}>
          Paso {step === 'bienvenida' ? 1 : step === 'ingreso' ? 2 : 3} de 3
        </Text>

        {step === 'bienvenida' ? (
          <>
            <Text style={{ color: colors.text, ...type.display }}>Hola{name ? `, ${name}` : ''} 👋</Text>
            <Text style={{ color: colors.textMuted, ...type.bodyLg, marginTop: spacing.sm, marginBottom: spacing.lg }}>
              En un minuto Millo te dice cuánto te queda para gastar este mes y qué hacer con tus deudas.
              Solo necesito dos cosas.
            </Text>
            {[
              ['cash-outline', 'Cuánto te entra al mes', 'Para calcular "Te queda para gastar".'],
              ['card-outline', 'Si tienes alguna deuda', 'Para armarte un plan honesto de salida.'],
              ['lock-closed-outline', 'Tus datos son tuyos', 'Nunca se venden ni se comparten. Puedes borrarlos cuando quieras.'],
            ].map(([icon, t, s]) => (
              <Card key={t} style={{ paddingVertical: spacing.sm }}>
                <Row style={{ gap: spacing.md }}>
                  <Ionicons name={icon as never} size={24} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, ...type.body, fontWeight: '700' }}>{t}</Text>
                    <Text style={{ color: colors.textMuted, ...type.small }}>{s}</Text>
                  </View>
                </Row>
              </Card>
            ))}
            <Button title="Empezar" icon="arrow-forward" onPress={() => setStep('ingreso')} />
            <Button title="Saltar por ahora" variant="ghost" onPress={() => void finish(false)} loading={busy} />
          </>
        ) : null}

        {step === 'ingreso' ? (
          <>
            <Text style={{ color: colors.text, ...type.heading }}>¿De qué vives?</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginVertical: spacing.md }}>
              {WORK.map((w) => (
                <Chip key={w.key} label={w.label} active={work === w.key} onPress={() => setWork(w.key)} />
              ))}
            </View>
            <HeroCard>
              <Text style={{ color: colors.onPrimaryMuted, ...type.body }}>
                {work === 'independiente' || work === 'empresario' ? 'Ingreso mensual estimado' : 'Ingreso mensual neto'}
              </Text>
              <Text style={{ color: colors.textInverse, ...type.hero }}>{value ? formatMoney(value) : '$0'}</Text>
              <Text style={{ color: colors.onPrimaryFaint, ...type.small }}>
                Lo que realmente te llega. Luego puedes afinar deducciones en tu perfil.
              </Text>
            </HeroCard>
            <Field label="Monto" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="3.500.000" />
            <Field label="¿Qué día te pagan? (opcional)" value={day} onChangeText={setDay} keyboardType="numeric" placeholder="30" hint="Millo usa este día para tu ciclo." />
            {error ? <Text style={{ color: colors.danger, ...type.body, marginBottom: spacing.sm }}>{error}</Text> : null}
            <Button title="Guardar y seguir" onPress={() => void saveIncome()} loading={busy} />
            <Button title="Lo hago después" variant="ghost" onPress={() => setStep('deuda')} />
          </>
        ) : null}

        {step === 'deuda' ? (
          <>
            <Text style={{ color: colors.text, ...type.heading }}>¿Tienes alguna deuda?</Text>
            <Text style={{ color: colors.textMuted, ...type.bodyLg, marginTop: spacing.sm, marginBottom: spacing.lg }}>
              Tarjeta, crédito, libranza, un préstamo de un familiar o un gota a gota — Millo las
              entiende todas y te muestra cuánto te cuestan de verdad, sin juzgar.
            </Text>
            <Button title="Sí, registrar mi primera deuda" icon="card-outline" onPress={() => void finish(true)} loading={busy} />
            <Button title="No tengo deudas, ir a Inicio" variant="secondary" onPress={() => void finish(false)} loading={busy} />
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
