# IMP-0022 · Experiencia de Deudas

- **Versión:** 1.0
- **Fecha:** 2026-07-12
- **Autor:** Agente Arquitecto/Desarrollador
- **Estado:** Entregado — para VALIDACIÓN del Auditor y posterior cierre del CTO
- **Historial de cambios:**
  - v1.0 (2026-07-12) — emisión tras DEC-0022 (P1–P5 + los 4 cambios
    obligatorios de §5 incorporados desde el diseño).
- **Módulo/Feature:** FIN-022 · **Origen (§27):** Mejora de revisión de producto
- **Documentos base:** `ARQ-0022` v1.0 (commit `23d9967`) · `AUD-0022` ·
  `DEC-0022` · `COMPRENSION-FIN022-Deudas.md`
- **Referencia inmutable (regla GOBERNANZA):** commit
  **`0f75a5cd187a121337d3016491d5e1aa92383486`**

## 1. Resumen

La lista de Deudas dejó de ser un archivador: hero del frente completo (cuánto
debo, qué suman mis cuotas, cuándo quedo libre de TODO), bloque de **orden de
ataque** alimentado por el motor real de FIN-007, y tarjetas con el costo en
pesos. El detalle (FIN-012/013) quedó intacto, verificable en el diff. Los 4
cambios obligatorios del DEC §5 están en el diseño, no parchados.

## 2. Cumplimiento por pieza (DEC-0022)

| Pieza | Implementación | Verificación |
|---|---|---|
| P1 hero | "Debes {total} · N deudas" + "Tus cuotas suman {X} al mes" + "🏁 Libre de todo: {máx payoffDate}" — total del MISMO summary que consume Inicio; fecha de libertad = máx de las amortizaciones existentes | Captura; e2e `totalDebt` |
| P2 + **§5.1** | `attackOrder(debts, strategy)` NUEVO helper puro en `portfolio.simulator.ts`; `pickTarget` (el paso 3 de la simulación) ahora lo consume — el orden del summary y el de la simulación son la misma función por construcción | Spec: `payoffOrder[0] === attackOrder[0]`; e2e: summary == Simulador en estrategia y cifra |
| P2 + **§5.2** | Copy: "Pagar la más cara primero (avalancha) en vez de la más pequeña (bola de nieve) te ahorra {X} en intereses" — la cifra descrita como lo que ES; con diferencia < $1.000, copy alternativo ("ambos órdenes cuestan casi lo mismo — este es el recomendado"), jamás "$0" | Captura real: la demo (2 deudas de plazos similares) cae justo en el caso alternativo — el manejo de ≈0 no era teórico |
| P2 + **§5.3** | Contrato `extraBudget = 0` documentado en `strategyOverview` (el orden no depende del excedente; la cifra es el PISO del ahorro); la divergencia con Recomendaciones (`surplus*0.3` — responde "¿y si además abonas?") queda declarada en el código y aquí | Comentario en `simulations.service.ts`; este IMP |
| P2 + **§5.4** | Gate doble: `debts.length > 1` en el summary y re-verificación dentro de `strategyOverview` (que además se omite si el motor no puede comparar — `feasible=false`, §29.1) | e2e: con 1 deuda `strategy: null`; Inicio no dispara simulación para 0/1 deuda |
| P3 | Tarjetas: tasa · cuota · "vence {fecha}" (`nextDueDate` visible — cierra la mejora ARQ-0018 §10) · "Intereses restantes: {X}" (dato que el list ya traía) · fecha fin | Captura |
| P4 | "(ya pasó)" neutro junto al vencimiento vencido — cero detección, cero juicio; mora = FIN-024 | Código: una comparación de fecha, sin lógica nueva |
| P5 | Detalle sin cambios (`DebtDetailScreen` no aparece en el diff) | Diff del commit |
| Degradaciones | 1 deuda → "⭐ Tu jugada con esta deuda" (puente al abono real del detalle); 0 deudas → estado vacío original | Captura cold-start REAL (usuario nuevo por API) |

## 3. Suites y criterios (ARQ-0022 §13)

- Unitaria **313/313** (+3 de `attackOrder`, incluida la consistencia con la
  simulación). E2E **15/15** (+3: gate, orden con nombres reales, igualdad §32
  summary==Simulador con BD real).
- §13.1 ✓ (igualdad e2e; grep: la pantalla y el summary no calculan nada — solo
  el motor) · §13.2 ✓ (caso a mano; la degradación 0/1 deuda y motor-sin-respuesta
  cubiertas) · §13.3 ✓ (`capturas/fin-022/`: antes, después y cold-start) ·
  §13.4 ✓ (copy "tus cuotas suman"; "desembolso real" no aparece — FIN-023) ·
  §13.5 ✓ (tsc limpio; detalle intacto) · §13.6 ✓ (ARQ §5).

## 4. Juicio razonado

**¿El usuario con deudas sale sabiendo cuál atacar primero y qué le cuesta?
Sí — y la captura del "antes" muestra cuánto faltaba:** antes, dos tarjetas
sueltas; después, la pantalla se lee de arriba a abajo como una estrategia:
"debes $11M en 2 deudas y quedas libre en may 2029; tu orden es avalancha —
🎯 primero la Tarjeta (26% EA); esta te cuesta $482.769 en intereses restantes
y vence el 27 de jul". La decisión ejecutable está a un tap (detalle → abono
real) y la comparación completa a otro (simulador).

**Hallazgo honesto de la captura:** con las 2 deudas de la demo, la diferencia
entre estrategias es ≈0 y el bloque muestra el copy alternativo del DEC §5.2 —
matemáticamente correcto (con solo cuotas mínimas y plazos similares, el orden
casi no cambia el costo; el orden importa cuando hay excedente que dirigir). El
caso "diferencia grande" quedó demostrado en el e2e (3 deudas de plazos
escalonados). Es la vida real del dato, no un defecto — pero la RC debería
mirar si el copy alternativo merece un puente más directo al abono extra.

**Reservas:** (1) la fecha de libertad del hero sale del CONTRATO actual (máx
payoffDate de amortizaciones), no de la simulación con roll-over — son conceptos
distintos y solo el primero está en pantalla; declarado por si el CPSAO pregunta
por qué no coincide con `strategy.months`; (2) `strategy.months` viaja en el
payload pero la UI aún no lo usa (reserva para la revisión de producto); (3) la
latencia del summary con 2+ deudas incluye la doble simulación — negligible hoy
(AUD §4), medible si el portafolio crece.

## 5. Para la validación

- Reproducir: `npx jest` (313) · `npm run test:e2e` (15, docker) · `npx tsc
  --noEmit` en frontend.
- Capturas: `docs/producto/capturas/fin-022/` (método:
  `frontend/scripts/captura/capture-fin022.js` — cold-start registra usuario
  real por API, nunca simulado).
- Checkout aislado sobre el commit de referencia.
