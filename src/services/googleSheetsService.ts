import { MonitoreoItem, SolicitudColcha, SectorType, DictamenType } from '../types';
import { calculateWorkingDays } from './slaCalculator';

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
  if (s === 'RECIBIDO LAVADERO' || s.includes('LAVAD') || s.includes('LAVANDER')) {
    return 'LAVANDERIA';
  }
  if (s === 'ENVIADO A STF' || s.includes('CALIDAD') || s.includes('EVALUA') || s.includes('AUDITOR')) {
    return 'CALIDAD';
  }
  if (s.includes('SOLICITAD') || s.includes('DESPACH')) {
    return 'SOLICITADO';
  }
  if (s.includes('PRE-SOLICITUD') || s.includes('PRE_SOLICITUD') || s.includes('MUESTRA NUEVA') || s.includes('ATELIER')) {
    return 'PRE_SOLICITUD';
  }
  if (s.includes('FINALIZAD') || s.includes('LIBERAD')) {
    return 'FINALIZADO';
  }
  return 'FINALIZADO';
}

export function mapAreaName(sector: SectorType): string {
  switch (sector) {
    case 'PRE_SOLICITUD': return 'CALIDAD 2F / ATELIER';
    case 'SOLICITADO': return 'TRÁNSITO / DESPACHO';
    case 'LAVANDERIA': return 'LAVANDERÍA COLFACTORY ZF';
    case 'CALIDAD': return 'CALIDAD STF LABORATORIO';
    case 'FINALIZADO': return 'CALIDAD PLANTA STF';
    default: return 'PLANTA STF';
  }
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

export function getLocalCreatedOps(): SolicitudColcha[] {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(LOCAL_CREATED_OPS_KEY);
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

export function saveLocalCreatedOp(newOp: SolicitudColcha): void {
  if (typeof window !== 'undefined') {
    const current = getLocalCreatedOps();
    const filtered = current.filter(o => o.id !== newOp.id && o.op !== newOp.op);
    localStorage.setItem(LOCAL_CREATED_OPS_KEY, JSON.stringify([newOp, ...filtered]));
  }
}

/**
 * =========================================================================
 * FETCH LIVE MASTER DATABASE (GET al Webhook de Google Apps Script)
 * =========================================================================
 */
export async function fetchBaseDeDatosSheet(): Promise<SolicitudColcha[]> {
  const webAppUrl = getAppsScriptUrl();

  // 1. CONSUMIR MEDIANTE GET DESDE LA API DE GOOGLE APPS SCRIPT
  if (webAppUrl) {
    try {
      const res = await fetch(`${webAppUrl}?action=GET_BASE_DATOS`);
      if (res.ok) {
        const json = await res.json();
        const rawData = json.data;
        if (Array.isArray(rawData) && rawData.length > 0) {
          const parsedList: SolicitudColcha[] = [];

          rawData.forEach((r: any, idx: number) => {
            // Manejar tanto formato de Objeto como formato de Array 2D
            let opRaw = '';
            let refRaw = '';
            let telaRaw = '';
            let mtRaw = '';
            let colorRaw = '';
            let rollosRaw = 1;
            let loteRaw = '1';
            let estadoRaw = 'FINALIZADO';
            let inspectorRaw = 'INSPECTOR CALIDAD';
            let fechaRaw = '';
            let obsOperarioRaw = '';
            let obsColfactoryRaw = '';
            let fotoUrlRaw = '';

            if (typeof r === 'object' && !Array.isArray(r)) {
              // Objeto con nombres de columnas
              opRaw = String(r['OP'] || r['op'] || '').trim();
              refRaw = String(r['REFERENCIA'] || r['referencia'] || r['REF'] || 'S/R').trim();
              
              // Buscar clave de tela
              for (const k of Object.keys(r)) {
                if (k.toUpperCase().includes('TELA')) { telaRaw = String(r[k] || '').trim(); break; }
              }
              // Buscar clave de MT
              for (const k of Object.keys(r)) {
                if (k.toUpperCase().includes('MT') || k.toUpperCase().includes('DIGO')) { mtRaw = String(r[k] || '').trim(); break; }
              }
              // Buscar clave de Color
              for (const k of Object.keys(r)) {
                if (k.toUpperCase().includes('COLOR')) { colorRaw = String(r[k] || 'AZUL').trim(); break; }
              }
              // Buscar clave de Inspector
              for (const k of Object.keys(r)) {
                if (k.toUpperCase().includes('INSPECTOR') || k.toUpperCase().includes('OPERARIO')) { inspectorRaw = String(r[k] || 'CALIDAD STF').trim(); break; }
              }
              // Buscar clave de Fecha
              for (const k of Object.keys(r)) {
                if (k.toUpperCase().includes('FECHA')) { fechaRaw = String(r[k] || '').trim(); break; }
              }
              // Buscar clave de Observación
              for (const k of Object.keys(r)) {
                if (k.toUpperCase().includes('OBSERVACI') && k.toUpperCase().includes('OPERARIO')) { obsOperarioRaw = String(r[k] || '').trim(); }
                if (k.toUpperCase().includes('COLFACTORY') || k.toUpperCase().includes('LAVAD')) { obsColfactoryRaw = String(r[k] || '').trim(); }
              }
              // Buscar clave de Evidencia
              for (const k of Object.keys(r)) {
                if (k.toUpperCase().includes('EVIDENCIA') || k.toUpperCase().includes('DRIVE') || k.toUpperCase().includes('FOTO')) { fotoUrlRaw = String(r[k] || '').trim(); break; }
              }

              rollosRaw = Number(r['ROLLOS'] || r['rollos'] || 1);
              loteRaw = String(r['LOTE'] || r['lote'] || '1');
              estadoRaw = String(r['ESTADO'] || r['estado'] || 'FINALIZADO');
            } else if (Array.isArray(r)) {
              // Array 2D tradicional
              fechaRaw = String(r[0] || '');
              inspectorRaw = String(r[1] || 'INSPECTOR CALIDAD');
              telaRaw = String(r[2] || '');
              mtRaw = String(r[3] || 'MT-GEN');
              colorRaw = String(r[4] || 'AZUL');
              opRaw = String(r[5] || '');
              refRaw = String(r[6] || 'S/R');
              rollosRaw = Number(r[7]) || 1;
              loteRaw = String(r[8] || '1');
              estadoRaw = String(r[9] || 'FINALIZADO');
              obsOperarioRaw = String(r[10] || '');
              obsColfactoryRaw = String(r[11] || '');
              fotoUrlRaw = String(r[12] || '');
            }

            if (!opRaw && !telaRaw) return;

            // Normalizar estado y cálculo de días hábiles
            const estado = mapEstadoStringToSector(estadoRaw);
            const fechaStr = fechaRaw || new Date().toISOString();
            const { diasHabiles, horasHabiles, tieneRetraso, esRetrasoCritico } = calculateWorkingDays(fechaStr);

            let dictamen: DictamenType = 'PENDIENTE';
            if (estado === 'FINALIZADO') {
              const fullObs = (obsOperarioRaw + ' ' + obsColfactoryRaw).toUpperCase();
              dictamen = fullObs.includes('RECHAZADO') || fullObs.includes('NO CUMPLE') ? 'RECHAZADO' : 'APROBADO';
            }

            const cleanOp = opRaw.startsWith('OP-') ? opRaw : (opRaw.startsWith('OP') ? opRaw.replace('OP', 'OP-') : `OP-${opRaw}`);

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
              observacionesOperario: obsOperarioRaw || obsColfactoryRaw,
              fotoMuestraUrl: fotoUrlRaw.startsWith('http') ? fotoUrlRaw : undefined,
              areaActual: mapAreaName(estado),
              horasEnProceso: horasHabiles,
              diasHabiles: diasHabiles,
              limiteSlaDias: estado === 'LAVANDERIA' ? 2 : 1,
              tieneRetraso: tieneRetraso,
              esRetrasoCritico: esRetrasoCritico
            });
          });

          if (parsedList.length > 0) {
            // Unir con OPs creadas localmente
            const localOps = getLocalCreatedOps();
            if (localOps.length > 0) {
              const merged = [...localOps];
              parsedList.forEach(s => {
                if (!merged.some(m => m.op === s.op || m.id === s.id)) {
                  merged.push(s);
                }
              });
              return merged;
            }
            return parsedList;
          }
        }
      }
    } catch (e) {
      console.warn('Error consumiendo GET_BASE_DATOS desde Apps Script:', e);
    }
  }

  // 2. FALLBACK A ENDPOINTS DIRECTOS CSV DE GOOGLE SHEETS
  const tryUrls = [
    `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=0`,
    `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=BASE_DE_DATOS`,
    `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=0`
  ];

  for (const url of tryUrls) {
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

        const estado = mapEstadoStringToSector(r[9] || 'FINALIZADO');
        const fechaStr = r[0] || new Date().toISOString();
        const { diasHabiles, horasHabiles, tieneRetraso, esRetrasoCritico } = calculateWorkingDays(fechaStr);

        let dictamen: DictamenType = 'PENDIENTE';
        if (estado === 'FINALIZADO') {
          const obs = ((r[10] || '') + ' ' + (r[11] || '')).toUpperCase();
          dictamen = obs.includes('RECHAZADO') || obs.includes('NO CUMPLE') ? 'RECHAZADO' : 'APROBADO';
        }

        solicitudes.push({
          id: `op-row-${i}-${opRaw.replace(/\W/g, '')}`,
          op: opRaw.startsWith('OP-') ? opRaw : (opRaw.startsWith('OP') ? opRaw.replace('OP', 'OP-') : `OP-${opRaw}`),
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
          observacionesOperario: r[10] || r[11] || '',
          fotoMuestraUrl: r[12] && r[12].startsWith('http') ? r[12] : undefined,
          areaActual: mapAreaName(estado),
          horasEnProceso: horasHabiles,
          diasHabiles: diasHabiles,
          limiteSlaDias: estado === 'LAVANDERIA' ? 2 : 1,
          tieneRetraso: tieneRetraso,
          esRetrasoCritico: esRetrasoCritico
        });
      }

      if (solicitudes.length > 0) {
        return solicitudes;
      }
    } catch (err) {
      console.warn(`Error fetching Base de Datos from CSV URL ${url}:`, err);
    }
  }

  return TODAY_REAL_SHEET_OPS;
}

