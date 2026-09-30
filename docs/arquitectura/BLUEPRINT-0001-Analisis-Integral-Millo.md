# BLUEPRINT-0001 · Análisis integral de Millo y boceto de mejoras

- **De:** Arquitecto
- **Para:** Fundador
- **CC:** CTO
- **Asunto:** Revisión exhaustiva de flujos, fachada de la APK y modelo de datos + boceto
  completo de mejoras, con estudio de mercado mundial como insumo
- **Fecha:** 2026-09-27
- **Naturaleza (GOBERNANZA §6/§13):** documento **exploratorio** del Arquitecto. **No
  autoriza implementación, no abre FIN y no modifica el Backlog.** El CTO decide qué
  de aquí se convierte en `FIN` y en qué orden. Toda afirmación de mercado es
  hipótesis hasta la validación del CTO (§15); las afirmaciones sobre el código están
  verificadas contra el repositorio en `HEAD 362d279` (rama
  `claude/finance-app-design-pr8qd5`).
- **Documentos base:** `GOBERNANZA.md` v3.20 · `ESTADO_PROYECTO.md` (2026-07-13) ·
  `BACKLOG.md` · `REGISTRO-DEFECTOS.md` · `PRODUCT_VISION.md` v1.3 ·
  `correspondencia/SPRINT-PULIDO-001-Experiencia.md` · `ARQ/DEC/IMP/CIERRE-0030…0037` ·
  `backend/prisma/schema.prisma` · `frontend/src/**` ·
  `docs/producto/COMPETITIVE_ANALYSIS.md` v2.0 (emitido en el mismo acto).

---

## Estado / Conclusión / Acciones / Bloqueos (EOC v1.0)

- **Estado:** análisis completo entregado; dos documentos commiteados en el mismo acto
  (§34). Sin código tocado.
- **Conclusión:** Millo tiene un **motor financiero y una arquitectura de deuda que no
  existen en el mercado revisado** (11 modalidades, fuente única §32, simulador de 8
  escenarios, Score explicable), pero los lleva puestos con una **fachada de scaffold**
  y le faltan **cuatro capacidades que el mercado da por sentadas** (metas, presupuesto
  por categoría, historial de movimientos, gráficas). El riesgo no es de fondo sino de
  primera impresión: un usuario nuevo abandona antes de descubrir lo que Millo hace
  bien. Encontré además **13 puntos de código que violan la invariante §39** (formato
  regional) y **3 pantallas que muestran datos viejos** al volver a ellas (misma clase
  del bug P0-2 del sprint de pulido), ambos corregibles por mantenimiento (§38).
- **Acciones sugeridas (decide el CTO):** (1) ejecutar `SPRINT-PULIDO-001` ya ordenado +
  la ola H0 de higiene de este documento como mantenimiento; (2) evaluar H1 (fachada)
  como la siguiente FIN de experiencia; (3) llevar H2/H3 al Laboratorio (`IDEA`).
- **Bloqueos:** ninguno para leer y decidir. Para implementar: `Registrar` exige aviso
  anticipado al Fundador (instrucción 2026-07-13); IA real exige DPA+PIA; Score público
  exige validación legal.

Rúbrica de autoevaluación: 8/10 — exhaustivo y verificado contra código; no pude
ejecutar la APK en un dispositivo real ni alcanzar `milla-backend.onrender.com` desde
este entorno (proxy), así que la fachada se auditó sobre el código de las pantallas,
no sobre capturas nuevas.

---

## 1. Alcance y método

1. **Leí** (Nivel 1 y 2 del arranque en frío): gobernanza completa, estado, backlog
   (37 FIN + sprint), registro de defectos, visión de producto, los ARQ/DEC/CIERRE de
   la secuencia EOC (035→037) y la directiva del sprint de pulido.
2. **Recorrí el código real**: las 20 pantallas del frontend, navegación, cliente HTTP,
   motor offline, store de auth, tema y componentes; el esquema Prisma completo (1240
   líneas, 24 migraciones); la superficie de los 22 controladores del backend; los 50
   specs unitarios y 17 suites e2e.
3. **Verifiqué cada hallazgo con `grep`/lectura**, nunca por descripción. Donde una
   afirmación es inferencia lo digo.
4. **Estudio de mercado** en documento aparte (`COMPETITIVE_ANALYSIS.md` v2.0), con
   fuentes de 2026-09-27. Aquí solo lo uso para calibrar "piso del mercado" y
   "espacio libre".
5. **Límites:** sin dispositivo, sin acceso a producción desde el sandbox, sin datos
   reales de usuarios (`USER_RESEARCH.md` vacío, `METRICS.md` vacío). Toda prioridad de
   UX es juicio profesional, no evidencia de uso — la RC integral con participantes
   reales (`RC-0001` §7) sigue siendo indispensable.

## 2. Estado reconstruido (para que el lector no dependa del chat)

- **Roadmap:** FIN-001…009 (fundaciones) cerradas; FIN-011…024 (segunda ronda +
  experiencias Inicio/Salud/Presupuesto/Deudas) cerradas; FIN-026 Simulador, FIN-027
  ingresos, FIN-028 movimientos, FIN-029 Telegram cerradas; **programa EOC completo**
  (FIN-030 umbrella → 031 espina → 032 catálogo → 034 selector → 035 Registrar puerta
  única → 036 confirmación por corte → 037 profundidad Beta-guiada, cerrada 2026-07-18).
