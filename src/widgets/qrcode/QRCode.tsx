'use client';

import { useState, useEffect } from 'react';
import QRCodeLib from 'qrcode';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import AppIcon from '@/components/AppIcon';
import QRCodeOptions from './QRCodeOptions';

interface QRCodeConfig {
  text?: string;
  label?: string;
  fgColor?: string;
  bgColor?: string;
  errorCorrection?: 'L' | 'M' | 'Q' | 'H';
}

export default function QRCodeWidget({ config, theme }: WidgetComponentProps) {
  const qrConfig = config as QRCodeConfig | undefined;
  const text = qrConfig?.text ?? '';
  const label = qrConfig?.label ?? '';
  const fgColor = qrConfig?.fgColor ?? '#000000';
  const bgColor = qrConfig?.bgColor ?? '#ffffff';
  const errorCorrection = qrConfig?.errorCorrection ?? 'M';

  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!text) {
      setDataUrl(null);
      return;
    }

    QRCodeLib.toDataURL(text, {
      errorCorrectionLevel: errorCorrection,
      color: { dark: fgColor, light: bgColor },
      margin: 2,
      width: 512,
    })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [text, fgColor, bgColor, errorCorrection]);

  if (!text) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center p-6 text-center"
        style={{ backgroundColor: `${theme.primary}40` }}
      >
        <AppIcon name="qrCode" className="w-9 h-9 mb-3 text-white/70" />
        <span className="text-white/70 text-sm">No QR code configured</span>
        <span className="text-white/50 text-xs mt-1">Add text or a URL in settings</span>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-4 overflow-hidden">
      {dataUrl && (
        <img
          src={dataUrl}
          alt={label || 'QR Code'}
          className="max-w-full max-h-full rounded-lg"
          style={{ objectFit: 'contain' }}
        />
      )}
      {label && (
        <span
          className="mt-2 text-sm font-medium truncate max-w-full"
          style={{ color: theme.accent }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

registerWidget({
  type: 'qrcode',
  name: 'QR Code',
  description: 'Generate and display a QR code from text or a URL',
  icon: 'qrCode',
  minW: 2,
  minH: 2,
  defaultW: 3,
  defaultH: 3,
  component: QRCodeWidget,
  OptionsComponent: QRCodeOptions,
  defaultProps: {
    text: '',
    label: '',
    fgColor: '#000000',
    bgColor: '#ffffff',
    errorCorrection: 'M',
  },
});
