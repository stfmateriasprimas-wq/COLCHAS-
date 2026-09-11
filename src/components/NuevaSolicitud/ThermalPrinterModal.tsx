import React, { useState, useEffect } from 'react';
import { SafeQRCode } from '../Common/SafeQRCode';
import { Printer, X, Copy, ExternalLink, Check, ShieldCheck, User, Camera, Download, FileText } from 'lucide-react';
import { SolicitudColcha } from '../../types';
import { generateColchaPdfTicket, printColchaDirectTicket, getCleanFinalQualityObservation, getCleanInitialObservation } from '../../services/exportService';
import { generatePublicTrackingUrl, generatePublicTrackingUrlAsync } from '../../services/qrTrackingService';
import { getOpPhotosFromCache } from '../../services/googleSheetsService';

const STF_QR_LOGO_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%23000000"/><rect x="4" y="4" width="92" height="92" rx="16" fill="%23000000" stroke="%23ffffff" stroke-width="4"/><text x="50" y="65" font-size="38" font-family="Arial, Helvetica, sans-serif" font-weight="900" fill="%23ffffff" text-anchor="middle" letter-spacing="-1">STF</text></svg>`;

interface ThermalPrinterModalProps {
  colcha: SolicitudColcha | null;
  onClose: () => void;
}

