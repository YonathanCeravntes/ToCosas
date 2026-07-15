// Shim de expo-sqlite SOLO para plataforma web (ver metro.config.js).
// La caché offline (SQLite) es una capacidad nativa; en web las llamadas
// fallan de forma controlada y la app usa siempre el backend directamente.
// No afecta el bundle de Android/iOS.
const unavailable = () => {
  throw new Error('SQLite no disponible en web');
};

module.exports = {
  openDatabaseAsync: async () => unavailable(),
  openDatabaseSync: unavailable,
  deleteDatabaseAsync: async () => unavailable(),
};
