import React from 'react';
import { Sun, Moon, LogOut, MessageSquare, ArrowLeft, User, RefreshCw } from 'lucide-react';
import { UsuarioSTF } from '../services/authService';
import { STFLogo } from './Common/STFLogo';

import { chatService } from '../services/chatService';

interface HeaderProps {
  currentUser: UsuarioSTF | null;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onOpenChat: () => void;
  onLogout: () => void;
  showBackButton?: boolean;
  onBackToDashboard?: () => void;
  onOpenProfileDirectory?: () => void;
  isSyncing?: boolean;
  onManualSync?: () => void;
  totalOpsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  isDarkMode,
  onToggleTheme,
  onOpenChat,
  onLogout,
  showBackButton = false,
  onBackToDashboard,
  onOpenProfileDirectory,
  isSyncing = false,
  onManualSync,
  totalOpsCount
}) => {
  const [unreadCount, setUnreadCount] = React.useState<number>(() => {
    return chatService.getUnreadCount(currentUser?.id || '1111');
  });

  React.useEffect(() => {
    const unsub = chatService.subscribe(() => {
      setUnreadCount(chatService.getUnreadCount(currentUser?.id || '1111'));
    });
    return () => unsub();
  }, [currentUser]);

  // Area semantic dot color
  const getAreaDotColor = (area?: string) => {
    if (!area) return 'bg-zinc-400';
    const a = area.toUpperCase();
    if (a.includes('ZF') || a.includes('ATELIER')) return 'bg-purple-500';
    if (a.includes('LAVANDERIA') || a.includes('PLANTA')) return 'bg-sky-500';
    if (a.includes('CALIDAD') || a.includes('LABORATORIO')) return 'bg-emerald-500';
    if (a.includes('COLECCION') || a.includes('MARCAS')) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <header className="px-3 sm:px-6 pt-3 pb-2 select-none">
      <div className="max-w-7xl mx-auto rounded-3xl border px-4 sm:px-6 py-3 transition-colors duration-200 bg-[#0c1017] border-zinc-800 text-white shadow-xl shadow-black/20">
        
        <div className="flex items-center justify-between gap-3 sm:gap-4 relative">
          
          {/* LEFT: Back Button & Minimalist Chat Button */}
          <div className="flex items-center gap-2">
            
            {showBackButton && (
              <button
                type="button"
                onClick={onBackToDashboard}
                className="w-9 h-9 rounded-2xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-white flex items-center justify-center transition cursor-pointer shadow-sm"
                title="Volver al menú principal"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onOpenChat}
              className="px-3.5 py-1.5 rounded-2xl border border-zinc-800 bg-zinc-900/90 hover:bg-zinc-800 text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-sm hover:border-emerald-500/50 hover:shadow-emerald-500/10 group"
              title="Abrir Chat STF Teams"
            >
              <div className="relative">
                <MessageSquare className="w-3.5 h-3.5 text-zinc-400 group-hover:text-emerald-400 transition" />
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
              </div>
              <span className="tracking-wide font-mono">CHAT TEAMS</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-black text-[9.5px] font-mono font-black shadow-sm">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* CENTER: Centered STF GROUP White Logo (Pure Transparent) + Clickable User Badge */}
          <div className="flex flex-col items-center justify-center space-y-1.5 py-0.5">
            <STFLogo
              isWhite={true}
              className="h-12 sm:h-14 md:h-16 w-60 sm:w-72 md:w-80 transition-all duration-300"
            />

            {currentUser && (
              <button
                type="button"
                onClick={onOpenProfileDirectory}
                className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-emerald-500/50 bg-zinc-900/90 text-zinc-200 text-[10.5px] font-medium font-mono hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer shadow-sm hover:shadow-emerald-500/20 group ring-1 ring-emerald-500/30"
                title="Haz clic para cambiar de perfil de usuario en el sistema"
              >
                <span className={`w-2 h-2 rounded-full ${getAreaDotColor(currentUser.area)} animate-pulse`}></span>
                <span className="font-extrabold text-emerald-400 tracking-tight">{currentUser.nombre}</span>
                <span className="text-zinc-500">•</span>
                <span className="text-zinc-300 uppercase tracking-tight font-bold">{currentUser.area}</span>
                <User className="w-3 h-3 ml-0.5 text-emerald-400 group-hover:text-white transition" />
              </button>
            )}
          </div>

          {/* RIGHT: Live Sync, Theme Switcher & Logout */}
          <div className="flex items-center gap-2">
            
            {/* Real-time Google Sheets Sync Button */}
            <button
              type="button"
              onClick={onManualSync}
              disabled={isSyncing}
              className="px-3 py-1.5 rounded-2xl border border-zinc-800 bg-zinc-900/90 hover:bg-zinc-800 text-white text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm hover:border-emerald-500/50 group disabled:opacity-75"
              title="Sincronización en tiempo real con la hoja BASE_DE_DATOS. Haz clic para actualizar ahora."
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
              <span className="hidden sm:inline font-mono text-[10.5px] text-zinc-300">
                {isSyncing ? 'ACTUALIZANDO...' : 'EN VIVO'}
              </span>
              {totalOpsCount !== undefined && totalOpsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[9.5px] font-mono font-bold">
                  {totalOpsCount}
                </span>
              )}
            </button>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={onToggleTheme}
              className="px-3 py-1.5 rounded-2xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-white text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              title={isDarkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
            >
              {isDarkMode ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="tracking-wide text-[10px]">CLARO</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="tracking-wide text-[10px]">OSCURO</span>
                </>
              )}
            </button>

            {/* Logout Button */}
            <button
              type="button"
              onClick={onLogout}
              className="px-3.5 py-1.5 rounded-2xl bg-white text-zinc-950 hover:bg-zinc-200 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>SALIR</span>
            </button>

          </div>

        </div>

      </div>
    </header>
  );
};
