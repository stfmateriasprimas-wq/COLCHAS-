/**
 * =========================================================================
 * STF GROUP S.A. - CONTROL DE CALIDAD DE COLCHAS & TRAZABILIDAD TEXTIL
 * SCRIPT MAESTRO INTEGRAL DE INTEGRACIÓN BIDIRECCIONAL, DRIVE Y 3 FLUJOS DE CORREO
 * =========================================================================
 * ID de Hoja de Cálculo: 1jTM8OG2u3bO9Cyrlyn3DJSnGcyLOzA8EWwxwOyWgXdc
 * Carpeta Oficial Google Drive: STF_COLCHAS_EVIDENCIAS (Mi Unidad)
 *
 * LOS 3 FLUJOS DE CORREO AUTOMATIZADOS:
 * - Flujo A: Envío Inmediato al Registrar Nueva Colcha (Ficha Técnica + Foto 1 Drive)
 * - Flujo B: Envío Matutino Automático Diario a las 7:00 AM (Alertas SLA > 3 Días)
 * - Flujo C: Envío Inmediato al Dictaminar / Liberar OP (Aprobado/Rechazado + Foto 2 Drive)
 * =========================================================================
 */

var SPREADSHEET_ID = "1jTM8OG2u3bO9Cyrlyn3DJSnGcyLOzA8EWwxwOyWgXdc";
var SHEET_BASE_DATOS = "BASE_DE_DATOS";
var SHEET_ALERTAS = "ALERTAS";
var SHEET_MONITOREO = "MONITOREO";
var DRIVE_FOLDER_NAME = "STF_COLCHAS_EVIDENCIAS";
var TARGET_DRIVE_FOLDER_ID = ""; // Opcional: ID de carpeta específica en Drive
var TARGET_DRIVE_SPREADSHEET_OR_FOLDER_ID = "";

var ALERTAS_HEADERS = [
  "OP", "REFERENCIA", "TELA", "COLOR", "METROS (MT)", "AREA ACTUAL",
  "FECHA SOLICITUD", "DÍAS HÁBILES EN ÁREA", "DÍAS RETRASO (>3 DÍAS)",
  "HORAS HÁBILES", "SOLICITANTE / RESPONSABLE", "OBS. OPERARIO",
  "OBS. LAVANDERÍA", "FECHA ENVIO REPORTE"
];

var BASE_DATOS_HEADERS = [
  "FECHA", "INSPECTOR / OPERARIO", "TELA", "CÓDIGO MT", "COLOR", "OP",
  "REFERENCIA", "ROLLOS", "LOTE", "ESTADO", "OBSERVACIÓN OPERARIO",
  "OBSERVACIÓN COLFACTORY", "EVIDENCIA (LINK DRIVE)", "CORREO NOTIFICADO",
  "OBS.OPERARIO FINAL", "DICTAMEN FINAL", "MES"
];

/**
 * Función Maestra para Conceder y Autorizar TODOS los Permisos de Google:
 * 1. Google Sheets (SpreadsheetApp)
 * 2. Google Drive (DriveApp)
 * 3. Correo Electrónico (MailApp)
 * 4. Activadores Automáticos / Triggers (ScriptApp)
 */
function autorizarTodosLosPermisosSTF() {
  var ss = getTargetSpreadsheet();
  var ssName = ss.getName();
  var root = getRootDriveFolder();
  var rootName = root.getName();
  var quota = MailApp.getRemainingDailyQuota();
  var triggers = ScriptApp.getProjectTriggers();

  Logger.log('✅ Permisos 100% Autorizados:');
  Logger.log('   - Google Sheets: ' + ssName);
  Logger.log('   - Google Drive: ' + rootName);
  Logger.log('   - MailApp (Cuota restante diaria: ' + quota + ')');
  Logger.log('   - ScriptApp (Activadores: ' + triggers.length + ')');
}

function forzarAutorizacionDrive() {
  autorizarTodosLosPermisosSTF();
}

/**
 * Menú interactivo automático dentro de Google Sheets
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 STF GROUP')
    .addItem('⚡ Sincronizar y Alimentar Hoja ALERTAS', 'syncAlertasFromBaseDeDatos')
    .addItem('👥 Ver Destinatarios de la Hoja USUARIOS', 'verUsuariosMenuAction')
    .addItem('📧 Enviar Correo de Prueba (Verificar Conexión)', 'probarPermisosYEnvioCorreo')
    .addItem('🚨 Enviar Reporte Matutino SLA Ahora Mismo', 'enviarReporteDiarioAutomaticoSLA')
    .addItem('⏰ Programar Envío Automático Diario (7:00 AM)', 'instalarActivadorDiario7AM')
    .addItem('🗑️ Auto-Eliminar OPs ya Realizadas de MONITOREO', 'cleanMonitoreoMenuAction')
    .addItem('🏷️ Normalizar Prefijos OP (OP-XXXX) en BASE_DE_DATOS', 'normalizeOpCodesMenuAction')
    .addItem('🔗 Unificar Links de Drive a Carpeta Única (Columna M)', 'unificarLinksDriveMenuAction')
    .addItem('✨ Depurar y Limpiar Columnas K, L, M y N', 'cleanColumnsKLMNMenuAction')
    .addItem('🧹 Dar Formato Profesional a Todas las Hojas', 'formatAllSheets')
    .addItem('🖼️ Depurar Fotos Duplicadas en Drive (Dejar estrictamente 2 fotos por OP)', 'cleanDuplicatesDriveMenuAction')
    .addItem('📁 Crear / Verificar Estructura en Google Drive (Mes y OPs)', 'verifyAndBuildDriveStructureMenuAction')
    .addToUi();

  var ss = getTargetSpreadsheet();
  normalizeAllOpCodesInBaseDeDatos(ss);
  autoCleanMonitoreoFromBaseDeDatos(ss);
  cleanColumnsKLMN(ss);
}

function unificarLinksDriveMenuAction() {
  var ss = getTargetSpreadsheet();
  var count = cleanColumnsKLMN(ss);
  SpreadsheetApp.getActiveSpreadsheet().toast('✅ Se unificaron los enlaces de Drive a carpeta única por OP en Columna M (' + count + ' filas procesadas)', '🚀 STF GROUP', 6);
}

function verifyAndBuildDriveStructureMenuAction() {
  try {
    var root = getRootDriveFolder();
    var month = getMonthDriveFolder(root, new Date());
    var opDemo = getOpDriveFolder(month, 'OP-DEMO');
    SpreadsheetApp.getActiveSpreadsheet().toast('✅ Estructura Drive lista: ' + root.getName() + ' > ' + month.getName(), '🚀 STF GROUP', 6);
  } catch (e) {
    SpreadsheetApp.getActiveSpreadsheet().toast('⚠️ Error Drive: ' + e.toString(), '🚀 STF GROUP', 8);
  }
}

function cleanColumnsKLMNMenuAction() {
  var ss = getTargetSpreadsheet();
  var count = cleanColumnsKLMN(ss);
  SpreadsheetApp.getActiveSpreadsheet().toast('✅ Se depuraron y limpiaron ' + count + ' filas en columnas K, L, M y N', '🚀 STF GROUP', 5);
}

function normalizeOpCodesMenuAction() {
  var ss = getTargetSpreadsheet();
  var count = normalizeAllOpCodesInBaseDeDatos(ss);
  SpreadsheetApp.getActiveSpreadsheet().toast('✅ Se normalizaron ' + count + ' códigos de OP con prefijo OP-', '🚀 STF GROUP', 5);
}

function cleanMonitoreoMenuAction() {
  var ss = getTargetSpreadsheet();
  var removed = autoCleanMonitoreoFromBaseDeDatos(ss);
  SpreadsheetApp.getActiveSpreadsheet().toast('Se depuraron ' + (removed || 0) + ' OPs de la hoja MONITOREO', '🚀 STF GROUP', 5);
}

function verUsuariosMenuAction() {
  var ss = getTargetSpreadsheet();
  var userSheet = getUsuariosSheet(ss);
  var emails = getAllUserEmails(ss);
  var ui = SpreadsheetApp.getUi();

  var sheetInfo = userSheet
    ? ('Hoja detectada: "' + userSheet.getName() + '" (GID: ' + userSheet.getSheetId() + ')')
    : '⚠️ Pestaña USUARIOS no detectada';

  var preview = emails.length > 0 
    ? emails.map(function (m, idx) { return (idx + 1) + '. ' + m; }).join('\n')
    : '⚠️ No hay correos registrados en la Columna E ("CORREO ELECTRÓNICO") de la hoja USUARIOS.\n(Si dejas celdas vacías, el sistema no enviará correos a esas personas).';

  ui.alert(
    '👥 Destinatarios Activos (Columna E - Hoja USUARIOS)',
    sheetInfo + '\n' +
    'Total de correos activos configurados en Columna E: ' + emails.length + '\n\n' +
    'Lista de correos leídos en tiempo real para envíos automáticos:\n' + preview,
    ui.ButtonSet.OK
  );
}

function onEdit(e) {
  try {
    if (!e || !e.range) return;
    var sheet = e.range.getSheet();
    var sheetName = sheet.getName();
    if (sheetName !== SHEET_BASE_DATOS && sheetName !== '01_BASE_DE_DATOS') return;
    if (e.range.getColumn() === 6 && e.range.getRow() > 1) {
      var val = String(e.value || e.range.getValue() || '').trim();
      if (val && val.toUpperCase() !== 'OP') {
        var formatted = val.toUpperCase().indexOf('OP-') === 0 ? ('OP-' + val.substring(3).trim()) : (val.toUpperCase().indexOf('OP') === 0 ? ('OP-' + val.substring(2).replace(/^[-_\s]+/, '').trim()) : ('OP-' + val));
        if (formatted !== val) e.range.setValue(formatted);
      }
    }
  } catch (err) {
    console.error('Error en onEdit:', err);
  }
}

/**
 * =========================================================================
 * ENDPOINT GET (Lectura en tiempo real)
 * =========================================================================
 */
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'GET_MONITOREO';
    var ss = getTargetSpreadsheet();

    if (action === 'GET_MONITOREO') {
      var sheetMon = getMonitoreoSheet(ss);
      if (!sheetMon) return createJsonResponse({ status: 'error', message: 'Hoja MONITOREO no encontrada' });
      var values = sheetMon.getDataRange().getValues();
      var items = [];
      for (var i = 1; i < values.length; i++) {
        var rawTela = String(values[i][0] || '').trim();
        if (rawTela && rawTela.toUpperCase() !== 'TELA') {
          items.push({
            tela: rawTela,
            mt: String(values[i][1] || 'MT-AUTO').trim(),
            color: String(values[i][2] || 'AZUL').trim(),
            op: String(values[i][3] || '').trim(),
            referencia: String(values[i][4] || '').trim()
          });
        }
      }
      return createJsonResponse({ status: 'success', count: items.length, data: items });
    }

    if (action === 'GET_BASE_DATOS') {
      var sheetBd = ss.getSheetByName(SHEET_BASE_DATOS) || ss.getSheetByName('01_BASE_DE_DATOS') || ss.getSheets()[0];
      return createJsonResponse({ status: 'success', totalRows: sheetBd.getLastRow(), data: sheetBd.getDataRange().getValues() });
    }

    if (action === 'GET_ALERTAS') {
      var sheetAl = ss.getSheetByName(SHEET_ALERTAS);
      if (!sheetAl) return createJsonResponse({ status: 'success', count: 0, data: [] });
      return createJsonResponse({ status: 'success', totalRows: sheetAl.getLastRow(), data: sheetAl.getDataRange().getValues() });
    }

    // RESOLUCIÓN EN VIVO DE FOTOGRAFÍAS DE OP DESDE DRIVE (PARA QR Y MÓVILES)
    if (action === 'GET_OP_PHOTOS') {
      var targetOpParam = (e && e.parameter && e.parameter.op) ? e.parameter.op : '';
      if (!targetOpParam) return createJsonResponse({ status: 'error', message: 'Falta parámetro op' });
      var cleanTargetOp = String(targetOpParam).trim().toUpperCase();
      if (cleanTargetOp.indexOf('OP-') !== 0) cleanTargetOp = 'OP-' + cleanTargetOp.replace(/^OP-?/i, '').trim();

      var photosFound = getOpPhotosFromDrive(cleanTargetOp);

      // Auto-reparar Columna M en BASE_DE_DATOS con el enlace oficial clickeable a la carpeta de Drive de la OP
      if (photosFound.foto1 || photosFound.foto2 || photosFound.folderUrl) {
        try {
          var shBdGet = ss.getSheetByName(SHEET_BASE_DATOS) || ss.getSheetByName('01_BASE_DE_DATOS') || ss.getSheets()[0];
          if (shBdGet && shBdGet.getLastRow() > 1) {
            var bdVals = shBdGet.getRange(2, 6, shBdGet.getLastRow() - 1, 1).getValues();
            var targetPure = cleanTargetOp.replace(/^OP-?/, '');
            for (var b = 0; b < bdVals.length; b++) {
              if (String(bdVals[b][0] || '').trim().toUpperCase().replace(/^OP-?/, '') === targetPure) {
                var newColM = photosFound.folderUrl || photosFound.foto1 || photosFound.foto2 || '';
                if (newColM) {
                  shBdGet.getRange(b + 2, 13).setValue(newColM);
                }
                break;
              }
            }
          }
        } catch (eBdFix) {}
      }

      return createJsonResponse({
        status: 'success',
        op: cleanTargetOp,
        foto1: photosFound.foto1,
        foto2: photosFound.foto2,
        folderUrl: photosFound.folderUrl
      });
    }

    return createJsonResponse({ status: 'error', message: 'Acción GET no reconocida: ' + action });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

