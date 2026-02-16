'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Scales inner content (designed at a fixed reference size) to fill its
 * container, preserving aspect ratio.  Works exactly like the display page's
 * viewport scaling but at the individual-widget level.
 *
 * Uses ResizeObserver for direct size changes, plus a MutationObserver on the
 * nearest GridStack ancestor so the widget re-measures when GridStack
 * repositions/resizes cells (which uses inline styles that ResizeObserver on
 * a child may not catch).
 *
 * @param designWidth  The pixel width the content is "designed" at
 * @param designHeight The pixel height the content is "designed" at
 */
export function useFitScale(designWidth: number, designHeight: number) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const update = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (w === 0 || h === 0) return;
    setScale(Math.min(w / designWidth, h / designHeight));
  }, [designWidth, designHeight]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    update();

    // Watch the container itself for size changes
    const ro = new ResizeObserver(update);
    ro.observe(el);

    // Also watch the nearest grid-stack-item ancestor for style mutations
    // (GridStack changes cell positions/sizes via inline styles which may not
    // trigger ResizeObserver on descendant elements.)
    const gsItem = el.closest('.grid-stack-item');
    let mo: MutationObserver | undefined;
    if (gsItem) {
      mo = new MutationObserver(update);
      mo.observe(gsItem, { attributes: true, attributeFilter: ['style'] });
    }

    return () => {
      ro.disconnect();
      mo?.disconnect();
    };
  }, [update]);

  return { containerRef, scale };
}
