import { createClient, SupabaseClient } from '@supabase/supabase-js';

// URL y Clave obtenidas de Supabase Studio
const DEFAULT_SUPABASE_URL = "https://cenwnunlrbctwsdycwdf.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_1u4Nwh9q-IMH00o-IKZdXQ_zbK8bspq";

// Sanitización de URL (eliminar /rest/v1/ o slashes finales si existen)
function sanitizeSupabaseUrl(url?: string): string {
  if (!url) return '';
  return url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
}

const metaEnv = (import.meta as any)?.env || {};
const rawUrl = (metaEnv.VITE_SUPABASE_URL as string) || DEFAULT_SUPABASE_URL;
const rawKey = (metaEnv.VITE_SUPABASE_ANON_KEY as string) || DEFAULT_SUPABASE_ANON_KEY;

export const SUPABASE_URL = sanitizeSupabaseUrl(rawUrl);
export const SUPABASE_ANON_KEY = rawKey.trim();

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.startsWith('http'));
}

// Inicialización segura del cliente Supabase (sin bloquear nunca la app)
let clientInstance: SupabaseClient | null = null;

try {
  if (isSupabaseConfigured()) {
    clientInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
} catch (err) {
  console.warn('[SupabaseClient] Error inicializando cliente de Supabase:', err);
  clientInstance = null;
}

export const supabase = clientInstance;
export default supabase;
