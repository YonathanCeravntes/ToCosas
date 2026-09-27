import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  ScrollViewProps,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, touch, type } from '../theme/colors';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function Card({ style, children, ...rest }: ViewProps) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

/** Tarjeta protagonista (el único bloque de color primario por pantalla). */
export function HeroCard({ style, children, ...rest }: ViewProps) {
  return (
    <View style={[styles.card, styles.hero, style]} {...rest}>
      {children}
    </View>
  );
}

export function Button({
  title,
  onPress,
  loading,
  variant = 'primary',
  disabled,
  icon,
  accessibilityLabel,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  icon?: IconName;
  accessibilityLabel?: string;
}) {
  const bg =
    variant === 'primary'
      ? colors.primary
      : variant === 'danger'
        ? colors.danger
        : variant === 'ghost'
          ? 'transparent'
          : colors.surface;
  const fg = variant === 'secondary' || variant === 'ghost' ? colors.primary : colors.textInverse;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!disabled || !!loading, busy: !!loading }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        variant === 'secondary' && styles.buttonOutline,
        variant === 'ghost' && { marginTop: 0, paddingVertical: spacing.sm },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Row style={{ gap: spacing.sm }}>
          {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
          <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
        </Row>
      )}
    </Pressable>
  );
}

/** Botón de solo ícono con área táctil y etiqueta accesible obligatorias. */
export function IconButton({
  icon,
  onPress,
  label,
  color = colors.textMuted,
  size = 20,
  disabled,
  style,
}: {
  icon: IconName;
  onPress: () => void;
  /** Lo que lee el lector de pantalla — obligatorio. */
  label: string;
  color?: string;
  size?: number;
  disabled?: boolean;
  style?: ViewProps['style'];
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [
        { minWidth: touch.min, minHeight: touch.min, alignItems: 'center', justifyContent: 'center', opacity: pressed || disabled ? 0.6 : 1 },
        style,
      ]}
    >
      <Ionicons name={icon} size={size} color={color} />
    </Pressable>
  );
}

export function Field({ label, hint, ...rest }: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textFaint}
        accessibilityLabel={label}
        style={styles.input}
        {...rest}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Screen({ children, style, ...rest }: ViewProps) {
  return (
    <View style={[styles.screen, style]} {...rest}>
      {children}
    </View>
  );
}

/**
 * Cuánto tapa el teclado a la vista que recibe `ref` y `onLayout`. Con
 * edge-to-edge (SDK 54) Android ya no redimensiona la ventana, así que hay que
 * apartarse a mano. Se mide contra la posición REAL de la vista (y se vuelve a
 * medir si cambia de tamaño): si el sistema sí redimensionó, el solape es 0 y no
 * hay doble desplazamiento.
 */
export function useKeyboardInset() {
  const ref = useRef<View>(null);
  const keyboardTop = useRef<number | null>(null);
  const [inset, setInset] = useState(0);
  const measure = useCallback(() => {
    const top = keyboardTop.current;
    if (top === null) return setInset(0);
    ref.current?.measureInWindow((_x, y, _w, h) => setInset(Math.max(0, Math.round(y + h - top))));
  }, []);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, (e) => {
      keyboardTop.current = e.endCoordinates.screenY;
      measure();
    });
    const hide = Keyboard.addListener(hideEvt, () => {
      keyboardTop.current = null;
      setInset(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [measure]);
  return { ref, inset, onLayout: measure };
}

/**
 * Contenedor de pantalla con scroll: el teclado nunca tapa el campo ni el botón,
 * el primer toque en un botón funciona con el teclado abierto, y `onRefresh`
 * activa "deslizar hacia abajo para actualizar".
 */
export function FormScroll({
  onRefresh,
  contentContainerStyle,
  style,
  children,
  ...rest
}: ScrollViewProps & { onRefresh?: () => unknown }) {
  const { ref, inset, onLayout } = useKeyboardInset();
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);
  return (
    <View ref={ref} onLayout={onLayout} style={{ flex: 1, backgroundColor: colors.bg, paddingBottom: inset }}>
      <ScrollView
        style={[{ flex: 1, backgroundColor: colors.bg }, style]}
        contentContainerStyle={[{ padding: spacing.md }, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refresh()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          ) : undefined
        }
        {...rest}
      >
        {children}
      </ScrollView>
    </View>
  );
}

export function Row({ children, style, ...rest }: ViewProps) {
  return (
    <View style={[styles.row, style]} {...rest}>
      {children}
    </View>
  );
}