- **Pendientes registrados:** FIN-010 (salida a producción: gates legales), FIN-025
  (aviso proactivo de mora, fast-follow), Copiloto como experiencia UX (⏳), RC integral,
  y **`SPRINT-PULIDO-001`** (directiva del CTO al Arquitecto, 2026-07-18, **no
  ejecutada**: P0 navegación atrás en Registrar + `useFocusEffect` en DebtDetail; P1
  copy de acuses; P2 toast de deshacer + logros in-line; P3 datos de detalle + tokens).
- **Despliegue:** APK Android SDK 54 (`runtimeVersion` 0.1.0), OTA canal `preview`
  vía `npm run ota:publish` (§40), backend Node en Render free + Neon. Último incidente
  de proceso (2026-09-26): intento de subir a SDK 57 revertido (`362d279`) porque
  habría roto la APK instalada — el preflight OTA **no** valida compatibilidad
  SDK↔APK.
- **Gates abiertos:** DPA Anthropic, PIA Ley 1581, validación legal del Score para
  público, política de tiendas/IAP, precio Millo+.

## 3. Inconsistencias documentales encontradas (Paso 4.2 del arranque en frío)

| # | Hallazgo | Quién resuelve |
|---|---|---|
| D1 | `ESTADO_PROYECTO.md` está en 2026-07-13: dice "FIN activa: FIN-030", "Simulador no iniciado", "Agentes: CTO, Arquitecto, Auditor, CPSAO", "Gobernanza v3.19". La realidad es EOC completo, DEC-ORG-001 (v3.20, sin Auditor/CPSAO) y sprint de pulido pendiente. Violación de Paso 6 del procedimiento (ESTADO y BACKLOG se actualizan en el mismo acto). | CTO |
| D2 | `PRODUCT_VISION.md` habla de **"Milla"**; la app, `app.json` y toda la gobernanza reciente dicen **"Millo"**. Y la APK aún muestra **"ToCosas v0.1.0"** (`SettingsScreen.tsx:189`) y "tu número de ToCosas" (`LinkWhatsAppScreen.tsx:71`); `package.json` `name: tocosas-app`. Tres marcas conviven. | Fundador (nombre oficial) → mantenimiento |
| D3 | `render.yaml` declara `name: tocosas-api`; el servicio real es `milla-backend`. Cosmético pero confunde en un blueprint de Render. | CTO |
| D4 | `COMPETITIVE_ANALYSIS.md` estuvo vacío desde 2026-07-06 pese a que `PRODUCT_VISION.md` §10 declara sus diferenciadores como "hipótesis a validar ahí". Resuelto en este acto (v2.0), pendiente de validación §15. | CTO |
| D5 | `eas.json` perfil `production` apunta a `https://api.tocosas.co/v1` — dominio que no existe en ningún otro documento. Si algún día se construye con ese perfil, la app nacerá apuntando a nada. | CTO |
| D6 | `PROCEDIMIENTO-ARRANQUE-EN-FRIO.md` sigue citando CPSAO/Auditor/`AUD` como roles vivos. | CTO |

## 4. Flujos profundos — hallazgos

Cada flujo: qué hace hoy (verificado), dónde se rompe o se queda corto, severidad
(🔴 defecto · 🟠 fricción fuerte · 🟡 mejora · 🟢 correcto), referencia.

### 4.1 Alta y sesión (Login → Register → Main)

- 🟢 Propuesta de valor en Login clara (4 pilares, "Crear cuenta" primario).
- 🔴 **Sin "olvidé mi contraseña"**: `auth.controller.ts` expone solo `register/login/
  refresh/me`. Un usuario que olvide su clave pierde todos sus datos. Es la primera
  causa de churn evitable en apps con login propio (hipótesis; es criterio de
  industria).
- 🔴 **Sin consentimiento de tratamiento de datos en el registro**: `UserSettings.
  dataConsentAt` existe en BD, pero ninguna pantalla lo captura ni el backend lo
  exige. Con la Alpha/Beta usando datos financieros reales, es un hueco de Ley 1581
  (`ALPHA-004`/`PIA-ALPHA` lo tratan como documento, no como flujo en la app).
- 🔴 **Sin borrar cuenta desde la app** (ni endpoint). Las tiendas exigen una vía de
  eliminación de cuenta para apps con registro (**verificar política vigente de
  Google Play antes de FIN**).
- 🟠 **Sin onboarding**: tras registrarse, `RootNavigator` cae directo en `MainTabs` con
  "Te queda $0", "Deuda total $0", "Patrimonio $0". `User.onboardingDone` existe y
  nunca se usa. El primer minuto —el que la promesa §11 de la visión dice que debe
  dar claridad— hoy da ceros.
- 🟡 Visión original: registro por WhatsApp/teléfono. Hoy solo correo+clave; el
  teléfono se vincula después. Coherente con el pivote, pero el campo `phoneE164` en
  `User` sugiere que el diseño lo previó.

### 4.2 Inicio (Dashboard)

- 🟢 Hero único "Te queda" con fecha concreta e interpretación semáforo; deuda total
  con próximo pago; puente narrativo a abono; movimientos ejecutivos; racha al
  cierre. Buen orden narrativo (FIN-017/018).
