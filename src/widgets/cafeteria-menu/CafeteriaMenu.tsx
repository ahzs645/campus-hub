'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import {
  buildCacheKey,
  buildProxyUrl,
  fetchJsonWithCache,
  fetchTextWithCache,
} from '@/lib/data-cache';
import AppIcon from '@/components/AppIcon';
import CafeteriaMenuOptions from './CafeteriaMenuOptions';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface MenuItem {
  name: string;
  description?: string;
  dietary?: string[]; // e.g. "VG", "GF", "DF"
}

interface MealSection {
  title: string;
  items: MenuItem[];
}

interface ParsedMenu {
  weekly: MealSection[];
  breakfast: MealSection[];
  lunch: MealSection[];
  dinner: MealSection[];
  showtime: MealSection[];
}

type MealPeriod = 'breakfast' | 'lunch' | 'dinner';

interface ServiceWindows {
  breakfastStart: string;
  breakfastEnd: string;
  lunchStart: string;
  lunchEnd: string;
  dinnerStart: string;
  dinnerEnd: string;
}

interface CafeteriaConfig {
  menuUrl?: string;
  danaLocations?: string;    // comma-separated Dana Hospitality loc IDs e.g. "48784"
  refreshInterval?: number;  // minutes
  corsProxy?: string;
  weekdayBreakfastStart?: string; // HH:MM
  weekdayBreakfastEnd?: string;   // HH:MM
  weekdayLunchStart?: string;     // HH:MM
  weekdayLunchEnd?: string;       // HH:MM
  weekdayDinnerStart?: string;    // HH:MM
  weekdayDinnerEnd?: string;      // HH:MM
  weekendBreakfastStart?: string; // HH:MM
  weekendBreakfastEnd?: string;   // HH:MM
  weekendLunchStart?: string;     // HH:MM
  weekendLunchEnd?: string;       // HH:MM
  weekendDinnerStart?: string;    // HH:MM
  weekendDinnerEnd?: string;      // HH:MM

  // Backwards compatibility with older widget configs
  breakfastEnd?: string;     // HH:MM
  lunchEnd?: string;         // HH:MM
  dinnerEnd?: string;        // HH:MM
}

/* ------------------------------------------------------------------ */
/*  Time helpers                                                       */
/* ------------------------------------------------------------------ */

const timeToMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

const DEFAULT_WEEKDAY_WINDOWS: ServiceWindows = {
  breakfastStart: '07:00',
  breakfastEnd: '10:45',
  lunchStart: '11:00',
  lunchEnd: '15:45',
  dinnerStart: '16:00',
  dinnerEnd: '23:00',
};

const DEFAULT_WEEKEND_WINDOWS: ServiceWindows = {
  breakfastStart: '08:00',
  breakfastEnd: '10:45',
  lunchStart: '11:00',
  lunchEnd: '15:45',
  dinnerStart: '16:00',
  dinnerEnd: '22:00',
};

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

const readTimeValue = (value: string | undefined, fallback: string): string => {
  const trimmed = value?.trim();
  return trimmed && /^\d{1,2}:\d{2}$/.test(trimmed) ? trimmed : fallback;
};

const getServiceWindows = (config: CafeteriaConfig, date = new Date()): ServiceWindows => {
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  const defaults = isWeekend ? DEFAULT_WEEKEND_WINDOWS : DEFAULT_WEEKDAY_WINDOWS;

  if (isWeekend) {
    return {
      breakfastStart: readTimeValue(config.weekendBreakfastStart, defaults.breakfastStart),
      breakfastEnd: readTimeValue(config.weekendBreakfastEnd ?? config.breakfastEnd, defaults.breakfastEnd),
      lunchStart: readTimeValue(config.weekendLunchStart, defaults.lunchStart),
      lunchEnd: readTimeValue(config.weekendLunchEnd ?? config.lunchEnd, defaults.lunchEnd),
      dinnerStart: readTimeValue(config.weekendDinnerStart, defaults.dinnerStart),
      dinnerEnd: readTimeValue(config.weekendDinnerEnd ?? config.dinnerEnd, defaults.dinnerEnd),
    };
  }

  return {
    breakfastStart: readTimeValue(config.weekdayBreakfastStart, defaults.breakfastStart),
    breakfastEnd: readTimeValue(config.weekdayBreakfastEnd ?? config.breakfastEnd, defaults.breakfastEnd),
    lunchStart: readTimeValue(config.weekdayLunchStart, defaults.lunchStart),
    lunchEnd: readTimeValue(config.weekdayLunchEnd ?? config.lunchEnd, defaults.lunchEnd),
    dinnerStart: readTimeValue(config.weekdayDinnerStart, defaults.dinnerStart),
    dinnerEnd: readTimeValue(config.weekdayDinnerEnd ?? config.dinnerEnd, defaults.dinnerEnd),
  };
};

