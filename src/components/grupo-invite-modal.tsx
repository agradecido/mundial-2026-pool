"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import GrupoInvitePanel from "@/components/grupo-invite-panel";
import { addUserToGrupo } from "@/lib/grupo-actions";

interface NonMember {
  id: string;
  name: string | null;
  email: string;
}

interface Props {
  codigo: string;
  isAdmin?: boolean;
}

export default function GrupoInviteModal({ codigo, isAdmin }: Props) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<NonMember[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [addingId, setAddingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !isAdmin) return;
    setUsersLoading(true);
    fetch(`/api/admin/grupos/non-members?codigo=${encodeURIComponent(codigo)}`)
      .then((r) => r.json())
      .then((data: NonMember[]) => setUsers(data))
      .catch(() => setUsers([]))
      .finally(() => setUsersLoading(false));
  }, [open, isAdmin, codigo]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return users.filter(
      (u) =>
        !addedIds.has(u.id) &&
        (u.name?.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    );
  }, [users, query, addedIds]);

  const handleAdd = (userId: string) => {
    setAddingId(userId);
    startTransition(async () => {
      try {
        await addUserToGrupo(codigo, userId);
        setAddedIds((prev) => new Set(prev).add(userId));
      } finally {
        setAddingId(null);
      }
    });
  };

  const handleClose = () => {
    setOpen(false);
    setQuery("");
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-[#00e87a]/30 bg-[#00e87a]/10 px-3 py-1.5 text-xs text-[#00e87a] hover:bg-[#00e87a]/20 transition-colors"
      >
        <svg className="size-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Añadir participantes
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className={`relative w-full glass-card p-6 space-y-4 ${isAdmin ? "max-w-md" : "max-w-sm"}`}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Añadir participantes</h2>
              <button
                onClick={handleClose}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <svg className="size-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <GrupoInvitePanel codigo={codigo} />

            {isAdmin && (
              <>
                <div className="border-t border-white/10 pt-4 space-y-3">
                  <p className="text-xs font-medium text-gray-400">Añadir usuario directamente</p>

                  <input
                    type="text"
                    placeholder="Buscar por nombre o email..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-white/20"
                  />

                  <div className="max-h-52 overflow-y-auto space-y-1 -mx-1 px-1">
                    {usersLoading ? (
                      <p className="text-xs text-gray-600 py-4 text-center">Cargando usuarios…</p>
                    ) : filtered.length === 0 ? (
                      <p className="text-xs text-gray-600 py-4 text-center">
                        {query ? "Sin resultados" : "Todos los usuarios ya son miembros"}
                      </p>
                    ) : (
                      filtered.map((u) => (
                        <div
                          key={u.id}
                          className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/5 transition-colors"
                        >
                          <div className="size-7 shrink-0 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium text-gray-300">
                            {(u.name ?? u.email)[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{u.name ?? "—"}</p>
                            <p className="text-xs text-gray-500 truncate">{u.email}</p>
                          </div>
                          <button
                            onClick={() => handleAdd(u.id)}
                            disabled={addingId === u.id || isPending}
                            className="shrink-0 rounded-md border border-[#00e87a]/30 bg-[#00e87a]/10 px-2.5 py-1 text-xs font-medium text-[#00e87a] hover:bg-[#00e87a]/20 transition-colors disabled:opacity-40"
                          >
                            {addingId === u.id ? "…" : "Añadir"}
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {addedIds.size > 0 && (
                    <p className="text-xs text-[#00e87a]/70">
                      {addedIds.size} {addedIds.size === 1 ? "usuario añadido" : "usuarios añadidos"}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
