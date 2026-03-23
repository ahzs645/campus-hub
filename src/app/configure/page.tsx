'use client';

import { ConfigurePage } from '@campus-hub/configurator';
import '@campus-hub/engine/widgets';

export default function Configure() {
  return <ConfigurePage enableBrowserPersistence />;
}
