// Cliente para API-Football — https://api-football.com
// Free tier: 100 req/día. Caché BD-first (24h) para no desperdiciar cuota.

import { prisma } from "@/lib/prisma";

const BASE_URL = "https://v3.football.api-sports.io";
const LEAGUE_ID = 1;   // FIFA World Cup
const SEASON = 2026;
const BET_ID = 1;      // Match Winner (1X2)
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

// Nombres que API-Football usa diferente a nuestra BD
const AF_TO_DB: Record<string, string> = {
  "Bosnia and Herzegovina": "Bosnia & Herzegovina",
  "Bosnia & Herzegovina": "Bosnia & Herzegovina",
  "DR Congo": "DR Congo",
  "Congo DR": "DR Congo",
  "Republic of Congo": "Congo",
  "South Korea": "South Korea",
  "Korea Republic": "South Korea",
  "United States": "USA",
  "Cape Verde Islands": "Cape Verde",
  "Cape Verde": "Cape Verde",
  "Ivory Coast": "Ivory Coast",
  "Côte d'Ivoire": "Ivory Coast",
  "Cote d'Ivoire": "Ivory Coast",
  "Czech Republic": "Czech Republic",
  "Czechia": "Czech Republic",
};

function normalizeTeamName(name: string): string {
  return AF_TO_DB[name] ?? name;
}

// ── Tipos públicos (misma interfaz que antes) ─────────────────────────────

export interface OddsEvent {
  id: string;
  sport_key: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Bookmaker[];
}

export interface Bookmaker {
  key: string;
  title: string;
  last_update: string;
  markets: Market[];
}

export interface Market {
  key: string; // "h2h"
  outcomes: Outcome[];
}

export interface Outcome {
  name: string;
  price: number;
  point?: number;
}

export interface H2HOdds {
  home: number;
  draw: number;
  away: number;
}

export interface PairOdds {
  first: number;
  draw: number;
  second: number;
}

// ── Caché BD ─────────────────────────────────────────────────────────────

async function getCachedOdds(key: string): Promise<OddsEvent[]> {
  try {
    const row = await prisma.oddsCache.findUnique({ where: { key } });
    return row ? (row.data as unknown as OddsEvent[]) : [];
  } catch {
    return [];
  }
}

async function setCachedOdds(key: string, data: OddsEvent[]): Promise<void> {
  try {
    await prisma.oddsCache.upsert({
      where: { key },
      create: { key, data: data as object[] },
      update: { data: data as object[] },
    });
  } catch {
    // Non-critical — ignore write errors
  }
}

async function isCacheFresh(key: string): Promise<boolean> {
  try {
    const row = await prisma.oddsCache.findUnique({ where: { key } });
    if (!row) return false;
    return Date.now() - row.updatedAt.getTime() < CACHE_TTL_MS;
  } catch {
    return false;
  }
}

// ── Tipos internos API-Football ───────────────────────────────────────────

interface AFValue {
  value: string; // "Home" | "Draw" | "Away"
  odd: string;   // decimal como string, ej: "2.35"
}

interface AFBet {
  id: number;
  name: string;
  values: AFValue[];
}

interface AFBookmaker {
  id: number;
  name: string;
  bets: AFBet[];
}

interface AFOddsEntry {
  update: string;
  fixture: { id: number };
  teams: {
    home: { id: number; name: string };
    away: { id: number; name: string };
  };
  bookmakers: AFBookmaker[];
}

interface AFResponse {
  response: AFOddsEntry[];
}

// ── Fetch + conversión ────────────────────────────────────────────────────

