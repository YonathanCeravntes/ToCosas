// Shim de expo-secure-store SOLO para plataforma web (ver metro.config.js).
// En web (entorno de captura/preview) los tokens viven en localStorage; el
// almacenamiento seguro real (Keychain/Keystore) es del bundle nativo, que
// no cambia.
// BT-023: en Safari (modo privado, app de pantalla de inicio con el almacenamiento
// bloqueado) localStorage puede lanzar error; sin datos guardados se muestra el ingreso
// en vez de romper el arranque.
module.exports = {
  getItemAsync: async (key) => {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  setItemAsync: async (key, value) => {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      /* almacenamiento no disponible: la sesión dura mientras la app esté abierta */
    }
  },
  deleteItemAsync: async (key) => {
    try {
      window.localStorage.removeItem(key);
    } catch (e) {
      /* nada que borrar */
    }
  },
};
