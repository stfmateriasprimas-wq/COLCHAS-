import React, { useState, useMemo } from 'react';
import { 
  QrCode, RefreshCw, CheckCircle2, AlertTriangle, Clock, 
  Layers, User, Calendar, Droplets, Microscope, Sparkles, 
  ShieldCheck, ArrowRight, ExternalLink, Image as ImageIcon,
  Check, X, ChevronRight, Eye, LogIn, Sun, Moon, Maximize2
} from 'lucide-react';
import { SolicitudColcha, SectorType, DictamenType } from '../../types';
import { formatColombianDisplayDate } from '../../services/slaCalculator';
import { normalizeImageUrl } from '../../services/googleSheetsService';

interface PublicOpViewProps {
  opNumber: string;
  solicitudes: SolicitudColcha[];
  isSyncing: boolean;
  onRefreshData: () => void;
  onGoToLogin: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const PublicOpView: React.FC<PublicOpViewProps> = ({
  opNumber,
  solicitudes,
  isSyncing,
  onRefreshData,
  onGoToLogin,
  isDarkMode,
  onToggleTheme
}) => {
  const [isPhotoZoomed, setIsPhotoZoomed] = useState(false);

  // Normalize target OP string to compare
  const cleanTargetOp = useMemo(() => {
    return opNumber.replace(/\D/g, '') || opNumber.trim().toUpperCase();
  }, [opNumber]);

  // Find OP in live data
  const colcha = useMemo(() => {
    return solicitudes.find(s => {
      const cleanOp = s.op.replace(/\D/g, '') || s.op.trim().toUpperCase();
      return cleanOp === cleanTargetOp || s.op.toUpperCase().includes(cleanTargetOp);
    });
  }, [solicitudes, cleanTargetOp]);

  // Normalized display photo URL (Base64, Google Drive, Direct HTTP)
  const displayPhotoUrl = useMemo(() => {
    return normalizeImageUrl(colcha?.fotoMuestraUrl);
  }, [colcha?.fotoMuestraUrl]);

  const stages: { id: SectorType; label: string; icon: string; desc: string }[] = [
    { id: 'PRE_SOLICITUD', label: '1. Atelier / Corte', icon: '✂️', desc: 'Muestra cortada y preparada' },
    { id: 'SOLICITADO', label: '2. En Tránsito', icon: '🚚', desc: 'Despacho hacia Lavandería' },
    { id: 'LAVANDERIA', label: '3. Lavandería ZF', icon: '💧', desc: 'Proceso de lavado industrial' },
    { id: 'CALIDAD', label: '4. Calidad Lab', icon: '🔬', desc: 'Inspección técnica y tono' },
    { id: 'FINALIZADO', label: '5. Liberado', icon: '✅', desc: 'Aprobado para producción' }
  ];

  const getStageIndex = (estado?: SectorType): number => {
    switch (estado) {
      case 'PRE_SOLICITUD': return 0;
      case 'SOLICITADO': return 1;
      case 'LAVANDERIA': return 2;
      case 'CALIDAD': return 3;
      case 'FINALIZADO': return 4;
      default: return 1;
    }
  };

  const currentStageIdx = getStageIndex(colcha?.estado);

  return (
    <div className={`min-h-screen transition-colors duration-200 ${isDarkMode ? 'dark bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'} font-sans select-none flex flex-col justify-between`}>
      
      {/* 1. TOP HEADER (BRAND & QUICK ACTIONS) */}
      <header className="sticky top-0 z-40 bg-zinc-900/90 dark:bg-white/95 backdrop-blur-md border-b border-zinc-800 dark:border-zinc-200 px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-zinc-950 dark:bg-zinc-100 border border-zinc-800 dark:border-zinc-300 flex items-center justify-center text-white dark:text-zinc-950 shadow-inner">
            <QrCode className="w-5 h-5 text-emerald-400 dark:text-emerald-600 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black brand-title tracking-wider text-white dark:text-zinc-950">
                COLCHAS STF GROUP
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-black bg-emerald-500 text-black uppercase">
                EN VIVO
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-zinc-400 dark:text-zinc-600 font-mono">
              Ficha Técnica y Trazabilidad Oficial de Planta
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <button
            type="button"
            onClick={onRefreshData}
            disabled={isSyncing}
            className="p-2 rounded-xl bg-zinc-800 dark:bg-zinc-100 hover:bg-zinc-700 dark:hover:bg-zinc-200 text-zinc-300 dark:text-zinc-700 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            title="Sincronizar en tiempo real"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
            <span className="hidden sm:inline">{isSyncing ? 'Actualizando...' : 'Actualizar'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="p-2 rounded-xl bg-zinc-800 dark:bg-zinc-100 hover:bg-zinc-700 dark:hover:bg-zinc-200 text-zinc-300 dark:text-zinc-700 transition cursor-pointer"
            title="Cambiar tema"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

          {/* Login as Staff button */}
          <button
            type="button"
            onClick={onGoToLogin}
            className="px-3.5 py-2 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-800 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ingresar al Sistema</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN CONTENT CONTAINER */}
      <main className="max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 flex-1">
        
        {/* If OP is still syncing / not found */}
        {!colcha ? (
          <div className="bg-zinc-900/80 dark:bg-white border-2 border-zinc-800 dark:border-zinc-200 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-xl">
            {isSyncing ? (
              <div className="space-y-3">
                <RefreshCw className="w-12 h-12 text-emerald-400 animate-spin mx-auto" />
                <h2 className="text-lg font-black text-white dark:text-zinc-950 uppercase font-mono">
                  Sincronizando Orden OP-{opNumber}...
                </h2>
                <p className="text-xs text-zinc-400 dark:text-zinc-600 max-w-md mx-auto">
                  Consultando la base de datos de Google Sheets en tiempo real. Por favor espera unos segundos.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center mx-auto text-2xl font-black">
                  ⚠️
                </div>
                <div>
                  <h2 className="text-lg font-black text-white dark:text-zinc-950 uppercase font-mono">
                    Orden OP-{opNumber} No Encontrada
                  </h2>
                  <p className="text-xs text-zinc-400 dark:text-zinc-600 max-w-md mx-auto mt-1">
                    Verifica que el número de la OP esté registrado en la hoja <strong>BASE_DE_DATOS</strong> o pulsa actualizar para recargar los datos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onRefreshData}
                  className="px-6 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold text-xs uppercase transition shadow-lg cursor-pointer"
                >
                  Recargar Base de Datos
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* HERO CARD: OP & STATUS */}
            <div className="bg-zinc-900/90 dark:bg-white border-2 border-zinc-800 dark:border-zinc-200 rounded-3xl p-5 sm:p-7 shadow-xl space-y-4">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 dark:border-zinc-200 pb-4">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs font-mono font-bold text-zinc-400 dark:text-zinc-500 uppercase">
                      ORDEN DE PRODUCCIÓN
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black bg-zinc-800 dark:bg-zinc-100 text-zinc-300 dark:text-zinc-700 border border-zinc-700 dark:border-zinc-300">
                      ID: STF-{colcha.op}
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white dark:text-zinc-950 mt-1">
                    OP-{colcha.op}
                  </h2>
                  <span className="text-xs sm:text-sm font-mono font-bold text-indigo-400 dark:text-indigo-600">
                    REF: {colcha.referencia} • {colcha.tela}
                  </span>
                </div>

                {/* Status & Dictamen Badges */}
                <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/80 dark:bg-purple-100 border border-purple-500/40 dark:border-purple-300 text-purple-300 dark:text-purple-800 text-xs font-black uppercase tracking-wide">
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping"></span>
                    <span>ETAPA: {colcha.estado.replace('_', ' ')}</span>
                  </div>

                  <div className={`px-3 py-1 rounded-xl text-xs font-black uppercase border ${
                    colcha.dictamen === 'APROBADO'
                      ? 'bg-emerald-950/80 dark:bg-emerald-100 text-emerald-300 dark:text-emerald-800 border-emerald-500/40 dark:border-emerald-300'
                      : colcha.dictamen === 'RECHAZADO'
                      ? 'bg-rose-950/80 dark:bg-rose-100 text-rose-300 dark:text-rose-800 border-rose-500/40 dark:border-rose-300'
                      : 'bg-amber-950/80 dark:bg-amber-100 text-amber-300 dark:text-amber-800 border-amber-500/40 dark:border-amber-300'
                  }`}>
                    DICTAMEN: {colcha.dictamen}
                  </div>
                </div>
              </div>

              {/* SLA & Time in Process */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="bg-zinc-950 dark:bg-zinc-50 border border-zinc-800 dark:border-zinc-200 rounded-2xl p-3">
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-bold block">Ubicación / Área Actual:</span>
                  <span className="text-white dark:text-zinc-950 font-bold text-xs mt-0.5 block truncate">
                    📍 {colcha.areaActual || 'CALIDAD PLANTA'}
                  </span>
                </div>

                <div className="bg-zinc-950 dark:bg-zinc-50 border border-zinc-800 dark:border-zinc-200 rounded-2xl p-3">
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-bold block">Tiempo en Proceso:</span>
                  <span className="text-indigo-400 dark:text-indigo-600 font-bold text-xs mt-0.5 block flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {colcha.diasHabiles} Días ({colcha.horasEnProceso}h hábiles)
                  </span>
                </div>

                <div className="bg-zinc-950 dark:bg-zinc-50 border border-zinc-800 dark:border-zinc-200 rounded-2xl p-3">
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-bold block">Estado SLA:</span>
                  <span className={`font-black text-xs mt-0.5 block ${
                    colcha.tieneRetraso ? 'text-rose-400 dark:text-rose-600' : 'text-emerald-400 dark:text-emerald-600'
                  }`}>
                    {colcha.tieneRetraso ? `⚠️ Retraso (+${Math.max(0, colcha.diasHabiles - 3)}d)` : '✓ En Tiempos Normales'}
                  </span>
                </div>
              </div>

            </div>

            {/* TWO COLUMN GRID: TECHNICAL DATA + PHOTO */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* LEFT: TECHNICAL DATA SPEC SHEET */}
              <div className="lg:col-span-7 bg-zinc-900/90 dark:bg-white border-2 border-zinc-800 dark:border-zinc-200 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 dark:border-zinc-200 pb-3">
                  <h3 className="text-xs sm:text-sm font-black uppercase text-white dark:text-zinc-950 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <span>ESPECIFICACIONES DE LA ETIQUETA</span>
                  </h3>
                  <span className="text-[10px] font-mono text-zinc-400">100MM X 100MM</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-zinc-950 dark:bg-zinc-50 p-3 rounded-2xl border border-zinc-800 dark:border-zinc-200">
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold block uppercase">COLOR:</span>
                    <span className="font-bold text-white dark:text-zinc-950 text-xs mt-0.5 block">{colcha.color}</span>
                  </div>

                  <div className="bg-zinc-950 dark:bg-zinc-50 p-3 rounded-2xl border border-zinc-800 dark:border-zinc-200">
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold block uppercase">ROLLOS:</span>
                    <span className="font-black text-amber-400 dark:text-amber-600 text-xs mt-0.5 block">{colcha.rollos} Rollos</span>
                  </div>

                  <div className="bg-zinc-950 dark:bg-zinc-50 p-3 rounded-2xl border border-zinc-800 dark:border-zinc-200">
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold block uppercase">METRAJE / MT:</span>
                    <span className="font-mono font-bold text-emerald-400 dark:text-emerald-600 text-xs mt-0.5 block">{colcha.codigoMt} Mt</span>
                  </div>

                  <div className="bg-zinc-950 dark:bg-zinc-50 p-3 rounded-2xl border border-zinc-800 dark:border-zinc-200">
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold block uppercase">LOTE(S):</span>
                    <span className="font-bold text-white dark:text-zinc-950 text-xs mt-0.5 block">{colcha.lote || '1'}</span>
                  </div>

                  <div className="bg-zinc-950 dark:bg-zinc-50 p-3 rounded-2xl border border-zinc-800 dark:border-zinc-200 sm:col-span-2">
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold block uppercase">INSPECTOR / AUDITOR:</span>
                    <span className="font-bold text-white dark:text-zinc-950 text-xs mt-0.5 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-zinc-400" />
                      {colcha.inspector}
                    </span>
                  </div>

                  <div className="bg-zinc-950 dark:bg-zinc-50 p-3 rounded-2xl border border-zinc-800 dark:border-zinc-200 col-span-2 sm:col-span-3">
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold block uppercase">FECHA DE REGISTRO INICIAL:</span>
                    <span className="font-mono text-zinc-300 dark:text-zinc-700 text-xs mt-0.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-purple-400" />
                      {formatColombianDisplayDate(colcha.fechaCreacion)}
                    </span>
                  </div>
                </div>

                {/* OBSERVACIONES TÉCNICAS */}
                <div className="space-y-2 pt-2 border-t border-zinc-800 dark:border-zinc-200">
                  <span className="text-xs font-mono font-bold text-amber-400 dark:text-amber-700 flex items-center gap-1.5 uppercase">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    OBSERVACIÓN TÉCNICA Y TRAZABILIDAD:
                  </span>
                  <div className="p-3.5 rounded-2xl bg-amber-950/30 dark:bg-amber-50 border border-amber-500/30 dark:border-amber-200 text-xs font-mono text-amber-200 dark:text-amber-900 leading-relaxed">
                    {colcha.observacionesOperario || colcha.observacionesLavanderia || `CONCEPTO CALIDAD: ${colcha.dictamen}`}
                  </div>
                </div>

              </div>

              {/* RIGHT: FOTOGRAFÍA DE LA MUESTRA / PRUEBA */}
              <div className="lg:col-span-5 bg-zinc-900/90 dark:bg-white border-2 border-zinc-800 dark:border-zinc-200 rounded-3xl p-5 sm:p-6 shadow-xl space-y-3.5">
                <div className="flex items-center justify-between border-b border-zinc-800 dark:border-zinc-200 pb-3">
                  <h3 className="text-xs sm:text-sm font-black uppercase text-white dark:text-zinc-950 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-emerald-400" />
                    <span>EVIDENCIA FOTOGRÁFICA</span>
                  </h3>
                  <span className="text-[10px] font-mono text-zinc-400">MUESTRA FÍSICA</span>
                </div>

                {displayPhotoUrl ? (
                  <div className="space-y-2.5">
                    <div 
                      onClick={() => setIsPhotoZoomed(true)}
                      className="relative rounded-2xl overflow-hidden border-2 border-zinc-800 dark:border-zinc-200 bg-black aspect-video group cursor-pointer shadow-inner"
                    >
                      <img 
                        src={displayPhotoUrl} 
                        alt={`Muestra OP ${colcha.op}`} 
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          console.warn('Error loading image in PublicOpView', e);
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs gap-1.5">
                        <Maximize2 className="w-4 h-4" />
                        <span>Toca para Ampliar</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-600 text-center font-mono">
                      ✓ Fotografía de colcha registrada en línea de producción.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border-2 border-dashed border-zinc-800 dark:border-zinc-300 p-8 text-center space-y-2 bg-zinc-950/50 dark:bg-zinc-50">
                    <ImageIcon className="w-10 h-10 text-zinc-600 dark:text-zinc-400 mx-auto" />
                    <span className="text-xs font-bold text-zinc-400 dark:text-zinc-600 block">
                      Sin Fotografía Adjunta
                    </span>
                    <p className="text-[10px] text-zinc-500 max-w-xs mx-auto">
                      La muestra física se encuentra en tránsito y aún no ha sido fotografiada en planta.
                    </p>
                  </div>
                )}
              </div>

            </div>

            {/* VISUAL 5-STAGE TIMELINE */}
            <div className="bg-zinc-900/90 dark:bg-white border-2 border-zinc-800 dark:border-zinc-200 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
              <h3 className="text-xs sm:text-sm font-black uppercase text-white dark:text-zinc-950 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>TRAZABILIDAD POR ETAPAS DE PRODUCCIÓN</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-1">
                {stages.map((stage, idx) => {
                  const isCompleted = idx < currentStageIdx;
                  const isCurrent = idx === currentStageIdx;

                  return (
                    <div 
                      key={stage.id}
                      className={`p-3.5 rounded-2xl border text-xs font-mono transition-all ${
                        isCurrent
                          ? 'bg-purple-950/40 dark:bg-purple-50 border-purple-500 dark:border-purple-300 shadow-md ring-2 ring-purple-500/20'
                          : isCompleted
                          ? 'bg-emerald-950/20 dark:bg-emerald-50 border-emerald-500/40 dark:border-emerald-300 opacity-90'
                          : 'bg-zinc-950/40 dark:bg-zinc-50 border-zinc-800 dark:border-zinc-200 opacity-40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-base">{stage.icon}</span>
                        {isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                        {isCurrent && <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-purple-500 text-white uppercase animate-pulse">ACTUAL</span>}
                      </div>
                      <span className="font-bold text-white dark:text-zinc-950 block text-[11px]">
                        {stage.label}
                      </span>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 line-clamp-2">
                        {stage.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

      </main>

      {/* 3. PHOTO ZOOM MODAL */}
      {isPhotoZoomed && displayPhotoUrl && (
        <div 
          onClick={() => setIsPhotoZoomed(false)}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
            <button 
              type="button"
              onClick={() => setIsPhotoZoomed(false)}
              className="absolute top-2 right-2 p-2.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-white cursor-pointer z-10"
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={displayPhotoUrl} 
              alt={`Muestra OP ${colcha.op}`}
              className="max-h-[85vh] w-auto object-contain rounded-2xl shadow-2xl border border-zinc-800"
            />
            <span className="text-white text-xs font-mono font-bold mt-3">
              Fotografía de Muestra • OP-{colcha.op} (REF-{colcha.referencia})
            </span>
          </div>
        </div>
      )}

      {/* 4. FOOTER */}
      <footer className="border-t border-zinc-800 dark:border-zinc-200 bg-zinc-950 dark:bg-zinc-100 py-4 px-6 text-center text-xs font-mono text-zinc-500 dark:text-zinc-600">
        <p>STF GROUP S.A. • Sistema Oficial de Trazabilidad y Control de Calidad de Colchas</p>
        <p className="text-[10px] text-zinc-600 dark:text-zinc-500 mt-0.5">
          Consulta en tiempo real sincronizada con Google Sheets.
        </p>
      </footer>

    </div>
  );
};
