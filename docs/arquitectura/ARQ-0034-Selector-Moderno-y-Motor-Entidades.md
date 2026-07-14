# ARQ-0034 · Selector moderno de obligaciones + motor de entidades (P1 del EOC)

- **Versión:** 1.0
- **Fecha:** 2026-07-14
- **Autor:** Agente Arquitecto
- **Estado:** Emitido — para AUD-0034 y validación del CTO (§36.2)
- **Historial de cambios:**
  - v1.0 (2026-07-14) — primera FIN (P1) del programa EOC (DEC-0033).
- **Módulo/Feature:** FIN-034 (P1 de DEC-0033) · **Origen (§27):** Visión del Fundador +
  decisión de producto del CPSAO · Prioridad MÁXIMA
- **Documentos base:** `DEC-0033` (umbrella EOC, §4 criterios transversales) · fundación
  consolidada `CIERRE-0032` · guardarraíles A–K · GOBERNANZA §32/§42

## 0. Observación de frontera (NO toca Registrar)

FIN-034 toca **solo** el alta de obligaciones y el catálogo de entidades. **NO** toca la cascada
de Registrar/Transacciones ("¿cómo pagaste?") — eso es FIN-035 (P2), bajo retención de la
instrucción permanente del Fundador. Si el IMP necesitara tocar `transactions.service`, me
detengo y aviso. La única superficie de entrada que cambia es la pantalla de **alta de deuda**
(`AddDebtScreen`), que hoy muestra el muro de 12 chips de FIN-032.

## 1. Objetivo

Reemplazar el muro de 12 chips por un **selector moderno** —búsqueda, categorías, historial,
autocompletar entidad, lenguaje en 1ª persona— **extendiendo** el motor de entidades que ya
existe. El alta sigue **interpretando configuración** (los `PRODUCT_TYPE_DESCRIPTORS` de FIN-032):
el selector añade la capa de *reconocimiento de entidad* encima, sin reabrir la fundación.

## 2. Problema (verificado contra código)

- **El motor de entidades ya existe pero el catálogo global está VACÍO:**
  `model FinancialEntity` (`name`/`type`/`typicalRate`/`logoUrl`/`isGlobal`) + `EntitiesService`
  con CRUD y **`findAll(userId, q)` que ya mezcla propias + globales y filtra por nombre**
  (`entities.service.ts:10-21`). Verificado: `financialEntity.count({where:{isGlobal:true}}) === 0`
  — no hay nada que reconocer todavía.
- **El alta es un muro de 12 chips** (`AddDebtScreen`, FIN-032): funciona y es §32-limpio, pero no
  es "Tengo una tarjeta / busca tu banco" — no reconoce la entidad ni prioriza lo del usuario.
- `EntityType` tiene 6 valores (banco, cooperativa, fintech, prestamista_particular, tarjeta, otro)
  y `Debt.entityId` ya existe → la deuda puede colgar de su entidad sin migrar.

## 3. Alcance

**Dentro (P1):**
1. **Siembra del catálogo global** (`isGlobal: true`) desde una **lista declarada** (config).
2. **Búsqueda/autocomplete** (extiende el endpoint existente): relevancia por prefijo + lo del
   usuario/reciente primero + degradación con gracia.
3. **Mapa entidad→tipo** (config) para inferir/prellenar el tipo al elegir una entidad.
4. **Selector moderno** (UI) que reemplaza el muro de chips y arma el alta desde el descriptor.

**Fuera (declarado):** la cascada de Registrar / "¿cómo pagaste?" (**FIN-035, P2**); confirmación
mensual (FIN-036); profundidad bancaria por evento (FIN-037); favoritos persistidos (P1 usa
*recencia* derivada); logos remotos que requieran red (P1 usa monograma/ícono de categoría como
respaldo — sin dependencia externa).

## 4. Diseño

### 4.1 · Catálogo global sembrado (config-sin-código, Independencia)

