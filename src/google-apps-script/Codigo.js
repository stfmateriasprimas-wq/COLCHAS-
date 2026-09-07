/**
 * =========================================================================
 * STF GROUP S.A. - SISTEMA DE CONTROL DE COLCHAS & CALIDAD TEXTIL
 * SCRIPT MAESTRO DE INTEGRACIÓN BIDIRECCIONAL EN TIEMPO REAL
 * =========================================================================
 * ID de Hoja de Cálculo: 1jTM8OG2u3bO9Cyrlyn3DJSnGcyLOzA8EWwxwOyWgXdc
 * URL: https://docs.google.com/spreadsheets/d/1jTM8OG2u3bO9Cyrlyn3DJSnGcyLOzA8EWwxwOyWgXdc/edit?usp=sharing
 *
 * PESTAÑAS ADMINISTRADAS:
 * 1. BASE_DE_DATOS (16 Columnas Maestras)
 * 2. ALERTAS (14 Columnas SLA > 3 Días)
 * 3. MONITOREO (5 Columnas OPs por Hacer)
 * 4. GOOGLE DRIVE (Carpeta: STF_COLCHAS_EVIDENCIAS para fotos de muestras)
 * =========================================================================
 */

var SPREADSHEET_ID = "1jTM8OG2u3bO9Cyrlyn3DJSnGcyLOzA8EWwxwOyWgXdc";
var SHEET_BASE_DATOS = "BASE_DE_DATOS";
var SHEET_ALERTAS = "ALERTAS";
var SHEET_MONITOREO = "MONITOREO";
var DRIVE_FOLDER_NAME = "STF_COLCHAS_EVIDENCIAS";

// Encabezados oficiales de la pestaña ALERTAS (14 Columnas)
var ALERTAS_HEADERS = [
  "OP",
  "REFERENCIA",
  "TELA",
  "COLOR",
  "METROS (MT)",
  "AREA ACTUAL",
  "FECHA SOLICITUD",
  "DÍAS HÁBILES EN ÁREA",
  "DÍAS RETRASO (>3 DÍAS)",
  "HORAS HÁBILES",
  "SOLICITANTE / RESPONSABLE",
  "OBS. OPERARIO",
  "OBS. LAVANDERÍA",
  "FECHA ENVIO REPORTE"
];

// Encabezados oficiales de la pestaña BASE_DE_DATOS (16 Columnas)
var BASE_DATOS_HEADERS = [
  "FECHA",
  "INSPECTOR / OPERARIO",
  "TELA",
  "CÓDIGO MT",
  "COLOR",
  "OP",
  "REFERENCIA",
  "ROLLOS",
  "LOTE",
  "ESTADO",
  "OBSERVACIÓN OPERARIO",
  "OBSERVACIÓN COLFACTORY",
  "EVIDENCIA (LINK DRIVE)",
  "CORREO NOTIFICADO",
  "OBS.OPERARIO FINAL",
  "MES"
];

/**
 * Menú interactivo automático dentro de Google Sheets
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 STF GROUP')
    .addItem('⚡ Sincronizar y Alimentar Hoja ALERTAS', 'syncAlertasFromBaseDeDatos')
    .addItem('🧹 Dar Formato Profesional a Todas las Hojas', 'formatAllSheets')
    .addItem('📁 Crear / Verificar Carpeta en Google Drive', 'getOrCreateDriveFolder')
    .addToUi();
}

/**
 * =========================================================================
 * ENDPOINT GET (Lectura de datos en formato JSON en tiempo real)
 * =========================================================================
 */
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'GET_MONITOREO';
    var ss = getTargetSpreadsheet();

    // 1. GET_MONITOREO: Obtiene listado de OPs pendientes por hacer
    if (action === 'GET_MONITOREO') {
      var sheetMon = null;
      var sheets = ss.getSheets();
      for (var s = 0; s < sheets.length; s++) {
        if (sheets[s].getSheetId() === 1356774059 || sheets[s].getName().trim().toUpperCase() === 'MONITOREO') {
          sheetMon = sheets[s];
          break;
        }
      }
      if (!sheetMon) {
        sheetMon = ss.getSheetByName(SHEET_MONITOREO) || ss.getSheetByName('monitoreo');
      }
      if (!sheetMon) {
        return createJsonResponse({ status: 'error', message: 'Hoja MONITOREO no encontrada' });
      }
      var values = sheetMon.getDataRange().getValues();
      var items = [];
      for (var i = 1; i < values.length; i++) {
        var row = values[i];
        var rawTela = String(row[0] || '').trim();
        if (rawTela && rawTela.toUpperCase() !== 'TELA') {
          items.push({
            tela: rawTela,
            mt: String(row[1] || 'MT-AUTO').trim(),
            color: String(row[2] || 'AZUL').trim(),
            op: String(row[3] || '').trim(),
            referencia: String(row[4] || '').trim()
          });
        }
      }
      return createJsonResponse({ status: 'success', count: items.length, data: items });
    }

    // 2. GET_BASE_DATOS: Obtiene todas las filas de la base de datos maestra
    if (action === 'GET_BASE_DATOS') {
      var sheetBd = ss.getSheetByName(SHEET_BASE_DATOS) || ss.getSheetByName('01_BASE_DE_DATOS') || ss.getSheets()[0];
      var valuesBd = sheetBd.getDataRange().getValues();
      return createJsonResponse({ status: 'success', totalRows: valuesBd.length, data: valuesBd });
    }

    // 3. GET_ALERTAS: Obtiene las filas de la hoja de alertas
    if (action === 'GET_ALERTAS') {
      var sheetAl = ss.getSheetByName(SHEET_ALERTAS);
      if (!sheetAl) {
        return createJsonResponse({ status: 'success', count: 0, data: [] });
      }
      var valuesAl = sheetAl.getDataRange().getValues();
      return createJsonResponse({ status: 'success', totalRows: valuesAl.length, data: valuesAl });
    }

    return createJsonResponse({ status: 'error', message: 'Acción GET no reconocida: ' + action });

  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

