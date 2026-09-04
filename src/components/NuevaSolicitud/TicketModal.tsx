import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Check, X } from 'lucide-react';
import { SolicitudColcha } from '../../types';
import { generateColchaPdfTicket } from '../../services/exportService';

interface TicketModalProps {
  colcha: SolicitudColcha | null;
  onClose: () => void;
}

export const TicketModal: React.FC<TicketModalProps> = ({ colcha, onClose }) => {
  if (!colcha) return null;

  const handleDownloadPdf = () => {
    generateColchaPdfTicket(colcha);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#0c1017] dark:bg-white border border-zinc-800 dark:border-zinc-200 rounded-3xl max-w-sm w-full p-6 space-y-5 shadow-2xl relative text-white dark:text-zinc-950">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white dark:text-zinc-600 dark:hover:text-zinc-950 p-1 rounded-lg cursor-pointer hover:bg-zinc-800 dark:hover:bg-zinc-200 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Success Header */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 dark:text-emerald-700 border border-emerald-500/40 flex items-center justify-center mx-auto">
            <Check className="w-6 h-6" />
          </div>
          <h3 className="text-base font-extrabold text-white dark:text-zinc-950">¡Solicitud Registrada!</h3>
          <p className="text-xs text-zinc-400 dark:text-zinc-600">Colcha de control generada para trazabilidad</p>
        </div>

        {/* Thermal Ticket Simulation */}
        <div className="bg-white text-zinc-900 p-5 rounded-2xl space-y-3 font-mono text-[11px] shadow-inner border border-zinc-300">
          <div className="text-center border-b border-zinc-300 pb-2">
            <span className="font-extrabold text-xs tracking-wider block font-sans">STF GROUP S.A.</span>
            <span className="text-[9px] text-zinc-600 block">STUDIO F • ELA • STUDIO F MAN</span>
            <span className="text-[10px] font-bold text-zinc-800">CONTROL DE COLCHA / MUESTRA</span>
          </div>

          <div className="text-center py-1">
            <span className="text-base font-black tracking-wide block">{colcha.op}</span>
            <span className="text-xs font-semibold text-zinc-700">REF: {colcha.referencia}</span>
          </div>

          <div className="space-y-1 border-t border-zinc-300 pt-2 text-[10px]">
            <div className="flex justify-between">
              <span className="text-zinc-500">TELA:</span>
              <span className="font-bold text-zinc-900">{colcha.tela}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">CÓDIGO MT:</span>
              <span className="font-bold">{colcha.codigoMt}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">COLOR:</span>
              <span className="font-bold">{colcha.color}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">ROLLOS / LOTE:</span>
              <span className="font-bold">{colcha.rollos} Rollos | {colcha.lote}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">ESTADO INICIAL:</span>
              <span className="font-bold text-emerald-700">PRE-SOLICITUD</span>
            </div>
          </div>

          {/* QR Code */}
          <div className="flex justify-center pt-2 border-t border-zinc-300">
            <QRCodeSVG
              value={`STF-COLCHA:${colcha.op}|${colcha.referencia}|${colcha.codigoMt}|${colcha.id}`}
              size={90}
              level="M"
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleDownloadPdf}
            className="flex-1 bg-white text-zinc-950 hover:bg-zinc-200 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-800 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition shadow-lg cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>DESCARGAR TICKET PDF</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-950 hover:bg-zinc-700 dark:hover:bg-zinc-300 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
