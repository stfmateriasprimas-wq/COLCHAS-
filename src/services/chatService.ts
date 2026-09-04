import { ChatMessage } from '../types';
import { USUARIOS_STF_MAESTROS, UsuarioSTF } from './authService';
import { notificationService } from './notificationService';

export interface ChatChannel {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: 'General' | 'Directo';
  icono: string;
  color: string;
}

export const CHAT_CHANNELS_MAESTROS: ChatChannel[] = [
  {
    id: 'general',
    nombre: '#general',
    descripcion: 'Canal principal para todo el equipo STF GROUP',
    categoria: 'General',
    icono: 'MessageSquare',
    color: 'purple'
  },
  {
    id: 'laboratorio-calidad',
    nombre: '#laboratorio-calidad',
    descripcion: 'Coordinación de muestras, telas y pruebas de calidad',
    categoria: 'General',
    icono: 'FlaskConical',
    color: 'indigo'
  },
  {
    id: 'lavanderia-colfactory',
    nombre: '#lavanderia-colfactory',
    descripcion: 'Procesamiento de lavandería, ciclos y despacho Colfactory',
    categoria: 'General',
    icono: 'Droplets',
    color: 'amber'
  },
  {
    id: 'colecciones-sf-ela',
    nombre: '#colecciones-sf-ela',
    descripcion: 'Aprobaciones de tono, muestras de clientes Studio F y ELA',
    categoria: 'General',
    icono: 'Sparkles',
    color: 'blue'
  },
  {
    id: 'alertas-ops',
    nombre: '#alertas-ops',
    descripcion: 'Notificaciones automáticas y desviaciones de OPs',
    categoria: 'General',
    icono: 'Bell',
    color: 'rose'
  },
  {
    id: 'soporte-tecnico',
    nombre: '#soporte-tecnico',
    descripcion: 'Asistencia para usuarios, escáner QR y parámetros de sistema',
    categoria: 'General',
    icono: 'Wrench',
    color: 'slate'
  }
];