const getCurrentMealPeriod = (config: CafeteriaConfig): MealPeriod => {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const windows = getServiceWindows(config, now);

  const breakfastStart = timeToMinutes(windows.breakfastStart);
  const breakfastEnd = timeToMinutes(windows.breakfastEnd);
  const lunchStart = timeToMinutes(windows.lunchStart);
  const lunchEnd = timeToMinutes(windows.lunchEnd);
  const dinnerStart = timeToMinutes(windows.dinnerStart);
  const dinnerEnd = timeToMinutes(windows.dinnerEnd);

  if (mins >= breakfastStart && mins < breakfastEnd) return 'breakfast';
  if (mins >= lunchStart && mins < lunchEnd) return 'lunch';
  if (mins >= dinnerStart && mins < dinnerEnd) return 'dinner';

  // Outside a service window, show the next upcoming service.
  if (mins < breakfastStart) return 'breakfast';
  if (mins < lunchStart) return 'lunch';
  if (mins < dinnerStart) return 'dinner';
  return 'breakfast';
};

const MEAL_LABELS: Record<MealPeriod, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
};

/* ------------------------------------------------------------------ */
/*  Dana Hospitality menu.asp parser                                   */
/* ------------------------------------------------------------------ */

/**
 * Parse HTML returned by menu.danahospitality.ca/unbc/menu.asp?loc=XXXXX
 *
 * Dana Hospitality pages typically contain menu items in table rows or
 * divs with item names in bold/strong tags, optional descriptions, and
 * dietary icons (img alt text like "VG", "GF", "DF").
 */
