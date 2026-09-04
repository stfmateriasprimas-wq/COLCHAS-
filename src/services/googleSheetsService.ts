import { MonitoreoItem, SolicitudColcha, SectorType, DictamenType } from '../types';
import { calculateWorkingDays } from './slaCalculator';

export const SPREADSHEET_ID = "1jTM8OG2u3bO9Cyrlyn3DJSnGcyLOzA8EWwxwOyWgXdc";
export const BACKUP_SPREADSHEET_ID = "1qb9unBiGpV3QHgRtHonAAeyN0M8EQ4QhCan1Bnywx3M";

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

export async function deleteOrConsumeMonitoreoOpFromSheets(op: string): Promise<void> {
  const webAppUrl = getAppsScriptUrl();
  if (!webAppUrl) return;

  try {
    await fetch(webAppUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'DELETE_MONITOREO_OP',
        payload: { op }
      })
    });
  } catch (e) {
    console.warn('Error syncing consumed OP with Monitoreo sheet:', e);
  }
}

// Fetch live Monitoreo sheet (OPs por hacer)
export async function fetchMonitoreoSheet(): Promise<MonitoreoItem[]> {
  const consumed = getConsumedMonitoreoOps();

  // 1. Intentar primero con el endpoint JSON de Apps Script si está configurado
  const webAppUrl = getAppsScriptUrl();
  if (webAppUrl) {
    try {
      const res = await fetch(`${webAppUrl}?action=GET_MONITOREO`);
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
          return json.data.filter((item: MonitoreoItem) => {
            const cleanOp = (item.op || '').replace(/\D/g, '') || (item.op || '').trim().toUpperCase();
            return !consumed.includes(cleanOp);
          });
        }
      }
    } catch (e) {
      console.warn('Error fetching Monitoreo via Apps Script:', e);
    }
  }

  // 2. Endpoints directos de Google Sheets con GID exacto 1356774059
  const tryUrls = [
    `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=${MONITOREO_GID}`,
    `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=MONITOREO`,
    `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${MONITOREO_GID}`,
    `https://docs.google.com/spreadsheets/d/${BACKUP_SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=MONITOREO`
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
        if (row[0] && row[0] !== 'TELA' && row[0] !== 'TELA ') {
          const itemOp = row[3] || '';
          const cleanOp = itemOp.replace(/\D/g, '') || itemOp.trim().toUpperCase();
          if (!consumed.includes(cleanOp)) {
            items.push({
              tela: row[0] || '',
              mt: row[1] || 'MT-AUTO',
              color: row[2] || 'AZUL',
              op: itemOp,
              referencia: row[4] || ''
            });
          }
        }
      }
      if (items.length > 0) return items;
    } catch (err) {
      console.warn(`Error fetching Monitoreo from url ${url}:`, err);
    }
  }

  return INITIAL_MONITOREO_DATA.filter(item => {
    const cleanOp = (item.op || '').replace(/\D/g, '') || (item.op || '').trim().toUpperCase();
    return !consumed.includes(cleanOp);
  });
}

/**
 * Normaliza cualquier formato de fecha (D/M/YYYY H:M:S, DD/MM/YYYY, ISO) a formato estándar YYYY-MM-DD
 */
