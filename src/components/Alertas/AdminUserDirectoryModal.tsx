import React, { useState, useEffect } from 'react';
import { 
  Users, X, Search, Check, Mail, Shield, User, ArrowRight, 
  Sparkles, CheckSquare, Square, Send
} from 'lucide-react';
import { UsuarioSTF, getUsuariosList, subscribeUsuariosList, syncUsuariosFromSheets } from '../../services/authService';
import { SolicitudColcha } from '../../types';

interface AdminUserDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  delayedOps: SolicitudColcha[];
  onDispatchAlertToSelectedUsers: (selectedUserIds: string[]) => void;
}

export const AdminUserDirectoryModal: React.FC<AdminUserDirectoryModalProps> = ({
  isOpen,
  onClose,
  delayedOps,
  onDispatchAlertToSelectedUsers
}) => {
  const [usuarios, setUsuarios] = useState<UsuarioSTF[]>(getUsuariosList);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(() => 
    getUsuariosList().map(u => u.id)
  );

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

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    setSelectedUserIds(usuarios.map(u => u.id));
  };

  const handleDeselectAll = () => {
    setSelectedUserIds([]);
  };

  const filteredUsers = usuarios.filter(u => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      u.nombre.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      u.rol.toLowerCase().includes(q) ||
      u.area.toLowerCase().includes(q) ||
      (u.telefono && u.telefono.toLowerCase().includes(q))
    );
  });

  const handleConfirmAndSend = () => {
    if (selectedUserIds.length === 0) {
      alert('Por favor selecciona al menos un usuario destinatario.');
      return;
    }
    onDispatchAlertToSelectedUsers(selectedUserIds);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200 select-none font-sans">
      <div className="bg-[#0c1017] dark:bg-white border-2 border-amber-500/60 rounded-[32px] max-w-2xl w-full max-h-[90vh] flex flex-col shadow-[0_25px_80px_rgba(245,158,11,0.25)] overflow-hidden text-white dark:text-zinc-950">
        
        {/* HEADER */}
        <div className="p-5 sm:p-6 border-b border-zinc-800 dark:border-zinc-200 bg-zinc-900/90 dark:bg-zinc-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white dark:text-zinc-950">
                  Directorio de Destinatarios de Alerta (Base de Datos STF)
                </h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-black">
                  {selectedUserIds.length} Seleccionados
                </span>
              </div>
              <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-0.5">
                Selecciona uno, varios o todos los usuarios para notificar las OPs con retraso
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white dark:text-zinc-500 dark:hover:text-zinc-950 p-2 rounded-2xl hover:bg-zinc-800 dark:hover:bg-zinc-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SEARCH & QUICK ACTIONS */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 dark:border-zinc-200 bg-zinc-900/50 dark:bg-zinc-50 space-y-3">
          
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar usuario por nombre, ID, área o email..."
              className="w-full bg-zinc-950 dark:bg-white border border-zinc-800 dark:border-zinc-300 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white dark:text-zinc-950 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
            <span className="text-zinc-400 dark:text-zinc-600 text-[11px]">
              {delayedOps.length} OPs con retraso listas para notificar
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-3 py-1 rounded-xl bg-zinc-800 dark:bg-zinc-200 hover:bg-zinc-700 text-zinc-200 dark:text-zinc-800 font-bold transition cursor-pointer"
              >
                Seleccionar Todos ({usuarios.length})
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="px-3 py-1 rounded-xl bg-zinc-800 dark:bg-zinc-200 hover:bg-zinc-700 text-zinc-400 dark:text-zinc-600 font-bold transition cursor-pointer"
              >
                Limpiar
              </button>
            </div>
          </div>

        </div>

        {/* USERS LIST */}
        <div className="overflow-y-auto flex-1 custom-scroll p-4 sm:p-5 space-y-2">
          {filteredUsers.map((u) => {
            const isChecked = selectedUserIds.includes(u.id);
            return (
              <div
                key={u.id}
                onClick={() => handleToggleUser(u.id)}
                className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                  isChecked
                    ? 'bg-amber-950/30 dark:bg-amber-50/80 border-amber-500/60 shadow-sm ring-1 ring-amber-500/20'
                    : 'bg-zinc-950/70 dark:bg-white border-zinc-800 dark:border-zinc-200 hover:border-zinc-600'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}} // Handled by parent container
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 cursor-pointer accent-amber-500"
                  />

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black text-white dark:text-zinc-950 tracking-tight">
                        {u.nombre}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 dark:bg-zinc-200 text-zinc-300 dark:text-zinc-700 font-bold">
                        {u.area}
                      </span>
                      {u.rol === 'ADMINISTRADOR' && (
                        <span className="text-[9.5px] font-mono px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-500/40 font-black">
                          ADMIN
                        </span>
                      )}
                      {u.isZonaFranca && (
                        <span className="text-[9.5px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold">
                          ZONA FRANCA
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-zinc-400 dark:text-zinc-600 font-mono mt-0.5 flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-amber-500 shrink-0" />
                      <span className="truncate">{u.email}</span>
                      <span className="text-zinc-600">•</span>
                      <span>ID: {u.id}</span>
                    </div>
                  </div>
                </div>

                <span className={`text-xs font-mono font-bold shrink-0 ${
                  isChecked ? 'text-amber-400 dark:text-amber-700' : 'text-zinc-600'
                }`}>
                  {isChecked ? '✓ ACTIVO' : '+ SELECCIONAR'}
                </span>
              </div>
            );
          })}
        </div>

        {/* FOOTER */}
        <div className="p-4 sm:p-5 border-t border-zinc-800 dark:border-zinc-200 bg-zinc-900/90 dark:bg-zinc-100 flex items-center justify-between gap-3">
          <span className="text-xs text-zinc-400 dark:text-zinc-600 font-mono">
            {selectedUserIds.length} usuario(s) seleccionado(s)
          </span>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-zinc-700 dark:border-zinc-300 bg-zinc-800 dark:bg-zinc-200 text-zinc-300 dark:text-zinc-800 text-xs font-bold uppercase transition cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleConfirmAndSend}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-black text-xs font-mono uppercase tracking-wider flex items-center gap-2 transition cursor-pointer shadow-lg shadow-amber-500/20"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Redactar y Enviar Alerta</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
