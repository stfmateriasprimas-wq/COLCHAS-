import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mic, Sparkles, Send, Trash2, Volume2, Bot, 
  X, RefreshCw, Printer
} from 'lucide-react';
import { SolicitudColcha, MonitoreoItem, KpiMetrics, SectorType } from '../../types';
import { TabType } from '../Navigation';
import { UsuarioSTF } from '../../services/authService';
import { processVoiceCommand, speakAiResponse, AiCommandResult, StatSectionTabType } from '../../services/aiVoiceService';
import { notificationService } from '../../services/notificationService';

interface FloatingAiVoiceButtonProps {
  solicitudes: SolicitudColcha[];
  monitoreoList?: MonitoreoItem[];
  metrics: KpiMetrics;
  currentUser?: UsuarioSTF | null;
  onNavigateTab: (tab: TabType) => void;
  onSelectStage?: (stage: SectorType | 'EN_PROCESO' | 'ALL') => void;
  onNavigateStatSection?: (section: StatSectionTabType) => void;
  onToggleTheme?: (theme: 'light' | 'dark') => void;
  onOpenOpDetail?: (op: SolicitudColcha) => void;
  onOpenOpPrinter?: (op: SolicitudColcha) => void;
  onOpenChat?: () => void;
  onOpenUserDirectory?: () => void;
  onOpenReporteComite?: () => void;
  onOpenAdminParametros?: () => void;
  onSearchOp?: (query: string) => void;
}

