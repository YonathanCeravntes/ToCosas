import { Platform, type TextStyle } from 'react-native';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

/**
 * FIN-060 · Letra Inter (la de Revolut) con cifras tabulares.
 *
 * Con una fuente propia, Android no elige la variante por `fontWeight`: hay que
 * nombrar la familia exacta. El peso se baja un escalón para un aspecto más sobrio
 * (800 → Bold, 700 → SemiBold). Los archivos viajan por OTA; `expo-font` ya está
 * en la APK (BT-041).
 */
export const interFonts = { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold };

const FAMILY: Record<string, string> = {
  '100': 'Inter_400Regular',
  '200': 'Inter_400Regular',
  '300': 'Inter_400Regular',
  '400': 'Inter_400Regular',
  normal: 'Inter_400Regular',
  '500': 'Inter_500Medium',
  '600': 'Inter_600SemiBold',
  '700': 'Inter_600SemiBold',
  bold: 'Inter_600SemiBold',
  '800': 'Inter_700Bold',
  '900': 'Inter_700Bold',
};

let ready = false;
/** Lo marca App cuando las fuentes cargaron; antes se usa la del sistema. */
export function setFontsReady(v: boolean) {
  ready = v;
}

/**
 * Estilo de fuente para un texto. `inherit`: el texto va anidado y no fijó peso,
 * así que hereda la familia del padre (no se toca).
 */
export function fontFor(style: TextStyle | undefined, inherit: boolean): TextStyle | null {
  if (!ready) return null;
  if (style?.fontFamily) return null;
  const w = style?.fontWeight;
  if (inherit && w == null) return null;
  const family = FAMILY[String(w ?? '400')] ?? 'Inter_400Regular';
  // En web la familia ya trae el peso; en nativo, fontWeight con fuente propia
  // produce negrita sintética, así que se neutraliza.
  return { fontFamily: family, fontWeight: Platform.OS === 'web' ? undefined : 'normal' };
}
