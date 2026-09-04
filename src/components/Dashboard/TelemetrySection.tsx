import React from 'react';
import { Activity } from 'lucide-react';

export const TelemetrySection: React.FC = () => {
  return (
    <div className="bg-[#0c1017] dark:bg-white border border-zinc-800 dark:border-zinc-200 rounded-3xl p-6 space-y-4 text-white dark:text-zinc-950 shadow-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white dark:text-zinc-950 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
            <span>RENDIMIENTO Y TIEMPOS DE PROCESO POR ÁREA</span>
          </h3>
          <p className="text-xs text-zinc-400 dark:text-zinc-600">
            Monitoreo de cumplimiento de SLA y tasa de aprobación de muestras por etapa
          </p>
        </div>
        <span className="text-xs bg-emerald-950/80 dark:bg-emerald-100 text-emerald-300 dark:text-emerald-800 border border-emerald-800 dark:border-emerald-300 px-3 py-1 rounded-full font-bold flex items-center gap-1.5 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          TELEMETRÍA EN VIVO
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
        
        {/* Pre-Solicitud */}
        <div className="bg-zinc-900/90 dark:bg-zinc-50 border border-zinc-800 dark:border-zinc-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white dark:text-zinc-950">Pre-Solicitud (2F)</span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">SLA 24h</span>
          </div>
          <div>
            <div className="flex justify-between text-[11px] font-semibold text-zinc-400 dark:text-zinc-600 mb-1">
              <span>Rendimiento tiempos</span>
              <span className="text-cyan-400 dark:text-cyan-600 font-mono">85.7%</span>
            </div>
            <div className="w-full bg-zinc-950 dark:bg-zinc-200 h-1.5 rounded-full overflow-hidden">
              <div className="bg-cyan-400 h-full rounded-full" style={{ width: '85.7%' }}></div>
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-zinc-400 dark:text-zinc-600 pt-1 border-t border-zinc-800 dark:border-zinc-200 font-mono">
            <span>APR: <strong className="text-emerald-400 dark:text-emerald-600">99.5%</strong></span>
            <span>RECH: <strong className="text-rose-400 dark:text-rose-600">0.5%</strong></span>
          </div>
        </div>

        {/* Solicitados */}
        <div className="bg-zinc-900/90 dark:bg-zinc-50 border border-zinc-800 dark:border-zinc-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white dark:text-zinc-950">Solicitados (Despacho)</span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">SLA 24h</span>
          </div>
          <div>
            <div className="flex justify-between text-[11px] font-semibold text-zinc-400 dark:text-zinc-600 mb-1">
              <span>Rendimiento tiempos</span>
              <span className="text-amber-400 dark:text-amber-600 font-mono">82.3%</span>
            </div>
            <div className="w-full bg-zinc-950 dark:bg-zinc-200 h-1.5 rounded-full overflow-hidden">
              <div className="bg-amber-400 h-full rounded-full" style={{ width: '82.3%' }}></div>
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-zinc-400 dark:text-zinc-600 pt-1 border-t border-zinc-800 dark:border-zinc-200 font-mono">
            <span>APR: <strong className="text-emerald-400 dark:text-emerald-600">99.0%</strong></span>
            <span>RECH: <strong className="text-rose-400 dark:text-rose-600">1.0%</strong></span>
          </div>
        </div>

        {/* Lavandería */}
        <div className="bg-zinc-900/90 dark:bg-zinc-50 border border-zinc-800 dark:border-zinc-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white dark:text-zinc-950">Lavandería (Químico)</span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">SLA 48h</span>
          </div>
          <div>
            <div className="flex justify-between text-[11px] font-semibold text-zinc-400 dark:text-zinc-600 mb-1">
              <span>Rendimiento tiempos</span>
              <span className="text-sky-400 dark:text-sky-600 font-mono">75.0%</span>
            </div>
            <div className="w-full bg-zinc-950 dark:bg-zinc-200 h-1.5 rounded-full overflow-hidden">
              <div className="bg-sky-400 h-full rounded-full" style={{ width: '75%' }}></div>
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-zinc-400 dark:text-zinc-600 pt-1 border-t border-zinc-800 dark:border-zinc-200 font-mono">
            <span>APR: <strong className="text-emerald-400 dark:text-emerald-600">97.8%</strong></span>
            <span>RECH: <strong className="text-rose-400 dark:text-rose-600">2.2%</strong></span>
          </div>
        </div>

        {/* Calidad STF */}
        <div className="bg-zinc-900/90 dark:bg-zinc-50 border border-zinc-800 dark:border-zinc-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white dark:text-zinc-950">Calidad STF (Laboratorio)</span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">SLA 24h</span>
          </div>
          <div>
            <div className="flex justify-between text-[11px] font-semibold text-zinc-400 dark:text-zinc-600 mb-1">
              <span>Rendimiento tiempos</span>
              <span className="text-purple-400 dark:text-purple-600 font-mono">91.2%</span>
            </div>
            <div className="w-full bg-zinc-950 dark:bg-zinc-200 h-1.5 rounded-full overflow-hidden">
              <div className="bg-purple-400 h-full rounded-full" style={{ width: '91.2%' }}></div>
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-zinc-400 dark:text-zinc-600 pt-1 border-t border-zinc-800 dark:border-zinc-200 font-mono">
            <span>APR: <strong className="text-emerald-400 dark:text-emerald-600">100%</strong></span>
            <span>RECH: <strong className="text-rose-400 dark:text-rose-600">0.0%</strong></span>
          </div>
        </div>

      </div>
    </div>
  );
};
