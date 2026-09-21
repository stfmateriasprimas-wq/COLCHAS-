import React, { useState, useEffect } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
  durationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  durationMs = 3000
}) => {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Desvanecimiento de salida suave 600ms antes del final
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, Math.max(1600, durationMs - 600));

    // Transición fluida a la pantalla de Login
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
    setTimeout(onFinish, 180);
  };

  return (
    <div 
      onClick={handleSkip}
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none cursor-pointer overflow-hidden transition-all duration-600 ease-out ${
        isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{
        background: 'radial-gradient(ellipse at 50% 48%, #14171c 0%, #0c0e12 40%, #030406 100%)'
      }}
    >
      <style>{`
        /* Animación Cinemática 4K Dolly Zoom */
        @keyframes stfCinematic4k {
          0% {
            opacity: 0;
            transform: scale(0.72) translateY(14px);
            filter: blur(14px) brightness(0.4) contrast(1.15);
          }
          28% {
            opacity: 1;
            filter: blur(0px) brightness(1.22) contrast(1.08);
          }
          70% {
            opacity: 1;
            transform: scale(1.01) translateY(0px);
            filter: blur(0px) brightness(1.02) contrast(1.04);
          }
          100% {
            opacity: 1;
            transform: scale(1.04) translateY(0px);
            filter: blur(0px) brightness(1.05) contrast(1.05);
          }
        }

        /* Barrido de Haz de Luz Especular Cromado en 4K */
        @keyframes stfSpecularSweep {
          0% {
            transform: translateX(-160%) skewX(-28deg);
            opacity: 0;
          }
          30% {
            opacity: 0.95;
          }
          70% {
            opacity: 0.95;
          }
          100% {
            transform: translateX(260%) skewX(-28deg);
            opacity: 0;
          }
        }

        /* Halo Ambiental Pulsante */
        @keyframes stfNebulaPulse {
          0%, 100% {
            opacity: 0.38;
            transform: scale(0.90);
          }
          50% {
            opacity: 0.75;
            transform: scale(1.18);
          }
        }

        /* Expansión de la Línea de Luz Divisoria */
        @keyframes stfBeamExpand {
          0% {
            width: 0%;
            opacity: 0;
          }
          35% {
            opacity: 1;
          }
          80% {
            width: 92%;
            opacity: 0.9;
          }
          100% {
            width: 100%;
            opacity: 0.45;
          }
        }

        /* Revelado de Texto Institucional */
        @keyframes stfBrandReveal {
          0% {
            opacity: 0;
            transform: translateY(8px);
            letter-spacing: 0.16em;
          }
          45% {
            opacity: 0.55;
          }
          100% {
            opacity: 0.95;
            transform: translateY(0);
            letter-spacing: 0.25em;
          }
        }

        .stf-4k-logo-anim {
          animation: stfCinematic4k 2.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .stf-sweep-4k {
          animation: stfSpecularSweep 2.2s cubic-bezier(0.25, 1, 0.5, 1) 0.35s forwards;
        }

        .stf-nebula-anim {
          animation: stfNebulaPulse 3.4s ease-in-out infinite;
        }

        .stf-beam-anim {
          animation: stfBeamExpand 2.5s ease-out forwards;
        }

        .stf-brand-text {
          animation: stfBrandReveal 2.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* 1. HALO AMBIENTAL VOLUMÉTRICO (PLATINO / CHAMPAGNE ORO) */}
      <div 
        className="absolute w-[380px] sm:w-[720px] h-[380px] sm:h-[720px] rounded-full pointer-events-none stf-nebula-anim"
        style={{
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, rgba(225, 195, 120, 0.09) 34%, rgba(0, 0, 0, 0) 70%)',
          filter: 'blur(50px)'
        }}
      />

      {/* 2. CONTENEDOR CENTRAL DEL LOGO DEFINITIVO 3D 4K */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4 sm:px-8 max-w-md sm:max-w-2xl w-full text-center">
        
        {/* LOGO 3D EN RESOLUCIÓN 4K ULTRA-HD (TRANSPARENTE SIN FONDO) */}
        <div className="stf-4k-logo-anim relative w-full flex flex-col items-center">
          
          <div className="relative w-full max-w-[320px] sm:max-w-[540px] md:max-w-[620px] overflow-hidden">
            <img 
              src="/stf-group-3d-logo.png" 
              alt="STF GROUP S.A. • STUDIO F • ELA • STUDIO F MAN (Definitive 4K 3D Edition)"
              className="w-full h-auto object-contain block drop-shadow-[0_20px_35px_rgba(0,0,0,0.98)] drop-shadow-[0_0_25px_rgba(255,255,255,0.22)]"
              style={{
                imageRendering: 'auto',
                filter: 'contrast(1.08) brightness(1.06)'
              }}
            />

            {/* Haz de luz de destello especular cromado / dorado en 4K */}
            <div 
              className="absolute inset-0 pointer-events-none stf-sweep-4k"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.0) 25%, rgba(255, 255, 255, 0.50) 50%, rgba(230, 200, 125, 0.38) 60%, transparent 80%)',
                mixBlendMode: 'color-dodge'
              }}
            />
          </div>

          {/* LÍNEA DE LUZ EXPANSIVA METÁLICA */}
          <div className="w-full max-w-[280px] sm:max-w-[480px] h-[1.5px] bg-gradient-to-r from-transparent via-amber-200/50 via-white/85 to-transparent mt-5 stf-beam-anim" />

          {/* SUBTÍTULO INSTITUCIONAL DE TRAZABILIDAD */}
          <div className="mt-4 space-y-1 stf-brand-text">
            <span className="text-[10.5px] sm:text-[12.5px] font-sans font-bold text-zinc-200 uppercase tracking-[0.24em] block drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
              Control de Calidad & Trazabilidad Textil
            </span>
            <span className="text-[8.5px] sm:text-[10px] font-mono text-zinc-400 tracking-[0.20em] block uppercase drop-shadow-[0_1px_5px_rgba(0,0,0,0.8)]">
              Planta Principal • Atelier Zona Franca • Laboratorio
            </span>
          </div>

        </div>

      </div>

      {/* 3. MICRO INDICADOR INFERIOR PARA SALTAR */}
      <div className="absolute bottom-6 sm:bottom-8 z-10 text-[9px] sm:text-[10px] font-mono text-zinc-500 tracking-wider flex items-center gap-1.5 transition-opacity duration-300 opacity-60 hover:opacity-100">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-200/80 animate-ping" />
        <span>Toca en cualquier lugar para continuar</span>
      </div>

    </div>
  );
};
