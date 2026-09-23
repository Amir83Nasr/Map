'use client';
import './styles.css';
import { useEffect, useRef } from 'react';
import { LocationPicker } from './picker.js';
import type { LocationPickerOptions } from './types.js';

/** Public props: engine options minus `container` (React owns the element) + layout. */
export type QomPickProps = Omit<LocationPickerOptions, 'container'> & {
  className?: string;
  style?: React.CSSProperties;
};

export function LocationPickerView({ className, style, ...opts }: QomPickProps): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef(opts);
  cb.current = opts;
  useEffect(() => {
    if (!ref.current) return;
    const p = new LocationPicker({
      ...opts,
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
