import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ModalesPanel from "@/components/admin/modales-panel";

export default async function AdminModalesPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/");

  const modales = await prisma.modal.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { dismissals: true } },
    },
  });

  const totalUsers = await prisma.user.count();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Modales de anuncio</h2>
        <span className="text-xs text-gray-500">{modales.length} modales</span>
      </div>

      <ModalesPanel modales={modales} totalUsers={totalUsers} />
    </div>
  );
}
