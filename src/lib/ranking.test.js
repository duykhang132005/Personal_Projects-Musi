import { describe, it, expect } from 'vitest';
import { scoreFor, startComparison, currentOpponent, answer, finish, maxComparisons, BUCKET_META } from './ranking.js';

// Drive the engine with a hidden "true" ordering to simulate a user.
function insertWithOracle(list, newId, trueOrder) {
  let s = startComparison(list, newId);
  while (!s.done) {
    const opp = currentOpponent(s);
    s = answer(s, trueOrder.indexOf(newId) < trueOrder.indexOf(opp) ? 'new' : 'existing');
  }
  return { list: finish(s), steps: s.steps };
}

describe('scoreFor', () => {
  it('maps a single item to the bucket max', () => {
    expect(scoreFor('liked', 0, 1)).toBe(10);
    expect(scoreFor('fine', 0, 1)).toBe(6.7);
    expect(scoreFor('disliked', 0, 1)).toBe(3.3);
  });
  it('spreads linearly from max to min', () => {
    expect(scoreFor('liked', 0, 3)).toBe(10);
    expect(scoreFor('liked', 2, 3)).toBe(6.7);
    expect(scoreFor('disliked', 4, 5)).toBe(0);
    expect(scoreFor('fine', 1, 3)).toBe(5.1);
  });
  it('keeps buckets ordered: every liked >= every fine >= every disliked', () => {
    for (const n of [1, 2, 7, 50]) {
      for (let i = 0; i < n; i++) {
        expect(scoreFor('liked', i, n)).toBeGreaterThanOrEqual(BUCKET_META.fine.max);
        expect(scoreFor('fine', i, n)).toBeGreaterThanOrEqual(BUCKET_META.fine.min);
        expect(scoreFor('disliked', i, n)).toBeLessThanOrEqual(BUCKET_META.disliked.max);
      }
    }
  });
  it('throws on unknown bucket', () => {
    expect(() => scoreFor('meh', 0, 1)).toThrow();
  });
});

describe('binary insertion', () => {
  it('needs no comparisons for an empty list', () => {
    const s = startComparison([], 'a');
    expect(s.done).toBe(true);
    expect(currentOpponent(s)).toBeNull();
    expect(finish(s)).toEqual(['a']);
  });

  it('builds the correct order for every insertion order', () => {
    const truth = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const shuffled = ['e', 'b', 'h', 'a', 'g', 'c', 'f', 'd'];
    let list = [];
    for (const id of shuffled) list = insertWithOracle(list, id, truth).list;
    expect(list).toEqual(truth);
  });

  it('inserts at top and bottom', () => {
    const truth = ['x', 'a', 'b', 'c', 'y'];
    expect(insertWithOracle(['a', 'b', 'c'], 'x', truth).list).toEqual(['x', 'a', 'b', 'c']);
    expect(insertWithOracle(['a', 'b', 'c'], 'y', truth).list).toEqual(['a', 'b', 'c', 'y']);
  });

  it('stays within log2 comparisons', () => {
    const truth = Array.from({ length: 100 }, (_, i) => `i${i}`);
    const list = truth.filter((id) => id !== 'i37');
    const { steps } = insertWithOracle(list, 'i37', truth);
    expect(steps).toBeLessThanOrEqual(maxComparisons(list.length));
    expect(maxComparisons(99)).toBe(7);
  });

  it('tie places the item directly above the opponent', () => {
    let s = startComparison(['a', 'b', 'c'], 'n');
    expect(currentOpponent(s)).toBe('b');
    s = answer(s, 'tie');
    expect(s.done).toBe(true);
    expect(finish(s)).toEqual(['a', 'n', 'b', 'c']);
  });

  it('ignores the new id if it is already in the list (re-rank)', () => {
    const s = startComparison(['a', 'n', 'b'], 'n');
    expect(s.list).toEqual(['a', 'b']);
  });

  it('rejects unknown answers and is a no-op once done', () => {
    const s = startComparison(['a'], 'n');
    expect(() => answer(s, 'maybe')).toThrow();
    const done = answer(s, 'new');
    expect(answer(done, 'existing')).toBe(done);
  });
});
