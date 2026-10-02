import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, Camera, QrCode, RefreshCw, CheckCircle2, ArrowRight, 
  Droplets, Eye, AlertCircle, Shirt, 
  Upload, Zap, ZapOff, RotateCcw, Search, Keyboard, ZoomIn, ZoomOut
} from 'lucide-react';
import { BrowserQRCodeReader, DecodeHintType, BarcodeFormat } from '@zxing/library';
import jsQR from 'jsqr';
import { SolicitudColcha, SectorType, DictamenType } from '../../types';
import { UsuarioSTF, isLavanderiaUser, isFactoryUser, isEdiazUser, isAdminUser } from '../../services/authService';
import { parsePublicTrackingPayload } from '../../services/qrTrackingService';
import { formatOpCode, isMatchingOp, getLocalCreatedOps, saveLocalCreatedOp, fetchBaseDeDatosSheet } from '../../services/googleSheetsService';
import { notificationService } from '../../services/notificationService';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  solicitudes: SolicitudColcha[];
  currentUser?: UsuarioSTF | null;
  onDirectTransfer?: (solicitudId: string, nuevoEstado: SectorType, observacion: string, dictamen?: DictamenType, fotoCalidad?: string) => void;
  onFinalizar?: (solicitud: SolicitudColcha) => void;
  onViewDetail?: (solicitud: SolicitudColcha) => void;
  onLocateInBandeja?: (solicitud: SolicitudColcha) => void;
  onOpenEditarFinalizada?: (solicitud: SolicitudColcha) => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  solicitudes,
  currentUser,
  onDirectTransfer,
  onFinalizar,
  onViewDetail,
  onLocateInBandeja,
  onOpenEditarFinalizada
}) => {
  // Estados de cámara y escaneo
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [zoomSupported, setZoomSupported] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isScanning, setIsScanning] = useState(true);
  const [isSearchingLive, setIsSearchingLive] = useState(false);

  // Estados de resultado
  const [scannedOpCode, setScannedOpCode] = useState<string | null>(null);
  const [matchedSolicitud, setMatchedSolicitud] = useState<SolicitudColcha | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Modo de ingreso manual alternativo (por si la etiqueta física está rota o manchada)
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualOpText, setManualOpText] = useState('');

  // Referencias a elementos DOM y control de ciclo
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isProcessingFrameRef = useRef<boolean>(false);
  const scanCycleCountRef = useRef<number>(0);
  const isDetectedRef = useRef<boolean>(false);

  // Lector industrial ZXing BrowserQRCodeReader
  const zxingReaderRef = useRef<BrowserQRCodeReader | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const barcodeDetectorRef = useRef<any>(null);

  // Inicializar motores de lectura
  useEffect(() => {
    // 1. ZXing con hints de máxima agresividad (TRY_HARDER) para leer etiquetas térmicas con logotipo central
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    hints.set(DecodeHintType.CHARACTER_SET, 'UTF-8');
    const zxing = new BrowserQRCodeReader(120);
    zxing.hints = hints;
    zxingReaderRef.current = zxing;

    // 2. BarcodeDetector nativo si está disponible (Android Chrome / macOS)
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        barcodeDetectorRef.current = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      } catch {
        barcodeDetectorRef.current = null;
      }
    }

    return () => {
      try {
        zxing.reset();
      } catch {
        // Ignorar
      }
    };
  }, []);

  // Reproducir sonido beep y vibración al detectar QR con éxito
  const triggerScanFeedback = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1046.5, ctx.currentTime); // C6 nota nítida
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      }
    } catch {
      // Ignorar si el audio no está disponible
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([60, 40, 60]);
      } catch {
        // Ignorar
      }
    }
  }, []);

  // Extraer código de OP desde el contenido leído del código QR (URLs, parámetros o texto directo)
  const extractOpCode = useCallback((raw: string): string | null => {
    if (!raw || typeof raw !== 'string') return null;
    const str = raw.trim();

    // 1. Si es URL completa con parámetro ?op=...
    try {
      if (str.includes('http://') || str.includes('https://') || str.includes('?') || str.includes('colchas.vercel.app')) {
        const fullUrl = str.startsWith('http') ? str : `https://${str}`;
        const url = new URL(fullUrl);
        const opParam = url.searchParams.get('op');
        if (opParam) {
          return formatOpCode(opParam);
        }

        // 2. Si trae payload compacto ?d=... o ?data=...
        const dParam = url.searchParams.get('d') || url.searchParams.get('data') || url.searchParams.get('p');
        if (dParam) {
          const parsed = parsePublicTrackingPayload(dParam);
          if (parsed?.op) {
            return formatOpCode(parsed.op);
          }
        }

        // 3. Si la ruta URL es /op/XXXXX o /trazabilidad/XXXXX
        const segments = url.pathname.split('/').filter(Boolean);
        const lastSeg = segments[segments.length - 1];
        if (lastSeg && (lastSeg.toUpperCase().startsWith('OP') || /^\d{4,8}$/.test(lastSeg))) {
          return formatOpCode(lastSeg);
        }
      }
    } catch {
      // Evaluar como texto plano
    }

    // 4. Patrón directo OP-XXXXX (ej. OP-00096156, OP 96156, OP_96156, STF-OP-96156)
    const match = str.match(/OP[-_\s]*\d+/i);
    if (match) {
      return formatOpCode(match[0]);
    }

    // 5. Solo dígitos de 4 a 8 caracteres (ej. 96234, 00096156)
    const digitsMatch = str.match(/\b\d{4,8}\b/);
    if (digitsMatch) {
      return formatOpCode(digitsMatch[0]);
    }

    return null;
  }, []);

  // Resolver la OP escaneada de forma ultra resiliente (memoria, localStorage, payload del QR o Google Sheets)
  const resolveColcha = useCallback(async (rawCode: string, detectedOp: string) => {
    // 1. Buscar en solicitudes activas en memoria
    let found = solicitudes.find(item => isMatchingOp(item.op, detectedOp));

    // 2. Buscar en OPs creadas localmente (localStorage)
    if (!found) {
      const localOps = getLocalCreatedOps();
      found = localOps.find(item => isMatchingOp(item.op, detectedOp)) || null;
    }

    // 3. Decodificar del payload embebido en el QR si venía en el código (?d=...)
    if (!found && rawCode) {
      const embedded = parsePublicTrackingPayload(rawCode);
      if (embedded && isMatchingOp(embedded.op, detectedOp)) {
        found = embedded;
        try {
          saveLocalCreatedOp(embedded);
        } catch {
          // Ignorar error de almacenamiento
        }
      }
    }

    // 4. Si aún no se encuentra, consultar Google Sheets en vivo en segundo plano
    if (!found) {
      setIsSearchingLive(true);
      try {
        const liveRows = await fetchBaseDeDatosSheet();
        const liveMatch = liveRows.find(item => isMatchingOp(item.op, detectedOp));
        if (liveMatch) {
          found = liveMatch;
        }
      } catch (err) {
        console.warn('Aviso: No se pudo consultar Google Sheets en vivo para OP escaneada:', err);
      } finally {
        setIsSearchingLive(false);
      }
    }

    if (found) {
      setMatchedSolicitud(found);
    } else {
      // Fallback provisional para que el usuario NUNCA quede bloqueado con "NO REGISTRADA EN LOCAL"
      const provisional: SolicitudColcha = {
        id: `op-scan-${detectedOp.replace(/\W/g, '')}`,
        op: detectedOp,
        referencia: 'S/R',
        tela: 'TELA PENDIENTE',
        color: 'AZUL',
        rollos: 1,
        codigoMt: 'MT-AUTO',
        lote: 'LOTE-1',
        estado: 'SOLICITADO',
        dictamen: 'PENDIENTE',
        inspector: currentUser?.nombre || 'OPERARIO STF',
        fechaCreacion: new Date().toISOString(),
        observacionesOperario: 'OP identificada vía Escaneo QR',
        observacionesCalidad: '',
        areaActual: 'LAVANDERÍA COLFACTORY ZF',
        diasHabiles: 0,
        horasEnProceso: 0,
        limiteSlaDias: 2,
        tieneRetraso: false,
        esRetrasoCritico: false
      };
      setMatchedSolicitud(provisional);
    }
  }, [solicitudes, currentUser]);

  // Manejador central cuando se detecta un código QR con éxito por cualquier motor
  const handleDecodedSuccess = useCallback(async (rawText: string) => {
    if (isDetectedRef.current) return;
    const opCode = extractOpCode(rawText);
    if (!opCode) return;

    isDetectedRef.current = true;
    setIsScanning(false);
    triggerScanFeedback();
    setScannedOpCode(opCode);

    try {
      if (zxingReaderRef.current) {
        zxingReaderRef.current.reset();
      }
    } catch {
      // Ignorar
    }

    await resolveColcha(rawText, opCode);
  }, [extractOpCode, triggerScanFeedback, resolveColcha]);

  // Iniciar la cámara del dispositivo con autoenfoque continuo y resolución adaptativa
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setIsScanning(true);
    isDetectedRef.current = false;
    setScannedOpCode(null);
    setMatchedSolicitud(null);
    setActionSuccessMsg(null);
    setShowManualInput(false);
    setZoomLevel(1);

    // Detener stream previo si existe
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasCameraPermission(false);
      setCameraError('Tu navegador o dispositivo no soporta acceso directo a la cámara.');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setHasCameraPermission(true);

      // Comprobar soporte de linterna y zoom por hardware
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const capabilities = (videoTrack.getCapabilities ? videoTrack.getCapabilities() : {}) as any;
        setTorchSupported(Boolean(capabilities?.torch));
        setZoomSupported(Boolean(capabilities?.zoom));

        // Aplicar autoenfoque continuo por hardware si es soportado (crítico para etiquetas térmicas de cerca)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const advancedList: any[] = [];
        if (capabilities?.focusMode?.includes?.('continuous')) {
          advancedList.push({ focusMode: 'continuous' });
        }
        if (advancedList.length > 0 && videoTrack.applyConstraints) {
          try {
            await videoTrack.applyConstraints({ advanced: advancedList });
          } catch {
            // Ignorar si el dispositivo no permite aplicar autoenfoque manual
          }
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();

        // INICIAR DECODER CONTINUO ZXING DIRECTO SOBRE EL VIDEO (Óptimo para iPhone iOS Safari)
        if (zxingReaderRef.current) {
          try {
            zxingReaderRef.current.decodeFromVideoElementContinuously(videoRef.current, (result) => {
              if (result && !isDetectedRef.current) {
                const text = result.getText();
                if (text) {
                  handleDecodedSuccess(text);
                }
              }
            });
          } catch (e) {
            console.warn('Aviso: Fallback a loop de canvas para ZXing:', e);
          }
        }
      }
    } catch (err: unknown) {
      console.warn('Error al acceder a la cámara:', err);
      setHasCameraPermission(false);
      const e = err as { name?: string; message?: string };
      if (e?.name === 'NotAllowedError' || e?.name === 'PermissionDeniedError') {
        setCameraError('Permiso de cámara denegado. Permite el acceso a la cámara en los ajustes de tu navegador.');
      } else {
        setCameraError('No se pudo inicializar la cámara. Puedes subir una foto con el QR o ingresar la OP manualmente.');
      }
    }
  }, [facingMode, handleDecodedSuccess]);

  // Detener la cámara y cancelar timers
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
    if (zxingReaderRef.current) {
      try {
        zxingReaderRef.current.reset();
      } catch {
        // Ignorar
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setTorchOn(false);
    isProcessingFrameRef.current = false;
  }, []);

  // Alternar linterna / flash
  const toggleTorch = async () => {
    if (!streamRef.current || !torchSupported) return;
    try {
      const track = streamRef.current.getVideoTracks()[0];
      const newTorchState = !torchOn;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (track as any).applyConstraints({
        advanced: [{ torch: newTorchState }]
      });
      setTorchOn(newTorchState);
    } catch (e) {
      console.warn('No se pudo activar la linterna:', e);
    }
  };

  // Alternar cámara frontal / trasera
  const toggleCameraFacing = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  // Alternar zoom 1x / 2x (óptimo para enfocar etiquetas térmicas pequeñas sin desenfoque)
  const toggleZoom = async () => {
    const nextZoom = zoomLevel === 1 ? 2 : 1;
    setZoomLevel(nextZoom);
    if (!streamRef.current) return;
    try {
      const track = streamRef.current.getVideoTracks()[0];
      if (track && track.applyConstraints) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await track.applyConstraints({ advanced: [{ zoom: nextZoom } as any] });
      }
    } catch {
      // Si el hardware no soporta zoom nativo, se aplica mediante transformación visual en CSS
    }
  };

  // Loop de escaneo multi-motor complementario (BarcodeDetector + Recorte ROI jsQR)
  const scanLoop = useCallback(async () => {
    if (!isScanning || isDetectedRef.current) return;
    if (isProcessingFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Verificar que el video tenga dimensiones activas y datos listos
    if (!video || video.readyState < 2 || video.videoWidth <= 0 || video.videoHeight <= 0) {
      animationFrameRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    isProcessingFrameRef.current = true;
    scanCycleCountRef.current++;

    try {
      let detectedRaw: string | null = null;

      // MOTOR 1: Hardware BarcodeDetector Nativo (Ultra rápido: 1-2 ms en Android)
      if (barcodeDetectorRef.current) {
        try {
          const barcodes = await barcodeDetectorRef.current.detect(video);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            detectedRaw = barcodes[0].rawValue;
          }
        } catch {
          // Continuar con jsQR
        }
      }

      // MOTOR 2: Fallback jsQR con Recorte Central (ROI) y doble intento de inversión
      if (!detectedRaw && canvas) {
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (ctx) {
          // Recorte del visor central (65% del área, exactamente donde el operario enfoca la etiqueta)
          const cropDim = Math.floor(Math.min(vw, vh) * 0.65);
          const sx = Math.floor((vw - cropDim) / 2);
          const sy = Math.floor((vh - cropDim) / 2);
          const targetSize = Math.min(cropDim, 440); // 440px max para ejecución ultra-veloz

          canvas.width = targetSize;
          canvas.height = targetSize;
          ctx.drawImage(video, sx, sy, cropDim, cropDim, 0, 0, targetSize, targetSize);

          const cropImgData = ctx.getImageData(0, 0, targetSize, targetSize);
          const code = jsQR(cropImgData.data, targetSize, targetSize, {
            inversionAttempts: 'attemptBoth'
          });

          if (code && code.data) {
            detectedRaw = code.data;
          } else if (scanCycleCountRef.current % 3 === 0) {
            // Fotograma completo escalado cada 3 ciclos
            const fullScale = 400 / Math.max(vw, vh);
            const fullW = Math.floor(vw * fullScale);
            const fullH = Math.floor(vh * fullScale);
            canvas.width = fullW;
            canvas.height = fullH;
            ctx.drawImage(video, 0, 0, fullW, fullH);
            const fullImgData = ctx.getImageData(0, 0, fullW, fullH);
            const fullCode = jsQR(fullImgData.data, fullW, fullH, {
              inversionAttempts: 'attemptBoth'
            });
            if (fullCode && fullCode.data) {
              detectedRaw = fullCode.data;
            }
          }
        }
      }

      // Si se detectó código
      if (detectedRaw && !isDetectedRef.current) {
        await handleDecodedSuccess(detectedRaw);
        return;
      }
    } catch (err) {
      console.warn('Aviso en frame de escaneo:', err);
    } finally {
      isProcessingFrameRef.current = false;
      if (isScanning && !isDetectedRef.current) {
        scanTimeoutRef.current = setTimeout(() => {
          if (isScanning && !isDetectedRef.current) {
            animationFrameRef.current = requestAnimationFrame(scanLoop);
          }
        }, 90);
      }
    }
  }, [isScanning, handleDecodedSuccess]);

  // Manejar subida de foto con QR desde la galería
  const handleUploadQrImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        // 1. Intentar ZXing
        if (zxingReaderRef.current) {
          try {
            const result = await zxingReaderRef.current.decodeFromImageElement(img);
            if (result && result.getText()) {
              await handleDecodedSuccess(result.getText());
              return;
            }
          } catch {
            // Continuar con BarcodeDetector
          }
        }

        // 2. Intentar BarcodeDetector nativo
        if (barcodeDetectorRef.current) {
          try {
            const barcodes = await barcodeDetectorRef.current.detect(img);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              await handleDecodedSuccess(barcodes[0].rawValue);
              return;
            }
          } catch {
            // Continuar con jsQR
          }
        }

        // 3. Intentar jsQR con doble inversión
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth'
          });
          if (code && code.data) {
            await handleDecodedSuccess(code.data);
            return;
          }
          notificationService.playAlertSound('CRITICO');
          alert('No se reconoció un código QR válido en la imagen seleccionada. Verifica que la imagen esté nítida.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Manejo de envío manual de OP
  const handleManualOpSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanInput = manualOpText.trim();
    if (!cleanInput) return;

    const formatted = formatOpCode(cleanInput);
    triggerScanFeedback();
    setIsScanning(false);
    isDetectedRef.current = true;
    setScannedOpCode(formatted);

    try {
      if (zxingReaderRef.current) {
        zxingReaderRef.current.reset();
      }
    } catch {
      // Ignorar
    }

    await resolveColcha('', formatted);
  };

  // Reanudar escáner para escanear otra colcha consecutivamente
  const handleScanNext = () => {
    setScannedOpCode(null);
    setMatchedSolicitud(null);
    setActionSuccessMsg(null);
    setShowManualInput(false);
    setManualOpText('');
    isDetectedRef.current = false;
    setIsScanning(true);
    startCamera();
  };

  // Acción 1: Recibir Colcha en Lavandería con 1 Solo Toque
  const handleRecibirEnLavanderia = async () => {
    if (!matchedSolicitud || !onDirectTransfer) return;
    setIsProcessingAction(true);
    try {
      const obs = 'Colcha recibida en Lavandería vía Escaneo de Código QR';
      onDirectTransfer(matchedSolicitud.id, 'LAVANDERIA', obs);
      notificationService.playAlertSound('TRANSFERENCIA');
      setActionSuccessMsg(`¡OP ${matchedSolicitud.op} recibida exitosamente en Lavandería!`);
      setMatchedSolicitud(prev => prev ? { ...prev, estado: 'LAVANDERIA' } : null);
    } catch (err) {
      console.error('Error al recibir OP en lavandería:', err);
      notificationService.playAlertSound('CRITICO');
      alert('Error al recibir la OP en Lavandería. Inténtalo nuevamente.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Acción 2: Finalizar OP
  const handleFinalizarOp = () => {
    if (!matchedSolicitud || !onFinalizar) return;
    onFinalizar(matchedSolicitud);
    onClose();
  };

  // Acción 3: Localizar en Bandeja
  const handleLocateCard = () => {
    if (!matchedSolicitud || !onLocateInBandeja) return;
    onLocateInBandeja(matchedSolicitud);
    onClose();
  };

  // Acción 4: Ver Ficha Técnica
  const handleViewDetail = () => {
    if (!matchedSolicitud || !onViewDetail) return;
    onViewDetail(matchedSolicitud);
    onClose();
  };

  // Acción 5: Prenda Terminada / Editar
  const handleEditarPrendaTerminada = () => {
    if (!matchedSolicitud || !onOpenEditarFinalizada) return;
    onOpenEditarFinalizada(matchedSolicitud);
    onClose();
  };

  // Ciclo de vida: Iniciar cámara al abrir modal y detener al cerrar
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  // Ejecutar loop de escaneo cuando la cámara esté lista
  useEffect(() => {
    if (isScanning && hasCameraPermission) {
      animationFrameRef.current = requestAnimationFrame(scanLoop);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, [isScanning, hasCameraPermission, scanLoop]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in select-none">
      <div 
        className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Escáner */}
        <div className="px-5 py-3.5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/40 text-emerald-400">
              <QrCode className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black font-sans text-white tracking-wide flex items-center gap-1.5">
                <span>ESCÁNER QR DE COLCHA</span>
                <span className="text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  EN VIVO
                </span>
              </h3>
              <p className="text-[10.5px] text-zinc-400 font-mono">
                Piso de Planta • Lectura óptica instantánea
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition cursor-pointer"
            title="Cerrar escáner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo Principal: Visor de Cámara vs Cockpit de Acción */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto custom-scroll space-y-4">
          
          {/* FASE 1: VISOR ACTIVO DE CÁMARA (Si no hay OP detectada aún) */}
          {isScanning && (
            <div className="space-y-4">
              <div className="relative aspect-[4/3] sm:aspect-video w-full rounded-2xl overflow-hidden bg-black border-2 border-zinc-800 shadow-inner flex items-center justify-center">
                {/* Elemento de Video */}
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover transition-transform duration-200"
                  style={{
                    transform: zoomLevel > 1 && !zoomSupported ? `scale(${zoomLevel})` : undefined,
                    transformOrigin: 'center center'
                  }}
                  playsInline
                  autoPlay
                  muted
                />

                {/* Canvas oculto para análisis y recortes de alta velocidad */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Retícula visual de escaneo tipo láser con esquinas destacadas */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-6 sm:p-8">
                  <div className="relative w-52 h-52 sm:w-60 sm:h-60">
                    {/* Esquinas del visor con sombra neón */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl shadow-[0_0_12px_rgba(52,211,153,0.9)]" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl shadow-[0_0_12px_rgba(52,211,153,0.9)]" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl shadow-[0_0_12px_rgba(52,211,153,0.9)]" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl shadow-[0_0_12px_rgba(52,211,153,0.9)]" />

                    {/* Línea láser animada */}
                    <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_rgba(52,211,153,1)] animate-bounce duration-1000 top-1/2 -translate-y-1/2" />
                    
                    {/* Isotipo central sutil */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-20">
                      <QrCode className="w-16 h-16 text-white" />
                    </div>
                  </div>
                </div>

                {/* Controles sobre el video: Linterna, Zoom y Cambio de Cámara */}
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  {/* Botón de Zoom 1x / 2x */}
                  <button
                    type="button"
                    onClick={toggleZoom}
                    className={`px-2.5 py-1.5 rounded-xl backdrop-blur-md border text-xs font-mono font-black transition cursor-pointer flex items-center gap-1 ${
                      zoomLevel > 1 
                        ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]' 
                        : 'bg-black/60 text-white border-zinc-700 hover:bg-black/80'
                    }`}
                    title="Alternar Zoom 1x y 2x para etiquetas pequeñas"
                  >
                    {zoomLevel > 1 ? <ZoomOut className="w-3.5 h-3.5" /> : <ZoomIn className="w-3.5 h-3.5" />}
                    <span>{zoomLevel}x</span>
                  </button>

                  {/* Linterna / Flash */}
                  {torchSupported && (
                    <button
                      type="button"
                      onClick={toggleTorch}
                      className={`p-2 rounded-xl backdrop-blur-md border transition cursor-pointer ${
                        torchOn 
                          ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.6)]' 
                          : 'bg-black/60 text-white border-zinc-700 hover:bg-black/80'
                      }`}
                      title={torchOn ? 'Apagar linterna' : 'Encender linterna'}
                    >
                      {torchOn ? <Zap className="w-4 h-4 fill-black" /> : <ZapOff className="w-4 h-4" />}
                    </button>
                  )}

                  {/* Alternar Frontal / Trasera */}
                  <button
                    type="button"
                    onClick={toggleCameraFacing}
                    className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-zinc-700 transition cursor-pointer"
                    title="Cambiar entre cámara trasera y frontal"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>

                {/* Mensaje de estado en vivo */}
                <div className="absolute bottom-3 inset-x-3 text-center pointer-events-none">
                  <span className="inline-block px-3 py-1 rounded-full bg-black/80 backdrop-blur-md text-[11px] font-mono font-bold text-emerald-400 border border-emerald-500/40 shadow-lg">
                    Enfoque el código QR de la etiqueta física
                  </span>
                </div>
              </div>

              {/* Mensaje de error si la cámara falla */}
              {cameraError && (
                <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs font-mono space-y-1">
                  <div className="flex items-center gap-2 font-bold text-rose-200">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Aviso de Acceso a Cámara</span>
                  </div>
                  <p>{cameraError}</p>
                </div>
              )}

              {/* Acciones alternativas: Ingreso Manual y Subir foto con QR */}
              <div className="space-y-2 pt-1 border-t border-zinc-800">
                
                {/* Desplegable de Ingreso Manual de OP de respaldo */}
                {showManualInput ? (
                  <form onSubmit={handleManualOpSubmit} className="p-3 rounded-2xl bg-zinc-900 border border-emerald-500/40 space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between text-xs text-zinc-300 font-mono font-bold">
                      <span className="flex items-center gap-1.5">
                        <Keyboard className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Ingresar número de OP manual:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowManualInput(false)}
                        className="text-zinc-400 hover:text-white"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={manualOpText}
                        onChange={(e) => setManualOpText(e.target.value)}
                        placeholder="Ej. 69412 o OP-69412"
                        autoFocus
                        className="flex-1 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-white font-mono text-sm uppercase focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="submit"
                        disabled={!manualOpText.trim()}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-mono font-bold text-xs uppercase cursor-pointer"
                      >
                        Buscar OP
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setShowManualInput(true)}
                      className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Keyboard className="w-3.5 h-3.5 text-amber-400" />
                      <span>Ingresar OP manual</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Subir foto con QR</span>
                    </button>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUploadQrImage}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* FASE 2: COCKPIT DE ACCIÓN INTELIGENTE DE PISO DE PLANTA (OP DETECTADA) */}
          {!isScanning && scannedOpCode && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              
              {/* Tarjeta de OP Detectada */}
              <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border-2 border-emerald-500/60 shadow-[0_0_25px_rgba(16,185,129,0.2)] space-y-3">
                <div className="flex items-start justify-between gap-2 border-b border-zinc-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg sm:text-xl font-black font-mono text-emerald-400 tracking-wide">
                        {scannedOpCode}
                      </span>
                      {matchedSolicitud && (
                        <span className="text-xs font-bold text-zinc-300 font-mono">
                          / REF {matchedSolicitud.referencia}
                        </span>
                      )}
                    </div>
                    {matchedSolicitud && (
                      <p className="text-xs text-zinc-300 font-medium mt-0.5">
                        {matchedSolicitud.tela} • <span className="font-mono text-zinc-400">{matchedSolicitud.color}</span>
                      </p>
                    )}
                  </div>

                  {matchedSolicitud ? (
                    <span className={`text-[10px] font-mono font-black px-2.5 py-1 rounded-xl border uppercase shrink-0 ${
                      matchedSolicitud.estado === 'FINALIZADO'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                        : matchedSolicitud.estado === 'LAVANDERIA'
                        ? 'bg-sky-950 text-sky-300 border-sky-500/50'
                        : matchedSolicitud.estado === 'CALIDAD'
                        ? 'bg-purple-950 text-purple-300 border-purple-500/50'
                        : matchedSolicitud.estado === 'EVALUADO'
                        ? 'bg-teal-950 text-teal-300 border-teal-500/50'
                        : 'bg-amber-950 text-amber-300 border-amber-500/50'
                    }`}>
                      {matchedSolicitud.estado.replace('_', ' ')}
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                      IDENTIFICADA
                    </span>
                  )}
                </div>

                {isSearchingLive && (
                  <div className="flex items-center gap-2 text-[11px] font-mono text-amber-400">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Sincronizando ficha técnica con Google Sheets...</span>
                  </div>
                )}

                {matchedSolicitud && (
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono text-zinc-400">
                    <div className="bg-zinc-950/70 p-2.5 rounded-xl border border-zinc-800">
                      <span className="text-[10px] text-zinc-500 font-bold block uppercase">Rollos / Metros</span>
                      <span className="text-white font-bold">{matchedSolicitud.rollos} Rollos ({matchedSolicitud.rollos * 85} Mt)</span>
                    </div>
                    <div className="bg-zinc-950/70 p-2.5 rounded-xl border border-zinc-800">
                      <span className="text-[10px] text-zinc-500 font-bold block uppercase">Registrado por</span>
                      <span className="text-white font-bold truncate block">{matchedSolicitud.inspector}</span>
                    </div>
                  </div>
                )}

                {/* Notificación de Éxito si se ejecutó acción */}
                {actionSuccessMsg && (
                  <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs font-mono flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{actionSuccessMsg}</span>
                  </div>
                )}
              </div>

              {/* BOTONES DE ACCIÓN RÁPIDA SEGÚN ROL Y ESTADO */}
              <div className="space-y-2.5">
                
                {/* 1. CASO LAVANDERÍA / ADMIN: OP EN SOLICITADO O PRE-SOLICITUD -> RECIBIR CON UN TOQUE */}
                {matchedSolicitud && (isLavanderiaUser(currentUser) || isAdminUser(currentUser)) && (matchedSolicitud.estado === 'SOLICITADO' || matchedSolicitud.estado === 'PRE_SOLICITUD') && (
                  <button
                    type="button"
                    disabled={isProcessingAction}
                    onClick={handleRecibirEnLavanderia}
                    className="w-full group py-4 px-5 rounded-2xl bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-black text-sm uppercase tracking-wide flex items-center justify-center gap-3 shadow-lg shadow-sky-600/30 hover:scale-[1.02] active:scale-95 transition cursor-pointer border border-sky-400/50"
                  >
                    {isProcessingAction ? (
                      <RefreshCw className="w-5 h-5 text-white animate-spin" />
                    ) : (
                      <Droplets className="w-5 h-5 text-sky-200 group-hover:scale-125 transition-transform" />
                    )}
                    <span className="font-mono">
                      {isProcessingAction ? 'RECIBIENDO EN LAVANDERÍA...' : '🌊 RECIBIR COLCHA EN LAVANDERÍA'}
                    </span>
                    <ArrowRight className="w-4 h-4 text-sky-200 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}

                {/* 2. CASO LAVANDERÍA / ADMIN: OP YA EN LAVANDERÍA -> IR A SU COCKPIT */}
                {matchedSolicitud && (isLavanderiaUser(currentUser) || isAdminUser(currentUser)) && matchedSolicitud.estado === 'LAVANDERIA' && (
                  <button
                    type="button"
                    onClick={handleLocateCard}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white font-mono font-bold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer hover:scale-[1.02] active:scale-95 transition"
                  >
                    <Droplets className="w-4 h-4" />
                    <span>📍 IR A MI COCKPIT DE LAVANDERÍA</span>
                  </button>
                )}

                {/* 3. CASO FACTORY / ADMIN: OP EN EVALUADO -> FINALIZAR DIRECTAMENTE */}
                {matchedSolicitud && isFactoryUser(currentUser) && matchedSolicitud.estado === 'EVALUADO' && (
                  <button
                    type="button"
                    onClick={handleFinalizarOp}
                    className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-black text-sm uppercase tracking-wide flex items-center justify-center gap-3 shadow-lg shadow-emerald-600/30 hover:scale-[1.02] active:scale-95 transition cursor-pointer border border-emerald-400/50"
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-100" />
                    <span className="font-mono">FINALIZAR Y LIBERAR OP</span>
                    <ArrowRight className="w-4 h-4 text-emerald-100" />
                  </button>
                )}

                {/* 4. CASO FINALIZADO: PRENDA TERMINADA / EDITAR */}
                {matchedSolicitud && matchedSolicitud.estado === 'FINALIZADO' && (isLavanderiaUser(currentUser) || isEdiazUser(currentUser) || isAdminUser(currentUser)) && (
                  <button
                    type="button"
                    onClick={handleEditarPrendaTerminada}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border-2 border-amber-400/60 font-mono font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer hover:scale-[1.02] active:scale-95 transition"
                  >
                    <Shirt className="w-4 h-4 text-amber-400 animate-pulse" />
                    <span>👕 PRENDA TERMINADA / EDITAR FOTOS</span>
                  </button>
                )}

                {/* ACCIONES SECUNDARIAS */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {matchedSolicitud && (
                    <button
                      type="button"
                      onClick={handleViewDetail}
                      className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-amber-400" />
                      <span>Ver Ficha</span>
                    </button>
                  )}

                  {matchedSolicitud && (
                    <button
                      type="button"
                      onClick={handleLocateCard}
                      className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Search className="w-3.5 h-3.5 text-sky-400" />
                      <span>Ir a Bandeja</span>
                    </button>
                  )}
                </div>

                {/* BOTÓN PARA ESCANEAR SIGUIENTE COLCHA INMEDIATAMENTE */}
                <button
                  type="button"
                  onClick={handleScanNext}
                  className="w-full py-3 px-4 rounded-2xl bg-zinc-800/80 hover:bg-zinc-700 text-white font-mono font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer border border-zinc-700"
                >
                  <Camera className="w-4 h-4 text-emerald-400" />
                  <span>📷 ESCANEAR OTRA COLCHA</span>
                </button>

              </div>

            </div>
          )}

        </div>

        {/* Pie informativo */}
        <div className="px-5 py-2.5 border-t border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between text-[10px] font-mono text-zinc-500">
          <span>STF GROUP • Control de Calidad Textil</span>
          <span>Motor Dual: ZXing Industrial + Barcode API</span>
        </div>
      </div>
    </div>
  );
};
