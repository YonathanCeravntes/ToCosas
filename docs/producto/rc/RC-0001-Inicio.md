# RC-0001 · Revisión de Comprensión — Experiencia Inicio (Login + Dashboard)

- **Versión:** 1.3
- **Mecanismo:** Revisión de Comprensión (Gobernanza v3.8 §30)
- **Experiencia evaluada:** Inicio (Login + Dashboard)
- **FIN de referencia:** `FIN-018` (tercera entrega, commit `70625cb` / SHA de referencia `8c42edf5cc2118e3ca71a7f2614532a1be4df8d7`)
- **Documentos base:** `ARQ-0018` v1.3, `AUD-0018`, `DEC-0018` (+ adendos §6.1 y §9)
- **Fecha:** 2026-07-11
- **Ejecutor:** Auditor Oficial de Milla
- **Historial de cambios:**
  - v1.0 (2026-07-11) — emisión original con 3 hallazgos de comprensión.
  - v1.1 (2026-07-11) — el CTO verificó los 3 hallazgos contra el código
    (`DashboardScreen.tsx`) antes de aceptar el documento y encontró que el
    **Hallazgo 2 no se sostiene**: reporté que la línea "Próximo" usaba el ícono 🏦
    (banco), pero el código confirma que usa 📅 (calendario) — un ícono de *fecha*,
    no de *deuda* — y que 💳 sí se usa de forma consistente para el concepto de
    deuda tanto en el título "💳 Deuda total" como en las filas de `pago_deuda` de
    Movimientos recientes (`emoji: '💳'` en el mapa de tipos de transacción). Verifiqué
    la corrección de forma independiente contra `frontend/src/screens/DashboardScreen.tsx`
    (líneas 103-127) antes de aplicarla: el CTO tiene razón, no hay inconsistencia de
    ícono de deuda. Origen del error: a la resolución de la captura, confundí visualmente
    📅 con 🏦. Se retira el Hallazgo 2 en esta versión, dejando constancia de la
    corrección en vez de eliminar el rastro del error — Hallazgos 1 y 3 quedan
    confirmados sin cambios (verificados por el CTO contra el código y la captura).
  - v1.2 (2026-07-11) — se añade §7: guion de preguntas y formato de registro para la
    primera sesión real de RC-0001, por encargo del CTO con el protocolo detallado
    del CPSAO. **Precisión del Fundador:** este protocolo aplica únicamente a
    `RC-0001` por ahora — no queda codificado como método permanente de Gobernanza;
    se evaluará después, con la evidencia de esta primera ejecución, si se convierte
    en el estándar para las siguientes experiencias (Salud, Presupuesto, Deudas,
    Simulador, Copiloto). Diseño únicamente — sin ejecutar todavía con participantes
    reales; el Auditor avisa al CTO antes de ejecutar.
  - v1.3 (2026-07-11) — se añade al guion de §7.3 y al formato de registro de §7.4 la
    indagación obligatoria del **razonamiento** del participante ante cualquier duda,
    interpretación errónea o incomprensión, por precisión del CPSAO trasladada por el
    CTO: antes de anotar el hallazgo como un defecto de la pantalla, el moderador
    pregunta por qué el participante llegó a esa lectura (preguntas neutras, nunca
    correctivas) — el objetivo es entender el modelo mental del usuario, no solo
    catalogar errores de interfaz. Se suma a las instrucciones ya vigentes (recorrido
    mental, moderador que solo observa, proceso independiente de la Alpha); no
    reemplaza ninguna. No requiere adendo de `DEC-0018` (precisión de diseño de
    sesión, no decisión de gobernanza nueva).

---

## 0. Verificación previa de la tercera entrega (antes de la sesión)

Antes de diseñar la RC, verifiqué contra el código y la captura final que las dos piezas pendientes del adendo §9 de `DEC-0018` están genuinamente resueltas:

