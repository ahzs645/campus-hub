'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { registerWidget, type WidgetComponentProps } from '@/lib/widget-registry';
import { createSignalingClient, type SignalingClient } from '@/lib/signaling-client';
import HomeAssistantOptions from './HomeAssistantOptions';

interface HAEntityState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed?: string;
  last_updated?: string;
}

interface HAWidgetConfig {
  signalUrl?: string;
  displayId?: string;
  entityIds?: string[];
  layout?: 'auto' | 'list' | 'grid' | 'single';
  showEntityName?: boolean;
  showIcon?: boolean;
  showLastChanged?: boolean;
}

// --- Domain-specific renderers ---

function SensorEntity({ entity, theme }: { entity: HAEntityState; theme: WidgetComponentProps['theme'] }) {
  const name = (entity.attributes.friendly_name as string) || entity.entity_id;
  const unit = entity.attributes.unit_of_measurement as string || '';
  const deviceClass = entity.attributes.device_class as string || '';
  const icon = getIconForEntity(entity);

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: `${theme.primary}20` }}>
      <div className="text-2xl shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-white/50 truncate">{name}</div>
        <div className="text-xl font-bold" style={{ color: theme.accent }}>
          {entity.state}{unit ? ` ${unit}` : ''}
        </div>
        {deviceClass && (
          <div className="text-[10px] text-white/30 capitalize">{deviceClass}</div>
        )}
      </div>
    </div>
  );
}

function PrinterEntity({ entity, theme }: { entity: HAEntityState; theme: WidgetComponentProps['theme'] }) {
  const name = (entity.attributes.friendly_name as string) || entity.entity_id;
  const progress = parseFloat(entity.state) || 0;
  const filename = entity.attributes.filename as string
    || entity.attributes.current_print as string
    || entity.attributes.project_name as string
    || '';
  const timeRemaining = entity.attributes.time_remaining as string
    || entity.attributes.remaining as string
    || '';
  const state = entity.attributes.print_state as string || entity.state;

  const isPrinting = state.toLowerCase().includes('print');

  return (
    <div className="p-3 rounded-lg space-y-2" style={{ backgroundColor: `${theme.primary}20` }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🖨️</span>
          <span className="text-xs text-white/50 truncate">{name}</span>
        </div>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full font-medium capitalize"
          style={{
            backgroundColor: isPrinting ? `${theme.accent}30` : 'rgba(255,255,255,0.1)',
            color: isPrinting ? theme.accent : 'rgba(255,255,255,0.5)',
          }}
        >
          {state}
        </span>
      </div>

      {filename && (
        <div className="text-sm text-white/70 truncate font-mono">{filename}</div>
      )}

      {isPrinting && (
        <>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${theme.primary}40` }}>
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${Math.min(100, progress)}%`, backgroundColor: theme.accent }}
            />
          </div>
          <div className="flex justify-between text-xs text-white/40">
            <span>{progress.toFixed(1)}%</span>
            {timeRemaining && <span>{timeRemaining} remaining</span>}
          </div>
        </>
      )}
    </div>
  );
}

