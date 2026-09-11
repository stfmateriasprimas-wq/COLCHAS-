import React from 'react';
import { Sun, Moon, LogOut, ArrowLeft, User, RefreshCw } from 'lucide-react';
import { UsuarioSTF } from '../services/authService';
import { STFLogo } from './Common/STFLogo';

interface HeaderProps {
  currentUser: UsuarioSTF | null;
  isDarkMode: boolean;
  onToggleTheme: () => void;
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
  onLogout,
  showBackButton = false,
  onBackToDashboard,
  onOpenProfileDirectory,
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
    <header className="px-2 sm:px-6 pt-2 sm:pt-3 pb-1.5 sm:pb-2 select-none">
      <div className="max-w-7xl mx-auto rounded-2xl sm:rounded-3xl border px-2.5 sm:px-6 py-2 sm:py-3 transition-colors duration-200 bg-[#0c1017] border-zinc-800 text-white shadow-xl shadow-black/20">
        
        {/* Responsive Header Structure: 
            - Mobile (< sm): 2-tier layout with Row 1 (Logo, Actions) and Row 2 (Centered User Badge) so nothing overlaps or crowds.
            - Desktop (>= sm): Preserves the official 3-column symmetrical grid defined in AGENTS.md Rule #7.
        */}
        <div className="flex flex-col gap-2 sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center relative w-full">
          
          {/* Top Row on Mobile / Direct grid slots on Desktop */}
          <div className="flex items-center justify-between w-full sm:contents">
            
            {/* LEFT: Back Button */}
            <div className="flex items-center justify-start gap-1 sm:gap-2 shrink-0 min-w-[32px] sm:min-w-[40px]">
              {showBackButton && (
                <button
                  type="button"
                  onClick={onBackToDashboard}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-white flex items-center justify-center transition cursor-pointer shadow-sm shrink-0"
                  title="Volver al menú principal"
                >
                  <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              )}
            </div>

            {/* CENTER: Centered STF GROUP Logo (with user badge on desktop) */}
            <div className="flex flex-col items-center justify-center space-y-1 sm:space-y-1.5 py-0.5 justify-self-center text-center max-w-full">
              <STFLogo
                isWhite={true}
                className="h-7 sm:h-12 md:h-16 w-28 sm:w-60 md:w-80 transition-all duration-300"
              />

              {/* User badge on desktop (hidden on mobile row 1, rendered in row 2 below) */}
              {currentUser && (
                <button
                  type="button"
                  onClick={onOpenProfileDirectory}
                  className="hidden sm:inline-flex items-center justify-center gap-1.5 px-3.5 py-1 rounded-full border border-emerald-500/50 bg-zinc-900/90 text-zinc-200 text-[10.5px] font-medium font-mono hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer shadow-sm hover:shadow-emerald-500/20 group ring-1 ring-emerald-500/30"
                  title="Haz clic para cambiar de perfil de usuario en el sistema"
                >
                  <span className={`w-2 h-2 rounded-full ${getAreaDotColor(currentUser.area)} animate-pulse shrink-0`}></span>
                  <span className="font-extrabold text-emerald-400 tracking-tight">{currentUser.nombre}</span>
                  <span className="text-zinc-500">•</span>
                  <span className="text-zinc-300 uppercase tracking-tight font-bold">{currentUser.area}</span>
                  <User className="w-3 h-3 ml-0.5 text-emerald-400 group-hover:text-white transition shrink-0" />
                </button>
              )}
            </div>

            {/* RIGHT: Live Sync, Theme Switcher & Logout */}
            <div className="flex items-center justify-end gap-1 sm:gap-2 shrink-0">
              
              {/* Real-time Google Sheets Sync Button */}
              <button
                type="button"
                onClick={onManualSync}
                disabled={isSyncing}
                className="px-2 sm:px-3 py-1.5 rounded-xl sm:rounded-2xl border border-zinc-800 bg-zinc-900/90 hover:bg-zinc-800 text-white text-[11px] font-bold flex items-center gap-1 sm:gap-1.5 transition cursor-pointer shadow-sm hover:border-emerald-500/50 group disabled:opacity-75 shrink-0"
                title="Sincronización en tiempo real con la hoja BASE_DE_DATOS. Haz clic para actualizar ahora."
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                <span className="hidden sm:inline font-mono text-[10.5px] text-zinc-300">
                  {isSyncing ? 'ACTUALIZANDO...' : 'EN VIVO'}
                </span>
                {totalOpsCount !== undefined && totalOpsCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[9px] sm:text-[9.5px] font-mono font-bold">
                    {totalOpsCount}
                  </span>
                )}
              </button>

              {/* Theme Toggle */}
              <button
                type="button"
                onClick={onToggleTheme}
                className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl sm:rounded-2xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-white text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm shrink-0"
                title={isDarkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
              >
                {isDarkMode ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span className="tracking-wide text-[10px] hidden md:inline">CLARO</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="tracking-wide text-[10px] hidden md:inline">OSCURO</span>
                  </>
                )}
              </button>

              {/* Logout Button */}
              <button
                type="button"
                onClick={onLogout}
                className="px-2 sm:px-3.5 py-1.5 rounded-xl sm:rounded-2xl bg-white text-zinc-950 hover:bg-zinc-200 text-[10px] sm:text-[11px] font-black uppercase tracking-wider flex items-center gap-1 sm:gap-1.5 transition cursor-pointer shadow-sm shrink-0"
                title="Cerrar sesión"
              >
                <LogOut className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="hidden xs:inline">SALIR</span>
              </button>

            </div>

          </div>

          {/* ROW 2 ON MOBILE: Centered User Profile Badge with Clean Spacing (NO OVERLAP) */}
          {currentUser && (
            <div className="flex sm:hidden justify-center w-full pt-1.5 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={onOpenProfileDirectory}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/50 bg-zinc-900/90 text-zinc-200 text-[10px] font-medium font-mono hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer shadow-sm ring-1 ring-emerald-500/30 max-w-full"
                title="Haz clic para cambiar de perfil de usuario en el sistema"
              >
                <span className={`w-2 h-2 rounded-full ${getAreaDotColor(currentUser.area)} animate-pulse shrink-0`}></span>
                <span className="font-extrabold text-emerald-400 tracking-tight truncate">{currentUser.nombre}</span>
                <span className="text-zinc-500">•</span>
                <span className="text-zinc-300 uppercase tracking-tight font-bold">{currentUser.area}</span>
                <User className="w-3 h-3 ml-0.5 text-emerald-400 shrink-0" />
              </button>
            </div>
          )}

        </div>

      </div>
    </header>
  );
};
