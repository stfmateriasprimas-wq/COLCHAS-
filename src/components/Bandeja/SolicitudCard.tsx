import React from 'react';
import { Eye, Printer, ArrowRight, Camera, Calendar, Clock, Trash2, CheckCircle2 } from 'lucide-react';
import { SolicitudColcha, SectorType } from '../../types';
import { formatColombianDisplayDate } from '../../services/slaCalculator';
import { UsuarioSTF } from '../../services/authService';

interface SolicitudCardProps {
  solicitud: SolicitudColcha;
  onTransfer: (solicitud: SolicitudColcha) => void;
  onViewDetail: (solicitud: SolicitudColcha) => void;
  onPrint: (solicitud: SolicitudColcha) => void;
  onDelete?: (solicitud: SolicitudColcha) => void;
  onFinalizar?: (solicitud: SolicitudColcha) => void;
  currentUser?: UsuarioSTF | null;
}

const STAGES: { key: SectorType; label: string }[] = [
  { key: 'PRE_SOLICITUD', label: 'PRE-SOL.' },
  { key: 'SOLICITADO', label: 'SOLICITADO' },
  { key: 'LAVANDERIA', label: 'LAVANDERÍA' },
  { key: 'CALIDAD', label: 'CALIDAD' },
  { key: 'FINALIZADO', label: 'FINALIZADO' }
];

const STAGE_CONFIG: Record<SectorType, { 
  border: string; 
  badge: string; 
  text: string; 
  activeLine: string;
  activeText: string;
  locationBadge: string;
  rollosBox: {
    bg: string;
    border: string;
    label: string;
    text: string;
  };
}> = {
  PRE_SOLICITUD: {
    border: 'border-l-cyan-400',
    badge: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50 dark:bg-cyan-50 dark:text-cyan-800 dark:border-cyan-300',
    text: 'text-cyan-400 dark:text-cyan-600',
    activeLine: 'border-cyan-400 bg-cyan-400',
    activeText: 'text-cyan-400 dark:text-cyan-600 font-black',
    locationBadge: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50 dark:bg-cyan-50 dark:text-cyan-800 dark:border-cyan-300',
    rollosBox: {
      bg: 'bg-cyan-950/50 dark:bg-cyan-50',
      border: 'border-cyan-500/50 dark:border-cyan-300',
      label: 'text-cyan-400 dark:text-cyan-700',
      text: 'text-cyan-200 dark:text-cyan-900'
    }
  },
  SOLICITADO: {
    border: 'border-l-amber-500',
    badge: 'bg-amber-950/80 text-amber-300 border-amber-500/50 dark:bg-amber-50 dark:text-amber-800 dark:border-amber-300',
    text: 'text-amber-400 dark:text-amber-600',
    activeLine: 'border-amber-500 bg-amber-500',
    activeText: 'text-amber-400 dark:text-amber-600 font-black',
    locationBadge: 'bg-amber-950/80 text-amber-300 border-amber-500/50 dark:bg-amber-50 dark:text-amber-800 dark:border-amber-300',
    rollosBox: {
      bg: 'bg-amber-950/50 dark:bg-amber-50',
      border: 'border-amber-500/50 dark:border-amber-300',
      label: 'text-amber-400 dark:text-amber-700',
      text: 'text-amber-200 dark:text-amber-900'
    }
  },
  LAVANDERIA: {
    border: 'border-l-sky-500',
    badge: 'bg-sky-950/80 text-sky-300 border-sky-500/50 dark:bg-sky-50 dark:text-sky-800 dark:border-sky-300',
    text: 'text-sky-400 dark:text-sky-600',
    activeLine: 'border-sky-500 bg-sky-500',
    activeText: 'text-sky-400 dark:text-sky-600 font-black',
    locationBadge: 'bg-sky-950/80 text-sky-300 border-sky-500/50 dark:bg-sky-50 dark:text-sky-800 dark:border-sky-300',
    rollosBox: {
      bg: 'bg-sky-950/50 dark:bg-sky-50',
      border: 'border-sky-500/50 dark:border-sky-300',
      label: 'text-sky-400 dark:text-sky-700',
      text: 'text-sky-200 dark:text-sky-900'
    }
  },
  CALIDAD: {
    border: 'border-l-purple-500',
    badge: 'bg-purple-950/80 text-purple-300 border-purple-500/50 dark:bg-purple-50 dark:text-purple-800 dark:border-purple-300',
    text: 'text-purple-400 dark:text-purple-600',
    activeLine: 'border-purple-500 bg-purple-500',
    activeText: 'text-purple-400 dark:text-purple-600 font-black',
    locationBadge: 'bg-purple-950/80 text-purple-300 border-purple-500/50 dark:bg-purple-50 dark:text-purple-800 dark:border-purple-300',
    rollosBox: {
      bg: 'bg-purple-950/50 dark:bg-purple-50',
      border: 'border-purple-500/50 dark:border-purple-300',
      label: 'text-purple-400 dark:text-purple-700',
      text: 'text-purple-200 dark:text-purple-900'
    }
  },
  FINALIZADO: {
    border: 'border-l-emerald-500',
    badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 dark:bg-emerald-50 dark:text-emerald-800 dark:border-emerald-300',
    text: 'text-emerald-400 dark:text-emerald-600',
    activeLine: 'border-emerald-500 bg-emerald-500',
    activeText: 'text-emerald-400 dark:text-emerald-600 font-black',
    locationBadge: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 dark:bg-emerald-50 dark:text-emerald-800 dark:border-emerald-300',
    rollosBox: {
      bg: 'bg-emerald-950/50 dark:bg-emerald-50',
      border: 'border-emerald-500/50 dark:border-emerald-300',
      label: 'text-emerald-400 dark:text-emerald-700',
      text: 'text-emerald-200 dark:text-emerald-900'
    }
  }
};