/**
 * =========================================================================
 * ENDPOINT POST (Escritura, Transferencias, Dictámenes y Fotos en Drive)
 * =========================================================================
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData ? e.postData.contents : '{}');
    var action = data.action;
    var payload = data.payload || {};
    var ss = getTargetSpreadsheet();

    // 1. SYNC_ALERTAS
    if (action === 'SYNC_ALERTAS') {
      var sheetAlertas = ss.getSheetByName(SHEET_ALERTAS) || ss.insertSheet(SHEET_ALERTAS);
      var lastRow = sheetAlertas.getLastRow();
      if (lastRow > 1) sheetAlertas.getRange(2, 1, lastRow - 1, Math.max(14, sheetAlertas.getLastColumn())).clearContent();
      sheetAlertas.getRange(1, 1, 1, ALERTAS_HEADERS.length).setValues([ALERTAS_HEADERS]);
      formatAlertasSheetHeader(sheetAlertas);

      var rows = payload.rows || [];
      if (rows.length > 0) {
        var matrix = rows.map(function (r) {
          return [
            r.op || '', r.referencia || '', r.tela || '', r.color || '', r.metros || '',
            r.areaActual || '', r.fechaSolicitud || '', r.diasHabiles || '', r.diasRetraso || '',
            r.horasHabiles || '', r.responsable || '', r.obsOperario || '', r.obsLavanderia || '',
            r.fechaEnvioReporte || ''
          ];
        });
        sheetAlertas.getRange(2, 1, matrix.length, ALERTAS_HEADERS.length).setValues(matrix);
        formatAlertasSheetRows(sheetAlertas, matrix.length);
      }
      return createJsonResponse({ status: 'success', message: 'Hoja ALERTAS sincronizada con ' + rows.length + ' órdenes', count: rows.length });
    }

    // 2. DELETE_ALERTA_OP
    if (action === 'DELETE_ALERTA_OP') {
      var shAlDel = ss.getSheetByName(SHEET_ALERTAS);
      var deletedCount = 0;
      if (shAlDel && shAlDel.getLastRow() > 1) {
        var tOp = String(payload.op || '').trim().toUpperCase().replace(/^OP-?/, '');
        var vAl = shAlDel.getRange(2, 1, shAlDel.getLastRow() - 1, 1).getValues();
        for (var i = vAl.length - 1; i >= 0; i--) {
          if (String(vAl[i][0] || '').trim().toUpperCase().replace(/^OP-?/, '') === tOp) {
            shAlDel.deleteRow(i + 2);
            deletedCount++;
          }
        }
      }
      return createJsonResponse({ status: 'success', deletedCount: deletedCount });
    }

    // 3. DELETE_OP
    if (action === 'DELETE_OP') {
      var shBdDel = ss.getSheetByName(SHEET_BASE_DATOS) || ss.getSheetByName('01_BASE_DE_DATOS') || ss.getSheets()[0];
      var targetOpDel = String(payload.op || '').trim().toUpperCase().replace(/^OP-?/, '');
      var deletedBd = 0;
      if (shBdDel && shBdDel.getLastRow() > 1) {
        var vBd = shBdDel.getRange(2, 6, shBdDel.getLastRow() - 1, 1).getValues();
        for (var r = vBd.length - 1; r >= 0; r--) {
          if (String(vBd[r][0] || '').trim().toUpperCase().replace(/^OP-?/, '') === targetOpDel) {
            shBdDel.deleteRow(r + 2);
            deletedBd++;
          }
        }
      }
      var shAl = ss.getSheetByName(SHEET_ALERTAS);
      if (shAl && shAl.getLastRow() > 1) {
        var vAlDel = shAl.getRange(2, 1, shAl.getLastRow() - 1, 1).getValues();
        for (var a = vAlDel.length - 1; a >= 0; a--) {
          if (String(vAlDel[a][0] || '').trim().toUpperCase().replace(/^OP-?/, '') === targetOpDel) shAl.deleteRow(a + 2);
        }
      }
      return createJsonResponse({ status: 'success', deletedCount: deletedBd });
    }

    // 4. NORMALIZE_ALL_OPS
    if (action === 'NORMALIZE_ALL_OPS' || action === 'NORMALIZE_OPS') {
      var normCount = normalizeAllOpCodesInBaseDeDatos(ss);
      return createJsonResponse({ status: 'success', normalizedCount: normCount });
    }

    // -----------------------------------------------------------------------
    // ACCIÓN 5: CREATE_OP (FLUJO A: Notificación Automática de Nueva Colcha)
    // -----------------------------------------------------------------------
    if (action === 'CREATE_OP') {
      var sheetBd = ss.getSheetByName(SHEET_BASE_DATOS) || ss.getSheetByName('01_BASE_DE_DATOS') || ss.getSheets()[0];
      var opData = payload;
      var rawOp = String(opData['OP'] || opData.op || '').trim();
      var opVal = rawOp.toUpperCase().indexOf('OP-') === 0 ? ('OP-' + rawOp.substring(3).trim()) : (rawOp.toUpperCase().indexOf('OP') === 0 ? ('OP-' + rawOp.substring(2).replace(/^[-_\s]+/, '').trim()) : ('OP-' + rawOp));

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

      // Guardar Foto 1 en Google Drive (Mes / OP)
      var driveUrl = '';
      var savedPhotoRes = null;
      var photoRaw = opData.fotoMuestraUrl || opData.imageBase64 || opData['EVIDENCIA (LINK DRIVE)'] || '';
      var fileNameInitial = opVal + '_MUESTRA_INICIAL.jpg';
      if (photoRaw && photoRaw.length > 50 && photoRaw.indexOf('data:image/') === 0) {
        savedPhotoRes = saveImageToDriveHierarchical(photoRaw, fileNameInitial, opVal, now);
        if (savedPhotoRes && savedPhotoRes.driveUrl) driveUrl = savedPhotoRes.driveUrl;
      } else if (photoRaw && photoRaw.indexOf('http') === 0) {
        driveUrl = photoRaw;
      }

      var rawObsOp = String(opData['OBSERVACIÓN OPERARIO'] || opData.observacionesOperario || opData.observacionOperario || '').trim();
      var obsOpVal = (rawObsOp.indexOf(' | ') !== -1 ? rawObsOp.split(' | ')[0].trim() : rawObsOp).replace(/^\[[^\]]+\]:\s*/, '').trim();

      var rawObsCol = String(opData['OBSERVACIÓN COLFACTORY'] || opData.observacionColfactory || opData.observacionesLavanderia || payload['OBSERVACIÓN COLFACTORY'] || payload.observacionColfactory || payload.observacionesLavanderia || '').trim();
      var obsColVal = '';
      if (rawObsCol && rawObsCol.toLowerCase().indexOf('colcha recibida') === -1 && rawObsCol.indexOf('[LAVANDERIA]') === -1) {
        obsColVal = rawObsCol.indexOf(' | ') !== -1 ? rawObsCol.split(' | ')[0].trim() : rawObsCol;
      }

      // Columna M (13 - EVIDENCIA): Guardar enlace directo clickeable de la carpeta de Drive de la OP
      var evidenciaVal = (savedPhotoRes && savedPhotoRes.folderUrl) ? savedPhotoRes.folderUrl : ((savedPhotoRes && savedPhotoRes.driveUrl) ? savedPhotoRes.driveUrl : (driveUrl || ''));
      
      // La Columna E de la hoja USUARIOS es la FUENTE MAESTRA DE LA VERDAD
      var userSheetRef = getUsuariosSheet(ss);
      var recipientsList = [];
      if (userSheetRef) {
        recipientsList = getAllUserEmails(ss);
      } else {
        recipientsList = payload.userEmails || payload.recipients || [];
      }

      var cleanEmailArray = (recipientsList || []).map(function (e) { return String(e).trim().toLowerCase(); }).filter(function (e) { return e.indexOf('@') !== -1; });
      var uniqueEmails = [];
      for (var u = 0; u < cleanEmailArray.length; u++) {
        if (uniqueEmails.indexOf(cleanEmailArray[u]) === -1) uniqueEmails.push(cleanEmailArray[u]);
      }
      var correoNotificadoStr = uniqueEmails.join(', ');

      // FLUJO A: Envío automático inmediato por correo de la nueva OP
      if (uniqueEmails.length > 0) {
        try {
          var appUrl = payload.appUrl || ('https://colchas.vercel.app/?op=' + encodeURIComponent(opVal) + '&view=public');
          MailApp.sendEmail({
            to: uniqueEmails.join(','),
            subject: '🧵 [NUEVA COLCHA CREADA] ' + opVal + ' • ' + (refVal || 'S/R') + ' (' + telaVal + ')',
            htmlBody: buildNewOpEmailHtml(opData, opVal, fechaFormatted, appUrl, driveUrl),
            name: 'COLCHAS STF GROUP - SISTEMA OFICIAL'
          });
        } catch (mailErr) {
          console.error('Error enviando correo creación:', mailErr);
        }
      }

      var obsFinalVal = opData['OBS.OPERARIO FINAL'] || opData.obsOperarioFinal || opData.observacionesCalidad || '';
      var mesNumero = Number(opData['MES'] || opData.mes || (now.getMonth() + 1));
      var dictVal = payload.dictamenFinal || payload.dictamen || payload.veredicto || '';

      var newRow = [
        fechaFormatted, inspectorVal, telaVal, mtVal, colorVal, opVal,
        refVal, rollosVal, loteVal, estadoVal, obsOpVal, obsColVal,
        evidenciaVal, correoNotificadoStr, obsFinalVal, dictVal, mesNumero
      ];

      sheetBd.appendRow(newRow);
      normalizeAllOpCodesInBaseDeDatos(ss);
      if (opVal) removeOpFromMonitoreoSheet(ss, opVal);
      autoCleanMonitoreoFromBaseDeDatos(ss);

      return createJsonResponse({
        status: 'success',
        message: 'Solicitud ' + opVal + ' ingresada correctamente en BASE_DE_DATOS y archivada en Drive',
        driveUrl: driveUrl,
        folderUrl: (savedPhotoRes && savedPhotoRes.folderUrl) ? savedPhotoRes.folderUrl : '',
        correoNotificado: correoNotificadoStr
      });
    }

    // 6. ACCIÓN: UPDATE_COLFACTORY_OBS (Actualización Directa de Observación de Lavandería en Columna L)
    if (action === 'UPDATE_COLFACTORY_OBS' || action === 'UPDATE_LAVANDERIA_OBS') {
      var sheetBdCol = ss.getSheetByName(SHEET_BASE_DATOS) || ss.getSheetByName('01_BASE_DE_DATOS') || ss.getSheets()[0];
      var targetOpCol = String(payload.op || '').trim().toUpperCase().replace(/^OP-?/, '');
      var valuesBdCol = sheetBdCol.getDataRange().getValues();
      var foundRowCol = -1;

      for (var tc = 1; tc < valuesBdCol.length; tc++) {
        if (String(valuesBdCol[tc][5] || '').trim().toUpperCase().replace(/^OP-?/, '') === targetOpCol) {
          foundRowCol = tc + 1;
          break;
        }
      }

      if (foundRowCol !== -1) {
        var obsColfactory = String(payload.observacionColfactory || payload.observacionesLavanderia || payload.observacion || payload.observaciones || '').trim();
        if (obsColfactory.toLowerCase().indexOf('colcha recibida') === -1 && obsColfactory.indexOf('[LAVANDERIA]') === -1) {
          sheetBdCol.getRange(foundRowCol, 12).setValue(obsColfactory);
        }
        return createJsonResponse({
          status: 'success',
          message: 'Observación Colfactory registrada exitosamente en Columna L para OP-' + targetOpCol,
          op: 'OP-' + targetOpCol,
          observacion: obsColfactory
        });
      }
      return createJsonResponse({ status: 'error', message: 'OP no encontrada en BASE_DE_DATOS' });
    }

    // 7. TRANSFER_OP
    if (action === 'TRANSFER_OP') {
      var sheetBdTrans = ss.getSheetByName(SHEET_BASE_DATOS) || ss.getSheetByName('01_BASE_DE_DATOS') || ss.getSheets()[0];
      var targetOpTrans = String(payload.op || '').trim().toUpperCase().replace(/^OP-?/, '');
      var valuesBdTrans = sheetBdTrans.getDataRange().getValues();
      var foundRowTrans = -1;

      for (var t = 1; t < valuesBdTrans.length; t++) {
        if (String(valuesBdTrans[t][5] || '').trim().toUpperCase().replace(/^OP-?/, '') === targetOpTrans) {
          foundRowTrans = t + 1;
          break;
        }
      }

      if (foundRowTrans !== -1) {
        sheetBdTrans.getRange(foundRowTrans, 6).setValue('OP-' + targetOpTrans);
        if (payload.nuevoEstado) sheetBdTrans.getRange(foundRowTrans, 10).setValue(payload.nuevoEstado);

        // Guardar Observación Colfactory en Columna L (Columna 12)
        var obsColfactoryInput = payload.observacionColfactory || payload.observacionesLavanderia || '';
        if (!obsColfactoryInput && (payload.nuevoEstado === 'LAVANDERIA' || payload.estadoAnterior === 'LAVANDERIA' || payload.nuevoEstado === 'CALIDAD' || payload.estado === 'LAVANDERIA' || payload.origen === 'LAVANDERIA')) {
          obsColfactoryInput = payload.observaciones || '';
        }
        if (obsColfactoryInput) {
          var cleanColObs = String(obsColfactoryInput).trim();
          if (cleanColObs.toLowerCase().indexOf('colcha recibida') === -1 && cleanColObs.indexOf('[LAVANDERIA]') === -1) {
            sheetBdTrans.getRange(foundRowTrans, 12).setValue(cleanColObs);
          }
        }

        // Columna O (15) es exclusiva para concepto final de calidad en estado FINALIZADO
        if (payload.obsOperarioFinal && payload.nuevoEstado === 'FINALIZADO') {
          var finalObsToSet = String(payload.obsOperarioFinal).trim();
          if (finalObsToSet.toLowerCase().indexOf('colcha recibida') === -1) {
            sheetBdTrans.getRange(foundRowTrans, 15).setValue(finalObsToSet);
          }
        }

        return createJsonResponse({ status: 'success', message: 'OP OP-' + targetOpTrans + ' transferida a fase ' + payload.nuevoEstado });
      }
      return createJsonResponse({ status: 'error', message: 'OP no encontrada en BASE_DE_DATOS' });
    }

    // -----------------------------------------------------------------------
    // ACCIÓN 7: UPDATE_DICTAMEN (FLUJO C: Notificación de Liberación Aprobado/Rechazado)
    // -----------------------------------------------------------------------
    if (action === 'UPDATE_DICTAMEN') {
      var sheetBdDict = ss.getSheetByName(SHEET_BASE_DATOS) || ss.getSheetByName('01_BASE_DE_DATOS') || ss.getSheets()[0];
      var targetOpDict = String(payload.op || '').trim().toUpperCase().replace(/^OP-?/, '');
      var opFormattedDict = 'OP-' + targetOpDict;
      var valuesBdDict = sheetBdDict.getDataRange().getValues();
      var foundRowDict = -1;

      for (var d = 1; d < valuesBdDict.length; d++) {
        if (String(valuesBdDict[d][5] || '').trim().toUpperCase().replace(/^OP-?/, '') === targetOpDict) {
          foundRowDict = d + 1;
          break;
        }
      }

      if (foundRowDict !== -1) {
        sheetBdDict.getRange(foundRowDict, 6).setValue(opFormattedDict);
        sheetBdDict.getRange(foundRowDict, 10).setValue('FINALIZADO');

        // Foto 2 de Calidad en Google Drive y persistencia oficial en Columna M (linkFoto1 | linkFoto2)
        var savedCalPhoto = null;
        var dictPhotoBase64 = payload.imageBase64 || payload.fotoCalidad || payload.fotoCalidadUrl || '';
        var calPhotoUrl = '';
        if (dictPhotoBase64 && dictPhotoBase64.length > 50 && dictPhotoBase64.indexOf('data:image/') === 0) {
          savedCalPhoto = saveImageToDriveHierarchical(dictPhotoBase64, opFormattedDict + '_POST_LAVADO_CALIDAD.jpg', opFormattedDict, new Date());
          if (savedCalPhoto && savedCalPhoto.driveUrl) calPhotoUrl = savedCalPhoto.driveUrl;
        } else if (dictPhotoBase64 && dictPhotoBase64.indexOf('http') === 0) {
          calPhotoUrl = dictPhotoBase64;
        }

        // Columna 13 (M) - Guardar enlace oficial clickeable de la carpeta de Google Drive de la OP
        var folderCol13 = (savedCalPhoto && savedCalPhoto.folderUrl) ? savedCalPhoto.folderUrl : '';
        if (!folderCol13) {
          var discoveredDict = getOpPhotosFromDrive(opFormattedDict);
          if (discoveredDict && discoveredDict.folderUrl) folderCol13 = discoveredDict.folderUrl;
          else if (discoveredDict && (discoveredDict.foto2 || discoveredDict.foto1)) folderCol13 = discoveredDict.foto2 || discoveredDict.foto1;
        }
        if (folderCol13) {
          sheetBdDict.getRange(foundRowDict, 13).setValue(folderCol13);
        }

        // OBSERVACIÓN COLFACTORY (Columna L / 12)
        var obsColDict = payload.observacionColfactory || payload.observacionesLavanderia || '';
        if (obsColDict) {
          var cleanColDict = String(obsColDict).trim();
          if (cleanColDict.toLowerCase().indexOf('colcha recibida') === -1 && cleanColDict.indexOf('[LAVANDERIA]') === -1) {
            var curColL = String(sheetBdDict.getRange(foundRowDict, 12).getValue() || '').trim();
            if (!curColL || curColL.toLowerCase().indexOf('colcha recibida') !== -1) {
              sheetBdDict.getRange(foundRowDict, 12).setValue(cleanColDict);
            }
          }
        }

        var pureObs = payload.obsOperarioFinal || payload.observacionesTecnicas || payload.observaciones || '';
        pureObs = pureObs.replace(/^\[DICTAMEN:\s*(APROBADO|RECHAZADO|PENDIENTE)\]\s*/i, '').trim();
        sheetBdDict.getRange(foundRowDict, 15).setValue(pureObs);

        var dictVal = payload.dictamenFinal || payload.dictamen || payload.veredicto || 'APROBADO';
        sheetBdDict.getRange(foundRowDict, 16).setValue(dictVal);

        // Depurar de hoja ALERTAS
        var shAl = ss.getSheetByName(SHEET_ALERTAS);
        if (shAl && shAl.getLastRow() > 1) {
          var vAl = shAl.getRange(2, 1, shAl.getLastRow() - 1, 1).getValues();
          for (var a = vAl.length - 1; a >= 0; a--) {
            if (String(vAl[a][0] || '').trim().toUpperCase().replace(/^OP-?/, '') === targetOpDict) shAl.deleteRow(a + 2);
          }
        }

        // FLUJO C: Envío automático inmediato de Correo de Dictamen / Liberación
        // Fuente de la verdad: Correos configurados en la Columna E de la hoja USUARIOS
        var emailsFromSheetDict = getAllUserEmails(ss);
        var recipientsDict = emailsFromSheetDict;
        if (recipientsDict.length === 0) {
          var col14Emails = String(sheetBdDict.getRange(foundRowDict, 14).getValue() || '');
          if (col14Emails) {
            recipientsDict = col14Emails.split(',').map(function (e) { return e.trim().toLowerCase(); }).filter(function (e) { return e.indexOf('@') !== -1; });
          }
        }
        var uniqueRecipientsDict = [];
        for (var rd = 0; rd < recipientsDict.length; rd++) {
          if (uniqueRecipientsDict.indexOf(recipientsDict[rd]) === -1) uniqueRecipientsDict.push(recipientsDict[rd]);
        }

        if (uniqueRecipientsDict.length > 0) {
          try {
            var rowVals = sheetBdDict.getRange(foundRowDict, 1, 1, 10).getValues()[0];
            var telaDict = rowVals[2] || 'TELA TEXTIL';
            var refDict = rowVals[6] || 'S/R';
            var auditorName = payload.auditorCalidad || payload.inspector || 'LABORATORIO DE CALIDAD';
            var appUrlDict = 'https://colchas.vercel.app/?op=' + encodeURIComponent(opFormattedDict) + '&view=public';
            var isAprobado = String(dictVal).toUpperCase().indexOf('APROB') !== -1;
            var subjectDict = (isAprobado ? '✅ [COLCHA APROBADA] ' : '❌ [COLCHA RECHAZADA] ') + opFormattedDict + ' • REF: ' + refDict + ' (' + telaDict + ')';
            var driveFotoCalUrl = (savedCalPhoto && savedCalPhoto.driveUrl) ? savedCalPhoto.driveUrl : '';
            var htmlDict = buildDictamenEmailHtml(opFormattedDict, refDict, telaDict, dictVal, pureObs, auditorName, appUrlDict, driveFotoCalUrl);

            MailApp.sendEmail({
              to: uniqueRecipientsDict.join(','),
              subject: subjectDict,
              htmlBody: htmlDict,
              name: 'CALIDAD STF GROUP - SISTEMA OFICIAL'
            });
          } catch (mailErr) {
            console.error('Error enviando correo de dictamen:', mailErr);
          }
        }

        return createJsonResponse({ 
          status: 'success', 
          message: 'Dictamen registrado en BASE_DE_DATOS y notificado por correo',
          driveUrl: (savedCalPhoto && savedCalPhoto.driveUrl) ? savedCalPhoto.driveUrl : '',
          folderUrl: (savedCalPhoto && savedCalPhoto.folderUrl) ? savedCalPhoto.folderUrl : ''
        });
      }
      return createJsonResponse({ status: 'error', message: 'OP no encontrada para dictamen' });
    }

    // 8. UPDATE_ALERTA_REPORT_SENT
    if (action === 'UPDATE_ALERTA_REPORT_SENT') {
      var shAlRep = ss.getSheetByName(SHEET_ALERTAS);
      if (shAlRep && shAlRep.getLastRow() > 1) {
        var opsToUp = (payload.ops || []).map(function (o) { return String(o).trim().toUpperCase().replace(/^OP-?/, ''); });
        var fechaRep = payload.fechaEnvioReporte || new Date().toLocaleString();
        var opVals = shAlRep.getRange(2, 1, shAlRep.getLastRow() - 1, 1).getValues();
        for (var k = 0; k < opVals.length; k++) {
          if (opsToUp.indexOf(String(opVals[k][0] || '').trim().toUpperCase().replace(/^OP-?/, '')) !== -1) {
            shAlRep.getRange(k + 2, 14).setValue(fechaRep);
          }
        }
      }
      return createJsonResponse({ status: 'success' });
    }

    // 9. DELETE_MONITOREO_OP
    if (action === 'DELETE_MONITOREO_OP') {
      removeOpFromMonitoreoSheet(ss, payload.op);
      return createJsonResponse({ status: 'success' });
    }

    // 10. UPDATE_OP_PHOTO
    if (action === 'UPDATE_OP_PHOTO') {
      var sheetBdPhoto = ss.getSheetByName(SHEET_BASE_DATOS) || ss.getSheetByName('01_BASE_DE_DATOS') || ss.getSheets()[0];
      var targetOpPhoto = String(payload.op || '').trim().toUpperCase().replace(/^OP-?/, '');
      var opFormattedPhoto = 'OP-' + targetOpPhoto;
      var lastRowBdPhoto = sheetBdPhoto.getLastRow();
      var foundRowPhoto = -1;

      if (lastRowBdPhoto > 1) {
        var opValsPhoto = sheetBdPhoto.getRange(2, 6, lastRowBdPhoto - 1, 1).getValues();
        for (var p = 0; p < opValsPhoto.length; p++) {
          if (String(opValsPhoto[p][0] || '').trim().toUpperCase().replace(/^OP-?/, '') === targetOpPhoto) {
            foundRowPhoto = p + 2;
            break;
          }
        }
      }

      if (foundRowPhoto !== -1) {
        sheetBdPhoto.getRange(foundRowPhoto, 6).setValue(opFormattedPhoto);
        var photoUrl = payload.fotoCalidadUrl || payload.fotoCalidad || payload.fotoMuestraUrl || payload.photoUrl || '';
        var isCalidad = !!payload.isCalidad;
        var fileNamePhoto = opFormattedPhoto + (isCalidad ? '_POST_LAVADO_CALIDAD.jpg' : '_MUESTRA_INICIAL.jpg');
        var savedPhotoRes = null;

        if (payload.imageBase64 && payload.imageBase64.length > 50 && payload.imageBase64.indexOf('data:image/') === 0) {
          savedPhotoRes = saveImageToDriveHierarchical(payload.imageBase64, fileNamePhoto, opFormattedPhoto, new Date());
          if (savedPhotoRes && savedPhotoRes.driveUrl) photoUrl = savedPhotoRes.driveUrl;
        } else if (photoUrl && photoUrl.length > 50 && photoUrl.indexOf('data:image/') === 0) {
          savedPhotoRes = saveImageToDriveHierarchical(photoUrl, fileNamePhoto, opFormattedPhoto, new Date());
          if (savedPhotoRes && savedPhotoRes.driveUrl) photoUrl = savedPhotoRes.driveUrl;
        }

        // Columna 13 (M) - Guardar enlace oficial clickeable de la carpeta de Google Drive de la OP
        var folderColPhoto = (savedPhotoRes && savedPhotoRes.folderUrl) ? savedPhotoRes.folderUrl : '';
        if (!folderColPhoto) {
          var disc = getOpPhotosFromDrive(opFormattedPhoto);
          if (disc && disc.folderUrl) folderColPhoto = disc.folderUrl;
          else if (disc && (disc.foto2 || disc.foto1)) folderColPhoto = disc.foto2 || disc.foto1;
        }
        if (folderColPhoto) {
          sheetBdPhoto.getRange(foundRowPhoto, 13).setValue(folderColPhoto);
        }

        if (payload.observacionColfactory || payload.observacionesLavanderia) {
          var cleanColPh = String(payload.observacionColfactory || payload.observacionesLavanderia).trim();
          if (cleanColPh.toLowerCase().indexOf('colcha recibida') === -1 && cleanColPh.indexOf('[LAVANDERIA]') === -1) {
            sheetBdPhoto.getRange(foundRowPhoto, 12).setValue(cleanColPh);
          }
        }
        if (payload.obsOperarioFinal) sheetBdPhoto.getRange(foundRowPhoto, 15).setValue(payload.obsOperarioFinal);

        return createJsonResponse({
          status: 'success',
          message: 'Foto de OP ' + opFormattedPhoto + ' archivada en Drive y actualizada en Columna M',
          driveUrl: photoUrl,
          folderUrl: (savedPhotoRes && savedPhotoRes.folderUrl) ? savedPhotoRes.folderUrl : ''
        });
      }
      return createJsonResponse({ status: 'error', message: 'OP no encontrada en BASE_DE_DATOS' });
    }

    // 11. SEND_OP_EMAIL
    if (action === 'SEND_OP_EMAIL') {
      var opValMail = String(payload.op || payload.opNumber || '').trim().toUpperCase();
      if (opValMail && opValMail.indexOf('OP-') !== 0) opValMail = 'OP-' + opValMail.replace(/^OP-?/i, '').trim();
      var recipientsMail = payload.userEmails || payload.recipients || [];
      if (!Array.isArray(recipientsMail) || recipientsMail.length === 0) recipientsMail = getAllUserEmails(ss);
      var cleanMailList = (recipientsMail || []).map(function (e) { return String(e).trim().toLowerCase(); }).filter(function (e) { return e.indexOf('@') !== -1; });
      var uniqueCleanMails = [];
      for (var um = 0; um < cleanMailList.length; um++) {
        if (uniqueCleanMails.indexOf(cleanMailList[um]) === -1) uniqueCleanMails.push(cleanMailList[um]);
      }
      if (uniqueCleanMails.length === 0) return createJsonResponse({ status: 'error', message: 'Sin destinatarios válidos' });

      var appUrlMail = payload.appUrl || ('https://colchas.vercel.app/?op=' + encodeURIComponent(opValMail) + '&view=public');
      var refValMail = payload.referencia || payload['REFERENCIA'] || 'S/R';
      var telaValMail = payload.tela || payload['TELA'] || 'TELA TEXTIL';
      var nowMail = new Date();
      var fechaFormattedMail = payload.fecha || Utilities.formatDate(nowMail, 'America/Bogota', 'd/M/yyyy HH:mm:ss');

      MailApp.sendEmail({
        to: uniqueCleanMails.join(','),
        subject: '🧵 [FICHA TÉCNICA OP] ' + opValMail + ' • REF: ' + refValMail + ' (' + telaValMail + ')',
        htmlBody: buildNewOpEmailHtml(payload, opValMail, fechaFormattedMail, appUrlMail, payload.fotoMuestraUrl || payload.driveUrl || ''),
        name: 'COLCHAS STF GROUP - SISTEMA OFICIAL'
      });

      return createJsonResponse({ status: 'success', count: uniqueCleanMails.length });
    }

    // -----------------------------------------------------------------------
    // ACCIÓN 12: SEND_ALERTA_EMAIL (FLUJO B: Envío de Alertas SLA por Demanda)
    // -----------------------------------------------------------------------
    if (action === 'SEND_ALERTA_EMAIL') {
      var recAlert = payload.recipients || [];
      if (!Array.isArray(recAlert)) recAlert = String(recAlert).split(',').map(function (e) { return e.trim(); }).filter(Boolean);
      var cleanAlertList = recAlert.map(function (e) { return String(e).trim().toLowerCase(); }).filter(function (e) { return e.indexOf('@') !== -1; });
      var uniqueAlertMails = [];
      for (var ua = 0; ua < cleanAlertList.length; ua++) {
        if (uniqueAlertMails.indexOf(cleanAlertList[ua]) === -1) uniqueAlertMails.push(cleanAlertList[ua]);
      }
      if (uniqueAlertMails.length === 0) return createJsonResponse({ status: 'error', message: 'Sin destinatarios' });

      var opsList = payload.ops || [];
      var senderName = payload.senderName || 'EDWIN DIAZ (ADMINISTRADOR)';
      var fechaReporte = payload.fechaReporte || Utilities.formatDate(new Date(), 'America/Bogota', 'd/M/yyyy HH:mm:ss');
      var appUrlAl = payload.appUrl || 'https://colchas.vercel.app/?tab=alertas';
      var subjectAlert = payload.subject || ('🚨 [ALERTA SLA - STF GROUP] ' + opsList.length + ' Órdenes con Retraso');
      var htmlAlert = buildAlertaEmailHtml(opsList, senderName, fechaReporte, appUrlAl);

      MailApp.sendEmail({
        to: uniqueAlertMails.join(','),
        subject: subjectAlert,
        htmlBody: htmlAlert,
        name: 'ALERTA COLCHAS - STF GROUP'
      });

      return createJsonResponse({ status: 'success', sentCount: uniqueAlertMails.length });
    }

    // 13. CLEAN_COLUMNS_KLMN
    if (action === 'CLEAN_COLUMNS_KLMN') {
      var cleanedCount = cleanColumnsKLMN(ss);
      return createJsonResponse({ status: 'success', cleanedCount: cleanedCount });
    }

    // 14. CLEAN_DRIVE_DUPLICATES (Depurar fotos duplicadas en Drive dejando exactamente 2 por OP)
    // 15. GET_OP_PHOTOS (Resolución en tiempo real de fotos de la OP desde Drive)
    if (action === 'GET_OP_PHOTOS') {
      var targetOpPost = payload.op || payload.opNumber || '';
      if (!targetOpPost) return createJsonResponse({ status: 'error', message: 'Falta parámetro op' });
      var cleanOpP = String(targetOpPost).trim().toUpperCase();
      if (cleanOpP.indexOf('OP-') !== 0) cleanOpP = 'OP-' + cleanOpP.replace(/^OP-?/i, '').trim();
      var photosRes = getOpPhotosFromDrive(cleanOpP);

      if (photosRes.foto1 || photosRes.foto2 || photosRes.folderUrl) {
        try {
          var shBdP = ss.getSheetByName(SHEET_BASE_DATOS) || ss.getSheetByName('01_BASE_DE_DATOS') || ss.getSheets()[0];
          if (shBdP && shBdP.getLastRow() > 1) {
            var bdOpsP = shBdP.getRange(2, 6, shBdP.getLastRow() - 1, 1).getValues();
            var targetPureP = cleanOpP.replace(/^OP-?/, '');
            for (var bp = 0; bp < bdOpsP.length; bp++) {
              if (String(bdOpsP[bp][0] || '').trim().toUpperCase().replace(/^OP-?/, '') === targetPureP) {
                var newColMP = photosRes.folderUrl || photosRes.foto1 || photosRes.foto2 || '';
                if (newColMP) {
                  shBdP.getRange(bp + 2, 13).setValue(newColMP);
                }
                break;
              }
            }
          }
        } catch (eP) {}
      }

      return createJsonResponse({
        status: 'success',
        op: cleanOpP,
        foto1: photosRes.foto1,
        foto2: photosRes.foto2,
        folderUrl: photosRes.folderUrl
      });
    }

    return createJsonResponse({ status: 'error', message: 'Acción POST no reconocida: ' + action });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

