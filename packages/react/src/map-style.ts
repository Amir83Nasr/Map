import type { StyleSpecification } from 'maplibre-gl';
import {
  AEROWAY_AREA,
  AEROWAY_CASING,
  BOUNDARY,
  BUILDING_FILL,
  BUILDING_TOP,
  CEMETERY_FILL,
  GRASS_FILL,
  LABEL_HALO,
  LABEL_PLACE,
  LABEL_ROAD,
  MAP_BG,
  PARK_FILL,
  PATH_COLOR,
  POI_COLOR,
  RAIL_COLOR,
  RESIDENTIAL_FILL,
  ROAD_MAJOR,
  ROAD_MAJOR_CASING,
  ROAD_MINOR,
  ROAD_MINOR_CASING,
  SAND_FILL,
  WATER_FILL,
  WATER_FILL_FAINT,
  WATER_LABEL,
  WATER_LINE,
  WOOD_FILL,
} from './colors.js';

// ── SNAPP-LIKE VECTOR STYLE (OpenMapTiles schema) ────────────
// Source: OpenFreeMap planet tiles (no API key).
// Expressions use ["coalesce", name:fa, name:nonlatin, name, name:latin]
// so Persian labels win; tiles carry Persian mostly in name:nonlatin.
// Glyphs are IRANYekanX PBFs shipped in the npm package (fonts/), served by
// default from jsDelivr; the demo overrides map.glyphs with its local copy.
// Generated with:
//   fontnik build-glyphs IRANYekanX-Regular.ttf fonts/
// (convert the repo's woff2 to TTF first: python3 -c
// "from fontTools.ttLib import TTFont; f=TTFont('IRANYekanX-Regular.woff2');
// f.flavor=None; f.save('IRANYekanX-Regular.ttf')").
// MapLibre v6 shapes RTL/Arabic natively, no RTL plugin needed.

const FA = [
  'coalesce',
  ['get', 'name:fa'],
  ['get', 'name:nonlatin'],
  ['get', 'name'],
  ['get', 'name:latin'],
];

// Rewrite Latin/Arabic digits to Persian inside tile labels ("مدنی 5" → "مدنی ۵").
// Style-spec has no replace/regexp op, so map chars via split/at/match/concat.
// ponytail: rewrites first MAX chars; raise MAX if longer digit-bearing labels appear.
const FA_DIGIT_MAP: unknown[] = [
  '0',
  '۰',
  '1',
  '۱',
  '2',
  '۲',
  '3',
  '۳',
  '4',
  '۴',
  '5',
  '۵',
  '6',
  '۶',
  '7',
  '۷',
  '8',
  '۸',
  '9',
  '۹',
  '٠',
  '۰',
  '١',
  '۱',
  '٢',
  '۲',
  '٣',
  '۳',
  '٤',
  '۴',
  '٥',
  '۵',
  '٦',
  '۶',
  '٧',
  '۷',
  '٨',
  '۸',
  '٩',
  '۹',
];

function faDigits(inner: unknown, max = 40): unknown {
  const base: unknown = ['coalesce', inner, ''];
  const chars: unknown = ['split', ['to-string', base], ''];
  const n: unknown = ['length', chars];
  const parts: unknown[] = [];
  for (let i = 0; i < max; i++) {
    const ch: unknown = ['at', i, chars];
    parts.push(['case', ['>', n, i], ['match', ch, ...FA_DIGIT_MAP, ch], '']);
  }
  // Tail beyond max passes through unmapped (long labels are not truncated).
  parts.push(['slice', ['to-string', base], max]);
  return ['format', ['concat', ...parts], {}];
}

const FA_LINE = faDigits(FA);

const REGULAR = ['IRANYekanX Regular'];
// ponytail: single Regular weight only; add real Bold PBFs + stack when Bold file lands.
const BOLD = ['IRANYekanX Regular'];

const LINE_SYSTEM = ['LineString', 'MultiLineString'];
const POINT_SYSTEM = ['MultiPoint', 'Point'];

