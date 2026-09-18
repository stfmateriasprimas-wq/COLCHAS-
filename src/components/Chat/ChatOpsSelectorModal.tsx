import React, { useState, useMemo } from 'react';
import { 
  X, Search, AlertTriangle, Zap, Clock, Droplets, 
  Microscope, Send, CheckCircle2, ChevronRight, Filter 
} from 'lucide-react';
import { SolicitudColcha } from '../../types';
import { SmartPhotoDisplay } from '../Common/SmartPhotoDisplay';

interface ChatOpsSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  solicitudes: SolicitudColcha[];
  onSelectOpToShare: (solicitud: SolicitudColcha, note?: string) => void;
  isDarkMode?: boolean;
}

export const ChatOpsSelectorModal: React.FC<ChatOpsSelectorModalProps> = ({
  isOpen,
  onClose,
  solicitudes,
  onSelectOpToShare,
  isDarkMode
}) => {
  const [filterType, setFilterType] = useState<'RETRASO' | 'PROCESO' | 'TODAS'>('RETRASO');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOpForNote, setSelectedOpForNote] = useState<SolicitudColcha | null>(null);
  const [customNote, setCustomNote] = useState('');

  // OPs en retraso SLA (> 3 días)
  const delayedOps = useMemo(() => {
    return solicitudes.filter(s => s.tieneRetraso && s.estado !== 'FINALIZADO');
  }, [solicitudes]);

  // OPs en proceso activo
  const inProcessOps = useMemo(() => {
    return solicitudes.filter(s => ['PRE_SOLICITUD', 'SOLICITADO', 'LAVANDERIA', 'CALIDAD'].includes(s.estado));
  }, [solicitudes]);

  // Filtrado reactivo
  const filteredList = useMemo(() => {
    let base = filterType === 'RETRASO' ? delayedOps : filterType === 'PROCESO' ? inProcessOps : solicitudes;
    
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      base = base.filter(s => 
        s.op.toLowerCase().includes(q) ||
        s.tela.toLowerCase().includes(q) ||
        (s.color && s.color.toLowerCase().includes(q)) ||
        (s.referencia && s.referencia.toLowerCase().includes(q))
      );
    }
    return base;
  }, [filterType, delayedOps, inProcessOps, solicitudes, searchTerm]);

  if (!isOpen) return null;

  const handleConfirmShare = (colcha: SolicitudColcha) => {
    onSelectOpToShare(colcha, customNote.trim());
    setCustomNote('');
    setSelectedOpForNote(null);
    onClose();
  };

  const getStageIcon = (estado: string) => {
    switch (estado) {
      case 'PRE_SOLICITUD': return <Clock className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />;
      case 'SOLICITADO': return <Send className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />;
      case 'LAVANDERIA': return <Droplets className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />;
      case 'CALIDAD': return <Microscope className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />;
      case 'FINALIZADO': return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />;
      default: return <Clock className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  const getStageBadge = (estado: string) => {
    switch (estado) {
      case 'PRE_SOLICITUD': return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-800';
      case 'SOLICITADO': return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800';
      case 'LAVANDERIA': return 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/80 dark:text-sky-300 dark:border-sky-800';
      case 'CALIDAD': return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-800';
      case 'FINALIZADO': return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800';
      default: return 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative bg-white dark:bg-[#07090e] border border-zinc-200 dark:border-white/20 w-full max-w-2xl rounded-2xl sm:rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35),0_0_1px_rgba(0,0,0,0.2)] dark:shadow-[0_0_50px_rgba(255,255,255,0.08),0_25px_65px_-12px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.35)] flex flex-col max-h-[90vh] overflow-hidden text-zinc-900 dark:text-[#e9edef]">
        
        {/* Línea reflectiva superior */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-zinc-400/40 to-transparent dark:via-white/50" />

        {/* Encabezado */}
        <div className="p-3.5 sm:p-5 border-b border-zinc-200 dark:border-white/10 flex items-center justify-between bg-zinc-50/90 dark:bg-[#0c1017]/90 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-sm">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-zinc-900 dark:text-white tracking-wide flex items-center gap-2">
                <span>Vincular OP al Chat</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700/60 font-bold">
                  EN TIEMPO REAL
                </span>
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                Selecciona una OP para compartir su ficha técnica interactiva en la conversación.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 dark:bg-white/10 dark:hover:bg-white/20 dark:text-zinc-300 dark:hover:text-white flex items-center justify-center transition cursor-pointer border border-zinc-200/80 dark:border-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pestañas Superiores de Filtrado */}
        <div className="px-3.5 sm:px-5 pt-3 flex items-center gap-2 overflow-x-auto border-b border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-[#080b11] pb-2.5 custom-scroll">
          <button
            type="button"
            onClick={() => setFilterType('RETRASO')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              filterType === 'RETRASO'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                : 'bg-white dark:bg-zinc-900/90 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-white/10'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>OPs en Retraso SLA</span>
            <span className="text-[10px] font-mono font-black px-1.5 py-0.2 rounded-full bg-black/20 text-white">
              {delayedOps.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType('PROCESO')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              filterType === 'PROCESO'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                : 'bg-white dark:bg-zinc-900/90 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-white/10'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>En Proceso Activo</span>
            <span className="text-[10px] font-mono font-black px-1.5 py-0.2 rounded-full bg-black/20 text-white">
              {inProcessOps.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType('TODAS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              filterType === 'TODAS'
                ? 'bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 shadow-md'
                : 'bg-white dark:bg-zinc-900/90 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-white/10'
            }`}
          >
            <span>Todas ({solicitudes.length})</span>
          </button>
        </div>

        {/* Buscador de OPs en Tiempo Real */}
        <div className="p-3.5 sm:p-5 pb-2 bg-white dark:bg-[#07090e]">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por OP (ej: 96156), tela, color o referencia..."
              className="w-full pl-10 pr-9 py-2.5 bg-zinc-100/90 dark:bg-[#0e131d] border border-zinc-200 dark:border-white/15 rounded-xl text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition shadow-inner"
              autoFocus
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Lista de OPs Filtradas */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 pt-1 space-y-2.5 custom-scroll max-h-[50vh] bg-zinc-50/50 dark:bg-[#07090e]">
          {filteredList.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 dark:text-zinc-500 space-y-2">
              <Filter className="w-8 h-8 mx-auto opacity-40" />
              <p className="text-xs">No se encontraron OPs con los filtros seleccionados.</p>
            </div>
          ) : (
            filteredList.map((colcha) => {
              const isSelected = selectedOpForNote?.id === colcha.id;

              return (
                <div
                  key={colcha.id}
                  className={`rounded-2xl border p-3 sm:p-3.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-500 ring-1 ring-emerald-500/50 shadow-md shadow-emerald-500/10'
                      : 'bg-white dark:bg-[#0c1017] border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20 hover:shadow-md hover:shadow-black/5 dark:hover:bg-[#101622]'
                  }`}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedOpForNote(null);
                    } else {
                      setSelectedOpForNote(colcha);
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Foto o Icono */}
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-zinc-100 dark:bg-black border border-zinc-200 dark:border-white/15 shrink-0 shadow-sm">
                      <SmartPhotoDisplay
                        rawUrl={colcha.fotoCalidadUrl || colcha.fotoMuestraUrl}
                        alt={colcha.op}
                        title={colcha.op}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Información */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-sm font-black text-zinc-900 dark:text-white">
                          {colcha.op}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {colcha.tieneRetraso && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800 px-1.5 py-0.5 rounded">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              RETRASO
                            </span>
                          )}
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase flex items-center gap-1 ${getStageBadge(colcha.estado)}`}>
                            {getStageIcon(colcha.estado)}
                            <span>{colcha.estado}</span>
                          </span>
                        </div>
                      </div>

                      <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate mt-0.5">
                        {colcha.tela}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                        <span>Ref: <strong className="text-zinc-700 dark:text-zinc-300">{colcha.referencia || 'N/A'}</strong></span>
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                          {colcha.diasHabiles} días hábiles
                        </span>
                      </div>
                    </div>

                    {/* Botón rápido */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConfirmShare(colcha);
                      }}
                      className="self-center px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shadow-md shadow-emerald-600/20 shrink-0 active:scale-95"
                    >
                      <span>Vincular</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Panel de Nota Opcional al expandir la OP seleccionada */}
                  {isSelected && (
                    <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-white/10 space-y-2 animate-in fade-in duration-150" onClick={(e) => e.stopPropagation()}>
                      <label className="text-[10px] font-bold uppercase text-zinc-500 dark:text-zinc-400 block">
                        Agregar mensaje o instrucción opcional para el equipo:
                      </label>
                      <input
                        type="text"
                        value={customNote}
                        onChange={(e) => setCustomNote(e.target.value)}
                        placeholder="Ej: @Edwin por favor priorizar lavado de esta colcha urgente..."
                        className="w-full px-3 py-2 bg-white dark:bg-[#07090e] border border-zinc-300 dark:border-white/15 rounded-xl text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 shadow-inner"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleConfirmShare(colcha);
                        }}
                      />
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setSelectedOpForNote(null)}
                          className="px-3 py-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white text-xs font-bold transition cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConfirmShare(colcha)}
                          className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold shadow-md shadow-emerald-600/25 flex items-center gap-1.5 cursor-pointer transition"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Enviar con Mensaje</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Pie */}
        <div className="p-3 bg-zinc-50/90 dark:bg-[#0c1017]/90 border-t border-zinc-200 dark:border-white/10 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
          <span>{filteredList.length} colchas disponibles</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-zinc-200/80 hover:bg-zinc-300 text-zinc-700 dark:bg-white/10 dark:hover:bg-white/20 dark:text-zinc-200 font-bold transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