- 🔴 **Datos viejos al volver**: `DashboardScreen` no usa `useFocusEffect`; sus 3
  `useApi` cargan una vez al montar. Al registrar un gasto en la pestaña Registrar y
  volver a Inicio, "Te queda" sigue mostrando el valor anterior hasta un
  pull-to-refresh. Misma causa raíz que el P0-2 del sprint (`DebtDetailScreen`).
  También afecta `CopilotScreen` y `SettingsScreen` (grep: solo Accounts, IncomeProfile,
  Budget, DebtsList y Health tienen `useFocusEffect`).
- 🔴 **"Ver el detalle completo de tus movimientos →" navega a Registrar**
  (`DashboardScreen.tsx:284` → `Main/Add`). No existe pantalla de historial. El usuario
  que quiere ver su mes completo no puede.
- 🟠 Sin gráfica alguna: las "barras" por categoría son `View` con ancho porcentual.
  Ningún competidor del mapa carece de al menos un gráfico de tendencia.
- 🟡 Mensaje "Sin conexión con el backend" se muestra por cualquier `summary.error`,
  incluidos 401/500 — copy genérico para causas distintas.

### 4.3 Registrar (puerta única, FIN-035)

- 🟢 Una decisión por pantalla; "¿cómo pagaste?" contextual; acuse que enumera y
  "Deshacer" real; compra con tarjeta reusa el motor del bot; offline-first para caja.
- 🔴 **Sin atrás** (P0-1 del sprint, ya diagnosticado por el CTO; sigue vigente).
- 🔴 **Monto parseado con `parseFloat(amount.replace(/[^\d.]/g,''))`**
  (`AddTransactionScreen.tsx:69`): "45.000" (mil con punto, como escribe Colombia) se
  convierte en **45**. Viola §39 (BT-001 solo se corrigió en `AddDebtScreen`). Misma
  regla rota en **13 sitios**: `EditTransactionModal:55`, `BudgetScreen:282`,
  `AccountsScreen:176`, `IncomeProfileScreen:119/194/202`, `SimulatorScreen:213`,
  `DebtDetailScreen:24/243/382/490/665`. `utils/format.ts` ya tiene `parseAmount` y
  `parseDecimal`; nadie fuera de AddDebt los usa.
- 🟠 Fallback offline **solo para efectivo/cuenta**: una compra con tarjeta sin red
  falla con error (no encola). El outbox solo soporta `create` de `transaction`
  (`syncEngine.ts:63`); editar/anular offline no existe.
- 🟠 El acuse del ingreso no trae consecuencia (P1 del sprint) y ningún acuse
  menciona salud/Score.
- 🟡 Categorías en cuadrícula sin "crear categoría" ni favoritos; sin "repetir el
  último gasto"; sin plantillas de gasto frecuente (los trackers manuales del mercado
  viven de esa velocidad).

### 4.4 Deudas (lista → detalle → alta)

- 🟢 Frente completo + orden de ataque del motor + costo en pesos + mora sin culpa;
  detalle despachado por `scheduleModel` (amortizado / cuotas por compra / informal),
  cupo derivado, confirmación por corte, lecturas de profundidad, abono con recibo,
  seguros, tabla de amortización. **Es la mejor parte del producto y la más
  diferenciada del mercado.**
- 🔴 `DebtDetailScreen` sin `useFocusEffect` (P0-2 del sprint) y **ignora `error`**:
  un fallo de red se ve como "Cargando…" eterno (P3 del sprint).
- 🟠 El detalle es una columna de 8–10 tarjetas sin jerarquía visual: para una tarjeta
  de crédito, "Tu tarjeta" (cupo) está bien arriba, pero para un crédito amortizado
  el usuario ve saldo → confirmación → lecturas → mora → resumen → abono → seguros →
  simulador → 12 cuotas. Falta un "resumen de un vistazo" y secciones colapsables.
- 🟠 Alta (FIN-034) buena, pero `startDate` se fija en "hoy" (`AddDebtScreen.tsx:112`)
  sin preguntar: una deuda que empezó hace 2 años nace con cronograma desde hoy. El
  Fundador pidió fecha de inicio el 2026-07 (transcripción); no se ve implementado
  en el alta.
- 🟡 Sin pantalla de **editar deuda** (nombre, tasa, cuota, cupo) fuera de la
  confirmación por corte; el copy "Registra el cupo de tu tarjeta al editarla" apunta
  a algo que no existe en la UI.
- 🟡 Sin recordatorios configurables: `Reminder` (modelo, offsets 3/1/0, canales)
  existe, `reminders.controller.ts` existe, **ninguna pantalla lo consume**.

### 4.5 Presupuesto

- 🟢 "Te queda" único, por día, con lo protegido visible y su política honesta
  ("preferimos apartar de más"); puente al simulador.
- 🟠 **No hay presupuesto por categoría** (límite mensual para "Comida", alerta al
  80 %). Es el significado que el mercado da a la palabra "Presupuesto"; el usuario
  que llega desde Wallet/Mobills/YNAB buscará sobres y no los hallará. Debe diseñarse
  **sin** crear una segunda fórmula de "Te queda" (§32): los sobres reparten lo libre,
  no lo redefinen.
- 🟡 La pestaña mezcla decisión (arriba) con administración de gastos fijos (abajo) y
  un botón a "Cuentas y patrimonio" que parece ajeno.

### 4.6 Salud

- 🟢 La experiencia más cuidada: cold-start con emoción, gate legal explicado (BT-006),
  pilares neutros, "lo que más te frena", jugada, "cómo se calcula", historia
  narrada, puente al Copiloto.
