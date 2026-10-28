/**
 * =========================================================================
 * 04_SheetsService.js - Servicios de lectura, escritura, formato y normalización en Sheets
 * SISTEMA STF GROUP - CONTROL DE CALIDAD DE COLCHAS & TRAZABILIDAD TEXTIL
 * =========================================================================
 */

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

function removeOpFromMonitoreoSheet(ss, op, ref, color) {
  if (!op) return;
  var sheetMon = getMonitoreoSheet(ss);
  if (!sheetMon || sheetMon.getLastRow() <= 1) return;
  var cleanTarget = String(op).trim().toUpperCase();
  var cleanNoPrefix = cleanTarget.replace(/^OP-?/, '');
  var targetDigits = cleanNoPrefix.replace(/\D/g, '');
  var targetRef = String(ref || '').trim().toUpperCase();
  var targetColor = String(color || '').trim().toUpperCase();
  var vals = sheetMon.getRange(2, 1, sheetMon.getLastRow() - 1, Math.max(5, sheetMon.getLastColumn())).getValues();

  for (var i = vals.length - 1; i >= 0; i--) {
    var cellColor = String(vals[i][2] || '').trim().toUpperCase();
    var cellOp = String(vals[i][3] || '').trim().toUpperCase();
    var cellRef = String(vals[i][4] || '').trim().toUpperCase();
    var cellDigits = cellOp.replace(/\D/g, '');

    var isOpMatch = (cellOp === cleanTarget || cellOp.replace(/^OP-?/, '') === cleanNoPrefix || (targetDigits && cellDigits && targetDigits === cellDigits));
    if (!isOpMatch) continue;

    if (targetRef && cellRef) {
      if (cellRef === targetRef && (!targetColor || !cellColor || cellColor === targetColor)) {
        sheetMon.deleteRow(i + 2);
        break;
      }
    } else {
      sheetMon.deleteRow(i + 2);
      break;
    }
  }
}

function autoCleanMonitoreoFromBaseDeDatos(ss) {
  try {
    var sheetBd = ss.getSheetByName(SHEET_BASE_DATOS) || ss.getSheetByName('01_BASE_DE_DATOS') || ss.getSheets()[0];
    var sheetMon = getMonitoreoSheet(ss);
    if (!sheetBd || !sheetMon || sheetBd.getLastRow() <= 1 || sheetMon.getLastRow() <= 1) return 0;

    // Leer Color(5), OP(6) y Referencia(7) de BASE_DE_DATOS
    var bdValues = sheetBd.getRange(2, 5, sheetBd.getLastRow() - 1, 3).getValues();
    var registeredMap = {};
    for (var b = 0; b < bdValues.length; b++) {
      var colorVal = String(bdValues[b][0] || '').trim().toUpperCase();
      var opVal = String(bdValues[b][1] || '').trim().toUpperCase();
      var refVal = String(bdValues[b][2] || '').trim().toUpperCase();
      var digits = opVal.replace(/\D/g, '');
      if (digits) {
        if (refVal) registeredMap[digits + '__' + refVal] = true;
        if (refVal && colorVal) registeredMap[digits + '__' + refVal + '__' + colorVal] = true;
        if (!refVal && !colorVal) registeredMap[digits] = true;
      }
    }

    var monValues = sheetMon.getRange(2, 1, sheetMon.getLastRow() - 1, Math.max(5, sheetMon.getLastColumn())).getValues();
    var deletedCount = 0;
    for (var m = monValues.length - 1; m >= 0; m--) {
      var mColor = String(monValues[m][2] || '').trim().toUpperCase();
      var mOp = String(monValues[m][3] || '').trim().toUpperCase();
      var mRef = String(monValues[m][4] || '').trim().toUpperCase();
      var mDigits = mOp.replace(/\D/g, '');

      if (!mDigits) continue;

      var isMatch = false;
      if (mRef && mColor && registeredMap[mDigits + '__' + mRef + '__' + mColor]) {
        isMatch = true;
      } else if (mRef && registeredMap[mDigits + '__' + mRef]) {
        isMatch = true;
      } else if (!mRef && registeredMap[mDigits]) {
        isMatch = true;
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


// --- Continuación: Formato y Normalización de Sheets ---


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
  var st = String(estado || '').toUpperCase();
  if (st.indexOf('EVALUAD') !== -1) return 'EVALUADO Y ENVIADO';
  if (st.indexOf('LAVAD') !== -1) return 'LAVANDERÍA COLFACTORY ZF';
  if (st.indexOf('SOLICIT') !== -1) return 'TRÁNSITO / DESPACHO';
  if (st.indexOf('PRE') !== -1) return 'CALIDAD 2F / ATELIER';
  if (st.indexOf('CALIDAD') !== -1 || st.indexOf('ENVIADO A STF') !== -1) return 'CALIDAD STF LABORATORIO';
  if (st.indexOf('FINAL') !== -1) return 'CALIDAD PLANTA STF';
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
