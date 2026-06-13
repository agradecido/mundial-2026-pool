"use client";

import { useEffect, useState } from "react";

const LS_KEY = "swipe-hint-seen-v1";

export default function SwipeHint({ enabled }: { enabled: boolean }) {
  const [phase, setPhase] = useState<"hidden" | "in" | "visible" | "out">("hidden");

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(LS_KEY)) return;

    // Small delay so the modal finishes its entrance animation first
    const enterTimer = setTimeout(() => setPhase("in"), 400);
    const visibleTimer = setTimeout(() => setPhase("visible"), 600);
    const outTimer = setTimeout(() => setPhase("out"), 2800);
    const doneTimer = setTimeout(() => {
      setPhase("hidden");
      localStorage.setItem(LS_KEY, "1");
    }, 3300);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(visibleTimer);
      clearTimeout(outTimer);
      clearTimeout(doneTimer);
    };
  }, [enabled]);

  function dismiss() {
    if (phase === "hidden") return;
    setPhase("out");
    setTimeout(() => {
      setPhase("hidden");
      localStorage.setItem(LS_KEY, "1");
    }, 400);
  }

  if (phase === "hidden") return null;

  return (
    <>
      <style>{`
        @keyframes swipe-ltr {
          0%   { transform: translateX(-14px); opacity: 0.3; }
          50%  { transform: translateX(14px);  opacity: 1;   }
          100% { transform: translateX(-14px); opacity: 0.3; }
        }
        @keyframes key-pulse-l {
          0%, 100% { opacity: 0.4; transform: translateX(0); }
          50%       { opacity: 1;   transform: translateX(-4px); }
        }
        @keyframes key-pulse-r {
          0%, 100% { opacity: 0.4; transform: translateX(0); }
          50%       { opacity: 1;   transform: translateX(4px); }
        }
        .swipe-ltr  { animation: swipe-ltr  1.4s ease-in-out infinite; }
        .key-left   { animation: key-pulse-l 1.2s ease-in-out infinite; }
        .key-right  { animation: key-pulse-r 1.2s ease-in-out 0.6s infinite; }
      `}</style>

      {/* Backdrop over the content area */}
      <div
        className={`absolute inset-0 z-30 flex items-center justify-center cursor-pointer
          transition-opacity duration-500
          ${phase === "in" ? "opacity-0" : phase === "out" ? "opacity-0" : "opacity-100"}`}
        onClick={dismiss}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] rounded-2xl" />

        <div className="relative flex flex-col items-center gap-5 px-8 py-6 rounded-2xl border border-white/10 bg-white/[0.04] shadow-2xl mx-4">

          {/* ── Mobile hint ── */}
          <div className="flex sm:hidden flex-col items-center gap-4">
            <div className="flex items-center gap-4">
              <span className="text-2xl text-gray-500">‹</span>
              <span className="text-3xl swipe-ltr select-none">👆</span>
              <span className="text-2xl text-gray-500">›</span>
            </div>
            <p className="text-sm font-semibold text-white text-center leading-snug">
              Desliza para ver<br />otros jugadores
            </p>
          </div>

          {/* ── Desktop hint ── */}
          <div className="hidden sm:flex flex-col items-center gap-4">
            <div className="flex items-center gap-3">
              <kbd className="key-left inline-flex items-center justify-center w-9 h-9 rounded-lg border border-white/20 bg-white/8 text-white text-base font-bold shadow-inner">
                ←
              </kbd>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-2xl select-none">🖱️</span>
              </div>
              <kbd className="key-right inline-flex items-center justify-center w-9 h-9 rounded-lg border border-white/20 bg-white/8 text-white text-base font-bold shadow-inner">
                →
              </kbd>
            </div>
            <p className="text-sm font-semibold text-white text-center leading-snug">
              Usa las flechas para navegar<br />entre jugadores
            </p>
          </div>

          <p className="text-[11px] text-gray-600">Toca para continuar</p>
        </div>
      </div>
    </>
  );
}