- 🟡 Sin visualización del Score (anillo, sparkline); el número solo en texto.
- 🟡 Histórico gateado a Millo+ desde el primer mes: el usuario free nunca ve una
  tendencia (ni de 2 puntos). Revisar la línea free/premium con la banda de precio
  del mercado (`COMPETITIVE_ANALYSIS.md` §4).

### 4.7 Simulador

- 🟢 8 escenarios, precarga desde las jugadas, aviso si el escenario no existe, historial.
- 🟡 Formularios de texto plano; sin sliders ni comparación lado a lado; sin "guardar
  como plan" que conecte con metas (no existen metas).
- 🟡 Límite free 5/mes sin indicador visible de cuántas quedan hasta que falla.

### 4.8 Copiloto

- 🟢 Consentimiento versionado, modo básico honesto, insights y recomendaciones con
  acciones.
- 🟠 En producción la IA está apagada (gate DPA+PIA) → el usuario ve "Modo básico" con
  4 preguntas sugeridas. Como pestaña principal (1 de 7), pesa demasiado para lo que
  entrega hoy.
- 🟡 Sin `useFocusEffect`: insights/recomendaciones no se refrescan al volver.

### 4.9 Ajustes, canales, cuentas, Millo+

- 🟢 Perfil de ingresos, ciclo financiero, proactividad, revocar IA, borrar historial.
- 🟠 Marca "ToCosas v0.1.0" y "tu número de ToCosas" (ver D2).
- 🟠 Vincular WhatsApp/Telegram: se genera un OTP y se pide "envíalo a tu número de
  ToCosas" **sin decir cuál es el número ni dar un botón "Abrir WhatsApp"** con el
  mensaje prellenado (`wa.me/<num>?text=<otp>`). Fricción alta en el momento de mayor
  intención.
- 🟠 Cuentas: el saldo es manual y **ninguna transacción lo mueve**
  (`transactions.service.ts` no toca `Account.currentBalance` pese a que `Transaction.
  accountId` existe). Dos verdades: "Te queda" (transacciones) vs "Liquidez" (saldos
  declarados). Riesgo §32 latente cuando el usuario compare.
- 🟡 Millo+: precio COP 0, "próximamente", canje de código. Correcto para Beta;
  inexistente como negocio.

### 4.10 Transversal: sincronización, errores, tiempos

- 🟢 Timeout 45 s con mensaje de cold start (BT-005); refresh de token; fallback de URL
  a producción (BT-003); preflight OTA.
- 🟠 Cada pantalla dispara 2–4 requests independientes al montar (Inicio: 3; Simulador:
  4). Con Render free dormido, el usuario ve varios spinners escalonados. Un endpoint
  agregado `/v1/home` o caché con `stale-while-revalidate` (React Query / SWR)
  reduciría la percepción de lentitud sin tocar el Motor.
- 🟠 Sin monitoreo de errores en cliente (grep sentry/crashlytics: 0). Un crash en la
  APK del Fundador es invisible para el equipo.
- 🟠 **Frontend sin una sola prueba** (no hay `test` script ni specs). Backend: 50
  specs + 17 e2e. El desequilibrio explica por qué los P0 del sprint son todos de
  frontend.

## 5. Fachada de la APK — auditoría

### 5.1 Transversal

| Aspecto | Hoy (verificado) | Piso del mercado | Juicio |
|---|---|---|---|
| Navegación principal | **7 pestañas** (Inicio, Salud, Deudas, Presupuesto, Registrar, Copiloto, Ajustes) con **emojis** como íconos (`MainTabs.tsx:17-21`) | 4–5 pestañas + acción central; íconos vectoriales | 🔴 En Android los emojis se ven distintos por fabricante, no reciben tinte de activo/inactivo salvo opacidad, y 7 pestañas caben mal en pantallas de 360 dp. `@expo/vector-icons` ya viene con Expo. |
| Sistema de diseño | `colors.ts` (13 colores, 5 spacing, 4 radios), `ui.tsx` (Card, Button, Field, Screen, Row). Sin tipografía definida, sin Toast, Skeleton, EmptyState, Sheet, Chip, Progress | Tokens + 15–25 componentes | 🟠 El CTO ya midió la fuga (~25 márgenes sueltos, hex duplicados, paleta paralela en AddDebt). |
| Color | Verde `#0B6E4F` en header **y** en el hero de cada pantalla → dos bloques verdes apilados en Inicio, Salud, Presupuesto, Deudas, Cuentas, Millo+ | Header neutro + un solo hero de color, o header transparente | 🟠 Pesado; el hero pierde protagonismo. |
| Tipografía | Sistema por defecto, tamaños ad hoc (11, 12, 13, 15, 16, 18, 20, 22, 24, 30, 32, 34, 36, 52) | Escala de 6–8 pasos, una fuente con personalidad para cifras | 🟠 |
| Estados | "Cargando…" en texto; errores en rojo o silencio; vacíos en texto gris | Skeletons, empty states con acción, errores con reintento | 🟠 |
| Gráficas | Ninguna librería; barras `View` | Al menos tendencia y distribución | 🟠 |
| Accesibilidad | 0 `accessibilityLabel`/`Role` en todo `src/` | Etiquetas en botones-icono, tamaño táctil ≥44 dp, contraste AA | 🔴 Los 🗑️ de Presupuesto y Cuentas, los emojis-botón y los "→" de texto son inaccesibles para lector de pantalla. |
| Modo oscuro | 0 referencias a `useColorScheme` | Estándar | 🟡 Viable barato: los colores ya son tokens. |
| Iconografía de dominio | Emojis mixtos (💳 deuda, 💰 presupuesto, 🐷 ahorro, 🏛️ patrimonio, 🩺 salud, 🤖 copiloto) | Set coherente | 🟡 El `RC-0001` ya detectó confusión visual con emojis a baja resolución. |
| Marca | "Millo" en Login; "ToCosas" en Ajustes y WhatsApp; "Milla" en docs | Una | 🔴 |
| Micro-interacciones | Sin haptics, sin animaciones de transición, sin toast temporizado para Deshacer (P2 del sprint) | Feedback táctil en acciones de dinero | 🟡 |

