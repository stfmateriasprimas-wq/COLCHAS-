/**
 * =========================================================================
 * 07_MantenimientoYSeguridad.js - Mantenimiento de columnas K-N, reparación de enlaces Drive y plantillas de seguridad
 * SISTEMA STF GROUP - CONTROL DE CALIDAD DE COLCHAS & TRAZABILIDAD TEXTIL
 * =========================================================================
 */

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
    // A. Si el valor ya contiene una URL de carpeta de Google Drive (/folders/), extraerla limpiamente (0 ms)
    var matchFolder = ev.match(/https:\/\/drive\.google\.com\/drive\/folders\/[a-zA-Z0-9_-]+/);
    if (matchFolder) {
      if (ev !== matchFolder[0]) {
        ev = matchFolder[0];
        ch = true;
      }
    } else if (ev.indexOf('data:') === 0 || ev === rawOp || ev === formattedOp || ev.indexOf('.jpg') !== -1) {
      ev = '';
      ch = true;
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
  repararEnlacesDriveColumnaM(ss);
  return mod;
}

/**
 * =========================================================================
 * REPARACIÓN Y ACTIVACIÓN DE HIPERVÍNCULOS NATIVOS CLICKEABLES EN DRIVE (COLUMNA M)
 * =========================================================================
 * Extrae URLs limpias de carpetas de Drive en Columna M y las transforma en hipervínculos nativos clickeables.
 */
function repararEnlacesDriveColumnaM(ss) {
  if (!ss) ss = getTargetSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_BASE_DATOS) || ss.getSheetByName('01_BASE_DE_DATOS') || ss.getSheets()[0];
  if (!sheet || sheet.getLastRow() < 2) return 0;
  var lastRow = sheet.getLastRow();
  var colRange = sheet.getRange(2, 13, lastRow - 1, 1);
  var vals = colRange.getValues();
  var richArray = [];
  var updatedCount = 0;

  for (var i = 0; i < vals.length; i++) {
    var raw = String(vals[i][0] || '').trim();
    var match = raw.match(/https:\/\/drive\.google\.com\/drive\/folders\/[a-zA-Z0-9_-]+/);
    var cleanUrl = match ? match[0] : (raw.indexOf('http') === 0 && raw.indexOf(' | ') === -1 ? raw : '');
    if (cleanUrl) {
      richArray.push([SpreadsheetApp.newRichTextValue().setText(cleanUrl).setLinkUrl(cleanUrl).build()]);
      if (cleanUrl !== raw) updatedCount++;
    } else {
      richArray.push([SpreadsheetApp.newRichTextValue().setText(raw).build()]);
    }
  }

  colRange.setRichTextValues(richArray);
  return updatedCount;
}

function repararEnlacesDriveColumnaMMenuAction() {
  var ss = getTargetSpreadsheet();
  var count = repararEnlacesDriveColumnaM(ss);
  SpreadsheetApp.getActiveSpreadsheet().toast('✅ Se repararon y activaron como hipervínculos clickeables los enlaces de Google Drive en Columna M (' + count + ' celdas actualizadas)', '🚀 STF GROUP', 6);
}

/**
 * =========================================================================
 * PLANTILLAS DE CORREO DE SEGURIDAD (BLOQUEO Y RECUPERACIÓN DE CONTRASEÑA)
 * =========================================================================
 */

