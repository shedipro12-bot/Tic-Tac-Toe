import { defineConfig } from '@playwright/test';
const baseURL = process.env.MILESTONE5_HOSTED_BASE_URL;
if (!baseURL || !/^https:\/\/[\w.-]+\.pages\.dev\/$/.test(baseURL)) throw new Error('Set MILESTONE5_HOSTED_BASE_URL to the verified Pages HTTPS origin, ending in /.');
export default defineConfig({
  testDir: './tests/hosted', workers: 1, fullyParallel: false, timeout: 60_000,
  reporter: [['list']], use: { baseURL, browserName: 'chromium', channel: 'chrome', viewport: { width: 390, height: 844 }, trace: 'retain-on-failure' },
  outputDir: '.playwright/hosted-results',
});
