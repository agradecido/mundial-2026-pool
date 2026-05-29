import Link from "next/link";

export default function AyudaPage() {
    return (
        <div className="space-y-12 max-w-[700px] mx-auto pb-8">
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Ayuda</h1>
                <p className="mt-1 text-sm text-gray-500">Reglas y sistemas de puntuación</p>
            </div>

            {/* ── Intro ─────────────────────────────────────────────────────── */}
            <div className="glass-card p-5 space-y-3">
                <p className="text-sm text-gray-300 leading-relaxed">
                    Esta plataforma tiene <strong className="text-white">dos competiciones independientes</strong> con
                    sus propios rankings y reglas de puntuación:
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                    <Link
                        href="/porra"
                        className="rounded-lg border border-[#00e87a]/20 bg-[#00e87a]/5 p-3 transition-all hover:border-[#00e87a]/40 hover:bg-[#00e87a]/10 hover:scale-[1.02]"
                    >
                        <h3 className="text-sm font-semibold text-[#00e87a] mb-1">🏆 Porra</h3>
                        <p className="text-xs text-gray-400">
                            Predice el camino al título: rellena el bracket completo antes del inicio del torneo.
                        </p>
                    </Link>
                    <Link
                        href="/quiniela"
                        className="rounded-lg border border-blue-400/20 bg-blue-400/5 p-3 transition-all hover:border-blue-400/40 hover:bg-blue-400/10 hover:scale-[1.02]"
                    >
                        <h3 className="text-sm font-semibold text-blue-300 mb-1">⚽ Quiniela</h3>
                        <p className="text-xs text-gray-400">
                            Pronostica el marcador exacto de cada partido durante todo el torneo.
                        </p>
                    </Link>
                </div>

                {/* Mensaje animador */}
                <div className="rounded-lg border border-green-400/20 bg-green-400/5 px-4 py-3 space-y-2">
                    <p className="text-xs text-green-300 text-center font-semibold">
                        ✨ ¡Juega sin miedo!
                    </p>
                    <p className="text-xs text-gray-400 text-center leading-relaxed">
                        Puedes modificar tus predicciones hasta <strong className="text-white">15 minutos antes</strong> del inicio del Mundial (Porra) o de cada partido (Quiniela)
                    </p>
                </div>
            </div>


            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* ── 1. PORRA (BRACKET) ───────────────────────────────────────────── */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            <section className="space-y-5">
                <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10"></div>
                    <h2 className="text-2xl font-bold text-white">🏆 Porra</h2>
                    <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10"></div>
                </div>

                <p className="text-sm text-gray-400">
                    Rellena el árbol completo del torneo: elige los clasificados de cada grupo,
                    los 8 mejores terceros y el ganador de cada eliminatoria. Cierra el día 1 del torneo.
                </p>

                {/* Clasificación de grupos */}
                <div className="glass-card p-5 space-y-4">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                        Fase de grupos — clasificados
                    </p>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center py-1.5">
                            <span className="text-gray-300">Acertar un clasificado (1.º o 2.º de grupo)</span>
                            <span className="font-bold text-[#00e87a] tabular-nums">1 pt</span>
                        </div>
                        <div className="flex justify-between items-center py-1.5 border-t border-white/5">
                            <span className="text-gray-300">Acertar uno de los 8 mejores terceros</span>
                            <span className="font-bold text-[#00e87a] tabular-nums">1 pt</span>
                        </div>
                    </div>
                </div>

                {/* Rondas eliminatorias */}
                <div className="glass-card p-5 space-y-4">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                        Fase eliminatoria — ganador de cada partido
                    </p>
                    <div className="divide-y divide-white/[0.05]">
                        {[
                            ["Dieciseisavos de final", "2 pts"],
                            ["Octavos de final", "5 pts"],
                            ["Cuartos de final", "7 pts"],
                            ["Semifinal", "10 pts"],
                            ["Final / Campeón", "10 pts"],
                        ].map(([label, pts]) => (
                            <div key={label} className="flex justify-between items-center py-2.5 text-sm">
                                <span className="text-gray-300">{label}</span>
                                <span className="font-bold text-[#00e87a] tabular-nums">{pts}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-4 py-3">
                    <p className="text-xs text-amber-300/90">
                        <strong>Importante:</strong> Los puntos se otorgan cuando un equipo avanza realmente a esa ronda,
                        no al predecir correctamente el resultado de un partido individual.
                    </p>
                </div>

                <Link
                    href="/porra/stats"
                    className="flex items-center justify-between rounded-lg border border-[#00e87a]/20 bg-[#00e87a]/5 px-4 py-3 transition-all hover:border-[#00e87a]/40 hover:bg-[#00e87a]/10"
                >
                    <div>
                        <p className="text-sm font-semibold text-[#00e87a]">📊 Página de consenso</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Una vez enviada tu porra, puedes ver qué predicen el resto de participantes: campeón favorito, finalistas, clasificados por grupo y más.
                        </p>
                    </div>
                    <span className="text-gray-500 text-sm shrink-0 ml-3">→</span>
                </Link>
            </section>


            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* ── 2. QUINIELA (PARTIDO A PARTIDO) ──────────────────────────────── */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            <section className="space-y-5">
                <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10"></div>
                    <h2 className="text-2xl font-bold text-white">⚽ Quiniela</h2>
                    <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10"></div>
                </div>

                <p className="text-sm text-gray-400">
                    Predice el marcador exacto de cada partido. Se otorga únicamente la puntuación más alta que corresponda.
                    Las rondas eliminatorias puntúan el doble (×2).
                </p>

                <div className="glass-card p-5 space-y-4">
                    <div className="grid grid-cols-[2fr,1fr,1fr] gap-3 text-xs font-bold text-gray-500 uppercase tracking-widest pb-2 border-b border-white/[0.08]">
                        <span>Condición</span>
                        <span className="text-center">Grupos</span>
                        <span className="text-center">Eliminatorias</span>
                    </div>
                    {[
                        ["Marcador exacto", "5 pts", "10 pts", "Aciertas los goles de ambos equipos"],
                        ["Tendencia correcta", "3 pts", "6 pts", "Aciertas ganador o empate"],
                        ["Consolación", "1 pt", "2 pts", "Goles exactos de UN equipo (tendencia errónea)"],
                        ["Fallo total", "0 pts", "0 pts", "Nada acertado"],
                    ].map(([cond, g, e, desc]) => (
                        <div key={cond} className="space-y-1">
                            <div className="grid grid-cols-[2fr,1fr,1fr] gap-3 items-center py-2 text-sm border-b border-white/[0.03] last:border-0">
                                <span className="text-gray-200 font-medium">{cond}</span>
                                <span className="text-center font-bold text-[#00e87a] tabular-nums">{g}</span>
                                <span className="text-center font-bold text-[#00e87a] tabular-nums">{e}</span>
                            </div>
                            <p className="text-xs text-gray-600 pl-1">{desc}</p>
                        </div>
                    ))}
                </div>

                <div className="space-y-2">
                    <div className="rounded-lg border border-blue-400/20 bg-blue-400/5 px-4 py-3">
                        <p className="text-xs text-blue-300/90">
                            <strong>Resultado oficial:</strong> Marcador al final del tiempo reglamentario + prórroga
                            (90 min + 30 min). Los penales de desempate final NO cuentan.
                        </p>
                    </div>
                    <div className="rounded-lg border border-red-400/20 bg-red-400/5 px-4 py-3">
                        <p className="text-xs text-red-300/90">
                            <strong>Bloqueo automático:</strong> Los pronósticos se cierran 15 minutos antes del inicio de cada partido.
                        </p>
                    </div>
                </div>
            </section>


            {/* ── Predicciones especiales (Quiniela) ───────────────────────── */}
            <section className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Predicciones especiales (Quiniela)</h3>
                <p className="text-sm text-gray-400">
                    Estas predicciones se bloquean el día 1 del torneo y suman puntos al ranking de la Quiniela.
                </p>
                <div className="glass-card p-5 divide-y divide-white/[0.05]">
                    {[
                        ["Campeón", "20 pts"],
                        ["Subcampeón", "15 pts"],
                    ].map(([label, pts]) => (
                        <div key={label} className="flex justify-between items-center py-2.5 text-sm">
                            <span className="text-gray-300">{label}</span>
                            <span className="font-bold text-[#00e87a] tabular-nums">{pts}</span>
                        </div>
                    ))}
                </div>
            </section>


            {/* ── Desempate ────────────────────────────────────────────────────── */}
            <section className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Criterios de desempate</h3>
                <p className="text-sm text-gray-400">
                    Aplicable a ambos rankings cuando dos jugadores tienen la misma puntuación:
                </p>
                <div className="glass-card p-5 space-y-3">
                    {[
                        ["1.º", "Más marcadores exactos acertados"],
                        ["2.º", "Más tendencias correctas acertadas"],
                        ["3.º", "Fecha de registro más antigua"],
                    ].map(([pos, desc]) => (
                        <div key={pos} className="flex items-center gap-4 text-sm py-1.5">
                            <span className="flex items-center justify-center w-10 h-10 shrink-0 rounded-full bg-amber-400/10 text-amber-400 text-xs font-bold">
                                {pos}
                            </span>
                            <span className="text-gray-300">{desc}</span>
                        </div>
                    ))}
                </div>
            </section>


            {/* ── Perfil ────────────────────────────────────────────────────── */}
            <section className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Tu perfil</h3>
                <div className="glass-card p-5">
                    <p className="text-sm text-gray-300 leading-relaxed">
                        Puedes cambiar tu nombre visible en cualquier momento haciendo clic en tu nombre
                        en la <strong className="text-white">esquina superior derecha</strong> de la pantalla.
                    </p>
                </div>
            </section>


            {/* ── Rankings ──────────────────────────────────────────────────── */}
            <section className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Rankings</h3>
                <p className="text-sm text-gray-400">
                    Puedes consultar la clasificación en tiempo real desde el menú o los tabs de la sección{" "}
                    <span className="text-white font-medium">Ranking</span>.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                    <Link
                        href="/ranking?tab=porra"
                        className="glass-card p-4 transition-all hover:border-[#00e87a]/30 hover:scale-[1.02]"
                    >
                        <h4 className="text-sm font-semibold text-[#00e87a] mb-2">Ranking Porra</h4>
                        <p className="text-xs text-gray-500">
                            Solo suma puntos del bracket completo (grupos + eliminatorias).
                        </p>
                    </Link>
                    <Link
                        href="/ranking?tab=quiniela"
                        className="glass-card p-4 transition-all hover:border-blue-400/30 hover:scale-[1.02]"
                    >
                        <h4 className="text-sm font-semibold text-blue-300 mb-2">Ranking Quiniela</h4>
                        <p className="text-xs text-gray-500">
                            Suma puntos de todos los partidos + predicciones especiales.
                        </p>
                    </Link>
                </div>
            </section>
        </div>
    );
}
