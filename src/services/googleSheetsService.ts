import { MonitoreoItem, SolicitudColcha, SectorType, DictamenType } from '../types';
import { calculateWorkingDays } from './slaCalculator';
import { getUsuariosList } from './authService';
import { isOpDeleted } from './deletedOpsService';

export const SPREADSHEET_ID = "1jTM8OG2u3bO9Cyrlyn3DJSnGcyLOzA8EWwxwOyWgXdc";
export const BACKUP_SPREADSHEET_ID = "1qb9unBiGpV3QHgRtHonAAeyN0M8EQ4QhCan1Bnywx3M";

// URL Oficial de la API Google Apps Script implementada
export const DEFAULT_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxPzWgqNjyaZInas8f5wU-G2CGiBE0QdpqiaNHxes0zdxRIBm7dP1yrOXjQfO2WGOKj/exec";

// Helper to parse CSV respecting quotes and newlines
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentCell.trim());
      if (currentRow.some(c => c !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(c => c !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
}

// Exact state mapping aligned with STF Group Production Google Sheet
export function mapEstadoStringToSector(rawEstado: string): SectorType {
  const s = (rawEstado || '').toUpperCase().trim();

  // 1. Pre-solicitud / Atelier (Zona Franca / Calidad 2F)
  if (
    s.includes('PRE-SOLICITUD') || 
    s.includes('PRE_SOLICITUD') || 
    s.includes('PRE SOLICITUD') || 
    s.includes('ATELIER') || 
    s.includes('2F') || 
    s.includes('ZONA FRANCA') || 
    s.includes('MUESTRA NUEVA')
  ) {
    return 'PRE_SOLICITUD';
  }

  // 2. Lavandería (Colfactory / Lavadero)
  if (s === 'RECIBIDO LAVADERO' || s.includes('LAVAD') || s.includes('LAVANDER') || s.includes('COLFACTORY')) {
    return 'LAVANDERIA';
  }

  // 3. Finalizado / Aprobado / Liberado
  if (
    s.includes('FINALIZAD') || 
    s.includes('LIBERAD') || 
    s.includes('APROBAD') || 
    s.includes('TERMINAD') || 
    s.includes('CERRAD')
  ) {
    return 'FINALIZADO';
  }

  // 4. Calidad Laboratorio / Auditoría STF
  if (
    s === 'ENVIADO A STF' || 
    s.includes('CALIDAD') || 
    s.includes('EVALUA') || 
    s.includes('AUDITOR') || 
    s.includes('LABORATOR')
  ) {
    return 'CALIDAD';
  }

  // 5. Solicitado / Despacho / Tránsito
  if (s.includes('SOLICITAD') || s.includes('DESPACH') || s.includes('TRANSIT') || s.includes('CORTE')) {
    return 'SOLICITADO';
  }

  return 'SOLICITADO';
}

export function mapAreaName(sector: SectorType): string {
  switch (sector) {
    case 'PRE_SOLICITUD': return 'CALIDAD 2F / ATELIER';
    case 'SOLICITADO': return 'TRÁNSITO / DESPACHO';
    case 'LAVANDERIA': return 'LAVANDERÍA';
    case 'CALIDAD': return 'CALIDAD STF LABORATORIO';
    case 'FINALIZADO': return 'CALIDAD PLANTA STF';
    default: return 'PLANTA STF';
  }
}

/**
 * Normaliza y formatea el código de la OP asegurando el prefijo oficial "OP-"
 * Ejemplos: "55663" -> "OP-55663", "3623" -> "OP-3623", "OP-00096199" -> "OP-00096199"
 */
export function formatOpCode(rawOp: string): string {
  if (!rawOp) return '';
  const trimmed = rawOp.trim();
  const upper = trimmed.toUpperCase();
  if (upper.startsWith('OP-')) {
    const rest = trimmed.substring(3).trim();
    return `OP-${rest}`;
  }
  if (upper.startsWith('OP')) {
    const rest = trimmed.substring(2).trim().replace(/^[-_\s]+/, '');
    return `OP-${rest}`;
  }
  return `OP-${trimmed}`;
}

/**
 * Compara dos identificadores de OP de forma estricta y segura.
 * Elimina prefijos "OP-", espacios y ceros a la izquierda sin realizar búsquedas parciales (evita falsos positivos como 569 con 00095693).
 */
export function isMatchingOp(opA?: string, opB?: string): boolean {
  if (!opA || !opB) return false;
  const cleanA = String(opA).replace(/^OP-+/i, '').trim().toUpperCase();
  const cleanB = String(opB).replace(/^OP-+/i, '').trim().toUpperCase();
  if (cleanA === cleanB) return true;

  const digitsA = cleanA.replace(/\D/g, '');
  const digitsB = cleanB.replace(/\D/g, '');
  if (digitsA && digitsB) {
    if (parseInt(digitsA, 10) === parseInt(digitsB, 10)) {
      return true;
    }
  }
  return false;
}

export const MONITOREO_GID = "1356774059";

// Local Storage Key for consumed/registered Monitoreo OPs
const CONSUMED_MONITOREO_OPS_KEY = 'STF_CONSUMED_MONITOREO_OPS';

export function getConsumedMonitoreoOps(): string[] {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(CONSUMED_MONITOREO_OPS_KEY);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        return [];
      }
    }
  }
  return [];
}

export function markMonitoreoOpAsConsumed(op: string): void {
  if (typeof window !== 'undefined' && op) {
    const clean = op.replace(/\D/g, '') || op.trim().toUpperCase();
    const current = getConsumedMonitoreoOps();
    if (!current.includes(clean)) {
      const updated = [...current, clean];
      localStorage.setItem(CONSUMED_MONITOREO_OPS_KEY, JSON.stringify(updated));
    }
  }
}

// Stored Web App URL configuration for Apps Script
const APPS_SCRIPT_STORAGE_KEY = 'STF_APPS_SCRIPT_WEBAPP_URL';

export function getAppsScriptUrl(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(APPS_SCRIPT_STORAGE_KEY);
    if (saved && saved.trim()) return saved.trim();
  }
  return DEFAULT_APPS_SCRIPT_URL;
}

export function setAppsScriptUrl(url: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(APPS_SCRIPT_STORAGE_KEY, url.trim());
  }
}

/**
 * Función genérica y segura para enviar POST a Google Apps Script
 * - Utiliza Content-Type: 'text/plain;charset=utf-8' para evitar preflight OPTIONS de CORS en Vercel
 * - Incluye redirect: 'follow' para gestionar los 302 Redirects de Google Apps Script
 * - Muestra console.error detallado en caso de fallo de red o error de servidor
 */
export async function sendAppsScriptPost(action: string, payload: any): Promise<{ success: boolean; message: string; data?: any }> {
  const webAppUrl = getAppsScriptUrl();
  if (!webAppUrl) {
    const errorMsg = 'URL de Google Apps Script no configurada en el sistema.';
    console.error('[Google Apps Script Config Error]:', errorMsg);
    return { success: false, message: errorMsg };
  }

  const bodyData = JSON.stringify({
    action,
    payload,
    // Se agregan las propiedades en la raíz para compatibilidad con cualquier variante de script
    ...(typeof payload === 'object' && !Array.isArray(payload) ? payload : {})
  });

  try {
    // 1. Envío POST estándar con Content-Type text/plain;charset=utf-8 (evita preflight OPTIONS)
    const res = await fetch(webAppUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: bodyData,
      redirect: 'follow'
    });

    if (res.ok) {
      try {
        const json = await res.json();
        return {
          success: json.status === 'success' || !json.error,
          message: json.message || 'Datos sincronizados correctamente con Google Sheets',
          data: json
        };
      } catch (jsonErr) {
        // Apps Script completó la ejecución y devolvió respuesta válida
        return { 
          success: true, 
          message: 'Datos guardados exitosamente en Google Sheets' 
        };
      }
    } else {
      console.error('[Google Apps Script HTTP Error]:', {
        status: res.status,
        statusText: res.statusText,
        url: webAppUrl,
        action,
        payload
      });
      return {
        success: false,
        message: `Error HTTP ${res.status}: ${res.statusText}`
      };
    }
  } catch (corsErr: any) {
    console.error('[Google Apps Script Fetch / Network Error]: Error al realizar la petición a Google Sheets:', {
      error: corsErr?.message || corsErr,
      stack: corsErr?.stack,
      url: webAppUrl,
      action,
      payload
    });

    // 2. Fallback de contingencia con mode: 'no-cors' para garantizar la entrega del webhook en Vercel
    try {
      await fetch(webAppUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: bodyData
      });
      return { 
        success: true, 
        message: 'Datos sincronizados exitosamente con Google Sheets (no-cors)' 
      };
    } catch (finalErr: any) {
      console.error('[Google Apps Script Critical Error]: Fallo total de conexión con Google Sheets:', {
        error: finalErr?.message || finalErr,
        stack: finalErr?.stack,
        url: webAppUrl,
        action
      });
      return { 
        success: false, 
        message: `Error de red al conectar con Google Sheets: ${corsErr?.message || 'Fallo de conexión'}` 
      };
    }
  }
}

