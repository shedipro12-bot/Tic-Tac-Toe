import './styles/shell.css';

let failed = false;
let recovering = false;
const fallback = document.getElementById('connection-needed')!;
async function load() {
  try { await import('./main'); }
  catch {
    failed = true; fallback.hidden = false;
    document.getElementById('connection-title')?.focus();
  }
}
async function recover() {
  if (!failed || recovering || !navigator.onLine || document.visibilityState === 'hidden') return;
  recovering = true;
  try {
    const response = await fetch('/boot-meta.json', { cache: 'reload' });
    if (!response.ok) return;
    const { core } = await response.json() as { core: string[] };
    for (const url of core) {
      const resource = await fetch(url, { cache: 'reload' });
      if (!resource.ok || resource.headers.get('content-type')?.includes('text/html')) return;
    }
    // Only a failed bootstrap can reach this path; no match has started.
    window.location.reload();
  } catch { /* Retain the readable connection message. */ }
  finally { recovering = false; }
}
window.addEventListener('online', () => { void recover(); });
document.addEventListener('visibilitychange', () => { void recover(); });
void load();
