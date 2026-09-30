# ESTADO_PROYECTO — Millo

- **Actualizado:** 2026-09-27 · por: Arquitecto (bajo `DEC-ORG-002`; antes lo mantenía el CTO — la versión anterior databa del 2026-07-13 y ya no reflejaba FIN-032…037 ni `DEC-ORG-001`, hallazgo D1 del `BLUEPRINT-0001`).
- **Naturaleza:** snapshot mutable — se sobrescribe en cada actualización, no es append-only. Su historial vive en `BACKLOG.md`/`FIN-XXXX`/`DEC`, no aquí.
- **Lectura obligatoria (Nivel 1):** este documento + `GOBERNANZA.md` (v3.21, empezar por §44) + `BACKLOG.md`.

---

## Equipo y flujo vigentes (`DEC-ORG-002`, 2026-09-27)
**Fundador (decide) ⇄ Arquitecto (ejecuta, verifica, documenta).** No hay CTO, Auditor ni CPSAO. Una FIN = un documento `docs/arquitectura/FIN-XXXX-*.md` (ARQ + Implementado + Decisiones del Fundador). Freno obligatorio: reglas de negocio, §32, UX visible, alcance, legal/gates o gobernanza → preguntar antes. Bugs → corregir y documentar.

## Trabajo activo
**Auditoría completa de la app (Fundador, 2026-09-30, "Haz todo. Necesito soluciones"):** 26 pantallas revisadas; 10 defectos corregidos (`BT-027`…`BT-036`, el más serio: fechas nocturnas) y 7 propuestas implementadas (Registrar rápido, Editar con categoría, En qué se te va, Editar deuda, tasa mensual/anual, subir documento desde la app, Ajustes). Detalle y decisiones pendientes de confirmar en `FIN-056-Auditoria-de-la-app.md`. Falta el OTA desde el PC del Fundador.

**Telegram activo (2026-09-28):** bot `@Millo_finanzas_bot` conectado por webhook, cuenta del Fundador vinculada, registro por chat funcionando. **`DEC-0041`:** el Fundador enciende la IA del Copiloto en la Beta cerrada (pendiente: `ANTHROPIC_API_KEY` + `COPILOT_PRODUCTION_ENABLED=true` en Render); **FIN-042 implementada** (extractos/comprobantes por foto o PDF vía bot; pendiente validación con extracto real). IA del Copiloto encendida por el Fundador (`ANTHROPIC_API_KEY` + `COPILOT_PRODUCTION_ENABLED=true`).

**Mis deudas · opción B (Fundador, 2026-09-29):** lista agrupada por urgencia (vencidas / próximos 30 días / más adelante / cerradas), barra total con el peso de cada deuda y barra por deuda: créditos = % pagado a capital (monto inicial − saldo), tarjetas = uso del cupo (rojo en sobrecupo). Nuevo campo opcional "¿Cuánto te prestaron al inicio?" al registrar y en el detalle (PATCH existente, sin cambio de backend). Publicada: OTA grupo `80ccf99a` (Ajustes Android `01a0ea7f`) y web `a1171bd`. Pendiente: validación en dispositivo.

**Rediseño visual con el lenguaje de Mis deudas (Fundador, 2026-09-29), implementado:** Nueva deuda **D** (primero el tipo en cuadrícula agrupada "Tarjetas y cupos"/"Créditos" + "Ver más tipos"; paso 2 "¿Con qué entidad?" omitible; monogramas verde suave), Inicio **G** (tarjeta blanca de "Te queda" con barra que reparte la base de ingreso en por pagar / ya salió / libre, todo desde `teQueda` §32; grupos Este mes · Próximo pago · En qué se te va · Movimientos), Salud **J** (Score compacto con aro por banda y pilares neutros; la jugada de mayor impacto en verde con "lo que más te frena"; indicadores en lista con barra solo si el valor es %, detalle al tocar). Componentes nuevos en `ui.tsx`: `GroupLabel`, `SegmentBar`; tokens `warningDeep`, `dangerDeep`. Bocetos en el canvas "Millo · Lista de deudas (opciones)". Publicado en la OTA `c9abf4dc` (Ajustes `01a0ee18`); pendiente validación en dispositivo.

