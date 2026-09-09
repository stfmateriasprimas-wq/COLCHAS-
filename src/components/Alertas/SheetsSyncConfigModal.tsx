import React, { useState } from 'react';
import { 
  FileSpreadsheet, ExternalLink, Copy, Check, Sparkles, 
  HelpCircle, Link2, ShieldCheck, AlertCircle, RefreshCw 
} from 'lucide-react';
import { 
  SPREADSHEET_ID, 
  getAppsScriptUrl, 
  setAppsScriptUrl, 
  syncAllAlertasToSheets 
} from '../../services/googleSheetsService';
import { SolicitudColcha } from '../../types';
import { notificationService } from '../../services/notificationService';

interface SheetsSyncConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  allAlerts: SolicitudColcha[];
  onSyncComplete?: (count: number) => void;
}

export const SheetsSyncConfigModal: React.FC<SheetsSyncConfigModalProps> = ({
  isOpen,
  onClose,
  allAlerts,
  onSyncComplete
}) => {
  const [urlInput, setUrlInput] = useState(getAppsScriptUrl());
  const [copiedCode, setCopiedCode] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const googleSheetsUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit?usp=sharing`;

  const APPS_SCRIPT_SNIPPET = `/**
 * GOOGLE APPS SCRIPT OFICIAL - SISTEMA COLCHAS STF GROUP & LAVANDERÍA ZF
 * SPREADSHEET ID: ${SPREADSHEET_ID}
 */
var SPREADSHEET_ID = "${SPREADSHEET_ID}";
var SHEET_BASE_DATOS = "BASE_DE_DATOS";
var SHEET_MONITOREO = "MONITOREO";
var SHEET_ALERTAS = "ALERTAS";
var DRIVE_FOLDER_NAME = "EVIDENCIAS_COLCHAS_STF";

function doGet(e) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "GET_MONITOREO";

    if (action === "GET_MONITOREO") {
      var sh = ss.getSheetByName(SHEET_MONITOREO);
      if (!sh) return jsonOutput({ status: "error", message: "Hoja MONITOREO no encontrada" });
      var data = sh.getDataRange().getValues();
      var result = [];
      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        if (row[0] && String(row[0]).toUpperCase() !== "TELA") {
          result.push({
            tela: String(row[0] || "").trim(),
            mt: String(row[1] || "MT-AUTO").trim(),
            color: String(row[2] || "AZUL").trim(),
            op: String(row[3] || "").trim(),
            referencia: String(row[4] || "").trim()
          });
        }
      }
      return jsonOutput({ status: "success", count: result.length, data: result });
    }

    if (action === "GET_BASE_DATOS") {
      var shBd = ss.getSheetByName(SHEET_BASE_DATOS);
      if (!shBd) return jsonOutput({ status: "error", message: "Hoja BASE_DE_DATOS no encontrada" });
      var dataBd = shBd.getDataRange().getValues();
      return jsonOutput({ status: "success", rows: dataBd.length, data: dataBd });
    }

    return jsonOutput({ status: "ok", message: "Servicio Apps Script STF Activo" });
  } catch (err) {
    return jsonOutput({ status: "error", error: err.toString() });
  }
}

