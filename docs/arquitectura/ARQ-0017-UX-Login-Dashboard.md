# ARQ-0017 · Mejora de UX — Login y Dashboard

- **Versión:** 1.3
- **Fecha:** 2026-07-11
- **Autor:** Agente Arquitecto
- **Estado:** Corregido según DEC-0017 §5/§6.1 — en espera de confirmación puntual del CTO (sin nueva vuelta de auditoría, DEC-0017 §7.2)
- **Historial de cambios:**
  - v1.0 (2026-07-11) — 4 prioridades con ≥2 alternativas cada una.
  - v1.1 (2026-07-11) — por directriz del CTO ("diseñar la mejor evolución, no
    implementar mecánicamente las observaciones"): se añade la composición integrada
    de ambas pantallas (§4.6) y se explicita una decisión importante que estaba
    implícita — el tratamiento del bloque de gamificación (§4.5). Sin cambios de
    alcance.
  - v1.2 (2026-07-11) — correcciones puntuales de DEC-0017: §4.7 (Login a 4
    micro-líneas, Hallazgo 4; interpretación de "Deuda total" por la ruta (a) con
    cifras propias del Dashboard, Hallazgo 1+2; textos definitivos de las 3
    interpretaciones bajo los criterios §29 del CPSAO) y §11 corregido (precisión de
    dependencias, Hallazgo 3). Los wireframes de §4.6 quedan superseded en esas
    piezas por §4.7.
  - v1.3 (2026-07-11) — hallazgo del CTO en la confirmación: la tarjeta de Deuda
    total mostraba 'cuotas del mes' (programadas, del resumen de deudas) junto a la
    interpretación basada en pagado-del-ciclo — misma mezcla del Hallazgo 1+2 en otro
    sitio. Resuelto por la ruta preferida (§4.7.5): UNA sola cifra de cuota en la
    tarjeta, la pagada del ciclo. Además se corrige una imprecisión de v1.2: los
    cortes REALES del indicador de FIN-004 son 0,20/0,35 (health.service.ts:129), no
    '30/45' — la implementación usa los reales vía la constante exportada
    DEBT_RATIO_CUTS.
- **Módulo/Feature:** FIN-017 · **Origen (Gobernanza v3.5 §27):** Mejora de revisión de producto (`PRODUCT_REVIEW_001` / Lote 01 de capturas)
- **Referencia visual del estado actual:** `docs/producto/capturas/lote-01/` (capturas reales, commit `0bfa154`)

---

## 1. Objetivo

Reducir la fricción de comprensión en las dos pantallas de mayor tráfico: que un
usuario nuevo entienda qué hace Milla en ≤5 segundos (Login) y que un usuario activo
lea su situación de un vistazo, con interpretación y lenguaje cotidiano (Dashboard).
**Iteración pequeña y medible, no rediseño** (directriz del CPSAO).

## 2. Problema (contra las capturas reales del Lote 01)

1. **Login** (`01-login.png`): el tagline "Cuida tus millos, sal de deudas con calma"
   es tono, no propuesta — no dice QUÉ hace la app (deudas, presupuesto, score, copiloto).
2. **Dashboard** (`02-inicio-dashboard.png`): tres tarjetas compiten por protagonismo
   (Patrimonio en oscuro, Deuda total en verde grande, Flujo en verde) + el bloque de
   gamificación arriba. No hay UN dato protagonista.
3. Las cifras no responden "¿y esto qué significa para mí?": `$ 6.240.000` de flujo no
   dice si "vas bien"; `9.9%` de endeudamiento no dice que es sano.
4. Términos técnicos visibles: "Patrimonio", "Flujo estimado", "fijo · variable",
   "comprometido".

## 3. Alcance

**Incluye:** exactamente las 4 prioridades, SOLO en `LoginScreen` y `DashboardScreen`
(+ el campo de interpretación en el endpoint del home si el DEC elige la variante
server-side de la prioridad 3).
**Excluye (para una FIN-018 futura, no se cuela aquí):** cambios en otras pantallas,
onboarding multi-paso, temas/branding, nuevos indicadores o métricas, cambios al Motor.

## 4. Diseño — alternativas por prioridad (requisito del CPSAO: ≥2 por cambio)

### Prioridad 1 — Login: propósito claro en ≤5 segundos

| | **Alt A — Propuesta de valor compacta (recomendada)** | **Alt B — Mini-recorrido de 2 tarjetas** |
|---|---|---|
| Qué es | Bajo el logo: 1 línea de propuesta ("Tus deudas, tu plata y tu mes — claros en un solo lugar") + 3 micro-líneas con ícono: `💳 Sal de tus deudas con plan` · `🩺 Tu salud financiera en un número` · `🤖 Un copiloto que te explica` | Antes del formulario, 2 tarjetas deslizables con captura del producto y un beneficio cada una; botón "Empezar" |
| Ventajas | Cero pasos extra; comprensión inmediata sin interacción; cambio de texto+layout puro; medible con test de 5s sobre la captura | Muestra el producto real; más persuasivo para quien nunca lo vio |
| Desventajas | No "muestra" el producto, lo describe; exige redacción muy precisa | Añade fricción (interacción previa al login); más código y assets; contradice "iteración pequeña"; riesgo de skip inmediato |

### Prioridad 2 — Dashboard: un dato protagonista

| | **Alt A — Hero "Te queda este ciclo" (recomendada)** | **Alt B — Hero Score Millo** | **Alt C — Solo jerarquía visual** |
|---|---|---|---|
| Qué es | UNA tarjeta hero arriba: "Te queda este ciclo · jul" con el flujo estimado + línea interpretativa. Deuda total y Patrimonio pasan a tarjetas normales del mismo peso; gamificación se compacta a una línea sin barra | El Score (715 · Estable) como hero del Inicio; el resto igual | Sin reordenar: se deja UNA sola tarjeta oscura (Deuda total) y las demás pasan a fondo claro |
| Ventajas | Es el dato accionable del día a día (¿puedo gastar?); ya existe en el endpoint (cero backend); coherente con Presupuesto ("Te queda este ciclo") | Un solo número-síntesis; refuerza la identidad DSS | Cambio mínimo absoluto (solo estilos) |
| Desventajas | Usuarios enfocados en deuda pierden el "golpe" del total arriba | Duplica la pestaña Salud; es mensual (poco dinámico); en cold-start muestra "—" a usuarios nuevos — mala primera impresión | No resuelve la competencia de jerarquía, solo la atenúa; el protagonista sigue ambiguo |

### Prioridad 3 — Interpretación antes que datos

| | **Alt A — Línea interpretativa server-side (recomendada)** | **Alt B — Semáforo + detalle al tocar** |
|---|---|---|
| Qué es | El endpoint `GET /dashboard/home` agrega `interpretation {text, level}` por sección clave (flujo, deuda, ahorro), calculada con los MISMOS umbrales ya auditados del Motor/indicadores de FIN-004 (verde/amarillo/rojo). La UI la pinta bajo la cifra: "Vas bien: puedes apartar hasta $X sin apretarte" / "Tus cuotas pesan 9,9% de tu ingreso — nivel sano" | Chip de color (🟢🟡🔴) junto a cada cifra; el significado aparece al tocar |
| Ventajas | La interpretación es visible SIN interacción (que es la prioridad); una sola fuente de verdad (umbrales en backend, como manda el precedente del Motor); testeable unitariamente | Compacto; casi sin texto nuevo |
| Desventajas | Cambio de backend (pequeño: composición sobre números ya calculados); textos requieren calibración de tono | El significado queda ESCONDIDO tras un tap — contradice "interpretación antes que datos"; el color sin texto es ambiguo |

### Prioridad 4 — Lenguaje cotidiano

| | **Alt A — Reemplazo directo** | **Alt B — Término + traducción (recomendada)** |
|---|---|---|
| Qué es | Sustituir el término técnico: "Patrimonio"→"Tu balance real", "Flujo estimado"→"Te queda", "fijo · variable"→"cuentas de siempre · gastos del día a día" | Mantener el término con coletilla cotidiana: "Patrimonio — lo tuyo, menos deudas"; "Te queda este ciclo" como etiqueta de acción (reemplazo directo SOLO donde el término no educa, como "Flujo estimado") |
| Ventajas | Máxima llaneza; menos texto | Educa sin perder precisión (el usuario aprenderá "patrimonio" en el resto de la app y en su banco); consistencia con las demás pantallas que siguen usando el término |
| Desventajas | Rompe consistencia con Salud/Cuentas/Copiloto que dicen "patrimonio"; pierde valor educativo | Tarjetas un poco más densas |

Glosario propuesto (aplica según la alternativa que apruebe el DEC): `Flujo estimado
→ Te queda este ciclo` · `Patrimonio → Patrimonio — lo tuyo, menos deudas` · `fijo ·
variable → fijos del mes · del día a día` · `% comprometido → de tu ingreso ya está
apartado`.

### 4.5 — Decisión implícita explicitada: el bloque de gamificación

Compite por la atención en la parte más valiosa de la pantalla (arriba, junto al
saludo) sin ser un dato financiero. Cualquier jerarquía nueva debe decidir qué hacer
con él:

| | **Alt A — Compactar a una línea (recomendada)** | **Alt B — Sacarlo del Inicio (vive solo en Logros)** |
|---|---|---|
| Qué es | `🔥 1 sem · Nivel 2 · 60 XP →` en una sola línea tocable, sin barra de progreso, debajo del hero | El bloque desaparece del Inicio; racha/nivel/reto solo en la pantalla Logros |
| Ventajas | La racha vive de VERSE a diario (FIN-008 la diseñó como hábito); pierde peso visual sin perder presencia | Máxima limpieza; el Inicio queda 100% financiero |
| Desventajas | Sigue ocupando una línea arriba | Mata el mecanismo de hábito de FIN-008 (una racha que no se ve no sostiene constancia); contradice la celebración diseñada para el Inicio |

### 4.6 — Composición integrada propuesta (la evolución completa, no 4 parches)

Cómo quedan las DOS pantallas si el DEC aprueba las recomendadas (1-A · 2-A · 3-A ·
4-B · 4.5-A). Este es el diseño objetivo contra el que se tomarán las capturas de
cierre:

**Login (evolución):**
```
                 🪈  Millo
   Tus deudas, tu plata y tu mes — claros
            en un solo lugar.

   💳  Sal de tus deudas con un plan
   🩺  Tu salud financiera en un número
   🤖  Un copiloto que te explica

   Correo    [____________________]
   Contraseña[____________________]
   [           Ingresar           ]
   [         Crear cuenta         ]

     "Cuida tus millos, sal de deudas
      con calma."   ← el tagline actual
      baja a firma emocional, no intenta
      explicar el producto
```

**Dashboard (evolución):**
```
   Hola, Laura 👋
   ┌──────────── HERO (único) ────────────┐
   │ Te queda este ciclo · jul            │
   │ $ 6.240.000                          │
   │ 🟢 Vas bien: puedes apartar hasta    │
   │    $X sin apretarte                  │
   └──────────────────────────────────────┘
   🔥 1 sem · Nivel 2 · 60 XP →            ← una línea, tocable
   [ Deuda total  $11.207.000 ]            ← tarjeta normal +
     "Tus cuotas pesan 9,9% de tu            interpretación
      ingreso — nivel sano"
   [ Patrimonio ][ Ahorro ]                ← par del mismo peso,
     con coletillas del glosario              sin tarjeta oscura
   [ Ingresos ][ Gastos ]                  ← "fijos del mes ·
                                              del día a día"
   Próximos pagos / categorías /
   movimientos                             ← sin cambios
```

Principios que amarran la composición (alineados con el Principio de Claridad
Radical): un solo elemento dominante por pantalla; toda cifra clave lleva su "qué
significa para mí" visible; ningún término técnico sin traducción; nada nuevo — solo
reordenar, compactar y traducir lo que ya existe.

### 4.7 — Correcciones de DEC-0017 (§5 y §6.1) — v1.2

#### 4.7.1 Prioridad 1 · Login a 4 micro-líneas (Hallazgo 4)

Se amplía a los 4 pilares del diagnóstico (§2.1) — la omisión de Presupuesto no tenía
justificación y no se defiende. Textos definitivos, cada uno pasado por la prueba
§29.2 ("¿una persona sin conocimientos financieros lo entiende a la primera?"):

```
   💳  Sal de tus deudas con un plan
   💰  Cuánto puedes gastar, siempre claro
   🩺  Tu salud financiera en un número
   🤖  Un copiloto que te explica
```

Cuatro líneas siguen siendo escaneables en ≤5 segundos (una por pilar, ≤6 palabras
cada una). El wireframe del Login de §4.6 queda actualizado con esta lista.

#### 4.7.2 Prioridad 3 · Interpretación de "Deuda total" — ruta (a) (Hallazgo 1+2)

**Se adopta la ruta (a) de DEC-0017 §5.1**: la interpretación se calcula con las
MISMAS cifras que el Dashboard ya muestra — cuotas de deuda **pagadas en el ciclo**
(`debtPayments`, ya en la respuesta del home) sobre el ingreso **del ciclo**
(`income.total`, también ya en la respuesta). Cero reutilización del DTI del Score:
no hay mezcla de cadencias que explicar, y por tanto la interpretación **no
introduce ninguna pregunta nueva** (criterio §29.1 — la ruta (b) queda descartada:
no encontré redacción que evite exigir la comprensión mes calendario vs ciclo).

Los cortes de nivel (**0,20 / 0,35 — los valores REALES del indicador de FIN-004**, corregido en v1.3) se toman de los mismos rangos ya ratificados, aplicados a la razón propia del Dashboard —
constantes compartidas en tiempo de compilación, no una llamada al Score.

#### 4.7.3 Textos definitivos de las 3 interpretaciones (criterio §29.2 aplicado)

| Sección | Fórmula (cifras propias del home) | Texto (nivel verde / amarillo / rojo) |
|---|---|---|
| Hero (flujo) | `estimatedCashflow` vs 0 y vs `income.total` | 🟢 "Te alcanza: puedes guardar hasta $X este ciclo" · 🟡 "Vas justa: te queda poco margen este ciclo" · 🔴 "Estás gastando más de lo que entra" |
| Deuda total | `debtPayments / income.total` del ciclo | 🟢 "De cada $100 que te entraron, $N se fueron en cuotas — vas bien" · 🟡 "…$N se fueron en cuotas — ya pesan bastante" · 🔴 "…$N se fueron en cuotas — se están comiendo tu ingreso" |
| Ahorro total | `savings.total / expense.fixed` (meses de gastos fijos cubiertos) | 🟢 (≥3) "Con esto cubres ~N meses de tus gastos fijos" · 🟡 (1–3) "Cubres ~N mes(es) de tus fijos — vas construyendo" · 🔴 (<1) "Aún no cubre un mes de tus fijos — cada aporte cuenta" |

Reglas transversales: montos en pesos redondeados (nunca porcentajes con decimales
en el texto); sin términos financieros sin traducir; ninguna referencia a
"calendario", "ciclo financiero" ni "DTI" en el texto visible; si falta el dato
(p. ej. ingreso 0), la línea interpretativa se omite — nunca se muestra un texto
que obligue a preguntar.

#### 4.7.5 Una sola cifra de cuota en la tarjeta de Deuda total (hallazgo del CTO, v1.3)

La tarjeta mostraba 'cuotas del mes' con la suma de cuotas PROGRAMADAS
( del resumen de deudas) — al activar la interpretación basada
en cuotas PAGADAS del ciclo, convivirían dos cifras de 'cuota' de naturaleza distinta
sin explicación (la misma mezcla del Hallazgo 1+2, reaparecida). Se adopta la ruta
preferida del CTO: la tarjeta muestra UNA sola cifra — ' pagado este ciclo'
(, el MISMO dato de la interpretación). La cuota programada de cada
deuda sigue visible donde corresponde: en Mis deudas y en el detalle.

#### 4.7.4 Efecto en §11 (Hallazgo 3)

Con la ruta (a): **la Prioridad 3 no introduce ninguna dependencia nueva en tiempo
de ejecución** — `dashboard.service.ts` compone las interpretaciones desde sus
propios agregados; lo único compartido con FIN-004 son las constantes de corte
(30/45), importadas en tiempo de compilación. §11 queda corregido en ese sentido.

## 5. Componentes
Solo `LoginScreen.tsx` y `DashboardScreen.tsx` (+ `dashboard.service.ts` si el DEC
aprueba 3-A). Cero componentes nuevos.

## 6. Base de datos
Ninguna.

## 7. Backend
Solo si el DEC aprueba 3-A: campo `interpretation` en la respuesta del home,
compuesto desde números ya calculados (sin métricas nuevas, sin tocar el Motor).

## 8. Frontend
Textos y jerarquía visual de las 2 pantallas según alternativas aprobadas.

## 9. Uso de IA
Ninguno.

## 10. Riesgos
- Textos interpretativos mal calibrados pueden sonar condescendientes → revisión de
  tono por el CPSAO sobre capturas reales ANTES del cierre (mismo estándar FIN-012).
- Cambio de jerarquía puede desorientar a usuarios ya habituados → mitigado por ser
  reordenamiento de tarjetas existentes, no eliminación de información.

## 11. Dependencias (corregido en v1.2 — DEC-0017 §5.2)
Prioridades 1, 2, 4 y §4.5: datos ya expuestos por `GET /dashboard/home` (FIN-014);
ninguna dependencia nueva. Prioridad 3 **por la ruta (a) adoptada en §4.7.2**:
ninguna dependencia nueva en tiempo de ejecución — las interpretaciones se componen
dentro de `dashboard.service.ts` desde sus propios agregados; solo se comparten las
constante exportada `DEBT_RATIO_CUTS` (0,20/0,35) del indicador de endeudamiento de FIN-004 (import en tiempo de compilación, sin llamadas a `HealthService`/`EngineService`).

## 12. Impacto
2 pantallas; el resto de la app intacta. Sin migraciones, sin contratos rotos
(`interpretation` sería aditivo).

## 13. Criterios de aceptación (fricción medible, no cantidad de cambios)
1. **Test de 5 segundos** sobre la captura real del Login: el CPSAO puede responder
   "¿qué hace esta app?" solo con lo visible.
2. **Un único hero** en el Dashboard, verificable en la captura (una sola tarjeta
   dominante; ninguna otra del mismo peso visual).
3. **Interpretación visible sin interacción** en flujo, deuda y ahorro (presente en la
   captura, no tras un tap).
4. **Glosario aplicado**, verificable por grep de los strings en las 2 pantallas.
5. Capturas reales antes/después en `docs/producto/capturas/` como evidencia de
   cierre (estándar FIN-012); suite completa en verde; typecheck + bundle.

## 14. Plan
1. DEC-017 elige alternativa por prioridad → 2. (si 3-A) backend `interpretation` +
tests de umbrales → 3. frontend de las 2 pantallas → 4. capturas reales antes/después
→ 5. IMP-0017 con SHA → 6. validación (Auditor + CTO) → cierre.
