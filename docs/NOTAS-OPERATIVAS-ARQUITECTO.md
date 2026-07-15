# Notas operativas del Arquitecto — volcado de conocimiento de contexto

- **Versión:** 1.0
- **Fecha:** 2026-07-12
- **Autor:** Agente Arquitecto (instancia con ventana próxima a cerrar)
- **Estado:** Vigente — complemento de `ESTADO_PROYECTO.md` para el arranque en frío
  del rol Arquitecto (Paso 2 del `PROCEDIMIENTO-ARRANQUE-EN-FRIO.md`)
- **Historial de cambios:**
  - v1.0 (2026-07-12) — volcado urgente instruido por el CPSAO antes del cierre de
    la ventana de contexto.
  - v1.2 (2026-07-13) — §0-bis: línea base post-Fase 0 (MEMO del CTO,
    GOBERNANZA v3.14 §34–§36).
  - v1.1 (2026-07-12) — §0: regla inquebrantable de correspondencia (tras
    reproceso de destinatario en FIN-021, corregido por el Fundador).
- **Propósito:** lo que la próxima instancia del Arquitecto necesita y NO está en
  ningún ARQ/AUD/DEC/IMP. Nada de aquí es fuente de verdad de decisiones (eso vive
  en los documentos oficiales) — esto es conocimiento OPERATIVO y de oficio.

---

## 0. Regla inquebrantable de correspondencia (reproceso 2026-07-12 — NO repetir)

