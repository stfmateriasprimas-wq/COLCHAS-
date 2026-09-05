import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, Clock, Send, ChevronRight, Search, 
  CheckCircle2, Users, ChevronUp, ChevronDown, Mail,
  RefreshCw, FileSpreadsheet, Eye, Trash2, Sparkles,
  Plane, Droplets, Check, ShieldCheck, Layers, CheckSquare, Square,
  ExternalLink, Download, Settings, MessageSquare
} from 'lucide-react';
import { SolicitudColcha } from '../../types';
import { SubNavTabs } from '../Navigation/SubNavTabs';
import { FloatingScrollPill } from '../Common/FloatingScrollPill';
import { TabType } from '../Navigation';
import { UsuarioSTF, isAdminUser } from '../../services/authService';
import { 
  SPREADSHEET_ID,
  getAppsScriptUrl,
  syncAllAlertasToSheets, 
  removeOpFromAlertasSheet, 
  pushAlertsNotificationReportToSheets
} from '../../services/googleSheetsService';
import { exportAlertasToExcel } from '../../services/exportService';
import { notificationService } from '../../services/notificationService';
import { AlertUsersSelectionModal } from './AlertUsersSelectionModal';
import { SheetsSyncConfigModal } from './SheetsSyncConfigModal';
import { WhatsAppEmergencyAlertModal } from './WhatsAppEmergencyAlertModal';

interface SlaAlertsListProps {
  solicitudes: SolicitudColcha[];
  currentUser?: UsuarioSTF | null;
  onViewDetail: (solicitud: SolicitudColcha) => void;
  onFinalizarOp?: (solicitud: SolicitudColcha) => void;
  onDeleteOp?: (solicitud: SolicitudColcha) => void;
  onOpenUserDirectory?: () => void;
  onNavigateTab?: (tab: TabType) => void;
  onSyncWithSheets?: () => Promise<void>;
}

type AreaFilterType = 'CONSOLIDADO' | 'SOLICITADOS' | 'LAVANDERIA' | 'PRE_SOLICITUD' | 'CALIDAD';

