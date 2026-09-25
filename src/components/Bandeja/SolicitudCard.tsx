import React, { useState, useRef, useEffect } from 'react';
import { 
  Eye, Printer, ArrowRight, Camera, Calendar, Clock, Trash2, 
  CheckCircle2, RotateCcw, Droplets, Upload, Check, X, Microscope, 
  Lock, AlertCircle, AlertTriangle, Layers, Sparkles, Save, RefreshCw,
  Search, Tag 
} from 'lucide-react';
import { SolicitudColcha, SectorType, DictamenType } from '../../types';
import { formatColombianDisplayDate } from '../../services/slaCalculator';
import { UsuarioSTF, isAdminUser, isLavanderiaUser, isCalidadUser, isEdiazUser, isFactoryUser } from '../../services/authService';
import { compressImageFile, pushOpPhotoToSheets, updateLocalOpPhoto, pushColfactoryObservationToSheets, getOpPhotosFromCache, saveOpPhotosToCache, fetchOpPhotosFromDrive, isSamePhoto } from '../../services/googleSheetsService';
import { UploadMissingPhotosModal } from './UploadMissingPhotosModal';

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
  { key: 'EVALUADO', label: 'EVALUADO', shortLabel: 'EVALUAD.' },
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
    border: 'border-l-cyan-500 dark:border-l-cyan-400',
    badge: 'bg-cyan-50 text-cyan-800 border-cyan-300 dark:bg-cyan-950/80 dark:text-cyan-300 dark:border-cyan-500/50',
    text: 'text-cyan-700 dark:text-cyan-400',
    activeLine: 'border-cyan-500 bg-cyan-500 dark:border-cyan-400 dark:bg-cyan-400',
    activeText: 'text-cyan-700 dark:text-cyan-400 font-black',
    locationBadge: 'bg-cyan-50 text-cyan-800 border-cyan-300 dark:bg-cyan-950/80 dark:text-cyan-300 dark:border-cyan-500/50',
    rollosBox: {
      bg: 'bg-cyan-50/70 dark:bg-cyan-950/50',
      border: 'border-cyan-200 dark:border-cyan-500/50',
      label: 'text-cyan-700 dark:text-cyan-400',
      text: 'text-cyan-950 dark:text-cyan-200'
    }
  },
  SOLICITADO: {
    border: 'border-l-amber-500',
    badge: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-500/50',
    text: 'text-amber-700 dark:text-amber-400',
    activeLine: 'border-amber-500 bg-amber-500',
    activeText: 'text-amber-700 dark:text-amber-400 font-black',
    locationBadge: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-500/50',
    rollosBox: {
      bg: 'bg-amber-50/70 dark:bg-amber-950/50',
      border: 'border-amber-200 dark:border-amber-500/50',
      label: 'text-amber-700 dark:text-amber-400',
      text: 'text-amber-950 dark:text-amber-200'
    }
  },
  LAVANDERIA: {
    border: 'border-l-sky-500',
    badge: 'bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-950/80 dark:text-sky-300 dark:border-sky-500/50',
    text: 'text-sky-700 dark:text-sky-400',
    activeLine: 'border-sky-500 bg-sky-500',
    activeText: 'text-sky-700 dark:text-sky-400 font-black',
    locationBadge: 'bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-950/80 dark:text-sky-300 dark:border-sky-500/50',
    rollosBox: {
      bg: 'bg-sky-50/70 dark:bg-sky-950/50',
      border: 'border-sky-200 dark:border-sky-500/50',
      label: 'text-sky-700 dark:text-sky-400',
      text: 'text-sky-950 dark:text-sky-200'
    }
  },
  CALIDAD: {
    border: 'border-l-purple-500',
    badge: 'bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-500/50',
    text: 'text-purple-700 dark:text-purple-400',
    activeLine: 'border-purple-500 bg-purple-500',
    activeText: 'text-purple-700 dark:text-purple-400 font-black',
    locationBadge: 'bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-500/50',
    rollosBox: {
      bg: 'bg-purple-50/70 dark:bg-purple-950/50',
      border: 'border-purple-200 dark:border-purple-500/50',
      label: 'text-purple-700 dark:text-purple-400',
      text: 'text-purple-950 dark:text-purple-200'
    }
  },
  EVALUADO: {
    border: 'border-l-teal-500',
    badge: 'bg-teal-50 text-teal-800 border-teal-300 dark:bg-teal-950/80 dark:text-teal-300 dark:border-teal-500/50',
    text: 'text-teal-700 dark:text-teal-400',
    activeLine: 'border-teal-500 bg-teal-500',
    activeText: 'text-teal-700 dark:text-teal-400 font-black',
    locationBadge: 'bg-teal-50 text-teal-800 border-teal-300 dark:bg-teal-950/80 dark:text-teal-300 dark:border-teal-500/50',
    rollosBox: {
      bg: 'bg-teal-50/70 dark:bg-teal-950/50',
      border: 'border-teal-200 dark:border-teal-500/50',
      label: 'text-teal-700 dark:text-teal-400',
      text: 'text-teal-950 dark:text-teal-200'
    }
  },
  FINALIZADO: {
    border: 'border-l-emerald-500',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-500/50',
    text: 'text-emerald-700 dark:text-emerald-400',
    activeLine: 'border-emerald-500 bg-emerald-500',
    activeText: 'text-emerald-700 dark:text-emerald-400 font-black',
    locationBadge: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-500/50',
    rollosBox: {
      bg: 'bg-emerald-50/70 dark:bg-emerald-950/50',
      border: 'border-emerald-200 dark:border-emerald-500/50',
      label: 'text-emerald-700 dark:text-emerald-400',
      text: 'text-emerald-950 dark:text-emerald-200'
    }
  }
};

