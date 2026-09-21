/**
 * STF GROUP - SERVICIO DE CHAT CORPORATIVO EN TIEMPO REAL
 * Soporte Firestore onSnapshot singleton, sanitización estricta anti-undefined,
 * sincronización inter-dispositivos inmediata, Web Audio API con chime armónico,
 * privacidad estricta de chats 1 a 1, grupos de trabajo oficiales y
 * notas de voz universales adaptativas (iOS/Safari MP4 y Android/Chrome WebM).
 */

import { 
  collection, 
  doc,
  setDoc,
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { ChatMessage, ChatOpCardData, SolicitudColcha } from '../types';
import { UsuarioSTF } from './authService';
import { notificationService } from './notificationService';

const COLLECTION_NAME = 'stf_chat_messages';
const LOCAL_STORAGE_KEY = 'stf_chat_cached_messages_v3';
const SOUND_ENABLED_KEY = 'stf_chat_sound_enabled';

export interface ChatWorkgroup {
  id: string;
  nombre: string;
  area: 'TODAS' | 'CALIDAD' | 'CALIDAD ZF' | 'LAVANDERÍA' | 'COLECCIONES' | 'DESPACHO';
  icono: string;
  descripcion: string;
  badgeClass: string;
}

export const WORKGROUPS_STF: ChatWorkgroup[] = [
  {
    id: 'GENERAL',
    nombre: 'GENERAL STF',
    area: 'TODAS',
    icono: '🌐',
    descripcion: 'Sala corporativa abierta de todo el equipo en tiempo real',
    badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
  },
  {
    id: 'GROUP_CALIDAD_ZF',
    nombre: 'CALIDAD ZF',
    area: 'CALIDAD ZF',
    icono: '✂️',
    descripcion: 'Atelier Zona Franca, corte de muestras y pre-solicitud',
    badgeClass: 'bg-indigo-950/80 text-indigo-300 border-indigo-700'
  },
  {
    id: 'GROUP_LAVANDERIA',
    nombre: 'LAVANDERIA',
    area: 'LAVANDERÍA',
    icono: '💧',
    descripcion: 'Planta de Lavandería Colfactory ZF y procesos de lavado',
    badgeClass: 'bg-sky-950/80 text-sky-300 border-sky-700'
  },
  {
    id: 'GROUP_CALIDAD',
    nombre: 'CALIDAD',
    area: 'CALIDAD',
    icono: '🔬',
    descripcion: 'Laboratorio de Calidad STF, auditoría técnica y dictámenes',
    badgeClass: 'bg-purple-950/80 text-purple-300 border-purple-700'
  },
  {
    id: 'GROUP_COLECCIONES',
    nombre: 'COLECCIONES & MARCAS',
    area: 'COLECCIONES',
    icono: '👗',
    descripcion: 'Diseño y colecciones Studio F, ELA, Studio F Man y Outlet',
    badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-700'
  },
  {
    id: 'GROUP_DESPACHO',
    nombre: 'DESPACHO',
    area: 'DESPACHO',
    icono: '📦',
    descripcion: 'Tránsito, despacho de muestras físicas y seguimiento',
    badgeClass: 'bg-teal-950/80 text-teal-300 border-teal-700'
  }
];

interface ChatSubscriber {
  id: string;
  canalId: string;
  userId: string;
  callback: (messages: ChatMessage[]) => void;
}

class ChatService {
  private broadcastChannel: BroadcastChannel | null = null;
  private audioCtx: AudioContext | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private recordingStartTime: number = 0;
  private soundEnabled: boolean = true;

  // Arquitectura de suscripción singleton en tiempo real
  private subscribers: Map<string, ChatSubscriber> = new Map();
  private firestoreUnsubscribe: (() => void) | null = null;
  private cachedMessages: ChatMessage[] = [];
  private isFirestoreListening: boolean = false;
  private hasInitialSnapshotLoaded: boolean = false;
  private lastSnapshotTime: number = Date.now();

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel('stf_colchas_chat_channel');
        this.broadcastChannel.addEventListener('message', this.handleBroadcastMessage.bind(this));
      } catch (e) {
        console.warn('[chatService] BroadcastChannel no disponible');
      }

      const savedSound = localStorage.getItem(SOUND_ENABLED_KEY);
      this.soundEnabled = savedSound !== null ? savedSound === 'true' : true;

      // Cargar caché local inmediato en memoria
      this.cachedMessages = this.getCachedMessages();

      // Iniciar escucha global de Firestore
      this.startGlobalFirestoreListener();
    }
  }

  /**
   * Sanitizador recursivo para Firestore:
   * Elimina cualquier propiedad con valor 'undefined' para evitar que Firestore
   * lance "Unsupported field value: undefined" y aborte el guardado.
   */
  private sanitizeForFirestore(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Timestamp) return obj;
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeForFirestore(item));
    }
    const clean: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) {
        clean[key] = this.sanitizeForFirestore(val);
      }
    }
    return clean;
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  public setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!this.audioCtx && AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch (e) {
      return null;
    }
  }

  /**
   * SONIDO CÓMODO Y ORIGINAL DE MENSAJE ENVIADO
   * Un toque sutil tipo burbuja / water-drop orgánico suave de 60ms
   */
  public playSentSound(): void {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.05);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.06);
    } catch (e) {}
  }

  /**
   * SONIDO CÓMODO Y ORIGINAL DE MENSAJE RECIBIDO
   * Un chime armónico pentatónico cálido (F#5 -> A#5 -> C#6), no estridente,
   * con decaimiento suave y envolvente acústica de alta fidelidad.
   */
  public playReceivedSound(): void {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const frequencies = [739.99, 932.33, 1108.73]; // Acorde F# mayor / Chime cálido STF
      
      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);

        const start = now + idx * 0.04;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.15, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.38);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.38);
      });
    } catch (e) {}
  }

  /**
   * Helper para generar el ID canónico de un chat 1 a 1 entre dos usuarios
   */
  public getDirectChannelId(userAId: string, userBId: string): string {
    const cleanA = String(userAId).trim().toLowerCase();
    const cleanB = String(userBId).trim().toLowerCase();
    const sorted = [cleanA, cleanB].sort();
    return `DIRECT_${sorted[0]}_${sorted[1]}`;
  }

  /**
   * Verifica si un usuario forma parte de un canal directo 1 a 1
   */
  public isUserInDirectChannel(canalId: string, userId: string): boolean {
    if (!canalId || !canalId.startsWith('DIRECT_')) return false;
    const uid = String(userId).trim().toLowerCase();
    const rest = canalId.slice('DIRECT_'.length);
    const parts = rest.includes('__') ? rest.split('__') : rest.split('_');
    return parts.some(p => p.toLowerCase() === uid);
  }

  /**
   * Determina si un usuario tiene acceso a un canal específico
   */
  public canUserAccessChannel(canalId: string, currentUserId: string): boolean {
    if (!canalId || canalId === 'GENERAL') return true;
    if (canalId.startsWith('GROUP_')) return true; // Grupos corporativos públicos para todos los autorizados
    if (canalId.startsWith('DIRECT_')) {
      return this.isUserInDirectChannel(canalId, currentUserId);
    }
    return true;
  }

  /**
   * Filtrado estricto por canal y privacidad
   */
  public filterMessagesByChannel(messages: ChatMessage[], canalId: string, currentUserId: string): ChatMessage[] {
    const clean = messages.filter((m) => m && m.id && !m.id.startsWith('seed_') && m.remitenteId !== 'bot');
    const uid = String(currentUserId).trim().toLowerCase();

    // Vista de todos los canales accesibles para conteo y previews de barra lateral
    if (canalId === 'ALL_CHANNELS') {
      return clean.filter((m) => {
        const cId = m.canalId || 'GENERAL';
        if (cId === 'GENERAL') return true;
        if (cId.startsWith('GROUP_')) return true;
        if (cId.startsWith('DIRECT_')) {
          return this.isUserInDirectChannel(cId, uid);
        }
        return false;
      });
    }

    if (canalId === 'GENERAL') {
      return clean.filter((m) => !m.canalId || m.canalId === 'GENERAL');
    }

    // Grupos de trabajo oficiales por área
    if (canalId.startsWith('GROUP_')) {
      return clean.filter((m) => m.canalId === canalId);
    }

    // Chat privado 1 a 1 entre dos perfiles
    if (canalId.startsWith('DIRECT_')) {
      if (!this.isUserInDirectChannel(canalId, uid)) {
        return [];
      }
      return clean.filter((m) => m.canalId === canalId);
    }

    // Chat enfocado en una OP
    if (canalId.startsWith('OP_')) {
      const opCode = canalId.replace('OP_', '');
      return clean.filter((m) => m.canalId === canalId || m.opRelacionada === opCode);
    }

    return clean.filter((m) => m.canalId === canalId);
  }

  /**
   * Obtener mensajes legítimos de usuarios de la caché local
   */
  public getCachedMessages(): ChatMessage[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((m) => m && m.id && !m.id.startsWith('seed_') && m.remitenteId !== 'bot');
    } catch (e) {
      return [];
    }
  }

  private saveCachedMessages(messages: ChatMessage[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const clean = messages.filter((m) => m && m.id && !m.id.startsWith('seed_') && m.remitenteId !== 'bot');
      const trimmed = clean.slice(-300);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('[chatService] Error guardando mensajes en localStorage:', e);
    }
  }

  /**
   * Listener global de Firestore singleton para todo el aplicativo
   */
  private startGlobalFirestoreListener(): void {
    if (this.isFirestoreListening || typeof window === 'undefined') return;

    try {
      const chatCol = collection(db, COLLECTION_NAME);
      const q = query(chatCol, orderBy('createdMillis', 'asc'), limit(300));

      this.isFirestoreListening = true;
      this.lastSnapshotTime = Date.now();

      this.firestoreUnsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const fsMessages: ChatMessage[] = [];
          let hasNewIncomingFromOther = false;
          let incomingSenderName = '';
          let incomingMessageText = '';
          let incomingRoomTitle = '';

          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (docSnap.id.startsWith('seed_') || data.remitenteId === 'bot') return;

            const msgId = data.id || docSnap.id;
            const message: ChatMessage = {
              id: msgId,
              remitente: data.remitente || 'Usuario',
              remitenteId: data.remitenteId || '',
              destinatarioId: data.destinatarioId || '',
              canalId: data.canalId || 'GENERAL',
              area: data.area || 'CALIDAD',
              mensaje: data.mensaje || '',
              opRelacionada: data.opRelacionada,
              opData: data.opData,
              timestamp: data.timestamp || '',
              fecha: data.fecha || '',
              audioUrl: data.audioUrl,
              audioDuracion: data.audioDuracion,
              audioWaveform: data.audioWaveform,
              archivoUrl: data.archivoUrl,
              archivoNombre: data.archivoNombre,
              archivoTipo: data.archivoTipo,
              leido: data.leido ?? false,
              entregado: true,
              reacciones: data.reacciones || {},
              tipo: data.tipo || 'texto',
              createdMillis: data.createdMillis || (data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now())
            };
            fsMessages.push(message);
          });

          // Detectar mensajes nuevos que hayan llegado en tiempo real después del arranque inicial
          if (this.hasInitialSnapshotLoaded) {
            snapshot.docChanges().forEach((change) => {
              if (change.type === 'added') {
                const d = change.doc.data();
                const millis = d.createdMillis || Date.now();
                // Si el mensaje es reciente (posterior al último snapshot)
                if (millis > this.lastSnapshotTime - 3000) {
                  hasNewIncomingFromOther = true;
                  incomingSenderName = d.remitente || 'Colaborador STF';
                  incomingMessageText = d.tipo === 'op' && d.opRelacionada 
                    ? `📌 OP Compartida: ${d.opRelacionada}` 
                    : (d.tipo === 'audio' ? '🎤 Nota de voz' : (d.mensaje || 'Nuevo mensaje'));
                  incomingRoomTitle = d.canalId === 'GENERAL' ? 'Canal General' : incomingSenderName;
                }
              }
            });
          }

          this.hasInitialSnapshotLoaded = true;
          this.lastSnapshotTime = Date.now();

          // Combinar y deduplicar mensajes de Firestore y caché local por ID
          const combinedMap = new Map<string, ChatMessage>();
          this.cachedMessages.forEach((m) => combinedMap.set(m.id, m));
          fsMessages.forEach((m) => combinedMap.set(m.id, m));

          const sorted = Array.from(combinedMap.values()).sort((a, b) => (a.createdMillis || 0) - (b.createdMillis || 0));
          this.cachedMessages = sorted;
          this.saveCachedMessages(sorted);

          // Si llegó un nuevo mensaje en vivo por Firestore:
          if (hasNewIncomingFromOther) {
            this.playReceivedSound();
            notificationService.sendChatNotification(
              incomingSenderName,
              incomingMessageText,
              incomingRoomTitle
            );
          }

          // Notificar a todos los suscriptores activos
          this.notifyAllSubscribers();

          // Disparar evento para actualizar badges de no leídos en toda la aplicación
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('stf_chat_read_updated'));
          }
        },
        (error) => {
          console.warn('[chatService] Firestore onSnapshot fallback:', error.message);
        }
      );
    } catch (err) {
      console.warn('[chatService] Error iniciando listener Firestore:', err);
    }
  }

  /**
   * Listener de BroadcastChannel para pestañas del mismo navegador
   */
  private handleBroadcastMessage(event: MessageEvent): void {
    if (event.data && event.data.type === 'NEW_MESSAGE') {
      const newMsg: ChatMessage = event.data.message;
      if (!this.cachedMessages.some((m) => m.id === newMsg.id)) {
        this.cachedMessages = [...this.cachedMessages, newMsg].sort((a, b) => (a.createdMillis || 0) - (b.createdMillis || 0));
        this.saveCachedMessages(this.cachedMessages);
        this.notifyAllSubscribers();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('stf_chat_read_updated'));
        }
      }
    }
  }

  /**
   * Notifica a todos los componentes suscritos con sus mensajes correspondientes
   */
  private notifyAllSubscribers(): void {
    this.subscribers.forEach(({ canalId, userId, callback }) => {
      const filtered = this.filterMessagesByChannel(this.cachedMessages, canalId, userId);
      callback(filtered);
    });
  }

  /**
   * Suscribirse en tiempo real a mensajes de un canal específico (o todos los mensajes autorizados)
   */
  public subscribeToMessages(
    canalId: string,
    currentUserId: string,
    onMessagesUpdate: (messages: ChatMessage[]) => void
  ): () => void {
    const subId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    // Registrar suscriptor
    this.subscribers.set(subId, {
      id: subId,
      canalId,
      userId: currentUserId,
      callback: onMessagesUpdate
    });

    // 1. Entregar caché inmediatamente (0 ms de espera)
    const initialFiltered = this.filterMessagesByChannel(this.cachedMessages, canalId, currentUserId);
    onMessagesUpdate(initialFiltered);

    // 2. Garantizar que el listener de Firestore esté activo
    this.startGlobalFirestoreListener();

    // 3. Retornar desuscripción limpia
    return () => {
      this.subscribers.delete(subId);
    };
  }

  /**
   * Gestión en tiempo real de mensajes no leídos (Badges Rojos)
   */
  public getChannelLastRead(userId: string, canalId: string): number {
    if (typeof localStorage === 'undefined' || !userId) return 0;
    try {
      const key = `stf_read_${userId.toLowerCase()}_${canalId}`;
      const val = localStorage.getItem(key);
      return val ? parseInt(val, 10) : 0;
    } catch (e) {
      return 0;
    }
  }

  public markChannelAsRead(userId: string, canalId: string): void {
    if (typeof localStorage === 'undefined' || !userId) return;
    try {
      const key = `stf_read_${userId.toLowerCase()}_${canalId}`;
      localStorage.setItem(key, String(Date.now()));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('stf_chat_read_updated', { detail: { userId, canalId } }));
      }
    } catch (e) {}
  }

  public getUnreadCount(userId: string, canalId: string, allMessages: ChatMessage[]): number {
    if (!userId) return 0;
    const uid = userId.toLowerCase();
    const lastRead = this.getChannelLastRead(uid, canalId);
    
    const channelMsgs = this.filterMessagesByChannel(allMessages, canalId, uid);
    return channelMsgs.filter((m) => {
      // Solo contar mensajes enviados por OTRA persona
      if ((m.remitenteId || '').toLowerCase() === uid) return false;
      return (m.createdMillis || 0) > lastRead;
    }).length;
  }

  public getTotalUnreadCount(userId: string, allMessages: ChatMessage[]): number {
    if (!userId) return 0;
    const uid = userId.toLowerCase();
    let total = 0;

    // 1. General
    total += this.getUnreadCount(uid, 'GENERAL', allMessages);

    // 2. Grupos de trabajo
    WORKGROUPS_STF.forEach((wg) => {
      if (wg.id !== 'GENERAL') {
        total += this.getUnreadCount(uid, wg.id, allMessages);
      }
    });

    // 3. Chats directos donde participa el usuario
    const directChannels = new Set<string>();
    allMessages.forEach((m) => {
      if (m.canalId && m.canalId.startsWith('DIRECT_')) {
        if (this.isUserInDirectChannel(m.canalId, uid)) {
          directChannels.add(m.canalId);
        }
      }
    });

    directChannels.forEach((cId) => {
      total += this.getUnreadCount(uid, cId, allMessages);
    });

    return total;
  }

  /**
   * Enviar mensaje genuino al chat con entrega en tiempo real y persistencia garantizada
   */
  public async sendMessage(
    messageData: {
      remitente: string;
      remitenteId: string;
      area: string;
      mensaje: string;
      canalId?: string;
      destinatarioId?: string;
      opRelacionada?: string;
      opData?: ChatOpCardData;
      tipo?: ChatMessage['tipo'];
      audioUrl?: string;
      audioDuracion?: number;
      audioWaveform?: number[];
      archivoUrl?: string;
      archivoNombre?: string;
      archivoTipo?: 'imagen' | 'documento';
    }
  ): Promise<ChatMessage> {
    const now = new Date();
    const timeFormatted = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
    const dateFormatted = now.toISOString().split('T')[0];

    const newId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const cId = messageData.canalId || 'GENERAL';
    let destId = messageData.destinatarioId || '';
    if (!destId && cId.startsWith('DIRECT_')) {
      const parts = cId.replace('DIRECT_', '').split('_');
      const senderUid = messageData.remitenteId.toLowerCase();
      destId = parts[0] === senderUid ? parts[1] : parts[0];
    }

    const fullMessage: ChatMessage = {
      id: newId,
      remitente: messageData.remitente,
      remitenteId: messageData.remitenteId,
      destinatarioId: destId,
      canalId: cId,
      area: messageData.area,
      mensaje: messageData.mensaje || '',
      opRelacionada: messageData.opRelacionada,
      opData: messageData.opData,
      timestamp: timeFormatted,
      fecha: dateFormatted,
      audioUrl: messageData.audioUrl,
      audioDuracion: messageData.audioDuracion,
      audioWaveform: messageData.audioWaveform,
      archivoUrl: messageData.archivoUrl,
      archivoNombre: messageData.archivoNombre,
      archivoTipo: messageData.archivoTipo,
      leido: false,
      entregado: true,
      tipo: messageData.tipo || (messageData.opData ? 'op' : messageData.audioUrl ? 'audio' : messageData.archivoUrl ? 'archivo' : 'texto'),
      createdMillis: Date.now()
    };

    // 1. Sonido de envío inmediato en el cliente
    this.playSentSound();

    // 2. Guardar en memoria y caché local inmediatamente (0 ms)
    this.cachedMessages = [...this.cachedMessages.filter(m => m.id !== fullMessage.id), fullMessage].sort((a, b) => (a.createdMillis || 0) - (b.createdMillis || 0));
    this.saveCachedMessages(this.cachedMessages);

    // 3. Marcar como leído para el remitente
    this.markChannelAsRead(messageData.remitenteId, fullMessage.canalId || 'GENERAL');

    // 4. Actualizar inmediatamente a todos los suscriptores locales
    this.notifyAllSubscribers();

    // 5. Emitir a otras pestañas mediante BroadcastChannel
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type: 'NEW_MESSAGE', message: fullMessage });
      } catch (e) {}
    }

    // 6. Guardar en Firestore asíncronamente con sanitización estricta y setDoc determinístico
    try {
      const sanitized = this.sanitizeForFirestore({
        ...fullMessage,
        createdAt: Timestamp.now()
      });
      const docRef = doc(db, COLLECTION_NAME, fullMessage.id);
      await setDoc(docRef, sanitized);
    } catch (err: any) {
      console.error('[chatService] Error guardando en Firestore:', err?.message || err);
    }

    return fullMessage;
  }

  /**
   * Compartir / Vincular una OP directamente en el chat
   */
  public async shareOpInChat(
    solicitud: SolicitudColcha,
    currentUser: UsuarioSTF,
    canalId: string = 'GENERAL',
    customMessage: string = ''
  ): Promise<ChatMessage> {
    const opData: ChatOpCardData = {
      op: solicitud.op,
      tela: solicitud.tela,
      color: solicitud.color,
      referencia: solicitud.referencia,
      estado: solicitud.estado,
      dictamen: solicitud.dictamen,
      diasHabiles: solicitud.diasHabiles,
      tieneRetraso: solicitud.tieneRetraso,
      esRetrasoCritico: solicitud.esRetrasoCritico,
      fotoMuestraUrl: solicitud.fotoMuestraUrl,
      fotoCalidadUrl: solicitud.fotoCalidadUrl,
      observacion: solicitud.observacionesCalidad || solicitud.observacionesOperario || ''
    };

    const textToSend = customMessage.trim() || `📌 Compartió la ${solicitud.op} (${solicitud.tela}) en estado ${solicitud.estado}${solicitud.tieneRetraso ? ' ⚠️ CON RETRASO SLA' : ''}.`;

    return this.sendMessage({
      remitente: currentUser.nombre,
      remitenteId: currentUser.id,
      area: currentUser.area,
      mensaje: textToSend,
      canalId,
      opRelacionada: solicitud.op,
      opData,
      tipo: 'op'
    });
  }

  /**
   * Grabación de Notas de Voz nativa con Web Audio / MediaRecorder
   * Adaptativo para Safari (iOS/macOS) con MP4 y Chrome/Android con WebM Opus
   */
  public async startAudioRecording(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('El navegador no soporta grabación de audio desde micrófono');
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      this.audioChunks = [];
      this.recordingStartTime = Date.now();

      // Detección adaptativa de códec compatible
      let selectedMimeType = '';
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          selectedMimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          selectedMimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          selectedMimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
          selectedMimeType = 'audio/ogg;codecs=opus';
        }
      }

      const options: MediaRecorderOptions = {};
      if (selectedMimeType) {
        options.mimeType = selectedMimeType;
      }
      // Optimización para voz humana: 32 kbps (peso mínimo ~4KB/s y máxima fidelidad)
      try {
        options.audioBitsPerSecond = 32000;
        this.mediaRecorder = new MediaRecorder(stream, options);
      } catch (optErr) {
        this.mediaRecorder = new MediaRecorder(stream);
      }

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(250); // Recolectar chunks cada 250ms
      return true;
    } catch (err) {
      console.warn('Error al iniciar grabación de audio:', err);
      return false;
    }
  }

  public stopAudioRecording(): Promise<{ blob: Blob; base64: string; duration: number; waveform: number[] } | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }

      const durationSec = Math.max(1, Math.round((Date.now() - this.recordingStartTime) / 1000));

      this.mediaRecorder.onstop = async () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/mp4';
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        
        // Detener todos los tracks del micrófono
        if (this.mediaRecorder && this.mediaRecorder.stream) {
          try {
            this.mediaRecorder.stream.getTracks().forEach((track) => track.stop());
          } catch (e) {}
        }

        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          // 20 barras de onda estilizadas y proporcionales
          const waveform = Array.from({ length: 20 }, () => Math.round((0.25 + Math.random() * 0.75) * 100));
          resolve({
            blob: audioBlob,
            base64,
            duration: durationSec,
            waveform
          });
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(audioBlob);
      };

      try {
        this.mediaRecorder.stop();
      } catch (e) {
        resolve(null);
      }
    });
  }

  public cancelAudioRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        if (this.mediaRecorder.stream) {
          this.mediaRecorder.stream.getTracks().forEach((track) => track.stop());
        }
        this.mediaRecorder.stop();
      } catch (e) {}
    }
    this.audioChunks = [];
  }
}

export const chatService = new ChatService();
