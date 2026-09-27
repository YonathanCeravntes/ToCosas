import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Field } from '../../components/ui';
import { colors, spacing, type } from '../../theme/colors';
import { useAuthStore } from '../../store/auth.store';
import { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

/** FIN-039 · Texto corto de la política de datos (versión 1). El principio viene de PRODUCT_VISION §8. */
export const DATA_POLICY_SHORT =
  'Tus datos se guardan de forma segura y se usan solo para prestarte el servicio de Millo. ' +
  'Nunca se venden ni se comparten con terceros, salvo obligación legal. Puedes exportarlos o ' +
  'borrar tu cuenta cuando quieras desde Ajustes; al borrarla, tus datos se eliminan por ' +
  'completo a los 30 días (Ley 1581 de 2012).';

export function RegisterScreen({ navigation }: Props) {
  const { register, loading, error } = useAuthStore();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const onSubmit = async () => {
    setLocalError(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setLocalError('Escribe un correo válido.');
    if (password.length < 8) return setLocalError('La contraseña debe tener al menos 8 caracteres.');
    if (!accepted) return setLocalError('Para crear la cuenta necesitas aceptar la política de datos.');
    try {
      await register(email.trim(), password, fullName.trim() || undefined, true);
    } catch {
      /* error en el store */
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingTop: spacing.xxl, flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
        <Text style={{ color: colors.primary, ...type.heading, marginBottom: spacing.lg }}>Crea tu cuenta</Text>

        <Field label="Nombre" value={fullName} onChangeText={setFullName} placeholder="Tu nombre" autoCapitalize="words" />
        <Field label="Correo" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="tucorreo@mail.com" />
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
          <Ionicons name={accepted ? 'checkbox' : 'square-outline'} size={24} color={accepted ? colors.primary : colors.textMuted} />
          <Text style={{ color: colors.text, ...type.body, flex: 1 }}>
            Acepto que Millo trate mis datos para prestarme el servicio.{' '}
            <Text onPress={() => setShowPolicy((v) => !v)} style={{ color: colors.primary, fontWeight: '700' }}>
              {showPolicy ? 'Ocultar' : 'Leer la política'}
            </Text>
          </Text>
        </Pressable>
        {showPolicy ? (
          <Card style={{ backgroundColor: colors.surfaceAlt }}>
            <Text style={{ color: colors.text, ...type.small }}>{DATA_POLICY_SHORT}</Text>
          </Card>
        ) : null}

        {localError || error ? (
          <Text style={{ color: colors.danger, ...type.body, marginBottom: spacing.sm }}>{localError ?? error}</Text>
        ) : null}

        <Button title="Registrarme" onPress={onSubmit} loading={loading} />
        <Button title="Ya tengo cuenta" variant="secondary" onPress={() => navigation.goBack()} />
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
