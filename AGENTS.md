# REGLAS Y MEMORIA MAESTRA DEL SISTEMA STF COLCHAS

Este archivo define la lógica de negocio, arquitectura, flujos operativos y reglas técnicas inmutables del sistema **STF GROUP - Control de Calidad de Colchas & Trazabilidad Textil**. Todo agente de IA que interactúe con este repositorio DEBE respetar y mantener estas reglas.

---

## 1. Identidad y Despliegue Oficial
- **URL Oficial en Producción**: `https://colchas.vercel.app`
- **Repositorio Oficial**: `https://github.com/stfmateriasprimas-wq/COLCHAS-.git` (rama `main`)
- **ID de Google Spreadsheet**: `1jTM8OG2u3bO9Cyrlyn3DJSnGcyLOzA8EWwxwOyWgXdc`
- **Nombre de Hojas Clave**:
  1. `BASE_DE_DATOS` (17 columnas maestras de OPs)
  2. `ALERTAS` (14 columnas para OPs con retraso SLA > 3 días)
  3. `MONITOREO` (5 columnas de OPs pendientes por procesar)
  4. Carpeta Google Drive: `STF_COLCHAS_EVIDENCIAS`

---

## 2. Flujo de Estados y Trazabilidad (5 Etapas de Producción)
1. **PRE_SOLICITUD**: Atelier / Corte (Corte de muestra textil y registro inicial).
2. **SOLICITADO**: En Tránsito (Despacho desde Atelier hacia Lavandería ZF).
3. **LAVANDERIA**: Lavandería Colfactory ZF (Proceso de lavado industrial, SLA máximo: 2 días hábiles).
4. **CALIDAD**: Calidad Lab (Auditoría técnica, tono, estabilidad, SLA máximo: 1 día hábil).
5. **FINALIZADO**: Liberado (Aprobado o Rechazado formalmente para producción).

---

## 3. Automatización de Etiquetas Térmicas y Código QR en 2 Fases
1. **Fase 1 (Inicial - Pre-Solicitud a Solicitado)**:
   - Se crea la solicitud con datos técnicos y Foto 1 (Muestra Inicial).
   - Se genera la etiqueta térmica con:
     - Borde exterior grueso, separación blanca, borde interior fino.
     - Encabezado `COLCHAS STF`, `OP/REF`, cuadro destacado de `TELA`.
     - Tabla técnica de 5 filas con divisores verticales/horizontales.
     - Código QR a la derecha con el isotipo `STF` centrado.
     - **REGLA CRÍTICA DE QR**: El QR **NUNCA debe codificar `localhost` ni IPs locales**; siempre debe resolver a `https://colchas.vercel.app/?op=...&view=public`.
     - Línea punteada, bloque de Observación Inicial del Operario y pie de página.
   - Al escanear desde un celular, abre la vista móvil pública de solo lectura (`PublicOpView.tsx`).

2. **Fase 2 (Actualización de Calidad y Finalización)**:
   - El mismo código QR es dinámico y refleja las actualizaciones en tiempo real.
   - En Lavandería / Calidad se ingresa:
     - **VEREDICTO** (`APROBADO` o `RECHAZADO`).
     - **OBSERVACIÓN FINAL** (almacenada puramente en la columna 14 `OBS.OPERARIO FINAL`).
     - **FOTO ACTUALIZADA** (Foto 2: Post-Lavado Calidad).
   - Cuando la OP llega a estado `FINALIZADO`:
     - En la etiqueta térmica y en la vista móvil se ocultan los comentarios intermedios y se muestra exclusivamente `OBSERVACIÓN FINAL CALIDAD: <Texto puro>`.
     - En el apartado de fotos se muestran ambas fotos lado a lado: **Foto 1 (Muestra Inicial)** y **Foto 2 (Post-Lavado Calidad)**.

---

## 4. Arquitectura de Evidencias Fotográficas y Compatibilidad Móvil (iOS / Safari / Android)
- **Columna 12 en `BASE_DE_DATOS`**: Almacena ambas fotos unificadas mediante el separador ` | ` (`foto1 | foto2`).
- **Reparación Automática (`repairBase64Jpeg`)**:
  - Si una foto en Base64 fue cortada por límites de celda en Google Sheets perdiendo su marcador `\xFF\xD9`, el frontend la repara de inmediato anexando el marcador de fin de archivo JPEG.
  - Esto previene el icono de imagen rota `[?]` en Safari de iOS (iPhone).
- **Compresión Adaptativa en Cliente (`compressImageFile`)**:
  - Dimensiones máximas: 440px, calidad: 0.42.
  - Se garantiza que cualquier foto tomada desde la cámara pese < 14 KB (< 18.500 caracteres Base64) para que quepan 2 fotos completas en una sola celda sin truncamiento.
- **Visor de Fotos (`SmartPhotoDisplay.tsx`)**:
  - **PROHIBIDO usar `crossOrigin="anonymous"` en `<img>`**: Evita que Safari bloquee imágenes por CORS en redes celulares (4G/5G).
  - Siempre usar `referrerPolicy="no-referrer"`, `loading="eager"` y `decoding="async"`.
  - Detección de dimensiones nulas (`naturalWidth === 0`) para reintentar con miniaturas de Google Drive (`sz=w1000`).

---

## 5. Arquitectura de Sincronización en Tiempo Real
- **Lectura Rápida (0 ms)**: `https://docs.google.com/spreadsheets/d/<ID>/gviz/tq?tqx=out:csv&sheet=BASE_DE_DATOS`
- **Escritura y Notificaciones**: Google Apps Script Web App (POST con acciones `CREATE_OP`, `TRANSFER_OP`, `UPDATE_DICTAMEN`, `UPDATE_OP_PHOTO`, `SYNC_ALERTAS`, `SEND_OP_EMAIL`).
- **Respaldo Local**: `localStorage` (`STF_LOCAL_CREATED_OPS`) para disponibilidad inmediata antes de sincronizar.
- **Payload QR Compacto**: Parámetro `?d=...` en Base64 con datos esenciales para escaneo offline o con conexión lenta.

---

## 6. Integridad del Código y Despliegue
- Antes de subir cualquier cambio a `main`, DEBE ejecutarse `npm run build` (`tsc -b && vite build`) garantizando **0 errores**.
- Despliegue continuo automático activo en Vercel vinculado a la rama `main` de GitHub.