### 5.2 Pantalla por pantalla (resumen)

| Pantalla | Fortaleza | Problema principal | Prioridad |
|---|---|---|---|
| Login | Propuesta de valor legible | Sin recuperar clave; emoji 🪈 como logo | Alta |
| Register | 3 campos, directo | Sin consentimiento de datos; sin validación visible de contraseña | Alta |
| Inicio | Narrativa correcta | Datos viejos al volver; "ver movimientos" lleva a Registrar; doble bloque verde; sin gráfica | Alta |
| Registrar | Una decisión por pantalla; acuse+deshacer | Sin atrás; parseo §39; sin favoritos/repetir | Alta (sprint) |
| Deudas lista | Frente + ataque + costo | Botón "+ Nueva deuda" enterrado bajo el hero, no flotante | Media |
| Deuda detalle | Profundidad única en el mercado | Sin foco-refresh; ignora error; 8–10 tarjetas sin jerarquía; sin editar | Alta (sprint P0/P3) |
| Alta deuda | Selector moderno | `startDate` = hoy; sin fecha de inicio ni saldo original vs actual | Media |
| Presupuesto | "Te queda" claro | Sin sobres por categoría; sección de administración mezclada | Media |
| Salud | La más pulida | Sin visual del Score; histórico gateado desde día 1 | Media |
| Simulador | 8 escenarios | Formularios planos; sin contador de simulaciones free | Media |
| Copiloto | Consentimiento honesto | Pestaña principal para un modo básico; sin refresh | Media |
| Ajustes | Completo | Marca ToCosas; sin borrar cuenta; sin exportar datos | Alta (legal) |
| Cuentas | Patrimonio claro | Saldos no se mueven con movimientos | Media |
| Vincular WA/TG | OTP claro | No dice el número ni abre WhatsApp | Media |
| Millo+ | Beneficios claros | Sin precio ni tienda | Baja (negocio) |
| Logros | Existe | Solo accesible desde una línea del Inicio | Baja |
| Perfil de ingresos | Modelo rico | Parseo §39 en 3 campos | Alta (§39) |

## 6. Modelo de datos — revisión de `schema.prisma`

### 6.1 Lo que está bien (y conviene proteger)

- Dinero en `Decimal(18,2)`, fechas puras en `@db.Date`, `currency Char(3)` en cada
  entidad monetaria (puerta abierta a multi-moneda sin migración destructiva).
- Soft delete uniforme (`deletedAt`) en entidades de usuario; `onDelete: Cascade`
  coherente desde `User`.
- **Outbox transaccional** (`OutboxEvent`) + `MetricReading` particionada por mes con
  upsert idempotente: base sólida para el Motor y para §42.
- Idempotencia natural: `dedupeKey` en `Insight`/`Recommendation`/`FinancialMemoryFact`;
  `@@unique([userId, clientUuid])` en `Transaction` para el offline.
- `Subscription` como única verdad del premium (`UserSettings.plan` = caché) — bien
  documentado en el propio esquema.
- La espina FIN-031: `CardPurchase`/`CardInstallment` con causalidad
  (`sourceTransactionId` reservado) y `DebtFieldReview` con valor anterior
  (reversibilidad §42).
- `AiInteractionLog` registra grupos de campos, nunca texto: minimización real.

### 6.2 Deuda técnica del modelo (verificada)

