import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  UserCheck, 
  AlertCircle, 
  Users, 
  X, 
  ArrowRight, 
  KeyRound, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  Shield 
} from 'lucide-react';
import { 
  UsuarioSTF, 
  getUsuariosList, 
  subscribeUsuariosList, 
  syncUsuariosFromSheets, 
  userRequiresPassword, 
  verifyAdminPassword 
} from '../../services/authService';
import { STFLogo } from '../Common/STFLogo';

interface LoginScreenProps {
  onLoginSuccess: (usuario: UsuarioSTF) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [usuarios, setUsuarios] = useState<UsuarioSTF[]>(getUsuariosList);
  const [userIdInput, setUserIdInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showDirectoryModal, setShowDirectoryModal] = useState(false);
  const [directorySearch, setDirectorySearch] = useState('');

  // 3D Card Flip State
  const [isFlipped, setIsFlipped] = useState(false);
  const [pendingAdminUser, setPendingAdminUser] = useState<UsuarioSTF | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminErrorMsg, setAdminErrorMsg] = useState('');
  const [isAdminShaking, setIsAdminShaking] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Subscribe to live user updates & fetch latest from Sheets
  useEffect(() => {
    const unsub = subscribeUsuariosList((latestUsers) => {
      setUsuarios(latestUsers);
    });
    syncUsuariosFromSheets();
    return unsub;
  }, []);

  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;

  // Autofocus password input after card flips to 180 degrees (solo en pantallas de escritorio)
  useEffect(() => {
    if (isFlipped && isDesktop) {
      const timer = setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 450);
      return () => clearTimeout(timer);
    }
  }, [isFlipped]);

  const handleLoginSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = userIdInput.trim().toLowerCase();
    if (!query) {
      setErrorMsg('Por favor ingrese su ID o documento.');
      return;
    }

    const currentUsers = getUsuariosList();
    const foundUser = currentUsers.find(
      u => u.id.toLowerCase() === query || u.nombre.toLowerCase().includes(query) || (u.email && u.email.toLowerCase().includes(query))
    );

    if (foundUser) {
      setErrorMsg('');
      if (userRequiresPassword(foundUser)) {
        setPendingAdminUser(foundUser);
        setAdminPassword('');
        setAdminErrorMsg('');
        setIsFlipped(true);
      } else {
        onLoginSuccess(foundUser);
      }
    } else {
      setErrorMsg(`El usuario o documento "${userIdInput}" no se encuentra en la base de datos de STF Group.`);
    }
  };

  const handleSelectFromDirectory = (user: UsuarioSTF) => {
    setUserIdInput(user.id);
    setErrorMsg('');
    setShowDirectoryModal(false);
    if (userRequiresPassword(user)) {
      setPendingAdminUser(user);
      setAdminPassword('');
      setAdminErrorMsg('');
      setIsFlipped(true);
    } else {
      onLoginSuccess(user);
    }
  };

  const handleFlipBack = () => {
    setIsFlipped(false);
    setAdminPassword('');
    setAdminErrorMsg('');
  };

  const handleAdminPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword.trim()) {
      setAdminErrorMsg('Por favor ingrese la contraseña de administrador.');
      setIsAdminShaking(true);
      setTimeout(() => setIsAdminShaking(false), 500);
      return;
    }

    if (verifyAdminPassword(adminPassword)) {
      setAdminErrorMsg('');
      if (pendingAdminUser) {
        onLoginSuccess(pendingAdminUser);
      }
    } else {
      setAdminErrorMsg('Contraseña incorrecta. Verifique sus credenciales.');
      setIsAdminShaking(true);
      setTimeout(() => setIsAdminShaking(false), 500);
    }
  };

  const filteredDirectory = usuarios.filter(u => {
    const q = directorySearch.toLowerCase().trim();
    if (!q) return true;
    return (
      u.id.toLowerCase().includes(q) ||
      u.nombre.toLowerCase().includes(q) ||
      u.rol.toLowerCase().includes(q) ||
      u.area.toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.telefono && u.telefono.toLowerCase().includes(q))
    );
  });

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 overflow-hidden bg-zinc-950 font-sans select-none">
      
      {/* Background Official STF Headquarters Building Image with Light Darkening */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center filter brightness-[0.55] contrast-[1.06] transition duration-1000 scale-100"
        style={{
          backgroundImage: `url('/assets/stf-hq-building.png')`
        }}
      />
      
      {/* Elegant Light Darkening Gradient Overlays */}
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-black/85 via-black/40 to-black/70" />
      <div className="absolute inset-0 z-0 bg-black/25 backdrop-blur-[1px]" />

      {/* Top Header 3D Chrome & Gold Transparent STF Logo */}
      <div className="relative z-10 mb-5 sm:mb-8 text-center animate-in fade-in duration-500 flex flex-col items-center group">
        <img
          src="/stf-group-3d-logo.png"
          alt="STF GROUP S.A. • STUDIO F • ELA • STUDIO F MAN"
          className="h-16 sm:h-22 md:h-26 w-auto max-w-[280px] sm:max-w-[420px] object-contain drop-shadow-[0_12px_28px_rgba(0,0,0,0.95)] drop-shadow-[0_0_15px_rgba(255,255,255,0.15)] group-hover:scale-105 group-hover:drop-shadow-[0_0_30px_rgba(255,255,255,0.95)] group-hover:drop-shadow-[0_0_55px_rgba(255,255,255,0.6)] transition-all duration-300 pointer-events-auto"
        />
      </div>

      {/* ========================================================================= */}
      {/* 3D FLIP CARD CONTAINER (Rotación horizontal 180° en eje Y sin cambiar fondo) */}
      {/* ========================================================================= */}
      <div className="relative z-10 w-full max-w-[430px] perspective-1200">
        <div 
          className={`relative w-full preserve-3d transition-transform duration-700 ease-out ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          
          {/* ===================================================================== */}
          {/* CARA 1: FRONTAL - BIENVENIDO / ID DE USUARIO (0 GRADOS)               */}
          {/* ===================================================================== */}
          <div className={`w-full min-h-[460px] sm:min-h-[480px] flex flex-col justify-between backface-hidden bg-black/35 backdrop-blur-2xl backdrop-saturate-150 border border-white/20 hover:border-white/30 rounded-[32px] sm:rounded-[38px] p-6 sm:p-9 shadow-[0_25px_70px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.25)] text-white overflow-hidden group ${
            isFlipped ? 'pointer-events-none' : ''
          }`}>
            
            {/* Inner Hairline Tech Border */}
            <div className="absolute inset-2 sm:inset-2.5 rounded-[26px] sm:rounded-[32px] border border-white/10 pointer-events-none" />

            {/* Futuristic Glass Corner Bracket - Top-Left */}
            <div className="absolute top-3.5 left-3.5 sm:top-4 sm:left-4 w-11 h-11 sm:w-13 sm:h-13 rounded-tl-[20px] rounded-br-[16px] rounded-tr-sm rounded-bl-sm border border-white/25 bg-white/[0.05] backdrop-blur-md shadow-[inset_0_1px_2px_rgba(255,255,255,0.25)] pointer-events-none overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
            </div>

            {/* Futuristic Glass Corner Bracket - Bottom-Right */}
            <div className="absolute bottom-3.5 right-3.5 sm:bottom-4 sm:right-4 w-11 h-11 sm:w-13 sm:h-13 rounded-br-[20px] rounded-tl-[16px] rounded-tr-sm rounded-bl-sm border border-white/25 bg-white/[0.05] backdrop-blur-md shadow-[inset_0_1px_2px_rgba(255,255,255,0.25)] pointer-events-none overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tl from-white/20 via-transparent to-transparent" />
            </div>

            {/* Ambient Holographic Light Glows */}
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-500/20 transition duration-700" />
            <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-500/20 transition duration-700" />

            {/* Card Header */}
            <div className="text-center space-y-2 mb-7 relative z-10">
              
              {/* Cyber Status Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.06] border border-white/15 text-amber-300 text-[10px] font-mono font-bold uppercase tracking-wider shadow-sm backdrop-blur-md">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                <span>TERMINAL DE ACCESO SEGURO</span>
              </div>

              <h2 className="text-2xl sm:text-3xl stf-studio-f-font py-1 select-none tracking-wide text-white drop-shadow-sm">
                BIENVENIDO
              </h2>
              <p className="text-xs text-zinc-300/80 font-medium">
                Inicie sesión con su documento o perfil corporativo
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-5 relative z-10">
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10.5px] font-mono font-bold uppercase tracking-wider text-zinc-300">
                  <label className="flex items-center gap-1.5 text-zinc-300">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>ID O DOCUMENTO DE USUARIO</span>
                  </label>
                  <span className="text-[9px] text-amber-400/90 font-mono bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded-full backdrop-blur-sm">
                    AUTORIZADO STF
                  </span>
                </div>

                <div className="relative flex items-center bg-white/[0.04] hover:bg-white/[0.06] border border-white/15 focus-within:border-white/40 focus-within:bg-white/[0.08] focus-within:ring-2 focus-within:ring-white/10 rounded-2xl transition duration-200 shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)] group/input backdrop-blur-md">
                  <UserCheck className="w-4 h-4 text-zinc-400 group-focus-within/input:text-amber-400 transition ml-4 shrink-0" />
                  <input
                    type="text"
                    value={userIdInput}
                    onChange={(e) => {
                      setUserIdInput(e.target.value);
                      setErrorMsg('');
                    }}
                    placeholder=""
                    autoFocus={!isFlipped && isDesktop}
                    className="w-full bg-transparent px-3.5 py-4 text-base sm:text-sm text-white placeholder-transparent font-mono font-bold focus:outline-none"
                  />
                  {userIdInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setUserIdInput('');
                        setErrorMsg('');
                      }}
                      className="mr-3 p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer"
                      title="Limpiar campo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="flex items-start gap-2 bg-rose-950/80 border border-rose-500 text-rose-200 text-xs p-3.5 rounded-2xl animate-in fade-in font-medium shadow-md backdrop-blur-md">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="relative overflow-hidden group/btn w-full bg-white hover:bg-zinc-100 text-zinc-950 py-4 px-6 rounded-2xl font-black uppercase text-xs tracking-wider transition-all duration-300 ease-out flex items-center justify-center gap-2 cursor-pointer shadow-[0_10px_25px_rgba(255,255,255,0.18)] hover:shadow-[0_18px_40px_rgba(255,255,255,0.35)] hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] font-mono select-none"
              >
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 pointer-events-none" />
                <span className="font-extrabold tracking-wider">INGRESAR AL SISTEMA</span>
                <ArrowRight className="w-4 h-4 text-zinc-950 group-hover/btn:translate-x-1.5 transition-transform duration-200" />
              </button>

            </form>

            {/* Bottom Security Info */}
            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-zinc-400 relative z-10">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>CONEXIÓN SEGURA ENCRIPTADA (TLS)</span>
              </span>
              <span className="text-zinc-300 font-bold">STF v2.7</span>
            </div>

          </div>

          {/* ===================================================================== */}
          {/* CARA 2: RESPALDO - CONTRASEÑA DE ADMINISTRADOR (180 GRADOS)           */}
          {/* ===================================================================== */}
          <div className={`absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-black/35 backdrop-blur-2xl backdrop-saturate-150 border border-white/20 hover:border-amber-500/40 rounded-[32px] sm:rounded-[38px] p-6 sm:p-9 shadow-[0_25px_70px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.25)] text-white overflow-hidden flex flex-col justify-between group ${
            !isFlipped ? 'pointer-events-none' : ''
          }`}>
            
            {/* Inner Hairline Tech Border */}
            <div className="absolute inset-2 sm:inset-2.5 rounded-[26px] sm:rounded-[32px] border border-white/10 pointer-events-none" />

            {/* Futuristic Glass Corner Bracket - Top-Left */}
            <div className="absolute top-3.5 left-3.5 sm:top-4 sm:left-4 w-11 h-11 sm:w-13 sm:h-13 rounded-tl-[20px] rounded-br-[16px] rounded-tr-sm rounded-bl-sm border border-white/25 bg-white/[0.05] backdrop-blur-md shadow-[inset_0_1px_2px_rgba(255,255,255,0.25)] pointer-events-none overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
            </div>

            {/* Futuristic Glass Corner Bracket - Bottom-Right */}
            <div className="absolute bottom-3.5 right-3.5 sm:bottom-4 sm:right-4 w-11 h-11 sm:w-13 sm:h-13 rounded-br-[20px] rounded-tl-[16px] rounded-tr-sm rounded-bl-sm border border-white/25 bg-white/[0.05] backdrop-blur-md shadow-[inset_0_1px_2px_rgba(255,255,255,0.25)] pointer-events-none overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tl from-white/20 via-transparent to-transparent" />
            </div>

            {/* Ambient Holographic Light Glows */}
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-500/15 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-500/25 transition duration-700" />
            <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-500/25 transition duration-700" />

            {/* Top Tech Laser Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-80" />

            {/* Return / Flip Back Button */}
            <button
              type="button"
              onClick={handleFlipBack}
              className="absolute top-4 right-4 sm:top-5 sm:right-5 w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.18] border border-white/20 text-zinc-300 hover:text-white flex items-center justify-center transition cursor-pointer z-20"
              title="Volver"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header Back Face */}
            <div className="text-center space-y-2 mb-4 relative z-10">
              
              {/* Cyber Status Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold uppercase tracking-wider shadow-sm backdrop-blur-md">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                <span>ACCESO PROTEGIDO</span>
              </div>

              <h2 className="text-2xl sm:text-3xl stf-studio-f-font py-1 select-none tracking-wide text-white drop-shadow-sm">
                ADMINISTRADOR
              </h2>
              <p className="text-xs text-zinc-300/80 font-medium">
                Perfil: <strong className="text-amber-400 font-bold">{pendingAdminUser?.nombre}</strong> • {pendingAdminUser?.rol} (<span className="font-mono text-amber-300">{pendingAdminUser?.id}</span>)
              </p>
            </div>

            {/* Form Back Face */}
            <form onSubmit={handleAdminPasswordSubmit} className={`space-y-4 relative z-10 ${isAdminShaking ? 'animate-shake' : ''}`}>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10.5px] font-mono font-bold uppercase tracking-wider text-zinc-300">
                  <label className="flex items-center gap-1.5 text-zinc-300">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>CONTRASEÑA DE ADMINISTRADOR</span>
                  </label>
                  <span className="text-[9px] text-amber-400/90 font-mono bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-full">
                    STF {pendingAdminUser?.id?.toUpperCase() || 'EDÍAZ'}
                  </span>
                </div>

                <div className="relative flex items-center bg-zinc-950/80 border border-zinc-700/80 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-500/25 rounded-2xl transition duration-200 shadow-inner group/input">
                  <Lock className="w-4 h-4 text-zinc-500 group-focus-within/input:text-amber-400 transition ml-4 shrink-0" />
                  <input
                    ref={passwordInputRef}
                    type={showAdminPassword ? 'text' : 'password'}
                    value={adminPassword}
                    onChange={(e) => {
                      setAdminPassword(e.target.value);
                      setAdminErrorMsg('');
                    }}
                    placeholder=""
                    className="w-full bg-transparent px-3.5 py-4 text-base sm:text-sm text-white placeholder-transparent font-mono font-bold focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="mr-3 p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
                    title={showAdminPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error message */}
              {adminErrorMsg && (
                <div className="flex items-start gap-2 bg-rose-950/80 border border-rose-500 text-rose-200 text-xs p-3 rounded-2xl animate-in fade-in font-medium shadow-md">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{adminErrorMsg}</span>
                </div>
              )}

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleFlipBack}
                  className="py-3.5 px-4 rounded-2xl border border-white/20 bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer font-mono active:scale-[0.98]"
                >
                  CANCELAR
                </button>

                <button
                  type="submit"
                  className="relative overflow-hidden group/btn py-3.5 px-4 rounded-2xl bg-white hover:bg-zinc-100 active:scale-[0.98] text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300 ease-out cursor-pointer shadow-[0_8px_20px_rgba(255,255,255,0.18)] hover:shadow-[0_14px_30px_rgba(255,255,255,0.32)] hover:-translate-y-0.5 active:translate-y-0 font-mono select-none"
                >
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 pointer-events-none" />
                  <CheckCircle2 className="w-4 h-4 text-zinc-950" />
                  <span className="font-extrabold tracking-wider">INGRESAR</span>
                </button>
              </div>
            </form>

            {/* Bottom Security Info Back Face */}
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-zinc-400 relative z-10">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>MÓDULO DE SEGURIDAD TLS</span>
              </span>
              <span className="text-zinc-300 font-bold">STF v2.7</span>
            </div>

          </div>

        </div>
      </div>

      {/* Bottom Footer Info */}
      <div className="relative z-10 mt-8 text-center text-[10px] text-zinc-500 font-mono">
        SISTEMA DE CONTROL Y TRAZABILIDAD DE COLCHAS STF GROUP S.A. © 2026
      </div>

      {/* MODAL: DIRECTORIO DE PERFILES AUTORIZADOS */}
      {showDirectoryModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    BASE DE DATOS STF
                  </span>
                  <span className="text-xs text-zinc-400 font-bold">
                    {usuarios.length} Perfiles Registrados
                  </span>
                </div>
                <h3 className="text-base font-black text-white brand-title mt-1">
                  Directorio de Perfiles Autorizados
                </h3>
                <p className="text-xs text-zinc-400">
                  Selecciona tu usuario corporativo para ingresar inmediatamente al sistema.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowDirectoryModal(false)}
                className="text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search in directory */}
            <div className="p-4 border-b border-zinc-800 bg-zinc-900/60">
              <input
                type="text"
                value={directorySearch}
                onChange={(e) => setDirectorySearch(e.target.value)}
                placeholder="Filtrar por nombre, ID (ej: 1111, ediaz), área o rol..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* User List */}
            <div className="overflow-y-auto flex-1 custom-scroll p-4 divide-y divide-zinc-800/60">
              {filteredDirectory.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleSelectFromDirectory(user)}
                  className="p-3.5 hover:bg-zinc-900/90 rounded-2xl cursor-pointer transition flex items-center justify-between text-xs gap-3 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 group-hover:border-emerald-500/50 flex items-center justify-center text-xs font-black font-mono text-emerald-400">
                      {user.id.substring(0, 4)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-white text-sm group-hover:text-emerald-300 transition">
                          {user.nombre}
                        </span>
                        {user.isZonaFranca ? (
                          <span className="text-[9.5px] bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 px-2 py-0.5 rounded-full font-bold font-mono flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            ZONA FRANCA (PRE-SOLICITUD)
                          </span>
                        ) : (
                          <span className="text-[10px] bg-zinc-900 text-zinc-300 border border-zinc-800 px-2 py-0.5 rounded font-bold">
                            {user.rol}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        Área: <strong className="text-zinc-200">{user.area}</strong> • ID: <span className="font-mono text-emerald-400">{user.id}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-400 group-hover:underline hidden sm:inline">
                      Ingresar
                    </span>
                    <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 transition" />
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-900 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowDirectoryModal(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
