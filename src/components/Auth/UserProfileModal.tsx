import React, { useState } from 'react';
import { 
  Users, X, Search, CheckCircle2, FlaskConical, Droplets, Layers, 
  Lock, Mail, ArrowRight, Check, MapPin
} from 'lucide-react';
import { UsuarioSTF, USUARIOS_STF_MAESTROS, isAdminUser } from '../../services/authService';
import { AdminPasswordModal } from './AdminPasswordModal';

interface UserProfileModalProps {
  isOpen: boolean;
  currentUser: UsuarioSTF | null;
  onClose: () => void;
  onSelectUser: (user: UsuarioSTF) => void;
}

type FilterCategory = 'ALL' | 'CALIDAD' | 'ADMIN' | 'LAVANDERIA' | 'COLECCIONES';

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onSelectUser
}) => {
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingAdminUser, setPendingAdminUser] = useState<UsuarioSTF | null>(null);

  if (!isOpen) return null;

  // Counts for tabs
  const countCalidad = USUARIOS_STF_MAESTROS.filter(u => u.rol === 'OPERARIO' || u.area.includes('CALIDAD')).length;
  const countAdmin = USUARIOS_STF_MAESTROS.filter(u => u.rol === 'ADMINISTRADOR').length;
  const countLavanderia = USUARIOS_STF_MAESTROS.filter(u => u.rol === 'LAVANDERÍA' || u.area === 'LAVANDERÍA').length;
  const countColecciones = USUARIOS_STF_MAESTROS.filter(u => u.area === 'COLECCIONES' || u.rol.startsWith('CLIENTE')).length;

  // Initials generator
  const getInitials = (user: UsuarioSTF): string => {
    if (user.nombre === 'CALIDAD ZF (ATELIER)') return 'ZF';
    if (user.nombre === 'PAOLA COLFACTORY') return 'PA';
    if (user.nombre === 'COLFACTORY') return 'CO';
    if (user.nombre === 'CALIDAD') return 'CA';
    if (user.nombre === 'EDWIN') return 'ED';
    if (user.nombre === 'CAMILA') return 'CA';
    if (user.nombre === 'JESUS') return 'JE';
    if (user.nombre === 'ROBERT') return 'RO';
    if (user.nombre === 'LUISA MEDINA') return 'LU';
    if (user.nombre === 'VALENTINA') return 'VA';
    
    const parts = user.nombre.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return user.nombre.substring(0, 2).toUpperCase();
  };

  // Category & Avatar color mapper
  const getAvatarBg = (user: UsuarioSTF): string => {
    if (user.rol === 'ADMINISTRADOR') return 'bg-[#6366f1] text-white'; // Purple / Indigo
    if (user.rol === 'LAVANDERÍA' || user.area === 'LAVANDERÍA') return 'bg-[#0ea5e9] text-white'; // Sky Blue
    if (user.area === 'COLECCIONES' || user.rol.startsWith('CLIENTE')) return 'bg-[#f59e0b] text-white'; // Amber / Orange
    if (user.isZonaFranca || user.area === 'CALIDAD ZF') return 'bg-[#06b6d4] text-white'; // Cyan
    return 'bg-[#10b981] text-white'; // Emerald Green
  };

  // Role Badge Styler
  const getRoleBadgeStyle = (user: UsuarioSTF): string => {
    if (user.rol === 'ADMINISTRADOR') {
      return 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800';
    }
    if (user.rol === 'LAVANDERÍA' || user.area === 'LAVANDERÍA') {
      return 'bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800';
    }
    if (user.rol.startsWith('CLIENTE') || user.area === 'COLECCIONES') {
      return 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800';
    }
    return 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
  };

  // Filtering logic
  const filteredUsers = USUARIOS_STF_MAESTROS.filter(u => {
    // Tab filter
    if (activeCategory === 'CALIDAD' && !(u.rol === 'OPERARIO' || u.area.includes('CALIDAD'))) return false;
    if (activeCategory === 'ADMIN' && u.rol !== 'ADMINISTRADOR') return false;
    if (activeCategory === 'LAVANDERIA' && !(u.rol === 'LAVANDERÍA' || u.area === 'LAVANDERÍA')) return false;
    if (activeCategory === 'COLECCIONES' && !(u.area === 'COLECCIONES' || u.rol.startsWith('CLIENTE'))) return false;

    // Search query
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      u.nombre.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q) ||
      u.rol.toLowerCase().includes(q) ||
      u.area.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200 select-none">
      <div className="bg-[#0c1017] dark:bg-white border border-zinc-800 dark:border-zinc-200 rounded-[32px] max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-white dark:text-zinc-950">
        
        {/* MODAL HEADER */}
        <div className="p-5 sm:p-6 border-b border-zinc-800 dark:border-zinc-200 bg-zinc-900/90 dark:bg-zinc-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white dark:text-zinc-950 tracking-tight">
                  Directorio de Perfiles Autorizados
                </h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-mono font-bold bg-sky-950/80 dark:bg-sky-100 text-sky-400 dark:text-sky-800 border border-sky-500/40 dark:border-sky-300">
                  {USUARIOS_STF_MAESTROS.length} Perfiles
                </span>
              </div>
              <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-0.5">
                Selecciona tu perfil corporativo de STF Group para conmutar inmediatamente
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

        {/* SEARCH & CATEGORY FILTER TABS */}
        <div className="p-4 sm:p-6 border-b border-zinc-800 dark:border-zinc-200 bg-zinc-900/50 dark:bg-zinc-50 space-y-4">
          
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, documento ID, cargo, área o email..."
              className="w-full bg-zinc-950 dark:bg-white border border-zinc-800 dark:border-zinc-200 rounded-2xl pl-11 pr-10 py-3 text-xs sm:text-sm text-white dark:text-zinc-950 placeholder-zinc-400 dark:placeholder-zinc-400 focus:outline-none focus:border-indigo-500 shadow-inner"
            />
            <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-3.5" />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 top-3.5 text-zinc-400 hover:text-white dark:text-zinc-500 dark:hover:text-zinc-950 p-0.5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto custom-scroll pb-1">
            
            {/* Tab 1: Todos */}
            <button
              type="button"
              onClick={() => setActiveCategory('ALL')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
                activeCategory === 'ALL'
                  ? 'bg-white text-zinc-950 dark:bg-zinc-950 dark:text-white shadow-md'
                  : 'bg-zinc-900 dark:bg-zinc-200 text-zinc-300 dark:text-zinc-700 hover:bg-zinc-800 dark:hover:bg-zinc-300'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Todos ({USUARIOS_STF_MAESTROS.length})</span>
            </button>

            {/* Tab 2: Calidad & Operarios */}
            <button
              type="button"
              onClick={() => setActiveCategory('CALIDAD')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
                activeCategory === 'CALIDAD'
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'bg-zinc-900 dark:bg-zinc-200 text-zinc-300 dark:text-zinc-700 hover:bg-zinc-800 dark:hover:bg-zinc-300'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
              <span>Calidad & Operarios ({countCalidad})</span>
            </button>

            {/* Tab 3: Admin & Lab */}
            <button
              type="button"
              onClick={() => setActiveCategory('ADMIN')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
                activeCategory === 'ADMIN'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-zinc-900 dark:bg-zinc-200 text-zinc-300 dark:text-zinc-700 hover:bg-zinc-800 dark:hover:bg-zinc-300'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5 text-purple-400 dark:text-purple-600" />
              <span>Admin & Lab ({countAdmin})</span>
            </button>

            {/* Tab 4: Lavandería */}
            <button
              type="button"
              onClick={() => setActiveCategory('LAVANDERIA')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
                activeCategory === 'LAVANDERIA'
                  ? 'bg-sky-500 text-white shadow-md'
                  : 'bg-zinc-900 dark:bg-zinc-200 text-zinc-300 dark:text-zinc-700 hover:bg-zinc-800 dark:hover:bg-zinc-300'
              }`}
            >
              <Droplets className="w-3.5 h-3.5 text-sky-400 dark:text-sky-600" />
              <span>Lavandería ({countLavanderia})</span>
            </button>

            {/* Tab 5: Colecciones */}
            <button
              type="button"
              onClick={() => setActiveCategory('COLECCIONES')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
                activeCategory === 'COLECCIONES'
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'bg-zinc-900 dark:bg-zinc-200 text-zinc-300 dark:text-zinc-700 hover:bg-zinc-800 dark:hover:bg-zinc-300'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-amber-400 dark:text-amber-600" />
              <span>Colecciones (ELA / SF / Outlet) ({countColecciones})</span>
            </button>

          </div>

        </div>

        {/* PROFILES GRID */}
        <div className="overflow-y-auto flex-1 custom-scroll p-4 sm:p-6">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-zinc-400 dark:text-zinc-600 text-xs">
              No se encontraron perfiles corporativos que coincidan con la búsqueda.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.map((user) => {
                const isSelected = currentUser?.id === user.id;
                const initials = getInitials(user);
                const avatarBg = getAvatarBg(user);
                const roleBadgeStyle = getRoleBadgeStyle(user);

                return (
                  <div
                    key={user.id}
                    onClick={() => {
                      if (user.id === currentUser?.id) return;
                      if (isAdminUser(user)) {
                        setPendingAdminUser(user);
                      } else {
                        onSelectUser(user);
                        onClose();
                      }
                    }}
                    className={`relative rounded-3xl p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between group ${
                      isSelected
                        ? 'bg-zinc-900 dark:bg-zinc-50 border-2 border-emerald-500 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500/20'
                        : 'bg-zinc-950/80 dark:bg-white border border-zinc-800 dark:border-zinc-200 hover:border-zinc-600 dark:hover:border-zinc-400 shadow-sm hover:shadow-md hover:-translate-y-0.5'
                    }`}
                  >
                    
                    {/* Top Row: Avatar + Name + ID + Active Badge */}
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-2xl ${avatarBg} flex items-center justify-center text-xs font-black font-mono shadow-sm shrink-0`}>
                            {initials}
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-white dark:text-zinc-950 tracking-tight group-hover:text-emerald-400 dark:group-hover:text-emerald-600 transition">
                              {user.nombre}
                            </h4>
                            <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 font-bold block">
                              ID: {user.id}
                            </span>
                          </div>
                        </div>

                        {isSelected && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black font-mono bg-emerald-500 text-white px-2.5 py-0.5 rounded-full shadow-xs">
                            <Check className="w-3 h-3" />
                            <span>ACTIVO</span>
                          </span>
                        )}
                      </div>

                      {/* Badges Row: Role + Area + Extra Tags */}
                      <div className="flex items-center gap-1.5 flex-wrap mt-3.5">
                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${roleBadgeStyle}`}>
                          {user.rol}
                        </span>
                        
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-zinc-900 dark:bg-zinc-100 text-zinc-300 dark:text-zinc-700 border border-zinc-800 dark:border-zinc-300">
                          {user.area}
                        </span>

                        {user.rol === 'ADMINISTRADOR' && (
                          <span className="inline-flex items-center gap-1 text-[9.5px] font-bold font-mono bg-amber-950/80 dark:bg-amber-100 text-amber-300 dark:text-amber-800 border border-amber-500/40 dark:border-amber-300 px-2 py-0.5 rounded-full">
                            <Lock className="w-2.5 h-2.5" />
                            <span>CONCLAVE</span>
                          </span>
                        )}

                        {user.isZonaFranca && (
                          <span className="inline-flex items-center gap-1 text-[9.5px] font-bold font-mono bg-cyan-950/80 dark:bg-cyan-100 text-cyan-300 dark:text-cyan-800 border border-cyan-500/40 dark:border-cyan-300 px-2 py-0.5 rounded-full">
                            <MapPin className="w-2.5 h-2.5" />
                            <span>ZONA FRANCA</span>
                          </span>
                        )}
                      </div>

                      {/* Email Row */}
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 mt-3 truncate font-mono">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="mt-4 pt-3 border-t border-zinc-800/80 dark:border-zinc-200/80 flex items-center justify-between text-xs font-bold">
                      {isSelected ? (
                        <>
                          <span className="text-emerald-400 dark:text-emerald-600 text-[11px] font-bold">
                            Perfil actual
                          </span>
                          <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                            <ArrowRight className="w-3.5 h-3.5" />
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="text-zinc-400 dark:text-zinc-500 group-hover:text-white dark:group-hover:text-zinc-950 text-[11px] transition">
                            Clic para ingresar
                          </span>
                          <div className="w-6 h-6 rounded-full bg-zinc-900 dark:bg-zinc-100 text-zinc-400 dark:text-zinc-600 group-hover:text-white dark:group-hover:text-zinc-950 group-hover:bg-zinc-800 dark:group-hover:bg-zinc-200 flex items-center justify-center transition">
                            <ArrowRight className="w-3.5 h-3.5" />
                          </div>
                        </>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 sm:p-5 border-t border-zinc-800 dark:border-zinc-200 bg-zinc-900/90 dark:bg-zinc-100 flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-600 font-mono">
          <span>
            Mostrando <strong>{filteredUsers.length}</strong> de <strong>{USUARIOS_STF_MAESTROS.length}</strong> perfiles corporativos
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-800 text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-md"
          >
            CERRAR
          </button>
        </div>

      </div>

      {/* PROTECTED ADMIN PASSWORD AUTH MODAL */}
      {pendingAdminUser && (
        <AdminPasswordModal
          isOpen={Boolean(pendingAdminUser)}
          adminUser={pendingAdminUser}
          onClose={() => setPendingAdminUser(null)}
          onSuccess={(verifiedUser) => {
            setPendingAdminUser(null);
            onSelectUser(verifiedUser);
            onClose();
          }}
        />
      )}
    </div>
  );
};
