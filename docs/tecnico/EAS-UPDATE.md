# Procedimiento oficial — EAS Update (OTA) y EAS Build

- **Estado:** Vigente desde 2026-07-13
- **Ámbito:** flujo de despliegue del frontend (Expo / React Native).
- **Instruido por:** Fundador (memo 2026-07-13, "Configuración oficial de EAS Update para el flujo de despliegue del frontend").

---

## 1. Los dos mecanismos y cuándo usar cada uno

A partir de ahora el frontend tiene **dos** vías de despliegue con propósitos distintos.
Elegir mal la vía es la principal fuente de error, así que la regla es simple:

| Mecanismo | Se usa para | NO se usa para |
|---|---|---|
| **EAS Update (OTA)** | Cambios de interfaz, correcciones de bugs, mejoras funcionales en React Native/JS — llegan al dispositivo **sin reinstalar** | Nada que toque código nativo |
| **EAS Build (APK/AAB)** | Primera instalación, publicación en Google Play / App Store, **cualquier cambio nativo** | Cambios que son solo JS/TS/assets (para eso está OTA) |

**Qué cuenta como "cambio nativo"** (obliga a un build nuevo, no basta OTA):
- Instalar/actualizar/eliminar una dependencia con módulo nativo (`expo install <algo>` que añade código nativo).
- Cambiar `app.json` en campos nativos: `plugins`, permisos, `package`/`bundleIdentifier`, íconos, splash, `runtimeVersion`.
- Subir la versión de SDK de Expo.

Todo lo demás (pantallas, lógica de negocio en JS, textos, estilos, correcciones) va por **OTA**.

---

## 2. Cómo funciona (modelo mental)

- Cada build de la app declara un **`runtimeVersion`** (hoy: política `appVersion`, es
  decir la versión `0.1.0` de `app.json`) y escucha un **canal** (`development`,
  `preview` o `production`).
- Un OTA (`eas update`) publica un paquete de JS/assets a una **rama**, que el canal
  consume. La app, al abrir, consulta `https://u.expo.dev/<projectId>` y **solo aplica
  el update si el `runtimeVersion` coincide** con el del build instalado.
- **Consecuencia clave:** un OTA nunca puede reparar un cambio nativo. Si cambia el
  `runtimeVersion`, los dispositivos viejos dejan de recibir OTAs y necesitan un build
  nuevo. Por eso subir `runtimeVersion` es una decisión deliberada, no accidental.

---

## 3. Configuración vigente (ya aplicada)

- `expo-updates` `~29.0.18` instalado (`frontend/package.json`).
- `frontend/app.json`:
  - `owner: "millo_app"`, `extra.eas.projectId: 523d23dc-5053-49c8-85b0-d94ebf1e708d`.
  - `runtimeVersion: { policy: "appVersion" }`.
  - `updates`: `url` del proyecto EAS, `enabled: true`, `checkAutomatically: ON_LOAD`,
    `fallbackToCacheTimeout: 0`.
- `frontend/eas.json`: cada perfil de build tiene su `channel`
  (`development` → canal `development`, `preview` → `preview`, `production` →
  `production`).
- Validado con `npx expo-doctor` (18/18 checks) el 2026-07-13.

> **Nota Windows / Git:** en la máquina actual `git` no está disponible para el CLI de
> EAS, por lo que los comandos de build/update se ejecutan con `EAS_NO_VCS=1` por
> delante. No afecta al resultado; solo indica a EAS que empaquete el directorio de
> trabajo en vez de leer el árbol de git.

---

## 4. Uso diario

Todos los comandos se corren desde `frontend/`. En Windows CMD:
`set EAS_NO_VCS=1 && npx eas-cli <...>`.

### 4.1 Publicar una actualización OTA (el caso común, 99% de los cambios)
```
set EAS_NO_VCS=1 && npx eas-cli update --branch preview --message "descripción del cambio"
```
- `--branch preview` → llega a los dispositivos con un build del perfil `preview`.
- Para producción real: `--branch production`.
- El usuario recibe el cambio **la próxima vez que abre la app** (política `ON_LOAD`).

### 4.2 Generar un build nuevo (solo primera instalación o cambio nativo)
```
set EAS_NO_VCS=1 && npx eas-cli build --platform android --profile preview
```
- Produce un APK instalable. Tras instalarlo, ese dispositivo ya recibe OTAs del canal `preview`.

### 4.3 Ver el estado
```
npx eas-cli update:list --branch preview
npx eas-cli channel:list
```

---

## 5. Flujo recomendado para las próximas FIN

1. Arquitecto implementa el cambio de frontend (JS/TS) en rama de trabajo.
2. CTO valida e integra a la rama oficial (§36.2) tras el testing (§36.3).
3. **Si el cambio es solo JS/TS/assets:** el CTO publica un OTA a `preview`
   (`eas update --branch preview`) — el Fundador lo ve al reabrir la app, sin reinstalar.
4. **Si el cambio es nativo:** se genera un build nuevo y se reinstala.
5. Cuando el producto salga a tiendas, el canal `production` sigue el mismo patrón sobre
   los builds publicados.

Esto reduce el ciclo de iteración de ~15 min (build) a segundos (OTA) para la mayoría de
los cambios, que era el objetivo del Fundador.

---

## 6. Límites y cuidados

- **OTA no cruza `runtimeVersion`.** Un cambio nativo obliga a build; no intentar
  parchear con OTA.
- **Las variables de entorno del OTA** salen del `env` del perfil en `eas.json` (igual
  que en build). El OTA de `preview` usa `EXPO_PUBLIC_API_URL=https://milla-backend.onrender.com/v1`.
- **No se toca la infraestructura** (Render/Neon/variables del backend) — EAS Update es
  exclusivamente cliente.
- El **APK OTA-capaz** es un build nuevo (con `expo-updates`); el APK previo a esta
  configuración **no** recibe OTAs y se conserva solo como referencia de validación.

---

## Historial
- 2026-07-13 — Creación. `expo-updates` instalado, `app.json`/`eas.json` configurados,
  canales `development`/`preview`/`production` definidos, compatibilidad validada
  (`expo-doctor` 18/18). Pendiente en el momento de escribir: primer build OTA-capaz +
  prueba OTA controlada sobre él. Commit `c6c5cd9`.
- 2026-07-14 — **Primer build OTA-capaz + primer OTA publicados (prueba OTA completada).**
  Build `21922b26` (canal `preview`, runtime `0.1.0`) generado con `expo-updates`. Primer
  `eas update --branch preview` publicado (update group `c1d5c328`, runtime `0.1.0`) con los
  cambios de frontend de FIN-027 (perfil de ingresos), FIN-028 (editar/anular movimientos) y
  BT-001 (formato regional). Queda validado el flujo OTA de punta a punta: las modificaciones
  de JS/UI llegan al APK OTA-capaz sin reinstalar. Backend correspondiente ya desplegado en
  Render (auto-deploy; `/v1/income/profile` verificado vivo).
