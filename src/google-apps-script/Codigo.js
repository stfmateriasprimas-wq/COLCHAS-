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

// Encabezados oficiales de la pestaña BASE_DE_DATOS (17 Columnas)
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
  "DICTAMEN FINAL",
  "MES"
];

/**
 * Menú interactivo automático dentro de Google Sheets
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 STF GROUP')
    .addItem('⚡ Sincronizar y Alimentar Hoja ALERTAS', 'syncAlertasFromBaseDeDatos')
    .addItem('🗑️ Auto-Eliminar OPs ya Realizadas de MONITOREO', 'cleanMonitoreoMenuAction')
    .addItem('🏷️ Normalizar Prefijos OP (OP-XXXX) en BASE_DE_DATOS', 'normalizeOpCodesMenuAction')
    .addItem('🧹 Dar Formato Profesional a Todas las Hojas', 'formatAllSheets')
    .addItem('📁 Crear / Verificar Carpeta en Google Drive', 'getOrCreateDriveFolder')
    .addToUi();

  // Depuración y normalización automática en segundo plano al abrir la hoja de cálculo
  var ss = getTargetSpreadsheet();
  normalizeAllOpCodesInBaseDeDatos(ss);
  autoCleanMonitoreoFromBaseDeDatos(ss);
}

function normalizeOpCodesMenuAction() {
  var ss = getTargetSpreadsheet();
  var count = normalizeAllOpCodesInBaseDeDatos(ss);
  SpreadsheetApp.getActiveSpreadsheet().toast('✅ Se normalizaron ' + count + ' códigos de OP con prefijo OP- en BASE_DE_DATOS', '🚀 STF GROUP');
}

function cleanMonitoreoMenuAction() {
  var ss = getTargetSpreadsheet();
  var removed = autoCleanMonitoreoFromBaseDeDatos(ss);
  SpreadsheetApp.getActiveSpreadsheet().toast('Se depuraron ' + (removed || 0) + ' OPs de la hoja MONITOREO', '🚀 STF GROUP');
}

/**
 * Disparador onEdit automático: Se activa cada vez que un usuario edita o ingresa datos en la hoja
 * Si se escribe un valor en la columna F (OP) sin el prefijo "OP-", se normaliza instantáneamente.
 */
