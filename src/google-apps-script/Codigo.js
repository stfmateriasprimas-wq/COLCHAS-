/**
 * =========================================================================
 * STF GROUP S.A. - SISTEMA COLCHAS & CALIDAD TEXTIL (GOOGLE APPS SCRIPT)
 * =========================================================================
 * Este script se instala en extensiones de la hoja de Google Sheets (01_BASE_DE_DATOS)
 * y habilita:
 * 1. API Webhook Bidireccional (Creación, Transferencia y Dictamen de OPs)
 * 2. Lectura en vivo de OPs por Hacer desde la pestaña MONITOREO (gid=1356774059)
 * 3. Guardado automático de fotos y rótulos en GOOGLE DRIVE (Carpeta: STF_COLCHAS_EVIDENCIAS)
 * 4. Envíos automáticos de Correos Electrónicos (Gmail / Google Workspace)
 * =========================================================================
 */

const SHEET_BASE_DATOS = 01_BASE_DE_DATOS;
const SHEET_MONITOREO = MONITOREO;
const DRIVE_FOLDER_NAME = STF_COLCHAS_EVIDENCIAS;

// Correos destinatarios para alertas automáticas
const NOTIFICATION_EMAILS = [
  calidad.textil@stfgroup.com,
  lavanderia.zf@stfgroup.com,
  despacho.muestras@stfgroup.com
];

/**
 * Endpoint GET: Lectura en tiempo real de MONITOREO y BASE_DE_DATOS
 */
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || GET_MONITOREO;
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. OBTENER LISTADO MAESTRO DE OPS POR HACER (MONITOREO)
    if (action === GET_MONITOREO) {
      const sheet = ss.getSheetByName(SHEET_MONITOREO) || ss.getSheetByName(monitoreo) || ss.getSheets()[1];
      if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify({ status: error, message: Hoja MONITOREO no encontrada }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      const values = sheet.getDataRange().getValues();
      const items = [];
      for (let i = 1; i < values.length; i++) {
        const row = values[i];
        if (row[0] && String(row[0]).trim() !== TELA && String(row[0]).trim() !== ") {
 items.push({
 tela: String(row[0] || ).trim(),
 mt: String(row[1] || ).trim(),
 color: String(row[2] || AZUL).trim(),
 op: String(row[3] || ).trim(),
 referencia: String(row[4] || ).trim()
 });
 }
 }
 return ContentService.createTextOutput(JSON.stringify({ status: success, count: items.length, data: items }))
 .setMimeType(ContentService.MimeType.JSON);
 }

 // 2. OBTENER BASE DE DATOS PRINCIPAL
 if (action === GET_BASE_DATOS) {
 const sheet = ss.getSheetByName(SHEET_BASE_DATOS) || ss.getSheets()[0];
 const values = sheet.getDataRange().getValues();
 return ContentService.createTextOutput(JSON.stringify({ status: success, data: values }))
 .setMimeType(ContentService.MimeType.JSON);
 }

 return ContentService.createTextOutput(JSON.stringify({ status: error, message: Acción GET no válida }))
 .setMimeType(ContentService.MimeType.JSON);

 } catch (err) {
 return ContentService.createTextOutput(JSON.stringify({ status: error, message: err.toString() }))
 .setMimeType(ContentService.MimeType.JSON);
 }
}

/**
 * Endpoint POST: Escritura, Transferencias, Dictámenes y Guardado en Drive
 */
