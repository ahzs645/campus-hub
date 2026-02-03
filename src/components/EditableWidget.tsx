'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getWidget } from '@/lib/widget-registry';
import type { WidgetConfig } from '@/lib/config';

interface EditableWidgetProps {
  widget: WidgetConfig;
  theme: {
    primary: string;
    accent: string;
    background: string;
  };
  onEdit: (widgetId: string) => void;
  onDelete: (widgetId: string) => void;
}

export default function EditableWidget({ widget, theme, onEdit, onDelete }: EditableWidgetProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const anchorRectRef = useRef<DOMRect | null>(null);

  const widgetDef = getWidget(widget.type);
  const WidgetComponent = widgetDef?.component;

  // Close menu when clicking outside
  useEffect(() => {
    if (!showMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setShowMenu(false);
        setShowDeleteConfirm(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (buttonRef.current) {
      anchorRectRef.current = buttonRef.current.getBoundingClientRect();
    }
    setShowMenu((prev) => !prev);
    setShowDeleteConfirm(false);
  };

  useEffect(() => {
    if (!showMenu) return;

    const positionMenu = () => {
      const anchorRect = anchorRectRef.current;
      const menuEl = menuRef.current;
      if (!anchorRect || !menuEl) return;

      const menuRect = menuEl.getBoundingClientRect();
      const padding = 8;

      let top = anchorRect.bottom + 8;
      let left = anchorRect.left;

      if (left + menuRect.width + padding > window.innerWidth) {
        left = window.innerWidth - menuRect.width - padding;
      }
      if (left < padding) left = padding;

      if (top + menuRect.height + padding > window.innerHeight) {
        const above = anchorRect.top - 8 - menuRect.height;
        if (above >= padding) {
          top = above;
        } else {
          top = Math.max(padding, window.innerHeight - menuRect.height - padding);
        }
      }

      setMenuPosition({ top, left });
    };

    positionMenu();
    window.addEventListener('resize', positionMenu);
    return () => window.removeEventListener('resize', positionMenu);
  }, [showMenu]);

  if (!WidgetComponent) {
    return (
      <div className="h-full flex items-center justify-center bg-red-50 text-red-600 rounded-lg">
        <span>Unknown widget type: {widget.type}</span>
      </div>
    );
  }

  const menu = showMenu && typeof document !== 'undefined' && createPortal(
    <div
      ref={menuRef}
      className="fixed z-[9999] bg-gray-900 border border-white/20 rounded-xl shadow-2xl p-2 min-w-[180px]"
      style={{ top: menuPosition.top, left: menuPosition.left }}
    >
      {/* Widget Name */}
      <div className="px-3 py-2 border-b border-white/10 mb-2">
        <span className="text-sm font-medium text-white">
          {widgetDef?.icon} {widgetDef?.name}
        </span>
      </div>

      {/* Settings */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onEdit(widget.id);
          setShowMenu(false);
        }}
        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Configure
      </button>

      {/* Delete */}
      {showDeleteConfirm ? (
        <div className="flex gap-2 px-3 py-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(widget.id);
              setShowMenu(false);
            }}
            className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Delete
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteConfirm(false);
            }}
            className="flex-1 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowDeleteConfirm(true);
          }}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          Delete Widget
        </button>
      )}
    </div>,
    document.body
  );

  return (
    <div className="h-full relative group">
      {/* Widget Content */}
      <div className="h-full rounded-xl overflow-hidden" style={{ backgroundColor: `${theme.primary}40` }}>
        <WidgetComponent config={widget.props} theme={theme} />
      </div>

      {/* Drag Handle - leaves edges free for resize handles */}
      <div className="gs-drag-handle absolute inset-4 cursor-move z-10" />

      {/* Single Menu Button - always visible on hover */}
      <button
        ref={buttonRef}
        onClick={handleMenuClick}
        className={`absolute top-1 right-1 z-30 p-1.5 rounded-lg transition-all ${
          showMenu
            ? 'bg-white text-gray-900'
            : 'bg-black/70 text-white opacity-0 group-hover:opacity-100 hover:bg-black/90'
        }`}
        title="Widget options"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
        </svg>
      </button>

      {/* Menu Portal */}
      {menu}
    </div>
  );
}
