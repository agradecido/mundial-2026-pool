"use client";

import { useState } from "react";

interface Props {
  codigo: string;
}

export default function GrupoInvitePanel({ codigo }: Props) {
  const [copied, setCopied] = useState(false);

  const url = typeof window !== "undefined"
    ? `${window.location.origin}/grupo/${codigo}/unirse`
    : `/grupo/${codigo}/unirse`;

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">Link de invitación</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-300">
          {url}
        </code>
        <button
          onClick={copy}
          className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-400 hover:border-white/20 hover:text-white transition-colors"
        >
          {copied ? "¡Copiado!" : "Copiar"}
        </button>
      </div>
      <p className="text-xs text-gray-600">
        Comparte este enlace. Cualquiera con el link puede unirse hasta que empiece el Mundial.
      </p>
    </div>
  );
}
