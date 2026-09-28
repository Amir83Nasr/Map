import { describe, expect, it } from 'vitest';
import { enDigits, faCoord, faStr, isValidLatLng, shortAddr } from './format.js';

describe('format', () => {
  it('faStr converts latin + arabic digits', () => {
    expect(faStr('a1b')).toBe('a۱b');
    expect(faStr('٠١٢')).toBe('۰۱۲');
  });
  it('faCoord formats with fixed digits', () => {
    expect(faCoord(34.6416, 2)).toBe('۳۴.۶۴');
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
