# DEC-0033 (umbrella de programa) · Ecosistema de Créditos y Obligaciones (EOC) — profundidad y experiencia

- **Versión:** 1.0
- **Fecha:** 2026-07-14
- **Autor:** CTO (Claude)
- **Estado:** Emitida — **decisión umbrella de PROGRAMA CONTINUO** (post FIN-030). Aprueba el
  alcance y la secuencia; habilita el ciclo detallado de la **primera FIN (P1 = FIN-034)**.
  NO autoriza implementar el programa de golpe (§36.2, un FIN a la vez). **No reabre FIN-030.**
- **Base:** visión del Fundador + decisión de producto del CPSAO
  (`docs/correspondencia/Ecosistema-Creditos-y-Obligaciones.md`) · fundación consolidada
  `DEC-0030`/`CIERRE-0032` · `GOBERNANZA.md` §32/§42 · guardarraíles A–K

---

## 0. Nota de numeración (protección §32 — única definición por concepto)

La visión del Fundador llegó titulada por él "DEC-0030". **`DEC-0030` ya denota la fundación del
SO Financiero (consolidada hoy).** Para no crear dos definiciones bajo el mismo número, esta
visión se registra como **el programa EOC bajo `DEC-0033`**. No es un rechazo: es exactamente la
disciplina de numerado único que la propia visión pide para los conceptos financieros, aplicada a
la gobernanza. La fundación no se toca; esto es el programa de profundidad **sobre** ella.

## 1. Verificación independiente previa (CTO)

