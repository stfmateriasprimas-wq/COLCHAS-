import { SolicitudColcha, SectorType } from '../types';

export interface CumplimientoMetrics {
  totalOps: number;
  totalMetros: number;
  totalRollos: number;
  
  // 1. Tiempos & SLA
  opsATiempo: number;
  opsConRetraso: number;
  pctCumplimientoSla: number;
  leadTimePromedioHoras: number;
  leadTimePromedioDias: number;

  // 2. Calidad Técnica
  aprobados: number;
  aprobadosEnGama: number;
  rechazados: number;
  enProceso: number;
  decididos: number;
  pctCalidadAprobacion: number;
  pctRechazo: number;

  // 3. Indicador Integral OTIF (On-Time & In-Full)
  otifCount: number;
  pctOtif: number;

  // 4. Cobertura por Fases (6 Etapas Oficiales)
  fases: {
    preSolicitud: { count: number; metros: number; retrasos: number; pct: number };
    solicitado: { count: number; metros: number; retrasos: number; pct: number };
    lavanderia: { count: number; metros: number; retrasos: number; pct: number };
    calidad: { count: number; metros: number; retrasos: number; pct: number };
    evaluado: { count: number; metros: number; retrasos: number; pct: number };
    finalizado: { count: number; metros: number; retrasos: number; pct: number };
  };

  // 5. Cobertura de Evacuación (Finalizadas vs Activas)
  totalFinalizadas: number;
  totalActivas: number;
  pctEvacuacion: number;
}

export type TimeRangeFilter = '7D' | '15D' | '30D' | 'ALL';

/**
 * Filtra la lista de solicitudes según el rango de tiempo seleccionado
 */
export function filterSolicitudesByRange(
  solicitudes: SolicitudColcha[],
  range: TimeRangeFilter
): SolicitudColcha[] {
  if (range === 'ALL') return solicitudes;

  const now = new Date();
  const maxDays = range === '7D' ? 7 : range === '15D' ? 15 : 30;

  return solicitudes.filter(item => {
    if (!item.fechaCreacion) return true;
    
    // Parse fechaCreacion
    const dateParts = item.fechaCreacion.split(' ')[0].split(/[/-]/);
    let itemDate: Date;
    if (dateParts.length === 3) {
      if (dateParts[0].length === 4) {
        itemDate = new Date(parseInt(dateParts[0], 10), parseInt(dateParts[1], 10) - 1, parseInt(dateParts[2], 10));
      } else {
        itemDate = new Date(parseInt(dateParts[2], 10), parseInt(dateParts[1], 10) - 1, parseInt(dateParts[0], 10));
      }
    } else {
      itemDate = new Date(item.fechaCreacion);
    }

    if (isNaN(itemDate.getTime())) return true;
    const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
    return diffDays <= maxDays;
  });
}

/**
 * Calcula todas las métricas de Cumplimiento, Calidad y Cobertura en tiempo real
 */
