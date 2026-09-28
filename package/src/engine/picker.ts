import { Map as MlMap, Marker, Popup } from 'maplibre-gl';
import type {
  EventHandler,
  LocationPickerOptions,
  PickerEvent,
  PickerLocation,
  SearchSuggestion,
} from '../core/types.js';
import { DEFAULT_CENTER, mergeOptions, resolveDir } from '../core/defaults.js';
import { MAP_STYLE } from '../style/map-style.js';
import { Emitter } from './emitter.js';
import { ICONS } from '../core/icons.js';
import { enDigits, faCoord, faStr, isValidLatLng, shortAddr } from '../core/format.js';
import { reverseGeocode, searchLocation } from '../core/geocode.js';
import { trySnapToRoad } from './snap.js';

const MIN_QUERY_LEN_FALLBACK = 3;
const WORKER_FIX =
  "Vite: import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'; سپس setupQomPickWorker(workerUrl) را قبل از mount صدا بزنید. Next.js/webpack: هر دو فایل worker و shared را کپی کنید.";
const WORKER_ERROR_MESSAGE =
  'qompick: MapLibre worker failed to load. Call setupQomPickWorker(workerUrl) from @amir83nasr/map before mounting LocationPickerView. Vite: use maplibre-gl-worker.mjs?worker&url. Next.js/webpack: copy maplibre-gl-worker.mjs and maplibre-gl-shared.mjs.';

// A broken worker is invisible from map events: Actor subscribes only to Worker
// 'message' (never 'error'), a 404'd script still lets map 'load' fire, and the
// failure Event carries no message/filename to classify. The only reliable signal
// is the Worker instance itself — MapLibre builds the pool synchronously inside
// `new MlMap()`, so hook construction there and restore the global right after.
// Shared pool verdict: a second picker reusing an already-broken pool still sees it.
// A fresh pool build clears the stale verdict; a later error event sets it again.
let sharedWorkerBroken = false;

function watchWorkerStartup(onError: () => void): () => void {
  const Native = globalThis.Worker;
  if (typeof Native !== 'function') return () => undefined;
  class ObservedWorker extends Native {
    constructor(scriptURL: string | URL, options?: WorkerOptions) {
      super(scriptURL, options);
      sharedWorkerBroken = false; // fresh pool build: previous verdict is stale
      this.addEventListener('error', () => {
        sharedWorkerBroken = true;
        onError();
      });
    }
  }
  globalThis.Worker = ObservedWorker;
  return () => {
    globalThis.Worker = Native;
  };
}

export function isMapLibreWorkerError(value: unknown): boolean {
  const error = value as { message?: unknown; filename?: unknown; url?: unknown } | null;
  const text = [error?.message, error?.filename, error?.url, value]
    .filter((part): part is string => typeof part === 'string')
    .join(' ')
    .toLowerCase();
  return (
    /maplibre-gl-(worker|shared)(?:-dev)?\.mjs/.test(text) ||
    /failed to fetch worker script/.test(text) ||
    (/worker/.test(text) && /failed to load|cannot load|dynamically imported module/.test(text))
  );
}

const DEV_PROMPT_ZERO =
  'من می‌خواهم با پکیج قم‌پیک (@amir83nasr/map) یک نقشه انتخاب موقعیت (LocationPickerView) از صفر در پروژه React/Next.js بسازم. ' +
  'این پکیج کاملاً متن‌باز و رایگان است و روی MapLibre GL ساخته شده و فقط نسخه React دارد. ' +
  'لطفاً قدم‌به‌قدم و به ترتیب راهنمایی‌ام کن: ' +
  '۱) نصب — دستور نصب @amir83nasr/map و maplibre-gl نسخه ۶ (که peer dependency است و باید جدا نصب شود)؛ ' +
  '۲) راه‌اندازی پایه — ایمپورت @amir83nasr/map/styles.css (شامل CSS مپ‌لایبر، فقط یک import CSS) و رندر کامپوننت LocationPickerView با ارتفاع مشخص (مثلاً 480px، چون بدون ارتفاع نقشه خالی دیده می‌شود) و center و zoom اولیه؛ ' +
  '۳) جستجو — استفاده از پیشنهادهای پیش‌فرض محله‌های قم، یا جایگزینی آن‌ها با search.suggestions شامل name و addr و lat و lng؛' +
  '۴) مارکرها — نمایش مارکر مکان‌ها با markers؛ ' +
  '۵) دریافت نتیجه — گرفتن مختصات و آدرس تاییدشده کاربر با onConfirm؛ ' +
  '۶) پاک‌سازی — کامپوننت LocationPickerView خودش destroy را در cleanup صدا می‌زند. ' +
  'کد کامل و قابل اجرا بده شامل همه importها و cssها، بگو هر بخش چه می‌کند، و در پایان خروجی مورد انتظار را توصیف کن: نقشه فارسی راست‌چین (RTL) و موبایل‌فرست با پین وسط، دکمه GPS، جستجو و دکمه تایید موقعیت. ' +
  'اگر چیزی از پروژه من لازم داری (نسخه React/Next.js، نسخه پکیج‌ها) اول بپرس.';

