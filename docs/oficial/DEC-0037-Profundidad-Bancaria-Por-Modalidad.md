# DEC-0037 · Profundidad bancaria real por modalidad — progresiva y Beta-guiada (P4 del EOC)

- **Versión:** 1.0
- **Fecha:** 2026-07-16
- **Autor:** CTO (Claude)
- **Estado:** Emitida — habilita `IMP-0037`. Última FIN de la secuencia 035→036→037;
  su cierre habilita la Revisión Integral de Producto del Fundador.
- **Base:** `ARQ-0037` v1.0 (`4572f2e`) · `DEC-0033` §3/§4 · `CIERRE-0032/0034/0035/0036`
  · semilla del CPSAO (visto FIN-032)

---

## 0. Auditoría del CTO (verificación independiente contra código real)

- ✅ **`toMonthlyEffectiveRate`** existe (`interest.util.ts:16`) — función pura, ya
  usada por `CardService`, `debt-prepayment.service`, `amortization.service`,
  `simulation-engine`, `suggestions.service`. Composición real, no invención.
- ✅ **`CardService` ya deriva `usedAmount`/`creditLimit`/`availableCredit`**
  (`:150-172`) — la lectura de sobrecupo compone sobre esto, cero cálculo nuevo.
- ✅ **`debts.service.findOne`** existe (`:133`) — el punto correcto para exponer
  `depthReadings[]`.
- ✅ **`gota_a_gota`/`prestamo_familiar` ya exigen `monthlyPayment`** en su alta
  (`PACTADA_REQ`, FIN-032) — la lectura de costo real no puede toparse con un valor
  nulo inesperado; el campo siempre está si la deuda existe.

Todo lo que el ARQ afirma contra código es cierto. **Sin banderas rojas.**

## 1. Resumen ejecutivo

Se aprueba `ARQ-0037`: el deliverable de P4 es el **mecanismo** (config-sin-código
`depthReadings` + servicio hoja único) + la **disciplina de intake** Beta-guiada, no
un catálogo especulativo de ~50 eventos. Las dos primeras lecturas —costo real del
informal (la semilla del CPSAO, honrada primero) y sobrecupo visible— son
display-only, sin mutación, sin tocar Registrar.

## 2. Decisiones aprobadas

- **`depthReadings`** como extensión de `PRODUCT_TYPE_DESCRIPTORS` (mismo patrón que
  `updatePolicy` de FIN-036) — una lectura por modalidad = una fila.
- **`DepthReadingService`** como única autoridad (§32): compone funciones puras
  existentes, cero fórmula nueva, cero recálculo por pantalla.
- **Lectura 1 (semilla):** costo real del informal, con los 3 bordes honestos (con
  tasa, sin tasa, cuota≤interés) — §29.2 respetado.
- **Lectura 2:** sobrecupo visible, patrón de aviso sin juicio de FIN-024.
- **Eventos mutadores quedan fuera de este IMP**, con su patrón declarado (config +
  handler hoja + política de reversión + nivel de confirmación) para cuando entren
  por intake — correcto rechazo del framework genérico especulativo (§3.3, protege
  §31).

## 3. Condiciones de cierre (criterios de aceptación del ARQ, ratificados)

1. Lectura 1: con tasa declarada, muestra interés vs. capital; con cuota≤interés,
   verdad brutal sin juicio; sin tasa, invitación honesta a declararla — sin inventar
   cifra en ningún borde.
2. Lectura 2: se activa exactamente cuando `usedAmount > creditLimit`.
3. Config-sin-código: una lectura nueva en `depthReadings` dispara sin tocar el flujo.
4. **§32 (grep de cierre):** las lecturas existen SOLO en `DepthReadingService`; cero
   recálculo por pantalla; cero fórmula nueva.
5. §29.2/Independencia: copy informa, nunca culpa ni recomienda contratar — revisión
   explícita del texto real, no solo declaración de intención.
6. **NO toca `transactions.service`** (grep de cierre, no solo declaración) — cero
   migración (confirmado: cero columnas nuevas).
7. Disciplina de intake documentada en BACKLOG como cola de candidatas.

## 4. Observaciones aceptadas

Los eventos mutadores (avances, retanqueo, notas crédito, gracia, compras
internacionales) quedan en la cola de intake — cada uno entra con su propio mini-ciclo
cuando el Fundador lo priorice, con política de reversión y nivel de confirmación
declarados antes de implementar. Si alguno toca Registrar, dispara la instrucción
permanente del Fundador — no se diseña sin sus observaciones primero.

## 5. Próximos pasos

`IMP-0037` habilitado. Entrega con SHA — auditoría y decisión directa del CTO. Su
cierre completa la secuencia 035→036→037 y habilita la **Revisión Integral de
Producto** que el Fundador previó tras cerrar las tres.
