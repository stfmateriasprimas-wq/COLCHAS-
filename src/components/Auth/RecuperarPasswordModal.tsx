import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  KeyRound, 
  Mail, 
  ShieldCheck, 
  AlertTriangle, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  RefreshCw, 
  Lock,
  Clock
} from 'lucide-react';
import { UsuarioSTF } from '../../services/authService';
import { 
  requestPasswordRecoveryOtp, 
  executePasswordReset,
  maskUserEmail
} from '../../services/securityAuthService';

interface RecuperarPasswordModalProps {
  initialUserId?: string;
  initialUser?: UsuarioSTF | null;
  onClose: () => void;
  onSuccessReset: (userId: string) => void;
}

export const RecuperarPasswordModal: React.FC<RecuperarPasswordModalProps> = ({
  initialUserId = '',
  initialUser = null,
  onClose,
  onSuccessReset
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [userId, setUserId] = useState(initialUserId || initialUser?.id || '');
  const [maskedEmail, setMaskedEmail] = useState(initialUser?.email ? maskUserEmail(initialUser.email) : '');
  
  // Paso 2: OTP y nueva contraseña
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Estados de proceso y feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Cuenta regresiva de reenvío de código (60 segundos)
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (step === 2) {
      setTimeout(() => otpInputRef.current?.focus(), 250);
    }
  }, [step]);

  // Paso 1: Enviar Código OTP
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userId.trim()) {
      setErrorMessage('Por favor ingresa tu ID o documento de usuario.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    try {
      const result = await requestPasswordRecoveryOtp(userId);
      if (result.success) {
        if (result.maskedEmail) setMaskedEmail(result.maskedEmail);
        setStep(2);
        setResendCooldown(60);
      } else {
        setErrorMessage(result.message);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error al comunicarse con el servidor de correo.');
    } finally {
      setIsLoading(false);
    }
  };

  // Paso 2: Ejecutar cambio de contraseña
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = otpCode.trim().replace(/\D/g, '');
    const cleanPass = newPassword.trim();
    const cleanConfirm = confirmPassword.trim();

    if (cleanOtp.length !== 6) {
      setErrorMessage('El código de seguridad debe tener exactamente 6 dígitos.');
      return;
    }

    if (cleanPass.length < 6) {
      setErrorMessage('La nueva contraseña debe tener como mínimo 6 caracteres.');
      return;
    }

    if (cleanPass !== cleanConfirm) {
      setErrorMessage('Las contraseñas no coinciden. Verifícalas cuidadosamente.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    try {
      const result = await executePasswordReset(userId, cleanOtp, cleanPass);
      if (result.success) {
        setSuccessMessage(result.message);
        setStep(3);
        setTimeout(() => {
          onSuccessReset(userId);
        }, 2200);
      } else {
        setErrorMessage(result.message);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error al guardar la nueva contraseña.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        className="relative w-full max-w-md bg-gradient-to-b from-zinc-900 via-slate-900 to-zinc-950 border border-white/10 rounded-3xl shadow-2xl p-6 md:p-8 text-white overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow de fondo decorativo */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Botón Cerrar */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 border border-cyan-400/30 text-cyan-300 mb-3 shadow-inner">
            <KeyRound className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-black tracking-tight text-white">
            {step === 1 && 'Recuperar Contraseña'}
            {step === 2 && 'Validar Código y Cambiar Clave'}
            {step === 3 && '¡Contraseña Actualizada!'}
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            {step === 1 && 'Ingresa tu usuario para recibir un código de seguridad por correo.'}
            {step === 2 && `Ingresa el código de 6 dígitos enviado a ${maskedEmail || 'tu correo'}.`}
            {step === 3 && 'Tu cuenta ha sido desbloqueada y la nueva contraseña fue guardada.'}
          </p>
        </div>

        {/* Alertas de error */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* PASO 1: Ingreso de Usuario */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-bold text-zinc-300 uppercase mb-2">
                ID o Documento de Usuario
              </label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Ej. ediaz ó 1073524622"
                className="w-full px-4 py-3 rounded-xl bg-zinc-800/80 border border-zinc-700 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !userId.trim()}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Enviando código...</span>
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  <span>Enviar Código de Recuperación</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* PASO 2: OTP y Nueva Contraseña */}
        {step === 2 && (
          <form onSubmit={handleResetSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-mono font-bold text-zinc-300 uppercase">
                  Código de 6 dígitos
                </label>
                <span className="text-[11px] text-zinc-400 flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3 text-cyan-400" />
                  <span>Vence en 15 min</span>
                </span>
              </div>
              <input
                ref={otpInputRef}
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full px-4 py-3 rounded-xl bg-zinc-800/80 border border-zinc-700 text-cyan-300 font-mono text-center text-xl tracking-widest font-black placeholder-zinc-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
              />
            </div>

            {/* Nueva Contraseña */}
            <div>
              <label className="block text-xs font-mono font-bold text-zinc-300 uppercase mb-2">
                Nueva Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-4 pr-10 py-3 rounded-xl bg-zinc-800/80 border border-zinc-700 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-zinc-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirmar Nueva Contraseña */}
            <div>
              <label className="block text-xs font-mono font-bold text-zinc-300 uppercase mb-2">
                Confirmar Contraseña
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita la nueva contraseña"
                  className="w-full pl-4 pr-10 py-3 rounded-xl bg-zinc-800/80 border border-zinc-700 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-zinc-400 hover:text-white"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || otpCode.length !== 6 || newPassword.length < 6 || confirmPassword.length < 6}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-zinc-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Validando y Guardando...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Guardar Contraseña y Desbloquear</span>
                </>
              )}
            </button>

            {/* Reenviar código */}
            <div className="text-center pt-1">
              <button
                type="button"
                disabled={resendCooldown > 0 || isLoading}
                onClick={handleRequestOtp}
                className="text-xs font-mono text-cyan-400 hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
              >
                {resendCooldown > 0
                  ? `Reenviar código en ${resendCooldown}s`
                  : '¿No recibiste el código? Reenviar correo'}
              </button>
            </div>
          </form>
        )}

        {/* PASO 3: Éxito */}
        {step === 3 && (
          <div className="text-center py-6 space-y-4 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
            </div>
            <p className="text-sm font-semibold text-emerald-300">
              {successMessage || '¡Contraseña actualizada exitosamente!'}
            </p>
            <p className="text-xs text-zinc-400 font-mono">
              Redirigiendo automáticamente a inicio de sesión...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
