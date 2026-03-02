'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { buildCacheKey, buildProxyUrl, fetchTextWithCache } from '@/lib/data-cache';
import AppIcon from '@/components/AppIcon';
import CafeteriaMenuOptions from './CafeteriaMenuOptions';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface MenuItem {
  name: string;
  description?: string;
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
  refreshInterval?: number; // minutes
  corsProxy?: string;
  breakfastEnd?: string;   // HH:MM – when breakfast display ends
  lunchEnd?: string;       // HH:MM – when lunch display ends
  dinnerEnd?: string;      // HH:MM – when dinner display ends
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
  // After dinner → show next breakfast
  return 'breakfast';
};

const MEAL_LABELS: Record<MealPeriod, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
};

/* ------------------------------------------------------------------ */
/*  HTML parser                                                        */
/* ------------------------------------------------------------------ */

/**
 * Parses icaneat.ca menu page HTML.
 *
 * icaneat.ca (Dana Hospitality) WordPress sites use a tabbed layout with
 * "Daily Menu" and "Weekly Specials" sections. Tabs usually contain headings
 * and lists or paragraph blocks for each meal.
 *
 * Since the exact HTML varies by site, we use a multi-strategy approach:
 *  1. Look for tab/section structures with known class patterns
 *  2. Fall back to heading-based extraction
 *  3. Use keyword matching for meal categorisation
 */
const parseMenuHtml = (html: string): ParsedMenu => {
  const result: ParsedMenu = {
    weekly: [],
    breakfast: [],
    lunch: [],
    dinner: [],
  };

  // Remove script/style tags to clean the content
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '');

  // Strategy 1: Look for WordPress tab containers
  // Common patterns: et_pb_tab, wpb_tab, elementor-tab-content, etc.
  const tabPatterns = [
    /<div[^>]*class="[^"]*(?:et_pb_tab|wpb_tab|tab-content|elementor-tab-content|tabs-panel)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]*(?:id|class)="[^"]*(?:daily.?menu|weekly.?special|breakfast|lunch|dinner)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
  ];

  const tabContents: string[] = [];
  for (const pattern of tabPatterns) {
    let match;
    while ((match = pattern.exec(cleaned)) !== null) {
      tabContents.push(match[1] ?? '');
    }
  }

  // Strategy 2: Extract sections by headings
  // Split by h1-h4 headings and categorise by keyword
  const headingSections = cleaned.split(/<h[1-4][^>]*>/i);

  const allSections = tabContents.length > 0 ? tabContents : headingSections;

  for (const section of allSections) {
    const sectionLower = section.toLowerCase();
    const items = extractItemsFromHtml(section);
    if (items.length === 0) continue;

    // Extract section title from first heading in fragment
    const titleMatch = section.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i)
      ?? section.match(/^([^<]+)/);
    const title = stripHtml(titleMatch?.[1] ?? '').trim();

    const mealSection: MealSection = { title: title || 'Menu', items };

    // Categorise by keywords
    if (/weekly\s*special/i.test(sectionLower) || /week/i.test(title.toLowerCase())) {
      result.weekly.push(mealSection);
    } else if (/breakfast|morning|brunch/i.test(sectionLower)) {
      result.breakfast.push(mealSection);
    } else if (/dinner|supper|evening/i.test(sectionLower)) {
      result.dinner.push(mealSection);
    } else if (/lunch|midday|noon|entrée|entree|soup|sandwich/i.test(sectionLower)) {
      result.lunch.push(mealSection);
    } else if (/daily\s*menu|today|menu/i.test(sectionLower)) {
      // "Daily Menu" goes to lunch by default (most campus displays during the day)
      result.lunch.push(mealSection);
    } else if (items.length > 0) {
      // Uncategorised items → add to lunch as catch-all
      result.lunch.push(mealSection);
    }
  }

  return result;
};

