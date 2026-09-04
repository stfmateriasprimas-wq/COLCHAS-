import React, { useState, useEffect } from 'react';
import { 
  Mail, X, Send, Copy, Check, ExternalLink, AlertTriangle, 
  Clock, ShieldAlert, Sparkles, User, Users, CheckSquare, Square, 
  Search, ChevronDown, ChevronUp, CheckCircle2, Building2
} from 'lucide-react';
import { SolicitudColcha } from '../../types';
import { UsuarioSTF, USUARIOS_STF_MAESTROS } from '../../services/authService';
import { notificationService } from '../../services/notificationService';

interface EmailAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  solicitudes: SolicitudColcha[];
  currentUser?: UsuarioSTF | null;
  targetAreaName?: string;
  isBulk?: boolean;
  initialSelectedUserIds?: string[];
}

export const EmailAlertModal: React.FC<EmailAlertModalProps> = ({
  isOpen,
  onClose,
  solicitudes,
  currentUser,
  targetAreaName = 'CONSOLIDADO PLANTA',
  isBulk = false,
  initialSelectedUserIds
}) => {
  const [copied, setCopied] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [isRecipientSelectorOpen, setIsRecipientSelectorOpen] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState('');
  
  // Selected user IDs for recipients
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(() => {
    if (initialSelectedUserIds && initialSelectedUserIds.length > 0) {
      return initialSelectedUserIds;
    }
    // Default: If 1 OP, select the responsible user + supervisors
    if (!isBulk && solicitudes.length === 1) {
      const colcha = solicitudes[0];
      const inspectorClean = (colcha.inspector || '').toLowerCase().trim();
      const matched = USUARIOS_STF_MAESTROS.find(u => 
        u.nombre.toLowerCase().includes(inspectorClean) || 
        inspectorClean.includes(u.nombre.toLowerCase())
      );
      const defaults = ['ediaz'];
      if (matched) defaults.push(matched.id);
      if (colcha.estado === 'LAVANDERIA') {
        defaults.push('8888', '3333');
      } else if (colcha.estado === 'PRE_SOLICITUD') {
        defaults.push('2222', '1107529604');
      }
      return Array.from(new Set(defaults));
    }
    // Default for bulk: All users with email
    return USUARIOS_STF_MAESTROS.map(u => u.id);
  });

  // Re-sync if initialSelectedUserIds or solicitudes changes
  useEffect(() => {
    if (initialSelectedUserIds && initialSelectedUserIds.length > 0) {
      setSelectedUserIds(initialSelectedUserIds);
    }
  }, [initialSelectedUserIds]);

  if (!isOpen || solicitudes.length === 0) return null;

  // Selected recipient users list
  const selectedUsers = USUARIOS_STF_MAESTROS.filter(u => selectedUserIds.includes(u.id));
  const recipientEmails = selectedUsers.map(u => u.email).filter(Boolean);
  const toParam = recipientEmails.join(';');

  // Toggle user selection
  const handleToggleUser = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAllUsers = () => {
    setSelectedUserIds(USUARIOS_STF_MAESTROS.map(u => u.id));
  };

  const handleDeselectAllUsers = () => {
    setSelectedUserIds([]);
  };

  const handleSelectSupervisors = () => {
    const supIds = USUARIOS_STF_MAESTROS
      .filter(u => u.rol === 'ADMINISTRADOR' || u.rol === 'LAVANDERÍA' || u.area === 'CALIDAD ZF')
      .map(u => u.id);
    setSelectedUserIds(supIds);
  };

  // Filter users for directory search
  const filteredDirectory = USUARIOS_STF_MAESTROS.filter(u => {
    const q = recipientSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      u.nombre.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.rol.toLowerCase().includes(q) ||
      u.area.toLowerCase().includes(q)
    );
  });

  // Generate Subject
  const subject = isBulk || solicitudes.length > 1
    ? `🚨 [ALERTA SLA STF GROUP] Notificación Masiva: ${solicitudes.length} OPs con Retraso Crítico (>3 Días) en Planta`
    : `🚨 [ALERTA SLA STF GROUP] OP ${solicitudes[0].op} - Retraso Crítico (+${Math.max(0, solicitudes[0].diasHabiles - 3)} Días SLA) en ${solicitudes[0].areaActual}`;

  // Generate Plain Text Email Body
  const generateBodyText = (): string => {
    const header = `STF GROUP S.A. - SISTEMA DE CONTROL Y TRAZABILIDAD DE COLCHAS\n` +
      `CENTRAL AUTOMATIZADA DE ALERTAS DE RETRASO (SLA > 3 DÍAS HÁBILES)\n` +
      `Generado por: ${currentUser?.nombre || 'EDWIN - ADMINISTRADOR'} (${currentUser?.email || 'edwin.diaz@studiof.com.co'})\n` +
      `Fecha de Emisión: ${new Date().toLocaleString('es-CO')}\n` +
      `----------------------------------------------------------------------\n\n`;

    if (!isBulk && solicitudes.length === 1) {
      const item = solicitudes[0];
      const excesoSla = Math.max(0, item.diasHabiles - 3);
      return header +
        `Estimado(a) Responsable / Supervisor de Planta:\n\n` +
        `Se ha detectado una desviación crítica de SLA en la siguiente orden de producción:\n\n` +
        `• NÚMERO DE OP:       ${item.op}\n` +
        `• REFERENCIA:         ${item.referencia}\n` +
        `• TELA / MATERIAL:    ${item.tela}\n` +
        `• COLOR:              ${item.color.toUpperCase()}\n` +
        `• METROS / ROLLOS:    ${item.codigoMt} (${item.rollos} rollos)\n` +
        `• ÁREA ACTUAL:        ${item.areaActual}\n` +
        `• FECHA SOLICITUD:    ${item.fechaCreacion}\n` +
        `• DÍAS HÁBILES:       ${item.diasHabiles} Días (${item.horasEnProceso || item.diasHabiles * 12}h acumuladas)\n` +
        `• RETRASO SLA:        +${excesoSla} Días sobre el límite permitido (3 Días Máximo)\n` +
        `• RESPONSABLE:        ${item.inspector}\n\n` +
        `ACCIÓN REQUERIDA:\n` +
        `Por favor gestionar la priorización inmediata de esta muestra y reportar avance o dictamen en el sistema para regularizar el flujo.\n\n` +
        `Enlace directo al sistema de trazabilidad STF Group:\nhttps://docs.google.com/spreadsheets/d/1jTM8OG2u3bO9Cyrlyn3DJSnGcyLOzA8EWwxwOyWgXdc/edit\n\n` +
        `Atentamente,\n` +
        `${currentUser?.nombre || 'EDWIN'} — ADMINISTRADOR GENERAL\n` +
        `Control de Calidad & Trazabilidad STF Group S.A.`;
    }

    // Bulk body
    let body = header +
      `Estimado Equipo de Planta, Calidad y Lavandería STF:\n\n` +
      `Se remite el consolidado de ${solicitudes.length} órdenes de producción que superan el límite de 3 días hábiles en planta sin haber avanzado de etapa:\n\n` +
      `Área / Grupo: ${targetAreaName}\n` +
      `Total Órdenes en Retraso: ${solicitudes.length} OPs\n\n` +
      `RESUMEN DE ÓRDENES EN RETRASO:\n` +
      `======================================================================\n`;

    solicitudes.forEach((item, index) => {
      const excesoSla = Math.max(0, item.diasHabiles - 3);
      body += `${index + 1}. OP: ${item.op} | REF: ${item.referencia} | ÁREA: ${item.areaActual}\n` +
        `   Tela: ${item.tela} (${item.color}) | ${item.codigoMt}\n` +
        `   Fecha: ${item.fechaCreacion} | Días Hábiles: ${item.diasHabiles}d | Retraso: +${excesoSla} Días\n` +
        `   Responsable: ${item.inspector}\n` +
        `----------------------------------------------------------------------\n`;
    });

    body += `\nINSTRUCCIONES URGENTES:\n` +
      `1. Validar estado físico de los lotes en Lavandería, Atelier y Calidad.\n` +
      `2. Realizar el avance de etapa o dictamen en el Sistema de Control de Colchas STF.\n\n` +
      `Atentamente,\n` +
      `${currentUser?.nombre || 'EDWIN'} — ADMINISTRADOR GENERAL\n` +
      `STF Group S.A.`;

    return body;
  };

  const bodyText = generateBodyText();

  // Handlers
  const handleOpenGmail = () => {
    if (recipientEmails.length === 0) {
      alert('Por favor seleccione al menos un usuario destinatario.');
      return;
    }
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(toParam)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
    window.open(gmailUrl, '_blank', 'noopener,noreferrer');
    triggerSuccessFeedback();
  };

  const handleOpenDefaultMail = () => {
    if (recipientEmails.length === 0) {
      alert('Por favor seleccione al menos un usuario destinatario.');
      return;
    }
    const mailtoUrl = `mailto:${encodeURIComponent(toParam)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
    window.location.href = mailtoUrl;
    triggerSuccessFeedback();
  };

  const handleCopyBody = () => {
    navigator.clipboard.writeText(`ASUNTO: ${subject}\n\nDESTINATARIOS:\n${toParam}\n\n${bodyText}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const triggerSuccessFeedback = () => {
    setSentSuccess(true);
    notificationService.playAlertSound('EXITO');
    setTimeout(() => {
      setSentSuccess(false);
      onClose();
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200 select-none">
      <div className="bg-[#0b0f17] dark:bg-white border-2 border-emerald-500/80 rounded-[32px] max-w-2xl w-full max-h-[92vh] flex flex-col shadow-[0_25px_80px_rgba(16,185,129,0.35)] overflow-hidden text-white dark:text-zinc-950 font-sans">
        
        {/* MODAL HEADER */}
        <div className="p-5 sm:p-6 border-b border-zinc-800 dark:border-zinc-200 bg-gradient-to-r from-emerald-950/90 via-[#0d1612] to-[#0c0f17] dark:from-emerald-50 dark:via-zinc-50 dark:to-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 shrink-0">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white dark:text-zinc-950">
                  {isBulk || solicitudes.length > 1 ? 'Enviar Alerta Masiva de Retraso SLA' : `Enviar Alerta de Retraso — ${solicitudes[0].op}`}
                </h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-600 text-white shadow-xs">
                  {solicitudes.length} {solicitudes.length === 1 ? 'OP' : 'OPs'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-0.5">
                Automatización de correo en tiempo real vinculada a la pestaña USUARIOS de la base de datos
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white dark:text-zinc-500 dark:hover:text-zinc-950 p-2 rounded-2xl hover:bg-zinc-800 dark:hover:bg-zinc-200 transition cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="overflow-y-auto flex-1 custom-scroll p-5 sm:p-6 space-y-4">
          
          {/* Success Banner */}
          {sentSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/90 border border-emerald-500 text-emerald-300 text-xs flex items-center gap-2.5 animate-in zoom-in-95 font-medium">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>¡Alerta despachada exitosamente! Abriendo tu gestor de correo...</span>
            </div>
          )}

          {/* RECIPIENTS MANAGEMENT ACCORDION */}
          <div className="bg-zinc-900/80 dark:bg-zinc-100 border border-zinc-800 dark:border-zinc-200 rounded-2xl p-4 space-y-3">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono font-bold text-white dark:text-zinc-950">
                  DESTINATARIOS SELECCIONADOS ({selectedUserIds.length} de {USUARIOS_STF_MAESTROS.length})
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsRecipientSelectorOpen(!isRecipientSelectorOpen)}
                className="text-xs font-mono text-emerald-400 hover:text-emerald-300 dark:text-emerald-700 dark:hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer transition"
              >
                <span>{isRecipientSelectorOpen ? 'Ocultar Directorio' : 'Elegir Usuarios'}</span>
                {isRecipientSelectorOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Quick Pills of currently selected recipients */}
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scroll">
              {selectedUsers.length === 0 ? (
                <span className="text-xs text-rose-400 font-mono">
                  ⚠️ No has seleccionado ningún destinatario. Selecciona al menos uno.
                </span>
              ) : (
                selectedUsers.map((u) => (
                  <span
                    key={u.id}
                    className="px-2.5 py-1 rounded-xl bg-zinc-950 dark:bg-white text-zinc-200 dark:text-zinc-800 border border-zinc-800 dark:border-zinc-300 text-[10.5px] font-mono font-bold flex items-center gap-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>{u.nombre}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleUser(u.id)}
                      className="text-zinc-500 hover:text-rose-400 ml-0.5 cursor-pointer"
                      title="Quitar destinatario"
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* EXPANDED RECIPIENT DIRECTORY SELECTOR */}
            {isRecipientSelectorOpen && (
              <div className="pt-3 border-t border-zinc-800 dark:border-zinc-200 space-y-2.5 animate-in slide-in-from-top-2 duration-150">
                
                {/* Search & Quick Action Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={recipientSearch}
                      onChange={(e) => setRecipientSearch(e.target.value)}
                      placeholder="Buscar por nombre, cargo, área o correo..."
                      className="w-full bg-zinc-950 dark:bg-white border border-zinc-800 dark:border-zinc-300 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white dark:text-zinc-900 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                    />
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2" />
                  </div>

                  <div className="flex items-center gap-1 text-[10.5px] font-mono shrink-0">
                    <button
                      type="button"
                      onClick={handleSelectAllUsers}
                      className="px-2 py-1 bg-zinc-800 dark:bg-zinc-200 hover:bg-zinc-700 text-zinc-300 dark:text-zinc-800 rounded-lg font-bold transition cursor-pointer"
                    >
                      Todos ({USUARIOS_STF_MAESTROS.length})
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectSupervisors}
                      className="px-2 py-1 bg-emerald-950 dark:bg-emerald-100 text-emerald-300 dark:text-emerald-800 border border-emerald-500/40 rounded-lg font-bold transition cursor-pointer"
                    >
                      Supervisores
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAllUsers}
                      className="px-2 py-1 bg-zinc-800 dark:bg-zinc-200 hover:bg-zinc-700 text-zinc-400 dark:text-zinc-600 rounded-lg font-bold transition cursor-pointer"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>

                {/* Users List with Checkboxes */}
                <div className="max-h-48 overflow-y-auto custom-scroll divide-y divide-zinc-800/60 dark:divide-zinc-200/60 rounded-xl border border-zinc-800 dark:border-zinc-200 bg-zinc-950/70 dark:bg-white p-1">
                  {filteredDirectory.map((u) => {
                    const isChecked = selectedUserIds.includes(u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() => handleToggleUser(u.id)}
                        className={`p-2 rounded-lg flex items-center justify-between text-xs cursor-pointer transition ${
                          isChecked ? 'bg-emerald-950/40 dark:bg-emerald-50/70' : 'hover:bg-zinc-900 dark:hover:bg-zinc-100'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // handled by parent div
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-500"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-white dark:text-zinc-950 text-xs truncate">
                                {u.nombre}
                              </span>
                              <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-zinc-900 dark:bg-zinc-200 text-zinc-400 dark:text-zinc-700 font-mono">
                                {u.area}
                              </span>
                              {u.rol === 'ADMINISTRADOR' && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-500/40 font-mono font-bold">
                                  ADMIN
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-zinc-500 font-mono truncate block">
                              {u.email}
                            </span>
                          </div>
                        </div>

                        <span className={`text-[10px] font-mono font-bold ${
                          isChecked ? 'text-emerald-400 dark:text-emerald-600' : 'text-zinc-600'
                        }`}>
                          {isChecked ? 'SELECCIONADO' : 'AGREGAR'}
                        </span>
                      </div>
                    );
                  })}
                </div>

              </div>
            )}

          </div>

          {/* SUBJECT FIELD */}
          <div>
            <label className="block text-[11px] font-mono uppercase font-bold text-zinc-400 dark:text-zinc-600 mb-1 tracking-wider">
              ASUNTO DEL MENSAJE
            </label>
            <div className="bg-zinc-900/90 dark:bg-zinc-100 border border-zinc-800 dark:border-zinc-200 rounded-2xl px-4 py-3 text-xs font-mono font-bold text-emerald-400 dark:text-emerald-700 select-all">
              {subject}
            </div>
          </div>

          {/* MESSAGE PREVIEW */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-mono uppercase font-bold text-zinc-400 dark:text-zinc-600 tracking-wider">
                CONTENIDO PREFORMATIADO DE LA ALERTA
              </label>
              <button
                type="button"
                onClick={handleCopyBody}
                className="text-[11px] text-amber-400 hover:text-amber-300 dark:text-amber-600 dark:hover:text-amber-700 font-bold flex items-center gap-1 cursor-pointer transition font-mono"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado al Portapapeles' : 'Copiar Texto'}</span>
              </button>
            </div>

            <textarea
              readOnly
              value={bodyText}
              rows={7}
              className="w-full bg-zinc-950 dark:bg-zinc-50 border border-zinc-800 dark:border-zinc-200 rounded-2xl p-4 text-xs font-mono text-zinc-300 dark:text-zinc-800 focus:outline-none custom-scroll resize-none leading-relaxed"
            />
          </div>

        </div>

        {/* MODAL FOOTER WITH DISPATCH BUTTONS */}
        <div className="p-4 sm:p-5 border-t border-zinc-800 dark:border-zinc-200 bg-zinc-900/90 dark:bg-zinc-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 rounded-2xl border border-zinc-700 dark:border-zinc-300 bg-zinc-800 dark:bg-zinc-200 hover:bg-zinc-700 dark:hover:bg-zinc-300 text-zinc-300 dark:text-zinc-800 text-xs font-bold uppercase tracking-wider transition cursor-pointer text-center"
          >
            CANCELAR
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleOpenDefaultMail}
              className="flex-1 sm:flex-initial px-4 py-3 rounded-2xl border border-zinc-700 dark:border-zinc-300 bg-zinc-950 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 text-zinc-200 dark:text-zinc-900 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
              title="Abrir con Outlook u otra app de correo corporativo"
            >
              <ExternalLink className="w-4 h-4 text-zinc-400" />
              <span>Cliente Outlook/App</span>
            </button>

            <button
              type="button"
              onClick={handleOpenGmail}
              className="flex-1 sm:flex-initial px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-98 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-500/30"
            >
              <Send className="w-4 h-4" />
              <span>ENVIAR POR GMAIL</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
