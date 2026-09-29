import React, { useEffect, useState } from 'react';
import { AppState, Platform, Pressable, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme/colors';

const CURRENT = process.env.EXPO_PUBLIC_BUILD_ID ?? '';

/**
 * BT-022 · En la versión web (PWA en el iPhone) la página queda en caché y la persona
 * sigue viendo la versión vieja aunque GitHub ya publicó la nueva. Al abrir y al volver
 * a la app se consulta `version.json` (sin caché); si el código publicado es otro, se
 * ofrece "Actualizar" (recarga). En Android/iOS nativo no hace nada (allá es OTA).
 */
export function WebUpdateBanner() {
  const [latest, setLatest] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !CURRENT || typeof window === 'undefined') return;
    const check = async () => {
      try {
        const base = window.location.pathname.startsWith('/ToCosas') ? '/ToCosas' : '';
        const res = await fetch(`${base}/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const v = (await res.json()) as { build?: string };
        if (v.build && v.build !== CURRENT) setLatest(v.build);
      } catch {
        /* sin conexión: se revisa la próxima vez */
      }
    };
    void check();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void check();
    });
    const id = setInterval(() => void check(), 10 * 60_000);
    return () => {
      sub.remove();
      clearInterval(id);
    };
  }, []);

  if (!latest) return null;
  return (
    <View style={{ position: 'absolute', left: spacing.md, right: spacing.md, bottom: 96, zIndex: 50 }}>
      <Pressable
        onPress={() => window.location.reload()}
        accessibilityRole="button"
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm,
          backgroundColor: colors.primaryDark, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: spacing.md,
        }}
      >
        <Text style={{ color: colors.textInverse, fontWeight: '700', flex: 1 }}>Hay una versión nueva de Millo</Text>
        <Text style={{ color: colors.textInverse, fontWeight: '800', textDecorationLine: 'underline' }}>Actualizar</Text>
      </Pressable>
    </View>
  );
}
