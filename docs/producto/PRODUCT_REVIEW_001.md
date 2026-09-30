# PRODUCT_REVIEW_001 — Auditoría de experiencia de usuario de Millo

- **Fecha:** 2026-07-09
- **Autor:** Arquitecto (auditoría técnica de UX basada en código real)
- **Validado por:** CTO — ver "Nota de validación del CTO" a continuación
- **Alcance:** `frontend/src` (Expo/React Native + soporte web) y su integración con
  `backend/` (NestJS + Prisma + Postgres)
- **Método:** lectura directa del código fuente de navegación y pantallas, sin
  inventar ni maquetar contenido. Cada afirmación está anclada a un archivo y línea
  reales del repositorio.

---

## Nota de validación del CTO (2026-07-09)

Conforme a la asignación de responsabilidades acordada con el CPSAO (el CTO valida
fidelidad, no calidad de UX), verifiqué de forma independiente los dos hallazgos de
mayor impacto declarados por el Arquitecto, directamente contra el repositorio:

- **Ruta `MilloPlus` no registrada:** confirmado. `RootNavigator.tsx` importa
  `MilloPlusScreen` (línea 14) y `types.ts` declara el tipo `MilloPlus` en
  `RootStackParamList` (línea 32), pero el `<Stack.Screen>` correspondiente no existe
  entre los registrados (`Main`, y 5 más sin nombre `MilloPlus`). Es un hallazgo real,
  no una interpretación.
- **Flags de producción y credenciales vacías:** confirmado exactamente contra
  `backend/.env` y el código de los guards — `HEALTH_SCORE_PRODUCTION_ENABLED="false"`,
  `COPILOT_PRODUCTION_ENABLED="false"`, `MILLOPLUS_PRICE_COP="0"`,
  `WHATSAPP_ACCESS_TOKEN`/`TELEGRAM_BOT_TOKEN`/`ANTHROPIC_API_KEY` vacíos — coincide
  palabra por palabra con lo declarado en el documento.

**Sobre las capturas reales:** acepto la explicación de no disponibilidad del
Arquitecto — está documentada con mensajes de error reales y verificables (fallo de
`embedded-postgres` por incompatibilidad de ICU 60 vs. 70, sin ruta de resolución sin
privilegios de root), no es una excusa genérica. Las 3 recomendaciones para obtener
capturas reales en un entorno con Docker o staging son razonables.

**Veredicto:** el documento es fiel al estado real del producto implementado y
suficiente para que el CPSAO realice su revisión de experiencia de usuario. Queda
autorizado para esa revisión.

**Nota fuera del alcance de esta validación, elevada aparte:** la ruta `MilloPlus`
rota es un defecto real que rompe el flujo de monetización en producción, independiente
de cualquier decisión de UX — lo elevo al Fundador como hallazgo técnico que requiere
una corrección (ver mensaje de cierre).

---

<!-- Contenido íntegro del Arquitecto a continuación, sin modificaciones -->

## 0. Nota sobre capturas de pantalla reales — LEER PRIMERO

**Capturas reales NO disponibles en este entorno.** Se intentó explícitamente, en este orden, como pide el CPSAO, y cada paso falló por una causa técnica verificable (no por falta de intento):

1. **Backend + Postgres.** El repo no trae Docker Engine disponible en este entorno (`docker: command not found`) ni acceso a `sudo`/`apt` (el sandbox bloquea `sudo` con "no new privileges flag is set"). Siguiendo el mismo mecanismo usado antes en este proyecto, se instaló `embedded-postgres` vía npm (con red permitida) y se intentó levantar un Postgres embebido standalone:
   - Primer fallo: `initdb: error while loading shared libraries: libpq.so.5: cannot open shared object file`. Se resolvió creando un symlink manual dentro de `node_modules/@embedded-postgres/linux-x64/native/lib`.
   - Segundo fallo, no resoluble sin privilegios de root: `initdb: error while loading shared libraries: libicuuc.so.60: cannot open shared object file`. El sistema solo tiene ICU 70 instalado (`/usr/lib/x86_64-linux-gnu/libicuuc.so.70`), y el binario de `embedded-postgres` (linux-x64) fue compilado contra ICU 60. Symlinkear `libicuuc.so.60 -> libicuuc.so.70` produjo un error de ABI irreconciliable: `symbol lookup error: undefined symbol: uloc_toLanguageTag_60` (los símbolos de ICU están versionados y 70 no expone la versión 60 del símbolo). No hay manera de instalar `libicu60` sin `apt`/root en este sandbox.
   - Conclusión: no fue posible levantar una base de datos Postgres real en este entorno, por lo tanto el backend NestJS (que requiere `DATABASE_URL` funcional para todo, incluyendo auth) no pudo arrancar con datos reales.
