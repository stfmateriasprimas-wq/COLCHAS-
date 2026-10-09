import { UsuarioSTF, getUsuariosList, ADMIN_PASSWORD, SOPORTE_PASSWORD, isEdiazUser, isSoporteUser } from './authService';
import { sendAppsScriptPost } from './googleSheetsService';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { auditService } from './auditService';

export interface LockoutStatus {
  isLocked: boolean;
  remainingSeconds: number;
  remainingFormatted: string;
  level: number; // 0: Normal, 1: 5 min, 2: 15 min
  failedAttempts: number;
  attemptsLeftForNextLock: number;
}

export interface VerifyPasswordResult {
  success: boolean;
  lockoutStatus: LockoutStatus;
  errorMessage?: string;
}

interface StoredLockoutData {
  count: number;
  lockedUntil: number | null; // Timestamp en ms
  level: number;
  lastFailedTimestamp: number;
}

interface StoredRecoveryOtp {
  code: string;
  expiresAt: number; // Timestamp en ms
  userId: string;
}

const STORAGE_LOCKOUT_KEY_PREFIX = 'stf_sec_lockout_';
const STORAGE_CUSTOM_PASS_PREFIX = 'stf_sec_pass_';
const STORAGE_RECOVERY_OTP_PREFIX = 'stf_sec_otp_';

// Correos de Soporte y Administrador para alertas de seguridad
const NOTIFY_SUPPORT_EMAILS = ['joseoneiber711@gmail.com', 'edwin.diaz@studiof.com.co'];

/**
 * Obtiene el registro de bloqueo de un usuario desde localStorage
 */