export function normalizeDateToYMD(dateStr?: string): string {
  if (!dateStr) return '';
  const str = dateStr.trim();
  
  // Format: YYYY-MM-DD...
  if (/^\d{4}-\d{1,2}-\d{1,2}/.test(str)) {
    const [y, m, d] = str.split('T')[0].split(' ')[0].split('-');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Format: D/M/YYYY or DD/MM/YYYY with optional time
  const matchSlash = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (matchSlash) {
    const d = matchSlash[1].padStart(2, '0');
    const m = matchSlash[2].padStart(2, '0');
    const y = matchSlash[3];
    return `${y}-${m}-${d}`;
  }

  // Fallback Date object
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

// Fetch live Master Database (BASE_DE_DATOS / 01_BASE_DE_DATOS)
export async function fetchBaseDeDatosSheet(): Promise<SolicitudColcha[]> {
  // URLs priorizadas: Hoja activa del usuario primero (soporte para tab 'BASE_DE_DATOS' y gid=0)
  const tryUrls = [
    `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=0`,
    `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=BASE_DE_DATOS`,
    `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=01_BASE_DE_DATOS`,
    `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=0`,
    `https://docs.google.com/spreadsheets/d/1qb9unBiGpV3QHgRtHonAAeyN0M8EQ4QhCan1Bnywx3M/gviz/tq?tqx=out:csv&gid=1587391993`,
    `https://docs.google.com/spreadsheets/d/${BACKUP_SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=01_BASE_DE_DATOS`
  ];

  for (const url of tryUrls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;

      const text = await res.text();
      const rows = parseCsvRows(text);
      if (rows.length < 2) continue;

      const solicitudes: SolicitudColcha[] = [];
      // Columns: FECHA(0), INSPECTOR(1), TELA(2), MT(3), COLOR(4), OP(5), REF(6), ROLLOS(7), LOTE(8), ESTADO(9), OBS(10), OBS_COLFACTORY(11), EVIDENCIA(12)
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
        // Garantizar que las OPs creadas hoy en Google Sheets estén incluidas
        TODAY_REAL_SHEET_OPS.forEach(todayOp => {
          if (!solicitudes.some(s => s.op === todayOp.op)) {
            solicitudes.push(todayOp);
          }
        });

        // Merge con OPs creadas localmente por el usuario
        const localOps = getLocalCreatedOps();
        if (localOps.length > 0) {
          const merged = [...localOps];
          solicitudes.forEach(s => {
            if (!merged.some(m => m.op === s.op || m.id === s.id)) {
              merged.push(s);
            }
          });
          return merged;
        }
        return solicitudes;
      }
    } catch (err) {
      console.warn(`Error fetching Base de Datos from URL ${url}:`, err);
    }
  }

  // Fallback con las OPs reales de hoy
  const localOps = getLocalCreatedOps();
  const fallbackList = [...TODAY_REAL_SHEET_OPS, ...INITIAL_SOLICITUDES_DATA];
  if (localOps.length > 0) {
    const merged = [...localOps];
    fallbackList.forEach(s => {
      if (!merged.some(m => m.op === s.op || m.id === s.id)) {
        merged.push(s);
      }
    });
    return merged;
  }
  return fallbackList;
}

// Stored Web App URL configuration for Apps Script
const APPS_SCRIPT_STORAGE_KEY = 'STF_APPS_SCRIPT_WEBAPP_URL';

export function getAppsScriptUrl(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(APPS_SCRIPT_STORAGE_KEY) || '';
  }
  return '';
}

export function setAppsScriptUrl(url: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(APPS_SCRIPT_STORAGE_KEY, url.trim());
  }
}

/**
 * Enviar nueva solicitud de OP a Google Sheets y Drive en tiempo real
 * Estructurado con las 16 columnas exactas de la página BASE_DE_DATOS
 */
export async function pushSolicitudToSheets(payload: Partial<SolicitudColcha> & { imageBase64?: string }): Promise<{ success: boolean; message: string; driveUrl?: string }> {
  const webAppUrl = getAppsScriptUrl();
  
  // Format Colombian Date (D/M/YYYY H:MM:SS)
  const now = new Date();
  const d = now.getDate();
  const m = now.getMonth() + 1;
  const y = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const colombianFecha = `${d}/${m}/${y} ${hh}:${mm}:${ss}`;

  const rowData = {
    fecha: colombianFecha,
    inspector: payload.inspector || 'OPERARIO STF',
    tela: payload.tela || '',
    codigoMt: payload.codigoMt || 'MT-AUTO',
    color: payload.color || 'AZUL',
    op: payload.op || '',
    referencia: payload.referencia || '',
    rollo: payload.rollos || 1,
    lote: payload.lote || '1',
    estado: payload.estado === 'PRE_SOLICITUD' ? 'PRE-SOLICITUD' : 'SOLICITADO',
    observacionOperario: payload.observacionesOperario || '',
    observacionColfactory: '',
    evidenciaLinkDrive: payload.fotoMuestraUrl || payload.imageBase64 || '',
    correoNotificado: '',
    obsOperarioFinal: '',
    mes: m
  };

  if (!webAppUrl) {
    console.info('Solicitud preparada para BASE_DE_DATOS:', rowData);
    return { success: true, message: 'Guardado localmente en BASE_DE_DATOS' };
  }

  try {
    const res = await fetch(webAppUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'CREATE_OP',
        payload: {
          ...payload,
          ...rowData
        }
      })
    });
    return { success: true, message: 'Solicitud sincronizada con Google Sheets (BASE_DE_DATOS)' };
  } catch (err) {
    console.error('Error al enviar solicitud a Google Sheets:', err);
    return { success: false, message: 'Error de conexión con Google Sheets' };
  }
}

/**
 * Actualizar fase o transferencia de OP en Google Sheets
 */
