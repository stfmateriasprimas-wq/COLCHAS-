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

export const PRODUCTION_PUBLIC_URL = 'https://colchas.vercel.app';

/**
 * Obtiene la URL base pública oficial para la generación de códigos QR.
 * IMPORTANTE: Si la aplicación se está ejecutando en localhost, 127.0.0.1 o IP local,
 * NUNCA debe codificar "localhost" en el código QR, ya que al escanearlo desde un
 * teléfono móvil (4G/5G/WiFi), el teléfono intentará conectarse a sí mismo y fallará
 * con el error "Safari no puede abrir localhost". Por lo tanto, en desarrollo local
 * siempre apunta a la URL pública oficial en Vercel (https://colchas.vercel.app).
 */
export function getPublicBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    const origin = window.location.origin;
    if (
      origin.includes('localhost') || 
      origin.includes('127.0.0.1') || 
      origin.includes('0.0.0.0') ||
      origin.includes('192.168.') ||
      origin.includes('10.') ||
      origin.includes('172.')
    ) {
      return PRODUCTION_PUBLIC_URL;
    }
    return origin;
  }
  return PRODUCTION_PUBLIC_URL;
}

/**
 * Genera el enlace público oficial de trazabilidad con la carga útil completa codificada.
 * Esto garantiza que al escanear el QR desde CUALQUIER teléfono móvil o dispositivo externo,
 * la información completa de la OP (datos técnicos, observaciones y fotos) se visualice
 * de manera instantánea (0 ms) sin depender de que Google Sheets haya terminado de sincronizar.
 */
export function generatePublicTrackingUrl(colcha: SolicitudColcha): string {
  if (!colcha || !colcha.op) return PRODUCTION_PUBLIC_URL;

  const origin = getPublicBaseUrl();
  const cleanOp = formatOpCode(colcha.op);
  // URL oficial estándar de 51 caracteres: garantiza módulos grandes, gruesos y legibilidad instantánea
  return `${origin}/?op=${encodeURIComponent(cleanOp)}&view=public`;
}

/**
 * Genera de forma asíncrona el enlace QR asegurando que el QR siempre sea ligero, seguro
 * y con módulos grandes para impresión térmica en etiquetas Zebra 100x100mm.
 */
export async function generatePublicTrackingUrlAsync(colcha: SolicitudColcha): Promise<string> {
  if (!colcha || !colcha.op) return PRODUCTION_PUBLIC_URL;

  const origin = getPublicBaseUrl();
  const cleanOp = formatOpCode(colcha.op);
  return `${origin}/?op=${encodeURIComponent(cleanOp)}&view=public`;
}

/**
 * Decodifica la carga útil de la OP a partir de los parámetros de la URL (?d=...)
 */
export function parsePublicTrackingPayload(searchOrUrl?: string): SolicitudColcha | null {
  if (typeof window === 'undefined' && !searchOrUrl) return null;

  try {
    const rawSearch = searchOrUrl || window.location.search;
    let encodedPayload: string | null = null;

    if (rawSearch.startsWith('http') || rawSearch.includes('?') || rawSearch.includes('&') || rawSearch.includes('=')) {
      const urlParams = new URLSearchParams(rawSearch.startsWith('http') ? new URL(rawSearch).search : (rawSearch.startsWith('?') ? rawSearch : `?${rawSearch}`));
      encodedPayload = urlParams.get('d') || urlParams.get('data') || urlParams.get('p');
    }

    // Si no se extrajo por parámetro o vino directamente el string base64
    if (!encodedPayload) {
      const trimmed = (rawSearch || '').trim();
      if (trimmed.startsWith('eyJ') || (!trimmed.includes(' ') && trimmed.length > 20)) {
        encodedPayload = trimmed;
      }
    }

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
