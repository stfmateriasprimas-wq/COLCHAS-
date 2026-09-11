import React from 'react';
import { 
  PlusCircle, ClipboardList, MessageSquare, BarChart3, Zap, 
  Clock, Send, Droplets, Microscope, CheckCircle2, ChevronRight, Activity 
} from 'lucide-react';
import { TabType } from '../Navigation';
import { KpiMetrics, SectorType, SolicitudColcha } from '../../types';
import { UsuarioSTF, isLavanderiaUser } from '../../services/authService';

interface CleanLandingViewProps {
  metrics: KpiMetrics;
  solicitudes: SolicitudColcha[];
  currentUser?: UsuarioSTF | null;
  onNavigate: (tab: TabType) => void;
  onSelectArea: (areaKey: SectorType | 'TOTAL' | 'EN_PROCESO') => void;
  onOpenChat: () => void;
}

export const CleanLandingView: React.FC<CleanLandingViewProps> = ({
  metrics,
  solicitudes,
  currentUser,
  onNavigate,
  onSelectArea,
  onOpenChat
}) => {
  const isLavanderia = isLavanderiaUser(currentUser);

  // Real-time delay calculations
  const delaysPreSol = solicitudes.filter(s => s.estado === 'PRE_SOLICITUD' && s.tieneRetraso).length;
  const delaysSol = solicitudes.filter(s => s.estado === 'SOLICITADO' && s.tieneRetraso).length;
  const delaysLav = solicitudes.filter(s => s.estado === 'LAVANDERIA' && s.tieneRetraso).length;
  const delaysCal = solicitudes.filter(s => s.estado === 'CALIDAD' && s.tieneRetraso).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300 select-none pb-8">
      
      {/* 1. CENTRAL ACTION CARD (MAIN BUTTONS) */}
      <div className="flex justify-center pt-1 sm:pt-2">
        <div className="w-full max-w-[440px] bg-[#0c1017] dark:bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-2xl border border-zinc-800 dark:border-zinc-200 space-y-2.5 sm:space-y-3.5 transition-colors text-white dark:text-zinc-950">
          
          {/* BUTTON 1: + NUEVA SOLICITUD (OCULTO PARA PERFILES DE LAVANDERÍA) */}
          {!isLavanderia && (
            <button
              type="button"
              onClick={() => onNavigate('nueva-solicitud')}
              className="w-full bg-white text-zinc-950 hover:bg-zinc-200 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-800 active:scale-[0.99] py-3 sm:py-3.5 px-4 sm:px-6 rounded-2xl font-black uppercase text-xs sm:text-sm tracking-wider transition-all duration-150 flex items-center justify-center gap-2.5 cursor-pointer shadow-md"
            >
              <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5 text-current" />
              <span>NUEVA SOLICITUD</span>
            </button>
          )}

          {/* BUTTON 2: BANDEJA DE SOLICITUDES */}
          <button
            type="button"
            onClick={() => onNavigate('solicitudes')}
            className="w-full bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 border border-zinc-700 dark:border-zinc-300 py-3 sm:py-3.5 px-4 sm:px-6 rounded-2xl font-black uppercase text-xs sm:text-sm tracking-wider transition-all duration-150 flex items-center justify-center gap-2.5 cursor-pointer shadow-sm"
          >
            <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-300 dark:text-zinc-700" />
            <span>BANDEJA DE SOLICITUDES</span>
          </button>

          {/* BUTTON 3: CHAT STF TEAMS */}
          <button
            type="button"
            onClick={onOpenChat}
            className="w-full bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 border border-zinc-700 dark:border-zinc-300 py-3 sm:py-3.5 px-4 sm:px-6 rounded-2xl font-black uppercase text-xs sm:text-sm tracking-wider transition-all duration-150 flex items-center justify-center gap-2.5 cursor-pointer shadow-sm"
          >
            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-400 dark:text-zinc-600" />
            <span>CHAT STF TEAMS</span>
          </button>

        </div>
      </div>

      {/* 2. ROW OF 7 KPI CARDS IN REAL TIME */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 sm:gap-3">
        
        {/* 1. Total Histórico */}
        <div
          onClick={() => onSelectArea('TOTAL')}
          className="bg-[#0c1017] dark:bg-white border border-zinc-800 dark:border-zinc-200 hover:border-zinc-600 dark:hover:border-zinc-400 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between shadow-md cursor-pointer transition-all duration-150 transform hover:-translate-y-0.5 group text-white dark:text-zinc-950"
          title="Clic para ver todas las OPs"
        >
          <div className="flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500 font-bold uppercase">
            <span>TOTAL</span>
            <BarChart3 className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black font-mono text-white dark:text-zinc-950">{metrics.totalHistorico}</span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium ml-1">OP</span>
          </div>
          <span className="text-[9px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono mt-1 font-bold">HISTÓRICO</span>
        </div>

        {/* 2. Total en Proceso */}
        <div
          onClick={() => onSelectArea('EN_PROCESO')}
          className="bg-[#0c1017] dark:bg-white border border-zinc-800 dark:border-zinc-200 hover:border-amber-500 dark:hover:border-amber-500 rounded-2xl p-4 flex flex-col justify-between shadow-md cursor-pointer transition-all duration-150 transform hover:-translate-y-0.5 group text-white dark:text-zinc-950"
          title="Clic para ver OPs en proceso"
        >
          <div className="flex items-center justify-between text-[11px] text-amber-400 dark:text-amber-600 font-bold uppercase">
            <span>EN PROCESO</span>
            <Zap className="w-3.5 h-3.5 text-amber-400 dark:text-amber-600" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black font-mono text-white dark:text-zinc-950">{metrics.totalEnProceso}</span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium ml-1">OP</span>
          </div>
          <span className="text-[9px] text-amber-400 dark:text-amber-600 uppercase tracking-wider font-mono mt-1 font-bold">FLUJO ACTIVO</span>
        </div>

        {/* 3. Pre-Solicitud */}
        <div
          onClick={() => onSelectArea('PRE_SOLICITUD')}
          className="bg-[#0c1017] dark:bg-white border border-zinc-800 dark:border-zinc-200 hover:border-cyan-400 dark:hover:border-cyan-600 rounded-2xl p-4 flex flex-col justify-between shadow-md cursor-pointer transition-all duration-150 transform hover:-translate-y-0.5 group text-white dark:text-zinc-950"
          title="Clic para ver OPs en Pre-Solicitud"
        >
          <div className="flex items-center justify-between text-[11px] text-cyan-400 dark:text-cyan-600 font-bold uppercase">
            <span>PRE-SOLICITUD</span>
            <Clock className="w-3.5 h-3.5 text-cyan-400 dark:text-cyan-600" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-black font-mono text-white dark:text-zinc-950">{metrics.preSolicitud}</span>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium ml-1">OP</span>
            </div>
            {delaysPreSol > 0 ? (
              <span className="text-[9px] bg-rose-950 dark:bg-rose-100 text-rose-300 dark:text-rose-800 border border-rose-800 dark:border-rose-300 px-1.5 py-0.5 rounded font-mono font-bold">
                ⏳ {delaysPreSol} &gt;3D
              </span>
            ) : (
              <span className="text-[9px] bg-cyan-950/80 dark:bg-cyan-100 text-cyan-300 dark:text-cyan-800 px-1.5 py-0.5 rounded border border-cyan-800 dark:border-cyan-300 font-bold font-mono">
                ZF ATELIER
              </span>
            )}
          </div>
          <span className="text-[9px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono mt-1 font-bold">ZONA FRANCA</span>
        </div>

        {/* 4. Solicitados */}
        <div
          onClick={() => onSelectArea('SOLICITADO')}
          className="bg-[#0c1017] dark:bg-white border border-zinc-800 dark:border-zinc-200 hover:border-amber-400 dark:hover:border-amber-600 rounded-2xl p-4 flex flex-col justify-between shadow-md cursor-pointer transition-all duration-150 transform hover:-translate-y-0.5 group text-white dark:text-zinc-950"
          title="Clic para ver OPs Solicitadas"
        >
          <div className="flex items-center justify-between text-[11px] text-amber-400 dark:text-amber-600 font-bold uppercase">
            <span>SOLICITADOS</span>
            <Send className="w-3.5 h-3.5 text-amber-400 dark:text-amber-600" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-black font-mono text-white dark:text-zinc-950">{metrics.solicitados}</span>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium ml-1">OP</span>
            </div>
            {delaysSol > 0 ? (
              <span className="text-[9px] bg-rose-950 dark:bg-rose-100 text-rose-300 dark:text-rose-800 border border-rose-800 dark:border-rose-300 px-1.5 py-0.5 rounded font-mono font-bold">
                ⏳ {delaysSol} &gt;3D
              </span>
            ) : (
              <span className="text-[9px] bg-amber-950/80 dark:bg-amber-100 text-amber-300 dark:text-amber-800 px-1.5 py-0.5 rounded border border-amber-800 dark:border-amber-300 font-bold font-mono">
                DESPACHO
              </span>
            )}
          </div>
          <span className="text-[9px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono mt-1 font-bold">POR DESPACHAR</span>
        </div>

        {/* 5. Lavandería */}
        <div
          onClick={() => onSelectArea('LAVANDERIA')}
          className="bg-[#0c1017] dark:bg-white border border-zinc-800 dark:border-zinc-200 hover:border-sky-400 dark:hover:border-sky-600 rounded-2xl p-4 flex flex-col justify-between shadow-md cursor-pointer transition-all duration-150 transform hover:-translate-y-0.5 group text-white dark:text-zinc-950"
          title="Clic para ver OPs en Lavandería"
        >
          <div className="flex items-center justify-between text-[11px] text-sky-400 dark:text-sky-600 font-bold uppercase">
            <span>LAVANDERÍA</span>
            <Droplets className="w-3.5 h-3.5 text-sky-400 dark:text-sky-600" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-black font-mono text-white dark:text-zinc-950">{metrics.lavanderia}</span>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium ml-1">OP</span>
            </div>
            {delaysLav > 0 ? (
              <span className="text-[9px] bg-rose-950 dark:bg-rose-100 text-rose-300 dark:text-rose-800 border border-rose-800 dark:border-rose-300 px-1.5 py-0.5 rounded font-mono font-bold">
                ⏳ {delaysLav} &gt;3D
              </span>
            ) : (
              <span className="text-[9px] bg-sky-950/80 dark:bg-sky-100 text-sky-300 dark:text-sky-800 px-1.5 py-0.5 rounded border border-sky-800 dark:border-sky-300 font-bold font-mono">
                PLANTA
              </span>
            )}
          </div>
          <span className="text-[9px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono mt-1 font-bold">EN LAVADO</span>
        </div>

        {/* 6. Calidad */}
        <div
          onClick={() => onSelectArea('CALIDAD')}
          className="bg-[#0c1017] dark:bg-white border border-zinc-800 dark:border-zinc-200 hover:border-purple-400 dark:hover:border-purple-600 rounded-2xl p-4 flex flex-col justify-between shadow-md cursor-pointer transition-all duration-150 transform hover:-translate-y-0.5 group text-white dark:text-zinc-950"
          title="Clic para ver OPs en Calidad"
        >
          <div className="flex items-center justify-between text-[11px] text-purple-400 dark:text-purple-600 font-bold uppercase">
            <span>CALIDAD</span>
            <Microscope className="w-3.5 h-3.5 text-purple-400 dark:text-purple-600" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-black font-mono text-white dark:text-zinc-950">{metrics.calidad}</span>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium ml-1">OP</span>
            </div>
            {delaysCal > 0 ? (
              <span className="text-[9px] bg-rose-950 dark:bg-rose-100 text-rose-300 dark:text-rose-800 border border-rose-800 dark:border-rose-300 px-1.5 py-0.5 rounded font-mono font-bold">
                ⏳ {delaysCal} &gt;3D
              </span>
            ) : (
              <span className="text-[9px] bg-purple-950/80 dark:bg-purple-100 text-purple-300 dark:text-purple-800 px-1.5 py-0.5 rounded border border-purple-800 dark:border-purple-300 font-bold font-mono">
                LAB STF
              </span>
            )}
          </div>
          <span className="text-[9px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono mt-1 font-bold">EN AUDITORÍA</span>
        </div>

        {/* 7. Finalizados */}
        <div
          onClick={() => onSelectArea('FINALIZADO')}
          className="col-span-2 sm:col-span-1 bg-[#0c1017] dark:bg-white border border-emerald-500/50 dark:border-emerald-500/60 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between shadow-md cursor-pointer transition-all duration-150 transform hover:-translate-y-0.5 group text-white dark:text-zinc-950"
          title="Clic para ver OPs Finalizadas"
        >
          <div className="flex items-center justify-between text-[11px] text-emerald-400 dark:text-emerald-600 font-bold uppercase">
            <span>FINALIZADOS</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-2xl sm:text-3xl font-black font-mono text-white dark:text-zinc-950">{metrics.finalizados}</span>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium ml-1">OP</span>
            </div>
            <span className="text-[9px] bg-emerald-950/80 dark:bg-emerald-100 text-emerald-300 dark:text-emerald-800 border border-emerald-800 dark:border-emerald-300 px-1.5 py-0.5 rounded font-bold font-mono">
              LIBERADAS
            </span>
          </div>
          <span className="text-[9px] text-emerald-400 dark:text-emerald-600 uppercase tracking-wider font-mono mt-1 font-bold">CONFORME</span>
        </div>

      </div>

      {/* 3. SECTION: RENDIMIENTO Y TIEMPOS DE PROCESO POR ÁREA (TELEMETRÍA EN VIVO) */}
      <div className="bg-[#0c1017] dark:bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-2xl border border-zinc-800 dark:border-zinc-200 text-white dark:text-zinc-950 space-y-4 sm:space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 dark:border-zinc-200 pb-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 bg-zinc-900 dark:bg-zinc-100 rounded-2xl text-white dark:text-zinc-950">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black uppercase tracking-wide text-white dark:text-zinc-950">
                RENDIMIENTO Y TIEMPOS DE PROCESO POR ÁREA
              </h3>
              <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-0.5">
                Monitoreo de cumplimiento de SLA y tasa de aprobación de muestras por etapa
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-zinc-900 dark:bg-zinc-100 text-zinc-300 dark:text-zinc-700 border border-zinc-800 dark:border-zinc-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-subtle"></span>
            <span>TELEMETRÍA EN VIVO</span>
          </div>
        </div>

        {/* 4 Area Telemetry Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Pre-Solicitud */}
          <div className="bg-zinc-900/90 dark:bg-zinc-50 border border-zinc-800 dark:border-zinc-200 rounded-2xl p-4 space-y-3 text-white dark:text-zinc-950">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-950/80 dark:bg-cyan-100 text-cyan-300 dark:text-cyan-800">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white dark:text-zinc-950 block">Pre-Solicitud</span>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono block">ZF / ATELIER</span>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold bg-zinc-950 dark:bg-zinc-200 text-zinc-300 dark:text-zinc-700 px-2 py-0.5 rounded">
                SLA 48h
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-zinc-400 dark:text-zinc-500 uppercase text-[10px]">RENDIMIENTO</span>
                <span className="text-white dark:text-zinc-950 font-mono">92.8%</span>
              </div>
              <div className="w-full bg-zinc-950 dark:bg-zinc-200 rounded-full h-1.5 overflow-hidden">
                <div className="bg-cyan-400 h-full rounded-full" style={{ width: '92.8%' }}></div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono font-bold pt-1 border-t border-zinc-800 dark:border-zinc-200">
              <span className="text-emerald-400 dark:text-emerald-600">APR: 99.5%</span>
              <span className="text-rose-400 dark:text-rose-600">RECH: 0.5%</span>
            </div>
          </div>

          {/* Card 2: Solicitados */}
          <div className="bg-zinc-900/90 dark:bg-zinc-50 border border-zinc-800 dark:border-zinc-200 rounded-2xl p-4 space-y-3 text-white dark:text-zinc-950">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-950/80 dark:bg-amber-100 text-amber-300 dark:text-amber-800">
                  <Send className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white dark:text-zinc-950 block">Solicitados</span>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono block">DESPACHO</span>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold bg-zinc-950 dark:bg-zinc-200 text-zinc-300 dark:text-zinc-700 px-2 py-0.5 rounded">
                SLA 72h
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-zinc-400 dark:text-zinc-500 uppercase text-[10px]">RENDIMIENTO</span>
                <span className="text-white dark:text-zinc-950 font-mono">88.4%</span>
              </div>
              <div className="w-full bg-zinc-950 dark:bg-zinc-200 rounded-full h-1.5 overflow-hidden">
                <div className="bg-amber-400 h-full rounded-full" style={{ width: '88.4%' }}></div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono font-bold pt-1 border-t border-zinc-800 dark:border-zinc-200">
              <span className="text-emerald-400 dark:text-emerald-600">APR: 98.2%</span>
              <span className="text-rose-400 dark:text-rose-600">RECH: 1.8%</span>
            </div>
          </div>

          {/* Card 3: Lavandería */}
          <div className="bg-zinc-900/90 dark:bg-zinc-50 border border-zinc-800 dark:border-zinc-200 rounded-2xl p-4 space-y-3 text-white dark:text-zinc-950">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-sky-950/80 dark:bg-sky-100 text-sky-300 dark:text-sky-800">
                  <Droplets className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white dark:text-zinc-950 block">Lavandería</span>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono block">PLANTA</span>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold bg-zinc-950 dark:bg-zinc-200 text-zinc-300 dark:text-zinc-700 px-2 py-0.5 rounded">
                SLA 96h
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-zinc-400 dark:text-zinc-500 uppercase text-[10px]">RENDIMIENTO</span>
                <span className="text-white dark:text-zinc-950 font-mono">86.2%</span>
              </div>
              <div className="w-full bg-zinc-950 dark:bg-zinc-200 rounded-full h-1.5 overflow-hidden">
                <div className="bg-sky-400 h-full rounded-full" style={{ width: '86.2%' }}></div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono font-bold pt-1 border-t border-zinc-800 dark:border-zinc-200">
              <span className="text-emerald-400 dark:text-emerald-600">APR: 96.8%</span>
              <span className="text-rose-400 dark:text-rose-600">RECH: 3.2%</span>
            </div>
          </div>

          {/* Card 4: Calidad */}
          <div className="bg-zinc-900/90 dark:bg-zinc-50 border border-zinc-800 dark:border-zinc-200 rounded-2xl p-4 space-y-3 text-white dark:text-zinc-950">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-950/80 dark:bg-purple-100 text-purple-300 dark:text-purple-800">
                  <Microscope className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white dark:text-zinc-950 block">Calidad</span>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono block">LAB STF</span>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold bg-zinc-950 dark:bg-zinc-200 text-zinc-300 dark:text-zinc-700 px-2 py-0.5 rounded">
                SLA 24h
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-zinc-400 dark:text-zinc-500 uppercase text-[10px]">RENDIMIENTO</span>
                <span className="text-white dark:text-zinc-950 font-mono">95.0%</span>
              </div>
              <div className="w-full bg-zinc-950 dark:bg-zinc-200 rounded-full h-1.5 overflow-hidden">
                <div className="bg-purple-400 h-full rounded-full" style={{ width: '95%' }}></div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono font-bold pt-1 border-t border-zinc-800 dark:border-zinc-200">
              <span className="text-emerald-400 dark:text-emerald-600">APR: 97.4%</span>
              <span className="text-rose-400 dark:text-rose-600">RECH: 2.6%</span>
            </div>
          </div>

        </div>

      </div>

      {/* 4. FAST ACTION TILES TO REMAINING MODULES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Tile 1: Base de Datos Maestra */}
        <div
          onClick={() => onNavigate('base-datos')}
          className="bg-[#0c1017] dark:bg-white border border-zinc-800 dark:border-zinc-200 hover:border-zinc-600 dark:hover:border-zinc-400 p-4 sm:p-5 rounded-2xl shadow-md flex items-center justify-between cursor-pointer transition-all duration-150 transform hover:-translate-y-0.5 text-white dark:text-zinc-950"
        >
          <div>
            <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide block">REGISTRO MAESTRO</span>
            <h4 className="text-sm font-bold text-white dark:text-zinc-950 mt-0.5">Base de Datos Maestra</h4>
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 block mt-1">Historial completo y Google Sheets</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 flex items-center justify-center shrink-0">
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>

        {/* Tile 2: Alertas */}
        <div
          onClick={() => onNavigate('alertas')}
          className="bg-[#0c1017] dark:bg-white border border-zinc-800 dark:border-zinc-200 hover:border-zinc-600 dark:hover:border-zinc-400 p-4 sm:p-5 rounded-2xl shadow-md flex items-center justify-between cursor-pointer transition-all duration-150 transform hover:-translate-y-0.5 text-white dark:text-zinc-950"
        >
          <div>
            <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide block">GESTIÓN DE RIESGOS</span>
            <h4 className="text-sm font-bold text-white dark:text-zinc-950 mt-0.5">Alertas y Retrasos Críticos</h4>
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 block mt-1">Revisión de OPs fuera de SLA</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 flex items-center justify-center shrink-0">
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>

        {/* Tile 3: Línea de Tiempo */}
        <div
          onClick={() => onNavigate('timeline')}
          className="bg-[#0c1017] dark:bg-white border border-zinc-800 dark:border-zinc-200 hover:border-zinc-600 dark:hover:border-zinc-400 p-4 sm:p-5 rounded-2xl shadow-md flex items-center justify-between cursor-pointer transition-all duration-150 transform hover:-translate-y-0.5 text-white dark:text-zinc-950"
        >
          <div>
            <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide block">AUDITORÍA</span>
            <h4 className="text-sm font-bold text-white dark:text-zinc-950 mt-0.5">Línea del Tiempo OP</h4>
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 block mt-1">Evaluación de proceso por colcha</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 flex items-center justify-center shrink-0">
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>

        {/* Tile 4: Estadísticas */}
        <div
          onClick={() => onNavigate('estadisticas')}
          className="bg-[#0c1017] dark:bg-white border border-zinc-800 dark:border-zinc-200 hover:border-zinc-600 dark:hover:border-zinc-400 p-4 sm:p-5 rounded-2xl shadow-md flex items-center justify-between cursor-pointer transition-all duration-150 transform hover:-translate-y-0.5 text-white dark:text-zinc-950"
        >
          <div>
            <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide block">INTELIGENCIA DE DATOS</span>
            <h4 className="text-sm font-bold text-white dark:text-zinc-950 mt-0.5">Métricas y Estadísticas</h4>
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 block mt-1">Productividad, operarios y rendimiento</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 flex items-center justify-center shrink-0">
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>

      </div>

    </div>
  );
};
