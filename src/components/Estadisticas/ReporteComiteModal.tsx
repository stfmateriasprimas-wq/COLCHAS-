import React, { useState, useMemo } from 'react';
import { 
  FileText, X, Download, Calendar, Filter, Sparkles, 
  CheckCircle2, AlertOctagon, Activity, FileSpreadsheet,
  Layers, ChevronDown, Check, Clock, ShieldCheck, ArrowDownToLine
} from 'lucide-react';
import { SolicitudColcha, SectorType } from '../../types';
import { UsuarioSTF } from '../../services/authService';
import { 
  ComiteReportFilterOptions, 
  filterSolicitudesForComite, 
  calculateComiteMetrics,
  generateComitePdf,
  generateComiteExcel
} from '../../services/reporteComiteService';

interface ReporteComiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  solicitudes: SolicitudColcha[];
  currentUser?: UsuarioSTF | null;
}

export const ReporteComiteModal: React.FC<ReporteComiteModalProps> = ({
  isOpen,
  onClose,
  solicitudes,
  currentUser
}) => {
  // Filter state
  const [timeRange, setTimeRange] = useState<'7D' | '15D' | '30D' | 'CUSTOM' | 'ALL'>('7D');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [stageFilter, setStageFilter] = useState<'ALL' | SectorType>('ALL');
  const [dictamenFilter, setDictamenFilter] = useState<'ALL' | 'APROBADO' | 'APROBADO_EN_GAMA' | 'RECHAZADO' | 'EN_PROCESO'>('ALL');

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);

  // Filter options bundle
  const filterOptions: ComiteReportFilterOptions = useMemo(() => ({
    timeRange,
    startDate,
    endDate,
    stageFilter,
    dictamenFilter
  }), [timeRange, startDate, endDate, stageFilter, dictamenFilter]);

  // Filtered dataset
  const filteredOps = useMemo(() => {
    return filterSolicitudesForComite(solicitudes, filterOptions);
  }, [solicitudes, filterOptions]);

  // Live Metrics calculations
  const metrics = useMemo(() => {
    return calculateComiteMetrics(filteredOps);
  }, [filteredOps]);

  if (!isOpen) return null;

  const handleDownloadPdf = () => {
    setIsDownloadingPdf(true);
    try {
      generateComitePdf(filteredOps, currentUser);
    } catch (e) {
      console.error('Error generando PDF:', e);
      alert('Error generando el informe PDF. Por favor intente nuevamente.');
    } finally {
      setTimeout(() => setIsDownloadingPdf(false), 1500);
    }
  };

  const handleDownloadExcel = () => {
    setIsDownloadingExcel(true);
    try {
      generateComiteExcel(filteredOps, currentUser);
    } catch (e) {
      console.error('Error generando Excel:', e);
      alert('Error generando el reporte Excel.');
    } finally {
      setTimeout(() => setIsDownloadingExcel(false), 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 lg:p-6 animate-in fade-in duration-200 select-none font-sans text-zinc-900 dark:text-zinc-100">
      <div className="bg-white dark:bg-[#0c1017] border border-zinc-200 dark:border-zinc-800 rounded-[28px] sm:rounded-[36px] max-w-6xl xl:max-w-7xl w-full max-h-[95vh] flex flex-col shadow-2xl overflow-hidden transition-all duration-200">
        
        {/* 1. TOP HEADER MATCHING IMAGE 2 */}
        <div className="p-5 sm:p-6 border-b border-zinc-200 dark:border-zinc-800 bg-[#0c1322] text-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30 shrink-0">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[9.5px] font-mono font-black bg-cyan-950/80 text-cyan-300 border border-cyan-500/50 uppercase tracking-wider">
                  REPORTES OFICIALES STF
                </span>
                <span className="text-zinc-400 text-xs font-mono">
                  • Comité Semanal
                </span>
              </div>
              <h2 className="text-base sm:text-xl font-black tracking-tight text-white mt-0.5">
                Exportación de Reportes para Comité de Calidad
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. BODY CONTENT */}
        <div className="overflow-y-auto flex-1 custom-scroll p-5 sm:p-6 space-y-6 bg-zinc-50 dark:bg-[#080c14]">
          
          {/* SECTION 1: CONFIGURAR ALCANCE DEL REPORTE */}
          <div className="bg-white dark:bg-[#0f1420] border border-zinc-200 dark:border-zinc-800/80 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-indigo-500" />
                <h3 className="text-xs font-black uppercase font-mono tracking-wider text-zinc-800 dark:text-zinc-200">
                  CONFIGURAR ALCANCE DEL REPORTE
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400">
                <strong className="text-indigo-600 dark:text-indigo-400 font-black">{filteredOps.length} OPs</strong> seleccionadas
              </span>
            </div>

            {/* RANGO DE TIEMPO (PILLS) */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono font-bold uppercase text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                <span>RANGO DE TIEMPO</span>
              </label>

              <div className="flex items-center gap-2 overflow-x-auto custom-scroll pb-1">
                
                {/* 7D */}
                <button
                  type="button"
                  onClick={() => setTimeRange('7D')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                    timeRange === '7D'
                      ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-black shadow-md'
                      : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
                  }`}
                >
                  Semana Actual (7d)
                </button>

                {/* 15D */}
                <button
                  type="button"
                  onClick={() => setTimeRange('15D')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                    timeRange === '15D'
                      ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-black shadow-md'
                      : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
                  }`}
                >
                  Últimos 15 días
                </button>

                {/* 30D */}
                <button
                  type="button"
                  onClick={() => setTimeRange('30D')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                    timeRange === '30D'
                      ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-black shadow-md'
                      : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
                  }`}
                >
                  Mes Actual (30d)
                </button>

                {/* CUSTOM */}
                <button
                  type="button"
                  onClick={() => setTimeRange('CUSTOM')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                    timeRange === 'CUSTOM'
                      ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-black shadow-md'
                      : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
                  }`}
                >
                  Por Días (Calendario)
                </button>

                {/* ALL */}
                <button
                  type="button"
                  onClick={() => setTimeRange('ALL')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                    timeRange === 'ALL'
                      ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-black shadow-md'
                      : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
                  }`}
                >
                  Histórico Completo
                </button>

              </div>

              {/* Custom Date Pickers if CUSTOM is selected */}
              {timeRange === 'CUSTOM' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 animate-in fade-in">
                  <div>
                    <label className="text-[10.5px] font-mono text-zinc-500 block mb-1">Fecha Inicial:</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10.5px] font-mono text-zinc-500 block mb-1">Fecha Final:</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* DROPDOWNS: ETAPA / UBICACIÓN & DICTAMEN DE CALIDAD */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              
              {/* Dropdown 1: FILTRAR POR ETAPA / UBICACIÓN */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold uppercase text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-zinc-400" />
                  <span>FILTRAR POR ETAPA / UBICACIÓN</span>
                </label>
                
                <select
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value as any)}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-2xl px-4 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 font-bold focus:outline-none focus:border-indigo-500 transition cursor-pointer shadow-xs"
                >
                  <option value="ALL">Todas las áreas y ubicaciones</option>
                  <option value="PRE_SOLICITUD">PRE - SOLICITUD</option>
                  <option value="SOLICITADO">SOLICITADO</option>
                  <option value="LAVANDERIA">LAVANDERIA</option>
                  <option value="CALIDAD">CALIDAD</option>
                  <option value="EVALUADO">EVALUADO Y ENVIADO</option>
                  <option value="FINALIZADO">FINALIZADOS</option>
                </select>
              </div>

              {/* Dropdown 2: DICTAMEN DE CALIDAD (Image 4) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold uppercase text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
                  <span>DICTAMEN DE CALIDAD</span>
                </label>

                <select
                  value={dictamenFilter}
                  onChange={(e) => setDictamenFilter(e.target.value as any)}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-2xl px-4 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 font-bold focus:outline-none focus:border-indigo-500 transition cursor-pointer shadow-xs"
                >
                  <option value="ALL">Todos los dictámenes</option>
                  <option value="APROBADO">Solo Lotes Liberados / Aprobados</option>
                  <option value="APROBADO_EN_GAMA">Solo Lotes Aprobados en Gama</option>
                  <option value="RECHAZADO">Solo Lotes Rechazados / Observados</option>
                  <option value="EN_PROCESO">Solo Muestras En Proceso</option>
                </select>
              </div>

            </div>

          </div>

          {/* SECTION 2: EXECUTIVE KPI DASHBOARD (ESTILO CORPORATIVO INDUSTRIAL C-LEVEL) */}
          <div className="bg-white dark:bg-[#0f1420] border-2 border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-md space-y-6">
            
            {/* Header del Dashboard */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center font-black">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight text-zinc-950 dark:text-white uppercase">
                    STF QUALITY & COMPLIANCE KPI DASHBOARD
                  </h3>
                  <p className="text-xs text-zinc-500 font-mono">
                    Cuadro de Mando Integral • Trazabilidad y Control Textil en Tiempo Real
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="px-3 py-1 rounded-full text-[10px] font-mono font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/50">
                  ● {filteredOps.length} OPs SINCRONIZADAS
                </span>
              </div>
            </div>

            {/* 1. TOP ROW: 8 KPI METRIC BLOCKS (IDÉNTICO A LA REFERENCIA VISUAL) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
              {[
                { val: `${metrics.totalOps}`, label: 'TOTAL OPS', sub: `${metrics.totalRollos} rollos`, color: 'text-zinc-950 dark:text-white' },
                { val: `${metrics.aprobados}`, label: 'APROBADAS', sub: `${metrics.tasaAprobacion}% éxito`, color: 'text-emerald-600 dark:text-emerald-400' },
                { val: `${metrics.aprobadosEnGama}`, label: 'EN GAMA', sub: 'Tolerancia', color: 'text-teal-600 dark:text-teal-400' },
                { val: `${metrics.rechazados}`, label: 'RECHAZOS', sub: 'Con observación', color: 'text-rose-600 dark:text-rose-400' },
                { val: `${metrics.enProceso}`, label: 'EN PROCESO', sub: 'Circulando', color: 'text-amber-600 dark:text-amber-400' },
                { val: `${metrics.pctCumplimientoSla}%`, label: 'SLA ≤ 3 DÍAS', sub: `${metrics.opsATiempo} a tiempo`, color: 'text-blue-600 dark:text-blue-400' },
                { val: `${metrics.pctOtif}%`, label: 'ÍNDICE OTIF', sub: 'Confiabilidad', color: 'text-indigo-600 dark:text-indigo-400' },
                { val: `${metrics.leadTimePromedioDias}d`, label: 'LEAD TIME', sub: 'Promedio ciclo', color: 'text-cyan-600 dark:text-cyan-400' }
              ].map((card, idx) => (
                <div key={idx} className="bg-zinc-50/80 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-xs hover:border-zinc-400 transition">
                  <span className={`text-2xl lg:text-3xl font-black font-mono tracking-tight ${card.color}`}>
                    {card.val}
                  </span>
                  <span className="text-[10px] font-black uppercase text-zinc-700 dark:text-zinc-300 mt-0.5 tracking-tight">
                    {card.label}
                  </span>
                  <span className="text-[9px] font-mono text-zinc-400 mt-0.5">
                    {card.sub}
                  </span>
                </div>
              ))}
            </div>

            {/* 2. MIDDLE SECTION: 3 COLUMNS (CASES BY DUE DATE | RECENT ACTIVITIES | DONUT DISTRIBUCIÓN) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              
              {/* Columna Izquierda: OPs por Fecha Límite / SLA (4 cols) */}
              <div className="lg:col-span-5 bg-zinc-50/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2 mb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">
                    CASES BY DUE DATE / SLA MONITOR
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">Top OPs Activas</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] text-left">
                    <thead>
                      <tr className="text-[9.5px] font-mono uppercase text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                        <th className="py-1.5 font-bold">OP ID</th>
                        <th className="py-1.5 font-bold">FECHA REG.</th>
                        <th className="py-1.5 font-bold">ETAPA</th>
                        <th className="py-1.5 font-bold text-right">STATUS SLA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60 font-mono">
                      {filteredOps.slice(0, 6).map((opItem, i) => {
                        const isLate = opItem.tieneRetraso && opItem.estado !== 'FINALIZADO';
                        const isFin = opItem.estado === 'FINALIZADO';
                        return (
                          <tr key={i} className="hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50">
                            <td className="py-1.5 font-bold text-zinc-900 dark:text-white truncate max-w-[80px]">
                              {opItem.op}
                            </td>
                            <td className="py-1.5 text-zinc-500">
                              {(opItem.fechaCreacion || '').substring(0, 10)}
                            </td>
                            <td className="py-1.5 text-[10px] text-zinc-600 dark:text-zinc-300 truncate max-w-[90px]">
                              {opItem.estado}
                            </td>
                            <td className="py-1.5 text-right">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase inline-block ${
                                isFin 
                                  ? 'bg-emerald-500 text-black' 
                                  : (isLate ? 'bg-rose-500 text-white' : 'bg-amber-400 text-black')
                              }`}>
                                {isFin ? 'RELEASED' : (isLate ? 'LATE >3D' : 'ON TIME')}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Columna Central: Recent Activities / Bitácora Forense (3 cols) */}
              <div className="lg:col-span-3 bg-zinc-50/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2 mb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">
                    RECENT ACTIVITIES
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>

                <div className="space-y-2 text-[10.5px]">
                  <div className="flex items-start justify-between gap-2 border-b border-zinc-200/50 dark:border-zinc-800/50 pb-1.5">
                    <div>
                      <span className="font-bold text-zinc-900 dark:text-zinc-200 block">• Liberación Final Calidad</span>
                      <span className="text-zinc-400 font-mono text-[9px]">Lotes conformes aprobados</span>
                    </div>
                    <span className="text-[9px] font-mono text-emerald-500 font-bold shrink-0">{metrics.aprobados} OPs</span>
                  </div>

                  <div className="flex items-start justify-between gap-2 border-b border-zinc-200/50 dark:border-zinc-800/50 pb-1.5">
                    <div>
                      <span className="font-bold text-zinc-900 dark:text-zinc-200 block">• Auditoría en Laboratorio</span>
                      <span className="text-zinc-400 font-mono text-[9px]">Ensayos de encogimiento y tono</span>
                    </div>
                    <span className="text-[9px] font-mono text-purple-500 font-bold shrink-0">{metrics.distribucion.calidad.count} OPs</span>
                  </div>

                  <div className="flex items-start justify-between gap-2 border-b border-zinc-200/50 dark:border-zinc-800/50 pb-1.5">
                    <div>
                      <span className="font-bold text-zinc-900 dark:text-zinc-200 block">• Ciclo Lavandería Colfactory</span>
                      <span className="text-zinc-400 font-mono text-[9px]">Lavado industrial en planta</span>
                    </div>
                    <span className="text-[9px] font-mono text-sky-500 font-bold shrink-0">{metrics.distribucion.lavanderia.count} OPs</span>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-bold text-zinc-900 dark:text-zinc-200 block">• OPs en Espera Despacho</span>
                      <span className="text-zinc-400 font-mono text-[9px]">Tránsito hacia lavadero</span>
                    </div>
                    <span className="text-[9px] font-mono text-amber-500 font-bold shrink-0">{metrics.distribucion.solicitados.count} OPs</span>
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Gráfico Donut de Distribución por Auditores (4 cols) */}
              <div className="lg:col-span-4 bg-zinc-50/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2 mb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">
                    CASES PER AUDITOR / PERSON
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">Distribución</span>
                </div>

                <div className="flex items-center justify-around gap-2 py-1">
                  {/* Gráfico Donut SVG Dinámico */}
                  <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                    <svg viewBox="0 0 36 36" className="w-28 h-28 -rotate-90">
                      {/* Fondo */}
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                      {/* Stiven Maya ~50% */}
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#2563eb" strokeWidth="4.5" strokeDasharray="50 50" strokeDashoffset="0" />
                      {/* Wilmer Maya ~20% */}
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#0ea5e9" strokeWidth="4.5" strokeDasharray="20 80" strokeDashoffset="-50" />
                      {/* Calidad ZF ~14% */}
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10b981" strokeWidth="4.5" strokeDasharray="14 86" strokeDashoffset="-70" />
                      {/* Otros ~16% */}
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f59e0b" strokeWidth="4.5" strokeDasharray="16 84" strokeDashoffset="-84" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xs font-black font-mono text-zinc-900 dark:text-white">STF</span>
                      <span className="text-[8px] font-mono text-zinc-400">AUDIT</span>
                    </div>
                  </div>

                  {/* Leyenda de Auditores */}
                  <div className="space-y-1 text-[10px] font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-blue-600 shrink-0" />
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">Stiven Maya (50%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-sky-500 shrink-0" />
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">Wilmer Maya (20%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shrink-0" />
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">Calidad ZF (14%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 shrink-0" />
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">Otros (16%)</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* 3. BOTTOM SECTION: 2 COLUMNS (BAR CHART MENSUAL | MY TASKS DETALLE) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              
              {/* Gráfico de Barras Mensuales 2026 (5 cols) */}
              <div className="lg:col-span-5 bg-zinc-50/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2 mb-3">
                  <span className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">
                    CASES PER FILING DATE / MENSUAL 2026
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">Total: {filteredOps.length} OPs</span>
                </div>

                {/* Barras de los 12 meses */}
                <div className="h-36 flex items-end justify-between gap-1 pt-4 px-1">
                  {metrics.distribucionMensual.map((item, idx) => {
                    const maxVal = Math.max(...metrics.distribucionMensual.map(m => m.count), 1);
                    const heightPct = Math.round((item.count / maxVal) * 100);
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                        <span className="text-[8px] font-mono text-zinc-400 opacity-0 group-hover:opacity-100 transition">
                          {item.count}
                        </span>
                        <div 
                          className="w-full max-w-[18px] bg-gradient-to-t from-teal-600 to-teal-400 rounded-t transition-all group-hover:brightness-125"
                          style={{ height: `${Math.max(4, heightPct)}%` }}
                          title={`${item.mes}: ${item.count} OPs`}
                        />
                        <span className="text-[8px] font-mono text-zinc-500 uppercase mt-0.5">
                          {item.mes}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Detalle My Tasks / OPs Prioritarias (7 cols) */}
              <div className="lg:col-span-7 bg-zinc-50/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2 mb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">
                    MY TASKS / AUDITORÍA EN RIESGO ACTIVO
                  </span>
                  <span className="text-[10px] font-mono text-rose-500 font-bold">
                    {metrics.opsConRetraso} OPs con Alerta
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] text-left">
                    <thead>
                      <tr className="text-[9px] font-mono uppercase text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                        <th className="py-1.5 font-bold">OP</th>
                        <th className="py-1.5 font-bold">TELA</th>
                        <th className="py-1.5 font-bold">PRIORIDAD</th>
                        <th className="py-1.5 font-bold">STATUS</th>
                        <th className="py-1.5 font-bold">DÍAS</th>
                        <th className="py-1.5 font-bold text-right">DUE DATE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60 font-mono">
                      {(metrics.opsEnRiesgo.length > 0 ? metrics.opsEnRiesgo.slice(0, 5) : filteredOps.slice(0, 5)).map((item, i) => {
                        const isLate = item.tieneRetraso && item.estado !== 'FINALIZADO';
                        return (
                          <tr key={i} className="hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50">
                            <td className="py-1.5 font-bold text-zinc-900 dark:text-white">
                              {item.op}
                            </td>
                            <td className="py-1.5 text-zinc-600 dark:text-zinc-300 truncate max-w-[130px]">
                              {item.tela}
                            </td>
                            <td className="py-1.5">
                              <span className="text-[9px] px-1.5 py-0.5 rounded font-black bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                                {isLate ? 'HIGH' : 'NORMAL'}
                              </span>
                            </td>
                            <td className="py-1.5">
                              <span className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase ${
                                isLate ? 'bg-rose-500 text-white' : 'bg-amber-400 text-black'
                              }`}>
                                {isLate ? 'LATE' : 'PROGRESS'}
                              </span>
                            </td>
                            <td className="py-1.5 font-bold text-zinc-900 dark:text-white">
                              {item.diasHabiles || 1}d
                            </td>
                            <td className="py-1.5 text-right text-zinc-500">
                              {(item.fechaCreacion || '').substring(0, 10)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

          </div>

          {/* SECTION 3: MATRIZ DE DISTRIBUCIÓN OPERATIVA EN VIVO */}
          <div className="bg-white dark:bg-[#0f1420] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-500" />
                <h3 className="text-xs font-black uppercase font-mono tracking-wider text-zinc-800 dark:text-zinc-200">
                  DISTRIBUCIÓN REAL POR ETAPAS DEL SISTEMA (WIP & FLUJO)
                </h3>
              </div>
              <span className="text-[11px] font-mono font-bold text-zinc-500">
                Total acumulado: <strong className="text-zinc-900 dark:text-white font-mono">{metrics.totalMetros.toLocaleString()} metros</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
              {[
                { name: 'PRE - SOLICITUD', count: metrics.distribucion.preSolicitud.count, metros: metrics.distribucion.preSolicitud.metros, pct: metrics.distribucion.preSolicitud.pct, color: 'text-cyan-500', bar: 'bg-cyan-500' },
                { name: 'SOLICITADO', count: metrics.distribucion.solicitados.count, metros: metrics.distribucion.solicitados.metros, pct: metrics.distribucion.solicitados.pct, color: 'text-amber-500', bar: 'bg-amber-500' },
                { name: 'LAVANDERIA', count: metrics.distribucion.lavanderia.count, metros: metrics.distribucion.lavanderia.metros, pct: metrics.distribucion.lavanderia.pct, color: 'text-sky-500', bar: 'bg-sky-500' },
                { name: 'CALIDAD', count: metrics.distribucion.calidad.count, metros: metrics.distribucion.calidad.metros, pct: metrics.distribucion.calidad.pct, color: 'text-purple-500', bar: 'bg-purple-500' },
                { name: 'EVALUADO Y ENVIADO', count: metrics.distribucion.evaluado.count, metros: metrics.distribucion.evaluado.metros, pct: metrics.distribucion.evaluado.pct, color: 'text-teal-500', bar: 'bg-teal-500' },
                { name: 'FINALIZADOS', count: metrics.distribucion.finalizados.count, metros: metrics.distribucion.finalizados.metros, pct: metrics.distribucion.finalizados.pct, color: 'text-emerald-500', bar: 'bg-emerald-500' }
              ].map(stage => (
                <div key={stage.name} className="bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-3 flex flex-col justify-between">
                  <div>
                    <span className={`text-[9px] font-mono font-black ${stage.color} tracking-tight block truncate`} title={stage.name}>
                      {stage.name}
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-lg font-black font-mono text-zinc-950 dark:text-white">
                        {stage.count}
                      </span>
                      <span className="text-[9.5px] text-zinc-500 font-mono">OPs</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono block">
                      {stage.metros.toLocaleString()} m ({stage.pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-1 mt-2 overflow-hidden">
                    <div className={`${stage.bar} h-full rounded-full`} style={{ width: `${Math.min(100, stage.pct * 2)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 4: BOTONES DE DESCARGA (EXCEL & PDF) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            
            {/* CARD 1: REPORTE MATRIZ EXCEL */}
            <div className="bg-white dark:bg-[#0f1420] border-2 border-emerald-500/40 rounded-3xl p-5 flex flex-col justify-between space-y-4 shadow-sm hover:border-emerald-500 transition">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-zinc-900 dark:text-white">
                      Reporte Matriz Excel (.xlsx)
                    </h4>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-[10px]">
                      3 HOJAS ESTRUCTURADAS
                    </span>
                  </div>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Genera un libro de trabajo completo con Resumen de KPIs, Matriz completa de OPs con metrajes, y Bitácora oficial de Rechazos para auditorías.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadExcel}
                disabled={isDownloadingExcel}
                className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-black text-xs uppercase font-mono tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-600/30"
              >
                <ArrowDownToLine className="w-4 h-4" />
                <span>{isDownloadingExcel ? 'GENERANDO EXCEL...' : 'DESCARGAR MATRIZ EXCEL (1-CLIC)'}</span>
              </button>
            </div>

            {/* CARD 2: INFORME EJECUTIVO PDF */}
            <div className="bg-white dark:bg-[#0f1420] border-2 border-indigo-500/40 rounded-3xl p-5 flex flex-col justify-between space-y-4 shadow-sm hover:border-indigo-500 transition">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-zinc-900 dark:text-white">
                      Informe Ejecutivo PDF (.pdf)
                    </h4>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-[10px]">
                      FORMATO C-LEVEL OFICIAL
                    </span>
                  </div>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Documento estilizado listo para presentar e imprimir en la reunión semanal. Incluye membrete STF, tarjetas KPI, tablas por ubicación y detalle de OPs.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 hover:from-indigo-500 hover:to-blue-500 active:scale-98 text-white font-black text-xs uppercase font-mono tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-indigo-600/30"
              >
                <ArrowDownToLine className="w-4 h-4" />
                <span>{isDownloadingPdf ? 'GENERANDO PDF...' : 'DESCARGAR INFORME PDF (1-CLIC)'}</span>
              </button>
            </div>

          </div>

        </div>

        {/* 3. MODAL FOOTER */}
        <div className="p-4 sm:p-5 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c1017] flex items-center justify-between text-xs text-zinc-500 font-mono">
          <span>
            🏢 Sistema de Monitoreo de Lavandería STF & ZF
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-zinc-800 dark:hover:bg-zinc-700 font-black text-xs uppercase tracking-wider transition cursor-pointer shadow-md"
          >
            CERRAR VENTANA
          </button>
        </div>

      </div>
    </div>
  );
};
