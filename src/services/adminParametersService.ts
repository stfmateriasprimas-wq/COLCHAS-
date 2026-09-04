// Centralized Administrator Parameters Service for STF Group System
// Allows Edwin (Admin) to configure thresholds, SLAs, targets, and productivity ranges in real-time.

export interface AdminParametersState {
  // TAB 1: TASA DE APROBACIÓN
  tasaAprobacion: {
    metaObjetivoPct: number;       // e.g. 95%
    rangoSobresalienteMinPct: number; // e.g. 95%
    rangoAceptableMinPct: number;    // e.g. 85%
    rangoCriticoMaxPct: number;      // e.g. 84.9%
    toleranciaRechazosConsecutivos: number; // e.g. 2 lotes
  };

  // TAB 2: INDICADOR DE PRODUCTIVIDAD
  productividad: {
    metaMuestrasDia: number;         // e.g. 15 muestras/día
    tiempoObjetivoHoras: number;     // e.g. 24h por muestra
    rangoAltoMinMuestras: number;    // e.g. 15 muestras/día
    rangoMedioMinMuestras: number;   // e.g. 10 muestras/día
    metaMetrajeDiario: number;       // e.g. 500 metros/día
  };

  // TAB 3: EFECTIVIDAD EN RENDIMIENTO
  rendimiento: {
    metaEficienciaGlobalPct: number; // e.g. 90%
    metaCumplimientoSlaPct: number;  // e.g. 92%
    horasMuertasMaxMes: number;      // e.g. 15 horas
    rangoOptimaMinPct: number;       // e.g. 90%
    rangoRegularMinPct: number;      // e.g. 75%
  };

  // TAB 4: SLAS DE TIEMPO
  slasTiempo: {
    preSolToSolicitadoHoras: number;  // e.g. 48h
    solicitadoToLavaderoHoras: number; // e.g. 72h
    lavaderoToEnviadoStfHoras: number; // e.g. 96h
    enviadoToFinalizadoHoras: number;  // e.g. 24h
    slaTotalMaxDias: number;           // e.g. 3 días
  };

  lastModified: string;
}

export const DEFAULT_ADMIN_PARAMETERS: AdminParametersState = {
  tasaAprobacion: {
    metaObjetivoPct: 95,
    rangoSobresalienteMinPct: 95,
    rangoAceptableMinPct: 85,
    rangoCriticoMaxPct: 84.9,
    toleranciaRechazosConsecutivos: 2
  },
  productividad: {
    metaMuestrasDia: 15,
    tiempoObjetivoHoras: 24,
    rangoAltoMinMuestras: 15,
    rangoMedioMinMuestras: 10,
    metaMetrajeDiario: 500
  },
  rendimiento: {
    metaEficienciaGlobalPct: 90,
    metaCumplimientoSlaPct: 92,
    horasMuertasMaxMes: 15,
    rangoOptimaMinPct: 90,
    rangoRegularMinPct: 75
  },
  slasTiempo: {
    preSolToSolicitadoHoras: 48,
    solicitadoToLavaderoHoras: 72,
    lavaderoToEnviadoStfHoras: 96,
    enviadoToFinalizadoHoras: 24,
    slaTotalMaxDias: 3
  },
  lastModified: '3/9/2026'
};

const STORAGE_KEY = 'stf_admin_parameters_v1';
const listeners: Array<(params: AdminParametersState) => void> = [];

export function getAdminParameters(): AdminParametersState {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_ADMIN_PARAMETERS,
          ...parsed,
          tasaAprobacion: { ...DEFAULT_ADMIN_PARAMETERS.tasaAprobacion, ...(parsed.tasaAprobacion || {}) },
          productividad: { ...DEFAULT_ADMIN_PARAMETERS.productividad, ...(parsed.productividad || {}) },
          rendimiento: { ...DEFAULT_ADMIN_PARAMETERS.rendimiento, ...(parsed.rendimiento || {}) },
          slasTiempo: { ...DEFAULT_ADMIN_PARAMETERS.slasTiempo, ...(parsed.slasTiempo || {}) }
        };
      } catch (e) {
        // use default
      }
    }
  }
  return DEFAULT_ADMIN_PARAMETERS;
}

