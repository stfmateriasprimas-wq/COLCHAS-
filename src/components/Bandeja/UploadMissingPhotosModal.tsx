import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Camera, Upload, Folder, CheckCircle2, AlertCircle, 
  ExternalLink, RefreshCw, Calendar, Tag, ShieldCheck,
  ImageIcon, Trash2, ArrowRight
} from 'lucide-react';
import { SolicitudColcha } from '../../types';
import { 
  compressImageFile, 
  uploadMissingOpPhotos, 
  getOpPhotosFromCache,
  fetchOpPhotosFromDrive,
  normalizeImageUrl,
  formatOpCode,
  saveOpPhotosToCache,
  updateLocalOpPhoto
} from '../../services/googleSheetsService';

interface UploadMissingPhotosModalProps {
  solicitud: SolicitudColcha | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (photos: { foto1?: string; foto2?: string; folderUrl?: string }) => void;
}

const MONTH_NAMES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
];

export const UploadMissingPhotosModal: React.FC<UploadMissingPhotosModalProps> = ({
  solicitud,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [foto1NewBase64, setFoto1NewBase64] = useState<string | null>(null);
  const [foto2NewBase64, setFoto2NewBase64] = useState<string | null>(null);
  
  const [foto1Preview, setFoto1Preview] = useState<string | null>(null);
  const [foto2Preview, setFoto2Preview] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ folderUrl?: string; foto1?: string; foto2?: string } | null>(null);

  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);

  // Cargar fotos iniciales existentes (en cache o de la solicitud)
  useEffect(() => {
    if (!solicitud || !isOpen) {
      setFoto1NewBase64(null);
      setFoto2NewBase64(null);
      setFoto1Preview(null);
      setFoto2Preview(null);
      setErrorMessage(null);
      setSuccessData(null);
      setUploadStatus('');
      return;
    }

    const cached = getOpPhotosFromCache(solicitud.op);
    const existingFoto1 = normalizeImageUrl(solicitud.fotoMuestraUrl || cached?.foto1);
    const existingFoto2 = normalizeImageUrl(solicitud.fotoCalidadUrl || cached?.foto2);

    setFoto1Preview(existingFoto1 || null);
    setFoto2Preview(existingFoto2 || null);
    setFoto1NewBase64(null);
    setFoto2NewBase64(null);
    setErrorMessage(null);
    setSuccessData(null);
    setUploadStatus('');

    // Si no estaban en caché, consultar a Drive
    if (!existingFoto1 && !existingFoto2) {
      fetchOpPhotosFromDrive(solicitud.op).then(res => {
        if (res.foto1) setFoto1Preview(normalizeImageUrl(res.foto1) || null);
        if (res.foto2) setFoto2Preview(normalizeImageUrl(res.foto2) || null);
      });
    }
  }, [solicitud, isOpen]);

  if (!isOpen || !solicitud) return null;

  const formattedOp = formatOpCode(solicitud.op);

  // Determinar carpeta histórica en base a fecha de creación de la OP
  const getHistoricalFolderInfo = () => {
    let year = 2026;
    let monthIdx = new Date().getMonth(); // 0-indexed

    const rawFecha = solicitud.fechaCreacion || '';
    if (rawFecha) {
      const parts = rawFecha.split(/[\/\-\s]/);
      if (parts.length >= 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const y = parseInt(parts[2], 10);
        if (!isNaN(m) && m >= 1 && m <= 12) {
          monthIdx = m - 1;
        }
        if (!isNaN(y)) {
          year = y < 100 ? 2000 + y : y;
        }
      } else {
        const parsed = new Date(rawFecha);
        if (!isNaN(parsed.getTime())) {
          monthIdx = parsed.getMonth();
          year = parsed.getFullYear();
        }
      }
    }

    const monthNum = String(monthIdx + 1).padStart(2, '0');
    const monthName = MONTH_NAMES[monthIdx] || 'MES';
    const folderName = `${year}-${monthNum} - ${monthName}`;
    const fullPath = `STF_COLCHAS_EVIDENCIAS / ${folderName} / ${formattedOp}`;

    return {
      year,
      monthNumber: monthIdx + 1,
      monthName,
      folderName,
      fullPath
    };
  };

  const folderInfo = getHistoricalFolderInfo();
  const isFinalizado = solicitud.estado === 'FINALIZADO';

  // Guardar y sincronizar con Google Drive y Google Sheets automáticamente
  const executeSaveToDrive = async (overrideB64?: string, slot?: 1 | 2) => {
    if (isUploading) return;

    const f1 = slot === 1 ? overrideB64 : (foto1NewBase64 || undefined);
    const f2 = slot === 2 ? overrideB64 : (foto2NewBase64 || undefined);

    if (!f1 && !f2 && !overrideB64) {
      setErrorMessage('Por favor selecciona al menos una fotografía para subir.');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setSuccessData(null);
    setUploadStatus(
      slot === 1
        ? '📸 Subiendo Foto 1 (Inicial) a Google Drive...'
        : slot === 2
        ? '📸 Subiendo Foto 2 (Calidad) a Google Drive...'
        : `Archivando en Google Drive (${folderInfo.folderName})...`
    );

    try {
      // 1. Sincronización instantánea a 0 ms en caché local y eventos
      const prevCached = getOpPhotosFromCache(formattedOp);
      const optFoto1 = f1 || prevCached?.foto1;
      const optFoto2 = f2 || prevCached?.foto2;

      saveOpPhotosToCache(formattedOp, {
        foto1: optFoto1,
        foto2: optFoto2,
        folderUrl: prevCached?.folderUrl
      });

      if (f1) {
        updateLocalOpPhoto(solicitud.id, f1, false);
        updateLocalOpPhoto(solicitud.op, f1, false);
      }
      if (f2) {
        updateLocalOpPhoto(solicitud.id, f2, true);
        updateLocalOpPhoto(solicitud.op, f2, true);
      }

      // 2. Sincronización oficial con Google Drive & Google Sheets (preservando ambas fotos)
      const res = await uploadMissingOpPhotos(formattedOp, {
        foto1Base64: f1 || undefined,
        foto2Base64: f2 || undefined,
        fechaCreacion: solicitud.fechaCreacion,
        mes: folderInfo.monthNumber,
        referencia: solicitud.referencia,
        tela: solicitud.tela,
        usuario: solicitud.inspector || 'ADMINISTRADOR',
        isFinalizado: false,
        singleImageOnly: false
      });

      if (!res.success && !res.folderUrl && !res.foto1 && !res.foto2) {
        throw new Error(res.message || 'No se recibió confirmación de Google Drive.');
      }

      const finalFolder = res.folderUrl || prevCached?.folderUrl;
      const finalFoto1 = res.foto1 || f1 || prevCached?.foto1;
      const finalFoto2 = res.foto2 || f2 || prevCached?.foto2;

      setUploadStatus(
        slot === 1
          ? '✓ ¡Foto 1 (Inicial) archivada con éxito en Google Drive!'
          : slot === 2
          ? '✓ ¡Foto 2 (Calidad) archivada con éxito en Google Drive!'
          : '✓ ¡Fotografía archivada exitosamente en Google Drive!'
      );
      setSuccessData({
        folderUrl: finalFolder,
        foto1: finalFoto1,
        foto2: finalFoto2
      });

      if (onSuccess) {
        onSuccess({
          foto1: finalFoto1,
          foto2: finalFoto2,
          folderUrl: finalFolder
        });
      }
    } catch (err: any) {
      console.error('Error al guardar en Google Drive:', err);
      setErrorMessage(
        `Error al conectar con Google Drive: ${err?.message || 'Fallo de red'}. Por favor intenta de nuevo.`
      );
      setUploadStatus('');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveToDrive = () => executeSaveToDrive();

  // Procesar archivo seleccionado: compresión e INICIO AUTOMÁTICO de subida a Drive
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, slot: 1 | 2) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setErrorMessage(null);
      setSuccessData(null);
      // Compresión adaptativa (max 650px, calidad 0.60 -> ~30-50KB)
      const compressedB64 = await compressImageFile(file, 650, 0.60);
      
      if (slot === 1) {
        setFoto1NewBase64(compressedB64);
        setFoto1Preview(compressedB64);
      } else {
        setFoto2NewBase64(compressedB64);
        setFoto2Preview(compressedB64);
      }

      // SUBIDA AUTOMÁTICA INMEDIATA A DRIVE AL MONTAR LA FOTO
      await executeSaveToDrive(compressedB64, slot);
    } catch (err: any) {
      console.error('Error al procesar la imagen:', err);
      setErrorMessage('No se pudo procesar la imagen. Intenta con otra fotografía.');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const hasNewPhotos = Boolean(foto1NewBase64 || foto2NewBase64);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div 
        className="bg-white dark:bg-[#0c1017] border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER MODAL */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-[#090d13]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300">
                  {formattedOp}
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  {solicitud.tela}
                </span>
              </div>
              <h3 className="text-base font-black text-zinc-950 dark:text-white tracking-tight">
                Carga de Evidencias Fotográficas
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENIDO DEL MODAL */}
        <div className="p-6 space-y-5 overflow-y-auto">
          
          {/* BANNER DE UBICACIÓN HISTÓRICA EN DRIVE */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 space-y-1">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 text-xs font-bold">
              <Folder className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Destino Jerárquico en Google Drive (Por Mes de Creación)</span>
            </div>
            <p className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 break-all pl-6">
              📁 {folderInfo.fullPath}
            </p>
            <div className="flex items-center gap-4 pl-6 pt-1 text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
              <span>📅 Fecha OP: {solicitud.fechaCreacion || 'No registrada'}</span>
              <span>🏷️ Mes Detectado: {folderInfo.monthName} (Mes {folderInfo.monthNumber})</span>
            </div>
          </div>

          {/* BANNER INFORMATIVO DE REGISTRO DUAL */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3.5 space-y-1 animate-in fade-in">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Trazabilidad Fotográfica Dual (Subida Automática a Google Drive)</span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Al seleccionar o tomar cualquier fotografía, el sistema la comprime y la <strong>sube automáticamente a Google Drive</strong> en la carpeta oficial de la OP (<strong>{formattedOp}</strong>) preservando la Foto 1 (Inicial) y Foto 2 (Calidad Post-Lavado).
            </p>
          </div>

          {/* BANNER DE ÉXITO SI YA SE SUBIÓ */}
          {successData && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span>¡Fotografías archivadas con éxito en Google Drive y Columna M!</span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Las fotos se guardaron en la carpeta oficial del mes y la OP ya cuenta con trazabilidad fotográfica completa.
              </p>
              {successData.folderUrl && (
                <div className="pt-1">
                  <a
                    href={successData.folderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-mono transition shadow-sm"
                  >
                    <Folder className="w-3.5 h-3.5" />
                    <span>Abrir Carpeta en Google Drive</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* BANNER DE ERROR SI OCURRIÓ */}
          {errorMessage && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-3.5 flex items-center gap-2 text-rose-700 dark:text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* DOS RANURAS DE FOTOS (FOTO 1 Y FOTO 2) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* SLOT 1: FOTO 1 - MUESTRA INICIAL */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block font-mono">
                    1. Muestra Inicial
                  </span>
                  <span className="text-xs font-bold text-zinc-900 dark:text-white">
                    Atelier / Pre-Solicitud
                  </span>
                </div>
                {foto1Preview ? (
                  <span className="text-[9.5px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold">
                    {foto1NewBase64 ? '● Nueva' : '✓ Guardada'}
                  </span>
                ) : (
                  <span className="text-[9.5px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold">
                    Pendiente
                  </span>
                )}
              </div>

              {/* Contenedor Visual de la Foto 1 */}
              <div className="aspect-4/3 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 flex flex-col items-center justify-center relative group">
                {foto1Preview ? (
                  <>
                    <img 
                      src={foto1Preview} 
                      alt="Foto 1 Muestra Inicial" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef1.current?.click()}
                        disabled={isUploading}
                        className="p-2 rounded-xl bg-white/90 dark:bg-zinc-900 text-zinc-900 dark:text-white text-xs font-bold flex items-center gap-1 hover:scale-105 transition shadow-md"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Cambiar</span>
                      </button>
                      {foto1NewBase64 && (
                        <button
                          type="button"
                          onClick={() => {
                            setFoto1NewBase64(null);
                            const cached = getOpPhotosFromCache(solicitud.op);
                            setFoto1Preview(normalizeImageUrl(solicitud.fotoMuestraUrl || cached?.foto1) || null);
                          }}
                          disabled={isUploading}
                          className="p-2 rounded-xl bg-rose-600 text-white text-xs font-bold flex items-center gap-1 hover:scale-105 transition shadow-md"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <div 
                    onClick={() => fileInputRef1.current?.click()}
                    className="w-full h-full flex flex-col items-center justify-center p-4 text-center cursor-pointer hover:bg-zinc-200/50 dark:hover:bg-zinc-900 transition"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mb-2">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      Seleccionar o Tomar Foto 1
                    </span>
                    <span className="text-[10px] text-zinc-500 mt-1 font-mono">
                      _MUESTRA_INICIAL.jpg
                    </span>
                  </div>
                )}
              </div>

              {/* Botón de acción para el Slot 1 */}
              <button
                type="button"
                onClick={() => fileInputRef1.current?.click()}
                disabled={isUploading}
                className="w-full py-2 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-bold font-mono flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-emerald-500" />
                <span>{foto1Preview ? 'Cambiar Foto 1' : 'Cargar Foto 1'}</span>
              </button>

              <input
                ref={fileInputRef1}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handleFileSelect(e, 1)}
                className="hidden"
              />
            </div>

            {/* SLOT 2: FOTO 2 - POST-LAVADO CALIDAD */}
            <div className={`rounded-2xl p-4 space-y-3 transition ${
              isFinalizado
                ? 'border-2 border-purple-500/60 bg-purple-500/5 dark:bg-purple-950/30 shadow-lg shadow-purple-500/5'
                : 'border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block font-mono">
                      2. Post-Lavado Calidad
                    </span>
                    {isFinalizado && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-700 dark:text-purple-300 font-bold border border-purple-500/30">
                        ⭐ Definitiva OP
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-zinc-900 dark:text-white">
                    Auditoría Técnica
                  </span>
                </div>
                {foto2Preview ? (
                  <span className="text-[9.5px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-600 dark:text-purple-400 font-bold">
                    {foto2NewBase64 ? '● Lista para Guardar' : '✓ Guardada'}
                  </span>
                ) : (
                  <span className="text-[9.5px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold">
                    Pendiente
                  </span>
                )}
              </div>

              {/* Contenedor Visual de la Foto 2 */}
              <div className="aspect-4/3 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 flex flex-col items-center justify-center relative group">
                {foto2Preview ? (
                  <>
                    <img 
                      src={foto2Preview} 
                      alt="Foto 2 Calidad Post-Lavado" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef2.current?.click()}
                        disabled={isUploading}
                        className="p-2 rounded-xl bg-white/90 dark:bg-zinc-900 text-zinc-900 dark:text-white text-xs font-bold flex items-center gap-1 hover:scale-105 transition shadow-md"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Cambiar</span>
                      </button>
                      {foto2NewBase64 && (
                        <button
                          type="button"
                          onClick={() => {
                            setFoto2NewBase64(null);
                            const cached = getOpPhotosFromCache(solicitud.op);
                            setFoto2Preview(normalizeImageUrl(solicitud.fotoCalidadUrl || cached?.foto2) || null);
                          }}
                          disabled={isUploading}
                          className="p-2 rounded-xl bg-rose-600 text-white text-xs font-bold flex items-center gap-1 hover:scale-105 transition shadow-md"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <div 
                    onClick={() => fileInputRef2.current?.click()}
                    className="w-full h-full flex flex-col items-center justify-center p-4 text-center cursor-pointer hover:bg-zinc-200/50 dark:hover:bg-zinc-900 transition"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 mb-2">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      Seleccionar o Tomar Foto 2
                    </span>
                    <span className="text-[10px] text-zinc-500 mt-1 font-mono">
                      _POST_LAVADO_CALIDAD.jpg
                    </span>
                  </div>
                )}
              </div>

              {/* Botón de acción para el Slot 2 */}
              <button
                type="button"
                onClick={() => fileInputRef2.current?.click()}
                disabled={isUploading}
                className={`w-full py-2 px-3 rounded-xl text-xs font-bold font-mono flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  isFinalizado && !foto2Preview
                    ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md'
                    : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                }`}
              >
                <Camera className={`w-3.5 h-3.5 ${isFinalizado && !foto2Preview ? 'text-white' : 'text-purple-500'}`} />
                <span>{foto2Preview ? 'Cambiar Foto 2' : 'Cargar Foto 2 (Definitiva)'}</span>
              </button>

              <input
                ref={fileInputRef2}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handleFileSelect(e, 2)}
                className="hidden"
              />
            </div>

          </div>

          {/* MENSAJE INFORMATIVO DE REGLA INMUTABLE */}
          <div className="flex items-start gap-2 p-3 bg-zinc-100 dark:bg-zinc-900/60 rounded-xl text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
            <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <span>
              <strong>Regla del Sistema:</strong> Cada OP almacena de forma ordenada exactamente sus 2 fotografías en Google Drive (Foto 1: Muestra Inicial y Foto 2: Calidad Post-Lavado). La subida a Drive y la compresión en el cliente son automáticas al seleccionar o capturar la imagen.
            </span>
          </div>

        </div>

        {/* FOOTER ACTIONS */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#090d13] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-zinc-500 font-mono w-full sm:w-auto text-center sm:text-left">
            {uploadStatus && (
              <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                {uploadStatus}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="w-1/2 sm:w-auto px-4 py-2.5 rounded-2xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold transition cursor-pointer"
            >
              {successData ? 'Cerrar' : 'Cancelar'}
            </button>

            <button
              type="button"
              onClick={successData ? onClose : handleSaveToDrive}
              disabled={isUploading || (!hasNewPhotos && !successData)}
              className={`w-1/2 sm:w-auto px-5 py-2.5 rounded-2xl text-xs font-black font-mono flex items-center justify-center gap-2 transition cursor-pointer shadow-md ${
                successData
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95'
                  : hasNewPhotos && !isUploading
                  ? 'bg-amber-500 hover:bg-amber-400 text-black hover:scale-105 active:scale-95'
                  : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
              }`}
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                  <span>Subiendo a Drive...</span>
                </>
              ) : successData ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>¡Guardado Exitoso!</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Guardar en Drive</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
