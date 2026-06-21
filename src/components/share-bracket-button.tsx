"use client";

import { useState } from "react";
import { getFlag } from "@/lib/flags";
import type { BracketPicks } from "@/lib/bracket";

interface Props {
  userName: string;
  picks: BracketPicks;
  grupos: Record<string, string[]>;
}

export default function ShareBracketButton({ userName, picks, grupos }: Props) {
  const [sharing, setSharing] = useState(false);
  const gruposOrdenados = Object.entries(grupos).sort(([a], [b]) => a.localeCompare(b));

  async function handleShare() {
    setSharing(true);
    try {
      // ── Bracket element ────────────────────────────────────────────────────
      const outer = document.getElementById("bracket-desktop-view") as HTMLElement | null;
      const bracketEl = document.getElementById("bracket-capture-inner") as HTMLElement | null;
      if (!outer || !bracketEl) return;

      // Temporarily show any hidden ancestors so html-to-image can render
      const hiddenAncestors: HTMLElement[] = [];
      let node: HTMLElement | null = bracketEl.parentElement;
      while (node && node !== document.body) {
        if (getComputedStyle(node).display === "none") {
          hiddenAncestors.push(node);
          node.style.display = "block";
        }
        node = node.parentElement;
      }
      if (hiddenAncestors.length > 0) {
        await new Promise<void>(r => requestAnimationFrame(() => { requestAnimationFrame(() => r()); }));
      }

      // ── Grupos element: reveal for capture (opacity 0 → 1) ───────────────────
      const gruposEl = document.getElementById("grupos-print-inner") as HTMLElement | null;
      if (gruposEl) gruposEl.style.opacity = "1";

      // ── Apply print overrides to bracket winner elements ───────────────────
      const winnerBoxes = bracketEl.querySelectorAll<HTMLElement>("[data-bracket-winner='1']");
      const winnerTexts = bracketEl.querySelectorAll<HTMLElement>("[data-bracket-winner-text='1']");
      winnerBoxes.forEach(n => {
        n.style.backgroundColor = "transparent";
        n.style.borderColor = "#000000";
      });
      winnerTexts.forEach(n => {
        n.style.fontWeight = "700";
        n.style.color = "#111111";
      });

      const { toPng } = await import("html-to-image");

      const bracketDataUrl = await toPng(bracketEl, { backgroundColor: "#ffffff", pixelRatio: 2 });
      const gruposDataUrl = gruposEl
        ? await toPng(gruposEl, { backgroundColor: "#ffffff", pixelRatio: 2 })
        : null;

      // ── Revert overrides ───────────────────────────────────────────────────
      if (gruposEl) gruposEl.style.opacity = "0";
      winnerBoxes.forEach(n => { n.style.backgroundColor = ""; n.style.borderColor = ""; });
      winnerTexts.forEach(n => { n.style.fontWeight = ""; n.style.color = ""; });
      hiddenAncestors.forEach(n => { n.style.display = ""; });

      // ── Load images ────────────────────────────────────────────────────────
      const bracketImg = new Image();
      await new Promise<void>((resolve, reject) => {
        bracketImg.onload = () => resolve();
        bracketImg.onerror = reject;
        bracketImg.src = bracketDataUrl;
      });

      let gruposImg: HTMLImageElement | null = null;
      if (gruposDataUrl) {
        gruposImg = new Image();
        await new Promise<void>((resolve, reject) => {
          gruposImg!.onload = () => resolve();
          gruposImg!.onerror = reject;
          gruposImg!.src = gruposDataUrl;
        });
      }

      // ── Compose canvas ─────────────────────────────────────────────────────
      const PR = 2;
      const PAD_X = 20 * PR;
      const TITLE_H = 88 * PR;

      const canvas = document.createElement("canvas");
      canvas.width = bracketImg.width;
      canvas.height = TITLE_H + (gruposImg?.height ?? 0) + bracketImg.height;

      const ctx = canvas.getContext("2d")!;
      const font = `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      const dateStr = new Date().toLocaleDateString("es-ES", {
        day: "numeric", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#007a3d";
      ctx.font = `700 ${11 * PR}px ${font}`;
      ctx.fillText("PORRA DEL MUNDIAL 2026", PAD_X, 22 * PR);

      ctx.fillStyle = "#111111";
      ctx.font = `700 ${19 * PR}px ${font}`;
      ctx.fillText(`Porra de ${userName}`, PAD_X, 50 * PR);

      ctx.fillStyle = "#555555";
      ctx.font = `${12 * PR}px ${font}`;
      ctx.fillText(`porramundial.mdv.red · ${dateStr}`, PAD_X, 70 * PR);

      let y = TITLE_H;
      if (gruposImg) { ctx.drawImage(gruposImg, 0, y); y += gruposImg.height; }
      ctx.drawImage(bracketImg, 0, y);

      const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, "image/png"));
      if (!blob) return;

      const file = new File([blob], "mi-porra-mundial-2026.png", { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Mi Porra del Mundial 2026" });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "mi-porra-mundial-2026.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Share error:", err);
    } finally {
      setSharing(false);
    }
  }

  return (
    <>
      {/* ── Off-screen grupos + thirds capture layout ── */}
      <div
        id="grupos-print-inner"
        aria-hidden="true"
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          width: 1150,
          opacity: 0,
          pointerEvents: "none",
          zIndex: -9999,
          backgroundColor: "#ffffff",
          padding: "20px 24px 24px",
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          color: "#111111",
        }}
      >
        <p style={{ fontSize: 10, fontWeight: 700, color: "#888", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12, marginTop: 0 }}>
          Fase de Grupos — Clasificados
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
          {gruposOrdenados.map(([letra, teams]) => {
            const selected = picks.grupos?.[letra] ?? [];
            return (
              <div key={letra} style={{ border: "1px solid #e5e5e5", borderRadius: 8, padding: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: 20, height: 20, borderRadius: 4, backgroundColor: "#f0f0f0",
                    fontSize: 10, fontWeight: 700, color: "#333", flexShrink: 0,
                  }}>
                    {letra}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#666" }}>Grupo {letra}</span>
                </div>
                {teams.map(team => {
                  const idx = selected.indexOf(team);
                  const on = idx !== -1;
                  const orderLabel = idx === 0 ? "1°" : idx === 1 ? "2°" : null;
                  return (
                    <div
                      key={team}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "4px 6px", borderRadius: 6, marginBottom: 2,
                        border: on ? "1.5px solid #000" : "1.5px solid transparent",
                        opacity: on ? 1 : 0.2,
                      }}
                    >
                      <span style={{ fontSize: 18, lineHeight: "1", flexShrink: 0 }}>{getFlag(team)}</span>
                      <span style={{ flex: 1, fontSize: 12, fontWeight: on ? 700 : 400, color: "#111" }}>{team}</span>
                      {orderLabel && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#111", flexShrink: 0 }}>{orderLabel}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {(picks.terceros ?? []).length > 0 && (
          <>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#888", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10, marginTop: 0 }}>
              Mejores Terceros
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {(picks.terceros ?? []).map((team, idx) => (
                <div
                  key={team}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "5px 8px", borderRadius: 8,
                    border: "1.5px solid #000",
                  }}
                >
                  <span style={{ fontSize: 18, lineHeight: "1", flexShrink: 0 }}>{getFlag(team)}</span>
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: "#111" }}>{team}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#111", flexShrink: 0 }}>{idx + 1}°</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Button ── */}
      <button
        onClick={handleShare}
        disabled={sharing}
        className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.06] rounded-lg transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {sharing ? (
          <span className="animate-pulse">Generando…</span>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            Compartir
          </>
        )}
      </button>
    </>
  );
}
