# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Plataforma web para gestionar una quiniela de amigos para el Mundial de Fútbol 2026. El torneo tiene **48 selecciones y 104 partidos**, incluyendo la nueva ronda de dieciseisavos. Toda la UI y los nombres de columnas/tablas están en español.

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js (App Router) + TypeScript |
| Estilos | Tailwind CSS |
| ORM | Prisma |
| Base de datos | PostgreSQL — Vercel Postgres (Neon) |
| Auth | NextAuth.js v5 (Auth.js) con Google OAuth |
| Deploy | Vercel |

## Comandos

```bash
npm run dev                            # servidor de desarrollo
npm run build                          # build de producción
npm run lint                           # ESLint
npx prisma migrate dev --name <name>   # crear y aplicar migración
npx prisma generate                    # regenerar cliente tras cambios en schema
npx prisma studio                      # explorador visual de BD
npx auth secret                        # generar AUTH_SECRET para .env
```

## Variables de entorno (.env)

```
DATABASE_URL      # Vercel > Storage > tu DB > .env.local
DIRECT_URL        # ídem (conexión directa para migraciones)
AUTH_SECRET       # generado con: npx auth secret
AUTH_URL          # http://localhost:3000 en dev, URL pública en prod
AUTH_GOOGLE_ID    # Google Cloud Console > Credenciales
AUTH_GOOGLE_SECRET
```

## Reglas de negocio (críticas)

### Resultado oficial
Goles al final de los 90 min + prórroga. **Los penales de desempate NO cuentan.**

### Sistema de puntuación — no acumulable por partido

| # | Condición | Fase de grupos | Fase eliminatoria |
|---|-----------|---------------|-------------------|
| 1 | Marcador exacto (ambos goles correctos) | 5 pts | 10 pts |
| 2 | Tendencia correcta (ganador/empate), no el marcador | 3 pts | 6 pts |
| 3 | Consolación: tendencia mal, pero los goles de **un** equipo exactos | 1 pt | 2 pts |
| 4 | Fallo total | 0 pts | 0 pts |

El multiplicador x2 aplica desde **Dieciseisavos** en adelante (derivado del campo `fase` del partido).

### Predicciones especiales (bloqueadas el Día 1 del torneo)

| Predicción | Puntos |
|-----------|--------|
| Campeón del Mundo | 20 |
| Subcampeón | 15 |
| Bota de Oro (máximo goleador) | 15 |

### Bloqueo de pronósticos
Ningún usuario puede crear ni modificar un pronóstico si faltan **menos de 15 minutos** para el kickoff. Esta validación es obligatoria en el **backend** (server action o API route); el frontend solo la usa como UX.

### Desempate en el ranking
1. Mayor número de marcadores exactos acertados
2. Mayor número de tendencias acertadas
3. Fecha de registro más antigua

## Modelo de datos (Prisma)

Ver `prisma/schema.prisma`. Modelos principales:

- **User** — id, nombre, email, role (`ADMIN` | `JUGADOR`), fechaRegistro. También contiene las tablas de NextAuth (Account, Session, VerificationToken).
- **Partido** — id, equipoLocal, equipoVisitante, fechaPartido, fase (`GRUPOS` | `DIECISEISAVOS` | `OCTAVOS` | `CUARTOS` | `SEMIFINAL` | `TERCER_PUESTO` | `FINAL`), golesLocalReal, golesVisitanteReal, estado (`PROGRAMADO` | `EN_PROGRESO` | `FINALIZADO`).
- **Pronostico** — userId + partidoId (unique), golesLocal, golesVisitante, puntosGanados. Se calculan en batch cuando el admin ingresa el resultado real.
- **PrediccionFutura** — un registro por usuario; campeonPronostico, subcampeonPronostico, botaOroPronostico y sus puntos.

## Notas de implementación

- El cálculo de puntos se dispara cuando un admin guarda el resultado de un partido y actualiza en batch los `puntosGanados` de todos los pronósticos asociados.
- Para el ranking, sumar `puntosGanados` de `Pronostico` + puntos de `PrediccionFutura` por usuario; aplicar el desempate en la query.
- La lógica de puntuación vive en `src/lib/scoring.ts` (a crear) para poder testearla de forma aislada.
