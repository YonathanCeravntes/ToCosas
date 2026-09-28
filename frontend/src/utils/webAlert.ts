import { Alert, AlertButton, Platform } from 'react-native';

/**
 * BT-020 · En web, `Alert.alert` de react-native-web NO muestra nada: tocar "Anular",
 * "Pagar todo", menús de acciones… no hacía nada en la versión web (FIN-041). Este
 * parche, solo en web, traduce los diálogos al navegador:
 *  - sin botones o uno solo → `window.alert` y luego su acción;
 *  - "Cancelar" + una acción → `window.confirm`;
 *  - varias acciones → se pregunta por cada una en orden hasta que el usuario acepte.
 * En Android/iOS no cambia nada. Se instala una vez al arrancar (index.ts).
 */
export function installWebAlert(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const run = (b?: AlertButton) => setTimeout(() => b?.onPress?.(), 0);
  Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    const actions = (buttons ?? []).filter((b) => b.style !== 'cancel');
    if (actions.length === 0) {
      window.alert(text);
      return;
    }
    if (!buttons || buttons.length === 1) {
      window.alert(text);
      run(actions[0]);
      return;
    }
    if (actions.length === 1) {
      if (window.confirm(`${text}\n\n(${actions[0].text ?? 'Aceptar'})`)) run(actions[0]);
      return;
    }
    for (const b of actions) {
      if (window.confirm(`${text}\n\n¿${b.text}?`)) {
        run(b);
        return;
      }
    }
  };
}
