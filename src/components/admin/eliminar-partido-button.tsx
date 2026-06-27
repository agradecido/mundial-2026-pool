"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { eliminarPartido } from "@/app/admin/partidos/actions";

export default function EliminarPartidoButton({ partidoId }: { partidoId: string }) {
    const [confirm, setConfirm] = useState(false);
    const [pending, startTransition] = useTransition();
    const [err, setErr] = useState<string | null>(null);
    const router = useRouter();

    function handleDelete() {
        setErr(null);
        startTransition(async () => {
            const res = await eliminarPartido(partidoId);
            if (res.error) {
                setErr(res.error);
            } else {
                router.push("/admin/partidos");
            }
        });
    }

    if (!confirm) {
        return (
            <button
                onClick={() => setConfirm(true)}
                className="text-xs text-red-600 hover:text-red-400 transition-colors"
            >
                Eliminar partido
            </button>
        );
    }

    return (
        <div className="flex items-center gap-3">
            <span className="text-xs text-red-400">¿Seguro? Se borrarán también todos sus pronósticos.</span>
            <button
                onClick={handleDelete}
                disabled={pending}
                className="rounded-lg border border-red-700 bg-red-950/50 px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-900/50 transition-colors disabled:opacity-50"
            >
                {pending ? "Eliminando…" : "Sí, eliminar"}
            </button>
            <button
                onClick={() => setConfirm(false)}
                className="text-xs text-gray-500 hover:text-white transition-colors"
            >
                Cancelar
            </button>
            {err && <span className="text-xs text-red-400">{err}</span>}
        </div>
    );
}
