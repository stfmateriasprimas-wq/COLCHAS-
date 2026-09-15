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
}

export const ChatOpsSelectorModal: React.FC<ChatOpsSelectorModalProps> = ({
  isOpen,
  onClose,
  solicitudes,
  onSelectOpToShare
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
      case 'PRE_SOLICITUD': return <Clock className="w-3.5 h-3.5 text-purple-400" />;
      case 'SOLICITADO': return <Send className="w-3.5 h-3.5 text-amber-400" />;
      case 'LAVANDERIA': return <Droplets className="w-3.5 h-3.5 text-sky-400" />;
      case 'CALIDAD': return <Microscope className="w-3.5 h-3.5 text-purple-400" />;
      case 'FINALIZADO': return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      default: return <Clock className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  const getStageBadge = (estado: string) => {
    switch (estado) {
      case 'PRE_SOLICITUD': return 'bg-purple-950/80 text-purple-300 border-purple-800';
      case 'SOLICITADO': return 'bg-amber-950/80 text-amber-300 border-amber-800';
      case 'LAVANDERIA': return 'bg-sky-950/80 text-sky-300 border-sky-800';
      case 'CALIDAD': return 'bg-purple-950/80 text-purple-300 border-purple-800';
      case 'FINALIZADO': return 'bg-emerald-950/80 text-emerald-300 border-emerald-800';
      default: return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 select-none">
      <div className="bg-[#111b21] border border-zinc-700 w-full max-w-2xl rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-[#e9edef]">
        
        {/* Encabezado */}
        <div className="p-3.5 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-[#202c33]/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white tracking-wide flex items-center gap-2">
                <span>Vincular OP al Chat</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                  EN TIEMPO REAL
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400">
                Selecciona una OP para compartir su ficha técnica interactiva en la conversación.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pestañas Superiores de Filtrado */}
        <div className="px-3.5 sm:px-5 pt-3 flex items-center gap-2 overflow-x-auto border-b border-zinc-800/80 bg-[#111b21] pb-2">
          <button
            type="button"
            onClick={() => setFilterType('RETRASO')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              filterType === 'RETRASO'
                ? 'bg-rose-500 text-white shadow-md'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>OPs en Retraso SLA</span>
            <span className="text-[10px] font-mono font-black px-1.5 py-0.2 rounded-full bg-black/40">
              {delayedOps.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType('PROCESO')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              filterType === 'PROCESO'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>En Proceso Activo</span>
            <span className="text-[10px] font-mono font-black px-1.5 py-0.2 rounded-full bg-black/40">
              {inProcessOps.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType('TODAS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              filterType === 'TODAS'
                ? 'bg-zinc-700 text-white'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <span>Todas ({solicitudes.length})</span>
          </button>
        </div>

        {/* Buscador de OPs en Tiempo Real */}
        <div className="p-3.5 sm:p-5 pb-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por OP (ej: 96156), tela, color o referencia..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#202c33] border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
              autoFocus
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Lista de OPs Filtradas */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 pt-1 space-y-2.5 custom-scroll max-h-[50vh]">
          {filteredList.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 space-y-2">
              <Filter className="w-8 h-8 mx-auto opacity-40" />
              <p className="text-xs">No se encontraron OPs con los filtros seleccionados.</p>
            </div>
          ) : (
            filteredList.map((colcha) => {
              const isSelected = selectedOpForNote?.id === colcha.id;

              return (
                <div
                  key={colcha.id}
                  className={`rounded-xl border p-3 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#202c33] border-emerald-500 ring-1 ring-emerald-500/50'
                      : 'bg-[#182229] border-zinc-800 hover:border-zinc-700 hover:bg-[#202c33]/60'
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
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-black border border-zinc-700 shrink-0">
                      <SmartPhotoDisplay
                        driveFolderUrl={colcha.fotoCalidadUrl || colcha.fotoMuestraUrl}
                        alt={colcha.op}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Información */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-sm font-black text-white">
                          {colcha.op}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {colcha.tieneRetraso && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black bg-rose-950 text-rose-300 border border-rose-800 px-1.5 py-0.5 rounded">
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

                      <div className="text-xs font-bold text-zinc-300 truncate mt-0.5">
                        {colcha.tela}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-1">
                        <span>Ref: <strong className="text-zinc-300">{colcha.referencia || 'N/A'}</strong></span>
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-zinc-500" />
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
                      className="self-center px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shadow-sm shrink-0"
                    >
                      <span>Vincular</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Panel de Nota Opcional al expandir la OP seleccionada */}
                  {isSelected && (
                    <div className="mt-3 pt-3 border-t border-zinc-700/80 space-y-2 animate-in fade-in duration-150" onClick={(e) => e.stopPropagation()}>
                      <label className="text-[10px] font-bold uppercase text-zinc-400 block">
                        Agregar mensaje o instrucción opcional para el equipo:
                      </label>
                      <input
                        type="text"
                        value={customNote}
                        onChange={(e) => setCustomNote(e.target.value)}
                        placeholder="Ej: @Edwin por favor priorizar lavado de esta colcha urgente..."
                        className="w-full px-3 py-2 bg-[#111b21] border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleConfirmShare(colcha);
                        }}
                      />
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setSelectedOpForNote(null)}
                          className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white text-xs font-bold"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConfirmShare(colcha)}
                          className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
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
        <div className="p-3 bg-[#202c33]/80 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
          <span>{filteredList.length} colchas disponibles</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
