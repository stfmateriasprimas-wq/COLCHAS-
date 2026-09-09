---
title: STF Colchas - Lógica Maestra y Reglas Inmutables de Negocio
description: Especificación completa de reglas de trazabilidad, código QR 2 fases, fotos duales, Google Sheets y producción Vercel
---

# STF GROUP - SISTEMA DE CONTROL DE COLCHAS Y CALIDAD TEXTIL
## Memoria Técnica y Reglas Operativas Obligatorias

### 1. Enlaces y Orígenes Oficiales
- **Producción Vercel**: `https://colchas.vercel.app`
- **Repositorio GitHub**: `https://github.com/stfmateriasprimas-wq/COLCHAS-.git` (rama `main`)
- **Google Sheets ID**: `1jTM8OG2u3bO9Cyrlyn3DJSnGcyLOzA8EWwxwOyWgXdc`
- **Pestaña Maestra**: `BASE_DE_DATOS` (17 columnas oficiales)

### 2. Flujo de 5 Etapas (SLA y Trazabilidad)
1. `PRE_SOLICITUD`: Atelier / Corte (Corte de muestra textil).
2. `SOLICITADO`: En Tránsito (Hacia Lavandería ZF).
3. `LAVANDERIA`: Lavandería ZF (Lavado industrial, SLA: 2 días).
4. `CALIDAD`: Calidad Lab (Inspección técnica, tono, SLA: 1 día).
5. `FINALIZADO`: Liberado (Aprobado o Rechazado).

### 3. Código QR y Etiqueta Térmica en 2 Fases
- **Fase 1 (Inicial)**:
  - Generada al crear la OP.
  - El QR **NUNCA debe llevar `localhost`**, siempre resuelve a `https://colchas.vercel.app/?op=...&view=public`.
  - Etiqueta: Marco doble con espacio blanco, título `COLCHAS STF`, `OP/REF`, caja de `TELA`, tabla de 5 filas, QR con logo `STF` centrado, observación inicial del operario.
  - El escaneo móvil abre `PublicOpView.tsx` en tiempo real.
- **Fase 2 (Calidad / Final)**:
  - Mismo código QR actualizado dinámicamente.
  - Lavandería / Calidad registra: Veredicto, Observación Final (columna 14 `OBS.OPERARIO FINAL`) y Foto 2 (Calidad Post-Lavado).
  - Al finalizar, la vista móvil y etiqueta ocultan notas anteriores y muestran solo `OBSERVACIÓN FINAL CALIDAD:` y ambas fotos.

### 4. Trazabilidad Fotográfica Dual y Compatibilidad Móvil Safari
- Columna 12 (`EVIDENCIA (LINK DRIVE)`) contiene `foto1 | foto2`.
- `repairBase64Jpeg`: Repara imágenes Base64 truncadas agregando `\xFF\xD9`.
- `compressImageFile`: Comprime fotos en cliente a max 440px, calidad 0.42, < 18.500 caracteres Base64.
- `SmartPhotoDisplay.tsx`:
  - **SIN `crossOrigin`** (previene bloqueos CORS en Safari 4G/5G).
  - Usa `referrerPolicy="no-referrer"`.
  - Detección de `naturalWidth === 0` para fallback a Google Drive thumbnails (`sz=w1000`).

### 5. Regla de Compilación
- Todo cambio debe pasar `npm run build` sin errores antes de hacer push a `main`.