/**
 * =========================================================================
 * FUNCIONES AUXILIARES Y GESTIÓN JERÁRQUICA EN GOOGLE DRIVE
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
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function getMonitoreoSheet(ss) {
  var sheets = ss.getSheets();
  for (var s = 0; s < sheets.length; s++) {
    if (sheets[s].getSheetId() === 1356774059 || sheets[s].getName().trim().toUpperCase() === 'MONITOREO') return sheets[s];
  }
  return ss.getSheetByName(SHEET_MONITOREO) || ss.getSheetByName('monitoreo');
}

function removeOpFromMonitoreoSheet(ss, op) {
  if (!op) return;
  var sheetMon = getMonitoreoSheet(ss);
  if (!sheetMon || sheetMon.getLastRow() <= 1) return;
  var cleanTarget = String(op).trim().toUpperCase();
  var cleanNoPrefix = cleanTarget.replace(/^OP-?/, '');
  var vals = sheetMon.getRange(2, 1, sheetMon.getLastRow() - 1, Math.max(5, sheetMon.getLastColumn())).getValues();

  for (var i = vals.length - 1; i >= 0; i--) {
    var match = false;
    for (var c = 0; c < vals[i].length; c++) {
      var cv = String(vals[i][c] || '').trim().toUpperCase();
      if (cv && (cv === cleanTarget || cv.replace(/^OP-?/, '') === cleanNoPrefix)) { match = true; break; }
    }
    if (match) sheetMon.deleteRow(i + 2);
  }
}

function autoCleanMonitoreoFromBaseDeDatos(ss) {
  try {
    var sheetBd = ss.getSheetByName(SHEET_BASE_DATOS) || ss.getSheetByName('01_BASE_DE_DATOS') || ss.getSheets()[0];
    var sheetMon = getMonitoreoSheet(ss);
    if (!sheetBd || !sheetMon || sheetBd.getLastRow() <= 1 || sheetMon.getLastRow() <= 1) return 0;

    var bdValues = sheetBd.getRange(2, 6, sheetBd.getLastRow() - 1, 1).getValues();
    var registeredMap = {};
    for (var b = 0; b < bdValues.length; b++) {
      var opVal = String(bdValues[b][0] || '').trim().toUpperCase();
      if (opVal) {
        registeredMap[opVal] = true;
        registeredMap[opVal.replace(/^OP-?/, '')] = true;
      }
    }

    var monValues = sheetMon.getRange(2, 1, sheetMon.getLastRow() - 1, Math.max(5, sheetMon.getLastColumn())).getValues();
    var deletedCount = 0;
    for (var m = monValues.length - 1; m >= 0; m--) {
      var isMatch = false;
      for (var c = 0; c < monValues[m].length; c++) {
        var cellVal = String(monValues[m][c] || '').trim().toUpperCase();
        if (cellVal && (registeredMap[cellVal] || registeredMap[cellVal.replace(/^OP-?/, '')])) {
          isMatch = true;
          break;
        }
      }
      if (isMatch) {
        sheetMon.deleteRow(m + 2);
        deletedCount++;
      }
    }
    return deletedCount;
  } catch (e) {
    console.error('Error autoCleanMonitoreoFromBaseDeDatos:', e);
    return 0;
  }
}

/**
 * GESTIÓN DE GOOGLE DRIVE: JERARQUÍA RAÍZ -> MES -> OP
 */
