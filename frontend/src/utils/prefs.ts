import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * FIN-056 · Preferencias pequeñas del dispositivo (p. ej. el último medio de pago), sin
 * dependencias nuevas: SecureStore en el teléfono (ya lo usa la sesión) y localStorage
 * en la web. Todo es opcional: si falla, la app sigue igual.
 */
const PREFIX = 'millo.pref.';

export async function getPref(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return typeof localStorage === 'undefined' ? null : localStorage.getItem(PREFIX + key);
    return await SecureStore.getItemAsync(PREFIX + key);
  } catch {
    return null;
  }
}

export async function setPref(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(PREFIX + key, value);
      return;
    }
    await SecureStore.setItemAsync(PREFIX + key, value);
  } catch {
    /* opcional */
  }
}