export const SolicitudCard: React.FC<SolicitudCardProps> = ({
  solicitud,
  onTransfer,
  onViewDetail,
  onPrint,
  onDelete,
  onFinalizar,
  currentUser
}) => {
  const stageConfig = STAGE_CONFIG[solicitud.estado] || STAGE_CONFIG.SOLICITADO;
  const currentStageIndex = STAGES.findIndex(s => s.key === solicitud.estado);
  const cardId = `op-card-${solicitud.op.replace(/\D/g, '') || solicitud.op}`;

  return (
    <div id={cardId} className={`bg-[#0c1017] dark:bg-white border border-zinc-800 dark:border-zinc-200 ${stageConfig.border} border-l-[8px] rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 text-white dark:text-zinc-950 scroll-mt-24`}>
      
      <div className="p-5 sm:p-6 space-y-4">
        
        {/* Top Header Row: Badges & Date */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-zinc-800/80 dark:border-zinc-200/80 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Stage Pill */}
            <span className={`text-[11px] font-mono font-black px-3 py-1 rounded-xl border uppercase ${stageConfig.badge}`}>
              {solicitud.estado.replace('_', ' ')}
            </span>
            
            {/* Muestra Activa Pill */}
            <span className="text-[11px] font-mono font-bold px-3 py-1 rounded-xl bg-emerald-950/60 dark:bg-emerald-50 text-emerald-300 dark:text-emerald-700 border border-dashed border-emerald-500/80 dark:border-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>MUESTRA ACTIVA</span>
            </span>

            {/* Delay alert if delayed */}
            {solicitud.tieneRetraso && (
              <span className="text-[11px] font-mono font-bold px-3 py-1 rounded-xl bg-rose-950/70 dark:bg-rose-50 text-rose-300 dark:text-rose-700 border border-rose-700 dark:border-rose-300 flex items-center gap-1">
                <span>⚠️ +{solicitud.diasHabiles} DÍAS RETRASO</span>
              </span>
            )}
          </div>

          <div className="text-xs text-zinc-400 dark:text-zinc-600 font-mono flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
              Inicio: {formatColombianDisplayDate(solicitud.fechaCreacion)}
            </span>
            <span>|</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
              Cargada hace: {solicitud.horasEnProceso < 24 ? 'Hoy' : `${solicitud.diasHabiles}d`} ({solicitud.horasEnProceso}h hábiles)
            </span>
          </div>
        </div>

        {/* Middle Row: Title, Ref, Tela, Photo Box */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2.5 flex-1">
            
            {/* Title & Ver Ficha */}
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl sm:text-2xl font-black text-white dark:text-zinc-950 font-mono tracking-tight">
                {solicitud.op} <span className="text-zinc-500 dark:text-zinc-400 font-sans">/</span> REF – {solicitud.referencia}
              </h3>

              <button
                onClick={() => onViewDetail(solicitud)}
                className="text-xs font-bold text-indigo-300 dark:text-indigo-700 bg-indigo-950/80 dark:bg-indigo-50 hover:bg-indigo-900 dark:hover:bg-indigo-100 border border-indigo-500/50 dark:border-indigo-200 px-3.5 py-1.5 rounded-xl flex items-center gap-1 transition cursor-pointer shrink-0"
              >
                <span>Ver Ficha</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Fabric Tag */}
            <div>
              <span className="inline-block bg-indigo-950/80 dark:bg-indigo-50 text-indigo-300 dark:text-indigo-800 border border-indigo-500/50 dark:border-indigo-200 text-xs font-black px-3.5 py-1.5 rounded-xl font-mono">
                TELA: {solicitud.tela}
              </span>
            </div>

            {/* Operator & Color & Rollos Grid */}
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-zinc-900/90 dark:bg-zinc-100 p-3 rounded-2xl border border-zinc-800 dark:border-zinc-200">
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-sans font-bold block uppercase tracking-wider">REGISTRADO POR</span>
                  <span className="font-bold text-white dark:text-zinc-900 truncate block text-sm mt-0.5">{solicitud.inspector}</span>
                </div>

                <div className="bg-zinc-900/90 dark:bg-zinc-100 p-3 rounded-2xl border border-zinc-800 dark:border-zinc-200">
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-sans font-bold block uppercase tracking-wider">COLOR</span>
                  <span className="font-bold text-white dark:text-zinc-900 block text-sm mt-0.5">{solicitud.color}</span>
                </div>
              </div>

              {/* Dynamic Rollos Box matching the active stage color */}
              <div className={`${stageConfig.rollosBox.bg} p-3 rounded-2xl border ${stageConfig.rollosBox.border} text-xs font-mono transition-colors duration-150`}>
                <span className={`text-[10px] ${stageConfig.rollosBox.label} font-sans font-bold block uppercase tracking-wider`}>
                  ROLLOS PROCESADOS
                </span>
                <span className={`font-black ${stageConfig.rollosBox.text} text-sm mt-0.5 block`}>
                  {solicitud.rollos} {solicitud.rollos === 1 ? 'Rollo' : 'Rollos'}
                </span>
              </div>
            </div>

          </div>

          {/* Right Action / Photo Box */}
          <div className="hidden sm:flex flex-col items-center gap-2 flex-shrink-0">
            <div
              onClick={() => onViewDetail(solicitud)}
              className="w-28 h-28 rounded-2xl bg-zinc-900/90 dark:bg-zinc-100 border-2 border-dashed border-zinc-700 dark:border-zinc-300 hover:border-zinc-500 dark:hover:border-zinc-400 flex flex-col items-center justify-center p-2 text-zinc-400 dark:text-zinc-500 hover:text-white dark:hover:text-zinc-900 cursor-pointer transition overflow-hidden relative group"
            >
              {solicitud.fotoMuestraUrl ? (
                <img
                  src={solicitud.fotoMuestraUrl}
                  alt="Muestra"
                  className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition"
                />
              ) : (
                <>
                  <Camera className="w-6 h-6 mb-1 text-zinc-400 dark:text-zinc-500 stroke-[1.5]" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-center text-zinc-400 dark:text-zinc-500">CARGAR FOTO</span>
                </>
              )}
            </div>

            {solicitud.estado === 'CALIDAD' && (
              <span 
                onClick={() => onViewDetail(solicitud)}
                className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md font-mono text-center cursor-pointer transition ${
                  solicitud.fotoMuestraUrl
                    ? 'bg-emerald-950 text-emerald-300 dark:bg-emerald-50 dark:text-emerald-700 border border-emerald-500/40 dark:border-emerald-300'
                    : 'bg-amber-950 text-amber-300 dark:bg-amber-50 dark:text-amber-700 border border-amber-500/40 dark:border-amber-300 animate-pulse hover:bg-amber-900'
                }`}
              >
                {solicitud.fotoMuestraUrl ? '✓ FOTO POST-LAVADO' : '📷 ACT. FOTO'}
              </span>
            )}
          </div>
        </div>

        {/* Stepper Pipeline */}
        <div className="pt-2">
          <div className="grid grid-cols-5 text-center text-[10.5px] font-mono tracking-wider border-b border-zinc-800/80 dark:border-zinc-200/80 pb-2.5">
            {STAGES.map((st, i) => {
              const isActive = i === currentStageIndex;
              const isPassed = i < currentStageIndex;
              return (
                <div key={st.key} className="relative pb-1">
                  <span className={isActive ? stageConfig.activeText : isPassed ? 'text-emerald-400 dark:text-emerald-600 font-bold' : 'text-zinc-500 dark:text-zinc-400'}>
                    {st.label}
                  </span>
                  {isActive && (
                    <div className={`absolute -bottom-2.5 left-0 right-0 h-1 ${stageConfig.activeLine} bg-current rounded-full`}></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sub-footer: Location & Operator */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-zinc-400 dark:text-zinc-600 gap-2 pt-1 font-mono">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-sans font-bold uppercase text-zinc-500 dark:text-zinc-400">Ubicación:</span>
            <span className={`px-3 py-1 rounded-xl text-[10px] font-bold border ${stageConfig.locationBadge}`}>
              {solicitud.areaActual}
            </span>
          </div>

          <div className="text-xs">
            Último control: <strong className="text-white dark:text-zinc-950">{solicitud.inspector}</strong>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-800/80 dark:border-zinc-200/80">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onViewDetail(solicitud)}
              className="px-4 py-2.5 rounded-2xl bg-white text-zinc-950 hover:bg-zinc-200 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-800 text-xs font-black flex items-center gap-2 transition cursor-pointer shadow-md"
            >
              <Eye className="w-4 h-4 text-amber-500" />
              <span>VER DETALLE OP</span>
            </button>

            <button
              onClick={() => onPrint(solicitud)}
              className="px-4 py-2.5 rounded-2xl bg-transparent border-2 border-zinc-700 text-white hover:bg-zinc-800 dark:border-zinc-300 dark:text-zinc-900 dark:hover:bg-zinc-100 text-xs font-black flex items-center gap-2 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>IMPRIMIR</span>
            </button>

            {/* BOTÓN ELIMINAR (EDWIN - ADMINISTRADOR / HISTORIAL RECUPERABLE) */}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(solicitud)}
                className="px-4 py-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 dark:text-rose-600 border border-rose-400/60 dark:border-rose-300 text-xs font-black flex items-center gap-2 transition cursor-pointer shadow-xs hover:scale-105 active:scale-95 duration-150"
                title="Eliminar esta OP del sistema de trabajo (Guardar en historial de recuperación de Edwin)"
              >
                <Trash2 className="w-4 h-4 text-rose-500" />
                <span>ELIMINAR</span>
              </button>
            )}

            {/* BOTÓN FINALIZAR (VERDE - PASO AUTOMÁTICO A FINALIZADOS EN SISTEMA Y BASE DE DATOS) */}
            {solicitud.estado !== 'FINALIZADO' && onFinalizar && (
              <button
                type="button"
                onClick={() => onFinalizar(solicitud)}
                className="px-4 py-2.5 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 dark:text-emerald-700 border border-emerald-500/60 dark:border-emerald-400 text-xs font-black flex items-center gap-2 transition cursor-pointer shadow-xs hover:scale-105 active:scale-95 duration-150"
                title="Dar por finalizada esta OP y moverla automáticamente a Finalizados en el sistema y base de datos"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
                <span>FINALIZAR</span>
              </button>
            )}
          </div>

          {solicitud.estado === 'PRE_SOLICITUD' ? (
            <button
              onClick={() => onTransfer(solicitud)}
              className="px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black flex items-center gap-2 shadow-md transition cursor-pointer animate-in fade-in"
            >
              <span>TRANSFERIR A LAVANDERÍA</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : solicitud.estado === 'CALIDAD' ? (
            <button
              onClick={() => onTransfer(solicitud)}
              className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-2 shadow-md transition cursor-pointer animate-in fade-in"
            >
              <span>EMITIR DICTAMEN FINAL</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : solicitud.estado === 'SOLICITADO' ? (
            <span className="text-xs bg-zinc-900 dark:bg-zinc-100 text-zinc-300 dark:text-zinc-700 font-bold px-3.5 py-2 rounded-2xl border border-zinc-800 dark:border-zinc-200 font-mono flex items-center gap-1.5 shadow-xs">
              <span>📦 PASO A LAVANDERÍA POR BD</span>
            </span>
          ) : solicitud.estado === 'LAVANDERIA' ? (
            <button
              onClick={() => onTransfer(solicitud)}
              className="px-5 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
            >
              <span>TRANSFERIR A CALIDAD</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <span className="text-xs bg-emerald-950/60 dark:bg-emerald-50 text-emerald-300 dark:text-emerald-700 font-bold px-3.5 py-2 rounded-2xl border border-emerald-500/40 dark:border-emerald-300 font-mono">
              ✓ {solicitud.dictamen === 'RECHAZADO' ? 'RECHAZADO' : 'LIBERADO / APROBADO'}
            </span>
          )}
        </div>

      </div>

    </div>
  );
};
