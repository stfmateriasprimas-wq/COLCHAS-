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
 * GOOGLE APPS SCRIPT - STF GROUP SISTEMA DE COLCHAS (ALERTAS & BASE DE DATOS)
 * SPREADSHEET ID: ${SPREADSHEET_ID}
 */
var SPREADSHEET_ID = "${SPREADSHEET_ID}";
var SHEET_ALERTAS = "ALERTAS";
var HEADERS = [
  "OP", "REFERENCIA", "TELA", "COLOR", "METROS (MT)", "AREA ACTUAL",
  "FECHA SOLICITUD", "DÍAS HÁBILES EN ÁREA", "DÍAS RETRASO (>3 DÍAS)",
  "HORAS HÁBILES", "SOLICITANTE / RESPONSABLE", "OBS. OPERARIO",
  "OBS. LAVANDERÍA", "FECHA ENVIO REPORTE"
];

function doPost(e) {
  try {
    var raw = e.postData ? e.postData.contents : "{}";
    var body = JSON.parse(raw);
    var action = body.action;
    var payload = body.payload || {};
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    if (action === "SYNC_ALERTAS") {
      var sh = ss.getSheetByName(SHEET_ALERTAS) || ss.insertSheet(SHEET_ALERTAS);
      var lastRow = sh.getLastRow();
      if (lastRow > 1) {
        sh.getRange(2, 1, lastRow - 1, Math.max(14, sh.getLastColumn())).clearContent();
      }
      sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
      
      // Formato encabezado rojo vino
      var hRange = sh.getRange(1, 1, 1, HEADERS.length);
      hRange.setBackground("#991b1b").setFontColor("#ffffff").setFontWeight("bold").setHorizontalAlignment("center");
      
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
        sh.getRange(2, 1, matrix.length, HEADERS.length).setValues(matrix);
        sh.getRange(2, 1, matrix.length, HEADERS.length).setFontFamily("Consolas").setFontSize(10);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", count: rows.length })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "DELETE_ALERTA_OP") {
      var sh = ss.getSheetByName(SHEET_ALERTAS);
      if (sh) {
        var targetOp = String(payload.op || "").trim().toUpperCase().replace("OP-", "");
        var lastRow = sh.getLastRow();
        if (lastRow > 1) {
          var vals = sh.getRange(2, 1, lastRow - 1, 1).getValues();
          for (var i = vals.length - 1; i >= 0; i--) {
            var cur = String(vals[i][0] || "").trim().toUpperCase().replace("OP-", "");
            if (cur === targetOp) {
              sh.deleteRow(i + 2);
            }
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "OP depurada" })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
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
