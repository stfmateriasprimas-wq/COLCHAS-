export type SectorType = 
  | 'PRE_SOLICITUD'
  | 'SOLICITADO'
  | 'LAVANDERIA'
  | 'CALIDAD'
  | 'EVALUADO'
  | 'FINALIZADO';

export type DictamenType = 'PENDIENTE' | 'APROBADO' | 'APROBADO EN GAMA' | 'RECHAZADO';

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
  driveFolderUrl?: string;
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

export interface ChatOpCardData {
  op: string;
  tela: string;
  color?: string;
  referencia?: string;
  estado: SectorType;
  dictamen?: DictamenType;
  diasHabiles: number;
  tieneRetraso: boolean;
  esRetrasoCritico?: boolean;
  fotoMuestraUrl?: string;
  fotoCalidadUrl?: string;
  observacion?: string;
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
  opData?: ChatOpCardData;
  timestamp: string;
  fecha?: string;
  audioUrl?: string;
  audioDuracion?: number;
  audioWaveform?: number[];
  archivoUrl?: string;
  archivoNombre?: string;
  archivoTipo?: 'imagen' | 'documento';
  leido?: boolean;
  entregado?: boolean;
  reacciones?: Record<string, string[]>;
  tipo: 'texto' | 'alerta' | 'movimiento' | 'audio' | 'archivo' | 'op';
  createdMillis?: number;
}

export interface KpiMetrics {
  totalHistorico: number;
  totalEnProceso: number;
  preSolicitud: number;
  solicitados: number;
  lavanderia: number;
  calidad: number;
  evaluado: number;
  finalizados: number;
}
