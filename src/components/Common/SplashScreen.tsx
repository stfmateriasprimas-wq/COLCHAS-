import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX, FastForward } from 'lucide-react';

interface SplashScreenProps {
  onFinish: () => void;
  durationMs?: number;
}

// CONTROLADOR GLOBAL PARA GARANTIZAR QUE EL AUDIO DE INTRO SUENE ESTRICTAMENTE 1 SOLA VEZ
let globalActiveIntroAudio: HTMLAudioElement | null = null;
let globalIntroFadeInterval: any = null;

/**
 * Detiene y destruye de inmediato cualquier audio residual de la intro
 * Forzando la descarga del recurso y eliminando cualquier cola de reproducción.
 */
export function stopIntroSoundImmediately(): void {
  if (globalIntroFadeInterval) {
    clearInterval(globalIntroFadeInterval);
    globalIntroFadeInterval = null;
  }
  if (globalActiveIntroAudio) {
    try {
      globalActiveIntroAudio.pause();
      globalActiveIntroAudio.currentTime = 0;
      globalActiveIntroAudio.removeAttribute('src');
      globalActiveIntroAudio.load();
    } catch (e) {}
    globalActiveIntroAudio = null;
  }
}

/**
 * Función de compatibilidad para reiniciar el audio si se solicita manualmente
 */
