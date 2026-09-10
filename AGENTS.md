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

## 2. Flujo de Estados, Roles y Trazabilidad (5 Etapas de Producción)
1. **Lógica Inmutable de Registro Inicial**:
   - **Perfil Calidad / Planta Principal / Admin**: Toda nueva colcha creada por personal de Calidad o Planta Principal DEBE registrarse obligatoriamente en **`SOLICITADO`** (`TRÁNSITO / DESPACHO`). *Bajo ninguna circunstancia debe registrarse directamente en `CALIDAD`*, ya que la muestra física requiere ser lavada primero.
   - **Perfil Zona Franca (Atelier ZF / Didier Muñoz / Sebastian Herrera / Calidad ZF)**: Toda nueva colcha creada por Atelier ZF DEBE registrarse obligatoriamente en **`PRE_SOLICITUD`** (`CALIDAD 2F / ATELIER`).
2. **Recepción en Lavandería Colfactory ZF**:
   - Tanto las OPs en `SOLICITADO` como en `PRE_SOLICITUD` están en espera de ser recibidas en planta de lavado.
   - El personal de Lavandería (y Administrador) es el encargado de **"llamar esa OP y cargarla en Lavandería"**, pasando su estado a **`LAVANDERIA`** (SLA máximo: 2 días hábiles).
3. **Paso a Calidad Laboratorio**:
   - Una vez concluido el ciclo de lavado, Lavandería transfiere la OP hacia **`CALIDAD`** (`CALIDAD STF LABORATORIO`, SLA máximo: 1 día hábil).
4. **Auditoría Técnica y Finalización**:
   - En `CALIDAD`, los auditores técnicos evalúan la muestra (encogimiento, tono, revirado), ingresan el veredicto formal (`APROBADO` o `RECHAZADO`), la observación final de calidad y la Foto 2 (Post-Lavado).
   - Al confirmar, la OP pasa a **`FINALIZADO`** (Liberado) y se activa la Fase 2 de etiqueta térmica.

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

## 4. Arquitectura de Evidencias Fotográficas y Almacenamiento en Google Drive
- **Estructura Jerárquica en Google Drive**:
  - Carpeta Raíz: `STF_COLCHAS_EVIDENCIAS/` (en la cuenta oficial o carpeta contenedora de Drive).
  - Carpetas Mensuales: `YYYY-MM - MES/` (ej. `2026-09 - SEPTIEMBRE/`).
  - Subcarpetas por OP: `OP-XXXXX/` (ej. `OP-00096156/`).
  - Archivos: `OP-XXXXX_MUESTRA_INICIAL.jpg` (Pre-Solicitud) y `OP-XXXXX_POST_LAVADO_CALIDAD.jpg` (Auditoría Calidad).
  - Permisos: Lectura pública por enlace (`ANYONE_WITH_LINK, VIEW`) para acceso móvil instantáneo sin login.
- **Columna M (13) en `BASE_DE_DATOS`**: Almacena los enlaces oficiales de Google Drive unificados mediante el separador ` | ` (`linkDriveFoto1 | linkDriveFoto2`).
- **Reparación Automática (`repairBase64Jpeg`)**:
  - Si una foto en Base64 fue cortada por límites de celda en Google Sheets perdiendo su marcador `\xFF\xD9`, el frontend la repara de inmediato anexando el marcador de fin de archivo JPEG.
  - Esto previene el icono de imagen rota `[?]` en Safari de iOS (iPhone).
- **Compresión Adaptativa en Cliente (`compressImageFile`)**:
  - Dimensiones máximas: 440px, calidad: 0.42.
  - Se garantiza que cualquier foto tomada desde la cámara pese < 14 KB (< 18.500 caracteres Base64) para carga ultra-veloz.
- **Visor de Fotos (`SmartPhotoDisplay.tsx`)**:
  - **PROHIBIDO usar `crossOrigin="anonymous"` en `<img>`**: Evita que Safari bloquee imágenes por CORS en redes celulares (4G/5G).
  - Siempre usar `referrerPolicy="no-referrer"`, `loading="eager"` y `decoding="async"`.
  - Conversión inteligente de enlaces Drive a miniaturas CDN ultra-rápidas (`thumbnail?id=...&sz=w1000` y `lh3.googleusercontent.com`).

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
