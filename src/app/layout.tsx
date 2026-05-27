import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Header from "@/components/header";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Porra Mundial 2026",
  description: "Quiniela de amigos para el Mundial de Fútbol 2026",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${geist.className} h-full`}>
      <body className="min-h-full flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
