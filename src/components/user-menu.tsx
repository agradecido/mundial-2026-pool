"use client";

import { useState } from "react";
import Image from "next/image";
import NicknameModal from "@/components/nickname-modal";

interface Props {
  name: string | null | undefined;
  image: string | null | undefined;
  signOutAction: () => Promise<void>;
}

export default function UserMenu({ name, image, signOutAction }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [displayName, setDisplayName] = useState(name ?? "—");

  return (
    <>
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="flex items-center gap-2.5 group rounded-full hover:bg-white/5 -ml-1 p-1 transition-colors"
          title="Cambiar nombre"
        >
          {image && (
            <Image
              src={image}
              alt=""
              width={32}
              height={32}
              className="rounded-full ring-2 ring-[#00e87a]/30 group-hover:ring-[#00e87a]/60 transition-all"
            />
          )}
          <span className="hidden sm:block text-sm text-gray-300 max-w-[120px] truncate group-hover:text-white transition-colors">
            {displayName}
          </span>
        </button>
        <form action={signOutAction}>
          <button
            type="submit"
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-400 hover:border-white/20 hover:text-white transition-colors"
          >
            Salir
          </button>
        </form>
      </div>

      <NicknameModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={(newName) => setDisplayName(newName || "—")}
      />
    </>
  );
}
