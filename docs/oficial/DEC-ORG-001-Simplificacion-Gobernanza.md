# DEC-ORG-001 — Simplificación de la estructura de gobernanza de Millo

- **Versión:** 1.0
- **Fecha:** 2026-07-15
- **Autor:** Fundador (Yonathan Cervantes)
- **Estado:** Aprobado por el Fundador. Incorporado a `docs/GOBERNANZA.md` §43 por el
  CTO en el mismo acto (v3.19 → v3.20).

---

## Objetivo

Reducir los tiempos de decisión, eliminar capas administrativas innecesarias y
mantener los controles técnicos esenciales durante el desarrollo de Millo.

Después de la experiencia obtenida en la Beta Técnica, se concluye que la estructura
actual generó valor, pero presenta oportunidades para hacer el proceso más ágil sin
sacrificar calidad.

A partir de esta decisión se modifica oficialmente la estructura organizacional del
proyecto.

## 1. Eliminación del rol CPSAO

El rol CPSAO deja de existir como actor independiente.

Sus funciones pasan a ser asumidas directamente por el Fundador, quien ejercerá la
Dirección de Producto.

El Fundador será responsable de:
- Definir la visión del producto.
- Priorizar el backlog.
- Aprobar funcionalidades.
- Emitir decisiones de producto (DEC).
- Definir experiencia de usuario.
- Resolver conflictos funcionales.
- Aprobar cambios de alcance.
- Consolidar retroalimentación de clientes.
- Definir prioridades estratégicas.

Toda comunicación anteriormente dirigida al CPSAO pasará a dirigirse al Fundador.

## 2. Eliminación del rol Auditor

El rol independiente de Auditor deja de existir.

Sus responsabilidades técnicas serán asumidas por el CTO.

El CTO será responsable de:
- Desarrollo técnico.
- Auditoría técnica.
- Validación de arquitectura implementada.
- Revisión de calidad.
- Validación de pruebas.
- Revisión de cobertura.
- Revisión de deuda técnica.
- Aprobación técnica final.
- Devolución de implementaciones cuando sea necesario.

## 3. Arquitecto

El Arquitecto permanece sin modificaciones.

Continúa siendo responsable de:
- Diseñar la arquitectura.
- Definir contratos.
- Mantener coherencia técnica.
- Emitir documentos ARQ.
- Proponer soluciones de arquitectura.

No implementa. No aprueba. Diseña.

## 4. Nuevo flujo oficial

**Paso 1 — Fundador:** define necesidad, define prioridad, emite instrucciones.

**Paso 2 — CTO:** analiza, organiza, determina si requiere arquitectura, solicita ARQ
cuando corresponde.

**Paso 3 — Arquitecto:** diseña, genera ARQ, entrega al CTO.

**Paso 4 — CTO:** audita, valida, prueba, aprueba, devuelve. O solicita ajustes al
Arquitecto.

**Paso 5:** si durante la auditoría el CTO identifica una decisión que modifica
principios de producto, arquitectura transversal o gobernanza, debe detener la
implementación y elevar inmediatamente la situación al Fundador para la emisión de
una DEC. No continuará implementando hasta recibir dicha decisión.

## 5. Principio de rapidez

Las decisiones no deberán permanecer detenidas por burocracia.

Si existe información suficiente para decidir: se decide.
Si existe información suficiente para implementar: se implementa.
Si existe información suficiente para corregir: se corrige.

## 6. Conservación del control

La reducción de roles no elimina controles. Simplemente concentra
responsabilidades.

El CTO continúa siendo responsable de impedir:
- deuda técnica;
- pérdida de calidad;
- incumplimiento arquitectónico;
- regresiones;
- despliegues inseguros.

## 7. Filosofía

La organización debe ser lo suficientemente pequeña para decidir rápido y lo
suficientemente rigurosa para mantener calidad.

El objetivo no es tener más cargos. El objetivo es construir mejor producto.

## Organigrama oficial

```
                   FUNDADOR
        (Producto · Estrategia · DEC)

                     │

                     ▼

                    CTO
    (Tecnología · Auditoría · Calidad)

                     │

                     ▼

               ARQUITECTO
      (Arquitectura · Diseño técnico)
```

## Observación adicional — autoridad correctiva inmediata del CTO

El CTO no debería tener que pedir autorización al Fundador para corregir bugs,
incidentes de producción o regresiones. Debe tener autoridad para corregirlos
inmediatamente y documentarlos después.

En cambio, sí debe escalar al Fundador cualquier cambio que afecte reglas de negocio,
experiencia del usuario, alcance del producto o gobernanza.

## Incorporación a la gobernanza

Incorporado a `docs/GOBERNANZA.md` como sección 43 (v3.20) en el mismo acto de
recepción de esta decisión, con las secciones estructurales del documento (§1, §2,
§4, §5, §7, §8, §15, §17, §18, §33, §36.2, §41) actualizadas para reflejar la nueva
estructura. Las menciones a CPSAO/Auditor en secciones anteriores del documento
quedan como registro histórico de decisiones tomadas bajo la estructura previa —no se
reescribe la historia, solo se actualiza la estructura vigente.
