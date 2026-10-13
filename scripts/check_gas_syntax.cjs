const path = require('path');
const { execSync } = require('child_process');

const files = [
  '01_Configuracion.js',
  '02_MenuYTriggers.js',
  '03_Endpoints.js',
  '04_SheetsService.js',
  '05_DriveService.js',
  '06_EmailService.js',
  '07_MantenimientoYSeguridad.js'
];

let allOk = true;
files.forEach(f => {
  const p = path.join(__dirname, '../src/google-apps-script', f);
  try {
    execSync(`node --check "${p}"`);
    console.log(`✅ ${f}: Sintaxis 100% Correcta`);
  } catch (e) {
    allOk = false;
    console.error(`❌ ${f}: Error de Sintaxis`, e.message);
  }
});

if (allOk) {
  console.log('\n🎉 TODOS LOS MÓDULOS DE APPS SCRIPT TIENEN SINTAXIS VÁLIDA.');
} else {
  process.exit(1);
}
