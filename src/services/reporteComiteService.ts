import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { SolicitudColcha, SectorType } from '../types';
import { UsuarioSTF } from './authService';

export interface ComiteReportFilterOptions {
  timeRange: '7D' | '15D' | '30D' | 'CUSTOM' | 'ALL';
  startDate?: string;
  endDate?: string;
  stageFilter: 'ALL' | SectorType;
  dictamenFilter: 'ALL' | 'APROBADO' | 'RECHAZADO' | 'EN_PROCESO';
}

export interface ComiteMetrics {
  totalOps: number;
  totalMetros: number;
  totalRollos: number;
  aprobados: number;
  rechazados: number;
  enProceso: number;
  tasaAprobacion: number;
  distribucion: {
    preSolicitud: { count: number; metros: number; pct: number };
    solicitados: { count: number; metros: number; pct: number };
    lavanderia: { count: number; metros: number; pct: number };
    calidad: { count: number; metros: number; pct: number };
    finalizados: { count: number; metros: number; pct: number };
  };
}

/**
 * Filter solicitudes based on Comite criteria
 */
export function filterSolicitudesForComite(
  solicitudes: SolicitudColcha[],
  options: ComiteReportFilterOptions
): SolicitudColcha[] {
  const now = new Date();
  
  return solicitudes.filter(item => {
    // 1. Time range filter
    if (options.timeRange !== 'ALL' && item.fechaCreacion) {
      // Parse date
      const dateParts = item.fechaCreacion.split(' ')[0].split(/[/-]/);
      let itemDate: Date;
      if (dateParts.length === 3) {
        // Assume D/M/YYYY or YYYY-MM-DD
        if (dateParts[0].length === 4) {
          itemDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
        } else {
          itemDate = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]));
        }
      } else {
        itemDate = new Date(item.fechaCreacion);
      }

      if (!isNaN(itemDate.getTime())) {
        if (options.timeRange === '7D') {
          const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 7) return false;
        } else if (options.timeRange === '15D') {
          const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 15) return false;
        } else if (options.timeRange === '30D') {
          const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 30) return false;
        } else if (options.timeRange === 'CUSTOM') {
          if (options.startDate) {
            const start = new Date(options.startDate);
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
      if (item.dictamen !== 'APROBADO' && item.estado !== 'FINALIZADO') return false;
    } else if (options.dictamenFilter === 'RECHAZADO') {
      if (item.dictamen !== 'RECHAZADO') return false;
    } else if (options.dictamenFilter === 'EN_PROCESO') {
      if (item.estado === 'FINALIZADO') return false;
    }

    return true;
  });
}

/**
 * Calculate summary metrics for the committee report
 */
