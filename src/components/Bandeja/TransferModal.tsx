import React, { useState } from 'react';
import { X, ArrowRight, CheckCircle2 } from 'lucide-react';
import { SolicitudColcha, SectorType, DictamenType } from '../../types';

interface TransferModalProps {
  solicitud: SolicitudColcha | null;
  onClose: () => void;
  onConfirmTransfer: (
    solicitudId: string,
    nuevoEstado: SectorType,
    nuevaObservacion: string,
    dictamen?: DictamenType
  ) => void;
}

const NEXT_SECTOR: Record<SectorType, { next: SectorType; label: string; area: string }> = {
  PRE_SOLICITUD: { next: 'LAVANDERIA', label: 'LAVANDERÍA COLFACTORY ZF', area: 'LAVANDERÍA COLFACTORY ZF' },
  SOLICITADO: { next: 'LAVANDERIA', label: 'LAVANDERÍA COLFACTORY ZF', area: 'LAVANDERÍA COLFACTORY ZF' },
  LAVANDERIA: { next: 'CALIDAD', label: 'CALIDAD STF (Laboratorio)', area: 'CALIDAD STF LABORATORIO' },
  CALIDAD: { next: 'FINALIZADO', label: 'FINALIZADO (Liberar Muestra)', area: 'CALIDAD PLANTA STF' },
  FINALIZADO: { next: 'FINALIZADO', label: 'FINALIZADO', area: 'FINALIZADO' }
};

export const TransferModal: React.FC<TransferModalProps> = ({
  solicitud,
  onClose,
  onConfirmTransfer
}) => {
  if (!solicitud) return null;

  const nextStep = NEXT_SECTOR[solicitud.estado];
  const [observacion, setObservacion] = useState('');
  const [dictamen, setDictamen] = useState<DictamenType>('APROBADO');

  const handleTransfer = () => {
    onConfirmTransfer(solicitud.id, nextStep.next, observacion, dictamen);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#0c1017] dark:bg-white border border-zinc-800 dark:border-zinc-200 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative text-white dark:text-zinc-950">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white dark:text-zinc-600 dark:hover:text-zinc-950 p-1 rounded-xl cursor-pointer hover:bg-zinc-800 dark:hover:bg-zinc-200 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <span className="text-[10px] bg-zinc-900 dark:bg-zinc-100 text-zinc-300 dark:text-zinc-700 font-mono font-bold px-2.5 py-0.5 rounded-full border border-zinc-700 dark:border-zinc-300">
            MOVIMIENTO DE PLANTA / TRAZABILIDAD
          </span>
          <h3 className="text-lg font-black mt-2 font-mono text-white dark:text-zinc-950">
            Transferir Colcha {solicitud.op}
          </h3>
          <p className="text-xs text-zinc-400 dark:text-zinc-600 font-mono mt-0.5">
            Ref: <strong className="text-white dark:text-zinc-950">{solicitud.referencia}</strong> • Tela: {solicitud.tela}
          </p>
        </div>

        {/* Transition Preview */}
        <div className="bg-zinc-900/90 dark:bg-zinc-100 p-4 rounded-2xl border border-zinc-800 dark:border-zinc-200 flex items-center justify-between gap-3 text-xs font-mono">
          <div className="text-center flex-1">
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block uppercase font-sans font-bold">Origen Actual</span>
            <span className="font-bold text-zinc-300 dark:text-zinc-700">{solicitud.estado.replace('_', '-')}</span>
          </div>
          <ArrowRight className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <div className="text-center flex-1">
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block uppercase font-sans font-bold">Destino Siguiente</span>
            <span className="font-bold text-white dark:text-zinc-950">{nextStep.label}</span>
          </div>
        </div>

        {/* Dictamen selector if finishing */}
        {solicitud.estado === 'CALIDAD' && (
          <div>
            <label className="block text-[11px] font-bold text-zinc-300 dark:text-zinc-700 uppercase mb-1">
              Dictamen Final de Calidad
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDictamen('APROBADO')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 font-mono ${
                  dictamen === 'APROBADO'
                    ? 'bg-emerald-500 text-black border-emerald-500 font-black shadow-md'
                    : 'bg-zinc-900 dark:bg-zinc-100 text-zinc-400 dark:text-zinc-600 border-zinc-800 dark:border-zinc-200'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>APROBADO</span>
              </button>
              <button
                type="button"
                onClick={() => setDictamen('RECHAZADO')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 font-mono ${
                  dictamen === 'RECHAZADO'
                    ? 'bg-rose-600 text-white border-rose-600 font-black shadow-md'
                    : 'bg-zinc-900 dark:bg-zinc-100 text-zinc-400 dark:text-zinc-600 border-zinc-800 dark:border-zinc-200'
                }`}
              >
                <span>RECHAZADO</span>
              </button>
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-[11px] font-bold text-zinc-300 dark:text-zinc-700 uppercase mb-1">
            Observación de Transferencia / Novedad
          </label>
          <textarea
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            rows={3}
            placeholder="Ingrese notas sobre el estado de la muestra al entregar..."
            className="w-full bg-zinc-900/90 dark:bg-zinc-100 border border-zinc-800 dark:border-zinc-200 rounded-xl p-3 text-xs text-white dark:text-zinc-950 placeholder-zinc-400 focus:outline-none focus:border-amber-500 transition"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-zinc-800 dark:border-zinc-300 text-zinc-300 dark:text-zinc-700 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-xs font-bold transition cursor-pointer"
          >
            CANCELAR
          </button>
          <button
            onClick={handleTransfer}
            className="flex-1 py-2.5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-800 text-xs font-black flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
          >
            <span>CONFIRMAR TRASLADO</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
