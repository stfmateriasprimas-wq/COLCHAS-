/**
 * STF GROUP - SISTEMA INTEGRAL DE NOTIFICACIONES VISUALES Y AUDITIVAS
 * Soporte avanzado para Móvil (Android/iOS/PWA) y Computador (Windows/Mac/Linux)
 * Notificaciones en segundo plano, pantalla bloqueada, vibración y sonido nítido.
 */

class NotificationService {
  private audioContext: AudioContext | null = null;
  private permissionGranted: boolean = false;
  private swRegistration: ServiceWorkerRegistration | null = null;
  private titleInterval: number | null = null;
  private originalTitle: string = typeof document !== 'undefined' ? document.title : 'STF Colchas';
  private inAppToastListeners: Array<(toast: { sender: string; message: string; room?: string }) => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      if ('Notification' in window) {
        this.permissionGranted = Notification.permission === 'granted';
      }

      // Registro de Service Worker para notificaciones con pantalla bloqueada o app minimizada
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').then(reg => {
          this.swRegistration = reg;
        }).catch(err => {
          console.log('Service Worker no activo o en modo desarrollo:', err);
        });
      }

      // Desbloqueo de AudioContext en la primera interacción del usuario
      const unlockAudio = () => {
        this.initAudioContext();
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
      };
      window.addEventListener('click', unlockAudio, { passive: true });
      window.addEventListener('touchstart', unlockAudio, { passive: true });
      window.addEventListener('keydown', unlockAudio, { passive: true });
    }
  }

  private initAudioContext(): void {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!this.audioContext && AudioCtx) {
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
    } catch (e) {
      console.warn('AudioContext init:', e);
    }
  }

  /**
   * Solicitar permiso para notificaciones nativas en Móvil y PC
   */
  public async requestNotificationPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    try {
      this.initAudioContext();
      const permission = await Notification.requestPermission();
      this.permissionGranted = permission === 'granted';

      if (this.permissionGranted) {
        // Enviar sonido de confirmación y notificación de bienvenida
        this.playAlertSound('EXITO');
        this.triggerVibration();
      }

      return this.permissionGranted;
    } catch (err) {
      console.warn('Error al solicitar permisos de notificación:', err);
      return false;
    }
  }

  /**
   * Verificar si los permisos están concedidos
   */
  public hasPermission(): boolean {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    return Notification.permission === 'granted';
  }

  /**
   * Emitir vibración háptica en dispositivos móviles (Android/iOS)
   */
  public triggerVibration(pattern: number[] = [200, 100, 200, 100, 200]): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // Ignore vibration errors
      }
    }
  }

  /**
   * Reproducir sonido sutil y elegante de alerta corporativa STF
   * Utiliza la Web Audio API nativa sin dependencias externas (compatible con móvil y PC)
   */
  public playAlertSound(type: 'CRITICO' | 'NOTIFICACION' | 'EXITO' | 'TRANSFERENCIA' | 'MENSAJE' = 'NOTIFICACION'): void {
    if (typeof window === 'undefined') return;

    try {
      this.initAudioContext();
      if (!this.audioContext) return;

      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const now = this.audioContext.currentTime;
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      if (type === 'MENSAJE') {
        // Tono dual dulce y nítido tipo WhatsApp/Telegram (B5 -> E6 -> G#6)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(987.77, now); // B5
        osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6
        osc.frequency.setValueAtTime(1661.22, now + 0.16); // G#6
        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
      } else if (type === 'CRITICO') {
        // Doble tono de advertencia (Alerta SLA Crítico)
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880.00, now + 0.12); // A5
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
      } else if (type === 'EXITO') {
        // Tono ascendente agradable (Transferencia completada / Muestra Aprobada)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      } else {
        // Tono suave de chime corporativo STF
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, now); // E5
        osc.frequency.setValueAtTime(880.00, now + 0.1); // A5
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      }
    } catch (e) {
      console.warn('Audio Context no disponible o bloqueado por el navegador:', e);
    }
  }

  /**
   * Destello en la pestaña del navegador para alertar cuando el usuario está en otra ventana o móvil
   */
  public flashDocumentTitle(alertText: string = '💬 (1) Nuevo Mensaje | STF Teams'): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    if (this.titleInterval) {
      clearInterval(this.titleInterval);
    }

    this.originalTitle = document.title.replace(/^💬\s*\(\d+\)\s*/, '');
    let showOriginal = false;

    this.titleInterval = window.setInterval(() => {
      document.title = showOriginal ? this.originalTitle : alertText;
      showOriginal = !showOriginal;
    }, 1000);

    const onFocus = () => {
      if (this.titleInterval) {
        clearInterval(this.titleInterval);
        this.titleInterval = null;
      }
      document.title = this.originalTitle;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };

    const onVisibility = () => {
      if (!document.hidden) {
        onFocus();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
  }

  /**
   * Suscripción para mostrar toast flotante dentro de la aplicación
   */
  public onInAppToast(callback: (toast: { sender: string; message: string; room?: string }) => void): () => void {
    this.inAppToastListeners.push(callback);
    return () => {
      this.inAppToastListeners = this.inAppToastListeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Enviar notificación de chat con sonido, vibración y push nativo (Móvil y PC)
   */
  public sendChatNotification(senderName: string, message: string, roomTitle?: string): void {
    // 1. Sonido nítido
    this.playAlertSound('MENSAJE');

    // 2. Vibración háptica en móvil
    this.triggerVibration([200, 100, 200, 100, 200]);

    // 3. Destello de título en pestaña
    this.flashDocumentTitle(`💬 (1) ${senderName}: ${message.slice(0, 30)}...`);

    // 4. Notificar a los oyentes de Toast flotante interno
    this.inAppToastListeners.forEach(fn => fn({ sender: senderName, message, room: roomTitle }));

    // 5. Notificación Nativa Push del Sistema Operativo (PC y Móvil en barra superior y pantalla bloqueada)
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const title = roomTitle ? `STF Teams • ${roomTitle}` : `STF Teams • ${senderName}`;
        const body = `${senderName}: ${message}`;
        const icon = '/logo-stf-white.png';

        const showNative = (reg?: ServiceWorkerRegistration) => {
          try {
            if (reg && 'showNotification' in reg) {
              reg.showNotification(title, {
                body,
                icon,
                badge: icon,
                tag: `stf-msg-${Date.now()}`,
                vibrate: [200, 100, 200, 100, 200],
                renotify: true,
                data: { url: '/' }
              } as any);
            } else {
              new Notification(title, {
                body,
                icon,
                badge: icon,
                tag: 'stf-chat-message'
              });
            }
          } catch (eInner) {
            try {
              new Notification(title, { body, icon, badge: icon });
            } catch (eFallback) {}
          }
        };

        if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
          navigator.serviceWorker.ready.then(reg => {
            showNative(reg);
          }).catch(() => {
            showNative(this.swRegistration || undefined);
          });
        } else {
          showNative(this.swRegistration || undefined);
        }
      } catch (err) {
        console.warn('Error al lanzar notificación de chat:', err);
      }
    }
  }

  /**
   * Probar notificación con sonido y banner nativo
   */
  public testNotificationWithSound(userName: string = 'USUARIO'): void {
    this.sendChatNotification(
      'STF TEAMS BOT',
      `🔔 ¡Notificaciones activadas con éxito para ${userName}! Recibirás sonido y alerta al recibir mensajes.`
    );
  }

  /**
   * Enviar notificación visual al dispositivo (Push / Desktop Notification)
   */
  public sendDeviceNotification(title: string, body: string, icon = '/logo-stf-white.png'): void {
    this.playAlertSound('CRITICO');
    this.triggerVibration();

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        if (this.swRegistration && 'showNotification' in this.swRegistration) {
          (this.swRegistration as any).showNotification(title, {
            body,
            icon,
            badge: icon,
            tag: 'stf-device-alert',
            vibrate: [300, 150, 300]
          });
        } else {
          new Notification(title, {
            body,
            icon,
            badge: icon
          });
        }
      } catch (err) {
        console.warn('Error al lanzar notificación nativa:', err);
      }
    }
  }
}

export const notificationService = new NotificationService();
