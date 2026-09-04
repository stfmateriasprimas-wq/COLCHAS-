import React, { useState } from 'react';
import { X, Search, Clock, ArrowRight, Eye, AlertCircle, CheckCircle2 } from 'lucide-react';
import { SolicitudColcha, SectorType } from '../../types';

interface AreaOpsModalProps {
  areaKey: SectorType | 'TOTAL' | 'EN_PROCESO' | null;
  solicitudes: SolicitudColcha[];
  onClose: () => void;
  onViewDetail: (solicitud: SolicitudColcha) => void;
  onTransfer: (solicitud: SolicitudColcha) => void;
}

const AREA_TITLES: Record<string, { title: string; subtitle: string; colorClass: string; badgeClass: string }> = {
  TOTAL: {
    title: 'Total Histórico de OPs',
    subtitle: 'Todas las órdenes de producción registradas en el sistema',
    colorClass: 'text-indigo-400',
    badgeClass: 'bg-indigo-950 text-indigo-300 border-indigo-500/40'
  },
  EN_PROCESO: {
    title: 'OPs Activas en Proceso',
    subtitle: 'Muestras circulando actualmente en planta y laboratorios',
    colorClass: 'text-amber-400',
    badgeClass: 'bg-amber-950 text-amber-300 border-amber-500/40'
  },
  PRE_SOLICITUD: {
    title: 'Pre-Solicitud — Atelier 2F',
    subtitle: 'Muestras registradas pendientes de despacho a planta',
    colorClass: 'text-cyan-300',
    badgeClass: 'bg-cyan-950 text-cyan-300 border-cyan-500/40'
  },
  SOLICITADO: {
    title: 'Solicitados — Despacho a Planta',
    subtitle: 'Órdenes en tránsito y preparación de despacho',
    colorClass: 'text-orange-300',
    badgeClass: 'bg-orange-950 text-orange-300 border-orange-500/40'
  },
  LAVANDERIA: {
    title: 'Lavandería — Planta Químico / Colfactory',
    subtitle: 'Muestras en proceso de lavado, suavizado y pruebas de encogimiento',
    colorClass: 'text-sky-300',
    badgeClass: 'bg-sky-950 text-sky-300 border-sky-500/40'
  },
  CALIDAD: {
    title: 'Calidad STF — Laboratorio & Auditoría',
    subtitle: 'Auditoría técnica, dictamen de tolerancias y aprobación final',
    colorClass: 'text-purple-300',
    badgeClass: 'bg-purple-950 text-purple-300 border-purple-500/40'
  },
  FINALIZADO: {
    title: 'Finalizados — Muestras Liberadas',
    subtitle: 'Órdenes con ciclo completado y dictamen emitido',
    colorClass: 'text-emerald-300',
    badgeClass: 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
  }
};

