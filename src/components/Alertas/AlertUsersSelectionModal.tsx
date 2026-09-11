import React, { useState, useEffect } from 'react';
import { 
  Users, Mail, Check, X, Search, CheckSquare, Square, 
  Send, AlertTriangle, ShieldCheck, UserCheck, Plus, Sparkles
} from 'lucide-react';
import { SolicitudColcha } from '../../types';
import { UsuarioSTF, getUsuariosList, subscribeUsuariosList, syncUsuariosFromSheets } from '../../services/authService';

interface AlertUsersSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAlerts: SolicitudColcha[];
  selectedOps: SolicitudColcha[];
  currentUser?: UsuarioSTF | null;
  onAlertSent: (recipients: string[], sentOps: SolicitudColcha[]) => void;
}

export const AlertUsersSelectionModal: React.FC<AlertUsersSelectionModalProps> = ({
  isOpen,
  onClose,
  totalAlerts,
  selectedOps,
  currentUser,
  onAlertSent
}) => {
  const [usuarios, setUsuarios] = useState<UsuarioSTF[]>(getUsuariosList);

  // Recipient user IDs selected (defaults to all or key managers)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(() => {
    return getUsuariosList().map(u => u.id);
  });

  // Custom additional emails
  const [customEmail, setCustomEmail] = useState('');
  const [customEmailList, setCustomEmailList] = useState<string[]>([]);

  // Send scope: 'SELECTED' | 'TOTAL'
  const [sendScope, setSendScope] = useState<'SELECTED' | 'TOTAL'>(() => {
    return selectedOps.length > 0 ? 'SELECTED' : 'TOTAL';
  });

  // Search filter for users
  const [userSearch, setUserSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState<string>('TODAS');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const unsub = subscribeUsuariosList((latest) => {
      setUsuarios(latest);
    });
    if (isOpen) {
      syncUsuariosFromSheets();
    }
    return unsub;
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter users
  const filteredUsers = usuarios.filter(u => {
    if (areaFilter !== 'TODAS' && u.area !== areaFilter) return false;
    const q = userSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      u.nombre.toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      u.area.toLowerCase().includes(q) ||
      u.rol.toLowerCase().includes(q) ||
      (u.telefono && u.telefono.toLowerCase().includes(q))
    );
  });

  // Toggle user selection
  const handleToggleUser = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  // Select all / none
  const handleSelectAll = () => {
    setSelectedUserIds(usuarios.map(u => u.id));
  };

  const handleDeselectAll = () => {
    setSelectedUserIds([]);
  };

  // Add custom email
  const handleAddCustomEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customEmail.trim().toLowerCase();
    if (clean && clean.includes('@') && !customEmailList.includes(clean)) {
      setCustomEmailList(prev => [...prev, clean]);
      setCustomEmail('');
    }
  };

  const handleRemoveCustomEmail = (email: string) => {
    setCustomEmailList(prev => prev.filter(e => e !== email));
  };

  // Get active list of OPs to send
  const opsToSend = (sendScope === 'SELECTED' && selectedOps.length > 0) ? selectedOps : totalAlerts;

  // Gather all recipient emails
  const getSelectedEmails = (): string[] => {
    const userEmails = usuarios
      .filter(u => selectedUserIds.includes(u.id))
      .map(u => u.email)
      .filter(Boolean);
    return Array.from(new Set([...userEmails, ...customEmailList]));
  };

  const handleExecuteSend = async () => {
    const recipientEmails = getSelectedEmails();
    if (recipientEmails.length === 0) {
      alert('Por favor selecciona al menos un usuario o ingresa un correo destinatario.');
      return;
    }
    if (opsToSend.length === 0) {
      alert('No hay órdenes de producción seleccionadas para enviar.');
      return;
    }

    setIsSending(true);
    try {
      await onAlertSent(recipientEmails, opsToSend);
      onClose();
    } catch (err) {
      console.error('Error enviando alerta por correo:', err);
    } finally {
      setIsSending(false);
    }
  };

  const recipientCount = getSelectedEmails().length;

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in select-none overflow-y-auto">
      <div className="bg-[#0c080a] dark:bg-white border-2 border-rose-600/80 rounded-3xl max-w-3xl w-full p-6 sm:p-7 shadow-2xl space-y-6 text-white dark:text-zinc-950 animate-in zoom-in-95 my-auto max-h-[92vh] flex flex-col">
        
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-rose-950/80 dark:border-zinc-200 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-rose-500/20 border-2 border-rose-500/40 flex items-center justify-center text-rose-500 shrink-0 shadow-md">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black uppercase font-mono text-white dark:text-zinc-950">
                  SELECCIONAR DESTINATARIOS DE ALERTA
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-black bg-rose-600 text-white uppercase">
                  USUARIOS ({usuarios.length})
                </span>
              </div>
              <p className="text-xs text-zinc-400 dark:text-zinc-600 font-sans">
                Elige los usuarios y correos que recibirán el informe oficial de OPs con retraso
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-zinc-400 dark:text-zinc-600 hover:text-white dark:hover:text-black flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-5 pr-1">

          {/* 1. SELECCIÓN DEL ALCANCE DE OPs (SELECCIONADAS VS TOTAL) */}
          <div className="p-4 rounded-2xl bg-zinc-900/90 dark:bg-zinc-100 border border-zinc-800 dark:border-zinc-200 space-y-2.5">
            <span className="text-[10px] font-mono font-black uppercase text-zinc-400 dark:text-zinc-600 block">
              ¿QUÉ ÓRDENES DESEAS ENVIAR EN EL REPORTE?
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option A: OPs Seleccionadas */}
              <div
                onClick={() => {
                  if (selectedOps.length > 0) setSendScope('SELECTED');
                }}
                className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex items-center justify-between ${
                  sendScope === 'SELECTED'
                    ? 'border-rose-500 bg-rose-500/10 text-white dark:text-zinc-950 shadow-md'
                    : selectedOps.length === 0
                      ? 'opacity-40 cursor-not-allowed border-zinc-800 dark:border-zinc-300'
                      : 'border-zinc-800 dark:border-zinc-300 hover:border-zinc-700 bg-zinc-950/50 dark:bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs font-mono">OPs Seleccionadas en Tabla</span>
                    {sendScope === 'SELECTED' && <Check className="w-3.5 h-3.5 text-rose-400" />}
                  </div>
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                    {selectedOps.length > 0 ? `${selectedOps.length} orden(es) marcadas manualmente` : 'Ninguna OP seleccionada'}
                  </span>
                </div>
                <span className="text-base font-black font-mono text-rose-400 dark:text-rose-600 px-2.5 py-1 rounded-lg bg-zinc-900 dark:bg-zinc-100">
                  {selectedOps.length}
                </span>
              </div>

              {/* Option B: Total OPs */}
              <div
                onClick={() => setSendScope('TOTAL')}
                className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex items-center justify-between ${
                  sendScope === 'TOTAL'
                    ? 'border-rose-500 bg-rose-500/10 text-white dark:text-zinc-950 shadow-md'
                    : 'border-zinc-800 dark:border-zinc-300 hover:border-zinc-700 bg-zinc-950/50 dark:bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs font-mono">Total de OPs en Alerta</span>
                    {sendScope === 'TOTAL' && <Check className="w-3.5 h-3.5 text-rose-400" />}
                  </div>
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                    Todas las órdenes activas retrasadas
                  </span>
                </div>
                <span className="text-base font-black font-mono text-rose-400 dark:text-rose-600 px-2.5 py-1 rounded-lg bg-zinc-900 dark:bg-zinc-100">
                  {totalAlerts.length}
                </span>
              </div>
            </div>
          </div>

          {/* 2. RECIPIENT SELECTION CONTROLS (SEARCH & TOGGLE ALL) */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-black uppercase text-zinc-400 dark:text-zinc-600">
                  DESTINATARIOS SELECCIONADOS ({recipientCount} DE {usuarios.length + customEmailList.length})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-2.5 py-1 rounded-lg bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 text-[11px] font-mono font-bold text-zinc-300 dark:text-zinc-700 transition cursor-pointer"
                >
                  Seleccionar Todos
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="px-2.5 py-1 rounded-lg bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 text-[11px] font-mono font-bold text-zinc-400 dark:text-zinc-600 transition cursor-pointer"
                >
                  Desmarcar Todos
                </button>
              </div>
            </div>

            {/* User Search & Area Filter Bar */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Buscar usuario por nombre, correo o cargo..."
                  className="w-full bg-zinc-900 dark:bg-zinc-100 border border-zinc-800 dark:border-zinc-300 rounded-xl pl-8 pr-3 py-2 text-xs text-white dark:text-zinc-900 placeholder-zinc-500 font-mono focus:outline-none focus:border-rose-500"
                />
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
              </div>

              <select
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
                className="bg-zinc-900 dark:bg-zinc-100 border border-zinc-800 dark:border-zinc-300 rounded-xl px-3 py-2 text-xs font-mono text-zinc-300 dark:text-zinc-800 focus:outline-none shrink-0 cursor-pointer"
              >
                <option value="TODAS">Todas las Áreas</option>
                <option value="CALIDAD">Calidad STF</option>
                <option value="CALIDAD ZF">Calidad ZF (Atelier)</option>
                <option value="LAVANDERÍA">Lavandería</option>
                <option value="COLECCIONES">Colecciones (Clientes)</option>
              </select>
            </div>

            {/* Users Checkbox List Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
              {filteredUsers.map(user => {
                const isSelected = selectedUserIds.includes(user.id);
                return (
                  <div
                    key={user.id}
                    onClick={() => handleToggleUser(user.id)}
                    className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center gap-2.5 ${
                      isSelected
                        ? 'bg-rose-500/10 border-rose-500/60 text-white dark:text-zinc-950'
                        : 'bg-zinc-950/60 dark:bg-zinc-50 border-zinc-800/80 dark:border-zinc-200 text-zinc-400 dark:text-zinc-600 hover:border-zinc-700'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 border ${
                      isSelected ? 'bg-rose-600 border-rose-500 text-white' : 'border-zinc-700 dark:border-zinc-400'
                    }`}>
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black truncate font-mono text-white dark:text-zinc-900">
                          {user.nombre}
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 dark:bg-zinc-200 text-zinc-300 dark:text-zinc-700 font-bold shrink-0">
                          {user.area}
                        </span>
                      </div>
                      <span className={`text-[10.5px] truncate block font-mono ${user.email ? 'text-zinc-400 dark:text-zinc-500' : 'text-amber-500/80 italic'}`}>
                        {user.email || '⚠️ Sin correo en Columna E (No se enviará)'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. AGREGAR CORREO ADICIONAL / PERSONALIZADO */}
          <div className="space-y-2 pt-1 border-t border-zinc-900 dark:border-zinc-200">
            <span className="text-[10px] font-mono font-black uppercase text-zinc-400 dark:text-zinc-600 block">
              + AGREGAR CORREO DESTINATARIO ADICIONAL:
            </span>
            <form onSubmit={handleAddCustomEmail} className="flex items-center gap-2">
              <input
                type="email"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                placeholder="ejemplo: auditor.externo@studiof.com.co"
                className="flex-1 bg-zinc-900 dark:bg-zinc-100 border border-zinc-800 dark:border-zinc-300 rounded-xl px-3 py-2 text-xs text-white dark:text-zinc-900 placeholder-zinc-500 font-mono focus:outline-none focus:border-rose-500"
              />
              <button
                type="submit"
                disabled={!customEmail.trim() || !customEmail.includes('@')}
                className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-black uppercase flex items-center gap-1 transition cursor-pointer disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar</span>
              </button>
            </form>

            {/* Custom email tags */}
            {customEmailList.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {customEmailList.map(email => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-[11px] font-mono text-rose-300 dark:text-rose-800"
                  >
                    <span>{email}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomEmail(email)}
                      className="hover:text-white dark:hover:text-black cursor-pointer"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-rose-950/80 dark:border-zinc-200">
          <div className="text-xs font-mono text-zinc-400 dark:text-zinc-600">
            Enviando <strong className="text-rose-400 dark:text-rose-600 font-bold">{opsToSend.length} OPs</strong> a <strong className="text-white dark:text-zinc-900 font-bold">{recipientCount} destinatario(s)</strong>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl border border-zinc-700 dark:border-zinc-300 text-xs font-mono font-bold text-zinc-300 dark:text-zinc-700 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleExecuteSend}
              disabled={recipientCount === 0 || opsToSend.length === 0 || isSending}
              className="flex-1 sm:flex-none px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-mono text-xs font-black uppercase flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-rose-600/30 active:scale-95 disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Enviando Automático...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Enviar Alerta por Correo</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
