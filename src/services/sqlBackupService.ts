import { supabase, isSupabaseConfigured } from './supabaseClient';
import { SolicitudColcha } from '../types';
import { parseColombianDate } from './slaCalculator';

export interface SqlHealthStatus {
  ok: boolean;
  message: string;
  totalOpsInPostgres: number;
  pingMs: number;
  lastSyncDate?: string;
}

export interface BulkSyncResult {
  total: number;
  insertedOrUpdated: number;
  errorCount: number;
  durationMs: number;
  errorDetails?: string[];
}

/**
 * Normaliza el código de la OP asegurando formato 'OP-XXXXXX'
 */
function normalizeOpCode(rawOp: string): string {
  const clean = (rawOp || '').trim().toUpperCase();
  if (clean.startsWith('OP-')) return clean;
  if (clean.startsWith('OP')) return `OP-${clean.replace(/^OP\s*[-_]?\s*/, '')}`;
  return `OP-${clean}`;
}

/**
 * Prueba de salud y conectividad con la base de datos PostgreSQL en Supabase
 */
export async function checkSqlDatabaseHealth(): Promise<SqlHealthStatus> {
  const startTime = Date.now();
  if (!isSupabaseConfigured() || !supabase) {
    return {
      ok: false,
      message: 'Supabase no está configurado (faltan URL o Anon Key).',
      totalOpsInPostgres: 0,
      pingMs: 0,
    };
  }

  try {
    const { count, error } = await supabase
      .from('stf_colchas_ops')
      .select('*', { count: 'exact', head: true });

    const pingMs = Date.now() - startTime;

    if (error) {
      console.warn('[SQL Backup] Error de verificación de salud:', error);
      return {
        ok: false,
        message: `Error al consultar PostgreSQL: ${error.message}`,
        totalOpsInPostgres: 0,
        pingMs,
      };
    }

    // Consultar último log de sincronización
    const { data: lastLog } = await supabase
      .from('stf_colchas_sync_logs')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      ok: true,
      message: 'Conexión activa y saludable con Supabase PostgreSQL.',
      totalOpsInPostgres: count || 0,
      pingMs,
      lastSyncDate: lastLog?.created_at,
    };
  } catch (err: any) {
    return {
      ok: false,
      message: `Excepción de red al conectar con Supabase: ${err?.message || err}`,
      totalOpsInPostgres: 0,
      pingMs: Date.now() - startTime,
    };
  }
}

/**
 * Convierte de forma resiliente cualquier formato de fecha de Sheets a ISO String sin arrojar jamás Invalid Date
 */
function safeToIsoString(rawDate?: string | Date | null): string {
  if (!rawDate) return new Date().toISOString();
  try {
    const d = parseColombianDate(rawDate);
    if (d && !isNaN(d.getTime()) && d.getTime() > 0) {
      return d.toISOString();
    }
  } catch (e) {
    // fallback
  }
  return new Date().toISOString();
}

function safeNullableIsoString(rawDate?: string | Date | null): string | null {
  if (!rawDate) return null;
  try {
    const d = parseColombianDate(rawDate);
    if (d && !isNaN(d.getTime()) && d.getTime() > 0) {
      return d.toISOString();
    }
  } catch (e) {
    // fallback
  }
  return null;
}

/**
 * Mapea una SolicitudColcha del frontend al registro relacional de stf_colchas_ops
 */
function mapOpToSqlRecord(op: SolicitudColcha) {
  const opCodigo = normalizeOpCode(op.op);
  return {
    op_codigo: opCodigo,
    fecha_registro: safeToIsoString(op.fechaCreacion),
    fecha_texto: op.fechaCreacion || '',
    inspector: op.inspector || 'OPERARIO STF',
    tela: op.tela || '',
    codigo_mt: op.codigoMt || '',
    color: op.color || 'AZUL',
    referencia: op.referencia || '',
    rollos: Number(op.rollos) || 1,
    lote: String(op.lote || '1'),
    estado: op.estado || 'SOLICITADO',
    observacion_operario: op.observacionesOperario || '',
    observacion_lavanderia: op.observacionesLavanderia || '',
    dictamen: op.dictamen || 'PENDIENTE',
    observacion_calidad: op.observacionesCalidad || '',
    observacion_prenda_terminada: op.observacionesPrendaTerminada || '',
    sla_dias: Number(op.diasHabiles) || 0,
    horas_en_proceso: Number(op.horasEnProceso) || 0,
    tiene_retraso: Boolean(op.tieneRetraso),
    es_retraso_critico: Boolean(op.esRetrasoCritico),
    area_actual: op.areaActual || op.estado || 'SOLICITADO',
    email_usuario: op.emailUsuario || '',
    origen_sync: 'GOOGLE_SHEETS',
    updated_at: new Date().toISOString(),
  };
}

/**
 * Mapea las URLs de fotos y Drive de una SolicitudColcha a stf_colchas_fotos
 */
