'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { WidgetComponentProps, registerWidget, getWidgetComponent } from '@/lib/widget-registry';
import WidgetStackOptions from './WidgetStackOptions';

export interface ChildWidgetDef {
  id: string;
  type: string;
  props?: Record<string, unknown>;
}

interface WidgetStackConfig {
  rotationSeconds?: number;
  animationMode?: 'stack' | 'carousel' | 'fade';
  children?: ChildWidgetDef[];
}

const DEFAULT_CHILDREN: ChildWidgetDef[] = [
  { id: 'default-clock', type: 'clock', props: {} },
  { id: 'default-weather', type: 'weather', props: {} },
];

// ─── Rendered Child ──────────────────────────────────────────────────────────
// Resolves and renders a child widget component

function RenderedChild({
  child,
  theme,
  isActive,
}: {
  child: ChildWidgetDef;
  theme: WidgetComponentProps['theme'];
  isActive: boolean;
}) {
  const WidgetComponent = getWidgetComponent(child.type);
  if (!WidgetComponent) {
    return (
      <div className="w-full h-full flex items-center justify-center text-white/30 text-sm">
        Unknown: {child.type}
      </div>
    );
  }
  return (
    <div
      className="w-full h-full"
      style={{ pointerEvents: isActive ? 'auto' : 'none' }}
    >
      <WidgetComponent config={child.props} theme={theme} />
    </div>
  );
}

// ─── Stack Mode ──────────────────────────────────────────────────────────────
// Stacked widget cards with rotation. Active card does the moveOutIn shuffle.

const STACK_ROTATIONS = [4, -2, -9, 7, 3, -5, 6, -3];

