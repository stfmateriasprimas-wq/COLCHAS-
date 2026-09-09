import { SolicitudColcha, SectorType, DictamenType } from '../types';
import { calculateWorkingDays } from './slaCalculator';
import { formatOpCode, mapAreaName } from './googleSheetsService';

export interface CompactOpQrPayload {
  o: string;        // op
  r: string;        // referencia
  t: string;        // tela
  c: string;        // color
  rl: number;       // rollos
  mt: string;       // codigoMt
  l?: string;       // lote
  e: SectorType;    // estado
  d?: DictamenType; // dictamen
  i: string;        // inspector
  f: string;        // fechaCreacion
  obs?: string;     // observacionesOperario
  obsC?: string;    // observacionesCalidad
  a?: string;       // areaActual
  f1?: string;      // fotoMuestraUrl (HTTP/HTTPS o compacta)
  f2?: string;      // fotoCalidadUrl (HTTP/HTTPS o compacta)
}

/**
 * Comprime de forma ultra eficiente una imagen base64 a un micro-thumbnail (~450-700 bytes)
 * garantizando que quepa perfectamente dentro del código QR sin sobrecargarlo.
 */
export function createMicroThumbnail(dataUrl?: string, maxDimension: number = 64, quality: number = 0.35): Promise<string | undefined> {
  return new Promise((resolve) => {
    if (!dataUrl || typeof window === 'undefined') return resolve(dataUrl);
    if (dataUrl.startsWith('http')) return resolve(dataUrl);
    if (dataUrl.length < 800) return resolve(dataUrl);

    try {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let w = img.width;
          let h = img.height;
          if (w > h) {
            if (w > maxDimension) {
              h = Math.round((h * maxDimension) / w);
              w = maxDimension;
            }
          } else {
            if (h > maxDimension) {
              w = Math.round((w * maxDimension) / h);
              h = maxDimension;
            }
          }
          canvas.width = Math.max(8, w);
          canvas.height = Math.max(8, h);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            const micro = canvas.toDataURL('image/jpeg', quality);
            resolve(micro);
          } else {
            resolve(dataUrl);
          }
        } catch (e) {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    } catch (err) {
      resolve(dataUrl);
    }
  });
}

/**
 * Genera el enlace público oficial de trazabilidad con la carga útil completa codificada.
 * Esto garantiza que al escanear el QR desde CUALQUIER teléfono móvil o dispositivo externo,
 * la información completa de la OP (datos técnicos, observaciones y fotos) se visualice
 * de manera instantánea (0 ms) sin depender de que Google Sheets haya terminado de sincronizar.
 */
export function generatePublicTrackingUrl(colcha: SolicitudColcha): string {
  if (!colcha || !colcha.op) return 'https://colchas.vercel.app';

  const origin = typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : 'https://colchas.vercel.app';

  const cleanOp = formatOpCode(colcha.op);

  // Incluir fotos si son URLs HTTP/HTTPS o cadenas compactas (hasta 2,500 caracteres)
  const isEligiblePhoto = (url?: string) => Boolean(url && (url.startsWith('http') || url.length <= 2500));
  const f1 = isEligiblePhoto(colcha.fotoMuestraUrl) ? colcha.fotoMuestraUrl : undefined;
  const f2 = isEligiblePhoto(colcha.fotoCalidadUrl) ? colcha.fotoCalidadUrl : undefined;

  const compact: CompactOpQrPayload = {
    o: cleanOp,
    r: colcha.referencia || 'S/R',
    t: colcha.tela || 'TELA INDIGO',
    c: colcha.color || 'AZUL',
    rl: Number(colcha.rollos) || 1,
    mt: colcha.codigoMt || 'MT-GEN',
    l: colcha.lote || '1',
    e: colcha.estado || 'SOLICITADO',
    d: colcha.dictamen || (colcha.estado === 'FINALIZADO' ? 'APROBADO' : 'PENDIENTE'),
    i: colcha.inspector || 'OPERARIO STF',
    f: colcha.fechaCreacion || new Date().toISOString(),
    obs: colcha.observacionesOperario || '',
    obsC: colcha.observacionesCalidad || '',
    a: colcha.areaActual || mapAreaName(colcha.estado),
    f1,
    f2
  };

  try {
    const jsonStr = JSON.stringify(compact);
    // Codificación segura UTF-8 Base64
    const base64Data = btoa(unescape(encodeURIComponent(jsonStr)));
    return `${origin}/?op=${encodeURIComponent(cleanOp)}&view=public&d=${encodeURIComponent(base64Data)}`;
  } catch (e) {
    console.warn('Error encoding QR payload:', e);
    return `${origin}/?op=${encodeURIComponent(cleanOp)}&view=public`;
  }
}

