import React, { useCallback, useEffect, useState } from 'react';
import { AppState, Platform, Pressable, View } from 'react-native';
import { Text } from './AppText';
import * as Updates from 'expo-updates';
import { colors, radius, spacing, type } from '../theme/colors';

const CURRENT = process.env.EXPO_PUBLIC_BUILD_ID ?? '';
const CHECK_EVERY_MS = 10 * 60_000;

/**
 * Aviso de versión nueva, en los dos mundos (FIN-056, pedido del Fundador 2026-09-30:
 * "que les salga como noción de verla actualizada… y no que tenga que abrir y cerrar la
 * app cinco o seis veces").
 *
 * - App instalada (OTA): expo-updates descarga la versión nueva al arrancar pero solo la
 *   aplica en el SIGUIENTE arranque; si la app queda en segundo plano, nunca. Aquí se
 *   revisa al abrir, al volver del segundo plano y cada 10 minutos; si hay una nueva, se
 *   descarga y se ofrece "Actualizar" (recarga al instante, sin cerrar la app).
 * - Web/PWA (BT-022): la página queda en caché; se consulta `version.json` y, si el
 *   código publicado es otro, se ofrece recargar.
 */
export function UpdateBanner() {
  const [ready, setReady] = useState<'web' | 'ota' | null>(null);
  const [busy, setBusy] = useState(false);

  const checkNative = useCallback(async () => {
    if (Platform.OS === 'web' || __DEV__ || !Updates.isEnabled) return;
    try {
      const r = await Updates.checkForUpdateAsync();
      if (r.isAvailable) {
        const f = await Updates.fetchUpdateAsync();
        if (f.isNew) setReady('ota');
      }
    } catch {
      /* sin conexión o servidor de OTA ocupado: se revisa la próxima vez */
    }
  }, []);

  const checkWeb = useCallback(async () => {
    if (Platform.OS !== 'web' || !CURRENT || typeof window === 'undefined') return;
    try {
      const base = window.location.pathname.startsWith('/ToCosas') ? '/ToCosas' : '';
      const res = await fetch(`${base}/version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const v = (await res.json()) as { build?: string };
      if (v.build && v.build !== CURRENT) setReady('web');
    } catch {
      /* sin conexión: se revisa la próxima vez */
    }
  }, []);

  useEffect(() => {
    const check = () => {
      void checkNative();
      void checkWeb();
    };
    check();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') check();
    });
    const id = setInterval(check, CHECK_EVERY_MS);
    return () => {
      sub.remove();
      clearInterval(id);
    };
  }, [checkNative, checkWeb]);

  const apply = async () => {
    setBusy(true);
    try {
      if (ready === 'web') window.location.reload();
      else await Updates.reloadAsync();
    } catch {
      setBusy(false);
    }
  };

  if (!ready) return null;
  return (
    <View style={{ position: 'absolute', left: spacing.md, right: spacing.md, bottom: 96, zIndex: 50 }}>
      <Pressable
        onPress={() => void apply()}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel="Hay una versión nueva de Millo. Actualizar"
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm,
          backgroundColor: colors.primaryDark, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: spacing.md,
          opacity: busy ? 0.7 : 1,
        }}
      >
        <Text style={{ color: colors.textInverse, ...type.body, fontWeight: '600', flex: 1 }}>Hay una versión nueva de Millo</Text>
        <Text style={{ color: colors.textInverse, ...type.body, fontWeight: '700', textDecorationLine: 'underline' }}>{busy ? 'Actualizando…' : 'Actualizar'}</Text>
      </Pressable>
    </View>
  );
}
