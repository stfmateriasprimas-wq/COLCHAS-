import React, { Component, ErrorInfo, ReactNode } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface SafeQRCodeProps {
  value: string;
  size?: number;
  level?: 'L' | 'M' | 'Q' | 'H';
  includeMargin?: boolean;
  className?: string;
  id?: string;
  imageSettings?: React.ComponentProps<typeof QRCodeSVG>['imageSettings'];
}

interface SafeQRCodeState {
  hasError: boolean;
}

class QRCodeErrorBoundary extends Component<{ children: ReactNode; fallbackValue: string; size: number }, SafeQRCodeState> {
  state: SafeQRCodeState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('SafeQRCode caught rendering error (fallback to safe URL):', error.message);
  }

  render() {
    const props = (this as any).props;
    if (this.state.hasError) {
      const safeFallback = props.fallbackValue;
      return (
        <QRCodeSVG
          value={safeFallback}
          size={props.size}
          level="L"
          includeMargin={false}
        />
      );
    }
    return props.children;
  }
}

export const SafeQRCode: React.FC<SafeQRCodeProps> = ({
  value,
  size = 100,
  level = 'M',
  includeMargin = false,
  className,
  id,
  imageSettings
}) => {
  // Extraer URL limpia de emergencia si el payload es demasiado grande (> 900 caracteres)
  let safeValue = value;
  let fallbackUrl = value;

  try {
    if (value && value.includes('?op=')) {
      const urlObj = new URL(value.startsWith('http') ? value : `https://colchas.vercel.app${value}`);
      const op = urlObj.searchParams.get('op') || '';
      fallbackUrl = `${urlObj.origin}/?op=${encodeURIComponent(op)}&view=public`;
    }
  } catch (e) {
    fallbackUrl = 'https://colchas.vercel.app';
  }

  // Si el valor excede 280 caracteres cuando hay un logotipo central (etiquetas térmicas),
  // usar el enlace limpio (?op=...&view=public) para garantizar que los módulos del QR sean grandes,
  // gruesos y 100% legibles por cámaras móviles en etiquetas térmicas de 100x100mm
  if (value && imageSettings && value.length > 280) {
    safeValue = fallbackUrl;
  } else if (value && value.length > 750) {
    safeValue = fallbackUrl;
  }

  // Si tiene imagen central embebida (isotipo STF), garantizar nivel 'Q' (25% redundancia)
  const effectiveLevel = imageSettings && (level === 'M' || level === 'L') ? 'Q' : level;

  return (
    <QRCodeErrorBoundary fallbackValue={fallbackUrl} size={size}>
      <QRCodeSVG
        id={id}
        value={safeValue || fallbackUrl}
        size={size}
        level={effectiveLevel}
        includeMargin={includeMargin}
        className={className}
        imageSettings={imageSettings}
      />
    </QRCodeErrorBoundary>
  );
};

export default SafeQRCode;
