# Registro oficial de defectos (Bug Tracker) — Millo

- **Naturaleza:** registro append-only de defectos detectados durante el uso real de la
  aplicación. Trazabilidad obligatoria **defecto → clasificación → corrección → commit**
  (`GOBERNANZA.md` §38).
- **Regla de clasificación (§38):** todo defecto lo evalúa el CTO de inmediato y lo
  clasifica en: implementación · arquitectura · experiencia de usuario · nueva necesidad
  funcional. **Solo las nuevas necesidades funcionales se convierten en FIN**; los
  defectos se corrigen por el flujo de mantenimiento, preservando la estabilidad.
- **Numeración:** `BT-XXX` (Beta Técnica / Bug Tracker), correlativa.

| ID | Descripción | Clasificación (CTO) | Estado | Corrección / commit |
|----|-------------|---------------------|--------|---------------------|
| BT-001 | Registrar una tasa de interés con coma decimal (`15,35`) producía **500**: el frontend borraba la coma → `1535`, que desbordaba `interest_rate Decimal(7,4)` (máx 999.9999) en Prisma. | **Defecto de implementación** (parseo de entrada). No es FIN. | ✅ **Corregido y verificado** | Ver detalle abajo. Commit del fix + este registro en el mismo acto (§34). |
| BT-002 | No se podían editar ni anular movimientos ya registrados. | Continúa dentro de **FIN-028** (decisiones del Fundador ya emitidas). | ✅ Cubierto por `FIN-028` (CERRADA, `65104e1`) | `docs/oficial/DEC-0028-Gestion-de-Movimientos.md` |
| BT-003 | La app mostraba "Sin conexión con el backend" pese a que Render/`/v1/health` respondían. **Incidente causado por el CTO** al publicar el primer OTA: `eas update` no hereda el `env` del perfil de build → el bundle cayó al fallback `localhost`. | **Defecto operativo/de configuración** (despliegue OTA). No es FIN. | ✅ **Corregido y publicado por OTA** | Ver detalle abajo. |
| BT-004 | Un ingreso fijo **declarado** (perfil de ingresos, FIN-027) no aparece en "Te queda para gastar". | **Decisión de producto del Fundador** — cambia la definición §32 de "Te queda". | ✅ **Resuelto** (decisión del Fundador, 2026-07-14) — implementado y verificado | Análisis + resolución abajo. Commit del fix registrado. |
| BT-005 | Al anular un pago de deuda desde la app, el botón "Guardar" queda cargando y "Anular" no se habilita (parece colgado). | **Defecto de experiencia** — el backend anula bien (0.93s, deuda regenerada); la petición se cuelga sin timeout cuando el backend está dormido (Render free). | ✅ **Corregido** (timeout en el cliente HTTP) + deuda del Fundador regenerada manualmente | Detalle abajo. |
| BT-006 | Salud muestra "Score Millo: —" sin contexto. | **Dos partes:** (a) el Score estaba **apagado en producción por gate LEGAL** (`HEALTH_SCORE_PRODUCTION_ENABLED=false`, `DEC-0004` §10.3) → backend 503; (b) el frontend no manejaba ese 503 y mostraba un "—" mudo → **defecto de experiencia**. | (a) ✅ **Score ACTIVADO en Beta cerrada** por decisión ejecutiva del Fundador (2026-07-14); (b) ✅ **Corregido** (mensaje contextual) | Detalle + resolución abajo. |
| BT-007 | Inconsistencia entre pantallas: Inicio dice "68 de cada 100 libres" y Salud "Capacidad de ahorro: 1 de cada 100" — el usuario percibe que Millo se contradice. | **Decisión de producto del Fundador** — "Capacidad de ahorro" debe ser el MISMO concepto que "Te queda para gastar" (§32), no el ahorro realizado. | ✅ **Corregido** (el pilar de Ahorro del Score toma la razón de "Te queda" de `SpendableService`, fuente única) | Detalle abajo. |
| BT-008 | Montos con punto de miles mal parseados: "45.000" se guardaba como **45** en 13 puntos de la app (Registrar, editar movimiento, gasto fijo, cuentas, activos, perfil de ingresos ×3, simulador, detalle de deuda ×5). BT-001 solo había corregido el alta de deuda. | **Defecto de implementación** — violación de la invariante §39. | ✅ **Corregido** (2026-09-27, `MANT-001`) | Todos usan `parseAmount`/`parseDecimal` de `utils/format.ts`; grep `replace(/[^\d.]/g` fuera de `utils/format.ts` = 0. |
| BT-009 | Inicio, Copiloto y Ajustes mostraban datos viejos al volver a la pestaña (p. ej. "Te queda" no cambiaba tras registrar un gasto hasta hacer pull-to-refresh). Misma causa que el P0-2 del sprint en `DebtDetailScreen`. | **Defecto de implementación** (sin `useFocusEffect`; las pantallas de tab no se desmontan). | ✅ **Corregido** (2026-09-27) | `useFocusEffect` recarga las fuentes al ganar foco en las 4 pantallas. |
| BT-010 | Marca ajena visible al usuario: "ToCosas v0.1.0" en Ajustes y "tu número de ToCosas" en Vincular WhatsApp; `package.json` `tocosas-app`/`tocosas-backend`; Swagger "ToCosas API". | **Defecto de experiencia** (identidad). | ✅ **Corregido** (2026-09-27) | Todo dice Millo. Se conservan a propósito `co.tocosas.app` (identidad de la APK instalada) y `tocosas.db`/claves de SecureStore (continuidad de datos y sesión de los Beta). |
| BT-011 | "Ver el detalle completo de tus movimientos →" en Inicio navegaba a **Registrar**; no existía pantalla de historial. | **Nueva necesidad funcional** → `FIN-038` (historial con filtros/búsqueda/paginación). | ✅ **Resuelto** en `FIN-038` | `TransactionsScreen` + `GET /transactions?q&before&limit`. |
| BT-012 | La barra inferior de pestañas queda **debajo de los botones del sistema Android** (◁ ○ □): las etiquetas Inicio/Deudas/Registrar/Salud/Más se ven cortadas y los botones del teléfono se superponen (captura del Fundador, OTA `03d425e3`). | **Defecto de implementación** — Expo SDK 54 dibuja la app de borde a borde en Android; `MainTabs` fijaba `height: 64` sin sumar el inset inferior real del dispositivo. Ninguna pantalla usaba `useSafeAreaInsets`. | ✅ **Corregido y verificado por el Fundador** (2026-09-27, OTA `74f6a9af`) | `navigation/insets.ts` (fuente única del inset): la barra suma `insets.bottom`; los stacks sin barra (Auth, Onboarding, Presupuesto, Copiloto, Ajustes, historial, vinculaciones…) reservan el inset vía `contentStyle`; las hojas inferiores (editar movimiento, consentimiento IA) también. |
| BT-013 | El ícono de la app en el celular es el **robot genérico de Android** sobre fondo verde. | **Omisión** — `app.json` no declaraba `icon` ni `adaptiveIcon.foregroundImage` (nunca hubo carpeta `assets/`). | 🟡 **Preparado; requiere APK nueva** | `assets/icon.png` y `assets/adaptive-icon.png` (M blanca + punto ámbar sobre verde, generados por el Arquitecto) ya referenciados en `app.json`. El ícono es nativo: **no llega por OTA** (`EAS-UPDATE.md` §1); se verá al construir la próxima APK (`eas build`), decisión del Fundador. |
| BT-014 | Al cerrar sesión o borrar la cuenta, la app conservaba la caché local (`local_transactions`, `outbox`): una cuenta nueva en el mismo teléfono vería movimientos de la anterior. Detectado al preparar el reinicio de datos del Fundador (2026-09-28). | **Defecto de implementación** (FIN-002 outbox + FIN-039 borrado). | ✅ **Corregido** (2026-09-28) | `logout({ wipeLocal: true })` en Cerrar sesión y Eliminar cuenta; `register` limpia antes de persistir. El cierre forzado por token vencido NO borra (protege movimientos pendientes). |
| BT-015 | Nueva deuda: al escribir "Da" y tocar **Davivienda** (banco sin producto sugerido) la pantalla pedía "Elige el producto de Davivienda" pero la lista de tipos seguía filtrada por "Da" → vacía. No había forma de continuar (Fundador, 2026-09-28, primer uso real). | **Defecto de implementación** (FIN-032/034: el filtro de tipos ignoraba el estado "entidad elegida"). | ✅ **Corregido** (2026-09-28) | Con entidad elegida se muestran TODOS los tipos del catálogo, la entidad queda fija arriba con "Cambiar" y se oculta la lista de entidades. |
| BT-016 | Inicio mostraba **"Deuda total $0 · 1 deuda"** con una tarjeta que tenía $3.983.020 usados (Fundador, 2026-09-28, primer uso real de FIN-042). | **Defecto de implementación** (FIN-031): el resumen sumaba `currentBalance`, que en tarjetas es 0 por diseño (el saldo se deriva de las compras). | ✅ **Corregido** (2026-09-28) | `summaryForUser` suma las cuotas pendientes de las compras para `cuotas_por_compra`; el resto sigue con `currentBalance`. |
| BT-017 | El bot repartió el saldo del extracto en **1 cuota** de $3.983.020: leyó "pago total" = saldo completo y lo tomó como compromiso mensual. | **Defecto de regla** (FIN-042): en extractos colombianos "pago total" es pagar todo; lo mensual es el **pago mínimo**. | ✅ **Corregido** (2026-09-28) | `cardMonthlyPayment`: manda el mínimo; el total solo si es claramente parcial (< 90 % del saldo); sin ninguno, 12 cuotas. El acuse dice "Pago mensual (mínimo)". |
| BT-018 | Un **pago a una tarjeta no descontaba sus cuotas** y, como el saldo de BD es 0, cualquier pago la marcaba **"pagada"** y borraba el vencimiento (detectado al responder la pregunta del Fundador sobre abonar vs pagar cuota, 2026-09-28). | **Defecto de implementación pre-existente** (FIN-031: el flujo de pago se diseñó en `ARQ-0031` y no se implementó). | ✅ **Corregido** (2026-09-28, `FIN-043`) | Pago → cuotas pendientes en orden (con separación de cuota parcial y trazabilidad `paid_tx_id`); anular → reverso exacto; abono a capital bloqueado con mensaje en tarjetas. e2e `fin043` 5/5. |
| BT-019 | Deudas: "Tus cuotas suman $0 al mes" con "Con seguros y cargos: $3.983.020 al mes", y la tarjeta con "Cuota $0". | **Defecto de implementación**: dos autoridades (monthlyPayment null en tarjetas vs desembolso real). | ✅ **Corregido** (2026-09-28, `FIN-043`) | Lista y resumen usan la cuota del mes derivada (misma regla que `DebtOutlayService`, §32). |
| BT-020 | En la **versión web** (iPhone), tocar una compra de la tarjeta no hacía nada, igual que "Anular movimiento", "Pagar totalmente", "Borrar historial" y las confirmaciones de borrado (Fundador, 2026-09-28). | **Defecto de plataforma** (FIN-041): `Alert.alert` de react-native-web no muestra nada; 10 diálogos de la app dependían de él. | ✅ **Corregido** (2026-09-28) | `utils/webAlert.ts` (solo web): los diálogos pasan a `window.confirm`/`window.alert`, instalado en `index.ts`. Acciones de una compra de tarjeta ahora en línea ("Cambiar número de cuotas" / "Anular"). Android sin cambios. |
| BT-021 | En **Cuentas y patrimonio** las deudas sumaban $121.009.323 y no $124.992.343: faltaba la tarjeta (Fundador, captura 2026-09-29). | **Defecto §32:** patrimonio, Motor, Copiloto y snapshot sumaban `currentBalance` de BD, que en tarjetas es 0 por diseño (FIN-031); misma causa que BT-016 en "Deuda total". | ✅ **Corregido** (2026-09-29) | `debts/debt-balance.util.ts` (`totalLiabilities`): saldo real = cuotas pendientes en tarjetas; usado por `accounts`, `dashboard`, `engine`, `snapshot.job` y `context-assembler`. e2e fin043 cubre el patrimonio. Backend: llega con el auto-deploy de Render (sin OTA). |
| BT-022 | En la **versión web** (iPhone) los cambios no se veían aunque GitHub ya los había publicado (Fundador, 2026-09-29). | **Caché:** GitHub Pages permite guardar la página ~10 min y la app instalada en la pantalla de inicio conserva la versión vieja hasta cerrarla del todo. | ✅ **Corregido** (2026-09-29) | La portada pide no guardarse en caché; cada despliegue publica `version.json` con el commit y la app (solo web) lo consulta al abrir, al volver y cada 10 min: si hay otra versión muestra "Hay una versión nueva de Millo · Actualizar". La primera vez hay que recargar a mano (la versión vieja aún no trae el aviso). |
| BT-023 | Al abrir Millo desde el ícono de la pantalla de inicio del iPhone la pantalla quedaba **completamente en blanco** (Fundador, 2026-09-29). | **En diagnóstico:** la misma publicación arranca bien en Chromium (con la ruta `/ToCosas/` de GitHub Pages) y el paquete no usa sintaxis que Safari no entienda; se sospecha un error propio de Safari/modo pantalla de inicio. | 🔎 **Diagnóstico instalado** (2026-09-29) | Si en 9 s la app no se dibuja, la página muestra "Millo no pudo abrir", un botón Recargar y el error exacto (para la captura del Fundador). El almacenamiento web ya no rompe el arranque si Safari lo bloquea. |
| BT-024 | La versión web no mostraba ningún cambio desde FIN-048: las publicaciones de GitHub Pages fallaban sin ejecutarse (detectado por el Arquitecto al pedir el enlace, 2026-09-29). | **Causa raíz:** el paso agregado en BT-022 se llamaba `Versión publicada (BT-022: la app…)`; los dos puntos seguidos de espacio rompen el YAML y GitHub rechaza el flujo entero (0 trabajos). Desde entonces 8 publicaciones fallaron (FIN-049…FIN-053 y Fase 4 no llegaron a la web). | ✅ **Corregido** (2026-09-29) | Nombre del paso entre comillas; todos los flujos se validan con un parser YAML antes de subirlos. |
| BT-025 | Una persona con cuenta escribía su correo en la entrada y tocaba **Crear cuenta** (el botón principal): la app la mandaba a llenar el registro y solo al final decía en rojo "Ya existe una cuenta con ese correo" (Fundador, 2026-09-30). | **Causa:** "Crear cuenta" navegaba sin mirar el correo escrito y el registro no revisaba el correo hasta enviar todo. | ✅ **Corregido** (2026-09-30) | Nuevo `POST /v1/auth/email-status` (sin sesión, 10/min por IP; no revela más que el propio registro). En la entrada, "Crear cuenta" revisa el correo: si ya existe, avisa "Ya tienes una cuenta con este correo" con **Ingresar ahora** (o ir a la contraseña) y **Olvidé mi contraseña**; si no, abre el registro con el correo ya puesto. En el registro, el aviso sale al salir del campo correo y antes de enviar; "Ya tengo cuenta" lleva el correo a la entrada. e2e nuevo en `fin039`; revisado con Playwright. |
| BT-026 | En Telegram, "Guardar documento" respondía "Ahora mismo no puedo usar la IA… modo básico" (Fundador, 2026-09-30). | **Dos causas.** (1) El comando solo reconocía "guardar documento**s**" en plural y minúscula; el texto se fue al Copiloto. (2) El Copiloto manda a la IA los últimos 10 mensajes; en conversaciones largas el recorte podía **empezar por una respuesta del Copiloto**, y la API exige que empiece por el usuario → error y respaldo en modo básico. El log solo guardaba el código HTTP, sin el motivo. | ✅ **Corregido** (2026-09-30) | Comandos tolerantes (singular/plural, mayúsculas, tildes, "guárdame las facturas", "no guardes mis facturas"). Historial normalizado antes de llamar a la IA (empieza por el usuario, roles alternados, termina en el usuario). El log ahora guarda el motivo del error de la API. Pruebas nuevas: `normalize-history.spec.ts` y un caso en `document-flow.spec.ts`. |
| BT-027 | Un movimiento anotado en la app después de las 7 p. m. quedaba con la fecha del día siguiente: Inicio mostraba "1 oct" para un gasto del 30 sep y, el último día del ciclo, el gasto caía en el mes siguiente (Arquitecto, auditoría 2026-09-30). Igual "¿Cuándo empezó?" en Nueva deuda. | **Causa raíz:** la app mandaba la hora local (`toISOString()` de `new Date()`) y el servidor corta días y ciclos a medianoche universal; 9 p. m. en Colombia ya es el día siguiente en UTC. El bot no lo sufría porque manda solo la fecha a mediodía UTC. | ✅ **Corregido** (2026-09-30) | `utils/dates.ts` (`toApiDate`, `localDateKey`): Registrar, Editar y Nueva deuda mandan el día local a mediodía UTC. |
| BT-028 | En Registrar, cualquier error del servidor (no solo la falta de conexión) guardaba el movimiento en el teléfono y decía "No hay conexión ahora" (auditoría). | **Causa:** el `catch` del registro trataba todo error como "sin red". | ✅ **Corregido** (2026-09-30) | Solo se guarda en el teléfono cuando `ApiError.status === 0` (sin red o tiempo agotado); un rechazo del servidor se muestra como error. |
| BT-029 | Inicio → "En qué se te va · Ver todo" abría Mi mes, que no tiene categorías (auditoría). | Enlace a una pantalla que no existía. | ✅ **Corregido** (2026-09-30) | Pantalla nueva "En qué se te va" (`CategoriesScreen`, FIN-056 boceto 3): categorías del ciclo con barra; tocar una abre sus movimientos. |
| BT-030 | Ajustes ofrecía "Vincular WhatsApp" e Inicio decía "usa WhatsApp/Telegram", pero el canal termina en "aún no está conectado" (auditoría). | Canal sin número mostrado como disponible. | ✅ **Corregido** (2026-09-30) | WhatsApp oculto en Ajustes e Inicio hasta que Millo tenga número (la pantalla de vinculación sigue en el código). |
| BT-031 | El Copiloto olvidaba la conversación al salir y volver, aunque el servidor la recuerda 2 horas (auditoría). | La pantalla arrancaba vacía. | ✅ **Corregido** (2026-09-30) | Al entrar se carga la conversación de las últimas 2 horas. Se quitó la etiqueta "instantánea" bajo cada respuesta (solo queda "con IA"). |
| BT-032 | Registrar mostraba un acuse viejo si se dejaba la pestaña en "Listo" y se volvía horas después (auditoría). | Estado no reiniciado al volver. | ✅ **Corregido** (2026-09-30) | Al ganar foco en el acuse, la pantalla se reinicia. |
| BT-033 | En Salud, "Simularlo →" de cada indicador abría el simulador sin escenario (auditoría). | Navegación sin parámetro. | ✅ **Corregido** (2026-09-30) | Cada indicador abre el escenario que lo mueve (`SCENARIO_BY_INDICATOR`). |
| BT-034 | El valor de un activo no se podía actualizar (había que borrarlo y crearlo) y, si el alta fallaba, no decía nada (auditoría). | Sin edición ni manejo de error. | ✅ **Corregido** (2026-09-30) | Lápiz sobre el valor (`PATCH /assets/:id`) y errores visibles. |
| BT-035 | Detalle de tarjeta sin cupo: "Registra el cupo de tu tarjeta al editarla", pero no existía editar deuda; el plan de pago mostraba 12 cuotas y "y N más" sin forma de verlas; los seguros se borraban sin confirmar (auditoría). | Enlaces muertos y omisiones. | ✅ **Corregido** (2026-09-30) | Nueva pantalla Editar deuda (FIN-056 boceto 4) enlazada desde el detalle y desde el aviso del cupo; "Ver las N cuotas restantes"; confirmación al borrar seguros. |
| BT-040 | La **cuota de manejo** de una tarjeta no tenía dónde registrarse: la sección "Seguros y cargos" solo salía en créditos amortizados, y el bot no la leía del extracto (Fundador, 2026-10-02: "¿coloco cuál era la cuota de manejo?"). El servidor sí la aceptaba y la contaba en "Te queda". | **Causa:** la sección se condicionó al modelo amortizado (FIN-013) y el esquema de lectura del extracto (FIN-042/054) no pedía ese dato. | ✅ **Corregido** (2026-10-02) | App: "Cargos de la tarjeta" bajo "Tu tarjeta", con la cuota de manejo preseleccionada. Bot: el extracto de tarjeta lee `handlingFee`, la propuesta la muestra ("Cuota de manejo: $32.900 al mes → la registro como cargo aparte"), se corrige con "manejo 29.900" (0 para quitarla) y al confirmar se crea el cargo. Un valor implausible (≥ 500.000) se ignora. |
| BT-041 | El **APK nuevo del 2026-10-03** (ícono de Millo, BT-013) se cerraba al abrir ("Millo continúa fallando"). El OTA `01a1020c` sobre el APK anterior sí funcionaba. | **Causa:** `@expo/vector-icons` (FIN-038) pide `expo-font` como peer; npm instaló `expo-font@57` (de otro SDK) en la raíz y el build enlazó ese código nativo con Expo 54. El APK de julio no lo traía y el OTA no lleva nativo, por eso no se vio antes. | ✅ **Corregido** (2026-10-03) | `expo-font ~14.0.12` como dependencia directa (una sola copia, `expo-doctor` limpio). Prevención: el preflight compara cada módulo nativo instalado con la versión mayor que pide el SDK (`bundledNativeModules.json`) y bloquea si no coincide. APK reconstruida e instalada: **abre bien y muestra el ícono nuevo (verificado por el Fundador, 2026-10-03)**. |
| BT-042 | En la **app web instalada del iPhone** no se podía volver atrás deslizando desde el borde izquierdo (solo con la flecha) (Fundador, 2026-10-04). | **Causa:** iOS no ofrece ese gesto a las apps web en modo "standalone" (sí en Safari normal y en apps nativas); la app no lo suplía. | ✅ **Corregido** (2026-10-04) | `components/EdgeSwipeBack.tsx`: deslizar desde los primeros 24 px del borde izquierdo (≥ 80 px, sin desplazamiento vertical) vuelve a la pantalla anterior, con una flecha que acompaña el dedo y se pone verde al alcanzar. Solo actúa si hay una pantalla apilada (nunca cambia de pestaña) y solo en la web instalada; Android ya tiene el gesto del sistema. Probado con un toque simulado: Ajustes → Más. |
| BT-043 | El Copiloto mostraba **la misma recomendación dos veces** ("Ordena tus deudas con el método avalancha") y decía que la diferencia entre estrategias era **de $0** (Fundador, 2026-10-04). | **Causa:** (1) el control de repetidas era por mes (`rec_estrategia:AAAA-MM`): la de septiembre seguía activa cuando nació la de octubre. (2) La estrategia se recomendaba con solo DTI > 35 %, sin exigir que hubiera ahorro. | ✅ **Corregido** (2026-10-04) | Al crear una recomendación se retiran las activas del mismo tipo (`superseded`); la lista muestra una por tipo (la más reciente) y oculta estrategias guardadas sin diferencia; la estrategia solo se recomienda si la diferencia de intereses es ≥ $50.000 (`MIN_STRATEGY_DIFFERENCE`). 3 pruebas nuevas; unit 496/496, e2e 132/132. Llega al desplegar Render (sin OTA). |
| BT-039 | Desde Inicio ("Tienes margen: adelanta un pago"), el Copiloto, el plan para liberar flujo, el Simulador o "Ver todo", se abría el detalle de una deuda y **no se podía volver** a Mis deudas: no había flecha de atrás y la pestaña Deudas quedaba en el detalle (Fundador, 2026-10-02). | **Causa:** al saltar a la pestaña Deudas con el detalle como pantalla destino, el navegador la ponía como PRIMERA pantalla de esa pestaña (sin Mis deudas debajo). | ✅ **Corregido** (2026-10-02) | Los cinco saltos piden abrir el detalle **encima** de Mis deudas (`initial: false`): aparece la flecha de atrás y "atrás" vuelve a la lista. Llega con el OTA / la web. |
| BT-038 | En la web del iPhone (ícono de la pantalla de inicio), Mis deudas mostraba la **barra de desplazamiento** pegada a las tarjetas y empezando debajo del título, no en el borde de la pantalla (Fundador, captura 2026-10-02: "la barra subir y bajar sale mal ubicada"). | **Causa:** la lista se desplaza dentro de un recuadro con margen de 16 px (`Screen`), y Safari dibuja la barra de ESE recuadro, no la de la página. | ✅ **Corregido** (2026-10-02) | La web ya no muestra barras de desplazamiento en ninguna lista (`public/index.html`: `scrollbar-width: none` y `::-webkit-scrollbar { display: none }`), como en la app instalada: en un teléfono se desplaza con el dedo. Llega con la publicación web automática; abrir la app y aceptar "Actualizar". |
| BT-037 | Al abrir la app, Inicio mostraba un bloque **verde** de carga (el "hero" de la versión vieja) y "$ 0" en Gastos e Ingresos, y después aparecían las cifras reales (Fundador, capturas 2026-09-30). | **Causa:** el esqueleto de carga seguía pintado como el hero verde antiguo; los totales mostraban $0 mientras cargaban; y cada apertura arrancaba en blanco aunque la app ya conocía las cifras de la última vez. | ✅ **Corregido** (2026-09-30) | Esqueleto blanco como la tarjeta actual; sin "$ 0" mientras carga; y **caché de pantallas** (`offline/screenCache.ts`, `useApi({ cacheKey })`): Inicio, Mi mes, Salud, Deudas, Cuentas y En qué se te va pintan al instante lo de la última vez y se actualizan en silencio. Se borra al cerrar sesión. |
| BT-036 | El onboarding pedía el ingreso **neto** ("lo que realmente te llega") y lo guardaba como fuente; Mi perfil de ingresos lo trataba como **bruto** y sugería descontarle salud y pensión otra vez (auditoría). | Dos pantallas con dos definiciones del mismo dato. | ✅ **Corregido** (2026-09-30) | El onboarding pide el salario **antes de descuentos** ("el de tu contrato") y explica que Millo descuenta salud y pensión. Decisión del Arquitecto, pendiente de confirmar por el Fundador (`FIN-056` §3). |

