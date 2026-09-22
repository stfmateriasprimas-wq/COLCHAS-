/**
 * STF GROUP - SERVICIO DE AUDITORÍA Y TRAZABILIDAD EN TIEMPO REAL
 * Almacenamiento y sincronización de accesos y acciones forenses de usuarios.
 * Soporte Firestore en tiempo real con respaldo local resiliente.
 */

import { 
  collection, 
  doc, 
  setDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { UsuarioSTF } from './authService';

export type AuditActionType =
  | 'LOGIN'
  | 'CREACION_OP'
  | 'TRANSFERENCIA'
  | 'DICTAMEN_CALIDAD'
  | 'ACTUALIZACION_FOTO'
  | 'ELIMINACION_OP'
  | 'RESTAURACION_OP';

export interface AuditLogEntry {
  id: string;
  timestamp: string; // ISO 8601
  fechaFormateada: string; // ej: 22/09/2026, 08:30:15 a. m.
  diaKey: string; // YYYY-MM-DD
  mesKey: string; // YYYY-MM
  usuarioId: string;
  usuarioNombre: string;
  usuarioRol: string;
  usuarioArea: string;
  tipoAccion: AuditActionType;
  opAfectada?: string;
  descripcion: string;
  detalles?: {
    estadoAnterior?: string;
    estadoNuevo?: string;
    dictamen?: string;
    observaciones?: string;
    tela?: string;
    lote?: string;
    inspector?: string;
    tipoFoto?: string;
    dispositivo?: string;
    navegador?: string;
    sistemaOperativo?: string;
    [key: string]: any;
  };
}

export interface UserLoginSummary {
  userId: string;
  nombre: string;
  area: string;
  rol: string;
  loginsHoy: number;
  loginsMes: number;
  ultimoLogin: AuditLogEntry | null;
  activoHoy: boolean;
  dispositivoReciente: string;
}

const COLLECTION_NAME = 'stf_audit_logs';
const LOCAL_STORAGE_KEY = 'stf_audit_logs_cache_v1';

// Detectar dispositivo y navegador del operario
function getClientDeviceInfo(): { dispositivo: string; navegador: string; sistemaOperativo: string } {
  if (typeof window === 'undefined') {
    return { dispositivo: 'Servidor', navegador: 'Desconocido', sistemaOperativo: 'Desconocido' };
  }

  const ua = navigator.userAgent || '';
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  let sistemaOperativo = 'Windows / PC';
  if (isIOS) sistemaOperativo = 'iOS (Apple)';
  else if (isAndroid) sistemaOperativo = 'Android';
  else if (/Macintosh/i.test(ua)) sistemaOperativo = 'macOS';
  else if (/Linux/i.test(ua)) sistemaOperativo = 'Linux';

  let navegador = 'Chrome / WebKit';
  if (/CriOS|Chrome/i.test(ua)) navegador = 'Google Chrome';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) navegador = 'Safari';
  else if (/Firefox/i.test(ua)) navegador = 'Firefox';
  else if (/Edg/i.test(ua)) navegador = 'Microsoft Edge';

  const w = window.innerWidth;
  const dispositivo = isMobile || w < 768 ? `Móvil (${w}px)` : `Escritorio / PC (${w}px)`;

  return { dispositivo, navegador, sistemaOperativo };
}

class AuditService {
  private localLogs: AuditLogEntry[] = [];
  private listeners: Array<(logs: AuditLogEntry[]) => void> = [];
  private unsubscribeFirestore: (() => void) | null = null;
  private isInitialized = false;

  constructor() {
    this.loadFromLocalStorage();
  }

