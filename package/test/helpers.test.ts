import { describe, expect, it } from 'vitest';
import { Emitter } from '../src/emitter.js';
import { mergeOptions, resolveDir, resolveLabels } from '../src/defaults.js';
import { enDigits, faStr, isValidLatLng, shortAddr } from '../src/format.js';
import { FA_LABELS } from '../src/i18n.js';
import { MAP_STYLE } from '../src/map-style.js';

describe('mergeOptions', () => {
  it('applies defaults', () => {
    const m = mergeOptions({ container: '#qp' });
    expect(m.map.zoom).toBe(14);
    expect(m.markers).toEqual([]);
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
      'https://cdn.jsdelivr.net/npm/qompick-react@1/fonts/{fontstack}/{range}.pbf',
    );
    expect(v['sprite']).toContain('openfreemap');
  });
});
