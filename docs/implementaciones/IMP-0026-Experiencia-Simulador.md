# IMP-0026 · Experiencia de Simulador

- **Versión:** 1.0
- **Fecha:** 2026-07-13
- **Autor:** Agente Arquitecto/Desarrollador
- **Estado:** Entregado — para VALIDACIÓN del Auditor y posterior cierre del CTO
- **Historial de cambios:**
  - v1.0 (2026-07-13) — emisión tras DEC-0026 (P1–P6 + 3 cambios obligatorios).
- **Módulo/Feature:** FIN-026 · **Origen (§27):** Mejora de revisión de producto
- **Documentos base:** `ARQ-0026` v1.0 (commit `216caeb`) · `AUD-0026` ·
  `DEC-0026` · `COMPRENSION-FIN026-Simulador.md`
- **Referencia inmutable (regla GOBERNANZA):** commit
  **`68588c8cdc754a0ae07fffd94613b4af97fa84b1`**

## 1. Resumen

Los 8 escenarios del motor por fin usables, las puertas arregladas de raíz y el
veredicto en el idioma de la usuaria. **Cero backend** (como declaró el ARQ §8):
todo el commit es frontend + capturas. El bug activo murió: la jugada de abono
aterriza en el escenario de abono con la deuda recomendada preseleccionada.

## 2. Cumplimiento (DEC-0026)

| Pieza | Implementación | Verificación |
|---|---|---|
| **P1 + §5.1** | `abono_extra`/`refinanciar`/`vender_activo` con selectores reales (deuda con saldo, activo con valor, destino opcional de la venta); `SIM_BY_KIND` completado en **ambas** pantallas (Salud y Presupuesto) con `abono_extra`; el `?? SCENARIOS[0]` mudo reemplazado: escenario desconocido → banner "⚠️ No encontré el escenario que buscabas" + selección visible | Captura del selector: "¿A cuál deuda? → 🎯 Tarjeta de crédito" (= `attackOrder[0]`, la fuente única de FIN-022 — §32 por inyección); revisión de código de ambos mapas |
| **P2 + §5.2** | SOLO frontend: campo `extraBudget` con `allowZero` (la validación general sigue rechazando ≤0 en el resto); llegada desde Deudas con `params: { extraBudget: 0 }` y helper permanente "Con $0 extra ves tu PISO…"; el backend no aparece en el diff | Captura de llegada: campo en 0 + helper; diff sin `backend/` |
| **P3 + §5.3** | Titular por escenario desde `specifics` EXISTENTES; el Score siempre como delta ("pasaría de X a Y", banda integrada), nunca absoluto; con delta 0 la frase se omite (§29.1); estrategia usa la MISMA redacción del bloque de Deudas (§5.2 de DEC-0022) incluido el caso ≈0; tabla antes→después visible debajo (no escondida) | Captura del resultado: el titular es literalmente el copy del bloque — coherencia §32 ante la usuaria |
| P4 | CTA post-resultado solo con acción real: abono→"Hazlo real: abonar a capital →" (detalle de ESA deuda), estrategia→orden de ataque, recorte→Presupuesto, venta→deuda destino; nueva deuda/refinanciación/ingreso sin CTA fabricado | Captura: "🎯 Ver tu orden de ataque →" |
| P5 | "🕘 Ver tus últimas simulaciones (N) →" (tap honesto), últimas 5 con fecha local (instante real → `formatLocalDate`), tap = re-ensayo precargando escenario+params persistidos; endpoint `GET /simulations` existente por fin consumido | Captura: historial visible tras simular |
| P6 | Estados vacíos ANTES del formulario: sin deudas ("nada que abonar 🎉"), <2 deudas (estrategia), sin activos (venta, con puente a Cuentas) | Captura con `demo.mora` (sin activos): venta muestra el vacío honesto |

## 3. Verificación

- `tsc --noEmit` limpio; unitaria **326/326** y e2e **23/23** (sin cambios —
  el commit no toca backend; corridas como regresión).
- Capturas (`docs/producto/capturas/fin-026/`): `antes-estrategia-llegada`
  (pantalla vieja al llegar desde Deudas: extra manual, sin explicación, 5
  chips), `despues-estrategia-llegada` (8 chips, 0 precargado, piso/techo),
  `despues-estrategia-resultado` (titular idéntico al bloque + puente +
  historial), `despues-abono-selector` (deuda recomendada 🎯 preseleccionada),
  `despues-venta-vacio`.
- §13.5 del ARQ: la pantalla no calcula cifras — `headline()` solo FORMATEA
  `specifics` del motor; los defaults vienen de `summary.strategy` (grep).

## 4. Juicio razonado

**¿El "¿y si…?" recibe, responde y devuelve? Sí.** La secuencia capturada lo
muestra: la usuaria toca "Verlo en el simulador" en Deudas y aterriza con la
pregunta armada (0 precargado y explicado), simula y recibe el MISMO veredicto
que le prometió el bloque — palabra por palabra — con el detalle debajo y la
puerta de vuelta ("Ver tu orden de ataque →"). Y la jugada de abono, que ayer
aterrizaba en "¿y si tomo un crédito?", hoy abre el abono con la deuda que el
motor recomienda atacar ya seleccionada.

**Reservas honestas:** (1) el re-ensayo del historial restaura escenario y
parámetros pero no puede restaurar el `assetValue` de una venta si el activo
cambió de valor (usa el actual — correcto, pero distinto del ensayo original;
declarado); (2) las jugadas de recomendación tipo `abono_extra` no traen
`debtId` en su payload — el default `attackOrder[0]` cubre el hueco (riesgo
declarado en ARQ §10), pero si el motor algún día recomienda abonar a una deuda
distinta de la primera del orden, habría que enriquecer el payload de la
recomendación (semilla); (3) los estados vacíos de "sin deudas" son
defensivos: hoy ninguna jugada lleva al simulador a un usuario sin deudas —
capturado el de venta (alcanzable de verdad), los demás verificables por código.

## 5. Para la validación

- Reproducir: `npx tsc --noEmit` (frontend) · `npx jest` / `npm run test:e2e`
  (regresión, sin cambios de backend) · lectura de los dos `SIM_BY_KIND` y del
  manejo de escenario desconocido (FIN de frontend — como anticipó el AUD, la
  validación es por código y capturas).
- Capturas: `docs/producto/capturas/fin-026/` (método:
  `frontend/scripts/captura/capture-fin026.js` — llega al Simulador por el
  camino REAL de la usuaria, nunca por URL).
- Checkout aislado sobre el commit de referencia.
