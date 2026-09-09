import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { SolicitudColcha } from '../types';
import { generatePublicTrackingUrl } from './qrTrackingService';

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

/**
 * Extrae de forma limpia y específica la observación del área de Calidad
 * omitiendo el historial acumulado de transiciones entre áreas.
 */
/**
 * Extrae de forma limpia y específica la observación del área de Calidad
 * omitiendo notas previas o iniciales del operario/corte.
 */
export function getCleanFinalQualityObservation(colcha: SolicitudColcha): string {
  // 1. Si existe observacionesCalidad directa
  if (colcha.observacionesCalidad && colcha.observacionesCalidad.trim()) {
    let clean = colcha.observacionesCalidad.trim();
    clean = clean.replace(/^\[(?:CALIDAD|FINALIZADO|LAVANDERIA|AUDITORÍA)\]:\s*/i, '');
    clean = clean.replace(/^CONCEPTO CALIDAD:\s*/i, '');
    if (clean.trim()) return clean.trim().toUpperCase();
  }

  // 2. Si está en observacionesOperario acumuladas
  const raw = colcha.observacionesOperario || '';
  if (raw) {
    // Buscar si contiene segmento [CALIDAD]: ...
    const matchCalidad = raw.match(/\[CALIDAD\]:\s*([^|]+)/i);
    if (matchCalidad && matchCalidad[1] && matchCalidad[1].trim()) {
      return matchCalidad[1].trim().toUpperCase();
    }

    // Buscar si contiene segmento [FINALIZADO]: ...
    const matchFinal = raw.match(/\[FINALIZADO\]:\s*([^|]+)/i);
    if (matchFinal && matchFinal[1] && matchFinal[1].trim()) {
      const text = matchFinal[1].trim();
      if (!text.toLowerCase().includes('orden finalizada y liberada')) {
        return text.toUpperCase();
      }
    }

    // Si tiene segmentos separados por |
    if (raw.includes('|')) {
      const parts = raw.split('|').map(p => p.trim()).filter(Boolean);
      for (let i = parts.length - 1; i >= 0; i--) {
        let part = parts[i];
        part = part.replace(/^\[(?:CALIDAD|FINALIZADO|LAVANDERIA|AUDITORÍA)\]:\s*/i, '').trim();
        if (
          part && 
          !part.toUpperCase().startsWith('OP MUESTRA') && 
          !part.toUpperCase().startsWith('COLCHA') && 
          !part.toLowerCase().includes('recibida en lavandería') &&
          !part.toLowerCase().includes('solicitada') &&
          !part.toLowerCase().includes('muestra cortada')
        ) {
          return part.toUpperCase();
        }
      }
    }

    // Si no tiene pipes pero tiene texto y no es de corte inicial
    let clean = raw.replace(/^\[(?:CALIDAD|FINALIZADO|LAVANDERIA|AUDITORÍA)\]:\s*/i, '').trim();
    if (
      clean && 
      !clean.toLowerCase().includes('solicitada') && 
      !clean.toLowerCase().includes('muestra cortada') &&
      !clean.toLowerCase().includes('atelier')
    ) {
      return clean.toUpperCase();
    }
  }

  // 3. Fallback oficial según dictamen
  if (colcha.dictamen === 'APROBADO') {
    return 'ESTA OP DE MUESTRA NO PRESENTA NINGUNA NOVEDAD.';
  } else if (colcha.dictamen === 'RECHAZADO') {
    return 'RECHAZADO POR CALIDAD - NO CUMPLE ESPECIFICACIONES TÉCNICAS.';
  }
  return 'AUDITORÍA TÉCNICA DE CALIDAD EN CURSO.';
}

/**
 * Extrae la observación inicial de corte/operario para la Fase 1 (Creación hasta Solicitado)
 */
export function getCleanInitialObservation(colcha: SolicitudColcha): string {
  if (colcha.observacionesOperario && colcha.observacionesOperario.trim()) {
    const firstPart = colcha.observacionesOperario.split('|')[0].trim();
    const clean = firstPart.replace(/^\[(?:SOLICITADO|PRE_SOLICITUD|CORTE|ATELIER)\]:\s*/i, '').trim();
    if (clean) return clean.toUpperCase();
  }
  return 'OP DE MUESTRA REGISTRADA PARA CONTROL DE CALIDAD Y LAVADO.';
}

