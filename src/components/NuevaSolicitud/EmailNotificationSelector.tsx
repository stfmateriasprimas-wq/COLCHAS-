import React, { useState, useMemo } from 'react';
import { 
  Mail, CheckSquare, Square, Users, Search, ChevronDown, ChevronUp, 
  Send, CheckCircle2, ShieldCheck, Sparkles, Building2, Droplets, Scissors, Briefcase,
  AtSign, Zap, Check, CheckCheck
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
  const [isOpen, setIsOpen] = useState(true); // Abierto por defecto para máxima visibilidad
  const [searchQuery, setSearchQuery] = useState('');
  const [justSentSuccess, setJustSentSuccess] = useState(false);
  const [activeAreaFilter, setActiveAreaFilter] = useState<string | null>('ALL');

  // Directorio maestro sin correos duplicados
  const allUsers: UsuarioSTF[] = useMemo(() => {
    const list = getUsuariosList();
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

  // Conteos por área
  const countCalidad = useMemo(() => allUsers.filter(isCalidadUser).length, [allUsers]);
  const countLavanderia = useMemo(() => allUsers.filter(isLavanderiaUser).length, [allUsers]);
  const countZF = useMemo(() => allUsers.filter(isUserFromZonaFranca).length, [allUsers]);
  const countColecciones = useMemo(() => allUsers.filter(u => u.area === 'COLECCIONES' || u.rol.includes('CLIENTE')).length, [allUsers]);
  const countAdmin = useMemo(() => allUsers.filter(isAdminUser).length, [allUsers]);

  // Manejadores de selección masiva
  const handleSelectAll = () => {
    onChangeSelectedEmails(allEmails);
    setActiveAreaFilter('ALL');
    notificationService.playAlertSound('NOTIFICACION');
  };

  const handleDeselectAll = () => {
    onChangeSelectedEmails([]);
    setActiveAreaFilter(null);
  };

  const handleSelectByFilter = (areaKey: string, filterFn: (u: UsuarioSTF) => boolean) => {
    const targetEmails = allUsers
      .filter(filterFn)
      .map(u => u.email.toLowerCase().trim());
    
    const allAreaSelected = targetEmails.every(e => selectedEmails.includes(e));
    if (allAreaSelected) {
      onChangeSelectedEmails(selectedEmails.filter(e => !targetEmails.includes(e)));
      setActiveAreaFilter(null);
    } else {
      const merged = Array.from(new Set([...selectedEmails, ...targetEmails]));
      onChangeSelectedEmails(merged);
      setActiveAreaFilter(areaKey);
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

  // Filtrado de usuarios por búsqueda
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
      console.error("Error al enviar correo:", e);
    }
  };

  const isAllSelected = allEmails.length > 0 && selectedEmails.length === allEmails.length;

  // Helper para asignar degradados y colores de acuerdo al área
  const getAreaMeta = (user: UsuarioSTF) => {
    if (isAdminUser(user)) {
      return {
        bg: 'from-amber-500 to-yellow-600',
        badgeBg: 'bg-amber-500/20 text-amber-400 dark:text-amber-700 border-amber-500/40',
        borderSelected: 'border-amber-500 bg-amber-500/10 dark:bg-amber-50',
        label: 'ADMINISTRACIÓN'
      };
    }
    if (isUserFromZonaFranca(user)) {
      return {
        bg: 'from-purple-500 to-indigo-600',
        badgeBg: 'bg-purple-500/20 text-purple-300 dark:text-purple-700 border-purple-500/40',
        borderSelected: 'border-purple-500 bg-purple-500/10 dark:bg-purple-50',
        label: 'ZONA FRANCA'
      };
    }
    if (isLavanderiaUser(user)) {
      return {
        bg: 'from-sky-500 to-blue-600',
        badgeBg: 'bg-sky-500/20 text-sky-300 dark:text-sky-700 border-sky-500/40',
        borderSelected: 'border-sky-500 bg-sky-500/10 dark:bg-sky-50',
        label: 'LAVANDERÍA'
      };
    }
    if (isCalidadUser(user)) {
      return {
        bg: 'from-emerald-500 to-teal-600',
        badgeBg: 'bg-emerald-500/20 text-emerald-400 dark:text-emerald-700 border-emerald-500/40',
        borderSelected: 'border-emerald-500 bg-emerald-500/10 dark:bg-emerald-50',
        label: 'CALIDAD'
      };
    }
    return {
      bg: 'from-pink-500 to-rose-600',
      badgeBg: 'bg-pink-500/20 text-pink-300 dark:text-pink-700 border-pink-500/40',
      borderSelected: 'border-pink-500 bg-pink-500/10 dark:bg-pink-50',
      label: 'COLECCIONES'
    };
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[#0c1017] via-[#101726] to-[#0c1017] dark:bg-white border-2 border-zinc-800 dark:border-zinc-200 hover:border-amber-500/60 rounded-3xl p-5 sm:p-7 space-y-5 transition-all duration-200 shadow-2xl text-white dark:text-zinc-950">
      
      {/* Decorative Cyber Background Glow */}
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* 1. TOP HEADER BAR WITH GLOWING BADGE & ACTION BUTTONS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-800 dark:border-zinc-200 pb-4 relative z-10">
        
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 via-rose-500/20 to-purple-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/10">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black tracking-wider uppercase text-white dark:text-zinc-950 font-mono flex items-center gap-2">
                <span>NOTIFICACIÓN Y DISTRIBUCIÓN POR CORREO</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-mono font-black bg-emerald-500/20 text-emerald-400 dark:text-emerald-700 border border-emerald-500/40 uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1"></span>
                  EN VIVO
                </span>
              </h3>
            </div>
            <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-0.5">
              Plantilla corporativa oficial <strong>STF Group S.A.</strong> enviada a los colaboradores seleccionados con ficha técnica y fotografía.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {onSendManualEmail && (
            <button
              type="button"
              onClick={handleManualSendClick}
              disabled={isSendingEmail || selectedEmails.length === 0}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-red-600 hover:from-rose-500 hover:to-red-500 active:scale-95 disabled:opacity-50 text-white font-mono font-black text-xs uppercase flex items-center gap-2 transition cursor-pointer shadow-lg shadow-rose-600/30"
              title="Disparar plantilla de ficha técnica a los destinatarios seleccionados inmediatamente"
            >
              <Send className={`w-4 h-4 ${isSendingEmail ? 'animate-bounce' : ''}`} />
              <span>{isSendingEmail ? 'ENVIANDO...' : 'ENVIAR CORREO AHORA'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="px-3.5 py-2.5 rounded-2xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 border border-zinc-700 dark:border-zinc-300 text-xs font-mono font-bold text-zinc-300 dark:text-zinc-800 flex items-center gap-2 transition cursor-pointer shrink-0"
          >
            <span>{isOpen ? 'Ocultar Directorio' : 'Desplegar Directorio'}</span>
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

      </div>

      {/* 2. SUCCESS NOTIFICATION */}
      {justSentSuccess && (
        <div className="p-3.5 bg-emerald-950/90 border border-emerald-500 text-emerald-300 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 animate-in zoom-in-95 shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>¡Plantilla oficial STF Group emitida exitosamente a {selectedEmails.length} destinatario(s)!</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 uppercase font-black">ENTREGADO</span>
        </div>
      )}

      {/* 3. AUTO-SEND TOGGLE & SUMMARY BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-zinc-950/80 dark:bg-zinc-100 border border-zinc-800/80 dark:border-zinc-200">
        <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs text-zinc-300 dark:text-zinc-700 font-bold">
          <input
            type="checkbox"
            checked={autoSendOnSubmit}
            onChange={(e) => onChangeAutoSend(e.target.checked)}
            className="w-4 h-4 rounded border-zinc-700 text-emerald-500 focus:ring-emerald-400 accent-emerald-500 cursor-pointer"
          />
          <span>⚡ Enviar automáticamente esta ficha técnica por correo al hacer clic en <strong>Registrar</strong></span>
        </label>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-mono font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 dark:text-amber-700 border border-amber-500/40">
            {selectedEmails.length} de {allEmails.length} DESTINATARIOS
          </span>
        </div>
      </div>

      {/* 4. EXPANDABLE INNOVATIVE DIRECTORY */}
      {isOpen && (
        <div className="space-y-4 pt-1 animate-in fade-in duration-200">
          
          {/* Quick Filter Modern Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono font-black text-zinc-400 dark:text-zinc-500 uppercase mr-1">
              FILTRAR Y SELECCIONAR POR ÁREA:
            </span>

            {/* Todos */}
            <button
              type="button"
              onClick={handleSelectAll}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-black transition cursor-pointer border flex items-center gap-1.5 shadow-sm active:scale-95 ${
                isAllSelected 
                  ? 'bg-amber-500 text-black border-amber-400 shadow-amber-500/30 font-black' 
                  : 'bg-zinc-900 dark:bg-zinc-100 text-zinc-300 dark:text-zinc-800 border-zinc-700 dark:border-zinc-300 hover:border-amber-500'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>TODOS ({allEmails.length})</span>
            </button>

            {/* Calidad */}
            <button
              type="button"
              onClick={() => handleSelectByFilter('CALIDAD', isCalidadUser)}
              className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-emerald-950/60 dark:bg-emerald-100 hover:bg-emerald-900 text-emerald-300 dark:text-emerald-800 border border-emerald-600/40 dark:border-emerald-300 transition cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-sm"
            >
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>CALIDAD ({countCalidad})</span>
            </button>

            {/* Lavandería */}
            <button
              type="button"
              onClick={() => handleSelectByFilter('LAVANDERIA', isLavanderiaUser)}
              className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-sky-950/60 dark:bg-sky-100 hover:bg-sky-900 text-sky-300 dark:text-sky-800 border border-sky-600/40 dark:border-sky-300 transition cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-sm"
            >
              <Droplets className="w-3.5 h-3.5 text-sky-400" />
              <span>LAVANDERÍA ({countLavanderia})</span>
            </button>

            {/* Zona Franca / Atelier */}
            <button
              type="button"
              onClick={() => handleSelectByFilter('ZF', isUserFromZonaFranca)}
              className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-purple-950/60 dark:bg-purple-100 hover:bg-purple-900 text-purple-300 dark:text-purple-800 border border-purple-600/40 dark:border-purple-300 transition cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-sm"
            >
              <Scissors className="w-3.5 h-3.5 text-purple-400" />
              <span>ZONA FRANCA ({countZF})</span>
            </button>

            {/* Colecciones / Clientes */}
            <button
              type="button"
              onClick={() => handleSelectByFilter('COLECCIONES', u => u.area === 'COLECCIONES' || u.rol.includes('CLIENTE'))}
              className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-pink-950/60 dark:bg-pink-100 hover:bg-pink-900 text-pink-300 dark:text-pink-800 border border-pink-600/40 dark:border-pink-300 transition cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-sm"
            >
              <Briefcase className="w-3.5 h-3.5 text-pink-400" />
              <span>COLECCIONES ({countColecciones})</span>
            </button>

            {/* Admin Edwin */}
            <button
              type="button"
              onClick={() => handleSelectByFilter('ADMIN', isAdminUser)}
              className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-amber-950/60 dark:bg-amber-100 hover:bg-amber-900 text-amber-300 dark:text-amber-800 border border-amber-600/40 dark:border-amber-300 transition cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-sm"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>ADMIN EDWIN ({countAdmin})</span>
            </button>

            {/* Deseleccionar */}
            <button
              type="button"
              onClick={handleDeselectAll}
              className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-zinc-900 dark:bg-zinc-200 text-zinc-400 dark:text-zinc-600 border border-zinc-800 dark:border-zinc-300 hover:bg-zinc-800 hover:text-white transition cursor-pointer active:scale-95"
            >
              ✕ LIMPIAR
            </button>
          </div>

          {/* Search bar inside directory */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar colaborador por nombre, correo electrónico, rol o área..."
              className="w-full bg-zinc-950 dark:bg-zinc-50 border border-zinc-800 dark:border-zinc-300 hover:border-zinc-700 focus:border-amber-500 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white dark:text-zinc-950 font-mono placeholder-zinc-500 focus:outline-none transition shadow-inner"
            />
          </div>

          {/* 5. MULTI-COLUMN RESPONSIVE GRID OF USERS */}
          <div className="max-h-72 overflow-y-auto pr-1.5 custom-scrollbar border border-zinc-800/80 dark:border-zinc-200 rounded-2xl p-3 bg-zinc-950/60 dark:bg-zinc-50">
            {filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500 font-mono">
                No se encontraron colaboradores para la búsqueda "{searchQuery}".
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                {filteredUsers.map((user) => {
                  const lowerEmail = user.email.toLowerCase().trim();
                  const isSelected = selectedEmails.includes(lowerEmail);
                  const meta = getAreaMeta(user);

                  // Iniciales para el avatar
                  const initials = user.nombre
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map(n => n[0])
                    .join('')
                    .toUpperCase() || 'STF';

                  return (
                    <div
                      key={user.id + user.email}
                      onClick={() => toggleSingleEmail(user.email)}
                      className={`p-3 rounded-2xl border transition-all duration-150 cursor-pointer flex items-center justify-between gap-3 select-none hover:scale-[1.01] ${
                        isSelected 
                          ? `${meta.borderSelected} shadow-md` 
                          : 'bg-zinc-900/60 dark:bg-white border-zinc-800/80 dark:border-zinc-200 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Avatar con Iniciales */}
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${meta.bg} text-white font-mono font-black text-xs flex items-center justify-center shrink-0 shadow-md`}>
                          {initials}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-black text-white dark:text-zinc-950 truncate">
                              {user.nombre}
                            </span>
                            <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded-md font-black uppercase border ${meta.badgeBg}`}>
                              {meta.label}
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-400 dark:text-zinc-600 font-mono truncate mt-0.5">
                            {user.email}
                          </p>
                        </div>
                      </div>

                      {/* Check indicator */}
                      <div className="shrink-0 pl-1">
                        <div className={`w-6 h-6 rounded-xl flex items-center justify-center transition-all ${
                          isSelected 
                            ? 'bg-amber-500 text-black shadow-md shadow-amber-500/30 scale-105' 
                            : 'border-2 border-zinc-700 text-transparent hover:border-zinc-500'
                        }`}>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};
