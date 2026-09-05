import React, { useState, useMemo } from 'react';
import { 
  MessageSquare, Send, AlertTriangle, Users, CheckCircle2, 
  ExternalLink, X, Clock, Layers, Sparkles, PhoneCall, Copy, Check
} from 'lucide-react';
import { SolicitudColcha } from '../../types';
import { UsuarioSTF, USUARIOS_STF_MAESTROS } from '../../services/authService';

export interface DestinatarioWhatsApp {
  id: string;
  nombre: string;
  rol: string;
  area: string;
  telefono: string; // Formato con código país: +57 300 123 4567
}

export const DESTINATARIOS_WHATSAPP_DEFAULT: DestinatarioWhatsApp[] = [
  { id: 'ediaz', nombre: 'Edwin Díaz', rol: 'Administrador', area: 'Calidad', telefono: '+57 318 456 7890' },
  { id: '1111', nombre: 'Auditor Calidad Principal', rol: 'Operario', area: 'Calidad', telefono: '+57 315 234 5678' },
  { id: '3333', nombre: 'Jefe de Planta Colfactory', rol: 'Lavandería', area: 'Lavandería', telefono: '+57 317 890 1234' },
  { id: '2222', nombre: 'Calidad ZF (Atelier)', rol: 'Operario', area: 'Calidad ZF', telefono: '+57 312 456 7891' },
  { id: '4321', nombre: 'Libia Laboratorio Textil', rol: 'Administrador', area: 'Calidad', telefono: '+57 316 345 6789' },
  { id: '4444', nombre: 'Camila Zouein', rol: 'Cliente ELA', area: 'Colecciones', telefono: '+57 310 567 8902' },
  { id: '9999', nombre: 'Jesús Salcedo', rol: 'Cliente SF', area: 'Colecciones', telefono: '+57 312 678 9013' },
  { id: '5555', nombre: 'Robert Daza', rol: 'Cliente SF', area: 'Colecciones', telefono: '+57 314 789 0124' },
  { id: '6666', nombre: 'Luisa Medina', rol: 'Cliente ELA', area: 'Colecciones', telefono: '+57 311 890 1235' },
  { id: '7777', nombre: 'Valentina Giraldo', rol: 'Cliente Outlet', area: 'Colecciones', telefono: '+57 313 901 2346' },
  { id: '8888', nombre: 'Paola Jaramillo', rol: 'Lavandería', area: 'Lavandería', telefono: '+57 319 012 3456' },
  { id: '1107529604', nombre: 'Didier Muñoz', rol: 'Operario', area: 'Calidad ZF', telefono: '+57 318 123 4567' },
  { id: '1114392241', nombre: 'Andrés Felipe Tascón', rol: 'Operario', area: 'Calidad', telefono: '+57 314 567 8902' },
  { id: '1004670524', nombre: 'Dilan Soto', rol: 'Operario', area: 'Calidad', telefono: '+57 310 678 9013' },
  { id: '1010159672', nombre: 'Jhon Eyder', rol: 'Operario', area: 'Calidad', telefono: '+57 311 789 0124' },
  { id: '1118309204', nombre: 'Wilmer Maya', rol: 'Operario', area: 'Calidad', telefono: '+57 313 890 1235' },
  { id: '1107047649', nombre: 'Juan David Cortez', rol: 'Operario', area: 'Calidad', telefono: '+57 318 901 2346' },
  { id: '1005829307', nombre: 'Jhon Freddy González', rol: 'Operario', area: 'Calidad', telefono: '+57 317 012 3457' },
  { id: '1006099840', nombre: 'Sebastián Herrera', rol: 'Operario', area: 'Calidad ZF', telefono: '+57 315 123 4568' },
  { id: '66997344', nombre: 'Sandra Vanegas', rol: 'Lavandería', area: 'Lavandería', telefono: '+57 316 234 5679' },
  { id: '66826345', nombre: 'Ana Milena García', rol: 'Lavandería', area: 'Lavandería', telefono: '+57 319 345 6780' },
  { id: '1130643859', nombre: 'Jhonatan Pinzón', rol: 'Lavandería', area: 'Lavandería', telefono: '+57 318 456 7891' }
];

interface WhatsAppEmergencyAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  solicitudes?: SolicitudColcha[];
  currentUser?: UsuarioSTF | null;
}

