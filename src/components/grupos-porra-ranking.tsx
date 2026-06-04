import Link from "next/link";

export interface GrupoPorraEntry {
  id: string;
  nombre: string;
  codigo: string;
  numMiembros: number;
  total: number;
  media: number;
}

interface Props {
  grupos: GrupoPorraEntry[];
}

export default function GruposPorraRanking({ grupos }: Props) {
  if (grupos.length === 0) {
    return (
      <div className="glass-card p-16 text-center">
        <p className="text-gray-600 text-sm">No hay grupos creados todavía</p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="grid grid-cols-[2rem_1fr_5rem_5rem_5rem] gap-x-4 px-5 py-2.5 text-xs text-gray-600 border-b border-white/[0.06]">
        <span>#</span>
        <span>Grupo</span>
        <span className="text-right">Participantes</span>
        <span className="text-right">Total</span>
        <span className="text-right">Media</span>
      </div>

      <ul className="divide-y divide-white/[0.04]">
        {grupos.map((g, i) => (
          <li key={g.id}>
            <Link
              href={`/grupo/${g.codigo}`}
              className="grid grid-cols-[2rem_1fr_5rem_5rem_5rem] gap-x-4 px-5 py-3.5 items-center hover:bg-white/[0.03] transition-colors"
            >
              <span className="text-sm text-gray-600 font-mono">{i + 1}</span>

              <span className="text-sm font-semibold text-white truncate">{g.nombre}</span>

              <span className="text-sm text-gray-400 text-right">{g.numMiembros}</span>

              <span className="text-sm text-gray-300 text-right tabular-nums">{g.total}</span>

              <span className="text-sm font-semibold text-[#00e87a] text-right tabular-nums">
                {g.media.toFixed(1)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
