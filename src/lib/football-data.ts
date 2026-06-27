// Cliente para Football-Data.org v4 — https://www.football-data.org
// Usado solo desde el panel de admin para importar resultados del Mundial.

const BASE_URL = "https://api.football-data.org/v4";
const COMPETITION = "WC";

// Discrepancias conocidas entre Football-Data.org y nuestros nombres en BD
const FD_TO_DB: Record<string, string> = {
  "Bosnia and Herzegovina": "Bosnia & Herzegovina",
  "Congo DR": "DR Congo",
  "Korea Republic": "South Korea",
  "United States": "USA",
  "Cape Verde Islands": "Cape Verde",
  "Côte d'Ivoire": "Ivory Coast",
  "Cote d'Ivoire": "Ivory Coast",
  "Czechia": "Czech Republic",
};

export type FDStatus =
  | "SCHEDULED"
  | "TIMED"
  | "IN_PLAY"
  | "PAUSED"
  | "FINISHED"
  | "SUSPENDED"
  | "POSTPONED"
  | "CANCELLED";

export type FDDuration = "REGULAR" | "EXTRA_TIME" | "PENALTY_SHOOTOUT";

export interface FDMatch {
  id: number;
  utcDate: string;
  status: FDStatus;
  stage: string;
  group: string | null;
  homeTeam: { id: number; name: string | null; shortName?: string; tla?: string };
  awayTeam: { id: number; name: string | null; shortName?: string; tla?: string };
  score: {
    winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
    duration: FDDuration;
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
  };
}

export function normalizeTeamName(fdName: string): string {
  return FD_TO_DB[fdName] ?? fdName;
}

export async function getFDKnockoutMatches(): Promise<{ matches: FDMatch[]; error?: string }> {
  const result = await getFDMatches();
  if (result.error) return result;
  return { matches: result.matches.filter((m) => m.stage !== "GROUP_STAGE") };
}

export async function getFDMatches(): Promise<{ matches: FDMatch[]; error?: string }> {
  const apiKey = process.env.FOOTBALL_DATA_API_TOKEN;
  if (!apiKey) return { matches: [], error: "FOOTBALL_DATA_API_TOKEN no está configurado" };

  const url = `${BASE_URL}/competitions/${COMPETITION}/matches`;

  try {
    const res = await fetch(url, {
      headers: { "X-Auth-Token": apiKey },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { matches: [], error: `API respondió ${res.status}: ${text.slice(0, 200)}` };
    }

    const data = await res.json();
    return { matches: (data.matches ?? []) as FDMatch[] };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { matches: [], error: msg };
  }
}
