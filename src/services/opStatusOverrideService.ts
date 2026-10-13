import { SectorType, DictamenType } from '../types';

export interface OpStatusOverride {
  op: string;
  estado: SectorType;
  areaActual: string;
  dictamen?: DictamenType;
  observacionesCalidad?: string;
  observacionesLavanderia?: string;
  timestamp: number;
}

const STATUS_OVERRIDES_KEY = 'stf_op_status_overrides_v2';
const MAX_OVERRIDE_AGE_MS = 48 * 60 * 60 * 1000; // 48 horas

function getCleanOpKey(op: string): string {
  const cleanDigits = (op || '').replace(/\D/g, '');
  if (cleanDigits) return cleanDigits;
  return (op || '').trim().toUpperCase().replace(/^OP-+/i, '');
}

/**
 * Obtiene todos los overrides de estado activos en memoria/localStorage
 */
export function getAllStatusOverrides(): Record<string, OpStatusOverride> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STATUS_OVERRIDES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const now = Date.now();
    const valid: Record<string, OpStatusOverride> = {};
    for (const [key, item] of Object.entries(parsed as Record<string, OpStatusOverride>)) {
      if (item && item.timestamp && (now - item.timestamp < MAX_OVERRIDE_AGE_MS)) {
        valid[key] = item;
      }
    }
    return valid;
  } catch (e) {
    console.warn('Error leyendo status overrides:', e);
    return {};
  }
}

/**
 * Guarda o actualiza un override de estado para una OP
 */
export function saveOpStatusOverride(
  op: string,
  estado: SectorType,
  areaActual: string,
  observacionesCalidad?: string,
  dictamen?: DictamenType,
  observacionesLavanderia?: string
): void {
  if (typeof window === 'undefined' || !op) return;
  try {
    const key = getCleanOpKey(op);
    if (!key) return;

    const current = getAllStatusOverrides();
    current[key] = {
      op,
      estado,
      areaActual,
      dictamen,
      observacionesCalidad,
      observacionesLavanderia,
      timestamp: Date.now()
    };

    localStorage.setItem(STATUS_OVERRIDES_KEY, JSON.stringify(current));
  } catch (e) {
    console.warn('Error guardando status override para OP:', op, e);
  }
}

/**
 * Obtiene el override activo para una OP si existe
 */
export function getOpStatusOverride(op: string): OpStatusOverride | null {
  if (typeof window === 'undefined' || !op) return null;
  const key = getCleanOpKey(op);
  if (!key) return null;
  const overrides = getAllStatusOverrides();
  return overrides[key] || null;
}

/**
 * Elimina un override si la base de datos remota ya se sincronizó completamente
 */
export function clearOpStatusOverride(op: string): void {
  if (typeof window === 'undefined' || !op) return;
  try {
    const key = getCleanOpKey(op);
    if (!key) return;
    const current = getAllStatusOverrides();
    if (current[key]) {
      delete current[key];
      localStorage.setItem(STATUS_OVERRIDES_KEY, JSON.stringify(current));
    }
  } catch (e) {
    console.warn('Error eliminando status override:', e);
  }
}
