# qompick-react

MapLibre location picker as a publish-ready npm library. React-only (`qompick-react`) + Vite demo. Persian RTL, mobile-first, vector tiles.

## Install

```sh
pnpm add qompick-react maplibre-gl
```

`maplibre-gl` v6, `react`/`react-dom` are peer dependencies and must be installed separately.

```ts
import 'maplibre-gl/dist/maplibre-gl.css';
import 'qompick-react/styles.css';
```

## Quick start — React / Next.js

Client-only. In Next.js App Router put it in a client component (`'use client'`) and dynamic-import with `ssr: false`.

```tsx
'use client';
import { LocationPickerView } from 'qompick-react';

<LocationPickerView
  search={{ suggestions: [{ name: '...', addr: '...', lat: 34.64, lng: 50.87 }] }}
  markers={[{ name: 'Venue', lat: 34.63, lng: 50.87 }]}
  theme={{ brand: '#16a34a' }}
  onConfirm={(loc) => console.log(loc.lat, loc.lng, loc.address)}
/>;
```

The component calls `destroy()` in its own `useEffect` cleanup — no manual teardown needed. Give it a height (default `480px` via `style`); without one the map renders empty.

## Config reference

Props of `LocationPickerView` (callbacks are props; the underlying engine is internal):

| Key                                      | Type                                                                                            | Default                      | Notes                                                 |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------- |
| `map.center/zoom/minZoom/maxZoom/bounds` | —                                                                                               | Qom `34.6416,50.8764`, z14   | —                                                     |
| `map.style`                              | URL \| StyleSpecification                                                                       | Snapp-like OpenFreeMap style | custom basemap                                        |
| `map.glyphs`                             | string                                                                                          | OpenFreeMap fonts            | self-host Persian PBFs to override                    |
| `marker`                                 | `{type, element, className, color, size}`                                                       | `default`                    | `none` hides pin, `html` mounts custom el             |
| `controls`                               | `{gps, confirmButton, searchTrigger, developers}`                                               | all true except developers   | `developers` opens the in-map developer docs          |
| `search`                                 | `{enabled, suggestions, minLength, debounceMs, limit}`                                          | `3 / 600ms / 5`              | Nominatim, Qom viewbox                                |
| `sheet`                                  | `{enabled, desktopSidebar}`                                                                     | true                         | —                                                     |
| `behavior`                               | `{snapToRoad, resolveOnMove, resolveDelayMs, settleDelayMs, snapDelayMs, pickZoom, locateZoom}` | `600/350/900/15/18`          | snap waits longer than settle; pinch-zoom never snaps |
| `markers`                                | `Venue[]`                                                                                       | `[]` (off)                   | generic pins, demo enables Qom data                   |
| `i18n`                                   | `{dir, locale, labels}`                                                                         | `rtl/fa`                     | full label override                                   |
| callbacks                                | `onLocationChange/onAddressResolved/onSearchResults/onPick/onConfirm/onLocate/onError`          | —                            | props                                                 |
| `className/style`                        | —                                                                                               | height `480`                 | pass a height, otherwise the map is empty             |

Props also accept `theme` (`{ brand, ink, fontFamily }` → `--qp-*` CSS vars).

Types (`PickerLocation`, `LocationPickerOptions`, `Venue`, …) are re-exported from `qompick-react`.

## Theme

```tsx
<LocationPickerView theme={{ brand: '#16a34a', ink: '#111' }} />
```

Vars: `--qp-brand --qp-brand-dark --qp-bg --qp-card --qp-ink --qp-muted --qp-line --qp-radius --qp-shadow --qp-font`. All UI scoped under `.qp-`.

## Marker

```tsx
marker={{ type: 'default', color: '#e11d48', size: 40 }} // recolor/resize
marker={{ type: 'none' }}                                // hide pin
marker={{ type: 'html', element: myEl }}                 // fully custom
```

## Map style

```tsx
<LocationPickerView map={{ style: 'https://demotiles.maplibre.org/style.json' }} />
<LocationPickerView map={{ glyphs: '/fonts/{fontstack}/{range}.pbf' }} /> // self-hosted Persian glyphs
```

## i18n / RTL

`i18n: { locale: 'en', dir: 'ltr', labels: { confirm: 'OK' } }`. Persian defaults built in; `dir: 'auto'` follows the fa default (rtl).

## In-map developer docs

Pass `controls={{ developers: true }}` to show a «توسعه‌دهندگان» button on the map. It opens Persian docs inside the map: intro, install, React quick start, key settings, appearance, two copyable prompts (new project / existing project), and FAQ.

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
cd packages/react && pnpm build && pnpm pack --dry-run  # inspect tarball
pnpm publish --filter qompick-react --access public
```

Versioning: semver, `1.0.0`.

## Limitations

- Nominatim reverse/search: rate-limited, needs network; no offline geocoding.
- Snap-to-road is pixel-space on rendered roads (zoom >= 15), not routable — use OSRM/Valhalla `nearest` for true routing.
- Single Persian Regular glyph weight; no bold PBFs bundled.
- One picker per container; module-level worker URL shared across instances.