Verifiqué contra el código, no sobre el reporte del CPSAO:
- **El "motor dinámico por configuración" YA existe** — `PRODUCT_TYPE_DESCRIPTORS` (autoridad
  única de tipo), despacho por `scheduleModel`, `DebtOutlayService` (autoridad de "lo
  comprometido"), capa de consecuencias por evento sobre el outbox. Auditado con los 4 arquetipos
  (CIERRE-0032). El CPSAO tiene razón: **esto NO se inventa, se profundiza.**
- **El motor de entidades YA existe** — `model FinancialEntity` (`name`/`type`/`typicalRate`/
  `logoUrl`/**`isGlobal`** para catálogo compartido) + módulo `entities` con CRUD; `Debt`,
  `Transaction`, `Account` ya referencian `entityId`. P1 **extiende** (siembra catálogo global +
  búsqueda/autocomplete + selector moderno), no construye de cero.

## 2. Principio rector del programa (del CPSAO §2, ratificado)

**La riqueza vive en el modelo a lo largo del tiempo, no en el momento del alta.** El usuario da
el mínimo para empezar; el sistema representa la realidad completa **progresivamente y solo cuando
cada hecho ocurre** (una compra internacional se captura cuando sucede, no como campo del alta).
"Comportamiento bancario exacto" es propiedad del **motor en el tiempo**, no del **formulario**.
Extensión directa de los guardarraíles B (mínimo obligatorio) y H (heredar, no re-preguntar).

## 3. Desglose FIN del programa (CTO) — reconciliado con BACKLOG

Ordenado por el Principio Supremo del Fundador (pensar menos / registrar más rápido / sentirse
entendido) y la prioridad de producto del CPSAO (P1–P4):

| FIN | = | Alcance | Toca Registrar | Notas |
|---|---|---|---|---|
| **FIN-034** | **P1** | **Selector moderno de obligaciones + catálogo de entidades** (búsqueda/categorías/historial/favoritos; autocompletar entidad "Visa"→Visa Bancolombia…; lenguaje en 1ª persona "Tengo una tarjeta"). **Reemplaza el muro de 12 chips de FIN-032.** Extiende el módulo `entities` (siembra catálogo global + endpoint de búsqueda) + UI. | No (alta + catálogo, no la cascada) | **Primera en abrir.** Su frontend es la "otra modificación relacionada" a **agrupar en un solo OTA con FIN-032.** |
| **FIN-035** | **P2** | **Registrar como puerta del ecosistema** — "¿cómo pagaste?" completo por método + cascada visible/reversible (§42). Sobre la espina de FIN-031. Fin de la doble digitación. | **SÍ (de lleno)** | **Dispara la instrucción permanente del Fundador:** NO abro su ARQ hasta que el Fundador entregue sus observaciones sobre Registrar. Aviso anticipado emitido. |
| **FIN-036** | **P3** | **Inteligencia de actualización / proactividad** — confirmación mensual por corte + config por modalidad de qué-cambia / qué-no / qué se pregunta una vez / cada mes. "Calmada, no ansiosa". | Parcial (confirmación) | **Absorbe la "confirmación mensual" del antiguo FIN-033.** Depende de cadencia de uso real → tras P1/P2. |
| **FIN-037** | **P4** | **Profundidad bancaria real por modalidad** (sobrecupo, avances, retanqueo, período de gracia, notas crédito, reversiones…): **progresiva y guiada por lo que los usuarios Beta realmente tienen**, no los ~50 eventos de las 19 modalidades por adelantado. | Según evento | **Absorbe la "profundidad avanzada por producto" del antiguo FIN-033.** Cada evento entra cuando un usuario lo topa. |

**Reconciliación del antiguo `FIN-033`:** su alcance se **divide** en FIN-036 (confirmación
mensual/proactividad) + FIN-037 (profundidad por modalidad). FIN-033 queda marcado como
**re-escopado/superado** por estos dos (sin definición duplicada, §32).

## 4. Criterios de cierre TRANSVERSALES (aceptación de CADA FIN del programa)

Del CPSAO §4–§5, como criterios auditables, no aspiraciones:
1. **§32 — separación estricta de conceptos** (capital/interés/seguro/mora/cupo/saldo: cada uno
   una definición, ninguno reutilizado como otro). **Grep de cierre.**
2. **§42 — visible/explicable/reversible.** Todo lo que el bot/IA proponga se **confirma antes de
   comprometer y se puede deshacer** ("propuesto, confirmado, reversible", nunca "mágico y ciego").
3. **Config-sin-código como TEST DE ACEPTACIÓN** (el criterio comprobable del CPSAO §5, en lugar
   de "resuelto para siempre"): **agregar una modalidad nueva se hace solo por configuración, sin
   tocar la interfaz — y se prueba** añadiendo una modalidad por config en el test. Escalabilidad =
   evidencia, no promesa.
4. **Gate DPA+PIA** (`PRODUCCION.md` §1) gobierna la IA con datos reales: el diseño avanza; la
   habilitación con datos reales no, hasta cerrar el gate.
5. **Independencia del catálogo de entidades:** reconocimiento, no recomendación — nunca rankea ni
   sugiere una entidad como "mejor"; degrada con gracia (si la entidad no está, el camino libre
   siempre existe; nadie queda bloqueado).
6. **Calma, no ansiedad:** Milla pregunta solo ante señal real de cambio, callada sobre lo estable.

## 5. Próximos pasos

- **`FIN-034` (P1) habilitada** — emito la directiva de `ARQ-0034` al Arquitecto (extender el
  motor de entidades + selector moderno; los 6 criterios transversales como aceptación).
- **`FIN-035` (P2): retención Registrar** — aviso anticipado al Fundador; su ARQ no abre sin sus
  observaciones (instrucción permanente).
- **FIN-036/037** en roadmap; el detalle campo-por-campo NO se diseña en este umbrella (un FIN a
  la vez). "Profundidad para siempre / cientos de modalidades / multi-país" NO es criterio de
  cierre (infalsable); se reemplaza por el test de config-sin-código (§4.3).
- **OTA:** el frontend de FIN-034 es la modificación que se **agrupa con FIN-032 en una sola
  publicación OTA gateada** (§40 + centinela), según la decisión de release del Fundador.