function getRootDriveFolder() {
  var folderId = (typeof TARGET_DRIVE_FOLDER_ID !== 'undefined' && TARGET_DRIVE_FOLDER_ID) ? TARGET_DRIVE_FOLDER_ID : TARGET_DRIVE_SPREADSHEET_OR_FOLDER_ID;
  if (folderId && String(folderId).trim().length > 5) {
    try {
      var candidate = DriveApp.getFileById(String(folderId).trim());
      if (candidate.getMimeType() === 'application/vnd.google-apps.folder') {
        return DriveApp.getFolderById(String(folderId).trim());
      }
      var parents = candidate.getParents();
      if (parents.hasNext()) {
        var parentFolder = parents.next();
        var subFolders = parentFolder.getFoldersByName(DRIVE_FOLDER_NAME);
        if (subFolders.hasNext()) return subFolders.next();
        var createdInParent = parentFolder.createFolder(DRIVE_FOLDER_NAME);
        createdInParent.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        return createdInParent;
      }
    } catch (err) {
      console.warn('Aviso: Pasando a Mi Unidad de Drive:', err);
    }
  }

  var folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  var newFolder = DriveApp.createFolder(DRIVE_FOLDER_NAME);
  newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return newFolder;
}

function getMonthDriveFolder(rootFolder, dateInput) {
  var d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) d = new Date();
  var monthsEs = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
  var folderName = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + ' - ' + monthsEs[d.getMonth()];
  var subFolders = rootFolder.getFoldersByName(folderName);
  if (subFolders.hasNext()) return subFolders.next();
  var created = rootFolder.createFolder(folderName);
  created.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return created;
}

