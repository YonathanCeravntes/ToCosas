import React from 'react';
import { Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { colors, spacing } from '../theme/colors';

type Props = {
  value: Date;
  mode?: 'date';
  maximumDate?: Date;
  onChange: (event: DateTimePickerEvent, date?: Date) => void;
};

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** 'YYYY-MM-DD' del <input type="date"> → Date local (evita el corrimiento UTC). */
const fromISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
};

/**
 * Selector de fecha con la MISMA firma que `@react-native-community/datetimepicker`
 * (FIN-041 web): en Android/iOS delega al selector nativo; en web ese módulo no está
 * implementado, así que se usa el `<input type="date">` del navegador (en iPhone abre
 * la rueda de fecha de Safari). Emite un evento `set` para que los llamadores no cambien.
 */
export function DatePicker({ value, maximumDate, onChange }: Props) {
  if (Platform.OS === 'web') {
    return React.createElement('input', {
      type: 'date',
      value: toISO(value),
      max: maximumDate ? toISO(maximumDate) : undefined,
      autoFocus: true,
      onChange: (e: { target: { value: string } }) => {
        if (!e.target.value) return;
        onChange({ type: 'set', nativeEvent: { timestamp: Date.now(), utcOffset: 0 } } as DateTimePickerEvent, fromISO(e.target.value));
      },
      style: {
        fontSize: 16,
        padding: `${spacing.sm}px ${spacing.md}px`,
        marginBottom: spacing.md,
        borderRadius: 10,
        border: `1px solid ${colors.border}`,
        accentColor: colors.primary,
        backgroundColor: colors.surface,
        color: colors.text,
        fontFamily: 'inherit',
      },
    });
  }
  // FIN-060: acento esmeralda de la paleta en el selector nativo (iOS lo respeta; Android usa el tema).
  return <DateTimePicker value={value} mode="date" maximumDate={maximumDate} onChange={onChange} accentColor={colors.primary} />;
}
