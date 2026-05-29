import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { BracketPicks } from "@/lib/bracket";
import { D32_MATCHES, D16_MATCHES, QF_MATCHES, SF_MATCHES } from "@/lib/bracket";
import { getFlag } from "@/lib/flags";

type Counts = Map<string, number>;

function inc(map: Counts, key: string | undefined | null) {
    if (!key) return;
    map.set(key, (map.get(key) ?? 0) + 1);
}

function topN(map: Counts, n: number): Array<{ name: string; count: number }> {
    return [...map.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
        .slice(0, n);
}

const ACCENT = {
    green: "bg-[#00e87a]",
    amber: "bg-amber-400",
    purple: "bg-purple-400",
    blue: "bg-sky-400",
    gray: "bg-gray-500",
} as const;

type Accent = keyof typeof ACCENT;

function BarItem({
    name,
    count,
    total,
    accent = "green",
    highlight = false,
}: {
    name: string;
    count: number;
    total: number;
    accent?: Accent;
    highlight?: boolean;
}) {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
        <div
            className={`rounded-lg px-3 py-2 transition-colors ${highlight
                    ? "ring-1 ring-[#00e87a]/40 bg-[#00e87a]/[0.04]"
                    : "bg-white/[0.02]"
                }`}
        >
            <div className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2 min-w-0">
                    <span className="text-base shrink-0">{getFlag(name)}</span>
                    <span className="truncate text-white">{name}</span>
                </span>
                <span className="shrink-0 font-mono text-xs text-gray-400 tabular-nums">
                    {count} · {pct}%
                </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                <div
                    className={`h-full ${ACCENT[accent]} transition-all`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

function Section({
    title,
    subtitle,
    children,
}: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
}) {
    return (
        <section className="space-y-3">
            <div>
                <h2 className="text-lg font-semibold text-white">{title}</h2>
                {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
            </div>
            {children}
        </section>
    );
}

export default async function PorraStatsPage() {
    const session = await auth();
    const userId = session!.user.id;

    // Visibility gate: user must have submitted a bracket to see consensus
    const myBracket = await prisma.pronosticoBracket.findUnique({
        where: { userId },
        select: { picks: true },
    });
    if (!myBracket) redirect("/porra");

    const brackets = await prisma.pronosticoBracket.findMany({
        select: { userId: true, picks: true },
    });

    const total = brackets.length;
    const myPicks = (myBracket.picks ?? {}) as BracketPicks;
    const myResultados = myPicks.resultados ?? {};
    const myGrupos = myPicks.grupos ?? {};
    const myTerceros = new Set(myPicks.terceros ?? []);

    // Aggregations
    const campeonCount: Counts = new Map();
    const finalistCount: Counts = new Map();
    const semiCount: Counts = new Map();
    const cuartoCount: Counts = new Map();
    const octavoCount: Counts = new Map();
    const tercerosCount: Counts = new Map();
    const grupoCounts: Record<string, { first: Counts; second: Counts }> = {};

    const FINAL_IDS = ["FINAL"];
    const SF_IDS = SF_MATCHES.map(m => m.id);
    const QF_IDS = QF_MATCHES.map(m => m.id);
    const D16_IDS = D16_MATCHES.map(m => m.id);
    const D32_IDS = D32_MATCHES.map(m => m.id);

    for (const b of brackets) {
        const p = (b.picks ?? {}) as BracketPicks;
        const res = p.resultados ?? {};

        for (const id of FINAL_IDS) inc(campeonCount, res[id]);
        for (const id of SF_IDS) inc(finalistCount, res[id]);
        for (const id of QF_IDS) inc(semiCount, res[id]);
        for (const id of D16_IDS) inc(cuartoCount, res[id]);
        for (const id of D32_IDS) inc(octavoCount, res[id]);

        for (const t of p.terceros ?? []) inc(tercerosCount, t);

        for (const [letter, teams] of Object.entries(p.grupos ?? {})) {
            grupoCounts[letter] ??= { first: new Map(), second: new Map() };
            if (teams[0]) inc(grupoCounts[letter].first, teams[0]);
            if (teams[1]) inc(grupoCounts[letter].second, teams[1]);
        }
    }

    const myCampeon = myResultados["FINAL"];
    const myFinalistas = new Set(SF_IDS.map(id => myResultados[id]).filter(Boolean));
    const mySemis = new Set(QF_IDS.map(id => myResultados[id]).filter(Boolean));
    const myCuartos = new Set(D16_IDS.map(id => myResultados[id]).filter(Boolean));

    const grupoLetters = Object.keys(grupoCounts).sort();

    return (
        <div className="space-y-10">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Consenso</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Lo que predice el grupo · {total} {total === 1 ? "porra" : "porras"}
                    </p>
                </div>
                <div className="flex gap-2 shrink-0">
                    <Link
                        href="/porra/ranking"
                        className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-gray-400 hover:border-white/20 hover:text-white transition-colors"
                    >
                        ← Ranking
                    </Link>
                    <Link
                        href="/porra"
                        className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-gray-400 hover:border-white/20 hover:text-white transition-colors"
                    >
                        Mi porra →
                    </Link>
                </div>
            </div>

            <div className="glass-card p-6 space-y-10">
                {/* Campeón */}
                <Section title="🏆 Campeón" subtitle="Equipos más elegidos para ganar el Mundial">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {topN(campeonCount, 8).map(e => (
                            <BarItem
                                key={e.name}
                                name={e.name}
                                count={e.count}
                                total={total}
                                accent="amber"
                                highlight={e.name === myCampeon}
                            />
                        ))}
                        {campeonCount.size === 0 && (
                            <p className="text-sm text-gray-600">Sin datos aún.</p>
                        )}
                    </div>
                </Section>

                {/* Finalistas */}
                <Section title="🥈 Finalistas" subtitle="Equipos que la mayoría espera ver en la final">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {topN(finalistCount, 8).map(e => (
                            <BarItem
                                key={e.name}
                                name={e.name}
                                count={e.count}
                                total={total}
                                accent="purple"
                                highlight={myFinalistas.has(e.name)}
                            />
                        ))}
                        {finalistCount.size === 0 && (
                            <p className="text-sm text-gray-600">Sin datos aún.</p>
                        )}
                    </div>
                </Section>

                {/* Semifinalistas */}
                <Section title="Semifinalistas" subtitle="Pasan a semifinales según el consenso">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {topN(semiCount, 8).map(e => (
                            <BarItem
                                key={e.name}
                                name={e.name}
                                count={e.count}
                                total={total}
                                accent="blue"
                                highlight={mySemis.has(e.name)}
                            />
                        ))}
                        {semiCount.size === 0 && (
                            <p className="text-sm text-gray-600">Sin datos aún.</p>
                        )}
                    </div>
                </Section>

                {/* Cuartofinalistas */}
                <Section title="Cuartofinalistas" subtitle="Los 12 equipos más elegidos para llegar a cuartos">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {topN(cuartoCount, 12).map(e => (
                            <BarItem
                                key={e.name}
                                name={e.name}
                                count={e.count}
                                total={total}
                                accent="green"
                                highlight={myCuartos.has(e.name)}
                            />
                        ))}
                        {cuartoCount.size === 0 && (
                            <p className="text-sm text-gray-600">Sin datos aún.</p>
                        )}
                    </div>
                </Section>

                {/* Por grupo */}
                <Section title="Por grupo" subtitle="Quién pasa como 1º y 2º de cada grupo">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {grupoLetters.map(letter => {
                            const { first, second } = grupoCounts[letter];
                            const myFirst = myGrupos[letter]?.[0];
                            const mySecond = myGrupos[letter]?.[1];
                            return (
                                <div key={letter} className="rounded-xl border border-white/5 bg-white/[0.02] p-3 space-y-3">
                                    <h3 className="text-sm font-semibold text-white">Grupo {letter}</h3>
                                    <div className="space-y-2">
                                        <p className="text-[10px] uppercase tracking-wider text-gray-500">1º</p>
                                        <div className="space-y-1.5">
                                            {topN(first, 3).map(e => (
                                                <BarItem
                                                    key={e.name}
                                                    name={e.name}
                                                    count={e.count}
                                                    total={total}
                                                    accent="amber"
                                                    highlight={e.name === myFirst}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[10px] uppercase tracking-wider text-gray-500">2º</p>
                                        <div className="space-y-1.5">
                                            {topN(second, 3).map(e => (
                                                <BarItem
                                                    key={e.name}
                                                    name={e.name}
                                                    count={e.count}
                                                    total={total}
                                                    accent="blue"
                                                    highlight={e.name === mySecond}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {grupoLetters.length === 0 && (
                            <p className="text-sm text-gray-600">Sin datos aún.</p>
                        )}
                    </div>
                </Section>

                {/* Mejores terceros */}
                <Section title="Mejores 3°" subtitle="Los 10 terceros más elegidos para clasificar">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {topN(tercerosCount, 10).map(e => (
                            <BarItem
                                key={e.name}
                                name={e.name}
                                count={e.count}
                                total={total}
                                accent="gray"
                                highlight={myTerceros.has(e.name)}
                            />
                        ))}
                        {tercerosCount.size === 0 && (
                            <p className="text-sm text-gray-600">Sin datos aún.</p>
                        )}
                    </div>
                </Section>

                {/* Octavofinalistas (collapsible-style compact) */}
                <Section title="Dieciseisavos" subtitle="Equipos que más se espera que superen la primera ronda">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {topN(octavoCount, 18).map(e => (
                            <BarItem
                                key={e.name}
                                name={e.name}
                                count={e.count}
                                total={total}
                                accent="gray"
                            />
                        ))}
                        {octavoCount.size === 0 && (
                            <p className="text-sm text-gray-600">Sin datos aún.</p>
                        )}
                    </div>
                </Section>
            </div>
        </div>
    );
}
