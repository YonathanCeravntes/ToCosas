# MEMORANDO OFICIAL — Sincronización del contexto operativo del proyecto

- **De:** CTO (Claude)
- **Para:** CPSAO, Arquitecto, Auditor
- **CC:** Fundador (Yonathan Cervantes)
- **Fecha:** 2026-07-13
- **Asunto:** Nuevo estado operativo del proyecto tras la Fase 0 — línea base única para todo el equipo
- **Naturaleza:** memorando de oficialización (no resumen de conversaciones). Todo lo aquí afirmado es rastreable a un artefacto oficial citado. A partir de su emisión, ningún rol debe operar sobre un contexto anterior.

---

## 0. Propósito

Durante las últimas sesiones se institucionalizaron decisiones que modifican de forma
significativa el estado operativo del proyecto. No todos los roles participaron en esas
conversaciones. Este memorando fija una **línea base documental única** para que
propuestas, arquitecturas y auditorías futuras partan de la misma realidad. Instruido
por el Fundador (memo del 2026-07-13, "Oficialización del cambio de estado del proyecto
ante todo el equipo").

---

## 1. Estado actual del proyecto (una frase)

La **Fase 0 de infraestructura está oficialmente finalizada**: el backend está en
producción, conectado a una base de datos gestionada y con la app móvil apuntando a la
API real. El desarrollo funcional (FIN) se reanuda desde donde quedó, ahora sobre
infraestructura viva.

Fuente: `docs/ESTADO_PROYECTO.md` · `docs/INFRAESTRUCTURA.md` · `docs/correspondencia/Infraestructura-Fase-0.md`.

---

## 2. Cambios institucionalizados durante la Fase 0

1. **Backend en producción.** NestJS desplegado en Render (runtime Node), disponible
   públicamente en `https://milla-backend.onrender.com`. `/v1/health` y `/v1/ready`
   verificados 200 OK desde afuera por el CTO. Fuente: `INFRAESTRUCTURA.md` §2, §6.
2. **Base de datos en producción.** Neon PostgreSQL conectada vía `DATABASE_URL`
   (connection string directo, sin `-pooler`); 17 migraciones Prisma aplicadas. Fuente:
   `INFRAESTRUCTURA.md` §2, §6.
3. **Infraestructura como código real.** `render.yaml` corregido para reflejar la
   configuración que efectivamente funcionó (runtime Node, `rootDir: backend`,
   build/start propios) — ya no describe un despliegue Docker que no se usó. Fuente:
   `render.yaml` · `INFRAESTRUCTURA.md` Historial.
4. **App móvil conectada.** `eas.json` (perfil `preview`) apunta a la API de producción;
   el cliente HTTP ya resolvía la URL desde entorno, sin cambio de código. APK Android en
   compilación para validación del Fundador. Fuente: `frontend/eas.json`.
5. **Componentes oficialmente incorporados:** GitHub, Render, Neon PostgreSQL, Cloudflare
   (preparado), Prisma, despliegue automático, infraestructura documentada. Fuente: memo
   del Fundador, punto 7 (`correspondencia/Infraestructura-Fase-0.md`).

---

## 3. Decisiones de gobernanza ya vigentes

**Gobernanza vigente: `docs/GOBERNANZA.md` v3.14.** Las secciones que todo rol debe
conocer antes de emitir cualquier artefacto:

- **§34 — Commit obligatorio en el mismo acto.** Toda documentación oficial se commitea
  en el mismo acto en que se crea o modifica. Nada de documentación viviendo solo en el
  working tree.
- **§35 — Sincronización Git.** El repositorio local y GitHub constituyen
  *conjuntamente* el repositorio oficial; ninguno reemplaza al otro. Nunca se elimina
  historial sin respaldo previo publicado. Estado actual: rama de trabajo sincronizada
  1:1 local↔`origin`; historial divergente del día 1 preservado en
  `origin/legacy/origin-2026-07-13`.
- **§36 — Marco de gobernanza post-Fase 0** (nuevo). Seis reglas permanentes:
  1. **Documentación en GitHub — modelo híbrido.** Permanece todo lo reconstruible
     (código, infraestructura, arquitectura, gobernanza, roadmap, decisiones, auditorías,
     documentación técnica, manuales); **no** permanece lo sensible (credenciales,
     secretos, claves, tokens, variables privadas, documentación legal/comercial
     confidencial).
  2. **Flujo oficial de integración** (ver §4).
  3. **Testing obligatorio** antes de integrar (ver §5).
  4. **No escalar infraestructura por anticipación** (ver §6).
  5. **GitHub = registro histórico oficial** (documentado, versionado, trazable, recuperable).
  6. **El CTO es custodio de la calidad técnica.**

---

## 4. Flujo oficial de integración y control de cambios (§36.2)

```
Fundador → CPSAO → CTO → Arquitecto → Auditor → CTO → GitHub
```

- **El CTO es el único responsable de integrar cambios oficiales.** No existen commits
  oficiales directos del Arquitecto (ni de ningún otro rol) hacia la rama oficial.
- Pueden existir ramas de trabajo, pero **ninguna modificación llega a la rama oficial
  sin validación del CTO**.
- La estabilidad del producto tiene prioridad sobre la velocidad.

**Implicación para cada rol:**
- **CPSAO:** las decisiones estratégicas siguen entrando por la cabecera del flujo; sin cambios en su rol.
- **Arquitecto:** entrega `ARQ`/`IMP` como siempre, sobre ramas de trabajo; el CTO es quien integra a la rama oficial tras validar.
- **Auditor:** sin cambios en su función; su `AUD`/`VALIDACIÓN` sigue siendo requisito previo a la decisión e integración del CTO.

---

## 5. Testing obligatorio antes de integrar (§36.3)

Ningún cambio se integra a la rama oficial sin ejecutar, de forma verificable por el CTO:

- pruebas **unitarias**;
- pruebas **end-to-end**;
- **validación de TypeScript** (`tsc --noEmit`);
- **compilación** (`build`);
- **verificación de migraciones** cuando aplique.

Objetivo declarado: **que el proyecto nunca retroceda funcionalmente** (cero regresiones).
Formaliza la práctica que el CTO ya aplicaba en el checkout aislado de FIN-020 a FIN-024.

---

## 6. Estado real de la infraestructura y política de escalado (§36.4)

| Componente | Proveedor | Estado |
|---|---|---|
| Repositorio | GitHub | ✅ Oficial, en uso |
| Backend | Render (plan free, runtime Node) | ✅ En producción, verificado |
| Base de datos | Neon PostgreSQL | ✅ Conectada, 17 migraciones aplicadas |
| DNS / CDN | Cloudflare | ✅ Preparado (configuración definitiva pendiente) |
| Dominio comercial | — | ⏳ No adquirido (decisión consciente, infra antes que dominio) |

**Capacidad y escalado:** el entorno actual (plan gratuito) cumple el objetivo de
validación. **No se autoriza escalar a planes pagos por anticipación.** El único criterio
de escalado es la **necesidad técnica demostrada por datos reales**, y todo upgrade de
producción requiere autorización expresa del Fundador. Fuente: `INFRAESTRUCTURA.md` · memo del Fundador punto 4 (§36.4).

---

## 7. Nuevas responsabilidades derivadas

- **CTO:** además de Director Técnico, **custodio de la calidad técnica** — protege
  arquitectura, estabilidad, documentación y trazabilidad; impide deuda técnica
  innecesaria y cambios inconsistentes; es el único integrador de la rama oficial.
- **Todos los roles:** trabajar en "ambos frentes" (local y GitHub como espejo); toda
  entrega oficial debe quedar documentada, versionada y trazable en GitHub.

---

## 8. Punto exacto desde el cual el equipo continúa

- **Infraestructura:** Fase 0 cerrada. No se abren nuevas líneas estratégicas hasta
  finalizar el ciclo funcional actualmente aprobado.
- **Producto:** **FIN-026 (Experiencia de Simulador)** es la FIN activa; queda en pausa
  hasta que el Fundador valide el APK Android y la conectividad completa con el backend,
  momento en que se reactiva. Estado detallado y "dónde quedamos":
  `docs/ESTADO_PROYECTO.md` (FIN activa) · `docs/correspondencia/FIN-026-Experiencia-de-Simulador.md`.
- **Fast-follow registrado:** `FIN-025` (aviso proactivo de mora), sin fecha fija.
- **Recordatorio permanente vigente:** el CTO debe avisar al Fundador **con
  anticipación** antes de que cualquier FIN toque el módulo Registrar/Transacciones.

---

## 9. Resultado esperado de este memorando

1. Todo el equipo conoce el nuevo estado operativo del proyecto.
2. No existen diferencias de contexto entre roles.
3. Las siguientes decisiones parten de una misma línea base documental y técnica.

**Lectura mínima obligatoria para reincorporarse a la línea base:** `GOBERNANZA.md`
(§34–§36) · `ESTADO_PROYECTO.md` · `INFRAESTRUCTURA.md`. Detalle de una FIN concreta,
bajo demanda.

---

**MENSAJE PARA CPSAO, ARQUITECTO Y AUDITOR** — queda oficializado el nuevo estado del
proyecto. Operar desde esta línea base; cualquier artefacto en curso debe reconciliarse
con las §34–§36 antes de entregarse.