const parseDanaGridCellItems = (cellHtml: string): string[] => {
  const items: string[] = [];
  let match;

  const dtPattern = /<dt[^>]*class=["'][^"']*Grid_ItemTitle[^"']*["'][^>]*>([\s\S]*?)<\/dt>/gi;
  while ((match = dtPattern.exec(cellHtml)) !== null) {
    const text = stripHtml(match[1] ?? '').replace(/\s+/g, ' ').trim();
    if (text) items.push(text);
  }
  if (items.length > 0) return items;

  const liPattern = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  while ((match = liPattern.exec(cellHtml)) !== null) {
    const text = stripHtml(match[1] ?? '').replace(/\s+/g, ' ').trim();
    if (text) items.push(text);
  }
  if (items.length > 0) return items;

  const pPattern = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  while ((match = pPattern.exec(cellHtml)) !== null) {
    const text = stripHtml(match[1] ?? '').replace(/\s+/g, ' ').trim();
    if (text) items.push(text);
  }

  return items;
};

const parseDanaWeeklyGridSections = (html: string): MealSection[] => {
  const tableMatch = html.match(
    /<table[^>]*id=["']WeeklyMenuAtAGlance["'][^>]*>([\s\S]*?)<\/table>/i,
  );
  if (!tableMatch) return [];

  const tableHtml = tableMatch[1] ?? '';
  const parsedSections: MealSection[] = [];
  const sectionPattern = /<tr[^>]*class=["']section["'][^>]*>[\s\S]*?<span[^>]*class=["'][^"']*MenuSection[^"']*["'][^>]*>([\s\S]*?)<\/span>[\s\S]*?<\/tr>\s*<tr[^>]*>[\s\S]*?<\/tr>\s*<tr[^>]*>([\s\S]*?)<\/tr>/gi;

  let match;
  while ((match = sectionPattern.exec(tableHtml)) !== null) {
    const title = stripHtml(match[1] ?? '').replace(/\s+/g, ' ').trim();
    if (!title) continue;

    const rowHtml = match[2] ?? '';
    const cells = [
      ...rowHtml.matchAll(
        /<td[^>]*class=["'][^"']*sectioncontent[^"']*["'][^>]*>([\s\S]*?)<\/td>/gi,
      ),
    ].map(m => m[1] ?? '');
    if (cells.length === 0) continue;

    const items: MenuItem[] = [];
    for (let i = 0; i < Math.min(cells.length, DAY_NAMES.length); i += 1) {
      const dayItems = parseDanaGridCellItems(cells[i] ?? '');
      if (dayItems.length === 0) continue;
      items.push({ name: `${DAY_NAMES[i]}: ${dayItems.join(' • ')}` });
    }

    if (items.length > 0) parsedSections.push({ title, items });
  }

  const focusedSections = parsedSections.filter(({ title }) =>
    /born of fire|showtime|weekly\s*special|breakfast|lunch|dinner|supper/i.test(title),
  );
  return focusedSections.length > 0 ? focusedSections : parsedSections;
};

const parseDanaMenuHtml = (html: string): MealSection[] => {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');

  // Dana's weekly grid format powers UNBC's "Weekly Specials" tab.
  const weeklyGridSections = parseDanaWeeklyGridSections(cleaned);
  if (weeklyGridSections.length > 0) return weeklyGridSections;

  const sections: MealSection[] = [];
  const items: MenuItem[] = [];
  const seen = new Set<string>();

  // Extract dietary icons from img alt attributes near each item
  const extractDietary = (fragment: string): string[] => {
    const tags: string[] = [];
    const imgPattern = /<img[^>]*alt="([^"]{1,10})"[^>]*>/gi;
    let m;
    while ((m = imgPattern.exec(fragment)) !== null) {
      const alt = (m[1] ?? '').trim().toUpperCase();
      if (alt && !tags.includes(alt)) tags.push(alt);
    }
    return tags;
  };

  // Strategy 1: Table rows — many Dana menus use <tr> with item name in first <td>
  const trPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let match;
  while ((match = trPattern.exec(cleaned)) !== null) {
    const row = match[1] ?? '';
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => m[1] ?? '');
    if (cells.length === 0) continue;

    const nameRaw = stripHtml(cells[0] ?? '').trim();
    const descRaw = cells.length > 1 ? stripHtml(cells[1] ?? '').trim() : undefined;
    const dietary = extractDietary(row);

    if (nameRaw && nameRaw.length > 1 && nameRaw.length < 200 && !seen.has(nameRaw.toLowerCase())) {
      seen.add(nameRaw.toLowerCase());
      items.push({
        name: nameRaw,
        description: descRaw || undefined,
        dietary: dietary.length > 0 ? dietary : undefined,
      });
    }
  }

  // Strategy 2: Bold/strong items (if no table rows found)
  if (items.length === 0) {
    const strongPattern = /<(?:strong|b|h[2-5])[^>]*>([\s\S]*?)<\/(?:strong|b|h[2-5])>/gi;
    while ((match = strongPattern.exec(cleaned)) !== null) {
      const text = stripHtml(match[1] ?? '').trim();
      if (text && text.length > 2 && text.length < 150 && !seen.has(text.toLowerCase())) {
        seen.add(text.toLowerCase());
        items.push({ name: text });
      }
    }
  }

  // Strategy 3: List items
  if (items.length === 0) {
    const liPattern = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    while ((match = liPattern.exec(cleaned)) !== null) {
      const text = stripHtml(match[1] ?? '').trim();
      if (text && text.length > 1 && text.length < 200 && !seen.has(text.toLowerCase())) {
        seen.add(text.toLowerCase());
        items.push({ name: text });
      }
    }
  }

  // Strategy 4: Paragraphs
  if (items.length === 0) {
    const pPattern = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    while ((match = pPattern.exec(cleaned)) !== null) {
      const text = stripHtml(match[1] ?? '').trim();
      if (text && text.length > 2 && text.length < 200 && !seen.has(text.toLowerCase())) {
        seen.add(text.toLowerCase());
        items.push({ name: text });
      }
    }
  }

  if (items.length > 0) {
    sections.push({ title: 'Menu', items });
  }

  return sections;
};

