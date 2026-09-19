import React, { useState, useMemo, useEffect } from 'react';
import { 
  AlertTriangle, RefreshCw, LogIn, Sun, Moon, Search, 
  ExternalLink, Layers, Eye, FolderOpen, Clock, ShieldAlert,
  ChevronRight, ArrowLeft, Sparkles, Filter
} from 'lucide-react';
import { SolicitudColcha, SectorType } from '../../types';
import { STFLogo } from '../Common/STFLogo';
import { formatColombianDisplayDate } from '../../services/slaCalculator';

interface PublicAlertsViewProps {
  solicitudes: SolicitudColcha[];
  isSyncing: boolean;
  onRefreshData: () => void;
  onSelectOp: (opNumber: string) => void;
  onGoToLogin: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

type AreaFilterKey = 'TODOS' | 'SOLICITADO' | 'LAVANDERIA' | 'PRE_SOLICITUD' | 'CALIDAD';

export const PublicAlertsView: React.FC<PublicAlertsViewProps> = ({
  solicitudes,
  isSyncing,
  onRefreshData,
  onSelectOp,
  onGoToLogin,
  isDarkMode,
  onToggleTheme
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeAreaFilter, setActiveAreaFilter] = useState<AreaFilterKey>('TODOS');

  // Auto-refresco en vivo cada 15 segundos
  useEffect(() => {
    onRefreshData();
    const interval = setInterval(() => {
      onRefreshData();
    }, 15000);
    return () => clearInterval(interval);
  }, [onRefreshData]);

  // Filtrar OPs en alerta con retraso SLA (> 3 días) y no finalizadas
  const opsEnAlerta = useMemo(() => {
    return solicitudes.filter(s => s.tieneRetraso && s.estado !== 'FINALIZADO');
  }, [solicitudes]);

  // Conteo por áreas
  const countsByArea = useMemo(() => {
    return {
      total: opsEnAlerta.length,
      solicitado: opsEnAlerta.filter(s => s.estado === 'SOLICITADO').length,
      lavanderia: opsEnAlerta.filter(s => s.estado === 'LAVANDERIA').length,
      preSolicitud: opsEnAlerta.filter(s => s.estado === 'PRE_SOLICITUD').length,
      calidad: opsEnAlerta.filter(s => s.estado === 'CALIDAD').length,
    };
  }, [opsEnAlerta]);

  // Filtrar por término de búsqueda y área seleccionada
  const filteredOps = useMemo(() => {
    let list = opsEnAlerta;

    if (activeAreaFilter !== 'TODOS') {
      list = list.filter(s => s.estado === activeAreaFilter);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(s => 
        s.op.toLowerCase().includes(q) ||
        (s.referencia && s.referencia.toLowerCase().includes(q)) ||
        (s.tela && s.tela.toLowerCase().includes(q)) ||
        (s.color && s.color.toLowerCase().includes(q)) ||
        (s.inspector && s.inspector.toLowerCase().includes(q)) ||
        (s.areaActual && s.areaActual.toLowerCase().includes(q))
      );
    }

    return list;
  }, [opsEnAlerta, activeAreaFilter, searchTerm]);

  return (
    <div className={`min-h-screen transition-colors duration-200 ${isDarkMode ? 'dark bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'} font-sans flex flex-col justify-between select-none`}>
      
      {/* 1. TOP HEADER BRANDING */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0c1017]/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-4 sm:px-6 pt-mobile-safe pb-3 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Logo Corporativo STF Group Centrado / Izquierda */}
          <div className="flex items-center gap-3">
            <STFLogo isWhite={isDarkMode} className="h-9 sm:h-11 w-44 sm:w-56" />
          </div>

          {/* Acciones Rápidas */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefreshData}
              disabled={isSyncing}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition cursor-pointer flex items-center gap-1.5 text-xs font-mono font-bold"
              title="Sincronizar base de datos en tiempo real"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-emerald-500 dark:text-emerald-400' : ''}`} />
              <span className="hidden sm:inline">{isSyncing ? 'Actualizando...' : 'Actualizar'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleTheme}
              className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
              title="Cambiar tema"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>

            <button
              type="button"
              onClick={onGoToLogin}
              className="px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-black hover:from-emerald-400 hover:to-green-500 text-xs font-mono font-black flex items-center gap-1.5 transition cursor-pointer shadow-md"
              title="Iniciar sesión en el sistema"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ingresar al Sistema</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. CONTENIDO PRINCIPAL */}
      <main className="max-w-7xl w-full mx-auto p-3.5 sm:p-6 space-y-5 flex-1">
        
