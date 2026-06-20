"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { generarBadges } from "@/lib/badges";

export async function generarBadgesAction(): Promise<{ ok: boolean; mensaje: string }> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/");
  return generarBadges();
}
