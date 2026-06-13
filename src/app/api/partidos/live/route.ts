import { NextRequest, NextResponse } from "next/server";

const BASE_URL = "https://api.football-data.org/v4";

// Mirror of FD_TO_DB from football-data.ts (server-only import would pull process.env into edge)
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
function norm(name: string) { return FD_TO_DB[name] ?? name; }

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const team1 = searchParams.get("team1");
  const team2 = searchParams.get("team2");
  if (!team1 || !team2) {
    return NextResponse.json({ error: "Missing team params" }, { status: 400 });
  }

  const apiKey = process.env.FOOTBALL_DATA_API_TOKEN;
  if (!apiKey) {
    return NextResponse.json({ error: "API no configurada" }, { status: 503 });
  }

  // Fetch matches for a 3-day window so late matches spanning midnight are covered
  const now = new Date();
  const dateFrom = new Date(now.getTime() - 86_400_000).toISOString().split("T")[0];
  const dateTo = new Date(now.getTime() + 86_400_000).toISOString().split("T")[0];

  const listRes = await fetch(
    `${BASE_URL}/competitions/WC/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`,
    { headers: { "X-Auth-Token": apiKey }, next: { revalidate: 30 } },
  );

  if (!listRes.ok) {
    return NextResponse.json({ error: `FD API error ${listRes.status}` }, { status: 502 });
  }

  const listData = await listRes.json() as { matches: Array<{ id: number; homeTeam: { id: number; name: string }; awayTeam: { id: number; name: string } }> };
  const matches = listData.matches ?? [];

  const match = matches.find((m) => {
    const home = norm(m.homeTeam.name);
    const away = norm(m.awayTeam.name);
    return (home === team1 && away === team2) || (home === team2 && away === team1);
  });

  if (!match) {
    return NextResponse.json({ error: "Partido no encontrado en la API" }, { status: 404 });
  }

  // Individual match endpoint returns goals, bookings, minute
  const matchRes = await fetch(
    `${BASE_URL}/matches/${match.id}`,
    { headers: { "X-Auth-Token": apiKey }, next: { revalidate: 30 } },
  );

  if (!matchRes.ok) {
    return NextResponse.json({ error: `FD match error ${matchRes.status}` }, { status: 502 });
  }

  return NextResponse.json(await matchRes.json());
}