---

## BT-001 · Formato regional en campos numéricos

**Reportado por:** Fundador (Beta Técnica, 2026-07-13) — "intenté registrar una tasa de
interés de 15,35 / 15,35, no me permitió, arrojando error".

**Causa raíz (verificada en código por el CTO):**
- Frontend `AddDebtScreen.tsx:20`: `parseFloat(s.replace(/[^\d.]/g, ''))` **descartaba la
  coma** → `"15,35"` se convertía en `1535`.
- Backend: `interest_rate` es `@db.Decimal(7,4)` (máx 999.9999). `1535` tiene 4 dígitos
  enteros → Prisma lanzaba al escribir → **500**. El `@IsNumber()` del DTO no lo atrapaba
  porque el frontend ya enviaba un número.

**Corrección (defensa en dos capas):**
- **Backend (autoritativo, "antes del Motor"):** `common/parse-number.util.ts` —
  `normalizeNumberInput` + decorador `@NormalizeNumber()` aplicado a los campos numéricos
  del DTO de deuda. Acepta coma decimal, punto decimal y enteros; miles vs. decimal
  desambiguados por el último separador. Se añadió `@Max(999.9999)` a `interestRate`: un
  valor genuinamente fuera de rango devuelve **400 claro, nunca 500**.
- **Frontend:** `utils/format.ts` — `parseDecimal` (decimales regionales) y `parseAmount`
  (montos COP enteros, descarta miles). `AddDebtScreen` usa el parser correcto por campo.

