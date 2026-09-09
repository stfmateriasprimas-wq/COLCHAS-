# STF GROUP S.A. - SISTEMA DE CONTROL DE COLCHAS Y CALIDAD TEXTIL
## Documento Maestro de Arquitectura, Lógica de Negocio y Operación Integral

**Fecha de Consolidación:** Septiembre 2026  
**Entorno Oficial:** Producción en Vercel  
**URL Pública Oficial:** [https://colchas.vercel.app](https://colchas.vercel.app)  
**Repositorio GitHub:** [https://github.com/stfmateriasprimas-wq/COLCHAS-.git](https://github.com/stfmateriasprimas-wq/COLCHAS-.git) (Rama `main`)  
**Base de Datos Oficial:** Google Sheets Maestro (ID: `1jTM8OG2u3bO9Cyrlyn3DJSnGcyLOzA8EWwxwOyWgXdc`)

---

## 1. PROPÓSITO DEL SISTEMA
El sistema gestiona la trazabilidad física y digital de extremo a extremo de las **muestras textiles (colchas)** en planta y lavandería industrial para **STF GROUP**. Permite a los operarios de Atelier, personal de transporte, técnicos de lavandería ZF y auditores de calidad de laboratorio controlar cada fase del ciclo de vida de una orden de producción (OP), calcular tiempos de ciclo (SLA), generar alertas automáticas por correo/WhatsApp, imprimir etiquetas térmicas estandarizadas con códigos QR dinámicos y visualizar evidencias fotográficas en tiempo real desde cualquier dispositivo móvil o de escritorio.

---

## 2. ETAPAS DE PRODUCCIÓN Y SEMÁFORO DE TIEMPOS (SLA)
El flujo consta de **5 etapas obligatorias y secuenciales**:

| N° | Etapa / Estado | Sector / Área | Descripción Operativa | SLA Máximo |
|:--:|:--------------|:-------------|:----------------------|:-----------|
| **1** | `PRE_SOLICITUD` | Atelier / Corte | Corte de muestra textil, pesado, marcado y registro inicial en el sistema. | Inmediato |
| **2** | `SOLICITADO` | En Tránsito | Muestra cortada, embalada y en ruta física de despacho hacia Lavandería ZF. | 24 Horas |
| **3** | `LAVANDERIA` | Lavandería ZF | Recepción en planta de lavado, procesos químicos, secado y centrifugado industrial. | 2 Días Hábiles |
| **4** | `CALIDAD` | Calidad Lab | Inspección técnica en laboratorio: estabilidad dimensional, tono, encogimiento y revirado. | 1 Día Hábil |
| **5** | `FINALIZADO` | Liberado | Auditoría final completada con veredicto formal (`APROBADO` o `RECHAZADO`). | N/A |

### Lógica de Días Hábiles (SLA)
- Solo se contabilizan días laborales colombianos (lunes a viernes, excluyendo sábados, domingos y festivos nacionales).
- Si una OP excede su SLA límite, el sistema activa automáticamente un indicador visual de alerta ámbar/rojo y notifica a los responsables vía correo electrónico o WhatsApp.

---

## 3. AUTOMATIZACIÓN DE ETIQUETAS TÉRMICAS Y CÓDIGO QR EN 2 FASES
El código QR y la etiqueta térmica juegan un rol central en la sincronización física-digital:

```
+-------------------------------------------------------------+
|  +-------------------------------------------------------+  |  <- Marco exterior doble con
|  |  COLCHAS STF            OP: OP-00093078               |  |     separación blanca
|  |  FECHA: 09/09/2026      REF: E741099                  |  |
|  |  +-------------------------------------------------+  |  |
|  |  | TELA: TELA INDIGO LARKANA                       |  |  |  <- Caja negra invertida
|  |  +-------------------------------------------------+  |  |
|  |  COLOR: AZUL             |  +-------------------+  |  |
|  |  ROLLOS: 12  LOTE: 2     |  |    #####   #####  |  |  |
|  |  CÓD. MT: MT00328571     |  |    #   #   #   #  |  |  |
|  |  ESTADO: SOLICITADO      |  |    # [STF] #      |  |  |  <- QR con logo STF centrado
|  |  INSPECTOR: JUAN CORTES  |  |    #####   #####  |  |  |     (Apunta a Vercel)
|  |  - - - - - - - - - - - - - - - - - - - - - - - - - -|  |
|  |  OBSERVACIÓN OPERARIO / CALIDAD:                      |  |  <- Condicional según fase
|  |  SIN OBSERVACIONES OP                                |  |
|  |  STF GROUP S.A. - SISTEMA OFICIAL DE CALIDAD          |  |
|  +-------------------------------------------------------+  |
+-------------------------------------------------------------+
```

### Fase 1: Creación e Impresión Inicial (Pre-Solicitud a Solicitado)
1. Al crear la solicitud en Atelier se genera la primera etiqueta térmica.
2. El código QR codifica la URL pública oficial:
   `https://colchas.vercel.app/?op=OP-XXXXXX&view=public`
   *(Regla inmutable: NUNCA codifica `localhost` para evitar errores en móviles)*.
3. El payload incluye datos técnicos, observación inicial del operario y la **Foto 1 (Muestra Inicial)**.
4. Al pegar la etiqueta en la bolsa de la muestra, cualquier operario o transportador puede escanear el QR con su celular y ver la información al instante.

### Fase 2: Actualización en Calidad y Finalización
1. En Lavandería y Laboratorio de Calidad, el mismo código QR impreso sigue siendo el punto de acceso.
2. Al ingresar el dictamen:
   - Se captura el **Veredicto** (`APROBADO` o `RECHAZADO`).
   - Se registra la **Observación Final de Calidad** (almacenada puramente en la columna 15 `OBS.OPERARIO FINAL` de la hoja).
   - Se captura la **Foto 2 (Inspección Calidad Post-Lavado)**.
3. Cuando la OP alcanza el estado `FINALIZADO`:
   - La etiqueta reimpresa y la pantalla móvil pública ocultan comentarios intermedios y muestran exclusivamente `OBSERVACIÓN FINAL CALIDAD: <Texto puro>`.
   - En la sección fotográfica se muestran ambas fotos lado a lado: **Foto 1 (Muestra Inicial)** y **Foto 2 (Post-Lavado)**.

---

## 4. MOTOR FOTOGRÁFICO Y COMPATIBILIDAD MÓVIL SAFARI / WEBKIT
Para garantizar que las fotos carguen en menos de un segundo en celulares bajo redes móviles 4G/5G:

1. **Almacenamiento Dual en Google Sheets (Columna 12 `EVIDENCIA (LINK DRIVE)`)**:
   - Ambas fotos se guardan en una sola celda separadas por ` | `: `foto1 | foto2`.
2. **Auto-Reparación de Imágenes (`repairBase64Jpeg`)**:
   - Google Sheets tiene un límite por celda de 50.000 caracteres. Si una imagen Base64 fue cortada al guardarse, pierde los dos bytes finales obligatorios de JPEG (`\xFF\xD9`).
   - Safari en iPhone bloquea imágenes truncadas mostrando el icono azul `[?]`.
   - La función `repairBase64Jpeg` detecta si falta el marcador `\xFF\xD9` y lo reconstruye en memoria de forma inmediata, permitiendo que Safari decodifique y renderice la foto perfectamente.
3. **Compresión Adaptativa en Cliente (`compressImageFile`)**:
   - MaxDimension: 440px, calidad: 0.42.
   - Si la cadena Base64 supera 18.500 caracteres, el cliente reduce la calidad progresivamente para que el archivo final pese ~10-14 KB. Esto garantiza que 2 fotos quepan completas en una celda sin truncarse jamás.
4. **Visor Inteligente (`SmartPhotoDisplay.tsx`)**:
   - **PROHIBIDO usar `crossOrigin="anonymous"` en `<img>`**: Las fotos de Google Drive y CDN no tienen cabeceras CORS; incluir `crossOrigin` obligaba al navegador a bloquearlas.
   - Aplica `referrerPolicy="no-referrer"`, `loading="eager"` y `decoding="async"`.
   - Si Safari reporta `naturalWidth === 0` o `naturalHeight === 0`, el visor detecta el fallo silencioso y activa la siguiente alternativa de Google Drive (`https://drive.google.com/thumbnail?id=...&sz=w1000`).

---

## 5. ESTRUCTURA DE LA BASE DE DATOS MAESTRA (GOOGLE SHEETS)
Hoja: `BASE_DE_DATOS` (17 Columnas Oficiales):

| Col | Encabezado Oficial | Tipo | Descripción |
|:---:|:-------------------|:-----|:------------|
| 1 | `FECHA` | Fecha/Hora | Fecha y hora de creación de la solicitud |
| 2 | `INSPECTOR / OPERARIO` | Texto | Nombre del responsable o auditor |
| 3 | `TELA` | Texto | Nombre técnico del material textil |
| 4 | `CÓDIGO MT` | Texto | Código de materia prima (ej. MT00328571) |
| 5 | `COLOR` | Texto | Color del textil (ej. AZUL, CRUDO) |
| 6 | `OP` | Texto | Código formal de orden (ej. OP-00093078) |
| 7 | `REFERENCIA` | Texto | Código de referencia de prenda (ej. E741099) |
| 8 | `ROLLOS` | Número | Cantidad de rollos asociados |
| 9 | `LOTE` | Texto | Identificador de lote de hilatura o tejeduría |
| 10 | `ESTADO` | Texto | `PRE_SOLICITUD`, `SOLICITADO`, `LAVANDERIA`, `CALIDAD`, `FINALIZADO` |
| 11 | `OBSERVACIÓN OPERARIO` | Texto | Historial completo de observaciones y transferencias |
| 12 | `OBSERVACIÓN COLFACTORY` | Texto | Notas registradas por Lavandería Colfactory ZF |
| 13 | `EVIDENCIA (LINK DRIVE)` | Texto | URLs de Google Drive o Base64 separadas por `\|` (Foto 1 \| Foto 2) |
| 14 | `CORREO NOTIFICADO` | Texto | Estado de envío de correo de notificación |
| 15 | `OBS.OPERARIO FINAL` | Texto | Texto puro de la observación final de calidad |
| 16 | `DICTAMEN FINAL` | Texto | `APROBADO` o `RECHAZADO` |
| 17 | `MES` | Número | Mes del registro para analítica mensual |

---

## 6. INTEGRACIÓN BIDIRECCIONAL CON GOOGLE APPS SCRIPT
El script maestro (`STF_COLCHAS_MASTER_APPS_SCRIPT.js` / `Codigo.js`) expone endpoints Web App:
- **`doGet(e)`**:
  - `GET_BASE_DE_DATOS`: Obtiene filas en JSON.
  - `GET_MONITOREO`: Retorna OPs pendientes.
  - `GET_ALERTAS`: Retorna OPs con SLA vencido.
- **`doPost(e)`**:
  - `CREATE_OP`: Inserta nueva fila en `BASE_DE_DATOS`.
  - `TRANSFER_OP`: Actualiza estado y auditor en `BASE_DE_DATOS` y `MONITOREO`.
  - `UPDATE_DICTAMEN`: Asigna veredicto final, observación final y foto 2.
  - `UPDATE_OP_PHOTO`: Actualiza evidencia fotográfica.
  - `SYNC_ALERTAS`: Sincroniza hoja `ALERTAS`.
  - `SEND_OP_EMAIL`: Despacha correos HTML con tabla estilizada y logo STF.

---

## 7. PROTOCOLO DE DESPLIEGUE Y MANTENIMIENTO
1. **Regla de Compilación**:
   - Antes de cualquier commit, ejecutar `npm run build` (`tsc -b && vite build`) asegurando cero errores.
2. **Control de Versiones**:
   - Cualquier cambio se consolida en la rama `main` de GitHub.
   - Vercel compila y despliega automáticamente en menos de 60 segundos.
3. **Persistencia de Memoria**:
   - Todo cambio arquitectónico o de reglas debe documentarse en `AGENTS.md` y en este archivo para que cualquier sesión futura conserve la lógica intacta.
