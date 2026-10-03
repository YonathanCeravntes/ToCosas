import React, { createContext, forwardRef, useContext } from 'react';
import {
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from 'react-native';
import { fontFor } from '../theme/fonts';

/**
 * FIN-060 · Texto de Millo: Inter con el peso correcto y cifras tabulares en toda
 * la app. Reemplaza a `Text`/`TextInput` de react-native (mismo API).
 */
const Nested = createContext(false);
const TABULAR: TextStyle = { fontVariant: ['tabular-nums'] };

export const Text = forwardRef<RNText, TextProps>(function Text({ style, children, ...rest }, ref) {
  const nested = useContext(Nested);
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  const font = fontFor(flat, nested);
  return (
    <RNText ref={ref} {...rest} style={[nested ? null : TABULAR, style, font]}>
      {nested ? children : <Nested.Provider value>{children}</Nested.Provider>}
    </RNText>
  );
});

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput({ style, ...rest }, ref) {
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  return <RNTextInput ref={ref} {...rest} style={[TABULAR, style, fontFor(flat, false)]} />;
});

export type { TextProps, TextInputProps };
/** Tipos de instancia (para `useRef<TextInput>`), igual que en react-native. */
export type Text = RNText;
export type TextInput = RNTextInput;
