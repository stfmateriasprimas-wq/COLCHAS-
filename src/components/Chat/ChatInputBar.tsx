import React, { useState, useRef, useEffect } from 'react';
import { 
  Smile, Plus, Mic, Send, Trash2, Check, Paperclip, 
  Image as ImageIcon, Zap, AlertTriangle, StopCircle 
} from 'lucide-react';
import { chatService } from '../../services/chatService';

interface ChatInputBarProps {
  onSendMessage: (text: string) => void;
  onSendVoiceNote: (audioData: { base64: string; duration: number; waveform: number[] }) => void;
  onSendImage: (imageDataUrl: string, imageName: string) => void;
  onOpenOpSelector: () => void;
  disabled?: boolean;
}

const QUICK_EMOJIS = ['👍', '❤️', '👏', '🙏', '😂', '⚠️', '🧵', '⏳', '👕', '🔍', '🚨', '📋', '✅', '❌'];

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
  onSendMessage,
  onSendVoiceNote,
  onSendImage,
  onOpenOpSelector,
  disabled = false
}) => {
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textInputRef = useRef<HTMLTextAreaElement | null>(null);
  const recordingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      chatService.cancelAudioRecording();
    };
  }, []);

  const handleSend = () => {
    if (disabled || !text.trim()) return;
    onSendMessage(text.trim());
    setText('');
    setShowEmojiPicker(false);
    setShowAttachMenu(false);
    if (textInputRef.current) {
      textInputRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Grabación de notas de voz
  const handleStartRecording = async () => {
    if (disabled) return;
    const started = await chatService.startAudioRecording();
    if (started) {
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      alert('Por favor concede permisos para usar el micrófono para enviar notas de voz.');
    }
  };

  const handleStopAndSendRecording = async () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    const audioResult = await chatService.stopAudioRecording();
    if (audioResult) {
      onSendVoiceNote({
        base64: audioResult.base64,
        duration: audioResult.duration,
        waveform: audioResult.waveform
      });
    }
  };

  const handleCancelRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    chatService.cancelAudioRecording();
    setRecordingSeconds(0);
  };

  // Subir imagen
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      onSendImage(result, file.name);
      setShowAttachMenu(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  return (
    <div className="relative bg-[#202c33] border-t border-zinc-700/60 p-2 sm:p-3 select-none">
      
      {/* 1. Selector Rápido de Emojis */}
      {showEmojiPicker && (
        <div className="absolute bottom-full left-2 sm:left-4 mb-2 bg-[#111b21] border border-zinc-700 rounded-2xl p-2.5 shadow-2xl z-30 flex items-center gap-1.5 flex-wrap max-w-xs sm:max-w-sm animate-in fade-in duration-150">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                setText((prev) => prev + emoji);
                setShowEmojiPicker(false);
                if (textInputRef.current) textInputRef.current.focus();
              }}
              className="w-8 h-8 flex items-center justify-center hover:bg-zinc-800 rounded-xl text-lg transition cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* 2. Menú de Adjuntar (+) */}
      {showAttachMenu && (
        <div className="absolute bottom-full left-10 sm:left-14 mb-2 bg-[#111b21] border border-zinc-700 rounded-2xl p-2 shadow-2xl z-30 space-y-1 min-w-[220px] animate-in fade-in duration-150">
          <button
            type="button"
            onClick={() => {
              setShowAttachMenu(false);
              onOpenOpSelector();
            }}
            className="w-full px-3 py-2.5 rounded-xl hover:bg-[#202c33] text-white text-xs font-bold flex items-center gap-2.5 transition text-left cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <span className="block">Vincular OP al Chat</span>
              <span className="text-[10px] text-zinc-400 block font-normal">Retrasos SLA y OPs en proceso</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowAttachMenu(false);
              fileInputRef.current?.click();
            }}
            className="w-full px-3 py-2.5 rounded-xl hover:bg-[#202c33] text-white text-xs font-bold flex items-center gap-2.5 transition text-left cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center group-hover:bg-sky-500 group-hover:text-white transition">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <span className="block">Fotos y Evidencias</span>
              <span className="text-[10px] text-zinc-400 block font-normal">Subir foto de muestra o defecto</span>
            </div>
          </button>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* 3. Modo Grabación de Audio Activo */}
      {isRecording ? (
        <div className="flex items-center justify-between gap-3 bg-[#111b21] rounded-2xl px-4 py-2 border border-rose-500/60 animate-pulse">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping"></span>
            <span className="text-xs font-mono font-bold text-rose-400">
              Grabando nota de voz: {formatSeconds(recordingSeconds)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancelRecording}
              className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 transition cursor-pointer"
              title="Cancelar grabación"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleStopAndSendRecording}
              className="px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Enviar</span>
            </button>
          </div>
        </div>
      ) : (
        /* 4. Barra de Entrada Normal */
        <div className="flex items-end gap-1.5 sm:gap-2">
          
          {/* Botón Emojis */}
          <button
            type="button"
            onClick={() => {
              setShowEmojiPicker(!showEmojiPicker);
              setShowAttachMenu(false);
            }}
            className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800/80 transition cursor-pointer shrink-0"
            title="Emojis rápidos"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* Botón Adjuntar (+) */}
          <button
            type="button"
            onClick={() => {
              setShowAttachMenu(!showAttachMenu);
              setShowEmojiPicker(false);
            }}
            className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800/80 transition cursor-pointer shrink-0"
            title="Adjuntar OP o Imagen"
          >
            <Plus className={`w-5 h-5 transition-transform ${showAttachMenu ? 'rotate-45' : ''}`} />
          </button>

          {/* Input de Texto */}
          <div className="flex-1 bg-[#2a3942] rounded-2xl px-3 sm:px-4 py-2 border border-transparent focus-within:border-emerald-500/80 transition flex items-center min-h-[40px]">
            <textarea
              ref={textInputRef}
              rows={1}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(100, e.target.scrollHeight)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder="Escribe un mensaje..."
              disabled={disabled}
              className="w-full bg-transparent text-[#e9edef] text-xs sm:text-sm placeholder-zinc-400 focus:outline-none resize-none max-h-24 custom-scroll"
            />
          </div>

          {/* Botón de Enviar o Micrófono */}
          {text.trim() ? (
            <button
              type="button"
              onClick={handleSend}
              disabled={disabled}
              className="w-10 h-10 rounded-full bg-[#00a884] hover:bg-[#02906f] text-white flex items-center justify-center transition cursor-pointer shadow-md shrink-0 active:scale-95"
              title="Enviar mensaje"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartRecording}
              disabled={disabled}
              className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition cursor-pointer shadow shrink-0 active:scale-95"
              title="Grabar nota de voz"
            >
              <Mic className="w-4 h-4" />
            </button>
          )}

        </div>
      )}

    </div>
  );
};
