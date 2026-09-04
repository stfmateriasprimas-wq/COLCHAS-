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
  const [dictamenFilter, setDictamenFilter] = useState<'ALL' | 'APROBADO' | 'RECHAZADO' | 'EN_PROCESO'>('ALL');

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
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200 select-none font-sans text-zinc-900 dark:text-zinc-100">
      <div className="bg-white dark:bg-[#0c1017] border border-zinc-200 dark:border-zinc-800 rounded-[32px] max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        
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
              
              {/* Dropdown 1: FILTRAR POR ETAPA / UBICACIÓN (Image 3) */}
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
                  <option value="PRE_SOLICITUD">Diseño ZF (Pre-Solicitud)</option>
                  <option value="SOLICITADO">Tránsito / Solicitado</option>
                  <option value="LAVANDERIA">Planta Lavandería ZF</option>
                  <option value="CALIDAD">Laboratorio Calidad STF</option>
                  <option value="FINALIZADO">Finalizados / Dictaminados</option>
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
                  <option value="RECHAZADO">Solo Lotes Rechazados / Observados</option>
                  <option value="EN_PROCESO">Solo Muestras En Proceso</option>
                </select>
              </div>

            </div>

          </div>

          {/* SECTION 2: MÉTRICAS CLAVE DEL INFORME (PREVIEW LIVE) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h3 className="text-xs font-black uppercase font-mono tracking-wider text-zinc-800 dark:text-zinc-200">
                MÉTRICAS CLAVE DEL INFORME (PREVIEW LIVE)
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              
              {/* Card 1: Total OPs */}
              <div className="bg-white dark:bg-[#0f1420] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xs">
                <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase block">
                  TOTAL OPS
                </span>
                <span className="text-2xl font-black font-mono text-zinc-950 dark:text-white mt-1 block">
                  {metrics.totalOps}
                </span>
                <span className="text-[10.5px] text-zinc-500 font-mono">
                  {metrics.totalMetros} m de tela
                </span>
              </div>

              {/* Card 2: Aprobadas / Liberadas */}
              <div className="bg-white dark:bg-[#0f1420] border-t-4 border-t-emerald-500 border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xs">
                <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase block">
                  APROBADAS / LIBERADAS
                </span>
                <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">
                  {metrics.aprobados}
                </span>
                <span className="text-[10.5px] text-zinc-500 font-mono">
                  {metrics.aprobados > 0 ? `${metrics.tasaAprobacion}%` : 'N/A'}
                </span>
              </div>

              {/* Card 3: Rechazadas / Alertas */}
              <div className="bg-white dark:bg-[#0f1420] border-t-4 border-t-rose-500 border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xs">
                <span className="text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400 uppercase block">
                  RECHAZADAS / ALERTAS
                </span>
                <span className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400 mt-1 block">
                  {metrics.rechazados}
                </span>
                <span className="text-[10.5px] text-zinc-500 font-mono">
                  Observación registrada
                </span>
              </div>

              {/* Card 4: Muestras en Flujo */}
              <div className="bg-white dark:bg-[#0f1420] border-t-4 border-t-blue-500 border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xs">
                <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 uppercase block">
                  MUESTRAS EN FLUJO
                </span>
                <span className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400 mt-1 block">
                  {metrics.enProceso}
                </span>
                <span className="text-[10.5px] text-zinc-500 font-mono">
                  En planta / tránsito
                </span>
              </div>

            </div>
          </div>

          {/* SECTION 3: BOTONES DE DESCARGA (EXCEL & PDF) */}
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
