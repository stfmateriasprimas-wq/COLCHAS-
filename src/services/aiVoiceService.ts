import { SolicitudColcha, MonitoreoItem, KpiMetrics, SectorType } from '../types';
import { TabType } from '../components/Navigation';
import { UsuarioSTF } from './authService';

export type StatSectionTabType = 'APROBACION' | 'PROCESADO_DIA' | 'PRODUCTIVIDAD' | 'RENDIMIENTO';

export type AiIntentType =
  | 'NAVIGATE_TAB'
  | 'FILTER_STAGE'
  | 'OPEN_OP_DETAIL'
  | 'OPEN_OP_PRINTER'
  | 'SEARCH_OP'
  | 'OPEN_CHAT'
  | 'OPEN_USER_DIRECTORY'
  | 'OPEN_REPORTE_COMITE'
  | 'OPEN_ADMIN_PARAMETROS'
  | 'TOGGLE_THEME'
  | 'NAVIGATE_STAT_SECTION'
  | 'SYSTEM_METRICS_QUERY'
  | 'UNKNOWN';

export interface AiCommandResult {
  intent: AiIntentType;
  title: string;
  description: string;
  spokenResponse: string;
  targetTab?: TabType;
  targetStage?: SectorType | 'EN_PROCESO' | 'ALL';
  targetStatSection?: StatSectionTabType;
  targetTheme?: 'light' | 'dark';
  targetOp?: SolicitudColcha;
  searchQuery?: string;
  confidence: number;
}

/**
 * Normaliza cadenas de texto eliminando tildes, acentos y caracteres especiales
 */
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Convierte un MonitoreoItem en una SolicitudColcha virtual para previsualización inmediata de etiqueta
 */
const createVirtualSolicitudFromMonitoreo = (m: MonitoreoItem): SolicitudColcha => {
  const mtNum = parseInt((m.mt || '85').replace(/\D/g, ''), 10) || 85;
  const rollosCalculados = Math.max(1, Math.round(mtNum / 85));

  return {
    id: `monitoreo-${m.op || Date.now()}`,
    op: m.op || 'OP-TEMP',
    referencia: m.referencia || 'REF-STF-LINEA',
    tela: m.tela || 'DENIM STRETCH',
    codigoMt: m.mt || '85 MT',
    color: m.color || 'AZUL INDIGO',
    rollos: rollosCalculados,
    lote: `L-${m.op || '001'}`,
    estado: 'PRE_SOLICITUD',
    dictamen: 'PENDIENTE',
    inspector: 'AUDITOR PLANTA STF',
    fechaCreacion: new Date().toISOString(),
    areaActual: 'CALIDAD 2F / ATELIER ZF',
    horasEnProceso: 0,
    diasHabiles: 0,
    limiteSlaDias: 3,
    tieneRetraso: false,
    esRetrasoCritico: false
  };
};

/**
 * Motor de Inteligencia Artificial por Voz en Tiempo Real para STF Group
 * Rastrea en vivo todas las OPs del sistema y ubica su etiqueta correspondiente.
 */
