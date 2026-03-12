'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import QRCodeLib from 'qrcode';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { buildCacheKey, fetchJsonWithCache, fetchTextWithCache, buildProxyUrl } from '@/lib/data-cache';
import { parseRss } from '@/lib/feeds';
import JobBoardOptions from './JobBoardOptions';

interface JobPosting {
  id: string | number;
  title: string;
  department: string;
  type: 'work-study' | 'part-time' | 'full-time' | 'volunteer' | 'co-op' | string;
}

interface JobBoardConfig {
  apiUrl?: string;
  sourceType?: 'json' | 'rss';
  corsProxy?: string;
  cacheTtlSeconds?: number;
  speed?: number;
  scale?: number;
  label?: string;
  qrUrl?: string;
  qrLabel?: string;
}

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  'work-study': { bg: '#7c3aed', text: '#fff' },
  'part-time': { bg: '#0891b2', text: '#fff' },
  'full-time': { bg: '#059669', text: '#fff' },
  volunteer: { bg: '#d97706', text: '#fff' },
  'co-op': { bg: '#2563eb', text: '#fff' },
};

const typeStyle = (type: string) =>
  TYPE_COLORS[type.toLowerCase()] ?? { bg: '#6b7280', text: '#fff' };

const formatType = (type: string) =>
  type
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

const DEMO_JOBS: JobPosting[] = [
  { id: 1, title: 'Library Circulation Desk Assistant', department: 'Library', type: 'work-study' },
  { id: 2, title: 'Research Assistant — Biology Lab', department: 'Biology', type: 'part-time' },
  { id: 3, title: 'IT Help Desk Technician', department: 'IT Services', type: 'work-study' },
  { id: 4, title: 'Campus Tour Guide', department: 'Admissions', type: 'part-time' },
  { id: 5, title: 'Teaching Assistant — CPSC 100', department: 'Computer Science', type: 'part-time' },
  { id: 6, title: 'Recreation Centre Front Desk', department: 'Athletics', type: 'work-study' },
  { id: 7, title: 'Student Ambassador', department: 'Student Affairs', type: 'volunteer' },
  { id: 8, title: 'Lab Monitor — Chemistry', department: 'Chemistry', type: 'work-study' },
  { id: 9, title: 'Writing Centre Tutor', department: 'Academic Success', type: 'part-time' },
  { id: 10, title: 'Web Developer Co-op', department: 'IT Services', type: 'co-op' },
  { id: 11, title: 'Peer Mentor', department: 'Student Life', type: 'volunteer' },
  { id: 12, title: 'Research Data Entry', department: 'Geography', type: 'work-study' },
];

const areJobsEqual = (a: JobPosting[], b: JobPosting[]): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i]?.title !== b[i]?.title || a[i]?.department !== b[i]?.department) return false;
  }
  return true;
};

