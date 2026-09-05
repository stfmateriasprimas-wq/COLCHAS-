export interface UsuarioSTF {
  id: string;
  nombre: string;
  rol: 'OPERARIO' | 'ADMINISTRADOR' | 'LAVANDERÍA' | 'CLIENTE ELA' | 'CLIENTE SF' | 'CLIENTE OUTLET';
  area: 'CALIDAD' | 'CALIDAD ZF' | 'LAVANDERÍA' | 'COLECCIONES' | 'DESPACHO';
  email: string;
  isZonaFranca?: boolean; // Usuarios de Zona Franca (resaltados en verde que generan en PRE-SOLICITUD)
}

export const USUARIOS_GID = "335635630";

export const USUARIOS_STF_MAESTROS: UsuarioSTF[] = [
  { id: "1111", nombre: "CALIDAD", rol: "OPERARIO", area: "CALIDAD", email: "auditorcalidad2@studiof.com.co", isZonaFranca: false },
  { id: "ediaz", nombre: "EDWIN", rol: "ADMINISTRADOR", area: "CALIDAD", email: "edwin.diaz@studiof.com.co", isZonaFranca: false },
  { id: "3333", nombre: "COLFACTORY", rol: "LAVANDERÍA", area: "LAVANDERÍA", email: "lavanderia1@colfactory.com", isZonaFranca: false },
  { id: "2222", nombre: "CALIDAD ZF (ATELIER)", rol: "OPERARIO", area: "CALIDAD ZF", email: "calidadzf@studiof.com.co", isZonaFranca: true },
  { id: "4321", nombre: "LIBIA LABORATORIO", rol: "ADMINISTRADOR", area: "CALIDAD", email: "laboratorio.textil@studiof.com.co", isZonaFranca: false },
  { id: "4444", nombre: "CAMILA", rol: "CLIENTE ELA", area: "COLECCIONES", email: "maria.zouein@studiof.com.co", isZonaFranca: false },
  { id: "9999", nombre: "JESUS", rol: "CLIENTE SF", area: "COLECCIONES", email: "jesus.salcedo@studiof.com.co", isZonaFranca: false },
  { id: "5555", nombre: "ROBERT", rol: "CLIENTE SF", area: "COLECCIONES", email: "robert.dazad@studiof.com.co", isZonaFranca: false },
  { id: "6666", nombre: "LUISA MEDINA", rol: "CLIENTE ELA", area: "COLECCIONES", email: "luisa.medina@studiof.com.co", isZonaFranca: false },
  { id: "7777", nombre: "VALENTINA", rol: "CLIENTE OUTLET", area: "COLECCIONES", email: "valentina.giraldo@studiof.com.co", isZonaFranca: false },
  { id: "8888", nombre: "PAOLA COLFACTORY", rol: "LAVANDERÍA", area: "LAVANDERÍA", email: "jefe.lavanderia@colfactory.com", isZonaFranca: false },
  { id: "1107529604", nombre: "DIDIER MUÑOZ", rol: "OPERARIO", area: "CALIDAD ZF", email: "didier.munoz@studiof.com.co", isZonaFranca: true },
  { id: "1114392241", nombre: "ANDRES FELIPE TASCON", rol: "OPERARIO", area: "CALIDAD", email: "andres.tascon@studiof.com.co", isZonaFranca: false },
  { id: "1004670524", nombre: "DILAN SOTO", rol: "OPERARIO", area: "CALIDAD", email: "dilan.soto@studiof.com.co", isZonaFranca: false },
  { id: "1010159672", nombre: "JHON EYDER", rol: "OPERARIO", area: "CALIDAD", email: "jhon.eyder@studiof.com.co", isZonaFranca: false },
  { id: "1118309204", nombre: "WILMER MAYA", rol: "OPERARIO", area: "CALIDAD", email: "wilmer.maya@studiof.com.co", isZonaFranca: false },
  { id: "1107047649", nombre: "JUAN DAVID CORTEZ", rol: "OPERARIO", area: "CALIDAD", email: "juan.cortez@studiof.com.co", isZonaFranca: false },
  { id: "1005829307", nombre: "JHON FREDDY GONZÁLEZ", rol: "OPERARIO", area: "CALIDAD", email: "jhon.gonzalez@studiof.com.co", isZonaFranca: false },
  { id: "1006099840", nombre: "SEBASTIAN HERRERA", rol: "OPERARIO", area: "CALIDAD ZF", email: "sebastian.herrera@studiof.com.co", isZonaFranca: true },
  { id: "66997344", nombre: "SANDRA VANEGAS", rol: "LAVANDERÍA", area: "LAVANDERÍA", email: "sandra.vanegas@studiof.com.co", isZonaFranca: false },
  { id: "66826345", nombre: "ANA MILENA GARCIA", rol: "LAVANDERÍA", area: "LAVANDERÍA", email: "milena.garcia@studiof.com.co", isZonaFranca: false },
  { id: "1130643859", nombre: "JHONATAN PINZON", rol: "LAVANDERÍA", area: "LAVANDERÍA", email: "jonhatan.pinzon@studiof.com.co", isZonaFranca: false }
];

export const ADMIN_USER_ID = "ediaz";
export const ADMIN_PASSWORD = "ediaz2026";

/**
 * Determina si el usuario logueado es el Administrador Maestro (EDWIN - ediaz)
 */
export function isAdminUser(user?: UsuarioSTF | null): boolean {
  if (!user) return false;
  const idMatch = user.id.toLowerCase() === ADMIN_USER_ID.toLowerCase();
  const nameMatch = user.nombre.toUpperCase().includes('EDWIN');
  return idMatch || nameMatch;
}

/**
 * Valida la contraseña asignada al perfil de Administrador (ediaz2026)
 */
export function verifyAdminPassword(password: string): boolean {
  return password.trim() === ADMIN_PASSWORD;
}

/**
 * Determina si el usuario logueado pertenece a ZONA FRANCA (Atelier)
 * Los usuarios de Zona Franca generan solicitudes que inician en PRE-SOLICITUD.
 * Los demás usuarios generan solicitudes que inician en SOLICITADO.
 */
export function isUserFromZonaFranca(user?: UsuarioSTF | null): boolean {
  if (!user) return false;
  return Boolean(
    user.isZonaFranca || 
    user.area === 'CALIDAD ZF' || 
    user.nombre.toUpperCase().includes('ZF') || 
    user.nombre.toUpperCase().includes('ATELIER')
  );
}

/**
 * Obtener lista maestra de usuarios con soporte de sincronización
 */
export function getUsuariosList(): UsuarioSTF[] {
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem('stf_cached_usuarios');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        // use default
      }
    }
  }
  return USUARIOS_STF_MAESTROS;
}
