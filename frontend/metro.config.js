// Config estándar de Expo + ajustes SOLO para plataforma web (capturas/preview):
//  - assets .wasm resolubles (lo pide expo-sqlite web)
//  - expo-sqlite se reemplaza por un shim en web: su glue ESM usa import.meta,
//    que el script clásico del dev server no puede ejecutar. La caché offline es
//    una capacidad nativa; en web la app trabaja directo contra el backend.
// El bundle nativo (Android/iOS) no cambia: el shim solo aplica si platform==='web'.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('wasm');

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && (moduleName === 'expo-sqlite' || moduleName.startsWith('expo-sqlite/'))) {
    return {
      filePath: path.resolve(__dirname, 'web-shims/expo-sqlite.js'),
      type: 'sourceFile',
    };
  }
  if (platform === 'web' && (moduleName === 'expo-secure-store' || moduleName.startsWith('expo-secure-store/'))) {
    return {
      filePath: path.resolve(__dirname, 'web-shims/expo-secure-store.js'),
      type: 'sourceFile',
    };
  }
  // zustand v5 en web resuelve a su build ESM, que usa import.meta (el script
  // clásico del dev server no lo puede ejecutar). Se fuerza el build CJS.
  if (platform === 'web' && (moduleName === 'zustand' || moduleName.startsWith('zustand/'))) {
    const sub = moduleName === 'zustand' ? 'index' : moduleName.slice('zustand/'.length);
    return {
      filePath: path.resolve(__dirname, `node_modules/zustand/${sub}.js`),
      type: 'sourceFile',
    };
  }
  return (defaultResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
