# CLAUDE.md — Único Punto de Verdad (Single Source of Truth)

Este archivo proporciona la guía definitiva de arquitectura, reglas de negocio y comandos para cualquier agente de IA (Claude Code, GitHub Copilot, etc.) que trabaje en este repositorio. **Confía en estas instrucciones y no busques en otros archivos a menos que encuentres un error.**

## 1. Contexto del Proyecto
Plataforma web fullstack para gestionar **dos competiciones independientes** de amigos para el Mundial de Fútbol 2026:
- **Porra**: Predicción del bracket completo (clasificados + eliminatorias hasta la final). Se rellena una vez antes del torneo.
- **Quiniela**: Pronósticos partido a partido del marcador exacto de los 104 partidos del torneo.

El torneo cuenta con **48 selecciones y 104 partidos**, incluyendo la nueva ronda de dieciseisavos de final. Toda la interfaz de usuario (UI) y los nombres de las entidades en la base de datos están en español.

## 2. Stack Tecnológico & Arquitectura
* **Framework:** Next.js (App Router) + TypeScript (Strict Mode).
* **Estilos:** Tailwind CSS.
* **ORM:** Prisma (con `PrismaNeon` adapter de `@prisma/adapter-neon`).
* **Base de Datos:** PostgreSQL — Neon (integración Vercel Marketplace).
* **Autenticación:** NextAuth.js v5 (Auth.js) con Google OAuth + email/contraseña (Credentials + bcryptjs).
* **Email:** Resend (`src/lib/resend.ts`). Dominio: `porramundial.mdv.red`.
* **Cuotas de apuestas:** The Odds API (`src/lib/odds-api.ts`). Plan gratuito, 500 req/mes, respuestas cacheadas con `fetch` + `next.revalidate`.
* **Despliegue:** Vercel.

### Estructura de Carpetas Clave
```
src/
├── app/
│   ├── actions/             # Server Actions globales
│   │   ├── auth.ts          # Acciones de autenticación (sign in, registro)
│   │   ├── grupos.ts        # Acciones de grupos privados
│   │   ├── modals.ts        # Acciones de modales (dismiss, etc.)
│   │   └── nickname.ts      # Acción para guardar el nickname del usuario
│   ├── admin/               # Panel de administración (rol ADMIN o EDITOR)
│   │   ├── emails/          # Envío masivo de emails vía Resend
│   │   ├── grupos/          # Gestión de grupos privados (solo ADMIN)
│   │   ├── modales/         # Gestión de modales de anuncios
│   │   ├── partidos/        # Introducción de resultados de partidos
│   │   └── usuarios/        # Gestión de usuarios y roles
│   ├── ayuda/               # Página de ayuda
│   ├── grupo/[codigo]/      # Página de grupo privado
│   │   ├── ajustes/         # Ajustes del grupo (solo creador)
│   │   └── unirse/          # Página de unión al grupo
│   ├── grupos/              # Listado de grupos del usuario
│   │   └── nuevo/           # Crear nuevo grupo
│   ├── porra/               # Editor de bracket + ranking
│   │   ├── ranking/         # Ranking global de la porra
│   │   └── stats/           # Estadísticas del bracket
│   ├── privacidad/          # Página de política de privacidad
│   ├── quiniela/            # Editor de quiniela + ranking
│   │   └── ranking/         # Ranking global de la quiniela
│   ├── ranking/             # Vista unificada con tabs (Porra + Quiniela)
│   ├── registro/            # Registro con email y contraseña
│   └── login/               # Login (Google OAuth + email/contraseña)
├── components/
│   ├── admin/               # Componentes del panel admin
│   ├── bracket-tree.tsx     # Árbol visual del bracket (desktop + mobile por rondas)
│   ├── llaves-selector.tsx  # Editor de la porra (grupos → terceros → eliminatorias)
│   ├── partido-card.tsx     # Tarjeta de partido para la quiniela (ver nota en sección 6)
│   └── ...
└── lib/
    ├── auth.ts              # NextAuth config completa (con PrismaAdapter, para servidor)
    ├── auth.config.ts       # NextAuth config sin Prisma (para Edge / proxy.ts)
    ├── bracket.ts           # Tipos, constantes y lógica del bracket (ALL_MATCHES, etc.)
    ├── bracket-scoring.ts   # ARCHIVO CRÍTICO: puntuación de la porra
    ├── email-template.ts    # Constructor de HTML para emails (usado por resend.ts)
    ├── flags.ts             # Mapa de emojis de banderas por nombre de selección
    ├── grupo-actions.ts     # Server Actions de lógica de grupos (crear, unirse, salir)
    ├── odds-api.ts          # Cliente The Odds API (cuotas de apuestas)
    ├── prisma.ts            # Singleton del cliente Prisma con PrismaNeon
    ├── resend.ts            # Cliente Resend para envío de emails
    ├── scoring.ts           # ARCHIVO CRÍTICO: puntuación de la quiniela
    └── thirds-table.ts      # Tabla de clasificación de terceros
```

