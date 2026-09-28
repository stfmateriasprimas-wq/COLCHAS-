import React, { useState, useMemo } from 'react';
import { 
  Target, Clock, ShieldCheck, CheckCircle2, AlertTriangle, 
  Layers, ArrowUpRight, TrendingUp, Sparkles, Filter, 
  Droplets, Microscope, Download, Eye, ExternalLink,
  ChevronRight, RefreshCw, BarChart2, Zap
} from 'lucide-react';
import { SolicitudColcha, KpiMetrics } from '../../types';
import { UsuarioSTF } from '../../services/authService';
import { SubNavTabs } from '../Navigation/SubNavTabs';
import { TabType } from '../Navigation';
import { 
  calculateCumplimientoMetrics, 
  filterSolicitudesByRange, 
  TimeRangeFilter 
} from '../../services/cumplimientoService';

interface CumplimientoViewProps {
  solicitudes: SolicitudColcha[];
  metrics: KpiMetrics;
  currentUser?: UsuarioSTF | null;
  onNavigateTab: (tab: TabType) => void;
  onViewDetail?: (solicitud: SolicitudColcha) => void;
}

export const CumplimientoView: React.FC<CumplimientoViewProps> = ({
  solicitudes,
  metrics,
  currentUser,
  onNavigateTab,
  onViewDetail
}) => {
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>('ALL');
  const [stageFilter, setStageFilter] = useState<string>('ALL');

  // Filtrado reactivo en tiempo real
  const filteredOps = useMemo(() => {
    let result = filterSolicitudesByRange(solicitudes, timeRange);
    if (stageFilter !== 'ALL') {
      result = result.filter(s => s.estado === stageFilter);
    }
    return result;
  }, [solicitudes, timeRange, stageFilter]);

  // Métricas calculadas en vivo
  const kpis = useMemo(() => {
    return calculateCumplimientoMetrics(filteredOps);
  }, [filteredOps]);

  // Lista de OPs en riesgo o con retraso para acción inmediata
  const opsEnRiesgo = useMemo(() => {
    return filteredOps
      .filter(s => s.tieneRetraso && s.estado !== 'FINALIZADO')
      .sort((a, b) => (b.diasHabiles || 0) - (a.diasHabiles || 0));
  }, [filteredOps]);

  const inRetrasoCount = useMemo(() => {
    return solicitudes.filter(s => s.tieneRetraso && s.estado !== 'FINALIZADO').length;
  }, [solicitudes]);

  // Color de estado según porcentaje
  const getScoreColor = (pct: number) => {
    if (pct >= 90) return { text: 'text-emerald-500', stroke: '#10b981', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' };
    if (pct >= 80) return { text: 'text-amber-500', stroke: '#f59e0b', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
    return { text: 'text-rose-500', stroke: '#f43f5e', bg: 'bg-rose-500/10', border: 'border-rose-500/30' };
  };

  const slaTheme = getScoreColor(kpis.pctCumplimientoSla);
  const calidadTheme = getScoreColor(kpis.pctCalidadAprobacion);
  const otifTheme = getScoreColor(kpis.pctOtif);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 select-none pb-12 relative font-sans">
      
      {/* 1. SUB-NAVIGATION BAR (CON LA PESTAÑA CUMPLIMIENTO ACTIVA) */}
      <SubNavTabs
        activeTab="cumplimiento"
        onSelectTab={onNavigateTab}
        totalHistorico={metrics.totalHistorico}
        alertCount={inRetrasoCount}
        currentUser={currentUser}
        solicitudes={solicitudes}
      />

      {/* 2. TOP BANNER: CENTRO DE CONTROL DE CUMPLIMIENTO Y COBERTURA */}
      <div className="bg-white dark:bg-[#0c1017] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-[0_4px_25px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_30px_rgba(255,255,255,0.04)] space-y-6 text-zinc-950 dark:text-white transition-colors duration-200">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/30">
                <Target className="w-4 h-4" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-950 dark:text-white brand-title">
                INDICADOR DE CUMPLIMIENTO & COBERTURA
              </h2>
              <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-500/40 flex items-center gap-1.5 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                TIEMPO REAL (SYNC 0 MS)
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-3xl">
              Medición integrada de oportunidad operativa (<span className="font-semibold text-zinc-900 dark:text-zinc-200">SLA ≤ 3 días hábiles</span>), conformidad técnica textil (<span className="font-semibold text-zinc-900 dark:text-zinc-200">Aprobación de Calidad</span>) y tasa de cobertura de colchas STF GROUP.
            </p>
          </div>

          {/* Time range filters */}
          <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-[#121824] p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shrink-0 self-start lg:self-center overflow-x-auto max-w-full">
            {(['7D', '15D', '30D', 'ALL'] as TimeRangeFilter[]).map((range) => {
              const labels: Record<TimeRangeFilter, string> = {
                '7D': '7 Días',
                '15D': '15 Días',
                '30D': '30 Días',
                'ALL': 'Histórico'
              };
              const isActive = timeRange === range;
              return (
                <button
                  key={range}
                  type="button"
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-zinc-950 text-white shadow-sm dark:bg-zinc-800 dark:text-cyan-300 dark:border dark:border-cyan-500/40'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                  }`}
                >
                  {labels[range]}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. HERO GRID: LOS 3 INDICADORES MAESTROS RADIALES */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* GAUGE 1: CUMPLIMIENTO OPERATIVO SLA (TIEMPOS) */}
          <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-zinc-50 to-white dark:from-[#0d121c] dark:to-[#080b12] border border-zinc-200/90 dark:border-zinc-800/90 shadow-sm flex flex-col justify-between group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-500" />
                CUMPLIMIENTO SLA TIEMPOS
              </span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${slaTheme.bg} ${slaTheme.text} ${slaTheme.border}`}>
                {kpis.pctCumplimientoSla >= 90 ? 'EXCELENTE' : kpis.pctCumplimientoSla >= 80 ? 'PRECAUCIÓN' : 'CRÍTICO'}
              </span>
            </div>

            {/* Gauge radial interactivo */}
            <div className="py-4 flex flex-col items-center justify-center relative">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-zinc-200 dark:text-zinc-800/60"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke={slaTheme.stroke}
                    strokeWidth="8"
                    strokeDasharray={2 * Math.PI * 40}
                    strokeDashoffset={2 * Math.PI * 40 * (1 - kpis.pctCumplimientoSla / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-3xl font-black font-mono tracking-tight ${slaTheme.text}`}>
                    {kpis.pctCumplimientoSla}%
                  </span>
                  <span className="text-[9.5px] uppercase font-bold text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Dentro de SLA
                  </span>
                </div>
              </div>
            </div>

            {/* Sub-métricas */}
            <div className="pt-3 border-t border-zinc-200/70 dark:border-zinc-800/70 grid grid-cols-2 gap-2 text-center text-xs">
              <div className="bg-white/60 dark:bg-zinc-900/40 p-2 rounded-xl">
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block font-medium">A Tiempo (≤ 3d)</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">{kpis.opsATiempo} OPs</span>
              </div>
              <div className="bg-white/60 dark:bg-zinc-900/40 p-2 rounded-xl">
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block font-medium">Con Retraso (&gt; 3d)</span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm">{kpis.opsConRetraso} OPs</span>
              </div>
            </div>
            <div className="mt-2 text-center">
              <span className="text-[10.5px] text-zinc-500 dark:text-zinc-400">
                Lead Time Promedio: <strong className="font-mono text-zinc-900 dark:text-white">{kpis.leadTimePromedioDias} días</strong> (~{kpis.leadTimePromedioHoras}h hábiles)
              </span>
            </div>
          </div>

          {/* GAUGE 2: CALIDAD TÉCNICA (CONFORMIDAD TEXTIL) */}
          <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-zinc-50 to-white dark:from-[#0d121c] dark:to-[#080b12] border border-zinc-200/90 dark:border-zinc-800/90 shadow-sm flex flex-col justify-between group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                ÍNDICE DE CALIDAD TÉCNICA
              </span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${calidadTheme.bg} ${calidadTheme.text} ${calidadTheme.border}`}>
                {kpis.pctCalidadAprobacion >= 95 ? 'ESTÁNDAR ALTO' : 'MONITOREAR'}
              </span>
            </div>

            {/* Gauge radial interactivo */}
            <div className="py-4 flex flex-col items-center justify-center relative">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-zinc-200 dark:text-zinc-800/60"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke={calidadTheme.stroke}
                    strokeWidth="8"
                    strokeDasharray={2 * Math.PI * 40}
                    strokeDashoffset={2 * Math.PI * 40 * (1 - kpis.pctCalidadAprobacion / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-3xl font-black font-mono tracking-tight ${calidadTheme.text}`}>
                    {kpis.pctCalidadAprobacion}%
                  </span>
                  <span className="text-[9.5px] uppercase font-bold text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Tasa Aprobación
                  </span>
                </div>
              </div>
            </div>

            {/* Sub-métricas */}
            <div className="pt-3 border-t border-zinc-200/70 dark:border-zinc-800/70 grid grid-cols-3 gap-1.5 text-center text-xs">
              <div className="bg-white/60 dark:bg-zinc-900/40 p-1.5 rounded-xl">
                <span className="text-[9.5px] text-zinc-500 dark:text-zinc-400 block font-medium">Aprobado</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">{kpis.aprobados}</span>
              </div>
              <div className="bg-white/60 dark:bg-zinc-900/40 p-1.5 rounded-xl">
                <span className="text-[9.5px] text-zinc-500 dark:text-zinc-400 block font-medium">En Gama</span>
                <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400 text-xs">{kpis.aprobadosEnGama}</span>
              </div>
              <div className="bg-white/60 dark:bg-zinc-900/40 p-1.5 rounded-xl">
                <span className="text-[9.5px] text-zinc-500 dark:text-zinc-400 block font-medium">Rechazo</span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-xs">{kpis.rechazados}</span>
              </div>
            </div>
            <div className="mt-2 text-center">
              <span className="text-[10.5px] text-zinc-500 dark:text-zinc-400">
                Metraje amparado: <strong className="font-mono text-zinc-900 dark:text-white">{kpis.totalMetros.toLocaleString()} m</strong> ({kpis.totalRollos} rollos)
              </span>
            </div>
          </div>

          {/* GAUGE 3: ÍNDICE INTEGRAL OTIF (ON-TIME & IN-FULL) */}
          <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-zinc-950 via-[#061424] to-[#04101c] border border-cyan-500/40 text-white shadow-xl shadow-cyan-950/20 flex flex-col justify-between group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                ÍNDICE INTEGRAL OTIF (STF)
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-950/90 text-cyan-300 border border-cyan-500/50">
                ESTÁNDAR DORADO
              </span>
            </div>

            {/* Gauge radial interactivo */}
            <div className="py-4 flex flex-col items-center justify-center relative">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-zinc-800"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="8"
                    strokeDasharray={2 * Math.PI * 40}
                    strokeDashoffset={2 * Math.PI * 40 * (1 - kpis.pctOtif / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(6,182,212,0.8)]"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black font-mono tracking-tight text-cyan-300">
                    {kpis.pctOtif}%
                  </span>
                  <span className="text-[9.5px] uppercase font-bold text-cyan-200/70 mt-0.5">
                    Aprobado + A Tiempo
                  </span>
                </div>
              </div>
            </div>

            {/* Explicación de impacto */}
            <div className="pt-3 border-t border-cyan-900/60 text-center space-y-1">
              <p className="text-[11px] text-zinc-300">
                <strong className="text-cyan-300 font-mono">{kpis.otifCount} colchas</strong> cumplieron la doble condición: <span className="text-emerald-400 font-semibold">100% conformes</span> y liberadas en <span className="text-cyan-300 font-semibold">≤ 3 días hábiles</span>.
              </p>
              <span className="text-[9.5px] text-zinc-400 block font-mono">
                Cero retraso en talleres de corte
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* 4. SECCIÓN: COBERTURA Y EMBUDO POR LAS 6 ETAPAS DE PRODUCCIÓN */}
      <div className="bg-white dark:bg-[#0c1017] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-sm space-y-5 text-zinc-950 dark:text-white transition-colors duration-200">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-500" />
              COBERTURA OPERATIVA POR FASES DE PRODUCCIÓN
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Distribución de volumen y metraje de colchas en las 6 etapas oficiales de trazabilidad.
            </p>
          </div>
          <div className="text-xs font-mono font-bold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-300/80 dark:border-zinc-800 self-start sm:self-auto">
            TOTAL EN CIRCUITO: <span className="text-zinc-950 dark:text-white font-black">{kpis.totalOps} OPs</span>
          </div>
        </div>

        {/* 6 Stage Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          
          {/* Fase 1: Pre-Solicitud */}
          <div className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 p-3.5 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
              <span>01. ATELIER ZF</span>
              <span className="font-mono text-zinc-700 dark:text-zinc-300">{kpis.fases.preSolicitud.pct}%</span>
            </div>
            <div className="text-2xl font-black font-mono text-zinc-950 dark:text-white">
              {kpis.fases.preSolicitud.count} <span className="text-[10px] font-normal text-zinc-500">OPs</span>
            </div>
            <div className="space-y-1 pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60 text-[10px] text-zinc-500 dark:text-zinc-400">
              <div className="flex justify-between font-mono">
                <span>Metros:</span>
                <span className="font-bold text-zinc-700 dark:text-zinc-300">{kpis.fases.preSolicitud.metros.toLocaleString()}m</span>
              </div>
              {kpis.fases.preSolicitud.retrasos > 0 && (
                <div className="flex justify-between text-rose-500 font-bold font-mono">
                  <span>Retrasos:</span>
                  <span>{kpis.fases.preSolicitud.retrasos}</span>
                </div>
              )}
            </div>
          </div>

          {/* Fase 2: Solicitado */}
          <div className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 p-3.5 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
              <span>02. SOLICITADO</span>
              <span className="font-mono text-zinc-700 dark:text-zinc-300">{kpis.fases.solicitado.pct}%</span>
            </div>
            <div className="text-2xl font-black font-mono text-zinc-950 dark:text-white">
              {kpis.fases.solicitado.count} <span className="text-[10px] font-normal text-zinc-500">OPs</span>
            </div>
            <div className="space-y-1 pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60 text-[10px] text-zinc-500 dark:text-zinc-400">
              <div className="flex justify-between font-mono">
                <span>Metros:</span>
                <span className="font-bold text-zinc-700 dark:text-zinc-300">{kpis.fases.solicitado.metros.toLocaleString()}m</span>
              </div>
              {kpis.fases.solicitado.retrasos > 0 && (
                <div className="flex justify-between text-rose-500 font-bold font-mono">
                  <span>Retrasos:</span>
                  <span>{kpis.fases.solicitado.retrasos}</span>
                </div>
              )}
            </div>
          </div>

          {/* Fase 3: Lavandería */}
          <div className="bg-zinc-50 dark:bg-zinc-900/60 border border-cyan-500/30 p-3.5 rounded-2xl space-y-2 shadow-xs">
            <div className="flex items-center justify-between text-[10px] font-bold text-cyan-600 dark:text-cyan-400">
              <span>03. COLFACTORY</span>
              <span className="font-mono text-cyan-700 dark:text-cyan-300">{kpis.fases.lavanderia.pct}%</span>
            </div>
            <div className="text-2xl font-black font-mono text-cyan-600 dark:text-cyan-400">
              {kpis.fases.lavanderia.count} <span className="text-[10px] font-normal text-zinc-500">OPs</span>
            </div>
            <div className="space-y-1 pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60 text-[10px] text-zinc-500 dark:text-zinc-400">
              <div className="flex justify-between font-mono">
                <span>Metros:</span>
                <span className="font-bold text-zinc-700 dark:text-zinc-300">{kpis.fases.lavanderia.metros.toLocaleString()}m</span>
              </div>
              {kpis.fases.lavanderia.retrasos > 0 && (
                <div className="flex justify-between text-rose-500 font-bold font-mono">
                  <span>Retrasos:</span>
                  <span>{kpis.fases.lavanderia.retrasos}</span>
                </div>
              )}
            </div>
          </div>

          {/* Fase 4: Calidad */}
          <div className="bg-zinc-50 dark:bg-zinc-900/60 border border-emerald-500/30 p-3.5 rounded-2xl space-y-2 shadow-xs">
            <div className="flex items-center justify-between text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              <span>04. LABORATORIO</span>
              <span className="font-mono text-emerald-700 dark:text-emerald-300">{kpis.fases.calidad.pct}%</span>
            </div>
            <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {kpis.fases.calidad.count} <span className="text-[10px] font-normal text-zinc-500">OPs</span>
            </div>
            <div className="space-y-1 pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60 text-[10px] text-zinc-500 dark:text-zinc-400">
              <div className="flex justify-between font-mono">
                <span>Metros:</span>
                <span className="font-bold text-zinc-700 dark:text-zinc-300">{kpis.fases.calidad.metros.toLocaleString()}m</span>
              </div>
              {kpis.fases.calidad.retrasos > 0 && (
                <div className="flex justify-between text-rose-500 font-bold font-mono">
                  <span>Retrasos:</span>
                  <span>{kpis.fases.calidad.retrasos}</span>
                </div>
              )}
            </div>
          </div>

          {/* Fase 5: Evaluado */}
          <div className="bg-zinc-50 dark:bg-zinc-900/60 border border-purple-500/30 p-3.5 rounded-2xl space-y-2 shadow-xs">
            <div className="flex items-center justify-between text-[10px] font-bold text-purple-600 dark:text-purple-400">
              <span>05. EVALUADO</span>
              <span className="font-mono text-purple-700 dark:text-purple-300">{kpis.fases.evaluado.pct}%</span>
            </div>
            <div className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400">
              {kpis.fases.evaluado.count} <span className="text-[10px] font-normal text-zinc-500">OPs</span>
            </div>
            <div className="space-y-1 pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60 text-[10px] text-zinc-500 dark:text-zinc-400">
              <div className="flex justify-between font-mono">
                <span>Metros:</span>
                <span className="font-bold text-zinc-700 dark:text-zinc-300">{kpis.fases.evaluado.metros.toLocaleString()}m</span>
              </div>
              {kpis.fases.evaluado.retrasos > 0 && (
                <div className="flex justify-between text-rose-500 font-bold font-mono">
                  <span>Retrasos:</span>
                  <span>{kpis.fases.evaluado.retrasos}</span>
                </div>
              )}
            </div>
          </div>

          {/* Fase 6: Finalizado */}
          <div className="bg-zinc-950 text-white dark:bg-zinc-900 border border-zinc-900 dark:border-zinc-700 p-3.5 rounded-2xl space-y-2 shadow-md">
            <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400">
              <span>06. LIBERADOS</span>
              <span className="font-mono text-emerald-400">{kpis.fases.finalizado.pct}%</span>
            </div>
            <div className="text-2xl font-black font-mono text-emerald-400">
              {kpis.fases.finalizado.count} <span className="text-[10px] font-normal text-zinc-400">OPs</span>
            </div>
            <div className="space-y-1 pt-1 border-t border-zinc-800 text-[10px] text-zinc-400">
              <div className="flex justify-between font-mono">
                <span>Metros:</span>
                <span className="font-bold text-white">{kpis.fases.finalizado.metros.toLocaleString()}m</span>
              </div>
              <div className="flex justify-between text-emerald-400 font-bold font-mono">
                <span>Evacuadas:</span>
                <span>{kpis.pctEvacuacion}%</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* 5. SECCIÓN: RADAR DE ACCIÓN INMEDIATA - OPS CON RETRASO EN RIESGO */}
      <div className="bg-white dark:bg-[#0c1017] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-sm space-y-4 text-zinc-950 dark:text-white transition-colors duration-200">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5 text-rose-500 animate-pulse" />
              RADAR DE OPs EN RIESGO (SUPERAN SLA MÁXIMO 3 DÍAS)
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Lotes activos en planta que impactan negativamente el indicador de cumplimiento. Requieren agilización prioritaria.
            </p>
          </div>
          <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40 self-start sm:self-auto">
            {opsEnRiesgo.length} OPs EN ALERTA
          </span>
        </div>

        {opsEnRiesgo.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">¡Cero Retrasos Detectados!</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Todas las colchas activas están operando dentro de los límites estándar de SLA.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 font-mono">
                  <th className="pb-2.5">OP / REF</th>
                  <th className="pb-2.5">TELA / COLOR</th>
                  <th className="pb-2.5">ESTADO ACTUAL</th>
                  <th className="pb-2.5">TIEMPO HÁBIL</th>
                  <th className="pb-2.5">EXCESO SLA</th>
                  <th className="pb-2.5 text-right">ACCIÓN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-medium">
                {opsEnRiesgo.slice(0, 8).map((opItem) => {
                  const exceso = Math.max(0, (opItem.diasHabiles || 0) - 3);
                  return (
                    <tr key={opItem.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                      <td className="py-2.5">
                        <span className="font-mono font-bold text-zinc-900 dark:text-white block">#{opItem.op}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">{opItem.referencia || 'SIN REF'}</span>
                      </td>
                      <td className="py-2.5">
                        <span className="font-bold text-zinc-800 dark:text-zinc-200 block">{opItem.tela}</span>
                        <span className="text-[10px] text-zinc-500">{opItem.color || 'ESTÁNDAR'}</span>
                      </td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300/80 dark:border-zinc-700">
                          {opItem.estado}
                        </span>
                      </td>
                      <td className="py-2.5 font-mono text-zinc-700 dark:text-zinc-300">
                        {opItem.diasHabiles} días hábiles
                      </td>
                      <td className="py-2.5 font-mono font-bold text-rose-600 dark:text-rose-400">
                        +{exceso} días de exceso
                      </td>
                      <td className="py-2.5 text-right">
                        {onViewDetail && (
                          <button
                            type="button"
                            onClick={() => onViewDetail(opItem)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Ver Ficha</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
};
