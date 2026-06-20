import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { LinkSpinner } from "@/components/nav-button";
import RankingView from "@/components/ranking-view";
import PreTournamentWithModal from "@/components/pre-tournament-with-modal";
import type { PreTournamentEntry } from "@/components/pre-tournament-list";

type TendenciaReciente = "up2" | "up1" | "flat" | "down1" | "down2" | null;

function computeTrend(pts: number[]): TendenciaReciente {
  if (pts.length < 10) return null;
  const recentAvg = pts.slice(0, 5).reduce((s, p) => s + p, 0) / 5;
  const olderAvg = pts.slice(5, 10).reduce((s, p) => s + p, 0) / 5;
  const diff = recentAvg - olderAvg;
  if (diff > 1.5) return "up2";
  if (diff > 0.5) return "up1";
  if (diff < -1.5) return "down2";
  if (diff < -0.5) return "down1";
  return "flat";
}

export default async function QuinielaRankingPage() {
    const session = await auth();
    const currentUserId = session!.user.id;

    const [users, firstPartido, badges] = await Promise.all([
        prisma.user.findMany({
            select: {
                id: true,
                name: true,
                image: true,
                fechaRegistro: true,
                ultimoAcceso: true,
                pronosticos: {
                    select: {
                        puntosGanados: true,
                        partido: { select: { fechaPartido: true, estado: true } },
                    },
                },
                prediccionFutura: {
                    select: { puntosCampeon: true, puntosSubcampeon: true },
                },
            },
        }),
        prisma.partido.findFirst({
            orderBy: { fechaPartido: "asc" },
            select: { fechaPartido: true },
        }),
        prisma.badgeUsuario.findMany({
            select: { userId: true, titulo: true, emoji: true, descripcion: true },
        }),
    ]);

    const tournamentStarted =
        !!firstPartido && firstPartido.fechaPartido.getTime() <= Date.now();

    const ranking = users
        .map((u) => {
            const finished = u.pronosticos.filter((p) => p.partido.estado === "FINALIZADO");
            const puntosPartidos = finished.reduce((s, p) => s + p.puntosGanados, 0);
            const pf = u.prediccionFutura;
            const puntosEspeciales = pf
                ? pf.puntosCampeon + pf.puntosSubcampeon
                : 0;
            const total = puntosPartidos + puntosEspeciales;
            const exactos = finished.filter(
                (p) => p.puntosGanados === 5 || p.puntosGanados === 10
            ).length;
            const tendencias = finished.filter(
                (p) => p.puntosGanados === 3 || p.puntosGanados === 6
            ).length;
            const last10pts = [...finished]
                .sort((a, b) => b.partido.fechaPartido.getTime() - a.partido.fechaPartido.getTime())
                .slice(0, 10)
                .map((p) => p.puntosGanados);
            const tendenciaReciente = computeTrend(last10pts);
            return { id: u.id, name: u.name, image: u.image, total, exactos, tendencias, tendenciaReciente, fechaRegistro: u.fechaRegistro };
        })
        .sort((a, b) => {
            if (b.total !== a.total) return b.total - a.total;
            if (b.exactos !== a.exactos) return b.exactos - a.exactos;
            if (b.tendencias !== a.tendencias) return b.tendencias - a.tendencias;
            return a.fechaRegistro.getTime() - b.fechaRegistro.getTime();
        })
        .map(({ fechaRegistro: _, ...u }) => u); // drop non-serializable Date

    const badgeMap = Object.fromEntries(badges.map((b) => [b.userId, b]));

    const preTournamentEntries: PreTournamentEntry[] = [...users]
        .sort((a, b) => {
            if (b.pronosticos.length !== a.pronosticos.length)
                return b.pronosticos.length - a.pronosticos.length;
            const ta = a.ultimoAcceso?.getTime() ?? 0;
            const tb = b.ultimoAcceso?.getTime() ?? 0;
            return tb - ta;
        })
        .map((u) => ({
            id: u.id,
            name: u.name,
            image: u.image,
            ultimoAcceso: u.ultimoAcceso ? u.ultimoAcceso.toISOString() : null,
            numPronosticos: u.pronosticos.length,
            bracketDone: 0,
        }));

    return (
        <div className="space-y-10">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Ranking Quiniela</h1>
                </div>
                <Link
                    href="/quiniela"
                    className="inline-flex items-center gap-2 rounded-lg border border-[#00e87a]/40 bg-[#00e87a]/15 px-3 py-1.5 text-xs text-[#00e87a] hover:bg-[#00e87a]/25 hover:border-[#00e87a]/60 transition-colors shrink-0"
                >
                    Pronosticar →
                    <LinkSpinner className="size-3 shrink-0" />
                </Link>
            </div>

            {!tournamentStarted ? (
                <PreTournamentWithModal
                    entries={preTournamentEntries}
                    currentUserId={currentUserId}
                    mode="quiniela"
                    subtitle="El ranking se mostrará cuando empiece el Mundial. Participantes ordenados por pronósticos de quiniela completados."
                />
            ) : (
                <RankingView ranking={ranking} currentUserId={currentUserId} badgeMap={badgeMap} />
            )}
        </div>
    );
}
