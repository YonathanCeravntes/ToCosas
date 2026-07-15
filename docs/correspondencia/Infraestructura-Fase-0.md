# Correspondencia — Infraestructura Fase 0

Hilo del cierre de la Fase 0 de infraestructura de producción y la resolución de las
decisiones de gobernanza asociadas. Append-only: no se editan entradas pasadas.

---

## 2026-07-13 — De: CTO — Para: Fundador — CC: Arquitecto, Auditor, CPSAO

**Asunto:** Infraestructura Fase 0 completa + App móvil conectada — Dudas de gobernanza
**Estado:** Información + decisiones requeridas

**Logrado:**
- Backend NestJS en producción (Render, runtime Node) + Neon PostgreSQL conectada.
- 17 migraciones Prisma aplicadas; `/v1/health` y `/v1/ready` verificadas 200 OK desde afuera.
- App móvil (Expo/Android) apuntando al backend real (`https://milla-backend.onrender.com/v1`); APK compilando en EAS.
- `render.yaml` corregido a la configuración real (Node, no Docker) — commit `2381063` publicado a `origin`.
- `INFRAESTRUCTURA.md` y `BACKLOG.md` actualizados en el mismo acto (§34).

**Capacidad actual:** plan free ≈ 5–10 usuarios concurrentes, apto para validación; escalar (Render pagado/Redis/monitoreo/backups) costaría ~$30–50/mes.

**Dudas planteadas:** (1) documentación en GitHub — ¿mantener todo o híbrido?; (2) workflow local↔GitHub — ¿commit directo o validación centralizada del CTO?; (3) testing pre-merge — ¿automático o bajo demanda?; (4) ¿cuándo escalar a pagos?

**MENSAJE PARA FUNDADOR** — se solicita resolución de los 4 puntos de gobernanza.

---

## 2026-07-13 — De: Fundador — Para: CTO — CC: Arquitecto, Auditor, CPSAO

**Asunto:** Resolución de decisiones de gobernanza — Infraestructura Fase 0 completada
**Estado:** Aprobado.

Felicitación al equipo por completar la Fase 0. Prioridad ahora: preservar orden,
calidad y escalabilidad. Resoluciones (institucionalizadas en `GOBERNANZA.md` §36):

1. **Documentación en GitHub — modelo híbrido.** Permanece todo lo necesario para
   reconstruir el proyecto (código, infraestructura, arquitectura, gobernanza, roadmap,
   decisiones, auditorías, documentación técnica, manuales). No permanece la
   información sensible (credenciales, secretos, claves, tokens, variables privadas,
   documentación legal confidencial, información comercial sensible futura). *GitHub es
   fuente oficial de respaldo del código y del conocimiento.*
2. **Workflow permanente:** `Fundador→CPSAO→CTO→Arquitecto→Auditor→CTO→GitHub`. El CTO
   es el **único integrador** de cambios oficiales; no hay commits directos del
   Arquitecto a la rama oficial; ninguna modificación llega a la rama oficial sin
   validación del CTO. La estabilidad tiene prioridad sobre la velocidad.
3. **Testing obligatorio** antes de integrar cualquier cambio oficial: unitarias, e2e,
   validación TypeScript, compilación y verificación de migraciones cuando aplique.
   Objetivo: que el proyecto nunca retroceda funcionalmente.
4. **Producción:** no se autoriza escalar a planes pagos todavía. Criterio para
   escalar = necesidad técnica demostrada por datos reales, no previsión.
5. **GitHub = registro histórico oficial** (documentado, versionado, trazable, recuperable).
6. **Nueva responsabilidad del CTO:** custodio de la calidad técnica (proteger
   arquitectura, estabilidad, documentación, trazabilidad; impedir deuda técnica
   innecesaria y cambios inconsistentes).
7. **Infraestructura Fase 0 oficialmente finalizada.** Incorporados: GitHub, Render,
   Neon PostgreSQL, Cloudflare (preparado), Prisma, despliegue automático, infraestructura documentada.
8. **Próxima prioridad:** validado el APK y la conectividad completa, **FIN-026 se
   reactiva** y se retoma el desarrollo funcional. No se abren nuevas líneas
   estratégicas hasta cerrar el ciclo funcional actual.

Reconocimiento al equipo por la gobernanza sólida, el proceso disciplinado, el sistema
documental trazable y la infraestructura preparada para crecer. **Autorizado.**

---

## 2026-07-13 — De: CTO — Para: Fundador — CC: Arquitecto, Auditor, CPSAO

**Asunto:** Acuse e institucionalización del memo — `GOBERNANZA.md` v3.14 (§36)
**Estado:** Ejecutado.

Recibido y aplicado. Las 8 resoluciones quedan institucionalizadas como reglas
permanentes en `GOBERNANZA.md` §36 (v3.14), commiteadas y publicadas a `origin` en el
mismo acto (§34/§35). `ESTADO_PROYECTO.md` y `BACKLOG.md` actualizados: Fase 0 marcada
finalizada; FIN-026 queda a la espera de validación del APK para reactivarse.

Asumo formalmente el rol de custodio de la calidad técnica. El flujo del §36.2 y el
testing obligatorio del §36.3 rigen desde ya para toda integración futura.

**MENSAJE PARA FUNDADOR** — memo institucionalizado; a la espera de que pruebes el APK
para reactivar FIN-026.
