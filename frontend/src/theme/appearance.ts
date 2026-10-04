import { Appearance, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * FIN-060 · Modo oscuro. La preferencia ('system' | 'light' | 'dark') se lee de forma
 * SÍNCRONA al arrancar, antes de que cualquier pantalla cree sus estilos: así toda la
 * app nace con la paleta correcta sin reescribir cada StyleSheet. Cambiarla en Ajustes
 * recarga la app; si el sistema cambia de tema con la app abierta, se aplica al volver
 * a abrirla.
 */
export type AppearancePref = 'system' | 'light' | 'dark';
const KEY = 'millo.pref.appearance';

export function readAppearancePref(): AppearancePref {
  try {
    const v =
      Platform.OS === 'web'
        ? typeof localStorage === 'undefined'
          ? null
          : localStorage.getItem(KEY)
        : SecureStore.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function writeAppearancePref(v: AppearancePref): void {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, v);
      return;
    }
    SecureStore.setItem(KEY, v);
  } catch {
    /* opcional */
  }
}

function systemScheme(): 'light' | 'dark' {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export const appearancePref: AppearancePref = readAppearancePref();
export const isDark: boolean = appearancePref === 'system' ? systemScheme() === 'dark' : appearancePref === 'dark';