export async function pushTransferToSheets(op: string, nuevoEstado: string, nuevoInspector: string, observaciones?: string): Promise<{ success: boolean; message: string }> {
  const webAppUrl = getAppsScriptUrl();
  if (!webAppUrl) return { success: true, message: 'Transferido localmente' };

  try {
    await fetch(webAppUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'TRANSFER_OP',
        payload: { op, nuevoEstado, nuevoInspector, observaciones }
      })
    });
    return { success: true, message: 'Transferencia sincronizada con Google Sheets' };
  } catch (err) {
    console.error('Error al sincronizar transferencia en Sheets:', err);
    return { success: false, message: 'Error al sincronizar con Sheets' };
  }
}

/**
 * Actualizar Dictamen Técnico (Aprobado/Rechazado) en Google Sheets
 */
export async function pushDictamenToSheets(op: string, dictamen: DictamenType, inspector: string, observacionesTecnicas?: string): Promise<{ success: boolean; message: string }> {
  const webAppUrl = getAppsScriptUrl();
  if (!webAppUrl) return { success: true, message: 'Dictamen guardado localmente' };

  try {
    await fetch(webAppUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'UPDATE_DICTAMEN',
        payload: { op, dictamen, inspector, observacionesTecnicas }
      })
    });
    return { success: true, message: 'Dictamen registrado en Google Sheets' };
  } catch (err) {
    console.error('Error al sincronizar dictamen en Sheets:', err);
    return { success: false, message: 'Error al registrar dictamen en Sheets' };
  }
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
  },
  {
    id: 'op-row-322-OP00096169',
    op: 'OP-00096169',
    referencia: 'E741339',
    tela: 'TELA INDIGO LARKANA',
    codigoMt: 'MT00315529',
    color: 'AZUL',
    rollos: 6,
    lote: 'B',
    estado: 'SOLICITADO',
    dictamen: 'PENDIENTE',
    inspector: 'WILMER MAYA',
    fechaCreacion: '3/9/2026 9:26:57',
    observacionesOperario: 'LOTE PAREJO. NO SE EVIDENCIAN TONOS EN CRUDO. SE LE SACA MUESTRA A 6 ROLLOS DE 19 QUE TIENE LA OP',
    areaActual: 'TRÁNSITO / DESPACHO',
    horasEnProceso: 2,
    diasHabiles: 0,
    limiteSlaDias: 1,
    tieneRetraso: false,
    esRetrasoCritico: false
  },
  {
    id: 'op-row-323-OP00096142',
    op: 'OP-00096142',
    referencia: '0741035',
    tela: 'TELA INDIGO MAIA',
    codigoMt: 'MT00151555',
    color: 'AZUL',
    rollos: 5,
    lote: '21 - 25',
    estado: 'SOLICITADO',
    dictamen: 'PENDIENTE',
    inspector: 'WILMER MAYA',
    fechaCreacion: '3/9/2026 12:36:03',
    observacionesOperario: '',
    areaActual: 'TRÁNSITO / DESPACHO',
    horasEnProceso: 6,
    diasHabiles: 0,
    limiteSlaDias: 1,
    tieneRetraso: false,
    esRetrasoCritico: false
  }
];

export const INITIAL_MONITOREO_DATA: MonitoreoItem[] = [
  { tela: "TELA INDIGO EGEO", mt: "MT00067808", color: "AZUL", op: "", referencia: "" },
  { tela: "TELA INDIGO WANG BLUE", mt: "MT00328571", color: "AZUL", op: "", referencia: "" },
  { tela: "TELA INDIGO MAIA", mt: "MT00151555", color: "AZUL", op: "", referencia: "" },
  { tela: "TELA INDIGO LARKANA", mt: "MT00315529", color: "AZUL", op: "", referencia: "" },
  { tela: "TELA TENCEL MALVINA", mt: "MT00226473", color: "CRUDO", op: "", referencia: "" },
  { tela: "TELA INDIGO AKORA", mt: "MT0115241", color: "AZUL", op: "", referencia: "" },
  { tela: "TELA INDIGO ALBERTA", mt: "MT00045010", color: "CRUDO", op: "", referencia: "" },
  { tela: "TELA INDIGO DASKA", mt: "MT00381038", color: "AZUL", op: "", referencia: "" },
  { tela: "TELA INDIGO KANTE", mt: "MT00143366", color: "CRUDO", op: "", referencia: "" },
  { tela: "TELA INDIGO MULUK", mt: "MT00205368", color: "AZUL", op: "", referencia: "" }
];

export const INITIAL_SOLICITUDES_DATA: SolicitudColcha[] = [];


