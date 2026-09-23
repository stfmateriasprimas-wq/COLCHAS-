import React, { useState } from 'react';
import { 
  Search, Clock, Calendar, AlertTriangle, CheckCircle2, ChevronRight, 
  ExternalLink, User, Droplets, Microscope, Layers, Sparkles, Filter 
} from 'lucide-react';
import { SolicitudColcha, KpiMetrics } from '../../types';
import { SubNavTabs } from '../Navigation/SubNavTabs';
import { FloatingScrollPill } from '../Common/FloatingScrollPill';
import { TabType } from '../Navigation';
import { formatColombianDisplayDate } from '../../services/slaCalculator';

interface TimelineViewProps {
  solicitudes: SolicitudColcha[];
  metrics: KpiMetrics;
  onViewDetail: (solicitud: SolicitudColcha) => void;
  onNavigateTab: (tab: TabType) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  solicitudes,
  metrics,
  onViewDetail,
  onNavigateTab
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'TODAS' | 'RETRASO' | 'PROCESO' | 'FINALIZADAS'>('TODAS');
  
  // Default selected OP
  const [selectedOpId, setSelectedOpId] = useState<string>(() => {
    return solicitudes.length > 0 ? solicitudes[0].id : '';
  });

  const totalHistorico = solicitudes.length;
  const inRetrasoCount = solicitudes.filter(s => s.tieneRetraso && s.estado !== 'FINALIZADO').length;

