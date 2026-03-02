'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildProxyUrl } from '@/lib/data-cache';
import { registerWidget, WidgetComponentProps } from '@/lib/widget-registry';
import LibraryAvailabilityOptions from './LibraryAvailabilityOptions';

type DisplayMode = 'grid' | 'calendar' | 'cards';

interface LibraryAvailabilityConfig {
  title?: string;
  mode?: DisplayMode;
  endpoint?: string;
  lid?: number;
  gid?: number;
  pageSize?: number;
  daysToShow?: number;
  rotationSeconds?: number;
  refreshSeconds?: number;
  openHour?: number;
  closeHour?: number;
  corsProxy?: string;
}

interface LibCalSlot {
  start?: string;
  end?: string;
  itemId?: number;
}

interface LibCalGridResponse {
  slots?: LibCalSlot[];
  bookings?: unknown[];
  windowEnd?: boolean;
  isPreCreatedBooking?: boolean;
}

interface RoomInfo {
  id: number;
  name: string;
  capacity?: number;
}

interface TimeWindow {
  startIndex: number;
  endIndex: number;
}

interface RoomDayMetrics {
  slots: boolean[];
  openCount: number;
  windows: TimeWindow[];
  ratio: number;
}

interface DayMeta {
  key: string;
  date: Date;
  shortLabel: string;
  longLabel: string;
}

interface GridPage {
  kind: 'grid';
  dayIndex: number;
  slotStart: number;
  slotEnd: number;
  roomStart: number;
  roomEnd: number;
}

interface CalendarPage {
  kind: 'calendar';
  dayStart: number;
  dayEnd: number;
  roomStart: number;
  roomEnd: number;
}

interface CardsPage {
  kind: 'cards';
  dayIndex: number;
  roomStart: number;
  roomEnd: number;
  columns: number;
}

type WidgetPage = GridPage | CalendarPage | CardsPage;

const DEFAULT_ENDPOINT = 'https://unbc.libcal.com/spaces/availability/grid';
const SLOT_MINUTES = 30;

const DAY_SHORT_FORMAT = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

const DAY_LONG_FORMAT = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'short',
  day: 'numeric',
});

const ROOM_MAP: RoomInfo[] = [
  { id: 11258, name: 'Room 01', capacity: 4 },
  { id: 11261, name: 'Room 02', capacity: 4 },
  { id: 11262, name: 'Room 03', capacity: 4 },
  { id: 11263, name: 'Room 04', capacity: 4 },
  { id: 11264, name: 'Room 05', capacity: 4 },
  { id: 11265, name: 'Room 06', capacity: 4 },
  { id: 11266, name: 'Room 07', capacity: 6 },
  { id: 11267, name: 'Room 08', capacity: 4 },
  { id: 11268, name: 'Room 10', capacity: 2 },
  { id: 11271, name: 'Room 11', capacity: 2 },
  { id: 11272, name: 'Room 12', capacity: 2 },
  { id: 11269, name: 'Room 13', capacity: 2 },
  { id: 11270, name: 'Room 14', capacity: 2 },
  { id: 20467, name: 'Room 15', capacity: 2 },
];

const ROOM_ORDER = new Map<number, number>(ROOM_MAP.map((room, index) => [room.id, index]));

const pad2 = (value: number): string => String(value).padStart(2, '0');

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const startOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date: Date, days: number): Date => {
  const out = new Date(date);
  out.setDate(out.getDate() + days);
  return out;
};

const formatDateKey = (date: Date): string =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const minutesSinceMidnight = (date: Date): number =>
  date.getHours() * 60 + date.getMinutes();

const parseLibCalDateTime = (value?: string): Date | null => {
  if (!value) return null;
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] ?? '0');

  return new Date(year, month, day, hour, minute, second);
};

