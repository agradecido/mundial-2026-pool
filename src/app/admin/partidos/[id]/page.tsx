import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { LinkSpinner } from "@/components/nav-button";
import PartidoEditForm from "@/components/admin/partido-edit-form";

export default async function PartidoEditPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const session = await auth();
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "EDITOR") redirect("/");

    const { id } = await params;
    const partido = await prisma.partido.findUnique({ where: { id } });
    if (!partido) notFound();

    const serialized = {
        ...partido,
        fechaPartido: partido.fechaPartido.toISOString(),
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Link
                    href="/admin/partidos"
                    className="inline-flex items-center gap-2 text-xs text-gray-500 hover:text-white transition-colors"
                >
                    ← Volver
                    <LinkSpinner className="size-3 shrink-0" />
                </Link>
                <span className="text-gray-700">·</span>
                <h2 className="text-lg font-semibold text-white">
                    Editar partido
                </h2>
            </div>

            <PartidoEditForm partido={serialized} />
        </div>
    );
}
