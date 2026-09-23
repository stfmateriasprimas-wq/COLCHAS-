import React, { useState } from 'react';
import { 
  Search, RefreshCw, ExternalLink, Filter, 
  Trash2, Wrench, Code2, CheckCircle2, XCircle, Clock, Eye, Printer, AlertTriangle, ArrowRight, Camera
} from 'lucide-react';
import { SolicitudColcha } from '../../types';
import { SubNavTabs } from '../Navigation/SubNavTabs';
import { FloatingScrollPill } from '../Common/FloatingScrollPill';
import { TabType } from '../Navigation';
import { getOpChronologicalTimestamp } from '../../services/slaCalculator';
import { UsuarioSTF, isAdminUser, isLavanderiaUser, isEdiazUser, isFactoryUser } from '../../services/authService';
import { getOpPhotosFromCache } from '../../services/googleSheetsService';
import { DeletedOpsHistorySection } from './DeletedOpsHistorySection';
import { UploadMissingPhotosModal } from '../Bandeja/UploadMissingPhotosModal';

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
  const [uploadModalOp, setUploadModalOp] = useState<SolicitudColcha | null>(null);
  const [, setPhotoUpdateTick] = React.useState(0);

  React.useEffect(() => {
    const handleUpdate = () => setPhotoUpdateTick(t => t + 1);
    window.addEventListener('stf_op_photos_updated', handleUpdate);
    return () => window.removeEventListener('stf_op_photos_updated', handleUpdate);
  }, []);

  const GOOGLE_SHEETS_URL = "https://docs.google.com/spreadsheets/d/1jTM8OG2u3bO9Cyrlyn3DJSnGcyLOzA8EWwxwOyWgXdc/edit?usp=sharing";

  // Helper para verificar si la OP cuenta con fotografía registrada
  const hasPhoto = (item: SolicitudColcha) => {
    const cached = getOpPhotosFromCache(item.op);
    return Boolean(
      item.fotoMuestraUrl || 
      item.fotoCalidadUrl || 
      item.driveFolderUrl || 
      cached?.foto1 || 
      cached?.foto2 || 
      cached?.folderUrl
    );
  };

  // Dynamic counts
  const totalHistorico = solicitudes.length;
  const enProceso = solicitudes.filter(s => s.estado !== 'FINALIZADO').length;
  const preSolCount = solicitudes.filter(s => s.estado === 'PRE_SOLICITUD').length;
  const solCount = solicitudes.filter(s => s.estado === 'SOLICITADO').length;
  const lavCount = solicitudes.filter(s => s.estado === 'LAVANDERIA').length;
  const calCount = solicitudes.filter(s => s.estado === 'CALIDAD').length;
  const finCount = solicitudes.filter(s => s.estado === 'FINALIZADO').length;
  const aprobadosCount = solicitudes.filter(s => s.dictamen === 'APROBADO' || s.dictamen === 'APROBADO EN GAMA' || s.estado === 'FINALIZADO').length;
  const rechazadosCount = solicitudes.filter(s => s.dictamen === 'RECHAZADO').length;
  const sinFotosCount = solicitudes.filter(s => !hasPhoto(s)).length;
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
    if (filterEstado === 'APROBADOS' && item.dictamen !== 'APROBADO' && item.dictamen !== 'APROBADO EN GAMA' && item.estado !== 'FINALIZADO') return false;
    if (filterEstado === 'RECHAZADOS' && item.dictamen !== 'RECHAZADO') return false;
    if (filterEstado === 'SIN_FOTO' && hasPhoto(item)) return false;

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
        currentUser={currentUser}
      />

      {/* 2. CARD 1: BASE DE DATOS MAESTRA DE TRAZABILIDAD & MASTER KPIS */}
      <div className="bg-white dark:bg-[#0c1017] border border-zinc-200/90 dark:border-zinc-800 rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-2xl space-y-5 text-zinc-950 dark:text-white transition-colors duration-200">
        
        {/* Header & Action Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-500/40 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border">
                ● HOJA 01_BASE_DE_DATOS • EN TIEMPO REAL
              </span>
              <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                Google Sheets ID: 1jTM8OG2...Xdc
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-950 dark:text-white brand-title">
              Base de Datos Maestra de Trazabilidad Textil
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-3xl">
              Consolidado en vivo de todas las órdenes de producción (OPs) procesadas en las plantas STF Group y Atelier Zona Franca. Sincronización instantánea mediante CSV de lectura directa y Web App.
            </p>
          </div>

          {/* Sincronizar Button */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={onSync}
              disabled={isSyncing}
              className="px-4 py-2 rounded-2xl bg-cyan-50 border border-cyan-300 text-cyan-800 hover:bg-cyan-100 dark:bg-cyan-950/80 dark:border-cyan-500/50 dark:text-cyan-300 dark:hover:bg-cyan-900/60 text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-xs hover:scale-105 active:scale-95 duration-150"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-500 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sincronizando BD...' : 'Sincronizar BD'}</span>
            </button>
          </div>
        </div>

        {/* Dynamic KPI summary row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 pt-2">
          <div className="bg-zinc-50 dark:bg-zinc-900/90 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-0.5">
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold block uppercase">TOTAL BD</span>
            <span className="text-2xl font-black text-zinc-950 dark:text-white font-mono">{totalHistorico}</span>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-900/90 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-0.5">
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block uppercase">EN PROCESO</span>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">{enProceso}</span>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-900/90 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-0.5">
            <span className="text-[10px] text-cyan-700 dark:text-cyan-400 font-bold block uppercase">PRE-SOLICITUD</span>
            <span className="text-2xl font-black text-cyan-700 dark:text-cyan-400 font-mono">{preSolCount}</span>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-900/90 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-0.5">
            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold block uppercase">SOLICITADOS</span>
            <span className="text-2xl font-black text-amber-700 dark:text-amber-400 font-mono">{solCount}</span>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-900/90 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-0.5">
            <span className="text-[10px] text-sky-700 dark:text-sky-400 font-bold block uppercase">LAVANDERÍA</span>
            <span className="text-2xl font-black text-sky-700 dark:text-sky-400 font-mono">{lavCount}</span>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-900/90 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-0.5">
            <span className="text-[10px] text-purple-700 dark:text-purple-400 font-bold block uppercase">CALIDAD (STF)</span>
            <span className="text-2xl font-black text-purple-700 dark:text-purple-400 font-mono">{calCount}</span>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-900/90 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-0.5">
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold block uppercase">FINALIZADOS</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono">{finCount}</span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">({aprobadosCount}/{rechazadosCount})</span>
            </div>
          </div>

          <div 
            onClick={() => setFilterEstado(filterEstado === 'SIN_FOTO' ? 'TODOS' : 'SIN_FOTO')}
            className={`p-3.5 rounded-2xl border space-y-0.5 cursor-pointer transition hover:scale-105 active:scale-95 ${
              filterEstado === 'SIN_FOTO'
                ? 'bg-amber-500 text-black border-amber-600 shadow-md ring-2 ring-amber-500/40'
                : 'bg-zinc-50 dark:bg-zinc-900/90 border-zinc-200 dark:border-zinc-800 hover:border-amber-400 dark:hover:border-amber-600'
            }`}
            title="Clic para filtrar OPs que no tienen fotos"
          >
            <span className={`text-[10px] font-bold uppercase block ${filterEstado === 'SIN_FOTO' ? 'text-black' : 'text-amber-600 dark:text-amber-400'}`}>
              📷 SIN FOTOS
            </span>
            <span className={`text-2xl font-black font-mono ${filterEstado === 'SIN_FOTO' ? 'text-black' : 'text-amber-600 dark:text-amber-400'}`}>
              {sinFotosCount}
            </span>
          </div>
        </div>

      </div>

      {/* 3. CARD 2: CARGA Y DISTRIBUCIÓN OPERATIVA POR ÁREA */}
      <div className="bg-white dark:bg-[#0c1017] border border-zinc-200/90 dark:border-zinc-800 rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-2xl space-y-4 text-zinc-950 dark:text-white transition-colors duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-zinc-200/80 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-zinc-950 dark:text-white font-mono">
              Carga y Distribución Operativa por Área
            </h3>
          </div>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
            Selecciona un área para filtrar los registros de la tabla
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Atelier ZF */}
          <div 
            onClick={() => setFilterArea(filterArea === 'ATELIER' ? 'TODAS' : 'ATELIER')}
            className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
              filterArea === 'ATELIER'
                ? 'bg-purple-50 text-purple-950 dark:bg-zinc-900 dark:text-white border-purple-500 shadow-md ring-2 ring-purple-500/30'
                : 'bg-zinc-50 dark:bg-zinc-900/70 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase font-mono">CALIDAD ZF / ATELIER</span>
              <span className="bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-500/50 text-[10px] px-2 py-0.5 rounded font-mono font-bold border">
                {atelierTotal} total
              </span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black font-mono">{atelierActivas}</span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold ml-1 uppercase">ACTIVAS / EN PROCESO</span>
            </div>
            <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
              {atelierTotal - atelierActivas} finalizadas
            </div>
          </div>

          {/* Planta STF */}
          <div 
            onClick={() => setFilterArea(filterArea === 'STF' ? 'TODAS' : 'STF')}
            className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
              filterArea === 'STF'
                ? 'bg-emerald-50 text-emerald-950 dark:bg-zinc-900 dark:text-white border-emerald-500 shadow-md ring-2 ring-emerald-500/30'
                : 'bg-zinc-50 dark:bg-zinc-900/70 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase font-mono">CALIDAD PLANTA STF</span>
              <span className="bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-500/50 text-[10px] px-2 py-0.5 rounded font-mono font-bold border">
                {stfTotal} total
              </span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black font-mono">{stfActivas}</span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold ml-1 uppercase">ACTIVAS / EN PROCESO</span>
            </div>
            <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
              {stfTotal - stfActivas} finalizadas
            </div>
          </div>

          {/* Lavandería */}
          <div 
            onClick={() => setFilterArea(filterArea === 'LAVANDERIA' ? 'TODAS' : 'LAVANDERIA')}
            className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
              filterArea === 'LAVANDERIA'
                ? 'bg-sky-50 text-sky-950 dark:bg-zinc-900 dark:text-white border-sky-500 shadow-md ring-2 ring-sky-500/30'
                : 'bg-zinc-50 dark:bg-zinc-900/70 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase font-mono">LAVANDERÍA COLFACTORY</span>
              <span className="bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/80 dark:text-sky-300 dark:border-sky-500/50 text-[10px] px-2 py-0.5 rounded font-mono font-bold border">
                {lavTotal} total
              </span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black font-mono">{lavActivas}</span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold ml-1 uppercase">ACTIVAS / EN PROCESO</span>
            </div>
            <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
              {lavTotal - lavActivas} finalizadas
            </div>
          </div>

          {/* Auditoría / Calidad STF */}
          <div 
            onClick={() => setFilterArea(filterArea === 'AUDITORIA' ? 'TODAS' : 'AUDITORIA')}
            className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
              filterArea === 'AUDITORIA'
                ? 'bg-indigo-50 text-indigo-950 dark:bg-zinc-900 dark:text-white border-indigo-500 shadow-md ring-2 ring-indigo-500/30'
                : 'bg-zinc-50 dark:bg-zinc-900/70 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase font-mono">AUDITORÍA Y CALIDAD</span>
              <span className="bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-500/50 text-[10px] px-2 py-0.5 rounded font-mono font-bold border">
                {auditoriaTotal} total
              </span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black font-mono">{auditoriaActivas}</span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold ml-1 uppercase">ACTIVAS / EN PROCESO</span>
            </div>
            <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
              {auditoriaTotal - auditoriaActivas} finalizadas
            </div>
          </div>

        </div>
      </div>

      {/* 4. CARD 3: REGISTROS Y TABLA MAESTRA */}
      <div className="bg-white dark:bg-[#0c1017] border border-zinc-200/90 dark:border-zinc-800 rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-2xl space-y-4 text-zinc-950 dark:text-white transition-colors duration-200">

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
                className="w-full bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-zinc-950 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-amber-500 shadow-xs"
              />
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
            </div>

            {/* Selects: Área & Estado */}
            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
              <select
                value={filterArea}
                onChange={(e) => setFilterArea(e.target.value)}
                className="bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-950 dark:text-white focus:outline-none font-bold cursor-pointer"
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
                className="bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-950 dark:text-white focus:outline-none font-bold cursor-pointer"
              >
                <option value="TODOS">Todos los Estados</option>
                <option value="SIN_FOTO">📷 Sin Fotos ({sinFotosCount})</option>
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
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs select-none no-scrollbar">
          <button
            type="button"
            onClick={() => setFilterEstado('TODOS')}
            className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer shrink-0 ${
              filterEstado === 'TODOS'
                ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm'
                : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
            }`}
          >
            TODAS LAS OP ({totalHistorico})
          </button>

          <button
            type="button"
            onClick={() => setFilterEstado('SIN_FOTO')}
            className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
              filterEstado === 'SIN_FOTO'
                ? 'bg-amber-500 text-black shadow-sm ring-2 ring-amber-500/40'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-700/60 hover:bg-amber-100'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>SIN FOTOS ({sinFotosCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterEstado('PRE_SOLICITUD')}
            className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer shrink-0 ${
              filterEstado === 'PRE_SOLICITUD'
                ? 'bg-cyan-500 text-black shadow-sm'
                : 'bg-cyan-50 dark:bg-zinc-900 text-cyan-800 dark:text-cyan-400 border border-cyan-200 dark:border-transparent'
            }`}
          >
            PRE-SOLICITUD ({preSolCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterEstado('SOLICITADO')}
            className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer shrink-0 ${
              filterEstado === 'SOLICITADO'
                ? 'bg-amber-500 text-black shadow-sm'
                : 'bg-amber-50 dark:bg-zinc-900 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-transparent'
            }`}
          >
            SOLICITADO ({solCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterEstado('LAVANDERIA')}
            className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer shrink-0 ${
              filterEstado === 'LAVANDERIA'
                ? 'bg-sky-500 text-black shadow-sm'
                : 'bg-sky-50 dark:bg-zinc-900 text-sky-800 dark:text-sky-400 border border-sky-200 dark:border-transparent'
            }`}
          >
            LAVANDERÍA ({lavCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterEstado('CALIDAD')}
            className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer shrink-0 ${
              filterEstado === 'CALIDAD'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-purple-50 dark:bg-zinc-900 text-purple-800 dark:text-purple-400 border border-purple-200 dark:border-transparent'
            }`}
          >
            EN CALIDAD ({calCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterEstado('FINALIZADOS')}
            className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer shrink-0 ${
              filterEstado === 'FINALIZADOS'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 dark:bg-zinc-900 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-transparent'
            }`}
          >
            FINALIZADOS ({finCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterEstado('APROBADOS')}
            className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer shrink-0 ${
              filterEstado === 'APROBADOS'
                ? 'bg-emerald-500 text-black shadow-sm'
                : 'bg-emerald-50 dark:bg-zinc-900 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-transparent'
            }`}
          >
            APROBADOS ({aprobadosCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterEstado('RECHAZADOS')}
            className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer shrink-0 ${
              filterEstado === 'RECHAZADOS'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-rose-50 dark:bg-zinc-900 text-rose-800 dark:text-rose-400 border border-rose-200 dark:border-transparent'
            }`}
          >
            RECHAZADOS ({rechazadosCount})
          </button>
        </div>

        {/* Mobile horizontal scroll hint */}
        <div className="flex sm:hidden items-center justify-between px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
          <span className="flex items-center gap-1.5">
            <span className="text-amber-500 animate-pulse">↔</span> Desliza la tabla para ver las 17 columnas
          </span>
          <span className="font-bold px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[9px]">17 COL</span>
        </div>

        {/* 4. MASTER DATA TABLE CON SCROLL VERTICAL CONTENIDO Y HEADER FIJO */}
        <div className="overflow-x-auto overflow-y-auto max-h-[560px] rounded-2xl border border-zinc-200/90 dark:border-zinc-800 shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-2xl bg-white dark:bg-[#0c1017] table-scroll relative">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-20 shadow-xs bg-zinc-100 dark:bg-zinc-950">
              <tr className="bg-zinc-100 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 font-mono text-[10px] uppercase border-b border-zinc-200 dark:border-zinc-800">
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

            <tbody className="divide-y divide-zinc-200/90 dark:divide-zinc-800 bg-white dark:bg-[#0c1017] text-zinc-950 dark:text-white">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-10 text-center text-zinc-500 text-xs">
                    No se encontraron registros en la base de datos con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => (
                  <tr 
                    key={item.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition"
                  >
                    <td className="py-3 px-3 font-mono text-zinc-400 text-[11px]">{index + 1}</td>
                    
                    <td className="py-3 px-3 font-mono font-black text-indigo-600 dark:text-indigo-400">
                      {item.op}
                    </td>

                    <td className="py-3 px-3">
                      <span className="bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-500/40 text-[9.5px] font-bold px-2 py-0.5 rounded border">
                        {item.areaActual}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-mono font-bold text-zinc-950 dark:text-white">
                      {item.referencia}
                    </td>

                    <td className="py-3 px-3 font-bold text-zinc-800 dark:text-zinc-200 truncate max-w-[150px]">
                      {item.tela}
                    </td>

                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 font-bold text-zinc-700 dark:text-zinc-300">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        {item.color}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                      {item.codigoMt}
                    </td>

                    <td className="py-3 px-3 font-mono font-bold text-center text-zinc-950 dark:text-white">
                      {item.rollos}
                    </td>

                    <td className="py-3 px-3 font-mono text-center text-zinc-500">
                      {item.lote || '2'}
                    </td>

                    <td className="py-3 px-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-800">
                        {item.estado}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                        item.dictamen === 'RECHAZADO'
                          ? 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800'
                          : item.dictamen === 'APROBADO EN GAMA'
                          ? 'bg-teal-50 text-teal-800 border-teal-300 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                      }`}>
                        {item.dictamen || (item.estado === 'FINALIZADO' ? 'APROBADO' : 'EN PROCESO')}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-zinc-600 dark:text-zinc-400 text-[11px] max-w-[160px] truncate">
                      {item.observacionesOperario || '—'}
                    </td>

                    <td className="py-2 px-3 text-center">
                      {(() => {
                        const cached = getOpPhotosFromCache(item.op);
                        const fotoUrl = item.fotoMuestraUrl || cached?.foto1;
                        const folderUrl = item.driveFolderUrl || cached?.folderUrl;

                        if (fotoUrl) {
                          return (
                            <div className="flex items-center justify-center gap-1">
                              <div 
                                onClick={() => onViewDetail && onViewDetail(item)}
                                className="w-8 h-8 rounded-lg overflow-hidden border border-zinc-300 dark:border-zinc-700 cursor-pointer hover:scale-110 transition shadow-xs bg-zinc-100 dark:bg-zinc-900"
                                title="Clic para ver fotografía de muestra ampliada"
                              >
                                <img src={fotoUrl} alt="Muestra" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </div>
                              <button
                                type="button"
                                onClick={() => setUploadModalOp(item)}
                                className="p-1 rounded-lg text-zinc-400 hover:text-amber-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                                title="Gestionar evidencias fotográficas en Drive"
                              >
                                <Camera className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        }
                        if (folderUrl) {
                          return (
                            <div className="flex items-center justify-center gap-1">
                              <a
                                href={folderUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-8 h-8 rounded-lg flex items-center justify-center border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 cursor-pointer hover:scale-110 transition shadow-xs text-xs font-bold"
                                title="Abrir carpeta oficial de Drive con ambas fotos"
                              >
                                📁
                              </a>
                              <button
                                type="button"
                                onClick={() => setUploadModalOp(item)}
                                className="p-1 rounded-lg text-zinc-400 hover:text-amber-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                                title="Cargar / actualizar fotos en Drive"
                              >
                                <Camera className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        }
                        return (
                          <button
                            type="button"
                            onClick={() => setUploadModalOp(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[10px] font-black font-mono transition cursor-pointer hover:scale-105 active:scale-95 shadow-2xs"
                            title="Cargar evidencias fotográficas para esta OP (Drive)"
                          >
                            <Camera className="w-3 h-3 text-amber-500" />
                            <span>Cargar</span>
                          </button>
                        );
                      })()}
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
                        {isFactoryUser(currentUser) && onFinalizarOp && item.estado === 'EVALUADO' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onFinalizarOp(item);
                            }}
                            className="px-2 py-1 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-lg text-[10px] font-black font-mono flex items-center gap-1 transition cursor-pointer shadow-xs"
                            title="Dar por finalizada esta OP (Pasar a Finalizados en el sistema y base de datos)"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>FINALIZAR</span>
                          </button>
                        )}
                        {isEdiazUser(currentUser) && onDeleteOp && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteOp(item);
                            }}
                            className="p-1.5 hover:bg-rose-950/60 dark:hover:bg-rose-100 rounded-lg text-rose-400 hover:text-rose-300 transition cursor-pointer"
                            title="Eliminar esta OP automáticamente del sistema (Perfil Exclusivo ediaz)"
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

      {/* 6. MODAL DE CARGA DE EVIDENCIAS FOTOGRÁFICAS EN DRIVE */}
      <UploadMissingPhotosModal
        solicitud={uploadModalOp}
        isOpen={Boolean(uploadModalOp)}
        onClose={() => setUploadModalOp(null)}
        onSuccess={() => {
          setPhotoUpdateTick(t => t + 1);
        }}
      />

    </div>
  );
};
