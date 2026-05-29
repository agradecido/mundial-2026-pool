"use client";

import { useState, useTransition } from "react";
import { cambiarRolUsuario, eliminarUsuario, resetearModalBienvenida } from "@/app/admin/usuarios/actions";
import Image from "next/image";
import type { Role } from "@prisma/client";

interface Usuario {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    role: Role;
    fechaRegistro: string; // ISO
    welcomeModalViews: number;
    _count: { pronosticos: number };
    totalPuntos: number;
}

interface Props {
    usuarios: Usuario[];
    currentAdminId: string;
}

export default function UsuariosTable({ usuarios, currentAdminId }: Props) {
    const [pending, startTransition] = useTransition();
    const [errors, setErrors] = useState<Record<string, string>>({});

    function setError(id: string, msg: string) {
        setErrors((prev) => ({ ...prev, [id]: msg }));
    }

    function clearError(id: string) {
        setErrors((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    }

    function handleRoleChange(userId: string, role: Role) {
        clearError(userId);
        startTransition(async () => {
            const res = await cambiarRolUsuario(userId, role);
            if (res.error) setError(userId, res.error);
        });
    }

    function handleDelete(userId: string, name: string | null) {
        if (!confirm(`¿Eliminar a "${name ?? userId}"? Esta acción no se puede deshacer.`)) return;
        clearError(userId);
        startTransition(async () => {
            const res = await eliminarUsuario(userId);
            if (res.error) setError(userId, res.error);
        });
    }

    function handleResetModal(userId: string) {
        clearError(userId);
        startTransition(async () => {
            await resetearModalBienvenida(userId);
        });
    }

    return (
        <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-white/10 text-left text-xs text-gray-500">
                        <th className="px-4 py-3 font-medium">Usuario</th>
                        <th className="px-4 py-3 font-medium hidden md:table-cell">Registro</th>
                        <th className="px-4 py-3 font-medium hidden sm:table-cell">Pronósticos</th>
                        <th className="px-4 py-3 font-medium hidden sm:table-cell">Puntos</th>
                        <th className="px-4 py-3 font-medium hidden lg:table-cell">Modal</th>
                        <th className="px-4 py-3 font-medium">Rol</th>
                        <th className="px-4 py-3 font-medium"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {usuarios.map((u) => (
                        <tr key={u.id} className="hover:bg-white/[0.02] transition-colors align-middle">
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                    {u.image ? (
                                        <Image
                                            src={u.image}
                                            alt=""
                                            width={28}
                                            height={28}
                                            className="rounded-full ring-1 ring-white/10 flex-shrink-0"
                                        />
                                    ) : (
                                        <span className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs text-gray-400 flex-shrink-0">
                                            {(u.name ?? u.email)[0].toUpperCase()}
                                        </span>
                                    )}
                                    <div>
                                        <p className="text-white font-medium leading-tight">{u.name ?? "—"}</p>
                                        <p className="text-xs text-gray-500 truncate max-w-[160px]">{u.email}</p>
                                        {errors[u.id] && (
                                            <p className="text-xs text-red-400 mt-0.5">{errors[u.id]}</p>
                                        )}
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-gray-400 hidden md:table-cell whitespace-nowrap">
                                {new Date(u.fechaRegistro).toLocaleDateString("es-ES", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                })}
                            </td>
                            <td className="px-4 py-3 text-gray-300 hidden sm:table-cell">
                                {u._count.pronosticos}
                            </td>
                            <td className="px-4 py-3 text-white font-semibold hidden sm:table-cell">
                                {u.totalPuntos}
                            </td>
                            <td className="px-4 py-3 hidden lg:table-cell">
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-400 text-xs">{u.welcomeModalViews}/2</span>
                                    {u.welcomeModalViews > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => handleResetModal(u.id)}
                                            disabled={pending}
                                            className="rounded px-2 py-0.5 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 transition-colors disabled:opacity-50"
                                            title="Resetear contador modal"
                                        >
                                            Reset
                                        </button>
                                    )}
                                </div>
                            </td>
                            <td className="px-4 py-3">
                                <select
                                    value={u.role}
                                    onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                                    disabled={pending}
                                    className="rounded-md border border-white/10 bg-[#0a0a0a] px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-white/30 disabled:opacity-50"
                                >
                                    <option value="JUGADOR">Jugador</option>
                                    <option value="ADMIN">Admin</option>
                                </select>
                            </td>
                            <td className="px-4 py-3 text-right">
                                {u.id !== currentAdminId && (
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(u.id, u.name)}
                                        disabled={pending}
                                        className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-1 text-xs text-red-400 hover:bg-red-950/60 hover:text-red-300 transition-colors disabled:opacity-50"
                                    >
                                        Eliminar
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
