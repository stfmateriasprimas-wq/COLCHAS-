import React, { useState } from 'react';
import { Camera, Printer, ArrowLeft, CheckCircle2, Trash2, Sliders, Sparkles, MapPin } from 'lucide-react';
import { MonitoreoItem, SolicitudColcha, SectorType } from '../../types';
import { SmartOpSearch } from './SmartOpSearch';
import { UsuarioSTF, isUserFromZonaFranca } from '../../services/authService';
import { compressImageFile, formatOpCode, sendOpEmailNotification } from '../../services/googleSheetsService';
import { EmailNotificationSelector } from './EmailNotificationSelector';
import { getUsuariosList } from '../../services/authService';

interface SolicitudFormProps {
  monitoreoList: MonitoreoItem[];
  currentUser?: UsuarioSTF | null;
  onCancel: () => void;
  onSubmit: (nuevaColcha: SolicitudColcha) => void;
  onRefreshMonitoreo?: () => void;
  isSyncing?: boolean;
}

export const SolicitudForm: React.FC<SolicitudFormProps> = ({
  monitoreoList,
  currentUser,
  onCancel,
  onSubmit,
  onRefreshMonitoreo,
  isSyncing = false
}) => {
  const [tela, setTela] = useState('');
  const [mt, setMt] = useState('');
  const [color, setColor] = useState('');
  const [op, setOp] = useState('');
  const [referencia, setReferencia] = useState('');
  const [rollos, setRollos] = useState<number | ''>('');
  const [lote, setLote] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // Email Notification Selection State
  const [selectedEmails, setSelectedEmails] = useState<string[]>(() => {
    const list = getUsuariosList();
    return list.map(u => u.email.toLowerCase().trim()).filter(e => e.includes('@'));
  });
  const [autoSendEmail, setAutoSendEmail] = useState<boolean>(true);
  const [isSendingManualEmail, setIsSendingManualEmail] = useState<boolean>(false);

  // Sede and Status determination according to user origin (Zona Franca vs Others)
  const isZonaFranca = isUserFromZonaFranca(currentUser);
  const initialEstado: SectorType = isZonaFranca ? 'PRE_SOLICITUD' : 'SOLICITADO';
  const initialAreaName = isZonaFranca ? 'CALIDAD 2F / ATELIER' : 'TRÁNSITO / DESPACHO';

  // Parámetros técnicos textiles opcionales
  const [showTechnicalParams, setShowTechnicalParams] = useState(false);
  const [medidaInicial, setMedidaInicial] = useState<number | ''>(25);
  const [encogimientoTrama, setEncogimientoTrama] = useState<number | ''>('');
  const [encogimientoUrdimbre, setEncogimientoUrdimbre] = useState<number | ''>('');

  // Extract unique fabric names
  const uniqueTelas = Array.from(new Set(monitoreoList.map(m => m.tela).filter(Boolean)));

  // Available OPs for the currently selected fabric
  const availableOpsForTela = monitoreoList.filter(m => m.tela === tela && m.op);

  const handleSelectOpFromSearch = (item: MonitoreoItem) => {
    setTela(item.tela);
    setMt(item.mt);
    setColor(item.color);
    setOp(formatOpCode(item.op));
    setReferencia(item.referencia);
  };

  const handleTelaSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedTela = e.target.value;
    setTela(selectedTela);
    
    // Auto-select first matching OP if available
    const firstMatch = monitoreoList.find(m => m.tela === selectedTela);
    if (firstMatch) {
      setMt(firstMatch.mt);
      setColor(firstMatch.color);
      setOp(formatOpCode(firstMatch.op));
      setReferencia(firstMatch.referencia);
    }
  };

  const handleOpSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOpValue = e.target.value;
    setOp(formatOpCode(selectedOpValue));

    const match = monitoreoList.find(m => m.tela === tela && (m.op === selectedOpValue || formatOpCode(m.op) === formatOpCode(selectedOpValue)));
    if (match) {
      setMt(match.mt);
      setColor(match.color);
      setReferencia(match.referencia);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImageFile(file, 650, 0.55);
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
      referencia: referencia || 'N/A',
      tela: tela || 'TELA INDIGO',
      codigoMt: mt || 'MT-AUTO',
      color: color || 'AZUL',
      rollos: Number(rollos) || 1,
      lote: lote || '1',
      estado: initialEstado,
      dictamen: 'PENDIENTE',
      inspector: currentUser ? currentUser.nombre : (isZonaFranca ? 'CALIDAD ZF' : 'OPERARIO STF'),
      fechaCreacion: colombianNowStr,
      observacionesOperario: finalObs || (isZonaFranca ? 'Muestra registrada en Atelier ZF (Zona Franca)' : 'Muestra solicitada en Planta Principal'),
      fotoMuestraUrl: photoUrl || undefined,
      areaActual: initialAreaName,
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

  const handleManualSendEmail = async () => {
    if (!op) {
      alert("Por favor completa los campos de OP antes de enviar la ficha por correo.");
      return;
    }
    if (selectedEmails.length === 0) {
      alert("Por favor selecciona al menos un correo destinatario.");
      return;
    }
    setIsSendingManualEmail(true);
    try {
      const colchaData = buildCurrentColchaData();
      await sendOpEmailNotification(colchaData, selectedEmails);
    } finally {
      setIsSendingManualEmail(false);
    }
  };

  const handleDirectSubmit = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!op || !op.trim()) {
      alert("⚠️ Por favor ingresa el número de Orden de Producción (OP).");
      return;
    }

    const finalTela = tela.trim() || 'TELA INDIGO';
    const finalOp = formatOpCode(op.trim());
    const finalRollos = typeof rollos === 'number' && rollos > 0 ? rollos : 1;

    try {
      const colcha = buildCurrentColchaData();
      colcha.op = finalOp;
      colcha.tela = finalTela;
      colcha.rollos = finalRollos;
      (colcha as any).recipients = autoSendEmail ? selectedEmails : [];
      (colcha as any).userEmails = autoSendEmail ? selectedEmails : [];

      onSubmit(colcha);
    } catch (err) {
      console.error("Error al registrar solicitud:", err);
      alert("Error al procesar la solicitud.");
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 px-2 sm:px-4">
      
      {/* Back button header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onCancel}
          className="text-xs font-semibold text-zinc-400 hover:text-white dark:text-zinc-600 dark:hover:text-zinc-950 flex items-center gap-1.5 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>VOLVER AL PANEL DE CONTROL</span>
        </button>
        
        {/* Dynamic User Origin Badge */}
        <div className="flex items-center gap-2">
          {isZonaFranca ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-950/80 dark:bg-emerald-100 text-emerald-300 dark:text-emerald-800 border border-emerald-500/50 dark:border-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>SEDE ZONA FRANCA ➔ PRE-SOLICITUD</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-950/80 dark:bg-amber-100 text-amber-300 dark:text-amber-800 border border-amber-500/50 dark:border-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span>PLANTA PRINCIPAL ➔ SOLICITADO</span>
            </span>
          )}
        </div>
      </div>

      <form onSubmit={handleDirectSubmit} className="bg-[#0c1017] dark:bg-white border-2 border-zinc-800 dark:border-zinc-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl text-white dark:text-zinc-950">
        
        {/* Top Title Banner */}
        <div className="border-b border-zinc-800 dark:border-zinc-200 pb-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-mono font-black text-sm">
                STF
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white dark:text-zinc-950 brand-title">
                  Registro de Nueva Solicitud
                </h2>
                <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-0.5">
                  {isZonaFranca 
                    ? 'Muestra textil originada en Zona Franca (Atelier). Quedará registrada automáticamente en estado PRE-SOLICITUD.'
                    : 'Muestra textil originada en Planta Principal. Quedará registrada automáticamente en estado SOLICITADO.'}
                </p>
              </div>
            </div>
            <span className="text-xs font-bold font-mono px-3 py-1 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-zinc-300 dark:text-zinc-700 border border-zinc-800 dark:border-zinc-300">
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
          <div className="space-y-4 bg-zinc-950/50 dark:bg-zinc-50 border border-zinc-800/80 dark:border-zinc-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-800/60 dark:border-zinc-200">
              <span className="text-xs font-mono font-black uppercase tracking-wider text-amber-400 dark:text-amber-700">
                1. DATOS TÉCNICOS DE LA PRENDA
              </span>
            </div>

            {/* Tela Textil */}
            <div>
              <label className="block text-[11px] font-bold tracking-wider text-zinc-300 dark:text-zinc-700 uppercase mb-1">
                Tela Textil STF <span className="text-rose-500">*</span>
              </label>
              <select
                value={tela}
                onChange={handleTelaSelectChange}
                className="w-full bg-zinc-950 dark:bg-zinc-100 border border-zinc-800 dark:border-zinc-300 rounded-xl px-4 py-3 text-xs text-white dark:text-zinc-950 focus:outline-none focus:border-amber-500 transition font-bold"
              >
                <option value="">-- SELECCIONE TELA --</option>
                {uniqueTelas.map((t, i) => (
                  <option key={i} value={t}>
                    {t}
                  </option>
                ))}
                {tela && !uniqueTelas.includes(tela) && (
                  <option value={tela}>{tela}</option>
                )}
              </select>
            </div>

            {/* MT & Color */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase mb-1 font-mono">
                  Código Material (MT#)
                </label>
                <input
                  type="text"
                  value={mt}
                  readOnly
                  placeholder="Auto calculado"
                  className="w-full bg-zinc-950/60 dark:bg-zinc-100 border border-zinc-800 dark:border-zinc-300 rounded-xl px-4 py-3 text-xs text-zinc-300 dark:text-zinc-700 font-mono font-bold focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase mb-1 font-mono">
                  Color Textil
                </label>
                <input
                  type="text"
                  value={color}
                  readOnly
                  placeholder="Auto calculado"
                  className="w-full bg-zinc-950/60 dark:bg-zinc-100 border border-zinc-800 dark:border-zinc-300 rounded-xl px-4 py-3 text-xs text-zinc-300 dark:text-zinc-700 focus:outline-none font-bold"
                />
              </div>
            </div>

            {/* OP & Referencia */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold tracking-wider text-zinc-300 dark:text-zinc-700 uppercase mb-1">
                  Orden de Producción (OP) <span className="text-rose-500">*</span>
                </label>
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
                    className="w-full bg-zinc-950 dark:bg-zinc-100 border border-zinc-800 dark:border-zinc-300 rounded-xl px-4 py-3 text-xs text-white dark:text-zinc-950 focus:outline-none focus:border-amber-500 font-mono font-bold transition"
                    required
                  />
                </div>

                {availableOpsForTela.length > 1 && (
                  <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">OPs encontradas:</span>
                    {availableOpsForTela.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectOpFromSearch(item)}
                        className="text-[10px] bg-zinc-900 dark:bg-zinc-200 hover:bg-zinc-800 dark:hover:bg-zinc-300 text-zinc-300 dark:text-zinc-800 border border-zinc-700 dark:border-zinc-300 px-2 py-0.5 rounded-lg font-mono transition cursor-pointer"
                      >
                        {item.op}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase mb-1 font-mono">
                  Referencia Prenda STF
                </label>
                <input
                  type="text"
                  value={referencia}
                  readOnly
                  placeholder="Auto de Monitoreo"
                  className="w-full bg-zinc-950/60 dark:bg-zinc-100 border border-zinc-800 dark:border-zinc-300 rounded-xl px-4 py-3 text-xs text-zinc-300 dark:text-zinc-700 font-bold focus:outline-none"
                />
              </div>
            </div>

            {/* Rollos & Lote */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold tracking-wider text-zinc-300 dark:text-zinc-700 uppercase mb-1">
                  Número de Rollos <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  value={rollos}
                  onChange={(e) => setRollos(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Ej: 2"
                  min="1"
                  className="w-full bg-zinc-950 dark:bg-zinc-100 border border-zinc-800 dark:border-zinc-300 rounded-xl px-4 py-3 text-xs text-white dark:text-zinc-950 focus:outline-none focus:border-amber-500 transition font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold tracking-wider text-zinc-300 dark:text-zinc-700 uppercase mb-1">
                  Código de Lote
                </label>
                <input
                  type="text"
                  value={lote}
                  onChange={(e) => setLote(e.target.value)}
                  placeholder="Ej: L-409 o Lote 1,2"
                  className="w-full bg-zinc-950 dark:bg-zinc-100 border border-zinc-800 dark:border-zinc-300 rounded-xl px-4 py-3 text-xs text-white dark:text-zinc-950 focus:outline-none focus:border-amber-500 transition font-mono"
                />
              </div>
            </div>

            {/* Toggle Technical Shrinkage Parameters */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowTechnicalParams(!showTechnicalParams)}
                className="text-xs text-zinc-400 dark:text-zinc-600 hover:text-white dark:hover:text-zinc-950 font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{showTechnicalParams ? 'Ocultar Parámetros de Encogimiento' : '+ Agregar Pruebas Técnicas (Encogimiento Trama/Urdimbre)'}</span>
              </button>
            </div>

            {showTechnicalParams && (
              <div className="p-4 bg-zinc-950/80 dark:bg-zinc-50 border border-zinc-800 dark:border-zinc-200 rounded-2xl space-y-3 animate-in fade-in">
                <span className="text-[10px] text-zinc-300 dark:text-zinc-700 font-extrabold uppercase tracking-wider block font-mono">
                  PRUEBAS TEXTILES DE ENCOGIMIENTO
                </span>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-bold mb-1">Medida Inicial (cm)</label>
                    <input
                      type="number"
                      value={medidaInicial}
                      onChange={(e) => setMedidaInicial(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-zinc-900 dark:bg-white border border-zinc-800 dark:border-zinc-300 rounded-xl px-3 py-2 text-xs text-white dark:text-zinc-950 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-bold mb-1">Encog. Trama (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Ej: -3.6"
                      value={encogimientoTrama}
                      onChange={(e) => setEncogimientoTrama(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-zinc-900 dark:bg-white border border-zinc-800 dark:border-zinc-300 rounded-xl px-3 py-2 text-xs text-white dark:text-zinc-950 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-bold mb-1">Encog. Urdimbre (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Ej: -5.2"
                      value={encogimientoUrdimbre}
                      onChange={(e) => setEncogimientoUrdimbre(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-zinc-900 dark:bg-white border border-zinc-800 dark:border-zinc-300 rounded-xl px-3 py-2 text-xs text-white dark:text-zinc-950 font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* COLUMNA 2: OBSERVACIONES Y EVIDENCIA FOTOGRÁFICA */}
          <div className="space-y-4 bg-zinc-950/50 dark:bg-zinc-50 border border-zinc-800/80 dark:border-zinc-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-800/60 dark:border-zinc-200">
              <span className="text-xs font-mono font-black uppercase tracking-wider text-emerald-400 dark:text-emerald-700">
                2. OBSERVACIONES Y EVIDENCIA FOTOGRÁFICA
              </span>
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-[11px] font-bold tracking-wider text-zinc-300 dark:text-zinc-700 uppercase mb-1">
                Observaciones del Operario / Atelier
              </label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={4}
                placeholder="Escriba comentarios sobre defectos iniciales, hilos sueltos o especificaciones para lavandería..."
                className="w-full bg-zinc-950 dark:bg-zinc-100 border border-zinc-800 dark:border-zinc-300 rounded-xl p-3 text-xs text-white dark:text-zinc-950 placeholder-zinc-400 focus:outline-none focus:border-amber-500 transition"
              />
            </div>

            {/* Fotografía Upload */}
            <div>
              <label className="block text-[11px] font-bold tracking-wider text-zinc-300 dark:text-zinc-700 uppercase mb-1">
                Fotografía de Colcha Textil
              </label>
              <div className="relative border-2 border-dashed border-zinc-800 dark:border-zinc-300 hover:border-emerald-500 dark:hover:border-emerald-500 bg-zinc-950/50 dark:bg-zinc-50 rounded-2xl p-6 text-center transition group cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                {!photoUrl ? (
                  <div className="space-y-2 py-3">
                    <Camera className="w-9 h-9 text-zinc-400 group-hover:text-emerald-400 dark:group-hover:text-emerald-600 mx-auto transition" />
                    <p className="text-xs font-bold text-zinc-300 dark:text-zinc-700 group-hover:text-white dark:group-hover:text-zinc-950 transition">
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
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 dark:text-emerald-600" />
                          <span className="text-xs text-emerald-400 dark:text-emerald-700 font-black">
                            Fotografía de colcha adjunta
                          </span>
                        </div>
                        <span className="text-[11px] text-zinc-400 dark:text-zinc-500 block font-mono mt-0.5">
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
                      className="z-20 px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 hover:text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
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

        {/* SECCIÓN 3: SELECCIÓN DE CORREOS PARA NOTIFICACIÓN CORPORATIVA */}
        <EmailNotificationSelector
          selectedEmails={selectedEmails}
          onChangeSelectedEmails={setSelectedEmails}
          autoSendOnSubmit={autoSendEmail}
          onChangeAutoSend={setAutoSendEmail}
          onSendManualEmail={handleManualSendEmail}
          isSendingEmail={isSendingManualEmail}
        />

        {/* Footer Actions */}
        <div className="pt-3 flex items-center justify-end gap-3 border-t border-zinc-800 dark:border-zinc-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 rounded-2xl border border-zinc-800 dark:border-zinc-300 text-zinc-300 dark:text-zinc-700 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-xs font-bold transition cursor-pointer"
          >
            CANCELAR
          </button>
          
          {/* BOTÓN REGISTRAR CON ELEVACIÓN EN HOVER */}
          <button
            type="button"
            onClick={handleDirectSubmit}
            className="px-9 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-green-500 hover:from-emerald-400 hover:to-green-400 text-black font-black text-xs flex items-center gap-2.5 shadow-xl transition-all duration-200 transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/30 active:translate-y-0 active:scale-95 cursor-pointer font-mono uppercase tracking-wider"
            title="Registrar nueva solicitud de OP"
          >
            <CheckCircle2 className="w-5 h-5 text-black" />
            <span>REGISTRAR SOLICITUD</span>
          </button>
        </div>

      </form>
    </div>
  );
};
