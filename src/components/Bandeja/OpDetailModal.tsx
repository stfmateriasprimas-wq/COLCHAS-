import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Calendar, Clock, Printer, Camera, CheckCircle2, 
  ExternalLink, Copy, Check, FileText, Send, Share2, 
  Layers, ChevronRight, AlertCircle, AlertTriangle, ArrowRight,
  Droplets, Microscope, Sparkles, ShieldCheck, Trash2, Eye, Lock,
  Maximize2, Upload
} from 'lucide-react';
import { SolicitudColcha } from '../../types';
import { SafeQRCode } from '../Common/SafeQRCode';
import { formatColombianDisplayDate } from '../../services/slaCalculator';
import { compressImageFile, pushOpPhotoToSheets, updateLocalOpPhoto, getOpPhotosFromCache, fetchOpPhotosFromDrive } from '../../services/googleSheetsService';
import { SmartPhotoDisplay } from '../Common/SmartPhotoDisplay';
import { generatePublicTrackingUrl, generatePublicTrackingUrlAsync } from '../../services/qrTrackingService';

interface OpDetailModalProps {
  solicitud: SolicitudColcha | null;
  onClose: () => void;
  onOpenPrintModal: (colcha: SolicitudColcha) => void;
  onUpdatePhoto?: (solicitudId: string, photoUrl: string, isCalidad?: boolean) => void;
}

