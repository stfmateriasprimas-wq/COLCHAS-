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

  // Si el valor excede 950 caracteres, usar de inmediato el enlace limpio para garantizar nitidez y 0 errores
  if (value && value.length > 950) {
    safeValue = fallbackUrl;
  }

  return (
    <QRCodeErrorBoundary fallbackValue={fallbackUrl} size={size}>
      <QRCodeSVG
        id={id}
        value={safeValue || fallbackUrl}
        size={size}
        level={level}
        includeMargin={includeMargin}
        className={className}
        imageSettings={imageSettings}
      />
    </QRCodeErrorBoundary>
  );
};

export default SafeQRCode;