function getOpDriveFolder(monthFolder, rawOp) {
  var cleanOp = String(rawOp || 'OP-GENERAL').trim().toUpperCase();
  if (cleanOp.indexOf('OP-') !== 0) cleanOp = 'OP-' + cleanOp.replace(/^OP-?/i, '').trim();
  var subFolders = monthFolder.getFoldersByName(cleanOp);
  if (subFolders.hasNext()) return subFolders.next();
  var created = monthFolder.createFolder(cleanOp);
  created.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return created;
}

function saveImageToDriveHierarchical(base64Data, fileName, rawOp, dateInput) {
  try {
    if (!base64Data || base64Data.length < 50) return { driveUrl: '', folderUrl: '' };
    var root = getRootDriveFolder();
    var monthFolder = getMonthDriveFolder(root, dateInput);
    var opFolder = getOpDriveFolder(monthFolder, rawOp);

    // =========================================================================
    // REGLA ESTRICTA DE CONTROL DE CALIDAD: MÁXIMO 2 FOTOS POR OP EN DRIVE
    // 1. OP-XXXXX_MUESTRA_INICIAL.jpg (Creación)
    // 2. OP-XXXXX_POST_LAVADO_CALIDAD.jpg (Auditoría de Calidad)
    // =========================================================================

    // Si se sube una foto POST_LAVADO, eliminar a la papelera cualquier archivo existente que contenga POST_LAVADO
    if (fileName.indexOf('POST_LAVADO') !== -1) {
      var filesPost = opFolder.getFiles();
      while (filesPost.hasNext()) {
        var fPost = filesPost.next();
        if (fPost.getName().indexOf('POST_LAVADO') !== -1) {
          try { fPost.setTrashed(true); } catch (ePostTrash) {}
        }
      }
    }

    // Si se sube una foto MUESTRA_INICIAL, eliminar a la papelera cualquier archivo existente que contenga MUESTRA_INICIAL
    if (fileName.indexOf('MUESTRA_INICIAL') !== -1) {
      var filesInit = opFolder.getFiles();
      while (filesInit.hasNext()) {
        var fInit = filesInit.next();
        if (fInit.getName().indexOf('MUESTRA_INICIAL') !== -1) {
          try { fInit.setTrashed(true); } catch (eInitTrash) {}
        }
      }
    }

    // Por seguridad, eliminar cualquier archivo con el nombre exacto fileName
    var exactFiles = opFolder.getFilesByName(fileName);
    while (exactFiles.hasNext()) {
      var exactFile = exactFiles.next();
      try { exactFile.setTrashed(true); } catch (eExactTrash) {}
    }

    var cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    var decoded = Utilities.base64Decode(cleanBase64);
    var blob = Utilities.newBlob(decoded, 'image/jpeg', fileName);
    var file = opFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return {
      driveUrl: 'https://drive.google.com/uc?id=' + file.getId(),
      folderUrl: opFolder.getUrl(),
      fileId: file.getId()
    };
  } catch (e) {
    console.error('Error guardando imagen en Google Drive:', e);
    return { driveUrl: '', folderUrl: '' };
  }
}

/**
 * Recorre todas las carpetas de OPs en Drive y depura archivos duplicados,
 * garantizando que en cada carpeta de OP existan estrictamente como máximo 2 fotos:
 * 1. OP-XXXXX_MUESTRA_INICIAL.jpg
 * 2. OP-XXXXX_POST_LAVADO_CALIDAD.jpg
 */
function cleanAllOpFolderDuplicatesInDrive() {
  try {
    var root = getRootDriveFolder();
    var monthFolders = root.getFolders();
    var totalCleaned = 0;

    while (monthFolders.hasNext()) {
      var mFolder = monthFolders.next();
      var opFolders = mFolder.getFolders();

      while (opFolders.hasNext()) {
        var opFolder = opFolders.next();
        var files = opFolder.getFiles();
        var postLavadoFiles = [];
        var muestraInicialFiles = [];

        while (files.hasNext()) {
          var f = files.next();
          var fName = f.getName().toUpperCase();
          if (fName.indexOf('POST_LAVADO') !== -1) {
            postLavadoFiles.push(f);
          } else if (fName.indexOf('MUESTRA_INICIAL') !== -1) {
            muestraInicialFiles.push(f);
          }
        }

        // Si hay más de 1 post lavado, ordenar por fecha descendente y mandar los antiguos a la papelera
        if (postLavadoFiles.length > 1) {
          postLavadoFiles.sort(function(a, b) {
            return b.getLastUpdated().getTime() - a.getLastUpdated().getTime();
          });
          for (var p = 1; p < postLavadoFiles.length; p++) {
            try {
              postLavadoFiles[p].setTrashed(true);
              totalCleaned++;
            } catch (eTrashP) {}
          }
        }

        // Si hay más de 1 muestra inicial, mandar los antiguos a la papelera
        if (muestraInicialFiles.length > 1) {
          muestraInicialFiles.sort(function(a, b) {
            return b.getLastUpdated().getTime() - a.getLastUpdated().getTime();
          });
          for (var m = 1; m < muestraInicialFiles.length; m++) {
            try {
              muestraInicialFiles[m].setTrashed(true);
              totalCleaned++;
            } catch (eTrashM) {}
          }
        }
      }
    }

    return totalCleaned;
  } catch (errClean) {
    console.error('Error depurando duplicados de fotos en Drive:', errClean);
    return 0;
  }
}

function cleanDuplicatesDriveMenuAction() {
  var count = cleanAllOpFolderDuplicatesInDrive();
  SpreadsheetApp.getActiveSpreadsheet().toast('✅ Se depuraron ' + count + ' fotos duplicadas en Google Drive. Ahora cada OP tiene estrictamente sus 2 imágenes oficiales.', '🚀 STF GROUP', 6);
}

function saveImageToDrive(base64Data, fileName, rawOp, dateInput) {
  var res = saveImageToDriveHierarchical(base64Data, fileName, rawOp, dateInput);
  return res ? res.driveUrl : '';
}

/**
 * Busca en Google Drive (Raíz -> Mes -> OP-XXXXX) los archivos fotográficos
 * de la OP y devuelve sus enlaces directos para visualización móvil instantánea.
 */
function getOpPhotosFromDrive(rawOp) {
  var res = { foto1: '', foto2: '', folderUrl: '' };
  try {
    var cleanOp = String(rawOp || '').trim().toUpperCase();
    if (cleanOp.indexOf('OP-') !== 0) cleanOp = 'OP-' + cleanOp.replace(/^OP-?/i, '').trim();
    var pureDigits = cleanOp.replace(/^OP-?/, '').trim();
    var root = getRootDriveFolder();
    if (!root) return res;
    var monthFolders = root.getFolders();

    while (monthFolders.hasNext()) {
      var mFolder = monthFolders.next();
      var opFolders = mFolder.getFolders();
      while (opFolders.hasNext()) {
        var opFolder = opFolders.next();
        var fName = opFolder.getName().trim().toUpperCase();
        if (fName === cleanOp || fName.replace(/^OP-?/, '').trim() === pureDigits) {
          res.folderUrl = opFolder.getUrl();
          var files = opFolder.getFiles();
          var fileList = [];
          while (files.hasNext()) {
            fileList.push(files.next());
          }
          fileList.sort(function(a, b) {
            return a.getDateCreated().getTime() - b.getDateCreated().getTime();
          });

          for (var fi = 0; fi < fileList.length; fi++) {
            var file = fileList[fi];
            var n = file.getName().toUpperCase();
            var fUrl = 'https://drive.google.com/uc?id=' + file.getId();
            if (n.indexOf('MUESTRA_INICIAL') !== -1 || n.indexOf('INICIAL') !== -1 || n.indexOf('FOTO1') !== -1) {
              res.foto1 = fUrl;
            } else if (n.indexOf('POST_LAVADO') !== -1 || n.indexOf('CALIDAD') !== -1 || n.indexOf('FOTO2') !== -1) {
              res.foto2 = fUrl;
            } else if (!res.foto1) {
              res.foto1 = fUrl;
            } else if (!res.foto2) {
              res.foto2 = fUrl;
            }
          }
          return res;
        }
      }
    }
  } catch (e) {
    console.error('Error in getOpPhotosFromDrive:', e);
  }
  return res;
}

function getOrCreateDriveFolder() {
  return getRootDriveFolder();
}

function formatAlertasSheetHeader(sheet) {
  var headerRange = sheet.getRange(1, 1, 1, ALERTAS_HEADERS.length);
  headerRange.setBackground('#991b1b');
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
  sheet.getRange(2, 1, numRows, 1).setHorizontalAlignment('center').setFontWeight('bold');
  sheet.getRange(2, 5, numRows, 1).setHorizontalAlignment('center');
  sheet.getRange(2, 7, numRows, 4).setHorizontalAlignment('center');
  sheet.getRange(2, 9, numRows, 1).setFontColor('#dc2626').setFontWeight('bold');
  for (var col = 1; col <= ALERTAS_HEADERS.length; col++) sheet.autoResizeColumn(col);
}

