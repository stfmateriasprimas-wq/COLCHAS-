/**
 * =========================================================================
 * 02_MenuYTriggers.js - Menú superior STF en Google Sheets, autorizaciones y disparador onEdit
 * SISTEMA STF GROUP - CONTROL DE CALIDAD DE COLCHAS & TRAZABILIDAD TEXTIL
 * =========================================================================
 */

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
    .addItem('🔗 Reparar y Activar Hipervínculos Drive (Columna M)', 'repararEnlacesDriveColumnaMMenuAction')
    .addItem('🔗 Unificar Links de Drive a Carpeta Única (Columna M)', 'unificarLinksDriveMenuAction')
    .addItem('✨ Depurar y Limpiar Columnas K, L, M y N', 'cleanColumnsKLMNMenuAction')
    .addItem('🧹 Eliminar Filas Vacías / Compactar BASE_DE_DATOS', 'cleanEmptyRowsMenuAction')
    .addItem('🧹 Dar Formato Profesional a Todas las Hojas', 'formatAllSheets')
    .addItem('🖼️ Depurar Fotos Duplicadas en Drive (Dejar estrictamente 2 fotos por OP)', 'cleanDuplicatesDriveMenuAction')
    .addItem('📁 Crear / Verificar Estructura en Google Drive (Mes y OPs)', 'verifyAndBuildDriveStructureMenuAction')
    .addItem('🏷️ Actualizar Desplegable ESTADO (Incluir EVALUADO Y ENVIADO)', 'actualizarValidacionEstadosMenuAction')
    .addToUi();

  var ss = getTargetSpreadsheet();
  cleanEmptyRowsInBaseDeDatos(ss);
  normalizeAllOpCodesInBaseDeDatos(ss);
  autoCleanMonitoreoFromBaseDeDatos(ss);
  repararEnlacesDriveColumnaM(ss);
}

function cleanEmptyRowsMenuAction() {
  var ss = getTargetSpreadsheet();
  var count = cleanEmptyRowsInBaseDeDatos(ss);
  SpreadsheetApp.getActiveSpreadsheet().toast('✅ Se eliminaron ' + count + ' filas vacías intermedias y se compactó BASE_DE_DATOS.', '🚀 STF GROUP', 6);
}

/**
 * Localiza la última fila física que contiene datos reales operativos
 * en BASE_DE_DATOS evaluando Columnas A (FECHA), C (TELA) y F (OP).
 */
function getRealLastDataRowInBaseDeDatos(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 1;

  var rangeVals = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
  for (var i = rangeVals.length - 1; i >= 0; i--) {
    var fecha = String(rangeVals[i][0] || '').trim();
    var tela = String(rangeVals[i][2] || '').trim();
    var op = String(rangeVals[i][5] || '').trim();
    if (fecha || tela || op) {
      return i + 2;
    }
  }
  return 1;
}

/**
 * Elimina filas vacías intermedias o fantasma en BASE_DE_DATOS (por ejemplo, filas
 * sin fecha, sin tela y sin OP dejadas por celdas borradas, espacios o formateo de tabla),
 * garantizando una secuencia contigua y ordenada.
 */
function cleanEmptyRowsInBaseDeDatos(ss) {
  try {
    if (!ss) ss = getTargetSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_BASE_DATOS) || ss.getSheetByName('01_BASE_DE_DATOS') || ss.getSheets()[0];
    if (!sheet || sheet.getLastRow() < 3) return 0;

    var lastRow = sheet.getLastRow();
    var values = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
    var deletedCount = 0;

    for (var r = values.length - 1; r >= 0; r--) {
      var fecha = String(values[r][0] || '').trim();
      var tela = String(values[r][2] || '').trim();
      var op = String(values[r][5] || '').trim();

      if (!fecha && !tela && !op) {
        sheet.deleteRow(r + 2);
        deletedCount++;
      }
    }
    return deletedCount;
  } catch (errCleanEmpty) {
    console.error('Error depurando filas vacías en BASE_DE_DATOS:', errCleanEmpty);
    return 0;
  }
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

function actualizarValidacionEstadosMenuAction() {
  var ss = getTargetSpreadsheet();
  var res = configurarValidacionEstados(ss);
  SpreadsheetApp.getActiveSpreadsheet().toast('✅ ' + res.message, '🚀 STF GROUP', 6);
}

function configurarValidacionEstados(ss) {
  var sheet = ss.getSheetByName(SHEET_BASE_DATOS) || ss.getSheetByName('01_BASE_DE_DATOS') || ss.getSheets()[0];
  var lastRow = Math.max(sheet.getLastRow(), 2000);

  var estadosValidos = [
    'PRE-SOLICITUD',
    'SOLICITADO',
    'RECIBIDO LAVADERO',
    'ENVIADO A STF',
    'EVALUADO Y ENVIADO',
    'FINALIZADO'
  ];

  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(estadosValidos, true)
    .setAllowInvalid(true)
    .build();

  sheet.getRange(2, 10, lastRow - 1, 1).setDataValidation(rule);
  return { status: 'success', message: 'Validación de columna J actualizada con EVALUADO Y ENVIADO' };
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
