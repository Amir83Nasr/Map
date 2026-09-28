import { describe, expect, it } from 'vitest';
import { setupMapWorker, setupQomPickWorker } from '../index.js';

describe('react entry', () => {
  it('setupMapWorker aliases setupQomPickWorker', () => {
    expect(setupMapWorker).toBe(setupQomPickWorker);
  });
});
