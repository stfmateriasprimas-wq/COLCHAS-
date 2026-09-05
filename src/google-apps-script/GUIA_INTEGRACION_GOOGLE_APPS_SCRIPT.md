# 📘 Guía de Integración y Mapeo Maestro: Google Apps Script & Sistema Antigravity

**Google Spreadsheet:**  
👉 [https://docs.google.com/spreadsheets/d/1jTM8OG2u3bO9Cyrlyn3DJSnGcyLOzA8EWwxwOyWgXdc/edit?usp=sharing](https://docs.google.com/spreadsheets/d/1jTM8OG2u3bO9Cyrlyn3DJSnGcyLOzA8EWwxwOyWgXdc/edit?usp=sharing)  
**ID de la Hoja:** `1jTM8OG2u3bO9Cyrlyn3DJSnGcyLOzA8EWwxwOyWgXdc`

---

## 🎯 1. Estructura y Mapeo Exacto de Columnas

### A. Pestaña `BASE_DE_DATOS` (16 Columnas Maestras)
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
| **11** | `OBSERVACIÓN OPERARIO` | Historial de observaciones concatenadas | `solicitud.observacionesOperario` |
| **12** | `OBSERVACIÓN COLFACTORY` | Notas de lavandería | `solicitud.observacionesLavanderia` |
| **13** | `EVIDENCIA (LINK DRIVE)` | Enlace público de la foto en Google Drive | `solicitud.fotoMuestraUrl` |
| **14** | `CORREO NOTIFICADO` | Registro de correos notificados | Campo de auditoría |
| **15** | `OBS.OPERARIO FINAL` | Dictamen y notas finales | Concepto final |
| **16** | `MES` | Número de mes (1 al 12) | Mes de ingreso |

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

## ⚡ 2. Contrato de API (Acciones Soportadas por el Webhook)

### Métodos GET:
- `?action=GET_MONITOREO`: Retorna la lista en vivo de OPs pendientes por hacer.
- `?action=GET_BASE_DATOS`: Retorna las filas maestras de `BASE_DE_DATOS`.
- `?action=GET_ALERTAS`: Retorna las filas activas de `ALERTAS`.

### Métodos POST:
- `action: "SYNC_ALERTAS"`: Sobrescribe e inserta en tiempo real todas las OPs con desviación SLA en la pestaña `ALERTAS` con formato institucional.
- `action: "DELETE_ALERTA_OP"`: Elimina la fila de la OP especificada cuando se libera o finaliza.
- `action: "CREATE_OP"`: Añade una nueva fila a `BASE_DE_DATOS`, guarda la foto en Google Drive (`STF_COLCHAS_EVIDENCIAS`) y retira la OP de `MONITOREO`.
- `action: "TRANSFER_OP"`: Actualiza el estado, área e inspector de la OP.
- `action: "UPDATE_DICTAMEN"`: Registra el dictamen final (`APROBADO`/`RECHAZADO`), marca como `FINALIZADO` y depura de `ALERTAS`.
- `action: "UPDATE_ALERTA_REPORT_SENT"`: Actualiza la columna 14 (`FECHA ENVIO REPORTE`).
- `action: "DELETE_MONITOREO_OP"`: Elimina la OP de la pestaña `MONITOREO`.

---

## 🚀 3. Instrucciones de Instalación en Google Sheets (Solo 3 Pasos):

1. **Abrir Apps Script**:
   En tu hoja de cálculo, ve al menú superior: **Extensiones > Apps Script**.
2. **Pegar el Código Maestro**:
   Borra cualquier código anterior y pega el contenido del archivo [`Codigo.js`](file:///C:/Users/joseo/.gemini/antigravity/scratch/stf-colchas-app/src/google-apps-script/Codigo.js). Guarda con **Ctrl + S** o el icono 💾.
3. **Implementar como Web App**:
   Haz clic en **Implementar > Nueva implementación**:
   - **Tipo**: Aplicación web
   - **Ejecutar como**: Yo (*tu cuenta Google*)
   - **Quién tiene acceso**: Cualquier usuario (*Anyone*)
   - Haz clic en **Implementar** y copia la URL generada (`https://script.google.com/macros/s/.../exec`).
4. **Vincular en Antigravity**:
   En la interfaz de Antigravity (Pestaña **ALERTAS**), haz clic en el botón de engranaje **`[ ⚙️ ]`** o en **`[ 🔄 SHEETS ]`**, pega la URL y presiona **Guardar y Enlazar**.