function mapFotosToSqlRecord(op: SolicitudColcha) {
  const opCodigo = normalizeOpCode(op.op);
  return {
    op_codigo: opCodigo,
    drive_folder_url: op.driveFolderUrl || null,
    foto_muestra_url: op.fotoMuestraUrl || null,
    foto_calidad_url: op.fotoCalidadUrl || null,
    foto_prenda_terminada_1_url: op.fotoPrendaTerminada1Url || null,
    foto_prenda_terminada_2_url: op.fotoPrendaTerminada2Url || null,
    fecha_foto_calidad: safeNullableIsoString(op.fechaFotoCalidad),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Respaldar una única OP en PostgreSQL (Modo silencioso y no bloqueante)
 * Si falla, la operación principal en Google Sheets y Drive NUNCA se detiene.
 */
export async function backupSingleOpToSql(
  op: SolicitudColcha,
  usuarioAccion?: { id?: string; nombre?: string; area?: string }
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: 'Supabase no configurado' };
  }

  try {
    const opRecord = mapOpToSqlRecord(op);
    const fotosRecord = mapFotosToSqlRecord(op);

    // 1. Upsert en stf_colchas_ops
    const { error: opError } = await supabase
      .from('stf_colchas_ops')
      .upsert(opRecord, { onConflict: 'op_codigo' });

    if (opError) {
      console.warn('[SQL Backup] Error en upsert de OP:', opError);
      return { success: false, error: opError.message };
    }

    // 2. Upsert en stf_colchas_fotos
    const { error: fotoError } = await supabase
      .from('stf_colchas_fotos')
      .upsert(fotosRecord, { onConflict: 'op_codigo' });

    if (fotoError) {
      console.warn('[SQL Backup] Error en upsert de fotos:', fotoError);
    }

    // 3. Auditoría de transición si viene información de usuario
    if (usuarioAccion) {
      await supabase.from('stf_colchas_auditoria').insert({
        op_codigo: opRecord.op_codigo,
        estado_nuevo: opRecord.estado,
        usuario_nombre: usuarioAccion.nombre || 'OPERARIO STF',
        usuario_id: usuarioAccion.id || 'N/A',
        area: usuarioAccion.area || opRecord.area_actual,
        detalles: { dictamen: opRecord.dictamen, fecha: new Date().toISOString() },
      });
    }

    return { success: true };
  } catch (err: any) {
    console.warn('[SQL Backup] Excepción al respaldar OP individual:', err);
    return { success: false, error: err?.message || 'Error de red' };
  }
}

/**
 * Sincronización Masiva: Lee todas las OPs cargadas de Google Sheets y las
 * respalda en bloque en Supabase PostgreSQL.
 */
export async function bulkSyncOpsToSql(
  ops: SolicitudColcha[],
  ejecutadoPor: string = 'ADMIN'
): Promise<BulkSyncResult> {
  const startTime = Date.now();
  if (!isSupabaseConfigured() || !supabase) {
    return {
      total: ops.length,
      insertedOrUpdated: 0,
      errorCount: ops.length,
      durationMs: 0,
      errorDetails: ['Supabase no está configurado o no hay cliente activo.'],
    };
  }

  if (!ops || ops.length === 0) {
    return {
      total: 0,
      insertedOrUpdated: 0,
      errorCount: 0,
      durationMs: 0,
    };
  }

  const errors: string[] = [];
  let successfulOps = 0;

  // Lotes de 50 OPs para balancear red y rendimiento
  const BATCH_SIZE = 50;

  for (let i = 0; i < ops.length; i += BATCH_SIZE) {
    const batch = ops.slice(i, i + BATCH_SIZE);
    const opRecords = batch.map(mapOpToSqlRecord);
    const fotosRecords = batch.map(mapFotosToSqlRecord);

    try {
      // 1. Guardar lote de OPs
      const { error: batchOpError } = await supabase
        .from('stf_colchas_ops')
        .upsert(opRecords, { onConflict: 'op_codigo' });

      if (batchOpError) {
        errors.push(`Error en lote ${i / BATCH_SIZE + 1} (OPs): ${batchOpError.message}`);
      } else {
        successfulOps += batch.length;
      }

      // 2. Guardar lote de Fotos
      const { error: batchFotosError } = await supabase
        .from('stf_colchas_fotos')
        .upsert(fotosRecords, { onConflict: 'op_codigo' });

      if (batchFotosError) {
        errors.push(`Error en lote ${i / BATCH_SIZE + 1} (Fotos): ${batchFotosError.message}`);
      }
    } catch (batchErr: any) {
      errors.push(`Excepción en lote ${i / BATCH_SIZE + 1}: ${batchErr?.message || batchErr}`);
    }
  }

  const durationMs = Date.now() - startTime;

  // Registrar métricas en la tabla de logs
  try {
    await supabase.from('stf_colchas_sync_logs').insert({
      tipo_sync: 'MANUAL_BULK',
      total_ops_sheets: ops.length,
      ops_insertadas: successfulOps,
      ops_actualizadas: successfulOps,
      errores: errors.length,
      duracion_ms: durationMs,
      ejecutado_por: ejecutadoPor,
      detalles: { errores: errors },
    });
  } catch (logErr) {
    console.warn('[SQL Backup] No se pudo guardar el log de sync:', logErr);
  }

  return {
    total: ops.length,
    insertedOrUpdated: successfulOps,
    errorCount: errors.length,
    durationMs,
    errorDetails: errors.length > 0 ? errors : undefined,
  };
}