/** Título de sección con acción opcional a la derecha. */
/**
 * Ícono en línea dentro de un `<Text>` (DEC-0040 §7: cero emojis en la interfaz — cada
 * fabricante los pinta distinto). Hereda tamaño de texto por defecto; el color se pasa
 * explícito cuando el texto no es `colors.text` (enlaces, tarjetas verdes).
 */
export function Ico({ name, color = colors.text, size = 14 }: { name: IconName; color?: string; size?: number }) {
  return <Ionicons name={name} size={size} color={color} />;
}

export function SectionHeader({
  title,
  icon,
  action,
  onAction,
}: {
  title: string;
  icon?: IconName;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <Row style={{ justifyContent: 'space-between', marginTop: spacing.sm, marginBottom: spacing.sm }}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {icon ? <Ico name={icon} size={15} color={colors.textMuted} /> : null}
        {icon ? ' ' : ''}
        {title}
      </Text>
      {action && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="link" hitSlop={8}>
          <Text style={styles.link}>{action}</Text>
        </Pressable>
      ) : null}
    </Row>
  );
}

/** Enlace de texto con flecha (reemplaza los "→" sueltos). */
export function LinkRow({ title, onPress, color = colors.primary }: { title: string; onPress: () => void; color?: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link" hitSlop={6} style={{ paddingVertical: spacing.xs }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={[styles.link, { color, flex: 1 }]}>{title}</Text>
        <Ionicons name="chevron-forward" size={16} color={color} />
      </Row>
    </Pressable>
  );
}

/** Chip seleccionable (reemplaza los Pressable ad hoc con fondo primario). */
export function Chip({
  label,
  active,
  onPress,
  icon,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  icon?: IconName;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={[styles.chip, active && { backgroundColor: colors.primary, borderColor: colors.primary }]}
    >
      {icon ? <Ionicons name={icon} size={14} color={active ? colors.textInverse : colors.text} /> : null}
      <Text style={{ color: active ? colors.textInverse : colors.text, ...type.small }}>{label}</Text>
    </Pressable>
  );
}

/** Estado vacío con acción — nunca un texto gris mudo. */
export function EmptyState({
  icon = 'leaf-outline',
  title,
  body,
  actionTitle,
  onAction,
}: {
  icon?: IconName;
  title: string;
  body?: string;
  actionTitle?: string;
  onAction?: () => void;
}) {
  return (
    <Card style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
      <Ionicons name={icon} size={32} color={colors.primary} />
      <Text style={[styles.sectionTitle, { textAlign: 'center', marginTop: spacing.sm }]}>{title}</Text>
      {body ? <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs, ...type.body }}>{body}</Text> : null}
      {actionTitle && onAction ? (
        <View style={{ alignSelf: 'stretch', marginTop: spacing.sm }}>
          <Button title={actionTitle} onPress={onAction} />
        </View>
      ) : null}
    </Card>
  );
}

/** Error visible con reintento (reemplaza el "Cargando…" eterno). */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card style={{ borderColor: colors.danger, backgroundColor: colors.dangerSoft }} accessibilityRole="alert">
      <Row style={{ gap: spacing.sm }}>
        <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
        <Text style={{ color: colors.text, flex: 1, ...type.body }}>{message}</Text>
      </Row>
      {onRetry ? <Button title="Reintentar" variant="secondary" onPress={onRetry} /> : null}
    </Card>
  );
}

/** Esqueleto de carga: bloques que respiran en vez de texto "Cargando…". */
export function Skeleton({ lines = 3, hero }: { lines?: number; hero?: boolean }) {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <Card style={hero ? { backgroundColor: colors.primary, borderColor: colors.primary } : undefined} accessibilityLabel="Cargando">
      {Array.from({ length: lines }).map((_, i) => (
        <Animated.View
          key={i}
          style={{
            height: i === 0 && hero ? 34 : 14,
            width: i === 0 ? '60%' : i % 2 ? '85%' : '45%',
            borderRadius: radius.sm,
            marginBottom: spacing.sm,
            backgroundColor: hero ? colors.onPrimaryTrack : colors.surfaceAlt,
            opacity: pulse,
          }}
        />
      ))}
    </Card>
  );
}

