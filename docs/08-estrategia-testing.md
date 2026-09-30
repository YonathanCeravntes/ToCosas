# 08 · Estrategia de testing

Objetivo: garantizar la corrección del **motor financiero** (donde un error cuesta dinero real) y la **robustez del parser de WhatsApp** (donde vive el diferenciador), sin frenar la velocidad del equipo.

---

## 1. Pirámide de pruebas

```
                 ▲   E2E (pocos, críticos)
                 │   - flujo registro→deuda→pago→dashboard
                 │   - flujo WhatsApp: mensaje→transacción→confirmación
        Integración (medio)
                 │   - API + DB (endpoints con Postgres de prueba)
                 │   - webhook + cola + worker
        Unitarias (muchos, rápidos)
                     - amortización, parser reglas, motor de sugerencias, DTOs
```

Regla: **más pruebas unitarias en la lógica de dominio** (amortización, sugerencias, parser), **integración** en los bordes (API↔DB, webhook↔cola), y **pocos E2E** en los caminos críticos de negocio.

---

## 2. Backend (NestJS)

| Tipo | Herramienta | Qué cubre |
|------|-------------|-----------|
| Unitarias | **Jest** | Servicios de dominio: amortización (francés, alemán, cuota fija), cálculo de intereses (EA↔NMV), motor de sugerencias, normalización de montos del parser |
| Integración | **Jest + Supertest + Testcontainers (Postgres/Redis)** | Endpoints REST, migraciones, sync delta, idempotencia |
| Webhook/cola | Jest + Redis de prueba | Recepción→dedup→encolado→worker→persistencia |
| Contrato | **Pact** (opcional) o OpenAPI validation | Contrato API ↔ app móvil |
| Carga | **k6** o Artillery | Webhook bajo ráfagas, endpoints de dashboard |

### Casos críticos obligatorios del motor financiero
- Amortización sistema francés: suma de capital = principal; última cuota cierra en 0.
- Conversión de tasas EA ↔ NMV ↔ mensual correcta (con tolerancia decimal).
- Abono extra a capital reduce plazo/intereses correctamente.
- Pago de deuda descuenta saldo y marca la cuota; no permite saldo negativo.
- Redondeo consistente (usar `NUMERIC`, comparar con tolerancia definida).

### Casos críticos del parser NLP (tabla de fixtures)
Mantener un **dataset versionado** de mensajes→salida esperada (los de [doc 04 §5](04-integracion-whatsapp.md) y más), ejecutado en CI:

```
"Gasté $45.000 en almuerzo"                 → gasto, 45000, comida
"Pagué $250.000 a Bancolombia cuota casa"   → pago_deuda, 250000, Bancolombia, deuda
"Me llegó ingreso de $1.200.000 freelance"  → ingreso, 1200000, freelance
"abone 100k a la tarjeta"                    → pago_deuda, 100000, missing:[entity?]
"cuanto debo"                                → intent: consulta_resumen
"asdfgh"                                     → intent: desconocido → pide aclaración
```
- Medir **precisión/recall** del rule-based y del LLM por separado; alertar si baja de un umbral.
- Tests de **idempotencia** (mismo `message_id` no duplica) y de **ambigüedad** (baja confianza → clarifying).
- Para el LLM: tests con respuestas *mockeadas* (deterministas en CI) + una suite `@nightly` contra el modelo real para detectar regresiones.

---

## 3. App móvil (React Native)

| Tipo | Herramienta | Qué cubre |
|------|-------------|-----------|
| Unitarias/lógica | **Jest** | Reducers/stores, formateadores de moneda, cálculos locales |
| Componentes | **React Native Testing Library** | Render, interacción, estados de carga/error |
| Offline/sync | Jest + WatermelonDB en memoria | Encolado offline, merge, resolución de conflictos |
| E2E | **Detox** (o Maestro) | Flujos completos en simulador/emulador |
| Visual | Storybook + snapshots (opcional) | Regresión visual de componentes |

### Flujos E2E móviles clave
- Registro → crear entidad → crear deuda → ver amortización.
- Registrar gasto offline → reconectar → verificar sync.
- Ver dashboard con datos sembrados.
- Recibir push de recordatorio (mock FCM).

---

## 4. Pruebas de la integración WhatsApp (E2E)

- **Simulador de webhook:** herramienta interna que emula POSTs de Meta (con firma válida) para probar el pipeline completo sin depender de Meta.
- **Sandbox de Twilio** para pruebas manuales de extremo a extremo con un teléfono real.
- Escenarios: vinculación OTP, mensaje ambiguo→aclaración→confirmación, comando "resumen", "deshacer", opt-out "STOP".

---

## 5. Calidad transversal

- **Cobertura objetivo:** ≥ 85% en módulos de dominio (amortización, parser, sugerencias); ≥ 60% global. La cobertura no es la meta; los **casos críticos cubiertos** sí.
- **Lint + format:** ESLint + Prettier; TypeScript `strict`.
- **Type-check** en CI (app y backend comparten tipos donde sea posible).
- **CI gate:** PR no mergea si fallan lint, type-check, unit, integración.
- **Datos de prueba:** *factories/seeders* (p. ej. `@faker-js/faker`) para usuarios/deudas realistas.
- **Entorno de staging** con datos sintéticos para QA manual antes de release.
- **Accesibilidad:** pruebas básicas de a11y en la app (labels, contraste, tamaños táctiles).

---

## 6. Estrategia por fase

| Fase | Enfoque de testing |
|------|--------------------|
| MVP | Unit del motor financiero + parser reglas; integración API/DB; E2E de los 4 flujos críticos; simulador de webhook |
| Fase 2 | Tests del motor de sugerencias y simuladores; E2E de recordatorios por WhatsApp; carga en webhook |
| Fase 3 | Tests de OCR (fixtures de imágenes), IA conversacional (suite nightly), tiempo real |
