const fs = require('fs');
const path = require('path');

const gasDir = path.join(__dirname, '../src/google-apps-script');
const backupDir = path.join(gasDir, '_backup');

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const moduleFiles = [
  '01_Configuracion.js',
  '02_MenuYTriggers.js',
  '03_Endpoints.js',
  '04_SheetsService.js',
  '05_DriveService.js',
  '06_EmailService.js',
  '07_MantenimientoYSeguridad.js'
];

let unifiedContent = `/**
 * =========================================================================
 * STF GROUP S.A. - CONTROL DE CALIDAD DE COLCHAS & TRAZABILIDAD TEXTIL
 * SCRIPT MAESTRO UNIFICADO (GENERADO AUTOMÁTICAMENTE DESDE MÓDULOS)
 * =========================================================================
 * Fecha de generación: ${new Date().toISOString()}
 * =========================================================================
 */\n\n`;

moduleFiles.forEach(file => {
  const filePath = path.join(gasDir, file);
  if (fs.existsSync(filePath)) {
    unifiedContent += fs.readFileSync(filePath, 'utf8') + '\n\n';
  }
});

const targetPath = path.join(backupDir, 'STF_COLCHAS_UNIFICADO_COMPLETO.js');
fs.writeFileSync(targetPath, unifiedContent, 'utf8');

console.log('✅ Archivo unificado de respaldo generado con éxito en:', targetPath);
