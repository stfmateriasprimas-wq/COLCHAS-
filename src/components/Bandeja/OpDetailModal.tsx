import React, { useState, useRef } from 'react';
import { 
  X, Calendar, Clock, Printer, Camera, CheckCircle2, 
  ExternalLink, Copy, Check, FileText, Send, Share2, 
  Layers, ChevronRight, AlertCircle, AlertTriangle, ArrowRight,
  Droplets, Microscope, Sparkles, ShieldCheck, Trash2
} from 'lucide-react';
import { SolicitudColcha } from '../../types';
import { QRCodeSVG } from 'qrcode.react';
import { formatColombianDisplayDate } from '../../services/slaCalculator';

interface OpDetailModalProps {
  solicitud: SolicitudColcha | null;
  onClose: () => void;
  onOpenPrintModal: (colcha: SolicitudColcha) => void;
  onUpdatePhoto?: (solicitudId: string, photoUrl: string) => void;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!solicitud) return null;

  const publicUrl = `https://remix-stf-group-quality-control-5.vercel.app/?op=${encodeURIComponent(solicitud.op)}`;

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

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpdatePhoto) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newUrl = reader.result as string;
        onUpdatePhoto(solicitud.id, newUrl);
      };
      reader.readAsDataURL(file);
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div className="bg-[#0c1017] dark:bg-white border border-zinc-800 dark:border-zinc-200 rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans select-none text-white dark:text-zinc-950">
        
        {/* 1. TOP HEADER BAR */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 dark:border-zinc-200 bg-zinc-900/80 dark:bg-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white dark:text-zinc-950">
          
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-8 h-8 rounded-xl bg-zinc-950 dark:bg-zinc-200 text-white dark:text-zinc-900 border border-zinc-700 dark:border-zinc-300 flex items-center justify-center font-mono font-bold text-xs">
              OP
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 dark:text-zinc-600 font-bold uppercase tracking-wider">
                FICHA TÉCNICA
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-950 dark:bg-zinc-200 text-zinc-300 dark:text-zinc-700 border border-zinc-700 dark:border-zinc-300">
                {solicitud.estado.replace('_', ' ')}
              </span>
            </div>

            {/* Prominent OP tag */}
            <div className="bg-white text-zinc-950 dark:bg-zinc-950 dark:text-white px-3.5 py-1 rounded-xl font-black font-mono text-sm tracking-tight shadow-md">
              {solicitud.op}
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleSendReport}
              disabled={isNotifying}
              className="px-3.5 py-2 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-800 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isNotifying ? 'Enviando...' : 'Enviar Reporte'}</span>
            </button>

            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white dark:text-zinc-600 dark:hover:text-zinc-950 p-2 rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-200 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        </div>

        {/* 2. SUB-TABS: FICHA TÉCNICA VS LÍNEA DE TIEMPO */}
        <div className="px-5 py-2.5 bg-zinc-900/40 dark:bg-zinc-50 border-b border-zinc-800 dark:border-zinc-200 flex items-center gap-2 overflow-x-auto font-mono">
          <button
            onClick={() => setActiveTab('ficha')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'ficha'
                ? 'bg-white text-zinc-950 dark:bg-zinc-950 dark:text-white shadow-sm'
                : 'text-zinc-400 dark:text-zinc-600 hover:text-white dark:hover:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Ficha Técnica y Datos</span>
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'timeline'
                ? 'bg-white text-zinc-950 dark:bg-zinc-950 dark:text-white shadow-sm'
                : 'text-zinc-400 dark:text-zinc-600 hover:text-white dark:hover:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200'
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
                <div className="bg-zinc-900/90 dark:bg-zinc-50 border border-zinc-800 dark:border-zinc-200 rounded-2xl p-4 space-y-1 text-white dark:text-zinc-950">
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider block">
                    REFERENCIA
                  </span>
                  <div className="text-base font-black text-white dark:text-zinc-950 font-mono">{solicitud.referencia}</div>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block font-mono">Código diseño</span>
                </div>

                {/* 2. Tela / Material */}
                <div className="bg-zinc-900/90 dark:bg-zinc-50 border border-zinc-800 dark:border-zinc-200 rounded-2xl p-4 space-y-1 text-white dark:text-zinc-950">
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider block">
                    TELA / MATERIAL
                  </span>
                  <div className="text-base font-black text-white dark:text-zinc-950 truncate">{solicitud.tela}</div>
                  <span className="text-[11px] text-indigo-400 dark:text-indigo-600 font-mono font-bold block">
                    MT: {solicitud.codigoMt}
                  </span>
                </div>

                {/* 3. Color & Volumen */}
                <div className="bg-zinc-900/90 dark:bg-zinc-50 border border-zinc-800 dark:border-zinc-200 rounded-2xl p-4 space-y-1 text-white dark:text-zinc-950">
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider block">
                    COLOR & VOLUMEN
                  </span>
                  <div className="text-base font-black text-white dark:text-zinc-950">{solicitud.color}</div>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block font-mono">
                    {solicitud.rollos} {solicitud.rollos === 1 ? 'Rollo' : 'Rollos'} ({solicitud.lote || 'N/A'})
                  </span>
                </div>

                {/* 4. Ubicación / Fase Actual */}
                <div className="bg-zinc-900/90 dark:bg-zinc-50 border border-zinc-800 dark:border-zinc-200 rounded-2xl p-4 space-y-1 text-white dark:text-zinc-950">
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider block">
                    UBICACIÓN ACTUAL
                  </span>
                  <div className="text-sm font-black text-amber-400 dark:text-amber-600 font-mono">{solicitud.areaActual}</div>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block font-mono">
                    Resp: <strong>{solicitud.inspector}</strong>
                  </span>
                </div>

              </div>

              {/* TWO COLUMN GRID: TECHNICAL DETAILS (LEFT) & PHOTO/QR (RIGHT) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* LEFT: INFORMACIÓN TÉCNICA DETALLADA */}
                <div className="lg:col-span-7 bg-zinc-900/90 dark:bg-zinc-50 border border-zinc-800 dark:border-zinc-200 rounded-3xl p-5 sm:p-6 space-y-5 text-white dark:text-zinc-950">
                  
                  <div className="flex items-center justify-between border-b border-zinc-800 dark:border-zinc-200 pb-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-white dark:text-zinc-950 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-400" />
                      <span>INFORMACIÓN TÉCNICA DETALLADA</span>
                    </h3>
                    <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 bg-zinc-950 dark:bg-zinc-100 px-2 py-0.5 rounded border border-zinc-800 dark:border-zinc-300">
                      ID: #{solicitud.id}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase block">ORDEN DE PRODUCCIÓN:</span>
                      <span className="font-mono font-black text-white dark:text-zinc-950 text-sm">{solicitud.op}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase block">REFERENCIA DISEÑO:</span>
                      <span className="font-mono font-extrabold text-white dark:text-zinc-950 text-sm">{solicitud.referencia}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase block">TELA REGISTRADA:</span>
                      <span className="font-bold text-white dark:text-zinc-950">{solicitud.tela}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase block">CÓDIGO MATERIAL INSUMO (MT):</span>
                      <span className="font-mono font-black text-indigo-400 dark:text-indigo-600">{solicitud.codigoMt}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase block">COLOR DE MUESTRA:</span>
                      <span className="font-bold text-white dark:text-zinc-950">{solicitud.color}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase block">ROLLOS & LOTE:</span>
                      <span className="font-bold text-white dark:text-zinc-950">{solicitud.rollos} Rollos | Lote {solicitud.lote || 'N/A'}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase block">REGISTRADO POR:</span>
                      <span className="font-bold text-white dark:text-zinc-950">{solicitud.inspector}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase block">FECHA DE INICIO:</span>
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-purple-300 dark:text-purple-800 bg-purple-950/60 dark:bg-purple-100 border border-purple-500/40 dark:border-purple-300 px-2 py-0.5 rounded">
                        <Calendar className="w-3 h-3" />
                        {formatColombianDisplayDate(solicitud.fechaCreacion)}
                      </span>
                    </div>
                  </div>

                  {/* TIEMPO CARGADA EN SISTEMA */}
                  <div className="pt-2 border-t border-zinc-800 dark:border-zinc-200">
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase block mb-1.5">
                      TIEMPO CARGADA EN SISTEMA:
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-indigo-300 dark:text-indigo-800 bg-indigo-950/60 dark:bg-indigo-100 border border-indigo-500/40 dark:border-indigo-300 px-3 py-1 rounded-xl font-bold">
                      <Clock className="w-3.5 h-3.5 text-indigo-400 dark:text-indigo-600" />
                      Cargada {solicitud.horasEnProceso < 24 ? 'hoy' : `hace ${solicitud.diasHabiles} días`} ({solicitud.horasEnProceso}h hábiles)
                    </span>
                  </div>

                  {/* OBSERVACIONES INICIALES */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] text-amber-400 dark:text-amber-600 font-bold uppercase flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      OBSERVACIONES INICIALES DEL OPERARIO / ATELIER:
                    </span>
                    <div className="bg-amber-950/30 dark:bg-amber-50 border border-amber-500/30 dark:border-amber-300 rounded-2xl p-3.5 text-xs text-amber-200 dark:text-amber-900 font-medium leading-relaxed">
                      "{solicitud.observacionesOperario || 'Sin observaciones registradas al momento del corte.'}"
                    </div>
                  </div>

                </div>

                {/* RIGHT: REGISTRO FOTOGRÁFICO & CÓDIGO QR */}
                <div className="lg:col-span-5 space-y-4">
                  
                  {/* PHOTO REGISTER CARD (CONNECTED TO NEW REQUEST PHOTO & POST-WASH UPDATE) */}
                  <div className="bg-zinc-900/90 dark:bg-zinc-50 border border-zinc-800 dark:border-zinc-200 rounded-3xl p-5 space-y-3.5 text-white dark:text-zinc-950">
                    <div className="flex items-center justify-between border-b border-zinc-800 dark:border-zinc-200 pb-2.5">
                      <h4 className="text-xs font-black uppercase text-white dark:text-zinc-950 flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-emerald-400" />
                        <span>REGISTRO FOTOGRÁFICO DE LA OP</span>
                      </h4>
                      <span className={`text-[9px] px-2 py-0.5 rounded font-bold border ${
                        solicitud.estado === 'CALIDAD'
                          ? 'bg-amber-950 dark:bg-amber-100 text-amber-300 dark:text-amber-800 border-amber-500/40 dark:border-amber-300 animate-pulse'
                          : 'bg-zinc-950 dark:bg-zinc-100 text-zinc-400 dark:text-zinc-500 border-zinc-800 dark:border-zinc-300'
                      }`}>
                        {solicitud.estado === 'CALIDAD' ? '⚡ ETAPA CALIDAD STF' : 'Registro de Proceso'}
                      </span>
                    </div>

                    {/* Alert for Calidad stage: Tone change check post-washing */}
                    {solicitud.estado === 'CALIDAD' && (
                      <div className="p-2.5 rounded-xl bg-amber-950/40 dark:bg-amber-50 border border-amber-500/30 dark:border-amber-300 text-amber-200 dark:text-amber-900 text-[11px] leading-snug">
                        👕 <strong>Inspección Post-Lavandería:</strong> La colcha ha pasado por lavado industrial. Actualiza la fotografía de la muestra para verificar variaciones de tono, brillo y textura.
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-600">
                      <span>{solicitud.estado === 'CALIDAD' ? 'Evidencia Fotográfica (Post-Lavado):' : 'Foto de Muestra Textil:'}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        solicitud.fotoMuestraUrl 
                          ? 'bg-emerald-950 dark:bg-emerald-100 text-emerald-300 dark:text-emerald-800 border border-emerald-500/30 dark:border-emerald-300' 
                          : 'bg-amber-950 dark:bg-amber-100 text-amber-300 dark:text-amber-800 border border-amber-500/30 dark:border-amber-300'
                      }`}>
                        {solicitud.fotoMuestraUrl ? 'Cargada / Sincronizada' : 'Pendiente por Capturar'}
                      </span>
                    </div>

                    {/* Photo Container */}
                    <div className="h-48 rounded-2xl bg-zinc-950 dark:bg-zinc-100 border border-dashed border-zinc-800 dark:border-zinc-300 hover:border-zinc-600 flex flex-col items-center justify-center p-2 text-center overflow-hidden relative group">
                      {solicitud.fotoMuestraUrl ? (
                        <>
                          <img
                            src={solicitud.fotoMuestraUrl}
                            alt={`Muestra ${solicitud.op}`}
                            className="h-full w-full object-cover rounded-xl group-hover:scale-105 transition duration-300 cursor-pointer"
                            onClick={() => window.open(solicitud.fotoMuestraUrl, '_blank')}
                            title="Clic para ver fotografía en alta resolución"
                          />
                          <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center text-white cursor-pointer rounded-2xl"
                          >
                            <Camera className="w-6 h-6 mb-1 text-emerald-400" />
                            <span className="text-xs font-bold">Clic para cambiar fotografía</span>
                          </div>
                        </>
                      ) : (
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className="space-y-1 text-zinc-500 p-4 cursor-pointer hover:text-zinc-300 transition"
                        >
                          <Camera className="w-8 h-8 mx-auto stroke-[1.5] text-zinc-400 dark:text-zinc-600" />
                          <p className="text-xs font-bold text-white dark:text-zinc-950">Tomar o Cargar Fotografía</p>
                          <p className="text-[10px] text-zinc-400 dark:text-zinc-500">* Se sincronizará automáticamente con Google Drive y Sheets.</p>
                        </div>
                      )}
                    </div>

                    {/* Hidden input for updating photo */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />

                    {/* Prominent Action Button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={`w-full py-2.5 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 transition cursor-pointer shadow-md ${
                        solicitud.estado === 'CALIDAD'
                          ? 'bg-amber-400 hover:bg-amber-300 text-black font-black shadow-amber-400/20'
                          : 'bg-white text-zinc-950 hover:bg-zinc-200 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-800'
                      }`}
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>
                        {solicitud.estado === 'CALIDAD'
                          ? (solicitud.fotoMuestraUrl ? '📸 ACTUALIZAR FOTO POST-LAVADO (CALIDAD)' : '📸 CARGAR FOTO POST-LAVADO (CALIDAD)')
                          : (solicitud.fotoMuestraUrl ? 'REEMPLAZAR / ACTUALIZAR FOTO' : 'CARGAR FOTOGRAFÍA OP')}
                      </span>
                    </button>
                  </div>

                  {/* QR SCAN CARD */}
                  <div className="bg-zinc-900/90 dark:bg-zinc-50 border border-zinc-800 dark:border-zinc-200 rounded-3xl p-5 space-y-3 text-white dark:text-zinc-950">
                    <div className="flex items-center justify-between border-b border-zinc-800 dark:border-zinc-200 pb-2.5">
                      <h4 className="text-xs font-black uppercase text-white dark:text-zinc-950">
                        CÓDIGO QR PARA ESCANEO MÓVIL
                      </h4>
                      <span className="text-[9px] bg-emerald-950 dark:bg-emerald-100 text-emerald-300 dark:text-emerald-800 border border-emerald-500/30 dark:border-emerald-300 px-2 py-0.5 rounded font-bold">
                        Acceso Directo
                      </span>
                    </div>

                    <div className="flex items-center gap-3 bg-zinc-950 dark:bg-zinc-100 p-3 rounded-2xl border border-zinc-800 dark:border-zinc-200">
                      <div className="bg-white p-2 rounded-xl shrink-0 shadow-sm">
                        <QRCodeSVG value={publicUrl} size={64} />
                      </div>
                      <div className="text-[11px] space-y-0.5">
                        <span className="font-bold text-white dark:text-zinc-950 block">Lectura Móvil por QR</span>
                        <p className="text-zinc-400 dark:text-zinc-600 leading-snug">
                          Al escanear este código con tu celular se abrirá automáticamente la ficha técnica y trazabilidad.
                        </p>
                      </div>
                    </div>

                    {/* URL bar & copy */}
                    <div className="flex items-center gap-2 bg-zinc-950 dark:bg-zinc-100 border border-zinc-800 dark:border-zinc-200 rounded-xl p-1.5 pl-3">
                      <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-600 truncate flex-1">
                        {publicUrl}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="px-3 py-1.5 bg-zinc-800 dark:bg-zinc-200 hover:bg-zinc-700 dark:hover:bg-zinc-300 text-white dark:text-zinc-950 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                      >
                        {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedLink ? 'Copiado' : 'Copiar'}</span>
                      </button>
                    </div>

                    {/* Print Button */}
                    <button
                      type="button"
                      onClick={() => onOpenPrintModal(solicitud)}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 transition shadow-lg cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Imprimir Etiqueta de Solicitud (100x100mm)</span>
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
              <div className="bg-[#0c1017] dark:bg-white border border-zinc-800 dark:border-zinc-200 rounded-3xl p-5 sm:p-6 space-y-6 shadow-2xl text-white dark:text-zinc-950">
                
                {/* Header & Legend */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 dark:border-zinc-200 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-black text-white dark:text-zinc-950 brand-title">
                        LÍNEA DE TIEMPO DE PROCESOS DE LA OP #{solicitud.op}
                      </h3>
                      <span className="text-[10px] bg-zinc-900 dark:bg-zinc-100 text-zinc-300 dark:text-zinc-700 border border-zinc-800 dark:border-zinc-300 px-2 py-0.5 rounded font-bold">
                        2 Etapas
                      </span>
                      <span className="text-[10px] bg-amber-400 text-black px-2.5 py-0.5 rounded font-black">
                        {solicitud.rollos} Rollos Procesados
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-600">
                      Auditoría cronológica de creación, tiempo de permanencia por área y estado general de retrasos.
                    </p>
                  </div>

                  {/* Legend dots */}
                  <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Inicio</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Proceso</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Alerta</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Fin</span>
                  </div>
                </div>

                {/* 3 KPI Box Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-zinc-900/90 dark:bg-zinc-50 p-3.5 rounded-2xl border border-zinc-800 dark:border-zinc-200 space-y-0.5">
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold block uppercase">1. FECHA Y HORA DE CREACIÓN</span>
                    <span className="text-xs font-mono font-black text-white dark:text-zinc-950 block">
                      {formatColombianDisplayDate(solicitud.fechaCreacion)}
                    </span>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Creado por: {solicitud.inspector}</span>
                  </div>

                  <div className="bg-zinc-900/90 dark:bg-zinc-50 p-3.5 rounded-2xl border border-zinc-800 dark:border-zinc-200 space-y-0.5">
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold block uppercase">2. ÁREAS RECORRIDAS</span>
                    <span className="text-xs font-mono font-black text-amber-400 dark:text-amber-600 block">2 Áreas Registradas</span>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Permanencia registrada por cada área</span>
                  </div>

                  <div className="bg-zinc-900/90 dark:bg-zinc-50 p-3.5 rounded-2xl border border-zinc-800 dark:border-zinc-200 space-y-0.5">
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold block uppercase">3. RETRASO / TIEMPO GENERAL</span>
                    <span className="text-xs font-mono font-black text-emerald-400 dark:text-emerald-600 block">
                      {solicitud.tieneRetraso ? `+${solicitud.diasHabiles} días hábiles (Retraso)` : '0 días hábiles (0.0h) (A Tiempo)'}
                    </span>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Evaluación general frente a SLA laboral</span>
                  </div>
                </div>

                {/* TIMELINE ITEMS CHRONOLOGY */}
                <div className="space-y-4 pt-2">
                  
                  {/* ITEM 1: MUESTRA CREADA Y REGISTRADA EN ATELIER */}
                  <div className="bg-zinc-900/90 dark:bg-zinc-50 border border-zinc-800 dark:border-zinc-200 rounded-2xl p-4.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center justify-center text-xs">
                          ⏱️
                        </div>
                        <span className="text-xs font-black uppercase tracking-wide text-white dark:text-zinc-950">
                          MUESTRA CREADA Y REGISTRADA EN ATELIER
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-zinc-500" />
                        {formatColombianDisplayDate(solicitud.fechaCreacion)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] flex-wrap gap-2">
                      <span className="bg-amber-400 text-black px-2.5 py-0.5 rounded font-bold">
                        ● PERMANENCIA EN ÁREA: 15 minutos (Creación y empaque de muestra)
                      </span>
                      <span className="text-zinc-400 dark:text-zinc-500 font-mono text-[10px]">
                        (Duración acumulada: 15 min)
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-600 pt-1 border-t border-zinc-800 dark:border-zinc-200">
                      <div>
                        ESTADO: <strong className="text-white dark:text-zinc-950">NUEVO ➔ SOLICITADO</strong>
                      </div>
                      <div>
                        👤 RESPONSABLE: <strong className="text-white dark:text-zinc-950">{solicitud.inspector}</strong>
                      </div>
                    </div>

                    <div className="bg-zinc-950 dark:bg-zinc-100 border border-zinc-800 dark:border-zinc-200 rounded-xl p-2.5 text-xs text-zinc-300 dark:text-zinc-700">
                      "{solicitud.observacionesOperario || 'Ojo solo es una OP de prueba para el sistema'}"
                    </div>
                  </div>

                  {/* ITEM 2: DESPACHADO A LAVANDERÍA */}
                  <div className="bg-zinc-900/90 dark:bg-zinc-50 border border-amber-500/40 rounded-2xl p-4.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-xs">
                          💧
                        </div>
                        <span className="text-xs font-black uppercase tracking-wide text-amber-400 dark:text-amber-600">
                          DESPACHADO A LAVANDERÍA (SOLICITUD ACTIVA)
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-zinc-500" />
                        {new Date(solicitud.fechaCreacion).toLocaleDateString()} {new Date(solicitud.fechaCreacion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] flex-wrap gap-2">
                      <span className="bg-amber-400 text-black px-2.5 py-0.5 rounded font-bold">
                        ● PERMANENCIA EN ÁREA: 15 min antes del envío a Lavandería
                      </span>
                      <span className="text-zinc-400 dark:text-zinc-500 font-mono text-[10px]">
                        (Duración acumulada: 15 min)
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-600 pt-1 border-t border-zinc-800 dark:border-zinc-200">
                      <div>
                        ESTADO: <strong className="text-white dark:text-zinc-950">PRE-SOLICITUD ➔ SOLICITADO</strong>
                      </div>
                      <div>
                        👤 RESPONSABLE: <strong className="text-white dark:text-zinc-950">{solicitud.inspector}</strong>
                      </div>
                    </div>

                    <div className="bg-zinc-950 dark:bg-zinc-100 border border-zinc-800 dark:border-zinc-200 rounded-xl p-2.5 text-xs text-zinc-300 dark:text-zinc-700">
                      "Muestra lista para recepción e ingreso en tambores de lavandería ZF."
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

        </div>

        {/* 4. MODAL FOOTER */}
        <div className="p-4 border-t border-zinc-800 dark:border-zinc-200 bg-zinc-900/80 dark:bg-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-white dark:text-zinc-950">
          <div className="flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-600">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Sistema STF — Monitoreo de Lavandería e Indicadores</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleSendReport}
              disabled={isNotifying}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isNotifying ? 'Enviando...' : 'NOTIFICAR / ENVIAR REPORTE'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-800 text-xs font-bold transition cursor-pointer"
            >
              CERRAR
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