**Middleware:** `src/proxy.ts` (Next.js renombró `middleware.ts` → `proxy.ts`). Protege todas las rutas excepto `/api/auth`, `/_next`, `/login` y `/registro`.

---

## 3. Reglas de Negocio Críticas (Strict Business Rules)

### 3.1. Dos Competiciones Independientes

#### 3.1.1. Porra (Bracket Completo)
Sistema donde el usuario predice **una sola vez** el camino completo al título:
- Clasificados de cada grupo (1º y 2º)
- Los 8 mejores terceros (ordenados)
- Ganador de cada partido eliminatorio (dieciseisavos → final)

**Cierre:** Se bloquea 15 minutos antes del primer partido del torneo.

**Puntuación:**
- **Clasificados:** 1 pt por cada acertado (top-2 de grupo + terceros)
- **Eliminatorias:** Puntos por cada equipo que avanza:
  - Dieciseisavos: 2 pts
  - Octavos: 5 pts
  - Cuartos: 7 pts
  - Semifinal: 10 pts
  - Final/Campeón: 10 pts

**Modelo Prisma:** `PronosticoBracket` (campo JSON `picks` con estructura `{ grupos, terceros, resultados }`)

**UX:** Si el usuario ya ha completado las 3 fases (grupos + terceros + eliminatorias), al entrar en `/porra` se abre directamente en la pestaña Eliminatorias (ronda Final en mobile).

#### 3.1.2. Quiniela (Partido a Partido)
Sistema donde el usuario predice **el marcador exacto** de cada uno de los 104 partidos, durante todo el torneo.

**Cierre por partido:** 15 minutos antes del inicio de cada partido.

**Puntuación jerárquica** (se otorga solo el puntaje más alto que corresponda):
| Condición | Fase de Grupos | Fase Eliminatoria (×2) |
|---|:--------------:|:----------------------:|
| **Marcador exacto** | 5 pts | 10 pts |
| **Tendencia correcta** | 3 pts | 6 pts |
| **Consolación** (goles exactos de UN equipo) | 1 pt | 2 pts |
| **Fallo total** | 0 pts | 0 pts |

**Predicciones especiales** (cierran día 1, suman en el ranking de Quiniela):
- Campeón: 20 pts
- Subcampeón: 15 pts
- Bota de Oro: puntos configurables

**Modelos Prisma:** `Pronostico` (partido a partido) + `PrediccionFutura` (especiales: campeón, subcampeón, bota de oro)

### 3.2. Definición de Resultado Oficial (Quiniela)
* El resultado válido es el marcador al finalizar el tiempo oficial de juego: **90 minutos reglamentarios + 30 minutos de prórroga** (si se disputa).
* **Exclusión:** Las tandas de penales de desempate final **NO** cuentan para el marcador de la quiniela.

### 3.3. Bloqueo de Seguridad Obligatorio (Hard Deadline)
* **Porra:** Se bloquea 15 minutos antes del inicio del primer partido.
* **Quiniela:** Cada pronóstico se bloquea **15 minutos antes** del inicio de su partido (`fechaPartido`).
* **Seguridad:** Esta validación **debe ejecutarse obligatoriamente en el Backend** (Server Actions o API Routes). El bloqueo en el Frontend es meramente para experiencia de usuario (UX).

### 3.4. Roles de Usuario
```
ADMIN   → acceso total: admin panel, resultados, emails, modales, usuarios
EDITOR  → acceso a introducción de resultados de partidos (/admin/partidos)
JUGADOR → usuario estándar (rol por defecto)
```

### 3.5. Ranking y Desempates
Cada competición tiene su propio ranking independiente. Ambas tienen vista global (`/ranking`) y vista por grupo privado (`/grupo/[codigo]`).

**Ranking Porra:**
- Suma de puntos del bracket (clasificados + eliminatorias)
- Desempate: (1) Mayor % de completitud → (2) Fecha de registro más antigua

**Ranking Quiniela:**
- Suma de puntos de partidos (`Pronostico.puntosGanados`) + predicciones especiales (`PrediccionFutura`)
- Desempate: (1) Más marcadores exactos → (2) Más tendencias acertadas → (3) Fecha de registro más antigua

### 3.6. Grupos Privados
Los usuarios pueden crear grupos privados de amigos con un código de invitación único. Cada grupo tiene su propio ranking de porra y quiniela filtrado por sus miembros. Modelos: `Grupo` + `GrupoMiembro`.

