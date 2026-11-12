import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { SolicitudColcha, SectorType } from '../types';
import { UsuarioSTF } from './authService';
import { parseColombianDate } from './slaCalculator';
import { getAdminParameters } from './adminParametersService';

export interface ComiteReportFilterOptions {
  timeRange: '7D' | '15D' | '30D' | 'CUSTOM' | 'ALL';
  startDate?: string;
  endDate?: string;
  stageFilter: 'ALL' | SectorType;
  dictamenFilter: 'ALL' | 'APROBADO' | 'APROBADO_EN_GAMA' | 'RECHAZADO' | 'EN_PROCESO';
}

export interface ComiteMetrics {
  totalOps: number;
  totalMetros: number;
  totalRollos: number;
  aprobados: number;
  aprobadosEnGama: number;
  rechazados: number;
  enProceso: number;
  tasaAprobacion: number;
  // SLA & Tiempos Reales
  opsATiempo: number;
  opsConRetraso: number;
  pctCumplimientoSla: number;
  pctOtif: number;
  leadTimePromedioDias: number;
  // Distribución en 6 Etapas
  distribucion: {
    preSolicitud: { count: number; metros: number; pct: number };
    solicitados: { count: number; metros: number; pct: number };
    lavanderia: { count: number; metros: number; pct: number };
    calidad: { count: number; metros: number; pct: number };
    evaluado: { count: number; metros: number; pct: number };
    finalizados: { count: number; metros: number; pct: number };
  };
  // Top Telas Auditadas
  topTelas: { tela: string; count: number; metros: number; pct: number }[];
  // Top Inspectores
  topInspectores: { inspector: string; count: number; aprobadas: number; pct: number }[];
}

/**
 * Filter solicitudes based on Comite criteria with robust date parsing
 */
export function filterSolicitudesForComite(
  solicitudes: SolicitudColcha[],
  options: ComiteReportFilterOptions
): SolicitudColcha[] {
  const now = new Date();
  
  return solicitudes.filter(item => {
    // 1. Time range filter
    if (options.timeRange !== 'ALL' && item.fechaCreacion) {
      const itemDate = parseColombianDate(item.fechaCreacion);

      if (itemDate && !isNaN(itemDate.getTime()) && itemDate.getTime() > 0) {
        if (options.timeRange === '7D') {
          const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 7 || diffDays < -1) return false;
        } else if (options.timeRange === '15D') {
          const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 15 || diffDays < -1) return false;
        } else if (options.timeRange === '30D') {
          const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 30 || diffDays < -1) return false;
        } else if (options.timeRange === 'CUSTOM') {
          if (options.startDate) {
            const start = new Date(options.startDate);
            start.setHours(0, 0, 0, 0);
            if (itemDate < start) return false;
          }
          if (options.endDate) {
            const end = new Date(options.endDate);
            end.setHours(23, 59, 59, 999);
            if (itemDate > end) return false;
          }
        }
      }
    }

    // 2. Stage / Location filter
    if (options.stageFilter !== 'ALL') {
      if (item.estado !== options.stageFilter) return false;
    }

    // 3. Dictamen filter
    if (options.dictamenFilter === 'APROBADO') {
      if (item.dictamen !== 'APROBADO' && item.dictamen !== 'APROBADO EN GAMA' && item.estado !== 'FINALIZADO') return false;
    } else if (options.dictamenFilter === 'APROBADO_EN_GAMA') {
      if (item.dictamen !== 'APROBADO EN GAMA') return false;
    } else if (options.dictamenFilter === 'RECHAZADO') {
      const dictUpper = (item.dictamen || '').toUpperCase();
      const obsUpper = `${item.observacionesCalidad || ''} ${item.observacionesOperario || ''}`.toUpperCase();
      if (dictUpper !== 'RECHAZADO' && !obsUpper.includes('RECHAZ')) return false;
    } else if (options.dictamenFilter === 'EN_PROCESO') {
      if (item.estado === 'FINALIZADO') return false;
    }

    return true;
  });
}

/**
 * Calculate comprehensive summary metrics for the executive committee report with 100% real database metrics
 */
