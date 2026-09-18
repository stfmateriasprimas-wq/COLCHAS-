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
  isDarkMode?: boolean;
}

const QUICK_EMOJIS = ['👍', '❤️', '👏', '🙏', '😂', '⚠️', '🧵', '⏳', '👕', '🔍', '🚨', '📋', '✅', '❌'];

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
  onSendMessage,
  onSendVoiceNote,
  onSendImage,
  onOpenOpSelector,
  disabled = false,
  isDarkMode = true
}) => {
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textInputRef = useRef<HTMLTextAreaElement | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      chatService.cancelAudioRecording();
    };
  }, []);

  const handleSend = () => {
    if (!text.trim() || disabled) return;
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
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      alert('No se pudo acceder al micrófono. Verifica los permisos en el navegador.');
    }
  };

  const handleStopAndSendRecording = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    const audioResult = await chatService.stopAudioRecording();
    if (audioResult && audioResult.duration > 0.5) {
      onSendVoiceNote(audioResult);
    }
    setRecordingSeconds(0);
  };

  const handleCancelRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setRecordingSeconds(0);
    chatService.cancelAudioRecording();
  };

  // Subir imagen
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona únicamente archivos de imagen.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      onSendImage(base64, file.name);
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
    <div className={`relative border-t p-2 sm:p-3 select-none transition-colors duration-200 ${
      isDarkMode 
        ? 'bg-zinc-950/95 border-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]' 
        : 'bg-white border-zinc-200 text-zinc-900 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]'
    }`}>
      
      {/* 1. Selector Rápido de Emojis */}
      {showEmojiPicker && (
        <div className={`absolute bottom-full left-2 sm:left-4 mb-2 border rounded-2xl p-2.5 z-30 flex items-center gap-1.5 flex-wrap max-w-xs sm:max-w-sm animate-in fade-in duration-150 ${
          isDarkMode 
            ? 'bg-black border-white/20 shadow-[0_0_35px_rgba(255,255,255,0.1),inset_0_1px_0_rgba(255,255,255,0.2)]' 
            : 'bg-white border-zinc-200 shadow-2xl shadow-black/30'
        }`}>
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                setText((prev) => prev + emoji);
                setShowEmojiPicker(false);
                if (textInputRef.current) textInputRef.current.focus();
              }}
              className={`w-8 h-8 flex items-center justify-center rounded-xl text-lg transition cursor-pointer ${
                isDarkMode ? 'hover:bg-zinc-800 text-white' : 'hover:bg-zinc-100 text-zinc-900'
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* 2. Menú de Adjuntar (+) */}
      {showAttachMenu && (
        <div className={`absolute bottom-full left-10 sm:left-14 mb-2 border rounded-2xl p-2 z-30 space-y-1 min-w-[220px] animate-in fade-in duration-150 ${
          isDarkMode 
            ? 'bg-black border-white/20 shadow-[0_0_35px_rgba(255,255,255,0.1),inset_0_1px_0_rgba(255,255,255,0.2)]' 
            : 'bg-white border-zinc-200 shadow-2xl shadow-black/30'
        }`}>
          <button
            type="button"
            onClick={() => {
              setShowAttachMenu(false);
              onOpenOpSelector();
            }}
            className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition text-left cursor-pointer group ${
              isDarkMode 
                ? 'hover:bg-zinc-900 text-white' 
                : 'hover:bg-zinc-100 text-zinc-900'
            }`}
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${
              isDarkMode 
                ? 'bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-black' 
                : 'bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white'
            }`}>
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <span className="block font-bold">Vincular OP al Chat</span>
              <span className={`text-[10px] block font-normal ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Retrasos SLA y OPs en proceso
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowAttachMenu(false);
              fileInputRef.current?.click();
            }}
            className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition text-left cursor-pointer group ${
              isDarkMode 
                ? 'hover:bg-zinc-900 text-white' 
                : 'hover:bg-zinc-100 text-zinc-900'
            }`}
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${
              isDarkMode 
                ? 'bg-sky-500/20 text-sky-400 group-hover:bg-sky-500 group-hover:text-black' 
                : 'bg-sky-100 text-sky-700 group-hover:bg-sky-600 group-hover:text-white'
            }`}>
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <span className="block font-bold">Fotos y Evidencias</span>
              <span className={`text-[10px] block font-normal ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Subir foto de muestra o defecto
              </span>
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
        <div className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-2 border animate-pulse ${
          isDarkMode 
            ? 'bg-zinc-900/90 border-rose-500/60' 
            : 'bg-rose-50 border-rose-300'
        }`}>
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping"></span>
            <span className={`text-xs font-mono font-bold ${isDarkMode ? 'text-rose-400' : 'text-rose-600'}`}>
              Grabando nota de voz: {formatSeconds(recordingSeconds)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancelRecording}
              className={`p-2 rounded-full transition cursor-pointer ${
                isDarkMode 
                  ? 'hover:bg-zinc-800 text-zinc-400 hover:text-rose-400' 
                  : 'hover:bg-zinc-200 text-zinc-500 hover:text-rose-600'
              }`}
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
            className={`p-2 rounded-full transition cursor-pointer shrink-0 ${
              isDarkMode 
                ? 'text-zinc-400 hover:text-white hover:bg-white/10' 
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
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
            className={`p-2 rounded-full transition cursor-pointer shrink-0 ${
              isDarkMode 
                ? 'text-zinc-400 hover:text-white hover:bg-white/10' 
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
            title="Adjuntar OP o Imagen"
          >
            <Plus className={`w-5 h-5 transition-transform ${showAttachMenu ? 'rotate-45' : ''}`} />
          </button>

          {/* Input de Texto */}
          <div className={`flex-1 rounded-2xl px-3 sm:px-4 py-2 border transition flex items-center min-h-[40px] shadow-inner ${
            isDarkMode 
              ? 'bg-zinc-900/90 border-white/20 focus-within:border-white/40 focus-within:ring-2 focus-within:ring-emerald-400/30 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]' 
              : 'bg-zinc-100/90 border-zinc-300 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20'
          }`}>
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
              className={`w-full bg-transparent text-xs sm:text-sm focus:outline-none resize-none max-h-24 custom-scroll ${
                isDarkMode 
                  ? 'text-[#e9edef] placeholder-zinc-500' 
                  : 'text-zinc-900 placeholder-zinc-400'
              }`}
            />
          </div>

          {/* Botón de Enviar o Micrófono */}
          {text.trim() ? (
            <button
              type="button"
              onClick={handleSend}
              disabled={disabled}
              className="w-10 h-10 rounded-full bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-black flex items-center justify-center transition cursor-pointer shadow-md shadow-emerald-950/20 dark:shadow-[0_0_20px_rgba(16,185,129,0.5),inset_0_1px_1px_rgba(255,255,255,0.5)] shrink-0 active:scale-95"
              title="Enviar mensaje"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartRecording}
              disabled={disabled}
              className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white flex items-center justify-center transition cursor-pointer shadow shrink-0 active:scale-95 border border-zinc-300 dark:border-white/10"
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
