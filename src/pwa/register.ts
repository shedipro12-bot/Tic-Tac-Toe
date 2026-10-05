import { registerSW } from 'virtual:pwa-register';

export type OfflineStatus = 'preparing' | 'ready' | 'unavailable' | 'unsupported';
let status: OfflineStatus = 'preparing';
const listeners = new Set<() => void>();
let started = false;
let pending = false;
let registration: ServiceWorkerRegistration | undefined;
export const getOfflineStatus = () => status;
export const subscribeOffline = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
function publish(next: OfflineStatus) {
  if (next === status) return;
  status = next; listeners.forEach(listener => listener());
}
export function queryCache(worker: ServiceWorker, repair = false): Promise<{ buildId: string; missing: string[] }> {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const close = () => { clearTimeout(timeout); channel.port1.close(); };
    const timeout = window.setTimeout(() => { close(); reject(new Error('Offline preparation timed out')); }, 10_000);
    channel.port1.onmessage = event => { close(); resolve(event.data); };
    try { worker.postMessage({ type: repair ? 'PREPARE_CACHE' : 'CHECK_CACHE' }, [channel.port2]); }
    catch (error) { close(); reject(error); }
  });
}
async function verify() {
  if (pending || document.visibilityState === 'hidden') return;
  pending = true;
  try {
    if (!registration && navigator.onLine) observe(await navigator.serviceWorker.register('/sw.js', { scope: '/' }));
    const worker = registration?.active;
    if (!worker || worker.state !== 'activated') return;
    let report = await queryCache(worker);
    if (report.buildId !== __PWA_BUILD_ID__) { publish('unavailable'); return; }
    if (report.missing.length && navigator.onLine) {
      publish('preparing'); report = await queryCache(worker, true);
    }
    publish(report.missing.length ? 'unavailable' : 'ready');
  } catch { publish('unavailable'); }
  finally { pending = false; }
}
function observe(value: ServiceWorkerRegistration | undefined) {
  registration = value;
  if (!value) { publish('unavailable'); return; }
  const watch = () => {
    const worker = value.installing;
    if (worker) worker.addEventListener('statechange', () => {
      if (worker.state === 'redundant') publish('unavailable');
      else void verify();
    });
  };
  value.addEventListener('updatefound', watch); watch(); void verify();
}
export function startPwa() {
  if (started || !import.meta.env.PROD) return;
  started = true;
  if (!('serviceWorker' in navigator) || !window.isSecureContext) { publish('unsupported'); return; }
  document.addEventListener('visibilitychange', () => { void verify(); });
  window.addEventListener('online', () => { void verify(); });
  window.addEventListener('pageshow', () => { void verify(); });
  navigator.serviceWorker.addEventListener('controllerchange', () => { void verify(); });
  registerSW({
    immediate: true,
    onNeedReload() { /* Updates never reload this running document automatically. */ },
    onRegisteredSW: (_url, value) => observe(value),
    onOfflineReady: () => { void verify(); },
    onRegisterError: () => publish('unavailable'),
  });
}
