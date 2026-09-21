import { describe, expect, it } from 'vitest';
import { Emitter } from '../src/emitter.js';
import { mergeOptions, resolveDir, resolveLabels } from '../src/defaults.js';
import { enDigits, faStr, isValidLatLng, shortAddr } from '../src/format.js';
import { themeVars } from '../src/theme.js';
import { FA_LABELS } from '../src/i18n.js';

describe('mergeOptions', () => {
  it('applies defaults', () => {
    const m = mergeOptions({ container: '#qp' });
    expect(m.map.zoom).toBe(14);
    expect(m.marker.type).toBe('default');
    expect(m.markers).toEqual([]);
  });
  it('deep-merges nested keys', () => {
    const m = mergeOptions({ container: '#qp', map: { zoom: 16 }, theme: { brand: 'red' } });
    expect(m.map.zoom).toBe(16);
    expect(m.map.minZoom).toBe(11);
    expect(m.theme.brand).toBe('red');
  });
});

describe('labels/dir', () => {
  it('fa defaults, en override', () => {
    expect(mergeOptions({ container: '#qp' }).i18n.labels.searchTitle).toBe(FA_LABELS.searchTitle);
    expect(resolveLabels({ locale: 'en' }).close).toBe('Close');
    expect(resolveDir('auto')).toBe('rtl');
    expect(resolveDir('ltr')).toBe('ltr');
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

describe('themeVars', () => {
  it('maps keys to --qp-* vars', () => {
    expect(themeVars({ brand: '#fff', radius: 8 })['--qp-brand']).toBe('#fff');
    expect(themeVars({ radius: 8 })['--qp-radius']).toBe('8px');
    expect(themeVars({})).toEqual({});
  });
});
