import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, X, Copy, ExternalLink, Check, ShieldCheck, User, Camera } from 'lucide-react';
import { SolicitudColcha } from '../../types';
import { generateColchaPdfTicket } from '../../services/exportService';

interface ThermalPrinterModalProps {
  colcha: SolicitudColcha | null;
  onClose: () => void;
}

export const ThermalPrinterModal: React.FC<ThermalPrinterModalProps> = ({ colcha, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!colcha) return null;

  const publicLink = `${window.location.origin}/trazabilidad/${colcha.op}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintLabel = () => {
    // Generate standard 100x100mm PDF or trigger native print dialog
    generateColchaPdfTicket(colcha);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#0c1017] dark:bg-white border border-zinc-800 dark:border-zinc-200 rounded-3xl max-w-5xl w-full shadow-2xl overflow-hidden flex flex-col my-auto text-white dark:text-zinc-950">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 dark:border-zinc-200 bg-zinc-900/80 dark:bg-zinc-100 flex items-center justify-between gap-4 text-white dark:text-zinc-950">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-950 dark:bg-zinc-200 border border-zinc-800 dark:border-zinc-300 text-white dark:text-zinc-950 rounded-xl">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black brand-title tracking-wide text-white dark:text-zinc-950">
                CENTRO DE IMPRESIÓN DE ETIQUETAS (100MM X 100MM)
              </h2>
              <p className="text-[10px] sm:text-xs text-zinc-400 dark:text-zinc-600 font-mono">
                STF GROUP S.A. • FORMATO ESTÁNDAR 4x4"
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white dark:text-zinc-600 dark:hover:text-zinc-950 p-2 rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-200 transition cursor-pointer"
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
              <span className="text-emerald-400 dark:text-emerald-600 font-bold flex items-center gap-1.5 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                IMPRESORA EN LÍNEA (100X100MM)
              </span>
            </div>

            <div className="text-center text-[10px] text-zinc-400 dark:text-zinc-600 font-medium">
              <span className="bg-zinc-900 dark:bg-zinc-100 border border-zinc-800 dark:border-zinc-300 px-2.5 py-1 rounded-md text-zinc-300 dark:text-zinc-700">
                FORMATO 4" X 4" (100 X 100 MM)
              </span>
              <p className="mt-1">Alineado y calibrado para impresoras térmicas (Zebra, Sato, etc.)</p>
            </div>

            {/* Physical Label Simulation Card */}
            <div className="bg-zinc-900/90 dark:bg-zinc-100 border border-zinc-800 dark:border-zinc-300 rounded-2xl p-3 shadow-inner">
              
              {/* White 4x4 Adhesive Label */}
              <div
                id="thermal-label-container"
                className="bg-white text-zinc-950 p-4 rounded-lg shadow-md font-sans text-xs space-y-2 border border-zinc-300 aspect-square flex flex-col justify-between select-none"
              >
                {/* Header */}
                <div className="text-center border-b-2 border-zinc-950 pb-1">
                  <h3 className="text-sm font-black tracking-widest brand-title text-zinc-950">
                    COLCHAS STF
                  </h3>
                  <div className="text-xs font-black tracking-wide font-mono mt-0.5">
                    {colcha.op} / REF–{colcha.referencia}
                  </div>
                </div>

                {/* Tela Box */}
                <div className="border border-zinc-950 px-2 py-0.5 rounded text-center text-[10px] font-black uppercase tracking-tight bg-zinc-50">
                  TELA: {colcha.tela}
                </div>

                {/* Middle Data & QR */}
                <div className="grid grid-cols-12 gap-2 items-center">
                  
                  {/* Left: Metadata list */}
                  <div className="col-span-7 space-y-1 text-[10px] font-bold">
                    <div className="flex justify-between border-b border-zinc-200 pb-0.5">
                      <span className="text-zinc-600">COLOR:</span>
                      <span className="text-zinc-950">{colcha.color}</span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-200 pb-0.5">
                      <span className="text-zinc-600">ROLLOS:</span>
                      <span className="text-zinc-950">{colcha.rollos} rls</span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-200 pb-0.5">
                      <span className="text-zinc-600">METRAJE:</span>
                      <span className="text-zinc-950 font-mono text-[9px]">{colcha.codigoMt} Mt</span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-200 pb-0.5">
                      <span className="text-zinc-600">LOTES:</span>
                      <span className="text-zinc-950">{colcha.lote || '1'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">DICTAMEN:</span>
                      <span className="text-zinc-950 font-black">{colcha.dictamen}</span>
                    </div>
                  </div>

                  {/* Right: High-contrast QR */}
                  <div className="col-span-5 flex flex-col items-center justify-center text-center">
                    <div className="p-1 border border-zinc-400 rounded bg-white">
                      <QRCodeSVG
                        value={`https://stfgroup.com/op/${colcha.op}`}
                        size={64}
                        level="H"
                      />
                    </div>
                    <span className="text-[7px] font-black text-zinc-700 tracking-tighter mt-0.5 uppercase">
                      ESCANEAR QR<br/>TRAZABILIDAD
                    </span>
                  </div>

                </div>

                {/* Footer Observations */}
                <div className="border-t border-dashed border-zinc-400 pt-1 text-[9px]">
                  <span className="font-extrabold text-zinc-900 block">OBSERVACIÓN FINAL CALIDAD:</span>
                  <p className="text-zinc-700 font-semibold truncate">
                    {colcha.observacionesOperario || `CONCEPTO CALIDAD: ${colcha.dictamen}`}
                  </p>
                </div>

              </div>

              {/* Hardware buttons bar */}
              <div className="mt-2.5 flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-600 font-mono">
                <div className="flex gap-2">
                  <span className="bg-zinc-800 dark:bg-zinc-200 text-zinc-300 dark:text-zinc-800 px-2 py-0.5 rounded text-[9px]">FEED</span>
                  <span className="bg-zinc-800 dark:bg-zinc-200 text-zinc-300 dark:text-zinc-800 px-2 py-0.5 rounded text-[9px]">PAUSE</span>
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
              <span className="bg-indigo-950/80 dark:bg-indigo-100 text-indigo-300 dark:text-indigo-800 border border-indigo-500/40 dark:border-indigo-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                VERIFICACIÓN DE DATOS
              </span>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                ID: STF-SOL-OP-{colcha.op.replace(/\D/g, '') || '001'}
              </span>
            </div>

            <div>
              <h3 className="text-base font-extrabold text-white dark:text-zinc-950">
                INFORMACIÓN INTEGRADA EN LA ETIQUETA
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="bg-purple-950/80 dark:bg-purple-100 text-purple-300 dark:text-purple-800 border border-purple-500/40 dark:border-purple-300 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                  ETAPA: {colcha.estado.replace('_', ' ')}
                </span>
                <span className="text-xs text-zinc-400 dark:text-zinc-600">
                  Imprimiendo observación técnica y trazabilidad de planta
                </span>
              </div>
            </div>

            {/* Grid of metadata cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              
              <div className="bg-zinc-900/90 dark:bg-zinc-50 border border-zinc-800 dark:border-zinc-200 rounded-2xl p-3 text-white dark:text-zinc-950">
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold block uppercase"># OP</span>
                <span className="font-mono font-black text-white dark:text-zinc-950 text-sm">{colcha.op}</span>
              </div>

              <div className="bg-zinc-900/90 dark:bg-zinc-50 border border-zinc-800 dark:border-zinc-200 rounded-2xl p-3 text-white dark:text-zinc-950">
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold block uppercase">REFERENCIA</span>
                <span className="font-mono font-black text-indigo-400 dark:text-indigo-600 text-sm">{colcha.referencia}</span>
              </div>

              <div className="bg-zinc-900/90 dark:bg-zinc-50 border border-zinc-800 dark:border-zinc-200 rounded-2xl p-3 text-white dark:text-zinc-950">
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold block uppercase">TELA</span>
                <span className="font-bold text-white dark:text-zinc-950 text-xs truncate block">{colcha.tela}</span>
              </div>

              <div className="bg-zinc-900/90 dark:bg-zinc-50 border border-zinc-800 dark:border-zinc-200 rounded-2xl p-3 text-white dark:text-zinc-950">
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold block uppercase">COLOR</span>
                <span className="font-bold text-white dark:text-zinc-950">{colcha.color}</span>
              </div>

              <div className="bg-zinc-900/90 dark:bg-zinc-50 border border-zinc-800 dark:border-zinc-200 rounded-2xl p-3 text-white dark:text-zinc-950">
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold block uppercase">ROLLOS</span>
                <span className="font-bold text-amber-400 dark:text-amber-600">{colcha.rollos} rls</span>
              </div>

              <div className="bg-zinc-900/90 dark:bg-zinc-50 border border-zinc-800 dark:border-zinc-200 rounded-2xl p-3 text-white dark:text-zinc-950">
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold block uppercase">METRAJE / MT</span>
                <span className="font-mono font-bold text-emerald-400 dark:text-emerald-600">{colcha.codigoMt} Mt</span>
              </div>

              <div className="bg-zinc-900/90 dark:bg-zinc-50 border border-zinc-800 dark:border-zinc-200 rounded-2xl p-3 text-white dark:text-zinc-950">
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold block uppercase">LOTES</span>
                <span className="font-bold text-white dark:text-zinc-950">{colcha.lote}</span>
              </div>

              <div className="bg-zinc-900/90 dark:bg-zinc-50 border border-zinc-800 dark:border-zinc-200 rounded-2xl p-3 sm:col-span-2 text-white dark:text-zinc-950">
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold block uppercase">REGISTRO Y FECHA</span>
                <span className="text-[11px] text-zinc-300 dark:text-zinc-700 block truncate font-mono">
                  {new Date(colcha.fechaCreacion).toLocaleDateString()} {new Date(colcha.fechaCreacion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Attached Photo Preview */}
              <div className="bg-zinc-900/90 dark:bg-zinc-50 border border-zinc-800 dark:border-zinc-200 rounded-2xl p-3 flex items-center justify-between sm:col-span-3 text-white dark:text-zinc-950">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-zinc-950 dark:bg-zinc-200 border border-zinc-800 dark:border-zinc-300 overflow-hidden flex items-center justify-center shrink-0">
                    {colcha.fotoMuestraUrl ? (
                      <img src={colcha.fotoMuestraUrl} alt="Muestra" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-4 h-4 text-zinc-500" />
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 block uppercase">FOTOGRAFÍA ADJUNTA A LA OP</span>
                    <span className="text-xs font-bold text-white dark:text-zinc-950">
                      {colcha.fotoMuestraUrl ? 'Fotografía de Muestra Registrada ✓' : 'Sin fotografía inicial'}
                    </span>
                  </div>
                </div>
                {colcha.fotoMuestraUrl && (
                  <button
                    type="button"
                    onClick={() => window.open(colcha.fotoMuestraUrl, '_blank')}
                    className="text-xs font-bold text-emerald-400 dark:text-emerald-600 hover:underline cursor-pointer"
                  >
                    Ver Foto
                  </button>
                )}
              </div>

            </div>

            {/* Direct Mobile Link Box */}
            <div className="bg-zinc-900/90 dark:bg-zinc-50 border border-zinc-800 dark:border-zinc-200 rounded-2xl p-4 space-y-2.5 text-white dark:text-zinc-950">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <QRCodeSVG value={publicLink} size={16} />
                  <span className="text-xs font-bold text-white dark:text-zinc-950 uppercase tracking-wide">
                    ENLACE DIRECTO PARA TELÉFONOS MÓVILES
                  </span>
                </div>
                <span className="bg-emerald-950/80 dark:bg-emerald-100 text-emerald-300 dark:text-emerald-800 border border-emerald-500/40 dark:border-emerald-300 text-[9px] font-bold px-2 py-0.5 rounded">
                  ACCESO PÚBLICO 100%
                </span>
              </div>

              <p className="text-[11px] text-zinc-400 dark:text-zinc-600">
                Al escanear el QR con la cámara de cualquier teléfono se abre la ficha de trazabilidad sin pedir inicio de sesión ni contraseñas.
              </p>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex-1 bg-zinc-950 dark:bg-zinc-200 hover:bg-zinc-800 dark:hover:bg-zinc-300 text-white dark:text-zinc-950 border border-zinc-800 dark:border-zinc-300 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? '¡Link Copiado!' : 'Copiar Link del QR'}</span>
                </button>

                <a
                  href={publicLink}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-indigo-950 dark:bg-indigo-100 hover:bg-indigo-900 dark:hover:bg-indigo-200 text-indigo-300 dark:text-indigo-800 border border-indigo-700/60 dark:border-indigo-300 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <span>Probar Enlace</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Dictamen & Operario Footnote */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-bold block">DICTAMEN DE CALIDAD</span>
                <span className="bg-emerald-950/80 dark:bg-emerald-100 text-emerald-300 dark:text-emerald-800 border border-emerald-500/40 dark:border-emerald-300 text-xs font-extrabold px-3 py-1 rounded-lg inline-block mt-0.5">
                  {colcha.dictamen}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-bold block">OPERARIO A CARGO</span>
                <span className="text-xs font-bold text-white dark:text-zinc-950 flex items-center gap-1 mt-0.5 justify-end">
                  <User className="w-3.5 h-3.5 text-zinc-400" />
                  {colcha.inspector}
                </span>
              </div>
            </div>

          </div>

        </div>

        {/* Modal Bottom Actions */}
        <div className="p-4 sm:p-5 border-t border-zinc-800 dark:border-zinc-200 bg-zinc-900/80 dark:bg-zinc-100 flex items-center justify-end gap-3 text-white dark:text-zinc-950">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-2xl bg-zinc-800 dark:bg-zinc-200 hover:bg-zinc-700 dark:hover:bg-zinc-300 text-white dark:text-zinc-950 text-xs font-extrabold transition cursor-pointer"
          >
            CANCELAR / VOLVER
          </button>

          <button
            onClick={handlePrintLabel}
            className="px-8 py-3 rounded-2xl bg-white text-zinc-950 hover:bg-zinc-200 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-800 text-xs font-black flex items-center gap-2 shadow-xl transition transform active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>IMPRIMIR ETIQUETA AHORA</span>
          </button>
        </div>

      </div>
    </div>
  );
};
