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
}

type MealPeriod = 'breakfast' | 'lunch' | 'dinner';

interface CafeteriaConfig {
  menuUrl?: string;
  danaLocations?: string;    // comma-separated Dana Hospitality loc IDs e.g. "48784,48786"
  refreshInterval?: number;  // minutes
  corsProxy?: string;
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

const getCurrentMealPeriod = (config: CafeteriaConfig): MealPeriod => {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();

  const breakfastEnd = timeToMinutes(config.breakfastEnd ?? '10:30');
  const lunchEnd = timeToMinutes(config.lunchEnd ?? '14:00');
  const dinnerEnd = timeToMinutes(config.dinnerEnd ?? '19:00');

  if (mins < breakfastEnd) return 'breakfast';
  if (mins < lunchEnd) return 'lunch';
  if (mins < dinnerEnd) return 'dinner';
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
 * Parse HTML returned by menu.dinahospitality.ca/unbc/menu.asp?loc=XXXXX
 *
 * Dana Hospitality pages typically contain menu items in table rows or
 * divs with item names in bold/strong tags, optional descriptions, and
 * dietary icons (img alt text like "VG", "GF", "DF").
 */
const parseDanaMenuHtml = (html: string): MealSection[] => {
  const sections: MealSection[] = [];
  const items: MenuItem[] = [];
  const seen = new Set<string>();

  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');

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
 * The Divi builder embeds iframes pointing to menu.dinahospitality.ca.
 */
const extractDanaIframeUrls = (html: string): string[] => {
  const urls: string[] = [];
  const iframePattern = /<iframe[^>]*src="([^"]*dinahospitality[^"]*)"/gi;
  let match;
  while ((match = iframePattern.exec(html)) !== null) {
    const url = (match[1] ?? '').replace(/&amp;/g, '&');
    if (url && !urls.includes(url)) urls.push(url);
  }
  // Also check for direct anchor links to menu.dinahospitality.ca
  const linkPattern = /href="([^"]*dinahospitality[^"]*)"/gi;
  while ((match = linkPattern.exec(html)) !== null) {
    const url = (match[1] ?? '').replace(/&amp;/g, '&');
    if (url && !urls.includes(url)) urls.push(url);
  }
  return urls;
};

/**
 * Categorise sections from the WordPress page by looking at heading/title keywords
 * near the embedded content.
 */
const categoriseWpContent = (html: string): ParsedMenu => {
  const result: ParsedMenu = { weekly: [], breakfast: [], lunch: [], dinner: [] };

  // Split by major headings to find labelled sections
  const fragments = html.split(/<h[1-4][^>]*>/i);

  for (const frag of fragments) {
    const fragLower = frag.toLowerCase();
    const items = extractItemsFromGenericHtml(frag);
    if (items.length === 0) continue;

    const titleMatch = frag.match(/^([\s\S]*?)<\/h[1-4]>/i);
    const title = stripHtml(titleMatch?.[1] ?? '').trim();
    const section: MealSection = { title: title || 'Menu', items };

    if (/weekly\s*special|special/i.test(fragLower)) {
      result.weekly.push(section);
    } else if (/breakfast|morning|brunch/i.test(fragLower)) {
      result.breakfast.push(section);
    } else if (/dinner|supper|evening/i.test(fragLower)) {
      result.dinner.push(section);
    } else if (/lunch|midday|entrée|entree/i.test(fragLower)) {
      result.lunch.push(section);
    } else {
      result.lunch.push(section);
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

/* ------------------------------------------------------------------ */
/*  Demo data                                                          */
/* ------------------------------------------------------------------ */

const DEMO_MENU: ParsedMenu = {
  weekly: [
    {
      title: 'Weekly Special',
      items: [
        { name: 'BBQ Pulled Pork Sandwich' },
        { name: 'with coleslaw & fries' },
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
      title: 'Lunch',
      items: [
        { name: 'Grilled Chicken Caesar Wrap' },
        { name: 'Tomato Basil Soup' },
        { name: 'Build-Your-Own Salad Bar' },
        { name: 'Margherita Pizza' },
      ],
    },
  ],
  dinner: [
    {
      title: 'Dinner',
      items: [
        { name: 'Pan-Seared Salmon' },
        { name: 'Vegetable Stir-Fry with Rice' },
        { name: 'Roasted Chicken with Potatoes' },
        { name: 'Pasta Primavera' },
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
  const danaLocations = cfg?.danaLocations?.trim() || '48784,48786';
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
          const danaUrl = `https://menu.dinahospitality.ca/unbc/menu.asp?loc=${loc}`;
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
              const hasContent =
                parsed.weekly.length + parsed.breakfast.length +
                parsed.lunch.length + parsed.dinner.length > 0;
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
        const hasContent =
          parsed.weekly.length + parsed.breakfast.length +
          parsed.lunch.length + parsed.dinner.length > 0;
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
    const sections: { title: string; items: MenuItem[]; isSpecial: boolean }[] = [];

    for (const s of weeklySections) {
      sections.push({ title: s.title, items: s.items, isSpecial: true });
    }
    for (const s of currentMealSections) {
      sections.push({ title: s.title, items: s.items, isSpecial: false });
    }

    // If no meal-specific items, show everything available
    if (currentMealSections.length === 0) {
      const allMeals = [...menu.breakfast, ...menu.lunch, ...menu.dinner];
      for (const s of allMeals) {
        if (!sections.some(existing => existing.title === s.title)) {
          sections.push({ title: s.title, items: s.items, isSpecial: false });
        }
      }
    }

    return sections;
  }, [weeklySections, currentMealSections, menu]);

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
  const result: ParsedMenu = { weekly: [], breakfast: [], lunch: [], dinner: [] };

  for (const s of sections) {
    const combined = (s.title + ' ' + s.items.map(i => i.name).join(' ')).toLowerCase();

    if (/weekly\s*special|special/i.test(combined)) {
      result.weekly.push(s);
    } else if (/breakfast|morning|brunch|pancake|egg|omelette|waffle/i.test(combined)) {
      result.breakfast.push(s);
    } else if (/dinner|supper|evening/i.test(combined)) {
      result.dinner.push(s);
    } else {
      // Default to lunch for uncategorised items (most common campus display period)
      result.lunch.push(s);
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
    danaLocations: '48784,48786',
    refreshInterval: 30,
    corsProxy: '',
    breakfastEnd: '10:30',
    lunchEnd: '14:00',
    dinnerEnd: '19:00',
  },
});
