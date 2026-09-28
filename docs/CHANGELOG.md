# Changelog — @amir83nasr/map

## 1.1.0 — 2026-09-28 — pro structure

- `src/` split into `react/` + `engine/` + `core/` + `style/` (slim `index.tsx` re-export); tests colocated (`src/*/*.test.ts`, 19 tests)
- Dist artifacts renamed `qompick-react.*` → `index.js` / `index.cjs` (+`index.d.cts`) / `styles.css`; exports map gets split import/require types (publint-clean)
- Fontstack folder spaceless (`fonts/IRANYekanX/`); style uses `['IRANYekanX']`
- Shared `tsconfig.base.json`, Node `>=22` (`.nvmrc` + `engines`), CI setup composite, `preview-dist` (`USE_DIST=1`) + `publint --strict` in CI
- `LICENSE.md` spelling, `CONTRIBUTING.md`, `SECURITY.md`, issue/PR templates

## 1.0.4 — 2026-09-28

- Fix double `onConfirm`/`onPick` (callbacks fired twice via emitter + raw call); fix shared `privateTimers` timer-killing, `destroy()` now clears all timers; venue buttons via DOM API (XSS-safe); `locate()` restores `maxBounds` after flight
- Remove dead props `sheet.desktopSidebar` and `EN_LABELS`; wire `search.placeholder`; cap local suggestions by `search.limit`; merge `runSearch`/`runDeskSearch`; `submitting` label; mount-only options documented (`key` to remount)
- Export `QOM_SUGGESTIONS` from root; add `setupMapWorker` alias; sync version strings to `1.0.3`
- Rename npm package `qompick-react` → `@amir83nasr/map` (imports, glyph CDN default, publish filter); dist artifact names (`dist/qompick-react.*`) unchanged

## 2026-09-23

- Export `setupQomPickWorker(workerUrl)` from `@amir83nasr/map` — explicit helper over MapLibre `setWorkerUrl` for bundler-specific worker setup (Vite `?worker&url`, Next.js/webpack copy both files). No auto-bundling; Quick start + in-map docs show the two-line call before mount
- Ship 41 Qom neighborhood suggestions as the default `search.suggestions` (single source in `defaults.ts`); demo drops its own copy and relies on the package default — custom array replaces, `[]` disables

- Explicit missing-worker diagnostics (no more silent gray map): `initMap` watches `Worker` construction during `new Map()`; a failed worker calls `onError` once, writes one `console.warn`, and shows `.qp-map-err.qp-err[role=alert]` with Vite/`setupQomPickWorker` + Next.js/webpack fix text. Ordinary tile/glyph/network errors stay on the generic `console.error` + `onError` path without the overlay. Worker one-liner also documented under README Quick start and in-map docs
- `1.0.2` — npm metadata for the GitHub link: `homepage` (Pages demo) + `bugs` (repo issues); package-level `packages/react/README.md` so the npm page shows docs (`1.0.1` added `repository.url`, required by npm provenance verification)
- Ship IRANYekanX by default in the package (demo parity): `@font-face` woff2 inlined into `dist/qompick-react.css`, and map `glyphs` default → `https://cdn.jsdelivr.net/npm/@amir83nasr/map@1/fonts/{fontstack}/{range}.pbf` (256 PBFs published via `files: dist, fonts`) — consumers get Persian UI font + map labels with zero setup; first shipped in `1.0.1`
- Demo keeps its local glyphs via `map.glyphs: 'fonts/{fontstack}/{range}.pbf'` and drops its own `@font-face` (package CSS provides it)
- Fix Pages gray map: demo Vite plugin ships `maplibre-gl-worker.mjs` + `maplibre-gl-shared.mjs` next to main JS (`import.meta.url` sibling resolution); missing worker was 404 → no tiles
- Simplify setup to one CSS import: `styles.css` `@import`s `maplibre-gl/dist/maplibre-gl.css`, so `dist/qompick-react.css` ships MapLibre + UI CSS; usage = `import '@amir83nasr/map/styles.css'` + `LocationPickerView`
- Collapse `qompick-core` into `packages/react`: engine (`picker`, `map-style`, `geocode`, `snap`, `format`, `i18n`, …) now ships inside `@amir83nasr/map`, no `workspace:*` dependency
- React-only public surface: `LocationPickerView` + `QomPickProps` (options minus `container`, plus `className`/`style`) + types; engine class not exported; no vanilla API
- `LocationPickerView` forwards all engine callbacks via stable refs; owns init/`destroy` in `useEffect`
- Package ships `dist/qompick-react.css` (`style` field, `./styles.css` export, `sideEffects: **/*.css`); `react/jsx-runtime` + `react/jsx-dev-runtime` externalized; bundled `index.d.ts` via `rollupTypes`
- Remove dead code: `theme.ts` no-op shims, unused `controls.zoom` flag; test file → `test/helpers.test.ts`
- Fix npm publish workflow (drop `qompick-core`); README / in-map `.qp-docs` / `docs/ARCHITECTURE.md` aligned with real API (no `theme`/`marker` props; correct defaults; vector-only note)
- Demo aliases `@amir83nasr/map` → `package/src` for local dev; docs live in `docs/`

## 2026-09-22

- Fix Pages map: resolve relative `fonts/{fontstack}/{range}.pbf` glyphs against `document.baseURI` with plain string join (no `new URL` brace-encoding)
- Snap-to-road on manual moves (pixel-space, zoom ≥ 15); pinch-zoom never snaps; programmatic moves never snap
- Map load performance: shorter fades, no pitch/rotate handlers, `crossSourceCollisions: false`, click tolerance 5
- New UI pass (venue popup, marker style, Persian coord format)
- Demo npm fixes; typecheck builds workspace `dist` first
- Restructure to `qompick` monorepo (`packages/react` + `demo`) for GitHub Pages (`base: './'`, `demo/dist` artifact)

## 2026-09-21

- v15.1 / v15 / v14: venue popup, marker style, coord format updates
- GitHub Actions Pages fixes
- New vector basemap (OpenFreeMap planet tiles, OpenMapTiles schema), self-hosted IRANYekanX glyph PBFs, MapLibre v6 native RTL

## Notes

- Versioning: semver, currently `1.0.4`.
