'use client';

import { useState, useEffect, useCallback } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { buildCacheKey, buildProxyUrl, fetchTextWithCache } from '@/lib/data-cache';
import { useFitScale } from '@/hooks/useFitScale';
import SimpleTableOptions from './SimpleTableOptions';

interface SimpleTableConfig {
  source?: 'url' | 'manual';
  csvUrl?: string;
  manualData?: string; // CSV string for manual entry
  title?: string;
  headerStyle?: 'accent' | 'subtle' | 'none';
  striped?: boolean;
  refreshInterval?: number;
  corsProxy?: string;
}

const DEMO_CSV = `Room,Availability,Hours
Library 3A,Available,8am – 10pm
Library 3B,Occupied,8am – 10pm
Study Room 101,Available,9am – 9pm
Computer Lab,Occupied,7am – 11pm
Conference Room B,Available,10am – 6pm`;

function parseCSV(text: string): string[][] {
  const lines = text.trim().split('\n');
  return lines.map((line) => {
    const row: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    row.push(current.trim());
    return row;
  });
}

export default function SimpleTable({ config, theme, corsProxy: globalCorsProxy }: WidgetComponentProps) {
  const tableConfig = config as SimpleTableConfig | undefined;
  const source = tableConfig?.source ?? 'manual';
  const csvUrl = tableConfig?.csvUrl?.trim() || '';
  const manualData = tableConfig?.manualData?.trim() || '';
  const title = tableConfig?.title?.trim() || '';
  const headerStyle = tableConfig?.headerStyle ?? 'accent';
  const striped = tableConfig?.striped ?? true;
  const refreshInterval = tableConfig?.refreshInterval ?? 30;
  const corsProxy = tableConfig?.corsProxy?.trim() || globalCorsProxy;

  const [rows, setRows] = useState<string[][]>(() => parseCSV(DEMO_CSV));
  const [error, setError] = useState<string | null>(null);

  const { containerRef, scale } = useFitScale(520, 500);

  const fetchCSV = useCallback(async () => {
    if (source === 'manual') {
      setRows(parseCSV(manualData || DEMO_CSV));
      setError(null);
      return;
    }
    if (!csvUrl) {
      setRows(parseCSV(DEMO_CSV));
      return;
    }
    try {
      setError(null);
      const url = buildProxyUrl(corsProxy, csvUrl);
      const { text } = await fetchTextWithCache(url, {
        cacheKey: buildCacheKey('table', csvUrl),
        ttlMs: refreshInterval * 60 * 1000,
      });
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        setError('No data found');
        return;
      }
      setRows(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load CSV');
    }
  }, [source, csvUrl, manualData, corsProxy, refreshInterval]);

  useEffect(() => {
    fetchCSV();
    if (source === 'url' && csvUrl) {
      const interval = setInterval(fetchCSV, refreshInterval * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [fetchCSV, source, csvUrl, refreshInterval]);

  const hasHeader = rows.length > 1;
  const headerRow = hasHeader ? rows[0] : null;
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const colCount = rows[0]?.length ?? 0;

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden"
      style={{ backgroundColor: `${theme.primary}10` }}
    >
      <div
        style={{
          width: 520,
          height: 500,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
        className="flex flex-col h-full p-4"
      >
        {/* Title */}
        {title && (
          <div className="text-lg font-semibold text-white mb-3 px-1">{title}</div>
        )}

        {error && (
          <div className="text-sm text-red-400 mb-2 px-1">{error}</div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-hidden rounded-lg" style={{ border: `1px solid ${theme.accent}20` }}>
          <table className="w-full text-sm">
            {headerRow && headerStyle !== 'none' && (
              <thead>
                <tr
                  style={{
                    backgroundColor: headerStyle === 'accent' ? `${theme.accent}25` : `${theme.accent}10`,
                  }}
                >
                  {headerRow.map((cell, i) => (
                    <th
                      key={i}
                      className="px-3 py-2.5 text-left font-semibold text-white/90 whitespace-nowrap"
                      style={headerStyle === 'accent' ? { borderBottom: `2px solid ${theme.accent}40` } : { borderBottom: `1px solid ${theme.accent}15` }}
                    >
                      {cell}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {dataRows.map((row, ri) => (
                <tr
                  key={ri}
                  style={{
                    backgroundColor: striped && ri % 2 === 1 ? `${theme.accent}06` : 'transparent',
                    borderBottom: `1px solid ${theme.accent}10`,
                  }}
                >
                  {Array.from({ length: colCount }).map((_, ci) => (
                    <td
                      key={ci}
                      className="px-3 py-2 text-white/70 whitespace-nowrap"
                    >
                      {row[ci] ?? ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Source indicator */}
        {!csvUrl && source === 'url' && (
          <div className="text-xs text-white/30 mt-2 text-right">Demo data</div>
        )}
      </div>
    </div>
  );
}

registerWidget({
  type: 'simple-table',
  name: 'Simple Table',
  description: 'Display tabular data from CSV or manual entry',
  icon: 'table',
  minW: 2,
  minH: 2,
  defaultW: 4,
  defaultH: 3,
  component: SimpleTable,
  OptionsComponent: SimpleTableOptions,
  defaultProps: {
    source: 'manual',
    csvUrl: '',
    manualData: '',
    title: '',
    headerStyle: 'accent',
    striped: true,
    refreshInterval: 30,
    corsProxy: '',
  },
});
