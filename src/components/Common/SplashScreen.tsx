import React, { useState, useEffect } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
  durationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  durationMs = 2900
}) => {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Iniciar desvanecimiento de salida suave 550ms antes del fin
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, Math.max(1500, durationMs - 550));

    // Finalizar intro y dar paso a la pantalla de Login
    const finishTimer = setTimeout(() => {
      onFinish();
    }, durationMs);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [durationMs, onFinish]);

  // Permitir omitir la animación inmediatamente al hacer clic o tocar
  const handleSkip = () => {
    setIsFadingOut(true);
    setTimeout(onFinish, 180);
  };

  return (
    <div 
      onClick={handleSkip}
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none cursor-pointer overflow-hidden transition-all duration-500 ease-out ${
        isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{
        background: 'radial-gradient(circle at 50% 46%, #181b20 0%, #0d0f12 45%, #050608 100%)'
      }}
    >
      <style>{`
        @keyframes stfCinematic3D {
          0% {
            opacity: 0;
            transform: perspective(1200px) scale(0.68) translateY(18px) rotateX(4deg);
            filter: blur(8px) brightness(0.5);
          }
          30% {
            opacity: 1;
            filter: blur(0px) brightness(1.25);
          }
          70% {
            opacity: 1;
            transform: perspective(1200px) scale(1.02) translateY(0px) rotateX(0deg);
            filter: blur(0px) brightness(1.02);
          }
          100% {
            opacity: 1;
            transform: perspective(1200px) scale(1.05) translateY(0px) rotateX(0deg);
            filter: blur(0px) brightness(1.05);
          }
        }

        @keyframes stfChromeSweep {
          0% {
            transform: translateX(-150%) skewX(-25deg);
            opacity: 0;
          }
          35% {
            opacity: 0.9;
          }
          75% {
            opacity: 0.9;
          }
          100% {
            transform: translateX(250%) skewX(-25deg);
            opacity: 0;
          }
        }

        @keyframes stfHaloPulse {
          0%, 100% {
            opacity: 0.35;
            transform: scale(0.92);
          }
          50% {
            opacity: 0.70;
            transform: scale(1.15);
          }
        }

        @keyframes stfSubLine {
          0% {
            width: 0%;
            opacity: 0;
          }
          35% {
            opacity: 1;
          }
          85% {
            width: 90%;
            opacity: 0.9;
          }
          100% {
            width: 100%;
            opacity: 0.4;
          }
        }

        @keyframes stfSubText {
          0% {
            opacity: 0;
            transform: translateY(6px);
            letter-spacing: 0.15em;
          }
          50% {
            opacity: 0.5;
          }
          100% {
            opacity: 0.95;
            transform: translateY(0);
            letter-spacing: 0.24em;
          }
        }

        .stf-3d-logo-anim {
          animation: stfCinematic3D 2.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .stf-sweep-anim {
          animation: stfChromeSweep 2.1s cubic-bezier(0.25, 1, 0.5, 1) 0.35s forwards;
        }

        .stf-halo-anim {
          animation: stfHaloPulse 3.2s ease-in-out infinite;
        }

        .stf-subline-anim {
          animation: stfSubLine 2.4s ease-out forwards;
        }

        .stf-subtext-anim {
          animation: stfSubText 2.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* 1. HALO LUMINOSO AMBIENTAL DE FONDO (METÁLICO / DORADO SUAVE) */}
      <div 
        className="absolute w-[360px] sm:w-[680px] h-[360px] sm:h-[680px] rounded-full pointer-events-none stf-halo-anim"
        style={{
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.14) 0%, rgba(212, 175, 55, 0.08) 32%, rgba(0, 0, 0, 0) 72%)',
          filter: 'blur(45px)'
        }}
      />

      {/* 2. CONTENEDOR PRINCIPAL DEL LOGO 3D CINEMATOGRÁFICO TRANSPARENTE */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4 sm:px-8 max-w-lg sm:max-w-2xl w-full text-center">
        
        {/* LOGO 3D EN ALTA DEFINICIÓN EN FORMATO PNG TRANSPARENTE */}
        <div className="stf-3d-logo-anim relative w-full flex flex-col items-center">
          
          <div className="relative w-full max-w-[340px] sm:max-w-[520px] overflow-hidden">
            <img 
              src="/stf-group-3d-logo.png" 
              alt="STF GROUP S.A. • STUDIO F • ELA • STUDIO F MAN (3D Chrome Edition PNG)"
              className="w-full h-auto object-contain block drop-shadow-[0_15px_30px_rgba(0,0,0,0.95)] drop-shadow-[0_0_20px_rgba(255,255,255,0.18)]"
              style={{
                filter: 'contrast(1.10) brightness(1.08)'
              }}
            />

            {/* Haz de luz de destello cromado en diagonal */}
            <div 
              className="absolute inset-0 pointer-events-none stf-sweep-anim"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.0) 25%, rgba(255, 255, 255, 0.45) 50%, rgba(212, 175, 55, 0.35) 60%, transparent 80%)',
                mixBlendMode: 'color-dodge'
              }}
            />
          </div>

          {/* LÍNEA DE LUZ EXPANSIVA METÁLICA */}
          <div className="w-full max-w-[280px] sm:max-w-[460px] h-[1.5px] bg-gradient-to-r from-transparent via-amber-200/50 via-white/80 to-transparent mt-5 stf-subline-anim" />

          {/* SUBTÍTULO INSTITUCIONAL DE TRAZABILIDAD */}
          <div className="mt-3.5 space-y-1 stf-subtext-anim">
            <span className="text-[10.5px] sm:text-[12.5px] font-sans font-bold text-zinc-200 uppercase tracking-[0.24em] block drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
              Control de Calidad & Trazabilidad Textil
            </span>
            <span className="text-[8.5px] sm:text-[10px] font-mono text-zinc-400 tracking-[0.20em] block uppercase">
              Planta Principal • Atelier Zona Franca • Laboratorio
            </span>
          </div>

        </div>

      </div>

      {/* 3. MICRO INDICADOR INFERIOR PARA SALTAR */}
      <div className="absolute bottom-6 sm:bottom-8 z-10 text-[9px] sm:text-[10px] font-mono text-zinc-500 tracking-wider flex items-center gap-1.5 transition-opacity duration-300 opacity-60 hover:opacity-100">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-200/70 animate-ping" />
        <span>Toca en cualquier lugar para continuar</span>
      </div>

    </div>
  );
};
