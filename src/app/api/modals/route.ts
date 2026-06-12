import { NextResponse } from "next/server";
import { getActiveModalsForUser } from "@/app/actions/modals";

export async function GET() {
  const modals = await getActiveModalsForUser();
  return NextResponse.json(modals);
}