**Verificación (por el CTO):**
- Unit `parse-number.util.spec.ts`: 9/9 (`15,35`/`15.35`/`1535`/`1.234,56`/`1,234.56`/…).
- e2e `bt001-formato-regional.e2e-spec.ts`: 4/4 — `"15,35"` → **201** y guarda 15.35 (antes
  500); `"15.35"` → 201; entero → 201; valor fuera de rango → **400**, no 500.
- Suites completas sin regresión: unit 340/340 (44 suites), e2e 31/31 (9 suites), `tsc`
  backend y frontend exit 0.

**Regla permanente derivada:** la decisión del Fundador ("todos los campos numéricos deben
aceptar la escritura natural del usuario según su configuración regional, normalizada antes
del Motor") queda institucionalizada como invariante del sistema en `GOBERNANZA.md` §39.
Los futuros DTO con campos numéricos deben usar `@NormalizeNumber()`.

## BT-003 · "Sin conexión con el backend" con el backend operativo

**Reportado por:** Fundador (Beta Técnica, 2026-07-14) — la app mostraba "Sin conexión con
el backend. Tus datos locales siguen disponibles.", pero `/v1/health` respondía y Render
estaba operativo.

**Causa raíz (PROBADA por el CTO, no teorizada):**
- La resolución de la URL en `client.ts` era
  `process.env.EXPO_PUBLIC_API_URL ?? extra.apiUrl ?? 'http://localhost:3000/v1'`.
- `eas build` **sí** inyecta `EXPO_PUBLIC_API_URL` desde el `env` del perfil de `eas.json`
  → el APK original apuntaba a producción. Pero **`eas update` (OTA) NO hereda ese `env`**
  → en el bundle publicado por OTA, `EXPO_PUBLIC_API_URL` quedó `undefined` y la resolución
  cayó a `extra.apiUrl` de `app.json`, que era **`http://localhost:3000/v1`**.
- Prueba: `npx expo export` sin la variable hornea `http://localhost:3000/v1` en el bundle.
  En el teléfono, `localhost` = el propio teléfono (sin servidor) → todo fetch falla →
  `summary.error` (`DashboardScreen.tsx:330`) dispara el mensaje. Por eso `/v1/health`
  respondía para el Fundador pero la app nunca llamaba a Render.
- **El incidente lo causó el CTO** al publicar el primer OTA (`c1d5c328`) sin la variable.

**Solución aplicada (frontend/config → EAS Update, sin backend):**
- `app.json` `extra.apiUrl` → `https://milla-backend.onrender.com/v1` (viaja en el
  manifiesto del OTA; es el valor que ahora resuelve en runtime). Verificado con
  `expo config` → `apiUrl: https://milla-backend.onrender.com/v1`.
- `client.ts`: fallback final cambiado de `localhost` a la URL de producción, con comentario
  del incidente — ningún camino de código puede volver a enviar `localhost` a usuarios.
- OTA HOTFIX republicado: update group `f166ac42` (branch `preview`, runtime `0.1.0`).

**Lección permanente (documentada en `docs/tecnico/EAS-UPDATE.md`):** `eas update` no hereda
el `env` del perfil de build; el fallback de URL debe ser producción, nunca `localhost`.

**Cierre institucional (política del Fundador, `GOBERNANZA.md` §40):** BT-003 no cierra como
"bug corregido" sino como **mejora permanente del proceso de despliegue**. Se construyó un
**gate automático** (`frontend/scripts/deploy/preflight-ota.mjs`) que **bloquea** la
publicación si detecta `localhost`/host local, variables faltantes, config inconsistente,
canal/runtime inválidos o `/health` caído; y la **vía única** `npm run ota:publish`
(`publish-ota.mjs`) que corre el gate y exige el **dispositivo centinela** antes de publicar.
Verificado por el CTO en ambos sentidos: config correcta → pasa (exit 0); `localhost`
reintroducido (simulación BT-003) → **bloquea** (exit 1). Prohibido correr `eas update`
directamente.

## BT-004 · Ingreso fijo declarado no aparece en "Te queda para gastar"

**Reportado por:** Fundador (Beta Técnica, 2026-07-14, P1) — registró un ingreso fijo, se
almacenó, pero "Te queda para gastar" no lo refleja.

**Investigación del CTO (evidencia, no hipótesis) — las 4 preguntas del Fundador:**
1. **¿Se almacena?** Sí. `POST /v1/income/sources` persiste la fuente; `fin027` e2e:
   `netFixedTotal = 3.740.000` tras deducciones.
2. **¿El dashboard incluye el ingreso fijo?** Sí, en **"Ingresos fijos"**:
   `dashboard.service.ts:101` `fixedIncome = income.netFixedTotal` (fuente FIN-027). e2e fija
   `fixedIncome = 3.740.000`.
3. **¿"Te queda" consume la estructura FIN-027?** Sí, pero solo para las **deducciones**
   auto-pagadas, no como ingreso.
4. **¿Caché/sincronización?** No: `SpendableService.compute` calcula en vivo por request.

**Causa raíz (no es un defecto de implementación):** `SpendableService` (única definición de
"Te queda", §32) es, por diseño ratificado (FIN-020 Alt A, "nunca mentir hacia arriba"):
`amount = ingresos RECIBIDOS (transacciones) − gastos/pagos reales − compromisos pendientes`.
El ingreso fijo **declarado** (no recibido aún) **no** cuenta — decisión ratificada en
FIN-020/021/023/024 y **preservada a propósito por FIN-027** (documentado en
`fin020-tequeda.e2e-spec.ts`: *"sigue sin contar en teQueda… solo lo REALMENTE recibido"*).
El salario declarado SÍ aparece en "Ingresos fijos" y en el Score; "Te queda" lo sumaría al
registrarse como **movimiento** de ingreso (eso funciona — `fin020` e2e verde).

**Por qué no se corrige unilateralmente:** cambiar "Te queda" para contar dinero no recibido
**rompería la definición §32** que el CPSAO y el Fundador ratificaron cuatro veces. Es una
**decisión de producto**, no un fix de mantenimiento. Escalada al Fundador/CPSAO.

**Opciones propuestas por el CTO (recomendación en negrita):**
- **A (recomendada, honesta):** cuando una fuente fija declarada tiene día de pago ya
  **pasado** en el ciclo y no hay un movimiento de ingreso que le corresponda, la app ofrece
  un CTA de un toque: *"¿Ya recibiste tu salario del 28? Regístralo"* → crea el movimiento →
  "Te queda" lo refleja. Cierra la brecha SIN romper "solo lo recibido cuenta".
- B: dejar "Te queda" intacto y solo clarificar en la UI que cuenta lo recibido y que el
  salario declarado vive en "Ingresos fijos" (copy).
- C (no recomendada): contar el ingreso declarado con día pasado como recibido — asume el
  pago, viola "nunca mentir hacia arriba" y §32.

Cualquiera de A/B es maintenance/UX; C sería un cambio de la definición §32 (requiere DEC y
visto del CPSAO). Pendiente de la decisión del Fundador/CPSAO.

**Actualización FIN-057 (Fundador, 2026-10-02):** la base de "Te queda" pasa a armarse **por
partes**: `max(salario declarado, salario recibido) + max(variable estimado, extra recibido)`.
La regla de BT-004 (`max(declarado total, recibido total)`) tenía un efecto no deseado: con el
salario declarado y sin registrar, lo recibido (solo el rebusque: Didi, ventas…) nunca superaba
lo declarado y esa plata no contaba. Un ingreso **sin categoría** se sigue comparando con el
salario (no se asume que es extra). Definición única en `budget/income-split.util.ts`; detalle
en `docs/arquitectura/FIN-057-Deudas-e-ingresos-en-Inicio.md`.

**Resolución (decisión del Fundador, 2026-07-14 — supersede la propuesta del CTO):** el
Fundador decidió, como autoridad de producto y sin re-escalar, que **el ingreso fijo
recurrente declarado forma parte del cálculo principal ("Te queda")**, porque es un flujo
predecible que la usuaria configura para planificar su mes; el impacto en credibilidad de que
el indicador ignore ese ingreso supera el beneficio de la regla anterior. Esto **supersede el
"Alt A / solo lo recibido" de FIN-020 para el ingreso fijo** (los ingresos VARIABLES siguen
contando solo al recibirse — no son certeza).

**Aclaración del Fundador (2026-07-14, tras primera validación):** la base debe ser el
**ingreso neto disponible del mes completo = salario + variable, menos deducciones** (su
número real: 5.609.240 = fijo neto + variable). No solo el fijo.

**Implementación (CTO), hecha con cuidado de NO romper §32 (una sola definición):**
- `SpendableService` (fuente única de "Te queda"): la base de ingreso pasa de
  `receivedIncome` a **`max(ingreso neto disponible del mes, recibido)`** donde
  `ingreso neto disponible del mes = netFixedTotal + selfPaidDeductionsTotal +
  grossVariableEstimate` (= `netMonthlyEstimate` en forma take-home). El `max` **evita el
  doble conteo** si el ingreso además se registra como movimiento. Incluye el variable
  estimado (decisión explícita del Fundador; se documenta que el variable es estimación).
- Se expone `incomeBase` en el objeto `TeQueda` y `interpretCashflow` (interpretación §4.1-ter
  del Inicio) pasa a dividir por `incomeBase` en vez de `receivedIncome` — si no, con ingreso
  declarado daba proporciones absurdas ("$283 de cada $100"); copy ajustado a "de tu ingreso".
- Como es la fuente única, Presupuesto e Inicio heredan el cambio automáticamente.
- **Verificación del CTO:** `tsc` BE+FE 0; unit **355/355** (46 suites); e2e **43/43** (11
  suites). e2e `fin020` actualizado: con salario declarado 4.000.000, arriendo 1.200.000 y
  gasto 250.000, "Te queda" = **2.550.000** (antes −550.000) e interpretación verde.
- **Verificación en PRODUCCIÓN (CTO, backend en vivo, escenario exacto del Fundador):**
  salario fijo 5.200.000 − deducciones 487.760 + variable 897.000 + arriendo 1.582.688 →
  `income/summary.netMonthlyEstimate = 5.609.240` (el número exacto del Fundador) y
  `budget/monthly.teQueda = { amount: 4.026.552, incomeBase: 5.609.240 }` — **positivo**.
  El deploy nuevo confirmado activo (`incomeBase` incluye el variable).
- **Despliegue (§41):** backend-only → llega a Beta por el auto-deploy de Render (confirmado
  activo), sin OTA. El Fundador solo debe recargar la app.
- **Estado:** ✅ **Resuelto y verificado en producción.** Pendiente únicamente la confirmación
  visual del Fundador tras recargar la app (§41: no lo doy por cerrado hasta que él lo compruebe).

## BT-005 · Botón "Guardar/Anular" trabado al anular un pago de deuda

**Reportado por:** Fundador (Beta Técnica, 2026-07-14) — al intentar anular un pago de deuda,
el botón verde queda cargando y "Anular movimiento" no se habilita.

**Diagnóstico del CTO (evidencia):**
- El **backend anula correctamente y rápido:** `DELETE /transactions/{id}` del pago de deuda
  del Fundador → `{deleted:true}`, HTTP 200 en **0.93 s**, y la deuda **se regeneró**
  (currentBalance 64.114.451, status `activa`) — la lógica de reverso de FIN-028 funciona.
- Por tanto el "botón trabado" es de **frontend/red**: la petición se cuelga sin límite
  cuando el backend está **dormido** (Render free se apaga tras 15 min de inactividad y
  tarda ~30-60 s en despertar). El `EditTransactionModal` comparte el estado `busy` entre
  "Guardar" y "Anular", así que ambos se ven trabados durante esa espera.

**Solución aplicada:**
- `client.ts`: **timeout duro de 45 s** vía `AbortController` — el request SIEMPRE resuelve
  o falla con mensaje claro ("El servidor tardó demasiado, puede estar reactivándose…"). La
  UI nunca queda colgada. También mejora el manejo de error de red. (Frontend → OTA por §40.)
- **Deuda del Fundador regenerada** manualmente por el CTO (anulado el pago desde su cuenta).
- Causa de fondo (no un bug del código): el cold-start del plan free de Render. Mitigado con
  el timeout; eliminarlo requeriría plan pagado (no autorizado, §36.4).

## BT-006 · "Score Millo: —" sin contexto

**Reportado por:** Fundador (Beta Técnica, 2026-07-14) — Salud muestra un guion, pese a haber
información suficiente.

**Causa raíz (verificada por el CTO contra la cuenta real del Fundador):**
- `GET /v1/health/score` responde **503**: *"Salud Financiera no está habilitada en producción
  (pendiente validación legal)."* Es un **gate legal deliberado** (`HealthProductionGuard`,
  `DEC-0004` §10.3 / `DEC-0001` §10.7 / `PRODUCCION.md` §2): en producción el Score está
  APAGADO hasta que exista validación legal formal (`HEALTH_SCORE_PRODUCTION_ENABLED=false`).
  **No es un bug de algoritmo ni falta de datos** — está desactivado a propósito.
