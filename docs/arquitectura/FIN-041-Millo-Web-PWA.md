# FIN-041 · Millo web (PWA): la misma app, por un enlace, instalable en iPhone y Android

- **Versión:** 1.0 · **Fecha:** 2026-09-28 · **Autor:** Arquitecto (ciclo compacto `DEC-ORG-002` §44.3)
- **Estado:** **Publicado** en <https://yonathanceravntes.github.io/ToCosas/> (2026-09-28, run 36444744864; el Fundador activó Pages → Source "GitHub Actions" y abrió la regla de ramas del ambiente `github-pages`). **Pendiente: validación en iPhone.**
- **Origen (§27):** pregunta del Fundador (2026-09-28): "¿se puede generar un enlace con acceso directo al escritorio del iPhone, como mi app de hipertrofia, sin perder avance?". Autorizado: "Arranca, claro, para probar en teléfono".
- **Documentos base:** `FIN-038` (fachada), `FIN-039` (cuenta), `EAS-UPDATE.md` (§40), `metro.config.js` (shims web existentes), `GOBERNANZA.md` §31, §42, §44.

---

## 0. Frontera
Solo frontend y despliegue. **No toca** backend, datos, APK ni OTA: la versión web es otro artefacto del mismo código. `app.json` no cambia (la config web entra por `app.config.js` solo cuando se compila para web).

## 1. Objetivo
Que Millo se abra desde un enlace en cualquier teléfono (iPhone incluido, sin App Store) y se pueda **añadir a la pantalla de inicio** como una app, con la **misma cuenta y los mismos datos** que en el Android.

## 2. Qué se hizo
1. **Plantilla web** (`public/index.html`): manifest, ícono, color de tema, metaetiquetas de Apple para modo app (`apple-mobile-web-app-capable`), `viewport-fit=cover`, ancho máximo de teléfono en pantallas grandes.
2. **Manifest PWA** (`public/manifest.json`) e íconos 192/512/apple-touch generados desde `assets/icon.png`.
3. **Selector de fecha para web** (`components/DatePicker.tsx`): misma firma que el nativo; en web usa `<input type="date">` (rueda de Safari en iPhone). Reemplaza al nativo en Registrar, editar movimiento y Nueva deuda. En Android no cambia nada.
4. **Push**: en web `registerForPush` no hace nada (los avisos llegan por Telegram/WhatsApp). Ajustes muestra `Millo v0.1.0 · actualización web`.
5. **`app.config.js`**: añade `experiments.baseUrl` solo si `EXPO_WEB_BASE_URL` está definida (GitHub Pages sirve bajo `/ToCosas/`).
6. **Despliegue automático** (`.github/workflows/web.yml`): en cada push a la rama con cambios en `frontend/`, compila `expo export --platform web` y publica en GitHub Pages. URL: `https://yonathanceravntes.github.io/ToCosas/`.

## 3. Lo que NO tiene la web (y por qué)
- **Registro sin conexión** (caché SQLite + cola): capacidad nativa. En web se trabaja directo contra el backend: hace falta internet en el momento de registrar. Todo lo demás funciona igual.
- **Notificaciones push** en la barra del teléfono. Los recordatorios por Telegram/WhatsApp sí llegan (los envía el servidor).
- **Almacenamiento seguro**: en web los tokens viven en `localStorage` del navegador (shim existente). Aceptable para Beta; para público, revisar (candidata: cookies httpOnly).

## 4. Paso único del Fundador
GitHub → repositorio `ToCosas` → **Settings → Pages → Build and deployment → Source: "GitHub Actions"** → Save. Desde ese momento cada push publica. La primera publicación se puede lanzar desde **Actions → "Web (GitHub Pages)" → Run workflow**.

## 5. Cómo instalarla en el teléfono
- **iPhone (Safari):** abrir el enlace → botón Compartir → **"Añadir a pantalla de inicio"** → Añadir. Abre a pantalla completa con el ícono de Millo.
- **Android (Chrome):** abrir el enlace → menú ⋮ → **"Añadir a pantalla de inicio"** / "Instalar app".

## 6. Verificación
- `tsc` 0. Export web local con `EXPO_WEB_BASE_URL=/ToCosas`: bundle generado, `index.html` con manifest y rutas bajo `/ToCosas/`.
- Render en Chromium headless a 390×844: pantalla de Login visible (captura en el historial de la sesión).
- Pendiente en dispositivo (Fundador): iPhone Safari → login → Inicio → registrar un gasto (fecha con la rueda de Safari) → añadir a pantalla de inicio → abrir desde el ícono.

## 7. Riesgos
- **Cold start de Render** (BT-005): el primer login desde web puede tardar hasta 60 s; el cliente ya tiene timeout y copy.
- **CORS**: `app.enableCors()` ya permite cualquier origen; suficiente para Beta.
- **Subcarpeta `/ToCosas/`**: si más adelante se usa dominio propio, basta quitar `EXPO_WEB_BASE_URL` del workflow.

## 8. Decisiones del Fundador
- **8.1** Autorización 2026-09-28 ("Arranca, claro").
- **8.2 ✅ (2026-09-28):** GitHub Pages activado (Source: GitHub Actions) y ambiente `github-pages` sin restricción de ramas. Nota operativa: el ambiente se crea solo al activar Pages con la rama por defecto como única permitida; hubo que abrirlo porque el trabajo va en `claude/finance-app-design-pr8qd5`.
- **8.3 (pendiente):** validación en iPhone (§6).
