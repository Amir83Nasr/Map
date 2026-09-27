# Architecture — @amir83nasr/map

React-only MapLibre location picker. Persian RTL, mobile-first, **vector tiles only** (no raster).

## Layout

- `package/src/` — library source: `index.tsx` (public React API) + internal engine + helpers + `styles.css`
- `package/fonts/` — IRANYekanX woff2 + map glyph PBFs (`IRANYekanX Regular/*.pbf`), published in the npm tarball (`files: dist, fonts`)
- `package/test/helpers.test.ts` — vitest (defaults, labels, format, emitter, style, worker-error classification)
- `package/` build — Vite lib (`es` + `cjs`), `vite-plugin-dts` (bundled `index.d.ts`), externals: `react`, `react/jsx-runtime`, `react/jsx-dev-runtime`, `react-dom`, `maplibre-gl`
- `demo/` — Vite demo (`port 5500`, `base: './'`), aliases `@amir83nasr/map` → `package/src/index.tsx` for local dev; passes `map.glyphs: 'fonts/{fontstack}/{range}.pbf'` so it keeps using its local `demo/public/fonts/` PBFs (default in the package is the jsDelivr CDN); `maplibre-worker-assets` plugin copies `maplibre-gl-worker.mjs` + `maplibre-gl-shared.mjs` into `dist/` and `dist/assets/` next to the main chunk (MapLibre resolves the worker via `import.meta.url` sibling)
- `demo/public/fonts/` — local IRANYekanX glyph PBFs for the demo (UI woff2 now comes from the package `@font-face`)
- `demo/src/data.ts` — `QOM_VENUES` venue markers only; suggested places are the package default (`package/src/defaults.ts`), no prop needed
- `docs/` — this file + changelog + `USAGE.md` (agent handbook) + `USAGE.md` (agent handbook)

Public package surface (exports map): `.` → `LocationPickerView` + `setupQomPickWorker` (+ `setupMapWorker` alias) + `QOM_SUGGESTIONS` + types; `./styles.css` → `dist/qompick-react.css`. No vanilla/non-React entry; `picker.ts` stays internal.

## Stack

`@amir83nasr/map 1.0.4`, peer deps `react ^18 || ^19`, `react-dom`, `maplibre-gl ^6.10.0`. MapLibre v6 shapes RTL/Arabic natively, no RTL plugin.

## Basemap (vector only)

`map-style.ts` exports `MAP_STYLE` (style-spec v8, OpenMapTiles schema, Snapp-like palette from `colors.ts`):

- source: `openmaptiles`, `url: OPENFREEMAP_TILEJSON_URL` (`https://tiles.openfreemap.org/planet`), no API key
- `glyphs: https://cdn.jsdelivr.net/npm/@amir83nasr/map@1/fonts/{fontstack}/{range}.pbf` — absolute CDN URL of the IRANYekanX PBFs shipped in this package, so consumers get Persian labels with zero setup; a relative template is still supported and `picker.ts:initMap` resolves it against `document.baseURI` with plain string join (never `new URL`, which would percent-encode `{fontstack}/{range}`) — the demo passes `fonts/{fontstack}/{range}.pbf` for its local copy under subpaths (GitHub Pages `/<repo>/`)
- `sprite: https://tiles.openfreemap.org/sprites/ofm_f384/ofm`
- labels: `coalesce(name:fa, name:nonlatin, name, name:latin)` + digit rewrite to Persian via style-spec expressions
- custom `map.style` (object or URL) overrides base; custom `map.glyphs` overrides glyph template

## Engine — `picker.ts` (`LocationPicker`)

Internal class; React adapter owns lifecycle. Owns all DOM under `.qp[dir=rtl]`:

- `.qp-map-wrap` (`.qp-map` + center `.qp-pin`, GPS button, dev button) + `.qp-sheet` (search trigger, desktop `.qp-desk`, CTA) + `.qp-overlay` (mobile search) + `.qp-geo` / `.qp-confirm` modals + `.qp-docs` + `.qp-toast`
- `mergeOptions()` in `defaults.ts` supplies defaults: center Qom `34.6416,50.8764` z14, `minZoom 11 / maxZoom 19`, Qom bounds, `search { suggestions: 41 Qom neighborhoods (defined in defaults.ts, demo relies on them), minLength 3, debounceMs 350, limit 5 }`, `behavior { resolveDelayMs 400, settleDelayMs 250, snapDelayMs 900, pickZoom 15, locateZoom 18 }`; custom `search.suggestions` replaces the default, `[]` disables it

Map loop (`initMap`):

1. `movestart` — mark moving, kill pending settle timer, record start zoom/center
2. `move` — track center into `lat/lng` only
3. `moveend` — ignore echo of own snap (`snapTarget`); programmatic moves (`!e.originalEvent`) resolve without snap; pinch-zoom heuristic (`|Δz|>1`, moved `<10m`) settles with no snap; else wait `snapDelayMs`, `trySnapToRoad`, `easeTo` snapped point or `setLocation` as-is

Worker startup failure cannot be seen from map events: MapLibre `Actor` listens only to Worker `message` (never `error`), a 404'd script still lets `map.load`/`idle` fire, and the failure `Event` carries no message/filename to classify. Primary detection therefore subclasses `globalThis.Worker` only around `new MlMap()` (the pool is built synchronously there), attaches an `error` listener, and restores the global in `finally`. Shared `sharedWorkerBroken` lets a second picker reusing an already-broken pool still report; a fresh pool build clears the stale verdict. On failure, `showWorkerError()` dedupes per picker: one `console.warn`, one `fail()` → `onError(Error)` with actionable `setupQomPickWorker` text, and `.qp-map-err.qp-err[role=alert]` over the gray map. Secondary path: `map.on('error')` still runs `isMapLibreWorkerError` for worker/shared URL text and reuses the same UI; other MapLibre errors take `console.error` + generic `fail()` with no worker overlay (a listener suppresses MapLibre's default `console.error`, so the generic path logs explicitly).

