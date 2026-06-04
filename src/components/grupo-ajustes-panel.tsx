"use client";

import { useActionState, useTransition } from "react";
import { updateGrupoNombre, removeMember, deleteGrupo, leaveGrupo } from "@/app/actions/grupos";
import GrupoInvitePanel from "@/components/grupo-invite-panel";

interface Member {
  userId: string;
  name: string | null;
  image: string | null;
}

interface Props {
  grupoId: string;
  grupoNombre: string;
  codigo: string;
  miembros: Member[];
  isCreador: boolean;
  tournamentStarted: boolean;
}

export default function GrupoAjustesPanel({
  grupoId,
  grupoNombre,
  codigo,
  miembros,
  isCreador,
  tournamentStarted,
}: Props) {
  const [renameState, renameAction, isRenaming] = useActionState(updateGrupoNombre, null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-8">
      {/* Invite link */}
      {!tournamentStarted && <GrupoInvitePanel codigo={codigo} />}

      {/* Rename */}
      {isCreador && (
        <div>
          <p className="text-xs text-gray-500 mb-2">Nombre del grupo</p>
          <form action={renameAction} className="flex gap-2">
            <input type="hidden" name="grupoId" value={grupoId} />
            <input
              type="text"
              name="nombre"
              defaultValue={grupoNombre}
              maxLength={50}
              required
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-[#00e87a]/50 transition-all"
            />
            <button
              type="submit"
              disabled={isRenaming}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-gray-400 hover:border-white/20 hover:text-white transition-colors disabled:opacity-50"
            >
              {isRenaming ? "…" : renameState?.ok ? "✓" : "Guardar"}
            </button>
          </form>
          {renameState?.error && <p className="mt-1.5 text-xs text-red-400">{renameState.error}</p>}
        </div>
      )}

      {/* Members */}
      <div>
        <p className="text-xs text-gray-500 mb-2">Participantes ({miembros.length})</p>
        <ul className="space-y-2">
          {miembros.map((m) => (
            <li key={m.userId} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-2.5">
              <span className="text-sm text-white">{m.name ?? "Sin nombre"}</span>
              {isCreador && m.userId !== miembros.find(() => true)?.userId && (
                <button
                  onClick={() => startTransition(async () => { await removeMember(grupoId, m.userId); })}
                  disabled={pending}
                  className="text-xs text-gray-600 hover:text-red-400 transition-colors"
                >
                  Expulsar
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Danger zone */}
      <div className="border-t border-white/[0.07] pt-6 space-y-3">
        {!isCreador && (
          <button
            onClick={() => startTransition(async () => { await leaveGrupo(grupoId); })}
            disabled={pending}
            className="w-full rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
          >
            Abandonar grupo
          </button>
        )}
        {isCreador && (
          <button
            onClick={() => {
              if (confirm("¿Seguro que quieres eliminar este grupo? Esta acción no se puede deshacer.")) {
                startTransition(() => deleteGrupo(grupoId));
              }
            }}
            disabled={pending}
            className="w-full rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
          >
            Eliminar grupo
          </button>
        )}
      </div>
    </div>
  );
}