**FIN-054 · Mis documentos y borrador de renta (Fundador, 2026-09-30), Fase 1 implementada (opción 1):** separar extracto/factura/certificado en el bot, base de facturas en la app, archivos en Cloudflare R2, factura = guardar + proponer gasto, borrador de renta (no presentación). Privacidad investigada (Ley 1581, datos sensibles de salud, Circular 002/2024 SIC, transferencia a EE. UU. por Circular 005/2017) con texto de permiso; pendiente revisión de abogado. Bocetos de "Mis documentos" (3 opciones) en el lienzo. Ver `docs/arquitectura/FIN-054-Documentos-y-Renta.md`.

**FIN-053 · Copiloto opción 2 (Fundador, 2026-09-29):** conversación con saludo y preguntas en chips, novedades y recomendaciones en tarjeta blanca, estado de la IA junto al campo de escribir. Con esto quedan hechos todos los rediseños del lienzo (Mis deudas, Nueva deuda, Inicio, Salud, Movimientos, Cuentas, Mi mes, Ingresos, Simulador, Copiloto). Ver la sección FIN-053 en `docs/arquitectura/FIN-047-Gastos-Fijos-Automaticos.md`.

**FIN-052 · Simulador opción 2 (Fundador, 2026-09-29):** escenarios en chips, deuda en lista con tasa (por defecto la primera del plan para liberar flujo), campos grandes y montos rápidos. Ver la sección FIN-052 en `docs/arquitectura/FIN-047-Gastos-Fijos-Automaticos.md`.

**FIN-051 · Mi perfil de ingresos (Fundador, 2026-09-29):** opción 2 "De bruto a neto" (cuenta a la vista, fijos y variables separados, día de pago) y "¿De qué vives?" ahora sugiere las deducciones típicas del perfil (empleado, independiente, empresario, pensionado) con un toque. Ver la sección FIN-051 en `docs/arquitectura/FIN-047-Gastos-Fijos-Automaticos.md`.

**FIN-050 · Presupuesto → "Mi mes" (Fundador, 2026-09-29):** opción 1 elegida: la cuenta del mes a la vista (Te entra − Comprometido − Día a día = Libre, misma cifra de Te queda), lo comprometido con Registrado/Pagado/Falta y la edición de fijos e ingresos en un enlace al final. Ver la sección FIN-050 en `docs/arquitectura/FIN-047-Gastos-Fijos-Automaticos.md`.

**FIN-049 · Fijo o variable al registrar (Fundador, 2026-09-29):** en Registrar → "Un último detalle" se elige "Solo esta vez" o "Cada mes"; con "Cada mes" se crea el gasto o ingreso fijo y se registra el de este mes enlazado (sin doble conteo). La cuadrícula de categorías ya no queda vacía en silencio si falla la carga (Reintentar). Ver la sección FIN-049 en `docs/arquitectura/FIN-047-Gastos-Fijos-Automaticos.md`.

**FIN-047 · Gastos fijos automáticos (Fundador, 2026-09-29):** los gastos fijos se registran solos el día que tocan y, si se registran a mano, se cruzan (sin doble conteo); Presupuesto rediseñado con edición de ingresos y gastos fijos. Ver `docs/arquitectura/FIN-047-Gastos-Fijos-Automaticos.md`.

**FIN-046 · Cerebro de Millo (Fundador, 2026-09-29):** plan en 4 fases (Copiloto con IA → Telegram → proactivo → aprende). **Fases 1 y 2 implementadas**: Copiloto con IA primero (permiso de un toque, herramientas de plan/Te queda/próximos pagos, acciones con botón, nombres reales solo en pantalla) y Telegram conversando con el mismo cerebro ("activar ia"/"acepto ia", acciones con *sí*, recibos por foto). **Fase 3 implementada** (recorrido diario por despertador de GitHub, "te sobró plata", resumen semanal, recordatorios a hora de Colombia); se activa con `CRON_SECRET` en Render y GitHub y el flujo en `chat`. **Fase 4 implementada** (aprende la categoría de cada comercio y la corrección; propone con un toque volver gasto fijo lo que pagas cada mes y sumar ingresos que no conocía). Las 4 fases están completas. Ver `docs/arquitectura/FIN-046-Cerebro-Millo.md`.