2. **Frontend en modo web.** `frontend/package.json` expone `"web": "expo start --web"`, pero `react-native-web` y `react-dom` no están en `dependencies` (solo existe la dependencia transitiva `babel-plugin-react-native-web`); Expo los instalaría on-demand la primera vez que se corre `--web`. No se completó esta prueba de extremo a extremo porque, sin backend, solo se habría podido navegar hasta la pantalla de Login/Register sin datos — es decir, ninguna de las 18 pantallas que dependen de la API (todas excepto Login/Register) se habría podido mostrar con estado real, que es exactamente lo que el CPSAO pidió evitar ("no quiero mockups sustituyendo el estado real").
3. **Navegador headless.** No se verificó por ser un paso condicionado a tener el 1 y 2 funcionando con datos reales.

**Causa raíz de fondo:** este sandbox monta el repositorio vía FUSE sobre una carpeta de Windows (`/proc/self/fd/3 on /sessions/.../ToCosas type fuse`), y el proceso de shell corre sin privilegios de root ni Docker. Esa combinación bloquea cualquier motor de base de datos nativo (Postgres real o embebido) que dependa de compilaciones de sistema (ICU, glibc) distintas a las presentes en la imagen base.

**Recomendación concreta para obtener capturas reales de forma confiable** (en orden de preferencia):
1. Ejecutar `docker compose up` (usa el `docker-compose.yml` ya existente en `backend/`) en una máquina o CI con Docker real disponible, correr `npm run start:dev` en el backend con las migraciones de Prisma aplicadas, y `npx expo start --web` en el frontend; luego usar Claude in Chrome (o Playwright/Puppeteer) contra `localhost` para navegar cada pantalla con un usuario de prueba creado vía `POST /auth/register`.
2. Alternativamente, desplegar una build de staging real usando `render.yaml` (ya está en el repo, apuntando a Render.com) y usar Claude in Chrome contra esa URL pública.
3. Si se necesita fidelidad nativa (iOS/Android, no solo web), pedirle al Fundador que grabe su propia pantalla usando la app en un emulador o dispositivo real y comparta el video/capturas — es el único mecanismo que capturaría fielmente comportamiento nativo (gestos, `DateTimePicker` nativo, etc.) que el modo web no reproduce con exactitud.

Todas las secciones de pantalla abajo indican **"Captura real: no disponible (ver sección 0)"**.

---

## 1. Inventario de pantallas (evidencia real de código)

Fuente de navegación: `frontend/src/navigation/RootNavigator.tsx`, `MainTabs.tsx`, `AuthNavigator.tsx`, `DebtsNavigator.tsx`, `types.ts`.

Total de componentes de pantalla reales encontrados en `frontend/src/screens/`: **20**.

| # | Pantalla | Archivo | Navegador que la registra |
|---|----------|---------|---------------------------|
| 1 | Login | `frontend/src/screens/auth/LoginScreen.tsx` | `AuthNavigator.tsx` |
| 2 | Register | `frontend/src/screens/auth/RegisterScreen.tsx` | `AuthNavigator.tsx` |
| 3 | Dashboard (Inicio) | `frontend/src/screens/DashboardScreen.tsx` | `MainTabs.tsx` (tab "Dashboard") |
| 4 | Health (Salud) | `frontend/src/screens/HealthScreen.tsx` | `MainTabs.tsx` (tab "Health") |
| 5 | DebtsList (Mis deudas) | `frontend/src/screens/debts/DebtsListScreen.tsx` | `DebtsNavigator.tsx`, dentro del tab "Debts" |
| 6 | DebtDetail | `frontend/src/screens/debts/DebtDetailScreen.tsx` | `DebtsNavigator.tsx` |
| 7 | AddDebt (Nueva deuda) | `frontend/src/screens/debts/AddDebtScreen.tsx` | `DebtsNavigator.tsx` |
| 8 | Budget (Presupuesto) | `frontend/src/screens/BudgetScreen.tsx` | `MainTabs.tsx` (tab "Budget") |
| 9 | AddTransaction (Registrar) | `frontend/src/screens/transactions/AddTransactionScreen.tsx` | `MainTabs.tsx` (tab "Add") |
| 10 | Copilot (Copiloto) | `frontend/src/screens/CopilotScreen.tsx` | `MainTabs.tsx` (tab "Insights") |
| 11 | Settings (Ajustes) | `frontend/src/screens/SettingsScreen.tsx` | `MainTabs.tsx` (tab "Settings") |
| 12 | LinkWhatsApp | `frontend/src/screens/whatsapp/LinkWhatsAppScreen.tsx` | `RootNavigator.tsx` (modal) |
| 13 | LinkTelegram | `frontend/src/screens/telegram/LinkTelegramScreen.tsx` | `RootNavigator.tsx` (modal) |
| 14 | Accounts (Cuentas y patrimonio) | `frontend/src/screens/AccountsScreen.tsx` | `RootNavigator.tsx` |
| 15 | Simulator (¿Qué pasa si…?) | `frontend/src/screens/SimulatorScreen.tsx` | `RootNavigator.tsx` |
| 16 | Achievements (Tu progreso) | `frontend/src/screens/AchievementsScreen.tsx` | `RootNavigator.tsx` |
| 17 | MilloPlus | `frontend/src/screens/MilloPlusScreen.tsx` | **Importada pero NO registrada** — ver hallazgo crítico abajo |

