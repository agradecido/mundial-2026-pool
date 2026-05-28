import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import { getFlag } from "@/lib/flags";
import type { BracketPicks } from "@/lib/bracket";
import { computeActualBracket, scoreBracket, bracketCompletion } from "@/lib/bracket-scoring";

const MEDALS = ["🥇", "🥈", "🥉"];
const PODIUM_STYLES = [
  { ring: "ring-yellow-400/40", border: "border-yellow-400/20", text: "text-yellow-400", bg: "bg-yellow-400/10" },
  { ring: "ring-gray-300/40",   border: "border-gray-300/15",   text: "text-gray-300",   bg: "bg-gray-300/10"  },
  { ring: "ring-orange-500/40", border: "border-orange-500/20", text: "text-orange-400", bg: "bg-orange-500/10" },
];

export default async function PorraRankingPage() {
  const session = await auth();
  const currentUserId = session!.user.id;

  const [porraRecords, partidos] = await Promise.all([
    prisma.pronosticoBracket.findMany({
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
      orderBy: { updatedAt: "asc" },
    }),
    prisma.partido.findMany({
      select: {
        equipoLocal: true, equipoVisitante: true,
        golesLocalReal: true, golesVisitanteReal: true,
        fase: true, grupo: true,
      },
    }),
  ]);

  const gruposLetters = [
    ...new Set(partidos.filter(p => p.fase === "GRUPOS").map(p => p.grupo!).filter(Boolean)),
  ].sort();

  const actual = computeActualBracket(partidos);
  const tournamentStarted = Object.keys(actual.resultados).length > 0 || actual.terceros.length > 0;

  const entries = porraRecords
    .map(r => {
      const picks = r.picks as BracketPicks;
      const score = scoreBracket(picks, actual);
      const completion = bracketCompletion(picks, gruposLetters);
      // champion: new format uses resultados["FINAL"], old format had campeon field
      const campeon =
        picks.resultados?.["FINAL"] ??
        (picks as Record<string, unknown>).campeon as string | undefined;
      return { user: r.user, score, completion, campeon };
    })
    .sort((a, b) =>
      b.score.total - a.score.total ||
      b.completion.done - a.completion.done
    );

  const top3 = entries.slice(0, 3);
  const rest  = entries.slice(3);

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Ranking Porra</h1>
          <p className="mt-1 text-sm text-gray-500">
            Clasificación del cuadro eliminatorio
          </p>
          {!tournamentStarted && (
            <p className="mt-2 text-xs text-gray-600">
              Las puntuaciones empezarán cuando comience el torneo.
            </p>
          )}
        </div>
        <Link
          href="/llaves"
          className="shrink-0 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-gray-400 hover:border-white/20 hover:text-white transition-colors"
        >
          Mi porra →
        </Link>
      </div>

      {/* Scoring legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-600">
        {[
          ["16avos",   "1 pt"],
          ["Octavos",  "2 pts"],
          ["Cuartos",  "5 pts"],
          ["Semis",    "7 pts"],
          ["Final",   "10 pts"],
          ["Campeón", "10 pts"],
        ].map(([label, pts]) => (
          <span key={label}>{label} <span className="text-gray-700">{pts}</span></span>
        ))}
      </div>

      {entries.length === 0 ? (
        <div className="glass-card p-16 text-center space-y-4">
          <p className="text-gray-600 text-sm">Nadie ha rellenado la porra todavía</p>
          <Link href="/llaves" className="inline-block text-sm text-[#00e87a] hover:underline">
            Rellenar mi porra →
          </Link>
        </div>
      ) : (
        <>
          {/* Podium */}
          {top3.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-3">
              {top3.map((entry, i) => {
                const c    = PODIUM_STYLES[i];
                const isMe = entry.user.id === currentUserId;
                return (
                  <div
                    key={entry.user.id}
                    className={`glass-card border ${c.border} p-5 flex flex-col items-center text-center gap-3
                      ${isMe ? "ring-1 ring-[#00e87a]/25" : ""}`}
                  >
                    <span className="text-4xl leading-none">{MEDALS[i]}</span>

                    {entry.user.image ? (
                      <Image
                        src={entry.user.image}
                        alt=""
                        width={60}
                        height={60}
                        className={`rounded-full ring-2 ${c.ring}`}
                      />
                    ) : (
                      <div className={`w-[60px] h-[60px] rounded-full ${c.bg} ring-2 ${c.ring} flex items-center justify-center text-xl font-bold ${c.text}`}>
                        {entry.user.name?.[0] ?? "?"}
                      </div>
                    )}

                    <div>
                      <p className="text-sm font-semibold text-white leading-snug">
                        {entry.user.name ?? "—"}
                        {isMe && <span className="ml-1.5 text-[10px] font-medium text-[#00e87a]">tú</span>}
                      </p>
                      <p className={`text-3xl font-bold mt-1.5 tabular-nums ${c.text}`}>
                        {entry.score.total}
                      </p>
                      <p className="text-xs text-gray-600 -mt-0.5">puntos</p>
                    </div>

                    {/* Champion pick */}
                    {entry.campeon ? (
                      <div className="flex items-center gap-1.5 border-t border-white/[0.07] pt-3 w-full justify-center text-xs text-gray-400">
                        <span className="text-base">{getFlag(entry.campeon)}</span>
                        <span className="truncate">{entry.campeon}</span>
                      </div>
                    ) : (
                      <div className="border-t border-white/[0.07] pt-3 w-full text-center text-xs text-gray-700">
                        Sin campeón
                      </div>
                    )}

                    <p className="text-[10px] text-gray-700">
                      {entry.completion.done}/{entry.completion.total} fases
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Rest of ranking */}
          {rest.length > 0 && (
            <div className="glass-card overflow-hidden !p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.07]">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 w-10">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Jugador</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 hidden sm:table-cell">Campeón</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600 hidden sm:table-cell">Fases</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {rest.map((entry, i) => {
                    const pos  = i + 4;
                    const isMe = entry.user.id === currentUserId;
                    return (
                      <tr
                        key={entry.user.id}
                        className={`border-b border-white/[0.04] last:border-0 transition-colors
                          ${isMe ? "bg-[#00e87a]/[0.04]" : "hover:bg-white/[0.02]"}`}
                      >
                        <td className="px-4 py-3 text-gray-600 font-mono text-xs">{pos}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            {entry.user.image ? (
                              <Image src={entry.user.image} alt="" width={28} height={28} className="rounded-full shrink-0" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-gray-400 shrink-0">
                                {entry.user.name?.[0] ?? "?"}
                              </div>
                            )}
                            <span className={`font-medium truncate ${isMe ? "text-[#00e87a]" : "text-gray-200"}`}>
                              {entry.user.name ?? "—"}
                              {isMe && <span className="ml-1.5 text-[10px] text-gray-500">(tú)</span>}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          {entry.campeon ? (
                            <span className="flex items-center gap-1.5 text-xs text-gray-400">
                              <span>{getFlag(entry.campeon)}</span>
                              <span className="truncate max-w-[120px]">{entry.campeon}</span>
                            </span>
                          ) : (
                            <span className="text-xs text-gray-700">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500 text-xs hidden sm:table-cell tabular-nums">
                          {entry.completion.done}/{entry.completion.total}
                        </td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums text-white">
                          {entry.score.total}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
