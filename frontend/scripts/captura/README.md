# Herramientas de captura real (Expo Web + Edge headless)

- **Versión:** 1.0 · **Fecha:** 2026-07-12 · **Autor:** Agente Arquitecto
- **Estado:** Operativo — método usado en todas las capturas oficiales desde el
  Lote 01 (`docs/producto/capturas/`)
- **Historial:** v1.0 — rescate de los scripts desde el scratchpad de sesión
  (volcado de conocimiento previo al cierre de ventana, instrucción CPSAO
  2026-07-12).

Capturas de la app REAL (mismo código del repo) renderizada por Expo Web contra el
backend y Postgres reales — no mockups. Tooling solo-web: los shims de
`frontend/web-shims/` y `metro.config.js` no tocan el bundle nativo.

## Prerrequisitos

1. Docker Desktop corriendo → `cd backend && docker compose up -d`.
2. Backend: `cd backend && npm run start:dev` (regla Windows: matar TODOS los node
   de backend antes de `prisma generate/migrate` — EPERM).
3. Metro **con API en localhost** (para captura web SIEMPRE localhost — la IP LAN
   cambia entre redes y rompe las llamadas; la LAN solo se usa para el QR del
   teléfono):
   `cd frontend && EXPO_PUBLIC_API_URL=http://localhost:3000/v1 npx expo start --port 8081`
4. Precompilar antes de capturar (el primer build tarda):
   `curl "http://localhost:8081/index.ts.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable"`

## Uso

```bash
node capture-fullpage.js <carpeta-salida>       # Login (sin sesión) + Dashboard completo
node capture-salud-coldstart.js <carpeta-salida> # Salud (usuaria demo) + cold-start (usuario nuevo real)
```

Método: Edge headless (`--headless=new`) controlado por CDP con el WebSocket nativo
de Node ≥22 (cero dependencias). Sesión inyectada por `localStorage`
(`tocosas.tokens`/`tocosas.user` — el shim web de SecureStore). Scroll completo =
medir `scrollHeight` del contenedor y expandir el viewport a esa altura
(390×alto @2x).

## Datos de prueba

- **Usuaria demo con datos ricos:** `demo.laura@millo.app` / `Demo2026!millo`
  (deudas con seguros, Score real, recomendaciones del motor). Si la BD se
  recrea, sembrarla por API (registro + cuentas + fijos + deudas + transacciones
  del ciclo — ver el patrón en `capture-salud-coldstart.js`).
- **Cold-start:** registrar un usuario nuevo por API en el momento (patrón incluido
  en `capture-salud-coldstart.js`) — nunca simular el estado.

## Trampas conocidas (aprendidas a golpes)

- **Puertos de debug zombis:** `edge.kill()` no mata los procesos hijos de Edge. Si
  un run anterior dejó una instancia viva en el mismo `--remote-debugging-port`, el
  run nuevo se conecta a la instancia VIEJA (con sesión vieja) y las capturas salen
  contaminadas. Antes de capturar: matar los listeners de los puertos 9666–9672
  (`netstat -ano | grep :96XX` → `taskkill /F /PID`), o usar siempre puerto+perfil
  nuevos.
- **Cambio de red:** la IP LAN horneada en el bundle muere al cambiar de red — por
  eso captura=localhost y QR=IP del momento (rehornear Metro al generar QR).
- El QR del teléfono: `EXPO_PUBLIC_API_URL=http://<IP_LAN>:3000/v1 npx expo start`
  y QR `exp://<IP_LAN>:8081` (iPhone: escanear con la cámara, abre Expo Go).
