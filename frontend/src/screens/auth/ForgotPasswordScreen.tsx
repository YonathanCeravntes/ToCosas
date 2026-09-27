import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Card, Field } from '../../components/ui';
import { colors, spacing, type } from '../../theme/colors';
import { authApi } from '../../api/endpoints';
import { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

/**
 * FIN-039 · Recuperar contraseña en dos pasos, en la misma pantalla: correo →
 * código de 6 dígitos + contraseña nueva. El backend nunca dice si el correo
 * existe; la app explica por dónde llega el código según los canales activos.
 */
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
          <Card style={{ backgroundColor: colors.successSoft, borderColor: colors.primaryLight }}>
            <Text style={{ color: colors.primaryDark, ...type.title }}>Listo, contraseña cambiada</Text>
            <Text style={{ color: colors.text, ...type.body, marginTop: spacing.xs }}>Ya puedes ingresar con tu nueva contraseña.</Text>
            <Button title="Ir a ingresar" onPress={() => navigation.navigate('Login')} />
          </Card>
        ) : (
          <>
            <Text style={{ color: colors.textMuted, ...type.bodyLg, marginBottom: spacing.md }}>
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
            />
            {!sent ? (
              <Button title="Enviarme el código" onPress={() => void request()} loading={busy} />
            ) : (
              <>
                <Card style={{ backgroundColor: colors.infoSoft, borderColor: colors.info }}>
                  <Text style={{ color: colors.text, ...type.body }}>{channelText()}</Text>
                </Card>
                <Field label="Código (6 dígitos)" value={code} onChangeText={setCode} keyboardType="number-pad" placeholder="482913" maxLength={6} />
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
