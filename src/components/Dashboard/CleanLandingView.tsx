import React from 'react';
import { 
  PlusCircle, ClipboardList, BarChart3, Zap, 
  Clock, Send, Droplets, Microscope, CheckCircle2, ChevronRight, Activity, ShieldCheck, ClipboardCheck 
} from 'lucide-react';
import { TabType } from '../Navigation';
import { KpiMetrics, SectorType, SolicitudColcha } from '../../types';
import { UsuarioSTF, isLavanderiaUser, isSoporteUser } from '../../services/authService';

interface CleanLandingViewProps {
  metrics: KpiMetrics;
  solicitudes: SolicitudColcha[];
  currentUser?: UsuarioSTF | null;
  onNavigate: (tab: TabType) => void;
  onSelectArea: (areaKey: SectorType | 'TOTAL' | 'EN_PROCESO') => void;
}

export const CleanLandingView: React.FC<CleanLandingViewProps> = ({
  metrics,
  solicitudes,
  currentUser,
  onNavigate,
  onSelectArea
}) => {
  const isLavanderia = isLavanderiaUser(currentUser);

  // Real-time delay calculations
  const delaysPreSol = solicitudes.filter(s => s.estado === 'PRE_SOLICITUD' && s.tieneRetraso).length;
  const delaysSol = solicitudes.filter(s => s.estado === 'SOLICITADO' && s.tieneRetraso).length;
  const delaysLav = solicitudes.filter(s => s.estado === 'LAVANDERIA' && s.tieneRetraso).length;
  const delaysCal = solicitudes.filter(s => s.estado === 'CALIDAD' && s.tieneRetraso).length;
  const delaysEval = solicitudes.filter(s => s.estado === 'EVALUADO' && s.tieneRetraso).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300 select-none pb-8">
      
      {/* 1. CENTRAL ACTION CARD (MAIN BUTTONS) */}
      <div className="flex justify-center pt-1 sm:pt-2">
        <div className="w-full max-w-[440px] bg-white border border-zinc-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-[0_10px_30px_rgba(0,0,0,0.08)] space-y-2.5 sm:space-y-3.5 transition-colors text-zinc-950 dark:bg-[#0c1017] dark:border-zinc-800 dark:text-white dark:shadow-[0_4px_25px_rgba(255,255,255,0.06)]">
          
          {/* BUTTON 1: + NUEVA SOLICITUD (OCULTO PARA PERFILES DE LAVANDERÍA) */}
          {!isLavanderia && (
            <button
              type="button"
              onClick={() => onNavigate('nueva-solicitud')}
              className="w-full bg-zinc-950 text-white hover:bg-zinc-800 active:scale-[0.99] py-3 sm:py-3.5 px-4 sm:px-6 rounded-2xl font-black uppercase text-xs sm:text-sm tracking-wider transition-all duration-150 flex items-center justify-center gap-2.5 cursor-pointer shadow-md dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5 text-current" />
              <span>NUEVA SOLICITUD</span>
            </button>
          )}

          {/* BUTTON 2: BANDEJA DE SOLICITUDES */}
          <button
            type="button"
            onClick={() => onNavigate('solicitudes')}
            className="w-full bg-zinc-100 hover:bg-zinc-200/80 text-zinc-900 border border-zinc-300/80 py-3 sm:py-3.5 px-4 sm:px-6 rounded-2xl font-black uppercase text-xs sm:text-sm tracking-wider transition-all duration-150 flex items-center justify-center gap-2.5 cursor-pointer shadow-sm dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-white dark:border-zinc-700"
          >
            <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-700 dark:text-zinc-300" />
            <span>BANDEJA DE SOLICITUDES</span>
          </button>

          {/* BUTTON 3: EXCLUSIVO SOPORTE TÉCNICO - AUDITORÍA & HISTORIAL */}
          {isSoporteUser(currentUser) && (
            <button
              type="button"
              onClick={() => onNavigate('soporte-auditoria')}
              className="w-full bg-gradient-to-r from-[#021f33] via-[#053d61] to-[#021f33] hover:from-[#032d4a] hover:to-[#032d4a] text-cyan-300 border-2 border-cyan-400 py-3 sm:py-3.5 px-4 sm:px-6 rounded-2xl font-black uppercase text-xs sm:text-sm tracking-wider transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.35)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] active:scale-[0.99] group"
            >
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 animate-pulse" />
              <span>AUDITORÍA & HISTORIAL (EXCLUSIVO)</span>
            </button>
          )}

        </div>
      </div>

      {/* 2. ROW OF 8 KPI CARDS IN REAL TIME */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3">
        
        {/* 1. Total Histórico */}
        <div
          onClick={() => onSelectArea('TOTAL')}
          className="bg-white border border-zinc-200/90 hover:border-zinc-400 dark:bg-[#0c1017] dark:border-zinc-800 dark:hover:border-zinc-500 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_20px_rgba(255,255,255,0.05)] hover:dark:shadow-[0_8px_25px_rgba(255,255,255,0.08)] cursor-pointer transition-all duration-150 transform hover:-translate-y-0.5 group text-zinc-950 dark:text-white"
          title="Clic para ver todas las OPs"
        >
          <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 font-bold uppercase">
            <span>TOTAL</span>
            <BarChart3 className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black font-mono text-zinc-950 dark:text-white">{metrics.totalHistorico}</span>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium ml-1">OP</span>
          </div>
          <span className="text-[9px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-mono mt-1 font-bold">HISTÓRICO</span>
        </div>

        {/* 2. Total en Proceso */}
        <div
          onClick={() => onSelectArea('EN_PROCESO')}
          className="bg-white border border-zinc-200/90 hover:border-amber-500 dark:bg-[#0c1017] dark:border-zinc-800 dark:hover:border-amber-400 rounded-2xl p-4 flex flex-col justify-between shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_20px_rgba(255,255,255,0.05)] hover:dark:shadow-[0_8px_25px_rgba(255,255,255,0.08)] cursor-pointer transition-all duration-150 transform hover:-translate-y-0.5 group text-zinc-950 dark:text-white"
          title="Clic para ver OPs en proceso"
        >
          <div className="flex items-center justify-between text-[11px] text-amber-600 dark:text-amber-400 font-bold uppercase">
            <span>EN PROCESO</span>
            <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black font-mono text-zinc-950 dark:text-white">{metrics.totalEnProceso}</span>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium ml-1">OP</span>
          </div>
          <span className="text-[9px] text-amber-600 dark:text-amber-400 uppercase tracking-wider font-mono mt-1 font-bold">FLUJO ACTIVO</span>
        </div>

        {/* 3. Pre-Solicitud */}
        <div
          onClick={() => onSelectArea('PRE_SOLICITUD')}
          className="bg-white border border-zinc-200/90 hover:border-cyan-500 dark:bg-[#0c1017] dark:border-zinc-800 dark:hover:border-cyan-400 rounded-2xl p-4 flex flex-col justify-between shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_20px_rgba(255,255,255,0.05)] hover:dark:shadow-[0_8px_25px_rgba(255,255,255,0.08)] cursor-pointer transition-all duration-150 transform hover:-translate-y-0.5 group text-zinc-950 dark:text-white"
          title="Clic para ver OPs en Pre-Solicitud"
        >
          <div className="flex items-center justify-between text-[11px] text-cyan-600 dark:text-cyan-400 font-bold uppercase">
            <span>PRE-SOLICITUD</span>
            <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-black font-mono text-zinc-950 dark:text-white">{metrics.preSolicitud}</span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium ml-1">OP</span>
            </div>
            {delaysPreSol > 0 ? (
              <span className="text-[9px] bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800 px-1.5 py-0.5 rounded font-mono font-bold">
                ⏳ {delaysPreSol} &gt;3D
              </span>
            ) : (
              <span className="text-[9px] bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-950/80 dark:text-cyan-300 dark:border-cyan-800 px-1.5 py-0.5 rounded font-bold font-mono">
                ZF ATELIER
              </span>
            )}
          </div>
          <span className="text-[9px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-mono mt-1 font-bold">ZONA FRANCA</span>
        </div>

        {/* 4. Solicitados */}
        <div
          onClick={() => onSelectArea('SOLICITADO')}
          className="bg-white border border-zinc-200/90 hover:border-amber-500 dark:bg-[#0c1017] dark:border-zinc-800 dark:hover:border-amber-400 rounded-2xl p-4 flex flex-col justify-between shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_20px_rgba(255,255,255,0.05)] hover:dark:shadow-[0_8px_25px_rgba(255,255,255,0.08)] cursor-pointer transition-all duration-150 transform hover:-translate-y-0.5 group text-zinc-950 dark:text-white"
          title="Clic para ver OPs Solicitadas"
        >
          <div className="flex items-center justify-between text-[11px] text-amber-600 dark:text-amber-400 font-bold uppercase">
            <span>SOLICITADOS</span>
            <Send className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-black font-mono text-zinc-950 dark:text-white">{metrics.solicitados}</span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium ml-1">OP</span>
            </div>
            {delaysSol > 0 ? (
              <span className="text-[9px] bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800 px-1.5 py-0.5 rounded font-mono font-bold">
                ⏳ {delaysSol} &gt;3D
              </span>
            ) : (
              <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800 px-1.5 py-0.5 rounded font-bold font-mono">
                DESPACHO
              </span>
            )}
          </div>
          <span className="text-[9px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-mono mt-1 font-bold">POR DESPACHAR</span>
        </div>

        {/* 5. Lavandería */}
        <div
          onClick={() => onSelectArea('LAVANDERIA')}
          className="bg-white border border-zinc-200/90 hover:border-sky-500 dark:bg-[#0c1017] dark:border-zinc-800 dark:hover:border-sky-400 rounded-2xl p-4 flex flex-col justify-between shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_20px_rgba(255,255,255,0.05)] hover:dark:shadow-[0_8px_25px_rgba(255,255,255,0.08)] cursor-pointer transition-all duration-150 transform hover:-translate-y-0.5 group text-zinc-950 dark:text-white"
          title="Clic para ver OPs en Lavandería"
        >
          <div className="flex items-center justify-between text-[11px] text-sky-600 dark:text-sky-400 font-bold uppercase">
            <span>LAVANDERÍA</span>
            <Droplets className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-black font-mono text-zinc-950 dark:text-white">{metrics.lavanderia}</span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium ml-1">OP</span>
            </div>
            {delaysLav > 0 ? (
              <span className="text-[9px] bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800 px-1.5 py-0.5 rounded font-mono font-bold">
                ⏳ {delaysLav} &gt;3D
              </span>
            ) : (
              <span className="text-[9px] bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/80 dark:text-sky-300 dark:border-sky-800 px-1.5 py-0.5 rounded font-bold font-mono">
                PLANTA
              </span>
            )}
          </div>
          <span className="text-[9px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-mono mt-1 font-bold">EN LAVADO</span>
        </div>

        {/* 6. Calidad */}
        <div
          onClick={() => onSelectArea('CALIDAD')}
          className="bg-white border border-zinc-200/90 hover:border-purple-500 dark:bg-[#0c1017] dark:border-zinc-800 dark:hover:border-purple-400 rounded-2xl p-4 flex flex-col justify-between shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_20px_rgba(255,255,255,0.05)] hover:dark:shadow-[0_8px_25px_rgba(255,255,255,0.08)] cursor-pointer transition-all duration-150 transform hover:-translate-y-0.5 group text-zinc-950 dark:text-white"
          title="Clic para ver OPs en Calidad"
        >
          <div className="flex items-center justify-between text-[11px] text-purple-600 dark:text-purple-400 font-bold uppercase">
            <span>CALIDAD</span>
            <Microscope className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-black font-mono text-zinc-950 dark:text-white">{metrics.calidad}</span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium ml-1">OP</span>
            </div>
            {delaysCal > 0 ? (
              <span className="text-[9px] bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800 px-1.5 py-0.5 rounded font-mono font-bold">
                ⏳ {delaysCal} &gt;3D
              </span>
            ) : (
              <span className="text-[9px] bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-800 px-1.5 py-0.5 rounded border font-bold font-mono">
                LAB STF
              </span>
            )}
          </div>
          <span className="text-[9px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-mono mt-1 font-bold">EN AUDITORÍA</span>
        </div>

        {/* 7. Evaluado y Enviado */}
        <div
          onClick={() => onSelectArea('EVALUADO')}
          className="bg-white border border-zinc-200/90 hover:border-teal-500 dark:bg-[#0c1017] dark:border-zinc-800 dark:hover:border-teal-400 rounded-2xl p-4 flex flex-col justify-between shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_20px_rgba(255,255,255,0.05)] hover:dark:shadow-[0_8px_25px_rgba(255,255,255,0.08)] cursor-pointer transition-all duration-150 transform hover:-translate-y-0.5 group text-zinc-950 dark:text-white"
          title="Clic para ver OPs Evaluadas (Espera Colfactory)"
        >
          <div className="flex items-center justify-between text-[11px] text-teal-600 dark:text-teal-400 font-bold uppercase">
            <span>EVALUADO</span>
            <ClipboardCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-black font-mono text-zinc-950 dark:text-white">{metrics.evaluado || 0}</span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium ml-1">OP</span>
            </div>
            {delaysEval > 0 ? (
              <span className="text-[9px] bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800 px-1.5 py-0.5 rounded font-mono font-bold">
                ⏳ {delaysEval} &gt;3D
              </span>
            ) : (
              <span className="text-[9px] bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950/80 dark:text-teal-300 dark:border-teal-800 px-1.5 py-0.5 rounded border font-bold font-mono">
                FACTORY
              </span>
            )}
          </div>
          <span className="text-[9px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-mono mt-1 font-bold">ESPERA FACTORY</span>
        </div>

        {/* 8. Finalizados */}
        <div
          onClick={() => onSelectArea('FINALIZADO')}
          className="bg-white border border-emerald-500/50 hover:border-emerald-600 dark:bg-[#0c1017] dark:border-emerald-500/60 dark:hover:border-emerald-400 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_20px_rgba(255,255,255,0.05)] hover:dark:shadow-[0_8px_25px_rgba(255,255,255,0.08)] cursor-pointer transition-all duration-150 transform hover:-translate-y-0.5 group text-zinc-950 dark:text-white"
          title="Clic para ver OPs Finalizadas"
        >
          <div className="flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">
            <span>FINALIZADOS</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-2xl sm:text-3xl font-black font-mono text-zinc-950 dark:text-white">{metrics.finalizados}</span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium ml-1">OP</span>
            </div>
            <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800 px-1.5 py-0.5 rounded font-bold font-mono">
              LIBERADAS
            </span>
          </div>
          <span className="text-[9px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-mono mt-1 font-bold">CONFORME</span>
        </div>

      </div>

      {/* 3. SECTION: RENDIMIENTO Y TIEMPOS DE PROCESO POR ÁREA (TELEMETRÍA EN VIVO) */}
      <div className="bg-white border border-zinc-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-[0_10px_30px_rgba(0,0,0,0.07)] text-zinc-950 space-y-4 sm:space-y-6 dark:bg-[#0c1017] dark:border-zinc-800 dark:text-white dark:shadow-[0_4px_25px_rgba(255,255,255,0.06)]">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 bg-zinc-100 text-zinc-900 rounded-2xl dark:bg-zinc-900 dark:text-white">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black uppercase tracking-wide text-zinc-950 dark:text-white">
                RENDIMIENTO Y TIEMPOS DE PROCESO POR ÁREA
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Monitoreo de cumplimiento de SLA y tasa de aprobación de muestras por etapa
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse-subtle"></span>
            <span>TELEMETRÍA EN VIVO</span>
          </div>
        </div>

        {/* 4 Area Telemetry Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Pre-Solicitud */}
          <div className="bg-zinc-50/70 border border-zinc-200/80 rounded-2xl p-4 space-y-3 text-zinc-950 shadow-sm dark:bg-zinc-900/80 dark:border-zinc-800 dark:text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-100 text-cyan-800 dark:bg-cyan-950/80 dark:text-cyan-300">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-zinc-950 dark:text-white block">Pre-Solicitud</span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono block">ZF / ATELIER</span>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold bg-zinc-200/80 text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 px-2 py-0.5 rounded">
                SLA 48h
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-zinc-500 dark:text-zinc-400 uppercase text-[10px]">RENDIMIENTO</span>
                <span className="text-zinc-950 dark:text-white font-mono">92.8%</span>
              </div>
              <div className="w-full bg-zinc-200 dark:bg-zinc-950 rounded-full h-1.5 overflow-hidden">
                <div className="bg-cyan-500 h-full rounded-full" style={{ width: '92.8%' }}></div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono font-bold pt-1 border-t border-zinc-200 dark:border-zinc-800">
              <span className="text-emerald-600 dark:text-emerald-400">APR: 99.5%</span>
              <span className="text-rose-600 dark:text-rose-400">RECH: 0.5%</span>
            </div>
          </div>

          {/* Card 2: Solicitados */}
          <div className="bg-zinc-50/70 border border-zinc-200/80 rounded-2xl p-4 space-y-3 text-zinc-950 shadow-sm dark:bg-zinc-900/80 dark:border-zinc-800 dark:text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                  <Send className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-zinc-950 dark:text-white block">Solicitados</span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono block">DESPACHO</span>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold bg-zinc-200/80 text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 px-2 py-0.5 rounded">
                SLA 72h
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-zinc-500 dark:text-zinc-400 uppercase text-[10px]">RENDIMIENTO</span>
                <span className="text-zinc-950 dark:text-white font-mono">88.4%</span>
              </div>
              <div className="w-full bg-zinc-200 dark:bg-zinc-950 rounded-full h-1.5 overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: '88.4%' }}></div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono font-bold pt-1 border-t border-zinc-200 dark:border-zinc-800">
              <span className="text-emerald-600 dark:text-emerald-400">APR: 98.2%</span>
              <span className="text-rose-600 dark:text-rose-400">RECH: 1.8%</span>
            </div>
          </div>

          {/* Card 3: Lavandería */}
          <div className="bg-zinc-50/70 border border-zinc-200/80 rounded-2xl p-4 space-y-3 text-zinc-950 shadow-sm dark:bg-zinc-900/80 dark:border-zinc-800 dark:text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300">
                  <Droplets className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-zinc-950 dark:text-white block">Lavandería</span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono block">PLANTA</span>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold bg-zinc-200/80 text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 px-2 py-0.5 rounded">
                SLA 96h
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-zinc-500 dark:text-zinc-400 uppercase text-[10px]">RENDIMIENTO</span>
                <span className="text-zinc-950 dark:text-white font-mono">86.2%</span>
              </div>
              <div className="w-full bg-zinc-200 dark:bg-zinc-950 rounded-full h-1.5 overflow-hidden">
                <div className="bg-sky-500 h-full rounded-full" style={{ width: '86.2%' }}></div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono font-bold pt-1 border-t border-zinc-200 dark:border-zinc-800">
              <span className="text-emerald-600 dark:text-emerald-400">APR: 96.8%</span>
              <span className="text-rose-600 dark:text-rose-400">RECH: 3.2%</span>
            </div>
          </div>

          {/* Card 4: Calidad */}
          <div className="bg-zinc-50/70 border border-zinc-200/80 rounded-2xl p-4 space-y-3 text-zinc-950 shadow-sm dark:bg-zinc-900/80 dark:border-zinc-800 dark:text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300">
                  <Microscope className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-zinc-950 dark:text-white block">Calidad</span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono block">LAB STF</span>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold bg-zinc-200/80 text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 px-2 py-0.5 rounded">
                SLA 24h
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-zinc-500 dark:text-zinc-400 uppercase text-[10px]">RENDIMIENTO</span>
                <span className="text-zinc-950 dark:text-white font-mono">95.0%</span>
              </div>
              <div className="w-full bg-zinc-200 dark:bg-zinc-950 rounded-full h-1.5 overflow-hidden">
                <div className="bg-purple-500 h-full rounded-full" style={{ width: '95%' }}></div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono font-bold pt-1 border-t border-zinc-200 dark:border-zinc-800">
              <span className="text-emerald-600 dark:text-emerald-400">APR: 97.4%</span>
              <span className="text-rose-600 dark:text-rose-400">RECH: 2.6%</span>
            </div>
          </div>

        </div>

      </div>

      {/* 4. FAST ACTION TILES TO REMAINING MODULES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Tile 1: Base de Datos Maestra */}
        <div
          onClick={() => onNavigate('base-datos')}
          className="bg-white border border-zinc-200/90 hover:border-zinc-400 p-4 sm:p-5 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] flex items-center justify-between cursor-pointer transition-all duration-150 transform hover:-translate-y-0.5 text-zinc-950 dark:bg-[#0c1017] dark:border-zinc-800 dark:text-white dark:shadow-[0_4px_20px_rgba(255,255,255,0.05)] hover:dark:shadow-[0_8px_25px_rgba(255,255,255,0.08)] hover:dark:border-zinc-600 group"
        >
          <div>
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide block">REGISTRO MAESTRO</span>
            <h4 className="text-sm font-bold text-zinc-950 dark:text-white mt-0.5">Base de Datos Maestra</h4>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-1">Historial completo y Google Sheets</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-700 group-hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:group-hover:bg-zinc-800 flex items-center justify-center shrink-0 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>

        {/* Tile 2: Alertas */}
        <div
          onClick={() => onNavigate('alertas')}
          className="bg-white border border-zinc-200/90 hover:border-zinc-400 p-4 sm:p-5 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] flex items-center justify-between cursor-pointer transition-all duration-150 transform hover:-translate-y-0.5 text-zinc-950 dark:bg-[#0c1017] dark:border-zinc-800 dark:text-white dark:shadow-[0_4px_20px_rgba(255,255,255,0.05)] hover:dark:shadow-[0_8px_25px_rgba(255,255,255,0.08)] hover:dark:border-zinc-600 group"
        >
          <div>
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide block">GESTIÓN DE RIESGOS</span>
            <h4 className="text-sm font-bold text-zinc-950 dark:text-white mt-0.5">Alertas y Retrasos Críticos</h4>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-1">Revisión de OPs fuera de SLA</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-700 group-hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:group-hover:bg-zinc-800 flex items-center justify-center shrink-0 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>

        {/* Tile 3: Línea de Tiempo */}
        <div
          onClick={() => onNavigate('timeline')}
          className="bg-white border border-zinc-200/90 hover:border-zinc-400 p-4 sm:p-5 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] flex items-center justify-between cursor-pointer transition-all duration-150 transform hover:-translate-y-0.5 text-zinc-950 dark:bg-[#0c1017] dark:border-zinc-800 dark:text-white dark:shadow-[0_4px_20px_rgba(255,255,255,0.05)] hover:dark:shadow-[0_8px_25px_rgba(255,255,255,0.08)] hover:dark:border-zinc-600 group"
        >
          <div>
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide block">AUDITORÍA</span>
            <h4 className="text-sm font-bold text-zinc-950 dark:text-white mt-0.5">Línea del Tiempo OP</h4>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-1">Evaluación de proceso por colcha</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-700 group-hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:group-hover:bg-zinc-800 flex items-center justify-center shrink-0 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>

        {/* Tile 4: Estadísticas */}
        <div
          onClick={() => onNavigate('estadisticas')}
          className="bg-white border border-zinc-200/90 hover:border-zinc-400 p-4 sm:p-5 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] flex items-center justify-between cursor-pointer transition-all duration-150 transform hover:-translate-y-0.5 text-zinc-950 dark:bg-[#0c1017] dark:border-zinc-800 dark:text-white dark:shadow-[0_4px_20px_rgba(255,255,255,0.05)] hover:dark:shadow-[0_8px_25px_rgba(255,255,255,0.08)] hover:dark:border-zinc-600 group"
        >
          <div>
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide block">INTELIGENCIA DE DATOS</span>
            <h4 className="text-sm font-bold text-zinc-950 dark:text-white mt-0.5">Métricas y Estadísticas</h4>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-1">Productividad, operarios y rendimiento</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-700 group-hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:group-hover:bg-zinc-800 flex items-center justify-center shrink-0 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>

        {/* TILE EXCLUSIVO: AUDITORÍA & HISTORIAL INTELIGENTE (SOLO PERFIL SOPORTE TEC.) */}
        {isSoporteUser(currentUser) && (
          <div
            onClick={() => onNavigate('soporte-auditoria')}
            className="col-span-1 sm:col-span-2 lg:col-span-4 bg-gradient-to-r from-zinc-950 via-[#031d2e] to-zinc-950 border-2 border-cyan-400 p-5 rounded-3xl shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:shadow-[0_0_45px_rgba(6,182,212,0.5)] flex items-center justify-between cursor-pointer transition-all duration-200 transform hover:-translate-y-0.5 text-white group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 shadow-lg">
                <ShieldCheck className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold uppercase tracking-wider mb-1 border border-cyan-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  <span>MÓDULO EXCLUSIVO SOPORTE TÉCNICO</span>
                </div>
                <h4 className="text-base sm:text-lg font-extrabold text-white">
                  Auditoría de Ingresos & Historial Forense en Tiempo Real
                </h4>
                <span className="text-xs sm:text-sm text-zinc-300 block">
                  Control de ingresos día/mes de cada usuario y apartado Historial de cambios con fecha y hora exacta
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-300 group-hover:bg-cyan-500 group-hover:text-black flex items-center justify-center shrink-0 transition-all font-mono font-bold ml-2">
              <ChevronRight className="w-5 h-5" />
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
