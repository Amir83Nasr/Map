import { Map as MlMap, Marker, setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  MAX_ZOOM,
  MIN_ZOOM,
  QOM_BOUNDS,
  SETTLE_DELAY,
} from '../constants/index.js';
import { MAP_STYLE } from '../map/style.js';

export interface MapView {
  map: MlMap;
  showMyPos(lat: number, lng: number): void;
  moveTo(lat: number, lng: number, zoom: number): void;
  snapTo(lat: number, lng: number): void;
  onMove(
    onMove: (lat: number, lng: number) => void,
    onSettled: (lat: number, lng: number) => void,
  ): void;
}

export function createMap(el: HTMLElement, wrap: HTMLElement): MapView {
  setWorkerUrl(workerUrl);
  const map = new MlMap({
    container: el,
    style: MAP_STYLE,
    center: [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat],
    zoom: DEFAULT_ZOOM,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    attributionControl: false,
    renderWorldCopies: false,
    // QOM_BOUNDS is [[lat, lng], [lat, lng]]; MapLibre wants [[lng, lat], [lng, lat]].
    maxBounds: [
      [QOM_BOUNDS[0][1], QOM_BOUNDS[0][0]],
      [QOM_BOUNDS[1][1], QOM_BOUNDS[1][0]],
    ],
  });

  requestAnimationFrame(() => map.resize());
  window.addEventListener('load', () => map.resize());

  let myMarker: Marker | null = null;

  return {
    map,
    showMyPos(lat: number, lng: number): void {
      if (myMarker) {
        myMarker.setLngLat([lng, lat]);
        return;
      }
      const dot = document.createElement('div');
      dot.className = 'my-wrap';
      dot.innerHTML = '<div class="my-dot"></div>';
      myMarker = new Marker({ element: dot }).setLngLat([lng, lat]).addTo(map);
    },
    moveTo(lat: number, lng: number, zoom: number): void {
      const center = [lng, lat] as [number, number];
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        map.jumpTo({ center, zoom });
      } else {
        map.flyTo({ center, zoom, duration: 800 });
      }
    },
    snapTo(lat: number, lng: number): void {
      map.jumpTo({ center: [lng, lat] });
    },
    onMove(onMove, onSettled): void {
      let moveTimer = 0;
      map.on('movestart', () => wrap.classList.add('map-moving'));
      map.on('move', () => {
        const c = map.getCenter();
        onMove(c.lat, c.lng);
      });
      map.on('moveend', () => {
        wrap.classList.remove('map-moving');
        const c = map.getCenter();
        clearTimeout(moveTimer);
        moveTimer = window.setTimeout(() => onSettled(c.lat, c.lng), SETTLE_DELAY);
      });
    },
  };
}