const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  // #general
  {
    id: 'gen-1',
    canalId: 'general',
    remitente: 'JUAN DAVID CORTEZ',
    remitenteId: '1107047649',
    area: 'CALIDAD ZF / ATELIER',
    mensaje: 'Se generó colcha para OP-00095976 (Tencel Malvina). Muestra cortada y lista para despacho hacia Lavandería.',
    opRelacionada: 'OP-00095976',
    timestamp: '08:30 a. m.',
    fecha: 'Hoy',
    tipo: 'movimiento',
    leido: true
  },
  {
    id: 'gen-2',
    canalId: 'general',
    remitente: 'DIDIER MUÑOZ',
    remitenteId: '1107529604',
    area: 'LAVANDERÍA COLFACTORY',
    mensaje: 'Recibida en planta OP-00095544. Iniciando proceso químico de desengomado y prueba de encogimiento.',
    opRelacionada: 'OP-00095544',
    timestamp: '09:15 a. m.',
    fecha: 'Hoy',
    tipo: 'texto',
    leido: true
  },
  {
    id: 'gen-3',
    canalId: 'general',
    remitente: 'JHON FREDDY GONZÁLEZ',
    remitenteId: '1005829307',
    area: 'CALIDAD STF LABORATORIO',
    mensaje: 'Resultados de encogimiento para OP-00094060: Trama -4.0%, Urdimbre -6.0%. Dictamen: APROBADO 100%.',
    opRelacionada: 'OP-00094060',
    timestamp: '10:45 a. m.',
    fecha: 'Hoy',
    tipo: 'texto',
    leido: true
  },

  // #laboratorio-calidad
  {
    id: 'lab-1',
    canalId: 'laboratorio-calidad',
    remitente: 'LIBIA LABORATORIO',
    remitenteId: '4321',
    area: 'CALIDAD',
    mensaje: 'Por favor remitir muestras de prueba de encogimiento para lote denim 80004.',
    opRelacionada: 'OP-00095976',
    timestamp: '07:45 a. m.',
    fecha: 'Hoy',
    tipo: 'texto',
    leido: true
  },

  // #alertas-ops
  {
    id: 'alert-1',
    canalId: 'alertas-ops',
    remitente: 'SISTEMA DE TRAZABILIDAD',
    remitenteId: 'system',
    area: 'CALIDAD ZF',
    mensaje: 'ALERTA: OP-00095976 requiere validación urgente de tono en laboratorio.',
    opRelacionada: 'OP-00095976',
    timestamp: '09:30 a. m.',
    fecha: 'Hoy',
    tipo: 'alerta',
    leido: false
  },

  // Direct conversation with LUISA MEDINA
  {
    id: 'dm-luisa-1',
    remitente: 'LUISA MEDINA',
    remitenteId: '6666',
    destinatarioId: '1111', // to Calidad
    area: 'COLECCIONES',
    mensaje: 'Nota de voz (0:08 seg)',
    audioUrl: 'synth://voice-note-sample',
    audioDuracion: 8,
    timestamp: '07:30 a. m.',
    fecha: '14 de agosto',
    tipo: 'audio',
    leido: true
  },

  // Direct conversations between CALIDAD and EDWIN (Exact match to screenshot media_1788448324509.png)
  {
    id: 'dm-calidad-edwin-1',
    remitente: 'EDWIN',
    remitenteId: 'ediaz',
    destinatarioId: '1111', // to Calidad
    area: 'CALIDAD',
    mensaje: 'Buenos dias don edwin',
    timestamp: '09:50 a. m.',
    fecha: '14 de agosto',
    tipo: 'texto',
    leido: true
  },
  {
    id: 'dm-calidad-edwin-2',
    remitente: 'CALIDAD',
    remitenteId: '1111',
    destinatarioId: 'ediaz', // to Edwin
    area: 'CALIDAD',
    mensaje: 'buenos dias don edwin',
    timestamp: '10:08 a. m.',
    fecha: '14 de agosto',
    tipo: 'texto',
    leido: true
  },
  {
    id: 'dm-calidad-edwin-3',
    remitente: 'CALIDAD',
    remitenteId: '1111',
    destinatarioId: 'ediaz', // to Edwin
    area: 'CALIDAD',
    mensaje: 'requiere algo de calidad?',
    timestamp: '10:08 a. m.',
    fecha: '14 de agosto',
    tipo: 'texto',
    leido: true
  },
  {
    id: 'dm-calidad-edwin-4',
    remitente: 'EDWIN',
    remitenteId: 'ediaz',
    destinatarioId: '1111', // to Calidad
    area: 'CALIDAD',
    mensaje: 'Buenos dias calidad, si',
    timestamp: '10:09 a. m.',
    fecha: '14 de agosto',
    tipo: 'texto',
    leido: true
  },
  {
    id: 'dm-calidad-edwin-5',
    remitente: 'EDWIN',
    remitenteId: 'ediaz',
    destinatarioId: '1111', // to Calidad
    area: 'CALIDAD',
    mensaje: 'por favor requiero información acerca de esta OP',
    opRelacionada: 'OP-00092979',
    timestamp: '10:09 a. m.',
    fecha: '14 de agosto',
    tipo: 'op',
    leido: true
  },

  {
    id: 'dm-calidad-camila-1',
    remitente: 'CAMILA',
    remitenteId: '4444',
    destinatarioId: '1111', // to Calidad
    area: 'COLECCIONES',
    mensaje: 'buenos dias',
    timestamp: '09:06 a. m.',
    fecha: 'Hoy',
    tipo: 'texto',
    leido: false
  },
  {
    id: 'dm-calidad-libia-1',
    remitente: 'LIBIA LABORATORIO',
    remitenteId: '4321',
    destinatarioId: '1111', // to Calidad
    area: 'CALIDAD',
    mensaje: 'Por favor remitir muestras de prueba de encogimiento...',
    timestamp: '07:45 a. m.',
    fecha: 'Hoy',
    tipo: 'texto',
    leido: false
  },

  // Direct conversations when logged in as CAMILA
  {
    id: 'dm-camila-calidad-1',
    remitente: 'CALIDAD',
    remitenteId: '1111',
    destinatarioId: '4444', // to Camila
    area: 'CALIDAD',
    mensaje: 'buenos dias',
    timestamp: '09:06 a. m.',
    fecha: 'Hoy',
    tipo: 'texto',
    leido: false
  },
  {
    id: 'dm-camila-edwin-1',
    remitente: 'EDWIN',
    remitenteId: 'ediaz',
    destinatarioId: '4444', // to Camila
    area: 'CALIDAD',
    mensaje: 'buenos dias calidad',
    timestamp: '09:23 a. m.',
    fecha: 'Hoy',
    tipo: 'texto',
    leido: false
  }
];

