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

## Historial
- 2026-07-13 — Creación del registro. BT-001 corregido y verificado; BT-002 encauzado a
  FIN-028. Directriz de gestión de defectos institucionalizada (`GOBERNANZA.md` §38) e
  invariante de formato regional (§39).
