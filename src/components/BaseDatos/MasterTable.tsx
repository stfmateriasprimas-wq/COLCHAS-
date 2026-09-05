import React, { useState } from 'react';
import { 
  Search, RefreshCw, ExternalLink, Filter, 
  Trash2, Wrench, Code2, CheckCircle2, XCircle, Clock, Eye, Printer, AlertTriangle, ArrowRight
} from 'lucide-react';
import { SolicitudColcha } from '../../types';
import { SubNavTabs } from '../Navigation/SubNavTabs';
import { FloatingScrollPill } from '../Common/FloatingScrollPill';
import { TabType } from '../Navigation';
import { getOpChronologicalTimestamp } from '../../services/slaCalculator';
import { UsuarioSTF, isAdminUser } from '../../services/authService';
import { DeletedOpsHistorySection } from './DeletedOpsHistorySection';

interface MasterTableProps {
  solicitudes: SolicitudColcha[];
  currentUser?: UsuarioSTF | null;
  onSync: () => void;
  isSyncing: boolean;
  onNavigateTab?: (tab: TabType) => void;
  onViewDetail?: (solicitud: SolicitudColcha) => void;
  onPrint?: (solicitud: SolicitudColcha) => void;
  onTransfer?: (solicitud: SolicitudColcha) => void;
  onFinalizarOp?: (solicitud: SolicitudColcha) => void;
  onDeleteOp?: (solicitud: SolicitudColcha) => void;
  onOpRestored?: (solicitud: SolicitudColcha) => void;
}

