import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

/**
 * BT-012 · Android edge-to-edge (Expo SDK 54): el contenido se dibuja DEBAJO de la
 * barra de botones del sistema (◁ ○ □). Toda pantalla que no esté cubierta por la
 * barra de pestañas debe reservar `insets.bottom`; la barra de pestañas lo hace por
 * su cuenta (`MainTabs`). Fuente única para no repetir el cálculo en cada pantalla.
 */
export function useBottomInset(): number {
  return useSafeAreaInsets().bottom;
}

/** `contentStyle` para pantallas de un stack nativo que NO llevan barra de pestañas. */
export function useStackContentStyle() {
  const bottom = useBottomInset();
  return { backgroundColor: colors.bg, paddingBottom: bottom };
}