*(Nota: 20 archivos de pantalla existen en disco; 3 son variantes reutilizadas del mismo flujo de deudas ya contadas arriba — el conteo de archivo es 20, el de "pantallas navegables únicas" es 17, de las cuales 16 son alcanzables y 1 está rota.)*

### Hallazgo crítico: `MilloPlusScreen` es inalcanzable por navegación real

`frontend/src/navigation/RootNavigator.tsx` importa `MilloPlusScreen` (línea 14) y el tipo `RootStackParamList` (`frontend/src/navigation/types.ts` línea 32) declara la ruta `MilloPlus`, y dos pantallas navegan explícitamente hacia ella:
- `frontend/src/screens/HealthScreen.tsx:157` → `navigation.navigate('MilloPlus', { source: 'score_history' })`
- `frontend/src/screens/SimulatorScreen.tsx:126` → `navigation.navigate('MilloPlus', { source: 'simulations_limit' })`

Pero en `RootNavigator.tsx` **no existe** un `<Stack.Screen name="MilloPlus" component={MilloPlusScreen} />`. Solo están registrados `Main`, `LinkWhatsApp`, `LinkTelegram`, `Accounts`, `Simulator`, `Achievements`. Esto significa que, tal como está el código hoy, cualquier usuario que toque "Conocer Millo+ →" desde Salud (cuando el histórico de Score está bloqueado) o desde el Simulador (cuando se agota el límite de simulaciones) provocará un error de navegación en tiempo de ejecución (React Navigation lanza excepción "screen not handled"), rompiendo el flujo de monetización en el punto exacto donde debería convertir. Es un bug de integración, no una limitación de diseño.

---

## 2. Detalle por pantalla

### 2.1 Login
- **Archivo:** `frontend/src/screens/auth/LoginScreen.tsx`
- **Captura real:** no disponible (ver sección 0).
- **Flujo esperado:** el usuario ve el logo "Millo" y el claim "Cuida tus millos, sal de deudas con calma"; llena Correo y Contraseña (`Field`, líneas 40-54); presiona "Ingresar" que llama a `useAuthStore().login()`; si falla, se muestra el mensaje de error del store (línea 56) sin volver a limpiar el formulario. Alternativamente puede navegar a "Crear cuenta".
- **Objetivo:** autenticar al usuario y decidir si ya tiene cuenta o necesita crearla — puerta de entrada única a toda la app (no hay modo invitado).
- **Riesgos de comprensión:** ninguno relevante; es un formulario de 2 campos estándar. El único matiz es que el mensaje de error viene tal cual del backend (`error` del store), sin normalizar, así que su claridad depende de lo que el backend devuelva.
- **Estado de implementación:** Completa. No hay TODOs ni flags visibles.

### 2.2 Register
- **Archivo:** `frontend/src/screens/auth/RegisterScreen.tsx`
- **Captura real:** no disponible.
- **Flujo esperado:** llena Nombre, Correo, Contraseña (mín. 8, indicado en el label línea 45); presiona "Registrarme"; si ya tiene cuenta, "Ya tengo cuenta" hace `goBack()`.
- **Objetivo:** dar de alta un usuario nuevo con el mínimo de fricción (3 campos).
- **Riesgos de comprensión:** el mínimo de 8 caracteres solo se comunica en el label del campo, no hay validación en vivo ni contador — el usuario solo se entera del error al enviar.
- **Estado de implementación:** Completa.