async function fetchFromApiFootball(): Promise<OddsEvent[]> {
  const apiKey = process.env.APIFOOTBALL_API_KEY;
  if (!apiKey) return [];

  const url = new URL(`${BASE_URL}/odds`);
  url.searchParams.set("league", String(LEAGUE_ID));
  url.searchParams.set("season", String(SEASON));
  url.searchParams.set("bet", String(BET_ID));

  const res = await fetch(url.toString(), {
    headers: { "x-apisports-key": apiKey },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`API-Football error: ${res.status} ${await res.text()}`);
  }

  const json = (await res.json()) as AFResponse;

  return (json.response ?? []).map((entry): OddsEvent => {
    const homeTeam = normalizeTeamName(entry.teams.home.name);
    const awayTeam = normalizeTeamName(entry.teams.away.name);

    const bookmakers: Bookmaker[] = entry.bookmakers.map((bk) => {
      const matchWinner = bk.bets.find((b) => b.id === BET_ID);
      const outcomes: Outcome[] = (matchWinner?.values ?? []).map((v) => ({
        // Traducir "Home"/"Draw"/"Away" a los nombres reales para que avgH2HOdds funcione
        name: v.value === "Home" ? homeTeam : v.value === "Away" ? awayTeam : "Draw",
        price: parseFloat(v.odd),
      }));

      return {
        key: String(bk.id),
        title: bk.name,
        last_update: entry.update,
        markets: [{ key: "h2h", outcomes }],
      };
    });

    return {
      id: String(entry.fixture.id),
      sport_key: "soccer_fifa_world_cup",
      commence_time: entry.update,
      home_team: homeTeam,
      away_team: awayTeam,
      bookmakers,
    };
  });
}

// ── API pública ───────────────────────────────────────────────────────────

/**
 * Cuotas H2H del Mundial. Caché BD-first (24h): sólo llama a la API
 * si el caché está vacío o ha caducado.
 */
export async function getMundialOdds(): Promise<OddsEvent[]> {
  const CACHE_KEY = "mundial_h2h";

  if (await isCacheFresh(CACHE_KEY)) {
    return getCachedOdds(CACHE_KEY);
  }

  if (!process.env.APIFOOTBALL_API_KEY) {
    return getCachedOdds(CACHE_KEY);
  }

  try {
    const data = await fetchFromApiFootball();
    await setCachedOdds(CACHE_KEY, data);
    return data;
  } catch (err) {
    console.error("API-Football fetch failed:", err);
    return getCachedOdds(CACHE_KEY);
  }
}

// ── Helpers de lookup (sin cambios) ──────────────────────────────────────

export function avgH2HOdds(event: OddsEvent): H2HOdds | null {
  const h2hMarkets = event.bookmakers
    .map((b) => b.markets.find((m) => m.key === "h2h"))
    .filter((m): m is Market => m !== undefined);

  if (h2hMarkets.length === 0) return null;

  const home = avg(
    h2hMarkets.map((m) => m.outcomes.find((o) => o.name === event.home_team)?.price)
  );
  const away = avg(
    h2hMarkets.map((m) => m.outcomes.find((o) => o.name === event.away_team)?.price)
  );
  const draw = avg(
    h2hMarkets.map((m) => m.outcomes.find((o) => o.name === "Draw")?.price)
  );

  if (home == null || draw == null || away == null) return null;
  return { home, draw, away };
}

function avg(values: (number | undefined)[]): number | null {
  const nums = values.filter((v): v is number => typeof v === "number" && !isNaN(v));
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function buildOddsMap(events: OddsEvent[]): Map<string, H2HOdds> {
  const map = new Map<string, H2HOdds>();
  for (const ev of events) {
    const odds = avgH2HOdds(ev);
    if (odds) map.set(`${ev.home_team}|${ev.away_team}`, odds);
  }
  return map;
}

export function buildPairOddsLookup(events: OddsEvent[]): Record<string, PairOdds> {
  const r: Record<string, PairOdds> = {};
  for (const ev of events) {
    const odds = avgH2HOdds(ev);
    if (!odds) continue;
    r[`${ev.home_team}|${ev.away_team}`] = { first: odds.home, draw: odds.draw, second: odds.away };
    r[`${ev.away_team}|${ev.home_team}`] = { first: odds.away, draw: odds.draw, second: odds.home };
  }
  return r;
}
