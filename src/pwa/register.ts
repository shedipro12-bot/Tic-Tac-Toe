import { registerSW } from 'virtual:pwa-register';
import { queryCache, waitForControl } from './worker';
export { queryCache } from './worker';

export type OfflineStatus = 'preparing' | 'ready' | 'unavailable' | 'unsupported';
let status: OfflineStatus = 'preparing';
const listeners = new Set<() => void>();
let started = false;
let pending = false;
let queued = false;
let registration: ServiceWorkerRegistration | undefined;
export type UpdateStatus = Readonly<{ phase: 'none' | 'available' | 'applying' | 'error'; buildId?: string }>;
let updateStatus: UpdateStatus = { phase: 'none' };
let updateWorker: ServiceWorker | undefined;
export const getUpdateStatus = () => updateStatus;
export const getOfflineStatus = () => status;
export const subscribeOffline = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
function update(next: UpdateStatus) {
  if (updateStatus.phase === next.phase && updateStatus.buildId === next.buildId) return;
  updateStatus = next; listeners.forEach(listener => listener());
}
function publish(next: OfflineStatus) {
  if (next === status) return;
  status = next; listeners.forEach(listener => listener());
}
async function verify() {
  if (document.visibilityState === 'hidden') return;
  if (pending) { queued = true; return; }
  pending = true;
  try {
    if (!registration && navigator.onLine) observe(await navigator.serviceWorker.register('/sw.js', { scope: '/' }));
    const worker = registration?.active;
    if (!worker || worker.state !== 'activated') return;
    let report = await queryCache(worker);
    if (report.buildId === __PWA_BUILD_ID__) {
      if (report.missing.length && navigator.onLine) {
        publish('preparing'); report = await queryCache(worker, true);
      }
      publish(report.missing.length ? 'unavailable' : 'ready');
    } else {
      // This document still runs its fully loaded game. A different worker's
      // cache describes an available update, not this document's readiness.
      publish('preparing');
    }
    const waiting = registration?.waiting;
    const candidate = waiting?.state === 'installed' ? waiting : report.buildId !== __PWA_BUILD_ID__ ? worker : undefined;
    const candidateReport = candidate === worker ? report : candidate ? await queryCache(candidate) : undefined;
    if (updateStatus.phase !== 'applying') {
      if (candidate && candidateReport && candidateReport.buildId !== __PWA_BUILD_ID__ && !candidateReport.missing.length) {
        updateWorker = candidate;
        if (updateStatus.phase !== 'error' || updateStatus.buildId !== candidateReport.buildId)
          update({ phase: 'available', buildId: candidateReport.buildId });
      } else { updateWorker = undefined; update({ phase: 'none' }); }
    }
  } catch { publish('unavailable'); }
  finally { pending = false; if (queued) { queued = false; void verify(); } }
}
export async function acceptUpdate(canApply: () => boolean) {
  const worker = updateWorker; const buildId = updateStatus.buildId;
  if (!canApply() || !worker || !buildId || !['available', 'error'].includes(updateStatus.phase)) return;
  update({ phase: 'applying', buildId });
  try {
    const prepared = await queryCache(worker);
    if (!canApply() || prepared.buildId !== buildId || prepared.missing.length) throw new Error('Update unavailable');
    if (navigator.serviceWorker.controller !== worker && registration?.waiting !== worker) throw new Error('Update superseded');
    await waitForControl(worker);
    const active = await queryCache(worker);
    if (!canApply() || active.buildId !== buildId || active.missing.length || navigator.serviceWorker.controller !== worker) throw new Error('Update unavailable');
    // Only this explicit action reloads. Plugin callbacks and controllerchange
    // never reload this or any other document, even after external activation.
    window.location.reload();
  } catch { update({ phase: 'error', buildId }); }
}
function observe(value: ServiceWorkerRegistration | undefined) {
  registration = value;
  if (!value) { publish('unavailable'); return; }
  const watch = () => {
    const worker = value.installing;
    if (worker) worker.addEventListener('statechange', () => {
      if (worker.state === 'redundant' && !value.active) publish('unavailable');
      else void verify();
    });
  };
  value.addEventListener('updatefound', watch); watch(); void verify();
}
export function startPwa() {
  if (started || !import.meta.env.PROD) return;
  started = true;
  if (!('serviceWorker' in navigator) || !window.isSecureContext) { publish('unsupported'); return; }
  let lastCheck = 0;
  const resume = () => {
    void verify();
    if (document.visibilityState !== 'hidden' && navigator.onLine && registration && Date.now() - lastCheck > 30_000) {
      lastCheck = Date.now(); void registration.update().catch(() => { /* Current game remains available. */ });
    }
  };
  document.addEventListener('visibilitychange', resume);
  window.addEventListener('online', resume);
  window.addEventListener('pageshow', resume);
  navigator.serviceWorker.addEventListener('controllerchange', () => { void verify(); });
  registerSW({
    immediate: true,
    onNeedReload() { /* Updates never reload this running document automatically. */ },
    onNeedRefresh: () => { void verify(); },
    onRegisteredSW: (_url, value) => observe(value),
    onOfflineReady: () => { void verify(); },
    onRegisterError: () => publish('unavailable'),
  });
}
