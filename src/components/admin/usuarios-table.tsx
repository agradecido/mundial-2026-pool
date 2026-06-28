"use client";

import { useState, useTransition } from "react";
import { cambiarRolUsuario, eliminarUsuario, suspenderUsuario } from "@/app/admin/usuarios/actions";
import Image from "next/image";
import Link from "next/link";
import type { Role } from "@prisma/client";

interface Usuario {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    role: Role;
    suspendido: boolean;
    fechaRegistro: string; // ISO
    ultimoAccesoQuiniela: string | null; // ISO
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

    function handleSuspend(userId: string, suspendido: boolean, name: string | null) {
        clearError(userId);
        startTransition(async () => {
            const res = await suspenderUsuario(userId, suspendido);
            if (res.error) setError(userId, res.error);
        });
    }

    return (
        <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-white/10 text-left text-xs text-gray-500">
                        <th className="px-4 py-3 font-medium">Usuario</th>
                        <th className="px-4 py-3 font-medium hidden md:table-cell">Registro</th>
                        <th className="px-4 py-3 font-medium hidden lg:table-cell">Últ. quiniela</th>
                        <th className="px-4 py-3 font-medium hidden sm:table-cell">Pronósticos</th>
                        <th className="px-4 py-3 font-medium hidden sm:table-cell">Puntos</th>
                        <th className="px-4 py-3 font-medium">Rol</th>
                        <th className="px-4 py-3 font-medium"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {usuarios.map((u) => (
                        <tr key={u.id} className={`hover:bg-white/[0.02] transition-colors align-middle ${u.suspendido ? "opacity-50" : ""}`}>
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
                                        <div className="flex items-center gap-1.5">
                                            <p className="text-white font-medium leading-tight">{u.name ?? "—"}</p>
                                            {u.suspendido && (
                                                <span className="rounded px-1 py-0.5 text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                                                    suspendido
                                                </span>
                                            )}
                                        </div>
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
                            <td className="px-4 py-3 text-gray-400 hidden lg:table-cell whitespace-nowrap">
                                {u.ultimoAccesoQuiniela
                                    ? new Date(u.ultimoAccesoQuiniela).toLocaleDateString("es-ES", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                    })
                                    : <span className="text-gray-600">—</span>
                                }
                            </td>
                            <td className="px-4 py-3 text-gray-300 hidden sm:table-cell">
                                {u._count.pronosticos}
                            </td>
                            <td className="px-4 py-3 text-white font-semibold hidden sm:table-cell">
                                {u.totalPuntos}
                            </td>
                            <td className="px-4 py-3">
                                <select
                                    value={u.role}
                                    onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                                    disabled={pending}
                                    className="rounded-md border border-white/10 bg-[#0a0a0a] px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-white/30 disabled:opacity-50"
                                >
                                    <option value="JUGADOR">Jugador</option>
                                    <option value="EDITOR">Editor</option>
                                    <option value="ADMIN">Admin</option>
                                </select>
                            </td>
                            <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <Link
                                        href={`/admin/usuarios/${u.id}/pronosticos`}
                                        className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-400 hover:text-white hover:border-white/20 transition-colors"
                                    >
                                        Pronósticos
                                    </Link>
                                    {u.id !== currentAdminId && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => handleSuspend(u.id, !u.suspendido, u.name)}
                                                disabled={pending}
                                                className={`rounded-lg border px-3 py-1 text-xs transition-colors disabled:opacity-50 ${
                                                    u.suspendido
                                                        ? "border-green-900/50 bg-green-950/30 text-green-400 hover:bg-green-950/60 hover:text-green-300"
                                                        : "border-amber-900/50 bg-amber-950/30 text-amber-400 hover:bg-amber-950/60 hover:text-amber-300"
                                                }`}
                                            >
                                                {u.suspendido ? "Reactivar" : "Suspender"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(u.id, u.name)}
                                                disabled={pending}
                                                className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-1 text-xs text-red-400 hover:bg-red-950/60 hover:text-red-300 transition-colors disabled:opacity-50"
                                            >
                                                Eliminar
                                            </button>
                                        </>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
