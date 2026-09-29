# @amir83nasr/map

MapLibre location picker as a publish-ready npm library. React-only (`@amir83nasr/map`) + Vite demo. Persian RTL, mobile-first, vector tiles.

> Agent handbook: [`docs/USAGE.md`](./docs/USAGE.md) — copy-paste install, worker setup, recipes, callbacks, troubleshooting.

## Install

```sh
pnpm add @amir83nasr/map maplibre-gl
```

`maplibre-gl` v6, `react`/`react-dom` are peer dependencies and must be installed separately.

```ts
import '@amir83nasr/map/styles.css'; // includes MapLibre CSS
import { LocationPickerView } from '@amir83nasr/map';
```

## Quick start — React / Next.js

Client-only. In Next.js App Router put it in a client component (`'use client'`) and dynamic-import with `ssr: false`.

```tsx
'use client';
import { LocationPickerView } from '@amir83nasr/map';

<LocationPickerView
  markers={[{ name: 'Venue', lat: 34.63, lng: 50.87 }]}
  onConfirm={(loc) => console.log(loc.lat, loc.lng, loc.address)}
/>;
```

41 Qom neighborhood suggestions ship as the package default — no `search.suggestions` needed. Pass your own array to replace them, or `suggestions: []` to disable.

The component calls `destroy()` in its own `useEffect` cleanup — no manual init/destroy. Give it a height (default `480px` via `style`); without one the map renders empty.

Configure MapLibre's worker before mount (bundler-specific — this package cannot auto-bundle the worker for you). Vite:

```ts
import { setupQomPickWorker } from '@amir83nasr/map';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

setupQomPickWorker(workerUrl);
```

Next.js/webpack: copy both `maplibre-gl-worker.mjs` and `maplibre-gl-shared.mjs`, then pass the public worker URL to `setupQomPickWorker()`. A missing worker now calls `onError`, writes one `console.warn`, and shows an actionable `.qp-err` over the gray map.

Public surface: one component (`LocationPickerView`), its props type (`QomPickProps`), the `setupQomPickWorker` helper (alias `setupMapWorker`), exported `QOM_SUGGESTIONS`, and exported types. The engine class stays internal. Engine options apply only on mount — remount with a `key` for new options; only callbacks stay live.

## Config reference

Props of `LocationPickerView` (`QomPickProps` = engine options minus `container`, plus `className`/`style`; callbacks are props):

| Key                                      | Type                                                                                            | Default                                | Notes                                                                                            |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `map.center/zoom/minZoom/maxZoom/bounds` | —                                                                                               | Qom`34.6416,50.8764`, z14              | —                                                                                                |
| `map.style`                              | URL\| StyleSpecification                                                                        | Snapp-like OpenFreeMap                 | vector style only (never raster)                                                                 |
| `map.glyphs`                             | string                                                                                          | jsDelivr CDN (bundled IRANYekanX PBFs) | relative paths resolve against page base; self-host by copying`fonts/`                           |
| `controls`                               | `{gps, confirmButton, searchTrigger, developers}`                                               | all true except developers             | `developers` opens the in-map developer docs                                                     |
| `search`                                 | `{enabled, placeholder, suggestions, minLength, debounceMs, limit}`                             | 41 Qom neighborhoods;`3 / 350ms / 5`   | Nominatim, Qom viewbox; custom array replaces,`[]` disables; `limit` also caps local suggestions |
| `sheet`                                  | `{enabled}`                                                                                     | true                                   | —                                                                                                |
| `behavior`                               | `{snapToRoad, resolveOnMove, resolveDelayMs, settleDelayMs, snapDelayMs, pickZoom, locateZoom}` | `400/250/900/15/18`                    | snap waits longer than settle; pinch-zoom never snaps                                            |
| `markers`                                | `Venue[]`                                                                                       | `[]` (off)                             | generic pins, demo enables Qom data                                                              |
| `i18n`                                   | `{labels}`                                                                                      | Persian (`fa`), always RTL             | full label override                                                                              |
| callbacks                                | `onLocationChange/onAddressResolved/onSearchResults/onPick/onConfirm/onLocate/onError`          | —                                      | props                                                                                            |
| `className/style`                        | —                                                                                               | height`480`                            | pass a height, otherwise the map is empty                                                        |

