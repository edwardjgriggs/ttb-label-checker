import { describe, it, expect } from 'vitest';
import { runPool } from './pool';

describe('runPool', () => {
  it('processes every item with bounded concurrency', async () => {
    const done: number[] = [];
    let active = 0;
    let peak = 0;
    await runPool([...Array(20).keys()], 5, async (item) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      done.push(item);
      active--;
    });
    expect(done).toHaveLength(20);
    expect(peak).toBeLessThanOrEqual(5);
    expect(peak).toBeGreaterThan(1);
  });
  it('one worker failure does not halt the pool', async () => {
    const done: number[] = [];
    await runPool([1, 2, 3], 2, async (item) => {
      if (item === 2) throw new Error('boom');
      done.push(item);
    });
    expect(done.sort()).toEqual([1, 3]);
  });
});
