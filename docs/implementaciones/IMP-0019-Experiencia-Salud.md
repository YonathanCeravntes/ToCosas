# IMP-0019 · Experiencia de Salud (Score Millo)

- **Versión:** 1.0
- **Fecha:** 2026-07-11
- **Autor:** Agente Arquitecto/Desarrollador
- **Estado:** Entregado — para VALIDACIÓN del Auditor y posterior cierre del CTO
- **Historial de cambios:**
  - v1.0 (2026-07-11) — emisión tras la autorización completa de las 7 piezas
    (DEC-0019 + adendo §8).
- **Módulo/Feature:** FIN-019 · **Origen (v3.5 §27):** Mejora de revisión de producto
- **Documentos base:** `ARQ-0019-Experiencia-Salud.md` v1.1 · `AUD-019` · `DEC-0019` (+ adendo §8) · intención aprobada (§0)
- **Referencia inmutable (regla GOBERNANZA):** commit **`e865640a2275945c5b2bb02cfc085bdaac3dd691`**

## 1. Resumen
Las 7 piezas de DEC-019 implementadas en **una sola pantalla y con cero backend** —
todo el ciclo fue coreografía de lo ya construido y auditado (pilares FIN-004,
recomendaciones FIN-007, simulador FIN-007/012, Copiloto FIN-005): destapar y
conectar, no inventar. El detalle residual de §10 del ARQ quedó corregido en v1.1.

## 2. Archivos modificados
Solo `frontend/src/screens/HealthScreen.tsx` (reescritura completa) y
`docs/arquitectura/ARQ-0019` (frase §10). **Cero backend, cero BD, cero
dependencias nuevas** — verificable en el diff del commit.

## 3. Cumplimiento por pieza (DEC-019)

| Pieza | Implementación | Verificación |
|---|---|---|
| P1 (ruta b) | "715 **de 1.000**" + banda como chip + 4 pilares con nombres llanos y **barras neutras 0–100 idénticas** (relleno blanco sobre pista translúcida — adaptación de presentación al fondo verde de P4, mismo tratamiento los 4, cero semáforo) + "Lo que más te frena" derivado del **peor indicador** (omitido si todo verde) + "v1" retirado | Captura: barras 62/90/63/70 sin color de juicio; freno = "fondo de emergencia" (el indicador rojo real) |
| P2 | "⭐ Tu jugada de mayor impacto" = recomendación top del motor FIN-007 (lista ya ordenada por `priorityScore` desc) con CTA al simulador mapeado por `kind`; **fallback** al peor indicador con su primera acción si el motor viene vacío | Captura: jugada REAL del motor ("Aparta $1.066.500/mes para tu fondo… llegarías a 3 meses en 4 meses") + 🧪 Simularlo |
| P3 | Interpretación siempre visible; **"$N de cada $100"** en valores porcentuales (consistencia con Inicio); acción + Simularlo visibles SOLO en amarillo/rojo; tap honesto "¿Cómo se calcula? →" con fórmula/rangos/acciones restantes | Captura: "$10 de cada $100" / "$75 de cada $100"; el rojo muestra su acción sin tap; los verdes no cargan palanca |
| P4 | Tarjeta del Score SIEMPRE verde Millo; el color semáforo vive solo en chip de banda e indicadores | Captura: "Estable" ya no tiñe la tarjeta (antes: naranja completo) |
| P5 | Cold-start como estado de construcción: "🌱 Tu Score se está construyendo · te faltan ~N días" + 2 acciones disponibles hoy (usa `coldStart.remainingDays`) | Captura con usuario RECIÉN registrado: "~60 días", indicadores en "—" sin juicio fabricado |
| P6 | Evolución con lectura narrativa (1 punto / sube / baja / se mantiene) y la lista como detalle | Captura: "Tu primera medición: 715 — desde aquí construyes." |
| P7 | Cierre "🤖 ¿Preguntas sobre tu Score? El copiloto te lo explica →" (pestaña Copiloto) | Presente antes del disclaimer (que se conserva íntegro) |

## 4. Juicio razonado contra la intención (§0)

**¿El usuario sale sintiendo que su situación tiene explicación y palanca — nunca
calificado, siempre orientado? Sí — el recorrido completo ahora ES la respuesta a
las 3 preguntas, en orden.**

La captura final se lee de arriba a abajo como una sola frase: "estás en 715 de
1.000 (cómo estoy), sostenido por estos cuatro pilares y frenado por tu fondo de
emergencia (por qué), y tu mejor jugada es apartar $1.066.500/mes — simúlala (qué
hacer)". El juicio cromático desapareció del elemento dominante (la tarjeta ya no
grita naranja por ser "Estable"); el semáforo quedó donde tiene fundamento
auditado; el lenguaje es el mismo de Inicio ("$ de cada $100"); y el usuario nuevo
recibe expectativa y tareas en vez de un "—" mudo. La decisión concreta al salir
existe y está nombrada: **ejecutar o simular la jugada**.

**Reservas honestas:** (1) el tap "¿Cómo se calcula?" concentra la profundización —
correcto por jerarquía, pero la RC real debe confirmar que nadie lo busca como
acción; (2) la curva cuasi-binaria de `wealthPillar` sigue diferida (DEC-0004/
DEC-019) — la barra neutra la muestra sin juzgar, pero un 70 fijo para casi
cualquier patrimonio positivo será visible para quien compare; mejora futura ya
registrada; (3) el mapeo `kind`→escenario del simulador cubre 3 de 4 kinds
(abono_extra navega al simulador general) — si el motor prioriza un abono, el
usuario elige el escenario manualmente.

## 5. Pruebas realizadas
- Suite completa **299/299** (sin cambios de backend, regresión íntegra); typecheck
  frontend limpio; bundle Android 200.
- Verificación EN VIVO (datos reales): pilares 62/90/63/70, jugada del motor real,
  "$N de cada $100", freno correcto, navegaciones del simulador y del puente.
- Cold-start verificado con usuario recién registrado real (no simulado).

## 6. Incidencias
Ninguna durante la implementación. Adaptación de presentación declarada: las barras
neutras usan relleno blanco sobre pista translúcida (el "verde sobre gris" del ARQ
asumía tarjeta clara; P4 la hizo verde) — el criterio de la ruta (b) se mantiene
intacto: tratamiento idéntico para los 4 pilares, cero semáforo.

## 7. Limitaciones
Las 3 reservas de §4. El gate Millo+ del historial y el disclaimer legal se
conservan sin cambios.

## 8. Resultado
FIN-019 completo conforme a DEC-019: 7/7 piezas, cero backend, capturas de scroll
completo (caso normal y cold-start) y juicio razonado contra la intención. Listo
para la VALIDACIÓN del Auditor y el cierre del CTO.
