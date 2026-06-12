"use client";

import { useState } from "react";
import Image from "next/image";
import ProfileModal from "@/components/profile-modal";

interface Props {
    name: string | null | undefined;
    image: string | null | undefined;
    role?: string | null;
    signOutAction: () => Promise<void>;
}

export default function UserMenu({ name, image, role, signOutAction }: Props) {
    const [editOpen, setEditOpen] = useState(false);
    const [displayName, setDisplayName] = useState(name ?? "—");

    return (
        <>
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
                <span className="text-sm text-gray-300 max-w-[52px] sm:max-w-[120px] truncate group-hover:text-white transition-colors">
                    {displayName}
                </span>
            </button>

            <ProfileModal
                open={editOpen}
                onClose={() => setEditOpen(false)}
                onSaved={(newName) => setDisplayName(newName || "—")}
                role={role}
                signOutAction={signOutAction}
            />

        </>
    );
}
