import React, { useEffect, useState } from 'react';
import { Dimensions } from 'react-native';
// Import shared DisplayGrid and trigger widget registration
import { DisplayGrid } from '@campus-hub/shared';
import '@campus-hub/shared';
import { DisplayConfig, DEFAULT_CONFIG } from './types';

interface Props {
  config?: DisplayConfig;
  configUrl?: string;
}

export function DisplayRenderer({ config: propConfig, configUrl }: Props) {
  const [config, setConfig] = useState<DisplayConfig>(
    propConfig || DEFAULT_CONFIG,
  );
  const [screenSize, setScreenSize] = useState(Dimensions.get('window'));

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setScreenSize(window);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (configUrl) {
      fetch(configUrl)
        .then((r) => r.json())
        .then((data) => setConfig(data))
        .catch(() => {});
    }
  }, [configUrl]);

  useEffect(() => {
    if (propConfig) setConfig(propConfig);
  }, [propConfig]);

  return (
    <DisplayGrid
      config={config}
      width={screenSize.width}
      height={screenSize.height}
    />
  );
}
