import './styles/shell.css';
import { queryCache, waitForControl } from './pwa/worker';

let failed = false;
let recovering = false;
const fallback = document.getElementById('connection-needed')!;
const notice = document.getElementById('bootstrap-update')!;
const button = document.getElementById('bootstrap-update-button') as HTMLButtonElement;
const message = document.getElementById('bootstrap-update-message')!;
let candidate: { worker: ServiceWorker; buildId: string } | undefined;
let applying = false;
let queued = false;
let retryTimer: number | undefined;
let retryCount = 0;
const visible = () => document.visibilityState !== 'hidden';
async function load() {
  try { await import('./main'); }
  catch {
    failed = true; fallback.hidden = false;
    document.getElementById('connection-title')?.focus();
    void recover();
  }
}
async function recover() {
  if (!failed || applying || !visible()) return;
  if (recovering) { queued = true; return; }
  recovering = true;
  try {
    // Read the existing registration; the fallback never registers a second worker.
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      const worker = registration?.waiting ?? registration?.active;
      if (worker) {
        const report = await queryCache(worker);
        if (report.buildId !== __PWA_BUILD_ID__) {
          candidate = report.missing.length ? undefined : { worker, buildId: report.buildId };
          notice.hidden = !candidate;
          return; // A different build always needs local consent, even after external activation.
        }
      }
    }
    if (!navigator.onLine) return;
    const response = await fetch('/boot-meta.json', { cache: 'reload' });
    if (!response.ok) return;
    const { buildId, core } = await response.json() as { buildId: string; core: string[] };
    if (buildId !== __PWA_BUILD_ID__) return;
    for (const url of core) {
      const resource = await fetch(url, { cache: 'reload' });
      if (!resource.ok || resource.headers.get('content-type')?.includes('text/html')) return;
    }
    // Only a failed bootstrap can reach this path; no match has started.
    window.location.reload();
  } catch { /* Retain the readable connection message. */ }
  finally {
    recovering = false;
    if (queued) { queued = false; void recover(); }
    else if (failed && !candidate && navigator.onLine && visible() && retryTimer === undefined && retryCount < 3) {
      // An online event can precede actual transport availability, especially
      // for worker requests. Retry only this failed shell, with a fixed budget.
      const delay = 1000 * 2 ** retryCount++;
      retryTimer = window.setTimeout(() => { retryTimer = undefined; void recover(); }, delay);
    }
  }
}
button.addEventListener('click', async () => {
  if (!candidate || applying) return;
  const target = candidate; applying = true; button.disabled = true; message.textContent = 'Updating…';
  try {
    const report = await queryCache(target.worker);
    const registration = await navigator.serviceWorker.getRegistration();
    if (report.buildId !== target.buildId || report.missing.length ||
      (registration?.waiting !== target.worker && navigator.serviceWorker.controller !== target.worker)) throw new Error('Update unavailable');
    await waitForControl(target.worker);
    const active = await queryCache(target.worker);
    if (active.buildId !== target.buildId || active.missing.length || navigator.serviceWorker.controller !== target.worker) throw new Error('Update unavailable');
    window.location.reload();
  } catch { message.textContent = 'Update could not be completed. Try again.'; }
  finally { applying = false; button.disabled = false; }
});
function resume() {
  clearTimeout(retryTimer); retryTimer = undefined; retryCount = 0; void recover();
}
window.addEventListener('online', resume);
window.addEventListener('offline', () => { clearTimeout(retryTimer); retryTimer = undefined; });
document.addEventListener('visibilitychange', resume);
if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('controllerchange', () => { void recover(); });
void load();
