# 📘 Guía de Integración y Mapeo Maestro: Google Apps Script & Sistema Antigravity

**Google Spreadsheet:**  
👉 [https://docs.google.com/spreadsheets/d/1jTM8OG2u3bO9Cyrlyn3DJSnGcyLOzA8EWwxwOyWgXdc/edit?usp=sharing](https://docs.google.com/spreadsheets/d/1jTM8OG2u3bO9Cyrlyn3DJSnGcyLOzA8EWwxwOyWgXdc/edit?usp=sharing)  
**ID de la Hoja:** `1jTM8OG2u3bO9Cyrlyn3DJSnGcyLOzA8EWwxwOyWgXdc`

---

## 🎯 1. Estructura y Mapeo Exacto de Columnas

### A. Pestaña `BASE_DE_DATOS` (17 Columnas Maestras)
| Col | Nombre de Columna | Descripción / Tipo | Origen en Antigravity |
|---|---|---|---|
| **1** | `FECHA` | Fecha y hora (D/M/YYYY HH:mm:ss) | `solicitud.fechaCreacion` |
| **2** | `INSPECTOR / OPERARIO` | Nombre del responsable | `solicitud.inspector` |
| **3** | `TELA` | Nombre de la tela textil | `solicitud.tela` |
| **4** | `CÓDIGO MT` | Código de metraje MT | `solicitud.codigoMt` |
| **5** | `COLOR` | Color de la muestra (AZUL, CRUDO, etc.) | `solicitud.color` |
| **6** | `OP` | Número de OP (Ej: `OP-00096156`) | `solicitud.op` |
| **7** | `REFERENCIA` | Código de Referencia | `solicitud.referencia` |
| **8** | `ROLLOS` | Número de rollos inspeccionados | `solicitud.rollos` |
| **9** | `LOTE` | Número de lote o rango | `solicitud.lote` |
| **10** | `ESTADO` | Fase actual (`PRE_SOLICITUD`, `SOLICITADO`, `LAVANDERIA`, `CALIDAD`, `FINALIZADO`) | `solicitud.estado` |
| **11** | `OBSERVACIÓN OPERARIO` | Observación inicial pura del operario | `solicitud.observacionesOperario` |
| **12** | `OBSERVACIÓN COLFACTORY` | Notas reales de lavandería | `solicitud.observacionesLavanderia` |
| **13** | `EVIDENCIA (LINK DRIVE)` | Enlace público de la foto en Google Drive (`foto1 \| foto2`) | `solicitud.fotoMuestraUrl` |
| **14** | `CORREO NOTIFICADO` | Correos limpios de usuarios notificados | `solicitud.emailUsuario` |
| **15** | `OBS.OPERARIO FINAL` | Observación final pura de Calidad | `solicitud.observacionesCalidad` |
| **16** | `DICTAMEN FINAL` | Veredicto formal (`APROBADO` o `RECHAZADO`) | `solicitud.dictamen` |
| **17** | `MES` | Número de mes (1 al 12) | Mes de ingreso |

---

### B. Pestaña `ALERTAS` (14 Columnas SLA > 3 Días)
| Col | Nombre de Columna | Descripción / Formato |
|---|---|---|
| **1** | `OP` | Número de OP (Ej: `OP-00095216`) |
| **2** | `REFERENCIA` | Referencia de prenda |
| **3** | `TELA` | Tipo de tela |
| **4** | `COLOR` | Color de la tela |
| **5** | `METROS (MT)` | Metros calculados / Código MT |
| **6** | `AREA ACTUAL` | Área en planta (`CALIDAD STF LABORATORIO`, `LAVANDERÍA`, etc.) |
| **7** | `FECHA SOLICITUD` | Fecha inicial de solicitud |
| **8** | `DÍAS HÁBILES EN ÁREA` | Días laborales transcurridos (Excluye fines de semana) |
| **9** | `DÍAS RETRASO (>3 DÍAS)` | Exceso SLA (Ej: `+76 Días`) en rojo |
| **10** | `HORAS HÁBILES` | Horas hábiles laboradas |
| **11** | `SOLICITANTE / RESPONSABLE` | Inspector o usuario asignado |
| **12** | `OBS. OPERARIO` | Observaciones técnicas de planta |
| **13** | `OBS. LAVANDERÍA` | Observaciones de lavado |
| **14** | `FECHA ENVIO REPORTE` | Fecha, hora y destinatarios del envío por Gmail |

---

### C. Pestaña `MONITOREO` (5 Columnas OPs por Hacer)
- Col 1: `TELA`
- Col 2: `MT`
- Col 3: `COLOR`
- Col 4: `OP`
- Col 5: `REFERENCIA`

---

## 📁 2. Estructura Jerárquica en Google Drive (Por Mes y por OP)
Las evidencias fotográficas se organizan de forma 100% automática en Google Drive:
```text
📁 Google Drive (Cuenta Oficial STF)
 └── 📁 STF_COLCHAS_EVIDENCIAS/
      ├── 📁 2026-09 - SEPTIEMBRE/
      │    ├── 📁 OP-00096156/
      │    │    ├── 🖼️ OP-00096156_MUESTRA_INICIAL.jpg       (Foto Inicial Atelier)
      │    │    └── 🖼️ OP-00096156_POST_LAVADO_CALIDAD.jpg  (Foto Calidad Post-Lavado)
      │    ├── 📁 OP-00096157/
      │    │    └── 🖼️ OP-00096157_MUESTRA_INICIAL.jpg
      │    └── ...
      ├── 📁 2026-10 - OCTUBRE/
      └── ...
```
- **Carpeta Raíz**: `STF_COLCHAS_EVIDENCIAS` (resuelta automáticamente en la cuenta o en la carpeta contenedora del archivo configurado `TARGET_DRIVE_SPREADSHEET_OR_FOLDER_ID`).
- **Carpetas Mensuales**: Nombradas `YYYY-MM - MES` para ordenamiento cronológico natural.
- **Carpetas de OP**: Nombradas con el código oficial `OP-XXXXX`.
- **Archivos**: Nombrados `OP-XXXXX_MUESTRA_INICIAL.jpg` y `OP-XXXXX_POST_LAVADO_CALIDAD.jpg`.
- **Permisos Públicos**: Cada archivo y carpeta se configura con permiso de lectura por enlace (`ANYONE_WITH_LINK, VIEW`), garantizando compatibilidad con dispositivos móviles sin requerir inicio de sesión en Google.

---

## ⚡ 3. Contrato de API (Acciones Soportadas por el Webhook)

### Métodos GET:
- `?action=GET_MONITOREO`: Retorna la lista en vivo de OPs pendientes por hacer.
- `?action=GET_BASE_DATOS`: Retorna las filas maestras de `BASE_DE_DATOS`.
- `?action=GET_ALERTAS`: Retorna las filas activas de `ALERTAS`.

### Métodos POST:
- `action: "SYNC_ALERTAS"`: Sobrescribe e inserta en tiempo real todas las OPs con desviación SLA en la pestaña `ALERTAS`.
- `action: "DELETE_ALERTA_OP"`: Elimina la fila de la OP especificada al liberarse o finalizarse.
- `action: "CREATE_OP"`: Añade una nueva fila a `BASE_DE_DATOS`, guarda la foto en Google Drive (`STF_COLCHAS_EVIDENCIAS / YYYY-MM / OP-XXXXX`), registra el link en Columna M y retira la OP de `MONITOREO`.
- `action: "TRANSFER_OP"`: Actualiza el estado, área e inspector de la OP.
- `action: "UPDATE_OP_PHOTO"`: Guarda la foto en la carpeta de la OP en Google Drive y actualiza Columna M unificando enlaces (`foto1 \| foto2`).
- `action: "UPDATE_DICTAMEN"`: Registra el dictamen final (`APROBADO`/`RECHAZADO`), archiva foto de calidad en Drive si viene adjunta, marca como `FINALIZADO` y depura de `ALERTAS`.
- `action: "UPDATE_ALERTA_REPORT_SENT"`: Actualiza la columna 14 (`FECHA ENVIO REPORTE`).
- `action: "DELETE_MONITOREO_OP"`: Elimina la OP de la pestaña `MONITOREO`.

---

## 🚀 4. Instrucciones de Instalación y Actualización en Google Sheets:

1. **Abrir Apps Script**:
   En tu hoja de cálculo, ve al menú superior: **Extensiones > Apps Script**.
2. **Pegar el Código Maestro**:
   Borra cualquier código anterior y pega el contenido completo del archivo [`Codigo.js`](file:///c:/Users/joseo/Downloads/remix_-stf-group---quality-control%20(6)/COLCHAS-/src/google-apps-script/Codigo.js). Guarda con **Ctrl + S** o el icono 💾.
3. **Implementar / Actualizar como Web App**:
   Haz clic en **Implementar > Administrar implementaciones**:
   - Haz clic en el icono de **Lápiz (Editar)**.
   - En **Versión**, selecciona **Nueva versión**.
   - Haz clic en **Implementar**.
   *(O si es la primera vez: **Implementar > Nueva implementación > Aplicación web**, Ejecutar como: Yo, Quién tiene acceso: Cualquier usuario).*
4. **Verificar Menú en Google Sheets**:
   Recarga la hoja de cálculo. En el menú superior **🚀 STF GROUP**, haz clic en:
   `📁 Crear / Verificar Estructura en Google Drive (Mes y OPs)` para comprobar que las carpetas se creen correctamente.

