"use client";

import { useState, useTransition } from "react";
import { sendBulkEmail } from "@/app/admin/emails/actions";

interface Props {
  totalUsers: number;
}

export default function EmailComposer({ totalUsers }: Props) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  const [isPending, startTransition] = useTransition();

  const valid = subject.trim().length > 0 && body.trim().length > 0;

  const handleSend = () => {
    startTransition(async () => {
      const res = await sendBulkEmail({ subject, body });
      setResult(res);
      setConfirm(false);
    });
  };

  if (result) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4 text-center">
        <p className="text-4xl">
          {result.failed === 0 ? "✅" : result.sent === 0 ? "❌" : "⚠️"}
        </p>
        <div>
          <p className="font-semibold text-white text-lg">
            {result.failed === 0
              ? "Emails enviados"
              : result.sent === 0
                ? "Error al enviar"
                : "Envío parcial"}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {result.sent} enviados · {result.failed} fallidos
          </p>
        </div>
        <button
          onClick={() => {
            setResult(null);
            setSubject("");
            setBody("");
          }}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          Redactar otro
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
        <input
          type="text"
          placeholder="Asunto del email"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/25"
        />

        <div className="space-y-1">
          <textarea
            placeholder="Cuerpo del email (acepta HTML)"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/25 resize-y font-mono"
          />
          <p className="text-[10px] text-gray-600">
            Acepta HTML:{" "}
            <code className="text-gray-500">&lt;strong&gt;</code>{" "}
            <code className="text-gray-500">&lt;em&gt;</code>{" "}
            <code className="text-gray-500">&lt;a href=&quot;…&quot;&gt;</code>{" "}
            <code className="text-gray-500">&lt;ul&gt;&lt;li&gt;</code>{" "}
            <code className="text-gray-500">&lt;br&gt;</code>
          </p>
        </div>

        {body && (
          <div className="rounded-lg border border-white/8 bg-white/[0.02] px-4 py-3">
            <p className="text-[10px] text-gray-600 mb-2 uppercase tracking-wider">
              Vista previa del cuerpo
            </p>
            <div
              className="modal-html text-sm text-gray-400 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: body }}
            />
          </div>
        )}
      </div>

      {confirm ? (
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 space-y-3">
          <p className="text-sm text-amber-300/90">
            ¿Confirmas el envío a <strong className="text-amber-200">{totalUsers} usuarios</strong>?
            Esta acción no se puede deshacer.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleSend}
              disabled={isPending}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg text-sm transition-colors disabled:opacity-40"
            >
              {isPending ? "Enviando…" : `Enviar a ${totalUsers} usuarios`}
            </button>
            <button
              onClick={() => setConfirm(false)}
              disabled={isPending}
              className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-gray-300 hover:text-white text-sm transition-colors disabled:opacity-40"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setConfirm(true)}
          disabled={!valid}
          className="w-full px-4 py-2.5 bg-[#00e87a] hover:bg-[#00d970] text-black font-semibold rounded-lg text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Enviar a {totalUsers} usuarios
        </button>
      )}
    </div>
  );
}