export const processVoiceCommand = (
  rawTranscript: string,
  systemData: {
    solicitudes: SolicitudColcha[];
    monitoreoList?: MonitoreoItem[];
    metrics: KpiMetrics;
    currentUser?: UsuarioSTF | null;
  }
): AiCommandResult => {
  const norm = normalizeText(rawTranscript);
  const { solicitudes, monitoreoList = [], metrics } = systemData;

  // Detectar si el usuario pide explícitamente la ETIQUETA o IMPRIMIR
  const wantsLabelOrPrinter =
    norm.includes('etiqueta') ||
    norm.includes('imprimir') ||
    norm.includes('impresion') ||
    norm.includes('rotulo') ||
    norm.includes('sticker') ||
    norm.includes('ticket') ||
    norm.includes('qr');

  // =========================================================================
  // 1. BÚSQUEDA DINÁMICA DE TODAS LAS OPS EN TIEMPO REAL (BASE DE DATOS + MONITOREO)
  // =========================================================================

  // A. Extracción de dígitos de OP (ej: OP 96079, 96079, 1182, 2048, 3810, etc.)
  const opDigitsMatch = norm.match(/\b(\d{3,7})\b/);
  const foundOpNumber = opDigitsMatch ? opDigitsMatch[1] : null;

  if (foundOpNumber) {
    // 1. Buscar en solicitudes activas de la base de datos
    let matchedOp = solicitudes.find(s => {
      const cleanOp = s.op.replace(/\D/g, '');
      return cleanOp.includes(foundOpNumber) || s.op.toLowerCase().includes(foundOpNumber);
    });

    // 2. Si no está en solicitudes, buscar en la lista de monitoreo en tiempo real
    if (!matchedOp && monitoreoList.length > 0) {
      const foundMonitoreo = monitoreoList.find(m => {
        const cleanOp = (m.op || '').replace(/\D/g, '');
        return cleanOp.includes(foundOpNumber) || (m.op || '').toLowerCase().includes(foundOpNumber);
      });
      if (foundMonitoreo) {
        matchedOp = createVirtualSolicitudFromMonitoreo(foundMonitoreo);
      }
    }

    if (matchedOp) {
      const mt = matchedOp.rollos ? matchedOp.rollos * 85 : 85;

      if (wantsLabelOrPrinter) {
        return {
          intent: 'OPEN_OP_PRINTER',
          targetTab: 'solicitudes',
          targetOp: matchedOp,
          title: `Etiqueta Térmica OP-${matchedOp.op}`,
          description: `Abriendo formato oficial 100mm x 100mm con código QR • Ref: ${matchedOp.referencia}`,
          spokenResponse: `Abriendo la etiqueta térmica oficial de la orden OP ${matchedOp.op}, tela ${matchedOp.tela}.`,
          confidence: 0.99
        };
      }

      return {
        intent: 'OPEN_OP_DETAIL',
        targetTab: 'solicitudes',
        targetOp: matchedOp,
        title: `Ficha y Etiqueta OP-${matchedOp.op}`,
        description: `Ref: ${matchedOp.referencia} • ${matchedOp.tela} • ${mt} MT (${matchedOp.rollos || 1} Rollos) • ${matchedOp.estado}`,
        spokenResponse: `Localicé la orden OP ${matchedOp.op}, referencia ${matchedOp.referencia}. Te llevo a su etiqueta y ficha técnica.`,
        confidence: 0.99
      };
    }
  }

  // B. Búsqueda por Metraje MT o Rollos (ej: "etiqueta de 85 mt", "busca la op de 170 metros", "busca 3 rollos")
  const mtMatch = norm.match(/(\d+)\s*(mt|metros|metro|mts|rollos|rollo)/);
  if (mtMatch) {
    const qty = parseInt(mtMatch[1], 10);
    const unit = mtMatch[2];

    const matchedByMt = solicitudes.filter(s => {
      const sRollos = s.rollos || 1;
      const sMetros = sRollos * 85;
      if (unit.startsWith('rollo')) {
        return sRollos === qty;
      } else {
        return sMetros === qty;
      }
    });

    if (matchedByMt.length === 1) {
      const single = matchedByMt[0];
      const mt = single.rollos ? single.rollos * 85 : 85;

      if (wantsLabelOrPrinter) {
        return {
          intent: 'OPEN_OP_PRINTER',
          targetTab: 'solicitudes',
          targetOp: single,
          title: `Etiqueta Térmica OP-${single.op} (${mt} MT)`,
          description: `Ref: ${single.referencia} • ${single.tela} • ${single.rollos} Rollos`,
          spokenResponse: `Abriendo la etiqueta de la orden OP ${single.op} de ${mt} metros.`,
          confidence: 0.98
        };
      }

      return {
        intent: 'OPEN_OP_DETAIL',
        targetTab: 'solicitudes',
        targetOp: single,
        title: `OP-${single.op} (${mt} MT)`,
        description: `Ref: ${single.referencia} • ${single.tela} • ${single.rollos} Rollos • ${single.estado}`,
        spokenResponse: `Encontré la orden OP ${single.op} con ${mt} metros y ${single.rollos} rollos de tela ${single.tela}.`,
        confidence: 0.98
      };
    } else if (matchedByMt.length > 1) {
      return {
        intent: 'SEARCH_OP',
        targetTab: 'solicitudes',
        searchQuery: `${qty}`,
        title: `Búsqueda: ${matchedByMt.length} OPs con ${qty} ${unit}`,
        description: `Filtrando en la bandeja las órdenes con metraje o rollos coincidentes`,
        spokenResponse: `He encontrado ${matchedByMt.length} órdenes que coinciden con ${qty} ${unit}. Te muestro los resultados.`,
        confidence: 0.95
      };
    }
  }

  // C. Búsqueda por Referencia o Tipo de Tela en todas las OPs del sistema
  const isSearchAction = 
    norm.startsWith('busca') || 
    norm.startsWith('buscar') || 
    norm.startsWith('encuentra') || 
    norm.startsWith('mostrar') || 
    norm.startsWith('muestrame') ||
    norm.includes('referencia') ||
    norm.includes('tela') ||
    norm.includes('etiqueta');

  if (isSearchAction) {
    const cleanSearchTerms = norm
      .replace(/^(busca|buscar|encuentra|mostrar|muestrame|la|el|las|los|op|ops|de|con|por|etiqueta|rotulo|ticket)\s+/g, '')
      .replace(/\b(referencia|ref|tela|etiqueta)\b/g, '')
      .trim();

    if (cleanSearchTerms.length >= 3) {
      // Buscar en solicitudes
      let matchedByRefOrFabric = solicitudes.filter(s => {
        const refNorm = normalizeText(s.referencia || '');
        const telaNorm = normalizeText(s.tela || '');
        const obsNorm = normalizeText(s.observacionesOperario || s.codigoMt || '');
        return refNorm.includes(cleanSearchTerms) || telaNorm.includes(cleanSearchTerms) || obsNorm.includes(cleanSearchTerms);
      });

      // Si no hay en solicitudes, buscar en monitoreo
      if (matchedByRefOrFabric.length === 0 && monitoreoList.length > 0) {
        const monMatch = monitoreoList.filter(m => {
          const refNorm = normalizeText(m.referencia || '');
          const telaNorm = normalizeText(m.tela || '');
          return refNorm.includes(cleanSearchTerms) || telaNorm.includes(cleanSearchTerms);
        });
        if (monMatch.length > 0) {
          matchedByRefOrFabric = monMatch.map(createVirtualSolicitudFromMonitoreo);
        }
      }

      if (matchedByRefOrFabric.length === 1) {
        const single = matchedByRefOrFabric[0];
        const mt = single.rollos ? single.rollos * 85 : 85;

        if (wantsLabelOrPrinter) {
          return {
            intent: 'OPEN_OP_PRINTER',
            targetTab: 'solicitudes',
            targetOp: single,
            title: `Etiqueta OP-${single.op} (${single.referencia})`,
            description: `Tela: ${single.tela} • ${mt} MT • ${single.estado}`,
            spokenResponse: `Abriendo la etiqueta de la OP ${single.op}, referencia ${single.referencia}.`,
            confidence: 0.98
          };
        }

        return {
          intent: 'OPEN_OP_DETAIL',
          targetTab: 'solicitudes',
          targetOp: single,
          title: `OP-${single.op} (${single.referencia})`,
          description: `Tela: ${single.tela} • ${mt} MT • Fase: ${single.estado}`,
          spokenResponse: `Encontré la orden OP ${single.op} de referencia ${single.referencia}, tela ${single.tela}.`,
          confidence: 0.97
        };
      } else if (matchedByRefOrFabric.length > 1) {
        return {
          intent: 'SEARCH_OP',
          targetTab: 'solicitudes',
          searchQuery: cleanSearchTerms,
          title: `Búsqueda: ${matchedByRefOrFabric.length} OPs para "${cleanSearchTerms}"`,
          description: `Filtrando órdenes por referencia o tela coincidente`,
          spokenResponse: `He encontrado ${matchedByRefOrFabric.length} órdenes coincidentes con ${cleanSearchTerms}.`,
          confidence: 0.95
        };
      }
    }
  }

  // =========================================================================
  // 2. COMANDOS OFICIALES DE CONTROL DE TEMA (CLARO / OSCURO)
  // =========================================================================
  if (
    norm.includes('activa el modo claro') ||
    norm.includes('activar modo claro') ||
    norm.includes('modo claro') ||
    norm.includes('tema claro') ||
    norm.includes('pantalla clara') ||
    norm.includes('cambiar a claro')
  ) {
    return {
      intent: 'TOGGLE_THEME',
      targetTheme: 'light',
      title: 'Modo Claro Activado',
      description: 'Cambiando la interfaz al tema visual diurno/claro',
      spokenResponse: 'Activando el modo claro en el sistema.',
      confidence: 0.99
    };
  }

  if (
    norm.includes('activa el modo oscuro') ||
    norm.includes('activar modo oscuro') ||
    norm.includes('modo oscuro') ||
    norm.includes('tema oscuro') ||
    norm.includes('pantalla oscura') ||
    norm.includes('modo noche') ||
    norm.includes('cambiar a oscuro')
  ) {
    return {
      intent: 'TOGGLE_THEME',
      targetTheme: 'dark',
      title: 'Modo Oscuro Activado',
      description: 'Cambiando la interfaz al tema visual nocturno/oscuro',
      spokenResponse: 'Activando el modo oscuro en el sistema.',
      confidence: 0.99
    };
  }

  // =========================================================================
  // 3. COMANDOS DE SECCIONES DE ESTADÍSTICAS & REPORTES
  // =========================================================================
  if (
    norm.includes('tasa de aprobacion') ||
    norm.includes('tasa aprobacion') ||
    norm.includes('porcentaje de aprobacion') ||
    norm.includes('lotes aprobados') ||
    norm.includes('lotes rechazados')
  ) {
    return {
      intent: 'NAVIGATE_STAT_SECTION',
      targetTab: 'estadisticas',
      targetStatSection: 'APROBACION',
      title: 'Estadísticas: Tasa de Aprobación',
      description: 'Visualización de tendencias mensuales, lotes aprobados y rechazados',
      spokenResponse: 'Navegando a la sección de Tasa de Aprobación en Estadísticas.',
      confidence: 0.98
    };
  }

  if (
    norm.includes('procesado por dia') ||
    norm.includes('procesadas por dia') ||
    norm.includes('procesado diario') ||
    norm.includes('produccion diaria') ||
    norm.includes('operarios por dia')
  ) {
    return {
      intent: 'NAVIGATE_STAT_SECTION',
      targetTab: 'estadisticas',
      targetStatSection: 'PROCESADO_DIA',
      title: 'Estadísticas: Procesado por Día',
      description: 'Control de productividad diaria por áreas y operarios en tiempo real',
      spokenResponse: 'Navegando al control de Procesado por Día en Estadísticas.',
      confidence: 0.98
    };
  }

  if (
    norm.includes('indicador de productividad') ||
    norm.includes('productividad') ||
    norm.includes('rendimiento de operarios') ||
    norm.includes('horas productivas')
  ) {
    return {
      intent: 'NAVIGATE_STAT_SECTION',
      targetTab: 'estadisticas',
      targetStatSection: 'PRODUCTIVIDAD',
      title: 'Estadísticas: Indicador de Productividad',
      description: 'Métricas de horas productivas, transporte y cargas procesadas',
      spokenResponse: 'Navegando al Indicador de Productividad en Estadísticas.',
      confidence: 0.98
    };
  }

  if (
    norm.includes('efectividad de rendimiento') ||
    norm.includes('efectividad') ||
    norm.includes('rendimiento') ||
    norm.includes('cumplimiento de metas')
  ) {
    return {
      intent: 'NAVIGATE_STAT_SECTION',
      targetTab: 'estadisticas',
      targetStatSection: 'RENDIMIENTO',
      title: 'Estadísticas: Efectividad de Rendimiento',
      description: 'Evaluación integral de cumplimiento y eficiencia operativa',
      spokenResponse: 'Navegando a Efectividad de Rendimiento en Estadísticas.',
      confidence: 0.98
    };
  }

  if (
    norm.includes('reporte de comite') ||
    norm.includes('reporte comite') ||
    norm.includes('informe de comite') ||
    norm.includes('informe comite') ||
    norm.includes('descargar reporte') ||
    norm.includes('exportar reporte')
  ) {
    return {
      intent: 'OPEN_REPORTE_COMITE',
      targetTab: 'estadisticas',
      title: 'Reporte de Comité Oficial (PDF)',
      description: 'Generador de informes ejecutivos con gráficos y métricas consolidadas',
      spokenResponse: 'Abriendo el módulo de Reporte de Comité en PDF.',
      confidence: 0.98
    };
  }

  // =========================================================================
  // 4. COMANDOS PRINCIPALES DE NAVEGACIÓN POR TÍTULOS DE ÁREA
  // =========================================================================
  if (
    norm.includes('nueva solicitud') ||
    norm.includes('crear solicitud') ||
    norm.includes('crear op') ||
    norm.includes('formulario de solicitud') ||
    norm.includes('ingresar op')
  ) {
    return {
      intent: 'NAVIGATE_TAB',
      targetTab: 'nueva-solicitud',
      title: 'Nueva Solicitud de Colcha',
      description: 'Formulario de registro y sincronización de órdenes desde Monitoreo',
      spokenResponse: 'Navegando a Nueva Solicitud.',
      confidence: 0.99
    };
  }

  if (
    norm.includes('sala de chats') ||
    norm.includes('sala de chat') ||
    norm.includes('chat') ||
    norm.includes('teams') ||
    norm.includes('mensajes') ||
    norm.includes('conversaciones')
  ) {
    return {
      intent: 'OPEN_CHAT',
      title: 'Sala de Chat STF Teams',
      description: 'Canal de comunicación en tiempo real entre inspectores y planta',
      spokenResponse: 'Abriendo la Sala de Chat de STF Teams.',
      confidence: 0.98
    };
  }

  if (
    norm.includes('linea del tiempo') ||
    norm.includes('linea de tiempo') ||
    norm.includes('timeline') ||
    norm.includes('historial cronologico') ||
    norm.includes('trazabilidad')
  ) {
    return {
      intent: 'NAVIGATE_TAB',
      targetTab: 'timeline',
      title: 'Línea de Tiempo y Trazabilidad',
      description: 'Auditoría cronológica y trazabilidad de eventos por orden',
      spokenResponse: 'Navegando a la Línea de Tiempo.',
      confidence: 0.99
    };
  }

  if (
    norm.includes('estadisticas') ||
    norm.includes('estadistica') ||
    norm.includes('graficas') ||
    norm.includes('reportes gerenciales')
  ) {
    return {
      intent: 'NAVIGATE_TAB',
      targetTab: 'estadisticas',
      title: 'Estadísticas Gerenciales STF',
      description: 'Dashboard de KPIs consolidados, histórico anual y auditoría',
      spokenResponse: 'Navegando al módulo de Estadísticas.',
      confidence: 0.98
    };
  }

  if (
    norm.includes('alertas') ||
    norm.includes('alerta') ||
    norm.includes('retrasos') ||
    norm.includes('sla vencido') ||
    norm.includes('ops atrasadas')
  ) {
    return {
      intent: 'NAVIGATE_TAB',
      targetTab: 'alertas',
      title: 'Central de Alertas y SLA',
      description: 'Monitoreo de órdenes críticas y semáforo de tiempos de respuesta',
      spokenResponse: 'Navegando a la Central de Alertas.',
      confidence: 0.99
    };
  }

  if (
    norm.includes('base de datos') ||
    norm.includes('tabla maestra') ||
    norm.includes('maestro de datos') ||
    norm.includes('google sheets')
  ) {
    return {
      intent: 'NAVIGATE_TAB',
      targetTab: 'base-datos',
      title: 'Base de Datos Maestra',
      description: 'Visualización de toda la base de datos sincronizada con Google Sheets',
      spokenResponse: 'Navegando a la Base de Datos Maestra.',
      confidence: 0.99
    };
  }

  if (
    norm.includes('bandeja de solicitudes') ||
    norm.includes('bandeja') ||
    norm.includes('solicitudes') ||
    norm.includes('lista de solicitudes')
  ) {
    return {
      intent: 'NAVIGATE_TAB',
      targetTab: 'solicitudes',
      title: 'Bandeja de Solicitudes',
      description: 'Gestión activa de flujo de producción y transferencias por etapa',
      spokenResponse: 'Navegando a la Bandeja de Solicitudes.',
      confidence: 0.99
    };
  }

  if (
    norm.includes('dashboard') ||
    norm.includes('inicio') ||
    norm.includes('pantalla principal') ||
    norm.includes('menu principal')
  ) {
    return {
      intent: 'NAVIGATE_TAB',
      targetTab: 'dashboard',
      title: 'Dashboard Principal',
      description: 'Vista general del sistema y accesos rápidos por sector',
      spokenResponse: 'Navegando al Dashboard principal.',
      confidence: 0.98
    };
  }

  // =========================================================================
  // 5. FILTROS POR ETAPA DE TRABAJO
  // =========================================================================
  if (norm.includes('lavanderia') || norm.includes('lavado') || norm.includes('colfactory')) {
    return {
      intent: 'FILTER_STAGE',
      targetTab: 'solicitudes',
      targetStage: 'LAVANDERIA',
      title: `Lavandería: ${metrics.lavanderia} OPs`,
      description: 'Filtrando órdenes en proceso de lavado en Colfactory ZF',
      spokenResponse: `Hay ${metrics.lavanderia} órdenes en proceso de lavado. Navegando a Lavandería.`,
      confidence: 0.96
    };
  }

  if (norm.includes('calidad') || norm.includes('laboratorio')) {
    return {
      intent: 'FILTER_STAGE',
      targetTab: 'solicitudes',
      targetStage: 'CALIDAD',
      title: `Calidad: ${metrics.calidad} OPs`,
      description: 'Filtrando órdenes en auditoría de calidad y laboratorio',
      spokenResponse: `Hay ${metrics.calidad} órdenes en calidad. Navegando a Calidad.`,
      confidence: 0.96
    };
  }

  if (norm.includes('solicitado') || norm.includes('transito') || norm.includes('despacho')) {
    return {
      intent: 'FILTER_STAGE',
      targetTab: 'solicitudes',
      targetStage: 'SOLICITADO',
      title: `Solicitados: ${metrics.solicitados} OPs`,
      description: 'Filtrando órdenes en tránsito por despachar',
      spokenResponse: `Hay ${metrics.solicitados} órdenes en estado Solicitado.`,
      confidence: 0.95
    };
  }

  if (norm.includes('pre solicitud') || norm.includes('presolicitud') || norm.includes('atelier')) {
    return {
      intent: 'FILTER_STAGE',
      targetTab: 'solicitudes',
      targetStage: 'PRE_SOLICITUD',
      title: `Pre-Solicitud Atelier: ${metrics.preSolicitud} OPs`,
      description: 'Filtrando órdenes preliminares creadas en Zona Franca',
      spokenResponse: `Hay ${metrics.preSolicitud} órdenes en Pre-Solicitud de Atelier.`,
      confidence: 0.95
    };
  }

  if (norm.includes('finalizado') || norm.includes('finalizados') || norm.includes('liberadas') || norm.includes('aprobadas')) {
    return {
      intent: 'FILTER_STAGE',
      targetTab: 'solicitudes',
      targetStage: 'FINALIZADO',
      title: `Finalizados: ${metrics.finalizados} OPs`,
      description: 'Filtrando órdenes liberadas y aprobadas en el sistema',
      spokenResponse: `Hay ${metrics.finalizados} órdenes finalizadas y aprobadas.`,
      confidence: 0.95
    };
  }

  // =========================================================================
  // 6. DEFAULT FALLBACK
  // =========================================================================
  return {
    intent: 'UNKNOWN',
    title: 'Comando no reconocido',
    description: `Solicitud: "${rawTranscript}". Puedes pedirme: "Llévame a la OP 96079", "Etiqueta de la OP 96079", "Llévame a solicitudes", "Activa el modo claro/oscuro", etc.`,
    spokenResponse: 'No reconocí el comando. Puedes pedirme que te lleve a una orden por su número, ver su etiqueta, o navegar a cualquier sección del sistema.',
    confidence: 0.5
  };
};

/**
 * Síntesis de voz (Text-to-Speech) en español natural con Web Speech Synthesis API
 */
export const speakAiResponse = (text: string) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }

  try {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-CO';
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const spanishVoice = voices.find(
      v => v.lang.startsWith('es') || v.name.includes('Spanish') || v.name.includes('Paulina') || v.name.includes('Monica') || v.name.includes('Jorge')
    );

    if (spanishVoice) {
      utterance.voice = spanishVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Error al reproducir síntesis de voz:', err);
  }
};
