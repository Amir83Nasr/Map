import type { StyleSpecification } from 'maplibre-gl';

export interface PickerLocation {
  lat: number;
  lng: number;
  address: string;
}
export interface Venue {
  name: string;
  lat: number;
  lng: number;
}
export interface SearchSuggestion {
  name: string;
  addr: string;
  lat: number;
  lng: number;
}
export interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

export type MarkerType = 'default' | 'none' | 'html';
export interface MarkerOption {
  type?: MarkerType;
  element?: HTMLElement;
  className?: string;
  color?: string;
  size?: number;
}

export interface MapOption {
  style?: string | StyleSpecification;
  center?: { lat: number; lng: number };
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  bounds?: [[number, number], [number, number]];
  glyphs?: string;
}

export interface ControlsOption {
  gps?: boolean;
  zoom?: boolean;
  confirmButton?: boolean;
  searchTrigger?: boolean;
}
export interface SearchOption {
  enabled?: boolean;
  placeholder?: string;
  suggestions?: SearchSuggestion[];
  minLength?: number;
  debounceMs?: number;
  limit?: number;
}
export interface SheetOption {
  enabled?: boolean;
  desktopSidebar?: boolean;
}
export interface ThemeOption {
  brand?: string;
  brandDark?: string;
  bg?: string;
  card?: string;
  ink?: string;
  muted?: string;
  line?: string;
  radius?: number;
  shadow?: string;
  fontFamily?: string;
}
export interface BehaviorOption {
  snapToRoad?: boolean;
  resolveOnMove?: boolean;
  resolveDelayMs?: number;
  settleDelayMs?: number;
  pickZoom?: number;
  locateZoom?: number;
}
export interface I18nOption {
  dir?: 'rtl' | 'ltr' | 'auto';
  locale?: 'fa' | 'en';
  labels?: Partial<Labels>;
}
export interface Labels {
  searchPlaceholder: string;
  searchTitle: string;
  suggestedPlaces: string;
  searching: string;
  noResults: string;
  searchError: string;
  confirmLocation: string;
  confirm: string;
  editOnMap: string;
  chosenAddress: string;
  coordsToServer: string;
  close: string;
  clearSearch: string;
  currentLocation: string;
  locating: string;
  resolving: string;
  registered: string;
  gpsUnsupported: string;
  locateTimeout: string;
  locateUnavailable: string;
  geoTitle: string;
  geoText: string;
  geoBlocked: string;
  enableAccess: string;
}

export interface PickerCallbacks {
  onLocationChange?: (loc: PickerLocation) => void;
  onAddressResolved?: (loc: PickerLocation) => void;
  onPick?: (loc: PickerLocation) => void;
  onConfirm?: (loc: PickerLocation) => void;
  onSearchResults?: (r: NominatimResult[]) => void;
  onLocate?: (loc: PickerLocation) => void;
  onError?: (err: Error) => void;
}

export interface LocationPickerOptions extends PickerCallbacks {
  container: HTMLElement | string;
  map?: MapOption;
  marker?: MarkerOption;
  controls?: ControlsOption;
  search?: SearchOption;
  sheet?: SheetOption;
  theme?: ThemeOption;
  behavior?: BehaviorOption;
  i18n?: I18nOption;
  markers?: Venue[];
}

export type PickerEvent =
  | 'ready'
  | 'locationChange'
  | 'addressResolved'
  | 'searchResults'
  | 'pick'
  | 'confirm'
  | 'locate'
  | 'error';
export type EventHandler = (payload?: unknown) => void;
