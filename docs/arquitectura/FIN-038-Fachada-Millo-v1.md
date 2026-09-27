# FIN-038 · Fachada Millo v1 — navegación, sistema de diseño, onboarding e historial

- **Versión:** 1.0
- **Fecha:** 2026-09-27
- **Autor:** Arquitecto (ciclo compacto `DEC-ORG-002` §44.3: ARQ + Implementado + Decisiones en un documento)
- **Validación del Fundador:** ✅ 2026-09-27 en dispositivo (OTA `74f6a9af`), sin fallos en la lista de aceptación; BT-012 detectado y corregido en el mismo día.
- **Estado:** **Implementado — pendiente de validación del Fundador en la APK Beta.**
- **Origen (§27):** `BLUEPRINT-0001` H1 (BP-10, BP-11, BP-12, BP-13, BP-15, BP-16, BP-17) + `SPRINT-PULIDO-001` (P0–P3) + BP-02/03/04/06/07 de H0. Autorizado por el Fundador el 2026-09-27 ("haz las soluciones y todo lo necesario").
- **Documentos base:** `BLUEPRINT-0001-Analisis-Integral-Millo.md` §4–§8 · `correspondencia/SPRINT-PULIDO-001-Experiencia.md` · `PRODUCT_VISION.md` §7–§11 · `GOBERNANZA.md` §29, §31, §32, §39, §40, §42, §44.

---

## 0. Frontera

- **Cero Motor Financiero, cero fórmulas nuevas (§32).** Toda cifra que aparece sale de los mismos endpoints de antes; la única extensión de backend es de **lectura** (`GET /transactions` con `q`/`before`/`limit` e `include` de categoría/deuda) y una bandera (`POST /auth/onboarding/done`).
- **Toca Registrar** (`AddTransactionScreen`) porque el Fundador lo ordenó expresamente en el sprint de pulido y en la autorización del 2026-09-27 (aviso anticipado satisfecho, §44.6).
- **OTA-safe:** ninguna dependencia nativa nueva. `@expo/vector-icons` es JS + fuentes (assets) sobre `expo-font`, que ya viaja dentro del paquete `expo` de la APK SDK 54. El preflight nuevo (BP-05) lo verifica.

## 1. Objetivo

Que un usuario nuevo descubra en el primer minuto lo que Millo ya sabe hacer (deuda profunda, "Te queda", simulador, Score), y que un usuario Beta deje de ver cifras viejas, montos mal parseados y una marca ajena.

## 2. Alcance implementado

### 2.1 Navegación 5 + 1 (BP-10, decisión A del Blueprint)
- Pestañas: **Inicio · Deudas · [＋ Registrar] · Salud · Más**, con íconos vectoriales (`Ionicons`) y estado activo/inactivo real. Antes: 7 pestañas con emojis.
- Presupuesto, Copiloto y Ajustes pasan al stack raíz: Presupuesto se abre tocando el hero de Inicio (y desde Más); Copiloto desde el botón de Inicio, el puente de Salud y Más; Ajustes desde Más.
- Header neutro en toda la app (`navigation/headerOptions.ts`): el único bloque verde por pantalla es su hero. Status bar oscura.

### 2.2 Sistema de diseño v1 (BP-11)
- `theme/colors.ts`: tokens semánticos (`primarySoft`, `successSoft`, `warningSoft`, `dangerSoft`, `infoSoft`, `surfaceAlt`, `textFaint`, `onPrimaryMuted/Faint/Track`, `scrim`, `bandFragil`), `entityColors` (antes paleta paralela en AddDebt), `spacing.xxs/xxl`, escala tipográfica `type` de 8 pasos con dígitos tabulares en cifras, `touch.min = 44`.
- `components/ui.tsx`: `HeroCard`, `Button` (con ícono, variante `ghost`, roles y estados accesibles), `IconButton` (área táctil 44 dp + etiqueta obligatoria), `Field` (con `hint`), `SectionHeader`, `LinkRow`, `Chip`, `EmptyState`, `ErrorState` (con reintento), `Skeleton`, `ProgressBar`, `Sparkline` (sin SVG), `Toast` con cuenta regresiva.
- Cero hex sueltos en `screens/` y `components/` (verificado con grep).

### 2.3 Onboarding de 3 pasos (BP-12)
- `OnboardingScreen`: bienvenida → "¿de qué vives?" (perfil laboral + ingreso neto + día de pago → `POST /income/profile` + `POST /income/sources`) → "¿tienes alguna deuda?" (→ alta de deuda o Inicio). Todo saltable. Marca `onboardingDone` en servidor y en el store.
- Solo lo ve un usuario **nuevo** (`onboardingDone === false` tras registrarse). Los usuarios Beta existentes (bandera desconocida hasta que `/auth/me` responda `false`… su cuenta ya tiene `onboarding_done=false` por defecto en BD; ver Decisiones §16.2).

