// Cross-platform fit-scale hook
// Unlike the web version (ResizeObserver-based), this accepts dimensions as props
// from the parent DisplayGrid, making it platform-agnostic.

import { useMemo } from 'react';

interface FitScaleResult {
  scale: number;
  isLandscape: boolean;
  designWidth: number;
  designHeight: number;
}

/**
 * Computes a uniform scale factor to fit content designed at a fixed reference
 * size into a container of a given size, preserving aspect ratio.
 */
export function useFitScale(
  containerWidth: number,
  containerHeight: number,
  designWidth: number,
  designHeight: number,
): FitScaleResult {
  return useMemo(() => ({
    scale: containerWidth > 0 && containerHeight > 0
      ? Math.min(containerWidth / designWidth, containerHeight / designHeight)
      : 1,
    isLandscape: containerWidth >= containerHeight,
    designWidth,
    designHeight,
  }), [containerWidth, containerHeight, designWidth, designHeight]);
}

interface AdaptiveDesign {
  landscape: { w: number; h: number };
  portrait: { w: number; h: number };
}

/**
 * Like useFitScale but automatically switches between landscape and portrait
 * design dimensions based on the container's aspect ratio.
 */
export function useAdaptiveFitScale(
  containerWidth: number,
  containerHeight: number,
  designs: AdaptiveDesign,
): FitScaleResult {
  return useMemo(() => {
    const isLandscape = containerWidth >= containerHeight;
    const dw = isLandscape ? designs.landscape.w : designs.portrait.w;
    const dh = isLandscape ? designs.landscape.h : designs.portrait.h;
    return {
      scale: containerWidth > 0 && containerHeight > 0
        ? Math.min(containerWidth / dw, containerHeight / dh)
        : 1,
      isLandscape,
      designWidth: dw,
      designHeight: dh,
    };
  }, [containerWidth, containerHeight, designs]);
}
