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
      <div className="grid grid-cols-[2rem_1fr_2.5rem_4rem_4rem] gap-x-4 px-5 py-2.5 text-xs text-gray-600 border-b border-white/[0.06]">
        <span>#</span>
        <span>Grupo</span>
        <span className="flex justify-end">
          <svg className="size-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
          </svg>
        </span>
        <span className="text-right">Total</span>
        <span className="text-right">Media</span>
      </div>

      <ul className="divide-y divide-white/[0.04]">
        {grupos.map((g, i) => (
          <li key={g.id}>
            <Link
              href={`/grupo/${g.codigo}`}
              className="grid grid-cols-[2rem_1fr_2.5rem_4rem_4rem] gap-x-4 px-5 py-3.5 items-center hover:bg-white/[0.03] transition-colors"
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