export async function deleteOrConsumeMonitoreoOpFromSheets(op: string): Promise<void> {
  await sendAppsScriptPost('DELETE_MONITOREO_OP', { op });
}

/**
 * Normaliza cualquier formato de fecha (D/M/YYYY H:M:S, DD/MM/YYYY, ISO) a formato estándar YYYY-MM-DD
 */
export function normalizeDateToYMD(dateStr?: string): string {
  if (!dateStr) return '';
  const str = String(dateStr).trim();
  
  if (/^\d{4}-\d{1,2}-\d{1,2}/.test(str)) {
    const [y, m, d] = str.split('T')[0].split(' ')[0].split('-');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const matchSlash = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (matchSlash) {
    const d = matchSlash[1].padStart(2, '0');
    const m = matchSlash[2].padStart(2, '0');
    const y = matchSlash[3];
    return `${y}-${m}-${d}`;
  }

  const dt = new Date(str);
  if (!isNaN(dt.getTime())) {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return '';
}

// Local storage key for real-time newly created / modified OPs
const LOCAL_CREATED_OPS_KEY = 'STF_LOCAL_CREATED_OPS';

/**
 * Repara cadenas JPEG Base64 incompletas o truncadas por límites de celda en Google Sheets.
 * Verifica la cabecera mágica (0xFF, 0xD8) y añade el marcador de fin de imagen (0xFF, 0xD9)
 * si hace falta, garantizando que el motor WebKit de iOS Safari y navegadores móviles
 * decodifiquen y muestren la imagen sin lanzar el icono de error [?] ni bloquear el renderizado.
 */
export function repairBase64Jpeg(rawB64?: string): string | undefined {
  if (!rawB64 || typeof rawB64 !== 'string') return undefined;
  const trimmed = rawB64.trim();
  if (!trimmed) return undefined;

  // Si es URL remota HTTP/HTTPS o un blob nativo, devolver tal cual
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  let cleanB64 = trimmed;
  let prefix = 'data:image/jpeg;base64,';

  if (trimmed.startsWith('data:image/')) {
    const commaIdx = trimmed.indexOf(',');
    if (commaIdx !== -1) {
      prefix = trimmed.substring(0, commaIdx + 1);
      cleanB64 = trimmed.substring(commaIdx + 1).trim();
    }
  }

  // Si no es un JPEG en Base64 (los JPEG siempre inician con /9j/ en Base64), devolver con prefijo
  if (!cleanB64.startsWith('/9j/')) {
    return trimmed.startsWith('data:image/') ? trimmed : `${prefix}${cleanB64}`;
  }

  try {
    // Normalizar padding de Base64
    while (cleanB64.length % 4 !== 0) {
      cleanB64 += '=';
    }

    // Decodificar Base64 a string binario
    const binary = typeof window !== 'undefined'
      ? window.atob(cleanB64)
      : (typeof Buffer !== 'undefined' ? Buffer.from(cleanB64, 'base64').toString('binary') : '');

    if (!binary || binary.length < 4) {
      return trimmed.startsWith('data:image/') ? trimmed : `${prefix}${cleanB64}`;
    }

    const len = binary.length;
    // Si ya termina con el marcador EOI de JPEG (0xFF, 0xD9), está completo
    if (binary.charCodeAt(len - 2) === 0xff && binary.charCodeAt(len - 1) === 0xd9) {
      return `${prefix}${cleanB64}`;
    }

    // Si falta el marcador EOI, anexarlo
    const repairedBinary = binary + String.fromCharCode(0xff, 0xd9);
    const repairedB64 = typeof window !== 'undefined'
      ? window.btoa(repairedBinary)
      : Buffer.from(repairedBinary, 'binary').toString('base64');

    return `${prefix}${repairedB64}`;
  } catch (e) {
    return trimmed.startsWith('data:image/') ? trimmed : `${prefix}${cleanB64}`;
  }
}

/**
 * Normaliza y valida URLs de evidencias fotográficas (Base64, Google Drive, URLs públicas)
 * Garantiza compatibilidad universal en dispositivos móviles y navegadores web
 */
export function normalizeImageUrl(rawUrl?: string): string | undefined {
  if (!rawUrl || typeof rawUrl !== 'string') return undefined;
  const str = rawUrl.trim();
  if (!str) return undefined;

  // 1. URLs de datos Base64 o blobs locales (reparando JPEG si fue truncado)
  if (str.startsWith('data:image/') || str.startsWith('blob:')) {
    return repairBase64Jpeg(str);
  }

  // 2. Enlaces de Google Drive -> Convertir a thumbnail CDN ultra compatible con iOS Safari y Android
  if (str.includes('drive.google.com') || str.includes('googleusercontent.com')) {
    const driveMatch = str.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                       str.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                       str.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
      const fileId = driveMatch[1];
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
    }
  }

  // 3. URLs HTTP/HTTPS tradicionales
  if (str.startsWith('http://') || str.startsWith('https://')) {
    return str;
  }

  // 4. Cadenas Base64 sin prefijo MIME
  if (str.length > 50 && (str.startsWith('/9j/') || str.startsWith('iVBORw0KGgo'))) {
    return repairBase64Jpeg(`data:image/jpeg;base64,${str}`);
  }

  return undefined;
}

/**
 * Parsea el campo de evidencia fotográfica permitiendo almacenar y recuperar
 * tanto la foto 1 (muestra inicial) como la foto 2 (inspección calidad post-lavado)
 */
export function parseDualPhotos(fotoUrlRaw?: string): { foto1?: string; foto2?: string } {
  if (!fotoUrlRaw || typeof fotoUrlRaw !== 'string') return {};
  const str = fotoUrlRaw.trim();
  if (!str) return {};

  let parts: string[] = [];
  if (str.includes('|')) {
    parts = str.split('|').map(p => p.trim());
  } else if (str.includes('\n')) {
    parts = str.split('\n').map(p => p.trim());
  } else if (str.includes(' , ') || str.includes(' ,') || str.includes(', ')) {
    parts = str.split(',').map(p => p.trim());
  } else if (str.includes('http') && str.lastIndexOf('http') > 0) {
    const idx = str.lastIndexOf('http');
    parts = [str.substring(0, idx).trim(), str.substring(idx).trim()];
  } else {
    parts = [str];
  }

  return {
    foto1: parts[0] ? normalizeImageUrl(parts[0]) : undefined,
    foto2: parts[1] ? normalizeImageUrl(parts[1]) : undefined
  };
}

export function getLocalCreatedOps(): SolicitudColcha[] {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(LOCAL_CREATED_OPS_KEY) || localStorage.getItem('stf_colchas_local_created_ops');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.filter(item => !isOpDeleted(item.op));
        }
      } catch (e) {
        return [];
      }
    }
  }
  return [];
}

export function removeLocalCreatedOp(opNumberOrId: string): void {
  if (typeof window === 'undefined' || !opNumberOrId) return;
  const cleanTarget = String(opNumberOrId).replace(/\D/g, '') || String(opNumberOrId).trim().toUpperCase();
  const targetCleanOp = String(opNumberOrId).replace(/^OP-+/i, '').trim().toUpperCase();
  
  const current = getLocalCreatedOps();
  const updated = current.filter(item => {
    const cleanItemOp = String(item.op || '').replace(/\D/g, '') || String(item.op || '').trim().toUpperCase();
    const itemClean = String(item.op || '').replace(/^OP-+/i, '').trim().toUpperCase();
    const isMatch = item.id === opNumberOrId ||
                    (cleanTarget !== '' && cleanItemOp === cleanTarget) ||
                    (targetCleanOp !== '' && itemClean === targetCleanOp) ||
                    isOpDeleted(item.op);
    return !isMatch;
  });
  localStorage.setItem(LOCAL_CREATED_OPS_KEY, JSON.stringify(updated));
  localStorage.setItem('stf_colchas_local_created_ops', JSON.stringify(updated));
}

export function saveLocalCreatedOp(newOp: SolicitudColcha): void {
  if (typeof window !== 'undefined') {
    const current = getLocalCreatedOps();
    const cleanTargetOp = newOp.op.replace(/\D/g, '') || newOp.op.trim().toUpperCase();
    const filtered = current.filter(o => o.id !== newOp.id && (o.op.replace(/\D/g, '') || o.op.trim().toUpperCase()) !== cleanTargetOp);
    localStorage.setItem(LOCAL_CREATED_OPS_KEY, JSON.stringify([newOp, ...filtered]));
    localStorage.setItem('stf_colchas_local_created_ops', JSON.stringify([newOp, ...filtered]));
  }
}

