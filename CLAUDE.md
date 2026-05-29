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
* **ORM:** Prisma.
* **Base de Datos:** PostgreSQL — Vercel Postgres (Neon).
* **Autenticación:** NextAuth.js v5 (Auth.js) con Google OAuth.
* **Despliegue:** Vercel.

### Estructura de Carpetas Clave
* `src/app/`: Rutas de la aplicación, páginas y Server Actions.
  * `/porra`: Editor y ranking del bracket completo (llaves)
  * `/quiniela`: Editor y ranking de pronósticos partido a partido
  * `/ranking`: Vista general que redirige al ranking de Quiniela
* `src/lib/scoring.ts`: **ARCHIVO CRÍTICO.** Lógica de cálculo de puntos para la Quiniela (partido a partido).
* `src/lib/bracket-scoring.ts`: **ARCHIVO CRÍTICO.** Lógica de cálculo de puntos para la Porra (bracket).
* `prisma/schema.prisma`: Definición del esquema de datos.

---

## 3. Reglas de Negocio Críticas (Strict Business Rules)

### 3.1. Dos Competiciones Independientes

#### 3.1.1. Porra (Bracket Completo)
Sistema donde el usuario predice **una sola vez** el camino completo al título:
- Clasificados de cada grupo (1º y 2º)
- Los 8 mejores terceros
- Ganador de cada partido eliminatorio (dieciseisavos → final)

**Cierre:** Se bloquea el día 1 del torneo (primera patada).

**Puntuación:**
- **Clasificados:** 1 pt por cada acertado (top-2 de grupo + terceros)
- **Eliminatorias:** Puntos por cada equipo que avanza:
  - Dieciseisavos: 2 pts
  - Octavos: 5 pts
  - Cuartos: 7 pts
  - Semifinal: 10 pts
  - Final/Campeón: 10 pts

**Modelo Prisma:** `PronosticoBracket` (campo JSON `picks`)

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
- Bota de Oro: 15 pts

**Modelos Prisma:** `Pronostico` (partido a partido) + `PrediccionFutura` (especiales)

### 3.2. Definición de Resultado Oficial (Quiniela)
* El resultado válido es el marcador al finalizar el tiempo oficial de juego: **90 minutos reglamentarios + 30 minutos de prórroga** (si se disputa).
* **Exclusión:** Las tandas de penales de desempate final **NO** cuentan para el marcador de la quiniela.

### 3.3. Bloqueo de Seguridad Obligatorio (Hard Deadline)
* **Porra:** Se bloquea al inicio del primer partido del torneo.
* **Quiniela:** Cada pronóstico se bloquea **15 minutos antes** del inicio de su partido (`fechaPartido`).
* **Seguridad:** Esta validación **debe ejecutarse obligatoriamente en el Backend** (Server Actions o API Routes). El bloqueo en el Frontend es meramente para experiencia de usuario (UX).

### 3.4. Ranking y Desempates
Cada competición tiene su propio ranking independiente:

**Ranking Porra:**
- Suma de puntos del bracket (clasificados + eliminatorias)
- Desempate: (1) Mayor % de completitud → (2) Fecha de registro más antigua

**Ranking Quiniela:**
- Suma de puntos de partidos (`Pronostico.puntosGanados`) + predicciones especiales (`PrediccionFutura`)
- Desempate: (1) Más marcadores exactos → (2) Más tendencias acertadas → (3) Fecha de registro más antigua

---

## 4. Scripts y Comandos del Entorno

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
npm run seed:demo                      # Poblar la BD con datos de prueba (usuarios ficticios)
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
Debe contener las credenciales de la rama `dev` de Neon. Las variables críticas que deben apuntar a la rama `dev`:

```
PORRA_POSTGRES_PRISMA_URL   # URL de conexión pooled (usada por Prisma en runtime y migraciones)
PORRA_DATABASE_URL          # Alias de la URL pooled
PORRA_POSTGRES_URL          # Alias de la URL pooled
PORRA_POSTGRES_URL_NON_POOLING  # URL directa (sin pool), para migraciones
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
3. Solicitar al admin las credenciales de la rama `dev` de Neon
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

- **Prisma v7**: el cliente requiere un adapter explícito. Se usa `PrismaNeon` de `@prisma/adapter-neon`. La URL se pasa en el constructor, no desde env vars automáticamente.
- **Middleware**: Next.js 16 renombró `middleware.ts` → `proxy.ts`. El auth split config usa `src/lib/auth.config.ts` (sin Prisma, para Edge) y `src/lib/auth.ts` (con PrismaAdapter, para servidor).
- **Variables de BD**: el prefijo `PORRA_` viene de la integración Neon en Vercel. En desarrollo, las variables apuntan a la rama Neon `dev` (ver sección 5). **No usar `vercel env pull --environment=production` para desarrollo local.**
- **Cálculo de puntos**: se dispara cuando un admin guarda el resultado de un partido; actualiza en batch `puntosGanados` en todos los `Pronostico` asociados. La lógica vive en `src/lib/scoring.ts`.
- **Ranking**: sumar `puntosGanados` de `Pronostico` + puntos de `PrediccionFutura` por usuario; aplicar desempate en la query.
- **`User.name`**: renombrado de `nombre` por compatibilidad con el PrismaAdapter de NextAuth. En la UI se etiqueta como "Nombre".