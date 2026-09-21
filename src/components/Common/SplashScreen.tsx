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
    // Desvanecimiento de salida suave 550ms antes del final
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, Math.max(1500, durationMs - 550));

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
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none cursor-pointer overflow-hidden transition-all duration-550 ease-out ${
        isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{
        backgroundColor: '#000000'
      }}
    >
      <style>{`
        /* Animación Cinemática 4K Zoom Progresivo */
        @keyframes stfCinematic4k {
          0% {
            opacity: 0;
            transform: scale(0.74) translateY(12px);
            filter: blur(12px) brightness(0.4) contrast(1.15);
          }
          26% {
            opacity: 1;
            filter: blur(0px) brightness(1.2) contrast(1.08);
          }
          70% {
            opacity: 1;
            transform: scale(1.01) translateY(0px);
            filter: blur(0px) brightness(1.02);
          }
          100% {
            opacity: 1;
            transform: scale(1.04) translateY(0px);
            filter: blur(0px) brightness(1.04);
          }
        }

        /* Brillo Blanco Exclusivo sobre las Letras de Izquierda a Derecha */
        @keyframes stfWhiteLetterShine {
          0% {
            transform: translateX(-150%) skewX(-24deg);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          80% {
            opacity: 1;
          }
          100% {
            transform: translateX(240%) skewX(-24deg);
            opacity: 0;
          }
        }

        /* Expansión de la Línea de Luz Divisoria Plateada/Blanca */
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
          animation: stfCinematic4k 2.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .stf-shine-beam {
          animation: stfWhiteLetterShine 2.0s cubic-bezier(0.22, 1, 0.36, 1) 0.45s forwards;
        }

        .stf-beam-anim {
          animation: stfBeamExpand 2.4s ease-out forwards;
        }

        .stf-brand-text {
          animation: stfBrandReveal 2.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* CONTENEDOR CENTRAL DEL LOGO DEFINITIVO 3D 4K */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4 sm:px-8 max-w-md sm:max-w-2xl w-full text-center">
        
        {/* LOGO 3D EN RESOLUCIÓN 4K (TRANSPARENTE SIN FONDO) */}
        <div className="stf-4k-logo-anim relative w-full flex flex-col items-center">
          
          <div className="relative w-full max-w-[320px] sm:max-w-[540px] md:max-w-[620px]">
            
            {/* 1. IMAGEN DEL LOGO 3D */}
            <img 
              src="/stf-group-3d-logo.png" 
              alt="STF GROUP S.A. • STUDIO F • ELA • STUDIO F MAN"
              className="w-full h-auto object-contain block drop-shadow-[0_15px_30px_rgba(0,0,0,0.98)] drop-shadow-[0_0_15px_rgba(255,255,255,0.18)]"
              style={{
                filter: 'contrast(1.08) brightness(1.06)'
              }}
            />

            {/* 2. CAPA DE BRILLO BLANCO ENMASCARADA EXCLUSIVAMENTE SOBRE LAS LETRAS (DE IZQUIERDA A DERECHA) */}
            <div 
              className="absolute inset-0 pointer-events-none overflow-hidden"
              style={{
                WebkitMaskImage: 'url("/stf-group-3d-logo.png")',
                maskImage: 'url("/stf-group-3d-logo.png")',
                WebkitMaskSize: 'contain',
                maskSize: 'contain',
                WebkitMaskRepeat: 'no-repeat',
                maskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
                maskPosition: 'center'
              }}
            >
              {/* Haz de brillo blanco puro deslizando por encima de las letras */}
              <div 
                className="w-full h-full stf-shine-beam"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.0) 25%, rgba(255,255,255,0.92) 50%, rgba(255,255,255,0.15) 65%, transparent 85%)',
                  mixBlendMode: 'plus-lighter'
                }}
              />
            </div>

          </div>

          {/* LÍNEA DE LUZ EXPANSIVA BLANCA Y PLATEADA */}
          <div className="w-full max-w-[280px] sm:max-w-[480px] h-[1.5px] bg-gradient-to-r from-transparent via-white/85 to-transparent mt-5 stf-beam-anim" />

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

      {/* MICRO INDICADOR INFERIOR PARA SALTAR */}
      <div className="absolute bottom-6 sm:bottom-8 z-10 text-[9px] sm:text-[10px] font-mono text-zinc-600 tracking-wider flex items-center gap-1.5 transition-opacity duration-300 opacity-60 hover:opacity-100">
        <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-ping" />
        <span>Toca en cualquier lugar para continuar</span>
      </div>

    </div>
  );
};