export function generateColchaPdfTicket(colcha: SolicitudColcha) {
  // Formato exacto 100mm x 100mm (4" x 4") para impresora térmica Zebra
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [100, 100]
  });

  const isFinalizado = colcha.estado === 'FINALIZADO';
  const cleanFinalObs = getCleanFinalQualityObservation(colcha);
  const cleanInitialObs = getCleanInitialObservation(colcha);
  const obsToShow = isFinalizado ? cleanFinalObs : cleanInitialObs;
  const obsTitle = isFinalizado ? 'OBSERVACIÓN FINAL CALIDAD:' : 'OBSERVACIÓN OPERARIO / CORTE:';

  // 1. Doble marco exterior (Borde grueso exterior + espacio blanco + borde fino interior)
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.8);
  doc.rect(2.5, 2.5, 95, 95); // Marco exterior grueso

  doc.setLineWidth(0.35);
  doc.rect(4.5, 4.5, 91, 91); // Marco interior fino

  // 2. Encabezado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('COLCHAS STF', 50, 11, { align: 'center' });

  // OP / REF
  doc.setFontSize(10.5);
  const refClean = colcha.referencia ? colcha.referencia.toUpperCase() : 'S/R';
  const refDisplay = refClean.startsWith('REF') ? refClean : `REF-${refClean}`;
  doc.text(`${colcha.op} / ${refDisplay}`, 50, 16.5, { align: 'center' });

  // Línea sólida divisoria
  doc.setLineWidth(0.5);
  doc.line(6.5, 18.5, 93.5, 18.5);

  // Recuadro de Tela
  doc.setLineWidth(0.35);
  doc.rect(6.5, 20.5, 87, 6.5);
  doc.setFontSize(8);
  doc.text(`TELA: ${colcha.tela.toUpperCase()}`, 50, 24.8, { align: 'center' });

  // 3. Tabla de especificaciones técnicas (Columna Izquierda)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  
  // COLOR
  doc.text('COLOR:', 7.5, 33);
  doc.text(`${colcha.color.toUpperCase()}`, 58, 33, { align: 'right' });
  doc.setDrawColor(220, 220, 225);
  doc.setLineWidth(0.2);
  doc.line(7.5, 34.5, 58, 34.5);

  // ROLLOS
  doc.text('ROLLOS:', 7.5, 39);
  doc.text(`${colcha.rollos} rls`, 58, 39, { align: 'right' });
  doc.line(7.5, 40.5, 58, 40.5);

  // METRAJE
  doc.text('METRAJE:', 7.5, 45);
  const mtDisplay = colcha.codigoMt ? (colcha.codigoMt.toUpperCase().endsWith('MT') ? colcha.codigoMt : `${colcha.codigoMt} Mt`) : 'MT-AUTO';
  doc.text(mtDisplay, 58, 45, { align: 'right' });
  doc.line(7.5, 46.5, 58, 46.5);

  // LOTES
  doc.text('LOTES:', 7.5, 51);
  const loteDisplay = colcha.lote ? (colcha.lote.toUpperCase().startsWith('LOTE') ? colcha.lote : `LOTE-${colcha.lote}`) : 'LOTE-1';
  doc.text(loteDisplay, 58, 51, { align: 'right' });
  doc.line(7.5, 52.5, 58, 52.5);

  // DICTAMEN
  doc.text('DICTAMEN:', 7.5, 57);
  doc.text(`${colcha.dictamen.toUpperCase()}`, 58, 57, { align: 'right' });

  // 4. Recuadro QR Simulado en PDF con STF en el centro
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.35);
  doc.rect(63, 30, 28, 25);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('STF', 77, 41, { align: 'center' });
  doc.setFontSize(6);
  doc.text(`${colcha.op}`, 77, 46, { align: 'center' });
  doc.setFontSize(5.5);
  doc.text('ESCANEAR QR', 77, 57.5, { align: 'center' });
  doc.text('TRAZABILIDAD', 77, 60, { align: 'center' });

  // 5. Línea divisoria segmentada (Dashed)
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.35);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.line(6.5, 63, 93.5, 63);
  doc.setLineDashPattern([], 0);

  // 6. Observación
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(obsTitle, 7.5, 68);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.text(obsToShow, 7.5, 73, { maxWidth: 84 });

  // 7. Pie de página de trazabilidad
  const cleanOp = colcha.op.replace(/^OP-?/i, '').trim();
  const printDateStr = new Date().toLocaleString('es-CO');
  doc.setDrawColor(210, 210, 215);
  doc.setLineWidth(0.2);
  doc.line(6.5, 87.5, 93.5, 87.5);

  doc.setFont('courier', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(80, 80, 80);
  doc.text(`ID: STF-OP-${cleanOp} • Impreso: ${printDateStr}`, 50, 91.5, { align: 'center' });

  doc.save(`Etiqueta_STF_100x100_${colcha.op}.pdf`);
}

