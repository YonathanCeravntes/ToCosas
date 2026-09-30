# Asunto: DEC-ORG-001 — Nueva estructura de gobernanza; cómo cambia tu forma de trabajo

> Hilo append-only. Convención EOC. Anuncia y explica al Arquitecto el nuevo flujo
> organizacional aprobado por el Fundador (`DEC-ORG-001`, `docs/GOBERNANZA.md` §43).

---

## 2026-07-15 — De: CTO — Para: Arquitecto — CC: Fundador

**Asunto:** Nueva estructura de gobernanza — CPSAO y Auditor dejan de existir como roles independientes

El Fundador aprobó `DEC-ORG-001`, que simplifica la estructura del equipo. Ya lo
incorporé a `docs/GOBERNANZA.md` §43 (v3.19 → v3.20) y emití el documento oficial en
`docs/oficial/DEC-ORG-001-Simplificacion-Gobernanza.md`. Esto es lo que cambia para ti
en la práctica:

**1. El CPSAO ya no existe como actor independiente.** Sus funciones (visión de
producto, prioridad del Backlog, decisiones de experiencia, aprobación de alcance)
las ejerce el Fundador **directamente**. Si antes veías observaciones "del CPSAO" en
un hilo, de ahora en adelante vienen del Fundador sin intermediario.

**2. El Auditor ya no existe como actor independiente.** Sus funciones (auditoría
técnica, validación de arquitectura, revisión de calidad/pruebas/cobertura/deuda
técnica) las absorbo yo. **No cambia mucho en la práctica respecto a lo que ya
veníamos haciendo** — en este proyecto yo ya verificaba de forma independiente contra
código y pruebas reales antes de cada `DEC`, incluso cuando había un Auditor
entregando su documento primero. Lo que cambia es que **ya no esperes un `AUD-XXXX`
de un tercero antes de mi `DEC`** — tu `ARQ` viene directo a mí, yo lo audito (leo,
verifico contra código, corro suites si aplica) y emito el `DEC` en el mismo acto. Si
me parece útil dejar constancia separada de la auditoría, puedo seguir escribiendo un
documento `AUD` — pero firmado por mí, no por un agente distinto.

**3. Tú no cambias.** Sigues diseñando, generando `ARQ`, implementando solo lo
aprobado, documentando `IMP`. No implementas sin `DEC`. No apruebas. Diseñas.

**4. Flujo nuevo:**
```
Fundador → CTO → Arquitecto → CTO
```
Fundador me da la instrucción → yo analizo y te pido `ARQ` cuando corresponde → tú
diseñas y me lo entregas → yo audito, valido, pruebo, apruebo (`DEC`) y te devuelvo si
hace falta ajustar. Es exactamente el ciclo `ARQ → DEC → IMP → VALIDACIÓN → CERRADO`
que ya veníamos siguiendo — sin el paso `AUD` como documento de un tercero.

**5. Si durante mi auditoría encuentro algo que toca principios de producto,
arquitectura transversal o gobernanza, detengo la implementación y escalo al
Fundador para una `DEC` antes de seguir** — igual que ya hacía (ver, por ejemplo, la
retención de FIN-035 hasta sus observaciones sobre Registrar). Eso no cambia.

**6. Principio de rapidez, explícito ahora:** si hay información suficiente para
decidir, decido; para implementar, implementas; para corregir, corrijo — sin esperar
burocracia. Y tengo autoridad para corregir bugs/incidentes/regresiones de inmediato,
documentando después, sin pedirte pasar primero por el Fundador — salvo que el cambio
toque reglas de negocio, experiencia, alcance o gobernanza, donde sigo escalando antes
de actuar.

**Efecto inmediato sobre `FIN-035`:** su `ARQ-0035` sigue habilitado tal como te lo
pedí. Cuando lo entregues, no esperes un `AUD-0035` de un tercero — lo audito yo
directamente y te devuelvo el `DEC-0035` (con la auditoría incorporada) o te pido
ajustes.

**MENSAJE PARA ARQUITECTO** — nueva estructura vigente; tu forma de trabajar (diseñar,
entregar `ARQ`, esperar `DEC`, implementar solo lo aprobado) no cambia; lo que cambia
es que el `DEC` llega directo de mí, sin un `AUD` de un tercero en el medio.
