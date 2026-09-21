'use client';
import { useEffect, useRef } from 'react';
import { LocationPicker } from 'qompick-core';
import type { LocationPickerOptions, PickerLocation } from 'qompick-core';

export interface QomPickProps extends Omit<
  LocationPickerOptions,
  'container' | 'onLocationChange' | 'onConfirm' | 'onError'
> {
  onLocationChange?: (loc: PickerLocation) => void;
  onConfirm?: (loc: PickerLocation) => void;
  onError?: (err: Error) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function LocationPickerView({
  onLocationChange,
  onConfirm,
  onError,
  className,
  style,
  ...opts
}: QomPickProps): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const picker = useRef<LocationPicker | null>(null);
  const cb = useRef({ onLocationChange, onConfirm, onError });
  cb.current = { onLocationChange, onConfirm, onError };
  useEffect(() => {
    if (!ref.current) return;
    const p = new LocationPicker({
      ...opts,
      container: ref.current,
      onLocationChange: (l) => cb.current.onLocationChange?.(l),
      onConfirm: (l) => cb.current.onConfirm?.(l),
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

export { LocationPicker };
export type { LocationPickerOptions, PickerLocation };
