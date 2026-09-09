import React, { useState, useRef } from 'react';
import { X, ArrowRight, CheckCircle2, Camera, Upload, ImageIcon } from 'lucide-react';
import { SolicitudColcha, SectorType, DictamenType } from '../../types';
import { compressImageFile } from '../../services/googleSheetsService';

interface TransferModalProps {
  solicitud: SolicitudColcha | null;
  onClose: () => void;
  onConfirmTransfer: (
    solicitudId: string,
    nuevoEstado: SectorType,
    nuevaObservacion: string,
    dictamen?: DictamenType,
    fotoCalidad?: string
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
  const [fotoCalidadLocal, setFotoCalidadLocal] = useState<string | null>(solicitud.fotoCalidadUrl || null);
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const origenIsZF = Boolean(
    solicitud.observacionesOperario?.toUpperCase().includes('ATELIER') ||
    solicitud.observacionesOperario?.toUpperCase().includes('ZONA FRANCA') ||
    solicitud.observacionesOperario?.toUpperCase().includes('PRE-SOLICITUD') ||
    solicitud.inspector?.toUpperCase().includes('ZF') ||
    solicitud.inspector?.toUpperCase().includes('ATELIER') ||
    solicitud.inspector?.toUpperCase().includes('DIDIER') ||
    solicitud.inspector?.toUpperCase().includes('SEBASTIAN') ||
    solicitud.inspector?.toUpperCase().includes('2222')
  );
  const returnStage: SectorType = origenIsZF ? 'PRE_SOLICITUD' : 'SOLICITADO';

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsCompressingPhoto(true);
    try {
      const compressed = await compressImageFile(file, 650, 0.55);
      setFotoCalidadLocal(compressed);
    } catch (err) {
      console.error('Error comprimiendo foto:', err);
      alert('Error al procesar la fotografía.');
    } finally {
      setIsCompressingPhoto(false);
    }
  };

  const handleTransfer = () => {
    onConfirmTransfer(
      solicitud.id, 
      nextStep.next, 
      observacion, 
      dictamen, 
      fotoCalidadLocal || solicitud.fotoCalidadUrl
    );
    onClose();
  };

  const handleDevolverFromModal = () => {
    const returnObs = `[🚨 DEVOLUCIÓN POR LAVANDERÍA (ERROR)]: ${observacion.trim() || 'Novedad en proceso de lavado'}`;
    onConfirmTransfer(solicitud.id, returnStage, returnObs);
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
            {solicitud.estado === 'LAVANDERIA' ? 'GESTIÓN LAVANDERÍA (COLFACTORY ZF)' : 'MOVIMIENTO DE PLANTA / TRAZABILIDAD'}
          </span>
          <h3 className="text-lg font-black mt-2 font-mono text-white dark:text-zinc-950">
            {solicitud.estado === 'LAVANDERIA' ? `Gestión Lavandería ${solicitud.op}` : `Transferir Colcha ${solicitud.op}`}
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

        {/* Dictamen selector & photo upload if finishing from Calidad */}
        {solicitud.estado === 'CALIDAD' && (
          <div className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-zinc-300 dark:text-zinc-700 uppercase mb-1 font-mono">
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

            {/* Foto Post-Lavado (Calidad) upload */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-zinc-300 dark:text-zinc-700 uppercase font-mono flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5 text-purple-400" />
                  <span>Foto Post-Lavado (Calidad)</span>
                </label>
                <span className={`text-[10px] font-mono font-bold ${
                  fotoCalidadLocal ? 'text-emerald-400' : 'text-zinc-400'
                }`}>
                  {fotoCalidadLocal ? '✓ Foto Adjunta' : 'Opcional'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {fotoCalidadLocal ? (
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-purple-500/50 shrink-0">
                    <img src={fotoCalidadLocal} alt="Preview Calidad" className="w-full h-full object-cover" />
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={isCompressingPhoto}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 border border-zinc-700 dark:border-zinc-300 text-xs font-mono font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-purple-400" />
                  <span>{isCompressingPhoto ? 'Procesando...' : (fotoCalidadLocal ? 'Cambiar Foto Post-Lavado' : 'Tomar / Adjuntar Foto')}</span>
                </button>
                <input
                  type="file"
                  ref={photoInputRef}
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-[11px] font-bold text-zinc-300 dark:text-zinc-700 uppercase mb-1 font-mono">
            {solicitud.estado === 'LAVANDERIA' ? 'OBSERVACIONES DE ENVÍO' : 'Observación de Transferencia / Novedad'}
          </label>
          <textarea
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            rows={3}
            placeholder={solicitud.estado === 'LAVANDERIA' ? 'Notas sobre el lavado...' : 'Ingrese notas sobre el estado de la muestra al entregar...'}
            className="w-full bg-zinc-900/90 dark:bg-zinc-100 border border-zinc-800 dark:border-zinc-200 rounded-xl p-3 text-xs text-white dark:text-zinc-950 placeholder-zinc-400 focus:outline-none focus:border-amber-500 transition font-mono"
          />
        </div>

        {/* Actions */}
        {solicitud.estado === 'LAVANDERIA' ? (
          <div className="space-y-2.5 pt-2">
            <button
              onClick={handleTransfer}
              className="w-full py-3 rounded-xl bg-black hover:bg-zinc-900 text-white dark:bg-zinc-950 dark:hover:bg-zinc-800 border border-zinc-700 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
            >
              <span>ENVIAR A CALIDAD (STF)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleDevolverFromModal}
              className="w-full py-2.5 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-rose-400 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
            >
              <span>DEVOLVER (ERROR) A {origenIsZF ? 'PRE-SOLICITUD (ZF)' : 'SOLICITADOS'}</span>
            </button>
          </div>
        ) : (
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
        )}

      </div>
    </div>
  );
};