function doPost(e) {
  try {
    var raw = e.postData ? e.postData.contents : "{}";
    var body = JSON.parse(raw);
    var action = body.action;
    var payload = body.payload || body;
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // 1. TRASLADO Y CAMBIO DE ESTADO DE OP (COLUMNA J - ESTADO)
    if (action === "TRANSFER_OP") {
      var sh = ss.getSheetByName(SHEET_BASE_DATOS);
      if (!sh) return jsonOutput({ status: "error", message: "Hoja BASE_DE_DATOS no existe" });
      
      var targetOp = String(payload.op || "").trim().toUpperCase().replace("OP-", "");
      var nuevoEstado = String(payload.nuevoEstado || payload.estado || "LAVANDERIA").trim();
      var nuevoInspector = String(payload.nuevoInspector || payload.inspector || "").trim();
      var obs = String(payload.observaciones || payload.observacionColfactory || payload.obsOperarioFinal || "").trim();
      
      var lastRow = sh.getLastRow();
      var updated = false;
      if (lastRow > 1) {
        var opVals = sh.getRange(2, 6, lastRow - 1, 1).getValues(); // Columna F (OP)
        for (var i = 0; i < opVals.length; i++) {
          var curOp = String(opVals[i][0] || "").trim().toUpperCase().replace("OP-", "");
          if (curOp === targetOp) {
            var rowIndex = i + 2;
            // Actualizar Columna J (Index 10: ESTADO)
            sh.getRange(rowIndex, 10).setValue(nuevoEstado);
            
            // Actualizar Columna B (Index 2: INSPECTOR) si viene definido
            if (nuevoInspector) {
              sh.getRange(rowIndex, 2).setValue(nuevoInspector);
            }
            
            // Si pasa a LAVANDERIA -> Actualizar Columna L (Index 12: OBSERVACIÓN COLFACTORY)
            if (nuevoEstado === "LAVANDERIA" && obs) {
              var prevObs = String(sh.getRange(rowIndex, 12).getValue() || "").trim();
              var newObsCol = prevObs ? (prevObs + " | " + obs) : obs;
              sh.getRange(rowIndex, 12).setValue(newObsCol);
            }
            
            // Si pasa a CALIDAD o FINALIZADO -> Actualizar Columna O (Index 15: OBS.OPERARIO FINAL)
            if ((nuevoEstado === "CALIDAD" || nuevoEstado === "FINALIZADO") && obs) {
              var prevFinal = String(sh.getRange(rowIndex, 15).getValue() || "").trim();
              var newFinal = prevFinal ? (prevFinal + " | " + obs) : obs;
              sh.getRange(rowIndex, 15).setValue(newFinal);
            }
            
            updated = true;
            break;
          }
        }
      }
      return jsonOutput({ status: "success", message: "Estado de OP actualizado en Columna J a " + nuevoEstado, updated: updated });
    }

    // 2. CREAR NUEVA SOLICITUD EN BASE_DE_DATOS & AUTO-ELIMINAR DE MONITOREO
    if (action === "CREATE_OP") {
      var sh = ss.getSheetByName(SHEET_BASE_DATOS) || ss.insertSheet(SHEET_BASE_DATOS);
      var now = new Date();
      var fechaStr = payload.fecha || Utilities.formatDate(now, "America/Bogota", "d/M/yyyy HH:mm:ss");
      var mes = now.getMonth() + 1;
      
      var driveUrl = "";
      if (payload.imageBase64 && payload.imageBase64.indexOf("data:image") === 0) {
        try {
          var folder = getOrCreateFolder(DRIVE_FOLDER_NAME);
          var parts = payload.imageBase64.split(",");
          var mimeMatch = parts[0].match(/:(.*?);/);
          var mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
          var blob = Utilities.newBlob(Utilities.base64Decode(parts[1]), mime, "Muestra_" + (payload.op || "OP") + "_" + now.getTime() + ".jpg");
          var file = folder.createFile(blob);
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          driveUrl = file.getUrl();
        } catch (eDrive) {
          driveUrl = payload.fotoMuestraUrl || "";
        }
      } else {
        driveUrl = payload.fotoMuestraUrl || payload.evidenciaLinkDrive || "";
      }

      var rawOp = String(payload.op || payload.OP || "").trim();
      var opVal = rawOp.toUpperCase().indexOf("OP-") === 0 ? ("OP-" + rawOp.substring(3).trim()) : (rawOp.toUpperCase().indexOf("OP") === 0 ? ("OP-" + rawOp.substring(2).replace(/^[-_\s]+/, "").trim()) : ("OP-" + rawOp));

      var row = [
        fechaStr,
        payload.inspector || "OPERARIO STF",
        payload.tela || "",
        payload.codigoMt || "MT-AUTO",
        payload.color || "AZUL",
        opVal,
        payload.referencia || "",
        Number(payload.rollos || 1),
        payload.lote || "1",
        payload.estado || "SOLICITADO",
        payload.observacionesOperario || payload.observacionOperario || "",
        payload.observacionesLavanderia || payload.observacionColfactory || "",
        driveUrl,
        payload.correoNotificado || Utilities.formatDate(now, "America/Bogota", "d/M/yyyy HH:mm"),
        payload.obsOperarioFinal || payload.observacionesCalidad || "",
        mes
      ];

      sh.appendRow(row);

      if (payload.op) {
        deleteOpFromMonitoreo(ss, payload.op);
      }

      if (payload.userEmails && Array.isArray(payload.userEmails) && payload.userEmails.length > 0) {
        try {
          var subject = "🆕 [NUEVA SOLICITUD COLCHA] " + payload.op + " - " + (payload.referencia || "S/R");
          var htmlBody = "<div style='font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;'>" +
            "<h2 style='color: #059669; margin-top: 0;'>Nueva Solicitud de Colcha Registrada</h2>" +
            "<p>Se ha generado una nueva solicitud en el sistema de calidad STF Group:</p>" +
            "<table style='width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 13px;'>" +
            "<tr style='background: #f3f4f6;'><td style='padding: 8px; font-weight: bold;'>OP:</td><td style='padding: 8px;'>" + payload.op + "</td></tr>" +
            "<tr><td style='padding: 8px; font-weight: bold;'>Referencia:</td><td style='padding: 8px;'>" + (payload.referencia || "N/A") + "</td></tr>" +
            "<tr style='background: #f3f4f6;'><td style='padding: 8px; font-weight: bold;'>Tela:</td><td style='padding: 8px;'>" + payload.tela + "</td></tr>" +
            "<tr><td style='padding: 8px; font-weight: bold;'>Color:</td><td style='padding: 8px;'>" + payload.color + "</td></tr>" +
            "<tr style='background: #f3f4f6;'><td style='padding: 8px; font-weight: bold;'>Rollos:</td><td style='padding: 8px;'>" + payload.rollos + "</td></tr>" +
            "<tr><td style='padding: 8px; font-weight: bold;'>Estado Inicial:</td><td style='padding: 8px; font-weight: bold; color: #d97706;'>" + (payload.estado || "SOLICITADO") + "</td></tr>" +
            "<tr style='background: #f3f4f6;'><td style='padding: 8px; font-weight: bold;'>Registrado Por:</td><td style='padding: 8px;'>" + payload.inspector + "</td></tr>" +
            "</table>" +
            (driveUrl ? "<p><a href='" + driveUrl + "' style='display: inline-block; padding: 10px 18px; background: #059669; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;'>Ver Fotografía en Drive</a></p>" : "") +
            "</div>";

          MailApp.sendEmail({
            to: payload.userEmails.join(","),
            subject: subject,
            htmlBody: htmlBody
          });
        } catch (eMail) {
          Logger.log("Error sending email: " + eMail);
        }
      }

      return jsonOutput({ status: "success", message: "Solicitud registrada con éxito en BASE_DE_DATOS", driveUrl: driveUrl });
    }

    // 3. ACTUALIZAR DICTAMEN FINAL
    if (action === "UPDATE_DICTAMEN") {
      var sh = ss.getSheetByName(SHEET_BASE_DATOS);
      if (!sh) return jsonOutput({ status: "error", message: "Hoja BASE_DE_DATOS no existe" });
      var targetOp = String(payload.op || "").trim().toUpperCase().replace("OP-", "");
      var dictamen = String(payload.dictamen || "APROBADO").trim();
      var obs = String(payload.obsOperarioFinal || payload.observacionesTecnicas || "").trim();
      var lastRow = sh.getLastRow();
      if (lastRow > 1) {
        var opVals = sh.getRange(2, 6, lastRow - 1, 1).getValues();
        for (var i = 0; i < opVals.length; i++) {
          var curOp = String(opVals[i][0] || "").trim().toUpperCase().replace("OP-", "");
          if (curOp === targetOp) {
            var rowIndex = i + 2;
            sh.getRange(rowIndex, 10).setValue("FINALIZADO");
            sh.getRange(rowIndex, 15).setValue(obs || ("CONCEPTO FINAL: " + dictamen));
            break;
          }
        }
      }
      return jsonOutput({ status: "success", message: "Dictamen final guardado en Google Sheets" });
    }

    // 4. ELIMINAR OP DE MONITOREO
    if (action === "DELETE_MONITOREO_OP") {
      deleteOpFromMonitoreo(ss, payload.op);
      return jsonOutput({ status: "success", message: "OP eliminada de MONITOREO" });
    }

    // 5. SINCRONIZAR ALERTAS
    if (action === "SYNC_ALERTAS") {
      var sh = ss.getSheetByName(SHEET_ALERTAS) || ss.insertSheet(SHEET_ALERTAS);
      var lastRow = sh.getLastRow();
      if (lastRow > 1) {
        sh.getRange(2, 1, lastRow - 1, Math.max(14, sh.getLastColumn())).clearContent();
      }
      var alertHeaders = [
        "OP", "REFERENCIA", "TELA", "COLOR", "METROS (MT)", "AREA ACTUAL",
        "FECHA SOLICITUD", "DÍAS HÁBILES EN ÁREA", "DÍAS RETRASO (>3 DÍAS)",
        "HORAS HÁBILES", "SOLICITANTE / RESPONSABLE", "OBS. OPERARIO",
        "OBS. LAVANDERÍA", "FECHA ENVIO REPORTE"
      ];
      sh.getRange(1, 1, 1, alertHeaders.length).setValues([alertHeaders]);
      sh.getRange(1, 1, 1, alertHeaders.length).setBackground("#991b1b").setFontColor("#ffffff").setFontWeight("bold").setHorizontalAlignment("center");
      
      var rows = payload.rows || [];
      if (rows.length > 0) {
        var matrix = rows.map(function(r) {
          return [
            r.op || "", r.referencia || "", r.tela || "", r.color || "",
            r.metros || "", r.areaActual || "", r.fechaSolicitud || "",
            r.diasHabiles || "", r.diasRetraso || "", r.horasHabiles || "",
            r.responsable || "", r.obsOperario || "", r.obsLavanderia || "",
            r.fechaEnvioReporte || ""
          ];
        });
        sh.getRange(2, 1, matrix.length, alertHeaders.length).setValues(matrix);
        sh.getRange(2, 1, matrix.length, alertHeaders.length).setFontFamily("Consolas").setFontSize(10);
      }
      return jsonOutput({ status: "success", count: rows.length });
    }

    // 6. ACTUALIZAR FOTO DE OP EN DRIVE
    if (action === "UPDATE_OP_PHOTO") {
      var sh = ss.getSheetByName(SHEET_BASE_DATOS);
      var targetOp = String(payload.op || "").trim().toUpperCase().replace("OP-", "");
      var photoUrl = payload.fotoMuestraUrl || "";
      if (photoUrl && photoUrl.indexOf("data:image") === 0) {
        try {
          var folder = getOrCreateFolder(DRIVE_FOLDER_NAME);
          var parts = photoUrl.split(",");
          var mimeMatch = parts[0].match(/:(.*?);/);
          var mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
          var blob = Utilities.newBlob(Utilities.base64Decode(parts[1]), mime, "FotoCalidad_" + targetOp + "_" + new Date().getTime() + ".jpg");
          var file = folder.createFile(blob);
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          photoUrl = file.getUrl();
        } catch (ePhoto) {}
      }
      if (sh) {
        var lastRow = sh.getLastRow();
        if (lastRow > 1) {
          var opVals = sh.getRange(2, 6, lastRow - 1, 1).getValues();
          for (var i = 0; i < opVals.length; i++) {
            var curOp = String(opVals[i][0] || "").trim().toUpperCase().replace("OP-", "");
            if (curOp === targetOp) {
              sh.getRange(i + 2, 13).setValue(photoUrl);
              break;
            }
          }
        }
      }
      return jsonOutput({ status: "success", driveUrl: photoUrl });
    }

    return jsonOutput({ status: "ok" });
  } catch (err) {
    return jsonOutput({ status: "error", error: err.toString() });
  }
}

