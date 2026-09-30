import { colors } from '../theme/colors';

/**
 * Header neutro compartido por todos los navegadores (FIN-038): superficie clara,
 * título oscuro, sin sombra pesada. El color primario queda reservado para el hero
 * de cada pantalla y el botón central de Registrar.
 */
export const headerOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.text,
  headerTitleStyle: { fontWeight: '700' as const, color: colors.text },
  headerShadowVisible: false,
};
