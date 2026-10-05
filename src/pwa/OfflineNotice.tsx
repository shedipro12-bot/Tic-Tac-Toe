import { useSyncExternalStore } from 'react';
import { getOfflineStatus, subscribeOffline } from './register';
import styles from '../app/App.module.css';

export function OfflineNotice() {
  const status = useSyncExternalStore(subscribeOffline, getOfflineStatus);
  if (status === 'preparing' || status === 'unsupported') return null;
  return <p className={styles.offlineNotice} aria-live="polite" data-offline-status={status}>
    {status === 'ready' ? 'Ready to play offline' : 'Offline play could not be prepared.'}
  </p>;
}
