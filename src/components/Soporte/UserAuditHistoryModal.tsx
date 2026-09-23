import React, { useState, useMemo } from 'react';
import { 
  X, 
  ShieldCheck, 
  Clock, 
  Calendar, 
  Search, 
  Download, 
  Compass, 
  Eye, 
  Layers, 
  Database, 
  AlertTriangle, 
  PlusCircle, 
  MessageSquare, 
  Monitor, 
  Smartphone, 
  CheckCircle2, 
  XCircle, 
  ArrowRightLeft, 
  LogIn, 
  Filter, 
  Activity, 
  FileText,
  BarChart3
} from 'lucide-react';
import { UsuarioSTF } from '../../services/authService';
import { auditService, AuditLogEntry } from '../../services/auditService';
import { SolicitudColcha } from '../../types';

interface UserAuditHistoryModalProps {
  user: UsuarioSTF;
  allLogs: AuditLogEntry[];
  solicitudes?: SolicitudColcha[];
  onClose: () => void;
  onViewOpDetail?: (solicitud: SolicitudColcha) => void;
}

export const UserAuditHistoryModal: React.FC<UserAuditHistoryModalProps> = ({
  user,
  allLogs,
  solicitudes = [],
  onClose,
  onViewOpDetail
}) => {
  // Filtros internos
  const [selectedTimeRange, setSelectedTimeRange] = useState<'HOY' | 'AYER' | 'SEMANA' | 'MES' | 'ALL'>('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'ALL' | 'NAVEGACION' | 'CONSULTA_OP' | 'MODIFICACIONES' | 'LOGIN'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Fechas de referencia
  const todayIso = new Date().toISOString().split('T')[0];
  const thisMonthKey = todayIso.substring(0, 7);

  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayIso = yesterdayDate.toISOString().split('T')[0];

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  // Estadísticas globales de rango de medición del colaborador
  const stats = useMemo(() => {
    return auditService.getUserNavigationStats(allLogs, user.id);
  }, [allLogs, user.id]);

  // Todos los logs de este usuario específico
  const userLogs = useMemo(() => {
    return allLogs.filter(l => 
      l.usuarioId.toLowerCase() === user.id.toLowerCase() ||
      l.usuarioNombre.toUpperCase() === user.nombre.toUpperCase()
    );
  }, [allLogs, user.id, user.nombre]);

  // Último ingreso
  const lastLogin = useMemo(() => {
    const logins = userLogs.filter(l => l.tipoAccion === 'LOGIN');
    return logins.length > 0 ? logins[0] : null;
  }, [userLogs]);

  const isTodayActive = useMemo(() => {
    return userLogs.some(l => l.diaKey === todayIso);
  }, [userLogs, todayIso]);

  // Filtrado reactivo de la línea de tiempo
  const filteredEvents = useMemo(() => {
    return userLogs.filter(event => {
      // 1. Filtro por Rango de Fecha
      if (selectedTimeRange === 'HOY' && event.diaKey !== todayIso) return false;
      if (selectedTimeRange === 'AYER' && event.diaKey !== yesterdayIso) return false;
      if (selectedTimeRange === 'SEMANA' && new Date(event.timestamp) < oneWeekAgo) return false;
      if (selectedTimeRange === 'MES' && event.mesKey !== thisMonthKey) return false;

      // 2. Filtro por Categoría de Acción
      if (selectedCategoryFilter === 'NAVEGACION' && event.tipoAccion !== 'NAVEGACION') return false;
      if (selectedCategoryFilter === 'CONSULTA_OP' && event.tipoAccion !== 'CONSULTA_OP') return false;
      if (selectedCategoryFilter === 'LOGIN' && event.tipoAccion !== 'LOGIN') return false;
      if (selectedCategoryFilter === 'MODIFICACIONES') {
        const modActions = ['CREACION_OP', 'TRANSFERENCIA', 'DICTAMEN_CALIDAD', 'ACTUALIZACION_FOTO', 'ELIMINACION_OP', 'RESTAURACION_OP'];
        if (!modActions.includes(event.tipoAccion)) return false;
      }

      // 3. Filtro por Búsqueda de Texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchDesc = event.descripcion.toLowerCase().includes(q);
        const matchOp = event.opAfectada?.toLowerCase().includes(q);
        const matchSec = event.detalles?.seccionNombre?.toLowerCase().includes(q) || event.detalles?.seccionId?.toLowerCase().includes(q);
        const matchObs = event.detalles?.observaciones?.toLowerCase().includes(q);
        if (!matchDesc && !matchOp && !matchSec && !matchObs) return false;
      }

      return true;
    });
  }, [userLogs, selectedTimeRange, selectedCategoryFilter, searchQuery, todayIso, yesterdayIso, thisMonthKey]);

  // Exportar historial de este usuario específico a CSV
  const handleExportUserCsv = () => {
    const filename = `AUDITORIA_${user.id}_${user.nombre.replace(/\s+/g, '_')}_${todayIso}.csv`;
    auditService.exportAuditToCSV(filteredEvents, filename);
  };

  // Abrir OP si existe
  const handleOpenOp = (opNumber?: string) => {
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

  // Helper visual para ícono y estilo de cada evento
  const getEventVisuals = (event: AuditLogEntry) => {
    if (event.tipoAccion === 'NAVEGACION') {
      const sec = event.detalles?.seccionId;
      if (sec === 'base-datos') {
        return {
          icon: Database,
          label: 'BASE DE DATOS',
          colorClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
          dotColor: 'bg-blue-500'
        };
      }
      if (sec === 'alertas') {
        return {
          icon: AlertTriangle,
          label: 'ALERTAS & SLA',
          colorClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
          dotColor: 'bg-rose-500'
        };
      }
      if (sec === 'nueva-solicitud') {
        return {
          icon: PlusCircle,
          label: 'NUEVA SOLICITUD',
          colorClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
          dotColor: 'bg-emerald-500'
        };
      }
      if (sec === 'solicitudes') {
        return {
          icon: Layers,
          label: 'SOLICITUDES',
          colorClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
          dotColor: 'bg-amber-500'
        };
      }
      if (sec === 'chat') {
        return {
          icon: MessageSquare,
          label: 'CHAT STF',
          colorClass: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30',
          dotColor: 'bg-teal-500'
        };
      }
      return {
        icon: Compass,
        label: event.detalles?.seccionNombre || 'ÁREA DE TRABAJO',
        colorClass: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
        dotColor: 'bg-indigo-500'
      };
    }

    if (event.tipoAccion === 'CONSULTA_OP') {
      return {
        icon: Eye,
        label: 'FICHA OP CONSULTADA',
        colorClass: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
        dotColor: 'bg-cyan-400'
      };
    }

    if (event.tipoAccion === 'LOGIN') {
      return {
        icon: LogIn,
        label: 'INGRESO SISTEMA',
        colorClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        dotColor: 'bg-emerald-400'
      };
    }

    if (event.tipoAccion === 'CREACION_OP') {
      return {
        icon: PlusCircle,
        label: 'CREACIÓN DE OP',
        colorClass: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/40',
        dotColor: 'bg-emerald-500'
      };
    }

    if (event.tipoAccion === 'TRANSFERENCIA') {
      return {
        icon: ArrowRightLeft,
        label: 'TRANSFERENCIA ESTADO',
        colorClass: 'bg-sky-500/20 text-sky-600 dark:text-sky-300 border-sky-500/40',
        dotColor: 'bg-sky-500'
      };
    }

    if (event.tipoAccion === 'DICTAMEN_CALIDAD') {
      const isApproved = event.detalles?.dictamen === 'APROBADO';
      return {
        icon: isApproved ? CheckCircle2 : XCircle,
        label: `DICTAMEN: ${event.detalles?.dictamen || 'CALIDAD'}`,
        colorClass: isApproved 
          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/40' 
          : 'bg-rose-500/20 text-rose-600 dark:text-rose-300 border-rose-500/40',
        dotColor: isApproved ? 'bg-emerald-500' : 'bg-rose-500'
      };
    }

    return {
      icon: Activity,
      label: event.tipoAccion,
      colorClass: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
      dotColor: 'bg-zinc-400'
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div 
        className="relative w-full max-w-4xl bg-white dark:bg-[#0d121c] rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden my-auto max-h-[95vh] flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        
        {/* ========================================================================= */}
        {/* ENCABEZADO DEL MODAL FORENSE                                              */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 text-white border-b border-zinc-800 shrink-0">
          <div className="flex items-start justify-between gap-3">
            
            {/* Información del Colaborador */}
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center font-black text-base sm:text-lg shadow-lg ${
                  isTodayActive
                    ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-emerald-500/20'
                    : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                }`}>
                  {user.nombre.substring(0, 2).toUpperCase()}
                </div>
                {isTodayActive && (
                  <span 
                    className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-zinc-900 rounded-full" 
                    title="Conectado hoy"
                  />
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                    <span>{user.nombre}</span>
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    <ShieldCheck className="w-3 h-3 text-cyan-400" />
                    <span>AUDITORÍA FORENSE</span>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-zinc-400 font-mono">
                  <span>ID: <strong className="text-zinc-200">{user.id}</strong></span>
                  <span>•</span>
                  <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700 font-sans font-semibold text-[10.5px]">
                    {user.area}
                  </span>
                  <span>•</span>
                  <span>Rol: <strong className="text-zinc-300">{user.rol}</strong></span>
                </div>
              </div>
            </div>

            {/* Botón Cerrar */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition cursor-pointer"
              title="Cerrar modal de auditoría"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Subbarra de última conexión y dispositivo */}
          <div className="mt-4 pt-3 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-zinc-400">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Última conexión:</span>
              <strong className="text-zinc-200">
                {lastLogin ? `${lastLogin.fechaFormateada} (${lastLogin.diaKey === todayIso ? 'Hoy' : lastLogin.diaKey})` : 'Sin registros'}
              </strong>
            </div>

            {lastLogin?.detalles?.dispositivo && (
              <div className="flex items-center gap-1.5 text-zinc-300">
                {lastLogin.detalles.dispositivo.toLowerCase().includes('móvil') ? (
                  <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Monitor className="w-3.5 h-3.5 text-blue-400" />
                )}
                <span>{lastLogin.detalles.dispositivo}</span>
                {lastLogin.detalles.navegador && (
                  <span className="text-zinc-400">• {lastLogin.detalles.navegador}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CUERPO DEL MODAL (SCROLLABLE)                                             */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scroll flex-1 space-y-6">

          {/* SECCIÓN 1: RANGO DE MEDICIÓN (MÉTRICAS DE RECORRIDO POR ÁREAS) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-cyan-500" />
                <span>Rango de Medición por Áreas de Trabajo</span>
              </h3>
              <span className="text-[11px] font-mono text-zinc-400">
                Total eventos registrados: <strong className="text-zinc-800 dark:text-zinc-200">{stats.totalEventos}</strong> ({stats.diasActivos} días con actividad)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
              {/* Base de Datos */}
              <div className="bg-zinc-50 dark:bg-zinc-900/80 p-3 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <Database className="w-4 h-4 text-blue-500" />
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    MÓDULO
                  </span>
                </div>
                <div className="mt-2">
                  <div className="text-xl sm:text-2xl font-black font-mono text-zinc-900 dark:text-white">
                    {stats.baseDatosCount}
                  </div>
                  <div className="text-[10.5px] font-medium text-zinc-500 dark:text-zinc-400 truncate">
                    Base de Datos
                  </div>
                </div>
              </div>

              {/* Alertas y SLA */}
              <div className="bg-zinc-50 dark:bg-zinc-900/80 p-3 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    SLA
                  </span>
                </div>
                <div className="mt-2">
                  <div className="text-xl sm:text-2xl font-black font-mono text-zinc-900 dark:text-white">
                    {stats.alertasCount}
                  </div>
                  <div className="text-[10.5px] font-medium text-zinc-500 dark:text-zinc-400 truncate">
                    Alertas y SLA
                  </div>
                </div>
              </div>

              {/* Nueva Solicitud */}
              <div className="bg-zinc-50 dark:bg-zinc-900/80 p-3 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <PlusCircle className="w-4 h-4 text-emerald-500" />
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    CREACIÓN
                  </span>
                </div>
                <div className="mt-2">
                  <div className="text-xl sm:text-2xl font-black font-mono text-zinc-900 dark:text-white">
                    {stats.nuevaSolicitudCount}
                  </div>
                  <div className="text-[10.5px] font-medium text-zinc-500 dark:text-zinc-400 truncate">
                    Nueva Solicitud
                  </div>
                </div>
              </div>

              {/* Bandeja Solicitudes */}
              <div className="bg-zinc-50 dark:bg-zinc-900/80 p-3 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <Layers className="w-4 h-4 text-amber-500" />
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    BANDEJA
                  </span>
                </div>
                <div className="mt-2">
                  <div className="text-xl sm:text-2xl font-black font-mono text-zinc-900 dark:text-white">
                    {stats.solicitudesCount}
                  </div>
                  <div className="text-[10.5px] font-medium text-zinc-500 dark:text-zinc-400 truncate">
                    Bandeja Solicitudes
                  </div>
                </div>
              </div>

              {/* Fichas OP Consultadas */}
              <div className="bg-zinc-50 dark:bg-zinc-900/80 p-3 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between col-span-2 sm:col-span-1">
                <div className="flex items-center justify-between">
                  <Eye className="w-4 h-4 text-cyan-500" />
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                    DETALLE
                  </span>
                </div>
                <div className="mt-2">
                  <div className="text-xl sm:text-2xl font-black font-mono text-zinc-900 dark:text-white">
                    {stats.consultasOpCount}
                  </div>
                  <div className="text-[10.5px] font-medium text-zinc-500 dark:text-zinc-400 truncate">
                    Fichas Consultadas
                  </div>
                </div>
              </div>
            </div>

            {/* Fila secundaria de operaciones y chat */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              <div className="p-2.5 rounded-xl bg-zinc-100/70 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between">
                <div className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">💬 Chat STF</div>
                <span className="font-mono font-bold text-xs text-zinc-800 dark:text-zinc-200">{stats.chatCount} visitas</span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-100/70 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between">
                <div className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">⏱️ Línea de Tiempo</div>
                <span className="font-mono font-bold text-xs text-zinc-800 dark:text-zinc-200">{stats.timelineCount} visitas</span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-100/70 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between">
                <div className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">⚡ OPs Modificadas</div>
                <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                  {stats.creacionesOpCount + stats.transferenciasCount + stats.dictamenesCount} acciones
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-100/70 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between">
                <div className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">🔑 Inicios de Sesión</div>
                <span className="font-mono font-bold text-xs text-zinc-800 dark:text-zinc-200">{stats.loginsCount} logins</span>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: BARRA DE FILTROS Y BÚSQUEDA */}
          <div className="bg-zinc-50 dark:bg-zinc-900/60 p-3.5 sm:p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 space-y-3">
            
            {/* Buscador + Exportar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar en el recorrido (ej: Base de Datos, OP-XXXXX, alertas)..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <button
                type="button"
                onClick={handleExportUserCsv}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold shadow-sm transition active:scale-95 cursor-pointer shrink-0"
                title="Descargar este historial en formato CSV compatible con Excel"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar CSV</span>
              </button>
            </div>

            {/* Filtros de Fecha & Categoría */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800">
              
              {/* Filtro Período */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                <span className="text-[10.5px] font-mono text-zinc-400 mr-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-cyan-500" />
                  <span>Período:</span>
                </span>
                {(['HOY', 'AYER', 'SEMANA', 'MES', 'ALL'] as const).map(p => {
                  const labels = { HOY: 'Hoy', AYER: 'Ayer', SEMANA: '7 Días', MES: 'Este Mes', ALL: 'Todo' };
                  const active = selectedTimeRange === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setSelectedTimeRange(p)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                        active
                          ? 'bg-cyan-500 text-white shadow-xs'
                          : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700'
                      }`}
                    >
                      {labels[p]}
                    </button>
                  );
                })}
              </div>

              {/* Filtro Categoría */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                <span className="text-[10.5px] font-mono text-zinc-400 mr-1 flex items-center gap-1">
                  <Filter className="w-3 h-3 text-amber-500" />
                  <span>Tipo:</span>
                </span>
                {([
                  { key: 'ALL', label: 'Todos' },
                  { key: 'NAVEGACION', label: 'Navegación' },
                  { key: 'CONSULTA_OP', label: 'Fichas OP' },
                  { key: 'MODIFICACIONES', label: 'Modificaciones' },
                  { key: 'LOGIN', label: 'Logins' }
                ] as const).map(c => {
                  const active = selectedCategoryFilter === c.key;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setSelectedCategoryFilter(c.key as any)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                        active
                          ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                          : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700'
                      }`}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>

            </div>
          </div>

          {/* SECCIÓN 3: LÍNEA DE TIEMPO FORENSE CRONOLÓGICA */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-500 dark:text-zinc-400">
              <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>Trazabilidad Cronológica ({filteredEvents.length} eventos)</span>
              </span>
            </div>

            {filteredEvents.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
                <FileText className="w-8 h-8 text-zinc-400 mx-auto" />
                <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  No se registran movimientos con los filtros aplicados
                </div>
                <div className="text-[11px] text-zinc-400">
                  Prueba cambiando el período de tiempo o limpiando el texto de búsqueda.
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredEvents.map(event => {
                  const visuals = getEventVisuals(event);
                  const Icon = visuals.icon;

                  return (
                    <div
                      key={event.id}
                      className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 hover:border-cyan-500/40 transition shadow-2xs space-y-2"
                    >
                      {/* Cabecera del evento: Badge, OP, Hora */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${visuals.colorClass}`}>
                            <Icon className="w-3 h-3" />
                            <span>{visuals.label}</span>
                          </span>

                          {event.opAfectada && (
                            <button
                              type="button"
                              onClick={() => handleOpenOp(event.opAfectada)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-mono font-extrabold text-[11px] border border-zinc-200 dark:border-zinc-700 transition cursor-pointer"
                              title="Ver ficha técnica de esta OP"
                            >
                              <span>{event.opAfectada}</span>
                              <Eye className="w-3 h-3 text-cyan-400" />
                            </button>
                          )}
                        </div>

                        {/* Hora exacta con segundos */}
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/60 px-2.5 py-0.5 rounded-lg border border-zinc-200/80 dark:border-zinc-700/80">
                          <Clock className="w-3 h-3 text-cyan-500" />
                          <span className="font-bold text-zinc-800 dark:text-zinc-200">{event.fechaFormateada}</span>
                        </div>
                      </div>

                      {/* Descripción y detalles */}
                      <div className="space-y-1">
                        <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          {event.descripcion}
                        </div>

                        {/* Detalles adicionales si existen */}
                        {event.detalles && (
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 space-y-1 font-mono">
                            {/* Transición de estados */}
                            {event.detalles.estadoAnterior && event.detalles.estadoNuevo && (
                              <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800/40 p-1.5 rounded-lg border border-zinc-200/60 dark:border-zinc-700/60">
                                <span className="line-through text-zinc-400">{event.detalles.estadoAnterior}</span>
                                <span className="text-cyan-400">➔</span>
                                <span className="text-emerald-500 font-bold">{event.detalles.estadoNuevo}</span>
                              </div>
                            )}

                            {/* Dictamen */}
                            {event.detalles.dictamen && (
                              <div>
                                Dictamen: <strong className={event.detalles.dictamen === 'APROBADO' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>{event.detalles.dictamen}</strong>
                              </div>
                            )}

                            {/* Observaciones */}
                            {event.detalles.observaciones && (
                              <div className="italic text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/30 p-1.5 rounded-lg">
                                "{event.detalles.observaciones}"
                              </div>
                            )}

                            {/* Dispositivo utilizado en este evento */}
                            {event.detalles.dispositivo && (
                              <div className="text-[10px] text-zinc-400 flex items-center gap-1 pt-0.5">
                                <Monitor className="w-3 h-3 text-zinc-500" />
                                <span>{event.detalles.dispositivo}</span>
                                {event.detalles.navegador && <span>• {event.detalles.navegador}</span>}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* ========================================================================= */}
        {/* PIE DEL MODAL                                                             */}
        {/* ========================================================================= */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono shrink-0">
          <div className="text-zinc-500 dark:text-zinc-400 text-[11px]">
            STF Group Forensic Audit • Registro continuo en tiempo real
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportUserCsv}
              className="px-4 py-2 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold transition cursor-pointer"
            >
              Descargar Reporte
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 font-bold transition cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
