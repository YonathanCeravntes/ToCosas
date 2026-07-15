# VALIDACIÓN-0019 · Experiencia de Salud (Score Millo)

- **Documentos base:** `DEC-0019-Experiencia-Salud.md` (+ adendo §8) · `IMP-0019-Experiencia-Salud.md` v1.0 · `ARQ-0019-Experiencia-Salud.md` v1.1
- **Realiza:** Auditor de Milla
- **Fecha:** 2026-07-12
- **Referencia inmutable verificada:** commit `e865640a2275945c5b2bb02cfc085bdaac3dd691`

---

## 1. Método

Verificación independiente en cuatro capas — DEC→IMP→Código→Evidencia — sin confiar en ninguna de las
afirmaciones del IMP por sí sola:

- `git show --stat e865640...`: confirma que el commit toca exactamente 2 archivos —
  `docs/arquitectura/ARQ-0019-Experiencia-Salud.md` y `frontend/src/screens/HealthScreen.tsx`. **Cero backend
  confirmado a nivel de diff**, no solo declarado.
- Lectura completa de `frontend/src/screens/HealthScreen.tsx` (391 líneas) contra cada pieza P1-P7 de `DEC-0019`.
- `grep "kind:" backend/.../recommendations.service.ts`: confirma los 4 `kind` reales (`abono_extra`,
  `estrategia`, `fondo_emergencia`, `recorte_categoria`) contra el `SIM_BY_KIND` del código, que mapea 3 de 4.
- `grep "Insights|Copilot"` en navegación: confirma que la ruta `'Insights'` renderiza `CopilotScreen` con
  título "Copiloto" — el puente de P7 llega a donde dice que llega.
- `grep "v1"` y `grep "%"` en `HealthScreen.tsx`: sin ocurrencias de "v1" visible al usuario (solo en un
  comentario de código citando la versión del ARQ) y sin porcentajes crudos renderizados (el único uso de `%`
  es la expresión regular de conversión a "$N de cada $100" y el ancho CSS de la barra, no texto visible).
  **Confirma la afirmación del Arquitecto.**
- Inspección visual directa de `despues-salud-01-scroll-completo.png` y `despues-salud-02-coldstart.png`
  (`docs/producto/capturas/fin-019/`), comparadas con las capturas "antes" de `revision-salud/`.

## 2. Correspondencia DEC→IMP→Código→Evidencia, por pieza

| Pieza | DEC-019 exige | Código confirma | Captura confirma |
|---|---|---|---|
| P1 (ruta b) | Barras neutras 0-100 sin semáforo por pilar; semáforo solo en indicadores; "frena" derivado del peor indicador | `pillars.map` renderiza `backgroundColor: colors.textInverse` fijo para los 4, sin condicional por `value`; `worstIndicator()` opera sobre `indicators`, no sobre `pillars` | Los 4 pilares (62/90/63/70) se ven con la misma barra blanca sobre pista translúcida; "Lo que más te frena: fondo de emergencia" coincide con el indicador rojo real |
| P2 | Jugada top del motor con fallback al peor indicador | `top = recs.find(...) ?? recs[0] ?? null`, `SIM_BY_KIND` cubre 3/4 `kind` reales (verificado por grep) | "Aparta $1.066.500/mes para tu fondo de emergencia… 3 meses en 4 meses" — texto de recomendación real, no genérico |
| P3 | Interpretación siempre visible; "$N de cada $100"; acción+Simularlo solo amarillo/rojo; tap honesto | `humanValue()` solo transforma valores que terminan en `%` (deja "1.3 meses" intacto); `needsAction = level==='rojo'\|\|'amarillo'` | "Endeudamiento $10 de cada $100" (verde, sin acción); "Fondo de emergencia 1.3 meses" (rojo, con acción + Simularlo) |
| P4 | Tarjeta siempre verde institucional; semáforo solo en chip de banda | `backgroundColor: colors.primary` fijo en `ScoreCard`, banda renderizada como `Chip` separado | Tarjeta verde con "Estable" en chip naranja pequeño — ya no tiñe toda la tarjeta |
| P5 | Cold-start con `coldStart.remainingDays` + 2 acciones | Bloque condicional usa `data.coldStart.remainingDays` directamente, sin valores fabricados | "Te faltan ~60 días de historia" + 2 acciones ("Registrar movimientos", "Marcar fondo de emergencia"); indicadores colapsados sin juicio (sin color, sin valor) |
| P6 | Narrativa por casos (primera medición / delta) | `narrative()` distingue explícitamente el caso de una sola medición | "Tu primera medición: 715 — desde aquí construyes." |
| P7 | Puente al Copiloto antes del disclaimer | Navega a ruta `'Insights'` → confirmado que monta `CopilotScreen` (título "Copiloto") | "¿Preguntas sobre tu Score? El copiloto te lo explica →" presente antes del disclaimer, disclaimer íntegro |

**Las 7 piezas corresponden exactamente entre DEC-019, el código del commit `e865640`, y las capturas
entregadas. Ninguna divergencia encontrada.**

## 3. Reservas del IMP — evaluación

Las 3 reservas declaradas en IMP-0019 §4 se verifican honestas y no ocultan un defecto no declarado:

1. **Concentración en el tap "¿Cómo se calcula?"** — real, visible en la captura (verdes solo muestran el tap).
   Correctamente calificada como pendiente de confirmar con RC real, no como hallazgo cerrado.
