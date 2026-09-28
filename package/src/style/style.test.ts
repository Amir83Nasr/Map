import { describe, expect, it } from 'vitest';
import { MAP_STYLE } from './map-style.js';

describe('map style', () => {
  it('vector default: CDN glyphs (shipped PBFs) + openfreemap sprite', () => {
    const v = MAP_STYLE as unknown as Record<string, unknown>;
    expect(v['version']).toBe(8);
    expect(v['glyphs']).toBe(
      'https://cdn.jsdelivr.net/npm/@amir83nasr/map@1/fonts/{fontstack}/{range}.pbf',
    );
    expect(v['sprite']).toContain('openfreemap');
  });
  it('uses spaceless IRANYekanX fontstack', () => {
    const v = MAP_STYLE as unknown as { layers: { layout?: Record<string, unknown> }[] };
    const fonts = v.layers.flatMap((l) => (l.layout?.['text-font'] as string[] | undefined) ?? []);
    expect(fonts.length).toBeGreaterThan(0);
    expect(fonts.every((f) => !f.includes(' '))).toBe(true);
  });
});
