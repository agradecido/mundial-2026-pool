import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getConfiguracion } from "@/lib/configuracion";
import AjustesPanel from "@/components/admin/ajustes-panel";

export default async function AdminAjustesPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/");

  const configuracion = await getConfiguracion();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Ajustes</h2>
      </div>

      <AjustesPanel mostrarPronosticosAntes={configuracion.mostrarPronosticosAntes} />
    </div>
  );
}
