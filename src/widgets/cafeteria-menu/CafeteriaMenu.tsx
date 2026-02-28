'use client';

import { useState, useEffect, useCallback } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { fetchTextWithCache, buildCacheKey, buildProxyUrl } from '@/lib/data-cache';
import { useFitScale } from '@/hooks/useFitScale';
import AppIcon from '@/components/AppIcon';
import CafeteriaMenuOptions from './CafeteriaMenuOptions';

interface MenuItem {
  name: string;
  description?: string;
}

interface MealPeriod {
  label: string;
  items: MenuItem[];
}

interface CafeteriaMenuConfig {
  menuUrl?: string;
  corsProxy?: string;
  refreshInterval?: number; // minutes
  mealMode?: 'auto' | 'breakfast' | 'lunch' | 'dinner' | 'all';
  breakfastEnd?: string;  // "HH:MM" - when breakfast ends (default 10:30)
  lunchEnd?: string;      // "HH:MM" - when lunch ends (default 14:00)
}

const DEFAULT_MENU_URL = 'https://unbc.icaneat.ca/menu/';

// Time boundaries for auto-switching meals
const parseTimeToMinutes = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

const getCurrentMealPeriod = (breakfastEnd: string, lunchEnd: string): string => {
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  const bEnd = parseTimeToMinutes(breakfastEnd);
  const lEnd = parseTimeToMinutes(lunchEnd);

  if (current < bEnd) return 'breakfast';
  if (current < lEnd) return 'lunch';
  return 'dinner';
};

// ─── HTML Parser ────────────────────────────────────────────────────────────
// Parse the icaneat.ca menu page HTML to extract meal categories and items.
// The site renders menus in HTML sections. We look for common patterns:
// headings followed by lists or paragraphs of food items.

function parseMenuHTML(html: string): MealPeriod[] {
  const meals: MealPeriod[] = [];

  // Try to find menu sections by looking for heading tags followed by content
  // icaneat.ca uses various HTML patterns - we try multiple extraction strategies

  // Strategy 1: Look for h2/h3 headings that contain meal-related keywords
  const sectionRegex = /<h[23][^>]*>(.*?)<\/h[23]>([\s\S]*?)(?=<h[23]|<footer|$)/gi;
  let match;

  while ((match = sectionRegex.exec(html)) !== null) {
    const heading = match[1].replace(/<[^>]+>/g, '').trim();
    const content = match[2];

    if (!heading || !content) continue;

    // Extract list items or paragraphs as menu items
    const items: MenuItem[] = [];

    // Try <li> items first
    const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let liMatch;
    while ((liMatch = liRegex.exec(content)) !== null) {
      const text = liMatch[1].replace(/<[^>]+>/g, '').trim();
      if (text) items.push({ name: text });
    }

    // Try <p> tags if no list items found
    if (items.length === 0) {
      const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
      let pMatch;
      while ((pMatch = pRegex.exec(content)) !== null) {
        const text = pMatch[1].replace(/<[^>]+>/g, '').trim();
        if (text && text.length > 2 && text.length < 200) items.push({ name: text });
      }
    }

    // Try <div> with specific classes
    if (items.length === 0) {
      const divRegex = /<div[^>]*class="[^"]*item[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
      let divMatch;
      while ((divMatch = divRegex.exec(content)) !== null) {
        const text = divMatch[1].replace(/<[^>]+>/g, '').trim();
        if (text) items.push({ name: text });
      }
    }

    if (items.length > 0) {
      meals.push({ label: heading, items });
    }
  }

  // Strategy 2: If no structured sections found, try to extract from table rows
  if (meals.length === 0) {
    const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const tableItems: MenuItem[] = [];
    let trMatch;
    while ((trMatch = trRegex.exec(html)) !== null) {
      const cells = trMatch[1].match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
      if (cells && cells.length >= 1) {
        const text = cells.map(c => c.replace(/<[^>]+>/g, '').trim()).filter(Boolean).join(' — ');
        if (text) tableItems.push({ name: text });
      }
    }
    if (tableItems.length > 0) {
      meals.push({ label: 'Menu', items: tableItems });
    }
  }

  // Strategy 3: If still nothing, look for any content blocks with food-related words
  if (meals.length === 0) {
    const textBlocks = html.replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '\n')
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 3 && s.length < 150);

    if (textBlocks.length > 0) {
      meals.push({ label: 'Today\'s Menu', items: textBlocks.slice(0, 20).map(name => ({ name })) });
    }
  }

  return meals;
}

