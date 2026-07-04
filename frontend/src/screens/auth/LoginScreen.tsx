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
        <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
          <Text style={{ fontSize: 40 }}>🪈</Text>
          <Text style={{ fontSize: 28, fontWeight: '800', color: colors.primary }}>
            Millo
          </Text>
          <Text style={{ color: colors.textMuted, marginTop: 4 }}>
            Cuida tus millos, sal de deudas con calma.
          </Text>
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

        <Button title="Ingresar" onPress={onSubmit} loading={loading} />
        <Button
          title="Crear cuenta"
          variant="secondary"
          onPress={() => navigation.navigate('Register')}
        />
      </KeyboardAvoidingView>
    </Screen>
  );
}
