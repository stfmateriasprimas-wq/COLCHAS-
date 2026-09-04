// SLA & Delay Calculator based on STF Group Work Schedule:
// Monday to Saturday from 6:00 AM to 6:00 PM (12 business hours/day). Sundays are excluded.

export interface SlaResult {
  diasHabiles: number;
  horasHabiles: number;
  tieneRetraso: boolean;
  esRetrasoCritico: boolean;
  excesoSlaDias: number;
  severidad: 'NORMAL' | 'MODERADA' | 'CRITICA';
}

export function parseColombianDate(dateInput: string | Date): Date {
  if (dateInput instanceof Date) return dateInput;
  if (!dateInput) return new Date(0);
  const str = String(dateInput).trim();
  
  // Format: D/M/YYYY H:M:S or DD/MM/YYYY H:M:S with optional a.m./p.m.
  const match = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
    let hour = match[4] ? parseInt(match[4], 10) : 0;
    const min = match[5] ? parseInt(match[5], 10) : 0;
    const sec = match[6] ? parseInt(match[6], 10) : 0;

    const lower = str.toLowerCase();
    if (lower.includes('p. m.') || lower.includes('pm')) {
      if (hour < 12) hour += 12;
    } else if (lower.includes('a. m.') || lower.includes('am')) {
      if (hour === 12) hour = 0;
    }

    const d = new Date(year, month, day, hour, min, sec);
    if (!isNaN(d.getTime())) return d;
  }

  // Format: YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  const fallback = new Date(str);
  return isNaN(fallback.getTime()) ? new Date(0) : fallback;
}

/**
 * Obtiene el timestamp cronológico exacto de una OP combinando su fecha real y su número de OP
 */
export function getOpChronologicalTimestamp(item: { fechaCreacion?: string; op?: string }): number {
  if (!item) return 0;
  const dt = parseColombianDate(item.fechaCreacion || '');
  const time = dt.getTime();
  if (time > 0) return time;

  // Fallback con número de OP
  const num = parseInt((item.op || '').replace(/\D/g, ''), 10) || 0;
  return num;
}

/**
 * Formatea una fecha respetando estrictamente el formato colombiano de la base de datos:
 * DÍA / MES / AÑO H:MM a. m. / p. m. (ej. 3/9/2026 12:36 p. m.)
 */
export function formatColombianDisplayDate(dateVal?: string | Date): string {
  if (!dateVal) return 'Hoy';
  const str = String(dateVal).trim();
  if (!str) return 'Hoy';

  // Si ya viene en formato D/M/YYYY o DD/MM/YYYY
  const match = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    let hour = match[4] ? parseInt(match[4], 10) : 0;
    const min = match[5] ? match[5].padStart(2, '0') : '00';
    
    const lower = str.toLowerCase();
    let ampm = 'a. m.';
    if (lower.includes('p. m.') || lower.includes('pm')) {
      ampm = 'p. m.';
    } else if (lower.includes('a. m.') || lower.includes('am')) {
      ampm = 'a. m.';
    } else {
      if (hour >= 12) {
        ampm = 'p. m.';
        if (hour > 12) hour -= 12;
      } else {
        ampm = 'a. m.';
        if (hour === 0) hour = 12;
      }
    }
    
    if (hour > 12) hour -= 12;
    if (hour === 0) hour = 12;

    return `${day}/${month}/${year} ${hour}:${min} ${ampm}`;
  }

  // Si viene en formato ISO (YYYY-MM-DD...)
  const isoMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:T|\s+)?(\d{1,2})?:?(\d{1,2})?/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    let hour = isoMatch[4] ? parseInt(isoMatch[4], 10) : 0;
    const min = isoMatch[5] ? isoMatch[5].padStart(2, '0') : '00';
    
    let ampm = hour >= 12 ? 'p. m.' : 'a. m.';
    if (hour > 12) hour -= 12;
    if (hour === 0) hour = 12;

    return `${day}/${month}/${year} ${hour}:${min} ${ampm}`;
  }

  const dt = new Date(str);
  if (!isNaN(dt.getTime())) {
    const day = dt.getDate();
    const month = dt.getMonth() + 1;
    const year = dt.getFullYear();
    let hour = dt.getHours();
    const min = String(dt.getMinutes()).padStart(2, '0');
    let ampm = hour >= 12 ? 'p. m.' : 'a. m.';
    if (hour > 12) hour -= 12;
    if (hour === 0) hour = 12;
    return `${day}/${month}/${year} ${hour}:${min} ${ampm}`;
  }

  return str;
}

export function calculateWorkingDays(startDateStr: string | Date, maxDaysSla: number = 3): SlaResult {
  const startDate = parseColombianDate(startDateStr);
  const now = new Date();

  if (isNaN(startDate.getTime())) {
    return {
      diasHabiles: 0,
      horasHabiles: 0,
      tieneRetraso: false,
      esRetrasoCritico: false,
      excesoSlaDias: 0,
      severidad: 'NORMAL'
    };
  }

  // Work Schedule definition: Monday(1) to Saturday(6), 6:00 to 18:00
  let totalWorkingHours = 0;
  let cur = new Date(startDate);

  // If start is in future
  if (cur >= now) {
    return {
      diasHabiles: 0,
      horasHabiles: 0,
      tieneRetraso: false,
      esRetrasoCritico: false,
      excesoSlaDias: 0,
      severidad: 'NORMAL'
    };
  }

  // Iterate day by day / hours
  while (cur < now) {
    const dayOfWeek = cur.getDay(); // 0 = Sunday, 1-6 = Mon-Sat
    const hour = cur.getHours();

    // If Monday-Saturday between 6:00 and 18:00
    if (dayOfWeek !== 0 && hour >= 6 && hour < 18) {
      totalWorkingHours += 1;
    }

    cur.setHours(cur.getHours() + 1);
  }

  const diasHabiles = Math.max(0, Math.floor(totalWorkingHours / 12));
  const horasHabiles = totalWorkingHours;
  const tieneRetraso = diasHabiles >= maxDaysSla;
  const excesoSlaDias = Math.max(0, diasHabiles - maxDaysSla);
  const esRetrasoCritico = diasHabiles > 5;

  let severidad: 'NORMAL' | 'MODERADA' | 'CRITICA' = 'NORMAL';
  if (esRetrasoCritico) {
    severidad = 'CRITICA';
  } else if (tieneRetraso) {
    severidad = 'MODERADA';
  }

  return {
    diasHabiles,
    horasHabiles,
    tieneRetraso,
    esRetrasoCritico,
    excesoSlaDias,
    severidad
  };
}