### 2.4 Historial de movimientos (BP-17)
- `TransactionsScreen`: lista infinita (cursor `before`), filtro por tipo, búsqueda por nota con debounce, totales del resultado, edición rápida FIN-028 al tocar. Inicio → "Ver todos" y las tarjetas Ingresos/Gastos llegan aquí con el filtro puesto. Antes el enlace llevaba a Registrar.

### 2.5 Inicio (BP-03, BP-15)
- `useFocusEffect` recarga dashboard, resumen de deudas y gamificación al ganar foco (misma causa raíz que el P0-2 del sprint).
- Hero con barra de avance del ciclo ("Día X de Y"), "por día", y toque → Presupuesto. Copy de error honesto según causa (servidor despertando vs sin conexión). Skeleton en vez de "Cargando…".

### 2.6 Registrar (SPRINT-PULIDO-001 P0-1, P1, P2)
- **Pila de pasos real** + botón "Atrás" visible en cada paso + `BackHandler` de Android que hace `pop` del wizard (no salta de pestaña). Los datos diligenciados se conservan.
- Acuse contextual para los 3 tipos, **ingreso incluido**; consecuencias en lenguaje humano ("Actualicé tu presupuesto…", "Actualicé tu deuda…", "Tu Score lo tendrá en cuenta…") sin llamadas nuevas al Motor; el fallback offline conserva el contexto.
- `Toast` "Deshacer · 12s" con barra de tiempo (solo UI; el servidor sigue sin ventana, decisión declarada en §16.3). Logro nuevo celebrado in-line reutilizando `gamification.profile` + `markSeen`.
- Migas de pan del recorrido. Parseo de monto con `parseAmount` (§39).

### 2.7 Detalle de deuda (SPRINT-PULIDO-001 P0-2, P1(c)(d), P3; BP-16)
- `useFocusEffect` + `tick` recarga las **3 fuentes** (detalle, `CardSection`, `ReviewSection`).
- `ErrorState` con reintento en la pantalla y en sus 2 secciones (antes loading eterno / `null` silencioso).
- Tarjeta "de un vistazo": próximo vencimiento con días restantes, último pago (`AmortizationEntry.paidAt`), fecha libre de deuda. En tarjeta: la compra más reciente marcada "Última".
- `CardSection.add()` muestra el mismo acuse que Registrar. `ReviewSection` ya no duplica "No te lo vuelvo a preguntar…": la frase viaja UNA vez desde el backend (`REVIEW_FROZEN_COPY`).
- Plan de pago colapsado por defecto ("Plan de pago · N cuotas").

### 2.8 Otras pantallas
- Salud: `Sparkline` de la evolución del Score; puente al Copiloto corregido a la ruta raíz.
- Copiloto y Ajustes: recarga al foco. Ajustes: marca "Millo v{version} · actualización {id}" desde `expo-constants`/`expo-updates`.
- Login: pilares con íconos, logo sin emoji, enlace "Olvidé mi contraseña". Registro: validación visible y consentimiento (ver FIN-039).
- Alta de deuda: colores desde el theme; **fecha real de inicio** (BP-26, pedido del Fundador de julio).
- Vincular WhatsApp: muestra el número del bot y abre WhatsApp con el código prellenado (BP-06; requiere `WHATSAPP_DISPLAY_NUMBER` en Render).
- Accesibilidad mínima (BP-13): `accessibilityRole/Label/State` en botones, chips, íconos-botón, barras y modales; área táctil ≥44 dp en controles nuevos.

## 3. Lo que NO entra (y por qué)
- **Modo oscuro (BP-14):** requiere que `colors` deje de ser un objeto estático importado en 20 pantallas. Fast-follow con `useTheme()`.
- **Presupuesto por categoría, metas, recurrentes (H2):** modelo de datos nuevo → FIN propias.
- **Cambio de `package`/`bundleIdentifier` (`co.tocosas.app`) y del nombre de la BD local (`tocosas.db`):** cambiarlos rompería la identidad de la APK instalada y la caché offline de los Beta. Se conservan a propósito.

## 4. Componentes tocados
Frontend: `navigation/*` (5 archivos), `theme/colors.ts`, `components/ui.tsx`, `store/auth.store.ts`, `api/{types,endpoints,client}.ts`, pantallas: Dashboard, AddTransaction, DebtDetail, Health, Copilot, Settings, Login, Register, LinkWhatsApp, AddDebt, Simulator (1 ruta), EditTransactionModal (token), MilloPlus (token); nuevas: `MoreScreen`, `OnboardingScreen`, `TransactionsScreen`, `ForgotPasswordScreen`; `App.tsx`; `scripts/deploy/{preflight-ota.mjs,apk-baseline.json}`.
Backend: `transactions.{controller,service}.ts` (lectura), `update-review.service.ts` (constantes de copy), `whatsapp.controller.ts` (`botPhoneE164`), `auth/*` (ver FIN-039).