export function calculateCumplimientoMetrics(solicitudes: SolicitudColcha[]): CumplimientoMetrics {
  const totalOps = solicitudes.length;
  let totalMetros = 0;
  let totalRollos = 0;

  let opsATiempo = 0;
  let opsConRetraso = 0;
  let sumaDiasHabiles = 0;

  let aprobados = 0;
  let aprobadosEnGama = 0;
  let rechazados = 0;
  let enProceso = 0;
  let otifCount = 0;

  const fasesData: Record<SectorType, { count: number; metros: number; retrasos: number }> = {
    PRE_SOLICITUD: { count: 0, metros: 0, retrasos: 0 },
    SOLICITADO: { count: 0, metros: 0, retrasos: 0 },
    LAVANDERIA: { count: 0, metros: 0, retrasos: 0 },
    CALIDAD: { count: 0, metros: 0, retrasos: 0 },
    EVALUADO: { count: 0, metros: 0, retrasos: 0 },
    FINALIZADO: { count: 0, metros: 0, retrasos: 0 }
  };

  solicitudes.forEach(item => {
    const rollos = Number(item.rollos) || 1;
    const metros = rollos * 85;
    totalRollos += rollos;
    totalMetros += metros;

    // SLA & Retrasos
    if (item.tieneRetraso) {
      opsConRetraso++;
    } else {
      opsATiempo++;
    }

    const dias = typeof item.diasHabiles === 'number' && !isNaN(item.diasHabiles) ? item.diasHabiles : 0;
    sumaDiasHabiles += dias;

    // Calidad y Dictamen
    const isAprobado = item.dictamen === 'APROBADO';
    const isAprobadoGama = item.dictamen === 'APROBADO EN GAMA';
    const isRechazado = item.dictamen === 'RECHAZADO';
    const isFinSinRechazo = item.estado === 'FINALIZADO' && !isRechazado;

    if (isAprobado) {
      aprobados++;
    } else if (isAprobadoGama) {
      aprobadosEnGama++;
    } else if (isRechazado) {
      rechazados++;
    } else if (isFinSinRechazo) {
      aprobados++;
    } else {
      enProceso++;
    }

    // OTIF (Calidad Aprobada/Gama Y En tiempo SLA)
    const tieneCalidadOk = isAprobado || isAprobadoGama || isFinSinRechazo;
    if (tieneCalidadOk && !item.tieneRetraso) {
      otifCount++;
    }

    // Fases
    const targetFase = fasesData[item.estado] ? item.estado : 'SOLICITADO';
    fasesData[targetFase].count++;
    fasesData[targetFase].metros += metros;
    if (item.tieneRetraso) {
      fasesData[targetFase].retrasos++;
    }
  });

  // Porcentajes
  const pctCumplimientoSla = totalOps > 0 
    ? Math.round((opsATiempo / totalOps) * 1000) / 10 
    : 100;

  const decididos = aprobados + aprobadosEnGama + rechazados;
  const totalAprobados = aprobados + aprobadosEnGama;
  const pctCalidadAprobacion = decididos > 0 
    ? Math.round((totalAprobados / decididos) * 1000) / 10 
    : 100;

  const pctRechazo = decididos > 0 
    ? Math.round((rechazados / decididos) * 1000) / 10 
    : 0;

  const pctOtif = totalOps > 0 
    ? Math.round((otifCount / (decididos > 0 ? decididos : totalOps)) * 1000) / 10 
    : 100;

  const leadTimePromedioDias = totalOps > 0 ? Math.round((sumaDiasHabiles / totalOps) * 10) / 10 : 0;
  const leadTimePromedioHoras = Math.round(leadTimePromedioDias * 12 * 10) / 10;

  const totalFinalizadas = fasesData.FINALIZADO.count;
  const totalActivas = totalOps - totalFinalizadas;
  const pctEvacuacion = totalOps > 0 ? Math.round((totalFinalizadas / totalOps) * 1000) / 10 : 0;

  const calcPct = (cnt: number) => totalOps > 0 ? Math.round((cnt / totalOps) * 100) : 0;

  return {
    totalOps,
    totalMetros,
    totalRollos,
    opsATiempo,
    opsConRetraso,
    pctCumplimientoSla,
    leadTimePromedioHoras,
    leadTimePromedioDias,
    aprobados,
    aprobadosEnGama,
    rechazados,
    enProceso,
    decididos,
    pctCalidadAprobacion,
    pctRechazo,
    otifCount,
    pctOtif,
    fases: {
      preSolicitud: { ...fasesData.PRE_SOLICITUD, pct: calcPct(fasesData.PRE_SOLICITUD.count) },
      solicitado: { ...fasesData.SOLICITADO, pct: calcPct(fasesData.SOLICITADO.count) },
      lavanderia: { ...fasesData.LAVANDERIA, pct: calcPct(fasesData.LAVANDERIA.count) },
      calidad: { ...fasesData.CALIDAD, pct: calcPct(fasesData.CALIDAD.count) },
      evaluado: { ...fasesData.EVALUADO, pct: calcPct(fasesData.EVALUADO.count) },
      finalizado: { ...fasesData.FINALIZADO, pct: calcPct(fasesData.FINALIZADO.count) }
    },
    totalFinalizadas,
    totalActivas,
    pctEvacuacion
  };
}