Addressing: `setLocation` validates (`isValidLatLng`), emits `locationChange`, debounces `reverseGeocode` (Nominatim `accept-language=fa`, 4-decimal cache, cap 200). Abort per new request, `revSeq` guards stale replies.

Search: local `suggestions` filtered on `enDigits` name/addr, sorted `fa` locale; remote `searchLocation` (Nominatim `viewbox 50.35,35.05,51.45,34.15 + bounded=1`, cache cap 50) with debounce + abort + `searchSeq` guard. Overlay (mobile) and `.qp-desk` (desktop) share `onQueryShared` + single `runRemoteSearch` on separate nodes; local suggestions capped by `search.limit`.

Venues (`markers`): star-button `Marker` + auto-closing `Popup` (4s); click flies to `pickZoom` and emits `pick`.

GPS (`locate`): insecure context opens `.qp-geo` guide directly; success temporarily clears `maxBounds` for the flight then restores it (GPS may be outside Qom bounds, otherwise `flyTo` clamps and looks dead), shows dot, flies to `locateZoom`; denied opens guide, timeout/unavailable toasts + re-resolves.

Confirm: `.qp-confirm` modal prefilled with resolved address, `lat,lng` to 6 decimals; `finishConfirm` emits `confirm` exactly once (deduped; no double `onConfirm`), toasts `registered + faCoord` (label `submitting` during the fake delay).

In-map docs (`controls.developers` → `.qp-docs`): Persian intro/install/quick-start (including the worker one-liner)/settings/appearance/structure/FAQ + two copyable LLM prompts (`DEV_PROMPT_ZERO`, `DEV_PROMPT_EXISTING`), clipboard with `execCommand` fallback.

Teardown: `destroy()` aborts fetches, clears all timers (resolve/search/toast/settle/confirm/venue), removes markers + map + root. Timers are per-concern fields (no shared `privateTimers`); venue buttons built via DOM API (no raw-HTML injection). Escape closes overlay/docs/modals topmost-first.

## React adapter — `index.tsx` (`LocationPickerView` + `setupQomPickWorker`/`setupMapWorker`)

`QomPickProps` = `LocationPickerOptions` minus `container`, plus `className/style` (callbacks already come from `PickerCallbacks`). Creates `LocationPicker` once on mount with stable callback refs, `destroy()` in cleanup. Engine options apply only on mount — remount with a `key` for new options; only callbacks stay live. Default height `480px` via `style`; zero height renders empty map. Also exports `setupQomPickWorker(workerUrl)` — thin wrapper over MapLibre `setWorkerUrl` for the bundler-specific worker URL (no auto-bundling). Re-exports all types; does not export the engine.

## Helpers

| Module        | Role                                                                                                                                                                        |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`    | `PickerLocation`, `Venue`, `SearchSuggestion`, `NominatimResult`, option slices, `PickerEvent`                                                                              |
| `defaults.ts` | `mergeOptions` (arrays replace, objects merge), `resolveLabels`, `resolveDir` (always `rtl`)                                                                                |
| `geocode.ts`  | Nominatim reverse/search + bounded in-memory caches                                                                                                                         |
| `snap.ts`     | `trySnapToRoad`: pixel-space nearest road segment within 64px on `ROAD_LAYERS`, zoom ≥ 15, skips ≤2px (on-road). Not routable — OSRM/Valhalla `nearest` is the upgrade path |
| `format.ts`   | `faStr`, `faCoord`, `enDigits`, `shortAddr` (drops Iran/ostan/shahrestan/bakhsh/pure-number parts, keeps 4, reversed), `isValidLatLng`                                      |
| `i18n.ts`     | `FA_LABELS` (only locale; Persian RTL always)                                                                                                                               |
| `emitter.ts`  | tiny typed pub/sub; listener errors swallowed                                                                                                                               |
| `icons.ts`    | inline lucide-path SVGs (locate/pin/search/star/trophy/x), no icon dep                                                                                                      |
| `colors.ts`   | basemap palette single source of truth                                                                                                                                      |

## Styling

`styles.css` (~770 lines), first line `@import 'maplibre-gl/dist/maplibre-gl.css'` so `dist/qompick-react.css` ships MapLibre + UI CSS together — consumers need a single `import '@amir83nasr/map/styles.css'` (no separate MapLibre CSS import). It also carries `@font-face` for IRANYekanX (the woff2 from `package/fonts/` is inlined as a data URI via `assetsInlineLimit`), so the default `--qp-font` renders without any font setup. All UI scoped under `.qp`, tokens `--qp-brand --qp-brand-dark --qp-bg --qp-card --qp-ink --qp-muted --qp-line --qp-radius --qp-shadow --qp-font`. No `theme`/`marker` props — appearance is CSS variables only (README matches). `.qp-err` is the search empty/status line; `.qp-map-err` is the full map overlay used only for the missing-worker failure.

## Verification

`pnpm typecheck` (package build → package `tsc --noEmit` → demo `tsc --noEmit`), `pnpm lint`, `pnpm format:check`, `pnpm test` (vitest), `pnpm build` (package → demo). CI (`.github/workflows`) runs all five, deploys `demo/dist` to Pages; `npm.yml` publishes only `@amir83nasr/map`.
