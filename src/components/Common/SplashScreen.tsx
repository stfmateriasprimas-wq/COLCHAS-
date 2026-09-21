import React, { useState, useEffect } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
  durationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  durationMs = 2600
}) => {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Iniciar desvanecimiento de salida 500ms antes del fin
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, Math.max(1200, durationMs - 550));

    // Finalizar intro y dar paso al Login
    const finishTimer = setTimeout(() => {
      onFinish();
    }, durationMs);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [durationMs, onFinish]);

  // Permitir omitir la animación al hacer clic o tocar la pantalla
  const handleSkip = () => {
    setIsFadingOut(true);
    setTimeout(onFinish, 200);
  };

  return (
    <div 
      onClick={handleSkip}
      className={`fixed inset-0 z-9999 flex flex-col items-center justify-center bg-black select-none cursor-pointer overflow-hidden transition-all duration-500 ease-out ${
        isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{
        backgroundColor: '#000000'
      }}
    >
      <style>{`
        @keyframes stfCinematicZoom {
          0% {
            opacity: 0;
            transform: scale(0.60) translateY(12px);
            filter: blur(10px) brightness(0.5);
          }
          25% {
            opacity: 1;
            filter: blur(0px) brightness(1.25);
          }
          75% {
            opacity: 1;
            transform: scale(1.02) translateY(0px);
            filter: blur(0px) brightness(1.0);
          }
          100% {
            opacity: 0.95;
            transform: scale(1.05) translateY(0px);
            filter: blur(0px) brightness(1.05);
          }
        }

        @keyframes stfAuraGlow {
          0%, 100% {
            opacity: 0.20;
            transform: scale(0.85);
          }
          50% {
            opacity: 0.45;
            transform: scale(1.18);
          }
        }

        @keyframes stfShimmerBar {
          0% {
            width: 0%;
            opacity: 0;
          }
          30% {
            opacity: 1;
          }
          80% {
            width: 85%;
            opacity: 0.9;
          }
          100% {
            width: 100%;
            opacity: 0;
          }
        }

        @keyframes stfTextReveal {
          0% {
            opacity: 0;
            transform: translateY(8px);
            letter-spacing: 0.15em;
          }
          40% {
            opacity: 0.6;
          }
          80% {
            opacity: 1;
            transform: translateY(0);
            letter-spacing: 0.25em;
          }
          100% {
            opacity: 0.9;
            transform: translateY(0);
            letter-spacing: 0.25em;
          }
        }

        .stf-logo-animation {
          animation: stfCinematicZoom 2.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .stf-aura-animation {
          animation: stfAuraGlow 3s ease-in-out infinite;
        }

        .stf-shimmer-animation {
          animation: stfShimmerBar 2.2s ease-out forwards;
        }

        .stf-subtitle-animation {
          animation: stfTextReveal 2.1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* 1. HALO LUMINOSO AMBIENTAL DE FONDO */}
      <div 
        className="absolute w-[320px] sm:w-[540px] h-[320px] sm:h-[540px] rounded-full pointer-events-none stf-aura-animation"
        style={{
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.12) 0%, rgba(212, 175, 55, 0.05) 35%, rgba(0, 0, 0, 0) 70%)',
          filter: 'blur(35px)'
        }}
      />

      {/* 2. CONTENEDOR CENTRAL DEL LOGO STF GROUP */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6 max-w-md sm:max-w-xl w-full text-center">
        
        {/* IMAGEN OFICIAL DEL LOGO STF GROUP CON ANIMACIÓN ZOOM */}
        <div className="stf-logo-animation w-full flex flex-col items-center">
          <img 
            src="/stf-group-splash-logo.jpg" 
            alt="STF GROUP S.A. • STUDIO F • ELA • STUDIO F MAN"
            className="w-full max-w-[320px] sm:max-w-[460px] h-auto object-contain drop-shadow-[0_0_25px_rgba(255,255,255,0.25)]"
            style={{
              mixBlendMode: 'screen',
              filter: 'contrast(1.08) brightness(1.05)'
            }}
          />

          {/* LÍNEA DE LUZ EXPANSIVA SUTIL */}
          <div className="w-full max-w-[280px] sm:max-w-[400px] h-[1px] bg-linear-to-r from-transparent via-white/60 to-transparent mt-4 stf-shimmer-animation" />

          {/* SUBTÍTULO INSTITUCIONAL DE TRAZABILIDAD */}
          <div className="mt-4 space-y-1 stf-subtitle-animation">
            <span className="text-[10px] sm:text-[11.5px] font-sans font-bold text-zinc-300 uppercase tracking-[0.22em] block">
              Control de Calidad & Trazabilidad Textil
            </span>
            <span className="text-[8.5px] sm:text-[9.5px] font-mono text-zinc-500 tracking-[0.18em] block uppercase">
              Planta Principal • Atelier Zona Franca • Laboratorio
            </span>
          </div>
        </div>

      </div>

      {/* 3. MICRO INDICADOR INFERIOR PARA SALTAR */}
      <div className="absolute bottom-6 sm:bottom-8 z-10 text-[9px] sm:text-[10px] font-mono text-zinc-600 tracking-wider flex items-center gap-1.5 transition-opacity duration-300 opacity-60 hover:opacity-100">
        <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-ping" />
        <span>Toca en cualquier lugar para continuar</span>
      </div>

    </div>
  );
};
