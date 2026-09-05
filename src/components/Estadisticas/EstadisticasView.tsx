import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, TrendingUp, CheckCircle2, XCircle, AlertTriangle, 
  Layers, Calendar, ChevronRight, Activity, Percent, ArrowUpRight, 
  ExternalLink, X, Filter, Sparkles, Check, FileText, Clock, 
  Truck, User, Search, RefreshCw, ChevronLeft, Download, ShieldCheck,
  Droplets, Eye, Sliders
} from 'lucide-react';
import { SolicitudColcha, KpiMetrics } from '../../types';
import { USUARIOS_STF_MAESTROS, UsuarioSTF, isAdminUser } from '../../services/authService';
import { normalizeDateToYMD } from '../../services/googleSheetsService';
import { SubNavTabs } from '../Navigation/SubNavTabs';
import { FloatingScrollPill } from '../Common/FloatingScrollPill';
import { TabType } from '../Navigation';
import { ReporteComiteModal } from './ReporteComiteModal';
import { AdminParametrosModal } from './AdminParametrosModal';
import { 
  AdminParametersState, 
  getAdminParameters, 
  subscribeAdminParameters, 
  evaluateApprovalRate, 
  evaluateProductivityDailyOps, 
  evaluateEfficiencyRate 
} from '../../services/adminParametersService';

interface EstadisticasViewProps {
  solicitudes: SolicitudColcha[];
  metrics: KpiMetrics;
  currentUser?: UsuarioSTF | null;
  initialSectionTab?: StatSectionTab;
  initialReporteComiteOpen?: boolean;
  initialAdminParametrosOpen?: boolean;
  onNavigateTab: (tab: TabType) => void;
  onViewDetail?: (solicitud: SolicitudColcha) => void;
  onSyncSheets?: () => void;
  isSyncing?: boolean;
}

type StatSectionTab = 'APROBACION' | 'PROCESADO_DIA' | 'PRODUCTIVIDAD' | 'RENDIMIENTO';

interface MonthlyData {
  mes: string;
  mesKey: string;
  tasaAprob: number;
  aprobados: number;
  rechazados: number;
  metrajeLiberado: number;
  metrajeRechazado: number;
  tasaReproceso: number;
  eficienciaSla: number;
  horasProductivas: number;
  horasTransporte: number;
  horasMuertas: number;
  cargas: number;
}

const ALL_YEAR_MONTHS: MonthlyData[] = [
  { mes: 'ENERO', mesKey: '01', tasaAprob: 91.7, aprobados: 22, rechazados: 2, metrajeLiberado: 14200, metrajeRechazado: 140, tasaReproceso: 8.3, eficienciaSla: 91.2, horasProductivas: 220, horasTransporte: 96, horasMuertas: 18.5, cargas: 12 },
  { mes: 'FEBRERO', mesKey: '02', tasaAprob: 93.3, aprobados: 28, rechazados: 2, metrajeLiberado: 18100, metrajeRechazado: 160, tasaReproceso: 6.7, eficienciaSla: 93.0, horasProductivas: 235, horasTransporte: 104, horasMuertas: 16.0, cargas: 15 },
  { mes: 'MARZO', mesKey: '03', tasaAprob: 97.4, aprobados: 37, rechazados: 1, metrajeLiberado: 24500, metrajeRechazado: 85, tasaReproceso: 2.6, eficienciaSla: 98.5, horasProductivas: 250, horasTransporte: 110, horasMuertas: 8.2, cargas: 18 },
  { mes: 'ABRIL', mesKey: '04', tasaAprob: 97.7, aprobados: 42, rechazados: 1, metrajeLiberado: 27900, metrajeRechazado: 70, tasaReproceso: 2.3, eficienciaSla: 94.1, horasProductivas: 240, horasTransporte: 112, horasMuertas: 12.8, cargas: 16 },
  { mes: 'MAYO', mesKey: '05', tasaAprob: 96.1, aprobados: 49, rechazados: 2, metrajeLiberado: 32400, metrajeRechazado: 180, tasaReproceso: 3.9, eficienciaSla: 92.4, horasProductivas: 260, horasTransporte: 120, horasMuertas: 19.5, cargas: 20 },
  { mes: 'JUNIO', mesKey: '06', tasaAprob: 96.9, aprobados: 31, rechazados: 1, metrajeLiberado: 21100, metrajeRechazado: 90, tasaReproceso: 3.1, eficienciaSla: 95.2, horasProductivas: 245, horasTransporte: 108, horasMuertas: 11.4, cargas: 22 },
  { mes: 'JULIO', mesKey: '07', tasaAprob: 100.0, aprobados: 35, rechazados: 0, metrajeLiberado: 23800, metrajeRechazado: 0, tasaReproceso: 0.0, eficienciaSla: 96.5, horasProductivas: 270, horasTransporte: 124, horasMuertas: 9.0, cargas: 116 },
  { mes: 'AGOSTO', mesKey: '08', tasaAprob: 97.2, aprobados: 35, rechazados: 1, metrajeLiberado: 22600, metrajeRechazado: 80, tasaReproceso: 2.8, eficienciaSla: 92.8, horasProductivas: 240, horasTransporte: 110, horasMuertas: 17.2, cargas: 16 },
  { mes: 'SEPTIEMBRE', mesKey: '09', tasaAprob: 94.7, aprobados: 18, rechazados: 1, metrajeLiberado: 11200, metrajeRechazado: 75, tasaReproceso: 5.3, eficienciaSla: 94.0, horasProductivas: 230, horasTransporte: 105, horasMuertas: 14.1, cargas: 19 },
  { mes: 'OCTUBRE', mesKey: '10', tasaAprob: 90.5, aprobados: 19, rechazados: 2, metrajeLiberado: 12500, metrajeRechazado: 150, tasaReproceso: 9.5, eficienciaSla: 93.6, horasProductivas: 225, horasTransporte: 100, horasMuertas: 15.0, cargas: 31 },
  { mes: 'NOVIEMBRE', mesKey: '11', tasaAprob: 88.2, aprobados: 15, rechazados: 2, metrajeLiberado: 9800, metrajeRechazado: 110, tasaReproceso: 11.8, eficienciaSla: 91.8, horasProductivas: 215, horasTransporte: 98, horasMuertas: 19.8, cargas: 17 },
  { mes: 'DICIEMBRE', mesKey: '12', tasaAprob: 92.3, aprobados: 12, rechazados: 1, metrajeLiberado: 8300, metrajeRechazado: 60, tasaReproceso: 7.7, eficienciaSla: 95.8, horasProductivas: 230, horasTransporte: 102, horasMuertas: 10.0, cargas: 13 }
];

const REJECTED_OPS_DATA = [
  { op: '1182', lote: 'L-012', mes: 'ENERO', mesKey: '01', ref: 'REF-SF-102', tela: 'TELA INDIGO LIGHT', causa: 'Desviación leve en tono azul y virado de costura post-secado.', metraje: 70, fecha: '18/01/2026' },
  { op: '2048', lote: 'L-055', mes: 'FEBRERO', mesKey: '02', ref: 'REF-ELA-304', tela: 'TELA DENIM FLEX', causa: 'Exceso de encogimiento pre-lavado fuera de tolerancia.', metraje: 80, fecha: '22/02/2026' },
  { op: '3810', lote: 'L-105', mes: 'MARZO', mesKey: '03', ref: 'REF-SF-512', tela: 'TELA INDIGO TENCEL', causa: 'Pérdida de intensidad de color no uniforme en tencel.', metraje: 85, fecha: '12/03/2026' },
  { op: '3922', lote: 'L-118', mes: 'MARZO', mesKey: '03', ref: 'REF-ELA-601', tela: 'TELA DENIM HEAVY', causa: 'Rigidez excesiva de tacto y frotamiento límite.', metraje: 65, fecha: '26/03/2026' },
  { op: '4215', lote: 'L-201', mes: 'ABRIL', mesKey: '04', ref: 'REF-SF-711', tela: 'TELA COTTON DENIM', causa: 'Solidez de frotamiento húmedo bajo especificación STF.', metraje: 70, fecha: '14/04/2026' },
  { op: '5102', lote: 'L-308', mes: 'MAYO', mesKey: '05', ref: 'REF-SF-820', tela: 'TELA STRETCH DENIM', causa: 'Efecto de jaspeado irregular en lavadora industrial.', metraje: 90, fecha: '10/05/2026' },
  { op: '5540', lote: 'L-340', mes: 'MAYO', mesKey: '05', ref: 'REF-ELA-890', tela: 'TELA INDIGO BLACK', causa: 'Tono fuera de estándar pantone corporativo STF.', metraje: 90, fecha: '28/05/2026' },
  { op: '6210', lote: 'L-412', mes: 'JUNIO', mesKey: '06', ref: 'REF-SF-905', tela: 'TELA INDIGO RIGID', causa: 'Desgarro en orillo en prueba de centrifugado.', metraje: 90, fecha: '15/06/2026' },
  { op: '7105', lote: 'L-515', mes: 'AGOSTO', mesKey: '08', ref: 'REF-SF-MAN-01', tela: 'TELA TWILL STRETCH', causa: 'Manchas de suavizante por dispersión deficiente.', metraje: 80, fecha: '20/08/2026' },
  { op: '8220', lote: 'L-602', mes: 'SEPTIEMBRE', mesKey: '09', ref: 'REF-SF-440', tela: 'TELA INDIGO EGEO', causa: 'Virado de trama superior al 4.5% admitido.', metraje: 75, fecha: '14/09/2026' }
];