/**
 * =========================================================================
 * ENDPOINT POST (Escritura, Transferencias, Dictámenes y Alertas en vivo)
 * =========================================================================
 */
function doPost(e) {
  try {
    var rawContents = e.postData ? e.postData.contents : '{}';
    var data = JSON.parse(rawContents);
    var action = data.action;
    var payload = data.payload || {};
    var ss = getTargetSpreadsheet();

    // -----------------------------------------------------------------------
    // ACCIÓN 1: SYNC_ALERTAS (Alimenta y actualiza la hoja ALERTAS en tiempo real)
    // -----------------------------------------------------------------------
    if (action === 'SYNC_ALERTAS') {
      var sheetAlertas = ss.getSheetByName(SHEET_ALERTAS);
      if (!sheetAlertas) {
        sheetAlertas = ss.insertSheet(SHEET_ALERTAS);
      }

      // Limpiar contenido anterior respetando fila 1
      var lastRow = sheetAlertas.getLastRow();
      var lastCol = Math.max(14, sheetAlertas.getLastColumn());
      if (lastRow > 1) {
        sheetAlertas.getRange(2, 1, lastRow - 1, lastCol).clearContent();
      }

      // Encabezados con formato rojo vino corporativo STF
      sheetAlertas.getRange(1, 1, 1, ALERTAS_HEADERS.length).setValues([ALERTAS_HEADERS]);
      formatAlertasSheetHeader(sheetAlertas);

      var rows = payload.rows || [];
      if (rows.length > 0) {
        var matrix = rows.map(function(r) {
          return [
            r.op || '',
            r.referencia || '',
            r.tela || '',
            r.color || '',
            r.metros || '',
            r.areaActual || '',
            r.fechaSolicitud || '',
            r.diasHabiles || '',
            r.diasRetraso || '',
            r.horasHabiles || '',
            r.responsable || '',
            r.obsOperario || '',
            r.obsLavanderia || '',
            r.fechaEnvioReporte || ''
          ];
        });

        sheetAlertas.getRange(2, 1, matrix.length, ALERTAS_HEADERS.length).setValues(matrix);
        formatAlertasSheetRows(sheetAlertas, matrix.length);
      }

      return createJsonResponse({
        status: 'success',
        message: 'Hoja ALERTAS actualizada en tiempo real con ' + rows.length + ' órdenes',
        count: rows.length
      });
    }

    // -----------------------------------------------------------------------
    // ACCIÓN 2: DELETE_ALERTA_OP (Depuración en vivo al liberar o finalizar OP)
    // -----------------------------------------------------------------------
    if (action === 'DELETE_ALERTA_OP') {
      var sheetAlertasDel = ss.getSheetByName(SHEET_ALERTAS);
      var deletedCount = 0;
      if (sheetAlertasDel) {
        var targetOp = String(payload.op || '').trim().toUpperCase().replace('OP-', '');
        var lastRowAl = sheetAlertasDel.getLastRow();
        if (lastRowAl > 1) {
          var vals = sheetAlertasDel.getRange(2, 1, lastRowAl - 1, 1).getValues();
          for (var i = vals.length - 1; i >= 0; i--) {
            var curOp = String(vals[i][0] || '').trim().toUpperCase().replace('OP-', '');
            if (curOp === targetOp) {
              sheetAlertasDel.deleteRow(i + 2);
              deletedCount++;
            }
          }
        }
      }
      return createJsonResponse({
        status: 'success',
        message: 'OP ' + payload.op + ' depurada de la hoja ALERTAS',
        deletedCount: deletedCount
      });
    }

    // -----------------------------------------------------------------------
    // ACCIÓN 3: CREATE_OP (Crear nueva solicitud en BASE_DE_DATOS y Drive)
    // -----------------------------------------------------------------------
    if (action === 'CREATE_OP') {
      var sheetBd = ss.getSheetByName(SHEET_BASE_DATOS) || ss.getSheetByName('01_BASE_DE_DATOS') || ss.getSheets()[0];
      var opData = payload;

      // Guardar imagen en Google Drive si viene en Base64
      var driveUrl = opData.fotoMuestraUrl || opData.evidenciaLinkDrive || '';
      if (opData.imageBase64 && opData.imageBase64.length > 50) {
        driveUrl = saveImageToDrive(opData.imageBase64, 'OP_' + (opData.op || 'NUEVA') + '.jpg');
      }

      var now = new Date();
      var fechaFormatted = opData['FECHA'] || opData.fecha || Utilities.formatDate(now, 'America/Bogota', 'd/M/yyyy HH:mm:ss');
      var inspectorVal = opData['INSPECTOR / OPERARIO'] || opData.inspector || 'OPERARIO STF';
      var telaVal = opData['TELA'] || opData.tela || '';
      var mtVal = opData['CÓDIGO MT'] || opData.codigoMt || opData['CODIGO MT'] || '';
      var colorVal = opData['COLOR'] || opData.color || 'AZUL';
      var opVal = opData['OP'] || opData.op || '';
      var refVal = opData['REFERENCIA'] || opData.referencia || '';
      var rollosVal = Number(opData['ROLLOS'] || opData.rollos || opData.rollo || 1);
      var loteVal = opData['LOTE'] || opData.lote || '1';
      var estadoVal = opData['ESTADO'] || opData.estado || 'SOLICITADO';
      var obsOpVal = opData['OBSERVACIÓN OPERARIO'] || opData.observacionesOperario || opData.observacionOperario || '';
      var obsColVal = opData['OBSERVACIÓN COLFACTORY'] || opData.observacionColfactory || '';
      var evidenciaVal = driveUrl || opData['EVIDENCIA (LINK DRIVE)'] || '';
      var correoVal = opData['CORREO NOTIFICADO'] || opData.correoNotificado || '';
      var obsFinalVal = opData['OBS.OPERARIO FINAL'] || opData.obsOperarioFinal || '';
      var mesNumero = Number(opData['MES'] || opData.mes || (now.getMonth() + 1));

      var newRow = [
        fechaFormatted,
        inspectorVal,
        telaVal,
        mtVal,
        colorVal,
        opVal,
        refVal,
        rollosVal,
        loteVal,
        estadoVal,
        obsOpVal,
        obsColVal,
        evidenciaVal,
        correoVal,
        obsFinalVal,
        mesNumero
      ];

      sheetBd.appendRow(newRow);

      // Consumir OP de la hoja MONITOREO si existía
      if (opVal) {
        removeOpFromMonitoreoSheet(ss, opVal);
      }

      return createJsonResponse({
        status: 'success',
        message: 'Solicitud ' + opVal + ' ingresada correctamente en BASE_DE_DATOS',
        driveUrl: driveUrl
      });
    }

    // -----------------------------------------------------------------------
    // ACCIÓN 4: TRANSFER_OP (Actualizar área, fase e inspector en BASE_DE_DATOS)
    // -----------------------------------------------------------------------
    if (action === 'TRANSFER_OP') {
      var sheetBdTrans = ss.getSheetByName(SHEET_BASE_DATOS) || ss.getSheetByName('01_BASE_DE_DATOS') || ss.getSheets()[0];
      var targetOpTrans = String(payload.op || '').trim().toUpperCase().replace('OP-', '');
      var valuesBdTrans = sheetBdTrans.getDataRange().getValues();
      var foundRowTrans = -1;

      for (var t = 1; t < valuesBdTrans.length; t++) {
        var rowOp = String(valuesBdTrans[t][5] || '').trim().toUpperCase().replace('OP-', '');
        if (rowOp === targetOpTrans) {
          foundRowTrans = t + 1;
          break;
        }
      }

      if (foundRowTrans !== -1) {
        if (payload.nuevoEstado) sheetBdTrans.getRange(foundRowTrans, 10).setValue(payload.nuevoEstado);
        if (payload.nuevoInspector) sheetBdTrans.getRange(foundRowTrans, 2).setValue(payload.nuevoInspector);
        if (payload.observaciones) {
          var prevObs = sheetBdTrans.getRange(foundRowTrans, 11).getValue();
          sheetBdTrans.getRange(foundRowTrans, 11).setValue((prevObs ? prevObs + ' | ' : '') + payload.observaciones);
        }

        return createJsonResponse({
          status: 'success',
          message: 'OP ' + payload.op + ' transferida a fase ' + payload.nuevoEstado
        });
      } else {
        return createJsonResponse({ status: 'error', message: 'OP ' + payload.op + ' no encontrada en BASE_DE_DATOS' });
      }
    }

    // -----------------------------------------------------------------------
    // ACCIÓN 5: UPDATE_DICTAMEN (Dictamen final Aprobado/Rechazado y Finalización)
    // -----------------------------------------------------------------------
    if (action === 'UPDATE_DICTAMEN') {
      var sheetBdDict = ss.getSheetByName(SHEET_BASE_DATOS) || ss.getSheetByName('01_BASE_DE_DATOS') || ss.getSheets()[0];
      var targetOpDict = String(payload.op || '').trim().toUpperCase().replace('OP-', '');
      var valuesBdDict = sheetBdDict.getDataRange().getValues();
      var foundRowDict = -1;

      for (var d = 1; d < valuesBdDict.length; d++) {
        var rOp = String(valuesBdDict[d][5] || '').trim().toUpperCase().replace('OP-', '');
        if (rOp === targetOpDict) {
          foundRowDict = d + 1;
          break;
        }
      }

      if (foundRowDict !== -1) {
        sheetBdDict.getRange(foundRowDict, 10).setValue('FINALIZADO');
        var dictObs = '[DICTAMEN: ' + (payload.dictamen || 'APROBADO') + '] por ' + (payload.inspector || 'AUDITOR STF') + (payload.observacionesTecnicas ? ': ' + payload.observacionesTecnicas : '');
        var curObs = sheetBdDict.getRange(foundRowDict, 11).getValue();
        sheetBdDict.getRange(foundRowDict, 11).setValue((curObs ? curObs + ' | ' : '') + dictObs);

        // Depurar de la hoja ALERTAS si estaba allí
        var sheetAl = ss.getSheetByName(SHEET_ALERTAS);
        if (sheetAl) {
          var alRows = sheetAl.getLastRow();
          if (alRows > 1) {
            var alOps = sheetAl.getRange(2, 1, alRows - 1, 1).getValues();
            for (var a = alOps.length - 1; a >= 0; a--) {
              var aOp = String(alOps[a][0] || '').trim().toUpperCase().replace('OP-', '');
              if (aOp === targetOpDict) {
                sheetAl.deleteRow(a + 2);
              }
            }
          }
        }

        return createJsonResponse({
          status: 'success',
          message: 'Dictamen ' + payload.dictamen + ' registrado y OP finalizada con éxito'
        });
      } else {
        return createJsonResponse({ status: 'error', message: 'OP no encontrada para dictamen' });
      }
    }

    // -----------------------------------------------------------------------
    // ACCIÓN 6: UPDATE_ALERTA_REPORT_SENT (Registrar fecha y hora de envío)
    // -----------------------------------------------------------------------
    if (action === 'UPDATE_ALERTA_REPORT_SENT') {
      var sheetAlRep = ss.getSheetByName(SHEET_ALERTAS);
      if (sheetAlRep) {
        var opsToUpdate = (payload.ops || []).map(function(o) { return String(o).trim().toUpperCase().replace('OP-', ''); });
        var fechaReporte = payload.fechaEnvioReporte || new Date().toLocaleString();
        var lastRowRep = sheetAlRep.getLastRow();
        if (lastRowRep > 1) {
          var opColVals = sheetAlRep.getRange(2, 1, lastRowRep - 1, 1).getValues();
          for (var k = 0; k < opColVals.length; k++) {
            var curClean = String(opColVals[k][0] || '').trim().toUpperCase().replace('OP-', '');
            if (opsToUpdate.indexOf(curClean) !== -1) {
              sheetAlRep.getRange(k + 2, 14).setValue(fechaReporte);
            }
          }
        }
      }
      return createJsonResponse({ status: 'success', message: 'Fecha de reporte actualizada en ALERTAS' });
    }

    // -----------------------------------------------------------------------
    // ACCIÓN 7: DELETE_MONITOREO_OP (Consumir OP de Monitoreo)
    // -----------------------------------------------------------------------
    if (action === 'DELETE_MONITOREO_OP') {
      removeOpFromMonitoreoSheet(ss, payload.op);
      return createJsonResponse({ status: 'success', message: 'OP removida de MONITOREO' });
    }

        // -----------------------------------------------------------------------
    // ACCIÓN 8: SEND_ALERTA_EMAIL (Envío 100% Automático de Correo HTML vía MailApp)
    // -----------------------------------------------------------------------
    if (action === 'SEND_ALERTA_EMAIL') {
      var recipientsList = payload.recipients || [];
      if (!Array.isArray(recipientsList)) {
        recipientsList = String(recipientsList).split(',').map(function(e) { return e.trim(); }).filter(Boolean);
      }
      
      if (recipientsList.length === 0) {
        return createJsonResponse({ status: 'error', message: 'No se especificaron destinatarios' });
      }

      var opsList = payload.ops || [];
      var senderName = payload.senderName || 'EDWIN DIAZ (ADMINISTRADOR)';
      var fechaReporte = payload.fechaReporte || Utilities.formatDate(new Date(), 'America/Bogota', 'd/M/yyyy HH:mm:ss');
      var appUrl = payload.appUrl || 'https://remix-stf-group-quality-control-5.vercel.app/?tab=alertas';
      var subject = payload.subject || ('🚨 [ALERTA SLA - STF GROUP] ' + opsList.length + ' Órdenes de Producción con Retraso');

      // Construcción del cuerpo HTML del correo
      var htmlRows = '';
      for (var r = 0; r < opsList.length; r++) {
        var item = opsList[r];
        var itemOp = item.op || '';
        var itemRef = item.referencia || 'S/R';
        var itemTela = item.tela || '';
        var itemArea = item.areaActual || 'PLANTA';
        var itemDias = item.diasHabiles || 0;
        var retrasoDias = Math.max(0, itemDias - 3);
        var itemObs = item.observacionesOperario || item.observacionesLavanderia || 'En seguimiento';
        var itemColor = item.color || '';
        var itemRollos = item.rollos || 1;

        var rowBg = (r % 2 === 0) ? '#ffffff' : '#f9fafb';
        htmlRows += '<tr style="background-color: ' + rowBg + '; border-bottom: 1px solid #e5e7eb;">';
        htmlRows += '<td style="padding: 10px 8px; font-weight: 900; font-family: monospace; color: #111827;">OP-' + itemOp + '</td>';
        htmlRows += '<td style="padding: 10px 8px; color: #374151;"><strong>' + itemRef + '</strong><br/><span style="font-size: 11px; color: #6b7280;">' + itemTela + ' (' + itemColor + ') - ' + itemRollos + ' rls</span></td>';
        htmlRows += '<td style="padding: 10px 8px; font-size: 11px; color: #4b5563;">' + itemArea + '</td>';
        htmlRows += '<td style="padding: 10px 8px; font-weight: bold; color: #111827; text-align: center;">' + itemDias + ' Días</td>';
        htmlRows += '<td style="padding: 10px 8px; font-weight: 900; color: #dc2626; text-align: center;">+' + retrasoDias + 'd Retraso</td>';
        htmlRows += '<td style="padding: 10px 8px; font-size: 11px; color: #4b5563;">' + itemObs + '</td>';
        htmlRows += '</tr>';
      }

      var htmlBody = '<!DOCTYPE html>' +
        '<html lang="es"><head><meta charset="utf-8"></head><body style="margin: 0; padding: 20px; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">' +
        '<div style="max-width: 720px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">' +
        
        // Header
        '<div style="background: linear-gradient(135deg, #881337 0%, #4c0519 100%); padding: 24px; color: #ffffff; text-align: center;">' +
        '<h1 style="margin: 0; font-size: 22px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;">STF GROUP S.A.</h1>' +
        '<p style="margin: 4px 0 0 0; font-size: 13px; font-weight: bold; color: #fecdd3; letter-spacing: 0.5px;">INFORME OFICIAL DE CALIDAD • ALERTA DE DESVIACIÓN SLA EN PLANTA</p>' +
        '</div>' +

        // Summary Bar
        '<div style="padding: 16px 24px; background-color: #fff1f2; border-bottom: 1px solid #fecdd3;">' +
        '<table style="width: 100%; border-collapse: collapse; font-size: 13px;">' +
        '<tr><td style="padding: 3px 0; color: #9f1239; font-weight: bold;">📊 Órdenes con Retraso:</td><td style="padding: 3px 0; font-weight: 900; color: #881337; text-align: right;">' + opsList.length + ' OP(s) Críticas</td></tr>' +
        '<tr><td style="padding: 3px 0; color: #9f1239; font-weight: bold;">👤 Emitido por:</td><td style="padding: 3px 0; font-weight: bold; color: #111827; text-align: right;">' + senderName + '</td></tr>' +
        '<tr><td style="padding: 3px 0; color: #9f1239; font-weight: bold;">📅 Fecha de Notificación:</td><td style="padding: 3px 0; font-family: monospace; color: #374151; text-align: right;">' + fechaReporte + '</td></tr>' +
        '<tr><td style="padding: 3px 0; color: #9f1239; font-weight: bold;">👥 Destinatarios:</td><td style="padding: 3px 0; font-size: 12px; color: #4b5563; text-align: right;">' + recipientsList.length + ' Contacto(s) Registrados</td></tr>' +
        '</table>' +
        '</div>' +

        // Table Content
        '<div style="padding: 20px 24px;">' +
        '<h2 style="font-size: 13px; font-weight: 900; text-transform: uppercase; color: #881337; margin: 0 0 12px 0; letter-spacing: 0.5px;">📋 Detalle de Órdenes Notificadas</h2>' +
        '<table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">' +
        '<thead>' +
        '<tr style="background-color: #f3f4f6; border-bottom: 2px solid #d1d5db;">' +
        '<th style="padding: 8px; font-weight: 800; color: #374151;">OP</th>' +
        '<th style="padding: 8px; font-weight: 800; color: #374151;">Referencia / Tela</th>' +
        '<th style="padding: 8px; font-weight: 800; color: #374151;">Área</th>' +
        '<th style="padding: 8px; font-weight: 800; color: #374151; text-align: center;">Días</th>' +
        '<th style="padding: 8px; font-weight: 800; color: #dc2626; text-align: center;">Retraso SLA</th>' +
        '<th style="padding: 8px; font-weight: 800; color: #374151;">Observación</th>' +
        '</tr>' +
        '</thead>' +
        '<tbody>' + htmlRows + '</tbody>' +
        '</table>' +
        '</div>' +

        // Action CTA
        '<div style="padding: 10px 24px 24px 24px; text-align: center;">' +
        '<a href="' + appUrl + '" style="display: inline-block; background-color: #881337; color: #ffffff; font-weight: bold; font-size: 13px; text-decoration: none; padding: 12px 28px; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.5px;">🚀 Abrir Sistema de Trazabilidad Colchas</a>' +
        '<p style="margin: 12px 0 0 0; font-size: 11px; color: #6b7280;">Este es un mensaje automático enviado por el Sistema de Control de Calidad STF Group S.A.</p>' +
        '</div>' +

        // Footer
        '<div style="background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 12px 24px; text-align: center; font-size: 11px; color: #6b7280;">' +
        '© 2026 STF GROUP S.A. • Todos los derechos reservados.' +
        '</div>' +

        '</div></body></html>';

      // Envío de correo electrónico a los destinatarios mediante MailApp
      try {
        var toEmailsString = recipientsList.join(',');
        MailApp.sendEmail({
          to: toEmailsString,
          subject: subject,
          htmlBody: htmlBody,
          name: 'ALERTA COLCHAS - STF GROUP'
        });
      } catch (mailErr) {
        console.error('Error enviando correo con MailApp:', mailErr);
      }

      // Actualizar columna 14 en la hoja ALERTAS
      var sheetAlRep = ss.getSheetByName(SHEET_ALERTAS);
      if (sheetAlRep) {
        var opsToUpdate = (opsList || []).map(function(o) { return String(o.op || o).trim().toUpperCase().replace('OP-', ''); });
        var lastRowRep = sheetAlRep.getLastRow();
        if (lastRowRep > 1) {
          var opColVals = sheetAlRep.getRange(2, 1, lastRowRep - 1, 1).getValues();
          for (var k = 0; k < opColVals.length; k++) {
            var curClean = String(opColVals[k][0] || '').trim().toUpperCase().replace('OP-', '');
            if (opsToUpdate.indexOf(curClean) !== -1) {
              sheetAlRep.getRange(k + 2, 14).setValue(fechaReporte + ' (' + recipientsList.length + ' usuarios)');
            }
          }
        }
      }

      return createJsonResponse({
        status: 'success',
        message: 'Correo enviado exitosamente a ' + recipientsList.length + ' destinatario(s)',
        sentCount: recipientsList.length
      });
    }

return createJsonResponse({ status: 'error', message: 'Acción POST no reconocida: ' + action });

  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

/**
 * =========================================================================
 * FUNCIONES AUXILIARES Y FORMATO AUTOMÁTICO
 * =========================================================================
 */

function getTargetSpreadsheet() {
  try {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (e) {
    return SpreadsheetApp.getActiveSpreadsheet();
  }
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function removeOpFromMonitoreoSheet(ss, op) {
  if (!op) return;
  var sheetMon = null;
  var sheets = ss.getSheets();
  for (var s = 0; s < sheets.length; s++) {
    if (sheets[s].getSheetId() === 1356774059 || sheets[s].getName().trim().toUpperCase() === 'MONITOREO') {
      sheetMon = sheets[s];
      break;
    }
  }
  if (!sheetMon) {
    sheetMon = ss.getSheetByName(SHEET_MONITOREO) || ss.getSheetByName('monitoreo');
  }
  if (!sheetMon) return;

  var cleanTarget = String(op).trim().toUpperCase();
  var targetDigits = cleanTarget.replace(/\D/g, '');
  var lastRow = sheetMon.getLastRow();

  if (lastRow > 1) {
    var vals = sheetMon.getRange(2, 1, lastRow - 1, 5).getValues(); // Columnas A a E (TELA, MT, COLOR, OP, REFERENCIA)
    for (var i = vals.length - 1; i >= 0; i--) {
      var rowOp = String(vals[i][3] || '').trim().toUpperCase(); // Columna D: OP
      var rowOpDigits = rowOp.replace(/\D/g, '');
      
      var isMatch = false;
      if (rowOp && cleanTarget && (rowOp === cleanTarget || rowOp.replace('OP-', '') === cleanTarget.replace('OP-', ''))) {
        isMatch = true;
      } else if (targetDigits && rowOpDigits && targetDigits === rowOpDigits && targetDigits !== '') {
        isMatch = true;
      }

      if (isMatch) {
        sheetMon.deleteRow(i + 2);
      }
    }
  }
}

function saveImageToDrive(base64Data, fileName) {
  try {
    var folder = getOrCreateDriveFolder();
    var cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    var decoded = Utilities.base64Decode(cleanBase64);
    var blob = Utilities.newBlob(decoded, 'image/jpeg', fileName);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return 'https://drive.google.com/uc?id=' + file.getId();
  } catch (e) {
    console.error('Error guardando imagen en Google Drive:', e);
    return '';
  }
}

function getOrCreateDriveFolder() {
  var folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  if (folders.hasNext()) {
    return folders.next();
  }
  var newFolder = DriveApp.createFolder(DRIVE_FOLDER_NAME);
  newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return newFolder;
}

function formatAlertasSheetHeader(sheet) {
  var headerRange = sheet.getRange(1, 1, 1, ALERTAS_HEADERS.length);
  headerRange.setBackground('#991b1b'); // Rojo vino institucional
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  headerRange.setFontFamily('Consolas');
  headerRange.setHorizontalAlignment('center');
  headerRange.setVerticalAlignment('middle');
  sheet.setRowHeight(1, 35);
}

function formatAlertasSheetRows(sheet, numRows) {
  var dataRange = sheet.getRange(2, 1, numRows, ALERTAS_HEADERS.length);
  dataRange.setFontFamily('Consolas');
  dataRange.setFontSize(10);
  dataRange.setVerticalAlignment('middle');
  dataRange.setBorder(true, true, true, true, true, true, '#e5e7eb', SpreadsheetApp.BorderStyle.SOLID);
  sheet.getRange(2, 1, numRows, 1).setHorizontalAlignment('center').setFontWeight('bold'); // OP
  sheet.getRange(2, 5, numRows, 1).setHorizontalAlignment('center'); // Metros
  sheet.getRange(2, 7, numRows, 4).setHorizontalAlignment('center'); // Fechas y Días
  sheet.getRange(2, 9, numRows, 1).setFontColor('#dc2626').setFontWeight('bold'); // Días retraso
  for (var col = 1; col <= ALERTAS_HEADERS.length; col++) {
    sheet.autoResizeColumn(col);
  }
}

function syncAlertasFromBaseDeDatos() {
  var ss = getTargetSpreadsheet();
  var sheetBd = ss.getSheetByName(SHEET_BASE_DATOS) || ss.getSheetByName('01_BASE_DE_DATOS') || ss.getSheets()[0];
  var sheetAlertas = ss.getSheetByName(SHEET_ALERTAS);
  if (!sheetAlertas) {
    sheetAlertas = ss.insertSheet(SHEET_ALERTAS);
  }

  var data = sheetBd.getDataRange().getValues();
  if (data.length < 2) return;

  var alertasRows = [];
  var now = new Date();

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var fechaStr = row[0];
    var inspector = row[1];
    var tela = row[2];
    var codigoMt = row[3];
    var color = row[4];
    var op = row[5];
    var ref = row[6];
    var rollos = row[7] || 1;
    var estado = String(row[9] || '').toUpperCase();
    var obsOp = row[10] || '';
    var obsCol = row[11] || '';

    if (!op || estado === 'FINALIZADO') continue;

    var diasHabiles = calcularDiasHabiles(fechaStr, now);
    if (diasHabiles > 3) {
      var excesoSla = diasHabiles - 3;
      var areaActual = mapAreaToTitle(estado);
      var metrosStr = codigoMt ? (String(codigoMt).indexOf('MT') !== -1 ? codigoMt : codigoMt + ' (' + (rollos * 85) + ' MT)') : (rollos * 85) + ' MT';
      
      alertasRows.push([
        op,
        ref || 'S/R',
        tela || '',
        color || 'AZUL',
        metrosStr,
        areaActual,
        fechaStr,
        diasHabiles + ' Días',
        '+' + excesoSla + ' Días',
        (diasHabiles * 12) + 'h',
        inspector || 'CALIDAD ZF',
        obsOp,
        obsCol,
        ''
      ]);
    }
  }

  // Ordenar por mayor retraso
  alertasRows.sort(function(a, b) {
    var dA = parseInt(a[7]) || 0;
    var dB = parseInt(b[7]) || 0;
    return dB - dA;
  });

  var lastRow = sheetAlertas.getLastRow();
  if (lastRow > 1) {
    sheetAlertas.getRange(2, 1, lastRow - 1, Math.max(14, sheetAlertas.getLastColumn())).clearContent();
  }

  sheetAlertas.getRange(1, 1, 1, ALERTAS_HEADERS.length).setValues([ALERTAS_HEADERS]);
  formatAlertasSheetHeader(sheetAlertas);

  if (alertasRows.length > 0) {
    sheetAlertas.getRange(2, 1, alertasRows.length, ALERTAS_HEADERS.length).setValues(alertasRows);
    formatAlertasSheetRows(sheetAlertas, alertasRows.length);
  }

  SpreadsheetApp.getActiveSpreadsheet().toast('✅ Hoja ALERTAS sincronizada con ' + alertasRows.length + ' órdenes retrasadas.', 'STF Group SLA', 5);
}

function calcularDiasHabiles(fechaInicio, fechaFin) {
  if (!fechaInicio) return 0;
  var dInicio = new Date(fechaInicio);
  if (isNaN(dInicio.getTime())) return 0;
  var count = 0;
  var cur = new Date(dInicio.getTime());
  while (cur < fechaFin) {
    cur.setDate(cur.getDate() + 1);
    var day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

function mapAreaToTitle(estado) {
  if (estado.indexOf('LAVAD') !== -1) return 'LAVANDERÍA COLFACTORY ZF';
  if (estado.indexOf('SOLICIT') !== -1) return 'TRÁNSITO / DESPACHO';
  if (estado.indexOf('PRE') !== -1) return 'CALIDAD 2F / ATELIER';
  if (estado.indexOf('CALIDAD') !== -1) return 'CALIDAD STF LABORATORIO';
  return 'PLANTA STF';
}

function formatAllSheets() {
  var ss = getTargetSpreadsheet();
  var sheets = ss.getSheets();
  for (var s = 0; s < sheets.length; s++) {
    var sh = sheets[s];
    sh.setFrozenRows(1);
    for (var c = 1; c <= sh.getLastColumn(); c++) {
      sh.autoResizeColumn(c);
    }
  }
  SpreadsheetApp.getActiveSpreadsheet().toast('✅ Formato profesional aplicado a todas las pestañas.', 'STF Group', 5);
}
