"use client";

import { useState } from "react";
import { recalcularTodosFinalizados } from "./actions";

export default function RecalcularTodosButton() {
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [count, setCount] = useState(0);

  async function handleClick() {
    setState("loading");
    try {
      const result = await recalcularTodosFinalizados();
      setCount(result.count);
      setState("ok");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleClick}
        disabled={state === "loading"}
        className="inline-flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-sm text-amber-400 hover:border-amber-400/50 hover:bg-amber-400/15 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {state === "loading" ? (
          <>
            <svg className="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Recalculando…
          </>
        ) : (
          "Recalcular todos los finalizados"
        )}
      </button>
      {state === "ok" && (
        <span className="text-xs text-emerald-400">{count} partido{count !== 1 ? "s" : ""} recalculado{count !== 1 ? "s" : ""}</span>
      )}
      {state === "error" && (
        <span className="text-xs text-red-400">Error al recalcular</span>
      )}
    </div>
  );
}