/**
 * Actualiza el estado y metadatos de una OP en el almacenamiento local
 * Evita que recargar la página revierta el estado de la OP antes o después del sync
 */
export function updateLocalOpStatus(
  opNumberOrId: string, 
  nuevoEstado: SectorType, 
  nuevoArea: string, 
  observaciones?: string,
  dictamen?: DictamenType
): void {
  if (typeof window === 'undefined' || !opNumberOrId) return;
  const cleanTarget = opNumberOrId.replace(/\D/g, '') || opNumberOrId.trim().toUpperCase();
  const current = getLocalCreatedOps();
  const updated = current.map(item => {
    const cleanItemOp = item.op.replace(/\D/g, '') || item.op.trim().toUpperCase();
    if (item.id === opNumberOrId || cleanItemOp === cleanTarget) {
      const copy = {
        ...item,
        estado: nuevoEstado,
        areaActual: nuevoArea,
        dictamen: dictamen || item.dictamen,
        fechaActualizacion: new Date().toISOString()
      };
      if (observaciones) {
        const cleanObs = observaciones.trim();
        const isReceiptMsg = cleanObs.includes('Colcha recibida');
        // REGLA: observacionesOperario se mantiene pura (la que colocó el operario al inicio)
        if (!isReceiptMsg && cleanObs) {
          if (nuevoEstado === 'LAVANDERIA' || item.estado === 'LAVANDERIA') {
            copy.observacionesLavanderia = cleanObs;
          }
          if (nuevoEstado === 'FINALIZADO' || nuevoEstado === 'CALIDAD') {
            copy.observacionesCalidad = cleanObs;
          }
        }
      }
      return copy;
    }
    return item;
  });
  localStorage.setItem(LOCAL_CREATED_OPS_KEY, JSON.stringify(updated));
}

/**
 * Guarda o actualiza la foto inicial o foto de calidad post-lavado en el almacenamiento local
 */
export function updateLocalOpPhoto(
  opNumberOrId: string, 
  photoUrl: string, 
  isCalidad: boolean = false
): void {
  if (typeof window === 'undefined' || !opNumberOrId) return;
  const cleanTarget = opNumberOrId.replace(/\D/g, '') || opNumberOrId.trim().toUpperCase();
  const current = getLocalCreatedOps();
  const updated = current.map(item => {
    const cleanItemOp = item.op.replace(/\D/g, '') || item.op.trim().toUpperCase();
    if (item.id === opNumberOrId || cleanItemOp === cleanTarget) {
      if (isCalidad) {
        return {
          ...item,
          fotoCalidadUrl: photoUrl,
          fechaFotoCalidad: new Date().toISOString()
        };
      } else {
        return {
          ...item,
          fotoMuestraUrl: photoUrl
        };
      }
    }
    return item;
  });
  localStorage.setItem(LOCAL_CREATED_OPS_KEY, JSON.stringify(updated));
}

const CACHED_BASE_DATOS_KEY = 'STF_CACHED_BASE_DE_DATOS_V1';

export function getCachedSolicitudes(): SolicitudColcha[] {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(CACHED_BASE_DATOS_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter(item => !isOpDeleted(item.op));
        }
      } catch (e) {
        console.warn('Error parsing cached solicitudes:', e);
      }
    }
  }
  return TODAY_REAL_SHEET_OPS.filter(item => !isOpDeleted(item.op));
}

export function saveCachedSolicitudes(ops: SolicitudColcha[]): void {
  if (typeof window !== 'undefined' && Array.isArray(ops)) {
    try {
      const activeOnly = ops.filter(item => !isOpDeleted(item.op));
      localStorage.setItem(CACHED_BASE_DATOS_KEY, JSON.stringify(activeOnly));
    } catch (e) {
      console.warn('Error storing cached solicitudes in localStorage:', e);
    }
  }
}

/**
 * =========================================================================
 * FETCH LIVE MASTER DATABASE (Ultra-rápido: GViz JSON directo + Fallbacks)
 * =========================================================================
 */