### 3.7. Sistema de Modales de Anuncios
Los admins pueden crear modales de anuncios (`Modal`) que aparecen a los usuarios. Cada usuario puede dismissarlos (`ModalDismissal`). Se gestionan desde `/admin/modales`.

### 3.8. Criterios de Desempate en Fase de Grupos (Reglamento FIFA)
Cuando dos o más equipos quedan igualados en puntos al final de la fase de grupos, se aplican estos criterios **en orden**:

1. **Mayor número de puntos en el partido(s) disputado(s) entre los equipos empatados** (mini-liga entre los implicados).
2. Si persiste el empate, se pasa a los resultados de los **tres partidos** del grupo:
   a. Mejor diferencia de goles en el grupo.
   b. Mayor número de goles marcados en el grupo.
   c. Mejor conducta deportiva (menos tarjetas: amarilla = 1 pt, roja directa = 3 pts, amarilla + roja = 3 pts).

Estos criterios afectan directamente a la lógica de `src/lib/thirds-table.ts` y a la página de clasificación (`src/app/clasificacion/`), que calculan las posiciones de grupo y los mejores terceros.

---

## 4. Scripts y Comandos del Entorno

**NUNCA hacer `git push` sin autorización explícita del usuario.** Siempre esperar a que el usuario pida el push antes de ejecutarlo.

Siempre ejecuta `npm install` antes de cualquier compilación.

```bash
npm run dev                            # Servidor de desarrollo local
npm run build                          # Compilación de producción (Verificación de tipos)
npm run lint                           # Validación de ESLint
npx prisma migrate dev --name <name>   # Crear y aplicar migraciones a la Base de Datos
npx prisma generate                    # Regenerar el cliente de Prisma tras cambiar el esquema
npx prisma studio                      # Explorador visual de la Base de Datos
npx auth secret                        # Generar el AUTH_SECRET de NextAuth para el .env
npm run seed                           # Poblar la BD con datos reales del Mundial 2026
npm run seed:demo                      # Poblar la BD con usuarios ficticios y quinielas
npm run seed:bracket-demo              # Poblar la BD con picks de bracket de prueba
npm run seed:clean                     # Limpiar datos de demo
```

---

## 5. Separación de Entornos: Desarrollo vs. Producción

### 5.1. Arquitectura de bases de datos

Este proyecto usa **Neon Branches** para separar los entornos:

| Entorno | Rama Neon | Conectado desde |
|---|---|---|
| **Producción** | `main` | Vercel (variables de entorno del proyecto) |
| **Desarrollo local** | `dev` | `.env.local` en la máquina local |

Ambas ramas comparten el mismo proyecto Neon (`sparkling-sky-10910300`). La rama `dev` es un fork copy-on-write de `main` — hereda el esquema completo pero los datos son completamente independientes.

### 5.2. Variables de entorno por entorno

**`.env.local` (desarrollo local — NO se commitea)**
Debe contener las credenciales de la rama `dev` de Neon y el resto de servicios. Variables críticas:

```
PORRA_POSTGRES_PRISMA_URL      # URL de conexión pooled (usada por Prisma en runtime)
PORRA_DATABASE_URL             # Alias de la URL pooled
PORRA_POSTGRES_URL             # Alias de la URL pooled
PORRA_POSTGRES_URL_NON_POOLING # URL directa (sin pool), para migraciones

AUTH_SECRET                    # Secret de NextAuth (npx auth secret)
AUTH_GOOGLE_ID                 # Google OAuth client ID
AUTH_GOOGLE_SECRET             # Google OAuth client secret

RESEND_API_KEY                 # API key de Resend para emails
ODDS_API_KEY                   # API key de The Odds API (cuotas de apuestas)
```

**Producción**
Las variables viven exclusivamente en el Dashboard de Vercel y apuntan a la rama `main`. No se gestionan localmente.

### 5.3. Regla crítica: NO correr `vercel env pull` sin cuidado

```bash
# PELIGROSO — sobreescribe .env.local con credenciales de PRODUCCIÓN:
npx vercel env pull .env.local --environment=production --yes

# SEGURO — descarga variables del entorno de desarrollo de Vercel:
npx vercel env pull .env.local --environment=development --yes
```

**Antes de correr cualquier `vercel env pull`, verificar qué rama Neon está configurada en ese entorno de Vercel.**

### 5.4. Workflow para un desarrollador nuevo

1. Clonar el repositorio
2. `npm install`
3. Solicitar al admin las credenciales de la rama `dev` de Neon + claves de servicios
4. Crear `.env.local` con esas credenciales (ver sección 5.2)
5. Verificar estado de migraciones: `npx prisma migrate status`
6. Poblar con datos de prueba: `npm run seed:demo`
7. `npm run dev`

### 5.5. Workflow para aplicar una migración nueva

