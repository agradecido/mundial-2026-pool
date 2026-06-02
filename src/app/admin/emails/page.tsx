import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EmailComposer from "@/components/admin/email-composer";

export default async function AdminEmailsPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/");

  const totalUsers = await prisma.user.count({
    where: { email: { not: undefined } },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Enviar email</h2>
        <span className="text-xs text-gray-500">{totalUsers} destinatarios</span>
      </div>

      <EmailComposer totalUsers={totalUsers} />
    </div>
  );
}