2. **Curva binaria de `wealthPillar`** — confirmé en `score.util.ts` que sigue sin cambios; la barra neutra en
   efecto no juzga el valor, pero el riesgo de comparación (70 fijo) sigue latente tal como se declara. Coincide
   con el riesgo diferido de DEC-0004, correctamente citado.
3. **`SIM_BY_KIND` cubre 3/4 kinds** — verificado exacto por grep contra el motor real. `abono_extra` cae al
   simulador general, tal como se declara, sin ocultarlo.

Ninguna reserva es en realidad un hallazgo bloqueante disfrazado — las tres están descritas con precisión.

## 4. Observación menor de DEC-0019 §8 (frase de ARQ §10) — resuelta

**Corrección respecto a la versión anterior de este documento:** verifiqué directamente
`docs/arquitectura/ARQ-0019-Experiencia-Salud.md` (líneas 206-210) y la frase señalada por DEC-0019 §8 ya
está corregida: "el semáforo vive en los INDICADORES (única fuente con niveles auditados; los pilares son
barras neutras por la ruta (b) — frase corregida en v1.1 conforme al detalle señalado en la confirmación del
CTO)". No quedaba reflejada en `IMP-0019` (que no la menciona en su §2), pero sí está resuelta en el documento
de arquitectura vigente, que es la fuente correcta para esta corrección puntual. **Se retira la observación
menor abierta** — sin impacto en el veredicto, que ya era APROBADO.

## 5. Las 6 preguntas UX (Gobernanza §28) + criterio 6 (test emocional, §29)

1. **¿Interpretación incorrecta?** No se detecta ninguna lectura errónea inducida por el diseño: los 4 pilares
   se presentan sin juicio cromático, y el único elemento con semáforo (los indicadores) tiene fundamento
   auditado desde FIN-004. La ruta (b) elimina exactamente el riesgo que motivó el REQUIERE AJUSTES de AUD-019.

2. **¿Terminología confusa?** "Tu colchón", "Tus deudas", "Tu ahorro", "Lo que tienes" son términos llanos,
   consistentes con el lenguaje ya validado en Inicio (FIN-018). "$N de cada $100" reutiliza el patrón de
   RC-0001. Sin jerga nueva introducida.

3. **¿Carga cognitiva excesiva?** La pantalla mantiene una sola idea dominante por sección (score → jugada →
   indicadores → evolución → copiloto), en el mismo orden narrativo que IMP-019 describe. El tap de
   "¿Cómo se calcula?" saca la profundización de la vista principal en vez de sumarla — reduce carga, no la
   aumenta, aunque persiste la reserva legítima (1) sobre si alguien lo encuentra sin guía.

4. **¿Jerarquía visual correcta?** La jugada de mayor impacto usa un borde verde destacado; el indicador rojo
   usa borde rojo con acción visible sin tap; los verdes se repliegan a lo mínimo. Esto respeta "palanca donde
   duele" (P3, Alt A) verificado en la captura real.

5. **¿Coherencia con el resto del producto?** Mismo patrón de "$ de cada $100" que Inicio, mismo tratamiento de
   indicadores con `level` que Dashboard/Deudas, mismo puente al Copiloto ya auditado en FIN-005. No introduce
   un lenguaje o patrón visual aislado.

6. **Principio de Claridad Radical / test emocional — ¿calificado u orientado?** La lectura de arriba a abajo
   de la captura es, literalmente, cómo estoy (715 de 1.000, sin "v1", sin la tarjeta naranja gritando
   "Estable") → por qué (el freno nombrado es el indicador rojo real, no un pilar sin fundamento) → qué hacer
   (jugada real del motor + Simularlo). No hay un elemento que "califique" al usuario sin ofrecerle una
   siguiente acción — incluso el cold-start, que antes mostraba guiones mudos, ahora entrega expectativa
   ("~60 días") y dos acciones ejecutables hoy. **El test se sostiene: el usuario sale orientado, no
   calificado.**

Conclusión de las 6 preguntas: sin hallazgos nuevos. La corrección de P1 (ruta b) resolvió precisamente el
único punto que AUD-019 había señalado como riesgo real (pregunta 1); el resto de piezas ya habían sido
aprobadas sin condiciones y el código las implementa sin desviación.

## 6. Pruebas declaradas — evaluación de plausibilidad

Suite 299/299, typecheck limpio y bundle Android 200 son consistentes con la naturaleza del cambio: cero
backend, un único archivo de pantalla reescrito, sin nuevas dependencias — confirmado por el diff. No hay
motivo para dudar de la cifra dado que no se tocó ninguna lógica de negocio ni contrato de API.

## 7. Hallazgos

Ninguno. La observación menor heredada de DEC-0019 §8 (frase residual de ARQ-0019 §10) se verificó resuelta
en el documento de arquitectura vigente (§4 de este documento) — no queda ningún punto abierto.

## 8. Veredicto

**APROBADO.**

La implementación de FIN-019 corresponde exactamente con `DEC-0019` (+ adendo §8) en las 7 piezas, verificado
en cuatro capas (decisión, implementación, código real del commit `e865640`, y evidencia visual). La corrección
de P1 (ruta b) resuelve de forma genuina y verificable el único hallazgo crítico que había impedido la
autorización directa en AUD-019: ya no existe semáforo sin fundamento sobre los pilares, y la corrección
adicional de "Lo que más te frena" (derivada de indicador, no de pilar) cierra el mismo defecto de fondo por
adelantado. Las 3 reservas declaradas en IMP-0019 son honestas y no ocultan nada. Recomiendo al CTO proceder
con el cierre formal de FIN-019 — sin observaciones abiertas pendientes.
