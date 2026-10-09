import React, { useState, useEffect } from 'react';
import { 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Activity, 
  Server, 
  ArrowRight, 
  ExternalLink,
  Layers,
  Clock,
  Sparkles
} from 'lucide-react';
import { SolicitudColcha } from '../../types';
import { UsuarioSTF } from '../../services/authService';
import { 
  checkSqlDatabaseHealth, 
  bulkSyncOpsToSql, 
  SqlHealthStatus, 
  BulkSyncResult 
} from '../../services/sqlBackupService';
import { SUPABASE_URL } from '../../services/supabaseClient';

interface SqlBackupPanelProps {
  currentUser: UsuarioSTF;
  solicitudes: SolicitudColcha[];
  isDarkMode?: boolean;
}

export const SqlBackupPanel: React.FC<SqlBackupPanelProps> = ({
  currentUser,
  solicitudes,
  isDarkMode = false
}) => {
  const [health, setHealth] = useState<SqlHealthStatus | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<number>(0);
  const [lastSyncResult, setLastSyncResult] = useState<BulkSyncResult | null>(null);
  const [alertBanner, setAlertBanner] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Verificar estado de conexión inicial
  const runHealthCheck = async () => {
    setIsCheckingHealth(true);
    try {
      const res = await checkSqlDatabaseHealth();
      setHealth(res);
    } catch (err: any) {
      setHealth({
        ok: false,
        message: err?.message || 'Error inesperado',
        totalOpsInPostgres: 0,
        pingMs: 0
      });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  useEffect(() => {
    runHealthCheck();
  }, []);

  // Ejecutar Sincronización Masiva
  const handleBulkSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncProgress(20);
    setAlertBanner(null);

    try {
      setSyncProgress(50);
      const result = await bulkSyncOpsToSql(
        solicitudes, 
        `${currentUser.nombre} (${currentUser.id})`
      );
      setSyncProgress(100);
      setLastSyncResult(result);

      if (result.errorCount === 0) {
        setAlertBanner({
          type: 'success',
          message: `¡Respaldo exitoso! Se sincronizaron ${result.insertedOrUpdated} OPs con PostgreSQL en ${result.durationMs}ms.`
        });
      } else {
        setAlertBanner({
          type: 'error',
          message: `Sincronización parcial: ${result.insertedOrUpdated} correctas, ${result.errorCount} errores.`
        });
      }

      // Re-verificar estado de salud para actualizar conteo
      await runHealthCheck();
    } catch (err: any) {
      setAlertBanner({
        type: 'error',
        message: `Error al ejecutar sincronización: ${err?.message || err}`
      });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncProgress(0), 1000);
    }
  };

  // En Google Sheets existen registros con la misma OP (sublotes o validaciones).
  // La base de datos relacional PostgreSQL indexa y respalda OPs únicas mediante la clave UNIQUE 'op_codigo'.
  const uniqueSheetsOps = React.useMemo(() => {
    const set = new Set<string>();
    solicitudes.forEach(s => {
      const code = (s.op || '').trim().toUpperCase();
      if (code && code !== 'OP-' && code !== 'OP-OP') {
        set.add(code);
      }
    });
    return set.size;
  }, [solicitudes]);

  const sheetsTotal = solicitudes.length;
  const postgresTotal = health?.totalOpsInPostgres ?? 0;
  const pendingCount = Math.max(0, uniqueSheetsOps - postgresTotal);
  const isDiff = pendingCount > 0;

  return (
    <div className="space-y-6">
      {/* 1. HERO BANNER DE ESTADO */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 via-slate-900 to-indigo-950 p-6 md:p-8 border border-white/10 shadow-2xl text-white">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-[11px] font-mono font-bold text-indigo-300">
              <Database className="w-3.5 h-3.5" />
              <span>RESPALDO SQL · POSTGRESQL (SUPABASE)</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Capa de Respaldo Profesional
            </h2>
            <p className="text-sm text-zinc-300 leading-relaxed font-sans">
              Base de datos relacional PostgreSQL en espejo con Google Sheets. Protege la información histórica, 
              evidencias en Drive y auditoría forense sin interferir con la operación en vivo.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              type="button"
              onClick={runHealthCheck}
              disabled={isCheckingHealth}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-mono font-bold transition active:scale-95 cursor-pointer disabled:opacity-50"
              title="Comprobar latencia y estado con Supabase"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingHealth ? 'animate-spin text-cyan-300' : 'text-zinc-300'}`} />
              <span>Verificar Conexión</span>
            </button>

            <button
              type="button"
              onClick={handleBulkSync}
              disabled={isSyncing || !health?.ok}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-bold font-mono text-xs shadow-lg shadow-emerald-500/20 transition active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSyncing ? 'Sincronizando...' : 'Respaldar Sheets ➔ Supabase'}</span>
            </button>
          </div>
        </div>

        {/* Barra de progreso interactiva */}
        {syncProgress > 0 && (
          <div className="mt-5 w-full bg-white/10 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-cyan-400 to-emerald-400 h-full transition-all duration-300"
              style={{ width: `${syncProgress}%` }}
            />
          </div>
        )}
      </div>

      {/* 2. ALERT BANNER */}
      {alertBanner && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-sm font-sans ${
          alertBanner.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          <div className="flex items-center gap-3">
            {alertBanner.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
            )}
            <span>{alertBanner.message}</span>
          </div>
          <button 
            onClick={() => setAlertBanner(null)} 
            className="text-xs font-mono font-bold underline hover:opacity-80"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* 3. TARJETAS DE MÉTRICAS COMPARATIVAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Estado Conexión */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-mono">
            <span>ESTADO DE CONEXIÓN</span>
            <Server className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-4 flex items-center gap-3">
            <span className={`w-3 h-3 rounded-full ${health?.ok ? 'bg-emerald-500 shadow-md shadow-emerald-500/50 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-lg font-black text-zinc-900 dark:text-white">
              {health?.ok ? 'CONECTADO' : 'DESCONECTADO'}
            </span>
          </div>
          <div className="mt-2 text-[11px] font-mono text-zinc-500">
            {health?.pingMs ? `Latencia: ${health.pingMs} ms` : 'Sin respuesta'}
          </div>
        </div>

        {/* OPs en Google Sheets (Origen) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-mono">
            <span>GOOGLE SHEETS (EN VIVO)</span>
            <Layers className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-zinc-900 dark:text-white">
              {sheetsTotal}
            </span>
            <span className="text-xs font-mono text-zinc-500">
              filas ({uniqueSheetsOps} OPs únicas)
            </span>
          </div>
          <div className="mt-2 text-[11px] font-mono text-zinc-500">
            Hoja: BASE_DE_DATOS
          </div>
        </div>

        {/* OPs en PostgreSQL (Respaldo) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-mono">
            <span>POSTGRESQL (SUPABASE)</span>
            <Database className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-zinc-900 dark:text-white">
              {postgresTotal}
            </span>
            <span className="text-xs font-mono text-zinc-500">OPs respaldadas</span>
          </div>
          <div className="mt-2 text-[11px] font-mono">
            {isDiff ? (
              <span className="text-amber-500 font-bold">⚠️ Pendiente sincronizar ({pendingCount})</span>
            ) : (
              <span className="text-emerald-500 font-bold">✅ 100% Sincronizado</span>
            )}
          </div>
        </div>

        {/* Integridad & Seguridad */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-mono">
            <span>INTEGRIDAD & SEGURIDAD</span>
            <ShieldCheck className="w-4 h-4 text-teal-500" />
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-lg font-black text-zinc-900 dark:text-white">
              RLS ACTIVO
            </span>
          </div>
          <div className="mt-2 text-[11px] font-mono text-zinc-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Respaldos automáticos Supabase</span>
          </div>
        </div>
      </div>

      {/* 4. DETALLES TÉCNICOS & ARQUITECTURA */}
      <div className="p-6 rounded-3xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 space-y-4">
        <h3 className="text-sm font-black font-mono uppercase tracking-wider text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-500" />
          <span>Detalles de Conexión del Entorno</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col gap-1">
            <span className="text-zinc-400">Endpoint Supabase:</span>
            <span className="text-zinc-800 dark:text-zinc-200 truncate font-semibold">{SUPABASE_URL || 'No configurado'}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col gap-1">
            <span className="text-zinc-400">Tablas Creadas:</span>
            <span className="text-zinc-800 dark:text-zinc-200 font-semibold">
              stf_colchas_ops, stf_colchas_fotos, stf_colchas_auditoria, stf_colchas_sync_logs
            </span>
          </div>
        </div>

        <div className="text-[11px] text-zinc-500 leading-relaxed font-sans">
          <strong>Protocolo de Seguridad:</strong> Este módulo funciona en modo sombra (*Shadow Mode*). La sincronización es no bloqueante y las credenciales solo cuentan con permisos RLS de inserción/lectura.
        </div>
      </div>
    </div>
  );
};