const STORAGE_KEY = 'stf_colchas_chat_messages_v4';

class ChatService {
  private messages: ChatMessage[] = [];
  private listeners: Array<() => void> = [];
  private broadcastChannel: BroadcastChannel | null = null;

  constructor() {
    this.loadInitialMessages();

    // Cross-tab synchronization
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY && e.newValue) {
          try {
            this.messages = JSON.parse(e.newValue);
            this.notifyListeners();
          } catch (err) {
            console.warn("Error parsing cross-tab chat update:", err);
          }
        }
      });

      if ('BroadcastChannel' in window) {
        try {
          this.broadcastChannel = new BroadcastChannel('stf_teams_chat_channel');
          this.broadcastChannel.onmessage = (event) => {
            if (event.data && event.data.type === 'NEW_MESSAGE') {
              this.loadFromStorage();
              this.notifyListeners();
            }
          };
        } catch (e) {
          // ignore
        }
      }
    }
  }

  private loadInitialMessages() {
    if (typeof window === 'undefined') {
      this.messages = INITIAL_CHAT_MESSAGES;
      return;
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.messages = parsed;
          return;
        }
      } catch (e) {
        console.warn("Could not parse saved chat messages:", e);
      }
    }

    this.messages = INITIAL_CHAT_MESSAGES;
    this.saveToStorage();
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.messages));
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({ type: 'NEW_MESSAGE' });
      }
    } catch (e) {
      console.warn("Error saving chat messages to storage:", e);
    }
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        this.messages = JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
  }

  private notifyListeners() {
    this.listeners.forEach(fn => fn());
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  /**
   * REQUERIMIENTO 2: En Directos solo las personas que se hablen entre sí pueden ver sus mensajes.
   */
  public getRoomMessages(
    roomId: string,
    isDirect: boolean,
    currentUserId: string,
    filterOnlyOps: boolean = false
  ): ChatMessage[] {
    let filtered: ChatMessage[] = [];

    if (!isDirect) {
      // Es un canal de grupo (todos los usuarios ven el canal)
      filtered = this.messages.filter(m => m.canalId === roomId);
    } else {
      // REQUERIMIENTO 2: En Directos nada más las dos personas involucradas pueden ver la conversación
      const contactId = roomId;
      filtered = this.messages.filter(m => {
        if (m.canalId) return false;
        // Mensajes que envié a este contacto
        const sentByMe = m.remitenteId === currentUserId && m.destinatarioId === contactId;
        // Mensajes que este contacto me envió a mí
        const sentToMe = m.remitenteId === contactId && m.destinatarioId === currentUserId;
        // Notas personales (auto-chat)
        const isSelf = currentUserId === contactId && m.remitenteId === contactId;

        return sentByMe || sentToMe || isSelf;
      });
    }

    if (filterOnlyOps) {
      filtered = filtered.filter(m => Boolean(m.opRelacionada || m.tipo === 'op'));
    }

    return filtered;
  }

  /**
   * Envía un mensaje en tiempo real con sonido y push
   */
  public sendMessage(
    msg: Omit<ChatMessage, 'id' | 'timestamp' | 'fecha'> & { timestamp?: string; fecha?: string }
  ): ChatMessage {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = 'Hoy';

    const newMsg: ChatMessage = {
      ...msg,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: msg.timestamp || timeStr,
      fecha: msg.fecha || dateStr,
      leido: false
    };

    this.messages.push(newMsg);
    this.saveToStorage();
    this.notifyListeners();

    // Notificación sonora y push para destinatario si está en otra ventana o móvil
    notificationService.sendChatNotification(
      newMsg.remitente,
      newMsg.mensaje || (newMsg.tipo === 'audio' ? '🎤 Nota de voz' : '📎 Archivo adjunto'),
      newMsg.canalId ? `#${newMsg.canalId}` : undefined
    );

    return newMsg;
  }

  /**
   * Marcar mensajes de una sala como leídos
   */
  public markAsRead(roomId: string, isDirect: boolean, currentUserId: string): void {
    let changed = false;
    this.messages = this.messages.map(m => {
      if (!isDirect && m.canalId === roomId && !m.leido) {
        changed = true;
        return { ...m, leido: true };
      }
      if (isDirect && m.remitenteId === roomId && m.destinatarioId === currentUserId && !m.leido) {
        changed = true;
        return { ...m, leido: true };
      }
      return m;
    });

    if (changed) {
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  /**
   * Obtiene la cantidad de mensajes no leídos para una sala o contacto específico (REQUERIMIENTO 1 y 2)
   */
  public getRoomUnreadCount(roomId: string, isDirect: boolean, currentUserId: string): number {
    if (!isDirect) {
      return this.messages.filter(m => m.canalId === roomId && !m.leido && m.remitenteId !== currentUserId).length;
    } else {
      const contactId = roomId;
      return this.messages.filter(m => m.remitenteId === contactId && m.destinatarioId === currentUserId && !m.leido).length;
    }
  }

  /**
   * Obtiene el último mensaje registrado para una sala o contacto privado
   */
  public getRoomLastMessage(roomId: string, isDirect: boolean, currentUserId: string): { text: string; timestamp: string; unreadCount: number } | null {
    const roomMsgs = this.getRoomMessages(roomId, isDirect, currentUserId);
    const unreadCount = this.getRoomUnreadCount(roomId, isDirect, currentUserId);

    if (roomMsgs.length === 0) {
      return null;
    }

    const last = roomMsgs[roomMsgs.length - 1];
    let text = last.mensaje;
    if (last.tipo === 'audio') text = '🎤 Nota de voz';
    else if (last.tipo === 'archivo') text = `📎 ${last.archivoNombre || 'Archivo'}`;
    else if (last.tipo === 'op') text = `🏷️ ${last.opRelacionada || 'OP'}`;

    return {
      text,
      timestamp: last.timestamp,
      unreadCount
    };
  }

  /**
   * REQUERIMIENTO 1: Obtiene cantidad total de mensajes no leídos para mi usuario (canales + directos a mí)
   */
  public getUnreadCount(currentUserId: string): number {
    return this.messages.filter(m => {
      if (m.leido) return false;
      if (m.remitenteId === currentUserId) return false;
      if (m.canalId) return true;
      if (m.destinatarioId === currentUserId) return true;
      return false;
    }).length;
  }

  /**
   * Obtiene no leídos en canales grupales
   */
  public getChannelsUnreadCount(currentUserId: string): number {
    return this.messages.filter(m => Boolean(m.canalId) && !m.leido && m.remitenteId !== currentUserId).length;
  }

  /**
   * REQUERIMIENTO 1 y 2: Obtiene no leídos en directos que otros me enviaron a mí
   */
  public getDirectsUnreadCount(currentUserId: string): number {
    return this.messages.filter(m => Boolean(m.destinatarioId) && !m.leido && m.destinatarioId === currentUserId).length;
  }

  /**
   * Obtiene la lista completa de canales oficiales
   */
  public getChannels(): ChatChannel[] {
    return CHAT_CHANNELS_MAESTROS;
  }

  /**
   * Obtiene la lista de usuarios para directos
   */
  public getDirectUsers(currentUserId: string): UsuarioSTF[] {
    return USUARIOS_STF_MAESTROS.filter(u => u.id !== currentUserId);
  }
}

export const chatService = new ChatService();
