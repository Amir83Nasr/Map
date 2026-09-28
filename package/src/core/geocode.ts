import type { NominatimResult } from './types.js';
import { enDigits } from './format.js';

const VIEWBOX = '50.35,35.05,51.45,34.15';

// Reverse cache rounds to 4 decimals (~11m): enough for map UI addresses.
// Use 5 decimals if you need door-to-door accuracy.
const revCache = new Map<string, string>();
const searchCache = new Map<string, NominatimResult[]>();

function bound<K, V>(m: Map<K, V>, cap: number): void {
  if (m.size > cap) m.delete(m.keys().next().value!);
}

export async function reverseGeocode(
  lat: number,
  lng: number,
  opts?: { signal?: AbortSignal },
): Promise<string> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  const hit = revCache.get(key);
  if (hit) return hit;
  const r = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=fa`,
    { headers: { Accept: 'application/json' }, signal: opts?.signal },
  );
  if (!r.ok) throw new Error(`http ${r.status}`);
  const j = (await r.json()) as { display_name?: string };
  if (!j.display_name) throw new Error('empty result');
  revCache.set(key, j.display_name);
  bound(revCache, 200);
  return j.display_name;
}

export async function searchLocation(
  query: string,
  limit = 5,
  opts?: { signal?: AbortSignal },
): Promise<NominatimResult[]> {
  const key = `${enDigits(query).trim().toLowerCase()}|${limit}`;
  const hit = searchCache.get(key);
  if (hit) return hit;
  const r = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&accept-language=fa&limit=${limit}&viewbox=${VIEWBOX}&bounded=1&q=${encodeURIComponent(enDigits(query))}`,
    { headers: { Accept: 'application/json' }, signal: opts?.signal },
  );
  if (!r.ok) throw new Error(`http ${r.status}`);
  const list = (await r.json()) as NominatimResult[];
  searchCache.set(key, list);
  bound(searchCache, 50);
  return list;
}
