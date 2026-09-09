export interface UsuarioSTF {
  id: string; // Documento / ID de usuario
  nombre: string; // Nombre Completo
  rol: 'OPERARIO' | 'ADMINISTRADOR' | 'LAVANDERÍA' | 'CLIENTE ELA' | 'CLIENTE SF' | 'CLIENTE OUTLET';
  area: 'CALIDAD' | 'CALIDAD ZF' | 'LAVANDERÍA' | 'COLECCIONES' | 'DESPACHO';
  email: string;
  whatsapp?: string; // Número de WhatsApp limpio para enlace wa.me (ej: 573116795548)
  telefono?: string; // Número de teléfono formateado con código país (ej: +57 311 679 5548)
  isZonaFranca?: boolean; // Usuarios de Zona Franca (Atelier)
}

export const SPREADSHEET_ID = "1jTM8OG2u3bO9Cyrlyn3DJSnGcyLOzA8EWwxwOyWgXdc";
export const USUARIOS_GID = "335635630";

export const USUARIOS_STF_MAESTROS: UsuarioSTF[] = [
  { id: "1111", nombre: "CALIDAD", rol: "OPERARIO", area: "CALIDAD", email: "auditorcalidad2@studiof.com.co", isZonaFranca: false, telefono: "+57 315 234 5678", whatsapp: "573152345678" },
  { id: "ediaz", nombre: "EDWIN", rol: "ADMINISTRADOR", area: "CALIDAD", email: "edwin.diaz@studiof.com.co", isZonaFranca: false, telefono: "+57 318 456 7890", whatsapp: "573184567890" },
  { id: "3333", nombre: "COLFACTORY", rol: "LAVANDERÍA", area: "LAVANDERÍA", email: "lavanderia1@colfactory.com", isZonaFranca: false, telefono: "+57 317 890 1234", whatsapp: "573178901234" },
  { id: "2222", nombre: "CALIDAD ZF (ATELIER)", rol: "OPERARIO", area: "CALIDAD ZF", email: "calidadzf@studiof.com.co", isZonaFranca: true, telefono: "+57 312 456 7891", whatsapp: "573124567891" },
  { id: "4321", nombre: "LIBIA LABORATORIO", rol: "ADMINISTRADOR", area: "CALIDAD", email: "laboratorio.textil@studiof.com.co", isZonaFranca: false, telefono: "+57 316 345 6789", whatsapp: "573163456789" },
  { id: "4444", nombre: "CAMILA", rol: "CLIENTE ELA", area: "COLECCIONES", email: "maria.zouein@studiof.com.co", isZonaFranca: false, telefono: "+57 310 567 8902", whatsapp: "573105678902" },
  { id: "9999", nombre: "JESUS", rol: "CLIENTE SF", area: "COLECCIONES", email: "jesus.salcedo@studiof.com.co", isZonaFranca: false, telefono: "+57 312 678 9013", whatsapp: "573126789013" },
  { id: "5555", nombre: "ROBERT", rol: "CLIENTE SF", area: "COLECCIONES", email: "robert.dazad@studiof.com.co", isZonaFranca: false, telefono: "+57 314 789 0124", whatsapp: "573147890124" },
  { id: "6666", nombre: "LUISA MEDINA", rol: "CLIENTE ELA", area: "COLECCIONES", email: "luisa.medina@studiof.com.co", isZonaFranca: false, telefono: "+57 311 890 1235", whatsapp: "573118901235" },
  { id: "7777", nombre: "VALENTINA", rol: "CLIENTE OUTLET", area: "COLECCIONES", email: "valentina.giraldo@studiof.com.co", isZonaFranca: false, telefono: "+57 313 901 2346", whatsapp: "573139012346" },
  { id: "8888", nombre: "PAOLA COLFACTORY", rol: "LAVANDERÍA", area: "LAVANDERÍA", email: "jefe.lavanderia@colfactory.com", isZonaFranca: false, telefono: "+57 319 012 3456", whatsapp: "573190123456" },
  { id: "1107529604", nombre: "DIDIER MUÑOZ", rol: "OPERARIO", area: "CALIDAD ZF", email: "didier.munoz@studiof.com.co", isZonaFranca: true, telefono: "+57 318 123 4567", whatsapp: "573181234567" },
  { id: "1114392241", nombre: "ANDRES FELIPE TASCON", rol: "OPERARIO", area: "CALIDAD", email: "andres.tascon@studiof.com.co", isZonaFranca: false, telefono: "+57 314 567 8902", whatsapp: "573145678902" },
  { id: "1004670524", nombre: "DILAN SOTO", rol: "OPERARIO", area: "CALIDAD", email: "dilan.soto@studiof.com.co", isZonaFranca: false, telefono: "+57 310 678 9013", whatsapp: "573106789013" },
  { id: "1010159672", nombre: "JHON EYDER", rol: "OPERARIO", area: "CALIDAD", email: "jhon.eyder@studiof.com.co", isZonaFranca: false, telefono: "+57 311 789 0124", whatsapp: "573117890124" },
  { id: "1118309204", nombre: "WILMER MAYA", rol: "OPERARIO", area: "CALIDAD", email: "wilmer.maya@studiof.com.co", isZonaFranca: false, telefono: "+57 313 890 1235", whatsapp: "573138901235" },
  { id: "1107047649", nombre: "JUAN DAVID CORTEZ", rol: "OPERARIO", area: "CALIDAD", email: "juan.cortez@studiof.com.co", isZonaFranca: false, telefono: "+57 318 901 2346", whatsapp: "573189012346" },
  { id: "1005829307", nombre: "JHON FREDDY GONZÁLEZ", rol: "OPERARIO", area: "CALIDAD", email: "jhon.gonzalez@studiof.com.co", isZonaFranca: false, telefono: "+57 317 012 3457", whatsapp: "573170123457" },
  { id: "1006099840", nombre: "SEBASTIAN HERRERA", rol: "OPERARIO", area: "CALIDAD ZF", email: "sebastian.herrera@studiof.com.co", isZonaFranca: true, telefono: "+57 315 123 4568", whatsapp: "573151234568" },
  { id: "66997344", nombre: "SANDRA VANEGAS", rol: "LAVANDERÍA", area: "LAVANDERÍA", email: "sandra.vanegas@studiof.com.co", isZonaFranca: false, telefono: "+57 316 234 5679", whatsapp: "573162345679" },
  { id: "66826345", nombre: "ANA MILENA GARCIA", rol: "LAVANDERÍA", area: "LAVANDERÍA", email: "milena.garcia@studiof.com.co", isZonaFranca: false, telefono: "+57 319 345 6780", whatsapp: "573193456780" },
  { id: "1130643859", nombre: "JHONATAN PINZON", rol: "LAVANDERÍA", area: "LAVANDERÍA", email: "jonhatan.pinzon@studiof.com.co", isZonaFranca: false, telefono: "+57 318 456 7891", whatsapp: "573184567891" },
  { id: "1073524622", nombre: "JOSE GUZMAN", rol: "OPERARIO", area: "CALIDAD", email: "joseoneiber711@hotmail.com", isZonaFranca: false, telefono: "+57 311 679 5548", whatsapp: "573116795548" }
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
 */
export function isUserFromZonaFranca(user?: UsuarioSTF | null): boolean {
  if (!user) return false;
  const uid = user.id.trim();
  const uname = user.nombre.toUpperCase();
  const uarea = (user.area || '').toUpperCase();
  return Boolean(
    user.isZonaFranca || 
    uarea === 'CALIDAD ZF' || 
    uarea.includes('ZF') ||
    uarea.includes('ATELIER') ||
    uname.includes('ZF') || 
    uname.includes('ATELIER') ||
    uid === '2222' ||
    uid === '1107529604' ||
    uid === '1006099840'
  );
}

/**
 * Identificadores oficiales de usuarios del área de Lavandería Colfactory ZF
 */
export const LAVANDERIA_USER_IDS = ["3333", "8888", "66997344", "66826345", "1130643859"];

/**
 * Determina si el usuario logueado pertenece a LAVANDERÍA (Colfactory)
 */
export function isLavanderiaUser(user?: UsuarioSTF | null): boolean {
  if (!user) return false;
  const uid = user.id.trim();
  const uname = user.nombre.toUpperCase();
  const uarea = (user.area || '').toUpperCase();
  const urol = (user.rol || '').toUpperCase();

  if (LAVANDERIA_USER_IDS.includes(uid)) return true;
  if (urol === 'LAVANDERÍA' || urol.includes('LAVAND')) return true;
  if (uarea === 'LAVANDERÍA' || uarea.includes('LAVAND') || uarea.includes('COLFACTORY')) return true;
  if (uname.includes('LAVAND') || uname.includes('COLFACTORY')) return true;
  return false;
}

/**
 * Identificadores oficiales de usuarios del área de Calidad
 */
export const CALIDAD_USER_IDS = [
  "1111", "ediaz", "1114392241", "1004670524", "1010159672", 
  "1118309204", "1107047649", "1005829307", "4321", "1073524622"
];

/**
 * Determina si el usuario logueado pertenece a CALIDAD (Laboratorio / Planta)
 */
export function isCalidadUser(user?: UsuarioSTF | null): boolean {
  if (!user) return false;
  const uid = user.id.trim();
  const uname = user.nombre.toUpperCase();
  const uarea = (user.area || '').toUpperCase();
  const urol = (user.rol || '').toUpperCase();

  if (CALIDAD_USER_IDS.includes(uid)) return true;
  if (uarea === 'CALIDAD' || (uarea.includes('CALIDAD') && !uarea.includes('ZF'))) return true;
  if (uname.includes('CALIDAD') && !uname.includes('ZF')) return true;
  if (urol === 'OPERARIO' && uarea === 'CALIDAD') return true;
  return false;
}


/**
 * Formatea y sanitiza un número de WhatsApp a formato internacional de Colombia (+57)
 */
export function formatWhatsAppNumber(rawPhone?: string): { display: string; cleanDigits: string } {
  if (!rawPhone || !rawPhone.trim()) {
    return { display: '', cleanDigits: '' };
  }
  const digits = rawPhone.replace(/\D/g, '');
  if (!digits) {
    return { display: rawPhone.trim(), cleanDigits: '' };
  }
  // Si tiene 10 dígitos (típico celular colombiano empezando en 3)
  if (digits.length === 10 && digits.startsWith('3')) {
    const display = `+57 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    return { display, cleanDigits: `57${digits}` };
  }
  // Si ya tiene el código 57 (12 dígitos)
  if (digits.startsWith('57') && digits.length === 12) {
    const local = digits.slice(2);
    const display = `+57 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
    return { display, cleanDigits: digits };
  }
  return { display: `+${digits}`, cleanDigits: digits };
}

/**
 * Normaliza el rol del usuario a los tipos admitidos por la aplicación
 */
export function normalizeRol(rawRol: string): UsuarioSTF['rol'] {
  const r = (rawRol || '').toUpperCase().trim();
  if (r.includes('ADMIN')) return 'ADMINISTRADOR';
  if (r.includes('LAVAND')) return 'LAVANDERÍA';
  if (r.includes('CLIENTE ELA')) return 'CLIENTE ELA';
  if (r.includes('CLIENTE SF')) return 'CLIENTE SF';
  if (r.includes('CLIENTE OUTLET') || r.includes('OUTLET')) return 'CLIENTE OUTLET';
  return 'OPERARIO';
}

/**
 * Normaliza el área del usuario
 */
export function normalizeArea(rawArea: string, nombre: string): UsuarioSTF['area'] {
  const a = (rawArea || '').toUpperCase().trim();
  const n = (nombre || '').toUpperCase().trim();
  if (a.includes('ZF') || a.includes('ATELIER') || n.includes('ZF') || n.includes('ATELIER')) {
    return 'CALIDAD ZF';
  }
  if (a.includes('LAVAND')) {
    return 'LAVANDERÍA';
  }
  if (a.includes('COLECCION')) {
    return 'COLECCIONES';
  }
  if (a.includes('DESPACH')) {
    return 'DESPACHO';
  }
  return 'CALIDAD';
}

// In-Memory cache and subscribers
let cachedUsuariosList: UsuarioSTF[] = [];
let usuariosSubscribers: ((usuarios: UsuarioSTF[]) => void)[] = [];

/**
 * Suscribirse a cambios en la lista de usuarios
 */
export function subscribeUsuariosList(callback: (usuarios: UsuarioSTF[]) => void): () => void {
  usuariosSubscribers.push(callback);
  callback(getUsuariosList());
  return () => {
    usuariosSubscribers = usuariosSubscribers.filter(cb => cb !== callback);
  };
}

function notifySubscribers() {
  const current = getUsuariosList();
  usuariosSubscribers.forEach(cb => {
    try {
      cb(current);
    } catch (e) {
      console.error('[authService] Error in subscriber callback:', e);
    }
  });
}

/**
 * Helper interno para parsear CSV respetando comillas
 */
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentCell.trim());
      if (currentRow.some(c => c !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(c => c !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Obtener lista maestra de usuarios con soporte de sincronización y caché local
 */
export function getUsuariosList(): UsuarioSTF[] {
  if (cachedUsuariosList.length > 0) {
    return cachedUsuariosList;
  }
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem('stf_cached_usuarios');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          cachedUsuariosList = parsed;
          return parsed;
        }
      } catch (e) {
        // use default
      }
    }
  }
  cachedUsuariosList = USUARIOS_STF_MAESTROS;
  return USUARIOS_STF_MAESTROS;
}