- **Pieza 8 (`nextDueDate`):** verifiqué en `transactions.service.ts` (líneas 66-85) que el `UPDATE` atómico de `pago_deuda` ahora avanza `next_due_date` a la próxima ocurrencia futura (`GREATEST(1, meses_transcurridos + 1)`, con `age(now(), next_due_date)` para calcular meses transcurridos), limpia la fecha a `NULL` cuando la deuda queda saldada, y usa `GREATEST(1, ...)` como piso para nunca retroceder ni quedarse en el mismo mes. Recalculé a mano el caso de la captura: fecha previa 28 de abril, hoy 11 de julio → ~2 meses transcurridos → salta 3 meses → 28 de julio. Coincide exactamente con `despues-scroll-02-dashboard.png` ("Próximo: Tarjeta de crédito · $97.199 · vence 28 de jul"). Correcto.
- **Análisis narrativo (§5.1):** confirmé que la propuesta mínima ("Tienes margen este ciclo — simula un abono a tu deuda →") está solo **documentada** en `ARQ-0018` v1.3 §5.1, no implementada — no aparece en la captura final. Consistente con lo declarado por Arquitectura ("no implementé ninguna").

Con esto, la base sobre la que se ejecuta la RC es la real: `despues-scroll-01-login.png` y `despues-scroll-02-dashboard.png`.

## 1. Nota metodológica obligatoria — limitación de esta primera ejecución

Gobernanza v3.8 §30 exige participantes reales que nunca han usado Milla, en sesiones de 10-15 minutos. **Mi entorno de ejecución no tiene acceso a personas reales** — no puedo reclutar, moderar ni observar a un participante humano. Ejecutar esta RC-0001 como si hubiera datos de participantes reales sería una violación directa de la regla permanente "el estado oficial se determina solo por artefactos verificables" (`GOBERNANZA.md`): fabricar transcripciones o reacciones de personas inexistentes no es un artefacto verificable, es una simulación presentada como evidencia real.

Por lo tanto, para esta primera ejecución aplico un **método sustituto explícito y declarado como tal**: una revisión cognitiva estructurada ("cognitive walkthrough"), en la que examino cada pantalla y cada bloque adoptando deliberadamente la perspectiva de alguien que nunca vio Milla, aplicando estrictamente el alcance de la RC (comprensión, dudas, interpretaciones erróneas, confusión — nunca funcionalidad, satisfacción o comportamiento financiero). No es equivalente a una sesión con una persona real y no debe registrarse como tal en ningún reporte futuro.

**Recomiendo formalmente** que el CTO/CPSAO programen la primera sesión de RC con participantes humanos reales (posiblemente aprovechando el reclutamiento ya en curso para la Alpha Cerrada, sin mezclar ambos programas) para validar o corregir los hallazgos de este documento antes de tratarlos como definitivos. Hasta entonces, esta RC-0001 debe leerse como una revisión de comprensión de **primer nivel** (defectos evidentes de lenguaje/interpretación detectables sin un humano), no como sustituto de la sesión real.

## 2. Protocolo aplicado (adaptado del diseño de sesión real de §30)

Preguntas guía que se le harían a un participante real, aplicadas aquí como lente de revisión:
1. Mirando esta pantalla por primera vez, ¿qué crees que hace esta app?
2. ¿Qué significa este número/esta frase para ti?
3. ¿Hay algo que no entiendes o que te genera una duda?
4. Si tuvieras que hacer algo ahora mismo en esta pantalla, ¿qué harías?
5. ¿Algo te sorprende o te preocupa sin que sepas si debería?

## 3. Hallazgos de comprensión — Login (`despues-scroll-01-login.png`)

Sin dudas de comprensión. El propósito ("Tus deudas, tu plata y tu mes — claros en un solo lugar") y los 4 pilares se leen y entienden sin ambigüedad; "Crear cuenta" como acción dominante es coherente con lo que alguien nuevo esperaría hacer primero.

## 4. Hallazgos de comprensión — Dashboard (`despues-scroll-02-dashboard.png`)

