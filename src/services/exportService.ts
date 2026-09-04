import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { SolicitudColcha } from '../types';

export function exportSolicitudesToExcel(data: SolicitudColcha[], fileName: string = 'Trazabilidad_Colchas_STF.xlsx') {
  const exportData = data.map((item, index) => ({
    '#': index + 1,
    'OP': item.op,
    'ÁREA': item.areaActual,
    'REFERENCIA': item.referencia,
    'TELA': item.tela,
    'COLOR': item.color,
    'CÓDIGO MT': item.codigoMt,
    'ROLLOS': item.rollos,
    'LOTE': item.lote,
    'ESTADO': item.estado,
    'DICTAMEN': item.dictamen,
    'INSPECTOR / OPERARIO': item.inspector,
    'FECHA INGRESO': item.fechaCreacion,
    'DÍAS HÁBILES': item.diasHabiles,
    'OBSERVACIONES': item.observacionesOperario || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Trazabilidad');
  XLSX.writeFile(workbook, fileName);
}

/**
 * Exportar las 14 columnas exactas de la página ALERTAS a formato Excel / CSV
 */
export function exportAlertasToExcel(data: SolicitudColcha[], fileName: string = 'ALERTAS_STF_RETRAZO_SLA.xlsx') {
  const exportData = data.map((item) => {
    const excesoSla = Math.max(0, item.diasHabiles - 3);
    const mtFormatted = item.codigoMt ? (item.codigoMt.includes('MT') ? item.codigoMt : `${item.codigoMt} (${item.rollos * 85} MT)`) : `${item.rollos * 85} MT`;
    return {
      'OP': item.op,
      'REFERENCIA': item.referencia || 'S/R',
      'TELA': item.tela,
      'COLOR': item.color,
      'METROS (MT)': mtFormatted,
      'AREA ACTUAL': item.areaActual,
      'FECHA SOLICITUD': item.fechaCreacion,
      'DÍAS HÁBILES EN ÁREA': `${item.diasHabiles} Días`,
      'DÍAS RETRASO (>3 DÍAS)': `+${excesoSla} Días`,
      'HORAS HÁBILES': `${item.horasEnProceso}h`,
      'SOLICITANTE / RESPONSABLE': item.inspector,
      'OBS. OPERARIO': item.observacionesOperario || '',
      'OBS. LAVANDERÍA': item.observacionesLavanderia || '',
      'FECHA ENVIO REPORTE': ''
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'ALERTAS');
  XLSX.writeFile(workbook, fileName);
}

export function getAlertasCsvText(data: SolicitudColcha[]): string {
  const headers = [
    'OP', 'REFERENCIA', 'TELA', 'COLOR', 'METROS (MT)', 'AREA ACTUAL',
    'FECHA SOLICITUD', 'DÍAS HÁBILES EN ÁREA', 'DÍAS RETRASO (>3 DÍAS)',
    'HORAS HÁBILES', 'SOLICITANTE / RESPONSABLE', 'OBS. OPERARIO',
    'OBS. LAVANDERÍA', 'FECHA ENVIO REPORTE'
  ];

  const lines = [headers.map(h => `"${h}"`).join(',')];
  data.forEach(item => {
    const excesoSla = Math.max(0, item.diasHabiles - 3);
    const mtFormatted = item.codigoMt ? (item.codigoMt.includes('MT') ? item.codigoMt : `${item.codigoMt} (${item.rollos * 85} MT)`) : `${item.rollos * 85} MT`;
    const row = [
      item.op,
      item.referencia || 'S/R',
      item.tela || '',
      item.color || '',
      mtFormatted,
      item.areaActual || '',
      item.fechaCreacion || '',
      `${item.diasHabiles} Días`,
      `+${excesoSla} Días`,
      `${item.horasEnProceso}h`,
      item.inspector || '',
      (item.observacionesOperario || '').replace(/"/g, '""'),
      (item.observacionesLavanderia || '').replace(/"/g, '""'),
      ''
    ];
    lines.push(row.map(cell => `"${cell}"`).join(','));
  });

  return lines.join('\n');
}

export function generateColchaPdfTicket(colcha: SolicitudColcha) {
  // Formato exacto 100mm x 100mm (4" x 4") para impresora térmica Zebra
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [100, 100]
  });

  // Margen exterior y borde
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.rect(3, 3, 94, 94);

  // Encabezado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('COLCHAS STF', 50, 10, { align: 'center' });
  doc.line(8, 12, 92, 12);

  // OP / REF
  doc.setFontSize(11);
  doc.text(`${colcha.op} / REF–${colcha.referencia}`, 50, 18, { align: 'center' });

  // Recuadro de Tela
  doc.rect(8, 21, 84, 7);
  doc.setFontSize(8.5);
  doc.text(`TELA: ${colcha.tela}`, 50, 25.5, { align: 'center' });

  // Datos Técnicos (Columna Izquierda)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('COLOR:', 10, 34);
  doc.setFont('helvetica', 'normal');
  doc.text(`${colcha.color}`, 42, 34);

  doc.setFont('helvetica', 'bold');
  doc.text('ROLLOS:', 10, 40);
  doc.setFont('helvetica', 'normal');
  doc.text(`${colcha.rollos} rls`, 42, 40);

  doc.setFont('helvetica', 'bold');
  doc.text('METRAJE:', 10, 46);
  doc.setFont('helvetica', 'normal');
  doc.text(`${colcha.codigoMt} Mt`, 42, 46);

  doc.setFont('helvetica', 'bold');
  doc.text('LOTES:', 10, 52);
  doc.setFont('helvetica', 'normal');
  doc.text(`${colcha.lote || '1'}`, 42, 52);

  doc.setFont('helvetica', 'bold');
  doc.text('DICTAMEN:', 10, 58);
  doc.setFont('helvetica', 'bold');
  doc.text(`${colcha.dictamen}`, 42, 58);

  // Recuadro QR Simulado en PDF
  doc.rect(66, 32, 24, 24);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('QR TRAZABILIDAD', 78, 44, { align: 'center' });
  doc.text(`${colcha.op}`, 78, 48, { align: 'center' });
  doc.setFontSize(5);
  doc.text('ESCANEAR QR', 78, 59, { align: 'center' });

  // Línea divisoria
  doc.setLineDashPattern([1, 1], 0);
  doc.line(8, 64, 92, 64);
  doc.setLineDashPattern([], 0);

  // Observación final
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('OBSERVACIÓN FINAL CALIDAD:', 10, 70);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const obs = colcha.observacionesOperario || `CONCEPTO CALIDAD: ${colcha.dictamen}`;
  doc.text(obs, 10, 75, { maxWidth: 80 });

  // Pie de página de trazabilidad
  doc.setFontSize(6);
  doc.setTextColor(100, 100, 100);
  doc.text(`ID: STF-${colcha.op} • Impreso: ${new Date().toLocaleString()}`, 50, 93, { align: 'center' });

  doc.save(`Etiqueta_100x100_${colcha.op}.pdf`);
}
