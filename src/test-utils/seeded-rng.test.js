import { describe, it, expect } from 'vitest';
import { makeSeededRng } from './seeded-rng.js';
import { Config } from '../config.js';

// Sanity tests confirming the test tooling runs and the Task 1 setup is sound.
describe('project setup', () => {
  it('Config exposes all tunable constants', () => {
    const keys = [
      'width',
      'height',
      'groundY',
      'gravity',
      'flapVelocity',
      'scrollSpeed',
      'gapHeight',
      'gapMargin',
      'pipeWidth',
      'pipeSpacing',
      'ghostStartX',
      'ghostStartY',
      'ghostWidth',
      'ghostHeight',
      'maxDt',
    ];
    for (const key of keys) {
      expect(Config[key]).toBeTypeOf('number');
    }
  });

  it('Config leaves room for a valid gap-center range', () => {
    expect(Config.gapHeight + 2 * Config.gapMargin).toBeLessThan(Config.groundY);
  });
});

describe('makeSeededRng', () => {
  it('is deterministic for a given seed', () => {
    const a = makeSeededRng(42);
    const b = makeSeededRng(42);
    const seqA = [a(), a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it('produces values in [0, 1)', () => {
    const rng = makeSeededRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('produces different sequences for different seeds', () => {
    const a = makeSeededRng(1);
    const b = makeSeededRng(2);
    expect(a()).not.toEqual(b());
  });
});
