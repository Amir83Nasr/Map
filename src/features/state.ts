import type { AppState } from '../types/index.js';
import { DEFAULT_CENTER } from '../constants/index.js';

/** Module-level selection state (single map screen — no global store needed). */
export const state: AppState = {
  lat: DEFAULT_CENTER.lat,
  lng: DEFAULT_CENTER.lng,
  address: '',
  resolving: false,
};
