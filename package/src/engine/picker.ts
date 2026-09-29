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
    this.root.querySelectorAll('.qp-code-copy').forEach((b) =>
      b.addEventListener('click', (e) => {
        this.copyCode(e.currentTarget as HTMLButtonElement);
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
        // Fullscreen dialogs on hiDPI (DPR 2-3) exceed MapLibre's 4096
        // default: canvas CSS size × DPR > 4096px warns and drops pixel
        // ratio. 8192 fits typical MAX_TEXTURE_SIZE, keeps full res.
        maxCanvasSize: [8192, 8192],
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
    const copy = this.t('copy');
    const code = (body: string): string =>
      `<div class="qp-code" dir="ltr"><pre>${body}</pre><button class="qp-ghost qp-code-copy" type="button">${copy}</button></div>`;
    return `<div class="qp-docs" hidden><div class="qp-docs-card">
      <div class="qp-modal-head"><h2>${this.t('developers')}</h2><button class="qp-x" type="button" aria-label="${this.t('close')}">${ICONS.x}</button></div>
      <p class="qp-note">قم‌پیک (@amir83nasr/map) — نقشه انتخاب موقعیت روی MapLibre، فقط React، کاملاً متن‌باز و رایگان. نقشه همیشه VECTOR است (نه raster)؛ فارسی راست‌چین (RTL) و موبایل‌فرست.</p>
      <nav class="qp-docs-nav">
        <a href="#qp-d-install">نصب</a><a href="#qp-d-quick">شروع سریع</a><a href="#qp-d-worker">ورکر</a><a href="#qp-d-props">تنظیمات</a><a href="#qp-d-cb">کال‌بک‌ها</a><a href="#qp-d-style">ظاهر</a><a href="#qp-d-faq">خطاها</a><a href="#qp-d-prompts">پرامپت‌ها</a>
      </nav>
      <section id="qp-d-install"><h3>۱) نصب</h3>${code(`pnpm add @amir83nasr/map maplibre-gl`)}
      <p class="qp-note">نکته: maplibre-gl نسخه ۶ و react/react-dom‏ peer dependency هستند و باید جدا نصب شوند.</p></section>
      <section id="qp-d-quick"><h3>۲) شروع سریع — ۲ خط</h3>${code(`import '@amir83nasr/map/styles.css';\nimport { LocationPickerView } from '@amir83nasr/map';`)}${code(`&lt;LocationPickerView\n  style={{ height: 480 }}\n  onConfirm={(loc) =&gt; console.log(loc.lat, loc.lng, loc.address)}\n/&gt;;`)}
      <p class="qp-note">نکته: همین یک import کافی است (CSS مپ‌لایبر + فونت IRANYekanX داخلش است). بدون <code dir="ltr">height</code> نقشه خالی دیده می‌شود (پیش‌فرض <code dir="ltr">480px</code>). کامپوننت خودش init/destroy می‌کند — دستی صدا نزنید.</p>
      <p class="qp-note">نکته Next.js App Router: کامپوننت client است؛ با <code dir="ltr">dynamic(..., { ssr: false })</code> لود کنید.</p></section>
      <section id="qp-d-worker"><h3>۳) ورکر MapLibre — قبل از mount (اجباری)</h3>
      <p class="qp-note">پکیج نمی‌تواند ورکر را برای شما باندل کند. علامت خرابی: نقشه خاکستری + باکس <code dir="ltr">.qp-map-err</code> + یک <code dir="ltr">console.warn</code> + کال <code dir="ltr">onError</code>.</p>
      <p class="qp-note">Vite:</p>${code(`import { setupQomPickWorker } from '@amir83nasr/map';\nimport workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&amp;url';\nsetupQomPickWorker(workerUrl);`)}
      <p class="qp-note">Next.js/webpack: هر دو فایل <code dir="ltr">maplibre-gl-worker.mjs</code> و <code dir="ltr">maplibre-gl-shared.mjs</code> را در خروجی public کپی کنید و URL عمومی ورکر را به <code dir="ltr">setupQomPickWorker()</code> بدهید (ال‌یاس <code dir="ltr">setupMapWorker</code> یکسان است).</p></section>
      <section id="qp-d-props"><h3>۴) تنظیمات مهم</h3><ul class="qp-list">
      <li><code dir="ltr">map</code> — مرکز/زوم/محدوده (<code dir="ltr">center / zoom / minZoom / maxZoom / bounds</code>)؛ پیش‌فرض قم <code dir="ltr">34.6416,50.8764</code> زوم ۱۴. استایل سفارشی فقط برداری (<code dir="ltr">style</code>)؛ <code dir="ltr">glyphs</code> برای self-host فونت نقشه.</li>
      <li><code dir="ltr">search</code> — پیش‌فرض ۵۲ محله قم (همه نمایش، بدون سقف): <code dir="ltr">enabled / placeholder / suggestions / minLength(3) / debounceMs(350) / limit(5)</code>. آرایه سفارشی جایگزین می‌شود؛ <code dir="ltr">[]</code> غیرفعال می‌کند. <code dir="ltr">limit</code> فقط نتایج ریموت (Nominatim) است.</li>
      <li><code dir="ltr">markers</code> — پین‌ها با <code dir="ltr">name / lat / lng</code>؛ کلیک → پرواز تا <code dir="ltr">pickZoom</code> + کال <code dir="ltr">onPick</code>.</li>
      <li><code dir="ltr">controls</code> — <code dir="ltr">gps / confirmButton / searchTrigger / developers</code>.</li>
      <li><code dir="ltr">behavior</code> — <code dir="ltr">snapToRoad / resolveOnMove / resolveDelayMs(400) / settleDelayMs(250) / snapDelayMs(900) / pickZoom(15) / locateZoom(18)</code>. اسنپ فقط حرکت دستی، زوم ≥ ۱۵؛ پینچ‌زوم و حرکات کد هرگز اسنپ نمی‌شوند.</li>
      <li><code dir="ltr">i18n.labels</code> — بازنویسی متن‌ها؛ چیدمان همیشه RTL است.</li></ul>
      ${code(`&lt;LocationPickerView\n  map={{ center: { lat: 34.64, lng: 50.87 }, zoom: 15 }}\n  search={{ minLength: 3, limit: 5 }}\n  markers={[{ name: 'فروشگاه', lat: 34.63, lng: 50.87 }]}\n  controls={{ gps: true, developers: true }}\n  onConfirm={(loc) =&gt; console.log(loc)}\n/&gt;;`)}
      <p class="qp-note">تنظیمات engine فقط موقع mount اعمال می‌شوند؛ برای اعمال جدید با <code dir="ltr">key</code> ریمانت کنید — فقط کال‌بک‌ها زنده می‌مانند: <code dir="ltr">&lt;LocationPickerView key={cityId} ... /&gt;</code>.</p></section>
      <section id="qp-d-cb"><h3>۵) کال‌بک‌ها — کدام برای چه</h3><ul class="qp-list">
      <li><code dir="ltr">onConfirm</code> — دکمه تایید در مودال → <b>ذخیره نتیجه</b> (فرم/سرور).</li>
      <li><code dir="ltr">onPick</code> — کلیک پین/پیشنهاد → واکنش، نه ذخیره.</li>
      <li><code dir="ltr">onLocationChange</code> — هر حرکت مرکز (پرتکرار).</li>
      <li><code dir="ltr">onAddressResolved</code> — پایان ژئوکد معکوس.</li>
      <li><code dir="ltr">onSearchResults</code> — پایان جستجوی ریموت.</li>
      <li><code dir="ltr">onLocate</code> — موفقیت GPS. <code dir="ltr">onError</code> — هر خطا از جمله ورکر.</li></ul></section>
      <section id="qp-d-style"><h3>۶) سفارشی‌سازی ظاهر</h3><p class="qp-note">prop تم نیست؛ همه کلاس‌ها/متغیرها با <code dir="ltr">qp-</code> شروع می‌شوند و با پروژه تداخل نمی‌کنند:</p>
      ${code(`.qp { --qp-brand: #16a34a; --qp-ink: #111; --qp-radius: 16px; }`)}
      <p class="qp-note">متغیرها: <code dir="ltr">--qp-brand --qp-brand-dark --qp-bg --qp-card --qp-ink --qp-muted --qp-line --qp-radius --qp-shadow --qp-font</code>.</p></section>
      <section><h3>۷) ساختار پروژه</h3><ul class="qp-list">
      <li><code dir="ltr">package/src/index.tsx</code> — API عمومی (re-export از <code dir="ltr">react/ + core/</code>).</li>
      <li><code dir="ltr">package/src/react/</code> — کامپوننت <code dir="ltr">LocationPickerView</code> + هلپر <code dir="ltr">setupQomPickWorker</code>.</li>
      <li><code dir="ltr">package/src/engine/</code> — engine داخلی (<code dir="ltr">picker</code>، در exports عمومی نیست).</li>
      <li><code dir="ltr">package/src/core/ + style/</code> — تایپ‌ها و helperها + استایل و basemap.</li>
      <li><code dir="ltr">dist/styles.css</code> — ایمپورت: <code dir="ltr">@amir83nasr/map/styles.css</code>.</li>
      <li><code dir="ltr">package/fonts/</code> — فونت IRANYekanX‏ (woff2) و PBFهای glyph نقشه؛ داخل tarball منتشر می‌شود.</li></ul></section>
      <section id="qp-d-faq"><h3>۸) سوالات پرتکرار</h3><ul class="qp-list">
      <li>نقشه خالی/خاکستری بدون خطا؟ ارتفاع بدهید (<code dir="ltr">style={{ height: 480 }}</code>).</li>
      <li>باکس قرمز ورکر؟ بخش ۳ (ورکر) — نه چیز دیگر.</li>
      <li>لیبل فارسی نقشه نیست؟ CDN glyph مسدود است؛ <code dir="ltr">map.glyphs</code> را به کپی محلی <code dir="ltr">fonts/</code> بدهید.</li>
      <li>پراپ جدید اثر ندارد؟ mount-only است؛ <code dir="ltr">key</code> بدهید.</li>
      <li>کرش Next.js‏ (<code dir="ltr">window/document</code>)؟ <code dir="ltr">'use client' + ssr: false</code>.</li>
      <li>کدام نسخه maplibre؟ ۶ (peer). رایگان؟ بله، متن‌باز.</li></ul></section>
      <section id="qp-d-prompts"><h3>پرامپت شروع از صفر</h3><div class="qp-prompt">${DEV_PROMPT_ZERO}</div>
      <div class="qp-modal-row"><button class="qp-ghost qp-copy" type="button" data-prompt="zero">${this.t('copy')}</button></div></section>
      <section><h3>پرامپت افزودن به پروژه موجود</h3><div class="qp-prompt">${DEV_PROMPT_EXISTING}</div>
      <div class="qp-modal-row"><button class="qp-ghost qp-copy" type="button" data-prompt="existing">${this.t('copy')}</button></div></section>
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

  private copyDone(btn: HTMLButtonElement): void {
    const prev = btn.textContent ?? '';
    btn.textContent = this.t('copied');
    window.setTimeout(() => {
      btn.textContent = prev;
    }, 1500);
  }

  private copyText(text: string, btn: HTMLButtonElement): void {
    const done = (): void => this.copyDone(btn);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done, () => this.fallbackCopy(text, done));
      return;
    }
    this.fallbackCopy(text, done);
  }

  private copyPrompt(btn: HTMLButtonElement): void {
    const key = btn.dataset.prompt ?? 'zero';
    this.copyText(DEV_PROMPTS[key] ?? DEV_PROMPT_ZERO, btn);
  }

  private copyCode(btn: HTMLButtonElement): void {
    const pre = btn.closest('.qp-code')?.querySelector('pre');
    if (!pre) return;
    this.copyText(pre.textContent ?? '', btn);
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
    return this.suggestions()
      .filter(
        (x) => !needle || enDigits(x.name).includes(needle) || enDigits(x.addr).includes(needle),
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'fa'));
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
