# IMP-0021 · Única definición del fondo de emergencia (§32)

- **Versión:** 1.0
- **Fecha:** 2026-07-12
- **Autor:** Agente Arquitecto/Desarrollador
- **Estado:** Entregado — para VALIDACIÓN del Auditor y posterior cierre del CTO
- **Historial de cambios:**
  - v1.0 (2026-07-12) — emisión tras DEC-0021 (P1/P2/P3-Alt C/P4 + §5).
- **Módulo/Feature:** FIN-021 · **Origen (§27):** Deuda técnica, prioridad
  inmediata (decisión CPSAO, hilo FIN-020)
- **Documentos base:** `ARQ-0021` v1.0 (commit `77ddffd`) · `AUD-0021` ·
  `DEC-0021`
- **Referencia inmutable (regla GOBERNANZA):** commit
  **`6ee4d9d9e4403474fd65c0b69b93088db21d5f31`**

## 1. Resumen

El concepto "meses de fondo de emergencia cubiertos" tiene ahora una sola
fuente: la métrica persistida del Motor (`EmergencyFundMonths`, la ya auditada
en FIN-003/004 — no se tocó) y un solo módulo de hitos
(`emergency-fund.constants.ts`: **colchón inicial = 3, fondo completo = 6**,
Alt C del CPSAO). Los dos consumidores divergentes se plegaron; el tercero
(glosario) importa la constante. La fórmula existe UNA vez en el código
(verificado por grep) y la igualdad entre pantallas está protegida por e2e.

## 2. Cumplimiento por pieza (DEC-0021)

| Pieza | Implementación | Verificación |
|---|---|---|
| P1 (fórmula canónica) | Sin cambios al Motor: `core-metrics.ts` intacto en el diff. Grep: `emergencyBalance /` solo existe en core-metrics | Diff del commit + grep §13.1 |
| P2 (Inicio lee al Motor) | `interpretSavings` (fórmula propia: ahorro total/fijos) **eliminada**; nueva `interpretEmergencyFund` narra la lectura persistida (`MetricReading` del mes calendario — invariante FIN-016 respetada: el ciclo NO aplica al Motor) con los hitos nombrados; sin lectura → línea omitida (§29.1); fondo en 0 → invita a marcar cuenta | Captura Inicio: "Tu fondo cubre ~1.3 meses de lo esencial — tu colchón inicial son 3"; e2e: texto exacto desde la lectura |
| P3 (Alt C — hitos nombrados) | `EMERGENCY_FUND_MILESTONES` + `nextMilestone()`: <3 → colchón inicial; 3–6 → fondo completo; ≥6 → null (nada que recomendar). La escala coincide con los logros `fondo_3m`/`fondo_6m` y los cortes de Salud (test lo fija) | Spec de constantes (4 casos a mano) |
| P4 + **§5.1 (obligatorio)** | `recommendations.service` ya NO recalcula: cobertura y esencial se leen de las métricas PERSISTIDAS (`readMonthMetrics`) y el hito de la constante — `state.emergencyBalance` eliminado del bloque (grep). La candidata apunta al próximo hito y lo nombra; entre 3 y 6 ahora SÍ se genera (antes se apagaba en 3 — efecto declarado de Alt C) | Captura Salud/Presupuesto: "Aparta $1.022.340/mes para tu colchón inicial"; 3 tests nuevos (bajo colchón / entre hitos / completo o sin datos) |
| §5.2 (cero literales) | Copys de Inicio, Recomendaciones y glosario interpolan la constante; grep de `3 meses`/`6 meses` en los 3 archivos: vacío | Grep §13.1 |

## 3. Suites y criterios (ARQ-0021 §13)

- Unitaria **310/310** (+7: 4 hitos, 3 recomendaciones; dashboard actualizado).
- E2E **12/12** (+3, `fin021-fondo-unico.e2e-spec.ts`): con app y BD reales,
  caso a mano 4,5 meses ⇒ lectura persistida == indicador de Salud (amarillo)
  == texto de Inicio, los tres del MISMO `MetricReading`.
- §13.1 grep ✓ (arriba) · §13.2 igualdad ✓ · §13.3 caso a mano ✓ · §13.4
  capturas de las 3 pantallas ✓ (`docs/producto/capturas/fin-021/`) · §13.5
  cortes de Salud y Score intactos ✓ (diff no toca `health.service` ni
  `score.util`) · §13.6 revisión CPSAO de P3 ✓ (previa al DEC, en el hilo).

## 4. Juicio razonado

**¿"Cuánto tengo cubierto" tiene una sola respuesta? Sí — y las capturas lo
muestran con la usuaria real:** Inicio dice "tu fondo cubre ~1,3 meses de lo
esencial — tu colchón inicial son 3"; Salud muestra "Fondo de emergencia:
1.3 meses" (rojo, con su acción); y la jugada — la MISMA en Salud y en
Presupuesto P5 — dice "Aparta $1.022.340/mes para tu colchón inicial… en 4
meses". La contradicción que abrió la FIN ("ya tienes ~4 meses" vs "llegarías
a 3") desapareció: los tres puntos leen la misma métrica y nombran el mismo
hito.

El costo declarado se materializó tal como lo anticipó el DEC §6: la línea de
ahorro de Inicio pasó de "~4 meses" (ahorro total, fórmula halagadora) a
"~1,3 meses" (fondo real). Es la misma honestidad del hero en FIN-020 y la
mitigación está en la propia línea (invita al hito y, con fondo en 0, a marcar
la cuenta).

**Reservas honestas:** (1) frescura ~25 s aceptada en DEC §4.2 — si un aporte
grande al fondo no se refleja al instante en Inicio, es eso, no un bug; (2) la
recomendación ahora también se genera entre 3 y 6 meses (efecto correcto de
Alt C, pero es un cambio de comportamiento del motor: más usuarios verán la
candidata de fondo — declarado aquí para la RC); (3) los textos de Salud
("hasta llegar a 6 meses" en acciones y rangos) conservan sus literales porque
Salud quedó explícitamente fuera de alcance — si se quisiera plegarlos a la
constante, es un ajuste menor de un ciclo futuro.

## 5. Para la validación

- Reproducir: `npx jest` (310, sin BD) · `npm run test:e2e` (12, docker) ·
  greps de §2.
- Capturas: `docs/producto/capturas/fin-021/` (método:
  `frontend/scripts/captura/capture-fin021.js`; recomendaciones de la demo
  regeneradas con el motor real — equivalente al job nocturno).
- Checkout aislado sobre el commit de referencia.
