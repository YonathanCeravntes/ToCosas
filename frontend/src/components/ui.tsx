import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewProps,
} from 'react-native';
import { colors, radius, spacing } from '../theme/colors';

export function Card({ style, children, ...rest }: ViewProps) {
  return (
    <View style={[styles.card, style]} {...rest}>
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
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}) {
  const bg =
    variant === 'primary'
      ? colors.primary
      : variant === 'danger'
        ? colors.danger
        : colors.surface;
  const fg = variant === 'secondary' ? colors.primary : colors.textInverse;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        variant === 'secondary' && styles.buttonOutline,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  ...rest
}: TextInputProps & { label: string }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        {...rest}
      />
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

export function Row({ children, style, ...rest }: ViewProps) {
  return (
    <View style={[styles.row, style]} {...rest}>
      {children}
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
  button: {
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  buttonOutline: { borderWidth: 1, borderColor: colors.primary },
  buttonText: { fontSize: 16, fontWeight: '700' },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
});