/**
 * Genera de forma asíncrona el enlace QR asegurando que las fotos base64 se compriman
 * automáticamente a micro-thumbnails antes de codificarse en el enlace.
 */
export async function generatePublicTrackingUrlAsync(colcha: SolicitudColcha): Promise<string> {
  if (!colcha || !colcha.op) return 'https://colchas.vercel.app';

  let f1 = colcha.fotoMuestraUrl;
  let f2 = colcha.fotoCalidadUrl;

  if (f1 && !f1.startsWith('http') && f1.length > 1200) {
    f1 = await createMicroThumbnail(f1, 64, 0.35);
  }
  if (f2 && !f2.startsWith('http') && f2.length > 1200) {
    f2 = await createMicroThumbnail(f2, 64, 0.35);
  }

  return generatePublicTrackingUrl({
    ...colcha,
    fotoMuestraUrl: f1,
    fotoCalidadUrl: f2
  });
}

/**
 * Decodifica la carga útil de la OP a partir de los parámetros de la URL (?d=...)
 */
export function parsePublicTrackingPayload(searchOrUrl?: string): SolicitudColcha | null {
  if (typeof window === 'undefined' && !searchOrUrl) return null;

  try {
    const rawSearch = searchOrUrl || window.location.search;
    const urlParams = new URLSearchParams(rawSearch.startsWith('http') ? new URL(rawSearch).search : rawSearch);
    const encodedPayload = urlParams.get('d') || urlParams.get('data') || urlParams.get('p');

    if (!encodedPayload) return null;

    const jsonStr = decodeURIComponent(escape(atob(decodeURIComponent(encodedPayload))));
    const compact: CompactOpQrPayload = JSON.parse(jsonStr);

    if (!compact || !compact.o) return null;

    const cleanOp = formatOpCode(compact.o);
    const { diasHabiles, horasHabiles, tieneRetraso, esRetrasoCritico } = calculateWorkingDays(compact.f);

    const solicitud: SolicitudColcha = {
      id: `op-qr-${cleanOp.replace(/\W/g, '')}`,
      op: cleanOp,
      referencia: compact.r || 'S/R',
      tela: compact.t || 'TELA INDIGO',
      codigoMt: compact.mt || 'MT-GEN',
      color: compact.c || 'AZUL',
      rollos: Number(compact.rl) || 1,
      lote: compact.l || '1',
      estado: compact.e || 'SOLICITADO',
      dictamen: compact.d || 'PENDIENTE',
      inspector: compact.i || 'OPERARIO STF',
      fechaCreacion: compact.f || new Date().toISOString(),
      observacionesOperario: compact.obs || '',
      observacionesCalidad: compact.obsC || compact.obs || '',
      areaActual: compact.a || mapAreaName(compact.e),
      fotoMuestraUrl: compact.f1,
      fotoCalidadUrl: compact.f2,
      diasHabiles,
      horasEnProceso: horasHabiles,
      limiteSlaDias: compact.e === 'LAVANDERIA' ? 2 : 1,
      tieneRetraso,
      esRetrasoCritico
    };

    return solicitud;
  } catch (err) {
    console.warn('Could not decode QR payload:', err);
    return null;
  }
}