/* ------------------------------------------------------------------ */
/*  WordPress REST API parser (icaneat.ca)                             */
/* ------------------------------------------------------------------ */

interface WpPage {
  id: number;
  slug: string;
  title?: { rendered?: string };
  content?: { rendered?: string };
}

/**
 * Discover Dana Hospitality iframe URLs from the WordPress page content.
 * The Divi builder embeds iframes pointing to menu.danahospitality.ca.
 */
const extractDanaIframeUrls = (html: string): string[] => {
  const decodeHtmlEntities = (value: string): string =>
    value
      .replace(/\\\//g, '/')
      .replace(/&amp;|&#038;/g, '&')
      .replace(/&#8220;|&#8221;|&quot;/g, '"')
      .replace(/&#x2F;/gi, '/');

  const withGridParam = (rawUrl: string): string => {
    const normalized = decodeHtmlEntities(rawUrl)
      .replace(/menu\.dinahospitality\.ca/gi, 'menu.danahospitality.ca')
      .trim();

    if (!normalized) return '';
    if (/[\?&]grid=/i.test(normalized)) return normalized;
    return `${normalized}${normalized.includes('?') ? '&' : '?'}grid=1`;
  };

  const normalizedHtml = decodeHtmlEntities(html);
  const urls: string[] = [];
  const iframePattern = /<iframe[^>]*src="([^"]*menu\.d[ai]nahospitality[^"]*)"/gi;
  let match;
  while ((match = iframePattern.exec(normalizedHtml)) !== null) {
    const url = withGridParam(match[1] ?? '');
    if (url && !urls.includes(url)) urls.push(url);
  }
  // Also check for direct anchor links to menu.danahospitality.ca
  const linkPattern = /href="([^"]*menu\.d[ai]nahospitality[^"]*)"/gi;
  while ((match = linkPattern.exec(normalizedHtml)) !== null) {
    const url = withGridParam(match[1] ?? '');
    if (url && !urls.includes(url)) urls.push(url);
  }

  // Last resort: extract plain URLs embedded in shortcode blobs.
  const rawUrlPattern = /https?:\/\/menu\.d[ai]nahospitality\.ca\/[^\s"'<>\\]+/gi;
  while ((match = rawUrlPattern.exec(normalizedHtml)) !== null) {
    const url = withGridParam(match[0] ?? '');
    if (url && !urls.includes(url)) urls.push(url);
  }

  return urls;
};

/**
 * Categorise sections from the WordPress page by looking at heading/title keywords
 * near the embedded content.
 */
const categoriseWpContent = (html: string): ParsedMenu => {
  const result: ParsedMenu = {
    weekly: [],
    breakfast: [],
    lunch: [],
    dinner: [],
    showtime: [],
  };

  // Split by major headings to find labelled sections
  const fragments = html.split(/<h[1-4][^>]*>/i);

  for (const frag of fragments) {
    const fragLower = frag.toLowerCase();
    const items = extractItemsFromGenericHtml(frag);
    if (items.length === 0) continue;

    const titleMatch = frag.match(/^([\s\S]*?)<\/h[1-4]>/i);
    const title = stripHtml(titleMatch?.[1] ?? '').trim();
    const section: MealSection = { title: title || 'Menu', items };

    if (/showtime/i.test(fragLower)) {
      result.showtime.push(section);
    } else if (/weekly\s*special|special/i.test(fragLower)) {
      result.weekly.push(section);
    } else if (/breakfast|morning|brunch/i.test(fragLower)) {
      result.breakfast.push(section);
    } else if (/dinner|supper|evening/i.test(fragLower)) {
      result.dinner.push(section);
    } else if (/lunch|midday|entrée|entree/i.test(fragLower)) {
      result.lunch.push(section);
    } else {
      result.weekly.push(section);
    }
  }

  return result;
};

/* ------------------------------------------------------------------ */
/*  Generic HTML item extractor (fallback)                             */
/* ------------------------------------------------------------------ */

const extractItemsFromGenericHtml = (html: string): MenuItem[] => {
  const items: MenuItem[] = [];
  const seen = new Set<string>();
  let match;

  const liPattern = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  while ((match = liPattern.exec(html)) !== null) {
    const text = stripHtml(match[1] ?? '').trim();
    if (text && text.length > 1 && text.length < 200 && !seen.has(text.toLowerCase())) {
      seen.add(text.toLowerCase());
      items.push({ name: text });
    }
  }
  if (items.length > 0) return items;

  const pPattern = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  while ((match = pPattern.exec(html)) !== null) {
    const text = stripHtml(match[1] ?? '').trim();
    if (text && text.length > 2 && text.length < 200 && !seen.has(text.toLowerCase())) {
      seen.add(text.toLowerCase());
      items.push({ name: text });
    }
  }
  if (items.length > 0) return items;

  const strongPattern = /<(?:strong|b)[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi;
  while ((match = strongPattern.exec(html)) !== null) {
    const text = stripHtml(match[1] ?? '').trim();
    if (text && text.length > 2 && text.length < 100 && !seen.has(text.toLowerCase())) {
      seen.add(text.toLowerCase());
      items.push({ name: text });
    }
  }

  return items;
};

const stripHtml = (html: string): string =>
  html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#\d+;/g, '')
    .trim();

const hasAnyMenuContent = (parsed: ParsedMenu): boolean =>
  parsed.weekly.length + parsed.breakfast.length + parsed.lunch.length +
  parsed.dinner.length + parsed.showtime.length > 0;

/* ------------------------------------------------------------------ */
/*  Demo data                                                          */
/* ------------------------------------------------------------------ */

const DEMO_MENU: ParsedMenu = {
  weekly: [
    {
      title: 'Weekly Specials',
      items: [
        { name: 'Born of Fire Lunch, Born of Fire Dinner, and Showtime rotate by day.' },
      ],
    },
  ],
  breakfast: [
    {
      title: 'Breakfast',
      items: [
        { name: 'Scrambled Eggs & Toast' },
        { name: 'Pancakes with Maple Syrup' },
        { name: 'Fresh Fruit & Yogurt' },
        { name: 'Breakfast Burrito' },
      ],
    },
  ],
  lunch: [
    {
      title: 'Born of Fire Lunch',
      items: [
        { name: 'Sunday: Chicken Fajitas • Seasoned Rice • Daily Vegetables' },
        { name: 'Monday: Fried Chicken • Seasoned Rice • Baked Beans • Daily Vegetables' },
        { name: 'Tuesday: Build your Own Fish Taco • Seasoned Rice • Taco Fixings' },
        { name: 'Wednesday: Daily Vegetables • Chicken Cordon Bleu Casserole • Roasted herb Potatoes' },
        { name: 'Thursday: Daily Vegetables • Chicken & Sausage Jambalaya • Roasted Sweet Potato • Garlic Toast' },
        { name: 'Friday: Daily Vegetables • Beef and Bean Chimichangas • Seasoned Rice • Daily Vegetables' },
        { name: 'Saturday: Tuscan Beef Ravioli • Seasoned Rice • Daily Vegetables • Garlic Toast' },
      ],
    },
  ],
  dinner: [
    {
      title: 'Born of Fire Dinner',
      items: [
        { name: 'Sunday: Daily Vegetables • Buffalo Chicken Macaroni and Cheese (HALAL) • Garlic Toast' },
        { name: 'Monday: Chipotle Chicken Pasta Cassarole (HALAL) • Roasted Yam and Potato • Garlic Toast • Daily Vegetables' },
        { name: 'Tuesday: Karage Chicken Stir Fry with Orange Ginger Sauce (HALAL) • Seasoned Rice • Daily Vegetables' },
        { name: 'Wednesday: Daily Vegetables • Red Thai Chicken Curry (HALAL)' },
        { name: 'Thursday: Chicken Fettuccine Alfredo (HALAL) • Seasoned Rice • Daily Vegetables • Garlic Toast' },
        { name: 'Friday: Daily Vegetables • Chicken Hunan Kung Pao (HALAL) • Seasoned Rice • Spring Roll' },
        { name: 'Saturday: Daily Vegetables • Baked Beef Lasagna (Halal) • Seasoned Rice • Garlic Toast' },
      ],
    },
  ],
  showtime: [
    {
      title: 'Showtime',
      items: [
        { name: 'Monday: Pizza Dogs' },
        { name: 'Tuesday: Greek Style Power Bowl' },
        { name: 'Wednesday: Custom Chicken or Falafel Pitas' },
        { name: 'Thursday: Quinoa Buddha Bowl' },
        { name: 'Friday: Buffalo Chicken Poutine' },
      ],
    },
  ],
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function CafeteriaMenu({
  config,
  theme,
  corsProxy: globalCorsProxy,
}: WidgetComponentProps) {
  const cfg = config as CafeteriaConfig | undefined;
  const menuUrl = cfg?.menuUrl?.trim() || 'https://unbc.icaneat.ca/menu/';
  const danaLocations = cfg?.danaLocations?.trim() || '48784';
  const refreshInterval = cfg?.refreshInterval ?? 30;
  const corsProxy = cfg?.corsProxy?.trim() || globalCorsProxy;

  const [menu, setMenu] = useState<ParsedMenu>(DEMO_MENU);
  const [isDemo, setIsDemo] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [mealPeriod, setMealPeriod] = useState<MealPeriod>(() =>
    getCurrentMealPeriod(cfg ?? {}),
  );

  const refreshMs = refreshInterval * 60 * 1000;

  // Update meal period every minute
  useEffect(() => {
    const tick = () => setMealPeriod(getCurrentMealPeriod(cfg ?? {}));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [cfg]);

  // ---- Data fetching pipeline ----
  // Priority:
  //   1. Dana Hospitality direct (if loc IDs configured)
  //   2. WordPress REST API discovery → Dana iframe URLs
  //   3. Generic HTML parse of the menu page

  const fetchMenu = useCallback(async () => {
    if (!corsProxy) return; // stay on demo data

    try {
      setError(null);
      let result: ParsedMenu | null = null;

      // --- Strategy 1: Dana Hospitality direct endpoints ---
      if (danaLocations) {
        const locIds = danaLocations.split(',').map(s => s.trim()).filter(Boolean);
        const allSections: MealSection[] = [];

        for (const loc of locIds) {
          const danaUrl = `https://menu.danahospitality.ca/unbc/menu.asp?loc=${loc}&grid=1`;
          try {
            const { text } = await fetchTextWithCache(
              buildProxyUrl(corsProxy, danaUrl),
              {
                cacheKey: buildCacheKey('cafeteria-dana', loc),
                ttlMs: refreshMs,
              },
            );
            const sections = parseDanaMenuHtml(text);
            allSections.push(...sections);
          } catch {
            // Individual location failed — continue with others
          }
        }

        if (allSections.length > 0) {
          result = categorizeDanaSections(allSections);
        }
      }

      // --- Strategy 2: WordPress REST API discovery ---
      if (!result) {
        try {
          // Extract base domain from menuUrl
          const baseUrl = new URL(menuUrl).origin;
          const wpApiUrl = `${baseUrl}/wp-json/wp/v2/pages?slug=menu&_fields=id,slug,content`;
          const { data: pages } = await fetchJsonWithCache<WpPage[]>(
            buildProxyUrl(corsProxy, wpApiUrl),
            {
              cacheKey: buildCacheKey('cafeteria-wp', wpApiUrl),
              ttlMs: refreshMs,
            },
          );

          if (pages && pages.length > 0) {
            const content = pages[0]?.content?.rendered ?? '';

            // Try to discover Dana Hospitality iframe URLs
            const danaUrls = extractDanaIframeUrls(content);
            if (danaUrls.length > 0) {
              const allSections: MealSection[] = [];
              for (const url of danaUrls) {
                try {
                  const { text } = await fetchTextWithCache(
                    buildProxyUrl(corsProxy, url),
                    {
                      cacheKey: buildCacheKey('cafeteria-dana-disc', url),
                      ttlMs: refreshMs,
                    },
                  );
                  allSections.push(...parseDanaMenuHtml(text));
                } catch {
                  // continue
                }
              }
              if (allSections.length > 0) {
                result = categorizeDanaSections(allSections);
              }
            }

            // If no Dana iframes found, parse the WP content directly
            if (!result && content) {
              const parsed = categoriseWpContent(content);
              const hasContent = hasAnyMenuContent(parsed);
              if (hasContent) result = parsed;
            }
          }
        } catch {
          // WP API failed — fall through to strategy 3
        }
      }

      // --- Strategy 3: Generic HTML scrape of menu page ---
      if (!result) {
        const { text } = await fetchTextWithCache(
          buildProxyUrl(corsProxy, menuUrl),
          {
            cacheKey: buildCacheKey('cafeteria-page', menuUrl),
            ttlMs: refreshMs,
          },
        );
        const parsed = categoriseWpContent(text);
        const hasContent = hasAnyMenuContent(parsed);
        if (hasContent) result = parsed;
      }

      if (result) {
        setMenu(result);
        setIsDemo(false);
        setLastUpdated(new Date());
      } else {
        setError('No menu items found');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    }
  }, [corsProxy, menuUrl, danaLocations, refreshMs]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!mounted) return;
      await fetchMenu();
    };
    run();
    const id = setInterval(run, refreshMs);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [fetchMenu, refreshMs]);

  // ---- Display logic ----
  const currentMealSections = menu[mealPeriod];
  const weeklySections = menu.weekly;

  const displaySections = useMemo(() => {
    const showtimeSections = mealPeriod === 'lunch' || mealPeriod === 'dinner'
      ? menu.showtime
      : [];
    const sections: { title: string; items: MenuItem[]; isSpecial: boolean }[] = [];

    for (const s of weeklySections) {
      sections.push({ title: s.title, items: s.items, isSpecial: true });
    }
    for (const s of showtimeSections) {
      sections.push({ title: s.title, items: s.items, isSpecial: true });
    }
    for (const s of currentMealSections) {
      sections.push({ title: s.title, items: s.items, isSpecial: false });
    }

    // If no meal-specific items, show everything available
    if (currentMealSections.length === 0) {
      const allMeals = [...menu.breakfast, ...menu.lunch, ...menu.dinner, ...menu.showtime];
      for (const s of allMeals) {
        if (!sections.some(existing => existing.title === s.title)) {
          sections.push({ title: s.title, items: s.items, isSpecial: false });
        }
      }
    }

    return sections;
  }, [weeklySections, currentMealSections, menu, mealPeriod]);

  return (
    <div
      className="w-full h-full overflow-hidden flex flex-col"
      style={{ backgroundColor: `${theme.primary}20` }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3 shrink-0"
        style={{ backgroundColor: `${theme.primary}40` }}
      >
        <AppIcon name="utensils" className="w-5 h-5 text-white/80" />
        <span className="text-base font-semibold text-white">Cafeteria</span>
        <span
          className="ml-auto text-sm font-medium px-2 py-0.5 rounded-full"
          style={{ backgroundColor: `${theme.accent}30`, color: theme.accent }}
        >
          {MEAL_LABELS[mealPeriod]}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0">
        {displaySections.length === 0 && !error && (
          <div className="text-white/50 text-sm text-center mt-4">
            No menu available
          </div>
        )}

        {displaySections.map((section, si) => (
          <div key={`${section.title}-${si}`}>
            <div className="flex items-center gap-2 mb-2">
              {section.isSpecial && (
                <span style={{ color: theme.accent }}>
                  <AppIcon name="sparkles" className="w-4 h-4" />
                </span>
              )}
              <h3
                className="text-sm font-semibold uppercase tracking-wider"
                style={{
                  color: section.isSpecial ? theme.accent : 'rgba(255,255,255,0.6)',
                }}
              >
                {section.title}
              </h3>
            </div>

            <div className="space-y-1.5">
              {section.items.map((item, ii) => (
                <div
                  key={`${item.name}-${ii}`}
                  className="flex items-start gap-2 text-white"
                >
                  <span
                    className="mt-2 w-1.5 h-1.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: section.isSpecial
                        ? theme.accent
                        : 'rgba(255,255,255,0.3)',
                    }}
                  />
                  <span className="text-sm leading-relaxed">
                    {item.name}
                    {item.description && (
                      <span className="text-white/50 ml-1">
                        — {item.description}
                      </span>
                    )}
                    {item.dietary && item.dietary.length > 0 && (
                      <span className="ml-1.5 text-[10px] text-white/40">
                        {item.dietary.join(' · ')}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="shrink-0 px-4 py-2 flex items-center justify-between text-[11px] text-white/30">
        {isDemo && !error && (
          <span>Demo data – set CORS proxy for live menu</span>
        )}
        {error && (
          <span className="text-red-400/70 truncate max-w-[70%]">{error}</span>
        )}
        {!isDemo && !error && lastUpdated && (
          <span>
            Updated{' '}
            {lastUpdated.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        )}
        <span className="ml-auto opacity-60">
          {new Date().toLocaleDateString([], {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Categorise flat Dana Hospitality sections into the ParsedMenu structure
 * using keyword matching on titles/items.
 */
function categorizeDanaSections(sections: MealSection[]): ParsedMenu {
  const result: ParsedMenu = {
    weekly: [],
    breakfast: [],
    lunch: [],
    dinner: [],
    showtime: [],
  };

  for (const s of sections) {
    const combined = (s.title + ' ' + s.items.map(i => i.name).join(' ')).toLowerCase();

    if (/showtime/i.test(combined)) {
      result.showtime.push(s);
    } else if (/weekly\s*special|special/i.test(combined)) {
      result.weekly.push(s);
    } else if (/breakfast|morning|brunch|pancake|egg|omelette|waffle/i.test(combined)) {
      result.breakfast.push(s);
    } else if (/born of fire\s*lunch|lunch|midday|entrée|entree/i.test(combined)) {
      result.lunch.push(s);
    } else if (/born of fire\s*dinner|dinner|supper|evening/i.test(combined)) {
      result.dinner.push(s);
    } else {
      result.weekly.push(s);
    }
  }

  return result;
}

/* ------------------------------------------------------------------ */
/*  Registration                                                       */
/* ------------------------------------------------------------------ */

registerWidget({
  type: 'cafeteria-menu',
  name: 'Cafeteria Menu',
  description: 'Displays campus cafeteria menu with time-sensitive meals',
  icon: 'utensils',
  minW: 2,
  minH: 2,
  defaultW: 3,
  defaultH: 3,
  component: CafeteriaMenu,
  OptionsComponent: CafeteriaMenuOptions,
  defaultProps: {
    menuUrl: 'https://unbc.icaneat.ca/menu/',
    danaLocations: '48784',
    refreshInterval: 30,
    corsProxy: '',
    weekdayBreakfastStart: '07:00',
    weekdayBreakfastEnd: '10:45',
    weekdayLunchStart: '11:00',
    weekdayLunchEnd: '15:45',
    weekdayDinnerStart: '16:00',
    weekdayDinnerEnd: '23:00',
    weekendBreakfastStart: '08:00',
    weekendBreakfastEnd: '10:45',
    weekendLunchStart: '11:00',
    weekendLunchEnd: '15:45',
    weekendDinnerStart: '16:00',
    weekendDinnerEnd: '22:00',
  },
});
