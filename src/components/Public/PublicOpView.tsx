import React, { useState, useMemo, useEffect } from 'react';
import { 
  QrCode, RefreshCw, CheckCircle2, AlertTriangle, Clock, 
  Layers, User, Calendar, Sparkles, Image as ImageIcon,
  X, LogIn, Sun, Moon, Maximize2, Camera, FolderOpen, ExternalLink, ArrowLeft, ArrowRight
} from 'lucide-react';
import { SolicitudColcha, SectorType, DictamenType } from '../../types';
import { UsuarioSTF } from '../../services/authService';
import { formatColombianDisplayDate } from '../../services/slaCalculator';
import { normalizeImageUrl, getLocalCreatedOps, saveLocalCreatedOp, isMatchingOp, fetchOpPhotosFromDrive, getOpPhotosFromCache, isSamePhoto } from '../../services/googleSheetsService';
import { getCleanFinalQualityObservation, getCleanInitialObservation } from '../../services/exportService';
import { SmartPhotoDisplay } from '../Common/SmartPhotoDisplay';
import { parsePublicTrackingPayload } from '../../services/qrTrackingService';
import { mapAreaName } from '../../services/googleSheetsService';
import { STFLogo } from '../Common/STFLogo';

interface PublicOpViewProps {
  opNumber: string;
  solicitudes: SolicitudColcha[];
  isSyncing: boolean;
  onRefreshData: () => void;
  onGoToLogin: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onBackToAlerts?: () => void;
  onOpenInApp?: (op: string) => void;
}

