"use client";

import { useState, useTransition } from "react";
import {
  createModal,
  toggleModal,
  deleteModal,
  resetModalForEveryone,
} from "@/app/admin/modales/actions";

interface ModalRow {
  id: string;
  slug: string;
  title: string;
  body: string;
  emoji: string;
  active: boolean;
  createdAt: Date;
  _count: { dismissals: number };
}

interface Props {
  modales: ModalRow[];
  totalUsers: number;
}

const EMOJIS = ["📢", "🎉", "⚽", "🏆", "🆕", "⚠️", "💡", "🔔"];

export default function ModalesPanel({ modales, totalUsers }: Props) {
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ slug: "", title: "", body: "", emoji: "📢" });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleCreate = () => {
    if (!form.slug || !form.title || !form.body) return;
    startTransition(async () => {
      await createModal(form);
      setForm({ slug: "", title: "", body: "", emoji: "📢" });
      setShowForm(false);
    });
  };

  return (
    <div className="space-y-4">
      {/* Modal list */}
      {modales.length === 0 && !showForm && (
        <p className="text-sm text-gray-500">No hay modales creados aún.</p>
      )}

      {modales.map((m) => (
        <div
          key={m.id}
          className={`rounded-xl border p-4 space-y-3 transition-colors ${
            m.active
              ? "border-white/10 bg-white/5"
              : "border-white/5 bg-white/[0.02] opacity-60"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-2xl shrink-0">{m.emoji}</span>
              <div className="min-w-0">
                <p className="font-semibold text-white leading-snug truncate">{m.title}</p>
                <p className="text-xs text-gray-500 font-mono">{m.slug}</p>
              </div>
            </div>
            <span
              className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                m.active
                  ? "bg-[#00e87a]/10 text-[#00e87a]"
                  : "bg-white/5 text-gray-500"
              }`}
            >
              {m.active ? "Activo" : "Inactivo"}
            </span>
          </div>

          <p className="text-sm text-gray-400 leading-relaxed">{m.body}</p>

          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {m._count.dismissals} / {totalUsers} lo han descartado permanentemente
            </span>
            <span>
              {new Date(m.createdAt).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => startTransition(() => toggleModal(m.id, !m.active))}
              disabled={isPending}
              className="text-xs px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-gray-300 hover:text-white hover:border-white/20 transition-colors disabled:opacity-40"
            >
              {m.active ? "Desactivar" : "Activar"}
            </button>
            <button
              onClick={() => startTransition(() => resetModalForEveryone(m.id))}
              disabled={isPending}
              className="text-xs px-3 py-1.5 rounded-lg border border-blue-400/20 bg-blue-400/5 text-blue-300 hover:bg-blue-400/10 transition-colors disabled:opacity-40"
            >
              Resetear para todos
            </button>
            {confirmDelete === m.id ? (
              <>
                <button
                  onClick={() => startTransition(() => deleteModal(m.id))}
                  disabled={isPending}
                  className="text-xs px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-40"
                >
                  Confirmar borrado
                </button>
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-gray-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmDelete(m.id)}
                className="text-xs px-3 py-1.5 rounded-lg border border-red-500/20 text-red-500/70 hover:text-red-400 hover:border-red-500/30 transition-colors"
              >
                Eliminar
              </button>
            )}
          </div>
        </div>
      ))}

      {/* Create form */}
      {showForm ? (
        <div className="rounded-xl border border-[#00e87a]/20 bg-[#00e87a]/5 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-[#00e87a]">Nuevo modal</h3>

          <div className="space-y-3">
            <div className="flex gap-2">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => setForm((f) => ({ ...f, emoji: e }))}
                  className={`text-xl p-1.5 rounded-lg transition-colors ${
                    form.emoji === e ? "bg-white/15" : "hover:bg-white/10"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Slug (e.g. nueva-funcion-junio)"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/25 font-mono"
            />

            <input
              type="text"
              placeholder="Título del modal"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/25"
            />

            <textarea
              placeholder="Cuerpo del mensaje"
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/25 resize-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={isPending || !form.slug || !form.title || !form.body}
              className="px-4 py-2 bg-[#00e87a] hover:bg-[#00d970] text-black font-semibold rounded-lg text-sm transition-colors disabled:opacity-40"
            >
              Crear modal
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-gray-300 hover:text-white text-sm transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full rounded-xl border border-dashed border-white/10 py-3 text-sm text-gray-500 hover:text-gray-300 hover:border-white/20 transition-colors"
        >
          + Nuevo modal
        </button>
      )}
    </div>
  );
}
