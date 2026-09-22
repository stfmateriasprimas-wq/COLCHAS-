import React from 'react';
import { LayoutDashboard, PlusCircle, Inbox, Database, AlertTriangle, Clock, BarChart3, MessageSquare, ShieldCheck } from 'lucide-react';

import { UsuarioSTF, isLavanderiaUser, isSoporteUser } from '../services/authService';

export type TabType = 
  | 'dashboard'
  | 'nueva-solicitud'
  | 'solicitudes'
  | 'base-datos'
  | 'alertas'
  | 'timeline'
  | 'estadisticas'
  | 'chat'
  | 'soporte-auditoria';

interface NavigationProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  pendingCount?: number;
  alertCount?: number;
  chatUnreadCount?: number;
  currentUser?: UsuarioSTF | null;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  pendingCount = 0,
  alertCount = 0,
  currentUser,
  chatUnreadCount = 0
}) => {
  const isLavanderia = isLavanderiaUser(currentUser);

  const navItems = [
    {
      id: 'dashboard' as TabType,
      label: 'Panel de Control',
      icon: LayoutDashboard
    },
    {
      id: 'chat' as TabType,
      label: 'Chat STF',
      icon: MessageSquare,
      badge: chatUnreadCount > 0 ? chatUnreadCount : undefined,
      badgeColor: 'bg-emerald-500/20 text-emerald-400 dark:text-emerald-700 border-emerald-500/40'
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
    },
    ...(isSoporteUser(currentUser) ? [{
      id: 'soporte-auditoria' as TabType,
      label: 'Auditoría & Historial',
      icon: ShieldCheck,
      badge: 'SOPORTE',
      badgeColor: 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border-cyan-500/40'
    }] : [])
  ];

  return (
    <nav className="border-b border-zinc-200/80 dark:border-zinc-800 bg-white/90 dark:bg-[#0c1017]/90 backdrop-blur sticky top-[57px] z-40 transition-colors duration-200 shadow-xs">
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
                  ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-md'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/80'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white dark:text-zinc-950' : 'text-zinc-500'}`} />
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