- El frontend (`HealthScreen.tsx`) tenía estado de "construcción" solo para `score:null`
  (cold-start), pero ante el 503 `data` quedaba `null` y caía al guion mudo "—" (`:155`).

**Dos partes, dos tratamientos:**
- **(b) Defecto de experiencia — CORREGIDO por el CTO:** `ScoreCard` ahora, cuando no hay Score
  disponible (`!data && !loading`, incluye el 503 gateado), muestra un mensaje honesto y con
  agencia ("🌱 Tu Score financiero está en preparación… sigue registrando tus movimientos"),
  nunca un "—" mudo. Frontend → OTA por §40. Cumple el requisito explícito del Fundador.
- **(a) Encender el Score real — ESCALADO al Fundador:** mostrar un Score verdadero exige
  poner `HEALTH_SCORE_PRODUCTION_ENABLED=true`, lo que **cruza un gate LEGAL** (validación
  legal formal del Score, `PRODUCCION.md` §2). El CTO **no** enciende un gate legal
  unilateralmente. Es decisión del Fundador y requiere la validación legal cerrada. Mientras
  no lo esté, el mensaje de "en preparación" es la conducta honesta.

**Recomendación del CTO:** (b) resuelve tu requisito inmediato ("no un guion sin contexto")
sin riesgo. (a) es una decisión aparte que conviene coordinar con la revisión legal del Score
antes de exponerlo con datos reales.

