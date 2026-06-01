"use client";

import { useState } from "react";

interface Props {
  userName: string;
}

export default function ShareBracketButton({ userName }: Props) {
  const [sharing, setSharing] = useState(false);

  async function handleShare() {
    setSharing(true);
    try {
      const outer = document.getElementById("bracket-desktop-view") as HTMLElement | null;
      const el = document.getElementById("bracket-capture-inner") as HTMLElement | null;
      if (!outer || !el) return;

      // Temporarily show any hidden ancestors so html-to-image can render the element
      const hiddenAncestors: HTMLElement[] = [];
      let node: HTMLElement | null = el.parentElement;
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

      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(el, { backgroundColor: "#0f0f0f", pixelRatio: 2 });

      // Restore hidden ancestors
      hiddenAncestors.forEach(n => { n.style.display = ""; });

      // Compose final image: title header + bracket
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = dataUrl;
      });

      const PR = 2;
      const PAD_X = 20 * PR;
      const TITLE_H = 88 * PR;

      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height + TITLE_H;

      const ctx = canvas.getContext("2d")!;
      const font = `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      const dateStr = new Date().toLocaleDateString("es-ES", {
        day: "numeric", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });

      ctx.fillStyle = "#0f0f0f";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#00e87a";
      ctx.font = `700 ${11 * PR}px ${font}`;
      ctx.fillText("PORRA DEL MUNDIAL 2026", PAD_X, 22 * PR);

      ctx.fillStyle = "#ffffff";
      ctx.font = `700 ${19 * PR}px ${font}`;
      ctx.fillText(`Porra de ${userName}`, PAD_X, 50 * PR);

      ctx.fillStyle = "#555555";
      ctx.font = `${12 * PR}px ${font}`;
      ctx.fillText(`porramundial.mdv.red · ${dateStr}`, PAD_X, 70 * PR);

      ctx.drawImage(img, 0, TITLE_H);

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
  );
}
