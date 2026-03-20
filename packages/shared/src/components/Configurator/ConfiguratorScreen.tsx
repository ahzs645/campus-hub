// Cross-platform Configurator
// On web: rendered inside Next.js page shell
// On TV: rendered as a setup screen
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput, Platform } from 'react-native';
import type { DisplayConfig, WidgetConfig, ThemeColors } from '../../lib/types';
import { DEFAULT_CONFIG } from '../../lib/types';
import { getAllWidgets, getWidget } from '../../lib/widget-registry';
import DisplayGrid from '../DisplayGrid';
import AppIcon from '../AppIcon';
import type { IconName } from '../AppIcon';
import { FormInput, FormSelect, FormSwitch, FormStepper } from '../ui';

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

interface ConfiguratorScreenProps {
  initialConfig?: DisplayConfig;
  onConfigChange?: (config: DisplayConfig) => void;
  onExport?: (config: DisplayConfig) => void;
  previewWidth?: number;
  previewHeight?: number;
}

type SidebarTab = 'widgets' | 'settings' | 'presets';

export default function ConfiguratorScreen({
  initialConfig,
  onConfigChange,
  onExport,
  previewWidth = 960,
  previewHeight = 540,
}: ConfiguratorScreenProps) {
  const [config, setConfig] = useState<DisplayConfig>(initialConfig ?? DEFAULT_CONFIG);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('widgets');
  const [editingWidget, setEditingWidget] = useState<string | null>(null);
  const [showWidgetLibrary, setShowWidgetLibrary] = useState(false);

  const gridRows = config.gridRows ?? 8;
  const gridCols = config.gridCols ?? 12;

  const updateConfig = useCallback((updates: Partial<DisplayConfig>) => {
    setConfig(prev => {
      const next = { ...prev, ...updates };
      onConfigChange?.(next);
      return next;
    });
  }, [onConfigChange]);

  const updateTheme = useCallback((updates: Partial<ThemeColors>) => {
    updateConfig({ theme: { ...config.theme, ...updates } });
  }, [config.theme, updateConfig]);

  const addWidget = useCallback((type: string) => {
    const def = getWidget(type);
    if (!def) return;
    const id = `${type}-${Date.now()}`;
    const w = def.defaultW;
    const h = def.defaultH;
    // Find placement
    let placed = false;
    for (let y = 0; y <= gridRows - h && !placed; y++) {
      for (let x = 0; x <= gridCols - w && !placed; x++) {
        const overlaps = config.layout.some(widget =>
          x < widget.x + widget.w && x + w > widget.x &&
          y < widget.y + widget.h && y + h > widget.y
        );
        if (!overlaps) {
          updateConfig({
            layout: [...config.layout, { id, type, x, y, w, h, props: def.defaultProps }],
          });
          placed = true;
        }
      }
    }
    if (!placed) {
      updateConfig({
        layout: [...config.layout, { id, type, x: 0, y: 0, w, h, props: def.defaultProps }],
      });
    }
    setShowWidgetLibrary(false);
  }, [config.layout, gridRows, gridCols, updateConfig]);

  const removeWidget = useCallback((id: string) => {
    updateConfig({ layout: config.layout.filter(w => w.id !== id) });
    if (editingWidget === id) setEditingWidget(null);
  }, [config.layout, editingWidget, updateConfig]);

  const updateWidgetProps = useCallback((id: string, props: Record<string, unknown>) => {
    updateConfig({
      layout: config.layout.map(w => w.id === id ? { ...w, props } : w),
    });
  }, [config.layout, updateConfig]);

  const allWidgets = useMemo(() => getAllWidgets(), []);
  const editWidget = editingWidget ? config.layout.find(w => w.id === editingWidget) : null;
  const editWidgetDef = editWidget ? getWidget(editWidget.type) : null;

  return (
    <View style={s.root}>
      {/* Preview area */}
      <View style={s.preview}>
        <View style={s.previewHeader}>
          <Text style={s.previewTitle}>{config.schoolName}</Text>
          <Pressable style={s.addBtn} onPress={() => setShowWidgetLibrary(true)}>
            <Text style={s.addBtnText}>+ Add Widget</Text>
          </Pressable>
        </View>
        <View style={[s.previewGrid, { backgroundColor: config.theme.background }]}>
          <DisplayGrid config={config} width={previewWidth} height={previewHeight} />
        </View>
      </View>

      {/* Sidebar */}
      <View style={s.sidebar}>
        <View style={s.tabBar}>
          {(['widgets', 'settings', 'presets'] as SidebarTab[]).map(tab => (
            <Pressable key={tab} style={[s.tab, sidebarTab === tab && s.tabActive]} onPress={() => setSidebarTab(tab)}>
              <Text style={[s.tabText, sidebarTab === tab && s.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView style={s.tabContent}>
          {sidebarTab === 'widgets' && (
            <View>
              <Text style={s.sectionTitle}>Layout ({config.layout.length} widgets)</Text>
              {config.layout.map(widget => {
                const def = getWidget(widget.type);
                return (
                  <View key={widget.id} style={s.widgetItem}>
                    <View style={s.widgetItemInfo}>
                      <AppIcon name={(def?.icon ?? 'puzzle') as IconName} size={16} color="rgba(255,255,255,0.6)" />
                      <Text style={s.widgetItemName}>{def?.name ?? widget.type}</Text>
                    </View>
                    <View style={s.widgetItemActions}>
                      <Pressable onPress={() => setEditingWidget(widget.id)}>
                        <Text style={s.actionText}>Edit</Text>
                      </Pressable>
                      <Pressable onPress={() => removeWidget(widget.id)}>
                        <Text style={[s.actionText, { color: '#ef4444' }]}>Remove</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
              <Pressable style={s.addWidgetBtn} onPress={() => setShowWidgetLibrary(true)}>
                <Text style={s.addWidgetBtnText}>+ Add Widget</Text>
              </Pressable>
            </View>
          )}

          {sidebarTab === 'settings' && (
            <View>
              <Text style={s.sectionTitle}>Display Settings</Text>
              <FormInput label="School Name" name="schoolName" value={config.schoolName}
                onChange={(_, v) => updateConfig({ schoolName: v })} />
              <FormSwitch label="News Ticker" name="tickerEnabled" value={config.tickerEnabled}
                onChange={(_, v) => updateConfig({ tickerEnabled: v })} />
              <FormSwitch label="Coming Soon Overlay" name="comingSoon" value={config.comingSoon ?? false}
                onChange={(_, v) => updateConfig({ comingSoon: v || undefined })} />

              <Text style={[s.sectionTitle, { marginTop: 16 }]}>Theme</Text>
              <View style={s.colorPresets}>
                {COLOR_PRESETS.map(preset => (
                  <Pressable key={preset.name} style={s.colorPreset}
                    onPress={() => updateTheme({ primary: preset.primary, accent: preset.accent, background: preset.background })}>
                    <View style={[s.colorSwatch, { backgroundColor: preset.primary }]}>
                      <View style={[s.colorAccentDot, { backgroundColor: preset.accent }]} />
                    </View>
                    <Text style={s.colorPresetName}>{preset.name}</Text>
                  </Pressable>
                ))}
              </View>

              <FormInput label="Primary Color" name="primary" value={config.theme.primary}
                onChange={(_, v) => updateTheme({ primary: v })} />
              <FormInput label="Accent Color" name="accent" value={config.theme.accent}
                onChange={(_, v) => updateTheme({ accent: v })} />
              <FormInput label="Background Color" name="background" value={config.theme.background}
                onChange={(_, v) => updateTheme({ background: v })} />
              <FormInput label="CORS Proxy URL" name="corsProxy" value={config.corsProxy ?? ''}
                onChange={(_, v) => updateConfig({ corsProxy: v })} placeholder="https://your-proxy.example.com" />

              <Text style={[s.sectionTitle, { marginTop: 16 }]}>Grid</Text>
              <FormSelect label="Columns" name="gridCols" value={String(gridCols)}
                options={[{ value: '8', label: '8 (Coarse)' }, { value: '12', label: '12 (Standard)' }, { value: '16', label: '16 (Fine)' }, { value: '24', label: '24 (Ultra)' }]}
                onChange={(_, v) => updateConfig({ gridCols: parseInt(v, 10) })} />
              <FormSelect label="Rows" name="gridRows" value={String(gridRows)}
                options={[{ value: '8', label: '8 (Coarse)' }, { value: '12', label: '12 (Medium)' }, { value: '16', label: '16 (Fine)' }]}
                onChange={(_, v) => updateConfig({ gridRows: parseInt(v, 10) })} />
            </View>
          )}

          {sidebarTab === 'presets' && (
            <View>
              <Text style={s.sectionTitle}>Export</Text>
              {onExport && (
                <Pressable style={s.exportBtn} onPress={() => onExport(config)}>
                  <Text style={s.exportBtnText}>Export Configuration</Text>
                </Pressable>
              )}
              <Pressable style={s.resetBtn} onPress={() => { setConfig(DEFAULT_CONFIG); onConfigChange?.(DEFAULT_CONFIG); }}>
                <Text style={s.resetBtnText}>Reset to Default</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Widget Library Modal */}
      {showWidgetLibrary && (
        <View style={s.modal}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Add Widget</Text>
              <Pressable onPress={() => setShowWidgetLibrary(false)}>
                <Text style={s.modalClose}>✕</Text>
              </Pressable>
            </View>
            <ScrollView>
              <View style={s.widgetGrid}>
                {allWidgets.map(def => (
                  <Pressable key={def.type} style={s.widgetCard} onPress={() => addWidget(def.type)}>
                    <AppIcon name={def.icon as IconName} size={24} color="rgba(255,255,255,0.7)" />
                    <Text style={s.widgetCardName}>{def.name}</Text>
                    <Text style={s.widgetCardDesc}>{def.description}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      )}

      {/* Widget Edit Dialog */}
      {editWidget && editWidgetDef?.OptionsComponent && (
        <View style={s.modal}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Edit {editWidgetDef.name}</Text>
              <Pressable onPress={() => setEditingWidget(null)}>
                <Text style={s.modalClose}>✕</Text>
              </Pressable>
            </View>
            <ScrollView style={{ padding: 16 }}>
              <editWidgetDef.OptionsComponent
                data={editWidget.props ?? {}}
                onChange={(newProps) => updateWidgetProps(editWidget.id, newProps)}
              />
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row' },
  preview: { flex: 1 },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  previewTitle: { color: 'white', fontSize: 20, fontWeight: '700' },
  addBtn: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: 'white', fontSize: 14, fontWeight: '600' },
  previewGrid: { flex: 1, margin: 16, borderRadius: 12, overflow: 'hidden' },
  sidebar: { width: 320, backgroundColor: 'rgba(255,255,255,0.05)', borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.1)' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: 'white' },
  tabText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '500' },
  tabTextActive: { color: 'white' },
  tabContent: { flex: 1, padding: 16 },
  sectionTitle: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  widgetItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.1)' },
  widgetItemInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  widgetItemName: { color: 'white', fontSize: 14 },
  widgetItemActions: { flexDirection: 'row', gap: 12 },
  actionText: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  addWidgetBtn: { marginTop: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 8, borderStyle: 'dashed' },
  addWidgetBtnText: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
  colorPresets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  colorPreset: { alignItems: 'center', width: 64 },
  colorSwatch: { width: 48, height: 48, borderRadius: 12, alignItems: 'flex-end', justifyContent: 'flex-end', padding: 4 },
  colorAccentDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: 'rgba(0,0,0,0.3)' },
  colorPresetName: { color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 4, textAlign: 'center' },
  exportBtn: { backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginBottom: 8 },
  exportBtnText: { color: 'white', fontSize: 14, fontWeight: '600' },
  resetBtn: { backgroundColor: 'rgba(239,68,68,0.15)', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  resetBtnText: { color: '#ef4444', fontSize: 14, fontWeight: '600' },
  modal: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  modalContent: { backgroundColor: '#1a1a2e', borderRadius: 16, width: '80%', maxWidth: 600, maxHeight: '80%', overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  modalTitle: { color: 'white', fontSize: 18, fontWeight: '700' },
  modalClose: { color: 'rgba(255,255,255,0.5)', fontSize: 20, padding: 4 },
  widgetGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 12 },
  widgetCard: { width: 140, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  widgetCardName: { color: 'white', fontSize: 14, fontWeight: '600', marginTop: 8, textAlign: 'center' },
  widgetCardDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 4, textAlign: 'center' },
});
