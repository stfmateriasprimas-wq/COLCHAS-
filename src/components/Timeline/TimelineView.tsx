import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, Clock, Calendar, AlertTriangle, CheckCircle2, ChevronRight, 
  ExternalLink, User, Droplets, Microscope, Layers, Sparkles, Filter,
  Check, Eye, X, ArrowRight, ShieldCheck, Tag, FileText, CheckCircle,
  Activity, Cpu, History
} from 'lucide-react';
import { SolicitudColcha, KpiMetrics, SectorType } from '../../types';
import { SubNavTabs } from '../Navigation/SubNavTabs';
import { FloatingScrollPill } from '../Common/FloatingScrollPill';
import { TabType } from '../Navigation';
import { formatColombianDisplayDate, parseColombianDate } from '../../services/slaCalculator';
import { calculateCumplimientoMetrics } from '../../services/cumplimientoService';
import { auditService, AuditLogEntry } from '../../services/auditService';
import { opTimelineService, OpTimelineRecord, StageTimeRecord } from '../../services/opTimelineService';
import { SmartPhotoDisplay } from '../Common/SmartPhotoDisplay';

interface TimelineViewProps {
  solicitudes: SolicitudColcha[];
  metrics: KpiMetrics;
  onViewDetail: (solicitud: SolicitudColcha) => void;
  onNavigateTab: (tab: TabType) => void;
}