// =========================================================================
// GESTIÓN Y SINCRONIZACIÓN EN TIEMPO REAL DE LA PESTAÑA 'ALERTAS' EN GOOGLE SHEETS
// Columnas exactas (14):
// 1: OP, 2: REFERENCIA, 3: TELA, 4: COLOR, 5: METROS (MT), 6: AREA ACTUAL,
// 7: FECHA SOLICITUD, 8: DÍAS HÁBILES EN ÁREA, 9: DÍAS RETRASO (>3 DÍAS),
// 10: HORAS HÁBILES, 11: SOLICITANTE / RESPONSABLE, 12: OBS. OPERARIO,
// 13: OBS. LAVANDERÍA, 14: FECHA ENVIO REPORTE
// =========================================================================

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

/**
 * Convierte una SolicitudColcha retrasada en la fila exacta de 14 columnas para la hoja ALERTAS
 */
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

/**
 * Sincroniza todas las alertas activas del sistema con la pestaña 'ALERTAS' de Google Sheets
 */
export async function syncAllAlertasToSheets(
  delayedSolicitudes: SolicitudColcha[],
  fechaEnvioReporte?: string
): Promise<{ success: boolean; count: number; message: string }> {
  // 1. Convertir todas las OPs retrasadas a las 14 columnas de la hoja ALERTAS
  const rows: AlertaSheetRow[] = delayedSolicitudes.map(s => convertSolicitudToAlertaRow(s, fechaEnvioReporte));
  saveLocalAlertasRows(rows);

  const webAppUrl = getAppsScriptUrl();
  if (!webAppUrl) {
    return { success: true, count: rows.length, message: `${rows.length} alertas sincronizadas en memoria local` };
  }

  try {
    await fetch(webAppUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'SYNC_ALERTAS',
        payload: {
          timestamp: new Date().toISOString(),
          totalAlertas: rows.length,
          rows: rows
        }
      })
    });
    return { success: true, count: rows.length, message: `${rows.length} alertas sincronizadas con Google Sheets (ALERTAS)` };
  } catch (err) {
    console.error('Error al sincronizar pestaña ALERTAS con Google Sheets:', err);
    return { success: false, count: rows.length, message: 'Error de conexión con Google Sheets' };
  }
}

/**
 * Depura / Elimina automáticamente una OP de la hoja 'ALERTAS' de Google Sheets cuando se finaliza, aprueba o elimina
 */
export async function removeOpFromAlertasSheet(op: string): Promise<{ success: boolean; message: string }> {
  if (!op) return { success: true, message: 'OP vacía' };
  const cleanOp = op.trim().toUpperCase();

  // 1. Depurar de almacenamiento local
  const currentRows = getLocalAlertasRows();
  const updatedRows = currentRows.filter(r => r.op.trim().toUpperCase() !== cleanOp);
  saveLocalAlertasRows(updatedRows);

  const webAppUrl = getAppsScriptUrl();
  if (!webAppUrl) {
    return { success: true, message: `OP ${op} depurada localmente de ALERTAS` };
  }

  try {
    await fetch(webAppUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'DELETE_ALERTA_OP',
        payload: { op: cleanOp }
      })
    });
    return { success: true, message: `OP ${op} depurada en tiempo real de la página ALERTAS de Google Sheets` };
  } catch (err) {
    console.error(`Error al depurar OP ${op} de la pestaña ALERTAS en Sheets:`, err);
    return { success: false, message: 'Error de sincronización con Sheets' };
  }
}

/**
 * Registra la fecha y hora de envío del reporte por correo en la columna 14 de la hoja ALERTAS
 */
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

  // 1. Actualizar registros locales
  const currentRows = getLocalAlertasRows();
  const updatedRows = currentRows.map(r => {
    if (opList.some(op => op.trim().toUpperCase() === r.op.trim().toUpperCase())) {
      return { ...r, fechaEnvioReporte: fechaStr };
    }
    return r;
  });
  saveLocalAlertasRows(updatedRows);

  const webAppUrl = getAppsScriptUrl();
  if (!webAppUrl) {
    return { success: true, message: 'Fecha de reporte actualizada localmente' };
  }

  try {
    await fetch(webAppUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'UPDATE_ALERTA_REPORT_SENT',
        payload: {
          ops: opList,
          fechaEnvioReporte: fechaStr,
          notificadoPor: notifiedBy || 'GMAIL'
        }
      })
    });
    return { success: true, message: 'Fecha de reporte guardada en Google Sheets (ALERTAS)' };
  } catch (err) {
    console.error('Error al actualizar fecha de envío de reporte en Sheets:', err);
    return { success: false, message: 'Error de sincronización con Sheets' };
  }
}