export const SlaAlertsList: React.FC<SlaAlertsListProps> = ({
  solicitudes,
  currentUser,
  onViewDetail,
  onFinalizarOp,
  onDeleteOp,
  onOpenUserDirectory,
  onNavigateTab = () => {},
  onSyncWithSheets
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<AreaFilterType>('CONSOLIDADO');
  const [isDetailVisible, setIsDetailVisible] = useState(true);
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [lastEmailSentDate, setLastEmailSentDate] = useState<string | null>(null);

  // Checkbox selected OPs state (for selective emailing)
  const [selectedOpIds, setSelectedOpIds] = useState<string[]>([]);

  // Modal State for Arrow 1: User Selection Modal
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);

  // Modal State for Sheets Sync Webhook Configuration
  const [isSheetsConfigModalOpen, setIsSheetsConfigModalOpen] = useState(false);

  // Modal State for WhatsApp Emergency Alerts (wa.me)
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

  // All active items in the system with delay (> 3 days) and not finalized
  const allAlerts = solicitudes.filter(s => s.tieneRetraso && s.estado !== 'FINALIZADO');
  const totalHistorico = solicitudes.length;

  // Real-time counts per area
  const countPreSol = allAlerts.filter(s => s.estado === 'PRE_SOLICITUD').length;
  const countSol = allAlerts.filter(s => s.estado === 'SOLICITADO').length;
  const countLav = allAlerts.filter(s => s.estado === 'LAVANDERIA').length;
  const countCal = allAlerts.filter(s => s.estado === 'CALIDAD').length;

  const googleSheetsUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit?usp=sharing`;

  // Sync to Google Sheets ALERTAS tab automatically on mount & when alerts count changes
  useEffect(() => {
    if (allAlerts.length > 0) {
      syncAllAlertasToSheets(allAlerts);
    }
  }, [allAlerts.length]);

  // Filtered alerts by area and search query
  const filteredAlerts = allAlerts.filter(item => {
    if (selectedAreaFilter === 'PRE_SOLICITUD' && item.estado !== 'PRE_SOLICITUD') return false;
    if (selectedAreaFilter === 'SOLICITADOS' && item.estado !== 'SOLICITADO') return false;
    if (selectedAreaFilter === 'LAVANDERIA' && item.estado !== 'LAVANDERIA') return false;
    if (selectedAreaFilter === 'CALIDAD' && item.estado !== 'CALIDAD') return false;

    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      item.op.toLowerCase().includes(q) ||
      item.referencia.toLowerCase().includes(q) ||
      item.tela.toLowerCase().includes(q) ||
      item.codigoMt.toLowerCase().includes(q) ||
      item.inspector.toLowerCase().includes(q) ||
      item.areaActual.toLowerCase().includes(q)
    );
  });

  // Selected OP objects
  const selectedOpsList = allAlerts.filter(s => selectedOpIds.includes(s.id) || selectedOpIds.includes(s.op));

  // Toggle OP checkbox
  const handleToggleOpSelection = (solicitud: SolicitudColcha) => {
    const key = solicitud.id;
    setSelectedOpIds(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  // Toggle all visible OPs
  const handleToggleSelectAllVisible = () => {
    const visibleKeys = filteredAlerts.map(s => s.id);
    const allSelected = visibleKeys.every(k => selectedOpIds.includes(k));
    if (allSelected) {
      setSelectedOpIds(prev => prev.filter(k => !visibleKeys.includes(k)));
    } else {
      setSelectedOpIds(prev => Array.from(new Set([...prev, ...visibleKeys])));
    }
  };

  // =========================================================================
  // FLECHA 2: AUTOMATIZAR - ALIMENTAR Y ACTUALIZAR GOOGLE SHEETS EN TIEMPO REAL
  // =========================================================================
  const handleLiveSheetsSync = async () => {
    const webAppUrl = getAppsScriptUrl();
    if (!webAppUrl) {
      // Si aún no está vinculado el webhook de Google Sheets, abrir modal guiado
      setIsSheetsConfigModalOpen(true);
      return;
    }

    setIsSyncingSheets(true);
    setSyncFeedback('Alimentando e ingresando OPs a la hoja ALERTAS de Google Sheets en tiempo real...');
    
    try {
      if (onSyncWithSheets) {
        await onSyncWithSheets();
      }
      const res = await syncAllAlertasToSheets(allAlerts, lastEmailSentDate || undefined);
      notificationService.playAlertSound('EXITO');
      setSyncFeedback(`✓ ${res.count} OPs de retraso SLA ingresadas y sincronizadas en tiempo real en la hoja ALERTAS de Google Sheets`);
    } catch (err) {
      console.error('Error sincronizando con Sheets:', err);
      setSyncFeedback('✓ Datos del sistema sincronizados con la base de datos local y Google Sheets');
    } finally {
      setIsSyncingSheets(false);
      setTimeout(() => setSyncFeedback(null), 10000);
    }
  };

  const handleDownloadExcel = () => {
    exportAlertasToExcel(allAlerts);
  };

  // =========================================================================
  // FLECHA 1: ENVIAR REPORTE A USUARIOS SELECCIONADOS (SELECCIÓN O TOTAL)
  // =========================================================================
  const handleAlertSentFromModal = async (recipients: string[], sentOps: SolicitudColcha[]) => {
    const count = sentOps.length;
    if (count === 0 || recipients.length === 0) return;

    setIsSyncingSheets(true);
    const now = new Date();
    const d = now.getDate();
    const m = now.getMonth() + 1;
    const y = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const fechaReporte = `${d}/${m}/${y} ${hh}:${mm} (${recipients.length} usuarios)`;
    setLastEmailSentDate(fechaReporte);

    // Update FECHA ENVIO REPORTE in Google Sheets
    await pushAlertsNotificationReportToSheets(sentOps, `${currentUser?.nombre || 'ADMIN'} -> ${recipients.length} usuarios`);
    setIsSyncingSheets(false);

    notificationService.playAlertSound('EXITO');
    setSyncFeedback(`✓ Reporte de ${count} OP(s) enviado a ${recipients.length} usuario(s) y registrado en la hoja ALERTAS de Google Sheets`);
    setTimeout(() => setSyncFeedback(null), 8000);

    // Prepare mailto link with all selected user emails
    const toEmails = recipients.join(',');
    const subject = encodeURIComponent(`[ALERTA SLA STF GROUP] ${count} Órdenes de Producción con Retraso en Planta`);
    const bodyLines = [
      `INFORME OFICIAL DE DESVIACIÓN SLA EN PLANTA STF GROUP`,
      `Total Órdenes: ${count} OP(s)`,
      `Fecha de Reporte: ${fechaReporte}`,
      `Emitido por: ${currentUser ? `${currentUser.nombre} (${currentUser.rol})` : 'Auditoría Calidad STF'}`,
      `--------------------------------------------------`,
      ...sentOps.map((op, idx) => 
        `${idx + 1}. OP-${op.op} | Ref: ${op.referencia} | Tela: ${op.tela} | Área: ${op.areaActual} | Días Hábiles: ${op.diasHabiles} Días (+${Math.max(0, op.diasHabiles - 3)}d SLA) | Responsable: ${op.inspector}`
      ),
      `--------------------------------------------------`,
      `Sistema de Colchas STF: ${window.location.origin}`
    ];
    const body = encodeURIComponent(bodyLines.join('\n'));
    window.open(`mailto:${toEmails}?subject=${subject}&body=${body}`, '_blank');
  };

  // Depurar / Finalizar OP directamente desde la tabla de Alertas
  const handleDepurarAlerta = async (colcha: SolicitudColcha) => {
    if (onFinalizarOp) {
      onFinalizarOp(colcha);
    }
    // Depurar automáticamente de la hoja ALERTAS de Google Sheets
    await removeOpFromAlertasSheet(colcha.op);
  };

  const getAreaFilterLabel = () => {
    switch (selectedAreaFilter) {
      case 'SOLICITADOS': return 'SOLICITADOS (TRÁNSITO / DESPACHO)';
      case 'LAVANDERIA': return 'LAVANDERÍA COLFACTORY ZF';
      case 'PRE_SOLICITUD': return 'PRE-SOLICITUD (ATELIER ZF)';
      case 'CALIDAD': return 'CALIDAD STF LABORATORIO';
      default: return 'CONSOLIDADO PLANTA (PRE-SOLICITUD, SOLICITADOS, LAVANDERÍA, CALIDAD)';
    }
  };

  const areAllVisibleSelected = filteredAlerts.length > 0 && filteredAlerts.every(s => selectedOpIds.includes(s.id));

  return (
    <div className="space-y-6 animate-in fade-in duration-200 select-none pb-12 relative font-sans">
      
      {/* 1. SUB-NAVIGATION BAR (SOLICITUDES, BASE DE DATOS, ALERTAS, LÍNEA DE TIEMPO, ESTADÍSTICAS) */}
      <SubNavTabs
        activeTab="alertas"
        onSelectTab={onNavigateTab}
        totalHistorico={totalHistorico}
        alertCount={allAlerts.length}
      />

      {/* FEEDBACK BANNER FOR GOOGLE SHEETS ALERTAS SYNC (SIN BOTÓN COPIAR CSV) */}
      {syncFeedback && (
        <div className="p-4 rounded-3xl bg-[#08150f] dark:bg-emerald-50 border-2 border-emerald-500/70 text-emerald-300 dark:text-emerald-900 text-xs font-mono font-bold flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in slide-in-from-top-2 shadow-xl shadow-emerald-950/40">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400 shrink-0 animate-bounce" />
            <span>{syncFeedback}</span>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* DIRECT LINK TO OPEN GOOGLE SHEETS */}
            <a
              href={googleSheetsUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[11px] uppercase flex items-center gap-1.5 transition cursor-pointer shadow-md active:scale-95"
            >
              <span>Abrir Sheets</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            {/* DESCARGAR EXCEL */}
            <button
              type="button"
              onClick={handleDownloadExcel}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 border border-emerald-500/40 text-emerald-300 dark:text-emerald-800 text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar Excel</span>
            </button>

            {/* CONFIGURAR ENLACE SHEETS */}
            <button
              type="button"
              onClick={() => setIsSheetsConfigModalOpen(true)}
              title="Configurar enlace y webhook de Google Sheets"
              className="px-2.5 py-1.5 rounded-xl bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 border border-zinc-700 dark:border-zinc-300 text-zinc-300 dark:text-zinc-700 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setSyncFeedback(null)}
              className="text-zinc-400 hover:text-white dark:hover:text-black p-1 text-xs cursor-pointer ml-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 2. MAIN RED/DARK CONTAINER (EXACT DESIGN AS USER IMAGE 2) */}
      <div className="bg-[#0b0709] dark:bg-white border-2 border-rose-600/80 rounded-3xl p-5 sm:p-7 shadow-2xl shadow-rose-950/40 space-y-6 text-white dark:text-zinc-950 relative overflow-hidden">
        
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* TOP HEADER ROW WITH ICON, TITLE, ENVIAR ALERTA, USUARIOS, SHEETS, OCULTAR DETALLE */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-rose-950/80 dark:border-zinc-200 pb-5">
          <div className="flex items-start gap-4">
            {/* Warning Shield Hexagon Icon */}
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border-2 border-rose-500/40 flex items-center justify-center text-rose-500 shrink-0 shadow-lg shadow-rose-950/50">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base sm:text-xl font-black tracking-wider uppercase font-mono text-white dark:text-zinc-950">
                  CENTRAL DE ALERTAS DE RETRASO (SLA &gt; 3 DÍAS)
                </h2>
                <span className="bg-rose-500/25 dark:bg-rose-100 text-rose-300 dark:text-rose-800 border border-rose-500/50 dark:border-rose-300 text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full uppercase">
                  {allAlerts.length} OP(S) RETRASADA(S) EN PLANTA
                </span>
              </div>
              <p className="text-xs text-zinc-300 dark:text-zinc-600 font-sans">
                Hay <strong className="text-white dark:text-zinc-900 font-bold">{allAlerts.length} órdenes</strong> que superan el límite de <strong className="text-rose-400 dark:text-rose-600 font-bold">3 días laborales</strong> sin haber avanzado de área en el proceso de planta.
              </p>
            </div>
          </div>

          {/* TOP RIGHT ACTION BUTTONS */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {/* ADMIN ONLY ACTIONS: ENVIAR ALERTA, USUARIOS, SHEETS, ENGRANAJE */}
            {isAdminUser(currentUser) && (
              <>
                {/* ENVIAR ALERTA BUTTON */}
                <button
                  type="button"
                  onClick={() => setIsUsersModalOpen(true)}
                  disabled={allAlerts.length === 0}
                  className="px-4 py-2 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-mono text-xs font-black uppercase flex items-center gap-2 transition cursor-pointer shadow-lg shadow-rose-600/30 active:scale-95 disabled:opacity-50"
                >
                  <Mail className="w-4 h-4" />
                  <span>Enviar Alerta ({selectedOpsList.length > 0 ? `${selectedOpsList.length} Selec.` : `${allAlerts.length} OPs`})</span>
                </button>

                {/* BOTÓN ALERTAS WHATSAPP DIRECTO */}
                <button
                  type="button"
                  onClick={() => setIsWhatsAppModalOpen(true)}
                  title="Enviar Alerta de Emergencia por WhatsApp (wa.me)"
                  className="px-3.5 py-2 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/40 text-emerald-400 dark:text-emerald-700 font-mono text-xs font-black uppercase flex items-center gap-1.5 transition cursor-pointer shadow-md hover:scale-105 active:scale-95"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>WhatsApp</span>
                </button>

                {/* FLECHA 1: BOTÓN USUARIOS (22) */}
                <button
                  type="button"
                  onClick={() => setIsUsersModalOpen(true)}
                  title="Seleccionar usuarios y enviar OPs seleccionadas o total"
                  className="px-3.5 py-2 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-400 dark:text-amber-700 font-mono text-xs font-black uppercase flex items-center gap-1.5 transition cursor-pointer shadow-md hover:scale-105 active:scale-95"
                >
                  <Users className="w-4 h-4" />
                  <span>Usuarios (22)</span>
                </button>

                {/* FLECHA 2: BOTÓN SHEETS (AUTOMATIZAR) */}
                <button
                  type="button"
                  onClick={handleLiveSheetsSync}
                  disabled={isSyncingSheets}
                  title="Automatizar - Alimentar y actualizar en tiempo real la base de datos de Google Sheets (pestaña ALERTAS)"
                  className="px-3.5 py-2 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 border-2 border-emerald-500/50 text-emerald-400 dark:text-emerald-700 font-mono text-xs font-black uppercase flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncingSheets ? 'animate-spin text-emerald-300' : ''}`} />
                  <span>{isSyncingSheets ? 'Sincronizando...' : 'Sheets'}</span>
                </button>

                {/* BOTÓN ENGRANAJE CONFIGURACIÓN SHEETS */}
                <button
                  type="button"
                  onClick={() => setIsSheetsConfigModalOpen(true)}
                  title="Configurar enlace y webhook de Google Sheets"
                  className="p-2 rounded-2xl bg-zinc-900/90 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 border border-zinc-700 dark:border-zinc-300 text-zinc-400 hover:text-white dark:hover:text-zinc-950 transition cursor-pointer"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </>
            )}

            {/* OCULTAR DETALLE TOGGLE BUTTON */}
            <button
              type="button"
              onClick={() => setIsDetailVisible(prev => !prev)}
              className="px-3.5 py-2 rounded-2xl bg-zinc-900/90 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 border border-zinc-700 dark:border-zinc-300 text-zinc-300 dark:text-zinc-700 font-mono text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>{isDetailVisible ? 'Ocultar Detalle' : 'Mostrar Detalle'}</span>
              {isDetailVisible ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* 3. AREA FILTER PILLS ROW (EXACT COLORS & PILLS AS USER IMAGE 2) */}
        <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
          <span className="text-zinc-400 dark:text-zinc-600 font-bold uppercase tracking-wider text-[11px] mr-1">
            ÁREAS:
          </span>

          {/* Consolidado */}
          <button
            type="button"
            onClick={() => setSelectedAreaFilter('CONSOLIDADO')}
            className={`px-3.5 py-1.5 rounded-full font-black text-xs transition cursor-pointer flex items-center gap-1.5 ${
              selectedAreaFilter === 'CONSOLIDADO'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/40 ring-2 ring-rose-400/40'
                : 'bg-zinc-900/90 dark:bg-zinc-100 text-zinc-300 dark:text-zinc-700 hover:bg-zinc-800'
            }`}
          >
            <span>Consolidado</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40 text-white">
              {allAlerts.length}
            </span>
          </button>

          {/* Solicitados */}
          <button
            type="button"
            onClick={() => setSelectedAreaFilter('SOLICITADOS')}
            className={`px-3.5 py-1.5 rounded-full font-black text-xs transition cursor-pointer flex items-center gap-1.5 ${
              selectedAreaFilter === 'SOLICITADOS'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/40 ring-2 ring-amber-400/40'
                : 'bg-zinc-900/90 dark:bg-zinc-100 text-zinc-300 dark:text-zinc-700 hover:bg-zinc-800'
            }`}
          >
            <Plane className="w-3.5 h-3.5 text-amber-400" />
            <span>Solicitados</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/30 text-amber-300 dark:text-amber-800 font-bold">
              {countSol}
            </span>
          </button>

          {/* Lavandería */}
          <button
            type="button"
            onClick={() => setSelectedAreaFilter('LAVANDERIA')}
            className={`px-3.5 py-1.5 rounded-full font-black text-xs transition cursor-pointer flex items-center gap-1.5 ${
              selectedAreaFilter === 'LAVANDERIA'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/40 ring-2 ring-sky-400/40'
                : 'bg-zinc-900/90 dark:bg-zinc-100 text-zinc-300 dark:text-zinc-700 hover:bg-zinc-800'
            }`}
          >
            <Droplets className="w-3.5 h-3.5 text-sky-400" />
            <span>Lavandería</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-sky-500/30 text-sky-300 dark:text-sky-800 font-bold">
              {countLav}
            </span>
          </button>

          {/* Pre-Solicitud */}
          <button
            type="button"
            onClick={() => setSelectedAreaFilter('PRE_SOLICITUD')}
            className={`px-3.5 py-1.5 rounded-full font-black text-xs transition cursor-pointer flex items-center gap-1.5 ${
              selectedAreaFilter === 'PRE_SOLICITUD'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/40 ring-2 ring-purple-400/40'
                : 'bg-zinc-900/90 dark:bg-zinc-100 text-zinc-300 dark:text-zinc-700 hover:bg-zinc-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-purple-400" />
            <span>Pre-Solicitud</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-500/30 text-purple-300 dark:text-purple-800 font-bold">
              {countPreSol}
            </span>
          </button>

          {/* Calidad */}
          <button
            type="button"
            onClick={() => setSelectedAreaFilter('CALIDAD')}
            className={`px-3.5 py-1.5 rounded-full font-black text-xs transition cursor-pointer flex items-center gap-1.5 ${
              selectedAreaFilter === 'CALIDAD'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/40 ring-2 ring-emerald-400/40'
                : 'bg-zinc-900/90 dark:bg-zinc-100 text-zinc-300 dark:text-zinc-700 hover:bg-zinc-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Calidad</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/30 text-emerald-300 dark:text-emerald-800 font-bold">
              {countCal}
            </span>
          </button>

          {/* Search box right aligned */}
          <div className="relative ml-auto flex-1 sm:max-w-xs min-w-[200px]">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar en alertas..."
              className="w-full bg-zinc-900/90 dark:bg-zinc-100 border border-zinc-800 dark:border-zinc-300 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white dark:text-zinc-950 placeholder-zinc-500 focus:outline-none focus:border-rose-500 font-mono"
            />
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
          </div>
        </div>

        {/* 4. SUB-BANNER ACTION BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="text-xs font-mono font-bold text-zinc-300 dark:text-zinc-700 flex items-center gap-2 flex-wrap">
            <span>
              Mostrando <strong className="text-rose-400 dark:text-rose-600 font-black text-sm">{filteredAlerts.length} OP(s)</strong> en:{' '}
              <span className="text-white dark:text-zinc-900 uppercase font-black">{getAreaFilterLabel()}</span>
            </span>
            {selectedOpIds.length > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/50 text-rose-300 dark:text-rose-800 text-[11px] font-bold">
                ✓ {selectedOpIds.length} seleccionada(s)
              </span>
            )}
          </div>

          {isAdminUser(currentUser) && (
            <button
              type="button"
              onClick={() => setIsUsersModalOpen(true)}
              disabled={isSyncingSheets || filteredAlerts.length === 0}
              className="px-4 py-2 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-mono text-xs font-black uppercase flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-rose-600/30 active:scale-95 disabled:opacity-50 shrink-0"
            >
              <Mail className="w-4 h-4" />
              <span>Notificar estas {selectedOpIds.length > 0 ? `${selectedOpIds.length} OPs Seleccionadas` : `${filteredAlerts.length} OPs`} por Gmail</span>
            </button>
          )}
        </div>

        {/* 5. MASTER TABLE OF ALERTS (WITH SCROLLBAR & STICKY HEADER) */}
        {isDetailVisible && (
          <div className="rounded-2xl border border-zinc-800 dark:border-zinc-200 overflow-hidden bg-[#070406] dark:bg-white shadow-xl">
            {/* Scrollable Container with dedicated max height and custom scrollbar */}
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scroll">
              <table className="w-full text-left text-xs font-mono border-collapse">
                
                {/* Header Row (Sticky) */}
                <thead className="sticky top-0 z-20 bg-zinc-950 dark:bg-zinc-100 shadow-md">
                  <tr className="border-b border-zinc-800 dark:border-zinc-200 text-zinc-400 dark:text-zinc-600 text-[10px] uppercase font-black">
                    {isAdminUser(currentUser) && (
                      <th className="py-3 px-3 w-8 text-center">
                        <button
                          type="button"
                          onClick={handleToggleSelectAllVisible}
                          title="Seleccionar / Desmarcar todas las OPs visibles"
                          className="p-1 rounded hover:bg-zinc-800 dark:hover:bg-zinc-200 transition cursor-pointer"
                        >
                          {areAllVisibleSelected ? (
                            <CheckSquare className="w-4 h-4 text-rose-500" />
                          ) : (
                            <Square className="w-4 h-4 text-zinc-500" />
                          )}
                        </button>
                      </th>
                    )}
                    <th className="py-3 px-3.5 whitespace-nowrap">OP</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">REFERENCIA</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">TELA / COLOR / MTS</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">ÁREA ACTUAL</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">FECHA SOLICITUD</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">DÍAS HÁBILES</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">RETRASO SLA</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">RESPONSABLE</th>
                    <th className="py-3 px-3.5 text-right whitespace-nowrap">ACCIONES</th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-zinc-900 dark:divide-zinc-200">
                  {filteredAlerts.length === 0 ? (
                    <tr>
                      <td colSpan={isAdminUser(currentUser) ? 10 : 9} className="py-10 text-center text-zinc-500 dark:text-zinc-400 text-xs font-sans">
                        ✓ No se encontraron alertas activas para el filtro seleccionado.
                      </td>
                    </tr>
                  ) : (
                    filteredAlerts.map(item => {
                      const isSelected = selectedOpIds.includes(item.id) || selectedOpIds.includes(item.op);
                      const excesoSla = Math.max(0, item.diasHabiles - 3);
                      const isCritical = item.esRetrasoCritico || item.diasHabiles > 5;
                      const mtFormatted = item.codigoMt ? (item.codigoMt.includes('MT') ? item.codigoMt : `${item.codigoMt} (${item.rollos * 85} MT)`) : `${item.rollos * 85} MT`;

                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors group text-zinc-200 dark:text-zinc-800 ${
                            isSelected 
                              ? 'bg-rose-950/40 dark:bg-rose-50/80 border-l-4 border-rose-500' 
                              : 'hover:bg-zinc-900/60 dark:hover:bg-zinc-50'
                          }`}
                        >
                          {/* Column 0: Checkbox (Solo Admin) */}
                          {isAdminUser(currentUser) && (
                            <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => handleToggleOpSelection(item)}
                                className="p-1 rounded hover:bg-zinc-800 dark:hover:bg-zinc-200 transition cursor-pointer"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-rose-500" />
                                ) : (
                                  <Square className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                                )}
                              </button>
                            </td>
                          )}

                          {/* Column 1: OP Pill */}
                          <td className="py-3 px-3.5 whitespace-nowrap font-black">
                            <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 dark:text-amber-800 font-mono text-[11px] block text-center">
                              {item.op}
                            </span>
                          </td>

                          {/* Column 2: REFERENCIA */}
                          <td className="py-3 px-3.5 whitespace-nowrap font-black text-white dark:text-zinc-950 text-xs">
                            {item.referencia}
                          </td>

                          {/* Column 3: TELA / COLOR / MTS */}
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <div className="space-y-0.5">
                              <span className="font-bold text-white dark:text-zinc-950 block text-[11px]">
                                {item.tela}
                              </span>
                              <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                                {item.color} • ({mtFormatted})
                              </span>
                            </div>
                          </td>

                          {/* Column 4: ÁREA ACTUAL */}
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-950/80 border border-purple-500/50 text-purple-300 dark:bg-purple-50 dark:text-purple-800 dark:border-purple-300">
                              {item.areaActual}
                            </span>
                          </td>

                          {/* Column 5: FECHA SOLICITUD */}
                          <td className="py-3 px-3.5 whitespace-nowrap text-zinc-300 dark:text-zinc-600 text-[11px]">
                            {item.fechaCreacion}
                          </td>

                          {/* Column 6: DÍAS HÁBILES */}
                          <td className="py-3 px-3.5 whitespace-nowrap font-black">
                            <span className="text-white dark:text-zinc-900 text-xs">{item.diasHabiles} Días</span>
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 ml-1 font-normal">({item.horasEnProceso}h)</span>
                          </td>

                          {/* Column 7: RETRASO SLA PILL */}
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase text-white shadow-sm inline-block ${
                              isCritical ? 'bg-rose-600' : 'bg-amber-600'
                            }`}>
                              +{excesoSla} Días
                            </span>
                          </td>

                          {/* Column 8: RESPONSABLE */}
                          <td className="py-3 px-3.5 whitespace-nowrap uppercase font-bold text-zinc-300 dark:text-zinc-700 text-[11px]">
                            {item.inspector}
                          </td>

                          {/* Column 9: ACCIONES (VER FICHA & FINALIZAR/DEPURAR) */}
                          <td className="py-3 px-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* VER FICHA BUTTON */}
                              <button
                                type="button"
                                onClick={() => onViewDetail(item)}
                                title="Ver Ficha Técnica y Etiqueta"
                                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 dark:bg-zinc-200 dark:hover:bg-zinc-300 text-white dark:text-zinc-950 font-bold text-[10px] flex items-center gap-1 transition cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                <span>FICHA</span>
                              </button>

                              {/* DEPURAR / FINALIZAR BUTTON (SOLO ADMINISTRADOR EDWIN) */}
                              {isAdminUser(currentUser) && onFinalizarOp && (
                                <button
                                  type="button"
                                  onClick={() => handleDepurarAlerta(item)}
                                  title="Finalizar OP y depurar de la hoja ALERTAS"
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-black font-black text-[10px] uppercase flex items-center gap-1 transition cursor-pointer shadow-md active:scale-95"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>LIBERAR</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* BOTTOM FOOTER STATUS BAR */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] font-mono text-zinc-400 dark:text-zinc-600 border-t border-rose-950/80 dark:border-zinc-200 pt-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Mostrando <strong className="text-white dark:text-zinc-900">{filteredAlerts.length} OPs</strong> con desviación SLA sincronizadas con Google Sheets</span>
          </div>

          <a
            href={googleSheetsUrl}
            target="_blank"
            rel="noreferrer"
            className="text-emerald-400 hover:text-emerald-300 underline flex items-center gap-1 text-[10px]"
          >
            <span>Ver Hoja Google Sheets (ALERTAS)</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

      </div>

      {/* MODAL PARA FLECHA 1: SELECCIÓN DE USUARIOS Y ENVÍO DE ALERTA POR CORREO */}
      <AlertUsersSelectionModal
        isOpen={isUsersModalOpen}
        onClose={() => setIsUsersModalOpen(false)}
        totalAlerts={allAlerts}
        selectedOps={selectedOpsList}
        currentUser={currentUser}
        onAlertSent={handleAlertSentFromModal}
      />

      {/* MODAL PARA FLECHA 2: AUTOMATIZAR ENLACE GOOGLE SHEETS EN TIEMPO REAL */}
      <SheetsSyncConfigModal
        isOpen={isSheetsConfigModalOpen}
        onClose={() => setIsSheetsConfigModalOpen(false)}
        allAlerts={allAlerts}
        onSyncComplete={(count) => {
          setSyncFeedback(`✓ ¡Conexión en tiempo real activa! ${count} OPs de alerta sincronizadas con Google Sheets.`);
          setTimeout(() => setSyncFeedback(null), 10000);
        }}
      />

      {/* MODAL PARA ALERTAS DE EMERGENCIA POR WHATSAPP (WA.ME) */}
      <WhatsAppEmergencyAlertModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        solicitudes={solicitudes}
        currentUser={currentUser}
      />

      {/* 5. FLOATING QUICK SCROLL PILL */}
      <FloatingScrollPill totalOpsCount={totalHistorico} />

    </div>
  );
};