export const PROCESOS_LAVANDERIA: string[] = [
  'DESENGOME',
  'STONE',
  'BLEACH',
  'BLANCO OPTICO',
  'NEUTRALIZADO',
  'BLANQUEO',
  'FIJADO',
  'SUAVIZADO',
  'BRILLOS',
  'DESTROYED',
  'DIRTY',
  'SPRAY',
  'SPRAY TOTAL',
  'ESPONJA TOTAL',
  'LIJA',
  'BRILLOS LIJA',
  'TOMBOLA',
  'LASER',
  'LASER TEXTURA',
  'COSIDOS',
  'ESMERIL',
  'PIGMENTO',
  'SILICONADO',
  'ANTIPILLING',
  'ATMOSFERIC',
  'HORNO',
  'ENMALLADO',
  'TEÑIDO',
  'PROCESO SOSTENIBLE'
];

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
  const [filtroProceso, setFiltroProceso] = useState('');
  const [isExpandedProcesos, setIsExpandedProcesos] = useState(false);

  // Verificar si un proceso está activo en las notas de lavado
  const isProcesoActivo = (proceso: string, texto?: string) => {
    const target = (texto !== undefined ? texto : notasLavado) || '';
    if (!target) return false;
    const tokens = target.split(/\s*•\s*/).map(t => t.trim().toUpperCase());
    return tokens.includes(proceso.trim().toUpperCase());
  };

  // Alternar selección de proceso con auto-guardado en Columna L
  const handleToggleProcesoLavado = (proceso: string) => {
    const currentText = (notasLavado || '').trim();
    const tokens = currentText ? currentText.split(/\s*•\s*/).map(t => t.trim()).filter(Boolean) : [];
    const procesoUpper = proceso.trim().toUpperCase();
    const existingIndex = tokens.findIndex(t => t.toUpperCase() === procesoUpper);

    let nextVal = '';
    if (existingIndex >= 0) {
      const remaining = tokens.filter((_, idx) => idx !== existingIndex);
      nextVal = remaining.join(' • ');
    } else {
      nextVal = currentText ? `${currentText} • ${proceso}` : proceso;
    }

    setNotasLavado(nextVal);
    handleGuardarObservacionLavado(nextVal);
  };

  // Limpiar solo los procesos sugeridos sin borrar notas manuales adicionales
  const handleLimpiarProcesosSeleccionados = () => {
    const currentText = (notasLavado || '').trim();
    if (!currentText) return;
    const tokens = currentText.split(/\s*•\s*/).map(t => t.trim()).filter(Boolean);
    const restantes = tokens.filter(t => !PROCESOS_LAVANDERIA.some(p => p.toUpperCase() === t.toUpperCase()));
    const nextVal = restantes.join(' • ');
    setNotasLavado(nextVal);
    handleGuardarObservacionLavado(nextVal);
  };

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
  const [veredictoLocal, setVeredictoLocal] = useState<'APROBADO' | 'APROBADO EN GAMA' | 'RECHAZADO' | ''>('');
  const [obsCalidadLocal, setObsCalidadLocal] = useState('');
  const [fotoCalidadPreview, setFotoCalidadPreview] = useState<string | null>(() => {
    return solicitud.fotoCalidadUrl || getOpPhotosFromCache(solicitud.op)?.foto2 || null;
  });
  const [fotoMuestraPreview, setFotoMuestraPreview] = useState<string | null>(() => {
    const rawF1 = solicitud.fotoMuestraUrl || getOpPhotosFromCache(solicitud.op)?.foto1 || null;
    const rawF2 = solicitud.fotoCalidadUrl || getOpPhotosFromCache(solicitud.op)?.foto2 || null;
    if (rawF1 && rawF2 && isSamePhoto(rawF1, rawF2)) {
      return null;
    }
    return rawF1;
  });
  const [isUploadingCalidadPhoto, setIsUploadingCalidadPhoto] = useState(false);
  const [isUploadingInicialPhoto, setIsUploadingInicialPhoto] = useState(false);
  const [zoomedPhotoUrl, setZoomedPhotoUrl] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const calidadFileInputRef = useRef<HTMLInputElement>(null);
  const directFileInputRef1 = useRef<HTMLInputElement>(null);
  const directFileInputRef2 = useRef<HTMLInputElement>(null);

  const fotoCalidadUrlActual = fotoCalidadPreview || solicitud.fotoCalidadUrl;

  // Auto-descubrimiento y persistencia de fotos (Caché local + Google Drive)
  const [cachedOrDrivePhotos, setCachedOrDrivePhotos] = useState<{ foto1?: string; foto2?: string; folderUrl?: string } | null>(() => {
    return getOpPhotosFromCache(solicitud.op) || null;
  });

  // Sincronizar fotoCalidadPreview y fotoMuestraPreview si cambia la solicitud externamente
  useEffect(() => {
    const cached = getOpPhotosFromCache(solicitud.op);
    const f2 = solicitud.fotoCalidadUrl || cached?.foto2 || null;
    let f1 = solicitud.fotoMuestraUrl || cached?.foto1 || null;
    if (f1 && f2 && isSamePhoto(f1, f2)) {
      f1 = null;
    }
    setFotoCalidadPreview(f2);
    setFotoMuestraPreview(f1);
  }, [solicitud.fotoCalidadUrl, solicitud.fotoMuestraUrl, solicitud.op]);

  // Escuchar eventos globales de resolución de fotos de OP en tiempo real
  useEffect(() => {
    const handlePhotosUpdated = (e: Event) => {
      const customEvent = e as CustomEvent;
      const detail = customEvent.detail;
      const cleanSolOp = solicitud.op.replace(/\D/g, '') || solicitud.op.trim().toUpperCase();
      const cleanEventOp = (detail?.op || '').replace(/\D/g, '') || String(detail?.op || '').trim().toUpperCase();
      if (detail && (cleanSolOp === cleanEventOp || solicitud.op === detail.op)) {
        let detF1 = detail.foto1;
        let detF2 = detail.foto2;
        if (detF1 && detF2 && isSamePhoto(detF1, detF2)) {
          detF1 = undefined;
        }
        setCachedOrDrivePhotos(prev => {
          let prevF1 = detF1 !== undefined ? detF1 : prev?.foto1;
          let prevF2 = detF2 !== undefined ? detF2 : prev?.foto2;
          if (prevF1 && prevF2 && isSamePhoto(prevF1, prevF2)) {
            prevF1 = undefined;
          }
          return {
            ...prev,
            ...detail,
            foto1: prevF1,
            foto2: prevF2
          };
        });
        if (detF1) {
          setFotoMuestraPreview(detF1);
        } else if (detF2 && fotoMuestraPreview && isSamePhoto(fotoMuestraPreview, detF2)) {
          setFotoMuestraPreview(null);
        }
        if (detF2) {
          setFotoCalidadPreview(detF2);
        }
      }
    };
    window.addEventListener('stf_op_photos_updated', handlePhotosUpdated);
    return () => {
      window.removeEventListener('stf_op_photos_updated', handlePhotosUpdated);
    };
  }, [solicitud.op, fotoMuestraPreview]);

  useEffect(() => {
    const cached = getOpPhotosFromCache(solicitud.op);
    if (cached && (cached.foto1 || cached.foto2 || cached.folderUrl)) {
      setCachedOrDrivePhotos(cached);
    }
    const needsFoto1 = !solicitud.fotoMuestraUrl && !cached?.foto1;
    const needsFoto2 = solicitud.estado === 'FINALIZADO' && !fotoCalidadUrlActual && !cached?.foto2;
    if (needsFoto1 || needsFoto2) {
      let isMounted = true;
      fetchOpPhotosFromDrive(solicitud.op).then((res) => {
        if (isMounted && (res.foto1 || res.foto2 || res.folderUrl)) {
          let r1 = res.foto1;
          let r2 = res.foto2;
          if (r1 && r2 && isSamePhoto(r1, r2)) {
            r1 = undefined;
          }
          setCachedOrDrivePhotos({
            ...res,
            foto1: r1,
            foto2: r2
          });
          if (r1) setFotoMuestraPreview(r1);
          if (r2) {
            setFotoCalidadPreview(r2);
            if (fotoMuestraPreview && isSamePhoto(fotoMuestraPreview, r2)) {
              setFotoMuestraPreview(null);
            }
          }
        }
      });
      return () => {
        isMounted = false;
      };
    }
  }, [solicitud.op, solicitud.fotoMuestraUrl, solicitud.estado, fotoCalidadUrlActual, fotoMuestraPreview]);

  const cachedNow = getOpPhotosFromCache(solicitud.op);
  let rawFoto1 = fotoMuestraPreview || solicitud.fotoMuestraUrl || cachedOrDrivePhotos?.foto1 || cachedNow?.foto1 || undefined;
  let rawFoto2 = fotoCalidadUrlActual || cachedOrDrivePhotos?.foto2 || cachedNow?.foto2 || undefined;

  // BLINDAJE INMUTABLE: Si la foto inicial es idéntica a la foto 2 de calidad,
  // se anula foto 1 para que nunca se clone erróneamente en el slot 1 ('+ 1. Inicial')
  if (rawFoto1 && rawFoto2 && isSamePhoto(rawFoto1, rawFoto2)) {
    rawFoto1 = undefined;
  }

  const effectiveFotoMuestra = rawFoto1;
  const effectiveFotoCalidad = rawFoto2;

  // Carga directa de fotografías con subida automática inmediata a Google Drive
  const handleDirectCardPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, isCalidad: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isCalidad) setIsUploadingCalidadPhoto(true);
    else setIsUploadingInicialPhoto(true);

    try {
      const compressed = await compressImageFile(file, 650, 0.58);
      
      // 1. Visualización inmediata 0 ms
      if (isCalidad) {
        setFotoCalidadPreview(compressed);
        if (fotoMuestraPreview && isSamePhoto(fotoMuestraPreview, compressed)) {
          setFotoMuestraPreview(null);
        }
      } else {
        setFotoMuestraPreview(compressed);
        if (fotoCalidadPreview && isSamePhoto(fotoCalidadPreview, compressed)) {
          setFotoCalidadPreview(null);
        }
      }

      updateLocalOpPhoto(solicitud.id, compressed, isCalidad);
      updateLocalOpPhoto(solicitud.op, compressed, isCalidad);
      saveOpPhotosToCache(solicitud.op, isCalidad ? { foto2: compressed } : { foto1: compressed });

      // 2. Subida automática a Google Drive y persistencia en Columna M
      const res = await pushOpPhotoToSheets(solicitud.op, compressed, isCalidad);
      const driveUrl = res.driveUrl || (isCalidad ? res.foto2 : res.foto1);
      if (driveUrl) {
        if (isCalidad) {
          setFotoCalidadPreview(driveUrl);
          if (fotoMuestraPreview && isSamePhoto(fotoMuestraPreview, driveUrl)) {
            setFotoMuestraPreview(null);
          }
        } else {
          setFotoMuestraPreview(driveUrl);
          if (fotoCalidadPreview && isSamePhoto(fotoCalidadPreview, driveUrl)) {
            setFotoCalidadPreview(null);
          }
        }

        updateLocalOpPhoto(solicitud.id, driveUrl, isCalidad);
        updateLocalOpPhoto(solicitud.op, driveUrl, isCalidad);
        saveOpPhotosToCache(solicitud.op, isCalidad ? { foto2: driveUrl } : { foto1: driveUrl });
        setCachedOrDrivePhotos(prev => {
          let f1 = !isCalidad ? driveUrl : prev?.foto1;
          let f2 = isCalidad ? driveUrl : prev?.foto2;
          if (f1 && f2 && isSamePhoto(f1, f2)) {
            if (isCalidad) f1 = undefined;
            else f2 = undefined;
          }
          return {
            ...prev,
            foto1: f1,
            foto2: f2,
            folderUrl: res.folderUrl || prev?.folderUrl
          };
        });
      }
    } catch (err) {
      console.error('Error al subir foto directamente desde la tarjeta:', err);
      alert('Hubo un inconveniente al conectar con Google Drive. Por favor intenta de nuevo.');
    } finally {
      if (isCalidad) setIsUploadingCalidadPhoto(false);
      else setIsUploadingInicialPhoto(false);
      if (e.target) e.target.value = '';
    }
  };

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
      // Visualización instantánea a 0 ms
      setFotoCalidadPreview(compressed);
      
      // Persistir localmente como foto de calidad (isCalidad = true)
      updateLocalOpPhoto(solicitud.id, compressed, true);
      updateLocalOpPhoto(solicitud.op, compressed, true);

      // Sincronizar con Google Sheets & Drive (con sobreescritura estricta)
      const resPhoto = await pushOpPhotoToSheets(solicitud.op, compressed, true);
      const driveUrl = resPhoto?.driveUrl || resPhoto?.foto2;
      if (driveUrl) {
        updateLocalOpPhoto(solicitud.id, driveUrl, true);
        updateLocalOpPhoto(solicitud.op, driveUrl, true);
        setFotoCalidadPreview(driveUrl);
        setCachedOrDrivePhotos(prev => ({
          ...prev,
          foto2: driveUrl,
          folderUrl: resPhoto?.folderUrl || prev?.folderUrl
        }));
      }
    } catch (err) {
      console.error('Error al cargar foto de calidad:', err);
      alert('Hubo un error al procesar la imagen. Por favor intenta de nuevo.');
    } finally {
      setIsUploadingCalidadPhoto(false);
      if (calidadFileInputRef.current) {
        calidadFileInputRef.current.value = '';
      }
    }
  };

  // Emisión de Dictamen en Calidad: envía la OP a "EVALUADO Y ENVIADO"
  const handleEmitirDictamen = () => {
    if (!veredictoLocal) {
      alert('⚠️ Por favor seleccione el VEREDICTO (APROBADO, APROBADO EN GAMA o RECHAZADO) para emitir la evaluación técnica.');
      return;
    }
    if (!obsCalidadLocal.trim()) {
      alert('⚠️ Por favor ingrese la OBSERVACIÓN de la evaluación de calidad.');
      return;
    }

    const dictamen = veredictoLocal as DictamenType;
    const obsFinal = obsCalidadLocal.trim();
    const fotoFinal = fotoCalidadPreview || solicitud.fotoCalidadUrl;

    if (onDirectTransfer) {
      onDirectTransfer(solicitud.id, 'EVALUADO', obsFinal, dictamen, fotoFinal);
    } else {
      onTransfer(solicitud);
    }
  };

  // Acción Exclusiva de Colfactory / Factory: Finalizar OP desde "EVALUADO Y ENVIADO"
  const handleFinalizarColfactory = () => {
    const isFactory = isFactoryUser(currentUser);
    if (!isFactory) {
      alert('⚠️ Acción restringida: Únicamente los usuarios de Factory (Colfactory / Lavandería) tienen autorización para finalizar esta orden.');
      return;
    }

    if (onFinalizar) {
      onFinalizar(solicitud);
    } else if (onDirectTransfer) {
      const dictamen = solicitud.dictamen || 'APROBADO';
      const obs = solicitud.observacionesCalidad || 'Orden finalizada y liberada por Colfactory';
      const foto = fotoCalidadUrlActual || solicitud.fotoCalidadUrl;
      onDirectTransfer(solicitud.id, 'FINALIZADO', obs, dictamen, foto);
    }
  };

  const hasBothPhotos = Boolean(effectiveFotoMuestra && effectiveFotoCalidad);

  return (
    <div id={cardId} className={`bg-white dark:bg-[#0c1017] border border-zinc-200/90 dark:border-zinc-800 ${stageConfig.border} border-l-[8px] rounded-3xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_25px_rgba(255,255,255,0.06)] transition-all duration-300 text-zinc-950 dark:text-white scroll-mt-24`}>
      
      <div className="p-5 sm:p-6 space-y-4">
        
        {/* Top Header Row: Badges & Date */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-zinc-200/80 dark:border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Stage Pill */}
            <span className={`text-[11px] font-mono font-black px-3 py-1 rounded-xl border uppercase ${stageConfig.badge}`}>
              {stageConfig.border.includes('rose') ? '🚨 ' : ''}{solicitud.estado.replace('_', ' ')}
            </span>
            
            {/* Muestra Activa Pill / Dictamen Pill */}
            {solicitud.estado === 'FINALIZADO' ? (
              <span className={`text-[11px] font-mono font-black px-3 py-1 rounded-xl border flex items-center gap-1.5 ${
                solicitud.dictamen === 'RECHAZADO'
                  ? 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-600'
                  : solicitud.dictamen === 'APROBADO EN GAMA'
                  ? 'bg-teal-50 text-teal-800 border-teal-300 dark:bg-teal-950/80 dark:text-teal-300 dark:border-teal-600'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-600'
              }`}>
                <span>{solicitud.dictamen === 'RECHAZADO' ? '❌ RECHAZADO' : (solicitud.dictamen === 'APROBADO EN GAMA' ? '🎨 APROBADO EN GAMA' : '✅ APROBADO')}</span>
              </span>
            ) : (
              <span className="text-[11px] font-mono font-bold px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-dashed border-emerald-400 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-500/80 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>MUESTRA ACTIVA</span>
              </span>
            )}

            {/* SLA Delay Pill */}
            {solicitud.tieneRetraso && solicitud.estado !== 'FINALIZADO' && (
              <span className={`text-[11px] font-mono font-black px-3 py-1 rounded-xl border flex items-center gap-1.5 animate-pulse ${
                solicitud.esRetrasoCritico 
                  ? 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/90 dark:text-rose-300 dark:border-rose-500/80' 
                  : 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/90 dark:text-amber-300 dark:border-amber-500/80'
              }`}>
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>RETRASO SLA ({solicitud.diasHabiles}D/{solicitud.limiteSlaDias}D)</span>
              </span>
            )}
          </div>

          {/* Creation Date & Time Elapsed */}
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 dark:text-zinc-400">
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
                <h3 className="text-xl sm:text-2xl font-black font-mono tracking-tight text-zinc-950 dark:text-white">
                  {solicitud.op}
                </h3>
                <span className="text-sm sm:text-base font-bold text-zinc-500 dark:text-zinc-400 font-mono">
                  / REF - {solicitud.referencia}
                </span>
              </div>

              {/* View Technical Sheet Link */}
              <button
                type="button"
                onClick={() => onViewDetail(solicitud)}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Ver Ficha</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Fabric Tag & Mobile Photo Thumbnail Preview */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="inline-block bg-indigo-50 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/50 text-[11px] sm:text-xs font-black px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-xl font-mono">
                TELA: {solicitud.tela}
              </span>

              {/* Mobile Photo Mini-Preview Button (Touch-Friendly) */}
              <div className="flex sm:hidden items-center gap-1.5 flex-wrap">
                {solicitud.estado === 'FINALIZADO' ? (
                  <>
                    {/* Botón Móvil Foto 1 Inicial */}
                    {effectiveFotoMuestra ? (
                      <button
                        type="button"
                        onClick={() => setZoomedPhotoUrl(effectiveFotoMuestra)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-900/90 border border-emerald-500/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-mono font-bold shadow-xs active:scale-95 transition"
                        title="Toca para ver Foto 1 (Inicial)"
                      >
                        <img
                          src={effectiveFotoMuestra}
                          alt="Inicial"
                          referrerPolicy="no-referrer"
                          className="w-4 h-4 rounded-md object-cover border border-emerald-500/40"
                        />
                        <span>1. INICIAL</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => !isUploadingInicialPhoto && directFileInputRef1.current?.click()}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40 text-[9.5px] font-mono font-bold transition active:scale-95 cursor-pointer"
                        title="Toma o selecciona Foto 1 para subir a Drive"
                      >
                        {isUploadingInicialPhoto ? (
                          <RefreshCw className="w-3 h-3 text-emerald-500 animate-spin" />
                        ) : (
                          <Camera className="w-3 h-3 text-emerald-500" />
                        )}
                        <span>{isUploadingInicialPhoto ? 'Subiendo...' : '+ 1. Inicial'}</span>
                      </button>
                    )}

                    {/* Botón Móvil Foto 2 Calidad */}
                    {effectiveFotoCalidad ? (
                      <button
                        type="button"
                        onClick={() => setZoomedPhotoUrl(effectiveFotoCalidad)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/80 border border-purple-500/60 text-purple-700 dark:text-purple-300 text-[10px] font-mono font-bold shadow-xs active:scale-95 transition"
                        title="Toca para ver Foto 2 (Calidad)"
                      >
                        <img
                          src={effectiveFotoCalidad}
                          alt="Calidad"
                          referrerPolicy="no-referrer"
                          className="w-4 h-4 rounded-md object-cover border border-purple-500/40"
                        />
                        <span>2. CALIDAD</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => !isUploadingCalidadPhoto && directFileInputRef2.current?.click()}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-400 border border-purple-500/40 text-[9.5px] font-mono font-bold transition active:scale-95 cursor-pointer"
                        title="Toma o selecciona Foto 2 para subir a Drive"
                      >
                        {isUploadingCalidadPhoto ? (
                          <RefreshCw className="w-3 h-3 text-purple-500 animate-spin" />
                        ) : (
                          <Camera className="w-3 h-3 text-purple-500" />
                        )}
                        <span>{isUploadingCalidadPhoto ? 'Subiendo...' : '+ 2. Calidad'}</span>
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    {(effectiveFotoCalidad || effectiveFotoMuestra) ? (
                      <button
                        type="button"
                        onClick={() => {
                          const targetPhoto = effectiveFotoCalidad || effectiveFotoMuestra;
                          if (targetPhoto) setZoomedPhotoUrl(targetPhoto);
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-900/90 border border-amber-500/60 text-amber-700 dark:text-amber-400 text-[10.5px] font-mono font-bold shadow-xs active:scale-95 transition"
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
                      <button
                        type="button"
                        onClick={() => !isUploadingInicialPhoto && directFileInputRef1.current?.click()}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[9.5px] font-mono font-bold transition cursor-pointer hover:scale-105 active:scale-95"
                        title="Cargar evidencias fotográficas para esta OP en Google Drive"
                      >
                        {isUploadingInicialPhoto ? (
                          <RefreshCw className="w-3 h-3 text-amber-500 animate-spin" />
                        ) : (
                          <Camera className="w-3 h-3 text-amber-500" />
                        )}
                        <span>{isUploadingInicialPhoto ? 'Subiendo...' : '+ Cargar foto'}</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Operator & Color & Rollos Grid */}
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-zinc-50 dark:bg-zinc-900/90 p-3 rounded-2xl border border-zinc-200/90 dark:border-zinc-800">
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-sans font-bold block uppercase tracking-wider">REGISTRADO POR</span>
                  <span className="font-bold text-zinc-900 dark:text-white truncate block text-sm mt-0.5">{solicitud.inspector}</span>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-900/90 p-3 rounded-2xl border border-zinc-200/90 dark:border-zinc-800">
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-sans font-bold block uppercase tracking-wider">COLOR</span>
                  <span className="font-bold text-zinc-900 dark:text-white block text-sm mt-0.5">{solicitud.color}</span>
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

          {/* Right Action / Photo Box (VISOR EXCLUSIVO DE FOTOGRAFÍAS CON SUBIDA AUTOMÁTICA A DRIVE) */}
          <div className="hidden sm:flex flex-col items-center gap-2 flex-shrink-0">
            {solicitud.estado === 'FINALIZADO' ? (
              <div className="flex items-center gap-2">
                {/* SLOT 1: FOTO INICIAL */}
                {effectiveFotoMuestra ? (
                  <div
                    onClick={() => setZoomedPhotoUrl(effectiveFotoMuestra)}
                    className="w-20 h-28 rounded-2xl p-1.5 bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-300 dark:border-zinc-700 flex flex-col items-center justify-between cursor-pointer hover:border-emerald-500 group overflow-hidden shadow-sm transition relative"
                    title="Clic para ampliar Foto 1: Muestra Inicial (Corte)"
                  >
                    <img
                      src={effectiveFotoMuestra}
                      alt="Inicial"
                      referrerPolicy="no-referrer"
                      className="w-full h-18 object-cover rounded-xl group-hover:scale-105 transition"
                    />
                    <span className="text-[8px] font-black font-mono text-zinc-600 dark:text-zinc-400 uppercase flex items-center gap-1">
                      <Eye className="w-2.5 h-2.5 text-emerald-500" />
                      <span>1. INICIAL</span>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        directFileInputRef1.current?.click();
                      }}
                      className="absolute top-1 right-1 p-1 rounded-md bg-black/70 hover:bg-black text-white opacity-0 group-hover:opacity-100 transition shadow-xs cursor-pointer"
                      title="Cambiar Foto 1 (Drive)"
                    >
                      <Camera className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => !isUploadingInicialPhoto && directFileInputRef1.current?.click()}
                    className="w-20 h-28 rounded-2xl p-1.5 border-2 border-dashed border-emerald-500/40 hover:border-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 flex flex-col items-center justify-center text-center cursor-pointer transition group"
                    title="Clic para cargar Foto 1 (Inicial) a Google Drive"
                  >
                    {isUploadingInicialPhoto ? (
                      <RefreshCw className="w-5 h-5 text-emerald-500 animate-spin mb-1" />
                    ) : (
                      <Camera className="w-5 h-5 text-emerald-500 mb-1 group-hover:scale-110 transition stroke-[1.5]" />
                    )}
                    <span className="text-[7.5px] font-bold font-mono text-emerald-700 dark:text-emerald-400 uppercase leading-tight">
                      {isUploadingInicialPhoto ? 'Subiendo...' : '+ 1. Inicial'}
                    </span>
                    <span className="text-[6.5px] font-mono text-zinc-400 mt-0.5">Drive</span>
                  </div>
                )}

                {/* SLOT 2: FOTO CALIDAD */}
                {effectiveFotoCalidad ? (
                  <div
                    onClick={() => setZoomedPhotoUrl(effectiveFotoCalidad)}
                    className="w-20 h-28 rounded-2xl p-1.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-500/50 flex flex-col items-center justify-between cursor-pointer hover:border-purple-400 group overflow-hidden shadow-sm transition relative"
                    title="Clic para ampliar Foto 2: Calidad Post-Lavado"
                  >
                    <img
                      src={effectiveFotoCalidad}
                      alt="Calidad"
                      referrerPolicy="no-referrer"
                      className="w-full h-18 object-cover rounded-xl group-hover:scale-105 transition"
                    />
                    <span className="text-[8px] font-black font-mono text-purple-700 dark:text-purple-300 uppercase flex items-center gap-1">
                      <Eye className="w-2.5 h-2.5 text-purple-500" />
                      <span>2. CALIDAD</span>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        directFileInputRef2.current?.click();
                      }}
                      className="absolute top-1 right-1 p-1 rounded-md bg-black/70 hover:bg-black text-white opacity-0 group-hover:opacity-100 transition shadow-xs cursor-pointer"
                      title="Cambiar Foto 2 (Drive)"
                    >
                      <Camera className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => !isUploadingCalidadPhoto && directFileInputRef2.current?.click()}
                    className="w-20 h-28 rounded-2xl p-1.5 border-2 border-dashed border-purple-500/40 hover:border-purple-500 bg-purple-500/5 hover:bg-purple-500/10 flex flex-col items-center justify-center text-center cursor-pointer transition group"
                    title="Clic para cargar Foto 2 (Calidad) a Google Drive"
                  >
                    {isUploadingCalidadPhoto ? (
                      <RefreshCw className="w-5 h-5 text-purple-500 animate-spin mb-1" />
                    ) : (
                      <Camera className="w-5 h-5 text-purple-500 mb-1 group-hover:scale-110 transition stroke-[1.5]" />
                    )}
                    <span className="text-[7.5px] font-bold font-mono text-purple-700 dark:text-purple-300 uppercase leading-tight">
                      {isUploadingCalidadPhoto ? 'Subiendo...' : '+ 2. Calidad'}
                    </span>
                    <span className="text-[6.5px] font-mono text-zinc-400 mt-0.5">Drive</span>
                  </div>
                )}
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
                    ? 'bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-300 dark:border-zinc-700 cursor-pointer hover:border-amber-500 shadow-sm'
                    : 'bg-zinc-50 dark:bg-zinc-900/40 border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-amber-500 text-zinc-400 dark:text-zinc-500 cursor-pointer'
                }`}
                title={
                  (effectiveFotoCalidad || effectiveFotoMuestra)
                    ? 'Clic para ver y ampliar la fotografía de la muestra' 
                    : 'Clic para cargar foto directamente a Google Drive'
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
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition duration-200 rounded-2xl gap-1">
                      <div className="bg-black/80 px-2 py-1 rounded-lg text-[9px] font-mono font-bold text-white flex items-center gap-1 border border-zinc-700 shadow-md">
                        <Eye className="w-3 h-3 text-amber-400" />
                        <span>VER</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          directFileInputRef1.current?.click();
                        }}
                        className="bg-black/80 p-1 rounded-lg text-white hover:text-amber-400 border border-zinc-700 shadow-md cursor-pointer"
                        title="Cambiar foto en Drive"
                      >
                        <Camera className="w-3 h-3" />
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      directFileInputRef1.current?.click();
                    }}
                    className="w-full h-full flex flex-col items-center justify-center p-2 text-center group cursor-pointer hover:bg-amber-500/10 transition rounded-2xl"
                    title="Clic para tomar o seleccionar fotografía y subirla automáticamente a Drive"
                  >
                    {isUploadingInicialPhoto ? (
                      <RefreshCw className="w-6 h-6 mb-1 text-amber-500 animate-spin" />
                    ) : (
                      <Camera className="w-6 h-6 mb-1 text-amber-500/80 group-hover:scale-110 transition stroke-[1.5]" />
                    )}
                    <span className="text-[8.5px] font-bold uppercase tracking-wider text-center text-amber-600 dark:text-amber-400 font-mono">
                      {isUploadingInicialPhoto ? 'SUBIENDO...' : '+ CARGAR FOTO'}
                    </span>
                    <span className="text-[7.5px] font-mono text-zinc-400 mt-0.5">Automático a Drive</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Stepper Pipeline */}
        <div className="pt-2">
          <div className="grid grid-cols-6 text-center text-[8px] sm:text-[10px] font-mono tracking-wider border-b border-zinc-200/80 dark:border-zinc-800/80 pb-2.5">
            {STAGES.map((st, i) => {
              const isActive = i === currentStageIndex;
              const isPassed = i < currentStageIndex;
              return (
                <div key={st.key} className="relative pb-1">
                  <span className={isActive ? stageConfig.activeText : isPassed ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-zinc-400 dark:text-zinc-500'}>
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 gap-2 pt-1 font-mono">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-sans font-bold uppercase text-zinc-500 dark:text-zinc-400">Ubicación:</span>
            <span className={`px-3 py-1 rounded-xl text-[10px] font-bold border ${stageConfig.locationBadge}`}>
              {solicitud.estado === 'LAVANDERIA' ? 'LAVANDERÍA' : (solicitud.areaActual || 'LAVANDERÍA')}
            </span>
          </div>

          <div className="text-xs">
            Último control: <strong className="text-zinc-950 dark:text-white">{solicitud.inspector}</strong>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* GESTIÓN LAVANDERÍA: RECEPCIÓN TÉCNICA DE COLCHA (EXCLUSIVO LAVANDERÍA)  */}
        {/* ========================================================================= */}
        {(isLavanderiaUser(currentUser) || isAdminUser(currentUser)) && (solicitud.estado === 'PRE_SOLICITUD' || solicitud.estado === 'SOLICITADO') && (
          <div className="relative overflow-hidden bg-sky-50/70 dark:bg-gradient-to-br dark:from-sky-950/70 dark:via-[#0a1526] dark:to-[#070e1a] border-2 border-sky-300 dark:border-sky-500/40 rounded-3xl p-5 sm:p-6 space-y-4 mt-3 shadow-md dark:shadow-xl backdrop-blur-md animate-in fade-in duration-300">
            
            {/* Ambient Glow */}
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-sky-500/10 dark:bg-sky-400/20 rounded-full blur-2xl pointer-events-none" />

            {/* Header with icon and origin tag */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-sky-200 dark:border-sky-500/20 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-500/20 flex items-center justify-center border border-sky-300 dark:border-sky-400/40 text-sky-600 dark:text-sky-400 shadow-sm">
                  <Droplets className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-black text-sky-900 dark:text-sky-300 tracking-wide font-sans flex items-center gap-2">
                    GESTIÓN LAVANDERÍA
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-500/30">
                      RECEPCIÓN
                    </span>
                  </h4>
                  <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 font-mono">
                    Ingreso de muestra técnica al túnel de lavado
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-black px-3 py-1 rounded-xl bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-500/40 shadow-xs uppercase">
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
          <div className="relative overflow-hidden bg-sky-50/70 dark:bg-gradient-to-br dark:from-sky-950/80 dark:via-[#0a1424] dark:to-[#070e1a] border-2 border-sky-300 dark:border-sky-500/50 rounded-3xl p-5 sm:p-6 space-y-4 mt-3 shadow-md dark:shadow-2xl backdrop-blur-md animate-in fade-in duration-300">
            
            {/* Ambient glow */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-36 h-36 bg-sky-500/10 dark:bg-sky-400/20 rounded-full blur-2xl pointer-events-none" />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-sky-200 dark:border-sky-500/20 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-500/20 flex items-center justify-center border border-sky-300 dark:border-sky-400/40 text-sky-600 dark:text-sky-400 shadow-sm">
                  <Droplets className="w-4 h-4 text-sky-500 dark:text-sky-400 animate-bounce" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-black text-sky-900 dark:text-sky-300 tracking-wide font-sans flex items-center gap-2">
                    GESTIÓN LAVANDERÍA
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-500/30">
                      COLFACTORY ZF
                    </span>
                  </h4>
                  <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 font-mono">
                    Control de procesos, novedades técnicas y despacho a Calidad
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10.5px] font-mono font-bold px-3 py-1 rounded-xl bg-sky-100 dark:bg-sky-950/90 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-500/40 flex items-center gap-1.5 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-sky-500 dark:bg-sky-400 animate-ping"></span>
                  <span>EN LAVADO ACTIVO</span>
                </span>
              </div>
            </div>

            {/* Observaciones Input with Smart Quick Tags */}
            <div className="space-y-2.5">
              {/* Encabezado y Barra de Filtro / Control */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-[10.5px] font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  <span>OBSERVACIONES DE ENVÍO Y PROCESO</span>
                  <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-300 border border-sky-300/60 dark:border-sky-700/50">
                    {PROCESOS_LAVANDERIA.length} PROCESOS
                  </span>
                </label>

                {/* Filtro Rápido y Acciones */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Buscador de procesos */}
                  <div className="relative">
                    <input
                      type="text"
                      value={filtroProceso}
                      onChange={(e) => setFiltroProceso(e.target.value)}
                      placeholder="Filtrar proceso..."
                      className="w-28 sm:w-36 bg-white dark:bg-zinc-900 border border-sky-200 dark:border-zinc-700 rounded-xl pl-2.5 pr-6 py-1 text-[10px] font-mono text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-sky-500 transition shadow-2xs"
                    />
                    {filtroProceso ? (
                      <button
                        type="button"
                        onClick={() => setFiltroProceso('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                        title="Borrar filtro"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    ) : (
                      <Search className="w-2.5 h-2.5 text-zinc-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                    )}
                  </div>

                  {/* Botón Ver todos / Contraer */}
                  <button
                    type="button"
                    onClick={() => setIsExpandedProcesos(!isExpandedProcesos)}
                    className="text-[9.5px] font-mono font-bold px-2 py-1 rounded-xl bg-white hover:bg-sky-100 text-sky-800 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-sky-300 border border-sky-200 dark:border-zinc-700 transition cursor-pointer shadow-2xs"
                  >
                    {isExpandedProcesos ? 'Contraer' : 'Ver todos'}
                  </button>

                  {/* Contador y botón limpiar si hay seleccionados */}
                  {PROCESOS_LAVANDERIA.some(p => isProcesoActivo(p)) && (
                    <button
                      type="button"
                      onClick={handleLimpiarProcesosSeleccionados}
                      className="text-[9.5px] font-mono font-bold px-2 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:hover:bg-rose-900 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 transition cursor-pointer shadow-2xs flex items-center gap-1"
                      title="Quitar procesos seleccionados"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Limpiar</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Panel de Etiquetas de Procesos (Área Verde organizada) */}
              <div className="p-2 sm:p-2.5 rounded-2xl bg-white/70 dark:bg-zinc-900/70 border border-sky-200 dark:border-sky-900/50 shadow-xs backdrop-blur-xs">
                <div
                  className={`flex flex-wrap gap-1.5 transition-all duration-200 ${
                    isExpandedProcesos ? 'max-h-none' : 'max-h-24 sm:max-h-28 overflow-y-auto pr-1'
                  }`}
                  style={{ scrollbarWidth: 'thin' }}
                >
                  {PROCESOS_LAVANDERIA
                    .filter(proc => !filtroProceso || proc.toLowerCase().includes(filtroProceso.toLowerCase()))
                    .map((tag) => {
                      const activo = isProcesoActivo(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleToggleProcesoLavado(tag)}
                          className={`text-[9.5px] sm:text-[10px] font-mono font-bold px-2.5 py-1 rounded-xl border transition-all duration-150 cursor-pointer select-none active:scale-95 flex items-center gap-1 shadow-2xs ${
                            activo
                              ? 'bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 text-white border-sky-400 shadow-sky-500/30 scale-[1.02]'
                              : 'bg-white hover:bg-sky-50 text-zinc-700 hover:text-sky-900 dark:bg-zinc-900/90 dark:hover:bg-sky-950/80 dark:text-zinc-300 dark:hover:text-sky-200 border-zinc-200/90 dark:border-zinc-800 hover:border-sky-300 dark:hover:border-sky-600/60'
                          }`}
                          title={activo ? `Quitar ${tag} de la observación` : `Agregar ${tag} a la observación`}
                        >
                          {activo ? (
                            <Check className="w-3 h-3 text-sky-200 stroke-[3]" />
                          ) : (
                            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-black leading-none">+</span>
                          )}
                          <span>{tag}</span>
                        </button>
                      );
                    })}

                  {PROCESOS_LAVANDERIA.filter(proc => !filtroProceso || proc.toLowerCase().includes(filtroProceso.toLowerCase())).length === 0 && (
                    <div className="w-full text-center py-2 text-[10.5px] font-mono text-zinc-500 dark:text-zinc-400">
                      No se encontraron procesos que coincidan con "{filtroProceso}"
                    </div>
                  )}
                </div>
              </div>

              <textarea
                value={notasLavado}
                onChange={(e) => setNotasLavado(e.target.value)}
                onBlur={() => handleGuardarObservacionLavado()}
                rows={2}
                placeholder="Describa el proceso técnico realizado, formulación o novedades..."
                className="w-full bg-white dark:bg-zinc-950/90 border-2 border-zinc-200 dark:border-zinc-800 rounded-2xl p-3.5 text-xs text-zinc-950 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition font-mono shadow-xs"
              />

              {/* Botón de Guardado Directo en Columna L & Confirmación Visual */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => handleGuardarObservacionLavado()}
                  disabled={isSavingLavado}
                  className="inline-flex items-center gap-1.5 text-[10.5px] font-mono font-bold px-3 py-1.5 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-800 hover:text-sky-900 dark:bg-sky-950/90 dark:hover:bg-sky-900 dark:text-sky-300 dark:hover:text-sky-100 border border-sky-300 dark:border-sky-500/50 transition cursor-pointer active:scale-95 shadow-xs disabled:opacity-50"
                  title="Guardar de inmediato esta observación en la Columna L (OBSERVACIÓN COLFACTORY) de Google Sheets"
                >
                  {isSavingLavado ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-600 dark:text-sky-400" />
                      <span>Guardando en Columna L...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                      <span>💾 GUARDAR EN COLUMNA L (COLFACTORY)</span>
                    </>
                  )}
                </button>

                {saveSuccessMsg && (
                  <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold animate-pulse">
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
                  className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-500/40 py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-xs active:scale-[0.99]"
                  title="Devolver OP por error o novedad técnica en lavandería"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
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
            <div className="bg-purple-50/60 dark:bg-[#0e121e] border-2 border-purple-200 dark:border-indigo-500/40 rounded-3xl p-5 space-y-4 mt-3 shadow-md dark:shadow-xl animate-in fade-in duration-200">
              
              {/* Header: (✓) CONTROL DE CALIDAD (STF) */}
              <div className="flex items-center justify-between border-b border-purple-200 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h4 className="text-sm sm:text-base font-black text-indigo-950 dark:text-indigo-300 tracking-wide font-sans">
                    CONTROL DE CALIDAD (STF)
                  </h4>
                </div>
                <span className="text-[10px] font-mono font-black px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/40">
                  AUDITORÍA FINAL
                </span>
              </div>

              {/* Form 3 Columns: Veredicto, Observación Final, Foto */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
                
                {/* 1. VEREDICTO * */}
                <div className="md:col-span-4 space-y-1.5">
                  <label className="block text-[10.5px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider font-mono">
                    VEREDICTO <span className="text-rose-500 font-black">*</span>
                  </label>
                  <select
                    value={veredictoLocal}
                    onChange={(e) => setVeredictoLocal(e.target.value as 'APROBADO' | 'APROBADO EN GAMA' | 'RECHAZADO' | '')}
                    className="w-full bg-white dark:bg-zinc-950 border-2 border-zinc-300 dark:border-zinc-700 rounded-2xl p-3 text-xs text-zinc-950 dark:text-white focus:outline-none focus:border-indigo-500 font-bold transition shadow-xs cursor-pointer"
                  >
                    <option value="">-- Veredicto --</option>
                    <option value="APROBADO">✅ APROBADO</option>
                    <option value="APROBADO EN GAMA">🎨 APROBADO EN GAMA</option>
                    <option value="RECHAZADO">❌ RECHAZADO</option>
                  </select>
                </div>

                {/* 2. OBSERVACIÓN FINAL * */}
                <div className="md:col-span-5 space-y-1.5">
                  <label className="block text-[10.5px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider font-mono">
                    OBSERVACIÓN FINAL <span className="text-rose-500 font-black">*</span>
                  </label>
                  <input
                    type="text"
                    value={obsCalidadLocal}
                    onChange={(e) => setObsCalidadLocal(e.target.value)}
                    placeholder="Escriba la observación técnica final..."
                    className="w-full bg-white dark:bg-zinc-950 border-2 border-zinc-300 dark:border-zinc-700 rounded-2xl p-3 text-xs text-zinc-950 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition font-mono shadow-xs"
                  />
                </div>

                {/* 3. FOTO * */}
                <div className="md:col-span-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10.5px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider font-mono flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>FOTO 2 (CALIDAD) <span className="text-rose-500 font-black">*</span></span>
                    </label>
                    <span className={`text-[9.5px] font-mono font-bold ${
                      isUploadingCalidadPhoto
                        ? 'text-amber-500 animate-pulse'
                        : fotoCalidadUrlActual 
                        ? 'text-emerald-600 dark:text-emerald-400' 
                        : 'text-zinc-500 dark:text-zinc-400'
                    }`}>
                      {isUploadingCalidadPhoto ? '⏳ EN DRIVE...' : (fotoCalidadUrlActual ? '✓ CARGADA' : 'SIN FOTO')}
                    </span>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => calidadFileInputRef.current?.click()}
                    disabled={isUploadingCalidadPhoto}
                    className="w-full bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 border border-zinc-800 dark:border-zinc-300 py-3 px-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-md active:scale-[0.99] disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingCalidadPhoto ? 'GUARDANDO EN DRIVE...' : 'ACTUALIZAR FOTO'}</span>
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

              {/* ACTION BUTTON: ENVIAR A EVALUADO Y ENVIADO */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleEmitirDictamen}
                  className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-teal-600 hover:from-purple-500 hover:to-teal-500 text-white py-3.5 px-5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-lg active:scale-[0.99]"
                >
                  <span>ENVIAR A EVALUADO Y ENVIADO {veredictoLocal ? `(${veredictoLocal})` : ''}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          ) : (
            <div className="bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-500/30 rounded-3xl p-4 sm:p-5 text-center mt-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-center gap-2 text-purple-700 dark:text-purple-400 font-bold text-xs sm:text-sm font-mono">
                <Microscope className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-pulse" />
                <span>OP EN AUDITORÍA TÉCNICA DE CALIDAD (LABORATORIO STF)</span>
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1.5 font-mono max-w-xl mx-auto">
                Esta colcha física está en evaluación por los inspectores del laboratorio de Calidad para registrar el veredicto técnico (Aprobado/Rechazado), observación y fotografía post-lavado, y enviarla a Evaluado y Enviado.
              </p>
            </div>
          )
        )}

        {/* ========================================================================= */}
        {/* APARTADO: EVALUADO Y ENVIADO (COCKPIT FACTORY / LIBERACIÓN FINAL)         */}
        {/* ========================================================================= */}
        {solicitud.estado === 'EVALUADO' && (
          <div className="relative overflow-hidden bg-teal-50/80 dark:bg-gradient-to-br dark:from-teal-950/70 dark:via-[#0c181f] dark:to-[#071317] border-2 border-teal-300 dark:border-teal-500/50 rounded-3xl p-5 sm:p-6 space-y-4 mt-3 shadow-md dark:shadow-xl backdrop-blur-md animate-in fade-in duration-300">
            {/* Ambient glow */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-36 h-36 bg-teal-500/10 dark:bg-teal-400/20 rounded-full blur-2xl pointer-events-none" />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-teal-200 dark:border-teal-500/20 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-500/20 flex items-center justify-center border border-teal-300 dark:border-teal-400/40 text-teal-600 dark:text-teal-400 shadow-sm">
                  <CheckCircle2 className="w-4 h-4 text-teal-500 dark:text-teal-400" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-black text-teal-950 dark:text-teal-300 tracking-wide font-sans flex items-center gap-2">
                    EVALUADO Y ENVIADO
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-500/30">
                      ESPERA FACTORY
                    </span>
                  </h4>
                  <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 font-mono">
                    Auditoría de Calidad completada. Pendiente de finalización por parte de Factory.
                  </p>
                </div>
              </div>

              {/* Dictamen Badge */}
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-mono font-black px-3 py-1 rounded-xl border flex items-center gap-1.5 shadow-xs ${
                  solicitud.dictamen === 'APROBADO'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-500/40'
                    : solicitud.dictamen === 'APROBADO EN GAMA'
                    ? 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-500/40'
                    : 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-500/40'
                }`}>
                  <span>{solicitud.dictamen === 'APROBADO' ? '✅' : solicitud.dictamen === 'APROBADO EN GAMA' ? '🎨' : '❌'}</span>
                  <span>VEREDICTO: {solicitud.dictamen || 'APROBADO'}</span>
                </span>
              </div>
            </div>

            {/* Quality Summary Box */}
            <div className="bg-white/80 dark:bg-zinc-950/60 border border-teal-200/80 dark:border-teal-500/30 rounded-2xl p-3.5 space-y-2">
              <div className="text-[10.5px] font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider font-mono flex items-center justify-between">
                <span>CONCEPTO TÉCNICO DE CALIDAD:</span>
                <span className="text-zinc-400 text-[10px] font-normal">AUDITORÍA STF</span>
              </div>
              <p className="text-xs font-mono text-zinc-800 dark:text-zinc-200 bg-teal-50/50 dark:bg-teal-950/30 p-2.5 rounded-xl border border-teal-200/50 dark:border-teal-500/20">
                {solicitud.observacionesCalidad || 'Muestra evaluada y conforme según especificaciones técnicas.'}
              </p>
            </div>

            {/* Action Area: FACTORY ONLY BUTTON vs LOCKED INFO */}
            {isFactoryUser(currentUser) ? (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleFinalizarColfactory}
                  className="w-full group relative overflow-hidden bg-gradient-to-r from-teal-600 via-emerald-600 to-green-600 hover:from-teal-500 hover:to-emerald-500 text-white py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-3 transition-all duration-200 cursor-pointer shadow-lg shadow-emerald-600/25 active:scale-[0.99] border border-emerald-400/40"
                  title="Finalizar OP y pasar a FINALIZADOS"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-100 group-hover:scale-125 transition-transform duration-200" />
                  <span className="font-mono text-sm tracking-wide">FINALIZAR</span>
                  <ArrowRight className="w-4 h-4 text-emerald-100 group-hover:translate-x-1 transition-transform duration-200" />
                </button>
                <p className="text-center text-[10px] text-zinc-500 dark:text-zinc-400 font-mono mt-2">
                  ✓ Acceso exclusivo Colfactory (Factory). Al pulsar Finalizar, la OP pasa a FINALIZADOS y se liberará formalmente.
                </p>
              </div>
            ) : (
              <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/30 rounded-2xl p-3 text-center">
                <div className="flex items-center justify-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs font-mono">
                  <span>🔒 ESPERANDO FINALIZACIÓN POR COLFACTORY (FACTORY)</span>
                </div>
                <p className="text-[10.5px] text-zinc-600 dark:text-zinc-400 mt-1 font-mono">
                  Esta orden ya fue evaluada por Calidad. El botón de finalizar es exclusivo para el equipo de Factory.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Bottom Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 pt-3 border-t border-zinc-200/80 dark:border-zinc-800/80">
          <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => onViewDetail(solicitud)}
              className="px-3 sm:px-4 py-2.5 rounded-xl sm:rounded-2xl bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-black flex items-center justify-center gap-1.5 sm:gap-2 transition cursor-pointer shadow-md"
            >
              <Eye className="w-4 h-4 text-amber-400" />
              <span>VER DETALLE</span>
            </button>

            <button
              onClick={() => onPrint(solicitud)}
              className="px-3 sm:px-4 py-2.5 rounded-xl sm:rounded-2xl bg-transparent border-2 border-zinc-300 text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800 text-xs font-black flex items-center justify-center gap-1.5 sm:gap-2 transition cursor-pointer"
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
                className="col-span-2 sm:col-span-1 px-3 sm:px-4 py-2.5 rounded-xl sm:rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-500 border border-rose-300 dark:border-rose-400/60 text-xs font-black flex items-center justify-center gap-1.5 sm:gap-2 transition cursor-pointer shadow-xs hover:scale-105 active:scale-95 duration-150"
                title="Eliminar esta OP automáticamente (Exclusivo Perfil ediaz)"
              >
                <Trash2 className="w-4 h-4 text-rose-500" />
                <span>ELIMINAR</span>
              </button>
            )}

            {/* BOTÓN FINALIZAR (EXCLUSIVO PERFIL FACTORY - OP EN EVALUADO) */}
            {isFactoryUser(currentUser) && solicitud.estado === 'EVALUADO' && onFinalizar && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onFinalizar(solicitud);
                }}
                className="col-span-2 sm:col-span-1 px-3 sm:px-4 py-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-black flex items-center justify-center gap-1.5 sm:gap-2 transition cursor-pointer shadow-md hover:scale-105 active:scale-95 duration-150 font-mono"
                title="Dar por finalizada esta OP y moverla a Finalizados (Exclusivo Factory)"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-100" />
                <span>FINALIZAR</span>
              </button>
            )}
          </div>

          {solicitud.estado === 'FINALIZADO' ? (
            <span className={`text-xs font-bold px-3.5 py-2 rounded-xl sm:rounded-2xl border font-mono flex items-center justify-center gap-1.5 shadow-xs w-full sm:w-auto ${
              solicitud.dictamen === 'RECHAZADO'
                ? 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-500/40'
                : solicitud.dictamen === 'APROBADO EN GAMA'
                ? 'bg-teal-50 text-teal-800 border-teal-300 dark:bg-teal-950/80 dark:text-teal-300 dark:border-teal-500/40'
                : 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-500/40'
            }`}>
              <span>{solicitud.dictamen === 'RECHAZADO' ? '❌ RECHAZADO' : (solicitud.dictamen === 'APROBADO EN GAMA' ? '🎨 LIBERADO / APROBADO EN GAMA' : '✅ LIBERADO / APROBADO')}</span>
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

      {/* MODAL PARA CARGAR FOTOS FALTANTES A GOOGLE DRIVE */}
      <UploadMissingPhotosModal
        solicitud={solicitud}
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={(photos) => {
          if (photos.foto2) setFotoCalidadPreview(photos.foto2);
          if (photos.folderUrl || photos.foto1 || photos.foto2) {
            setCachedOrDrivePhotos(prev => ({ ...prev, ...photos }));
          }
        }}
      />

      {/* Hidden file inputs for direct one-touch card photo upload to Google Drive */}
      <input
        ref={directFileInputRef1}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleDirectCardPhotoUpload(e, false)}
        className="hidden"
      />
      <input
        ref={directFileInputRef2}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleDirectCardPhotoUpload(e, true)}
        className="hidden"
      />

    </div>
  );
};

