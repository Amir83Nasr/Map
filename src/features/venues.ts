import { Marker, Popup } from 'maplibre-gl';
import type { MapView } from './map-view.js';
import type { Selection } from './selection.js';
import { VENUES } from '../constants/venues.js';
import { refreshIcons } from '../components/icons.js';

/** Green trophy pins for sport venues; click selects location + shows name. */
export function initVenues(map: MapView, selection: Selection): void {
  for (const v of VENUES) {
    const el = document.createElement('button');
    el.className = 'venue-pin';
    el.type = 'button';
    el.setAttribute('aria-label', v.name);
    el.innerHTML = '<i data-lucide="trophy"></i>';
    el.addEventListener('click', () => {
      selection.setSelected(v.lat, v.lng, { moveMap: true });
    });
    new Marker({ element: el })
      .setLngLat([v.lng, v.lat])
      .setPopup(new Popup({ offset: 18, closeButton: false }).setText(v.name))
      .addTo(map.map);
  }
  refreshIcons();
}
