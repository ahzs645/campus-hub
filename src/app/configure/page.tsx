'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  encodeConfig,
  DEFAULT_CONFIG,
  normalizeConfig,
  generateShareUrl,
  type DisplayConfig,
  type WidgetConfig,
} from '@/lib/config';
import { DEMO_PRESETS } from '@/lib/presets';
import { getAllWidgets, getWidget } from '@/widgets';
import EditableWidget from '@/components/EditableWidget';
import WidgetEditDialog from '@/components/WidgetEditDialog';
import type { GridStackItem, GridStackWrapperRef } from '@/components/GridStackWrapper';

// Dynamic import for GridStack to avoid SSR issues
const GridStackWrapper = dynamic(() => import('@/components/GridStackWrapper'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-white/30">
      Loading editor...
    </div>
  ),
});

const ASPECT_RATIOS = [
  { label: '16:9', value: 16 / 9, desc: 'Standard HD' },
  { label: '4:3', value: 4 / 3, desc: 'Traditional' },
  { label: '21:9', value: 21 / 9, desc: 'Ultrawide' },
  { label: '9:16', value: 9 / 16, desc: 'Portrait' },
];

const GRID_COLUMNS = 12;
const GRID_GRANULARITY_OPTIONS = [
  { label: 'Coarse', rows: 8 },
  { label: 'Medium', rows: 12 },
  { label: 'Fine', rows: 16 },
];
const DEFAULT_GRID_ROWS = GRID_GRANULARITY_OPTIONS[0].rows;
const CONFIG_STORAGE_KEY = 'campus-hub:config';

type GridPlacement = { x: number; y: number; w: number; h: number };

const findPlacement = (
  layout: WidgetConfig[],
  columns: number,
  rows: number,
  desiredW: number,
  desiredH: number,
  minW: number,
  minH: number
): GridPlacement | null => {
  const grid: boolean[][] = Array.from({ length: rows }, () =>
    Array.from({ length: columns }, () => false)
  );

  layout.forEach((widget) => {
    for (let dy = 0; dy < widget.h; dy += 1) {
      for (let dx = 0; dx < widget.w; dx += 1) {
        const y = widget.y + dy;
        const x = widget.x + dx;
        if (y >= 0 && y < rows && x >= 0 && x < columns) {
          grid[y][x] = true;
        }
      }
    }
  });

  const canFit = (x: number, y: number, w: number, h: number) => {
    if (x + w > columns || y + h > rows) return false;
    for (let dy = 0; dy < h; dy += 1) {
      for (let dx = 0; dx < w; dx += 1) {
        if (grid[y + dy][x + dx]) return false;
      }
    }
    return true;
  };

  for (let h = desiredH; h >= minH; h -= 1) {
    for (let w = desiredW; w >= minW; w -= 1) {
      for (let y = 0; y <= rows - h; y += 1) {
        for (let x = 0; x <= columns - w; x += 1) {
          if (canFit(x, y, w, h)) return { x, y, w, h };
        }
      }
    }
  }

  return null;
};

