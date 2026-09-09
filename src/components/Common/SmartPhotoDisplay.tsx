import React, { useState, useMemo, useEffect } from 'react';
import { ImageIcon, Maximize2, ExternalLink, RefreshCw } from 'lucide-react';

interface SmartPhotoDisplayProps {
  rawUrl?: string;
  alt: string;
  title: string;
  className?: string;
  emptyTitle?: string;
  emptySubtitle?: string;
  badgeLabel?: string;
  accentColor?: 'emerald' | 'purple' | 'amber';
  onZoom?: (url: string, title: string) => void;
}

export const SmartPhotoDisplay: React.FC<SmartPhotoDisplayProps> = ({
  rawUrl,
  alt,
  title,
  className = '',
  emptyTitle = 'Sin Fotografía',
  emptySubtitle = 'No registrada en esta etapa',
  badgeLabel,
  accentColor = 'emerald',
  onZoom
}) => {
  const [candidateIndex, setCandidateIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasFailedAll, setHasFailedAll] = useState<boolean>(false);

  // Extract candidate URLs from rawUrl
  const { candidates, driveId, isDrive } = useMemo(() => {
    if (!rawUrl || typeof rawUrl !== 'string') {
      return { candidates: [] as string[], driveId: null, isDrive: false };
    }

    const str = rawUrl.trim();
    if (!str) {
      return { candidates: [] as string[], driveId: null, isDrive: false };
    }

    // 1. Data URLs or local blobs
    if (str.startsWith('data:image/') || str.startsWith('blob:')) {
      return { candidates: [str], driveId: null, isDrive: false };
    }

    // 2. Base64 strings without MIME prefix
    if (str.length > 50 && (str.startsWith('/9j/') || str.startsWith('iVBORw0KGgo') || str.startsWith('R0lGOD') || str.startsWith('UklGR') || str.startsWith('AAAA'))) {
      return { candidates: ['data:image/jpeg;base64,' + str], driveId: null, isDrive: false };
    }

    // 3. Google Drive / Google UserContent links
    if (str.includes('drive.google.com') || str.includes('googleusercontent.com')) {
      const match = str.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                    str.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                    str.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        const id = match[1];
        return {
          candidates: [
            'https://lh3.googleusercontent.com/d/' + id + '=s1200',
            'https://lh3.googleusercontent.com/d/' + id,
            'https://drive.google.com/thumbnail?id=' + id + '&sz=w1200',
            'https://drive.google.com/uc?export=view&id=' + id,
            'https://docs.google.com/uc?export=download&id=' + id
          ],
          driveId: id,
          isDrive: true
        };
      }
    }

    // 4. Standard HTTP/HTTPS URLs
    if (str.startsWith('http://') || str.startsWith('https://')) {
      return { candidates: [str], driveId: null, isDrive: false };
    }

    return { candidates: [] as string[], driveId: null, isDrive: false };
  }, [rawUrl]);

  // Reset state when rawUrl changes
  useEffect(() => {
    setCandidateIndex(0);
    const hasCandidates = candidates.length > 0;
    const isLocalDataUrl = hasCandidates && (candidates[0].startsWith('data:image/') || candidates[0].startsWith('blob:'));
    // Local data URLs decode immediately in browser, so don't lock with loading spinner
    setIsLoading(hasCandidates && !isLocalDataUrl);
    setHasFailedAll(false);
  }, [candidates]);

  const currentUrl = candidates[candidateIndex];

  const handleImageError = () => {
    if (candidateIndex + 1 < candidates.length) {
      setCandidateIndex(prev => prev + 1);
    } else {
      setHasFailedAll(true);
      setIsLoading(false);
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasFailedAll(false);
  };

  const colorClasses = {
    emerald: {
      badge: 'text-emerald-400 dark:text-emerald-600',
      icon: 'text-emerald-400',
      border: 'border-emerald-500/30'
    },
    purple: {
      badge: 'text-purple-400 dark:text-purple-600',
      icon: 'text-purple-400',
      border: 'border-purple-500/30'
    },
    amber: {
      badge: 'text-amber-400 dark:text-amber-600',
      icon: 'text-amber-400',
      border: 'border-amber-500/30'
    }
  }[accentColor];

  if (!candidates || candidates.length === 0) {
    return (
      <div className={`h-44 sm:h-52 rounded-2xl bg-zinc-950 dark:bg-zinc-100 border border-zinc-800 dark:border-zinc-300 p-2 flex flex-col items-center justify-center text-center shadow-inner ${className}`}>
        <ImageIcon className="w-7 h-7 stroke-[1.5] opacity-35 text-zinc-500 mb-1.5" />
        <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-600 font-mono block">{emptyTitle}</span>
        <span className="text-[9px] text-zinc-500 dark:text-zinc-500 font-mono block mt-0.5">{emptySubtitle}</span>
      </div>
    );
  }

  if (hasFailedAll) {
    return (
      <div className={`h-44 sm:h-52 rounded-2xl bg-zinc-950 dark:bg-zinc-100 border border-zinc-800 dark:border-zinc-300 p-3 flex flex-col items-center justify-center text-center shadow-inner space-y-2 ${className}`}>
        <ImageIcon className="w-6 h-6 text-amber-400 opacity-80" />
        <div className="space-y-0.5">
          <span className="text-[11px] font-bold text-white dark:text-zinc-950 font-mono block">Evidencia Registrada</span>
          <span className="text-[9px] text-zinc-400 dark:text-zinc-600 font-mono block">Cargada en el sistema</span>
        </div>
        {isDrive && driveId ? (
          <a
            href={`https://drive.google.com/file/d/${driveId}/view?usp=sharing`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold font-mono transition shadow-md cursor-pointer"
          >
            <span>Ver Fotografía</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <button
            type="button"
            onClick={() => {
              setCandidateIndex(0);
              setIsLoading(true);
              setHasFailedAll(false);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold transition cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reintentar</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`h-44 sm:h-52 rounded-2xl bg-zinc-950 dark:bg-zinc-100 border border-zinc-800 dark:border-zinc-300 p-1 flex flex-col items-center justify-center relative group overflow-hidden shadow-inner ${className}`}>
      
      {/* Loading Skeleton */}
      {isLoading && (
        <div className="absolute inset-0 bg-zinc-900/80 dark:bg-zinc-200/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 transition-opacity">
          <RefreshCw className={`w-5 h-5 animate-spin ${colorClasses.icon} mb-1.5`} />
          <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-600 font-bold">Cargando foto...</span>
        </div>
      )}

      {/* Image Tag */}
      <img
        src={currentUrl}
        alt={alt}
        crossOrigin={currentUrl.startsWith('http') ? 'anonymous' : undefined}
        referrerPolicy="no-referrer"
        loading="eager"
        decoding="async"
        onError={handleImageError}
        onLoad={handleImageLoad}
        className={`w-full h-full object-cover rounded-xl transition duration-300 ${
          isLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100 group-hover:scale-105 cursor-pointer'
        }`}
        onClick={() => {
          if (!isLoading && onZoom) {
            onZoom(currentUrl, title);
          }
        }}
      />

      {/* Interactive Hover / Tap Overlay */}
      {!isLoading && (
        <div
          onClick={() => onZoom && onZoom(currentUrl, title)}
          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center text-white cursor-pointer rounded-2xl select-none"
        >
          <Maximize2 className={`w-5 h-5 mb-1 ${colorClasses.icon}`} />
          <span className="text-[10px] font-bold font-mono">Ver en Alta Resolución</span>
        </div>
      )}

      {/* Badge in corner if provided */}
      {badgeLabel && (
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[9px] font-mono font-bold text-white border border-white/10 pointer-events-none">
          {badgeLabel}
        </span>
      )}
    </div>
  );
};