```bash
# 1. Crear la migración y aplicarla en la rama dev local
npx prisma migrate dev --name <nombre-descriptivo>

# 2. Verificar que la app funciona correctamente en local

# 3. Al hacer deploy a Vercel, las migraciones se aplican automáticamente
#    en producción (rama main) gracias al comando postinstall + migrate deploy,
#    O bien ejecutar manualmente apuntando a producción:
PORRA_POSTGRES_PRISMA_URL=<url-produccion> npx prisma migrate deploy
```

> **NUNCA** correr `prisma migrate dev` apuntando a la base de datos de producción.
> `migrate dev` puede resetear datos. En producción, usar siempre `migrate deploy`.

### 5.6. Crear o resetear la rama dev de Neon

Si la rama `dev` no existe o necesita resetearse desde el estado actual de producción:

1. Ir a [neon.tech](https://neon.tech) → proyecto `sparkling-sky-10910300` → pestaña **Branches**
2. Crear rama: nombre `dev`, base `main`
3. Copiar el connection string (pooled) de la nueva rama
4. Actualizar `PORRA_POSTGRES_PRISMA_URL` (y variables relacionadas) en `.env.local`
5. Verificar: `npx prisma migrate status`
6. Opcional: `npm run seed:demo` para datos de prueba

---

## 6. Notas de implementación

- **Prisma**: el cliente requiere un adapter explícito. Se usa `PrismaNeon` de `@prisma/adapter-neon`. La URL se pasa en el constructor (`process.env.PORRA_POSTGRES_PRISMA_URL`), no desde env vars automáticamente. Ver `src/lib/prisma.ts`.
- **Middleware**: Next.js renombró `middleware.ts` → `proxy.ts`. El auth split config usa `src/lib/auth.config.ts` (sin Prisma, para Edge) y `src/lib/auth.ts` (con PrismaAdapter, para servidor).
- **Autenticación**: soporta Google OAuth y email/contraseña. Las contraseñas se hashean con `bcryptjs`. Registro en `/registro`. El campo `User.password` es opcional (null para usuarios de Google).
- **Variables de BD**: el prefijo `PORRA_` viene de la integración Neon en Vercel. En desarrollo, las variables apuntan a la rama Neon `dev` (ver sección 5). **No usar `vercel env pull --environment=production` para desarrollo local.**
- **Cálculo de puntos**: se dispara cuando un admin/editor guarda el resultado de un partido; actualiza en batch `puntosGanados` en todos los `Pronostico` asociados. La lógica vive en `src/lib/scoring.ts`.
- **Ranking**: sumar `puntosGanados` de `Pronostico` + puntos de `PrediccionFutura` por usuario; aplicar desempate en la query.
- **`User.name`**: campo estándar de NextAuth (antes era `nombre`). En la UI se etiqueta como "Nombre" o "Nickname". El campo `hasChosenNickname` indica si el usuario ya eligió su nombre de display. El campo `welcomeModalViews` (Int, default 0) rastrea cuántas veces el usuario ha visto el modal de bienvenida.
- **The Odds API**: se usa únicamente para mostrar cuotas de apuestas en el bracket. Plan gratuito (500 req/mes). Las respuestas se cachean mediante `fetch` con `next.revalidate`. Si `ODDS_API_KEY` no está configurada, el bracket funciona sin cuotas.
- **Resend**: se usa para el envío masivo de emails desde `/admin/emails`. El dominio remitente es `porramundial.mdv.red`.
- **Teams ocultos en eliminatorias**: los equipos de la fase eliminatoria no se muestran hasta que se conoce el resultado de la fase anterior (lógica en `bracket.ts` con `resolveSlot`).
- **Partido destacado en `/quiniela`**: la página muestra siempre arriba del todo, separado de los tabs, el partido en curso (`EN_PROGRESO`) o, si no hay ninguno, el próximo partido pendiente. Se calcula en el Server Component (`src/app/quiniela/page.tsx`) y se renderiza con `PartidoCard` + un ring visual diferenciador (amarillo para en directo, neutro para próximo).
- **Dropdown Pronósticos/Puntuaciones en `PartidoCard`**: el desplegable es visible para **todos** los estados del partido:
  - `PROGRAMADO` → etiqueta "Pronósticos", lista todos los pronósticos introducidos (`/api/partidos/pronosticos`) mostrando el marcador elegido.
  - `EN_PROGRESO` → etiqueta "Puntuaciones", proyección en tiempo real con el marcador live.
  - `FINALIZADO` → etiqueta "Puntuaciones", muestra puntos ganados + marcador pronosticado de cada usuario.
  - El endpoint `/api/partidos/puntos` devuelve también `golesLocal` y `golesVisitante` para mostrarlos junto a los puntos.
