import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Field, Screen } from '../../components/ui';
import { colors, spacing } from '../../theme/colors';
import { useAuthStore } from '../../store/auth.store';
import { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const { register, loading, error } = useAuthStore();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const onSubmit = async () => {
    try {
      await register(email.trim(), password, fullName.trim() || undefined);
    } catch {
      /* error en el store */
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'center' }}
      >
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.primary, marginBottom: spacing.lg }}>
          Crea tu cuenta
        </Text>

        <Field label="Nombre" value={fullName} onChangeText={setFullName} placeholder="Tu nombre" />
        <Field
          label="Correo"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="tucorreo@mail.com"
        />
        <Field
          label="Contraseña (mín. 8)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
        />

        {error ? <Text style={{ color: colors.danger, marginBottom: 8 }}>{error}</Text> : null}

        <Button title="Registrarme" onPress={onSubmit} loading={loading} />
        <Button title="Ya tengo cuenta" variant="secondary" onPress={() => navigation.goBack()} />
      </KeyboardAvoidingView>
    </Screen>
  );
}