1. **El término "ciclo" no está explicado en ningún punto de la pantalla ni del Login.** El hero dice "Te queda este ciclo · jul 2026" y la tarjeta de Deuda dice "pagado este ciclo" — para alguien que nunca usó Milla, "ciclo" podría leerse como sinónimo de "mes" (correcto para la mayoría, con `cycleStartDay=1`) pero no hay ninguna pista visual de que sea un concepto configurable del producto. No es una interpretación *incorrecta* (la etiqueta "jul 2026" ancla razonablemente el periodo), pero es el tipo de palabra que puede generar una pausa de "¿esto es lo mismo que el mes del calendario?" — precisamente el riesgo que el criterio §29.1 busca prevenir, aunque aquí es leve porque no se le pide al usuario entender nada del modelo interno para seguir adelante.
2. ~~Inconsistencia de ícono para "deuda" dentro de la misma pantalla.~~ **Retirado en v1.1 — no se sostiene.** Verificado en `DashboardScreen.tsx`: el título de la tarjeta usa `💳 Deuda total` y las filas de `pago_deuda` en Movimientos recientes usan el mismo `💳` (mapa de emojis por tipo de transacción) — 💳 es consistente para "deuda" en toda la pantalla. La línea "Próximo" usa `📅`, que es un ícono de *fecha*, no un segundo ícono de deuda en competencia con 💳. El hallazgo original confundió 📅 con 🏦 por una lectura imprecisa de la captura a baja resolución. No hay inconsistencia real.
3. **"Abono a capital (reduce plazo)" no es evidente frente a "Cuota tarjeta" para alguien sin vocabulario financiero.** Ambas filas de Movimientos recientes restan dinero de una deuda, pero una persona nueva no tiene manera de saber, solo por el texto, por qué existen dos tipos de movimiento distintos para "pagarle a una deuda" ni qué diferencia práctica tiene uno del otro. El paréntesis "(reduce plazo)" ayuda pero asume que el lector ya sabe que un pago normal *no* reduce el plazo — una inferencia que no es obvia para un usuario nuevo. Esto no bloquea el uso de la pantalla (es informativa, no accionable ahí), pero sí es una duda de comprensión genuina si alguien se detiene a leerla.

No se detectaron interpretaciones incorrectas de las cifras principales (hero, Deuda total, Patrimonio, Ahorro, Ingresos, Gastos): todas responden con precisión razonable a "¿qué significa esto para mí?", consistente con lo que `AUD-017`/`AUD-018` ya verificaron en el código.

## 5. Resumen de hallazgos

| # | Hallazgo | Pantalla | Tipo (según alcance §30) | Estado |
|---|---|---|---|---|
| 1 | "Ciclo" sin explicación visible | Dashboard (hero + Deuda) | Duda de comprensión, leve | Confirmado |
| 2 | ~~Ícono de deuda inconsistente~~ | Dashboard | — | **Retirado en v1.1** — no se sostiene contra el código (💳 es consistente; 📅 es ícono de fecha, no de deuda) |
| 3 | "Abono a capital (reduce plazo)" vs "Cuota tarjeta" no autoexplicativo | Dashboard (Movimientos recientes) | Duda de comprensión, moderada | Confirmado |

Con la corrección, quedan **2 hallazgos válidos** (1 y 3). Ninguno impide que un usuario nuevo entienda su situación financiera general al recorrer Inicio — son matices, no bloqueos de comprensión. Ninguno estaba cubierto por las 6 preguntas de `AUD-017`/`AUD-018` (que se enfocaron en jerarquía, repetición y consistencia de datos, verificables por código), lo que confirma que la RC aporta una capa de revisión genuinamente distinta, no redundante.

## 6. Conclusión

Esta RC no decide si Inicio cierra — identifico los hallazgos anteriores para que el CTO y el CPSAO decidan, junto con la sesión real que recomiendo en la sección 1, si ameritan una cuarta iteración menor o si se registran como mejora futura de bajo costo. Ninguno de los 2 hallazgos válidos es, a mi juicio, motivo para bloquear el cierre de esta experiencia — son matices de pulido de lenguaje, no defectos estructurales. La corrección del Hallazgo 2 en esta v1.1 confirma, como señala el CTO, que la verificación independiente contra el repositorio es obligatoria incluso para los hallazgos que el propio Auditor produce — ningún hallazgo, propio o ajeno, se acepta sin contrastarlo contra el código real.

## 7. Protocolo detallado para la sesión real (diseño, sin ejecutar)

**Alcance de esta sección:** diseño del guion y del formato de registro para las sesiones reales de `RC-0001`, por encargo del CTO con el protocolo detallado que definió el CPSAO. Aplica **solo a esta ejecución** — no es una nueva sección de Gobernanza. Nada de esta sección se ejecuta hasta que el CTO lo autorice explícitamente; este documento se actualizará con los resultados una vez conducidas las sesiones.

### 7.1 Separación del canal de reclutamiento de la Alpha

`RC-0001` recluta y registra participantes de forma **independiente** del Programa Alpha (`ALPHA-002`), aunque ambos puedan compartir medios de contacto para encontrar candidatos. Desde el momento de la invitación, son procesos distintos: consentimiento propio de RC (sin datos financieros reales, sin creación de cuenta), registro propio (`docs/producto/rc/`, no `docs/producto/alpha/`), y evidencia propia. Ningún participante de RC se considera automáticamente parte de la Alpha, ni viceversa.