Una **lista declarada** `GLOBAL_ENTITIES` (config, patrón `PRODUCT_TYPE_DESCRIPTORS`) con las
entidades colombianas más comunes por categoría: bancos (Bancolombia, Davivienda, BBVA, Banco de
Bogotá, Scotiabank Colpatria…), fintech (Nu, RappiCard, Nequi, Lulo, Ualá…), compra a cuotas
(Addi, Sistecrédito…), cooperativas, y un genérico `prestamista_particular` ("Prestamista
particular / gota a gota"). Cada fila: `{ name, type, typicalRate?, rateType? }`.

- **Siembra idempotente:** `seedGlobalEntities()` hace *upsert* por `(name, isGlobal:true)` — se
  puede correr en cada deploy sin duplicar. Añadir una entidad = **una fila en el config** (test
  de config-sin-código, §4.5). No hay panel ni migración por entidad.
- **Independencia (DEC-0033 §4.5):** el catálogo es **reconocimiento, no recomendación**. Nunca
  rankea "la mejor", nunca ordena por patrocinio; `typicalRate` es una **pista** que prellena el
  alta ("tasa típica ~%"), **editable y jamás la autoridad §32** (la tasa real la pone el usuario).
- **Logos:** `logoUrl` es opcional; la UI cae a un **monograma** (inicial + color por categoría)
  si no hay logo o si falla — sin fetch externo obligatorio (seguridad + offline).

### 4.2 · Búsqueda / autocomplete (extiende `EntitiesService.findAll`)

Se conserva el endpoint `GET /entities?q=` y se **enriquece el orden** (no la fórmula):
- **relevancia:** prefijo del nombre primero, luego "contiene";
- **recencia/pertenencia:** las entidades del propio usuario y las que ya usa en sus deudas
  (`Debt.entityId`) primero — *historial* sin columna nueva;
- **filtro opcional `type`** para acotar por categoría;
- **degradación con gracia:** sin `q` → estado *browse* (categorías + recientes + populares); con
  0 resultados → se ofrece el **camino libre** (escribir el nombre) — nadie queda bloqueado.

### 4.3 · Mapa entidad→tipo (config, una pista)

`ENTITY_TYPE_TO_DEBT_TYPE` (config): `tarjeta→tarjeta_credito`, `fintech→fintech`,
`prestamista_particular→gota_a_gota`, `cooperativa/banco→` (sin default único: un banco ofrece
varios productos → el selector muestra una elección corta de tipo tras la entidad). Es una
**sugerencia de prellenado**, nunca una imposición; el usuario cambia el tipo si hace falta.

### 4.4 · El selector moderno (UI, reemplaza el muro de chips)

Búsqueda primero, 1ª persona. Reemplaza `AddDebtScreen` (chips) por:
1. **Buscador** "¿Qué deuda quieres registrar? Busca tu banco, tarjeta o tipo…".
2. **Resultados en vivo:** entidades del catálogo (monograma/logo + categoría), lo del usuario/
   reciente primero; y **anclas de tipo** (las 12 etiquetas del descriptor) para quien no busca por
   entidad. Estado vacío = categorías + recientes.
3. **Al elegir una entidad** → se infiere el tipo (mapa §4.3), se prellena `name` (nombre de la
   entidad) y la pista de tasa, y se abre **el alta mínima del descriptor** (FIN-032, guardarraíl
   B). Si la entidad es un banco (varios productos), una elección corta de tipo antes del alta.
4. **Al elegir un tipo** directamente → el alta del descriptor, con búsqueda de entidad **opcional**
   embebida (para colgar la deuda de su entidad).
5. **Degradación con gracia:** "¿No está tu entidad? Escríbela" → nombre libre → entidad privada
   (`create`, reversible por soft-delete) → tipo → alta. El camino libre **siempre** existe.

El alta reutiliza `GET /debts/catalog` (los descriptores de FIN-032) — **cero lógica de alta
nueva** ni literal de tipo en pantalla (§32 intacto de FIN-032).

### 4.5 · Config-sin-código como TEST DE ACEPTACIÓN (DEC-0033 §4.3)

Criterio comprobable, no aspiración: **agregar una modalidad/entidad se hace solo por config**.
- Test: añadir una fila a `GLOBAL_ENTITIES` → `seedGlobalEntities()` → `GET /entities?q=` la
  devuelve y el alta con ella funciona — **sin tocar la UI**.
- Test: un tipo nuevo en `PRODUCT_TYPE_DESCRIPTORS` aparece en `/debts/catalog` y el selector lo
  ofrece automáticamente (el selector renderiza desde el catálogo).

### 4.6 · Criterios transversales (DEC-0033 §4)

- **§32:** el catálogo de entidades **no computa ningún número financiero**; `typicalRate` es
  prellenado editable, jamás autoridad — cuota/saldo/"lo comprometido"/DTI siguen en sus fuentes
  únicas (FIN-032/023/027). Grep de cierre: ningún cálculo lee campos de `FinancialEntity`.
- **§42:** el alta es un **hecho directo** (sin 2ª confirmación, coherente con FIN-032); crear una
  entidad privada desde un nombre libre es **reversible** (soft-delete existente). No hay cascada
  aquí (eso es P2).
- **Gate DPA+PIA:** la búsqueda es **determinista** (SQL prefijo/contiene) — **no toca el LLM**;
  el gate queda intacto (grep = 0 imports de IA en `entities`).
- **Independencia:** sin ranking "mejor" ni orden patrocinado; solo relevancia/recencia; camino
  libre garantizado. Test: la respuesta no trae campo de "recomendado/score" y una entidad fuera
  del catálogo igual crea la deuda.
- **Calma, no ansiedad:** el selector no notifica ni insiste; es una herramienta de registro.

## 5. Respuesta al filtro §31

Sin P1, el usuario elige su deuda de un muro de 12 chips genéricos que no reconoce su banco ni su
tarjeta, y el catálogo de entidades (que ya existe en el modelo) queda inerte. **Valor
diferencial:** "Tengo una tarjeta → busco *Nu* → aparece con su categoría y su tasa típica como
pista → registro en dos toques", con el camino libre intacto si su entidad no está. Es el primer
eslabón del EOC: reconocer al usuario sin recomendarle nada (Independencia). Ninguna FIN previa lo
da — FIN-032 dio el catálogo de *tipos*; esta da el de *entidades* y la experiencia de selección.

## 6. Componentes

Backend: `global-entities.catalog.ts` (lista declarada) + `seedGlobalEntities()` idempotente;
`EntitiesService.search()` (orden por relevancia/recencia, filtro `type`, degradación);
`ENTITY_TYPE_TO_DEBT_TYPE` (config de prellenado). Frontend: `AddDebtScreen` → selector moderno
(buscador + resultados + estado browse + degradación) sobre `GET /entities` y `GET /debts/catalog`;
monograma de respaldo para logos. Tests: config-sin-código (entidad y tipo), Independencia (sin
ranking + camino libre), §32 (entidad no computa números), gate IA (grep), regresión del alta.

## 7. Base de datos

**Sin cambios de esquema** — `FinancialEntity.isGlobal`/`logoUrl`/`typicalRate` ya existen y
`Debt.entityId` ya cuelga la deuda de su entidad. La siembra es *data* (upsert idempotente), no
migración por entidad. Si el catálogo creciera y pidiera búsqueda por prefijo indexada, un índice
sobre `name` es un extra declarado (no bloqueante en P1).

## 8. Backend

Cero fórmula financiera nueva (§32). La búsqueda reusa `findAll` (una consulta) con orden; la
siembra es un upsert. El mapa entidad→tipo y el catálogo global son **config** (una fuente).

## 9. Uso de IA

Ninguno. La búsqueda es determinista; el gate DPA+PIA queda intacto (sin imports de IA en
`entities`). El autocompletar es SQL, no un modelo.

## 10. Riesgos

- **El catálogo derivando en recomendación** (viola Independencia): mitigado por orden solo
  relevancia/recencia + test que prohíbe campo de ranking/score y exige el camino libre.
- **`typicalRate` tomándose como autoridad** (viola §32): mitigado — es prellenado editable; grep
  de que ningún cálculo lee `FinancialEntity`.
- **Logos remotos** (red/seguridad/offline): mitigado — `logoUrl` opcional + monograma de respaldo,
  sin fetch externo obligatorio en P1.
- **Fricción del selector** vs. los chips: mitigado — búsqueda + browse + anclas de tipo; el camino
  libre nunca desaparece.
- **Regresión del alta** (FIN-032): el alta sigue armándose desde `/debts/catalog`; test de que
  crear cada tipo sigue funcionando.

## 11. Dependencias

FIN-032 (catálogo de tipos/descriptores, `8473ed5`/`c96c355`), el módulo `entities` existente,
`Debt.entityId`. Ninguna nueva. NO depende de Registrar (P2).

## 12. Impacto

Primer eslabón del EOC: el catálogo de entidades cobra vida y el alta pasa de un muro de chips a
un reconocimiento en 1ª persona, sin reabrir la fundación ni tocar Registrar. Habilita que P2
(Registrar como puerta) cuelgue de entidades ya reconocidas.

## 13. Criterios de aceptación

1. **Selector moderno** reemplaza el muro de chips: búsqueda + browse + degradación con gracia
   (captura). El alta se arma desde el descriptor (guardarraíl B intacto).
2. **Catálogo global sembrado** y buscable: `GET /entities?q=nu` devuelve Nu (global) con su
   categoría; lo del usuario/reciente primero.
3. **Config-sin-código (test):** añadir una entidad al config la hace buscable sin tocar UI; un
   tipo nuevo del descriptor aparece en el selector.
4. **Independencia (test):** sin campo de ranking/recomendado; una entidad fuera del catálogo igual
   crea la deuda (camino libre).
5. **§32 (grep):** ningún cálculo lee `FinancialEntity`; `typicalRate` solo prellena. **Gate IA
   (grep):** cero imports de IA en `entities`.
6. Suites + typecheck + build; capturas del selector y de la degradación. Filtro §31 (§5).

## 14. Plan

1. Validación CTO → **AUD-0034** (foco: Independencia + §32 + config-sin-código) → **DEC-0034** →
   2. `global-entities.catalog.ts` + `seedGlobalEntities()` + `EntitiesService.search()` +
   `ENTITY_TYPE_TO_DEBT_TYPE` → 3. `AddDebtScreen` → selector moderno (sobre `/entities` +
   `/debts/catalog`) → 4. tests (config-sin-código, Independencia, §32, gate IA, regresión del
   alta) + capturas → 5. **IMP-0034** con SHA y juicio razonado → validación del CTO → cierre.
   **OTA:** su frontend se agrupa con FIN-032 en una sola publicación gateada (decisión de release
   del CTO/Fundador, §40/§41).
