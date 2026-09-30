/**
 * STF GROUP - MOTOR DE TRAZABILIDAD AUTOMÁTICA DE LÍNEA DE TIEMPO
 * Registra automáticamente la fecha y hora exacta de creación y de cada cambio de área de trabajo,
 * midiendo tiempos de permanencia, cuellos de botella y lead time por lugar de trabajo en tiempo real.
 */

import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  onSnapshot 
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { SectorType, SolicitudColcha } from '../types';
import { 
  parseColombianDate, 
  formatColombianDisplayDate, 
  calculateWorkingTimeBetween 
} from './slaCalculator';
import { formatOpCode, sendAppsScriptPost } from './googleSheetsService';

export interface StageTimeRecord {
  stageId: SectorType;
  stageLabel: string;
  area: string;
  fechaIngreso: string; // ISO 8601
  fechaIngresoFormatted: string;
  fechaSalida?: string; // ISO 8601
  fechaSalidaFormatted?: string;
  duracionMinutos?: number;
  duracionHoras?: number;
  duracionDias?: number;
  duracionTexto?: string; // Ej: "1d 4h" o "3h 25m"
  duracionHorasHabiles?: number;
  responsableIngreso: string;
  responsableSalida?: string;
  observacion?: string;
  dictamen?: string;
  completado: boolean;
  activo: boolean;
  enAlerta?: boolean;
}

export interface TimelineTransitionEvent {
  id: string;
  deEstado: string;
  aEstado: string;
  fecha: string; // ISO 8601
  fechaFormatted: string;
  usuario: string;
  area: string;
  observacion?: string;
  dictamen?: string;
  tiempoEnEtapaPrevia?: string;
}

export interface OpTimelineRecord {
  op: string; // "OP-00096501"
  referencia?: string;
  tela?: string;
  fechaInicio: string; // ISO 8601
  fechaInicioFormatted: string;
  creador: string;
  estadoActual: SectorType;
  areaActual: string;
  stages: Partial<Record<SectorType, StageTimeRecord>>;
  historial: TimelineTransitionEvent[];
  leadTimeTotalMinutos?: number;
  leadTimeTotalTexto?: string;
  ultimaActualizacion: string;
}

const COLLECTION_NAME = 'stf_op_timelines';
const CACHE_STORAGE_KEY = 'stf_op_timelines_cache_v2';

const AREA_LABELS: Record<SectorType, string> = {
  PRE_SOLICITUD: 'CALIDAD 2F / ATELIER',
  SOLICITADO: 'TRÁNSITO / DESPACHO',
  LAVANDERIA: 'LAVANDERÍA COLFACTORY ZF',
  CALIDAD: 'CALIDAD STF LABORATORIO',
  EVALUADO: 'EVALUADO Y ENVIADO A FACTORY',
  FINALIZADO: 'CALIDAD PLANTA STF (LIBERADA)'
};

const STAGE_TITLES: Record<SectorType, string> = {
  PRE_SOLICITUD: 'MUESTRA CREADA Y REGISTRADA EN SISTEMA',
  SOLICITADO: 'DESPACHADO A LAVANDERÍA (TRÁNSITO)',
  LAVANDERIA: 'RECEPCIÓN Y CICLO DE LAVADO (COLFACTORY ZF)',
  CALIDAD: 'AUDITORÍA TÉCNICA TEXTIL (LABORATORIO CALIDAD STF)',
  EVALUADO: 'EVALUADO Y ENVIADO A FACTORY (ESPERA CIERRE)',
  FINALIZADO: 'LIBERACIÓN OFICIAL Y CIERRE DE CIRCUITO'
};

class OpTimelineService {
  private timelineCache = new Map<string, OpTimelineRecord>();
  private listeners: Array<(timelines: Map<string, OpTimelineRecord>) => void> = [];
  private isListening = false;
  private unsubscribe: (() => void) | null = null;

  constructor() {
    this.loadFromCache();
    this.initFirestoreListener();
  }

