'use client';

import { useRef, useEffect, forwardRef, useImperativeHandle, ReactNode } from 'react';
import { GridStack, GridStackNode } from 'gridstack';
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
  onLayoutChange?: (items: GridStackItem[]) => void;
  renderItem: (item: GridStackItem) => ReactNode;
}

const GridStackWrapper = forwardRef<GridStackWrapperRef, GridStackWrapperProps>(
  ({ items, columns = 12, rows = 8, cellHeight = 'auto', margin = 8, onLayoutChange, renderItem }, ref) => {
    const gridRef = useRef<HTMLDivElement>(null);
    const gridInstanceRef = useRef<GridStack | null>(null);
    const onLayoutChangeRef = useRef(onLayoutChange);

    // Keep callback ref updated
    onLayoutChangeRef.current = onLayoutChange;

    // Initialize GridStack
    useEffect(() => {
      if (!gridRef.current) return;

      // Initialize grid with settings to prevent infinite collision loops
      const grid = GridStack.init(
        {
          column: columns,
          maxRow: rows + 4, // Allow overflow to prevent collision loops
          cellHeight,
          margin,
          float: true, // Allow widgets to float (not stack)
          animate: true,
          resizable: {
            handles: 'n,ne,e,se,s,sw,w,nw', // All handles for full resize control
          },
          cellHeightThrottle: 100,
        },
        gridRef.current
      );

      gridInstanceRef.current = grid;

      // Make all existing children into widgets
      const children = gridRef.current.querySelectorAll('.grid-stack-item');
      children.forEach((el) => {
        grid.makeWidget(el as HTMLElement);
      });

      // Throttled change handler to prevent rapid updates
      let changeTimeout: ReturnType<typeof setTimeout> | null = null;

      // Listen for changes (debounced to prevent infinite loops)
      grid.on('change', (_event: Event, changedItems: GridStackNode[]) => {
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
      <div className="gs-wrapper relative w-full h-full">
        <div ref={gridRef} className="grid-stack">
          {items.map((item) => (
            <div
              key={item.id}
              className="grid-stack-item"
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
                {renderItem(item)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
);

GridStackWrapper.displayName = 'GridStackWrapper';

export default GridStackWrapper;
