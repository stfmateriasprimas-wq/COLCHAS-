import React, { useState, useEffect } from 'react';
import { 
  Sliders, X, Shield, Clock, CheckCircle2, Save, 
  RotateCcw, Target, TrendingUp, Zap, Layers, Sparkles, Building2
} from 'lucide-react';
import { UsuarioSTF } from '../../services/authService';
import { 
  AdminParametersState, 
  getAdminParameters, 
  saveAdminParameters, 
  resetAdminParameters,
  DEFAULT_ADMIN_PARAMETERS 
} from '../../services/adminParametersService';
import { notificationService } from '../../services/notificationService';

interface AdminParametrosModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UsuarioSTF | null;
}

type ParamTabType = 'TASA_APROBACION' | 'PRODUCTIVIDAD' | 'RENDIMIENTO' | 'SLAS_TIEMPO';

export const AdminParametrosModal: React.FC<AdminParametrosModalProps> = ({
  isOpen,
  onClose,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<ParamTabType>('TASA_APROBACION');
  const [formData, setFormData] = useState<AdminParametersState>(getAdminParameters);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync state on open
  useEffect(() => {
    if (isOpen) {
      setFormData(getAdminParameters());
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveAll = () => {
    saveAdminParameters(formData);
    setSavedSuccess(true);
    notificationService.playAlertSound('EXITO');
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1500);
  };

  const handleResetDefaults = () => {
    const def = resetAdminParameters();
    setFormData(def);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200 select-none font-sans text-zinc-900 dark:text-zinc-100">
      <div className="bg-white dark:bg-[#0c1017] border border-amber-500/50 rounded-[32px] max-w-3xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* 1. TOP HEADER MATCHING SCREENSHOTS */}
        <div className="p-5 sm:p-6 border-b border-zinc-200 dark:border-zinc-800 bg-[#120c06] text-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md shrink-0">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white font-sans">
                  PARÁMETROS DEL SISTEMA (EDWIN – ADMINISTRADOR)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-black bg-amber-500 text-black uppercase tracking-wider">
                  CONTROL CENTRAL
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                Ajuste centralizado de rangos, metas e indicadores estadísticos del laboratorio
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. SUB-BANNER: MODO ADMINISTRADOR HABILITADO */}
        <div className="p-4 bg-emerald-950/20 dark:bg-emerald-950/40 border-b border-emerald-500/30 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
            <div>
              <span className="font-bold text-emerald-700 dark:text-emerald-400 block font-mono">
                PERFIL EDWIN (EDIAZ) — MODO ADMINISTRADOR HABILITADO
              </span>
              <span className="text-[11px] text-zinc-600 dark:text-zinc-400">
                Puedes configurar libremente los rangos y metas estándar que regirán todas las estadísticas e indicadores.
              </span>
            </div>
          </div>
          <span className="text-[10.5px] font-mono font-bold bg-white dark:bg-zinc-900 px-3 py-1 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
            Última modificación: {formData.lastModified}
          </span>
        </div>

        {/* 3. TAB NAVIGATION BAR (THE 4 TABS) */}
        <div className="p-3 bg-zinc-100 dark:bg-[#080c14] border-b border-zinc-200 dark:border-zinc-800/80 flex items-center gap-2 overflow-x-auto custom-scroll">
          
          {/* TAB 1: TASA DE APROBACIÓN */}
          <button
            type="button"
            onClick={() => setActiveTab('TASA_APROBACION')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-mono font-black flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'TASA_APROBACION'
                ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-md'
                : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-white border border-zinc-200 dark:border-zinc-800'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>TASA DE APROBACIÓN</span>
          </button>

          {/* TAB 2: INDICADOR DE PRODUCTIVIDAD */}
          <button
            type="button"
            onClick={() => setActiveTab('PRODUCTIVIDAD')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-mono font-black flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'PRODUCTIVIDAD'
                ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-md'
                : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-white border border-zinc-200 dark:border-zinc-800'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>INDICADOR DE PRODUCTIVIDAD</span>
          </button>

          {/* TAB 3: EFECTIVIDAD EN RENDIMIENTO */}
          <button
            type="button"
            onClick={() => setActiveTab('RENDIMIENTO')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-mono font-black flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'RENDIMIENTO'
                ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-md'
                : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-white border border-zinc-200 dark:border-zinc-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>EFECTIVIDAD EN RENDIMIENTO</span>
          </button>

          {/* TAB 4: SLAS DE TIEMPO */}
          <button
            type="button"
            onClick={() => setActiveTab('SLAS_TIEMPO')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-mono font-black flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'SLAS_TIEMPO'
                ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-md'
                : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-white border border-zinc-200 dark:border-zinc-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>SLAS DE TIEMPO</span>
          </button>

        </div>

        {/* 4. TAB CONTENTS (CORRESPONDING TO IMAGES 1, 2, 3, 4) */}
        <div className="overflow-y-auto flex-1 custom-scroll p-5 sm:p-6 bg-zinc-50 dark:bg-[#090e18] space-y-5">
          
          {/* Success Banner */}
          {savedSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-950 border border-emerald-500 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in zoom-in-95">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>¡Parámetros actualizados y aplicados en tiempo real a todo el sistema!</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 1: TASA DE APROBACIÓN (IMAGE 1) */}
          {/* ========================================================================= */}
          {activeTab === 'TASA_APROBACION' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-500" />
                  <div>
                    <h3 className="text-xs font-black uppercase font-mono tracking-wider text-zinc-900 dark:text-white">
                      AJUSTE DE PARÁMETROS Y RANGOS: TASA DE APROBACIÓN
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Establece los porcentajes y umbrales mínimos para calificar la calidad textil.
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40">
                  INDICADOR DE CALIDAD
                </span>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Field 1 */}
                <div className="bg-white dark:bg-[#0f1523] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-1.5 shadow-xs">
                  <label className="text-[10px] font-mono font-bold uppercase text-zinc-500 dark:text-zinc-400 block">
                    META OBJETIVO TASA DE APROBACIÓN (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.tasaAprobacion.metaObjetivoPct}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      tasaAprobacion: { ...prev.tasaAprobacion, metaObjetivoPct: Number(e.target.value) }
                    }))}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] font-mono text-zinc-400 block">
                    Standard Studio F: 95.0%
                  </span>
                </div>

                {/* Field 2 */}
                <div className="bg-white dark:bg-[#0f1523] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-1.5 shadow-xs">
                  <label className="text-[10px] font-mono font-bold uppercase text-zinc-500 dark:text-zinc-400 block">
                    RANGO NIVEL SOBRESALIENTE (MÍNIMO %)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.tasaAprobacion.rangoSobresalienteMinPct}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      tasaAprobacion: { ...prev.tasaAprobacion, rangoSobresalienteMinPct: Number(e.target.value) }
                    }))}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-emerald-500/50 rounded-xl px-3.5 py-2.5 text-sm font-mono font-black text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 block">
                    Visualización: Badge Verde "Excelente"
                  </span>
                </div>

                {/* Field 3 */}
                <div className="bg-white dark:bg-[#0f1523] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-1.5 shadow-xs">
                  <label className="text-[10px] font-mono font-bold uppercase text-zinc-500 dark:text-zinc-400 block">
                    RANGO NIVEL ACEPTABLE (MÍNIMO %)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.tasaAprobacion.rangoAceptableMinPct}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      tasaAprobacion: { ...prev.tasaAprobacion, rangoAceptableMinPct: Number(e.target.value) }
                    }))}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-blue-500/50 rounded-xl px-3.5 py-2.5 text-sm font-mono font-black text-blue-600 dark:text-blue-400 focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 block">
                    Visualización: Badge Azul "Aceptable"
                  </span>
                </div>

              </div>

              {/* Row 2: Rango Crítico & Tolerancia */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Field 4 */}
                <div className="bg-white dark:bg-[#0f1523] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-1.5 shadow-xs">
                  <label className="text-[10px] font-mono font-bold uppercase text-zinc-500 dark:text-zinc-400 block">
                    RANGO NIVEL CRÍTICO (LÍMITE MÁXIMO %)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.tasaAprobacion.rangoCriticoMaxPct}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      tasaAprobacion: { ...prev.tasaAprobacion, rangoCriticoMaxPct: Number(e.target.value) }
                    }))}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-rose-500/50 rounded-xl px-3.5 py-2.5 text-sm font-mono font-black text-rose-600 dark:text-rose-400 focus:outline-none focus:border-rose-500"
                  />
                  <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 block">
                    Visualización: Badge Rojo "Atención"
                  </span>
                </div>

                {/* Field 5 */}
                <div className="bg-white dark:bg-[#0f1523] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-1.5 shadow-xs">
                  <label className="text-[10px] font-mono font-bold uppercase text-zinc-500 dark:text-zinc-400 block">
                    TOLERANCIA MÁXIMA RECHAZOS CONSECUTIVOS (LOTES)
                  </label>
                  <input
                    type="number"
                    value={formData.tasaAprobacion.toleranciaRechazosConsecutivos}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      tasaAprobacion: { ...prev.tasaAprobacion, toleranciaRechazosConsecutivos: Number(e.target.value) }
                    }))}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-zinc-900 dark:text-white focus:outline-none"
                  />
                  <span className="text-[10px] font-mono text-zinc-400 block">
                    Dispara aviso preventivo en tablero al superar esta cantidad
                  </span>
                </div>

              </div>

              {/* Bottom Preview Card */}
              <div className="bg-white dark:bg-[#0f1523] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-2.5">
                <span className="text-xs font-mono font-bold text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>VISTA PREVIA DE RANGOS CONFIGURADOS POR EDWIN:</span>
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold">
                    ● Sobresaliente: ≥ {formData.tasaAprobacion.rangoSobresalienteMinPct}%
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-500/40 text-xs font-mono font-bold">
                    ● Aceptable: {formData.tasaAprobacion.rangoAceptableMinPct}% a {(formData.tasaAprobacion.rangoSobresalienteMinPct - 0.1).toFixed(1)}%
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-500/40 text-xs font-mono font-bold">
                    ● Crítico: &lt; {formData.tasaAprobacion.rangoAceptableMinPct}%
                  </span>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: INDICADOR DE PRODUCTIVIDAD (IMAGE 2) */}
          {/* ========================================================================= */}
          {activeTab === 'PRODUCTIVIDAD' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-500" />
                  <div>
                    <h3 className="text-xs font-black uppercase font-mono tracking-wider text-zinc-900 dark:text-white">
                      AJUSTE DE PARÁMETROS Y RANGOS: INDICADOR DE PRODUCTIVIDAD
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Configura el ritmo diario de procesamiento de muestras, metros inspeccionados y tiempos de ciclo.
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-500/40">
                  VOLUMEN & RITMO
                </span>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Field 1 */}
                <div className="bg-white dark:bg-[#0f1523] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-1.5 shadow-xs">
                  <label className="text-[10px] font-mono font-bold uppercase text-zinc-500 dark:text-zinc-400 block">
                    META MUESTRAS PROCESADAS / DÍA
                  </label>
                  <input
                    type="number"
                    value={formData.productividad.metaMuestrasDia}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      productividad: { ...prev.productividad, metaMuestrasDia: Number(e.target.value) }
                    }))}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-zinc-900 dark:text-white focus:outline-none"
                  />
                  <span className="text-[10px] font-mono text-zinc-400 block">
                    Rendimiento diario esperado en planta
                  </span>
                </div>

                {/* Field 2 */}
                <div className="bg-white dark:bg-[#0f1523] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-1.5 shadow-xs">
                  <label className="text-[10px] font-mono font-bold uppercase text-zinc-500 dark:text-zinc-400 block">
                    TIEMPO OBJETIVO POR MUESTRA (HORAS)
                  </label>
                  <input
                    type="number"
                    value={formData.productividad.tiempoObjetivoHoras}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      productividad: { ...prev.productividad, tiempoObjetivoHoras: Number(e.target.value) }
                    }))}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-zinc-900 dark:text-white focus:outline-none"
                  />
                  <span className="text-[10px] font-mono text-zinc-400 block">
                    Tiempo de ciclo completo por lote/muestra
                  </span>
                </div>

                {/* Field 3 */}
                <div className="bg-white dark:bg-[#0f1523] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-1.5 shadow-xs">
                  <label className="text-[10px] font-mono font-bold uppercase text-zinc-500 dark:text-zinc-400 block">
                    RANGO RENDIMIENTO ALTO (MÍNIMO MUESTRAS/DÍA)
                  </label>
                  <input
                    type="number"
                    value={formData.productividad.rangoAltoMinMuestras}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      productividad: { ...prev.productividad, rangoAltoMinMuestras: Number(e.target.value) }
                    }))}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-emerald-500/50 rounded-xl px-3.5 py-2.5 text-sm font-mono font-black text-emerald-600 dark:text-emerald-400 focus:outline-none"
                  />
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 block">
                    Nivel Alto: ≥ {formData.productividad.rangoAltoMinMuestras} Muestras/Día
                  </span>
                </div>

              </div>

              {/* Row 2: Rango Medio & Meta Metraje */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Field 4 */}
                <div className="bg-white dark:bg-[#0f1523] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-1.5 shadow-xs">
                  <label className="text-[10px] font-mono font-bold uppercase text-zinc-500 dark:text-zinc-400 block">
                    RANGO RENDIMIENTO MEDIO (MÍNIMO MUESTRAS/DÍA)
                  </label>
                  <input
                    type="number"
                    value={formData.productividad.rangoMedioMinMuestras}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      productividad: { ...prev.productividad, rangoMedioMinMuestras: Number(e.target.value) }
                    }))}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-amber-500/50 rounded-xl px-3.5 py-2.5 text-sm font-mono font-black text-amber-600 dark:text-amber-400 focus:outline-none"
                  />
                  <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 block">
                    Nivel Medio: {formData.productividad.rangoMedioMinMuestras} - {formData.productividad.rangoAltoMinMuestras - 1} Muestras/Día
                  </span>
                </div>

                {/* Field 5 */}
                <div className="bg-white dark:bg-[#0f1523] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-1.5 shadow-xs">
                  <label className="text-[10px] font-mono font-bold uppercase text-zinc-500 dark:text-zinc-400 block">
                    META METRAJE DIARIO EVALUADO EN LABORATORIO (METROS)
                  </label>
                  <input
                    type="number"
                    value={formData.productividad.metaMetrajeDiario}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      productividad: { ...prev.productividad, metaMetrajeDiario: Number(e.target.value) }
                    }))}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-zinc-900 dark:text-white focus:outline-none"
                  />
                  <span className="text-[10px] font-mono text-zinc-400 block">
                    Volumen lineal esperado en metros colcha/tela por jornada
                  </span>
                </div>

              </div>

              {/* Bottom Preview Card */}
              <div className="bg-white dark:bg-[#0f1523] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-2.5">
                <span className="text-xs font-mono font-bold text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-amber-500" />
                  <span>VISTA PREVIA DE RANGOS DE PRODUCTIVIDAD EDWIN:</span>
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold">
                    🔥 Alta Productividad: ≥ {formData.productividad.rangoAltoMinMuestras} Muestras/Día
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-500/40 text-xs font-mono font-bold">
                    ⚡ Productividad Media: {formData.productividad.rangoMedioMinMuestras} a {formData.productividad.rangoAltoMinMuestras - 1} Muestras/Día
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-500/40 text-xs font-mono font-bold">
                    ⚠️ Bajo Ritmo: &lt; {formData.productividad.rangoMedioMinMuestras} Muestras/Día
                  </span>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: EFECTIVIDAD EN RENDIMIENTO (IMAGE 3) */}
          {/* ========================================================================= */}
          {activeTab === 'RENDIMIENTO' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-sky-500" />
                  <div>
                    <h3 className="text-xs font-black uppercase font-mono tracking-wider text-zinc-900 dark:text-white">
                      AJUSTE DE PARÁMETROS Y RANGOS: EFECTIVIDAD EN RENDIMIENTO
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Configura el cumplimiento de SLA, porcentaje de eficiencia operativa y límites de tiempo inactivo.
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-500/40">
                  EFICIENCIA & SLA
                </span>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Field 1 */}
                <div className="bg-white dark:bg-[#0f1523] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-1.5 shadow-xs">
                  <label className="text-[10px] font-mono font-bold uppercase text-zinc-500 dark:text-zinc-400 block">
                    META EFICIENCIA OPERATIVA GLOBAL (%)
                  </label>
                  <input
                    type="number"
                    value={formData.rendimiento.metaEficienciaGlobalPct}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      rendimiento: { ...prev.rendimiento, metaEficienciaGlobalPct: Number(e.target.value) }
                    }))}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-zinc-900 dark:text-white focus:outline-none"
                  />
                  <span className="text-[10px] font-mono text-zinc-400 block">
                    Rendimiento global esperado del proceso completo
                  </span>
                </div>

                {/* Field 2 */}
                <div className="bg-white dark:bg-[#0f1523] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-1.5 shadow-xs">
                  <label className="text-[10px] font-mono font-bold uppercase text-zinc-500 dark:text-zinc-400 block">
                    META CUMPLIMIENTO DE SLA OPS (%)
                  </label>
                  <input
                    type="number"
                    value={formData.rendimiento.metaCumplimientoSlaPct}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      rendimiento: { ...prev.rendimiento, metaCumplimientoSlaPct: Number(e.target.value) }
                    }))}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-zinc-900 dark:text-white focus:outline-none"
                  />
                  <span className="text-[10px] font-mono text-zinc-400 block">
                    % OPs entregadas a tiempo dentro de horas hábiles
                  </span>
                </div>

                {/* Field 3 */}
                <div className="bg-white dark:bg-[#0f1523] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-1.5 shadow-xs">
                  <label className="text-[10px] font-mono font-bold uppercase text-zinc-500 dark:text-zinc-400 block">
                    HORAS MUERTAS MÁXIMAS TOLERABLES / MES
                  </label>
                  <input
                    type="number"
                    value={formData.rendimiento.horasMuertasMaxMes}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      rendimiento: { ...prev.rendimiento, horasMuertasMaxMes: Number(e.target.value) }
                    }))}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-rose-500/50 rounded-xl px-3.5 py-2.5 text-sm font-mono font-black text-rose-600 dark:text-rose-400 focus:outline-none"
                  />
                  <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 block">
                    Horas inactivas máximas antes de alerta de demoras
                  </span>
                </div>

              </div>

              {/* Row 2: Rango Efectividad Óptima & Regular */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Field 4 */}
                <div className="bg-white dark:bg-[#0f1523] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-1.5 shadow-xs">
                  <label className="text-[10px] font-mono font-bold uppercase text-zinc-500 dark:text-zinc-400 block">
                    RANGO EFECTIVIDAD ÓPTIMA (MÍNIMO %)
                  </label>
                  <input
                    type="number"
                    value={formData.rendimiento.rangoOptimaMinPct}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      rendimiento: { ...prev.rendimiento, rangoOptimaMinPct: Number(e.target.value) }
                    }))}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-emerald-500/50 rounded-xl px-3.5 py-2.5 text-sm font-mono font-black text-emerald-600 dark:text-emerald-400 focus:outline-none"
                  />
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 block">
                    Óptima: ≥ {formData.rendimiento.rangoOptimaMinPct}%
                  </span>
                </div>

                {/* Field 5 */}
                <div className="bg-white dark:bg-[#0f1523] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-1.5 shadow-xs">
                  <label className="text-[10px] font-mono font-bold uppercase text-zinc-500 dark:text-zinc-400 block">
                    RANGO EFECTIVIDAD REGULAR (MÍNIMO %)
                  </label>
                  <input
                    type="number"
                    value={formData.rendimiento.rangoRegularMinPct}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      rendimiento: { ...prev.rendimiento, rangoRegularMinPct: Number(e.target.value) }
                    }))}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-blue-500/50 rounded-xl px-3.5 py-2.5 text-sm font-mono font-black text-blue-600 dark:text-blue-400 focus:outline-none"
                  />
                  <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 block">
                    Regular: {formData.rendimiento.rangoRegularMinPct}% a {(formData.rendimiento.rangoOptimaMinPct - 0.1).toFixed(1)}%
                  </span>
                </div>

              </div>

              {/* Bottom Preview Card */}
              <div className="bg-white dark:bg-[#0f1523] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-2.5">
                <span className="text-xs font-mono font-bold text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-sky-500" />
                  <span>VISTA PREVIA DE RANGOS DE EFECTIVIDAD EDWIN:</span>
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold">
                    🪄 Óptima / Excelente: ≥ {formData.rendimiento.rangoOptimaMinPct}%
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-500/40 text-xs font-mono font-bold">
                    📊 Regular / Normal: {formData.rendimiento.rangoRegularMinPct}% a {(formData.rendimiento.rangoOptimaMinPct - 0.1).toFixed(1)}%
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-500/40 text-xs font-mono font-bold">
                    🚨 Alerta / Bajo Rendimiento: &lt; {formData.rendimiento.rangoRegularMinPct}%
                  </span>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: SLAS DE TIEMPO (IMAGE 4) */}
          {/* ========================================================================= */}
          {activeTab === 'SLAS_TIEMPO' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <div>
                    <h3 className="text-xs font-black uppercase font-mono tracking-wider text-zinc-900 dark:text-white">
                      HORAS LÍMITE SLA POR FASE OPERATIVA (HORAS HÁBILES)
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Define el número máximo de horas hábiles permitidas en cada sector para medir eficiencias y demoras.
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Grid (4 Stages) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Field 1: PRE-SOLICITUD -> SOLICITADO */}
                <div className="bg-white dark:bg-[#0f1523] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-1.5 shadow-xs">
                  <label className="text-[10.5px] font-mono font-bold uppercase text-zinc-500 dark:text-zinc-400 block">
                    PRE-SOLICITUD ➔ SOLICITADO (HORAS)
                  </label>
                  <input
                    type="number"
                    value={formData.slasTiempo.preSolToSolicitadoHoras}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      slasTiempo: { ...prev.slasTiempo, preSolToSolicitadoHoras: Number(e.target.value) }
                    }))}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-zinc-900 dark:text-white focus:outline-none"
                  />
                  <span className="text-[10px] font-mono text-zinc-400 block">
                    Predeterminado: 48 horas hábiles
                  </span>
                </div>

                {/* Field 2: SOLICITADO -> RECIBIDO LAVADERO */}
                <div className="bg-white dark:bg-[#0f1523] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-1.5 shadow-xs">
                  <label className="text-[10.5px] font-mono font-bold uppercase text-zinc-500 dark:text-zinc-400 block">
                    SOLICITADO ➔ RECIBIDO LAVADERO (HORAS)
                  </label>
                  <input
                    type="number"
                    value={formData.slasTiempo.solicitadoToLavaderoHoras}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      slasTiempo: { ...prev.slasTiempo, solicitadoToLavaderoHoras: Number(e.target.value) }
                    }))}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-zinc-900 dark:text-white focus:outline-none"
                  />
                  <span className="text-[10px] font-mono text-zinc-400 block">
                    Predeterminado: 72 horas hábiles
                  </span>
                </div>

                {/* Field 3: RECIBIDO LAVADERO -> ENVIADO STF */}
                <div className="bg-white dark:bg-[#0f1523] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-1.5 shadow-xs">
                  <label className="text-[10.5px] font-mono font-bold uppercase text-zinc-500 dark:text-zinc-400 block">
                    RECIBIDO LAVADERO ➔ ENVIADO STF (HORAS)
                  </label>
                  <input
                    type="number"
                    value={formData.slasTiempo.lavaderoToEnviadoStfHoras}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      slasTiempo: { ...prev.slasTiempo, lavaderoToEnviadoStfHoras: Number(e.target.value) }
                    }))}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-zinc-900 dark:text-white focus:outline-none"
                  />
                  <span className="text-[10px] font-mono text-zinc-400 block">
                    Predeterminado: 96 horas hábiles
                  </span>
                </div>

                {/* Field 4: ENVIADO STF -> FINALIZADO */}
                <div className="bg-white dark:bg-[#0f1523] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-1.5 shadow-xs">
                  <label className="text-[10.5px] font-mono font-bold uppercase text-zinc-500 dark:text-zinc-400 block">
                    ENVIADO STF ➔ FINALIZADO / EVALUACIÓN (HORAS)
                  </label>
                  <input
                    type="number"
                    value={formData.slasTiempo.enviadoToFinalizadoHoras}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      slasTiempo: { ...prev.slasTiempo, enviadoToFinalizadoHoras: Number(e.target.value) }
                    }))}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-zinc-900 dark:text-white focus:outline-none"
                  />
                  <span className="text-[10px] font-mono text-zinc-400 block">
                    Predeterminado: 24 horas hábiles
                  </span>
                </div>

              </div>

            </div>
          )}

        </div>

        {/* 5. BOTTOM ACTION FOOTER IN ALL TABS */}
        <div className="p-4 sm:p-5 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c1017] flex items-center justify-between gap-3">
          
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-4 py-2.5 rounded-2xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold font-mono flex items-center gap-1.5 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESTABLECER VALORES PREDETERMINADOS</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold uppercase transition cursor-pointer"
            >
              CERRAR
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-zinc-950 to-zinc-900 dark:from-emerald-600 dark:to-teal-600 hover:from-emerald-500 text-white font-black text-xs font-mono uppercase tracking-wider flex items-center gap-2 shadow-lg transition cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-emerald-400" />
              <span>GUARDAR PARÁMETROS (APLICAR A TODO)</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