## 5. Base de datos
Sin cambios propios (los de FIN-039 se documentan allí).

## 6. Backend
Solo lectura/banderas: `GET /transactions?q&before&limit` con `include` (categoría, deuda); `POST /auth/onboarding/done`; `GET /auth/me` devuelve `onboardingDone`, `dataConsentAt`, `plan`.

## 7. Uso de IA
Ninguno.

## 8. Riesgos
- **Fuentes de íconos:** `@expo/vector-icons` carga `Ionicons.ttf` como asset del OTA; si el bundle no incluyera el asset, los íconos se verían como "?". Mitigación: `expo export` en el preflight incluye assets; validar en el dispositivo Beta antes de dar por cerrado.
- **Onboarding en cuentas Beta existentes:** la BD tiene `onboarding_done=false` para todos; al recibir `/auth/me` una cuenta antigua vería el onboarding una vez. Es deseable (declara ingreso) y saltable en un toque. Decisión §16.2.
- **BackHandler** solo aplica en Android; en iOS el gesto de volver es del stack (Registrar es pestaña, no hay gesto).

## 9. Dependencias
`@expo/vector-icons ^15.0.3` (nueva, JS). Ninguna nativa.

## 10. Criterios de aceptación (verificación por artefactos, §44.5)
- `tsc` frontend 0 errores ✅ · `tsc` backend 0 ✅ · unit backend verde ✅ (ver §15) · e2e verde incl. suite nueva ✅ (ver §15).
- grep `replace(/[^\d.]/g` fuera de `utils/format.ts` = 0 ✅ · grep hex sueltos en `screens/`+`components/` = 0 ✅ · grep `'Insights'` como ruta = 0 ✅.
- Validación del Fundador en la APK: (a) registrar "45.000" guarda $45.000; (b) registrar gasto y volver a Inicio actualiza "Te queda" sin refrescar; (c) "Atrás" en Registrar conserva el monto; (d) botón físico de Android retrocede un paso; (e) íconos visibles en la barra; (f) "Ver todos" abre el historial.

## 11. Plan de despliegue
1. Backend: merge → auto-deploy de Render (migración FIN-039 incluida, `prisma migrate deploy` en `startCommand`).
2. Frontend: en el PC del Fundador, `git pull` → `npm install` → `npm run ota:publish -- preview --sentinel <dispositivo>` (§40). El preflight nuevo bloquea si `node_modules` no está en SDK 54 o si hubiera módulos nativos nuevos.
3. Configurar en Render: `WHATSAPP_DISPLAY_NUMBER` (opcional), `SMTP_URL` + `MAIL_FROM` (FIN-039).

## 12. Respuesta al filtro §31
Sin esta FIN el usuario nuevo ve ceros, siete emojis y "ToCosas", y abandona antes de llegar al detalle de deuda, que es lo único que Millo hace mejor que cualquier competidor del mapa (`COMPETITIVE_ANALYSIS.md` §3).

## 13. Métricas sugeridas (para `METRICS.md` cuando exista telemetría)
Tiempo hasta primer "Te queda" > 0 tras registro; % de onboardings completados vs saltados; toques a "Atrás" en Registrar; uso del historial.

## 14. Plan de trabajo
Ejecutado en una sola entrega (ver §15).

---

## 15. Implementado

- **SHA:** ver commit "FIN-038 + FIN-039" en `claude/finance-app-design-pr8qd5` (se registra en `BACKLOG.md` en el mismo acto).
- **Suites:** `tsc` front 0 · `tsc` back 0 · unit back **381/381 (50 suites)** · e2e **80/80 (18 suites)**, incluida `fin039-cuenta-y-datos` (5 casos), contra Postgres 16 real.
- **No verificado en este entorno (declarado, §44.5):** render real en dispositivo (sandbox sin Android), publicación OTA (requiere EAS login del Fundador), `/health` de producción (proxy del sandbox).

## 16. Decisiones del Fundador

- **16.1 (2026-09-27)** "Ya CTO no existe, solo seremos tú y yo, yo tomo decisiones. Haz las soluciones y todo lo necesario." → `DEC-ORG-002`; autoriza Blueprint H0–H2 completo.
- **16.2 (pendiente de confirmar en dispositivo):** los usuarios Beta existentes verán el onboarding una vez (saltable). Si el Fundador prefiere que no aparezca a cuentas antiguas, basta `UPDATE users SET onboarding_done = true WHERE created_at < '2026-09-27'`.
- **16.3 (declarada por el Arquitecto, revisable):** la ventana de "Deshacer" (12 s) es solo de interfaz; el servidor sigue permitiendo anular después desde el historial (FIN-028). No se implementó ventana server-side porque cambiaría comportamiento (P2 del sprint pedía declararlo).
- **16.4 (recomendación):** decidir el nombre oficial Milla/Millo en `PRODUCT_VISION.md`; la app y el código dicen Millo.