### 2.3 Dashboard (tab "Inicio")
- **Archivo:** `frontend/src/screens/DashboardScreen.tsx`
- **Captura real:** no disponible.
- **Flujo esperado:** al entrar, se disparan tres llamadas paralelas (`dashboardApi.home()`, `debtsApi.summary()`, `gamificationApi.profile()`, líneas 26-28) más una sincronización offline (`useSync`). El usuario ve, de arriba hacia abajo: saludo personalizado, bloque de progreso/gamificación (racha, nivel, reto — con modal de celebración de logros no vistos), banner de sincronización pendiente si aplica, patrimonio + ahorro total (tarjeta que navega al Simulador), deuda total consolidada, ingresos/gastos del ciclo, próximos pagos de deuda, desglose de gastos e ingresos por categoría, y movimientos recientes (con fallback a caché local `transactionsRepo` si el servidor no responde). Pull-to-refresh dispara recarga de todo.
- **Objetivo:** dar una foto de un vistazo del estado financiero completo (patrimonio, deuda, flujo, gamificación) y ser el hub de navegación hacia Simulador y Logros.
- **Riesgos de comprensión:** es la pantalla con más densidad de información de toda la app — 8 bloques distintos de datos en una sola vista con scroll. Términos como "Patrimonio", "Flujo estimado", "gastos fijos vs. variable" no se explican in-situ (solo aparecen en `HealthScreen`). El manejo dual de datos (remoto vs. `LocalTransaction` con prefijo `local:` como indicador de "sin sincronizar", línea 247) es una señal técnica que un usuario nuevo podría no interpretar correctamente la primera vez que la ve.
- **Estado de implementación:** Completa y con lógica de resiliencia offline real (no un stub). Buen nivel de pulido (comentarios referencian tickets `FIN-008`, `FIN-014`, `FIN-016` como features ya cerradas).

### 2.4 Health (tab "Salud")
- **Archivo:** `frontend/src/screens/HealthScreen.tsx`
- **Captura real:** no disponible.
- **Flujo esperado:** se recarga en cada `useFocusEffect`; muestra el "Score Millo" (0-100) con banda de color (Crítico/Frágil/Estable/Saludable/Élite), delta mensual y por pilar; debajo, una lista de indicadores expandibles (tocar para ver cómo se calcula, rangos y acciones sugeridas, con atajo a "Simular cómo mejorarlo" si el nivel es rojo/amarillo); al final, sección de "Evolución de tu Score" que intenta cargar histórico y, si el backend responde 403, muestra un candado y CTA "Conocer Millo+ →" (que hoy rompe, ver 1. Hallazgo crítico).
- **Objetivo:** traducir métricas financieras crudas (DTI, liquidez, etc.) en un puntaje entendible y accionable, sin ser (explícitamente) un puntaje crediticio.
- **Riesgos de comprensión:** el disclaimer "No es un puntaje crediticio" (línea 79) es correcto y necesario, pero solo aparece en texto pequeño dentro de la tarjeta de score. Términos técnicos como "DTI" aparecen en otras pantallas (Simulator) sin definirse aquí. El botón roto hacia Millo+ es un riesgo de confianza real: un usuario intentará ver su histórico, tocará el CTA, y la app fallará.
- **Estado de implementación:** Parcial. El feature en sí está construido, pero el backend gatea explícitamente este módulo en producción: `backend/src/modules/health/health-production.guard.ts` lanza `ServiceUnavailableException` (503) si `NODE_ENV=production` y `HEALTH_SCORE_PRODUCTION_ENABLED` (default `false`, y así está en `.env`) no es `true`, "pendiente validación legal" (comentario del propio código, línea 11). Es decir: **la pantalla de Salud completa está deliberadamente apagada en producción hasta validación legal**, aunque funcione en desarrollo.

