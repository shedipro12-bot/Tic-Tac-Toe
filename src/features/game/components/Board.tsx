import type { Board as BoardData, Cell, WinningLine } from '../domain/types';
import styles from '../../../app/App.module.css';

function ChalkMark({ value }: { value: Cell }) {
  if (!value) return null;
  return <svg className={value === 'X' ? styles.markX : styles.markO} viewBox="0 0 100 100" aria-hidden="true">
    {value === 'X'
      ? <><path d="M24 23 L76 77 M76 23 L24 77" /><path className={styles.chalkDetail} d="M24 24 L74 76 M75 25 L25 75" /></>
      : <><circle cx="50" cy="50" r="29" /><circle className={styles.chalkDetail} cx="50" cy="50" r="28" /></>}
  </svg>;
}
export function Board({ board, locked, winningLine, onMove }: {
  board: BoardData; locked: boolean; winningLine: WinningLine | null; onMove: (index: number) => void;
}) {
  const point = (index: number) => ({ x: (index % 3) * 100 + 50, y: Math.floor(index / 3) * 100 + 50 });
  const first = winningLine && point(winningLine[0]);
  const last = winningLine && point(winningLine[2]);
  return <div className={styles.woodFrame}>
    <div className={styles.board} role="group" aria-label="Tic-Tac-Toe board">
      {board.map((cell, index) => <CellButton key={index} value={cell} index={index} disabled={locked || cell !== null} onMove={onMove} />)}
      {first && last && <svg className={styles.winningLine} viewBox="0 0 300 300" aria-hidden="true">
        <line x1={first.x} y1={first.y} x2={last.x} y2={last.y} />
      </svg>}
    </div>
  </div>;
}
function CellButton({ value, index, disabled, onMove }: { value: Cell; index: number; disabled: boolean; onMove: (index: number) => void }) {
  return <button className={styles.cell} disabled={disabled}
    aria-label={`Row ${Math.floor(index / 3) + 1}, column ${index % 3 + 1}: ${value ?? 'empty'}`}
    onClick={() => onMove(index)}><ChalkMark value={value} /></button>;
}
