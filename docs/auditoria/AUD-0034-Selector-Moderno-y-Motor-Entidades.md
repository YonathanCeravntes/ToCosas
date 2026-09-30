# AUD-0034 · Selector moderno de obligaciones + motor de entidades (P1 del EOC)

- **Documento auditado:** `docs/arquitectura/ARQ-0034-Selector-Moderno-y-Motor-Entidades.md` v1.0 (commit `b0f4cc7`)
- **Insumos:** `DEC-0033` (umbrella EOC, §4 criterios transversales) · `CIERRE-0032` (fundación) · guardarraíles A–K · `GOBERNANZA.md` §32/§42 · código verificado contra `HEAD`
- **Realiza:** Auditor de Milla
- **Fecha:** 2026-07-14

---

## 1. Resumen Ejecutivo

`ARQ-0034` reemplaza el muro de 12 chips por un selector moderno **extendiendo** el motor de
entidades que ya existe — sin esquema nuevo, sin fórmula nueva, sin IA. Es un ARQ limpio y
bien acotado (no toca Registrar, P2). Los cuatro puntos que el Arquitecto pidió verificar
resuelven **favorablemente contra código**. Observaciones ligeras, ninguna bloqueante.

## 2. Los cuatro puntos que el Arquitecto pidió verificar

### Punto 1 — Independencia (orden solo relevancia/recencia; camino libre garantizado) → **diseño correcto**

`EntitiesService.findAll` hoy mezcla propias + globales y filtra por `name contains`
(`entities.service.ts:10-21`), ordenando por `name asc`. P1 enriquece **el orden**
(relevancia por prefijo + reciente/propio primero), **no** la fórmula — y se compromete a
cero campo de "recomendado/score" y a que ordenar por patrocinio esté prohibido. El **camino
libre** (entidad fuera del catálogo → nombre libre → `create` privado reversible por
soft-delete → deuda) usa el `create` existente. Es reconocimiento, no recomendación —
consistente con `DEC-0033` §4.5. **Los tests declarados (§13.4: sin campo de ranking; entidad
fuera del catálogo igual crea la deuda) son la verificación correcta** — la Validación los
ejecuta.

### Punto 2 — §32 (`typicalRate` solo prellenado; ningún cálculo lee `FinancialEntity`) → **CONFIRMADO**

Grep contra `HEAD`: **ningún servicio de cálculo lee `typicalRate`.** Las dos únicas
referencias a `FinancialEntity` fuera del módulo `entities` son legítimas y **no son cálculo**:
`conversation.service.ts:142` (`findFirst` para vincular la entidad por nombre en el registro
conversacional) y `sync.service.ts:26` (`findMany` para exportar/sincronizar). Ninguna deriva
un número financiero de la entidad. La cuota/saldo/"lo comprometido"/DTI siguen en sus fuentes
únicas (FIN-032/023/027). **El grep de cierre es cumplible.** *Precisión (Obs. 1):* el grep de
cierre debe apuntar a "ningún cálculo lee `typicalRate`/campos de `FinancialEntity`", no a
"cero referencias a `FinancialEntity`" — o los dos reads legítimos (linking/sync) lo harían
fallar sin ser un problema.

### Punto 3 — config-sin-código como test de aceptación real → **correcto**

`GLOBAL_ENTITIES` (lista declarada, patrón `PRODUCT_TYPE_DESCRIPTORS`) + `seedGlobalEntities()`
idempotente (upsert por `(name, isGlobal)`): añadir una entidad = una fila de config, buscable
sin tocar UI (test §4.5). Y un tipo nuevo del descriptor aparece en el selector porque este
renderiza desde `/debts/catalog` (FIN-032). Es el mismo criterio comprobable de FIN-032 —
evidencia, no promesa. ✓

### Punto 4 — Gate DPA+PIA (búsqueda determinista, sin IA) → **CONFIRMADO**

Grep: **cero imports de IA en el módulo `entities`.** La búsqueda es SQL (`contains`/prefijo),
no un modelo. El autocompletar no toca el LLM; el gate queda intacto. ✓

## 3. §42 y experiencia

- **§42:** el alta es un hecho directo (sin 2ª confirmación, coherente con FIN-032); crear una
  entidad privada desde nombre libre es reversible (soft-delete existente). No hay cascada aquí
  (eso es P2). Correcto.
- **Independencia del catálogo:** el mapa `ENTITY_TYPE_TO_DEBT_TYPE` (`prestamista_particular
  →gota_a_gota`, etc.) es un **prellenado editable**, nunca imposición — consistente. El
  `IMP`/UI debe garantizar que la inferencia de tipo siempre se pueda cambiar (Obs. 2).
- **Calma, no ansiedad:** el selector no notifica ni insiste — herramienta de registro. ✓

## 4. Filtro §31

Sustantiva — "Tengo una tarjeta → busco Nu → aparece con su categoría y tasa típica como pista
→ registro en dos toques", con el camino libre intacto. Primer eslabón del EOC: reconocer al
usuario sin recomendarle nada. FIN-032 dio el catálogo de *tipos*; esta da el de *entidades*.
Cumple.

## 5. Observaciones (ligeras, no bloqueantes)

1. **Alcance del grep §32 de cierre:** apuntar a lecturas de `typicalRate`/campos de
   `FinancialEntity` **en servicios de cálculo**, no a toda referencia a `FinancialEntity` — los
   reads legítimos de `conversation.service` (linking) y `sync.service` (export) no son cálculo
   y no deben hacer fallar el criterio.
2. **`typicalRate` como prellenado:** el `IMP` debe escribir en `Debt` la tasa que **el usuario**
   confirma (editable), nunca la `typicalRate` de la entidad en silencio — el test debe fijar que
   editar la tasa en el alta gana sobre la pista.
3. **Inferencia de tipo (§4.3):** siempre editable; el test de Independencia debe cubrir que
   elegir una entidad no bloquea cambiar el tipo.

## 6. Veredicto

**APROBADO CON OBSERVACIONES.**

ARQ limpio y bien acotado: extiende el motor de entidades existente (sin esquema nuevo, sin
fórmula nueva, sin IA — todo verificado contra código), reemplaza el muro de chips por un
selector moderno que sigue armando el alta desde el descriptor de FIN-032, y respeta
Independencia (reconocimiento no recomendación + camino libre), §32 (ningún cálculo lee la
entidad — confirmado por grep), el gate DPA+PIA (cero IA en `entities`) y config-sin-código como
test de aceptación real. Las observaciones son precisiones ligeras (alcance del grep de cierre;
que la tasa editada del usuario gane sobre la pista de la entidad; inferencia de tipo siempre
editable). Ninguna exige cambios de diseño.
