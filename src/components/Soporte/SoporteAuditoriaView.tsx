import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  Activity, 
  Users, 
  Calendar, 
  Clock, 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  Smartphone, 
  Monitor, 
  AlertTriangle, 
  PlusCircle, 
  ArrowRightLeft, 
  CheckCircle2, 
  XCircle, 
  Camera, 
  Trash2, 
  RotateCcw, 
  LogIn, 
  Eye, 
  FileText,
  UserCheck,
  Radio,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { UsuarioSTF, getUsuariosList } from '../../services/authService';
import { auditService, AuditLogEntry, UserLoginSummary, AuditActionType } from '../../services/auditService';
import { SolicitudColcha } from '../../types';

interface SoporteAuditoriaViewProps {
  currentUser: UsuarioSTF;
  solicitudes: SolicitudColcha[];
  onViewOpDetail?: (solicitud: SolicitudColcha) => void;
  isDarkMode?: boolean;
}

export const SoporteAuditoriaView: React.FC<SoporteAuditoriaViewProps> = ({
  currentUser,
  solicitudes,
  onViewOpDetail,
  isDarkMode = false
}) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>(() => auditService.getCachedLogs());
  const [usuarios, setUsuarios] = useState<UsuarioSTF[]>(() => getUsuariosList());
  const [isLiveSyncing, setIsLiveSyncing] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  
  // Vistas internas: 'ingresos' | 'historial' | 'hoy'
  const [activeSubTab, setActiveSubTab] = useState<'historial' | 'ingresos' | 'hoy'>('historial');

  // Filtros de búsqueda para Historial
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedActionFilter, setSelectedActionFilter] = useState<AuditActionType | 'ALL'>('ALL');
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('ALL');
  const [selectedTimeRange, setSelectedTimeRange] = useState<'HOY' | 'AYER' | 'SEMANA' | 'MES' | 'ALL'>('HOY');

  // Filtro de búsqueda para Ingresos
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');

  // Suscripción en tiempo real a los logs de auditoría
  useEffect(() => {
    setUsuarios(getUsuariosList());
    const unsubscribe = auditService.subscribeToLogs((updatedLogs) => {
      setLogs(updatedLogs);
      setLastSyncTime(new Date());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Fechas de referencia
  const todayIso = new Date().toISOString().split('T')[0];
  const thisMonthKey = todayIso.substring(0, 7);

  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayIso = yesterdayDate.toISOString().split('T')[0];

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  // Analítica de ingresos de usuarios (Día y Mes)
  const userLoginSummaries: UserLoginSummary[] = useMemo(() => {
    return auditService.getUserLoginSummary(logs, usuarios);
  }, [logs, usuarios]);

  // Métricas KPI
  const metrics = useMemo(() => {
    const todayLogs = logs.filter(l => l.diaKey === todayIso);
    const monthLogs = logs.filter(l => l.mesKey === thisMonthKey);
    const todayLogins = todayLogs.filter(l => l.tipoAccion === 'LOGIN');
    const monthLogins = monthLogs.filter(l => l.tipoAccion === 'LOGIN');
    const activeUsersToday = new Set(todayLogins.map(l => l.usuarioId)).size;
    const todayModifications = todayLogs.filter(l => l.tipoAccion !== 'LOGIN');
    const todayCritical = todayLogs.filter(l => 
      l.tipoAccion === 'ELIMINACION_OP' || 
      (l.tipoAccion === 'DICTAMEN_CALIDAD' && l.detalles?.dictamen === 'RECHAZADO')
    );

    return {
      todayLoginsCount: todayLogins.length,
      activeUsersToday,
      monthLoginsCount: monthLogins.length,
      todayModificationsCount: todayModifications.length,
      todayCriticalCount: todayCritical.length,
      totalLogsCount: logs.length
    };
  }, [logs, todayIso, thisMonthKey]);

  // Logs filtrados para el apartado HISTORIAL
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // 1. Filtro por subpestaña 'hoy'
      if (activeSubTab === 'hoy' && log.diaKey !== todayIso) {
        return false;
      }

      // 2. Filtro de rango de fecha
      if (activeSubTab === 'historial') {
        if (selectedTimeRange === 'HOY' && log.diaKey !== todayIso) return false;
        if (selectedTimeRange === 'AYER' && log.diaKey !== yesterdayIso) return false;
        if (selectedTimeRange === 'SEMANA' && new Date(log.timestamp) < oneWeekAgo) return false;
        if (selectedTimeRange === 'MES' && log.mesKey !== thisMonthKey) return false;
      }

      // 3. Filtro por tipo de acción
      if (selectedActionFilter !== 'ALL' && log.tipoAccion !== selectedActionFilter) {
        return false;
      }

      // 4. Filtro por usuario
      if (selectedUserFilter !== 'ALL') {
        const matchId = log.usuarioId.toLowerCase() === selectedUserFilter.toLowerCase();
        const matchName = log.usuarioNombre.toUpperCase() === selectedUserFilter.toUpperCase();
        if (!matchId && !matchName) return false;
      }

      // 5. Búsqueda por texto libre
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchOp = log.opAfectada?.toLowerCase().includes(q);
        const matchUser = log.usuarioNombre.toLowerCase().includes(q) || log.usuarioId.toLowerCase().includes(q);
        const matchDesc = log.descripcion.toLowerCase().includes(q);
        const matchObs = log.detalles?.observaciones?.toLowerCase().includes(q);
        const matchCloth = log.detalles?.tela?.toLowerCase().includes(q);
        if (!matchOp && !matchUser && !matchDesc && !matchObs && !matchCloth) {
          return false;
        }
      }

      return true;
    });
  }, [logs, activeSubTab, selectedTimeRange, selectedActionFilter, selectedUserFilter, searchQuery, todayIso, yesterdayIso, thisMonthKey]);

  // Filtrado de usuarios para la sección de control de ingresos
  const filteredUserSummaries = useMemo(() => {
    if (!userSearchQuery.trim()) return userLoginSummaries;
    const q = userSearchQuery.toLowerCase().trim();
    return userLoginSummaries.filter(u => 
      u.nombre.toLowerCase().includes(q) ||
      u.userId.toLowerCase().includes(q) ||
      u.area.toLowerCase().includes(q) ||
      u.rol.toLowerCase().includes(q)
    );
  }, [userLoginSummaries, userSearchQuery]);

  // Atajo para filtrar historial al hacer clic en un usuario
  const handleInspectUserHistory = (userId: string) => {
    setSelectedUserFilter(userId);
    setActiveSubTab('historial');
  };

  // Encontrar colcha en el estado local para ver ficha
  const handleOpenOpCard = (opNumber?: string) => {
    if (!opNumber || !onViewOpDetail) return;
    const cleanTarget = opNumber.replace(/\D/g, '') || opNumber.trim().toUpperCase();
    const found = solicitudes.find(s => {
      const cleanS = s.op.replace(/\D/g, '') || s.op.trim().toUpperCase();
      return cleanS === cleanTarget || s.op === opNumber;
    });
    if (found) {
      onViewOpDetail(found);
    }
  };

  // Helper para renderizar iconos y colores por tipo de acción
  const getActionBadge = (action: AuditActionType) => {
    switch (action) {
      case 'CREACION_OP':
        return {
          label: 'CREACIÓN DE OP',
          icon: PlusCircle,
          badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
        };
      case 'TRANSFERENCIA':
        return {
          label: 'TRANSFERENCIA',
          icon: ArrowRightLeft,
          badgeClass: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
        };
      case 'DICTAMEN_CALIDAD':
        return {
          label: 'DICTAMEN CALIDAD',
          icon: CheckCircle2,
          badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30'
        };
      case 'ACTUALIZACION_FOTO':
        return {
          label: 'EVIDENCIA FOTO',
          icon: Camera,
          badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30'
        };
      case 'ELIMINACION_OP':
        return {
          label: 'ELIMINACIÓN OP',
          icon: Trash2,
          badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30'
        };
      case 'RESTAURACION_OP':
        return {
          label: 'RESTAURACIÓN OP',
          icon: RotateCcw,
          badgeClass: 'bg-teal-500/15 text-teal-400 border-teal-500/30'
        };
      case 'LOGIN':
        return {
          label: 'INGRESO SISTEMA',
          icon: LogIn,
          badgeClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
        };
      default:
        return {
          label: action,
          icon: Activity,
          badgeClass: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30'
        };
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      
      {/* 1. HEADER EXCLUSIVO SOPORTE TÉCNICO & AUDITORÍA EN TIEMPO REAL */}
      <div className="relative overflow-hidden rounded-3xl p-5 sm:p-7 bg-gradient-to-r from-zinc-950 via-[#06121e] to-zinc-950 border border-cyan-500/30 shadow-2xl text-white">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-1/3 w-60 h-60 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/35 text-cyan-300 text-[10px] font-mono font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>MÓDULO EXCLUSIVO · SOPORTE TÉCNICO</span>
              <span className="text-zinc-500">•</span>
              <span className="text-zinc-300">STF GROUP FORENSIC AUDIT</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              <ShieldCheck className="w-7 h-7 text-cyan-400" />
              <span>Lectura Inteligente y Auditoría en Tiempo Real</span>
            </h1>

            <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl font-medium">
              Control de accesos diarios y mensuales de cada colaborador, y apartado <strong>Historial</strong> de modificaciones, creaciones y trazabilidad forense con fecha y hora exacta.
            </p>
          </div>

          {/* Acciones de Cabecera: Exportar y Estado de Conexión */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-black/40 border border-white/10 text-[11px] font-mono text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>En vivo</span>
              <span className="text-zinc-500">|</span>
              <span className="text-[10px] text-zinc-400">
                {lastSyncTime.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
              </span>
            </div>

            <button
              type="button"
              onClick={() => auditService.exportAuditToCSV(logs)}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold font-mono tracking-wide transition active:scale-95 shadow-md cursor-pointer"
              title="Descargar registro forense completo en formato Excel / CSV"
            >
              <Download className="w-3.5 h-3.5 text-cyan-300" />
              <span>Exportar Excel / CSV</span>
            </button>
          </div>
        </div>

        {/* 2. TARJETAS KPI DE ACTIVIDAD */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6 pt-5 border-t border-white/10">
          
          <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 text-[11px] font-mono">
              <span>INGRESOS HOY</span>
              <LogIn className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-cyan-300">{metrics.todayLoginsCount}</span>
              <span className="text-[10px] text-zinc-400 font-mono">({metrics.activeUsersToday} usuarios)</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 text-[11px] font-mono">
              <span>INGRESOS MES</span>
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-indigo-300">{metrics.monthLoginsCount}</span>
              <span className="text-[10px] text-zinc-400 font-mono">sesiones</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 text-[11px] font-mono">
              <span>CAMBIOS HOY</span>
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-300">{metrics.todayModificationsCount}</span>
              <span className="text-[10px] text-zinc-400 font-mono">ajustes/creaciones</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 text-[11px] font-mono">
              <span>ACCIONES CRÍTICAS</span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-300">{metrics.todayCriticalCount}</span>
              <span className="text-[10px] text-zinc-400 font-mono">eliminaciones/rechazos</span>
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 text-[11px] font-mono">
              <span>TOTAL TRAZABILIDAD</span>
              <FileText className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-purple-300">{metrics.totalLogsCount}</span>
              <span className="text-[10px] text-zinc-400 font-mono">eventos</span>
            </div>
          </div>

        </div>

      </div>

      {/* 3. SELECTOR DE SUBPESTAÑAS */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2 overflow-x-auto custom-scroll">
        <button
          type="button"
          onClick={() => setActiveSubTab('historial')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold font-mono uppercase tracking-wider transition cursor-pointer shrink-0 ${
            activeSubTab === 'historial'
              ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-md'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Apartado Historial de Cambios</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
            {filteredLogs.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('ingresos')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold font-mono uppercase tracking-wider transition cursor-pointer shrink-0 ${
            activeSubTab === 'ingresos'
              ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-md'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Control de Ingresos (Día & Mes)</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
            {metrics.activeUsersToday} activos hoy
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('hoy')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold font-mono uppercase tracking-wider transition cursor-pointer shrink-0 ${
            activeSubTab === 'hoy'
              ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-md'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Trazabilidad de Hoy</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
            {metrics.todayModificationsCount}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* VISTA 1: CONTROL DE INGRESOS DE USUARIOS (DÍA Y MES)                      */}
      {/* ========================================================================= */}
      {activeSubTab === 'ingresos' && (
        <div className="space-y-4">
          
          {/* Buscador de usuarios */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Buscar colaborador por nombre, documento o área..."
                className="w-full pl-10 pr-4 py-2 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
              Mostrando <strong>{filteredUserSummaries.length}</strong> de {usuarios.length} colaboradores
            </div>
          </div>

          {/* Tabla de Control de Ingresos */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Colaborador / Usuario</th>
                    <th className="py-3 px-4">Área / Rol</th>
                    <th className="py-3 px-4 text-center">Ingresos Hoy</th>
                    <th className="py-3 px-4 text-center">Ingresos Mes</th>
                    <th className="py-3 px-4">Última Conexión Registrada</th>
                    <th className="py-3 px-4">Dispositivo / Plataforma</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filteredUserSummaries.map((summary) => {
                    const isTodayActive = summary.activoHoy;
                    return (
                      <tr 
                        key={summary.userId}
                        className={`transition hover:bg-zinc-50 dark:hover:bg-zinc-800/40 ${
                          isTodayActive ? 'bg-emerald-500/[0.02]' : ''
                        }`}
                      >
                        {/* Colaborador */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 shadow-sm ${
                              isTodayActive
                                ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                                : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                            }`}>
                              {summary.nombre.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-extrabold text-zinc-900 dark:text-white flex items-center gap-1.5">
                                <span>{summary.nombre}</span>
                                {isTodayActive && (
                                  <span className="w-2 h-2 rounded-full bg-emerald-500" title="Ingresó hoy al sistema" />
                                )}
                              </div>
                              <span className="text-[10.5px] font-mono text-zinc-400">ID: {summary.userId}</span>
                            </div>
                          </div>
                        </td>

                        {/* Área / Rol */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <span className="inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">
                              {summary.area}
                            </span>
                            <div className="text-[10px] text-zinc-400 font-mono">{summary.rol}</div>
                          </div>
                        </td>

                        {/* Ingresos Hoy */}
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full text-xs font-mono font-black ${
                            summary.loginsHoy > 0
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                          }`}>
                            {summary.loginsHoy}
                          </span>
                        </td>

                        {/* Ingresos Mes */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full text-xs font-mono font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                            {summary.loginsMes}
                          </span>
                        </td>

                        {/* Última Conexión */}
                        <td className="py-3.5 px-4">
                          {summary.ultimoLogin ? (
                            <div className="space-y-0.5">
                              <div className="font-mono font-bold text-zinc-800 dark:text-zinc-200 text-[11px] flex items-center gap-1.5">
                                <Clock className="w-3 h-3 text-cyan-400" />
                                <span>{summary.ultimoLogin.fechaFormateada}</span>
                              </div>
                              <span className="text-[10px] text-zinc-400 font-mono">
                                ({summary.ultimoLogin.diaKey === todayIso ? 'Hoy' : summary.ultimoLogin.diaKey})
                              </span>
                            </div>
                          ) : (
                            <span className="text-zinc-400 font-mono text-[11px] italic">Sin ingresos registrados</span>
                          )}
                        </td>

                        {/* Dispositivo / Plataforma */}
                        <td className="py-3.5 px-4">
                          {summary.ultimoLogin ? (
                            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300 text-[11px]">
                              {summary.dispositivoReciente.toLowerCase().includes('móvil') ? (
                                <Smartphone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              ) : (
                                <Monitor className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              )}
                              <span className="truncate max-w-[150px]" title={summary.dispositivoReciente}>
                                {summary.dispositivoReciente}
                              </span>
                            </div>
                          ) : (
                            <span className="text-zinc-400 font-mono text-[11px]">-</span>
                          )}
                        </td>

                        {/* Botón de Inspección */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleInspectUserHistory(summary.userId)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-mono font-bold transition active:scale-95 cursor-pointer"
                            title="Filtrar todas las acciones y modificaciones de este usuario"
                          >
                            <Eye className="w-3 h-3 text-cyan-400" />
                            <span>Ver Historial</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2 Y 3: APARTADO HISTORIAL (MODIFICACIONES Y CREACIONES)              */}
      {/* ========================================================================= */}
      {(activeSubTab === 'historial' || activeSubTab === 'hoy') && (
        <div className="space-y-4">
          
          {/* BARRA DE FILTROS INTELIGENTES */}
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              
              {/* Buscador de texto libre */}
              <div className="md:col-span-2 relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por OP (ej: OP-00096156), operario, tela u observación..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              {/* Filtro por tipo de acción */}
              <div>
                <select
                  value={selectedActionFilter}
                  onChange={(e) => setSelectedActionFilter(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
                >
                  <option value="ALL">Todas las acciones</option>
                  <option value="CREACION_OP">Creación de OP</option>
                  <option value="TRANSFERENCIA">Transferencias de Estado</option>
                  <option value="DICTAMEN_CALIDAD">Dictamen de Calidad</option>
                  <option value="ACTUALIZACION_FOTO">Carga de Fotos</option>
                  <option value="ELIMINACION_OP">Eliminación de OP</option>
                  <option value="RESTAURACION_OP">Restauración de OP</option>
                  <option value="LOGIN">Ingreso al Sistema (Logins)</option>
                </select>
              </div>

              {/* Filtro por usuario */}
              <div>
                <select
                  value={selectedUserFilter}
                  onChange={(e) => setSelectedUserFilter(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
                >
                  <option value="ALL">Todos los colaboradores</option>
                  {usuarios.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.nombre} ({u.area})
                    </option>
                  ))}
                </select>
              </div>

            </div>

            {/* Selector de Rango de Fecha (solo en pestaña Historial) */}
            {activeSubTab === 'historial' && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                <div className="flex items-center gap-1.5 overflow-x-auto custom-scroll py-1">
                  <span className="text-[11px] font-mono text-zinc-400 mr-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Período:</span>
                  </span>

                  {(['HOY', 'AYER', 'SEMANA', 'MES', 'ALL'] as const).map(rangeKey => {
                    const labels: Record<typeof rangeKey, string> = {
                      HOY: 'Hoy',
                      AYER: 'Ayer',
                      SEMANA: 'Últimos 7 días',
                      MES: 'Este Mes',
                      ALL: 'Todo el Histórico'
                    };
                    const isSelected = selectedTimeRange === rangeKey;
                    return (
                      <button
                        key={rangeKey}
                        type="button"
                        onClick={() => setSelectedTimeRange(rangeKey)}
                        className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500 text-white shadow-sm'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {labels[rangeKey]}
                      </button>
                    );
                  })}
                </div>

                {/* Reset filters */}
                {(selectedActionFilter !== 'ALL' || selectedUserFilter !== 'ALL' || searchQuery || selectedTimeRange !== 'HOY') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedActionFilter('ALL');
                      setSelectedUserFilter('ALL');
                      setSearchQuery('');
                      setSelectedTimeRange('HOY');
                    }}
                    className="text-[11px] font-mono text-rose-500 hover:text-rose-600 hover:underline flex items-center gap-1"
                  >
                    <span>Limpiar filtros</span>
                  </button>
                )}
              </div>
            )}

          </div>

          {/* LISTA / FEED DEL HISTORIAL CRONOLÓGICO */}
          {filteredLogs.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-12 text-center border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-zinc-800 dark:text-white">
                No se encontraron registros de auditoría
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                No hay eventos que coincidan con los filtros de búsqueda aplicados para este período.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => {
                const badge = getActionBadge(log.tipoAccion);
                const ActionIcon = badge.icon;

                return (
                  <div
                    key={log.id}
                    className="bg-white dark:bg-zinc-900 rounded-3xl p-4 sm:p-5 border border-zinc-200 dark:border-zinc-800 shadow-xs hover:border-cyan-500/40 transition space-y-3"
                  >
                    {/* Fila 1: Tipo de Acción, OP y Fecha/Hora exacta */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-mono font-bold border ${badge.badgeClass}`}>
                          <ActionIcon className="w-3.5 h-3.5" />
                          <span>{badge.label}</span>
                        </span>

                        {log.opAfectada && (
                          <button
                            type="button"
                            onClick={() => handleOpenOpCard(log.opAfectada)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-mono font-extrabold text-[11px] border border-zinc-200 dark:border-zinc-700 transition cursor-pointer"
                            title="Ver ficha técnica de esta OP"
                          >
                            <span>{log.opAfectada}</span>
                            <Eye className="w-3 h-3 text-cyan-400" />
                          </button>
                        )}
                      </div>

                      {/* Fecha y hora exacta */}
                      <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 font-mono text-[11.5px] bg-zinc-100 dark:bg-zinc-800/80 px-3 py-1 rounded-full border border-zinc-200 dark:border-zinc-700">
                        <Clock className="w-3.5 h-3.5 text-cyan-500" />
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">{log.fechaFormateada}</span>
                      </div>
                    </div>

                    {/* Fila 2: Usuario responsable y descripción */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 pt-1">
                      <div className="space-y-1">
                        <div className="text-sm font-extrabold text-zinc-900 dark:text-white">
                          {log.descripcion}
                        </div>

                        {/* Detalles específicos del cambio */}
                        {log.detalles && (
                          <div className="text-xs text-zinc-600 dark:text-zinc-300 space-y-1 mt-1.5">
                            {/* Transición de estados */}
                            {log.detalles.estadoAnterior && log.detalles.estadoNuevo && (
                              <div className="flex items-center gap-2 font-mono text-[11px] bg-zinc-50 dark:bg-zinc-800/60 p-2 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80">
                                <span className="text-zinc-400 line-through">{log.detalles.estadoAnterior}</span>
                                <span className="text-cyan-400 font-black">➔</span>
                                <span className="text-emerald-500 font-extrabold">{log.detalles.estadoNuevo}</span>
                              </div>
                            )}

                            {/* Dictamen */}
                            {log.detalles.dictamen && (
                              <div className="font-mono text-[11px]">
                                Dictamen formal: <strong className={log.detalles.dictamen === 'APROBADO' ? 'text-emerald-400 font-black' : 'text-rose-400 font-black'}>{log.detalles.dictamen}</strong>
                              </div>
                            )}

                            {/* Observaciones registradas */}
                            {log.detalles.observaciones && (
                              <div className="italic text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/40 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800">
                                "{log.detalles.observaciones}"
                              </div>
                            )}

                            {/* Datos de tela y lote */}
                            {(log.detalles.tela || log.detalles.lote) && (
                              <div className="flex items-center gap-3 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                                {log.detalles.tela && <span>Tela: <strong className="text-zinc-800 dark:text-zinc-200">{log.detalles.tela}</strong></span>}
                                {log.detalles.lote && <span>Lote: <strong className="text-zinc-800 dark:text-zinc-200">{log.detalles.lote}</strong></span>}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Chip del Usuario Responsable */}
                      <div className="flex items-center gap-2 p-2 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 shrink-0">
                        <div className="w-7 h-7 rounded-xl bg-cyan-500 text-white flex items-center justify-center font-bold text-xs">
                          {log.usuarioNombre.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="text-left">
                          <div className="text-[11px] font-bold text-zinc-900 dark:text-white leading-tight">
                            {log.usuarioNombre}
                          </div>
                          <div className="text-[9.5px] font-mono text-zinc-400">
                            {log.usuarioArea} • ID: {log.usuarioId}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Fila 3: Dispositivo y Huella Digital */}
                    {log.detalles && (log.detalles.dispositivo || log.detalles.navegador) && (
                      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                        <div className="flex items-center gap-3">
                          {log.detalles.dispositivo && (
                            <span className="flex items-center gap-1">
                              {log.detalles.dispositivo.toLowerCase().includes('móvil') ? (
                                <Smartphone className="w-3 h-3 text-amber-400" />
                              ) : (
                                <Monitor className="w-3 h-3 text-blue-400" />
                              )}
                              <span>{log.detalles.dispositivo}</span>
                            </span>
                          )}
                          {log.detalles.navegador && <span>Navegador: {log.detalles.navegador}</span>}
                          {log.detalles.sistemaOperativo && <span>SO: {log.detalles.sistemaOperativo}</span>}
                        </div>

                        <span className="text-[9px] text-zinc-500 font-mono">
                          ID: {log.id.substring(0, 16)}...
                        </span>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

    </div>
  );
};