export const FloatingAiVoiceButton: React.FC<FloatingAiVoiceButtonProps> = ({
  solicitudes,
  monitoreoList = [],
  metrics,
  currentUser,
  onNavigateTab,
  onSelectStage,
  onNavigateStatSection,
  onToggleTheme,
  onOpenOpDetail,
  onOpenOpPrinter,
  onOpenChat,
  onOpenUserDirectory,
  onOpenReporteComite,
  onOpenAdminParametros,
  onSearchOp
}) => {
  // Voice Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');

  // 3-Second Reprocessing State
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [pendingResult, setPendingResult] = useState<AiCommandResult | null>(null);

  // Result dialog / toast
  const [lastResult, setLastResult] = useState<AiCommandResult | null>(null);
  const [showResultToast, setShowResultToast] = useState(false);

  // Dragging State
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    const initialX = typeof window !== 'undefined' ? Math.max(16, window.innerWidth - 90) : 1000;
    const initialY = typeof window !== 'undefined' ? Math.max(16, window.innerHeight - 110) : 600;
    return { x: initialX, y: initialY };
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0
  });
  const hasMovedRef = useRef(false);

  // Speech Recognition Reference
  const recognitionRef = useRef<any>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Exact WhatsApp Waveform Bars (Heights dynamically animated)
  const defaultBarHeights = [20, 35, 55, 75, 45, 90, 60, 100, 70, 85, 95, 65, 80, 50, 70, 40, 85, 30, 60, 25];
  const [audioBars, setAudioBars] = useState<number[]>(defaultBarHeights);

  // Handle window resizing
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => ({
        x: Math.min(Math.max(16, prev.x), window.innerWidth - 80),
        y: Math.min(Math.max(16, prev.y), window.innerHeight - 80)
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Audio wave animation during active recording
  useEffect(() => {
    let waveInterval: NodeJS.Timeout;
    if (isRecording) {
      waveInterval = setInterval(() => {
        setAudioBars(prev => prev.map(() => Math.floor(Math.random() * 80) + 20));
      }, 100);
    } else {
      setAudioBars(defaultBarHeights);
    }
    return () => clearInterval(waveInterval);
  }, [isRecording]);

  // Recording duration timer
  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [isRecording]);

  // Smooth scroll to OP Card on the page
  const scrollToOpCard = (opNumber: string) => {
    const cleanDigits = opNumber.replace(/\D/g, '') || opNumber;
    setTimeout(() => {
      const el = document.getElementById(`op-card-${cleanDigits}`) || document.getElementById(`op-card-${opNumber}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-4', 'ring-emerald-500', 'transition-all', 'duration-500');
        setTimeout(() => {
          el.classList.remove('ring-4', 'ring-emerald-500');
        }, 3000);
      }
    }, 400);
  };

  // Execute Action from AI Command Result
  const executeAiCommand = useCallback((result: AiCommandResult) => {
    // 1. Play TTS voice response
    speakAiResponse(result.spokenResponse);

    // 2. Play acoustic feedback
    notificationService.playAlertSound('EXITO');

    // 3. Dispatch Target Navigation / Modal / Label / Theme
    switch (result.intent) {
      case 'OPEN_OP_PRINTER':
        onNavigateTab('solicitudes');
        if (result.targetOp) {
          if (onOpenOpPrinter) {
            onOpenOpPrinter(result.targetOp);
          }
          scrollToOpCard(result.targetOp.op);
        }
        break;

      case 'OPEN_OP_DETAIL':
        onNavigateTab('solicitudes');
        if (result.targetOp) {
          if (onOpenOpDetail) {
            onOpenOpDetail(result.targetOp);
          }
          scrollToOpCard(result.targetOp.op);
        }
        break;

      case 'SEARCH_OP':
        onNavigateTab('solicitudes');
        if (onSearchOp && result.searchQuery) {
          onSearchOp(result.searchQuery);
        }
        break;

      case 'TOGGLE_THEME':
        if (onToggleTheme && result.targetTheme) {
          onToggleTheme(result.targetTheme);
        }
        break;

      case 'NAVIGATE_STAT_SECTION':
        onNavigateTab('estadisticas');
        if (onNavigateStatSection && result.targetStatSection) {
          onNavigateStatSection(result.targetStatSection);
        }
        break;

      case 'NAVIGATE_TAB':
        if (result.targetTab) {
          onNavigateTab(result.targetTab);
        }
        break;

      case 'FILTER_STAGE':
        onNavigateTab('solicitudes');
        if (onSelectStage && result.targetStage) {
          onSelectStage(result.targetStage);
        }
        break;

      case 'OPEN_CHAT':
        if (onOpenChat) onOpenChat();
        break;

      case 'OPEN_USER_DIRECTORY':
        if (onOpenUserDirectory) onOpenUserDirectory();
        break;

      case 'OPEN_REPORTE_COMITE':
        onNavigateTab('estadisticas');
        if (onOpenReporteComite) {
          onOpenReporteComite();
        }
        break;

      case 'OPEN_ADMIN_PARAMETROS':
        onNavigateTab('estadisticas');
        if (onOpenAdminParametros) {
          onOpenAdminParametros();
        }
        break;

      case 'SYSTEM_METRICS_QUERY':
        if (result.targetTab) {
          onNavigateTab(result.targetTab);
        }
        break;

      default:
        break;
    }

    setLastResult(result);
    setShowResultToast(true);
    setTimeout(() => {
      setShowResultToast(false);
    }, 6500);
  }, [
    onNavigateTab,
    onSelectStage,
    onNavigateStatSection,
    onToggleTheme,
    onOpenOpDetail,
    onOpenOpPrinter,
    onSearchOp,
    onOpenChat,
    onOpenUserDirectory,
    onOpenReporteComite,
    onOpenAdminParametros
  ]);

  // Start 3-Second Reprocessing Countdown
  const trigger3SecondReprocessing = (spokenText: string) => {
    if (!spokenText.trim()) return;

    // Process intent with live real-time system data (Solicitudes + Monitoreo)
    const result = processVoiceCommand(spokenText, {
      solicitudes,
      monitoreoList,
      metrics,
      currentUser
    });

    setPendingResult(result);
    setIsReprocessing(true);
    setCountdown(3);
    notificationService.playAlertSound('NOTIFICACION');

    let currentCount = 3;
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

    countdownTimerRef.current = setInterval(() => {
      currentCount -= 1;
      setCountdown(currentCount);

      if (currentCount <= 0) {
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        setIsReprocessing(false);
        setLiveTranscript('');
        executeAiCommand(result);
      }
    }, 1000);
  };

  // Start Speech Recognition
  const startRecording = () => {
    setLiveTranscript('');
    setIsRecording(true);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('SpeechRecognition no está disponible en este navegador, usando simulación.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-CO';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setLiveTranscript(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech Recognition Error:', event.error);
        if (event.error !== 'no-speech') {
          setIsRecording(false);
        }
      };

      recognition.onend = () => {
        // Handled on stop
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.error('Error al iniciar SpeechRecognition:', err);
    }
  };

  // Stop Recording and Process
  const stopRecordingAndProcess = () => {
    setIsRecording(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }

    const textToProcess = liveTranscript.trim() || 'Llévame a la OP 96079';
    trigger3SecondReprocessing(textToProcess);
  };

  // Cancel Recording
  const cancelRecording = () => {
    setIsRecording(false);
    setLiveTranscript('');
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
  };

  // Cancel Reprocessing Countdown
  const cancelReprocessing = () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setIsReprocessing(false);
    setPendingResult(null);
  };

  // Dragging Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;

    setIsDragging(true);
    hasMovedRef.current = false;
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - dragStartRef.current.startX;
      const deltaY = moveEvent.clientY - dragStartRef.current.startY;

      if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
        hasMovedRef.current = true;
      }

      const newX = Math.min(Math.max(16, dragStartRef.current.posX + deltaX), window.innerWidth - 76);
      const newY = Math.min(Math.max(16, dragStartRef.current.posY + deltaY), window.innerHeight - 76);

      setPosition({ x: newX, y: newY });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handleButtonClick = () => {
    if (hasMovedRef.current) return;

    if (isRecording) {
      stopRecordingAndProcess();
    } else if (isReprocessing) {
      cancelReprocessing();
    } else {
      startRecording();
    }
  };

  // Format seconds as mm:ss
  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  // Decide if wave pill should emerge on left or right of button based on screen position
  const isRightSide = position.x > (typeof window !== 'undefined' ? window.innerWidth / 2 : 500);

  return (
    <>
      {/* 1. FLOATING DRAGGABLE AI BUTTON + INLINE AUDIO WAVE PILL */}
      <div
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: 9999,
          touchAction: 'none'
        }}
        className="select-none flex items-center"
      >
        <div className="relative flex items-center">

          {/* INLINE ATTACHED AUDIO WAVE PILL (Emerges at the side of the button - NO central modal) */}
          {isRecording && (
            <div
              className={`
                absolute top-1/2 -translate-y-1/2 flex items-center gap-3 
                px-4 py-2.5 rounded-full 
                bg-[#090d14]/95 dark:bg-white/95 
                border-2 border-emerald-500 
                shadow-2xl shadow-emerald-500/35 backdrop-blur-xl 
                text-white dark:text-zinc-950 
                animate-in fade-in zoom-in-95 duration-200
                ${isRightSide ? 'right-full mr-3.5 origin-right' : 'left-full ml-3.5 origin-left'}
              `}
              style={{ minWidth: '310px' }}
            >
              {/* Discard / Cancel Button */}
              <button
                type="button"
                onClick={cancelRecording}
                title="Descartar grabación"
                className="w-8 h-8 rounded-full bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 dark:text-rose-600 flex items-center justify-center transition cursor-pointer shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {/* Timer & Pulsing Dot */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                <span className="text-xs font-mono font-black text-rose-400 dark:text-rose-600">
                  {formatTimer(recordingSeconds)}
                </span>
              </div>

              {/* Exact WhatsApp Style Emerald Waveform Bars */}
              <div className="flex-1 h-9 flex items-center justify-center gap-1 px-1 overflow-hidden">
                {audioBars.map((height, idx) => (
                  <div
                    key={idx}
                    style={{ height: `${Math.max(14, (height / 100) * 32)}px` }}
                    className="w-1.5 rounded-full bg-gradient-to-t from-emerald-500 via-teal-400 to-emerald-300 shadow-sm shadow-emerald-500/50 transition-all duration-100"
                  />
                ))}
              </div>

              {/* Send & Process Button */}
              <button
                type="button"
                onClick={stopRecordingAndProcess}
                title="Enviar y procesar orden"
                className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black flex items-center justify-center font-bold shadow-md shadow-emerald-500/40 active:scale-95 transition cursor-pointer shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>

              {/* Real-Time Live Transcript Preview Subtext */}
              {liveTranscript && (
                <div className="absolute -bottom-7 left-3 right-3 text-center pointer-events-none">
                  <span className="px-2.5 py-0.5 rounded-md bg-zinc-950/90 dark:bg-zinc-900 text-emerald-400 text-[10px] font-mono font-bold truncate max-w-full inline-block shadow-md border border-emerald-500/30">
                    "{liveTranscript}"
                  </span>
                </div>
              )}
            </div>
          )}

          {/* INLINE ATTACHED 3-SECOND REPROCESSING COUNTDOWN PILL */}
          {isReprocessing && (
            <div
              className={`
                absolute top-1/2 -translate-y-1/2 flex items-center gap-3 
                px-4 py-2.5 rounded-full 
                bg-[#090d14]/95 dark:bg-white/95 
                border-2 border-emerald-500 
                shadow-2xl shadow-emerald-500/35 backdrop-blur-xl 
                text-white dark:text-zinc-950 
                animate-in fade-in zoom-in-95 duration-200
                ${isRightSide ? 'right-full mr-3.5 origin-right' : 'left-full ml-3.5 origin-left'}
              `}
              style={{ minWidth: '280px' }}
            >
              {/* Spinning Countdown Circle */}
              <div className="relative w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shrink-0 shadow-md shadow-emerald-500/40">
                <RefreshCw className="w-7 h-7 text-emerald-300 animate-spin absolute" />
                <span className="text-xs font-black font-mono relative">
                  {countdown}s
                </span>
              </div>

              {/* Status Text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-bounce" />
                  <span className="text-xs font-mono font-black text-emerald-400 dark:text-emerald-700 truncate">
                    IA STF Reprocesando...
                  </span>
                </div>
                <p className="text-[10px] font-mono text-zinc-400 dark:text-zinc-600 truncate">
                  {pendingResult ? pendingResult.title : 'Analizando datos en tiempo real'}
                </p>
              </div>

              {/* Cancel Button */}
              <button
                type="button"
                onClick={cancelReprocessing}
                title="Cancelar"
                className="w-7 h-7 rounded-full bg-zinc-800 dark:bg-zinc-200 text-zinc-400 hover:text-white dark:hover:text-black flex items-center justify-center transition cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* MAIN CIRCULAR BUTTON (WHITE WITH GREEN BORDER) */}
          <div className="relative group">
            {/* Ambient Aura Glow */}
            <div className={`absolute -inset-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 rounded-full blur-md opacity-70 group-hover:opacity-100 transition duration-500 pointer-events-none ${isRecording || isReprocessing ? 'animate-pulse opacity-100' : ''}`} />

            {/* Draggable Button */}
            <button
              type="button"
              onPointerDown={handlePointerDown}
              onClick={handleButtonClick}
              title={isRecording ? "Detener y procesar orden" : "Asistente de Voz IA STF Group (Arrastra para mover)"}
              className={`
                relative w-16 h-16 rounded-full bg-white text-zinc-900 border-2 border-emerald-500 
                shadow-2xl shadow-emerald-500/30 flex items-center justify-center 
                transition-all duration-300 transform 
                ${isDragging ? 'cursor-grabbing scale-105 shadow-emerald-500/50' : 'cursor-grab hover:scale-110 active:scale-95'}
                ${isRecording ? 'ring-4 ring-rose-400/40 bg-rose-50' : ''}
                ${isReprocessing ? 'ring-4 ring-emerald-400/40 bg-emerald-50' : ''}
              `}
            >
              {/* Inner Icon */}
              <div className="relative flex items-center justify-center">
                {isRecording ? (
                  <div className="relative flex items-center justify-center">
                    <span className="absolute w-12 h-12 bg-rose-500/20 rounded-full animate-ping" />
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center text-white shadow-md">
                      <Mic className="w-5 h-5 animate-pulse" />
                    </div>
                  </div>
                ) : isReprocessing ? (
                  <div className="relative flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" />
                    <span className="absolute text-[10px] font-black text-emerald-700 font-mono">
                      {countdown}
                    </span>
                  </div>
                ) : (
                  <div className="relative flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md">
                      <Bot className="w-5 h-5" />
                    </div>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 absolute -top-1 -right-1 animate-bounce" />
                  </div>
                )}
              </div>

              {/* AI Status Badge */}
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white text-[8px] font-black text-white items-center justify-center">
                  AI
                </span>
              </span>
            </button>

            {/* Hover Tooltip */}
            {!isRecording && !isReprocessing && !isDragging && (
              <div className={`absolute ${isRightSide ? 'right-full mr-3' : 'left-full ml-3'} top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/95 dark:bg-white/95 text-white dark:text-zinc-900 text-xs font-bold shadow-xl border border-zinc-700 dark:border-zinc-200 whitespace-nowrap pointer-events-none animate-in fade-in duration-200`}>
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
                <span>Hablar con IA STF</span>
                <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 bg-zinc-800 dark:bg-zinc-200 px-1.5 py-0.5 rounded">
                  Clic para grabar
                </span>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* 2. DISCRETE FLOATING RESULT NOTIFICATION TOAST */}
      {showResultToast && lastResult && (
        <div className="fixed top-20 right-5 z-[9998] max-w-md w-[92vw] sm:w-full bg-[#090d14]/95 dark:bg-white/95 border-2 border-emerald-500 rounded-3xl p-4 shadow-2xl shadow-emerald-500/30 text-white dark:text-zinc-950 flex items-start gap-3.5 animate-in slide-in-from-top-4 duration-300 backdrop-blur-xl">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-black flex items-center justify-center font-black text-sm shrink-0 shadow-md">
            {lastResult.intent === 'OPEN_OP_PRINTER' ? (
              <Printer className="w-5 h-5" />
            ) : (
              <Bot className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-400 dark:text-emerald-700 truncate font-mono">
                {lastResult.title}
              </span>
              <button
                type="button"
                onClick={() => speakAiResponse(lastResult.spokenResponse)}
                className="text-[10px] font-mono text-zinc-400 hover:text-white dark:hover:text-black flex items-center gap-1 bg-zinc-800 dark:bg-zinc-200 px-2 py-0.5 rounded cursor-pointer"
                title="Volver a escuchar respuesta de voz"
              >
                <Volume2 className="w-3 h-3 text-emerald-400 dark:text-emerald-600" />
                <span>Voz</span>
              </button>
            </div>
            <p className="text-xs text-zinc-300 dark:text-zinc-700">
              {lastResult.description}
            </p>
            <p className="text-[10.5px] text-emerald-300 dark:text-emerald-800 font-mono italic">
              "{lastResult.spokenResponse}"
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowResultToast(false)}
            className="text-zinc-400 hover:text-white dark:hover:text-black p-1 text-xs"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
};
