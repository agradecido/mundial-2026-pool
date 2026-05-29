"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getWelcomeModalViews, incrementWelcomeModalViews } from "@/app/actions/welcome-modal";

const MAX_VIEWS = 2;

export default function WelcomeModal() {
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // Check if we should show the modal
        async function checkModalViews() {
            const views = await getWelcomeModalViews();

            if (views !== null && views < MAX_VIEWS) {
                // Show modal after a brief delay for better UX
                setTimeout(() => {
                    setIsOpen(true);
                }, 500);

                // Increment view count
                await incrementWelcomeModalViews();
            }
        }

        checkModalViews();
    }, []);

    const handleClose = () => {
        setIsOpen(false);
    };

    const handleGoToHelp = () => {
        setIsOpen(false);
        router.push("/ayuda");
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md glass-card p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in-95 duration-300">
                {/* Close button */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                    aria-label="Cerrar"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>

                {/* Icon */}
                <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00e87a]/20 to-blue-400/20 flex items-center justify-center text-3xl">
                        🎉
                    </div>
                </div>

                {/* Title */}
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold text-white">
                        ¡Bienvenido!
                    </h2>
                    <p className="text-sm text-gray-400">
                        Mundial de Fútbol 2026
                    </p>
                </div>

                {/* Content */}
                <div className="space-y-4">
                    <div className="rounded-lg border border-green-400/20 bg-green-400/5 px-4 py-3 space-y-2">
                        <p className="text-xs text-green-300 text-center font-semibold">
                            ✨ ¡Juega sin miedo!
                        </p>
                        <p className="text-xs text-gray-400 text-center leading-relaxed">
                            Puedes modificar tus predicciones hasta <strong className="text-white">15 minutos antes</strong> del inicio del Mundial (Porra) o de cada partido (Quiniela)
                        </p>
                    </div>

                    <p className="text-sm text-gray-300 text-center leading-relaxed">
                        Participa en <strong className="text-white">dos competiciones independientes</strong> con sus propios rankings:
                    </p>

                    <div className="space-y-3">
                        <div className="rounded-lg border border-[#00e87a]/20 bg-[#00e87a]/5 p-3">
                            <h3 className="text-sm font-semibold text-[#00e87a] mb-1">
                                🏆 Porra
                            </h3>
                            <p className="text-xs text-gray-400">
                                Predice el bracket completo antes del inicio del torneo
                            </p>
                        </div>

                        <div className="rounded-lg border border-blue-400/20 bg-blue-400/5 p-3">
                            <h3 className="text-sm font-semibold text-blue-300 mb-1">
                                ⚽ Quiniela
                            </h3>
                            <p className="text-xs text-gray-400">
                                Pronostica el marcador exacto partido a partido
                            </p>
                        </div>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                        <p className="text-xs text-gray-400 text-center">
                            Puedes cambiar tu nombre visible haciendo clic en tu nombre en la <strong className="text-white">esquina superior derecha</strong>
                        </p>
                    </div>

                    <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-4 py-3">
                        <p className="text-xs text-amber-300/90 text-center">
                            Visita la sección de <strong>Ayuda</strong> para conocer todas las reglas y sistemas de puntuación
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                        onClick={handleGoToHelp}
                        className="flex-1 px-4 py-2.5 bg-[#00e87a] hover:bg-[#00d970] text-black font-semibold rounded-lg transition-colors text-sm"
                    >
                        Ver reglas
                    </button>
                    <button
                        onClick={handleClose}
                        className="flex-1 px-4 py-2.5 glass-card hover:bg-white/[0.08] text-white font-semibold rounded-lg transition-colors text-sm"
                    >
                        Continuar
                    </button>
                </div>
            </div>
        </div>
    );
}
