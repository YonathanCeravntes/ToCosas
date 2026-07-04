import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { devicesApi } from '../api/endpoints';

/**
 * Registro de notificaciones push (best-effort).
 *
 * Pide permisos, obtiene el Expo push token y lo registra en el backend. Si algo
 * falla (emulador, permisos denegados, Expo Go sin push remoto en Android),
 * simplemente no hace nada — nunca rompe el arranque de la app.
 *
 * Nota: el push remoto requiere un dev/production build; en Expo Go es limitado.
 */
export async function registerForPush(): Promise<void> {
  try {
    if (!Device.isDevice) return;

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Recordatorios',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const projectId =
      (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas
        ?.projectId ?? Constants.easConfig?.projectId;

    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const token = tokenResponse.data;
    if (!token) return;

    await devicesApi.register(
      token,
      Platform.OS,
      Constants.expoConfig?.version ?? undefined,
    );
  } catch {
    // Silencioso a propósito: el push es opcional y no debe bloquear la app.
  }
}