/**
 * Sincronizar en tiempo real los usuarios desde la hoja USUARIOS de Google Sheets
 */
export async function syncUsuariosFromSheets(): Promise<UsuarioSTF[]> {
  try {
    const timestamp = Date.now();
    const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${USUARIOS_GID}&t=${timestamp}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }
    const csvText = await res.text();
    const rows = parseCsvRows(csvText);

    if (rows && rows.length >= 2) {
      const parsedUsers: UsuarioSTF[] = [];
      // Fila 0 es encabezado (DOCUMENTO, NOMBRE COMPLETO, ROL, ÁREA, CORREO ELECTRÓNICO, WHATSAPP)
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row.some(c => c.trim())) continue;

        const doc = (row[0] || '').trim();
        const nombre = (row[1] || '').trim();
        const rolRaw = (row[2] || '').trim();
        const areaRaw = (row[3] || '').trim();
        const email = (row[4] || '').trim();
        const rawWhatsApp = (row[5] || '').trim();

        if (!doc && !nombre) continue;

        const rol = normalizeRol(rolRaw);
        const area = normalizeArea(areaRaw, nombre);
        const isZF = Boolean(area === 'CALIDAD ZF' || nombre.toUpperCase().includes('ZF') || nombre.toUpperCase().includes('ATELIER'));
        const phoneData = formatWhatsAppNumber(rawWhatsApp);

        parsedUsers.push({
          id: doc,
          nombre: nombre,
          rol: rol,
          area: area,
          email: email,
          whatsapp: phoneData.cleanDigits || rawWhatsApp,
          telefono: phoneData.display || rawWhatsApp,
          isZonaFranca: isZF
        });
      }

      if (parsedUsers.length > 0) {
        cachedUsuariosList = parsedUsers;
        if (typeof window !== 'undefined') {
          localStorage.setItem('stf_cached_usuarios', JSON.stringify(parsedUsers));
        }
        notifySubscribers();
        console.log(`[authService] ✓ Sincronizados ${parsedUsers.length} usuarios en tiempo real desde Google Sheets (pestaña USUARIOS).`);
        return parsedUsers;
      }
    }
  } catch (err) {
    console.warn('[authService] Error sincronizando usuarios de Google Sheets, usando caché local:', err);
  }
  return getUsuariosList();
}


/**
 * Busca un usuario por ID / documento / nombre insensible a mayúsculas
 */
export function findUserByIdOrDocOrName(query: string): UsuarioSTF | undefined {
  if (!query || !query.trim()) return undefined;
  const list = getUsuariosList();
  const q = query.trim().toLowerCase();
  return list.find(u => 
    u.id.toLowerCase() === q ||
    u.nombre.toLowerCase() === q ||
    u.nombre.toLowerCase().includes(q)
  );
}