**FIN-045 · Plan para liberar flujo (Fundador, 2026-09-29), implementado:** reemplaza "Simularlo" por un consejo concreto (liberar flujo primero, la mitad de lo libre, colchón en paralelo). Pantalla "Tu plan para liberar plata", jugada de Salud, orden en Mis deudas y respuesta del Copiloto con la misma regla. Ver `docs/arquitectura/FIN-045-Plan-Liberar-Flujo.md`. Backend por auto-deploy de Render; app en la próxima OTA.

**Tus movimientos · opción 1 (Fundador, 2026-09-29):** resumen Entró/Salió en dos tarjetas, movimientos agrupados por día (Hoy / Ayer / fecha) con el neto del día, filas dentro de una sola tarjeta por día, origen "por Telegram/WhatsApp"; gastos en texto oscuro e ingresos en verde. **Cuentas y patrimonio · opción 1** también implementada (tarjeta blanca con barras Tienes/Debes, listas en una tarjeta, invitaciones cuando están vacías, formularios que se abren con "+ Agregar", enlace a Tus deudas). Siguientes: Ingresos 2 → Simulador 2 → Copiloto 2 (recomendación del Arquitecto, a confirmar una por una). **OTA publicada al final de la tanda: `c9abf4dc` (Ajustes `01a0ee18`).**

**FIN-041 · Millo web (PWA)** implementada (2026-09-28): misma app por enlace, instalable en iPhone/Android desde el navegador; despliegue automático a GitHub Pages (`.github/workflows/web.yml`). **Publicada:** <https://yonathanceravntes.github.io/ToCosas/> (Pages activo, cada push a la rama la republica). **Pendiente:** validación del Fundador en iPhone. Sin push ni registro offline en web (por diseño).