function syncAlertasFromBaseDeDatos() {
  var ss = getTargetSpreadsheet();
  var sheetBd = ss.getSheetByName(SHEET_BASE_DATOS) || ss.getSheetByName('01_BASE_DE_DATOS') || ss.getSheets()[0];
  var sheetAlertas = ss.getSheetByName(SHEET_ALERTAS) || ss.insertSheet(SHEET_ALERTAS);
  var data = sheetBd.getDataRange().getValues();
  if (data.length < 2) return;

  var alertasRows = [];
  var now = new Date();

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var op = row[5];
    var estado = String(row[9] || '').toUpperCase();
    if (!op || estado === 'FINALIZADO') continue;

    var diasHabiles = calcularDiasHabiles(row[0], now);
    if (diasHabiles > 3) {
      var rollos = row[7] || 1;
      var codigoMt = row[3];
      var metrosStr = codigoMt ? (String(codigoMt).indexOf('MT') !== -1 ? codigoMt : codigoMt + ' (' + (rollos * 85) + ' MT)') : (rollos * 85) + ' MT';
      alertasRows.push([
        op, row[6] || 'S/R', row[2] || '', row[4] || 'AZUL', metrosStr,
        mapAreaToTitle(estado), row[0], diasHabiles + ' Días', '+' + (diasHabiles - 3) + ' Días',
        (diasHabiles * 12) + 'h', row[1] || 'CALIDAD ZF', row[10] || '', row[11] || '', ''
      ]);
    }
  }

  alertasRows.sort(function (a, b) { return (parseInt(b[7]) || 0) - (parseInt(a[7]) || 0); });
  var lastRow = sheetAlertas.getLastRow();
  if (lastRow > 1) sheetAlertas.getRange(2, 1, lastRow - 1, Math.max(14, sheetAlertas.getLastColumn())).clearContent();
  sheetAlertas.getRange(1, 1, 1, ALERTAS_HEADERS.length).setValues([ALERTAS_HEADERS]);
  formatAlertasSheetHeader(sheetAlertas);

  if (alertasRows.length > 0) {
    sheetAlertas.getRange(2, 1, alertasRows.length, ALERTAS_HEADERS.length).setValues(alertasRows);
    formatAlertasSheetRows(sheetAlertas, alertasRows.length);
  }
  SpreadsheetApp.getActiveSpreadsheet().toast('✅ Hoja ALERTAS sincronizada con ' + alertasRows.length + ' órdenes.', 'STF Group SLA', 5);
}

function calcularDiasHabiles(fechaInicio, fechaFin) {
  if (!fechaInicio) return 0;
  var cur = new Date(fechaInicio);
  if (isNaN(cur.getTime())) return 0;
  var count = 0;
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
    sheets[s].setFrozenRows(1);
    for (var c = 1; c <= sheets[s].getLastColumn(); c++) sheets[s].autoResizeColumn(c);
  }
  SpreadsheetApp.getActiveSpreadsheet().toast('✅ Formato profesional y normalización aplicados.', 'STF Group', 5);
}

function normalizeAllOpCodesInBaseDeDatos(ss) {
  if (!ss) ss = getTargetSpreadsheet();
  var sheetBd = ss.getSheetByName(SHEET_BASE_DATOS) || ss.getSheetByName('01_BASE_DE_DATOS') || ss.getSheets()[0];
  if (!sheetBd || sheetBd.getLastRow() <= 1) return 0;

  var range = sheetBd.getRange(2, 6, sheetBd.getLastRow() - 1, 1);
  var values = range.getValues();
  var updated = 0;

  for (var i = 0; i < values.length; i++) {
    var v = String(values[i][0] || '').trim();
    if (v && v.toUpperCase() !== 'OP') {
      var f = v.toUpperCase().indexOf('OP-') === 0 ? ('OP-' + v.substring(3).trim()) : (v.toUpperCase().indexOf('OP') === 0 ? ('OP-' + v.substring(2).replace(/^[-_\s]+/, '').trim()) : ('OP-' + v));
      if (f !== v) { values[i][0] = f; updated++; }
    }
  }
  if (updated > 0) range.setValues(values);
  return updated;
}

/**
 * Localiza de forma infalible la hoja USUARIOS (por GID 335635630 o por nombre)
 */
function getUsuariosSheet(ss) {
  if (!ss) ss = getTargetSpreadsheet();
  var sheets = ss.getSheets();

  // 1. Buscar por GID oficial de USUARIOS (335635630)
  for (var i = 0; i < sheets.length; i++) {
    try {
      if (String(sheets[i].getSheetId()) === '335635630') {
        return sheets[i];
      }
    } catch (e) { }
  }

  // 2. Buscar por nombre exacto común
  var direct = ss.getSheetByName('USUARIOS') ||
    ss.getSheetByName('DIRECTORIO') ||
    ss.getSheetByName('CONTACTOS') ||
    ss.getSheetByName('ROLES');
  if (direct) return direct;

  // 3. Buscar insensible a mayúsculas, tildes o espacios
  for (var j = 0; j < sheets.length; j++) {
    var name = sheets[j].getName().trim().toUpperCase();
    if (name === 'USUARIOS' || name === 'DIRECTORIO' || name === 'CONTACTOS' || name.indexOf('USUARIO') !== -1) {
      return sheets[j];
    }
  }
  return null;
}

/**
 * Extrae en tiempo real única y exclusivamente los correos electrónicos válidos
 * presentes en la Columna E ("CORREO ELECTRÓNICO") de la pestaña USUARIOS.
 * 
 * Reglas de Negocio Automatizadas:
 * 1. Si la celda de una fila está vacía, NO se enviará correo a esa persona.
 * 2. Si el usuario deja 2, 3 o N correos en la Columna E, el sistema enviará única y exclusivamente a esos correos.
 * 3. Si se retira manualmente un correo de la Columna E, queda excluido al instante.
 */
function getAllUserEmails(ss) {
  if (!ss) ss = getTargetSpreadsheet();
  var emails = [];
  var emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  try {
    var userSheet = getUsuariosSheet(ss);
    if (userSheet && userSheet.getLastRow() >= 2) {
      var data = userSheet.getDataRange().getValues();

      // Detectar índice de columna de correo por encabezado (por defecto columna E = índice 4)
      var emailColIdx = 4;
      if (data.length > 0) {
        for (var c = 0; c < data[0].length; c++) {
          var header = String(data[0][c] || '').trim().toUpperCase();
          if (header.indexOf('CORREO') !== -1 || header.indexOf('EMAIL') !== -1 || header.indexOf('MAIL') !== -1) {
            emailColIdx = c;
            break;
          }
        }
      }

      // Recorrer filas de usuarios omitiendo encabezado (fila 0)
      for (var r = 1; r < data.length; r++) {
        var row = data[r];
        if (!row || row.length <= emailColIdx) continue;

        // Leer única y estrictamente la celda de la Columna E
        var colVal = String(row[emailColIdx] || '').trim().toLowerCase();
        if (colVal && emailRegex.test(colVal)) {
          if (emails.indexOf(colVal) === -1) {
            emails.push(colVal);
          }
        }
      }
    }
  } catch (e) {
    Logger.log('⚠️ Error al leer hoja USUARIOS: ' + e.toString());
  }

  // Se retorna exactamente lo configurado por el usuario en la Columna E
  return emails;
}

/**
 * =========================================================================
 * PLANTILLAS HTML PROFESIONALES DE CORREO (STF GROUP S.A.)
 * =========================================================================
 */

/**
 * Plantilla Flujo A: Creación de Nueva Colcha (Diseño Amarillo & Tipografía Ultra Profesional)
 */
function buildNewOpEmailHtml(opData, opVal, fechaFormatted, appUrl, driveUrl) {
  var refVal = opData['REFERENCIA'] || opData.referencia || 'S/R';
  var telaVal = opData['TELA'] || opData.tela || 'TELA TEXTIL';
  var colorVal = opData['COLOR'] || opData.color || 'AZUL';
  var mtVal = opData['CÓDIGO MT'] || opData.codigoMt || 'MT-AUTO';
  var rollosVal = Number(opData['ROLLOS'] || opData.rollos || 1);
  var obsOp = opData['OBSERVACIÓN OPERARIO'] || opData.observacionesOperario || opData.observacionOperario || 'Muestra ingresada para proceso textil';
  var inspectorVal = opData['INSPECTOR / OPERARIO'] || opData.inspector || 'ATELIER / CORTE';

  var imgBlock = driveUrl
    ? '<div style="margin: 18px 0 6px; text-align: center;">' +
        '<a href="' + driveUrl + '" target="_blank" style="display: inline-block; background: #0f172a; color: #ffffff; padding: 11px 22px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 11.5px; letter-spacing: 0.5px; box-shadow: 0 2px 6px rgba(15,23,42,0.25);">' +
          '📷 Ver Fotografía de Muestra en Google Drive' +
        '</a>' +
      '</div>'
    : '';

  return '<div style="font-family: \'Plus Jakarta Sans\', \'Segoe UI\', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.04);">' +
    // Barra superior de acento Amarillo Textil
    '<div style="background: #F59E0B; height: 5px; width: 100%;"></div>' +

    // Encabezado Corporativo Premium
    '<div style="background: linear-gradient(135deg, #09090b 0%, #18181b 100%); color: #ffffff; padding: 26px 22px; text-align: center;">' +
      '<h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 2.5px; text-transform: uppercase; color: #ffffff;">STF GROUP S.A.</h1>' +
      '<p style="margin: 5px 0 0; font-size: 11px; color: #FBBF24; font-weight: 800; letter-spacing: 1.8px; text-transform: uppercase;">STUDIO F • ELA • STUDIO F MAN</p>' +
      '<div style="display: inline-block; margin-top: 10px; padding: 4px 12px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); border-radius: 20px;">' +
        '<span style="font-size: 10px; color: #cbd5e1; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase;">SISTEMA INTEGRAL DE CONTROL DE CALIDAD DE COLCHAS</span>' +
      '</div>' +
    '</div>' +

    // Hero de OP: Amarillo Cálido / Ámbar Vibrante
    '<div style="background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); border-top: 1px solid #FDE68A; border-bottom: 2px solid #F59E0B; padding: 18px 24px; text-align: center;">' +
      '<div style="display: inline-block; background: #D97706; color: #ffffff; font-size: 10.5px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; padding: 4px 14px; border-radius: 20px; box-shadow: 0 2px 5px rgba(217,119,6,0.25);">' +
        '⚡ NUEVA SOLICITUD REGISTRADA' +
      '</div>' +
      '<div style="font-size: 28px; font-weight: 900; color: #78350F; font-family: \'JetBrains Mono\', Consolas, Monaco, monospace; letter-spacing: -0.5px; margin: 8px 0 2px;">' +
        opVal +
      '</div>' +
      '<span style="display: inline-block; background: #FEF08A; color: #854D0E; font-size: 10px; font-weight: 700; padding: 2px 10px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px;">ESTADO: SOLICITADO / PRE-SOLICITUD</span>' +
    '</div>' +

    // Cuerpo Principal
    '<div style="padding: 24px 22px;">' +
      // Ficha Técnica en Tarjeta Limpia
      '<div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">' +
        '<table style="width: 100%; border-collapse: collapse; font-size: 12px;">' +
          '<tr style="border-bottom: 1px solid #f1f5f9;">' +
            '<td style="padding: 10px 14px; background: #fafafa; color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: 0.6px; width: 36%;">Referencia:</td>' +
            '<td style="padding: 10px 14px; font-weight: 800; color: #0f172a; font-family: \'JetBrains Mono\', Consolas, monospace; font-size: 13px;">' + refVal + '</td>' +
          '</tr>' +
          '<tr style="border-bottom: 1px solid #f1f5f9;">' +
            '<td style="padding: 10px 14px; background: #fafafa; color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: 0.6px;">Tela / Código MT:</td>' +
            '<td style="padding: 10px 14px; font-weight: 700; color: #0f172a;">' + telaVal + ' <span style="display: inline-block; background: #f1f5f9; color: #475569; font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: 4px; margin-left: 4px;">' + mtVal + '</span></td>' +
          '</tr>' +
          '<tr style="border-bottom: 1px solid #f1f5f9;">' +
            '<td style="padding: 10px 14px; background: #fafafa; color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: 0.6px;">Color / Rollos:</td>' +
            '<td style="padding: 10px 14px; font-weight: 700; color: #0f172a;">' + colorVal + ' <span style="color: #cbd5e1; margin: 0 4px;">•</span> ' + rollosVal + ' Rollos</td>' +
          '</tr>' +
          '<tr style="border-bottom: 1px solid #f1f5f9;">' +
            '<td style="padding: 10px 14px; background: #fafafa; color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: 0.6px;">Fecha Registro:</td>' +
            '<td style="padding: 10px 14px; font-weight: 600; color: #334155;">' + fechaFormatted + '</td>' +
          '</tr>' +
          '<tr>' +
            '<td style="padding: 10px 14px; background: #fafafa; color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: 0.6px;">Registrado Por:</td>' +
            '<td style="padding: 10px 14px; font-weight: 600; color: #334155;">' + inspectorVal + '</td>' +
          '</tr>' +
        '</table>' +
      '</div>' +

      // Caja de Observación Inicial
      '<div style="margin-top: 14px; background: #FFFBEB; border: 1px solid #FDE68A; border-left: 4px solid #F59E0B; border-radius: 8px; padding: 12px 16px;">' +
        '<div style="font-size: 10px; font-weight: 800; color: #B45309; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px;">' +
          '💬 Observación Inicial del Operario:' +
        '</div>' +
        '<div style="font-size: 12.5px; color: #451A03; font-style: italic; line-height: 1.45;">' +
          '&ldquo;' + obsOp + '&rdquo;' +
        '</div>' +
      '</div>' +

      imgBlock +

      // Botón CTA Principal Amarillo / Ámbar Llamativo
      '<div style="margin-top: 20px; text-align: center;">' +
        '<a href="' + appUrl + '" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: #000000; padding: 13px 30px; border-radius: 10px; font-weight: 900; text-decoration: none; font-size: 12px; text-transform: uppercase; letter-spacing: 0.8px; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4); border: 1px solid #D97706;">' +
          '📱 ABRIR FICHA PÚBLICA EN TIEMPO REAL' +
        '</a>' +
      '</div>' +
    '</div>' +

    // Pie de Página Corporativo
    '<div style="background: #f8fafc; padding: 16px 20px; text-align: center; font-size: 10.5px; color: #94a3b8; border-top: 1px solid #e2e8f0; line-height: 1.5;">' +
      '<strong style="color: #64748b;">STF GROUP S.A.</strong> • Notificación Corporativa Automática de Calidad Textil<br>' +
      '<span style="font-size: 9.5px; color: #cbd5e1;">Este es un mensaje generado automáticamente por el sistema. Por favor no responder a esta dirección.</span>' +
    '</div>' +
  '</div>';
}

