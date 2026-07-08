import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { LinkSpinner } from "@/components/nav-button";
import PartidoEditForm from "@/components/admin/partido-edit-form";
import EliminarPartidoButton from "@/components/admin/eliminar-partido-button";
import { computeActualBracket } from "@/lib/bracket-scoring";
import { resolveDbCode } from "@/lib/bracket";

export default async function PartidoEditPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const session = await auth();
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "EDITOR") redirect("/");

    const { id } = await params;
    const [partido, allPartidos] = await Promise.all([
        prisma.partido.findUnique({ where: { id } }),
        prisma.partido.findMany({
            select: {
                equipoLocal: true, equipoVisitante: true,
                golesLocalReal: true, golesVisitanteReal: true,
                ganadorPenales: true,
                estado: true, fase: true, grupo: true,
            },
        }),
    ]);
    if (!partido) notFound();

    const bracket = computeActualBracket(allPartidos);

    const isSlotCode = (name: string) =>
        /^\d/.test(name) || name.includes("/") || /^[WL]\d/.test(name);

    const resolvedLocal = isSlotCode(partido.equipoLocal)
        ? (resolveDbCode(partido.equipoLocal, bracket) ?? partido.equipoLocal)
        : partido.equipoLocal;
    const resolvedVisitante = isSlotCode(partido.equipoVisitante)
        ? (resolveDbCode(partido.equipoVisitante, bracket) ?? partido.equipoVisitante)
        : partido.equipoVisitante;

    const serialized = {
        ...partido,
        equipoLocal: resolvedLocal,
        equipoVisitante: resolvedVisitante,
        fechaPartido: partido.fechaPartido.toISOString(),
        ganadorPenales: partido.ganadorPenales ?? null,
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

            <div className="border-t border-white/10 pt-6">
                <EliminarPartidoButton partidoId={id} />
            </div>
        </div>
    );
}