export default function JobBoard({
  config,
  theme,
  corsProxy: globalCorsProxy,
}: WidgetComponentProps) {
  const cfg = config as JobBoardConfig | undefined;
  const rawApiUrl = cfg?.apiUrl?.trim();
  const apiUrl = rawApiUrl && rawApiUrl.length > 0 ? rawApiUrl : undefined;
  const sourceType = cfg?.sourceType ?? 'json';
  const corsProxy = cfg?.corsProxy?.trim() || globalCorsProxy;
  const cacheTtlSeconds = cfg?.cacheTtlSeconds ?? 120;
  const speed = cfg?.speed ?? 35;
  const configuredScale = cfg?.scale;
  const userScale =
    typeof configuredScale === 'number' && Number.isFinite(configuredScale)
      ? Math.min(2, Math.max(0.5, configuredScale))
      : 1;
  const label = cfg?.label ?? 'Campus Jobs';
  const qrUrl = cfg?.qrUrl ?? '';
  const qrLabel = cfg?.qrLabel ?? 'Scan to apply';

  const [jobs, setJobs] = useState<JobPosting[]>(DEMO_JOBS);
  const jobsRef = useRef(jobs);
  const pendingJobsRef = useRef<JobPosting[] | null>(null);
  const hasAppliedRemoteRef = useRef(false);

  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  const queueFetchedJobs = useCallback((next: JobPosting[]) => {
    if (!Array.isArray(next) || next.length === 0) return;
    if (areJobsEqual(jobsRef.current, next)) return;
    if (!hasAppliedRemoteRef.current) {
      hasAppliedRemoteRef.current = true;
      pendingJobsRef.current = null;
      setJobs(next);
      return;
    }
    pendingJobsRef.current = next;
  }, []);

  const applyPendingAtLoop = useCallback(() => {
    const pending = pendingJobsRef.current;
    if (!pending) return;
    pendingJobsRef.current = null;
    setJobs((cur) => (areJobsEqual(cur, pending) ? cur : pending));
  }, []);

  useEffect(() => {
    pendingJobsRef.current = null;
    hasAppliedRemoteRef.current = false;
  }, [apiUrl, sourceType]);

  useEffect(() => {
    if (apiUrl) return;
    pendingJobsRef.current = null;
    hasAppliedRemoteRef.current = false;
    setJobs(DEMO_JOBS);
  }, [apiUrl]);

  useEffect(() => {
    if (!apiUrl) return;
    let isMounted = true;

    const fetchJobs = async () => {
      try {
        const fetchUrl = corsProxy ? buildProxyUrl(corsProxy, apiUrl) : apiUrl;

        if (sourceType === 'rss') {
          const { text } = await fetchTextWithCache(fetchUrl, {
            cacheKey: buildCacheKey('jobboard-rss', fetchUrl),
            ttlMs: cacheTtlSeconds * 1000,
          });
          const parsed = parseRss(text);
          const mapped: JobPosting[] = parsed.map((item, i) => ({
            id: item.guid ?? item.link ?? `rss-${i}`,
            title: item.title,
            department: item.categories?.[0] ?? '',
            type: item.categories?.[1] ?? 'part-time',
          }));
          if (isMounted) queueFetchedJobs(mapped);
          return;
        }

        // JSON source
        const { data } = await fetchJsonWithCache<unknown>(fetchUrl, {
          cacheKey: buildCacheKey('jobboard-json', fetchUrl),
          ttlMs: cacheTtlSeconds * 1000,
        });

        // Accept either a plain array or { jobs: [...] }
        let rawJobs: unknown[];
        if (Array.isArray(data)) {
          rawJobs = data;
        } else if (data && typeof data === 'object' && Array.isArray((data as Record<string, unknown>).jobs)) {
          rawJobs = (data as Record<string, unknown>).jobs as unknown[];
        } else {
          return;
        }

        const mapped: JobPosting[] = rawJobs
          .filter((j): j is Record<string, unknown> => !!j && typeof j === 'object')
          .map((j, i) => ({
            id: (j.id as string | number) ?? `job-${i}`,
            title: String(j.title ?? ''),
            department: String(j.department ?? ''),
            type: String(j.type ?? 'part-time'),
          }))
          .filter((j) => j.title.length > 0);

        if (isMounted && mapped.length > 0) queueFetchedJobs(mapped);
      } catch (err) {
        console.error('Failed to fetch job postings:', err);
      }
    };

    fetchJobs();
    const interval = setInterval(fetchJobs, 30_000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [apiUrl, sourceType, corsProxy, cacheTtlSeconds, queueFetchedJobs]);

  // QR code generation
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!qrUrl) {
      setQrDataUrl(null);
      return;
    }
    QRCodeLib.toDataURL(qrUrl, {
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
      margin: 1,
      width: 256,
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [qrUrl]);

  // Scale to fit container
  const containerRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);

  const updateScale = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const nextScale = el.clientHeight / 90;
    setFitScale(nextScale > 0 ? nextScale : 1);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateScale]);

  const renderScale = Math.max(0.01, fitScale * userScale);
  const tickerContent = [...jobs, ...jobs];

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden h-full"
      style={{ backgroundColor: theme.accent }}
    >
      <div
        style={{
          transform: `scale(${renderScale})`,
          transformOrigin: 'top left',
          width: `${100 / renderScale}%`,
          height: `${100 / renderScale}%`,
        }}
        className="relative flex"
      >
        {/* Label */}
        <div
          className="absolute left-0 top-0 bottom-0 z-10 flex items-center px-6 font-bold text-base uppercase tracking-widest"
          style={{ backgroundColor: theme.primary, color: theme.accent }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4 mr-2 flex-shrink-0"
          >
            <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            <rect width="20" height="14" x="2" y="6" rx="2" />
          </svg>
          {label}
        </div>

        {/* Scrolling jobs */}
        <div
          className="flex whitespace-nowrap py-3 items-center animate-ticker h-full"
          style={{
            animationDuration: `${speed}s`,
            paddingLeft: qrDataUrl ? '200px' : '220px',
            paddingRight: qrDataUrl ? '100px' : '0px',
          }}
          onAnimationIteration={applyPendingAtLoop}
        >
          {tickerContent.map((job, idx) => {
            const style = typeStyle(job.type);
            return (
              <div key={`${job.id}-${idx}`} className="inline-flex items-center mx-6 gap-3">
                <span
                  className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide flex-shrink-0"
                  style={{ backgroundColor: style.bg, color: style.text }}
                >
                  {formatType(job.type)}
                </span>
                <span className="font-semibold text-lg" style={{ color: theme.primary }}>
                  {job.title}
                </span>
                {job.department && (
                  <span
                    className="text-sm opacity-50"
                    style={{ color: theme.primary }}
                  >
                    — {job.department}
                  </span>
                )}
                <span className="mx-4 text-2xl" style={{ color: `${theme.primary}40` }}>
                  &bull;
                </span>
              </div>
            );
          })}
        </div>

        {/* QR Code overlay */}
        {qrDataUrl && (
          <div
            className="absolute right-0 top-0 bottom-0 z-10 flex items-center gap-2 px-3"
            style={{ backgroundColor: theme.accent }}
          >
            <div className="flex flex-col items-center gap-1">
              <img
                src={qrDataUrl}
                alt={qrLabel}
                className="w-12 h-12 rounded"
                style={{ objectFit: 'contain' }}
              />
              {qrLabel && (
                <span
                  className="text-[9px] font-medium opacity-60 whitespace-nowrap"
                  style={{ color: theme.primary }}
                >
                  {qrLabel}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

registerWidget({
  type: 'job-board',
  name: 'Job Board',
  description: 'Scrolling campus job postings with QR code link',
  icon: 'newspaper',
  minW: 4,
  minH: 1,
  defaultW: 99,
  defaultH: 1,
  component: JobBoard,
  OptionsComponent: JobBoardOptions,
  defaultProps: {
    speed: 35,
    scale: 1,
    label: 'Campus Jobs',
    sourceType: 'json',
    cacheTtlSeconds: 120,
    corsProxy: '',
    qrUrl: '',
    qrLabel: 'Scan to apply',
  },
});
