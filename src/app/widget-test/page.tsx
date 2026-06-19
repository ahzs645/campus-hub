'use client';

// Internal QA harness: renders a single widget at an exact pixel size driven by
// URL query params, so an automated browser can screenshot widgets across
// arbitrary widths/heights/ratios. Not linked from the app UI.

import { useEffect, useState } from 'react';
import { getWidget, getAllWidgets } from '@firstform/campus-hub-engine';
import '@firstform/campus-hub-engine/widgets';
import { Component as ReactComponent, type ReactNode, type ErrorInfo } from 'react';

const PREVIEW_THEME = {
  primary: '#B79527',
  accent: '#FFFFFF',
  background: '#035642',
};

interface EBProps { children: ReactNode }
interface EBState { hasError: boolean; message: string }
class ErrorBoundary extends ReactComponent<EBProps, EBState> {
  constructor(props: EBProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }
  static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, message: error?.message ?? 'error' };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('widget-test error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div data-widget-error="1" className="h-full w-full flex items-center justify-center text-red-400 text-sm p-2 text-center">
          Failed to render: {this.state.message}
        </div>
      );
    }
    return this.props.children;
  }
}

interface SizeSpec { w: number; h: number; label: string }

export default function WidgetTestPage() {
  const [params, setParams] = useState<{ type: string; sizes: SizeSpec[] } | null>(null);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const type = sp.get('type') ?? '';
    // sizes param: "WxH:label,WxH:label,..."  Falls back to a single w/h pair.
    const sizesRaw = sp.get('sizes');
    let sizes: SizeSpec[];
    if (sizesRaw) {
      sizes = sizesRaw.split(',').map((chunk) => {
        const [dim, ...labelParts] = chunk.split(':');
        const [w, h] = dim.split('x').map(Number);
        return { w, h, label: labelParts.join(':') || `${w}x${h}` };
      });
    } else {
      const w = Number(sp.get('w') ?? 400);
      const h = Number(sp.get('h') ?? 300);
      sizes = [{ w, h, label: `${w}x${h}` }];
    }
    setParams({ type, sizes });
    (window as unknown as { __widgets?: unknown }).__widgets = getAllWidgets().map((d) => ({
      type: d.type,
      name: d.name,
      minW: d.minW, minH: d.minH,
      maxW: d.maxW, maxH: d.maxH,
      defaultW: d.defaultW, defaultH: d.defaultH,
      defaultProps: d.defaultProps,
    }));
  }, []);

  if (!params) return <div data-loading="1" />;

  const widget = getWidget(params.type);
  const Component = widget?.component;

  return (
    <div
      data-sheet="1"
      style={{ background: '#0a0a0a', minHeight: '100vh', padding: 16, margin: 0 }}
    >
      {!widget || !Component ? (
        <div data-widget-missing="1" style={{ color: '#fff' }}>Unknown widget: {params.type}</div>
      ) : (
        <>
          <div style={{ color: '#fff', fontFamily: 'monospace', fontSize: 14, marginBottom: 12 }}>
            {widget.name} <span style={{ color: '#888' }}>({widget.type}) — grid {widget.defaultW}x{widget.defaultH}, min {widget.minW}x{widget.minH}, max {widget.maxW ?? '–'}x{widget.maxH ?? '–'}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
            {params.sizes.map((s, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ color: '#9ae6b4', fontFamily: 'monospace', fontSize: 12 }}>{s.label}</div>
                <div
                  data-widget-box="1"
                  style={{
                    width: s.w,
                    height: s.h,
                    background: PREVIEW_THEME.background,
                    overflow: 'hidden',
                    position: 'relative',
                    outline: '1px solid #333',
                  }}
                >
                  <ErrorBoundary>
                    <Component config={widget.defaultProps} theme={PREVIEW_THEME} />
                  </ErrorBoundary>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