function buildSecurityLockoutEmailHtml(payload) {
  var uName = payload.userNombre || 'Usuario STF';
  var uId = payload.userId || 'N/A';
  var uArea = payload.userArea || 'CALIDAD';
  var uRol = payload.userRol || 'OPERARIO';
  var lockMin = payload.lockMinutes || 5;
  var totalFail = payload.totalFailed || 3;
  var fecha = payload.fecha || Utilities.formatDate(new Date(), 'America/Bogota', 'd/M/yyyy');
  var hora = payload.hora || Utilities.formatDate(new Date(), 'America/Bogota', 'HH:mm:ss');
  var appUrl = 'https://colchas.vercel.app';

  return '<div style="font-family: \'Plus Jakarta Sans\', \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #fee2e2; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 20px rgba(220,38,38,0.08);">' +
    '<div style="background-color: #991b1b; padding: 22px 24px; text-align: center; color: #ffffff;">' +
      '<img src="https://colchas.vercel.app/logo-stf-dark.png" alt="STF GROUP S.A." width="200" style="display: block; margin: 0 auto 10px; max-width: 200px; filter: brightness(0) invert(1);" border="0">' +
      '<div style="font-size: 13px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;">ALERTA DE SEGURIDAD Y ACCESO</div>' +
      '<div style="font-size: 10px; color: #fecaca; margin-top: 4px; font-weight: 600;">CONTROL DE CALIDAD DE COLCHAS</div>' +
    '</div>' +

    '<div style="padding: 24px 24px 20px;">' +
      '<div style="background-color: #fef2f2; border: 1px solid #fecaca; border-left: 5px solid #dc2626; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px;">' +
        '<div style="font-size: 14px; font-weight: 900; color: #991b1b; text-transform: uppercase; margin-bottom: 4px;">' +
          '🔒 CUENTA BLOQUEADA TEMPORALMENTE' +
        '</div>' +
        '<div style="font-size: 12px; color: #7f1d1d; line-height: 1.5;">' +
          'Se detectaron <strong>' + totalFail + ' intentos fallidos consecutivos</strong> de contraseña para este usuario. Por directriz de ciberseguridad, el acceso ha sido bloqueado por <strong>' + lockMin + ' minutos</strong>.' +
        '</div>' +
      '</div>' +

      '<table style="width: 100%; border-collapse: collapse; font-size: 12.5px; margin-bottom: 20px;">' +
        '<tr style="border-bottom: 1px solid #f1f5f9;">' +
          '<td style="padding: 8px 0; font-weight: 800; color: #000000; width: 38%; text-transform: uppercase;">USUARIO AFECTADO:</td>' +
          '<td style="padding: 8px 0; font-weight: 800; color: #1e293b;">' + uName + ' (' + uId + ')</td>' +
        '</tr>' +
        '<tr style="border-bottom: 1px solid #f1f5f9;">' +
          '<td style="padding: 8px 0; font-weight: 800; color: #000000; text-transform: uppercase;">ÁREA / ROL:</td>' +
          '<td style="padding: 8px 0; font-weight: 600; color: #475569;">' + uArea + ' • ' + uRol + '</td>' +
        '</tr>' +
        '<tr style="border-bottom: 1px solid #f1f5f9;">' +
          '<td style="padding: 8px 0; font-weight: 800; color: #000000; text-transform: uppercase;">TIEMPO DE BLOQUEO:</td>' +
          '<td style="padding: 8px 0; font-weight: 900; color: #dc2626;">' + lockMin + ' MINUTOS</td>' +
        '</tr>' +
        '<tr style="border-bottom: 1px solid #f1f5f9;">' +
          '<td style="padding: 8px 0; font-weight: 800; color: #000000; text-transform: uppercase;">FECHA Y HORA:</td>' +
          '<td style="padding: 8px 0; font-weight: 600; color: #475569;">' + fecha + ' a las ' + hora + '</td>' +
        '</tr>' +
      '</table>' +

      '<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; font-size: 11.5px; color: #475569; line-height: 1.5; margin-bottom: 20px;">' +
        '<strong>⚠️ Recomendación de Seguridad:</strong> Si usted no realizó estos intentos de inicio de sesión, es posible que otra persona esté intentando acceder a su cuenta. Le sugerimos ingresar al aplicativo y utilizar la opción <em>«¿Olvidaste tu contraseña?»</em> para establecer una nueva clave personal segura.' +
      '</div>' +

      '<div style="text-align: center;">' +
        '<a href="' + appUrl + '" target="_blank" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; padding: 12px 28px; border-radius: 8px; box-shadow: 0 4px 12px rgba(15,23,42,0.2);">' +
          'ACCEDER A STF COLCHAS' +
        '</a>' +
      '</div>' +
    '</div>' +

    '<div style="background: #f8fafc; padding: 12px 18px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; line-height: 1.4;">' +
      '<strong style="color: #64748b;">STF GROUP S.A.</strong> • Protocolo de Ciberseguridad Textil<br>' +
      '<span style="font-size: 9px; color: #cbd5e1;">Mensaje automático confidencial emitido por la plataforma oficial de calidad.</span>' +
    '</div>' +
  '</div>';
}