**Resolución (a) — Decisión ejecutiva del Fundador, 2026-07-14:** informe puntual del CTO —
el Score es **100% determinista (cero IA)**, `health.service.ts:37` / `score.util.ts`; el
gate es puramente legal (`HealthProductionGuard`, DEC-0004 §10.3 / DEC-0001 §10.7), no IA ni
compartir a terceros (ya controlado, Ley 1266). El Fundador **autorizó activar el Score para
la Beta Técnica CERRADA** con condiciones: identificado como indicador propio de Millo, **no**
como score crediticio ni calificación oficial de riesgo, con textos de carácter educativo, y
la **validación legal formal como requisito OBLIGATORIO antes del lanzamiento público**
(registrado en `PRODUCCION.md` §1 y §2). Acción: `HEALTH_SCORE_PRODUCTION_ENABLED=true`
(`render.yaml` + panel de Render). Las condiciones (disclaimer "no es puntaje crediticio",
escala educativa, no-compartir) ya estaban construidas y aprobadas en el diseño de FIN-004.
- **Estado:** ✅ Ambas partes resueltas. Validación del cálculo y la visualización tras
  encender el flag.

## BT-007 · "Capacidad de ahorro" (Salud) inconsistente con "Te queda" (Inicio)

**Reportado por:** Fundador (Beta Técnica, 2026-07-14) — Inicio muestra "68 de cada 100
libres" y Salud "Capacidad de ahorro: 1 de cada 100"; se percibe como una contradicción.