export default function ConfigurePage() {
  const [config, setConfig] = useState<DisplayConfig>(DEFAULT_CONFIG);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(16 / 9);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const [editingWidget, setEditingWidget] = useState<WidgetConfig | null>(null);
  const [placementError, setPlacementError] = useState<string | null>(null);
  const [gridRows, setGridRows] = useState(DEFAULT_CONFIG.gridRows ?? DEFAULT_GRID_ROWS);
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<GridStackWrapperRef>(null);

  const availableWidgets = getAllWidgets();
  const hasTicker = config.layout.some((widget) => widget.type === 'news-ticker');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as DisplayConfig;
        setConfig(normalizeConfig(parsed));
      }
    } catch {
      // Ignore corrupted cache
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const timeout = setTimeout(() => {
      try {
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
      } catch {
        // Ignore storage failures (quota, private mode)
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [config]);

  useEffect(() => {
    if (!config.gridRows) return;
    if (config.gridRows !== gridRows) {
      setGridRows(config.gridRows);
    }
  }, [config.gridRows, gridRows]);

  // Calculate preview size to fit container while maintaining aspect ratio
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      let width, height;
      if (containerWidth / containerHeight > aspectRatio) {
        height = containerHeight;
        width = height * aspectRatio;
      } else {
        width = containerWidth;
        height = width / aspectRatio;
      }

      setPreviewSize({ width, height });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [aspectRatio]);

  // Convert config.layout to GridStack items
  const gridItems: GridStackItem[] = config.layout.map((widget) => {
    const widgetDef = getWidget(widget.type);
    return {
      id: widget.id,
      x: widget.x,
      y: widget.y,
      w: widget.w,
      h: widget.h,
      minW: widgetDef?.minW,
      minH: widgetDef?.minH,
      maxW: widgetDef?.maxW,
      maxH: widgetDef?.maxH,
    };
  });
  const minRowsNeeded = config.layout.reduce(
    (maxRows, widget) => Math.max(maxRows, widget.y + widget.h),
    1
  );

  const addWidget = useCallback((type: string) => {
    const widgetDef = availableWidgets.find((w) => w.type === type);
    if (!widgetDef) return;

    setConfig((prev) => {
      const minW = widgetDef.minW ?? 1;
      const minH = widgetDef.minH ?? 1;
      const maxW = widgetDef.maxW ?? GRID_COLUMNS;
      const maxH = widgetDef.maxH ?? gridRows;
      const desiredW = Math.min(widgetDef.defaultW, maxW, GRID_COLUMNS);
      const desiredH = Math.min(widgetDef.defaultH, maxH, gridRows);

      const placement = findPlacement(
        prev.layout,
        GRID_COLUMNS,
        gridRows,
        desiredW,
        desiredH,
        minW,
        minH
      );

      if (!placement) {
        setPlacementError('No space available. Move or resize a widget to make room.');
        return prev;
      }

      setPlacementError(null);

      const newWidget: WidgetConfig = {
        id: `${type}-${Date.now()}`,
        type: type as WidgetConfig['type'],
        x: placement.x,
        y: placement.y,
        w: placement.w,
        h: placement.h,
        props: widgetDef.defaultProps || {},
      };

      return {
        ...prev,
        tickerEnabled: type === 'news-ticker' ? true : prev.tickerEnabled,
        layout: [...prev.layout, newWidget],
      };
    });
  }, [availableWidgets, gridRows]);

  const removeWidget = useCallback((id: string) => {
    setPlacementError(null);
    setConfig((prev) => {
      const nextLayout = prev.layout.filter((w) => w.id !== id);
      return {
        ...prev,
        tickerEnabled: nextLayout.some((widget) => widget.type === 'news-ticker'),
        layout: nextLayout,
      };
    });
  }, [placementError]);

  const handleLayoutChange = useCallback((items: GridStackItem[]) => {
    if (placementError) setPlacementError(null);
    setConfig((prev) => ({
      ...prev,
      layout: prev.layout.map((widget) => {
        const item = items.find((i) => i.id === widget.id);
        if (item) {
          return {
            ...widget,
            x: item.x,
            y: item.y,
            w: item.w,
            h: item.h,
          };
        }
        return widget;
      }),
    }));
  }, []);

  const handleEditWidget = useCallback((widgetId: string) => {
    const widget = config.layout.find((w) => w.id === widgetId);
    if (widget) {
      setEditingWidget(widget);
    }
  }, [config.layout]);

  const handleSaveWidgetOptions = useCallback((widgetId: string, data: Record<string, unknown>) => {
    setConfig((prev) => ({
      ...prev,
      layout: prev.layout.map((widget) =>
        widget.id === widgetId ? { ...widget, props: data } : widget
      ),
    }));
    setEditingWidget(null);
  }, []);

  const generateUrl = useCallback(() => {
    const url = generateShareUrl(config, window.location.origin);
    setShareUrl(url);
  }, [config]);

  const copyUrl = useCallback(async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareUrl]);

  const renderGridItem = useCallback(
    (item: GridStackItem) => {
      const widget = config.layout.find((w) => w.id === item.id);
      if (!widget) return null;

      return (
        <EditableWidget
          widget={widget}
          theme={config.theme}
          onEdit={handleEditWidget}
          onDelete={removeWidget}
        />
      );
    },
    [config.layout, config.theme, handleEditWidget, removeWidget]
  );

  // Calculate cell height based on preview dimensions
  const cellHeight = previewSize.height > 0 ? previewSize.height / gridRows : 80;

  return (
    <div
      className="h-screen flex flex-col text-white overflow-hidden"
      style={{
        backgroundColor: config.theme.background,
        '--background': config.theme.background,
        '--color-primary': config.theme.primary,
        '--color-accent': config.theme.accent,
        '--foreground': '#ffffff',
        '--ui-panel-bg': `${config.theme.primary}26`,
        '--ui-panel-solid': `${config.theme.primary}`,
        '--ui-panel-soft': `${config.theme.primary}14`,
        '--ui-panel-hover': `${config.theme.primary}33`,
        '--ui-panel-border': `${config.theme.accent}33`,
        '--ui-item-bg': `${config.theme.primary}1a`,
        '--ui-item-hover': `${config.theme.primary}26`,
        '--ui-item-border': `${config.theme.primary}33`,
        '--ui-item-border-hover': `${config.theme.accent}66`,
        '--ui-accent-soft': `${config.theme.accent}33`,
        '--ui-accent-strong': `${config.theme.accent}66`,
        '--ui-text': '#ffffff',
        '--ui-text-muted': 'rgba(255, 255, 255, 0.6)',
        '--ui-input-bg': `${config.theme.primary}1a`,
        '--ui-input-border': `${config.theme.primary}33`,
        '--ui-input-focus': `${config.theme.accent}`,
        '--ui-switch-off': `${config.theme.primary}33`,
        '--ui-switch-on': `${config.theme.accent}`,
        '--ui-overlay': `${config.theme.background}cc`,
      } as React.CSSProperties}
    >
      {/* Header */}
      <header className="flex-shrink-0 border-b border-[var(--ui-panel-border)] px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold flex items-center gap-3">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: config.theme.accent }}
            />
            Campus Hub Configurator
          </h1>
          <div className="flex items-center gap-4">
            <button
              onClick={generateUrl}
              className="px-4 py-2 rounded-lg font-medium transition-all hover:scale-105"
              style={{ backgroundColor: config.theme.accent, color: config.theme.primary }}
            >
              Generate URL
            </button>
            <a
              href={`/display?config=${encodeConfig(config)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg font-medium border border-[var(--ui-panel-border)] hover:bg-[var(--ui-item-hover)] transition-all"
            >
              Open Fullscreen
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 flex-shrink-0 border-r border-[var(--ui-panel-border)] bg-[var(--ui-panel-soft)] overflow-y-auto p-4 space-y-4">
          {/* Demo Presets */}
          <div className="bg-[var(--ui-panel-bg)] rounded-xl p-4 space-y-3 border border-[var(--ui-panel-border)]">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <span className="text-[var(--color-accent)]">Demo Presets</span>
            </h2>
            <p className="text-xs text-white/50">Load a pre-built layout to get started quickly</p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setConfig(normalizeConfig(preset.config))}
                  className="p-2 rounded-lg bg-[var(--ui-item-bg)] hover:bg-[var(--ui-item-hover)] border border-[var(--ui-item-border)] hover:border-[var(--ui-item-border-hover)] transition-all text-left group"
                >
                  <div className="text-lg mb-1">{preset.icon}</div>
                  <div className="text-xs font-medium group-hover:text-[var(--color-accent)] transition-colors">{preset.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Settings */}
          <div className="bg-[var(--ui-panel-bg)] border border-[var(--ui-panel-border)] rounded-xl p-4 space-y-4">
            <h2 className="font-bold text-lg">Settings</h2>

            <div>
              <label className="block text-sm text-white/60 mb-1">School Name</label>
              <input
                type="text"
                value={config.schoolName}
                onChange={(e) => setConfig((prev) => ({ ...prev, schoolName: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-[var(--ui-item-bg)] border border-[var(--ui-item-border)] focus:border-[var(--ui-item-border-hover)] outline-none"
              />
            </div>

            {/* Logo */}
            <div>
              <label className="block text-sm text-white/60 mb-1">Logo</label>
              <select
                value={config.logo?.type ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) {
                    setConfig((prev) => {
                      const { logo: _, ...rest } = prev;
                      return rest as DisplayConfig;
                    });
                  } else {
                    setConfig((prev) => ({
                      ...prev,
                      logo: { type: val as 'svg' | 'url', value: prev.logo?.value ?? '' },
                    }));
                  }
                }}
                className="w-full px-3 py-2 rounded-lg bg-[var(--ui-item-bg)] border border-[var(--ui-item-border)] focus:border-[var(--ui-item-border-hover)] outline-none text-sm mb-2"
              >
                <option value="">None</option>
                <option value="url">Image URL</option>
                <option value="svg">Raw SVG</option>
              </select>
              {config.logo?.type === 'url' && (
                <input
                  type="text"
                  placeholder="https://example.com/logo.svg"
                  value={config.logo.value}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      logo: { type: 'url', value: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[var(--ui-item-bg)] border border-[var(--ui-item-border)] focus:border-[var(--ui-item-border-hover)] outline-none text-sm"
                />
              )}
              {config.logo?.type === 'svg' && (
                <textarea
                  placeholder="<svg>...</svg>"
                  value={config.logo.value}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      logo: { type: 'svg', value: e.target.value },
                    }))
                  }
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--ui-item-bg)] border border-[var(--ui-item-border)] focus:border-[var(--ui-item-border-hover)] outline-none text-sm font-mono resize-y"
                />
              )}
              {config.logo?.value && (
                <div className="mt-2 p-2 rounded-lg bg-[var(--ui-item-bg)] border border-[var(--ui-item-border)] flex items-center justify-center">
                  {config.logo.type === 'url' ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={config.logo.value} alt="Logo preview" className="max-h-12 max-w-full object-contain" />
                  ) : (
                    <div className="max-h-12 [&>svg]:max-h-12 [&>svg]:w-auto" dangerouslySetInnerHTML={{ __html: config.logo.value }} />
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-white/60 mb-1">Primary</label>
                <input
                  type="color"
                  value={config.theme.primary}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      theme: { ...prev.theme, primary: e.target.value },
                    }))
                  }
                  className="w-full h-10 rounded-lg cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1">Accent</label>
                <input
                  type="color"
                  value={config.theme.accent}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      theme: { ...prev.theme, accent: e.target.value },
                    }))
                  }
                  className="w-full h-10 rounded-lg cursor-pointer"
                />
              </div>
            </div>

          </div>

          {/* Aspect Ratio */}
          <div className="bg-[var(--ui-panel-bg)] border border-[var(--ui-panel-border)] rounded-xl p-4 space-y-3">
            <h2 className="font-bold text-lg">Preview Aspect Ratio</h2>
            <div className="grid grid-cols-2 gap-2">
              {ASPECT_RATIOS.map((ar) => (
                <button
                  key={ar.label}
                  onClick={() => setAspectRatio(ar.value)}
                  className={`p-2 rounded-lg text-sm transition-all ${
                    aspectRatio === ar.value
                      ? 'bg-[var(--ui-item-hover)] border-[var(--ui-item-border-hover)]'
                      : 'bg-[var(--ui-item-bg)] hover:bg-[var(--ui-item-hover)] border-[var(--ui-item-border)]'
                  } border`}
                >
                  <div className="font-medium">{ar.label}</div>
                  <div className="text-xs text-white/50">{ar.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Add Widgets */}
          <div className="bg-[var(--ui-panel-bg)] border border-[var(--ui-panel-border)] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">Widgets</h2>
              {config.layout.length > 0 && (
                <button
                  onClick={() => setConfig((prev) => ({ ...prev, layout: [] }))}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>
            <p className="text-xs text-white/50">Click to add. Drag to reposition. Click settings to configure.</p>
            {placementError && (
              <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {placementError}
              </div>
            )}
            <div className="space-y-2">
              {availableWidgets.map((widget) => {
                const count = config.layout.filter((w) => w.type === widget.type).length;
                const isTicker = widget.type === 'news-ticker';

                if (isTicker) {
                  return (
                    <div
                      key={widget.type}
                      className={`p-3 rounded-lg flex items-center gap-3 border transition-all ${
                        hasTicker
                          ? 'bg-[var(--ui-accent-soft)] border-[var(--ui-accent-strong)]'
                          : 'bg-[var(--ui-item-bg)] border-[var(--ui-item-border)]'
                      }`}
                    >
                      <span className="text-xl">{widget.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{widget.name}</div>
                        <div className="text-xs text-white/50">{widget.description}</div>
                      </div>
                      <button
                        onClick={() => {
                          if (hasTicker) {
                            setPlacementError(null);
                            setConfig((prev) => ({
                              ...prev,
                              tickerEnabled: false,
                              layout: prev.layout.filter((w) => w.type !== 'news-ticker'),
                            }));
                          } else {
                            addWidget('news-ticker');
                          }
                        }}
                        className={`w-10 h-5 rounded-full transition-all flex-shrink-0 ${
                          hasTicker ? 'bg-[var(--color-accent)]' : 'bg-[var(--ui-item-bg)] border border-[var(--ui-item-border)]'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white transition-transform ${
                            hasTicker ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  );
                }

                return (
                  <div
                    key={widget.type}
                    className={`p-3 rounded-lg flex items-center gap-3 border transition-all cursor-pointer ${
                      count > 0
                        ? 'bg-[var(--ui-accent-soft)] border-[var(--ui-accent-strong)]'
                        : 'bg-[var(--ui-item-bg)] border-[var(--ui-item-border)] hover:bg-[var(--ui-item-hover)] hover:border-[var(--ui-item-border-hover)]'
                    }`}
                    onClick={() => addWidget(widget.type)}
                  >
                    <span className="text-xl">{widget.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{widget.name}</div>
                      <div className="text-xs text-white/50">{widget.description}</div>
                    </div>
                    {count > 0 && (
                      <span className="text-xs px-2 py-0.5 bg-[var(--ui-accent-soft)] text-[var(--color-accent)] rounded">
                        {count}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Share URL */}
          {shareUrl && (
            <div className="bg-[var(--ui-panel-bg)] border border-[var(--ui-panel-border)] rounded-xl p-4 space-y-3">
              <h2 className="font-bold text-lg">Share URL</h2>
              <div className="space-y-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="w-full px-3 py-2 rounded-lg bg-[var(--ui-item-bg)] border border-[var(--ui-item-border)] text-xs font-mono"
                />
                <button
                  onClick={copyUrl}
                  className="w-full py-2 rounded-lg bg-[var(--ui-item-bg)] hover:bg-[var(--ui-item-hover)] text-sm font-medium"
                >
                  {copied ? 'Copied!' : 'Copy URL'}
                </button>
              </div>
            </div>
          )}
        </aside>

        {/* Preview Area */}
        <main className="flex-1 p-6 flex flex-col min-w-0 overflow-hidden">
          <div className="flex items-center justify-between mb-4 gap-4">
            <h2 className="font-display font-bold text-lg" style={{ color: config.theme.accent }}>
              Layout Editor
            </h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs text-white/60">
                <label htmlFor="grid-granularity" className="text-xs text-white/60">
                  Grid Granularity
                </label>
                <select
                  id="grid-granularity"
                  value={gridRows}
                  onChange={(e) => {
                    const nextRows = Number(e.target.value);
                    setGridRows(nextRows);
                    setConfig((prev) => ({ ...prev, gridRows: nextRows }));
                  }}
                  className="px-2 py-1 rounded-lg bg-[var(--ui-item-bg)] border border-[var(--ui-item-border)] text-white/80 text-xs outline-none focus:border-[var(--ui-item-border-hover)]"
                  title={`Current layout uses ${minRowsNeeded} rows`}
                >
                  {GRID_GRANULARITY_OPTIONS.map((option) => (
                    <option
                      key={option.rows}
                      value={option.rows}
                      disabled={option.rows < minRowsNeeded}
                    >
                      {option.label} ({option.rows})
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-xs text-white/40">
                Drag widgets to reposition. Use handles to resize.
              </span>
            </div>
          </div>

          {/* Preview Container */}
          <div
            ref={containerRef}
            className="flex-1 flex items-center justify-center min-h-0 overflow-hidden"
          >
            <div
              className="rounded-xl overflow-hidden border border-[var(--ui-panel-border)] shadow-2xl transition-all duration-200 flex flex-col"
              style={{
                width: previewSize.width || 'auto',
                height: previewSize.height || 'auto',
                backgroundColor: config.theme.background,
              }}
            >
              {/* Main Grid Area */}
              <div className="flex-1 min-h-0 relative">
                {previewSize.width > 0 && previewSize.height > 0 && (
                  <GridStackWrapper
                    ref={gridRef}
                    items={gridItems}
                    columns={GRID_COLUMNS}
                    rows={gridRows}
                    cellHeight={cellHeight}
                    margin={8}
                    onLayoutChange={handleLayoutChange}
                    renderItem={renderGridItem}
                  />
                )}

                {config.layout.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-white/30">
                    <div className="text-center">
                      <p className="text-lg mb-2">No widgets added</p>
                      <p className="text-sm">Click widgets in the sidebar to add them</p>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </main>
      </div>

      {/* Widget Edit Dialog */}
      {editingWidget && (
        <WidgetEditDialog
          isOpen={!!editingWidget}
          widgetId={editingWidget.id}
          widgetType={editingWidget.type}
          initialData={editingWidget.props || {}}
          onSave={handleSaveWidgetOptions}
          onClose={() => setEditingWidget(null)}
        />
      )}
    </div>
  );
}
