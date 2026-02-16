'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Scales inner content (designed at a fixed reference size) to fill its
 * container, preserving aspect ratio.  Works exactly like the display page's
 * viewport scaling but at the individual-widget level.
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
    const s = Math.min(el.clientWidth / designWidth, el.clientHeight / designHeight);
    setScale(s);
  }, [designWidth, designHeight]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [update]);

  return { containerRef, scale };
}
