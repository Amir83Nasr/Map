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
    const content = document.createElement('div');
    content.className = 'venue-pop';
    const dot = document.createElement('span');
    dot.className = 'venue-pop-dot';
    const label = document.createElement('span');
    label.textContent = v.name;
    content.append(dot, label);
    const popup = new Popup({
      offset: 26,
      anchor: 'top',
      closeButton: false,
      className: 'venue-pop-wrap',
    }).setDOMContent(content);
    new Marker({ element: el })
      .setLngLat([v.lng, v.lat])
      .setPopup(popup)
      .addTo(map.map);
    let timer: number | undefined;
    popup.on('open', () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => popup.remove(), 4000);
    });
    popup.on('close', () => window.clearTimeout(timer));
    // ponytail: تک‌تایمر سراسری (بستن پاپ‌آپ قبلی) وقتی لازم شد.
  }
  refreshIcons();
}