**Causa raíz (verificada por el CTO con datos reales del Fundador):**
- Ambos usaban el **mismo denominador** (ingreso declarado, $5.609.240) — eso ya era
  consistente. La diferencia estaba en el numerador:
  - **"Libres" (Inicio)** = `teQueda / incomeBase` = (ingreso − compromisos del período) /
    ingreso = **68%** (`SpendableService`, fuente única §32).
  - **"Capacidad de ahorro" (Salud)** = `cashflow / ingreso` = (ingreso REALMENTE recibido −
    gastos reales) / ingreso = **~1%** (`core-metrics`, ahorro *realizado*).
- El gap se amplificaba porque el Fundador declaró un salario pero solo registró $70.000 de
  ingreso real: "libres" cuenta el declarado; "ahorro realizado" solo lo recibido.
- **Aclaración clave del CTO:** hacer que "ahorro" usara el ingreso declarado habría dado
  ~98% (no 68%), porque "ahorro" resta el gasto real y "libres" resta los compromisos — dos
  cosas distintas. La consistencia real exige que "Capacidad de ahorro" mida lo mismo que
  "Te queda".

**Decisión del Fundador (2026-07-14, ejecutiva):** "Capacidad de ahorro" representa el mismo
concepto financiero que "Te queda para gastar" — qué % del ingreso queda disponible tras
cubrir los compromisos del período. El ahorro *realizado* será un indicador aparte futuro
("Ahorro logrado este mes"), con nombre propio.

