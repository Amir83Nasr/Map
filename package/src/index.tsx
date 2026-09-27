'use client';
import './styles.css';
import { useEffect, useRef } from 'react';
import { setWorkerUrl } from 'maplibre-gl';
import { LocationPicker } from './picker.js';
import type { LocationPickerOptions } from './types.js';

/** Public props: engine options minus `container` (React owns the element) + layout. */
export type QomPickProps = Omit<LocationPickerOptions, 'container'> & {
  className?: string;
  style?: React.CSSProperties;
};

/**
 * Set MapLibre's worker URL before mounting `LocationPickerView`.
 * Worker files are bundler-specific — the package cannot ship them for you.
 * Vite: `import url from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'`.
 * Next.js/webpack: copy both `maplibre-gl-worker.mjs` and `maplibre-gl-shared.mjs`.
 */
export function setupQomPickWorker(workerUrl: string): void {
  setWorkerUrl(workerUrl);
}

/** Alias matching the package name; identical to `setupQomPickWorker`. */
export const setupMapWorker = setupQomPickWorker;

// NOTE: engine options (map/search/markers/...) apply only on mount —
// remount with a `key` to apply new options.
// Only callbacks stay live via ref.
export function LocationPickerView({ className, style, ...opts }: QomPickProps): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef(opts);
  useEffect(() => {
    cb.current = opts;
  });
  useEffect(() => {
    if (!ref.current) return;
    const p = new LocationPicker({
      ...cb.current,
      container: ref.current,
      onLocationChange: (l) => cb.current.onLocationChange?.(l),
      onAddressResolved: (l) => cb.current.onAddressResolved?.(l),
      onSearchResults: (r) => cb.current.onSearchResults?.(r),
      onPick: (l) => cb.current.onPick?.(l),
      onConfirm: (l) => cb.current.onConfirm?.(l),
      onLocate: (l) => cb.current.onLocate?.(l),
      onError: (e) => cb.current.onError?.(e),
    });
    return () => p.destroy();
  }, []);
  return <div ref={ref} className={className} style={{ height: 480, ...style }} />;
}

export type * from './types.js';
export { QOM_SUGGESTIONS } from './defaults.js';