Types (`PickerLocation`, `Venue`, `SearchSuggestion`, `QomPickProps`, …) are re-exported from `@amir83nasr/map`.

## Appearance (CSS variables)

No theme prop — scope your own vars under `.qp`:

```css
.qp {
  --qp-brand: #16a34a;
  --qp-ink: #111;
  --qp-radius: 16px;
}
```

Vars: `--qp-brand --qp-brand-dark --qp-bg --qp-card --qp-ink --qp-muted --qp-line --qp-radius --qp-shadow --qp-font`. All UI scoped under `.qp-`.

IRANYekanX ships inside the package: `styles.css` carries the `@font-face` (woff2 inlined as a data URI), so the Persian UI font works with the same single CSS import — no font setup.

## Map style

```tsx
<LocationPickerView map={{ style: 'https://demotiles.maplibre.org/style.json' }} />
<LocationPickerView map={{ glyphs: '/fonts/{fontstack}/{range}.pbf' }} /> // self-hosted Persian glyphs
```

Default basemap is vector (OpenFreeMap + OpenMapTiles); raster styles are not supported. Default `map.glyphs` points at the IRANYekanX PBFs published with this package (jsDelivr), so Persian map labels work with zero setup; pass `map.glyphs` to self-host them.

## i18n / RTL

`i18n: { labels: { confirm: 'OK' } }` overrides any label. Persian defaults built in; layout is always RTL.

## In-map developer docs

Pass `controls={{ developers: true }}` to show a «توسعه‌دهندگان» button on the map. It opens Persian docs inside the map (`.qp-docs`): intro, install, React quick start including worker setup, key settings, appearance, project structure, two copyable prompts (new project / existing project), and FAQ (empty map, missing Persian map labels / glyphs, explicit MapLibre worker failure, maplibre v6 peer, Next.js).

## Project structure

```text
package/                 # npm package `@amir83nasr/map`
  src/index.tsx          # public re-export only
  src/react/             # LocationPickerView + setupQomPickWorker
  src/engine/            # internal picker/emitter/snap (not exported)
  src/core/              # types, defaults, i18n, format, geocode, icons
  src/style/             # map-style, colors, styles.css → dist/styles.css
  src/*/*.test.ts        # colocated vitest per folder
  fonts/                 # IRANYekanX woff2 + IRANYekanX/*.pbf glyphs (published)
demo/                    # Vite demo (vector map, port 5500); USE_DIST=1 builds vs dist
CONTRIBUTING.md SECURITY.md LICENSE.md
```

## Scripts

```sh
pnpm dev        # demo
pnpm build      # react -> demo
pnpm typecheck  # all packages
pnpm lint       # eslint
pnpm test       # react vitest
```

## Publish

```sh
cd package && pnpm build && pnpm pack --dry-run  # inspect tarball
pnpm publish --filter @amir83nasr/map --access public
```

Versioning: semver, currently `1.1.1`.

## Limitations

- Nominatim reverse/search: rate-limited, needs network; no offline geocoding.
- Snap-to-road is pixel-space on rendered roads (zoom >= 15), not routable — use OSRM/Valhalla `nearest` for true routing.
- Single Persian Regular glyph weight; no bold PBFs bundled.
- One picker per container; module-level worker URL shared across instances.
- Configure `setupQomPickWorker(workerUrl)` before mount. Vite should import `maplibre-gl-worker.mjs?worker&url`; Next.js/webpack should ship both `maplibre-gl-worker.mjs` + `maplibre-gl-shared.mjs`. Missing worker triggers `onError`, one `console.warn`, and a visible `.qp-err`. Demo build already copies both files via `demo/vite.config.ts` (`maplibre-worker-assets`).
