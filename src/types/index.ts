export interface Suggestion {
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

export interface SelectionOptions {
  moveMap?: boolean;
  resolve?: boolean;
  zoom?: number;
}

export interface AppState {
  lat: number;
  lng: number;
  address: string;
  resolving: boolean;
}
