// Cliente para The Odds API — https://the-odds-api.com
// Plan gratuito: 500 req/mes. Caché BD-first (24h) — con 1 req/día son ~30/mes.

import { prisma } from "@/lib/prisma";

const BASE_URL = "https://api.the-odds-api.com/v4";
const SPORT_KEY = "soccer_fifa_world_cup";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

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
    if (!row) return [];
    const data = row.data as unknown as OddsEvent[];
    return Array.isArray(data) && data.length > 0 ? data : [];
  } catch {
    return [];
  }
}

async function setCachedOdds(key: string, data: OddsEvent[]): Promise<void> {
  if (data.length === 0) return; // nunca sobreescribir caché válida con vacío
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
    const data = row.data as unknown as OddsEvent[];
    if (!Array.isArray(data) || data.length === 0) return false; // caché vacía = no válida
    return Date.now() - row.updatedAt.getTime() < CACHE_TTL_MS;
  } catch {
    return false;
  }
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

  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) return getCachedOdds(CACHE_KEY);

  const url = new URL(`${BASE_URL}/sports/${SPORT_KEY}/odds`);
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("regions", "eu");
  url.searchParams.set("markets", "h2h");
  url.searchParams.set("oddsFormat", "decimal");
  url.searchParams.set("dateFormat", "iso");

  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      console.error(`Odds API error: ${res.status} ${await res.text()}`);
      return getCachedOdds(CACHE_KEY);
    }
    const data = (await res.json()) as OddsEvent[];
    await setCachedOdds(CACHE_KEY, data);
    return data;
  } catch (err) {
    console.error("Odds API fetch failed:", err);
    return getCachedOdds(CACHE_KEY);
  }
}

// ── Helpers de lookup ─────────────────────────────────────────────────────

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
