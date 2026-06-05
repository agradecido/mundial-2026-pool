"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    getNicknameStatus,
    updateNickname,
    type NicknameStatus,
} from "@/app/actions/nickname";

interface Props {
    open?: boolean;
    onClose?: () => void;
    onSaved?: (name: string) => void;
    role?: string | null;
    signOutAction?: () => Promise<void>;
}

const NICK_MAX = 24;

export default function NicknameModal({ open: controlledOpen, onClose, onSaved, role, signOutAction }: Props) {
    const isControlled = controlledOpen !== undefined;
    const router = useRouter();

    const [autoOpen, setAutoOpen] = useState(false);
    const [status, setStatus] = useState<NicknameStatus | null>(null);
    const [value, setValue] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    // Load status on mount (only in auto mode) to decide whether to open.
    useEffect(() => {
        if (isControlled) return;
        let cancelled = false;
        (async () => {
            const s = await getNicknameStatus();
            if (cancelled) return;
            setStatus(s);
            if (s && !s.hasChosen) {
                // Brief delay so it doesn't fight with the welcome modal
                setTimeout(() => !cancelled && setAutoOpen(true), 900);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isControlled]);

    // In controlled (edit) mode, fetch the current name when opening.
    useEffect(() => {
        if (!isControlled || !controlledOpen) return;
        (async () => {
            const s = await getNicknameStatus();
            setStatus(s);
            setValue(s?.currentName ?? "");
            setError(null);
        })();
    }, [isControlled, controlledOpen]);

    // Pre-fill value in auto mode when status loads.
    useEffect(() => {
        if (isControlled) return;
        if (status && !value) setValue(status.currentName ?? "");
    }, [isControlled, status, value]);

    const isOpen = isControlled ? !!controlledOpen : autoOpen;
    const isInitial = !isControlled;

    if (!isOpen) return null;

    const close = () => {
        if (isControlled) {
            onClose?.();
        } else {
            setAutoOpen(false);
        }
    };

    const handleSave = () => {
        setError(null);
        startTransition(async () => {
            const res = await updateNickname(value);
            if (!res.ok) {
                setError(res.error);
                return;
            }
            onSaved?.(res.name);
            router.refresh();
            close();
        });
    };

    const handleKeep = () => {
        setError(null);
        startTransition(async () => {
            const res = await updateNickname("", { keepCurrent: true });
            if (res.ok) onSaved?.(res.name);
            router.refresh();
            close();
        });
    };

    const modal = (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={isInitial ? undefined : close}
            />

            <div className="relative w-full max-w-md glass-card p-6 sm:p-7 space-y-5 animate-in fade-in zoom-in-95 duration-200">
                {!isInitial && (
                    <button
                        onClick={close}
                        className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                        aria-label="Cerrar"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                )}

                <div className="flex justify-center">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#00e87a]/20 to-blue-400/20 flex items-center justify-center text-2xl">
                        ✏️
                    </div>
                </div>

                <div className="text-center space-y-1.5">
                    <h2 className="text-xl font-bold text-white">
                        {isInitial ? "Elige tu nombre" : "Cambiar nombre"}
                    </h2>
                    <p className="text-sm text-gray-400">
                        {isInitial
                            ? "Aparecerá en los rankings y al lado de tus pronósticos"
                            : "Cambia cómo te ve el resto del grupo"}
                    </p>
                </div>

                <div className="space-y-2">
                    <label className="block text-xs uppercase tracking-wider text-gray-500">
                        Nombre
                    </label>
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => {
                            setValue(e.target.value);
                            setError(null);
                        }}
                        maxLength={NICK_MAX}
                        autoFocus
                        placeholder="Tu nombre o nick"
                        disabled={pending}
                        className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-base text-white placeholder:text-gray-600 focus:border-[#00e87a]/40 focus:outline-none focus:ring-1 focus:ring-[#00e87a]/30 disabled:opacity-50"
                    />
                    <div className="flex items-center justify-between text-xs">
                        <span className={error ? "text-red-400" : "text-gray-600"}>
                            {error ?? "Entre 2 y 24 caracteres"}
                        </span>
                        <span className="font-mono text-gray-600 tabular-nums">
                            {value.length}/{NICK_MAX}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    {isInitial && (
                        <button
                            onClick={handleKeep}
                            disabled={pending}
                            className="flex-1 px-4 py-2.5 glass-card hover:bg-white/[0.08] text-gray-300 font-medium rounded-lg transition-colors text-sm disabled:opacity-50"
                        >
                            Mantener mi nombre
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={pending || value.trim().length < 2}
                        className="flex-1 px-4 py-2.5 bg-[#00e87a] hover:bg-[#00d970] text-black font-semibold rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {pending ? "Guardando…" : "Guardar"}
                    </button>
                </div>

                <div className="pt-1 border-t border-white/10 space-y-2">
                    {(role === "ADMIN" || role === "EDITOR") && (
                        <Link
                            href={role === "ADMIN" ? "/admin" : "/admin/partidos"}
                            onClick={close}
                            className="flex items-center justify-center gap-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-300 hover:border-white/20 hover:bg-white/10 hover:text-white transition-colors"
                        >
                            <svg className="size-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                            </svg>
                            Panel de administración
                        </Link>
                    )}

                    {signOutAction && (
                        <form action={signOutAction}>
                            <button
                                type="submit"
                                className="flex items-center justify-center gap-2 w-full rounded-lg border border-red-900/50 bg-red-950/20 px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-colors"
                            >
                                <svg className="size-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                                </svg>
                                Cerrar sesión
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(modal, document.body);
}
