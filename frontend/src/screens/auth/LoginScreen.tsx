import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { Text, TextInput } from '../../components/AppText';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Button, Field } from '../../components/ui';
import { colors, spacing, type } from '../../theme/colors';
import { useAuthStore } from '../../store/auth.store';
import { authApi } from '../../api/endpoints';
import { ExistingAccountNotice } from '../../components/ExistingAccountNotice';
import { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const PILLARS: Array<[React.ComponentProps<typeof Ionicons>['name'], string]> = [
  ['card-outline', 'Sal de tus deudas con un plan'],
  ['wallet-outline', 'Cuánto puedes gastar, siempre claro'],
  ['pulse-outline', 'Tu salud financiera en un número'],
  ['chatbubble-ellipses-outline', 'Un copiloto que te explica'],
];

/** FIN-060 · Marca Millo hecha con Views (OTA-safe): cuadrado verde, "M" blanca y punto dorado debajo. */
function MilloMark() {
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="Millo"
      style={{ width: 60, height: 60, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm }}
    >
      <Text style={{ color: colors.textInverse, fontSize: 32, lineHeight: 34, fontWeight: '700', letterSpacing: -1 }}>M</Text>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold, marginTop: 2 }} />
    </View>
  );
}

export function LoginScreen({ navigation, route }: Props) {
  const { login, loading, error } = useAuthStore();
  const [email, setEmail] = useState(route.params?.email ?? '');
  // BT-025: si el correo escrito ya tiene cuenta, "Crear cuenta" lo dice y ofrece ingresar.
  const [existing, setExisting] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const passwordRef = React.useRef<TextInput>(null);

  React.useEffect(() => {
    if (route.params?.email) setEmail(route.params.email);
  }, [route.params?.email]);

  const goRegister = async () => {
    const e = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(e)) return navigation.navigate('Register', e ? { email: e } : undefined);
    setChecking(true);
    try {
      const { exists } = await authApi.emailStatus(e);
      if (exists) return setExisting(e);
    } catch {
      /* sin conexión: el registro volverá a validarlo */
    } finally {
      setChecking(false);
    }
    navigation.navigate('Register', { email: e });
  };
  const [password, setPassword] = useState('');

  const onSubmit = async () => {
    try {
      await login(email.trim(), password);
    } catch {
      /* el error ya está en el store */
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingTop: spacing.xxl, flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
        {/* FIN-017 P1: propuesta de valor compacta, entendible en ≤5 segundos. */}
        <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
          <MilloMark />
          <Text style={{ color: colors.primary, ...type.display, fontWeight: '700' }}>Millo</Text>
          <Text style={{ color: colors.text, marginTop: spacing.xs, fontWeight: '600', textAlign: 'center', ...type.body }}>
            Tus deudas, tu plata y tu mes — claros en un solo lugar.
          </Text>
        </View>

        <View style={{ marginBottom: spacing.lg, gap: spacing.sm, alignSelf: 'center' }}>
          {PILLARS.map(([icon, label]) => (
            <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Ionicons name={icon} size={16} color={colors.textFaint} />
              <Text style={{ color: colors.textMuted, ...type.small }}>{label}</Text>
            </View>
          ))}
        </View>

        <Field label="Correo" value={email} onChangeText={(t) => { setEmail(t); setExisting(null); }} autoCapitalize="none" keyboardType="email-address" placeholder="tucorreo@mail.com" />
        <Field ref={passwordRef} label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" />

        {existing ? (
          <ExistingAccountNotice
            email={existing}
            loginLabel={password ? 'Ingresar ahora' : 'Escribir mi contraseña'}
            onLogin={() => (password ? void onSubmit() : passwordRef.current?.focus())}
            onForgot={() => navigation.navigate('ForgotPassword', { email: existing })}
          />
        ) : null}

        {error ? <Text style={{ color: colors.danger, ...type.body, marginBottom: spacing.sm }}>{error}</Text> : null}

        {/* FIN-018 L1-A: la sesión persiste, así que casi siempre entra un usuario NUEVO. */}
        <Button title="Crear cuenta" onPress={() => void goRegister()} loading={checking} />
        <Button title="Ingresar" variant="secondary" onPress={onSubmit} loading={loading} />
        <Pressable
          onPress={() => navigation.navigate('ForgotPassword', { email: email.trim() || undefined })}
          accessibilityRole="link"
          style={{ alignSelf: 'center', paddingVertical: spacing.sm, minHeight: 44, justifyContent: 'center' }}
        >
          <Text style={{ color: colors.primary, ...type.body, fontWeight: '600' }}>Olvidé mi contraseña</Text>
        </Pressable>

        <Text style={{ color: colors.textFaint, ...type.caption, fontStyle: 'italic', textAlign: 'center', marginTop: spacing.md }}>
          "Cuida tus millos, sal de deudas con calma."
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
