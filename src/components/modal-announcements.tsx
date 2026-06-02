"use client";

import { useState, useTransition } from "react";
import { dismissModal } from "@/app/actions/modals";

interface ModalData {
  id: string;
  slug: string;
  title: string;
  body: string;
  emoji: string;
}

export function ModalAnnouncements({ modals }: { modals: ModalData[] }) {
  const [queue, setQueue] = useState(modals);
  const [isPending, startTransition] = useTransition();

  const current = queue[0];
  if (!current) return null;

  const advance = () => setQueue((q) => q.slice(1));

  const handleDismiss = () => {
    startTransition(async () => {
      await dismissModal(current.id);
      advance();
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={advance}
      />

      <div className="relative w-full max-w-md glass-card p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in-95 duration-300">
        <button
          onClick={advance}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
          aria-label="Cerrar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00e87a]/20 to-blue-400/20 flex items-center justify-center text-3xl">
            {current.emoji}
          </div>
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold text-white pr-6">{current.title}</h2>
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

        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <button
            onClick={handleDismiss}
            disabled={isPending}
            className="flex-1 px-4 py-2.5 bg-[#00e87a] hover:bg-[#00d970] text-black font-semibold rounded-lg transition-colors text-sm disabled:opacity-50"
          >
            Entendido, no mostrar más
          </button>
          <button
            onClick={advance}
            className="flex-1 px-4 py-2.5 glass-card hover:bg-white/[0.08] text-white font-semibold rounded-lg transition-colors text-sm"
          >
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );
}
