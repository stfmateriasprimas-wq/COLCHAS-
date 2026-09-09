export type SectorType = 
  | 'PRE_SOLICITUD'
  | 'SOLICITADO'
  | 'LAVANDERIA'
  | 'CALIDAD'
  | 'FINALIZADO';

export type DictamenType = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';

export interface MonitoreoItem {
  tela: string;
  mt: string;
  color: string;
  op: string;
  referencia: string;
}

export interface PruebasCalidad {
  medidaInicialCm?: number;
  encogimientoTramaPct?: number;
  encogimientoUrdimbrePct?: number;
  tonoAprobado?: boolean;
}

export interface SolicitudColcha {
  id: string;
  op: string;
  referencia: string;
  tela: string;
  codigoMt: string;
  color: string;
  rollos: number;
  lote: string;
  estado: SectorType;
  dictamen: DictamenType;
  inspector: string;
  fechaCreacion: string;
  fechaActualizacion?: string;
  observacionesOperario?: string;
  observacionesLavanderia?: string;
  observacionesCalidad?: string;
  fotoMuestraUrl?: string;
  fotoCalidadUrl?: string;
  fechaFotoCalidad?: string;
  areaActual: string;
  
  // Parámetros técnicos textiles
  pruebas?: PruebasCalidad;
  emailUsuario?: string;
  mes?: number;

  // SLA tracking
  horasEnProceso: number;
  diasHabiles: number;
  limiteSlaDias: number;
  tieneRetraso: boolean;
  esRetrasoCritico: boolean;
}

export interface ChatMessage {
  id: string;
  remitente: string;
  remitenteId?: string;
  destinatarioId?: string;
  canalId?: string;
  area: string;
  mensaje: string;
  opRelacionada?: string;
  timestamp: string;
  fecha?: string;
  audioUrl?: string;
  audioDuracion?: number;
  archivoUrl?: string;
  archivoNombre?: string;
  archivoTipo?: 'imagen' | 'documento';
  leido?: boolean;
  tipo: 'texto' | 'alerta' | 'movimiento' | 'audio' | 'archivo' | 'op';
}

export interface KpiMetrics {
  totalHistorico: number;
  totalEnProceso: number;
  preSolicitud: number;
  solicitados: number;
  lavanderia: number;
  calidad: number;
  finalizados: number;
}
