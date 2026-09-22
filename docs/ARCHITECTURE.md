# Architecture — qompick-react

React-only MapLibre location picker. Persian RTL, mobile-first, **vector tiles only** (no raster).

## Layout

- `packages/react/src/` — library source (`index.tsx` + engine + helpers + `styles.css`)
- `packages/react/test/core.test.ts` — vitest (defaults, labels, format, emitter, theme lock, style)
- `packages/react/` build — Vite lib (`es` + `cjs`), `vite-plugin-dts`, externals: `react`, `react-dom`, `maplibre-gl`
- `demo/` — Vite demo (`port 5500`, `base: './'`), aliases `qompick-react` → `packages/react/src/index.tsx` for local dev
- `demo/public/fonts/` — self-hosted IRANYekanX glyph PBFs
- `demo/src/data.ts` — `QOM_SUGGEST` / `QOM_VENUES` Qom dataset
- `docs/` — this file + changelog

## Stack

`qompick-react 1.0.0`, peer deps `react ^18 || ^19`, `react-dom`, `maplibre-gl ^6.10.0`. MapLibre v6 shapes RTL/Arabic natively, no RTL plugin.

## Basemap (vector only)

`map-style.ts` exports `MAP_STYLE` (style-spec v8, OpenMapTiles schema, Snapp-like palette from `colors.ts`):

- source: `openmaptiles`, `url: OPENFREEMAP_TILEJSON_URL` (`https://tiles.openfreemap.org/planet`), no API key
- `glyphs: fonts/{fontstack}/{range}.pbf` — relative on purpose; `picker.ts:initMap` resolves it against `document.baseURI` with plain string join (never `new URL`, which would percent-encode `{fontstack}/{range}`). Breaks under subpaths (GitHub Pages `/<repo>/`) otherwise
- `sprite: https://tiles.openfreemap.org/sprites/ofm_f384/ofm`
- labels: `coalesce(name:fa, name:nonlatin, name, name:latin)` + digit rewrite to Persian via style-spec expressions
- custom `map.style` (object or URL) overrides base; custom `map.glyphs` overrides glyph template

## Engine — `picker.ts` (`LocationPicker`)

Internal class; React adapter owns lifecycle. Owns all DOM under `.qp[dir=rtl]`:

- `.qp-map-wrap` (`.qp-map` + center `.qp-pin`, GPS button, dev button) + `.qp-sheet` (search trigger, desktop `.qp-desk`, CTA) + `.qp-overlay` (mobile search) + `.qp-geo` / `.qp-confirm` modals + `.qp-docs` + `.qp-toast`
- `mergeOptions()` in `defaults.ts` supplies defaults: center Qom `34.6416,50.8764` z14, `minZoom 11 / maxZoom 19`, Qom bounds, `search { minLength 3, debounceMs 350, limit 5 }`, `behavior { resolveDelayMs 400, settleDelayMs 250, snapDelayMs 900, pickZoom 15, locateZoom 18 }`

Map loop (`initMap`):

1. `movestart` — mark moving, kill pending settle timer, record start zoom/center
2. `move` — track center into `lat/lng` only
3. `moveend` — ignore echo of own snap (`snapTarget`); programmatic moves (`!e.originalEvent`) resolve without snap; pinch-zoom heuristic (`|Δz|>1`, moved `<10m`) settles with no snap; else wait `snapDelayMs`, `trySnapToRoad`, `easeTo` snapped point or `setLocation` as-is

Addressing: `setLocation` validates (`isValidLatLng`), emits `locationChange`, debounces `reverseGeocode` (Nominatim `accept-language=fa`, 4-decimal cache, cap 200). Abort per new request, `revSeq` guards stale replies.

Search: local `suggestions` filtered on `enDigits` name/addr, sorted `fa` locale; remote `searchLocation` (Nominatim `viewbox 50.35,35.05,51.45,34.15 + bounded=1`, cache cap 50) with debounce + abort + `searchSeq` guard. Overlay (mobile) and `.qp-desk` (desktop) share `onQueryShared` logic on separate nodes.

Venues (`markers`): star-button `Marker` + auto-closing `Popup` (4s); click flies to `pickZoom` and emits `pick`.

GPS (`locate`): insecure context opens `.qp-geo` guide directly; success clears `maxBounds` (GPS may be outside Qom bounds, otherwise `flyTo` clamps and looks dead), shows dot, flies to `locateZoom`; denied opens guide, timeout/unavailable toasts + re-resolves.

Confirm: `.qp-confirm` modal prefilled with resolved address, `lat,lng` to 6 decimals; `finishConfirm` emits `confirm` (also calls raw `onConfirm`), toasts `registered + faCoord`.

In-map docs (`controls.developers`): Persian intro/install/quick-start/settings/appearance/FAQ + two copyable LLM prompts (`DEV_PROMPT_ZERO`, `DEV_PROMPT_EXISTING`), clipboard with `execCommand` fallback.

Teardown: `destroy()` aborts fetches, clears timers, removes markers + map + root. Escape closes overlay/docs/modals topmost-first.

## React adapter — `index.tsx` (`LocationPickerView`)

`QomPickProps` = `LocationPickerOptions` minus `container` and callbacks (re-typed as props) plus `className/style`. Creates `LocationPicker` once in `useEffect` with stable callback refs, `destroy()` in cleanup. Default height `480px` via `style`; zero height renders empty map. Re-exports all types.

## Helpers

| Module        | Role                                                                                                                                                                         |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`    | `PickerLocation`, `Venue`, `SearchSuggestion`, `NominatimResult`, option slices, `PickerEvent`                                                                               |
| `defaults.ts` | `mergeOptions` (arrays replace, objects merge), `resolveLabels`, `resolveDir` (always `rtl`)                                                                                 |
| `geocode.ts`  | Nominatim reverse/search + bounded in-memory caches                                                                                                                          |
| `snap.ts`     | `trySnapToRoad`: pixel-space nearest road segment within 64px on `ROAD_LAYERS`, zoom ≥ 15, skips ≤ 2px (on-road). Not routable — OSRM/Valhalla `nearest` is the upgrade path |
| `format.ts`   | `faStr`, `faCoord`, `enDigits`, `shortAddr` (drops Iran/ostan/shahrestan/bakhsh/pure-number parts, keeps 4, reversed), `isValidLatLng`                                       |
| `i18n.ts`     | `FA_LABELS` (only locale); `EN_LABELS` aliases fa                                                                                                                            |
| `emitter.ts`  | tiny typed pub/sub; listener errors swallowed                                                                                                                                |
| `icons.ts`    | inline lucide-path SVGs (locate/pin/search/star/trophy/x), no icon dep                                                                                                       |
| `colors.ts`   | basemap palette single source of truth                                                                                                                                       |
| `theme.ts`    | locked no-ops (`themeVars` → `{}`, `applyTheme` → void); stylesheet defaults win                                                                                             |

## Styling

`styles.css` (~760 lines), all UI scoped under `.qp`, tokens `--qp-brand --qp-brand-dark --qp-bg --qp-card --qp-ink --qp-muted --qp-line --qp-radius --qp-shadow --qp-font`. `theme`/`marker` props documented in README are not implemented — contributors: either implement or fix README before release.

## Verification

`pnpm typecheck` (react build → react `tsc --noEmit` → demo `tsc --noEmit`), `pnpm lint`, `pnpm format:check`, `pnpm test` (react vitest), `pnpm build` (react → demo). CI (`.github/workflows`) runs all five, deploys `demo/dist` to Pages.
