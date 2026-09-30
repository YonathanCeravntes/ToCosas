# IMP-0037 · Lecturas de profundidad por modalidad — Beta-guiadas (P4 del EOC)

- **Versión:** 1.0
- **Fecha:** 2026-07-16
- **Autor:** Agente Arquitecto/Desarrollador
- **Estado:** Entregado — en rama de trabajo, para VALIDACIÓN e integración del CTO
  (§36.2, `DEC-ORG-001`). Su cierre **completa la secuencia 035→036→037** y habilita la
  **Revisión Integral de Producto** del Fundador.
- **Historial de cambios:**
  - v1.0 (2026-07-16) — última FIN de la secuencia del programa EOC.
- **Módulo/Feature:** FIN-037 (P4 de DEC-0033) · **Origen (§27):** Visión del Fundador +
  semilla del CPSAO · Prioridad Media (priorizada por el Fundador)
- **Documentos base:** `ARQ-0037` v1.0 (`4572f2e`) · `DEC-0037` (§3 condiciones) ·
  `DEC-0033` §3/§4 · GOBERNANZA §29.2/§31/§32
- **Referencia inmutable (regla GOBERNANZA):** commit
  **`2ca9fc01f884c901a2d44a12a84bb1d2020bcc47`**

## 1. Resumen

P4 entrega **el mecanismo** (lecturas de profundidad por config + una sola autoridad) y **las 2
lecturas ya priorizadas** — no el catálogo especulativo de ~50 eventos. La semilla del CPSAO se
honra primero: el gota a gota/informal recibe la **lectura honesta de su costo real**; la tarjeta,
el **sobrecupo visible**. Display-only: cero mutación, cero migración, cero IA, **NO toca
Registrar**.

## 2. Cumplimiento (DEC-0037 §3)

| Condición | Implementación | Verificación |
|---|---|---|
| **§3.1 — los 3 bordes del costo real** | Con tasa: "De tu cuota de $150.000, ~$7.655 son interés y ~$142.345 bajan tu deuda" (compone `toMonthlyEffectiveRate`, FIN-012). Cuota ≤ interés: "el saldo no baja — cada peso extra sí lo baja" (warning, sin juicio). Sin tasa: invitación a declararla — **cero cifra inventada** (test: sin `$` en el copy). | unit 3 bordes + e2e contra BD real + captura |
| **§3.2 — sobrecupo exacto** | Se activa **exactamente** cuando `usedAmount > creditLimit` (derivados FIN-031); igual al cupo = silencio; sin cupo declarado = silencio. Muestra el excedente exacto. | unit (at-limit/over/no-limit) + e2e (compra que excede → aparece con $200.000) + captura |
| **§3.3 — config-sin-código** | `depthReadings` en `PRODUCT_TYPE_DESCRIPTORS`: una lectura por modalidad = **una fila**. | unit: inyectar una fila la sirve sin tocar el flujo |
| **§3.4 — §32 (grep)** | Las lecturas existen SOLO en `DepthReadingService` (hoja); composición de funciones puras existentes; la UI solo renderiza `depthReadings[]` de la API. | grep: `costo_real_informal`/`sobrecupo` = 0 fuera del servicio/descriptor |
| **§3.5 — §29.2/Independencia** | Copy revisado y **testeado**: sin "irresponsable/culpa/deberías", sin "contrata/te recomendamos". Bonus: el "Cupo disponible" negativo dejó de pintarse verde (verde mentiría). | unit de copy sobre las 4 variantes |
| **§3.6 — no toca `transactions.service` / cero migración** | Display-only sobre campos existentes; cero columnas nuevas. | grep = 0; sin carpeta de migración |
| **§3.7 — cola de intake en BACKLOG** | Documentada en la fila FIN-037 del BACKLOG (ver §4). | BACKLOG actualizado |

## 3. Suites y evidencia

- **Unitaria 381/381** (+7: `depth-reading.service.spec` — 3 bordes, sobrecupo exacto,
  config-sin-código, silencio por modalidad, copy §29.2).
- **E2E 17 suites / 75** — `fin037-profundidad` **5/5**: semilla con cifras reales; borde brutal;
  borde sin tasa; sobrecupo al exceder; display-only sin mutación. Sin regresión.
- **`tsc` limpio** (back+front). **Sin migración.**
- **Capturas reales** (`docs/producto/capturas/fin-037/`): el costo real del gota a gota
  ($7.655 interés / $142.345 capital); el sobrecupo ($366.594 por encima del cupo, con el
  disponible negativo en color de alerta).

## 4. La cola de intake Beta-guiada (candidatas registradas, sin priorizar)

Cada una entra SOLO cuando un usuario Beta la tope o el Fundador la priorice — con su mini-ciclo,
su **política de reversión declarada antes de entrar** (patrón §4.5 FIN-031) y su **nivel de
confirmación** (DEC-0030 §5: hecho directo = nivel 1; modificación de datos no ingresados =
nivel 2). Candidatas iniciales (de la visión del Fundador): **avance en efectivo** (tarjeta —
reusaría el path de `CardPurchase` con interés); **retanqueo/compra de cartera** (libranza —
nivel 2); **nota crédito/reversión parcial** (tarjeta); **período de gracia** (educativo);
**compra internacional** (tarjeta — **toca Registrar** → observaciones del Fundador primero);
más las ideas de Beta ya anotadas (tipos de tarjeta, seguros). El **abono extraordinario de
hipoteca ya existe** (FIN-012 prepay) — no es candidata.

## 5. Archivos

- **Backend:** `product-type.descriptor.ts` (`depthReadings` + tipo `DepthReadingKind`);
  `depth-reading.service.ts` (hoja) + spec; `debts.service.ts` (`findOne → depthReadings[]`);
  `debts.module.ts` (provider); `test/fin037-profundidad.e2e-spec.ts`.
- **Frontend:** `api/types.ts` (`DepthReading`); `DebtDetailScreen.tsx` (render de lecturas +
  color honesto del disponible negativo); `capture-fin037.js`.

## 6. Pendiente para el CTO (§36.2/§36.3)

Validar (greps + 3 bordes + sobrecupo exacto + copy) e **integrar**. Su cierre **completa
035→036→037** y habilita la **Revisión Integral de Producto** del Fundador. El frontend se suma
al OTA agrupado pendiente de su aviso.