function buildRecoveryOtpEmailHtml(payload) {
  var uName = payload.userNombre || 'Usuario STF';
  var otp = payload.otpCode || '000000';
  var expires = payload.expiresMinutes || 15;
  var appUrl = 'https://colchas.vercel.app';

  return '<div style="font-family: \'Plus Jakarta Sans\', \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">' +
    '<div style="background-color: #0f172a; padding: 24px; text-align: center; color: #ffffff;">' +
      '<img src="https://colchas.vercel.app/logo-stf-dark.png" alt="STF GROUP S.A." width="200" style="display: block; margin: 0 auto 10px; max-width: 200px; filter: brightness(0) invert(1);" border="0">' +
      '<div style="font-size: 13px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: #38bdf8;">RESTABLECIMIENTO DE CONTRASEÑA</div>' +
      '<div style="font-size: 10px; color: #94a3b8; margin-top: 4px; font-weight: 600;">CONTROL DE CALIDAD DE COLCHAS</div>' +
    '</div>' +

    '<div style="padding: 26px 24px 22px;">' +
      '<p style="font-size: 13.5px; color: #1e293b; line-height: 1.5; margin: 0 0 16px;">' +
        'Hola <strong>' + uName + '</strong>, has solicitado restablecer tu contraseña de acceso a la plataforma <strong>STF Colchas</strong>.' +
      '</p>' +

      '<p style="font-size: 12px; color: #64748b; margin: 0 0 12px;">' +
        'Utiliza el siguiente código de seguridad de 6 dígitos en la pantalla de recuperación:' +
      '</p>' +

      '<div style="background: #0f172a; border: 2px dashed #06b6d4; border-radius: 12px; padding: 18px 24px; text-align: center; margin: 0 0 20px;">' +
        '<div style="font-family: \'JetBrains Mono\', Consolas, Monaco, monospace; font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #38bdf8;">' +
          otp +
        '</div>' +
        '<div style="font-size: 11px; font-weight: 700; color: #94a3b8; margin-top: 6px; letter-spacing: 0.5px;">' +
          '⏰ VÁLIDO DURANTE ' + expires + ' MINUTOS' +
        '</div>' +
      '</div>' +

      '<div style="background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 14px; font-size: 11.5px; color: #92400e; line-height: 1.5; margin-bottom: 20px;">' +
        '<strong>🔒 Importante:</strong> Este código es personal, de un solo uso y confidencial. Ningún miembro de soporte técnico le solicitará este código.' +
      '</div>' +

      '<div style="text-align: center;">' +
        '<a href="' + appUrl + '" target="_blank" style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; padding: 12px 28px; border-radius: 8px; box-shadow: 0 4px 12px rgba(2,132,199,0.25);">' +
          'IR AL APLICATIVO PARA INGRESAR CÓDIGO' +
        '</a>' +
      '</div>' +
    '</div>' +

    '<div style="background: #f8fafc; padding: 12px 18px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; line-height: 1.4;">' +
      '<strong style="color: #64748b;">STF GROUP S.A.</strong> • Seguridad de Acceso y Gestión de Identidad<br>' +
      '<span style="font-size: 9px; color: #cbd5e1;">Si usted no solicitó este cambio, ignore este mensaje. Su contraseña actual seguirá protegida.</span>' +
    '</div>' +
  '</div>';
}

