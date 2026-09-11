import React, { useState, useRef, useEffect } from 'react';
import { 
  Eye, Printer, ArrowRight, Camera, Calendar, Clock, Trash2, 
  CheckCircle2, RotateCcw, Droplets, Upload, Check, X, Microscope, 
  Lock, AlertCircle, AlertTriangle, Layers, Sparkles, Save, RefreshCw 
} from 'lucide-react';
import { SolicitudColcha, SectorType, DictamenType } from '../../types';
import { formatColombianDisplayDate } from '../../services/slaCalculator';
import { UsuarioSTF, isAdminUser, isLavanderiaUser, isCalidadUser, isEdiazUser } from '../../services/authService';
import { compressImageFile, pushOpPhotoToSheets, updateLocalOpPhoto, pushColfactoryObservationToSheets, getOpPhotosFromCache, fetchOpPhotosFromDrive } from '../../services/googleSheetsService';

interface SolicitudCardProps {
  solicitud: SolicitudColcha;
  onTransfer: (solicitud: SolicitudColcha) => void;
  onDirectTransfer?: (solicitudId: string, nuevoEstado: SectorType, observacion: string, dictamen?: DictamenType, fotoCalidad?: string) => void;
  onViewDetail: (solicitud: SolicitudColcha) => void;
  onPrint: (solicitud: SolicitudColcha) => void;
  onDelete?: (solicitud: SolicitudColcha) => void;
  onFinalizar?: (solicitud: SolicitudColcha) => void;
  currentUser?: UsuarioSTF | null;
}

