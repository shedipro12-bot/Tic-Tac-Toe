import { useSyncExternalStore, type ReactNode } from 'react';
import { acceptUpdate, getUpdateStatus, subscribeOffline } from './register';
import styles from '../app/App.module.css';

export function UpdateLock({ children }: { children: ReactNode }) {
  const update = useSyncExternalStore(subscribeOffline, getUpdateStatus);
  return <fieldset role="presentation" className={styles.updateControls} disabled={update.phase === 'applying'}>{children}</fieldset>;
}
export function UpdateNotice({ canApply }: { canApply: () => boolean }) {
  const update = useSyncExternalStore(subscribeOffline, getUpdateStatus);
  if (update.phase === 'none' || !canApply()) return null;
  return <section className={styles.updateNotice} aria-label="Application update" aria-busy={update.phase === 'applying'}>
    <p aria-live="polite">{update.phase === 'error' ? 'Update could not be completed. Your game is still available.'
      : update.phase === 'applying' ? 'Updating…' : 'A new version is ready.'}</p>
    <button className={styles.primary} disabled={update.phase === 'applying'} onClick={() => { void acceptUpdate(canApply); }}>
      Update and reset session
    </button>
  </section>;
}