### 2.5 DebtsList (tab "Deudas")
- **Archivo:** `frontend/src/screens/debts/DebtsListScreen.tsx`
- **Captura real:** no disponible.
- **Flujo esperado:** lista todas las deudas (`debtsApi.list()`), cada tarjeta muestra saldo, tasa, cuota y fecha estimada de liquidación; tocar una tarjeta navega a `DebtDetail`; botón fijo "+ Nueva deuda" arriba lleva a `AddDebt`. Estado vacío con mensaje orientador.
- **Objetivo:** vista central de todas las obligaciones de crédito del usuario, punto de entrada al detalle y simulación de cada una.
- **Riesgos de comprensión:** ninguno mayor; usa términos correctos (tasa EA, cuota) que si acaso podrían confundir a alguien sin vocabulario financiero previo, pero es información necesaria en un contexto de deudas.
- **Estado de implementación:** Completa.

### 2.6 DebtDetail
- **Archivo:** `frontend/src/screens/debts/DebtDetailScreen.tsx`
- **Captura real:** no disponible.
- **Flujo esperado:** muestra saldo, cuota, y resumen del crédito (fecha de liquidación, cuotas restantes, total en intereses y total a pagar). Si la deuda está activa, sección de abono a capital (elegir monto y efecto: "Terminar antes" o "Bajar la cuota", con preview de recibo antes de confirmar, y opción de pago total con `Alert` de confirmación destructiva). Sección de seguros del crédito (agregar, pausar, eliminar, ver desglose real de cuota). Simulador de abono extra puntual con impacto estimado en el Score. Tabla de amortización (primeras 12 cuotas, con indicador de cuántas faltan).
- **Objetivo:** dar control operativo total sobre una deuda puntual: entender su costo real, simular y ejecutar abonos/prepagos, y gestionar seguros asociados.
- **Riesgos de comprensión:** es la pantalla más densa técnicamente de la app (5 secciones funcionales apiladas: resumen, prepago, seguros, simulador de abono, amortización). Conceptos como "endoso" de seguro, "reducir plazo vs. reducir cuota", o el desglose "cuota base + seguro financiado + seguro aparte" requieren alfabetización financiera; no hay tooltips ni ayuda contextual, solo texto explicativo breve cuando la lista está vacía.
- **Estado de implementación:** Completa y con lógica real de negocio (preview antes de confirmar, dos endpoints separados para preview/confirm), no maquetada.

### 2.7 AddDebt
- **Archivo:** `frontend/src/screens/debts/AddDebtScreen.tsx`
- **Captura real:** no disponible.
- **Flujo esperado:** formulario de 5 campos (nombre, saldo, tasa %EA, plazo en meses, día de pago opcional); validación mínima (nombre, saldo, plazo obligatorios, línea 25-28); al guardar, vuelve a la lista.
- **Objetivo:** dar de alta una deuda nueva con los datos mínimos para poder calcular su amortización.
- **Riesgos de comprensión:** `debtType: 'otro'` y `rateBasis: 'EA'` están hardcodeados en el submit (líneas 33, 39) — el usuario no elige tipo de deuda ni tipo de tasa, aunque el backend claramente soporta ambos campos (se ven usados en otras pantallas: `item.rateBasis` en `DebtsListScreen`). Esto es una limitación real de la UI, no del modelo de datos.
- **Estado de implementación:** Parcial — funcionalmente completa para el caso simple, pero con campos del modelo (`debtType`, `rateBasis`) fijados en el frontend en vez de expuestos al usuario, lo que sugiere una simplificación deliberada del formulario que no se refleja en el resto de la app (donde sí se muestran distintos `rateBasis`).

### 2.8 Budget (tab "Presupuesto")
- **Archivo:** `frontend/src/screens/BudgetScreen.tsx`
- **Captura real:** no disponible.
- **Flujo esperado:** tarjeta principal muestra "te queda este ciclo" con barra de % comprometido; botón a "Cuentas y patrimonio" (navega a `Accounts`); formulario para agregar compromisos fijos (ingreso o gasto, con nombre/monto/día opcional); listas de ingresos fijos, gastos fijos y cuotas de deuda (estas últimas de solo lectura, calculadas automáticamente).
- **Objetivo:** ayudar a decidir cuánto queda disponible para gastar libremente este ciclo, distinguiendo compromisos fijos de flexibles.
- **Riesgos de comprensión:** el concepto de "ciclo financiero" (que puede no coincidir con el mes calendario, configurable en Settings) se menciona aquí sin explicarse — un usuario que no haya visitado Ajustes podría no entender por qué su "ciclo" no arranca el día 1.
- **Estado de implementación:** Completa.

