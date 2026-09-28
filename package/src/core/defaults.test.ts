import { describe, expect, it } from 'vitest';
import { QOM_SUGGESTIONS, mergeOptions, resolveDir, resolveLabels } from './defaults.js';
import { FA_LABELS } from './i18n.js';

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
  it('keeps custom center/zoom, fills the rest', () => {
    const m = mergeOptions({ container: '#qp', map: { center: { lat: 35, lng: 51 }, zoom: 10 } });
    expect(m.map.center).toEqual({ lat: 35, lng: 51 });
    expect(m.map.zoom).toBe(10);
    expect(m.map.minZoom).toBe(11);
  });
  it('search.placeholder passes through', () => {
    expect(
      mergeOptions({ container: '#qp', search: { placeholder: 'کجا؟' } }).search.placeholder,
    ).toBe('کجا؟');
  });
});

describe('labels/dir', () => {
  it('fa only, always rtl', () => {
    expect(mergeOptions({ container: '#qp' }).i18n.labels?.searchTitle).toBe(FA_LABELS.searchTitle);
    expect(resolveLabels().close).toBe(FA_LABELS.close);
    expect(resolveDir()).toBe('rtl');
  });
  it('custom labels override defaults', () => {
    expect(resolveLabels({ labels: { close: 'X' } }).close).toBe('X');
  });
  it('submitting label exists (no hardcoded confirm text)', () => {
    expect(FA_LABELS.submitting).toBeTruthy();
  });
  it('QOM_SUGGESTIONS exported (41 Qom neighborhoods)', () => {
    expect(QOM_SUGGESTIONS).toHaveLength(41);
    expect(mergeOptions({ container: '#qp' }).search.suggestions).toBe(QOM_SUGGESTIONS);
  });
});
