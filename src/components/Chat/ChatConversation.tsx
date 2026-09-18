import React, { useRef, useEffect } from 'react';
import { 
  ArrowLeft, Zap, Phone, Video, Search, MoreVertical, 
  Users, AlertTriangle, ShieldCheck 
} from 'lucide-react';
import { ChatMessage, SolicitudColcha } from '../../types';
import { UsuarioSTF } from '../../services/authService';
import { ChatMessageBubble } from './ChatMessageBubble';
import { ChatInputBar } from './ChatInputBar';

interface ChatConversationProps {
  canalId: string;
  canalTitle: string;
  messages: ChatMessage[];
  currentUser: UsuarioSTF | null;
  solicitudes: SolicitudColcha[];
  onBackToSidebar?: () => void;
  onSendMessage: (text: string) => void;
  onSendVoiceNote: (audioData: { base64: string; duration: number; waveform: number[] }) => void;
  onSendImage: (imageDataUrl: string, imageName: string) => void;
  onOpenOpSelector: () => void;
  onViewOpDetail?: (opCode: string) => void;
  onPrintOp?: (opCode: string) => void;
  delayedOpsCount?: number;
  isDarkMode?: boolean;
}

export const ChatConversation: React.FC<ChatConversationProps> = ({
  canalId,
  canalTitle,
  messages,
  currentUser,
  solicitudes,
  onBackToSidebar,
  onSendMessage,
  onSendVoiceNote,
  onSendImage,
  onOpenOpSelector,
  onViewOpDetail,
  onPrintOp,
  delayedOpsCount = 0,
  isDarkMode = true
}) => {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  return (
    <div className={`flex-1 flex flex-col h-full relative overflow-hidden select-none transition-colors duration-200 ${
      isDarkMode ? 'bg-[#030712] text-[#e9edef]' : 'bg-slate-50 text-zinc-900'
    }`}>
      
      {/* 1. Header de la Conversación Activa */}
      <div className={`h-14 sm:h-16 px-3 sm:px-4 flex items-center justify-between border-b z-20 shrink-0 backdrop-blur-md transition-colors duration-200 ${
        isDarkMode 
          ? 'bg-zinc-950/90 border-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]' 
          : 'bg-white/95 border-zinc-200 text-zinc-900 shadow-sm'
      }`}>
        
        {/* Izquierda: Botón Atrás (móvil) + Avatar + Nombre */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          
          {onBackToSidebar && (
            <button
              type="button"
              onClick={onBackToSidebar}
              className={`md:hidden p-1.5 rounded-full transition cursor-pointer ${
                isDarkMode 
                  ? 'hover:bg-zinc-800 text-zinc-300 hover:text-white' 
                  : 'hover:bg-zinc-100 text-zinc-600 hover:text-black'
              }`}
              title="Volver a la lista de chats"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow">
            {canalId === 'GENERAL' ? (
              <Users className="w-5 h-5" />
            ) : (
              canalTitle.slice(0, 2).toUpperCase()
            )}
          </div>

          <div className="min-w-0">
            <h3 className={`text-xs sm:text-sm font-bold truncate max-w-[160px] sm:max-w-xs md:max-w-md ${
              isDarkMode ? 'text-white' : 'text-zinc-900'
            }`}>
              {canalTitle}
            </h3>
            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>
                {canalId === 'GENERAL'
                  ? 'Equipo General STF • Red Corporativa'
                  : canalId.startsWith('GROUP_')
                  ? 'Grupo Oficial de Trabajo • En línea'
                  : '🔒 Chat Privado y Confidencial 1 a 1'}
              </span>
            </div>
          </div>
        </div>

        {/* Derecha: Botón Vincular OP en Tiempo Real */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          
          <button
            type="button"
            onClick={onOpenOpSelector}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer active:scale-95 ${
              isDarkMode
                ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.4),inset_0_1px_1px_rgba(255,255,255,0.4)]'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-700/20'
            }`}
            title="Abrir panel de OPs para vincularlas directamente a la conversación"
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Vincular OP</span>
            {delayedOpsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-mono font-bold shadow">
                {delayedOpsCount}
              </span>
            )}
          </button>

        </div>

      </div>

      {/* 2. Área Central de Mensajes con Fondo WhatsApp Adaptativo y Marca de Agua STF */}
      <div className="flex-1 relative overflow-hidden flex flex-col">

        {/* RECUADRO ROJO: LOGO DE LA COMPAÑÍA EN EL FONDO CON CONTRASTE PROFESIONAL DIFUMINADO */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0">
          <div className="flex flex-col items-center justify-center p-6 text-center max-w-lg w-full transform -translate-y-2">
            <img
              src={isDarkMode ? '/assets/stf-group-logo-white.png' : '/assets/stf-group-logo-black.png'}
              alt="STF GROUP"
              className={`w-72 sm:w-88 md:w-[440px] max-w-[82vw] object-contain transition-all duration-500 filter ${
                isDarkMode 
                  ? 'opacity-[0.09] brightness-125 drop-shadow-[0_0_35px_rgba(255,255,255,0.25)] blur-[0.3px]' 
                  : 'opacity-[0.08] grayscale contrast-125 drop-shadow-[0_4px_16px_rgba(0,0,0,0.12)] blur-[0.2px]'
              }`}
            />
            <div className={`mt-2.5 text-[9.5px] sm:text-[10.5px] font-black tracking-[0.28em] uppercase transition-colors duration-300 select-none ${
              isDarkMode 
                ? 'text-white/15 [text-shadow:0_0_12px_rgba(255,255,255,0.15)]' 
                : 'text-zinc-900/20'
            }`}>
              CONTROL DE CALIDAD • TEXTIL & CONFECCIÓN
            </div>
          </div>
        </div>

        {/* Contenedor de Mensajes con Scroll */}
        <div 
          className="flex-1 overflow-y-auto px-2 sm:px-6 py-3 space-y-1 custom-scroll relative z-10"
          style={{
            backgroundImage: isDarkMode
              ? `radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px)`
              : `radial-gradient(rgba(0, 0, 0, 0.08) 1.2px, transparent 1.2px)`,
            backgroundSize: '20px 20px'
          }}
        >
          {/* Banner Informativo de Cifrado y Privacidad Corporativa */}
          <div className="flex justify-center my-3">
            <div className={`rounded-xl px-3 py-1.5 text-center text-[10.5px] flex items-center gap-1.5 max-w-md transition-all duration-200 ${
              isDarkMode 
                ? 'bg-zinc-900/90 border border-white/15 text-zinc-300 shadow-[0_0_20px_rgba(255,255,255,0.05),inset_0_1px_0_rgba(255,255,255,0.15)]' 
                : 'bg-white border border-zinc-200/90 text-zinc-600 shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
            }`}>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                {canalId.startsWith('DIRECT_')
                  ? '🔒 Chat 1 a 1 estrictamente privado. Solo ustedes dos pueden ver y enviar mensajes aquí.'
                  : canalId.startsWith('GROUP_')
                  ? '👥 Grupo Corporativo: Mensajes compartidos en tiempo real con este grupo de trabajo.'
                  : '🌐 Sala General STF: Mensajes visibles en tiempo real para todo el equipo.'}
              </span>
            </div>
          </div>

          {/* Separador de Fecha */}
          <div className="flex justify-center my-2">
            <span className={`text-[10px] font-mono font-bold px-3 py-1 rounded-lg border uppercase tracking-wide transition-all duration-200 ${
              isDarkMode 
                ? 'bg-zinc-900 text-zinc-300 border-white/15 shadow-sm' 
                : 'bg-white text-zinc-700 border-zinc-200/90 shadow-[0_2px_6px_rgba(0,0,0,0.07)]'
            }`}>
              HOY
            </span>
          </div>

          {/* Burbujas de Mensajes */}
          {messages.map((msg) => {
            const isOwn = currentUser ? msg.remitenteId === currentUser.id : false;

            return (
              <ChatMessageBubble
                key={msg.id}
                message={msg}
                isOwnMessage={isOwn}
                currentUser={currentUser}
                onViewOpDetail={onViewOpDetail}
                onPrintOp={onPrintOp}
                allSolicitudes={solicitudes}
                isDarkMode={isDarkMode}
              />
            );
          })}

          <div ref={messagesEndRef} />
        </div>

      </div>

      {/* 3. Barra Inferior de Entrada (WhatsApp Input Bar) */}
      <ChatInputBar
        onSendMessage={onSendMessage}
        onSendVoiceNote={onSendVoiceNote}
        onSendImage={onSendImage}
        onOpenOpSelector={onOpenOpSelector}
        isDarkMode={isDarkMode}
      />

    </div>
  );
};