// Categorize menu sections into meal periods based on heading keywords
function categorizeMeals(meals: MealPeriod[]): { breakfast: MealPeriod[]; lunch: MealPeriod[]; dinner: MealPeriod[]; weekly: MealPeriod[]; other: MealPeriod[] } {
  const result = { breakfast: [] as MealPeriod[], lunch: [] as MealPeriod[], dinner: [] as MealPeriod[], weekly: [] as MealPeriod[], other: [] as MealPeriod[] };

  for (const meal of meals) {
    const lower = meal.label.toLowerCase();
    if (lower.includes('breakfast') || lower.includes('morning')) {
      result.breakfast.push(meal);
    } else if (lower.includes('lunch') || lower.includes('noon') || lower.includes('midday')) {
      result.lunch.push(meal);
    } else if (lower.includes('dinner') || lower.includes('supper') || lower.includes('evening')) {
      result.dinner.push(meal);
    } else if (lower.includes('weekly') || lower.includes('special') || lower.includes('feature')) {
      result.weekly.push(meal);
    } else {
      result.other.push(meal);
    }
  }

  return result;
}

// ─── Demo Data ──────────────────────────────────────────────────────────────

const DEMO_MEALS: MealPeriod[] = [
  {
    label: 'Breakfast Special',
    items: [
      { name: 'Eggs Benedict with Hollandaise' },
      { name: 'Buttermilk Pancakes with Maple Syrup' },
      { name: 'Fresh Fruit Bowl' },
      { name: 'Oatmeal with Berries & Honey' },
    ],
  },
  {
    label: 'Lunch Special',
    items: [
      { name: 'Grilled Chicken Caesar Wrap' },
      { name: 'Tomato Basil Soup' },
      { name: 'Garden Salad Bar' },
      { name: 'Pasta Primavera' },
    ],
  },
  {
    label: 'Dinner Special',
    items: [
      { name: 'Pan-Seared Salmon with Lemon Dill' },
      { name: 'Roasted Vegetable Medley' },
      { name: 'Garlic Mashed Potatoes' },
      { name: 'Fresh Baked Rolls' },
    ],
  },
  {
    label: 'Weekly Special',
    items: [
      { name: 'BBQ Pulled Pork Sandwich' },
      { name: 'Coleslaw & Sweet Potato Fries' },
    ],
  },
];

// ─── Main Component ─────────────────────────────────────────────────────────

