Note: Read AGENTS.md and CLAUDE.md in the root directory to understand the context of this project and the agents involved.

# Copilot Cloud Agent Instructions - Quiniela Mundial 2026

This file provides context, architectural rules, and validation steps for working efficiently in this repository. Trust these instructions explicitly and only perform additional searches if info is missing or an error is found.

## 1. High-Level Project Details
* **Description:** A web platform designed to manage a soccer prediction pool ("quiniela/porra/prode") among friends for the FIFA World Cup 2026. It supports 48 teams and 104 matches.
* **Project Type:** Fullstack Web Application (Monorepo structure).
* **Languages & Target Runtimes:** TypeScript (Strict Mode), Node.js, SQL (PostgreSQL).
* **Frameworks & Core Stack:** Next.js (App Router), Tailwind CSS, Prisma ORM, NextAuth.js v5 (Auth.js) via Google OAuth.
* **Target Environment & Host:** Vercel (Frontend/Serverless) + Vercel Postgres (Neon).

---

## 2. Project Layout & Architecture
* **`src/app/`**: Next.js App Router containing pages, layouts, and API routes/server actions.
* **`src/lib/scoring.ts`**: **CRITICAL FILE.** Contains the isolated core logic for point calculations. Always update or test this file when modifying score behaviors.
* **`prisma/schema.prisma`**: Database schema definition.
* **Root Config Files:** `package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.js`.

### Data Models Summary (Prisma)
* **User:** Accounts, authentication, and user roles (`ADMIN` | `JUGADOR`).
* **Partido:** Match metadata: `equipoLocal`, `equipoVisitante`, `fechaPartido`, `fase` enum, actual goals (`golesLocalReal`, `golesVisitanteReal`), and `estado` (`PROGRAMADO`, `EN_PROGRESO`, `FINALIZADO`).
* **Pronostico:** User predictions per match (Unique composite key: `userId` + `partidoId`).
* **PrediccionFutura:** User-submitted long-term tournament picks (Winner, Runner-up, Top Scorer).

---

## 3. Strict Business Rules & Validations
To prevent PR rejection or continuous integration (CI) failures, any code change **must** strictly comply with these rules:

### 3.1. Official Match Results
* **Rule:** Match results are based on the score at the end of official play, which includes **regular 90 minutes + 30 minutes of extra time/prolongation** (if played).
* **Exclusion:** Penalty shootouts used to break a final draw **NEVER** count toward the match score.

### 3.2. Predictive Hierarchical Scoring (Non-Cumulative per Match)
A user receives only the single highest applicable point tier for a given match:
1. **Exact Score:** 5 pts (Groups) / 10 pts (Knockout).
2. **Correct Tendency (Winner/Draw):** 3 pts (Groups) / 6 pts (Knockout).
3. **Consolation Goal Match:** 1 pt (Groups) / 2 pts (Knockout) — Granted when the overall tendency prediction is wrong, but the exact number of goals scored by *one* of the teams matches the real outcome.
4. **Total Miss:** 0 pts.

*Note: The **`x2` multiplier** applies automatically from the **Dieciseisavos (Round of 32)** phase onwards, derived from the `fase` property of the Match.*

### 3.3. Hard Deadline Security Lockout (Backend Enforcement)
* **Rule:** Users cannot create, update, or delete a prediction if there are **less than 15 minutes** remaining before the scheduled kickoff time (`fechaPartido`).
* **Implementation Requirement:** This validation **must always** be executed on the **Backend** (Server Actions or API endpoints). Frontend state checks are for UI/UX purposes only.

### 3.4. Long-Term Predictions & Tie-Breakers
* Long-term predictions (Champion = 20pts, Runner-up = 15pts, Golden Boot = 15pts) lock on Day 1 of the tournament.
* **Leaderboard Tie-Breakers:** Sorted by (1) Most Exact Scores -> (2) Most Correct Tendencies -> (3) Oldest User Registration Date.

---

## 4. Build, Script Execution, and Validation Steps

Always follow this exact order of operations when setting up the environment or performing validation checks:

### 4.1. Bootstrap and Environment Setup
1. **Always run** `npm install` before attempting any build or script.
2. Ensure local environment variables are set in `.env.local`. Required variables: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`.

### 4.2. Build & Verification Commands
* **Run Local Development Server:**
  ```bash
  npm run dev