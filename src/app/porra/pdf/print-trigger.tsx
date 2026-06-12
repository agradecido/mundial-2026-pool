"use client";

export default function PrintTrigger({ count }: { count: number }) {
  return (
    <div className="no-print mb-6 flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h2 className="text-xl font-bold text-white">Porras completadas</h2>
        <p className="text-sm text-gray-500">
          {count} porra{count !== 1 ? "s" : ""} listas para exportar
        </p>
      </div>
      <button
        onClick={() => window.print()}
        className="btn-save rounded-xl px-5 py-2.5 text-sm font-semibold"
      >
        Imprimir / Guardar PDF
      </button>
    </div>
  );
}
