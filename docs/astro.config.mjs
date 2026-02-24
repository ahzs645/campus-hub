import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  base: '/docs',
  integrations: [
    starlight({
      title: 'Campus Hub',
      description: 'Documentation for Campus Hub — modular digital signage for campus displays.',
      customCss: ['./src/styles/custom.css'],
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/ahzs645/campus-hub' },
      ],
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Overview', slug: 'getting-started/overview' },
            { label: 'Quick Start', slug: 'getting-started/quick-start' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'Developing Widgets', slug: 'guides/developing-widgets' },
            { label: 'Link Sharing', slug: 'guides/link-sharing' },
            { label: 'CORS & Proxies', slug: 'guides/cors-setup' },
            { label: 'External Data Sources', slug: 'guides/external-data' },
          ],
        },
        {
          label: 'Architecture',
          items: [
            { label: 'System Overview', slug: 'architecture/system-overview' },
            { label: 'Widget Registry', slug: 'architecture/widget-registry' },
            { label: 'Configuration Format', slug: 'architecture/configuration' },
          ],
        },
      ],
    }),
  ],
});
