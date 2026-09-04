import React, { useState } from 'react';
import { Shield, Lock, Eye, EyeOff, X, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';
import { UsuarioSTF, verifyAdminPassword } from '../../services/authService';

interface AdminPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (adminUser: UsuarioSTF) => void;
  adminUser: UsuarioSTF;
}

export const AdminPasswordModal: React.FC<AdminPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  adminUser
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMsg('Por favor ingrese la contraseña de administrador.');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    if (verifyAdminPassword(password)) {
      setErrorMsg('');
      setPassword('');
      onSuccess(adminUser);
    } else {
      setErrorMsg('Contraseña incorrecta. Verifique sus credenciales de administrador.');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 select-none">
      
      {/* ULTRA-FUTURISTIC CYBER GLASSMORPHISM ADMIN MODAL */}
      <div 
        className={`relative w-full max-w-[430px] bg-[#0a0e17]/95 backdrop-blur-3xl border border-white/15 hover:border-amber-500/40 rounded-[36px] p-7 sm:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_40px_rgba(245,158,11,0.08)] overflow-hidden text-white transition-all duration-300 group ${
          isShaking ? 'animate-bounce' : 'animate-in zoom-in-95 duration-150'
        }`}
      >
        
        {/* Ambient Holographic Light Glows */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-500/15 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-500/25 transition duration-700" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-500/25 transition duration-700" />

        {/* Top Tech Laser Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-80" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer z-20"
          title="Cancelar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Card Header */}
        <div className="text-center space-y-2 mb-6 relative">
          
          {/* Cyber Status Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold uppercase tracking-wider shadow-sm">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
            <span>ACCESO PROTEGIDO</span>
          </div>

          <h2 className="text-xl sm:text-2xl stf-studio-f-font py-0.5 select-none">
            ADMINISTRADOR
          </h2>
          <p className="text-xs text-zinc-400 font-medium">
            Perfil: <strong className="text-amber-400 font-bold">{adminUser.nombre}</strong> • {adminUser.rol} (<span className="font-mono text-amber-300">{adminUser.id}</span>)
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 relative">
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10.5px] font-mono font-bold uppercase tracking-wider text-zinc-300">
              <label className="flex items-center gap-1.5 text-zinc-300">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>CONTRASEÑA DE ADMINISTRADOR</span>
              </label>
              <span className="text-[9px] text-amber-400/90 font-mono bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-full">
                STF EDÍAZ
              </span>
            </div>

            <div className="relative flex items-center bg-zinc-950/90 border border-zinc-700/80 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-500/25 rounded-2xl transition duration-200 shadow-inner group/input">
              <Lock className="w-4 h-4 text-zinc-500 group-focus-within/input:text-amber-400 transition ml-4 shrink-0" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg('');
                }}
                placeholder=""
                autoFocus
                className="w-full bg-transparent px-3.5 py-4 text-sm text-white placeholder-transparent font-mono font-bold focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="mr-3 p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
                title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error message */}
          {errorMsg && (
            <div className="flex items-start gap-2 bg-rose-950/80 border border-rose-500 text-rose-200 text-xs p-3.5 rounded-2xl animate-in fade-in font-medium shadow-md">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ACTION BUTTONS */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="py-3.5 px-4 rounded-2xl border border-zinc-700/80 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer font-mono active:scale-[0.98]"
            >
              CANCELAR
            </button>

            {/* Crisp White Submit Button with Lift Elevation Animation */}
            <button
              type="submit"
              className="relative overflow-hidden group/btn py-3.5 px-4 rounded-2xl bg-white hover:bg-zinc-100 active:scale-[0.98] text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300 ease-out cursor-pointer shadow-[0_8px_20px_rgba(255,255,255,0.18)] hover:shadow-[0_14px_30px_rgba(255,255,255,0.32)] hover:-translate-y-1 active:translate-y-0 font-mono select-none"
            >
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 pointer-events-none" />
              <CheckCircle2 className="w-4 h-4 text-zinc-950" />
              <span className="font-extrabold tracking-wider">INGRESAR</span>
            </button>
          </div>
        </form>

        {/* Bottom Security Info */}
        <div className="mt-6 pt-4 border-t border-zinc-900 flex items-center justify-between text-[10px] font-mono text-zinc-500">
          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>MÓDULO DE SEGURIDAD TLS</span>
          </span>
          <span className="text-zinc-400 font-bold">STF v2.6</span>
        </div>

      </div>

    </div>
  );
};