export const PublicOpView: React.FC<PublicOpViewProps> = ({
  opNumber,
  solicitudes,
  isSyncing,
  onRefreshData,
  onGoToLogin,
  isDarkMode,
  onToggleTheme,
  onBackToAlerts,
  onOpenInApp
}) => {
  const [zoomedPhoto, setZoomedPhoto] = useState<{ url: string; title: string } | null>(null);
  const [remoteDrivePhotos, setRemoteDrivePhotos] = useState<{ foto1?: string; foto2?: string; folderUrl?: string } | null>(() => {
    return getOpPhotosFromCache(opNumber) || null;
  });

  // Detección de sesión activa guardada en el dispositivo
  const savedUser: UsuarioSTF | null = useMemo(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem('stf_colchas_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, []);

  // Auto-cargar datos frescos al montar y cada 12 segundos para garantizar actualización en tiempo real en móviles
  useEffect(() => {
    onRefreshData();
    const interval = setInterval(() => {
      onRefreshData();
    }, 12000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        onRefreshData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [onRefreshData]);

  // Find OP in live data + localStorage + QR Encoded URL Payload
  const colcha = useMemo(() => {
    // 1. Decodificar la carga útil del QR si viene en la URL (?d=...)
    const parsedQr = parsePublicTrackingPayload();
    const targetOp = parsedQr?.op || opNumber;

    const matchOp = (s: SolicitudColcha) => {
      return isMatchingOp(s.op, targetOp);
    };

    if (parsedQr) {
      try {
        saveLocalCreatedOp(parsedQr);
      } catch (e) {}
    }

    const liveFound = solicitudes.find(matchOp);
    const localOps = getLocalCreatedOps();
    const localFound = localOps.find(matchOp);

    // Cuando se consulta la OP, liveFound (base de datos en vivo de Google Sheets) es la máxima fuente de verdad para el estado actual de la OP
    const base = liveFound || localFound || parsedQr;
    if (!base) return null;

    const estadoFinal: SectorType = liveFound?.estado 
      || (localFound?.fechaActualizacion ? localFound.estado : undefined) 
      || parsedQr?.estado 
      || base.estado;

    let dictamenFinal: DictamenType = 'PENDIENTE';
    if (liveFound?.dictamen) {
      dictamenFinal = liveFound.dictamen;
    } else if (localFound?.dictamen) {
      dictamenFinal = localFound.dictamen;
    } else if (parsedQr?.dictamen) {
      dictamenFinal = parsedQr.dictamen;
    } else if (estadoFinal === 'FINALIZADO') {
      dictamenFinal = 'APROBADO';
    }

    const cachedPhotos = getOpPhotosFromCache(targetOp);
    const bestFotoMuestra = liveFound?.fotoMuestraUrl || localFound?.fotoMuestraUrl || parsedQr?.fotoMuestraUrl || cachedPhotos?.foto1;
    const bestFotoCalidad = liveFound?.fotoCalidadUrl || localFound?.fotoCalidadUrl || parsedQr?.fotoCalidadUrl || cachedPhotos?.foto2;

    const obsCalidad = liveFound?.observacionesCalidad || localFound?.observacionesCalidad || ((estadoFinal === 'FINALIZADO' || estadoFinal === 'EVALUADO') ? parsedQr?.observacionesCalidad : '') || '';
    const obsOperario = liveFound?.observacionesOperario || localFound?.observacionesOperario || parsedQr?.observacionesOperario || '';
    const obsLavanderia = liveFound?.observacionesLavanderia || localFound?.observacionesLavanderia || '';

    return {
      ...base,
      op: liveFound?.op || parsedQr?.op || base.op,
      referencia: liveFound?.referencia || parsedQr?.referencia || base.referencia,
      tela: liveFound?.tela || parsedQr?.tela || base.tela,
      color: liveFound?.color || parsedQr?.color || base.color,
      rollos: liveFound?.rollos !== undefined ? liveFound.rollos : (parsedQr?.rollos !== undefined ? parsedQr.rollos : base.rollos),
      codigoMt: liveFound?.codigoMt || parsedQr?.codigoMt || base.codigoMt,
      lote: liveFound?.lote || parsedQr?.lote || base.lote,
      inspector: liveFound?.inspector || parsedQr?.inspector || base.inspector,
      fechaCreacion: liveFound?.fechaCreacion || parsedQr?.fechaCreacion || base.fechaCreacion,
      fotoMuestraUrl: bestFotoMuestra,
      fotoCalidadUrl: bestFotoCalidad,
      driveFolderUrl: liveFound?.driveFolderUrl || localFound?.driveFolderUrl || cachedPhotos?.folderUrl || undefined,
      observacionesCalidad: obsCalidad,
      observacionesOperario: obsOperario,
      observacionesLavanderia: obsLavanderia,
      dictamen: dictamenFinal,
      estado: estadoFinal,
      areaActual: liveFound?.areaActual || localFound?.areaActual || mapAreaName(estadoFinal),
      diasHabiles: liveFound?.diasHabiles !== undefined ? liveFound.diasHabiles : (parsedQr?.diasHabiles !== undefined ? parsedQr.diasHabiles : base.diasHabiles),
      horasEnProceso: liveFound?.horasEnProceso !== undefined ? liveFound.horasEnProceso : (parsedQr?.horasEnProceso !== undefined ? parsedQr.horasEnProceso : base.horasEnProceso),
      tieneRetraso: liveFound?.tieneRetraso !== undefined ? liveFound.tieneRetraso : (parsedQr?.tieneRetraso !== undefined ? parsedQr.tieneRetraso : base.tieneRetraso),
      esRetrasoCritico: liveFound?.esRetrasoCritico !== undefined ? liveFound.esRetrasoCritico : (parsedQr?.esRetrasoCritico !== undefined ? parsedQr.esRetrasoCritico : base.esRetrasoCritico)
    };
  }, [solicitudes, opNumber]);

  // Escuchar eventos globales de resolución de fotos de OP en tiempo real
  useEffect(() => {
    const handlePhotosUpdated = (e: Event) => {
      const customEvent = e as CustomEvent;
      const detail = customEvent.detail;
      const targetOp = colcha?.op || opNumber;
      if (!targetOp || !detail) return;
      const cleanTarget = targetOp.replace(/\D/g, '') || targetOp.trim().toUpperCase();
      const cleanEvent = (detail?.op || '').replace(/\D/g, '') || String(detail?.op || '').trim().toUpperCase();
      if (cleanTarget === cleanEvent || targetOp === detail.op) {
        setRemoteDrivePhotos((prev) => ({ ...prev, ...detail }));
      }
    };
    window.addEventListener('stf_op_photos_updated', handlePhotosUpdated);
    return () => {
      window.removeEventListener('stf_op_photos_updated', handlePhotosUpdated);
    };
  }, [colcha?.op, opNumber]);

  // Auto-descubrimiento en tiempo real de fotos en Google Drive si no vienen en la base de datos o el QR
  useEffect(() => {
    const targetOp = colcha?.op || opNumber;
    if (!targetOp) return;

    // Verificar primero en caché local persistente para despliegue en 0 ms
    const cached = getOpPhotosFromCache(targetOp);
    if (cached && (cached.foto1 || cached.foto2 || cached.folderUrl)) {
      setRemoteDrivePhotos((prev) => ({ ...cached, ...prev }));
    }

    // Si ya tenemos ambas fotos con URLs remotas válidas, no es necesario consultar Drive
    if (
      colcha?.fotoMuestraUrl && 
      colcha?.fotoCalidadUrl && 
      colcha.fotoMuestraUrl.startsWith('http') && 
      colcha.fotoCalidadUrl.startsWith('http')
    ) {
      return;
    }

    let isMounted = true;
    fetchOpPhotosFromDrive(targetOp).then((photos) => {
      if (isMounted && (photos.foto1 || photos.foto2 || photos.folderUrl)) {
        setRemoteDrivePhotos((prev) => ({ ...prev, ...photos }));
      }
    });

    return () => {
      isMounted = false;
    };
  }, [colcha?.op, opNumber, colcha?.fotoMuestraUrl, colcha?.fotoCalidadUrl]);

  // Enlace directo oficial de la carpeta de Google Drive donde reposan las fotos de la OP
  const folderDriveUrl = useMemo(() => {
    const cached = getOpPhotosFromCache(colcha?.op || opNumber);
    return colcha?.driveFolderUrl || remoteDrivePhotos?.folderUrl || cached?.folderUrl || undefined;
  }, [colcha?.driveFolderUrl, remoteDrivePhotos?.folderUrl, colcha?.op, opNumber]);

  // Normalized display photo URLs (priorizando fotos en alta resolución de Google Drive o locales)
  const fotoInicialUrl = useMemo(() => {
    let f1 = normalizeImageUrl(remoteDrivePhotos?.foto1 || colcha?.fotoMuestraUrl);
    let f2 = normalizeImageUrl(remoteDrivePhotos?.foto2 || colcha?.fotoCalidadUrl);
    if (f1 && f2 && isSamePhoto(f1, f2)) {
      return undefined;
    }
    return f1;
  }, [remoteDrivePhotos?.foto1, remoteDrivePhotos?.foto2, colcha?.fotoMuestraUrl, colcha?.fotoCalidadUrl]);

  const fotoCalidadUrl = useMemo(() => {
    return normalizeImageUrl(remoteDrivePhotos?.foto2 || colcha?.fotoCalidadUrl);
  }, [remoteDrivePhotos?.foto2, colcha?.fotoCalidadUrl]);

  // Clean digits and normalized formatted OP code
  const cleanOpDigits = useMemo(() => {
    return (colcha?.op || opNumber).replace(/^OP-?/i, '').trim();
  }, [colcha?.op, opNumber]);

  const displayOpCode = useMemo(() => {
    return `OP-${cleanOpDigits}`;
  }, [cleanOpDigits]);

  const stages: { id: SectorType; label: string; icon: string; desc: string }[] = [
    { id: 'PRE_SOLICITUD', label: '1. Atelier / Corte', icon: '✂️', desc: 'Muestra cortada y preparada' },
    { id: 'SOLICITADO', label: '2. En Tránsito', icon: '🚚', desc: 'Despacho hacia Lavandería' },
    { id: 'LAVANDERIA', label: '3. Lavandería ZF', icon: '💧', desc: 'Proceso de lavado industrial' },
    { id: 'CALIDAD', label: '4. Calidad Lab', icon: '🔬', desc: 'Inspección técnica y tono' },
    { id: 'EVALUADO', label: '5. Evaluado y Enviado', icon: '📋', desc: 'Evaluada, en espera Colfactory' },
    { id: 'FINALIZADO', label: '6. Liberado', icon: '✅', desc: 'Aprobado para producción' }
  ];

  const getStageIndex = (estado?: SectorType): number => {
    switch (estado) {
      case 'PRE_SOLICITUD': return 0;
      case 'SOLICITADO': return 1;
      case 'LAVANDERIA': return 2;
      case 'CALIDAD': return 3;
      case 'EVALUADO': return 4;
      case 'FINALIZADO': return 5;
      default: return 1;
    }
  };

  const currentStageIdx = getStageIndex(colcha?.estado);

  return (
    <div className={`min-h-screen transition-colors duration-200 ${isDarkMode ? 'dark bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'} font-sans select-none flex flex-col justify-between`}>
      
      {/* 1. TOP HEADER (BRAND & QUICK ACTIONS) */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0c1017]/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-3.5 sm:px-6 pt-mobile-safe pb-3 flex items-center justify-between shadow-sm gap-2">
        <div className="flex items-center gap-2 sm:gap-3">
          {onBackToAlerts && (
            <button
              type="button"
              onClick={onBackToAlerts}
              className="px-2.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-rose-600 dark:text-rose-400 text-xs font-mono font-bold flex items-center gap-1 transition cursor-pointer border border-zinc-200 dark:border-zinc-700"
              title="Volver a la Central de Alertas"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Alertas</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <STFLogo isWhite={isDarkMode} className="h-8 sm:h-10 w-36 sm:w-48" />
            <span className="hidden md:inline px-2 py-0.5 rounded-full text-[9px] font-mono font-black bg-emerald-500 text-black uppercase">
              EN VIVO
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <button
            type="button"
            onClick={onRefreshData}
            disabled={isSyncing}
            className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            title="Sincronizar en tiempo real"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-emerald-500 dark:text-emerald-400' : ''}`} />
            <span className="hidden sm:inline">{isSyncing ? 'Actualizando...' : 'Actualizar'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
            title="Cambiar tema"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

          {/* Login as Staff button */}
          <button
            type="button"
            onClick={onGoToLogin}
            className="px-3.5 py-2 rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ingresar al Sistema</span>
          </button>
        </div>
      </header>

      {/* BANNER INTELIGENTE: SESIÓN ACTIVA DETECTADA EN DISPOSITIVO */}
      {savedUser && (
        <div className="bg-gradient-to-r from-emerald-950 via-[#03231a] to-emerald-950 border-b border-emerald-500/50 text-white px-3.5 sm:px-6 py-2.5 shadow-md flex items-center justify-between gap-2.5 text-xs font-mono animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            <div className="truncate text-[11px] sm:text-xs">
              <span className="text-zinc-300">Sesión activa de </span>
              <strong className="text-emerald-300">{savedUser.nombre}</strong>
              <span className="text-zinc-400 font-normal hidden sm:inline"> • {savedUser.area}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (onOpenInApp) {
                onOpenInApp(colcha?.op || opNumber);
              } else {
                const url = new URL(window.location.href);
                url.searchParams.delete('view');
                window.location.href = url.toString();
              }
            }}
            className="shrink-0 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black uppercase text-[10px] sm:text-[11px] tracking-wider transition-all duration-200 cursor-pointer shadow-md hover:scale-105 active:scale-95 flex items-center gap-1.5"
          >
            <span>GESTIONAR EN MI PANEL</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. MAIN CONTENT CONTAINER */}
      <main className="max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 flex-1">
        
        {/* If OP is still syncing / not found */}
        {!colcha ? (
          <div className="bg-white dark:bg-[#0c1017] border-2 border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-xl">
            {isSyncing ? (
              <div className="space-y-3">
                <RefreshCw className="w-12 h-12 text-emerald-500 dark:text-emerald-400 animate-spin mx-auto" />
                <h2 className="text-lg font-black text-zinc-950 dark:text-white uppercase font-mono">
                  Sincronizando Orden {displayOpCode}...
                </h2>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-md mx-auto">
                  Consultando la base de datos de Google Sheets en tiempo real. Por favor espera unos segundos.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 flex items-center justify-center mx-auto text-2xl font-black">
                  ⚠️
                </div>
                <div>
                  <h2 className="text-lg font-black text-zinc-950 dark:text-white uppercase font-mono">
                    Orden {displayOpCode} No Encontrada
                  </h2>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-md mx-auto mt-1">
                    Verifica que el número de la OP esté registrado en la hoja <strong>BASE_DE_DATOS</strong> o pulsa actualizar para recargar los datos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onRefreshData}
                  className="px-6 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold text-xs uppercase transition shadow-lg cursor-pointer"
                >
                  Recargar Base de Datos
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* HERO CARD: OP & STATUS */}
            <div className="bg-white dark:bg-[#0c1017] border-2 border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-4">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400 uppercase">
                      ORDEN DE PRODUCCIÓN
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                      ID: STF-{cleanOpDigits}
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-zinc-950 dark:text-white mt-1">
                    {displayOpCode}
                  </h2>
                  <span className="text-xs sm:text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    REF: {colcha.referencia} • {colcha.tela}
                  </span>
                </div>

                {/* Status & Dictamen Badges */}
                <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-100 dark:bg-purple-950/80 border border-purple-300 dark:border-purple-500/40 text-purple-800 dark:text-purple-300 text-xs font-black uppercase tracking-wide">
                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping"></span>
                    <span>ETAPA: {colcha.estado.replace('_', ' ')}</span>
                  </div>

                  <div className={`px-3 py-1 rounded-xl text-xs font-black uppercase border ${
                    colcha.dictamen === 'APROBADO'
                      ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40'
                      : colcha.dictamen === 'APROBADO EN GAMA'
                      ? 'bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-500/40'
                      : colcha.dictamen === 'RECHAZADO'
                      ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-500/40'
                      : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/40'
                  }`}>
                    DICTAMEN: {colcha.dictamen}
                  </div>
                </div>
              </div>

              {/* SLA & Time in Process */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3">
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-bold block">Ubicación / Área Actual:</span>
                  <span className="text-zinc-950 dark:text-white font-bold text-xs mt-0.5 block truncate">
                    📍 {colcha.areaActual || 'CALIDAD PLANTA'}
                  </span>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3">
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-bold block">Tiempo en Proceso:</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold text-xs mt-0.5 block flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {colcha.diasHabiles} Días ({colcha.horasEnProceso}h hábiles)
                  </span>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3">
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-bold block">Estado SLA:</span>
                  <span className={`font-black text-xs mt-0.5 block ${
                    colcha.tieneRetraso ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {colcha.tieneRetraso ? `⚠️ Retraso (+${Math.max(0, colcha.diasHabiles - 3)}d)` : '✓ En Tiempos Normales'}
                  </span>
                </div>
              </div>

            </div>

            {/* TWO COLUMN GRID: TECHNICAL DATA + DUAL PHOTOS */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* LEFT: TECHNICAL DATA SPEC SHEET */}
              <div className="lg:col-span-6 bg-white dark:bg-[#0c1017] border-2 border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                  <h3 className="text-xs sm:text-sm font-black uppercase text-zinc-950 dark:text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                    <span>ESPECIFICACIONES DE LA ETIQUETA</span>
                  </h3>
                  <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">100MM X 100MM</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold block uppercase">COLOR:</span>
                    <span className="font-bold text-zinc-950 dark:text-white text-xs mt-0.5 block">{colcha.color}</span>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold block uppercase">ROLLOS:</span>
                    <span className="font-black text-amber-600 dark:text-amber-400 text-xs mt-0.5 block">{colcha.rollos} Rollos</span>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold block uppercase">METRAJE / MT:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs mt-0.5 block">{colcha.codigoMt} Mt</span>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold block uppercase">LOTE(S):</span>
                    <span className="font-bold text-zinc-950 dark:text-white text-xs mt-0.5 block">{colcha.lote || '1'}</span>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 sm:col-span-2">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold block uppercase">INSPECTOR / AUDITOR:</span>
                    <span className="font-bold text-zinc-950 dark:text-white text-xs mt-0.5 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                      {colcha.inspector}
                    </span>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 col-span-2 sm:col-span-3">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold block uppercase">FECHA DE REGISTRO INICIAL:</span>
                    <span className="font-mono text-zinc-700 dark:text-zinc-300 text-xs mt-0.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
                      {formatColombianDisplayDate(colcha.fechaCreacion)}
                    </span>
                  </div>
                </div>

                {/* OBSERVACIONES TÉCNICAS Y CALIDAD */}
                {colcha.estado === 'FINALIZADO' || colcha.estado === 'EVALUADO' ? (
                  <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                    <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 uppercase">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                      OBSERVACIÓN FINAL CALIDAD:
                    </span>
                    <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono font-bold text-zinc-950 dark:text-white leading-relaxed shadow-inner uppercase">
                      {getCleanFinalQualityObservation(colcha)}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                    <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 uppercase">
                      <Layers className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                      OBSERVACIÓN OPERARIO / CORTE:
                    </span>
                    <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono font-bold text-zinc-950 dark:text-white leading-relaxed shadow-inner uppercase">
                      {getCleanInitialObservation(colcha)}
                    </div>
                  </div>
                )}

              </div>

              {/* RIGHT: REGISTRO FOTOGRÁFICO DE 2 FOTOS (INICIAL & CALIDAD) */}
              <div className="lg:col-span-6 bg-white dark:bg-[#0c1017] border-2 border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                  <h3 className="text-xs sm:text-sm font-black uppercase text-zinc-950 dark:text-white flex items-center gap-1.5 font-mono">
                    <Camera className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                    <span>REGISTRO FOTOGRÁFICO DE LA OP (2 FOTOS)</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    {folderDriveUrl && (
                      <a
                        href={folderDriveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[10px] font-black font-mono transition shadow-xs"
                        title="Abrir carpeta oficial de la OP en Google Drive para ver o descargar ambas fotos"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">VER EN DRIVE</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <span className="text-[9px] px-2 py-0.5 rounded font-bold border bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 font-mono">
                      Trazabilidad Visual
                    </span>
                  </div>
                </div>

                {/* DUAL PHOTO GRID (2 COLUMNS SIDE-BY-SIDE) */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  
                  {/* CARD 1: FOTO MUESTRA INICIAL */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 font-mono">
                      <span className="truncate">1. MUESTRA INICIAL</span>
                      <span className={fotoInicialUrl ? 'text-emerald-600 dark:text-emerald-400 font-bold shrink-0' : 'text-zinc-400 shrink-0'}>
                        {fotoInicialUrl ? '✓ REGISTRADA' : 'SIN FOTO'}
                      </span>
                    </div>

                    <SmartPhotoDisplay
                      rawUrl={fotoInicialUrl || colcha?.fotoMuestraUrl}
                      alt={`Muestra Inicial ${displayOpCode}`}
                      title={`Foto 1: Muestra Inicial - ${displayOpCode}`}
                      emptyTitle="Sin Foto Inicial"
                      emptySubtitle="Registrada en Atelier"
                      accentColor="emerald"
                      onZoom={(url, title) => setZoomedPhoto({ url, title })}
                    />
                  </div>

                  {/* CARD 2: FOTO POST-LAVADO (CALIDAD) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 font-mono">
                      <span className="truncate">2. POST-LAVADO (CALIDAD)</span>
                      <span className={fotoCalidadUrl ? 'text-emerald-600 dark:text-emerald-400 font-bold shrink-0' : 'text-amber-600 dark:text-amber-400 font-bold shrink-0'}>
                        {fotoCalidadUrl ? '✓ REGISTRADA' : 'PENDIENTE'}
                      </span>
                    </div>

                    <SmartPhotoDisplay
                      rawUrl={fotoCalidadUrl || colcha?.fotoCalidadUrl}
                      alt={`Calidad Post-Lavado ${displayOpCode}`}
                      title={`Foto 2: Inspección Calidad (Post-Lavado) - ${displayOpCode}`}
                      emptyTitle="Sin Foto Post-Lavado"
                      emptySubtitle="Auditoría en Laboratorio"
                      accentColor="purple"
                      onZoom={(url, title) => setZoomedPhoto({ url, title })}
                    />
                  </div>

                </div>

                {folderDriveUrl && (
                  <div className="pt-2">
                    <a
                      href={folderDriveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-amber-700 dark:text-amber-400 text-xs font-mono font-bold transition shadow-sm"
                    >
                      <FolderOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>Abrir Carpeta Oficial en Google Drive (2 Fotos)</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}

              </div>

            </div>

            {/* VISUAL 5-STAGE TIMELINE */}
            <div className="bg-white dark:bg-[#0c1017] border-2 border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
              <h3 className="text-xs sm:text-sm font-black uppercase text-zinc-950 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                <span>TRAZABILIDAD POR ETAPAS DE PRODUCCIÓN</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-1">
                {stages.map((stage, idx) => {
                  const isCompleted = idx < currentStageIdx;
                  const isCurrent = idx === currentStageIdx;

                  return (
                    <div 
                      key={stage.id}
                      className={`p-3.5 rounded-2xl border text-xs font-mono transition-all ${
                        isCurrent
                          ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-500 shadow-md ring-2 ring-purple-500/20'
                          : isCompleted
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-500/40 opacity-90'
                          : 'bg-zinc-50 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-base">{stage.icon}</span>
                        {isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />}
                        {isCurrent && <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-purple-500 text-white uppercase animate-pulse">ACTUAL</span>}
                      </div>
                      <span className="font-bold text-zinc-950 dark:text-white block text-[11px]">
                        {stage.label}
                      </span>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                        {stage.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

      </main>

      {/* 3. PHOTO ZOOM MODAL */}
      {zoomedPhoto && (
        <div 
          onClick={() => setZoomedPhoto(null)}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
            <button 
              type="button"
              onClick={() => setZoomedPhoto(null)}
              className="absolute top-2 right-2 p-2.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-white cursor-pointer z-10"
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={zoomedPhoto.url} 
              alt={zoomedPhoto.title}
              referrerPolicy="no-referrer"
              className="max-h-[82vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl border border-zinc-800"
            />
            <span className="mt-3 text-xs font-mono font-bold text-zinc-300 bg-zinc-900/90 px-4 py-1.5 rounded-full border border-zinc-700">
              {zoomedPhoto.title}
            </span>
          </div>
        </div>
      )}

    </div>
  );
};