/**
 * Plantilla Flujo C: Dictamen Oficial de Calidad (Diseño Super Actualizado - Aprobado / Rechazado)
 */
function buildDictamenEmailHtml(opVal, refVal, telaVal, dictVal, obsFinal, auditorName, appUrl, driveFotoCalUrl) {
  var isAprob = String(dictVal).toUpperCase().indexOf('APROB') !== -1;

  // Paleta temática dinámica
  var topStripeColor = isAprob ? '#10B981' : '#EF4444';
  var headerBg = isAprob
    ? 'linear-gradient(135deg, #064E3B 0%, #022C22 100%)'
    : 'linear-gradient(135deg, #7F1D1D 0%, #450A0A 100%)';
  var subheaderColor = isAprob ? '#6EE7B7' : '#FCA5A5';
  var heroBg = isAprob
    ? 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)'
    : 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)';
  var heroBorderBottom = isAprob ? '2px solid #10B981' : '2px solid #EF4444';
  var heroBorderTop = isAprob ? '1px solid #A7F3D0' : '1px solid #FECACA';
  var badgeBg = isAprob ? '#059669' : '#DC2626';
  var badgeShadow = isAprob ? 'rgba(5,150,105,0.3)' : 'rgba(220,38,38,0.3)';
  var statusText = isAprob ? 'DICTAMEN: APROBADO PARA CORTE / PRODUCCIÓN' : 'DICTAMEN: RECHAZADO / NO CONFORME';
  var icon = isAprob ? '✅' : '❌';

  var obsBoxBg = isAprob ? '#F0FDF4' : '#FEF2F2';
  var obsBoxBorder = isAprob ? '#BBF7D0' : '#FECACA';
  var obsBoxLeft = isAprob ? '#059669' : '#DC2626';
  var obsTitleColor = isAprob ? '#166534' : '#991B1B';
  var obsTextColor = isAprob ? '#14532D' : '#7F1D1D';
  var obsTitle = isAprob ? '🔬 Dictamen y Concepto Final de Calidad:' : '⚠️ Motivo Técnico de Rechazo:';

  var ctaBg = isAprob
    ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
    : 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)';
  var ctaShadow = isAprob ? 'rgba(5,150,105,0.35)' : 'rgba(220,38,38,0.35)';

  var imgBlock = driveFotoCalUrl
    ? '<div style="margin: 18px 0 6px; text-align: center;">' +
        '<a href="' + driveFotoCalUrl + '" target="_blank" style="display: inline-block; background: #0f172a; color: #ffffff; padding: 11px 22px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 11.5px; letter-spacing: 0.5px; box-shadow: 0 2px 6px rgba(15,23,42,0.25);">' +
          '📸 Ver Foto de Auditoría en Google Drive (Calidad)' +
        '</a>' +
      '</div>'
    : '';

  return '<div style="font-family: \'Plus Jakarta Sans\', \'Segoe UI\', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.04);">' +
    // Barra superior de acento
    '<div style="background: ' + topStripeColor + '; height: 5px; width: 100%;"></div>' +

    // Encabezado Temático
    '<div style="background: ' + headerBg + '; color: #ffffff; padding: 26px 22px; text-align: center;">' +
      '<h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 2.5px; text-transform: uppercase; color: #ffffff;">STF GROUP S.A.</h1>' +
      '<p style="margin: 5px 0 0; font-size: 11px; color: ' + subheaderColor + '; font-weight: 800; letter-spacing: 1.8px; text-transform: uppercase;">LABORATORIO & AUDITORÍA DE CALIDAD TEXTIL</p>' +
      '<div style="display: inline-block; margin-top: 10px; padding: 4px 12px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 20px;">' +
        '<span style="font-size: 10px; color: #ffffff; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase;">DICTAMEN OFICIAL TEXTIL</span>' +
      '</div>' +
    '</div>' +

    // Hero Insignia de Veredicto
    '<div style="background: ' + heroBg + '; border-top: ' + heroBorderTop + '; border-bottom: ' + heroBorderBottom + '; padding: 18px 24px; text-align: center;">' +
      '<div style="display: inline-block; background: ' + badgeBg + '; color: #ffffff; padding: 8px 22px; border-radius: 50px; font-size: 12.5px; font-weight: 900; letter-spacing: 0.8px; text-transform: uppercase; box-shadow: 0 4px 12px ' + badgeShadow + ';">' +
        icon + ' ' + statusText +
      '</div>' +
      '<div style="margin-top: 6px; font-size: 11px; font-weight: 700; color: #475569; letter-spacing: 0.5px;">' +
        'ORDEN AUDITADA: <span style="font-family: \'JetBrains Mono\', monospace; font-weight: 900; color: #0f172a;">' + opVal + '</span>' +
      '</div>' +
    '</div>' +

    // Contenido Principal
    '<div style="padding: 24px 22px;">' +
      // Tarjeta Técnica
      '<div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">' +
        '<table style="width: 100%; border-collapse: collapse; font-size: 12px;">' +
          '<tr style="border-bottom: 1px solid #f1f5f9;">' +
            '<td style="padding: 10px 14px; background: #fafafa; color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: 0.6px; width: 36%;">Orden de Producción:</td>' +
            '<td style="padding: 10px 14px; font-weight: 900; color: #0f172a; font-family: \'JetBrains Mono\', Consolas, monospace; font-size: 14px;">' + opVal + '</td>' +
          '</tr>' +
          '<tr style="border-bottom: 1px solid #f1f5f9;">' +
            '<td style="padding: 10px 14px; background: #fafafa; color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: 0.6px;">Referencia / Tela:</td>' +
            '<td style="padding: 10px 14px; font-weight: 700; color: #0f172a;">' + refVal + ' <span style="color: #64748b; font-weight: 600;">(' + telaVal + ')</span></td>' +
          '</tr>' +
          '<tr>' +
            '<td style="padding: 10px 14px; background: #fafafa; color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: 0.6px;">Auditor Responsable:</td>' +
            '<td style="padding: 10px 14px; font-weight: 800; color: #0f172a;"><span style="display: inline-block; background: #f1f5f9; color: #0f172a; padding: 2px 8px; border-radius: 4px; font-size: 11px;">👤 ' + auditorName + '</span></td>' +
          '</tr>' +
        '</table>' +
      '</div>' +

      // Caja de Observación Final / Concepto
      '<div style="margin-top: 14px; background: ' + obsBoxBg + '; border: 1px solid ' + obsBoxBorder + '; border-left: 4px solid ' + obsBoxLeft + '; border-radius: 8px; padding: 14px 16px;">' +
        '<div style="font-size: 10px; font-weight: 800; color: ' + obsTitleColor + '; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px;">' +
          obsTitle +
        '</div>' +
        '<div style="font-size: 13px; font-weight: 700; color: ' + obsTextColor + '; line-height: 1.5;">' +
          (obsFinal || 'Colcha evaluada conforme a los estándares de calidad de STF Group S.A.') +
        '</div>' +
      '</div>' +

      imgBlock +

      // Botón CTA Principal
      '<div style="margin-top: 20px; text-align: center;">' +
        '<a href="' + appUrl + '" target="_blank" style="display: inline-block; background: ' + ctaBg + '; color: #ffffff; padding: 13px 30px; border-radius: 10px; font-weight: 900; text-decoration: none; font-size: 12px; text-transform: uppercase; letter-spacing: 0.8px; box-shadow: 0 4px 14px ' + ctaShadow + ';">' +
          '📱 VER TRAZABILIDAD COMPLETA EN LA APP' +
        '</a>' +
      '</div>' +
    '</div>' +

    // Pie de Página
    '<div style="background: #f8fafc; padding: 16px 20px; text-align: center; font-size: 10.5px; color: #94a3b8; border-top: 1px solid #e2e8f0; line-height: 1.5;">' +
      '<strong style="color: #64748b;">STF GROUP S.A.</strong> • Notificación Oficial de Dictamen de Calidad Textil<br>' +
      '<span style="font-size: 9.5px; color: #cbd5e1;">Laboratorio de Calidad ZF • Mensaje automático generado por el sistema</span>' +
    '</div>' +
  '</div>';
}

/**
 * Plantilla Flujo B: Alertas SLA (Reporte Matutino y Bajo Demanda - Diseño Moderno)
 */