  private loadFromLocalStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        this.localLogs = JSON.parse(cached);
      }
    } catch (e) {
      console.warn('Error al cargar caché local de auditoría:', e);
    }
  }

  private saveToLocalStorage(logs: AuditLogEntry[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(logs.slice(0, 1000)));
    } catch (e) {
      console.warn('Error al guardar caché local de auditoría:', e);
    }
  }

  /**
   * Suscribe a la colección de auditoría en tiempo real
   */
  public subscribeToLogs(callback: (logs: AuditLogEntry[]) => void): () => void {
    this.listeners.push(callback);
    // Emitir inmediatamente lo que tengamos en memoria local
    callback(this.localLogs);

    if (!this.isInitialized) {
      this.initFirestoreListener();
    }

    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
      if (this.listeners.length === 0 && this.unsubscribeFirestore) {
        this.unsubscribeFirestore();
        this.unsubscribeFirestore = null;
        this.isInitialized = false;
      }
    };
  }

  private initFirestoreListener(): void {
    this.isInitialized = true;
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy('timestamp', 'desc'),
        limit(500)
      );

      this.unsubscribeFirestore = onSnapshot(q, (snapshot) => {
        const remoteLogs: AuditLogEntry[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as AuditLogEntry;
          if (data && data.timestamp) {
            remoteLogs.push({ ...data, id: docSnap.id });
          }
        });

        if (remoteLogs.length > 0) {
          // Combinar con los locales para asegurar que nada se pierda
          const mergedMap = new Map<string, AuditLogEntry>();
          remoteLogs.forEach(l => mergedMap.set(l.id, l));
          this.localLogs.forEach(l => {
            if (!mergedMap.has(l.id)) mergedMap.set(l.id, l);
          });

          const merged = Array.from(mergedMap.values()).sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );

          this.localLogs = merged;
          this.saveToLocalStorage(merged);
          this.notifyListeners(merged);
        }
      }, (err) => {
        console.warn('Firestore audit sync warning, usando almacenamiento local:', err);
      });
    } catch (err) {
      console.warn('Error al conectar Firestore para auditoría:', err);
    }
  }

  private notifyListeners(logs: AuditLogEntry[]): void {
    this.listeners.forEach(cb => {
      try {
        cb(logs);
      } catch (e) {
        console.error('Error en listener de auditoría:', e);
      }
    });
  }

  /**
   * Registra una acción en tiempo real
   */
  public async logAction(
    usuario: UsuarioSTF,
    tipoAccion: AuditActionType,
    descripcion: string,
    opAfectada?: string,
    detalles?: Record<string, any>
  ): Promise<AuditLogEntry> {
    const now = new Date();
    const nowIso = now.toISOString();
    const diaKey = nowIso.split('T')[0];
    const mesKey = diaKey.substring(0, 7);

    // Formatear en hora de Colombia (COT / UTC-5)
    const fechaFormateada = now.toLocaleString('es-CO', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    const deviceInfo = getClientDeviceInfo();

    const entryId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newEntry: AuditLogEntry = {
      id: entryId,
      timestamp: nowIso,
      fechaFormateada,
      diaKey,
      mesKey,
      usuarioId: usuario.id,
      usuarioNombre: usuario.nombre,
      usuarioRol: usuario.rol,
      usuarioArea: usuario.area,
      tipoAccion,
      opAfectada: opAfectada ? opAfectada.trim().toUpperCase() : undefined,
      descripcion,
      detalles: {
        ...deviceInfo,
        ...detalles
      }
    };

    // 1. Guardar de inmediato en local para respuesta a 0ms
    this.localLogs.unshift(newEntry);
    this.saveToLocalStorage(this.localLogs);
    this.notifyListeners(this.localLogs);

    // 2. Persistir en Firestore en la nube
    try {
      await setDoc(doc(db, COLLECTION_NAME, entryId), newEntry);
    } catch (err) {
      console.warn('No se pudo sincronizar registro de auditoría a Firestore inmediatamente:', err);
    }

    return newEntry;
  }

  /**
   * Atajo para registrar el ingreso (Login) de un usuario
   */
  public async recordLogin(usuario: UsuarioSTF): Promise<AuditLogEntry> {
    const { dispositivo, navegador, sistemaOperativo } = getClientDeviceInfo();
    return this.logAction(
      usuario,
      'LOGIN',
      `Ingreso exitoso al sistema de control de colchas`,
      undefined,
      {
        dispositivo,
        navegador,
        sistemaOperativo,
        resolucionPantalla: typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : 'N/A'
      }
    );
  }

  /**
   * Obtiene la lista actual de registros en memoria
   */
  public getCachedLogs(): AuditLogEntry[] {
    return this.localLogs;
  }

  /**
   * Resumen analítico de ingresos por usuario (Día y Mes)
   */
  public getUserLoginSummary(logs: AuditLogEntry[], allUsers: UsuarioSTF[]): UserLoginSummary[] {
    const todayKey = new Date().toISOString().split('T')[0];
    const thisMonthKey = todayKey.substring(0, 7);

    // Filtrar únicamente los eventos de LOGIN
    const loginEvents = logs.filter(l => l.tipoAccion === 'LOGIN');

    return allUsers.map(user => {
      const userLogins = loginEvents.filter(l => 
        l.usuarioId.toLowerCase() === user.id.toLowerCase() ||
        l.usuarioNombre.toUpperCase() === user.nombre.toUpperCase()
      );

      const loginsHoy = userLogins.filter(l => l.diaKey === todayKey).length;
      const loginsMes = userLogins.filter(l => l.mesKey === thisMonthKey).length;

      // Último login ordenado por fecha
      const sorted = [...userLogins].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      const ultimo = sorted[0] || null;

      return {
        userId: user.id,
        nombre: user.nombre,
        area: user.area,
        rol: user.rol,
        loginsHoy,
        loginsMes,
        ultimoLogin: ultimo,
        activoHoy: loginsHoy > 0,
        dispositivoReciente: ultimo?.detalles?.dispositivo || ultimo?.detalles?.navegador || 'Sin registro'
      };
    }).sort((a, b) => {
      // Ordenar: primero los que ingresaron hoy, luego por mayor número de ingresos en el mes
      if (a.activoHoy !== b.activoHoy) return a.activoHoy ? -1 : 1;
      if (a.loginsHoy !== b.loginsHoy) return b.loginsHoy - a.loginsHoy;
      return b.loginsMes - a.loginsMes;
    });
  }

  /**
   * Exporta los registros a archivo CSV descargable con codificación UTF-8 BOM
   */
  public exportAuditToCSV(logs: AuditLogEntry[]): void {
    if (typeof window === 'undefined' || logs.length === 0) return;

    const headers = [
      'ID REGISTRO',
      'FECHA Y HORA',
      'USUARIO ID',
      'USUARIO NOMBRE',
      'ROL',
      'AREA',
      'TIPO ACCIÓN',
      'OP AFECTADA',
      'DESCRIPCIÓN',
      'ESTADO ANTERIOR',
      'ESTADO NUEVO',
      'DICTAMEN',
      'OBSERVACIONES',
      'DISPOSITIVO',
      'NAVEGADOR',
      'SISTEMA OPERATIVO'
    ];

    const rows = logs.map(l => [
      `"${l.id}"`,
      `"${l.fechaFormateada}"`,
      `"${l.usuarioId}"`,
      `"${l.usuarioNombre}"`,
      `"${l.usuarioRol}"`,
      `"${l.usuarioArea}"`,
      `"${l.tipoAccion}"`,
      `"${l.opAfectada || ''}"`,
      `"${(l.descripcion || '').replace(/"/g, '""')}"`,
      `"${l.detalles?.estadoAnterior || ''}"`,
      `"${l.detalles?.estadoNuevo || ''}"`,
      `"${l.detalles?.dictamen || ''}"`,
      `"${(l.detalles?.observaciones || '').replace(/"/g, '""')}"`,
      `"${l.detalles?.dispositivo || ''}"`,
      `"${l.detalles?.navegador || ''}"`,
      `"${l.detalles?.sistemaOperativo || ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `STF_AUDITORIA_HISTORIAL_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const auditService = new AuditService();
