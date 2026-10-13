/**
 * =========================================================================
 * 03_Endpoints.js - Endpoints doGet y doPost (Webhook API bidireccional de Antigravity)
 * SISTEMA STF GROUP - CONTROL DE CALIDAD DE COLCHAS & TRAZABILIDAD TEXTIL
 * =========================================================================
 */

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
            var targetDigits = cleanTargetOp.replace(/\D/g, '');
            for (var b = 0; b < bdVals.length; b++) {
              var rowOpStr = String(bdVals[b][0] || '').trim().toUpperCase();
              var rowOpPure = rowOpStr.replace(/^OP-?/, '');
              var rowOpDigits = rowOpStr.replace(/\D/g, '');
              if (rowOpStr === cleanTargetOp || rowOpPure === targetPure || (targetDigits && rowOpDigits === targetDigits)) {
                var f1G = photosFound.foto1 || '';
                var f2G = photosFound.foto2 || '';
                if (f1G && f2G && f1G === f2G) f1G = '';
                var targetFolderColM = photosFound.folderUrl || f1G || f2G || '';
                if (targetFolderColM) {
                  try {
                    if (targetFolderColM.indexOf('http') === 0) {
                      var richGet = SpreadsheetApp.newRichTextValue()
                        .setText(targetFolderColM)
                        .setLinkUrl(targetFolderColM)
                        .build();
                      shBdGet.getRange(b + 2, 13).setRichTextValue(richGet);
                    } else {
                      shBdGet.getRange(b + 2, 13).setValue(targetFolderColM);
                    }
                  } catch (eBdFix) {
                    shBdGet.getRange(b + 2, 13).setValue(targetFolderColM);
                  }
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
 * Registra automáticamente el evento cronológico de movimiento en la hoja TRAZABILIDAD_TIEMPOS
 */
function recordTimelineEventInSheet(ss, op, ref, tela, deEstado, aEstado, fechaHora, tiempoPrevio, responsable, observacion) {
  try {
    var sheet = ss.getSheetByName(SHEET_TRAZABILIDAD);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_TRAZABILIDAD);
      sheet.getRange(1, 1, 1, TRAZABILIDAD_HEADERS.length).setValues([TRAZABILIDAD_HEADERS]);
      sheet.getRange(1, 1, 1, TRAZABILIDAD_HEADERS.length)
        .setBackground('#000000')
        .setFontColor('#FFFFFF')
        .setFontWeight('bold')
        .setFontFamily('Roboto')
        .setFontSize(10);
      sheet.setFrozenRows(1);
    }

    var mes = (new Date()).getMonth() + 1;
    var row = [
      String(op || '').trim(),
      String(ref || '').trim(),
      String(tela || '').trim(),
      String(deEstado || '').trim(),
      String(aEstado || '').trim(),
      String(fechaHora || '').trim(),
      String(tiempoPrevio || '').trim(),
      String(responsable || '').trim(),
      String(observacion || '').trim(),
      mes
    ];

    sheet.appendRow(row);
    return true;
  } catch (e) {
    Logger.log('Error registrando evento de trazabilidad: ' + e.toString());
    return false;
  }
}

/**
 * =========================================================================
 * ENDPOINT POST (Escritura, Transferencias, Dictámenes y Fotos en Drive)
 * =========================================================================
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  var hasLock = false;
  try {
    hasLock = lock.tryLock(30000);
    if (!hasLock) {
      return createJsonResponse({ status: 'error', message: 'Servidor ocupado procesando otra transacción. Por favor reintente en unos segundos.' });
    }

    var data = JSON.parse(e.postData ? e.postData.contents : '{}');
    var action = data.action;
    var payload = data.payload || {};
    var ss = getTargetSpreadsheet();

    // 0. RECORD_TIMELINE_EVENT (Trazabilidad automática de movimientos por área)
    if (action === 'RECORD_TIMELINE_EVENT') {
      recordTimelineEventInSheet(
        ss,
        payload.op,
        payload.referencia,
        payload.tela,
        payload.deEstado,
        payload.aEstado,
        payload.fechaHora,
        payload.tiempoPrevio,
        payload.responsable,
        payload.observacion
      );
      return createJsonResponse({ status: 'success', message: 'Trazabilidad de tiempo registrada' });
    }

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

    // 4.1 CLEAN_EMPTY_ROWS (Depuración y compactación de filas vacías en BASE_DE_DATOS)
    if (action === 'CLEAN_EMPTY_ROWS' || action === 'CLEAN_BLANK_ROWS') {
      var cleanedEmpty = cleanEmptyRowsInBaseDeDatos(ss);
      return createJsonResponse({ status: 'success', message: 'Se eliminaron ' + cleanedEmpty + ' filas vacías intermedias', deletedCount: cleanedEmpty });
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

      var rawObsOp = String(opData['OBSERVACIÓN OPERARIO'] || opData.observacionesOperario || opData.observacionOperario || '').trim();
      var obsOpVal = (rawObsOp.indexOf(' | ') !== -1 ? rawObsOp.split(' | ')[0].trim() : rawObsOp).replace(/^\[[^\]]+\]:\s*/, '').trim();

      var rawObsCol = String(opData['OBSERVACIÓN COLFACTORY'] || opData.observacionColfactory || opData.observacionesLavanderia || payload['OBSERVACIÓN COLFACTORY'] || payload.observacionColfactory || payload.observacionesLavanderia || '').trim();
      var obsColVal = '';
      if (rawObsCol && rawObsCol.toLowerCase().indexOf('colcha recibida') === -1 && rawObsCol.indexOf('[LAVANDERIA]') === -1) {
        obsColVal = rawObsCol.indexOf(' | ') !== -1 ? rawObsCol.split(' | ')[0].trim() : rawObsCol;
      }

      // La Columna E de la hoja USUARIOS es la FUENTE MAESTRA DE LA VERDAD
      var recipientsList = getAllUserEmails(ss);
      if (!recipientsList || recipientsList.length === 0) {
        recipientsList = payload.userEmails || payload.recipients || [];
      }

      var cleanEmailArray = (recipientsList || []).map(function (e) { return String(e).trim().toLowerCase(); }).filter(function (e) { return e.indexOf('@') !== -1; });
      var uniqueEmails = [];
      for (var u = 0; u < cleanEmailArray.length; u++) {
        if (uniqueEmails.indexOf(cleanEmailArray[u]) === -1) uniqueEmails.push(cleanEmailArray[u]);
      }
      var correoNotificadoStr = uniqueEmails.join(', ');

      var obsFinalVal = opData['OBS.OPERARIO FINAL'] || opData.obsOperarioFinal || opData.observacionesCalidad || '';
      var mesNumero = Number(opData['MES'] || opData.mes || (now.getMonth() + 1));
      var dictVal = payload.dictamenFinal || payload.dictamen || payload.veredicto || '';
      var evidenciaVal = (opData.fotoMuestraUrl && String(opData.fotoMuestraUrl).indexOf('http') === 0) ? opData.fotoMuestraUrl : '';

      var newRow = [
        fechaFormatted, inspectorVal, telaVal, mtVal, colorVal, opVal,
        refVal, rollosVal, loteVal, estadoVal, obsOpVal, obsColVal,
        evidenciaVal, correoNotificadoStr, obsFinalVal, dictVal, mesNumero
      ];

      // 1. Depurar filas vacías intermedias previas (compactación automática de la base de datos)
      cleanEmptyRowsInBaseDeDatos(ss);

      // 2. BLINDAJE CONTRA DUPLICADOS: Verificar si la OP ya existe en BASE_DE_DATOS
      var existingRowIndex = -1;
      var lastRowBd = sheetBd.getLastRow();
      if (lastRowBd > 1) {
        var opValsCheck = sheetBd.getRange(2, 6, lastRowBd - 1, 1).getValues();
        var targetDigitsCheck = opVal.replace(/\D/g, '');
        for (var cIdx = 0; cIdx < opValsCheck.length; cIdx++) {
          var rowOpStr = String(opValsCheck[cIdx][0] || '').trim().toUpperCase();
          var rowDigitsCheck = rowOpStr.replace(/\D/g, '');
          if (rowOpStr === opVal.toUpperCase() || (targetDigitsCheck && rowDigitsCheck && targetDigitsCheck === rowDigitsCheck)) {
            existingRowIndex = cIdx + 2;
            break;
          }
        }
      }

      var targetRow = existingRowIndex !== -1 ? existingRowIndex : (getRealLastDataRowInBaseDeDatos(sheetBd) + 1);

      // 3. Garantizar que la hoja disponga de filas físicas suficientes
      if (targetRow > sheetBd.getMaxRows()) {
        sheetBd.insertRowAfter(sheetBd.getMaxRows());
      }

      // 4. Inserción atómica y prioritaria de los datos en BASE_DE_DATOS
      sheetBd.getRange(targetRow, 1, 1, newRow.length).setValues([newRow]);

      // 5. Inmediatamente depurar y eliminar la OP de la hoja MONITOREO
      normalizeAllOpCodesInBaseDeDatos(ss);
      if (opVal) removeOpFromMonitoreoSheet(ss, opVal);
      autoCleanMonitoreoFromBaseDeDatos(ss);

      // 6. Registrar evento inicial en TRAZABILIDAD_TIEMPOS
      try {
        recordTimelineEventInSheet(ss, opVal, refVal, telaVal, 'CREACIÓN', estadoVal, fechaFormatted, '0 min', inspectorVal, obsOpVal || 'Creación inicial');
      } catch (eTime) {}

      // 7. Guardar Foto 1 en Google Drive (Mes / OP) en bloque resiliente
      var driveUrl = '';
      var folderUrl = '';
      var photoRaw = opData.fotoMuestraUrl || opData.imageBase64 || opData['EVIDENCIA (LINK DRIVE)'] || '';
      var fileNameInitial = opVal + '_MUESTRA_INICIAL.jpg';
      if (photoRaw && photoRaw.indexOf('/9j/') === 0) {
        photoRaw = 'data:image/jpeg;base64,' + photoRaw;
      }

      if (photoRaw && photoRaw.length > 50 && photoRaw.indexOf('data:image/') === 0) {
        try {
          var savedPhotoRes = saveImageToDriveHierarchical(photoRaw, fileNameInitial, opVal, now);
          if (savedPhotoRes) {
            driveUrl = savedPhotoRes.driveUrl || '';
            folderUrl = savedPhotoRes.folderUrl || '';
            var finalEvidencia = folderUrl || driveUrl || '';
            if (finalEvidencia && String(finalEvidencia).indexOf('http') === 0) {
              try {
                var richLinkNew = SpreadsheetApp.newRichTextValue()
                  .setText(finalEvidencia)
                  .setLinkUrl(finalEvidencia)
                  .build();
                sheetBd.getRange(targetRow, 13).setRichTextValue(richLinkNew);
              } catch (eRichAppend) {
                sheetBd.getRange(targetRow, 13).setValue(finalEvidencia);
              }
            }
          }
        } catch (eDrive) {
          console.error('Error guardando imagen en Drive:', eDrive);
        }
      } else if (photoRaw && photoRaw.indexOf('http') === 0) {
        driveUrl = photoRaw;
      }

      // 8. FLUJO A: Envío automático por correo en bloque seguro
      if (uniqueEmails.length > 0) {
        try {
          var appUrl = payload.appUrl || ('https://colchas.vercel.app/?op=' + encodeURIComponent(opVal) + '&view=public');
          if (appUrl.indexOf('localhost') !== -1 || appUrl.indexOf('127.0.0.1') !== -1) {
            appUrl = 'https://colchas.vercel.app/?op=' + encodeURIComponent(opVal) + '&view=public';
          }
          var mailSubject = '🧵 [NUEVA COLCHA CREADA] ' + opVal + ' • ' + (refVal || 'S/R') + ' (' + telaVal + ')';
          var mailHtml = buildNewOpEmailHtml(opData, opVal, fechaFormatted, appUrl, driveUrl);
          MailApp.sendEmail({
            to: uniqueEmails.join(','),
            subject: mailSubject,
            htmlBody: mailHtml,
            name: 'COLCHAS STF GROUP - SISTEMA OFICIAL'
          });
        } catch (mailErr) {
          console.error('Error enviando correo creación en lote, reintentando individualmente:', mailErr);
          for (var mi = 0; mi < uniqueEmails.length; mi++) {
            try {
              MailApp.sendEmail({
                to: uniqueEmails[mi],
                subject: mailSubject,
                htmlBody: mailHtml,
                name: 'COLCHAS STF GROUP - SISTEMA OFICIAL'
              });
            } catch (indivErr) {
              console.error('Fallo envío creación a ' + uniqueEmails[mi] + ':', indivErr);
            }
          }
        }
      }

      SpreadsheetApp.flush();

      return createJsonResponse({
        status: 'success',
        message: 'Solicitud ' + opVal + ' ingresada correctamente en BASE_DE_DATOS y archivada en Drive',
        driveUrl: driveUrl,
        folderUrl: folderUrl,
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
      var targetDigitsTrans = targetOpTrans.replace(/\D/g, '');
      var targetIntTrans = targetDigitsTrans ? parseInt(targetDigitsTrans, 10) : null;
      var valuesBdTrans = sheetBdTrans.getDataRange().getValues();
      var foundRowTrans = -1;

      for (var t = 1; t < valuesBdTrans.length; t++) {
        var cellOpTrans = String(valuesBdTrans[t][5] || '').trim().toUpperCase().replace(/^OP-?/, '');
        var cellDigitsTrans = cellOpTrans.replace(/\D/g, '');
        var cellIntTrans = cellDigitsTrans ? parseInt(cellDigitsTrans, 10) : null;
        if (
          cellOpTrans === targetOpTrans ||
          (targetDigitsTrans && cellDigitsTrans && targetDigitsTrans === cellDigitsTrans) ||
          (targetIntTrans !== null && cellIntTrans !== null && targetIntTrans === cellIntTrans)
        ) {
          foundRowTrans = t + 1;
          break;
        }
      }

      if (foundRowTrans !== -1) {
        sheetBdTrans.getRange(foundRowTrans, 6).setValue('OP-' + targetOpTrans);
        
        var estadoFinalTrans = String(payload.nuevoEstado || payload.estado || '').trim();
        if (estadoFinalTrans.indexOf('EVALUAD') !== -1) {
          estadoFinalTrans = 'EVALUADO Y ENVIADO';
        }
        if (estadoFinalTrans) {
          sheetBdTrans.getRange(foundRowTrans, 10).setValue(estadoFinalTrans);
        }

        // Actualizar Inspector (Columna B: 2) si viene definido
        var inspectorTrans = payload.nuevoInspector || payload.inspector || payload.auditorCalidad || '';
        if (inspectorTrans) {
          sheetBdTrans.getRange(foundRowTrans, 2).setValue(String(inspectorTrans).trim());
        }

        // Guardar Observación Colfactory en Columna L (Columna 12)
        var obsColfactoryInput = payload.observacionColfactory || payload.observacionesLavanderia || '';
        if (!obsColfactoryInput && (estadoFinalTrans === 'LAVANDERIA' || payload.estadoAnterior === 'LAVANDERIA' || estadoFinalTrans === 'CALIDAD' || payload.estado === 'LAVANDERIA' || payload.origen === 'LAVANDERIA')) {
          obsColfactoryInput = payload.observaciones || '';
        }
        if (obsColfactoryInput) {
          var cleanColObs = String(obsColfactoryInput).trim();
          if (cleanColObs.toLowerCase().indexOf('colcha recibida') === -1 && cleanColObs.indexOf('[LAVANDERIA]') === -1) {
            sheetBdTrans.getRange(foundRowTrans, 12).setValue(cleanColObs);
          }
        }

        // Columna O (15) para concepto de calidad y Columna P (16) para dictamen en FINALIZADO o EVALUADO
        var isFinOrEvalState = estadoFinalTrans === 'FINALIZADO' || estadoFinalTrans.indexOf('EVALUAD') !== -1;
        var calidadObs = payload.obsOperarioFinal || payload.observacionesCalidad || payload.observacionesTecnicas || (isFinOrEvalState ? payload.observaciones : '');
        if (calidadObs && isFinOrEvalState) {
          var finalObsToSet = String(calidadObs).trim();
          if (finalObsToSet.toLowerCase().indexOf('colcha recibida') === -1) {
            sheetBdTrans.getRange(foundRowTrans, 15).setValue(finalObsToSet);
          }
        }
        if (payload.dictamen && isFinOrEvalState) {
          sheetBdTrans.getRange(foundRowTrans, 16).setValue(payload.dictamen);
        }

        // Guardar Foto 2 en Google Drive si se envía durante la evaluación técnica
        var calPhotoPayload = payload.fotoCalidad || payload.fotoCalidadUrl || payload.foto2Base64 || payload.imageBase64 || '';
        var savedFotoTrans = null;
        var finalF2Trans = '';
        var finalFolderTrans = '';
        if (calPhotoPayload && calPhotoPayload.length > 50 && isFinOrEvalState) {
          try {
            if (calPhotoPayload.indexOf('data:image/') === 0 || calPhotoPayload.indexOf('/9j/') === 0) {
              if (calPhotoPayload.indexOf('data:image/') !== 0) calPhotoPayload = 'data:image/jpeg;base64,' + calPhotoPayload;
              var fileNamePost = 'OP-' + targetOpTrans + '_POST_LAVADO_CALIDAD.jpg';
              savedFotoTrans = saveImageToDriveHierarchical(calPhotoPayload, fileNamePost, 'OP-' + targetOpTrans, new Date());
            }
            var discTrans = getOpPhotosFromDrive('OP-' + targetOpTrans);
            var finalF1Trans = discTrans.foto1 || '';
            finalF2Trans = (savedFotoTrans && savedFotoTrans.driveUrl) || discTrans.foto2 || (calPhotoPayload.indexOf('http') === 0 ? calPhotoPayload : '');
            finalFolderTrans = (savedFotoTrans && savedFotoTrans.folderUrl) || discTrans.folderUrl || '';
            if (finalF1Trans && finalF2Trans && finalF1Trans === finalF2Trans) {
              finalF1Trans = '';
            }
            var colPartsTrans = [];
            if (finalF1Trans) colPartsTrans.push('FOTO1: ' + finalF1Trans);
            if (finalF2Trans) colPartsTrans.push('FOTO2: ' + finalF2Trans);
            if (finalFolderTrans) colPartsTrans.push(finalFolderTrans);
            var updatedM = colPartsTrans.join(' | ');
            if (updatedM) {
              sheetBdTrans.getRange(foundRowTrans, 13).setValue(updatedM);
            }
          } catch (errFotoTrans) {
            Logger.log('Error guardando foto en TRANSFER_OP: ' + errFotoTrans.toString());
          }
        }

        // Si fue transferida a FINALIZADO, depurar de hoja ALERTAS
        if (estadoFinalTrans === 'FINALIZADO') {
          var shAlTrans = ss.getSheetByName(SHEET_ALERTAS);
          if (shAlTrans && shAlTrans.getLastRow() > 1) {
            var vAlTrans = shAlTrans.getRange(2, 1, shAlTrans.getLastRow() - 1, 1).getValues();
            for (var at = vAlTrans.length - 1; at >= 0; at--) {
              var cellOpAlT = String(vAlTrans[at][0] || '').trim().toUpperCase().replace(/^OP-?/, '');
              var cellDigitsAlT = cellOpAlT.replace(/\D/g, '');
              if (
                cellOpAlT === targetOpTrans ||
                (targetDigitsTrans && cellDigitsAlT && targetDigitsTrans === cellDigitsAlT)
              ) {
                shAlTrans.deleteRow(at + 2);
              }
            }
          }
        }

        // Registrar evento en TRAZABILIDAD_TIEMPOS
        try {
          var fechaNowStrTrans = (new Date()).toLocaleString('es-CO');
          var telaTrans = sheetBdTrans.getRange(foundRowTrans, 3).getValue() || '';
          var refTrans = sheetBdTrans.getRange(foundRowTrans, 7).getValue() || '';
          var prevEstTrans = payload.estadoAnterior || payload.origen || '';
          recordTimelineEventInSheet(
            ss,
            'OP-' + targetOpTrans,
            refTrans,
            telaTrans,
            prevEstTrans || 'TRANSICIÓN',
            estadoFinalTrans,
            fechaNowStrTrans,
            '',
            inspectorTrans || 'OPERARIO STF',
            calidadObs || obsColfactoryInput || 'Movimiento de área'
          );
        } catch (eTimeTrans) {}

        try {
          SpreadsheetApp.flush();
        } catch (eFlushTrans) {}

        return createJsonResponse({ 
          status: 'success', 
          message: 'OP OP-' + targetOpTrans + ' transferida a fase ' + estadoFinalTrans,
          driveUrl: (savedFotoTrans && savedFotoTrans.driveUrl) || finalF2Trans || '',
          folderUrl: (savedFotoTrans && savedFotoTrans.folderUrl) || finalFolderTrans || ''
        });
      }
      return createJsonResponse({ status: 'error', message: 'OP no encontrada en BASE_DE_DATOS' });
    }

    if (action === 'ACTIVATE_EVALUADO_DROPDOWN' || action === 'UPDATE_STATUS_VALIDATION') {
      var resVal = configurarValidacionEstados(ss);
      return createJsonResponse(resVal);
    }

    // -----------------------------------------------------------------------
    // ACCIÓN 7: UPDATE_DICTAMEN (FLUJO C: Notificación de Liberación Aprobado/Rechazado)
    // -----------------------------------------------------------------------
    if (action === 'UPDATE_DICTAMEN') {
      var sheetBdDict = ss.getSheetByName(SHEET_BASE_DATOS) || ss.getSheetByName('01_BASE_DE_DATOS') || ss.getSheets()[0];
      var targetOpDict = String(payload.op || '').trim().toUpperCase().replace(/^OP-?/, '');
      var opFormattedDict = 'OP-' + targetOpDict;
      var targetDigitsDict = targetOpDict.replace(/\D/g, '');
      var targetIntDict = targetDigitsDict ? parseInt(targetDigitsDict, 10) : null;
      var valuesBdDict = sheetBdDict.getDataRange().getValues();
      var foundRowDict = -1;

      for (var d = 1; d < valuesBdDict.length; d++) {
        var cellOpDict = String(valuesBdDict[d][5] || '').trim().toUpperCase().replace(/^OP-?/, '');
        var cellDigitsDict = cellOpDict.replace(/\D/g, '');
        var cellIntDict = cellDigitsDict ? parseInt(cellDigitsDict, 10) : null;
        if (
          cellOpDict === targetOpDict ||
          (targetDigitsDict && cellDigitsDict && targetDigitsDict === cellDigitsDict) ||
          (targetIntDict !== null && cellIntDict !== null && targetIntDict === cellIntDict)
        ) {
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
        if (dictPhotoBase64 && dictPhotoBase64.indexOf('/9j/') === 0) {
          dictPhotoBase64 = 'data:image/jpeg;base64,' + dictPhotoBase64;
        }
        if (dictPhotoBase64 && dictPhotoBase64.length > 50 && dictPhotoBase64.indexOf('data:image/') === 0) {
          savedCalPhoto = saveImageToDriveHierarchical(dictPhotoBase64, opFormattedDict + '_POST_LAVADO_CALIDAD.jpg', opFormattedDict, new Date());
          if (savedCalPhoto && savedCalPhoto.driveUrl) calPhotoUrl = savedCalPhoto.driveUrl;
        } else if (dictPhotoBase64 && dictPhotoBase64.indexOf('http') === 0) {
          calPhotoUrl = dictPhotoBase64;
        }

        // Columna 13 (M) - Guardar enlace oficial clickeable de la carpeta de Google Drive de la OP y enlaces directos de fotos (foto1 | foto2 | folderUrl)
        var discoveredDict = getOpPhotosFromDrive(opFormattedDict);
        var folderCol13 = (savedCalPhoto && savedCalPhoto.folderUrl) ? savedCalPhoto.folderUrl : (discoveredDict.folderUrl || '');
        var finalFoto1_13 = discoveredDict.foto1 || '';
        var finalFoto2_13 = (savedCalPhoto && savedCalPhoto.driveUrl) ? savedCalPhoto.driveUrl : (calPhotoUrl || discoveredDict.foto2 || '');
        if (finalFoto1_13 && finalFoto2_13 && finalFoto1_13 === finalFoto2_13) {
          finalFoto1_13 = '';
        }
        var colPartsDict = [];
        if (finalFoto1_13) colPartsDict.push('FOTO1: ' + finalFoto1_13);
        if (finalFoto2_13) colPartsDict.push('FOTO2: ' + finalFoto2_13);
        if (folderCol13) colPartsDict.push(folderCol13);
        var combinedCol13 = colPartsDict.join(' | ');
        if (combinedCol13) {
          sheetBdDict.getRange(foundRowDict, 13).setValue(combinedCol13);
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
        pureObs = pureObs.replace(/^\[DICTAMEN:\s*(APROBADO|APROBADO EN GAMA|RECHAZADO|PENDIENTE)\]\s*/i, '').trim();
        sheetBdDict.getRange(foundRowDict, 15).setValue(pureObs);

        var dictVal = payload.dictamenFinal || payload.dictamen || payload.veredicto || 'APROBADO';
        sheetBdDict.getRange(foundRowDict, 16).setValue(dictVal);

        // Depurar de hoja ALERTAS con coincidencia numérica robusta
        var shAl = ss.getSheetByName(SHEET_ALERTAS);
        if (shAl && shAl.getLastRow() > 1) {
          var vAl = shAl.getRange(2, 1, shAl.getLastRow() - 1, 1).getValues();
          for (var a = vAl.length - 1; a >= 0; a--) {
            var cellOpAl = String(vAl[a][0] || '').trim().toUpperCase().replace(/^OP-?/, '');
            var cellDigitsAl = cellOpAl.replace(/\D/g, '');
            if (
              cellOpAl === targetOpDict ||
              (targetDigitsDict && cellDigitsAl && targetDigitsDict === cellDigitsAl)
            ) {
              shAl.deleteRow(a + 2);
            }
          }
        }

        // Registrar evento de finalización en TRAZABILIDAD_TIEMPOS
        try {
          var rowValsTime = sheetBdDict.getRange(foundRowDict, 1, 1, 10).getValues()[0];
          var auditorNameTime = payload.auditorCalidad || payload.inspector || 'COLFACTORY (FACTORY)';
          var telaTime = rowValsTime[2] || '';
          var refTime = rowValsTime[6] || '';
          var fechaNowStr = (new Date()).toLocaleString('es-CO');
          recordTimelineEventInSheet(
            ss,
            opFormattedDict,
            refTime,
            telaTime,
            'EVALUADO Y ENVIADO',
            'FINALIZADO',
            fechaNowStr,
            '',
            auditorNameTime,
            pureObs || 'Orden evaluada y finalizada oficialmente (Liberada)'
          );
        } catch (eTimeRec) {
          console.warn('Error registrando timeline en UPDATE_DICTAMEN:', eTimeRec);
        }

        // Forzar vaciado de buffer a disco para que GViz CSV y la hoja reflejen inmediatamente
        try {
          SpreadsheetApp.flush();
        } catch (eFlush) {}

        // FLUJO C: Envío automático inmediato de Correo de Dictamen / Liberación
        // Fuente de la verdad: Correos configurados en la Columna E de la hoja USUARIOS
        var emailsFromSheetDict = getAllUserEmails(ss);
        var recipientsDict = emailsFromSheetDict;
        if (!recipientsDict || recipientsDict.length === 0) {
          var col14Emails = String(sheetBdDict.getRange(foundRowDict, 14).getValue() || '');
          if (col14Emails) {
            recipientsDict = col14Emails.split(',').map(function (e) { return e.trim().toLowerCase(); }).filter(function (e) { return e.indexOf('@') !== -1; });
          }
        }
        if (!recipientsDict || recipientsDict.length === 0) {
          var clientEmails = payload.userEmails || payload.recipients || [];
          if (Array.isArray(clientEmails) && clientEmails.length > 0) {
            recipientsDict = clientEmails;
          }
        }
        var cleanDictArray = (recipientsDict || []).map(function (e) { return String(e).trim().toLowerCase(); }).filter(function (e) { return e.indexOf('@') !== -1; });
        var uniqueRecipientsDict = [];
        for (var rd = 0; rd < cleanDictArray.length; rd++) {
          if (uniqueRecipientsDict.indexOf(cleanDictArray[rd]) === -1) uniqueRecipientsDict.push(cleanDictArray[rd]);
        }

        if (uniqueRecipientsDict.length > 0) {
          var rowVals = sheetBdDict.getRange(foundRowDict, 1, 1, 15).getValues()[0];
          var telaDict = rowVals[2] || 'TELA TEXTIL';
          var mtDict = rowVals[3] || '';
          var colorDict = rowVals[4] || '';
          var refDict = rowVals[6] || 'S/R';
          var rollosDict = rowVals[7] || '';
          var obsOperarioDict = rowVals[10] || '';
          var obsLavaderoDict = rowVals[11] || '';
          var auditorName = payload.auditorCalidad || payload.inspector || 'LABORATORIO DE CALIDAD';
          var appUrlDict = 'https://colchas.vercel.app/?op=' + encodeURIComponent(opFormattedDict) + '&view=public';
          var isEnGama = String(dictVal).toUpperCase().indexOf('GAMA') !== -1;
          var isAprobado = String(dictVal).toUpperCase().indexOf('APROB') !== -1;
          var subjectDict = (isEnGama ? '🎨 [COLCHA APROBADA EN GAMA] ' : (isAprobado ? '✅ [COLCHA APROBADA] ' : '❌ [COLCHA RECHAZADA] ')) + opFormattedDict + ' • REF: ' + refDict + ' (' + telaDict + ')';
          var driveFotoCalUrl = (savedCalPhoto && savedCalPhoto.driveUrl) ? savedCalPhoto.driveUrl : (calPhotoUrl || finalFoto2_13 || '');
          var extraDict = {
            rollos: rollosDict,
            obsOperario: obsOperarioDict,
            obsLavadero: obsLavaderoDict,
            codigoMt: mtDict,
            color: colorDict
          };
          var htmlDict = buildDictamenEmailHtml(opFormattedDict, refDict, telaDict, dictVal, pureObs, auditorName, appUrlDict, driveFotoCalUrl, extraDict);

          try {
            MailApp.sendEmail({
              to: uniqueRecipientsDict.join(','),
              subject: subjectDict,
              htmlBody: htmlDict,
              name: 'CALIDAD STF GROUP - SISTEMA OFICIAL'
            });
          } catch (mailErr) {
            console.error('Error enviando correo de dictamen en lote, reintentando individualmente:', mailErr);
            for (var mdi = 0; mdi < uniqueRecipientsDict.length; mdi++) {
              try {
                MailApp.sendEmail({
                  to: uniqueRecipientsDict[mdi],
                  subject: subjectDict,
                  htmlBody: htmlDict,
                  name: 'CALIDAD STF GROUP - SISTEMA OFICIAL'
                });
              } catch (indivErr) {
                console.error('Fallo envío dictamen a ' + uniqueRecipientsDict[mdi] + ':', indivErr);
              }
            }
          }
        }

        return createJsonResponse({ 
          status: 'success', 
          message: 'Dictamen registrado en BASE_DE_DATOS y notificado por correo',
          driveUrl: (savedCalPhoto && savedCalPhoto.driveUrl) ? savedCalPhoto.driveUrl : (calPhotoUrl || finalFoto2_13 || ''),
          foto2: (savedCalPhoto && savedCalPhoto.driveUrl) ? savedCalPhoto.driveUrl : (calPhotoUrl || finalFoto2_13 || ''),
          foto1: finalFoto1_13 || '',
          folderUrl: (savedCalPhoto && savedCalPhoto.folderUrl) ? savedCalPhoto.folderUrl : folderCol13
        });
      }

      var fallbackCalPhoto = null;
      var dictPhotoBase64_fb = payload.imageBase64 || payload.fotoCalidad || payload.fotoCalidadUrl || '';
      if (dictPhotoBase64_fb && dictPhotoBase64_fb.indexOf('/9j/') === 0) {
        dictPhotoBase64_fb = 'data:image/jpeg;base64,' + dictPhotoBase64_fb;
      }
      if (dictPhotoBase64_fb && dictPhotoBase64_fb.length > 50 && dictPhotoBase64_fb.indexOf('data:image/') === 0) {
        fallbackCalPhoto = saveImageToDriveHierarchical(dictPhotoBase64_fb, opFormattedDict + '_POST_LAVADO_CALIDAD.jpg', opFormattedDict, new Date());
      }
      return createJsonResponse({ 
        status: fallbackCalPhoto ? 'success' : 'error', 
        message: fallbackCalPhoto ? 'Foto de Calidad archivada en Google Drive (OP pendiente de sincronizar en Sheets)' : 'OP no encontrada para dictamen',
        driveUrl: fallbackCalPhoto ? fallbackCalPhoto.driveUrl : '',
        foto2: fallbackCalPhoto ? fallbackCalPhoto.driveUrl : '',
        folderUrl: fallbackCalPhoto ? fallbackCalPhoto.folderUrl : ''
      });
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
      var lastRowBdPhoto = sheetBdPhoto ? sheetBdPhoto.getLastRow() : 0;
      var foundRowPhoto = -1;

      if (sheetBdPhoto && lastRowBdPhoto > 1) {
        var opValsPhoto = sheetBdPhoto.getRange(2, 1, lastRowBdPhoto - 1, 7).getValues();
        var targetDigits = targetOpPhoto.replace(/O/g, '0').replace(/\D/g, '');
        var targetRef = String(payload.referencia || '').trim().toUpperCase();

        // 1. Coincidencia exacta de texto (Columna F / índice 5)
        for (var p = 0; p < opValsPhoto.length; p++) {
          var cellOp = String(opValsPhoto[p][5] || '').trim().toUpperCase().replace(/^OP-?/, '');
          if (cellOp === targetOpPhoto) {
            foundRowPhoto = p + 2;
            break;
          }
        }

        // 2. Coincidencia numérica robusta (previene fallos por ceros iniciales como OP-96284 vs OP-00096284 o letras O)
        if (foundRowPhoto === -1 && targetDigits) {
          var targetInt = parseInt(targetDigits, 10);
          for (var p2 = 0; p2 < opValsPhoto.length; p2++) {
            var cellDigits = String(opValsPhoto[p2][5] || '').replace(/O/g, '0').replace(/\D/g, '');
            if (cellDigits && parseInt(cellDigits, 10) === targetInt) {
              if (targetRef && opValsPhoto[p2][6]) {
                var cellRef = String(opValsPhoto[p2][6]).trim().toUpperCase();
                if (cellRef && targetRef !== 'S/R' && cellRef !== targetRef) continue;
              }
              foundRowPhoto = p2 + 2;
              break;
            }
          }
        }
      }

      var isFinalizado = Boolean(payload.isFinalizado || payload.singleImageOnly);
      if (!isFinalizado && foundRowPhoto !== -1 && sheetBdPhoto) {
        var rowEstadoVal = String(sheetBdPhoto.getRange(foundRowPhoto, 10).getValue() || '').trim().toUpperCase();
        if (rowEstadoVal === 'FINALIZADO') {
          isFinalizado = true;
        }
      }

      // FECHA DE LA OP: Extraer el mes y fecha histórica de creación
      var targetDate = new Date();
      if (payload.fecha || payload.fechaCreacion || payload.mes) {
        targetDate = parseHistoricalDate(payload.fecha || payload.fechaCreacion, payload.mes);
      } else if (foundRowPhoto !== -1 && sheetBdPhoto) {
        var rowFechaVal = sheetBdPhoto.getRange(foundRowPhoto, 1).getValue();
        var rowMesVal = sheetBdPhoto.getRange(foundRowPhoto, 17).getValue();
        targetDate = parseHistoricalDate(rowFechaVal, rowMesVal);
      }

      var savedFoto1 = null;
      var savedFoto2 = null;

      // REGLA INMUTABLE: Cada OP preserva exactamente sus 2 fotografías (Foto 1: Muestra Inicial, Foto 2: Calidad Post-Lavado)
      // Guardar Foto 1 si viene en el payload
      var foto1Input = payload.foto1Base64 || payload.fotoMuestraBase64 || (!payload.isCalidad ? (payload.imageBase64 || payload.fotoMuestraUrl || payload.photoUrl) : '');
      if (foto1Input && foto1Input.length > 50 && (foto1Input.indexOf('data:image/') === 0 || foto1Input.indexOf('/9j/') === 0)) {
        if (foto1Input.indexOf('data:image/') !== 0) foto1Input = 'data:image/jpeg;base64,' + foto1Input;
        savedFoto1 = saveImageToDriveHierarchical(foto1Input, opFormattedPhoto + '_MUESTRA_INICIAL.jpg', opFormattedPhoto, targetDate, false);
      }

      // Guardar Foto 2 si viene en el payload
      var foto2Input = payload.foto2Base64 || payload.fotoCalidadBase64 || (payload.isCalidad ? (payload.imageBase64 || payload.fotoCalidadUrl || payload.photoUrl) : '');
      if (foto2Input && foto2Input.length > 50 && (foto2Input.indexOf('data:image/') === 0 || foto2Input.indexOf('/9j/') === 0)) {
        if (foto2Input.indexOf('data:image/') !== 0) foto2Input = 'data:image/jpeg;base64,' + foto2Input;
        savedFoto2 = saveImageToDriveHierarchical(foto2Input, opFormattedPhoto + '_POST_LAVADO_CALIDAD.jpg', opFormattedPhoto, targetDate, false);
      }

      // Guardar Fotos de Prenda Terminada (1 y 2) si vienen en el payload
      var savedFotoPrenda1 = null;
      var savedFotoPrenda2 = null;

      var fotoPrenda1Input = payload.fotoPrenda1Base64 || payload.fotoPrendaTerminada1Base64;
      if (fotoPrenda1Input && fotoPrenda1Input.length > 50 && (fotoPrenda1Input.indexOf('data:image/') === 0 || fotoPrenda1Input.indexOf('/9j/') === 0)) {
        if (fotoPrenda1Input.indexOf('data:image/') !== 0) fotoPrenda1Input = 'data:image/jpeg;base64,' + fotoPrenda1Input;
        savedFotoPrenda1 = saveImageToDriveHierarchical(fotoPrenda1Input, opFormattedPhoto + '_PRENDA_TERMINADA_1.jpg', opFormattedPhoto, targetDate, false);
      }

      var fotoPrenda2Input = payload.fotoPrenda2Base64 || payload.fotoPrendaTerminada2Base64;
      if (fotoPrenda2Input && fotoPrenda2Input.length > 50 && (fotoPrenda2Input.indexOf('data:image/') === 0 || fotoPrenda2Input.indexOf('/9j/') === 0)) {
        if (fotoPrenda2Input.indexOf('data:image/') !== 0) fotoPrenda2Input = 'data:image/jpeg;base64,' + fotoPrenda2Input;
        savedFotoPrenda2 = saveImageToDriveHierarchical(fotoPrenda2Input, opFormattedPhoto + '_PRENDA_TERMINADA_2.jpg', opFormattedPhoto, targetDate, false);
      }

      // Descubrir enlaces de Drive vigentes
      var disc = getOpPhotosFromDrive(opFormattedPhoto);
      var folderColPhoto = (savedFoto2 && savedFoto2.folderUrl) || (savedFoto1 && savedFoto1.folderUrl) || (savedFotoPrenda1 && savedFotoPrenda1.folderUrl) || (savedFotoPrenda2 && savedFotoPrenda2.folderUrl) || disc.folderUrl || '';
      var finalFoto1_p = (savedFoto1 && savedFoto1.driveUrl) || disc.foto1 || '';
      var finalFoto2_p = (savedFoto2 && savedFoto2.driveUrl) || disc.foto2 || '';
      var finalFotoPrenda1_p = (savedFotoPrenda1 && savedFotoPrenda1.driveUrl) || disc.fotoPrenda1 || '';
      var finalFotoPrenda2_p = (savedFotoPrenda2 && savedFotoPrenda2.driveUrl) || disc.fotoPrenda2 || '';
      if (finalFoto1_p && finalFoto2_p && finalFoto1_p === finalFoto2_p) {
        finalFoto1_p = '';
      }
      var primaryDriveUrl = (payload.isCalidad ? finalFoto2_p : finalFoto1_p) || finalFoto2_p || finalFoto1_p || finalFotoPrenda1_p || finalFotoPrenda2_p || '';

      // Si la OP existe en BASE_DE_DATOS, actualizar fila y Columna 13 (M) con hipervínculo oficial a Drive
      if (foundRowPhoto !== -1 && sheetBdPhoto) {
        sheetBdPhoto.getRange(foundRowPhoto, 6).setValue(opFormattedPhoto);
        var targetColPhotoUrl = folderColPhoto || primaryDriveUrl || '';
        if (targetColPhotoUrl) {
          try {
            if (targetColPhotoUrl.indexOf('http') === 0) {
              var richPhoto = SpreadsheetApp.newRichTextValue()
                .setText(targetColPhotoUrl)
                .setLinkUrl(targetColPhotoUrl)
                .build();
              sheetBdPhoto.getRange(foundRowPhoto, 13).setRichTextValue(richPhoto);
            } else {
              sheetBdPhoto.getRange(foundRowPhoto, 13).setValue(targetColPhotoUrl);
            }
          } catch (eRichPh) {
            sheetBdPhoto.getRange(foundRowPhoto, 13).setValue(targetColPhotoUrl);
          }
        }

        if (payload.observacionColfactory || payload.observacionesLavanderia) {
          var cleanColPh = String(payload.observacionColfactory || payload.observacionesLavanderia).trim();
          if (cleanColPh.toLowerCase().indexOf('colcha recibida') === -1 && cleanColPh.indexOf('[LAVANDERIA]') === -1) {
            sheetBdPhoto.getRange(foundRowPhoto, 12).setValue(cleanColPh);
          }
        }
        if (payload.obsOperarioFinal || payload.observacionesCalidad) {
          var cleanObsCalPh = String(payload.obsOperarioFinal || payload.observacionesCalidad).trim();
          sheetBdPhoto.getRange(foundRowPhoto, 15).setValue(cleanObsCalPh);
        }
      }

      return createJsonResponse({
        status: 'success',
        message: foundRowPhoto !== -1 
          ? ('Fotografía de OP ' + opFormattedPhoto + ' archivada en Drive y actualizada en Columna M')
          : ('Fotografía de OP ' + opFormattedPhoto + ' archivada en Drive exitosamente'),
        foto1: finalFoto1_p,
        foto2: finalFoto2_p,
        fotoPrenda1: finalFotoPrenda1_p,
        fotoPrenda2: finalFotoPrenda2_p,
        driveUrl: primaryDriveUrl,
        folderUrl: folderColPhoto,
        rowUpdated: foundRowPhoto !== -1,
        isFinalizado: isFinalizado
      });
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

    // 14. FIX_COLUMNA_M (Reparar y activar hipervínculos clickeables de Drive en Columna M)
    if (action === 'FIX_COLUMNA_M') {
      var fixedCount = repararEnlacesDriveColumnaM(ss);
      return createJsonResponse({ status: 'success', fixedCount: fixedCount });
    }

    // 15. CLEAN_DRIVE_DUPLICATES (Depurar fotos duplicadas en Drive dejando exactamente 2 por OP)
    // 16. GET_OP_PHOTOS (Resolución en tiempo real de fotos de la OP desde Drive)
    if (action === 'GET_OP_PHOTOS') {
      var targetOpPost = payload.op || payload.opNumber || data.op || data.opNumber || '';
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
            var targetDigitsP = cleanOpP.replace(/\D/g, '');
            for (var bp = 0; bp < bdOpsP.length; bp++) {
              var rowOpStrP = String(bdOpsP[bp][0] || '').trim().toUpperCase();
              var rowOpPureP = rowOpStrP.replace(/^OP-?/, '');
              var rowOpDigitsP = rowOpStrP.replace(/\D/g, '');
              if (rowOpStrP === cleanOpP || rowOpPureP === targetPureP || (targetDigitsP && rowOpDigitsP === targetDigitsP)) {
                var f1P = photosRes.foto1 || '';
                var f2P = photosRes.foto2 || '';
                if (f1P && f2P && f1P === f2P) f1P = '';
                var newColMP = photosRes.folderUrl || f1P || f2P || '';
                if (newColMP) {
                  try {
                    if (newColMP.indexOf('http') === 0) {
                      var richPost = SpreadsheetApp.newRichTextValue()
                        .setText(newColMP)
                        .setLinkUrl(newColMP)
                        .build();
                      shBdP.getRange(bp + 2, 13).setRichTextValue(richPost);
                    } else {
                      shBdP.getRange(bp + 2, 13).setValue(newColMP);
                    }
                  } catch (eRichPost) {
                    shBdP.getRange(bp + 2, 13).setValue(newColMP);
                  }
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

    // -----------------------------------------------------------------------
    // ACCIÓN 13: SEND_SECURITY_LOCKOUT_ALERT (Alerta Automática de Bloqueo)
    // -----------------------------------------------------------------------
    if (action === 'SEND_SECURITY_LOCKOUT_ALERT') {
      var secRecipients = payload.recipients || [];
      if (!Array.isArray(secRecipients) || secRecipients.length === 0) {
        var defaultUserEmail = payload.userEmail || '';
        if (defaultUserEmail) secRecipients = [defaultUserEmail, 'joseoneiber711@gmail.com', 'edwin.diaz@studiof.com.co'];
        else secRecipients = ['joseoneiber711@gmail.com', 'edwin.diaz@studiof.com.co'];
      }

      var secSubject = '🚨 [SEGURIDAD STF] Bloqueo temporal por intentos fallidos - Usuario: ' + (payload.userNombre || payload.userId);
      var secHtml = buildSecurityLockoutEmailHtml(payload);

      try {
        MailApp.sendEmail({
          to: secRecipients.join(','),
          subject: secSubject,
          htmlBody: secHtml,
          name: 'SEGURIDAD STF GROUP'
        });
        return createJsonResponse({ status: 'success', message: 'Alerta de seguridad enviada a ' + secRecipients.length + ' destinatarios' });
      } catch (secMailErr) {
        return createJsonResponse({ status: 'error', message: 'Error enviando correo: ' + secMailErr.toString() });
      }
    }

    // -----------------------------------------------------------------------
    // ACCIÓN 14: SEND_RECOVERY_OTP_EMAIL (Envío de Código OTP de Recuperación)
    // -----------------------------------------------------------------------
    if (action === 'SEND_RECOVERY_OTP_EMAIL') {
      var otpRecipient = payload.recipient || '';
      if (!otpRecipient) {
        return createJsonResponse({ status: 'error', message: 'Destinatario de correo requerido para recuperación' });
      }

      var otpHtml = buildRecoveryOtpEmailHtml(payload);
      var otpSubject = '🔑 [STF GROUP] Código de recuperación de contraseña: ' + (payload.otpCode || '');

      try {
        MailApp.sendEmail({
          to: otpRecipient,
          subject: otpSubject,
          htmlBody: otpHtml,
          name: 'SEGURIDAD STF GROUP'
        });
        return createJsonResponse({ status: 'success', message: 'Código de recuperación enviado con éxito' });
      } catch (otpMailErr) {
        return createJsonResponse({ status: 'error', message: 'Error enviando OTP: ' + otpMailErr.toString() });
      }
    }

    // -----------------------------------------------------------------------
    // ACCIÓN 15: SAVE_USER_PASSWORD (Guardar Contraseña en Script Properties)
    // -----------------------------------------------------------------------
    if (action === 'SAVE_USER_PASSWORD') {
      var passUserId = String(payload.userId || '').trim().toLowerCase();
      var passVal = String(payload.password || '').trim();
      if (passUserId && passVal) {
        var scriptProps = PropertiesService.getScriptProperties();
        scriptProps.setProperty('STF_PASS_' + passUserId, passVal);
        scriptProps.setProperty('STF_PASS_DATE_' + passUserId, Utilities.formatDate(new Date(), 'America/Bogota', 'd/M/yyyy HH:mm:ss'));
        return createJsonResponse({ status: 'success', message: 'Contraseña actualizada en la nube para ' + passUserId });
      }
      return createJsonResponse({ status: 'error', message: 'Parámetros incompletos' });
    }

    return createJsonResponse({ status: 'error', message: 'Acción POST no reconocida: ' + action });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  } finally {
    if (hasLock) {
      try { SpreadsheetApp.flush(); } catch (flushErr) {}
      try { lock.releaseLock(); } catch (releaseErr) {}
    }
  }
}