function lineWidth(stops: Array<number | string | number[]>): unknown {
  return ['interpolate', ['exponential', 1.2], ['zoom'], ...stops];
}

// Keep minor streets visible a touch earlier than upstream default.
const MINOR_W = [
  'interpolate',
  ['exponential', 1.2],
  ['zoom'],
  12.5,
  0,
  13,
  1.5,
  14,
  2.5,
  20,
  11.5,
];
const MINOR_CASING_W = [
  'interpolate',
  ['exponential', 1.2],
  ['zoom'],
  12,
  0.5,
  13,
  1,
  14,
  4,
  20,
  15,
];

const layers = [
  // ── BACKGROUND ──────────────────────────────────────────
  { id: 'background', type: 'background', paint: { 'background-color': MAP_BG } },

  // ── LANDUSE / LANDCOVER ─────────────────────────────────
  {
    id: 'landuse-residential',
    type: 'fill',
    source: 'openmaptiles',
    'source-layer': 'landuse',
    filter: ['match', ['get', 'class'], ['neighbourhood', 'residential'], true, false],
    paint: { 'fill-color': RESIDENTIAL_FILL },
  },
  {
    id: 'landuse-cemetery',
    type: 'fill',
    source: 'openmaptiles',
    'source-layer': 'landuse',
    filter: ['==', ['get', 'class'], 'cemetery'],
    paint: { 'fill-color': CEMETERY_FILL },
  },
  {
    id: 'landcover-wood',
    type: 'fill',
    source: 'openmaptiles',
    'source-layer': 'landcover',
    filter: ['==', ['get', 'class'], 'wood'],
    paint: { 'fill-color': WOOD_FILL },
  },
  {
    id: 'landcover-grass',
    type: 'fill',
    source: 'openmaptiles',
    'source-layer': 'landcover',
    filter: ['==', ['get', 'class'], 'grass'],
    paint: { 'fill-color': GRASS_FILL },
  },
  {
    id: 'landcover-grass-park',
    type: 'fill',
    source: 'openmaptiles',
    'source-layer': 'park',
    paint: { 'fill-color': PARK_FILL },
  },
  {
    id: 'park',
    type: 'fill',
    source: 'openmaptiles',
    'source-layer': 'park',
    filter: ['match', ['geometry-type'], ['MultiPolygon', 'Polygon'], true, false],
    paint: { 'fill-color': PARK_FILL },
  },
  {
    id: 'landcover-sand',
    type: 'fill',
    source: 'openmaptiles',
    'source-layer': 'landcover',
    filter: ['==', ['get', 'class'], 'sand'],
    paint: { 'fill-color': SAND_FILL },
  },

  // ── WATER ───────────────────────────────────────────────
  {
    id: 'water',
    type: 'fill',
    source: 'openmaptiles',
    'source-layer': 'water',
    filter: ['all', ['!=', ['get', 'intermittent'], 1], ['!=', ['get', 'brunnel'], 'tunnel']],
    paint: { 'fill-color': WATER_FILL },
  },
  {
    id: 'water-intermittent',
    type: 'fill',
    source: 'openmaptiles',
    'source-layer': 'water',
    filter: ['all', ['==', ['get', 'intermittent'], 1], ['!=', ['get', 'brunnel'], 'tunnel']],
    paint: { 'fill-color': WATER_FILL_FAINT, 'fill-opacity': 0.8 },
  },
  {
    id: 'waterway-other',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'waterway',
    filter: [
      'all',
      ['match', ['get', 'class'], ['canal', 'river', 'stream'], false, true],
      ['==', ['get', 'intermittent'], 0],
    ],
    paint: {
      'line-color': WATER_LINE,
      'line-width': ['interpolate', ['exponential', 1.3], ['zoom'], 13, 0.5, 20, 2],
    },
  },
  {
    id: 'waterway-stream-canal',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'waterway',
    filter: [
      'all',
      ['match', ['get', 'class'], ['canal', 'stream'], true, false],
      ['!=', ['get', 'brunnel'], 'tunnel'],
      ['==', ['get', 'intermittent'], 0],
    ],
    paint: {
      'line-color': WATER_LINE,
      'line-width': ['interpolate', ['exponential', 1.3], ['zoom'], 13, 0.5, 20, 6],
    },
  },
  {
    id: 'waterway-river',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'waterway',
    filter: [
      'all',
      ['==', ['get', 'class'], 'river'],
      ['!=', ['get', 'brunnel'], 'tunnel'],
      ['!=', ['get', 'intermittent'], 1],
    ],
    paint: {
      'line-color': WATER_LINE,
      'line-width': ['interpolate', ['exponential', 1.2], ['zoom'], 10, 0.8, 20, 6],
    },
  },

  // ── BUILDINGS ───────────────────────────────────────────
  {
    id: 'building',
    type: 'fill',
    source: 'openmaptiles',
    'source-layer': 'building',
    paint: { 'fill-antialias': true, 'fill-color': BUILDING_FILL },
  },
  {
    id: 'building-top',
    type: 'fill',
    source: 'openmaptiles',
    'source-layer': 'building',
    paint: {
      'fill-color': BUILDING_TOP,
      'fill-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0, 16, 1],
      'fill-outline-color': BUILDING_FILL,
      'fill-translate': [
        'interpolate',
        ['linear'],
        ['zoom'],
        14,
        ['literal', [0, 0]],
        16,
        ['literal', [-2, -2]],
      ],
    },
  },

  // ── AEROWAY ─────────────────────────────────────────────
  {
    id: 'aeroway-area',
    type: 'fill',
    source: 'openmaptiles',
    'source-layer': 'aeroway',
    paint: {
      'fill-color': AEROWAY_AREA,
      'fill-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0, 14, 1],
    },
  },
  {
    id: 'aeroway-taxiway-casing',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'aeroway',
    filter: ['==', ['get', 'class'], 'taxiway'],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': AEROWAY_CASING,
      'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 11, 2, 17, 12],
    },
  },
  {
    id: 'aeroway-taxiway',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'aeroway',
    filter: ['==', ['get', 'class'], 'taxiway'],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': ROAD_MINOR,
      'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 11, 1, 17, 10],
    },
  },
  {
    id: 'aeroway-runway-casing',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'aeroway',
    filter: ['==', ['get', 'class'], 'runway'],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': AEROWAY_CASING,
      'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 11, 5, 17, 55],
    },
  },
  {
    id: 'aeroway-runway',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'aeroway',
    filter: ['==', ['get', 'class'], 'runway'],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': ROAD_MINOR,
      'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 11, 4, 17, 50],
    },
  },

  // ── ROAD CASINGS ────────────────────────────────────────
  {
    id: 'highway-minor-casing',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    filter: [
      'all',
      ['match', ['geometry-type'], LINE_SYSTEM, true, false],
      ['!=', ['get', 'brunnel'], 'tunnel'],
      ['match', ['get', 'class'], ['minor', 'service', 'track'], true, false],
    ],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': ROAD_MINOR_CASING,
      'line-opacity': ['interpolate', ['linear'], ['zoom'], 12, 0, 12.5, 1],
      'line-width': MINOR_CASING_W,
    },
  },
  {
    id: 'highway-link-casing',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    minzoom: 13,
    filter: [
      'all',
      ['match', ['get', 'brunnel'], ['bridge', 'tunnel'], false, true],
      ['match', ['get', 'class'], ['primary', 'secondary', 'tertiary', 'trunk'], true, false],
      ['==', ['get', 'ramp'], 1],
    ],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': ROAD_MAJOR_CASING,
      'line-width': lineWidth([12, 1, 13, 3, 14, 4, 20, 15]),
    },
  },
  {
    id: 'highway-secondary-tertiary-casing',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    filter: [
      'all',
      ['match', ['get', 'brunnel'], ['bridge', 'tunnel'], false, true],
      ['match', ['get', 'class'], ['secondary', 'tertiary'], true, false],
      ['!=', ['get', 'ramp'], 1],
    ],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': ROAD_MAJOR_CASING, 'line-width': lineWidth([8, 1.5, 20, 17]) },
  },
  {
    id: 'highway-primary-casing',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    minzoom: 5,
    filter: [
      'all',
      ['match', ['get', 'brunnel'], ['bridge', 'tunnel'], false, true],
      ['match', ['get', 'class'], ['primary'], true, false],
      ['!=', ['get', 'ramp'], 1],
    ],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': ROAD_MAJOR_CASING,
      'line-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0, 8, 1],
      'line-width': lineWidth([7, 0, 8, 0.6, 9, 1.5, 20, 22]),
    },
  },
  {
    id: 'highway-trunk-casing',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    minzoom: 5,
    filter: [
      'all',
      ['match', ['get', 'brunnel'], ['bridge', 'tunnel'], false, true],
      ['match', ['get', 'class'], ['trunk'], true, false],
      ['!=', ['get', 'ramp'], 1],
    ],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': ROAD_MAJOR_CASING,
      'line-opacity': ['interpolate', ['linear'], ['zoom'], 5, 0, 6, 1],
      'line-width': lineWidth([5, 0, 6, 0.6, 7, 1.5, 20, 22]),
    },
  },
  {
    id: 'highway-motorway-casing',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    minzoom: 4,
    filter: [
      'all',
      ['match', ['get', 'brunnel'], ['bridge', 'tunnel'], false, true],
      ['==', ['get', 'class'], 'motorway'],
      ['!=', ['get', 'ramp'], 1],
    ],
    layout: { 'line-cap': 'butt', 'line-join': 'round' },
    paint: {
      'line-color': ROAD_MAJOR_CASING,
      'line-opacity': ['interpolate', ['linear'], ['zoom'], 4, 0, 5, 1],
      'line-width': lineWidth([4, 0, 5, 0.4, 6, 0.6, 7, 1.5, 20, 22]),
    },
  },

  // ── ROAD FILLS ──────────────────────────────────────────
  {
    id: 'highway-path',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    filter: [
      'all',
      ['match', ['geometry-type'], LINE_SYSTEM, true, false],
      ['match', ['get', 'brunnel'], ['bridge', 'tunnel'], false, true],
      ['==', ['get', 'class'], 'path'],
    ],
    paint: {
      'line-color': PATH_COLOR,
      'line-dasharray': [1.5, 0.75],
      'line-width': lineWidth([15, 1.2, 20, 4]),
    },
  },
  {
    id: 'highway-link',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    minzoom: 13,
    filter: [
      'all',
      ['match', ['get', 'brunnel'], ['bridge', 'tunnel'], false, true],
      ['match', ['get', 'class'], ['primary', 'secondary', 'tertiary', 'trunk'], true, false],
      ['==', ['get', 'ramp'], 1],
    ],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': ROAD_MAJOR,
      'line-width': lineWidth([12.5, 0, 13, 1.5, 14, 2.5, 20, 11.5]),
    },
  },
  {
    id: 'highway-minor',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    filter: [
      'all',
      ['match', ['geometry-type'], LINE_SYSTEM, true, false],
      ['!=', ['get', 'brunnel'], 'tunnel'],
      ['match', ['get', 'class'], ['minor', 'service', 'track'], true, false],
    ],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': ROAD_MINOR, 'line-width': MINOR_W },
  },
  {
    id: 'highway-secondary-tertiary',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    filter: [
      'all',
      ['match', ['get', 'brunnel'], ['bridge', 'tunnel'], false, true],
      ['match', ['get', 'class'], ['secondary', 'tertiary'], true, false],
      ['!=', ['get', 'ramp'], 1],
    ],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': ROAD_MAJOR, 'line-width': lineWidth([6.5, 0, 8, 0.5, 20, 13]) },
  },
  {
    id: 'highway-primary',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    filter: [
      'all',
      ['match', ['geometry-type'], LINE_SYSTEM, true, false],
      ['match', ['get', 'brunnel'], ['bridge', 'tunnel'], false, true],
      ['match', ['get', 'class'], ['primary'], true, false],
      ['!=', ['get', 'ramp'], 1],
    ],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': ROAD_MAJOR, 'line-width': lineWidth([8.5, 0, 9, 0.5, 20, 18]) },
  },
  {
    id: 'highway-trunk',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    filter: [
      'all',
      ['match', ['geometry-type'], LINE_SYSTEM, true, false],
      ['match', ['get', 'brunnel'], ['bridge', 'tunnel'], false, true],
      ['match', ['get', 'class'], ['trunk'], true, false],
      ['!=', ['get', 'ramp'], 1],
    ],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': ROAD_MAJOR, 'line-width': lineWidth([6.5, 0, 7, 0.5, 20, 18]) },
  },
  {
    id: 'highway-motorway',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    minzoom: 5,
    filter: [
      'all',
      ['match', ['geometry-type'], LINE_SYSTEM, true, false],
      ['match', ['get', 'brunnel'], ['bridge', 'tunnel'], false, true],
      ['==', ['get', 'class'], 'motorway'],
      ['!=', ['get', 'ramp'], 1],
    ],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': ROAD_MAJOR, 'line-width': lineWidth([6.5, 0, 7, 0.5, 20, 18]) },
  },

  // ── BRIDGES (same palette, above surface roads) ─────────
  {
    id: 'bridge-link',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    minzoom: 13,
    filter: [
      'all',
      ['==', ['get', 'brunnel'], 'bridge'],
      ['match', ['get', 'class'], ['primary', 'secondary', 'tertiary', 'trunk'], true, false],
      ['==', ['get', 'ramp'], 1],
    ],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': ROAD_MAJOR,
      'line-width': lineWidth([12.5, 0, 13, 1.5, 14, 2.5, 20, 11.5]),
    },
  },
  {
    id: 'bridge-minor',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    filter: [
      'all',
      ['==', ['get', 'brunnel'], 'bridge'],
      ['match', ['get', 'class'], ['minor', 'service', 'track'], true, false],
    ],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': ROAD_MINOR, 'line-width': MINOR_W },
  },
  {
    id: 'bridge-secondary-tertiary',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    filter: [
      'all',
      ['==', ['get', 'brunnel'], 'bridge'],
      ['match', ['get', 'class'], ['secondary', 'tertiary'], true, false],
      ['!=', ['get', 'ramp'], 1],
    ],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': ROAD_MAJOR, 'line-width': lineWidth([6.5, 0, 8, 0.5, 20, 13]) },
  },
  {
    id: 'bridge-trunk-primary',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    filter: [
      'all',
      ['==', ['get', 'brunnel'], 'bridge'],
      ['match', ['get', 'class'], ['primary', 'trunk'], true, false],
      ['!=', ['get', 'ramp'], 1],
    ],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': ROAD_MAJOR, 'line-width': lineWidth([6.5, 0, 7, 0.5, 20, 18]) },
  },
  {
    id: 'bridge-motorway',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    minzoom: 5,
    filter: [
      'all',
      ['==', ['get', 'brunnel'], 'bridge'],
      ['==', ['get', 'class'], 'motorway'],
      ['!=', ['get', 'ramp'], 1],
    ],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': ROAD_MAJOR, 'line-width': lineWidth([6.5, 0, 7, 0.5, 20, 18]) },
  },

  // ── RAIL ────────────────────────────────────────────────
  {
    id: 'railway-transit',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    filter: [
      'all',
      ['match', ['geometry-type'], LINE_SYSTEM, true, false],
      ['==', ['get', 'class'], 'transit'],
      ['match', ['get', 'brunnel'], ['tunnel'], false, true],
    ],
    paint: {
      'line-color': RAIL_COLOR,
      'line-width': ['interpolate', ['exponential', 1.4], ['zoom'], 14, 0.4, 20, 1],
    },
  },
  {
    id: 'railway-service',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    filter: [
      'all',
      ['match', ['geometry-type'], LINE_SYSTEM, true, false],
      ['has', 'service'],
      ['match', ['get', 'brunnel'], ['bridge', 'tunnel'], false, true],
      ['==', ['get', 'class'], 'rail'],
    ],
    paint: {
      'line-color': RAIL_COLOR,
      'line-width': ['interpolate', ['exponential', 1.4], ['zoom'], 14, 0.4, 20, 1],
    },
  },
  {
    id: 'railway',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    filter: [
      'all',
      ['match', ['geometry-type'], LINE_SYSTEM, true, false],
      ['!', ['has', 'service']],
      ['match', ['get', 'brunnel'], ['bridge', 'tunnel'], false, true],
      ['==', ['get', 'class'], 'rail'],
    ],
    paint: {
      'line-color': RAIL_COLOR,
      'line-width': ['interpolate', ['exponential', 1.4], ['zoom'], 14, 0.4, 15, 0.75, 20, 2],
    },
  },

  // ── BOUNDARIES ──────────────────────────────────────────
  {
    id: 'boundary_3',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'boundary',
    filter: ['all', ['==', ['get', 'admin_level'], 3], ['!=', ['get', 'maritime'], 1]],
    paint: {
      'line-color': BOUNDARY,
      'line-dasharray': [1, 1],
      'line-width': ['interpolate', ['linear'], ['zoom'], 7, 1, 11, 2],
    },
  },
  {
    id: 'boundary_2',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'boundary',
    filter: [
      'all',
      ['==', ['get', 'admin_level'], 2],
      ['!=', ['get', 'maritime'], 1],
      ['!=', ['get', 'disputed'], 1],
      ['!', ['has', 'claimed_by']],
    ],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': BOUNDARY,
      'line-opacity': ['interpolate', ['linear'], ['zoom'], 0, 0.4, 4, 1],
      'line-width': ['interpolate', ['linear'], ['zoom'], 3, 1, 5, 1.2, 12, 3],
    },
  },

  // ── WATER LABELS ────────────────────────────────────────
  {
    id: 'waterway_line_label',
    type: 'symbol',
    source: 'openmaptiles',
    'source-layer': 'waterway',
    layout: {
      'symbol-placement': 'line',
      'symbol-spacing': 350,
      'text-field': FA_LINE,
      'text-font': REGULAR,
      'text-size': 13,
    },
    paint: { 'text-color': WATER_LABEL, 'text-halo-color': LABEL_HALO, 'text-halo-width': 1.5 },
  },
  {
    id: 'water_name_label',
    type: 'symbol',
    source: 'openmaptiles',
    'source-layer': 'water_name',
    layout: { 'text-field': FA_LINE, 'text-font': REGULAR, 'text-max-width': 8, 'text-size': 12 },
    paint: { 'text-color': WATER_LABEL, 'text-halo-color': LABEL_HALO, 'text-halo-width': 1.5 },
  },

  // ── POI (Snapp density: worship/education/medical/shops) ──
  {
    id: 'poi_worship_school',
    type: 'symbol',
    source: 'openmaptiles',
    'source-layer': 'poi',
    minzoom: 14,
    filter: [
      'match',
      ['get', 'class'],
      ['place_of_worship', 'school', 'college', 'library', 'hospital', 'park'],
      true,
      false,
    ],
    layout: {
      'icon-image': [
        'match',
        ['get', 'class'],
        ['place_of_worship'],
        'place_of_worship',
        ['school'],
        'school',
        ['college'],
        'school',
        ['library'],
        'school',
        ['hospital'],
        'hospital',
        ['park'],
        'park',
        '',
      ],
      'icon-size': 1.1,
      'text-anchor': 'top',
      'text-field': FA_LINE,
      'text-font': REGULAR,
      'text-max-width': 8,
      'text-offset': [0, 1],
      'text-size': 12,
    },
    paint: { 'text-color': POI_COLOR, 'text-halo-color': LABEL_HALO, 'text-halo-width': 1.5 },
  },
  {
    id: 'poi_shops',
    type: 'symbol',
    source: 'openmaptiles',
    'source-layer': 'poi',
    minzoom: 15.5,
    filter: [
      'match',
      ['get', 'class'],
      ['shop', 'grocery', 'restaurant', 'cafe', 'fast_food', 'pharmacy', 'bank', 'fuel'],
      true,
      false,
    ],
    layout: {
      'icon-image': [
        'match',
        ['get', 'class'],
        ['grocery'],
        'grocery',
        ['restaurant'],
        'restaurant',
        ['cafe'],
        'cafe',
        ['fast_food'],
        'restaurant',
        ['pharmacy'],
        'pharmacy',
        ['bank'],
        'bank',
        ['fuel'],
        'fuel',
        'shop',
      ],
      'icon-size': 1,
      'text-anchor': 'top',
      'text-field': FA_LINE,
      'text-font': REGULAR,
      'text-max-width': 8,
      'text-offset': [0, 1],
      'text-size': 12,
    },
    paint: { 'text-color': POI_COLOR, 'text-halo-color': LABEL_HALO, 'text-halo-width': 1.5 },
  },
  {
    id: 'poi_r1',
    type: 'symbol',
    source: 'openmaptiles',
    'source-layer': 'poi',
    minzoom: 16,
    filter: [
      'all',
      ['match', ['geometry-type'], POINT_SYSTEM, true, false],
      ['>=', ['get', 'rank'], 1],
      ['<', ['get', 'rank'], 7],
    ],
    layout: {
      'icon-image': [
        'match',
        ['get', 'subclass'],
        ['florist', 'furniture'],
        ['get', 'subclass'],
        ['get', 'class'],
      ],
      'icon-size': 0.8,
      'text-anchor': 'top',
      'text-field': FA_LINE,
      'text-font': REGULAR,
      'text-max-width': 8,
      'text-offset': [0, 0.8],
      'text-size': 12,
    },
    paint: { 'text-color': POI_COLOR, 'text-halo-color': LABEL_HALO, 'text-halo-width': 1.5 },
  },
  {
    id: 'airport',
    type: 'symbol',
    source: 'openmaptiles',
    'source-layer': 'aerodrome_label',
    minzoom: 10,
    filter: ['all', ['has', 'iata']],
    layout: {
      'icon-image': 'airport_11',
      'icon-size': 1,
      'text-anchor': 'top',
      'text-field': FA_LINE,
      'text-font': REGULAR,
      'text-max-width': 8,
      'text-offset': [0, 0.8],
      'text-size': 12,
    },
    paint: { 'text-color': POI_COLOR, 'text-halo-color': LABEL_HALO, 'text-halo-width': 1.5 },
  },

  // ── ROAD NAMES ──────────────────────────────────────────
  {
    id: 'highway-name-minor',
    type: 'symbol',
    source: 'openmaptiles',
    'source-layer': 'transportation_name',
    minzoom: 14,
    filter: [
      'all',
      ['match', ['geometry-type'], LINE_SYSTEM, true, false],
      ['match', ['get', 'class'], ['minor', 'service', 'track'], true, false],
    ],
    layout: {
      'symbol-placement': 'line',
      'text-field': FA_LINE,
      'text-font': REGULAR,
      'text-rotation-alignment': 'map',
      'text-size': ['interpolate', ['linear'], ['zoom'], 14, 11, 17, 12],
    },
    paint: { 'text-color': LABEL_ROAD, 'text-halo-color': LABEL_HALO, 'text-halo-width': 1.5 },
  },
  {
    id: 'highway-name-major',
    type: 'symbol',
    source: 'openmaptiles',
    'source-layer': 'transportation_name',
    minzoom: 11,
    filter: [
      'match',
      ['get', 'class'],
      ['primary', 'secondary', 'tertiary', 'trunk', 'motorway'],
      true,
      false,
    ],
    layout: {
      'symbol-placement': 'line',
      'text-field': FA_LINE,
      'text-font': BOLD,
      'text-rotation-alignment': 'map',
      'text-size': ['interpolate', ['linear'], ['zoom'], 11, 11, 15, 13],
    },
    paint: { 'text-color': LABEL_ROAD, 'text-halo-color': LABEL_HALO, 'text-halo-width': 1.5 },
  },

  // ── PLACE LABELS ────────────────────────────────────────
  {
    id: 'label_village',
    type: 'symbol',
    source: 'openmaptiles',
    'source-layer': 'place',
    minzoom: 9,
    filter: ['==', ['get', 'class'], 'village'],
    layout: {
      'text-field': FA_LINE,
      'text-font': REGULAR,
      'text-max-width': 8,
      'text-size': ['interpolate', ['exponential', 1.2], ['zoom'], 9, 11, 12, 13],
    },
    paint: { 'text-color': LABEL_PLACE, 'text-halo-color': LABEL_HALO, 'text-halo-width': 1.5 },
  },
  {
    id: 'label_town',
    type: 'symbol',
    source: 'openmaptiles',
    'source-layer': 'place',
    minzoom: 6,
    filter: ['==', ['get', 'class'], 'town'],
    layout: {
      'text-field': FA_LINE,
      'text-font': BOLD,
      'text-max-width': 8,
      'text-size': ['interpolate', ['exponential', 1.2], ['zoom'], 7, 12, 11, 14],
    },
    paint: { 'text-color': LABEL_PLACE, 'text-halo-color': LABEL_HALO, 'text-halo-width': 1.5 },
  },
  {
    id: 'label_other',
    type: 'symbol',
    source: 'openmaptiles',
    'source-layer': 'place',
    minzoom: 8,
    filter: [
      'match',
      ['get', 'class'],
      ['city', 'continent', 'country', 'state', 'town', 'village'],
      false,
      true,
    ],
    layout: {
      'text-field': FA_LINE,
      'text-font': REGULAR,
      'text-max-width': 8,
      'text-size': ['interpolate', ['linear'], ['zoom'], 8, 10, 12, 12],
    },
    paint: { 'text-color': LABEL_PLACE, 'text-halo-color': LABEL_HALO, 'text-halo-width': 1.5 },
  },
  {
    id: 'label_city',
    type: 'symbol',
    source: 'openmaptiles',
    'source-layer': 'place',
    minzoom: 3,
    filter: ['all', ['==', ['get', 'class'], 'city'], ['!=', ['get', 'capital'], 2]],
    layout: {
      'text-field': FA_LINE,
      'text-font': BOLD,
      'text-max-width': 8,
      'text-size': ['interpolate', ['exponential', 1.2], ['zoom'], 4, 11, 7, 13, 11, 16],
    },
    paint: { 'text-color': LABEL_PLACE, 'text-halo-color': LABEL_HALO, 'text-halo-width': 1.5 },
  },
  {
    id: 'label_city_capital',
    type: 'symbol',
    source: 'openmaptiles',
    'source-layer': 'place',
    minzoom: 3,
    filter: ['all', ['==', ['get', 'class'], 'city'], ['==', ['get', 'capital'], 2]],
    layout: {
      'text-field': FA_LINE,
      'text-font': BOLD,
      'text-max-width': 8,
      'text-size': ['interpolate', ['exponential', 1.2], ['zoom'], 4, 12, 7, 14, 11, 18],
    },
    paint: { 'text-color': LABEL_PLACE, 'text-halo-color': LABEL_HALO, 'text-halo-width': 1.5 },
  },
];

export const OPENFREEMAP_TILEJSON_URL = 'https://tiles.openfreemap.org/planet';

// Default basemap: self-hosted-glyph Snapp-like vector style (OpenMapTiles
// schema, OpenFreeMap planet tiles, no API key).
export const MAP_STYLE = {
  version: 8,
  name: 'snapp-like',
  // Absolute CDN URL of the PBFs shipped in this package (files: fonts/) —
  // consumers get Persian map labels with zero setup. A relative template
  // still works: picker initMap resolves it against document.baseURI
  // (the demo passes `fonts/{fontstack}/{range}.pbf` for its local copy).
  glyphs: `https://cdn.jsdelivr.net/npm/qompick-react@1/fonts/{fontstack}/{range}.pbf`,
  sprite: 'https://tiles.openfreemap.org/sprites/ofm_f384/ofm',
  sources: {
    openmaptiles: { type: 'vector', url: OPENFREEMAP_TILEJSON_URL },
  },
  layers,
} as unknown as StyleSpecification;
