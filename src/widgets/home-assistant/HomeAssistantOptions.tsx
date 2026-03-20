'use client';

import { useState } from 'react';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

export default function HomeAssistantOptions({ data, onChange }: WidgetOptionsProps) {
  const signalUrl = (data.signalUrl as string) || '';
  const displayId = (data.displayId as string) || '';
  const entityIds = (data.entityIds as string[]) || [];
  const [newEntityId, setNewEntityId] = useState('');

  const update = (patch: Record<string, unknown>) => {
    onChange({ ...data, ...patch });
  };

  const addEntity = () => {
    const id = newEntityId.trim();
    if (id && !entityIds.includes(id)) {
      update({ entityIds: [...entityIds, id] });
      setNewEntityId('');
    }
  };

  const removeEntity = (id: string) => {
    update({ entityIds: entityIds.filter((e) => e !== id) });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-white/60">Signaling Server URL</label>
        <input
          type="url"
          value={signalUrl}
          onChange={(e) => update({ signalUrl: e.target.value })}
          placeholder="ws://homeassistant.local:3030"
          className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/20 outline-none focus:border-white/30"
        />
        <p className="text-[10px] text-white/30">Leave empty to use the display&apos;s ?signal= URL param</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-white/60">Display ID</label>
        <input
          type="text"
          value={displayId}
          onChange={(e) => update({ displayId: e.target.value })}
          placeholder="lobby-tv-1"
          className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/20 outline-none focus:border-white/30"
        />
        <p className="text-[10px] text-white/30">Leave empty to use the display&apos;s ?displayId= URL param</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-white/60">Entity IDs</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newEntityId}
            onChange={(e) => setNewEntityId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addEntity()}
            placeholder="sensor.temperature, camera.front_door"
            className="flex-1 px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/20 outline-none focus:border-white/30 font-mono"
          />
          <button
            onClick={addEntity}
            className="px-3 py-2 bg-white/10 border border-white/10 rounded-lg text-sm text-white/70 hover:bg-white/15"
          >
            Add
          </button>
        </div>
        {entityIds.length > 0 && (
          <div className="space-y-1 mt-2">
            {entityIds.map((id) => (
              <div
                key={id}
                className="flex items-center justify-between px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg"
              >
                <span className="text-xs font-mono text-white/60">{id}</span>
                <button
                  onClick={() => removeEntity(id)}
                  className="text-xs text-red-400/60 hover:text-red-400"
                >
                  remove
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="text-[10px] text-white/30">
          Examples: sensor.room_temperature, sensor.3d_printer_progress, media_player.living_room, camera.front_door
        </p>
      </div>
    </div>
  );
}
