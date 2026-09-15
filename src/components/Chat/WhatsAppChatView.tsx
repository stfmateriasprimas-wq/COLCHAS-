import React, { useState, useEffect, useMemo } from 'react';
import { UsuarioSTF, getUsuariosList, syncUsuariosFromSheets } from '../../services/authService';
import { SolicitudColcha, ChatMessage } from '../../types';
import { chatService } from '../../services/chatService';
import { notificationService } from '../../services/notificationService';
import { ChatSidebar } from './ChatSidebar';
import { ChatConversation } from './ChatConversation';
import { ChatOpsSelectorModal } from './ChatOpsSelectorModal';

interface WhatsAppChatViewProps {
  currentUser: UsuarioSTF | null;
  solicitudes: SolicitudColcha[];
  onViewOpDetail?: (opCode: string) => void;
  onPrintOp?: (opCode: string) => void;
}

export const WhatsAppChatView: React.FC<WhatsAppChatViewProps> = ({
  currentUser,
  solicitudes,
  onViewOpDetail,
  onPrintOp
}) => {
  const [activeCanalId, setActiveCanalId] = useState<string>('GENERAL');
  const [activeCanalTitle, setActiveCanalTitle] = useState<string>('General STF • Control de Calidad');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [allMessages, setAllMessages] = useState<ChatMessage[]>(() => chatService.getCachedMessages());
  const [activeUsers, setActiveUsers] = useState<UsuarioSTF[]>(() => getUsuariosList());
  const [isOpsModalOpen, setIsOpsModalOpen] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(() => chatService.isSoundEnabled());
  const [hasNotificationPermission, setHasNotificationPermission] = useState(() => notificationService.hasPermission());
  
  // Estado para alternar entre lista y conversación en pantallas móviles (< md)
  const [mobileScreen, setMobileScreen] = useState<'SIDEBAR' | 'CONVERSATION'>('SIDEBAR');

  // 1. Sincronizar usuarios desde Google Sheets al entrar
  useEffect(() => {
    syncUsuariosFromSheets().then((users) => {
      if (users && users.length > 0) setActiveUsers(users);
    }).catch(() => {});
  }, []);

  // 2. Suscribirse a mensajes del canal activo en tiempo real
  useEffect(() => {
    const currentUserId = currentUser?.id || 'anon';
    const unsubscribe = chatService.subscribeToMessages(activeCanalId, currentUserId, (updatedMsgs) => {
      setMessages(updatedMsgs);
    });

    return () => {
      unsubscribe();
    };
  }, [activeCanalId, currentUser]);

  // 3. Suscribirse a todos los mensajes para actualizar los previews de la barra lateral
  useEffect(() => {
    const currentUserId = currentUser?.id || 'anon';
    const unsubscribeAll = chatService.subscribeToMessages('ALL_CHANNELS', currentUserId, (all) => {
      setAllMessages(all);
    });

    return () => {
      unsubscribeAll();
    };
  }, [currentUser]);

  // Total de OPs con retraso
  const delayedOpsCount = useMemo(() => {
    return solicitudes.filter(s => s.tieneRetraso && s.estado !== 'FINALIZADO').length;
  }, [solicitudes]);

  // Manejador para seleccionar canal o contacto
  const handleSelectCanal = (canalId: string, title: string) => {
    setActiveCanalId(canalId);
    setActiveCanalTitle(title);
    setMobileScreen('CONVERSATION');
  };

  // Enviar texto
  const handleSendMessage = async (text: string) => {
    if (!currentUser) return;
    await chatService.sendMessage({
      remitente: currentUser.nombre,
      remitenteId: currentUser.id,
      area: currentUser.area,
      mensaje: text,
      canalId: activeCanalId
    });
  };

  // Enviar nota de voz
  const handleSendVoiceNote = async (audioData: { base64: string; duration: number; waveform: number[] }) => {
    if (!currentUser) return;
    await chatService.sendMessage({
      remitente: currentUser.nombre,
      remitenteId: currentUser.id,
      area: currentUser.area,
      mensaje: '',
      canalId: activeCanalId,
      audioUrl: audioData.base64,
      audioDuracion: audioData.duration,
      audioWaveform: audioData.waveform,
      tipo: 'audio'
    });
  };

  // Enviar imagen
  const handleSendImage = async (imageDataUrl: string, imageName: string) => {
    if (!currentUser) return;
    await chatService.sendMessage({
      remitente: currentUser.nombre,
      remitenteId: currentUser.id,
      area: currentUser.area,
      mensaje: '📷 Envió una imagen',
      canalId: activeCanalId,
      archivoUrl: imageDataUrl,
      archivoNombre: imageName,
      archivoTipo: 'imagen',
      tipo: 'archivo'
    });
  };

  // Vincular OP seleccionada desde el modal de OPs en tiempo real
  const handleSelectOpToShare = async (solicitud: SolicitudColcha, note?: string) => {
    if (!currentUser) return;
    await chatService.shareOpInChat(solicitud, currentUser, activeCanalId, note);
  };

  // Alternar sonido cómodo
  const handleToggleSound = () => {
    const next = !isSoundEnabled;
    setIsSoundEnabled(next);
    chatService.setSoundEnabled(next);
    if (next) chatService.playReceivedSound();
  };

  // Solicitar permiso de notificaciones push nativas
  const handleRequestNotifications = async () => {
    const granted = await notificationService.requestNotificationPermission();
    setHasNotificationPermission(granted);
    if (granted) {
      notificationService.testNotificationWithSound(currentUser?.nombre || 'USUARIO STF');
    } else {
      alert('Las notificaciones están bloqueadas en tu navegador. Por favor habilítalas en la barra de direcciones del navegador.');
    }
  };

  return (
    <div className="w-full h-[calc(100vh-140px)] min-h-[550px] max-h-[850px] rounded-2xl sm:rounded-3xl border border-zinc-800 bg-[#111b21] shadow-2xl overflow-hidden flex flex-col relative select-none animate-in fade-in duration-300">
      
      {/* Contenedor Dual Responsivo (Mobile & Desktop) */}
      <div className="flex-1 flex overflow-hidden w-full relative">
        
        {/* Panel 1: Barra Lateral de Chats (en Móvil se muestra si mobileScreen === 'SIDEBAR') */}
        <div className={`w-full md:w-80 lg:w-96 flex flex-col h-full ${
          mobileScreen === 'SIDEBAR' ? 'flex' : 'hidden md:flex'
        }`}>
          <ChatSidebar
            currentUser={currentUser}
            activeCanalId={activeCanalId}
            onSelectCanal={handleSelectCanal}
            activeUsers={activeUsers}
            allMessages={allMessages}
            solicitudes={solicitudes}
            isSoundEnabled={isSoundEnabled}
            onToggleSound={handleToggleSound}
            hasNotificationPermission={hasNotificationPermission}
            onRequestNotifications={handleRequestNotifications}
            onOpenOpsModal={() => setIsOpsModalOpen(true)}
          />
        </div>

        {/* Panel 2: Conversación Activa (en Móvil se muestra si mobileScreen === 'CONVERSATION') */}
        <div className={`flex-1 flex flex-col h-full ${
          mobileScreen === 'CONVERSATION' ? 'flex' : 'hidden md:flex'
        }`}>
          <ChatConversation
            canalId={activeCanalId}
            canalTitle={activeCanalTitle}
            messages={messages}
            currentUser={currentUser}
            solicitudes={solicitudes}
            onBackToSidebar={() => setMobileScreen('SIDEBAR')}
            onSendMessage={handleSendMessage}
            onSendVoiceNote={handleSendVoiceNote}
            onSendImage={handleSendImage}
            onOpenOpSelector={() => setIsOpsModalOpen(true)}
            onViewOpDetail={onViewOpDetail}
            onPrintOp={onPrintOp}
            delayedOpsCount={delayedOpsCount}
          />
        </div>

      </div>

      {/* Modal / Drawer Desplegable de OPs en Tiempo Real (Retrasos y En Proceso) */}
      <ChatOpsSelectorModal
        isOpen={isOpsModalOpen}
        onClose={() => setIsOpsModalOpen(false)}
        solicitudes={solicitudes}
        onSelectOpToShare={handleSelectOpToShare}
      />

    </div>
  );
};
