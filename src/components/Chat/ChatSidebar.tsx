import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, Users, MessageSquare, AlertTriangle, Zap, 
  Volume2, VolumeX, Bell, BellOff, CheckCheck, Clock, User,
  Microscope, Droplets, Scissors, Shirt, Package, Globe, Pin
} from 'lucide-react';
import { UsuarioSTF } from '../../services/authService';
import { ChatMessage, SolicitudColcha } from '../../types';
import { chatService, WORKGROUPS_STF, ChatWorkgroup } from '../../services/chatService';

interface ChatSidebarProps {
  currentUser: UsuarioSTF | null;
  activeCanalId: string;
  onSelectCanal: (canalId: string, title: string) => void;
  activeUsers: UsuarioSTF[];
  allMessages: ChatMessage[];
  solicitudes: SolicitudColcha[];
  isSoundEnabled: boolean;
  onToggleSound: () => void;
  hasNotificationPermission: boolean;
  onRequestNotifications: () => void;
  onOpenOpsModal: () => void;
  isDarkMode?: boolean;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  currentUser,
  activeCanalId,
  onSelectCanal,
  activeUsers,
  allMessages,
  solicitudes,
  isSoundEnabled,
  onToggleSound,
  hasNotificationPermission,
  onRequestNotifications,
  onOpenOpsModal,
  isDarkMode
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPill, setFilterPill] = useState<'TODOS' | 'NO_LEIDOS' | 'GRUPOS' | 'RETRASOS'>('TODOS');
  const [readTick, setReadTick] = useState(0);

  const currentUserId = currentUser?.id || '';

  // Escuchar evento de actualización de lectura para refrescar en caliente badges y filtros
  useEffect(() => {
    const handleRead = () => {
      setReadTick(prev => prev + 1);
    };
    window.addEventListener('stf_chat_read_updated', handleRead);
    return () => {
      window.removeEventListener('stf_chat_read_updated', handleRead);
    };
  }, []);

  // Helper para obtener marca de tiempo en milisegundos de un mensaje
  const getMessageMillis = (msg?: ChatMessage | null): number => {
    if (!msg) return 0;
    if (msg.createdMillis && msg.createdMillis > 0) return msg.createdMillis;
    if (msg.fecha) {
      const dateStr = `${msg.fecha} ${msg.timestamp || '00:00'}`;
      const parsed = new Date(dateStr).getTime();
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return 0;
  };

  // Manejador centralizado al seleccionar cualquier canal o chat (marca como leído inmediatamente)
  const handleSelectChannel = (canalId: string, title: string) => {
    if (currentUser) {
      chatService.markChannelAsRead(currentUser.id, canalId);
    }
    setReadTick(prev => prev + 1);
    onSelectCanal(canalId, title);
  };

  // Conteo de OPs con retraso SLA
  const delayedOpsCount = useMemo(() => {
    return solicitudes.filter(s => s.tieneRetraso && s.estado !== 'FINALIZADO').length;
  }, [solicitudes]);

  // Mensajes no leídos en canal General
  const generalUnread = useMemo(() => {
    return chatService.getUnreadCount(currentUserId, 'GENERAL', allMessages);
  }, [currentUserId, allMessages, readTick]);

  // Conteo de no leídos en Grupos
  const groupsTotalUnread = useMemo(() => {
    let sum = 0;
    WORKGROUPS_STF.forEach(wg => {
      sum += chatService.getUnreadCount(currentUserId, wg.id, allMessages);
    });
    return sum;
  }, [currentUserId, allMessages, readTick]);

  // Total global de mensajes no leídos
  const totalGlobalUnread = useMemo(() => {
    return chatService.getTotalUnreadCount(currentUserId, allMessages);
  }, [currentUserId, allMessages, readTick]);

  // Obtener último mensaje de cualquier canal
  const getLastMessageOfChannel = (channelId: string) => {
    const channelMsgs = chatService.filterMessagesByChannel(allMessages, channelId, currentUserId);
    return channelMsgs[channelMsgs.length - 1];
  };

  // Mapear último mensaje y no leídos por usuario en chats directos privados
  const getDirectChatInfo = (otherUserId: string) => {
    if (!currentUser) return { lastMsg: null, unread: 0, directCanalId: '' };
    const directCanalId = chatService.getDirectChannelId(currentUser.id, otherUserId);
    const lastMsg = getLastMessageOfChannel(directCanalId);
    const unread = chatService.getUnreadCount(currentUserId, directCanalId, allMessages);
    return { lastMsg, unread, directCanalId };
  };

  // 1. RECUADRO 1: Orden cronológico automático de usuarios (más recientes en la parte superior)
  const sortedUsers = useMemo(() => {
    const baseList = activeUsers.filter(u => {
      if (currentUser && u.id.toLowerCase() === currentUser.id.toLowerCase()) return false;
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase().trim();
      return (
        u.nombre.toLowerCase().includes(q) ||
        u.area.toLowerCase().includes(q) ||
        u.rol.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q)
      );
    });

    if (!currentUser) return baseList;

    return [...baseList].sort((a, b) => {
      const infoA = getDirectChatInfo(a.id);
      const infoB = getDirectChatInfo(b.id);

      const timeA = getMessageMillis(infoA.lastMsg);
      const timeB = getMessageMillis(infoB.lastMsg);

      // Si ambos tienen mensajes, el más reciente va primero (descendente)
      if (timeA > 0 && timeB > 0) {
        return timeB - timeA;
      }
      // Si solo A tiene mensajes, A va arriba
      if (timeA > 0 && timeB === 0) return -1;
      // Si solo B tiene mensajes, B va arriba
      if (timeB > 0 && timeA === 0) return 1;

      // Si ninguno tiene mensajes, ordenar alfabéticamente por nombre
      return a.nombre.localeCompare(b.nombre);
    });
  }, [activeUsers, currentUser, searchTerm, allMessages, readTick]);

  // 2. RECUADRO 2: Lista consolidada de chats con mensajes no leídos
  const unreadChats = useMemo(() => {
    if (!currentUser) return { general: false, directUsers: [], groups: [] };

    // A. General
    const isGeneralUnread = generalUnread > 0;

    // B. Chats Directos No Leídos
    const directUsers = activeUsers
      .filter(u => {
        if (currentUser && u.id.toLowerCase() === currentUser.id.toLowerCase()) return false;
        const info = getDirectChatInfo(u.id);
        if (info.unread <= 0) return false;
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase().trim();
        return (
          u.nombre.toLowerCase().includes(q) ||
          u.area.toLowerCase().includes(q) ||
          u.rol.toLowerCase().includes(q) ||
          u.id.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const infoA = getDirectChatInfo(a.id);
        const infoB = getDirectChatInfo(b.id);
        return getMessageMillis(infoB.lastMsg) - getMessageMillis(infoA.lastMsg);
      });

    // C. Grupos de Trabajo No Leídos
    const groups = WORKGROUPS_STF
      .filter(wg => {
        if (wg.id === 'GENERAL') return false;
        const unread = chatService.getUnreadCount(currentUserId, wg.id, allMessages);
        if (unread <= 0) return false;
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase().trim();
        return (
          wg.nombre.toLowerCase().includes(q) ||
          wg.area.toLowerCase().includes(q) ||
          wg.descripcion.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const lastMsgA = getLastMessageOfChannel(a.id);
        const lastMsgB = getLastMessageOfChannel(b.id);
        return getMessageMillis(lastMsgB) - getMessageMillis(lastMsgA);
      });

    return {
      general: isGeneralUnread,
      directUsers,
      groups
    };
  }, [currentUser, activeUsers, generalUnread, allMessages, searchTerm, readTick]);

  // Filtrar grupos de trabajo y ordenar por actividad reciente
  const filteredWorkgroups = useMemo(() => {
    const base = !searchTerm.trim()
      ? WORKGROUPS_STF
      : WORKGROUPS_STF.filter(wg => {
          const q = searchTerm.toLowerCase().trim();
          return (
            wg.nombre.toLowerCase().includes(q) ||
            wg.area.toLowerCase().includes(q) ||
            wg.descripcion.toLowerCase().includes(q)
          );
        });

    return [...base].sort((a, b) => {
      const lastMsgA = getLastMessageOfChannel(a.id);
      const lastMsgB = getLastMessageOfChannel(b.id);
      const timeA = getMessageMillis(lastMsgA);
      const timeB = getMessageMillis(lastMsgB);
      if (timeA > 0 && timeB > 0) return timeB - timeA;
      if (timeA > 0 && timeB === 0) return -1;
      if (timeB > 0 && timeA === 0) return 1;
      return 0;
    });
  }, [searchTerm, allMessages, readTick]);

  // Obtener miembros del grupo de trabajo
  const getGroupMembers = (area: string) => {
    if (area === 'TODAS') return activeUsers;
    return activeUsers.filter(u => {
      const a = (u.area || '').toUpperCase();
      if (area === 'CALIDAD ZF') return a === 'CALIDAD ZF' || a.includes('ZF') || a.includes('ATELIER') || u.isZonaFranca;
      if (area === 'LAVANDERÍA') return a === 'LAVANDERÍA' || a.includes('LAVAND') || a.includes('COLFACTORY');
      if (area === 'CALIDAD') return a === 'CALIDAD' && !a.includes('ZF');
      if (area === 'COLECCIONES') return a === 'COLECCIONES' || a.includes('COLECCION') || a.includes('MARCAS');
      if (area === 'DESPACHO') return a === 'DESPACHO' || a.includes('DESPACHO');
      return false;
    });
  };

  // Color de dot de área
  const getAreaDotColor = (area: string) => {
    const a = area.toUpperCase();
    if (a.includes('ZF') || a.includes('ATELIER')) return 'bg-purple-500';
    if (a.includes('LAVANDERIA')) return 'bg-sky-500';
    if (a.includes('CALIDAD')) return 'bg-emerald-500';
    if (a.includes('COLECCION')) return 'bg-amber-500';
    if (a.includes('DESPACHO')) return 'bg-teal-500';
    return 'bg-emerald-500';
  };

  // Icono dinámico para grupos
  const renderWorkgroupIcon = (area: string) => {
    switch (area) {
      case 'CALIDAD': return <Microscope className="w-5 h-5 text-purple-400" />;
      case 'CALIDAD ZF': return <Scissors className="w-5 h-5 text-indigo-400" />;
      case 'LAVANDERÍA': return <Droplets className="w-5 h-5 text-sky-400" />;
      case 'COLECCIONES': return <Shirt className="w-5 h-5 text-amber-400" />;
      case 'DESPACHO': return <Package className="w-5 h-5 text-teal-400" />;
      default: return <Globe className="w-5 h-5 text-emerald-400" />;
    }
  };

  return (
    <div className="w-full md:w-80 lg:w-96 flex flex-col h-full bg-white dark:bg-black border-r border-zinc-200 dark:border-white/15 text-zinc-900 dark:text-[#e9edef] select-none shrink-0 transition-colors duration-200">
      
      {/* 1. Header de la Barra Lateral WhatsApp */}
      <div className="h-14 sm:h-16 px-3 sm:px-4 bg-zinc-50/90 dark:bg-zinc-950/90 flex items-center justify-between border-b border-zinc-200 dark:border-white/15 backdrop-blur-md dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
        
        {/* Perfil del Usuario Actual */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center border border-emerald-400/40 shadow">
            {currentUser?.nombre ? currentUser.nombre.slice(0, 2).toUpperCase() : 'STF'}
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-bold text-zinc-900 dark:text-white truncate max-w-[120px] sm:max-w-[140px]">
              {currentUser?.nombre || 'Mi Usuario'}
            </h2>
            <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
              <span className={`w-1.5 h-1.5 rounded-full ${getAreaDotColor(currentUser?.area || '')} animate-pulse`}></span>
              <span>{currentUser?.area || 'CALIDAD'}</span>
            </div>
          </div>
        </div>

        {/* Acciones Rápidas: Sonido, Notificaciones Push y OPs */}
        <div className="flex items-center gap-1">
          
          {/* Botón Notificaciones Push */}
          <button
            type="button"
            onClick={onRequestNotifications}
            className={`p-1.5 rounded-full transition cursor-pointer ${
              hasNotificationPermission 
                ? 'text-emerald-600 dark:text-emerald-400 hover:bg-zinc-200/70 dark:hover:bg-white/10' 
                : 'text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/60 animate-bounce'
            }`}
            title={hasNotificationPermission ? 'Notificaciones Push activas (Móvil y PC)' : '🔔 Haz clic para activar notificaciones con pantalla bloqueada'}
          >
            {hasNotificationPermission ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </button>

          {/* Botón Sonido Cómodo */}
          <button
            type="button"
            onClick={onToggleSound}
            className={`p-1.5 rounded-full transition cursor-pointer ${
              isSoundEnabled ? 'text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white hover:bg-zinc-200/70 dark:hover:bg-white/10' : 'text-zinc-400 dark:text-zinc-500 hover:bg-zinc-200/70 dark:hover:bg-white/10'
            }`}
            title={isSoundEnabled ? 'Sonido activado' : 'Sonido silenciado'}
          >
            {isSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Botón OPs en Tiempo Real */}
          <button
            type="button"
            onClick={onOpenOpsModal}
            className="p-1.5 rounded-full text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white hover:bg-zinc-200/70 dark:hover:bg-white/10 transition cursor-pointer relative"
            title="Ver OPs en Tiempo Real"
          >
            <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            {delayedOpsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-mono font-bold flex items-center justify-center shadow">
                {delayedOpsCount}
              </span>
            )}
          </button>

        </div>

      </div>

      {/* 2. Buscador estilo WhatsApp */}
      <div className="p-2 sm:p-2.5 bg-white dark:bg-black border-b border-zinc-200/80 dark:border-white/10">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={filterPill === 'GRUPOS' ? "Buscar grupo de trabajo..." : "Buscar un chat o iniciar uno nuevo"}
            className="w-full pl-9 pr-7 py-1.5 sm:py-2 bg-zinc-100/90 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-white/15 rounded-xl text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 dark:focus:border-white/30 transition shadow-inner dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-800 dark:hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 3. Filtros Superiores (Pills) con Etiquetas Rojas de No Leídos */}
      <div className="px-2 sm:px-3 py-2 flex items-center gap-1.5 overflow-x-auto border-b border-zinc-200/80 dark:border-white/10 bg-white dark:bg-black custom-scroll">
        
        {/* Pestaña: Todos */}
        <button
          type="button"
          onClick={() => setFilterPill('TODOS')}
          className={`px-3 py-1 rounded-full text-[11px] font-bold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
            filterPill === 'TODOS'
              ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-black shadow-md shadow-emerald-950/20 dark:shadow-[0_0_15px_rgba(16,185,129,0.5),inset_0_1px_1px_rgba(255,255,255,0.4)]'
              : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white border border-zinc-200/80 dark:border-white/10'
          }`}
        >
          <span>Todos</span>
          {totalGlobalUnread > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-mono font-black animate-pulse shadow-sm">
              {totalGlobalUnread}
            </span>
          )}
        </button>

        {/* Pestaña: Grupos de Trabajo (Calidad ZF, Lavandería, Calidad, Colecciones, etc.) */}
        <button
          type="button"
          onClick={() => setFilterPill('GRUPOS')}
          className={`px-3 py-1 rounded-full text-[11px] font-bold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
            filterPill === 'GRUPOS'
              ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-black shadow-md shadow-emerald-950/20 dark:shadow-[0_0_15px_rgba(16,185,129,0.5),inset_0_1px_1px_rgba(255,255,255,0.4)]'
              : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white border border-zinc-200/80 dark:border-white/10'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Grupos</span>
          {groupsTotalUnread > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-mono font-black animate-pulse shadow-sm">
              {groupsTotalUnread}
            </span>
          )}
        </button>

        {/* Pestaña: OPs con Retraso */}
        <button
          type="button"
          onClick={() => {
            setFilterPill('RETRASOS');
            onOpenOpsModal();
          }}
          className={`px-3 py-1 rounded-full text-[11px] font-bold transition cursor-pointer shrink-0 flex items-center gap-1 ${
            filterPill === 'RETRASOS'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-950/20'
              : 'bg-zinc-100 dark:bg-zinc-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-zinc-200/80 dark:border-rose-900/40'
          }`}
        >
          <AlertTriangle className="w-3 h-3" />
          <span>OPs Retraso ({delayedOpsCount})</span>
        </button>

        {/* Pestaña: No Leídos (Recuadro 2 - Filtro exacto de mensajes pendientes) */}
        <button
          type="button"
          onClick={() => setFilterPill('NO_LEIDOS')}
          className={`px-3 py-1 rounded-full text-[11px] font-bold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
            filterPill === 'NO_LEIDOS'
              ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-black shadow-md shadow-emerald-950/20 dark:shadow-[0_0_15px_rgba(16,185,129,0.5),inset_0_1px_1px_rgba(255,255,255,0.4)]'
              : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white border border-zinc-200/80 dark:border-white/10'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>No leídos</span>
          {totalGlobalUnread > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-mono font-black animate-pulse shadow-sm">
              {totalGlobalUnread}
            </span>
          )}
        </button>

      </div>

      {/* 4. Lista de Conversaciones y Grupos de Trabajo */}
      <div className="flex-1 overflow-y-auto custom-scroll divide-y divide-zinc-100 dark:divide-white/5 bg-white dark:bg-black">
        
        {/* =========================================================================
            MODO: PESTAÑA GRUPOS (Grupos de trabajo oficiales por área)
           ========================================================================= */}
        {filterPill === 'GRUPOS' && (
          <div className="space-y-0.5">
            <div className="px-3 py-1.5 bg-zinc-100/90 dark:bg-zinc-950/80 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 border-y border-zinc-200/60 dark:border-white/5">
              Grupos de Trabajo Corporativos STF
            </div>

            {filteredWorkgroups.map((wg) => {
              const isSelected = activeCanalId === wg.id;
              const lastMsg = getLastMessageOfChannel(wg.id);
              const unread = chatService.getUnreadCount(currentUserId, wg.id, allMessages);
              const members = getGroupMembers(wg.area);
              const isUserMember = wg.area === 'TODAS' || members.some(m => m.id.toLowerCase() === currentUserId.toLowerCase());
              const memberNamesPreview = members.slice(0, 3).map(m => m.nombre.split(' ')[0]).join(', ') + (members.length > 3 ? ` +${members.length - 3}` : '');

              return (
                <div
                  key={wg.id}
                  onClick={() => handleSelectChannel(wg.id, wg.nombre)}
                  className={`flex items-center gap-3 px-3 sm:px-4 py-3 cursor-pointer transition-colors ${
                    isSelected 
                      ? 'bg-emerald-50/90 dark:bg-zinc-900/95 border-l-4 border-l-emerald-600 dark:border-l-emerald-400 text-zinc-900 dark:text-white shadow-sm dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_0_20px_rgba(255,255,255,0.03)]' 
                      : 'hover:bg-zinc-100/90 dark:hover:bg-zinc-900/80 border-l-4 border-l-transparent text-zinc-700 dark:text-zinc-200'
                  }`}
                >
                  <div className="w-11 h-11 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 shadow text-lg">
                    {renderWorkgroupIcon(wg.area)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs sm:text-[13px] font-bold text-zinc-900 dark:text-white truncate">
                          {wg.nombre}
                        </span>
                        {isUserMember && (
                          <span className="px-1.5 py-0.2 rounded text-[8.5px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700/60 shrink-0">
                            Tu Grupo
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 shrink-0 ml-1">
                        {lastMsg?.timestamp || ''}
                      </span>
                    </div>

                    <div className="text-[10px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1 truncate mt-0.5">
                      <span className="text-zinc-400 dark:text-zinc-500 font-mono">👥 {members.length} {members.length === 1 ? 'miembro' : 'miembros'}:</span>
                      <span className="text-zinc-600 dark:text-zinc-400 truncate">{memberNamesPreview}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                      <span className="truncate">
                        {lastMsg ? (
                          <>
                            <strong className="text-zinc-800 dark:text-zinc-300 font-medium">~ {lastMsg.remitente}: </strong>
                            {lastMsg.tipo === 'op' ? `📌 OP ${lastMsg.opRelacionada}` : (lastMsg.mensaje || 'Nota de voz')}
                          </>
                        ) : (
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium italic">
                            {wg.descripcion}
                          </span>
                        )}
                      </span>

                      {/* ETIQUETA ROJA DE NO LEÍDOS */}
                      {unread > 0 && (
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-mono font-black shrink-0 animate-pulse shadow-md shadow-rose-900/60">
                          {unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* =========================================================================
            MODO: PESTAÑA NO LEÍDOS (Recuadro 2 - Vista aislada de chats pendientes)
           ========================================================================= */}
        {filterPill === 'NO_LEIDOS' && (
          <div className="space-y-0.5">
            <div className="px-3 py-1.5 bg-zinc-100/90 dark:bg-zinc-950/80 text-[10px] font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center justify-between border-y border-zinc-200/60 dark:border-white/5">
              <span>Mensajes Pendientes por Leer</span>
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-mono font-black shadow-sm">
                {totalGlobalUnread} pendientes
              </span>
            </div>

            {/* 1. General STF si tiene mensajes no leídos */}
            {unreadChats.general && (
              <div
                onClick={() => handleSelectChannel('GENERAL', 'General STF • Control de Calidad')}
                className={`flex items-center gap-3 px-3 sm:px-4 py-3 cursor-pointer transition-colors ${
                  activeCanalId === 'GENERAL' 
                    ? 'bg-emerald-50/90 dark:bg-zinc-900/95 border-l-4 border-l-emerald-600 dark:border-l-emerald-400 text-zinc-900 dark:text-white shadow-sm dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_0_20px_rgba(255,255,255,0.03)]' 
                    : 'hover:bg-zinc-100/90 dark:hover:bg-zinc-900/80 border-l-4 border-l-transparent text-zinc-700 dark:text-zinc-200'
                }`}
              >
                <div className="w-11 h-11 rounded-full bg-emerald-600 dark:bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow">
                  <Users className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs sm:text-[13px] font-bold text-zinc-900 dark:text-white truncate">
                        General STF
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[8.5px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700/60 shrink-0">
                        Sala General
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                      {getLastMessageOfChannel('GENERAL')?.timestamp || ''}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11.5px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                    <span className="truncate">
                      {getLastMessageOfChannel('GENERAL') ? (
                        <>
                          <strong className="text-zinc-800 dark:text-zinc-300 font-medium">~ {getLastMessageOfChannel('GENERAL')?.remitente}: </strong>
                          {getLastMessageOfChannel('GENERAL')?.tipo === 'op' ? `📌 OP ${getLastMessageOfChannel('GENERAL')?.opRelacionada}` : (getLastMessageOfChannel('GENERAL')?.mensaje || 'Nota de voz')}
                        </>
                      ) : (
                        'Sala corporativa de equipo'
                      )}
                    </span>

                    <span className="ml-2 px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-mono font-black shrink-0 animate-pulse shadow-md shadow-rose-900/60">
                      {generalUnread}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Grupos con mensajes no leídos */}
            {unreadChats.groups.length > 0 && (
              <>
                <div className="px-3 py-1 bg-zinc-100/80 dark:bg-zinc-950/60 text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 border-y border-zinc-200/50 dark:border-white/5">
                  Grupos de Trabajo ({unreadChats.groups.length})
                </div>
                {unreadChats.groups.map(wg => {
                  const isSelected = activeCanalId === wg.id;
                  const lastMsg = getLastMessageOfChannel(wg.id);
                  const unread = chatService.getUnreadCount(currentUserId, wg.id, allMessages);
                  return (
                    <div
                      key={wg.id}
                      onClick={() => handleSelectChannel(wg.id, wg.nombre)}
                      className={`flex items-center gap-3 px-3 sm:px-4 py-3 cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-emerald-50/90 dark:bg-zinc-900/95 border-l-4 border-l-emerald-600 dark:border-l-emerald-400 text-zinc-900 dark:text-white shadow-sm dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_0_20px_rgba(255,255,255,0.03)]' 
                          : 'hover:bg-zinc-100/90 dark:hover:bg-zinc-900/80 border-l-4 border-l-transparent text-zinc-700 dark:text-zinc-200'
                      }`}
                    >
                      <div className="w-11 h-11 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 shadow text-lg">
                        {renderWorkgroupIcon(wg.area)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs sm:text-[13px] font-bold text-zinc-900 dark:text-white truncate">{wg.nombre}</span>
                          <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 shrink-0 ml-1">{lastMsg?.timestamp || ''}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          <span className="truncate">
                            {lastMsg ? (
                              <>
                                <strong className="text-zinc-800 dark:text-zinc-300 font-medium">~ {lastMsg.remitente}: </strong>
                                {lastMsg.tipo === 'op' ? `📌 OP ${lastMsg.opRelacionada}` : (lastMsg.mensaje || 'Nota de voz')}
                              </>
                            ) : wg.descripcion}
                          </span>
                          <span className="ml-2 px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-mono font-black shrink-0 animate-pulse shadow-md shadow-rose-900/60">
                            {unread}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* 3. Mensajes Directos Privados 1 a 1 no leídos (Recuadro 1 & 2) */}
            {unreadChats.directUsers.length > 0 && (
              <>
                <div className="px-3 py-1 bg-zinc-100/80 dark:bg-zinc-950/60 text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 border-y border-zinc-200/50 dark:border-white/5">
                  Chats Privados ({unreadChats.directUsers.length})
                </div>
                {unreadChats.directUsers.map(user => {
                  const { lastMsg, unread, directCanalId } = getDirectChatInfo(user.id);
                  const isSelected = activeCanalId === directCanalId;
                  return (
                    <div
                      key={user.id}
                      onClick={() => handleSelectChannel(directCanalId, user.nombre)}
                      className={`flex items-center gap-3 px-3 sm:px-4 py-3 cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-emerald-50/90 dark:bg-zinc-900/95 border-l-4 border-l-emerald-600 dark:border-l-emerald-400 text-zinc-900 dark:text-white shadow-sm dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_0_20px_rgba(255,255,255,0.03)]' 
                          : 'hover:bg-zinc-100/90 dark:hover:bg-zinc-900/80 border-l-4 border-l-transparent text-zinc-700 dark:text-zinc-200'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <div className="w-11 h-11 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center font-bold text-xs shadow">
                          {user.nombre.slice(0, 2).toUpperCase()}
                        </div>
                        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-black ${getAreaDotColor(user.area)}`}></span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs sm:text-[13px] font-bold text-zinc-900 dark:text-white truncate">{user.nombre}</span>
                          <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">{lastMsg?.timestamp || ''}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          <span className="truncate text-zinc-700 dark:text-zinc-200 font-medium">
                            {lastMsg ? (
                              lastMsg.mensaje || (lastMsg.tipo === 'op' ? `📌 OP ${lastMsg.opRelacionada}` : 'Nota de voz')
                            ) : (
                              `${user.area} • ${user.rol}`
                            )}
                          </span>
                          <span className="ml-2 px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-mono font-black shrink-0 animate-pulse shadow-md shadow-rose-900/60">
                            {unread}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* Estado vacío cuando no hay mensajes pendientes */}
            {!unreadChats.general && unreadChats.directUsers.length === 0 && unreadChats.groups.length === 0 && (
              <div className="py-16 px-4 text-center flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400 animate-in fade-in duration-200">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3 shadow-lg shadow-emerald-950/20">
                  <CheckCheck className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">¡Estás al día!</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-[240px]">
                  {searchTerm.trim() 
                    ? 'No hay mensajes no leídos que coincidan con la búsqueda.' 
                    : 'No tienes mensajes pendientes por leer en ningún chat privado ni grupo.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            MODO: PESTAÑA TODOS (General STF + Chats Privados 1 a 1 por usuario)
           ========================================================================= */}
        {filterPill === 'TODOS' && (
          <>
            {/* SALA GENERAL STF */}
            <div
              onClick={() => handleSelectChannel('GENERAL', 'General STF • Control de Calidad')}
              className={`flex items-center gap-3 px-3 sm:px-4 py-3 cursor-pointer transition-colors ${
                activeCanalId === 'GENERAL' 
                  ? 'bg-emerald-50/90 dark:bg-zinc-900/95 border-l-4 border-l-emerald-600 dark:border-l-emerald-400 text-zinc-900 dark:text-white shadow-sm dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_0_20px_rgba(255,255,255,0.03)]' 
                  : 'hover:bg-zinc-100/90 dark:hover:bg-zinc-900/80 border-l-4 border-l-transparent text-zinc-700 dark:text-zinc-200'
              }`}
            >
              <div className="w-11 h-11 rounded-full bg-emerald-600 dark:bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow">
                <Users className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-[13px] font-bold text-zinc-900 dark:text-white truncate">
                      General STF
                    </span>
                    <span className="flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[8.5px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-emerald-700 dark:text-emerald-400 border border-zinc-200 dark:border-emerald-800/40 shrink-0">
                      <Pin className="w-2.5 h-2.5" /> Fijado
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                    {getLastMessageOfChannel('GENERAL')?.timestamp || ''}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11.5px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                  <span className="truncate">
                    {getLastMessageOfChannel('GENERAL') ? (
                      <>
                        <strong className="text-zinc-800 dark:text-zinc-300 font-medium">~ {getLastMessageOfChannel('GENERAL')?.remitente}: </strong>
                        {getLastMessageOfChannel('GENERAL')?.tipo === 'op' ? `📌 OP ${getLastMessageOfChannel('GENERAL')?.opRelacionada}` : (getLastMessageOfChannel('GENERAL')?.mensaje || 'Nota de voz')}
                      </>
                    ) : (
                      'Sala corporativa de equipo'
                    )}
                  </span>

                  {/* ETIQUETA ROJA DE NO LEÍDOS */}
                  {generalUnread > 0 && (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-mono font-black shrink-0 animate-pulse shadow-md shadow-rose-900/60">
                      {generalUnread}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* SEPARADOR DE CONTACTOS PRIVADOS */}
            <div className="px-3 py-1.5 bg-zinc-100/90 dark:bg-zinc-950/80 text-[9.5px] font-mono font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 border-y border-zinc-200/60 dark:border-white/5 flex items-center justify-between">
              <span>Mensajes Directos (1 a 1 Privados)</span>
              <span>{sortedUsers.length} Contactos</span>
            </div>

            {/* CHATS DIRECTOS 1 A 1 CON CADA USUARIO ACTIVO (RECUADRO 1: AUTOMATIZADO CON RECIENTES ARRIBA) */}
            {sortedUsers.map((user) => {
              const { lastMsg, unread, directCanalId } = getDirectChatInfo(user.id);
              const isSelected = activeCanalId === directCanalId;

              return (
                <div
                  key={user.id}
                  onClick={() => handleSelectChannel(directCanalId, user.nombre)}
                  className={`flex items-center gap-3 px-3 sm:px-4 py-3 cursor-pointer transition-colors ${
                    isSelected 
                      ? 'bg-emerald-50/90 dark:bg-zinc-900/95 border-l-4 border-l-emerald-600 dark:border-l-emerald-400 text-zinc-900 dark:text-white shadow-sm dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_0_20px_rgba(255,255,255,0.03)]' 
                      : 'hover:bg-zinc-100/90 dark:hover:bg-zinc-900/80 border-l-4 border-l-transparent text-zinc-700 dark:text-zinc-200'
                  }`}
                >
                  {/* Avatar con dot de área */}
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center font-bold text-xs shadow">
                      {user.nombre.slice(0, 2).toUpperCase()}
                    </div>
                    <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-black ${getAreaDotColor(user.area)}`}></span>
                  </div>

                  {/* Info de contacto y último mensaje */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-[13px] font-bold text-zinc-900 dark:text-white truncate">
                        {user.nombre}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                        {lastMsg?.timestamp || ''}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                      <span className="truncate">
                        {lastMsg ? (
                          lastMsg.mensaje || (lastMsg.tipo === 'op' ? `📌 OP ${lastMsg.opRelacionada}` : 'Nota de voz')
                        ) : (
                          <span className="uppercase text-[10px] tracking-wide text-zinc-400 dark:text-zinc-500 font-medium">
                            {user.area} • {user.rol}
                          </span>
                        )}
                      </span>

                      <div className="flex items-center gap-1 shrink-0 ml-1.5">
                        {lastMsg && currentUser && lastMsg.remitenteId === currentUser.id && (
                          <CheckCheck className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                        )}

                        {/* ETIQUETA ROJA DE NO LEÍDOS */}
                        {unread > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-mono font-black animate-pulse shadow-md shadow-rose-900/60">
                            {unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {sortedUsers.length === 0 && filterPill === 'TODOS' && (
          <div className="py-8 text-center text-zinc-400 dark:text-zinc-500 text-xs">
            No se encontraron usuarios con ese criterio.
          </div>
        )}

      </div>

    </div>
  );
};