export function calculateComiteMetrics(solicitudes: SolicitudColcha[]): ComiteMetrics {
  const totalOps = solicitudes.length;
  let totalMetros = 0;
  let totalRollos = 0;
  let aprobados = 0;
  let aprobadosEnGama = 0;
  let rechazados = 0;
  let enProceso = 0;

  let opsATiempo = 0;
  let opsConRetraso = 0;
  let totalDiasLeadTime = 0;

  let countPreSol = 0;
  let metrosPreSol = 0;
  let countSol = 0;
  let metrosSol = 0;
  let countLav = 0;
  let metrosLav = 0;
  let countCal = 0;
  let metrosCal = 0;
  let countEval = 0;
  let metrosEval = 0;
  let countFin = 0;
  let metrosFin = 0;

  const telasMap = new Map<string, { count: number; metros: number }>();
  const inspectoresMap = new Map<string, { count: number; aprobadas: number }>();

  solicitudes.forEach(item => {
    const rollos = Number(item.rollos) || 1;
    const metros = rollos * 85;
    totalRollos += rollos;
    totalMetros += metros;

    // SLA tracking real
    if (item.tieneRetraso && item.estado !== 'FINALIZADO') {
      opsConRetraso++;
    } else {
      opsATiempo++;
    }
    totalDiasLeadTime += Math.max(1, item.diasHabiles || 1);

    // Dictamen real con retrocompatibilidad
    const dict = (item.dictamen || '').toUpperCase();
    const obs = `${item.observacionesCalidad || ''} ${item.observacionesOperario || ''}`.toUpperCase();
    const isRechazo = dict.includes('RECHAZ') || obs.includes('RECHAZ');

    if (dict === 'APROBADO EN GAMA') {
      aprobadosEnGama++;
      aprobados++;
    } else if (dict === 'APROBADO') {
      aprobados++;
    } else if (isRechazo) {
      rechazados++;
    } else if (item.estado === 'FINALIZADO') {
      aprobados++;
    } else {
      enProceso++;
    }

    // Fases Oficiales
    if (item.estado === 'PRE_SOLICITUD') {
      countPreSol++;
      metrosPreSol += metros;
    } else if (item.estado === 'SOLICITADO') {
      countSol++;
      metrosSol += metros;
    } else if (item.estado === 'LAVANDERIA') {
      countLav++;
      metrosLav += metros;
    } else if (item.estado === 'CALIDAD') {
      countCal++;
      metrosCal += metros;
    } else if (item.estado === 'EVALUADO') {
      countEval++;
      metrosEval += metros;
    } else if (item.estado === 'FINALIZADO') {
      countFin++;
      metrosFin += metros;
    }

    // Agrupación de Telas
    const telaKey = (item.tela || 'SIN ESPECIFICAR').trim().toUpperCase();
    const currentTela = telasMap.get(telaKey) || { count: 0, metros: 0 };
    currentTela.count++;
    currentTela.metros += metros;
    telasMap.set(telaKey, currentTela);

    // Agrupación de Inspectores
    const inspectorKey = (item.inspector || 'INSPECTOR GENERAL').trim().toUpperCase();
    const currentIns = inspectoresMap.get(inspectorKey) || { count: 0, aprobadas: 0 };
    currentIns.count++;
    if (item.dictamen === 'APROBADO' || item.dictamen === 'APROBADO EN GAMA' || item.estado === 'FINALIZADO') {
      currentIns.aprobadas++;
    }
    inspectoresMap.set(inspectorKey, currentIns);
  });

  const totalDecided = aprobados + rechazados;
  const tasaAprobacion = totalDecided > 0 
    ? Math.round((aprobados / totalDecided) * 1000) / 10 
    : (enProceso > 0 ? 100 : 0);

  const pctCumplimientoSla = totalOps > 0
    ? Math.round((opsATiempo / totalOps) * 1000) / 10
    : 100;

  const pctOtif = Math.round(((pctCumplimientoSla / 100) * (tasaAprobacion / 100)) * 1000) / 10;
  const leadTimePromedioDias = totalOps > 0
    ? Math.round((totalDiasLeadTime / totalOps) * 10) / 10
    : 1.5;

  // Top 5 Telas
  const topTelas = Array.from(telasMap.entries())
    .map(([tela, val]) => ({
      tela,
      count: val.count,
      metros: val.metros,
      pct: totalOps > 0 ? Math.round((val.count / totalOps) * 1000) / 10 : 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Top 5 Inspectores
  const topInspectores = Array.from(inspectoresMap.entries())
    .map(([inspector, val]) => ({
      inspector,
      count: val.count,
      aprobadas: val.aprobadas,
      pct: val.count > 0 ? Math.round((val.aprobadas / val.count) * 1000) / 10 : 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalOps,
    totalMetros,
    totalRollos,
    aprobados,
    aprobadosEnGama,
    rechazados,
    enProceso,
    tasaAprobacion,
    opsATiempo,
    opsConRetraso,
    pctCumplimientoSla,
    pctOtif,
    leadTimePromedioDias,
    distribucion: {
      preSolicitud: {
        count: countPreSol,
        metros: metrosPreSol,
        pct: totalOps > 0 ? Math.round((countPreSol / totalOps) * 1000) / 10 : 0
      },
      solicitados: {
        count: countSol,
        metros: metrosSol,
        pct: totalOps > 0 ? Math.round((countSol / totalOps) * 1000) / 10 : 0
      },
      lavanderia: {
        count: countLav,
        metros: metrosLav,
        pct: totalOps > 0 ? Math.round((countLav / totalOps) * 1000) / 10 : 0
      },
      calidad: {
        count: countCal,
        metros: metrosCal,
        pct: totalOps > 0 ? Math.round((countCal / totalOps) * 1000) / 10 : 0
      },
      evaluado: {
        count: countEval,
        metros: metrosEval,
        pct: totalOps > 0 ? Math.round((countEval / totalOps) * 1000) / 10 : 0
      },
      finalizados: {
        count: countFin,
        metros: metrosFin,
        pct: totalOps > 0 ? Math.round((countFin / totalOps) * 1000) / 10 : 0
      }
    },
    topTelas,
    topInspectores
  };
}

/**
 * GENERATE EXACT PDF MATCHING USER IMAGE 5
 */
export function generateComitePdf(
  solicitudes: SolicitudColcha[],
  currentUser?: UsuarioSTF | null,
  filterTitle: string = 'Comité Semanal'
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const metrics = calculateComiteMetrics(solicitudes);
  const now = new Date();
  const fechaStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()} | ${now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Helper for drawing header on each page
  const drawPageHeaderAndFooter = (pageNumber: number, totalPages: number) => {
    // Top Dark Header Box
    doc.setFillColor(15, 23, 42); // #0f172a (Dark navy)
    doc.rect(0, 0, pageWidth, 24, 'F');

    // Accent Blue Bar
    doc.setFillColor(59, 130, 246); // #3b82f6
    doc.rect(0, 23, pageWidth, 1.5, 'F');

    // Header Left: STF GROUP / CONTROL DE CALIDAD
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('STF GROUP', margin, 11);

    doc.setTextColor(148, 163, 184); // #94a3b8
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('CONTROL DE CALIDAD', margin, 18);

    // Header Right: COMITÉ SEMANAL DE CALIDAD / Fecha
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('COMITÉ SEMANAL DE CALIDAD', pageWidth - margin, 11, { align: 'right' });

    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Fecha: ${fechaStr}`, pageWidth - margin, 18, { align: 'right' });

    // Footer
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Página ${pageNumber} de ${totalPages} • Documento Oficial Confidencial STF Group • Control de Calidad`,
      margin,
      pageHeight - 8
    );
    doc.text(
      `Generado por: ${currentUser?.nombre || 'EDWIN'}`,
      pageWidth - margin,
      pageHeight - 8,
      { align: 'right' }
    );
  };

  // --- PAGE 1 CONTENT ---
  let startY = 32;

  // 1. SECTION: RESUMEN DE INDICADORES CLAVE (KPIS MAESTROS REALES)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('1. RESUMEN DE INDICADORES CLAVE (KPIS DE CALIDAD & TIEMPO REAL)', margin, startY);

  startY += 5;

  // 6 KPI Cards Grid (2 rows x 3 cols)
  const cardWidth = (pageWidth - margin * 2 - 6) / 3;
  const cardHeight = 21;

  // Fila 1 - Card 1: TOTAL MUESTRAS
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, startY, cardWidth, cardHeight, 'FD');
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, startY, 1.5, cardHeight, 'F');

  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('VOLUMEN AUDITADO', margin + 4, startY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(`${metrics.totalOps} OPs`, margin + 4, startY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`${metrics.totalMetros.toLocaleString()}m (${metrics.totalRollos} rollos)`, margin + 4, startY + 17.5);

  // Fila 1 - Card 2: TASA DE APROBACIÓN
  const c2X = margin + cardWidth + 3;
  doc.setFillColor(248, 250, 252);
  doc.rect(c2X, startY, cardWidth, cardHeight, 'FD');
  doc.setFillColor(16, 185, 129);
  doc.rect(c2X, startY, 1.5, cardHeight, 'F');

  doc.setFontSize(7);
  doc.setTextColor(16, 185, 129);
  doc.text('TASA DE APROBACIÓN', c2X + 4, startY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(16, 185, 129);
  doc.text(`${metrics.tasaAprobacion}%`, c2X + 4, startY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`${metrics.aprobados} aprobadas (${metrics.aprobadosEnGama} en gama)`, c2X + 4, startY + 17.5);

  // Fila 1 - Card 3: CUMPLIMIENTO SLA
  const c3X = c2X + cardWidth + 3;
  doc.setFillColor(248, 250, 252);
  doc.rect(c3X, startY, cardWidth, cardHeight, 'FD');
  doc.setFillColor(59, 130, 246);
  doc.rect(c3X, startY, 1.5, cardHeight, 'F');

  doc.setFontSize(7);
  doc.setTextColor(59, 130, 246);
  doc.text('CUMPLIMIENTO DE SLA', c3X + 4, startY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(59, 130, 246);
  doc.text(`${metrics.pctCumplimientoSla}%`, c3X + 4, startY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`${metrics.opsATiempo} dentro de límite ≤ 3 días`, c3X + 4, startY + 17.5);

  startY += cardHeight + 3;

  // Fila 2 - Card 4: INDICADOR OTIF
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, startY, cardWidth, cardHeight, 'FD');
  doc.setFillColor(99, 102, 241);
  doc.rect(margin, startY, 1.5, cardHeight, 'F');

  doc.setFontSize(7);
  doc.setTextColor(99, 102, 241);
  doc.text('ÍNDICE OTIF INDUSTRIAL', margin + 4, startY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(99, 102, 241);
  doc.text(`${metrics.pctOtif}%`, margin + 4, startY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('On-Time & In-Full (SLA × Calidad)', margin + 4, startY + 17.5);

  // Fila 2 - Card 5: LEAD TIME PROMEDIO
  doc.setFillColor(248, 250, 252);
  doc.rect(c2X, startY, cardWidth, cardHeight, 'FD');
  doc.setFillColor(14, 165, 233);
  doc.rect(c2X, startY, 1.5, cardHeight, 'F');

  doc.setFontSize(7);
  doc.setTextColor(14, 165, 233);
  doc.text('LEAD TIME PROMEDIO', c2X + 4, startY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(14, 165, 233);
  doc.text(`${metrics.leadTimePromedioDias} días`, c2X + 4, startY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Tiempo promedio por colcha', c2X + 4, startY + 17.5);

  // Fila 2 - Card 6: EN PROCESO / OBSERVADAS
  doc.setFillColor(248, 250, 252);
  doc.rect(c3X, startY, cardWidth, cardHeight, 'FD');
  doc.setFillColor(metrics.rechazados > 0 ? 239 : 245, metrics.rechazados > 0 ? 68 : 158, metrics.rechazados > 0 ? 68 : 11);
  doc.rect(c3X, startY, 1.5, cardHeight, 'F');

  doc.setFontSize(7);
  doc.setTextColor(metrics.rechazados > 0 ? 239 : 217, metrics.rechazados > 0 ? 68 : 119, metrics.rechazados > 0 ? 68 : 6);
  doc.text('EN PROCESO / OBSERVADAS', c3X + 4, startY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(`${metrics.enProceso} activas`, c3X + 4, startY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(metrics.rechazados > 0 ? 239 : 100, metrics.rechazados > 0 ? 68 : 116, metrics.rechazados > 0 ? 68 : 139);
  doc.text(`${metrics.rechazados} con rechazo/desviación`, c3X + 4, startY + 17.5);

  startY += cardHeight + 8;

  // 2. SECTION: DISTRIBUCIÓN POR ÁREA Y UBICACIÓN FÍSICA (WIP REAL)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('2. DISTRIBUCIÓN POR ETAPA OPERATIVA Y CUELLOS DE BOTELLA (WIP)', margin, startY);

  startY += 4;

  const distRows = [
    ['PRE - SOLICITUD', `${metrics.distribucion.preSolicitud.count} OPs`, `${metrics.distribucion.preSolicitud.metros.toLocaleString()} m`, `${metrics.distribucion.preSolicitud.pct}%`],
    ['SOLICITADO', `${metrics.distribucion.solicitados.count} OPs`, `${metrics.distribucion.solicitados.metros.toLocaleString()} m`, `${metrics.distribucion.solicitados.pct}%`],
    ['LAVANDERIA', `${metrics.distribucion.lavanderia.count} OPs`, `${metrics.distribucion.lavanderia.metros.toLocaleString()} m`, `${metrics.distribucion.lavanderia.pct}%`],
    ['CALIDAD', `${metrics.distribucion.calidad.count} OPs`, `${metrics.distribucion.calidad.metros.toLocaleString()} m`, `${metrics.distribucion.calidad.pct}%`],
    ['EVALUADO Y ENVIADO', `${metrics.distribucion.evaluado.count} OPs`, `${metrics.distribucion.evaluado.metros.toLocaleString()} m`, `${metrics.distribucion.evaluado.pct}%`],
    ['FINALIZADOS', `${metrics.distribucion.finalizados.count} OPs`, `${metrics.distribucion.finalizados.metros.toLocaleString()} m`, `${metrics.distribucion.finalizados.pct}%`]
  ];

  autoTable(doc, {
    startY: startY,
    margin: { left: margin, right: margin },
    head: [['Etapa / Ubicación del Proceso', 'Muestras', 'Metraje Acumulado (m)', '% Participación']],
    body: distRows,
    theme: 'plain',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: 2
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 41, 59],
      cellPadding: 1.8,
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  // @ts-ignore
  let lastY = doc.lastAutoTable.finalY + 6;

  // 3. SECTION: TOP 5 TELAS Y TOP AUDITORES
  if (lastY < pageHeight - 50 && metrics.topTelas.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text('3. TOP FAMILIAS DE TELAS MÁS AUDITADAS', margin, lastY);
    lastY += 3.5;

    const telaRows = metrics.topTelas.map(t => [
      t.tela,
      `${t.count} OPs`,
      `${t.metros.toLocaleString()} m`,
      `${t.pct}% del total`
    ]);

    autoTable(doc, {
      startY: lastY,
      margin: { left: margin, right: margin },
      head: [['Descripción de Tela', 'Cantidad OPs', 'Metraje Auditado', '% del Volumen']],
      body: telaRows,
      theme: 'plain',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
        cellPadding: 2
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [30, 41, 59],
        cellPadding: 1.8,
        lineColor: [226, 232, 240],
        lineWidth: 0.2
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      }
    });

    // @ts-ignore
    lastY = doc.lastAutoTable.finalY + 6;
  }

  // 4. SECTION: DETALLE DE ORDENES DE PRODUCCIÓN AUDITADAS
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('4. MATRIZ DETALLADA DE ÓRDENES DE PRODUCCIÓN', margin, lastY);

  lastY += 3.5;

  const detailRows = solicitudes.map(item => {
    const rollos = Number(item.rollos) || 1;
    const metrosStr = item.codigoMt ? `${item.codigoMt} (${rollos * 85}m)` : `${rollos * 85}m`;
    const resultado = item.dictamen === 'APROBADO' 
      ? 'APROBADO' 
      : (item.dictamen === 'APROBADO EN GAMA' ? 'APROBADO EN GAMA' : (item.dictamen === 'RECHAZADO' ? 'RECHAZADO' : (item.estado === 'FINALIZADO' ? 'FINALIZADO' : 'EN PROCESO')));
    
    return [
      item.op || 'S/N',
      item.referencia || 'S/R',
      (item.tela || '').substring(0, 24),
      metrosStr,
      item.estado || item.areaActual || 'SOLICITADO',
      resultado,
      item.diasHabiles ? `${item.diasHabiles}d` : '1d',
      (item.fechaCreacion || '').substring(0, 10)
    ];
  });

  autoTable(doc, {
    startY: lastY,
    margin: { left: margin, right: margin },
    head: [['Código OP', 'Referencia', 'Tela', 'Metraje/Código', 'Ubicación', 'Dictamen', 'SLA', 'Fecha']],
    body: detailRows,
    theme: 'plain',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.2,
      cellPadding: 2.2
    },
    bodyStyles: {
      fontSize: 6.8,
      textColor: [30, 41, 59],
      cellPadding: 1.8,
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  // Stamp headers and footers on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawPageHeaderAndFooter(i, totalPages);
  }

  // Save PDF
  const filename = `STF_Reporte_Comite_Calidad_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.pdf`;
  doc.save(filename);
}

/**
 * GENERATE EXCEL WITH 3 STRUCTURED SHEETS
 */
export function generateComiteExcel(
  solicitudes: SolicitudColcha[],
  currentUser?: UsuarioSTF | null
): void {
  const metrics = calculateComiteMetrics(solicitudes);
  const now = new Date();

  // SHEET 1: Resumen KPIs
  const sheet1Data: any[][] = [
    ['STF GROUP S.A. - SISTEMA DE CONTROL Y TRAZABILIDAD DE COLCHAS'],
    ['INFORME EJECUTIVO DE COMITÉ DE CALIDAD TEXTIL & EFICIENCIA OPERATIVA'],
    ['Generado por:', currentUser?.nombre || 'EDWIN', 'Fecha:', now.toLocaleString('es-CO')],
    [''],
    ['1. RESUMEN DE INDICADORES CLAVE (KPIS MAESTROS)'],
    ['Indicador', 'Valor Real', 'Unidad / Meta'],
    ['Total Muestras Analizadas', metrics.totalOps, 'OPs'],
    ['Metraje Total Procesado', metrics.totalMetros, 'Metros lineales'],
    ['Total Rollos Evaluados', metrics.totalRollos, 'Rollos'],
    ['Muestras Aprobadas / Liberadas', metrics.aprobados, 'Lotes'],
    ['Muestras Aprobadas en Gama', metrics.aprobadosEnGama, 'Lotes'],
    ['Muestras Rechazadas / Observadas', metrics.rechazados, 'Lotes'],
    ['Muestras en Proceso / Tránsito', metrics.enProceso, 'Lotes'],
    ['Tasa de Aprobación Real', `${metrics.tasaAprobacion}%`, 'Meta Calidad: >92.0%'],
    ['Cumplimiento de SLA (≤ 3 días)', `${metrics.pctCumplimientoSla}%`, 'Meta SLA: >90.0%'],
    ['Índice Industrial OTIF (On-Time & In-Full)', `${metrics.pctOtif}%`, 'Meta OTIF: >85.0%'],
    ['Lead Time Promedio por Colcha', `${metrics.leadTimePromedioDias} días`, 'Meta Lead Time: ≤ 2.5 días'],
    [''],
    ['2. DISTRIBUCIÓN POR ETAPA OPERATIVA (CUELLOS DE BOTELLA WIP)'],
    ['Etapa / Ubicación', 'Cantidad OPs', 'Metraje (m)', 'Participación (%)'],
    ['PRE - SOLICITUD', metrics.distribucion.preSolicitud.count, metrics.distribucion.preSolicitud.metros, `${metrics.distribucion.preSolicitud.pct}%`],
    ['SOLICITADO', metrics.distribucion.solicitados.count, metrics.distribucion.solicitados.metros, `${metrics.distribucion.solicitados.pct}%`],
    ['LAVANDERIA', metrics.distribucion.lavanderia.count, metrics.distribucion.lavanderia.metros, `${metrics.distribucion.lavanderia.pct}%`],
    ['CALIDAD', metrics.distribucion.calidad.count, metrics.distribucion.calidad.metros, `${metrics.distribucion.calidad.pct}%`],
    ['EVALUADO Y ENVIADO', metrics.distribucion.evaluado.count, metrics.distribucion.evaluado.metros, `${metrics.distribucion.evaluado.pct}%`],
    ['FINALIZADOS', metrics.distribucion.finalizados.count, metrics.distribucion.finalizados.metros, `${metrics.distribucion.finalizados.pct}%`],
    [''],
    ['3. TOP FAMILIAS DE TELAS MÁS AUDITADAS'],
    ['Tela', 'Cantidad OPs', 'Metros Totales', '% del Volumen'],
    ...metrics.topTelas.map(t => [t.tela, t.count, t.metros, `${t.pct}%`])
  ];

  // SHEET 2: Matriz Completa de OPs
  const sheet2Data: any[][] = [
    ['MATRIZ COMPLETA DE ÓRDENES DE PRODUCCIÓN - COMITÉ DE CALIDAD'],
    ['OP', 'Referencia', 'Tela', 'Color', 'Rollos', 'Metraje Aprox (m)', 'Código MT', 'Área Actual', 'Estado', 'Dictamen', 'Inspector', 'Fecha Creación', 'Días Hábiles', 'Horas Acumuladas', 'Retraso SLA', 'Observaciones']
  ];

  solicitudes.forEach(item => {
    const rollos = Number(item.rollos) || 1;
    const metros = rollos * 85;
    const excesoSla = Math.max(0, item.diasHabiles - 3);

    sheet2Data.push([
      item.op,
      item.referencia,
      item.tela,
      item.color || '',
      rollos,
      metros,
      item.codigoMt || '',
      item.areaActual || '',
      item.estado,
      item.dictamen || 'PENDIENTE',
      item.inspector || '',
      item.fechaCreacion || '',
      item.diasHabiles || 0,
      item.horasEnProceso || (item.diasHabiles * 12),
      item.tieneRetraso ? `+ ${excesoSla} días` : 'En tiempo',
      item.observacionesOperario || item.observacionesCalidad || ''
    ]);
  });

  // SHEET 3: Bitácora de Rechazos y Desviaciones
  const sheet3Data: any[][] = [
    ['BITÁCORA OFICIAL DE RECHAZOS Y DESVIACIONES CRÍTICAS'],
    ['OP', 'Referencia', 'Tela', 'Color', 'Metraje', 'Área Detección', 'Inspector / Auditor', 'Causa / Observación de Rechazo', 'Fecha Registro']
  ];

  const rechazadosList = solicitudes.filter(s => s.dictamen === 'RECHAZADO' || (s.observacionesCalidad && s.observacionesCalidad.toLowerCase().includes('rechaz')));
  rechazadosList.forEach(item => {
    sheet3Data.push([
      item.op,
      item.referencia,
      item.tela,
      item.color || '',
      (Number(item.rollos) || 1) * 85,
      item.areaActual || '',
      item.inspector || '',
      item.observacionesCalidad || item.observacionesOperario || 'No especificada',
      item.fechaCreacion || ''
    ]);
  });

  // Build Workbook
  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
  const ws3 = XLSX.utils.aoa_to_sheet(sheet3Data);

  XLSX.utils.book_append_sheet(wb, ws1, 'Resumen KPIs');
  XLSX.utils.book_append_sheet(wb, ws2, 'Matriz OPs');
  XLSX.utils.book_append_sheet(wb, ws3, 'Bitacora Rechazos');

  const filename = `STF_Matriz_Comite_Calidad_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.xlsx`;
  XLSX.writeFile(wb, filename);
}
