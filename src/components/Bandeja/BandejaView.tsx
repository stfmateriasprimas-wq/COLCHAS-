import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, ArrowUpDown, Clock, Zap, BarChart3, Send, Droplets, 
  Microscope, CheckCircle2, Sparkles, X, Tag, Calendar, Layers,
  ChevronDown, ArrowUp, ArrowDown, AlertTriangle
} from 'lucide-react';
import { SolicitudColcha, SectorType, DictamenType, KpiMetrics } from '../../types';
import { SolicitudCard } from './SolicitudCard';
import { SubNavTabs } from '../Navigation/SubNavTabs';
import { FloatingScrollPill } from '../Common/FloatingScrollPill';
import { TabType } from '../Navigation';
import { getOpChronologicalTimestamp } from '../../services/slaCalculator';
import { UsuarioSTF, isAdminUser, isLavanderiaUser } from '../../services/authService';
import { notificationService } from '../../services/notificationService';
import { AdminSlaAlertBanner } from '../Alertas/AdminSlaAlertBanner';

interface BandejaViewProps {
  solicitudes: SolicitudColcha[];
  metrics: KpiMetrics;
  currentUser?: UsuarioSTF | null;
  initialStageFilter?: StageFilterType;
  initialSearchQuery?: string;
  onTransfer: (solicitud: SolicitudColcha) => void;
  onDirectTransfer?: (solicitudId: string, nuevoEstado: SectorType, observacion: string, dictamen?: DictamenType, fotoCalidad?: string) => void;
  onViewDetail: (solicitud: SolicitudColcha) => void;
  onPrint: (solicitud: SolicitudColcha) => void;
  onDelete?: (solicitud: SolicitudColcha) => void;
  onFinalizar?: (solicitud: SolicitudColcha) => void;
  onNavigateTab: (tab: TabType) => void;
}

export type StageFilterType = 'ALL' | 'EN_PROCESO' | SectorType;
export type SortOrderType = 'recientes' | 'antiguos' | 'sla';

