import React from 'react';
import { Layers, Database, AlertTriangle, Clock, BarChart3 } from 'lucide-react';
import { TabType } from '../Navigation';

interface SubNavTabsProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  totalHistorico: number;
  alertCount: number;
}

export const SubNavTabs: React.FC<SubNavTabsProps> = ({
  activeTab,
  onSelectTab,
  totalHistorico,
  alertCount
}) => {
  const tabs: { id: TabType; label: string; icon: React.ReactNode; badge?: string | number; badgeColor?: string }[] = [
    {
      id: 'solicitudes',
      label: 'SOLICITUDES',
      icon: <Layers className="w-3.5 h-3.5" />
    },
    {
      id: 'base-datos',
      label: 'BASE DE DATOS',
      badge: totalHistorico,
      icon: <Database className="w-3.5 h-3.5" />
    },
    {
      id: 'alertas',
      label: 'ALERTAS',
      badge: alertCount > 0 ? alertCount : undefined,
      badgeColor: 'bg-rose-500 text-white',
      icon: <AlertTriangle className="w-3.5 h-3.5" />
    },
    {
      id: 'timeline',
      label: 'LÍNEA DE TIEMPO',
      icon: <Clock className="w-3.5 h-3.5" />
    },
    {
      id: 'estadisticas',
      label: 'ESTADÍSTICAS',
      icon: <BarChart3 className="w-3.5 h-3.5" />
    }
  ];

  return (
    <div className="w-full flex justify-center py-1 select-none">
      <nav 
        aria-label="Pestañas de Navegación Principal"
        className="inline-flex items-center justify-center gap-1.5 p-1.5 rounded-3xl bg-[#0c1017]/95 dark:bg-zinc-950/90 backdrop-blur-xl border border-zinc-800/90 dark:border-zinc-800 shadow-[0_12px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-white/5 max-w-full overflow-x-auto custom-scroll"
      >
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`relative px-4 sm:px-5 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all duration-200 cursor-pointer shrink-0 group ${
                isActive
                  ? 'bg-zinc-900/95 text-white border border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.22)] font-black'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 border border-transparent hover:border-zinc-700/60'
              }`}
            >
              {/* Active Ambient Glow Background */}
              {isActive && (
                <span className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-indigo-500/10 pointer-events-none" />
              )}

              {/* Icon with Futuristic Color Indicator */}
              <span className={`relative z-10 transition-transform duration-200 group-hover:scale-110 ${
                isActive ? 'text-emerald-400' : 'text-zinc-400 group-hover:text-zinc-200'
              }`}>
                {tab.icon}
              </span>

              {/* Label */}
              <span className="relative z-10 tracking-wider text-[11px] sm:text-xs">
                {tab.label}
              </span>

              {/* Active Pulse Dot */}
              {isActive && (
                <span className="relative z-10 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              )}

              {/* High-Tech Badge */}
              {tab.badge !== undefined && (
                <span className={`relative z-10 text-[9.5px] px-2 py-0.5 rounded-full font-mono font-black border transition-all duration-200 ${
                  tab.badgeColor || (isActive 
                    ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.3)]' 
                    : 'bg-zinc-800/90 text-zinc-300 border-zinc-700 group-hover:border-zinc-500')
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