const DEV_PROMPT_EXISTING =
  'پروژه React/Next.js من از قبل وجود دارد و می‌خواهم نقشه انتخاب موقعیت قم‌پیک (@amir83nasr/map) را به آن اضافه کنم بدون این‌که چیز دیگری خراب شود. ' +
  'این پکیج کاملاً متن‌باز و رایگان است و روی MapLibre GL ساخته شده و فقط نسخه React دارد. ' +
  'لطفاً قدم‌به‌قدم و به ترتیب راهنمایی‌ام کن: ' +
  '۱) نصب — دستور نصب @amir83nasr/map و maplibre-gl نسخه ۶ (که peer dependency است و باید جدا نصب شود)، با توجه به این‌که بقیه dependencyهای پروژه نباید به‌هم بخورد؛ ' +
  '۲) ایمپورت css — اضافه کردن @amir83nasr/map/styles.css (شامل CSS مپ‌لایبر؛ فقط یک import CSS) طوری که با استایل‌های فعلی پروژه تداخل نکند (همه کلاس‌ها و متغیرهای قم‌پیک با qp- شروع می‌شوند)؛ ' +
  '۳) کانتینر — رندر LocationPickerView با ارتفاع مشخص (مثلاً 480px، چون بدون ارتفاع نقشه خالی دیده می‌شود) در جای مناسب صفحه فعلی؛ ' +
  '۴) اتصال — دادن center و zoom، استفاده یا جایگزینی پیشنهادهای پیش‌فرض search، نمایش markers، و گرفتن مختصات و آدرس تاییدشده با onConfirm؛' +
  '۵) پاک‌سازی — کامپوننت LocationPickerView خودش destroy را در cleanup صدا می‌زند. ' +
  'کد کامل و قابل اجرا بده شامل همه importها، بگو هر بخش چه می‌کند، و در پایان خروجی مورد انتظار را توصیف کن: نقشه فارسی راست‌چین (RTL) و موبایل‌فرست با پین وسط، دکمه GPS، جستجو و دکمه تایید موقعیت. ' +
  'اگر چیزی از پروژه من لازم داری (نسخه React/Next.js، نسخه پکیج‌ها، ساختار فایل‌ها) اول بپرس.';

const DEV_PROMPTS: Record<string, string> = {
  zero: DEV_PROMPT_ZERO,
  existing: DEV_PROMPT_EXISTING,
};

function el(html: string): HTMLElement {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild as HTMLElement;
}

