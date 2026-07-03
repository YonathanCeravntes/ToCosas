# ToCosas — App de Finanzas Personales con Foco en Deudas e Inteligencia Financiera

> **ToCosas** es una aplicación móvil (Android + iOS) para el control de finanzas personales, especializada en la **gestión de deudas y compromisos de pago**, con **recordatorios y sugerencias inteligentes** y un diferenciador clave: **la posibilidad de registrar movimientos por WhatsApp** mediante lenguaje natural.

Este repositorio contiene el **diseño y la especificación técnica completa** del producto, lista para que un equipo de desarrollo la tome y comience a codificar.

---

## 📚 Índice de documentación

| # | Documento | Descripción |
|---|-----------|-------------|
| 00 | [Visión y propuesta de valor](docs/00-vision-y-propuesta-de-valor.md) | Qué es, para quién, por qué gana |
| 01 | [Funcionalidades y priorización (MoSCoW)](docs/01-funcionalidades-moscow.md) | Alcance funcional priorizado |
| 02 | [Arquitectura del sistema (C4)](docs/02-arquitectura-sistema.md) | Diagramas de contexto, contenedores y componentes |
| 03 | [Esquema de base de datos](docs/03-esquema-base-datos.md) | Modelo relacional (PostgreSQL) detallado + variante Firestore |
| 04 | [Integración con WhatsApp (deep dive)](docs/04-integracion-whatsapp.md) | El diferenciador: webhook, colas, NLP, sincronización |
| 05 | [Diseño de la API REST](docs/05-diseno-api-rest.md) | Endpoints, métodos y payloads |
| 06 | [Plan de desarrollo por fases](docs/06-plan-desarrollo-fases.md) | MVP, Fase 2, Fase 3 + stack por capa |
| 07 | [Seguridad y privacidad](docs/07-seguridad-privacidad.md) | Encriptación, consentimiento, eliminación de cuenta |
| 08 | [Estrategia de testing](docs/08-estrategia-testing.md) | Pirámide de pruebas, herramientas, cobertura |
| 09 | [Despliegue y publicación](docs/09-despliegue-publicacion.md) | Play Store / App Store + CI/CD + infraestructura |
| 10 | [Costos y escalabilidad](docs/10-costos-y-escalabilidad.md) | Estimación gratuita y planes de crecimiento |

---

## 🧭 Resumen ejecutivo (TL;DR)

- **Frontend:** React Native (Expo + módulos nativos) → una sola base de código para Android e iOS.
- **Backend:** NestJS (Node.js + TypeScript) como API REST, desplegable en contenedores. Firebase se usa como servicios gestionados complementarios (Auth, FCM, Storage).
- **Base de datos:** PostgreSQL (modelo relacional) por la naturaleza contable/transaccional del dominio. Redis para cache y colas.
- **Offline:** SQLite (vía WatermelonDB) en el dispositivo, con motor de sincronización delta.
- **WhatsApp:** WhatsApp Business Cloud API (Meta) → webhook → cola (BullMQ/Redis) → parser NLP (reglas + LLM ligero) → transacción estructurada → confirmación.
- **Notificaciones:** FCM (push) + WhatsApp Cloud API (recordatorios conversacionales).

## 🚀 Cómo continuar

1. Lee **[00-Visión](docs/00-vision-y-propuesta-de-valor.md)** y **[01-MoSCoW](docs/01-funcionalidades-moscow.md)** para entender alcance.
2. Revisa **[02-Arquitectura](docs/02-arquitectura-sistema.md)** y **[03-Base de datos](docs/03-esquema-base-datos.md)** para el diseño técnico.
3. Profundiza en **[04-WhatsApp](docs/04-integracion-whatsapp.md)** — es el corazón del diferenciador.
4. Usa **[06-Plan por fases](docs/06-plan-desarrollo-fases.md)** como hoja de ruta de sprints.

---

*Documento de diseño — versión 1.0. Todas las cifras monetarias de ejemplo están en pesos colombianos (COP), pero el modelo es multi-moneda.*
