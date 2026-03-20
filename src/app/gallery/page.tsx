'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAllWidgets, type WidgetDefinition } from '@/lib/widget-registry';
import AppIcon from '@/components/AppIcon';
import { MODES as GLYPH_MODES } from '@/widgets/nothing-glyph/NothingGlyph';


// Import all widgets to trigger registration
import '@/widgets/index';

// Default theme for rendering previews
const PREVIEW_THEME = {
  primary: '#B79527',
  accent: '#FFFFFF',
  background: '#035642',
};

type SizePreset = 'small' | 'medium' | 'large';

const BASE_SCALE: Record<SizePreset, number> = {
  small: 200,
  medium: 280,
  large: 360,
};

function getWidgetPreviewSize(widget: WidgetDefinition, scale: number) {
  const aspect = widget.defaultW / widget.defaultH;
  // For very wide widgets (aspect > 3), show them wide
  // For tall widgets (aspect < 1), show them tall
  // Clamp dimensions to reasonable bounds
  let w: number, h: number;
  if (aspect >= 3) {
    // Wide widgets: full width, shorter height
    w = Math.min(scale * 1.8, 560);
    h = Math.max(w / Math.min(aspect, 8), 80);
  } else if (aspect >= 1.5) {
    // Moderately wide
    w = Math.min(scale * 1.4, 480);
    h = w / aspect;
  } else if (aspect <= 0.7) {
    // Tall widgets
    h = scale;
    w = h * aspect;
  } else {
    // Roughly square
    w = scale;
    h = scale / aspect;
  }
  return { w: Math.round(w), h: Math.round(h) };
}

export default function GalleryPage() {
  const [widgets, setWidgets] = useState<WidgetDefinition[]>([]);
  const [search, setSearch] = useState('');
  const [previewSize, setPreviewSize] = useState<SizePreset>('medium');

  useEffect(() => {
    setWidgets(getAllWidgets());
  }, []);

  const filtered = widgets.filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.description.toLowerCase().includes(search.toLowerCase()) ||
      w.type.toLowerCase().includes(search.toLowerCase()),
  );

  const scale = BASE_SCALE[previewSize];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0a0a0a]/80 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-white/50 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-display font-bold tracking-tight text-white">
                Widget Gallery
              </h1>
              <p className="text-sm text-white/40">
                {filtered.length} widget{filtered.length !== 1 ? 's' : ''} available
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Size toggle */}
            <div className="hidden sm:flex items-center gap-1 bg-white/5 rounded-lg p-1">
              {(['small', 'medium', 'large'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setPreviewSize(s)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    previewSize === s
                      ? 'bg-[#B79527] text-[#035642]'
                      : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search widgets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#B79527]/50 focus:ring-1 focus:ring-[#B79527]/25 w-48 sm:w-64"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Gallery Grid */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-wrap gap-6 justify-center">
          {filtered.map((widget) => {
            const size = getWidgetPreviewSize(widget, scale);
            return <WidgetCard key={widget.type} widget={widget} size={size} />;
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-white/30">
            <p className="text-lg">No widgets match &ldquo;{search}&rdquo;</p>
          </div>
        )}
      </main>
    </div>
  );
}

function WidgetCard({
  widget,
  size,
}: {
  widget: WidgetDefinition;
  size: { w: number; h: number };
}) {
  const Component = widget.component;
  const [glyphMode, setGlyphMode] = useState(widget.defaultProps?.mode as string ?? 'pendulum');
  const isGlyph = widget.type === 'nothing-glyph';

  const config = isGlyph
    ? { ...widget.defaultProps, mode: glyphMode }
    : widget.defaultProps;

  return (
    <div
      className="group rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden hover:border-[#B79527]/30 transition-all hover:shadow-lg hover:shadow-[#B79527]/5"
      style={{ width: size.w + 32 }}
    >
      {/* Preview container */}
      <div
        className="relative overflow-hidden bg-[#111]"
        style={{ height: size.h + 32 }}
      >
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ padding: 16 }}
        >
          <div
            className="relative overflow-hidden rounded-xl"
            style={{ width: size.w, height: size.h }}
          >
            <ErrorBoundary name={widget.name}>
              <Component
                config={config}
                theme={PREVIEW_THEME}
              />
            </ErrorBoundary>
          </div>
        </div>
      </div>

      {/* Info bar */}
      <div className="px-4 py-3 flex items-center gap-3 border-t border-white/[0.06]">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: 'rgba(183, 149, 39, 0.15)' }}
        >
          <AppIcon name={widget.icon} className="w-4 h-4 text-[#B79527]" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-white truncate">{widget.name}</h3>
          <p className="text-xs text-white/40 truncate">{widget.description}</p>
        </div>
        <span className="text-[10px] text-white/20 font-mono shrink-0">
          {widget.defaultW}x{widget.defaultH}
        </span>
      </div>

      {/* Glyph selector */}
      {isGlyph && (
        <div className="px-4 py-2 border-t border-white/[0.06]">
          <select
            value={glyphMode}
            onChange={(e) => setGlyphMode(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg text-xs text-white/70 px-2 py-1.5 focus:outline-none focus:border-[#B79527]/50"
          >
            {GLYPH_MODES.map((m) => (
              <option key={m.id} value={m.id} className="bg-[#1a1a1a]">
                {m.name} — {m.description}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

// Simple error boundary to prevent one broken widget from crashing the gallery
import { Component as ReactComponent, type ReactNode, type ErrorInfo } from 'react';

interface ErrorBoundaryProps {
  name: string;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends ReactComponent<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`Widget "${this.props.name}" error:`, error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full flex items-center justify-center text-white/30 text-sm">
          Failed to render
        </div>
      );
    }
    return this.props.children;
  }
}
