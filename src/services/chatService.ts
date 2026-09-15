/**
 * STF GROUP - SERVICIO DE CHAT CORPORATIVO EN TIEMPO REAL
 * Soporte Firestore onSnapshot, sincronización inter-pestañas (BroadcastChannel),
 * Web Audio API (sonidos cómodos exclusivos), grabación de notas de voz y notificaciones.
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
const LOCAL_STORAGE_KEY = 'stf_chat_cached_messages_v2';
const SOUND_ENABLED_KEY = 'stf_chat_sound_enabled';

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
        console.warn('[chatService] BroadcastChannel no soportado en este entorno');
      }

      const savedSound = localStorage.getItem(SOUND_ENABLED_KEY);
      this.soundEnabled = savedSound !== null ? savedSound === 'true' : true;
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
    } catch (e) {
      // Ignorar errores de audio
    }
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
    } catch (e) {
      // Ignorar errores de audio
    }
  }

  /**
   * Helper para generar el ID canónico de un chat 1 a 1 entre dos usuarios
   */
  public getDirectChannelId(userAId: string, userBId: string): string {
    const sorted = [String(userAId).trim().toLowerCase(), String(userBId).trim().toLowerCase()].sort();
    return `DIRECT_${sorted[0]}_${sorted[1]}`;
  }

  /**
   * Obtener mensajes cacheados localmente
   */
  public getCachedMessages(): ChatMessage[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return this.getInitialSeedMessages();
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : this.getInitialSeedMessages();
    } catch (e) {
      return this.getInitialSeedMessages();
    }
  }

  private saveCachedMessages(messages: ChatMessage[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
      // Limitar a los últimos 300 mensajes para mantener el localStorage ligero
      const trimmed = messages.slice(-300);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('[chatService] Error guardando mensajes en localStorage:', e);
    }
  }

  /**
   * Suscribirse en tiempo real a mensajes de un canal específico (o todos los mensajes)
   * Utiliza Firestore onSnapshot con fallback a BroadcastChannel y localStorage.
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

    // 2. Suscribirse a Firestore si está disponible
    try {
      const chatCol = collection(db, COLLECTION_NAME);
      const q = query(chatCol, orderBy('createdMillis', 'asc'), limit(250));

      firestoreUnsub = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const fsMessages: ChatMessage[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
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

            // Combinar con locales asegurando sin duplicados
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
      console.warn('[chatService] Firestore no inicializado, usando sincronización local:', err);
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

          // Si el mensaje es de otro usuario y es relevante para este canal
          if (newMsg.remitenteId !== currentUserId) {
            this.playReceivedSound();
            notificationService.sendChatNotification(
              newMsg.remitente,
              newMsg.tipo === 'op' && newMsg.opRelacionada ? `📌 OP Compartida: ${newMsg.opRelacionada}` : (newMsg.mensaje || 'Nuevo mensaje'),
              canalId === 'GENERAL' ? 'Canal General' : newMsg.remitente
            );
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

  private filterMessagesByChannel(messages: ChatMessage[], canalId: string, currentUserId: string): ChatMessage[] {
    if (canalId === 'GENERAL') {
      return messages.filter((m) => !m.canalId || m.canalId === 'GENERAL');
    }
    // Chat directo entre dos personas
    if (canalId.startsWith('DIRECT_')) {
      return messages.filter((m) => m.canalId === canalId);
    }
    // Chat enfocado en una OP
    if (canalId.startsWith('OP_')) {
      const opCode = canalId.replace('OP_', '');
      return messages.filter((m) => m.canalId === canalId || m.opRelacionada === opCode);
    }
    return messages.filter((m) => m.canalId === canalId);
  }

  /**
   * Enviar mensaje al chat
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

    const fullMessage: ChatMessage = {
      id: newId,
      remitente: messageData.remitente,
      remitenteId: messageData.remitenteId,
      destinatarioId: messageData.destinatarioId || '',
      canalId: messageData.canalId || 'GENERAL',
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

    // 3. Emitir a otras pestañas mediante BroadcastChannel
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type: 'NEW_MESSAGE', message: fullMessage });
      } catch (e) {}
    }

    // 4. Guardar en Firestore asíncronamente
    try {
      const chatCol = collection(db, COLLECTION_NAME);
      await addDoc(chatCol, {
        ...fullMessage,
        createdAt: Timestamp.now()
      });
    } catch (err) {
      console.warn('[chatService] No se pudo escribir en Firestore (guardado en caché local):', err);
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

        // Convertir a Base64 Data URL
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          // Simular onda de audio estética con variación armónica
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

  /**
   * Semilla inicial con mensajes corporativos y bienvenida
   */
  private getInitialSeedMessages(): ChatMessage[] {
    return [
      {
        id: 'seed_msg_1',
        remitente: 'STF TEAMS BOT',
        remitenteId: 'bot',
        canalId: 'GENERAL',
        area: 'CALIDAD',
        mensaje: '👋 ¡Bienvenidos a la Sala de Chat en Tiempo Real de STF Colchas! Aquí pueden coordinar recepciones de lavandería, auditorías técnicas y compartir OPs en retraso.',
        timestamp: '08:00 AM',
        fecha: new Date().toISOString().split('T')[0],
        tipo: 'alerta',
        leido: true,
        entregado: true,
        createdMillis: Date.now() - 3600000 * 4
      },
      {
        id: 'seed_msg_2',
        remitente: 'EDWIN DÍAZ',
        remitenteId: 'ediaz',
        canalId: 'GENERAL',
        area: 'CALIDAD',
        mensaje: 'Buen día equipo, recuerden priorizar las OPs que tienen más de 3 días hábiles en proceso para evitar cuellos de botella en despacho.',
        timestamp: '08:15 AM',
        fecha: new Date().toISOString().split('T')[0],
        tipo: 'texto',
        leido: true,
        entregado: true,
        createdMillis: Date.now() - 3600000 * 3
      }
    ];
  }
}

export const chatService = new ChatService();