export function calculateComiteMetrics(solicitudes: SolicitudColcha[]): ComiteMetrics {
  const totalOps = solicitudes.length;
  let totalMetros = 0;
  let totalRollos = 0;
  let aprobados = 0;
  let rechazados = 0;
  let enProceso = 0;

  let countPreSol = 0;
  let metrosPreSol = 0;
  let countSol = 0;
  let metrosSol = 0;
  let countLav = 0;
  let metrosLav = 0;
  let countCal = 0;
  let metrosCal = 0;
  let countFin = 0;
  let metrosFin = 0;

  solicitudes.forEach(item => {
    const rollos = Number(item.rollos) || 1;
    const metros = rollos * 85;
    totalRollos += rollos;
    totalMetros += metros;

    if (item.dictamen === 'APROBADO' || (item.estado === 'FINALIZADO' && item.dictamen !== 'RECHAZADO')) {
      aprobados++;
    } else if (item.dictamen === 'RECHAZADO') {
      rechazados++;
    } else {
      enProceso++;
    }

    // Areas
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
    } else if (item.estado === 'FINALIZADO') {
      countFin++;
      metrosFin += metros;
    }
  });

  const totalDecided = aprobados + rechazados;
  const tasaAprobacion = totalDecided > 0 
    ? Math.round((aprobados / totalDecided) * 100) 
    : (enProceso > 0 ? 100 : 0);

  return {
    totalOps,
    totalMetros,
    totalRollos,
    aprobados,
    rechazados,
    enProceso,
    tasaAprobacion,
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
      finalizados: {
        count: countFin,
        metros: metrosFin,
        pct: totalOps > 0 ? Math.round((countFin / totalOps) * 1000) / 10 : 0
      }
    }
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

  // 1. SECTION: RESUMEN DE MÉTRICAS CLAVE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('1. RESUMEN DE MÉTRICAS CLAVE', margin, startY);

  startY += 5;

  // 4 KPI Cards Grid
  const cardWidth = (pageWidth - margin * 2 - 9) / 4;
  const cardHeight = 22;

  // Card 1: TOTAL MUESTRAS
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, startY, cardWidth, cardHeight, 'FD');
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, startY, 1.5, cardHeight, 'F'); // Dark left accent

  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL MUESTRAS', margin + 4, startY + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(`${metrics.totalOps} OPs`, margin + 4, startY + 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`${metrics.totalMetros}m tela`, margin + 4, startY + 18.5);

  // Card 2: APROBADOS
  const c2X = margin + cardWidth + 3;
  doc.setFillColor(248, 250, 252);
  doc.rect(c2X, startY, cardWidth, cardHeight, 'FD');
  doc.setFillColor(16, 185, 129); // Emerald
  doc.rect(c2X, startY, 1.5, cardHeight, 'F');

  doc.setFontSize(7);
  doc.setTextColor(16, 185, 129);
  doc.text('APROBADOS', c2X + 4, startY + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(16, 185, 129);
  doc.text(`${metrics.aprobados}`, c2X + 4, startY + 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Lotes aprobados', c2X + 4, startY + 18.5);

  // Card 3: RECHAZADO
  const c3X = c2X + cardWidth + 3;
  doc.setFillColor(248, 250, 252);
  doc.rect(c3X, startY, cardWidth, cardHeight, 'FD');
  doc.setFillColor(239, 68, 68); // Red
  doc.rect(c3X, startY, 1.5, cardHeight, 'F');

  doc.setFontSize(7);
  doc.setTextColor(239, 68, 68);
  doc.text('RECHAZADO', c3X + 4, startY + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(239, 68, 68);
  doc.text(`${metrics.rechazados}`, c3X + 4, startY + 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Lotes observados', c3X + 4, startY + 18.5);

  // Card 4: TASA DE APROBACION
  const c4X = c3X + cardWidth + 3;
  doc.setFillColor(248, 250, 252);
  doc.rect(c4X, startY, cardWidth, cardHeight, 'FD');
  doc.setFillColor(99, 102, 241); // Indigo
  doc.rect(c4X, startY, 1.5, cardHeight, 'F');

  doc.setFontSize(7);
  doc.setTextColor(99, 102, 241);
  doc.text('TASA DE APROBACION', c4X + 4, startY + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(99, 102, 241);
  doc.text(`${metrics.tasaAprobacion}%`, c4X + 4, startY + 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Meta comité: >92%', c4X + 4, startY + 18.5);

  startY += cardHeight + 10;

  // 2. SECTION: DISTRIBUCIÓN POR ÁREA Y UBICACIÓN FÍSICA
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('2. DISTRIBUCIÓN POR ÁREA Y UBICACIÓN FÍSICA', margin, startY);

  startY += 4;

  const distRows = [
    ['Pre-Solicitud (Diseño)', `${metrics.distribucion.preSolicitud.count} OPs`, `${metrics.distribucion.preSolicitud.metros} m`, `${metrics.distribucion.preSolicitud.pct}%`],
    ['Tránsito / Lavandería (Solicitado)', `${metrics.distribucion.solicitados.count} OPs`, `${metrics.distribucion.solicitados.metros} m`, `${metrics.distribucion.solicitados.pct}%`],
    ['Planta de Lavado (Recibido)', `${metrics.distribucion.lavanderia.count} OPs`, `${metrics.distribucion.lavanderia.metros} m`, `${metrics.distribucion.lavanderia.pct}%`],
    ['Laboratorio de Calidad STF', `${metrics.distribucion.calidad.count} OPs`, `${metrics.distribucion.calidad.metros} m`, `${metrics.distribucion.calidad.pct}%`],
    ['Finalizados / Dictaminados', `${metrics.distribucion.finalizados.count} OPs`, `${metrics.distribucion.finalizados.metros} m`, `${metrics.distribucion.finalizados.pct}%`]
  ];

  autoTable(doc, {
    startY: startY,
    margin: { left: margin, right: margin },
    head: [['Etapa / Ubicación del Proceso', 'Cantidad de Muestras', 'Metraje Acumulado (m)', '% Participación']],
    body: distRows,
    theme: 'plain',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 2.5
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 2.2,
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  // @ts-ignore
  let lastY = doc.lastAutoTable.finalY + 9;

  // 3. SECTION: DETALLE DE ORDENES DE PRODUCCIÓN Y REVISIONES
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('3. DETALLE DE ORDENES DE PRODUCCIÓN Y REVISIONES', margin, lastY);

  lastY += 4;

  const detailRows = solicitudes.map(item => {
    const metrosStr = item.codigoMt ? `${item.codigoMt}m` : `${(Number(item.rollos) || 1) * 85}m`;
    const resultado = item.dictamen === 'APROBADO' ? 'APROBADO' : (item.dictamen === 'RECHAZADO' ? 'RECHAZADO' : 'EN PROCESO');
    
    return [
      item.op || 'S/N',
      item.referencia || 'S/R',
      (item.tela || '').substring(0, 26),
      metrosStr,
      item.estado || item.areaActual || 'SOLICITADO',
      resultado,
      item.fechaCreacion || ''
    ];
  });

  autoTable(doc, {
    startY: lastY,
    margin: { left: margin, right: margin },
    head: [['Código OP', 'Referencia', 'Tela', 'Metraje', 'Ubicación', 'Resultado', 'Fecha Registro']],
    body: detailRows,
    theme: 'plain',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: 2.5
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 41, 59],
      cellPadding: 2,
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
    ['INFORME EJECUTIVO DE COMITÉ DE CALIDAD TEXTIL'],
    ['Generado por:', currentUser?.nombre || 'EDWIN', 'Fecha:', now.toLocaleString('es-CO')],
    [''],
    ['1. RESUMEN DE INDICADORES CLAVE (KPIs)'],
    ['Indicador', 'Valor', 'Unidad / Meta'],
    ['Total Muestras Analizadas', metrics.totalOps, 'OPs'],
    ['Metraje Total Procesado', metrics.totalMetros, 'Metros lineales'],
    ['Total Rollos Evaluados', metrics.totalRollos, 'Rollos'],
    ['Muestras Aprobadas / Liberadas', metrics.aprobados, 'Lotes'],
    ['Muestras Rechazadas / Observadas', metrics.rechazados, 'Lotes'],
    ['Muestras en Proceso / Tránsito', metrics.enProceso, 'Lotes'],
    ['Tasa de Aprobación Real', `${metrics.tasaAprobacion}%`, 'Meta Comité: >92.0%'],
    [''],
    ['2. DISTRIBUCIÓN POR ETAPA OPERATIVA'],
    ['Etapa / Ubicación', 'Cantidad OPs', 'Metraje (m)', 'Participación (%)'],
    ['Pre-Solicitud (Diseño ZF)', metrics.distribucion.preSolicitud.count, metrics.distribucion.preSolicitud.metros, `${metrics.distribucion.preSolicitud.pct}%`],
    ['Tránsito / Despacho (Solicitados)', metrics.distribucion.solicitados.count, metrics.distribucion.solicitados.metros, `${metrics.distribucion.solicitados.pct}%`],
    ['Lavandería (Colfactory ZF)', metrics.distribucion.lavanderia.count, metrics.distribucion.lavanderia.metros, `${metrics.distribucion.lavanderia.pct}%`],
    ['Calidad (Laboratorio STF)', metrics.distribucion.calidad.count, metrics.distribucion.calidad.metros, `${metrics.distribucion.calidad.pct}%`],
    ['Finalizados / Liberados', metrics.distribucion.finalizados.count, metrics.distribucion.finalizados.metros, `${metrics.distribucion.finalizados.pct}%`]
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
