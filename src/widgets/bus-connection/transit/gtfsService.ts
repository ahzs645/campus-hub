/**
 * GTFS Service for Prince George Transit - UNBC Exchange
 *
 * Combines static schedule data with optional GTFS-realtime trip updates.
 */

import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import { ROUTES, STOP_SCHEDULE, SERVICE_DATES, STOP_INFO } from './gtfsData';

const POLL_INTERVAL = 30000;

export interface Trip {
  tripId: string;
  routeId: string;
  routeName: string;
  routeColor: string;
  headsign: string;
  arrivalTime: number;
  departureTime: number;
  isRealtime: boolean;
}

function dateToStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function getActiveServiceIds(dateStr: string): string[] {
  const active: string[] = [];
  for (const [serviceId, dates] of Object.entries(SERVICE_DATES)) {
    if (dates.includes(dateStr)) {
      active.push(serviceId);
    }
  }
  return active;
}

function gtfsTimeToDate(timeStr: string, baseDate: Date): Date {
  const [h, m, s] = timeStr.split(':').map(Number);
  const base = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  base.setSeconds(base.getSeconds() + h * 3600 + m * 60 + s);
  return base;
}

export function getScheduledTrips(simulatedNow: Date | null = null): Trip[] {
  const now = simulatedNow || new Date();
  const dateStr = dateToStr(now);
  const activeServiceIds = getActiveServiceIds(dateStr);
  if (activeServiceIds.length === 0) return [];

  const trips: Trip[] = [];

  for (const entry of STOP_SCHEDULE) {
    if (!activeServiceIds.includes(String(entry.serviceId))) continue;

    const arrivalDate = gtfsTimeToDate(entry.arrivalTime, now);
    const departureDate = gtfsTimeToDate(entry.departureTime, now);

    if (arrivalDate.getTime() < now.getTime() - 30000) continue;

    const route = ROUTES[entry.routeId];
    if (!route) continue;

    trips.push({
      tripId: entry.tripId,
      routeId: entry.routeId,
      routeName: route.shortName,
      routeColor: route.color,
      headsign: entry.headsign,
      arrivalTime: arrivalDate.getTime(),
      departureTime: departureDate.getTime(),
      isRealtime: false,
    });
  }

  trips.sort((a, b) => a.arrivalTime - b.arrivalTime);
  return trips;
}

interface RealtimeUpdate {
  arrivalDelay: number;
  departureDelay: number;
  arrivalTime: number | null;
  departureTime: number | null;
}

async function fetchRealtimeUpdates(proxyUrl: string): Promise<Map<string, RealtimeUpdate>> {
  try {
    const url = proxyUrl.endsWith('/')
      ? `${proxyUrl}tripupdates.pb?operatorIds=22`
      : `${proxyUrl}/tripupdates.pb?operatorIds=22`;

    const res = await fetch(url);
    if (!res.ok) return new Map();

    const buffer = await res.arrayBuffer();
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
      new Uint8Array(buffer)
    );

    const updates = new Map<string, RealtimeUpdate>();

    for (const entity of feed.entity) {
      if (!entity.tripUpdate) continue;

      const tripId = entity.tripUpdate.trip?.tripId;
      if (!tripId) continue;

      for (const stu of entity.tripUpdate.stopTimeUpdate || []) {
        if (String(stu.stopId) === STOP_INFO.stopId) {
          const arrivalTime = stu.arrival?.time;
          const departureTime = stu.departure?.time;
          updates.set(tripId, {
            arrivalDelay: stu.arrival?.delay ?? 0,
            departureDelay: stu.departure?.delay ?? 0,
            arrivalTime: arrivalTime ? Number(arrivalTime) : null,
            departureTime: departureTime ? Number(departureTime) : null,
          });
          break;
        }
      }
    }

    return updates;
  } catch (err) {
    console.warn('Failed to fetch realtime updates:', err);
    return new Map();
  }
}

function applyRealtimeUpdates(trips: Trip[], rtUpdates: Map<string, RealtimeUpdate>): Trip[] {
  return trips.map(trip => {
    const update = rtUpdates.get(trip.tripId);
    if (!update) return trip;

    if (update.arrivalTime) {
      return {
        ...trip,
        arrivalTime: update.arrivalTime * 1000,
        departureTime: (update.departureTime || update.arrivalTime) * 1000,
        isRealtime: true,
      };
    }

    return {
      ...trip,
      arrivalTime: trip.arrivalTime + update.arrivalDelay * 1000,
      departureTime: trip.departureTime + update.departureDelay * 1000,
      isRealtime: true,
    };
  });
}

export function createLiveTripProvider(
  onUpdate: (trips: Trip[]) => void,
  proxyUrl?: string
) {
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let rtUpdates = new Map<string, RealtimeUpdate>();

  async function refresh() {
    if (proxyUrl) {
      rtUpdates = await fetchRealtimeUpdates(proxyUrl);
    }
    const scheduled = getScheduledTrips();
    const merged = proxyUrl ? applyRealtimeUpdates(scheduled, rtUpdates) : scheduled;
    onUpdate(merged);
  }

  return {
    start() {
      refresh();
      intervalId = setInterval(refresh, POLL_INTERVAL);
    },
    stop() {
      if (intervalId) clearInterval(intervalId);
      intervalId = null;
    },
  };
}
