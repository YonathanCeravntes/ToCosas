import React from 'react';
import { Pressable, View } from 'react-native';
import { Text } from './AppText';
import { Ico } from './ui';
import { colors, radius, spacing, type } from '../theme/colors';

/**
 * BT-025 · "Ya tienes una cuenta con este correo": en vez de dejar crear una cuenta
 * repetida (o fallar al final del formulario), se ofrece ingresar o recuperar la clave.
 */
export function ExistingAccountNotice({
  email,
  onLogin,
  loginLabel = 'Ingresar',
  onForgot,
}: {
  email: string;
  onLogin: () => void;
  loginLabel?: string;
  onForgot: () => void;
}) {
  return (
    <View
      accessibilityRole="alert"
      style={{ backgroundColor: colors.primarySoft, borderRadius: radius.md, borderWidth: 1, borderColor: colors.primarySoft, padding: spacing.md, marginBottom: spacing.md }}
    >
      <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
        <Ico name="person-circle-outline" color={colors.primary} size={18} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.primaryDark, ...type.body, fontWeight: '600' }}>Ya tienes una cuenta con este correo</Text>
          <Text style={{ color: colors.textMuted, ...type.small, marginTop: 2 }}>{email} ya está registrado en Millo. Ingresa con tu contraseña.</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, marginLeft: 26, flexWrap: 'wrap', alignItems: 'center' }}>
        <Pressable onPress={onLogin} accessibilityRole="button" style={{ backgroundColor: colors.primary, borderRadius: radius.full, paddingVertical: 9, paddingHorizontal: 16 }}>
          <Text style={{ color: colors.textInverse, ...type.body, fontWeight: '600' }}>{loginLabel}</Text>
        </Pressable>
        <Pressable onPress={onForgot} accessibilityRole="link" style={{ paddingVertical: 9, paddingHorizontal: 6 }}>
          <Text style={{ color: colors.primary, ...type.body, fontWeight: '600' }}>Olvidé mi contraseña</Text>
        </Pressable>
      </View>
    </View>
  );
}
