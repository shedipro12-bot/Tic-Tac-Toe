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
export function waitForControl(worker: ServiceWorker): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => { clearTimeout(timeout); navigator.serviceWorker.removeEventListener('controllerchange', check); worker.removeEventListener('statechange', check); };
    const check = () => {
      if (navigator.serviceWorker.controller === worker && worker.state === 'activated') { cleanup(); resolve(); }
      else if (worker.state === 'redundant') { cleanup(); reject(new Error('Update superseded')); }
    };
    const timeout = window.setTimeout(() => { cleanup(); reject(new Error('Update timed out')); }, 10_000);
    navigator.serviceWorker.addEventListener('controllerchange', check); worker.addEventListener('statechange', check); check();
    try { if (navigator.serviceWorker.controller !== worker) worker.postMessage({ type: 'SKIP_WAITING' }); }
    catch (error) { cleanup(); reject(error); }
  });
}
