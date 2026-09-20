import type { NominatimResult } from '../types/index.js';
import { enDigits } from '../utils/format.js';

const VIEWBOX = '50.35,35.05,51.45,34.15';

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const r = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=fa`,
    { headers: { Accept: 'application/json' } },
  );
  if (!r.ok) throw new Error(`http ${r.status}`);
  const j = (await r.json()) as { display_name?: string };
  if (!j.display_name) throw new Error('empty result');
  return j.display_name;
}

export async function searchLocation(query: string): Promise<NominatimResult[]> {
  const r = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&accept-language=fa&limit=5&viewbox=${VIEWBOX}&bounded=1&q=${encodeURIComponent(enDigits(query))}`,
    { headers: { Accept: 'application/json' } },
  );
  if (!r.ok) throw new Error(`http ${r.status}`);
  return (await r.json()) as NominatimResult[];
}