### 7.2 Preparación previa a cada sesión

- **Entorno:** versión actual de Inicio (Login + Dashboard, commit `70625cb` / SHA `8c42edf...`), corriendo en modo demo controlado (Expo Web o build de staging) con una cuenta demo **precreada por el equipo** y datos ficticios ya sembrados — el participante nunca crea una cuenta ni introduce datos propios.
- **Duración:** 10-15 minutos por participante (Gobernanza v3.8 §30).
- **Perfil:** persona que nunca ha visto ni usado Milla.
- **Rol del moderador (Auditor):** observa y formula únicamente las preguntas de §7.3, en el orden dado. **Nunca explica la pantalla, nunca confirma si una respuesta es correcta, nunca señala dónde mirar** mientras el participante intenta comprender por sí mismo. Si el participante pregunta directamente "¿esto qué es?", el moderador responde con una pregunta neutra ("¿tú qué crees que es?"), no con la explicación.
- **Ante cualquier duda, interpretación errónea o incomprensión (precisión del CPSAO, v1.3):** el moderador **no corrige de inmediato**. Primero indaga el razonamiento del participante con preguntas neutrales (§7.3-bis) antes de seguir el guion o de anotar el punto como un defecto de la pantalla. El objetivo no es que el participante llegue a la respuesta "correcta", sino entender cómo razonó — a menudo el hueco no está en la explicación de la pantalla sino en que el participante esperaba encontrar algo distinto de lo que el equipo imaginó.
- **Registro:** un cronómetro visible solo para el moderador (no para el participante) y una plantilla de registro (§7.4) completada durante la sesión, no reconstruida de memoria después.
- **Salvaguarda de datos personales:** si en cualquier momento el participante ofrece o la dinámica requiere datos financieros reales suyos, el moderador detiene la sesión de inmediato (regla de detención de Gobernanza §30) y lo remite al programa Alpha si desea participar en ese proceso separado.

### 7.3 Guion de la sesión

**Apertura (sin mencionar qué es Milla ni para qué sirve):**
> "Te voy a mostrar una pantalla de una aplicación. No hay respuestas correctas o incorrectas — quiero entender qué piensas mientras la miras. Puedes tocar donde quieras. Ve pensando en voz alta si te resulta natural."

**Bloque Login** (mostrar la pantalla, cronómetro en marcha):
1. "Cuéntame, ¿qué crees que hace esta aplicación?" *(pregunta abierta, sin pistas)*
2. *(silencio de observación — dejar que explore visualmente antes de repreguntar)*
3. Si no verbaliza nada en ~15 segundos: "¿Qué es lo primero que te llama la atención?"
4. "Si quisieras usarla, ¿qué tocarías primero?" *(registrar el primer intento de toque real, no solo lo que dice)*

**Transición:** el moderador avanza la demo a la pantalla de Inicio (Dashboard) con la cuenta demo ya con sesión iniciada — el participante no pasa por el formulario de login real.

**Bloque Dashboard** (cronómetro reiniciado):
5. "Cuéntame qué ves aquí." *(pregunta abierta)*
6. "¿Cuál dirías que es el dato más importante de esta pantalla?" *(registrar el tiempo transcurrido desde que se mostró la pantalla hasta esta respuesta — proxy del "tiempo hasta identificar el dato más importante")*
7. "¿Hay algo en lo que te detuviste a pensar más de la cuenta, o que no entendiste del todo?" *(sondear la primera duda; si menciona más de una, registrar el orden)*
8. "Si tuvieras que hacer algo ahora mismo en esta pantalla, ¿qué harías?" *(registrar si nombra una acción espontáneamente, sin ayuda, y cuál)*
9. Cierre: "Para terminar, con tus propias palabras, ¿cómo describirías la situación financiera de esta persona según lo que viste?" *(evalúa si puede sintetizar sin ayuda — el criterio central de la RC)*

**Sondas neutras permitidas en cualquier momento** (nunca explicativas): "cuéntame más", "¿qué quieres decir con eso?", "tómate tu tiempo", "¿qué más ves?".

**7.3-bis — Indagación obligatoria del razonamiento (v1.3, precisión del CPSAO).** En el instante en que el participante dude, diga algo que no corresponde a los datos reales de la demo, o exprese no entender una sección, el moderador **se detiene antes de seguir el guion o de corregir** y pregunta, con el mismo tono neutro que el resto de la sesión:
- "¿Qué te hizo pensar eso?"
- "¿Qué esperabas encontrar aquí?"
- "¿Qué palabra, dato o elemento te llevó a esa conclusión?"

