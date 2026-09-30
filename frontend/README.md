# ToCosas — App móvil (React Native + Expo)

App multiplataforma (Android + iOS) de ToCosas. Consume el [backend NestJS](../backend).

## Requisitos

- Node.js 20+
- App **Expo Go** en tu teléfono (o un emulador Android / simulador iOS)
- El [backend](../backend) corriendo y accesible

## Puesta en marcha

```bash
cd frontend
npm install
# Apunta al backend. En teléfono físico usa la IP LAN de tu PC (no localhost):
EXPO_PUBLIC_API_URL="http://192.168.1.20:3000/v1" npm start
```

Luego escanea el QR con Expo Go (Android) o la cámara (iOS). Alternativas:

```bash
npm run android   # emulador Android
npm run ios       # simulador iOS (solo macOS)
npm run typecheck # verificación de tipos (tsc --noEmit)
```

> **URL del API:** por defecto `http://localhost:3000/v1` (ver `app.json`).
> `localhost` en un teléfono físico apunta al teléfono, no a tu PC: usa
> `EXPO_PUBLIC_API_URL` con la IP de tu red local.

## Pantallas incluidas

| Flujo | Pantalla |
|-------|----------|
| Auth | Login, Registro (persistencia de sesión con `expo-secure-store`) |
| Inicio | Dashboard: deuda total, flujo del mes, próximos pagos |
| Deudas | Lista, detalle con tabla de amortización, **simulador de abono extra**, alta de deuda |
| Registrar | Alta de transacción (gasto/ingreso/pago) + tip de WhatsApp |
| Consejos | Sugerencias del motor (priorizar deuda, sobregiro, abono extra…) |
| WhatsApp | Vinculación por OTP (muestra el código a enviar por chat) |
| Ajustes | Perfil, vincular WhatsApp, cerrar sesión |

## Arquitectura

```
frontend/
├── App.tsx                     # SafeArea + StatusBar + RootNavigator
├── app.json                    # config Expo (bundle ids, extra.apiUrl)
├── src/
│   ├── api/                    # cliente fetch + endpoints tipados + types
│   ├── store/auth.store.ts     # Zustand + SecureStore (token persistente)
│   ├── navigation/             # Root (auth/main) + tabs + stack de deudas
│   ├── screens/                # pantallas por dominio
│   ├── components/ui.tsx       # Button, Field, Card, Screen, Row
│   ├── offline/                # ⭐ capa offline-first
│   │   ├── database.ts         # SQLite (caché + outbox + cursor)
│   │   ├── transactionsRepo.ts # repositorio local-first de transacciones
│   │   ├── syncEngine.ts       # push (outbox) + pull (delta) contra /sync
│   │   ├── network.ts          # detección de conectividad (expo-network)
│   │   └── useSync.ts          # hook: sincroniza al abrir y al volver a foreground
│   ├── theme/colors.ts         # paleta y espaciados
│   └── utils/                  # formato de moneda/fecha, useApi hook
```

## Modo offline (offline-first)

El registro de movimientos **funciona sin conexión**:

1. Al registrar, la transacción se guarda en **SQLite local** y se encola en un
   **outbox** con un `clientUuid` (idempotencia).
2. El **motor de sync** sube el outbox (`POST /sync/push`) y baja los cambios del
   servidor (`GET /sync/pull?since=<cursor>`), actualizando la caché local.
3. La sincronización corre **al abrir la app** y **al volver a primer plano**; el
   Dashboard muestra un aviso con los cambios pendientes y permite reintentar.
4. Como el push es idempotente por `clientUuid`, reintentar nunca duplica.

Verificado: `tsc --noEmit` limpio y `expo export` (Android) empaqueta la app con
la capa offline sin errores.

- **Estado:** Zustand para sesión; `useApi` (hook ligero) para fetching. En
  producción se recomienda migrar el fetching a React Query.
- **Navegación:** React Navigation (native-stack + bottom-tabs). El flujo cambia
  según haya sesión (`tokens`) o no.
- **Sesión:** el access token se guarda cifrado con `expo-secure-store` y se
  inyecta en cada request vía `setTokenGetter`.

## Generar un APK/IPA real (EAS Build)

La configuración está en `eas.json` (perfiles `development`, `preview`,
`production`). Para compilar en la nube de Expo:

```bash
npm i -g eas-cli
eas login
eas build --profile preview --platform android   # genera un APK instalable
eas build --profile production --platform ios     # requiere cuenta Apple
```

Ajusta `EXPO_PUBLIC_API_URL` en cada perfil para apuntar al backend correcto.
Publicación paso a paso en [doc 09](../docs/09-despliegue-publicacion.md).

## Pendientes (siguientes iteraciones)

- Push real con FCM y registro del `deviceToken` en `/devices`.
- Extender el offline a deudas/entidades (hoy: transacciones).
- Gráficas de progreso de deuda (avalanche/snowball) y comparador visual.
- Íconos con librería (hoy emojis) y pantalla de OCR de comprobantes.

## Hecho recientemente

- ✅ Refresh automático del token ante 401 (con logout si falla).
- ✅ Modo offline con SQLite + outbox + motor de sincronización delta.
- ✅ Movimientos recientes en el Dashboard desde la caché local (visible offline).
```
