import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-6xl mb-4">⚽</p>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        Bienvenido, {session?.user?.name}
      </h1>
      <p className="text-gray-500 mb-8">
        El Mundial 2026 arranca pronto. ¡Haz tus pronósticos!
      </p>
      <div className="flex gap-4">
        <a
          href="/partidos"
          className="rounded-lg bg-green-700 px-6 py-3 text-white font-medium hover:bg-green-600 transition-colors"
        >
          Ver partidos
        </a>
        <a
          href="/ranking"
          className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
        >
          Ranking
        </a>
      </div>
    </div>
  );
}
