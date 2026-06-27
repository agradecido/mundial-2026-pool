import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import UsuariosTable from "@/components/admin/usuarios-table";
import CrearUsuarioModal from "@/components/admin/crear-usuario-modal";

export default async function AdminUsuariosPage() {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") redirect("/");

    const usuarios = await prisma.user.findMany({
        orderBy: { fechaRegistro: "asc" },
        select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            suspendido: true,
            fechaRegistro: true,
            ultimoAccesoQuiniela: true,
            _count: { select: { pronosticos: true } },
            pronosticos: { select: { puntosGanados: true } },
            prediccionFutura: {
                select: { puntosCampeon: true, puntosSubcampeon: true },
            },
        },
    });

    const serialized = usuarios.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        image: u.image,
        role: u.role,
        suspendido: u.suspendido,
        fechaRegistro: u.fechaRegistro.toISOString(),
        ultimoAccesoQuiniela: u.ultimoAccesoQuiniela?.toISOString() ?? null,
        _count: u._count,
        totalPuntos:
            u.pronosticos.reduce((s, p) => s + p.puntosGanados, 0) +
            (u.prediccionFutura
                ? u.prediccionFutura.puntosCampeon +
                u.prediccionFutura.puntosSubcampeon
                : 0),
    }));

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-white">Usuarios</h2>
                    <span className="text-xs text-gray-500">{serialized.length} registrados</span>
                </div>
                <CrearUsuarioModal />
            </div>

            <UsuariosTable usuarios={serialized} currentAdminId={session.user.id} />
        </div>
    );
}