/**
 * Envía el comando directo de impresión nativa del sistema operativo (100mm x 100mm / 4" x 4")
 * Utiliza un iframe invisible para evitar ventanas emergentes negras o bloqueos del navegador.
 */
export function printColchaDirectTicket(colcha: SolicitudColcha, qrDataUrl?: string) {
  const trackingUrl = generatePublicTrackingUrl(colcha);

  const qrImgTag = qrDataUrl 
    ? `<img src="${qrDataUrl}" class="qr-img" alt="QR Trazabilidad" />`
    : `<img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(trackingUrl)}" class="qr-img" alt="QR Trazabilidad" />`;

  const isFinalizado = colcha.estado === 'FINALIZADO';
  const cleanFinalObs = getCleanFinalQualityObservation(colcha);
  const cleanInitialObs = getCleanInitialObservation(colcha);
  const obsToShow = isFinalizado ? cleanFinalObs : cleanInitialObs;
  const obsTitle = isFinalizado ? 'OBSERVACIÓN FINAL CALIDAD:' : 'OBSERVACIÓN OPERARIO / CORTE:';

  const cleanOp = colcha.op.replace(/^OP-?/i, '').trim();
  const printDateStr = new Date().toLocaleString('es-CO');

  const refClean = colcha.referencia ? colcha.referencia.toUpperCase() : 'S/R';
  const refDisplay = refClean.startsWith('REF') ? refClean : `REF-${refClean}`;
  const mtDisplay = colcha.codigoMt ? (colcha.codigoMt.toUpperCase().endsWith('MT') ? colcha.codigoMt : `${colcha.codigoMt} Mt`) : 'MT-AUTO';
  const loteDisplay = colcha.lote ? (colcha.lote.toUpperCase().startsWith('LOTE') ? colcha.lote : `LOTE-${colcha.lote}`) : 'LOTE-1';

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
            padding: 2.2mm;
            background: #ffffff !important;
            color: #000000 !important;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
          }
          /* Doble marco idéntico a la imagen de referencia */
          .ticket-outer-frame {
            width: 95.5mm;
            height: 95.5mm;
            border: 3.2px solid #000000;
            padding: 1.8mm;
            background: #ffffff !important;
            box-sizing: border-box;
          }
          .ticket-card {
            width: 100%;
            height: 100%;
            border: 1.5px solid #000000;
            padding: 2.2mm 2.5mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background: #ffffff !important;
            box-sizing: border-box;
          }
          .ticket-header {
            text-align: center;
            border-bottom: 2px solid #000000;
            padding-bottom: 1.2mm;
          }
          .ticket-header h1 {
            font-size: 14pt;
            font-weight: 900;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            line-height: 1.1;
          }
          .ticket-header .op-ref {
            font-size: 10.5pt;
            font-weight: 900;
            margin-top: 0.8mm;
            letter-spacing: 0.5px;
          }
          .tela-badge {
            border: 1.5px solid #000000;
            background: #ffffff !important;
            text-align: center;
            font-size: 8.5pt;
            font-weight: 900;
            padding: 1mm 2mm;
            margin: 1.2mm 0;
            text-transform: uppercase;
            letter-spacing: 0.4px;
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
            font-weight: 800;
          }
          .spec-row {
            display: flex;
            justify-content: space-between;
            border-bottom: 0.5px solid #e4e4e7;
            padding: 0.8mm 0;
          }
          .spec-row:last-child {
            border-bottom: none;
          }
          .spec-label {
            color: #27272a;
            font-weight: 900;
          }
          .spec-value {
            color: #000000;
            font-weight: 900;
            text-align: right;
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
            width: 26mm;
            height: 26mm;
            border: 1px solid #000000;
            padding: 0.4mm;
            background: #ffffff;
            display: block;
          }
          .qr-label {
            font-size: 5.5pt;
            font-weight: 900;
            margin-top: 0.8mm;
            line-height: 1.15;
            text-transform: uppercase;
            color: #000000;
            letter-spacing: 0.2px;
          }
          .ticket-footer {
            border-top: 1.5px dashed #000000;
            padding-top: 1.2mm;
            font-size: 7.5pt;
          }
          .ticket-footer strong {
            font-size: 7.5pt;
            font-weight: 900;
            display: block;
            text-transform: uppercase;
            color: #000000;
          }
          .ticket-footer p {
            font-size: 7.5pt;
            color: #000000;
            font-weight: 900;
            line-height: 1.25;
            margin-top: 0.6mm;
            word-break: break-word;
            text-transform: uppercase;
          }
          .ticket-sub {
            text-align: center;
            font-size: 6pt;
            color: #374151;
            font-family: monospace;
            margin-top: 1mm;
            border-top: 0.5px solid #d1d5db;
            padding-top: 0.5mm;
          }
        </style>
      </head>
      <body>
        <div class="ticket-outer-frame">
          <div class="ticket-card">
            <div class="ticket-header">
              <h1>COLCHAS STF</h1>
              <div class="op-ref">${colcha.op} / ${refDisplay}</div>
            </div>
            
            <div class="tela-badge">
              TELA: ${colcha.tela.toUpperCase()}
            </div>

            <div class="ticket-grid">
              <div class="spec-table">
                <div class="spec-row">
                  <span class="spec-label">COLOR:</span>
                  <span class="spec-value">${colcha.color.toUpperCase()}</span>
                </div>
                <div class="spec-row">
                  <span class="spec-label">ROLLOS:</span>
                  <span class="spec-value">${colcha.rollos} rls</span>
                </div>
                <div class="spec-row">
                  <span class="spec-label">METRAJE:</span>
                  <span class="spec-value">${mtDisplay}</span>
                </div>
                <div class="spec-row">
                  <span class="spec-label">LOTES:</span>
                  <span class="spec-value">${loteDisplay}</span>
                </div>
                <div class="spec-row">
                  <span class="spec-label">DICTAMEN:</span>
                  <span class="spec-value">${colcha.dictamen.toUpperCase()}</span>
                </div>
              </div>

              <div class="qr-section">
                ${qrImgTag}
                <div class="qr-label">ESCANEAR QR<br/>TRAZABILIDAD</div>
              </div>
            </div>

            <div class="ticket-footer">
              <strong>${obsTitle}</strong>
              <p>${obsToShow}</p>
              <div class="ticket-sub">
                ID: STF-OP-${cleanOp} • Impreso: ${printDateStr}
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  // Crear o reutilizar un iframe invisible para enviar la orden de impresión nativa sin pantallas negras
  let printIframe = document.getElementById('stf-direct-print-iframe') as HTMLIFrameElement | null;
  if (!printIframe) {
    printIframe = document.createElement('iframe');
    printIframe.id = 'stf-direct-print-iframe';
    printIframe.style.position = 'fixed';
    printIframe.style.right = '0';
    printIframe.style.bottom = '0';
    printIframe.style.width = '0';
    printIframe.style.height = '0';
    printIframe.style.border = '0';
    printIframe.style.visibility = 'hidden';
    document.body.appendChild(printIframe);
  }

  const iframeDoc = printIframe.contentDocument || printIframe.contentWindow?.document;
  if (iframeDoc) {
    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();
    setTimeout(() => {
      try {
        printIframe?.contentWindow?.focus();
        printIframe?.contentWindow?.print();
      } catch (e) {
        window.print();
      }
    }, 250);
  }
}
