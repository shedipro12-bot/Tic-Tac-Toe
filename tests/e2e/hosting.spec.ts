import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { screenshot, open, start, cell } from '../helpers/browserGame';

test('real HTTP responses apply security, content types, cache policy and distinct 404s', async ({ request, browser }) => {
  const inventory = JSON.parse(await readFile('dist/precache-inventory.json', 'utf8'));
  const files = ['/', '/index.html', '/sw.js', '/boot-meta.json', '/precache-inventory.json', ...inventory.entries.map((entry: { url: string }) => `/${entry.url}`)];
  const report = [];
  for (const file of [...new Set<string>(files)]) {
    const response = await request.get(file); const headers = response.headers();
    expect(response.status(), file).toBe(200);
    expect(headers['content-security-policy']).toContain("script-src 'self'");
    expect(headers['content-security-policy']).not.toMatch(/unsafe-|https?:\/\//);
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('no-referrer');
    expect(headers['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()');
    if (file.startsWith('/assets/')) expect(headers['cache-control']).toBe('public, max-age=31536000, immutable');
    else if (file !== '/404.html') expect(headers['cache-control']).toBe('public, max-age=0, must-revalidate');
    if (file.endsWith('.js')) expect(headers['content-type']).toContain('javascript');
    if (file.endsWith('.mp3')) expect(headers['content-type']).toBe('audio/mpeg');
    if (file.endsWith('.webmanifest')) expect(headers['content-type']).toBe('application/manifest+json');
    const revalidated = await request.get(file, { headers: { 'If-None-Match': headers.etag } });
    expect(revalidated.status()).toBe(304); report.push({ file, status: response.status(), headers, revalidation: 304 });
  }
  for (const file of ['/assets/missing.js', '/sounds/missing.mp3', '/api/missing', '/not-a-route']) {
    const response = await request.get(file); expect(response.status()).toBe(404);
    expect(await response.text()).not.toContain('id="root"'); report.push({ file, status: 404, headers: response.headers() });
  }
  const { mkdir, writeFile } = await import('node:fs/promises'); await mkdir('artifacts/milestone-5', { recursive: true });
  await writeFile('artifacts/milestone-5/local-http-report.json', JSON.stringify({
    browser: browser.version(), source: 'Local static verification server; Cloudflare HTTPS remains a separate check', report,
  }, null, 2));
});
test('production CSP permits fonts, graphics, worker messages, actual audio and a complete game', async ({ page }) => {
  const violations: string[] = [];
  await page.exposeFunction('recordPolicyViolation', (directive: string) => violations.push(directive));
  await page.addInitScript(() => document.addEventListener('securitypolicyviolation', event => {
    void (window as typeof window & { recordPolicyViolation: (directive: string) => Promise<void> }).recordPolicyViolation(event.violatedDirective);
  }));
  await open(page, 0); await expect(page.locator('[data-offline-status="ready"]')).toBeVisible();
  await start(page, 'medium'); await cell(page, 0).click(); await page.clock.runFor(400);
  expect(await page.evaluate(() => document.fonts.check('800 28px "Nunito Sans"'))).toBe(true);
  await page.evaluate(() => {
    const button = document.createElement('button'); button.id = 'csp-media-probe'; button.textContent = 'Play local sound';
    button.addEventListener('click', () => {
      const audio = new Audio('/sounds/move-v1.mp3');
      (window as typeof window & { soundPlayed: Promise<boolean> }).soundPlayed = audio.play().then(() => { const success = !audio.paused; audio.pause(); return success; });
    }); document.body.append(button);
  });
  await page.getByRole('button', { name: 'Play local sound' }).click();
  expect(await page.evaluate(() => (window as typeof window & { soundPlayed: Promise<boolean> }).soundPlayed)).toBe(true);
  await page.locator('#csp-media-probe').evaluate(button => button.remove());
  const { playPath } = await import('../helpers/browserGame'); await page.getByRole('button', { name: 'Restart' }).click();
  await playPath(page, 'human-win', 0); await expect(page.getByRole('status')).toHaveText('You win');
  expect(violations).toEqual([]); await screenshot(page, 'csp-game-complete');
});