function buildAlertaEmailHtml(opsList, senderName, fechaReporte, appUrl) {
  var rowsHtml = opsList.map(function (item) {
    var ret = Math.max(0, (item.diasHabiles || 0) - 3);
    return '<tr style="border-bottom: 1px solid #f1f5f9;">' +
      '<td style="padding: 10px; font-family: \'JetBrains Mono\', monospace; font-weight: 800; color: #0f172a;">OP-' + (item.op || '').replace(/^OP-?/i, '') + '</td>' +
      '<td style="padding: 10px;"><strong>' + (item.referencia || 'S/R') + '</strong><br><span style="font-size: 10.5px; color: #64748b;">' + (item.tela || '') + ' (' + (item.color || '') + ')</span></td>' +
      '<td style="padding: 10px; font-size: 11px;"><span style="display: inline-block; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 600;">' + (item.areaActual || 'PLANTA') + '</span></td>' +
      '<td style="padding: 10px; text-align: center; font-weight: 700; color: #334155;">' + (item.diasHabiles || 0) + 'd</td>' +
      '<td style="padding: 10px; color: #dc2626; font-weight: 900; text-align: center;"><span style="background: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 4px;">+' + ret + 'd</span></td>' +
      '<td style="padding: 10px; font-size: 11px; color: #475569; font-style: italic;">' + (item.observacionesOperario || 'En seguimiento') + '</td>' +
      '</tr>';
  }).join('');

  return '<div style="font-family: \'Plus Jakarta Sans\', \'Segoe UI\', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; max-width: 720px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.04);">' +
    '<div style="background: #E11D48; height: 5px; width: 100%;"></div>' +
    '<div style="background: linear-gradient(135deg, #881337 0%, #4c0519 100%); color: #ffffff; padding: 24px 20px; text-align: center;">' +
      '<h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">STF GROUP S.A.</h1>' +
      '<p style="margin: 4px 0 0; font-size: 11.5px; font-weight: 800; color: #fecdd3; letter-spacing: 1.5px; text-transform: uppercase;">INFORME OFICIAL • ALERTA DE DESVIACIÓN SLA EN PLANTA</p>' +
    '</div>' +
    '<div style="padding: 14px 22px; background: #fff1f2; border-bottom: 1px solid #fecdd3; font-size: 12px; color: #881337;">' +
      '<strong>Órdenes con Retraso Crítico:</strong> ' + opsList.length + ' OP(s) | <strong>Emitido por:</strong> ' + senderName + ' | <strong>Fecha:</strong> ' + fechaReporte +
    '</div>' +
    '<div style="padding: 20px 22px;">' +
      '<div style="border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">' +
        '<table style="width: 100%; border-collapse: collapse; font-size: 11.5px; text-align: left;">' +
          '<thead><tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.5px;"><th style="padding: 10px;">OP</th><th style="padding: 10px;">Referencia / Tela</th><th style="padding: 10px;">Área</th><th style="padding: 10px; text-align: center;">Días</th><th style="padding: 10px; text-align: center;">Retraso</th><th style="padding: 10px;">Observación</th></tr></thead>' +
          '<tbody>' + rowsHtml + '</tbody>' +
        '</table>' +
      '</div>' +
      '<div style="margin-top: 20px; text-align: center;">' +
        '<a href="' + appUrl + '" style="display: inline-block; background: linear-gradient(135deg, #881337 0%, #4c0519 100%); color: #ffffff; padding: 13px 30px; border-radius: 10px; text-decoration: none; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 0.8px; box-shadow: 0 4px 14px rgba(136,19,55,0.35);">' +
          '🚀 ABRIR MÓDULO DE ALERTAS EN LA APP' +
        '</a>' +
      '</div>' +
    '</div>' +
    '<div style="background: #f8fafc; padding: 14px 20px; text-align: center; font-size: 10.5px; color: #94a3b8; border-top: 1px solid #e2e8f0;">' +
      'STF GROUP S.A. • Sistema Integral de Control y Calidad Textil' +
    '</div>' +
  '</div>';
}

/**
 * =========================================================================
 * AUTOMATIZACIÓN DE ACTIVADORES Y REPORTES MATUTINOS (7:00 AM)
 * =========================================================================
 */

function probarPermisosYEnvioCorreo() {
  try {
    var email = Session.getActiveUser().getEmail() || 'calidadzf@studiof.com.co';
    MailApp.sendEmail({
      to: email,
      subject: '✅ [PRUEBA CONEXIÓN STF] Correos Automáticos Operativos',
      body: 'El servicio de correo automático de STF Group Colchas está funcionando correctamente.\n\nFecha de verificación: ' + new Date().toLocaleString(),
      name: 'COLCHAS STF GROUP'
    });
    SpreadsheetApp.getActiveSpreadsheet().toast('✅ Correo de prueba enviado con éxito a ' + email, '🚀 STF GROUP', 5);
  } catch (err) {
    SpreadsheetApp.getUi().alert(
      '⚠️ Autorización de Permisos Requerida',
      'Google requiere autorizar el servicio de correo por primera vez desde el editor de Apps Script:\n\n' +
      '1. Ve a: Extensiones > Apps Script\n' +
      '2. En la barra superior, selecciona la función "autorizarTodosLosPermisosSTF"\n' +
      '3. Haz clic en el botón "Ejecutar" (Run)\n' +
      '4. Concede los permisos en la ventana de Google y vuelve a intentar.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * Función que ejecuta el Disparador de las 7:00 AM todos los días hábiles
 */
function enviarReporteDiarioAutomaticoSLA() {
  var ss = getTargetSpreadsheet();
  autoCleanMonitoreoFromBaseDeDatos(ss);

  var sheetBd = ss.getSheetByName(SHEET_BASE_DATOS) || ss.getSheetByName('01_BASE_DE_DATOS') || ss.getSheets()[0];
  if (!sheetBd || sheetBd.getLastRow() <= 1) return;

  var data = sheetBd.getDataRange().getValues();
  var now = new Date();
  var opsList = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var op = row[5];
    var estado = String(row[9] || '').toUpperCase();
    if (!op || estado === 'FINALIZADO') continue;

    var diasHabiles = calcularDiasHabiles(row[0], now);
    if (diasHabiles > 3) {
      opsList.push({
        op: String(op).replace(/^OP-?/i, ''),
        referencia: String(row[6] || 'S/R'),
        tela: String(row[2] || ''),
        color: String(row[4] || 'AZUL'),
        areaActual: mapAreaToTitle(estado),
        diasHabiles: diasHabiles,
        observacionesOperario: String(row[10] || row[11] || 'En seguimiento SLA')
      });
    }
  }

  if (opsList.length === 0) {
    Logger.log('Excelente: No hay órdenes con retraso SLA > 3 días. No se despacha correo para evitar spam.');
    return;
  }

  opsList.sort(function (a, b) { return b.diasHabiles - a.diasHabiles; });
  var recipients = getAllUserEmails(ss);
  if (!recipients || recipients.length === 0) {
    Logger.log('⚠️ No hay correos destinatarios registrados en la Columna E de la hoja USUARIOS. No se despacha reporte SLA.');
    return;
  }
  var appUrl = 'https://colchas.vercel.app/?tab=alertas';
  var fechaReporte = Utilities.formatDate(now, 'America/Bogota', 'd/M/yyyy HH:mm:ss');
  var subject = '🚨 [ALERTA MATUTINA SLA STF] ' + opsList.length + ' Órdenes de Producción con Retraso en Planta';
  var htmlBody = buildAlertaEmailHtml(opsList, 'TRIGGER MATUTINO AUTOMÁTICO (7:00 AM)', fechaReporte, appUrl);

  MailApp.sendEmail({
    to: recipients.join(','),
    subject: subject,
    htmlBody: htmlBody,
    name: 'ALERTAS SLA - STF GROUP'
  });

  // Actualizar columna 14 en ALERTAS
  var sheetAlRep = ss.getSheetByName(SHEET_ALERTAS);
  if (sheetAlRep && sheetAlRep.getLastRow() > 1) {
    var lastRowRep = sheetAlRep.getLastRow();
    for (var k = 2; k <= lastRowRep; k++) {
      sheetAlRep.getRange(k, 14).setValue(fechaReporte + ' (7AM Auto)');
    }
  }

  Logger.log('✅ Reporte matutino de SLA enviado a ' + recipients.length + ' destinatarios.');
}

/**
 * Instala el activador diario en 1 solo clic desde el menú
 */
function instalarActivadorDiario7AM() {
  try {
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === 'enviarReporteDiarioAutomaticoSLA') {
        ScriptApp.deleteTrigger(triggers[i]);
      }
    }

    ScriptApp.newTrigger('enviarReporteDiarioAutomaticoSLA')
      .timeBased()
      .everyDays(1)
      .atHour(7)
      .inTimezone('America/Bogota')
      .create();

    SpreadsheetApp.getActiveSpreadsheet().toast('✅ Activador de las 7:00 AM programado exitosamente.', '🚀 STF GROUP', 6);
  } catch (err) {
    SpreadsheetApp.getUi().alert(
      '⚠️ Autorización de Activadores Requerida',
      'Google exige autorizar la creación de activadores automáticos desde el editor de Apps Script:\n\n' +
      '1. Ve a: Extensiones > Apps Script\n' +
      '2. En el selector superior de funciones, selecciona "instalarActivadorDiario7AM"\n' +
      '3. Haz clic en "Ejecutar" (Run)\n' +
      '4. Haz clic en "Revisar permisos" > Selecciona tu cuenta > "Configuración avanzada" > "Ir a... (no seguro)" > "Permitir".',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * =========================================================================
 * DEPURACIÓN Y NORMALIZACIÓN DE COLUMNAS K, L, M y N EN BASE_DE_DATOS
 * =========================================================================
 */
function cleanColumnsKLMN(ss) {
  if (!ss) ss = getTargetSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_BASE_DATOS) || ss.getSheetByName('01_BASE_DE_DATOS') || ss.getSheets()[0];
  if (!sheet || sheet.getLastRow() < 2) return 0;

  var allEmails = getAllUserEmails(ss);
  var defEmails = allEmails.join(', ');
  var lastRow = sheet.getLastRow();

  var opRangeVals = sheet.getRange(2, 6, lastRow - 1, 1).getValues();
  var range = sheet.getRange(2, 11, lastRow - 1, 4);
  var vals = range.getValues();
  var mod = 0;

  var rootFld = null;
  var monthFld = null;

  for (var i = 0; i < vals.length; i++) {
    var rawOp = String(opRangeVals[i][0] || '').trim();
    var formattedOp = rawOp.toUpperCase().indexOf('OP-') === 0 ? ('OP-' + rawOp.substring(3).trim()) : (rawOp.toUpperCase().indexOf('OP') === 0 ? ('OP-' + rawOp.substring(2).replace(/^[-_\s]+/, '').trim()) : ('OP-' + rawOp));

    var op = String(vals[i][0] || '');
    var col = String(vals[i][1] || '');
    var ev = String(vals[i][2] || '');
    var mail = String(vals[i][3] || '');
    var ch = false;

    // 1. Limpieza de Observación Operario (Columna K)
    if (op.indexOf(' | ') !== -1) { op = op.split(' | ')[0].trim(); ch = true; }
    if (op.toLowerCase().indexOf('colcha recibida') !== -1) { op = op.replace(/colcha recibida.*/i, '').trim(); ch = true; }
    if (op.indexOf('[DICTAMEN:') !== -1) { op = op.replace(/\[DICTAMEN:.*\]/i, '').trim(); ch = true; }
    var cleanP = op.replace(/^\[[^\]]+\]:\s*/, '').trim();
    if (cleanP !== op) { op = cleanP; ch = true; }

    // 2. Limpieza de Observación Colfactory (Columna L)
    if (col.toLowerCase().indexOf('colcha recibida') !== -1 || col.indexOf('[LAVANDERIA]') !== -1) { col = ''; ch = true; }

    // 3. Normalización y resolución de Evidencias en Drive (Columna M: Link clickeable de la Carpeta de Drive de la OP)
    if (ev.indexOf('/folders/') === -1 || ev.indexOf(' | ') !== -1 || ev.indexOf('data:') === 0 || ev === rawOp || ev === formattedOp || ev.indexOf('.jpg') !== -1 || !ev) {
      try {
        if (formattedOp && formattedOp.length > 3) {
          var opPhotosFound = getOpPhotosFromDrive(formattedOp);
          var resolvedColM = opPhotosFound.folderUrl || opPhotosFound.foto1 || opPhotosFound.foto2 || '';
          if (resolvedColM && resolvedColM !== ev) {
            ev = resolvedColM;
            ch = true;
          } else if (!resolvedColM && (ev.indexOf('data:') === 0 || ev === rawOp || ev === formattedOp || ev.indexOf('.jpg') !== -1)) {
            ev = '';
            ch = true;
          }
        }
      } catch (errF) {}
    }

    // 4. Depuración de correos
    if (mail.indexOf('(Error') !== -1 || mail.indexOf('usuarios)') !== -1 || (mail.indexOf('@') === -1 && mail.length > 0)) { 
      mail = defEmails; 
      ch = true; 
    }

    if (ch) { 
      vals[i][0] = op; 
      vals[i][1] = col; 
      vals[i][2] = ev; 
      vals[i][3] = mail; 
      mod++; 
    }
  }
  if (mod > 0) range.setValues(vals);
  return mod;
}