        {/* BANNER PRINCIPAL DE ALERTA SLA */}
        <div className="bg-gradient-to-br from-rose-50 via-white to-white dark:from-rose-950/70 dark:via-[#0c1017] dark:to-[#0c1017] border-2 border-rose-200 dark:border-rose-500/50 rounded-3xl p-5 sm:p-7 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 dark:bg-rose-500/20 border-2 border-rose-400 dark:border-rose-500/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0 shadow-lg shadow-rose-500/10 dark:shadow-rose-500/20">
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black bg-rose-500 text-white uppercase tracking-wider">
                    ALERTA DE PLANTA
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                    SLA &gt; 3 DÍAS HÁBILES
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black font-mono tracking-wide text-zinc-950 dark:text-white mt-1 uppercase">
                  CENTRAL DE ALERTAS DE RETRASO
                </h1>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-2xl sm:text-3xl font-black font-mono text-rose-600 dark:text-rose-400">
                {countsByArea.total} OP(S)
              </div>
              <div className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400">
                Superan límite de tiempo en proceso
              </div>
            </div>
          </div>

          {/* GRID DE MÉTRICAS POR ÁREA */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setActiveAreaFilter('SOLICITADO')}
              className={`p-3 rounded-2xl border transition text-left cursor-pointer ${
                activeAreaFilter === 'SOLICITADO'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-800 dark:text-amber-300'
                  : 'bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-600'
              }`}
            >
              <div className="text-[10px] font-mono font-bold uppercase text-amber-700 dark:text-amber-400">🚚 Tránsito / Solicitados</div>
              <div className="text-xl font-black font-mono text-zinc-950 dark:text-white mt-0.5">{countsByArea.solicitado}</div>
            </button>

            <button
              type="button"
              onClick={() => setActiveAreaFilter('LAVANDERIA')}
              className={`p-3 rounded-2xl border transition text-left cursor-pointer ${
                activeAreaFilter === 'LAVANDERIA'
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-800 dark:text-cyan-300'
                  : 'bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-600'
              }`}
            >
              <div className="text-[10px] font-mono font-bold uppercase text-cyan-700 dark:text-cyan-400">💧 Lavandería ZF</div>
              <div className="text-xl font-black font-mono text-zinc-950 dark:text-white mt-0.5">{countsByArea.lavanderia}</div>
            </button>

            <button
              type="button"
              onClick={() => setActiveAreaFilter('PRE_SOLICITUD')}
              className={`p-3 rounded-2xl border transition text-left cursor-pointer ${
                activeAreaFilter === 'PRE_SOLICITUD'
                  ? 'bg-purple-500/20 border-purple-500 text-purple-800 dark:text-purple-300'
                  : 'bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-600'
              }`}
            >
              <div className="text-[10px] font-mono font-bold uppercase text-purple-700 dark:text-purple-400">✂️ Atelier / 2F</div>
              <div className="text-xl font-black font-mono text-zinc-950 dark:text-white mt-0.5">{countsByArea.preSolicitud}</div>
            </button>

            <button
              type="button"
              onClick={() => setActiveAreaFilter('CALIDAD')}
              className={`p-3 rounded-2xl border transition text-left cursor-pointer ${
                activeAreaFilter === 'CALIDAD'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-800 dark:text-emerald-300'
                  : 'bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-600'
              }`}
            >
              <div className="text-[10px] font-mono font-bold uppercase text-emerald-700 dark:text-emerald-400">🔬 Calidad Lab</div>
              <div className="text-xl font-black font-mono text-zinc-950 dark:text-white mt-0.5">{countsByArea.calidad}</div>
            </button>
          </div>
        </div>

