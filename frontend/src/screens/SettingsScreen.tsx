import React, { useCallback, useState } from 'react';
import { Alert, Platform, Pressable, Share, Switch, View } from 'react-native';
import { Text } from '../components/AppText';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Field, FormScroll, Pill, Row } from '../components/ui';
import { colors, radius, spacing, touch, type } from '../theme/colors';
import { useAuthStore } from '../store/auth.store';
import { useTourStore } from '../store/tour.store';
import { appearancePref, writeAppearancePref } from '../theme/appearance';

/** Recarga la app para aplicar la apariencia (web: recarga la página). */
async function reloadApp() {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.location.reload();
    return;
  }
  try {
    await Updates.reloadAsync();
  } catch {
    Alert.alert('Apariencia', 'Cierra y vuelve a abrir Millo para ver el cambio.');
  }
}
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

  const setCycleDayTo = async (next: number) => {
    if (next === cycleDay) return;
    setCycleDay(next);
    await budgetApi.setCycleDay(next).catch(() => setMsg('No pude guardar el día de corte. Inténtalo de nuevo.'));
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
  const updateId = Updates.updateId ? Updates.updateId.slice(0, 8) : Platform.OS === 'web' ? `web ${(process.env.EXPO_PUBLIC_BUILD_ID ?? 'local').slice(0, 7)}` : 'apk';

  return (
    <FormScroll onRefresh={load}>
      <Card>
        <Text style={{ color: colors.textFaint, ...type.label }}>Cuenta</Text>
        <Text style={{ color: colors.text, ...type.title, marginTop: spacing.xxs }}>{user?.fullName ?? 'Usuario'}</Text>
        <Text style={{ color: colors.textMuted, ...type.small }}>{user?.email}</Text>
        {billing ? (
          <Row style={{ gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' }}>
            <Pill label={`Plan ${billing.plan === 'premium' ? 'Millo+' : 'gratis'}`} tone={billing.plan === 'premium' ? 'gold' : 'neutral'} />
            {billing.status === 'trial' && billing.until ? (
              <Text style={{ color: colors.textFaint, ...type.caption }}>prueba hasta {formatLocalDate(billing.until)}</Text>
            ) : null}
          </Row>
        ) : null}
      </Card>

      {/* FIN-027: perfil de ingresos — se configura una vez, Millo lo reutiliza (§32). */}
      <SettingLink icon="briefcase-outline" title="Mi perfil de ingresos" sub="Perfil laboral, fuentes y deducciones" onPress={() => navigation.navigate('IncomeProfile')} />

      {/* FIN-056 (BT-030): WhatsApp se muestra solo cuando Millo tenga número (hoy no lo hay). */}
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1, paddingRight: spacing.md }}>
            <Text style={{ color: colors.text, ...type.body, fontWeight: '600' }}>Telegram</Text>
            <Text style={{ color: colors.textFaint, ...type.small, marginTop: spacing.xxs }}>Registra movimientos y recibe alertas de cuotas.</Text>
          </View>
          <SmallButton title="Vincular" onPress={() => navigation.navigate('LinkTelegram')} />
        </Row>
      </Card>

      {/* FIN-056 (boceto 7): el día de corte se elige en una cuadrícula, no de a un toque. */}
      <Card>
        <Text style={{ color: colors.text, ...type.body, fontWeight: '600' }}>¿Qué día empieza tu mes?</Text>
        <Text style={{ color: colors.textFaint, ...type.small, marginTop: spacing.xxs, marginBottom: spacing.sm }}>
          Casi siempre es el día que te pagan. Mi mes e Inicio cuentan desde ahí; tu Score sigue el mes calendario.
        </Text>
        {/* FIN-060: cuadrícula de 7 columnas (4 semanas). */}
        <View style={{ gap: 6 }}>
          {[0, 1, 2, 3].map((week) => (
            <View key={week} style={{ flexDirection: 'row', gap: 6 }}>
              {Array.from({ length: 7 }, (_, i) => week * 7 + i + 1).map((day) => {
                const on = cycleDay === day;
                return (
                  <Pressable
                    key={day}
                    onPress={() => void setCycleDayTo(day)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={`Día ${day}`}
                    style={{ flex: 1, minHeight: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.primary : colors.surface, borderWidth: 1, borderColor: on ? colors.primary : colors.border }}
                  >
                    <Text style={{ color: on ? colors.textInverse : colors.text, ...type.body, fontWeight: on ? '600' : '400' }}>{day}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
        <Text style={{ color: colors.primary, ...type.small, fontWeight: '600', marginTop: spacing.sm }}>
          {cycleDay === 1 ? 'Tu mes va del 1 al último día del mes.' : `Tu mes va del ${cycleDay} al ${cycleDay - 1} del mes siguiente.`}
        </Text>
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1, paddingRight: spacing.md }}>
            <Text style={{ color: colors.text, ...type.body, fontWeight: '600' }}>Avisos proactivos</Text>
            <Text style={{ color: colors.textFaint, ...type.small, marginTop: spacing.xxs }}>Millo te avisa (máx. 1 al día) cuando detecta riesgos o logros.</Text>
          </View>
          {/* FIN-060: interruptor en vez de botón Activar/Desactivar (misma acción). */}
          <Switch
            value={proactive !== false}
            onValueChange={() => void toggleProactive()}
            accessibilityLabel="Avisos proactivos"
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.surface}
            ios_backgroundColor={colors.border}
          />
        </Row>
      </Card>

      <Card>
        <Text style={{ color: colors.text, ...type.body, fontWeight: '600' }}>Inteligencia artificial</Text>
        {aiAccepted === null ? null : (
          <View style={{ marginTop: spacing.xs, marginBottom: spacing.xs }}>
            <Pill label={aiAccepted ? 'Activa' : 'Inactiva'} tone={aiAccepted ? 'ok' : 'neutral'} />
          </View>
        )}
        <Text style={{ color: colors.textMuted, ...type.small, marginTop: spacing.xxs }}>
          {aiAccepted === null
            ? 'Estado no disponible.'
            : aiAccepted
              ? 'Tus datos viajan resumidos (sin nombre ni cuentas) a Google Gemini para responderte. Puedes quitar el permiso cuando quieras.'
              : 'El Copiloto responde en modo básico. Actívala desde el Copiloto.'}
        </Text>
        {aiAccepted ? <Button title="Quitar el permiso de IA" variant="secondary" onPress={() => void revokeAi()} /> : null}
        <Button title="Borrar historial del Copiloto" variant="secondary" onPress={deleteHistory} />
      </Card>

      {/* FIN-039 · Privacidad y datos: consentimiento, portabilidad, supresión. */}
      <Card>
        <Row style={{ gap: spacing.sm, marginBottom: spacing.xs }}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
          <Text style={{ color: colors.text, ...type.body, fontWeight: '600' }}>Privacidad y tus datos</Text>
        </Row>
        <Text style={{ color: colors.textMuted, ...type.small }}>{DATA_POLICY_SHORT}</Text>
        {user?.dataConsentAt ? (
          <Text style={{ color: colors.textFaint, ...type.caption, marginTop: spacing.xs }}>
            Aceptaste la política el {formatLocalDate(user.dataConsentAt)}.
          </Text>
        ) : (
          <Button title="Aceptar la política de datos" onPress={() => void acceptPolicy()} loading={busy} />
        )}
        <Button title="Descargar mis datos" variant="secondary" icon="download-outline" onPress={() => void exportData()} loading={busy} />
        {!deleting ? (
          <Pressable
            onPress={() => setDeleting(true)}
            accessibilityRole="button"
            accessibilityLabel="Eliminar mi cuenta"
            style={({ pressed }) => ({ minHeight: touch.min, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xs, opacity: pressed ? 0.6 : 1 })}
          >
            <Text style={{ color: colors.danger, ...type.body, fontWeight: '600' }}>Eliminar mi cuenta</Text>
          </Pressable>
        ) : (
          <View style={{ marginTop: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.dangerSoft }}>
            <Text style={{ color: colors.text, ...type.small, marginBottom: spacing.sm }}>
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

      {/* FIN-060: apariencia. Se aplica recargando la app (los estilos nacen con la paleta). */}
      <Card>
        <Text style={{ ...type.body, fontWeight: '600', color: colors.text }}>Apariencia</Text>
        <Text style={{ ...type.small, color: colors.textFaint, marginTop: 2, marginBottom: spacing.sm }}>
          Automático sigue el modo claro u oscuro de tu teléfono.
        </Text>
        <View style={{ flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 3, gap: 3 }}>
          {(
            [
              ['system', 'Automático'],
              ['light', 'Claro'],
              ['dark', 'Oscuro'],
            ] as const
          ).map(([value, label]) => {
            const on = appearancePref === value;
            return (
              <Pressable
                key={value}
                onPress={() => {
                  if (on) return;
                  writeAppearancePref(value);
                  void reloadApp();
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.sm, backgroundColor: on ? colors.surface : 'transparent' }}
              >
                <Text style={{ ...type.small, fontWeight: '600', color: on ? colors.text : colors.textMuted }}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {/* FIN-060: volver a ver el recorrido de bienvenida (va a Inicio y lo abre). */}
      <Pressable
        onPress={() => {
          navigation.navigate('Main', { screen: 'Dashboard' });
          setTimeout(() => useTourStore.getState().start(), 400);
        }}
        accessibilityRole="button"
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="compass-outline" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ ...type.body, fontWeight: '600', color: colors.text }}>Ver el recorrido otra vez</Text>
            <Text style={{ ...type.small, color: colors.textFaint }}>Repasa en un minuto dónde está cada cosa</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
        </Card>
      </Pressable>

      {/* FIN-060: "Cerrar sesión" en contorno rojo; el único botón lleno rojo es "Eliminar definitivamente". */}
      <Pressable
        onPress={() => void logout({ wipeLocal: true })}
        accessibilityRole="button"
        accessibilityLabel="Cerrar sesión"
        style={({ pressed }) => ({
          marginTop: spacing.lg,
          minHeight: touch.min,
          paddingVertical: 14,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.danger,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Text style={{ color: colors.danger, ...type.bodyLg, fontWeight: '600' }}>Cerrar sesión</Text>
      </Pressable>

      <Text style={{ color: colors.textFaint, ...type.caption, textAlign: 'center', marginTop: spacing.xl }}>
        Millo v{version} · actualización {updateId}
      </Text>
    </FormScroll>
  );
}

/** FIN-060: botón compacto en contorno verde para filas (p. ej. "Vincular"). */
function SmallButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      hitSlop={6}
      style={({ pressed }) => ({
        minHeight: 36,
        paddingHorizontal: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.primary,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ color: colors.primary, ...type.small, fontWeight: '600' }}>{title}</Text>
    </Pressable>
  );
}

function SettingLink({ icon, title, sub, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; sub: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title}>
      <Card>
        <Row style={{ gap: spacing.md }}>
          <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={icon} size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, ...type.body, fontWeight: '600' }}>{title}</Text>
            <Text style={{ color: colors.textFaint, ...type.small, marginTop: spacing.xxs }}>{sub}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
        </Row>
      </Card>
    </Pressable>
  );
}
