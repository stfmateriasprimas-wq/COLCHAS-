/**
 * =========================================================================
 * 01_Configuracion.js - Constantes globales, IDs de Spreadsheet, nombres de hojas y encabezados
 * SISTEMA STF GROUP - CONTROL DE CALIDAD DE COLCHAS & TRAZABILIDAD TEXTIL
 * =========================================================================
 */

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
var SHEET_TRAZABILIDAD = "TRAZABILIDAD_TIEMPOS";
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

var TRAZABILIDAD_HEADERS = [
  "OP", "REFERENCIA", "TELA", "DE ETAPA", "A ETAPA / ÁREA",
  "FECHA Y HORA MOVIMIENTO", "TIEMPO EN ETAPA PREVIA", "RESPONSABLE", "OBSERVACIÓN", "MES"
];
