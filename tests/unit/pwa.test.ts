import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.useRealTimers(); vi.resetModules(); Reflect.deleteProperty(navigator, 'serviceWorker'); });
describe('PWA initialization and reporting', () => {
  it('does not register a development worker', async () => {
    vi.stubEnv('PROD', false);
    const { startPwa } = await import('../../src/pwa/register');
    const { registerSW } = await import('../helpers/pwa-register');
    startPwa(); expect(registerSW).not.toHaveBeenCalled();
  });
  it('degrades unsupported contexts without blocking gameplay', async () => {
    vi.stubEnv('PROD', true);
    vi.stubGlobal('isSecureContext', false);
    const { startPwa, getOfflineStatus } = await import('../../src/pwa/register');
    const { registerSW } = await import('../helpers/pwa-register');
    startPwa(); expect(getOfflineStatus()).toBe('unsupported'); expect(registerSW).not.toHaveBeenCalled();
  });
  it('registers once, does not auto reload, and reports a registration failure', async () => {
    vi.stubEnv('PROD', true);
    vi.stubGlobal('isSecureContext', true);
    Object.defineProperty(navigator, 'serviceWorker', { value: new EventTarget(), configurable: true });
    const { startPwa, getOfflineStatus, subscribeOffline } = await import('../../src/pwa/register');
    const { registerSW: currentRegister } = await import('../helpers/pwa-register');
    const listener = vi.fn(); const unsubscribe = subscribeOffline(listener);
    startPwa(); startPwa(); expect(currentRegister).toHaveBeenCalledTimes(1);
    const options = currentRegister.mock.calls[0][0];
    expect(options.onNeedReload).toBeTypeOf('function'); options.onNeedReload!();
    expect(getOfflineStatus()).toBe('preparing');
    options.onRegisterError!(new Error('blocked')); expect(getOfflineStatus()).toBe('unavailable');
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe(); options.onRegisterError!(new Error('again')); expect(listener).toHaveBeenCalledTimes(1);
    Reflect.deleteProperty(navigator, 'serviceWorker');
  });
  it('accepts a cache report through a bounded message channel and closes it', async () => {
    const port = { onmessage: null as null | ((event: { data: unknown }) => void), close: vi.fn() };
    vi.stubGlobal('MessageChannel', class { port1 = port; port2 = {}; });
    const { queryCache } = await import('../../src/pwa/register');
    const worker = { postMessage: vi.fn((_message: unknown, _transfer?: Transferable[]) => port.onmessage!({ data: { buildId: 'version', missing: [] } })) };
    expect(await queryCache(worker as unknown as ServiceWorker)).toEqual({ buildId: 'version', missing: [] });
    expect(worker.postMessage.mock.calls[0][0]).toEqual({ type: 'CHECK_CACHE' }); expect(port.close).toHaveBeenCalledTimes(1);
  });
  it('times out an unresponsive worker without leaking the port', async () => {
    vi.useFakeTimers(); const close = vi.fn();
    vi.stubGlobal('MessageChannel', class { port1 = { close, onmessage: null }; port2 = {}; });
    const { queryCache } = await import('../../src/pwa/register');
    const promise = queryCache({ postMessage() {} } as unknown as ServiceWorker);
    const assertion = expect(promise).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(10_000); await assertion; expect(close).toHaveBeenCalledTimes(1);
  });
});