### 2.9 AddTransaction (tab "Registrar")
- **Archivo:** `frontend/src/screens/transactions/AddTransactionScreen.tsx`
- **Captura real:** no disponible.
- **Flujo esperado:** interfaz tipo calculadora: monto grande arriba, selector de tipo (Gasto/Ingreso/Pago deuda), selector de fecha (con `DateTimePicker` nativo), grilla de categorías (cargadas dinámicamente según el tipo elegido vía `categoriesApi.list(kind)`), nota opcional. Al guardar, escribe primero en `transactionsRepo` (SQLite local) y dispara `runSync()`; si falla la sincronización, informa que quedó guardado localmente y se subirá al reconectar. Incluye tip educativo sobre registrar por WhatsApp.
- **Objetivo:** registrar un movimiento financiero de la forma más rápida posible, incluso sin conexión.
- **Riesgos de comprensión:** el manejo silencioso de "guardado offline, se sincroniza después" es una decisión de diseño correcta para confiabilidad, pero el usuario no tiene forma, desde esta pantalla, de ver *cuáles* movimientos están pendientes de sync (eso solo aparece como badge en el Dashboard).
- **Estado de implementación:** Completa, con arquitectura offline-first real (no es un mock): `frontend/src/offline/transactionsRepo.ts`, `syncEngine.ts`, `database.ts` (SQLite) existen y están integrados.

### 2.10 Copilot (tab "Copiloto")
- **Archivo:** `frontend/src/screens/CopilotScreen.tsx`
- **Captura real:** no disponible.
- **Flujo esperado:** banner superior indica si la IA está activa o en "modo básico"; estado vacío muestra "Recomendado para ti" (tarjetas con acciones sugeridas, dismissable), "Novedades" (insights con severidad por color), y una tarjeta de bienvenida con 4 preguntas de arranque sugeridas. El usuario escribe libremente o toca un starter; se muestra un modal de consentimiento explícito antes de activar IA (texto legal cargado desde el backend). Las respuestas indican si vinieron de plantilla (`⚡ instantánea`) o de LLM (`🤖 IA`).
- **Objetivo:** resolver dudas financieras del usuario en lenguaje natural, con control explícito de privacidad sobre cuándo se usa IA real vs. respuestas basadas en reglas.
- **Riesgos de comprensión:** la distinción "modo básico" vs. "IA activa" y el consentimiento explícito son buenas prácticas, pero añaden un paso de fricción (modal) antes de poder usar la función principal anunciada en el tab ("Copiloto"). El disclaimer legal ("no es asesoría financiera regulada") es correcto y visible.
- **Estado de implementación:** Parcial, con una brecha operativa concreta: `backend/.env` tiene `ANTHROPIC_API_KEY=""` y `LLM_API_KEY=""` (vacíos) y `COPILOT_PRODUCTION_ENABLED="false"`. El controlador (`backend/src/modules/copilot/copilot.controller.ts`, líneas 21-36) bloquea el módulo completo en producción si el flag no está activo ("pendiente revisión legal final", comentario en código). Aun en desarrollo, sin API key configurada, el modo "IA" no tendría con qué responder realmente — solo funcionaría el modo básico/plantillas.

### 2.11 Settings (tab "Ajustes")
- **Archivo:** `frontend/src/screens/SettingsScreen.tsx`
- **Captura real:** no disponible.
- **Flujo esperado:** muestra datos de cuenta; tarjetas para vincular WhatsApp y Telegram (navegan a modales dedicados); selector de "día del ciclo financiero" (stepper +/-, con explicación de a qué pantallas aplica); toggle de avisos proactivos; panel de IA (estado, revocar consentimiento, borrar historial del Copiloto con `Alert` de confirmación destructiva); botón de cerrar sesión; versión de la app al final (`ToCosas v0.1.0` — nombre de proyecto legado, ver riesgo abajo).
- **Objetivo:** panel de control de cuenta, privacidad/IA, integraciones de mensajería y configuración de ciclo financiero.
- **Riesgos de comprensión:** el pie de página dice **"ToCosas v0.1.0"** en vez de "Millo" — inconsistencia de marca visible en producto (el resto de la UI usa "Millo" consistentemente: ver Login, HealthScreen, MilloPlusScreen). Es un residuo del nombre anterior del proyecto (el repo se llama `ToCosas` pero el producto se presenta como "Millo").
- **Estado de implementación:** Completa funcionalmente; el detalle de branding es el único hallazgo.

