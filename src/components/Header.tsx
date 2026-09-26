import React from 'react';
import { Sun, Moon, LogOut, ArrowLeft, User, MessageSquare, ShieldCheck } from 'lucide-react';
import { UsuarioSTF, isSoporteUser } from '../services/authService';
import { STFLogo } from './Common/STFLogo';

interface HeaderProps {
  currentUser: UsuarioSTF | null;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onLogout: () => void;
  showBackButton?: boolean;
  onBackToDashboard?: () => void;
  onOpenProfileDirectory?: () => void;
  onOpenChat?: () => void;
  onOpenAuditoria?: () => void;
  onOpenQrScanner?: () => void;
  chatUnreadCount?: number;
  isSyncing?: boolean;
  onManualSync?: () => void;
  totalOpsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  isDarkMode,
  onToggleTheme,
  onLogout,
  showBackButton = false,
  onBackToDashboard,
  onOpenProfileDirectory,
  onOpenChat,
  onOpenAuditoria,
  onOpenQrScanner,
  chatUnreadCount = 0,
  isSyncing = false,
  onManualSync,
  totalOpsCount
}) => {
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
    <header className="px-2 sm:px-6 pt-mobile-safe pb-1.5 sm:pb-2 select-none">
      <div className="max-w-7xl mx-auto rounded-2xl sm:rounded-3xl border px-2.5 sm:px-6 py-2 sm:py-3 transition-colors duration-200 bg-white border-zinc-200/90 text-zinc-900 shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:bg-[#0c1017] dark:border-zinc-800 dark:text-white dark:shadow-[0_4px_25px_rgba(255,255,255,0.06)]">
        
        {/* Responsive Header Structure: 
            - Mobile (< sm): 2-tier layout with Row 1 (Logo, Actions) and Row 2 (Centered User Badge) so nothing overlaps or crowds.
            - Desktop (>= sm): Preserves the official 3-column symmetrical grid defined in AGENTS.md Rule #7.
        */}
        <div className="flex flex-col gap-2 sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center relative w-full">
          
          {/* Top Row on Mobile: Perfect 3-column symmetrical grid (1fr auto 1fr) / Direct grid slots on Desktop */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center w-full sm:contents">
            
            {/* LEFT: Back Button & CHAT Button & AUDITORIA Button (SOPORTE) */}
            <div className="flex items-center justify-start gap-1 sm:gap-2.5 shrink-0">
              {showBackButton && (
                <button
                  type="button"
                  onClick={onBackToDashboard}
                  className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl border border-zinc-200 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-white flex items-center justify-center transition cursor-pointer shadow-sm shrink-0"
                  title="Volver al menú principal"
                >
                  <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              )}

              {/* BOTÓN OFICIAL DE CHAT */}
              {onOpenChat && (
                <button
                  type="button"
                  onClick={onOpenChat}
                  className="relative group overflow-hidden px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#002f23] via-[#014d38] to-[#00281e] border border-emerald-400/70 hover:border-emerald-300 text-white text-[10px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1.5 sm:gap-2.5 transition-all duration-300 cursor-pointer shadow-[0_0_18px_rgba(16,185,129,0.35)] hover:shadow-[0_0_26px_rgba(16,185,129,0.65)] hover:scale-[1.04] active:scale-95 shrink-0 ring-1 ring-emerald-500/40"
                  title="Abrir Chat Corporativo STF en Tiempo Real"
                >
                  {/* Reflejo Shimmer Holográfico Cybernetic */}
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none"></span>

                  {/* Icono con resplandor neón */}
                  <div className="relative flex items-center justify-center shrink-0">
                    <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-300 group-hover:text-white transition-colors drop-shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                  </div>

                  {/* Texto Futurista de Alta Tecnología */}
                  <span className="font-mono tracking-wider font-black text-[9.5px] sm:text-xs text-white drop-shadow-[0_0_6px_rgba(52,211,153,0.6)]">
                    CHAT
                  </span>

                  {/* Radar Status Beacon en Tiempo Real */}
                  <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-emerald-400 shadow-[0_0_8px_#34d399]"></span>
                  </span>

                  {/* Insignia Roja Futurista de Mensajes No Leídos */}
                  {chatUnreadCount !== undefined && chatUnreadCount > 0 && (
                    <span className="ml-0.5 px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded-full bg-rose-600 text-white text-[8.5px] sm:text-[9.5px] font-mono font-black border border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.9)] animate-pulse flex items-center justify-center">
                      {chatUnreadCount}
                    </span>
                  )}
                </button>
              )}

              {/* BOTÓN EXCLUSIVO DE AUDITORÍA FORENSE PARA PERFIL SOPORTE TÉCNICO */}
              {isSoporteUser(currentUser) && onOpenAuditoria && (
                <button
                  type="button"
                  onClick={onOpenAuditoria}
                  className="relative group overflow-hidden px-2 sm:px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#011d2e] via-[#033654] to-[#011926] border border-cyan-400/80 hover:border-cyan-300 text-cyan-200 text-[10px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1 sm:gap-2 transition-all duration-300 cursor-pointer shadow-[0_0_18px_rgba(6,182,212,0.35)] hover:shadow-[0_0_26px_rgba(6,182,212,0.65)] hover:scale-[1.04] active:scale-95 shrink-0 ring-1 ring-cyan-500/40"
                  title="Abrir Módulo Exclusivo de Auditoría Forense e Historial STF"
                >
                  <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-300 group-hover:text-white transition-colors drop-shadow-[0_0_8px_rgba(6,182,212,0.9)]" />
                  <span className="font-mono tracking-wider font-black text-[9.5px] sm:text-xs text-white">
                    AUDITORÍA
                  </span>
                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                  </span>
                </button>
              )}
            </div>

            {/* CENTER: Centered STF GROUP Logo (with user badge on desktop) */}
            <div className="flex flex-col items-center justify-center space-y-1 sm:space-y-1.5 py-0.5 justify-self-center text-center px-1.5 sm:px-2 shrink-0">
              <STFLogo
                isWhite={isDarkMode}
                className="h-7 sm:h-12 md:h-16 w-28 sm:w-60 md:w-80 max-w-[115px] sm:max-w-none transition-all duration-300"
              />

              {/* User badge on desktop (hidden on mobile row 1, rendered in row 2 below) */}
              {currentUser && (
                <button
                  type="button"
                  onClick={onOpenProfileDirectory}
                  className="hidden sm:inline-flex items-center justify-center gap-1.5 px-3.5 py-1 rounded-full border border-emerald-500/40 bg-emerald-50/80 text-emerald-950 dark:border-emerald-500/50 dark:bg-zinc-900/90 dark:text-zinc-200 text-[10.5px] font-medium font-mono hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer shadow-sm hover:shadow-emerald-500/20 group ring-1 ring-emerald-500/30"
                  title="Haz clic para cambiar de perfil de usuario en el sistema"
                >
                  <span className={`w-2 h-2 rounded-full ${getAreaDotColor(currentUser.area)} animate-pulse shrink-0`}></span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">{currentUser.nombre}</span>
                  <span className="text-zinc-400 dark:text-zinc-500">•</span>
                  <span className="text-zinc-700 dark:text-zinc-300 uppercase tracking-tight font-bold">{currentUser.area}</span>
                  <User className="w-3 h-3 ml-0.5 text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-500 dark:group-hover:text-white transition shrink-0" />
                </button>
              )}
            </div>

            {/* RIGHT: Theme Switcher & Logout */}
            <div className="flex items-center justify-end gap-1.5 sm:gap-2.5 shrink-0">

              {/* Theme Toggle */}
              <button
                type="button"
                onClick={onToggleTheme}
                className="w-7 h-7 sm:w-auto sm:h-auto p-1.5 sm:px-3 sm:py-1.5 rounded-xl sm:rounded-2xl border border-zinc-200 bg-zinc-100 hover:bg-zinc-200/80 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs shrink-0"
                title={isDarkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
              >
                {isDarkMode ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span className="tracking-wide text-[10px] hidden md:inline">CLARO</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="tracking-wide text-[10px] hidden md:inline">OSCURO</span>
                  </>
                )}
              </button>

              {/* Logout Button */}
              <button
                type="button"
                onClick={onLogout}
                className="w-7 h-7 sm:w-auto sm:h-auto p-1.5 sm:px-3.5 sm:py-1.5 rounded-xl sm:rounded-2xl bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-[10px] sm:text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1 sm:gap-1.5 transition cursor-pointer shadow-xs shrink-0"
                title="Cerrar sesión"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">SALIR</span>
              </button>

            </div>

          </div>

          {/* ROW 2 ON MOBILE: Centered User Profile Badge with Clean Spacing (NO OVERLAP) */}
          {currentUser && (
            <div className="flex sm:hidden justify-center w-full pt-1.5 border-t border-zinc-200 dark:border-zinc-800/80">
              <button
                type="button"
                onClick={onOpenProfileDirectory}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/40 bg-emerald-50/80 text-emerald-950 dark:border-emerald-500/50 dark:bg-zinc-900/90 dark:text-zinc-200 text-[10px] font-medium font-mono hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer shadow-sm ring-1 ring-emerald-500/30 max-w-full"
                title="Haz clic para cambiar de perfil de usuario en el sistema"
              >
                <span className={`w-2 h-2 rounded-full ${getAreaDotColor(currentUser.area)} animate-pulse shrink-0`}></span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight truncate">{currentUser.nombre}</span>
                <span className="text-zinc-400 dark:text-zinc-500">•</span>
                <span className="text-zinc-700 dark:text-zinc-300 uppercase tracking-tight font-bold">{currentUser.area}</span>
                <User className="w-3 h-3 ml-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              </button>
            </div>
          )}

        </div>

      </div>
    </header>
  );
};
