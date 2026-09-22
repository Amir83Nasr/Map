import { Map as MlMap, Marker, Popup, setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import type {
  EventHandler,
  LocationPickerOptions,
  PickerEvent,
  PickerLocation,
  SearchSuggestion,
} from './types.js';
import { DEFAULT_CENTER, mergeOptions, resolveDir } from './defaults.js';
import { MAP_STYLE } from './map-style.js';
import { Emitter } from './emitter.js';
import { ICONS } from './icons.js';
import { enDigits, faCoord, faStr, isValidLatLng, shortAddr } from './format.js';
import { reverseGeocode, searchLocation } from './geocode.js';
import { trySnapToRoad } from './snap.js';

const MIN_QUERY_LEN_FALLBACK = 3;

function el(html: string): HTMLElement {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild as HTMLElement;
}

export class LocationPicker {
  private opts: ReturnType<typeof mergeOptions>;
  private raw: LocationPickerOptions;
  private emitter = new Emitter();
  private root!: HTMLElement;
  private map!: MlMap;
  private myMarker: Marker | null = null;
  private venueMarkers: Marker[] = [];
  private labelEl!: HTMLElement;
  private toastEl!: HTMLElement;
  private overlay!: HTMLElement;
  privateTimers: number[] = [];
  private revSeq = 0;
  private searchSeq = 0;
  private destroyed = false;
  lat = DEFAULT_CENTER.lat;
  lng = DEFAULT_CENTER.lng;
  address = '';
  resolving = false;

  constructor(options: LocationPickerOptions) {
    this.raw = options;
    const host =
      typeof options.container === 'string'
        ? document.querySelector<HTMLElement>(options.container)
        : options.container;
    if (!host) throw new Error('qompick: container not found');
    this.opts = mergeOptions(options);
    for (const [k, fn] of [
      ['onLocationChange', 'locationChange'],
      ['onAddressResolved', 'addressResolved'],
      ['onSearchResults', 'searchResults'],
      ['onPick', 'pick'],
      ['onConfirm', 'confirm'],
      ['onLocate', 'locate'],
      ['onError', 'error'],
    ] as Array<[keyof LocationPickerOptions, PickerEvent]>) {
      const cb = options[k] as EventHandler | undefined;
      if (typeof cb === 'function') this.emitter.on(fn, cb as EventHandler);
    }
    this.build(host);
    this.initMap();
    if (this.opts.markers.length) this.addVenues(this.opts.markers);
    this.setLocation(
      this.opts.map.center?.lat ?? DEFAULT_CENTER.lat,
      this.opts.map.center?.lng ?? DEFAULT_CENTER.lng,
      { resolve: true },
    );
    this.emitter.emit('ready', this.getLocation());
  }

  on(ev: PickerEvent, fn: EventHandler): () => void {
    return this.emitter.on(ev, fn);
  }
  off(ev: PickerEvent, fn: EventHandler): void {
    this.emitter.off(ev, fn);
  }

  getLocation(): PickerLocation {
    return { lat: this.lat, lng: this.lng, address: this.address };
  }

  setLocation(
    lat: number,
    lng: number,
    opts: { moveMap?: boolean; resolve?: boolean; zoom?: number } = {},
  ): void {
    if (!isValidLatLng(lat, lng)) {
      this.fail(new Error('invalid coordinates'));
      return;
    }
    this.lat = lat;
    this.lng = lng;
    const loc = this.getLocation();
    this.emitter.emit('locationChange', loc);
    if (opts.moveMap && this.map) {
      const zoom = opts.zoom ?? Math.max(this.map.getZoom(), this.opts.behavior.pickZoom ?? 14);
      this.map.flyTo({ center: [lng, lat], zoom, duration: 800 });
    }
    if (opts.resolve !== false && this.opts.behavior.resolveOnMove !== false)
      this.scheduleResolve(lat, lng);
    else this.renderLabel();
  }

  locate(): void {
    if (!navigator.geolocation) {
      this.toast(this.t('gpsUnsupported'));
      return;
    }
    const btn = this.root.querySelector('.qp-gps');
    btn?.classList.add('is-locating');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        btn?.classList.remove('is-locating');
        this.showMyPos(p.coords.latitude, p.coords.longitude);
        this.setLocation(p.coords.latitude, p.coords.longitude, {
          moveMap: true,
          zoom: this.opts.behavior.locateZoom ?? 18,
        });
        this.emitter.emit('locate', this.getLocation());
      },
      (err) => {
        btn?.classList.remove('is-locating');
        if (err?.code === err.PERMISSION_DENIED) this.openModal('qp-geo');
        else {
          this.toast(
            err?.code === err.TIMEOUT ? this.t('locateTimeout') : this.t('locateUnavailable'),
          );
          this.scheduleResolve(this.lat, this.lng, 100);
        }
        this.fail(new Error(`geolocate: ${err?.code}`));
      },
      { timeout: 10000 },
    );
  }

  confirm(customAddress?: string): PickerLocation {
    const loc: PickerLocation = {
      lat: this.lat,
      lng: this.lng,
      address: customAddress ?? this.address,
    };
    this.emitter.emit('confirm', loc);
    if (this.raw.onConfirm) this.raw.onConfirm(loc);
    return loc;
  }

  destroy(): void {
    this.destroyed = true;
    this.privateTimers.forEach((t) => window.clearTimeout(t));
    this.venueMarkers.forEach((m) => m.remove());
    this.myMarker?.remove();
    this.map?.remove();
    this.root.remove();
  }

  // ── BUILD ──
  private t<K extends keyof import('./types.js').Labels>(k: K): string {
    return (this.opts.i18n.labels as Record<string, string>)[k];
  }

  private build(host: HTMLElement): void {
    const o = this.opts;
    const dir = resolveDir();
    this.root = el(`<div class="qp qp-app" dir="${dir}"></div>`);
    const pinHtml = `<div class="qp-pin" aria-hidden="true"><div class="qp-pin-body"><div class="qp-pin-head"><div class="qp-pin-hole"></div></div><div class="qp-pin-stem"></div><div class="qp-pin-foot"></div></div><div class="qp-pin-shadow"></div></div>`;
    this.root.innerHTML = `
      <div class="qp-layout">
        <main class="qp-map-wrap">${'<div class="qp-map"></div>'}${pinHtml}
          ${o.controls.gps ? `<button class="qp-gps" aria-label="${this.t('currentLocation')}">${ICONS.locate}</button>` : ''}
        </main>
        ${
          o.sheet.enabled
            ? `<section class="qp-sheet"><div class="qp-grab"></div>
          ${o.controls.searchTrigger && o.search.enabled ? `<div class="qp-search"><button class="qp-search-trigger" type="button"><span class="qp-sic">${ICONS.search}</span><span class="qp-search-label"></span></button></div>` : ''}
          <div class="qp-sheet-row">${o.controls.confirmButton ? `<button class="qp-cta">${this.t('confirmLocation')}</button>` : ''}</div>
        </section>`
            : ''
        }
      </div>
      ${
        o.search.enabled
          ? `<div class="qp-overlay" hidden><div class="qp-ov-head"><h2>${this.t('searchTitle')}</h2><button class="qp-ov-close" aria-label="${this.t('close')}">${ICONS.x}</button></div>
        <div class="qp-search-bar"><div class="qp-field"><input type="search" placeholder="${this.t('searchPlaceholder')}" autocomplete="off"/><button class="qp-clear" hidden aria-label="${this.t('clearSearch')}">${ICONS.x}</button><span class="qp-sic">${ICONS.search}</span></div></div>
        <div class="qp-ov-body"><div class="qp-home"><h3 class="qp-sec-t">${this.t('suggestedPlaces')}</h3><div class="qp-suggest"></div></div><div class="qp-results"></div></div>
      </div>`
          : ''
      }
      <div class="qp-modal qp-geo" hidden><div class="qp-modal-card"><h2>${this.t('geoTitle')}</h2><p>${this.t('geoText')}</p><p class="qp-modal-sub">${this.t('geoBlocked')}</p><div class="qp-modal-row"><button class="qp-cta qp-geo-retry">${this.t('enableAccess')}</button></div></div></div>
      <div class="qp-modal qp-confirm" hidden><div class="qp-modal-card"><h2>${this.t('confirmLocation')}</h2><label>${this.t('chosenAddress')}</label><textarea class="qp-addr" rows="3"></textarea><div>${this.t('coordsToServer')}</div><div class="qp-coords" dir="ltr"></div><div class="qp-modal-row"><button class="qp-cta qp-final">${this.t('confirm')}</button><button class="qp-ghost qp-edit">${this.t('editOnMap')}</button></div></div></div>
      <div class="qp-toast" role="status"></div>`;
    host.appendChild(this.root);
    this.labelEl = this.root.querySelector('.qp-search-label') ?? el('<span></span>');
    this.toastEl = this.root.querySelector('.qp-toast') as HTMLElement;
    this.overlay = this.root.querySelector('.qp-overlay') ?? el('<div></div>');
    this.wire();
    requestAnimationFrame(() => this.root.classList.add('is-ready'));
  }

  private wire(): void {
    this.root.querySelector('.qp-gps')?.addEventListener('click', () => this.locate());
    this.root
      .querySelector('.qp-search-trigger')
      ?.addEventListener('click', () => this.openSearch());
    this.root.querySelector('.qp-ov-close')?.addEventListener('click', () => this.closeSearch());
    this.root.querySelector('.qp-cta')?.addEventListener('click', () => this.openConfirm());
    this.root.querySelector('.qp-final')?.addEventListener('click', () => this.finishConfirm());
    this.root
      .querySelector('.qp-edit')
      ?.addEventListener('click', () => this.closeModal('qp-confirm'));
    this.root.querySelector('.qp-geo-retry')?.addEventListener('click', () => {
      this.closeModal('qp-geo');
      this.locate();
    });
    this.root.querySelectorAll('.qp-modal').forEach((mm) =>
      mm.addEventListener('click', (e) => {
        if (e.target === mm) (mm as HTMLElement).hidden = true;
      }),
    );
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.overlay.hidden) this.closeSearch();
    });
    const input = this.root.querySelector<HTMLInputElement>('.qp-field input');
    if (input) {
      const clear = this.root.querySelector<HTMLButtonElement>('.qp-clear');
      const toggle = (): void => {
        if (clear) clear.hidden = input.value.length === 0;
      };
      input.addEventListener('input', () => {
        toggle();
        this.onQuery(input.value);
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.runSearch(input.value.trim());
      });
      clear?.addEventListener('click', () => {
        input.value = '';
        toggle();
        this.renderSuggest('');
        input.focus();
      });
      this.renderSuggest('');
    }
  }

  // ── MAP ──
  private initMap(): void {
    try {
      setWorkerUrl(workerUrl);
    } catch {
      /* worker already set */
    }
    const o = this.opts;
    const mapEl = this.root.querySelector('.qp-map') as HTMLElement;
    const base =
      typeof o.map.style === 'object' && o.map.style !== null
        ? { ...(o.map.style as Record<string, unknown>) }
        : ({ ...MAP_STYLE } as Record<string, unknown>);
    const style = o.map.glyphs ? { ...base, glyphs: o.map.glyphs } : base;
    const b = o.map.bounds!;
    this.map = new MlMap({
      container: mapEl,
      style: style as never,
      center: [o.map.center!.lng, o.map.center!.lat],
      zoom: o.map.zoom,
      minZoom: o.map.minZoom,
      maxZoom: o.map.maxZoom,
      attributionControl: false,
      renderWorldCopies: false,
      maxBounds: [
        [b[0][1], b[0][0]],
        [b[1][1], b[1][0]],
      ],
    });
    requestAnimationFrame(() => this.map.resize());
    const wrap = this.root.querySelector('.qp-map-wrap') as HTMLElement;
    let timer = 0;
    let snapTarget: { lat: number; lng: number } | null = null;
    this.map.on('movestart', () => wrap.classList.add('is-moving'));
    this.map.on('move', () => {
      const c = this.map.getCenter();
      this.lat = c.lat;
      this.lng = c.lng;
    });
    this.map.on('moveend', () => {
      wrap.classList.remove('is-moving');
      const c = this.map.getCenter();
      window.clearTimeout(timer);
      if (
        snapTarget &&
        Math.abs(c.lat - snapTarget.lat) < 1e-7 &&
        Math.abs(c.lng - snapTarget.lng) < 1e-7
      ) {
        snapTarget = null;
        return;
      }
      timer = window.setTimeout(() => {
        if (this.opts.behavior.snapToRoad) {
          try {
            const snap = trySnapToRoad(this.map, c.lat, c.lng);
            if (snap) {
              snapTarget = snap;
              this.map.easeTo({ center: [snap.lng, snap.lat], duration: 400 });
              this.setLocation(snap.lat, snap.lng);
              return;
            }
          } catch {
            /* keep center */
          }
        }
        this.setLocation(c.lat, c.lng);
      }, this.opts.behavior.settleDelayMs);
      this.privateTimers.push(timer);
    });
  }

  private showMyPos(lat: number, lng: number): void {
    if (this.myMarker) {
      this.myMarker.setLngLat([lng, lat]);
      return;
    }
    const dot = el('<div class="qp-my-wrap"><div class="qp-my-dot"></div></div>');
    this.myMarker = new Marker({ element: dot }).setLngLat([lng, lat]).addTo(this.map);
  }

  private addVenues(list: { name: string; lat: number; lng: number }[]): void {
    for (const v of list) {
      const btn = el(
        `<button class="qp-venue" aria-label="${v.name.replace(/"/g, '')}">${ICONS.trophy}</button>`,
      ) as HTMLButtonElement;
      btn.type = 'button';
      btn.addEventListener('click', () => {
        this.setLocation(v.lat, v.lng, { moveMap: true });
        this.emitter.emit('pick', this.getLocation());
      });
      const content = el(
        `<div class="qp-venue-pop"><span class="qp-venue-dot"></span><span></span></div>`,
      );
      (content.lastElementChild as HTMLElement).textContent = v.name;
      const popup = new Popup({
        offset: 26,
        anchor: 'top',
        closeButton: false,
        className: 'qp-venue-pop-wrap',
      }).setDOMContent(content);
      const marker = new Marker({ element: btn })
        .setLngLat([v.lng, v.lat])
        .setPopup(popup)
        .addTo(this.map);
      let timer = 0;
      popup.on('open', () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => popup.remove(), 4000);
      });
      popup.on('close', () => window.clearTimeout(timer));
      this.venueMarkers.push(marker);
    }
  }

  // ── ADDRESS ──
  private scheduleResolve(lat: number, lng: number, delay?: number): void {
    window.clearTimeout(this.privateTimers.pop());
    const d = delay ?? this.opts.behavior.resolveDelayMs ?? 600;
    const t = window.setTimeout(() => void this.resolveAddress(lat, lng), d);
    this.privateTimers.push(t);
  }

  private async resolveAddress(lat: number, lng: number): Promise<void> {
    const seq = ++this.revSeq;
    this.resolving = true;
    this.labelEl.textContent = this.t('resolving');
    try {
      const text = await reverseGeocode(lat, lng);
      if (seq !== this.revSeq || this.destroyed) return;
      this.address = shortAddr(text);
      this.emitter.emit('addressResolved', this.getLocation());
    } catch (e) {
      if (seq !== this.revSeq) return;
      this.address = '';
      this.fail(e);
    } finally {
      if (seq !== this.revSeq) return;
      this.resolving = false;
      this.renderLabel();
    }
  }

  private renderLabel(): void {
    this.labelEl.textContent = this.address ? faStr(this.address) : this.t('searchTitle');
  }

  // ── SEARCH ──
  private openSearch(): void {
    this.overlay.hidden = false;
    const input = this.root.querySelector<HTMLInputElement>('.qp-field input');
    if (input) {
      input.value = '';
      this.renderSuggest('');
      window.setTimeout(() => input.focus(), 50);
    }
  }
  private closeSearch(): void {
    this.overlay.hidden = true;
    const input = this.root.querySelector<HTMLInputElement>('.qp-field input');
    if (input) input.blur();
  }

  private suggestions(): SearchSuggestion[] {
    return this.opts.search.suggestions ?? [];
  }

  private renderSuggest(q: string): void {
    const box = this.root.querySelector('.qp-suggest');
    const home = this.root.querySelector('.qp-home') as HTMLElement | null;
    const results = this.root.querySelector('.qp-results') as HTMLElement | null;
    if (!box) return;
    box.innerHTML = '';
    const needle = enDigits(q).trim();
    for (const s of this.suggestions().filter(
      (x) => !needle || enDigits(x.name).includes(needle) || enDigits(x.addr).includes(needle),
    )) {
      const b = el(
        `<button class="qp-row" type="button"><span class="qp-ric">${ICONS.pin}</span><span class="qp-t"><b></b><small></small></span></button>`,
      ) as HTMLButtonElement;
      (b.querySelector('b') as HTMLElement).textContent = faStr(s.name);
      (b.querySelector('small') as HTMLElement).textContent = faStr(s.addr);
      b.addEventListener('click', () => {
        this.setLocation(s.lat, s.lng, { moveMap: true, zoom: this.opts.behavior.pickZoom });
        this.emitter.emit('pick', this.getLocation());
        this.closeSearch();
      });
      box.appendChild(b);
    }
    if (home) home.hidden = false;
    if (results) results.innerHTML = '';
  }

  private onQuery(q: string): void {
    this.searchSeq++;
    const my = this.searchSeq;
    window.clearTimeout(this.privateTimers.pop());
    const query = q.trim();
    const min = this.opts.search.minLength ?? MIN_QUERY_LEN_FALLBACK;
    if (query.length < 1) {
      this.renderSuggest('');
      return;
    }
    if (query.length < min) {
      this.renderSuggest(query);
      return;
    }
    const t = window.setTimeout(() => {
      if (my === this.searchSeq) void this.runSearch(query);
    }, this.opts.search.debounceMs ?? 600);
    this.privateTimers.push(t);
  }

  private async runSearch(q: string): Promise<void> {
    const my = ++this.searchSeq;
    const results = this.root.querySelector('.qp-results') as HTMLElement | null;
    const home = this.root.querySelector('.qp-home') as HTMLElement | null;
    if (!results) return;
    if (home) home.hidden = true;
    results.innerHTML = `<div class="qp-err">${this.t('searching')}</div>`;
    try {
      const list = await searchLocation(q, this.opts.search.limit ?? 5);
      if (my !== this.searchSeq) return;
      this.emitter.emit('searchResults', list);
      if (!list.length) {
        results.innerHTML = `<div class="qp-err">${this.t('noResults')}</div>`;
        return;
      }
      results.innerHTML = '';
      for (const it of list) {
        const b = el(
          `<button class="qp-card" type="button"><span class="qp-ric">${ICONS.pin}</span><span><b></b><small></small></span></button>`,
        ) as HTMLButtonElement;
        (b.querySelector('b') as HTMLElement).textContent = faStr(
          String(it.display_name).split(',')[0],
        );
        (b.querySelector('small') as HTMLElement).textContent = faStr(shortAddr(it.display_name));
        b.addEventListener('click', () => {
          this.searchSeq++;
          this.setLocation(parseFloat(it.lat), parseFloat(it.lon), {
            moveMap: true,
            zoom: this.opts.behavior.pickZoom,
          });
          const loc = this.getLocation();
          this.emitter.emit('pick', loc);
          if (this.raw.onPick) (this.raw.onPick as (l: PickerLocation) => void)(loc);
          this.closeSearch();
        });
        results.appendChild(b);
      }
    } catch (e) {
      if (my !== this.searchSeq) return;
      results.innerHTML = `<div class="qp-err">${this.t('searchError')}</div>`;
      this.fail(e);
    }
  }

  // ── CONFIRM ──
  private openModal(cls: string): void {
    (this.root.querySelector(`.${cls}`) as HTMLElement | null)?.removeAttribute('hidden');
  }
  private closeModal(cls: string): void {
    const m = this.root.querySelector(`.${cls}`) as HTMLElement | null;
    if (m) m.hidden = true;
  }

  private openConfirm(): void {
    if (!this.address && !this.resolving) this.scheduleResolve(this.lat, this.lng, 100);
    (this.root.querySelector('.qp-addr') as HTMLTextAreaElement).value = this.address
      ? faStr(this.address)
      : '';
    (this.root.querySelector('.qp-coords') as HTMLElement).textContent =
      `${Number(this.lat).toFixed(6)}, ${Number(this.lng).toFixed(6)}`;
    this.openModal('qp-confirm');
  }

  private finishConfirm(): void {
    const finalBtn = this.root.querySelector('.qp-final') as HTMLButtonElement;
    const addr = (this.root.querySelector('.qp-addr') as HTMLTextAreaElement).value;
    finalBtn.disabled = true;
    const prev = finalBtn.textContent ?? '';
    finalBtn.textContent = 'در حال ثبت...';
    window.setTimeout(() => {
      finalBtn.disabled = false;
      finalBtn.textContent = prev;
      const loc = this.confirm(addr);
      this.closeModal('qp-confirm');
      this.toast(
        `${this.t('registered')} (${faCoord(Number(loc.lat))}, ${faCoord(Number(loc.lng))})`,
      );
    }, 800);
  }

  private toast(msg: string): void {
    this.toastEl.textContent = msg;
    this.toastEl.classList.add('show');
    window.clearTimeout(this.privateTimers.pop());
    const t = window.setTimeout(() => this.toastEl.classList.remove('show'), 2600);
    this.privateTimers.push(t);
  }

  private fail(e: unknown): void {
    const err = e instanceof Error ? e : new Error(String(e));
    this.emitter.emit('error', err);
    this.raw.onError?.(err);
  }
}
