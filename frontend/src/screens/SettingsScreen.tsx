import React, { useCallback, useState } from 'react';
import { Alert, Platform, Pressable, Share, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Field, FormScroll, IconButton, Row } from '../components/ui';
import { colors, spacing, type } from '../theme/colors';
import { useAuthStore } from '../store/auth.store';
import { authApi, billingApi, budgetApi, copilotApi, insightsApi } from '../api/endpoints';
import { BillingStatus } from '../api/types';
import { RootStackParamList } from '../navigation/types';
import { DATA_POLICY_SHORT } from './auth/RegisterScreen';
import { formatLocalDate } from '../utils/format';

export function SettingsScreen() {
  const { user, logout, refreshMe, patchUser } = useAuthStore();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [aiAccepted, setAiAccepted] = useState<boolean | null>(null);
  const [proactive, setProactive] = useState<boolean | null>(null);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [cycleDay, setCycleDay] = useState<number>(1);
  const [deleting, setDeleting] = useState(false);
  const [deletePwd, setDeletePwd] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(
    () =>
      Promise.all([
        copilotApi.consentStatus().then((s) => setAiAccepted(s.accepted)).catch(() => setAiAccepted(null)),
        billingApi.me().then(setBilling).catch(() => undefined),
        budgetApi.monthly().then((b) => setCycleDay(b.period?.cycleStartDay ?? 1)).catch(() => undefined),
        insightsApi.preferences().then((p) => setProactive(p.proactiveEnabled)).catch(() => setProactive(null)),
        refreshMe(),
      ]),
    [refreshMe],
  );

  // BP-03: datos frescos cada vez que la pantalla gana foco.
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const changeCycleDay = async (delta: number) => {
    const next = Math.min(28, Math.max(1, cycleDay + delta));
    if (next === cycleDay) return;
    setCycleDay(next);
    await budgetApi.setCycleDay(next).catch(() => undefined);
  };

  const toggleProactive = async () => {
    const next = !(proactive ?? true);
    setProactive(next);
    await insightsApi.setProactive(next).catch(() => undefined);
  };

  const revokeAi = async () => {
    await copilotApi.revokeConsent();
    setAiAccepted(false);
  };

  const deleteHistory = () => {
    Alert.alert('Borrar historial del Copiloto', 'Se eliminarán todas tus conversaciones de forma definitiva. ¿Continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: () => void copilotApi.deleteHistory() },
    ]);
  };

  const acceptPolicy = async () => {
    setBusy(true);
    try {
      const r = await authApi.acceptDataPolicy();
      await patchUser({ dataConsentAt: r.dataConsentAt });
      setMsg('Gracias. Quedó registrada tu aceptación.');
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // FIN-039 · Portabilidad: JSON legible que el usuario guarda o comparte.
  const exportData = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const data = await authApi.exportData();
      const json = JSON.stringify(data, null, 2);
      await Share.share({ title: 'Mis datos de Millo', message: json });
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // FIN-039 · Supresión: confirmación con contraseña; irreversible desde la app.
  const deleteAccount = async () => {
    if (!deletePwd) return;
    setBusy(true);
    setMsg(null);
    try {
      await authApi.deleteAccount(deletePwd);
      await logout({ wipeLocal: true });
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const version = Constants.expoConfig?.version ?? '0.1.0';
  const updateId = Updates.updateId ? Updates.updateId.slice(0, 8) : Platform.OS === 'web' ? 'web' : 'apk';

  return (
    <FormScroll onRefresh={load}>
      <Card>
        <Text style={{ color: colors.textMuted, ...type.small }}>Cuenta</Text>
        <Text style={{ color: colors.text, ...type.title }}>{user?.fullName ?? 'Usuario'}</Text>
        <Text style={{ color: colors.textMuted, ...type.body }}>{user?.email}</Text>
        {billing ? (
          <Text style={{ color: colors.textMuted, ...type.small, marginTop: spacing.xs }}>
            Plan {billing.plan === 'premium' ? 'Millo+' : 'gratis'}
            {billing.status === 'trial' && billing.until ? ` · prueba hasta ${formatLocalDate(billing.until)}` : ''}
          </Text>
        ) : null}
      </Card>

      {/* FIN-027: perfil de ingresos — se configura una vez, Millo lo reutiliza (§32). */}
      <SettingLink icon="briefcase-outline" title="Mi perfil de ingresos" sub="Perfil laboral, fuentes y deducciones" onPress={() => navigation.navigate('IncomeProfile')} />

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1, paddingRight: spacing.md }}>
            <Text style={{ color: colors.text, ...type.body, fontWeight: '700' }}>WhatsApp</Text>
            <Text style={{ color: colors.textMuted, ...type.small, marginTop: spacing.xxs }}>Registra movimientos por chat.</Text>
          </View>
          <Button title="Vincular" variant="secondary" onPress={() => navigation.navigate('LinkWhatsApp')} />
        </Row>
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1, paddingRight: spacing.md }}>
            <Text style={{ color: colors.text, ...type.body, fontWeight: '700' }}>Telegram</Text>
            <Text style={{ color: colors.textMuted, ...type.small, marginTop: spacing.xxs }}>Registra movimientos y recibe alertas de cuotas.</Text>
          </View>
          <Button title="Vincular" variant="secondary" onPress={() => navigation.navigate('LinkTelegram')} />
        </Row>
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1, paddingRight: spacing.md }}>
            <Text style={{ color: colors.text, ...type.body, fontWeight: '700' }}>Ciclo financiero</Text>
            <Text style={{ color: colors.textMuted, ...type.small, marginTop: spacing.xxs }}>
              {cycleDay === 1 ? 'Tu presupuesto sigue el mes calendario.' : `Tu ciclo empieza el día ${cycleDay} de cada mes (p. ej. tu fecha de pago).`}
            </Text>
            <Text style={{ color: colors.textFaint, ...type.caption, marginTop: spacing.xxs }}>
              Aplica a Presupuesto e Inicio; tu Score sigue el mes calendario.
            </Text>
          </View>
          <Row style={{ gap: spacing.xs }}>
            <IconButton icon="remove-circle-outline" label="Un día antes" onPress={() => void changeCycleDay(-1)} color={colors.text} size={26} />
            <Text style={{ color: colors.text, ...type.bodyLg, fontWeight: '800', minWidth: 24, textAlign: 'center' }}>{cycleDay}</Text>
            <IconButton icon="add-circle-outline" label="Un día después" onPress={() => void changeCycleDay(1)} color={colors.text} size={26} />
          </Row>
        </Row>
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1, paddingRight: spacing.md }}>
            <Text style={{ color: colors.text, ...type.body, fontWeight: '700' }}>Avisos proactivos</Text>
            <Text style={{ color: colors.textMuted, ...type.small, marginTop: spacing.xxs }}>Millo te avisa (máx. 1 al día) cuando detecta riesgos o logros.</Text>
          </View>
          <Button title={proactive === false ? 'Activar' : 'Desactivar'} variant="secondary" onPress={() => void toggleProactive()} />
        </Row>
      </Card>

      <Card>
        <Text style={{ color: colors.text, ...type.body, fontWeight: '700' }}>Inteligencia artificial</Text>
        <Text style={{ color: colors.textMuted, ...type.small, marginTop: spacing.xxs }}>
          {aiAccepted === null
            ? 'Estado no disponible.'
            : aiAccepted
              ? 'Activa: tus datos minimizados se usan para respuestas con IA. Puedes revocarlo cuando quieras.'
              : 'Inactiva: el Copiloto responde en modo básico. Actívala desde el Copiloto.'}
        </Text>
        {aiAccepted ? <Button title="Revocar consentimiento de IA" variant="secondary" onPress={() => void revokeAi()} /> : null}
        <Button title="Borrar historial del Copiloto" variant="secondary" onPress={deleteHistory} />
      </Card>

      {/* FIN-039 · Privacidad y datos: consentimiento, portabilidad, supresión. */}
      <Card>
        <Row style={{ gap: spacing.sm, marginBottom: spacing.xs }}>
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
          <Text style={{ color: colors.text, ...type.body, fontWeight: '700' }}>Privacidad y tus datos</Text>
        </Row>
        <Text style={{ color: colors.textMuted, ...type.small }}>{DATA_POLICY_SHORT}</Text>
        {user?.dataConsentAt ? (
          <Text style={{ color: colors.textFaint, ...type.caption, marginTop: spacing.xs }}>
            Aceptaste la política el {formatLocalDate(user.dataConsentAt)}.
          </Text>
        ) : (
          <Button title="Aceptar la política de datos" onPress={() => void acceptPolicy()} loading={busy} />
        )}
        <Button title="Exportar mis datos (JSON)" variant="secondary" icon="download-outline" onPress={() => void exportData()} loading={busy} />
        {!deleting ? (
          <Button title="Eliminar mi cuenta" variant="ghost" onPress={() => setDeleting(true)} />
        ) : (
          <View style={{ marginTop: spacing.sm, padding: spacing.md, borderRadius: 12, backgroundColor: colors.dangerSoft }}>
            <Text style={{ color: colors.text, ...type.body, marginBottom: spacing.sm }}>
              Se cerrará tu sesión y tu cuenta quedará eliminada. Tus deudas, movimientos y cuentas dejan de estar disponibles.
              Exporta tus datos antes si los quieres conservar.
            </Text>
            <Field label="Confirma con tu contraseña" value={deletePwd} onChangeText={setDeletePwd} secureTextEntry placeholder="••••••••" />
            <Button title="Eliminar definitivamente" variant="danger" onPress={() => void deleteAccount()} loading={busy} disabled={!deletePwd} />
            <Button title="Cancelar" variant="ghost" onPress={() => { setDeleting(false); setDeletePwd(''); }} />
          </View>
        )}
        {msg ? <Text style={{ color: colors.textMuted, ...type.small, marginTop: spacing.sm }}>{msg}</Text> : null}
      </Card>

      <View style={{ marginTop: spacing.lg }}>
        <Button title="Cerrar sesión" variant="danger" onPress={() => void logout({ wipeLocal: true })} />
      </View>

      <Text style={{ color: colors.textFaint, ...type.caption, textAlign: 'center', marginTop: spacing.xl }}>
        Millo v{version} · actualización {updateId}
      </Text>
    </FormScroll>
  );
}

function SettingLink({ icon, title, sub, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; sub: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title}>
      <Card>
        <Row style={{ gap: spacing.md }}>
          <Ionicons name={icon} size={22} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, ...type.body, fontWeight: '700' }}>{title}</Text>
            <Text style={{ color: colors.textMuted, ...type.small, marginTop: spacing.xxs }}>{sub}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
        </Row>
      </Card>
    </Pressable>
  );
}
