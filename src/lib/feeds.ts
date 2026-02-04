export interface RssItem {
  title: string;
  link?: string;
  pubDate?: string;
  categories?: string[];
  description?: string;
  guid?: string;
}

export interface ICalEvent {
  uid?: string;
  summary: string;
  start?: Date;
  end?: Date;
  startRaw?: string;
  endRaw?: string;
  location?: string;
  description?: string;
  url?: string;
}

const textContent = (element: Element | null): string =>
  (element?.textContent ?? '').trim();

export function parseRss(text: string): RssItem[] {
  try {
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'text/xml');
    const items = Array.from(xml.querySelectorAll('item'));
    return items
      .map((item) => {
        const categories = Array.from(item.querySelectorAll('category'))
          .map((cat) => textContent(cat))
          .filter(Boolean);
        return {
          title: textContent(item.querySelector('title')),
          link: textContent(item.querySelector('link')),
          pubDate: textContent(item.querySelector('pubDate')),
          description: textContent(item.querySelector('description')),
          guid: textContent(item.querySelector('guid')),
          categories: categories.length > 0 ? categories : undefined,
        };
      })
      .filter((item) => item.title.length > 0);
  } catch {
    return [];
  }
}

const unfoldIcs = (text: string): string => text.replace(/\r?\n[ \t]/g, '');

const parseIcsDate = (value: string | undefined): Date | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const dateOnlyMatch = /^\d{8}$/.test(trimmed);
  if (dateOnlyMatch) {
    const year = Number(trimmed.slice(0, 4));
    const month = Number(trimmed.slice(4, 6));
    const day = Number(trimmed.slice(6, 8));
    return new Date(year, month - 1, day);
  }

  const zonedMatch = /^(\d{8})T(\d{6})Z$/.test(trimmed);
  if (zonedMatch) {
    const year = Number(trimmed.slice(0, 4));
    const month = Number(trimmed.slice(4, 6));
    const day = Number(trimmed.slice(6, 8));
    const hour = Number(trimmed.slice(9, 11));
    const minute = Number(trimmed.slice(11, 13));
    const second = Number(trimmed.slice(13, 15));
    return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  }

  const localMatch = /^(\d{8})T(\d{4,6})$/.test(trimmed);
  if (localMatch) {
    const year = Number(trimmed.slice(0, 4));
    const month = Number(trimmed.slice(4, 6));
    const day = Number(trimmed.slice(6, 8));
    const time = trimmed.slice(9);
    const hour = Number(time.slice(0, 2));
    const minute = Number(time.slice(2, 4));
    const second = Number(time.slice(4, 6) || '0');
    return new Date(year, month - 1, day, hour, minute, second);
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

export function parseICal(text: string): ICalEvent[] {
  const events: ICalEvent[] = [];
  try {
    const lines = unfoldIcs(text).split(/\r?\n/);
    let current: Record<string, string> | null = null;

    for (const line of lines) {
      if (line.startsWith('BEGIN:VEVENT')) {
        current = {};
        continue;
      }
      if (line.startsWith('END:VEVENT')) {
        if (current) {
          const summary = current.SUMMARY ?? 'Event';
          events.push({
            uid: current.UID,
            summary,
            start: parseIcsDate(current.DTSTART),
            end: parseIcsDate(current.DTEND),
            startRaw: current.DTSTART,
            endRaw: current.DTEND,
            location: current.LOCATION,
            description: current.DESCRIPTION,
            url: current.URL,
          });
        }
        current = null;
        continue;
      }
      if (!current) continue;

      const separatorIndex = line.indexOf(':');
      if (separatorIndex === -1) continue;
      const rawKey = line.slice(0, separatorIndex);
      const value = line.slice(separatorIndex + 1);
      const key = rawKey.split(';')[0].toUpperCase();
      if (!current[key]) {
        current[key] = value;
      }
    }
  } catch {
    return events;
  }
  return events;
}