  // Filter OP List on Left
  const filteredOps = solicitudes.filter(item => {
    if (filterMode === 'RETRASO' && (!item.tieneRetraso || item.estado === 'FINALIZADO')) return false;
    if (filterMode === 'PROCESO' && item.estado === 'FINALIZADO') return false;
    if (filterMode === 'FINALIZADAS' && item.estado !== 'FINALIZADO') return false;

    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      item.op.toLowerCase().includes(q) ||
      item.referencia.toLowerCase().includes(q) ||
      item.tela.toLowerCase().includes(q) ||
      item.inspector.toLowerCase().includes(q)
    );
  });

  const selectedOp = solicitudes.find(s => s.id === selectedOpId) || solicitudes[0] || null;

  return (
    <div className="space-y-6 animate-in fade-in duration-200 select-none pb-12 relative font-sans">
      
      {/* 1. SUB-NAVIGATION BAR */}
      <SubNavTabs
        activeTab="timeline"
        onSelectTab={onNavigateTab}
        totalHistorico={totalHistorico}
        alertCount={inRetrasoCount}
      />

      {/* 2. TOP BANNER: LÍNEA DE TIEMPO Y EVALUACIÓN DE PROCESOS */}
      <div className="bg-white dark:bg-[#0c1017] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_25px_rgba(255,255,255,0.05)] space-y-6 text-zinc-950 dark:text-white">
        
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full">
              CONTROL DE TIEMPOS OP • SLA 240H
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-950 dark:text-white brand-title">
            LÍNEA DE TIEMPO Y EVALUACIÓN DE PROCESOS
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Auditoría cronológica de estados, tiempos de permanencia en lavandería y cuellos de botella por OP.
          </p>
        </div>

        {/* 4 Top KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-zinc-50 dark:bg-zinc-900/90 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-0.5">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase">
              <span className="text-zinc-500 dark:text-zinc-400">TOTAL OPS</span>
              <Clock className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
            </div>
            <span className="text-3xl font-black text-zinc-950 dark:text-white font-mono">{totalHistorico}</span>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block font-mono">OPs registradas</span>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-900/90 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-0.5">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase">
              <span className="text-amber-600 dark:text-amber-400">LEAD TIME PROM.</span>
              <Clock className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-amber-600 dark:text-amber-400 font-mono">7.4</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-bold">Días</span>
            </div>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block font-mono">Creación a dictamen</span>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-900/90 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-0.5">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase">
              <span className="text-rose-600 dark:text-rose-400">EN RETRASO (&gt;3D)</span>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <span className="text-3xl font-black text-rose-600 dark:text-rose-400 font-mono">{inRetrasoCount}</span>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block font-mono">Atención prioritaria</span>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-900/90 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-0.5">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase">
              <span className="text-emerald-600 dark:text-emerald-400">SLA (3 DÍAS)</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">90%</span>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block font-mono">Procesadas a tiempo</span>
          </div>
        </div>

      </div>

      {/* 3. SPLIT VIEW: LEFT (OP SELECTOR LIST) & RIGHT (FULL TIMELINE AUDIT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: SELECCIONAR OP */}
        <div className="lg:col-span-4 bg-white dark:bg-[#0c1017] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_25px_rgba(255,255,255,0.05)] space-y-4 text-zinc-950 dark:text-white">
          
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-950 dark:text-white flex items-center gap-1.5 font-mono">
              <Filter className="w-3.5 h-3.5 text-zinc-400" />
              <span>SELECCIONAR OP ({filteredOps.length})</span>
            </h3>
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por OP, tela o referencia..."
              className="w-full bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-300 dark:border-zinc-800 rounded-2xl pl-9 pr-3 py-2.5 text-xs text-zinc-950 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-amber-500 transition"
            />
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3" />
          </div>

          {/* Filter Pills */}
          <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono font-bold select-none">
            <button
              type="button"
              onClick={() => setFilterMode('TODAS')}
              className={`py-1.5 px-2 rounded-xl transition cursor-pointer text-center ${
                filterMode === 'TODAS'
                  ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
              }`}
            >
              Todas ({totalHistorico})
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('RETRASO')}
              className={`py-1.5 px-2 rounded-xl transition cursor-pointer text-center ${
                filterMode === 'RETRASO'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-900 text-rose-600 dark:text-rose-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
              }`}
            >
              Retraso ({inRetrasoCount})
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('PROCESO')}
              className={`py-1.5 px-2 rounded-xl transition cursor-pointer text-center ${
                filterMode === 'PROCESO'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-900 text-amber-600 dark:text-amber-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
              }`}
            >
              En Proceso
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('FINALIZADAS')}
              className={`py-1.5 px-2 rounded-xl transition cursor-pointer text-center ${
                filterMode === 'FINALIZADAS'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
              }`}
            >
              Finalizadas
            </button>
          </div>

          {/* Scrollable OP Items List */}
          <div className="space-y-2.5 max-h-[620px] overflow-y-auto custom-scroll pr-1">
            {filteredOps.map((op) => {
              const isSelected = selectedOp?.id === op.id;

              return (
                <div
                  key={op.id}
                  onClick={() => setSelectedOpId(op.id)}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                    isSelected
                      ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border-zinc-950 dark:border-white shadow-md'
                      : 'bg-zinc-50 dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 text-zinc-900 dark:text-zinc-100'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className={`font-mono font-black text-xs ${isSelected ? 'text-white dark:text-zinc-950' : 'text-zinc-950 dark:text-white'}`}>
                      OP #{op.op}
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase font-mono ${
                      op.estado === 'FINALIZADO'
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        : op.estado === 'EVALUADO'
                        ? 'bg-teal-500/20 text-teal-600 dark:text-teal-400'
                        : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                    }`}>
                      {op.estado === 'EVALUADO' ? 'EVALUADO' : op.estado}
                    </span>
                  </div>

                  <div className="text-xs font-bold mt-1 truncate">
                    {op.tela} <span className="opacity-70">({op.color})</span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] opacity-70 mt-2 font-mono">
                    <span>📅 {new Date(op.fechaCreacion).toLocaleDateString()}</span>
                    <span>🧶 {op.rollos} rls</span>
                  </div>

                  <div className="text-[10.5px] font-bold mt-1 font-mono">
                    ⏱️ {op.diasHabiles}d ({op.horasEnProceso}h)
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* RIGHT COLUMN: SELECTED OP TIMELINE & PROCESS EVALUATION */}
        <div className="lg:col-span-8 space-y-6">
          
          {selectedOp ? (
            <>
              {/* Header Card of Selected OP */}
              <div className="bg-white dark:bg-[#0c1017] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_25px_rgba(255,255,255,0.05)] space-y-5 text-zinc-950 dark:text-white">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 px-3 py-1 rounded-xl font-black font-mono text-xs shadow-sm">
                        OP #{selectedOp.op}
                      </span>
                      <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 font-bold">
                        Ref: {selectedOp.referencia}
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-black text-zinc-950 dark:text-white font-mono">
                      {selectedOp.tela} <span className="text-zinc-500 dark:text-zinc-400">({selectedOp.color})</span>
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => onViewDetail(selectedOp)}
                    className="px-4 py-2 bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md self-start sm:self-auto"
                  >
                    <span>Ver Ficha Completa</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 4 Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-zinc-50 dark:bg-zinc-900/90 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-0.5 font-mono">
                    <span className="text-[9.5px] font-sans text-zinc-500 dark:text-zinc-400 font-bold block uppercase">1. CREACIÓN</span>
                    <span className="text-xs font-bold text-zinc-950 dark:text-white block">
                      {formatColombianDisplayDate(selectedOp.fechaCreacion)}
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate block">Por: {selectedOp.inspector}</span>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-900/90 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-0.5 font-mono">
                    <span className="text-[9.5px] font-sans text-zinc-500 dark:text-zinc-400 font-bold block uppercase">2. TIEMPO TOTAL</span>
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block">
                      {selectedOp.diasHabiles} Días
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block">~{selectedOp.horasEnProceso}h de jornada</span>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-900/90 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-0.5 font-mono">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold block uppercase">3. DÍAS DE RETRASO SLA</span>
                    <span className={`text-xs font-mono font-black block ${
                      selectedOp.tieneRetraso ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {selectedOp.tieneRetraso ? `+${selectedOp.diasHabiles - 3} Días Retraso` : 'A Tiempo (≤3d)'}
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">Cumple SLA de 3 días (24h hábiles)</span>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-900/90 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-0.5">
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block uppercase">ROLLOS PROCESADOS</span>
                    <span className="text-xs font-mono font-black text-zinc-950 dark:text-white block">
                      {selectedOp.rollos} Rollos
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">Estado: {selectedOp.estado}</span>
                  </div>
                </div>

              </div>

              {/* TIMELINE AUDIT CONTAINER */}
              <div className="bg-white dark:bg-[#0c1017] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_25px_rgba(255,255,255,0.05)] space-y-6 text-zinc-950 dark:text-white">
                
                {/* Header & Legend */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-black text-zinc-950 dark:text-white brand-title">
                        LÍNEA DE TIEMPO DE PROCESOS DE LA OP #{selectedOp.op}
                      </h3>
                      <span className="text-[10px] bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 px-2 py-0.5 rounded font-bold">
                        5 Etapas
                      </span>
                      <span className="text-[10px] bg-amber-500 text-black px-2.5 py-0.5 rounded font-black">
                        {selectedOp.rollos} Rollos Procesados
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                      Auditoría cronológica de creación, tiempo de permanencia por área y estado general de retrasos.
                    </p>
                  </div>

                  {/* Legend dots */}
                  <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Inicio</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Proceso</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Alerta</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Fin</span>
                  </div>
                </div>

                {/* 3 Metrics Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-zinc-50 dark:bg-zinc-900/90 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-0.5">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold block uppercase">1. FECHA Y HORA DE CREACIÓN</span>
                    <span className="text-xs font-mono font-black text-zinc-950 dark:text-white block">
                      {formatColombianDisplayDate(selectedOp.fechaCreacion)}
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">Creado por: {selectedOp.inspector}</span>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-900/90 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-0.5">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold block uppercase">2. ÁREAS RECORRIDAS</span>
                    <span className="text-xs font-mono font-black text-amber-600 dark:text-amber-400 block">6 Áreas de Producción</span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">Permanencia registrada por cada área</span>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-900/90 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-0.5">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold block uppercase">3. RETRASO / TIEMPO GENERAL</span>
                    <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400 block">
                      {selectedOp.diasHabiles} días hábiles ({selectedOp.horasEnProceso}h) (A Tiempo)
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">Evaluación general frente a SLA laboral</span>
                  </div>
                </div>

                {/* CHRONOLOGICAL EVENTS LIST (5 STAGES) */}
                <div className="space-y-4 pt-2">
                  
                  {/* Step 1: Atelier */}
                  <div className="bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-500/40 flex items-center justify-center text-xs">
                          ⏱️
                        </div>
                        <span className="text-xs font-black uppercase tracking-wide text-zinc-950 dark:text-white">
                          MUESTRA CREADA Y REGISTRADA EN ATELIER
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(selectedOp.fechaCreacion).toLocaleDateString()} 00:00:00
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] flex-wrap gap-2">
                      <span className="bg-amber-500 text-black px-2.5 py-0.5 rounded font-bold">
                        ● PERMANENCIA EN ÁREA: 15 minutos (Creación y empaque de muestra)
                      </span>
                      <span className="text-zinc-500 dark:text-zinc-400 font-mono text-[10px]">
                        (Duración acumulada: 15 min)
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 pt-1 border-t border-zinc-200 dark:border-zinc-800">
                      <div>ESTADO: <strong className="text-zinc-900 dark:text-zinc-100">NUEVO ➔ SOLICITADO</strong></div>
                      <div>👤 RESPONSABLE: <strong className="text-zinc-900 dark:text-zinc-100">{selectedOp.inspector}</strong></div>
                    </div>

                    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-700 dark:text-zinc-300">
                      "Muestra física registrada para monitoreo de lavado y encogimiento."
                    </div>
                  </div>

                  {/* Step 2: Despacho */}
                  <div className="bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-500/40 flex items-center justify-center text-xs">
                          📦
                        </div>
                        <span className="text-xs font-black uppercase tracking-wide text-zinc-950 dark:text-white">
                          DESPACHADO A LAVANDERÍA (SOLICITUD ACTIVA)
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(selectedOp.fechaCreacion).toLocaleDateString()} 00:15:00
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] flex-wrap gap-2">
                      <span className="bg-amber-500 text-black px-2.5 py-0.5 rounded font-bold">
                        ● PERMANENCIA EN ÁREA: 15 min antes del envío a Lavandería
                      </span>
                      <span className="text-zinc-500 dark:text-zinc-400 font-mono text-[10px]">
                        (Duración acumulada: 15 min)
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 pt-1 border-t border-zinc-200 dark:border-zinc-800">
                      <div>ESTADO: <strong className="text-zinc-900 dark:text-zinc-100">PRE-SOLICITUD ➔ SOLICITADO</strong></div>
                      <div>👤 RESPONSABLE: <strong className="text-zinc-900 dark:text-zinc-100">{selectedOp.inspector}</strong></div>
                    </div>

                    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-700 dark:text-zinc-300">
                      "Muestra lista para recepción e ingreso en tambores de lavandería ZF."
                    </div>
                  </div>

                  {/* Step 3: Lavandería Tambores */}
                  <div className="bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-300 dark:border-sky-500/40 flex items-center justify-center text-xs">
                          💧
                        </div>
                        <span className="text-xs font-black uppercase tracking-wide text-zinc-950 dark:text-white">
                          PASO A LAVANDERÍA (MÓDULO TAMBORES)
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        04/03/2026 08:45:00
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] flex-wrap gap-2">
                      <span className="bg-amber-500 text-black px-2.5 py-0.5 rounded font-bold">
                        ● PERMANENCIA EN ÁREA: 1 día hábil (7 horas hábiles) en lavadero
                      </span>
                      <span className="text-zinc-500 dark:text-zinc-400 font-mono text-[10px]">
                        (Duración acumulada: 1 día hábil (7h))
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 pt-1 border-t border-zinc-200 dark:border-zinc-800">
                      <div>ESTADO: <strong className="text-zinc-900 dark:text-zinc-100">SOLICITADO ➔ RECIBIDO LAVADERO</strong></div>
                      <div>👤 RESPONSABLE: <strong className="text-zinc-900 dark:text-zinc-100">COLFACTORY / Lavandero ZF</strong></div>
                    </div>

                    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-700 dark:text-zinc-300">
                      "Muestra recibida e ingresada al ciclo de lavado de prueba."
                    </div>
                  </div>

                  {/* Step 4: Calidad Inspección */}
                  <div className="bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-300 dark:border-purple-500/40 flex items-center justify-center text-xs">
                          🔬
                        </div>
                        <span className="text-xs font-black uppercase tracking-wide text-zinc-950 dark:text-white">
                          TRANSFERENCIA A LABORATORIO CALIDAD STF
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        05/03/2026 09:30:00
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] flex-wrap gap-2">
                      <span className="bg-amber-500 text-black px-2.5 py-0.5 rounded font-bold">
                        ● PERMANENCIA EN ÁREA: 1 día hábil (7 horas hábiles) en inspección de calidad
                      </span>
                      <span className="text-zinc-500 dark:text-zinc-400 font-mono text-[10px]">
                        (Duración acumulada: 2 días hábiles (1h))
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 pt-1 border-t border-zinc-200 dark:border-zinc-800">
                      <div>ESTADO: <strong className="text-zinc-900 dark:text-zinc-100">RECIBIDO LAVADERO ➔ ENVIADO A STF</strong></div>
                      <div>👤 RESPONSABLE: <strong className="text-zinc-900 dark:text-zinc-100">COLFACTORY / Encargado Lavado</strong></div>
                    </div>

                    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-700 dark:text-zinc-300">
                      "Muestra procesada y enviada a laboratorio para inspección física y tono."
                    </div>
                  </div>

                  {/* Step 5: Calidad a Factory (Evaluado y Enviado) */}
                  <div className="bg-zinc-50 dark:bg-zinc-900/80 border border-teal-400 dark:border-teal-500/50 rounded-2xl p-4.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-300 dark:border-teal-500/40 flex items-center justify-center text-xs">
                          📋
                        </div>
                        <span className="text-xs font-black uppercase tracking-wide text-teal-700 dark:text-teal-400">
                          MUESTRA EVALUADA Y ENVIADA A FACTORY (COLFACTORY)
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        06/03/2026 10:15:00
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] flex-wrap gap-2">
                      <span className="bg-teal-500 text-white px-2.5 py-0.5 rounded font-bold">
                        ● PERMANENCIA EN ÁREA: En espera de finalización exclusiva por Colfactory
                      </span>
                      <span className="text-zinc-500 dark:text-zinc-400 font-mono text-[10px]">
                        (Duración acumulada: 3 días hábiles)
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 pt-1 border-t border-zinc-200 dark:border-zinc-800">
                      <div>ESTADO: <strong className="text-zinc-900 dark:text-zinc-100">CALIDAD STF ➔ EVALUADO Y ENVIADO</strong></div>
                      <div>👤 RESPONSABLE: <strong className="text-zinc-900 dark:text-zinc-100">{selectedOp.inspector}</strong></div>
                    </div>

                    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-700 dark:text-zinc-300">
                      "Auditoría técnica completada con veredicto emitido. Enviada a Colfactory para cierre y liberación."
                    </div>
                  </div>

                  {/* Step 6: Cierre y Liberación Oficial Finalizado */}
                  <div className="bg-zinc-50 dark:bg-zinc-900/80 border border-emerald-400 dark:border-emerald-500/50 rounded-2xl p-4.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/40 flex items-center justify-center text-xs">
                          ✓
                        </div>
                        <span className="text-xs font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                          CIERRE OFICIAL Y LIBERACIÓN FINAL (COLFACTORY)
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        06/03/2026 10:30:00
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] flex-wrap gap-2">
                      <span className="bg-amber-500 text-black px-2.5 py-0.5 rounded font-bold">
                        ● PERMANENCIA EN ÁREA: Tiempo Total de Proceso: 3 días hábiles (4h 30m)
                      </span>
                      <span className="text-zinc-500 dark:text-zinc-400 font-mono text-[10px]">
                        (Duración acumulada: 3 días hábiles (4h 30m) total)
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 pt-1 border-t border-zinc-200 dark:border-zinc-800">
                      <div>ESTADO: <strong className="text-zinc-900 dark:text-zinc-100">EVALUADO Y ENVIADO ➔ FINALIZADO</strong></div>
                      <div>👤 RESPONSABLE: <strong className="text-zinc-900 dark:text-zinc-100">COLFACTORY / Lavandería ZF</strong></div>
                    </div>

                    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-700 dark:text-zinc-300">
                      "Orden liberada formalmente tras clic en Finalizar por el equipo de Factory."
                    </div>
                  </div>

                </div>

              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-[#0c1017] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-12 text-center text-zinc-500 dark:text-zinc-400 text-xs shadow-xl">
              Seleccione una OP en la lista izquierda para evaluar su línea de tiempo.
            </div>
          )}

        </div>

      </div>

      {/* 5. FLOATING QUICK SCROLL PILL */}
      <FloatingScrollPill totalOpsCount={totalHistorico} />

    </div>
  );
};
