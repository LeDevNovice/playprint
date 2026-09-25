// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  session: false,
  adapter: cloudflare({
    imageService: 'passthrough',
  }),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Inter',
      cssVariable: '--font-inter',
      fallbacks: ['sans-serif'],
      options: {
        variants: [
          {
            src: ['@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'],
            weight: '100 900',
            style: 'normal',
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'DM Mono',
      cssVariable: '--font-dm-mono',
      fallbacks: ['monospace'],
      options: {
        variants: [
          {
            src: ['@fontsource/dm-mono/files/dm-mono-latin-400-normal.woff2'],
            weight: 400,
            style: 'normal',
          },
        ],
      },
    },
  ],
});