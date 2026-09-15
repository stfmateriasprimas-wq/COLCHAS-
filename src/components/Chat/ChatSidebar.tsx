import React, { useState, useMemo } from 'react';
import { 
  Search, Users, MessageSquare, AlertTriangle, Zap, 
  Volume2, VolumeX, Bell, BellOff, CheckCheck, Clock, User 
} from 'lucide-react';
import { UsuarioSTF } from '../../services/authService';
import { ChatMessage, SolicitudColcha } from '../../types';

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
  onOpenOpsModal
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPill, setFilterPill] = useState<'TODOS' | 'NO_LEIDOS' | 'GRUPOS' | 'RETRASOS'>('TODOS');

  const delayedOpsCount = useMemo(() => {
    return solicitudes.filter(s => s.tieneRetraso && s.estado !== 'FINALIZADO').length;
  }, [solicitudes]);

  // Obtener último mensaje del canal general
  const generalLastMessage = useMemo(() => {
    const generalMsgs = allMessages.filter(m => !m.canalId || m.canalId === 'GENERAL');
    return generalMsgs[generalMsgs.length - 1];
  }, [allMessages]);

  // Mapear último mensaje por usuario en chats directos
  const getLastDirectMessage = (userId: string) => {
    if (!currentUser) return null;
    const sorted = [currentUser.id.toLowerCase(), userId.toLowerCase()].sort();
    const directCanalId = `DIRECT_${sorted[0]}_${sorted[1]}`;
    const directMsgs = allMessages.filter(m => m.canalId === directCanalId);
    return directMsgs[directMsgs.length - 1];
  };

  // Filtrar usuarios (excluyendo al usuario actual para la lista de chats directos)
  const filteredUsers = useMemo(() => {
    return activeUsers.filter(u => {
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
  }, [activeUsers, currentUser, searchTerm]);

  // Color de dot de área
  const getAreaDotColor = (area: string) => {
    const a = area.toUpperCase();
    if (a.includes('ZF') || a.includes('ATELIER')) return 'bg-purple-500';
    if (a.includes('LAVANDERIA')) return 'bg-sky-500';
    if (a.includes('CALIDAD')) return 'bg-emerald-500';
    if (a.includes('COLECCION')) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="w-full md:w-80 lg:w-96 flex flex-col h-full bg-[#111b21] border-r border-zinc-800 text-[#e9edef] select-none shrink-0">
      
      {/* 1. Header de la Barra Lateral WhatsApp */}
      <div className="h-14 sm:h-16 px-3 sm:px-4 bg-[#202c33] flex items-center justify-between border-b border-zinc-700/60">
        
        {/* Perfil del Usuario Actual */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center border border-emerald-400/40 shadow">
            {currentUser?.nombre ? currentUser.nombre.slice(0, 2).toUpperCase() : 'STF'}
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-bold text-white truncate max-w-[120px] sm:max-w-[140px]">
              {currentUser?.nombre || 'Mi Usuario'}
            </h2>
            <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
              <span className={`w-1.5 h-1.5 rounded-full ${getAreaDotColor(currentUser?.area || '')} animate-pulse`}></span>
              <span>{currentUser?.area || 'CALIDAD'}</span>
            </div>
          </div>
        </div>

        {/* Acciones Rápidas: Sonido, Notificaciones Push y OPs */}
        <div className="flex items-center gap-1">
          
          {/* Botón de Notificaciones Push Nativas */}
          <button
            type="button"
            onClick={onRequestNotifications}
            className={`p-1.5 rounded-full transition cursor-pointer ${
              hasNotificationPermission 
                ? 'text-emerald-400 hover:bg-zinc-700/60' 
                : 'text-amber-400 hover:bg-amber-950/60 animate-bounce'
            }`}
            title={hasNotificationPermission ? 'Notificaciones Push activas (Móvil y PC)' : '🔔 Haz clic para activar notificaciones con pantalla bloqueada'}
          >
            {hasNotificationPermission ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </button>

          {/* Botón de Sonido Cómodo */}
          <button
            type="button"
            onClick={onToggleSound}
            className={`p-1.5 rounded-full transition cursor-pointer ${
              isSoundEnabled ? 'text-zinc-300 hover:text-white hover:bg-zinc-700/60' : 'text-zinc-500 hover:bg-zinc-700/60'
            }`}
            title={isSoundEnabled ? 'Sonido de chat activado' : 'Sonido silenciado'}
          >
            {isSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Botón OPs en Tiempo Real */}
          <button
            type="button"
            onClick={onOpenOpsModal}
            className="p-1.5 rounded-full text-zinc-300 hover:text-white hover:bg-zinc-700/60 transition cursor-pointer relative"
            title="Ver OPs en Tiempo Real"
          >
            <Zap className="w-4 h-4 text-emerald-400" />
            {delayedOpsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-mono font-bold flex items-center justify-center">
                {delayedOpsCount}
              </span>
            )}
          </button>

        </div>

      </div>

      {/* 2. Buscador estilo WhatsApp */}
      <div className="p-2 sm:p-2.5 bg-[#111b21] border-b border-zinc-800/80">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar un chat o iniciar uno nuevo"
            className="w-full pl-9 pr-7 py-1.5 sm:py-2 bg-[#202c33] rounded-xl text-xs text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 3. Filtros Superiores (Pills) */}
      <div className="px-2 sm:px-3 py-2 flex items-center gap-1.5 overflow-x-auto border-b border-zinc-800/80 bg-[#111b21] custom-scroll">
        <button
          type="button"
          onClick={() => setFilterPill('TODOS')}
          className={`px-3 py-1 rounded-full text-[11px] font-bold transition cursor-pointer shrink-0 ${
            filterPill === 'TODOS'
              ? 'bg-[#00a884] text-white'
              : 'bg-[#202c33] text-zinc-400 hover:text-white'
          }`}
        >
          Todos
        </button>

        <button
          type="button"
          onClick={() => setFilterPill('GRUPOS')}
          className={`px-3 py-1 rounded-full text-[11px] font-bold transition cursor-pointer shrink-0 ${
            filterPill === 'GRUPOS'
              ? 'bg-[#00a884] text-white'
              : 'bg-[#202c33] text-zinc-400 hover:text-white'
          }`}
        >
          Grupos
        </button>

        <button
          type="button"
          onClick={() => {
            setFilterPill('RETRASOS');
            onOpenOpsModal();
          }}
          className={`px-3 py-1 rounded-full text-[11px] font-bold transition cursor-pointer shrink-0 flex items-center gap-1 ${
            filterPill === 'RETRASOS'
              ? 'bg-rose-600 text-white'
              : 'bg-[#202c33] text-rose-400 hover:text-white'
          }`}
        >
          <AlertTriangle className="w-3 h-3" />
          <span>OPs Retraso ({delayedOpsCount})</span>
        </button>
      </div>

      {/* 4. Lista de Salas de Chat y Contactos */}
      <div className="flex-1 overflow-y-auto custom-scroll divide-y divide-zinc-800/60">
        
        {/* SALA 1: CANAL GENERAL STF */}
        {(filterPill === 'TODOS' || filterPill === 'GRUPOS') && (
          <div
            onClick={() => onSelectCanal('GENERAL', 'General STF • Control de Calidad')}
            className={`flex items-center gap-3 px-3 sm:px-4 py-3 cursor-pointer transition-colors ${
              activeCanalId === 'GENERAL' ? 'bg-[#2a3942]' : 'hover:bg-[#202c33]/60'
            }`}
          >
            <div className="w-11 h-11 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow">
              <Users className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-[13px] font-bold text-white truncate">
                  General STF
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  {generalLastMessage?.timestamp || 'Hoy'}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11.5px] text-zinc-400 truncate mt-0.5">
                <span className="truncate">
                  {generalLastMessage ? (
                    <>
                      <strong className="text-zinc-300 font-medium">~ {generalLastMessage.remitente}: </strong>
                      {generalLastMessage.tipo === 'op' ? `📌 OP ${generalLastMessage.opRelacionada}` : (generalLastMessage.mensaje || 'Nota de voz')}
                    </>
                  ) : (
                    'Sala corporativa de equipo'
                  )}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* SALAS DIRECTAS: CADA USUARIO ACTIVO DEL SISTEMA */}
        {filteredUsers.map((user) => {
          if (!currentUser) return null;
          const sorted = [currentUser.id.toLowerCase(), user.id.toLowerCase()].sort();
          const directCanalId = `DIRECT_${sorted[0]}_${sorted[1]}`;
          const isSelected = activeCanalId === directCanalId;
          const lastMsg = getLastDirectMessage(user.id);

          return (
            <div
              key={user.id}
              onClick={() => onSelectCanal(directCanalId, user.nombre)}
              className={`flex items-center gap-3 px-3 sm:px-4 py-3 cursor-pointer transition-colors ${
                isSelected ? 'bg-[#2a3942]' : 'hover:bg-[#202c33]/60'
              }`}
            >
              {/* Avatar con dot de área */}
              <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-full bg-zinc-800 text-zinc-200 border border-zinc-700 flex items-center justify-center font-bold text-xs shadow">
                  {user.nombre.slice(0, 2).toUpperCase()}
                </div>
                <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#111b21] ${getAreaDotColor(user.area)}`}></span>
              </div>

              {/* Info de contacto y último mensaje */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-[13px] font-bold text-white truncate">
                    {user.nombre}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {lastMsg?.timestamp || ''}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-0.5">
                  <span className="truncate">
                    {lastMsg ? (
                      lastMsg.mensaje || 'Nota de voz'
                    ) : (
                      <span className="uppercase text-[10px] tracking-wide text-zinc-500 font-medium">
                        {user.area} • {user.rol}
                      </span>
                    )}
                  </span>
                  {lastMsg && lastMsg.remitenteId === currentUser.id && (
                    <CheckCheck className="w-3.5 h-3.5 text-zinc-400 ml-1 shrink-0" />
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredUsers.length === 0 && (
          <div className="py-8 text-center text-zinc-500 text-xs">
            No se encontraron usuarios con ese criterio.
          </div>
        )}

      </div>

    </div>
  );
};