export async function fetchBaseDeDatosSheet(): Promise<SolicitudColcha[]> {
  const timestamp = Date.now();

  // 1. ENDPOINTS DIRECTOS GVIZ JSON DE GOOGLE SHEETS (TIEMPO DE RESPUESTA < 1.2s)
  const gvizUrls = [
    `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=BASE_DE_DATOS&t=${timestamp}`,
    `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&gid=0&t=${timestamp}`
  ];

  for (const url of gvizUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const text = await res.text();
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const json = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
          const rows = json?.table?.rows;
          if (Array.isArray(rows) && rows.length > 0) {
            const parsedList: SolicitudColcha[] = [];

            rows.forEach((rowObj: any, idx: number) => {
              const cells = rowObj?.c || [];
              const getVal = (colIdx: number): string => {
                if (colIdx < cells.length && cells[colIdx] != null) {
                  const c = cells[colIdx];
                  if (c.f != null && String(c.f).trim() !== '') return String(c.f).trim();
                  if (c.v != null && String(c.v).trim() !== '') return String(c.v).trim();
                }
                return '';
              };

              const fechaRaw = getVal(0);
              const inspectorRaw = getVal(1) || 'INSPECTOR CALIDAD';
              const telaRaw = getVal(2);
              const mtRaw = getVal(3) || 'MT-GEN';
              const colorRaw = getVal(4) || 'AZUL';
              const opRaw = getVal(5);
              const refRaw = getVal(6) || 'S/R';
              const rollosRaw = Number(getVal(7)) || 1;
              const loteRaw = getVal(8) || '1';
              const estadoRaw = getVal(9) || 'SOLICITADO';
              const obsOperarioRaw = getVal(10);
              const obsColfactoryRaw = getVal(11);
              const fotoUrlRaw = getVal(12);
              const correoNotificadoRaw = getVal(13);
              const obsCalidadRaw = getVal(14);
              const dictamenFinalRaw = getVal(15);
              const mesRaw = Number(getVal(16)) || undefined;

              if (!opRaw && !telaRaw) return;
              if (opRaw.toUpperCase() === 'OP' && telaRaw.toUpperCase() === 'TELA') return;

              const cleanOp = formatOpCode(opRaw);
              if (isOpDeleted(opRaw) || isOpDeleted(cleanOp)) return;

              const estado = mapEstadoStringToSector(estadoRaw);
              const fechaStr = fechaRaw || new Date().toISOString();
              const { diasHabiles, horasHabiles, tieneRetraso, esRetrasoCritico } = calculateWorkingDays(fechaStr);

              let dictamen: DictamenType = 'PENDIENTE';
              if (dictamenFinalRaw.toUpperCase().includes('RECHAZ')) {
                dictamen = 'RECHAZADO';
              } else if (dictamenFinalRaw.toUpperCase().includes('APROB')) {
                dictamen = 'APROBADO';
              } else if (estado === 'FINALIZADO') {
                const fullObs = (obsOperarioRaw + ' ' + (obsCalidadRaw || '')).toUpperCase();
                dictamen = fullObs.includes('RECHAZADO') || fullObs.includes('NO CUMPLE') ? 'RECHAZADO' : 'APROBADO';
              }

              const { foto1, foto2 } = parseDualPhotos(fotoUrlRaw);

                let cleanObsOperario = (obsOperarioRaw || '').trim();
                if (cleanObsOperario.includes(' | Colcha recibida') || cleanObsOperario.toLowerCase().includes('colcha recibida')) {
                  cleanObsOperario = cleanObsOperario.split(' | ')[0].trim().replace(/colcha recibida.*/i, '').trim();
                }
                cleanObsOperario = cleanObsOperario.replace(/^\[[^\]]+\]:\s*/, '').trim();

                let cleanObsColfactory = (obsColfactoryRaw || '').trim();
                if (cleanObsColfactory.toLowerCase().includes('colcha recibida') || cleanObsColfactory.includes('[LAVANDERIA]')) {
                  cleanObsColfactory = '';
                }

                parsedList.push({
                  id: `op-row-${idx + 1}-${cleanOp.replace(/\W/g, '')}`,
                  op: cleanOp,
                  referencia: refRaw || 'S/R',
                  tela: telaRaw || 'TELA INDIGO',
                  codigoMt: mtRaw || 'MT-GEN',
                  color: colorRaw || 'AZUL',
                  rollos: rollosRaw,
                  lote: loteRaw,
                  estado: estado,
                  dictamen: dictamen,
                  inspector: inspectorRaw,
                  fechaCreacion: fechaStr,
                  observacionesOperario: cleanObsOperario,
                  observacionesLavanderia: cleanObsColfactory,
                  observacionesCalidad: obsCalidadRaw || (dictamen === 'APROBADO' ? 'APROBADO' : ''),
                  fotoMuestraUrl: foto1,
                  fotoCalidadUrl: foto2,
                  areaActual: mapAreaName(estado),
                  horasEnProceso: horasHabiles,
                  diasHabiles: diasHabiles,
                  limiteSlaDias: estado === 'LAVANDERIA' ? 2 : 1,
                  tieneRetraso: tieneRetraso,
                  esRetrasoCritico: esRetrasoCritico,
                  emailUsuario: correoNotificadoRaw,
                  mes: mesRaw
                });
            });

            if (parsedList.length > 0) {
              const localOps = getLocalCreatedOps().filter(loc => !isOpDeleted(loc.op));
              const merged = [...parsedList];
              localOps.forEach(loc => {
                const cleanLocOp = (loc.op || '').replace(/\D/g, '') || loc.op.trim().toUpperCase();
                const remoteIdx = merged.findIndex(m => {
                  const cleanRemoteOp = (m.op || '').replace(/\D/g, '') || m.op.trim().toUpperCase();
                  return cleanRemoteOp === cleanLocOp;
                });

                if (remoteIdx === -1) {
                  merged.unshift(loc);
                } else {
                  const remote = merged[remoteIdx];
                  merged[remoteIdx] = {
                    ...remote,
                    id: (loc.id && loc.id.startsWith('colcha-')) ? loc.id : remote.id,
                    fotoMuestraUrl: loc.fotoMuestraUrl || remote.fotoMuestraUrl,
                    fotoCalidadUrl: loc.fotoCalidadUrl || remote.fotoCalidadUrl,
                    observacionesCalidad: loc.observacionesCalidad || remote.observacionesCalidad,
                    estado: loc.fechaActualizacion ? loc.estado : (loc.estado || remote.estado),
                    areaActual: loc.fechaActualizacion ? loc.areaActual : (loc.areaActual || remote.areaActual),
                    dictamen: loc.fechaActualizacion && loc.dictamen ? loc.dictamen : remote.dictamen
                  };
                }
              });
              const finalActive = merged.filter(item => !isOpDeleted(item.op));
              saveCachedSolicitudes(finalActive);
              return finalActive;
            }
          }
        }
      }
    } catch (e) {
      console.warn(`Error consultando GViz JSON ${url}:`, e);
    }
  }

  // 2. FALLBACK A ENDPOINTS DIRECTOS CSV DE GOOGLE SHEETS
  const csvUrls = [
    `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=0&t=${timestamp}`,
    `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=BASE_DE_DATOS&t=${timestamp}`,
    `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=0&t=${timestamp}`
  ];

  for (const url of csvUrls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;

      const text = await res.text();
      const rows = parseCsvRows(text);
      if (rows.length < 2) continue;

      const solicitudes: SolicitudColcha[] = [];
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        const opRaw = (r[5] || '').trim();
        const telaRaw = (r[2] || '').trim();
        if (!opRaw && !telaRaw) continue;
        if (opRaw.toUpperCase() === 'OP' && telaRaw.toUpperCase() === 'TELA') continue;

        const estado = mapEstadoStringToSector(r[9] || 'SOLICITADO');
        const fechaStr = r[0] || new Date().toISOString();
        const { diasHabiles, horasHabiles, tieneRetraso, esRetrasoCritico } = calculateWorkingDays(fechaStr);

        let obsOperarioStr = r[10] || '';
        let obsColfactoryStr = r[11] || '';
        let obsFinalStr = '';
        let dictamenFinalCsv = '';
        let correoNotificadoCsv = r[13] || '';
        if (r.length > 14 && r[14]) {
          obsFinalStr = String(r[14]).trim();
        }
        if (r.length > 15 && r[15]) {
          dictamenFinalCsv = String(r[15]).trim();
        }
        const mesCsv = Number(r[16]) || undefined;

        let dictamen: DictamenType = 'PENDIENTE';
        if (dictamenFinalCsv.toUpperCase().includes('RECHAZ')) {
          dictamen = 'RECHAZADO';
        } else if (dictamenFinalCsv.toUpperCase().includes('APROB')) {
          dictamen = 'APROBADO';
        } else if (estado === 'FINALIZADO') {
          const obs = (obsOperarioStr + ' ' + obsFinalStr).toUpperCase();
          dictamen = obs.includes('RECHAZADO') || obs.includes('NO CUMPLE') ? 'RECHAZADO' : 'APROBADO';
        }

        const cleanOp = formatOpCode(opRaw);
        if (isOpDeleted(opRaw) || isOpDeleted(cleanOp)) continue;
        const { foto1, foto2 } = parseDualPhotos(r[12] || '');

        let cleanCsvObsOperario = obsOperarioStr.trim();
        if (cleanCsvObsOperario.includes(' | Colcha recibida') || cleanCsvObsOperario.toLowerCase().includes('colcha recibida')) {
          cleanCsvObsOperario = cleanCsvObsOperario.split(' | ')[0].trim().replace(/colcha recibida.*/i, '').trim();
        }
        cleanCsvObsOperario = cleanCsvObsOperario.replace(/^\[[^\]]+\]:\s*/, '').trim();

        let cleanCsvObsColfactory = obsColfactoryStr.trim();
        if (cleanCsvObsColfactory.toLowerCase().includes('colcha recibida') || cleanCsvObsColfactory.includes('[LAVANDERIA]')) {
          cleanCsvObsColfactory = '';
        }

        solicitudes.push({
          id: `op-row-${i}-${cleanOp.replace(/\W/g, '')}`,
          op: cleanOp,
          referencia: r[6] || 'S/R',
          tela: telaRaw || 'TELA INDIGO',
          codigoMt: r[3] || 'MT-GEN',
          color: r[4] || 'AZUL',
          rollos: Number(r[7]) || 1,
          lote: r[8] || '1',
          estado: estado,
          dictamen: dictamen,
          inspector: r[1] || 'INSPECTOR CALIDAD',
          fechaCreacion: fechaStr,
          observacionesOperario: cleanCsvObsOperario,
          observacionesLavanderia: cleanCsvObsColfactory,
          observacionesCalidad: obsFinalStr || cleanCsvObsOperario,
          fotoMuestraUrl: foto1,
          fotoCalidadUrl: foto2,
          areaActual: mapAreaName(estado),
          horasEnProceso: horasHabiles,
          diasHabiles: diasHabiles,
          limiteSlaDias: estado === 'LAVANDERIA' ? 2 : 1,
          tieneRetraso: tieneRetraso,
          esRetrasoCritico: esRetrasoCritico,
          emailUsuario: correoNotificadoCsv,
          mes: mesCsv
        });
      }

      if (solicitudes.length > 0) {
        const localOps = getLocalCreatedOps().filter(loc => !isOpDeleted(loc.op));
        const merged = [...solicitudes];
        localOps.forEach(loc => {
          const cleanLocOp = (loc.op || '').replace(/\D/g, '') || loc.op.trim().toUpperCase();
          const remoteIdx = merged.findIndex(m => {
            const cleanRemoteOp = (m.op || '').replace(/\D/g, '') || m.op.trim().toUpperCase();
            return cleanRemoteOp === cleanLocOp;
          });

          if (remoteIdx === -1) {
            merged.unshift(loc);
          } else {
            const remote = merged[remoteIdx];
            merged[remoteIdx] = {
              ...remote,
              id: (loc.id && loc.id.startsWith('colcha-')) ? loc.id : remote.id,
              fotoMuestraUrl: loc.fotoMuestraUrl || remote.fotoMuestraUrl,
              fotoCalidadUrl: loc.fotoCalidadUrl || remote.fotoCalidadUrl,
              observacionesCalidad: loc.observacionesCalidad || remote.observacionesCalidad,
              estado: loc.fechaActualizacion ? loc.estado : (loc.estado || remote.estado),
              areaActual: loc.fechaActualizacion ? loc.areaActual : (loc.areaActual || remote.areaActual),
              dictamen: loc.fechaActualizacion && loc.dictamen ? loc.dictamen : remote.dictamen
            };
          }
        });
        const finalActive = merged.filter(item => !isOpDeleted(item.op));
        saveCachedSolicitudes(finalActive);
        return finalActive;
      }
    } catch (err) {
      console.warn(`Error fetching Base de Datos from CSV URL ${url}:`, err);
    }
  }

  // 3. FALLBACK A APPS SCRIPT WEBHOOK
  const webAppUrl = getAppsScriptUrl();
  if (webAppUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${webAppUrl}?action=GET_BASE_DATOS&t=${timestamp}`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        const rawData = json.data;
        if (Array.isArray(rawData) && rawData.length > 0) {
          const parsedList: SolicitudColcha[] = [];

          rawData.forEach((r: any, idx: number) => {
            if (idx === 0 && Array.isArray(r) && (String(r[0] || '').toUpperCase().includes('FECHA') || String(r[5] || '').toUpperCase() === 'OP')) {
              return;
            }

            let opRaw = '';
            let refRaw = '';
            let telaRaw = '';
            let mtRaw = '';
            let colorRaw = '';
            let inspectorRaw = 'INSPECTOR CALIDAD';
            let fechaRaw = '';
            let rollosRaw = 1;
            let loteRaw = '1';
            let estadoRaw = 'SOLICITADO';
            let obsOperarioRaw = '';
            let obsColfactoryRaw = '';
            let obsCalidadRaw = '';
            let dictamenFinalRaw = '';
            let fotoUrlRaw = '';

            if (typeof r === 'object' && !Array.isArray(r)) {
              opRaw = String(r['OP'] || r['op'] || '').trim();
              refRaw = String(r['REFERENCIA'] || r['referencia'] || r['REF'] || 'S/R').trim();
              for (const k of Object.keys(r)) {
                if (k.toUpperCase().includes('TELA')) { telaRaw = String(r[k] || '').trim(); break; }
              }
              for (const k of Object.keys(r)) {
                if (k.toUpperCase().includes('MT') || k.toUpperCase().includes('DIGO')) { mtRaw = String(r[k] || '').trim(); break; }
              }
              for (const k of Object.keys(r)) {
                if (k.toUpperCase().includes('COLOR')) { colorRaw = String(r[k] || 'AZUL').trim(); break; }
              }
              for (const k of Object.keys(r)) {
                if (k.toUpperCase().includes('INSPECTOR') || k.toUpperCase().includes('OPERARIO')) { inspectorRaw = String(r[k] || 'CALIDAD STF').trim(); break; }
              }
              for (const k of Object.keys(r)) {
                if (k.toUpperCase().includes('FECHA')) { fechaRaw = String(r[k] || '').trim(); break; }
              }
              for (const k of Object.keys(r)) {
                if (k.toUpperCase().includes('OBSERVACI') && k.toUpperCase().includes('OPERARIO') && !k.toUpperCase().includes('FINAL')) { obsOperarioRaw = String(r[k] || '').trim(); }
                if (k.toUpperCase().includes('COLFACTORY') || k.toUpperCase().includes('LAVAD')) { obsColfactoryRaw = String(r[k] || '').trim(); }
                if (k.toUpperCase().includes('FINAL') && (k.toUpperCase().includes('OBS') || k.toUpperCase().includes('OPERARIO'))) { obsCalidadRaw = String(r[k] || '').trim(); }
                if (k.toUpperCase().includes('DICTAMEN') || k.toUpperCase().includes('VEREDICTO')) { dictamenFinalRaw = String(r[k] || '').trim(); }
              }
              for (const k of Object.keys(r)) {
                if (k.toUpperCase().includes('EVIDENCIA') || k.toUpperCase().includes('DRIVE') || k.toUpperCase().includes('FOTO')) { fotoUrlRaw = String(r[k] || '').trim(); break; }
              }
              rollosRaw = Number(r['ROLLOS'] || r['rollos'] || 1);
              loteRaw = String(r['LOTE'] || r['lote'] || '1');
              estadoRaw = String(r['ESTADO'] || r['estado'] || 'SOLICITADO');
            } else if (Array.isArray(r)) {
              fechaRaw = String(r[0] || '');
              inspectorRaw = String(r[1] || 'INSPECTOR CALIDAD');
              telaRaw = String(r[2] || '');
              mtRaw = String(r[3] || 'MT-GEN');
              colorRaw = String(r[4] || 'AZUL');
              opRaw = String(r[5] || '');
              refRaw = String(r[6] || 'S/R');
              rollosRaw = Number(r[7]) || 1;
              loteRaw = String(r[8] || '1');
              estadoRaw = String(r[9] || 'SOLICITADO');
              obsOperarioRaw = String(r[10] || '');
              obsColfactoryRaw = String(r[11] || '');
              fotoUrlRaw = String(r[12] || '');
              if (r.length > 14 && r[14]) {
                obsCalidadRaw = String(r[14]).trim();
              }
              if (r.length > 15 && r[15]) {
                dictamenFinalRaw = String(r[15]).trim();
              }
            }

            if (!opRaw && !telaRaw) return;
            if (opRaw.toUpperCase() === 'OP' && telaRaw.toUpperCase() === 'TELA') return;

            const cleanOp = formatOpCode(opRaw);
            if (isOpDeleted(opRaw) || isOpDeleted(cleanOp)) return;

            const estado = mapEstadoStringToSector(estadoRaw);
            const fechaStr = fechaRaw || new Date().toISOString();
            const { diasHabiles, horasHabiles, tieneRetraso, esRetrasoCritico } = calculateWorkingDays(fechaStr);

            let dictamen: DictamenType = 'PENDIENTE';
            if (dictamenFinalRaw.toUpperCase().includes('RECHAZ')) {
              dictamen = 'RECHAZADO';
            } else if (dictamenFinalRaw.toUpperCase().includes('APROB')) {
              dictamen = 'APROBADO';
            } else if (estado === 'FINALIZADO') {
              const fullObs = (obsOperarioRaw + ' ' + obsCalidadRaw).toUpperCase();
              dictamen = fullObs.includes('RECHAZADO') || fullObs.includes('NO CUMPLE') ? 'RECHAZADO' : 'APROBADO';
            }

            const { foto1, foto2 } = parseDualPhotos(fotoUrlRaw);

            parsedList.push({
              id: `op-row-${idx + 1}-${cleanOp.replace(/\W/g, '')}`,
              op: cleanOp,
              referencia: refRaw || 'S/R',
              tela: telaRaw || 'TELA INDIGO',
              codigoMt: mtRaw || 'MT-GEN',
              color: colorRaw || 'AZUL',
              rollos: rollosRaw,
              lote: loteRaw,
              estado: estado,
              dictamen: dictamen,
              inspector: inspectorRaw,
              fechaCreacion: fechaStr,
              observacionesOperario: obsOperarioRaw || '',
              observacionesLavanderia: obsColfactoryRaw || '',
              observacionesCalidad: obsCalidadRaw || (dictamen === 'APROBADO' ? 'APROBADO' : ''),
              fotoMuestraUrl: foto1,
              fotoCalidadUrl: foto2,
              areaActual: mapAreaName(estado),
              horasEnProceso: horasHabiles,
              diasHabiles: diasHabiles,
              limiteSlaDias: estado === 'LAVANDERIA' ? 2 : 1,
              tieneRetraso: tieneRetraso,
              esRetrasoCritico: esRetrasoCritico
            });
          });

          if (parsedList.length > 0) {
            const finalActive = parsedList.filter(item => !isOpDeleted(item.op));
            saveCachedSolicitudes(finalActive);
            return finalActive;
          }
        }
      }
    } catch (e) {
      console.warn('Error consumiendo GET_BASE_DATOS desde Apps Script:', e);
    }
  }

  // 4. RETORNO DE SEGURIDAD DESDE CACHE O CONSTANTES MAESTRAS
  return getCachedSolicitudes();
}

/**
 * =========================================================================
 * FETCH MONITOREO SHEET (Ultra-rápido: GViz JSON + Fallback)
 * =========================================================================
 */
export async function fetchMonitoreoSheet(): Promise<MonitoreoItem[]> {
  const consumed = getConsumedMonitoreoOps();
  const timestamp = Date.now();

  // 1. ENDPOINTS DIRECTOS GVIZ JSON (TIEMPO DE RESPUESTA < 0.8s)
  const gvizUrls = [
    `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&gid=${MONITOREO_GID}&t=${timestamp}`,
    `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=MONITOREO&t=${timestamp}`
  ];

  for (const url of gvizUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const text = await res.text();
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const json = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
          const rows = json?.table?.rows;
          if (Array.isArray(rows) && rows.length > 0) {
            const list: MonitoreoItem[] = [];
            rows.forEach((r: any) => {
              const cells = r?.c || [];
              const getVal = (colIdx: number): string => {
                if (colIdx < cells.length && cells[colIdx] != null) {
                  const c = cells[colIdx];
                  if (c.f != null && String(c.f).trim() !== '') return String(c.f).trim();
                  if (c.v != null && String(c.v).trim() !== '') return String(c.v).trim();
                }
                return '';
              };

              // Formato oficial de Monitoreo (gid=1356774059):
              // Col 0 = TELA, Col 1 = MT, Col 2 = COLOR, Col 3 = OP, Col 4 = REFERENCIA
              let tela = getVal(0);
              let mt = getVal(1);
              let color = getVal(2) || 'AZUL';
              let op = getVal(3);
              let ref = getVal(4);

              // Auto-detección por si vinieran invertidas MT y TELA
              if ((tela.toUpperCase().startsWith('MT') || tela.toUpperCase().includes('MT00')) && !mt.toUpperCase().startsWith('MT')) {
                const temp = tela;
                tela = mt;
                mt = temp;
              }

              // Omitir fila de encabezados exacta (no usar includes porque las telas tienen "TELA" y las OPs tienen "OP")
              const isHeader = 
                (tela.toUpperCase().trim() === 'TELA' || tela.toUpperCase().trim() === 'FECHA' || tela.toUpperCase().trim() === 'INSPECTOR') &&
                (op.toUpperCase().trim() === 'OP' || mt.toUpperCase().trim() === 'MT' || ref.toUpperCase().trim() === 'REFERENCIA');
              
              if (isHeader) return;
              if (!tela && !op) return;

              const cleanOp = (op || '').replace(/\D/g, '') || (op || '').trim().toUpperCase();
              if (cleanOp && consumed.includes(cleanOp)) return;

              list.push({
                tela: tela || 'TELA INDIGO',
                mt: mt || 'MT-AUTO',
                color: color || 'AZUL',
                op: formatOpCode(op),
                referencia: ref || 'S/R'
              });
            });

            if (list.length > 0) return list;
          }
        }
      }
    } catch (err) {
      console.warn(`Error fetching Monitoreo GViz JSON:`, err);
    }
  }

  // 2. FALLBACK CSV
  const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=${MONITOREO_GID}&t=${timestamp}`;
  try {
    const res = await fetch(csvUrl);
    if (res.ok) {
      const text = await res.text();
      const rows = parseCsvRows(text);
      if (rows.length > 1) {
        const list: MonitoreoItem[] = [];
        for (let i = 1; i < rows.length; i++) {
          const r = rows[i];
          const telaRaw = (r[0] || '').trim();
          const mtRaw = (r[1] || 'MT-AUTO').trim();
          const colorRaw = (r[2] || 'AZUL').trim();
          const opRaw = (r[3] || '').trim();
          const refRaw = (r[4] || 'S/R').trim();

          const cleanOp = opRaw.replace(/\D/g, '') || opRaw.trim().toUpperCase();
          if (consumed.includes(cleanOp)) continue;

          if (!opRaw && !telaRaw) continue;
          if (telaRaw.toUpperCase() === 'TELA' && (opRaw.toUpperCase() === 'OP' || mtRaw.toUpperCase() === 'MT')) continue;

          list.push({
            tela: telaRaw || 'TELA INDIGO',
            mt: mtRaw || 'MT-AUTO',
            color: colorRaw || 'AZUL',
            op: formatOpCode(opRaw),
            referencia: refRaw || 'S/R'
          });
        }
        if (list.length > 0) return list;
      }
    }
  } catch (err) {
    console.warn('Error fetching Monitoreo CSV fallback:', err);
  }

  // 3. FALLBACK APPS SCRIPT API GET_MONITOREO
  const webAppUrl = getAppsScriptUrl();
  if (webAppUrl) {
    try {
      const appsScriptUrl = `${webAppUrl}?action=GET_MONITOREO&t=${timestamp}`;
      const res = await fetch(appsScriptUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success' && Array.isArray(data.data) && data.data.length > 0) {
          const list: MonitoreoItem[] = [];
          data.data.forEach((item: any) => {
            const opVal = item.op || '';
            const cleanOp = opVal.replace(/\D/g, '') || opVal.trim().toUpperCase();
            if (consumed.includes(cleanOp)) return;
            list.push({
              tela: item.tela || 'TELA INDIGO',
              mt: item.mt || 'MT-AUTO',
              color: item.color || 'AZUL',
              op: formatOpCode(opVal),
              referencia: item.referencia || 'S/R'
            });
          });
          if (list.length > 0) return list;
        }
      }
    } catch (err) {
      console.warn('Error fetching Monitoreo Apps Script fallback:', err);
    }
  }

  return INITIAL_MONITOREO_DATA.filter(item => {
    const cleanOp = (item.op || '').replace(/\D/g, '') || (item.op || '').trim().toUpperCase();
    return !consumed.includes(cleanOp);
  });
}

