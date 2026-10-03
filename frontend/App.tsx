import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { UpdateBanner } from './src/components/UpdateBanner';
import { interFonts, setFontsReady } from './src/theme/fonts';
import { TourOverlay } from './src/components/tour/TourOverlay';

export default function App() {
  // FIN-060: Inter se carga desde los archivos del bundle (instantáneo). Si algo
  // falla o tarda más de 2,5 s, la app abre igual con la letra del sistema.
  const [loaded, error] = useFonts(interFonts);
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 2500);
    return () => clearTimeout(t);
  }, []);
  setFontsReady(loaded && !error);
  if (!loaded && !error && !timedOut) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <RootNavigator />
      <UpdateBanner />
      <TourOverlay />
    </SafeAreaProvider>
  );
}
