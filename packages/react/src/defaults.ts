import type { I18nOption, Labels, LocationPickerOptions } from './types.js';
import { FA_LABELS } from './i18n.js';

export const DEFAULT_CENTER: { lat: number; lng: number } = { lat: 34.6416, lng: 50.8764 };
export const DEFAULT_ZOOM = 14;

export function resolveLabels(i18n?: I18nOption): Labels {
  return { ...FA_LABELS, ...(i18n?.labels ?? {}) };
}

export function resolveDir(): 'rtl' {
  return 'rtl';
}

// Deep-merge user options over library defaults (arrays replace, objects merge).
export function mergeOptions(
  user: LocationPickerOptions,
): Required<
  Omit<LocationPickerOptions, 'container' | keyof import('./types.js').PickerCallbacks>
> & { container: LocationPickerOptions['container'] } {
  const o = user ?? {};
  return {
    container: o.container,
    map: {
      center: { ...DEFAULT_CENTER },
      zoom: DEFAULT_ZOOM,
      minZoom: 11,
      maxZoom: 19,
      bounds: [
        [34.15, 50.35],
        [35.05, 51.45],
      ],
      ...(o.map ?? {}),
    },
    controls: {
      gps: true,
      confirmButton: true,
      searchTrigger: true,
      developers: false,
      ...(o.controls ?? {}),
    },
    search: { enabled: true, minLength: 3, debounceMs: 350, limit: 5, ...(o.search ?? {}) },
    sheet: { enabled: true, desktopSidebar: true, ...(o.sheet ?? {}) },
    behavior: {
      snapToRoad: true,
      resolveOnMove: true,
      resolveDelayMs: 400,
      settleDelayMs: 250,
      snapDelayMs: 900,
      pickZoom: 15,
      locateZoom: 18,
      ...(o.behavior ?? {}),
    },
    i18n: { labels: resolveLabels(o.i18n) },
    markers: o.markers ?? [],
  };
}
