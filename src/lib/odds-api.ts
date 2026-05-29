// Cliente para The Odds API — https://the-odds-api.com
// Plan gratuito: 500 requests/mes. Cachea las respuestas con fetch.next.revalidate.

const BASE_URL = "https://api.the-odds-api.com/v4";
const SPORT_KEY = "soccer_fifa_world_cup";
const SPORT_KEY_OUTRIGHTS = "soccer_fifa_world_cup_winner";

export interface OddsEvent {
    id: string;
    sport_key: string;
    commence_time: string; // ISO date
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
    key: string; // "h2h" | "totals" | "spreads" | "outrights"
    outcomes: Outcome[];
}

export interface Outcome {
    name: string;
    price: number; // cuota decimal (ej: 2.50)
    point?: number;
}

export interface H2HOdds {
    home: number;
    draw: number;
    away: number;
}

/**
 * Obtiene las cuotas h2h (1X2) de todos los partidos próximos del Mundial.
 * Cachea 1 hora.
 */
export async function getMundialOdds(): Promise<OddsEvent[]> {
    const apiKey = process.env.ODDS_API_KEY;
    if (!apiKey) return [];

    const url = new URL(`${BASE_URL}/sports/${SPORT_KEY}/odds`);
    url.searchParams.set("apiKey", apiKey);
    url.searchParams.set("regions", "eu");
    url.searchParams.set("markets", "h2h");
    url.searchParams.set("oddsFormat", "decimal");
    url.searchParams.set("dateFormat", "iso");

    try {
        const res = await fetch(url.toString(), {
            next: { revalidate: 3600 }, // 1h
        });
        if (!res.ok) {
            console.error(`Odds API error: ${res.status} ${await res.text()}`);
            return [];
        }
        return (await res.json()) as OddsEvent[];
    } catch (err) {
        console.error("Odds API fetch failed:", err);
        return [];
    }
}

/**
 * Cuotas outright — campeón del Mundial.
 * Cachea 24h.
 */
export async function getCampeonOdds(): Promise<OddsEvent[]> {
    const apiKey = process.env.ODDS_API_KEY;
    if (!apiKey) return [];

    const url = new URL(`${BASE_URL}/sports/${SPORT_KEY_OUTRIGHTS}/odds`);
    url.searchParams.set("apiKey", apiKey);
    url.searchParams.set("regions", "eu");
    url.searchParams.set("markets", "outrights");
    url.searchParams.set("oddsFormat", "decimal");

    try {
        const res = await fetch(url.toString(), {
            next: { revalidate: 86400 }, // 24h
        });
        if (!res.ok) return [];
        return (await res.json()) as OddsEvent[];
    } catch {
        return [];
    }
}

/**
 * Calcula la cuota media h2h (1X2) entre todos los bookmakers de un evento.
 */
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
    const nums = values.filter((v): v is number => typeof v === "number");
    if (nums.length === 0) return null;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/**
 * Construye un mapa "Local|Visitante" → cuotas h2h para lookup rápido.
 * Los nombres de equipos deben coincidir exactamente con los de tu BD.
 */
export function buildOddsMap(events: OddsEvent[]): Map<string, H2HOdds> {
    const map = new Map<string, H2HOdds>();
    for (const ev of events) {
        const odds = avgH2HOdds(ev);
        if (odds) map.set(`${ev.home_team}|${ev.away_team}`, odds);
    }
    return map;
}

/**
 * Cuotas para un emparejamiento sin orden fijo (ej. eliminatorias del bracket).
 * `first` = cuota del primer equipo, `second` = del segundo, `draw` = empate.
 */
export interface PairOdds {
    first: number;
    draw: number;
    second: number;
}

/**
 * Construye un Record serializable (server → client) con ambas orientaciones
 * del par, para que el lookup funcione sin importar cuál se considere local.
 */
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