function StackMode({
  items,
  activeIndex,
  theme,
}: {
  items: ChildWidgetDef[];
  activeIndex: number;
  theme: WidgetComponentProps['theme'];
}) {
  const [animating, setAnimating] = useState(false);
  const prevIndexRef = useRef(activeIndex);
  const [zStack, setZStack] = useState<number[]>([0]);

  useEffect(() => {
    if (activeIndex !== prevIndexRef.current) {
      prevIndexRef.current = activeIndex;
      setAnimating(true);
      setZStack((prev) => [...prev.filter((i) => i !== activeIndex), activeIndex]);
    }
  }, [activeIndex]);

  const handleAnimationEnd = useCallback(() => {
    setAnimating(false);
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center p-4">
      {items.map((child, i) => {
        const rotation = STACK_ROTATIONS[i % STACK_ROTATIONS.length];
        const isActive = i === activeIndex;
        const stackOrder = zStack.indexOf(i);
        const z = stackOrder === -1 ? 0 : stackOrder + 1;

        return (
          <div
            key={child.id}
            className="absolute rounded-lg overflow-hidden"
            onAnimationEnd={isActive ? handleAnimationEnd : undefined}
            style={{
              width: '85%',
              height: '85%',
              backgroundColor: theme.background,
              rotate: `${rotation}deg`,
              zIndex: z,
              border: `3px solid ${isActive ? theme.accent : 'rgba(255,255,255,0.12)'}`,
              boxShadow: isActive
                ? `0 8px 30px rgba(0,0,0,0.5), 0 0 20px ${theme.accent}30`
                : '0 4px 15px rgba(0,0,0,0.3)',
              transition: 'border-color 0.3s, box-shadow 0.3s',
              ...(isActive && animating
                ? { animation: '0.66s poster-move-out-in cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }
                : {}),
              ...(!isActive && animating
                ? { animation: '0.75s poster-straighten ease' }
                : {}),
            }}
          >
            <RenderedChild child={child} theme={theme} isActive={isActive} />
          </div>
        );
      })}

      {/* Counter */}
      <div
        className="absolute bottom-2 right-3 text-xs px-2 py-0.5 rounded-full backdrop-blur z-20"
        style={{ backgroundColor: 'rgba(0,0,0,0.4)', color: theme.accent }}
      >
        {activeIndex + 1}/{items.length}
      </div>
    </div>
  );
}

// ─── Carousel Mode ───────────────────────────────────────────────────────────
// 3D perspective carousel with widget cards fanning out

function CarouselMode({
  items,
  activeIndex,
  theme,
}: {
  items: ChildWidgetDef[];
  activeIndex: number;
  theme: WidgetComponentProps['theme'];
}) {
  return (
    <div
      className="relative w-full h-full flex items-center justify-center overflow-hidden"
      style={{ perspective: '1000px' }}
    >
      {items.map((child, i) => {
        const offset = i - activeIndex;
        const absOffset = Math.abs(offset);
        const isActive = offset === 0;
        const isVisible = absOffset <= 2;

        return (
          <div
            key={child.id}
            className="absolute transition-all duration-700 ease-out rounded-xl overflow-hidden"
            style={{
              width: '75%',
              height: '88%',
              backgroundColor: theme.background,
              transform: `
                translateX(${offset * 60}%)
                translateZ(${isActive ? '40px' : `-${absOffset * 60}px`})
                rotateY(${offset * -8}deg)
                scale(${isActive ? 1 : Math.max(0.7, 1 - absOffset * 0.15)})
              `,
              zIndex: isActive ? 10 : 5 - absOffset,
              opacity: isVisible ? (isActive ? 1 : 0.4 - absOffset * 0.1) : 0,
              boxShadow: isActive
                ? `0 20px 60px rgba(0,0,0,0.5), 0 0 30px ${theme.accent}20`
                : '0 10px 30px rgba(0,0,0,0.3)',
            }}
          >
            <RenderedChild child={child} theme={theme} isActive={isActive} />
          </div>
        );
      })}

      {/* Progress dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
        {items.map((_, i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full transition-all duration-300"
            style={{
              backgroundColor: i === activeIndex ? theme.accent : 'rgba(255,255,255,0.3)',
              transform: i === activeIndex ? 'scale(1.5)' : 'scale(1)',
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Fade Mode ───────────────────────────────────────────────────────────────
// Crossfade between widget children

function FadeMode({
  items,
  activeIndex,
  theme,
  progress,
}: {
  items: ChildWidgetDef[];
  activeIndex: number;
  theme: WidgetComponentProps['theme'];
  progress: number;
}) {
  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden">
      {items.map((child, i) => {
        const isActive = i === activeIndex;
        return (
          <div
            key={child.id}
            className="absolute inset-0 transition-opacity duration-700"
            style={{ opacity: isActive ? 1 : 0 }}
          >
            <RenderedChild child={child} theme={theme} isActive={isActive} />
          </div>
        );
      })}

      {/* Progress bar */}
      {items.length > 1 && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-black/30 z-10">
          <div
            className="h-full transition-all duration-100 ease-linear"
            style={{
              width: `${progress}%`,
              backgroundColor: theme.accent,
              boxShadow: `0 0 10px ${theme.accent}`,
            }}
          />
        </div>
      )}

      {/* Progress dots */}
      {items.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {items.map((_, idx) => (
            <div
              key={idx}
              className="w-2 h-2 rounded-full transition-all duration-300"
              style={{
                backgroundColor: idx === activeIndex ? theme.accent : 'rgba(255,255,255,0.3)',
                transform: idx === activeIndex ? 'scale(1.3)' : 'scale(1)',
                boxShadow: idx === activeIndex ? `0 0 10px ${theme.accent}` : 'none',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function WidgetStack({ config, theme }: WidgetComponentProps) {
  const stackConfig = config as WidgetStackConfig | undefined;
  const rotationSeconds = stackConfig?.rotationSeconds ?? 8;
  const animationMode = stackConfig?.animationMode ?? 'fade';
  const items = stackConfig?.children?.length ? stackConfig.children : DEFAULT_CHILDREN;

  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset when children change
  useEffect(() => {
    setActiveIndex(0);
    setProgress(0);
  }, [items.length]);

  // Auto-rotation timer
  const advance = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % items.length);
    setProgress(0);
  }, [items.length]);

  useEffect(() => {
    if (items.length <= 1) return;

    progressRef.current = setInterval(() => {
      setProgress((prev) => Math.min(prev + 100 / (rotationSeconds * 10), 100));
    }, 100);

    timerRef.current = setInterval(advance, rotationSeconds * 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [items.length, rotationSeconds, advance]);

  if (items.length === 0) {
    return (
      <div
        className="h-full rounded-2xl flex items-center justify-center"
        style={{ backgroundColor: `${theme.primary}40` }}
      >
        <span className="text-white/50">No widgets configured</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden" style={{ backgroundColor: `${theme.primary}20` }}>
      {animationMode === 'stack' && (
        <StackMode items={items} activeIndex={activeIndex} theme={theme} />
      )}
      {animationMode === 'carousel' && (
        <CarouselMode items={items} activeIndex={activeIndex} theme={theme} />
      )}
      {animationMode === 'fade' && (
        <FadeMode items={items} activeIndex={activeIndex} theme={theme} progress={progress} />
      )}
    </div>
  );
}

registerWidget({
  type: 'widget-stack',
  name: 'Widget Stack',
  description: 'Cycle through multiple widgets with stack, carousel, or fade animations',
  icon: 'layers',
  minW: 2,
  minH: 2,
  defaultW: 4,
  defaultH: 3,
  component: WidgetStack,
  OptionsComponent: WidgetStackOptions,
  defaultProps: {
    rotationSeconds: 8,
    animationMode: 'fade',
    children: [],
  },
});
