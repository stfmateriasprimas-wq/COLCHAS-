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
- **Columna M (13) en `BASE_DE_DATOS`**: Almacena el enlace oficial 100% clickeable de la carpeta de Google Drive de la OP (`https://drive.google.com/drive/folders/...`). Al hacer clic en la celda en Google Sheets, abre directamente la carpeta de la OP en Drive donde se visualizan ambas fotos (`_MUESTRA_INICIAL.jpg` y `_POST_LAVADO_CALIDAD.jpg`). En el frontend se resuelven automáticamente las fotos individuales en CDN de alta velocidad mediante la acción `GET_OP_PHOTOS`.
- **Límite Estricto de 2 Fotos por OP en Google Drive**:
  - `OP-XXXXX_MUESTRA_INICIAL.jpg`: Fotografía tomada en Atelier / Corte / Solicitud.
  - `OP-XXXXX_POST_LAVADO_CALIDAD.jpg`: Fotografía tomada en Auditoría de Calidad Post-Lavado.
  - Cualquier versión intermedia anterior es enviada a la papelera automáticamente para garantizar exactamente 2 fotos por OP.
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

## 5. Automatización de Notificaciones por Correo (3 Flujos Oficiales)
- **Fuente Maestra de la Verdad para Correos**:
  - La **Columna E de la hoja `USUARIOS`** en Google Sheets es la única fuente oficial de correos.
  - Cualquier adición, retiro o modificación manual en la Columna E de `USUARIOS` es leída dinámicamente en tiempo real para todos los envíos.
- **Flujo A (Creación Inmediata de OP)**:
  - Disparado al registrar una nueva OP en el sistema.
  - Envía la Ficha Técnica oficial con enlace al aplicativo móvil (`?op=...&view=public`) y foto inicial.
- **Flujo B (Alertas Diarias Matutinas a las 7:00 AM)**:
  - Disparado por trigger de tiempo en Apps Script.
  - Audita todas las OPs con SLA > 3 días hábiles y envía reporte ejecutivo consolidado a la lista oficial de correos.
- **Flujo C (Dictamen Final y Liberación de OP)**:
  - Disparado cuando el auditor de Calidad emite su veredicto (`APROBADO` o `RECHAZADO`).
  - Envía notificación formal de liberación con el dictamen, observaciones técnicas finales y foto post-lavado.

---

## 6. Arquitectura de Sincronización en Tiempo Real
- **Lectura Rápida (0 ms)**: `https://docs.google.com/spreadsheets/d/<ID>/gviz/tq?tqx=out:csv&sheet=BASE_DE_DATOS`
- **Escritura y Notificaciones**: Google Apps Script Web App (POST con acciones `CREATE_OP`, `TRANSFER_OP`, `UPDATE_DICTAMEN`, `UPDATE_OP_PHOTO`, `SYNC_ALERTAS`, `CLEAN_COLUMNS_KLMN`, `CLEAN_DRIVE_DUPLICATES`, `GET_OP_PHOTOS`).
- **Respaldo Local**: `localStorage` (`STF_LOCAL_CREATED_OPS`) para disponibilidad inmediata antes de sincronizar.
- **Payload QR Compacto**: Parámetro `?d=...` en Base64 con datos esenciales para escaneo offline o con conexión lenta.

---

## 7. Diseño, Experiencia de Usuario y Estándar Dual (Web & Móvil)
- **Inicio Obligatorio en Pantalla de Login**: Al acceder al aplicativo (`https://colchas.vercel.app`), el sistema DEBE iniciar SIEMPRE en la pantalla de autenticación (`LoginScreen.tsx`). Bajo ninguna circunstancia se debe saltar el inicio de sesión de forma automática mediante sesiones guardadas en `localStorage` o `sessionStorage`. La única excepción técnica autorizada es el escaneo directo de código QR con los parámetros `?op=...&view=public`, el cual abre la vista móvil pública y de solo lectura (`PublicOpView.tsx`).
- **Regla Inmutable Dual (Web & Móvil)**: De aquí en adelante, TODAS las actualizaciones, nuevas pantallas, modales, tablas, tarjetas, alertas y componentes DEBEN estar diseñados, optimizados y verificados al 100% tanto para la vista Web (PC / Desktop / monitores amplios) como para la vista Móvil (smartphones y pantallas táctiles de 360px a 430px de ancho). Ningún ajuste se considera completado si rompe o descuadra la experiencia en cualquiera de los dos entornos.
- **Encabezado Navbar**: Estructurado con cuadrícula CSS simétrica de 3 columnas `grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]` garantizando que el isotipo STF GROUP y el identificador de usuario se mantengan siempre en el centro geométrico exacto de la pantalla.

---

## 8. Integridad del Código y Despliegue
- Antes de subir cualquier cambio a `main`, DEBE ejecutarse `npm run build` (`tsc -b && vite build`) garantizando **0 errores**.
- Despliegue continuo automático activo en Vercel vinculado a la rama `main` de GitHub.

