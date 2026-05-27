import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Image from "next/image";

const MEDALS = ["🥇", "🥈", "🥉"];

const PODIUM = [
  {
    ring: "ring-yellow-400/40",
    border: "border-yellow-400/20",
    text: "text-yellow-400",
    bg: "bg-yellow-400/10",
  },
  {
    ring: "ring-gray-300/40",
    border: "border-gray-300/15",
    text: "text-gray-300",
    bg: "bg-gray-300/10",
  },
  {
    ring: "ring-orange-500/40",
    border: "border-orange-500/20",
    text: "text-orange-400",
    bg: "bg-orange-500/10",
  },
];

export default async function RankingPage() {
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
      return { ...u, total, exactos, tendencias };
    })
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      if (b.exactos !== a.exactos) return b.exactos - a.exactos;
      if (b.tendencias !== a.tendencias) return b.tendencias - a.tendencias;
      return a.fechaRegistro.getTime() - b.fechaRegistro.getTime();
    });

  const top3 = ranking.slice(0, 3);
  const rest = ranking.slice(3);

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Ranking</h1>
        <p className="mt-1 text-sm text-gray-500">Clasificación en tiempo real</p>
      </div>

      {ranking.length === 0 && (
        <div className="glass-card p-16 text-center text-gray-600">
          Aún no hay puntuaciones disponibles
        </div>
      )}

      {/* ── Podio top 3 ── */}
      {top3.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          {top3.map((user, i) => {
            const c = PODIUM[i];
            const isMe = user.id === currentUserId;
            return (
              <div
                key={user.id}
                className={`glass-card border ${c.border} p-5 flex flex-col items-center text-center gap-3 ${
                  isMe ? "ring-1 ring-[#00e87a]/25" : ""
                }`}
              >
                <span className="text-4xl leading-none">{MEDALS[i]}</span>

                {user.image ? (
                  <Image
                    src={user.image}
                    alt=""
                    width={60}
                    height={60}
                    className={`rounded-full ring-2 ${c.ring}`}
                  />
                ) : (
                  <div
                    className={`w-[60px] h-[60px] rounded-full ${c.bg} ring-2 ${c.ring} flex items-center justify-center text-xl font-bold ${c.text}`}
                  >
                    {user.name?.[0] ?? "?"}
                  </div>
                )}

                <div>
                  <p className="text-sm font-semibold text-white leading-snug">
                    {user.name ?? "—"}
                    {isMe && (
                      <span className="ml-1.5 text-[10px] font-medium text-[#00e87a]">tú</span>
                    )}
                  </p>
                  <p className={`text-3xl font-bold mt-1.5 tabular-nums ${c.text}`}>
                    {user.total}
                  </p>
                  <p className="text-xs text-gray-600 -mt-0.5">puntos</p>
                </div>

                <div className="flex gap-4 text-xs text-gray-500 border-t border-white/[0.07] pt-3 w-full justify-center">
                  <span>⭐ {user.exactos} exactos</span>
                  <span>✓ {user.tendencias} tend.</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Resto del ranking ── */}
      {rest.length > 0 && (
        <div className="glass-card overflow-hidden !p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.07]">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 w-10">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Jugador
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Pts
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600 hidden sm:table-cell">
                  Exactos
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600 hidden sm:table-cell">
                  Tend.
                </th>
              </tr>
            </thead>
            <tbody>
              {rest.map((user, i) => {
                const isMe = user.id === currentUserId;
                return (
                  <tr
                    key={user.id}
                    className={`border-b border-white/[0.04] last:border-0 transition-colors ${
                      isMe ? "bg-[#00e87a]/[0.04]" : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{i + 4}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {user.image ? (
                          <Image
                            src={user.image}
                            alt=""
                            width={28}
                            height={28}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-gray-400">
                            {user.name?.[0] ?? "?"}
                          </div>
                        )}
                        <span className={`font-medium ${isMe ? "text-[#00e87a]" : "text-gray-200"}`}>
                          {user.name ?? "—"}
                          {isMe && (
                            <span className="ml-1.5 text-[10px] text-gray-500">(tú)</span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-white tabular-nums">
                      {user.total}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 hidden sm:table-cell tabular-nums">
                      {user.exactos}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 hidden sm:table-cell tabular-nums">
                      {user.tendencias}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