const formatClock = (totalMinutes: number): string => {
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const meridiem = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${pad2(minutes)} ${meridiem}`;
};

const formatRange = (window: TimeWindow, openHour: number): string => {
  const start = openHour * 60 + window.startIndex * SLOT_MINUTES;
  const end = openHour * 60 + window.endIndex * SLOT_MINUTES;
  return `${formatClock(start)} - ${formatClock(end)}`;
};

const metricKey = (roomId: number, dayKey: string): string => `${roomId}|${dayKey}`;

const buildMetrics = (slots: boolean[]): RoomDayMetrics => {
  const windows: TimeWindow[] = [];
  let openCount = 0;
  let openStart: number | null = null;

  slots.forEach((isOpen, index) => {
    if (isOpen) {
      openCount += 1;
      if (openStart === null) openStart = index;
      return;
    }

    if (openStart !== null) {
      windows.push({ startIndex: openStart, endIndex: index });
      openStart = null;
    }
  });

  if (openStart !== null) {
    windows.push({ startIndex: openStart, endIndex: slots.length });
  }

  return {
    slots,
    openCount,
    windows,
    ratio: slots.length > 0 ? openCount / slots.length : 0,
  };
};

const roomSortValue = (room: RoomInfo): number => {
  const known = ROOM_ORDER.get(room.id);
  if (typeof known === 'number') return known;
  return 1000 + room.id;
};

const describeError = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  return String(err);
};

function getNextOpenWindow(
  metrics: RoomDayMetrics,
  dayIndex: number,
  openHour: number,
): TimeWindow | null {
  if (metrics.windows.length === 0) return null;
  if (dayIndex !== 0) return metrics.windows[0];

  const now = new Date();
  const nowSlot = Math.floor((minutesSinceMidnight(now) - openHour * 60) / SLOT_MINUTES);

  for (const window of metrics.windows) {
    if (window.endIndex <= nowSlot) continue;
    return {
      startIndex: Math.max(window.startIndex, nowSlot),
      endIndex: window.endIndex,
    };
  }

  return null;
}

function availabilityColor(ratio: number): string {
  if (ratio >= 0.66) return 'rgba(34, 197, 94, 0.22)';
  if (ratio >= 0.33) return 'rgba(245, 158, 11, 0.2)';
  if (ratio > 0) return 'rgba(234, 88, 12, 0.2)';
  return 'rgba(239, 68, 68, 0.2)';
}

export default function LibraryAvailability({
  config,
  theme,
  corsProxy: globalCorsProxy,
}: WidgetComponentProps) {
  const widgetConfig = config as LibraryAvailabilityConfig | undefined;
  const title = widgetConfig?.title?.trim() || 'Library Study Room Availability';
  const mode = (widgetConfig?.mode ?? 'grid') as DisplayMode;
  const endpoint = widgetConfig?.endpoint?.trim() || DEFAULT_ENDPOINT;
  const lid = String(widgetConfig?.lid ?? 1637);
  const gid = String(widgetConfig?.gid ?? 2928);
  const pageSize = clamp(Math.round(widgetConfig?.pageSize ?? 99), 1, 500);
  const daysToShow = clamp(Math.round(widgetConfig?.daysToShow ?? 3), 1, 22);
  const rotationSeconds = clamp(Number(widgetConfig?.rotationSeconds ?? 8), 2, 120);
  const refreshSeconds = clamp(Number(widgetConfig?.refreshSeconds ?? 120), 30, 3600);
  const openHour = clamp(Math.round(widgetConfig?.openHour ?? 8), 0, 23);
  const closeHourRaw = clamp(Math.round(widgetConfig?.closeHour ?? 23), 1, 24);
  const closeHour = closeHourRaw <= openHour ? openHour + 1 : closeHourRaw;
  const localCorsProxy = widgetConfig?.corsProxy?.trim();
  const corsProxy = localCorsProxy || globalCorsProxy?.trim();

  const [response, setResponse] = useState<LibCalGridResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [pageIndex, setPageIndex] = useState(0);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const hasLoadedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const dayMeta = useMemo<DayMeta[]>(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: daysToShow }, (_, index) => {
      const date = addDays(today, index);
      return {
        key: formatDateKey(date),
        date,
        shortLabel: DAY_SHORT_FORMAT.format(date),
        longLabel: DAY_LONG_FORMAT.format(date),
      };
    });
  }, [daysToShow]);

  const slotCount = useMemo(
    () => Math.max(1, ((closeHour - openHour) * 60) / SLOT_MINUTES),
    [closeHour, openHour],
  );

  const emptyMetrics = useMemo(
    () => buildMetrics(Array.from({ length: slotCount }, () => false)),
    [slotCount],
  );

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const measure = () => {
      setSize({ width: element.clientWidth, height: element.clientHeight });
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const fetchAvailability = useCallback(
    async (signal?: AbortSignal) => {
      const firstDay = dayMeta[0]?.date;
      if (!firstDay) return;

      const start = formatDateKey(firstDay);
      const end = formatDateKey(addDays(firstDay, dayMeta.length));
      const targetUrl = buildProxyUrl(corsProxy, endpoint);

      const formData = new FormData();
      formData.set('lid', lid);
      formData.set('gid', gid);
      formData.set('start', start);
      formData.set('end', end);
      formData.set('pageSize', String(pageSize));

      if (hasLoadedRef.current) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const res = await fetch(targetUrl, {
          method: 'POST',
          body: formData,
          signal,
        });

        if (!res.ok) {
          throw new Error(`LibCal request failed (${res.status})`);
        }

        const json = (await res.json()) as LibCalGridResponse;
        if (signal?.aborted) return;

        setResponse(json);
        setLastUpdated(new Date());
      } catch (err) {
        if (signal?.aborted) return;
        setError(describeError(err));
      } finally {
        if (!signal?.aborted) {
          hasLoadedRef.current = true;
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [corsProxy, dayMeta, endpoint, gid, lid, pageSize],
  );

  useEffect(() => {
    const controller = new AbortController();

    fetchAvailability(controller.signal);

    const interval = setInterval(() => {
      fetchAvailability();
    }, refreshSeconds * 1000);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [fetchAvailability, refreshSeconds]);

  const processed = useMemo(() => {
    const dayKeys = dayMeta.map((day) => day.key);
    const dayKeySet = new Set(dayKeys);

    const roomById = new Map<number, RoomInfo>(
      ROOM_MAP.map((room) => [room.id, { ...room }]),
    );

    const buildDayMatrix = (): Map<string, boolean[]> => {
      const matrix = new Map<string, boolean[]>();
      dayKeys.forEach((key) => {
        matrix.set(
          key,
          Array.from({ length: slotCount }, () => false),
        );
      });
      return matrix;
    };

    const availability = new Map<number, Map<string, boolean[]>>();
    roomById.forEach((_room, roomId) => {
      availability.set(roomId, buildDayMatrix());
    });

    const slots = Array.isArray(response?.slots) ? response.slots : [];

    slots.forEach((slot) => {
      const start = parseLibCalDateTime(slot.start);
      if (!start) return;

      const end = parseLibCalDateTime(slot.end) ?? new Date(start.getTime() + SLOT_MINUTES * 60_000);
      const dayKey = formatDateKey(start);
      if (!dayKeySet.has(dayKey)) return;

      const roomId = Number(slot.itemId);
      if (!Number.isFinite(roomId)) return;

      if (!roomById.has(roomId)) {
        roomById.set(roomId, { id: roomId, name: `Room ${roomId}` });
      }

      if (!availability.has(roomId)) {
        availability.set(roomId, buildDayMatrix());
      }

      const roomDays = availability.get(roomId);
      const daySlots = roomDays?.get(dayKey);
      if (!daySlots) return;

      const startIndex = Math.floor(
        (minutesSinceMidnight(start) - openHour * 60) / SLOT_MINUTES,
      );
      const endIndex = Math.ceil(
        (minutesSinceMidnight(end) - openHour * 60) / SLOT_MINUTES,
      );

      for (
        let slotIndex = Math.max(0, startIndex);
        slotIndex < Math.min(slotCount, endIndex);
        slotIndex += 1
      ) {
        daySlots[slotIndex] = true;
      }
    });

    const rooms = Array.from(roomById.values()).sort(
      (a, b) => roomSortValue(a) - roomSortValue(b),
    );

    const metricsByRoomDay = new Map<string, RoomDayMetrics>();

    rooms.forEach((room) => {
      const roomDays = availability.get(room.id) ?? buildDayMatrix();
      dayKeys.forEach((dayKey) => {
        const roomDaySlots = roomDays.get(dayKey) ?? Array.from({ length: slotCount }, () => false);
        metricsByRoomDay.set(metricKey(room.id, dayKey), buildMetrics(roomDaySlots));
      });
    });

    return {
      rooms,
      metricsByRoomDay,
    };
  }, [dayMeta, openHour, response, slotCount]);

  const getMetrics = useCallback(
    (roomId: number, dayKey: string): RoomDayMetrics =>
      processed.metricsByRoomDay.get(metricKey(roomId, dayKey)) ?? emptyMetrics,
    [emptyMetrics, processed.metricsByRoomDay],
  );

  const pages = useMemo<WidgetPage[]>(() => {
    const width = size.width || 960;
    const height = size.height || 540;
    const roomCount = processed.rooms.length;

    if (mode === 'grid') {
      const roomLabelWidth = 160;
      const slotCellWidth = 28;
      const rowHeight = 30;
      const chromeHeight = 144;

      const slotsPerPage = clamp(
        Math.floor((width - roomLabelWidth - 24) / slotCellWidth),
        4,
        slotCount,
      );

      const rowsPerPage = clamp(
        Math.floor((height - chromeHeight) / rowHeight),
        2,
        Math.max(2, roomCount),
      );

      const out: WidgetPage[] = [];

      dayMeta.forEach((_day, dayIndex) => {
        for (let slotStart = 0; slotStart < slotCount; slotStart += slotsPerPage) {
          const slotEnd = Math.min(slotCount, slotStart + slotsPerPage);
          for (let roomStart = 0; roomStart < roomCount; roomStart += rowsPerPage) {
            out.push({
              kind: 'grid',
              dayIndex,
              slotStart,
              slotEnd,
              roomStart,
              roomEnd: Math.min(roomCount, roomStart + rowsPerPage),
            });
          }
        }
      });

      return out;
    }

    if (mode === 'calendar') {
      const roomLabelWidth = 166;
      const dayColumnWidth = 175;
      const rowHeight = 74;
      const chromeHeight = 138;

      const daysPerPage = clamp(
        Math.floor((width - roomLabelWidth - 24) / dayColumnWidth),
        1,
        dayMeta.length,
      );

      const rowsPerPage = clamp(
        Math.floor((height - chromeHeight) / rowHeight),
        1,
        Math.max(1, roomCount),
      );

      const out: WidgetPage[] = [];

      for (let dayStart = 0; dayStart < dayMeta.length; dayStart += daysPerPage) {
        const dayEnd = Math.min(dayMeta.length, dayStart + daysPerPage);
        for (let roomStart = 0; roomStart < roomCount; roomStart += rowsPerPage) {
          out.push({
            kind: 'calendar',
            dayStart,
            dayEnd,
            roomStart,
            roomEnd: Math.min(roomCount, roomStart + rowsPerPage),
          });
        }
      }

      return out;
    }

    const chromeHeight = 120;
    const cardMinWidth = 220;
    const cardHeight = 132;

    const columns = clamp(Math.floor((width - 16) / cardMinWidth), 1, 4);
    const rows = clamp(Math.floor((height - chromeHeight) / cardHeight), 1, 6);
    const cardsPerPage = Math.max(1, columns * rows);

    const out: WidgetPage[] = [];

    dayMeta.forEach((_day, dayIndex) => {
      for (let roomStart = 0; roomStart < roomCount; roomStart += cardsPerPage) {
        out.push({
          kind: 'cards',
          dayIndex,
          roomStart,
          roomEnd: Math.min(roomCount, roomStart + cardsPerPage),
          columns,
        });
      }
    });

    return out;
  }, [dayMeta, mode, processed.rooms.length, size.height, size.width, slotCount]);

  useEffect(() => {
    setPageIndex(0);
  }, [mode, dayMeta.length, processed.rooms.length, size.height, size.width, slotCount]);

  useEffect(() => {
    if (pageIndex < pages.length) return;
    setPageIndex(0);
  }, [pageIndex, pages.length]);

  useEffect(() => {
    if (pages.length <= 1) return;

    const interval = setInterval(() => {
      setPageIndex((prev) => (prev + 1) % pages.length);
    }, rotationSeconds * 1000);

    return () => clearInterval(interval);
  }, [pages.length, rotationSeconds]);

  const activePage = pages[pageIndex] ?? null;

  const pageSummary = useMemo(() => {
    if (!activePage) return '';

    if (activePage.kind === 'grid') {
      const day = dayMeta[activePage.dayIndex];
      const startMinute = openHour * 60 + activePage.slotStart * SLOT_MINUTES;
      const endMinute = openHour * 60 + activePage.slotEnd * SLOT_MINUTES;
      return `${day?.shortLabel ?? ''} · ${formatClock(startMinute)} to ${formatClock(endMinute)}`;
    }

    if (activePage.kind === 'calendar') {
      const firstDay = dayMeta[activePage.dayStart];
      const lastDay = dayMeta[Math.max(activePage.dayStart, activePage.dayEnd - 1)];
      if (!firstDay || !lastDay) return '';
      return firstDay.key === lastDay.key
        ? firstDay.shortLabel
        : `${firstDay.shortLabel} to ${lastDay.shortLabel}`;
    }

    const day = dayMeta[activePage.dayIndex];
    return day?.shortLabel ?? '';
  }, [activePage, dayMeta, openHour]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full p-4 flex flex-col gap-3 overflow-hidden"
      style={{
        background: `linear-gradient(160deg, ${theme.primary}30 0%, ${theme.background}55 100%)`,
      }}
    >
      <div className="flex items-start gap-3 justify-between">
        <div className="min-w-0">
          <h3 className="text-xl md:text-2xl font-bold leading-tight" style={{ color: theme.accent }}>
            {title}
          </h3>
          <p className="text-xs md:text-sm text-white/65 mt-1">
            Confirmed openings only. Missing slots are treated as unavailable.
          </p>
        </div>
        <div className="text-right text-[11px] md:text-xs text-white/60 whitespace-nowrap">
          <div>{pageSummary}</div>
          <div>
            {pages.length > 0 ? `Page ${pageIndex + 1} / ${pages.length}` : 'Page 1 / 1'}
          </div>
          <div>{refreshing ? 'Refreshing…' : lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Waiting for live data'}</div>
        </div>
      </div>

      {response?.windowEnd && (
        <div className="rounded-lg px-3 py-2 text-xs border" style={{ borderColor: `${theme.accent}66`, backgroundColor: `${theme.accent}1a`, color: theme.accent }}>
          Requested range touches the LibCal booking window limit (`windowEnd: true`).
        </div>
      )}

      {loading && !response && (
        <div className="flex-1 rounded-xl border border-white/15 bg-black/25 flex items-center justify-center text-white/70 text-sm">
          Loading live room availability…
        </div>
      )}

      {!loading && error && !response && (
        <div className="flex-1 rounded-xl border border-red-400/40 bg-red-500/10 flex items-center justify-center text-red-100 text-sm px-4 text-center">
          Failed to load availability: {error}
        </div>
      )}

      {!loading && activePage && (
        <div className="flex-1 min-h-0 rounded-xl border border-white/15 bg-black/20 p-2 md:p-3 overflow-hidden">
          {activePage.kind === 'grid' && (
            <div className="h-full flex flex-col min-h-0">
              <div className="flex items-center gap-3 mb-2 text-[11px] md:text-xs text-white/70">
                <span>Green: available</span>
                <span>Red: unavailable</span>
                <span>
                  Rooms {activePage.roomStart + 1}-{activePage.roomEnd} of {processed.rooms.length}
                </span>
              </div>

              <div
                className="grid gap-[2px] flex-1 min-h-0"
                style={{
                  gridTemplateColumns: `160px repeat(${activePage.slotEnd - activePage.slotStart}, minmax(0, 1fr))`,
                  gridAutoRows: '30px',
                }}
              >
                <div className="px-2 flex items-center text-[11px] md:text-xs font-semibold text-white/80">
                  Room
                </div>

                {Array.from({ length: activePage.slotEnd - activePage.slotStart }, (_, idx) => {
                  const slotIndex = activePage.slotStart + idx;
                  const minute = openHour * 60 + slotIndex * SLOT_MINUTES;
                  const showLabel = idx % 2 === 0 || activePage.slotEnd - activePage.slotStart <= 10;
                  return (
                    <div
                      key={`head-${slotIndex}`}
                      className="text-[10px] md:text-[11px] text-center text-white/70 px-0.5 truncate"
                    >
                      {showLabel ? formatClock(minute).replace(':00', '') : ''}
                    </div>
                  );
                })}

                {processed.rooms
                  .slice(activePage.roomStart, activePage.roomEnd)
                  .map((room) => {
                    const day = dayMeta[activePage.dayIndex];
                    const metrics = day ? getMetrics(room.id, day.key) : emptyMetrics;

                    return (
                      <Fragment key={`grid-room-${room.id}`}>
                        <div
                          className="px-2 text-[11px] md:text-xs text-white/80 flex items-center justify-between rounded-sm"
                          style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                        >
                          <span className="truncate">{room.name}</span>
                          <span className="text-white/50 text-[10px]">{room.capacity ? `(${room.capacity})` : ''}</span>
                        </div>

                        {Array.from({ length: activePage.slotEnd - activePage.slotStart }, (_, idx) => {
                          const slotIndex = activePage.slotStart + idx;
                          const isOpen = metrics.slots[slotIndex] ?? false;
                          return (
                            <div
                              key={`${room.id}-${slotIndex}`}
                              className="rounded-[2px] border border-white/10"
                              style={{
                                backgroundColor: isOpen
                                  ? 'rgba(34, 197, 94, 0.65)'
                                  : 'rgba(239, 68, 68, 0.30)',
                              }}
                              title={`${room.name} • ${formatClock(openHour * 60 + slotIndex * SLOT_MINUTES)} • ${isOpen ? 'Available' : 'Unavailable'}`}
                            />
                          );
                        })}
                      </Fragment>
                    );
                  })}
              </div>
            </div>
          )}

          {activePage.kind === 'calendar' && (
            <div className="h-full flex flex-col min-h-0">
              <div className="mb-2 text-[11px] md:text-xs text-white/70">
                Daily summary by room. Cells show free-time percentage and next open window.
              </div>

              <div
                className="grid gap-2 flex-1 min-h-0"
                style={{
                  gridTemplateColumns: `166px repeat(${activePage.dayEnd - activePage.dayStart}, minmax(0, 1fr))`,
                  gridAutoRows: '72px',
                }}
              >
                <div className="px-2 text-xs text-white/80 font-semibold flex items-center">Room</div>

                {dayMeta.slice(activePage.dayStart, activePage.dayEnd).map((day) => (
                  <div key={`header-${day.key}`} className="text-xs text-white/80 font-semibold flex items-center justify-center text-center">
                    {day.shortLabel}
                  </div>
                ))}

                {processed.rooms.slice(activePage.roomStart, activePage.roomEnd).map((room) => (
                  <Fragment key={`calendar-room-${room.id}`}>
                    <div
                      className="rounded-md p-2 text-xs text-white/80"
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                    >
                      <div className="font-semibold truncate">{room.name}</div>
                      <div className="text-white/55 mt-0.5">{room.capacity ? `${room.capacity} seats` : 'Capacity n/a'}</div>
                    </div>

                    {dayMeta.slice(activePage.dayStart, activePage.dayEnd).map((day, dayOffset) => {
                      const globalDayIndex = activePage.dayStart + dayOffset;
                      const metrics = getMetrics(room.id, day.key);
                      const nextWindow = getNextOpenWindow(metrics, globalDayIndex, openHour);
                      const freeHours = (metrics.openCount * SLOT_MINUTES) / 60;

                      return (
                        <div
                          key={`${room.id}-${day.key}`}
                          className="rounded-md p-2 border border-white/10"
                          style={{ backgroundColor: availabilityColor(metrics.ratio) }}
                        >
                          <div className="text-sm font-semibold text-white">
                            {Math.round(metrics.ratio * 100)}% free
                          </div>
                          <div className="text-[11px] text-white/70">{freeHours.toFixed(1)} open hrs</div>
                          <div className="text-[10px] text-white/70 mt-1 line-clamp-1">
                            {nextWindow ? formatRange(nextWindow, openHour) : 'No confirmed opening'}
                          </div>
                        </div>
                      );
                    })}
                  </Fragment>
                ))}
              </div>
            </div>
          )}

          {activePage.kind === 'cards' && (
            <div className="h-full flex flex-col min-h-0">
              <div className="mb-2 text-[11px] md:text-xs text-white/70">
                Room cards for {dayMeta[activePage.dayIndex]?.longLabel ?? ''}
              </div>

              <div
                className="grid gap-2 flex-1 min-h-0"
                style={{
                  gridTemplateColumns: `repeat(${activePage.columns}, minmax(0, 1fr))`,
                  gridAutoRows: '132px',
                }}
              >
                {processed.rooms
                  .slice(activePage.roomStart, activePage.roomEnd)
                  .map((room) => {
                    const day = dayMeta[activePage.dayIndex];
                    const metrics = day ? getMetrics(room.id, day.key) : emptyMetrics;
                    const nextWindow = getNextOpenWindow(metrics, activePage.dayIndex, openHour);
                    const freeHours = (metrics.openCount * SLOT_MINUTES) / 60;

                    return (
                      <div
                        key={`${room.id}-card`}
                        className="rounded-lg border border-white/15 p-2.5 flex flex-col"
                        style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-white truncate">{room.name}</div>
                            <div className="text-[11px] text-white/60">{room.capacity ? `${room.capacity} seats` : 'Capacity n/a'}</div>
                          </div>
                          <span
                            className="text-[10px] px-2 py-1 rounded-full"
                            style={{
                              backgroundColor: metrics.openCount > 0 ? 'rgba(34,197,94,0.18)' : 'rgba(239,68,68,0.2)',
                              color: metrics.openCount > 0 ? 'rgb(110 231 183)' : 'rgb(252 165 165)',
                            }}
                          >
                            {metrics.openCount > 0 ? 'Openings' : 'Full'}
                          </span>
                        </div>

                        <div className="mt-2 text-xs text-white/80">
                          {Math.round(metrics.ratio * 100)}% free · {freeHours.toFixed(1)} hrs open
                        </div>
                        <div className="text-[11px] text-white/65 mt-1 line-clamp-1">
                          {nextWindow ? `Next: ${formatRange(nextWindow, openHour)}` : 'No confirmed opening today'}
                        </div>

                        <div
                          className="mt-auto grid gap-[1px]"
                          style={{ gridTemplateColumns: `repeat(${slotCount}, minmax(0, 1fr))` }}
                        >
                          {metrics.slots.map((isOpen, index) => (
                            <div
                              key={`${room.id}-mini-${index}`}
                              className="h-1 rounded-[1px]"
                              style={{
                                backgroundColor: isOpen
                                  ? 'rgba(34, 197, 94, 0.75)'
                                  : 'rgba(239, 68, 68, 0.35)',
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {error && response && (
        <div className="text-[11px] md:text-xs text-red-200/85">Last refresh error: {error}</div>
      )}
    </div>
  );
}

registerWidget({
  type: 'library-availability',
  name: 'Library Availability',
  description: 'Live UNBC LibCal study-room openings',
  icon: 'calendar',
  minW: 4,
  minH: 3,
  defaultW: 6,
  defaultH: 4,
  component: LibraryAvailability,
  OptionsComponent: LibraryAvailabilityOptions,
  defaultProps: {
    title: 'Library Study Room Availability',
    mode: 'grid',
    endpoint: DEFAULT_ENDPOINT,
    lid: 1637,
    gid: 2928,
    pageSize: 99,
    daysToShow: 3,
    rotationSeconds: 8,
    refreshSeconds: 120,
    openHour: 8,
    closeHour: 23,
    corsProxy: '',
  },
});
