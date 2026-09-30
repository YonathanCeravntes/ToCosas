# COMUNICADO OFICIAL · Corrección del proceso de gobernanza de Milla

- **Emite:** Fundador/CPO
- **Destinatarios:** Milla CTO, Milla Arquitecto, Milla Auditor
- **Fecha:** 2026-07-06
- **Vigencia:** inmediata y obligatoria para todas las iniciativas futuras
- **Regla resumida en:** `docs/GOBERNANZA.md` §"Un FIN a la vez"

---

## Desviación identificada (ciclo FIN-011)

El objetivo del proceso ARQ → AUD → DEC → IMP no es generar documentación, sino
garantizar que cada funcionalidad sea analizada, auditada y aprobada **antes** de
consumir tiempo de diseño e implementación.

En la última ejecución: el CPO definió la iniciativa; el CTO la organizó en el
Backlog; el Arquitecto diseñó FIN-011; el Auditor lo auditó; el CTO emitió el DEC.
**Hasta ahí el proceso fue correcto.** Sin embargo, el Arquitecto continuó diseñando
FIN-012, FIN-013, FIN-014, FIN-015 y FIN-016 sin que existieran sus respectivas
auditorías ni decisiones oficiales individuales. Esa actuación rompe la gobernanza
definida para Milla.

## Regla obligatoria

**Cada funcionalidad (FIN) constituye una iniciativa independiente** y debe completar
su propio ciclo de gobernanza antes de iniciar el siguiente:

```
FIN-0XX:  ARQ-0XX → AUD-0XX → DEC-0XX → IMP-0XX → Validación final → Cerrado
                                                      ↓
                                          solo entonces inicia FIN-0XX+1
```

**No está permitido:**
- Diseñar varias funcionalidades por adelantado.
- Auditar varias funcionalidades en bloque.
- Emitir una única decisión para múltiples funcionalidades.
- Implementar funcionalidades cuya DEC no exista.

Cada funcionalidad avanza de manera independiente y queda completamente cerrada antes
de abrir la siguiente, salvo excepción **expresa** del CTO por razones estratégicas.

## Responsabilidades

- **CTO:** máximo responsable de hacer cumplir el proceso. No solo aprueba
  documentos: controla el avance y detiene inmediatamente cualquier fase iniciada sin
  cerrar la anterior, devolviendo la iniciativa al estado correspondiente.
- **Arquitecto:** solo diseña la funcionalidad ACTIVA. No anticipa diseños futuros
  sin autorización expresa del CTO.
- **Auditor:** solo audita la funcionalidad activa. No revisa funcionalidades que aún
  no hayan sido diseñadas oficialmente.

## Objetivo

No ralentizar el desarrollo, sino asegurar la máxima calidad técnica, trazabilidad
completa de las decisiones y evitar retrabajos.

---

## Reconocimiento del Arquitecto (registro de recepción)

Recibido y acatado. Reconozco la desviación: ARQ-0011 contenía el diseño técnico
detallado de 5 módulos (debió limitarse a alcance y relación entre iniciativas), y
FIN-013/014/015/016 se auditaron, decidieron e implementaron en bloque bajo un solo
AUD/DEC. Los ARQ/AUD individuales emitidos el 2026-07-05/06 restauraron la
trazabilidad documental de forma retroactiva, pero no sustituyen el cumplimiento del
flujo — que se aplica íntegro desde ahora.

**Disposición del estado actual** (conforme a "vigencia para iniciativas futuras"):
- FIN-013/014/015/016: entregados, con cadena documental individual completa; siguen
  su curso normal de validación final del CTO.
- FIN-012: es la **única funcionalidad activa**. Su ciclo continúa donde está
  (ARQ-0012 ✅ · AUD-0012 ✅ · esperando adenda del CTO a DEC-0011 → IMP-0012 →
  validación → cierre). Ningún otro FIN se diseña hasta cerrarlo.
