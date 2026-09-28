# USAGE — @amir83nasr/map (agent handbook)

Copy-paste manual for any agent asked to use this package.
Package: `@amir83nasr/map@1.1.0` — React location picker on MapLibre.
Persian RTL, mobile-first, vector tiles only. No CLI, no vanilla JS entry.

## 1. What this is / is not

- IS: one React component (`LocationPickerView`) + one CSS import.
- IS NOT: a CLI tool (no `bin`, no terminal command), a vanilla JS lib
  (engine `LocationPicker` stays internal), a raster map (vector only),
  an offline geocoder (Nominatim needs network).

## 2. Install

```sh
pnpm add @amir83nasr/map maplibre-gl
# npm i @amir83nasr/map maplibre-gl
# yarn add @amir83nasr/map maplibre-gl
```

Peers (must exist in host project): `maplibre-gl@^6.10.0`,
`react@^18 || ^19`, `react-dom`. Package ships only `dist/` + `fonts/`.

## 3. Minimal setup (2 lines + worker)

```tsx
import '@amir83nasr/map/styles.css'; // MapLibre CSS + IRANYekanX font, single import
import { LocationPickerView } from '@amir83nasr/map';

<LocationPickerView
  style={{ height: 480 }}
  onConfirm={(loc) => console.log(loc.lat, loc.lng, loc.address)}
/>;
```

Rules: component is client-only. Give it a height (default `480px`;
zero height = empty map). It inits and destroys itself in `useEffect` —
never call init/destroy manually.

### 3a. Worker setup (mandatory, before mount)

Package cannot bundle the worker for you. Pick by bundler:

Vite:

```ts
import { setupQomPickWorker } from '@amir83nasr/map';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

setupQomPickWorker(workerUrl);
```

Next.js App Router: client component (`'use client'`) +
`dynamic(..., { ssr: false })`; copy both
`maplibre-gl-worker.mjs` and `maplibre-gl-shared.mjs` to public output,
then pass the public worker URL to `setupQomPickWorker()`
(alias `setupMapWorker` is identical).

Missing worker symptom: gray map + `.qp-map-err` overlay + one
`console.warn` + `onError`. Fix = worker setup above, nothing else.

## 4. Public surface

| Export                                                        | Kind            | Notes                                                          |
| ------------------------------------------------------------- | --------------- | -------------------------------------------------------------- |
| `LocationPickerView`                                          | component       | only UI entry                                                  |
| `QomPickProps`                                                | type            | props = engine options minus `container` + `className`/`style` |
| `setupQomPickWorker` / `setupMapWorker`                       | function        | identical aliases                                              |
| `QOM_SUGGESTIONS`                                             | data (41 items) | default Qom neighborhoods; filter/extend it                    |
| `PickerLocation` `Venue` `SearchSuggestion` `NominatimResult` | types           | data shapes                                                    |

```ts
interface PickerLocation {
  lat: number;
  lng: number;
  address: string;
}
interface Venue {
  name: string;
  lat: number;
  lng: number;
}
interface SearchSuggestion {
  name: string;
  addr: string;
  lat: number;
  lng: number;
}
```

## 5. Recipes (copy-paste)

Form integration (take confirmed result):

```tsx
const [loc, setLoc] = useState<PickerLocation | null>(null);
<LocationPickerView onConfirm={setLoc} />;
// loc = { lat, lng, address } — send lat/lng to server, show address to user
```

Custom city suggestions (replace Qom defaults):

```tsx
<LocationPickerView
  search={{ suggestions: [{ name: 'Tehran', addr: 'Tehran, Iran', lat: 35.7, lng: 51.4 }] }}
/>
// suggestions: [] disables local suggestions entirely
```

Extend defaults instead of replacing:

```tsx
import { QOM_SUGGESTIONS } from '@amir83nasr/map';
search={{ suggestions: [...QOM_SUGGESTIONS, { name: 'X', addr: 'Y', lat: 34.6, lng: 50.8 }] }}
```