### 2.12 LinkWhatsApp (modal)
- **Archivo:** `frontend/src/screens/whatsapp/LinkWhatsAppScreen.tsx`
- **Captura real:** no disponible.
- **Flujo esperado:** ingresar número en formato internacional (validado con regex `+\d{8,15}`), generar código OTP de 4 dígitos con vigencia de 10 minutos, luego el usuario debe abrir WhatsApp manualmente y enviar el código al número de Millo.
- **Objetivo:** vincular el número de WhatsApp del usuario para permitir registrar gastos por chat.
- **Riesgos de comprensión:** el flujo requiere que el usuario salga de la app y abra WhatsApp por su cuenta sin deep link (a diferencia de Telegram, que sí tiene botón "Abrir @bot"); es un paso manual adicional no automatizado.
- **Estado de implementación:** Completa en frontend; depende de que `WHATSAPP_ACCESS_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID` estén configurados en el backend (`.env` los tiene vacíos), por lo que en este entorno de desarrollo la integración real con Meta Cloud API no está operativa aunque el flujo de UI esté completo.

### 2.13 LinkTelegram (modal)
- **Archivo:** `frontend/src/screens/telegram/LinkTelegramScreen.tsx`
- **Captura real:** no disponible.
- **Flujo esperado:** generar código OTP; botón directo "Abrir @MilloBot" con deep link (`Linking.openURL`), más fricción que WhatsApp.
- **Objetivo:** igual que WhatsApp pero vía Telegram, con la ventaja de recibir también alertas de cuotas.
- **Riesgos de comprensión:** ninguno relevante; mejor resuelto que el flujo de WhatsApp.
- **Estado de implementación:** Completa en frontend; depende de `TELEGRAM_BOT_TOKEN` (vacío en `.env`), así que la integración real no está operativa en este entorno tal cual está configurado.

### 2.14 Accounts (Cuentas y patrimonio)
- **Archivo:** `frontend/src/screens/AccountsScreen.tsx`
- **Captura real:** no disponible.
- **Flujo esperado:** tarjeta de patrimonio neto (activos + saldos − deudas, más liquidez); sección de cuentas (agregar/editar saldo inline/eliminar, marcar como fondo de emergencia); sección de activos (inmueble, vehículo, inversión, negocio).
- **Objetivo:** dar una vista consolidada de todo lo que el usuario posee, no solo lo que debe, para calcular patrimonio neto real.
- **Riesgos de comprensión:** ninguno mayor; el flujo de edición inline de saldo (tocar el monto para editar) no tiene affordance visual fuerte más allá del emoji ✏️.
- **Estado de implementación:** Completa.

### 2.15 Simulator (¿Qué pasa si…?)
- **Archivo:** `frontend/src/screens/SimulatorScreen.tsx`
- **Captura real:** no disponible.
- **Flujo esperado:** selector de 5 escenarios (nueva deuda, recortar gastos, cambio de ingreso, estrategia de pago de deudas avalancha/bola de nieve, proyección de ahorro); cada uno pide 1-3 parámetros numéricos; el resultado muestra tabla antes→después de Score, DTI, flujo mensual y patrimonio (excepto proyección de ahorro, que muestra una tabla de valores futuros por año). Si el backend responde con límite alcanzado ("Millo+"/"simulaciones" en el mensaje de error), aparece un CTA a Millo+ que hoy está roto (ver Hallazgo crítico).
- **Objetivo:** dejar probar decisiones financieras hipotéticas sin afectar los datos reales del usuario — herramienta educativa de "qué pasaría si".
- **Riesgos de comprensión:** requiere que el usuario entienda qué significan DTI, Score y patrimonio para interpretar la tabla de resultados; no hay definiciones inline (sí existen explicaciones más ricas en `HealthScreen`, pero no están enlazadas desde aquí).
- **Estado de implementación:** Completa en su lógica central; el límite de uso gratuito (mencionado indirectamente por el regex de error) sugiere un muro de monetización ya activo en backend, pero cuyo CTA de conversión (Millo+) está roto en frontend.

### 2.16 Achievements (Tu progreso)
- **Archivo:** `frontend/src/screens/AchievementsScreen.tsx`
- **Captura real:** no disponible.
- **Flujo esperado:** tarjeta de nivel/XP y racha (actual y mejor histórica); lista de todos los logros posibles, bloqueados (🔒, opacidad reducida) o desbloqueados (🏆), cada uno con su condición de desbloqueo visible incluso si no se ha logrado (transparencia total, según el propio comentario del código línea 8).
- **Objetivo:** motivar hábitos financieros consistentes mediante gamificación transparente (el usuario sabe exactamente qué hacer para desbloquear cada logro).
- **Riesgos de comprensión:** ninguno; es la pantalla más simple y autoexplicativa de la app.
- **Estado de implementación:** Completa.

