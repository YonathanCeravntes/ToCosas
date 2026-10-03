import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../AppText';
import { useAuthStore } from '../../store/auth.store';
import { useTourStore } from '../../store/tour.store';
import { colors, radius, spacing, type } from '../../theme/colors';

/**
 * FIN-060 · Recorrido de bienvenida sobre la barra de pestañas real.
 *
 * Sin módulos nativos (viaja por OTA): el "hueco" de luz se arma con cuatro
 * rectángulos oscuros alrededor del destino. Los destinos son las 5 casillas de la
 * barra (misma geometría que MainTabs: alto 56 + margen inferior del sistema).
 * Evidencia (Chameleon): recorridos cortos se terminan mucho más; por eso 5 pasos,
 * "Saltar" siempre visible y contador.
 */
const STEPS = [
  { slot: 0, title: 'Tu mes de un vistazo', body: 'En Inicio ves cuánto te queda para gastar, en qué se te va la plata y tus próximos pagos.' },
  { slot: 2, title: 'Registra cada gasto aquí', body: 'Es lo más importante de Millo: con cada gasto, "Te queda" se ajusta solo. También puedes escribirle al bot de Telegram.' },
  { slot: 1, title: 'Tus deudas, bajo control', body: 'Cuánto debes, cuándo pagas y en qué fecha quedas libre. Toca una deuda para ver su plan.' },
  { slot: 3, title: 'Tu salud financiera', body: 'Un puntaje de 0 a 1.000 que te dice qué mejorar primero.' },
  { slot: 4, title: 'Todo lo demás vive aquí', body: 'Presupuesto, Copiloto, Mis documentos, Millo en pareja, Telegram y Ajustes.' },
];

const DIM = 'rgba(7,18,14,0.66)';
const BAR = 56;

export function TourOverlay() {
  const step = useTourStore((s) => s.step);
  const next = useTourStore((s) => s.next);
  const finish = useTourStore((s) => s.finish);
  const maybeAutoStart = useTourStore((s) => s.maybeAutoStart);
  const { tokens, user } = useAuthStore();
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const fade = useRef(new Animated.Value(0)).current;

  // Primera vez en la app principal (no durante el registro inicial).
  const inMain = !!tokens && !!user?.id && user.onboardingDone !== false;
  useEffect(() => {
    if (!inMain || !user?.id) return;
    const t = setTimeout(() => void maybeAutoStart(user.id), 1500);
    return () => clearTimeout(t);
  }, [inMain, user?.id, maybeAutoStart]);

  useEffect(() => {
    fade.setValue(0);
    if (step != null) Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [step, fade]);

  if (step == null || !inMain) return null;
  const s = STEPS[step];
  const slotW = W / 5;
  const barTop = H - insets.bottom - BAR;
  const isFab = s.slot === 2;
  const hole = isFab
    ? { x: W / 2 - 34, y: barTop - 22, w: 68, h: 68, r: 34 }
    : { x: slotW * s.slot + 4, y: barTop + 4, w: slotW - 8, h: BAR - 8, r: radius.md };
  const last = step === STEPS.length - 1;
  const close = () => finish(user?.id);

  return (
    <Modal transparent visible statusBarTranslucent animationType="none" onRequestClose={close}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: hole.y, backgroundColor: DIM }} />
        <View style={{ position: 'absolute', left: 0, right: 0, top: hole.y + hole.h, bottom: 0, backgroundColor: DIM }} />
        <View style={{ position: 'absolute', left: 0, width: hole.x, top: hole.y, height: hole.h, backgroundColor: DIM }} />
        <View style={{ position: 'absolute', left: hole.x + hole.w, right: 0, top: hole.y, height: hole.h, backgroundColor: DIM }} />
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: hole.x, top: hole.y, width: hole.w, height: hole.h, borderRadius: hole.r, borderWidth: 2, borderColor: colors.surface }}
        />
        <View
          accessibilityViewIsModal
          style={[styles.card, { bottom: insets.bottom + BAR + (isFab ? 40 : 18) }]}
        >
          <Text style={styles.count}>{`PASO ${step + 1} DE ${STEPS.length}`}</Text>
          <Text accessibilityRole="header" style={styles.title}>{s.title}</Text>
          <Text style={styles.body}>{s.body}</Text>
          <View style={styles.actions}>
            {!last ? (
              <Pressable onPress={close} accessibilityRole="button" hitSlop={10}>
                <Text style={styles.skip}>Saltar</Text>
              </Pressable>
            ) : <View />}
            <Pressable
              onPress={() => (last ? close() : next(STEPS.length))}
              accessibilityRole="button"
              style={({ pressed }) => [styles.next, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={styles.nextText}>{last ? 'Empezar' : 'Siguiente'}</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    maxWidth: 520,
    alignSelf: 'center',
  },
  count: { ...type.caption, fontWeight: '600', letterSpacing: 0.8, color: colors.textFaint },
  title: { ...type.title, color: colors.text, marginTop: 4 },
  body: { ...type.body, color: colors.textMuted, marginTop: 6 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md },
  skip: { ...type.body, fontWeight: '600', color: colors.textFaint },
  next: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 18, minHeight: 44, justifyContent: 'center' },
  nextText: { ...type.body, fontWeight: '600', color: colors.textInverse },
});
