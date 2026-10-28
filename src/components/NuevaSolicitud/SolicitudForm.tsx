import React, { useState } from 'react';
import { Camera, Printer, ArrowLeft, CheckCircle2, Trash2, Sliders, Sparkles, MapPin, Edit3 } from 'lucide-react';
import { MonitoreoItem, SolicitudColcha, SectorType } from '../../types';
import { SmartOpSearch } from './SmartOpSearch';
import { UsuarioSTF, isUserFromZonaFranca, isCalidadUser } from '../../services/authService';
import { compressImageFile, formatOpCode } from '../../services/googleSheetsService';

// Catálogo Maestro de Telas Textiles Oficiales de STF Group
export const STF_CATALOGO_TELAS: string[] = [
  'TELA INDIGO UTOPIA',
  'TELA INDIGO LARKANA',
  'TELA INDIGO EGEO',
  'TELA INDIGO MAIA',
  'TELA INDIGO CORES',
  'TELA INDIGO CORES STF',
  'TELA INDIGO AKORA',
  'TELA INDIGO WANG BLUE',
  'TELA INDIGO WANG BLACK',
  'TELA INDIGO PLATINUM CHINA',
  'TELA INDIGO RAYON AGRAS',
  'TELA TENCEL MALVINA',
  'TELA TENCEL ROSHI',
  'TELA INDIGO ALAMOS',
  'TELA INDIGO ALBERTA',
  'TELA INDIGO CARTAGENA',
  'TELA INDIGO CHAMBRAY LIVIANO',
  'TELA INDIGO CUSCO',
  'TELA INDIGO LIMA',
  'TELA INDIGO MEDITERRANEO',
  'TELA INDIGO MIRAFLORES',
  'TELA INDIGO MOSTAZA',
  'TELA INDIGO MULUK',
  'TELA INDIGO NANKIN',
  'TELA INDIGO NOEL',
  'TELA INDIGO PAKISTAN',
  'TELA INDIGO RAYON BENKEI',
  'TELA INDIGO RAYON PRAGA',
  'TELA INDIGO TENCEL BENKEI',
  'TELA INDIGO TENCEL BULMA',
  'TELA INDIGO PRODIGY BLACK FABRICATO'
];

interface SolicitudFormProps {
  monitoreoList: MonitoreoItem[];
  solicitudes?: SolicitudColcha[];
  currentUser?: UsuarioSTF | null;
  onCancel: () => void;
  onSubmit: (nuevaColcha: SolicitudColcha) => void;
  onRefreshMonitoreo?: () => void;
  isSyncing?: boolean;
}