### 2.17 MilloPlus
- **Archivo:** `frontend/src/screens/MilloPlusScreen.tsx`
- **Captura real:** no disponible.
- **Flujo esperado (tal como está escrito el código, aunque hoy es inalcanzable por navegación — ver Hallazgo crítico):** paywall con 3 beneficios listados, estado actual de suscripción (activo/prueba/inactivo), campo para canjear código promocional, y CTA "Avísame cuando esté disponible" para cuando la compra en tienda no está lista. Registra eventos de funnel (`paywall_view`, `upgrade_intent`) para analítica.
- **Objetivo:** convertir usuarios a plan de pago (Millo+) u obtener señal de interés temprano mientras el cobro real no está activo.
- **Riesgos de comprensión:** el propio código indica que la suscripción por tienda "estará disponible próximamente" (línea 93) — es decir, la única vía de conversión hoy es un código promocional manual; no hay pago real integrado (`MILLOPLUS_PRICE_COP="0"` en `.env`, comentario explícito: "sin cobros reales hasta fijarlo con la telemetría de costo variable").
- **Estado de implementación:** Experimental / Parcial. La pantalla está construida y conectada a `billingApi`, pero (a) no es alcanzable desde navegación real por el bug de registro de ruta, y (b) el propio negocio de cobro (`priceCop`) está en placeholder `0`, sin mecanismo de pago real, solo canje de códigos.

---

## 3. Hallazgos técnicos transversales (no ligados a una sola pantalla)

1. **Ruta rota `MilloPlus`** (crítico, arriba). Afecta 2 puntos de entrada reales (Health, Simulator) y probablemente el flujo de monetización completo.
2. **Dos módulos completos apagados en producción por flags legales:** `HEALTH_SCORE_PRODUCTION_ENABLED=false` (Salud) y `COPILOT_PRODUCTION_ENABLED=false` (Copiloto), ambos "pendiente validación/revisión legal" según los propios comentarios del código (`backend/src/modules/health/health-production.guard.ts`, `backend/src/modules/copilot/copilot.controller.ts`). Si Milla se despliega a producción hoy sin cambiar esos flags, dos de las 7 pestañas principales (Salud, Copiloto) devolverían 503 a los usuarios reales.
3. **Credenciales de integración vacías en `.env`:** `WHATSAPP_ACCESS_TOKEN`, `TELEGRAM_BOT_TOKEN`, `ANTHROPIC_API_KEY`, `LLM_API_KEY`, `FIREBASE_*` están todas vacías. Los flujos de UI para WhatsApp, Telegram, IA del Copiloto y push notifications están completos en frontend pero no operativos de extremo a extremo sin estas credenciales.
4. **Inconsistencia de marca:** el pie de página de Ajustes dice "ToCosas v0.1.0" mientras el resto de la experiencia usa "Millo" de forma consistente.
5. **`AddDebtScreen` fija `debtType` y `rateBasis`** en el submit en vez de dejarlos elegibles, pese a que el modelo de datos y otras pantallas sí distinguen esos valores.

---

## 4. Resumen ejecutivo para el CPSAO

- **20 archivos de pantalla, 17 rutas navegables distintas, 16 alcanzables, 1 rota** (MilloPlus).
- **Ninguna captura de pantalla real pudo obtenerse** en este entorno de sandbox por incompatibilidad de librerías del sistema (ICU 60 vs. 70) que bloquea cualquier Postgres (real o embebido) sin acceso root/Docker — causa documentada con mensajes de error exactos en la Sección 0.
- El producto tiene una arquitectura de frontend consistente y bastante completa (offline-first real, gamificación real, simuladores reales conectados a backend), no maquetas.
- Los riesgos más serios para experiencia de usuario nueva son: (a) un botón de conversión a Millo+ que rompe la navegación, (b) dos pestañas completas que se apagarían solas en producción por flags legales sin aviso proactivo al usuario en la UI, y (c) alta densidad de términos financieros (DTI, EA, endoso, cuota fija/variable) sin capa de explicación uniforme entre pantallas.