const STAGES: { key: SectorType; label: string; shortLabel: string }[] = [
  { key: 'PRE_SOLICITUD', label: 'PRE-SOL.', shortLabel: 'PRE-SOL' },
  { key: 'SOLICITADO', label: 'SOLICITADO', shortLabel: 'SOLICIT.' },
  { key: 'LAVANDERIA', label: 'LAVANDERÍA', shortLabel: 'LAVADO' },
  { key: 'CALIDAD', label: 'CALIDAD', shortLabel: 'CALIDAD' },
  { key: 'FINALIZADO', label: 'FINALIZADO', shortLabel: 'FINALIZ.' }
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
  onDirectTransfer,
  onViewDetail,
  onPrint,
  onDelete,
  onFinalizar,
  currentUser
}) => {
  const stageConfig = STAGE_CONFIG[solicitud.estado] || STAGE_CONFIG.SOLICITADO;
  const currentStageIndex = STAGES.findIndex(s => s.key === solicitud.estado);
  const cardId = `op-card-${solicitud.op.replace(/\D/g, '') || solicitud.op}`;

  // Estado local para Gestión Lavandería
  const [notasLavado, setNotasLavado] = useState(solicitud.observacionesLavanderia || '');
  const [isSavingLavado, setIsSavingLavado] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  useEffect(() => {
    if (solicitud.observacionesLavanderia !== undefined) {
      setNotasLavado(solicitud.observacionesLavanderia || '');
    }
  }, [solicitud.observacionesLavanderia]);

  // Guardar Observación de Lavandería en Columna L de forma instantánea
  const handleGuardarObservacionLavado = async (textoAGuardar?: string) => {
    const obs = (textoAGuardar !== undefined ? textoAGuardar : notasLavado).trim();
    setIsSavingLavado(true);
    try {
      await pushColfactoryObservationToSheets(solicitud.op, obs);
      setSaveSuccessMsg('Guardado en Columna L (Sheets)');
      setTimeout(() => setSaveSuccessMsg(''), 3500);
    } catch (err) {
      console.error('Error al guardar observación en Columna L:', err);
    } finally {
      setIsSavingLavado(false);
    }
  };

  // Estado local para Control de Calidad (STF)
  const [veredictoLocal, setVeredictoLocal] = useState<'APROBADO' | 'RECHAZADO' | ''>('');
  const [obsCalidadLocal, setObsCalidadLocal] = useState('');
  const [fotoCalidadPreview, setFotoCalidadPreview] = useState<string | null>(solicitud.fotoCalidadUrl || null);
  const [isUploadingCalidadPhoto, setIsUploadingCalidadPhoto] = useState(false);
  const [zoomedPhotoUrl, setZoomedPhotoUrl] = useState<string | null>(null);
  const calidadFileInputRef = useRef<HTMLInputElement>(null);

  const fotoCalidadUrlActual = fotoCalidadPreview || solicitud.fotoCalidadUrl;

  // Auto-descubrimiento y persistencia de fotos (Caché local + Google Drive)
  const [cachedOrDrivePhotos, setCachedOrDrivePhotos] = useState<{ foto1?: string; foto2?: string; folderUrl?: string } | null>(() => {
    return getOpPhotosFromCache(solicitud.op) || null;
  });

  useEffect(() => {
    const cached = getOpPhotosFromCache(solicitud.op);
    if (cached && (cached.foto1 || cached.foto2 || cached.folderUrl)) {
      setCachedOrDrivePhotos(cached);
    }
    // Si la OP no tiene foto de muestra en memoria y tampoco en caché local, consultarla a Google Drive
    if (!solicitud.fotoMuestraUrl && !cached?.foto1) {
      let isMounted = true;
      fetchOpPhotosFromDrive(solicitud.op).then((res) => {
        if (isMounted && (res.foto1 || res.foto2 || res.folderUrl)) {
          setCachedOrDrivePhotos(res);
        }
      });
      return () => {
        isMounted = false;
      };
    }
  }, [solicitud.op, solicitud.fotoMuestraUrl]);

  const effectiveFotoMuestra = solicitud.fotoMuestraUrl || cachedOrDrivePhotos?.foto1;
  const effectiveFotoCalidad = fotoCalidadUrlActual || cachedOrDrivePhotos?.foto2;

  // Determine origin for returning (ZF / Atelier vs Planta / Calidad)
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
  const returnStageLabel = origenIsZF ? 'PRE-SOLICITUD (ZONA FRANCA / ATELIER)' : 'SOLICITADOS (PLANTA PRINCIPAL)';

  const handleEnviarCalidad = async () => {
    const obs = notasLavado.trim();
    const finalObs = obs || 'Muestra procesada en Lavandería Colfactory ZF';

    // 1. Transferencia instantánea en el frontend hacia CALIDAD
    if (onDirectTransfer) {
      onDirectTransfer(solicitud.id, 'CALIDAD', finalObs);
    } else {
      onTransfer(solicitud);
    }

    // 2. Persistencia en segundo plano en Google Sheets (Columna L: OBSERVACIÓN COLFACTORY)
    try {
      pushColfactoryObservationToSheets(solicitud.op, finalObs).catch((err) => {
        console.warn('Error sincronizando observación con Sheets en segundo plano:', err);
      });
    } catch (e) {}
  };

  const handleDevolver = () => {
    const defaultReason = notasLavado.trim() || 'Error / Novedad en proceso de lavado';
    const reason = prompt(
      `🚨 DEVOLVER ORDEN POR ERROR / NOVEDAD:\n\nEsta OP ${solicitud.op} regresará como ALERTA a: ${returnStageLabel}.\n\nIndique la observación o motivo de devolución:`,
      defaultReason
    );
    if (reason === null) return; // Cancelado

    const returnObs = `[🚨 DEVOLUCIÓN POR LAVANDERÍA (ERROR)]: ${reason.trim() || 'Novedad técnica en lavado'}`;
    if (onDirectTransfer) {
      onDirectTransfer(solicitud.id, returnStage, returnObs);
    } else {
      onTransfer(solicitud);
    }
  };

  const handleRecibirColcha = () => {
    if (onDirectTransfer) {
      onDirectTransfer(solicitud.id, 'LAVANDERIA', '');
    } else {
      onTransfer(solicitud);
    }
  };

  // Carga y compresión de fotografía de calidad post-lavado
  const handleCalidadPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCalidadPhoto(true);
    try {
      const compressed = await compressImageFile(file, 650, 0.55);
      setFotoCalidadPreview(compressed);
      
      // Persistir localmente como foto de calidad (isCalidad = true)
      updateLocalOpPhoto(solicitud.id, compressed, true);
      updateLocalOpPhoto(solicitud.op, compressed, true);

      // Sincronizar con Google Sheets & Drive (con sobreescritura estricta)
      const resPhoto = await pushOpPhotoToSheets(solicitud.op, compressed, true);
      if (resPhoto && resPhoto.driveUrl) {
        updateLocalOpPhoto(solicitud.id, resPhoto.driveUrl, true);
        updateLocalOpPhoto(solicitud.op, resPhoto.driveUrl, true);
      }
    } catch (err) {
      console.error('Error al cargar foto de calidad:', err);
      alert('Hubo un error al procesar la imagen. Por favor intenta de nuevo.');
    } finally {
      setIsUploadingCalidadPhoto(false);
    }
  };

  // Emisión de Dictamen Final en Calidad
  const handleEmitirDictamen = () => {
    if (!veredictoLocal) {
      alert('⚠️ Por favor seleccione el VEREDICTO (APROBADO o RECHAZADO) para emitir el dictamen final.');
      return;
    }
    if (!obsCalidadLocal.trim()) {
      alert('⚠️ Por favor ingrese la OBSERVACIÓN FINAL del dictamen de calidad.');
      return;
    }

    const dictamen = veredictoLocal as DictamenType;
    const obsFinal = obsCalidadLocal.trim();
    const fotoFinal = fotoCalidadPreview || solicitud.fotoCalidadUrl;

    if (onDirectTransfer) {
      onDirectTransfer(solicitud.id, 'FINALIZADO', obsFinal, dictamen, fotoFinal);
    } else {
      onTransfer(solicitud);
    }
  };

  const hasBothPhotos = Boolean(effectiveFotoMuestra && effectiveFotoCalidad);

  return (
    <div id={cardId} className={`bg-[#0c1017] dark:bg-white border border-zinc-800 dark:border-zinc-200 ${stageConfig.border} border-l-[8px] rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 text-white dark:text-zinc-950 scroll-mt-24`}>
      
      <div className="p-5 sm:p-6 space-y-4">
        
        {/* Top Header Row: Badges & Date */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-zinc-800/80 dark:border-zinc-200/80 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Stage Pill */}
            <span className={`text-[11px] font-mono font-black px-3 py-1 rounded-xl border uppercase ${stageConfig.badge}`}>
              {stageConfig.border.includes('rose') ? '🚨 ' : ''}{solicitud.estado.replace('_', ' ')}
            </span>
            
            {/* Muestra Activa Pill / Dictamen Pill */}
            {solicitud.estado === 'FINALIZADO' ? (
              <span className={`text-[11px] font-mono font-black px-3 py-1 rounded-xl border flex items-center gap-1.5 ${
                solicitud.dictamen === 'RECHAZADO'
                  ? 'bg-rose-950/80 dark:bg-rose-50 text-rose-300 dark:text-rose-700 border-rose-600 dark:border-rose-300'
                  : 'bg-emerald-950/80 dark:bg-emerald-50 text-emerald-300 dark:text-emerald-700 border-emerald-600 dark:border-emerald-300'
              }`}>
                <span>{solicitud.dictamen === 'RECHAZADO' ? '❌ RECHAZADO' : '✅ APROBADO'}</span>
              </span>
            ) : (
              <span className="text-[11px] font-mono font-bold px-3 py-1 rounded-xl bg-emerald-950/60 dark:bg-emerald-50 text-emerald-300 dark:text-emerald-700 border border-dashed border-emerald-500/80 dark:border-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>MUESTRA ACTIVA</span>
              </span>
            )}

            {/* SLA Delay Pill */}
            {solicitud.tieneRetraso && solicitud.estado !== 'FINALIZADO' && (
              <span className={`text-[11px] font-mono font-black px-3 py-1 rounded-xl border flex items-center gap-1.5 animate-pulse ${
                solicitud.esRetrasoCritico 
                  ? 'bg-rose-950/90 text-rose-300 border-rose-500/80 dark:bg-rose-50 dark:text-rose-800 dark:border-rose-300' 
                  : 'bg-amber-950/90 text-amber-300 border-amber-500/80 dark:bg-amber-50 dark:text-amber-800 dark:border-amber-300'
              }`}>
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>RETRASO SLA ({solicitud.diasHabiles}D/{solicitud.limiteSlaDias}D)</span>
              </span>
            )}
          </div>

          {/* Creation Date & Time Elapsed */}
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 dark:text-zinc-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatColombianDisplayDate(solicitud.fechaCreacion)}</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{solicitud.diasHabiles}d hábiles</span>
            </span>
          </div>
        </div>

        {/* Main Info Grid */}
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          
          {/* Left Column: Identifiers, Fabric & Details */}
          <div className="space-y-2.5 flex-1 min-w-0 w-full">
            
            {/* Prominent OP Header */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-baseline gap-2 flex-wrap">
                <h3 className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white dark:text-zinc-950">
                  {solicitud.op}
                </h3>
                <span className="text-sm sm:text-base font-bold text-zinc-400 dark:text-zinc-500 font-mono">
                  / REF - {solicitud.referencia}
                </span>
              </div>

              {/* View Technical Sheet Link */}
              <button
                type="button"
                onClick={() => onViewDetail(solicitud)}
                className="text-xs font-bold text-indigo-400 dark:text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Ver Ficha</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Fabric Tag & Mobile Photo Thumbnail Preview */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="inline-block bg-indigo-950/80 dark:bg-indigo-50 text-indigo-300 dark:text-indigo-800 border border-indigo-500/50 dark:border-indigo-200 text-[11px] sm:text-xs font-black px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-xl font-mono">
                TELA: {solicitud.tela}
              </span>

              {/* Mobile Photo Mini-Preview Button (Touch-Friendly) */}
              <div className="flex sm:hidden items-center">
                {(effectiveFotoCalidad || effectiveFotoMuestra) ? (
                  <button
                    type="button"
                    onClick={() => {
                      const targetPhoto = effectiveFotoCalidad || effectiveFotoMuestra;
                      if (targetPhoto) setZoomedPhotoUrl(targetPhoto);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-900/90 dark:bg-zinc-100 border border-amber-500/60 text-amber-400 dark:text-amber-700 text-[10.5px] font-mono font-bold shadow-xs active:scale-95 transition"
                    title="Toca para ver la foto de la muestra en grande"
                  >
                    <img
                      src={effectiveFotoCalidad || effectiveFotoMuestra}
                      alt="Muestra"
                      referrerPolicy="no-referrer"
                      className="w-5 h-5 rounded-md object-cover border border-amber-500/40"
                    />
                    <span>VER FOTO</span>
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-900/50 dark:bg-zinc-100 text-zinc-500 text-[9.5px] font-mono">
                    <Camera className="w-3 h-3" />
                    <span>Sin foto</span>
                  </span>
                )}
              </div>
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

          {/* Right Action / Photo Box (VISOR EXCLUSIVO DE FOTOGRAFÍA - SOLO VER) */}
          <div className="hidden sm:flex flex-col items-center gap-2 flex-shrink-0">
            {solicitud.estado === 'FINALIZADO' && hasBothPhotos ? (
              <div className="flex items-center gap-2">
                {/* Foto 1: Inicial */}
                <div
                  onClick={() => setZoomedPhotoUrl(effectiveFotoMuestra || null)}
                  className="w-20 h-28 rounded-2xl p-1.5 bg-zinc-900/90 dark:bg-zinc-100 border border-zinc-700 dark:border-zinc-300 flex flex-col items-center justify-between cursor-pointer hover:border-amber-500 group overflow-hidden shadow-sm transition"
                  title="Clic para ver y ampliar Foto 1: Muestra Inicial (Corte)"
                >
                  <img
                    src={effectiveFotoMuestra}
                    alt="Inicial"
                    referrerPolicy="no-referrer"
                    className="w-full h-18 object-cover rounded-xl group-hover:scale-105 transition"
                  />
                  <span className="text-[8px] font-black font-mono text-zinc-400 dark:text-zinc-600 uppercase flex items-center gap-1">
                    <Eye className="w-2.5 h-2.5 text-amber-500" />
                    <span>1. INICIAL</span>
                  </span>
                </div>

                {/* Foto 2: Calidad */}
                <div
                  onClick={() => setZoomedPhotoUrl(effectiveFotoCalidad || null)}
                  className="w-20 h-28 rounded-2xl p-1.5 bg-purple-950/40 dark:bg-purple-50 border border-purple-500/50 dark:border-purple-300 flex flex-col items-center justify-between cursor-pointer hover:border-purple-400 group overflow-hidden shadow-sm transition"
                  title="Clic para ver y ampliar Foto 2: Calidad Post-Lavado"
                >
                  <img
                    src={effectiveFotoCalidad || ''}
                    alt="Calidad"
                    referrerPolicy="no-referrer"
                    className="w-full h-18 object-cover rounded-xl group-hover:scale-105 transition"
                  />
                  <span className="text-[8px] font-black font-mono text-purple-300 dark:text-purple-700 uppercase flex items-center gap-1">
                    <Eye className="w-2.5 h-2.5 text-purple-400" />
                    <span>2. CALIDAD</span>
                  </span>
                </div>
              </div>
            ) : (
              <div
                onClick={() => {
                  const targetPhoto = effectiveFotoCalidad || effectiveFotoMuestra;
                  if (targetPhoto) {
                    setZoomedPhotoUrl(targetPhoto);
                  }
                }}
                className={`w-28 h-28 rounded-2xl p-2 flex flex-col items-center justify-center transition overflow-hidden relative group ${
                  (effectiveFotoCalidad || effectiveFotoMuestra)
                    ? 'bg-zinc-900/90 dark:bg-zinc-100 border border-zinc-700 dark:border-zinc-300 cursor-pointer hover:border-amber-500 shadow-sm'
                    : 'bg-zinc-900/40 dark:bg-zinc-100/50 border border-zinc-800/80 dark:border-zinc-200 text-zinc-500 dark:text-zinc-400'
                }`}
                title={
                  (effectiveFotoCalidad || effectiveFotoMuestra)
                    ? 'Clic para ver y ampliar la fotografía de la muestra' 
                    : 'Sin fotografía registrada en la solicitud'
                }
              >
                {(effectiveFotoCalidad || effectiveFotoMuestra) ? (
                  <>
                    <img
                      src={effectiveFotoCalidad || effectiveFotoMuestra}
                      alt="Muestra de colcha"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition duration-200"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition duration-200 rounded-2xl">
                      <div className="bg-black/80 px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold text-white flex items-center gap-1 border border-zinc-700 shadow-md">
                        <Eye className="w-3 h-3 text-amber-400" />
                        <span>VER FOTO</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <Camera className="w-6 h-6 mb-1 text-zinc-500 dark:text-zinc-400 stroke-[1.5]" />
                    <span className="text-[8.5px] font-bold uppercase tracking-wider text-center text-zinc-400 dark:text-zinc-500 font-mono">
                      SIN FOTO
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Stepper Pipeline */}
        <div className="pt-2">
          <div className="grid grid-cols-5 text-center text-[8.5px] sm:text-[10.5px] font-mono tracking-wider border-b border-zinc-800/80 dark:border-zinc-200/80 pb-2.5">
            {STAGES.map((st, i) => {
              const isActive = i === currentStageIndex;
              const isPassed = i < currentStageIndex;
              return (
                <div key={st.key} className="relative pb-1">
                  <span className={isActive ? stageConfig.activeText : isPassed ? 'text-emerald-400 dark:text-emerald-600 font-bold' : 'text-zinc-500 dark:text-zinc-400'}>
                    <span className="sm:hidden">{st.shortLabel}</span>
                    <span className="hidden sm:inline">{st.label}</span>
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
              {solicitud.estado === 'LAVANDERIA' ? 'LAVANDERÍA' : (solicitud.areaActual || 'LAVANDERÍA')}
            </span>
          </div>

          <div className="text-xs">
            Último control: <strong className="text-white dark:text-zinc-950">{solicitud.inspector}</strong>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* GESTIÓN LAVANDERÍA: RECEPCIÓN TÉCNICA DE COLCHA (EXCLUSIVO LAVANDERÍA)  */}
        {/* ========================================================================= */}
        {(isLavanderiaUser(currentUser) || isAdminUser(currentUser)) && (solicitud.estado === 'PRE_SOLICITUD' || solicitud.estado === 'SOLICITADO') && (
          <div className="relative overflow-hidden bg-gradient-to-br from-sky-950/70 via-[#0a1526] to-[#070e1a] dark:from-sky-50 dark:via-blue-50/60 dark:to-white border-2 border-sky-500/40 dark:border-sky-300 rounded-3xl p-5 sm:p-6 space-y-4 mt-3 shadow-xl backdrop-blur-md animate-in fade-in duration-300">
            
            {/* Ambient Glow */}
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-sky-500/10 dark:bg-sky-400/20 rounded-full blur-2xl pointer-events-none" />

            {/* Header with icon and origin tag */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-sky-500/20 dark:border-sky-200/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 dark:bg-sky-100 flex items-center justify-center border border-sky-400/40 text-sky-400 dark:text-sky-600 shadow-sm">
                  <Droplets className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-black text-sky-300 dark:text-sky-900 tracking-wide font-sans flex items-center gap-2">
                    GESTIÓN LAVANDERÍA
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-sky-900/60 dark:bg-sky-200/60 text-sky-300 dark:text-sky-800 border border-sky-500/30">
                      RECEPCIÓN
                    </span>
                  </h4>
                  <p className="text-[10.5px] text-zinc-400 dark:text-zinc-600 font-mono">
                    Ingreso de muestra técnica al túnel de lavado
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-black px-3 py-1 rounded-xl bg-sky-950/80 dark:bg-sky-100 text-sky-300 dark:text-sky-800 border border-sky-500/40 dark:border-sky-300 shadow-xs uppercase">
                  {solicitud.estado === 'PRE_SOLICITUD' ? '📍 ZONA FRANCA (ATELIER)' : '📍 PLANTA PRINCIPAL (DESPACHO)'}
                </span>
              </div>
            </div>

            {/* Interactive Action Area */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleRecibirColcha}
                className="w-full group relative overflow-hidden bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-3 transition-all duration-200 cursor-pointer shadow-lg shadow-sky-600/25 active:scale-[0.99] border border-sky-400/40"
              >
                <Droplets className="w-4 h-4 text-sky-200 group-hover:scale-125 group-hover:rotate-12 transition-transform duration-200" />
                <span className="font-mono text-sm tracking-wide">RECIBIR COLCHA EN LAVANDERÍA</span>
                <ArrowRight className="w-4 h-4 text-sky-200 group-hover:translate-x-1 transition-transform duration-200" />
              </button>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* GESTIÓN LAVANDERÍA (COCKPIT INTEGRADO EXCLUSIVO PARA PERFILES LAVANDERÍA) */}
        {/* ========================================================================= */}
        {(isLavanderiaUser(currentUser) || isAdminUser(currentUser)) && solicitud.estado === 'LAVANDERIA' && (
          <div className="relative overflow-hidden bg-gradient-to-br from-sky-950/80 via-[#0a1424] to-[#070e1a] dark:from-sky-50 dark:via-blue-50/70 dark:to-white border-2 border-sky-500/50 dark:border-sky-300 rounded-3xl p-5 sm:p-6 space-y-4 mt-3 shadow-2xl backdrop-blur-md animate-in fade-in duration-300">
            
            {/* Ambient glow */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-36 h-36 bg-sky-500/10 dark:bg-sky-400/20 rounded-full blur-2xl pointer-events-none" />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-sky-500/20 dark:border-sky-200/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 dark:bg-sky-100 flex items-center justify-center border border-sky-400/40 text-sky-400 dark:text-sky-600 shadow-sm">
                  <Droplets className="w-4 h-4 text-sky-400 animate-bounce" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-black text-sky-300 dark:text-sky-900 tracking-wide font-sans flex items-center gap-2">
                    GESTIÓN LAVANDERÍA
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-sky-900/60 dark:bg-sky-200/60 text-sky-300 dark:text-sky-800 border border-sky-500/30">
                      COLFACTORY ZF
                    </span>
                  </h4>
                  <p className="text-[10.5px] text-zinc-400 dark:text-zinc-600 font-mono">
                    Control de procesos, novedades técnicas y despacho a Calidad
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10.5px] font-mono font-bold px-3 py-1 rounded-xl bg-sky-950/90 dark:bg-sky-100 text-sky-300 dark:text-sky-800 border border-sky-500/40 dark:border-sky-300 flex items-center gap-1.5 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping"></span>
                  <span>EN LAVADO ACTIVO</span>
                </span>
              </div>
            </div>

            {/* Observaciones Input with Smart Quick Tags */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <label className="text-[10.5px] font-bold text-sky-300 dark:text-sky-800 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <span>OBSERVACIONES DE ENVÍO Y PROCESO</span>
                </label>
                
                {/* Quick tags con auto-guardado en Columna L */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9.5px] text-zinc-400 dark:text-zinc-500 font-mono">Sugeridos:</span>
                  {[
                    'Lavado estándar',
                    'Desengomado + Suavizado',
                    'Fijación de color',
                    'Sin novedad'
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        const nextVal = notasLavado ? `${notasLavado} • ${tag}` : tag;
                        setNotasLavado(nextVal);
                        handleGuardarObservacionLavado(nextVal);
                      }}
                      className="text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-lg bg-zinc-900/90 hover:bg-sky-950 text-zinc-300 hover:text-sky-300 dark:bg-zinc-100 dark:hover:bg-sky-100 dark:text-zinc-700 dark:hover:text-sky-800 border border-zinc-700/80 hover:border-sky-500/50 transition cursor-pointer"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={notasLavado}
                onChange={(e) => setNotasLavado(e.target.value)}
                onBlur={() => handleGuardarObservacionLavado()}
                rows={2}
                placeholder="Describa el proceso técnico realizado, formulación o novedades..."
                className="w-full bg-zinc-950/90 dark:bg-white border-2 border-zinc-800 dark:border-zinc-300 rounded-2xl p-3.5 text-xs text-white dark:text-zinc-950 placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition font-mono shadow-inner"
              />

              {/* Botón de Guardado Directo en Columna L & Confirmación Visual */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => handleGuardarObservacionLavado()}
                  disabled={isSavingLavado}
                  className="inline-flex items-center gap-1.5 text-[10.5px] font-mono font-bold px-3 py-1.5 rounded-xl bg-sky-950/90 hover:bg-sky-900 text-sky-300 hover:text-sky-100 border border-sky-500/50 hover:border-sky-400 transition cursor-pointer active:scale-95 shadow-xs disabled:opacity-50"
                  title="Guardar de inmediato esta observación en la Columna L (OBSERVACIÓN COLFACTORY) de Google Sheets"
                >
                  {isSavingLavado ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
                      <span>Guardando en Columna L...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5 text-sky-400" />
                      <span>💾 GUARDAR EN COLUMNA L (COLFACTORY)</span>
                    </>
                  )}
                </button>

                {saveSuccessMsg && (
                  <span className="text-[11px] font-mono text-emerald-400 dark:text-emerald-600 flex items-center gap-1 font-bold animate-pulse">
                    <Check className="w-3.5 h-3.5" />
                    <span>{saveSuccessMsg}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons: Enviar a Calidad & Devolver (Error) */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
              
              {/* Botón Principal: ENVIAR A CALIDAD (STF) */}
              <div className="sm:col-span-8">
                <button
                  type="button"
                  onClick={handleEnviarCalidad}
                  className="w-full group relative overflow-hidden bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white py-3.5 px-5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer shadow-lg shadow-sky-600/25 active:scale-[0.99] border border-sky-400/40"
                >
                  <span className="font-mono">ENVIAR A CALIDAD (STF)</span>
                  <ArrowRight className="w-4 h-4 text-sky-200 group-hover:translate-x-1 transition-transform duration-200" />
                </button>
              </div>

              {/* Botón Alerta / Novedad: DEVOLVER (ERROR) */}
              <div className="sm:col-span-4">
                <button
                  type="button"
                  onClick={handleDevolver}
                  className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 dark:text-rose-600 border border-rose-500/40 hover:border-rose-500/70 py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-xs active:scale-[0.99]"
                  title="Devolver OP por error o novedad técnica en lavandería"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-400 dark:text-rose-600" />
                  <span className="font-mono">DEVOLVER (ERROR)</span>
                </button>
              </div>

            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* CONTROL DE CALIDAD (STF) - MODULO INTEGRADO (EXCLUSIVO CALIDAD / ADMIN)   */}
        {/* ========================================================================= */}
        {solicitud.estado === 'CALIDAD' && (
          (isCalidadUser(currentUser) || isAdminUser(currentUser)) ? (
            <div className="bg-[#0e121e] dark:bg-purple-50/70 border-2 border-indigo-500/40 dark:border-purple-300 rounded-3xl p-5 space-y-4 mt-3 shadow-xl animate-in fade-in duration-200">
              
              {/* Header: (✓) CONTROL DE CALIDAD (STF) */}
              <div className="flex items-center justify-between border-b border-zinc-800 dark:border-purple-200/80 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-indigo-400 dark:text-indigo-600" />
                  <h4 className="text-sm sm:text-base font-black text-indigo-300 dark:text-indigo-900 tracking-wide font-sans">
                    CONTROL DE CALIDAD (STF)
                  </h4>
                </div>
                <span className="text-[10px] font-mono font-black px-3 py-1 rounded-full bg-indigo-950/80 dark:bg-indigo-100 text-indigo-300 dark:text-indigo-800 border border-indigo-500/40 dark:border-indigo-300">
                  AUDITORÍA FINAL
                </span>
              </div>

              {/* Form 3 Columns: Veredicto, Observación Final, Foto */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
                
                {/* 1. VEREDICTO * */}
                <div className="md:col-span-4 space-y-1.5">
                  <label className="block text-[10.5px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-wider font-mono">
                    VEREDICTO <span className="text-rose-500 font-black">*</span>
                  </label>
                  <select
                    value={veredictoLocal}
                    onChange={(e) => setVeredictoLocal(e.target.value as 'APROBADO' | 'RECHAZADO' | '')}
                    className="w-full bg-zinc-950 dark:bg-white border-2 border-zinc-700 dark:border-zinc-300 rounded-2xl p-3 text-xs text-white dark:text-zinc-950 focus:outline-none focus:border-indigo-500 font-bold transition shadow-sm cursor-pointer"
                  >
                    <option value="">-- Veredicto --</option>
                    <option value="APROBADO">✅ APROBADO</option>
                    <option value="RECHAZADO">❌ RECHAZADO</option>
                  </select>
                </div>

                {/* 2. OBSERVACIÓN FINAL * */}
                <div className="md:col-span-5 space-y-1.5">
                  <label className="block text-[10.5px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-wider font-mono">
                    OBSERVACIÓN FINAL <span className="text-rose-500 font-black">*</span>
                  </label>
                  <input
                    type="text"
                    value={obsCalidadLocal}
                    onChange={(e) => setObsCalidadLocal(e.target.value)}
                    placeholder="Escriba la observación técnica final..."
                    className="w-full bg-zinc-950 dark:bg-white border-2 border-zinc-700 dark:border-zinc-300 rounded-2xl p-3 text-xs text-white dark:text-zinc-950 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition font-mono shadow-sm"
                  />
                </div>

                {/* 3. FOTO * */}
                <div className="md:col-span-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10.5px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-wider font-mono flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5 text-indigo-400" />
                      <span>FOTO 2 (CALIDAD) <span className="text-rose-500 font-black">*</span></span>
                    </label>
                    <span className={`text-[9.5px] font-mono font-bold ${
                      fotoCalidadUrlActual 
                        ? 'text-emerald-400 dark:text-emerald-600' 
                        : 'text-zinc-500 dark:text-zinc-400'
                    }`}>
                      {fotoCalidadUrlActual ? '✓ CARGADA' : 'SIN FOTO'}
                    </span>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => calidadFileInputRef.current?.click()}
                    disabled={isUploadingCalidadPhoto}
                    className="w-full bg-black hover:bg-zinc-900 text-white dark:bg-zinc-950 dark:hover:bg-zinc-800 border border-zinc-700 py-3 px-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-md active:scale-[0.99] disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5 text-white" />
                    <span>{isUploadingCalidadPhoto ? 'CARGANDO...' : 'ACTUALIZAR FOTO'}</span>
                  </button>
                  <input
                    type="file"
                    ref={calidadFileInputRef}
                    accept="image/*"
                    capture="environment"
                    onChange={handleCalidadPhotoUpload}
                    className="hidden"
                  />
                </div>

              </div>

              {/* ACTION BUTTON: EMITIR DICTAMEN FINAL */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleEmitirDictamen}
                  className="w-full bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-3.5 px-5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-lg active:scale-[0.99]"
                >
                  <span>EMITIR DICTAMEN FINAL {veredictoLocal ? `(${veredictoLocal})` : ''}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          ) : (
            <div className="bg-purple-950/20 dark:bg-purple-50/50 border border-purple-500/30 dark:border-purple-200 rounded-3xl p-4 sm:p-5 text-center mt-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-center gap-2 text-purple-400 dark:text-purple-700 font-bold text-xs sm:text-sm font-mono">
                <Microscope className="w-4 h-4 text-purple-400 animate-pulse" />
                <span>OP EN AUDITORÍA TÉCNICA DE CALIDAD (LABORATORIO STF)</span>
              </div>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-600 mt-1.5 font-mono max-w-xl mx-auto">
                Esta colcha física está en evaluación por los inspectores del laboratorio de Calidad para registrar el veredicto técnico (Aprobado/Rechazado), observación final y fotografía post-lavado.
              </p>
            </div>
          )
        )}

        {/* Bottom Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 pt-3 border-t border-zinc-800/80 dark:border-zinc-200/80">
          <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => onViewDetail(solicitud)}
              className="px-3 sm:px-4 py-2.5 rounded-xl sm:rounded-2xl bg-white text-zinc-950 hover:bg-zinc-200 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-800 text-xs font-black flex items-center justify-center gap-1.5 sm:gap-2 transition cursor-pointer shadow-md"
            >
              <Eye className="w-4 h-4 text-amber-500" />
              <span>VER DETALLE</span>
            </button>

            <button
              onClick={() => onPrint(solicitud)}
              className="px-3 sm:px-4 py-2.5 rounded-xl sm:rounded-2xl bg-transparent border-2 border-zinc-700 text-white hover:bg-zinc-800 dark:border-zinc-300 dark:text-zinc-900 dark:hover:bg-zinc-100 text-xs font-black flex items-center justify-center gap-1.5 sm:gap-2 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>IMPRIMIR</span>
            </button>

            {/* BOTÓN ELIMINAR (EXCLUSIVO 100% PARA EL PERFIL DE EDIAZ) */}
            {isEdiazUser(currentUser) && onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(solicitud);
                }}
                className="col-span-2 sm:col-span-1 px-3 sm:px-4 py-2.5 rounded-xl sm:rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 dark:text-rose-600 border border-rose-400/60 dark:border-rose-300 text-xs font-black flex items-center justify-center gap-1.5 sm:gap-2 transition cursor-pointer shadow-xs hover:scale-105 active:scale-95 duration-150"
                title="Eliminar esta OP automáticamente (Exclusivo Perfil ediaz)"
              >
                <Trash2 className="w-4 h-4 text-rose-500" />
                <span>ELIMINAR</span>
              </button>
            )}

            {/* BOTÓN FINALIZAR (EXCLUSIVO PERFIL CALIDAD / ADMINISTRADOR) */}
            {(isCalidadUser(currentUser) || isAdminUser(currentUser)) && solicitud.estado === 'CALIDAD' && onFinalizar && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onFinalizar(solicitud);
                }}
                className="col-span-2 sm:col-span-1 px-3 sm:px-4 py-2.5 rounded-xl sm:rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 dark:text-emerald-700 border border-emerald-500/60 dark:border-emerald-400 text-xs font-black flex items-center justify-center gap-1.5 sm:gap-2 transition cursor-pointer shadow-xs hover:scale-105 active:scale-95 duration-150"
                title="Dar por finalizada esta OP y moverla automáticamente a Finalizados en el sistema y base de datos"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
                <span>FINALIZAR</span>
              </button>
            )}
          </div>

          {solicitud.estado === 'FINALIZADO' ? (
            <span className={`text-xs font-bold px-3.5 py-2 rounded-xl sm:rounded-2xl border font-mono flex items-center justify-center gap-1.5 shadow-xs w-full sm:w-auto ${
              solicitud.dictamen === 'RECHAZADO'
                ? 'bg-rose-950/80 dark:bg-rose-50 text-rose-300 dark:text-rose-700 border-rose-500/40 dark:border-rose-300'
                : 'bg-emerald-950/60 dark:bg-emerald-50 text-emerald-300 dark:text-emerald-700 border-emerald-500/40 dark:border-emerald-300'
            }`}>
              <span>{solicitud.dictamen === 'RECHAZADO' ? '❌ RECHAZADO' : '✅ LIBERADO / APROBADO'}</span>
            </span>
          ) : null}
        </div>

      </div>

      {/* MODAL DE ZOOM / VISOR DE FOTO EN PANTALLA COMPLETA */}
      {zoomedPhotoUrl && (
        <div 
          onClick={() => setZoomedPhotoUrl(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
        >
          <div 
            className="relative max-w-3xl w-full max-h-[85vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              type="button"
              onClick={() => setZoomedPhotoUrl(null)}
              className="absolute -top-12 right-0 sm:top-2 sm:right-2 p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white cursor-pointer z-10 shadow-lg"
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={zoomedPhotoUrl} 
              alt="Muestra Colcha Ampliada"
              referrerPolicy="no-referrer"
              className="max-h-[75vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl border border-zinc-700 bg-zinc-950"
            />
            <div className="mt-3 text-xs font-mono font-bold text-zinc-200 bg-zinc-900/90 px-4 py-2 rounded-full border border-zinc-700 shadow-md">
              {solicitud.op} • REF: {solicitud.referencia} • {solicitud.tela} ({solicitud.color})
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