function getStoredLockout(userId: string): StoredLockoutData {
  if (typeof window === 'undefined') {
    return { count: 0, lockedUntil: null, level: 0, lastFailedTimestamp: 0 };
  }
  try {
    const raw = localStorage.getItem(`${STORAGE_LOCKOUT_KEY_PREFIX}${userId.trim().toLowerCase()}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        count: Number(parsed.count) || 0,
        lockedUntil: parsed.lockedUntil ? Number(parsed.lockedUntil) : null,
        level: Number(parsed.level) || 0,
        lastFailedTimestamp: Number(parsed.lastFailedTimestamp) || 0
      };
    }
  } catch (e) {
    console.warn('[SecurityService] Error leyendo lockout:', e);
  }
  return { count: 0, lockedUntil: null, level: 0, lastFailedTimestamp: 0 };
}

/**
 * Guarda el registro de bloqueo de un usuario en localStorage
 */
function saveStoredLockout(userId: string, data: StoredLockoutData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      `${STORAGE_LOCKOUT_KEY_PREFIX}${userId.trim().toLowerCase()}`,
      JSON.stringify(data)
    );
  } catch (e) {
    console.warn('[SecurityService] Error guardando lockout:', e);
  }
}

/**
 * Limpia el estado de bloqueo de un usuario (al autenticarse o recuperar clave)
 */
export function clearUserLockout(userId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`${STORAGE_LOCKOUT_KEY_PREFIX}${userId.trim().toLowerCase()}`);
  } catch (e) {}
}

/**
 * Formatea segundos a MM:SS
 */
export function formatSecondsToTimer(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Consulta el estado actual de bloqueo de un usuario
 */
export function checkUserLockoutStatus(userId: string): LockoutStatus {
  const data = getStoredLockout(userId);
  const now = Date.now();

  let isLocked = false;
  let remainingSeconds = 0;

  if (data.lockedUntil && data.lockedUntil > now) {
    isLocked = true;
    remainingSeconds = Math.ceil((data.lockedUntil - now) / 1000);
  } else if (data.lockedUntil && data.lockedUntil <= now) {
    // El tiempo de bloqueo ya expiró, se limpia el bloqueo activo pero se conserva el conteo si reincide
    data.lockedUntil = null;
    saveStoredLockout(userId, data);
  }

  // Cálculo de intentos restantes para el siguiente umbral
  let attemptsLeftForNextLock = 3;
  if (data.count < 3) {
    attemptsLeftForNextLock = 3 - data.count;
  } else if (data.count < 6) {
    attemptsLeftForNextLock = 6 - data.count;
  } else {
    attemptsLeftForNextLock = 1;
  }

  return {
    isLocked,
    remainingSeconds,
    remainingFormatted: formatSecondsToTimer(remainingSeconds),
    level: data.level,
    failedAttempts: data.count,
    attemptsLeftForNextLock
  };
}

/**
 * Obtiene la contraseña personalizada guardada para un usuario, o null si usa la de fábrica
 */
export function getUserCustomPassword(userId: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const pass = localStorage.getItem(`${STORAGE_CUSTOM_PASS_PREFIX}${userId.trim().toLowerCase()}`);
    return pass ? pass.trim() : null;
  } catch (e) {
    return null;
  }
}

/**
 * Guarda una nueva contraseña personalizada para un usuario de forma persistente
 */
export async function setUserCustomPassword(userId: string, newPassword: string): Promise<void> {
  const cleanId = userId.trim().toLowerCase();
  const cleanPass = newPassword.trim();

  // 1. Guardar en almacenamiento local
  if (typeof window !== 'undefined') {
    localStorage.setItem(`${STORAGE_CUSTOM_PASS_PREFIX}${cleanId}`, cleanPass);
  }

  // 2. Limpiar bloqueo e intentos fallidos
  clearUserLockout(userId);

  // 3. Notificar a Google Apps Script para almacenamiento permanente en la nube
  try {
    await sendAppsScriptPost('SAVE_USER_PASSWORD', {
      userId: cleanId,
      password: cleanPass,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('[SecurityService] Aviso guardando clave en Apps Script:', err);
  }

  // 4. Registrar en auditoría de Supabase (sin exponer la clave en texto plano en logs visibles)
  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.from('stf_colchas_auditoria').insert({
        op_codigo: 'SEGURIDAD-AUTH',
        estado_anterior: 'CAMBIO_PASSWORD',
        estado_nuevo: 'PASSWORD_ACTUALIZADA',
        usuario_id: cleanId,
        usuario_nombre: `Usuario ${userId}`,
        area: 'SEGURIDAD_ACCESO',
        detalles: {
          tipo: 'PASSWORD_RESET_SUCCESS',
          userId: cleanId,
          timestamp: new Date().toISOString()
        }
      });
    } catch (e) {}
  }
}

/**
 * Obtiene la contraseña activa que debe validar el usuario (personalizada o por defecto)
 */
export function getActiveUserPassword(user: UsuarioSTF): string {
  const custom = getUserCustomPassword(user.id);
  if (custom) return custom;

  if (isSoporteUser(user)) {
    return SOPORTE_PASSWORD;
  }
  if (isEdiazUser(user)) {
    return ADMIN_PASSWORD;
  }
  return '';
}

/**
 * Envía la notificación de correo oficial de alerta de bloqueo de seguridad
 */
async function sendLockoutSecurityEmail(user: UsuarioSTF, level: number, lockMinutes: number, totalFailed: number): Promise<void> {
  const now = new Date();
  const fechaStr = now.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const horaStr = now.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const recipients = Array.from(new Set([
    user.email,
    ...NOTIFY_SUPPORT_EMAILS
  ])).filter(Boolean);

  if (recipients.length === 0) return;

  const payload = {
    recipients,
    userNombre: user.nombre,
    userId: user.id,
    userArea: user.area,
    userRol: user.rol,
    userEmail: user.email,
    nivel: level,
    lockMinutes,
    totalFailed,
    fecha: fechaStr,
    hora: horaStr,
    timestamp: now.toISOString()
  };

  try {
    await sendAppsScriptPost('SEND_SECURITY_LOCKOUT_ALERT', payload);
  } catch (err) {
    console.warn('[SecurityService] No se pudo enviar correo de alerta de bloqueo:', err);
  }

  // Registrar auditoría forense del bloqueo
  try {
    await auditService.logAction(
      user,
      'LOGIN',
      `Bloqueo de seguridad nivel ${level} activado tras ${totalFailed} intentos fallidos (${lockMinutes} min)`,
      undefined,
      {
        alerta: 'BLOQUEO_SEGURIDAD_INTENTOS_FALLIDOS',
        nivel: level,
        lockMinutes,
        intentos: totalFailed,
        fecha: `${fechaStr} ${horaStr}`
      }
    );
  } catch (e) {}
}

/**
 * Valida las credenciales ingresadas, gestiona intentos fallidos, bloqueos y correos
 */
export async function verifyUserCredentials(user: UsuarioSTF, passwordInput: string): Promise<VerifyPasswordResult> {
  const cleanInput = (passwordInput || '').trim();
  const expectedPassword = getActiveUserPassword(user);
  const now = Date.now();

  // 1. Verificar si el usuario ya está bloqueado en este momento
  const currentStatus = checkUserLockoutStatus(user.id);
  if (currentStatus.isLocked) {
    return {
      success: false,
      lockoutStatus: currentStatus,
      errorMessage: `Cuenta bloqueada temporalmente por seguridad. Podrá reintentar en ${currentStatus.remainingFormatted}.`
    };
  }

  // 2. Comprobar si la contraseña coincide
  const isMatch = cleanInput === expectedPassword;

  if (isMatch) {
    // Contraseña correcta: Limpiar contador de intentos fallidos
    clearUserLockout(user.id);
    return {
      success: true,
      lockoutStatus: {
        isLocked: false,
        remainingSeconds: 0,
        remainingFormatted: '00:00',
        level: 0,
        failedAttempts: 0,
        attemptsLeftForNextLock: 3
      }
    };
  }

  // 3. Contraseña incorrecta: Incrementar intentos fallidos
  const data = getStoredLockout(user.id);
  data.count += 1;
  data.lastFailedTimestamp = now;

  let isNowLocked = false;
  let lockMinutes = 0;
  let newLevel = 0;
  let remainingSeconds = 0;

  // REGLAS INMUTABLES DEL SISTEMA:
  // - A partir de 3 intentos: Bloqueo de 5 minutos (Nivel 1)
  // - A partir de 6 intentos: Bloqueo de 15 minutos (Nivel 2)
  if (data.count >= 6) {
    newLevel = 2;
    lockMinutes = 15;
    data.level = newLevel;
    data.lockedUntil = now + (15 * 60 * 1000);
    isNowLocked = true;
    remainingSeconds = 15 * 60;
  } else if (data.count >= 3) {
    newLevel = 1;
    lockMinutes = 5;
    data.level = newLevel;
    data.lockedUntil = now + (5 * 60 * 1000);
    isNowLocked = true;
    remainingSeconds = 5 * 60;
  }

  saveStoredLockout(user.id, data);

  // Si se activó un bloqueo nuevo, disparar la alerta automática por correo
  if (isNowLocked) {
    sendLockoutSecurityEmail(user, newLevel, lockMinutes, data.count).catch(() => {});
  }

  const updatedStatus = checkUserLockoutStatus(user.id);

  let errorMessage = '';
  if (isNowLocked) {
    errorMessage = `Has superado el límite de intentos permitidos (${data.count}). Tu usuario ha sido bloqueado por ${lockMinutes} minutos por seguridad.`;
  } else {
    const attemptsLeft = 3 - data.count;
    errorMessage = `Contraseña incorrecta. Intento ${data.count} de 3. Te quedan ${attemptsLeft} intento${attemptsLeft === 1 ? '' : 's'} antes del bloqueo temporal.`;
  }

  return {
    success: false,
    lockoutStatus: updatedStatus,
    errorMessage
  };
}

/**
 * Enmascara un correo electrónico para proteger la privacidad en pantalla
 * Ej: edwin.diaz@studiof.com.co -> e****z@studiof.com.co
 */
export function maskUserEmail(email?: string): string {
  if (!email || !email.includes('@')) return 'correo no registrado';
  const parts = email.split('@');
  const user = parts[0];
  const domain = parts[1];
  if (user.length <= 2) {
    return `${user.charAt(0)}*@${domain}`;
  }
  return `${user.charAt(0)}****${user.charAt(user.length - 1)}@${domain}`;
}

/**
 * Genera un código OTP de 6 dígitos numéricos aleatorio
 */
function generate6DigitOtp(): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  return String(num);
}

/**
 * Solicita el código OTP de recuperación de contraseña para un usuario
 */
export async function requestPasswordRecoveryOtp(userId: string): Promise<{ success: boolean; message: string; maskedEmail?: string }> {
  const users = getUsuariosList();
  const cleanQuery = userId.trim().toLowerCase();
  const user = users.find(u => u.id.toLowerCase() === cleanQuery || u.id.replace(/\D/g, '') === cleanQuery.replace(/\D/g, ''));

  if (!user) {
    return {
      success: false,
      message: `El usuario o documento "${userId}" no se encuentra en la base de datos de STF Group.`
    };
  }

  // Resolver correo oficial: Si no tiene en su objeto, usar correo de soporte o fallback oficial
  let targetEmail = user.email ? user.email.trim() : '';
  if (!targetEmail) {
    if (isSoporteUser(user)) targetEmail = 'joseoneiber711@gmail.com';
    else if (isEdiazUser(user)) targetEmail = 'edwin.diaz@studiof.com.co';
  }

  if (!targetEmail) {
    return {
      success: false,
      message: `El usuario ${user.nombre} no tiene un correo electrónico configurado en la hoja USUARIOS. Comuníquese con Soporte Técnico.`
    };
  }

  const otpCode = generate6DigitOtp();
  const expiresAt = Date.now() + (15 * 60 * 1000); // 15 minutos de vigencia

  const otpRecord: StoredRecoveryOtp = {
    code: otpCode,
    expiresAt,
    userId: user.id
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(`${STORAGE_RECOVERY_OTP_PREFIX}${user.id.toLowerCase()}`, JSON.stringify(otpRecord));
  }

  // Enviar el correo con el código OTP mediante Google Apps Script
  const now = new Date();
  try {
    await sendAppsScriptPost('SEND_RECOVERY_OTP_EMAIL', {
      recipient: targetEmail,
      userId: user.id,
      userNombre: user.nombre,
      otpCode,
      expiresMinutes: 15,
      fecha: now.toLocaleDateString('es-CO'),
      hora: now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })
    });
  } catch (err) {
    console.warn('[SecurityService] Error enviando correo OTP:', err);
  }

  return {
    success: true,
    message: `Hemos enviado un código de seguridad de 6 dígitos a su correo electrónico.`,
    maskedEmail: maskUserEmail(targetEmail)
  };
}

/**
 * Valida si el código OTP ingresado es correcto y está vigente
 */
export function verifyPasswordRecoveryOtp(userId: string, inputOtp: string): { valid: boolean; message: string } {
  if (typeof window === 'undefined') {
    return { valid: false, message: 'Entorno no disponible' };
  }

  const cleanUserId = userId.trim().toLowerCase();
  const cleanInput = (inputOtp || '').trim().replace(/\D/g, '');

  if (cleanInput.length !== 6) {
    return { valid: false, message: 'El código de seguridad debe tener 6 dígitos numéricos.' };
  }

  const raw = localStorage.getItem(`${STORAGE_RECOVERY_OTP_PREFIX}${cleanUserId}`);
  if (!raw) {
    return { valid: false, message: 'No hay ninguna solicitud de recuperación activa o el código ha expirado.' };
  }

  try {
    const record: StoredRecoveryOtp = JSON.parse(raw);
    const now = Date.now();

    if (now > record.expiresAt) {
      localStorage.removeItem(`${STORAGE_RECOVERY_OTP_PREFIX}${cleanUserId}`);
      return { valid: false, message: 'El código de seguridad ha expirado (validez: 15 minutos). Solicite uno nuevo.' };
    }

    if (record.code !== cleanInput) {
      return { valid: false, message: 'Código de seguridad incorrecto. Verifique el correo electrónico recibido.' };
    }

    return { valid: true, message: 'Código validado correctamente.' };
  } catch (e) {
    return { valid: false, message: 'Error al verificar el código.' };
  }
}

/**
 * Ejecuta el restablecimiento definitivo de la contraseña tras validar el OTP
 */
export async function executePasswordReset(
  userId: string, 
  otpCode: string, 
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  const verifyResult = verifyPasswordRecoveryOtp(userId, otpCode);
  if (!verifyResult.valid) {
    return { success: false, message: verifyResult.message };
  }

  const cleanPass = (newPassword || '').trim();
  if (cleanPass.length < 6) {
    return { success: false, message: 'La nueva contraseña debe tener como mínimo 6 caracteres.' };
  }

  // Establecer la nueva contraseña de forma permanente
  await setUserCustomPassword(userId, cleanPass);

  // Limpiar el OTP usado para que no pueda reutilizarse
  if (typeof window !== 'undefined') {
    localStorage.removeItem(`${STORAGE_RECOVERY_OTP_PREFIX}${userId.trim().toLowerCase()}`);
  }

  return {
    success: true,
    message: '¡Contraseña actualizada con éxito! Ya puedes iniciar sesión con tu nueva contraseña.'
  };
}
