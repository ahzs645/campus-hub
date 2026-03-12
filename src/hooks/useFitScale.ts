'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface FitScaleResult {
  containerRef: React.RefObject<HTMLDivElement | null>;
  scale: number;
  /** Current container width in px (0 before first measure) */
  containerWidth: number;
  /** Current container height in px (0 before first measure) */
  containerHeight: number;
  /** True when the container is wider than it is tall */
  isLandscape: boolean;
}

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
export function useFitScale(designWidth: number, designHeight: number): FitScaleResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  const update = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (w === 0 || h === 0) return;
    setScale(Math.min(w / designWidth, h / designHeight));
    setContainerWidth(w);
    setContainerHeight(h);
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

  return {
    containerRef,
    scale,
    containerWidth,
    containerHeight,
    isLandscape: containerWidth >= containerHeight,
  };
}

interface AdaptiveDesign {
  landscape: { w: number; h: number };
  portrait: { w: number; h: number };
}

interface AdaptiveFitScaleResult {
  containerRef: React.RefObject<HTMLDivElement | null>;
  scale: number;
  /** The design width currently in use */
  designWidth: number;
  /** The design height currently in use */
  designHeight: number;
  /** Current container width in px (0 before first measure) */
  containerWidth: number;
  /** Current container height in px (0 before first measure) */
  containerHeight: number;
  /** True when the container is wider than it is tall */
  isLandscape: boolean;
}

/**
 * Like useFitScale but automatically switches between landscape and portrait
 * design dimensions based on the container's aspect ratio.  This avoids the
 * circular dependency of choosing design dims based on hook output.
 */
export function useAdaptiveFitScale(designs: AdaptiveDesign): AdaptiveFitScaleResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState({
    scale: 1,
    isLandscape: true,
    designWidth: designs.landscape.w,
    designHeight: designs.landscape.h,
    containerWidth: 0,
    containerHeight: 0,
  });

  const designsRef = useRef(designs);
  designsRef.current = designs;

  const update = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const cw = el.clientWidth;
    const ch = el.clientHeight;
    if (cw === 0 || ch === 0) return;

    const landscape = cw >= ch;
    const d = designsRef.current;
    const dw = landscape ? d.landscape.w : d.portrait.w;
    const dh = landscape ? d.landscape.h : d.portrait.h;

    setState({
      scale: Math.min(cw / dw, ch / dh),
      isLandscape: landscape,
      designWidth: dw,
      designHeight: dh,
      containerWidth: cw,
      containerHeight: ch,
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);

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

  return {
    containerRef,
    ...state,
  };
}
