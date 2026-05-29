"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  getNicknameStatus,
  updateNickname,
  type NicknameStatus,
} from "@/app/actions/nickname";

interface Props {
  /**
   * When provided, the modal opens in "edit" mode controlled by the parent.
   * When omitted, the modal auto-opens in "initial" mode if the user has not
   * yet chosen a nickname.
   */
  open?: boolean;
  onClose?: () => void;
  /** Called after a successful save with the new (or kept) name. */
  onSaved?: (name: string) => void;
}

const NICK_MAX = 24;

export default function NicknameModal({ open: controlledOpen, onClose, onSaved }: Props) {
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

  return (
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
      </div>
    </div>
  );
}
