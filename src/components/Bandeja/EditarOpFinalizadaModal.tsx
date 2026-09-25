import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Camera, Upload, Folder, CheckCircle2, AlertCircle, 
  ExternalLink, RefreshCw, Shirt, Save, Plus, Trash2, 
  Eye, FileText, Check, Sparkles 
} from 'lucide-react';
import { SolicitudColcha } from '../../types';
import { UsuarioSTF } from '../../services/authService';
import { 
  compressImageFile, 
  saveOpFinalizadaEdicion, 
  getOpPhotosFromCache, 
  fetchOpPhotosFromDrive, 
  normalizeImageUrl, 
  formatOpCode 
} from '../../services/googleSheetsService';
import { notificationService } from '../../services/notificationService';

interface EditarOpFinalizadaModalProps {
  solicitud: SolicitudColcha | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UsuarioSTF | null;
  onSuccess?: (updated: {
    observacionesLavanderia: string;
    observacionesCalidad: string;
    fotoPrenda1?: string;
    fotoPrenda2?: string;
    folderUrl?: string;
  }) => void;
}

export const EditarOpFinalizadaModal: React.FC<EditarOpFinalizadaModalProps> = ({
  solicitud,
  isOpen,
  onClose,
  currentUser,
  onSuccess
}) => {
  // Estados para Fotos de Prenda Terminada (1 y 2)
  const [fotoPrenda1Preview, setFotoPrenda1Preview] = useState<string | null>(null);
  const [fotoPrenda2Preview, setFotoPrenda2Preview] = useState<string | null>(null);
  const [fotoPrenda1NewBase64, setFotoPrenda1NewBase64] = useState<string | null>(null);
  const [fotoPrenda2NewBase64, setFotoPrenda2NewBase64] = useState<string | null>(null);

  // Estados para Observaciones
  const [obsLavanderia, setObsLavanderia] = useState('');
  const [obsCalidad, setObsCalidad] = useState('');
  const [obsAdicional, setObsAdicional] = useState('');

  // Estados de proceso
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [driveFolderUrl, setDriveFolderUrl] = useState<string | null>(null);
  const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null);

  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);

  // Inicializar estados al abrir con la OP seleccionada
  useEffect(() => {
    if (!solicitud || !isOpen) {
      setFotoPrenda1Preview(null);
      setFotoPrenda2Preview(null);
      setFotoPrenda1NewBase64(null);
      setFotoPrenda2NewBase64(null);
      setObsLavanderia('');
      setObsCalidad('');
      setObsAdicional('');
      setErrorMessage(null);
      setStatusMessage('');
      setIsSaving(false);
      return;
    }

    // Inicializar observaciones
    setObsLavanderia(solicitud.observacionesLavanderia || '');
    setObsCalidad(solicitud.observacionesCalidad || '');
    setObsAdicional('');

    // Cargar fotos desde caché o solicitud
    const cached = getOpPhotosFromCache(solicitud.op);
    const existingP1 = normalizeImageUrl(solicitud.fotoPrendaTerminada1Url || cached?.fotoPrenda1);
    const existingP2 = normalizeImageUrl(solicitud.fotoPrendaTerminada2Url || cached?.fotoPrenda2);
    const existingFolder = solicitud.driveFolderUrl || cached?.folderUrl;

    setFotoPrenda1Preview(existingP1 || null);
    setFotoPrenda2Preview(existingP2 || null);
    setDriveFolderUrl(existingFolder || null);

    // Si no hay fotos de prenda en cache, consultar a Drive en segundo plano
    if (!existingP1 || !existingP2 || !existingFolder) {
      fetchOpPhotosFromDrive(solicitud.op).then((driveRes) => {
        if (driveRes.folderUrl) setDriveFolderUrl(driveRes.folderUrl);
        if (driveRes.fotoPrenda1 && !fotoPrenda1NewBase64) {
          setFotoPrenda1Preview(driveRes.fotoPrenda1);
        }
        if (driveRes.fotoPrenda2 && !fotoPrenda2NewBase64) {
          setFotoPrenda2Preview(driveRes.fotoPrenda2);
        }
      }).catch(() => {});
    }
  }, [solicitud, isOpen]);

  if (!isOpen || !solicitud) return null;

  // Manejar selección de Foto 1 (Prenda Terminada 1)
  const handleSelectFotoPrenda1 = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setStatusMessage('Comprimiendo Prenda Terminada 1...');
      const compressed = await compressImageFile(file, 680, 0.52);
      setFotoPrenda1Preview(compressed);
      setFotoPrenda1NewBase64(compressed);
      setStatusMessage('');
    } catch (err) {
      setErrorMessage('Error al procesar la imagen de Prenda Terminada 1');
    } finally {
      if (fileInputRef1.current) fileInputRef1.current.value = '';
    }
  };

  // Manejar selección de Foto 2 (Prenda Terminada 2)
  const handleSelectFotoPrenda2 = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setStatusMessage('Comprimiendo Prenda Terminada 2...');
      const compressed = await compressImageFile(file, 680, 0.52);
      setFotoPrenda2Preview(compressed);
      setFotoPrenda2NewBase64(compressed);
      setStatusMessage('');
    } catch (err) {
      setErrorMessage('Error al procesar la imagen de Prenda Terminada 2');
    } finally {
      if (fileInputRef2.current) fileInputRef2.current.value = '';
    }
  };

  // Helper para anexar la observación adicional con firma del usuario y fecha
  const handleAnexarObservacion = () => {
    if (!obsAdicional.trim()) return;
    const now = new Date();
    const fechaStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const usuarioStr = currentUser ? currentUser.nombre : 'LAVANDERÍA';
    const nuevaNota = `[PRENDA TERMINADA - ${fechaStr} por ${usuarioStr}]: ${obsAdicional.trim()}`;
    
    setObsCalidad(prev => prev ? `${prev} • ${nuevaNota}` : nuevaNota);
    setObsAdicional('');
  };

  // Guardar todos los cambios y subir a Drive
  const handleGuardarCambios = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setStatusMessage('Archivando fotos en Drive y actualizando observaciones...');

    try {
      const res = await saveOpFinalizadaEdicion({
        op: solicitud.op,
        referencia: solicitud.referencia,
        tela: solicitud.tela,
        fechaCreacion: solicitud.fechaCreacion,
        mes: solicitud.mes,
        observacionesLavanderia: obsLavanderia.trim(),
        observacionesCalidad: obsCalidad.trim(),
        fotoPrenda1Base64: fotoPrenda1NewBase64 || undefined,
        fotoPrenda2Base64: fotoPrenda2NewBase64 || undefined,
        usuario: currentUser?.nombre || 'LAVANDERÍA'
      });

      try {
        notificationService.playAlertSound('EXITO');
      } catch (e) {}

      if (onSuccess) {
        onSuccess({
          observacionesLavanderia: obsLavanderia.trim(),
          observacionesCalidad: obsCalidad.trim(),
          fotoPrenda1: res.fotoPrenda1 || fotoPrenda1Preview || undefined,
          fotoPrenda2: res.fotoPrenda2 || fotoPrenda2Preview || undefined,
          folderUrl: res.folderUrl || driveFolderUrl || undefined
        });
      }

      onClose();
    } catch (err: any) {
      console.error('Error al guardar edición de OP finalizada:', err);
      setErrorMessage(err.message || 'No fue posible archivar en Google Drive. Intente de nuevo.');
    } finally {
      setIsSaving(false);
      setStatusMessage('');
    }
  };

  const cachedPhotos = getOpPhotosFromCache(solicitud.op);
  const foto1InicialUrl = solicitud.fotoMuestraUrl || cachedPhotos?.foto1;
  const foto2CalidadUrl = solicitud.fotoCalidadUrl || cachedPhotos?.foto2;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative bg-white dark:bg-[#0d121c] border-2 border-amber-500/40 dark:border-amber-500/30 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden text-zinc-950 dark:text-white my-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-56 h-56 bg-amber-500/10 dark:bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header Modal */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 bg-amber-50/60 dark:bg-zinc-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 dark:bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-xs">
              <Shirt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black font-mono tracking-tight text-zinc-950 dark:text-white">
                  EDICIÓN DE OP FINALIZADA
                </h3>
                <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40">
                  {solicitud.dictamen || 'LIBERADA'}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                Carga de evidencias de Prenda Terminada y actualización de observaciones técnicas
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* OP Summary Bar */}
        <div className="px-5 py-3 bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <span className="font-black text-amber-700 dark:text-amber-400 text-sm">{solicitud.op}</span>
            <span className="text-zinc-400">•</span>
            <span className="text-zinc-600 dark:text-zinc-300">REF: <strong>{solicitud.referencia}</strong></span>
            <span className="text-zinc-400">•</span>
            <span className="text-zinc-600 dark:text-zinc-300">TELA: <strong>{solicitud.tela}</strong></span>
            <span className="text-zinc-400">•</span>
            <span className="text-zinc-600 dark:text-zinc-300">COLOR: <strong>{solicitud.color}</strong></span>
            <span className="text-zinc-400">•</span>
            <span className="text-zinc-600 dark:text-zinc-300">{solicitud.rollos} Rollos</span>
          </div>

          {driveFolderUrl && (
            <a
              href={driveFolderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-[11px] font-bold transition"
              title="Abrir carpeta oficial de la OP en Google Drive"
            >
              <Folder className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Ver Carpeta Drive</span>
              <ExternalLink className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            </a>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[72vh] overflow-y-auto">

          {/* MENSAJES DE ERROR O ESTADO */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECCIÓN 1: FOTOS DE PRENDA TERMINADA (2 FOTOS A GOOGLE DRIVE)              */}
          {/* ========================================================================= */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider font-mono flex items-center gap-2">
                <Camera className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>EVIDENCIAS DE PRENDA TERMINADA (2 FOTOS EN DRIVE)</span>
              </h4>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                Se archivarán en la carpeta de la OP en Google Drive
              </span>
            </div>

            {/* Dos Slots de Prenda Terminada */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* SLOT 1: PRENDA TERMINADA 1 (FRENTE / GENERAL) */}
              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border-2 border-dashed border-amber-300 dark:border-amber-500/40 flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <span>1. Prenda Terminada (Frente / General)</span>
                  </span>
                  <span className={`text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    fotoPrenda1NewBase64 
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                      : fotoPrenda1Preview 
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                      : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}>
                    {fotoPrenda1NewBase64 ? '✓ Lista para subir' : fotoPrenda1Preview ? '✓ En Drive' : 'Sin foto'}
                  </span>
                </div>

                {fotoPrenda1Preview ? (
                  <div className="relative w-full h-44 rounded-xl overflow-hidden group bg-black/40 border border-zinc-200 dark:border-zinc-700">
                    <img 
                      src={fotoPrenda1Preview} 
                      alt="Prenda Terminada 1" 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain cursor-pointer transition group-hover:scale-105"
                      onClick={() => setZoomedPhoto(fotoPrenda1Preview)}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setZoomedPhoto(fotoPrenda1Preview)}
                        className="p-2 rounded-xl bg-black/70 hover:bg-black text-white text-xs font-mono font-bold flex items-center gap-1 cursor-pointer"
                        title="Ver en grande"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ampliar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef1.current?.click()}
                        className="p-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-mono font-bold flex items-center gap-1 cursor-pointer"
                        title="Cambiar foto"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Cambiar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFotoPrenda1Preview(null);
                          setFotoPrenda1NewBase64(null);
                        }}
                        className="p-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold flex items-center gap-1 cursor-pointer"
                        title="Quitar foto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef1.current?.click()}
                    className="w-full h-44 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-amber-500 bg-white dark:bg-zinc-950 flex flex-col items-center justify-center text-center cursor-pointer transition group p-4"
                  >
                    <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-600/40 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition mb-2">
                      <Camera className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold font-mono text-zinc-800 dark:text-zinc-200">
                      Tomar foto o seleccionar archivo
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono mt-1">
                      JPG o PNG • Guardado automático en Drive
                    </span>
                  </div>
                )}

                <input 
                  ref={fileInputRef1}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleSelectFotoPrenda1}
                  className="hidden"
                />
              </div>

              {/* SLOT 2: PRENDA TERMINADA 2 (POSTERIOR / DETALLE) */}
              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border-2 border-dashed border-amber-300 dark:border-amber-500/40 flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <span>2. Prenda Terminada (Posterior / Detalle)</span>
                  </span>
                  <span className={`text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    fotoPrenda2NewBase64 
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                      : fotoPrenda2Preview 
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                      : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}>
                    {fotoPrenda2NewBase64 ? '✓ Lista para subir' : fotoPrenda2Preview ? '✓ En Drive' : 'Sin foto'}
                  </span>
                </div>

                {fotoPrenda2Preview ? (
                  <div className="relative w-full h-44 rounded-xl overflow-hidden group bg-black/40 border border-zinc-200 dark:border-zinc-700">
                    <img 
                      src={fotoPrenda2Preview} 
                      alt="Prenda Terminada 2" 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain cursor-pointer transition group-hover:scale-105"
                      onClick={() => setZoomedPhoto(fotoPrenda2Preview)}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setZoomedPhoto(fotoPrenda2Preview)}
                        className="p-2 rounded-xl bg-black/70 hover:bg-black text-white text-xs font-mono font-bold flex items-center gap-1 cursor-pointer"
                        title="Ver en grande"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ampliar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef2.current?.click()}
                        className="p-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-mono font-bold flex items-center gap-1 cursor-pointer"
                        title="Cambiar foto"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Cambiar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFotoPrenda2Preview(null);
                          setFotoPrenda2NewBase64(null);
                        }}
                        className="p-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold flex items-center gap-1 cursor-pointer"
                        title="Quitar foto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef2.current?.click()}
                    className="w-full h-44 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-amber-500 bg-white dark:bg-zinc-950 flex flex-col items-center justify-center text-center cursor-pointer transition group p-4"
                  >
                    <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-600/40 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition mb-2">
                      <Camera className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold font-mono text-zinc-800 dark:text-zinc-200">
                      Tomar foto o seleccionar archivo
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono mt-1">
                      JPG o PNG • Guardado automático en Drive
                    </span>
                  </div>
                )}

                <input 
                  ref={fileInputRef2}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleSelectFotoPrenda2}
                  className="hidden"
                />
              </div>

            </div>

            {/* Referencia Fotográfica Previa: Foto 1 Inicial y Foto 2 Calidad */}
            {(foto1InicialUrl || foto2CalidadUrl) && (
              <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between gap-3 text-xs font-mono">
                <span className="text-[10.5px] font-bold text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Historial de la OP:</span>
                </span>
                <div className="flex items-center gap-2">
                  {foto1InicialUrl && (
                    <button
                      type="button"
                      onClick={() => setZoomedPhoto(foto1InicialUrl)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 cursor-pointer shadow-xs hover:border-emerald-500"
                    >
                      <Eye className="w-2.5 h-2.5" />
                      <span>Foto 1 (Inicial)</span>
                    </button>
                  )}
                  {foto2CalidadUrl && (
                    <button
                      type="button"
                      onClick={() => setZoomedPhoto(foto2CalidadUrl)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-[10px] font-bold text-purple-700 dark:text-purple-400 cursor-pointer shadow-xs hover:border-purple-500"
                    >
                      <Eye className="w-2.5 h-2.5" />
                      <span>Foto 2 (Calidad)</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* SECCIÓN 2: GESTIÓN DE OBSERVACIONES (EDICIÓN Y NUEVA NOTA ADICIONAL)       */}
          {/* ========================================================================= */}
          <div className="space-y-4 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider font-mono flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>GESTIÓN Y EDICIÓN DE OBSERVACIONES TÉCNICAS</span>
            </h4>

            {/* 1. Observación de Lavandería (Columna L) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider font-mono flex items-center justify-between">
                <span>1. Observaciones de Lavandería (Colfactory ZF)</span>
                <span className="text-[9.5px] text-zinc-400 font-normal">Columna L de Sheets</span>
              </label>
              <textarea
                value={obsLavanderia}
                onChange={(e) => setObsLavanderia(e.target.value)}
                rows={2}
                placeholder="Procesos de lavado, formulación química, novedades de máquina..."
                className="w-full bg-white dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 text-xs text-zinc-950 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-amber-500 transition font-mono shadow-xs"
              />
            </div>

            {/* 2. Observación de Calidad / Dictamen (Columna 14/15) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider font-mono flex items-center justify-between">
                <span>2. Observaciones de Calidad / Liberación Final</span>
                <span className="text-[9.5px] text-zinc-400 font-normal">Columna 14 de Sheets</span>
              </label>
              <textarea
                value={obsCalidad}
                onChange={(e) => setObsCalidad(e.target.value)}
                rows={2}
                placeholder="Evaluación técnica de encogimiento, tono, revirado y liberación..."
                className="w-full bg-white dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 text-xs text-zinc-950 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-amber-500 transition font-mono shadow-xs"
              />
            </div>

            {/* 3. Agregar Observación Adicional con Firma */}
            <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 space-y-2">
              <label className="text-[11px] font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-amber-600" />
                <span>Agregar Nota Adicional de Prenda Terminada</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={obsAdicional}
                  onChange={(e) => setObsAdicional(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAnexarObservacion();
                    }
                  }}
                  placeholder="Ej: Prenda terminada conforme con muestra, entregada a confección..."
                  className="flex-1 bg-white dark:bg-zinc-950 border border-amber-300 dark:border-amber-700/60 rounded-xl px-3 py-2 text-xs text-zinc-950 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-amber-500 font-mono shadow-xs"
                />
                <button
                  type="button"
                  onClick={handleAnexarObservacion}
                  disabled={!obsAdicional.trim()}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-mono font-bold text-xs rounded-xl transition cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Anexar Nota</span>
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
            {statusMessage && (
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{statusMessage}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-mono font-bold transition cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleGuardarCambios}
              disabled={isSaving}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-mono font-black flex items-center justify-center gap-2 transition cursor-pointer shadow-md shadow-amber-600/25 active:scale-95 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-200" />
                  <span>Guardando en Drive...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-amber-100" />
                  <span>GUARDAR CAMBIOS & SUBIR A DRIVE</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* Visor de Zoom de Foto */}
      {zoomedPhoto && (
        <div 
          onClick={() => setZoomedPhoto(null)}
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
        >
          <div 
            className="relative max-w-3xl w-full max-h-[85vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              type="button"
              onClick={() => setZoomedPhoto(null)}
              className="absolute -top-12 right-0 sm:top-2 sm:right-2 p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white cursor-pointer z-10 shadow-lg"
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={zoomedPhoto} 
              alt="Prenda Terminada Ampliada" 
              referrerPolicy="no-referrer"
              className="max-h-[75vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl border border-zinc-700 bg-zinc-950"
            />
            <div className="mt-3 text-xs font-mono font-bold text-zinc-200 bg-zinc-900/90 px-4 py-2 rounded-full border border-zinc-700 shadow-md">
              {solicitud.op} • REF: {solicitud.referencia} • {solicitud.tela}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