function onEdit(e) {
  try {
    if (!e || !e.range) return;
    var sheet = e.range.getSheet();
    if (sheet.getName() !== SHEET_BASE_DATOS) return;
    if (e.range.getColumn() === 6 && e.range.getRow() > 1) {
      var val = String(e.value || e.range.getValue() || "").trim();
      if (val && val.toUpperCase() !== "OP") {
        var formatted = val.toUpperCase().indexOf("OP-") === 0 ? ("OP-" + val.substring(3).trim()) : (val.toUpperCase().indexOf("OP") === 0 ? ("OP-" + val.substring(2).replace(/^[-_\\s]+/, "").trim()) : ("OP-" + val));
        if (formatted !== val) e.range.setValue(formatted);
      }
    }
  } catch (err) {}
}

function normalizeAllOpCodesInBaseDeDatos(ss) {
  var sh = ss.getSheetByName(SHEET_BASE_DATOS);
  if (!sh) return;
  var lastRow = sh.getLastRow();
  if (lastRow <= 1) return;
  var range = sh.getRange(2, 6, lastRow - 1, 1);
  var values = range.getValues();
  for (var i = 0; i < values.length; i++) {
    var val = String(values[i][0] || "").trim();
    if (val && val.toUpperCase() !== "OP") {
      values[i][0] = val.toUpperCase().indexOf("OP-") === 0 ? ("OP-" + val.substring(3).trim()) : (val.toUpperCase().indexOf("OP") === 0 ? ("OP-" + val.substring(2).replace(/^[-_\\s]+/, "").trim()) : ("OP-" + val));
    }
  }
  range.setValues(values);
}