export const WhatsAppEmergencyAlertModal: React.FC<WhatsAppEmergencyAlertModalProps> = ({
  isOpen,
  onClose,
  solicitudes = [],
  currentUser
}) => {
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>('TODOS');
  const [selectedOpMotivo, setSelectedOpMotivo] = useState<string>('GENERAL');
  const [customOpText, setCustomOpText] = useState<string>('');
  const [detalleAdicional, setDetalleAdicional] = useState<string>('');
  const [copiedPreview, setCopiedPreview] = useState<boolean>(false);
  const [sentCount, setSentCount] = useState<number>(0);

  // Destinatarios list
  const destinatarios = DESTINATARIOS_WHATSAPP_DEFAULT;

  // Active OPs in delay or alert
  const opsEnAlerta = useMemo(() => {
    return solicitudes.filter(s => s.tieneRetraso && s.estado !== 'FINALIZADO');
  }, [solicitudes]);

  if (!isOpen) return null;

  // Helper: Clean phone number to pure digits
  const cleanPhoneNumber = (phone: string): string => {
    return phone.replace(/[^0-9]/g, '');
  };

  // Helper: Format Motivo text
  const getMotivoLabel = (): string => {
    if (selectedOpMotivo === 'GENERAL') {
      return customOpText.trim() ? customOpText.trim() : 'Sin OP / Motivo General';
    }
    return selectedOpMotivo;
  };

  // Helper: Build WhatsApp formatted message
  const buildWhatsAppMessage = (recipientName: string): string => {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const formattedTime = now.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    let msg = `🚨 *ALERTA DE EMERGENCIA - SISTEMA STF COLCHAS* 🚨\n\n`;
    msg += `👤 *Destinatario:* ${recipientName}\n`;
    msg += `📋 *OP / Motivo:* ${getMotivoLabel()}\n`;

    if (detalleAdicional.trim()) {
      msg += `📝 *Detalle:* ${detalleAdicional.trim()}\n`;
    }

    if (currentUser?.nombre) {
      msg += `📢 *Emitido por:* ${currentUser.nombre} (${currentUser.rol || 'STF'})\n`;
    }

    msg += `📅 *Fecha y Hora:* ${formattedDate}, ${formattedTime}\n\n`;
    msg += `⚠️ _Por favor atender esta notificación con prioridad en la línea de producción._`;

    return msg;
  };

  // Helper: Build Direct WhatsApp URL
  const buildWhatsAppUrl = (phone: string, recipientName: string): string => {
    const cleanPhone = cleanPhoneNumber(phone);
    const message = buildWhatsAppMessage(recipientName);
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  // Single or Broadcast WhatsApp trigger
  const handleSendWhatsApp = () => {
    if (selectedRecipientId === 'TODOS') {
      // Send to all: open with slight interval
      destinatarios.forEach((dest, idx) => {
        setTimeout(() => {
          const url = buildWhatsAppUrl(dest.telefono, dest.nombre);
          window.open(url, '_blank');
        }, idx * 600);
      });
      setSentCount(destinatarios.length);
    } else {
      const dest = destinatarios.find(d => d.id === selectedRecipientId);
      if (dest) {
        const url = buildWhatsAppUrl(dest.telefono, dest.nombre);
        window.open(url, '_blank');
        setSentCount(prev => prev + 1);
      }
    }
  };

  // Copy Preview Message to Clipboard
  const handleCopyMessage = () => {
    const targetName = selectedRecipientId === 'TODOS' 
      ? 'Equipo de Planta STF' 
      : (destinatarios.find(d => d.id === selectedRecipientId)?.nombre || 'Usuario');
    const msg = buildWhatsAppMessage(targetName);
    navigator.clipboard.writeText(msg);
    setCopiedPreview(true);
    setTimeout(() => setCopiedPreview(false), 2500);
  };

  const previewName = selectedRecipientId === 'TODOS'
    ? 'Todos los Destinatarios (22 Contactos)'
    : (destinatarios.find(d => d.id === selectedRecipientId)?.nombre || 'Destinatario');

  return (
    <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="bg-[#0b1411] dark:bg-white border-2 border-emerald-500/80 rounded-3xl max-w-2xl w-full shadow-2xl shadow-emerald-950/60 overflow-hidden flex flex-col max-h-[92vh] text-white dark:text-zinc-950 font-sans animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="p-5 sm:p-6 border-b border-emerald-900/60 dark:border-zinc-200 bg-gradient-to-r from-emerald-950/80 via-[#0b1411] to-emerald-950/80 dark:from-emerald-50 dark:via-white dark:to-emerald-50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/60 flex items-center justify-center text-emerald-400 dark:text-emerald-700 shrink-0 shadow-lg shadow-emerald-500/20">
              <MessageSquare className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black uppercase tracking-wide font-mono text-white dark:text-zinc-950">
                  ALERTAS DE EMERGENCIA POR WHATSAPP
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-black bg-emerald-500 text-black uppercase">
                  DIRECT WA.ME
                </span>
              </div>
              <p className="text-xs text-zinc-300 dark:text-zinc-600 mt-0.5">
                Envío instantáneo de notificaciones operativas con enlace directo oficial.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-zinc-400 hover:text-white dark:hover:text-black transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 custom-scroll">
          
          {/* 1. SELECTOR DE DESTINATARIOS */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold text-emerald-400 dark:text-emerald-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                DESTINATARIO DE LA ALERTA:
              </span>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-normal">
                {destinatarios.length} contactos disponibles
              </span>
            </label>

            <select
              value={selectedRecipientId}
              onChange={(e) => setSelectedRecipientId(e.target.value)}
              className="w-full bg-[#12231c] dark:bg-zinc-50 border-2 border-emerald-500/50 dark:border-zinc-300 rounded-2xl px-4 py-3 text-xs sm:text-sm font-mono font-bold text-white dark:text-zinc-950 focus:outline-none focus:border-emerald-400 cursor-pointer shadow-inner"
            >
              <option value="TODOS" className="bg-[#0b1411] text-emerald-300 font-black py-2">
                📢 Enviar a Todos ({destinatarios.length} Usuarios Registrados)
              </option>
              <optgroup label="── Contactos Individuales ──" className="bg-[#0b1411] text-zinc-300">
                {destinatarios.map((dest) => (
                  <option key={dest.id} value={dest.id} className="bg-[#0b1411] text-white py-1">
                    {dest.nombre} ({dest.telefono}) - {dest.area} [{dest.rol}]
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* 2. SELECTOR DE OP / MOTIVO DE ALERTA */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold text-emerald-400 dark:text-emerald-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                ORDEN DE PRODUCCIÓN / MOTIVO DE ALERTA:
              </span>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-normal">
                Opcional
              </span>
            </label>

            <select
              value={selectedOpMotivo}
              onChange={(e) => setSelectedOpMotivo(e.target.value)}
              className="w-full bg-[#12231c] dark:bg-zinc-50 border-2 border-emerald-500/50 dark:border-zinc-300 rounded-2xl px-4 py-3 text-xs sm:text-sm font-mono font-bold text-white dark:text-zinc-950 focus:outline-none focus:border-emerald-400 cursor-pointer shadow-inner"
            >
              <option value="GENERAL" className="bg-[#0b1411] text-zinc-200">
                Sin OP / Motivo General
              </option>
              
              {/* OPs in Alert */}
              {opsEnAlerta.length > 0 && (
                <optgroup label="── OPs con Retraso SLA Activo (>3 Días) ──" className="bg-[#0b1411] text-rose-300">
                  {opsEnAlerta.map((op) => (
                    <option key={op.id} value={`OP-${op.op} - Retraso SLA en ${op.areaActual || 'Planta'} (${op.diasHabiles} Días)`} className="bg-[#0b1411] text-rose-300">
                      🚨 OP-{op.op} • Ref: {op.referencia} • {op.tela} (+{op.diasHabiles - 3}d Retraso)
                    </option>
                  ))}
                </optgroup>
              )}

              {/* Standard Reasons */}
              <optgroup label="── Motivos Estándar de Emergencia ──" className="bg-[#0b1411] text-amber-300">
                <option value="OP Retrasada en Lavandería - Requiere Agilización Urgente">
                  ⚠️ OP Retrasada en Lavandería - Requiere Agilización Urgente
                </option>
                <option value="OP Retenido por Calidad / Muestra no Conforme">
                  🛑 OP Retenido por Calidad / Muestra no Conforme
                </option>
                <option value="Falta de Insumos / Tela para Prueba de Colchas">
                  📦 Falta de Insumos / Tela para Prueba de Colchas
                </option>
                <option value="Mantenimiento Urgente en Maquinaria de Lavandería">
                  🔧 Mantenimiento Urgente en Maquinaria de Lavandería
                </option>
                <option value="OP Aprobada - Lista para Despacho a Colecciones">
                  ✅ OP Aprobada - Lista para Despacho a Colecciones
                </option>
                <option value="Otro Motivo Personalizado">
                  ✏️ Otro Motivo Personalizado...
                </option>
              </optgroup>
            </select>
          </div>

          {/* 3. CAMPO DE TEXTO / DETALLE ADICIONAL */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold text-emerald-400 dark:text-emerald-700 flex items-center justify-between">
              <span>DETALLE ADICIONAL O ACLARACIÓN RÁPIDA:</span>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-normal">
                {detalleAdicional.length}/300 caracteres
              </span>
            </label>
            <textarea
              rows={3}
              maxLength={300}
              value={detalleAdicional}
              onChange={(e) => setDetalleAdicional(e.target.value)}
              placeholder="Ej: Favor priorizar el lavado de los 4 rollos de índigo hoy antes de las 3:00 PM..."
              className="w-full bg-[#12231c] dark:bg-zinc-50 border-2 border-emerald-500/50 dark:border-zinc-300 rounded-2xl p-3.5 text-xs sm:text-sm font-mono text-white dark:text-zinc-950 placeholder-zinc-500 focus:outline-none focus:border-emerald-400 shadow-inner resize-none"
            />
          </div>

          {/* 4. VISTA PREVIA DEL MENSAJE WHATSAPP */}
          <div className="p-4 rounded-2xl bg-[#08130e] dark:bg-emerald-50/50 border border-emerald-500/40 dark:border-emerald-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-black text-emerald-400 dark:text-emerald-800 uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                VISTA PREVIA DEL FORMATO WHATSAPP:
              </span>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 dark:text-emerald-800 text-[10px] font-mono font-bold flex items-center gap-1 transition cursor-pointer"
              >
                {copiedPreview ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedPreview ? 'Copiado' : 'Copiar Texto'}</span>
              </button>
            </div>

            <div className="p-3 rounded-xl bg-black/40 dark:bg-white text-xs font-mono text-emerald-200 dark:text-zinc-800 whitespace-pre-line border border-emerald-500/20 dark:border-zinc-200 leading-relaxed select-text">
              {buildWhatsAppMessage(previewName)}
            </div>
          </div>

          {/* BROADCAST ALERT NOTICE IF 'TODOS' SELECTED */}
          {selectedRecipientId === 'TODOS' && (
            <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 dark:text-amber-800 text-xs font-mono flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong>Modo Difusión Masiva:</strong> Al pulsar enviar, se abrirá la interfaz de WhatsApp para cada uno de los <strong>{destinatarios.length} usuarios registrados</strong> secuencialmente.
              </div>
            </div>
          )}

        </div>

        {/* FOOTER ACTION BUTTON */}
        <div className="p-5 sm:p-6 border-t border-emerald-900/60 dark:border-zinc-200 bg-gradient-to-r from-emerald-950/80 via-[#0b1411] to-emerald-950/80 dark:from-emerald-50 dark:via-white dark:to-emerald-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs font-mono text-zinc-400 dark:text-zinc-600">
            {sentCount > 0 ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {sentCount} alerta(s) enviada(s) en esta sesión
              </span>
            ) : (
              <span>Vía Web / Desktop / Móvil WhatsApp</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-3 rounded-2xl border border-zinc-700 dark:border-zinc-300 text-xs font-bold text-zinc-300 dark:text-zinc-700 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition cursor-pointer"
            >
              Cerrar
            </button>

            {/* BOTÓN OFICIAL DESTACADO ESTILO WHATSAPP (VERDE) */}
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="flex-1 sm:flex-none px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-black font-mono font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95 duration-150"
            >
              <MessageSquare className="w-4 h-4 fill-black" />
              <span>Enviar Alerta por WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
