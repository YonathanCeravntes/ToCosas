import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Field, Screen } from '../../components/ui';
import { colors, spacing } from '../../theme/colors';
import { useAuthStore } from '../../store/auth.store';
import { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { login, loading, error } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const onSubmit = async () => {
    try {
      await login(email.trim(), password);
    } catch {
      /* el error ya está en el store */
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'center' }}
      >
        {/* FIN-017 P1 (DEC-0017 §4.1 + confirmación del CTO): propuesta de valor
            compacta — qué hace Milla, entendible en ≤5 segundos, 4 pilares. */}
        <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
          <Text style={{ fontSize: 40 }}>🪈</Text>
          <Text style={{ fontSize: 28, fontWeight: '800', color: colors.primary }}>
            Millo
          </Text>
          <Text style={{ color: colors.text, marginTop: 4, fontWeight: '600', textAlign: 'center' }}>
            Tus deudas, tu plata y tu mes — claros en un solo lugar.
          </Text>
        </View>

        {/* L2 (corrección trivial autorizada): columna de íconos fija para
            alineación limpia de las 4 líneas. */}
        <View style={{ marginBottom: spacing.lg, gap: 6, alignSelf: 'center' }}>
          {[
            ['💳', 'Sal de tus deudas con un plan'],
            ['💰', 'Cuánto puedes gastar, siempre claro'],
            ['🩺', 'Tu salud financiera en un número'],
            ['🤖', 'Un copiloto que te explica'],
          ].map(([icon, label]) => (
            <View key={label} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 14, width: 28 }}>{icon}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 14 }}>{label}</Text>
            </View>
          ))}
        </View>

        <Field
          label="Correo"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="tucorreo@mail.com"
        />
        <Field
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
        />

        {error ? <Text style={{ color: colors.danger, marginBottom: 8 }}>{error}</Text> : null}

        {/* FIN-018 L1-A (DEC-018): la sesión persiste, así que esta pantalla la ve
            casi siempre un usuario NUEVO — su acción va como primaria. */}
        <Button title="Crear cuenta" onPress={() => navigation.navigate('Register')} />
        <Button title="Ingresar" variant="secondary" onPress={onSubmit} loading={loading} />

        {/* El tagline baja a firma emocional: no intenta explicar el producto. */}
        <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: spacing.lg }}>
          "Cuida tus millos, sal de deudas con calma."
        </Text>
      </KeyboardAvoidingView>
    </Screen>
  );
}
