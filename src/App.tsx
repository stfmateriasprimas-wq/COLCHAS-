import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { TabType } from './components/Navigation';
import { CleanLandingView } from './components/Dashboard/CleanLandingView';
import { AreaOpsModal } from './components/Dashboard/AreaOpsModal';
import { SolicitudForm } from './components/NuevaSolicitud/SolicitudForm';
import { ThermalPrinterModal } from './components/NuevaSolicitud/ThermalPrinterModal';
import { PublicOpView } from './components/Public/PublicOpView';
import { BandejaView } from './components/Bandeja/BandejaView';
import { TransferModal } from './components/Bandeja/TransferModal';
import { OpDetailModal } from './components/Bandeja/OpDetailModal';
import { MasterTable } from './components/BaseDatos/MasterTable';
import { SlaAlertsList } from './components/Alertas/SlaAlertsList';
import { TimelineView } from './components/Timeline/TimelineView';
import { EstadisticasView } from './components/Estadisticas/EstadisticasView';
import { ChatTeamsModal } from './components/Chat/ChatTeamsModal';
import { LoginScreen } from './components/Auth/LoginScreen';
import { UserProfileModal } from './components/Auth/UserProfileModal';
import { FloatingAiVoiceButton } from './components/Common/FloatingAiVoiceButton';
import { StatSectionTabType } from './services/aiVoiceService';
import { UsuarioSTF, syncUsuariosFromSheets, getUsuariosList } from './services/authService';
import { SolicitudColcha, MonitoreoItem, KpiMetrics, SectorType, DictamenType } from './types';
import { 
  fetchMonitoreoSheet, 
  fetchBaseDeDatosSheet, 
  pushSolicitudToSheets, 
  pushTransferToSheets, 
  pushDictamenToSheets, 
  pushOpPhotoToSheets,
  saveLocalCreatedOp,
  getLocalCreatedOps,
  removeLocalCreatedOp,
  updateLocalOpStatus,
  updateLocalOpPhoto,
  markMonitoreoOpAsConsumed,
  deleteOrConsumeMonitoreoOpFromSheets,
  syncAllAlertasToSheets,
  removeOpFromAlertasSheet,
  deleteOpFromGoogleSheets,
  formatOpCode,
  getCachedSolicitudes,
  saveCachedSolicitudes,
  INITIAL_MONITOREO_DATA, 
  INITIAL_SOLICITUDES_DATA 
} from './services/googleSheetsService';
import { notificationService } from './services/notificationService';
import { calculateWorkingDays } from './services/slaCalculator';
import { 
  addOpToDeletedHistory, 
  isOpDeleted, 
  unmarkOpAsDeleted,
  getDeletedOpNumbers 
} from './services/deletedOpsService';
import { Trash2, CheckCircle2 } from 'lucide-react';