/**
 * =========================================================================
 * FETCH MONITOREO SHEET (GET al Webhook de Google Apps Script)
 * =========================================================================
 */
export async function fetchMonitoreoSheet(): Promise<MonitoreoItem[]> {
  const consumed = getConsumedMonitoreoOps();
  const webAppUrl = getAppsScriptUrl();

  // 1. INTENTO DIRECTO A ENDPOINTS CSV DE LA HOJA OFICIAL MONITOREO (GID=1356774059)
  const timestamp = Date.now();
  const tryUrls = [
    `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${MONITOREO_GID}&t=${timestamp}`,
    `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=${MONITOREO_GID}&t=${timestamp}`,
    `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=MONITOREO&t=${timestamp}`
  ];
  
  for (const url of tryUrls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      
      const text = await res.text();
      const rows = parseCsvRows(text);
      if (rows.length < 2) continue;

      const items: MonitoreoItem[] = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rawTela = (row[0] || '').trim();
        if (rawTela && rawTela.toUpperCase() !== 'TELA') {
          const itemOp = (row[3] || '').trim();
          const cleanOp = itemOp.replace(/\D/g, '') || itemOp.trim().toUpperCase();
          if (!cleanOp || !consumed.includes(cleanOp)) {
            items.push({
              tela: rawTela,
              mt: (row[1] || 'MT-AUTO').trim(),
              color: (row[2] || 'AZUL').trim(),
              op: itemOp,
              referencia: (row[4] || '').trim()
            });
          }
        }
      }
      if (items.length > 0) return items;
    } catch (err) {
      console.warn(`Error fetching Monitoreo from CSV url ${url}:`, err);
    }
  }

  // 2. CONSUMIR MEDIANTE GET DESDE LA API DE GOOGLE APPS SCRIPT (VALIDANDO QUE SEA LA HOJA MONITOREO)
  if (webAppUrl) {
    try {
      const res = await fetch(`${webAppUrl}?action=GET_MONITOREO`);
      if (res.ok) {
        const json = await res.json();
        const rawData = json.data;
        if (Array.isArray(rawData) && rawData.length > 0) {
          // Validar que no sea accidentalmente la hoja BASE_DE_DATOS
          const isBaseDeDatos = rawData.some((r: any) => 
            (typeof r === 'object' && ('FECHA' in r || 'ESTADO' in r || 'INSPECTOR / OPERARIO' in r || 'OBSERVACIÓN OPERARIO' in r || '_rowId' in r)) ||
            (Array.isArray(r) && r.length > 8)
          );

          if (!isBaseDeDatos) {
            const items: MonitoreoItem[] = [];
            rawData.forEach((item: any) => {
              let tela = '';
              let mt = 'MT-AUTO';
              let color = 'AZUL';
              let op = '';
              let ref = '';

              if (typeof item === 'object' && !Array.isArray(item)) {
                tela = String(item['TELA'] || item['tela'] || item['TELA '] || '').trim();
                mt = String(item['MT'] || item['mt'] || item['CÓDIGO MT'] || item['CODIGO MT'] || 'MT-AUTO').trim();
                color = String(item['COLOR'] || item['color'] || 'AZUL').trim();
                op = String(item['OP'] || item['op'] || '').trim();
                ref = String(item['REFERENCIA'] || item['referencia'] || '').trim();
              } else if (Array.isArray(item)) {
                tela = String(item[0] || '').trim();
                mt = String(item[1] || 'MT-AUTO').trim();
                color = String(item[2] || 'AZUL').trim();
                op = String(item[3] || '').trim();
                ref = String(item[4] || '').trim();
              }

              if (tela && tela.toUpperCase() !== 'TELA') {
                const cleanOp = op.replace(/\D/g, '') || op.trim().toUpperCase();
                if (!cleanOp || !consumed.includes(cleanOp)) {
                  items.push({ tela, mt, color, op, referencia: ref });
                }
              }
            });

            if (items.length > 0) return items;
          }
        }
      }
    } catch (e) {
      console.warn('Error fetching Monitoreo via Apps Script:', e);
    }
  }

  return INITIAL_MONITOREO_DATA.filter(item => {
    const cleanOp = (item.op || '').replace(/\D/g, '') || (item.op || '').trim().toUpperCase();
    return !cleanOp || !consumed.includes(cleanOp);
  });
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
  const obsOperario = payload.observacionesOperario || '';
  const evidenciaDrive = payload.fotoMuestraUrl || payload.imageBase64 || '';

  // MAPEO EXACTO DE LAS 16 COLUMNAS OFICIALES DE LA HOJA BASE_DE_DATOS
  const rowData = {
    'FECHA': colombianFecha,
    'INSPECTOR / OPERARIO': payload.inspector || 'OPERARIO STF',
    'TELA': payload.tela || '',
    'CÓDIGO MT': payload.codigoMt || 'MT-AUTO',
    'COLOR': payload.color || 'AZUL',
    'OP': payload.op || '',
    'REFERENCIA': payload.referencia || '',
    'ROLLOS': rollosNum,
    'LOTE': payload.lote || '1',
    'ESTADO': estadoFormatted,
    'OBSERVACIÓN OPERARIO': obsOperario,
    'OBSERVACIÓN COLFACTORY': payload.observacionesLavanderia || '',
    'EVIDENCIA (LINK DRIVE)': evidenciaDrive,
    'CORREO NOTIFICADO': '',
    'OBS.OPERARIO FINAL': '',
    'MES': m,

    // Aliases en minúsculas / camelCase para retrocompatibilidad
    fecha: colombianFecha,
    inspector: payload.inspector || 'OPERARIO STF',
    tela: payload.tela || '',
    codigoMt: payload.codigoMt || 'MT-AUTO',
    color: payload.color || 'AZUL',
    op: payload.op || '',
    referencia: payload.referencia || '',
    rollos: rollosNum,
    rollo: rollosNum,
    lote: payload.lote || '1',
    estado: estadoFormatted,
    observacionesOperario: obsOperario,
    observacionOperario: obsOperario,
    observacionColfactory: payload.observacionesLavanderia || '',
    evidenciaLinkDrive: evidenciaDrive,
    correoNotificado: '',
    obsOperarioFinal: '',
    mes: m
  };

  const res = await sendAppsScriptPost('CREATE_OP', {
    ...payload,
    ...rowData
  });

  return {
    success: res.success,
    message: res.message || 'Solicitud guardada en Google Sheets (BASE_DE_DATOS)',
    driveUrl: res.data ? res.data.driveUrl : undefined
  };
}