| # | Hallazgo | Evidencia | Riesgo |
|---|---|---|---|
| M1 | **`Suggestion` es una tabla muerta**: `grep prisma.suggestion` en `backend/src` = 0 usos. Convive con `Insight` y `Recommendation` (tres tablas de "consejo"). | schema:669-685 | Confusión §32 para quien llegue nuevo; migración de limpieza pendiente |
| M2 | `FixedKind.ingreso` sigue en el enum aunque FIN-027 migró el ingreso a `IncomeSource` "sin coexistencia" (DEC-0027 §5.2). | schema:114-117, 1173-1178 | Un `POST /budget/fixed` con `kind: 'ingreso'` volvería a crear una segunda fuente de ingreso. Verificar que el DTO lo rechace. |
| M3 | Enums duplicados: `ReminderChannel` (push/whatsapp/telegram/**email**) vs `NotificationChannel` (push/whatsapp/telegram). No existe módulo de email. `WaLinkStatus` reutilizado por `TelegramLink`. | schema:91-96, 238-242, 634-651 | Semántica ambigua; `email` promete un canal inexistente |
| M4 | `Device.fcmToken` pero el sender real es **Expo Push** (`expo-push.sender.ts`). | schema:653-667 | Nombre engañoso; si algún día hay FCM directo, colisión |
| M5 | `Transaction.accountId` existe pero **ninguna operación mueve `Account.currentBalance`**; `Account` declara "saldo manual es la fuente de verdad". | transactions.service.ts (0 referencias a account balance) | Dos verdades de liquidez (§32 latente); `TxKind.transferencia` sin `fromAccount/toAccount` |
| M6 | `Debt.currentBalance` **almacenado** también para tarjetas, cuyo saldo utilizado se **deriva** en `CardService` (comentario en schema:391-394). | schema:383, 394 | Verificar en código que para `cuotas_por_compra` la columna no se lea en ningún cálculo (§32) |
| M7 | `User.email @unique` + soft delete: un usuario borrado (`deletedAt`) bloquea el re-registro con el mismo correo. Igual `WhatsappLink.phoneE164 @unique`. | schema:280, 619 | Diseño de "borrar cuenta" (4.1) lo choca de frente |
| M8 | `UserSettings.dataConsentAt` y `User.emailVerified`/`onboardingDone` existen y **no tienen flujo**. | grep frontend/backend | Campos huérfanos = promesas no cumplidas |
| M9 | Índices: `Transaction` tiene `(userId, occurredAt)` y `(debtId)`; falta `(userId, kind, occurredAt)` y `(categoryId)` para la futura pantalla de historial con filtros; `Debt` sin `(userId, status)`; `Reminder` sin `(userId, isActive)`. | schema | Rendimiento al crecer; no urgente en Beta |
| M10 | `Transaction.attachmentUrl`, `parseConfidence`, `rawMessage`, `TxSource.ocr/import` — preparados para foto/importación que no existen. | schema:568-575 | Bien como reserva; documentar como "dormido" |

### 6.3 Lo que falta para el roadmap (requiere ARQ → DEC, no se propone implementar aquí)

| Entidad candidata | Para qué | Cuidado §32 |
|---|---|---|
| `SavingsGoal` (meta) | Metas con nombre, objetivo, fecha, cuenta origen; progreso | El "ahorro total" ya existe (Inicio); la meta reparte, no redefine |
| `CategoryBudget` (sobre) | Límite mensual por categoría, alerta | Suma de sobres ≤ "Te queda"; una sola fuente del disponible |
| `RecurringRule` | Detectar/declarar recurrentes, avisar cambios de monto | Reemplaza gradualmente a `FixedItem` o lo extiende |
| `Transfer` (o `Transaction.fromAccountId/toAccountId`) | Movimientos entre cuentas sin doble gasto | Coherente con M5 |
| `DebtMonthlySnapshot` | Los 2 sub-ítems excluidos del sprint ("progreso vs mes anterior", "cupo liberado") | `FinancialSnapshot.extra` podría absorberlo sin tabla nueva |
| `Household` / `Membership` | Pareja/hogar (Monarch, YNAB, Wallet) | Multi-tenant real: horizonte 3 |
| `ProductEvent` (telemetría anónima) | `METRICS.md`: D1/D7/D30, funciones usadas, tiempo hasta primer valor | Hoy solo existe `billing.funnel` |
| `AccountDeletionRequest` + job | Borrar cuenta con período de gracia | Resuelve M7 |

## 7. Plataforma, calidad y operación

- **Preflight OTA sin verificación SDK↔APK**: agregar al gate la comparación de
  `expo` en `package.json`/`node_modules` contra el SDK con el que se construyó la
  APK vigente (un archivo `apk-baseline.json` con `sdk`, `runtimeVersion`, fecha).
  Lección del 2026-09-26; costo bajo; encaja en §40 como mejora del proceso (no FIN).
- **Cold start Render free** (30–60 s): opciones —cron externo de keep-alive cada 10
  min (gratis, ético dentro de los términos), o plan pagado (no autorizado, §36.4).
  Mientras tanto, el frontend puede mostrar un estado "despertando servidor" distinto
  de "sin conexión".
- **Observabilidad cliente**: Sentry (o `expo-error-reporter`) en la APK; hoy 0.
- **Pruebas frontend**: al menos pruebas de los helpers (`format.ts`, `syncEngine`) y
  smoke de navegación con `@testing-library/react-native`. El §36 exige testing antes
  de integrar; el frontend está exento de hecho.
- **Datos de producto**: sin telemetría, `METRICS.md` no puede llenarse; la promesa
  verificable de la visión (§11: "en menos de un minuto…") no se mide.

## 8. Boceto de mejoras — horizontes y candidatas

Cada candidata: `BP-nn` · problema/evidencia · propuesta · valor según
`PRODUCT_VISION.md` §13 · esfuerzo (S/M/L) · ¿toca Registrar? (aviso anticipado
obligatorio) · ¿modelo nuevo? · mercado. **Ninguna está autorizada.**

### H0 — Higiene y mantenimiento (§38: defectos, no FIN; días, no semanas)

| ID | Qué | Evidencia | Esfuerzo | Registrar | Modelo |
|---|---|---|---|---|---|
| BP-01 | **Ejecutar `SPRINT-PULIDO-001`** tal como lo ordenó el CTO (P0→P3) | correspondencia 2026-07-18 | M | Sí (P0-1) — el aviso ya lo dio el Fundador al ordenar el sprint | No |
| BP-02 | **§39 en los 13 sitios**: reemplazar `parseFloat(x.replace(...))` por `parseAmount`/`parseDecimal` | §4.3 | S | Sí (AddTransaction:69) | No |
| BP-03 | **`useFocusEffect` en Inicio, Copiloto, Ajustes** (misma clase que P0-2) | §4.2 | S | No | No |
| BP-04 | **Marca única**: "ToCosas"→"Millo" en Settings/LinkWhatsApp/package/colors; decidir Milla vs Millo en docs (D2) | §3 | S | No | No |
| BP-05 | **Preflight OTA + baseline de APK** (SDK/runtime) | §7 | S | No | No |
| BP-06 | **Vincular WhatsApp/Telegram: mostrar el número + botón "Abrir WhatsApp" con OTP prellenado** | §4.9 | S | No | No |
| BP-07 | **Errores visibles** en DebtDetail y secciones; estado "despertando servidor" | §4.4, §7 | S | No | No |
| BP-08 | Actualizar `ESTADO_PROYECTO.md`, `render.yaml name`, `eas.json production`, procedimiento de arranque (D1, D3, D5, D6) | §3 | S | No | No |

### H1 — Fachada Millo v1 (candidata a UNA FIN de experiencia, "Sistema de diseño + navegación")

| ID | Qué | Propuesta | Valor §13 | Esfuerzo | Registrar | Modelo |
|---|---|---|---|---|---|---|
| BP-10 | **Navegación 5 + 1** | Pestañas: **Inicio · Deudas · [＋ Registrar] · Salud · Más** (Presupuesto vive como sección de Inicio o bajo "Más"; Copiloto como botón flotante/entrada en Inicio y Salud; Ajustes bajo "Más"). Íconos vectoriales con estado activo. **Alternativa B:** mantener 7 pero con íconos vectoriales y etiquetas cortas. Decisión de producto del Fundador. | Claridad antes que cobertura (§9) | M | No (solo dónde vive) | No |
| BP-11 | **Sistema de diseño Millo v1** | Tokens: tipografía (escala 8 pasos, fuente con dígitos tabulares para cifras), micro-escala de spacing, colores semánticos (éxito/aviso/peligro/neutro, scrim, superficie elevada), radios. Componentes: `Toast` (con cuenta regresiva para Deshacer), `Skeleton`, `EmptyState`, `Sheet`, `Chip`, `ProgressRing`, `Sparkline`, `SectionHeader`, `IconButton` accesible. Header neutro (blanco/superficie) y un solo hero verde por pantalla. | Consistencia = confianza | L | No | No |
| BP-12 | **Onboarding de 3 pasos** | Nombre → "¿de qué vives?" (perfil de ingresos mínimo: monto neto y día) → "¿tienes alguna deuda?" (alta mínima o "no por ahora") → Inicio con **valor real en 60 segundos** (la promesa §11). Marca `onboardingDone`. | Promesa verificable | M | No | No (campo existe) |
| BP-13 | **Accesibilidad mínima** | `accessibilityLabel`/`Role` en toda acción, tamaño táctil 44 dp, contraste AA, textos escalables | Adulta, no excluyente | S–M | No | No |
| BP-14 | **Modo oscuro** | `useColorScheme` + tokens duales | Estándar 2026 | S–M (tras BP-11) | No | No |
| BP-15 | **Gráficas honestas** | Anillo del Score (Salud), sparkline "Te queda" por ciclo (Inicio), barra "día X de Y del ciclo", donut de gasto por categoría | Explicable siempre (§7) | M | No | No (datos existen) |
| BP-16 | **Deuda detalle con jerarquía** | Resumen de un vistazo (saldo, cuota, próximo pago, libre de deuda, intereses restantes) + secciones colapsables + acción primaria fija ("Abonar") | Claridad | M | No | No |
| BP-17 | **Historial de movimientos** | Pantalla con lista infinita, filtros (tipo, categoría, cuenta, deuda, fecha), búsqueda, totales del período; el enlace de Inicio apunta aquí | Piso del mercado; hoy inexistente | M | No (lee, no escribe) | Índices M9 |

### H2 — Capacidades que el mercado da por sentadas (Laboratorio → IDEA → FIN)

| ID | Qué | Propuesta | Valor §13 | Esfuerzo | Registrar | Modelo |
|---|---|---|---|---|---|---|
| BP-20 | **Recuperar contraseña + borrar cuenta + consentimiento en registro + exportar datos** | Flujo legal completo (Ley 1581, tiendas); `dataConsentAt` capturado; borrado con gracia de 30 días resolviendo M7 | Protección de datos (§8) | M | No | `AccountDeletionRequest` |
| BP-21 | **Metas de ahorro** | "Cajitas de Millo" sin captar dinero: meta, fecha, aporte sugerido desde lo libre, progreso; enlaza con `proyeccion_ahorro` y con cuentas marcadas | Claridad + simulación honesta | M | No | `SavingsGoal` |
| BP-22 | **Sobres por categoría** | Límite mensual por categoría dentro de lo libre; alerta al 80 %; una sola fuente del disponible (§32) | Piso del mercado | M | Sí (acuse muestra sobre) → **aviso anticipado** | `CategoryBudget` |
| BP-23 | **Recordatorios configurables** | Pantalla que consume `Reminder` (offsets, canales, silencio); base para FIN-025 | Calmada, no ansiosa | S–M | No | No (existe) |
| BP-24 | **Registro más rápido** | Favoritos/repetir último; atajo desde Inicio; **audio y foto** por WhatsApp/Telegram (el bot ya existe; `ocr` está reservado) | Igualar inmediatez de Finy/Chanchito | M–L | **Sí → aviso anticipado** | No / `attachmentUrl` |
| BP-25 | **Cuentas coherentes** | Movimientos con cuenta actualizan saldo (o saldo derivado = declarado ± movimientos); `Transfer` entre cuentas | §32 liquidez | M | Sí → aviso | `Transfer` |
| BP-26 | **Editar deuda + fecha de inicio real** | Editar nombre/tasa/cuota/cupo/día; alta con `startDate` y saldo original vs actual | Verdad del cronograma | S–M | No | No |
| BP-27 | **Recurrentes** | Declarar/detectar suscripciones y cargos fijos; avisar cuando cambian (Rocket/Emma) | Anti-fuga silenciosa | M | No | `RecurringRule` |
| BP-28 | **Telemetría de producto anónima** | Eventos mínimos para `METRICS.md`; medir la promesa §11 | Medir con datos, no percepciones | S | No | `ProductEvent` |
| BP-29 | **Offline completo** | Editar/anular en outbox; compra con tarjeta encolable | Offline-first real | M | Sí → aviso | No |

### H3 — Estratégico (12–36 meses; depende de gates y de evidencia de Beta)

| ID | Qué | Nota |
|---|---|---|
| BP-30 | **Importación de extractos (PDF/CSV) → puerto de agregación** listo para los estándares SFC (Decreto 0368/2026) | Diferenciador: importar **a un motor de deuda**, no a un tracker |
| BP-31 | **Copiloto con IA real** tras DPA+PIA; mientras, ampliar plantillas deterministas ("¿por qué cambió mi Te queda hoy?") | Gate legal |
| BP-32 | **Hogar/pareja** | Modelo multi-tenant; mercado lo cobra al doble |
| BP-33 | **Score público** tras validación legal; comunicación "no es puntaje crediticio" | Gate legal |
| BP-34 | **Precio Millo+** en banda USD 20–30/año equivalente COP, con telemetría de costo (`DEC-0009` §4.6) | Ver `COMPETITIVE_ANALYSIS.md` §4 |
| BP-35 | **Gota a gota como bandera**: lectura de costo real anualizado y camino de salida, campaña de producto | Único en el mercado revisado |

## 9. Secuencia recomendada (para que el CTO la convierta en FIN, si decide hacerlo)

1. **Ola 0 (mantenimiento, sin FIN):** BP-01 (sprint ya ordenado) + BP-02…BP-08. Sale
   por OTA + auto-deploy. Cierra los defectos que hoy le restan credibilidad a la Beta
   (montos mal parseados, datos viejos, marca).
2. **Ola 1 (una FIN de experiencia):** BP-10 + BP-11 + BP-12 + BP-13 + BP-15 + BP-17 —
   "Fachada Millo v1". Es la FIN que cambia la primera impresión sin tocar el Motor ni
   el modelo. BP-14 y BP-16 como fast-follow.
3. **Ola 2 (legal + piso de mercado):** BP-20 primero (bloquea el lanzamiento público),
   luego BP-21, BP-23, BP-26, BP-28; BP-22/24/25/29 requieren **aviso anticipado al
   Fundador** por tocar Registrar.
4. **Ola 3:** H3 según gates.

## 10. Respuesta al filtro §31 por horizonte ("¿qué perdería el usuario si no existiera?")

- **H0:** perdería la verdad de sus números (45.000 → 45; "Te queda" viejo). Sin H0,
  todo lo demás miente.
- **H1:** perdería la posibilidad de descubrir lo que Millo ya sabe hacer: hoy un
  usuario nuevo ve ceros, 7 emojis y "ToCosas"; abandona antes del detalle de deuda.
- **H2:** perdería paridad con cualquier tracker de USD 25/año; y, en BP-20, perdería
  derechos legales básicos sobre sus datos.
- **H3:** perdería el salto de "app que registro" a "app que ve toda mi deuda sin que yo
  la teclee".

## 11. Riesgos y "no hacer"

- **No** convertir este documento en 20 FIN: "un FIN a la vez" y "claridad antes que
  cobertura" (§9 de la visión). La secuencia §9 es una propuesta, no un plan.
- **No** tocar Registrar sin el aviso anticipado del Fundador (BP-22/24/25/29).
- **No** crear una segunda fórmula de "Te queda" con sobres o metas (§32).
- **No** encender IA ni Score público por presión de mercado antes de los gates.
- **No** cambiar de SDK sin construir una APK nueva y actualizar el baseline (BP-05).
- **Riesgo de método:** toda la priorización de UX es sin usuarios reales. La RC
  integral y la Beta con más participantes son más valiosas que cualquier tabla de
  este documento; `USER_RESEARCH.md` sigue vacío.

## 12. Anexo — cifras del repositorio (2026-09-27)

| Métrica | Valor |
|---|---|
| Pantallas frontend | 20 (`src/screens`), 5.492 líneas |
| Componentes compartidos | 5 (`ui.tsx`) |
| Pruebas frontend | 0 |
| Módulos backend | 27 |
| Controladores | 22 |
| Specs unitarios backend | 50 archivos |
| Suites e2e | 17 |
| Modelos Prisma | 41 · Migraciones: 24 |
| Sitios con parseo fuera de §39 | 13 |
| Pantallas sin `useFocusEffect` que muestran datos derivados | 3 (Inicio, Copiloto, Ajustes) + DebtDetail (sprint P0-2) |
| `accessibilityLabel` | 0 |
| Referencias a "ToCosas" visibles al usuario | 2 |

---

*Este Blueprint no implementa ni decide. Queda a la espera de la lectura del Fundador y
de la evaluación del CTO, quien determina qué entra al Backlog y en qué orden (§6, §7,
§13).*
