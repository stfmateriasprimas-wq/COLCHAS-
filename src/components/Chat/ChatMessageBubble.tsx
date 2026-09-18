import React, { useState, useRef } from 'react';
import { 
  Check, CheckCheck, Play, Pause, FileText, ExternalLink, 
  Printer, AlertTriangle, Clock, Sparkles 
} from 'lucide-react';
import { ChatMessage, SolicitudColcha } from '../../types';
import { UsuarioSTF } from '../../services/authService';
import { SmartPhotoDisplay } from '../Common/SmartPhotoDisplay';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  isOwnMessage: boolean;
  currentUser: UsuarioSTF | null;
  onViewOpDetail?: (opCode: string) => void;
  onPrintOp?: (opCode: string) => void;
  allSolicitudes?: SolicitudColcha[];
  isDarkMode?: boolean;
}

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({
  message,
  isOwnMessage,
  onViewOpDetail,
  onPrintOp,
  allSolicitudes = [],
  isDarkMode = true
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Intentar encontrar los datos completos de la OP en la lista de solicitudes si no vienen en opData
  const linkedOp = message.opRelacionada 
    ? allSolicitudes.find(s => s.op.replace(/\D/g, '') === message.opRelacionada?.replace(/\D/g, ''))
    : undefined;

  const opData = message.opData || (linkedOp ? {
    op: linkedOp.op,
    tela: linkedOp.tela,
    color: linkedOp.color,
    referencia: linkedOp.referencia,
    estado: linkedOp.estado,
    dictamen: linkedOp.dictamen,
    diasHabiles: linkedOp.diasHabiles,
    tieneRetraso: linkedOp.tieneRetraso,
    esRetrasoCritico: linkedOp.esRetrasoCritico,
    fotoMuestraUrl: linkedOp.fotoMuestraUrl,
    fotoCalidadUrl: linkedOp.fotoCalidadUrl,
    observacion: linkedOp.observacionesCalidad || linkedOp.observacionesOperario || ''
  } : undefined);

  // Manejador de reproducción de audio
  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlayingAudio(true);
      }).catch(err => console.warn('Error al reproducir audio:', err));
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const progress = (audioRef.current.currentTime / (audioRef.current.duration || 1)) * 100;
    setAudioProgress(progress);
  };

  const handleAudioEnded = () => {
    setIsPlayingAudio(false);
    setAudioProgress(0);
  };

  // Color de etiqueta según área
  const getSenderColor = (area?: string) => {
    if (!area) return 'text-emerald-600 dark:text-emerald-400';
    const a = area.toUpperCase();
    if (a.includes('ZF') || a.includes('ATELIER')) return 'text-purple-600 dark:text-purple-400';
    if (a.includes('LAVANDERIA')) return 'text-sky-600 dark:text-sky-400';
    if (a.includes('CALIDAD')) return 'text-emerald-600 dark:text-emerald-400';
    if (a.includes('COLECCION')) return 'text-amber-600 dark:text-amber-400';
    return 'text-emerald-600 dark:text-emerald-400';
  };

  // Color de badge de estado OP
  const getEstadoBadgeClass = (estado?: string) => {
    switch (estado) {
      case 'PRE_SOLICITUD': return 'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800';
      case 'SOLICITADO': return 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800';
      case 'LAVANDERIA': return 'bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-800';
      case 'CALIDAD': return 'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800';
      case 'FINALIZADO': return 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      default: return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700';
    }
  };

  return (
    <div className={`flex w-full my-1 sm:my-1.5 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <div 
        className={`relative max-w-[88%] sm:max-w-[70%] md:max-w-[60%] rounded-2xl px-3 sm:px-3.5 py-2 sm:py-2.5 shadow-md select-text transition-all ${
          isOwnMessage 
            ? 'bg-emerald-600 dark:bg-[#064e3b] text-white dark:text-emerald-50 rounded-tr-none shadow-md shadow-emerald-950/20 dark:shadow-[0_0_20px_rgba(16,185,129,0.25),inset_0_1px_1px_rgba(255,255,255,0.25)] border border-emerald-500/30 dark:border-emerald-400/30' 
            : 'bg-white dark:bg-zinc-900/90 text-zinc-900 dark:text-zinc-100 rounded-tl-none border border-zinc-200 dark:border-white/15 shadow-md shadow-black/5 dark:shadow-[0_4px_20px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.18)]'
        }`}
      >
        {/* Nombre del remitente (solo en mensajes recibidos de otros usuarios) */}
        {!isOwnMessage && (
          <div className="flex items-center gap-1.5 mb-1">
            <span className={`text-[11.5px] font-black tracking-tight ${getSenderColor(message.area)}`}>
              ~ {message.remitente}
            </span>
            <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-black/50 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-white/10 uppercase">
              {message.area}
            </span>
          </div>
        )}

        {/* 1. TARJETA INTERACTIVA DE OP VINCULADA (SI APLICA) */}
        {opData && (
          <div className="mb-2 bg-zinc-50 dark:bg-black/85 rounded-xl p-2.5 sm:p-3 border border-zinc-200 dark:border-white/20 shadow-inner dark:shadow-[0_0_15px_rgba(255,255,255,0.04),inset_0_1px_0_rgba(255,255,255,0.1)] space-y-2 select-none">
            {/* Encabezado de la Tarjeta OP */}
            <div className="flex items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-amber-500 dark:text-amber-400 text-xs">📋</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                  FICHA DE OP VINCULADA
                </span>
              </div>
              <div className="flex items-center gap-1">
                {opData.tieneRetraso && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-black bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 px-1.5 py-0.5 rounded-full animate-pulse">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    RETRASO &gt;3D
                  </span>
                )}
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${getEstadoBadgeClass(opData.estado)}`}>
                  {opData.estado}
                </span>
              </div>
            </div>

            {/* Contenido Visual: Foto + Info Clave */}
            <div className="flex gap-2.5 items-start">
              {/* Foto miniatura */}
              {(opData.fotoMuestraUrl || opData.fotoCalidadUrl) ? (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-black shrink-0 relative group">
                  <SmartPhotoDisplay
                    rawUrl={opData.fotoCalidadUrl || opData.fotoMuestraUrl}
                    alt={opData.op}
                    title={opData.op}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/90 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600 shrink-0">
                  <FileText className="w-6 h-6" />
                  <span className="text-[8px] font-mono mt-1 font-bold">STF OP</span>
                </div>
              )}

              {/* Datos de la OP */}
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm sm:text-base font-black text-zinc-900 dark:text-white tracking-wide">
                    {opData.op}
                  </span>
                  {opData.dictamen && opData.dictamen !== 'PENDIENTE' && (
                    <span className={`text-[9px] font-black px-1.5 py-0.2 rounded border ${
                      opData.dictamen.includes('APROBADO') 
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700' 
                        : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700'
                    }`}>
                      {opData.dictamen}
                    </span>
                  )}
                </div>

                <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                  {opData.tela || 'TELA NO ESPECIFICADA'}
                </div>

                <div className="text-[10px] text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                  {opData.color && <span>Color: <strong className="text-zinc-800 dark:text-zinc-300">{opData.color}</strong></span>}
                  {opData.diasHabiles !== undefined && (
                    <span className="flex items-center gap-0.5 text-zinc-500 dark:text-zinc-400">
                      <Clock className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                      {opData.diasHabiles} días hábiles
                    </span>
                  )}
                </div>

                {opData.observacion && (
                  <p className="text-[10px] text-zinc-700 dark:text-zinc-300 line-clamp-1 italic bg-zinc-100 dark:bg-zinc-900/60 p-1 rounded border border-zinc-200 dark:border-zinc-800/80">
                    "{opData.observacion}"
                  </p>
                )}
              </div>
            </div>

            {/* Botones de Acción Rápida en la Tarjeta */}
            <div className="flex items-center gap-1.5 pt-1 border-t border-zinc-200 dark:border-zinc-800/80">
              {onViewOpDetail && (
                <button
                  type="button"
                  onClick={() => onViewOpDetail(opData.op)}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white text-[10.5px] font-bold flex items-center justify-center gap-1 transition cursor-pointer border border-zinc-200 dark:border-zinc-700 shadow-sm"
                >
                  <ExternalLink className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>Ver Ficha Técnica</span>
                </button>
              )}
              {onPrintOp && (
                <button
                  type="button"
                  onClick={() => onPrintOp(opData.op)}
                  className="py-1.5 px-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[10.5px] font-bold flex items-center justify-center gap-1 transition cursor-pointer border border-zinc-200 dark:border-zinc-700 shadow-sm"
                  title="Imprimir Etiqueta Térmica"
                >
                  <Printer className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />
                  <span className="hidden xs:inline">Etiqueta</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* 2. REPRODUCTOR DE NOTA DE VOZ (AUDIO ESTILO WHATSAPP) */}
        {message.audioUrl && (
          <div className={`my-1.5 flex items-center gap-2.5 p-2 rounded-xl min-w-[200px] sm:min-w-[240px] ${
            isOwnMessage ? 'bg-black/20' : 'bg-zinc-100 dark:bg-black/30 border border-zinc-200/60 dark:border-white/10'
          }`}>
            <audio 
              ref={audioRef} 
              src={message.audioUrl} 
              onTimeUpdate={handleTimeUpdate} 
              onEnded={handleAudioEnded}
              preload="metadata"
            />
            
            <button
              type="button"
              onClick={toggleAudio}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition shrink-0 cursor-pointer shadow ${
                isOwnMessage ? 'bg-white text-emerald-900' : 'bg-emerald-600 text-white'
              }`}
            >
              {isPlayingAudio ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>

            {/* Visualizador de Onda de Audio Estilo WhatsApp */}
            <div className="flex-1 flex flex-col justify-center gap-1">
              <div className="flex items-center gap-0.5 h-6">
                {(message.audioWaveform || [40, 60, 30, 80, 50, 90, 40, 70, 60, 30, 80, 50, 40, 60, 30, 90]).map((h, i) => {
                  const barProgress = (i / 16) * 100;
                  const isPassed = barProgress <= audioProgress;
                  return (
                    <div
                      key={i}
                      className={`w-1 rounded-full transition-colors ${
                        isPassed 
                          ? (isOwnMessage ? 'bg-white' : 'bg-emerald-500') 
                          : (isOwnMessage ? 'bg-emerald-800/60' : 'bg-zinc-300 dark:bg-zinc-600')
                      }`}
                      style={{ height: `${Math.max(20, Math.min(100, typeof h === 'number' ? (h > 1 ? h : h * 100) : 50))}%` }}
                    />
                  );
                })}
              </div>

              <div className={`flex justify-between items-center text-[9px] font-mono ${isOwnMessage ? 'text-white/80' : 'text-zinc-500 dark:text-zinc-400'}`}>
                <span>{message.audioDuracion ? `0:${message.audioDuracion < 10 ? '0' : ''}${message.audioDuracion}` : '0:05'}</span>
                <span className="text-[8px] opacity-75">Nota de voz</span>
              </div>
            </div>
          </div>
        )}

        {/* 3. IMAGEN ADJUNTA */}
        {message.archivoUrl && message.archivoTipo === 'imagen' && (
          <div className="mb-2 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700/60 max-w-sm">
            <img 
              src={message.archivoUrl} 
              alt={message.archivoNombre || 'Imagen enviada'} 
              className="w-full h-auto max-h-72 object-cover cursor-pointer hover:opacity-95 transition"
              onClick={() => window.open(message.archivoUrl, '_blank')}
            />
          </div>
        )}

        {/* 4. TEXTO DEL MENSAJE */}
        {message.mensaje && (
          <p className="text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap break-words">
            {message.mensaje}
          </p>
        )}

        {/* 5. METADATOS: HORA Y DOBLE CHECK AZUL/GRIS */}
        <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] select-none ${
          isOwnMessage ? 'text-white/80' : 'text-zinc-500 dark:text-zinc-400'
        }`}>
          <span className="font-mono text-[9.5px]">
            {message.timestamp}
          </span>
          {isOwnMessage && (
            <span className="ml-0.5" title={message.leido ? 'Leído' : 'Entregado'}>
              {message.leido ? (
                <CheckCheck className="w-3.5 h-3.5 text-cyan-200 dark:text-[#53bdeb]" />
              ) : (
                <CheckCheck className="w-3.5 h-3.5 text-white/70" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
