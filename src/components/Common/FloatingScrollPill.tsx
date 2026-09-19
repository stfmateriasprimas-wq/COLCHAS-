import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface FloatingScrollPillProps {
  totalOpsCount?: number;
}

export const FloatingScrollPill: React.FC<FloatingScrollPillProps> = ({ totalOpsCount = 314 }) => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-center bg-white/95 dark:bg-[#021f14]/95 border-2 border-emerald-500/80 dark:border-emerald-500/90 rounded-full shadow-[0_4px_25px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_35px_rgba(0,0,0,0.8)] p-1 select-none backdrop-blur-md animate-in fade-in duration-300">
      
      {/* Scroll to Top */}
      <button
        type="button"
        onClick={scrollToTop}
        className="w-8 h-8 rounded-full flex items-center justify-center text-emerald-700 hover:text-emerald-950 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-white dark:hover:bg-emerald-500/20 transition cursor-pointer"
        title="Subir al inicio"
      >
        <ChevronUp className="w-5 h-5 stroke-[2.5]" />
      </button>

      {/* Center OP Counter Badge */}
      <div className="py-1 px-1 text-center font-mono text-[9px] font-black text-emerald-900 dark:text-emerald-300 flex flex-col items-center leading-none">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mb-0.5"></span>
        <span>{totalOpsCount}</span>
        <span className="text-[7.5px] opacity-75">OPS</span>
      </div>

      {/* Scroll to Bottom */}
      <button
        type="button"
        onClick={scrollToBottom}
        className="w-8 h-8 rounded-full flex items-center justify-center text-emerald-700 hover:text-emerald-950 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-white dark:hover:bg-emerald-500/20 transition cursor-pointer"
        title="Bajar al final"
      >
        <ChevronDown className="w-5 h-5 stroke-[2.5]" />
      </button>

    </div>
  );
};
