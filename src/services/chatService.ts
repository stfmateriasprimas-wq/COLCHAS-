import { ChatMessage } from '../types';
import { USUARIOS_STF_MAESTROS, UsuarioSTF } from './authService';
import { notificationService } from './notificationService';
import { db } from './firebaseConfig';
import { collection, onSnapshot, query, orderBy, limit, addDoc, doc, updateDoc } from 'firebase/firestore';

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

// Chats 100% limpios desde cero tal cual WhatsApp
const INITIAL_CHAT_MESSAGES: ChatMessage[] = [];
const STORAGE_KEY = 'stf_colchas_chat_messages_v7_clean';
const READ_IDS_KEY = 'stf_colchas_read_ids_v7';

class ChatService {
  private messages: ChatMessage[] = [];
  private localReadIds: Set<string> = new Set<string>();
  private listeners: Array<() => void> = [];
  private broadcastChannel: BroadcastChannel | null = null;
  private isInitialized = false;
  private activeUserId: string = '1111';
  // Marca de tiempo al iniciar la sesión: NUNCA notificar mensajes creados antes de este momento
  private appStartTime = Date.now();

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

      // Conexión a Firebase Firestore en tiempo real
      this.initFirestoreSync();
    }
  }

  public setActiveUserId(userId: string): void {
    if (userId) {
      if (this.activeUserId !== userId) {
        // Al cambiar de perfil de usuario, actualizar marca de tiempo para evitar falsas alertas de mensajes pasados
        this.appStartTime = Date.now();
      }
      this.activeUserId = userId;
    }
  }

  private async initFirestoreSync(): Promise<void> {
    try {
      const msgsRef = collection(db, 'stf_teams_messages');
      const q = query(msgsRef, orderBy('createdMillis', 'asc'), limit(500));

      onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
          this.messages = [];
          this.isInitialized = true;
          this.saveToStorage(false);
          this.notifyListeners();
          return;
        }

        const remoteMessages: ChatMessage[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          const isLocallyRead = this.localReadIds.has(docSnap.id);
          remoteMessages.push({
            id: docSnap.id,
            canalId: d.canalId || undefined,
            destinatarioId: d.destinatarioId || undefined,
            remitente: d.remitente || 'USUARIO',
            remitenteId: d.remitenteId || '',
            area: d.area || '',
            mensaje: d.mensaje || '',
            opRelacionada: d.opRelacionada || undefined,
            archivoUrl: d.archivoUrl || undefined,
            archivoNombre: d.archivoNombre || undefined,
            archivoTipo: d.archivoTipo || undefined,
            audioUrl: d.audioUrl || undefined,
            audioDuracion: d.audioDuracion || undefined,
            tipo: d.tipo || 'texto',
            timestamp: d.timestamp || 'Ahora',
            fecha: d.fecha || 'Hoy',
            leido: Boolean(d.leido) || isLocallyRead,
            createdMillis: d.createdMillis || Date.now()
          });
        });

        // Notificar ÚNICAMENTE mensajes NUEVOS recibidos en tiempo real después de entrar a la app (estilo WhatsApp)
        if (this.isInitialized) {
          const currentIds = new Set(this.messages.map(m => m.id));
          const newArrivals = remoteMessages.filter(m => !currentIds.has(m.id));

          newArrivals.forEach(msg => {
            const currentClean = (this.activeUserId || '').trim().toLowerCase();
            const senderClean = (msg.remitenteId || '').trim().toLowerCase();
            const recipientClean = (msg.destinatarioId || '').trim().toLowerCase();

            // Condición estricta: mensaje genuino en vivo (creado en la sesión activa, no del pasado)
            const isLiveTime = (msg.createdMillis || 0) >= (this.appStartTime - 10000);

            // Solo alertar si el mensaje fue enviado por otra persona hacia mi canal o a mi directo
            if (senderClean && senderClean !== currentClean && isLiveTime) {
              const isForMe = Boolean(msg.canalId) || (recipientClean === currentClean);
              if (isForMe) {
                const roomLabel = msg.canalId ? `#${msg.canalId}` : `Mensaje de ${msg.remitente}`;
                notificationService.sendChatNotification(
                  msg.remitente,
                  msg.mensaje || (msg.tipo === 'audio' ? '🎤 Nota de voz' : '📎 Archivo adjunto'),
                  roomLabel
                );
              }
            }
          });
        }

        this.messages = remoteMessages;
        this.isInitialized = true;
        this.saveToStorage(false);
        this.notifyListeners();
      }, (err) => {
        console.warn("Firestore onSnapshot error:", err);
      });
    } catch (err) {
      console.warn("Firestore sync init failed:", err);
    }
  }

  private loadInitialMessages() {
    if (typeof window === 'undefined') {
      this.messages = [];
      return;
    }

    try {
      localStorage.removeItem('stf_colchas_chat_messages_v4');
      localStorage.removeItem('stf_colchas_chat_messages_v5');
      localStorage.removeItem('stf_colchas_chat_messages_v6');
      localStorage.removeItem('stf_colchas_chat_messages_v6_clean');
      localStorage.removeItem('stf_colchas_chat_messages');
      localStorage.removeItem('stf_colchas_read_ids_v5');
      localStorage.removeItem('stf_colchas_read_ids_v6');
    } catch (e) {}

    try {
      const savedReadIds = localStorage.getItem(READ_IDS_KEY);
      if (savedReadIds) {
        const parsed = JSON.parse(savedReadIds);
        if (Array.isArray(parsed)) {
          this.localReadIds = new Set(parsed);
        }
      }
    } catch (e) {}

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          this.messages = parsed;
          return;
        }
      } catch (e) {
        console.warn("Could not parse saved chat messages:", e);
      }
    }

    this.messages = [];
    this.saveToStorage(false);
  }

  private saveReadIdsToStorage() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(READ_IDS_KEY, JSON.stringify(Array.from(this.localReadIds)));
    } catch (e) {}
  }

  private saveToStorage(broadcast: boolean = true) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.messages));
      if (broadcast && this.broadcastChannel) {
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
    const cleanCurrent = (currentUserId || '').trim().toLowerCase();

    if (!isDirect) {
      // Es un canal de grupo (todos los usuarios ven el canal)
      filtered = this.messages.filter(m => m.canalId === roomId);
    } else {
      // En Directos NADA MÁS las dos personas involucradas pueden ver la conversación
      const cleanContact = (roomId || '').trim().toLowerCase();
      filtered = this.messages.filter(m => {
        if (m.canalId) return false;
        const sender = (m.remitenteId || '').trim().toLowerCase();
        const recipient = (m.destinatarioId || '').trim().toLowerCase();

        // Mensajes que envié a este contacto
        const sentByMe = sender === cleanCurrent && recipient === cleanContact;
        // Mensajes que este contacto me envió a mí
        const sentToMe = sender === cleanContact && recipient === cleanCurrent;
        // Notas personales (auto-chat)
        const isSelf = cleanCurrent === cleanContact && sender === cleanContact;

        return sentByMe || sentToMe || isSelf;
      });
    }

    if (filterOnlyOps) {
      filtered = filtered.filter(m => Boolean(m.opRelacionada || m.tipo === 'op'));
    }

    return filtered;
  }

  /**
   * Envía un mensaje en tiempo real con sonido, push nativo y persistencia en Firestore
   */
  public async sendMessage(
    msg: Omit<ChatMessage, 'id' | 'timestamp' | 'fecha'> & { timestamp?: string; fecha?: string }
  ): Promise<ChatMessage> {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = 'Hoy';
    const createdMillis = Date.now();

    const localId = `msg-${createdMillis}-${Math.random().toString(36).substr(2, 5)}`;
    const newMsg: ChatMessage = {
      ...msg,
      id: localId,
      timestamp: msg.timestamp || timeStr,
      fecha: msg.fecha || dateStr,
      leido: false,
      createdMillis
    };

    // Registrar inmediatamente como leído por mí mismo
    this.localReadIds.add(localId);
    this.saveReadIdsToStorage();

    // Actualización optimista local inmediata (0ms de latencia para el usuario)
    this.messages.push(newMsg);
    this.saveToStorage(true);
    this.notifyListeners();

    // Persistir en Firebase Firestore en segundo plano para distribución a todos los dispositivos
    try {
      const msgsRef = collection(db, 'stf_teams_messages');
      await addDoc(msgsRef, {
        canalId: newMsg.canalId || null,
        destinatarioId: newMsg.destinatarioId || null,
        remitente: newMsg.remitente,
        remitenteId: newMsg.remitenteId || '',
        area: newMsg.area || '',
        mensaje: newMsg.mensaje || '',
        opRelacionada: newMsg.opRelacionada || null,
        archivoUrl: newMsg.archivoUrl || null,
        archivoNombre: newMsg.archivoNombre || null,
        archivoTipo: newMsg.archivoTipo || null,
        audioUrl: newMsg.audioUrl || null,
        audioDuracion: newMsg.audioDuracion || null,
        tipo: newMsg.tipo || 'texto',
        timestamp: newMsg.timestamp,
        fecha: newMsg.fecha,
        leido: false,
        createdMillis
      });
    } catch (e) {
      console.warn("Error guardando mensaje en Firestore:", e);
    }

    return newMsg;
  }

  /**
   * Marcar mensajes de una sala como leídos
   */
  public markAsRead(roomId: string, isDirect: boolean, currentUserId: string): void {
    const cleanCurrent = (currentUserId || '').trim().toLowerCase();
    let changed = false;
    const directDocIdsToUpdate: string[] = [];

    this.messages = this.messages.map(m => {
      if (!isDirect && m.canalId === roomId) {
        if (!m.leido || !this.localReadIds.has(m.id)) {
          changed = true;
          this.localReadIds.add(m.id);
        }
        return { ...m, leido: true };
      }
      if (isDirect && !m.canalId) {
        const sender = (m.remitenteId || '').trim().toLowerCase();
        const recipient = (m.destinatarioId || '').trim().toLowerCase();
        const contact = (roomId || '').trim().toLowerCase();
        if (sender === contact && recipient === cleanCurrent) {
          if (!m.leido || !this.localReadIds.has(m.id)) {
            changed = true;
            this.localReadIds.add(m.id);
            if (!m.id.startsWith('msg-')) {
              directDocIdsToUpdate.push(m.id);
            }
          }
          return { ...m, leido: true };
        }
      }
      return m;
    });

    if (changed) {
      this.saveReadIdsToStorage();
      this.saveToStorage(true);
      this.notifyListeners();

      // Sincronizar lectura en Firestore para mensajes directos
      if (directDocIdsToUpdate.length > 0) {
        directDocIdsToUpdate.forEach(docId => {
          try {
            updateDoc(doc(db, 'stf_teams_messages', docId), { leido: true }).catch(() => {});
          } catch (e) {
            // ignore
          }
        });
      }
    }
  }

  /**
   * Obtiene la cantidad de mensajes no leídos para una sala o contacto específico
   */
  public getRoomUnreadCount(roomId: string, isDirect: boolean, currentUserId: string): number {
    const cleanCurrent = (currentUserId || '').trim().toLowerCase();
    if (!isDirect) {
      return this.messages.filter(m => 
        m.canalId === roomId && 
        !m.leido && 
        (m.remitenteId || '').trim().toLowerCase() !== cleanCurrent
      ).length;
    } else {
      const cleanContact = (roomId || '').trim().toLowerCase();
      return this.messages.filter(m => 
        !m.canalId && 
        (m.remitenteId || '').trim().toLowerCase() === cleanContact && 
        (m.destinatarioId || '').trim().toLowerCase() === cleanCurrent && 
        !m.leido
      ).length;
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
    const cleanCurrent = (currentUserId || '').trim().toLowerCase();
    return this.messages.filter(m => {
      if (m.leido) return false;
      const sender = (m.remitenteId || '').trim().toLowerCase();
      if (sender === cleanCurrent) return false;
      if (m.canalId) return true;
      const recipient = (m.destinatarioId || '').trim().toLowerCase();
      if (recipient === cleanCurrent) return true;
      return false;
    }).length;
  }

  /**
   * Obtiene no leídos en canales grupales
   */
  public getChannelsUnreadCount(currentUserId: string): number {
    const cleanCurrent = (currentUserId || '').trim().toLowerCase();
    return this.messages.filter(m => 
      Boolean(m.canalId) && 
      !m.leido && 
      (m.remitenteId || '').trim().toLowerCase() !== cleanCurrent
    ).length;
  }

  /**
   * REQUERIMIENTO 1 y 2: Obtiene no leídos en directos que otros me enviaron a mí
   */
  public getDirectsUnreadCount(currentUserId: string): number {
    const cleanCurrent = (currentUserId || '').trim().toLowerCase();
    return this.messages.filter(m => 
      Boolean(m.destinatarioId) && 
      !m.leido && 
      (m.destinatarioId || '').trim().toLowerCase() === cleanCurrent
    ).length;
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
    const cleanCurrent = (currentUserId || '').trim().toLowerCase();
    return USUARIOS_STF_MAESTROS.filter(u => u.id.toLowerCase() !== cleanCurrent);
  }
}

export const chatService = new ChatService();
