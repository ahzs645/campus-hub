'use client';

import { useRef, useEffect, forwardRef, useImperativeHandle, ReactNode } from 'react';
import type { CSSProperties } from 'react';
import { GridStack, GridStackNode, GridItemHTMLElement } from 'gridstack';
import 'gridstack/dist/gridstack.min.css';

export interface GridStackItem {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

export interface GridStackWrapperRef {
  getItems: () => GridStackItem[];
}

interface GridStackWrapperProps {
  items: GridStackItem[];
  columns?: number;
  rows?: number;
  cellHeight?: number | string;
  margin?: number;
  contentScale?: number;
  onLayoutChange?: (items: GridStackItem[]) => void;
  renderItem: (item: GridStackItem) => ReactNode;
}

const GridStackWrapper = forwardRef<GridStackWrapperRef, GridStackWrapperProps>(
  ({ items, columns = 12, rows = 8, cellHeight = 'auto', margin = 8, contentScale, onLayoutChange, renderItem }, ref) => {
    const gridRef = useRef<HTMLDivElement>(null);
    const gridInstanceRef = useRef<GridStack | null>(null);
    const onLayoutChangeRef = useRef(onLayoutChange);
    const isSyncingRef = useRef(false);

    // Keep callback ref updated
    onLayoutChangeRef.current = onLayoutChange;

    // Initialize GridStack
    useEffect(() => {
      if (!gridRef.current) return;

      // Initialize grid with settings to prevent infinite collision loops
      const grid = GridStack.init(
        {
          column: columns,
          // Note: maxRow is intentionally omitted. Setting it constrains the grid
          // boundary and causes infinite _fixCollisions loops when overlapping
          // widgets can't be pushed beyond the limit. The visual row constraint
          // is handled by the wrapper's CSS height instead.
          cellHeight,
          margin,
          float: true, // Allow widgets to float (not stack)
          animate: true,
          draggable: {
            handle: '.gs-drag-handle',
            cancel: 'button, input, textarea, select, option, iframe',
          },
          resizable: {
            handles: 'n,ne,e,se,s,sw,w,nw', // All handles for full resize control
            autoHide: true,
          },
          cellHeightThrottle: 100,
        },
        gridRef.current
      );

      gridInstanceRef.current = grid;

      // Make all existing children into widgets (batched to prevent collision loops)
      grid.batchUpdate();
      const children = gridRef.current.querySelectorAll('.grid-stack-item');
      children.forEach((el) => {
        grid.makeWidget(el as HTMLElement);
      });
      grid.batchUpdate(false);

      // Throttled change handler to prevent rapid updates
      let changeTimeout: ReturnType<typeof setTimeout> | null = null;

      // Listen for changes (debounced to prevent infinite loops)
      grid.on('change', (_event: Event, changedItems: GridStackNode[]) => {
        if (isSyncingRef.current) return;
        if (changeTimeout) clearTimeout(changeTimeout);

        changeTimeout = setTimeout(() => {
          if (onLayoutChangeRef.current && changedItems) {
            const allItems = grid.engine.nodes.map((node: GridStackNode) => ({
              id: node.id as string,
              x: node.x ?? 0,
              y: node.y ?? 0,
              w: node.w ?? 1,
              h: node.h ?? 1,
            }));
            onLayoutChangeRef.current(allItems);
          }
        }, 100);
      });

      return () => {
        if (changeTimeout) clearTimeout(changeTimeout);
        grid.destroy(false);
        gridInstanceRef.current = null;
      };
    }, [columns, rows, cellHeight, margin]);

    // Sync widgets with GridStack when items change (add/remove/update)
    useEffect(() => {
      const grid = gridInstanceRef.current;
      const gridEl = gridRef.current;
      if (!grid || !gridEl) return;

      isSyncingRef.current = true;
      try {
        // Batch all updates so collision detection only runs once at the end
        grid.batchUpdate();

        const itemIds = new Set(items.map((item) => item.id));
        const nodes = [...grid.engine.nodes];
        const nodesById = new Map(nodes.map((node) => [String(node.id), node]));

        // Remove widgets that no longer exist
        nodes.forEach((node) => {
          const id = node.id ? String(node.id) : '';
          if (id && !itemIds.has(id) && node.el) {
            grid.removeWidget(node.el);
          }
        });

        // Ensure new DOM nodes are registered with GridStack
        items.forEach((item) => {
          const selector = `.grid-stack-item[gs-id="${item.id}"]`;
          const el = gridEl.querySelector(selector) as GridItemHTMLElement | null;
          if (el && !el.gridstackNode) {
            grid.makeWidget(el);
          }
        });

        // Update positions/sizes when they differ (e.g., preset load)
        items.forEach((item) => {
          const node = nodesById.get(item.id);
          if (!node || !node.el) return;
          const needsUpdate =
            (node.x ?? 0) !== item.x ||
            (node.y ?? 0) !== item.y ||
            (node.w ?? 1) !== item.w ||
            (node.h ?? 1) !== item.h ||
            (node.minW ?? undefined) !== item.minW ||
            (node.minH ?? undefined) !== item.minH ||
            (node.maxW ?? undefined) !== item.maxW ||
            (node.maxH ?? undefined) !== item.maxH;

          if (needsUpdate) {
            grid.update(node.el, {
              x: item.x,
              y: item.y,
              w: item.w,
              h: item.h,
              minW: item.minW,
              minH: item.minH,
              maxW: item.maxW,
              maxH: item.maxH,
            });
          }
        });

        grid.batchUpdate(false);
      } finally {
        isSyncingRef.current = false;
      }
    }, [items]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      getItems: () => {
        const grid = gridInstanceRef.current;
        if (!grid) return [];

        return grid.engine.nodes.map((node: GridStackNode) => ({
          id: node.id as string,
          x: node.x ?? 0,
          y: node.y ?? 0,
          w: node.w ?? 1,
          h: node.h ?? 1,
        }));
      },
    }));

    return (
      <div
        className="gs-wrapper relative w-full h-full"
        style={
          {
            '--grid-columns': columns,
            '--grid-rows': rows,
          } as CSSProperties
        }
      >
        <div ref={gridRef} className="grid-stack">
          {items.map((item) => {
            const isCompact = item.w <= 2 || item.h <= 1;
            return (
            <div
              key={item.id}
              className={`grid-stack-item${isCompact ? ' gs-compact' : ''}`}
              gs-id={item.id}
              gs-x={item.x}
              gs-y={item.y}
              gs-w={item.w}
              gs-h={item.h}
              gs-min-w={item.minW}
              gs-min-h={item.minH}
              gs-max-w={item.maxW}
              gs-max-h={item.maxH}
            >
              <div className="grid-stack-item-content">
                {contentScale && contentScale !== 1 ? (
                  <div
                    style={{
                      transform: `scale(${contentScale})`,
                      transformOrigin: 'top left',
                      width: `${100 / contentScale}%`,
                      height: `${100 / contentScale}%`,
                    }}
                  >
                    {renderItem(item)}
                  </div>
                ) : (
                  renderItem(item)
                )}
              </div>
            </div>
          );
          })}
        </div>
      </div>
    );
  }
);

GridStackWrapper.displayName = 'GridStackWrapper';

export default GridStackWrapper;
