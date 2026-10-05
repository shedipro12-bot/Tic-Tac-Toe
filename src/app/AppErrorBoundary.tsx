import { Component, type ReactNode } from 'react';
import styles from './App.module.css';
import { UpdateLock, UpdateNotice } from '../pwa/UpdateNotice';

export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean; generation: number }> {
  state = { failed: false, generation: 0 };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return (
      <main className={styles.shell}>
        <header className={styles.header}><h1>Tic-Tac-Toe</h1></header>
        <UpdateLock><section className={styles.recovery}>
          <h2>Something went wrong</h2>
          <p>Start a new session to try again.</p>
          <button className={styles.primary} onClick={() => this.setState(({ generation }) => ({ failed: false, generation: generation + 1 }))}>Start new session</button>
        </section></UpdateLock>
        <UpdateNotice canApply={() => true} />
      </main>
    );
    return <div key={this.state.generation}>{this.props.children}</div>;
  }
}
