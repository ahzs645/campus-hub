'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  DEFAULT_CONFIG,
  normalizeConfig,
  decodeConfig,
  generateShareUrl,
  filterInBoundsLayout,
  type DisplayConfig,
  type ShareUrlMode,
} from '@/lib/config';
import {
  clearDashboardHistory,
  listDashboardHistory,
  saveDashboardHistory,
  serializeDisplayConfig,
  type DashboardHistoryEntry,
} from '@/lib/dashboard-history';
import { DEMO_PRESETS } from '@/lib/presets';

// Import shared components and trigger widget registration
import '@campus-hub/shared';
import ConfiguratorScreen from '@campus-hub/shared/components/Configurator/ConfiguratorScreen';

const CONFIG_STORAGE_KEY = 'campus-hub:config';

export default function ConfigurePage() {
  const [config, setConfig] = useState<DisplayConfig>(DEFAULT_CONFIG);
  const [shareUrl, setShareUrl] = useState('');
  const [shareMode, setShareMode] = useState<ShareUrlMode>('fullscreen');

  // Load saved config on mount
  useEffect(() => {
    const loadConfig = async () => {
      // Check URL params first
      const params = new URLSearchParams(window.location.search);
      const configParam = params.get('config');
      if (configParam) {
        const decoded = await decodeConfig(configParam);
        if (decoded) { setConfig(decoded); return; }
      }
      // Check localStorage
      try {
        const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setConfig(normalizeConfig(parsed));
          return;
        }
      } catch {}
    };
    loadConfig();
  }, []);

  // Auto-save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    } catch {}
  }, [config]);

  // Generate share URL
  useEffect(() => {
    const genUrl = async () => {
      const url = await generateShareUrl(config, window.location.origin, shareMode);
      setShareUrl(url);
    };
    genUrl();
  }, [config, shareMode]);

  const handleConfigChange = useCallback((newConfig: unknown) => {
    setConfig(newConfig as DisplayConfig);
    saveDashboardHistory(newConfig as DisplayConfig).catch(() => {});
  }, []);

  const handleExport = useCallback((exportConfig: unknown) => {
    const typedConfig = exportConfig as DisplayConfig;
    const exported = filterInBoundsLayout(typedConfig);
    const json = JSON.stringify(exported, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campus-hub-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Measure available space
  const [previewDims, setPreviewDims] = useState({ width: 960, height: 540 });
  useEffect(() => {
    const update = () => {
      const w = Math.max(400, window.innerWidth - 360);
      const h = Math.max(300, window.innerHeight - 120);
      setPreviewDims({ width: w, height: h });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#0a0a0a', overflow: 'hidden' }}>
      {/* Top bar with share URL */}
      <div style={{
        height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/" style={{ color: 'white', textDecoration: 'none', fontSize: 18, fontWeight: 700 }}>Campus Hub</a>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>/ Configure</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select
            value={shareMode}
            onChange={(e) => setShareMode(e.target.value as ShareUrlMode)}
            style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '6px 8px', fontSize: 13 }}
          >
            <option value="fullscreen">Fullscreen URL</option>
            <option value="edit">Edit URL</option>
          </select>
          <input
            readOnly
            value={shareUrl}
            onClick={(e) => (e.target as HTMLInputElement).select()}
            style={{ width: 300, background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '6px 12px', fontSize: 13 }}
          />
          <button
            onClick={() => navigator.clipboard?.writeText(shareUrl)}
            style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '6px 12px', fontSize: 13, cursor: 'pointer' }}
          >
            Copy
          </button>
          <a
            href={`/display/?config=${encodeURIComponent(shareUrl.split('config=')[1] ?? '')}`}
            target="_blank"
            rel="noreferrer"
            style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '6px 12px', fontSize: 13, textDecoration: 'none' }}
          >
            Preview
          </a>
        </div>
      </div>

      {/* Shared cross-platform configurator */}
      <div style={{ height: 'calc(100vh - 56px)' }}>
        <ConfiguratorScreen
          initialConfig={config as any}
          onConfigChange={handleConfigChange as any}
          onExport={handleExport as any}
          previewWidth={previewDims.width}
          previewHeight={previewDims.height}
        />
      </div>
    </div>
  );
}
