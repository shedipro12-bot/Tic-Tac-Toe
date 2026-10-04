import { describe, expect, it } from 'vitest';
import { chooseComputerMove, scoreComputerMoves } from '../../src/features/game/domain/opponent';
import { DIFFICULTIES, MISTAKE_PROBABILITY } from '../../src/features/game/domain/difficulty';
import { emptyBoard } from '../../src/features/game/domain/rules';
import { allReachableBoards, findHumanPath, referenceMoveScores, terminal } from '../helpers/gameTree';

const positions = allReachableBoards().filter(board => !terminal(board) && board.filter(cell => cell === 'X').length === board.filter(cell => cell === 'O').length + 1);
describe('strategic, beatable computer opponent', () => {
  it('uses the approved initial difficulty ordering', () => {
    expect(MISTAKE_PROBABILITY).toEqual({ easy: 0.5, medium: 0.25, hard: 0.1 });
  });
  for (const difficulty of DIFFICULTIES) {
    it(`${difficulty}: legal strategic and strictly worse choices across every computer-turn board`, () => {
      for (const board of positions) {
        const oracle = referenceMoveScores(board);
        const best = Math.max(...oracle.map(move => move.score));
        const worse = oracle.some(move => move.score < best);
        const strategic = chooseComputerMove(board, difficulty, () => 0.99);
        const mistaken = chooseComputerMove(board, difficulty, () => 0);
        expect(board[strategic]).toBeNull(); expect(board[mistaken]).toBeNull();
        expect(oracle.find(move => move.index === strategic)!.score).toBe(best);
        expect(oracle.find(move => move.index === mistaken)!.score < best).toBe(worse);
      }
    });
  }
  it('applies the threshold and does not classify equally good moves as mistakes', () => {
    const board = positions.find(board => {
      const scores = scoreComputerMoves(board).map(move => move.outcome);
      return Math.min(...scores) < Math.max(...scores);
    })!;
    for (const difficulty of DIFFICULTIES) {
      const threshold = MISTAKE_PROBABILITY[difficulty];
      let call = 0;
      const move = chooseComputerMove(board, difficulty, () => call++ === 0 ? threshold : 0);
      expect(scoreComputerMoves(board).find(score => score.index === move)!.outcome).toBe(Math.max(...scoreComputerMoves(board).map(score => score.outcome)));
    }
  });
  it('proves a reachable human win against Hard and other complete outcomes', () => {
    expect(findHumanPath('human-win', 0).length).toBeGreaterThanOrEqual(3);
    expect(findHumanPath('computer-win', 0.99).length).toBeGreaterThanOrEqual(3);
    expect(findHumanPath('draw', 0.99)).toHaveLength(5);
  });
  it('rejects setup/terminal boards and invalid randomness', () => {
    expect(() => chooseComputerMove(emptyBoard(), 'hard', () => 0)).toThrow();
    const board = positions[0];
    for (const rng of [-1, 1, NaN]) expect(() => chooseComputerMove(board, 'hard', () => rng)).toThrow();
    expect(() => chooseComputerMove(['X','X','X','O','O',null,null,null,null], 'hard')).toThrow();
  });
});