export const ThermalPrinterModal: React.FC<ThermalPrinterModalProps> = ({ colcha, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [asyncTrackingUrl, setAsyncTrackingUrl] = useState<string>('');

  const cachedPhotos = getOpPhotosFromCache(colcha?.op);
  const effectiveFotoMuestra = colcha?.fotoMuestraUrl || cachedPhotos?.foto1;
  const colchaWithPhoto = colcha ? { ...colcha, fotoMuestraUrl: effectiveFotoMuestra } : null;

  useEffect(() => {
    if (!colchaWithPhoto) return;
    let isMounted = true;
    generatePublicTrackingUrlAsync(colchaWithPhoto).then((url) => {
      if (isMounted && url) {
        setAsyncTrackingUrl(url);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [colchaWithPhoto]);

  if (!colcha) return null;

  // Enlace oficial de trazabilidad pública con carga de datos completa codificada (resiliente para móviles)
  const publicLink = asyncTrackingUrl || generatePublicTrackingUrl(colchaWithPhoto || colcha);

  const isFinalizado = colcha.estado === 'FINALIZADO';
  const cleanFinalObs = getCleanFinalQualityObservation(colcha);
  const cleanInitialObs = getCleanInitialObservation(colcha);
  const obsToShow = isFinalizado ? cleanFinalObs : cleanInitialObs;
  const obsTitle = isFinalizado ? 'OBSERVACIÓN FINAL CALIDAD:' : 'OBSERVACIÓN OPERARIO / CORTE:';

  const cleanOpDigits = colcha.op.replace(/^OP-?/i, '').trim();
  const refClean = colcha.referencia ? colcha.referencia.toUpperCase() : 'S/R';
  const refDisplay = refClean.startsWith('REF') ? refClean : `REF-${refClean}`;
  const mtDisplay = colcha.codigoMt ? (colcha.codigoMt.toUpperCase().endsWith('MT') ? colcha.codigoMt : `${colcha.codigoMt} Mt`) : 'MT-AUTO';
  const loteDisplay = colcha.lote ? (colcha.lote.toUpperCase().startsWith('LOTE') ? colcha.lote : `LOTE-${colcha.lote}`) : 'LOTE-1';
  const printDateStr = new Date().toLocaleString('es-CO');

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintLabelDirect = () => {
    // Extraer QR SVG codificado en base64 para resolución nítida
    const svgElem = document.getElementById('thermal-label-qr-svg');
    let qrDataUrl = '';
    if (svgElem) {
      try {
        const svgXml = new XMLSerializer().serializeToString(svgElem);
        qrDataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgXml)));
      } catch (e) {
        console.warn('Could not serialize SVG QR, fallback to URL API', e);
      }
    }
    // Disparar comando directo de impresión nativa
    printColchaDirectTicket(colcha, qrDataUrl);
  };

  const handleDownloadPdfBackup = () => {
    generateColchaPdfTicket(colcha);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0c1017] border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-5xl w-full shadow-2xl overflow-hidden flex flex-col my-auto text-zinc-950 dark:text-white">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/80 flex items-center justify-between gap-4 text-zinc-950 dark:text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-200 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-zinc-950 dark:text-white rounded-xl shadow-sm">
              <Printer className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black brand-title tracking-wide text-zinc-950 dark:text-white">
                CENTRO DE IMPRESIÓN DE ETIQUETAS (100MM X 100MM)
              </h2>
              <p className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                STF GROUP S.A. • FORMATO ESTÁNDAR 4x4"
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white p-2 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Grid (Left: Printer preview, Right: Info) */}
        <div className="p-5 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start bg-transparent">
          
          {/* ======================================================== */}
          {/* LEFT COLUMN: THERMAL PRINTER PREVIEW                     */}
          {/* ======================================================== */}
          <div className="lg:col-span-5 space-y-3">
            
            {/* Status indicator */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                IMPRESORA EN LÍNEA (100X100MM)
              </span>
            </div>

            <div className="text-center text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
              <span className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-2.5 py-1 rounded-md text-zinc-800 dark:text-zinc-200 font-bold">
                FORMATO 4" X 4" (100 X 100 MM)
              </span>
              <p className="mt-1 text-zinc-500 dark:text-zinc-400">Alineado y calibrado para comando directo de impresión térmica (Zebra, Sato, etc.)</p>
            </div>

            {/* Physical Label Simulation Card with Exact Double Border Frame */}
            <div className="bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 shadow-inner">
              
              {/* Double border container */}
              <div className="bg-white p-1.5 border-[3.5px] border-black rounded-sm shadow-md aspect-square select-none max-w-[390px] mx-auto w-full">
                <div
                  id="thermal-label-container"
                  className="bg-white text-black p-3 border-[1.5px] border-black h-full flex flex-col justify-between select-none"
                  style={{ fontFamily: "'Montserrat', 'Outfit', -apple-system, sans-serif" }}
                >
                  {/* Cuadro Amarillo: Logo Oficial COLCHAS STF */}
                  <div className="text-center border-b-2 border-black pb-1">
                    <div className="flex items-center justify-center gap-1.5 leading-none" style={{ fontFamily: "'Montserrat', 'Outfit', sans-serif" }}>
                      <span className="text-lg sm:text-xl uppercase tracking-tight text-black" style={{ fontWeight: 200 }}>
                        COLCHAS
                      </span>
                      <span className="text-lg sm:text-xl uppercase tracking-tight text-black" style={{ fontWeight: 900 }}>
                        STF
                      </span>
                    </div>
                    <div className="text-[6.5px] sm:text-[7.5px] tracking-[0.2em] text-black uppercase mt-0.5 font-normal" style={{ fontFamily: "'Montserrat', 'Outfit', sans-serif" }}>
                      PRODUCTO OFICIAL - STF GROUP
                    </div>
                    <div className="text-xs sm:text-[12px] font-bold tracking-[0.06em] mt-0.5 text-black" style={{ fontFamily: "'Montserrat', 'Outfit', sans-serif" }}>
                      {colcha.op} / {refDisplay}
                    </div>
                  </div>

                  {/* Recuadro de Tela */}
                  <div className="border-[1.5px] border-black px-2 py-1 text-center text-[10px] sm:text-[11px] uppercase bg-white my-1" style={{ fontFamily: "'Montserrat', 'Outfit', sans-serif" }}>
                    <span className="font-black tracking-wider text-black mr-1.5">TELA:</span>
                    <span className="font-light tracking-[0.08em] text-black">{colcha.tela.toUpperCase()}</span>
                  </div>

                  {/* Middle Data & QR */}
                  <div className="grid grid-cols-12 gap-2 items-center flex-1 my-1">
                    
                    {/* Left: Metadata list */}
                    {/* Recuadro Verde: Rótulos en negrilla (estilo 'ela') */}
                    {/* Recuadro Rojo: Valores en tipografía delgada no en negrilla (estilo 'STUDIO F') */}
                    <div className="col-span-7 space-y-1 text-[10px] sm:text-[11px]">
                      <div className="flex justify-between border-b border-zinc-200 pb-0.5">
                        <span className="text-black font-black tracking-wider">COLOR:</span>
                        <span className="text-black font-light tracking-[0.06em]">{colcha.color.toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between border-b border-zinc-200 pb-0.5">
                        <span className="text-black font-black tracking-wider">ROLLOS:</span>
                        <span className="text-black font-light tracking-[0.06em]">{colcha.rollos} rls</span>
                      </div>
                      <div className="flex justify-between border-b border-zinc-200 pb-0.5">
                        <span className="text-black font-black tracking-wider">METRAJE:</span>
                        <span className="text-black font-light tracking-[0.06em]">{mtDisplay}</span>
                      </div>
                      <div className="flex justify-between border-b border-zinc-200 pb-0.5">
                        <span className="text-black font-black tracking-wider">LOTES:</span>
                        <span className="text-black font-light tracking-[0.06em]">{loteDisplay}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-black font-black tracking-wider">DICTAMEN:</span>
                        <span className="text-black font-light tracking-[0.06em]">{colcha.dictamen.toUpperCase()}</span>
                      </div>
                    </div>

                    {/* Right: High-contrast QR with public URL and central STF logo */}
                    <div className="col-span-5 flex flex-col items-center justify-center text-center">
                      <div className="p-0.5 border border-black bg-white">
                        <SafeQRCode
                          id="thermal-label-qr-svg"
                          value={publicLink}
                          size={76}
                          level="M"
                          includeMargin={false}
                          imageSettings={{
                            src: STF_QR_LOGO_SVG,
                            height: 20,
                            width: 20,
                            excavate: true,
                          }}
                        />
                      </div>
                      {/* Recuadro Rojo 2: Texto QR delgado no en negrilla (estilo 'STUDIO F') */}
                      <span className="text-[7.5px] font-light text-black tracking-[0.1em] mt-1 uppercase leading-tight" style={{ fontFamily: "'Montserrat', 'Outfit', sans-serif" }}>
                        ESCANEAR QR<br/>TRAZABILIDAD
                      </span>
                    </div>

                  </div>

                  {/* Footer Observations */}
                  <div className="border-t-[1.5px] border-dashed border-black pt-1 text-[9px] space-y-0.5">
                    {/* Recuadro Verde 2: Título observación en negrilla (estilo 'ela') */}
                    <span className="font-black text-black block text-[9.5px] uppercase tracking-wider" style={{ fontFamily: "'Montserrat', 'Outfit', sans-serif" }}>
                      {obsTitle}
                    </span>
                    {/* Recuadro Rojo 3: Contenido observación delgado no en negrilla (estilo 'STUDIO F') */}
                    <p className="text-black font-light text-[9px] leading-snug line-clamp-2 uppercase tracking-[0.04em]" style={{ fontFamily: "'Montserrat', 'Outfit', sans-serif" }}>
                      {obsToShow}
                    </p>
                    <div className="text-[7.5px] text-zinc-600 pt-0.5 border-t border-zinc-300 text-center tracking-wider font-light" style={{ fontFamily: "'Montserrat', 'Outfit', sans-serif" }}>
                      ID: STF-OP-{cleanOpDigits} • Impreso: {printDateStr}
                    </div>
                  </div>

                </div>
              </div>

              {/* Hardware buttons bar */}
              <div className="mt-2.5 flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                <div className="flex gap-2">
                  <span className="bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-300 px-2 py-0.5 rounded text-[9px] font-bold">FEED</span>
                  <span className="bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-300 px-2 py-0.5 rounded text-[9px] font-bold">PAUSE</span>
                </div>
                <span>Mod: ZEBRA 4x4 (100x100mm)</span>
              </div>

            </div>

          </div>

          {/* ======================================================== */}
          {/* RIGHT COLUMN: DATA VERIFICATION & QR LINK               */}
          {/* ======================================================== */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Header info */}
            <div className="flex items-center justify-between">
              <span className="bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/40 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                VERIFICACIÓN DE DATOS
              </span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                ID: STF-SOL-OP-{colcha.op.replace(/\D/g, '') || '001'}
              </span>
            </div>

            <div>
              <h3 className="text-base font-extrabold text-zinc-950 dark:text-white">
                INFORMACIÓN INTEGRADA EN LA ETIQUETA
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-500/40 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                  ETAPA: {colcha.estado.replace('_', ' ')}
                </span>
                <span className="text-xs text-zinc-600 dark:text-zinc-400">
                  Imprimiendo observación técnica y trazabilidad de planta
                </span>
              </div>
            </div>

            {/* Grid of metadata cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              
              <div className="bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 text-zinc-950 dark:text-white shadow-sm">
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold block uppercase"># OP</span>
                <span className="font-mono font-black text-zinc-950 dark:text-white text-sm">{colcha.op}</span>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 text-zinc-950 dark:text-white shadow-sm">
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold block uppercase">REFERENCIA</span>
                <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-sm">{colcha.referencia}</span>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 text-zinc-950 dark:text-white shadow-sm">
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold block uppercase">TELA</span>
                <span className="font-bold text-zinc-950 dark:text-white text-xs truncate block">{colcha.tela}</span>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 text-zinc-950 dark:text-white shadow-sm">
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold block uppercase">COLOR</span>
                <span className="font-bold text-zinc-950 dark:text-white">{colcha.color}</span>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 text-zinc-950 dark:text-white shadow-sm">
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold block uppercase">ROLLOS</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">{colcha.rollos} rls</span>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 text-zinc-950 dark:text-white shadow-sm">
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold block uppercase">METRAJE / MT</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{colcha.codigoMt} Mt</span>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 text-zinc-950 dark:text-white shadow-sm">
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold block uppercase">LOTES</span>
                <span className="font-bold text-zinc-950 dark:text-white">{colcha.lote}</span>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 sm:col-span-2 text-zinc-950 dark:text-white shadow-sm">
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold block uppercase">REGISTRO Y FECHA</span>
                <span className="text-[11px] text-zinc-700 dark:text-zinc-300 block truncate font-mono">
                  {new Date(colcha.fechaCreacion).toLocaleDateString()} {new Date(colcha.fechaCreacion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Attached Photo Preview */}
              <div className="bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 flex items-center justify-between sm:col-span-3 text-zinc-950 dark:text-white shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 overflow-hidden flex items-center justify-center shrink-0">
                    {effectiveFotoMuestra ? (
                      <img src={effectiveFotoMuestra} alt="Muestra" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-4 h-4 text-zinc-500" />
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 block uppercase">FOTOGRAFÍA ADJUNTA A LA OP</span>
                    <span className="text-xs font-bold text-zinc-950 dark:text-white">
                      {effectiveFotoMuestra ? 'Fotografía de Muestra Registrada ✓' : 'Sin fotografía inicial'}
                    </span>
                  </div>
                </div>
                {effectiveFotoMuestra && (
                  <button
                    type="button"
                    onClick={() => window.open(effectiveFotoMuestra, '_blank')}
                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    Ver Foto
                  </button>
                )}
              </div>

            </div>

            {/* Direct Mobile Link Box */}
            <div className="bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-2.5 text-zinc-950 dark:text-white shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SafeQRCode value={publicLink} size={16} />
                  <span className="text-xs font-bold text-zinc-950 dark:text-white uppercase tracking-wide">
                    ENLACE DIRECTO PARA TELÉFONOS MÓVILES
                  </span>
                </div>
                <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 text-[9px] font-bold px-2 py-0.5 rounded">
                  ACCESO PÚBLICO 100%
                </span>
              </div>

              <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                Al escanear el QR con la cámara de cualquier teléfono se abre la ficha de trazabilidad sin pedir inicio de sesión ni contraseñas.
              </p>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex-1 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-950 dark:text-white border border-zinc-300 dark:border-zinc-700 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? '¡Link Copiado!' : 'Copiar Link del QR'}</span>
                </button>

                <a
                  href={publicLink}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-indigo-100 dark:bg-indigo-950 hover:bg-indigo-200 dark:hover:bg-indigo-900 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700/60 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <span>Probar Enlace</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Dictamen & Operario Footnote */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-bold block">DICTAMEN DE CALIDAD</span>
                <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 text-xs font-extrabold px-3 py-1 rounded-lg inline-block mt-0.5">
                  {colcha.dictamen}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-bold block">OPERARIO A CARGO</span>
                <span className="text-xs font-bold text-zinc-950 dark:text-white flex items-center gap-1 mt-0.5 justify-end">
                  <User className="w-3.5 h-3.5 text-zinc-500" />
                  {colcha.inspector}
                </span>
              </div>
            </div>

          </div>

        </div>

        {/* Modal Bottom Actions */}
        <div className="p-4 sm:p-5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-zinc-950 dark:text-white">
          <button
            type="button"
            onClick={handleDownloadPdfBackup}
            className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-zinc-200 dark:bg-zinc-800/80 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-300 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
            title="Descargar archivo PDF de 100x100mm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar PDF 4x4"</span>
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-6 py-3 rounded-2xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-950 dark:text-white text-xs font-extrabold transition cursor-pointer"
            >
              CANCELAR / VOLVER
            </button>

            {/* BOTÓN OFICIAL CON COMANDO DIRECTO DE IMPRESIÓN */}
            <button
              type="button"
              onClick={handlePrintLabelDirect}
              className="flex-1 sm:flex-none px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-400 hover:from-emerald-400 hover:to-green-300 text-black font-black font-mono text-xs flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 transition transform active:scale-95 cursor-pointer uppercase tracking-wider"
            >
              <Printer className="w-4 h-4 fill-black" />
              <span>IMPRIMIR ETIQUETA AHORA</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
