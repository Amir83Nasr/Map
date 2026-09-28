import { describe, expect, it } from 'vitest';
import { Emitter } from './emitter.js';
import { isMapLibreWorkerError } from './picker.js';

describe('emitter', () => {
  it('on/off/emit', () => {
    const e = new Emitter();
    let n = 0;
    const off = e.on('ready', () => n++);
    e.emit('ready');
    off();
    e.emit('ready');
    expect(n).toBe(1);
  });
  it('listener errors do not break other listeners', () => {
    const e = new Emitter();
    let n = 0;
    e.on('ready', () => {
      throw new Error('boom');
    });
    e.on('ready', () => n++);
    e.emit('ready');
    expect(n).toBe(1);
  });
});

describe('MapLibre worker errors', () => {
  it('recognizes worker asset failures only', () => {
    expect(
      isMapLibreWorkerError(
        new Error('Failed to fetch worker script (404): /maplibre-gl-worker.mjs'),
      ),
    ).toBe(true);
    expect(
      isMapLibreWorkerError({
        message: 'error loading dynamically imported module',
        filename: '/maplibre-gl-shared.mjs',
      }),
    ).toBe(true);
    expect(isMapLibreWorkerError(new Error('AJAXError: Not Found (404): /tiles/14/1/2.pbf'))).toBe(
      false,
    );
    expect(isMapLibreWorkerError(new Error('Could not load glyph range'))).toBe(false);
  });
});
