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

const COLOR_PRESETS = [
  { name: 'Campus Classic', primary: '#035642', accent: '#B79527', background: '#022b21' },
  { name: 'SparkLab', primary: '#122738', accent: '#f85c14', background: '#0a1620' },
  { name: 'Crimson', primary: '#1a1a2e', accent: '#e94560', background: '#16213e' },
  { name: 'Emerald', primary: '#2d3436', accent: '#00b894', background: '#1e272e' },
  { name: 'Ocean', primary: '#2c3e50', accent: '#3498db', background: '#1a252f' },
  { name: 'Minimal', primary: '#0f0f0f', accent: '#ffffff', background: '#000000' },
  { name: 'Sandstone', primary: '#1b4332', accent: '#d4a373', background: '#081c15' },
  { name: 'Royal', primary: '#1a1040', accent: '#9b59b6', background: '#0d0a20' },
];

const DEFAULT_GRID_COLS = 12;
const DEFAULT_GRID_ROWS = 8;

const ROW_OPTIONS = [
  { label: 'Coarse', value: 8 },
  { label: 'Medium', value: 12 },
  { label: 'Fine', value: 16 },
];

const COL_OPTIONS = [
  { label: 'Coarse', value: 8 },
  { label: 'Standard', value: 12 },
  { label: 'Fine', value: 16 },
  { label: 'Ultra', value: 24 },
];

const CONFIG_STORAGE_KEY = 'campus-hub:config';

type GridPlacement = { x: number; y: number; w: number; h: number };

/** Remap widget positions proportionally when grid dimensions change.
 *  Uses ceil for sizes (never shrink) and floor for positions (don't overflow). */