export const SolicitudForm: React.FC<SolicitudFormProps> = ({
  monitoreoList,
  solicitudes = [],
  currentUser,
  onCancel,
  onSubmit,
  onRefreshMonitoreo,
  isSyncing = false
}) => {
  const [tela, setTela] = useState('');
  const [isManualTela, setIsManualTela] = useState(false);
  const [mt, setMt] = useState('');
  const [color, setColor] = useState('');
  const [op, setOp] = useState('');
  const [referencia, setReferencia] = useState('');
  const [rollos, setRollos] = useState<number | ''>('');
  const [lote, setLote] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determinación estricta del origen y estado inicial inmutable según reglas maestras STF Colchas:
  // - Perfil Calidad / Planta Principal -> SOLICITADO (En Tránsito a Lavandería ZF)
  // - Sede Zona Franca (Atelier ZF) -> PRE_SOLICITUD (Corte y preparación de muestra)
  const isZonaFranca = isUserFromZonaFranca(currentUser);
  const [selectedDestinoStage, setSelectedDestinoStage] = useState<SectorType>(
    isZonaFranca ? 'PRE_SOLICITUD' : 'SOLICITADO'
  );
  const currentAreaName = selectedDestinoStage === 'PRE_SOLICITUD' ? 'CALIDAD 2F / ATELIER' : 'TRÁNSITO / DESPACHO';

  // Parámetros técnicos textiles opcionales
  const [showTechnicalParams, setShowTechnicalParams] = useState(false);
  const [medidaInicial, setMedidaInicial] = useState<number | ''>(25);
  const [encogimientoTrama, setEncogimientoTrama] = useState<number | ''>('');
  const [encogimientoUrdimbre, setEncogimientoUrdimbre] = useState<number | ''>('');

  const [isManualOp, setIsManualOp] = useState(false);

  // Catálogo completo de telas combinando: Monitoreo + Base de Datos + Catálogo Oficial
  const availableTelas = React.useMemo(() => {
    const set = new Set<string>();
    monitoreoList.forEach(m => { if (m.tela && m.tela.trim()) set.add(m.tela.trim()); });
    if (solicitudes && solicitudes.length > 0) {
      solicitudes.forEach(s => { if (s.tela && s.tela.trim()) set.add(s.tela.trim()); });
    }
    STF_CATALOGO_TELAS.forEach(t => set.add(t));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [monitoreoList, solicitudes]);

  // OPs únicas disponibles para la tela seleccionada actualmente (deduplicadas y ordenadas)
  const availableOpsForTela = React.useMemo(() => {
    if (!tela) return [];
    const map = new Map<string, MonitoreoItem>();
    for (const m of monitoreoList) {
      if (m.tela && m.tela.trim().toUpperCase() === tela.trim().toUpperCase() && m.op && m.op.trim()) {
        const formatted = formatOpCode(m.op.trim());
        if (!map.has(formatted)) {
          map.set(formatted, {
            ...m,
            op: formatted
          });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => a.op.localeCompare(b.op));
  }, [monitoreoList, tela]);

  const handleSelectOpFromSearch = (item: MonitoreoItem) => {
    setTela(item.tela || 'TELA INDIGO');
    setIsManualTela(false);
    setMt(item.mt || 'MT-AUTO');
    setColor(item.color || 'AZUL');
    const formatted = item.op && item.op.trim() ? formatOpCode(item.op) : '';
    setOp(formatted);
    setReferencia(item.referencia || '');
    // Si la OP de monitoreo no tiene número asignado, activar ingreso manual de OP
    setIsManualOp(!formatted);
  };

  const handleTelaSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedTela = e.target.value;
    if (selectedTela === '__MANUAL__') {
      setIsManualTela(true);
      setTela('');
      return;
    }

    setTela(selectedTela);
    setIsManualTela(false);
    
    // Auto-seleccionar primera OP coincidente solo si el usuario no ha ingresado una previamente
    if (!isManualOp && !op.trim()) {
      const matches = monitoreoList.filter(
        m => m.tela && m.tela.trim().toUpperCase() === selectedTela.trim().toUpperCase() && m.op && m.op.trim()
      );
      if (matches.length > 0) {
        const firstMatch = matches[0];
        setMt(firstMatch.mt || 'MT-AUTO');
        setColor(firstMatch.color || 'AZUL');
        setOp(formatOpCode(firstMatch.op));
        setReferencia(firstMatch.referencia || '');
      }
    }
  };

  const handleOpSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOpValue = e.target.value;
    if (selectedOpValue === '__MANUAL__') {
      setIsManualOp(true);
      return;
    }

    if (!selectedOpValue) {
      setOp('');
      return;
    }

    const formatted = formatOpCode(selectedOpValue);
    setOp(formatted);

    const match = monitoreoList.find(
      m => (m.tela && m.tela.trim().toUpperCase() === tela.trim().toUpperCase()) &&
           (m.op === selectedOpValue || formatOpCode(m.op) === formatted)
    );
    if (match) {
      if (match.mt) setMt(match.mt);
      if (match.color) setColor(match.color);
      if (match.referencia) setReferencia(match.referencia);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImageFile(file, 440, 0.42);
        setPhotoUrl(compressed);
      } catch (err) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const buildCurrentColchaData = (): SolicitudColcha => {
    let technicalObs = '';
    if (encogimientoTrama !== '' || encogimientoUrdimbre !== '') {
      technicalObs = `MEDIDA INICIAL:${medidaInicial || 25}CM ENCOGIMIENTO EN TRAMA:${encogimientoTrama || 0}% ENCOGIMIENTO EN URDIMBRE:${encogimientoUrdimbre || 0}%`;
    }

    const finalObs = [observaciones.trim(), technicalObs].filter(Boolean).join(' | ');
    const now = new Date();
    const d = now.getDate();
    const m = now.getMonth() + 1;
    const y = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const colombianNowStr = `${d}/${m}/${y} ${hh}:${mm}:${ss}`;

    return {
      id: `colcha-${Date.now()}`,
      op: formatOpCode(op || 'OP-MUESTRA'),
      referencia: referencia && referencia.trim() ? referencia.trim().toUpperCase() : 'S/R',
      tela: tela || 'TELA INDIGO',
      codigoMt: mt || 'MT-AUTO',
      color: color || 'AZUL',
      rollos: Number(rollos) || 1,
      lote: lote || '1',
      estado: selectedDestinoStage,
      dictamen: 'PENDIENTE',
      inspector: currentUser ? currentUser.nombre : (selectedDestinoStage === 'PRE_SOLICITUD' ? 'CALIDAD ZF' : 'CALIDAD STF'),
      fechaCreacion: colombianNowStr,
      observacionesOperario: finalObs || (selectedDestinoStage === 'PRE_SOLICITUD' ? 'Muestra registrada en Atelier ZF (Zona Franca)' : 'Muestra solicitada por Calidad (Planta Principal) para despacho a Lavandería'),
      fotoMuestraUrl: photoUrl || undefined,
      areaActual: currentAreaName,
      pruebas: {
        medidaInicialCm: Number(medidaInicial) || 25,
        encogimientoTramaPct: encogimientoTrama !== '' ? Number(encogimientoTrama) : undefined,
        encogimientoUrdimbrePct: encogimientoUrdimbre !== '' ? Number(encogimientoUrdimbre) : undefined
      },
      horasEnProceso: 0,
      diasHabiles: 1,
      limiteSlaDias: 1,
      tieneRetraso: false,
      esRetrasoCritico: false
    };
  };

  const handleDirectSubmit = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (isSubmitting) return;

    if (!op || !op.trim()) {
      alert("⚠️ Por favor ingresa el número de Orden de Producción (OP).");
      return;
    }

    const finalTela = tela.trim() || 'TELA INDIGO';
    const finalOp = formatOpCode(op.trim());
    const finalRollos = typeof rollos === 'number' && rollos > 0 ? rollos : 1;

    try {
      setIsSubmitting(true);
      const colcha = buildCurrentColchaData();
      colcha.op = finalOp;
      colcha.tela = finalTela;
      colcha.rollos = finalRollos;
      colcha.estado = selectedDestinoStage;
      colcha.areaActual = currentAreaName;
      if (currentUser) {
        colcha.inspector = currentUser.nombre;
      }
      if (mt.trim()) colcha.codigoMt = mt.trim().toUpperCase();
      if (color.trim()) colcha.color = color.trim().toUpperCase();
      colcha.referencia = referencia.trim() ? referencia.trim().toUpperCase() : 'S/R';

      onSubmit(colcha);
    } catch (err) {
      setIsSubmitting(false);
      console.error("Error al registrar solicitud:", err);
      alert("Error al procesar la solicitud: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setTimeout(() => setIsSubmitting(false), 2000);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 px-2 sm:px-4">
      
      {/* Back button header and Stage Selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          onClick={onCancel}
          className="text-xs font-semibold text-zinc-400 hover:text-white dark:text-zinc-600 dark:hover:text-zinc-950 flex items-center gap-1.5 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>VOLVER AL PANEL DE CONTROL</span>
        </button>
        
        {/* Selector interactivo de Destino Inicial de la Solicitud */}
        <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setSelectedDestinoStage('PRE_SOLICITUD')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold transition-all cursor-pointer ${
              selectedDestinoStage === 'PRE_SOLICITUD'
                ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/30'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
            title="Registrar como muestra de Zona Franca (Atelier) en PRE-SOLICITUD"
          >
            <span className={`w-2 h-2 rounded-full ${selectedDestinoStage === 'PRE_SOLICITUD' ? 'bg-black animate-pulse' : 'bg-cyan-500'}`}></span>
            <span>ATELIER ZF (PRE-SOLICITUD)</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedDestinoStage('SOLICITADO')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold transition-all cursor-pointer ${
              selectedDestinoStage === 'SOLICITADO'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/30'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
            title="Registrar como muestra de Calidad / Planta Principal en SOLICITADOS"
          >
            <span className={`w-2 h-2 rounded-full ${selectedDestinoStage === 'SOLICITADO' ? 'bg-black animate-pulse' : 'bg-amber-500'}`}></span>
            <span>PLANTA / CALIDAD (SOLICITADOS)</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleDirectSubmit} className="bg-white dark:bg-[#0c1017] border-2 border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_25px_rgba(255,255,255,0.05)] text-zinc-950 dark:text-white">
        
        {/* Top Title Banner */}
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 font-mono font-black text-sm">
                STF
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-white brand-title">
                  Registro de Nueva Solicitud
                </h2>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                  {selectedDestinoStage === 'PRE_SOLICITUD'
                    ? 'Muestra textil originada en Zona Franca (Atelier). Quedará registrada automáticamente en estado PRE-SOLICITUD para despacho a Lavandería ZF.'
                    : 'Muestra textil originada por Calidad (Planta Principal). Quedará registrada automáticamente en estado SOLICITADOS para que Lavandería pueda llamarla y cargarla en Lavandería.'}
                </p>
              </div>
            </div>
            <span className="text-xs font-bold font-mono px-3 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800">
              OPERADOR: {currentUser?.nombre || 'OPERARIO STF'}
            </span>
          </div>
        </div>

        {/* Smart search predictive box with "Ver OPs por Hacer" button */}
        <SmartOpSearch 
          monitoreoList={monitoreoList} 
          onSelectOp={handleSelectOpFromSearch} 
          onRefresh={onRefreshMonitoreo}
          isRefreshing={isSyncing}
        />

        {/* Panoramic 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          {/* COLUMNA 1: ESPECIFICACIONES TÉCNICAS */}
          <div className="space-y-4 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-200 dark:border-zinc-800/60">
              <span className="text-xs font-mono font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                1. DATOS TÉCNICOS DE LA PRENDA
              </span>
            </div>

            {/* Tela Textil */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold tracking-wider text-zinc-700 dark:text-zinc-300 uppercase">
                  Tela Textil STF <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsManualTela(!isManualTela)}
                  className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 hover:text-amber-500 hover:underline flex items-center gap-1 transition cursor-pointer"
                >
                  {isManualTela ? `📋 Ver catálogo de telas (${availableTelas.length})` : '✏️ Ingreso manual de tela'}
                </button>
              </div>

              {isManualTela ? (
                <input
                  type="text"
                  value={tela}
                  onChange={(e) => setTela(e.target.value.toUpperCase())}
                  placeholder="Ej: TELA INDIGO UTOPIA, TELA DRILL, etc."
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-3 text-xs text-zinc-950 dark:text-white focus:outline-none focus:border-amber-500 transition font-bold shadow-sm uppercase font-mono"
                  required
                />
              ) : (
                <select
                  value={tela}
                  onChange={handleTelaSelectChange}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-3 text-xs text-zinc-950 dark:text-white focus:outline-none focus:border-amber-500 transition font-bold shadow-sm"
                >
                  <option value="">-- SELECCIONE TELA ({availableTelas.length} DISPONIBLES) --</option>
                  {availableTelas.map((t, i) => (
                    <option key={i} value={t}>
                      {t}
                    </option>
                  ))}
                  {tela && !availableTelas.includes(tela) && (
                    <option value={tela}>{tela}</option>
                  )}
                  <option value="__MANUAL__">✏️ Ingresar otra tela manualmente...</option>
                </select>
              )}
            </div>

            {/* MT & Color */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold tracking-wider text-zinc-700 dark:text-zinc-300 uppercase mb-1 font-mono">
                  Código Material (MT#)
                </label>
                <input
                  type="text"
                  value={mt}
                  onChange={(e) => setMt(e.target.value.toUpperCase())}
                  placeholder="Ej: MT00216893 o MT-AUTO"
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-3 text-xs text-zinc-950 dark:text-white font-mono font-bold focus:outline-none focus:border-amber-500 shadow-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold tracking-wider text-zinc-700 dark:text-zinc-300 uppercase mb-1 font-mono">
                  Color Textil
                </label>
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value.toUpperCase())}
                  placeholder="Ej: AZUL, CRUDO, NEGRO..."
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-3 text-xs text-zinc-950 dark:text-white font-bold focus:outline-none focus:border-amber-500 shadow-sm uppercase"
                />
              </div>
            </div>

            {/* OP & Referencia */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold tracking-wider text-zinc-700 dark:text-zinc-300 uppercase">
                    Orden de Producción (OP) <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsManualOp(!isManualOp);
                    }}
                    className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 hover:text-amber-500 hover:underline flex items-center gap-1 transition cursor-pointer"
                  >
                    {isManualOp && availableOpsForTela.length > 0 
                      ? `📋 Ver menú de OPs (${availableOpsForTela.length})` 
                      : '✏️ Ingreso manual de OP'}
                  </button>
                </div>

                {availableOpsForTela.length > 0 && !isManualOp ? (
                  <div className="relative">
                    <select
                      value={op}
                      onChange={handleOpSelectChange}
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-3 text-xs text-zinc-950 dark:text-white focus:outline-none focus:border-amber-500 font-mono font-bold transition cursor-pointer shadow-sm"
                      required
                    >
                      <option value="">-- SELECCIONE OP ({availableOpsForTela.length} DISPONIBLES) --</option>
                      {availableOpsForTela.map((item) => (
                        <option key={item.op} value={item.op}>
                          {item.op} {item.referencia ? `— Ref: ${item.referencia}` : ''}
                        </option>
                      ))}
                      {op && !availableOpsForTela.some(i => i.op === op) && (
                        <option value={op}>{op}</option>
                      )}
                      <option value="__MANUAL__">✏️ Ingresar otra OP manualmente...</option>
                    </select>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={op}
                      onChange={(e) => setOp(e.target.value)}
                      onBlur={(e) => {
                        if (e.target.value.trim()) {
                          setOp(formatOpCode(e.target.value));
                        }
                      }}
                      placeholder="Ej: OP-95976 o 95976"
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-3 text-xs text-zinc-950 dark:text-white focus:outline-none focus:border-amber-500 font-mono font-bold transition shadow-sm"
                      required
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold tracking-wider text-zinc-700 dark:text-zinc-300 uppercase mb-1 font-mono">
                  Referencia Prenda STF
                </label>
                <input
                  type="text"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value.toUpperCase())}
                  placeholder="Ej: S741609 o F741110"
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-3 text-xs text-zinc-950 dark:text-white font-bold focus:outline-none focus:border-amber-500 shadow-sm uppercase font-mono"
                />
              </div>
            </div>

            {/* Rollos & Lote */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold tracking-wider text-zinc-700 dark:text-zinc-300 uppercase mb-1">
                  Número de Rollos <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  value={rollos}
                  onChange={(e) => setRollos(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Ej: 2"
                  min="1"
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-3 text-xs text-zinc-950 dark:text-white focus:outline-none focus:border-amber-500 transition font-mono shadow-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold tracking-wider text-zinc-700 dark:text-zinc-300 uppercase mb-1">
                  Código de Lote
                </label>
                <input
                  type="text"
                  value={lote}
                  onChange={(e) => setLote(e.target.value)}
                  placeholder="Ej: L-409 o Lote 1,2"
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-3 text-xs text-zinc-950 dark:text-white focus:outline-none focus:border-amber-500 transition font-mono shadow-sm"
                />
              </div>
            </div>

            {/* Toggle Technical Shrinkage Parameters */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowTechnicalParams(!showTechnicalParams)}
                className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{showTechnicalParams ? 'Ocultar Parámetros de Encogimiento' : '+ Agregar Pruebas Técnicas (Encogimiento Trama/Urdimbre)'}</span>
              </button>
            </div>

            {showTechnicalParams && (
              <div className="p-4 bg-zinc-100 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3 animate-in fade-in">
                <span className="text-[10px] text-zinc-700 dark:text-zinc-300 font-extrabold uppercase tracking-wider block font-mono">
                  PRUEBAS TEXTILES DE ENCOGIMIENTO
                </span>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] text-zinc-600 dark:text-zinc-400 uppercase font-bold mb-1">Medida Inicial (cm)</label>
                    <input
                      type="number"
                      value={medidaInicial}
                      onChange={(e) => setMedidaInicial(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-950 dark:text-white font-mono shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-600 dark:text-zinc-400 uppercase font-bold mb-1">Encog. Trama (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Ej: -3.6"
                      value={encogimientoTrama}
                      onChange={(e) => setEncogimientoTrama(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-950 dark:text-white font-mono shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-600 dark:text-zinc-400 uppercase font-bold mb-1">Encog. Urdimbre (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Ej: -5.2"
                      value={encogimientoUrdimbre}
                      onChange={(e) => setEncogimientoUrdimbre(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-950 dark:text-white font-mono shadow-sm"
                    />
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* COLUMNA 2: OBSERVACIONES Y EVIDENCIA FOTOGRÁFICA */}
          <div className="space-y-4 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-200 dark:border-zinc-800/60">
              <span className="text-xs font-mono font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                2. OBSERVACIONES Y EVIDENCIA FOTOGRÁFICA
              </span>
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-[11px] font-bold tracking-wider text-zinc-700 dark:text-zinc-300 uppercase mb-1">
                Observaciones del Operario / Atelier
              </label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={4}
                placeholder="Escriba comentarios sobre defectos iniciales, hilos sueltos o especificaciones para lavandería..."
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl p-3 text-xs text-zinc-950 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-amber-500 transition shadow-sm"
              />
            </div>

            {/* Fotografía Upload */}
            <div>
              <label className="block text-[11px] font-bold tracking-wider text-zinc-700 dark:text-zinc-300 uppercase mb-1">
                Fotografía de Colcha Textil
              </label>
              <div className="relative border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-white dark:bg-zinc-950/50 rounded-2xl p-6 text-center transition group cursor-pointer shadow-sm">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                {!photoUrl ? (
                  <div className="space-y-2 py-3">
                    <Camera className="w-9 h-9 text-zinc-400 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 mx-auto transition" />
                    <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-950 dark:group-hover:text-white transition">
                      SUBIR FOTOGRAFÍA (CÁMARA / GALERÍA)
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      Toma una foto desde el dispositivo móvil o selecciona un archivo de alta resolución
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-4 p-2">
                    <div className="flex items-center gap-3">
                      <img 
                        src={photoUrl} 
                        alt="Vista previa de colcha" 
                        className="w-20 h-20 object-cover rounded-2xl border-2 border-emerald-500 shadow-lg"
                      />
                      <div className="text-left">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-xs text-emerald-700 dark:text-emerald-400 font-black">
                            Fotografía de colcha adjunta
                          </span>
                        </div>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block font-mono mt-0.5">
                          Se sincronizará en Drive y se adjuntará al correo
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPhotoUrl(null);
                      }}
                      className="z-20 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                      title="Eliminar foto"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Eliminar</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>


        {/* Footer Actions */}
        <div className="pt-3 flex items-center justify-end gap-3 border-t border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 rounded-2xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold transition cursor-pointer"
          >
            CANCELAR
          </button>
          
          {/* BOTÓN REGISTRAR CON ELEVACIÓN EN HOVER */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleDirectSubmit}
            className={`px-9 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-green-500 hover:from-emerald-400 hover:to-green-400 text-black font-black text-xs flex items-center gap-2.5 shadow-xl transition-all duration-200 transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/30 active:translate-y-0 active:scale-95 font-mono uppercase tracking-wider ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
            title="Registrar nueva solicitud de OP"
          >
            <CheckCircle2 className={`w-5 h-5 text-black ${isSubmitting ? 'animate-spin' : ''}`} />
            <span>{isSubmitting ? 'REGISTRANDO...' : 'REGISTRAR SOLICITUD'}</span>
          </button>
        </div>

      </form>
    </div>
  );
};
