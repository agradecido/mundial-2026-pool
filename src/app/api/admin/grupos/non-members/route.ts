import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const codigo = searchParams.get("codigo");
  if (!codigo) return NextResponse.json({ error: "Missing codigo" }, { status: 400 });

  const grupo = await prisma.grupo.findUnique({
    where: { codigo },
    include: { miembros: { select: { userId: true } } },
  });
  if (!grupo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const memberIds = grupo.miembros.map((m) => m.userId);

  const users = await prisma.user.findMany({
    where: memberIds.length > 0 ? { id: { notIn: memberIds } } : {},
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}
