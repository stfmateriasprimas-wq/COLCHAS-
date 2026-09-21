import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, GripHorizontal } from 'lucide-react';

interface FuturisticFloatingChatButtonProps {
  onClick: () => void;
  title?: string;
  unreadCount?: number;
}

// 5mm en píxeles de pantalla estándar (96 DPI / 25.4 mm por pulgada ≈ 3.7795 px/mm)
const MARGIN_5MM_PX = Math.round((5 * 96) / 25.4); // ≈ 19px
const STORAGE_KEY = 'STF_FUTURISTIC_CHAT_BTN_POS';

export const FuturisticFloatingChatButton: React.FC<FuturisticFloatingChatButtonProps> = ({
  onClick,
  title = 'Abrir Chat Corporativo STF',
  unreadCount = 0
}) => {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const dragInfoRef = useRef({
    startX: 0,
    startY: 0,
    startPosX: 0,
    startPosY: 0,
    hasMoved: false
  });

  // Delimitar coordenadas manteniendo el margen estricto de 5mm en todos los bordes
  const clampCoordinates = useCallback((rawX: number, rawY: number, width: number, height: number) => {
    const maxX = window.innerWidth - width - MARGIN_5MM_PX;
    const maxY = window.innerHeight - height - MARGIN_5MM_PX;

    return {
      x: Math.max(MARGIN_5MM_PX, Math.min(maxX, rawX)),
      y: Math.max(MARGIN_5MM_PX, Math.min(maxY, rawY))
    };
  }, []);

  // Inicializar posición (persistida o por defecto a 5mm del borde inferior derecho)
  useEffect(() => {
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const btnWidth = rect.width || 48;
    const btnHeight = rect.height || 96;

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          setPosition(clampCoordinates(parsed.x, parsed.y, btnWidth, btnHeight));
          return;
        }
      } catch {
        // En caso de valor corrupto en storage
      }
    }

    const defaultX = window.innerWidth - btnWidth - MARGIN_5MM_PX;
    const defaultY = window.innerHeight - btnHeight - MARGIN_5MM_PX;
    setPosition(clampCoordinates(defaultX, defaultY, btnWidth, btnHeight));
  }, [clampCoordinates]);

  // Reajustar en redimensionamiento de ventana
  useEffect(() => {
    const handleResize = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition(prev => {
        if (!prev) return null;
        return clampCoordinates(prev.x, prev.y, rect.width, rect.height);
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [clampCoordinates]);

  // Listener global mientras se arrastra para máxima suavidad y evitar pérdidas de puntero
  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!buttonRef.current) return;

      const deltaX = e.clientX - dragInfoRef.current.startX;
      const deltaY = e.clientY - dragInfoRef.current.startY;

      // Distinguir intención de mover (umbral > 4px)
      if (!dragInfoRef.current.hasMoved && Math.hypot(deltaX, deltaY) > 4) {
        dragInfoRef.current.hasMoved = true;
      }

      if (dragInfoRef.current.hasMoved) {
        const rect = buttonRef.current.getBoundingClientRect();
        const rawX = dragInfoRef.current.startPosX + deltaX;
        const rawY = dragInfoRef.current.startPosY + deltaY;

        const clamped = clampCoordinates(rawX, rawY, rect.width, rect.height);
        setPosition(clamped);
      }
    };

    const handlePointerUp = () => {
      setIsDragging(false);

      if (!dragInfoRef.current.hasMoved) {
        onClick();
      } else if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const finalClamped = clampCoordinates(rect.left, rect.top, rect.width, rect.height);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(finalClamped));
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isDragging, clampCoordinates, onClick]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Solo clic primario
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    dragInfoRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: position ? position.x : rect.left,
      startPosY: position ? position.y : rect.top,
      hasMoved: false
    };

    setIsDragging(true);
  };

  return (
    <div
      ref={buttonRef}
      role="button"
      tabIndex={0}
      title={title}
      onPointerDown={handlePointerDown}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        position: 'fixed',
        left: position ? `${position.x}px` : undefined,
        top: position ? `${position.y}px` : undefined,
        right: position ? undefined : '5mm',
        bottom: position ? undefined : '5mm',
        touchAction: 'none'
      }}
      className={`
        flex
        fixed z-50 select-none flex-col items-center gap-2
        px-2.5 py-3 rounded-full
        bg-[#090d14]/90 dark:bg-[#090d14]/95
        backdrop-blur-xl
        border border-emerald-500/50 hover:border-emerald-400
        text-white font-black tracking-wider text-xs
        shadow-[0_0_20px_rgba(16,185,129,0.35),0_0_35px_rgba(6,182,212,0.2),inset_0_1px_1px_rgba(255,255,255,0.25)]
        transition-shadow duration-300
        group
        ${isDragging 
          ? 'cursor-grabbing scale-105 shadow-[0_0_30px_rgba(16,185,129,0.65),0_0_50px_rgba(6,182,212,0.4)] ring-2 ring-emerald-400/80' 
          : 'cursor-grab hover:scale-[1.05] hover:shadow-[0_0_25px_rgba(16,185,129,0.5),0_0_45px_rgba(6,182,212,0.3)] active:scale-95'
        }
      `}
    >
      {/* Resplandor holográfico animado vertical */}
      <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
        <div className="absolute -inset-full bg-gradient-to-b from-transparent via-emerald-400/20 to-transparent skew-y-12 group-hover:translate-y-full transition-transform duration-1000 ease-out" />
      </div>

      {/* Agarre táctil futurista horizontal */}
      <div 
        className="text-emerald-500/60 group-hover:text-emerald-400 transition-colors flex items-center justify-center -mt-0.5" 
        title="Arrastra para mover por la pantalla"
      >
        <GripHorizontal className="w-3.5 h-3.5" />
      </div>

      {/* Ícono de mensaje con aura de neón y baliza de pulso activo */}
      <div className="relative flex items-center justify-center">
        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.6)]">
          <MessageSquare className="w-3.5 h-3.5 text-black fill-black" />
        </div>
        
        {/* Baliza de pulso en vivo */}
        <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-300 shadow-[0_0_6px_#34d399]"></span>
        </span>
      </div>

      {/* Tipografía Futurista: CHAT o Insignia Roja */}
      <div className="flex flex-col items-center justify-center pb-0.5">
        <span className="font-mono font-black text-[10px] tracking-widest text-white group-hover:text-emerald-300 transition-colors uppercase select-none text-center">
          CHAT
        </span>
        {unreadCount > 0 && (
          <span className="mt-0.5 px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-mono font-black border border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.9)] animate-pulse flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </div>
    </div>
  );
};
