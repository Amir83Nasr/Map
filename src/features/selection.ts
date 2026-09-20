import type { MapView } from './map-view.js';
import type { SelectionOptions } from '../types/index.js';
import { RESOLVE_DELAY } from '../constants/index.js';
import { reverseGeocode } from '../services/geocode.js';
import { faStr, shortAddr } from '../utils/format.js';
import { state } from './state.js';

export interface Selection {
  setSelected(lat: number, lng: number, opts?: SelectionOptions): void;
  scheduleResolve(lat: number, lng: number, delay?: number): void;
}

export function createSelection(map: MapView, label: HTMLElement): Selection {
  let revTimer = 0;
  let revSeq = 0;

  function render(): void {
    label.textContent = state.address ? faStr(state.address) : 'جستجوی آدرس یا مکان';
  }

  async function resolveAddress(lat: number, lng: number): Promise<void> {
    const seq = ++revSeq;
    state.resolving = true;
    label.textContent = 'در حال پیدا کردن آدرس...';
    try {
      const text = await reverseGeocode(lat, lng);
      if (seq !== revSeq) return;
      state.address = shortAddr(text);
    } catch {
      if (seq !== revSeq) return;
      state.address = '';
    } finally {
      if (seq !== revSeq) return;
      state.resolving = false;
      render();
    }
  }

  return {
    setSelected(lat: number, lng: number, opts: SelectionOptions = {}): void {
      const { moveMap = false, resolve = true, zoom } = opts;
      state.lat = lat;
      state.lng = lng;
      if (moveMap) {
        map.moveTo(lat, lng, zoom ?? Math.max(map.map.getZoom(), 15));
      }
      if (resolve) {
        clearTimeout(revTimer);
        revTimer = window.setTimeout(() => void resolveAddress(lat, lng), RESOLVE_DELAY);
      } else {
        render();
      }
    },
    scheduleResolve(lat: number, lng: number, delay = RESOLVE_DELAY): void {
      clearTimeout(revTimer);
      revTimer = window.setTimeout(() => void resolveAddress(lat, lng), delay);
    },
  };
}