export const OpDetailModal: React.FC<OpDetailModalProps> = ({
  solicitud,
  onClose,
  onOpenPrintModal,
  onUpdatePhoto
}) => {
  const [activeTab, setActiveTab] = useState<'ficha' | 'timeline'>('ficha');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);
  const [zoomedPhotoUrl, setZoomedPhotoUrl] = useState<string | null>(null);
  const [zoomedPhotoTitle, setZoomedPhotoTitle] = useState<string>('');
  
  const [fotoCalidadLocal, setFotoCalidadLocal] = useState<string | null>(null);
  const [isUploadingCalidad, setIsUploadingCalidad] = useState(false);
  const [asyncPublicUrl, setAsyncPublicUrl] = useState<string>('');
  const calidadFileInputRef = useRef<HTMLInputElement>(null);

  const [drivePhotos, setDrivePhotos] = useState<{ foto1?: string; foto2?: string; folderUrl?: string } | null>(() => {
    return solicitud?.op ? getOpPhotosFromCache(solicitud.op) : null;
  });

  useEffect(() => {
    if (!solicitud?.op) return;
    const cached = getOpPhotosFromCache(solicitud.op);
    if (cached) {
      setDrivePhotos(prev => ({ ...cached, ...prev }));
    }
    if (!solicitud.fotoMuestraUrl || (!fotoCalidadLocal && !solicitud.fotoCalidadUrl)) {
      let isMounted = true;
      fetchOpPhotosFromDrive(solicitud.op).then((photos) => {
        if (isMounted && (photos.foto1 || photos.foto2 || photos.folderUrl)) {
          setDrivePhotos(prev => ({ ...prev, ...photos }));
        }
      });
      return () => { isMounted = false; };
    }
  }, [solicitud?.op, solicitud?.fotoMuestraUrl, solicitud?.fotoCalidadUrl, fotoCalidadLocal]);

  const fotoMuestraUrl = solicitud?.fotoMuestraUrl || drivePhotos?.foto1;
  const fotoCalidadUrl = fotoCalidadLocal || solicitud?.fotoCalidadUrl || drivePhotos?.foto2;

  useEffect(() => {
    if (!solicitud) return;
    let isMounted = true;
    const currentOp: SolicitudColcha = {
      ...solicitud,
      fotoCalidadUrl: fotoCalidadUrl
    };
    generatePublicTrackingUrlAsync(currentOp).then(url => {
      if (isMounted && url) {
        setAsyncPublicUrl(url);
      }
    });
    return () => { isMounted = false; };
  }, [solicitud, fotoCalidadUrl]);

  if (!solicitud) return null;

  const publicUrl = asyncPublicUrl || generatePublicTrackingUrl({
    ...solicitud,
    fotoCalidadUrl: fotoCalidadUrl
  });

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSendReport = () => {
    setIsNotifying(true);
    setTimeout(() => {
      setIsNotifying(false);
      alert(`Reporte y trazabilidad de la OP ${solicitud.op} enviados con éxito al equipo de Calidad y Lavandería.`);
    }, 600);
  };

  const handleCalidadPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCalidad(true);
    try {
      const compressed = await compressImageFile(file, 650, 0.55);
      setFotoCalidadLocal(compressed);
      
      updateLocalOpPhoto(solicitud.id, compressed, true);
      updateLocalOpPhoto(solicitud.op, compressed, true);

      if (onUpdatePhoto) {
        onUpdatePhoto(solicitud.id, compressed, true);
      }

      await pushOpPhotoToSheets(solicitud.op, compressed, true);
    } catch (err) {
      console.error('Error al actualizar foto de calidad:', err);
      alert('Error al guardar la fotografía. Intenta de nuevo.');
    } finally {
      setIsUploadingCalidad(false);
    }
  };

  const getStageIndex = (estado: string) => {
    switch (estado) {
      case 'PRE_SOLICITUD': return 0;
      case 'SOLICITADO': return 1;
      case 'LAVANDERIA': return 2;
      case 'CALIDAD': return 3;
      case 'FINALIZADO': return 4;
      default: return 1;
    }
  };

  const currentStageIdx = getStageIndex(solicitud.estado);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0c1017] border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans select-none text-zinc-950 dark:text-white">
        
        {/* 1. TOP HEADER BAR */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-zinc-950 dark:text-white">
          
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-8 h-8 rounded-xl bg-zinc-200 dark:bg-zinc-950 text-zinc-900 dark:text-white border border-zinc-300 dark:border-zinc-700 flex items-center justify-center font-mono font-bold text-xs">
              OP
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-600 dark:text-zinc-400 font-bold uppercase tracking-wider">
                FICHA TÉCNICA
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">
                {solicitud.estado.replace('_', ' ')}
              </span>
            </div>

            {/* Prominent OP tag */}
            <div className="bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 px-3.5 py-1 rounded-xl font-black font-mono text-sm tracking-tight shadow-md">
              {solicitud.op}
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Direct Print Thermal Label button */}
            <button
              type="button"
              onClick={() => onOpenPrintModal({
                ...solicitud,
                fotoCalidadUrl: fotoCalidadUrl
              })}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              title="Imprimir Etiqueta Térmica 100x100mm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {solicitud.estado === 'FINALIZADO' ? 'Etiqueta Final' : 'Imprimir Etiqueta'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleSendReport}
              disabled={isNotifying}
              className="px-3.5 py-2 rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isNotifying ? 'Enviando...' : 'Enviar Reporte'}</span>
            </button>

            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white p-2 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        </div>

        {/* 2. SUB-TABS: FICHA TÉCNICA VS LÍNEA DE TIEMPO */}
        <div className="px-5 py-2.5 bg-zinc-50 dark:bg-zinc-900/40 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2 overflow-x-auto font-mono">
          <button
            onClick={() => setActiveTab('ficha')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'ficha'
                ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Ficha Técnica y Datos</span>
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'timeline'
                ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Línea de Tiempo</span>
          </button>
        </div>

        {/* 3. MODAL BODY (SCROLLABLE) */}
        <div className="overflow-y-auto flex-1 custom-scroll p-4 sm:p-6 space-y-6 bg-transparent">

          {/* ======================================================== */}
          {/* TAB 1: FICHA TÉCNICA Y DATOS */}
          {/* ======================================================== */}
          {activeTab === 'ficha' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* TOP 4 SUMMARY CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                
                {/* 1. Referencia */}
                <div className="bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-1 text-zinc-950 dark:text-white">
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider block">
                    REFERENCIA
                  </span>
                  <div className="text-base font-black text-zinc-950 dark:text-white font-mono">{solicitud.referencia}</div>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block font-mono">Código diseño</span>
                </div>

                {/* 2. Tela / Material */}
                <div className="bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-1 text-zinc-950 dark:text-white">
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider block">
                    TELA / MATERIAL
                  </span>
                  <div className="text-base font-black text-zinc-950 dark:text-white truncate">{solicitud.tela}</div>
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-mono font-bold block">
                    MT: {solicitud.codigoMt}
                  </span>
                </div>

                {/* 3. Color Textil */}
                <div className="bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-1 text-zinc-950 dark:text-white">
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider block">
                    COLOR TEXTIL
                  </span>
                  <div className="text-base font-black text-zinc-950 dark:text-white">{solicitud.color}</div>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block font-mono">Lote {solicitud.lote || '1'}</span>
                </div>

                {/* 4. Total Rollos */}
                <div className="bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-1 text-zinc-950 dark:text-white">
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider block">
                    TOTAL ROLLOS
                  </span>
                  <div className="text-base font-black text-amber-600 dark:text-amber-400 font-mono">
                    {solicitud.rollos} {solicitud.rollos === 1 ? 'Rollo' : 'Rollos'}
                  </div>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block font-mono">Carga oficial</span>
                </div>

              </div>

              {/* TWO MAIN COLUMNS: SPECS & PHOTOGRAPHIC EVIDENCE */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* LEFT: ESPECIFICACIONES TÉCNICAS */}
                <div className="lg:col-span-6 bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 space-y-4 text-zinc-950 dark:text-white">
                  
                  <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
                    <h4 className="text-xs font-black uppercase text-zinc-950 dark:text-white flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>ESPECIFICACIONES DE LA COLCHA</span>
                    </h4>
                    <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">100mm x 100mm</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase block">ÁREA ACTUAL:</span>
                      <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">{solicitud.areaActual}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase block">DICTAMEN:</span>
                      <span className={`font-mono font-bold ${
                        solicitud.dictamen === 'APROBADO'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : solicitud.dictamen === 'RECHAZADO'
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}>
                        {solicitud.dictamen}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase block">REGISTRADO POR:</span>
                      <span className="font-bold text-zinc-950 dark:text-white">{solicitud.inspector}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase block">FECHA DE INICIO:</span>
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-purple-800 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-500/40 px-2 py-0.5 rounded">
                        <Calendar className="w-3 h-3" />
                        {formatColombianDisplayDate(solicitud.fechaCreacion)}
                      </span>
                    </div>
                  </div>

                  {/* TIEMPO CARGADA EN SISTEMA */}
                  <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase block mb-1.5">
                      TIEMPO CARGADA EN SISTEMA:
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-indigo-800 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-300 dark:border-indigo-500/40 px-3 py-1 rounded-xl font-bold">
                      <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      Cargada {solicitud.horasEnProceso < 24 ? 'hoy' : `hace ${solicitud.diasHabiles} días`} ({solicitud.horasEnProceso}h hábiles)
                    </span>
                  </div>

                  {/* OBSERVACIONES INICIALES */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      OBSERVACIONES INICIALES DEL OPERARIO / ATELIER:
                    </span>
                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 rounded-2xl p-3.5 text-xs text-amber-900 dark:text-amber-200 font-medium leading-relaxed">
                      "{solicitud.observacionesOperario || 'Sin observaciones registradas al momento del corte.'}"
                    </div>
                  </div>

                  {/* OBSERVACIONES DE LAVANDERÍA (COLFACTORY) SI EXISTEN */}
                  {solicitud.observacionesLavanderia && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] text-sky-700 dark:text-sky-400 font-bold uppercase flex items-center gap-1">
                        <Droplets className="w-3.5 h-3.5" />
                        OBSERVACIÓN DE LAVANDERÍA (COLFACTORY):
                      </span>
                      <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-500/30 rounded-2xl p-3.5 text-xs text-sky-900 dark:text-sky-200 font-medium leading-relaxed">
                        "{solicitud.observacionesLavanderia}"
                      </div>
                    </div>
                  )}

                  {/* OBSERVACIONES DE CALIDAD SI EXISTEN */}
                  {solicitud.observacionesCalidad && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] text-purple-700 dark:text-purple-400 font-bold uppercase flex items-center gap-1">
                        <Microscope className="w-3.5 h-3.5" />
                        DICTAMEN Y OBSERVACIÓN FINAL DE CALIDAD:
                      </span>
                      <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-500/30 rounded-2xl p-3.5 text-xs text-purple-900 dark:text-purple-200 font-medium leading-relaxed">
                        "{solicitud.observacionesCalidad}"
                      </div>
                    </div>
                  )}

                </div>

                {/* RIGHT: REGISTRO FOTOGRÁFICO DOBLE & CÓDIGO QR */}
                <div className="lg:col-span-6 space-y-4">
                  
                  {/* DUAL PHOTO REGISTER CARD (INITIAL SAMPLE & POST-WASH QUALITY) */}
                  <div className="bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 space-y-4 text-zinc-950 dark:text-white">
                    
                    <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
                      <h4 className="text-xs font-black uppercase text-zinc-950 dark:text-white flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>REGISTRO FOTOGRÁFICO DE LA OP (2 FOTOS)</span>
                      </h4>
                      <span className="text-[9px] px-2 py-0.5 rounded font-bold border bg-zinc-200 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-400 border-zinc-300 dark:border-zinc-800">
                        Trazabilidad Visual
                      </span>
                    </div>

                    {/* Alert for Calidad stage */}
                    {solicitud.estado === 'CALIDAD' && (
                      <div className="p-2.5 rounded-xl bg-purple-950/40 dark:bg-purple-50 border border-purple-500/30 dark:border-purple-300 text-purple-200 dark:text-purple-900 text-[11px] leading-snug">
                        🔬 <strong>Auditoría de Calidad:</strong> Compara la foto inicial contra el resultado post-lavado para evaluar tono, encogimiento y acabado textil.
                      </div>
                    )}

                    {/* DUAL PHOTO GRID */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      
                      {/* CARD 1: FOTO INICIAL */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-600">
                          <span>1. Muestra Inicial</span>
                          <span className={fotoMuestraUrl ? 'text-emerald-400' : 'text-zinc-500'}>
                            {fotoMuestraUrl ? '✓ Registrada' : 'Sin Foto'}
                          </span>
                        </div>

                        <SmartPhotoDisplay
                          rawUrl={fotoMuestraUrl}
                          alt={`Muestra inicial ${solicitud.op}`}
                          title={`Foto 1: Muestra Inicial - OP ${solicitud.op}`}
                          emptyTitle="Sin Foto Inicial"
                          emptySubtitle="Registrada en Atelier"
                          accentColor="emerald"
                          onZoom={(url, title) => {
                            setZoomedPhotoUrl(url);
                            setZoomedPhotoTitle(title);
                          }}
                        />
                      </div>

                      {/* CARD 2: FOTO CALIDAD (POST-LAVADO) */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-purple-300 dark:text-purple-700">
                          <span>2. Post-Lavado (Calidad)</span>
                          <span className={fotoCalidadUrl ? 'text-emerald-400' : 'text-amber-400'}>
                            {fotoCalidadUrl ? '✓ Registrada' : 'Pendiente'}
                          </span>
                        </div>

                        {fotoCalidadUrl ? (
                          <div className="relative">
                            <SmartPhotoDisplay
                              rawUrl={fotoCalidadUrl}
                              alt={`Calidad post-lavado ${solicitud.op}`}
                              title={`Foto 2: Inspección Calidad (Post-Lavado) - OP ${solicitud.op}`}
                              emptyTitle="Sin Foto Post-Lavado"
                              emptySubtitle="Auditoría en Laboratorio"
                              accentColor="purple"
                              onZoom={(url, title) => {
                                setZoomedPhotoUrl(url);
                                setZoomedPhotoTitle(title);
                              }}
                            />
                            {(solicitud.estado === 'CALIDAD' || solicitud.estado === 'LAVANDERIA' || solicitud.estado === 'FINALIZADO') && (
                              <button
                                type="button"
                                onClick={() => calidadFileInputRef.current?.click()}
                                className="absolute bottom-2 right-2 px-2.5 py-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold font-mono transition shadow-md flex items-center gap-1 cursor-pointer z-20"
                              >
                                <Camera className="w-3.5 h-3.5" />
                                <span>Cambiar</span>
                              </button>
                            )}
                          </div>
                        ) : (solicitud.estado === 'CALIDAD' || solicitud.estado === 'LAVANDERIA' || solicitud.estado === 'FINALIZADO') ? (
                          <div 
                            onClick={() => calidadFileInputRef.current?.click()}
                            className="h-44 rounded-2xl bg-purple-950/20 dark:bg-purple-50 border-2 border-dashed border-purple-500/60 hover:border-purple-400 p-3 flex flex-col items-center justify-center text-center cursor-pointer transition group"
                          >
                            <Camera className="w-6 h-6 text-purple-400 mb-1 group-hover:scale-110 transition" />
                            <span className="text-[11px] font-bold text-white dark:text-zinc-950 font-mono block">Tomar Foto Post-Lavado</span>
                            <span className="text-[9px] text-purple-300 dark:text-purple-700 font-mono block mt-0.5">* Sincroniza en Google Sheets</span>
                          </div>
                        ) : (
                          <div className="h-44 rounded-2xl bg-zinc-950 dark:bg-zinc-100 border border-zinc-800 dark:border-zinc-300 p-3 flex flex-col items-center justify-center text-center">
                            <Lock className="w-6 h-6 text-zinc-500 opacity-50 mb-1" />
                            <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-600 font-mono block">Sin Foto Post-Lavado</span>
                            <span className="text-[9px] text-zinc-500 font-mono block mt-0.5">Activo en Lavandería y Calidad</span>
                          </div>
                        )}
                      </div>

                    </div>

                    {/* Hidden input for Calidad stage */}
                    {(solicitud.estado === 'CALIDAD' || solicitud.estado === 'LAVANDERIA' || solicitud.estado === 'FINALIZADO') && (
                      <input
                        type="file"
                        ref={calidadFileInputRef}
                        accept="image/*"
                        capture="environment"
                        onChange={handleCalidadPhotoChange}
                        className="hidden"
                      />
                    )}

                  </div>

                  {/* QR SECTION */}
                  <div className="lg:col-span-4 bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 flex flex-col items-center justify-between text-center space-y-4 shadow-sm">
                    
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                        TRAZABILIDAD PÚBLICA EN TIEMPO REAL
                      </span>
                      <h4 className="text-sm font-black text-zinc-950 dark:text-white uppercase font-mono">
                        CÓDIGO QR OFICIAL
                      </h4>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1">
                        Escanea con la cámara del celular para ver la ficha en vivo y sus 2 fotos.
                      </p>
                    </div>

                    {/* QR Code Container */}
                    <div className="p-3 bg-white rounded-2xl shadow-md border-2 border-zinc-950 inline-block">
                      <SafeQRCode
                        value={publicUrl}
                        size={140}
                        level="M"
                        includeMargin={false}
                        imageSettings={{
                          src: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%23000000"/><rect x="4" y="4" width="92" height="92" rx="16" fill="%23000000" stroke="%23ffffff" stroke-width="4"/><text x="50" y="65" font-size="38" font-family="Arial, Helvetica, sans-serif" font-weight="900" fill="%23ffffff" text-anchor="middle" letter-spacing="-1">STF</text></svg>`,
                          height: 32,
                          width: 32,
                          excavate: true,
                        }}
                      />
                    </div>

                    {/* URL bar & copy */}
                    <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1.5 pl-3 w-full">
                      <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400 truncate flex-1">
                        {publicUrl}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="px-3 py-1.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-950 dark:text-white rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                      >
                        {copiedLink ? <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedLink ? 'Copiado' : 'Copiar'}</span>
                      </button>
                    </div>

                    {/* Print Button */}
                    <button
                      type="button"
                      onClick={() => onOpenPrintModal({
                        ...solicitud,
                        fotoCalidadUrl: fotoCalidadUrl
                      })}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 transition shadow-lg cursor-pointer font-mono"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>
                        {solicitud.estado === 'FINALIZADO'
                          ? 'Imprimir Etiqueta Final Calidad (100x100mm)'
                          : 'Imprimir Etiqueta de Solicitud (100x100mm)'}
                      </span>
                    </button>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: LÍNEA DE TIEMPO DE PROCESOS (TIMELINE) */}
          {/* ======================================================== */}
          {activeTab === 'timeline' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* TOP 5 STAGE PIPELINE CARDS */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  TRAZABILIDAD Y FLUJO DE PROCESAMIENTO POR SECTOR
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  
                  {/* 1. Pre-Solicitud */}
                  <div className={`p-3 rounded-2xl border text-xs space-y-1 ${
                    currentStageIdx >= 0
                      ? 'bg-emerald-950/40 dark:bg-emerald-50 border-emerald-500/50 dark:border-emerald-300 text-emerald-300 dark:text-emerald-800'
                      : 'bg-zinc-900/60 dark:bg-zinc-100 border-zinc-800 dark:border-zinc-200 text-zinc-500'
                  }`}>
                    <span className="text-[9px] font-bold block opacity-70">1. PRE-SOLICITUD</span>
                    <span className="font-extrabold text-white dark:text-zinc-950 block">Atelier / Diseño</span>
                    <span className="text-[9px] font-bold text-emerald-400 dark:text-emerald-600 flex items-center gap-1">
                      ✓ COMPLETADO
                    </span>
                  </div>

                  {/* 2. Solicitado */}
                  <div className={`p-3 rounded-2xl border text-xs space-y-1 ${
                    currentStageIdx === 1
                      ? 'bg-zinc-900 dark:bg-zinc-100 border-amber-500 text-amber-300 dark:text-amber-800 shadow-md ring-1 ring-amber-500/30'
                      : currentStageIdx > 1
                      ? 'bg-emerald-950/40 dark:bg-emerald-50 border-emerald-500/50 dark:border-emerald-300 text-emerald-300 dark:text-emerald-800'
                      : 'bg-zinc-900/60 dark:bg-zinc-100 border-zinc-800 dark:border-zinc-200 text-zinc-500'
                  }`}>
                    <span className="text-[9px] font-bold block opacity-70">2. SOLICITADO</span>
                    <span className="font-extrabold text-white dark:text-zinc-950 block">Despacho</span>
                    <span className="text-[9px] font-bold text-amber-400 dark:text-amber-600 flex items-center gap-1">
                      ⚡ EN PROCESO
                    </span>
                  </div>

                  {/* 3. Lavandería */}
                  <div className={`p-3 rounded-2xl border text-xs space-y-1 ${
                    currentStageIdx === 2
                      ? 'bg-zinc-900 dark:bg-zinc-100 border-sky-500 text-sky-300 dark:text-sky-800 shadow-md ring-1 ring-sky-500/30'
                      : currentStageIdx > 2
                      ? 'bg-emerald-950/40 dark:bg-emerald-50 border-emerald-500/50 dark:border-emerald-300 text-emerald-300 dark:text-emerald-800'
                      : 'bg-zinc-900/60 dark:bg-zinc-100 border-zinc-800 dark:border-zinc-200 text-zinc-500'
                  }`}>
                    <span className="text-[9px] font-bold block opacity-70">3. LAVANDERÍA</span>
                    <span className="font-extrabold text-zinc-300 dark:text-zinc-700 block">Módulo Tambor</span>
                    <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500">PENDIENTE</span>
                  </div>

                  {/* 4. Calidad STF */}
                  <div className={`p-3 rounded-2xl border text-xs space-y-1 ${
                    currentStageIdx === 3
                      ? 'bg-zinc-900 dark:bg-zinc-100 border-purple-500 text-purple-300 dark:text-purple-800 shadow-md ring-1 ring-purple-500/30'
                      : currentStageIdx > 3
                      ? 'bg-emerald-950/40 dark:bg-emerald-50 border-emerald-500/50 dark:border-emerald-300 text-emerald-300 dark:text-emerald-800'
                      : 'bg-zinc-900/60 dark:bg-zinc-100 border-zinc-800 dark:border-zinc-200 text-zinc-500'
                  }`}>
                    <span className="text-[9px] font-bold block opacity-70">4. CALIDAD STF</span>
                    <span className="font-extrabold text-zinc-300 dark:text-zinc-700 block">Laboratorio</span>
                    <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500">PENDIENTE</span>
                  </div>

                  {/* 5. Finalizado */}
                  <div className={`p-3 rounded-2xl border text-xs space-y-1 ${
                    currentStageIdx === 4
                      ? 'bg-emerald-950/60 dark:bg-emerald-100 border-emerald-500 text-emerald-300 dark:text-emerald-800'
                      : 'bg-zinc-900/60 dark:bg-zinc-100 border-zinc-800 dark:border-zinc-200 text-zinc-500'
                  }`}>
                    <span className="text-[9px] font-bold block opacity-70">5. FINALIZADO</span>
                    <span className="font-extrabold text-zinc-300 dark:text-zinc-700 block">Cierre Exitoso</span>
                    <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500">PENDIENTE</span>
                  </div>

                </div>
              </div>

              {/* MAIN TIMELINE BOX */}
              <div className="bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 space-y-6 shadow-xl text-zinc-950 dark:text-white">
                
                {/* Header & Legend */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-black text-zinc-950 dark:text-white brand-title">
                        LÍNEA DE TIEMPO DE PROCESOS DE LA OP #{solicitud.op}
                      </h3>
                      <span className="text-[10px] bg-zinc-200 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-800 px-2 py-0.5 rounded font-bold">
                        2 Etapas
                      </span>
                      <span className="text-[10px] bg-amber-400 text-black px-2.5 py-0.5 rounded font-black">
                        {solicitud.rollos} Rollos Procesados
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                      Auditoría cronológica de creación, tiempo de permanencia por área y estado general de retrasos.
                    </p>
                  </div>

                  {/* Legend dots */}
                  <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Inicio</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Proceso</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Alerta</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Fin</span>
                  </div>
                </div>

                {/* 3 KPI Box Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white dark:bg-zinc-950 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-0.5 shadow-xs">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold block uppercase">1. FECHA Y HORA DE CREACIÓN</span>
                    <span className="text-xs font-mono font-black text-zinc-950 dark:text-white block">
                      {formatColombianDisplayDate(solicitud.fechaCreacion)}
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">Creado por: {solicitud.inspector}</span>
                  </div>

                  <div className="bg-white dark:bg-zinc-950 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-0.5 shadow-xs">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold block uppercase">2. TIEMPO TOTAL EN PLANTA</span>
                    <span className="text-xs font-mono font-black text-amber-600 dark:text-amber-400 block">
                      {solicitud.diasHabiles} Días ({solicitud.horasEnProceso}h hábiles)
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">Límite SLA: {solicitud.limiteSlaDias} días</span>
                  </div>

                  <div className="bg-white dark:bg-zinc-950 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-0.5 shadow-xs">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold block uppercase">3. ESTADO DEL PROCESO</span>
                    <span className={`text-xs font-mono font-black block ${
                      solicitud.tieneRetraso ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {solicitud.tieneRetraso ? `⚠️ Retraso (+${Math.max(0, solicitud.diasHabiles - 3)}d)` : '✓ En Tiempos Normales'}
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">Área: {solicitud.areaActual}</span>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>

      </div>

      {/* 4. ZOOMED PHOTO MODAL */}
      {zoomedPhotoUrl && (
        <div 
          onClick={() => setZoomedPhotoUrl(null)}
          className="fixed inset-0 z-60 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
            <button 
              type="button"
              onClick={() => setZoomedPhotoUrl(null)}
              className="absolute top-2 right-2 p-2.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-white cursor-pointer z-10"
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={zoomedPhotoUrl} 
              alt={zoomedPhotoTitle}
              referrerPolicy="no-referrer"
              className="max-h-[82vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl border border-zinc-800"
            />
            {zoomedPhotoTitle && (
              <span className="mt-3 text-xs font-mono font-bold text-zinc-300 bg-zinc-900/90 px-4 py-1.5 rounded-full border border-zinc-700">
                {zoomedPhotoTitle}
              </span>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
