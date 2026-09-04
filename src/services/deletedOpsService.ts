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
  const deletedNumbers = getDeletedOpNumbers();
  return deletedNumbers.includes(clean);
}

/**
 * Moves an active OP to the Deleted History
 */
export function addOpToDeletedHistory(solicitud: SolicitudColcha, adminName: string = 'Edwin Diaz (Administrador)'): DeletedOpRecord {
  const history = getDeletedOpsHistory();
  const now = new Date();
  
  // Format Colombian date & time: "D/M/YYYY, HH:MM:SS"
  const formattedDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}, ${now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;

  const newRecord: DeletedOpRecord = {
    id: `DEL-${Date.now()}-${solicitud.op}`,
    op: solicitud.op,
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
    solicitudOriginal: { ...solicitud }
  };

  // Prepend to history so newest deleted OP is on top
  const updatedHistory = [newRecord, ...history.filter(h => h.op.trim().toUpperCase() !== solicitud.op.trim().toUpperCase())];
  saveDeletedOpsHistory(updatedHistory);
  return newRecord;
}

/**
 * Restores an OP from Deleted History back to active state
 */
export function restoreOpFromDeletedHistory(opOrRecordId: string): SolicitudColcha | null {
  const history = getDeletedOpsHistory();
  const target = history.find(h => h.id === opOrRecordId || h.op.trim().toUpperCase() === opOrRecordId.trim().toUpperCase());
  
  if (!target) return null;

  // Remove from deleted history
  const remaining = history.filter(h => h.id !== target.id && h.op.trim().toUpperCase() !== target.op.trim().toUpperCase());
  saveDeletedOpsHistory(remaining);

  // Return the original solicitud
  return target.solicitudOriginal;
}

/**
 * Permanently purge a deleted OP record if needed
 */
export function purgeDeletedOp(opOrRecordId: string): void {
  const history = getDeletedOpsHistory();
  const remaining = history.filter(h => h.id !== opOrRecordId && h.op.trim().toUpperCase() !== opOrRecordId.trim().toUpperCase());
  saveDeletedOpsHistory(remaining);
}
