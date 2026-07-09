// Shim de expo-secure-store SOLO para plataforma web (ver metro.config.js).
// En web (entorno de captura/preview) los tokens viven en localStorage; el
// almacenamiento seguro real (Keychain/Keystore) es del bundle nativo, que
// no cambia.
module.exports = {
  getItemAsync: async (key) => window.localStorage.getItem(key),
  setItemAsync: async (key, value) => {
    window.localStorage.setItem(key, value);
  },
  deleteItemAsync: async (key) => {
    window.localStorage.removeItem(key);
  },
};