const remapLayout = (
  layout: WidgetConfig[],
  axis: 'x' | 'y',
  prevSize: number,
  nextSize: number,
): WidgetConfig[] => {
  const ratio = nextSize / prevSize;
  const posKey = axis;                        // 'x' or 'y'
  const sizeKey = axis === 'x' ? 'w' : 'h';  // 'w' or 'h'
  const minKey = axis === 'x' ? 'minW' : 'minH';

  return layout.map((widget) => {
    const newSize = Math.max(
      getWidget(widget.type)?.[minKey] ?? 1,
      Math.ceil(widget[sizeKey] * ratio),
    );
    const clampedSize = Math.min(newSize, nextSize);
    const newPos = Math.floor(widget[posKey] * ratio);
    const clampedPos = Math.max(0, Math.min(newPos, nextSize - clampedSize));
    return { ...widget, [posKey]: clampedPos, [sizeKey]: clampedSize };
  });
};

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
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [aspectRatio, setAspectRatioRaw] = useState(config.aspectRatio ?? 16 / 9);
  const setAspectRatio = useCallback((ratio: number) => {
    setAspectRatioRaw(ratio);
    setConfig((prev) => ({ ...prev, aspectRatio: ratio }));
  }, []);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const [editingWidget, setEditingWidget] = useState<WidgetConfig | null>(null);
  const [placementError, setPlacementError] = useState<string | null>(null);
  const [gridRows, setGridRows] = useState(DEFAULT_CONFIG.gridRows ?? DEFAULT_GRID_ROWS);
  const [gridCols, setGridCols] = useState(DEFAULT_CONFIG.gridCols ?? DEFAULT_GRID_COLS);
  const [sidebarTab, setSidebarTab] = useState<'widgets' | 'settings' | 'presets'>('widgets');
  const [showWidgetLibrary, setShowWidgetLibrary] = useState(false);
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
        const normalized = normalizeConfig(parsed);
        setConfig(normalized);
        if (normalized.aspectRatio) setAspectRatioRaw(normalized.aspectRatio);
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

  useEffect(() => {
    if (!config.gridCols) return;
    if (config.gridCols !== gridCols) {
      setGridCols(config.gridCols);
    }
  }, [config.gridCols, gridCols]);

  useEffect(() => {
    if (config.aspectRatio && config.aspectRatio !== aspectRatio) {
      setAspectRatioRaw(config.aspectRatio);
    }
  }, [config.aspectRatio]);

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
      const maxW = widgetDef.maxW ?? gridCols;
      const maxH = widgetDef.maxH ?? gridRows;
      const desiredW = Math.min(widgetDef.defaultW, maxW, gridCols);
      const desiredH = Math.min(widgetDef.defaultH, maxH, gridRows);

      const placement = findPlacement(
        prev.layout,
        gridCols,
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

  const handleSaveWidgetOptions = useCallback((widgetId: string, data: Record<string, unknown>, comingSoon: boolean) => {
    setConfig((prev) => ({
      ...prev,
      layout: prev.layout.map((widget) =>
        widget.id === widgetId ? { ...widget, props: data, comingSoon: comingSoon || undefined } : widget
      ),
    }));
    setEditingWidget(null);
  }, []);

  const generateUrl = useCallback(() => {
    const url = generateShareUrl(config, window.location.origin);
    setShareUrl(url);
    setShowShareModal(true);
    setCopied(false);
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

  // Calculate proportional margin so preview spacing matches the display at any size
  // At 1080p reference: margin=8px → 16px inter-widget gap, 8px edge spacing
  const gridMargin = previewSize.height > 0
    ? Math.max(2, Math.round(previewSize.height * 0.0075))
    : 8;

  // Calculate cell height based on preview dimensions
  const cellHeight = previewSize.height > 0 ? previewSize.height / gridRows : 80;

  // Scale widget content so it looks the same as the 1080p display reference
  const REF_HEIGHT = 1080;
  const contentScale = previewSize.height > 0 ? previewSize.height / REF_HEIGHT : 1;

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
        '--ui-panel-border': `${config.theme.accent}55`,
        '--ui-item-bg': `${config.theme.primary}1a`,
        '--ui-item-hover': `${config.theme.primary}26`,
        '--ui-item-border': 'rgba(255, 255, 255, 0.15)',
        '--ui-item-border-hover': `${config.theme.accent}66`,
        '--ui-accent-soft': `${config.theme.accent}33`,
        '--ui-accent-strong': `${config.theme.accent}66`,
        '--ui-text': '#ffffff',
        '--ui-text-muted': 'rgba(255, 255, 255, 0.6)',
        '--ui-input-bg': `${config.theme.primary}1a`,
        '--ui-input-border': 'rgba(255, 255, 255, 0.18)',
        '--ui-input-focus': `${config.theme.accent}`,
        '--ui-switch-off': 'rgba(255, 255, 255, 0.2)',
        '--ui-switch-on': `${config.theme.accent}`,
        '--ui-overlay': `${config.theme.background}cc`,
      } as React.CSSProperties}
    >
      {/* Header */}
      <header className="flex-shrink-0 border-b border-[color:var(--ui-panel-border)] px-6 py-4">
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
              className="px-4 py-2 rounded-lg font-medium border border-[color:var(--ui-panel-border)] hover:bg-[var(--ui-item-hover)] transition-all"
            >
              Open Fullscreen
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 flex-shrink-0 border-r border-[color:var(--ui-panel-border)] bg-[var(--ui-panel-soft)] flex flex-col overflow-hidden">
          {/* Tab Bar */}
          <div className="flex-shrink-0 p-3 pb-0">
            <div className="flex gap-1 bg-[var(--ui-panel-bg)] rounded-lg p-1 border border-[color:var(--ui-panel-border)]">
              {([
                { key: 'widgets' as const, label: 'Widgets' },
                { key: 'settings' as const, label: 'Settings' },
                { key: 'presets' as const, label: 'Presets' },
              ]).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setSidebarTab(tab.key)}
                  className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    sidebarTab === tab.key
                      ? 'bg-[var(--ui-item-hover)] text-white'
                      : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            {/* === Widgets Tab === */}
            {sidebarTab === 'widgets' && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-lg">
                    Widgets
                    {config.layout.length > 0 && (
                      <span className="ml-2 text-sm font-normal text-white/40">({config.layout.length})</span>
                    )}
                  </h2>
                  {config.layout.length > 0 && (
                    <button
                      onClick={() => setConfig((prev) => ({ ...prev, layout: [], tickerEnabled: false }))}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setShowWidgetLibrary(true)}
                  className="w-full py-2.5 rounded-lg font-medium text-sm transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                  style={{ backgroundColor: config.theme.accent, color: config.theme.background }}
                >
                  <span className="text-lg leading-none">+</span>
                  Add Widget
                </button>

                {placementError && (
                  <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    {placementError}
                  </div>
                )}

                {config.layout.length === 0 ? (
                  <div className="text-center py-8 text-white/30">
                    <div className="text-3xl mb-2">+</div>
                    <p className="text-sm">No widgets yet</p>
                    <p className="text-xs mt-1">Click &quot;Add Widget&quot; to get started</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {config.layout.map((widget) => {
                      const widgetDef = getWidget(widget.type);
                      if (!widgetDef) return null;
                      return (
                        <div
                          key={widget.id}
                          className="bg-[var(--ui-panel-bg)] border border-[color:var(--ui-panel-border)] rounded-lg p-3 space-y-2"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{widgetDef.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">{widgetDef.name}</div>
                              <div className="text-xs text-white/40">
                                {widget.w}×{widget.h} at ({widget.x}, {widget.y})
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {widgetDef.OptionsComponent && (
                                <button
                                  onClick={() => setEditingWidget(widget)}
                                  className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--ui-item-hover)] text-white/50 hover:text-white transition-colors"
                                  title="Configure"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="3" />
                                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                                  </svg>
                                </button>
                              )}
                              <button
                                onClick={() => removeWidget(widget.id)}
                                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-colors"
                                title="Remove"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* === Settings Tab === */}
            {sidebarTab === 'settings' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-white/60 mb-1">School Name</label>
                  <input
                    type="text"
                    value={config.schoolName}
                    onChange={(e) => setConfig((prev) => ({ ...prev, schoolName: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--ui-item-bg)] border border-[color:var(--ui-item-border)] focus:border-[var(--ui-item-border-hover)] outline-none"
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
                    className="w-full px-3 py-2 rounded-lg bg-[var(--ui-item-bg)] border border-[color:var(--ui-item-border)] focus:border-[var(--ui-item-border-hover)] outline-none text-sm mb-2"
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
                      className="w-full px-3 py-2 rounded-lg bg-[var(--ui-item-bg)] border border-[color:var(--ui-item-border)] focus:border-[var(--ui-item-border-hover)] outline-none text-sm"
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
                      className="w-full px-3 py-2 rounded-lg bg-[var(--ui-item-bg)] border border-[color:var(--ui-item-border)] focus:border-[var(--ui-item-border-hover)] outline-none text-sm font-mono resize-y"
                    />
                  )}
                  {config.logo?.value && (
                    <div className="mt-2 p-2 rounded-lg bg-[var(--ui-item-bg)] border border-[color:var(--ui-item-border)] flex items-center justify-center">
                      {config.logo.type === 'url' ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={config.logo.value} alt="Logo preview" className="max-h-12 max-w-full object-contain" />
                      ) : (
                        <div className="max-h-12 [&>svg]:max-h-12 [&>svg]:w-auto" dangerouslySetInnerHTML={{ __html: config.logo.value }} />
                      )}
                    </div>
                  )}
                </div>

                {/* Coming Soon Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-medium text-white/80">Coming Soon</label>
                    <p className="text-xs text-white/40">Blur entire display with a &quot;Coming Soon&quot; overlay</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!!config.comingSoon}
                    onClick={() => setConfig((prev) => ({ ...prev, comingSoon: !prev.comingSoon || undefined }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                      config.comingSoon ? 'bg-[var(--ui-switch-on)]' : 'bg-[var(--ui-switch-off)]'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.comingSoon ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div>
                  <label className="block text-sm text-white/60 mb-2">Color Presets</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {COLOR_PRESETS.map((preset) => {
                      const isActive =
                        config.theme.primary === preset.primary &&
                        config.theme.accent === preset.accent &&
                        config.theme.background === preset.background;
                      return (
                        <button
                          key={preset.name}
                          title={preset.name}
                          onClick={() =>
                            setConfig((prev) => ({
                              ...prev,
                              theme: {
                                primary: preset.primary,
                                accent: preset.accent,
                                background: preset.background,
                              },
                            }))
                          }
                          className={`group relative h-8 rounded-lg overflow-hidden transition-all ${
                            isActive
                              ? 'ring-2 ring-white ring-offset-1 ring-offset-transparent scale-105'
                              : 'hover:scale-105'
                          }`}
                        >
                          <div className="absolute inset-0 flex">
                            <div className="w-1/2" style={{ backgroundColor: preset.primary }} />
                            <div className="w-1/2" style={{ backgroundColor: preset.accent }} />
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                            <span className="text-[9px] font-medium text-white truncate px-1">{preset.name}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
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
            )}

            {/* === Presets Tab === */}
            {sidebarTab === 'presets' && (
              <>
                <div className="bg-[var(--ui-panel-bg)] rounded-xl p-4 space-y-3 border border-[color:var(--ui-panel-border)]">
                  <h2 className="font-bold text-lg flex items-center gap-2">
                    <span className="text-[var(--color-accent)]">Demo Presets</span>
                  </h2>
                  <p className="text-xs text-white/50">Load a pre-built layout to get started quickly</p>
                  <div className="grid grid-cols-2 gap-2">
                    {DEMO_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => setConfig(normalizeConfig(preset.config))}
                        className="p-2 rounded-lg bg-[var(--ui-item-bg)] hover:bg-[var(--ui-item-hover)] border border-[color:var(--ui-item-border)] hover:border-[var(--ui-item-border-hover)] transition-all text-left group"
                      >
                        <div className="text-lg mb-1">{preset.icon}</div>
                        <div className="text-xs font-medium group-hover:text-[var(--color-accent)] transition-colors">{preset.name}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-[var(--ui-panel-bg)] border border-[color:var(--ui-panel-border)] rounded-xl p-4 space-y-3">
                  <h2 className="font-bold text-lg">Preview Aspect Ratio</h2>
                  <div className="grid grid-cols-2 gap-2">
                    {ASPECT_RATIOS.map((ar) => (
                      <button
                        key={ar.label}
                        onClick={() => setAspectRatio(ar.value)}
                        className={`p-2 rounded-lg text-sm transition-all ${
                          aspectRatio === ar.value
                            ? 'bg-[var(--ui-item-hover)] border-[var(--ui-item-border-hover)]'
                            : 'bg-[var(--ui-item-bg)] hover:bg-[var(--ui-item-hover)] border-[color:var(--ui-item-border)]'
                        } border`}
                      >
                        <div className="font-medium">{ar.label}</div>
                        <div className="text-xs text-white/50">{ar.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

          </div>
        </aside>

        {/* Preview Area */}
        <main className="flex-1 p-6 flex flex-col min-w-0 overflow-hidden">
          <div className="flex items-center justify-between mb-4 gap-4">
            <h2 className="font-display font-bold text-lg" style={{ color: config.theme.accent }}>
              Layout Editor
            </h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs text-white/60">
                <span className="text-white/40">Grid</span>
                <select
                  id="grid-cols"
                  value={gridCols}
                  onChange={(e) => {
                    const nextCols = Number(e.target.value);
                    const prevCols = gridCols;
                    setGridCols(nextCols);
                    setConfig((prev) => ({
                      ...prev,
                      gridCols: nextCols,
                      layout: remapLayout(prev.layout, 'x', prevCols, nextCols),
                    }));
                  }}
                  className="px-2 py-1 rounded-lg bg-[var(--ui-item-bg)] border border-[color:var(--ui-item-border)] text-white/80 text-xs outline-none focus:border-[var(--ui-item-border-hover)]"
                  title="Columns"
                >
                  {COL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.value}c
                    </option>
                  ))}
                </select>
                <span className="text-white/30">x</span>
                <select
                  id="grid-rows"
                  value={gridRows}
                  onChange={(e) => {
                    const nextRows = Number(e.target.value);
                    const prevRows = gridRows;
                    setGridRows(nextRows);
                    setConfig((prev) => ({
                      ...prev,
                      gridRows: nextRows,
                      layout: remapLayout(prev.layout, 'y', prevRows, nextRows),
                    }));
                  }}
                  className="px-2 py-1 rounded-lg bg-[var(--ui-item-bg)] border border-[color:var(--ui-item-border)] text-white/80 text-xs outline-none focus:border-[var(--ui-item-border-hover)]"
                  title="Rows"
                >
                  {ROW_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.value}r
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
              className="rounded-xl overflow-hidden border border-[color:var(--ui-panel-border)] shadow-2xl transition-all duration-200 flex flex-col"
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
                    columns={gridCols}
                    rows={gridRows}
                    cellHeight={cellHeight}
                    margin={gridMargin}
                    contentScale={contentScale}
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

      {/* Widget Library Modal */}
      {showWidgetLibrary && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'var(--ui-overlay)' }}
          onClick={() => setShowWidgetLibrary(false)}
        >
          <div
            className="bg-[var(--ui-panel-bg)] border border-[color:var(--ui-panel-border)] rounded-xl w-full max-w-2xl mx-4 backdrop-blur-xl max-h-[80vh] flex flex-col"
            style={{ backgroundColor: config.theme.background }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-[color:var(--ui-panel-border)] flex-shrink-0">
              <h2 className="font-bold text-lg">Widget Library</h2>
              <button
                onClick={() => setShowWidgetLibrary(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--ui-item-hover)] text-white/60 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-2">
              {placementError && (
                <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-2">
                  {placementError}
                </div>
              )}
              {availableWidgets.map((widget) => {
                const count = config.layout.filter((w) => w.type === widget.type).length;
                const isTicker = widget.type === 'news-ticker';

                return (
                  <div
                    key={widget.type}
                    className={`p-3 rounded-lg flex items-center gap-3 border transition-all ${
                      count > 0
                        ? 'bg-[var(--ui-accent-soft)] border-[var(--ui-accent-strong)]'
                        : 'bg-[var(--ui-item-bg)] border-[color:var(--ui-item-border)]'
                    }`}
                  >
                    <span className="text-2xl">{widget.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{widget.name}</div>
                      <div className="text-xs text-white/50">{widget.description}</div>
                      <div className="text-xs text-white/30 mt-0.5">
                        Min {widget.minW}×{widget.minH} · Default {widget.defaultW}×{widget.defaultH}
                        {count > 0 && <span className="ml-2 text-[var(--color-accent)]">· {count} placed</span>}
                      </div>
                    </div>
                    {isTicker ? (
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
                          hasTicker ? 'bg-[var(--color-accent)]' : 'bg-[var(--ui-item-bg)] border border-[color:var(--ui-item-border)]'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white transition-transform ${
                            hasTicker ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    ) : (
                      <button
                        onClick={() => addWidget(widget.type)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--ui-item-bg)] hover:bg-[var(--ui-item-hover)] border border-[color:var(--ui-item-border)] hover:border-[var(--ui-item-border-hover)] transition-all flex-shrink-0"
                      >
                        + Add
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Share URL Modal */}
      {showShareModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'var(--ui-overlay)' }}
          onClick={() => setShowShareModal(false)}
        >
          <div
            className="bg-[var(--ui-panel-bg)] border border-[color:var(--ui-panel-border)] rounded-xl p-4 space-y-3 w-full max-w-lg mx-4 backdrop-blur-xl"
            style={{ backgroundColor: config.theme.background }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">Share URL</h2>
              <button
                onClick={() => setShowShareModal(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--ui-item-hover)] text-white/60 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="w-full px-3 py-2 rounded-lg bg-[var(--ui-item-bg)] border border-[color:var(--ui-item-border)] text-xs font-mono"
              />
              <p className="text-xs text-white/40">{shareUrl.length.toLocaleString()} characters</p>
              <button
                onClick={copyUrl}
                className="w-full py-2 rounded-lg bg-[var(--ui-item-bg)] hover:bg-[var(--ui-item-hover)] text-sm font-medium"
              >
                {copied ? 'Copied!' : 'Copy URL'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Widget Edit Dialog */}
      {editingWidget && (
        <WidgetEditDialog
          isOpen={!!editingWidget}
          widgetId={editingWidget.id}
          widgetType={editingWidget.type}
          initialData={editingWidget.props || {}}
          comingSoon={editingWidget.comingSoon}
          onSave={handleSaveWidgetOptions}
          onClose={() => setEditingWidget(null)}
        />
      )}
    </div>
  );
}
