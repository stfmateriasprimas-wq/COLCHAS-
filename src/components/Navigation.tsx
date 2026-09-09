import React from 'react';
import { LayoutDashboard, PlusCircle, Inbox, Database, AlertTriangle, Clock, BarChart3 } from 'lucide-react';

import { UsuarioSTF, isLavanderiaUser } from '../services/authService';

export type TabType = 
  | 'dashboard'
  | 'nueva-solicitud'
  | 'solicitudes'
  | 'base-datos'
  | 'alertas'
  | 'timeline'
  | 'estadisticas';

interface NavigationProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  pendingCount?: number;
  alertCount?: number;
  currentUser?: UsuarioSTF | null;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  pendingCount = 0,
  alertCount = 0,
  currentUser
}) => {
  const isLavanderia = isLavanderiaUser(currentUser);

  const navItems = [
    {
      id: 'dashboard' as TabType,
      label: 'Panel de Control',
      icon: LayoutDashboard
    },
    ...(!isLavanderia ? [{
      id: 'nueva-solicitud' as TabType,
      label: 'Nueva Solicitud',
      icon: PlusCircle
    }] : []),
    {
      id: 'solicitudes' as TabType,
      label: 'Bandeja de Solicitudes',
      icon: Inbox,
      badge: pendingCount > 0 ? pendingCount : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/40'
    },
    {
      id: 'base-datos' as TabType,
      label: 'Base de Datos Maestra',
      icon: Database
    },
    {
      id: 'alertas' as TabType,
      label: 'Alertas y SLA',
      icon: AlertTriangle,
      badge: alertCount > 0 ? alertCount : undefined,
      badgeColor: 'bg-rose-500/20 text-rose-600 dark:text-rose-300 border-rose-500/40'
    },
    {
      id: 'timeline' as TabType,
      label: 'Línea de Tiempo',
      icon: Clock
    },
    {
      id: 'estadisticas' as TabType,
      label: 'Estadísticas',
      icon: BarChart3
    }
  ];

  return (
    <nav className="border-b border-zinc-800 dark:border-zinc-200 bg-[#0c1017]/90 dark:bg-white/90 backdrop-blur sticky top-[57px] z-40 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-2 overflow-x-auto py-2 custom-scroll">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-white text-zinc-950 dark:bg-zinc-950 dark:text-white shadow-md'
                  : 'text-zinc-400 dark:text-zinc-600 hover:text-white dark:hover:text-zinc-950 hover:bg-zinc-800/80 dark:hover:bg-zinc-200/80'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-zinc-950 dark:text-white' : 'text-zinc-500'}`} />
              <span>{item.label}</span>
              {item.badge !== undefined && (
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
