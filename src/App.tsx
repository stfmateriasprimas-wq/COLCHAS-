import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Header } from './components/Header';
import { TabType } from './components/Navigation';
import { CleanLandingView } from './components/Dashboard/CleanLandingView';
import { AreaOpsModal } from './components/Dashboard/AreaOpsModal';
import { SolicitudForm } from './components/NuevaSolicitud/SolicitudForm';
import { BandejaView } from './components/Bandeja/BandejaView';
import { TransferModal } from './components/Bandeja/TransferModal';
import { OpDetailModal } from './components/Bandeja/OpDetailModal';
import { SlaAlertsList } from './components/Alertas/SlaAlertsList';
import { LoginScreen } from './components/Auth/LoginScreen';
import { UserProfileModal } from './components/Auth/UserProfileModal';
import { SplashScreen, stopIntroSoundImmediately, allowReplayIntroSound } from './components/Common/SplashScreen';
import { UsuarioSTF, syncUsuariosFromSheets, getUsuariosList, isSoporteUser } from './services/authService';
import { SolicitudColcha, MonitoreoItem, KpiMetrics, SectorType, DictamenType, ChatMessage } from './types';
import { chatService } from './services/chatService';
import { auditService } from './services/auditService';

// Carga perezosa (Lazy loading) de módulos pesados para inicio instantáneo en móvil
const ThermalPrinterModal = lazy(() => import('./components/NuevaSolicitud/ThermalPrinterModal').then(m => ({ default: m.ThermalPrinterModal })));
const PublicOpView = lazy(() => import('./components/Public/PublicOpView').then(m => ({ default: m.PublicOpView })));
const PublicAlertsView = lazy(() => import('./components/Public/PublicAlertsView').then(m => ({ default: m.PublicAlertsView })));
const MasterTable = lazy(() => import('./components/BaseDatos/MasterTable').then(m => ({ default: m.MasterTable })));
const TimelineView = lazy(() => import('./components/Timeline/TimelineView').then(m => ({ default: m.TimelineView })));
const EstadisticasView = lazy(() => import('./components/Estadisticas/EstadisticasView').then(m => ({ default: m.EstadisticasView })));
const WhatsAppChatView = lazy(() => import('./components/Chat/WhatsAppChatView').then(m => ({ default: m.WhatsAppChatView })));
const SoporteAuditoriaView = lazy(() => import('./components/Soporte/SoporteAuditoriaView').then(m => ({ default: m.SoporteAuditoriaView })));
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
  isMatchingOp,
  getCachedSolicitudes,
  saveCachedSolicitudes,
  getOpPhotosFromCache,
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
import { FuturisticFloatingChatButton } from './components/Chat/FuturisticFloatingChatButton';

