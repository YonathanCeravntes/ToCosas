import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { Text } from '../../components/AppText';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Field } from '../../components/ui';
import { colors, spacing, type } from '../../theme/colors';
import { useAuthStore } from '../../store/auth.store';
import { authApi } from '../../api/endpoints';
import { ExistingAccountNotice } from '../../components/ExistingAccountNotice';
import { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

/** FIN-039 · Texto corto de la política de datos (versión 1). El principio viene de PRODUCT_VISION §8. */
export const DATA_POLICY_SHORT =
  'Tus datos se guardan de forma segura y se usan solo para prestarte el servicio de Millo. ' +
  'Nunca se venden ni se comparten con terceros, salvo obligación legal. Puedes exportarlos o ' +
  'borrar tu cuenta cuando quieras desde Ajustes; al borrarla, tus datos se eliminan por ' +
  'completo a los 30 días (Ley 1581 de 2012).';

export function RegisterScreen({ navigation, route }: Props) {
  const { register, loading, error } = useAuthStore();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(route.params?.email ?? '');
  // BT-025: el correo ya tiene cuenta → se avisa de una vez y se ofrece ingresar.
  const [existing, setExisting] = useState<string | null>(null);

  const checkEmail = async (raw = email): Promise<boolean> => {
    const e = raw.trim();
    if (!/^\S+@\S+\.\S+$/.test(e)) return false;
    try {
      const { exists } = await authApi.emailStatus(e);
      setExisting(exists ? e : null);
      return exists;
    } catch {
      return false; // sin conexión: el registro lo validará
    }
  };
  const goLogin = () => navigation.navigate('Login', { email: existing ?? email.trim() });
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const onSubmit = async () => {
    setLocalError(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setLocalError('Escribe un correo válido.');
    if (password.length < 8) return setLocalError('La contraseña debe tener al menos 8 caracteres.');
    if (!accepted) return setLocalError('Para crear la cuenta necesitas aceptar la política de datos.');
    if (await checkEmail()) return;
    try {
      await register(email.trim(), password, fullName.trim() || undefined, true);
    } catch (e) {
      // Si se registró entre tanto (o sin conexión al revisar), el mismo aviso con salida.
      if (/ya existe/i.test((e as Error).message)) setExisting(email.trim());
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingTop: spacing.xxl, flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
        <Text style={{ color: colors.primary, ...type.heading, marginBottom: spacing.lg }}>Crea tu cuenta</Text>

        <Field label="Nombre" value={fullName} onChangeText={setFullName} placeholder="Tu nombre" autoCapitalize="words" />
        <Field
          label="Correo"
          value={email}
          onChangeText={(t) => { setEmail(t); setExisting(null); }}
          onBlur={() => void checkEmail()}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="tucorreo@mail.com"
        />
        {existing ? (
          <ExistingAccountNotice
            email={existing}
            loginLabel="Ingresar con este correo"
            onLogin={goLogin}
            onForgot={() => navigation.navigate('ForgotPassword', { email: existing })}
          />
        ) : null}
        <Field
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          hint={password.length > 0 && password.length < 8 ? `Faltan ${8 - password.length} caracteres` : 'Mínimo 8 caracteres'}
        />

        <Pressable
          onPress={() => setAccepted((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: accepted }}
          accessibilityLabel="Acepto la política de tratamiento de datos"
          style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm, minHeight: 44 }}
        >
          <Ionicons name={accepted ? 'checkbox' : 'square-outline'} size={22} color={accepted ? colors.primary : colors.textMuted} />
          <Text style={{ color: colors.text, ...type.body, flex: 1 }}>
            Acepto que Millo trate mis datos para prestarme el servicio.{' '}
            <Text onPress={() => setShowPolicy((v) => !v)} style={{ color: colors.primary, fontWeight: '600' }}>
              {showPolicy ? 'Ocultar' : 'Leer la política'}
            </Text>
          </Text>
        </Pressable>
        {showPolicy ? (
          <Card style={{ backgroundColor: colors.surfaceAlt, borderColor: colors.surfaceAlt }}>
            <Text style={{ color: colors.textMuted, ...type.small }}>{DATA_POLICY_SHORT}</Text>
          </Card>
        ) : null}

        {localError || (error && !existing) ? (
          <Text style={{ color: colors.danger, ...type.body, marginBottom: spacing.sm }}>{localError ?? error}</Text>
        ) : null}

        <Button title="Registrarme" onPress={onSubmit} loading={loading} />
        <Button title="Ya tengo cuenta" variant="secondary" onPress={goLogin} />
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