function deleteOpFromMonitoreo(ss, opToDelete) {
  var sh = ss.getSheetByName(SHEET_MONITOREO);
  if (!sh) return;
  var target = String(opToDelete || "").trim().toUpperCase().replace("OP-", "");
  var lastRow = sh.getLastRow();
  if (lastRow > 1) {
    var data = sh.getRange(2, 4, lastRow - 1, 1).getValues();
    for (var i = data.length - 1; i >= 0; i--) {
      var cellOp = String(data[i][0] || "").trim().toUpperCase().replace("OP-", "");
      if (cellOp === target) {
        sh.deleteRow(i + 2);
      }
    }
  }
}

function getOrCreateFolder(folderName) {
  var folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(folderName);
}

function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_SNIPPET).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 3000);
    });
  };

  const handleSaveAndSync = async () => {
    setIsTesting(true);
    setTestResult(null);

    const cleanUrl = urlInput.trim();
    setAppsScriptUrl(cleanUrl);

    try {
      const res = await syncAllAlertasToSheets(allAlerts);
      setIsTesting(false);
      setTestResult({
        success: true,
        message: `✓ ¡Enlace activado con éxito! ${res.count} OPs en alerta fueron ingresadas y actualizadas en tiempo real en la hoja ALERTAS de Google Sheets.`
      });
      notificationService.playAlertSound('EXITO');
      if (onSyncComplete) {
        onSyncComplete(res.count);
      }
    } catch (err) {
      setIsTesting(false);
      setTestResult({
        success: false,
        message: 'No se pudo conectar con la URL proporcionada. Asegúrate de haberla implementado como Web App con acceso "Cualquier usuario".'
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in select-none">
      <div className="bg-[#0b0809] dark:bg-white border-2 border-emerald-500/80 rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-5 text-white dark:text-zinc-950 animate-in zoom-in-95 max-h-[92vh] overflow-y-auto font-sans">
        
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-zinc-800 dark:border-zinc-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg shadow-emerald-950/50">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black uppercase font-mono text-emerald-400 dark:text-emerald-700">
                  AUTOMATIZAR ENLACE GOOGLE SHEETS
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-black bg-emerald-500 text-black uppercase">
                  TIEMPO REAL
                </span>
              </div>
              <p className="text-xs text-zinc-300 dark:text-zinc-600 font-mono">
                Hoja: <strong className="text-white dark:text-zinc-900">ALERTAS (14 Columnas)</strong> • Google Spreadsheet STF Group
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-zinc-400 hover:text-white dark:hover:text-black flex items-center justify-center transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* PASOS DE CONFIGURACIÓN RÁPIDA (30 SEGUNDOS) */}
        <div className="p-4 rounded-2xl bg-zinc-900/90 dark:bg-zinc-100 border border-zinc-800 dark:border-zinc-300 space-y-3 text-xs text-zinc-300 dark:text-zinc-700 font-mono">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800 dark:border-zinc-200">
            <span className="font-bold text-white dark:text-zinc-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Guía de Activación en 3 Pasos (Solo se hace una vez):
            </span>
            <a
              href={googleSheetsUrl}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 hover:text-emerald-300 underline flex items-center gap-1 text-[11px]"
            >
              <span>Abrir Hoja de Sheets</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <ol className="list-decimal list-inside space-y-2 text-[11.5px] leading-relaxed">
            <li>
              Abre tu hoja de Google Sheets y en el menú superior ve a: <strong>Extensiones &gt; Apps Script</strong>.
            </li>
            <li>
              Pega el código de automatización (usa el botón de abajo) y haz clic en <strong>Guardar (💾)</strong>.
            </li>
            <li>
              Haz clic en <strong>Implementar &gt; Nueva implementación &gt; Aplicación web</strong> (Acceso: <em>Cualquier usuario</em>) y copia la URL generada aquí.
            </li>
          </ol>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleCopyCode}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs font-mono uppercase flex items-center justify-center gap-2 transition cursor-pointer shadow-md active:scale-98"
            >
              {copiedCode ? <Check className="w-4 h-4 text-black" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCode ? '✓ ¡Código Copiado al Portapapeles!' : '📋 Copiar Código Apps Script para tu Hoja'}</span>
            </button>
          </div>
        </div>

        {/* INPUT PARA PEGAR LA URL DE LA WEB APP */}
        <div className="space-y-2 font-mono">
          <label className="text-xs font-bold uppercase text-zinc-300 dark:text-zinc-700 flex items-center justify-between">
            <span>URL de la Aplicación Web (Apps Script Webhook):</span>
            {urlInput && (
              <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-normal">
                <ShieldCheck className="w-3.5 h-3.5" /> Configurado
              </span>
            )}
          </label>
          <div className="relative">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              className="w-full bg-zinc-950 dark:bg-zinc-50 border-2 border-zinc-800 dark:border-zinc-300 focus:border-emerald-500 rounded-2xl px-4 py-3 text-xs text-white dark:text-zinc-950 placeholder-zinc-600 font-mono outline-none transition"
            />
            <Link2 className="w-4 h-4 text-zinc-500 absolute right-3.5 top-3.5" />
          </div>
        </div>

        {/* RESULTADO DE LA PRUEBA */}
        {testResult && (
          <div className={`p-3.5 rounded-2xl border text-xs font-mono font-bold flex items-start gap-2.5 ${
            testResult.success 
              ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 dark:text-emerald-800'
              : 'bg-rose-500/15 border-rose-500 text-rose-300 dark:text-rose-800'
          }`}>
            {testResult.success ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* FOOTER ACTIONS */}
        <div className="flex items-center justify-between border-t border-zinc-800 dark:border-zinc-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-2xl border border-zinc-700 dark:border-zinc-300 text-xs font-bold text-zinc-300 dark:text-zinc-700 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition cursor-pointer font-mono"
          >
            Cerrar
          </button>

          <button
            type="button"
            onClick={handleSaveAndSync}
            disabled={isTesting || !urlInput.trim()}
            className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-black text-xs font-mono uppercase flex items-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-500/30 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isTesting ? 'animate-spin' : ''}`} />
            <span>{isTesting ? 'Sincronizando...' : 'Guardar y Enlazar 53 OPs Ahora'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