export function App() {
  // Theme state persisted in localStorage
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem('stf_colchas_theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    return false; // Default claro
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
      if (op && (view === 'public' || (!params.get('user') && !localStorage.getItem('stf_colchas_user')))) {
        return op;
      }
    }
    return null;
  });

  // Public Alerts View State (Acceso público al reporte de retrasos SLA sin contraseña)
  const [isPublicAlertsView, setIsPublicAlertsView] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const view = params.get('view');
      const tab = params.get('tab');
      const op = params.get('op');
      if (view === 'alertas') return true;
      if (tab === 'alertas' && !op && !localStorage.getItem('stf_colchas_user')) {
        return true;
      }
    }
    return false;
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

  // Authentication State: Siempre inicia desde el apartado de Login al ingresar al sistema
  const [currentUser, setCurrentUser] = useState<UsuarioSTF | null>(null);

  // Animación Intro Cinemática con sonido al acceder o recargar el aplicativo
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      // Accesos directos por QR o vistas públicas no ejecutan splash
      if (params.get('op') || params.get('view')) return false;
    }
    return true;
  });

  const handleSplashFinish = () => {
    setShowSplash(false);
  };

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
  const [isProfileDirectoryOpen, setIsProfileDirectoryOpen] = useState(false);
  const [stageFilter, setStageFilter] = useState<SectorType | 'EN_PROCESO' | 'ALL' | undefined>(undefined);
  const [chatUnreadCount, setChatUnreadCount] = useState<number>(0);

  // Load from Sheets on mount, set up 15-second live polling & window focus auto-sync
  useEffect(() => {
    loadAllLiveData();
    const interval = setInterval(() => {
      loadAllLiveData(true);
    }, 15000);

    const handleWindowFocus = () => {
      loadAllLiveData(true);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleWindowFocus);
    }

    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleWindowFocus);
      }
    };
  }, []);

  // Sync latest live data whenever user switches work sections/tabs
  useEffect(() => {
    loadAllLiveData(true);
  }, [activeTab]);

  // Monitoreo en tiempo real de mensajes de chat no leídos (Insignia roja en Header)
  useEffect(() => {
    if (!currentUser) {
      setChatUnreadCount(0);
      return;
    }

    let currentAllMessages: ChatMessage[] = chatService.getCachedMessages();

    const refreshCount = (msgs?: ChatMessage[]) => {
      if (msgs) currentAllMessages = msgs;
      const total = chatService.getTotalUnreadCount(currentUser.id, currentAllMessages);
      setChatUnreadCount(total);
    };

    const unsub = chatService.subscribeToMessages('ALL_CHANNELS', currentUser.id, (all) => {
      refreshCount(all);
    });

    const handleReadUpdated = () => {
      refreshCount();
    };

    window.addEventListener('stf_chat_read_updated', handleReadUpdated);

    return () => {
      unsub();
      window.removeEventListener('stf_chat_read_updated', handleReadUpdated);
    };
  }, [currentUser, activeTab]);

  // Seguridad: Si no es usuario SOPORTE TEC. y está en la pestaña soporte-auditoria, redirigir a dashboard
  useEffect(() => {
    if (activeTab === 'soporte-auditoria' && !isSoporteUser(currentUser)) {
      setActiveTab('dashboard');
    }
  }, [activeTab, currentUser]);

  // Escuchar eventos globales de fotos resueltas desde Drive para actualizar el estado central
  useEffect(() => {
    const handlePhotosUpdated = (e: Event) => {
      const customEvent = e as CustomEvent;
      const detail = customEvent.detail;
      if (!detail || !detail.op) return;
      const cleanEventOp = (detail.op || '').replace(/\D/g, '') || String(detail.op).trim().toUpperCase();
      setSolicitudes(prev => prev.map(s => {
        const cleanSOp = s.op.replace(/\D/g, '') || s.op.trim().toUpperCase();
        if (cleanSOp === cleanEventOp || s.op === detail.op) {
          return {
            ...s,
            fotoMuestraUrl: detail.foto1 || s.fotoMuestraUrl,
            fotoCalidadUrl: detail.foto2 || s.fotoCalidadUrl,
            driveFolderUrl: detail.folderUrl || s.driveFolderUrl
          };
        }
        return s;
      }));
    };
    window.addEventListener('stf_op_photos_updated', handlePhotosUpdated);
    return () => {
      window.removeEventListener('stf_op_photos_updated', handlePhotosUpdated);
    };
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
    if (viewParam === 'alertas' || (tabParam === 'alertas' && !opParam && !localStorage.getItem('stf_colchas_user'))) {
      setIsPublicAlertsView(true);
    }

    // Limpiar residuos de sesión previa y parámetros para garantizar siempre inicio en Login
    try {
      localStorage.removeItem('stf_colchas_user');
      sessionStorage.removeItem('stf_colchas_user');
      sessionStorage.removeItem('stf_splash_shown');
      sessionStorage.removeItem('stf_intro_sound_played');
    } catch (e) {}
    cleanUserUrlParam();

    // 2. Initial direct tab navigation
    if (tabParam && ['dashboard', 'solicitudes', 'alertas', 'basedatos', 'estadisticas', 'chat'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

  // Open OP Detail Modal automatically if op param is specified in initial URL
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const opParam = urlParams.get('op');
    if (opParam && solicitudes.length > 0 && !hasProcessedUrlOpRef.current) {
      const match = solicitudes.find(s => isMatchingOp(s.op, opParam));
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

  const handleManualSync = async () => {
    await loadAllLiveData(false);
  };

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

        // Blindaje contra condición de carrera: asegurar que cualquier OP creada localmente nunca se pierda
        const localOps = getLocalCreatedOps().filter(loc => !isOpDeleted(loc.op));
        const mergedLive = [...activeOnly];
        localOps.forEach(loc => {
          const cleanLocOp = (loc.op || '').replace(/\D/g, '') || loc.op.trim().toUpperCase();
          const remoteIdx = mergedLive.findIndex(m => ((m.op || '').replace(/\D/g, '') || m.op.trim().toUpperCase()) === cleanLocOp);
          const cached = getOpPhotosFromCache(cleanLocOp) || getOpPhotosFromCache(loc.op);
          if (remoteIdx === -1) {
            mergedLive.unshift({
              ...loc,
              fotoMuestraUrl: loc.fotoMuestraUrl || cached?.foto1,
              fotoCalidadUrl: loc.fotoCalidadUrl || cached?.foto2,
              driveFolderUrl: loc.driveFolderUrl || cached?.folderUrl
            });
          } else {
            const remote = mergedLive[remoteIdx];
            mergedLive[remoteIdx] = {
              ...remote,
              fotoMuestraUrl: loc.fotoMuestraUrl || remote.fotoMuestraUrl || cached?.foto1,
              fotoCalidadUrl: loc.fotoCalidadUrl || remote.fotoCalidadUrl || cached?.foto2,
              driveFolderUrl: loc.driveFolderUrl || remote.driveFolderUrl || cached?.folderUrl,
              observacionesCalidad: loc.observacionesCalidad || remote.observacionesCalidad
            };
          }
        });

        setSolicitudes(mergedLive);
        saveCachedSolicitudes(mergedLive);

        // Sincronización automática de alertas activas hacia la página ALERTAS de Google Sheets
        const delayedOps = mergedLive.filter(s => s.tieneRetraso && s.estado !== 'FINALIZADO');
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
    
    // Registro forense para SOPORTE TEC.
    auditService.logAction(
      currentUser || { id: 'admin', nombre: adminName, rol: 'ADMINISTRADOR', area: 'CALIDAD', email: '' },
      'ELIMINACION_OP',
      `Eliminación manual de orden ${solicitud.op}`,
      solicitud.op,
      {
        tela: solicitud.tela,
        lote: solicitud.lote,
        estado: solicitud.estado,
        inspector: solicitud.inspector
      }
    );
    
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
          observacionesCalidad: `Orden finalizada y liberada por ${auditorName}`
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

    // Registro forense para SOPORTE TEC.
    auditService.logAction(
      currentUser || { id: 'auditor', nombre: auditorName, rol: 'ADMINISTRADOR', area: 'CALIDAD', email: '' },
      'DICTAMEN_CALIDAD',
      `Finalización y liberación inmediata de colcha ${opNumber} con veredicto APROBADO`,
      opNumber,
      { dictamen: 'APROBADO', auditor: auditorName }
    );

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

    // Registro forense para SOPORTE TEC.
    auditService.logAction(
      currentUser || { id: 'admin', nombre: 'ADMINISTRADOR', rol: 'ADMINISTRADOR', area: 'CALIDAD', email: '' },
      'RESTAURACION_OP',
      `Restauración de orden previamente eliminada ${restoredSol.op}`,
      restoredSol.op,
      { tela: restoredSol.tela, lote: restoredSol.lote, estado: restoredSol.estado }
    );
  };

  const handleLogin = (user: UsuarioSTF) => {
    stopIntroSoundImmediately();
    setShowSplash(false);
    setCurrentUser(user);
    cleanUserUrlParam();
  };

  const handleLogout = () => {
    setCurrentUser(null);
    if (activeTab === 'soporte-auditoria') {
      setActiveTab('dashboard');
    }
    try {
      localStorage.removeItem('stf_colchas_user');
      sessionStorage.removeItem('stf_colchas_user');
    } catch (e) {}
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

      // Registro en auditoría forense para SOPORTE TEC.
      const auditUser: UsuarioSTF = currentUser || {
        id: 'operario',
        nombre: nueva.inspector || 'OPERARIO',
        rol: 'OPERARIO',
        area: nueva.estado === 'PRE_SOLICITUD' ? 'CALIDAD ZF' : 'CALIDAD',
        email: ''
      };
      auditService.logAction(
        auditUser,
        'CREACION_OP',
        `Creación y registro de orden ${nueva.op}`,
        nueva.op,
        {
          tela: nueva.tela,
          lote: nueva.lote,
          estadoInicial: nueva.estado,
          inspector: nueva.inspector,
          area: nueva.areaActual,
          observacion: nueva.observacionesLavanderia || ''
        }
      );

      // Save to persistent storage so it survives sync and reloads
      saveLocalCreatedOp(nueva);
      const cleanTarget = nueva.op.replace(/\D/g, '') || nueva.op.trim().toUpperCase();
      setSolicitudes(prev => {
        const nextList = [nueva, ...prev.filter(s => (s.op.replace(/\D/g, '') || s.op.trim().toUpperCase()) !== cleanTarget)];
        saveCachedSolicitudes(nextList);
        return nextList;
      });

      // Eliminar OP de la lista de Monitoreo en tiempo real (de 6 quedan 5)
      const cleanOpNumber = nueva.op.replace(/\D/g, '') || nueva.op.trim().toUpperCase();
      setMonitoreoList(prev => prev.filter(item => {
        const cleanItemOp = (item.op || '').replace(/\D/g, '') || (item.op || '').trim().toUpperCase();
        return cleanItemOp !== cleanOpNumber;
      }));
      markMonitoreoOpAsConsumed(nueva.op);
      deleteOrConsumeMonitoreoOpFromSheets(nueva.op).catch(() => {});

      // Sincronización en vivo hacia Google Sheets & Drive (Página BASE_DE_DATOS) en segundo plano
      pushSolicitudToSheets(nueva).then(res => {
        if (res && res.driveUrl) {
          updateLocalOpPhoto(nueva.op, res.driveUrl, false);
          setSolicitudes(prev => prev.map(s => {
            if ((s.op.replace(/\D/g, '') || s.op.trim().toUpperCase()) === cleanTarget) {
              return { ...s, fotoMuestraUrl: res.driveUrl };
            }
            return s;
          }));
        }
      }).catch(err => {
        console.warn('Error sincronizando nueva solicitud con Google Sheets:', err);
      });

      // Navegación inmediata a Bandeja, activación del filtro de etapa y apertura de etiqueta térmica
      setStageFilter(nueva.estado);
      setSelectedColchaPrinter(nueva);
      setActiveTab('solicitudes');

      // Alerta sonora de éxito
      notificationService.playAlertSound('EXITO');
    } catch (e) {
      console.error('Error en handleAddNewSolicitud:', e);
      setStageFilter(nueva.estado);
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

    // Registro en auditoría forense para SOPORTE TEC.
    auditService.logAction(
      currentUser || { id: 'operario', nombre: 'OPERARIO STF', rol: 'OPERARIO', area: 'CALIDAD', email: '' },
      nuevoEstado === 'FINALIZADO' ? 'DICTAMEN_CALIDAD' : 'TRANSFERENCIA',
      nuevoEstado === 'FINALIZADO' 
        ? `Finalización y liberación de OP con veredicto ${dictamen || 'APROBADO'}`
        : `Transferencia de etapa: ${targetItem?.estado || 'INICIAL'} ➔ ${nuevoEstado}`,
      opNumber,
      {
        estadoAnterior: targetItem?.estado,
        estadoNuevo: nuevoEstado,
        observacion: nuevaObservacion,
        dictamen: dictamen,
        tieneFotoCalidad: !!fotoCalidad
      }
    );

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
          if (item.estado === 'LAVANDERIA' || nuevoEstado === 'LAVANDERIA') {
            updated.observacionesLavanderia = nuevaObservacion;
          } else if (nuevoEstado === 'FINALIZADO' || nuevoEstado === 'CALIDAD') {
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
        const colObsToSend = targetItem?.observacionesLavanderia || localMatch?.observacionesLavanderia || '';
        const dictRes = await pushDictamenToSheets(opNumber, dictamen, currentUser?.nombre || 'AUDITOR STF', nuevaObservacion, photoToSend, colObsToSend);
        if (dictRes && dictRes.driveUrl) {
          updateLocalOpPhoto(opNumber, dictRes.driveUrl, true);
          setSolicitudes(prev => prev.map(s => {
            if (s.id === solicitudId || (s.op.replace(/\D/g, '') || s.op.trim().toUpperCase()) === (opNumber.replace(/\D/g, '') || opNumber.trim().toUpperCase())) {
              return { ...s, fotoCalidadUrl: dictRes.driveUrl };
            }
            return s;
          }));
        }
      }

      // Automatización: Abrir de inmediato el modal de impresión de la etiqueta final (Fase 2 / Finalizado)
      const finalizedItem = solicitudes.find(s => s.id === solicitudId) || targetItem;
      if (finalizedItem) {
        const finalizedColcha: SolicitudColcha = {
          ...finalizedItem,
          estado: 'FINALIZADO',
          dictamen: dictamen || finalizedItem.dictamen || 'APROBADO',
          observacionesCalidad: nuevaObservacion || finalizedItem.observacionesCalidad || '',
          fotoCalidadUrl: fotoCalidad || finalizedItem.fotoCalidadUrl,
          areaActual: 'CALIDAD PLANTA STF'
        };
        setSelectedColchaPrinter(finalizedColcha);
      }
    } else {
      notificationService.playAlertSound('TRANSFERENCIA');
      if (opNumber) {
        const isFromLav = targetItem?.estado === 'LAVANDERIA';
        const isToLav = nuevoEstado === 'LAVANDERIA';
        const colObs = (isFromLav || isToLav) ? nuevaObservacion : targetItem?.observacionesLavanderia;
        await pushTransferToSheets(
          opNumber, 
          nuevoEstado, 
          currentUser?.nombre || 'OPERARIO STF', 
          nuevaObservacion,
          targetItem?.estado,
          colObs
        );
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
      // Registro en auditoría forense para SOPORTE TEC.
      auditService.logAction(
        currentUser || { id: 'operario', nombre: 'OPERARIO STF', rol: 'OPERARIO', area: 'CALIDAD', email: '' },
        'ACTUALIZACION_FOTO',
        `Carga/actualización de ${isCalidad ? 'Foto Calidad (Post-Lavado)' : 'Foto Muestra Inicial'}`,
        targetOpNumber,
        { tipoFoto: isCalidad ? 'CALIDAD' : 'MUESTRA' }
      );
      await pushOpPhotoToSheets(targetOpNumber, photoUrl, isCalidad);
    }
  };

  // COMPONENTE DE CARGA RÁPIDA (FALLBACK DE SUSPENSE)
  const ViewLoadingFallback = (
    <div className="flex flex-col items-center justify-center min-h-[50vh] py-16">
      <div className="w-9 h-9 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
      <span className="text-xs font-mono text-zinc-400">Cargando vista...</span>
    </div>
  );

  // SI ACCEDE A LA VISTA PÚBLICA DE ALERTAS SLA -> MOSTRAR VISTA SIN LOGIN
  if (isPublicAlertsView) {
    if (publicOpNumber) {
      return (
        <Suspense fallback={ViewLoadingFallback}>
          <PublicOpView
            opNumber={publicOpNumber}
            solicitudes={solicitudes}
            isSyncing={isSyncing}
            onRefreshData={() => loadAllLiveData(false)}
            onGoToLogin={() => {
              setPublicOpNumber(null);
              setIsPublicAlertsView(false);
              const url = new URL(window.location.href);
              url.searchParams.delete('view');
              url.searchParams.delete('tab');
              url.searchParams.delete('op');
              window.history.replaceState({}, '', url.pathname);
            }}
            isDarkMode={isDarkMode}
            onToggleTheme={() => setIsDarkMode(prev => !prev)}
            onBackToAlerts={() => setPublicOpNumber(null)}
          />
        </Suspense>
      );
    }

    return (
      <Suspense fallback={ViewLoadingFallback}>
        <PublicAlertsView
          solicitudes={solicitudes}
          isSyncing={isSyncing}
          onRefreshData={() => loadAllLiveData(false)}
          onSelectOp={(op) => setPublicOpNumber(op)}
          onGoToLogin={() => {
            setIsPublicAlertsView(false);
            setPublicOpNumber(null);
            const url = new URL(window.location.href);
            url.searchParams.delete('view');
            url.searchParams.delete('tab');
            window.history.replaceState({}, '', url.pathname);
          }}
          isDarkMode={isDarkMode}
          onToggleTheme={() => setIsDarkMode(prev => !prev)}
        />
      </Suspense>
    );
  }

  // SI ACCEDE POR CÓDIGO QR PÚBLICO A UNA OP ESPECÍFICA -> MOSTRAR VISTA DE TRAZABILIDAD SIN LOGIN
  if (publicOpNumber) {
    return (
      <Suspense fallback={ViewLoadingFallback}>
        <PublicOpView
          opNumber={publicOpNumber}
          solicitudes={solicitudes}
          isSyncing={isSyncing}
          onRefreshData={() => loadAllLiveData(false)}
          onGoToLogin={() => {
            setPublicOpNumber(null);
            const url = new URL(window.location.href);
            url.searchParams.delete('view');
            url.searchParams.delete('op');
            window.history.replaceState({}, '', url.pathname);
          }}
          isDarkMode={isDarkMode}
          onToggleTheme={() => setIsDarkMode(prev => !prev)}
        />
      </Suspense>
    );
  }

  // ANIMACIÓN INTRO CINEMATOGRÁFICA CON SONIDO (SOLO 1 VEZ POR APERTURA DEL SISTEMA, MÁXIMO 4 SEGUNDOS)
  if (showSplash && !publicOpNumber && !isPublicAlertsView) {
    return <SplashScreen onFinish={handleSplashFinish} durationMs={4000} />;
  }

  // IF NOT AUTHENTICATED -> SHOW LOGIN SCREEN
  if (!currentUser) {
    return (
      <LoginScreen 
        onLoginSuccess={handleLogin} 
        onReplayIntro={() => {
          allowReplayIntroSound();
          setShowSplash(true);
        }}
      />
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-200 ${isDarkMode ? 'dark bg-[#06080c] text-zinc-100' : 'bg-[#f4f5f7] text-zinc-900'}`}>
      
      {/* 1. Header with Centered Brand Logo, User Badge, Theme, Exit & Back Buttons */}
      <Header
        currentUser={currentUser}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        onLogout={handleLogout}
        showBackButton={activeTab !== 'dashboard'}
        onBackToDashboard={() => setActiveTab('dashboard')}
        onOpenProfileDirectory={() => setIsProfileDirectoryOpen(true)}
        onOpenChat={() => setActiveTab('chat')}
        onOpenAuditoria={() => setActiveTab('soporte-auditoria')}
        chatUnreadCount={chatUnreadCount}
        isSyncing={isSyncing}
        onManualSync={handleManualSync}
        totalOpsCount={solicitudes.length}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto p-2.5 sm:p-6 space-y-4 sm:space-y-6">
        
        {/* VIEW 1: CLEAN LANDING DASHBOARD */}
        {activeTab === 'dashboard' && (
          <CleanLandingView
            metrics={metrics}
            solicitudes={solicitudes}
            currentUser={currentUser}
            onNavigate={(tab) => setActiveTab(tab)}
            onSelectArea={(areaKey) => setSelectedAreaForModal(areaKey)}
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
            initialStageFilter={stageFilter}
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
          <Suspense fallback={ViewLoadingFallback}>
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
          </Suspense>
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
          <Suspense fallback={ViewLoadingFallback}>
            <TimelineView
              solicitudes={solicitudes}
              metrics={metrics}
              onViewDetail={(item) => setSelectedColchaDetail(item)}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          </Suspense>
        )}

        {/* VIEW 7: ESTADÍSTICAS (MÉTRICAS, MESES, APROBACIÓN & RECHAZADOS) */}
        {activeTab === 'estadisticas' && (
          <Suspense fallback={ViewLoadingFallback}>
            <EstadisticasView
              solicitudes={solicitudes}
              metrics={metrics}
              currentUser={currentUser}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onViewDetail={(item) => setSelectedColchaDetail(item)}
              onSyncSheets={() => loadAllLiveData(false)}
              isSyncing={isSyncing}
            />
          </Suspense>
        )}

        {/* VIEW 8: CHAT CORPORATIVO EN TIEMPO REAL (ESTILO WHATSAPP) */}
        {activeTab === 'chat' && (
          <div className="animate-in fade-in duration-200">
            <Suspense fallback={ViewLoadingFallback}>
              <WhatsAppChatView
                currentUser={currentUser}
                solicitudes={solicitudes}
                isDarkMode={isDarkMode}
                onViewOpDetail={(opCode) => {
                  const match = solicitudes.find(s => isMatchingOp(s.op, opCode));
                  if (match) setSelectedColchaDetail(match);
                }}
                onPrintOp={(opCode) => {
                  const match = solicitudes.find(s => isMatchingOp(s.op, opCode));
                  if (match) setSelectedColchaPrinter(match);
                }}
              />
            </Suspense>
          </div>
        )}

        {/* VIEW 9: AUDITORÍA & HISTORIAL INTELIGENTE EN TIEMPO REAL (EXCLUSIVO PERFIL SOPORTE TÉCNICO) */}
        {activeTab === 'soporte-auditoria' && isSoporteUser(currentUser) && (
          <div className="animate-in fade-in duration-200">
            <Suspense fallback={ViewLoadingFallback}>
              <SoporteAuditoriaView
                currentUser={currentUser}
                solicitudes={solicitudes}
                kpiMetrics={metrics}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onViewOpDetail={(item) => setSelectedColchaDetail(item)}
                isDarkMode={isDarkMode}
              />
            </Suspense>
          </div>
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
      {selectedColchaPrinter && (
        <Suspense fallback={null}>
          <ThermalPrinterModal
            colcha={selectedColchaPrinter}
            onClose={() => setSelectedColchaPrinter(null)}
          />
        </Suspense>
      )}

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

      {/* USER PROFILES DIRECTORY MODAL */}
      <UserProfileModal
        isOpen={isProfileDirectoryOpen}
        currentUser={currentUser}
        onClose={() => setIsProfileDirectoryOpen(false)}
        onSelectUser={handleLogin}
      />

      {/* DELETE OP CONFIRMATION MODAL (EDWIN ADMINISTRADOR) */}
      {confirmDeleteOp && (
        <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in select-none">
          <div className="bg-white dark:bg-[#0e090a] border-2 border-rose-600 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-zinc-950 dark:text-white animate-in zoom-in-95">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-500 shrink-0 shadow-md">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black uppercase text-rose-600 dark:text-rose-400 font-mono">
                    ¿Eliminar OP-{confirmDeleteOp.op.replace(/^OP-+/i, '').trim()}?
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-black bg-rose-500 text-white uppercase">
                    ADMIN EDWIN
                  </span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 font-mono mt-0.5">
                  Ref: {confirmDeleteOp.referencia} • {confirmDeleteOp.tela}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 space-y-2 font-mono">
              <div className="flex items-center justify-between text-[11px] pb-1 border-b border-zinc-200 dark:border-zinc-800">
                <span>Fase actual:</span>
                <span className="font-black text-amber-600 dark:text-amber-400 uppercase">{confirmDeleteOp.estado.replace('_', ' ')}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] pb-1 border-b border-zinc-200 dark:border-zinc-800">
                <span>Metraje / Rollos:</span>
                <span className="font-bold">{confirmDeleteOp.rollos} Rollos ({confirmDeleteOp.rollos * 85} Mt)</span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 pt-1 leading-relaxed">
                ⚠️ Al eliminarla, esta orden saldrá de inmediato de la bandeja de trabajo activa y se archivará en el <strong>Historial de OPs Eliminadas</strong> (pestaña Base de Datos), donde Edwin podrá <strong>Recuperarla</strong> con un solo clic.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteOp(null)}
                className="px-4 py-2.5 rounded-2xl border border-zinc-300 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
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
          <div className="bg-white dark:bg-[#080f0c] border-2 border-emerald-500 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-zinc-950 dark:text-white animate-in zoom-in-95">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 shadow-md">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black uppercase text-emerald-600 dark:text-emerald-400 font-mono">
                    ¿Finalizar OP-{confirmFinalizarOp.op}?
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-black bg-emerald-500 text-black uppercase">
                    LIBERACIÓN
                  </span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 font-mono mt-0.5">
                  Ref: {confirmFinalizarOp.referencia} • {confirmFinalizarOp.tela}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 space-y-2 font-mono">
              <div className="flex items-center justify-between text-[11px] pb-1 border-b border-zinc-200 dark:border-zinc-800">
                <span>Fase actual:</span>
                <span className="font-black text-amber-600 dark:text-amber-400 uppercase">{confirmFinalizarOp.estado.replace('_', ' ')}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] pb-1 border-b border-zinc-200 dark:border-zinc-800">
                <span>Destino:</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 uppercase">FINALIZADOS (LIBERADA / APROBADA)</span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 pt-1 leading-relaxed">
                ✅ Al finalizar, esta orden se marcará como <strong>LIBERADA / APROBADA</strong>, se trasladará a la sección de <strong>Finalizados</strong> y se actualizará automáticamente tanto en el sistema como en la base de datos de Google Sheets.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmFinalizarOp(null)}
                className="px-4 py-2.5 rounded-2xl border border-zinc-300 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
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
      {/* 8. BOTÓN FLOTANTE FUTURISTA VERTICAL Y ARRASTRABLE (DRAGGABLE CON MARGEN DE 5MM, DUAL WEB & MÓVIL) */}
      {currentUser && activeTab !== 'chat' && (
        <FuturisticFloatingChatButton
          onClick={() => setActiveTab('chat')}
          title="Abrir Chat Corporativo STF"
          unreadCount={chatUnreadCount}
        />
      )}

    </div>
  );
}
export default App;
