"use client";

import { useTransition } from "react";
import { triggerKnockoutResolver } from "./actions";

export function ResolverButton() {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await triggerKnockoutResolver();
      if (result.updated.length === 0) {
        alert("Sin cambios: todos los slots ya están resueltos o los grupos necesarios no han terminado.");
      } else {
        alert(`${result.updated.length} slot(s) actualizado(s): ${result.updated.map(u => `${u.bracketMatchId}.${u.field}=${u.team}`).join(", ")}`);
      }
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:border-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? "Resolviendo…" : "Resolver llaves"}
    </button>
  );
}