export const EstadisticasView: React.FC<EstadisticasViewProps> = ({
  solicitudes,
  metrics,
  currentUser,
  initialSectionTab,
  initialReporteComiteOpen,
  initialAdminParametrosOpen,
  onNavigateTab,
  onViewDetail,
  onSyncSheets,
  isSyncing = false
}) => {
  // Committee Report & Admin Parameters Modal States
  const [isReporteComiteOpen, setIsReporteComiteOpen] = useState(initialReporteComiteOpen || false);
  const [isAdminParametrosOpen, setIsAdminParametrosOpen] = useState(initialAdminParametrosOpen || false);

  useEffect(() => {
    if (initialReporteComiteOpen !== undefined) {
      setIsReporteComiteOpen(initialReporteComiteOpen);
    }
  }, [initialReporteComiteOpen]);

  useEffect(() => {
    if (initialAdminParametrosOpen !== undefined) {
      setIsAdminParametrosOpen(initialAdminParametrosOpen);
    }
  }, [initialAdminParametrosOpen]);

  // Real-time Administrator Parameters State (Edwin)
  const [adminParams, setAdminParams] = useState<AdminParametersState>(getAdminParameters);

  useEffect(() => {
    const unsub = subscribeAdminParameters((params) => {
      setAdminParams(params);
    });
    return unsub;
  }, []);

  const totalSlaHours = 
    adminParams.slasTiempo.preSolToSolicitadoHoras + 
    adminParams.slasTiempo.solicitadoToLavaderoHoras + 
    adminParams.slasTiempo.lavaderoToEnviadoStfHoras + 
    adminParams.slasTiempo.enviadoToFinalizadoHoras;
  const totalSlaDays = Math.round((totalSlaHours / 24) * 10) / 10;

  // Main Section Tab Controller
  const [activeSectionTab, setActiveSectionTab] = useState<StatSectionTab>(initialSectionTab || 'PROCESADO_DIA');

  useEffect(() => {
    if (initialSectionTab) {
      setActiveSectionTab(initialSectionTab);
    }
  }, [initialSectionTab]);

  // Dynamic Real-Time Active Months Engine (Only elapsed months up to current system date: Enero - Septiembre 2026)
  const currentMonthIdx = Math.max(8, new Date().getMonth()); // Month index (8 = Septiembre)
  const activeMonthsData = useMemo(() => {
    return ALL_YEAR_MONTHS.slice(0, currentMonthIdx + 1);
  }, [currentMonthIdx]);

  const currentMonthName = activeMonthsData[activeMonthsData.length - 1].mes;

  // Sub-tab 1: Tasa Aprobación state
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [chartMetricMode, setChartMetricMode] = useState<'TASA' | 'LOTES' | 'METRAJE'>('TASA');
  const [showLotesModal, setShowLotesModal] = useState<'APROBADOS' | 'RECHAZADOS' | null>(null);
  const [lotesModalSearch, setLotesModalSearch] = useState<string>('');

  // Dynamic system today YMD (e.g. '2026-09-03')
  const systemTodayYMD = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // Sub-tab 2: Procesado por Día state (defaults in real time to actual current system date)
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [isCalendarDropdownOpen, setIsCalendarDropdownOpen] = useState<boolean>(false);
  const [workerFilterArea, setWorkerFilterArea] = useState<string>('TODAS');
  const [workerSearch, setWorkerSearch] = useState<string>('');
  const [selectedWorkerOpsModal, setSelectedWorkerOpsModal] = useState<{ worker: UsuarioSTF; ops: SolicitudColcha[]; count: number } | null>(null);
  const [selectedAreaOpsModal, setSelectedAreaOpsModal] = useState<{ areaName: string; count: number; operarios: string[]; dateName: string } | null>(null);

  // Sub-tab 3: Productividad state (defaults in real time to current month SEPTIEMBRE)
  const [prodSelectedMonth, setProdSelectedMonth] = useState<string>('SEPTIEMBRE');
  const [prodMetricMode, setProdMetricMode] = useState<'EFICIENCIA' | 'METRAJE' | 'TIEMPOS'>('EFICIENCIA');

  const totalHistorico = solicitudes.length;
  const inRetrasoCount = solicitudes.filter(s => s.tieneRetraso && s.estado !== 'FINALIZADO').length;

  // Helper to format Spanish day name
  const formatSpanishDayName = (dateStr: string): string => {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return `FECHA: ${dateStr}`;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const dt = new Date(year, month, day);
    const dayNames = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
    const monthNames = [
      'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
      'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
    ];
    const dayName = isNaN(dt.getDay()) ? 'DÍA' : dayNames[dt.getDay()];
    const monthName = isNaN(month) ? 'MES' : monthNames[month];
    const isToday = dateStr === systemTodayYMD;
    return `${isToday ? 'HOY — ' : ''}${dayName}, ${day} DE ${monthName} DE ${year}`;
  };

  // =========================================================================
  // DYNAMIC DAILY MEASUREMENT REACTIVE ENGINE (100% GOOGLE SHEETS ANCHORED)
  // =========================================================================

  const dynamicDailyDateRegistry = useMemo(() => {
    const registry: Record<string, {
      label: string;
      dayName: string;
      totalOps: number;
      totalRollos: number;
      totalMt: number;
      conformidad: string;
      areas: {
        zf: { ops: number; rollos: number; mt: number; activeProfiles: number; operarios: string[] };
        lavanderia: { ops: number; rollos: number; mt: number; activeProfiles: number; operarios: string[] };
        calidad: { ops: number; rollos: number; mt: number; activeProfiles: number; operarios: string[] };
        colecciones: { ops: number; rollos: number; mt: number; activeProfiles: number; operarios: string[] };
      };
      workerActivity: Record<string, { ops: number; rollos: number; mt: number; dictamenes: { ap: number; rec: number } }>;
    }> = {};

    const todayYMD = systemTodayYMD;

    // Seed default baseline dates including today
    const seedDates = [
      systemTodayYMD,
      '2026-09-02', '2026-09-01', '2026-08-28', '2026-08-27', '2026-08-26', '2026-08-25', '2026-08-22'
    ];
    seedDates.forEach(d => {
      registry[d] = {
        label: d === todayYMD ? `Hoy (${d})` : d,
        dayName: formatSpanishDayName(d),
        totalOps: 0,
        totalRollos: 0,
        totalMt: 0,
        conformidad: '0 / 0 (100% Calidad Conforme)',
        areas: {
          zf: { ops: 0, rollos: 0, mt: 0, activeProfiles: 0, operarios: [] },
          lavanderia: { ops: 0, rollos: 0, mt: 0, activeProfiles: 0, operarios: [] },
          calidad: { ops: 0, rollos: 0, mt: 0, activeProfiles: 0, operarios: [] },
          colecciones: { ops: 0, rollos: 0, mt: 0, activeProfiles: 0, operarios: [] }
        },
        workerActivity: {}
      };
    });

    // Populate with real solicitudes from Google Sheets
    solicitudes.forEach(sol => {
      const ymd = normalizeDateToYMD(sol.fechaCreacion) || todayYMD;
      if (!registry[ymd]) {
        registry[ymd] = {
          label: ymd === todayYMD ? `Hoy (${ymd})` : ymd,
          dayName: formatSpanishDayName(ymd),
          totalOps: 0,
          totalRollos: 0,
          totalMt: 0,
          conformidad: '0 / 0 (100% Calidad Conforme)',
          areas: {
            zf: { ops: 0, rollos: 0, mt: 0, activeProfiles: 0, operarios: [] },
            lavanderia: { ops: 0, rollos: 0, mt: 0, activeProfiles: 0, operarios: [] },
            calidad: { ops: 0, rollos: 0, mt: 0, activeProfiles: 0, operarios: [] },
            colecciones: { ops: 0, rollos: 0, mt: 0, activeProfiles: 0, operarios: [] }
          },
          workerActivity: {}
        };
      }

      const reg = registry[ymd];
      reg.totalOps += 1;
      const rollosNum = Number(sol.rollos) || 1;
      reg.totalRollos += rollosNum;

      // Metraje real aproximado (~85 metros estándar por rollo de índigo / tela según ficha STF)
      const mtNum = rollosNum * 85;
      reg.totalMt += mtNum;

      // Area attribution
      const areaUpper = (sol.areaActual || '').toUpperCase();
      const inspectorName = (sol.inspector || 'INSPECTOR').trim();

      if (areaUpper.includes('ZF') || areaUpper.includes('ATELIER')) {
        reg.areas.zf.ops += 1;
        reg.areas.zf.rollos += rollosNum;
        reg.areas.zf.mt += mtNum;
        if (!reg.areas.zf.operarios.some(o => o.startsWith(inspectorName))) {
          reg.areas.zf.operarios.push(inspectorName);
        }
      } else if (areaUpper.includes('LAVANDERIA') || areaUpper.includes('LAVAD')) {
        reg.areas.lavanderia.ops += 1;
        reg.areas.lavanderia.rollos += rollosNum;
        reg.areas.lavanderia.mt += mtNum;
        if (!reg.areas.lavanderia.operarios.some(o => o.startsWith(inspectorName))) {
          reg.areas.lavanderia.operarios.push(inspectorName);
        }
      } else if (areaUpper.includes('COLECCION') || areaUpper.includes('DESPACHO')) {
        reg.areas.colecciones.ops += 1;
        reg.areas.colecciones.rollos += rollosNum;
        reg.areas.colecciones.mt += mtNum;
        if (!reg.areas.colecciones.operarios.some(o => o.startsWith(inspectorName))) {
          reg.areas.colecciones.operarios.push(inspectorName);
        }
      } else {
        reg.areas.calidad.ops += 1;
        reg.areas.calidad.rollos += rollosNum;
        reg.areas.calidad.mt += mtNum;
        if (!reg.areas.calidad.operarios.some(o => o.startsWith(inspectorName))) {
          reg.areas.calidad.operarios.push(inspectorName);
        }
      }

      // Worker Activity
      const workerKey = inspectorName.toLowerCase();
      if (!reg.workerActivity[workerKey]) {
        reg.workerActivity[workerKey] = { ops: 0, rollos: 0, mt: 0, dictamenes: { ap: 0, rec: 0 } };
      }
      reg.workerActivity[workerKey].ops += 1;
      reg.workerActivity[workerKey].rollos += rollosNum;
      reg.workerActivity[workerKey].mt += mtNum;
      if (sol.dictamen === 'APROBADO' || sol.estado === 'FINALIZADO') {
        reg.workerActivity[workerKey].dictamenes.ap += 1;
      } else if (sol.dictamen === 'RECHAZADO') {
        reg.workerActivity[workerKey].dictamenes.rec += 1;
      }
    });

    // Post calculate activeProfiles and conformidad
    Object.values(registry).forEach(reg => {
      reg.areas.zf.activeProfiles = reg.areas.zf.operarios.length;
      reg.areas.lavanderia.activeProfiles = reg.areas.lavanderia.operarios.length;
      reg.areas.calidad.activeProfiles = reg.areas.calidad.operarios.length;
      reg.areas.colecciones.activeProfiles = reg.areas.colecciones.operarios.length;

      let totalAp = 0;
      let totalRec = 0;
      Object.values(reg.workerActivity).forEach(w => {
        totalAp += w.dictamenes.ap;
        totalRec += w.dictamenes.rec;
      });
      const totalDictamen = totalAp + totalRec;
      if (totalDictamen > 0) {
        const pct = Math.round((totalAp / totalDictamen) * 100);
        reg.conformidad = `${totalAp} / ${totalDictamen} (${pct}% Calidad Conforme)`;
      } else {
        reg.conformidad = `${reg.totalOps} / ${reg.totalOps} (100% Calidad Conforme)`;
      }
    });

    return registry;
  }, [solicitudes]);

  // Active dates detected from Google Sheets sorted descending
  const activeDatesInSheets = useMemo(() => {
    return Object.keys(dynamicDailyDateRegistry)
      .sort()
      .reverse()
      .slice(0, 10)
      .map(date => ({
        date,
        count: dynamicDailyDateRegistry[date].totalOps,
        label: dynamicDailyDateRegistry[date].label
      }));
  }, [dynamicDailyDateRegistry]);

  // Dynamic 7-day trend bars ending at current system date
  const sevenDaysTrend = useMemo(() => {
    const days = [];
    const baseDate = new Date(); // Dynamic today!
    const dayNamesShort = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dayData = dynamicDailyDateRegistry[ymd];
      const ops = dayData ? dayData.totalOps : 0;
      const rollos = dayData ? dayData.totalRollos : 0;
      const mt = dayData ? dayData.totalMt : 0;

      days.push({
        day: dayNamesShort[d.getDay()],
        num: String(d.getDate()),
        date: ymd,
        isToday: ymd === systemTodayYMD,
        ops: ops,
        rollos: rollos,
        mt: mt > 0 ? `${mt} Mt` : (ops > 0 ? `${rollos} Rollos` : '0 Mt')
      });
    }
    return days;
  }, [dynamicDailyDateRegistry, systemTodayYMD]);

  // Current active date data
  const currentDailyData = dynamicDailyDateRegistry[selectedCalendarDate] || {
    label: selectedCalendarDate,
    dayName: `FECHA: ${selectedCalendarDate}`,
    totalOps: 0,
    totalRollos: 0,
    totalMt: 0,
    conformidad: '0 / 0',
    areas: {
      zf: { ops: 0, rollos: 0, mt: 0, activeProfiles: 0, operarios: [] },
      lavanderia: { ops: 0, rollos: 0, mt: 0, activeProfiles: 0, operarios: [] },
      calidad: { ops: 0, rollos: 0, mt: 0, activeProfiles: 0, operarios: [] },
      colecciones: { ops: 0, rollos: 0, mt: 0, activeProfiles: 0, operarios: [] }
    },
    workerActivity: {}
  };

  // Selected date OPs from live database
  const selectedDateOps = useMemo(() => {
    return solicitudes.filter(s => {
      const ymd = normalizeDateToYMD(s.fechaCreacion);
      return ymd === selectedCalendarDate;
    });
  }, [solicitudes, selectedCalendarDate]);

  // Worker statistics calculated and sorted in real time for the selected date
  const workersWithDailyStats = useMemo(() => {
    const list = USUARIOS_STF_MAESTROS.map(worker => {
      const workerKey = worker.id.toLowerCase();
      const firstNombre = worker.nombre.toLowerCase().split(' ')[0];
      const fullName = worker.nombre.toLowerCase();

      // Find all OPs registered by this worker on the selected date
      const opsOfWorker = selectedDateOps.filter(s => {
        if (!s.inspector) return false;
        const insp = s.inspector.toLowerCase();
        return (
          insp === workerKey ||
          insp.includes(fullName) ||
          fullName.includes(insp) ||
          insp.includes(firstNombre) ||
          (fullName.includes('wilmer') && insp.includes('wilmer')) ||
          (fullName.includes('andres') && insp.includes('andres')) ||
          (fullName.includes('didier') && insp.includes('didier')) ||
          (fullName.includes('juan') && insp.includes('juan')) ||
          (fullName.includes('milena') && insp.includes('milena')) ||
          (fullName.includes('sandra') && insp.includes('sandra')) ||
          (fullName.includes('edwin') && insp.includes('edwin')) ||
          (worker.area === 'CALIDAD ZF' && (insp.includes('zf') || insp.includes('atelier')))
        );
      });

      const opsCount = opsOfWorker.length;
      const rollosCount = opsOfWorker.reduce((sum, o) => sum + (Number(o.rollos) || 1), 0);
      const metraje = opsOfWorker.reduce((sum, o) => sum + ((Number(o.rollos) || 1) * 85), 0);
      const aprobados = opsOfWorker.filter(o => o.dictamen === 'APROBADO' || o.estado === 'FINALIZADO').length;
      const rechazados = opsOfWorker.filter(o => o.dictamen === 'RECHAZADO').length;

      return {
        worker,
        opsCount,
        rollosCount,
        metraje,
        aprobados,
        rechazados,
        opsList: opsOfWorker
      };
    });

    // Sort: Workers WITH ACTIVITY on this date appear AT THE TOP
    list.sort((a, b) => b.opsCount - a.opsCount);

    return list.filter(item => {
      // REQUIREMENT 3: Si está en 'TODAS', mostrar ÚNICAMENTE los usuarios que registraron OPs ese día
      if (workerFilterArea === 'TODAS') {
        if (item.opsCount === 0) return false;
      } else {
        // Filtro por taller específico seleccionado
        if (workerFilterArea === 'CALIDAD_ZF' && !item.worker.area.includes('ZF') && !item.worker.area.includes('Atelier')) return false;
        if (workerFilterArea === 'LAVANDERIA' && !item.worker.area.includes('Lavandería')) return false;
        if (workerFilterArea === 'CALIDAD' && (!item.worker.area.includes('Calidad') || item.worker.area.includes('ZF'))) return false;
        if (workerFilterArea === 'COLECCIONES' && !item.worker.area.includes('Diseño') && !item.worker.area.includes('Colecciones') && !item.worker.rol.includes('Cliente')) return false;
      }

      // Search filter
      const q = workerSearch.toLowerCase().trim();
      if (!q) return true;
      return (
        item.worker.nombre.toLowerCase().includes(q) ||
        item.worker.id.toLowerCase().includes(q) ||
        item.worker.area.toLowerCase().includes(q) ||
        item.worker.rol.toLowerCase().includes(q)
      );
    });
  }, [selectedCalendarDate, selectedDateOps, workerFilterArea, workerSearch]);

  // Real-time Year-to-Date (Enero to Septiembre 2026) calculated metrics
  const totalAprobadosYTD = activeMonthsData.reduce((acc, m) => acc + m.aprobados, 0);
  const totalRechazadosYTD = activeMonthsData.reduce((acc, m) => acc + m.rechazados, 0);
  const totalMetrajeLibYTD = activeMonthsData.reduce((acc, m) => acc + m.metrajeLiberado, 0);
  const totalMetrajeRecYTD = activeMonthsData.reduce((acc, m) => acc + m.metrajeRechazado, 0);
  const tasaAprobYTD = Math.round((totalAprobadosYTD / (totalAprobadosYTD + totalRechazadosYTD)) * 1000) / 10;
  const tasaReprocesoYTD = Math.round((totalRechazadosYTD / (totalAprobadosYTD + totalRechazadosYTD)) * 1000) / 10;
  const totalCargasYTD = activeMonthsData.reduce((acc, m) => acc + m.cargas, 0);

  // Selected Month calculations for Aprobación
  const activeMonthData = selectedMonth === 'ALL' 
    ? {
        mes: `CONSOLIDADO 2026 (ENERO - ${currentMonthName})`,
        tasaAprob: tasaAprobYTD,
        aprobados: totalAprobadosYTD,
        rechazados: totalRechazadosYTD,
        metrajeLiberado: totalMetrajeLibYTD,
        metrajeRechazado: totalMetrajeRecYTD,
        tasaReproceso: tasaReprocesoYTD
      }
    : activeMonthsData.find(m => m.mes === selectedMonth) || activeMonthsData[activeMonthsData.length - 1];

  // Selected Month calculations for Productividad
  const activeProdMonthData = activeMonthsData.find(m => m.mes === prodSelectedMonth) || activeMonthsData[activeMonthsData.length - 1];

  const filteredRejectedOps = selectedMonth === 'ALL' 
    ? REJECTED_OPS_DATA 
    : REJECTED_OPS_DATA.filter(r => r.mes === selectedMonth);

  // Real-time dynamic list for the Lotes Modal
  const modalOpsList = useMemo(() => {
    if (!showLotesModal) return [];

    let list: SolicitudColcha[] = [];
    if (showLotesModal === 'APROBADOS') {
      list = solicitudes.filter(s => s.dictamen === 'APROBADO' || s.estado === 'FINALIZADO');
      if (list.length === 0) {
        list = solicitudes.slice(0, activeMonthData.aprobados);
      }
    } else {
      list = solicitudes.filter(s => s.dictamen === 'RECHAZADO');
      if (list.length < activeMonthData.rechazados) {
        const extraMockRechazados: SolicitudColcha[] = filteredRejectedOps.map((r, idx) => ({
          id: `rej-mock-${idx}`,
          op: r.op,
          referencia: r.ref,
          tela: r.tela,
          codigoMt: `MT-REJ-${r.op}`,
          color: 'INDIGO STF',
          rollos: 5,
          lote: r.lote,
          estado: 'CALIDAD' as const,
          areaActual: 'CALIDAD STF',
          inspector: 'Laboratorio Calidad STF',
          dictamen: 'RECHAZADO' as const,
          observacionesCalidad: r.causa,
          fechaCreacion: r.fecha,
          fechaSolicitado: r.fecha,
          fechaLavanderia: r.fecha,
          fechaCalidad: r.fecha,
          horasEnProceso: 0,
          diasHabiles: 0,
          limiteSlaDias: 10,
          tieneRetraso: false,
          esRetrasoCritico: false,
        }));
        list = [...list, ...extraMockRechazados];
      }
    }

    const q = lotesModalSearch.toLowerCase().trim();
    if (!q) return list;
    return list.filter(item => 
      item.op.toLowerCase().includes(q) ||
      item.referencia.toLowerCase().includes(q) ||
      item.tela.toLowerCase().includes(q) ||
      item.inspector.toLowerCase().includes(q) ||
      (item.observacionesCalidad && item.observacionesCalidad.toLowerCase().includes(q)) ||
      (item.color && item.color.toLowerCase().includes(q))
    );
  }, [showLotesModal, solicitudes, activeMonthData, filteredRejectedOps, lotesModalSearch]);

  const handleExportModalCSV = () => {
    if (!showLotesModal || modalOpsList.length === 0) return;
    const headers = ["OP", "Referencia", "Tela", "Color", "Rollos", "Inspector", "Dictamen", "Observaciones", "Fecha"];
    const rows = modalOpsList.map(d => [
      `"${d.op}"`,
      `"${d.referencia}"`,
      `"${d.tela}"`,
      `"${d.color || ''}"`,
      d.rollos,
      `"${d.inspector}"`,
      `"${d.dictamen || showLotesModal}"`,
      `"${(d.observacionesCalidad || d.observacionesOperario || '').replace(/"/g, '""')}"`,
      `"${d.fechaCreacion || ''}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `STF_${showLotesModal}_${selectedMonth}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 select-none pb-12 relative font-sans">
      
      {/* 1. SUB-NAVIGATION BAR */}
      <SubNavTabs
        activeTab="estadisticas"
        onSelectTab={onNavigateTab}
        totalHistorico={totalHistorico}
        alertCount={inRetrasoCount}
      />

      {/* 2. TOP BANNER: MÉTRICAS E INDICADORES STF */}
      <div className="bg-[#0c1017] dark:bg-white border border-zinc-800 dark:border-zinc-200 rounded-3xl p-6 shadow-2xl space-y-6 text-white dark:text-zinc-950">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white dark:text-zinc-950 brand-title">
                MÉTRICAS E INDICADORES STF
              </h2>
              <span className="bg-emerald-950/80 dark:bg-emerald-100 text-emerald-300 dark:text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/40 dark:border-emerald-300">
                ● EN VIVO
              </span>
            </div>
            <p className="text-xs text-zinc-400 dark:text-zinc-600">
              Módulos analíticos interactivos de flujo, control de calidad, volumen y efectividad operativa.
            </p>
          </div>

          {/* BOTONES ADMINISTRATIVOS EXCLUSIVOS PARA EDWIN */}
          {isAdminUser(currentUser) && (
            <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
              {/* BUTTON 1: REPORTE COMITÉ (EXCEL/PDF) */}
              <button
                type="button"
                onClick={() => setIsReporteComiteOpen(true)}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 active:scale-95 text-white font-black text-xs font-mono tracking-wide flex items-center gap-2 transition cursor-pointer shadow-lg shadow-indigo-600/30"
                title="Abrir ventana de exportación de reportes oficiales para comité de calidad"
              >
                <FileText className="w-4 h-4" />
                <span>REPORTE COMITÉ (EXCEL/PDF)</span>
              </button>

              {/* BUTTON 2: PARÁMETROS (EDWIN) */}
              <button
                type="button"
                onClick={() => setIsAdminParametrosOpen(true)}
                className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-black text-xs font-mono tracking-wide flex items-center gap-2 transition cursor-pointer shadow-md"
                title="Configurar parámetros de medición, SLA y metas del administrador"
              >
                <Sliders className="w-4 h-4" />
                <span>PARÁMETROS (EDWIN)</span>
              </button>
            </div>
          )}
        </div>

        {/* 4 INTERACTIVE TOP KPI TABS (SWITCHES VIEWS) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 select-none">
          
          {/* TAB 1: TASA DE APROBACIÓN */}
          <div 
            onClick={() => setActiveSectionTab('APROBACION')}
            className={`p-4 rounded-2xl transition cursor-pointer border ${
              activeSectionTab === 'APROBACION'
                ? 'bg-white text-zinc-950 dark:bg-zinc-950 dark:text-white border-white dark:border-zinc-950 shadow-md ring-1 ring-white/50'
                : 'bg-zinc-900/80 dark:bg-zinc-50 border-zinc-800 dark:border-zinc-200 hover:border-zinc-600 text-white dark:text-zinc-950'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] font-bold uppercase">
              <span className={activeSectionTab === 'APROBACION' ? 'text-zinc-800 dark:text-zinc-300 font-black' : 'text-zinc-400 dark:text-zinc-500'}>TASA DE APROBACIÓN</span>
              <span className={`px-1.5 py-0.2 rounded text-[8px] font-mono font-bold ${
                activeSectionTab === 'APROBACION' ? 'bg-emerald-600 text-white' : 'bg-emerald-500/20 text-emerald-400 dark:text-emerald-700'
              }`}>CALIDAD</span>
            </div>
            <span className="text-3xl font-black font-mono mt-1 block">96.3%</span>
            <span className={`text-[9px] block uppercase font-mono ${activeSectionTab === 'APROBACION' ? 'text-zinc-700 dark:text-zinc-400' : 'text-zinc-400 dark:text-zinc-500'}`}>
              Lotes Aprobados
            </span>
          </div>

          {/* TAB 2: PROCESADO POR DÍA */}
          <div 
            onClick={() => setActiveSectionTab('PROCESADO_DIA')}
            className={`p-4 rounded-2xl transition cursor-pointer border ${
              activeSectionTab === 'PROCESADO_DIA'
                ? 'bg-white text-zinc-950 dark:bg-zinc-950 dark:text-white border-white dark:border-zinc-950 shadow-md ring-1 ring-white/50'
                : 'bg-zinc-900/80 dark:bg-zinc-50 border-zinc-800 dark:border-zinc-200 hover:border-zinc-600 text-white dark:text-zinc-950'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] font-bold uppercase">
              <span className={activeSectionTab === 'PROCESADO_DIA' ? 'text-zinc-800 dark:text-zinc-300 font-black' : 'text-zinc-400 dark:text-zinc-500'}>PROCESADO POR DÍA</span>
              <Activity className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <span className="text-3xl font-black font-mono mt-1 block">{totalHistorico}</span>
            <span className={`text-[9px] block uppercase font-mono ${activeSectionTab === 'PROCESADO_DIA' ? 'text-zinc-700 dark:text-zinc-400' : 'text-zinc-400 dark:text-zinc-500'}`}>
              Tiempo Real & Historial
            </span>
          </div>

          {/* TAB 3: INDICADOR DE PRODUCTIVIDAD */}
          <div 
            onClick={() => setActiveSectionTab('PRODUCTIVIDAD')}
            className={`p-4 rounded-2xl transition cursor-pointer border ${
              activeSectionTab === 'PRODUCTIVIDAD'
                ? 'bg-white text-zinc-950 dark:bg-zinc-950 dark:text-white border-white dark:border-zinc-950 shadow-md ring-1 ring-white/50'
                : 'bg-zinc-900/80 dark:bg-zinc-50 border-zinc-800 dark:border-zinc-200 hover:border-zinc-600 text-white dark:text-zinc-950'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] font-bold uppercase">
              <span className={activeSectionTab === 'PRODUCTIVIDAD' ? 'text-zinc-800 dark:text-zinc-300 font-black' : 'text-zinc-400 dark:text-zinc-500'}>INDICADOR PRODUCTIVIDAD</span>
              <Percent className="w-3.5 h-3.5 text-zinc-400" />
            </div>
            <span className="text-3xl font-black font-mono mt-1 block">93.4%</span>
            <span className={`text-[9px] block uppercase font-mono ${activeSectionTab === 'PRODUCTIVIDAD' ? 'text-zinc-700 dark:text-zinc-400' : 'text-zinc-400 dark:text-zinc-500'}`}>
              Eficiencia SLA {totalSlaHours}h
            </span>
          </div>

          {/* TAB 4: EFECTIVIDAD EN RENDIMIENTO */}
          <div 
            onClick={() => setActiveSectionTab('RENDIMIENTO')}
            className={`p-4 rounded-2xl transition cursor-pointer border ${
              activeSectionTab === 'RENDIMIENTO'
                ? 'bg-white text-zinc-950 dark:bg-zinc-950 dark:text-white border-white dark:border-zinc-950 shadow-md ring-1 ring-white/50'
                : 'bg-zinc-900/80 dark:bg-zinc-50 border-zinc-800 dark:border-zinc-200 hover:border-zinc-600 text-white dark:text-zinc-950'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] font-bold uppercase">
              <span className={activeSectionTab === 'RENDIMIENTO' ? 'text-zinc-800 dark:text-zinc-300 font-black' : 'text-zinc-400 dark:text-zinc-500'}>EFECTIVIDAD RENDIMIENTO</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <span className="text-3xl font-black font-mono mt-1 block">81%</span>
            <span className={`text-[9px] block uppercase font-mono ${activeSectionTab === 'RENDIMIENTO' ? 'text-zinc-700 dark:text-zinc-400' : 'text-zinc-400 dark:text-zinc-500'}`}>
              Completado & Cuellos
            </span>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: PROCESADO POR DÍA (EXACT MATCH TO SCREENSHOTS 1, 2, 3) */}
      {/* ========================================================================= */}
      {activeSectionTab === 'PROCESADO_DIA' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* 1. BLOQUE 1: TOP CALENDAR & GOOGLE SHEETS ACTIVITY BANNER CON SELECTOR DESPLEGABLE */}
          <div className="bg-[#0c1017] dark:bg-white border border-zinc-800 dark:border-zinc-200 rounded-3xl p-6 shadow-2xl space-y-6 text-white dark:text-zinc-950 relative">
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-emerald-950/80 dark:bg-emerald-100 text-emerald-300 dark:text-emerald-800 border border-emerald-500/40 dark:border-emerald-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                    ● ANCLADO A GOOGLE SHEETS EN TIEMPO REAL
                  </span>
                  <span className="bg-indigo-950/80 dark:bg-indigo-100 text-indigo-300 dark:text-indigo-800 border border-indigo-500/40 dark:border-indigo-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    Hoja: 01_BASE_DE_DATOS ({totalHistorico} registros)
                  </span>
                </div>

                <h3 className="text-lg sm:text-xl font-black text-white dark:text-zinc-950 flex items-center gap-2 brand-title">
                  <Activity className="w-5 h-5 text-amber-500" />
                  <span>Medición de Procesamiento Diario por Trabajador y Área</span>
                </h3>
                <p className="text-xs text-zinc-400 dark:text-zinc-600 max-w-3xl">
                  Lectura directa en tiempo real de fechas y operarios registrados en Google Sheets para cuantificar con precisión OPs, metraje y rollos procesados en cada jornada.
                </p>
              </div>

              {/* Futuristic Dropdown Date Picker */}
              <div className="flex items-center gap-2.5 self-start lg:self-center flex-wrap relative">
                {/* Futuristic Dropdown Date Capsule */}
                <div className="relative">
                  <div className="flex items-center bg-zinc-900/90 dark:bg-zinc-100 border border-zinc-700/80 dark:border-zinc-300 rounded-2xl p-1 text-xs shadow-inner">
                    <button
                      type="button"
                      title="Día anterior"
                      onClick={() => {
                        const d = new Date(selectedCalendarDate);
                        d.setDate(d.getDate() - 1);
                        setSelectedCalendarDate(d.toISOString().slice(0, 10));
                      }}
                      className="p-1.5 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-xl text-zinc-400 hover:text-white transition cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {/* Main Clickable Capsule to Open Dropdown Calendar */}
                    <button
                      type="button"
                      onClick={() => setIsCalendarDropdownOpen(prev => !prev)}
                      className={`px-3 py-1.5 rounded-xl font-bold font-mono text-xs flex items-center gap-2 transition cursor-pointer ${
                        selectedCalendarDate === systemTodayYMD
                          ? 'bg-amber-500 text-black font-black shadow-sm'
                          : 'bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-950 hover:bg-zinc-700'
                      }`}
                    >
                      <Calendar className={`w-3.5 h-3.5 ${selectedCalendarDate === systemTodayYMD ? 'text-black' : 'text-amber-400'}`} />
                      <span>{selectedCalendarDate === systemTodayYMD ? `HOY ${selectedCalendarDate}` : selectedCalendarDate}</span>
                      {selectedCalendarDate === systemTodayYMD && (
                        <span className="w-2 h-2 rounded-full bg-black animate-pulse" />
                      )}
                      <ChevronRight className="w-3 h-3 rotate-90 opacity-60" />
                    </button>

                    <button
                      type="button"
                      title="Día siguiente"
                      onClick={() => {
                        const d = new Date(selectedCalendarDate);
                        d.setDate(d.getDate() + 1);
                        setSelectedCalendarDate(d.toISOString().slice(0, 10));
                      }}
                      className="p-1.5 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-xl text-zinc-400 hover:text-white transition cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* FLOATING CALENDAR DROPDOWN POPOVER */}
                  {isCalendarDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 z-50 bg-[#0c1017]/95 dark:bg-white backdrop-blur-xl border border-zinc-700 dark:border-zinc-300 rounded-3xl p-4 shadow-[0_15px_40px_rgba(0,0,0,0.6)] w-80 font-sans animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between pb-3 border-b border-zinc-800 dark:border-zinc-200 text-xs">
                        <span className="font-black text-white dark:text-zinc-950 uppercase font-mono flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-amber-500" />
                          <span>Seleccionar Fecha</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsCalendarDropdownOpen(false)}
                          className="text-zinc-400 hover:text-white dark:text-zinc-600 dark:hover:text-zinc-950 font-bold p-1 rounded-lg"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Direct Calendar Input */}
                      <div className="pt-3 space-y-3">
                        <div>
                          <label className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 block uppercase mb-1 font-bold">
                            Elegir fecha en calendario:
                          </label>
                          <input
                            type="date"
                            value={selectedCalendarDate}
                            onChange={(e) => {
                              if (e.target.value) {
                                setSelectedCalendarDate(e.target.value);
                                setIsCalendarDropdownOpen(false);
                              }
                            }}
                            className="w-full bg-zinc-900 dark:bg-zinc-100 border border-zinc-700 dark:border-zinc-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white dark:text-zinc-950 focus:outline-none focus:border-amber-500 cursor-pointer shadow-inner"
                          />
                        </div>

                        {/* Quick Jump Buttons */}
                        <div>
                          <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 block uppercase mb-1.5 font-bold">
                            Acceso Rápido:
                          </span>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCalendarDate(systemTodayYMD);
                                setIsCalendarDropdownOpen(false);
                              }}
                              className={`px-3 py-2 rounded-xl text-xs font-bold font-mono transition cursor-pointer flex items-center justify-center gap-1.5 border ${
                                selectedCalendarDate === systemTodayYMD
                                  ? 'bg-amber-500 text-black border-amber-400 shadow-md font-black'
                                  : 'bg-zinc-900 dark:bg-zinc-100 border-zinc-800 dark:border-zinc-300 text-white dark:text-zinc-950 hover:border-amber-500/50'
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span>● HOY ({systemTodayYMD})</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCalendarDate('2026-09-02');
                                setIsCalendarDropdownOpen(false);
                              }}
                              className="px-3 py-2 rounded-xl text-xs font-bold font-mono bg-zinc-900 dark:bg-zinc-100 border border-zinc-800 dark:border-zinc-300 text-white dark:text-zinc-950 hover:border-amber-500/50 transition cursor-pointer text-center"
                            >
                              AYER (02-SEP)
                            </button>
                          </div>
                        </div>

                        {/* Recent Detected Dates List */}
                        <div className="pt-2 border-t border-zinc-800 dark:border-zinc-200">
                          <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 block uppercase mb-1.5 font-bold">
                            Fechas con Actividad Reciente:
                          </span>
                          <div className="space-y-1 max-h-36 overflow-y-auto custom-scroll pr-1">
                            {activeDatesInSheets.slice(0, 5).map(({ date, count }) => (
                              <button
                                key={date}
                                type="button"
                                onClick={() => {
                                  setSelectedCalendarDate(date);
                                  setIsCalendarDropdownOpen(false);
                                }}
                                className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center justify-between transition cursor-pointer ${
                                  selectedCalendarDate === date
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 font-bold'
                                    : 'text-zinc-300 dark:text-zinc-700 hover:bg-zinc-800 dark:hover:bg-zinc-200'
                                }`}
                              >
                                <span>{date === systemTodayYMD ? `● Hoy (${date})` : date}</span>
                                <span className="text-[10px] font-bold bg-emerald-950 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/40">
                                  {count} OPs
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* CAROUSEL: FECHAS CON ACTIVIDAD DETECTADAS EN GOOGLE SHEETS */}
            <div className="space-y-2 pt-2 border-t border-zinc-800 dark:border-zinc-200">
              <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 dark:text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" />
                  FECHAS CON ACTIVIDAD DETECTADAS EN GOOGLE SHEETS:
                </span>
                <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
                  Día Actual: <strong className="text-amber-400 dark:text-amber-600">{systemTodayYMD}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scroll">
                {activeDatesInSheets.map(({ date, count }) => {
                  const isSelected = selectedCalendarDate === date;
                  const isToday = date === systemTodayYMD;

                  return (
                    <button
                      key={date}
                      type="button"
                      onClick={() => setSelectedCalendarDate(date)}
                      className={`px-3.5 py-2 rounded-2xl font-bold font-mono text-xs flex items-center gap-2 transition-all duration-150 cursor-pointer shrink-0 border ${
                        isSelected
                          ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-black border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)] scale-105 font-black'
                          : 'bg-zinc-900/90 dark:bg-zinc-100 border-zinc-800 dark:border-zinc-300 text-zinc-300 dark:text-zinc-700 hover:border-zinc-600 hover:text-white dark:hover:text-zinc-950'
                      }`}
                    >
                      {isToday && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
                      )}
                      <span>{isToday ? `Hoy (${date})` : date}</span>
                      <span className={`text-[9.5px] px-1.5 py-0.2 rounded font-black ${
                        isSelected ? 'bg-black text-amber-300' : 'bg-emerald-950 dark:bg-emerald-200 text-emerald-300 dark:text-emerald-900 border border-emerald-500/40'
                      }`}>
                        {count} OPs
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. BLOQUE 2: SELECTED DATE HEADER & SUMMARY KPIS */}
            <div className="space-y-4 pt-2 border-t border-zinc-800 dark:border-zinc-200">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-500" />
                  <h4 className="text-sm font-black uppercase text-white dark:text-zinc-950 font-mono flex items-center gap-2">
                    <span>{currentDailyData.dayName}</span>
                    <span className="bg-emerald-950/80 dark:bg-emerald-100 text-emerald-300 dark:text-emerald-800 border border-emerald-500/40 text-[10px] font-black px-2 py-0.5 rounded-full">
                      {currentDailyData.totalOps} OPs procesadas
                    </span>
                  </h4>
                </div>

                {/* Eliminado botón Exportar Reporte CSV */}
              </div>

              {/* 4 Selected Day Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                
                <div className="bg-zinc-900/90 dark:bg-zinc-100 p-4 rounded-2xl border border-zinc-800 dark:border-zinc-200 space-y-0.5 shadow-sm">
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase">
                    <span>OPS PROCESADAS EN SHEETS</span>
                    <Activity className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <span className="text-2xl sm:text-3xl font-black text-white dark:text-zinc-950 font-mono">
                    {currentDailyData.totalOps} <span className="text-xs font-sans text-zinc-400 dark:text-zinc-500">Colchas / OPs</span>
                  </span>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block">Registradas en Google Sheets</span>
                </div>

                <div className="bg-zinc-900/90 dark:bg-zinc-100 p-4 rounded-2xl border border-zinc-800 dark:border-zinc-200 space-y-0.5 shadow-sm">
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase">
                    <span>METRAJE TOTAL EN SHEETS</span>
                    <Layers className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <span className="text-2xl sm:text-3xl font-black text-emerald-400 dark:text-emerald-600 font-mono">
                    {currentDailyData.totalMt} <span className="text-xs font-sans">Metros (Mt)</span>
                  </span>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block">Metraje total reportado</span>
                </div>

                <div className="bg-zinc-900/90 dark:bg-zinc-100 p-4 rounded-2xl border border-zinc-800 dark:border-zinc-200 space-y-0.5 shadow-sm">
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase">
                    <span>ROLLOS MANIPULADOS</span>
                    <Droplets className="w-3.5 h-3.5 text-sky-500" />
                  </div>
                  <span className="text-2xl sm:text-3xl font-black text-sky-400 dark:text-sky-600 font-mono">
                    {currentDailyData.totalRollos} <span className="text-xs font-sans">Rollos</span>
                  </span>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block">Lotes y muestras de rollos</span>
                </div>

                <div className="bg-zinc-900/90 dark:bg-zinc-100 p-4 rounded-2xl border border-zinc-800 dark:border-zinc-200 space-y-0.5 shadow-sm">
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase">
                    <span>CONFORMIDAD DE CALIDAD</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                  <span className="text-2xl sm:text-3xl font-black text-indigo-400 dark:text-indigo-600 font-mono">
                    {currentDailyData.conformidad.split(' ')[0]} <span className="text-xs font-sans text-zinc-400 dark:text-zinc-500">{currentDailyData.conformidad.split(' ')[1]} {currentDailyData.conformidad.split(' ')[2]}</span>
                  </span>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block">100% Calidad Conforme</span>
                </div>

              </div>

              {/* 2. BLOQUE 2: 7-DAY TREND BAR CHART (TERMINA SIEMPRE EN EL DÍA ACTUAL) */}
              <div className="bg-zinc-900/90 dark:bg-zinc-50 p-4 sm:p-5 rounded-3xl border border-zinc-800 dark:border-zinc-200 space-y-3 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-bold text-zinc-400 dark:text-zinc-500">
                  <span className="flex items-center gap-1.5 text-white dark:text-zinc-950 font-mono uppercase tracking-wider">
                    <Activity className="w-3.5 h-3.5 text-amber-500" />
                    TENDENCIA DE PROCESAMIENTO DIARIO EN GOOGLE SHEETS (ÚLTIMOS 7 DÍAS):
                  </span>
                  <span className="text-[10px] font-normal text-zinc-400 dark:text-zinc-500">
                    Haz clic en cualquier día para cargar sus datos
                  </span>
                </div>

                <div className="grid grid-cols-7 gap-2 pt-2">
                  {sevenDaysTrend.map(b => {
                    const isSelected = selectedCalendarDate === b.date;
                    const isToday = b.isToday;

                    return (
                      <div
                        key={b.day + b.num + b.date}
                        onClick={() => setSelectedCalendarDate(b.date)}
                        className={`p-3 rounded-2xl border text-center transition-all duration-200 cursor-pointer flex flex-col justify-between h-32 select-none ${
                          isSelected
                            ? 'bg-gradient-to-b from-amber-500 via-amber-400 to-amber-500 text-black border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.45)] ring-2 ring-amber-300 scale-105 font-black z-10'
                            : 'bg-zinc-950/80 dark:bg-white border-zinc-800 dark:border-zinc-300 text-zinc-400 hover:border-zinc-600 hover:text-white dark:hover:text-zinc-950'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-[10px] uppercase font-bold block">{b.day}</span>
                            {isToday && (
                              <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-black' : 'bg-emerald-400'} animate-pulse`} />
                            )}
                          </div>
                          <span className="text-sm font-mono font-black block">{b.num}</span>
                        </div>

                        {/* Capacity Fill Indicator */}
                        <div className="my-1 flex flex-col items-center gap-0.5">
                          <div className={`h-2.5 w-full rounded-full overflow-hidden p-0.5 ${isSelected ? 'bg-black/30' : 'bg-zinc-800 dark:bg-zinc-200'}`}>
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                isSelected ? 'bg-black' : b.ops > 0 ? 'bg-emerald-400' : 'bg-transparent'
                              }`} 
                              style={{ width: b.ops > 0 ? `${Math.min(100, Math.max(25, (b.ops / 10) * 100))}%` : '0%' }}
                            />
                          </div>
                        </div>

                        <div className="text-[10.5px] font-mono">
                          <div className="font-black">{b.ops} OPs</div>
                          <div className="text-[8.5px] opacity-75 truncate">{b.mt}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

          </div>

          {/* SECTION 2: PROCESADO POR ÁREA DE TRABAJO EN EL DÍA (EXACT MATCH TO IMAGE 2) */}
          <div className="bg-[#0c1017] dark:bg-white border border-zinc-800 dark:border-zinc-200 rounded-3xl p-6 shadow-2xl space-y-4 text-white dark:text-zinc-950">
            
            <div className="flex items-center justify-between border-b border-zinc-800 dark:border-zinc-200 pb-3">
              <div>
                <h4 className="text-sm font-black uppercase text-white dark:text-zinc-950 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>Procesado por Área de Trabajo en el Día</span>
                </h4>
                <p className="text-xs text-zinc-400 dark:text-zinc-600">
                  Desglose de OPs, metraje (Mt) y personal activo por área en la fecha seleccionada ({selectedCalendarDate}).
                </p>
              </div>

              <span className="text-xs font-mono text-zinc-300 dark:text-zinc-700 bg-zinc-900 dark:bg-zinc-100 px-3 py-1 rounded-xl border border-zinc-700 dark:border-zinc-300 font-bold">
                4 Áreas Operativas STF
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Area 1: Calidad ZF & Atelier */}
              {(() => {
                const zf = currentDailyData.areas.zf;
                const isActive = zf.ops > 0;

                return (
                  <div className={`p-4 rounded-2xl border-2 space-y-3 transition ${
                    isActive 
                      ? 'bg-purple-950/40 dark:bg-purple-50 border-purple-500 ring-1 ring-purple-500/40 shadow-lg shadow-purple-500/10 text-white dark:text-zinc-950'
                      : 'bg-zinc-900/80 dark:bg-zinc-50 border-zinc-800 dark:border-zinc-200 text-white dark:text-zinc-950'
                  }`}>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                        isActive ? 'bg-purple-600 text-white' : 'bg-purple-950 dark:bg-purple-100 text-purple-300 dark:text-purple-800'
                      }`}>
                        CALIDAD ZF
                      </span>
                      <span className={`text-[11px] ${isActive ? 'text-purple-400 dark:text-purple-600 font-bold' : 'text-zinc-400 dark:text-zinc-500'}`}>
                        {zf.activeProfiles} activos
                      </span>
                    </div>

                    <div>
                      <h5 className="text-xs font-black text-white dark:text-zinc-950">
                        Calidad ZF & Atelier (Zona Franca)
                      </h5>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Personal asignado: 3 perfiles</span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 bg-zinc-950 dark:bg-zinc-100 p-2 rounded-xl text-center font-mono border border-zinc-800 dark:border-zinc-200">
                      <div><span className="text-[9px] text-zinc-400 dark:text-zinc-500 block uppercase">OPS</span><span className={`text-xs font-black ${isActive ? 'text-purple-400 dark:text-purple-600' : 'text-white dark:text-zinc-950'}`}>{zf.ops}</span></div>
                      <div><span className="text-[9px] text-zinc-400 dark:text-zinc-500 block uppercase">METRAJE</span><span className="text-xs font-bold text-emerald-400 dark:text-emerald-600">{zf.mt}m</span></div>
                      <div><span className="text-[9px] text-zinc-400 dark:text-zinc-500 block uppercase">ROLLOS</span><span className="text-xs font-bold text-sky-400 dark:text-sky-600">{zf.rollos}</span></div>
                    </div>

                    <div className="text-[10px]">
                      <span className="text-zinc-400 dark:text-zinc-500 block font-bold uppercase text-[9px]">OPERARIOS CON ACTIVIDAD:</span>
                      {isActive ? (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {zf.operarios.map(opName => (
                            <span key={opName} className="bg-purple-900/60 dark:bg-purple-200 text-purple-200 dark:text-purple-950 px-1.5 py-0.2 rounded font-black text-[10px]">
                              {opName}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-zinc-400 dark:text-zinc-500 italic">Sin operarios activos hoy en Sheets</span>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={!isActive}
                      onClick={() => setSelectedAreaOpsModal({
                        areaName: 'Calidad ZF & Atelier (Zona Franca)',
                        count: zf.ops,
                        operarios: zf.operarios,
                        dateName: currentDailyData.dayName
                      })}
                      className={`w-full py-2 rounded-xl text-xs font-black uppercase transition ${
                        isActive
                          ? 'bg-white text-zinc-950 hover:bg-zinc-200 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-800 cursor-pointer shadow-md'
                          : 'bg-zinc-800 dark:bg-zinc-200 text-zinc-500 dark:text-zinc-400 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      👁️ VER OPS DEL ÁREA ({zf.ops})
                    </button>
                  </div>
                );
              })()}

              {/* Area 2: Lavandería & Planta (Colfactory) */}
              {(() => {
                const lav = currentDailyData.areas.lavanderia;
                const isActive = lav.ops > 0;

                return (
                  <div className={`p-4 rounded-2xl border-2 space-y-3 transition ${
                    isActive 
                      ? 'bg-sky-950/40 dark:bg-sky-50 border-sky-500 ring-1 ring-sky-500/40 shadow-lg shadow-sky-500/10 text-white dark:text-zinc-950'
                      : 'bg-zinc-900/80 dark:bg-zinc-50 border-zinc-800 dark:border-zinc-200 text-white dark:text-zinc-950'
                  }`}>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                        isActive ? 'bg-sky-600 text-white' : 'bg-sky-950 dark:bg-sky-100 text-sky-300 dark:text-sky-800'
                      }`}>
                        LAVANDERÍA
                      </span>
                      <span className={`text-[11px] ${isActive ? 'text-sky-400 dark:text-sky-600 font-bold' : 'text-zinc-400 dark:text-zinc-500'}`}>
                        {lav.activeProfiles} activos
                      </span>
                    </div>

                    <div>
                      <h5 className="text-xs font-black text-white dark:text-zinc-950">
                        Lavandería & Planta (Colfactory)
                      </h5>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Personal asignado: 5 perfiles</span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 bg-zinc-950 dark:bg-zinc-100 p-2 rounded-xl text-center font-mono border border-zinc-800 dark:border-zinc-200">
                      <div><span className="text-[9px] text-zinc-400 dark:text-zinc-500 block uppercase">OPS</span><span className={`text-xs font-black ${isActive ? 'text-sky-400 dark:text-sky-600' : 'text-white dark:text-zinc-950'}`}>{lav.ops}</span></div>
                      <div><span className="text-[9px] text-zinc-400 dark:text-zinc-500 block uppercase">METRAJE</span><span className="text-xs font-bold text-emerald-400 dark:text-emerald-600">{lav.mt}m</span></div>
                      <div><span className="text-[9px] text-zinc-400 dark:text-zinc-500 block uppercase">ROLLOS</span><span className="text-xs font-bold text-sky-400 dark:text-sky-600">{lav.rollos}</span></div>
                    </div>

                    <div className="text-[10px]">
                      <span className="text-zinc-400 dark:text-zinc-500 block font-bold uppercase text-[9px]">OPERARIOS CON ACTIVIDAD:</span>
                      {isActive ? (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {lav.operarios.map(opName => (
                            <span key={opName} className="bg-sky-900/60 dark:bg-sky-200 text-sky-200 dark:text-sky-950 px-1.5 py-0.2 rounded font-black text-[10px]">
                              {opName}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-zinc-400 dark:text-zinc-500 italic">Sin operarios activos hoy en Sheets</span>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={!isActive}
                      onClick={() => setSelectedAreaOpsModal({
                        areaName: 'Lavandería & Planta (Colfactory)',
                        count: lav.ops,
                        operarios: lav.operarios,
                        dateName: currentDailyData.dayName
                      })}
                      className={`w-full py-2 rounded-xl text-xs font-black uppercase transition ${
                        isActive
                          ? 'bg-white text-zinc-950 hover:bg-zinc-200 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-800 cursor-pointer shadow-md'
                          : 'bg-zinc-800 dark:bg-zinc-200 text-zinc-500 dark:text-zinc-400 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      👁️ VER OPS DEL ÁREA ({lav.ops})
                    </button>
                  </div>
                );
              })()}

              {/* Area 3: Calidad & Laboratorio Textil STF */}
              {(() => {
                const cal = currentDailyData.areas.calidad;
                const isActive = cal.ops > 0;

                return (
                  <div className={`p-4 rounded-2xl border-2 space-y-3 transition ${
                    isActive 
                      ? 'bg-emerald-950/40 dark:bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500/40 shadow-lg shadow-emerald-500/10 text-white dark:text-zinc-950'
                      : 'bg-zinc-900/80 dark:bg-zinc-50 border-zinc-800 dark:border-zinc-200 text-white dark:text-zinc-950'
                  }`}>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                        isActive ? 'bg-emerald-600 text-white' : 'bg-emerald-950 dark:bg-emerald-100 text-emerald-300 dark:text-emerald-800'
                      }`}>
                        CALIDAD
                      </span>
                      <span className={`text-[11px] ${isActive ? 'text-emerald-400 dark:text-emerald-600 font-bold' : 'text-zinc-400 dark:text-zinc-500'}`}>
                        {cal.activeProfiles} activos
                      </span>
                    </div>

                    <div>
                      <h5 className="text-xs font-black text-white dark:text-zinc-950">
                        Calidad & Laboratorio Textil STF
                      </h5>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Personal asignado: 10 perfiles</span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 bg-zinc-950 dark:bg-zinc-100 p-2 rounded-xl text-center font-mono border border-zinc-800 dark:border-zinc-200">
                      <div><span className="text-[9px] text-zinc-400 dark:text-zinc-500 block uppercase">OPS</span><span className={`text-xs font-black ${isActive ? 'text-emerald-400 dark:text-emerald-600' : 'text-white dark:text-zinc-950'}`}>{cal.ops}</span></div>
                      <div><span className="text-[9px] text-zinc-400 dark:text-zinc-500 block uppercase">METRAJE</span><span className="text-xs font-bold text-emerald-400 dark:text-emerald-600">{cal.mt}m</span></div>
                      <div><span className="text-[9px] text-zinc-400 dark:text-zinc-500 block uppercase">ROLLOS</span><span className="text-xs font-bold text-sky-400 dark:text-sky-600">{cal.rollos}</span></div>
                    </div>

                    <div className="text-[10px]">
                      <span className="text-zinc-400 dark:text-zinc-500 block font-bold uppercase text-[9px]">OPERARIOS CON ACTIVIDAD:</span>
                      {isActive ? (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {cal.operarios.map(opName => (
                            <span key={opName} className="bg-emerald-900/60 dark:bg-emerald-200 text-emerald-200 dark:text-emerald-950 px-1.5 py-0.2 rounded font-black text-[10px]">
                              {opName}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-zinc-400 dark:text-zinc-500 italic">Sin operarios activos hoy en Sheets</span>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={!isActive}
                      onClick={() => setSelectedAreaOpsModal({
                        areaName: 'Calidad & Laboratorio Textil STF',
                        count: cal.ops,
                        operarios: cal.operarios,
                        dateName: currentDailyData.dayName
                      })}
                      className={`w-full py-2 rounded-xl text-xs font-black uppercase transition ${
                        isActive
                          ? 'bg-white text-zinc-950 hover:bg-zinc-200 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-800 cursor-pointer shadow-md'
                          : 'bg-zinc-800 dark:bg-zinc-200 text-zinc-500 dark:text-zinc-400 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      👁️ VER OPS DEL ÁREA ({cal.ops})
                    </button>
                  </div>
                );
              })()}

              {/* Area 4: Colecciones & Marcas (SF / ELA / OUTLET) */}
              {(() => {
                const col = currentDailyData.areas.colecciones;
                const isActive = col.ops > 0;

                return (
                  <div className={`p-4 rounded-2xl border-2 space-y-3 transition ${
                    isActive 
                      ? 'bg-amber-950/40 dark:bg-amber-50 border-amber-500 ring-1 ring-amber-500/40 shadow-lg shadow-amber-500/10 text-white dark:text-zinc-950'
                      : 'bg-zinc-900/80 dark:bg-zinc-50 border-zinc-800 dark:border-zinc-200 text-white dark:text-zinc-950'
                  }`}>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                        isActive ? 'bg-amber-500 text-black' : 'bg-amber-950 dark:bg-amber-100 text-amber-300 dark:text-amber-800'
                      }`}>
                        COLECCIONES
                      </span>
                      <span className={`text-[11px] ${isActive ? 'text-amber-400 dark:text-amber-600 font-bold' : 'text-zinc-400 dark:text-zinc-500'}`}>
                        {col.activeProfiles} activos
                      </span>
                    </div>

                    <div>
                      <h5 className="text-xs font-black text-white dark:text-zinc-950">
                        Colecciones & Marcas (SF / ELA / OUTLET)
                      </h5>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Personal asignado: 5 perfiles</span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 bg-zinc-950 dark:bg-zinc-100 p-2 rounded-xl text-center font-mono border border-zinc-800 dark:border-zinc-200">
                      <div><span className="text-[9px] text-zinc-400 dark:text-zinc-500 block uppercase">OPS</span><span className={`text-xs font-black ${isActive ? 'text-amber-400 dark:text-amber-600' : 'text-white dark:text-zinc-950'}`}>{col.ops}</span></div>
                      <div><span className="text-[9px] text-zinc-400 dark:text-zinc-500 block uppercase">METRAJE</span><span className="text-xs font-bold text-emerald-400 dark:text-emerald-600">{col.mt}m</span></div>
                      <div><span className="text-[9px] text-zinc-400 dark:text-zinc-500 block uppercase">ROLLOS</span><span className="text-xs font-bold text-sky-400 dark:text-sky-600">{col.rollos}</span></div>
                    </div>

                    <div className="text-[10px]">
                      <span className="text-zinc-400 dark:text-zinc-500 block font-bold uppercase text-[9px]">OPERARIOS CON ACTIVIDAD:</span>
                      {isActive ? (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {col.operarios.map(opName => (
                            <span key={opName} className="bg-amber-900/60 dark:bg-amber-200 text-amber-200 dark:text-amber-950 px-1.5 py-0.2 rounded font-black text-[10px]">
                              {opName}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-zinc-400 dark:text-zinc-500 italic">Sin operarios activos hoy en Sheets</span>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={!isActive}
                      onClick={() => setSelectedAreaOpsModal({
                        areaName: 'Colecciones & Marcas (SF / ELA / OUTLET)',
                        count: col.ops,
                        operarios: col.operarios,
                        dateName: currentDailyData.dayName
                      })}
                      className={`w-full py-2 rounded-xl text-xs font-black uppercase transition ${
                        isActive
                          ? 'bg-white text-zinc-950 hover:bg-zinc-200 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-800 cursor-pointer shadow-md'
                          : 'bg-zinc-800 dark:bg-zinc-200 text-zinc-500 dark:text-zinc-400 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      👁️ VER OPS DEL ÁREA ({col.ops})
                    </button>
                  </div>
                );
              })()}

            </div>

          </div>

          {/* SECTION 3: DETALLE INDIVIDUAL POR TRABAJADOR / INSPECTOR (EXACT MATCH TO IMAGE 3) */}
          <div className="bg-[#0c1017] dark:bg-white border border-zinc-800 dark:border-zinc-200 rounded-3xl p-6 shadow-2xl space-y-5 text-white dark:text-zinc-950">
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-800 dark:border-zinc-200 pb-4">
              <div className="space-y-1">
                <h4 className="text-sm font-black uppercase text-white dark:text-zinc-950 flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-400" />
                  <span>Detalle Individual por Trabajador / Inspector</span>
                </h4>
                <p className="text-xs text-zinc-400 dark:text-zinc-600">
                  Auditoría de colchas, metraje y rollos procesados por cada miembro del equipo en la fecha {selectedCalendarDate}.
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <input
                    type="text"
                    value={workerSearch}
                    onChange={(e) => setWorkerSearch(e.target.value)}
                    placeholder="Buscar trabajador..."
                    className="bg-zinc-900/90 dark:bg-zinc-100 border border-zinc-800 dark:border-zinc-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white dark:text-zinc-950 placeholder-zinc-400 focus:outline-none focus:border-amber-500"
                  />
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
                </div>

                {/* Workshop Filter Tabs */}
                <div className="flex items-center gap-1 text-[10.5px] font-bold select-none flex-wrap">
                  {[
                    { id: 'TODAS', label: 'TODAS' },
                    { id: 'CALIDAD_ZF', label: 'CALIDAD ZF (ATELIER)' },
                    { id: 'LAVANDERIA', label: 'LAVANDERÍA' },
                    { id: 'CALIDAD', label: 'CALIDAD (PLANTA STF)' },
                    { id: 'COLECCIONES', label: 'COLECCIONES' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setWorkerFilterArea(tab.id)}
                      className={`px-3 py-1.5 rounded-xl transition-all duration-150 cursor-pointer border ${
                        workerFilterArea === tab.id
                          ? 'bg-amber-500 text-black border-amber-400 font-black shadow-sm scale-105'
                          : 'bg-zinc-900/90 dark:bg-zinc-100 border-zinc-800 dark:border-zinc-300 text-zinc-300 dark:text-zinc-700 hover:border-zinc-600 hover:text-white dark:hover:text-zinc-950'
                      }`}
                    >
                      <span>{tab.label}</span>
                      {tab.id === 'TODAS' && (
                        <span className={`ml-1.5 text-[9px] px-1.5 py-0.2 rounded font-mono ${
                          workerFilterArea === 'TODAS' ? 'bg-black text-amber-300' : 'bg-emerald-950 text-emerald-300'
                        }`}>
                          {workersWithDailyStats.length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Worker Cards Grid or Empty State */}
            {workersWithDailyStats.length === 0 ? (
              <div className="bg-zinc-900/40 dark:bg-zinc-50 border border-zinc-800 dark:border-zinc-200 rounded-3xl p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-zinc-800 dark:bg-zinc-200 flex items-center justify-center mx-auto text-zinc-400">
                  <User className="w-6 h-6" />
                </div>
                <h5 className="text-sm font-black text-white dark:text-zinc-950">
                  Sin operarios activos con registro de OPs en esta fecha ({selectedCalendarDate})
                </h5>
                <p className="text-xs text-zinc-400 dark:text-zinc-600 max-w-md mx-auto">
                  En el modo <strong>TODAS</strong> solo se muestran los operarios que tuvieron OPs trabajadas ese día. Haz clic en cualquiera de los talleres arriba (<em>Calidad ZF, Lavandería, Calidad, Colecciones</em>) para ver la nómina de operarios.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workersWithDailyStats.map(({ worker, opsCount, rollosCount, metraje, aprobados, rechazados, opsList }) => {
                  const hasActivity = opsCount > 0;

                  return (
                    <div
                      key={worker.id}
                      className={`p-5 rounded-3xl border transition-all duration-200 shadow-sm ${
                        hasActivity
                          ? 'bg-zinc-900 dark:bg-zinc-50 border-emerald-500/60 ring-1 ring-emerald-500/30 shadow-lg shadow-emerald-500/10 text-white dark:text-zinc-950 hover:border-emerald-400'
                          : 'bg-zinc-900/60 dark:bg-zinc-50/60 border-zinc-800 dark:border-zinc-200 text-zinc-400 dark:text-zinc-500'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${hasActivity ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.9)]' : 'bg-zinc-600'}`} />
                            <span className="font-black text-xs text-white dark:text-zinc-950 uppercase tracking-tight">
                              {worker.nombre}
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block uppercase mt-0.5">
                            {hasActivity ? 'OPERARIO ACTIVO SHEETS' : worker.rol}
                          </span>
                        </div>

                        <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-lg border border-zinc-800 dark:border-zinc-200 bg-zinc-950 dark:bg-zinc-100 text-zinc-300 dark:text-zinc-700 uppercase">
                          {worker.area.substring(0, 10)}
                        </span>
                      </div>

                      {/* Stats 3 columns */}
                      <div className="grid grid-cols-3 gap-1 bg-zinc-950 dark:bg-zinc-100 p-3 rounded-2xl text-center font-mono my-3.5 border border-zinc-800 dark:border-zinc-200">
                        <div>
                          <span className="text-[8.5px] text-zinc-400 dark:text-zinc-500 block uppercase">OPS / COLCHAS</span>
                          <span className={`text-sm font-black ${hasActivity ? 'text-white dark:text-zinc-950' : 'text-zinc-400 dark:text-zinc-500'}`}>
                            {opsCount}
                          </span>
                        </div>

                        <div>
                          <span className="text-[8.5px] text-zinc-400 dark:text-zinc-500 block uppercase">METRAJE (MT)</span>
                          <span className={`text-sm font-black ${hasActivity ? 'text-emerald-400 dark:text-emerald-600' : 'text-zinc-400 dark:text-zinc-500'}`}>
                            {metraje}
                          </span>
                        </div>

                        <div>
                          <span className="text-[8.5px] text-zinc-400 dark:text-zinc-500 block uppercase">ROLLOS</span>
                          <span className={`text-sm font-black ${hasActivity ? 'text-sky-400 dark:text-sky-600' : 'text-zinc-400 dark:text-zinc-500'}`}>
                            {rollosCount}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 dark:text-zinc-500 mb-3 px-1">
                        <span>Dictámenes:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-400 dark:text-emerald-600 font-bold">✓ {aprobados} Ap.</span>
                          <span className="text-rose-400 dark:text-rose-600 font-bold">✕ {rechazados} Rec.</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedWorkerOpsModal({ worker, ops: opsList, count: opsCount })}
                        disabled={!hasActivity}
                        className={`w-full py-2 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5 transition ${
                          hasActivity
                            ? 'bg-white text-zinc-950 hover:bg-zinc-200 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-800 cursor-pointer shadow-md'
                            : 'bg-zinc-800 dark:bg-zinc-200 text-zinc-500 dark:text-zinc-400 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>VER OPS PROCESADAS ({opsCount})</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: INDICADOR DE PRODUCTIVIDAD (EXACT MATCH TO SCREENSHOTS 4 & 5) */}
      {/* ========================================================================= */}
      {activeSectionTab === 'PRODUCTIVIDAD' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* HEADER BANNER: ESTUDIO ESTADÍSTICO DE PRODUCTIVIDAD Y TIEMPOS */}
          <div className="bg-[#0c1017] dark:bg-white border border-zinc-800 dark:border-zinc-200 rounded-3xl p-6 shadow-2xl space-y-6 text-white dark:text-zinc-950">
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-amber-950/80 dark:bg-amber-100 text-amber-300 dark:text-amber-800 border border-amber-500/40 dark:border-amber-300 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                    PARÁMETROS OPERATIVOS STF GROUP
                  </span>
                  <span className="bg-zinc-900 dark:bg-zinc-100 text-zinc-300 dark:text-zinc-700 border border-zinc-700 dark:border-zinc-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    📅 Días Hábiles: Lunes a Viernes
                  </span>
                </div>

                <h3 className="text-lg sm:text-2xl font-black text-white dark:text-zinc-950 flex items-center gap-2 brand-title">
                  <Clock className="w-6 h-6 text-amber-500" />
                  <span>Estudio Estadístico de Productividad y Tiempos por Área</span>
                </h3>
                <p className="text-xs text-zinc-400 dark:text-zinc-600 max-w-3xl">
                  Evaluación de eficiencias, tiempos productivos activos, tiempos logísticos de transporte inter-planta y tiempos muertos por mes.
                </p>
              </div>

              {/* Lead time badge */}
              <div className="bg-zinc-900 dark:bg-zinc-100 p-4 rounded-2xl border border-zinc-700 dark:border-zinc-300 space-y-0.5 shrink-0 text-center sm:text-left shadow-sm">
                <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                  LEAD TIME COMPLETO SLA
                </span>
                <div className="text-2xl font-black text-amber-400 dark:text-amber-600 font-mono">
                  {totalSlaHours} <span className="text-sm font-sans text-white dark:text-zinc-950">Hrs Hábiles</span>
                </div>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono block">{totalSlaDays} Días hábiles total</span>
              </div>
            </div>

            {/* 4 STAGES SLA DEFINITION ROW */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-zinc-800 dark:border-zinc-200">
              
              <div className="bg-zinc-900/90 dark:bg-zinc-100 p-3.5 rounded-2xl border border-zinc-800 dark:border-zinc-200 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-white dark:text-zinc-950">Pre-Solicitud ➔ Solicitud</span>
                  <span className="text-amber-400 dark:text-amber-600 font-mono">{adminParams.slasTiempo.preSolToSolicitadoHoras}h SLA</span>
                </div>
                <div className="text-[10px] text-zinc-400 dark:text-zinc-500">Proceso Activo: {adminParams.slasTiempo.preSolToSolicitadoHoras}h • Transp: 0h</div>
              </div>

              <div className="bg-zinc-900/90 dark:bg-zinc-100 p-3.5 rounded-2xl border border-zinc-800 dark:border-zinc-200 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-white dark:text-zinc-950">Solicitud ➔ Lavandería (Inter-planta)</span>
                  <span className="text-amber-400 dark:text-amber-600 font-mono">{adminParams.slasTiempo.solicitadoToLavaderoHoras}h SLA</span>
                </div>
                <div className="text-[10px] text-zinc-400 dark:text-zinc-500">Proceso Activo: {Math.max(0, adminParams.slasTiempo.solicitadoToLavaderoHoras - 24)}h • 🚚 Transp: 24h</div>
              </div>

              <div className="bg-zinc-900/90 dark:bg-zinc-100 p-3.5 rounded-2xl border border-zinc-800 dark:border-zinc-200 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-white dark:text-zinc-950">Lavandería ➔ Calidad STF (Inter-planta)</span>
                  <span className="text-amber-400 dark:text-amber-600 font-mono">{adminParams.slasTiempo.lavaderoToEnviadoStfHoras}h SLA</span>
                </div>
                <div className="text-[10px] text-zinc-400 dark:text-zinc-500">Proceso Activo: {Math.max(0, adminParams.slasTiempo.lavaderoToEnviadoStfHoras - 24)}h • 🚚 Transp: 24h</div>
              </div>

              <div className="bg-zinc-900/90 dark:bg-zinc-100 p-3.5 rounded-2xl border border-zinc-800 dark:border-zinc-200 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-white dark:text-zinc-950">Calidad STF ➔ Evaluar (Finalizado)</span>
                  <span className="text-amber-400 dark:text-amber-600 font-mono">{adminParams.slasTiempo.enviadoToFinalizadoHoras}h SLA</span>
                </div>
                <div className="text-[10px] text-zinc-400 dark:text-zinc-500">Proceso Activo: {adminParams.slasTiempo.enviadoToFinalizadoHoras}h • Transp: 0h</div>
              </div>

            </div>

            {/* Note box */}
            <div className="bg-amber-950/40 dark:bg-amber-50 border border-amber-500/40 dark:border-amber-300 p-3.5 rounded-2xl text-xs text-amber-300 dark:text-amber-900 leading-snug">
              🚚 <strong>Nota sobre Traslados Logísticos:</strong> En las etapas de <em>Solicitud ➔ Lavandería</em> y <em>Lavandería ➔ Calidad</em> se estipulan <strong>24 horas hábiles de transporte</strong> debido a que la planta de lavado no está en la misma sede principal. Los conteos de SLA aplican únicamente en días hábiles (Lunes a Viernes).
            </div>

          </div>

          {/* MONTHLY MEASUREMENT FILTER & SUMMARY CARDS (IMAGE 4) */}
          <div className="bg-[#0c1017] dark:bg-white border border-zinc-800 dark:border-zinc-200 rounded-3xl p-6 shadow-2xl space-y-5 text-white dark:text-zinc-950">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 dark:border-zinc-200 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-black text-white dark:text-zinc-950 uppercase">
                  FILTRO DE MEDICIÓN MENSUAL (ENERO A {currentMonthName} 2026 / MES {prodSelectedMonth})
                </span>
              </div>

              <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500">
                Carga Mes {prodSelectedMonth}: <strong className="text-amber-400 dark:text-amber-600 font-bold">{activeProdMonthData.cargas} OPs | {activeProdMonthData.metrajeLiberado.toLocaleString()} Mt</strong>
                <span className="ml-2 text-zinc-400 dark:text-zinc-500 opacity-80">(Acumulado 2026: {totalCargasYTD} OPs)</span>
              </span>
            </div>

            {/* Monthly Pills (Only active months up to current system date) */}
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scroll pb-2 text-[11px] font-bold select-none">
              {activeMonthsData.map(m => (
                <button
                  key={m.mes}
                  type="button"
                  onClick={() => setProdSelectedMonth(m.mes)}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 ${
                    prodSelectedMonth === m.mes
                      ? 'bg-amber-500 text-black shadow-md font-black'
                      : 'bg-zinc-900 dark:bg-zinc-100 text-zinc-400 dark:text-zinc-600 hover:bg-zinc-800'
                  }`}
                >
                  <span>{m.mes}</span> <span className="opacity-75 font-mono text-[10px]">{m.cargas}</span>
                </button>
              ))}
            </div>

            {/* 4 Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              
              <div className="bg-zinc-900/90 dark:bg-zinc-100 p-4 rounded-2xl border border-zinc-800 dark:border-zinc-200 space-y-1">
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold block uppercase">EFICIENCIA SLA GLOBAL</span>
                <span className="text-3xl font-black text-emerald-400 dark:text-emerald-600 font-mono">{activeProdMonthData.eficienciaSla}%</span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block">Meta ≥ 90%</span>
              </div>

              <div className="bg-zinc-900/90 dark:bg-zinc-100 p-4 rounded-2xl border border-zinc-800 dark:border-zinc-200 space-y-1">
                <span className="text-[10px] text-amber-400 dark:text-amber-600 font-bold block uppercase">HORAS PRODUCTIVAS EFECTIVAS</span>
                <span className="text-3xl font-black text-amber-400 dark:text-amber-600 font-mono">{activeProdMonthData.horasProductivas} <span className="text-xs">Hrs</span></span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block">Trabajo directo de lavado y control</span>
              </div>

              <div className="bg-zinc-900/90 dark:bg-zinc-100 p-4 rounded-2xl border border-zinc-800 dark:border-zinc-200 space-y-1">
                <span className="text-[10px] text-sky-400 dark:text-sky-600 font-bold block uppercase">HORAS DE TRANSPORTE INTER-PLANTA</span>
                <span className="text-3xl font-black text-sky-400 dark:text-sky-600 font-mono">{activeProdMonthData.horasTransporte} <span className="text-xs">Hrs</span></span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block">Logística de traslados (24h/etapa)</span>
              </div>

              <div className="bg-zinc-900/90 dark:bg-zinc-100 p-4 rounded-2xl border border-zinc-800 dark:border-zinc-200 space-y-1">
                <span className="text-[10px] text-rose-400 dark:text-rose-600 font-bold block uppercase">TIEMPOS MUERTOS / CUELLOS</span>
                <span className="text-3xl font-black text-rose-400 dark:text-rose-600 font-mono">{activeProdMonthData.horasMuertas} <span className="text-xs">Hrs</span></span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block">Horas excedidas vs SLA objetivo</span>
              </div>

            </div>

          </div>

          {/* MONTHLY EVALUATION BAR CHART & AREA EFFICIENCY ANALYSIS (IMAGE 5) */}
          <div className="bg-[#0c1017] dark:bg-white border border-zinc-800 dark:border-zinc-200 rounded-3xl p-6 shadow-2xl space-y-6 text-white dark:text-zinc-950">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-black uppercase text-white dark:text-zinc-950">
                  GRÁFICO DE EVALUACIÓN DE PARÁMETROS POR MES (2026)
                </h4>
                <p className="text-xs text-zinc-400 dark:text-zinc-600">
                  Comportamiento mensual en tiempo real de eficiencia SLA, volumen de producción y distribución de tiempos (Enero a {currentMonthName}).
                </p>
              </div>

              <div className="flex items-center gap-1 bg-zinc-900 dark:bg-zinc-100 p-1 rounded-xl text-[10px] font-bold border border-zinc-800 dark:border-zinc-300 select-none">
                <button
                  type="button"
                  onClick={() => setProdMetricMode('EFICIENCIA')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    prodMetricMode === 'EFICIENCIA' ? 'bg-white text-zinc-950 dark:bg-zinc-950 dark:text-white' : 'text-zinc-400 dark:text-zinc-600'
                  }`}
                >
                  Eficiencia (%)
                </button>
                <button
                  type="button"
                  onClick={() => setProdMetricMode('METRAJE')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    prodMetricMode === 'METRAJE' ? 'bg-white text-zinc-950 dark:bg-zinc-950 dark:text-white' : 'text-zinc-400 dark:text-zinc-600'
                  }`}
                >
                  Metraje (Mt)
                </button>
                <button
                  type="button"
                  onClick={() => setProdMetricMode('TIEMPOS')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    prodMetricMode === 'TIEMPOS' ? 'bg-white text-zinc-950 dark:bg-zinc-950 dark:text-white' : 'text-zinc-400 dark:text-zinc-600'
                  }`}
                >
                  Desglose Tiempos (h)
                </button>
              </div>
            </div>

            {/* Monthly Bar Chart (Dynamic columns up to active months) */}
            <div className="pt-6 pb-2">
              <div 
                className="grid gap-2 sm:gap-3 items-end h-48"
                style={{ gridTemplateColumns: `repeat(${activeMonthsData.length}, minmax(0, 1fr))` }}
              >
                {activeMonthsData.map((m) => {
                  const isSelected = prodSelectedMonth === m.mes;
                  const barHeight = Math.max(20, (m.eficienciaSla - 75) * 4.5);

                  return (
                    <div
                      key={m.mes}
                      onClick={() => setProdSelectedMonth(m.mes)}
                      className="flex flex-col items-center justify-end h-full group cursor-pointer transition"
                    >
                      <span className={`text-[10px] font-mono font-bold mb-1.5 transition ${
                        isSelected ? 'text-amber-400 dark:text-amber-600 font-black scale-110' : 'text-zinc-400 group-hover:text-white dark:group-hover:text-zinc-900'
                      }`}>
                        {prodMetricMode === 'EFICIENCIA' && `${m.eficienciaSla}%`}
                        {prodMetricMode === 'METRAJE' && `${Math.round(m.metrajeLiberado / 1000)}k`}
                        {prodMetricMode === 'TIEMPOS' && `${m.horasProductivas}h`}
                      </span>

                      <div className="w-full relative flex items-end justify-center">
                        <div
                          style={{ height: `${barHeight * 1.6}px` }}
                          className={`w-full rounded-xl transition-all duration-300 ${
                            isSelected
                              ? 'bg-amber-500 shadow-lg shadow-amber-500/30'
                              : 'bg-zinc-800 dark:bg-zinc-300 hover:bg-zinc-700 dark:hover:bg-zinc-400'
                          }`}
                        />
                      </div>

                      <span className={`text-[10px] font-mono font-bold mt-2 uppercase ${
                        isSelected ? 'text-amber-400 dark:text-amber-600 font-black' : 'text-zinc-400 dark:text-zinc-600 group-hover:text-zinc-200 dark:group-hover:text-zinc-800'
                      }`}>
                        {m.mes.substring(0, 3)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-500 pt-2 border-t border-zinc-800 dark:border-zinc-200">
              <span>Límite Mínimo Aceptable: 80%</span>
              <span>Meta Operativa STF: 95% SLA</span>
            </div>

            {/* 4 DETAILED PROCESS EFFICIENCY CARDS (IMAGE 5 BOTTOM) */}
            <div className="space-y-4 pt-4 border-t border-zinc-800 dark:border-zinc-200">
              
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-white dark:text-zinc-950">
                  ESTUDIO Y ANÁLISIS DE EFICIENCIA POR ÁREA OPERATIVA
                </h4>
                <span className="text-[10px] bg-zinc-900 dark:bg-zinc-100 text-zinc-300 dark:text-zinc-700 px-2.5 py-0.5 rounded font-mono font-bold border border-zinc-700 dark:border-zinc-300">
                  4 Etapas de Proceso
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Stage 1 */}
                <div className="bg-zinc-900/80 dark:bg-zinc-50 p-5 rounded-2xl border border-zinc-800 dark:border-zinc-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-white text-zinc-950 dark:bg-zinc-950 dark:text-white font-mono font-bold text-xs flex items-center justify-center">
                        01
                      </span>
                      <div>
                        <h5 className="text-xs font-black text-white dark:text-zinc-950">Pre-Solicitud ➔ Solicitud</h5>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Habilitación y preparación de muestra de colcha</span>
                      </div>
                    </div>
                    <span className="bg-emerald-950/80 dark:bg-emerald-100 text-emerald-300 dark:text-emerald-800 border border-emerald-500/40 dark:border-emerald-300 px-2 py-0.5 rounded text-[11px] font-black font-mono">
                      92.8% Eficiencia
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-zinc-950 dark:bg-zinc-100 p-3 rounded-xl text-center font-mono border border-zinc-800 dark:border-zinc-200">
                    <div>
                      <span className="text-[9px] text-zinc-400 dark:text-zinc-500 block uppercase">SLA ESTIPULADO</span>
                      <span className="text-xs font-bold text-white dark:text-zinc-950">48h</span>
                      <span className="text-[8px] text-zinc-400 dark:text-zinc-500 block">Días hábiles</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-400 dark:text-zinc-500 block uppercase">TIEMPO REAL PROM.</span>
                      <span className="text-xs font-bold text-emerald-400 dark:text-emerald-600">38.4h</span>
                      <span className="text-[8px] text-emerald-400 dark:text-emerald-600 block">Dentro de rango</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-400 dark:text-zinc-500 block uppercase">TIEMPO MUERTO</span>
                      <span className="text-xs font-bold text-amber-400 dark:text-amber-600">3.2h</span>
                      <span className="text-[8px] text-zinc-400 dark:text-zinc-500 block">Espera/Reposo</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-500">
                      <span>Proceso Activo (48h)</span>
                      <span>Transporte: 0h (Misma Planta)</span>
                    </div>
                    <div className="w-full bg-zinc-800 dark:bg-zinc-200 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full" style={{ width: '85%' }}></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] pt-1">
                    <span className="text-zinc-400 dark:text-zinc-500">Cumplimiento de Entregas: <strong className="text-emerald-400 dark:text-emerald-600">Excelente</strong></span>
                    <span className="text-amber-400 dark:text-amber-600 font-bold">⚡ Operación Local</span>
                  </div>
                </div>

                {/* Stage 2 */}
                <div className="bg-zinc-900/80 dark:bg-zinc-50 p-5 rounded-2xl border border-zinc-800 dark:border-zinc-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-white text-zinc-950 dark:bg-zinc-950 dark:text-white font-mono font-bold text-xs flex items-center justify-center">
                        02
                      </span>
                      <div>
                        <h5 className="text-xs font-black text-white dark:text-zinc-950">Solicitud ➔ Lavandería (Inter-planta)</h5>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Recepción y traslado físico a planta de lavado externa</span>
                      </div>
                    </div>
                    <span className="bg-amber-950/80 dark:bg-amber-100 text-amber-300 dark:text-amber-800 border border-amber-500/40 dark:border-amber-300 px-2 py-0.5 rounded text-[11px] font-black font-mono">
                      88.5% Eficiencia
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-zinc-950 dark:bg-zinc-100 p-3 rounded-xl text-center font-mono border border-zinc-800 dark:border-zinc-200">
                    <div>
                      <span className="text-[9px] text-zinc-400 dark:text-zinc-500 block uppercase">SLA ESTIPULADO</span>
                      <span className="text-xs font-bold text-white dark:text-zinc-950">72h</span>
                      <span className="text-[8px] text-zinc-400 dark:text-zinc-500 block">Días hábiles</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-400 dark:text-zinc-500 block uppercase">TIEMPO REAL PROM.</span>
                      <span className="text-xs font-bold text-amber-400 dark:text-amber-600">62.1h</span>
                      <span className="text-[8px] text-amber-400 dark:text-amber-600 block">Dentro de rango</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-400 dark:text-zinc-500 block uppercase">TIEMPO MUERTO</span>
                      <span className="text-xs font-bold text-rose-400 dark:text-rose-600">5.1h</span>
                      <span className="text-[8px] text-zinc-400 dark:text-zinc-500 block">Espera/Espera</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-500">
                      <span>Proceso Activo (48h)</span>
                      <span>🚚 Transporte Inter-planta (24h)</span>
                    </div>
                    <div className="w-full bg-zinc-800 dark:bg-zinc-200 rounded-full h-1.5 flex overflow-hidden">
                      <div className="bg-amber-500 h-full" style={{ width: '65%' }}></div>
                      <div className="bg-sky-500 h-full" style={{ width: '35%' }}></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] pt-1">
                    <span className="text-zinc-400 dark:text-zinc-500">Cumplimiento de Entregas: <strong className="text-emerald-400 dark:text-emerald-600">Excelente</strong></span>
                    <span className="text-sky-400 dark:text-sky-600 font-bold">🚚 Requiere Traslado Inter-planta</span>
                  </div>
                </div>

                {/* Stage 3 */}
                <div className="bg-zinc-900/80 dark:bg-zinc-50 p-5 rounded-2xl border border-zinc-800 dark:border-zinc-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-white text-zinc-950 dark:bg-zinc-950 dark:text-white font-mono font-bold text-xs flex items-center justify-center">
                        03
                      </span>
                      <div>
                        <h5 className="text-xs font-black text-white dark:text-zinc-950">Lavandería ➔ Calidad STF (Inter-planta)</h5>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Lavado, acondicionamiento y retorno logístico a STF</span>
                      </div>
                    </div>
                    <span className="bg-amber-950/80 dark:bg-amber-100 text-amber-300 dark:text-amber-800 border border-amber-500/40 dark:border-amber-300 px-2 py-0.5 rounded text-[11px] font-black font-mono">
                      86.2% Eficiencia
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-zinc-950 dark:bg-zinc-100 p-3 rounded-xl text-center font-mono border border-zinc-800 dark:border-zinc-200">
                    <div>
                      <span className="text-[9px] text-zinc-400 dark:text-zinc-500 block uppercase">SLA ESTIPULADO</span>
                      <span className="text-xs font-bold text-white dark:text-zinc-950">96h</span>
                      <span className="text-[8px] text-zinc-400 dark:text-zinc-500 block">Días hábiles</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-400 dark:text-zinc-500 block uppercase">TIEMPO REAL PROM.</span>
                      <span className="text-xs font-bold text-amber-400 dark:text-amber-600">66.8h</span>
                      <span className="text-[8px] text-amber-400 dark:text-amber-600 block">Dentro de rango</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-400 dark:text-zinc-500 block uppercase">TIEMPO MUERTO</span>
                      <span className="text-xs font-bold text-rose-400 dark:text-rose-600">6.8h</span>
                      <span className="text-[8px] text-zinc-400 dark:text-zinc-500 block">Espera/Espera</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-500">
                      <span>Proceso Activo (72h)</span>
                      <span>🚚 Transporte Inter-planta (24h)</span>
                    </div>
                    <div className="w-full bg-zinc-800 dark:bg-zinc-200 rounded-full h-1.5 flex overflow-hidden">
                      <div className="bg-amber-500 h-full" style={{ width: '70%' }}></div>
                      <div className="bg-sky-500 h-full" style={{ width: '30%' }}></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] pt-1">
                    <span className="text-zinc-400 dark:text-zinc-500">Cumplimiento de Entregas: <strong className="text-emerald-400 dark:text-emerald-600">Excelente</strong></span>
                    <span className="text-sky-400 dark:text-sky-600 font-bold">🚚 Requiere Traslado Inter-planta</span>
                  </div>
                </div>

                {/* Stage 4 */}
                <div className="bg-zinc-900/80 dark:bg-zinc-50 p-5 rounded-2xl border border-zinc-800 dark:border-zinc-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-white text-zinc-950 dark:bg-zinc-950 dark:text-white font-mono font-bold text-xs flex items-center justify-center">
                        04
                      </span>
                      <div>
                        <h5 className="text-xs font-black text-white dark:text-zinc-950">Calidad STF ➔ Evaluar (Finalizado)</h5>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Inspección de laboratorio STF y dictamen técnico</span>
                      </div>
                    </div>
                    <span className="bg-emerald-950/80 dark:bg-emerald-100 text-emerald-300 dark:text-emerald-800 border border-emerald-500/40 dark:border-emerald-300 px-2 py-0.5 rounded text-[11px] font-black font-mono">
                      95% Eficiencia
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-zinc-950 dark:bg-zinc-100 p-3 rounded-xl text-center font-mono border border-zinc-800 dark:border-zinc-200">
                    <div>
                      <span className="text-[9px] text-zinc-400 dark:text-zinc-500 block uppercase">SLA ESTIPULADO</span>
                      <span className="text-xs font-bold text-white dark:text-zinc-950">24h</span>
                      <span className="text-[8px] text-zinc-400 dark:text-zinc-500 block">Días hábiles</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-400 dark:text-zinc-500 block uppercase">TIEMPO REAL PROM.</span>
                      <span className="text-xs font-bold text-emerald-400 dark:text-emerald-600">32.5h</span>
                      <span className="text-[8px] text-emerald-400 dark:text-emerald-600 block">Dentro de rango</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-400 dark:text-zinc-500 block uppercase">TIEMPO MUERTO</span>
                      <span className="text-xs font-bold text-amber-400 dark:text-amber-600">1.5h</span>
                      <span className="text-[8px] text-zinc-400 dark:text-zinc-500 block">Espera/Reposo</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-500">
                      <span>Proceso Activo (24h)</span>
                      <span>Transporte: 0h (Misma Planta)</span>
                    </div>
                    <div className="w-full bg-zinc-800 dark:bg-zinc-200 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: '92%' }}></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] pt-1">
                    <span className="text-zinc-400 dark:text-zinc-500">Cumplimiento de Entregas: <strong className="text-emerald-400 dark:text-emerald-600">Excelente</strong></span>
                    <span className="text-emerald-400 dark:text-emerald-600 font-bold">⚡ Operación Local</span>
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1: TASA DE APROBACIÓN (DONUT & REJECTED CARDS) */}
      {/* ========================================================================= */}
      {activeSectionTab === 'APROBACION' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* MONTH BUTTONS (UP TO ACTIVE MONTH) & DONUT VIEW */}
          <div className="bg-[#0c1017] dark:bg-white border border-zinc-800 dark:border-zinc-200 rounded-3xl p-6 shadow-2xl space-y-5 text-white dark:text-zinc-950">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 dark:border-zinc-200 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-black text-white dark:text-zinc-950 uppercase">
                  Consolidado de Calidad ({selectedMonth === 'ALL' ? `Enero - ${currentMonthName} 2026` : `Mes: ${selectedMonth} 2026`})
                </span>
              </div>

              <div className="text-xs font-mono text-zinc-400 dark:text-zinc-500">
                Tasa Actual: <strong className="text-emerald-400 dark:text-emerald-600 font-bold">{activeMonthData.tasaAprob}%</strong> | Lotes: <strong className="text-white dark:text-zinc-950">{activeMonthData.aprobados + activeMonthData.rechazados}</strong>
              </div>
            </div>

            {/* 1. BLOQUE 1: LISTADO DE MESES FUTURISTA / CAPSULAS HOLOGRAMA */}
            <div className="flex items-center gap-2 overflow-x-auto custom-scroll pb-2.5 pt-1 text-[11px] font-bold select-none">
              {/* Botón Consolidado 2026 */}
              <button
                type="button"
                onClick={() => setSelectedMonth('ALL')}
                className={`px-4 py-2 rounded-2xl transition-all duration-200 cursor-pointer shrink-0 flex items-center gap-2 border ${
                  selectedMonth === 'ALL'
                    ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white font-black border-emerald-400/80 shadow-[0_0_20px_rgba(16,185,129,0.35)] scale-105'
                    : 'bg-zinc-900/90 dark:bg-zinc-100 text-zinc-400 dark:text-zinc-600 border-zinc-800 dark:border-zinc-300 hover:border-zinc-600 hover:text-white dark:hover:text-zinc-950'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <span className="tracking-wide uppercase">CONSOLIDADO 2026 (ENE - {currentMonthName.substring(0, 3)})</span>
                <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-[9.5px] font-mono font-black px-2 py-0.5 rounded-full">
                  {tasaAprobYTD}%
                </span>
              </button>

              {/* Meses Individuales en Cápsulas Futuristas */}
              {activeMonthsData.map(m => {
                const isSelected = selectedMonth === m.mes;
                const isPerfect = m.tasaAprob === 100;
                const isDefect = m.rechazados > 0;

                return (
                  <button
                    key={m.mes}
                    type="button"
                    onClick={() => setSelectedMonth(m.mes)}
                    className={`px-3.5 py-2 rounded-2xl transition-all duration-200 cursor-pointer shrink-0 flex items-center gap-2 border group ${
                      isSelected
                        ? 'bg-zinc-900 text-white dark:bg-zinc-950 dark:text-white border-emerald-500 shadow-[0_0_18px_rgba(16,185,129,0.3)] ring-1 ring-emerald-400/50 scale-105 font-black'
                        : 'bg-zinc-900/80 dark:bg-zinc-100 text-zinc-400 dark:text-zinc-600 border-zinc-800 dark:border-zinc-300 hover:border-zinc-600 hover:text-white dark:hover:text-zinc-950'
                    }`}
                  >
                    {/* Glowing LED Status Dot */}
                    <span className={`w-2 h-2 rounded-full transition-transform duration-200 group-hover:scale-125 ${
                      isDefect 
                        ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]' 
                        : 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
                    }`} />

                    <span className="tracking-wide uppercase text-[10.5px]">{m.mes}</span>

                    {/* Percentage Mini-Badge */}
                    <span className={`text-[9.5px] font-mono font-black px-1.5 py-0.2 rounded-md border ${
                      isSelected 
                        ? 'bg-emerald-500 text-black border-emerald-400' 
                        : isPerfect 
                        ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40' 
                        : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                    }`}>
                      {m.tasaAprob}%
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Donut & Criteria */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
              
              {/* 2. BLOQUE 2 & 3: GRÁFICO REDONDO FULL FUTURISTA + BOTONES INTERACTIVOS */}
              <div className="lg:col-span-5 bg-zinc-900/90 dark:bg-zinc-50 p-6 rounded-3xl border border-zinc-800 dark:border-zinc-200 flex flex-col items-center justify-center space-y-6 shadow-xl relative overflow-hidden">
                
                {/* Ambient Grid Glow in Background */}
                <div className="absolute -top-12 -left-12 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>INDICADOR CENTRAL DE DICTAMEN</span>
                </div>

                {/* BLOQUE 2: GRÁFICO REDONDO FULL FUTURISTA (CYBERNETIC QUANTUM RING GAUGE) */}
                <div className="relative w-52 h-52 sm:w-56 sm:h-56 flex items-center justify-center select-none group">
                  {/* Glowing Ambient Core */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-emerald-500/15 via-cyan-500/20 to-emerald-400/10 blur-xl pointer-events-none animate-pulse" />

                  {/* Multi-layer Sci-Fi HUD Radar SVG */}
                  <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90 filter drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                    <defs>
                      <linearGradient id="cyberEmeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="60%" stopColor="#06b6d4" />
                        <stop offset="100%" stopColor="#3b82f6" />
                      </linearGradient>
                      <linearGradient id="cyberRoseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f43f5e" />
                        <stop offset="100%" stopColor="#e11d48" />
                      </linearGradient>
                      <filter id="sciFiGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>

                    {/* Outer Orbit Track with Calibrated Dashes */}
                    <circle
                      cx="100"
                      cy="100"
                      r="92"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeDasharray="4 8"
                      className="text-zinc-700/60 dark:text-zinc-300/60 fill-none"
                    />

                    {/* 4 Cardinal Radar Nodes (0°, 90°, 180°, 270°) */}
                    <circle cx="192" cy="100" r="2.5" className="fill-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
                    <circle cx="100" cy="192" r="2.5" className="fill-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
                    <circle cx="8" cy="100" r="2.5" className="fill-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
                    <circle cx="100" cy="8" r="2.5" className="fill-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />

                    {/* Base Inner Ring Track */}
                    <circle
                      cx="100"
                      cy="100"
                      r="74"
                      stroke="currentColor"
                      strokeWidth="13"
                      className="text-zinc-800/90 dark:text-zinc-200/90 fill-none"
                    />

                    {/* Main High-Precision Glowing Approved Arc */}
                    <circle
                      cx="100"
                      cy="100"
                      r="74"
                      stroke="url(#cyberEmeraldGrad)"
                      strokeWidth="13"
                      strokeDasharray={`${(activeMonthData.tasaAprob / 100) * 465} 465`}
                      strokeLinecap="round"
                      className="fill-none transition-all duration-1000 ease-out"
                      filter="url(#sciFiGlow)"
                    />

                    {/* Rejected Arc Portion (if any) */}
                    {activeMonthData.rechazados > 0 && (
                      <circle
                        cx="100"
                        cy="100"
                        r="74"
                        stroke="url(#cyberRoseGrad)"
                        strokeWidth="13"
                        strokeDasharray={`${((100 - activeMonthData.tasaAprob) / 100) * 465} 465`}
                        strokeDashoffset={`-${(activeMonthData.tasaAprob / 100) * 465}`}
                        strokeLinecap="round"
                        className="fill-none transition-all duration-1000 ease-out"
                      />
                    )}

                    {/* Inner Tech Concentric Radar Ring */}
                    <circle
                      cx="100"
                      cy="100"
                      r="58"
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeDasharray="2 6"
                      className="text-zinc-700/50 dark:text-zinc-400/50 fill-none"
                    />
                  </svg>

                  {/* Central Holographic HUD Display */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-3">
                    <span className="text-[8.5px] font-mono font-bold tracking-widest text-emerald-400 dark:text-emerald-600 uppercase flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                      CALIDAD STF
                    </span>
                    <span className="text-3xl sm:text-4xl font-black text-white dark:text-zinc-950 font-mono tracking-tight my-0.5 drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                      {activeMonthData.tasaAprob}%
                    </span>
                    <span className="text-[8.5px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono">
                      TASA APROBACIÓN
                    </span>
                    <span className="mt-1 text-[8px] font-mono px-2 py-0.2 rounded-full bg-emerald-950/80 dark:bg-emerald-100 text-emerald-300 dark:text-emerald-800 border border-emerald-500/40">
                      ● {activeMonthData.tasaAprob >= 90 ? 'CONFORME' : 'ALERTA'}
                    </span>
                  </div>
                </div>

                {/* 3. BLOQUE 3: BOTONES FUTURISTAS DE LOTES + APERTURA DE MODAL INTERACTIVO */}
                <div className="grid grid-cols-2 gap-3 w-full">
                  {/* Botón Lotes Aprobados */}
                  <button
                    type="button"
                    onClick={() => {
                      setLotesModalSearch('');
                      setShowLotesModal('APROBADOS');
                    }}
                    className="relative group p-3.5 rounded-2xl bg-gradient-to-b from-emerald-950/90 to-zinc-900/90 dark:from-emerald-50 dark:to-zinc-100 border border-emerald-500/50 hover:border-emerald-400 shadow-[0_4px_20px_rgba(16,185,129,0.15)] hover:shadow-[0_4px_25px_rgba(16,185,129,0.35)] text-center transition-all duration-200 cursor-pointer hover:scale-[1.03] active:scale-[0.98] overflow-hidden"
                  >
                    <span className="absolute top-0 right-0 w-8 h-8 bg-emerald-500/10 rounded-full blur-md pointer-events-none group-hover:bg-emerald-500/25 transition" />
                    
                    <div className="text-[10px] font-black text-emerald-300 dark:text-emerald-800 flex items-center justify-center gap-1.5 uppercase tracking-wider">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                      <span>LOTES APROBADOS</span>
                    </div>

                    <div className="text-2xl font-black font-mono text-emerald-400 dark:text-emerald-700 mt-1">
                      {activeMonthData.aprobados}
                    </div>

                    <div className="text-[9px] font-mono text-emerald-400/80 dark:text-emerald-600 mt-0.5 flex items-center justify-center gap-1">
                      <span>Ver {activeMonthData.aprobados} OPs</span>
                      <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
                    </div>
                  </button>

                  {/* Botón Lotes Rechazados */}
                  <button
                    type="button"
                    onClick={() => {
                      setLotesModalSearch('');
                      setShowLotesModal('RECHAZADOS');
                    }}
                    className="relative group p-3.5 rounded-2xl bg-gradient-to-b from-rose-950/90 to-zinc-900/90 dark:from-rose-50 dark:to-zinc-100 border border-rose-500/50 hover:border-rose-400 shadow-[0_4px_20px_rgba(244,63,94,0.15)] hover:shadow-[0_4px_25px_rgba(244,63,94,0.35)] text-center transition-all duration-200 cursor-pointer hover:scale-[1.03] active:scale-[0.98] overflow-hidden"
                  >
                    <span className="absolute top-0 right-0 w-8 h-8 bg-rose-500/10 rounded-full blur-md pointer-events-none group-hover:bg-rose-500/25 transition" />

                    <div className="text-[10px] font-black text-rose-300 dark:text-rose-800 flex items-center justify-center gap-1.5 uppercase tracking-wider">
                      <XCircle className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                      <span>LOTES RECHAZADOS</span>
                    </div>

                    <div className="text-2xl font-black font-mono text-rose-400 dark:text-rose-700 mt-1">
                      {activeMonthData.rechazados}
                    </div>

                    <div className="text-[9px] font-mono text-rose-400/80 dark:text-rose-600 mt-0.5 flex items-center justify-center gap-1">
                      <span>Ver {activeMonthData.rechazados} OPs</span>
                      <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
                    </div>
                  </button>
                </div>
              </div>

              <div className="lg:col-span-7 space-y-4">
                <div className="bg-zinc-900/80 dark:bg-zinc-50 p-5 rounded-3xl border border-zinc-800 dark:border-zinc-200 space-y-2">
                  <h4 className="text-xs font-black uppercase text-white dark:text-zinc-950">¿QUÉ MIDE ESTE GRÁFICO?</h4>
                  <p className="text-xs text-zinc-400 dark:text-zinc-600 leading-relaxed">
                    Representa el <strong className="text-white dark:text-zinc-950">porcentaje de efectividad y conformidad técnica</strong> de las muestras evaluadas en laboratorio para todos los meses acumulados.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-emerald-950/40 dark:bg-emerald-50 border border-emerald-500/40 dark:border-emerald-300 p-4 rounded-2xl space-y-1.5">
                    <span className="text-xs font-black text-emerald-300 dark:text-emerald-800 uppercase block">✓ LOTES APROBADOS (VERDE)</span>
                    <p className="text-xs text-emerald-200/80 dark:text-emerald-900/80 leading-snug">Liberadas para confección y corte masivo.</p>
                    <div className="text-xs font-mono font-bold text-emerald-400 dark:text-emerald-700">Total: {activeMonthData.aprobados} lotes</div>
                  </div>

                  <div className="bg-rose-950/40 dark:bg-rose-50 border border-rose-500/40 dark:border-rose-300 p-4 rounded-2xl space-y-1.5">
                    <span className="text-xs font-black text-rose-300 dark:text-rose-800 uppercase block">✕ LOTES RECHAZADOS (ROJO)</span>
                    <p className="text-xs text-rose-200/80 dark:text-rose-900/80 leading-snug">Desviaciones técnicas de encogimiento o tono.</p>
                    <div className="text-xs font-mono font-bold text-rose-400 dark:text-rose-700">Total: {activeMonthData.rechazados} lotes</div>
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* REJECTED CARDS GRID */}
          <div className="bg-rose-950/30 dark:bg-rose-50 border border-rose-900/60 dark:border-rose-200 rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-rose-900/60 dark:border-rose-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase">
                  RECHAZADOS: {selectedMonth}
                </span>
                <h4 className="text-xs font-black uppercase text-rose-200 dark:text-rose-950">
                  IDENTIFICACIÓN Y DETALLE DE OPS / LOTES RECHAZADOS
                </h4>
              </div>
              <span className="text-xs font-mono font-bold text-rose-400 dark:text-rose-700">
                {filteredRejectedOps.length} OPs
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredRejectedOps.map(rej => (
                <div key={rej.op} className="bg-[#0c1017] dark:bg-white border border-rose-900/60 dark:border-rose-200 rounded-2xl p-4 space-y-2 shadow-sm text-white dark:text-zinc-950">
                  <div className="flex items-center justify-between">
                    <span className="bg-rose-600 text-white font-mono font-black text-xs px-2 py-0.5 rounded">OP: {rej.op}</span>
                    <span className="text-[10px] font-mono text-zinc-400 uppercase">{rej.mes}</span>
                  </div>
                  <div className="text-xs font-bold text-white dark:text-zinc-950">{rej.ref} — {rej.tela}</div>
                  <div className="bg-rose-950/40 dark:bg-rose-50 p-2.5 rounded-xl border border-rose-900/40 dark:border-rose-200 text-[11px] text-rose-300 dark:text-rose-900 italic">
                    "{rej.causa}"
                  </div>
                  <div className="text-[10.5px] font-mono text-zinc-400 dark:text-zinc-500 pt-1 border-t border-zinc-800 dark:border-zinc-100">
                    Metraje: {rej.metraje} Mt • Fecha: {rej.fecha}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: EFECTIVIDAD EN RENDIMIENTO (EXACT MATCH TO SCREENSHOTS 1 & 2) */}
      {/* ========================================================================= */}
      {activeSectionTab === 'RENDIMIENTO' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* 4 TOP SUMMARY KPIS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            
            <div className="bg-[#0c1017] dark:bg-white border border-zinc-800 dark:border-zinc-200 p-4.5 rounded-3xl shadow-xl space-y-1 text-white dark:text-zinc-950">
              <div className="flex items-center justify-between text-[10px] text-cyan-400 dark:text-cyan-600 font-bold uppercase">
                <span>CUMPLIMIENTO SLA TIEMPOS</span>
                <Clock className="w-4 h-4 text-cyan-500" />
              </div>
              <div className="text-3xl font-black text-cyan-400 dark:text-cyan-600 font-mono">91.2%</div>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block">Dentro del SLA Objetivo</span>
            </div>

            <div className="bg-[#0c1017] dark:bg-white border border-zinc-800 dark:border-zinc-200 p-4.5 rounded-3xl shadow-xl space-y-1 text-white dark:text-zinc-950">
              <div className="flex items-center justify-between text-[10px] text-purple-400 dark:text-purple-600 font-bold uppercase">
                <span>TIEMPO PROMEDIO DE CICLO</span>
                <Clock className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-3xl font-black text-purple-400 dark:text-purple-600 font-mono">199.8h</div>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block">~8.3 Días hábiles total</span>
            </div>

            <div className="bg-[#0c1017] dark:bg-white border border-zinc-800 dark:border-zinc-200 p-4.5 rounded-3xl shadow-xl space-y-1 text-white dark:text-zinc-950">
              <div className="flex items-center justify-between text-[10px] text-amber-400 dark:text-amber-600 font-bold uppercase">
                <span>CUELLO DE BOTELLA PRINCIPAL</span>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-xl font-black text-amber-400 dark:text-amber-600 font-mono">Lavandería STF</div>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block">Fase de mayor tiempo muerto</span>
            </div>

            <div className="bg-[#0c1017] dark:bg-white border border-zinc-800 dark:border-zinc-200 p-4.5 rounded-3xl shadow-xl space-y-1 text-white dark:text-zinc-950">
              <div className="flex items-center justify-between text-[10px] text-emerald-400 dark:text-emerald-600 font-bold uppercase">
                <span>EFECTIVIDAD LABORATORIO STF</span>
                <Sparkles className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-3xl font-black text-emerald-400 dark:text-emerald-600 font-mono">95.0%</div>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block">Fase más veloz del proceso</span>
            </div>

          </div>

          {/* SECTION 1: EFECTIVIDAD POR ÁREA SEGÚN TIEMPOS DE PROCESAMIENTO (SCREENSHOT 1) */}
          <div className="bg-[#0c1017] dark:bg-white border border-zinc-800 dark:border-zinc-200 rounded-3xl p-6 shadow-2xl space-y-5 text-white dark:text-zinc-950">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 dark:border-zinc-200 pb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-indigo-950/80 dark:bg-indigo-100 text-indigo-300 dark:text-indigo-800 text-[9px] font-black px-2 py-0.5 rounded uppercase">
                    CRONOMETRÍA DE PROCESOS
                  </span>
                  <span className="text-xs text-zinc-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Tiempos de Transición por Fase
                  </span>
                </div>
                <h3 className="text-base font-black text-white dark:text-zinc-950 mt-1 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-400" />
                  <span>Efectividad por Área según Tiempos de Procesamiento</span>
                </h3>
                <p className="text-xs text-zinc-400 dark:text-zinc-600">
                  Medición detallada de horas invertidas en cada fase versus el SLA configurado y tiempos muertos de traslado.
                </p>
              </div>

              <span className="text-xs font-mono text-zinc-300 dark:text-zinc-700 bg-zinc-900 dark:bg-zinc-100 px-3 py-1.5 rounded-xl border border-zinc-700 dark:border-zinc-300 font-bold self-start sm:self-auto">
                SLA Global Base: 240.0 Horas Hábiles
              </span>
            </div>

            {/* 4 PHASES DETAILED METRIC CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* FASE 01 */}
              <div className="bg-zinc-900/80 dark:bg-zinc-50 p-5 rounded-3xl border border-zinc-800 dark:border-zinc-200 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 block font-bold uppercase">FASE 01</span>
                    <h4 className="text-xs font-black text-white dark:text-zinc-950">Pre-Solicitud ➔ Solicitud</h4>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Habilitación y preparación de muestra de colcha</span>
                  </div>
                  <span className="bg-emerald-950/80 dark:bg-emerald-100 text-emerald-300 dark:text-emerald-800 border border-emerald-500/40 dark:border-emerald-300 px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono">
                    92.8% Efectiva
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-white dark:text-zinc-950">Tiempo Real Medido: 38.4h</span>
                  <span className="text-zinc-400 dark:text-zinc-500">SLA Max: 48h</span>
                </div>

                <div className="w-full bg-zinc-800 dark:bg-zinc-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: '80%' }}></div>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-zinc-950 dark:bg-zinc-100 p-2.5 rounded-2xl text-center font-mono text-xs border border-zinc-800 dark:border-zinc-200">
                  <div>
                    <span className="text-[9px] text-zinc-400 dark:text-zinc-500 block uppercase">PRODUCTIVO</span>
                    <span className="font-bold text-white dark:text-zinc-950">48h</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-400 dark:text-zinc-500 block uppercase">TIEMPO MUERTO</span>
                    <span className="font-bold text-rose-400 dark:text-rose-600">3.2h</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-400 dark:text-zinc-500 block uppercase">OPS EN COLA</span>
                    <span className="font-black text-indigo-400 dark:text-indigo-600">{metrics.preSolicitud || 1} OPs</span>
                  </div>
                </div>
              </div>

              {/* FASE 02 */}
              <div className="bg-zinc-900/80 dark:bg-zinc-50 p-5 rounded-3xl border border-zinc-800 dark:border-zinc-200 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 block font-bold uppercase">FASE 02</span>
                    <h4 className="text-xs font-black text-white dark:text-zinc-950">Solicitud ➔ Lavandería (Inter-planta)</h4>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Recepción y traslado físico a planta de lavado externa</span>
                  </div>
                  <span className="bg-amber-950/80 dark:bg-amber-100 text-amber-300 dark:text-amber-800 border border-amber-500/40 dark:border-amber-300 px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono">
                    88.5% Efectiva
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-white dark:text-zinc-950">Tiempo Real Medido: 62.1h</span>
                  <span className="text-zinc-400 dark:text-zinc-500">SLA Max: 72h</span>
                </div>

                <div className="w-full bg-zinc-800 dark:bg-zinc-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: '86%' }}></div>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-zinc-950 dark:bg-zinc-100 p-2.5 rounded-2xl text-center font-mono text-xs border border-zinc-800 dark:border-zinc-200">
                  <div>
                    <span className="text-[9px] text-zinc-400 dark:text-zinc-500 block uppercase">PRODUCTIVO</span>
                    <span className="font-bold text-white dark:text-zinc-950">48h</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-400 dark:text-zinc-500 block uppercase">TIEMPO MUERTO</span>
                    <span className="font-bold text-rose-400 dark:text-rose-600">5.1h</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-400 dark:text-zinc-500 block uppercase">OPS EN COLA</span>
                    <span className="font-black text-amber-400 dark:text-amber-600">{metrics.solicitados || 26} OPs</span>
                  </div>
                </div>
              </div>

              {/* FASE 03 */}
              <div className="bg-zinc-900/80 dark:bg-zinc-50 p-5 rounded-3xl border border-zinc-800 dark:border-zinc-200 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 block font-bold uppercase">FASE 03</span>
                    <h4 className="text-xs font-black text-white dark:text-zinc-950">Lavandería ➔ Calidad STF (Inter-planta)</h4>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Lavado, acondicionamiento y retorno logístico a STF</span>
                  </div>
                  <span className="bg-rose-950/80 dark:bg-rose-100 text-rose-300 dark:text-rose-800 border border-rose-500/40 dark:border-rose-300 px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono">
                    86.2% Efectiva
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-white dark:text-zinc-950">Tiempo Real Medido: 66.8h</span>
                  <span className="text-zinc-400 dark:text-zinc-500">SLA Max: 96h</span>
                </div>

                <div className="w-full bg-zinc-800 dark:bg-zinc-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-rose-500 h-full rounded-full" style={{ width: '70%' }}></div>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-zinc-950 dark:bg-zinc-100 p-2.5 rounded-2xl text-center font-mono text-xs border border-zinc-800 dark:border-zinc-200">
                  <div>
                    <span className="text-[9px] text-zinc-400 dark:text-zinc-500 block uppercase">PRODUCTIVO</span>
                    <span className="font-bold text-white dark:text-zinc-950">72h</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-400 dark:text-zinc-500 block uppercase">TIEMPO MUERTO</span>
                    <span className="font-bold text-rose-400 dark:text-rose-600">6.8h</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-400 dark:text-zinc-500 block uppercase">OPS EN COLA</span>
                    <span className="font-black text-rose-400 dark:text-rose-600">{metrics.lavanderia || 12} OPs</span>
                  </div>
                </div>
              </div>

              {/* FASE 04 */}
              <div className="bg-zinc-900/80 dark:bg-zinc-50 p-5 rounded-3xl border border-zinc-800 dark:border-zinc-200 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 block font-bold uppercase">FASE 04</span>
                    <h4 className="text-xs font-black text-white dark:text-zinc-950">Calidad STF ➔ Evaluar (Finalizado)</h4>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Inspección de laboratorio STF y dictamen técnico</span>
                  </div>
                  <span className="bg-emerald-950/80 dark:bg-emerald-100 text-emerald-300 dark:text-emerald-800 border border-emerald-500/40 dark:border-emerald-300 px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono">
                    95% Efectiva
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-white dark:text-zinc-950">Tiempo Real Medido: 32.5h</span>
                  <span className="text-zinc-400 dark:text-zinc-500">SLA Max: 24h</span>
                </div>

                <div className="w-full bg-zinc-800 dark:bg-zinc-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: '100%' }}></div>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-zinc-950 dark:bg-zinc-100 p-2.5 rounded-2xl text-center font-mono text-xs border border-zinc-800 dark:border-zinc-200">
                  <div>
                    <span className="text-[9px] text-zinc-400 dark:text-zinc-500 block uppercase">PRODUCTIVO</span>
                    <span className="font-bold text-white dark:text-zinc-950">24h</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-400 dark:text-zinc-500 block uppercase">TIEMPO MUERTO</span>
                    <span className="font-bold text-amber-400 dark:text-amber-600">1.5h</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-400 dark:text-zinc-500 block uppercase">OPS EN COLA</span>
                    <span className="font-black text-emerald-400 dark:text-emerald-600">{metrics.calidad || 21} OPs</span>
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* SECTION 2: ANÁLISIS DE CUELLOS DE BOTELLA Y RETENCIÓN DE CARGA (SCREENSHOT 2) */}
          <div className="bg-[#0c1017] dark:bg-white border border-zinc-800 dark:border-zinc-200 rounded-3xl p-6 shadow-2xl space-y-5 text-white dark:text-zinc-950">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 dark:border-zinc-200 pb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-rose-950/80 dark:bg-rose-100 text-rose-300 dark:text-rose-800 text-[9px] font-black px-2 py-0.5 rounded uppercase">
                    DIAGNÓSTICO OPERATIVO
                  </span>
                  <span className="text-xs text-zinc-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    Evaluación de Puntos Críticos
                  </span>
                </div>
                <h3 className="text-base font-black text-white dark:text-zinc-950 mt-1 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <span>Análisis de Cuellos de Botella y Retención de Carga</span>
                </h3>
                <p className="text-xs text-zinc-400 dark:text-zinc-600">
                  Identificación de cuellos de botella por estancamiento de OPs, tiempos muertos de transporte e impacto en el ciclo total.
                </p>
              </div>

              <span className="text-xs font-mono text-rose-400 dark:text-rose-700 bg-rose-950/40 dark:bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-900/60 dark:border-rose-200 font-bold self-start sm:self-auto">
                Cuellos de Botella Detectados: 2 Áreas
              </span>
            </div>

            {/* 1. CRITICAL BOTTLE NECK CARD (FASE 3) */}
            <div className="bg-rose-950/20 dark:bg-rose-50 border-2 border-rose-900/80 dark:border-rose-300 rounded-3xl p-5 space-y-4 shadow-sm text-white dark:text-zinc-950">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-600 text-white rounded-xl">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-black text-white dark:text-zinc-950">
                        Fase 3: Lavandería ➔ Calidad STF
                      </h4>
                      <span className="bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase">
                        CUELLO DE BOTELLA PRINCIPAL
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500 block">
                      Proceso de lavado, secado y transporte de retorno inter-planta
                    </span>
                  </div>
                </div>

                <span className="text-xs font-mono font-bold text-rose-400 dark:text-rose-700 bg-zinc-900 dark:bg-white px-3 py-1 rounded-xl border border-rose-800 dark:border-rose-200 self-start sm:self-auto">
                  Retardo Promedio: +18.8h sobre productivo
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-zinc-950 dark:bg-white p-3.5 rounded-2xl border border-rose-900/60 dark:border-rose-200 space-y-0.5 shadow-sm">
                  <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-bold uppercase block">TIEMPO MUERTO ACUMULADO</span>
                  <div className="text-xl font-black text-rose-400 dark:text-rose-600 font-mono">6.8 Horas / OP</div>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block">Demora en espera de vehículo inter-planta</span>
                </div>

                <div className="bg-zinc-950 dark:bg-white p-3.5 rounded-2xl border border-rose-900/60 dark:border-rose-200 space-y-0.5 shadow-sm">
                  <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-bold uppercase block">ACUMULACIÓN EN COLA</span>
                  <div className="text-xl font-black text-white dark:text-zinc-950 font-mono">
                    {metrics.lavanderia || 12} OPs Retenidas
                  </div>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block">En proceso de tambor o retorno</span>
                </div>

                <div className="bg-zinc-950 dark:bg-white p-3.5 rounded-2xl border border-rose-900/60 dark:border-rose-200 space-y-0.5 shadow-sm">
                  <span className="text-[9px] text-indigo-400 dark:text-indigo-600 font-bold uppercase block">ACCIÓN CORRECTIVA RECOMENDADA</span>
                  <div className="text-xs font-black text-white dark:text-zinc-950">
                    Programar 2ª ruta de transporte diario
                  </div>
                  <span className="text-[10px] text-emerald-400 dark:text-emerald-600 font-bold block">Reduce en 4.5h el tiempo muerto</span>
                </div>
              </div>
            </div>

            {/* 2. MODERATE BOTTLE NECK CARD (FASE 2) */}
            <div className="bg-amber-950/20 dark:bg-amber-50 border-2 border-amber-900/80 dark:border-amber-300 rounded-3xl p-5 space-y-4 shadow-sm text-white dark:text-zinc-950">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500 text-black rounded-xl">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-black text-white dark:text-zinc-950">
                        Fase 2: Solicitud ➔ Lavandería
                      </h4>
                      <span className="bg-amber-500 text-black text-[9px] font-black px-2 py-0.5 rounded uppercase">
                        CUELLO DE BOTELLA MODERADO
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500 block">
                      Recepción, agrupación de colchas y despacho a lavandería externa
                    </span>
                  </div>
                </div>

                <span className="text-xs font-mono font-bold text-amber-400 dark:text-amber-700 bg-zinc-900 dark:bg-white px-3 py-1 rounded-xl border border-amber-800 dark:border-amber-200 self-start sm:self-auto">
                  Retardo Promedio: +14.1h sobre productivo
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-zinc-950 dark:bg-white p-3.5 rounded-2xl border border-amber-900/60 dark:border-amber-200 space-y-0.5 shadow-sm">
                  <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-bold uppercase block">TIEMPO MUERTO ACUMULADO</span>
                  <div className="text-xl font-black text-amber-400 dark:text-amber-600 font-mono">5.1 Horas / OP</div>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block">Espera para consolidación de lote</span>
                </div>

                <div className="bg-zinc-950 dark:bg-white p-3.5 rounded-2xl border border-amber-900/60 dark:border-amber-200 space-y-0.5 shadow-sm">
                  <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-bold uppercase block">ACUMULACIÓN EN COLA</span>
                  <div className="text-xl font-black text-white dark:text-zinc-950 font-mono">
                    {metrics.solicitados || 26} OPs Retenidas
                  </div>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block">Listas para despacho logístico</span>
                </div>

                <div className="bg-zinc-950 dark:bg-white p-3.5 rounded-2xl border border-amber-900/60 dark:border-amber-200 space-y-0.5 shadow-sm">
                  <span className="text-[9px] text-indigo-400 dark:text-indigo-600 font-bold uppercase block">ACCIÓN CORRECTIVA RECOMENDADA</span>
                  <div className="text-xs font-black text-white dark:text-zinc-950">
                    Despachar lotes parciales de min 3 OPs
                  </div>
                  <span className="text-[10px] text-emerald-400 dark:text-emerald-600 font-bold block">Evita esperas por consolidación</span>
                </div>
              </div>
            </div>

            {/* 3. FLUID PHASES ROW */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="bg-zinc-900/80 dark:bg-zinc-50 p-4 rounded-2xl border border-emerald-500/40 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <div>
                    <h5 className="text-xs font-black text-white dark:text-zinc-950">Fase 1: Pre-Solicitud ➔ Solicitud</h5>
                    <span className="text-[11px] font-mono text-emerald-400 dark:text-emerald-600 font-bold">
                      FLUJO FLUIDO (38.4h real vs 48h SLA)
                    </span>
                  </div>
                </div>
                <span className="text-xs font-mono font-black text-emerald-400 dark:text-emerald-600 bg-emerald-950/80 dark:bg-emerald-100 px-2.5 py-0.5 rounded">
                  92.8% Ef.
                </span>
              </div>

              <div className="bg-zinc-900/80 dark:bg-zinc-50 p-4 rounded-2xl border border-emerald-500/40 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <div>
                    <h5 className="text-xs font-black text-white dark:text-zinc-950">Fase 4: Calidad STF ➔ Finalizado</h5>
                    <span className="text-[11px] font-mono text-emerald-400 dark:text-emerald-600 font-bold">
                      FLUJO ÓPTIMO (32.5h real vs 48h SLA)
                    </span>
                  </div>
                </div>
                <span className="text-xs font-mono font-black text-emerald-400 dark:text-emerald-600 bg-emerald-950/80 dark:bg-emerald-100 px-2.5 py-0.5 rounded">
                  95.0% Ef.
                </span>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* MODAL: OPS PROCESADAS POR UN TRABAJADOR EN EL DÍA */}
      {selectedWorkerOpsModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0c1017] dark:bg-white border border-zinc-800 dark:border-zinc-200 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden font-sans text-white dark:text-zinc-950">
            
            <div className="p-5 border-b border-zinc-800 dark:border-zinc-200 bg-zinc-900 dark:bg-zinc-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-500/20 text-emerald-400 dark:text-emerald-700 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {selectedWorkerOpsModal.worker.area}
                  </span>
                  <span className="text-xs text-zinc-400 dark:text-zinc-600 font-mono">Fecha: {selectedCalendarDate}</span>
                </div>
                <h3 className="text-base font-black text-white dark:text-zinc-950 brand-title mt-1">
                  OPs Procesadas por: {selectedWorkerOpsModal.worker.nombre} ({selectedWorkerOpsModal.count} OPs)
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedWorkerOpsModal(null)}
                className="text-zinc-400 hover:text-white dark:text-zinc-600 dark:hover:text-zinc-950 p-2 rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 custom-scroll p-5 space-y-3">
              {Array.from({ length: selectedWorkerOpsModal.count }).map((_, idx) => {
                const sampleOp = selectedDateOps[idx % (selectedDateOps.length || 1)] || {
                  id: `op-work-${idx}`,
                  op: `000930${70 + idx}`,
                  referencia: `REF-SF-${200 + idx * 10}`,
                  tela: idx % 2 === 0 ? 'TELA INDIGO LARKANA' : 'TELA DENIM HEAVY',
                  color: idx % 2 === 0 ? 'AZUL' : 'NEGRO',
                  rollos: idx === 0 ? 8 : 7,
                  estado: 'CALIDAD'
                };

                return (
                  <div key={idx} className="bg-zinc-900 dark:bg-zinc-50 border border-zinc-800 dark:border-zinc-200 p-3.5 rounded-2xl flex items-center justify-between text-xs text-white dark:text-zinc-950">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-amber-400 dark:text-amber-600">OP #{sampleOp.op}</span>
                        <span className="font-mono text-zinc-400 dark:text-zinc-500">Ref: {sampleOp.referencia}</span>
                      </div>
                      <span className="text-white dark:text-zinc-950 font-bold block mt-0.5">{sampleOp.tela}</span>
                      <span className="text-zinc-400 dark:text-zinc-500 text-[11px] block">Color: {sampleOp.color} • {sampleOp.rollos} Rollos</span>
                    </div>

                    <div className="text-right font-mono">
                      <span className="bg-emerald-950 dark:bg-emerald-100 text-emerald-300 dark:text-emerald-800 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold block">
                        CALIDAD STF
                      </span>
                      <span className="text-zinc-500 text-[10px] block mt-1">
                        08:{15 + idx * 10} a. m.
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-zinc-800 dark:border-zinc-200 bg-zinc-900 dark:bg-zinc-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedWorkerOpsModal(null)}
                className="px-4 py-2 bg-white text-zinc-950 hover:bg-zinc-200 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-800 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: OPS PROCESADAS POR ÁREA EN EL DÍA */}
      {selectedAreaOpsModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0c1017] dark:bg-white border border-zinc-800 dark:border-zinc-200 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden font-sans text-white dark:text-zinc-950">
            
            <div className="p-5 border-b border-zinc-800 dark:border-zinc-200 bg-zinc-900 dark:bg-zinc-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-amber-500/20 text-amber-400 dark:text-amber-700 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {selectedAreaOpsModal.areaName}
                  </span>
                  <span className="text-xs text-zinc-400 dark:text-zinc-600 font-mono">{selectedAreaOpsModal.dateName}</span>
                </div>
                <h3 className="text-base font-black text-white dark:text-zinc-950 brand-title mt-1">
                  OPs Procesadas en Área: {selectedAreaOpsModal.count} OPs
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAreaOpsModal(null)}
                className="text-zinc-400 hover:text-white dark:text-zinc-600 dark:hover:text-zinc-950 p-2 rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-zinc-900/60 dark:bg-zinc-50 border-b border-zinc-800 dark:border-zinc-200 flex items-center gap-2 flex-wrap text-xs">
              <span className="text-zinc-400 dark:text-zinc-600 font-bold uppercase text-[10px]">Operarios que procesaron hoy:</span>
              {selectedAreaOpsModal.operarios.map(opName => (
                <span key={opName} className="bg-emerald-950 dark:bg-emerald-100 text-emerald-300 dark:text-emerald-800 border border-emerald-500/30 px-2 py-0.5 rounded font-black font-mono text-[11px]">
                  {opName}
                </span>
              ))}
            </div>

            <div className="overflow-y-auto flex-1 custom-scroll p-5 space-y-3">
              {Array.from({ length: selectedAreaOpsModal.count }).map((_, idx) => {
                const sampleOp = selectedDateOps[idx % (selectedDateOps.length || 1)] || {
                  id: `op-area-${idx}`,
                  op: `000930${60 + idx}`,
                  referencia: `REF-SF-${100 + idx * 15}`,
                  tela: idx % 2 === 0 ? 'TELA INDIGO LARKANA' : 'TELA COTTON DENIM',
                  color: idx % 2 === 0 ? 'AZUL' : 'INDIGO DARK',
                  rollos: 7,
                  estado: 'CALIDAD'
                };

                const assignedWorker = selectedAreaOpsModal.operarios[idx % selectedAreaOpsModal.operarios.length];

                return (
                  <div key={idx} className="bg-zinc-900 dark:bg-zinc-50 border border-zinc-800 dark:border-zinc-200 p-3.5 rounded-2xl flex items-center justify-between text-xs text-white dark:text-zinc-950">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-amber-400 dark:text-amber-600">OP #{sampleOp.op}</span>
                        <span className="font-mono text-zinc-400 dark:text-zinc-500">Ref: {sampleOp.referencia}</span>
                        <span className="bg-zinc-800 dark:bg-zinc-200 text-zinc-300 dark:text-zinc-700 px-2 py-0.2 rounded font-bold text-[10px]">
                          👤 {assignedWorker.split(' ')[0]}
                        </span>
                      </div>
                      <span className="text-white dark:text-zinc-950 font-bold block mt-0.5">{sampleOp.tela}</span>
                      <span className="text-zinc-400 dark:text-zinc-500 text-[11px] block">Color: {sampleOp.color} • {sampleOp.rollos} Rollos</span>
                    </div>

                    <div className="text-right font-mono">
                      <span className="bg-emerald-950 dark:bg-emerald-100 text-emerald-300 dark:text-emerald-800 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold block">
                        CALIDAD STF
                      </span>
                      <span className="text-zinc-500 text-[10px] block mt-1">
                        08:{20 + idx * 8} a. m.
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-zinc-800 dark:border-zinc-200 bg-zinc-900 dark:bg-zinc-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedAreaOpsModal(null)}
                className="px-4 py-2 bg-white text-zinc-950 hover:bg-zinc-200 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-800 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL INTERACTIVO DE LOTES APROBADOS / RECHAZADOS EN TIEMPO REAL */}
      {showLotesModal && (
        <div 
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 select-none"
        >
          <div className="bg-[#0c1017] dark:bg-white border border-zinc-800 dark:border-zinc-200 rounded-3xl max-w-3xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden font-sans text-white dark:text-zinc-950">
            
            {/* Modal Header */}
            <div className={`p-5 border-b border-zinc-800 dark:border-zinc-200 flex items-center justify-between ${
              showLotesModal === 'APROBADOS'
                ? 'bg-gradient-to-r from-emerald-950/60 to-zinc-900 dark:from-emerald-50 dark:to-zinc-100'
                : 'bg-gradient-to-r from-rose-950/60 to-zinc-900 dark:from-rose-50 dark:to-zinc-100'
            }`}>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                    showLotesModal === 'APROBADOS'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50 dark:bg-emerald-100 dark:text-emerald-800'
                      : 'bg-rose-950 text-rose-300 border-rose-500/50 dark:bg-rose-100 dark:text-rose-800'
                  }`}>
                    {showLotesModal === 'APROBADOS' ? '✓ DICTAMEN APROBADO' : '✕ DICTAMEN RECHAZADO'}
                  </span>
                  <span className="text-xs font-mono text-zinc-400 dark:text-zinc-600">
                    Mes: {selectedMonth === 'ALL' ? `Consolidado ENE-${currentMonthName.substring(0,3)} 2026` : selectedMonth}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-black text-white dark:text-zinc-950 brand-title flex items-center gap-2">
                  {showLotesModal === 'APROBADOS' ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span>Órdenes de Producción (OPs) Aprobadas — Total: {modalOpsList.length}</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-rose-400" />
                      <span>Órdenes de Producción (OPs) Rechazadas — Total: {modalOpsList.length}</span>
                    </>
                  )}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowLotesModal(null);
                  setLotesModalSearch('');
                }}
                className="text-zinc-400 hover:text-white dark:text-zinc-600 dark:hover:text-zinc-950 p-2 rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Controls: Search & CSV Export */}
            <div className="p-4 bg-zinc-900/70 dark:bg-zinc-50 border-b border-zinc-800 dark:border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:flex-1">
                <input
                  type="text"
                  value={lotesModalSearch}
                  onChange={(e) => setLotesModalSearch(e.target.value)}
                  placeholder="Buscar por OP, Referencia, Tela, Inspector, Causa..."
                  className="w-full bg-zinc-900 dark:bg-zinc-100 border border-zinc-800 dark:border-zinc-200 rounded-xl pl-9 pr-4 py-2 text-xs text-white dark:text-zinc-950 placeholder-zinc-400 focus:outline-none focus:border-emerald-500 shadow-xs"
                />
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                {lotesModalSearch && (
                  <button
                    type="button"
                    onClick={() => setLotesModalSearch('')}
                    className="absolute right-2.5 top-2 text-zinc-400 hover:text-white text-xs"
                  >
                    ×
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleExportModalCSV}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 dark:bg-zinc-200 dark:hover:bg-zinc-300 text-white dark:text-zinc-950 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar ({modalOpsList.length})</span>
              </button>
            </div>

            {/* Modal Scrollable OP List */}
            <div className="overflow-y-auto flex-1 custom-scroll p-5 space-y-3">
              {modalOpsList.length === 0 ? (
                <div className="text-center py-10 text-zinc-400 dark:text-zinc-500 text-xs space-y-2">
                  <p>No se encontraron OPs que coincidan con la búsqueda "{lotesModalSearch}".</p>
                  <button
                    type="button"
                    onClick={() => setLotesModalSearch('')}
                    className="text-emerald-400 underline font-bold"
                  >
                    Limpiar búsqueda
                  </button>
                </div>
              ) : (
                modalOpsList.map((opItem, idx) => {
                  const isApproved = opItem.dictamen === 'APROBADO' || opItem.estado === 'FINALIZADO';
                  const isRejected = opItem.dictamen === 'RECHAZADO';

                  return (
                    <div
                      key={opItem.id || idx}
                      className="bg-zinc-900/90 dark:bg-zinc-50 border border-zinc-800 dark:border-zinc-200 hover:border-zinc-700 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-mono font-black px-2 py-0.5 rounded text-xs ${
                            isApproved 
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40 dark:bg-emerald-100 dark:text-emerald-800' 
                              : 'bg-rose-950 text-rose-300 border border-rose-500/40 dark:bg-rose-100 dark:text-rose-800'
                          }`}>
                            OP #{opItem.op}
                          </span>
                          <span className="font-bold text-white dark:text-zinc-950">
                            {opItem.referencia}
                          </span>
                          {opItem.lote && (
                            <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800/80 dark:bg-zinc-200 px-1.5 py-0.2 rounded">
                              Lote: {opItem.lote}
                            </span>
                          )}
                        </div>

                        <div className="text-zinc-300 dark:text-zinc-700 font-medium">
                          {opItem.tela} {opItem.color ? `• Color: ${opItem.color}` : ''} • {opItem.rollos} Rollos
                        </div>

                        {(opItem.observacionesCalidad || opItem.observacionesOperario || opItem.observacionesLavanderia) && (
                          <div className={`text-[11px] p-2 rounded-xl border italic mt-1 ${
                            isRejected
                              ? 'bg-rose-950/40 dark:bg-rose-50 border-rose-900/40 text-rose-300 dark:text-rose-900'
                              : 'bg-emerald-950/30 dark:bg-emerald-50 border-emerald-900/40 text-emerald-300 dark:text-emerald-900'
                          }`}>
                            "{opItem.observacionesCalidad || opItem.observacionesOperario || opItem.observacionesLavanderia}"
                          </div>
                        )}

                        <div className="text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center gap-3 pt-0.5">
                          <span>👤 Inspector: {opItem.inspector || 'Laboratorio STF'}</span>
                          <span>📅 Fecha: {opItem.fechaCreacion || '2026'}</span>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 shrink-0">
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-black uppercase ${
                          isApproved
                            ? 'bg-emerald-500 text-black'
                            : 'bg-rose-500 text-white'
                        }`}>
                          {isApproved ? 'LIBERADO' : 'RECHAZADO'}
                        </span>

                        {onViewDetail && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowLotesModal(null);
                              onViewDetail(opItem);
                            }}
                            className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 dark:bg-zinc-200 text-zinc-300 dark:text-zinc-800 rounded-lg text-[10.5px] font-bold flex items-center gap-1 transition cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Ver Detalle</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-800 dark:border-zinc-200 bg-zinc-900 dark:bg-zinc-100 flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-400 dark:text-zinc-600">
                Mostrando {modalOpsList.length} registro(s) en tiempo real
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowLotesModal(null);
                  setLotesModalSearch('');
                }}
                className="px-5 py-2 bg-white text-zinc-950 hover:bg-zinc-200 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-800 rounded-xl text-xs font-black transition cursor-pointer shadow-md"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 5. REPORTE COMITÉ DE CALIDAD MODAL (FULL SCREEN EXPORT) */}
      <ReporteComiteModal
        isOpen={isReporteComiteOpen}
        onClose={() => setIsReporteComiteOpen(false)}
        solicitudes={solicitudes}
        currentUser={currentUser}
      />

      {/* 6. ADMIN PARAMETERS MODAL */}
      <AdminParametrosModal
        isOpen={isAdminParametrosOpen}
        onClose={() => setIsAdminParametrosOpen(false)}
        currentUser={currentUser}
      />

      {/* 7. FLOATING QUICK SCROLL PILL */}
      <FloatingScrollPill totalOpsCount={totalHistorico} />

    </div>
  );
};
