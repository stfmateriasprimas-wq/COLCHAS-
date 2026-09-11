import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Send, Search, Bell, Volume2, VolumeX, Mic, MicOff, Paperclip, 
  Plus, Tag, ArrowLeft, Play, Pause, FileText, Image as ImageIcon,
  MessageSquare, FlaskConical, Droplets, Sparkles, Wrench, ChevronDown,
  Filter, Check, CheckCheck, User, Download, ExternalLink, ShieldCheck,
  Sun, Moon, Maximize2, Minimize2
} from 'lucide-react';
import { ChatMessage, SolicitudColcha } from '../../types';
import { UsuarioSTF, USUARIOS_STF_MAESTROS } from '../../services/authService';
import { chatService, CHAT_CHANNELS_MAESTROS, ChatChannel } from '../../services/chatService';
import { notificationService } from '../../services/notificationService';

interface ChatTeamsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UsuarioSTF | null;
  solicitudes?: SolicitudColcha[];
  onViewOpDetail?: (op: SolicitudColcha) => void;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
}

type ChatTab = 'TODOS' | 'NO_LEIDOS' | 'SALAS' | 'DIRECTOS';

export const ChatTeamsModal: React.FC<ChatTeamsModalProps> = ({ 
  isOpen, 
  onClose,
  currentUser,
  solicitudes = [],
  onViewOpDetail,
  isDarkMode,
  onToggleTheme
}) => {
  // Current active user fallback
  const activeUser: UsuarioSTF = currentUser || {
    id: '1111',
    nombre: 'CALIDAD',
    rol: 'OPERARIO',
    area: 'CALIDAD',
    email: 'auditorcalidad2@studiof.com.co'
  };

  // Local theme state synced with global isDarkMode
  const [localDarkMode, setLocalDarkMode] = useState<boolean>(() => {
    if (isDarkMode !== undefined) return isDarkMode;
    const saved = localStorage.getItem('stf_colchas_theme');
    return saved ? saved === 'dark' : true;
  });

  useEffect(() => {
    if (isDarkMode !== undefined) {
      setLocalDarkMode(isDarkMode);
    }
  }, [isDarkMode]);

  const handleToggleTheme = () => {
    if (onToggleTheme) {
      onToggleTheme();
    } else {
      const next = !localDarkMode;
      setLocalDarkMode(next);
      if (next) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('stf_colchas_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('stf_colchas_theme', 'light');
      }
    }
  };

  // State
  const [activeTab, setActiveTab] = useState<ChatTab>('TODOS');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('general');
  const [isDirectRoom, setIsDirectRoom] = useState<boolean>(false);
  const [mobileChatView, setMobileChatView] = useState<'list' | 'conversation'>('list');
  const [filterOnlyOps, setFilterOnlyOps] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [notificationsGranted, setNotificationsGranted] = useState<boolean>(() => notificationService.hasPermission());

  // Real-time OP Inspection and Dropdown filter state
  const [inspectingOp, setInspectingOp] = useState<SolicitudColcha | null>(null);
  const [opDropdownTab, setOpDropdownTab] = useState<'TODAS' | 'LAVANDERIA' | 'CALIDAD' | 'ATELIER'>('TODAS');
  const [copiedOpAlert, setCopiedOpAlert] = useState(false);

  // Input & attachments state
  const [inputText, setInputText] = useState('');
  const [attachedOp, setAttachedOp] = useState<string | null>(null);
  const [isOpDropdownOpen, setIsOpDropdownOpen] = useState(false);
  const [opSearchQuery, setOpSearchQuery] = useState('');
  const [attachedFile, setAttachedFile] = useState<{ url: string; name: string; type: 'imagen' | 'documento' } | null>(null);

  // Audio voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);

  // Audio playback state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Chat message refresh trigger
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sincronizar usuario activo con el servicio de chat en tiempo real
  useEffect(() => {
    if (activeUser?.id) {
      chatService.setActiveUserId(activeUser.id);
    }
  }, [activeUser?.id]);

  // Subscribe to chat updates
  useEffect(() => {
    const unsubscribe = chatService.subscribe(() => {
      setRefreshTrigger(prev => prev + 1);
    });
    return () => unsubscribe();
  }, []);

  // Mark room as read on room change
  useEffect(() => {
    if (isOpen && selectedRoomId) {
      chatService.markAsRead(selectedRoomId, isDirectRoom, activeUser.id);
    }
  }, [isOpen, selectedRoomId, isDirectRoom, activeUser.id, refreshTrigger]);

  // Scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedRoomId, refreshTrigger]);

  // Channels and Users lists
  const channels = CHAT_CHANNELS_MAESTROS;
  const directUsers = USUARIOS_STF_MAESTROS;

  // Get active room details
  const currentChannel = !isDirectRoom ? channels.find(c => c.id === selectedRoomId) : null;
  const currentDirectUser = isDirectRoom 
    ? (selectedRoomId === activeUser.id ? activeUser : directUsers.find(u => u.id === selectedRoomId))
    : null;

  // Room messages
  const messages = chatService.getRoomMessages(selectedRoomId, isDirectRoom, activeUser.id, filterOnlyOps);

  // Icon helper for channels
  const renderChannelIcon = (icono: string, color: string) => {
    const baseClass = "w-4 h-4";
    switch (icono) {
      case 'MessageSquare': return <MessageSquare className={`${baseClass} text-purple-400`} />;
      case 'FlaskConical': return <FlaskConical className={`${baseClass} text-indigo-400`} />;
      case 'Droplets': return <Droplets className={`${baseClass} text-amber-400`} />;
      case 'Sparkles': return <Sparkles className={`${baseClass} text-blue-400`} />;
      case 'Bell': return <Bell className={`${baseClass} text-rose-400`} />;
      case 'Wrench': return <Wrench className={`${baseClass} text-slate-400`} />;
      default: return <MessageSquare className={`${baseClass} text-zinc-400`} />;
    }
  };

  // User avatar initials
  const getInitials = (name: string) => {
    if (!name) return 'ST';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Send message
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !attachedFile && !attachedOp) return;

    chatService.sendMessage({
      remitente: activeUser.nombre,
      remitenteId: activeUser.id,
      destinatarioId: isDirectRoom ? selectedRoomId : undefined,
      canalId: !isDirectRoom ? selectedRoomId : undefined,
      area: activeUser.area,
      mensaje: inputText.trim(),
      opRelacionada: attachedOp || undefined,
      archivoUrl: attachedFile?.url,
      archivoNombre: attachedFile?.name,
      archivoTipo: attachedFile?.type,
      tipo: attachedFile ? 'archivo' : attachedOp && !inputText.trim() ? 'op' : 'texto'
    });

    setInputText('');
    setAttachedOp(null);
    setAttachedFile(null);
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImg = file.type.startsWith('image/');
    const reader = new FileReader();
    reader.onload = () => {
      setAttachedFile({
        url: reader.result as string,
        name: file.name,
        type: isImg ? 'imagen' : 'documento'
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Audio recording handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        chatService.sendMessage({
          remitente: activeUser.nombre,
          remitenteId: activeUser.id,
          destinatarioId: isDirectRoom ? selectedRoomId : undefined,
          canalId: !isDirectRoom ? selectedRoomId : undefined,
          area: activeUser.area,
          mensaje: `Nota de voz (${recordingDuration || 8} seg)`,
          audioUrl: audioUrl,
          audioDuracion: recordingDuration || 8,
          opRelacionada: attachedOp || undefined,
          tipo: 'audio'
        });

        setRecordingDuration(0);
        setIsRecording(false);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn("Microphone not accessible, sending simulated voice note:", err);
      // Fallback voice note
      chatService.sendMessage({
        remitente: activeUser.nombre,
        remitenteId: activeUser.id,
        destinatarioId: isDirectRoom ? selectedRoomId : undefined,
        canalId: !isDirectRoom ? selectedRoomId : undefined,
        area: activeUser.area,
        mensaje: 'Nota de voz (0:08 seg)',
        audioUrl: 'synth://voice-note',
        audioDuracion: 8,
        opRelacionada: attachedOp || undefined,
        tipo: 'audio'
      });
    }
  };

  const stopRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    } else {
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingDuration(0);
  };

  // Play audio note
  const handlePlayAudio = (audioId: string, audioUrl?: string) => {
    if (playingAudioId === audioId) {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }
      setPlayingAudioId(null);
      return;
    }

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
    }

    if (audioUrl && audioUrl.startsWith('blob:')) {
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;
      setPlayingAudioId(audioId);
      audio.play();
      audio.onended = () => setPlayingAudioId(null);
    } else {
      // Synthesize tone for demo voice note
      notificationService.playAlertSound('MENSAJE');
      setPlayingAudioId(audioId);
      setTimeout(() => {
        setPlayingAudioId(null);
      }, 3000);
    }
  };

  // Handler to inspect OP in real-time when clicked from a message
  const handleInspectOpFromMessage = (opNumber: string) => {
    const cleanOp = opNumber.trim().toUpperCase();
    const found = solicitudes.find(s => 
      s.op.toUpperCase() === cleanOp || 
      s.op.replace(/\D/g, '') === cleanOp.replace(/\D/g, '')
    );

    if (found) {
      setInspectingOp(found);
    } else {
      // Create rich live object based on known parameters
      const fallbackOp: SolicitudColcha = {
        id: `live-${cleanOp}`,
        op: cleanOp.startsWith('OP-') ? cleanOp : `OP-${cleanOp}`,
        referencia: 'REF-80004 (STUDIO F / ELA)',
        tela: 'DENIM TENCEL MALVINA RIGIDO',
        codigoMt: 'MT-4029',
        color: 'INDIGO STONE WASH DARK',
        rollos: 6,
        lote: 'L-2026-B',
        estado: 'LAVANDERIA',
        dictamen: 'PENDIENTE',
        inspector: 'DIDIER MUÑOZ (LAVANDERÍA COLFACTORY)',
        fechaCreacion: '2026-09-03',
        observacionesOperario: 'Muestra en proceso químico de desengomado, lavado y prueba de encogimiento para aprobación de tono.',
        areaActual: 'LAVANDERÍA COLFACTORY ZF',
        horasEnProceso: 4,
        diasHabiles: 0,
        limiteSlaDias: 2,
        tieneRetraso: false,
        esRetrasoCritico: false
      };
      setInspectingOp(fallbackOp);
    }
  };

  // Unread counts
  const totalUnreadCount = chatService.getUnreadCount(activeUser.id);
  const channelsUnreadCount = chatService.getChannelsUnreadCount(activeUser.id);
  const directsUnreadCount = chatService.getDirectsUnreadCount(activeUser.id);

  // Filtered lists for sidebar
  const filteredChannels = channels.filter(c => {
    if (activeTab === 'DIRECTOS') return false;
    const lastInfo = chatService.getRoomLastMessage(c.id, false, activeUser.id);
    if (activeTab === 'NO_LEIDOS' && (!lastInfo || lastInfo.unreadCount === 0)) return false;
    if (!searchQuery) return true;
    return c.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || c.descripcion.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // DIRECTOS: Excluir mi propio perfil
  const otherDirectUsers = directUsers.filter(u => u.id !== activeUser.id);

  const filteredDirectUsers = otherDirectUsers.filter(u => {
    if (activeTab === 'SALAS') return false;
    const lastInfo = chatService.getRoomLastMessage(u.id, true, activeUser.id);
    if (activeTab === 'NO_LEIDOS' && (!lastInfo || lastInfo.unreadCount === 0)) return false;
    if (!searchQuery) return true;
    return u.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || u.rol.toLowerCase().includes(searchQuery.toLowerCase()) || u.area.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Todas las OPs que están en proceso en tiempo real en la base de datos
  const filteredActiveOps = solicitudes.filter(s => {
    if (opDropdownTab === 'LAVANDERIA' && s.estado !== 'LAVANDERIA') return false;
    if (opDropdownTab === 'CALIDAD' && s.estado !== 'CALIDAD') return false;
    if (opDropdownTab === 'ATELIER' && s.estado !== 'PRE_SOLICITUD' && s.estado !== 'SOLICITADO') return false;

    if (!opSearchQuery) return true;
    const q = opSearchQuery.toLowerCase();
    return (
      s.op.toLowerCase().includes(q) || 
      s.referencia.toLowerCase().includes(q) || 
      s.tela.toLowerCase().includes(q) ||
      (s.inspector && s.inspector.toLowerCase().includes(q))
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-1.5 sm:p-2.5 md:p-3 animate-in fade-in duration-200">
      
      {/* Hidden file input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        className="hidden" 
        accept="image/*,application/pdf,.xlsx,.csv,.txt"
      />

      {/* EXPANDED FULL-SCREEN CHAT CONTAINER */}
      <div className={`w-full max-w-[98.5vw] 2xl:max-w-[1900px] h-[96vh] sm:h-[97vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden font-sans select-none backdrop-blur-2xl transition-colors duration-200 border ${
        localDarkMode 
          ? 'bg-[#080c14] border-emerald-500/30 text-white shadow-[0_0_70px_rgba(16,185,129,0.18)] ring-1 ring-emerald-500/20'
          : 'bg-white border-slate-300 text-slate-900 shadow-[0_25px_70px_rgba(0,0,0,0.18)] ring-1 ring-slate-200'
      }`}>
        
        {/* ========================================================================= */}
        {/* TOP SYSTEM BAR (FUTURISTIC HUD HEADER CON BOTÓN MODO CLARO / OSCURO) */}
        {/* ========================================================================= */}
        <div className={`px-4 sm:px-6 py-3 sm:py-3.5 border-b flex items-center justify-between gap-3 backdrop-blur-md transition-colors duration-200 ${
          localDarkMode 
            ? 'border-zinc-800/80 bg-[#0c121e]/95 text-white' 
            : 'border-slate-200 bg-white/95 text-slate-900 shadow-xs'
        }`}>
          
          {/* Brand & Status Indicator */}
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl relative group transition-all duration-200 ${
              localDarkMode 
                ? 'bg-zinc-950 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.25)]' 
                : 'bg-emerald-50 border border-emerald-300 shadow-sm'
            }`}>
              <MessageSquare className={`w-5 h-5 ${localDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
              {totalUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-black text-[9px] font-mono font-black flex items-center justify-center animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.9)]">
                  {totalUnreadCount}
                </span>
              )}
            </div>
            
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className={`text-base font-black brand-title tracking-wider flex items-center gap-2 ${
                  localDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  <span>STF TEAMS HUD</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                    localDarkMode 
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-500/40' 
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  }`}>
                    v2.5 QUANTUM
                  </span>
                </h2>
                
                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5 border shadow-xs ${
                  localDarkMode 
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_rgba(52,211,153,0.2)]' 
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  EN VIVO
                </span>
              </div>
              
              <p className={`text-[11px] hidden sm:flex items-center gap-2 font-mono ${
                localDarkMode ? 'text-zinc-400' : 'text-slate-500 font-medium'
              }`}>
                <span>Coordinación en tiempo real • Calidad ZF / Lavandería / Despacho / Colecciones</span>
                <span className={localDarkMode ? 'text-emerald-400' : 'text-emerald-700 font-bold'}>● 8ms SYNC</span>
              </p>
            </div>
          </div>

          {/* Controls: Mode Switcher, Mute & Close */}
          <div className="flex items-center gap-2">
            
            {/* BOTÓN MODO CLARO / OSCURO INTEGRADO */}
            <button
              type="button"
              onClick={handleToggleTheme}
              className={`px-3 py-1.5 rounded-2xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-all duration-150 cursor-pointer shadow-sm hover:scale-105 active:scale-95 ${
                localDarkMode 
                  ? 'border-amber-500/40 bg-zinc-950 text-amber-300 hover:bg-amber-950/30 hover:border-amber-400 hover:shadow-[0_0_12px_rgba(245,158,11,0.25)]' 
                  : 'border-indigo-300 bg-slate-100 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-400 hover:shadow-xs'
              }`}
              title={localDarkMode ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
            >
              {localDarkMode ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline font-bold">MODO CLARO</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-600" />
                  <span className="hidden sm:inline font-bold">MODO OSCURO</span>
                </>
              )}
            </button>

            {/* Sound Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(prev => !prev)}
              className={`p-2 rounded-2xl border transition cursor-pointer ${
                localDarkMode 
                  ? 'border-zinc-800 hover:border-emerald-500/40 bg-zinc-950 text-zinc-400 hover:text-white' 
                  : 'border-slate-300 hover:border-emerald-500 bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
              title={soundEnabled ? "Silenciar sonido" : "Activar sonido"}
            >
              {soundEnabled ? (
                <Volume2 className={`w-4 h-4 ${localDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
              ) : (
                <VolumeX className="w-4 h-4 text-zinc-400" />
              )}
            </button>

            {/* Notification Test / Permission Toggle */}
            <button
              type="button"
              onClick={async () => {
                if (!notificationsGranted) {
                  const granted = await notificationService.requestNotificationPermission();
                  setNotificationsGranted(granted);
                } else {
                  notificationService.testNotificationWithSound(activeUser.nombre);
                }
              }}
              className={`p-2 rounded-2xl border transition cursor-pointer ${
                notificationsGranted
                  ? localDarkMode 
                    ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-400 hover:bg-emerald-950/80 shadow-[0_0_10px_rgba(52,211,153,0.3)]' 
                    : 'border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : localDarkMode 
                    ? 'border-zinc-800 hover:border-emerald-500/40 bg-zinc-950 text-zinc-400 hover:text-white' 
                    : 'border-slate-300 hover:border-emerald-500 bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
              title={notificationsGranted ? "Notificaciones activadas. Clic para probar alerta sonora y push" : "Activar notificaciones en pantalla y sonido"}
            >
              <Bell className={`w-4 h-4 ${notificationsGranted ? 'text-emerald-400' : 'text-zinc-400'}`} />
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className={`px-3 sm:px-3.5 py-1.5 rounded-2xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-all duration-150 cursor-pointer shadow-sm hover:scale-105 active:scale-95 ${
                localDarkMode 
                  ? 'border-emerald-500/40 bg-zinc-950 hover:bg-emerald-500/10 text-emerald-400' 
                  : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Cerrar Chat</span>
              <span className="xs:hidden">Cerrar</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BANNER INFORMATIVO PARA ACTIVAR NOTIFICACIONES EN MÓVIL Y PC */}
        {/* ========================================================================= */}
        {!notificationsGranted && (
          <div className="bg-gradient-to-r from-emerald-950/90 via-teal-950/90 to-zinc-950 border-b border-emerald-500/30 px-3.5 sm:px-6 py-2 flex items-center justify-between gap-3 text-xs font-mono backdrop-blur-md">
            <div className="flex items-center gap-2 min-w-0">
              <Bell className="w-4 h-4 text-emerald-400 animate-bounce shrink-0" />
              <div className="min-w-0">
                <span className="font-black text-emerald-300 mr-1.5 uppercase">Activar Notificaciones:</span>
                <span className="text-zinc-300 text-[11px] truncate hidden sm:inline">Recibe avisos sonoros y alertas en pantalla bloqueada y barra superior de tu celular o computador.</span>
                <span className="text-zinc-300 text-[10px] truncate sm:hidden">Recibe avisos con sonido y en pantalla bloqueada.</span>
              </div>
            </div>
            <button
              type="button"
              onClick={async () => {
                const granted = await notificationService.requestNotificationPermission();
                setNotificationsGranted(granted);
              }}
              className="px-3 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[10px] sm:text-[11px] font-mono uppercase tracking-wider shrink-0 transition cursor-pointer shadow-md hover:scale-105 active:scale-95"
            >
              Activar Ahora
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MAIN BODY: 2 COLUMNS (SIDEBAR + EXPANSIVE CONVERSATION SCREEN) */}
        {/* ========================================================================= */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* ========================================================================= */}
          {/* LEFT SIDEBAR: CHAT LIST & ROOMS */}
          {/* ========================================================================= */}
          <div className={`${mobileChatView === 'conversation' ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-[380px] xl:w-[420px] border-r flex-col shrink-0 transition-colors duration-200 ${
            localDarkMode 
              ? 'border-zinc-800/80 bg-[#070b13]' 
              : 'border-slate-200 bg-slate-50/90'
          }`}>
            
            {/* User Badge & Header Controls */}
            <div className={`p-3.5 border-b flex items-center justify-between gap-2 transition-colors duration-200 ${
              localDarkMode ? 'border-zinc-800/80 bg-[#0a0f1a]/80' : 'border-slate-200 bg-white'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 text-black flex items-center justify-center font-bold text-xs font-mono shadow-[0_0_10px_rgba(52,211,153,0.4)]">
                    {getInitials(activeUser.nombre)}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-black animate-pulse" />
                </div>
                <div>
                  <span className={`text-xs font-black uppercase font-mono block ${
                    localDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    {activeUser.nombre}
                  </span>
                  <span className={`text-[9.5px] uppercase font-mono tracking-wider ${
                    localDarkMode ? 'text-emerald-400' : 'text-emerald-700 font-bold'
                  }`}>
                    {activeUser.area} • ONLINE
                  </span>
                </div>
              </div>

              <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                localDarkMode 
                  ? 'text-zinc-400 bg-zinc-900 border-zinc-800' 
                  : 'text-slate-700 bg-slate-100 border-slate-200'
              }`}>
                {activeUser.rol}
              </span>
            </div>

            {/* Chats Title & Search */}
            <div className={`p-3.5 space-y-2.5 border-b transition-colors duration-200 ${
              localDarkMode ? 'border-zinc-800/80' : 'border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-sm font-black tracking-wider uppercase font-mono flex items-center gap-2 ${
                  localDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  <span className={localDarkMode ? 'text-emerald-400' : 'text-emerald-600'}>⚡</span>
                  <span>Canales & Mensajería</span>
                </h3>
                {totalUnreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-black text-[9.5px] font-mono font-black animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]">
                    {totalUnreadCount} PENDIENTES
                  </span>
                )}
              </div>

              {/* Search input */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Escanear chats, OPs o canales..."
                  className={`w-full rounded-2xl pl-8 pr-3 py-2 text-xs transition font-mono shadow-inner border focus:outline-none ${
                    localDarkMode 
                      ? 'bg-[#0c121e] border-zinc-800 focus:border-emerald-500/60 text-white placeholder-zinc-500 focus:ring-1 focus:ring-emerald-500/30' 
                      : 'bg-white border-slate-300 focus:border-emerald-600 text-slate-900 placeholder-slate-400 focus:ring-1 focus:ring-emerald-500/20'
                  }`}
                />
                <Search className={`w-3.5 h-3.5 absolute left-3 top-2.5 ${localDarkMode ? 'text-emerald-400' : 'text-slate-400'}`} />
              </div>

              {/* 4 Cyber Navigation Tabs */}
              <div className="grid grid-cols-4 gap-1 select-none pt-0.5">
                {[
                  { id: 'TODOS', label: 'TODOS', count: totalUnreadCount },
                  { id: 'NO_LEIDOS', label: 'NO LEÍDOS', count: totalUnreadCount },
                  { id: 'SALAS', label: '# SALAS', count: channelsUnreadCount },
                  { id: 'DIRECTOS', label: 'DIRECTOS', count: directsUnreadCount }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      const tabId = tab.id as ChatTab;
                      setActiveTab(tabId);
                      if (tabId === 'DIRECTOS' && !isDirectRoom) {
                        const targetUser = filteredDirectUsers[0] || otherDirectUsers[0];
                        if (targetUser) {
                          setSelectedRoomId(targetUser.id);
                          setIsDirectRoom(true);
                          chatService.markAsRead(targetUser.id, true, activeUser.id);
                        }
                      } else if (tabId === 'SALAS' && isDirectRoom) {
                        setSelectedRoomId('general');
                        setIsDirectRoom(false);
                        chatService.markAsRead('general', false, activeUser.id);
                      }
                    }}
                    className={`py-1.5 px-1 rounded-xl transition-all duration-150 cursor-pointer font-mono text-[9.5px] font-black flex flex-col items-center justify-center gap-0.5 border ${
                      activeTab === tab.id
                        ? localDarkMode 
                          ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.35)] ring-1 ring-emerald-500/40'
                          : 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : localDarkMode
                          ? 'bg-[#0c121e] border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.count > 0 && (
                      <span className={`px-1.5 py-0.1 rounded-full text-[8.5px] font-black ${
                        activeTab === tab.id
                          ? localDarkMode ? 'bg-emerald-400 text-black' : 'bg-white text-emerald-800'
                          : localDarkMode 
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                            : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* List of Channels and Direct Contacts */}
            <div className="flex-1 overflow-y-auto px-3 space-y-1.5 custom-scroll pb-4">
              
              {/* Empty state for No Leídos */}
              {activeTab === 'NO_LEIDOS' && filteredChannels.length === 0 && filteredDirectUsers.length === 0 && (
                <div className="p-8 text-center text-zinc-500 space-y-2">
                  <CheckCheck className={`w-8 h-8 mx-auto ${localDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  <p className={`text-xs font-mono font-bold ${localDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>Al día con tus mensajes</p>
                  <p className={`text-[10px] ${localDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>No tienes mensajes sin abrir en este momento.</p>
                </div>
              )}

              {/* Official STF Channels Section */}
              {activeTab !== 'DIRECTOS' && (
                <div className="space-y-1.5">
                  {filteredChannels.map(channel => {
                    const isSelected = !isDirectRoom && selectedRoomId === channel.id;
                    const lastInfo = chatService.getRoomLastMessage(channel.id, false, activeUser.id);
                    const unread = lastInfo?.unreadCount || 0;

                    return (
                      <div
                        key={channel.id}
                        onClick={() => {
                          setSelectedRoomId(channel.id);
                          setIsDirectRoom(false);
                          chatService.markAsRead(channel.id, false, activeUser.id);
                          setMobileChatView('conversation');
                        }}
                        className={`p-3 rounded-2xl transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 ${
                          unread > 0
                            ? localDarkMode
                              ? 'border-2 border-emerald-400 ring-2 ring-emerald-400/50 shadow-[0_0_16px_rgba(52,211,153,0.35)] bg-emerald-950/40'
                              : 'border-2 border-emerald-500 ring-2 ring-emerald-500/30 shadow-md bg-emerald-50'
                            : isSelected
                              ? localDarkMode
                                ? 'bg-zinc-900 border border-zinc-700 shadow-md ring-1 ring-zinc-600'
                                : 'bg-white border-2 border-emerald-600 shadow-md ring-1 ring-emerald-600/30'
                              : localDarkMode
                                ? 'bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/60'
                                : 'bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-100/70 shadow-xs'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 ${
                            localDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-100 border-slate-200'
                          }`}>
                            {renderChannelIcon(channel.icono, channel.color)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <h5 className={`text-xs font-mono truncate ${
                                unread > 0 
                                  ? localDarkMode ? 'font-black text-emerald-300' : 'font-black text-emerald-800' 
                                  : localDarkMode ? 'font-bold text-zinc-200' : 'font-bold text-slate-900'
                              }`}>
                                {channel.nombre}
                              </h5>
                              {lastInfo?.timestamp && (
                                <span className={`text-[10px] font-mono shrink-0 ${
                                  unread > 0 
                                    ? localDarkMode ? 'text-emerald-400 font-bold' : 'text-emerald-700 font-bold' 
                                    : localDarkMode ? 'text-zinc-400' : 'text-slate-400'
                                }`}>
                                  {lastInfo.timestamp}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between gap-1 mt-0.5">
                              <p className={`text-[10.5px] truncate max-w-[200px] ${
                                unread > 0 
                                  ? localDarkMode ? 'text-white font-bold' : 'text-slate-900 font-bold' 
                                  : localDarkMode ? 'text-zinc-400' : 'text-slate-600'
                              }`}>
                                {lastInfo?.text || channel.descripcion}
                              </p>
                              {unread > 0 && (
                                <span className="w-5 h-5 rounded-full bg-emerald-500 text-black font-mono font-black text-[10.5px] flex items-center justify-center shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                                  {unread}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Direct Messages Section */}
              {activeTab !== 'SALAS' && (
                <div className="space-y-1.5 pt-1">
                  {filteredDirectUsers.map(user => {
                    const isSelected = isDirectRoom && selectedRoomId === user.id;
                    const lastInfo = chatService.getRoomLastMessage(user.id, true, activeUser.id);
                    const unread = lastInfo?.unreadCount || 0;

                    return (
                      <div
                        key={user.id}
                        onClick={() => {
                          setSelectedRoomId(user.id);
                          setIsDirectRoom(true);
                          chatService.markAsRead(user.id, true, activeUser.id);
                          setMobileChatView('conversation');
                        }}
                        className={`p-3 rounded-2xl transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 ${
                          unread > 0
                            ? localDarkMode
                              ? 'border-2 border-emerald-400 ring-2 ring-emerald-400/50 shadow-[0_0_16px_rgba(52,211,153,0.35)] bg-emerald-950/40'
                              : 'border-2 border-emerald-500 ring-2 ring-emerald-500/30 shadow-md bg-emerald-50'
                            : isSelected
                              ? localDarkMode
                                ? 'bg-zinc-900 border border-zinc-700 shadow-md ring-1 ring-zinc-600'
                                : 'bg-white border-2 border-emerald-600 shadow-md ring-1 ring-emerald-600/30'
                              : localDarkMode
                                ? 'bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/60'
                                : 'bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-100/70 shadow-xs'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="relative shrink-0">
                            <div className={`w-9 h-9 rounded-full border flex items-center justify-center font-bold text-xs font-mono ${
                              localDarkMode 
                                ? 'bg-zinc-900 border-zinc-700 text-zinc-200' 
                                : 'bg-slate-200 border-slate-300 text-slate-800'
                            }`}>
                              {getInitials(user.nombre)}
                            </div>
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0c1017] dark:border-white shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <h5 className={`text-xs uppercase font-mono tracking-tight truncate ${
                                unread > 0
                                  ? localDarkMode ? 'font-black text-emerald-300' : 'font-black text-emerald-800'
                                  : localDarkMode ? 'font-bold text-zinc-200' : 'font-bold text-slate-900'
                              }`}>
                                {user.nombre}
                              </h5>

                              {lastInfo?.timestamp && (
                                <span className={`text-[10px] font-mono shrink-0 ${
                                  unread > 0 
                                    ? localDarkMode ? 'text-emerald-400 font-bold' : 'text-emerald-700 font-bold' 
                                    : localDarkMode ? 'text-zinc-400' : 'text-slate-400'
                                }`}>
                                  {lastInfo.timestamp}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center justify-between gap-1 mt-0.5">
                              <p className={`text-[10.5px] truncate max-w-[200px] ${
                                unread > 0
                                  ? localDarkMode ? 'text-white font-bold' : 'text-slate-900 font-bold'
                                  : localDarkMode ? 'text-zinc-400' : 'text-slate-600'
                              }`}>
                                {lastInfo?.text || `${user.rol} • ${user.area}`}
                              </p>

                              {unread > 0 && (
                                <span className="w-5 h-5 rounded-full bg-emerald-500 text-black font-mono font-black text-[10.5px] flex items-center justify-center shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                                  {unread}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>

            {/* Bottom Status Footer */}
            <div className={`p-3 border-t flex items-center justify-between text-[10px] font-mono transition-colors duration-200 ${
              localDarkMode ? 'border-zinc-800 bg-zinc-950 text-zinc-400' : 'border-slate-200 bg-slate-100 text-slate-600 font-semibold'
            }`}>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>STF Conectado</span>
              </span>
              <span>v2.5 Live Sync</span>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* RIGHT PANEL: CONVERSATION WINDOW (EXPANSIVE COMMAND CENTER) */}
          {/* ========================================================================= */}
          <div className={`${mobileChatView === 'list' ? 'hidden md:flex' : 'flex'} flex-1 flex-col overflow-hidden transition-colors duration-200 ${
            localDarkMode ? 'bg-[#060a12]' : 'bg-slate-100/70'
          }`}>
            
            {/* Conversation Header */}
            <div className={`px-3 sm:px-6 py-2.5 sm:py-3.5 border-b flex items-center justify-between gap-2.5 sm:gap-3 backdrop-blur-md transition-colors duration-200 ${
              localDarkMode ? 'border-zinc-800/80 bg-[#090f1c]/90' : 'border-slate-200 bg-white shadow-xs'
            }`}>
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                {/* Back button on mobile to return to chat list */}
                <button
                  type="button"
                  onClick={() => setMobileChatView('list')}
                  className="md:hidden p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 transition cursor-pointer shrink-0"
                  title="Volver a canales y chats"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <div className={`w-9 h-9 rounded-2xl border flex items-center justify-center font-bold text-xs font-mono shadow-md shrink-0 ${
                  isDirectRoom && selectedRoomId === activeUser.id
                    ? 'bg-emerald-500 text-black border-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.6)]'
                    : localDarkMode 
                      ? 'bg-zinc-950 border-emerald-500/30 text-emerald-400' 
                      : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                }`}>
                  {isDirectRoom ? getInitials(currentDirectUser?.nombre || 'DM') : '#'}
                </div>
                <div>
                  <h4 className={`text-sm font-black uppercase font-mono tracking-wider flex items-center gap-2 ${
                    localDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    <span>{isDirectRoom ? currentDirectUser?.nombre : currentChannel?.nombre}</span>
                    {isDirectRoom && selectedRoomId === activeUser.id ? (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500 text-black font-black font-mono shadow-[0_0_8px_rgba(52,211,153,0.6)]">
                        CANAL PRIVADO
                      </span>
                    ) : isDirectRoom ? (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500 text-black font-black font-mono shadow-[0_0_8px_rgba(52,211,153,0.6)] flex items-center gap-1">
                        <span>🔒</span>
                        <span>DIRECTO PRIVADO</span>
                      </span>
                    ) : (
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-bold border ${
                        localDarkMode 
                          ? 'bg-cyan-950 text-cyan-300 border-cyan-500/40' 
                          : 'bg-cyan-100 text-cyan-800 border-cyan-300'
                      }`}>
                        SALA ACTIVA
                      </span>
                    )}
                  </h4>
                  <p className={`text-[10.5px] flex items-center gap-1.5 font-mono ${
                    localDarkMode ? 'text-zinc-400' : 'text-slate-500 font-medium'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="truncate max-w-xs sm:max-w-md lg:max-w-xl">
                      {isDirectRoom && selectedRoomId === activeUser.id
                        ? 'Notas personales y trazabilidad de borradores'
                        : isDirectRoom
                          ? `${currentDirectUser?.rol || 'OPERARIO'} • ${currentDirectUser?.area || 'STF GROUP'} • Mensajería privada en tiempo real`
                          : (currentChannel?.descripcion || 'Canal general de trazabilidad')}
                    </span>
                  </p>
                </div>
              </div>

              {/* Filter Solo OPs Toggle */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFilterOnlyOps(prev => !prev)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer border ${
                    filterOnlyOps
                      ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)] font-black'
                      : localDarkMode
                        ? 'bg-[#0c121e] border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                        : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                  }`}
                  title="Filtrar mensajes que contienen OPs"
                >
                  <Filter className="w-3.5 h-3.5 text-amber-500" />
                  <span>Solo OPs</span>
                </button>
              </div>
            </div>

            {/* Conversation Feed */}
            <div className={`flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-4 custom-scroll ${
              localDarkMode 
                ? 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0b1325]/40 via-[#060a12] to-[#04060c]' 
                : 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-slate-50 to-slate-100'
            }`}>
              
              {/* Date separator */}
              <div className="flex justify-center my-1">
                <span className={`px-3.5 py-1 rounded-full text-[9.5px] font-mono font-bold uppercase shadow-sm border ${
                  localDarkMode 
                    ? 'bg-[#0c121e] border-zinc-800 text-emerald-400' 
                    : 'bg-white border-slate-300 text-emerald-700 shadow-xs'
                }`}>
                  ⚡ CANAL ENCRIPTO • SESIÓN HOY
                </span>
              </div>

              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-2">
                  <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center mb-2 ${
                    localDarkMode ? 'bg-zinc-950 border-zinc-800 text-emerald-400' : 'bg-white border-slate-300 text-emerald-600 shadow-sm'
                  }`}>
                    <MessageSquare className="w-6 h-6 stroke-[1.5]" />
                  </div>
                  <p className={`text-xs font-mono ${localDarkMode ? 'text-zinc-300' : 'text-slate-700 font-bold'}`}>No hay transmisiones en esta sala todavía.</p>
                  <p className={`text-[11px] font-mono ${localDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>Envía un mensaje, adjunta una OP activa o graba una nota de voz.</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isMe = msg.remitenteId === activeUser.id || msg.remitente === activeUser.nombre;

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-2.5 ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in duration-150`}
                    >
                      {/* Avatar for other sender */}
                      {!isMe && (
                        <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-[10.5px] font-bold font-mono shrink-0 mt-0.5 ${
                          localDarkMode 
                            ? 'bg-zinc-950 border-cyan-500/40 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.25)]' 
                            : 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm'
                        }`}>
                          {getInitials(msg.remitente)}
                        </div>
                      )}

                      <div className={`max-w-[85%] sm:max-w-[70%] lg:max-w-[60%] space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                        
                        {/* Sender name label */}
                        {!isMe && (
                          <div className="flex items-center gap-1.5 px-1 text-[10px]">
                            <span className={`font-black uppercase font-mono ${
                              localDarkMode ? 'text-cyan-400' : 'text-indigo-800'
                            }`}>
                              {msg.remitente}
                            </span>
                            <span className={`font-mono uppercase ${
                              localDarkMode ? 'text-zinc-500' : 'text-slate-500'
                            }`}>
                              • {msg.area}
                            </span>
                          </div>
                        )}

                        {/* Bubble Content */}
                        <div
                          className={`p-3.5 sm:p-4 rounded-3xl border text-xs sm:text-[13px] leading-relaxed shadow-md transition ${
                            isMe
                              ? localDarkMode 
                                ? 'bg-gradient-to-r from-emerald-950/90 to-teal-950/80 border-emerald-500/40 text-white rounded-tr-xs shadow-[0_0_15px_rgba(16,185,129,0.12)]' 
                                : 'bg-emerald-700 border-emerald-800 text-white rounded-tr-xs shadow-md'
                              : localDarkMode
                                ? 'bg-[#0d1627]/90 border-cyan-500/30 text-zinc-100 rounded-tl-xs shadow-[0_0_12px_rgba(6,182,212,0.08)]'
                                : 'bg-white border-slate-200 text-slate-900 rounded-tl-xs shadow-sm'
                          }`}
                        >
                          {/* Attached OP Card Badge */}
                          {msg.opRelacionada && (
                            <div 
                              onClick={() => handleInspectOpFromMessage(msg.opRelacionada!)}
                              className={`mb-2.5 p-2.5 rounded-2xl border flex items-center justify-between gap-2 cursor-pointer transition-all duration-150 group ${
                                localDarkMode 
                                  ? 'bg-black/60 border-amber-500/40 hover:border-amber-300 hover:shadow-[0_0_16px_rgba(245,158,11,0.35)]' 
                                  : 'bg-amber-50 border-amber-300 hover:bg-amber-100 hover:border-amber-400 shadow-xs'
                              }`}
                              title="Haz clic para ver la información en tiempo real de esta OP"
                            >
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-500 group-hover:bg-amber-500 group-hover:text-black transition">
                                  <Tag className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <span className={`font-mono font-black text-xs tracking-wider block ${
                                    localDarkMode ? 'text-amber-400' : 'text-amber-900'
                                  }`}>
                                    {msg.opRelacionada}
                                  </span>
                                  <span className={`text-[9.5px] block font-mono ${
                                    localDarkMode ? 'text-zinc-400' : 'text-amber-800/80'
                                  }`}>
                                    Toca para ver datos en tiempo real
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                                  localDarkMode 
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                                    : 'bg-amber-200 text-amber-900 border-amber-300'
                                }`}>
                                  TELEMETRÍA OP
                                </span>
                                <ExternalLink className="w-3 h-3 text-amber-500 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
                              </div>
                            </div>
                          )}

                          {/* Audio Voice Note Player */}
                          {msg.tipo === 'audio' ? (
                            <div className="flex items-center gap-3 py-1">
                              <button
                                type="button"
                                onClick={() => handlePlayAudio(msg.id, msg.audioUrl)}
                                className="w-9 h-9 rounded-full bg-amber-500 hover:bg-amber-400 text-black flex items-center justify-center shrink-0 transition cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                              >
                                {playingAudioId === msg.id ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-black ml-0.5" />}
                              </button>

                              <div className="space-y-1 min-w-[140px]">
                                <div className={`flex items-center justify-between text-[10px] font-mono font-bold ${
                                  isMe && !localDarkMode ? 'text-emerald-100' : 'text-amber-400'
                                }`}>
                                  <span>Nota de voz</span>
                                  <span>0:00 / 0:08</span>
                                </div>
                                <div className="flex items-center gap-0.5 h-3">
                                  {[40, 70, 90, 60, 100, 50, 80, 45, 95, 30, 85, 60, 40].map((h, idx) => (
                                    <div
                                      key={idx}
                                      className={`w-1 rounded-full ${
                                        playingAudioId === msg.id 
                                          ? 'bg-amber-400 animate-pulse' 
                                          : isMe && !localDarkMode ? 'bg-emerald-200' : 'bg-amber-500/60'
                                      }`}
                                      style={{ height: `${h}%` }}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          ) : msg.tipo === 'archivo' && msg.archivoUrl ? (
                            <div className="space-y-2">
                              {msg.archivoTipo === 'imagen' ? (
                                <img
                                  src={msg.archivoUrl}
                                  alt="Adjunto"
                                  className="rounded-2xl max-h-48 object-cover border border-zinc-700 cursor-pointer hover:opacity-90 transition"
                                  onClick={() => window.open(msg.archivoUrl, '_blank')}
                                />
                              ) : (
                                <div className={`flex items-center gap-2 p-2 rounded-xl border ${
                                  localDarkMode ? 'bg-black/60 border-zinc-800' : 'bg-slate-100 border-slate-200'
                                }`}>
                                  <FileText className="w-5 h-5 text-indigo-400" />
                                  <span className="font-mono text-xs truncate">{msg.archivoNombre || 'Documento'}</span>
                                </div>
                              )}
                              {msg.mensaje && <p>{msg.mensaje}</p>}
                            </div>
                          ) : (
                            <p className="font-sans whitespace-pre-wrap">{msg.mensaje}</p>
                          )}

                          {/* Timestamp & Double Checkmark */}
                          <div className={`flex items-center gap-1 text-[9.5px] font-mono mt-1 pt-0.5 ${
                            isMe 
                              ? localDarkMode ? 'justify-end text-emerald-300' : 'justify-end text-emerald-100' 
                              : localDarkMode ? 'justify-end text-zinc-400' : 'justify-end text-slate-400'
                          }`}>
                            <span>{msg.timestamp}</span>
                            {isMe && (
                              msg.leido ? (
                                <CheckCheck className={`w-3.5 h-3.5 ${localDarkMode ? 'text-cyan-400' : 'text-cyan-200'}`} title="Leído por destinatario" />
                              ) : (
                                <Check className={`w-3.5 h-3.5 ${localDarkMode ? 'text-emerald-400/70' : 'text-emerald-100/70'}`} title="Enviado a servidor" />
                              )
                            )}
                          </div>
                        </div>

                      </div>

                      {/* Avatar for active user */}
                      {isMe && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 text-black flex items-center justify-center text-[10.5px] font-bold font-mono shrink-0 mt-0.5 shadow-[0_0_10px_rgba(52,211,153,0.4)]">
                          {getInitials(activeUser.nombre)}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Attachment preview if any */}
            {(attachedOp || attachedFile) && (
              <div className={`px-4 py-2 border-t flex items-center gap-2 flex-wrap text-xs font-mono ${
                localDarkMode ? 'bg-[#0a0f1d] border-zinc-800' : 'bg-slate-50 border-slate-200'
              }`}>
                {attachedOp && (
                  <span className={`px-2.5 py-1 rounded-xl flex items-center gap-1.5 font-bold border shadow-xs ${
                    localDarkMode 
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.3)]' 
                      : 'bg-amber-100 text-amber-900 border-amber-300'
                  }`}>
                    <Tag className="w-3 h-3" />
                    <span>OP: {attachedOp}</span>
                    <button type="button" onClick={() => setAttachedOp(null)} className="ml-1 opacity-70 hover:opacity-100">✕</button>
                  </span>
                )}
                {attachedFile && (
                  <span className={`px-2.5 py-1 rounded-xl flex items-center gap-1.5 font-bold border ${
                    localDarkMode 
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50' 
                      : 'bg-indigo-100 text-indigo-900 border-indigo-300'
                  }`}>
                    <Paperclip className="w-3 h-3" />
                    <span className="truncate max-w-[150px]">{attachedFile.name}</span>
                    <button type="button" onClick={() => setAttachedFile(null)} className="ml-1 opacity-70 hover:opacity-100">✕</button>
                  </span>
                )}
              </div>
            )}

            {/* Voice Recording Live HUD Bar */}
            {isRecording && (
              <div className="px-4 py-3 bg-rose-950/90 border-t border-rose-500/50 flex items-center justify-between gap-3 animate-in fade-in duration-150">
                <div className="flex items-center gap-2 text-rose-300 font-mono text-xs font-bold">
                  <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.9)]" />
                  <span>Grabando audio cuántico: 0:{String(recordingDuration).padStart(2, '0')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={cancelRecording}
                    className="px-3 py-1 rounded-xl bg-zinc-900 text-zinc-300 hover:text-white text-xs font-mono font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="px-3 py-1 rounded-xl bg-rose-500 text-white text-xs font-mono font-black shadow-md flex items-center gap-1"
                  >
                    <Send className="w-3 h-3" />
                    <span>Enviar Nota</span>
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* FUTURISTIC COMMAND INPUT BAR */}
            {/* ========================================================================= */}
            <form onSubmit={handleSendMessage} className={`p-3 sm:p-4 border-t flex items-center gap-2 relative backdrop-blur-md transition-colors duration-200 ${
              localDarkMode ? 'bg-[#0a0f1d] border-zinc-800/80' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              
              {/* 1. BUTTON '+' (Attach photo / document) */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`w-10 h-10 rounded-2xl border flex items-center justify-center transition cursor-pointer shadow-xs shrink-0 ${
                  localDarkMode 
                    ? 'bg-zinc-950 border-zinc-800 hover:border-emerald-500/40 text-zinc-300 hover:text-white' 
                    : 'bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-700 hover:text-slate-900'
                }`}
                title="Adjuntar imagen o archivo"
              >
                <Plus className="w-5 h-5" />
              </button>

              {/* 2. BUTTON '🎙️' (Record Voice Note) */}
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-10 h-10 rounded-2xl border flex items-center justify-center transition cursor-pointer shadow-xs shrink-0 ${
                  isRecording
                    ? 'bg-rose-500 text-white border-rose-400 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.6)]'
                    : localDarkMode
                      ? 'bg-zinc-950 border-zinc-800 hover:border-emerald-500/40 text-zinc-300 hover:text-white'
                      : 'bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-700 hover:text-slate-900'
                }`}
                title="Grabar nota de voz"
              >
                <Mic className="w-5 h-5" />
              </button>

              {/* 3. BUTTON '+ OP ▾' (Active OPs Dropdown Picker) */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setIsOpDropdownOpen(prev => !prev)}
                  className={`px-3.5 py-2.5 rounded-2xl border font-mono font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs ${
                    attachedOp
                      ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.5)] font-black'
                      : localDarkMode
                        ? 'bg-zinc-950 border-zinc-800 hover:border-amber-500/50 text-zinc-300 hover:text-amber-400'
                        : 'bg-slate-100 border-slate-300 hover:border-amber-500/50 text-slate-700 hover:text-amber-700'
                  }`}
                  title="Citar una OP activa de la base de datos"
                >
                  <Tag className="w-3.5 h-3.5 text-amber-500" />
                  <span>+ OP</span>
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </button>

                {/* Floating OP Selection Popover */}
                {isOpDropdownOpen && (
                  <div className={`absolute bottom-full left-0 mb-2 z-50 rounded-3xl p-3.5 shadow-2xl w-80 sm:w-96 font-sans animate-in fade-in zoom-in-95 duration-150 border ${
                    localDarkMode 
                      ? 'bg-[#080d17] border-amber-500/40 ring-1 ring-amber-500/30 text-white' 
                      : 'bg-white border-slate-300 ring-1 ring-slate-200 text-slate-900 shadow-2xl'
                  }`}>
                    <div className={`flex items-center justify-between pb-2 border-b ${
                      localDarkMode ? 'border-zinc-800' : 'border-slate-200'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        <Tag className="w-4 h-4 text-amber-500" />
                        <span className={`text-xs font-black font-mono uppercase ${
                          localDarkMode ? 'text-white' : 'text-slate-900'
                        }`}>
                          OPs en Proceso ({solicitudes.length})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsOpDropdownOpen(false)}
                        className={`text-xs font-bold ${localDarkMode ? 'text-zinc-400 hover:text-white' : 'text-slate-400 hover:text-slate-900'}`}
                      >
                        ✕
                      </button>
                    </div>

                    {/* Filter tabs */}
                    <div className="flex items-center gap-1 py-2 overflow-x-auto custom-scroll text-[10px] font-mono">
                      {[
                        { id: 'TODAS', label: `Todas (${solicitudes.length})` },
                        { id: 'LAVANDERIA', label: 'Lavandería' },
                        { id: 'CALIDAD', label: 'Calidad' },
                        { id: 'ATELIER', label: 'Atelier / Corte' }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setOpDropdownTab(tab.id as any)}
                          className={`px-2.5 py-1 rounded-lg transition font-bold shrink-0 cursor-pointer ${
                            opDropdownTab === tab.id
                              ? 'bg-amber-500 text-black font-black shadow-xs'
                              : localDarkMode 
                                ? 'bg-zinc-900 text-zinc-400 hover:text-white' 
                                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Search Input */}
                    <div className="py-1">
                      <input
                        type="text"
                        value={opSearchQuery}
                        onChange={(e) => setOpSearchQuery(e.target.value)}
                        placeholder="Buscar por OP, tela, ref o inspector..."
                        className={`w-full rounded-xl px-3 py-1.5 text-xs font-mono border focus:outline-none ${
                          localDarkMode 
                            ? 'bg-[#0c121e] border-zinc-800 text-white placeholder-zinc-500 focus:border-amber-500' 
                            : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-amber-600'
                        }`}
                      />
                    </div>

                    {/* List of Real-Time OPs from Database */}
                    <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scroll pr-1 mt-1">
                      {filteredActiveOps.length === 0 ? (
                        <div className={`p-4 text-center text-xs font-mono ${localDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                          No se encontraron OPs con ese criterio.
                        </div>
                      ) : (
                        filteredActiveOps.map(opItem => (
                          <div
                            key={opItem.id}
                            onClick={() => {
                              setAttachedOp(opItem.op);
                              setIsOpDropdownOpen(false);
                            }}
                            className={`p-2.5 rounded-2xl border transition cursor-pointer text-xs group ${
                              localDarkMode 
                                ? 'border-zinc-800 hover:border-amber-500/50 hover:bg-[#0c121e]' 
                                : 'border-slate-200 hover:border-amber-400 hover:bg-amber-50/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`font-mono font-black text-xs ${
                                localDarkMode ? 'text-amber-400 group-hover:text-amber-300' : 'text-amber-900 group-hover:text-amber-700'
                              }`}>
                                {opItem.op}
                              </span>
                              <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full uppercase font-bold border ${
                                localDarkMode ? 'bg-zinc-900 text-zinc-300 border-zinc-800' : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}>
                                {opItem.estado}
                              </span>
                            </div>
                            <div className={`text-[10.5px] font-medium truncate mt-0.5 ${
                              localDarkMode ? 'text-zinc-300' : 'text-slate-700'
                            }`}>
                              {opItem.referencia} • {opItem.tela}
                            </div>
                            <div className={`flex items-center justify-between text-[9.5px] mt-1 font-mono ${
                              localDarkMode ? 'text-zinc-500' : 'text-slate-400'
                            }`}>
                              <span>{opItem.areaActual}</span>
                              <span>{opItem.rollos} rollos</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 4. MAIN INPUT TEXT BAR */}
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={isDirectRoom ? `Transmitir mensaje a ${currentDirectUser?.nombre || 'usuario'}...` : `Transmitir mensaje en ${currentChannel?.nombre || '#sala'}...`}
                className={`flex-1 rounded-2xl px-4 py-2.5 text-xs sm:text-sm transition shadow-inner font-sans border focus:outline-none ${
                  localDarkMode 
                    ? 'bg-[#070b13] border-zinc-800 focus:border-emerald-500/60 text-white placeholder-zinc-500 focus:ring-1 focus:ring-emerald-500/40' 
                    : 'bg-slate-50 border-slate-300 focus:border-emerald-600 text-slate-900 placeholder-slate-400 focus:ring-1 focus:ring-emerald-500/30'
                }`}
              />

              {/* 5. SEND BUTTON */}
              <button
                type="submit"
                disabled={!inputText.trim() && !attachedOp && !attachedFile}
                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition cursor-pointer shadow-md disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95 duration-150 shrink-0 font-black ${
                  localDarkMode 
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black shadow-[0_0_15px_rgba(52,211,153,0.5)]' 
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                }`}
                title="Transmitir mensaje"
              >
                <Send className="w-4 h-4" />
              </button>

            </form>

          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* REAL-TIME OP LIVE INSPECTOR POPUP MODAL */}
      {/* ========================================================================= */}
      {inspectingOp && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className={`border rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden font-sans animate-in zoom-in-95 duration-150 ${
            localDarkMode 
              ? 'bg-[#0c1017] border-amber-500/50 shadow-[0_0_40px_rgba(245,158,11,0.25)] text-white' 
              : 'bg-white border-slate-300 text-slate-900 shadow-2xl'
          }`}>
            
            {/* Header */}
            <div className={`p-4 sm:p-5 border-b flex items-center justify-between gap-3 ${
              localDarkMode ? 'border-zinc-800 bg-zinc-900/90' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500 text-black shadow-md">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={`text-base font-black font-mono tracking-tight ${
                      localDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                      {inspectingOp.op}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold flex items-center gap-1 border ${
                      localDarkMode 
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                        : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      EN TIEMPO REAL
                    </span>
                  </div>
                  <p className={`text-xs ${localDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                    Información sincronizada en vivo con la Base de Datos Maestra
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectingOp(null)}
                className={`p-2 rounded-2xl border transition cursor-pointer ${
                  localDarkMode 
                    ? 'border-zinc-800 text-zinc-400 hover:text-white' 
                    : 'border-slate-300 text-slate-500 hover:text-slate-900'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto custom-scroll">
              
              {/* Current Status Pill */}
              <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                localDarkMode ? 'bg-zinc-900/90 border-zinc-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className={`text-xs font-mono uppercase font-bold ${
                  localDarkMode ? 'text-zinc-400' : 'text-slate-500'
                }`}>
                  Estado Actual:
                </span>
                <span className="px-3 py-1 rounded-xl bg-amber-500 text-black text-xs font-mono font-black shadow-xs">
                  {inspectingOp.estado} • {inspectingOp.areaActual}
                </span>
              </div>

              {/* 4 KPI Grid Cards */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className={`p-3 rounded-2xl border space-y-1 ${
                  localDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className={`text-[10px] font-mono uppercase block ${localDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                    Referencia
                  </span>
                  <span className={`text-xs font-black font-mono block truncate ${localDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {inspectingOp.referencia}
                  </span>
                </div>

                <div className={`p-3 rounded-2xl border space-y-1 ${
                  localDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className={`text-[10px] font-mono uppercase block ${localDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                    Tela & Código MT
                  </span>
                  <span className={`text-xs font-black font-mono block truncate ${localDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {inspectingOp.tela}
                  </span>
                </div>

                <div className={`p-3 rounded-2xl border space-y-1 ${
                  localDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className={`text-[10px] font-mono uppercase block ${localDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                    Rollos & Lote
                  </span>
                  <span className={`text-xs font-black font-mono block ${localDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {inspectingOp.rollos} rollos • Lote {inspectingOp.lote || '1'}
                  </span>
                </div>

                <div className={`p-3 rounded-2xl border space-y-1 ${
                  localDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className={`text-[10px] font-mono uppercase block ${localDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                    Tiempo en Proceso
                  </span>
                  <span className={`text-xs font-black font-mono block ${localDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
                    {inspectingOp.horasEnProceso || 4}h ({inspectingOp.diasHabiles || 0} días)
                  </span>
                </div>
              </div>

              {/* Inspector & Observations */}
              <div className={`p-3.5 rounded-2xl border space-y-2 text-xs ${
                localDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className={localDarkMode ? 'text-zinc-400' : 'text-slate-500'}>Inspector Responsable:</span>
                  <span className={`font-bold ${localDarkMode ? 'text-white' : 'text-slate-900'}`}>{inspectingOp.inspector}</span>
                </div>
                <div className={`pt-2 border-t ${localDarkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
                  <span className={`text-[10px] font-mono block mb-1 ${localDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
                    Observaciones / Trazabilidad:
                  </span>
                  <p className={`text-xs leading-relaxed ${localDarkMode ? 'text-zinc-300' : 'text-slate-700'}`}>
                    {inspectingOp.observacionesOperario || 'Muestra de colcha en proceso normal sin desviaciones reportadas.'}
                  </p>
                </div>
              </div>

            </div>

            {/* Footer Buttons */}
            <div className={`p-4 border-t flex items-center justify-between gap-3 ${
              localDarkMode ? 'border-zinc-800 bg-zinc-900/90' : 'border-slate-200 bg-slate-50'
            }`}>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`${inspectingOp.op} - ${inspectingOp.referencia} - ${inspectingOp.tela} - Estado: ${inspectingOp.estado}`);
                  setCopiedOpAlert(true);
                  setTimeout(() => setCopiedOpAlert(false), 2000);
                }}
                className={`px-4 py-2 rounded-2xl border text-xs font-mono font-bold transition cursor-pointer ${
                  localDarkMode 
                    ? 'border-zinc-800 text-zinc-300 hover:text-white' 
                    : 'border-slate-300 text-slate-700 hover:text-slate-900'
                }`}
              >
                {copiedOpAlert ? '✓ Copiado' : 'Copiar Datos'}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onViewOpDetail) {
                    onViewOpDetail(inspectingOp);
                    setInspectingOp(null);
                  }
                }}
                className="px-5 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black font-mono uppercase shadow-md flex items-center gap-1.5 transition cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Ver Ficha Completa</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