export const MasterTable: React.FC<MasterTableProps> = ({
  solicitudes,
  currentUser,
  onSync,
  isSyncing,
  onNavigateTab = () => {},
  onViewDetail,
  onPrint,
  onTransfer,
  onFinalizarOp,
  onDeleteOp,
  onOpRestored
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterArea, setFilterArea] = useState<string>('TODAS');
  const [filterEstado, setFilterEstado] = useState<string>('TODOS');

  const GOOGLE_SHEETS_URL = "https://docs.google.com/spreadsheets/d/1jTM8OG2u3bO9Cyrlyn3DJSnGcyLOzA8EWwxwOyWgXdc/edit?usp=sharing";

  // Dynamic counts
  const totalHistorico = solicitudes.length;
  const enProceso = solicitudes.filter(s => s.estado !== 'FINALIZADO').length;
  const preSolCount = solicitudes.filter(s => s.estado === 'PRE_SOLICITUD').length;
  const solCount = solicitudes.filter(s => s.estado === 'SOLICITADO').length;
  const lavCount = solicitudes.filter(s => s.estado === 'LAVANDERIA').length;
  const calCount = solicitudes.filter(s => s.estado === 'CALIDAD').length;
  const finCount = solicitudes.filter(s => s.estado === 'FINALIZADO').length;
  const aprobadosCount = solicitudes.filter(s => s.dictamen === 'APROBADO' || s.estado === 'FINALIZADO').length;
  const rechazadosCount = solicitudes.filter(s => s.dictamen === 'RECHAZADO').length;
  const alertCount = solicitudes.filter(s => s.tieneRetraso && s.estado !== 'FINALIZADO').length;

  // Area Workload counts
  const atelierTotal = solicitudes.filter(s => s.areaActual?.includes('ATELIER') || s.areaActual?.includes('2F')).length;
  const atelierActivas = solicitudes.filter(s => (s.areaActual?.includes('ATELIER') || s.areaActual?.includes('2F')) && s.estado !== 'FINALIZADO').length;

  const stfTotal = solicitudes.filter(s => !s.areaActual?.includes('ATELIER') && !s.areaActual?.includes('2F')).length;
  const stfActivas = solicitudes.filter(s => !s.areaActual?.includes('ATELIER') && !s.areaActual?.includes('2F') && s.estado !== 'FINALIZADO').length;

  const lavTotal = solicitudes.filter(s => s.estado === 'LAVANDERIA' || s.areaActual?.includes('LAVANDERIA')).length;
  const lavActivas = solicitudes.filter(s => s.estado === 'LAVANDERIA').length;

  const auditoriaTotal = solicitudes.filter(s => s.estado === 'CALIDAD' || s.areaActual?.includes('CALIDAD')).length;
  const auditoriaActivas = solicitudes.filter(s => s.estado === 'CALIDAD').length;

  const filteredData = solicitudes.filter(item => {
    // Area Filter
    if (filterArea === 'ATELIER' && !item.areaActual?.includes('ATELIER') && !item.areaActual?.includes('2F')) return false;
    if (filterArea === 'STF' && (item.areaActual?.includes('ATELIER') || item.areaActual?.includes('2F'))) return false;
    if (filterArea === 'LAVANDERIA' && item.estado !== 'LAVANDERIA') return false;
    if (filterArea === 'AUDITORIA' && item.estado !== 'CALIDAD') return false;

    // Estado Filter
    if (filterEstado === 'EN_PROCESO' && item.estado === 'FINALIZADO') return false;
    if (filterEstado === 'PRE_SOLICITUD' && item.estado !== 'PRE_SOLICITUD') return false;
    if (filterEstado === 'SOLICITADO' && item.estado !== 'SOLICITADO') return false;
    if (filterEstado === 'LAVANDERIA' && item.estado !== 'LAVANDERIA') return false;
    if (filterEstado === 'CALIDAD' && item.estado !== 'CALIDAD') return false;
    if (filterEstado === 'FINALIZADOS' && item.estado !== 'FINALIZADO') return false;
    if (filterEstado === 'APROBADOS' && item.dictamen !== 'APROBADO' && item.estado !== 'FINALIZADO') return false;
    if (filterEstado === 'RECHAZADOS' && item.dictamen !== 'RECHAZADO') return false;

    // Search query
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    const metrosStr = `${item.rollos * 85} mt`;
    const rollosStr = `${item.rollos} rollos`;
    return (
      item.op.toLowerCase().includes(q) ||
      item.op.replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
      item.referencia.toLowerCase().includes(q) ||
      item.tela.toLowerCase().includes(q) ||
      item.codigoMt.toLowerCase().includes(q) ||
      item.color.toLowerCase().includes(q) ||
      item.inspector.toLowerCase().includes(q) ||
      (item.fechaCreacion && item.fechaCreacion.toLowerCase().includes(q)) ||
      metrosStr.includes(q) ||
      rollosStr.includes(q) ||
      (item.lote && item.lote.toLowerCase().includes(q))
    );
  }).sort((a, b) => {
    return getOpChronologicalTimestamp(b) - getOpChronologicalTimestamp(a);
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200 select-none pb-12 relative font-sans">
      
      {/* 1. SUB-NAVIGATION BAR (SOLICITUDES, BASE DE DATOS, ALERTAS, LÍNEA DE TIEMPO, ESTADÍSTICAS) */}
      <SubNavTabs
        activeTab="base-datos"
        onSelectTab={onNavigateTab}
        totalHistorico={totalHistorico}
        alertCount={alertCount}
      />

      {/* 2. CARD 1: BASE DE DATOS MAESTRA DE TRAZABILIDAD & MASTER KPIS */}
      <div className="bg-[#0c1017] dark:bg-white border border-zinc-800 dark:border-zinc-200 rounded-3xl p-6 shadow-2xl space-y-5 text-white dark:text-zinc-950 transition-colors duration-200">
        
        {/* Header & Action Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-emerald-950/80 dark:bg-emerald-100 text-emerald-300 dark:text-emerald-800 border border-emerald-500/40 dark:border-emerald-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                ● HOJA 01_BASE_DE_DATOS • EN TIEMPO REAL
              </span>
              <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
                Google Sheets Oficial (ID: 1jTM8OG2u3b...)
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white dark:text-zinc-950 brand-title">
              BASE DE DATOS MAESTRA DE TRAZABILIDAD
            </h2>
            <p className="text-xs text-zinc-400 dark:text-zinc-600 max-w-3xl">
              Lectura y sincronización en tiempo real de todas las órdenes de producción (OP), estados por sector, parámetros de tela, evidencias y dictámenes de calidad.
            </p>
          </div>

          {/* Action Button (Abrir BASE_DE_DATOS) */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <a
              href={GOOGLE_SHEETS_URL}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-2xl bg-cyan-950/80 dark:bg-cyan-50 border border-cyan-500/50 dark:border-cyan-300 text-cyan-300 dark:text-cyan-800 hover:bg-cyan-900/60 dark:hover:bg-cyan-100 text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-xs hover:scale-105 active:scale-95 duration-150"
              title="Abrir base de datos oficial en Google Sheets"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Abrir BASE_DE_DATOS</span>
            </a>
          </div>

        </div>

        {/* ROW OF 7 KPI COUNTS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 pt-1">
          <div className="bg-zinc-900/90 dark:bg-zinc-100 p-3.5 rounded-2xl border border-zinc-800 dark:border-zinc-200 space-y-0.5">
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold block uppercase">TOTAL BD</span>
            <span className="text-2xl font-black text-white dark:text-zinc-950 font-mono">{totalHistorico}</span>
          </div>

          <div className="bg-zinc-900/90 dark:bg-zinc-100 p-3.5 rounded-2xl border border-zinc-800 dark:border-zinc-200 space-y-0.5">
            <span className="text-[10px] text-amber-400 dark:text-amber-600 font-bold block uppercase">EN PROCESO</span>
            <span className="text-2xl font-black text-amber-400 dark:text-amber-600 font-mono">{enProceso}</span>
          </div>

          <div className="bg-zinc-900/90 dark:bg-zinc-100 p-3.5 rounded-2xl border border-zinc-800 dark:border-zinc-200 space-y-0.5">
            <span className="text-[10px] text-purple-400 dark:text-purple-600 font-bold block uppercase">PRE-SOLICITUD</span>
            <span className="text-2xl font-black text-purple-400 dark:text-purple-600 font-mono">{preSolCount}</span>
          </div>

          <div className="bg-zinc-900/90 dark:bg-zinc-100 p-3.5 rounded-2xl border border-zinc-800 dark:border-zinc-200 space-y-0.5">
            <span className="text-[10px] text-sky-400 dark:text-sky-600 font-bold block uppercase">SOLICITADOS</span>
            <span className="text-2xl font-black text-sky-400 dark:text-sky-600 font-mono">{solCount}</span>
          </div>

          <div className="bg-zinc-900/90 dark:bg-zinc-100 p-3.5 rounded-2xl border border-zinc-800 dark:border-zinc-200 space-y-0.5">
            <span className="text-[10px] text-sky-400 dark:text-sky-600 font-bold block uppercase">LAVANDERÍA</span>
            <span className="text-2xl font-black text-sky-400 dark:text-sky-600 font-mono">{lavCount}</span>
          </div>

          <div className="bg-zinc-900/90 dark:bg-zinc-100 p-3.5 rounded-2xl border border-zinc-800 dark:border-zinc-200 space-y-0.5">
            <span className="text-[10px] text-emerald-400 dark:text-emerald-600 font-bold block uppercase">CALIDAD (STF)</span>
            <span className="text-2xl font-black text-emerald-400 dark:text-emerald-600 font-mono">{calCount}</span>
          </div>

          <div className="bg-zinc-900/90 dark:bg-zinc-100 p-3.5 rounded-2xl border border-zinc-800 dark:border-zinc-200 space-y-0.5">
            <span className="text-[10px] text-emerald-400 dark:text-emerald-600 font-bold block uppercase">FINALIZADOS</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-emerald-400 dark:text-emerald-600 font-mono">{finCount}</span>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">({aprobadosCount} / {rechazadosCount})</span>
            </div>
          </div>
        </div>

      </div>

      {/* 3. CARD 2: CARGA DE TRABAJO EN TIEMPO REAL POR ÁREA OPERATIVA (ESPACIO DE TRABAJO INDEPENDIENTE) */}
      <div className="bg-[#0c1017] dark:bg-white border border-zinc-800 dark:border-zinc-200 rounded-3xl p-6 shadow-2xl space-y-4 text-white dark:text-zinc-950 transition-colors duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-zinc-800 dark:border-zinc-200">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-white dark:text-zinc-950 font-mono">
              CARGA DE TRABAJO EN TIEMPO REAL POR ÁREA OPERATIVA
            </h3>
          </div>
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">
            Haz clic en cualquier área para filtrar al instante
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            
            {/* Card 1: CALIDAD ZF / ATELIER */}
            <div 
              onClick={() => setFilterArea(prev => prev === 'ATELIER' ? 'TODAS' : 'ATELIER')}
              className={`p-4 rounded-2xl border cursor-pointer transition ${
                filterArea === 'ATELIER'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-purple-500 shadow-md ring-1 ring-purple-500'
                  : 'bg-zinc-900/70 dark:bg-zinc-50 border-zinc-800 dark:border-zinc-200 hover:border-zinc-600 dark:hover:border-zinc-400'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span>CALIDAD ZF / ATELIER</span>
                <span className="bg-purple-950/80 dark:bg-purple-100 text-purple-300 dark:text-purple-800 border border-purple-500/50 dark:border-purple-200 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                  {atelierTotal} TOTAL
                </span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-black font-mono">{atelierActivas}</span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold ml-1 uppercase">ACTIVAS / EN PROCESO</span>
              </div>
              <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
                {atelierTotal - atelierActivas} finalizadas
              </div>
            </div>

            {/* Card 2: CALIDAD PLANTA STF */}
            <div 
              onClick={() => setFilterArea(prev => prev === 'STF' ? 'TODAS' : 'STF')}
              className={`p-4 rounded-2xl border cursor-pointer transition ${
                filterArea === 'STF'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-emerald-500 shadow-md ring-1 ring-emerald-500'
                  : 'bg-zinc-900/70 dark:bg-zinc-50 border-zinc-800 dark:border-zinc-200 hover:border-zinc-600 dark:hover:border-zinc-400'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span>CALIDAD PLANTA STF</span>
                <span className="bg-emerald-950/80 dark:bg-emerald-100 text-emerald-300 dark:text-emerald-800 border border-emerald-500/50 dark:border-emerald-200 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                  {stfTotal} TOTAL
                </span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-black font-mono">{stfActivas}</span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold ml-1 uppercase">ACTIVAS / EN PROCESO</span>
              </div>
              <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
                {stfTotal - stfActivas} finalizadas
              </div>
            </div>

            {/* Card 3: LAVANDERÍA */}
            <div 
              onClick={() => setFilterArea(prev => prev === 'LAVANDERIA' ? 'TODAS' : 'LAVANDERIA')}
              className={`p-4 rounded-2xl border cursor-pointer transition ${
                filterArea === 'LAVANDERIA'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-sky-500 shadow-md ring-1 ring-sky-500'
                  : 'bg-zinc-900/70 dark:bg-zinc-50 border-zinc-800 dark:border-zinc-200 hover:border-zinc-600 dark:hover:border-zinc-400'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span>LAVANDERÍA</span>
                <span className="bg-sky-950/80 dark:bg-sky-100 text-sky-300 dark:text-sky-800 border border-sky-500/50 dark:border-sky-200 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                  {lavTotal} TOTAL
                </span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-black font-mono">{lavActivas}</span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold ml-1 uppercase">ACTIVAS / EN PROCESO</span>
              </div>
              <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
                {lavTotal - lavActivas} finalizadas
              </div>
            </div>

            {/* Card 4: AUDITORÍA Y CALIDAD */}
            <div 
              onClick={() => setFilterArea(prev => prev === 'AUDITORIA' ? 'TODAS' : 'AUDITORIA')}
              className={`p-4 rounded-2xl border cursor-pointer transition ${
                filterArea === 'AUDITORIA'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-indigo-500 shadow-md ring-1 ring-indigo-500'
                  : 'bg-zinc-900/70 dark:bg-zinc-50 border-zinc-800 dark:border-zinc-200 hover:border-zinc-600 dark:hover:border-zinc-400'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span>AUDITORÍA Y CALIDAD</span>
                <span className="bg-indigo-950/80 dark:bg-indigo-100 text-indigo-300 dark:text-indigo-800 border border-indigo-500/50 dark:border-indigo-200 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                  {auditoriaTotal} TOTAL
                </span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-black font-mono">{auditoriaActivas}</span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold ml-1 uppercase">ACTIVAS / EN PROCESO</span>
              </div>
              <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
                {auditoriaTotal - auditoriaActivas} finalizadas
              </div>
            </div>

          </div>
        </div>

      {/* 4. CARD 3: REGISTROS Y TABLA MAESTRA */}
      <div className="bg-[#0c1017] dark:bg-white border border-zinc-800 dark:border-zinc-200 rounded-3xl p-6 shadow-2xl space-y-4 text-white dark:text-zinc-950 transition-colors duration-200">

        {/* FILTERS & SEARCH ROW */}
        <div className="space-y-3">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative w-full md:flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por OP, Referencia, Tela, Inspector, Código..."
                className="w-full bg-zinc-900/90 dark:bg-zinc-100 border border-zinc-800 dark:border-zinc-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white dark:text-zinc-950 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-amber-500 shadow-xs"
              />
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
            </div>

            {/* Selects: Área & Estado */}
            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
              <select
                value={filterArea}
                onChange={(e) => setFilterArea(e.target.value)}
                className="bg-zinc-900/90 dark:bg-zinc-100 border border-zinc-800 dark:border-zinc-200 rounded-xl px-3 py-2 text-xs text-white dark:text-zinc-950 focus:outline-none font-bold"
              >
                <option value="TODAS">Todas las Áreas</option>
                <option value="ATELIER">Calidad ZF / Atelier</option>
                <option value="STF">Calidad Planta STF</option>
                <option value="LAVANDERIA">Lavandería</option>
                <option value="AUDITORIA">Auditoría y Calidad</option>
              </select>

              <select
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                className="bg-zinc-900/90 dark:bg-zinc-100 border border-zinc-800 dark:border-zinc-200 rounded-xl px-3 py-2 text-xs text-white dark:text-zinc-950 focus:outline-none font-bold"
              >
                <option value="TODOS">Todos los Estados</option>
                <option value="PRE_SOLICITUD">Pre-Solicitud</option>
                <option value="SOLICITADO">Solicitado</option>
                <option value="LAVANDERIA">Lavandería</option>
                <option value="CALIDAD">En Calidad</option>
                <option value="FINALIZADOS">Finalizados</option>
                <option value="APROBADOS">Aprobados</option>
                <option value="RECHAZADOS">Rechazados</option>
              </select>
            </div>

          </div>
        </div>

        {/* 4. QUICK FILTER PILLS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs select-none">
          <button
            type="button"
            onClick={() => setFilterEstado('TODOS')}
            className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer shrink-0 ${
              filterEstado === 'TODOS'
                ? 'bg-zinc-200 text-zinc-950 dark:bg-zinc-950 dark:text-white'
                : 'bg-zinc-900 dark:bg-zinc-100 text-zinc-400 dark:text-zinc-600'
            }`}
          >
            TODAS LAS OP ({totalHistorico})
          </button>

          <button
            type="button"
            onClick={() => setFilterEstado('PRE_SOLICITUD')}
            className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer shrink-0 ${
              filterEstado === 'PRE_SOLICITUD'
                ? 'bg-cyan-400 text-black'
                : 'bg-zinc-900 dark:bg-zinc-100 text-cyan-400 dark:text-cyan-700'
            }`}
          >
            PRE-SOLICITUD ({preSolCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterEstado('SOLICITADO')}
            className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer shrink-0 ${
              filterEstado === 'SOLICITADO'
                ? 'bg-amber-500 text-black'
                : 'bg-zinc-900 dark:bg-zinc-100 text-amber-400 dark:text-amber-700'
            }`}
          >
            SOLICITADO ({solCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterEstado('LAVANDERIA')}
            className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer shrink-0 ${
              filterEstado === 'LAVANDERIA'
                ? 'bg-sky-500 text-black'
                : 'bg-zinc-900 dark:bg-zinc-100 text-sky-400 dark:text-sky-700'
            }`}
          >
            LAVANDERÍA ({lavCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterEstado('CALIDAD')}
            className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer shrink-0 ${
              filterEstado === 'CALIDAD'
                ? 'bg-purple-600 text-white'
                : 'bg-zinc-900 dark:bg-zinc-100 text-purple-400 dark:text-purple-700'
            }`}
          >
            EN CALIDAD ({calCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterEstado('FINALIZADOS')}
            className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer shrink-0 ${
              filterEstado === 'FINALIZADOS'
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-900 dark:bg-zinc-100 text-emerald-400 dark:text-emerald-700'
            }`}
          >
            FINALIZADOS ({finCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterEstado('APROBADOS')}
            className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer shrink-0 ${
              filterEstado === 'APROBADOS'
                ? 'bg-emerald-500 text-black'
                : 'bg-zinc-900 dark:bg-zinc-100 text-emerald-400 dark:text-emerald-700'
            }`}
          >
            APROBADOS ({aprobadosCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterEstado('RECHAZADOS')}
            className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer shrink-0 ${
              filterEstado === 'RECHAZADOS'
                ? 'bg-rose-600 text-white'
                : 'bg-zinc-900 dark:bg-zinc-100 text-rose-400 dark:text-rose-700'
            }`}
          >
            RECHAZADOS ({rechazadosCount})
          </button>
        </div>

        {/* 4. MASTER DATA TABLE CON SCROLL VERTICAL CONTENIDO Y HEADER FIJO */}
        <div className="overflow-x-auto overflow-y-auto max-h-[560px] rounded-2xl border border-zinc-800 dark:border-zinc-200 shadow-2xl bg-[#0c1017] dark:bg-white table-scroll relative">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-20 shadow-md bg-zinc-950 dark:bg-zinc-100">
              <tr className="bg-zinc-950 dark:bg-zinc-100 text-zinc-300 dark:text-zinc-600 font-mono text-[10px] uppercase border-b border-zinc-800 dark:border-zinc-200">
                <th className="py-3 px-3">#</th>
                <th className="py-3 px-3">OP</th>
                <th className="py-3 px-3">ÁREA</th>
                <th className="py-3 px-3">REFERENCIA</th>
                <th className="py-3 px-3">TELA</th>
                <th className="py-3 px-3">COLOR</th>
                <th className="py-3 px-3">MT / CÓDIGO</th>
                <th className="py-3 px-3 text-center">ROLLOS</th>
                <th className="py-3 px-3 text-center">LOTES</th>
                <th className="py-3 px-3">ESTADO</th>
                <th className="py-3 px-3">DICTAMEN</th>
                <th className="py-3 px-3">OBSERVACIONES</th>
                <th className="py-3 px-3 text-center">FOTO</th>
                <th className="py-3 px-3">RESPONSABLE</th>
                <th className="py-3 px-3 text-center">ACCIONES</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-800 dark:divide-zinc-200 bg-[#0c1017] dark:bg-white text-white dark:text-zinc-950">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-10 text-center text-zinc-400 dark:text-zinc-500 text-xs">
                    No se encontraron registros en la base de datos con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => (
                  <tr 
                    key={item.id}
                    className="hover:bg-zinc-900/60 dark:hover:bg-zinc-50 transition"
                  >
                    <td className="py-3 px-3 font-mono text-zinc-500 text-[11px]">{index + 1}</td>
                    
                    <td className="py-3 px-3 font-mono font-black text-indigo-400 dark:text-indigo-600">
                      {item.op}
                    </td>

                    <td className="py-3 px-3">
                      <span className="bg-emerald-950/80 dark:bg-emerald-50 text-emerald-300 dark:text-emerald-700 border border-emerald-500/40 dark:border-emerald-300 text-[9.5px] font-bold px-2 py-0.5 rounded">
                        {item.areaActual}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-mono font-bold text-white dark:text-zinc-950">
                      {item.referencia}
                    </td>

                    <td className="py-3 px-3 font-bold text-zinc-200 dark:text-zinc-800 truncate max-w-[150px]">
                      {item.tela}
                    </td>

                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 font-bold text-zinc-300 dark:text-zinc-700">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        {item.color}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-mono text-[11px] font-bold text-indigo-400 dark:text-indigo-600">
                      {item.codigoMt}
                    </td>

                    <td className="py-3 px-3 font-mono font-bold text-center text-white dark:text-zinc-950">
                      {item.rollos}
                    </td>

                    <td className="py-3 px-3 font-mono text-center text-zinc-400 dark:text-zinc-500">
                      {item.lote || '2'}
                    </td>

                    <td className="py-3 px-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-900 dark:bg-zinc-100 text-zinc-300 dark:text-zinc-700 border border-zinc-800 dark:border-zinc-300">
                        {item.estado}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                        item.dictamen === 'RECHAZADO'
                          ? 'bg-rose-950 text-rose-300 dark:bg-rose-50 dark:text-rose-700 border-rose-800 dark:border-rose-300'
                          : 'bg-emerald-950 text-emerald-300 dark:bg-emerald-50 dark:text-emerald-700 border-emerald-800 dark:border-emerald-300'
                      }`}>
                        {item.dictamen || (item.estado === 'FINALIZADO' ? 'APROBADO' : 'EN PROCESO')}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-zinc-400 dark:text-zinc-500 text-[11px] max-w-[160px] truncate">
                      {item.observacionesOperario || '—'}
                    </td>

                    <td className="py-2 px-3 text-center">
                      {item.fotoMuestraUrl ? (
                        <div 
                          onClick={() => onViewDetail(item)}
                          className="w-8 h-8 rounded-lg overflow-hidden border border-zinc-700 dark:border-zinc-300 mx-auto cursor-pointer hover:scale-110 transition shadow-xs bg-zinc-900 dark:bg-zinc-100"
                          title="Clic para ver fotografía de muestra ampliada"
                        >
                          <img src={item.fotoMuestraUrl} alt="Muestra" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <span className="text-zinc-500 text-xs">—</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-zinc-300 dark:text-zinc-700 text-[11px] font-medium">
                      {item.inspector}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {onTransfer && item.estado === 'SOLICITADO' && (
                          <button
                            type="button"
                            onClick={() => onTransfer(item)}
                            className="px-2.5 py-1 bg-sky-500 hover:bg-sky-400 text-black rounded-lg text-[10px] font-black font-mono flex items-center gap-1 transition cursor-pointer shadow-xs"
                            title="Pasar esta OP de Solicitado a Lavandería"
                          >
                            <span>A LAVANDERÍA</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                        {onTransfer && item.estado === 'PRE_SOLICITUD' && (
                          <button
                            type="button"
                            onClick={() => onTransfer(item)}
                            className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-black rounded-lg text-[10px] font-black font-mono flex items-center gap-1 transition cursor-pointer shadow-xs"
                            title="Transferir a Lavandería (Atelier ZF)"
                          >
                            <span>A LAVANDERÍA</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                        {onViewDetail && (
                          <button
                            type="button"
                            onClick={() => onViewDetail(item)}
                            className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-indigo-400 hover:text-white transition cursor-pointer"
                            title="Ver Ficha Técnica"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onPrint && (
                          <button
                            type="button"
                            onClick={() => onPrint(item)}
                            className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-emerald-400 hover:text-white transition cursor-pointer"
                            title="Imprimir Etiqueta"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isAdminUser(currentUser) && onFinalizarOp && item.estado !== 'FINALIZADO' && (
                          <button
                            type="button"
                            onClick={() => onFinalizarOp(item)}
                            className="px-2 py-1 bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 dark:text-emerald-700 border border-emerald-500/40 rounded-lg text-[10px] font-black font-mono flex items-center gap-1 transition cursor-pointer shadow-xs"
                            title="Dar por finalizada esta OP (Pasar a Finalizados en el sistema y base de datos)"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>FINALIZAR</span>
                          </button>
                        )}
                        {isAdminUser(currentUser) && onDeleteOp && (
                          <button
                            type="button"
                            onClick={() => onDeleteOp(item)}
                            className="p-1.5 hover:bg-rose-950/60 dark:hover:bg-rose-100 rounded-lg text-rose-400 hover:text-rose-300 transition cursor-pointer"
                            title="Eliminar OP del sistema (Edwin Administrador)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* TABLE FOOTER / SCROLL INDICATOR */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 px-1 text-xs font-mono text-zinc-400 dark:text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Mostrando <strong className="text-white dark:text-zinc-950">{filteredData.length}</strong> de <strong className="text-white dark:text-zinc-950">{totalHistorico}</strong> registros</span>
          </span>
          <span className="text-[11px] bg-zinc-900 dark:bg-zinc-100 px-3 py-1 rounded-xl border border-zinc-800 dark:border-zinc-300">
            ↕️ Desplaza verticalmente con la barra de desplazamiento lateral para explorar toda la lista
          </span>
        </div>

      </div>

      {/* 4. HISTORIAL DE OPS ELIMINADAS (EDWIN - ADMINISTRADOR / PAPELERA DE RECUPERACIÓN) */}
      <DeletedOpsHistorySection
        currentUser={currentUser}
        onOpRestored={onOpRestored}
        onViewDetail={onViewDetail}
      />

      {/* 5. FLOATING QUICK SCROLL PILL */}
      <FloatingScrollPill totalOpsCount={totalHistorico} />

    </div>
  );
};
