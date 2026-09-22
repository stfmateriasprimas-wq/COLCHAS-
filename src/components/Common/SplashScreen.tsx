import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, FastForward } from 'lucide-react';

interface SplashScreenProps {
  onFinish: () => void;
  durationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  durationMs = 4600
}) => {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [hasAudioStarted, setHasAudioStarted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Detener y destruir cualquier instancia activa de audio de forma segura
  const terminateAudio = () => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = '';
      } catch (e) {}
      audioRef.current = null;
    }
  };

  useEffect(() => {
    let audio: HTMLAudioElement | null = null;
    let fadeInterval: any = null;
    let isMounted = true;

    try {
      audio = new Audio('/stf-intro-sound.mp3');
      audio.preload = 'auto';
      audio.volume = 0.85;
      audioRef.current = audio;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            if (isMounted) {
              setHasAudioStarted(true);
              setAudioBlocked(false);
            }
          })
          .catch(() => {
            // Safari iOS u otro navegador bloqueó el autoplay sin toque previo
            if (isMounted) {
              setAudioBlocked(true);
            }
          });
      }
    } catch (e) {
      if (isMounted) setAudioBlocked(true);
    }

    // Iniciar desvanecimiento gradual de salida de audio y video 700ms antes del fin
    const fadeTimer = setTimeout(() => {
      if (!isMounted) return;
      setIsFadingOut(true);
      if (audioRef.current) {
        fadeInterval = setInterval(() => {
          if (audioRef.current && audioRef.current.volume > 0.08) {
            audioRef.current.volume = Math.max(0, audioRef.current.volume - 0.12);
          } else {
            clearInterval(fadeInterval);
          }
        }, 70);
      }
    }, Math.max(2000, durationMs - 700));

    // Transición fluida a la pantalla de Login
    const finishTimer = setTimeout(() => {
      if (!isMounted) return;
      terminateAudio();
      onFinish();
    }, durationMs);

    return () => {
      isMounted = false;
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
      if (fadeInterval) clearInterval(fadeInterval);
      terminateAudio();
    };
  }, [durationMs, onFinish]);

  // Permitir activar el sonido al tocar la pantalla si fue bloqueado por iOS Safari
  const handleContainerTap = () => {
    if (audioBlocked && audioRef.current && !hasAudioStarted) {
      try {
        audioRef.current.currentTime = 0;
        audioRef.current.play().then(() => {
          setHasAudioStarted(true);
          setAudioBlocked(false);
        }).catch(() => {});
      } catch (e) {}
    }
  };

  // Omitir intencionalmente la animación mediante el botón de saltar
  const handleSkip = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsFadingOut(true);
    terminateAudio();
    setTimeout(onFinish, 180);
  };

  // Alternar sonido mudo / activo
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div 
      onClick={handleContainerTap}
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none overflow-hidden transition-all duration-600 ease-out ${
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
            transform: scale(0.70) translateY(14px);
            filter: blur(14px) brightness(0.35) contrast(1.15);
          }
          22% {
            opacity: 1;
            filter: blur(0px) brightness(1.22) contrast(1.08);
          }
          65% {
            opacity: 1;
            transform: scale(1.01) translateY(0px);
            filter: blur(0px) brightness(1.02);
          }
          100% {
            opacity: 1;
            transform: scale(1.05) translateY(0px);
            filter: blur(0px) brightness(1.04);
          }
        }

        /* Brillo Blanco Exclusivo sobre las Letras de Izquierda a Derecha */
        @keyframes stfWhiteLetterShine {
          0% {
            transform: translateX(-160%) skewX(-24deg);
            opacity: 0;
          }
          25% {
            opacity: 1;
          }
          75% {
            opacity: 1;
          }
          100% {
            transform: translateX(250%) skewX(-24deg);
            opacity: 0;
          }
        }

        /* Expansión de la Línea de Luz Divisoria Plateada/Blanca */
        @keyframes stfBeamExpand {
          0% {
            width: 0%;
            opacity: 0;
          }
          30% {
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
          40% {
            opacity: 0.55;
          }
          100% {
            opacity: 0.95;
            transform: translateY(0);
            letter-spacing: 0.25em;
          }
        }

        .stf-4k-logo-anim {
          animation: stfCinematic4k 4.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .stf-shine-beam {
          animation: stfWhiteLetterShine 2.6s cubic-bezier(0.22, 1, 0.36, 1) 0.6s forwards;
        }

        .stf-beam-anim {
          animation: stfBeamExpand 3.2s ease-out forwards;
        }

        .stf-brand-text {
          animation: stfBrandReveal 3.0s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* BOTÓN SUPERIOR DERECHO PARA SILENCIAR / ACTIVAR AUDIO */}
      <button 
        onClick={toggleMute}
        type="button"
        title={isMuted ? 'Activar sonido' : 'Silenciar'}
        className="absolute top-6 right-6 z-20 p-2.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-white/70 hover:text-white transition-all backdrop-blur-md"
      >
        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>

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
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.0) 25%, rgba(255,255,255,0.95) 50%, rgba(255,255,255,0.15) 65%, transparent 85%)',
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

      {/* BADGE ELEGANTE PARA ACTIVAR SONIDO EN DISPOSITIVOS MÓVILES (iOS SAFARI) */}
      {audioBlocked && !hasAudioStarted && (
        <div 
          onClick={handleContainerTap}
          className="absolute bottom-18 sm:bottom-20 z-30 cursor-pointer flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-300 text-xs font-medium tracking-wide shadow-xl shadow-black/80 backdrop-blur-md animate-bounce pointer-events-auto active:scale-95 transition-transform"
        >
          <Volume2 className="w-4 h-4 text-amber-400" />
          <span>Toca para activar sonido de intro</span>
        </div>
      )}

      {/* CONTROLES INFERIORES: INDICADOR INSTITUCIONAL Y BOTÓN PARA OMITIR */}
      <div className="absolute bottom-5 sm:bottom-7 z-20 flex items-center justify-between w-full max-w-md px-6 pointer-events-auto">
        <div className="text-[9.5px] sm:text-[10px] font-mono text-zinc-500 tracking-wider flex items-center gap-1.5 opacity-75">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 animate-pulse" />
          <span>STF GROUP · CALIDAD</span>
        </div>

        <button
          type="button"
          onClick={handleSkip}
          className="text-[10.5px] sm:text-[11px] font-mono text-zinc-300 hover:text-white px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/12 border border-white/10 hover:border-white/20 transition-all flex items-center gap-1.5 backdrop-blur-md active:scale-95 shadow-sm"
          title="Omitir introducción e ir al login"
        >
          <span>Omitir intro</span>
          <FastForward className="w-3 h-3 text-zinc-400" />
        </button>
      </div>

    </div>
  );
};
