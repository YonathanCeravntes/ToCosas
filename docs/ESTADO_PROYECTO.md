# ESTADO_PROYECTO — Millo

- **Actualizado:** 2026-09-27 · por: Arquitecto (bajo `DEC-ORG-002`; antes lo mantenía el CTO — la versión anterior databa del 2026-07-13 y ya no reflejaba FIN-032…037 ni `DEC-ORG-001`, hallazgo D1 del `BLUEPRINT-0001`).
- **Naturaleza:** snapshot mutable — se sobrescribe en cada actualización, no es append-only. Su historial vive en `BACKLOG.md`/`FIN-XXXX`/`DEC`, no aquí.
- **Lectura obligatoria (Nivel 1):** este documento + `GOBERNANZA.md` (v3.21, empezar por §44) + `BACKLOG.md`.

---

## Equipo y flujo vigentes (`DEC-ORG-002`, 2026-09-27)
**Fundador (decide) ⇄ Arquitecto (ejecuta, verifica, documenta).** No hay CTO, Auditor ni CPSAO. Una FIN = un documento `docs/arquitectura/FIN-XXXX-*.md` (ARQ + Implementado + Decisiones del Fundador). Freno obligatorio: reglas de negocio, §32, UX visible, alcance, legal/gates o gobernanza → preguntar antes. Bugs → corregir y documentar.

## Trabajo activo
**Telegram activo (2026-09-28):** bot `@Millo_finanzas_bot` conectado por webhook, cuenta del Fundador vinculada, registro por chat funcionando. **`DEC-0041`:** el Fundador enciende la IA del Copiloto en la Beta cerrada (pendiente: `ANTHROPIC_API_KEY` + `COPILOT_PRODUCTION_ENABLED=true` en Render); **FIN-042 implementada** (extractos/comprobantes por foto o PDF vía bot; pendiente validación con extracto real). IA del Copiloto encendida por el Fundador (`ANTHROPIC_API_KEY` + `COPILOT_PRODUCTION_ENABLED=true`).

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
- **OTA vigente en `preview`:** `47f2f85c` (BT-015: Nueva deuda con banco elegido, commit `bfca5be`; Ajustes muestra `01a0e5a9`). Anteriores: `99fd2b03` (BT-014), `455a648d` (cero emojis), `8fea873c` (§8), `4d46807b` (§7), `47efdcd0` (íconos), `74f6a9af` (BT-012), `03d425e3` (entrega). Anteriores: `455a648d` (cero emojis), `8fea873c` (§8), `4d46807b` (§7), `47efdcd0` (íconos), `74f6a9af` (BT-012), `03d425e3` (entrega). Anteriores hoy: `8fea873c` (§8), `4d46807b` (§7), `47efdcd0` (íconos), `74f6a9af` (BT-012), `03d425e3` (entrega). Anteriores hoy: `4d46807b` (§7), `47efdcd0` (íconos), `74f6a9af` (BT-012), `03d425e3` (entrega). Anteriores hoy: `47efdcd0` (íconos + política), `74f6a9af` (BT-012), `03d425e3` (entrega). Anterior: `74f6a9af` (BT-012, commit `42ff127`). Anteriores hoy: `03d425e3` (entrega 2026-09-27: SPRINT-PULIDO-001 + MANT-001 + FIN-038 + FIN-039). Ambas publicadas desde el PC del Fundador con `npm run ota:publish` (preflight con baseline OK, centinela "Android de Yonathan"). Antes: `f166ac42` (FIN-027/028 + BT-001/003).
- **Backend:** Render free `milla-backend` + Neon. Desplegado `2ce4747` (Deploy live, migración `fin039` aplicada en `startCommand`). Variables `SMTP_URL` y `MAIL_FROM` configuradas por el Fundador (Gmail App Password); `WHATSAPP_DISPLAY_NUMBER` no configurada (sin número de bot aún).
- **Incidente de proceso 2026-09-26:** intento de subir a Expo SDK 57 revertido (`362d279`); motivó el baseline de APK en el preflight.

## Definición vigente de "Te queda" (§32)
Base de ingreso = `max(take-home del ingreso fijo declarado + variable estimado, ingresos recibidos)` − gastos/pagos reales − compromisos pendientes (BT-004, Fundador 2026-07-14). Fuente única: `SpendableService`. El pilar de Ahorro del Score usa la misma razón (BT-007). **Nada de la entrega 2026-09-27 la toca.**

## Principios permanentes recientes
§31 filtro "qué perdería el usuario" · §32 fuente única · §33 EOC · §34 commit en el mismo acto · §39 formato regional (invariante: SIEMPRE `parseAmount`/`parseDecimal`, BT-008) · §40 gate OTA (ahora con baseline de APK) · §42 claridad radical · §44 verificación por artefactos.

## Riesgos abiertos / gates de producción pendientes
- **Gates legales/negocio (FIN-010):** DPA con Anthropic, PIA (Ley 1581), validación legal del Score para público, política de tiendas/IAP, precio Millo+ (banda sugerida USD 20–30/año, `COMPETITIVE_ANALYSIS.md` §4). Responsable: Fundador.
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