export function allowReplayIntroSound(): void {
  stopIntroSoundImmediately();
  try {
    sessionStorage.removeItem('stf_intro_sound_played');
  } catch (e) {}
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  durationMs = 4000
}) => {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isFadingOutRef = useRef<boolean>(false);
  const hasFinishedRef = useRef<boolean>(false);
  const hasAudioStartedRef = useRef<boolean>(false);
  const finishTimeoutRef = useRef<any>(null);
  const safetyTimerRef = useRef<any>(null);

  // Terminar y limpiar audio de manera segura e inmediata
  const terminateAudio = useCallback(() => {
    stopIntroSoundImmediately();
    audioRef.current = null;
  }, []);

  // Transición definitiva y segura al Login
  const completeSplash = useCallback(() => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    terminateAudio();
    onFinish();
  }, [terminateAudio, onFinish]);

  // Transición de salida con fade-out suave de pantalla y volumen
  const triggerExitTransition = useCallback((delayMs = 600) => {
    if (isFadingOutRef.current) return;
    isFadingOutRef.current = true;
    setIsFadingOut(true);

    // Fade-out progresivo de volumen del audio
    if (audioRef.current && !audioRef.current.paused) {
      const audioToFade = audioRef.current;
      const initialVol = audioToFade.volume;
      const steps = 10;
      const intervalMs = Math.max(20, Math.floor(delayMs / steps));
      let currentStep = 0;

      if (globalIntroFadeInterval) clearInterval(globalIntroFadeInterval);
      globalIntroFadeInterval = setInterval(() => {
        currentStep++;
        try {
          if (audioToFade) {
            audioToFade.volume = Math.max(0, initialVol * (1 - currentStep / steps));
          }
        } catch (e) {}
        if (currentStep >= steps) {
          clearInterval(globalIntroFadeInterval);
          globalIntroFadeInterval = null;
          terminateAudio();
        }
      }, intervalMs);
    }

    if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
    finishTimeoutRef.current = setTimeout(() => {
      completeSplash();
    }, delayMs);
  }, [completeSplash, terminateAudio]);

  useEffect(() => {
    let isMounted = true;
    isFadingOutRef.current = false;
    hasFinishedRef.current = false;
    hasAudioStartedRef.current = false;

    // Detener cualquier audio previo
    stopIntroSoundImmediately();

    try {
      const audio = new Audio('/stf-intro-sound.mp3');
      audio.preload = 'auto';
      audio.loop = false; // NUNCA repetir en bucle
      audio.volume = 1.0;
      audioRef.current = audio;
      globalActiveIntroAudio = audio;

      // Evento: Fin natural del audio antes de los 4s
      const onAudioEnded = () => {
        if (!isMounted || isFadingOutRef.current) return;
        triggerExitTransition(300);
      };

      audio.addEventListener('ended', onAudioEnded);

      // Intento de reproducción única
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            if (isMounted) {
              hasAudioStartedRef.current = true;
            }
          })
          .catch(() => {
            // Si el navegador bloquea autoplay sin interacción, permitimos desbloquear 1 sola vez en el primer gesto
            const unlockAudioOnce = () => {
              if (hasAudioStartedRef.current || hasFinishedRef.current || !isMounted) {
                cleanupUnlock();
                return;
              }
              if (audioRef.current && audioRef.current.paused) {
                hasAudioStartedRef.current = true;
                audioRef.current.play().catch(() => {});
              }
              cleanupUnlock();
            };

            const cleanupUnlock = () => {
              window.removeEventListener('click', unlockAudioOnce, true);
              window.removeEventListener('touchstart', unlockAudioOnce, true);
              window.removeEventListener('pointerdown', unlockAudioOnce, true);
              window.removeEventListener('keydown', unlockAudioOnce, true);
            };

            window.addEventListener('click', unlockAudioOnce, { capture: true, once: true });
            window.addEventListener('touchstart', unlockAudioOnce, { capture: true, once: true });
            window.addEventListener('pointerdown', unlockAudioOnce, { capture: true, once: true });
            window.addEventListener('keydown', unlockAudioOnce, { capture: true, once: true });
          });
      }
    } catch (e) {}

    // Cronómetro estricto: Inicio de transición fade-out a los 3.4 segundos para terminar en exactamente 4 segundos
    const targetDuration = Math.min(durationMs, 4000);
    const fadeStartMs = Math.max(2000, targetDuration - 600);

    safetyTimerRef.current = setTimeout(() => {
      if (isMounted && !hasFinishedRef.current) {
        triggerExitTransition(600);
      }
    }, fadeStartMs);

    // Hard fallback para garantizar liberación total del login a los 4050ms
    const hardLimitTimer = setTimeout(() => {
      if (isMounted && !hasFinishedRef.current) {
        completeSplash();
      }
    }, targetDuration + 50);

    return () => {
      isMounted = false;
      if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
      clearTimeout(hardLimitTimer);
      terminateAudio();
    };
  }, [durationMs, triggerExitTransition, completeSplash, terminateAudio]);

  // Omitir intencionalmente la animación mediante el botón de saltar
  const handleSkip = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    triggerExitTransition(150);
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
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none overflow-hidden transition-all duration-600 ease-out ${
        isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{
        backgroundColor: '#000000'
      }}
    >
      <style>{`
        /* Animación Cinemática 4K Zoom Progresivo ajustada a 3.8s */
        @keyframes stfCinematic4k {
          0% {
            opacity: 0;
            transform: scale(0.74) translateY(12px);
            filter: blur(12px) brightness(0.35) contrast(1.15);
          }
          18% {
            opacity: 1;
            filter: blur(0px) brightness(1.20) contrast(1.08);
          }
          65% {
            opacity: 1;
            transform: scale(1.00) translateY(0px);
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
            transform: translateX(-160%) skewX(-24deg);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          70% {
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
          22% {
            opacity: 1;
          }
          75% {
            width: 92%;
            opacity: 0.9;
          }
          100% {
            width: 100%;
            opacity: 0.6;
          }
        }

        /* Revelado de Texto Institucional */
        @keyframes stfBrandReveal {
          0% {
            opacity: 0;
            transform: translateY(8px);
            letter-spacing: 0.16em;
          }
          30% {
            opacity: 0.7;
          }
          100% {
            opacity: 0.95;
            transform: translateY(0);
            letter-spacing: 0.24em;
          }
        }

        .stf-4k-logo-anim {
          animation: stfCinematic4k 3.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .stf-shine-beam {
          animation: stfWhiteLetterShine 2.0s cubic-bezier(0.22, 1, 0.36, 1) 0.35s forwards;
        }

        .stf-beam-anim {
          animation: stfBeamExpand 2.4s ease-out forwards;
        }

        .stf-brand-text {
          animation: stfBrandReveal 2.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* BOTÓN SUPERIOR DERECHO PARA SILENCIAR / ACTIVAR AUDIO */}
      <button 
        onClick={toggleMute}
        type="button"
        title={isMuted ? 'Activar sonido' : 'Silenciar'}
        className="absolute top-6 right-6 z-20 p-2.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-white/70 hover:text-white transition-all backdrop-blur-md cursor-pointer"
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

            {/* 2. CAPA DE BRILLO BLANCO ENMASCARADA EXCLUSIVAMENTE SOBRE LAS LETRAS */}
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

      {/* CONTROLES INFERIORES: INDICADOR INSTITUCIONAL Y BOTÓN PARA OMITIR */}
      <div className="absolute bottom-5 sm:bottom-7 z-20 flex items-center justify-between w-full max-w-md px-6 pointer-events-auto">
        <div className="text-[9.5px] sm:text-[10px] font-mono text-zinc-500 tracking-wider flex items-center gap-1.5 opacity-75">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 animate-pulse" />
          <span>STF GROUP · CALIDAD</span>
        </div>

        <button
          type="button"
          onClick={handleSkip}
          className="text-[10.5px] sm:text-[11px] font-mono text-zinc-300 hover:text-white px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/12 border border-white/10 hover:border-white/20 transition-all flex items-center gap-1.5 backdrop-blur-md active:scale-95 shadow-sm cursor-pointer"
          title="Omitir introducción e ir al login"
        >
          <span>Omitir intro</span>
          <FastForward className="w-3 h-3 text-zinc-400" />
        </button>
      </div>

    </div>
  );
};