function doPost(e) {
 try {
 const data = JSON.parse(e.postData.contents);
 const action = data.action;
 const ss = SpreadsheetApp.getActiveSpreadsheet();
 const sheet = ss.getSheetByName(SHEET_BASE_DATOS) || ss.getSheets()[0];

 // ACTION 1: CREAR NUEVA SOLICITUD DE COLCHA
 if (action === CREATE_OP) {
 const opData = data.payload;
 
 let drivePhotoUrl = opData.fotoMuestraUrl || ;
 if (opData.imageBase64) {
 drivePhotoUrl = saveImageToDrive(opData.imageBase64, OP__.jpg);
 }

 const newRow = [
 opData.fechaCreacion || Utilities.formatDate(new Date(), America/Bogota, yyyy-MM-dd HH:mm:ss),
 opData.inspector || OPERARIO STF,
 opData.tela || ,
 opData.codigoMt || ,
 opData.color || ,
 opData.op || ,
 opData.referencia || ,
 opData.rollos || 1,
 opData.lote || 1,
 opData.estado || SOLICITADO,
 opData.observacionesOperario || ,
 ,
 drivePhotoUrl
 ];

 sheet.appendRow(newRow);

 // Enviar correo automático de notificación
 sendEmailNotification(
 🚀 NUEVA SOLICITUD DE COLCHA INGRESADA -  + opData.op,
 Se ha registrado con éxito la OP: <b></b> (Referencia: , Tela: , rollos).,
 opData
 );

 return ContentService.createTextOutput(JSON.stringify({
 status: success,
 message: OP registrada correctamente en Google Sheets,
 driveUrl: drivePhotoUrl
 })).setMimeType(ContentService.MimeType.JSON);
 }

 // ACTION 2: TRANSFERIR FASE / ESTADO DE OP
 if (action === TRANSFER_OP) {
 const { op, nuevoEstado, nuevoInspector, observaciones } = data.payload;
 const values = sheet.getDataRange().getValues();
 let foundRow = -1;

 for (let i = 1; i < values.length; i++) {
 const rowOp = String(values[i][5] || ).trim();
 if (rowOp === op || rowOp.replace(OP-, ) === op.replace(OP-, )) {
 foundRow = i + 1;
 break;
 }
 }

 if (foundRow !== -1) {
 sheet.getRange(foundRow, 10).setValue(nuevoEstado);
 if (nuevoInspector) sheet.getRange(foundRow, 2).setValue(nuevoInspector);
 if (observaciones) {
 const prevObs = sheet.getRange(foundRow, 11).getValue();
 sheet.getRange(foundRow, 11).setValue((prevObs ? prevObs +  |  : ) + observaciones);
 }

 sendEmailNotification(
 🔄 TRANSFERENCIA DE OP: ➔ ,
 La OP <b></b> ha sido transferida exitosamente a la fase <b></b> por el operario <b></b>.,
 { op, estado: nuevoEstado, inspector: nuevoInspector }
 );

 return ContentService.createTextOutput(JSON.stringify({ status: success, message: OP actualizada a }))
 .setMimeType(ContentService.MimeType.JSON);
 } else {
 return ContentService.createTextOutput(JSON.stringify({ status: error, message: OP no encontrada }))
 .setMimeType(ContentService.MimeType.JSON);
 }
 }

 // ACTION 3: DICTAMEN TÉCNICO FINAL (APROBADO / RECHAZADO)
 if (action === UPDATE_DICTAMEN) {
 const { op, dictamen, observacionesTecnicas, inspector } = data.payload;
 const values = sheet.getDataRange().getValues();
 let foundRow = -1;

 for (let i = 1; i < values.length; i++) {
 const rowOp = String(values[i][5] || ).trim();
 if (rowOp === op || rowOp.replace(OP-, ) === op.replace(OP-, )) {
 foundRow = i + 1;
 break;
 }
 }

 if (foundRow !== -1) {
 sheet.getRange(foundRow, 10).setValue(FINALIZADO);
 sheet.getRange(foundRow, 11).setValue([DICTAMEN: ] );

 const badgeColor = dictamen === APROBADO ? #10b981 : #ef4444;
 sendEmailNotification(
 📋 DICTAMEN DE CALIDAD EMITIDO - OP: [],
 <div style=font-family: sans-serif; padding: 20px; border: 1px solid #e4e4e7; border-radius: 12px;>
 <h2 style=color: ;>DICTAMEN: </h2>
 <p>La OP <b></b> ha concluido su ciclo de inspección técnica en Laboratorio STF.</p>
 <p><b>Auditor Técnico:</b> </p>
 <p><b>Observaciones:</b> </p>
 </div>,
 { op, dictamen, inspector }
 );

 return ContentService.createTextOutput(JSON.stringify({ status: success, message: Dictamen guardado y notificado }))
 .setMimeType(ContentService.MimeType.JSON);
 }
 }

 return ContentService.createTextOutput(JSON.stringify({ status: error, message: Acción no reconocida }))
 .setMimeType(ContentService.MimeType.JSON);

 } catch (err) {
 return ContentService.createTextOutput(JSON.stringify({ status: error, message: err.toString() }))
 .setMimeType(ContentService.MimeType.JSON);
 }
}

/**
 * Guardar imagen Base64 en Google Drive de STF Group
 */
function saveImageToDrive(base64Data, fileName) {
 try {
 let folder;
 const folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
 if (folders.hasNext()) {
 folder = folders.next();
 } else {
 folder = DriveApp.createFolder(DRIVE_FOLDER_NAME);
 folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
 }

 const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, );
 const decoded = Utilities.base64Decode(cleanBase64);
 const blob = Utilities.newBlob(decoded, image/jpeg, fileName);
 const file = folder.createFile(blob);
 file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

 return https://drive.google.com/uc?id=;
 } catch (e) {
 console.error(Error guardando en Drive:, e);
 return ;
 }
}

/**
 * Enviar notificación por correo con plantilla corporativa STF
 */
function sendEmailNotification(subject, htmlBody, data) {
 try {
 const fullHtml = 
 <div style=font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #09090b; color: #ffffff; padding: 24px; border-radius: 16px;>
 <div style=text-align: center; border-bottom: 2px solid #27272a; padding-bottom: 16px; margin-bottom: 20px;>
 <h1 style=color: #ffffff; margin: 0; font-size: 22px; letter-spacing: 2px;>STF GROUP S.A.</h1>
 <p style=color: #a1a1aa; font-size: 11px; margin: 4px 0 0 0;>STUDIO F • ELA • STUDIO F MAN | SISTEMA DE CONTROL DE COLCHAS</p>
 </div>
 <div style=background: #18181b; padding: 20px; border-radius: 12px; border: 1px solid #27272a; line-height: 1.6; font-size: 14px; color: #e4e4e7;>
 
 </div>
 <div style=text-align: center; margin-top: 20px; font-size: 11px; color: #71717a;>
 Notificación automática generada por el Sistema Integral de Calidad Textil STF Group.
 </div>
 </div>
 ;

 for (const recipient of NOTIFICATION_EMAILS) {
 MailApp.sendEmail({
 to: recipient,
 subject: [STF COLCHAS] ,
 htmlBody: fullHtml
 });
 }
 } catch (e) {
 console.warn(Error enviando correo:, e);
 }
}