        {/* BARRA DE BÚSQUEDA Y FILTROS RÁPIDOS */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#0c1017] p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por OP, Referencia, Tela, Color o Inspector..."
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm font-mono text-zinc-950 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-emerald-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setActiveAreaFilter('TODOS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition whitespace-nowrap cursor-pointer ${
                activeAreaFilter === 'TODOS'
                  ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white'
              }`}
            >
              Todas ({opsEnAlerta.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveAreaFilter('SOLICITADO')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition whitespace-nowrap cursor-pointer ${
                activeAreaFilter === 'SOLICITADO'
                  ? 'bg-amber-500 text-black'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white'
              }`}
            >
              Tránsito ({countsByArea.solicitado})
            </button>
            <button
              type="button"
              onClick={() => setActiveAreaFilter('LAVANDERIA')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition whitespace-nowrap cursor-pointer ${
                activeAreaFilter === 'LAVANDERIA'
                  ? 'bg-cyan-500 text-black'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white'
              }`}
            >
              Lavandería ({countsByArea.lavanderia})
            </button>
            <button
              type="button"
              onClick={() => setActiveAreaFilter('CALIDAD')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition whitespace-nowrap cursor-pointer ${
                activeAreaFilter === 'CALIDAD'
                  ? 'bg-emerald-500 text-black'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white'
              }`}
            >
              Calidad ({countsByArea.calidad})
            </button>
          </div>
        </div>

        {/* LISTADO / GRID DE ÓRDENES RETRASADAS */}
        {filteredOps.length === 0 ? (
          <div className="bg-white dark:bg-[#0c1017] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-10 text-center space-y-3 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto text-xl">
              ✓
            </div>
            <h3 className="text-base font-black font-mono text-zinc-950 dark:text-white uppercase">
              No hay órdenes con retraso bajo este filtro
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-sm mx-auto">
              Todas las solicitudes están avanzando dentro del margen de SLA permitido o no coinciden con el término de búsqueda.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredOps.map((op) => {
              const cleanOp = op.op.replace(/^OP-?/i, '');
              const diasRetraso = Math.max(0, op.diasHabiles - 3);

              return (
                <div
                  key={op.id}
                  className="bg-white dark:bg-[#0c1017] border border-zinc-200 dark:border-zinc-800 hover:border-rose-400 dark:hover:border-rose-500/60 rounded-2xl p-4 transition-all duration-200 shadow-md hover:shadow-xl hover:shadow-rose-500/10 flex flex-col justify-between space-y-3"
                >
                  {/* Encabezado de la Tarjeta */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-mono font-black bg-rose-500/15 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-500/40">
                        OP-{cleanOp}
                      </span>
                      
                      <div className="flex items-center gap-1.5 text-[10px] font-mono font-black px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                        <Clock className="w-3 h-3 text-rose-500 dark:text-rose-400" />
                        <span>{op.diasHabiles}d en planta (+{diasRetraso}d)</span>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-black font-mono text-zinc-950 dark:text-white truncate" title={op.referencia}>
                        REF: {op.referencia}
                      </h4>
                      <p className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-bold truncate">
                        {op.tela} • {op.color}
                      </p>
                    </div>

                    {/* Especificaciones Rápidas */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-zinc-50 dark:bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800/80 text-zinc-700 dark:text-zinc-300">
                      <div>
                        <span className="text-zinc-500 block text-[9px] uppercase">Área Actual:</span>
                        <strong className="text-amber-600 dark:text-amber-400 truncate block">{op.areaActual || op.estado}</strong>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-[9px] uppercase">Inspector:</span>
                        <span className="truncate block font-bold">{op.inspector || 'CALIDAD STF'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Acciones de la Tarjeta */}
                  <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectOp(cleanOp)}
                      className="flex-1 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-black font-mono font-black text-xs uppercase flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ver Ficha y Fotos</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>

                    {op.driveFolderUrl && (
                      <a
                        href={op.driveFolderUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition"
                        title="Ver carpeta de evidencias fotográficas en Google Drive"
                      >
                        <FolderOpen className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                      </a>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c1017] text-center text-xs font-mono text-zinc-500">
        STF GROUP S.A. — STUDIO F · ELA · STUDIO F MAN — Control de Calidad de Colchas & Trazabilidad Textil
      </footer>

    </div>
  );
};
