import React from 'react';

interface STFLogoProps {
  isWhite?: boolean;
  className?: string;
  enableHoverGlow?: boolean;
}

export const STFLogo: React.FC<STFLogoProps> = ({ 
  isWhite = true, 
  className = "h-12 sm:h-14 md:h-16 w-60 sm:w-72 md:w-80",
  enableHoverGlow = true
}) => {
  const logoSrc = isWhite 
    ? '/assets/stf-group-logo-white.png' 
    : '/assets/stf-group-logo-black.png';

  return (
    <div className={`relative group inline-flex items-center justify-center mx-auto text-center cursor-pointer select-none bg-transparent ${className}`}>
      
      {/* Dynamic Ambient Background Glow on Hover */}
      {enableHoverGlow && (
        <div 
          className={`absolute -inset-2 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-500 blur-xl pointer-events-none ${
            isWhite 
              ? 'bg-gradient-to-r from-emerald-500/20 via-cyan-400/15 to-indigo-500/20' 
              : 'bg-gradient-to-r from-emerald-400/15 via-indigo-500/15 to-purple-500/15'
          }`}
        />
      )}

      {/* Official Master Logo Vector (Sharp 4K, Smooth Hover Zoom) */}
      <img
        src={logoSrc}
        alt="STF GROUP S.A. - STUDIO F · ela · STUDIO F MAN"
        className="relative z-10 w-full h-full object-contain object-center mx-auto transform transition-transform duration-300 ease-out group-hover:scale-105 active:scale-95"
        draggable={false}
      />

    </div>
  );
};
