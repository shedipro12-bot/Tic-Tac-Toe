import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { randomUUID, createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const buildId = randomUUID();
const supportFile = `sw-support-${buildId}.js`;
const digest = (data: string | Buffer) => createHash('sha256').update(data).digest('base64');

export default defineConfig({
  define: { __PWA_BUILD_ID__: JSON.stringify(buildId) },
  plugins: [react(), {
    name: 'bootstrap-metadata',
    generateBundle(_options, bundle) {
      const core = Object.values(bundle).filter(item => /\.(js|css)$/.test(item.fileName)).map(item => `/${item.fileName}`);
      this.emitFile({ type: 'asset', fileName: 'boot-meta.json', source: JSON.stringify({ buildId, core }) });
    },
  }, VitePWA({
    strategies: 'generateSW', registerType: 'prompt', injectRegister: null,
    includeManifestIcons: false,
    devOptions: { enabled: false },
    manifest: {
      id: '/', name: 'Tic-Tac-Toe', short_name: 'Tic-Tac-Toe', start_url: '/', scope: '/',
      display: 'standalone', lang: 'en', dir: 'ltr', theme_color: '#173E35', background_color: '#F5ECCD',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      cacheId: 'tic-tac-toe', clientsClaim: true, skipWaiting: false, cleanupOutdatedCaches: true,
      inlineWorkboxRuntime: true, importScripts: [supportFile],
      navigateFallback: '/index.html', navigateFallbackAllowlist: [/^\/$/],
      globPatterns: ['**/*.{html,js,css,json,webmanifest,woff,woff2,svg,png,mp3}'],
      globIgnores: ['sw.js', 'sw-support-*.js', '**/*.map'], maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
      manifestTransforms: [async entries => {
        const inventory = entries.map(entry => ({ ...entry, integrity: `sha256-${digest(readFileSync(`dist/${entry.url}`))}` }));
        // The unique support filename avoids a self-referencing content-hash cycle.
        inventory.push({ url: supportFile, revision: null, integrity: '', size: 0 });
        const support = readFileSync('scripts/sw-support.js', 'utf8')
          .replace('__INVENTORY__', JSON.stringify(inventory)).replace('__BUILD_ID__', JSON.stringify(buildId));
        writeFileSync(`dist/${supportFile}`, support);
        inventory[inventory.length - 1].integrity = `sha256-${digest(support)}`;
        writeFileSync('dist/precache-inventory.json', JSON.stringify({ buildId, entries: inventory }, null, 2));
        return { manifest: inventory, warnings: [] };
      }],
    },
  })],
  base: '/',
  test: { include: ['tests/unit/**/*.test.{ts,tsx}'], environment: 'jsdom', restoreMocks: true,
    alias: { 'virtual:pwa-register': fileURLToPath(new URL('./tests/helpers/pwa-register.ts', import.meta.url)) } },
});
