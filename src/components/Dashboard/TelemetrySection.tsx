import React from 'react';
import { Activity } from 'lucide-react';

export const TelemetrySection: React.FC = () => {
  return (
    <div className="bg-white dark:bg-[#0c1017] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 space-y-4 text-zinc-950 dark:text-white shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_25px_rgba(255,255,255,0.05)]">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-zinc-950 dark:text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>RENDIMIENTO Y TIEMPOS DE PROCESO POR ÁREA</span>
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Monitoreo de cumplimiento de SLA y tasa de aprobación de muestras por etapa
          </p>
        </div>
        <span className="text-xs bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 px-3 py-1 rounded-full font-bold flex items-center gap-1.5 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          TELEMETRÍA EN VIVO
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
        
        {/* Pre-Solicitud */}
        <div className="bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-zinc-950 dark:text-white">Pre-Solicitud (2F)</span>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">SLA 24h</span>
          </div>
          <div>
            <div className="flex justify-between text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              <span>Rendimiento tiempos</span>
              <span className="text-cyan-600 dark:text-cyan-400 font-mono font-bold">85.7%</span>
            </div>
            <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-cyan-500 h-full rounded-full" style={{ width: '85.7%' }}></div>
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-zinc-500 dark:text-zinc-400 pt-1 border-t border-zinc-200 dark:border-zinc-800 font-mono">
            <span>APR: <strong className="text-emerald-600 dark:text-emerald-400">99.5%</strong></span>
            <span>RECH: <strong className="text-rose-600 dark:text-rose-400">0.5%</strong></span>
          </div>
        </div>

        {/* Solicitados */}
        <div className="bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-zinc-950 dark:text-white">Solicitados (Despacho)</span>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">SLA 24h</span>
          </div>
          <div>
            <div className="flex justify-between text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              <span>Rendimiento tiempos</span>
              <span className="text-amber-600 dark:text-amber-400 font-mono font-bold">82.3%</span>
            </div>
            <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full rounded-full" style={{ width: '82.3%' }}></div>
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-zinc-500 dark:text-zinc-400 pt-1 border-t border-zinc-200 dark:border-zinc-800 font-mono">
            <span>APR: <strong className="text-emerald-600 dark:text-emerald-400">99.0%</strong></span>
            <span>RECH: <strong className="text-rose-600 dark:text-rose-400">1.0%</strong></span>
          </div>
        </div>

        {/* Lavandería */}
        <div className="bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-zinc-950 dark:text-white">Lavandería (Químico)</span>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">SLA 48h</span>
          </div>
          <div>
            <div className="flex justify-between text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              <span>Rendimiento tiempos</span>
              <span className="text-sky-600 dark:text-sky-400 font-mono font-bold">75.0%</span>
            </div>
            <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-sky-500 h-full rounded-full" style={{ width: '75%' }}></div>
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-zinc-500 dark:text-zinc-400 pt-1 border-t border-zinc-200 dark:border-zinc-800 font-mono">
            <span>APR: <strong className="text-emerald-600 dark:text-emerald-400">97.8%</strong></span>
            <span>RECH: <strong className="text-rose-600 dark:text-rose-400">2.2%</strong></span>
          </div>
        </div>

        {/* Calidad STF */}
        <div className="bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-zinc-950 dark:text-white">Calidad STF (Laboratorio)</span>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">SLA 24h</span>
          </div>
          <div>
            <div className="flex justify-between text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              <span>Rendimiento tiempos</span>
              <span className="text-purple-600 dark:text-purple-400 font-mono font-bold">91.2%</span>
            </div>
            <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-purple-500 h-full rounded-full" style={{ width: '91.2%' }}></div>
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-zinc-500 dark:text-zinc-400 pt-1 border-t border-zinc-200 dark:border-zinc-800 font-mono">
            <span>APR: <strong className="text-emerald-600 dark:text-emerald-400">100%</strong></span>
            <span>RECH: <strong className="text-rose-600 dark:text-rose-400">0.0%</strong></span>
          </div>
        </div>

      </div>
    </div>
  );
};
