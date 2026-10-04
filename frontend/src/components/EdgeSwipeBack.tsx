import React, { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NavigationContainerRefWithCurrent, NavigationState, PartialState } from '@react-navigation/native';
import { colors } from '../theme/colors';

/**
 * BT-042 · Volver atrás deslizando desde el borde izquierdo en la app web instalada
 * del iPhone (modo "standalone"), donde iOS no ofrece ese gesto. En Safari normal el
 * navegador ya tiene el suyo y en Android lo da el sistema, así que aquí no se activa.
 *
 * Solo retrocede si hay una pantalla apilada a la cual volver (nunca cambia de pestaña).
 */
const EDGE = 24; // px desde el borde donde debe empezar el dedo
const TRIGGER = 80; // px horizontales para confirmar
const SIZE = 40;

type AnyState = NavigationState | PartialState<NavigationState> | undefined;

function canPopStack(state: AnyState): boolean {
  let s: AnyState = state;
  let found = false;
  while (s) {
    if (s.type === 'stack' && (s.index ?? 0) > 0) found = true;
    const route = s.routes?.[s.index ?? 0] as { state?: AnyState } | undefined;
    s = route?.state;
  }
  return found;
}

function isStandaloneWeb(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || !!window.matchMedia?.('(display-mode: standalone)').matches;
}

export function EdgeSwipeBack({ navRef }: { navRef: NavigationContainerRefWithCurrent<ReactNavigation.RootParamList> }) {
  const [dx, setDx] = useState<number | null>(null);
  const [y, setY] = useState(0);
  const start = useRef<{ x: number; y: number; active: boolean } | null>(null);

  useEffect(() => {
    if (!isStandaloneWeb()) return;
    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t || e.touches.length > 1 || t.clientX > EDGE || !navRef.isReady() || !canPopStack(navRef.getRootState())) {
        start.current = null;
        return;
      }
      start.current = { x: t.clientX, y: t.clientY, active: false };
      setY(t.clientY);
    };
    const onMove = (e: TouchEvent) => {
      const s = start.current;
      const t = e.touches[0];
      if (!s || !t) return;
      const mx = t.clientX - s.x;
      const my = Math.abs(t.clientY - s.y);
      if (!s.active) {
        if (my > 30 && my > mx) {
          start.current = null; // es un desplazamiento vertical, no un "atrás"
          setDx(null);
          return;
        }
        if (mx > 10) s.active = true;
      }
      if (s.active) setDx(Math.max(0, mx));
    };
    const onEnd = (e: TouchEvent) => {
      const s = start.current;
      start.current = null;
      setDx(null);
      if (!s?.active) return;
      const t = e.changedTouches[0];
      if (t && t.clientX - s.x >= TRIGGER && navRef.isReady() && navRef.canGoBack()) navRef.goBack();
    };
    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('touchend', onEnd, { passive: true });
    document.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', onEnd);
    };
  }, [navRef]);

  if (dx == null) return null;
  const p = Math.min(1, dx / TRIGGER);
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: Math.min(dx, TRIGGER) * 0.6 - SIZE / 2,
        top: y - SIZE / 2,
        width: SIZE,
        height: SIZE,
        borderRadius: SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: p >= 1 ? colors.primary : colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        opacity: 0.4 + p * 0.6,
      }}
    >
      <Ionicons name="chevron-back" size={22} color={p >= 1 ? colors.textInverse : colors.text} />
    </View>
  );
}
