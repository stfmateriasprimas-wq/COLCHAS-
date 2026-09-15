/**
 * STF GROUP - SERVICIO DE CHAT CORPORATIVO EN TIEMPO REAL
 * Soporte Firestore onSnapshot, sincronización inter-pestañas (BroadcastChannel),
 * Web Audio API (sonidos cómodos exclusivos), privacidad estricta de chats 1 a 1,
 * grupos de trabajo oficiales y conteo en tiempo real de mensajes no leídos.
 */

import { 
  collection, 
  addDoc, 
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

class ChatService {
  private broadcastChannel: BroadcastChannel | null = null;
  private audioCtx: AudioContext | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private recordingStartTime: number = 0;
  private soundEnabled: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel('stf_colchas_chat_channel');
      } catch (e) {
        console.warn('[chatService] BroadcastChannel no disponible');
      }

      const savedSound = localStorage.getItem(SOUND_ENABLED_KEY);
      this.soundEnabled = savedSound !== null ? savedSound === 'true' : true;

      // Limpiar residuos de mensajes semilla anteriores si existieran
      try {
        localStorage.removeItem('stf_chat_cached_messages_v2');
      } catch (e) {}
    }
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
    const sorted = [String(userAId).trim().toLowerCase(), String(userBId).trim().toLowerCase()].sort();
    return `DIRECT_${sorted[0]}_${sorted[1]}`;
  }

  /**
   * Obtener mensajes legítimos de usuarios (100% reales, sin mensajes automáticos ni fantasmas)
   */
  public getCachedMessages(): ChatMessage[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      // Filtrar mensajes que no sean genuinamente de usuarios
      return parsed.filter((m) => m && m.id && !m.id.startsWith('seed_') && m.remitenteId !== 'bot');
    } catch (e) {
      return [];
    }
  }

  private saveCachedMessages(messages: ChatMessage[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
      // Limitar a los últimos 300 mensajes legítimos
      const clean = messages.filter((m) => m && m.id && !m.id.startsWith('seed_') && m.remitenteId !== 'bot');
      const trimmed = clean.slice(-300);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('[chatService] Error guardando mensajes en localStorage:', e);
    }
  }

  /**
   * Suscribirse en tiempo real a mensajes de un canal específico (o todos los mensajes autorizados)
   */
  public subscribeToMessages(
    canalId: string,
    currentUserId: string,
    onMessagesUpdate: (messages: ChatMessage[]) => void
  ): () => void {
    let firestoreUnsub: (() => void) | null = null;
    let localMessages = this.getCachedMessages();

    // 1. Entregar caché inmediatamente
    const filteredInitial = this.filterMessagesByChannel(localMessages, canalId, currentUserId);
    onMessagesUpdate(filteredInitial);

    // 2. Suscribirse a Firestore en tiempo real
    try {
      const chatCol = collection(db, COLLECTION_NAME);
      const q = query(chatCol, orderBy('createdMillis', 'asc'), limit(300));

      firestoreUnsub = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const fsMessages: ChatMessage[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              // Evitar bots o semillas
              if (docSnap.id.startsWith('seed_') || data.remitenteId === 'bot') return;

              fsMessages.push({
                id: docSnap.id,
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
                createdMillis: data.createdMillis || Date.now()
              });
            });

            // Combinar asegurando sin duplicados
            const combinedMap = new Map<string, ChatMessage>();
            localMessages.forEach((m) => combinedMap.set(m.id, m));
            fsMessages.forEach((m) => combinedMap.set(m.id, m));

            const sorted = Array.from(combinedMap.values()).sort((a, b) => (a.createdMillis || 0) - (b.createdMillis || 0));
            localMessages = sorted;
            this.saveCachedMessages(sorted);

            const filtered = this.filterMessagesByChannel(sorted, canalId, currentUserId);
            onMessagesUpdate(filtered);
          }
        },
        (error) => {
          console.warn('[chatService] Firestore onSnapshot fallback a modo local:', error.message);
        }
      );
    } catch (err) {
      console.warn('[chatService] Firestore no disponible, usando sincronización local:', err);
    }

    // 3. Listener de BroadcastChannel para sincronización inter-pestañas instantánea
    const handleBroadcast = (event: MessageEvent) => {
      if (event.data && event.data.type === 'NEW_MESSAGE') {
        const newMsg: ChatMessage = event.data.message;
        if (!localMessages.some((m) => m.id === newMsg.id)) {
          localMessages = [...localMessages, newMsg].sort((a, b) => (a.createdMillis || 0) - (b.createdMillis || 0));
          this.saveCachedMessages(localMessages);

          const filtered = this.filterMessagesByChannel(localMessages, canalId, currentUserId);
          onMessagesUpdate(filtered);

          // Si el mensaje es de otro usuario y está destinado a este canal o usuario
          if (newMsg.remitenteId !== currentUserId) {
            // Verificar si el usuario actual tiene acceso a este canal
            const userHasAccess = this.canUserAccessChannel(newMsg.canalId || 'GENERAL', currentUserId);
            if (userHasAccess) {
              this.playReceivedSound();
              notificationService.sendChatNotification(
                newMsg.remitente,
                newMsg.tipo === 'op' && newMsg.opRelacionada ? `📌 OP Compartida: ${newMsg.opRelacionada}` : (newMsg.mensaje || 'Nuevo mensaje'),
                canalId === 'GENERAL' ? 'Canal General' : newMsg.remitente
              );
            }
          }
        }
      }
    };

    if (this.broadcastChannel) {
      this.broadcastChannel.addEventListener('message', handleBroadcast);
    }

    // 4. Retornar desuscripción limpia
    return () => {
      if (firestoreUnsub) firestoreUnsub();
      if (this.broadcastChannel) {
        this.broadcastChannel.removeEventListener('message', handleBroadcast);
      }
    };
  }

  /**
   * Determina si un usuario tiene acceso a un canal específico
   */
  public canUserAccessChannel(canalId: string, currentUserId: string): boolean {
    if (!canalId || canalId === 'GENERAL') return true;
    if (canalId.startsWith('GROUP_')) return true; // Los grupos corporativos de trabajo
    if (canalId.startsWith('DIRECT_')) {
      const parts = canalId.replace('DIRECT_', '').split('_');
      const uid = String(currentUserId).trim().toLowerCase();
      // Solo las 2 personas del chat privado tienen acceso
      return parts[0] === uid || parts[1] === uid;
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
          const parts = cId.replace('DIRECT_', '').split('_');
          return parts[0] === uid || parts[1] === uid;
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
      const parts = canalId.replace('DIRECT_', '').split('_');
      // PRIVACIDAD ESTRICTA: Si el usuario logueado NO es ninguno de los dos, no ve NINGÚN mensaje
      if (parts[0] !== uid && parts[1] !== uid) {
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
        const parts = m.canalId.replace('DIRECT_', '').split('_');
        if (parts[0] === uid || parts[1] === uid) {
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
   * Enviar mensaje genuino al chat
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
      mensaje: messageData.mensaje,
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

    // 1. Sonido de envío inmediato
    this.playSentSound();

    // 2. Guardar en caché local
    const local = this.getCachedMessages();
    const updated = [...local, fullMessage];
    this.saveCachedMessages(updated);

    // 3. Marcar como leído para el remitente
    this.markChannelAsRead(messageData.remitenteId, fullMessage.canalId || 'GENERAL');

    // 4. Emitir a otras pestañas mediante BroadcastChannel
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type: 'NEW_MESSAGE', message: fullMessage });
      } catch (e) {}
    }

    // 5. Guardar en Firestore asíncronamente
    try {
      const chatCol = collection(db, COLLECTION_NAME);
      await addDoc(chatCol, {
        ...fullMessage,
        createdAt: Timestamp.now()
      });
    } catch (err) {
      console.warn('[chatService] Error guardando en Firestore:', err);
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
   */
  public async startAudioRecording(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('El navegador no soporta grabación de audio desde micrófono');
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];
      this.recordingStartTime = Date.now();

      const mediaRecorder = new MediaRecorder(stream);
      this.mediaRecorder = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      mediaRecorder.start();
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
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm;codecs=opus' });
        
        // Detener todos los tracks del micrófono
        if (this.mediaRecorder && this.mediaRecorder.stream) {
          this.mediaRecorder.stream.getTracks().forEach((track) => track.stop());
        }

        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          const waveform = Array.from({ length: 24 }, () => Math.round((0.2 + Math.random() * 0.8) * 100) / 100);
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

      this.mediaRecorder.stop();
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
