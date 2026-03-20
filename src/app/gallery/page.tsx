'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  const [playgroundWidget, setPlaygroundWidget] = useState<WidgetDefinition | null>(null);

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
            return (
              <WidgetCard
                key={widget.type}
                widget={widget}
                size={size}
                onPlayground={() => setPlaygroundWidget(widget)}
              />
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-white/30">
            <p className="text-lg">No widgets match &ldquo;{search}&rdquo;</p>
          </div>
        )}
      </main>

      {playgroundWidget && (
        <BoardPlayground
          widget={playgroundWidget}
          onClose={() => setPlaygroundWidget(null)}
        />
      )}
    </div>
  );
}

function WidgetCard({
  widget,
  size,
  onPlayground,
}: {
  widget: WidgetDefinition;
  size: { w: number; h: number };
  onPlayground: () => void;
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
        <button
          onClick={onPlayground}
          className="p-1.5 rounded-lg text-white/30 hover:text-[#B79527] hover:bg-[#B79527]/10 transition-all shrink-0"
          title="Open in board playground"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
          </svg>
        </button>
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

// Board Playground - renders widget on a mock grid board with size controls
const GRID_COLS = 12;
const GRID_ROWS = 8;

function BoardPlayground({
  widget,
  onClose,
}: {
  widget: WidgetDefinition;
  onClose: () => void;
}) {
  const Component = widget.component;
  const maxW = widget.maxW ?? GRID_COLS;
  const maxH = widget.maxH ?? GRID_ROWS;
  const [w, setW] = useState(Math.min(widget.defaultW, GRID_COLS));
  const [h, setH] = useState(Math.min(widget.defaultH, GRID_ROWS));
  const boardRef = useRef<HTMLDivElement>(null);
  const [boardPx, setBoardPx] = useState({ w: 0, h: 0 });

  // Measure the board container
  useEffect(() => {
    if (!boardRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      setBoardPx({ w: rect.width, h: rect.height });
    });
    ro.observe(boardRef.current);
    return () => ro.disconnect();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const cellW = boardPx.w / GRID_COLS;
  const cellH = boardPx.h / GRID_ROWS;
  const gap = 4;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#111] border border-white/10 rounded-2xl shadow-2xl w-[90vw] max-w-[1100px] max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'rgba(183, 149, 39, 0.15)' }}
          >
            <AppIcon name={widget.icon} className="w-4 h-4 text-[#B79527]" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-white">{widget.name}</h2>
            <p className="text-xs text-white/40 truncate">{widget.description}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Controls */}
        <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-3">
            <label className="text-xs text-white/50 font-medium w-12">Width</label>
            <input
              type="range"
              min={widget.minW}
              max={Math.min(maxW, GRID_COLS)}
              value={w}
              onChange={(e) => setW(Number(e.target.value))}
              className="w-32 accent-[#B79527]"
            />
            <span className="text-sm text-white/70 font-mono w-6 text-right">{w}</span>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-white/50 font-medium w-12">Height</label>
            <input
              type="range"
              min={widget.minH}
              max={Math.min(maxH, GRID_ROWS)}
              value={h}
              onChange={(e) => setH(Number(e.target.value))}
              className="w-32 accent-[#B79527]"
            />
            <span className="text-sm text-white/70 font-mono w-6 text-right">{h}</span>
          </div>
          <span className="text-xs text-white/20 font-mono ml-auto">
            {w}x{h} on {GRID_COLS}x{GRID_ROWS} grid
          </span>
        </div>

        {/* Board */}
        <div className="flex-1 p-5 min-h-0">
          <div
            ref={boardRef}
            className="relative w-full bg-[#0a0a0a] rounded-xl border border-white/[0.06] overflow-hidden"
            style={{ aspectRatio: `${16} / ${9}` }}
          >
            {/* Grid lines */}
            {boardPx.w > 0 && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.08 }}>
                {Array.from({ length: GRID_COLS + 1 }, (_, i) => (
                  <line
                    key={`v${i}`}
                    x1={i * cellW}
                    y1={0}
                    x2={i * cellW}
                    y2={boardPx.h}
                    stroke="white"
                    strokeWidth={1}
                  />
                ))}
                {Array.from({ length: GRID_ROWS + 1 }, (_, i) => (
                  <line
                    key={`h${i}`}
                    x1={0}
                    y1={i * cellH}
                    x2={boardPx.w}
                    y2={i * cellH}
                    stroke="white"
                    strokeWidth={1}
                  />
                ))}
              </svg>
            )}

            {/* Widget */}
            {boardPx.w > 0 && (
              <div
                className="absolute rounded-lg overflow-hidden"
                style={{
                  left: gap,
                  top: gap,
                  width: w * cellW - gap * 2,
                  height: h * cellH - gap * 2,
                  transition: 'width 0.2s ease, height 0.2s ease',
                }}
              >
                <ErrorBoundary name={widget.name}>
                  <Component
                    config={widget.defaultProps}
                    theme={PREVIEW_THEME}
                  />
                </ErrorBoundary>
              </div>
            )}
          </div>
        </div>
      </div>
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
