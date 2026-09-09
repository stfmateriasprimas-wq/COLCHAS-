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


/**
 * Envía el comando directo de impresión nativa del sistema operativo (100mm x 100mm / 4" x 4")
 */
export function printColchaDirectTicket(colcha: SolicitudColcha, qrDataUrl?: string) {
  const origin = typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : 'https://colchas.vercel.app';
  const trackingUrl = `${origin}/?op=${encodeURIComponent(colcha.op)}&view=public`;

  const printWindow = window.open('', '_blank', 'width=480,height=520');
  
  const qrImgTag = qrDataUrl 
    ? `<img src="${qrDataUrl}" class="qr-img" alt="QR Trazabilidad" />`
    : `<img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(trackingUrl)}" class="qr-img" alt="QR Trazabilidad" />`;

  const html = `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="utf-8">
        <title>Etiqueta Térmica OP-${colcha.op} - STF GROUP</title>
        <style>
          @page {
            size: 100mm 100mm;
            margin: 0;
          }
          @media print {
            html, body {
              width: 100mm;
              height: 100mm;
              margin: 0;
              padding: 0;
            }
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          }
          body {
            width: 100mm;
            height: 100mm;
            padding: 2.5mm;
            background: #ffffff;
            color: #000000;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
          }
          .ticket-card {
            width: 95mm;
            height: 95mm;
            border: 2px solid #000000;
            padding: 2.5mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .ticket-header {
            text-align: center;
            border-bottom: 2px solid #000000;
            padding-bottom: 1mm;
          }
          .ticket-header h1 {
            font-size: 14pt;
            font-weight: 900;
            letter-spacing: 2px;
            text-transform: uppercase;
            line-height: 1;
          }
          .ticket-header .op-ref {
            font-size: 10.5pt;
            font-weight: 900;
            margin-top: 1mm;
            letter-spacing: 0.5px;
          }
          .tela-badge {
            border: 1.5px solid #000000;
            background: #f4f4f5;
            text-align: center;
            font-size: 8pt;
            font-weight: 900;
            padding: 1mm 2mm;
            margin: 1.2mm 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .ticket-grid {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 0.5mm 0;
            flex: 1;
          }
          .spec-table {
            width: 58%;
            font-size: 7.5pt;
            font-weight: 700;
          }
          .spec-row {
            display: flex;
            justify-content: space-between;
            border-bottom: 0.5px solid #d4d4d8;
            padding: 0.7mm 0;
          }
          .spec-row:last-child {
            border-bottom: none;
          }
          .spec-label {
            color: #3f3f46;
            font-weight: 800;
          }
          .spec-value {
            color: #000000;
            font-weight: 900;
          }
          .qr-section {
            width: 38%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
          }
          .qr-img {
            width: 25mm;
            height: 25mm;
            border: 1px solid #000000;
            padding: 0.5mm;
            background: #ffffff;
            display: block;
          }
          .qr-label {
            font-size: 5.5pt;
            font-weight: 900;
            margin-top: 0.8mm;
            line-height: 1.1;
            text-transform: uppercase;
            color: #000000;
          }
          .ticket-footer {
            border-top: 1.5px dashed #52525b;
            padding-top: 1mm;
            font-size: 7pt;
          }
          .ticket-footer strong {
            font-size: 7pt;
            font-weight: 900;
            display: block;
          }
          .ticket-footer p {
            font-size: 6.5pt;
            color: #18181b;
            font-weight: 600;
            line-height: 1.2;
            max-height: 5mm;
            overflow: hidden;
          }
          .ticket-sub {
            text-align: center;
            font-size: 5.5pt;
            color: #71717a;
            font-family: monospace;
            margin-top: 0.5mm;
          }
        </style>
      </head>
      <body>
        <div class="ticket-card">
          <div class="ticket-header">
            <h1>COLCHAS STF</h1>
            <div class="op-ref">${colcha.op} / REF-${colcha.referencia}</div>
          </div>
          
          <div class="tela-badge">
            TELA: ${colcha.tela}
          </div>

          <div class="ticket-grid">
            <div class="spec-table">
              <div class="spec-row">
                <span class="spec-label">COLOR:</span>
                <span class="spec-value">${colcha.color}</span>
              </div>
              <div class="spec-row">
                <span class="spec-label">ROLLOS:</span>
                <span class="spec-value">${colcha.rollos} rls</span>
              </div>
              <div class="spec-row">
                <span class="spec-label">METRAJE:</span>
                <span class="spec-value">${colcha.codigoMt} Mt</span>
              </div>
              <div class="spec-row">
                <span class="spec-label">LOTES:</span>
                <span class="spec-value">${colcha.lote || '1'}</span>
              </div>
              <div class="spec-row">
                <span class="spec-label">DICTAMEN:</span>
                <span class="spec-value">${colcha.dictamen}</span>
              </div>
            </div>

            <div class="qr-section">
              ${qrImgTag}
              <div class="qr-label">ESCANEAR QR<br/>TRAZABILIDAD</div>
            </div>
          </div>

          <div class="ticket-footer">
            <strong>OBSERVACIÓN FINAL CALIDAD:</strong>
            <p>${colcha.observacionesOperario || `CONCEPTO CALIDAD: ${colcha.dictamen}`}</p>
          </div>

          <div class="ticket-sub">
            ID: STF-${colcha.op} • Impreso: ${new Date().toLocaleString('es-CO')}
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `;

  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  } else {
    window.print();
  }
}
