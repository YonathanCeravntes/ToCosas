# DEC-0026 · Experiencia de Simulador

- **Documentos base:** `docs/arquitectura/ARQ-0026-Experiencia-Simulador.md` (v1.0) · `docs/auditoria/AUD-0026-Experiencia-Simulador.md`
- **Módulo/Feature:** FIN-026 (única FIN activa) · **Origen (§27):** Mejora de revisión de producto
- **Decide:** CTO de Milla
- **Fecha:** 2026-07-13

---

## 0. Verificación independiente previa a esta decisión

- Confirmé que `SIM_BY_KIND` en `HealthScreen.tsx:212` y `BudgetScreen.tsx:205` solo mapea `estrategia`, `recorte_categoria`, `fondo_emergencia` — `abono_extra` falta en ambas pantallas, confirmando el bug de puerta.
- Confirmé en `simulations.service.ts` que el backend solo rechaza `extraBudget < 0` (acepta 0); el rechazo de 0 viene del guard `!v || v <= 0` en `SimulatorScreen.tsx:73` — P2 es genuinamente frontend-only, el backend ya es correcto.

Conclusión: **AUD-026 es preciso. El diseño cierra el motor ya auditado con disciplina de pantalla y puertas, sin backend nuevo, y corrige un bug de navegación activo real.**

## 1. Resumen ejecutivo

`ARQ-0026` cierra la última experiencia de la hoja de ruta UX sobre un motor completo (8 escenarios, FIN-007), sin construir nada nuevo en backend. Corrige el bug de puerta del abono (aterrizaba en el escenario opuesto), abre los 3 escenarios sin entrada, resuelve la divergencia de cifra con el bloque de Deudas, y narra el resultado. El Auditor no encontró hallazgos bloqueantes; sus tres precisiones se incorporan como cambios obligatorios.

## 2. Arquitecturas revisadas
`docs/arquitectura/ARQ-0026-Experiencia-Simulador.md` (v1.0).

## 3. Auditorías revisadas
`docs/auditoria/AUD-0026-Experiencia-Simulador.md` — veredicto: **APROBADO CON OBSERVACIONES** (nada bloqueante).

## 4. Decisiones aprobadas

1. **P1 — Los 3 escenarios sin puerta, con `abono_extra` a máxima prioridad (Alt A):** aprobada, con el cambio obligatorio de la sección 5.
2. **P2 — Coherencia con Deudas (`extraBudget: 0` precargado + línea piso/techo):** aprobada, **frontend-only** — no se toca la validación del backend, que ya es correcta.
3. **P3 — Resultado narrado desde `specifics` existentes (Alt A):** aprobada, con el cambio obligatorio de la sección 5 sobre el titular.
4. **P4 — Puente de vuelta solo donde la acción real existe:** aprobada.
5. **P5 — Historial visible (últimas 5):** aprobada.
6. **P6 — Estados vacíos honestos:** aprobada.
7. **Respuesta al filtro §31:** aprobada — sustantiva.

## 5. Cambios obligatorios

1. **El `IMP` debe tocar AMBOS mapas** (`SIM_BY_KIND` en `HealthScreen.tsx` y en `BudgetScreen.tsx`) agregando `abono_extra`, y **eliminar el fallback mudo** `?? SCENARIOS[0]` por el aviso visible declarado en el ARQ. Si solo se corrige un mapa o se deja el fallback mudo para escenarios genuinamente desconocidos, el bug sobrevive por la puerta que quede sin tocar.
2. **P2 es exclusivamente frontend** — relajar el guard `v <= 0` para `extraBudget` en el escenario de estrategia. La validación del backend (`extraBudget < 0`) no se modifica: ya es correcta.
3. **El titular §29 debe liderar con el delta del Score** ("tu Score pasaría de X a Y"), nunca con el valor "antes" absoluto — evita que la usuaria vea dos "Score de ahora" distintos si lo comparó recientemente con el persistido de Salud (~25 s de ventana, mismo trato que `DEC-0021` §4.2). Declarar la ventana donde corresponda.

## 6. Observaciones aceptadas

- Limitación de evidencia ya declarada por precedente (`FIN-017`): sin suite unitaria de pantalla — la aceptación se apoya en revisión de código + capturas + los e2e existentes del motor. La `VALIDACIÓN` debe verificar el mapa completo de kinds por lectura de código, no solo por captura.
- Selector de activo depende del endpoint existente de Cuentas — verificar shape en implementación (dependencia interna, no nueva).
- Más escenarios visibles pueden hacer sentir antes la cuota free (5/mes) — paywall ya existe y es honesto; vigilar en RC.

## 7. Próximos pasos

1. Arquitectura implementa según el Plan de `ARQ-0026` §14, incorporando los 3 cambios obligatorios de la sección 5 desde el diseño.
2. Capturas reales: al menos abono, estrategia (con la línea piso/techo) y venta; estados vacíos con usuario real sin deudas/activos.
3. `IMP-0026` con SHA y juicio razonado, verificando explícitamente los criterios §13 del ARQ.
4. `BACKLOG.md`/`ESTADO_PROYECTO.md` se actualizan en el mismo acto (ya reflejado).