export const BandejaView: React.FC<BandejaViewProps> = ({
  solicitudes,
  metrics,
  currentUser,
  initialStageFilter,
  initialSearchQuery,
  onTransfer,
  onDirectTransfer,
  onViewDetail,
  onPrint,
  onDelete,
  onFinalizar,
  onNavigateTab
}) => {
  // Stage filter: default 'EN_PROCESO' or 'SOLICITADO'
  const [selectedStage, setSelectedStage] = useState<StageFilterType>(initialStageFilter || 'EN_PROCESO');
  const [search, setSearch] = useState(initialSearchQuery || '');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrderType>('recientes');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  useEffect(() => {
    if (initialStageFilter) {
      setSelectedStage(initialStageFilter);
    }
  }, [initialStageFilter]);

  useEffect(() => {
    if (initialSearchQuery !== undefined) {
      setSearch(initialSearchQuery);
    }
  }, [initialSearchQuery]);

  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
        setIsSortDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dynamic delay counts per stage from actual database
  const delaysPreSol = solicitudes.filter(s => s.estado === 'PRE_SOLICITUD' && s.tieneRetraso).length;
  const delaysSol = solicitudes.filter(s => s.estado === 'SOLICITADO' && s.tieneRetraso).length;
  const delaysLav = solicitudes.filter(s => s.estado === 'LAVANDERIA' && s.tieneRetraso).length;
  const delaysCal = solicitudes.filter(s => s.estado === 'CALIDAD' && s.tieneRetraso).length;
  const alertCount = solicitudes.filter(s => s.tieneRetraso && s.estado !== 'FINALIZADO').length;

  // Conteo de OPs listas para ser recibidas en Lavandería
  const countSolicitados = solicitudes.filter(s => s.estado === 'SOLICITADO').length;
  const countPreSol = solicitudes.filter(s => s.estado === 'PRE_SOLICITUD').length;
  const totalPendingToReceive = countSolicitados + countPreSol;

  // Estado local para "Llamar OP y cargarla en Lavandería"
  const [opToCall, setOpToCall] = useState('');
  const [callFeedback, setCallFeedback] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);

  const handleLlamarYRecibirOp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanQuery = opToCall.trim().toUpperCase();
    if (!cleanQuery) return;

    const queryDigits = cleanQuery.replace(/\D/g, '');
    const foundOp = solicitudes.find(s => {
      const sDigits = (s.op || '').replace(/\D/g, '');
      return (
        s.op.toUpperCase() === cleanQuery ||
        (queryDigits.length >= 2 && sDigits === queryDigits) ||
        s.op.toUpperCase().includes(cleanQuery)
      );
    });

    if (!foundOp) {
      setCallFeedback({
        type: 'error',
        message: `No se encontró la OP "${cleanQuery}" en el sistema.`
      });
      return;
    }

    if (foundOp.estado === 'LAVANDERIA') {
      setSelectedStage('LAVANDERIA');
      setSearch(foundOp.op);
      setCallFeedback({
        type: 'warning',
        message: `La OP ${foundOp.op} ya se encuentra cargada en LAVANDERÍA.`
      });
      return;
    }

    if (foundOp.estado === 'CALIDAD' || foundOp.estado === 'FINALIZADO') {
      setCallFeedback({
        type: 'warning',
        message: `La OP ${foundOp.op} ya avanzó a etapa ${foundOp.estado}.`
      });
      return;
    }

    // Está en SOLICITADO o PRE_SOLICITUD -> Cargarla inmediatamente en Lavandería!
    const obsRecepcion = `Colcha recibida en túnel de lavado por ${currentUser?.nombre || 'LAVANDERÍA'}`;
    if (onDirectTransfer) {
      onDirectTransfer(foundOp.id, 'LAVANDERIA', obsRecepcion);
    } else {
      onTransfer(foundOp);
    }

    notificationService.playAlertSound('TRANSFERENCIA');
    setSelectedStage('LAVANDERIA');
    setSearch(foundOp.op);
    setOpToCall('');
    setCallFeedback({
      type: 'success',
      message: `🎉 ¡OP ${foundOp.op} llamada y cargada con éxito en LAVANDERÍA!`
    });
  };

  /**
   * Helper de Búsqueda Inteligente Multicriterio (Bloque 1)
   * Detecta coincidencias por OP, REFERENCIA, NOMBRE DE TELA, COLOR, FECHA, MT/ROLLOS, INSPECTOR
   */
  const getSearchMatchInfo = (item: SolicitudColcha, q: string): { matched: boolean; field: string; highlight: string } => {
    if (!q) return { matched: true, field: '', highlight: '' };
    const query = q.toLowerCase().trim();
    const queryDigits = query.replace(/\D/g, '');

    // 1. OP Match
    if (item.op.toLowerCase().includes(query) || (queryDigits.length >= 2 && item.op.replace(/\D/g, '').includes(queryDigits))) {
      return { matched: true, field: 'OP', highlight: item.op };
    }
    // 2. Referencia Match
    if (item.referencia.toLowerCase().includes(query)) {
      return { matched: true, field: 'REFERENCIA', highlight: item.referencia };
    }
    // 3. Nombre de Tela Match
    if (item.tela.toLowerCase().includes(query)) {
      return { matched: true, field: 'TELA', highlight: item.tela };
    }
    // 4. Color Match
    if (item.color.toLowerCase().includes(query)) {
      return { matched: true, field: 'COLOR', highlight: item.color };
    }
    // 5. Fecha Match
    if (item.fechaCreacion.toLowerCase().includes(query)) {
      return { matched: true, field: 'FECHA', highlight: item.fechaCreacion };
    }
    // 6. MT / Rollos / Metros Match
    const metros = item.rollos * 85;
    const metrosStr = `${metros} mt`;
    const rollosStr = `${item.rollos} rollos`;
    if (
      item.codigoMt.toLowerCase().includes(query) ||
      metrosStr.includes(query) ||
      rollosStr.includes(query) ||
      (queryDigits && (metros.toString().includes(queryDigits) || item.rollos.toString() === queryDigits))
    ) {
      return { matched: true, field: 'METROS / ROLLOS', highlight: `${item.rollos} rollos (${metros} Mt)` };
    }
    // 7. Inspector / Área Match
    if (item.inspector.toLowerCase().includes(query) || item.areaActual.toLowerCase().includes(query)) {
      return { matched: true, field: 'INSPECTOR / ÁREA', highlight: item.inspector };
    }

    return { matched: false, field: '', highlight: '' };
  };

  // Smart suggestions for autocomplete dropdown
  const suggestions = search.trim().length > 0 
    ? solicitudes
        .map(item => ({ item, match: getSearchMatchInfo(item, search) }))
        .filter(res => res.match.matched)
        .slice(0, 8)
    : [];

  const isSearching = search.trim().length > 0;

  // Filter list based on selected stage and search query
  const filteredList = solicitudes
    .filter(item => {
      const matchSearch = getSearchMatchInfo(item, search).matched;
      if (!matchSearch) return false;

      // Si el usuario está buscando activamente un término (ej: número de OP, referencia, etc.),
      // no ocultar el resultado por filtro de etapa, a menos que el usuario esté específicamente en FINALIZADO
      if (isSearching) {
        if (selectedStage === 'FINALIZADO') {
          return item.estado === 'FINALIZADO';
        }
        return true;
      }

      if (selectedStage === 'EN_PROCESO') {
        return item.estado !== 'FINALIZADO';
      } else if (selectedStage !== 'ALL') {
        return item.estado === selectedStage;
      }

      return true;
    })
    .sort((a, b) => {
      // Bloque 2 & 3: Ordenamiento
      if (sortOrder === 'antiguos') {
        const diff = getOpChronologicalTimestamp(a) - getOpChronologicalTimestamp(b);
        if (diff !== 0) return diff;
        const numA = parseInt((a.op || '').replace(/\D/g, ''), 10) || 0;
        const numB = parseInt((b.op || '').replace(/\D/g, ''), 10) || 0;
        return numA - numB;
      }
      if (sortOrder === 'sla') {
        const diff = b.diasHabiles - a.diasHabiles;
        if (diff !== 0) return diff;
        return getOpChronologicalTimestamp(b) - getOpChronologicalTimestamp(a);
      }
      // Por defecto: Más Recientes Arriba
      const diff = getOpChronologicalTimestamp(b) - getOpChronologicalTimestamp(a);
      if (diff !== 0) return diff;
      const numB = parseInt((b.op || '').replace(/\D/g, ''), 10) || 0;
      const numA = parseInt((a.op || '').replace(/\D/g, ''), 10) || 0;
      return numB - numA;
    });

  // Handler when clicking a smart suggestion item
  const handleSelectSuggestion = (item: SolicitudColcha) => {
    setSearch(item.op);
    setIsSearchFocused(false);
    // Si la OP seleccionada no está visible en la etapa actual, cambiar a EN_PROCESO o ALL
    if (selectedStage !== 'ALL' && selectedStage !== 'EN_PROCESO' && item.estado !== selectedStage) {
      setSelectedStage(item.estado === 'FINALIZADO' ? 'ALL' : 'EN_PROCESO');
    }
  };

  // State badge styling helper
  const getSectorBadgeStyle = (estado: SectorType) => {
    switch (estado) {
      case 'PRE_SOLICITUD': return 'bg-cyan-950 text-cyan-400 border-cyan-500/40';
      case 'SOLICITADO': return 'bg-amber-950 text-amber-400 border-amber-500/40';
      case 'LAVANDERIA': return 'bg-sky-950 text-sky-400 border-sky-500/40';
      case 'CALIDAD': return 'bg-purple-950 text-purple-400 border-purple-500/40';
      case 'FINALIZADO': return 'bg-emerald-950 text-emerald-400 border-emerald-500/40';
      default: return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200 select-none pb-12 relative">
      
      {/* 0. CENTRAL DE ALERTAS DE RETRASO (SLA > 3 DÍAS) - EXCLUSIVO ADMINISTRADOR (EDIAZ) */}
      {isAdminUser(currentUser) && (
        <AdminSlaAlertBanner
          solicitudes={solicitudes}
          currentUser={currentUser}
          onViewDetail={onViewDetail}
        />
      )}

      {/* 1. SUB-NAVIGATION BAR (SOLICITUDES, BASE DE DATOS, ALERTAS, LÍNEA DE TIEMPO, ESTADÍSTICAS) */}
      <SubNavTabs
        activeTab="solicitudes"
        onSelectTab={onNavigateTab}
        totalHistorico={metrics.totalHistorico}
        alertCount={alertCount}
      />

      {/* 1.5. COCKPIT DE RECEPCIÓN: LLAMAR OP Y CARGARLA EN LAVANDERÍA (EXCLUSIVO LAVANDERÍA / ADMIN) */}
      {(isLavanderiaUser(currentUser) || isAdminUser(currentUser)) && (
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0b1b2b] via-[#091524] to-[#060e18] dark:from-sky-50 dark:via-blue-50/70 dark:to-white border-2 border-sky-500/40 dark:border-sky-300 rounded-3xl p-4 sm:p-5 shadow-2xl backdrop-blur-md animate-in fade-in duration-300">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-sky-500/20 dark:border-sky-200 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-sky-500/20 dark:bg-sky-100 flex items-center justify-center border border-sky-400/40 text-sky-400 dark:text-sky-600 shadow-sm">
                <Droplets className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-white dark:text-zinc-950 font-sans tracking-wide flex items-center gap-2">
                  LLAMAR OP Y CARGARLA EN LAVANDERÍA
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 dark:text-sky-700 border border-sky-500/30">
                    COLFACTORY ZF
                  </span>
                </h3>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-600 font-mono">
                  {totalPendingToReceive > 0 ? (
                    <span>
                      📌 Hay <strong className="text-amber-400 font-black">{countSolicitados}</strong> OPs en Solicitados (Planta) y <strong className="text-cyan-400 font-black">{countPreSol}</strong> en Pre-Solicitud (Atelier ZF) listas para ingresar a lavado.
                    </span>
                  ) : (
                    <span>No hay OPs pendientes por recibir en Lavandería en este momento.</span>
                  )}
                </p>
              </div>
            </div>

            {/* Quick Filter Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedStage('SOLICITADO')}
                className={`px-3 py-1.5 rounded-xl text-[10.5px] font-mono font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                  selectedStage === 'SOLICITADO'
                    ? 'bg-amber-500 text-black border-amber-400 shadow-md font-black'
                    : 'bg-amber-950/60 text-amber-300 border-amber-500/40 hover:bg-amber-900/60'
                }`}
              >
                <span>📦 Ver Solicitados ({countSolicitados})</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedStage('PRE_SOLICITUD')}
                className={`px-3 py-1.5 rounded-xl text-[10.5px] font-mono font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                  selectedStage === 'PRE_SOLICITUD'
                    ? 'bg-cyan-400 text-black border-cyan-300 shadow-md font-black'
                    : 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40 hover:bg-cyan-900/60'
                }`}
              >
                <span>✂️ Ver Pre-Solicitud ({countPreSol})</span>
              </button>
            </div>
          </div>

          {/* Form to Call and Load OP */}
          <form onSubmit={handleLlamarYRecibirOp} className="mt-3 flex flex-col sm:flex-row items-stretch gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={opToCall}
                onChange={(e) => {
                  setOpToCall(e.target.value);
                  if (callFeedback) setCallFeedback(null);
                }}
                placeholder="Escanear QR o ingresar OP a llamar (ej: OP-96270 o 96270)..."
                className="w-full bg-zinc-950 dark:bg-white border-2 border-sky-500/50 dark:border-sky-300 rounded-2xl px-4 py-2.5 text-xs text-white dark:text-zinc-950 placeholder-zinc-500 focus:outline-none focus:border-sky-400 font-mono shadow-inner transition"
              />
              {opToCall && (
                <button
                  type="button"
                  onClick={() => setOpToCall('')}
                  className="absolute right-3 top-2.5 text-zinc-500 hover:text-white p-1 rounded-full text-xs cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={!opToCall.trim()}
              className="bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider font-mono flex items-center justify-center gap-2 transition shadow-lg shadow-sky-600/25 active:scale-95 cursor-pointer border border-sky-400/40 shrink-0"
            >
              <Zap className="w-3.5 h-3.5 text-sky-200 animate-bounce" />
              <span>⚡ CARGAR EN LAVANDERÍA</span>
            </button>
          </form>

          {/* Feedback message */}
          {callFeedback && (
            <div className={`mt-2.5 p-2.5 rounded-xl text-xs font-mono font-bold flex items-center justify-between gap-2 animate-in fade-in ${
              callFeedback.type === 'success'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50'
                : callFeedback.type === 'warning'
                ? 'bg-amber-950/80 text-amber-300 border border-amber-500/50'
                : 'bg-rose-950/80 text-rose-300 border border-rose-500/50'
            }`}>
              <span>{callFeedback.message}</span>
              <button
                type="button"
                onClick={() => setCallFeedback(null)}
                className="text-zinc-400 hover:text-white p-0.5 rounded cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. SEARCH BAR & SORT SELECTOR (BLOQUES 1 Y 2) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 relative z-30" ref={searchContainerRef}>
        
        {/* BLOQUE 1: INPUT DE BÚSQUEDA INTELIGENTE */}
        <div className="relative flex-1">
          <div className="relative">
            <input
              type="text"
              value={search}
              onFocus={() => setIsSearchFocused(true)}
              onChange={(e) => {
                setSearch(e.target.value);
                setIsSearchFocused(true);
              }}
              placeholder="Buscar por OP, Referencia, Nombre de Tela, Color, Fecha o Mt..."
              className="w-full bg-[#0c1017] dark:bg-[#12161f] border border-zinc-800 dark:border-zinc-700 focus:border-amber-500/70 rounded-2xl pl-10 pr-10 py-3 text-xs text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-amber-500/40 shadow-xl transition font-sans"
            />
            <Search className="w-4 h-4 text-amber-500 absolute left-3.5 top-3.5" />
            
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setIsSearchFocused(false);
                }}
                className="absolute right-3.5 top-3 text-zinc-400 hover:text-white p-1 rounded-full text-xs cursor-pointer"
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* DROPDOWN DE SUGERENCIAS INTELIGENTES EN TIEMPO REAL */}
          {isSearchFocused && search.trim().length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#080d17] border border-amber-500/40 rounded-3xl p-3 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl ring-1 ring-amber-500/20 max-h-96 overflow-y-auto custom-scroll">
              <div className="flex items-center justify-between px-2 pb-2 border-b border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px] font-black uppercase tracking-wider font-mono text-white">
                    Sugerencias Inteligentes ({suggestions.length})
                  </span>
                </div>
                <span className="text-[9.5px] font-mono text-zinc-400">
                  Filtro por: OP, Ref, Tela, Color, Fecha, Mt
                </span>
              </div>

              {suggestions.length === 0 ? (
                <div className="p-6 text-center text-zinc-500 font-mono text-xs">
                  No se encontraron coincidencias para "{search}".
                </div>
              ) : (
                <div className="divide-y divide-zinc-800/60 mt-1">
                  {suggestions.map(({ item, match }) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectSuggestion(item)}
                      className="p-2.5 rounded-2xl hover:bg-zinc-900/90 transition cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-amber-400 text-xs tracking-wider group-hover:text-amber-300">
                            {item.op}
                          </span>
                          <span className="text-[10.5px] font-bold text-zinc-300 font-mono">
                            / REF - {item.referencia}
                          </span>
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full font-black border uppercase bg-amber-950/60 text-amber-300 border-amber-500/40">
                            {match.field}
                          </span>
                        </div>

                        <div className="text-[11px] text-zinc-300 truncate flex items-center gap-2">
                          <span className="font-medium text-white">{item.tela}</span>
                          <span className="text-zinc-500">•</span>
                          <span className="text-zinc-400 uppercase font-mono">{item.color}</span>
                          <span className="text-zinc-500">•</span>
                          <span className="text-emerald-400 font-mono font-bold">{item.rollos} rollos ({item.rollos * 85} Mt)</span>
                        </div>

                        <div className="flex items-center gap-2 text-[9.5px] text-zinc-500 font-mono">
                          <span>📅 {item.fechaCreacion}</span>
                          <span>•</span>
                          <span>{item.inspector}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-[9px] font-mono font-black px-2.5 py-0.5 rounded-full border uppercase ${getSectorBadgeStyle(item.estado)}`}>
                          {item.estado}
                        </span>
                        {item.tieneRetraso && item.estado !== 'FINALIZADO' && (
                          <span className="text-[9px] font-mono font-bold text-rose-400 flex items-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            +{item.diasHabiles}d retraso
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* BLOQUE 2: BOTÓN Y SELECTOR DE ORDENAMIENTO (MÁS RECIENTES / MÁS ANTIGUOS) */}
        <div className="relative shrink-0">
          <div className="flex items-center gap-1.5 bg-[#0c1017] dark:bg-[#12161f] border border-zinc-800 dark:border-zinc-700 rounded-2xl p-1 shadow-xl">
            <button
              type="button"
              onClick={() => setSortOrder('recientes')}
              className={`px-3 py-2 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 transition cursor-pointer ${
                sortOrder === 'recientes'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Mostrar las OPs creadas más recientemente en la parte superior"
            >
              <ArrowUp className="w-3.5 h-3.5" />
              <span>Más Recientes Arriba</span>
            </button>

            <button
              type="button"
              onClick={() => setSortOrder('antiguos')}
              className={`px-3 py-2 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 transition cursor-pointer ${
                sortOrder === 'antiguos'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Mostrar las OPs más antiguas sin finalizar en la parte superior para darles prioridad"
            >
              <ArrowDown className="w-3.5 h-3.5" />
              <span>Más Antiguos Arriba</span>
            </button>
          </div>
        </div>

      </div>

      {/* 3. ROW OF 7 STAGE FILTER CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        
        {/* 1. Total Histórico */}
        <div
          onClick={() => setSelectedStage('ALL')}
          className={`rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 cursor-pointer bg-[#0c1017] dark:bg-[#12161f] text-white ${
            selectedStage === 'ALL'
              ? 'border-2 border-zinc-300 shadow-[0_0_20px_rgba(255,255,255,0.25)] ring-1 ring-zinc-300/40'
              : 'border border-zinc-800 dark:border-zinc-700 hover:border-zinc-500 shadow-xl'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-black text-white block tracking-wider">TOTAL</span>
              <span className="text-[9px] text-zinc-400 font-bold uppercase block tracking-tight">HISTÓRICO</span>
            </div>
            <div className="w-7 h-7 rounded-full bg-indigo-950/80 border border-indigo-500/50 flex items-center justify-center text-indigo-400">
              <BarChart3 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono text-white">{metrics.totalHistorico}</span>
            <span className="text-[10px] font-bold text-zinc-400 uppercase">OP</span>
          </div>
        </div>

        {/* 2. Total en Proceso */}
        <div
          onClick={() => setSelectedStage('EN_PROCESO')}
          className={`rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 cursor-pointer bg-[#0c1017] dark:bg-[#12161f] text-white ${
            selectedStage === 'EN_PROCESO'
              ? 'border-2 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.35)] ring-1 ring-amber-500/40'
              : 'border border-zinc-800 dark:border-zinc-700 hover:border-amber-500/50 shadow-xl'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-black text-white block tracking-wider">TOTAL EN PROCESO</span>
              <span className="text-[9px] text-zinc-400 font-bold uppercase block tracking-tight">FLUJO ACTIVO</span>
            </div>
            <div className="w-7 h-7 rounded-full bg-amber-950/80 border border-amber-500/50 flex items-center justify-center text-amber-400">
              <Zap className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono text-white">{metrics.totalEnProceso}</span>
            <span className="text-[10px] font-bold text-zinc-400 uppercase">OP</span>
          </div>
        </div>

        {/* 3. Pre-Solicitud (Atelier ZF) */}
        <div
          onClick={() => setSelectedStage('PRE_SOLICITUD')}
          className={`rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 cursor-pointer bg-[#0c1017] dark:bg-[#12161f] text-white ${
            selectedStage === 'PRE_SOLICITUD'
              ? 'border-2 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.35)] ring-1 ring-cyan-400/50'
              : 'border border-zinc-800 dark:border-zinc-700 hover:border-cyan-400/50 shadow-xl'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-black text-white block tracking-wider">PRE-SOLICITUD</span>
              <span className="text-[9px] text-zinc-400 font-bold uppercase block tracking-tight">ATELIER ZF</span>
            </div>
            <div className="w-7 h-7 rounded-full bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black font-mono text-white">{metrics.preSolicitud}</span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase">OP</span>
            </div>
            {delaysPreSol > 0 && (
              <span className="text-[9.5px] bg-rose-950/90 text-rose-300 border border-rose-800 px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                <span>🚨 {delaysPreSol} &gt;3D</span>
              </span>
            )}
          </div>
        </div>

        {/* 4. Solicitados (Por Despachar) */}
        <div
          onClick={() => setSelectedStage('SOLICITADO')}
          className={`rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 cursor-pointer bg-[#0c1017] dark:bg-[#12161f] text-white ${
            selectedStage === 'SOLICITADO'
              ? 'border-2 border-amber-500 shadow-[0_0_22px_rgba(245,158,11,0.4)] ring-1 ring-amber-500/50'
              : 'border border-zinc-800 dark:border-zinc-700 hover:border-amber-500/50 shadow-xl'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-black text-white block tracking-wider">SOLICITADOS</span>
              <span className="text-[9px] text-zinc-400 font-bold uppercase block tracking-tight">POR DESPACHAR</span>
            </div>
            <div className="w-7 h-7 rounded-full bg-amber-950/80 border border-amber-500/50 flex items-center justify-center text-amber-400">
              <Send className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black font-mono text-white">{metrics.solicitados}</span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase">OP</span>
            </div>
            {delaysSol > 0 && (
              <span className="text-[9.5px] bg-rose-950/90 text-rose-300 border border-rose-800 px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                <span>🚨 {delaysSol} &gt;3D</span>
              </span>
            )}
          </div>
        </div>

        {/* 5. Lavandería (En Lavado) */}
        <div
          onClick={() => setSelectedStage('LAVANDERIA')}
          className={`rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 cursor-pointer bg-[#0c1017] dark:bg-[#12161f] text-white ${
            selectedStage === 'LAVANDERIA'
              ? 'border-2 border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.35)] ring-1 ring-sky-400/50'
              : 'border border-zinc-800 dark:border-zinc-700 hover:border-sky-400/50 shadow-xl'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-black text-white block tracking-wider">LAVANDERÍA</span>
              <span className="text-[9px] text-zinc-400 font-bold uppercase block tracking-tight">EN LAVADO</span>
            </div>
            <div className="w-7 h-7 rounded-full bg-sky-950/80 border border-sky-500/50 flex items-center justify-center text-sky-400">
              <Droplets className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black font-mono text-white">{metrics.lavanderia}</span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase">OP</span>
            </div>
            {delaysLav > 0 && (
              <span className="text-[9.5px] bg-rose-950/90 text-rose-300 border border-rose-800 px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                <span>🚨 {delaysLav} &gt;3D</span>
              </span>
            )}
          </div>
        </div>

        {/* 6. Calidad (En Auditoría) */}
        <div
          onClick={() => setSelectedStage('CALIDAD')}
          className={`rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 cursor-pointer bg-[#0c1017] dark:bg-[#12161f] text-white ${
            selectedStage === 'CALIDAD'
              ? 'border-2 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.35)] ring-1 ring-purple-500/50'
              : 'border border-zinc-800 dark:border-zinc-700 hover:border-purple-500/50 shadow-xl'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-black text-white block tracking-wider">CALIDAD</span>
              <span className="text-[9px] text-zinc-400 font-bold uppercase block tracking-tight">EN AUDITORÍA</span>
            </div>
            <div className="w-7 h-7 rounded-full bg-purple-950/80 border border-purple-500/50 flex items-center justify-center text-purple-400">
              <Microscope className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black font-mono text-white">{metrics.calidad}</span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase">OP</span>
            </div>
            {delaysCal > 0 && (
              <span className="text-[9.5px] bg-rose-950/90 text-rose-300 border border-rose-800 px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                <span>🚨 {delaysCal} &gt;3D</span>
              </span>
            )}
          </div>
        </div>

        {/* 7. Finalizados (Liberadas) */}
        <div
          onClick={() => setSelectedStage('FINALIZADO')}
          className={`rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 cursor-pointer bg-[#0c1017] dark:bg-[#12161f] text-white ${
            selectedStage === 'FINALIZADO'
              ? 'border-2 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.35)] ring-1 ring-emerald-500/50'
              : 'border border-zinc-800 dark:border-zinc-700 hover:border-emerald-500/50 shadow-xl'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-black text-white block tracking-wider">FINALIZADOS</span>
              <span className="text-[9px] text-zinc-400 font-bold uppercase block tracking-tight">LIBERADAS</span>
            </div>
            <div className="w-7 h-7 rounded-full bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl font-black font-mono text-white">{metrics.finalizados}</span>
            <span className="text-[10px] font-bold text-zinc-400 uppercase">OP</span>
          </div>
        </div>

      </div>

      {/* 4. OP CARDS LIST */}
      <div className="space-y-4">
        {filteredList.length === 0 ? (
          <div className="bg-[#0c1017] dark:bg-black/80 border border-zinc-800 dark:border-zinc-800 rounded-3xl p-8 sm:p-12 text-center text-zinc-400 text-xs shadow-xl space-y-4">
            <p className="text-sm font-semibold text-zinc-300">
              No se encontraron órdenes de producción en la sección seleccionada ({selectedStage}).
            </p>
            <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
              {selectedStage !== 'EN_PROCESO' && (
                <button
                  type="button"
                  onClick={() => setSelectedStage('EN_PROCESO')}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-mono font-bold text-xs rounded-xl transition cursor-pointer shadow-md"
                >
                  ⚡ Ver Todas en Proceso ({metrics.totalEnProceso})
                </button>
              )}
              {selectedStage !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedStage('ALL')}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-mono font-bold text-xs rounded-xl transition cursor-pointer border border-zinc-700"
                >
                  📊 Ver Total Histórico ({metrics.totalHistorico})
                </button>
              )}
              {selectedStage !== 'SOLICITADO' && metrics.solicitados > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedStage('SOLICITADO')}
                  className="px-3.5 py-2 bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 font-mono font-bold text-xs rounded-xl transition cursor-pointer border border-amber-500/40"
                >
                  📦 Solicitados ({metrics.solicitados})
                </button>
              )}
              {selectedStage !== 'CALIDAD' && metrics.calidad > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedStage('CALIDAD')}
                  className="px-3.5 py-2 bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 font-mono font-bold text-xs rounded-xl transition cursor-pointer border border-purple-500/40"
                >
                  🔬 Calidad ({metrics.calidad})
                </button>
              )}
            </div>
          </div>
        ) : (
          filteredList.map(colcha => (
            <SolicitudCard
              key={colcha.id}
              solicitud={colcha}
              onTransfer={onTransfer}
              onDirectTransfer={onDirectTransfer}
              onViewDetail={onViewDetail}
              onPrint={onPrint}
              onDelete={onDelete}
              onFinalizar={onFinalizar}
              currentUser={currentUser}
            />
          ))
        )}
      </div>

      {/* 5. FLOATING QUICK SCROLL PILL */}
      <FloatingScrollPill totalOpsCount={metrics.totalHistorico} />

    </div>
  );
};
