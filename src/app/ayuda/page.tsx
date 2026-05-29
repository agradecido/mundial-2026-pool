export default function AyudaPage() {
    return (
        <div className="space-y-10 max-w-[600px] mx-auto">
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Ayuda</h1>
                <p className="mt-1 text-sm text-gray-500">Reglas y sistema de puntuación</p>
            </div>

            {/* ── Porra del torneo ─────────────────────────────────────────────── */}
            <section className="space-y-4">
                <h2 className="text-lg font-semibold text-white">Porra del torneo (llaves)</h2>
                <p className="text-sm text-gray-400">
                    Rellena el árbol completo: elige los clasificados de cada grupo, los 8 mejores terceros
                    y el ganador de cada eliminatoria. Cuanto más lejos llegue un equipo en tu predicción,
                    más puntos vale acertarlo.
                </p>

                {/* Clasificación de grupos */}
                <div className="glass-card p-4 space-y-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                        Fase de grupos — clasificados
                    </p>
                    <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-300">Acertar un clasificado en 1.º o 2.º de grupo</span>
                            <span className="font-semibold text-[#00e87a]">1 pt</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-300">Acertar uno de los 8 mejores terceros</span>
                            <span className="font-semibold text-[#00e87a]">1 pt</span>
                        </div>
                    </div>
                </div>

                {/* Rondas eliminatorias */}
                <div className="glass-card p-4 space-y-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                        Fase eliminatoria — ganador de cada partido
                    </p>
                    <div className="divide-y divide-white/[0.06]">
                        {[
                            ["16avos de final", "2 pts"],
                            ["Octavos de final", "5 pts"],
                            ["Cuartos de final", "7 pts"],
                            ["Semifinal", "10 pts"],
                            ["Final / Campeón", "10 pts"],
                        ].map(([label, pts]) => (
                            <div key={label} className="flex justify-between py-2 text-sm">
                                <span className="text-gray-300">{label}</span>
                                <span className="font-semibold text-[#00e87a]">{pts}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Pronósticos de partidos ──────────────────────────────────────── */}
            <section className="space-y-4">
                <h2 className="text-lg font-semibold text-white">Pronósticos de partidos</h2>
                <p className="text-sm text-gray-400">
                    Para cada partido puedes predecir el marcador exacto. Se otorga únicamente la
                    puntuación más alta que te corresponda. Las rondas eliminatorias puntúan el doble.
                </p>

                <div className="glass-card p-4 space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-gray-500 uppercase tracking-widest pb-1 border-b border-white/[0.08]">
                        <span>Condición</span>
                        <span className="text-center">Grupos</span>
                        <span className="text-center">Eliminatorias ×2</span>
                    </div>
                    {[
                        ["Marcador exacto", "5 pts", "10 pts"],
                        ["Tendencia correcta", "3 pts", "6 pts"],
                        ["Consolación *", "1 pt", "2 pts"],
                        ["Fallo total", "0 pts", "0 pts"],
                    ].map(([cond, g, e]) => (
                        <div key={cond} className="grid grid-cols-3 gap-2 text-sm py-1 border-b border-white/[0.04] last:border-0">
                            <span className="text-gray-300">{cond}</span>
                            <span className="text-center font-semibold text-[#00e87a]">{g}</span>
                            <span className="text-center font-semibold text-[#00e87a]">{e}</span>
                        </div>
                    ))}
                </div>

                <p className="text-xs text-gray-600">
                    * Consolación: tendencia errónea pero los goles de un equipo son exactos.
                </p>
                <p className="text-xs text-gray-600">
                    Los pronósticos se bloquean automáticamente 15 minutos antes del inicio de cada partido.
                </p>
            </section>

            {/* ── Desempate ────────────────────────────────────────────────────── */}
            <section className="space-y-3">
                <h2 className="text-lg font-semibold text-white">Desempate en el ranking</h2>
                <div className="glass-card p-4 space-y-2">
                    {[
                        ["1.º", "Más marcadores exactos acertados"],
                        ["2.º", "Más tendencias correctas acertadas"],
                        ["3.º", "Fecha de registro más antigua"],
                    ].map(([pos, desc]) => (
                        <div key={pos} className="flex items-center gap-3 text-sm py-1">
                            <span className="w-8 text-center text-xs font-bold text-amber-400/80 shrink-0">{pos}</span>
                            <span className="text-gray-300">{desc}</span>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
