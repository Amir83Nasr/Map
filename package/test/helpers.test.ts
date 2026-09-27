import { describe, expect, it } from 'vitest';
import { Emitter } from '../src/emitter.js';
import { QOM_SUGGESTIONS, mergeOptions, resolveDir, resolveLabels } from '../src/defaults.js';
import { enDigits, faStr, isValidLatLng, shortAddr } from '../src/format.js';
import { FA_LABELS } from '../src/i18n.js';
import { MAP_STYLE } from '../src/map-style.js';
import { setupMapWorker, setupQomPickWorker } from '../src/index.js';
import { isMapLibreWorkerError } from '../src/picker.js';

describe('mergeOptions', () => {
  it('applies defaults', () => {
    const m = mergeOptions({ container: '#qp' });
    expect(m.map.zoom).toBe(14);
    expect(m.markers).toEqual([]);
    expect(m.search.suggestions).toHaveLength(41);
    expect(m.search.suggestions).toContainEqual({
      name: 'پردیسان، قم',
      addr: 'شهرک پردیسان، شهر قم',
      lat: 34.6021,
      lng: 50.8412,
    });
  });

  it('replaces or disables default suggestions', () => {
    const custom = [{ name: 'سفارشی', addr: 'قم', lat: 34.64, lng: 50.87 }];
    expect(
      mergeOptions({ container: '#qp', search: { suggestions: custom } }).search.suggestions,
    ).toBe(custom);
    expect(
      mergeOptions({ container: '#qp', search: { suggestions: [] } }).search.suggestions,
    ).toEqual([]);
  });
});

describe('labels/dir', () => {
  it('fa only, always rtl', () => {
    expect(mergeOptions({ container: '#qp' }).i18n.labels?.searchTitle).toBe(FA_LABELS.searchTitle);
    expect(resolveLabels().close).toBe(FA_LABELS.close);
    expect(resolveDir()).toBe('rtl');
  });
});

describe('format', () => {
  it('faStr converts digits', () => {
    expect(faStr('a1b')).toBe('a۱b');
  });
  it('enDigits converts fa digits', () => {
    expect(enDigits('۱۲۳')).toBe('123');
  });
  it('shortAddr drops country', () => {
    expect(shortAddr('Tehran, Iran')).toBe('Tehran');
    expect(shortAddr(undefined)).toBe('');
  });
  it('validates latlng', () => {
    expect(isValidLatLng(34, 50)).toBe(true);
    expect(isValidLatLng(91, 0)).toBe(false);
    expect(isValidLatLng(NaN, 0)).toBe(false);
  });
});

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
});

describe('map style', () => {
  it('vector default: CDN glyphs (shipped PBFs) + openfreemap sprite', () => {
    const v = MAP_STYLE as unknown as Record<string, unknown>;
    expect(v['version']).toBe(8);
    expect(v['glyphs']).toBe(
      'https://cdn.jsdelivr.net/npm/@amir83nasr/map@1/fonts/{fontstack}/{range}.pbf',
    );
    expect(v['sprite']).toContain('openfreemap');
  });
});

describe('stage3: exports and labels', () => {
  it('QOM_SUGGESTIONS exported (41 Qom neighborhoods)', () => {
    expect(QOM_SUGGESTIONS).toHaveLength(41);
    expect(mergeOptions({ container: '#qp' }).search.suggestions).toBe(QOM_SUGGESTIONS);
  });
  it('search.placeholder passes through mergeOptions', () => {
    expect(
      mergeOptions({ container: '#qp', search: { placeholder: 'کجا؟' } }).search.placeholder,
    ).toBe('کجا؟');
  });
  it('submitting label exists (no hardcoded confirm text)', () => {
    expect(FA_LABELS.submitting).toBeTruthy();
  });
  it('setupMapWorker aliases setupQomPickWorker', () => {
    expect(setupMapWorker).toBe(setupQomPickWorker);
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
