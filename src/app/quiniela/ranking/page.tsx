import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import RankingView from "@/components/ranking-view";

export default async function QuinielaRankingPage() {
    const session = await auth();
    const currentUserId = session!.user.id;

    const users = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            image: true,
            fechaRegistro: true,
            pronosticos: {
                select: { puntosGanados: true },
            },
            prediccionFutura: {
                select: { puntosCampeon: true, puntosSubcampeon: true, puntosBota: true },
            },
        },
    });

    const ranking = users
        .map((u) => {
            const puntosPartidos = u.pronosticos.reduce((s, p) => s + p.puntosGanados, 0);
            const pf = u.prediccionFutura;
            const puntosEspeciales = pf
                ? pf.puntosCampeon + pf.puntosSubcampeon + pf.puntosBota
                : 0;
            const total = puntosPartidos + puntosEspeciales;
            const exactos = u.pronosticos.filter(
                (p) => p.puntosGanados === 5 || p.puntosGanados === 10
            ).length;
            const tendencias = u.pronosticos.filter(
                (p) => p.puntosGanados === 3 || p.puntosGanados === 6
            ).length;
            return { id: u.id, name: u.name, image: u.image, total, exactos, tendencias, fechaRegistro: u.fechaRegistro };
        })
        .sort((a, b) => {
            if (b.total !== a.total) return b.total - a.total;
            if (b.exactos !== a.exactos) return b.exactos - a.exactos;
            if (b.tendencias !== a.tendencias) return b.tendencias - a.tendencias;
            return a.fechaRegistro.getTime() - b.fechaRegistro.getTime();
        })
        .map(({ fechaRegistro: _, ...u }) => u); // drop non-serializable Date

    return (
        <div className="space-y-10">
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Ranking Quiniela</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Clasificación partido a partido · predicciones especiales incluidas
                </p>
            </div>

            <RankingView ranking={ranking} currentUserId={currentUserId} />
        </div>
    );
}
