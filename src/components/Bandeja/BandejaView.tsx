import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, ArrowUpDown, Clock, Zap, BarChart3, Send, Droplets, 
  Microscope, CheckCircle2, Sparkles, X, Tag, Calendar, Layers,
  ChevronDown, ArrowUp, ArrowDown, AlertTriangle
} from 'lucide-react';
import { SolicitudColcha, SectorType, KpiMetrics } from '../../types';
import { SolicitudCard } from './SolicitudCard';
import { SubNavTabs } from '../Navigation/SubNavTabs';
import { FloatingScrollPill } from '../Common/FloatingScrollPill';
import { TabType } from '../Navigation';
import { getOpChronologicalTimestamp } from '../../services/slaCalculator';
import { UsuarioSTF, isAdminUser } from '../../services/authService';
import { AdminSlaAlertBanner } from '../Alertas/AdminSlaAlertBanner';

interface BandejaViewProps {
  solicitudes: SolicitudColcha[];
  metrics: KpiMetrics;
  currentUser?: UsuarioSTF | null;
  initialStageFilter?: StageFilterType;
  initialSearchQuery?: string;
  onTransfer: (solicitud: SolicitudColcha) => void;
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

  // Filter list based on selected stage and search query
  const filteredList = solicitudes
    .filter(item => {
      let matchStage = true;
      if (selectedStage === 'EN_PROCESO') {
        matchStage = item.estado !== 'FINALIZADO';
      } else if (selectedStage !== 'ALL') {
        matchStage = item.estado === selectedStage;
      }

      const matchSearch = getSearchMatchInfo(item, search).matched;
      return matchStage && matchSearch;
    })
    .sort((a, b) => {
      // Bloque 2 & 3: Ordenamiento
      if (sortOrder === 'antiguos') {
        return getOpChronologicalTimestamp(a) - getOpChronologicalTimestamp(b);
      }
      if (sortOrder === 'sla') {
        return b.diasHabiles - a.diasHabiles;
      }
      // Por defecto: Más Recientes Arriba
      return getOpChronologicalTimestamp(b) - getOpChronologicalTimestamp(a);
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
          <div className="bg-white dark:bg-black/80 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-12 text-center text-zinc-500 text-xs shadow-xs">
            No se encontraron órdenes de producción en la sección seleccionada ({selectedStage}).
          </div>
        ) : (
          filteredList.map(colcha => (
            <SolicitudCard
              key={colcha.id}
              solicitud={colcha}
              onTransfer={onTransfer}
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
