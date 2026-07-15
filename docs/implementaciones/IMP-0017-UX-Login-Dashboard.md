# IMP-0017 · Mejora de UX — Login y Dashboard

- **Versión:** 1.0
- **Fecha:** 2026-07-11
- **Autor:** Agente Arquitecto/Desarrollador
- **Estado:** Entregado — a la espera del cierre del CTO
- **Historial de cambios:**
  - v1.0 (2026-07-11) — emisión, autorizada por el CTO tras confirmar `e914e85`.
- **Módulo/Feature:** FIN-017 · **Origen (v3.5 §27):** Mejora de revisión de producto
- **Documentos base:** `ARQ-0017-UX-Login-Dashboard.md` v1.3 · `AUD-0017` · `DEC-0017` (aprobación parcial + §6.1 criterios §29) · confirmaciones puntuales del CTO (DEC-0017 §7.2): correcciones v1.2, P1, y hallazgo §4.7.5
- **Referencia inmutable (regla GOBERNANZA):** commit **`e914e85`** (HEAD de la entrega)
  - Código en 2 commits: `d93ab60` (piezas aprobadas sin condiciones por DEC-0017 §4:
    hero, gamificación en línea, glosario, interpretaciones de flujo/ahorro) y
    `e914e85` (P1 Login + coherencia de la tarjeta de Deuda + interpretación de
    deuda, tras las confirmaciones del CTO). Docs: `4e21ebb` (v1.2), `948bddb` (v1.1).

## 1. Resumen
Las 4 prioridades de FIN-017 + §4.5 implementadas conforme a DEC-0017 y sus
confirmaciones puntuales: Login que explica qué hace Milla en ≤5 segundos (4
pilares), Dashboard con UN dato protagonista ("Te queda este ciclo"), interpretación
server-side visible sin interacción en flujo/deuda/ahorro (ruta (a): cifras propias
del home, cero llamadas al Score), y glosario de lenguaje cotidiano. Iteración
pequeña: 2 pantallas, 1 campo aditivo en un endpoint, cero migraciones.

## 2. Archivos modificados
**Backend:**
- `dashboard/dashboard.service.ts` — campo aditivo `interpretation {cashflow, debt,
  savings}` compuesto desde los agregados PROPIOS del home; reglas §29: montos en
  pesos sin decimales, cero jerga, y si falta el dato la línea se omite (`null`).
- `health/score.util.ts` — se EXPORTA `DEBT_RATIO_CUTS` (0,20/0,35 — los cortes
  reales del indicador de FIN-004); cero cambios de comportamiento.
- `dashboard/dashboard.spec.ts` — 3 aserciones nuevas (verde de deuda 10%,
  interpretaciones exactas, omisión total sin datos).

**Frontend:**
- `screens/auth/LoginScreen.tsx` — propuesta de valor ("Tus deudas, tu plata y tu
  mes — claros en un solo lugar") + 4 micro-líneas (💳💰🩺🤖); el tagline original
  baja a firma emocional al pie.
- `screens/DashboardScreen.tsx` — hero único "Te queda este ciclo · <periodo>" con
  interpretación; gamificación compactada a UNA línea tocable (`ProgressLine`,
  `ProgressBlock` retirado); Deuda total como tarjeta normal con **una sola cifra de
  cuota** ("$X pagado este ciclo", el mismo `debtPayments` de la interpretación —
  §4.7.5); par Patrimonio/Ahorro del mismo peso con coletillas del glosario;
  Ingresos/Gastos con "fijos del mes · del día a día".
- `api/types.ts` — `Interpretation` + campo en `HomeDashboard`.

## 3. Cumplimiento de los criterios de aceptación (ARQ-0017 §13)

| # | Criterio | Evidencia |
|---|---|---|
| 1 | Test de 5 segundos en Login | Captura real `capturas/fin-017/despues-01-login.png`: propuesta + 4 pilares visibles sin interacción; CTO la validó visualmente |
| 2 | Un único hero en el Dashboard | Captura `despues-02-dashboard.png`: solo "Te queda este ciclo" en verde dominante; Deuda/Patrimonio/Ahorro en tarjetas normales del mismo peso |
| 3 | Interpretación visible sin interacción | En la captura: 🟢 flujo ("Te alcanza…"), 🟢 deuda ("De cada $100 que te entraron, $6 se fueron en cuotas — vas bien"), ahorro ("Con esto cubres ~4 meses de tus gastos fijos") — ninguna tras un tap |
| 4 | Glosario verificable por grep | `Te queda este ciclo`=1 · `lo tuyo, menos deudas`=1 · `fijos del mes`=1 · `del día a día`=1 · `pagado este ciclo`=1 · 4 pilares del Login=4 · `Flujo estimado`=0 (eliminado) |
| 5 | Capturas antes/después + regresión | Antes: `capturas/lote-01/01-login.png`, `02-inicio-dashboard.png` (commit `0bfa154`). Después: `capturas/fin-017/`. Suite **299/299**; typecheck backend+frontend limpios; bundle Android 200 (6,59 MB) |

**Criterios §29 (Gobernanza v3.7):** §29.1 — la interpretación de deuda usa
exclusivamente cifras del propio home (ruta (a)); sin pagos en el ciclo o sin
ingreso, la línea SE OMITE; ninguna referencia a calendario/ciclo/DTI en texto
visible. §29.2 — todos los textos en lenguaje humano, montos en pesos sin decimales
("De cada $100 que te entraron, $6 se fueron en cuotas").

## 4. Pruebas realizadas
- Suite completa **299/299** (38 suites — regresión íntegra FIN-001…016).
- Verificación EN VIVO (Expo Web, backend + Postgres reales, usuaria demo):
  jerarquía nueva, interpretaciones con datos reales coherentes (493.000 pagado /
  8.750.000 de ingreso → $6 de cada $100 → verde), Login sin sesión.
- Typecheck backend y frontend; bundle Android 200.

## 5. Incidencias
- **Cazada por el CTO en la confirmación** (resuelta en `e914e85`): la tarjeta de
  Deuda mostraba cuotas PROGRAMADAS junto a la interpretación de cuotas PAGADAS —
  la misma mezcla del Hallazgo 1+2 en otro punto. Ruta preferida aplicada: una sola
  cifra ("pagado este ciclo").
- **Auto-detectada al implementar** (corregida en ARQ v1.3): la v1.2 citaba cortes
  "30/45" para el indicador de FIN-004; los reales son **0,20/0,35**
  (`health.service.ts:129`). La implementación usa los reales vía `DEBT_RATIO_CUTS`.

## 6. Limitaciones
- El texto interpretativo del hero repite el monto del flujo ("puedes guardar hasta
  $X" = la misma cifra grande); calibración de tono adicional queda para revisión
  del CPSAO sobre las capturas (ya disponibles), no bloquea esta entrega.
- "% comprometido" del glosario vive en Presupuesto (fuera de las 2 pantallas del
  alcance) — no se tocó, coherente con §3.

## 7. Resultado
FIN-017 completo conforme a DEC-0017 + confirmaciones puntuales: 4/4 prioridades y
§4.5 implementadas y verificadas en vivo, con evidencia visual antes/después y
criterios §29 aplicados. Listo para el cierre del CTO.
