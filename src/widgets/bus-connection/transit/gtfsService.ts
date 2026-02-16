/**
 * GTFS Service for Prince George Transit - UNBC Exchange
 *
 * Uses static schedule data to provide upcoming trip information.
 */

import { ROUTES, STOP_SCHEDULE, SERVICE_DATES } from './gtfsData';

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

export function createLiveTripProvider(onUpdate: (trips: Trip[]) => void) {
  let intervalId: ReturnType<typeof setInterval> | null = null;

  function refresh() {
    const scheduled = getScheduledTrips();
    onUpdate(scheduled);
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