**Entrega 2026-09-27 VALIDADA por el Fundador en la APK Beta (Parte E completa, OTA `74f6a9af`):** `SPRINT-PULIDO-001` + `MANT-001` + `FIN-038` (Fachada Millo v1) + `FIN-039` (Cuenta y datos). Todo commiteado en `claude/finance-app-design-pr8qd5` (PR #1 → `chat`). Suites (2026-09-28): `tsc` 0/0, unit 399/399 (52), e2e 86/86 (19). Hoy también: FIN-043 (pagos de tarjeta a cuotas, BT-016…019).

**Qué debe hacer el Fundador para verlo en su Android:**
1. Backend: mergear/desplegar la rama en Render (auto-deploy). La migración `fin039` corre en `startCommand`. Configurar en el panel: `SMTP_URL` y `MAIL_FROM` (recuperar contraseña por correo), `WHATSAPP_DISPLAY_NUMBER` (opcional).
2. Frontend, en su PC: `git pull` → `cd frontend && npm install` → `npm run ota:publish -- preview --sentinel <dispositivo>` (§40). El preflight ahora bloquea si `node_modules` no está en SDK 54 o si hubiera módulos nativos nuevos (`scripts/deploy/apk-baseline.json`).
3. Validar en la APK: "45.000" guarda $45.000; Inicio se actualiza al volver de Registrar; "Atrás" conserva el monto; botón físico retrocede un paso; íconos de la barra visibles; "Ver todos" abre el historial; onboarding aparece una vez (saltable); "Olvidé mi contraseña"; exportar y borrar cuenta de prueba.

## Roadmap (posición)
- Fundaciones FIN-001…009 ✅ · segunda ronda FIN-011…024 ✅ · FIN-026/027/028/029 ✅ · **programa EOC FIN-030…037 ✅ (cerrado 2026-07-18)** · `SPRINT-PULIDO-001` ✅ · `MANT-001` ✅ · **FIN-038 ✅ / FIN-039 ✅ (validadas en dispositivo 2026-09-27).**
- Pendientes registrados: FIN-010 (salida a producción: gates legales), FIN-025 (aviso proactivo de mora), Copiloto como experiencia UX, RC integral con participantes reales.
- **Candidatas siguientes (el Fundador elige, `BLUEPRINT-0001` §8):** BP-21 metas de ahorro, BP-22 sobres por categoría (toca Registrar), BP-23 recordatorios configurables (`Reminder` ya existe), BP-14 modo oscuro, BP-24 registro por audio/foto vía bot, BP-25 cuentas coherentes, BP-27 recurrentes, BP-28 telemetría de producto, BP-29 offline completo.

## Gobernanza vigente
v3.21 (`docs/GOBERNANZA.md`) — §44 equipo de dos (`DEC-ORG-002`). Controles sin cambio: §15, §29, §31, §32, §33, §34, §35, §36.3, §36.4, §38, §39, §40, §41, §42.

## Beta técnica (estado de despliegue)
- **APK instalada:** Android, Expo SDK 54 / RN 0.81, `runtimeVersion` 0.1.0, canal `preview` (`scripts/deploy/apk-baseline.json` es la fuente de verdad; se actualiza SOLO al construir una APK nueva).
- **Primera validación del Fundador (2026-09-27):** BT-012 (barra de pestañas bajo los botones del sistema Android) → corregido y **verificado por el Fundador en dispositivo** (OTA `74f6a9af`, publicada desde su PC vía sesión Remote Control); BT-013 (ícono genérico) → íconos creados y declarados en `app.json`, se verán al construir la próxima APK (nativo, no OTA).
- **OTA vigente en `preview`:** `c9abf4dc-9a03-4f9e-8646-f67c86c33af4` (2026-09-29, commit `de9832a`; Ajustes Android muestra `01a0ee18`). Trae 20 commits: FIN-045…FIN-053, FIN-046 Fases 1–4 y BT-021…BT-024. Comprobaciones previas en verde, sin módulos nativos nuevos; Render ya respondía 401 (no 404) en las 4 rutas nuevas (plan de flujo, aceptar propuestas, editar fijo, editar fuente de ingreso). Web publicada con el mismo commit. Pendiente: recorrido en dispositivo (Mi mes, Registrar, Mi perfil de ingresos, Simulador, Copiloto). Anterior: `80ccf99a` (Mis deudas opción B, commit `a1171bd`; Ajustes muestra `01a0ea7f`). Anterior: `24fbd0a1` (BT-020: acciones de compra de tarjeta en línea + diálogos en web; commit `0fed76f`; Ajustes muestra `01a0ea65`). Anteriores hoy: `60eb74d4`, `9d7ed901`.
- **Backend:** Render free `milla-backend` + Neon. Desplegado `2ce4747` (Deploy live, migración `fin039` aplicada en `startCommand`). Variables `SMTP_URL` y `MAIL_FROM` configuradas por el Fundador (Gmail App Password); `WHATSAPP_DISPLAY_NUMBER` no configurada (sin número de bot aún).
- **Incidente de proceso 2026-09-26:** intento de subir a Expo SDK 57 revertido (`362d279`); motivó el baseline de APK en el preflight.

## Definición vigente de "Te queda" (§32)
Base de ingreso = `max(take-home del ingreso fijo declarado + variable estimado, ingresos recibidos)` − gastos/pagos reales − compromisos pendientes (BT-004, Fundador 2026-07-14). Compromisos pendientes = fijos de gasto activos + deducciones auto-pagadas + **una cuota por deuda activa por ciclo (desembolso mensual real) menos lo ya pagado a esa deuda en el ciclo (`DEC-0042`, Fundador 2026-09-28)**. Fuente única: `SpendableService`. El pilar de Ahorro del Score usa la misma razón (BT-007) y Endeudamiento la misma autoridad de desembolso: ya no se contradicen.

## Principios permanentes recientes
§31 filtro "qué perdería el usuario" · §32 fuente única · §33 EOC · §34 commit en el mismo acto · §39 formato regional (invariante: SIEMPRE `parseAmount`/`parseDecimal`, BT-008) · §40 gate OTA (ahora con baseline de APK) · §42 claridad radical · §44 verificación por artefactos.

## Riesgos abiertos / gates de producción pendientes
- **Gates legales/negocio (FIN-010):** DPA con Google (IA Gemini, `DEC-0043`; antes Anthropic), PIA (Ley 1581), validación legal del Score para público, política de tiendas/IAP, precio Millo+ (banda sugerida USD 20–30/año, `COMPETITIVE_ANALYSIS.md` §4). Responsable: Fundador.
- **SMTP (Gmail App Password) configurado el 2026-09-27**, entrega real de correo pendiente de validación en dispositivo. Recomendación: rotar la contraseña de aplicación después de validar, porque circuló por chat/captura durante la configuración.
- **Deriva de migraciones (M11):** migraciones anteriores hechas a mano difieren del `schema.prisma` en defaults de `id` (`gen_random_uuid()`) y `ON UPDATE` de FKs. Funcional, pero `prisma migrate dev` propondrá cambios ajenos en cada FIN futura. Decidir: alinear con una migración de solo-esquema en una ventana de mantenimiento.
- **Onboarding para cuentas Beta antiguas:** lo verán una vez (saltable). Si molesta: `UPDATE users SET onboarding_done = true WHERE created_at < '2026-09-27'` (FIN-038 §16.2).
- **`wealthPillar()` binario** (desde DEC-0004): sin cambios.
- **Cold start Render free** (BT-005): mitigado con timeout y copy; eliminarlo requiere plan pagado (no autorizado, §36.4).
- **Sin telemetría de producto** (`METRICS.md` vacío) y **sin pruebas de frontend**: candidatas BP-28 y §7 del Blueprint.
- **Nombre oficial Milla vs Millo:** `PRODUCT_VISION.md` dice Milla; app, código y gobernanza reciente dicen Millo. Decisión del Fundador pendiente (D2).

## Decisiones del Fundador (todas resueltas el 2026-09-27, `DEC-0040`)
1. SMTP: Gmail App Password, `MAIL_FROM = Millo <yonathancrc@gmail.com>`.
2. Purga física a los **30 días** → implementada (`AccountPurgeScheduler`, 04:10 Bogotá).
3. Nombre oficial **Millo** → `PRODUCT_VISION.md` v1.4.
4. Siguiente: **FIN-040 Recurrentes y recordatorios** → ARQ escrito, implementación tras confirmar §16 del documento y ~2 semanas de uso real.
5. Emojis → íconos vectoriales de categoría (`CategoryGlyph`) → publicado y visto OK por el Fundador.
7. Orden visual (`DEC-0040` §7): Inicio más liviano, Patrimonio/Ahorro a Salud → publicado (OTA `4d46807b`), validación visual pendiente.
9. Cero emojis en la interfaz (`DEC-0040` §7, 2ª pasada) → publicado (OTA `455a648d`) y **visto OK por el Fundador** (2026-09-28).
8. Experimento del PC (`DEC-0040` §8): FormScroll + confirmaciones + Reintentar integrados tras validación → publicado (OTA `8fea873c`); verificar teclado en Android.
6. Autonomía OTA desde la nube → pendiente del Fundador (`EXPO_TOKEN` + dominios en el entorno).

## Bloqueos abiertos
Ninguno para el Arquitecto. Backend desplegado y OTA `03d425e3` publicada; falta la validación del Fundador en dispositivo (Parte D/E de `GUIA-FUNDADOR-DESPLIEGUE.md`).

## Próxima acción esperada
1. **Fundador:** validar visualmente la OTA `47efdcd0` (íconos); confirmar el ARQ de `FIN-040` (§16.1–16.4); configurar `EXPO_TOKEN`/dominios en el entorno; rotar la clave de aplicación de Gmail; decidir cuándo construir la APK nueva (BT-013).
2. **Arquitecto:** corregir lo que la validación devuelva (autoridad correctiva §44.1) y, con la decisión del Fundador, abrir la siguiente FIN.

## Documentos de referencia rápida
`docs/arquitectura/BLUEPRINT-0001-Analisis-Integral-Millo.md` (análisis y candidatas) · `docs/producto/COMPETITIVE_ANALYSIS.md` v2.0 (mercado) · `docs/arquitectura/FIN-038-Fachada-Millo-v1.md` · `docs/arquitectura/FIN-039-Cuenta-y-Datos.md` · `docs/oficial/DEC-ORG-002-Equipo-de-Dos.md` · `docs/oficial/REGISTRO-DEFECTOS.md` (BT-001…011) · `docs/tecnico/EAS-UPDATE.md` (OTA).