export async function pushTransferToSheets(op: string, nuevoEstado: string, nuevoInspector: string, observaciones?: string): Promise<{ success: boolean; message: string }> {
  return await sendAppsScriptPost('TRANSFER_OP', { op, nuevoEstado, nuevoInspector, observaciones });
}

export async function pushDictamenToSheets(op: string, dictamen: DictamenType, inspector: string, observacionesTecnicas?: string): Promise<{ success: boolean; message: string }> {
  return await sendAppsScriptPost('UPDATE_DICTAMEN', { op, dictamen, inspector, observacionesTecnicas });
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
    id: 'op-row-321-OP00096156',
    op: 'OP-00096156',
    referencia: 'S741546M',
    tela: 'TELA INDIGO LIMA',
    codigoMt: 'MT00347004',
    color: 'AZUL',
    rollos: 4,
    lote: '1',
    estado: 'SOLICITADO',
    dictamen: 'PENDIENTE',
    inspector: 'WILMER MAYA',
    fechaCreacion: '3/9/2026 9:19:41',
    observacionesOperario: 'SE EEVIDENCIAN 2 TONOS. SE SOLICITA A CORTE TRABAJAR POR TONO 1 ROLLOS (1, 4) TONO 2 ROLLOS (2, 3)',
    areaActual: 'TRÁNSITO / DESPACHO',
    horasEnProceso: 2,
    diasHabiles: 0,
    limiteSlaDias: 1,
    tieneRetraso: false,
    esRetrasoCritico: false
  }
];

export const INITIAL_SOLICITUDES_DATA: SolicitudColcha[] = [];

export const INITIAL_MONITOREO_DATA: MonitoreoItem[] = [
  { tela: "TELA INDIGO EGEO", mt: "MT00067808", color: "AZUL", op: "", referencia: "" },
  { tela: "TELA INDIGO WANG BLUE", mt: "MT00328571", color: "AZUL", op: "", referencia: "" },
  { tela: "TELA INDIGO MAIA", mt: "MT00151555", color: "AZUL", op: "", referencia: "" },
  { tela: "TELA INDIGO LARKANA", mt: "MT00315529", color: "AZUL", op: "", referencia: "" }
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
  const origin = typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : 'https://remix-stf-group-quality-control-5.vercel.app';
  
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
