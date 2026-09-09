import React, { useState, useMemo } from 'react';
import { 
  Mail, CheckSquare, Square, Users, Search, ChevronDown, ChevronUp, 
  Send, CheckCircle2, ShieldCheck, Sparkles, Building2, Droplets, Scissors, Briefcase
} from 'lucide-react';
import { UsuarioSTF, getUsuariosList, isCalidadUser, isLavanderiaUser, isUserFromZonaFranca, isAdminUser } from '../../services/authService';
import { notificationService } from '../../services/notificationService';

interface EmailNotificationSelectorProps {
  selectedEmails: string[];
  onChangeSelectedEmails: (emails: string[]) => void;
  autoSendOnSubmit: boolean;
  onChangeAutoSend: (enabled: boolean) => void;
  onSendManualEmail?: () => Promise<void>;
  isSendingEmail?: boolean;
}

export const EmailNotificationSelector: React.FC<EmailNotificationSelectorProps> = ({
  selectedEmails,
  onChangeSelectedEmails,
  autoSendOnSubmit,
  onChangeAutoSend,
  onSendManualEmail,
  isSendingEmail = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [justSentSuccess, setJustSentSuccess] = useState(false);

  // Obtener lista completa de usuarios oficiales desde la base de datos
  const allUsers: UsuarioSTF[] = useMemo(() => {
    const list = getUsuariosList();
    // Filtrar duplicados por email
    const seen = new Set<string>();
    return list.filter(u => {
      if (!u.email || !u.email.includes('@')) return false;
      const lower = u.email.toLowerCase().trim();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    });
  }, []);

  const allEmails = useMemo(() => allUsers.map(u => u.email.toLowerCase().trim()), [allUsers]);

  // Manejadores de selección rápida
  const handleSelectAll = () => {
    onChangeSelectedEmails(allEmails);
    notificationService.playAlertSound('NOTIFICACION');
  };

  const handleDeselectAll = () => {
    onChangeSelectedEmails([]);
  };

  const handleSelectByFilter = (filterFn: (u: UsuarioSTF) => boolean) => {
    const targetEmails = allUsers
      .filter(filterFn)
      .map(u => u.email.toLowerCase().trim());
    
    // Si todos los del área ya están seleccionados, los removemos; si no, los agregamos
    const allAreaSelected = targetEmails.every(e => selectedEmails.includes(e));
    if (allAreaSelected) {
      onChangeSelectedEmails(selectedEmails.filter(e => !targetEmails.includes(e)));
    } else {
      const merged = Array.from(new Set([...selectedEmails, ...targetEmails]));
      onChangeSelectedEmails(merged);
    }
    notificationService.playAlertSound('NOTIFICACION');
  };

  const toggleSingleEmail = (email: string) => {
    const lower = email.toLowerCase().trim();
    if (selectedEmails.includes(lower)) {
      onChangeSelectedEmails(selectedEmails.filter(e => e !== lower));
    } else {
      onChangeSelectedEmails([...selectedEmails, lower]);
    }
  };

  // Filtrar usuarios en el buscador
  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return allUsers;
    return allUsers.filter(u => 
      u.nombre.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.area.toLowerCase().includes(q) ||
      u.rol.toLowerCase().includes(q)
    );
  }, [allUsers, searchQuery]);

  const handleManualSendClick = async () => {
    if (!onSendManualEmail) return;
    if (selectedEmails.length === 0) {
      alert("Por favor selecciona al menos un correo destinatario.");
      return;
    }
    try {
      await onSendManualEmail();
      setJustSentSuccess(true);
      notificationService.playAlertSound('EXITO');
      setTimeout(() => setJustSentSuccess(false), 4000);
    } catch (e) {
      console.error("Error al enviar correo manual:", e);
    }
  };

  const isAllSelected = allEmails.length > 0 && selectedEmails.length === allEmails.length;

  return (
    <div className="bg-zinc-950/70 dark:bg-zinc-50 border border-zinc-800 dark:border-zinc-200 rounded-2xl p-4 sm:p-5 space-y-3.5 transition-all shadow-md">
      
      {/* 1. Header Bar with Summary and Dropdown Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs font-black uppercase tracking-wider text-white dark:text-zinc-950 font-mono">
                SELECCIONAR CORREOS DE NOTIFICACIÓN
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-amber-500/20 text-amber-400 dark:text-amber-700 border border-amber-500/40">
                {selectedEmails.length} de {allEmails.length} SELECCIONADOS
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-600 mt-0.5">
              Envío de plantilla corporativa oficial STF Group con ficha técnica y foto de la OP.
            </p>
          </div>
        </div>

        {/* Header Action Buttons: Toggle dropdown + Manual Send */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {onSendManualEmail && (
            <button
              type="button"
              onClick={handleManualSendClick}
              disabled={isSendingEmail || selectedEmails.length === 0}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-700 to-pink-700 hover:from-rose-600 hover:to-pink-600 active:scale-95 disabled:opacity-50 text-white text-xs font-mono font-black flex items-center gap-1.5 transition cursor-pointer shadow-md"
              title="Enviar ficha técnica por correo a los destinatarios seleccionados ahora"
            >
              <Send className={`w-3.5 h-3.5 ${isSendingEmail ? 'animate-pulse' : ''}`} />
              <span>{isSendingEmail ? 'Enviando...' : 'Enviar Correo'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-200 hover:bg-zinc-800 dark:hover:bg-zinc-300 border border-zinc-700 dark:border-zinc-300 text-xs font-bold text-zinc-200 dark:text-zinc-800 flex items-center gap-1.5 transition cursor-pointer"
          >
            <span>{isOpen ? 'Ocultar Lista' : 'Desplegar Correos'}</span>
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. Success message if sent manually */}
      {justSentSuccess && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2 animate-in zoom-in-95">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>¡Plantilla STF Group enviada con éxito a {selectedEmails.length} destinatario(s)!</span>
        </div>
      )}

      {/* 3. Auto-send on create checkbox */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-zinc-300 dark:text-zinc-700 font-medium">
          <input
            type="checkbox"
            checked={autoSendOnSubmit}
            onChange={(e) => onChangeAutoSend(e.target.checked)}
            className="w-4 h-4 rounded border-zinc-700 text-emerald-500 focus:ring-emerald-400 accent-emerald-500 cursor-pointer"
          />
          <span>Enviar notificación automática por correo al presionar <strong>Registrar</strong></span>
        </label>
        {selectedEmails.length > 0 && !isOpen && (
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
            Destinatarios: {selectedEmails.slice(0, 2).join(', ')}{selectedEmails.length > 2 ? ` (+${selectedEmails.length - 2} más)` : ''}
          </span>
        )}
      </div>

      {/* 4. EXPANDABLE DROPDOWN PANEL */}
      {isOpen && (
        <div className="pt-3 border-t border-zinc-800 dark:border-zinc-200 space-y-3 animate-in fade-in duration-150">
          
          {/* Quick Filter Buttons: Todos, Ninguno, y por Áreas */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono font-bold text-zinc-400 dark:text-zinc-500 uppercase mr-1">
              Filtros Rápidos:
            </span>

            {/* Todos */}
            <button
              type="button"
              onClick={handleSelectAll}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-black transition cursor-pointer border ${
                isAllSelected 
                  ? 'bg-amber-500 text-black border-amber-400' 
                  : 'bg-zinc-900 dark:bg-zinc-200 text-zinc-300 dark:text-zinc-800 border-zinc-700 dark:border-zinc-300 hover:bg-zinc-800'
              }`}
            >
              ✓ Todos ({allEmails.length})
            </button>

            {/* Ninguno */}
            <button
              type="button"
              onClick={handleDeselectAll}
              className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-zinc-900 dark:bg-zinc-200 text-zinc-400 dark:text-zinc-600 border border-zinc-700 dark:border-zinc-300 hover:bg-zinc-800 transition cursor-pointer"
            >
              ✕ Deseleccionar
            </button>

            {/* Calidad */}
            <button
              type="button"
              onClick={() => handleSelectByFilter(isCalidadUser)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-emerald-950/60 dark:bg-emerald-100 text-emerald-300 dark:text-emerald-800 border border-emerald-600/40 dark:border-emerald-300 hover:bg-emerald-900/60 transition cursor-pointer flex items-center gap-1"
            >
              <Building2 className="w-3 h-3" />
              <span>Calidad</span>
            </button>

            {/* Lavandería */}
            <button
              type="button"
              onClick={() => handleSelectByFilter(isLavanderiaUser)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-sky-950/60 dark:bg-sky-100 text-sky-300 dark:text-sky-800 border border-sky-600/40 dark:border-sky-300 hover:bg-sky-900/60 transition cursor-pointer flex items-center gap-1"
            >
              <Droplets className="w-3 h-3" />
              <span>Lavandería</span>
            </button>

            {/* Zona Franca / Atelier */}
            <button
              type="button"
              onClick={() => handleSelectByFilter(isUserFromZonaFranca)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-purple-950/60 dark:bg-purple-100 text-purple-300 dark:text-purple-800 border border-purple-600/40 dark:border-purple-300 hover:bg-purple-900/60 transition cursor-pointer flex items-center gap-1"
            >
              <Scissors className="w-3 h-3" />
              <span>Zona Franca</span>
            </button>

            {/* Colecciones / Clientes */}
            <button
              type="button"
              onClick={() => handleSelectByFilter(u => u.area === 'COLECCIONES' || u.rol.includes('CLIENTE'))}
              className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-pink-950/60 dark:bg-pink-100 text-pink-300 dark:text-pink-800 border border-pink-600/40 dark:border-pink-300 hover:bg-pink-900/60 transition cursor-pointer flex items-center gap-1"
            >
              <Briefcase className="w-3 h-3" />
              <span>Colecciones</span>
            </button>

            {/* Admin */}
            <button
              type="button"
              onClick={() => handleSelectByFilter(isAdminUser)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-amber-950/60 dark:bg-amber-100 text-amber-300 dark:text-amber-800 border border-amber-600/40 dark:border-amber-300 hover:bg-amber-900/60 transition cursor-pointer flex items-center gap-1"
            >
              <ShieldCheck className="w-3 h-3" />
              <span>Admin (Edwin)</span>
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, correo, área o rol..."
              className="w-full bg-zinc-900 dark:bg-zinc-100 border border-zinc-700 dark:border-zinc-300 rounded-xl pl-9 pr-3 py-2 text-xs text-white dark:text-zinc-950 font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Users Checklist Container */}
          <div className="max-h-56 overflow-y-auto pr-1 space-y-1.5 custom-scrollbar border border-zinc-800/80 dark:border-zinc-200 rounded-xl p-2 bg-zinc-900/40 dark:bg-white">
            {filteredUsers.length === 0 ? (
              <p className="p-4 text-center text-xs text-zinc-500 font-mono">
                No se encontraron usuarios para "{searchQuery}".
              </p>
            ) : (
              filteredUsers.map((user) => {
                const lowerEmail = user.email.toLowerCase().trim();
                const isSelected = selectedEmails.includes(lowerEmail);

                return (
                  <div
                    key={user.id + user.email}
                    onClick={() => toggleSingleEmail(user.email)}
                    className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 select-none ${
                      isSelected 
                        ? 'bg-amber-500/10 border-amber-500/50 dark:bg-amber-50 dark:border-amber-400' 
                        : 'bg-zinc-950/60 dark:bg-zinc-50 border-zinc-800/60 dark:border-zinc-200 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="shrink-0 text-amber-400">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                        ) : (
                          <Square className="w-4 h-4 text-zinc-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-white dark:text-zinc-950 truncate">
                            {user.nombre}
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 dark:bg-zinc-200 text-zinc-300 dark:text-zinc-700 font-bold uppercase">
                            {user.area}
                          </span>
                          {user.isZonaFranca && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-300 border border-purple-700">
                              ZF
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-600 font-mono truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono text-zinc-500 uppercase shrink-0 hidden sm:inline">
                      {user.rol}
                    </span>
                  </div>
                );
              })
            )}
          </div>

        </div>
      )}

    </div>
  );
};
