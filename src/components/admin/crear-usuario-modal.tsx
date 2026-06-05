"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { crearUsuario } from "@/app/admin/usuarios/actions";
import type { Role } from "@prisma/client";

export default function CrearUsuarioModal() {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<Role>("JUGADOR");
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const reset = () => {
        setName("");
        setEmail("");
        setPassword("");
        setRole("JUGADOR");
        setError(null);
    };

    const handleClose = () => {
        setOpen(false);
        reset();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
            const res = await crearUsuario({ name, email, password, role });
            if (res.error) {
                setError(res.error);
            } else {
                handleClose();
            }
        });
    };

    const modal = open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
            <div className="relative w-full max-w-sm glass-card p-6 space-y-5">
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-white">Añadir usuario</h2>
                    <button onClick={handleClose} className="text-gray-500 hover:text-white transition-colors">
                        <svg className="size-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="block text-xs text-gray-500 uppercase tracking-wider">Nombre</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            autoFocus
                            placeholder="Nombre o nick"
                            disabled={pending}
                            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-white/20 disabled:opacity-50"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs text-gray-500 uppercase tracking-wider">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="correo@ejemplo.com"
                            disabled={pending}
                            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-white/20 disabled:opacity-50"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs text-gray-500 uppercase tracking-wider">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Mínimo 6 caracteres"
                            disabled={pending}
                            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-white/20 disabled:opacity-50"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs text-gray-500 uppercase tracking-wider">Rol</label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value as Role)}
                            disabled={pending}
                            className="w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-white/20 disabled:opacity-50"
                        >
                            <option value="JUGADOR">Jugador</option>
                            <option value="EDITOR">Editor</option>
                            <option value="ADMIN">Admin</option>
                        </select>
                    </div>

                    {error && <p className="text-xs text-red-400">{error}</p>}

                    <button
                        type="submit"
                        disabled={pending}
                        className="w-full rounded-lg bg-[#00e87a] hover:bg-[#00d970] px-4 py-2.5 text-sm font-semibold text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {pending ? "Creando…" : "Crear usuario"}
                    </button>
                </form>
            </div>
        </div>
    ) : null;

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-gray-300 hover:border-white/20 hover:text-white transition-colors"
            >
                <svg className="size-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Añadir usuario
            </button>
            {typeof document !== "undefined" && modal && createPortal(modal, document.body)}
        </>
    );
}