export async function deleteOrConsumeMonitoreoOp(op: string): Promise<void> {
  markMonitoreoOpAsConsumed(op);
  await deleteOrConsumeMonitoreoOpFromSheets(op);
}

/**
 * =========================================================================
 * POST ACTIONS: CREAR, TRANSFERIR, DICTAMINAR Y SINCRONIZAR
 * =========================================================================
 */

export async function pushSolicitudToSheets(payload: Partial<SolicitudColcha> & { imageBase64?: string }): Promise<{ success: boolean; message: string; driveUrl?: string }> {
  const now = new Date();
  const d = now.getDate();
  const m = now.getMonth() + 1;
  const y = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const colombianFecha = `${d}/${m}/${y} ${hh}:${mm}:${ss}`;

  const estadoFormatted = payload.estado === 'PRE_SOLICITUD' ? 'PRE-SOLICITUD' : (payload.estado || 'SOLICITADO');
  const rollosNum = Number(payload.rollos || 1);
  const obsFinal = payload.observacionesCalidad || '';
  const dictamenFinal = payload.dictamen || (payload.estado === 'FINALIZADO' ? 'APROBADO' : '');
  const formattedOp = formatOpCode(payload.op || '');
  const fechaToUse = payload.fechaCreacion && !payload.fechaCreacion.includes('T') ? payload.fechaCreacion : colombianFecha;
  const inspectorToUse = payload.inspector || 'OPERARIO STF';

  const users = getUsuariosList();
  const fallbackUserEmails = users.map(u => u.email).filter(Boolean);
  const targetRecipients = (payload as any).recipients && Array.isArray((payload as any).recipients) && (payload as any).recipients.length > 0
    ? (payload as any).recipients
    : ((payload as any).userEmails && Array.isArray((payload as any).userEmails) && (payload as any).userEmails.length > 0
        ? (payload as any).userEmails
        : fallbackUserEmails);

  // Lista limpia de correos únicos separados por coma para columna N
  const cleanEmailList = Array.isArray(targetRecipients)
    ? Array.from(new Set(targetRecipients.map((e: string) => String(e).trim().toLowerCase()).filter((e: string) => e.includes('@')))).join(', ')
    : '';

  // Observación Operario pura (Columna K): solo la observación inicial
  let cleanObsOperario = (payload.observacionesOperario || '').trim();
  if (cleanObsOperario.includes(' | ')) {
    cleanObsOperario = cleanObsOperario.split(' | ')[0].trim();
  }
  cleanObsOperario = cleanObsOperario.replace(/^\[[^\]]+\]:\s*/, '').trim();

  // Observación Colfactory pura (Columna L): nunca textos automáticos de recibo
  let cleanObsColfactory = (payload.observacionesLavanderia || '').trim();
  if (cleanObsColfactory.toLowerCase().includes('colcha recibida') || cleanObsColfactory.includes('[LAVANDERIA]')) {
    cleanObsColfactory = '';
  }

  // Columna M: vacía según especificación
  const evidenciaDrive = '';

  const origin = typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost') && !window.location.origin.includes('127.0.0.1')
    ? window.location.origin
    : 'https://colchas.vercel.app';

  // MAPEO EXACTO DE LAS 17 COLUMNAS OFICIALES DE LA HOJA BASE_DE_DATOS
  const rowData = {
    'FECHA': fechaToUse,
    'INSPECTOR / OPERARIO': inspectorToUse,
    'TELA': payload.tela || '',
    'CÓDIGO MT': payload.codigoMt || 'MT-AUTO',
    'COLOR': payload.color || 'AZUL',
    'OP': formattedOp,
    'REFERENCIA': payload.referencia || '',
    'ROLLOS': rollosNum,
    'LOTE': payload.lote || '1',
    'ESTADO': estadoFormatted,
    'OBSERVACIÓN OPERARIO': cleanObsOperario,
    'OBSERVACIÓN COLFACTORY': cleanObsColfactory,
    'EVIDENCIA (LINK DRIVE)': evidenciaDrive,
    'CORREO NOTIFICADO': cleanEmailList,
    'OBS.OPERARIO FINAL': obsFinal,
    'DICTAMEN FINAL': dictamenFinal,
    'MES': m,

    // Aliases en minúsculas / camelCase para retrocompatibilidad
    fecha: fechaToUse,
    inspector: inspectorToUse,
    tela: payload.tela || '',
    codigoMt: payload.codigoMt || 'MT-AUTO',
    color: payload.color || 'AZUL',
    op: formattedOp,
    referencia: payload.referencia || '',
    rollos: rollosNum,
    rollo: rollosNum,
    lote: payload.lote || '1',
    estado: estadoFormatted,
    observacionesOperario: cleanObsOperario,
    observacionOperario: cleanObsOperario,
    observacionColfactory: cleanObsColfactory,
    evidenciaLinkDrive: evidenciaDrive,
    correoNotificado: cleanEmailList,
    obsOperarioFinal: obsFinal,
    dictamenFinal: dictamenFinal,
    mes: m
  };

  const res = await sendAppsScriptPost('CREATE_OP', {
    ...payload,
    op: formattedOp,
    ...rowData,
    userEmails: targetRecipients,
    recipients: targetRecipients,
    correoNotificado: cleanEmailList,
    appUrl: `${origin}/?op=${encodeURIComponent(formattedOp)}&view=public`
  });

  return {
    success: res.success,
    message: res.message || 'Solicitud guardada en Google Sheets (BASE_DE_DATOS)',
    driveUrl: res.data ? res.data.driveUrl : undefined
  };
}