Venue pins:

```tsx
<LocationPickerView markers={[{ name: 'Shop', lat: 34.63, lng: 50.87 }]} />
// click pin -> flies to pickZoom, emits onPick
```

Apply new options later (options are mount-only):

```tsx
<LocationPickerView key={cityId} map={{ center: { lat, lng }, zoom: 15 }} />
// without key change, new map/search/markers props are silently ignored;
// only callbacks stay live
```

Theming (no theme prop — CSS vars only):

```css
.qp {
  --qp-brand: #16a34a;
  --qp-ink: #111;
  --qp-radius: 16px;
}
```

Relabel UI:

```tsx
<LocationPickerView i18n={{ labels: { confirm: 'OK' } }} />
// Persian defaults built in; layout always RTL
```

In-map developer docs (for humans exploring on the map):

```tsx
<LocationPickerView controls={{ developers: true }} />
```

## 6. Callbacks — which one to use

| Callback            | Fires when                     | Use for                               |
| ------------------- | ------------------------------ | ------------------------------------- |
| `onConfirm`         | user presses confirm in modal  | **saving the result** (forms, server) |
| `onPick`            | venue pin / suggestion clicked | reacting to a pick, not saving        |
| `onLocationChange`  | every center move              | live tracking (chatty)                |
| `onAddressResolved` | reverse-geocode completes      | showing resolved address              |
| `onSearchResults`   | remote search completes        | custom result UI                      |
| `onLocate`          | GPS success                    | GPS feedback                          |
| `onError`           | any failure incl. worker       | error UI/logging                      |

Each fires exactly once per event (deduped since 1.0.3 work).

## 7. Defaults that surprise agents

- Center Qom `34.6416,50.8764` z14, bounds clamped to Qom region;
  GPS flight temporarily lifts bounds then restores them.
- `search`: 41 Qom suggestions default; `minLength 3`, `debounceMs 350`,
  `limit 5` (also caps local suggestions).
- `behavior`: snap-to-road on manual moves only (zoom >= 15);
  pinch-zoom and programmatic moves never snap.
- Geocoding = Nominatim, rate-limited, Fa locale, in-memory cache.
  No offline mode.
- One picker per container; worker URL is module-global.
- Placeholder: `search.placeholder` overrides label; unset = Persian default.
- Sheet/controls flags just hide UI pieces; `sheet` has only `enabled`.

## 8. Troubleshooting

| Symptom                             | Cause                   | Fix                                                                            |
| ----------------------------------- | ----------------------- | ------------------------------------------------------------------------------ |
| Empty/gray map, no error overlay    | zero height             | set `style={{ height: 480 }}`                                                  |
| Gray map + `.qp-map-err`            | worker not configured   | section 3a                                                                     |
| No Persian map labels               | glyph CDN blocked       | `map={{ glyphs: '/fonts/{fontstack}/{range}.pbf' }}` + copy `fonts/` to public |
| New props ignored                   | mount-only options      | add `key` to remount                                                           |
| Next.js crash (`window`/`document`) | SSR                     | `'use client'` + `ssr: false`                                                  |
| Search slow/empty                   | Nominatim limit/network | debounce default ok; check network                                             |

## 9. Agent do / do-not

DO: single CSS import, worker before mount, explicit height,
`onConfirm` for saving, `key` for option changes.
DO NOT: import `LocationPicker` internals (not exported), add a second
CSS import for MapLibre, invent `theme`/`marker` props, use raster styles,
wrap in SSR without dynamic import.

## 10. Verify your integration

1. `pnpm add` both packages, no version conflicts on React 18/19.
2. Map renders with Persian labels, pin centered.
3. Move map -> address resolves; search -> local + remote results.
4. Confirm -> `onConfirm` payload has 6-decimal lat/lng + address.
5. Break worker URL deliberately -> `.qp-map-err` + `onError` appear.
