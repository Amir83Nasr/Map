# qompick

MapLibre location picker as a publish-ready npm library. Vanilla TS core (`qompick-core`) + thin React adapter (`qompick-react`) + Vite demo.

## Install

```sh
pnpm add qompick-core maplibre-gl
pnpm add qompick-react  # React only (peer: react, react-dom)
```

```ts
import 'maplibre-gl/dist/maplibre-gl.css';
import 'qompick-core/styles.css';
```

## Quick start — vanilla

```ts
import { LocationPicker } from 'qompick-core';
import 'qompick-core/styles.css';

const picker = new LocationPicker({
  container: '#map',
  search: { suggestions: [{ name: '...', addr: '...', lat: 34.64, lng: 50.87 }] },
  markers: [{ name: 'Venue', lat: 34.63, lng: 50.87 }],
  onConfirm: (loc) => console.log(loc.lat, loc.lng, loc.address),
});
picker.on('addressResolved', (loc) => console.log(loc));
picker.locate();
picker.destroy();
```

## React / Next.js

Client-only. In Next.js App Router put it in a client component (`'use client'`) and dynamic-import with `ssr: false`.

```tsx
'use client';
import { LocationPickerView } from 'qompick-react';

<LocationPickerView
  search={{ suggestions: [] }}
  theme={{ brand: '#16a34a' }}
  onConfirm={(loc) => console.log(loc)}
/>;
```

## Config reference

| Key                                      | Type                                                                                   | Default                      | Notes                                     |
| ---------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------- | ----------------------------------------- |
| `container`                              | `HTMLElement \| string`                                                                | required                     | mount node                                |
| `map.style`                              | URL \| StyleSpecification                                                              | Snapp-like OpenFreeMap style | custom basemap                            |
| `map.center/zoom/minZoom/maxZoom/bounds` | —                                                                                      | Qom `34.6416,50.8764`, z14   | —                                         |
| `map.glyphs`                             | string                                                                                 | OpenFreeMap fonts            | self-host Persian PBFs to override        |
| `marker`                                 | `{type, element, className, color, size}`                                              | `default`                    | `none` hides pin, `html` mounts custom el |
| `controls`                               | `{gps, confirmButton, searchTrigger}`                                                  | all true                     | —                                         |
| `search`                                 | `{enabled, suggestions, minLength, debounceMs, limit}`                                 | `3 / 600ms / 5`              | Nominatim, Qom viewbox                    |
| `sheet`                                  | `{enabled, desktopSidebar}`                                                            | true                         | —                                         |
| `behavior`                               | `{snapToRoad, resolveOnMove, resolveDelayMs, settleDelayMs, pickZoom, locateZoom}`     | `600/350/14/18`              | —                                         |
| `markers`                                | `Venue[]`                                                                              | `[]` (off)                   | generic pins, demo enables Qom data       |
| `i18n`                                   | `{dir, locale, labels}`                                                                | `rtl/fa`                     | full label override                       |
| callbacks                                | `onLocationChange/onAddressResolved/onSearchResults/onPick/onConfirm/onLocate/onError` | —                            | props or `on()/off()` events              |

Methods: `setLocation(lat, lng, {moveMap, resolve, zoom})`, `getLocation()`, `locate()`, `confirm(customAddress?)`, `destroy()`, `on/off` (`ready | locationChange | addressResolved | searchResults | pick | confirm | locate | error`).

## Theme

```ts
new LocationPicker({
  container,
  theme: { brand: '#16a34a', ink: '#111', fontFamily: "'IRANYekanX', Tahoma" },
});
```

Vars: `--qp-brand --qp-brand-dark --qp-bg --qp-card --qp-ink --qp-muted --qp-line --qp-radius --qp-shadow --qp-font`. All UI scoped under `.qp-`.

## Marker

```ts
marker: { type: 'default', color: '#e11d48', size: 40 } // recolor/resize
marker: { type: 'none' }                                // hide pin
marker: { type: 'html', element: myEl }                 // fully custom
```

## Map style

```ts
map: {
  style: 'https://demotiles.maplibre.org/style.json';
}
map: {
  glyphs: '/fonts/{fontstack}/{range}.pbf';
} // self-hosted Persian glyphs
```

## i18n / RTL

`i18n: { locale: 'en', dir: 'ltr', labels: { confirm: 'OK' } }`. Persian defaults built in; `dir: 'auto'` follows the fa default (rtl).

## Scripts

```sh
pnpm dev        # demo
pnpm build      # core -> react -> demo
pnpm typecheck  # all packages
pnpm lint       # eslint
pnpm test       # core vitest
```

## Publish

```sh
cd packages/core && pnpm build && pnpm pack --dry-run  # inspect tarball
pnpm publish --filter qompick-core --access public
pnpm publish --filter qompick-react --access public
```

Versioning: semver, `1.0.0`. Bump both packages together while the adapter tracks core API.

## Limitations

- Nominatim reverse/search: rate-limited, needs network; no offline geocoding.
- Snap-to-road is pixel-space on rendered roads (zoom >= 15), not routable — use OSRM/Valhalla `nearest` for true routing.
- Single Persian Regular glyph weight; no bold PBFs bundled.
- One picker per container; module-level worker URL shared across instances.
