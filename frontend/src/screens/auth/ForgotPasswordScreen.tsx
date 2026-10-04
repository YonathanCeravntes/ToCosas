import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Text } from '../../components/AppText';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Card, Field, Ico } from '../../components/ui';
import { colors, spacing, touch, type } from '../../theme/colors';
import { authApi } from '../../api/endpoints';
import { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

/**
 * FIN-039 · Recuperar contraseña en dos pasos, en la misma pantalla: correo →
 * código de 6 dígitos + contraseña nueva. El backend nunca dice si el correo
 * existe; la app explica por dónde llega el código según los canales activos.
 */
/** Mismo aspecto que el campo de `Field`; el correo ya enviado queda bloqueado en gris. */
const baseInput = {
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 10,
  paddingHorizontal: spacing.md,
  paddingVertical: 12,
  minHeight: touch.min,
  ...type.bodyLg,
};
const lockedInput = { ...baseInput, backgroundColor: colors.surfaceAlt, color: colors.textFaint };
/** El código se lee en cifras espaciadas. */
const codeInput = { ...baseInput, backgroundColor: colors.surface, color: colors.text, letterSpacing: 4 };

export function ForgotPasswordScreen({ navigation, route }: Props) {
  const [email, setEmail] = useState(route.params?.email ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [sent, setSent] = useState<Array<'email' | 'telegram' | 'none'> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const request = async () => {
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Escribe un correo válido.');
      return;
    }
    setBusy(true);
    try {
      const r = await authApi.forgotPassword(email.trim());
      setSent(r.channels);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setError(null);
    if (!/^\d{6}$/.test(code.trim())) {
      setError('El código tiene 6 dígitos.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña nueva debe tener al menos 8 caracteres.');
      return;
    }
    setBusy(true);
    try {
      await authApi.resetPassword(email.trim(), code.trim(), password);
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const channelText = () => {
    if (!sent) return '';
    if (sent.includes('none')) {
      return 'Millo aún no tiene un canal de correo configurado. Si vinculaste Telegram, revisa el chat con el bot; si no, escríbenos y te ayudamos a recuperar el acceso.';
    }
    const parts = [];
    if (sent.includes('email')) parts.push('tu correo');
    if (sent.includes('telegram')) parts.push('tu chat de Telegram con Millo (si lo vinculaste)');
    return `Si el correo existe, te enviamos un código de 6 dígitos a ${parts.join(' y a ')}. Vence en 15 minutos.`;
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: spacing.md }} keyboardShouldPersistTaps="handled">
        {done ? (
          <Card style={{ backgroundColor: colors.primarySoft, borderColor: colors.primarySoft, marginTop: spacing.sm }}>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm }}>
              <Ico name="checkmark" color={colors.textInverse} size={18} />
            </View>
            <Text style={{ color: colors.primaryDark, ...type.title }}>Listo, contraseña cambiada</Text>
            <Text style={{ color: colors.textMuted, ...type.body, marginTop: spacing.xs, marginBottom: spacing.sm }}>Ya puedes ingresar con tu nueva contraseña.</Text>
            <Button title="Ir a ingresar" onPress={() => navigation.navigate('Login')} />
          </Card>
        ) : (
          <>
            <Text style={{ color: colors.textMuted, ...type.body, marginTop: spacing.xs, marginBottom: spacing.md }}>
              Te enviamos un código para que elijas una contraseña nueva. Tus datos no se tocan.
            </Text>
            <Field
              label="Correo"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="tucorreo@mail.com"
              editable={!sent}
              style={sent ? lockedInput : undefined}
            />
            {!sent ? (
              <Button title="Enviarme el código" onPress={() => void request()} loading={busy} />
            ) : (
              <>
                <Card style={{ backgroundColor: colors.infoSoft, borderColor: colors.infoSoft, flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
                  <View style={{ marginTop: 2 }}>
                    <Ico name="mail-outline" color={colors.info} size={16} />
                  </View>
                  <Text style={{ color: colors.text, ...type.small, flex: 1 }}>{channelText()}</Text>
                </Card>
                <Field label="Código (6 dígitos)" value={code} onChangeText={setCode} keyboardType="number-pad" placeholder="482913" maxLength={6} style={codeInput} />
                <Field label="Contraseña nueva (mín. 8)" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" />
                <Button title="Cambiar contraseña" onPress={() => void reset()} loading={busy} />
                <Button title="Reenviar código" variant="ghost" onPress={() => void request()} disabled={busy} />
              </>
            )}
            {error ? <Text style={{ color: colors.danger, ...type.body, marginTop: spacing.sm }}>{error}</Text> : null}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