El moderador nunca usa estas preguntas para señalar el error ni para guiar al participante hacia la respuesta esperada — son exclusivamente para registrar el modelo mental que produjo esa lectura. Solo después de recoger esa respuesta el moderador retoma el guion en el punto donde se había detenido. Esta indagación aplica tantas veces como aparezcan dudas o interpretaciones erróneas durante la sesión, en Login y en Dashboard por igual.

**Cierre de la sesión:** agradecer, sin revelar cuáles respuestas eran las "esperadas" ni explicar la pantalla — eso podría contaminar a un mismo participante si se le volviera a convocar, y no aporta nada a la RC.

### 7.4 Formato de registro (una ficha por participante)

```
Participante: RC-0001-P## (identificador anónimo, sin nombre real)
Fecha / duración total de la sesión:
Perfil declarado: (nunca usó apps financieras / usa alguna similar / ninguno relevante)

── LOGIN ──
Respuesta a "¿qué crees que hace esta app?" (verbatim o resumen fiel):
Primer elemento donde se detiene la mirada/atención:
Primer intento de toque (qué tocó primero, real):
¿Coincide el toque con lo que había dicho que haría? (sí/no)

── DASHBOARD ──
Tiempo hasta identificar el dato más importante: ___ segundos
Elemento identificado como "el más importante":
Primer elemento donde se detiene / primera duda expresada:
Cita textual de la primera duda (si la hubo):
¿Nombra espontáneamente una próxima acción? (sí/no) — ¿cuál?
Síntesis final en sus propias palabras (verbatim):
¿La síntesis es correcta respecto de los datos reales de la demo? (sí/no/parcial)

── RAZONAMIENTO DETRÁS DE CADA DUDA (v1.3 — una fila por cada duda/error detectado) ──
| # | Pantalla/elemento | Qué dijo o hizo el participante | "¿Qué te hizo pensar eso?" (verbatim) | "¿Qué esperabas encontrar?" (verbatim) | Elemento/palabra que lo originó | Lectura del moderador: ¿problema de la pantalla o expectativa distinta a la imaginada? |
|---|---|---|---|---|---|---|
| | | | | | | |

── OBSERVACIONES DEL MODERADOR ──
Momentos de titubeo no verbalizados (silencios largos, releer, volver a un bloque anterior):
Cualquier otro punto de comprensión (no de funcionalidad ni satisfacción) no cubierto arriba:
```

### 7.5 Análisis posterior

Tras completar las sesiones (número de participantes a definir por el CTO/CPSAO, sugerido 4-6 por ser una técnica cualitativa donde ese rango ya suele revelar los problemas de comprensión más recurrentes), el Auditor consolida las fichas en una actualización de este documento (§8, nueva al cerrar las sesiones): patrones repetidos entre participantes, contraste contra los 2 hallazgos ya identificados por el walkthrough cognitivo de §1-6 (¿los confirman, los matizan, o revelan hallazgos nuevos que el método sustituto no pudo detectar?), y una lista de hallazgos nuevos si los hay — sin decidir el cierre de FIN-018, igual que el resto de este documento.

**Tratamiento del razonamiento recogido en §7.3-bis (v1.3, precisión del CPSAO):** cada hallazgo de comprensión que surja de las sesiones se documenta junto con el "por qué" que dio el participante, no solo con la descripción del punto de confusión. El consolidado de §8 debe distinguir explícitamente, para cada hallazgo: (a) los que reflejan un problema real de la pantalla (texto ambiguo, jerarquía confusa, dato faltante — el tipo de hallazgo ya cubierto por `AUD-017`/`AUD-018`), de (b) los que reflejan que el participante esperaba encontrar algo distinto de lo que el equipo diseñó (una expectativa de producto, no un defecto de interfaz). Esta distinción es información de producto útil más allá de FIN-018 — se traslada también al CPSAO como insumo para experiencias futuras (Salud, Presupuesto, Deudas, Simulador, Copiloto), no solo como una lista de correcciones de UI para esta FIN.

---
*Esta Revisión de Comprensión no implementa ni decide. Queda a la espera de la evaluación del CTO y el CPSAO sobre estos hallazgos y sobre la recomendación de ejecutar una sesión real con participantes humanos. El diseño de §7 está listo para ejecutarse en cuanto el CTO lo autorice.*