/** Barra de progreso simple (0–1). */
export function ProgressBar({
  value,
  color = colors.primary,
  track = colors.border,
  height = 8,
  label,
}: {
  value: number;
  color?: string;
  track?: string;
  height?: number;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      style={{ height, borderRadius: height / 2, backgroundColor: track, overflow: 'hidden' }}
    >
      <View style={{ height, width: `${Math.max(pct * 100, pct > 0 ? 3 : 0)}%`, backgroundColor: color, borderRadius: height / 2 }} />
    </View>
  );
}

/**
 * Mini gráfica de barras (sin SVG — OTA-safe): una barra por punto, la última
 * resaltada. Suficiente para "evolución" sin prometer precisión de eje.
 */
export function Sparkline({
  values,
  height = 40,
  color = colors.primary,
  faded = colors.border,
  label,
}: {
  values: number[];
  height?: number;
  color?: string;
  faded?: string;
  label?: string;
}) {
  if (values.length === 0) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  return (
    <Row accessibilityLabel={label} style={{ height, alignItems: 'flex-end', gap: 3 }}>
      {values.map((v, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: Math.max(3, ((v - min) / span) * height),
            borderRadius: 2,
            backgroundColor: i === values.length - 1 ? color : faded,
          }}
        />
      ))}
    </Row>
  );
}

// --- Toast con cuenta regresiva (SPRINT-PULIDO-001 P2: contexto del Deshacer) ---

export interface ToastSpec {
  message: string;
  /** Acción opcional (p. ej. "Deshacer"); desaparece al expirar. */
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
  /** Segundos visibles. */
  seconds?: number;
  tone?: 'success' | 'info' | 'warning';
}

/**
 * Aviso flotante con barra de tiempo. Vive dentro de la pantalla que lo dispara
 * (no hay proveedor global para no tocar la navegación): `const [toast, setToast]
 * = useState<ToastSpec | null>(null)` + `<Toast spec={toast} onHide={() => setToast(null)} />`.
 */
export function Toast({ spec, onHide }: { spec: ToastSpec | null; onHide: () => void }) {
  const total = spec?.seconds ?? 8;
  const [left, setLeft] = useState(total);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!spec) return;
    setLeft(total);
    const started = Date.now();
    const id = setInterval(() => {
      const remaining = total - (Date.now() - started) / 1000;
      if (remaining <= 0) {
        clearInterval(id);
        onHide();
      } else {
        setLeft(remaining);
      }
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec]);

  if (!spec) return null;
  const tone = spec.tone ?? 'success';
  const bg = tone === 'warning' ? colors.warningSoft : tone === 'info' ? colors.infoSoft : colors.successSoft;
  const fg = tone === 'warning' ? colors.warning : tone === 'info' ? colors.info : colors.primaryDark;

  const act = async () => {
    if (!spec.onAction || busy) return;
    setBusy(true);
    try {
      await spec.onAction();
    } finally {
      setBusy(false);
      onHide();
    }
  };

  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        position: 'absolute',
        left: spacing.md,
        right: spacing.md,
        bottom: spacing.md,
        backgroundColor: bg,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: fg,
        padding: spacing.md,
        overflow: 'hidden',
      }}
    >
      <Row style={{ gap: spacing.sm }}>
        <Text style={{ color: colors.text, flex: 1, ...type.body }}>{spec.message}</Text>
        {spec.actionLabel && spec.onAction ? (
          <Pressable onPress={() => void act()} disabled={busy} accessibilityRole="button" hitSlop={8}>
            <Text style={{ color: fg, fontWeight: '800', ...type.body }}>
              {busy ? '…' : `${spec.actionLabel} · ${Math.ceil(left)}s`}
            </Text>
          </Pressable>
        ) : null}
      </Row>
      <View style={{ position: 'absolute', left: 0, bottom: 0, height: 3, width: `${(left / total) * 100}%`, backgroundColor: fg }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hero: { backgroundColor: colors.primary, borderColor: colors.primary },
  button: {
    borderRadius: radius.md,
    paddingVertical: 14,
    minHeight: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  buttonOutline: { borderWidth: 1, borderColor: colors.primary },
  buttonText: { ...type.bodyLg, fontWeight: '700' },
  label: { ...type.small, fontWeight: '600', color: colors.textMuted, marginBottom: 6 },
  hint: { ...type.caption, color: colors.textFaint, marginTop: spacing.xs },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    minHeight: touch.min,
    ...type.bodyLg,
    color: colors.text,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { ...type.title, color: colors.text },
  link: { ...type.body, fontWeight: '700', color: colors.primary },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 36,
  },
});
