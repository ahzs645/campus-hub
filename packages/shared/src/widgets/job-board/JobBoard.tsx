import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import type { WidgetComponentProps } from '../../lib/types';
import { registerWidget } from '../../lib/widget-registry';
import { fetchJsonWithCache, buildCacheKey, buildProxyUrl } from '../../lib/data-cache';
import AppIcon from '../../components/AppIcon';

interface Job {
  title: string;
  company?: string;
  location?: string;
  type?: string;
  url?: string;
}

interface JobBoardConfig {
  apiUrl?: string;
  corsProxy?: string;
  refreshInterval?: number;
  maxItems?: number;
  title?: string;
}

const DEFAULT_JOBS: Job[] = [
  { title: 'Software Engineering Intern', company: 'TechCorp', location: 'Remote', type: 'Internship' },
  { title: 'Research Assistant', company: 'University Lab', location: 'On Campus', type: 'Part-time' },
  { title: 'Marketing Coordinator', company: 'StartupXYZ', location: 'Hybrid', type: 'Full-time' },
  { title: 'Data Analyst', company: 'DataCo', location: 'Remote', type: 'Internship' },
  { title: 'Teaching Assistant', company: 'CS Department', location: 'On Campus', type: 'Part-time' },
];

const TYPE_COLORS: Record<string, string> = {
  Internship: '#8b5cf6',
  'Part-time': '#06b6d4',
  'Full-time': '#22c55e',
  Contract: '#f59e0b',
};

export default function JobBoard({ config, theme, corsProxy: globalCorsProxy, width, height }: WidgetComponentProps) {
  const cc = config as JobBoardConfig | undefined;
  const apiUrl = cc?.apiUrl?.trim();
  const corsProxy = cc?.corsProxy?.trim() || globalCorsProxy;
  const refreshInterval = cc?.refreshInterval ?? 30;
  const maxItems = cc?.maxItems ?? 10;
  const title = cc?.title ?? 'Job Board';
  const refreshMs = refreshInterval * 60 * 1000;

  const [jobs, setJobs] = useState<Job[]>(DEFAULT_JOBS);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchJobs = useCallback(async () => {
    if (!apiUrl) return;
    try {
      const fetchUrl = buildProxyUrl(corsProxy, apiUrl);
      const { data } = await fetchJsonWithCache<Job[]>(fetchUrl, {
        cacheKey: buildCacheKey('jobs', apiUrl),
        ttlMs: refreshMs,
      });
      if (Array.isArray(data)) {
        setJobs(data.slice(0, maxItems));
        setError(null);
        setLastUpdated(new Date());
      }
    } catch {
      setError('Failed to load jobs');
    }
  }, [apiUrl, corsProxy, refreshMs, maxItems]);

  useEffect(() => {
    if (!apiUrl) return;
    fetchJobs();
    const interval = setInterval(fetchJobs, refreshMs);
    return () => clearInterval(interval);
  }, [fetchJobs, refreshMs, apiUrl]);

  return (
    <View style={[s.container, { width, height, backgroundColor: `${theme.primary}20` }]}>
      {/* Header */}
      <View style={s.header}>
        <AppIcon name="puzzle" size={18} color={theme.accent} />
        <Text style={[s.headerText, { color: theme.accent }]}>{title}</Text>
        {jobs.length > 0 && (
          <View style={[s.countBadge, { backgroundColor: `${theme.accent}30` }]}>
            <Text style={[s.countText, { color: theme.accent }]}>{jobs.length}</Text>
          </View>
        )}
      </View>

      {error && <Text style={s.error}>{error}</Text>}

      {jobs.length === 0 && !error ? (
        <View style={s.emptyContainer}>
          <AppIcon name="puzzle" size={32} color="rgba(255,255,255,0.3)" />
          <Text style={s.emptyText}>No listings available</Text>
        </View>
      ) : (
        <ScrollView style={s.scrollView} showsVerticalScrollIndicator={false}>
          {jobs.map((job, index) => (
            <View key={`${job.title}-${job.company}-${index}`} style={[s.card, index < jobs.length - 1 && s.cardBorder]}>
              <View style={s.cardHeader}>
                <Text style={s.jobTitle} numberOfLines={1}>{job.title}</Text>
                {job.type && (
                  <View style={[s.typeBadge, { backgroundColor: `${TYPE_COLORS[job.type] ?? theme.accent}25` }]}>
                    <Text style={[s.typeText, { color: TYPE_COLORS[job.type] ?? theme.accent }]}>{job.type}</Text>
                  </View>
                )}
              </View>
              <View style={s.cardMeta}>
                {job.company && <Text style={s.metaText}>{job.company}</Text>}
                {job.company && job.location && <Text style={s.metaDot}>{'\u2022'}</Text>}
                {job.location && <Text style={s.metaText}>{job.location}</Text>}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {lastUpdated && (
        <View style={s.footer}>
          <Text style={s.updated}>
            Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { overflow: 'hidden', borderRadius: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  headerText: { fontSize: 16, fontWeight: '600', flex: 1 },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  countText: { fontSize: 12, fontWeight: '700' },
  scrollView: { flex: 1, paddingHorizontal: 16 },
  card: { paddingVertical: 10 },
  cardBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.1)' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  jobTitle: { flex: 1, color: 'white', fontSize: 14, fontWeight: '600' },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  typeText: { fontSize: 11, fontWeight: '600' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  metaText: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  metaDot: { color: 'rgba(255,255,255,0.3)', fontSize: 10 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  error: { color: '#ef4444', fontSize: 12, paddingHorizontal: 16, marginBottom: 4 },
  footer: { paddingHorizontal: 16, paddingBottom: 10 },
  updated: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
});

registerWidget({
  type: 'job-board',
  name: 'Job Board',
  description: 'Shows job and internship listings',
  icon: 'puzzle',
  minW: 3, minH: 3, defaultW: 4, defaultH: 4,
  component: JobBoard,
  defaultProps: { refreshInterval: 30, maxItems: 10, title: 'Job Board' },
});
