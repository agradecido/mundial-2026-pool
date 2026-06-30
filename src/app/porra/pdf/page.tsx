import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  bracketCompletion,
  scoreBracket,
  computeActualBracket,
} from "@/lib/bracket-scoring";
import {
  D32_MATCHES,
  D16_MATCHES,
  QF_MATCHES,
  SF_MATCHES,
  FINAL_MATCH,
  type BracketPicks,
} from "@/lib/bracket";
import { getFlag } from "@/lib/flags";
import PrintTrigger from "./print-trigger";

// ── helpers ──────────────────────────────────────────────────────────────────

function winner(matchId: string, picks: BracketPicks): string | null {
  return picks.resultados?.[matchId] ?? null;
}

const ROUND_LABEL: Record<string, string> = {
  D32: "Dieciseisavos",
  D16: "Octavos",
  QF: "Cuartos",
  SF: "Semifinales",
};

// ── sub-components (server) ──────────────────────────────────────────────────

function TeamChip({ name, highlight = false }: { name: string | null; highlight?: boolean }) {
  if (!name) return <span className="text-gray-400 italic text-[11px]">?</span>;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[12px] font-medium ${
        highlight ? "text-yellow-300" : "text-gray-100"
      }`}
    >
      <span className="text-[13px] leading-none">{getFlag(name)}</span>
      {name}
    </span>
  );
}

function GruposTable({
  gruposLetters,
  picks,
}: {
  gruposLetters: string[];
  picks: BracketPicks;
}) {
  // Split into 3 columns of 4
  const cols = [
    gruposLetters.slice(0, 4),
    gruposLetters.slice(4, 8),
    gruposLetters.slice(8, 12),
  ];

  return (
    <div className="grid grid-cols-3 gap-x-4 gap-y-0">
      {cols.map((colGroups, ci) => (
        <table key={ci} className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              <th className="py-0.5 pr-1.5 text-left text-[10px] text-gray-500 font-medium w-5">Grp</th>
              <th className="py-0.5 pr-1 text-left text-[10px] text-gray-500 font-medium">1°</th>
              <th className="py-0.5 text-left text-[10px] text-gray-500 font-medium">2°</th>
            </tr>
          </thead>
          <tbody>
            {colGroups.map((letra) => {
              const p1 = picks.grupos?.[letra]?.[0] ?? null;
              const p2 = picks.grupos?.[letra]?.[1] ?? null;
              return (
                <tr key={letra} className="border-b border-white/[0.04]">
                  <td className="py-0.5 pr-1.5 font-bold text-[#00e87a] text-[10px]">{letra}</td>
                  <td className="py-0.5 pr-1"><TeamChip name={p1} /></td>
                  <td className="py-0.5"><TeamChip name={p2} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ))}
    </div>
  );
}

function TercerosRow({ picks }: { picks: BracketPicks }) {
  const terceros = picks.terceros ?? [];
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {terceros.map((team, i) => (
        <span key={team} className="inline-flex items-center gap-1 text-[12px]">
          <span className="text-[10px] text-gray-500 tabular-nums">{i + 1}°</span>
          <span className="text-[13px]">{getFlag(team)}</span>
          <span className="text-gray-200">{team}</span>
        </span>
      ))}
      {terceros.length === 0 && <span className="text-gray-600 italic text-[11px]">Sin seleccionar</span>}
    </div>
  );
}

function EliminatoriaRound({
  label,
  winners,
  cols,
}: {
  label: string;
  winners: (string | null)[];
  cols: number;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">{label}</p>
      <div className={`grid gap-x-3 gap-y-0.5`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {winners.map((team, i) => (
          <div key={i} className="flex items-center gap-1 bg-white/[0.03] rounded px-1.5 py-0.5">
            <TeamChip name={team} />
          </div>
        ))}
      </div>
    </div>
  );
}

interface BracketData {
  userId: string;
  userName: string;
  picks: BracketPicks;
  score: { total: number };
  rankPosition: number;
  totalParticipants: number;
  grupos: Record<string, string[]>;
  gruposLetters: string[];
}

function PorraPage({
  userName,
  picks,
  score,
  rankPosition,
  totalParticipants,
  grupos,
  gruposLetters,
}: BracketData) {
  const d32Winners = D32_MATCHES.map((m) => winner(m.id, picks));
  const d16Winners = D16_MATCHES.map((m) => winner(m.id, picks));
  const qfWinners = QF_MATCHES.map((m) => winner(m.id, picks));
  const sfWinners = SF_MATCHES.map((m) => winner(m.id, picks));
  const champion = winner(FINAL_MATCH.id, picks);

  return (
    <div className="print-page bg-[#0f0f0f] rounded-xl border border-white/10 p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-3 border-b border-white/10">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#00e87a] mb-0.5">
            PORRA DEL MUNDIAL 2026
          </p>
          <h2 className="text-xl font-bold text-white">Porra de {userName}</h2>
          <p className="text-[11px] text-gray-500 mt-0.5">porramundial.mdv.red</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-bold text-[#00e87a]">{score.total}</p>
          <p className="text-[11px] text-gray-500">pts</p>
          {rankPosition > 0 && (
            <p className="text-[11px] text-gray-500 mt-0.5">{rankPosition}° / {totalParticipants}</p>
          )}
        </div>
      </div>

      {/* Clasificados de grupos */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
          Clasificados de Grupos
        </p>
        <GruposTable gruposLetters={gruposLetters} picks={picks} />
      </div>

      {/* Mejores terceros */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
          Mejores 8 Terceros
        </p>
        <TercerosRow picks={picks} />
      </div>

      {/* Eliminatorias */}
      <div className="space-y-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
          Eliminatorias — Ganadores por ronda
        </p>
        <EliminatoriaRound label={ROUND_LABEL["D32"]} winners={d32Winners} cols={4} />
        <EliminatoriaRound label={ROUND_LABEL["D16"]} winners={d16Winners} cols={4} />
        <EliminatoriaRound label={ROUND_LABEL["QF"]} winners={qfWinners} cols={4} />
        <EliminatoriaRound label={ROUND_LABEL["SF"]} winners={sfWinners} cols={2} />
        {/* Champion */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-yellow-500/70 mb-1">
            🏆 Campeón
          </p>
          <div className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/20 rounded-lg px-3 py-1.5">
            <TeamChip name={champion} highlight />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────

export default async function PorrasPdfPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [partidos, allBrackets] = await Promise.all([
    prisma.partido.findMany({
      select: {
        equipoLocal: true,
        equipoVisitante: true,
        golesLocalReal: true,
        golesVisitanteReal: true,
        ganadorPenales: true,
        estado: true,
        fase: true,
        grupo: true,
      },
    }),
    prisma.pronosticoBracket.findMany({
      include: { user: { select: { id: true, name: true } } },
    }),
  ]);

  // Build grupos map from group-stage fixtures
  const gruposMap: Record<string, Set<string>> = {};
  for (const p of partidos.filter((p) => p.fase === "GRUPOS")) {
    const g = p.grupo ?? "?";
    gruposMap[g] ??= new Set();
    gruposMap[g].add(p.equipoLocal);
    gruposMap[g].add(p.equipoVisitante);
  }
  const grupos = Object.fromEntries(
    Object.entries(gruposMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k, [...v].sort()])
  );
  const gruposLetters = Object.keys(grupos).sort();

  const actual = computeActualBracket(partidos);

  // Filter completed brackets and compute scores
  const scored = allBrackets
    .map((b) => {
      const picks = b.picks as BracketPicks;
      const completion = bracketCompletion(picks, gruposLetters);
      const score = scoreBracket(picks, actual);
      return {
        userId: b.user.id,
        userName: b.user.name ?? "Sin nombre",
        picks,
        score,
        completion,
      };
    })
    .filter((b) => b.completion.done === 7)
    .sort((a, b) => b.score.total - a.score.total);

  const totalParticipants = scored.length;

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            body * { visibility: hidden; }
            #porras-print, #porras-print * { visibility: visible; }
            #porras-print {
              position: fixed;
              inset: 0;
              overflow: visible;
            }
            .no-print { display: none !important; }
            .print-page {
              page-break-after: always;
              break-after: page;
              border-radius: 0 !important;
              border: none !important;
              padding: 1.2cm !important;
              margin: 0 !important;
            }
            .print-page:last-child {
              page-break-after: avoid;
              break-after: avoid;
            }
            @page {
              size: A4;
              margin: 0;
            }
          }
          @media screen {
            .print-page {
              max-width: 800px;
              margin-left: auto;
              margin-right: auto;
            }
          }
        `
      }} />

      <div id="porras-print" className="space-y-6">
        <PrintTrigger count={totalParticipants} />

        {totalParticipants === 0 && (
          <div className="glass-card p-12 text-center">
            <p className="text-gray-400">No hay porras completadas todavía.</p>
          </div>
        )}

        {scored.map(({ userId, userName, picks, score }, idx) => (
          <PorraPage
            key={userId}
            userId={userId}
            userName={userName}
            picks={picks}
            score={score}
            rankPosition={idx + 1}
            totalParticipants={totalParticipants}
            grupos={grupos}
            gruposLetters={gruposLetters}
          />
        ))}
      </div>
    </>
  );
}
