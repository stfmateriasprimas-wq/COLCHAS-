/**
 * =========================================================================
 * 06_EmailService.js - Servicio de notificaciones por correo (Flujos A, B y C) y lectura de USUARIOS
 * SISTEMA STF GROUP - CONTROL DE CALIDAD DE COLCHAS & TRAZABILIDAD TEXTIL
 * =========================================================================
 */

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
        if (colVal) {
          var candidates = colVal.split(/[,;\s]+/);
          for (var ci = 0; ci < candidates.length; ci++) {
            var cand = candidates[ci].trim();
            if (cand && emailRegex.test(cand)) {
              if (emails.indexOf(cand) === -1) {
                emails.push(cand);
              }
            }
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
 * Plantilla Flujo A: Creación de Nueva Colcha (Diseño Limpio Minimalista STF GROUP)
 */
function buildNewOpEmailHtml(opData, opVal, fechaFormatted, appUrl, driveUrl) {
  var refVal = opData['REFERENCIA'] || opData.referencia || 'S/R';
  var telaVal = opData['TELA'] || opData.tela || 'TELA TEXTIL';
  var colorVal = opData['COLOR'] || opData.color || 'AZUL';
  var mtVal = opData['CÓDIGO MT'] || opData.codigoMt || '';
  var rollosVal = Number(opData['ROLLOS'] || opData.rollos || 1);
  var obsOp = opData['OBSERVACIÓN OPERARIO'] || opData.observacionesOperario || opData.observacionOperario || 'Muestra ingresada para proceso textil';
  var inspectorVal = opData['INSPECTOR / OPERARIO'] || opData.inspector || 'ATELIER / CORTE';
  var rawEstado = opData['ESTADO'] || opData.estado || 'SOLICITADO';
  var estadoDisplay = (String(rawEstado).toUpperCase().indexOf('PRE') !== -1) ? 'PRE-SOLICITUD' : 'SOLICITADO';

  var imgBlock = driveUrl
    ? '<div style="margin: 18px 0 6px; text-align: center;">' +
        '<a href="' + driveUrl + '" target="_blank" style="display: inline-block; background: #0f172a; color: #ffffff; padding: 11px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 11.5px; letter-spacing: 0.5px; box-shadow: 0 2px 6px rgba(15,23,42,0.25);">' +
          '📷 Ver Fotografía de Muestra en Google Drive' +
        '</a>' +
      '</div>'
    : '';

  var ctaBlock =
    '<div style="margin-top: 10px; margin-bottom: 6px; text-align: center;">' +
      '<a href="' + appUrl + '" target="_blank" style="display: inline-block; background: #ffffff; color: #000000; border: 1.5px solid #F59E0B; padding: 12px 28px; border-radius: 8px; font-weight: 900; text-decoration: none; font-size: 12px; text-transform: uppercase; letter-spacing: 0.8px; box-shadow: 0 3px 10px rgba(245, 158, 11, 0.2);">' +
        '📱 ABRIR FICHA PÚBLICA EN TIEMPO REAL' +
      '</a>' +
    '</div>';

  var mtHtml = mtVal
    ? ' <span style="display: inline-block; background: #f1f5f9; color: #475569; font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: 4px; margin-left: 6px;">' + mtVal + '</span>'
    : '';

  return '<div style="font-family: \'Plus Jakarta Sans\', \'Segoe UI\', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">' +
    // Contenedor Superior (Logo STF GROUP S.A. y Subtítulo)
    '<div style="padding: 26px 24px 10px; text-align: center;">' +
      '<img src="https://colchas.vercel.app/logo-stf-dark.png" alt="STF GROUP S.A." width="220" style="display: block; margin: 0 auto; max-width: 220px; height: auto;" border="0">' +
      '<div style="margin-top: 6px; font-size: 10.5px; font-weight: 700; color: #64748b; letter-spacing: 2px; text-transform: uppercase;">CONTROL DE CALIDAD TEXTIL</div>' +
    '</div>' +

    // Título con Resaltador Amarillo (Exacto a Imagen 2)
    '<div style="text-align: center; margin: 18px 0 16px;">' +
      '<span style="background-color: #FEEF5B; padding: 3px 8px; font-weight: 900; color: #000000; font-size: 15px; letter-spacing: 0.5px; border-radius: 2px; text-transform: uppercase;">NUEVA</span>' +
      '<span style="font-weight: 900; color: #000000; font-size: 15px; letter-spacing: 0.5px; margin-left: 5px; text-transform: uppercase;">SOLICITUD DE COLCHA</span>' +
    '</div>' +

    // Cuerpo con Ficha Técnica
    '<div style="padding: 0 24px 20px;">' +
      // Tarjeta con Barra Lateral Negra Gruesa (Exacta a Imagen 2)
      '<div style="background-color: #f8fafc; border-radius: 8px; border-left: 5px solid #000000; padding: 14px 18px;">' +
        '<table style="width: 100%; border-collapse: collapse; font-size: 12.5px;">' +
          '<tr>' +
            '<td style="padding: 4px 0; font-weight: 800; color: #000000; width: 34%; text-transform: uppercase; letter-spacing: 0.4px;">ESTADO:</td>' +
            '<td style="padding: 4px 0; font-weight: 800; color: #000000; text-transform: uppercase;">' + estadoDisplay + '</td>' +
          '</tr>' +
          '<tr>' +
            '<td style="padding: 4px 0; font-weight: 800; color: #000000; text-transform: uppercase; letter-spacing: 0.4px;">OP:</td>' +
            '<td style="padding: 4px 0; font-weight: 800; color: #000000; font-family: \'JetBrains Mono\', Consolas, Monaco, monospace;">' + opVal + '</td>' +
          '</tr>' +
          '<tr>' +
            '<td style="padding: 4px 0; font-weight: 800; color: #000000; text-transform: uppercase; letter-spacing: 0.4px;">REFERENCIA:</td>' +
            '<td style="padding: 4px 0; font-weight: 700; color: #1e293b;">' + refVal + '</td>' +
          '</tr>' +
          '<tr>' +
            '<td style="padding: 4px 0; font-weight: 800; color: #000000; text-transform: uppercase; letter-spacing: 0.4px;">TELA:</td>' +
            '<td style="padding: 4px 0; font-weight: 700; color: #1e293b;">' + telaVal + mtHtml + '</td>' +
          '</tr>' +
          '<tr>' +
            '<td style="padding: 4px 0; font-weight: 800; color: #000000; text-transform: uppercase; letter-spacing: 0.4px;">COLOR:</td>' +
            '<td style="padding: 4px 0; font-weight: 700; color: #1e293b; text-transform: uppercase;">' + colorVal + '</td>' +
          '</tr>' +
          '<tr>' +
            '<td style="padding: 4px 0; font-weight: 800; color: #000000; text-transform: uppercase; letter-spacing: 0.4px;">ROLLOS:</td>' +
            '<td style="padding: 4px 0; font-weight: 700; color: #1e293b;">' + rollosVal + '</td>' +
          '</tr>' +
          '<tr>' +
            '<td style="padding: 4px 0; font-weight: 800; color: #000000; text-transform: uppercase; letter-spacing: 0.4px;">FECHA REGISTRO:</td>' +
            '<td style="padding: 4px 0; font-weight: 600; color: #334155;">' + fechaFormatted + '</td>' +
          '</tr>' +
          '<tr>' +
            '<td style="padding: 4px 0; font-weight: 800; color: #000000; text-transform: uppercase; letter-spacing: 0.4px;">REGISTRADO POR:</td>' +
            '<td style="padding: 4px 0; font-weight: 600; color: #334155;">' + inspectorVal + '</td>' +
          '</tr>' +
        '</table>' +
      '</div>' +

      // Sección de Observaciones del Operario (Exacta a Imagen 2)
      '<div style="margin-top: 16px;">' +
        '<div style="font-size: 11px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px;">' +
          'OBSERVACIONES OPERARIO:' +
        '</div>' +
        '<div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 14px; font-size: 12px; color: #334155; line-height: 1.5; font-weight: 500; text-transform: uppercase;">' +
          obsOp +
        '</div>' +
      '</div>' +

      // Botones Originales Preservados (Google Drive y Ficha en Tiempo Real)
      imgBlock +
      ctaBlock +
    '</div>' +

    // Franja Inferior Negra (Exacta a Imagen 2)
    '<div style="background-color: #000000; color: #ffffff; text-align: center; padding: 12px 16px; font-size: 10.5px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">' +
      'SISTEMA INTEGRAL DE GESTIÓN DE CALIDAD | STF GROUP' +
    '</div>' +

    // Pie de Página Legal y Automático
    '<div style="background: #f8fafc; padding: 12px 18px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; line-height: 1.4;">' +
      '<strong style="color: #64748b;">STF GROUP S.A.</strong> • Notificación Corporativa Automática de Calidad Textil<br>' +
      '<span style="font-size: 9px; color: #cbd5e1;">Este es un mensaje generado automáticamente por el sistema. Por favor no responder a esta dirección.</span>' +
    '</div>' +
  '</div>';
}

/**
 * Plantilla Flujo C: Dictamen Oficial de Calidad (Diseño Limpio Minimalista STF GROUP)
 */
function buildDictamenEmailHtml(opVal, refVal, telaVal, dictVal, obsFinal, auditorName, appUrl, driveFotoCalUrl, extraData) {
  var isEnGama = String(dictVal).toUpperCase().indexOf('GAMA') !== -1;
  var isAprob = String(dictVal).toUpperCase().indexOf('APROB') !== -1;

  // Paleta de acento dinámico según dictamen
  var themeColor = isEnGama ? '#0D9488' : (isAprob ? '#16A34A' : '#DC2626');
  var themeCtaBg = isEnGama ? '#0D9488' : (isAprob ? '#059669' : '#DC2626');

  var rollosVal = (extraData && (extraData.rollos || extraData['ROLLOS'])) || '';
  var mtVal = (extraData && (extraData.codigoMt || extraData['CÓDIGO MT'])) || '';
  var colorVal = (extraData && (extraData.color || extraData['COLOR'])) || '';
  var obsOperario = (extraData && (extraData.obsOperario || extraData['OBSERVACIÓN OPERARIO'] || extraData.observacionesOperario)) || '';
  var cleanObsFinal = obsFinal || 'Muestra evaluada y aprobada conforme a los estándares de calidad de STF Group S.A.';

  var mtHtml = mtVal
    ? ' <span style="display: inline-block; background: #e2e8f0; color: #475569; font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: 4px; margin-left: 6px;">' + mtVal + '</span>'
    : '';

  var colorRow = colorVal
    ? '<tr>' +
        '<td style="padding: 4px 0; font-weight: 800; color: #000000; width: 36%; text-transform: uppercase; letter-spacing: 0.4px;">COLOR:</td>' +
        '<td style="padding: 4px 0; font-weight: 700; color: #1e293b; text-transform: uppercase;">' + colorVal + '</td>' +
      '</tr>'
    : '';

  var rollosRow = rollosVal
    ? '<tr>' +
        '<td style="padding: 4px 0; font-weight: 800; color: #000000; width: 36%; text-transform: uppercase; letter-spacing: 0.4px;">ROLLOS:</td>' +
        '<td style="padding: 4px 0; font-weight: 700; color: #1e293b;">' + rollosVal + '</td>' +
      '</tr>'
    : '';

  var auditorRow = auditorName
    ? '<tr>' +
        '<td style="padding: 4px 0; font-weight: 800; color: #000000; width: 36%; text-transform: uppercase; letter-spacing: 0.4px;">AUDITOR RESPONSABLE:</td>' +
        '<td style="padding: 4px 0; font-weight: 700; color: #334155; text-transform: uppercase;">' + auditorName + '</td>' +
      '</tr>'
    : '';

  var rawObsLav = (extraData && (extraData.obsLavadero || extraData['OBSERVACIÓN COLFACTORY'] || extraData.observacionColfactory)) || '';
  var obsLavadero = '';
  if (rawObsLav && String(rawObsLav).toLowerCase().indexOf('colcha recibida') === -1 && String(rawObsLav).indexOf('[LAVANDERIA]') === -1) {
    obsLavadero = String(rawObsLav).trim();
  }

  var obsOperarioBlock = obsOperario
    ? '<div style="margin-top: 16px;">' +
        '<div style="font-size: 11px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px;">' +
          'OBSERVACIONES OPERARIO:' +
        '</div>' +
        '<div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 14px; font-size: 12px; color: #334155; line-height: 1.5; font-weight: 500; text-transform: uppercase;">' +
          obsOperario +
        '</div>' +
      '</div>'
    : '';

  var obsLavaderoBlock = obsLavadero
    ? '<div style="margin-top: 14px;">' +
        '<div style="font-size: 11px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px;">' +
          'OBSERVACIONES LAVANDERÍA (COLFACTORY):' +
        '</div>' +
        '<div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 14px; font-size: 12px; color: #334155; line-height: 1.5; font-weight: 500; text-transform: uppercase;">' +
          obsLavadero +
        '</div>' +
      '</div>'
    : '';

  var imgBlock = driveFotoCalUrl
    ? '<div style="margin: 18px 0 6px; text-align: center;">' +
        '<a href="' + driveFotoCalUrl + '" target="_blank" style="display: inline-block; background: #0f172a; color: #ffffff; padding: 11px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 11.5px; letter-spacing: 0.5px; box-shadow: 0 2px 6px rgba(15,23,42,0.25);">' +
          '📷 Ver Foto de Auditoría en Google Drive (Calidad)' +
        '</a>' +
      '</div>'
    : '';

  var ctaBlock =
    '<div style="margin-top: 10px; margin-bottom: 6px; text-align: center;">' +
      '<a href="' + appUrl + '" target="_blank" style="display: inline-block; background: ' + themeCtaBg + '; color: #ffffff; padding: 13px 30px; border-radius: 8px; font-weight: 900; text-decoration: none; font-size: 12px; text-transform: uppercase; letter-spacing: 0.8px; box-shadow: 0 4px 14px rgba(0,0,0,0.15);">' +
        '📱 VER TRAZABILIDAD COMPLETA EN LA APP' +
      '</a>' +
    '</div>';

  return '<div style="font-family: \'Plus Jakarta Sans\', \'Segoe UI\', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">' +
    // Contenedor Superior (Logo STF GROUP S.A. y Subtítulo)
    '<div style="padding: 26px 24px 10px; text-align: center;">' +
      '<img src="https://colchas.vercel.app/logo-stf-dark.png" alt="STF GROUP S.A." width="220" style="display: block; margin: 0 auto; max-width: 220px; height: auto;" border="0">' +
      '<div style="margin-top: 6px; font-size: 10.5px; font-weight: 700; color: #64748b; letter-spacing: 2px; text-transform: uppercase;">CONTROL DE CALIDAD TEXTIL</div>' +
    '</div>' +

    // Título Central (Exacto a Imagen 2)
    '<div style="text-align: center; margin: 18px 0 16px; font-size: 16px; font-weight: 900; color: #000000; letter-spacing: 0.5px; text-transform: uppercase;">' +
      'RESULTADO DE EVALUACIÓN' +
    '</div>' +

    // Cuerpo con Ficha Técnica
    '<div style="padding: 0 24px 20px;">' +
      // Tarjeta con Barra Lateral Temática según Dictamen (Exacta a Imagen 2)
      '<div style="background-color: #f8fafc; border-radius: 8px; border-left: 5px solid ' + themeColor + '; padding: 14px 18px;">' +
        '<table style="width: 100%; border-collapse: collapse; font-size: 12.5px;">' +
          '<tr>' +
            '<td style="padding: 4px 0; font-weight: 800; color: #000000; width: 36%; text-transform: uppercase; letter-spacing: 0.4px;">ESTADO:</td>' +
            '<td style="padding: 4px 0; font-weight: 800; color: ' + themeColor + '; text-transform: uppercase;">FINALIZADO</td>' +
          '</tr>' +
          '<tr>' +
            '<td style="padding: 4px 0; font-weight: 800; color: #000000; text-transform: uppercase; letter-spacing: 0.4px;">OP:</td>' +
            '<td style="padding: 4px 0; font-weight: 800; color: #000000; font-family: \'JetBrains Mono\', Consolas, Monaco, monospace;">' + opVal + '</td>' +
          '</tr>' +
          '<tr>' +
            '<td style="padding: 4px 0; font-weight: 800; color: #000000; text-transform: uppercase; letter-spacing: 0.4px;">REFERENCIA:</td>' +
            '<td style="padding: 4px 0; font-weight: 700; color: #1e293b;">' + refVal + '</td>' +
          '</tr>' +
          '<tr>' +
            '<td style="padding: 4px 0; font-weight: 800; color: #000000; text-transform: uppercase; letter-spacing: 0.4px;">TELA:</td>' +
            '<td style="padding: 4px 0; font-weight: 700; color: #1e293b;">' + telaVal + mtHtml + '</td>' +
          '</tr>' +
          colorRow +
          rollosRow +
          auditorRow +
          '<tr>' +
            '<td style="padding: 4px 0; font-weight: 800; color: #000000; text-transform: uppercase; letter-spacing: 0.4px;">RESULTADO CALIDAD:</td>' +
            '<td style="padding: 4px 0; font-weight: 900; color: ' + themeColor + '; text-transform: uppercase;">' + dictVal + '</td>' +
          '</tr>' +
        '</table>' +
      '</div>' +

      // Observaciones del Operario (si existen)
      obsOperarioBlock +

      // Observaciones Lavandería (si existen)
      obsLavaderoBlock +

      // Observaciones Lavadero / Calidad (Concepto Final)
      '<div style="margin-top: 14px;">' +
        '<div style="font-size: 11px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px;">' +
          'OBSERVACIONES LAVADERO / CALIDAD:' +
        '</div>' +
        '<div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 14px; font-size: 12px; color: #334155; line-height: 1.5; font-weight: 500; text-transform: uppercase;">' +
          cleanObsFinal +
        '</div>' +
      '</div>' +

      // Botones Originales Preservados (Google Drive y Ficha en Tiempo Real)
      imgBlock +
      ctaBlock +
    '</div>' +

    // Franja Inferior Negra (Exacta a Imagen 2)
    '<div style="background-color: #000000; color: #ffffff; text-align: center; padding: 12px 16px; font-size: 10.5px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">' +
      'SISTEMA INTEGRAL DE GESTIÓN DE CALIDAD | STF GROUP' +
    '</div>' +

    // Pie de Página Legal y Automático
    '<div style="background: #f8fafc; padding: 12px 18px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; line-height: 1.4;">' +
      '<strong style="color: #64748b;">STF GROUP S.A.</strong> • Notificación Oficial de Dictamen de Calidad Textil<br>' +
      '<span style="font-size: 9px; color: #cbd5e1;">Laboratorio de Calidad ZF • Mensaje automático generado por el sistema</span>' +
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
