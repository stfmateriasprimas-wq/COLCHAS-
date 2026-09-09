import { SolicitudColcha, SectorType, DictamenType } from '../types';

export interface DeletedOpRecord {
  id: string; // Unique deletion record ID
  op: string;
  referencia: string;
  tela: string;
  color: string;
  rollos: number;
  codigoMt: string;
  lote?: string;
  estadoOriginal: SectorType;
  areaActual: string;
  inspector: string;
  fechaCreacion: string;
  fechaEliminacion: string; // Timestamp of deletion
  eliminadoPor: string;     // Name of admin who deleted it (e.g. "Edwin Diaz")
  dictamen?: DictamenType;
  observaciones?: string;
  solicitudOriginal: SolicitudColcha;
}

const DELETED_OPS_KEY = 'stf_deleted_ops_history_v1';
const listeners: Array<(deletedList: DeletedOpRecord[]) => void> = [];

export function getDeletedOpsHistory(): DeletedOpRecord[] {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(DELETED_OPS_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {
        console.warn('Error reading deleted OPs history:', e);
      }
    }
  }
  return [];
}

export function saveDeletedOpsHistory(records: DeletedOpRecord[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(DELETED_OPS_KEY, JSON.stringify(records));
  }
  listeners.forEach(fn => fn(records));
}

export function subscribeDeletedOps(listener: (deletedList: DeletedOpRecord[]) => void): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

export function getDeletedOpNumbers(): string[] {
  const history = getDeletedOpsHistory();
  return history.map(item => item.op.trim().toUpperCase());
}

export function isOpDeleted(opNumber: string): boolean {
  if (!opNumber) return false;
  const clean = opNumber.trim().toUpperCase();
  const digits = opNumber.replace(/\D/g, '');
  const deletedHistory = getDeletedOpsHistory();
  return deletedHistory.some(item => {
    const itemClean = item.op.trim().toUpperCase();
    const itemDigits = item.op.replace(/\D/g, '');
    return itemClean === clean || (digits !== '' && itemDigits === digits) || clean.includes(itemClean) || itemClean.includes(clean);
  });
}

export function unmarkOpAsDeleted(opNumber: string): void {
  if (!opNumber) return;
  const clean = opNumber.trim().toUpperCase();
  const digits = opNumber.replace(/\D/g, '');
  const history = getDeletedOpsHistory();
  const filtered = history.filter(item => {
    const itemClean = item.op.trim().toUpperCase();
    const itemDigits = item.op.replace(/\D/g, '');
    return itemClean !== clean && (digits === '' || itemDigits !== digits);
  });
  if (filtered.length !== history.length) {
    saveDeletedOpsHistory(filtered);
  }
}

/**
 * Moves an active OP to the Deleted History
 */
export function addOpToDeletedHistory(solicitud: SolicitudColcha, adminName: string = 'Edwin Diaz (Administrador)'): DeletedOpRecord {
  const history = getDeletedOpsHistory();
  const now = new Date();
  
  // Format Colombian date & time: "D/M/YYYY, HH:MM:SS"
  const formattedDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}, ${now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;

  const cleanDigits = (solicitud.op || '').replace(/^OP-?/i, '').trim();
  const normalizedOp = cleanDigits ? `OP-${cleanDigits}` : solicitud.op;

  const newRecord: DeletedOpRecord = {
    id: `DEL-${Date.now()}-${cleanDigits || solicitud.op}`,
    op: normalizedOp,
    referencia: solicitud.referencia,
    tela: solicitud.tela,
    color: solicitud.color || 'No especificado',
    rollos: Number(solicitud.rollos) || 1,
    codigoMt: solicitud.codigoMt || '',
    lote: solicitud.lote || '1',
    estadoOriginal: solicitud.estado,
    areaActual: solicitud.areaActual,
    inspector: solicitud.inspector || 'Edwin Diaz',
    fechaCreacion: solicitud.fechaCreacion,
    fechaEliminacion: formattedDate,
    eliminadoPor: adminName,
    dictamen: solicitud.dictamen,
    observaciones: solicitud.observacionesOperario || solicitud.observacionesCalidad || '',
    solicitudOriginal: { ...solicitud, op: normalizedOp }
  };

  // Prepend to history so newest deleted OP is on top
  const targetDigits = cleanDigits;
  const updatedHistory = [
    newRecord, 
    ...history.filter(h => {
      const hDigits = h.op.replace(/^OP-?/i, '').trim();
      return h.op.trim().toUpperCase() !== normalizedOp.toUpperCase() && (targetDigits === '' || hDigits !== targetDigits);
    })
  ];
  saveDeletedOpsHistory(updatedHistory);
  return newRecord;
}

/**
 * Restores an OP from Deleted History back to active state
 */
export function restoreOpFromDeletedHistory(opOrRecordId: string): SolicitudColcha | null {
  const history = getDeletedOpsHistory();
  const cleanTarget = opOrRecordId.replace(/^OP-?/i, '').trim().toUpperCase();
  const targetDigits = opOrRecordId.replace(/\D/g, '');

  const target = history.find(h => {
    const hClean = h.op.replace(/^OP-?/i, '').trim().toUpperCase();
    const hDigits = h.op.replace(/\D/g, '');
    return h.id === opOrRecordId || hClean === cleanTarget || (targetDigits !== '' && hDigits === targetDigits);
  });
  
  if (!target) return null;

  // Remove from deleted history
  const remaining = history.filter(h => h.id !== target.id);
  saveDeletedOpsHistory(remaining);

  // Return the original solicitud
  return target.solicitudOriginal;
}

/**
 * Permanently purge a single deleted OP record
 */
export function purgeDeletedOp(opOrRecordId: string): void {
  const history = getDeletedOpsHistory();
  const cleanTarget = opOrRecordId.replace(/^OP-?/i, '').trim().toUpperCase();
  const targetDigits = opOrRecordId.replace(/\D/g, '');

  const remaining = history.filter(h => {
    const hClean = h.op.replace(/^OP-?/i, '').trim().toUpperCase();
    const hDigits = h.op.replace(/\D/g, '');
    return h.id !== opOrRecordId && hClean !== cleanTarget && (targetDigits === '' || hDigits !== targetDigits);
  });
  saveDeletedOpsHistory(remaining);
}

/**
 * Clears the entire deleted history
 */
export function clearDeletedOpsHistory(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(DELETED_OPS_KEY);
  }
  listeners.forEach(fn => fn([]));
}
