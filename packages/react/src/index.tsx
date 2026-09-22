'use client';
import './styles.css';
import { useEffect, useRef } from 'react';
import { LocationPicker } from './picker.js';
import type { LocationPickerOptions, NominatimResult, PickerLocation } from './types.js';

export interface QomPickProps extends Omit<
  LocationPickerOptions,
  | 'container'
  | 'onLocationChange'
  | 'onAddressResolved'
  | 'onSearchResults'
  | 'onPick'
  | 'onConfirm'
  | 'onLocate'
  | 'onError'
> {
  onLocationChange?: (loc: PickerLocation) => void;
  onAddressResolved?: (loc: PickerLocation) => void;
  onSearchResults?: (r: NominatimResult[]) => void;
  onPick?: (loc: PickerLocation) => void;
  onConfirm?: (loc: PickerLocation) => void;
  onLocate?: (loc: PickerLocation) => void;
  onError?: (err: Error) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function LocationPickerView({
  onLocationChange,
  onAddressResolved,
  onSearchResults,
  onPick,
  onConfirm,
  onLocate,
  onError,
  className,
  style,
  ...opts
}: QomPickProps): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const picker = useRef<LocationPicker | null>(null);
  const cb = useRef({
    onLocationChange,
    onAddressResolved,
    onSearchResults,
    onPick,
    onConfirm,
    onLocate,
    onError,
  });
  cb.current = {
    onLocationChange,
    onAddressResolved,
    onSearchResults,
    onPick,
    onConfirm,
    onLocate,
    onError,
  };
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
    picker.current = p;
    return () => {
      p.destroy();
      picker.current = null;
    };
  }, []);
  return <div ref={ref} className={className} style={{ height: 480, ...style }} />;
}

export type * from './types.js';
