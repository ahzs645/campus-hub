'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { encodeConfig, DEFAULT_CONFIG, type DisplayConfig, type WidgetConfig } from '@/lib/config';
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

export default function ConfigurePage() {
  const [config, setConfig] = useState<DisplayConfig>(DEFAULT_CONFIG);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(16 / 9);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const [editingWidget, setEditingWidget] = useState<WidgetConfig | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<GridStackWrapperRef>(null);

  const availableWidgets = getAllWidgets();

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

  const addWidget = useCallback((type: string) => {
    const widgetDef = availableWidgets.find((w) => w.type === type);
    if (!widgetDef) return;

    const newWidget: WidgetConfig = {
      id: `${type}-${Date.now()}`,
      type: type as WidgetConfig['type'],
      x: 0,
      y: 0,
      w: widgetDef.defaultW,
      h: widgetDef.defaultH,
      props: widgetDef.defaultProps || {},
    };

    setConfig((prev) => ({
      ...prev,
      layout: [...prev.layout, newWidget],
    }));
  }, [availableWidgets]);

  const removeWidget = useCallback((id: string) => {
    setConfig((prev) => ({
      ...prev,
      layout: prev.layout.filter((w) => w.id !== id),
    }));
  }, []);

  const handleLayoutChange = useCallback((items: GridStackItem[]) => {
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
    const encoded = encodeConfig(config);
    const url = `${window.location.origin}/display?config=${encoded}`;
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
  const cellHeight = previewSize.height > 0 ? previewSize.height / 8 : 80;

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-white/10 px-6 py-4">
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
              className="px-4 py-2 rounded-lg font-medium border border-white/20 hover:bg-white/10 transition-all"
            >
              Open Fullscreen
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 flex-shrink-0 border-r border-white/10 overflow-y-auto p-4 space-y-4">
          {/* Demo Presets */}
          <div className="bg-gradient-to-br from-amber-900/30 to-amber-950/30 rounded-xl p-4 space-y-3 border border-amber-500/20">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <span className="text-amber-400">Demo Presets</span>
            </h2>
            <p className="text-xs text-white/50">Load a pre-built layout to get started quickly</p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setConfig(preset.config)}
                  className="p-2 rounded-lg bg-black/30 hover:bg-black/50 border border-white/10 hover:border-amber-500/30 transition-all text-left group"
                >
                  <div className="text-lg mb-1">{preset.icon}</div>
                  <div className="text-xs font-medium group-hover:text-amber-300 transition-colors">{preset.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Settings */}
          <div className="bg-white/5 rounded-xl p-4 space-y-4">
            <h2 className="font-bold text-lg">Settings</h2>

            <div>
              <label className="block text-sm text-white/60 mb-1">School Name</label>
              <input
                type="text"
                value={config.schoolName}
                onChange={(e) => setConfig((prev) => ({ ...prev, schoolName: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 focus:border-white/30 outline-none"
              />
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

            <div className="flex items-center justify-between pt-2">
              <span className="text-sm">Show News Ticker</span>
              <button
                onClick={() => setConfig((prev) => ({ ...prev, tickerEnabled: !prev.tickerEnabled }))}
                className={`w-12 h-6 rounded-full transition-all ${
                  config.tickerEnabled ? 'bg-green-500' : 'bg-white/20'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    config.tickerEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Aspect Ratio */}
          <div className="bg-white/5 rounded-xl p-4 space-y-3">
            <h2 className="font-bold text-lg">Preview Aspect Ratio</h2>
            <div className="grid grid-cols-2 gap-2">
              {ASPECT_RATIOS.map((ar) => (
                <button
                  key={ar.label}
                  onClick={() => setAspectRatio(ar.value)}
                  className={`p-2 rounded-lg text-sm transition-all ${
                    aspectRatio === ar.value
                      ? 'bg-white/20 border-white/40'
                      : 'bg-black/20 hover:bg-black/40 border-transparent'
                  } border`}
                >
                  <div className="font-medium">{ar.label}</div>
                  <div className="text-xs text-white/50">{ar.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Add Widgets */}
          <div className="bg-white/5 rounded-xl p-4 space-y-3">
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
            <div className="space-y-2">
              {availableWidgets.map((widget) => {
                const count = config.layout.filter((w) => w.type === widget.type).length;
                return (
                  <div
                    key={widget.type}
                    className={`p-3 rounded-lg flex items-center gap-3 ${
                      count > 0
                        ? 'bg-green-900/30 border border-green-500/30 hover:bg-green-900/40'
                        : 'bg-black/20 hover:bg-black/40'
                    } transition-all cursor-pointer`}
                    onClick={() => addWidget(widget.type)}
                  >
                    <span className="text-xl">{widget.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{widget.name}</div>
                      <div className="text-xs text-white/50">{widget.description}</div>
                    </div>
                    {count > 0 && (
                      <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
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
            <div className="bg-white/5 rounded-xl p-4 space-y-3">
              <h2 className="font-bold text-lg">Share URL</h2>
              <div className="space-y-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-xs font-mono"
                />
                <button
                  onClick={copyUrl}
                  className="w-full py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-medium"
                >
                  {copied ? 'Copied!' : 'Copy URL'}
                </button>
              </div>
            </div>
          )}
        </aside>

        {/* Preview Area */}
        <main className="flex-1 p-6 flex flex-col min-w-0 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg" style={{ color: config.theme.accent }}>
              Layout Editor
            </h2>
            <span className="text-xs text-white/40">
              Drag widgets to reposition. Use handles to resize.
            </span>
          </div>

          {/* Preview Container */}
          <div
            ref={containerRef}
            className="flex-1 flex items-center justify-center min-h-0 overflow-hidden"
          >
            <div
              className="rounded-xl overflow-hidden border border-white/20 shadow-2xl transition-all duration-200 flex flex-col"
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
                    columns={12}
                    rows={config.tickerEnabled ? 7 : 8}
                    cellHeight={config.tickerEnabled ? (previewSize.height - 48) / 7 : cellHeight}
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

              {/* Ticker Preview */}
              {config.tickerEnabled && (
                <div className="flex-shrink-0 h-12 relative overflow-hidden" style={{ backgroundColor: config.theme.accent }}>
                  <div
                    className="absolute left-0 top-0 bottom-0 z-10 flex items-center px-4 font-bold text-xs uppercase tracking-wider"
                    style={{ backgroundColor: config.theme.primary, color: config.theme.accent }}
                  >
                    <span className="animate-pulse mr-2">●</span>
                    Breaking
                  </div>
                  <div className="h-full flex items-center pl-28 whitespace-nowrap animate-ticker" style={{ animationDuration: '20s' }}>
                    <span className="text-sm font-medium" style={{ color: config.theme.primary }}>
                      Library closes at 10PM tonight • Rain expected this afternoon • Basketball finals Saturday 7PM • Free pizza at Student Center 12PM
                    </span>
                  </div>
                </div>
              )}
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
