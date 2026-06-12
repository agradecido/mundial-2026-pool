"use client";

import { useState, useEffect, useTransition } from "react";
import { usePathname } from "next/navigation";
import { dismissModal } from "@/app/actions/modals";

interface ModalData {
  id: string;
  slug: string;
  title: string;
  body: string;
  emoji: string;
}

export function ModalAnnouncements() {
  const pathname = usePathname();
  const [queue, setQueue] = useState<ModalData[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    fetch("/api/modals")
      .then((r) => r.json())
      .then((data: ModalData[]) => setQueue(data))
      .catch(() => {});
  }, [pathname]);

  const current = queue[0];
  if (!current) return null;

  const handleDismiss = () => {
    startTransition(async () => {
      await dismissModal(current.id);
      setQueue((q) => q.slice(1));
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div className="relative w-full max-w-md glass-card p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in-95 duration-300">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00e87a]/20 to-blue-400/20 flex items-center justify-center text-3xl">
            {current.emoji}
          </div>
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold text-white">{current.title}</h2>
        </div>

        <div
          className="modal-html text-sm text-gray-400 leading-relaxed text-center"
          dangerouslySetInnerHTML={{ __html: current.body }}
        />

        {queue.length > 1 && (
          <p className="text-xs text-gray-600 text-center">
            {queue.length - 1} más por ver
          </p>
        )}

        <div className="pt-1">
          <button
            onClick={handleDismiss}
            disabled={isPending}
            className="w-full px-4 py-2.5 bg-[#00e87a] hover:bg-[#00d970] text-black font-semibold rounded-lg transition-colors text-sm disabled:opacity-50"
          >
            {isPending ? "Guardando…" : "Entendido, no mostrar más"}
          </button>
        </div>
      </div>
    </div>
  );
}
