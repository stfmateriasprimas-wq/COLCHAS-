import React, { useState, useEffect } from 'react';
import { 
  Trash2, RotateCcw, Clock, ShieldAlert, CheckCircle2, 
  Search, AlertTriangle, Layers, Calendar, User, ArrowRight, Eye
} from 'lucide-react';
import { 
  DeletedOpRecord, 
  getDeletedOpsHistory, 
  subscribeDeletedOps, 
  restoreOpFromDeletedHistory,
  purgeDeletedOp 
} from '../../services/deletedOpsService';
import { UsuarioSTF } from '../../services/authService';
import { notificationService } from '../../services/notificationService';
import { SolicitudColcha } from '../../types';

interface DeletedOpsHistorySectionProps {
  currentUser?: UsuarioSTF | null;
  onOpRestored?: (solicitud: SolicitudColcha) => void;
  onViewDetail?: (solicitud: SolicitudColcha) => void;
}

export const DeletedOpsHistorySection: React.FC<DeletedOpsHistorySectionProps> = ({
  currentUser,
  onOpRestored,
  onViewDetail
}) => {
  const [deletedList, setDeletedList] = useState<DeletedOpRecord[]>(getDeletedOpsHistory);
  const [search, setSearch] = useState('');
  const [restoredOpSuccess, setRestoredOpSuccess] = useState<string | null>(null);
  const [isConfirmingPurge, setIsConfirmingPurge] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeDeletedOps((list) => {
      setDeletedList(list);
    });
    return unsub;
  }, []);

  const handleRestore = (record: DeletedOpRecord) => {
    const restored = restoreOpFromDeletedHistory(record.id);
    if (restored) {
      setRestoredOpSuccess(restored.op);
      notificationService.playAlertSound('EXITO');
      if (onOpRestored) {
        onOpRestored(restored);
      }
      setTimeout(() => setRestoredOpSuccess(null), 3000);
    }
  };

  const handlePurge = (recordId: string) => {
    purgeDeletedOp(recordId);
    setIsConfirmingPurge(null);
  };

  const filteredDeleted = deletedList.filter(item => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      item.op.toLowerCase().includes(q) ||
      item.referencia.toLowerCase().includes(q) ||
      item.tela.toLowerCase().includes(q) ||
      item.inspector.toLowerCase().includes(q) ||
      item.fechaEliminacion.toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-[#0e090a] dark:bg-white border-2 border-rose-900/60 dark:border-rose-200 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 text-white dark:text-zinc-950 transition-all duration-200">
      
      {/* 1. SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-900/50 dark:border-rose-200/80 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-7 h-7 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <Trash2 className="w-4 h-4" />
            </div>
            <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-rose-300 dark:text-rose-800 font-mono">
              HISTORIAL DE OPS ELIMINADAS (EDWIN – ADMINISTRADOR)
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black bg-rose-500 text-white uppercase">
              {deletedList.length} ELIMINADA{deletedList.length === 1 ? '' : 'S'}
            </span>
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-600">
            Registro de auditoría de órdenes retiradas del flujo de trabajo con fecha de eliminación y botón de recuperación inmediata al estado original.
          </p>
        </div>

        {/* Quick Search */}
        {deletedList.length > 0 && (
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar OP eliminada..."
              className="w-full bg-zinc-900 dark:bg-zinc-100 border border-zinc-700 dark:border-zinc-300 rounded-2xl pl-9 pr-3 py-1.5 text-xs font-mono font-bold text-white dark:text-zinc-950 focus:outline-none focus:border-rose-500"
            />
          </div>
        )}
      </div>

      {/* Success Notification Banner */}
      {restoredOpSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-950 border border-emerald-500 text-emerald-300 text-xs font-bold flex items-center justify-between animate-in zoom-in-95">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>¡OP-{restoredOpSuccess} restaurada con éxito en el sistema de trabajo en su fase original!</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 uppercase">Activa en Bandeja</span>
        </div>
      )}

      {/* 2. DELETED OPS LIST OR EMPTY STATE */}
      {deletedList.length === 0 ? (
        <div className="p-8 text-center bg-zinc-950/60 dark:bg-zinc-50 border border-dashed border-rose-900/40 dark:border-rose-200 rounded-2xl space-y-2">
          <div className="w-10 h-10 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto text-base">
            ✓
          </div>
          <h4 className="text-xs font-black uppercase text-zinc-300 dark:text-zinc-700 font-mono">
            No hay órdenes de producción eliminadas
          </h4>
          <p className="text-[11px] text-zinc-500 max-w-md mx-auto">
            Todas las órdenes de producción están activas y registradas en el sistema de trabajo. Si Edwin elimina una OP desde la tarjeta, aparecerá aquí con su fecha y opción de restauración.
          </p>
        </div>
      ) : filteredDeleted.length === 0 ? (
        <div className="p-6 text-center text-xs text-zinc-500">
          No se encontraron coincidencias para "{search}".
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDeleted.map((item) => (
            <div
              key={item.id}
              className="bg-zinc-950/90 dark:bg-zinc-50 border border-rose-900/50 dark:border-rose-200 hover:border-rose-500 rounded-2xl p-4 transition-all duration-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm"
            >
              {/* Left Details */}
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-black font-mono text-rose-400 dark:text-rose-700">
                    OP-{item.op}
                  </span>
                  <span className="text-xs font-bold text-zinc-300 dark:text-zinc-700 font-mono">
                    / REF – {item.referencia}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-zinc-900 dark:bg-zinc-200 text-zinc-300 dark:text-zinc-800 border border-zinc-700 dark:border-zinc-300">
                    {item.tela}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-blue-950 dark:bg-blue-100 text-blue-300 dark:text-blue-800 border border-blue-800 dark:border-blue-300">
                    {item.color}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-zinc-400 dark:text-zinc-600 font-mono flex-wrap">
                  <span>🧵 <strong>{item.rollos} Rollos ({item.rollos * 85} Mt)</strong></span>
                  <span>•</span>
                  <span>Fase original al eliminar: <strong className="text-amber-400 dark:text-amber-600 uppercase">{item.estadoOriginal.replace('_', ' ')}</strong></span>
                  <span>•</span>
                  <span>Ubicación: <strong>{item.areaActual}</strong></span>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-zinc-400 dark:text-zinc-500 font-mono pt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-rose-400" />
                  <span>Eliminada el: <strong className="text-white dark:text-zinc-950 font-bold">{item.fechaEliminacion}</strong></span>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:inline">Por: <strong>{item.eliminadoPor}</strong></span>
                </div>
              </div>

              {/* Right Action Buttons */}
              <div className="flex items-center gap-2 self-start lg:self-center shrink-0 flex-wrap">
                {onViewDetail && (
                  <button
                    type="button"
                    onClick={() => onViewDetail(item.solicitudOriginal)}
                    className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-200 dark:hover:bg-zinc-300 text-zinc-300 dark:text-zinc-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    title="Ver ficha técnica original de esta OP"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ver Ficha</span>
                  </button>
                )}

                {/* Main Restore Button */}
                <button
                  type="button"
                  onClick={() => handleRestore(item)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-black text-xs font-mono flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition cursor-pointer"
                  title="Restaurar esta OP inmediatamente al sistema de trabajo en su fase original"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>RECUPERAR OP</span>
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
};