export function saveAdminParameters(params: Partial<AdminParametersState>): AdminParametersState {
  const current = getAdminParameters();
  const now = new Date();
  const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

  const updated: AdminParametersState = {
    ...current,
    ...params,
    tasaAprobacion: { ...current.tasaAprobacion, ...(params.tasaAprobacion || {}) },
    productividad: { ...current.productividad, ...(params.productividad || {}) },
    rendimiento: { ...current.rendimiento, ...(params.rendimiento || {}) },
    slasTiempo: { ...current.slasTiempo, ...(params.slasTiempo || {}) },
    lastModified: dateStr
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  // Notify active subscribers
  listeners.forEach(fn => fn(updated));
  return updated;
}

export function resetAdminParameters(): AdminParametersState {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
  listeners.forEach(fn => fn(DEFAULT_ADMIN_PARAMETERS));
  return DEFAULT_ADMIN_PARAMETERS;
}

export function subscribeAdminParameters(listener: (params: AdminParametersState) => void): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

// Evaluation helpers based on active parameters
export function evaluateApprovalRate(rate: number, params?: AdminParametersState) {
  const p = params || getAdminParameters();
  if (rate >= p.tasaAprobacion.rangoSobresalienteMinPct) {
    return {
      status: 'SOBRESALIENTE',
      label: 'Sobresaliente / Excelente',
      badgeClass: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-500/40',
      color: '#10b981'
    };
  }
  if (rate >= p.tasaAprobacion.rangoAceptableMinPct) {
    return {
      status: 'ACEPTABLE',
      label: 'Aceptable / Normal',
      badgeClass: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-500/40',
      color: '#3b82f6'
    };
  }
  return {
    status: 'CRITICO',
    label: 'Crítico / Atención Inmediata',
    badgeClass: 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-500/40',
    color: '#ef4444'
  };
}

export function evaluateProductivityDailyOps(opsCount: number, params?: AdminParametersState) {
  const p = params || getAdminParameters();
  if (opsCount >= p.productividad.rangoAltoMinMuestras) {
    return {
      status: 'ALTO',
      label: 'Alta Productividad: ≥ ' + p.productividad.rangoAltoMinMuestras + ' Muestras/Día',
      badgeClass: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-500/40',
      color: '#10b981'
    };
  }
  if (opsCount >= p.productividad.rangoMedioMinMuestras) {
    return {
      status: 'MEDIO',
      label: 'Productividad Media: ' + p.productividad.rangoMedioMinMuestras + ' a ' + (p.productividad.rangoAltoMinMuestras - 1) + ' Muestras/Día',
      badgeClass: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-500/40',
      color: '#f59e0b'
    };
  }
  return {
    status: 'BAJO',
    label: 'Bajo Ritmo: < ' + p.productividad.rangoMedioMinMuestras + ' Muestras/Día',
    badgeClass: 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-500/40',
    color: '#ef4444'
  };
}

export function evaluateEfficiencyRate(effRate: number, params?: AdminParametersState) {
  const p = params || getAdminParameters();
  if (effRate >= p.rendimiento.rangoOptimaMinPct) {
    return {
      status: 'OPTIMA',
      label: 'Óptima / Excelente: ≥ ' + p.rendimiento.rangoOptimaMinPct + '%',
      badgeClass: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-500/40',
      color: '#10b981'
    };
  }
  if (effRate >= p.rendimiento.rangoRegularMinPct) {
    return {
      status: 'REGULAR',
      label: 'Regular / Normal: ' + p.rendimiento.rangoRegularMinPct + '% a ' + (p.rendimiento.rangoOptimaMinPct - 0.1) + '%',
      badgeClass: 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border-sky-500/40',
      color: '#0ea5e9'
    };
  }
  return {
    status: 'ALERTA',
    label: 'Alerta / Bajo Rendimiento: < ' + p.rendimiento.rangoRegularMinPct + '%',
    badgeClass: 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-500/40',
    color: '#ef4444'
  };
}
