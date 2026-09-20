import type { Map as MlMap } from 'maplibre-gl';

// Snapp-like snap: manual pin dropped off-road jumps to nearest
// drivable street. Pixel-space match on rendered road lines —
// no network, no new dep.
// ponytail: radius is px (~zoom-dependent meters); use OSRM/Valhalla
// `nearest` when true routable snap needed.

const ROAD_LAYERS = [
  'highway-minor',
  'highway-link',
  'highway-secondary-tertiary',
  'highway-primary',
  'highway-trunk',
  'highway-motorway',
  'bridge-minor',
  'bridge-link',
  'bridge-secondary-tertiary',
  'bridge-trunk-primary',
  'bridge-motorway',
];

const SNAP_RADIUS_PX = 64;
const SNAP_MIN_ZOOM = 15;
/** Already on road — skip to avoid settle-loop jitter. */
const EPS_PX = 2;

function nearestOnSeg(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): { x: number; y: number; d2: number } {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const raw = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  const t = Math.max(0, Math.min(1, raw));
  const x = ax + t * dx;
  const y = ay + t * dy;
  return { x, y, d2: (px - x) * (px - x) + (py - y) * (py - y) };
}

/** Nearest point on a rendered road within radius, else null. */
export function trySnapToRoad(
  map: MlMap,
  lat: number,
  lng: number,
): { lat: number; lng: number } | null {
  if (map.getZoom() < SNAP_MIN_ZOOM) return null;
  const c = map.project([lng, lat]);
  let feats;
  try {
    const box: [[number, number], [number, number]] = [
      [c.x - SNAP_RADIUS_PX, c.y - SNAP_RADIUS_PX],
      [c.x + SNAP_RADIUS_PX, c.y + SNAP_RADIUS_PX],
    ];
    feats = map.queryRenderedFeatures(box, { layers: ROAD_LAYERS });
  } catch {
    return null;
  }
  let best: { x: number; y: number } | null = null;
  let bestD2 = SNAP_RADIUS_PX * SNAP_RADIUS_PX;
  for (const f of feats) {
    const g = f.geometry;
    const lines = g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' ? g.coordinates : [];
    for (const line of lines) {
      let prev: { x: number; y: number } | null = null;
      for (const coord of line) {
        const p = map.project(coord as [number, number]);
        if (prev) {
          const n = nearestOnSeg(c.x, c.y, prev.x, prev.y, p.x, p.y);
          if (n.d2 < bestD2) {
            bestD2 = n.d2;
            best = { x: n.x, y: n.y };
          }
        }
        prev = { x: p.x, y: p.y };
      }
    }
  }
  if (!best || bestD2 < EPS_PX * EPS_PX) return null;
  const s = map.unproject([best.x, best.y]);
  return { lat: s.lat, lng: s.lng };
}