function MediaPlayerEntity({ entity, theme }: { entity: HAEntityState; theme: WidgetComponentProps['theme'] }) {
  const name = (entity.attributes.friendly_name as string) || entity.entity_id;
  const mediaTitle = entity.attributes.media_title as string || '';
  const mediaArtist = entity.attributes.media_artist as string || '';
  const thumbnail = entity.attributes.entity_picture as string || '';
  const state = entity.state;

  return (
    <div className="p-3 rounded-lg space-y-2" style={{ backgroundColor: `${theme.primary}20` }}>
      <div className="flex items-center gap-3">
        {thumbnail ? (
          <img src={thumbnail} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
        ) : (
          <div className="text-2xl shrink-0">🎵</div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-xs text-white/50 truncate">{name}</div>
          {mediaTitle ? (
            <>
              <div className="text-sm font-medium text-white/90 truncate">{mediaTitle}</div>
              {mediaArtist && <div className="text-xs text-white/40 truncate">{mediaArtist}</div>}
            </>
          ) : (
            <div className="text-sm text-white/50 capitalize">{state}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function BinarySensorEntity({ entity, theme }: { entity: HAEntityState; theme: WidgetComponentProps['theme'] }) {
  const name = (entity.attributes.friendly_name as string) || entity.entity_id;
  const isOn = entity.state === 'on';
  const icon = getIconForEntity(entity);

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: `${theme.primary}20` }}>
      <div className="text-2xl shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-white/50 truncate">{name}</div>
        <div
          className="text-sm font-bold"
          style={{ color: isOn ? theme.accent : 'rgba(255,255,255,0.3)' }}
        >
          {isOn ? 'On' : 'Off'}
        </div>
      </div>
      <div
        className="w-3 h-3 rounded-full shrink-0"
        style={{ backgroundColor: isOn ? theme.accent : 'rgba(255,255,255,0.15)' }}
      />
    </div>
  );
}

function CameraEntity({ entity, theme }: { entity: HAEntityState; theme: WidgetComponentProps['theme'] }) {
  const name = (entity.attributes.friendly_name as string) || entity.entity_id;
  const entityPicture = entity.attributes.entity_picture as string || '';

  return (
    <div className="rounded-lg overflow-hidden" style={{ backgroundColor: `${theme.primary}20` }}>
      {entityPicture ? (
        <img
          src={entityPicture}
          alt={name}
          className="w-full aspect-video object-cover"
        />
      ) : (
        <div className="w-full aspect-video flex items-center justify-center text-white/20">
          <span className="text-4xl">📷</span>
        </div>
      )}
      <div className="px-3 py-2 text-xs text-white/50 truncate">{name}</div>
    </div>
  );
}

function GenericEntity({ entity, theme }: { entity: HAEntityState; theme: WidgetComponentProps['theme'] }) {
  const name = (entity.attributes.friendly_name as string) || entity.entity_id;
  const icon = getIconForEntity(entity);

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: `${theme.primary}20` }}>
      <div className="text-2xl shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-white/50 truncate">{name}</div>
        <div className="text-sm font-medium text-white/80 capitalize">{entity.state}</div>
      </div>
    </div>
  );
}

function getIconForEntity(entity: HAEntityState): string {
  const domain = entity.entity_id.split('.')[0];
  const deviceClass = entity.attributes.device_class as string || '';

  const iconMap: Record<string, string> = {
    temperature: '🌡️', humidity: '💧', pressure: '🌀', battery: '🔋',
    power: '⚡', energy: '⚡', voltage: '🔌', current: '🔌',
    illuminance: '☀️', motion: '🚶', door: '🚪', window: '🪟',
    sound: '🔊', vibration: '📳', co2: '💨', pm25: '💨',
  };

  if (iconMap[deviceClass]) return iconMap[deviceClass];

  const domainIcons: Record<string, string> = {
    sensor: '📊', binary_sensor: '🔘', switch: '🔀', light: '💡',
    climate: '🌡️', fan: '🌀', cover: '🪟', lock: '🔒',
    camera: '📷', media_player: '🎵', automation: '⚙️', script: '📜',
    person: '👤', zone: '📍', sun: '☀️', weather: '🌤️',
  };

  return domainIcons[domain] || '📦';
}

function EntityRenderer({ entity, theme }: { entity: HAEntityState; theme: WidgetComponentProps['theme'] }) {
  const domain = entity.entity_id.split('.')[0];
  const deviceClass = entity.attributes.device_class as string || '';

  // 3D printer detection — check domain or common entity ID patterns
  if (domain === 'sensor' && (
    deviceClass === 'printer' ||
    entity.entity_id.includes('3d_printer') ||
    entity.entity_id.includes('octoprint') ||
    entity.entity_id.includes('bambu') ||
    entity.entity_id.includes('klipper') ||
    entity.entity_id.includes('prusa') ||
    entity.entity_id.includes('print_progress')
  )) {
    return <PrinterEntity entity={entity} theme={theme} />;
  }

  switch (domain) {
    case 'sensor':
      return <SensorEntity entity={entity} theme={theme} />;
    case 'binary_sensor':
      return <BinarySensorEntity entity={entity} theme={theme} />;
    case 'media_player':
      return <MediaPlayerEntity entity={entity} theme={theme} />;
    case 'camera':
      return <CameraEntity entity={entity} theme={theme} />;
    default:
      return <GenericEntity entity={entity} theme={theme} />;
  }
}