function onEdit(e) {
  try {
    if (!e || !e.range) return;
    var sheet = e.range.getSheet();
    var sheetName = sheet.getName();
    if (sheetName !== SHEET_BASE_DATOS && sheetName !== '01_BASE_DE_DATOS') return;

    var col = e.range.getColumn();
    var row = e.range.getRow();

    // Columna 6 = Columna F (OP)
    if (col === 6 && row > 1) {
      var val = String(e.value || e.range.getValue() || '').trim();
      if (val && val.toUpperCase() !== 'OP') {
        var formatted = val;
        var upper = val.toUpperCase();
        if (upper.indexOf('OP-') === 0) {
          formatted = 'OP-' + val.substring(3).trim();
        } else if (upper.indexOf('OP') === 0) {
          formatted = 'OP-' + val.substring(2).replace(/^[-_\s]+/, '').trim();
        } else {
          formatted = 'OP-' + val;
        }
        if (formatted !== val) {
          e.range.setValue(formatted);
        }
      }
    }
  } catch (err) {
    console.error('Error en onEdit:', err);
  }
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
    // ACCIÓN DELETE_OP (Eliminación manual en tiempo real de BASE_DE_DATOS y ALERTAS)
    // -----------------------------------------------------------------------
    if (action === 'DELETE_OP') {
      var sheetBdDel = ss.getSheetByName(SHEET_BASE_DATOS) || ss.getSheetByName('01_BASE_DE_DATOS') || ss.getSheets()[0];
      var targetOp = String(payload.op || '').trim().toUpperCase().replace('OP-', '');
      var deletedBd = 0;
      if (sheetBdDel) {
        var lastRowBd = sheetBdDel.getLastRow();
        if (lastRowBd > 1) {
          var valsBd = sheetBdDel.getRange(2, 6, lastRowBd - 1, 1).getValues(); // Columna F = Columna 6 (OP)
          for (var r = valsBd.length - 1; r >= 0; r--) {
            var curOpBd = String(valsBd[r][0] || '').trim().toUpperCase().replace('OP-', '');
            if (curOpBd === targetOp) {
              sheetBdDel.deleteRow(r + 2);
              deletedBd++;
            }
          }
        }
      }

      // También depurar de ALERTAS
      var sheetAlDel = ss.getSheetByName(SHEET_ALERTAS);
      if (sheetAlDel) {
        var lastRowAl = sheetAlDel.getLastRow();
        if (lastRowAl > 1) {
          var valsAl = sheetAlDel.getRange(2, 1, lastRowAl - 1, 1).getValues();
          for (var a = valsAl.length - 1; a >= 0; a--) {
            var curOpAl = String(valsAl[a][0] || '').trim().toUpperCase().replace('OP-', '');
            if (curOpAl === targetOp) {
              sheetAlDel.deleteRow(a + 2);
            }
          }
        }
      }

      return createJsonResponse({
        status: 'success',
        message: 'OP ' + payload.op + ' eliminada permanentemente de Google Sheets',
        deletedCount: deletedBd
      });
    }

    // -----------------------------------------------------------------------
    // ACCIÓN NORMALIZE_ALL_OPS (Normalizar Columna F OP en BASE_DE_DATOS)
    // -----------------------------------------------------------------------
    if (action === 'NORMALIZE_ALL_OPS' || action === 'NORMALIZE_OPS') {
      var normCount = normalizeAllOpCodesInBaseDeDatos(ss);
      return createJsonResponse({
        status: 'success',
        message: 'Normalización completada. Se formatearon ' + normCount + ' celdas con el prefijo OP- en BASE_DE_DATOS',
        normalizedCount: normCount
      });
    }

    // -----------------------------------------------------------------------
    // ACCIÓN 3: CREATE_OP (Crear nueva solicitud en BASE_DE_DATOS y Drive)
    // -----------------------------------------------------------------------
    if (action === 'CREATE_OP') {
      var sheetBd = ss.getSheetByName(SHEET_BASE_DATOS) || ss.getSheetByName('01_BASE_DE_DATOS') || ss.getSheets()[0];
      var opData = payload;
      var rawOp = String(opData['OP'] || opData.op || '').trim();
      var opVal = rawOp.toUpperCase().indexOf('OP-') === 0 ? ('OP-' + rawOp.substring(3).trim()) : (rawOp.toUpperCase().indexOf('OP') === 0 ? ('OP-' + rawOp.substring(2).replace(/^[-_\s]+/, '').trim()) : ('OP-' + rawOp));

      // 1. Guardar imagen en Google Drive y obtener enlace oficial
      var driveUrl = '';
      var photoRaw = opData.fotoMuestraUrl || opData.imageBase64 || opData['EVIDENCIA (LINK DRIVE)'] || '';
      if (photoRaw && photoRaw.length > 50 && photoRaw.indexOf('data:image/') === 0) {
        driveUrl = saveImageToDrive(photoRaw, 'OP_' + (opVal || 'NUEVA') + '.jpg');
      } else if (photoRaw && photoRaw.indexOf('http') === 0) {
        driveUrl = photoRaw;
      }

      var now = new Date();
      var fechaFormatted = opData['FECHA'] || opData.fecha || Utilities.formatDate(now, 'America/Bogota', 'd/M/yyyy HH:mm:ss');
      var inspectorVal = opData['INSPECTOR / OPERARIO'] || opData.inspector || 'OPERARIO STF';
      var telaVal = opData['TELA'] || opData.tela || '';
      var mtVal = opData['CÓDIGO MT'] || opData.codigoMt || opData['CODIGO MT'] || '';
      var colorVal = opData['COLOR'] || opData.color || 'AZUL';
      var refVal = opData['REFERENCIA'] || opData.referencia || '';
      var rollosVal = Number(opData['ROLLOS'] || opData.rollos || opData.rollo || 1);
      var loteVal = opData['LOTE'] || opData.lote || '1';
      var estadoVal = opData['ESTADO'] || opData.estado || 'SOLICITADO';
      var obsOpVal = opData['OBSERVACIÓN OPERARIO'] || opData.observacionesOperario || opData.observacionOperario || '';
      var obsColVal = opData['OBSERVACIÓN COLFACTORY'] || opData.observacionColfactory || '';
      var evidenciaVal = driveUrl || photoRaw || '';
      var obsFinalVal = opData['OBS.OPERARIO FINAL'] || opData.obsOperarioFinal || opData.observacionesCalidad || '';
      var mesNumero = Number(opData['MES'] || opData.mes || (now.getMonth() + 1));

      // 2. Envío de correo electrónico automático a todos los usuarios
      var correoNotificadoStr = '';
      var recipientsList = payload.userEmails || payload.recipients || [];
      if (!Array.isArray(recipientsList) || recipientsList.length === 0) {
        recipientsList = getAllUserEmails(ss);
      }

      if (recipientsList.length > 0) {
        try {
          var appUrl = payload.appUrl || ('https://colchas.vercel.app/?op=' + encodeURIComponent(opVal) + '&view=public');
          var subject = '🧵 [NUEVA COLCHA CREADA] ' + opVal + ' • ' + (refVal || 'S/R') + ' (' + telaVal + ')';
          var htmlBody = buildNewOpEmailHtml(opData, opVal, fechaFormatted, appUrl, driveUrl);

          MailApp.sendEmail({
            to: recipientsList.join(','),
            subject: subject,
            htmlBody: htmlBody,
            name: 'COLCHAS STF GROUP - SISTEMA OFICIAL'
          });

          correoNotificadoStr = Utilities.formatDate(now, 'America/Bogota', 'd/M/yyyy HH:mm:ss') + ' (' + recipientsList.length + ' usuarios)';
        } catch (mailErr) {
          console.error('Error enviando correo de creación:', mailErr);
          correoNotificadoStr = Utilities.formatDate(now, 'America/Bogota', 'd/M/yyyy HH:mm:ss') + ' (Error de envío)';
        }
      }

      var dictVal = payload.dictamenFinal || payload.dictamen || payload.veredicto || '';
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
        correoNotificadoStr,
        obsFinalVal,
        dictVal,
        mesNumero
      ];

      sheetBd.appendRow(newRow);

      // Normalizar columna F (OP) para garantizar el prefijo OP-
      normalizeAllOpCodesInBaseDeDatos(ss);

      // Consumir OP de la hoja MONITOREO automáticamente
      if (opVal) {
        removeOpFromMonitoreoSheet(ss, opVal);
      }
      autoCleanMonitoreoFromBaseDeDatos(ss);

      return createJsonResponse({
        status: 'success',
        message: 'Solicitud ' + opVal + ' ingresada correctamente en BASE_DE_DATOS',
        driveUrl: driveUrl,
        correoNotificado: correoNotificadoStr
      });
    }

    // -----------------------------------------------------------------------
    // ACCIÓN 4: TRANSFER_OP (Actualizar área, fase e historial en BASE_DE_DATOS)
    // NOTA: Columna B (INSPECTOR / OPERARIO CREADOR) se mantiene intacta
    // -----------------------------------------------------------------------
    if (action === 'TRANSFER_OP') {
      var sheetBdTrans = ss.getSheetByName(SHEET_BASE_DATOS) || ss.getSheetByName('01_BASE_DE_DATOS') || ss.getSheets()[0];
      var targetOpTrans = String(payload.op || '').trim().toUpperCase().replace(/^OP-?/, '');
      var valuesBdTrans = sheetBdTrans.getDataRange().getValues();
      var foundRowTrans = -1;

      for (var t = 1; t < valuesBdTrans.length; t++) {
        var rowOp = String(valuesBdTrans[t][5] || '').trim().toUpperCase().replace(/^OP-?/, '');
        if (rowOp === targetOpTrans) {
          foundRowTrans = t + 1;
          break;
        }
      }

      if (foundRowTrans !== -1) {
        // Garantizar que la celda de la OP tenga siempre 'OP-'
        var curOpCell = String(sheetBdTrans.getRange(foundRowTrans, 6).getValue() || '').trim();
        if (curOpCell && curOpCell.toUpperCase().indexOf('OP-') !== 0) {
          sheetBdTrans.getRange(foundRowTrans, 6).setValue('OP-' + curOpCell.replace(/^OP-?/i, '').trim());
        }

        if (payload.nuevoEstado) sheetBdTrans.getRange(foundRowTrans, 10).setValue(payload.nuevoEstado);
        
        // Columna L (OBSERVACIÓN COLFACTORY)
        if (payload.nuevoEstado === 'LAVANDERIA' || payload.observacionColfactory) {
          sheetBdTrans.getRange(foundRowTrans, 12).setValue(payload.observacionColfactory || payload.observaciones || '');
        }

        // Columna O (OBS.OPERARIO FINAL)
        if (payload.nuevoEstado === 'CALIDAD' || payload.nuevoEstado === 'FINALIZADO' || payload.obsOperarioFinal) {
          sheetBdTrans.getRange(foundRowTrans, 15).setValue(payload.obsOperarioFinal || payload.observaciones || '');
        }

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
      var targetOpDict = String(payload.op || '').trim().toUpperCase().replace(/^OP-?/, '');
      var valuesBdDict = sheetBdDict.getDataRange().getValues();
      var foundRowDict = -1;

      for (var d = 1; d < valuesBdDict.length; d++) {
        var rOp = String(valuesBdDict[d][5] || '').trim().toUpperCase().replace(/^OP-?/, '');
        if (rOp === targetOpDict) {
          foundRowDict = d + 1;
          break;
        }
      }

      if (foundRowDict !== -1) {
        // Garantizar que la celda de la OP tenga siempre 'OP-'
        var curOpCellDict = String(sheetBdDict.getRange(foundRowDict, 6).getValue() || '').trim();
        if (curOpCellDict && curOpCellDict.toUpperCase().indexOf('OP-') !== 0) {
          sheetBdDict.getRange(foundRowDict, 6).setValue('OP-' + curOpCellDict.replace(/^OP-?/i, '').trim());
        }

        // Columna J (10): ESTADO = FINALIZADO
        sheetBdDict.getRange(foundRowDict, 10).setValue('FINALIZADO');
        
        // Columna K (11): Historial del flujo
        var dictObs = '[DICTAMEN: ' + (payload.dictamen || 'APROBADO') + '] por ' + (payload.inspector || payload.auditorCalidad || 'AUDITOR STF') + (payload.observacionesTecnicas ? ': ' + payload.observacionesTecnicas : '');
        var curObs = sheetBdDict.getRange(foundRowDict, 11).getValue();
        sheetBdDict.getRange(foundRowDict, 11).setValue((curObs ? curObs + ' | ' : '') + dictObs);

        // Columna M (13): EVIDENCIA (LINK DRIVE) - Preservar ambas fotos (part1 | part2)
        var photoCalidadRaw = payload.fotoCalidadUrl || payload.fotoCalidad || payload.photoUrl || payload.imageBase64 || '';
        if (photoCalidadRaw) {
          var driveCalidadUrl = photoCalidadRaw;
          if (photoCalidadRaw.length > 50 && photoCalidadRaw.indexOf('data:image/') === 0) {
            var savedDUrl = saveImageToDrive(photoCalidadRaw, 'OP_' + targetOpDict + '_CALIDAD.jpg');
            if (savedDUrl) driveCalidadUrl = savedDUrl;
          }
          var curPhotoVal = String(sheetBdDict.getRange(foundRowDict, 13).getValue() || '');
          var part1Val = curPhotoVal.indexOf('|') !== -1 ? curPhotoVal.split('|')[0].trim() : curPhotoVal.trim();
          if (part1Val.length > 22000) part1Val = part1Val.substring(0, 22000);
          if (driveCalidadUrl.length > 22000) driveCalidadUrl = driveCalidadUrl.substring(0, 22000);
          var combinedPhoto = (part1Val ? part1Val + ' | ' : '') + driveCalidadUrl;
          sheetBdDict.getRange(foundRowDict, 13).setValue(combinedPhoto);
        }

        // Columna O (15): OBS.OPERARIO FINAL (solo el texto puro ingresado en Observación Final)
        var pureObs = payload.obsOperarioFinal || payload.observacionesTecnicas || payload.observaciones || '';
        if (pureObs.indexOf('[DICTAMEN:') !== -1) {
          pureObs = pureObs.replace(/^\[DICTAMEN:\s*(APROBADO|RECHAZADO|PENDIENTE)\]\s*/i, '').trim();
        }
        sheetBdDict.getRange(foundRowDict, 15).setValue(pureObs);

        // Columna P (16): DICTAMEN FINAL (APROBADO o RECHAZADO)
        var dictVal = payload.dictamenFinal || payload.dictamen || payload.veredicto || 'APROBADO';
        sheetBdDict.getRange(foundRowDict, 16).setValue(dictVal);

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
          message: 'Dictamen ' + dictVal + ' registrado en Columna P y Observación en Columna O de BASE_DE_DATOS'
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
    // ACCIÓN 8: UPDATE_OP_PHOTO (Guardar o actualizar foto desde móvil / app)
    // -----------------------------------------------------------------------
    if (action === 'UPDATE_OP_PHOTO') {
      var sheetBdPhoto = ss.getSheetByName(SHEET_BASE_DATOS) || ss.getSheetByName('01_BASE_DE_DATOS') || ss.getSheets()[0];
      var targetOpPhoto = String(payload.op || '').trim().toUpperCase().replace(/^OP-?/, '');
      var lastRowBdPhoto = sheetBdPhoto.getLastRow();
      var foundRowPhoto = -1;
      if (lastRowBdPhoto > 1) {
        var opValsPhoto = sheetBdPhoto.getRange(2, 6, lastRowBdPhoto - 1, 1).getValues();
        for (var p = 0; p < opValsPhoto.length; p++) {
          var curCleanOp = String(opValsPhoto[p][0] || '').trim().toUpperCase().replace(/^OP-?/, '');
          if (curCleanOp === targetOpPhoto) {
            foundRowPhoto = p + 2;
            break;
          }
        }
      }

      if (foundRowPhoto !== -1) {
        // Garantizar que la celda de la OP tenga siempre 'OP-'
        var curOpCellPhoto = String(sheetBdPhoto.getRange(foundRowPhoto, 6).getValue() || '').trim();
        if (curOpCellPhoto && curOpCellPhoto.toUpperCase().indexOf('OP-') !== 0) {
          sheetBdPhoto.getRange(foundRowPhoto, 6).setValue('OP-' + curOpCellPhoto.replace(/^OP-?/i, '').trim());
        }

        var photoUrl = payload.fotoCalidadUrl || payload.fotoCalidad || payload.fotoMuestraUrl || payload.photoUrl || '';
        if (payload.imageBase64 && payload.imageBase64.length > 50 && payload.imageBase64.indexOf('data:image/') === 0) {
          var dUrl = saveImageToDrive(payload.imageBase64, 'OP_' + targetOpPhoto + (payload.isCalidad ? '_CALIDAD.jpg' : '_INICIAL.jpg'));
          if (dUrl) photoUrl = dUrl;
        } else if (photoUrl && photoUrl.length > 50 && photoUrl.indexOf('data:image/') === 0) {
          var dUrl2 = saveImageToDrive(photoUrl, 'OP_' + targetOpPhoto + (payload.isCalidad ? '_CALIDAD.jpg' : '_INICIAL.jpg'));
          if (dUrl2) photoUrl = dUrl2;
        }

        var currentPhoto = String(sheetBdPhoto.getRange(foundRowPhoto, 13).getValue() || '');
        var newCol13 = photoUrl;
        if (payload.isCalidad) {
          var part1 = currentPhoto.indexOf('|') !== -1 ? currentPhoto.split('|')[0].trim() : currentPhoto.trim();
          if (part1.length > 22000) part1 = part1.substring(0, 22000);
          if (photoUrl.length > 22000) photoUrl = photoUrl.substring(0, 22000);
          newCol13 = (part1 ? part1 + ' | ' : '') + photoUrl;
        } else {
          var part2 = currentPhoto.indexOf('|') !== -1 ? currentPhoto.split('|')[1].trim() : '';
          if (photoUrl.length > 22000) photoUrl = photoUrl.substring(0, 22000);
          if (part2.length > 22000) part2 = part2.substring(0, 22000);
          newCol13 = photoUrl + (part2 ? ' | ' + part2 : '');
        }

        sheetBdPhoto.getRange(foundRowPhoto, 13).setValue(newCol13);
        if (payload.obsOperarioFinal) {
          sheetBdPhoto.getRange(foundRowPhoto, 15).setValue(payload.obsOperarioFinal);
        }

        return createJsonResponse({
          status: 'success',
          message: 'Foto de OP ' + targetOpPhoto + ' actualizada correctamente',
          driveUrl: photoUrl
        });
      }

      return createJsonResponse({ status: 'error', message: 'OP no encontrada en BASE_DE_DATOS' });
    }

    // -----------------------------------------------------------------------
    // ACCIÓN 9: SEND_OP_EMAIL (Envío dedicado de ficha técnica de OP por correo)
    // -----------------------------------------------------------------------
    if (action === 'SEND_OP_EMAIL') {
      var opValMail = String(payload.op || payload.opNumber || '').trim().toUpperCase();
      if (opValMail && opValMail.indexOf('OP-') !== 0) {
        opValMail = 'OP-' + opValMail.replace(/^OP-?/i, '').trim();
      }
      var recipientsMail = payload.userEmails || payload.recipients || [];
      if (!Array.isArray(recipientsMail) || recipientsMail.length === 0) {
        recipientsMail = getAllUserEmails(ss);
      }

      if (recipientsMail.length === 0) {
        return createJsonResponse({ status: 'error', message: 'No hay destinatarios de correo seleccionados' });
      }

      try {
        var appUrlMail = payload.appUrl || ('https://colchas.vercel.app/?op=' + encodeURIComponent(opValMail) + '&view=public');
        var refValMail = payload.referencia || payload['REFERENCIA'] || 'S/R';
        var telaValMail = payload.tela || payload['TELA'] || 'TELA TEXTIL';
        var nowMail = new Date();
        var fechaFormattedMail = payload.fecha || Utilities.formatDate(nowMail, 'America/Bogota', 'd/M/yyyy HH:mm:ss');
        var subjectMail = '🧵 [FICHA TÉCNICA OP] ' + opValMail + ' • REF: ' + refValMail + ' (' + telaValMail + ')';
        var htmlBodyMail = buildNewOpEmailHtml(payload, opValMail, fechaFormattedMail, appUrlMail, payload.fotoMuestraUrl || payload.driveUrl || '');

        MailApp.sendEmail({
          to: recipientsMail.join(','),
          subject: subjectMail,
          htmlBody: htmlBodyMail,
          name: 'COLCHAS STF GROUP - SISTEMA OFICIAL'
        });

        return createJsonResponse({
          status: 'success',
          message: 'Ficha de ' + opValMail + ' enviada a ' + recipientsMail.length + ' correo(s)',
          recipientsCount: recipientsMail.length
        });
      } catch (errMail) {
        console.error('Error en SEND_OP_EMAIL:', errMail);
        return createJsonResponse({ status: 'error', message: 'Error enviando correo: ' + errMail.toString() });
      }
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
  var cleanTargetNoPrefix = cleanTarget.replace(/^OP-?/, '');
  var targetDigits = cleanTarget.replace(/\D/g, '');
  var lastRow = sheetMon.getLastRow();
  var lastCol = Math.max(5, sheetMon.getLastColumn());

  if (lastRow > 1) {
    var vals = sheetMon.getRange(2, 1, lastRow - 1, lastCol).getValues();
    for (var i = vals.length - 1; i >= 0; i--) {
      var rowVals = vals[i];
      var isMatch = false;

      // Buscar coincidencia en todas las columnas de la fila (OP, TELA, REF)
      for (var c = 0; c < rowVals.length; c++) {
        var cellVal = String(rowVals[c] || '').trim().toUpperCase();
        var cellNoPrefix = cellVal.replace(/^OP-?/, '');
        var cellDigits = cellVal.replace(/\D/g, '');

        if (cellVal && (cellVal === cleanTarget || cellNoPrefix === cleanTargetNoPrefix)) {
          isMatch = true;
          break;
        }
        if (targetDigits && cellDigits && targetDigits === cellDigits && targetDigits.length >= 3) {
          isMatch = true;
          break;
        }
      }

      if (isMatch) {
        sheetMon.deleteRow(i + 2);
      }
    }
  }
}

/**
 * Cruza todas las OPs registradas en BASE_DE_DATOS contra MONITOREO
 * y elimina automáticamente cualquier fila de MONITOREO que ya haya sido ingresada al sistema.
 */
function autoCleanMonitoreoFromBaseDeDatos(ss) {
  try {
    var sheetBd = ss.getSheetByName(SHEET_BASE_DATOS) || ss.getSheetByName('01_BASE_DE_DATOS') || ss.getSheets()[0];
    var sheetMon = getMonitoreoSheet(ss);
    if (!sheetBd || !sheetMon) return 0;

    var lastRowBd = sheetBd.getLastRow();
    if (lastRowBd <= 1) return 0;

    // 1. Obtener listado de todas las OPs registradas en BASE_DE_DATOS (Columna F = index 6)
    var bdValues = sheetBd.getRange(2, 6, lastRowBd - 1, 1).getValues();
    var registeredMap = {};
    for (var b = 0; b < bdValues.length; b++) {
      var opVal = String(bdValues[b][0] || '').trim().toUpperCase();
      if (opVal) {
        registeredMap[opVal] = true;
        registeredMap[opVal.replace(/^OP-?/, '')] = true;
        var digits = opVal.replace(/\D/g, '');
        if (digits) registeredMap[digits] = true;
      }
    }

    // 2. Recorrer MONITOREO y eliminar las OPs coincidentes
    var lastRowMon = sheetMon.getLastRow();
    var lastColMon = Math.max(5, sheetMon.getLastColumn());
    var deletedCount = 0;

    if (lastRowMon > 1) {
      var monValues = sheetMon.getRange(2, 1, lastRowMon - 1, lastColMon).getValues();
      for (var m = monValues.length - 1; m >= 0; m--) {
        var row = monValues[m];
        var isMatch = false;

        for (var c = 0; c < row.length; c++) {
          var cellVal = String(row[c] || '').trim().toUpperCase();
          var cellNoPrefix = cellVal.replace(/^OP-?/, '');
          var cellDigits = cellVal.replace(/\D/g, '');

          if (cellVal && (registeredMap[cellVal] || registeredMap[cellNoPrefix])) {
            isMatch = true;
            break;
          }
          if (cellDigits && cellDigits.length >= 3 && registeredMap[cellDigits]) {
            isMatch = true;
            break;
          }
        }

        if (isMatch) {
          sheetMon.deleteRow(m + 2);
          deletedCount++;
        }
      }
    }

    return deletedCount;
  } catch (e) {
    console.error('Error en autoCleanMonitoreoFromBaseDeDatos:', e);
    return 0;
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
  normalizeAllOpCodesInBaseDeDatos(ss);
  var sheets = ss.getSheets();
  for (var s = 0; s < sheets.length; s++) {
    var sh = sheets[s];
    sh.setFrozenRows(1);
    for (var c = 1; c <= sh.getLastColumn(); c++) {
      sh.autoResizeColumn(c);
    }
  }
  SpreadsheetApp.getActiveSpreadsheet().toast('✅ Formato profesional y normalización de OPs aplicados a todas las pestañas.', 'STF Group', 5);
}

/**
 * Normaliza y formatea todos los códigos de OP en la columna F de BASE_DE_DATOS
 * Garantiza que siempre tengan el prefijo oficial "OP-" (Ej: 5665 -> OP-5665)
 */
function normalizeAllOpCodesInBaseDeDatos(ss) {
  if (!ss) ss = getTargetSpreadsheet();
  var sheetBd = ss.getSheetByName(SHEET_BASE_DATOS) || ss.getSheetByName('01_BASE_DE_DATOS') || ss.getSheets()[0];
  if (!sheetBd) return 0;

  var lastRow = sheetBd.getLastRow();
  if (lastRow <= 1) return 0;

  var range = sheetBd.getRange(2, 6, lastRow - 1, 1); // Columna F (OP)
  var values = range.getValues();
  var updatedCount = 0;

  for (var i = 0; i < values.length; i++) {
    var cellVal = String(values[i][0] || '').trim();
    if (cellVal && cellVal.toUpperCase() !== 'OP') {
      var formatted = cellVal;
      var upper = cellVal.toUpperCase();
      if (upper.indexOf('OP-') === 0) {
        var rest = cellVal.substring(3).trim();
        formatted = 'OP-' + rest;
      } else if (upper.indexOf('OP') === 0) {
        var rest = cellVal.substring(2).replace(/^[-_\s]+/, '').trim();
        formatted = 'OP-' + rest;
      } else {
        formatted = 'OP-' + cellVal;
      }

      if (formatted !== cellVal) {
        values[i][0] = formatted;
        updatedCount++;
      }
    }
  }

  if (updatedCount > 0) {
    range.setValues(values);
  }
  return updatedCount;
}

function getMonitoreoSheet(ss) {
  var sheets = ss.getSheets();
  for (var s = 0; s < sheets.length; s++) {
    if (sheets[s].getSheetId() === 1356774059 || sheets[s].getName().trim().toUpperCase() === 'MONITOREO') {
      return sheets[s];
    }
  }
  return ss.getSheetByName(SHEET_MONITOREO) || ss.getSheetByName('monitoreo');
}

function getAllUserEmails(ss) {
  var emails = [];
  try {
    var userSheet = ss.getSheetByName('USUARIOS') || ss.getSheetByName('DIRECTORIO') || ss.getSheetByName('CONTACTOS');
    if (userSheet) {
      var data = userSheet.getDataRange().getValues();
      for (var r = 0; r < data.length; r++) {
        for (var c = 0; c < data[r].length; c++) {
          var val = String(data[r][c] || '').trim();
          if (val.indexOf('@') !== -1 && val.indexOf('.') !== -1 && emails.indexOf(val) === -1) {
            emails.push(val);
          }
        }
      }
    }
  } catch (e) {
    console.error('Error obteniendo correos de usuarios:', e);
  }

  // Lista de correos corporativos predeterminados del sistema STF si no hay hoja de usuarios
  if (emails.length === 0) {
    emails = [
      'edwin.diaz@stfgroup.com',
      'calidad.textil@stfgroup.com',
      'lavanderia.colfactory@stfgroup.com',
      'planta.colchas@stfgroup.com',
      'auditoria.calidad@stfgroup.com'
    ];
  }
  return emails;
}

function buildNewOpEmailHtml(opData, opVal, fechaFormatted, appUrl, driveUrl) {
  var telaVal = opData['TELA'] || opData.tela || 'TELA INDIGO';
  var mtVal = opData['CÓDIGO MT'] || opData.codigoMt || 'MT-AUTO';
  var colorVal = opData['COLOR'] || opData.color || 'AZUL';
  var refVal = opData['REFERENCIA'] || opData.referencia || 'S/R';
  var rollosVal = Number(opData['ROLLOS'] || opData.rollos || 1);
  var loteVal = opData['LOTE'] || opData.lote || '1';
  var inspectorVal = opData['INSPECTOR / OPERARIO'] || opData.inspector || 'OPERARIO STF';
  var obsOpVal = opData['OBSERVACIÓN OPERARIO'] || opData.observacionesOperario || opData.observacionOperario || 'Sin observaciones registradas';
  var estadoVal = opData['ESTADO'] || opData.estado || 'SOLICITADO';
  var metrajeCalculado = (rollosVal * 85) + ' Metros';

  var imageBlock = '';
  if (driveUrl) {
    imageBlock = '<div style="margin: 20px 0 10px 0; text-align: center; background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 16px;">' +
      '<p style="font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; margin: 0 0 10px 0; letter-spacing: 1px;">📸 EVIDENCIA FOTOGRÁFICA DE MUESTRA TEXTIL</p>' +
      '<a href="' + driveUrl + '" target="_blank" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 10px 20px; border-radius: 10px; text-decoration: none; font-weight: 800; font-size: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">' +
      '🔗 Ver Fotografía en Google Drive / Alta Resolución</a>' +
      '</div>';
  }

  return '<!DOCTYPE html>' +
    '<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>' +
    '<body style="margin: 0; padding: 24px 12px; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">' +
    '<div style="max-width: 640px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); border: 1px solid #334155;">' +
    
    // Header Corporativo STF GROUP
    '<div style="background: linear-gradient(135deg, #09090b 0%, #18181b 50%, #27272a 100%); padding: 28px 24px; text-align: center; border-bottom: 3px solid #e11d48;">' +
    '<h1 style="margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 3px; color: #ffffff; text-transform: uppercase;">STF GROUP S.A.</h1>' +
    '<div style="margin: 8px 0 0 0; display: inline-block;">' +
    '<span style="font-size: 11px; font-weight: 800; color: #f43f5e; letter-spacing: 1.5px; text-transform: uppercase;">STUDIO F</span>' +
    '<span style="color: #71717a; margin: 0 8px;">•</span>' +
    '<span style="font-size: 11px; font-weight: 800; color: #38bdf8; letter-spacing: 1.5px; text-transform: uppercase;">ELA</span>' +
    '<span style="color: #71717a; margin: 0 8px;">•</span>' +
    '<span style="font-size: 11px; font-weight: 800; color: #e2e8f0; letter-spacing: 1.5px; text-transform: uppercase;">STUDIO F MAN</span>' +
    '</div>' +
    '<p style="margin: 12px 0 0 0; font-size: 12px; font-weight: 700; color: #a1a1aa; letter-spacing: 0.5px; text-transform: uppercase;">SISTEMA INTEGRAL DE CONTROL DE CALIDAD DE COLCHAS</p>' +
    '</div>' +

    // OP Summary Banner
    '<div style="background-color: #fff1f2; padding: 18px 24px; border-bottom: 1px solid #ffe4e6;">' +
    '<table style="width: 100%; border-collapse: collapse;">' +
    '<tr>' +
    '<td style="vertical-align: middle;">' +
    '<span style="font-size: 11px; font-weight: 800; color: #9f1239; text-transform: uppercase; font-family: monospace;">ORDEN DE PRODUCCIÓN</span><br>' +
    '<span style="font-size: 22px; font-weight: 900; color: #881337; font-family: monospace; letter-spacing: 1px;">' + opVal + '</span>' +
    '</td>' +
    '<td style="text-align: right; vertical-align: middle;">' +
    '<span style="display: inline-block; background-color: #881337; color: #ffffff; padding: 6px 14px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; font-family: monospace;">' + estadoVal.replace('_', ' ') + '</span>' +
    '</td>' +
    '</tr>' +
    '</table>' +
    '</div>' +

    // Ficha Técnica Completa
    '<div style="padding: 24px;">' +
    '<h2 style="font-size: 12px; font-weight: 900; text-transform: uppercase; color: #0f172a; margin: 0 0 14px 0; letter-spacing: 1px; font-family: monospace;">📋 ESPECIFICACIONES TÉCNICAS DE LA MUESTRA</h2>' +
    
    '<table style="width: 100%; border-collapse: collapse; font-size: 12px; background-color: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">' +
    '<tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 10px 14px; font-weight: 700; color: #64748b; width: 35%;">Referencia STF:</td><td style="padding: 10px 14px; font-weight: 900; color: #0f172a; font-family: monospace;">' + refVal + '</td></tr>' +
    '<tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 10px 14px; font-weight: 700; color: #64748b;">Tela Textil:</td><td style="padding: 10px 14px; font-weight: 900; color: #0f172a;">' + telaVal + '</td></tr>' +
    '<tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 10px 14px; font-weight: 700; color: #64748b;">Código MT / Color:</td><td style="padding: 10px 14px; font-weight: 800; color: #0f172a; font-family: monospace;">' + mtVal + ' • ' + colorVal + '</td></tr>' +
    '<tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 10px 14px; font-weight: 700; color: #64748b;">Rollos / Metraje:</td><td style="padding: 10px 14px; font-weight: 800; color: #0f172a;">' + rollosVal + ' Rollos (' + metrajeCalculado + ') • Lote: ' + loteVal + '</td></tr>' +
    '<tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 10px 14px; font-weight: 700; color: #64748b;">Inspector / Origen:</td><td style="padding: 10px 14px; font-weight: 800; color: #0f172a;">' + inspectorVal + '</td></tr>' +
    '<tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 10px 14px; font-weight: 700; color: #64748b;">Fecha de Registro:</td><td style="padding: 10px 14px; font-weight: 700; color: #334155; font-family: monospace;">' + fechaFormatted + '</td></tr>' +
    '<tr><td style="padding: 10px 14px; font-weight: 700; color: #64748b; vertical-align: top;">Observaciones:</td><td style="padding: 10px 14px; color: #334155; font-style: italic; line-height: 1.4;">' + obsOpVal + '</td></tr>' +
    '</table>' +

    imageBlock +

    // CTA Botón Interactivo
    '<div style="margin-top: 24px; text-align: center;">' +
    '<a href="' + appUrl + '" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); color: #ffffff; padding: 14px 32px; border-radius: 12px; font-size: 13px; font-weight: 900; text-decoration: none; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 12px rgba(225, 29, 72, 0.3);">' +
    '📱 Abrir Ficha Interactiva en Tiempo Real</a>' +
    '<p style="margin: 10px 0 0 0; font-size: 11px; color: #64748b;">Acceso directo compatible con smartphones, tablets y computadores de escritorio.</p>' +
    '</div>' +

    '</div>' +

    // Footer Institucional
    '<div style="background-color: #f1f5f9; padding: 16px 24px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #64748b;">' +
    '<p style="margin: 0; font-weight: 700;">STF GROUP S.A. — Planta y Laboratorio de Control Textil</p>' +
    '<p style="margin: 4px 0 0 0; font-size: 10px; color: #94a3b8;">Mensaje corporativo automatizado emitido por el Sistema de Calidad de Colchas.</p>' +
    '</div>' +

    '</div></body></html>';
}
