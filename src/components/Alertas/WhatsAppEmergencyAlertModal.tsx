import React, { useState, useEffect, useMemo } from 'react';
import { 
  MessageSquare, Send, AlertTriangle, Users, CheckCircle2, 
  ExternalLink, X, Clock, Layers, Sparkles, PhoneCall, Copy, Check,
  Flame, ShieldAlert, Link as LinkIcon
} from 'lucide-react';
import { SolicitudColcha } from '../../types';
import { 
  UsuarioSTF, 
  getUsuariosList, 
  subscribeUsuariosList, 
  syncUsuariosFromSheets,
  formatWhatsAppNumber 
} from '../../services/authService';

export interface DestinatarioWhatsApp {
  id: string;
  nombre: string;
  rol: string;
  area: string;
  telefono: string; // Formato con código país: +57 300 123 4567
  whatsappDigits?: string; // Solo números para wa.me (ej: 573116795548)
}

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
  const [usuarios, setUsuarios] = useState<UsuarioSTF[]>(getUsuariosList);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>('TODOS');
  const [selectedOpMotivo, setSelectedOpMotivo] = useState<string>('GENERAL');
  const [customOpText, setCustomOpText] = useState<string>('');
  const [detalleAdicional, setDetalleAdicional] = useState<string>('');
  const [copiedPreview, setCopiedPreview] = useState<boolean>(false);
  const [sentCount, setSentCount] = useState<number>(0);

  // Subscribe to real-time user updates & sync from Google Sheets
  useEffect(() => {
    const unsub = subscribeUsuariosList((latest) => {
      setUsuarios(latest);
    });
    if (isOpen) {
      syncUsuariosFromSheets();
    }
    return unsub;
  }, [isOpen]);

  // Dynamic Destinatarios list from Google Sheets
  const destinatarios: DestinatarioWhatsApp[] = useMemo(() => {
    return usuarios.map(u => {
      const phoneInfo = formatWhatsAppNumber(u.telefono || u.whatsapp || '');
      return {
        id: u.id,
        nombre: u.nombre,
        rol: u.rol,
        area: u.area,
        telefono: phoneInfo.display || (u.telefono || '+57 300 000 0000'),
        whatsappDigits: phoneInfo.cleanDigits || (u.whatsapp || '')
      };
    });
  }, [usuarios]);

  // Active OPs in delay or alert
  const opsEnAlerta = useMemo(() => {
    return solicitudes.filter(s => s.tieneRetraso && s.estado !== 'FINALIZADO');
  }, [solicitudes]);

  if (!isOpen) return null;

  // Helper: Clean phone number to pure digits
  const cleanPhoneNumber = (phone: string, digitsFallback?: string): string => {
    if (digitsFallback && digitsFallback.trim()) {
      return digitsFallback.replace(/\D/g, '');
    }
    const clean = phone.replace(/\D/g, '');
    if (clean.length === 10 && clean.startsWith('3')) {
      return `57${clean}`;
    }
    return clean;
  };

  // Helper: Format Motivo text
  const getMotivoLabel = (): string => {
    if (selectedOpMotivo === 'GENERAL') {
      return customOpText.trim() ? customOpText.trim() : 'Sin OP / Motivo General';
    }
    return selectedOpMotivo;
  };

  // Helper: Build Direct Magic Auto-Login Link
  const buildDirectMagicLink = (userId?: string): string => {
    const origin = typeof window !== 'undefined' && window.location.origin 
      ? window.location.origin 
      : 'https://remix-stf-group-quality-control-5.vercel.app';

    const params = new URLSearchParams();
    if (userId && userId !== 'TODOS') {
      params.set('user', userId);
    }
    
    // Extraer número de OP limpio si existe
    let targetOp = '';
    if (selectedOpMotivo && selectedOpMotivo !== 'GENERAL') {
      const match = selectedOpMotivo.match(/OP-?(\d+)/i) || selectedOpMotivo.match(/(\d{4,})/);
      if (match && match[1]) {
        targetOp = match[1];
      } else {
        const digits = selectedOpMotivo.replace(/\D/g, '');
        if (digits) targetOp = digits;
      }
    }
    
    if (!targetOp && customOpText.trim()) {
      const customMatch = customOpText.match(/OP-?(\d+)/i) || customOpText.match(/(\d{4,})/);
      if (customMatch && customMatch[1]) {
        targetOp = customMatch[1];
      } else {
        const digits = customOpText.replace(/\D/g, '');
        if (digits) targetOp = digits;
      }
    }

    if (targetOp) {
      params.set('op', targetOp);
      params.set('tab', 'solicitudes');
    } else {
      params.set('tab', 'alertas');
    }

    return `${origin}/?${params.toString()}`;
  };

  // Helper: Build WhatsApp formatted message (Con estilo de alerta roja vibrante y auto-login)
  const buildWhatsAppMessage = (recipientName: string, recipientId?: string): string => {
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

    const motivoText = getMotivoLabel();
    const magicLink = buildDirectMagicLink(recipientId);
    const issuerName = currentUser?.nombre ? `${currentUser.nombre} (${currentUser.rol || 'STF'})` : 'EDWIN DIAZ (ADMINISTRADOR)';

    let msg = `🔴 *ALERTA COLCHAS - STF GROUP* 🔴\n`;
    msg += `🚨 *NOTIFICACIÓN DE EMERGENCIA* 🚨\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `👤 *Destinatario:* ${recipientName}\n`;
    msg += `📋 *OP / Motivo:* ${motivoText}\n`;

    if (detalleAdicional.trim()) {
      msg += `📝 *Detalle:* ${detalleAdicional.trim()}\n`;
    }

    msg += `📢 *Emitido por:* ${issuerName}\n`;
    msg += `📅 *Fecha:* ${formattedDate}, ${formattedTime}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🔗 *ACCESO DIRECTO A LA OP:*\n`;
    msg += `👉 ${magicLink}\n`;
    msg += `_(Toca el enlace para abrir la orden técnica sin contraseña)_\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `⚠️ _Por favor atender esta notificación con máxima prioridad en la línea de producción._`;

    return msg;
  };

  // Helper: Build Direct WhatsApp URL
  const buildWhatsAppUrl = (phone: string, recipientName: string, recipientId?: string, digitsFallback?: string): string => {
    const cleanPhone = cleanPhoneNumber(phone, digitsFallback);
    const message = buildWhatsAppMessage(recipientName, recipientId);
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  // Single or Broadcast WhatsApp trigger
  const handleSendWhatsApp = () => {
    if (selectedRecipientId === 'TODOS') {
      // Modo difusión masiva: cada destinatario recibe su enlace personalizado con su ID
      destinatarios.forEach((dest, idx) => {
        setTimeout(() => {
          const url = buildWhatsAppUrl(dest.telefono, dest.nombre, dest.id, dest.whatsappDigits);
          window.open(url, '_blank');
        }, idx * 600);
      });
      setSentCount(destinatarios.length);
    } else {
      const dest = destinatarios.find(d => d.id === selectedRecipientId);
      if (dest) {
        const url = buildWhatsAppUrl(dest.telefono, dest.nombre, dest.id, dest.whatsappDigits);
        window.open(url, '_blank');
        setSentCount(prev => prev + 1);
      }
    }
  };

  // Copy Preview Message to Clipboard
  const handleCopyMessage = () => {
    const targetUser = selectedRecipientId === 'TODOS' 
      ? undefined 
      : destinatarios.find(d => d.id === selectedRecipientId);
    const targetName = targetUser ? targetUser.nombre : 'Equipo de Planta STF';
    const targetId = targetUser ? targetUser.id : undefined;
    const msg = buildWhatsAppMessage(targetName, targetId);
    navigator.clipboard.writeText(msg);
    setCopiedPreview(true);
    setTimeout(() => setCopiedPreview(false), 2500);
  };

  const previewUser = selectedRecipientId === 'TODOS'
    ? destinatarios[0]
    : destinatarios.find(d => d.id === selectedRecipientId);
  const previewName = selectedRecipientId === 'TODOS'
    ? `Todos los Destinatarios (${destinatarios.length} Contactos)`
    : (previewUser?.nombre || 'Destinatario');
  const previewId = selectedRecipientId === 'TODOS' ? undefined : previewUser?.id;

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
                  AUTO-LOGIN DIRECTO
                </span>
              </div>
              <p className="text-xs text-zinc-300 dark:text-zinc-600 mt-0.5">
                Envío instantáneo sincronizado con la hoja <strong>USUARIOS</strong> (Columna F).
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
                {destinatarios.length} contactos en Google Sheets
              </span>
            </label>

            <select
              value={selectedRecipientId}
              onChange={(e) => setSelectedRecipientId(e.target.value)}
              className="w-full bg-[#12231c] dark:bg-zinc-50 border-2 border-emerald-500/50 dark:border-zinc-300 rounded-2xl px-4 py-3 text-xs sm:text-sm font-mono font-bold text-white dark:text-zinc-950 focus:outline-none focus:border-emerald-400 cursor-pointer shadow-inner"
            >
              <option value="TODOS" className="bg-[#0b1411] text-emerald-300 font-black py-2">
                📢 Enviar a Todos ({destinatarios.length} Usuarios Registrados en Google Sheets)
              </option>
              <optgroup label="── Contactos Registrados en Base de Datos (Columna F WhatsApp) ──" className="bg-[#0b1411] text-zinc-300">
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

          {/* 4. VISTA PREVIA DEL MENSAJE WHATSAPP (CON FORMATO ROJO Y ENLACE MÁGICO) */}
          <div className="p-4 rounded-2xl bg-[#08130e] dark:bg-emerald-50/50 border border-emerald-500/40 dark:border-emerald-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-black text-emerald-400 dark:text-emerald-800 uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                VISTA PREVIA DEL MENSAJE OFICIAL:
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

            <div className="p-3.5 rounded-xl bg-black/60 dark:bg-white text-xs font-mono text-emerald-100 dark:text-zinc-800 whitespace-pre-line border border-emerald-500/30 dark:border-zinc-200 leading-relaxed select-text shadow-inner">
              {buildWhatsAppMessage(previewName, previewId)}
            </div>
          </div>

          {/* BROADCAST ALERT NOTICE IF 'TODOS' SELECTED */}
          {selectedRecipientId === 'TODOS' && (
            <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 dark:text-amber-800 text-xs font-mono flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong>Modo Difusión Masiva:</strong> Al pulsar enviar, se abrirá la interfaz de WhatsApp para cada uno de los <strong>{destinatarios.length} usuarios registrados</strong> con su enlace personalizado de acceso directo.
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
