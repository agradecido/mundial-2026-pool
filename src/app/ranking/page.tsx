import { redirect } from "next/navigation";

export default async function RankingPage() {
  // Redirect to Quiniela ranking by default
  redirect("/quiniela/ranking");
}