  private loadFromCache(): void {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(CACHE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, OpTimelineRecord>;
        Object.entries(parsed).forEach(([op, record]) => {
          this.timelineCache.set(this.cleanOpKey(op), record);
        });
      }
    } catch (e) {
      console.warn('Error al cargar caché local de líneas de tiempo:', e);
    }
  }

  private saveToCache(): void {
    if (typeof window === 'undefined') return;
    try {
      const obj: Record<string, OpTimelineRecord> = {};
      this.timelineCache.forEach((rec, key) => {
        obj[key] = rec;
      });
      localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(obj));
    } catch (e) {
      console.warn('Error al guardar caché de líneas de tiempo:', e);
    }
  }

  public cleanOpKey(op: string): string {
    return formatOpCode(op).trim().toUpperCase();
  }

  private initFirestoreListener(): void {
    if (typeof window === 'undefined' || this.isListening) return;
    this.isListening = true;

    try {
      this.unsubscribe = onSnapshot(collection(db, COLLECTION_NAME), (snapshot) => {
        let hasChanges = false;
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as OpTimelineRecord;
          if (data && data.op) {
            const key = this.cleanOpKey(data.op);
            this.timelineCache.set(key, data);
            hasChanges = true;
          }
        });

        if (hasChanges) {
          this.saveToCache();
          this.notifyListeners();
        }
      }, (err) => {
        console.warn('Firestore op-timelines sync notice (usando caché local resiliente):', err);
      });
    } catch (err) {
      console.warn('No se pudo inicializar listener de Firestore para timelines:', err);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(cb => {
      try {
        cb(new Map(this.timelineCache));
      } catch (e) {
        console.error('Error en listener de timelines:', e);
      }
    });
  }

  public subscribe(callback: (timelines: Map<string, OpTimelineRecord>) => void): () => void {
    this.listeners.push(callback);
    callback(new Map(this.timelineCache));

    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * INICIO AUTOMÁTICO DE LÍNEA DE TIEMPO
   * Registra automáticamente la fecha y hora de creación de la nueva colcha
   */
  public async startTimelineForNewOp(
    opInput: string,
    referencia?: string,
    tela?: string,
    estadoInicial: SectorType = 'SOLICITADO',
    creador: string = 'OPERARIO STF',
    fechaCreacionInput?: string | Date,
    observacionInicial?: string
  ): Promise<OpTimelineRecord> {
    const cleanOp = this.cleanOpKey(opInput);
    const now = new Date();
    
    // Si viene fecha de creación válida, usarla; de lo contrario, fecha actual
    const startDate = fechaCreacionInput ? parseColombianDate(fechaCreacionInput) : now;
    const validStart = !isNaN(startDate.getTime()) && startDate.getTime() > 0 ? startDate : now;
    const startIso = validStart.toISOString();
    const startFormatted = formatColombianDisplayDate(validStart);

    const initialStageRecord: StageTimeRecord = {
      stageId: estadoInicial,
      stageLabel: STAGE_TITLES[estadoInicial] || estadoInicial,
      area: AREA_LABELS[estadoInicial] || estadoInicial,
      fechaIngreso: startIso,
      fechaIngresoFormatted: startFormatted,
      responsableIngreso: creador,
      observacion: observacionInicial || 'Creación de solicitud y apertura de ficha técnica',
      completado: false,
      activo: true
    };

    // Si empezó en PRE_SOLICITUD y pasó a SOLICITADO, o viceversa, asegurar etapa 1
    const stagesObj: Partial<Record<SectorType, StageTimeRecord>> = {};
    if (estadoInicial === 'SOLICITADO') {
      stagesObj.PRE_SOLICITUD = {
        stageId: 'PRE_SOLICITUD',
        stageLabel: STAGE_TITLES.PRE_SOLICITUD,
        area: AREA_LABELS.PRE_SOLICITUD,
        fechaIngreso: startIso,
        fechaIngresoFormatted: startFormatted,
        fechaSalida: startIso,
        fechaSalidaFormatted: startFormatted,
        duracionMinutos: 0,
        duracionHoras: 0,
        duracionDias: 0,
        duracionTexto: 'Inicio inmediato',
        duracionHorasHabiles: 0,
        responsableIngreso: creador,
        responsableSalida: creador,
        observacion: 'Registro de muestra en planta',
        completado: true,
        activo: false
      };
      stagesObj.SOLICITADO = initialStageRecord;
    } else {
      stagesObj.PRE_SOLICITUD = initialStageRecord;
    }

    const timelineRecord: OpTimelineRecord = {
      op: cleanOp,
      referencia: referencia || '',
      tela: tela || '',
      fechaInicio: startIso,
      fechaInicioFormatted: startFormatted,
      creador,
      estadoActual: estadoInicial,
      areaActual: AREA_LABELS[estadoInicial] || estadoInicial,
      stages: stagesObj,
      historial: [
        {
          id: `trans-init-${Date.now()}`,
          deEstado: 'INICIAL',
          aEstado: estadoInicial,
          fecha: startIso,
          fechaFormatted: startFormatted,
          usuario: creador,
          area: AREA_LABELS[estadoInicial] || estadoInicial,
          observacion: observacionInicial || 'Inicio de línea de tiempo'
        }
      ],
      ultimaActualizacion: now.toISOString()
    };

    // Guardar en memoria local y caché
    this.timelineCache.set(cleanOp, timelineRecord);
    this.saveToCache();
    this.notifyListeners();

    // Persistir en Firestore en segundo plano
    this.persistToFirestore(timelineRecord).catch(() => {});

    // Sincronizar hacia Google Sheets (Hoja TRAZABILIDAD_TIEMPOS)
    this.syncToAppsScriptSheet(
      cleanOp,
      referencia || '',
      tela || '',
      'CREACIÓN',
      estadoInicial,
      startFormatted,
      '0 min',
      creador,
      observacionInicial || 'Creación inicial'
    ).catch(() => {});

    return timelineRecord;
  }

  /**
   * REGISTRO AUTOMÁTICO DE ENTRADA Y CAMBIO DE ÁREA DE TRABAJO
   * Cierra el tiempo del área anterior, mide la permanencia y abre la nueva área
   */
  public async recordStageTransition(
    opInput: string,
    deEstado: SectorType | string,
    aEstado: SectorType,
    usuario: string = 'OPERARIO STF',
    areaUsuario: string = '',
    observacion?: string,
    dictamen?: string,
    referencia?: string,
    tela?: string
  ): Promise<OpTimelineRecord> {
    const cleanOp = this.cleanOpKey(opInput);
    const now = new Date();
    const nowIso = now.toISOString();
    const nowFormatted = formatColombianDisplayDate(now);

    let timeline = this.timelineCache.get(cleanOp);

    // Si aún no existía en memoria, inicializarlo a partir de la fecha del evento
    if (!timeline) {
      timeline = {
        op: cleanOp,
        referencia: referencia || '',
        tela: tela || '',
        fechaInicio: nowIso,
        fechaInicioFormatted: nowFormatted,
        creador: usuario,
        estadoActual: aEstado,
        areaActual: AREA_LABELS[aEstado] || aEstado,
        stages: {},
        historial: [],
        ultimaActualizacion: nowIso
      };
    }

    const previousStageId = (deEstado as SectorType) || timeline.estadoActual;
    let tiempoEnPreviaTexto = '';

    // 1. CERRAR ETAPA ANTERIOR Y CALCULAR PERMANENCIA EXACTA
    if (previousStageId && timeline.stages[previousStageId]) {
      const prev = timeline.stages[previousStageId]!;
      prev.fechaSalida = nowIso;
      prev.fechaSalidaFormatted = nowFormatted;
      prev.responsableSalida = usuario;
      prev.completado = true;
      prev.activo = false;

      // Calcular tiempo laboral exacto entre fecha de ingreso y fecha de salida
      const duration = calculateWorkingTimeBetween(prev.fechaIngreso, nowIso);
      prev.duracionMinutos = duration.minutosHabiles;
      prev.duracionHoras = duration.horasHabiles;
      prev.duracionDias = duration.diasHabiles;
      prev.duracionTexto = duration.duracionTexto;
      prev.duracionHorasHabiles = duration.horasHabiles;

      tiempoEnPreviaTexto = duration.duracionTexto;
    }

    // 2. ABRIR NUEVA ETAPA CON FECHA Y HORA AUTOMÁTICA DE ENTRADA
    const isFinal = aEstado === 'FINALIZADO';
    const newStageRecord: StageTimeRecord = {
      stageId: aEstado,
      stageLabel: STAGE_TITLES[aEstado] || aEstado,
      area: AREA_LABELS[aEstado] || aEstado,
      fechaIngreso: nowIso,
      fechaIngresoFormatted: nowFormatted,
      fechaSalida: isFinal ? nowIso : undefined,
      fechaSalidaFormatted: isFinal ? nowFormatted : undefined,
      responsableIngreso: usuario,
      responsableSalida: isFinal ? usuario : undefined,
      observacion: observacion || `Ingreso a etapa ${aEstado}`,
      dictamen: dictamen,
      completado: isFinal,
      activo: !isFinal
    };

    if (isFinal) {
      // Calcular Lead Time Total de la OP desde fecha de inicio
      const totalLead = calculateWorkingTimeBetween(timeline.fechaInicio, nowIso);
      newStageRecord.duracionMinutos = totalLead.minutosHabiles;
      newStageRecord.duracionHoras = totalLead.horasHabiles;
      newStageRecord.duracionDias = totalLead.diasHabiles;
      newStageRecord.duracionTexto = totalLead.duracionTexto;
      newStageRecord.duracionHorasHabiles = totalLead.horasHabiles;

      timeline.leadTimeTotalMinutos = totalLead.minutosHabiles;
      timeline.leadTimeTotalTexto = totalLead.duracionTexto;
    }

    timeline.stages[aEstado] = newStageRecord;
    timeline.estadoActual = aEstado;
    timeline.areaActual = AREA_LABELS[aEstado] || aEstado;
    timeline.ultimaActualizacion = nowIso;

    // 3. REGISTRAR EVENTO EN HISTORIAL FORENSE
    timeline.historial.push({
      id: `trans-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      deEstado: String(previousStageId),
      aEstado,
      fecha: nowIso,
      fechaFormatted: nowFormatted,
      usuario,
      area: areaUsuario || AREA_LABELS[aEstado] || aEstado,
      observacion,
      dictamen,
      tiempoEnEtapaPrevia: tiempoEnPreviaTexto || undefined
    });

    // 4. PERSISTENCIA
    this.timelineCache.set(cleanOp, timeline);
    this.saveToCache();
    this.notifyListeners();

    // Guardar en Firestore
    this.persistToFirestore(timeline).catch(() => {});

    // Sincronizar hacia Google Sheets
    this.syncToAppsScriptSheet(
      cleanOp,
      referencia || timeline.referencia || '',
      tela || timeline.tela || '',
      String(previousStageId),
      aEstado,
      nowFormatted,
      tiempoEnPreviaTexto || '—',
      `${usuario} (${areaUsuario || AREA_LABELS[aEstado]})`,
      observacion || (dictamen ? `Dictamen: ${dictamen}` : '')
    ).catch(() => {});

    return timeline;
  }

  /**
   * Obtiene la línea de tiempo de una OP, reconstruyendo inteligentemente datos
   * si la OP proviene de Google Sheets previa a la activación del tracker
   */
  public getTimelineForOp(opInput: string, solicitudFallback?: SolicitudColcha): OpTimelineRecord {
    const cleanOp = this.cleanOpKey(opInput);
    const existing = this.timelineCache.get(cleanOp);
    if (existing) return existing;

    // Si no existe en memoria, inicializar a partir de la información de la solicitud
    const fallbackDateStr = solicitudFallback?.fechaCreacion || new Date().toISOString();
    const parsedStart = parseColombianDate(fallbackDateStr);
    const validStart = !isNaN(parsedStart.getTime()) && parsedStart.getTime() > 0 ? parsedStart : new Date();
    const startIso = validStart.toISOString();
    const startFormatted = formatColombianDisplayDate(validStart);

    const estadoSol = solicitudFallback?.estado || 'SOLICITADO';
    const inspectorSol = solicitudFallback?.inspector || 'OPERARIO STF';

    const baselineStages: Partial<Record<SectorType, StageTimeRecord>> = {
      PRE_SOLICITUD: {
        stageId: 'PRE_SOLICITUD',
        stageLabel: STAGE_TITLES.PRE_SOLICITUD,
        area: AREA_LABELS.PRE_SOLICITUD,
        fechaIngreso: startIso,
        fechaIngresoFormatted: startFormatted,
        responsableIngreso: inspectorSol,
        completado: true,
        activo: false
      }
    };

    if (estadoSol === 'SOLICITADO') {
      baselineStages.SOLICITADO = {
        stageId: 'SOLICITADO',
        stageLabel: STAGE_TITLES.SOLICITADO,
        area: AREA_LABELS.SOLICITADO,
        fechaIngreso: startIso,
        fechaIngresoFormatted: startFormatted,
        responsableIngreso: inspectorSol,
        completado: false,
        activo: true
      };
    } else if (estadoSol === 'FINALIZADO') {
      baselineStages.FINALIZADO = {
        stageId: 'FINALIZADO',
        stageLabel: STAGE_TITLES.FINALIZADO,
        area: AREA_LABELS.FINALIZADO,
        fechaIngreso: startIso,
        fechaIngresoFormatted: startFormatted,
        responsableIngreso: inspectorSol,
        dictamen: solicitudFallback?.dictamen,
        completado: true,
        activo: false
      };
    }

    const baseline: OpTimelineRecord = {
      op: cleanOp,
      referencia: solicitudFallback?.referencia || '',
      tela: solicitudFallback?.tela || '',
      fechaInicio: startIso,
      fechaInicioFormatted: startFormatted,
      creador: inspectorSol,
      estadoActual: estadoSol,
      areaActual: AREA_LABELS[estadoSol] || estadoSol,
      stages: baselineStages,
      historial: [],
      ultimaActualizacion: startIso
    };

    this.timelineCache.set(cleanOp, baseline);
    return baseline;
  }

  private async persistToFirestore(record: OpTimelineRecord): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, record.op);
      await setDoc(docRef, record, { merge: true });
    } catch (e) {
      // Manejado en caché local
    }
  }

  private async syncToAppsScriptSheet(
    op: string,
    referencia: string,
    tela: string,
    deEstado: string,
    aEstado: string,
    fechaHora: string,
    tiempoPrevio: string,
    responsable: string,
    observacion: string
  ): Promise<void> {
    try {
      await sendAppsScriptPost('RECORD_TIMELINE_EVENT', {
        op,
        referencia,
        tela,
        deEstado,
        aEstado,
        fechaHora,
        tiempoPrevio,
        responsable,
        observacion
      });
    } catch (e) {
      // Ignorar fallback silencioso
    }
  }
}

export const opTimelineService = new OpTimelineService();
