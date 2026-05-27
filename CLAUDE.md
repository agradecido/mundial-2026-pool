# CLAUDE.md — Único Punto de Verdad (Single Source of Truth)

Este archivo proporciona la guía definitiva de arquitectura, reglas de negocio y comandos para cualquier agente de IA (Claude Code, GitHub Copilot, etc.) que trabaje en este repositorio. **Confía en estas instrucciones y no busques en otros archivos a menos que encuentres un error.**

## 1. Contexto del Proyecto
Plataforma web fullstack para gestionar una quiniela (porra/prode) de amigos para el Mundial de Fútbol 2026. El torneo cuenta con **48 selecciones y 104 partidos**, incluyendo la nueva ronda de dieciseisavos de final. Toda la interfaz de usuario (UI) y los nombres de las entidades en la base de datos están en español.

## 2. Stack Tecnológico & Arquitectura
* **Framework:** Next.js (App Router) + TypeScript (Strict Mode).
* **Estilos:** Tailwind CSS.
* **ORM:** Prisma.
* **Base de Datos:** PostgreSQL — Vercel Postgres (Neon).
* **Autenticación:** NextAuth.js v5 (Auth.js) con Google OAuth.
* **Despliegue:** Vercel.

### Estructura de Carpetas Clave
* `src/app/`: Rutas de la aplicación, páginas y Server Actions.
* `src/lib/scoring.ts`: **ARCHIVO CRÍTICO.** Contiene la lógica aislada y testeable de cálculo de puntos. Cualquier cambio en las puntuaciones debe hacerse exclusivamente aquí.
* `prisma/schema.prisma`: Definición del esquema de datos.

---

## 3. Reglas de Negocio Críticas (Strict Business Rules)

### 3.1. Definición de Resultado Oficial
* El resultado válido es el marcador al finalizar el tiempo oficial de juego: **90 minutos reglamentarios + 30 minutos de prórroga** (si se disputa).
* **Exclusión:** Las tandas de penales de desempate final **NO** cuentan para el marcador de la quiniela.

### 3.2. Sistema de Puntuación Jerárquico (No Acumulable por Partido)
El usuario recibe únicamente el puntaje más alto que le corresponda por partido. El multiplicador $x2$ se aplica automáticamente desde la fase de **Dieciseisavos** en adelante basándose en el campo `fase`.

| # | Condición / Criterio | Fase de Grupos | Fase Eliminatoria ($x2$) |
|---|----------------------|:--------------:|:------------------------:|
| 1 | **Marcador exacto** (goles de ambos equipos correctos) | **5 pts** | **10 pts** |
| 2 | **Tendencia correcta** (ganador o empate acertado) | **3 pts** | **6 pts** |
| 3 | **Consolación:** tendencia errónea, pero goles de un equipo exactos | **1 pt** | **2 pts** |
| 4 | **Fallo total** | **0 pts** | **0 pts** |

### 3.3. Bloqueo de Seguridad Obligatorio (Hard Deadline)
* El sistema debe impedir la creación, modificación o eliminación de un pronóstico si faltan **menos de 15 minutos** para el comienzo del partido (`fechaPartido`).
* **Seguridad:** Esta validación **debe ejecutarse obligatoriamente en el Backend** (Server Actions o API Routes). El bloqueo en el Frontend es meramente para experiencia de usuario (UX).

### 3.4. Predicciones Especiales y Desempates
* Las predicciones a largo plazo se bloquean el Día 1 del torneo: Campeón (20 pts), Subcampeón (15 pts), Bota de Oro (15 pts).
* **Desempate en el Ranking:** (1) Más marcadores exactos acertados -> (2) Más tendencias acertadas -> (3) Fecha de registro más antigua.

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