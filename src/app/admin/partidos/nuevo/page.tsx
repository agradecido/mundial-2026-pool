import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LinkSpinner } from "@/components/nav-button";
import NuevoPartidoForm from "@/components/admin/nuevo-partido-form";

export default async function NuevoPartidoPage() {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") redirect("/");

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
                <h2 className="text-lg font-semibold text-white">Nuevo partido</h2>
            </div>

            {/* Pre-relleno con el partido Alemania vs 3A/B/C/D/F que fue eliminado accidentalmente */}
            <NuevoPartidoForm
                defaults={{
                    equipoLocal: "Germany",
                    equipoVisitante: "3A/B/C/D/F",
                    fechaPartido: "2026-06-29T22:30",
                    fase: "DIECISEISAVOS",
                    estadio: "Gillette Stadium",
                    ciudad: "Boston (Foxborough)",
                }}
            />
        </div>
    );
}
