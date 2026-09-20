import 'maplibre-gl/dist/maplibre-gl.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/map.css';
import './styles/sheet.css';
import './styles/search.css';
import './styles/modal.css';
import './styles/toast.css';
import './styles/desktop.css';
import { createMap } from './features/map-view.js';
import { createSelection } from './features/selection.js';
import { initLocate } from './features/locate.js';
import { initOverlay } from './features/overlay.js';
import { initSearchHost } from './features/search.js';
import { initConfirm } from './features/confirm.js';
import { createToast } from './components/toast.js';
import { wireClear } from './components/clear-input.js';
import { refreshIcons } from './components/icons.js';
import { state } from './features/state.js';
import { getById } from './utils/dom.js';

const wrap = document.querySelector<HTMLElement>('.map-wrap');
const mapEl = getById<HTMLElement>('map');
if (!wrap) throw new Error('Missing element .map-wrap');

const map = createMap(mapEl, wrap);
const label = getById<HTMLElement>('searchLabel');
const selection = createSelection(map, label);
const toast = createToast(getById<HTMLElement>('toast'));

// ── MAP MOVEMENT → SHEET STATE ──────────────────────────────
map.onMove(
  (lat, lng) => {
    state.lat = lat;
    state.lng = lng;
  },
  (lat, lng) => selection.setSelected(lat, lng),
);

// ── GPS / PERMISSION ────────────────────────────────────────
initLocate(
  getById<HTMLButtonElement>('gpsBtn'),
  getById<HTMLElement>('permModal'),
  getById<HTMLElement>('permHint'),
  map,
  selection,
  toast,
);

// ── MOBILE OVERLAY + DESKTOP SIDEBAR ────────────────────────
const overlay = initOverlay(
  getById<HTMLElement>('searchOverlay'),
  getById<HTMLButtonElement>('searchOpen'),
  getById<HTMLButtonElement>('searchBack'),
  {
    input: getById<HTMLInputElement>('searchInput'),
    home: getById<HTMLElement>('homeContent'),
    suggestList: getById<HTMLElement>('suggestList'),
    results: getById<HTMLElement>('results'),
  },
  selection,
);

const desk = initSearchHost(
  {
    input: getById<HTMLInputElement>('deskInput'),
    home: getById<HTMLElement>('deskHome'),
    suggestList: getById<HTMLElement>('deskSuggest'),
    results: getById<HTMLElement>('deskResults'),
  },
  selection,
  16,
);

// ── CONFIRM ─────────────────────────────────────────────────
initConfirm(selection, toast);

// ── CLEAR BUTTONS ───────────────────────────────────────────
wireClear(
  getById<HTMLInputElement>('searchInput'),
  getById<HTMLButtonElement>('searchClear'),
  () => {
    overlay.reset();
  },
);
wireClear(getById<HTMLInputElement>('deskInput'), getById<HTMLButtonElement>('deskClear'), () => {
  desk.reset();
});

// ── INIT ────────────────────────────────────────────────────
refreshIcons();
selection.setSelected(state.lat, state.lng);