**Implementación (CTO), §32 por construcción:**
- El Motor (`engine.service.recompute`) **inyecta `SpendableService`** (fuente única de "Te
  queda") y sobrescribe la métrica `savings_rate` con `teQueda.amount / teQueda.incomeBase`.
  Así el **pilar de Ahorro del Score y el indicador de Salud** salen de la MISMA fuente que
  Inicio — imposible que diverjan. Se importó `BudgetModule` en `FinancialEngineModule` (sin
  ciclo — `budget` no importa el Motor).
- Texto del indicador actualizado: "Después de cubrir tus compromisos del mes, qué parte de
  tu ingreso te queda disponible… Es lo mismo que 'Te queda para gastar' en Inicio."
- **Verificado por el CTO:** `tsc` 0, unit 355/355, e2e 44/44. Coherencia Inicio/Salud/Score
  validada en vivo tras el deploy.
- **Despliegue (§41):** backend-only → Beta por auto-deploy de Render, sin OTA.

## BT-027 … BT-037 · Auditoría de la app (2026-09-30)
Los diez salieron de la revisión completa de las 26 pantallas pedida por el Fundador ("Necesito soluciones") y se corrigieron en la misma entrega, junto con las 7 propuestas de la auditoría (`docs/arquitectura/FIN-056-Auditoria-de-la-app.md`). El más serio es **BT-027** (fecha nocturna): altera en qué día y en qué ciclo cae un movimiento. Regla nueva: **una fecha de "día" viaja siempre con `toApiDate` (`utils/dates.ts`)**, nunca con `toISOString()` de la hora local.

## Historial
- 2026-07-13 — Creación del registro. BT-001 corregido y verificado; BT-002 encauzado a
  FIN-028. Directriz de gestión de defectos institucionalizada (`GOBERNANZA.md` §38) e
  invariante de formato regional (§39).
- 2026-07-14 — BT-003 (incidente de producción "sin conexión") corregido por OTA HOTFIX
  `f166ac42`. Causa raíz probada (OTA no hereda el `env` → fallback `localhost`). Commit
  del fix registrado abajo.
- 2026-09-27 — **BT-012 y BT-013 reportados por el Fundador** en la primera validación de la OTA `03d425e3` (captura: pestañas bajo los botones del sistema; ícono genérico). BT-012 corregido en el mismo día (inset inferior en barra, stacks y hojas). BT-013 preparado (íconos + `app.json`), pendiente de APK nueva.
- 2026-09-27 — BT-008…BT-011 detectados por el Arquitecto en el análisis integral (`BLUEPRINT-0001` §4) y corregidos/resueltos en la misma entrega (`MANT-001`, `FIN-038`) bajo `DEC-ORG-002`. Regla reforzada: **ningún campo numérico se parsea fuera de `utils/format.ts`** (§39); el grep forma parte de la verificación por artefactos (§44.5).
- 2026-09-30 — **BT-027…BT-036** detectados por el Arquitecto en la auditoría completa de la app y corregidos en la misma entrega (`FIN-056`). BT-027 (fechas nocturnas) es el más serio: define la regla `toApiDate`.
- 2026-10-02 — **BT-038** (barra de desplazamiento mal ubicada en la web del iPhone) reportado por el Fundador y corregido el mismo día: la web no muestra barras.
- 2026-10-02 — **BT-039** (sin "atrás" al abrir una deuda desde Inicio y otros atajos) reportado por el Fundador y corregido el mismo día.
- 2026-10-02 — **BT-040** (la cuota de manejo de una tarjeta no tenía dónde registrarse ni se leía del extracto) reportado por el Fundador y corregido el mismo día.
- 2026-10-03 — **BT-041** (el APK nuevo se cerraba al abrir por `expo-font` de otro SDK) detectado al instalarlo el Fundador y corregido el mismo día; el preflight ahora lo bloquea. Lectura del error con `adb logcat` (`NoSuchMethodError` en `FontLoaderModule`); APK corregida verificada por el Fundador.
- 2026-10-04 — **BT-042** (sin gesto de "atrás" deslizando en la web del iPhone) reportado por el Fundador y corregido el mismo día.
- 2026-10-04 — **BT-043** (recomendación repetida y "diferencia de $0" en el Copiloto) reportado por el Fundador y corregido el mismo día.
