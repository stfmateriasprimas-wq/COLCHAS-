import React, { useState } from 'react';
import { 
  AlertTriangle, ChevronDown, ChevronUp, Mail, Send, Droplets, 
  Clock, Shield, User, Users, FileText, ArrowRight, ExternalLink, Sparkles,
  Layers, CheckCircle2, AlertOctagon, CheckSquare, Square
} from 'lucide-react';
import { SolicitudColcha, SectorType } from '../../types';
import { UsuarioSTF, USUARIOS_STF_MAESTROS } from '../../services/authService';
import { EmailAlertModal } from './EmailAlertModal';
import { AdminUserDirectoryModal } from './AdminUserDirectoryModal';

interface AdminSlaAlertBannerProps {
  solicitudes: SolicitudColcha[];
  currentUser?: UsuarioSTF | null;
  onViewDetail: (solicitud: SolicitudColcha) => void;
}

type AreaAlertFilter = 'CONSOLIDADO' | 'SOLICITADOS' | 'LAVANDERIA' | 'PRE_SOLICITUD' | 'CALIDAD';

export const AdminSlaAlertBanner: React.FC<AdminSlaAlertBannerProps> = ({
  solicitudes,
  currentUser,
  onViewDetail
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeAreaFilter, setActiveAreaFilter] = useState<AreaAlertFilter>('CONSOLIDADO');
  
  // Selected OP IDs for custom multi-selection (Flecha 3)
  const [selectedOpIds, setSelectedOpIds] = useState<string[]>([]);
  
  // User Directory Modal State (Flecha 1)
  const [isUserDirectoryOpen, setIsUserDirectoryOpen] = useState(false);

  // Email Modal State
  const [emailModalState, setEmailModalState] = useState<{
    isOpen: boolean;
    solicitudes: SolicitudColcha[];
    isBulk: boolean;
    areaName: string;
    targetUserIds?: string[];
  }>({
    isOpen: false,
    solicitudes: [],
    isBulk: false,
    areaName: '',
    targetUserIds: undefined
  });

  // Calculate real-time delayed OPs (> 3 days SLA and not finalized)
  const allDelayedOps = solicitudes
    .filter(s => s.tieneRetraso && s.estado !== 'FINALIZADO')
    .sort((a, b) => b.diasHabiles - a.diasHabiles); // Highest delay first

  const totalDelayedCount = allDelayedOps.length;

  // Counts by area
  const countPreSol = allDelayedOps.filter(s => s.estado === 'PRE_SOLICITUD').length;
  const countSolicitados = allDelayedOps.filter(s => s.estado === 'SOLICITADO').length;
  const countLavanderia = allDelayedOps.filter(s => s.estado === 'LAVANDERIA').length;
  const countCalidad = allDelayedOps.filter(s => s.estado === 'CALIDAD').length;

  // Filtered list based on selected area pill
  const filteredDelayedOps = allDelayedOps.filter(item => {
    if (activeAreaFilter === 'CONSOLIDADO') return true;
    if (activeAreaFilter === 'SOLICITADOS') return item.estado === 'SOLICITADO';
    if (activeAreaFilter === 'LAVANDERIA') return item.estado === 'LAVANDERIA';
    if (activeAreaFilter === 'PRE_SOLICITUD') return item.estado === 'PRE_SOLICITUD';
    if (activeAreaFilter === 'CALIDAD') return item.estado === 'CALIDAD';
    return true;
  });

  const getAreaDisplayTitle = () => {
    switch (activeAreaFilter) {
      case 'SOLICITADOS': return 'SOLICITADOS (TRÁNSITO / DESPACHO)';
      case 'LAVANDERIA': return 'LAVANDERÍA (COLFACTORY ZF)';
      case 'PRE_SOLICITUD': return 'PRE-SOLICITUD (CALIDAD ZF / ATELIER)';
      case 'CALIDAD': return 'CALIDAD (LABORATORIO STF)';
      default: return 'CONSOLIDADO PLANTA (PRE-SOLICITUD, SOLICITADOS, LAVANDERÍA)';
    }
  };

  // Badge style mapper for stage
  const getAreaBadge = (estado: SectorType) => {
    switch (estado) {
      case 'PRE_SOLICITUD':
        return { label: 'PRE-SOLICITUD', style: 'bg-[#152e3d] text-cyan-300 border-cyan-500/40' };
      case 'SOLICITADO':
        return { label: 'SOLICITADO', style: 'bg-[#3b2306] text-amber-300 border-amber-500/50' };
      case 'LAVANDERIA':
        return { label: 'RECIBIDO LAVADERO', style: 'bg-[#0c2a47] text-sky-300 border-sky-500/50' };
      case 'CALIDAD':
        return { label: 'AUDITORÍA CALIDAD', style: 'bg-[#2b1040] text-purple-300 border-purple-500/50' };
      default:
        return { label: estado, style: 'bg-zinc-800 text-zinc-300 border-zinc-700' };
    }
  };

  // Toggle selection of single OP
  const handleToggleOpSelect = (opId: string) => {
    setSelectedOpIds(prev => 
      prev.includes(opId) ? prev.filter(id => id !== opId) : [...prev, opId]
    );
  };

  // Toggle select all in current filtered view
  const handleToggleSelectAllOps = () => {
    if (selectedOpIds.length === filteredDelayedOps.length) {
      setSelectedOpIds([]);
    } else {
      setSelectedOpIds(filteredDelayedOps.map(o => o.id));
    }
  };

  // Dispatch single OP email (Flecha 3 - Botón Verde Enviar)
  const handleOpenSingleEmail = (item: SolicitudColcha) => {
    setEmailModalState({
      isOpen: true,
      solicitudes: [item],
      isBulk: false,
      areaName: item.areaActual,
      targetUserIds: undefined
    });
  };

  // Dispatch bulk / selected OPs email
  const handleOpenBulkEmail = (targetList?: SolicitudColcha[], targetUserIds?: string[]) => {
    const listToSend = targetList || (selectedOpIds.length > 0
      ? filteredDelayedOps.filter(o => selectedOpIds.includes(o.id))
      : filteredDelayedOps.length > 0 ? filteredDelayedOps : allDelayedOps);

    setEmailModalState({
      isOpen: true,
      solicitudes: listToSend,
      isBulk: listToSend.length > 1,
      areaName: getAreaDisplayTitle(),
      targetUserIds: targetUserIds
    });
  };

  // When admin selects specific users from User Directory Modal (Flecha 1)
  const handleDispatchFromUserDirectory = (targetUserIds: string[]) => {
    const listToSend = selectedOpIds.length > 0 
      ? filteredDelayedOps.filter(o => selectedOpIds.includes(o.id))
      : filteredDelayedOps;

    handleOpenBulkEmail(listToSend, targetUserIds);
  };

  const selectedOpsObjects = filteredDelayedOps.filter(o => selectedOpIds.includes(o.id));

  return (
    <div className="w-full mb-6 font-sans select-none animate-in fade-in duration-300">
      
      {/* 1. FUTURISTIC CRIMSON BANNER CONTAINER */}
      <div className="relative rounded-[28px] bg-gradient-to-b from-[#14060b] via-[#100509] to-[#0b0306] border-2 border-rose-600/70 shadow-[0_10px_40px_rgba(225,29,72,0.25)] overflow-hidden">
        
        {/* Glowing Left Neon Accent Line */}
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-rose-500 via-amber-500 to-rose-600 shadow-[0_0_15px_#f43f5e]" />

        {/* TOP BAR / HEADER (IMAGE 1 DESIGN) */}
        <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Left: Icon + Title + Delayed Badge + Subtitle */}
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-rose-950/90 border border-rose-500/60 flex items-center justify-center text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)] shrink-0 mt-0.5">
              <AlertTriangle className="w-6 h-6 text-rose-400 fill-rose-400/20" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-sm sm:text-base font-black tracking-wider text-white font-mono uppercase">
                  CENTRAL DE ALERTAS DE RETRASO (SLA &gt; 3 DÍAS)
                </h3>
                <span className="bg-rose-600 text-white text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full tracking-wide shadow-md uppercase animate-pulse">
                  {totalDelayedCount} OP(S) RETRASADA(S) EN PLANTA
                </span>
              </div>
              <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                Hay <strong className="text-amber-300 font-bold">{totalDelayedCount} órdenes</strong> que superan el límite de <strong className="text-white font-bold">3 días laborales</strong> sin haber avanzado de área en el proceso de planta.
              </p>
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-2.5 self-end lg:self-center flex-wrap">
            
            {/* Button 1: Send Global / Bulk Alert */}
            <button
              type="button"
              onClick={() => handleOpenBulkEmail()}
              className="px-4 sm:px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 hover:from-rose-500 hover:to-amber-500 active:scale-98 text-white font-black text-xs font-mono tracking-wide flex items-center gap-2 transition cursor-pointer shadow-[0_0_20px_rgba(225,29,72,0.4)]"
              title="Redactar y enviar correo masivo a supervisores"
            >
              <Mail className="w-4 h-4" />
              <span>Enviar Alerta ({totalDelayedCount} OPs)</span>
            </button>

            {/* FLECHA 1: BOTÓN CON FIGURA DE USUARIO -> DIRECTORIO DE USUARIOS REGISTRADOS */}
            <button
              type="button"
              onClick={() => setIsUserDirectoryOpen(true)}
              className="px-3 py-2.5 rounded-2xl bg-[#220c13] hover:bg-[#34131e] active:scale-95 border border-amber-500/50 text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition cursor-pointer shadow-inner shrink-0"
              title="Directorio de correos de usuarios de la base de datos: enviar a un usuario específico o grupo"
            >
              <User className="w-4 h-4" />
              <span className="text-[11px] font-mono font-bold hidden sm:inline">Usuarios ({USUARIOS_STF_MAESTROS.length})</span>
            </button>

            {/* Button 2: Expand / Collapse Toggle Button */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-4 py-2.5 rounded-2xl bg-[#1b0a10] hover:bg-[#280f19] border border-rose-500/40 text-white font-mono font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-md"
            >
              <span>{isExpanded ? 'Ocultar Detalle' : `Ver ${totalDelayedCount} OPs Retrasadas`}</span>
              {isExpanded ? <ChevronUp className="w-4 h-4 text-rose-400" /> : <ChevronDown className="w-4 h-4 text-rose-400" />}
            </button>

          </div>

        </div>

        {/* BOTTOM AREA FILTER PILLS ROW */}
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-1 border-t border-rose-950/60 flex items-center gap-2 overflow-x-auto custom-scroll text-xs font-mono">
          <span className="text-[11px] font-black text-zinc-400 uppercase tracking-wider font-mono mr-1">
            ÁREAS:
          </span>

          {/* Pill 1: Consolidado */}
          <button
            type="button"
            onClick={() => {
              setActiveAreaFilter('CONSOLIDADO');
              setSelectedOpIds([]);
              if (!isExpanded) setIsExpanded(true);
            }}
            className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
              activeAreaFilter === 'CONSOLIDADO'
                ? 'bg-rose-600 text-white font-black shadow-[0_0_12px_rgba(225,29,72,0.5)]'
                : 'bg-[#1b0a10] text-zinc-300 hover:text-white border border-rose-950/80 hover:bg-[#250d17]'
            }`}
          >
            <span>Consolidado</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono font-black ${
              activeAreaFilter === 'CONSOLIDADO' ? 'bg-black/30 text-white' : 'bg-rose-950 text-rose-300'
            }`}>
              {totalDelayedCount}
            </span>
          </button>

          {/* Pill 2: Solicitados */}
          <button
            type="button"
            onClick={() => {
              setActiveAreaFilter('SOLICITADOS');
              setSelectedOpIds([]);
              if (!isExpanded) setIsExpanded(true);
            }}
            className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
              activeAreaFilter === 'SOLICITADOS'
                ? 'bg-amber-600 text-black font-black shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                : 'bg-[#1b0a10] text-zinc-300 hover:text-white border border-rose-950/80 hover:bg-[#250d17]'
            }`}
          >
            <Send className="w-3 h-3 text-amber-400" />
            <span>Solicitados</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md font-mono font-black bg-amber-950 text-amber-300">
              {countSolicitados}
            </span>
          </button>

          {/* Pill 3: Lavandería */}
          <button
            type="button"
            onClick={() => {
              setActiveAreaFilter('LAVANDERIA');
              setSelectedOpIds([]);
              if (!isExpanded) setIsExpanded(true);
            }}
            className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
              activeAreaFilter === 'LAVANDERIA'
                ? 'bg-sky-600 text-white font-black shadow-[0_0_12px_rgba(14,165,233,0.5)]'
                : 'bg-[#1b0a10] text-zinc-300 hover:text-white border border-rose-950/80 hover:bg-[#250d17]'
            }`}
          >
            <Droplets className="w-3 h-3 text-sky-400" />
            <span>Lavandería</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md font-mono font-black bg-sky-950 text-sky-300">
              {countLavanderia}
            </span>
          </button>

          {/* Pill 4: Pre-Solicitud */}
          <button
            type="button"
            onClick={() => {
              setActiveAreaFilter('PRE_SOLICITUD');
              setSelectedOpIds([]);
              if (!isExpanded) setIsExpanded(true);
            }}
            className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
              activeAreaFilter === 'PRE_SOLICITUD'
                ? 'bg-purple-600 text-white font-black shadow-[0_0_12px_rgba(168,85,247,0.5)]'
                : 'bg-[#1b0a10] text-zinc-300 hover:text-white border border-rose-950/80 hover:bg-[#250d17]'
            }`}
          >
            <Clock className="w-3 h-3 text-purple-400" />
            <span>Pre-Solicitud</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md font-mono font-black bg-purple-950 text-purple-300">
              {countPreSol}
            </span>
          </button>

          {/* Pill 5: Calidad (if any) */}
          {countCalidad > 0 && (
            <button
              type="button"
              onClick={() => {
                setActiveAreaFilter('CALIDAD');
                setSelectedOpIds([]);
                if (!isExpanded) setIsExpanded(true);
              }}
              className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
                activeAreaFilter === 'CALIDAD'
                  ? 'bg-emerald-600 text-white font-black shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                  : 'bg-[#1b0a10] text-zinc-300 hover:text-white border border-rose-950/80 hover:bg-[#250d17]'
              }`}
            >
              <span>Calidad</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md font-mono font-black bg-emerald-950 text-emerald-300">
                {countCalidad}
              </span>
            </button>
          )}

        </div>

        {/* 2. EXPANDED TABLE VIEW (FLECHA 2: RANGO VISUAL CON BARRA DE DESPLAZAMIENTO & FLECHA 3: BOTÓN VERDE ENVIAR) */}
        {isExpanded && (
          <div className="border-t border-rose-950/80 bg-[#070204] p-4 sm:p-5 space-y-3.5 animate-in slide-in-from-top-2 duration-200">
            
            {/* Top Toolbar: Filter Info + Selected Actions + Notificar por Gmail button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-rose-950/60">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs font-mono font-bold text-zinc-300">
                  Mostrando <strong className="text-white">{filteredDelayedOps.length} OP(s)</strong> en:{' '}
                  <span className="text-amber-400 font-extrabold uppercase">{getAreaDisplayTitle()}</span>
                </span>

                {/* Multi-Selection Counter & Quick Action (Flecha 3) */}
                {selectedOpIds.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/50 text-[10.5px] font-mono font-black animate-in fade-in">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>{selectedOpIds.length} OPs Marcadas</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
                {selectedOpIds.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => handleOpenBulkEmail(selectedOpsObjects)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-mono font-bold flex items-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-600/30 animate-pulse"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar {selectedOpIds.length} OPs Seleccionadas</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOpenBulkEmail(filteredDelayedOps)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-700 to-rose-600 hover:from-rose-600 hover:to-rose-500 text-white text-xs font-mono font-bold flex items-center gap-2 transition cursor-pointer shadow-md"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Notificar estas {filteredDelayedOps.length} OPs por Gmail</span>
                  </button>
                )}
              </div>
            </div>

            {/* FLECHA 2: CONTENEDOR CON RANGO VISUAL MÁS CORTO Y BARRA DE DESPLAZAMIENTO VERTICAL */}
            {filteredDelayedOps.length === 0 ? (
              <div className="py-10 text-center text-zinc-500 font-mono text-xs">
                ✓ No hay órdenes con retraso mayor a 3 días en esta área seleccionada.
              </div>
            ) : (
              <div className="relative rounded-2xl border border-rose-950/60 shadow-inner bg-[#0c0407] overflow-hidden">
                
                {/* Scrollable Container with max-height ~380px and sticky table headers */}
                <div className="max-h-[360px] overflow-y-auto overflow-x-auto custom-scroll">
                  <table className="w-full text-left text-xs font-sans border-collapse">
                    
                    {/* STICKY TABLE HEADER */}
                    <thead className="sticky top-0 z-20 bg-[#14060c] text-zinc-400 uppercase font-mono text-[10px] tracking-wider border-b border-rose-950 shadow-md">
                      <tr>
                        {/* Checkbox column */}
                        <th className="py-3 px-3 text-center w-10">
                          <input
                            type="checkbox"
                            checked={selectedOpIds.length === filteredDelayedOps.length && filteredDelayedOps.length > 0}
                            onChange={handleToggleSelectAllOps}
                            className="w-3.5 h-3.5 rounded text-emerald-500 focus:ring-emerald-500 cursor-pointer accent-emerald-500"
                            title="Seleccionar todas las OPs"
                          />
                        </th>
                        <th className="py-3 px-3">OP</th>
                        <th className="py-3 px-3">REFERENCIA</th>
                        <th className="py-3 px-3">TELA / COLOR / MTS</th>
                        <th className="py-3 px-3">ÁREA ACTUAL</th>
                        <th className="py-3 px-3">FECHA SOLICITUD</th>
                        <th className="py-3 px-3">DÍAS HÁBILES</th>
                        <th className="py-3 px-3">RETRASO SLA</th>
                        <th className="py-3 px-3">RESPONSABLE</th>
                        <th className="py-3 px-3 text-center">ACCIÓN</th>
                      </tr>
                    </thead>

                    {/* TABLE BODY */}
                    <tbody className="divide-y divide-rose-950/40 text-zinc-200 font-mono">
                      {filteredDelayedOps.map((item) => {
                        const badge = getAreaBadge(item.estado);
                        const excesoSla = Math.max(0, item.diasHabiles - 3);
                        const totalHoras = item.horasEnProceso || item.diasHabiles * 12;
                        const isSelected = selectedOpIds.includes(item.id);

                        return (
                          <tr 
                            key={item.id}
                            className={`transition duration-150 group ${
                              isSelected ? 'bg-[#220c15]' : 'hover:bg-[#1a070e]'
                            }`}
                          >
                            {/* Checkbox */}
                            <td className="py-3 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleOpSelect(item.id)}
                                className="w-3.5 h-3.5 rounded text-emerald-500 focus:ring-emerald-500 cursor-pointer accent-emerald-500"
                              />
                            </td>

                            {/* 1. OP */}
                            <td className="py-3 px-3 font-black whitespace-nowrap">
                              <span className="px-2.5 py-1 rounded-xl bg-[#261603] text-amber-300 border border-amber-500/40 font-mono text-xs shadow-xs">
                                {item.op}
                              </span>
                            </td>

                            {/* 2. REFERENCIA */}
                            <td className="py-3 px-3 font-bold text-white whitespace-nowrap">
                              {item.referencia}
                            </td>

                            {/* 3. TELA / COLOR / MTS */}
                            <td className="py-3 px-3 font-medium text-xs max-w-xs truncate text-zinc-300 font-sans">
                              <span className="font-bold text-white">{item.tela}</span>
                              <span className="text-zinc-500 mx-1.5">•</span>
                              <span className="text-zinc-300 uppercase font-mono text-[11px]">{item.color}</span>
                              <span className="text-zinc-400 font-mono text-[10.5px] ml-1.5">({item.codigoMt})</span>
                            </td>

                            {/* 4. ÁREA ACTUAL */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border uppercase ${badge.style}`}>
                                {badge.label}
                              </span>
                            </td>

                            {/* 5. FECHA SOLICITUD */}
                            <td className="py-3 px-3 text-zinc-400 text-xs whitespace-nowrap">
                              {item.fechaCreacion}
                            </td>

                            {/* 6. DÍAS HÁBILES */}
                            <td className="py-3 px-3 font-bold text-white whitespace-nowrap">
                              {item.diasHabiles} Días <span className="text-zinc-500 text-[11px] font-normal">({totalHoras}h)</span>
                            </td>

                            {/* 7. RETRASO SLA */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white font-black text-[10.5px] shadow-xs">
                                +{excesoSla} Días
                              </span>
                            </td>

                            {/* 8. RESPONSABLE */}
                            <td className="py-3 px-3 text-zinc-300 font-bold uppercase text-[11px] whitespace-nowrap">
                              {item.inspector}
                            </td>

                            {/* 9. FLECHA 3: BOTÓN VERDE 'ENVIAR' POR OP + FICHA */}
                            <td className="py-3 px-3 whitespace-nowrap text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => onViewDetail(item)}
                                  className="px-2.5 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-bold transition cursor-pointer"
                                  title="Ver ficha técnica completa"
                                >
                                  Ficha
                                </button>

                                {/* BOTÓN VERDE EXCLUSIVO ADMINISTRADOR */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenSingleEmail(item)}
                                  className="px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-emerald-600/30"
                                  title="Enviar correo de alerta de esta OP a los usuarios seleccionados"
                                >
                                  <Send className="w-3 h-3 text-white" />
                                  <span>Enviar</span>
                                </button>
                              </div>
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>

                  </table>
                </div>

                {/* Bottom Scroll Indicator Helper */}
                <div className="p-2 bg-[#120509] border-t border-rose-950/60 flex items-center justify-between text-[10.5px] font-mono text-zinc-400">
                  <span>
                    Mostrando <strong>{filteredDelayedOps.length}</strong> OPs con desviación SLA
                  </span>
                  <span className="text-zinc-500">
                    ↕ Desplázate verticalmente para navegar por todas las OPs
                  </span>
                </div>

              </div>
            )}

          </div>
        )}

      </div>

      {/* MODAL 1: FLECHA 1 -> DIRECTORIO DE USUARIOS PARA ENVIAR A USUARIO(S) ESPECÍFICO(S) */}
      {isUserDirectoryOpen && (
        <AdminUserDirectoryModal
          isOpen={isUserDirectoryOpen}
          onClose={() => setIsUserDirectoryOpen(false)}
          delayedOps={filteredDelayedOps}
          onDispatchAlertToSelectedUsers={handleDispatchFromUserDirectory}
        />
      )}

      {/* MODAL 2: DESPACHO Y REDACCIÓN DE CORREO AUTOMATIZADO */}
      {emailModalState.isOpen && (
        <EmailAlertModal
          isOpen={emailModalState.isOpen}
          onClose={() => setEmailModalState(prev => ({ ...prev, isOpen: false }))}
          solicitudes={emailModalState.solicitudes}
          currentUser={currentUser}
          targetAreaName={emailModalState.areaName}
          isBulk={emailModalState.isBulk}
          initialSelectedUserIds={emailModalState.targetUserIds}
        />
      )}

    </div>
  );
};