/** Extract individual menu items from an HTML fragment */
const extractItemsFromHtml = (html: string): MenuItem[] => {
  const items: MenuItem[] = [];
  const seen = new Set<string>();

  // Try list items first
  const liPattern = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let match;
  while ((match = liPattern.exec(html)) !== null) {
    const text = stripHtml(match[1] ?? '').trim();
    if (text && text.length > 1 && text.length < 200 && !seen.has(text.toLowerCase())) {
      seen.add(text.toLowerCase());
      items.push({ name: text });
    }
  }

  if (items.length > 0) return items;

  // Try paragraphs
  const pPattern = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  while ((match = pPattern.exec(html)) !== null) {
    const text = stripHtml(match[1] ?? '').trim();
    if (text && text.length > 2 && text.length < 200 && !seen.has(text.toLowerCase())) {
      seen.add(text.toLowerCase());
      // Split on line breaks or bullet chars inside paragraphs
      const lines = text.split(/\n|<br\s*\/?>|[•·–—]/g).map(l => l.trim()).filter(Boolean);
      for (const line of lines) {
        if (line.length > 2 && !seen.has(line.toLowerCase())) {
          seen.add(line.toLowerCase());
          items.push({ name: line });
        }
      }
    }
  }

  if (items.length > 0) return items;

  // Try table rows
  const trPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  while ((match = trPattern.exec(html)) !== null) {
    const cells = (match[1] ?? '').match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
    if (cells && cells.length > 0) {
      const text = cells.map(c => stripHtml(c)).join(' – ').trim();
      if (text && text.length > 2 && !seen.has(text.toLowerCase())) {
        seen.add(text.toLowerCase());
        items.push({ name: text });
      }
    }
  }

  if (items.length > 0) return items;

  // Last resort: look for <strong> or <b> tags as item names
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
  html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#\d+;/g, '').trim();

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
  const refreshInterval = cfg?.refreshInterval ?? 30; // minutes
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

  // Fetch menu data
  const fetchMenu = useCallback(async () => {
    if (!corsProxy) {
      // No CORS proxy → stay on demo data
      return;
    }
    try {
      setError(null);
      const fetchUrl = buildProxyUrl(corsProxy, menuUrl);
      const { text } = await fetchTextWithCache(fetchUrl, {
        cacheKey: buildCacheKey('cafeteria-menu', menuUrl),
        ttlMs: refreshMs,
      });
      const parsed = parseMenuHtml(text);

      // Check if we actually got content
      const hasContent =
        parsed.weekly.length > 0 ||
        parsed.breakfast.length > 0 ||
        parsed.lunch.length > 0 ||
        parsed.dinner.length > 0;

      if (hasContent) {
        setMenu(parsed);
        setIsDemo(false);
        setLastUpdated(new Date());
      } else {
        // Page fetched but no parseable menu content found
        setError('No menu items found – page structure may have changed');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    }
  }, [corsProxy, menuUrl, refreshMs]);

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

  // Determine which sections to display
  const currentMealSections = menu[mealPeriod];
  const weeklySections = menu.weekly;

  // Combine all items for display
  const displaySections = useMemo(() => {
    const sections: { title: string; items: MenuItem[]; isSpecial: boolean }[] = [];

    // Weekly specials first (always shown)
    for (const s of weeklySections) {
      sections.push({ title: s.title, items: s.items, isSpecial: true });
    }

    // Current meal
    for (const s of currentMealSections) {
      sections.push({ title: s.title, items: s.items, isSpecial: false });
    }

    // If no meal-specific items, show all available
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
        <span className="text-base font-semibold text-white">
          Cafeteria
        </span>
        <span
          className="ml-auto text-sm font-medium px-2 py-0.5 rounded-full"
          style={{ backgroundColor: `${theme.accent}30`, color: theme.accent }}
        >
          {MEAL_LABELS[mealPeriod]}
        </span>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0">
        {displaySections.length === 0 && !error && (
          <div className="text-white/50 text-sm text-center mt-4">
            No menu available
          </div>
        )}

        {displaySections.map((section, si) => (
          <div key={`${section.title}-${si}`}>
            {/* Section title */}
            <div className="flex items-center gap-2 mb-2">
              {section.isSpecial && (
                <span style={{ color: theme.accent }}><AppIcon name="sparkles" className="w-4 h-4" /></span>
              )}
              <h3
                className="text-sm font-semibold uppercase tracking-wider"
                style={{ color: section.isSpecial ? theme.accent : 'rgba(255,255,255,0.6)' }}
              >
                {section.title}
              </h3>
            </div>

            {/* Items */}
            <div className="space-y-1.5">
              {section.items.map((item, ii) => (
                <div
                  key={`${item.name}-${ii}`}
                  className="flex items-start gap-2 text-white"
                >
                  <span
                    className="mt-2 w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: section.isSpecial ? theme.accent : 'rgba(255,255,255,0.3)' }}
                  />
                  <span className="text-sm leading-relaxed">
                    {item.name}
                    {item.description && (
                      <span className="text-white/50 ml-1">— {item.description}</span>
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
            {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        <span className="ml-auto opacity-60">
          {new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
        </span>
      </div>
    </div>
  );
}

// Register the widget
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
    refreshInterval: 30,
    corsProxy: '',
    breakfastEnd: '10:30',
    lunchEnd: '14:00',
    dinnerEnd: '19:00',
  },
});