export const AreaOpsModal: React.FC<AreaOpsModalProps> = ({
  areaKey,
  solicitudes,
  onClose,
  onViewDetail,
  onTransfer
}) => {
  const [search, setSearch] = useState('');

  if (!areaKey) return null;

  const areaInfo = AREA_TITLES[areaKey] || {
    title: `Área: ${areaKey}`,
    subtitle: 'Órdenes de producción del área seleccionada',
    colorClass: 'text-white',
    badgeClass: 'bg-zinc-800 text-zinc-300 border-zinc-700'
  };

  // Filter items for this area
  const areaItems = solicitudes.filter(item => {
    if (areaKey === 'TOTAL') return true;
    if (areaKey === 'EN_PROCESO') return item.estado !== 'FINALIZADO';
    return item.estado === areaKey;
  });

  // Filter with internal search
  const filtered = areaItems.filter(item => {
    const q = search.toLowerCase();
    return (
      item.op.toLowerCase().includes(q) ||
      item.referencia.toLowerCase().includes(q) ||
      item.tela.toLowerCase().includes(q) ||
      item.codigoMt.toLowerCase().includes(q) ||
      item.lote.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-[#0c1017] dark:bg-white border border-zinc-800 dark:border-zinc-200 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-white dark:text-zinc-950 font-sans select-none">
        
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 dark:border-zinc-200 flex items-start justify-between gap-4 bg-zinc-900/80 dark:bg-zinc-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border bg-zinc-950 dark:bg-zinc-200 text-zinc-300 dark:text-zinc-700 border-zinc-700 dark:border-zinc-300">
                ETIQUETAS DEL SECTOR
              </span>
              <span className="text-xs text-zinc-400 dark:text-zinc-600 font-mono font-bold">
                {areaItems.length} {areaItems.length === 1 ? 'Orden' : 'Órdenes'}
              </span>
            </div>
            <h2 className="text-xl font-black brand-title text-white dark:text-zinc-950">
              {areaInfo.title}
            </h2>
            <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-0.5">
              {areaInfo.subtitle}
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white dark:text-zinc-600 dark:hover:text-zinc-950 p-2 rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search inside area */}
        <div className="p-4 border-b border-zinc-800 dark:border-zinc-200 bg-zinc-900/50 dark:bg-zinc-50">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar por N° OP, Referencia, Tela o Lote en esta área..."
              className="w-full bg-zinc-950 dark:bg-zinc-100 border border-zinc-800 dark:border-zinc-200 rounded-2xl pl-9 pr-4 py-2.5 text-xs text-white dark:text-zinc-950 placeholder-zinc-400 focus:outline-none focus:border-amber-500 transition"
            />
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
          </div>
        </div>

        {/* Cards Grid */}
        <div className="p-6 overflow-y-auto space-y-3 custom-scroll flex-1 bg-transparent">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-xs">
              No hay órdenes de producción que coincidan con la búsqueda en esta área.
            </div>
          ) : (
            filtered.map(item => (
              <div
                key={item.id}
                className={`bg-zinc-900/90 dark:bg-zinc-50 border rounded-2xl p-4.5 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm ${
                  item.esRetrasoCritico
                    ? 'border-rose-500/50 dark:border-rose-300'
                    : item.tieneRetraso
                    ? 'border-amber-500/50 dark:border-amber-300'
                    : 'border-zinc-800 dark:border-zinc-200'
                }`}
              >
                
                {/* Left: OP info & badges */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-black font-mono text-white dark:text-zinc-950">{item.op}</span>
                    <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 font-mono">REF: {item.referencia}</span>
                    
                    <span className="bg-zinc-950 dark:bg-zinc-200 text-zinc-300 dark:text-zinc-700 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-zinc-800 dark:border-zinc-300">
                      {item.estado.replace('_', '-')}
                    </span>

                    {item.tieneRetraso && (
                      <span className="bg-rose-950/80 dark:bg-rose-100 text-rose-300 dark:text-rose-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-rose-800 dark:border-rose-300 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> +{item.diasHabiles}D RETRASO
                      </span>
                    )}

                    {item.dictamen === 'APROBADO' && (
                      <span className="bg-emerald-950/80 dark:bg-emerald-100 text-emerald-300 dark:text-emerald-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-emerald-800 dark:border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> APROBADO
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-zinc-200 dark:text-zinc-800 font-semibold font-mono">
                    <span>{item.tela}</span> • <span>{item.codigoMt}</span> • <span className="opacity-70">{item.color}</span>
                  </div>

                  <div className="text-[11px] text-zinc-400 dark:text-zinc-600 flex items-center gap-3 font-mono">
                    <span>Rollos: <strong className="text-white dark:text-zinc-950">{item.rollos}</strong></span>
                    <span>Lote: <strong className="text-white dark:text-zinc-950">{item.lote}</strong></span>
                    <span>Registró: <strong className="text-white dark:text-zinc-950">{item.inspector}</strong></span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                      {item.horasEnProceso}h
                    </span>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 border-zinc-800 dark:border-zinc-200 pt-3 sm:pt-0">
                  <button
                    onClick={() => onViewDetail(item)}
                    className="px-3.5 py-2 rounded-xl bg-zinc-800 dark:bg-zinc-200 hover:bg-zinc-700 dark:hover:bg-zinc-300 text-white dark:text-zinc-950 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-zinc-700 dark:border-zinc-300"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ver Ficha</span>
                  </button>

                  {item.estado !== 'FINALIZADO' && (
                    <button
                      onClick={() => onTransfer(item)}
                      className="px-4 py-2 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-800 text-xs font-black flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                    >
                      <span>Transferir</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 dark:border-zinc-200 bg-zinc-900/80 dark:bg-zinc-100 flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-600 font-mono">
          <span>Mostrando {filtered.length} de {areaItems.length} órdenes</span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-white text-zinc-950 hover:bg-zinc-200 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-800 rounded-xl font-bold transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