// --- Main Widget ---

function HomeAssistantWidget({ config, theme }: WidgetComponentProps) {
  const cfg = config as unknown as HAWidgetConfig;
  const [entities, setEntities] = useState<Map<string, HAEntityState>>(new Map());
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<SignalingClient | null>(null);

  // Read signal URL from widget config, falling back to URL params
  const signalUrl = cfg?.signalUrl || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('signal') : null) || '';
  const displayId = cfg?.displayId || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('displayId') : null) || '';
  const entityIds = cfg?.entityIds || [];

  const handleState = useCallback((data: Record<string, unknown>) => {
    const entityId = data.entity_id as string;
    if (!entityId) return;
    setEntities((prev) => {
      const next = new Map(prev);
      next.set(entityId, data as unknown as HAEntityState);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!signalUrl || !displayId || entityIds.length === 0) return;

    let client: SignalingClient | null = null;

    const setup = async () => {
      client = createSignalingClient(signalUrl, 'display', displayId, {
        name: displayId,
      });
      clientRef.current = client;

      client.on('connected', () => {
        setConnected(true);
        setError(null);
        // Subscribe to HA entities once connected
        client!.haSubscribe(entityIds);
      });

      client.on('disconnected', () => setConnected(false));
      client.on('ha-state', handleState);
      client.on('ha-error', (data) => setError(data.message as string));

      await client.connect();
    };

    setup();

    return () => {
      client?.haUnsubscribe(entityIds);
      client?.disconnect();
      clientRef.current = null;
    };
  }, [signalUrl, displayId, entityIds.join(','), handleState]);

  // No config
  if (!signalUrl || !displayId || entityIds.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <div className="text-3xl">🏠</div>
          <div className="text-sm text-white/40">Home Assistant</div>
          <div className="text-xs text-white/25">
            {!signalUrl ? 'Set signaling server URL' :
             !displayId ? 'Set display ID' :
             'Add entity IDs to watch'}
          </div>
        </div>
      </div>
    );
  }

  // Loading / error states
  if (!connected && entities.size === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <div className="text-2xl animate-pulse">🏠</div>
          <div className="text-xs text-white/40">
            {error || 'Connecting to Home Assistant...'}
          </div>
        </div>
      </div>
    );
  }

  const entityList = entityIds
    .map((id) => entities.get(id))
    .filter((e): e is HAEntityState => !!e);

  if (entityList.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <div className="text-2xl">🏠</div>
          <div className="text-xs text-white/40">Waiting for entity data...</div>
        </div>
      </div>
    );
  }

  // Single entity — fill the widget
  if (entityList.length === 1) {
    return (
      <div className="h-full w-full flex flex-col justify-center p-2 overflow-hidden">
        <EntityRenderer entity={entityList[0]} theme={theme} />
      </div>
    );
  }

  // Multiple entities — scrollable list
  return (
    <div className="h-full w-full overflow-y-auto p-2 space-y-2">
      {entityList.map((entity) => (
        <EntityRenderer key={entity.entity_id} entity={entity} theme={theme} />
      ))}
    </div>
  );
}

registerWidget({
  type: 'home-assistant',
  name: 'Home Assistant',
  description: 'Display live Home Assistant entity data — sensors, 3D printers, media players, cameras, and more',
  icon: 'gauge',
  minW: 2,
  minH: 2,
  maxW: 12,
  maxH: 8,
  defaultW: 3,
  defaultH: 3,
  tags: ['iot', 'smart-home', 'sensors'],
  component: HomeAssistantWidget,
  OptionsComponent: HomeAssistantOptions,
  defaultProps: {
    signalUrl: '',
    displayId: '',
    entityIds: [],
    layout: 'auto',
  },
});

export default HomeAssistantWidget;
