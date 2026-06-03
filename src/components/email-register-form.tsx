"use client";

import { useActionState } from "react";
import { registerWithEmail } from "@/app/actions/auth";
import Link from "next/link";

export default function EmailRegisterForm() {
  const [state, action, isPending] = useActionState(registerWithEmail, null);

  return (
    <form action={action} className="space-y-3">
      <div>
        <input
          type="text"
          name="name"
          placeholder="Nombre o apodo"
          required
          autoComplete="name"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-[#00e87a]/50 focus:bg-white/8 transition-all"
        />
      </div>
      <div>
        <input
          type="email"
          name="email"
          placeholder="Email"
          required
          autoComplete="email"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-[#00e87a]/50 focus:bg-white/8 transition-all"
        />
      </div>
      <div>
        <input
          type="password"
          name="password"
          placeholder="Contraseña (mín. 8 caracteres)"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-[#00e87a]/50 focus:bg-white/8 transition-all"
        />
      </div>
      {state?.error && (
        <p className="text-xs text-red-400">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-[#00e87a]/10 border border-[#00e87a]/30 px-5 py-3 text-sm font-medium text-[#00e87a] transition-all hover:bg-[#00e87a]/20 hover:border-[#00e87a]/50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Creando cuenta…" : "Crear cuenta"}
      </button>
      <p className="text-center text-xs text-gray-600">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-[#00e87a]/70 hover:text-[#00e87a] transition-colors">
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}
