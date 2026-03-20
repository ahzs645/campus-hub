'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Tv, Camera, ArrowLeft, Wifi, CheckCircle2, AlertCircle, Loader2, RefreshCw, Send, RotateCcw, Eye, Info } from 'lucide-react';

type ConnectionState = 'scanning' | 'connecting' | 'connected' | 'error';

type TVInfo = {
  url: string;
  device?: string;
  currentUrl?: string;
  pairCode?: string;
  transport?: {
    supportsWebSocket?: boolean;
    webSocketPath?: string;
  };
};

export default function TVSetupPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white/40" />
      </div>
    }>
      <TVSetupPage />
    </Suspense>
  );
}

function TVSetupPage() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<ConnectionState>('scanning');
  const [tvInfo, setTVInfo] = useState<TVInfo | null>(null);
  const [error, setError] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | ''>('');
  const [tab, setTab] = useState<'url' | 'json'>('url');
  const [configUrl, setConfigUrl] = useState('');
  const [configJson, setConfigJson] = useState('');
  const [pairCode, setPairCode] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const normalizePairCode = useCallback((value?: string) => {
    return (value ?? '').replace(/\D/g, '').slice(0, 6);
  }, []);

  const parseTVTarget = useCallback((target: string, explicitPairCode?: string) => {
    const parsed = new URL(target);
    const detectedPairCode = parsed.searchParams.get('pair') ?? '';
    return {
      url: `${parsed.protocol}//${parsed.host}`,
      pairCode: normalizePairCode(explicitPairCode || detectedPairCode),
    };
  }, [normalizePairCode]);

  const createPairHeaders = useCallback((pairCodeValue?: string) => {
    const headers: HeadersInit = {};
    if (pairCodeValue) {
      headers['X-Pair-Code'] = pairCodeValue;
    }
    return headers;
  }, []);

  const connectToTV = useCallback(async (target: string, explicitPairCode?: string) => {
    setState('connecting');
    stopCamera();

    try {
      const tvTarget = parseTVTarget(target, explicitPairCode);
      setPairCode(tvTarget.pairCode);

      const headers = createPairHeaders(tvTarget.pairCode);
      const res = await fetch(`${tvTarget.url}/api/config`, {
        headers,
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'TV not responding');
      }
      const data = await res.json();

      // Also get device info
      let device = 'Campus Hub TV';
      let transport: TVInfo['transport'] | undefined;
      try {
        const infoRes = await fetch(`${tvTarget.url}/api/info`, {
          headers,
          signal: AbortSignal.timeout(3000),
        });
        if (infoRes.ok) {
          const info = await infoRes.json();
          device = info.device || device;
          transport = info.transport;
        }
      } catch {}

      setTVInfo({
        url: tvTarget.url,
        device,
        currentUrl: data.url,
        pairCode: tvTarget.pairCode,
        transport,
      });
      setConfigUrl(data.url || '');
      setConfigJson(data.configJson || '');
      setState('connected');
    } catch (error) {
      if (error instanceof Error && error.message) {
        setError(error.message);
        setState('error');
        return;
      }
      const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
      const mixedContentHint = isHttps
        ? '\n\nNote: Your browser may block connections from HTTPS to a local HTTP device. The TV QR flow opens the local page directly, which is the recommended setup path.'
        : '';
      setError(`Could not connect to the local TV setup endpoint. Make sure you're on the same Wi-Fi network and use the pairing code shown on the TV.${mixedContentHint}`);
      setState('error');
    }
  }, [createPairHeaders, parseTVTarget, stopCamera]);

  const startCamera = useCallback(async () => {
    setState('scanning');
    setError('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Use BarcodeDetector if available, otherwise fall back to manual URL entry
      const hasBarcodeDetector = 'BarcodeDetector' in window;

      if (hasBarcodeDetector) {
        // @ts-expect-error BarcodeDetector is not yet in TS types
        const detector = new BarcodeDetector({ formats: ['qr_code'] });

        scanIntervalRef.current = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState !== 4) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const value = barcodes[0].rawValue;
              if (value?.startsWith('http')) {
                connectToTV(value);
              }
            }
          } catch {}
        }, 300);
      } else {
        // Fallback: use canvas + basic detection attempts
        // For browsers without BarcodeDetector, we'll show manual entry
        scanIntervalRef.current = setInterval(async () => {
          if (!videoRef.current || !canvasRef.current) return;
          if (videoRef.current.readyState !== 4) return;

          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          ctx.drawImage(videoRef.current, 0, 0);

          // Without BarcodeDetector, we can't decode QR codes natively
          // The camera view is still useful for visual confirmation
        }, 500);
      }
    } catch {
      setError('Camera access denied. You can manually enter the TV address below.');
    }
  }, [connectToTV]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  // Auto-connect if ?tv= param is present (from QR code scan)
  useEffect(() => {
    const tvUrl = searchParams.get('tv');
    if (tvUrl) {
      connectToTV(tvUrl, searchParams.get('pair') ?? undefined);
    }
  }, [searchParams, connectToTV]);

  const showStatus = (msg: string, type: 'success' | 'error') => {
    setStatusMsg(msg);
    setStatusType(type);
    if (type === 'success') setTimeout(() => setStatusType(''), 3000);
  };

  const applyConfig = async (type: 'url' | 'json', value: string) => {
    if (!tvInfo) return;
    if (!value.trim()) { showStatus('Please enter a value', 'error'); return; }

    if (type === 'json') {
      try {
        JSON.parse(value);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown JSON parse error';
        showStatus(`Invalid JSON: ${message}`, 'error');
        return;
      }
    }

    try {
      const res = await fetch(`${tvInfo.url}/api/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...createPairHeaders(tvInfo.pairCode),
        },
        body: JSON.stringify({ type, value }),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        showStatus('Applied! TV is updating...', 'success');
        setTVInfo({ ...tvInfo, currentUrl: type === 'url' ? value : tvInfo.currentUrl });
      } else {
        const payload = await res.json().catch(() => ({}));
        showStatus(payload.error || 'Failed to apply', 'error');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection lost to TV';
      showStatus(message, 'error');
    }
  };

  const sendAction = async (action: string) => {
    if (!tvInfo) return;
    try {
      const res = await fetch(`${tvInfo.url}/api/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...createPairHeaders(tvInfo.pairCode),
        },
        body: JSON.stringify({ action }),
        signal: AbortSignal.timeout(5000),
      });
      const data = await res.json();
      if (!res.ok) {
        showStatus(data.error || 'Request failed', 'error');
        return;
      }
      showStatus(data.message || 'Done!', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection lost to TV';
      showStatus(message, 'error');
    }
  };

  // Connected state — config panel
  if (state === 'connected' && tvInfo) {
    return (
      <div className="min-h-screen flex flex-col relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `
              radial-gradient(ellipse at 20% 20%, rgba(183, 149, 39, 0.15) 0%, transparent 50%),
              radial-gradient(ellipse at 80% 80%, rgba(3, 86, 66, 0.3) 0%, transparent 50%)
            `,
          }}
        />

        <main className="flex-1 flex flex-col items-center px-4 py-8 relative z-10">
          <div className="w-full max-w-lg space-y-6">
            {/* Header */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium" style={{ backgroundColor: 'rgba(52, 211, 153, 0.15)', color: '#34d399' }}>
                <CheckCircle2 className="w-4 h-4" />
                Connected to TV
              </div>
              <h1 className="text-3xl font-display font-bold">TV Setup</h1>
              <p className="text-white/50 text-sm">{tvInfo.device}</p>
              <p className="text-white/30 text-xs">
                Direct local HTTP pairing{tvInfo.transport?.supportsWebSocket ? ' with WebSocket updates' : ''}
                {tvInfo.transport?.webSocketPath ? ` • reserved live path ${tvInfo.transport.webSocketPath}` : ''}
              </p>
            </div>

            {/* Config Section */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-5 space-y-4">
              <h2 className="font-semibold text-white/90">Configure Display</h2>

              {/* Tabs */}
              <div className="flex gap-1 bg-white/5 rounded-lg p-1">
                <button
                  onClick={() => setTab('url')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${tab === 'url' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
                >
                  Live URL
                </button>
                <button
                  onClick={() => setTab('json')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${tab === 'json' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
                >
                  JSON Config
                </button>
              </div>

              {tab === 'url' ? (
                <div className="space-y-3">
                  <p className="text-sm text-white/40">Point the TV to any Campus Hub display URL.</p>
                  <input
                    type="url"
                    value={configUrl}
                    onChange={(e) => setConfigUrl(e.target.value)}
                    placeholder="https://campus.ahmadjalil.com/display/?config=..."
                    className="w-full px-3 py-2.5 bg-black/30 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/20 outline-none focus:border-[#B79527]/50 transition-colors"
                  />
                  <button
                    onClick={() => applyConfig('url', configUrl)}
                    className="w-full py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                    style={{ backgroundColor: '#B79527', color: '#035642' }}
                  >
                    <Send className="w-4 h-4" />
                    Apply to TV
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-white/40">Paste a display configuration JSON.</p>
                  <textarea
                    value={configJson}
                    onChange={(e) => setConfigJson(e.target.value)}
                    placeholder='{"layout":[{"id":"1","type":"clock","x":0,"y":0,"w":4,"h":4}]}'
                    className="w-full px-3 py-2.5 bg-black/30 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/20 outline-none focus:border-[#B79527]/50 transition-colors font-mono min-h-[120px] resize-y"
                  />
                  <button
                    onClick={() => applyConfig('json', configJson)}
                    className="w-full py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                    style={{ backgroundColor: '#B79527', color: '#035642' }}
                  >
                    <Send className="w-4 h-4" />
                    Apply Config to TV
                  </button>
                </div>
              )}

              {/* Status message */}
              {statusType && (
                <div className={`text-center py-2.5 rounded-lg text-sm font-medium ${statusType === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                  {statusMsg}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-5 space-y-3">
              <h2 className="font-semibold text-white/90">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => sendAction('reload')} className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white/5 border border-white/10 rounded-lg text-sm text-white/70 hover:bg-white/10 transition-all">
                  <RefreshCw className="w-3.5 h-3.5" /> Reload
                </button>
                <button onClick={() => sendAction('reset')} className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white/5 border border-white/10 rounded-lg text-sm text-white/70 hover:bg-white/10 transition-all">
                  <RotateCcw className="w-3.5 h-3.5" /> Reset Default
                </button>
                <button onClick={() => sendAction('identify')} className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white/5 border border-white/10 rounded-lg text-sm text-white/70 hover:bg-white/10 transition-all">
                  <Eye className="w-3.5 h-3.5" /> Identify TV
                </button>
                <button onClick={() => sendAction('info')} className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white/5 border border-white/10 rounded-lg text-sm text-white/70 hover:bg-white/10 transition-all">
                  <Info className="w-3.5 h-3.5" /> Device Info
                </button>
              </div>
            </div>

            {/* Currently displaying */}
            {tvInfo.currentUrl && (
              <div className="rounded-xl bg-white/5 border border-white/10 p-5 space-y-2">
                <h2 className="font-semibold text-white/90 text-sm">Currently Displaying</h2>
                <p className="text-xs text-white/30 font-mono break-all">{tvInfo.currentUrl}</p>
              </div>
            )}

            {/* Footer actions */}
            <div className="flex items-center justify-between pt-2">
              <Link href="/" className="text-sm text-white/30 hover:text-white/60 transition-colors flex items-center gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" /> Home
              </Link>
              <button
                onClick={() => { setState('scanning'); setTVInfo(null); startCamera(); }}
                className="text-sm text-white/30 hover:text-white/60 transition-colors flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5" /> Scan Another TV
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Scanning / Error state
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: `
            radial-gradient(ellipse at 20% 20%, rgba(183, 149, 39, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, rgba(3, 86, 66, 0.3) 0%, transparent 50%)
          `,
        }}
      />

      <main className="flex-1 flex flex-col items-center px-4 py-8 relative z-10">
        <div className="w-full max-w-lg space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Tv className="w-6 h-6" style={{ color: '#B79527' }} />
            </div>
            <h1 className="text-3xl font-display font-bold">Setup TV Display</h1>
            <p className="text-white/50 text-sm max-w-xs mx-auto">
              Scan the QR code shown on your TV to connect and configure it
            </p>
          </div>

          {/* Camera viewfinder */}
          <div className="relative rounded-2xl overflow-hidden bg-black/50 border border-white/10 aspect-square max-w-sm mx-auto w-full">
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Scanning overlay */}
            {state === 'scanning' && streamRef.current && (
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Corner brackets */}
                <div className="w-48 h-48 relative">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 rounded-tl-lg" style={{ borderColor: '#B79527' }} />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 rounded-tr-lg" style={{ borderColor: '#B79527' }} />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 rounded-bl-lg" style={{ borderColor: '#B79527' }} />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 rounded-br-lg" style={{ borderColor: '#B79527' }} />
                </div>
              </div>
            )}

            {/* Connecting spinner */}
            {state === 'connecting' && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#B79527' }} />
                <p className="text-sm text-white/70">Connecting to TV...</p>
              </div>
            )}

            {/* No camera / initial state */}
            {state === 'scanning' && !streamRef.current && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
                <Camera className="w-12 h-12 text-white/20" />
                <button
                  onClick={startCamera}
                  className="px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105 flex items-center gap-2"
                  style={{ backgroundColor: '#B79527', color: '#035642' }}
                >
                  <Camera className="w-4 h-4" />
                  Open Camera to Scan
                </button>
              </div>
            )}

            {/* Error state */}
            {state === 'error' && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3 p-6">
                <AlertCircle className="w-8 h-8 text-red-400" />
                <p className="text-sm text-red-300 text-center whitespace-pre-line">{error}</p>
                <div className="flex gap-2">
                  <button
                    onClick={startCamera}
                    className="px-4 py-2 rounded-lg bg-white/10 text-sm text-white/70 hover:bg-white/15 transition-all"
                  >
                    Try Again
                  </button>
                  {searchParams.get('tv') && (
                    <a
                      href={searchParams.get('tv')!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105"
                      style={{ backgroundColor: '#B79527', color: '#035642' }}
                    >
                      Open TV Directly
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Manual entry */}
          <div className="rounded-xl bg-white/5 border border-white/10 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-white/40" />
              <h2 className="font-semibold text-sm text-white/70">Or enter the local TV address manually</h2>
            </div>
            <p className="text-xs text-white/30">
              Use the base address shown on the TV and the 6-digit pairing code from the same screen. The QR code already includes both.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_auto] gap-2">
              <input
                type="url"
                placeholder="http://192.168.1.x:8888"
                className="flex-1 px-3 py-2.5 bg-black/30 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/20 outline-none focus:border-[#B79527]/50 transition-colors"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val) connectToTV(val, pairCode);
                  }
                }}
                id="manual-url"
              />
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={pairCode}
                onChange={(e) => setPairCode(normalizePairCode(e.target.value))}
                placeholder="123456"
                className="px-3 py-2.5 bg-black/30 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/20 outline-none focus:border-[#B79527]/50 transition-colors"
              />
              <button
                onClick={() => {
                  const input = document.getElementById('manual-url') as HTMLInputElement;
                  if (input?.value.trim()) connectToTV(input.value.trim(), pairCode);
                }}
                className="px-4 py-2.5 rounded-lg font-semibold text-sm transition-all hover:scale-105"
                style={{ backgroundColor: '#B79527', color: '#035642' }}
              >
                Connect
              </button>
            </div>
          </div>

          {/* How it works */}
          <div className="rounded-xl bg-white/5 border border-white/10 p-5 space-y-3">
            <h2 className="font-semibold text-sm text-white/70">How it works</h2>
            <div className="space-y-2.5">
              {[
                { step: '1', text: 'The TV app shows a QR code, local address, and 6-digit pairing code.' },
                { step: '2', text: 'The QR opens the TV’s local setup page directly, or you can connect manually here with the same pair code.' },
                { step: '3', text: 'Changes are sent straight to the TV over the local network with no relay server.' },
              ].map(({ step, text }) => (
                <div key={step} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5" style={{ backgroundColor: 'rgba(183, 149, 39, 0.2)', color: '#B79527' }}>{step}</span>
                  <span className="text-sm text-white/50">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Back link */}
          <div className="text-center">
            <Link href="/" className="text-sm text-white/30 hover:text-white/60 transition-colors inline-flex items-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