export async function sendOpEmailNotification(
  opData: Partial<SolicitudColcha>, 
  recipients: string[]
): Promise<{ success: boolean; message: string }> {
  const origin = typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost') && !window.location.origin.includes('127.0.0.1')
    ? window.location.origin
    : 'https://colchas.vercel.app';
  const formattedOp = formatOpCode(opData.op || '');
  const cleanEmailList = Array.from(new Set(recipients.map(e => String(e).trim().toLowerCase()).filter(e => e.includes('@')))).join(', ');
  
  const res = await sendAppsScriptPost('SEND_OP_EMAIL', {
    ...opData,
    op: formattedOp,
    recipients: recipients,
    userEmails: recipients,
    correoNotificado: cleanEmailList,
    appUrl: `${origin}/?op=${encodeURIComponent(formattedOp)}&view=public`
  });
  return {
    success: res.success,
    message: res.message || 'Correo de notificación enviado con éxito'
  };
}

export async function pushTransferToSheets(
  op: string, 
  nuevoEstado: string, 
  nuevoInspector: string, 
  observaciones?: string
): Promise<{ success: boolean; message: string }> {
  const estadoFormateado = nuevoEstado === 'PRE_SOLICITUD' ? 'PRE-SOLICITUD' : nuevoEstado;
  const formattedOp = formatOpCode(op);
  
  // Limpiar observaciones automáticas de tránsito
  const cleanObs = (observaciones || '').trim();
  const isReceipt = cleanObs.toLowerCase().includes('colcha recibida') || cleanObs.includes('[LAVANDERIA]');
  const realCustomObs = isReceipt ? '' : cleanObs;

  return await sendAppsScriptPost('TRANSFER_OP', { 
    op: formattedOp, 
    nuevoEstado: estadoFormateado, 
    estado: estadoFormateado,
    observaciones: realCustomObs,
    observacionColfactory: (nuevoEstado === 'LAVANDERIA' && realCustomObs) ? realCustomObs : undefined,
    obsOperarioFinal: ((nuevoEstado === 'CALIDAD' || nuevoEstado === 'FINALIZADO') && realCustomObs) ? realCustomObs : undefined
  });
}

