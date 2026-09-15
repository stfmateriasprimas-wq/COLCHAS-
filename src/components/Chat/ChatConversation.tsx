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
  delayedOpsCount = 0
}) => {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b141a] relative overflow-hidden select-none">
      
      {/* 1. Header de la Conversación Activa */}
      <div className="h-14 sm:h-16 px-3 sm:px-4 bg-[#202c33] flex items-center justify-between border-b border-zinc-700/60 z-10 shrink-0">
        
        {/* Izquierda: Botón Atrás (móvil) + Avatar + Nombre */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          
          {onBackToSidebar && (
            <button
              type="button"
              onClick={onBackToSidebar}
              className="md:hidden p-1.5 rounded-full hover:bg-zinc-700 text-zinc-300 hover:text-white transition cursor-pointer"
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
            <h3 className="text-xs sm:text-sm font-bold text-white truncate max-w-[160px] sm:max-w-xs md:max-w-md">
              {canalTitle}
            </h3>
            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-emerald-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{canalId === 'GENERAL' ? 'Equipo Calidad, Lavandería & ZF' : 'En línea • STF Red Interna'}</span>
            </div>
          </div>
        </div>

        {/* Derecha: Botón Vincular OP en Tiempo Real */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          
          <button
            type="button"
            onClick={onOpenOpSelector}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer shadow-md active:scale-95"
            title="Abrir panel de OPs para vincularlas directamente a la conversación"
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Vincular OP</span>
            {delayedOpsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-mono font-bold">
                {delayedOpsCount}
              </span>
            )}
          </button>

        </div>

      </div>

      {/* 2. Área Central de Mensajes con Fondo WhatsApp */}
      <div 
        className="flex-1 overflow-y-auto px-2 sm:px-6 py-3 space-y-1 custom-scroll"
        style={{
          backgroundImage: `radial-gradient(#1f2c34 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
        }}
      >
        {/* Banner Informativo de Cifrado y Privacidad Corporativa */}
        <div className="flex justify-center my-3">
          <div className="bg-[#182229]/90 border border-zinc-800 rounded-xl px-3 py-1.5 text-center text-[10.5px] text-zinc-400 flex items-center gap-1.5 shadow-sm max-w-md">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Los mensajes y OPs compartidas se sincronizan en tiempo real con todo el equipo.</span>
          </div>
        </div>

        {/* Separador de Fecha */}
        <div className="flex justify-center my-2">
          <span className="bg-[#182229] text-zinc-400 text-[10px] font-mono font-bold px-3 py-1 rounded-lg border border-zinc-800 uppercase tracking-wide">
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
            />
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. Barra Inferior de Entrada (WhatsApp Input Bar) */}
      <ChatInputBar
        onSendMessage={onSendMessage}
        onSendVoiceNote={onSendVoiceNote}
        onSendImage={onSendImage}
        onOpenOpSelector={onOpenOpSelector}
      />

    </div>
  );
};
