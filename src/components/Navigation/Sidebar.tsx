import React from 'react';
import { 
  Home,
  Layers, 
  Database, 
  AlertTriangle, 
  Clock, 
  BarChart3, 
  Target, 
  ShieldCheck, 
  Moon, 
  Sun, 
  LogOut, 
  X
} from 'lucide-react';
import { TabType } from '../Navigation';
import { UsuarioSTF, isSoporteUser } from '../../services/authService';

interface SidebarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  totalHistorico: number;
  alertCount: number;
  liveCumplimientoPct: number;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onLogout: () => void;
  currentUser?: UsuarioSTF | null;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  totalHistorico,
  alertCount,
  liveCumplimientoPct,
  isDarkMode,
  onToggleTheme,
  onLogout,
  currentUser,
  isOpenMobile = false,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const isSoporte = isSoporteUser(currentUser);

  // Lista oficial de opciones de navegación según diseño solicitado
  const menuItems: {
    id: TabType;
    label: string;
    icon: React.ReactNode;
    badge?: string | number;
    badgeColor?: string;
  }[] = [
    {
      id: 'dashboard',
      label: 'Inicio',
      icon: <Home className="w-5 h-5 shrink-0" />
    },
    {
      id: 'solicitudes',
      label: 'Solicitudes',
      icon: <Layers className="w-5 h-5 shrink-0" />
    },
    {
      id: 'base-datos',
      label: 'Base de Datos',
      icon: <Database className="w-5 h-5 shrink-0" />,
      badge: totalHistorico > 0 ? totalHistorico : undefined,
      badgeColor: 'bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700'
    },
    {
      id: 'alertas',
      label: 'Alertas',
      icon: <AlertTriangle className="w-5 h-5 shrink-0" />,
      badge: alertCount > 0 ? alertCount : undefined,
      badgeColor: 'bg-rose-500 text-white border border-rose-400 font-bold shadow-xs animate-pulse'
    },
    {
      id: 'timeline',
      label: 'Línea de Tiempo',
      icon: <Clock className="w-5 h-5 shrink-0" />
    },
    {
      id: 'estadisticas',
      label: 'Estadísticas',
      icon: <BarChart3 className="w-5 h-5 shrink-0" />
    },
    {
      id: 'cumplimiento',
      label: 'Cumplimiento',
      icon: <Target className="w-5 h-5 shrink-0" />,
      badge: `${liveCumplimientoPct}%`,
      badgeColor: liveCumplimientoPct >= 90
        ? 'bg-emerald-500 text-white border border-emerald-400 font-bold'
        : liveCumplimientoPct >= 80
        ? 'bg-amber-500 text-black border border-amber-400 font-bold'
        : 'bg-rose-500 text-white border border-rose-400 font-bold'
    },
    ...(isSoporte ? [
      {
        id: 'sql-backup' as TabType,
        label: 'Respaldo SQL',
        icon: <Database className="w-5 h-5 shrink-0 text-emerald-500" />,
        badge: 'SQL',
        badgeColor: 'bg-emerald-500 text-black font-bold'
      },
      {
        id: 'soporte-auditoria' as TabType,
        label: 'Auditoría Forense',
        icon: <ShieldCheck className="w-5 h-5 shrink-0 text-cyan-400" />,
        badge: 'SOPORTE',
        badgeColor: 'bg-cyan-500 text-black font-bold'
      }
    ] : [])
  ];

  return (
    <>
      {/* BACKDROP PARA DISPOSITIVOS MÓVILES (< lg) */}
      {isOpenMobile && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300 animate-in fade-in"
          aria-hidden="true"
        />
      )}

      {/* CONTENEDOR PRINCIPAL DEL SIDEBAR (100% Fixed tanto en Desktop como en Móvil, con protección Safe Area y centrado simétrico) */}
      <aside
        className={`
          fixed top-0 bottom-0 left-0 z-50 lg:z-40
          ${isCollapsed ? 'lg:w-[76px] lg:min-w-[76px]' : 'lg:w-64 xl:w-72 lg:min-w-[16rem] xl:min-w-[18rem]'}
          w-72 max-w-[85vw] h-[100dvh] max-h-[100dvh] shrink-0
          pt-mobile-safe pb-mobile-safe px-2 sm:px-2.5 lg:px-2.5 lg:py-3
          transition-all duration-300 ease-in-out select-none
          ${isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* TARJETA INTERIOR CON BORDES REDONDEADOS Y SOMBRA FLOTANTE ESTILO OFICINA TI */}
        <div className="w-full h-full rounded-3xl bg-white dark:bg-[#0c1017] border border-zinc-200/90 dark:border-zinc-800 shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgba(255,255,255,0.02)] flex flex-col justify-between overflow-hidden">
          
          {/* 1. CABECERA: CÍRCULO 'COL' INTERACTIVO (CLIC PARA DESPLEGAR / GUARDAR EN DESKTOP) */}
          <div className={`border-b border-zinc-100 dark:border-zinc-800/80 flex items-center transition-all ${
            isCollapsed 
              ? 'justify-center p-2.5' 
              : 'justify-between p-4 sm:p-4.5 gap-3'
          }`}>
            <button 
              type="button"
              onClick={() => {
                // En móvil el drawer permanece completamente visible; el colapso solo opera en Desktop
                if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                  return;
                }
                if (onToggleCollapse) {
                  onToggleCollapse();
                }
              }}
              className={`flex items-center min-w-0 cursor-pointer group bg-transparent border-none text-left p-0 ${
                isCollapsed ? 'justify-center' : 'gap-3'
              }`}
              title={isCollapsed ? "Clic en COL para desplegar menú completo" : "Clic en COL para contraer menú lateral"}
            >
              {/* CÍRCULO CON LA LETRA 'COL' TAL CUAL LA SEGUNDA IMAGEN (BOTÓN INTERACTIVO DE DESPLIEGUE) */}
              <div 
                className="w-11 h-11 rounded-full border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-black font-mono text-xs flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.25)] ring-2 ring-emerald-500/20 group-hover:scale-110 group-hover:shadow-[0_0_22px_rgba(16,185,129,0.5)] group-active:scale-95 transition-all duration-200"
              >
                COL
              </div>

              {/* TÍTULO Y SUBTÍTULO (OCULTO EN MODO COLAPSADO DESKTOP) */}
              {!isCollapsed && (
                <div className="flex flex-col min-w-0 transition-opacity duration-200">
                  <span className="font-black text-lg tracking-tight text-zinc-950 dark:text-white uppercase font-sans truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    Colchas
                  </span>
                  <span className="text-[9.5px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest truncate">
                    Control de Calidad
                  </span>
                </div>
              )}
            </button>

            {/* Móvil: Botón cerrar X para drawer en pantallas pequeñas */}
            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden p-2 rounded-xl text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              title="Cerrar menú"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 2. LISTA DE NAVEGACIÓN VERTICAL CON ALINEACIÓN Y CENTRADO PERFECTO (ESPACIADO ELEGANTE) */}
          <div className={`flex-1 min-h-0 overflow-y-auto no-scrollbar py-3 flex flex-col justify-center ${
            isCollapsed ? 'px-1 items-center' : 'px-2.5 sm:px-3'
          }`}>
            <div className={`my-auto flex flex-col w-full ${
              isCollapsed ? 'items-center gap-3' : 'gap-2 sm:gap-2.5'
            }`}>
              {menuItems.map(item => {
                const isActive = activeTab === item.id;
                const tooltipLabel = item.badge !== undefined 
                  ? `${item.label} (${item.badge})` 
                  : item.label;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectTab(item.id);
                      if (onCloseMobile) onCloseMobile();
                    }}
                    title={tooltipLabel}
                    className={`
                      relative transition-all duration-200 cursor-pointer group
                      ${
                        isCollapsed 
                          ? 'w-11 py-1.5 min-h-[46px] rounded-2xl mx-auto flex flex-col items-center justify-center gap-0.5' 
                          : 'w-full flex items-center justify-between px-3.5 py-3 rounded-2xl gap-3.5 text-sm font-bold'
                      }
                      ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-lg shadow-blue-500/30 font-black'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/70 border border-transparent'
                      }
                    `}
                  >
                    {isCollapsed ? (
                      /* MODO COLAPSADO: ICONO CENTRADO ARRIBA Y NUMERITO UBICADO DIRECTAMENTE DEBAJO 100% CENTRADO */
                      <>
                        <span className={`shrink-0 transition-transform duration-200 group-hover:scale-110 flex items-center justify-center ${
                          isActive ? 'text-white' : 'text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-950 dark:group-hover:text-white'
                        }`}>
                          {item.icon}
                        </span>

                        {item.badge !== undefined && (
                          <span className={`
                            text-[8px] font-mono font-black px-1.5 py-0.5 rounded-full leading-none tracking-tight shadow-2xs
                            ${
                              isActive 
                                ? 'bg-white text-blue-700 font-black' 
                                : (item.badgeColor || 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700/80')
                            }
                          `}>
                            {item.badge}
                          </span>
                        )}
                      </>
                    ) : (
                      /* MODO EXPANDIDO: ICONO + TEXTO A LA IZQUIERDA, INSIGNIA A LA DERECHA */
                      <>
                        <div className="flex items-center min-w-0 gap-3.5">
                          <span className={`shrink-0 transition-transform duration-200 group-hover:scale-110 flex items-center justify-center ${
                            isActive ? 'text-white' : 'text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-950 dark:group-hover:text-white'
                          }`}>
                            {item.icon}
                          </span>

                          <span className="truncate tracking-wide">
                            {item.label}
                          </span>
                        </div>

                        {item.badge !== undefined && (
                          <span className={`
                            text-[10px] px-2 py-0.5 rounded-full font-mono font-black shrink-0 transition-all
                            ${
                              isActive 
                                ? 'bg-white text-blue-700 shadow-xs' 
                                : (item.badgeColor || 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300')
                            }
                          `}>
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. PARTE INFERIOR: MODO OSCURO / CLARO Y CERRAR SESIÓN (ALINEACIÓN PERFECTA) */}
          <div className={`py-3 border-t border-zinc-100 dark:border-zinc-800/80 space-y-1.5 bg-zinc-50/60 dark:bg-zinc-900/30 ${
            isCollapsed ? 'px-1 flex flex-col items-center' : 'p-3'
          }`}>
            
            {/* BOTÓN MODO OSCURO / MODO CLARO */}
            <button
              type="button"
              onClick={onToggleTheme}
              title={isDarkMode ? 'Modo Claro' : 'Modo Oscuro'}
              className={`
                flex items-center text-xs sm:text-sm font-semibold
                text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-800/80
                transition cursor-pointer group shadow-2xs hover:shadow-xs
                ${isCollapsed ? 'w-11 h-11 justify-center rounded-2xl mx-auto' : 'w-full gap-3.5 px-3.5 py-2.5 rounded-2xl'}
              `}
            >
              <span className="shrink-0 transition-transform duration-200 group-hover:rotate-12 flex items-center justify-center">
                {isDarkMode ? (
                  <Sun className="w-5 h-5 text-amber-500" />
                ) : (
                  <Moon className="w-5 h-5 text-indigo-500" />
                )}
              </span>
              {!isCollapsed && (
                <span className="truncate">
                  {isDarkMode ? 'Modo Claro' : 'Modo Oscuro'}
                </span>
              )}
            </button>

            {/* BOTÓN CERRAR SESIÓN */}
            <button
              type="button"
              onClick={onLogout}
              title="Cerrar Sesión"
              className={`
                flex items-center text-xs sm:text-sm font-semibold
                text-zinc-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30
                transition cursor-pointer group
                ${isCollapsed ? 'w-11 h-11 justify-center rounded-2xl mx-auto' : 'w-full gap-3.5 px-3.5 py-2.5 rounded-2xl'}
              `}
            >
              <span className="shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5 flex items-center justify-center">
                <LogOut className="w-5 h-5 text-zinc-400 group-hover:text-rose-500" />
              </span>
              {!isCollapsed && (
                <span className="truncate font-bold">
                  Cerrar Sesión
                </span>
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