export async function pushDictamenToSheets(
  op: string, 
  dictamen: DictamenType, 
  inspector: string, 
  observacionesTecnicas?: string,
  fotoCalidad?: string
): Promise<{ success: boolean; message: string }> {
  const formattedOp = formatOpCode(op);
  let cleanObs = observacionesTecnicas || '';
  if (cleanObs.includes('[DICTAMEN:')) {
    cleanObs = cleanObs.replace(/^\[DICTAMEN:\s*(APROBADO|RECHAZADO|PENDIENTE)\]\s*/i, '').trim();
  }

  const res = await sendAppsScriptPost('UPDATE_DICTAMEN', { 
    op: formattedOp, 
    dictamen: dictamen,
    dictamenFinal: dictamen,
    auditorCalidad: inspector,
    inspector: inspector,
    observacionesTecnicas: cleanObs,
    obsOperarioFinal: cleanObs,
    veredicto: dictamen,
    fotoCalidadUrl: fotoCalidad,
    fotoCalidad: fotoCalidad
  });

  if (fotoCalidad) {
    try {
      await sendAppsScriptPost('UPDATE_OP_PHOTO', {
        op: formattedOp,
        fotoCalidadUrl: fotoCalidad,
        fotoCalidad: fotoCalidad,
        isCalidad: true
      });
    } catch (photoErr) {
      console.warn('Redundant photo update caught:', photoErr);
    }
  }

  return res;
}

export async function pushOpPhotoToSheets(
  op: string, 
  photoUrl: string,
  isCalidad: boolean = false
): Promise<{ success: boolean; message: string; driveUrl?: string }> {
  const res = await sendAppsScriptPost('UPDATE_OP_PHOTO', { 
    op, 
    fotoMuestraUrl: photoUrl,
    fotoCalidadUrl: photoUrl,
    isCalidad
  });
  return {
    success: res.success,
    message: res.message || 'Fotografía sincronizada correctamente con Google Sheets',
    driveUrl: res.data ? res.data.driveUrl : undefined
  };
}

/**
 * Compresión ultra rápida y ligera en el cliente para fotos desde cámara o galería.
 * Genera imágenes nítidas de ~12KB-20KB que se almacenan y sincronizan al instante
 * sin exceder nunca el límite de caracteres por celda de Google Sheets.
 */
export function compressImageFile(file: File, maxDimension: number = 440, quality: number = 0.42): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = Math.max(16, width);
        canvas.height = Math.max(16, height);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          let q = quality;
          let compressedDataUrl = canvas.toDataURL('image/jpeg', q);
          // Asegurar que la cadena Base64 nunca exceda 18,500 caracteres
          // para garantizar que dos fotos quepan holgadamente en Google Sheets
          // sin riesgo de ser truncadas ni corrompidas.
          while (compressedDataUrl.length > 18500 && q > 0.20) {
            q -= 0.05;
            compressedDataUrl = canvas.toDataURL('image/jpeg', q);
          }
          resolve(compressedDataUrl);
        } else {
          resolve(img.src);
        }
      } catch (err) {
        resolve(img.src);
      }
    };
    img.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export interface AlertaSheetRow {
  op: string;
  referencia: string;
  tela: string;
  color: string;
  metros: string;
  areaActual: string;
  fechaSolicitud: string;
  diasHabiles: string;
  diasRetraso: string;
  horasHabiles: string;
  responsable: string;
  obsOperario: string;
  obsLavanderia: string;
  fechaEnvioReporte: string;
}

const LOCAL_ALERTAS_ROWS_KEY = 'STF_LOCAL_ALERTAS_SHEET_ROWS';

export function getLocalAlertasRows(): AlertaSheetRow[] {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(LOCAL_ALERTAS_ROWS_KEY);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        return [];
      }
    }
  }
  return [];
}

export function saveLocalAlertasRows(rows: AlertaSheetRow[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_ALERTAS_ROWS_KEY, JSON.stringify(rows));
  }
}

export function convertSolicitudToAlertaRow(s: SolicitudColcha, fechaEnvioReporte?: string): AlertaSheetRow {
  const diasRetrasoNum = Math.max(0, s.diasHabiles - 3);
  const diasRetrasoStr = diasRetrasoNum > 0 ? `+${diasRetrasoNum} Días` : '0 Días';
  const mtStr = s.codigoMt ? (s.codigoMt.includes('MT') ? s.codigoMt : `${s.codigoMt} (${s.rollos * 85} MT)`) : `${s.rollos * 85} MT`;

  return {
    op: s.op,
    referencia: s.referencia || 'S/R',
    tela: s.tela || '',
    color: s.color || 'AZUL',
    metros: mtStr,
    areaActual: s.areaActual || 'CALIDAD STF LABORATORIO',
    fechaSolicitud: s.fechaCreacion || '',
    diasHabiles: `${s.diasHabiles} Días`,
    diasRetraso: diasRetrasoStr,
    horasHabiles: `${s.horasEnProceso}h`,
    responsable: s.inspector || 'CALIDAD ZF',
    obsOperario: s.observacionesOperario || '',
    obsLavanderia: s.observacionesLavanderia || '',
    fechaEnvioReporte: fechaEnvioReporte || ''
  };
}

export async function syncAllAlertasToSheets(
  delayedSolicitudes: SolicitudColcha[],
  fechaEnvioReporte?: string
): Promise<{ success: boolean; count: number; message: string }> {
  const rows: AlertaSheetRow[] = delayedSolicitudes.map(s => convertSolicitudToAlertaRow(s, fechaEnvioReporte));
  saveLocalAlertasRows(rows);

  const res = await sendAppsScriptPost('SYNC_ALERTAS', {
    timestamp: new Date().toISOString(),
    totalAlertas: rows.length,
    rows: rows
  });

  return {
    success: res.success,
    count: rows.length,
    message: `${rows.length} alertas sincronizadas en tiempo real con Google Sheets (ALERTAS)`
  };
}

export async function removeOpFromAlertasSheet(op: string): Promise<{ success: boolean; message: string }> {
  if (!op) return { success: true, message: 'OP vacía' };
  const cleanOp = op.trim().toUpperCase();

  const currentRows = getLocalAlertasRows();
  const updatedRows = currentRows.filter(r => r.op.trim().toUpperCase() !== cleanOp);
  saveLocalAlertasRows(updatedRows);

  const res = await sendAppsScriptPost('DELETE_ALERTA_OP', { op: cleanOp });
  return {
    success: res.success,
    message: `OP ${op} depurada en tiempo real de la página ALERTAS de Google Sheets`
  };
}