export default function CafeteriaMenu({ config, theme, corsProxy: globalCorsProxy }: WidgetComponentProps) {
  const menuConfig = config as CafeteriaMenuConfig | undefined;
  const menuUrl = menuConfig?.menuUrl || DEFAULT_MENU_URL;
  const corsProxy = menuConfig?.corsProxy?.trim() || globalCorsProxy;
  const refreshInterval = menuConfig?.refreshInterval ?? 30; // minutes
  const mealMode = menuConfig?.mealMode ?? 'auto';
  const breakfastEnd = menuConfig?.breakfastEnd ?? '10:30';
  const lunchEnd = menuConfig?.lunchEnd ?? '14:00';

  const [allMeals, setAllMeals] = useState<MealPeriod[]>(DEMO_MEALS);
  const [currentPeriod, setCurrentPeriod] = useState(() => getCurrentMealPeriod(breakfastEnd, lunchEnd));
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(true);

  const DESIGN_W = 400;
  const DESIGN_H = 360;
  const { containerRef, scale } = useFitScale(DESIGN_W, DESIGN_H);

  // Fetch menu data
  useEffect(() => {
    let cancelled = false;

    const fetchMenu = async () => {
      try {
        const fetchUrl = buildProxyUrl(corsProxy, menuUrl);
        const { text } = await fetchTextWithCache(fetchUrl, {
          cacheKey: buildCacheKey('cafeteria-menu', menuUrl),
          ttlMs: refreshInterval * 60 * 1000,
          allowStale: true,
        });

        if (cancelled) return;

        const parsed = parseMenuHTML(text);
        if (parsed.length > 0) {
          setAllMeals(parsed);
          setIsDemo(false);
          setError(null);
        } else {
          setError('No menu items found');
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          setError(msg);
          console.error('CafeteriaMenu fetch error:', err);
        }
      }
    };

    fetchMenu();
    const interval = setInterval(fetchMenu, refreshInterval * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [menuUrl, corsProxy, refreshInterval]);

  // Update current meal period every minute
  useEffect(() => {
    const tick = () => setCurrentPeriod(getCurrentMealPeriod(breakfastEnd, lunchEnd));
    tick();
    const interval = setInterval(tick, 60_000);
    return () => clearInterval(interval);
  }, [breakfastEnd, lunchEnd]);

  // Determine which meals to display
  const categorized = categorizeMeals(allMeals);
  const getVisibleMeals = useCallback((): MealPeriod[] => {
    const mode = mealMode === 'auto' ? currentPeriod : mealMode;

    // Always include weekly specials
    const weekly = categorized.weekly;

    switch (mode) {
      case 'breakfast':
        return [...categorized.breakfast, ...weekly].length > 0
          ? [...categorized.breakfast, ...weekly]
          : allMeals.slice(0, 2);
      case 'lunch':
        return [...categorized.lunch, ...weekly].length > 0
          ? [...categorized.lunch, ...weekly]
          : allMeals.slice(0, 2);
      case 'dinner':
        return [...categorized.dinner, ...weekly].length > 0
          ? [...categorized.dinner, ...weekly]
          : allMeals.slice(0, 2);
      case 'all':
        return allMeals;
      default:
        return allMeals.slice(0, 3);
    }
  }, [mealMode, currentPeriod, categorized, allMeals]);

  const visibleMeals = getVisibleMeals();

  const mealIcon = currentPeriod === 'breakfast' ? 'sunrise' : currentPeriod === 'lunch' ? 'sun' : 'sunset';
  const mealLabel = mealMode === 'auto'
    ? currentPeriod.charAt(0).toUpperCase() + currentPeriod.slice(1)
    : mealMode === 'all' ? 'Full Menu' : mealMode.charAt(0).toUpperCase() + mealMode.slice(1);

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden rounded-2xl"
      style={{ backgroundColor: `${theme.primary}20` }}
    >
      <div
        style={{
          width: DESIGN_W,
          height: DESIGN_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
        className="flex flex-col p-5"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <AppIcon name="chefHat" className="w-7 h-7" style={{ color: theme.accent }} />
          <div className="flex-1">
            <div className="text-lg font-bold text-white">Cafe Menu</div>
            <div className="flex items-center gap-1.5 text-sm" style={{ color: theme.accent }}>
              <AppIcon name={mealIcon} className="w-3.5 h-3.5" />
              <span>{mealLabel}</span>
              {isDemo && <span className="text-white/30 ml-1">(demo)</span>}
            </div>
          </div>
        </div>

        {/* Error state */}
        {error && isDemo && (
          <div className="text-xs text-white/40 mb-2 truncate">
            {error}
          </div>
        )}

        {/* Menu sections */}
        <div className="flex-1 overflow-hidden space-y-3">
          {visibleMeals.map((meal, i) => (
            <div key={i}>
              <div
                className="text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: theme.accent }}
              >
                {meal.label}
              </div>
              <div className="space-y-1">
                {meal.items.slice(0, 6).map((item, j) => (
                  <div key={j} className="flex items-start gap-2 text-sm text-white/80">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: theme.accent }} />
                    <span className="leading-snug">{item.name}</span>
                  </div>
                ))}
                {meal.items.length > 6 && (
                  <div className="text-xs text-white/40 pl-3.5">
                    +{meal.items.length - 6} more items
                  </div>
                )}
              </div>
            </div>
          ))}

          {visibleMeals.length === 0 && (
            <div className="flex items-center justify-center h-full text-white/40 text-sm">
              No menu items available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

registerWidget({
  type: 'cafeteria-menu',
  name: 'Cafeteria Menu',
  description: 'Daily cafeteria menu with time-sensitive meal display',
  icon: 'chefHat',
  minW: 2,
  minH: 2,
  defaultW: 3,
  defaultH: 3,
  component: CafeteriaMenu,
  OptionsComponent: CafeteriaMenuOptions,
  defaultProps: {
    menuUrl: DEFAULT_MENU_URL,
    refreshInterval: 30,
    mealMode: 'auto',
    breakfastEnd: '10:30',
    lunchEnd: '14:00',
    corsProxy: '',
  },
});