// Helper to extract signed date and operator from observation text if available (e.g. [PRENDA TERMINADA - dd/mm/aaaa hh:mm por Usuario])
function extractSignedDate(text?: string): { dateStr: string; userStr: string } | null {
  if (!text) return null;
  const match = text.match(/\[(?:PRENDA TERMINADA|DICTAMEN|CALIDAD|LAVANDERÍA|MODIFICACIÓN)?\s*[-:]?\s*(\d{1,2}\/\d{1,2}\/\d{4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[ap]\.?\s*m\.?)?)?)(?:\s+por\s+([^\]]+))?\]/i);
  if (match) {
    return { dateStr: match[1].trim(), userStr: match[2]?.trim() || '' };
  }
  return null;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  solicitudes,
  metrics,
  onViewDetail,
  onNavigateTab
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'TODAS' | 'RETRASO' | 'PROCESO' | 'FINALIZADAS'>('TODAS');
  const [zoomedPhotoUrl, setZoomedPhotoUrl] = useState<string | null>(null);
  const [zoomedPhotoTitle, setZoomedPhotoTitle] = useState<string>('');

  // 1. Audit logs subscription for real-time forensic transition dates
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  useEffect(() => {
    const unsub = auditService.subscribeToLogs((logs) => {
      setAuditLogs(logs);
    });
    return () => unsub();
  }, []);

  // 2. Trazabilidad automática de Línea de Tiempo en tiempo real por OP
  const [timelinesMap, setTimelinesMap] = useState<Map<string, OpTimelineRecord>>(new Map());
  useEffect(() => {
    const unsub = opTimelineService.subscribe((map) => {
      setTimelinesMap(map);
    });
    return () => unsub();
  }, []);

  // 2. Real metrics calculation using official business engine
  const realMetrics = useMemo(() => calculateCumplimientoMetrics(solicitudes), [solicitudes]);

  const totalHistorico = solicitudes.length;
  const inRetrasoCount = realMetrics.opsConRetraso;
  const enProcesoCount = realMetrics.totalActivas;
  const finalizadasCount = realMetrics.totalFinalizadas;
  const leadTimePromedioDias = realMetrics.leadTimePromedioDias;
  const leadTimePromedioHoras = realMetrics.leadTimePromedioHoras;
  const pctCumplimientoSla = Math.round(realMetrics.pctCumplimientoSla);

  // Default selected OP
  const [selectedOpId, setSelectedOpId] = useState<string>(() => {
    return solicitudes.length > 0 ? solicitudes[0].id : '';
  });

  // Filter OP List on Left
  const filteredOps = useMemo(() => {
    return solicitudes.filter(item => {
      if (filterMode === 'RETRASO' && (!item.tieneRetraso || item.estado === 'FINALIZADO')) return false;
      if (filterMode === 'PROCESO' && item.estado === 'FINALIZADO') return false;
      if (filterMode === 'FINALIZADAS' && item.estado !== 'FINALIZADO') return false;

      const q = searchTerm.toLowerCase().trim();
      if (!q) return true;
      return (
        item.op.toLowerCase().includes(q) ||
        item.referencia.toLowerCase().includes(q) ||
        item.tela.toLowerCase().includes(q) ||
        item.inspector.toLowerCase().includes(q)
      );
    });
  }, [solicitudes, filterMode, searchTerm]);

  const selectedOp = useMemo(() => {
    return solicitudes.find(s => s.id === selectedOpId) || filteredOps[0] || solicitudes[0] || null;
  }, [solicitudes, filteredOps, selectedOpId]);

  // Extract audit logs specific to selected OP
  const opAuditLogs = useMemo(() => {
    if (!selectedOp) return [];
    const cleanOpNum = selectedOp.op.replace(/\D/g, '') || selectedOp.op.trim().toUpperCase();
    return auditLogs.filter(log => {
      if (!log.opAfectada) return false;
      const cleanLogOp = log.opAfectada.replace(/\D/g, '') || log.opAfectada.trim().toUpperCase();
      return cleanLogOp === cleanOpNum || log.opAfectada.toUpperCase().includes(cleanOpNum);
    }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [auditLogs, selectedOp]);

  // Map OP current state to 0..5 index in production lifecycle
  const currentStageIndex = useMemo(() => {
    if (!selectedOp) return 1;
    switch (selectedOp.estado) {
      case 'PRE_SOLICITUD': return 0;
      case 'SOLICITADO': return 1;
      case 'LAVANDERIA': return 2;
      case 'CALIDAD': return 3;
      case 'EVALUADO': return 4;
      case 'FINALIZADO': return 5;
      default: return 1;
    }
  }, [selectedOp]);

  // Obtener registro de línea de tiempo con medición automática por etapas
  const selectedTimeline = useMemo(() => {
    if (!selectedOp) return null;
    const cleanOpKey = opTimelineService.cleanOpKey(selectedOp.op);
    return timelinesMap.get(cleanOpKey) || opTimelineService.getTimelineForOp(selectedOp.op, selectedOp);
  }, [selectedOp, timelinesMap]);

  // Mediciones de tiempo automáticas por cada Lugar de Trabajo (4 estaciones principales)
  const workAreaTimes = useMemo(() => {
    if (!selectedOp) return null;

    const stagesMap = selectedTimeline?.stages || {};
    const createdDt = parseColombianDate(selectedOp.fechaCreacion);
    const validCreatedDt = !isNaN(createdDt.getTime()) && createdDt.getTime() > 0 ? createdDt : new Date();
    const createdFormatted = formatColombianDisplayDate(validCreatedDt);

    // 1. ÁREA: TRÁNSITO / DESPACHO (PRE_SOLICITUD & SOLICITADO)
    const stageTransito = stagesMap.SOLICITADO || stagesMap.PRE_SOLICITUD;
    const ingresoTransito = stageTransito?.fechaIngresoFormatted || createdFormatted;
    const salidaTransito = stageTransito?.fechaSalidaFormatted || stagesMap.LAVANDERIA?.fechaIngresoFormatted || (currentStageIndex > 1 ? 'Entregado a Lavandería' : 'En tránsito hacia Colfactory ZF');
    const tiempoTransito = stageTransito?.duracionTexto || (currentStageIndex === 1 ? `${selectedOp.diasHabiles}d (${selectedOp.horasEnProceso}h) en tránsito` : 'Tránsito completado');
    const respTransito = stageTransito?.responsableIngreso || selectedOp.inspector || 'Despacho STF';
    const estadoTransito = currentStageIndex > 1 ? 'COMPLETADO' : currentStageIndex === 1 ? 'EN PROCESO' : 'PENDIENTE';

    // 2. ÁREA: LAVANDERÍA COLFACTORY ZF
    const stageLav = stagesMap.LAVANDERIA;
    const ingresoLav = stageLav?.fechaIngresoFormatted || (currentStageIndex >= 2 ? 'Recibido en planta lavadero' : '— En espera de recepción');
    const salidaLav = stageLav?.fechaSalidaFormatted || stagesMap.CALIDAD?.fechaIngresoFormatted || (currentStageIndex > 2 ? 'Enviado a Laboratorio STF' : currentStageIndex === 2 ? 'En ciclo de lavado (tambores)' : '— Pendiente');
    const tiempoLav = stageLav?.duracionTexto || (currentStageIndex === 2 ? `${selectedOp.diasHabiles}d (${selectedOp.horasEnProceso}h) en lavado` : currentStageIndex > 2 ? 'Ciclo culminado' : '—');
    const respLav = stageLav?.responsableIngreso || (currentStageIndex >= 2 ? 'Colfactory ZF / Lavandería' : '—');
    const estadoLav = currentStageIndex > 2 ? 'COMPLETADO' : currentStageIndex === 2 ? 'EN PROCESO' : 'PENDIENTE';

    // 3. ÁREA: CALIDAD LABORATORIO STF
    const stageCal = stagesMap.CALIDAD;
    const ingresoCal = stageCal?.fechaIngresoFormatted || (currentStageIndex >= 3 ? 'Recibido en Laboratorio STF' : '— En espera de lavado');
    const salidaCal = stageCal?.fechaSalidaFormatted || stagesMap.EVALUADO?.fechaIngresoFormatted || (currentStageIndex > 3 ? `Dictamen emitido: ${selectedOp.dictamen || 'EVALUADO'}` : currentStageIndex === 3 ? 'En inspección técnica' : '— Pendiente');
    const tiempoCal = stageCal?.duracionTexto || (currentStageIndex === 3 ? `${selectedOp.diasHabiles}d (${selectedOp.horasEnProceso}h) en laboratorio` : currentStageIndex > 3 ? 'Auditoría completada' : '—');
    const respCal = stageCal?.responsableIngreso || selectedOp.inspector || (currentStageIndex >= 3 ? 'Auditor Calidad STF' : '—');
    const estadoCal = currentStageIndex > 3 ? 'COMPLETADO' : currentStageIndex === 3 ? 'EN PROCESO' : 'PENDIENTE';

    // 4. ÁREA: CONTROL FACTORY & LIBERACIÓN FINAL
    const stageFinal = stagesMap.FINALIZADO;
    const stageEval = stagesMap.EVALUADO;
    const ingresoEval = stageEval?.fechaIngresoFormatted || (currentStageIndex >= 4 ? 'Enviado a Factory para cierre' : '— En espera de dictamen');
    const salidaFinal = stageFinal?.fechaSalidaFormatted || (currentStageIndex === 5 ? 'Lote Liberado' : currentStageIndex === 4 ? 'En espera exclusiva de Factory' : '— Pendiente');
    const leadTimeTotal = selectedTimeline?.leadTimeTotalTexto || (currentStageIndex === 5 ? `${selectedOp.diasHabiles} días hábiles (~${selectedOp.horasEnProceso}h)` : `En proceso (${selectedOp.diasHabiles}d acumulados)`);
    const respFinal = stageFinal?.responsableIngreso || (currentStageIndex === 5 ? 'Factory / Administrador' : '—');
    const estadoFinal = currentStageIndex === 5 ? 'COMPLETADO' : currentStageIndex === 4 ? 'EN PROCESO' : 'PENDIENTE';

    return {
      transito: { ingreso: ingresoTransito, salida: salidaTransito, tiempo: tiempoTransito, resp: respTransito, estado: estadoTransito },
      lavanderia: { ingreso: ingresoLav, salida: salidaLav, tiempo: tiempoLav, resp: respLav, estado: estadoLav },
      calidad: { ingreso: ingresoCal, salida: salidaCal, tiempo: tiempoCal, resp: respCal, estado: estadoCal },
      factory: { ingreso: ingresoEval, salida: salidaFinal, tiempo: leadTimeTotal, resp: respFinal, estado: estadoFinal }
    };
  }, [selectedOp, selectedTimeline, currentStageIndex]);

  // Build the 6 official production timeline stages with 100% verified real data
  const stages = useMemo(() => {
    if (!selectedOp) return [];

    const timelineStages = selectedTimeline?.stages || {};
    const createdDt = parseColombianDate(selectedOp.fechaCreacion);
    const validCreatedDt = !isNaN(createdDt.getTime()) && createdDt.getTime() > 0 ? createdDt : new Date();

    // 1. Audit logs matching this OP (Real-time forensic events from work areas)
    const logCreation = opAuditLogs.find(l => l.tipoAccion === 'CREACION_OP');
    const logTransferDespacho = opAuditLogs.find(l => l.tipoAccion === 'TRANSFERENCIA' && (l.detalles?.estadoNuevo?.includes('SOLICIT') || l.detalles?.estadoNuevo === 'SOLICITADO'));
    const logTransferLav = opAuditLogs.find(l => (l.tipoAccion === 'TRANSFERENCIA' && l.detalles?.estadoNuevo?.includes('LAVAD')) || l.descripcion?.toLowerCase().includes('lavander'));
    const logTransferCal = opAuditLogs.find(l => (l.tipoAccion === 'TRANSFERENCIA' && (l.detalles?.estadoNuevo?.includes('CALIDAD') || l.detalles?.estadoNuevo?.includes('ENVIADO A STF'))));
    const logDictamen = opAuditLogs.find(l => l.tipoAccion === 'DICTAMEN_CALIDAD' || (l.tipoAccion === 'TRANSFERENCIA' && l.detalles?.estadoNuevo?.includes('EVALUAD')));
    const logFinalizado = opAuditLogs.find(l => (l.tipoAccion === 'TRANSFERENCIA' && l.detalles?.estadoNuevo?.includes('FINAL')) || (l.tipoAccion === 'DICTAMEN_CALIDAD' && l.descripcion?.toLowerCase().includes('finaliz')));

    // 2. Observations signed with date/user
    const signedPrenda = extractSignedDate(selectedOp.observacionesPrendaTerminada);
    const signedCalidad = extractSignedDate(selectedOp.observacionesCalidad);
    const signedLavanderia = extractSignedDate(selectedOp.observacionesLavanderia);

    // Helpers to resolve verified real timestamp and operator for each stage
    // Stage 1 (CREACIÓN / REGISTRO INICIAL)
    const recPre = timelineStages.PRE_SOLICITUD;
    const fechaEtapa1 = recPre?.fechaIngresoFormatted || formatColombianDisplayDate(validCreatedDt);
    const fechaSalidaEtapa1 = recPre?.fechaSalidaFormatted;
    const responsableEtapa1 = recPre?.responsableIngreso || logCreation?.usuarioNombre || selectedOp.inspector || 'OPERARIO STF';
    const tiempoEtapa1 = recPre?.duracionTexto || 'Punto de partida (Registro de solicitud en Base de Datos)';
    const fuenteEtapa1 = recPre ? 'Motor Automático' : 'Base de Datos';

    // Stage 2 (DESPACHO / TRÁNSITO)
    const recSol = timelineStages.SOLICITADO;
    let fechaEtapa2 = recSol?.fechaIngresoFormatted || (currentStageIndex >= 1 ? formatColombianDisplayDate(validCreatedDt) : '— En espera de despacho');
    let fechaSalidaEtapa2 = recSol?.fechaSalidaFormatted;
    let responsableEtapa2 = recSol?.responsableIngreso || selectedOp.inspector || 'Despacho STF';
    let tiempoEtapa2 = recSol?.duracionTexto || 'Pendiente de despacho';
    let fuenteEtapa2 = recSol ? 'Motor Automático' : '';
    if (currentStageIndex === 1) {
      fechaEtapa2 = recSol?.fechaIngresoFormatted || `En tránsito desde: ${formatColombianDisplayDate(validCreatedDt)}`;
      tiempoEtapa2 = recSol?.duracionTexto || `${selectedOp.diasHabiles}d (${selectedOp.horasEnProceso}h) en espera de recepción`;
      fuenteEtapa2 = recSol ? 'Motor Automático' : 'En Proceso';
    } else if (currentStageIndex > 1) {
      if (recSol?.fechaIngresoFormatted) {
        fechaEtapa2 = recSol.fechaIngresoFormatted;
        fuenteEtapa2 = 'Motor Automático';
      } else if (logTransferDespacho) {
        fechaEtapa2 = formatColombianDisplayDate(new Date(logTransferDespacho.timestamp));
        responsableEtapa2 = `${logTransferDespacho.usuarioNombre} (${logTransferDespacho.usuarioArea || 'DESPACHO'})`;
        fuenteEtapa2 = 'Auditoría en vivo';
      } else {
        fechaEtapa2 = `Despachado en solicitud inicial (${formatColombianDisplayDate(validCreatedDt)})`;
        fuenteEtapa2 = 'Base de Datos';
      }
      tiempoEtapa2 = recSol?.duracionTexto || 'Tránsito completado';
    }

    // Stage 3 (LAVANDERÍA COLFACTORY ZF)
    const recLav = timelineStages.LAVANDERIA;
    let fechaEtapa3 = recLav?.fechaIngresoFormatted || '— En espera de recepción en lavadero';
    let fechaSalidaEtapa3 = recLav?.fechaSalidaFormatted;
    let responsableEtapa3 = recLav?.responsableIngreso || 'Colfactory ZF / Operario de Lavandería';
    let tiempoEtapa3 = recLav?.duracionTexto || 'Pendiente de ingreso a tambores de lavado';
    let fuenteEtapa3 = recLav ? 'Motor Automático' : '';
    if (currentStageIndex === 2) {
      fechaEtapa3 = recLav?.fechaIngresoFormatted || 'En proceso actual en Lavandería Colfactory';
      tiempoEtapa3 = recLav?.duracionTexto || `${selectedOp.diasHabiles}d (${selectedOp.horasEnProceso}h) en tambor de lavado`;
      fuenteEtapa3 = recLav ? 'Motor Automático' : 'En Proceso';
    } else if (currentStageIndex > 2) {
      if (recLav?.fechaIngresoFormatted) {
        fechaEtapa3 = recLav.fechaIngresoFormatted;
        fuenteEtapa3 = 'Motor Automático';
      } else if (logTransferLav) {
        fechaEtapa3 = formatColombianDisplayDate(new Date(logTransferLav.timestamp));
        responsableEtapa3 = `${logTransferLav.usuarioNombre} (${logTransferLav.usuarioArea || 'LAVANDERÍA'})`;
        fuenteEtapa3 = 'Auditoría en vivo';
      } else if (signedLavanderia) {
        fechaEtapa3 = signedLavanderia.dateStr;
        if (signedLavanderia.userStr) responsableEtapa3 = signedLavanderia.userStr;
        fuenteEtapa3 = 'Registro Lavandería';
      } else {
        fechaEtapa3 = 'Ciclo culminado en Lavandería Colfactory ZF';
        fuenteEtapa3 = 'Base de Datos';
      }
      tiempoEtapa3 = recLav?.duracionTexto || 'Ciclo de lavado culminado (SLA: 2 días)';
    }

    // Stage 4 (CALIDAD LABORATORIO STF)
    const recCal = timelineStages.CALIDAD;
    let fechaEtapa4 = recCal?.fechaIngresoFormatted || '— En espera de culminación de lavado';
    let fechaSalidaEtapa4 = recCal?.fechaSalidaFormatted;
    let responsableEtapa4 = recCal?.responsableIngreso || selectedOp.inspector || 'Auditor Técnico de Calidad STF';
    let tiempoEtapa4 = recCal?.duracionTexto || 'Pendiente de recepción en Laboratorio';
    let fuenteEtapa4 = recCal ? 'Motor Automático' : '';
    if (currentStageIndex === 3) {
      fechaEtapa4 = recCal?.fechaIngresoFormatted || 'En auditoría técnica en Laboratorio de Calidad';
      tiempoEtapa4 = recCal?.duracionTexto || `${selectedOp.diasHabiles}d (${selectedOp.horasEnProceso}h) en inspección de laboratorio`;
      fuenteEtapa4 = recCal ? 'Motor Automático' : 'En Proceso';
    } else if (currentStageIndex > 3) {
      if (recCal?.fechaIngresoFormatted) {
        fechaEtapa4 = recCal.fechaIngresoFormatted;
        fuenteEtapa4 = 'Motor Automático';
      } else if (logTransferCal) {
        fechaEtapa4 = formatColombianDisplayDate(new Date(logTransferCal.timestamp));
        responsableEtapa4 = `${logTransferCal.usuarioNombre} (${logTransferCal.usuarioArea || 'CALIDAD'})`;
        fuenteEtapa4 = 'Auditoría en vivo';
      } else if (signedCalidad) {
        fechaEtapa4 = signedCalidad.dateStr;
        if (signedCalidad.userStr) responsableEtapa4 = signedCalidad.userStr;
        fuenteEtapa4 = 'Reporte Técnico';
      } else {
        fechaEtapa4 = `Dictamen emitido: ${selectedOp.dictamen || 'EVALUADO'}`;
        fuenteEtapa4 = 'Base de Datos';
      }
      tiempoEtapa4 = recCal?.duracionTexto || 'Auditoría técnica ejecutada (SLA: 1 día)';
    }

    // Stage 5 (EVALUADO Y ENVIADO A FACTORY)
    const recEval = timelineStages.EVALUADO;
    let fechaEtapa5 = recEval?.fechaIngresoFormatted || '— En espera de emisión de dictamen';
    let fechaSalidaEtapa5 = recEval?.fechaSalidaFormatted;
    let responsableEtapa5 = recEval?.responsableIngreso || 'Colfactory ZF / Jefe de Lavandería';
    let tiempoEtapa5 = recEval?.duracionTexto || 'Pendiente de aprobación técnica de Calidad';
    let fuenteEtapa5 = recEval ? 'Motor Automático' : '';
    if (currentStageIndex === 4) {
      fechaEtapa5 = recEval?.fechaIngresoFormatted || 'En espera exclusiva de validación y cierre por Factory';
      tiempoEtapa5 = recEval?.duracionTexto || `${selectedOp.diasHabiles}d (${selectedOp.horasEnProceso}h) en espera de cierre`;
      fuenteEtapa5 = recEval ? 'Motor Automático' : 'En Proceso';
    } else if (currentStageIndex > 4) {
      if (recEval?.fechaIngresoFormatted) {
        fechaEtapa5 = recEval.fechaIngresoFormatted;
        fuenteEtapa5 = 'Motor Automático';
      } else if (logDictamen) {
        fechaEtapa5 = formatColombianDisplayDate(new Date(logDictamen.timestamp));
        responsableEtapa5 = `${logDictamen.usuarioNombre} (${logDictamen.usuarioArea || 'CALIDAD'})`;
        fuenteEtapa5 = 'Auditoría en vivo';
      } else {
        fechaEtapa5 = 'Dictamen evaluado y enviado a Factory';
        fuenteEtapa5 = 'Base de Datos';
      }
      tiempoEtapa5 = recEval?.duracionTexto || 'Control Factory avalado';
    }

    // Stage 6 (FINALIZADO / LIBERACIÓN)
    const recFin = timelineStages.FINALIZADO;
    let fechaEtapa6 = recFin?.fechaIngresoFormatted || '— Pendiente de liberación final';
    let fechaSalidaEtapa6 = recFin?.fechaSalidaFormatted;
    let responsableEtapa6 = recFin?.responsableIngreso || 'Colfactory ZF / Administrador STF';
    let tiempoEtapa6 = recFin?.duracionTexto || 'En espera de liberación por Factory';
    let fuenteEtapa6 = recFin ? 'Motor Automático' : '';
    if (currentStageIndex === 5) {
      if (recFin?.fechaIngresoFormatted) {
        fechaEtapa6 = recFin.fechaIngresoFormatted;
        fuenteEtapa6 = 'Motor Automático';
      } else if (logFinalizado) {
        fechaEtapa6 = formatColombianDisplayDate(new Date(logFinalizado.timestamp));
        responsableEtapa6 = `${logFinalizado.usuarioNombre} (${logFinalizado.usuarioArea || 'COLFACTORY'})`;
        fuenteEtapa6 = 'Auditoría en vivo';
      } else if (signedPrenda) {
        fechaEtapa6 = `${signedPrenda.dateStr} (Prenda Terminada)`;
        if (signedPrenda.userStr) responsableEtapa6 = signedPrenda.userStr;
        fuenteEtapa6 = 'Prenda Terminada';
      } else {
        fechaEtapa6 = `Orden Liberada y Registrada en Base de Datos`;
        fuenteEtapa6 = 'Base de Datos';
      }
      tiempoEtapa6 = selectedTimeline?.leadTimeTotalTexto || recFin?.duracionTexto || `Lead Time total: ${selectedOp.diasHabiles} días hábiles (~${selectedOp.horasEnProceso}h de jornada)`;
    }

    return [
      // ETAPA 1: REGISTRO INICIAL (ATELIER ZF / PLANTA PRINCIPAL)
      {
        id: 'PRE_SOLICITUD' as SectorType,
        index: 0,
        titulo: 'MUESTRA CREADA Y REGISTRADA EN SISTEMA',
        sector: 'ATELIER ZF / PLANTA STF',
        subtitulo: 'Apertura de ficha técnica y fotografía de muestra inicial',
        estado: currentStageIndex >= 0 ? (currentStageIndex === 0 ? 'ACTIVO' : 'COMPLETADO') : 'PENDIENTE',
        fechaIngreso: fechaEtapa1,
        fechaSalida: fechaSalidaEtapa1,
        fechaDisplay: fechaEtapa1,
        fuente: fuenteEtapa1 || 'Base de Datos',
        responsable: responsableEtapa1,
        tiempoArea: tiempoEtapa1,
        tiempoAcumulado: '0 h laborales',
        icono: '⏱️',
        iconBg: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-400/40',
        dotColor: 'bg-blue-500',
        observacion: selectedOp.observacionesOperario || 'Muestra física registrada para monitoreo de lavado, encogimiento y tono.',
        foto: selectedOp.fotoMuestraUrl,
        fotoTitulo: 'Fotografía Muestra Inicial',
        slaTexto: 'Inicio del circuito SLA (3 días hábiles)',
        enAlerta: false
      },

      // ETAPA 2: TRÁNSITO / DESPACHO A LAVANDERÍA
      {
        id: 'SOLICITADO' as SectorType,
        index: 1,
        titulo: 'DESPACHADO A LAVANDERÍA (TRÁNSITO)',
        sector: 'TRÁNSITO / DESPACHO',
        subtitulo: 'Envío de muestra física hacia planta de lavado Colfactory ZF',
        estado: currentStageIndex >= 1 ? (currentStageIndex === 1 ? 'ACTIVO' : 'COMPLETADO') : 'PENDIENTE',
        fechaIngreso: fechaEtapa2,
        fechaSalida: fechaSalidaEtapa2,
        fechaDisplay: fechaEtapa2,
        fuente: fuenteEtapa2,
        responsable: responsableEtapa2,
        tiempoArea: tiempoEtapa2,
        tiempoAcumulado: currentStageIndex === 1 
          ? `${selectedOp.diasHabiles} días hábiles acumulados`
          : (currentStageIndex > 1 ? 'Tránsito completado' : 'Pendiente'),
        icono: '📦',
        iconBg: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-400/40',
        dotColor: 'bg-amber-500',
        observacion: currentStageIndex >= 1 
          ? (selectedOp.observacionesOperario || 'Muestra física despachada y en tránsito hacia lavandería Colfactory ZF.')
          : 'Pendiente de despacho a lavandería.',
        slaTexto: 'SLA de recepción: Menor a 24 horas',
        enAlerta: currentStageIndex === 1 && selectedOp.diasHabiles > 1
      },

      // ETAPA 3: LAVANDERÍA COLFACTORY ZF (MÓDULO TAMBORES)
      {
        id: 'LAVANDERIA' as SectorType,
        index: 2,
        titulo: 'RECEPCIÓN Y CICLO DE LAVADO (COLFACTORY ZF)',
        sector: 'LAVANDERÍA COLFACTORY ZF',
        subtitulo: 'Llamado de OP, ingreso a tambor y ciclo de prueba de lavado',
        estado: currentStageIndex >= 2 ? (currentStageIndex === 2 ? 'ACTIVO' : 'COMPLETADO') : 'PENDIENTE',
        fechaIngreso: fechaEtapa3,
        fechaSalida: fechaSalidaEtapa3,
        fechaDisplay: fechaEtapa3,
        fuente: fuenteEtapa3,
        responsable: responsableEtapa3,
        tiempoArea: tiempoEtapa3,
        tiempoAcumulado: currentStageIndex === 2 
          ? `${selectedOp.diasHabiles} días hábiles transcurridos`
          : (currentStageIndex > 2 ? 'Ciclo lavado completado' : 'Pendiente'),
        icono: '💧',
        iconBg: 'bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-400/40',
        dotColor: 'bg-sky-500',
        observacion: currentStageIndex >= 2 
          ? (selectedOp.observacionesLavanderia || 'Muestra recibida en lavadero para ciclo de desengome, lavado o suavizado.')
          : 'En espera de que personal de Lavandería Colfactory llame la OP e ingrese la muestra a los tambores.',
        slaTexto: 'SLA Lavandería: Máximo 2 días hábiles (24 horas laborales)',
        enAlerta: currentStageIndex === 2 && selectedOp.diasHabiles > 2
      },

      // ETAPA 4: CALIDAD LABORATORIO STF (AUDITORÍA TÉCNICA)
      {
        id: 'CALIDAD' as SectorType,
        index: 3,
        titulo: 'AUDITORÍA TÉCNICA TEXTIL (LABORATORIO CALIDAD STF)',
        sector: 'CALIDAD STF LABORATORIO',
        subtitulo: 'Inspección técnica de encogimiento urdimbre/trama, revirado y tono',
        estado: currentStageIndex >= 3 ? (currentStageIndex === 3 ? 'ACTIVO' : 'COMPLETADO') : 'PENDIENTE',
        fechaIngreso: fechaEtapa4,
        fechaSalida: fechaSalidaEtapa4,
        fechaDisplay: fechaEtapa4,
        fuente: fuenteEtapa4,
        responsable: responsableEtapa4,
        tiempoArea: tiempoEtapa4,
        tiempoAcumulado: currentStageIndex === 3 
          ? `${selectedOp.diasHabiles} días hábiles acumulados`
          : (currentStageIndex > 3 ? 'Auditoría completada' : 'Pendiente'),
        icono: '🔬',
        iconBg: 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-400/40',
        dotColor: 'bg-purple-500',
        observacion: currentStageIndex >= 3 
          ? (selectedOp.observacionesCalidad || 'Muestra lavada en evaluación metrológica y espectro de tono.')
          : 'Pendiente de envío desde lavandería tras terminar el ciclo de centrifugado y secado.',
        foto: selectedOp.fotoCalidadUrl,
        fotoTitulo: 'Fotografía Post-Lavado Calidad',
        slaTexto: 'SLA Laboratorio: Máximo 1 día hábil (12 horas laborales)',
        enAlerta: currentStageIndex === 3 && selectedOp.diasHabiles > 3
      },

      // ETAPA 5: EVALUADO Y ENVIADO (CONTROL EXCLUSIVO FACTORY)
      {
        id: 'EVALUADO' as SectorType,
        index: 4,
        titulo: 'EVALUADO Y ENVIADO A FACTORY (ESPERA CIERRE)',
        sector: 'CONTROL FACTORY ZF',
        subtitulo: 'Dictamen de calidad emitido; en espera exclusiva de revisión y cierre por Factory',
        estado: currentStageIndex >= 4 ? (currentStageIndex === 4 ? 'ACTIVO' : 'COMPLETADO') : 'PENDIENTE',
        fechaIngreso: fechaEtapa5,
        fechaSalida: fechaSalidaEtapa5,
        fechaDisplay: fechaEtapa5,
        fuente: fuenteEtapa5,
        responsable: responsableEtapa5,
        tiempoArea: tiempoEtapa5,
        tiempoAcumulado: currentStageIndex === 4 
          ? `${selectedOp.diasHabiles} días totales en planta`
          : (currentStageIndex > 4 ? 'Dictamen validado' : 'Pendiente'),
        icono: '📋',
        iconBg: 'bg-teal-500/20 text-teal-600 dark:text-teal-400 border-teal-400/40',
        dotColor: 'bg-teal-500',
        observacion: currentStageIndex >= 4 
          ? (selectedOp.observacionesCalidad 
              ? `Dictamen: ${selectedOp.dictamen || 'EVALUADO'} • ${selectedOp.observacionesCalidad}`
              : `Dictamen oficial: ${selectedOp.dictamen || 'EVALUADO'}. Pendiente de confirmación por Factory.`)
          : 'Paso condicionado a que el auditor de Calidad apruebe la muestra e ingrese el dictamen formal.',
        slaTexto: 'Fase de control exclusivo: Solo Factory puede finalizar',
        enAlerta: currentStageIndex === 4 && selectedOp.diasHabiles > 3
      },

      // ETAPA 6: CIERRE Y LIBERACIÓN OFICIAL FINALIZADO
      {
        id: 'FINALIZADO' as SectorType,
        index: 5,
        titulo: 'LIBERACIÓN OFICIAL Y CIERRE DE CIRCUITO',
        sector: 'CALIDAD PLANTA STF (LIBERADA)',
        subtitulo: 'Orden finalizada formalmente, trazabilidad completada y liberación de lote',
        estado: currentStageIndex === 5 ? 'COMPLETADO' : 'PENDIENTE',
        fechaIngreso: fechaEtapa6,
        fechaSalida: fechaSalidaEtapa6,
        fechaDisplay: fechaEtapa6,
        fuente: fuenteEtapa6,
        responsable: responsableEtapa6,
        tiempoArea: tiempoEtapa6,
        tiempoAcumulado: currentStageIndex === 5 
          ? `${selectedOp.diasHabiles} días hábiles (Circuito Cerrado)`
          : 'Pendiente de cierre',
        icono: '✓',
        iconBg: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-400/40',
        dotColor: 'bg-emerald-500',
        observacion: currentStageIndex === 5 
          ? (selectedOp.observacionesPrendaTerminada 
              ? `Prenda Terminada: ${selectedOp.observacionesPrendaTerminada}` 
              : `Orden liberada con veredicto: ${selectedOp.dictamen || 'APROBADO'}. Trazabilidad de 6 etapas completada satisfactoriamente.`)
          : 'La orden culminará su circuito cuando el personal de Factory presione el botón Finalizar.',
        foto: selectedOp.fotoPrendaTerminada1Url || selectedOp.fotoCalidadUrl,
        fotoTitulo: 'Fotografía de Prenda Terminada',
        slaTexto: 'Circuito completado y archivado formalmente',
        enAlerta: false
      }
    ];
  }, [selectedOp, currentStageIndex, opAuditLogs, selectedTimeline]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 select-none pb-12 relative font-sans">
      
      {/* 1. SUB-NAVIGATION BAR */}
      <SubNavTabs
        activeTab="timeline"
        onSelectTab={onNavigateTab}
        totalHistorico={totalHistorico}
        alertCount={inRetrasoCount}
        solicitudes={solicitudes}
      />

      {/* 2. TOP BANNER: LÍNEA DE TIEMPO Y EVALUACIÓN DE PROCESOS */}
      <div className="bg-white dark:bg-[#0c1017] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_25px_rgba(255,255,255,0.05)] space-y-6 text-zinc-950 dark:text-white">
        
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full">
              CONTROL DE TIEMPOS OP • SLA REGULATORIO 3 DÍAS HÁBILES
            </span>
            <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
              MEDICIÓN EN TIEMPO REAL
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-950 dark:text-white brand-title">
            LÍNEA DE TIEMPO Y EVALUACIÓN DE PROCESOS
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Auditoría cronológica verificada de estados, tiempos reales de permanencia en planta y cuellos de botella por OP.
          </p>
        </div>

        {/* 4 Top KPI Cards (100% Calculated Mathematically from Real Live Data) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* 1. Total OPs */}
          <div className="bg-zinc-50 dark:bg-zinc-900/90 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-0.5 shadow-xs">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase">
              <span className="text-zinc-500 dark:text-zinc-400">TOTAL OPS</span>
              <Clock className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
            </div>
            <span className="text-3xl font-black text-zinc-950 dark:text-white font-mono">{totalHistorico}</span>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block font-mono">OPs registradas</span>
          </div>

          {/* 2. Lead Time Promedio Real */}
          <div className="bg-zinc-50 dark:bg-zinc-900/90 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-0.5 shadow-xs">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase">
              <span className="text-amber-600 dark:text-amber-400">LEAD TIME PROM.</span>
              <Clock className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-amber-600 dark:text-amber-400 font-mono">
                {leadTimePromedioDias}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-bold">Días</span>
            </div>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block font-mono">
              ~{leadTimePromedioHoras}h hábiles de ciclo
            </span>
          </div>

          {/* 3. En Retraso (>3D) Real */}
          <div className="bg-zinc-50 dark:bg-zinc-900/90 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-0.5 shadow-xs">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase">
              <span className="text-rose-600 dark:text-rose-400">EN RETRASO (&gt;3D)</span>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <span className="text-3xl font-black text-rose-600 dark:text-rose-400 font-mono">{inRetrasoCount}</span>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block font-mono">Atención prioritaria</span>
          </div>

          {/* 4. SLA (3 Días) Real */}
          <div className="bg-zinc-50 dark:bg-zinc-900/90 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-0.5 shadow-xs">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase">
              <span className="text-emerald-600 dark:text-emerald-400">SLA (3 DÍAS)</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {pctCumplimientoSla}%
            </span>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block font-mono">
              Procesadas dentro de norma
            </span>
          </div>
        </div>

      </div>

      {/* 3. SPLIT VIEW: LEFT (OP SELECTOR LIST) & RIGHT (FULL TIMELINE AUDIT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: SELECCIONAR OP */}
        <div className="lg:col-span-4 bg-white dark:bg-[#0c1017] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_25px_rgba(255,255,255,0.05)] space-y-4 text-zinc-950 dark:text-white">
          
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-950 dark:text-white flex items-center gap-1.5 font-mono">
              <Filter className="w-3.5 h-3.5 text-zinc-400" />
              <span>SELECCIONAR OP ({filteredOps.length})</span>
            </h3>
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por OP, tela o referencia..."
              className="w-full bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-300 dark:border-zinc-800 rounded-2xl pl-9 pr-3 py-2.5 text-xs text-zinc-950 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-amber-500 transition"
            />
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3" />
          </div>

          {/* Filter Pills with verified real dynamic counters */}
          <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono font-bold select-none">
            <button
              type="button"
              onClick={() => setFilterMode('TODAS')}
              className={`py-1.5 px-2 rounded-xl transition cursor-pointer text-center ${
                filterMode === 'TODAS'
                  ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
              }`}
            >
              Todas ({totalHistorico})
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('RETRASO')}
              className={`py-1.5 px-2 rounded-xl transition cursor-pointer text-center ${
                filterMode === 'RETRASO'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-900 text-rose-600 dark:text-rose-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
              }`}
            >
              Retraso ({inRetrasoCount})
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('PROCESO')}
              className={`py-1.5 px-2 rounded-xl transition cursor-pointer text-center ${
                filterMode === 'PROCESO'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-900 text-amber-600 dark:text-amber-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
              }`}
            >
              En Proceso ({enProcesoCount})
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('FINALIZADAS')}
              className={`py-1.5 px-2 rounded-xl transition cursor-pointer text-center ${
                filterMode === 'FINALIZADAS'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
              }`}
            >
              Finalizadas ({finalizadasCount})
            </button>
          </div>

          {/* Scrollable OP Items List with real timestamps and status */}
          <div className="space-y-2.5 max-h-[620px] overflow-y-auto custom-scroll pr-1">
            {filteredOps.map((op) => {
              const isSelected = selectedOp?.id === op.id;

              return (
                <div
                  key={op.id}
                  onClick={() => setSelectedOpId(op.id)}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                    isSelected
                      ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border-zinc-950 dark:border-white shadow-md'
                      : 'bg-zinc-50 dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 text-zinc-900 dark:text-zinc-100'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className={`font-mono font-black text-xs ${isSelected ? 'text-white dark:text-zinc-950' : 'text-zinc-950 dark:text-white'}`}>
                      OP #{op.op}
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase font-mono ${
                      op.estado === 'FINALIZADO'
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        : op.estado === 'EVALUADO'
                        ? 'bg-teal-500/20 text-teal-600 dark:text-teal-400'
                        : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                    }`}>
                      {op.estado === 'EVALUADO' ? 'EVALUADO' : op.estado}
                    </span>
                  </div>

                  <div className="text-xs font-bold mt-1 truncate">
                    {op.tela} <span className="opacity-70">({op.color})</span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] opacity-70 mt-2 font-mono">
                    <span>📅 {formatColombianDisplayDate(op.fechaCreacion)}</span>
                    <span>🧶 {op.rollos} rls</span>
                  </div>

                  <div className="flex items-center justify-between text-[10.5px] font-bold mt-1 font-mono">
                    <span>⏱️ {op.diasHabiles}d ({op.horasEnProceso}h)</span>
                    {op.tieneRetraso && op.estado !== 'FINALIZADO' && (
                      <span className="text-rose-500 text-[9.5px]">⚠️ Retraso</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* RIGHT COLUMN: SELECTED OP TIMELINE & REAL-TIME AUDIT */}
        <div className="lg:col-span-8 space-y-6">
          
          {selectedOp ? (
            <>
              {/* Header Card of Selected OP */}
              <div className="bg-white dark:bg-[#0c1017] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_25px_rgba(255,255,255,0.05)] space-y-5 text-zinc-950 dark:text-white">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 px-3 py-1 rounded-xl font-black font-mono text-xs shadow-sm">
                        OP #{selectedOp.op}
                      </span>
                      <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 font-bold">
                        Ref: {selectedOp.referencia || 'S/R'}
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-black text-zinc-950 dark:text-white font-mono">
                      {selectedOp.tela} <span className="text-zinc-500 dark:text-zinc-400">({selectedOp.color})</span>
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => onViewDetail(selectedOp)}
                    className="px-4 py-2 bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md self-start sm:self-auto"
                  >
                    <span>Ver Ficha Completa</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 4 Summary Cards (Direct Real Data from this OP) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-zinc-50 dark:bg-zinc-900/90 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-0.5 font-mono shadow-xs">
                    <span className="text-[9.5px] font-sans text-zinc-500 dark:text-zinc-400 font-bold block uppercase">1. CREACIÓN</span>
                    <span className="text-xs font-bold text-zinc-950 dark:text-white block truncate">
                      {formatColombianDisplayDate(selectedOp.fechaCreacion)}
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate block">Por: {selectedOp.inspector || 'OPERARIO STF'}</span>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-900/90 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-0.5 font-mono shadow-xs">
                    <span className="text-[9.5px] font-sans text-zinc-500 dark:text-zinc-400 font-bold block uppercase">2. TIEMPO EN PLANTA</span>
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block">
                      {selectedOp.diasHabiles} Días
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block">~{selectedOp.horasEnProceso}h laborales</span>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-900/90 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-0.5 font-mono shadow-xs">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold block uppercase">3. DÍAS DE RETRASO SLA</span>
                    <span className={`text-xs font-mono font-black block ${
                      selectedOp.tieneRetraso && selectedOp.estado !== 'FINALIZADO' 
                        ? 'text-rose-600 dark:text-rose-400' 
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {selectedOp.tieneRetraso && selectedOp.estado !== 'FINALIZADO'
                        ? `+${Math.max(1, selectedOp.diasHabiles - 3)} Días Retraso` 
                        : (selectedOp.estado === 'FINALIZADO' ? 'Liberada / Cumplido' : 'A Tiempo (≤3d)')}
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      {selectedOp.tieneRetraso && selectedOp.estado !== 'FINALIZADO'
                        ? `Excede límite reglamentario (+${selectedOp.horasEnProceso}h)`
                        : 'Cumple SLA reglamentario de 3 días'}
                    </span>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-900/90 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-0.5 shadow-xs">
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block uppercase font-mono">ROLLOS PROCESADOS</span>
                    <span className="text-xs font-mono font-black text-zinc-950 dark:text-white block">
                      {selectedOp.rollos} Rollos
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">Estado: {selectedOp.estado}</span>
                  </div>
                </div>

              </div>

              {/* WIDGET: MEDICIÓN AUTOMÁTICA DE TIEMPOS POR LUGAR DE TRABAJO */}
              {workAreaTimes && (
                <div className="bg-white dark:bg-[#0c1017] border-2 border-amber-500/40 dark:border-amber-500/30 rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_25px_rgba(255,255,255,0.05)] space-y-4 text-zinc-950 dark:text-white">
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-sm font-bold text-amber-600 dark:text-amber-400">
                        ⏱️
                      </div>
                      <div>
                        <h3 className="text-xs sm:text-sm font-black text-zinc-950 dark:text-white font-mono uppercase tracking-wide flex items-center gap-2 flex-wrap">
                          <span>MEDICIÓN AUTOMÁTICA DE TIEMPOS POR LUGAR DE TRABAJO</span>
                          <span className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[9px] px-2 py-0.5 rounded-full font-bold">
                            EN VIVO
                          </span>
                        </h3>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          Registro automatizado de fechas, horas de ingreso, salida y permanencia por estación de trabajo.
                        </p>
                      </div>
                    </div>

                    {selectedTimeline?.leadTimeTotalTexto && (
                      <div className="bg-zinc-50 dark:bg-zinc-900 border border-amber-500/40 px-3 py-1.5 rounded-xl shadow-xs self-start sm:self-auto font-mono text-left sm:text-right">
                        <span className="text-[9px] text-zinc-500 dark:text-zinc-400 block uppercase font-bold">LEAD TIME TOTAL</span>
                        <span className="text-xs font-black text-amber-600 dark:text-amber-400 block">
                          {selectedTimeline.leadTimeTotalTexto}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 4 Core Work Area Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    
                    {/* 1. TRÁNSITO / DESPACHO */}
                    <div className={`p-4 rounded-2xl border transition ${
                      workAreaTimes.transito.estado === 'EN PROCESO'
                        ? 'bg-amber-500/10 border-amber-500/50 shadow-md ring-1 ring-amber-500/20'
                        : workAreaTimes.transito.estado === 'COMPLETADO'
                        ? 'bg-zinc-50 dark:bg-zinc-900/80 border-emerald-500/30'
                        : 'bg-zinc-100/50 dark:bg-zinc-950/30 border-dashed border-zinc-300 dark:border-zinc-800 opacity-60'
                    }`}>
                      <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <span>📦</span>
                          <span className="text-zinc-950 dark:text-white font-mono text-[11px]">1. TRÁNSITO</span>
                        </div>
                        <span className={`text-[9px] font-mono font-black px-2 py-0.5 rounded-full uppercase ${
                          workAreaTimes.transito.estado === 'COMPLETADO'
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            : workAreaTimes.transito.estado === 'EN PROCESO'
                            ? 'bg-amber-500 text-black animate-pulse'
                            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'
                        }`}>
                          {workAreaTimes.transito.estado}
                        </span>
                      </div>

                      <div className="space-y-1.5 pt-2 text-[10.5px] font-mono">
                        <div>
                          <span className="text-[9px] text-zinc-500 dark:text-zinc-400 uppercase font-sans font-bold block">▶ ENTRADA / DESPACHO</span>
                          <span className="text-zinc-900 dark:text-zinc-100 font-bold block truncate">{workAreaTimes.transito.ingreso}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-zinc-500 dark:text-zinc-400 uppercase font-sans font-bold block">⏹ SALIDA / RECEPCIÓN</span>
                          <span className="text-zinc-900 dark:text-zinc-100 font-bold block truncate">{workAreaTimes.transito.salida}</span>
                        </div>
                        <div className="pt-1 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                          <span className="text-[9px] text-zinc-500 dark:text-zinc-400 font-sans font-bold">PERMANENCIA:</span>
                          <span className="text-amber-600 dark:text-amber-400 font-black">{workAreaTimes.transito.tiempo}</span>
                        </div>
                        <div className="text-[9.5px] text-zinc-500 dark:text-zinc-400 truncate">
                          Por: {workAreaTimes.transito.resp}
                        </div>
                      </div>
                    </div>

                    {/* 2. LAVANDERÍA COLFACTORY */}
                    <div className={`p-4 rounded-2xl border transition ${
                      workAreaTimes.lavanderia.estado === 'EN PROCESO'
                        ? 'bg-amber-500/10 border-amber-500/50 shadow-md ring-1 ring-amber-500/20'
                        : workAreaTimes.lavanderia.estado === 'COMPLETADO'
                        ? 'bg-zinc-50 dark:bg-zinc-900/80 border-emerald-500/30'
                        : 'bg-zinc-100/50 dark:bg-zinc-950/30 border-dashed border-zinc-300 dark:border-zinc-800 opacity-60'
                    }`}>
                      <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <span>💧</span>
                          <span className="text-zinc-950 dark:text-white font-mono text-[11px]">2. LAVANDERÍA</span>
                        </div>
                        <span className={`text-[9px] font-mono font-black px-2 py-0.5 rounded-full uppercase ${
                          workAreaTimes.lavanderia.estado === 'COMPLETADO'
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            : workAreaTimes.lavanderia.estado === 'EN PROCESO'
                            ? 'bg-amber-500 text-black animate-pulse'
                            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'
                        }`}>
                          {workAreaTimes.lavanderia.estado}
                        </span>
                      </div>

                      <div className="space-y-1.5 pt-2 text-[10.5px] font-mono">
                        <div>
                          <span className="text-[9px] text-zinc-500 dark:text-zinc-400 uppercase font-sans font-bold block">▶ ENTRADA / TAMBOR</span>
                          <span className="text-zinc-900 dark:text-zinc-100 font-bold block truncate">{workAreaTimes.lavanderia.ingreso}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-zinc-500 dark:text-zinc-400 uppercase font-sans font-bold block">⏹ SALIDA / ENVÍO</span>
                          <span className="text-zinc-900 dark:text-zinc-100 font-bold block truncate">{workAreaTimes.lavanderia.salida}</span>
                        </div>
                        <div className="pt-1 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                          <span className="text-[9px] text-zinc-500 dark:text-zinc-400 font-sans font-bold">PERMANENCIA:</span>
                          <span className="text-amber-600 dark:text-amber-400 font-black">{workAreaTimes.lavanderia.tiempo}</span>
                        </div>
                        <div className="text-[9.5px] text-zinc-500 dark:text-zinc-400 truncate">
                          Por: {workAreaTimes.lavanderia.resp}
                        </div>
                      </div>
                    </div>

                    {/* 3. CALIDAD LABORATORIO */}
                    <div className={`p-4 rounded-2xl border transition ${
                      workAreaTimes.calidad.estado === 'EN PROCESO'
                        ? 'bg-amber-500/10 border-amber-500/50 shadow-md ring-1 ring-amber-500/20'
                        : workAreaTimes.calidad.estado === 'COMPLETADO'
                        ? 'bg-zinc-50 dark:bg-zinc-900/80 border-emerald-500/30'
                        : 'bg-zinc-100/50 dark:bg-zinc-950/30 border-dashed border-zinc-300 dark:border-zinc-800 opacity-60'
                    }`}>
                      <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <span>🔬</span>
                          <span className="text-zinc-950 dark:text-white font-mono text-[11px]">3. CALIDAD LAB</span>
                        </div>
                        <span className={`text-[9px] font-mono font-black px-2 py-0.5 rounded-full uppercase ${
                          workAreaTimes.calidad.estado === 'COMPLETADO'
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            : workAreaTimes.calidad.estado === 'EN PROCESO'
                            ? 'bg-amber-500 text-black animate-pulse'
                            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'
                        }`}>
                          {workAreaTimes.calidad.estado}
                        </span>
                      </div>

                      <div className="space-y-1.5 pt-2 text-[10.5px] font-mono">
                        <div>
                          <span className="text-[9px] text-zinc-500 dark:text-zinc-400 uppercase font-sans font-bold block">▶ ENTRADA / INSPECCIÓN</span>
                          <span className="text-zinc-900 dark:text-zinc-100 font-bold block truncate">{workAreaTimes.calidad.ingreso}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-zinc-500 dark:text-zinc-400 uppercase font-sans font-bold block">⏹ SALIDA / DICTAMEN</span>
                          <span className="text-zinc-900 dark:text-zinc-100 font-bold block truncate">{workAreaTimes.calidad.salida}</span>
                        </div>
                        <div className="pt-1 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                          <span className="text-[9px] text-zinc-500 dark:text-zinc-400 font-sans font-bold">PERMANENCIA:</span>
                          <span className="text-amber-600 dark:text-amber-400 font-black">{workAreaTimes.calidad.tiempo}</span>
                        </div>
                        <div className="text-[9.5px] text-zinc-500 dark:text-zinc-400 truncate">
                          Por: {workAreaTimes.calidad.resp}
                        </div>
                      </div>
                    </div>

                    {/* 4. FACTORY & LIBERACIÓN */}
                    <div className={`p-4 rounded-2xl border transition ${
                      workAreaTimes.factory.estado === 'EN PROCESO'
                        ? 'bg-amber-500/10 border-amber-500/50 shadow-md ring-1 ring-amber-500/20'
                        : workAreaTimes.factory.estado === 'COMPLETADO'
                        ? 'bg-zinc-50 dark:bg-zinc-900/80 border-emerald-500/30'
                        : 'bg-zinc-100/50 dark:bg-zinc-950/30 border-dashed border-zinc-300 dark:border-zinc-800 opacity-60'
                    }`}>
                      <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <span>🛡️</span>
                          <span className="text-zinc-950 dark:text-white font-mono text-[11px]">4. FACTORY / LIBERADA</span>
                        </div>
                        <span className={`text-[9px] font-mono font-black px-2 py-0.5 rounded-full uppercase ${
                          workAreaTimes.factory.estado === 'COMPLETADO'
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            : workAreaTimes.factory.estado === 'EN PROCESO'
                            ? 'bg-amber-500 text-black animate-pulse'
                            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'
                        }`}>
                          {workAreaTimes.factory.estado}
                        </span>
                      </div>

                      <div className="space-y-1.5 pt-2 text-[10.5px] font-mono">
                        <div>
                          <span className="text-[9px] text-zinc-500 dark:text-zinc-400 uppercase font-sans font-bold block">▶ ENTRADA / EVALUADO</span>
                          <span className="text-zinc-900 dark:text-zinc-100 font-bold block truncate">{workAreaTimes.factory.ingreso}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-zinc-500 dark:text-zinc-400 uppercase font-sans font-bold block">⏹ CIERRE OFICIAL</span>
                          <span className="text-zinc-900 dark:text-zinc-100 font-bold block truncate">{workAreaTimes.factory.salida}</span>
                        </div>
                        <div className="pt-1 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                          <span className="text-[9px] text-zinc-500 dark:text-zinc-400 font-sans font-bold">LEAD TIME:</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-black">{workAreaTimes.factory.tiempo}</span>
                        </div>
                        <div className="text-[9.5px] text-zinc-500 dark:text-zinc-400 truncate">
                          Por: {workAreaTimes.factory.resp}
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* TIMELINE AUDIT CONTAINER */}
              <div className="bg-white dark:bg-[#0c1017] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_25px_rgba(255,255,255,0.05)] space-y-6 text-zinc-950 dark:text-white">
                
                {/* Header & Legend */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-black text-zinc-950 dark:text-white brand-title">
                        LÍNEA DE TIEMPO DE PROCESOS DE LA OP #{selectedOp.op}
                      </h3>
                      <span className="text-[10px] bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 px-2 py-0.5 rounded font-bold font-mono">
                        {currentStageIndex === 5 ? '6 de 6 Etapas (100%)' : `${currentStageIndex + 1} de 6 Etapas`}
                      </span>
                      <span className="text-[10px] bg-amber-500 text-black px-2.5 py-0.5 rounded font-black font-mono">
                        {selectedOp.rollos} Rollos
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                      Auditoría cronológica de creación, tiempo real en planta y trazabilidad completa por etapas.
                    </p>
                  </div>

                  {/* Legend dots */}
                  <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Completado</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> En Proceso</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-zinc-400"></span> Pendiente</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Retraso</span>
                  </div>
                </div>

                {/* 3 Metrics Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-zinc-50 dark:bg-zinc-900/90 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-0.5 shadow-xs">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold block uppercase">1. FECHA DE CREACIÓN</span>
                    <span className="text-xs font-mono font-black text-zinc-950 dark:text-white block">
                      {formatColombianDisplayDate(selectedOp.fechaCreacion)}
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">Inspector: {selectedOp.inspector || 'OPERARIO STF'}</span>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-900/90 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-0.5 shadow-xs">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold block uppercase">2. ETAPAS RECORRIDAS</span>
                    <span className="text-xs font-mono font-black text-amber-600 dark:text-amber-400 block font-mono">
                      {currentStageIndex === 5 ? '6 de 6 Etapas Completadas' : `${currentStageIndex + 1} de 6 Etapas en Curso`}
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">Sector actual: {selectedOp.areaActual || selectedOp.estado}</span>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-900/90 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-0.5 shadow-xs">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold block uppercase">3. EVALUACIÓN SLA GENERAL</span>
                    <span className={`text-xs font-mono font-black block ${
                      selectedOp.tieneRetraso && selectedOp.estado !== 'FINALIZADO' 
                        ? 'text-rose-600 dark:text-rose-400' 
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {selectedOp.diasHabiles} días hábiles ({selectedOp.horasEnProceso}h) {selectedOp.tieneRetraso && selectedOp.estado !== 'FINALIZADO' ? '(Con Retraso)' : '(A Tiempo)'}
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">Jornada oficial: Lunes a Sábado (6am a 6pm)</span>
                  </div>
                </div>

                {/* CHRONOLOGICAL EVENTS LIST (THE 6 REAL PRODUCTION STAGES) */}
                <div className="space-y-4 pt-2">
                  {stages.map((stg) => {
                    const isPending = stg.estado === 'PENDIENTE';
                    const isActive = stg.estado === 'ACTIVO';
                    const isCompleted = stg.estado === 'COMPLETADO';

                    return (
                      <div 
                        key={stg.id}
                        className={`rounded-2xl p-4.5 space-y-2.5 border transition ${
                          isActive
                            ? 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/60 shadow-md ring-1 ring-amber-500/20'
                            : isCompleted
                            ? 'bg-zinc-50 dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800'
                            : 'bg-zinc-100/60 dark:bg-zinc-950/40 border-dashed border-zinc-300 dark:border-zinc-800 opacity-60'
                        }`}
                      >
                        {/* Title Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs shrink-0 ${stg.iconBg}`}>
                              {stg.icono}
                            </div>
                            <span className="text-xs font-black uppercase tracking-wide text-zinc-950 dark:text-white">
                              {stg.titulo}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase ${
                              isActive
                                ? 'bg-amber-500 text-black animate-pulse'
                                : isCompleted
                                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                            }`}>
                              {isActive ? '⚡ EN PROCESO (ACTUAL)' : isCompleted ? '✓ COMPLETADO' : '⏳ PENDIENTE'}
                            </span>

                            {stg.fuente && (
                              <span className={`text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                                stg.fuente === 'Auditoría en vivo'
                                  ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
                                  : stg.fuente === 'En Proceso'
                                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700'
                              }`}>
                                {stg.fuente}
                              </span>
                            )}

                            <span className="text-[11px] font-mono text-zinc-700 dark:text-zinc-300 flex items-center gap-1 font-semibold">
                              <Calendar className="w-3 h-3 text-amber-500 shrink-0" />
                              {stg.fechaDisplay}
                            </span>
                          </div>
                        </div>

                        {/* Telemetría Automática de Tiempos en la Estación */}
                        <div className="bg-zinc-100/80 dark:bg-zinc-950/80 rounded-xl p-3 border border-zinc-200 dark:border-zinc-800 space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10.5px] font-mono">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="text-emerald-600 dark:text-emerald-400 font-black">▶</span>
                              <span className="text-zinc-500 dark:text-zinc-400 font-sans font-bold text-[9.5px] uppercase">ENTRADA:</span>
                              <span className="text-zinc-900 dark:text-zinc-100 font-bold truncate">
                                {stg.fechaIngreso || stg.fechaDisplay}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 truncate">
                              <span className="text-rose-500 font-black">⏹</span>
                              <span className="text-zinc-500 dark:text-zinc-400 font-sans font-bold text-[9.5px] uppercase">SALIDA / ESTADO:</span>
                              <span className="text-zinc-900 dark:text-zinc-100 font-bold truncate">
                                {stg.fechaSalida || (isActive ? 'En proceso en esta estación' : isCompleted ? 'Completado' : 'Pendiente de inicio')}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pt-1.5 border-t border-zinc-200 dark:border-zinc-800/80 text-[10.5px]">
                            <div className="flex items-center gap-1.5">
                              <span className="text-zinc-500 dark:text-zinc-400 font-sans font-bold text-[9.5px] uppercase">PERMANENCIA:</span>
                              <span className={`px-2 py-0.5 rounded font-black font-mono text-[10px] ${
                                stg.enAlerta
                                  ? 'bg-rose-500 text-white'
                                  : isActive
                                  ? 'bg-amber-500 text-black'
                                  : isCompleted
                                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                  : 'text-zinc-400'
                              }`}>
                                ● {stg.tiempoArea}
                              </span>
                            </div>

                            <span className="text-zinc-500 dark:text-zinc-400 font-mono text-[9.5px]">
                              {stg.tiempoAcumulado}
                            </span>
                          </div>
                        </div>

                        {/* Meta Info */}
                        <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 pt-1 border-t border-zinc-200 dark:border-zinc-800">
                          <div>SECTOR: <strong className="text-zinc-900 dark:text-zinc-100">{stg.sector}</strong></div>
                          <div>RESPONSABLE: <strong className="text-zinc-900 dark:text-zinc-100">{stg.responsable}</strong></div>
                        </div>

                        {/* Real Observation from Database */}
                        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-700 dark:text-zinc-300">
                          "{stg.observacion}"
                        </div>

                        {/* Photo Attachment if Present */}
                        {stg.foto && (
                          <div className="pt-1 flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                setZoomedPhotoUrl(stg.foto || null);
                                setZoomedPhotoTitle(stg.fotoTitulo || 'Evidencia Fotográfica');
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-200 transition cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-amber-500" />
                              <span>Ver {stg.fotoTitulo}</span>
                            </button>
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                              Evidencia oficial vinculada a Google Drive
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* BITÁCORA FORENSE AUTOMÁTICA DE MOVIMIENTOS */}
                {selectedTimeline?.historial && selectedTimeline.historial.length > 0 && (
                  <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-amber-500" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-zinc-950 dark:text-white font-mono">
                          BITÁCORA DE MOVIMIENTOS AUTOMÁTICOS ({selectedTimeline.historial.length})
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                        Registrado en hoja TRAZABILIDAD_TIEMPOS
                      </span>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scroll pr-1">
                      {selectedTimeline.historial.slice().reverse().map((ev) => (
                        <div 
                          key={ev.id}
                          className="bg-zinc-50 dark:bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-[10.5px] font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-1.5"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-zinc-500 dark:text-zinc-400">📅 {ev.fechaFormatted}</span>
                            <span className="bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-2 py-0.5 rounded font-bold">
                              {ev.deEstado} ➔ {ev.aEstado}
                            </span>
                            <span className="text-zinc-600 dark:text-zinc-300">👤 {ev.usuario}</span>
                          </div>

                          {ev.tiempoEnEtapaPrevia && (
                            <div className="text-amber-600 dark:text-amber-400 font-bold shrink-0">
                              ⏱️ Permanencia previa: {ev.tiempoEnEtapaPrevia}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-[#0c1017] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-12 text-center text-zinc-500 dark:text-zinc-400 text-xs shadow-xl">
              Seleccione una OP en la lista izquierda para evaluar su línea de tiempo.
            </div>
          )}

        </div>

      </div>

      {/* 4. MODAL DE ZOOM DE FOTOGRAFÍA */}
      {zoomedPhotoUrl && (
        <div 
          onClick={() => setZoomedPhotoUrl(null)}
          className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl w-full max-h-[88vh] flex flex-col items-center bg-zinc-950 p-4 rounded-3xl border border-zinc-800 shadow-2xl"
          >
            <button 
              type="button"
              onClick={() => setZoomedPhotoUrl(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={zoomedPhotoUrl} 
              alt={zoomedPhotoTitle}
              referrerPolicy="no-referrer"
              className="max-h-[75vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
            />
            {zoomedPhotoTitle && (
              <span className="mt-3 text-xs font-mono font-bold text-zinc-300 bg-zinc-900 px-4 py-1.5 rounded-full border border-zinc-800">
                {zoomedPhotoTitle} • OP #{selectedOp?.op}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 5. FLOATING QUICK SCROLL PILL */}
      <FloatingScrollPill totalOpsCount={totalHistorico} />

    </div>
  );
};