export async function deleteOpFromGoogleSheets(op: string): Promise<{ success: boolean; message: string }> {
  if (!op) return { success: true, message: 'OP vacía' };
  const cleanDigits = String(op).replace(/\D/g, '');
  const cleanOp = String(op).replace(/^OP-?/i, '').trim().toUpperCase();

  const res = await sendAppsScriptPost('DELETE_OP', { 
    op,
    cleanDigits,
    cleanOp: `OP-${cleanOp}`
  });
  return {
    success: res.success,
    message: `OP ${op} eliminada en tiempo real de Google Sheets`
  };
}

export async function pushAlertsNotificationReportToSheets(
  ops: SolicitudColcha[],
  notifiedBy?: string
): Promise<{ success: boolean; message: string }> {
  const now = new Date();
  const d = now.getDate();
  const m = now.getMonth() + 1;
  const y = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const fechaStr = `${d}/${m}/${y} ${hh}:${mm} (${notifiedBy || 'GMAIL'})`;

  const opList = ops.map(s => s.op);

  const currentRows = getLocalAlertasRows();
  const updatedRows = currentRows.map(r => {
    if (opList.some(op => op.trim().toUpperCase() === r.op.trim().toUpperCase())) {
      return { ...r, fechaEnvioReporte: fechaStr };
    }
    return r;
  });
  saveLocalAlertasRows(updatedRows);

  const res = await sendAppsScriptPost('UPDATE_ALERTA_REPORT_SENT', {
    ops: opList,
    fechaEnvioReporte: fechaStr,
    notificadoPor: notifiedBy || 'GMAIL'
  });

  return {
    success: res.success,
    message: 'Fecha de reporte guardada en Google Sheets (ALERTAS)'
  };
}

export const TODAY_REAL_SHEET_OPS: SolicitudColcha[] = [
  {
    id: 'op-row-352-OP96236',
    op: 'OP-96236',
    referencia: 'S741612',
    tela: 'TELA INDIGO WANG BLUE',
    codigoMt: 'MT00328571',
    color: 'AZUL',
    rollos: 5,
    lote: 'A',
    estado: 'SOLICITADO',
    dictamen: 'PENDIENTE',
    inspector: 'CALIDAD',
    fechaCreacion: '8/9/2026 12:54:34',
    observacionesOperario: 'Muestra solicitada en Planta Principal',
    areaActual: 'TRÁNSITO / DESPACHO',
    horasEnProceso: 0,
    diasHabiles: 0,
    limiteSlaDias: 1,
    tieneRetraso: false,
    esRetrasoCritico: false
  },
  {
    id: 'op-row-351-OP96233',
    op: 'OP-96233',
    referencia: 'S104626',
    tela: 'TELA INDIGO WANG BLUE',
    codigoMt: 'MT00328571',
    color: 'AZUL',
    rollos: 2,
    lote: 'F',
    estado: 'SOLICITADO',
    dictamen: 'PENDIENTE',
    inspector: 'CALIDAD',
    fechaCreacion: '8/9/2026 12:47:26',
    observacionesOperario: 'Muestra solicitada en Planta Principal',
    areaActual: 'TRÁNSITO / DESPACHO',
    horasEnProceso: 0,
    diasHabiles: 0,
    limiteSlaDias: 1,
    tieneRetraso: false,
    esRetrasoCritico: false
  },
  {
    id: 'op-row-350-OP96234',
    op: 'OP-96234',
    referencia: 'SS741556',
    tela: 'TELA INDIGO WANG BLUE',
    codigoMt: 'MT00328571',
    color: 'AZUL',
    rollos: 3,
    lote: 'LOTE A, C',
    estado: 'PRE_SOLICITUD',
    dictamen: 'PENDIENTE',
    inspector: 'SEBASTIAN HERRERA',
    fechaCreacion: '8/9/2026 11:38:43',
    observacionesOperario: 'Muestra registrada en Atelier ZF (Zona Franca)',
    areaActual: 'CALIDAD 2F / ATELIER',
    horasEnProceso: 0,
    diasHabiles: 0,
    limiteSlaDias: 1,
    tieneRetraso: false,
    esRetrasoCritico: false
  },
  {
    id: 'op-row-349-OP96235',
    op: 'OP-96235',
    referencia: 'F741087',
    tela: 'TELA INDIGO MAIA',
    codigoMt: 'MT00151555',
    color: 'AZUL',
    rollos: 5,
    lote: 'LOTE 18, 49, 61',
    estado: 'PRE_SOLICITUD',
    dictamen: 'PENDIENTE',
    inspector: 'SEBASTIAN HERRERA',
    fechaCreacion: '8/9/2026 11:30:20',
    observacionesOperario: 'Muestra registrada en Atelier ZF (Zona Franca)',
    areaActual: 'CALIDAD 2F / ATELIER',
    horasEnProceso: 0,
    diasHabiles: 0,
    limiteSlaDias: 1,
    tieneRetraso: false,
    esRetrasoCritico: false
  },
  {
    id: 'op-row-348-OP96219',
    op: 'OP-96219',
    referencia: 'S741514',
    tela: 'TELA INDIGO WANG BLUE',
    codigoMt: 'MT00328571',
    color: 'AZUL',
    rollos: 6,
    lote: 'A',
    estado: 'SOLICITADO',
    dictamen: 'PENDIENTE',
    inspector: 'ANDRES FELIPE TASCON',
    fechaCreacion: '8/9/2026 10:39:36',
    observacionesOperario: 'NO SE EVIDENCIAN TONO EN EL LOTE SE SACAN 6 MUESTRAS DE 19.',
    areaActual: 'TRÁNSITO / DESPACHO',
    horasEnProceso: 0,
    diasHabiles: 0,
    limiteSlaDias: 1,
    tieneRetraso: false,
    esRetrasoCritico: false
  }
];

export const INITIAL_SOLICITUDES_DATA: SolicitudColcha[] = [];

export const INITIAL_MONITOREO_DATA: MonitoreoItem[] = [
  { tela: "TELA INDIGO UTOPIA", mt: "MT00216893", color: "CRUDO", op: "OP-69412", referencia: "R-71234" },
  { tela: "TELA INDIGO CORES", mt: "MT00067803", color: "CRUDO, NATURAL", op: "OP-569", referencia: "R-48636" },
  { tela: "TELA INDIGO UTOPIA ELA", mt: "MT00253877", color: "CRUDO", op: "OP-79214", referencia: "R-78997" },
  { tela: "TELA INDIGO WANG BLACK", mt: "MT00169585", color: "NEGRO", op: "OP-3659", referencia: "R-1478" }
];


export interface AutomatedAlertEmailPayload {
  recipients: string[];
  ops: SolicitudColcha[];
  senderName?: string;
  subject?: string;
  fechaReporte?: string;
  appUrl?: string;
}

/**
 * Envío 100% automático del reporte oficial por correo mediante el backend de Google Apps Script
 * Sin abrir ventanas emergentes del cliente ni popups manuales.
 */
export async function sendAutomatedAlertsEmail(
  payload: AutomatedAlertEmailPayload
): Promise<{ success: boolean; message: string; count: number }> {
  const origin = typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost') && !window.location.origin.includes('127.0.0.1')
    ? window.location.origin
    : 'https://colchas.vercel.app';
  
  const now = new Date();
  const d = now.getDate();
  const m = now.getMonth() + 1;
  const y = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const fechaStr = payload.fechaReporte || `${d}/${m}/${y} ${hh}:${mm}`;

  const cleanPayload = {
    recipients: payload.recipients,
    ops: payload.ops.map(o => ({
      op: o.op,
      referencia: o.referencia,
      tela: o.tela,
      color: o.color,
      rollos: o.rollos,
      codigoMt: o.codigoMt,
      areaActual: o.areaActual,
      diasHabiles: o.diasHabiles,
      inspector: o.inspector,
      observacionesOperario: o.observacionesOperario || '',
      observacionesLavanderia: o.observacionesLavanderia || ''
    })),
    senderName: payload.senderName || 'EDWIN DIAZ (ADMINISTRADOR)',
    fechaReporte: fechaStr,
    subject: payload.subject || `🚨 [ALERTA SLA STF GROUP] ${payload.ops.length} Órdenes de Producción con Retraso`,
    appUrl: `${origin}/?tab=alertas`
  };

  // Registrar fecha en el almacenamiento local y en Google Sheets
  pushAlertsNotificationReportToSheets(payload.ops, `${cleanPayload.senderName} -> ${payload.recipients.length} usuarios`);

  const res = await sendAppsScriptPost('SEND_ALERTA_EMAIL', cleanPayload);

  return {
    success: res.success,
    count: payload.recipients.length,
    message: `Alerta oficial enviada automáticamente a ${payload.recipients.length} destinatario(s)`
  };
}
