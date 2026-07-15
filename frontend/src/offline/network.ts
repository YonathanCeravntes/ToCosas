import * as Network from 'expo-network';

/** ¿Hay conexión a internet utilizable ahora mismo? */
export async function isOnline(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    return Boolean(state.isConnected && state.isInternetReachable !== false);
  } catch {
    return false;
  }
}
