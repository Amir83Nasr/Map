import { query } from '../utils/dom.js';
import { faStr, shortAddr } from '../utils/format.js';
import { refreshIcons } from './icons.js';

/** Static suggestion row (name + address, map-pin icon). */
export function createSuggestRow(name: string, addr: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.className = 'hist-row';
  b.type = 'button';
  b.innerHTML =
    '<span class="side-ic right"><i data-lucide="map-pin"></i></span><span class="t"><b></b><small></small></span>';
  query(b, 'b').textContent = faStr(String(name).replace(/،\s*قم\s*$/, ''));
  query(b, 'small').textContent = faStr(
    String(addr)
      .split(/[،,]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .reverse()
      .join('، '),
  );
  refreshIcons();
  return b;
}

/** Geocoder result row (name + shortened address). */
export function createResultCard(displayName: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.className = 'result-card';
  b.innerHTML =
    '<span class="ic"><i data-lucide="map-pin"></i></span><span><b></b><small></small></span>';
  query(b, 'b').textContent = faStr(String(displayName).split(',')[0]);
  query(b, 'small').textContent = faStr(shortAddr(displayName));
  refreshIcons();
  return b;
}

export function showStatus(list: HTMLElement, msg: string): void {
  list.innerHTML = '';
  const d = document.createElement('div');
  d.className = 'err';
  d.textContent = msg;
  list.appendChild(d);
}
