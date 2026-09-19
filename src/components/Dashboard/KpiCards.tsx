import React from 'react';
import { BarChart3, Zap, Clock, Send, Droplets, Microscope, CheckCircle2, ChevronRight } from 'lucide-react';
import { KpiMetrics, SectorType } from '../../types';

interface KpiCardsProps {
  metrics: KpiMetrics;
  onSelectArea?: (areaKey: SectorType | 'TOTAL' | 'EN_PROCESO') => void;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ metrics, onSelectArea }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
      
      {/* 1. Total Histórico */}
      <div
        onClick={() => onSelectArea && onSelectArea('TOTAL')}
        className="bg-white dark:bg-[#0c1017] hover:border-zinc-400 dark:hover:border-zinc-600 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_25px_rgba(255,255,255,0.05)] cursor-pointer transition-all duration-150 transform hover:-translate-y-0.5 group text-zinc-950 dark:text-white"
        title="Clic para ver todas las OPs"
      >
        <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 font-bold uppercase">
          <span>TOTAL</span>
          <BarChart3 className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <div>
            <span className="text-2xl font-black font-mono text-zinc-950 dark:text-white">{metrics.totalHistorico}</span>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium ml-1">OP</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-950 dark:group-hover:text-white transition" />
        </div>
      </div>

      {/* 2. Total en Proceso */}
      <div
        onClick={() => onSelectArea && onSelectArea('EN_PROCESO')}
        className="bg-white dark:bg-[#0c1017] hover:border-amber-400 dark:hover:border-amber-600 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_25px_rgba(255,255,255,0.05)] cursor-pointer transition-all duration-150 transform hover:-translate-y-0.5 group text-zinc-950 dark:text-white"
        title="Clic para ver OPs en proceso"
      >
        <div className="flex items-center justify-between text-[11px] text-amber-600 dark:text-amber-400 font-bold uppercase">
          <span>EN PROCESO</span>
          <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <div>
            <span className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">{metrics.totalEnProceso}</span>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium ml-1">OP</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-amber-500 transition" />
        </div>
      </div>

      {/* 3. Pre-Solicitud */}
      <div
        onClick={() => onSelectArea && onSelectArea('PRE_SOLICITUD')}
        className="bg-white dark:bg-[#0c1017] hover:border-cyan-400 dark:hover:border-cyan-600 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_25px_rgba(255,255,255,0.05)] cursor-pointer transition-all duration-150 transform hover:-translate-y-0.5 group text-zinc-950 dark:text-white"
        title="Clic para ver OPs en Pre-Solicitud"
      >
        <div className="flex items-center justify-between text-[11px] text-cyan-600 dark:text-cyan-400 font-bold uppercase">
          <span>PRE-SOLICITUD</span>
          <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-black font-mono text-cyan-600 dark:text-cyan-400">{metrics.preSolicitud}</span>
          <span className="text-[9px] bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-300 dark:border-cyan-800 font-bold font-mono">
            ZF ATELIER
          </span>
        </div>
      </div>

      {/* 4. Solicitados */}
      <div
        onClick={() => onSelectArea && onSelectArea('SOLICITADO')}
        className="bg-white dark:bg-[#0c1017] hover:border-amber-400 dark:hover:border-amber-600 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_25px_rgba(255,255,255,0.05)] cursor-pointer transition-all duration-150 transform hover:-translate-y-0.5 group text-zinc-950 dark:text-white"
        title="Clic para ver OPs Solicitadas (Despacho)"
      >
        <div className="flex items-center justify-between text-[11px] text-amber-600 dark:text-amber-400 font-bold uppercase">
          <span>SOLICITADOS</span>
          <Send className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">{metrics.solicitados}</span>
          <span className="text-[9px] bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-800 font-bold font-mono">
            DESPACHO
          </span>
        </div>
      </div>

      {/* 5. Lavandería */}
      <div
        onClick={() => onSelectArea && onSelectArea('LAVANDERIA')}
        className="bg-white dark:bg-[#0c1017] hover:border-sky-400 dark:hover:border-sky-600 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_25px_rgba(255,255,255,0.05)] cursor-pointer transition-all duration-150 transform hover:-translate-y-0.5 group text-zinc-950 dark:text-white"
        title="Clic para ver OPs en Lavandería"
      >
        <div className="flex items-center justify-between text-[11px] text-sky-600 dark:text-sky-400 font-bold uppercase">
          <span>LAVANDERÍA</span>
          <Droplets className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-black font-mono text-sky-600 dark:text-sky-400">{metrics.lavanderia}</span>
          <span className="text-[9px] bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 px-1.5 py-0.5 rounded border border-sky-300 dark:border-sky-800 font-bold font-mono">
            PLANTA
          </span>
        </div>
      </div>

      {/* 6. Calidad STF */}
      <div
        onClick={() => onSelectArea && onSelectArea('CALIDAD')}
        className="bg-white dark:bg-[#0c1017] hover:border-purple-400 dark:hover:border-purple-600 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_25px_rgba(255,255,255,0.05)] cursor-pointer transition-all duration-150 transform hover:-translate-y-0.5 group text-zinc-950 dark:text-white"
        title="Clic para ver OPs en Calidad STF"
      >
        <div className="flex items-center justify-between text-[11px] text-purple-600 dark:text-purple-400 font-bold uppercase">
          <span>CALIDAD STF</span>
          <Microscope className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400">{metrics.calidad}</span>
          <span className="text-[9px] bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 px-1.5 py-0.5 rounded border border-purple-300 dark:border-purple-800 font-bold font-mono">
            AUDITORÍA
          </span>
        </div>
      </div>

      {/* 7. Finalizados */}
      <div
        onClick={() => onSelectArea && onSelectArea('FINALIZADO')}
        className="bg-white dark:bg-[#0c1017] hover:border-emerald-400 dark:hover:border-emerald-600 border border-emerald-500/30 dark:border-emerald-500/40 rounded-2xl p-4 flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_25px_rgba(255,255,255,0.05)] cursor-pointer transition-all duration-150 transform hover:-translate-y-0.5 group text-zinc-950 dark:text-white"
        title="Clic para ver OPs Finalizadas"
      >
        <div className="flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">
          <span>FINALIZADOS</span>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">{metrics.finalizados}</span>
          <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-800 font-bold font-mono">
            LIBERADAS
          </span>
        </div>
      </div>

    </div>
  );
};
