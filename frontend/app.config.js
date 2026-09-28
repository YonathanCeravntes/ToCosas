/**
 * Extiende app.json SIN tocarlo (app.json sigue siendo la fuente de verdad del APK y
 * del OTA, §40). Solo añade configuración de la versión web (FIN-041) cuando se compila
 * con `EXPO_WEB_BASE_URL`, p. ej. `/ToCosas` para GitHub Pages (la app vive bajo una
 * subcarpeta y los assets deben resolverse desde ahí). Sin esa variable, la config es
 * idéntica a app.json: el bundle nativo y el preflight OTA no cambian.
 */
module.exports = ({ config }) => {
  const baseUrl = process.env.EXPO_WEB_BASE_URL;
  if (!baseUrl) return config;
  return {
    ...config,
    experiments: { ...(config.experiments ?? {}), baseUrl },
  };
};
