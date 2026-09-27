import { Alert } from 'react-native';

/**
 * Confirmación antes de borrar: con un solo toque en la papelera era demasiado
 * fácil eliminar algo sin querer. Si falla, se dice (nunca en silencio).
 */
export function confirmRemove(name: string, consequence: string, remove: () => Promise<unknown>) {
  Alert.alert('Eliminar', `¿Eliminar "${name}"? ${consequence}`, [
    { text: 'Cancelar', style: 'cancel' },
    {
      text: 'Eliminar',
      style: 'destructive',
      onPress: () =>
        void remove().catch((e: Error) => Alert.alert('No se pudo eliminar', e.message)),
    },
  ]);
}
