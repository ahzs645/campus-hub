'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getWidget } from '@/lib/widget-registry';

interface WidgetEditDialogProps {
  isOpen: boolean;
  widgetId: string;
  widgetType: string;
  initialData: Record<string, unknown>;
  onSave: (widgetId: string, data: Record<string, unknown>) => void;
  onClose: () => void;
}

export default function WidgetEditDialog({
  isOpen,
  widgetId,
  widgetType,
  initialData,
  onSave,
  onClose,
}: WidgetEditDialogProps) {
  const [data, setData] = useState<Record<string, unknown>>(initialData);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const widgetDef = getWidget(widgetType);
  const OptionsComponent = widgetDef?.OptionsComponent;

  // Sync initial data when dialog opens
  useEffect(() => {
    if (isOpen) {
      setData(initialData);
    }
  }, [isOpen, initialData]);

  // Control dialog open/close
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isOpen]);

  const handleChange = useCallback((newData: Record<string, unknown>) => {
    setData(newData);
  }, []);

  const handleSave = useCallback(() => {
    onSave(widgetId, data);
    onClose();
  }, [widgetId, data, onSave, onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      if (e.target === dialogRef.current) {
        onClose();
      }
    },
    [onClose]
  );

  if (!widgetDef) return null;

  return (
    <dialog
      ref={dialogRef}
      className="backdrop:bg-[var(--ui-overlay)] bg-transparent fixed inset-0 m-0 p-4 w-full h-full max-w-none max-h-none flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      <div className="bg-[var(--ui-panel-solid)] border border-[var(--ui-panel-border)] rounded-xl shadow-2xl flex flex-col w-full max-w-2xl max-h-[90vh] text-white">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-[var(--ui-panel-border)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{widgetDef.icon}</span>
              <div>
                <h2 className="text-xl font-bold text-[var(--ui-text)]">Configure {widgetDef.name}</h2>
                <p className="text-sm text-[var(--ui-text-muted)]">{widgetDef.description}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[var(--ui-item-hover)] rounded-lg transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5 text-[var(--ui-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {OptionsComponent ? (
            <OptionsComponent data={data} onChange={handleChange} />
          ) : (
            <div className="text-center py-8 text-[var(--ui-text-muted)]">
              <p>No configuration options available for this widget.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-[var(--ui-panel-border)] bg-[var(--ui-panel-soft)] rounded-b-xl">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[var(--ui-text)] hover:bg-[var(--ui-item-hover)] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-[var(--ui-switch-on)] text-[var(--color-primary)] hover:brightness-110 rounded-lg transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