Antes de escribir CUALQUIER mensaje en `docs/correspondencia/`, verificar el
destinatario contra el proceso (dos correcciones del Fundador el 2026-07-12):
**ARQ emitido → Para: Auditor** (él audita el ARQ) · **IMP entregado (después
del DEC) → Para: CTO** (él coordina la validación con el Auditor y cierra;
Auditor en CC) · confirmaciones puntuales pedidas por el CTO → Para: CTO. En el
chat con el Fundador: una sola línea con ruta y asunto ("Trabajo terminado, msj
redactado para X — docs/correspondencia/<archivo>.md — Asunto: ...") — cero
resúmenes, cero explicaciones.

## 0-bis. Línea base post-Fase 0 (MEMO CTO 2026-07-13 — LEER GOBERNANZA §34–§36)

- Backend en PRODUCCIÓN: Render (`https://milla-backend.onrender.com`) + Neon
  PostgreSQL. No escalar planes por anticipación; upgrade = dato real +
  autorización del Fundador.
- **§36.2 — flujo de integración:** el Arquitecto entrega ARQ/IMP en RAMAS DE
  TRABAJO; el CTO es el único que integra a la rama oficial tras validar.
  Cero commits oficiales directos.
- §34: doc oficial se commitea en el mismo acto. §36.3: unit + e2e + tsc +
  build + migraciones verificables antes de integrar (cero regresiones).
- FIN-026 en pausa hasta validación del APK por el Fundador; FIN-025 (aviso
  de mora) fast-follow registrado. Avisar al Fundador ANTES de que cualquier
  FIN toque Registrar/Transacciones.

## 1. Entorno local (Windows) — hechos duros

- Levantar: Docker Desktop → `backend: docker compose up -d` → `npm run start:dev`
  (backend) → Metro (`frontend: npx expo start --port 8081` con
  `EXPO_PUBLIC_API_URL` según destino: **localhost para captura web, IP LAN para el
  QR del teléfono** — la IP se hornea en el bundle al arrancar Metro, cambiarla
  exige reiniciar Metro).
- **Prisma EPERM:** antes de `prisma generate/migrate`, matar TODOS los node del
  backend (incluye el hijo `dist\main` del watcher) o falla renombrando la DLL.
- Migraciones: SIEMPRE carpeta SQL escrita a mano + `prisma migrate deploy`
  (`migrate dev` es interactivo y no corre aquí).
- Suites: unitaria `npx jest` (**299/299** al escribir esto; corre sin BD);
  E2E `npm run test:e2e` (**6/6**; REQUIERE Postgres de docker; config separada en
  `backend/test/jest-e2e.json`, levanta la app real en puerto efímero con fetch
  nativo — sin supertest).
- Bundle Android sanity check: `curl "http://localhost:8081/index.bundle?platform=android"`.

## 2. Captura de evidencia visual

Todo el método, los scripts rescatados y las trampas conocidas están en
**`frontend/scripts/captura/README.md`** (leerlo antes de capturar cualquier cosa).
Credenciales de la usuaria demo y patrón de cold-start incluidos ahí.

## 3. Oficio de diseño acumulado (dónde vive cada patrón en el código)

- **Familia de interpretación "$N de cada $100"**: nació en FIN-017
  (`dashboard.service.ts` → `interpretCashflow/Debt/Savings`) y se extendió a Salud
  (`HealthScreen.tsx` → `humanValue()`). Toda cifra porcentual visible debe pasar
  por este formato. Regla dura §29.1: si falta el dato, la línea SE OMITE (null) —
  jamás un texto que genere una pregunta.
- **Patrón "jugada"** (LA acción de mayor impacto): `HealthScreen.tsx` →
  `JugadaCard` — fuente = `recommendationsApi.list()[0]` (el backend ya ordena por
  `priorityScore` desc = impacto×urgencia×viabilidad, FIN-007); fallback = peor
  indicador (rojo→amarillo). ARQ-0020 P5 lo reutiliza para Presupuesto.
  **Gap conocido:** el mapeo `kind`→escenario del simulador cubre `estrategia`,
  `recorte_categoria`, `fondo_emergencia`; `abono_extra` navega al simulador
  general (documentado en IMP-0019 §4 reserva 3).
- **Tap honesto**: lo colapsado debe ANUNCIAR su contenido ("¿Cómo se calcula? →"),
  nunca "toca para ver detalle". Las ACCIONES nunca van escondidas (precedente 3-A).
- **Hero único por pantalla** + color: el color-juicio no va en el elemento
  dominante (FIN-019 P4: Score siempre verde Millo, banda como chip; semáforo solo
  donde hay niveles auditados).
- **Navegación entre tabs anidadas** (RN): desde una pantalla de tab a otra tab con
  stack: castear navigation y llamar `navigate('Debts', { screen: 'DebtDetail',
  params: {...} })` — la forma `navigate('Main', {...})` desde dentro de Main NO
  navegó (bug real encontrado en FIN-018, puente narrativo).
- Nombres de rutas ≠ etiquetas: pestaña "Copiloto" = ruta `Insights`; "Registrar" =
  ruta `Add`.

## 4. Hilos abiertos y semillas (no comprometidos, con su registro)

- **`wealthPillar()` cuasi-binario** (~70 para cualquier patrimonio positivo):
  riesgo diferido de DEC-0004, hoy visible como barra neutra en Salud — mejora
  futura registrada en ARQ-0019 §4.1-bis.
- **Mora de fijos y de cuotas**: fuera de alcance en FIN-018 (nextDueDate solo se
  normaliza al PAGAR) y FIN-020 (fijos vencidos sin pagar = dominio de mora).
  Cuando se aborde, revisar ARQ-0018 §4.9 y ARQ-0020 §4.1-bis juntos.
- **`fixedItemId` en Transaction** (conciliación pago↔fijo): mejora futura
  registrada en ARQ-0020 §4.1-bis — eliminaría el doble descuento del "Te queda".
- **`nextDueDate` en la lista de Deudas** (hoy muestra `payoffDate`): mejora futura
  registrada en ARQ-0018 §10.
- **Corte del 10% de `interpretCashflow`**: compromiso de revisarlo con datos
  reales tras la RC integral (ARQ-0020 §4.1-ter).
- **Lote 03 de capturas** (documentación sin gobernanza, ofrecido y nunca pedido):
  Registrar, Ajustes, Cuentas y patrimonio, Millo+, Logros.
- **Gates de producción** (FIN-010): DPA/PIA/tiendas/precio — tabla viva en
  BACKLOG; nada de eso es deuda técnica.

## 5. Memoria persistente del rol

Esta instancia mantiene memoria persistente en el directorio del proyecto del
harness (`millo-gobernanza-tecnica`, `millo-dev-setup`, `millo-prisma-windows-eperm`)
— una instancia nueva en el mismo directorio la recibe automáticamente, pero NO
debe tratarla como fuente de verdad (Paso 3 del procedimiento): verificar siempre
contra GOBERNANZA/ESTADO/documentos oficiales, que prevalecen.