export function App() {
  // Theme state persisted in localStorage
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem('stf_colchas_theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    return true; // Default dark
  });

  // Apply dark class to documentElement
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('stf_colchas_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('stf_colchas_theme', 'light');
    }
  }, [isDarkMode]);

  // Public QR View State (Acceso público sin inicio de sesión)
  const [publicOpNumber, setPublicOpNumber] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const view = params.get('view');
      const op = params.get('op');
      const pathParts = window.location.pathname.split('/').filter(Boolean);
      if (pathParts[0] === 'trazabilidad' || pathParts[0] === 'op') {
        return pathParts[1] || null;
      }
      if (view === 'public' && op) {
        return op;
      }
      // Si entra por QR y no tiene sesión iniciada
      if (op && !params.get('user') && !localStorage.getItem('stf_colchas_user')) {
        return op;
      }
    }
    return null;
  });

  // Helper to remove 'user' from URL without page reload
  const cleanUserUrlParam = () => {
    if (typeof window !== 'undefined' && window.location.search) {
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has('user')) {
          url.searchParams.delete('user');
          const newSearch = url.searchParams.toString() ? '?' + url.searchParams.toString() : '';
          window.history.replaceState(null, '', url.pathname + newSearch + url.hash);
        }
      } catch (e) {}
    }
  };

  // Authentication State with Magic Auto-Login Support
  const [currentUser, setCurrentUser] = useState<UsuarioSTF | null>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const userParam = urlParams.get('user');
      if (userParam) {
        const initialUsers = getUsuariosList();
        const cleanUser = userParam.trim().toLowerCase();
        const found = initialUsers.find(u => 
          u.id.toLowerCase() === cleanUser || 
          u.nombre.toLowerCase() === cleanUser ||
          u.nombre.toLowerCase().includes(cleanUser)
        );
        if (found) {
          localStorage.setItem('stf_colchas_user', JSON.stringify(found));
          return found;
        }
      }
    }
    const saved = localStorage.getItem('stf_colchas_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const hasProcessedUrlOpRef = React.useRef(false);

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [monitoreoList, setMonitoreoList] = useState<MonitoreoItem[]>(INITIAL_MONITOREO_DATA);
  const [solicitudes, setSolicitudes] = useState<SolicitudColcha[]>(() => getCachedSolicitudes());
  const [isSyncing, setIsSyncing] = useState(false);

  // Modals state
  const [selectedAreaForModal, setSelectedAreaForModal] = useState<SectorType | 'TOTAL' | 'EN_PROCESO' | null>(null);
  const [selectedColchaPrinter, setSelectedColchaPrinter] = useState<SolicitudColcha | null>(null);
  const [selectedColchaTransfer, setSelectedColchaTransfer] = useState<SolicitudColcha | null>(null);
  const [selectedColchaDetail, setSelectedColchaDetail] = useState<SolicitudColcha | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isProfileDirectoryOpen, setIsProfileDirectoryOpen] = useState(false);
  const [inAppToast, setInAppToast] = useState<{ sender: string; message: string; room?: string } | null>(null);

  // AI Voice Assistant navigation & filter states
  const [aiStageFilter, setAiStageFilter] = useState<SectorType | 'EN_PROCESO' | 'ALL' | undefined>(undefined);
  const [aiSearchQuery, setAiSearchQuery] = useState<string | undefined>(undefined);
  const [aiStatSection, setAiStatSection] = useState<StatSectionTabType | undefined>(undefined);
  const [isReporteComiteForAi, setIsReporteComiteForAi] = useState<boolean>(false);

  // Escuchar notificaciones flotantes de chat
  useEffect(() => {
    const unsub = notificationService.onInAppToast((toast) => {
      setInAppToast(toast);
      const timer = setTimeout(() => {
        setInAppToast(prev => prev === toast ? null : prev);
      }, 5000);
      return () => clearTimeout(timer);
    });
    return unsub;
  }, []);

  // Load from Sheets on mount & set up 30-second live polling
  useEffect(() => {
    loadAllLiveData();
    const interval = setInterval(() => {
      loadAllLiveData(true);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Parse and handle incoming URL query parameters for Magic Auto-Login and Direct OP viewing
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const userParam = urlParams.get('user');
    const opParam = urlParams.get('op');
    const tabParam = urlParams.get('tab') as TabType | null;
    const viewParam = urlParams.get('view');

    // 0. Detect Public View Mode
    if (opParam && (viewParam === 'public' || (!currentUser && !userParam && !localStorage.getItem('stf_colchas_user')))) {
      setPublicOpNumber(opParam);
    }

    // 1. Auto-login if user is specified in the URL on initial load
    if (userParam) {
      const currentUsers = getUsuariosList();
      const cleanUser = userParam.trim().toLowerCase();
      const found = currentUsers.find(u => 
        u.id.toLowerCase() === cleanUser || 
        u.nombre.toLowerCase() === cleanUser ||
        u.nombre.toLowerCase().includes(cleanUser)
      );
      if (found) {
        setCurrentUser(found);
        localStorage.setItem('stf_colchas_user', JSON.stringify(found));
      }
      // Limpiar inmediatamente el parámetro de la URL para que no quede pegado ni interfiera con futuros cambios de usuario
      cleanUserUrlParam();
    }

    // 2. Initial direct tab navigation
    if (tabParam && ['dashboard', 'solicitudes', 'alertas', 'basedatos', 'estadisticas'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

  // Open OP Detail Modal automatically if op param is specified in initial URL
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const opParam = urlParams.get('op');
    if (opParam && solicitudes.length > 0 && !hasProcessedUrlOpRef.current) {
      const cleanTargetOp = opParam.replace(/\D/g, '') || opParam.trim().toUpperCase();
      const match = solicitudes.find(s => 
        s.op.replace(/\D/g, '') === cleanTargetOp || 
        s.op.trim().toUpperCase() === opParam.trim().toUpperCase() ||
        s.op.trim().toUpperCase().includes(opParam.trim().toUpperCase())
      );
      if (match) {
        setSelectedColchaDetail(match);
        hasProcessedUrlOpRef.current = true;
        notificationService.playAlertSound('NOTIFICACION');
      }
    }
  }, [solicitudes]);

  // State for Delete & Finalize Confirmation Modals
  const [confirmDeleteOp, setConfirmDeleteOp] = useState<SolicitudColcha | null>(null);
  const [confirmFinalizarOp, setConfirmFinalizarOp] = useState<SolicitudColcha | null>(null);

  const loadAllLiveData = async (isBackground: boolean = false) => {
    if (!isBackground) setIsSyncing(true);
    try {
      const [monitoreoData, baseDatosData, usuariosData] = await Promise.all([
        fetchMonitoreoSheet(),
        fetchBaseDeDatosSheet(),
        syncUsuariosFromSheets()
      ]);

      if (monitoreoData.length > 0) setMonitoreoList(monitoreoData);
      if (baseDatosData.length > 0) {
        // Exclude OPs that have been deleted by Edwin into history
        const activeOnly = baseDatosData.filter(item => !isOpDeleted(item.op));
        setSolicitudes(activeOnly);

        // Sincronización automática de alertas activas hacia la página ALERTAS de Google Sheets
        const delayedOps = activeOnly.filter(s => s.tieneRetraso && s.estado !== 'FINALIZADO');
        if (delayedOps.length > 0) {
          syncAllAlertasToSheets(delayedOps);
        }
      }

      // Mantener sincronizados los datos del usuario actual SIN cambiar de perfil arbitrariamente
      if (usuariosData && usuariosData.length > 0) {
        setCurrentUser(prevUser => {
          if (!prevUser) return null;
          const fresh = usuariosData.find(u => u.id.toLowerCase() === prevUser.id.toLowerCase());
          if (fresh) {
            localStorage.setItem('stf_colchas_user', JSON.stringify(fresh));
            return fresh;
          }
          return prevUser;
        });
      }
    } catch (err) {
      console.error("Error sincronizando base de datos en tiempo real:", err);
    } finally {
      if (!isBackground) setIsSyncing(false);
    }
  };

  const handleDeleteOp = async (solicitud: SolicitudColcha) => {
    // Al pulsar ELIMINAR en el perfil de ediaz, se ejecuta la eliminación de forma 100% automática e inmediata
    await executeDeleteOp(solicitud);
  };

  const executeDeleteOp = async (solicitud: SolicitudColcha) => {
    if (!solicitud) return;
    setConfirmDeleteOp(null);

    const adminName = currentUser ? `${currentUser.nombre} (${currentUser.rol || 'Administrador'})` : 'Edwin Diaz (Administrador)';
    addOpToDeletedHistory(solicitud, adminName);
    
    const targetCleanOp = (solicitud.op || '').replace(/^OP-+/i, '').trim().toUpperCase();
    const targetDigits = (solicitud.op || '').replace(/\D/g, '');

    // 1. Eliminar inmediatamente del estado activo en memoria en 0ms
    setSolicitudes(prev => {
      const updated = prev.filter(s => {
        const sClean = (s.op || '').replace(/^OP-+/i, '').trim().toUpperCase();
        const sDigits = (s.op || '').replace(/\D/g, '');
        const isMatch = s.id === solicitud.id || 
                        (targetDigits !== '' && sDigits === targetDigits) || 
                        (targetCleanOp !== '' && sClean === targetCleanOp) ||
                        isOpDeleted(s.op);
        return !isMatch;
      });
      // Guardar lista filtrada en caché para evitar que reaparezca al recargar
      saveCachedSolicitudes(updated);
      return updated;
    });

    // 2. Limpiar de local created ops
    try {
      removeLocalCreatedOp(solicitud.op);
      if (solicitud.id) removeLocalCreatedOp(solicitud.id);
      if (targetCleanOp) removeLocalCreatedOp(targetCleanOp);
      if (targetDigits) removeLocalCreatedOp(targetDigits);
    } catch (e) {
      console.warn('Error clearing deleted op from local storage:', e);
    }
    
    // 3. Notificación instantánea en pantalla
    setInAppToast({
      sender: 'ADMIN EDWIN',
      message: `🗑️ OP-${targetCleanOp || solicitud.op} eliminada automáticamente del sistema.`,
      room: 'ADMIN'
    });

    // 4. Depuración en tiempo real de Google Sheets (ALERTAS y BASE_DE_DATOS)
    try {
      removeOpFromAlertasSheet(solicitud.op);
      deleteOpFromGoogleSheets(solicitud.op).catch(() => {});
    } catch (e) {}

    // 5. Feedback sonoro de éxito
    try {
      notificationService.playAlertSound('EXITO');
    } catch (e) {}
  };

  const handleFinalizarOp = (solicitud: SolicitudColcha) => {
    setConfirmFinalizarOp(solicitud);
  };

  const executeFinalizarOp = async (solicitud: SolicitudColcha) => {
    const opNumber = solicitud.op;
    const auditorName = currentUser ? currentUser.nombre : 'AUDITOR STF';

    setSolicitudes(prev => prev.map(item => {
      if (item.id === solicitud.id || item.op.trim().toUpperCase() === solicitud.op.trim().toUpperCase()) {
        const { diasHabiles, horasHabiles } = calculateWorkingDays(item.fechaCreacion);
        return {
          ...item,
          estado: 'FINALIZADO' as SectorType,
          areaActual: 'CALIDAD PLANTA STF',
          dictamen: 'APROBADO' as DictamenType,
          diasHabiles,
          horasEnProceso: horasHabiles,
          tieneRetraso: false,
          esRetrasoCritico: false,
          fechaActualizacion: new Date().toISOString(),
          observacionesOperario: `${item.observacionesOperario ? item.observacionesOperario + ' | ' : ''}[FINALIZADO]: Orden finalizada y liberada por ${auditorName}`
        };
      }
      return item;
    }));

    // Depuración en tiempo real de la página ALERTAS de Google Sheets
    removeOpFromAlertasSheet(opNumber);
    updateLocalOpStatus(solicitud.id, 'FINALIZADO', 'CALIDAD PLANTA STF', `Orden finalizada y liberada por ${auditorName}`, 'APROBADO');
    if (opNumber) {
      updateLocalOpStatus(opNumber, 'FINALIZADO', 'CALIDAD PLANTA STF', `Orden finalizada y liberada por ${auditorName}`, 'APROBADO');
    }

    notificationService.playAlertSound('EXITO');
    setConfirmFinalizarOp(null);

    // Sincronización en vivo hacia Google Sheets (Página BASE_DE_DATOS)
    if (opNumber) {
      try {
        await pushDictamenToSheets(opNumber, 'APROBADO', auditorName, 'Finalizado automático desde tarjeta de OP');
      } catch (err) {
        console.error("Error sincronizando dictamen final a Sheets:", err);
      }
    }
  };

  const handleRestoreOp = (restoredSol: SolicitudColcha) => {
    setSolicitudes(prev => [restoredSol, ...prev.filter(s => s.op.trim().toUpperCase() !== restoredSol.op.trim().toUpperCase())]);
    notificationService.playAlertSound('EXITO');
  };

  const handleLogin = (user: UsuarioSTF) => {
    setCurrentUser(user);
    localStorage.setItem('stf_colchas_user', JSON.stringify(user));
    cleanUserUrlParam();
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('stf_colchas_user');
    cleanUserUrlParam();
  };

  // 100% Dynamic KPI Calculations from the real Database rows
  const metrics: KpiMetrics = {
    totalHistorico: solicitudes.length,
    totalEnProceso: solicitudes.filter(s => s.estado !== 'FINALIZADO').length,
    preSolicitud: solicitudes.filter(s => s.estado === 'PRE_SOLICITUD').length,
    solicitados: solicitudes.filter(s => s.estado === 'SOLICITADO').length,
    lavanderia: solicitudes.filter(s => s.estado === 'LAVANDERIA').length,
    calidad: solicitudes.filter(s => s.estado === 'CALIDAD').length,
    finalizados: solicitudes.filter(s => s.estado === 'FINALIZADO').length
  };

  // New request submission
  const handleAddNewSolicitud = (nueva: SolicitudColcha) => {
    try {
      nueva.op = formatOpCode(nueva.op);
      if (currentUser) {
        nueva.inspector = currentUser.nombre;
      }
      // Desmarcar de historial de eliminadas
      unmarkOpAsDeleted(nueva.op);

      // Save to persistent storage so it survives sync and reloads
      saveLocalCreatedOp(nueva);
      const cleanTarget = nueva.op.replace(/\D/g, '') || nueva.op.trim().toUpperCase();
      setSolicitudes(prev => [nueva, ...prev.filter(s => (s.op.replace(/\D/g, '') || s.op.trim().toUpperCase()) !== cleanTarget)]);

      // Eliminar OP de la lista de Monitoreo en tiempo real (de 6 quedan 5)
      const cleanOpNumber = nueva.op.replace(/\D/g, '') || nueva.op.trim().toUpperCase();
      setMonitoreoList(prev => prev.filter(item => {
        const cleanItemOp = (item.op || '').replace(/\D/g, '') || (item.op || '').trim().toUpperCase();
        return cleanItemOp !== cleanOpNumber;
      }));
      markMonitoreoOpAsConsumed(nueva.op);
      deleteOrConsumeMonitoreoOpFromSheets(nueva.op).catch(() => {});

      // Sincronización en vivo hacia Google Sheets & Drive (Página BASE_DE_DATOS) en segundo plano
      pushSolicitudToSheets(nueva).catch(err => {
        console.warn('Error sincronizando nueva solicitud con Google Sheets:', err);
      });

      // Navegación inmediata a Bandeja, activación del filtro de etapa y apertura de etiqueta térmica
      setAiStageFilter(nueva.estado);
      setSelectedColchaPrinter(nueva);
      setActiveTab('solicitudes');

      // Alerta sonora de éxito
      notificationService.playAlertSound('EXITO');
    } catch (e) {
      console.error('Error en handleAddNewSolicitud:', e);
      setAiStageFilter(nueva.estado);
      setSelectedColchaPrinter(nueva);
      setActiveTab('solicitudes');
    }
  };

  // Transfer stage confirmation
  const handleConfirmTransfer = async (
    solicitudId: string,
    nuevoEstado: SectorType,
    nuevaObservacion: string,
    dictamen?: DictamenType,
    fotoCalidad?: string
  ) => {
    const targetItem = solicitudes.find(s => s.id === solicitudId);
    const opNumber = targetItem ? targetItem.op : '';

    setSolicitudes(prev => prev.map(item => {
      if (item.id === solicitudId) {
        const areaMap: Record<SectorType, string> = {
          PRE_SOLICITUD: 'CALIDAD 2F / ATELIER',
          SOLICITADO: 'TRÁNSITO / DESPACHO',
          LAVANDERIA: 'LAVANDERÍA COLFACTORY ZF',
          CALIDAD: 'CALIDAD STF LABORATORIO',
          FINALIZADO: 'CALIDAD PLANTA STF'
        };

        const updated = {
          ...item,
          estado: nuevoEstado,
          areaActual: areaMap[nuevoEstado],
          dictamen: nuevoEstado === 'FINALIZADO' ? (dictamen || item.dictamen || 'APROBADO') : item.dictamen,
          fotoCalidadUrl: fotoCalidad || item.fotoCalidadUrl,
          fechaActualizacion: new Date().toISOString()
        };

        if (nuevaObservacion) {
          updated.observacionesOperario = `${item.observacionesOperario ? item.observacionesOperario + ' | ' : ''}[${nuevoEstado}]: ${nuevaObservacion}`;
          if (nuevoEstado === 'FINALIZADO' || nuevoEstado === 'CALIDAD') {
            updated.observacionesCalidad = nuevaObservacion;
          }
        }

        const { diasHabiles, horasHabiles, tieneRetraso, esRetrasoCritico } = calculateWorkingDays(item.fechaCreacion);
        updated.diasHabiles = diasHabiles;
        updated.horasEnProceso = horasHabiles;
        updated.tieneRetraso = tieneRetraso;
        updated.esRetrasoCritico = esRetrasoCritico;

        return updated;
      }
      return item;
    }));

    const areaMap: Record<SectorType, string> = {
      PRE_SOLICITUD: 'CALIDAD 2F / ATELIER',
      SOLICITADO: 'TRÁNSITO / DESPACHO',
      LAVANDERIA: 'LAVANDERÍA COLFACTORY ZF',
      CALIDAD: 'CALIDAD STF LABORATORIO',
      FINALIZADO: 'CALIDAD PLANTA STF'
    };
    updateLocalOpStatus(solicitudId, nuevoEstado, areaMap[nuevoEstado], nuevaObservacion, dictamen);
    if (opNumber) {
      updateLocalOpStatus(opNumber, nuevoEstado, areaMap[nuevoEstado], nuevaObservacion, dictamen);
    }
    if (fotoCalidad) {
      updateLocalOpPhoto(solicitudId, fotoCalidad, true);
      if (opNumber) {
        updateLocalOpPhoto(opNumber, fotoCalidad, true);
      }
    }

    // Alertas sonoras y sincronización con Google Sheets
    if (nuevoEstado === 'FINALIZADO') {
      notificationService.playAlertSound('EXITO');
      if (opNumber) {
        removeOpFromAlertasSheet(opNumber);
      }
      if (opNumber && dictamen) {
        const localOps = getLocalCreatedOps();
        const localMatch = localOps.find(l => l.id === solicitudId || l.op.replace(/\D/g, '') === opNumber.replace(/\D/g, ''));
        const photoToSend = fotoCalidad || targetItem?.fotoCalidadUrl || localMatch?.fotoCalidadUrl;
        await pushDictamenToSheets(opNumber, dictamen, currentUser?.nombre || 'AUDITOR STF', nuevaObservacion, photoToSend);
      }
    } else {
      notificationService.playAlertSound('TRANSFERENCIA');
      if (opNumber) {
        await pushTransferToSheets(opNumber, nuevoEstado, currentUser?.nombre || 'OPERARIO STF', nuevaObservacion);
      }
    }
  };

  // Update photo handler
  const handleUpdateOpPhoto = async (solicitudId: string, photoUrl: string, isCalidad?: boolean) => {
    let targetOpNumber = '';
    setSolicitudes(prev => prev.map(item => {
      if (item.id === solicitudId) {
        targetOpNumber = item.op;
        const updated = isCalidad
          ? { ...item, fotoCalidadUrl: photoUrl }
          : { ...item, fotoMuestraUrl: photoUrl };
        if (selectedColchaDetail && selectedColchaDetail.id === solicitudId) {
          setSelectedColchaDetail(updated);
        }
        return updated;
      }
      return item;
    }));

    if (targetOpNumber) {
      await pushOpPhotoToSheets(targetOpNumber, photoUrl, isCalidad);
    }
  };

  // SI ACCEDE POR CÓDIGO QR PÚBLICO -> MOSTRAR VISTA DE TRAZABILIDAD SIN LOGIN
  if (publicOpNumber) {
    return (
      <PublicOpView
        opNumber={publicOpNumber}
        solicitudes={solicitudes}
        isSyncing={isSyncing}
        onRefreshData={() => loadAllLiveData(false)}
        onGoToLogin={() => {
          setPublicOpNumber(null);
          const url = new URL(window.location.href);
          url.searchParams.delete('view');
          window.history.replaceState({}, '', url.toString());
        }}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(prev => !prev)}
      />
    );
  }

  // IF NOT AUTHENTICATED -> SHOW LOGIN SCREEN
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLogin} />;
  }

  return (
    <div className={`min-h-screen transition-colors duration-200 ${isDarkMode ? 'dark bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'}`}>
      
      {/* 1. Header with Centered Brand Logo, User Badge, Theme, Exit & Back Buttons */}
      <Header
        currentUser={currentUser}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        onOpenChat={() => setIsChatOpen(true)}
        onLogout={handleLogout}
        showBackButton={activeTab !== 'dashboard'}
        onBackToDashboard={() => setActiveTab('dashboard')}
        onOpenProfileDirectory={() => setIsProfileDirectoryOpen(true)}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6">
        
        {/* VIEW 1: CLEAN LANDING DASHBOARD */}
        {activeTab === 'dashboard' && (
          <CleanLandingView
            metrics={metrics}
            solicitudes={solicitudes}
            currentUser={currentUser}
            onNavigate={(tab) => setActiveTab(tab)}
            onSelectArea={(areaKey) => setSelectedAreaForModal(areaKey)}
            onOpenChat={() => setIsChatOpen(true)}
          />
        )}

        {/* VIEW 2: NUEVA SOLICITUD */}
        {activeTab === 'nueva-solicitud' && (
          <div className="animate-in fade-in duration-200">
            <SolicitudForm
              monitoreoList={monitoreoList}
              currentUser={currentUser}
              onCancel={() => setActiveTab('dashboard')}
              onSubmit={handleAddNewSolicitud}
              onRefreshMonitoreo={() => loadAllLiveData(false)}
              isSyncing={isSyncing}
            />
          </div>
        )}

        {/* VIEW 3: BANDEJA DE SOLICITUDES */}
        {activeTab === 'solicitudes' && (
          <BandejaView
            solicitudes={solicitudes}
            metrics={metrics}
            currentUser={currentUser}
            initialStageFilter={aiStageFilter}
            initialSearchQuery={aiSearchQuery}
            onTransfer={(item) => setSelectedColchaTransfer(item)}
            onDirectTransfer={handleConfirmTransfer}
            onViewDetail={(item) => setSelectedColchaDetail(item)}
            onPrint={(item) => setSelectedColchaPrinter(item)}
            onDelete={handleDeleteOp}
            onFinalizar={handleFinalizarOp}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {/* VIEW 4: BASE DE DATOS MAESTRA */}
        {activeTab === 'base-datos' && (
          <MasterTable
            solicitudes={solicitudes}
            currentUser={currentUser}
            onSync={loadAllLiveData}
            isSyncing={isSyncing}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onViewDetail={(item) => setSelectedColchaDetail(item)}
            onPrint={(item) => setSelectedColchaPrinter(item)}
            onTransfer={(item) => setSelectedColchaTransfer(item)}
            onFinalizarOp={handleFinalizarOp}
            onDeleteOp={handleDeleteOp}
            onOpRestored={handleRestoreOp}
          />
        )}

        {/* VIEW 5: ALERTAS Y SLA */}
        {activeTab === 'alertas' && (
          <SlaAlertsList
            solicitudes={solicitudes}
            currentUser={currentUser}
            onViewDetail={(item) => setSelectedColchaDetail(item)}
            onFinalizarOp={handleFinalizarOp}
            onDeleteOp={handleDeleteOp}
            onOpenUserDirectory={() => setIsProfileDirectoryOpen(true)}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onSyncWithSheets={() => loadAllLiveData(false)}
          />
        )}

        {/* VIEW 6: LÍNEA DE TIEMPO (TIMELINE AUDIT) */}
        {activeTab === 'timeline' && (
          <TimelineView
            solicitudes={solicitudes}
            metrics={metrics}
            onViewDetail={(item) => setSelectedColchaDetail(item)}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {/* VIEW 7: ESTADÍSTICAS (MÉTRICAS, MESES, APROBACIÓN & RECHAZADOS) */}
        {activeTab === 'estadisticas' && (
          <EstadisticasView
            solicitudes={solicitudes}
            metrics={metrics}
            currentUser={currentUser}
            initialSectionTab={aiStatSection}
            initialReporteComiteOpen={isReporteComiteForAi}
            onNavigateTab={(tab) => {
              setActiveTab(tab);
              setIsReporteComiteForAi(false);
            }}
            onViewDetail={(item) => setSelectedColchaDetail(item)}
            onSyncSheets={() => loadAllLiveData(false)}
            isSyncing={isSyncing}
          />
        )}

      </main>

      {/* AREA OPs POPUP MODAL */}
      <AreaOpsModal
        areaKey={selectedAreaForModal}
        solicitudes={solicitudes}
        onClose={() => setSelectedAreaForModal(null)}
        onViewDetail={(colcha) => {
          setSelectedAreaForModal(null);
          setSelectedColchaDetail(colcha);
        }}
        onTransfer={(colcha) => {
          setSelectedAreaForModal(null);
          setSelectedColchaTransfer(colcha);
        }}
      />

      {/* THERMAL PRINTER LABEL MODAL (100MM X 100MM) */}
      <ThermalPrinterModal
        colcha={selectedColchaPrinter}
        onClose={() => setSelectedColchaPrinter(null)}
      />

      {/* TRANSFER MODAL */}
      <TransferModal
        solicitud={selectedColchaTransfer}
        onClose={() => setSelectedColchaTransfer(null)}
        onConfirmTransfer={handleConfirmTransfer}
      />

      {/* DETAIL MODAL WITH DIRECT PHOTO ATTACHMENT */}
      <OpDetailModal
        solicitud={selectedColchaDetail}
        onClose={() => setSelectedColchaDetail(null)}
        onOpenPrintModal={(item) => setSelectedColchaPrinter(item)}
        onUpdatePhoto={handleUpdateOpPhoto}
      />

      {/* CHAT STF TEAMS MODAL */}
      <ChatTeamsModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        currentUser={currentUser}
        solicitudes={solicitudes}
        onViewOpDetail={(colcha) => setSelectedColchaDetail(colcha)}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(prev => !prev)}
      />

      {/* USER PROFILES DIRECTORY MODAL */}
      <UserProfileModal
        isOpen={isProfileDirectoryOpen}
        currentUser={currentUser}
        onClose={() => setIsProfileDirectoryOpen(false)}
        onSelectUser={handleLogin}
      />

      {/* FLOATING IN-APP CHAT TOAST BANNER */}
      {inAppToast && (
        <div 
          onClick={() => {
            setIsChatOpen(true);
            setInAppToast(null);
          }}
          className="fixed top-5 right-5 z-[9999] max-w-sm w-[92vw] sm:w-full bg-[#0c1017] dark:bg-white border-2 border-emerald-500 rounded-3xl p-4 shadow-2xl shadow-emerald-500/20 text-white dark:text-zinc-950 flex items-start gap-3.5 cursor-pointer animate-in slide-in-from-top-4 duration-300 hover:scale-105 transition-transform"
        >
          <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-black flex items-center justify-center font-black text-sm shrink-0 shadow-md">
            💬
          </div>
          <div className="flex-1 min-w-0 space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-400 dark:text-emerald-700 truncate">
                {inAppToast.sender} {inAppToast.room ? `(${inAppToast.room})` : ''}
              </span>
              <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800 dark:bg-zinc-200 px-1.5 py-0.2 rounded font-bold">
                Ahora
              </span>
            </div>
            <p className="text-xs text-zinc-300 dark:text-zinc-700 line-clamp-2">
              {inAppToast.message}
            </p>
            <span className="text-[9.5px] font-bold text-amber-400 dark:text-amber-600 block pt-1">
              👆 Toca para responder al instante
            </span>
          </div>
          <button 
            type="button" 
            onClick={(e) => {
              e.stopPropagation();
              setInAppToast(null);
            }}
            className="text-zinc-400 hover:text-white dark:hover:text-zinc-950 p-1 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* DELETE OP CONFIRMATION MODAL (EDWIN ADMINISTRADOR) */}
      {confirmDeleteOp && (
        <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in select-none">
          <div className="bg-[#0e090a] dark:bg-white border-2 border-rose-600 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-white dark:text-zinc-950 animate-in zoom-in-95">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-500 shrink-0 shadow-md">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black uppercase text-rose-400 dark:text-rose-700 font-mono">
                    ¿Eliminar OP-{confirmDeleteOp.op.replace(/^OP-+/i, '').trim()}?
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-black bg-rose-500 text-white uppercase">
                    ADMIN EDWIN
                  </span>
                </div>
                <p className="text-xs text-zinc-400 dark:text-zinc-600 font-mono mt-0.5">
                  Ref: {confirmDeleteOp.referencia} • {confirmDeleteOp.tela}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/90 dark:bg-zinc-100 border border-zinc-800 dark:border-zinc-200 text-xs text-zinc-300 dark:text-zinc-700 space-y-2 font-mono">
              <div className="flex items-center justify-between text-[11px] pb-1 border-b border-zinc-800 dark:border-zinc-300">
                <span>Fase actual:</span>
                <span className="font-black text-amber-400 dark:text-amber-600 uppercase">{confirmDeleteOp.estado.replace('_', ' ')}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] pb-1 border-b border-zinc-800 dark:border-zinc-300">
                <span>Metraje / Rollos:</span>
                <span className="font-bold">{confirmDeleteOp.rollos} Rollos ({confirmDeleteOp.rollos * 85} Mt)</span>
              </div>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 pt-1 leading-relaxed">
                ⚠️ Al eliminarla, esta orden saldrá de inmediato de la bandeja de trabajo activa y se archivará en el <strong>Historial de OPs Eliminadas</strong> (pestaña Base de Datos), donde Edwin podrá <strong>Recuperarla</strong> con un solo clic.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteOp(null)}
                className="px-4 py-2.5 rounded-2xl border border-zinc-700 dark:border-zinc-300 text-xs font-bold text-zinc-300 dark:text-zinc-700 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition cursor-pointer"
              >
                CANCELAR
              </button>
              <button
                type="button"
                onClick={() => executeDeleteOp(confirmDeleteOp)}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs font-mono uppercase flex items-center gap-2 transition cursor-pointer shadow-lg shadow-rose-600/30 active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>SÍ, ELIMINAR OP</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FINALIZAR OP CONFIRMATION MODAL */}
      {confirmFinalizarOp && (
        <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in select-none">
          <div className="bg-[#080f0c] dark:bg-white border-2 border-emerald-500 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-white dark:text-zinc-950 animate-in zoom-in-95">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-md">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black uppercase text-emerald-400 dark:text-emerald-700 font-mono">
                    ¿Finalizar OP-{confirmFinalizarOp.op}?
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-black bg-emerald-500 text-black uppercase">
                    LIBERACIÓN
                  </span>
                </div>
                <p className="text-xs text-zinc-400 dark:text-zinc-600 font-mono mt-0.5">
                  Ref: {confirmFinalizarOp.referencia} • {confirmFinalizarOp.tela}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/90 dark:bg-zinc-100 border border-zinc-800 dark:border-zinc-200 text-xs text-zinc-300 dark:text-zinc-700 space-y-2 font-mono">
              <div className="flex items-center justify-between text-[11px] pb-1 border-b border-zinc-800 dark:border-zinc-300">
                <span>Fase actual:</span>
                <span className="font-black text-amber-400 dark:text-amber-600 uppercase">{confirmFinalizarOp.estado.replace('_', ' ')}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] pb-1 border-b border-zinc-800 dark:border-zinc-300">
                <span>Destino:</span>
                <span className="font-black text-emerald-400 dark:text-emerald-600 uppercase">FINALIZADOS (LIBERADA / APROBADA)</span>
              </div>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 pt-1 leading-relaxed">
                ✅ Al finalizar, esta orden se marcará como <strong>LIBERADA / APROBADA</strong>, se trasladará a la sección de <strong>Finalizados</strong> y se actualizará automáticamente tanto en el sistema como en la base de datos de Google Sheets.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmFinalizarOp(null)}
                className="px-4 py-2.5 rounded-2xl border border-zinc-700 dark:border-zinc-300 text-xs font-bold text-zinc-300 dark:text-zinc-700 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition cursor-pointer"
              >
                CANCELAR
              </button>
              <button
                type="button"
                onClick={() => executeFinalizarOp(confirmFinalizarOp)}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-black text-xs font-mono uppercase flex items-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-500/30 active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>SÍ, FINALIZAR OP</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING DRAGGABLE AI VOICE ASSISTANT BUTTON */}
      <FloatingAiVoiceButton
        solicitudes={solicitudes}
        monitoreoList={monitoreoList}
        metrics={metrics}
        currentUser={currentUser}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
          setIsReporteComiteForAi(false);
        }}
        onSelectStage={(stage) => {
          setAiStageFilter(stage);
          setIsReporteComiteForAi(false);
          setActiveTab('solicitudes');
        }}
        onNavigateStatSection={(section) => {
          setAiStatSection(section);
          setIsReporteComiteForAi(false);
          setActiveTab('estadisticas');
        }}
        onToggleTheme={(theme) => {
          setIsDarkMode(theme === 'dark');
        }}
        onOpenOpDetail={(op) => setSelectedColchaDetail(op)}
        onOpenOpPrinter={(op) => setSelectedColchaPrinter(op)}
        onOpenChat={() => setIsChatOpen(true)}
        onOpenUserDirectory={() => setIsProfileDirectoryOpen(true)}
        onOpenReporteComite={() => {
          setIsReporteComiteForAi(true);
          setActiveTab('estadisticas');
        }}
        onOpenAdminParametros={() => {
          setIsReporteComiteForAi(false);
          setActiveTab('base-datos');
        }}
        onSearchOp={(query) => {
          setAiSearchQuery(query);
          setIsReporteComiteForAi(false);
          setActiveTab('solicitudes');
        }}
      />

    </div>
  );
}
export default App;