export class LocationPicker {
  private opts: ReturnType<typeof mergeOptions>;
  private emitter = new Emitter();
  private root!: HTMLElement;
  private map!: MlMap;
  private myMarker: Marker | null = null;
  private venueMarkers: Marker[] = [];
  private labelEl!: HTMLElement;
  private toastEl!: HTMLElement;
  private overlay!: HTMLElement;
  private resolveT = 0;
  private searchT = 0;
  private toastT = 0;
  private settleT = 0;
  private confirmT = 0;
  private venueT: number[] = [];
  private revSeq = 0;
  private searchSeq = 0;
  private revAbort: AbortController | null = null;
  private searchAbort: AbortController | null = null;
  private destroyed = false;
  private workerFailed = false;
  private boundsSaved: { sw: [number, number]; ne: [number, number] } | null = null;
  lat = DEFAULT_CENTER.lat;
  lng = DEFAULT_CENTER.lng;
  address = '';
  resolving = false;
  private onKey = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return;
    if (!this.overlay.hidden) this.closeSearch();
    else if (!this.isHidden('.qp-docs')) this.closeDocs();
    else if (!this.isHidden('.qp-confirm')) this.closeModal('qp-confirm');
    else if (!this.isHidden('.qp-geo')) this.closeModal('qp-geo');
  };
  private isHidden(sel: string): boolean {
    return (this.root.querySelector(sel) as HTMLElement | null)?.hidden ?? true;
  }

  constructor(options: LocationPickerOptions) {
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
      const zoom = opts.zoom ?? Math.max(this.map.getZoom(), this.opts.behavior.pickZoom ?? 15);
      this.map.flyTo({ center: [lng, lat], zoom, duration: 450 });
    }
    if (opts.resolve !== false && this.opts.behavior.resolveOnMove !== false)
      this.scheduleResolve(lat, lng);
    else this.renderLabel();
  }

  locate(): void {
    if (!navigator.geolocation) {
      this.toast(this.t('gpsUnsupported'));
      this.fail(new Error('geolocate: unsupported'));
      return;
    }
    const btn = this.root.querySelector('.qp-gps');
    if (!window.isSecureContext) {
      // file:// و http غیرلوکال همیشه fail می‌دهند؛ مستقیم راهنما باز شود.
      this.openModal('qp-geo');
      this.fail(new Error('geolocate: insecure-context'));
      return;
    }
    btn?.classList.add('is-locating');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        btn?.classList.remove('is-locating');
        // موقعیت GPS ممکن است خارج از bounds پیش‌فرض (محدوده قم) باشد؛
        // بدون برداشتن سقف، flyTo به لبه bounds clamp می‌شود و دکمه بی‌اثر به نظر می‌رسد.
        // فقط برای این پرواز باز می‌شود و بلافاصله بعدش برمی‌گردد.
        if (!this.boundsSaved) {
          const b = this.map.getMaxBounds();
          if (b)
            this.boundsSaved = { sw: b.getSouthWest().toArray(), ne: b.getNorthEast().toArray() };
        }
        this.map.setMaxBounds(null);
        this.showMyPos(p.coords.latitude, p.coords.longitude);
        this.setLocation(p.coords.latitude, p.coords.longitude, {
          moveMap: true,
          zoom: this.opts.behavior.locateZoom ?? 18,
        });
        if (this.boundsSaved) {
          this.map.setMaxBounds([this.boundsSaved.sw, this.boundsSaved.ne]);
          this.boundsSaved = null;
        }
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
    return loc;
  }

  destroy(): void {
    this.destroyed = true;
    document.removeEventListener('keydown', this.onKey);
    window.clearTimeout(this.resolveT);
    window.clearTimeout(this.searchT);
    window.clearTimeout(this.toastT);
    window.clearTimeout(this.settleT);
    window.clearTimeout(this.confirmT);
    this.venueT.forEach((t) => window.clearTimeout(t));
    this.revAbort?.abort();
    this.searchAbort?.abort();
    this.venueMarkers.forEach((m) => m.remove());
    this.myMarker?.remove();
    this.map?.remove();
    this.root.remove();
  }

  // ── BUILD ──
  private t<K extends keyof import('../core/types.js').Labels>(k: K): string {
    return (this.opts.i18n.labels as Record<string, string>)[k];
  }

  private build(host: HTMLElement): void {
    const o = this.opts;
    const dir = resolveDir();
    const ph = (o.search.placeholder ?? this.t('searchPlaceholder'))
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    this.root = el(`<div class="qp qp-app" dir="${dir}"></div>`);
    const pinHtml = `<div class="qp-pin" aria-hidden="true"><div class="qp-pin-body"><div class="qp-pin-head"><div class="qp-pin-hole"></div></div><div class="qp-pin-stem"></div><div class="qp-pin-foot"></div></div><div class="qp-pin-shadow"></div></div>`;
    this.root.innerHTML = `
      <div class="qp-layout">
        <main class="qp-map-wrap">${'<div class="qp-map"></div>'}${pinHtml}
          ${o.controls.gps ? `<button class="qp-gps" type="button" aria-label="${this.t('currentLocation')}">${ICONS.locate}</button>` : ''}
          ${o.controls.developers ? `<button class="qp-dev" type="button">${this.t('developers')}</button>` : ''}
        </main>
        ${
          o.sheet.enabled
            ? `<section class="qp-sheet"><div class="qp-grab"></div>
          ${o.controls.searchTrigger && o.search.enabled ? `<div class="qp-search"><button class="qp-search-trigger" type="button"><span class="qp-sic">${ICONS.search}</span><span class="qp-search-label"></span></button></div>` : ''}
          <div class="qp-desk">
            <div class="qp-search-bar"><div class="qp-field"><input class="qp-desk-input" type="search" placeholder="${ph}" autocomplete="off" aria-label="${this.t('searchTitle')}"/><button class="qp-clear qp-desk-clear" hidden aria-label="${this.t('clearSearch')}">${ICONS.x}</button><span class="qp-sic">${ICONS.search}</span></div></div>
            <div class="qp-desk-body"><div class="qp-desk-home"><h3 class="qp-sec-t">${this.t('suggestedPlaces')}</h3><div class="qp-suggest-desk"></div></div><div class="qp-results-desk"></div></div>
          </div>
          <div class="qp-sheet-row">${o.controls.confirmButton ? `<button class="qp-cta">${this.t('confirmLocation')}</button>` : ''}</div>
        </section>`
            : ''
        }
      </div>
      ${
        o.search.enabled
          ? `<div class="qp-overlay" hidden><div class="qp-ov-head"><h2>${this.t('searchTitle')}</h2><button class="qp-ov-close" type="button" aria-label="${this.t('close')}">${ICONS.x}</button></div>
        <div class="qp-search-bar"><div class="qp-field"><input type="search" placeholder="${ph}" autocomplete="off"/><button class="qp-clear" hidden aria-label="${this.t('clearSearch')}">${ICONS.x}</button><span class="qp-sic">${ICONS.search}</span></div></div>
        <div class="qp-ov-body"><div class="qp-home"><h3 class="qp-sec-t">${this.t('suggestedPlaces')}</h3><div class="qp-suggest"></div></div><div class="qp-results"></div></div>
      </div>`
          : ''
      }
      <div class="qp-modal qp-geo" hidden><div class="qp-modal-card"><div class="qp-modal-head"><h2>${this.t('geoTitle')}</h2><button class="qp-x" type="button" aria-label="${this.t('close')}">${ICONS.x}</button></div><p>${this.t('geoText')}</p><p class="qp-modal-sub">${this.t('geoBlocked')}</p><div class="qp-modal-row"><button class="qp-cta qp-geo-retry" type="button">${this.t('enableAccess')}</button></div></div></div>
      <div class="qp-modal qp-confirm" hidden><div class="qp-modal-card"><div class="qp-modal-head"><h2>${this.t('confirmLocation')}</h2><button class="qp-x" type="button" aria-label="${this.t('close')}">${ICONS.x}</button></div><label>${this.t('chosenAddress')}</label><textarea class="qp-addr" rows="3"></textarea><div>${this.t('coordsToServer')}</div><div class="qp-coords" dir="ltr"></div><div class="qp-modal-row"><button class="qp-cta qp-final" type="button">${this.t('confirm')}</button><button class="qp-ghost qp-edit" type="button">${this.t('editOnMap')}</button></div></div></div>
      ${o.controls.developers ? this.devDocsHtml() : ''}
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
    this.root.querySelectorAll('.qp-modal .qp-x').forEach((b) =>
      b.addEventListener('click', () => {
        (b.closest('.qp-modal') as HTMLElement | null)?.setAttribute('hidden', '');
      }),
    );
    this.root.querySelector('.qp-docs .qp-x')?.addEventListener('click', () => this.closeDocs());
    document.addEventListener('keydown', this.onKey);
    this.root.querySelector('.qp-dev')?.addEventListener('click', () => this.openDocs());
    this.root.querySelector('.qp-back')?.addEventListener('click', () => this.closeDocs());
    this.root.querySelector('.qp-docs')?.addEventListener('click', (e) => {
      if (e.target === this.root.querySelector('.qp-docs')) this.closeDocs();
    });
    this.root.querySelectorAll('.qp-copy').forEach((b) =>
      b.addEventListener('click', (e) => {
        this.copyPrompt(e.currentTarget as HTMLButtonElement);
      }),
    );
    const input = this.root.querySelector<HTMLInputElement>('.qp-overlay .qp-field input');
    if (input) {
      const clear = this.root.querySelector<HTMLButtonElement>('.qp-overlay .qp-clear');
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
    // Desktop inline search mirrors the overlay logic into .qp-desk-* nodes.
    const desk = this.root.querySelector<HTMLInputElement>('.qp-desk-input');
    if (desk) {
      const clear = this.root.querySelector<HTMLButtonElement>('.qp-desk-clear');
      const toggle = (): void => {
        if (clear) clear.hidden = desk.value.length === 0;
      };
      desk.addEventListener('input', () => {
        toggle();
        this.onDeskQuery(desk.value);
      });
      desk.addEventListener('keydown', (e) => {
        if (e.key === 'Enter')
          void this.runRemoteSearch(desk.value.trim(), '.qp-results-desk', '.qp-desk-home');
      });
      clear?.addEventListener('click', () => {
        desk.value = '';
        toggle();
        this.renderDeskSuggest('');
        desk.focus();
      });
      this.renderDeskSuggest('');
    }
  }

  // ── MAP ──
  private initMap(): void {
    const o = this.opts;
    const mapEl = this.root.querySelector('.qp-map') as HTMLElement;
    // Vector only (FA labels, IRANYekanX glyphs, road snap).
    const base =
      typeof o.map.style === 'object' && o.map.style !== null
        ? { ...(o.map.style as Record<string, unknown>) }
        : ({ ...MAP_STYLE } as Record<string, unknown>);
    const style = o.map.glyphs ? { ...base, glyphs: o.map.glyphs } : base;
    // Relative glyphs template must resolve against page base, not domain
    // root: core prebuilds with BASE_URL='/', breaks under Pages '/<repo>/'.
    // Pure string join: new URL() would percent-encode {fontstack}/{range}.
    if (typeof style.glyphs === 'string' && !/^(https?:|data:|blob:|\/)/.test(style.glyphs)) {
      const base = document.baseURI;
      const prefix = base.endsWith('/') ? base : base.slice(0, base.lastIndexOf('/') + 1);
      (style as Record<string, unknown>).glyphs = prefix + style.glyphs;
    }
    const b = o.map.bounds!;
    const unwatch = watchWorkerStartup(() => this.showWorkerError());
    try {
      this.map = new MlMap({
        container: mapEl,
        style: style as never,
        center: [o.map.center!.lng, o.map.center!.lat],
        zoom: o.map.zoom,
        minZoom: o.map.minZoom,
        maxZoom: o.map.maxZoom,
        attributionControl: false,
        renderWorldCopies: false,
        // Faster feel: shorter fades, no pitch/rotate handlers, wider click tolerance.
        fadeDuration: 100,
        crossSourceCollisions: false,
        scrollZoom: { around: 'center' },
        dragRotate: false,
        touchPitch: false,
        clickTolerance: 5,
        maxBounds: [
          [b[0][1], b[0][0]],
          [b[1][1], b[1][0]],
        ],
      });
    } finally {
      unwatch();
    }
    // Pool reused from an already-failed picker: no new Worker was built here.
    if (sharedWorkerBroken) this.showWorkerError();
    this.map.on('error', (event) => {
      if (isMapLibreWorkerError(event.error)) {
        this.showWorkerError();
        return;
      }
      // A listener suppresses MapLibre's default console.error — keep it explicit.
      console.error(event.error);
      this.fail(event.error);
    });
    requestAnimationFrame(() => this.map.resize());
    const wrap = this.root.querySelector('.qp-map-wrap') as HTMLElement;
    let snapTarget: { lat: number; lng: number } | null = null;
    let startZoom = this.map.getZoom();
    let startCenter = this.map.getCenter();
    this.map.on('movestart', () => {
      wrap.classList.add('is-moving');
      // Pending snap dies the moment a new gesture starts — never yank mid-pan.
      window.clearTimeout(this.settleT);
      startZoom = this.map.getZoom();
      startCenter = this.map.getCenter();
    });
    this.map.on('move', () => {
      const c = this.map.getCenter();
      this.lat = c.lat;
      this.lng = c.lng;
    });
    this.map.on('moveend', (e) => {
      wrap.classList.remove('is-moving');
      const c = this.map.getCenter();
      window.clearTimeout(this.settleT);
      if (
        snapTarget &&
        Math.abs(c.lat - snapTarget.lat) < 1e-7 &&
        Math.abs(c.lng - snapTarget.lng) < 1e-7
      ) {
        snapTarget = null;
        return;
      }
      // Programmatic moves (flyTo/easeTo from pick/locate/snap) never snap.
      if (!e.originalEvent) {
        this.setLocation(c.lat, c.lng);
        return;
      }
      // Pinch-zoom didn't move the pin: no snap, settle fast.
      // ponytail: 10px/1-zoom thresholds are pan-gesture heuristics;
      // drop in favor of map.touchZoom/cooperative gestures when UX needs it.
      const movedM = Math.hypot(c.lat - startCenter.lat, c.lng - startCenter.lng) * 111_320;
      const z = this.map.getZoom();
      const pinchZoom = Math.abs(z - startZoom) > 1 && movedM < 10;
      const settleMs = pinchZoom
        ? 0
        : (this.opts.behavior.snapDelayMs ?? this.opts.behavior.settleDelayMs);
      this.settleT = window.setTimeout(() => {
        if (this.destroyed) return;
        if (this.opts.behavior.snapToRoad && !pinchZoom) {
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
      }, settleMs);
    });
  }

  private showWorkerError(): void {
    if (this.destroyed || this.workerFailed) return;
    this.workerFailed = true;
    const err = new Error(WORKER_ERROR_MESSAGE);
    console.warn(err.message);
    this.fail(err);

    const box = el('<div class="qp-err qp-map-err" role="alert"></div>');
    const title = el('<strong></strong>');
    title.textContent = 'ورکر MapLibre بارگذاری نشد؛ نقشه قابل استفاده نیست.';
    const detail = el('<span></span>');
    detail.textContent = 'راه‌حل: ';
    const code = el('<code dir="ltr"></code>');
    code.textContent = WORKER_FIX;
    detail.appendChild(code);
    box.append(title, detail);
    this.root.querySelector('.qp-map-wrap')?.appendChild(box);
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
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'qp-venue';
      btn.setAttribute('aria-label', v.name);
      btn.innerHTML = ICONS.star;
      btn.addEventListener('click', () => {
        this.setLocation(v.lat, v.lng, { moveMap: true, zoom: this.opts.behavior.pickZoom });
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
        this.venueT.push(timer);
      });
      popup.on('close', () => window.clearTimeout(timer));
      this.venueMarkers.push(marker);
    }
  }

  // ── ADDRESS ──
  private scheduleResolve(lat: number, lng: number, delay?: number): void {
    window.clearTimeout(this.resolveT);
    const d = delay ?? this.opts.behavior.resolveDelayMs ?? 600;
    this.resolveT = window.setTimeout(() => void this.resolveAddress(lat, lng), d);
  }

  private async resolveAddress(lat: number, lng: number): Promise<void> {
    this.revAbort?.abort();
    this.revAbort = new AbortController();
    const seq = ++this.revSeq;
    this.resolving = true;
    this.labelEl.textContent = this.t('resolving');
    try {
      const text = await reverseGeocode(lat, lng, { signal: this.revAbort.signal });
      if (seq !== this.revSeq || this.destroyed) return;
      this.address = shortAddr(text);
      this.emitter.emit('addressResolved', this.getLocation());
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
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

  // ── DEVELOPERS DOCS ──
  private devDocsHtml(): string {
    return `<div class="qp-docs" hidden><div class="qp-docs-card">
      <div class="qp-modal-head"><h2>${this.t('developers')}</h2><button class="qp-x" type="button" aria-label="${this.t('close')}">${ICONS.x}</button></div>
      <section><h3>معرفی</h3><p>قم‌پیک (@amir83nasr/map) نقشه انتخاب موقعیت روی MapLibre برای React است؛ کاملاً متن‌باز و رایگان. فقط نسخه React دارد (کلاس vanilla در exports نیست؛ engine داخلی است). نقشه پیش‌فرض همیشه VECTOR است (نه raster)، با جستجوی آدرس، پین وسط، مارکر مکان‌ها، رابط فارسی راست‌چین (RTL) و طراحی موبایل‌فرست.</p></section>
      <section><h3>نصب</h3><pre dir="ltr">pnpm add @amir83nasr/map maplibre-gl</pre>
      <p class="qp-note">نکته: maplibre-gl نسخه ۶ و react/react-dom peer dependency هستند و باید جدا نصب شوند.</p>
      <pre dir="ltr">npm i @amir83nasr/map maplibre-gl
yarn add @amir83nasr/map maplibre-gl</pre></section>
      <section><h3>شروع سریع (React)</h3><pre dir="ltr">import '@amir83nasr/map/styles.css';
import { LocationPickerView } from '@amir83nasr/map';

&lt;LocationPickerView
  onConfirm={(loc) =&gt; console.log(loc)}
/&gt;;</pre>
      <p class="qp-note">نکته: CSS مپ‌لایبر داخل <code dir="ltr">@amir83nasr/map/styles.css</code> بسته‌بندی شده — فقط همین یک import CSS کافی است.</p>
      <p class="qp-note">نکته: فونت فارسی IRANYekanX داخل خود پکیج است (با همین import CSS لود می‌شود) و لیبل‌های فارسی نقشه هم از PBFهای داخل پکیج می‌آیند — بدون تنظیم اضافه.</p>
      <p class="qp-note">نکته: کامپوننت خودش init و destroy را در lifecycle (useEffect) انجام می‌دهد — بدون init/destroy دستی. تنظیمات engine فقط موقع mount اعمال می‌شوند؛ برای تنظیمات جدید با <code dir="ltr">key</code> ریمانت کنید (فقط callbackها زنده می‌مانند).</p>
      <p class="qp-note">ورکر MapLibre را قبل از mount تنظیم کنید: در Vite فایل <code dir="ltr">maplibre-gl-worker.mjs?worker&amp;url</code> را import و به <code dir="ltr">setupQomPickWorker()</code> بدهید؛ در Next.js/webpack هر دو فایل worker و shared را کپی کنید. خطای ورکر در <code dir="ltr">onError</code>، کنسول و <code dir="ltr">.qp-err</code> نمایش داده می‌شود.</p>
      <p class="qp-note">نکته Next.js App Router: کامپوننت client است؛ با <code dir="ltr">dynamic(..., { ssr: false })</code> لود کنید.</p></section>
      <section><h3>تنظیمات مهم</h3><ul class="qp-list">
      <li><code dir="ltr">map</code> — مرکز، زوم و محدوده نقشه (<code dir="ltr">center / zoom / minZoom / maxZoom / bounds</code>) و استایل سفارشی برداری (<code dir="ltr">style</code>).</li>
      <li><code dir="ltr">search</code> — جستجو با پیشنهادهای پیش‌فرض ۴۱ محله قم: <code dir="ltr">enabled / placeholder / suggestions / minLength / debounceMs / limit</code>. آرایه سفارشی جایگزین پیش‌فرض می‌شود؛ <code dir="ltr">suggestions: []</code> آن را خالی می‌کند. <code dir="ltr">limit</code> پیشنهادهای محلی را هم محدود می‌کند.</li>
      <li><code dir="ltr">markers</code> — مارکر مکان‌ها با <code dir="ltr">name / lat / lng</code>.</li>
      <li><code dir="ltr">controls</code> — دکمه‌ها: <code dir="ltr">gps / confirmButton / searchTrigger / developers</code>.</li>
      <li><code dir="ltr">behavior</code> — رفتار: <code dir="ltr">snapToRoad / resolveOnMove / resolveDelayMs / settleDelayMs / snapDelayMs / pickZoom / locateZoom</code>.</li>
      <li><code dir="ltr">i18n.labels</code> — متن‌ها؛ پیش‌فرض فارسی راست‌چین.</li>
      <li>callbackها: <code dir="ltr">onLocationChange / onAddressResolved / onSearchResults / onPick / onConfirm / onLocate / onError</code>.</li></ul>
      <pre dir="ltr">&lt;LocationPickerView
  map={{ center: { lat: 34.64, lng: 50.87 }, zoom: 15 }}
  search={{ minLength: 3, limit: 5 }}
  controls={{ gps: true, developers: true }}
  onConfirm={(loc) =&gt; console.log(loc)}
/&gt;;</pre></section>
      <section><h3>ساختار پروژه</h3><ul class="qp-list">
      <li><code dir="ltr">package/src/index.tsx</code> — API عمومی (re-export از <code dir="ltr">react/ + core/</code>).</li>
      <li><code dir="ltr">package/src/react/</code> — کامپوننت <code dir="ltr">LocationPickerView</code> + هلپر <code dir="ltr">setupQomPickWorker</code>.</li>
      <li><code dir="ltr">package/src/engine/</code> — engine داخلی (<code dir="ltr">picker</code>، در exports عمومی نیست).</li>
      <li><code dir="ltr">package/src/core/ + style/</code> — تایپ‌ها و helperها + استایل و basemap.</li>
      <li><code dir="ltr">package/src/style/styles.css</code> — استایل‌ها؛ خروجی build <code dir="ltr">dist/styles.css</code> است (ایمپورت: <code dir="ltr">@amir83nasr/map/styles.css</code>).</li>
      <li><code dir="ltr">package/fonts/</code> — فونت IRANYekanX (woff2) و PBFهای glyph نقشه؛ داخل tarball منتشر می‌شود.</li>
      <li><code dir="ltr">demo/</code> — دموی Vite؛ <code dir="ltr">docs/</code> — ARCHITECTURE و CHANGELOG.</li></ul></section>
      <section><h3>سفارشی‌سازی ظاهر</h3><p>همه کلاس‌ها و متغیرها با <code dir="ltr">qp-</code> شروع می‌شوند و با استایل پروژه تداخل نمی‌کنند. prop جداگانه theme نیست؛ رنگ و فونت را با متغیرهای CSS عوض کنید:</p>
      <pre dir="ltr">.qp { --qp-brand: #16a34a; --qp-radius: 16px; }</pre></section>
      <section><h3>پرامپت شروع از صفر</h3><div class="qp-prompt">${DEV_PROMPT_ZERO}</div>
      <div class="qp-modal-row"><button class="qp-ghost qp-copy" type="button" data-prompt="zero">${this.t('copy')}</button></div></section>
      <section><h3>پرامپت افزودن به پروژه موجود</h3><div class="qp-prompt">${DEV_PROMPT_EXISTING}</div>
      <div class="qp-modal-row"><button class="qp-ghost qp-copy" type="button" data-prompt="existing">${this.t('copy')}</button></div></section>
      <section><h3>سوالات پرتکرار</h3><ul class="qp-list">
      <li>نقشه خالی است؟ به کامپوننت ارتفاع بدهید (مثلاً <code dir="ltr">style={{ height: 480 }}</code>)؛ بدون ارتفاع نقشه دیده نمی‌شود.</li>
      <li>لیبل‌های فارسی نقشه نمایش داده نمی‌شود؟ glyphهای پیش‌فرض از CDN پکیج می‌آیند؛ برای self-host کردن، <code dir="ltr">map.glyphs</code> را به مسیر فونت‌های پکیج (مثلاً <code dir="ltr">/fonts/{fontstack}/{range}.pbf</code> بعد از کپی <code dir="ltr">node_modules/@amir83nasr/map/fonts</code>) تنظیم کنید.</li>
      <li>پیام خطای ورکر روی نقشه می‌بینید؟ در Vite، <code dir="ltr">maplibre-gl-worker.mjs?worker&amp;url</code> را import و قبل از mount به <code dir="ltr">setupQomPickWorker()</code> بدهید؛ در Next.js/webpack هر دو فایل <code dir="ltr">maplibre-gl-worker.mjs</code> و <code dir="ltr">maplibre-gl-shared.mjs</code> را کپی کنید. پکیج همین خطا را یک‌بار به <code dir="ltr">onError</code> و کنسول هم می‌فرستد.</li>
      <li>کدام نسخه maplibre؟ نسخه ۶؛ چون peer dependency است باید جدا نصب شود.</li>
      <li>در Next.js App Router؟ کامپوننت client است؛ با <code dir="ltr">dynamic(..., { ssr: false })</code> لود کنید.</li>
      <li>رایگان است؟ بله، قم‌پیک کاملاً متن‌باز و رایگان است.</li></ul></section>
      <div class="qp-modal-row"><button class="qp-cta qp-back" type="button">${this.t('backToMap')}</button></div>
    </div></div>`;
  }

  private openDocs(): void {
    (this.root.querySelector('.qp-docs') as HTMLElement | null)?.removeAttribute('hidden');
  }
  private closeDocs(): void {
    const d = this.root.querySelector('.qp-docs') as HTMLElement | null;
    if (d) d.hidden = true;
  }

  private copyPrompt(btn: HTMLButtonElement): void {
    const done = (): void => {
      const prev = btn.textContent ?? '';
      btn.textContent = this.t('copied');
      window.setTimeout(() => {
        btn.textContent = prev;
      }, 1500);
    };
    if (navigator.clipboard?.writeText) {
      const key = btn.dataset.prompt ?? 'zero';
      const text = DEV_PROMPTS[key] ?? DEV_PROMPT_ZERO;
      navigator.clipboard.writeText(text).then(done, () => this.fallbackCopy(text, done));
      return;
    }
    const key = btn.dataset.prompt ?? 'zero';
    this.fallbackCopy(DEV_PROMPTS[key] ?? DEV_PROMPT_ZERO, done);
  }

  private fallbackCopy(text: string, done: () => void): void {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
    } catch {
      /* clipboard unavailable */
    }
    ta.remove();
    done();
  }

  // ── SEARCH ──
  private openSearch(): void {
    this.overlay.hidden = false;
    const input = this.root.querySelector<HTMLInputElement>('.qp-overlay .qp-field input');
    if (input) {
      input.value = '';
      this.renderSuggest('');
      window.setTimeout(() => input.focus(), 50);
    }
  }
  private closeSearch(): void {
    this.overlay.hidden = true;
    const input = this.root.querySelector<HTMLInputElement>('.qp-overlay .qp-field input');
    if (input) input.blur();
  }

  private pickSuggestion(s: SearchSuggestion): void {
    this.setLocation(s.lat, s.lng, { moveMap: true, zoom: this.opts.behavior.pickZoom });
    this.emitter.emit('pick', this.getLocation());
    this.closeSearch();
  }

  private pickResult(lat: string, lon: string): void {
    this.searchSeq++;
    this.setLocation(parseFloat(lat), parseFloat(lon), {
      moveMap: true,
      zoom: this.opts.behavior.pickZoom,
    });
    const loc = this.getLocation();
    this.emitter.emit('pick', loc);
    this.closeSearch();
  }

  private suggestionRow(s: SearchSuggestion): HTMLButtonElement {
    const b = el(
      `<button class="qp-row" type="button"><span class="qp-ric">${ICONS.pin}</span><span class="qp-t"><b></b><small></small></span></button>`,
    ) as HTMLButtonElement;
    (b.querySelector('b') as HTMLElement).textContent = faStr(s.name);
    (b.querySelector('small') as HTMLElement).textContent = faStr(s.addr);
    b.addEventListener('click', () => this.pickSuggestion(s));
    return b;
  }

  private resultRow(displayName: string, lat: string, lon: string): HTMLButtonElement {
    const b = el(
      `<button class="qp-card" type="button"><span class="qp-ric">${ICONS.pin}</span><span><b></b><small></small></span></button>`,
    ) as HTMLButtonElement;
    (b.querySelector('b') as HTMLElement).textContent = faStr(String(displayName).split(',')[0]);
    (b.querySelector('small') as HTMLElement).textContent = faStr(shortAddr(displayName));
    b.addEventListener('click', () => this.pickResult(lat, lon));
    return b;
  }

  private filteredSuggestions(q: string): SearchSuggestion[] {
    const needle = enDigits(q).trim();
    const limit = this.opts.search.limit ?? 5;
    return this.suggestions()
      .filter(
        (x) => !needle || enDigits(x.name).includes(needle) || enDigits(x.addr).includes(needle),
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'fa'))
      .slice(0, Math.max(1, limit));
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
    for (const s of this.filteredSuggestions(q)) box.appendChild(this.suggestionRow(s));
    if (home) home.hidden = false;
    if (results) results.innerHTML = '';
  }

  // Desktop inline mirrors (same data, .qp-desk-* nodes, no overlay).
  private renderDeskSuggest(q: string): void {
    const box = this.root.querySelector('.qp-suggest-desk');
    const home = this.root.querySelector('.qp-desk-home') as HTMLElement | null;
    const results = this.root.querySelector('.qp-results-desk') as HTMLElement | null;
    if (!box) return;
    box.innerHTML = '';
    for (const s of this.filteredSuggestions(q)) box.appendChild(this.suggestionRow(s));
    if (home) home.hidden = false;
    if (results) results.innerHTML = '';
  }

  private onQuery(q: string): void {
    this.onQueryShared(
      q,
      (v) => this.renderSuggest(v),
      (v) => void this.runSearch(v),
    );
  }

  // Shared debounce for overlay + desktop inputs (same minLength/timing).
  private onQueryShared(
    q: string,
    renderLocal: (v: string) => void,
    run: (v: string) => void,
  ): void {
    this.searchSeq++;
    const my = this.searchSeq;
    window.clearTimeout(this.searchT);
    const query = q.trim();
    const min = this.opts.search.minLength ?? MIN_QUERY_LEN_FALLBACK;
    if (query.length < 1) {
      renderLocal('');
      return;
    }
    if (query.length < min) {
      renderLocal(query);
      return;
    }
    this.searchT = window.setTimeout(() => {
      if (my === this.searchSeq) run(query);
    }, this.opts.search.debounceMs ?? 350);
  }

  private async runSearch(q: string): Promise<void> {
    await this.runRemoteSearch(q, '.qp-results', '.qp-home');
  }

  private onDeskQuery(q: string): void {
    this.onQueryShared(
      q,
      (v) => this.renderDeskSuggest(v),
      (v) => void this.runRemoteSearch(v, '.qp-results-desk', '.qp-desk-home'),
    );
  }

  private async runRemoteSearch(q: string, resultsSel: string, homeSel: string): Promise<void> {
    const query = q.trim();
    const results = this.root.querySelector(resultsSel) as HTMLElement | null;
    const home = this.root.querySelector(homeSel) as HTMLElement | null;
    if (!results) return;
    if (!query) {
      if (resultsSel.includes('desk')) this.renderDeskSuggest('');
      else this.renderSuggest('');
      return;
    }
    const min = this.opts.search.minLength ?? MIN_QUERY_LEN_FALLBACK;
    if (query.length < min) {
      if (resultsSel.includes('desk')) this.renderDeskSuggest(query);
      else this.renderSuggest(query);
      return;
    }
    const my = ++this.searchSeq;
    this.searchAbort?.abort();
    this.searchAbort = new AbortController();
    if (home) home.hidden = true;
    results.innerHTML = `<div class="qp-err">${this.t('searching')}</div>`;
    try {
      const list = await searchLocation(query, this.opts.search.limit ?? 5, {
        signal: this.searchAbort.signal,
      });
      if (my !== this.searchSeq) return;
      this.emitter.emit('searchResults', list);
      if (!list.length) {
        results.innerHTML = `<div class="qp-err">${this.t('noResults')}</div>`;
        return;
      }
      results.innerHTML = '';
      for (const it of list) results.appendChild(this.resultRow(it.display_name, it.lat, it.lon));
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
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
    finalBtn.textContent = this.t('submitting');
    window.clearTimeout(this.confirmT);
    this.confirmT = window.setTimeout(() => {
      if (this.destroyed) return;
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
    window.clearTimeout(this.toastT);
    this.toastT = window.setTimeout(() => this.toastEl.classList.remove('show'), 2600);
  }

  private fail(e: unknown): void {
    const err = e instanceof Error ? e : new Error(String(e));
    this.emitter.emit('error', err);
  }
}
