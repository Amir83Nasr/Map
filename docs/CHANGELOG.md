# Changelog — qompick-react

## 2026-09-23

- Ship IRANYekanX by default in the package (demo parity): `@font-face` woff2 inlined into `dist/qompick-react.css`, and map `glyphs` default → `https://cdn.jsdelivr.net/npm/qompick-react@1/fonts/{fontstack}/{range}.pbf` (256 PBFs published via `files: dist, fonts`) — consumers get Persian UI font + map labels with zero setup; version `1.0.1`
- Demo keeps its local glyphs via `map.glyphs: 'fonts/{fontstack}/{range}.pbf'` and drops its own `@font-face` (package CSS provides it)
- Fix Pages gray map: demo Vite plugin ships `maplibre-gl-worker.mjs` + `maplibre-gl-shared.mjs` next to main JS (`import.meta.url` sibling resolution); missing worker was 404 → no tiles
- Simplify setup to one CSS import: `styles.css` `@import`s `maplibre-gl/dist/maplibre-gl.css`, so `dist/qompick-react.css` ships MapLibre + UI CSS; usage = `import 'qompick-react/styles.css'` + `LocationPickerView`
- Collapse `qompick-core` into `packages/react`: engine (`picker`, `map-style`, `geocode`, `snap`, `format`, `i18n`, …) now ships inside `qompick-react`, no `workspace:*` dependency
- React-only public surface: `LocationPickerView` + `QomPickProps` (options minus `container`, plus `className`/`style`) + types; engine class not exported; no vanilla API
- `LocationPickerView` forwards all engine callbacks via stable refs; owns init/`destroy` in `useEffect`
- Package ships `dist/qompick-react.css` (`style` field, `./styles.css` export, `sideEffects: **/*.css`); `react/jsx-runtime` + `react/jsx-dev-runtime` externalized; bundled `index.d.ts` via `rollupTypes`
- Remove dead code: `theme.ts` no-op shims, unused `controls.zoom` flag; test file → `test/helpers.test.ts`
- Fix npm publish workflow (drop `qompick-core`); README / in-map `.qp-docs` / `docs/ARCHITECTURE.md` aligned with real API (no `theme`/`marker` props; correct defaults; vector-only note)
- Demo aliases `qompick-react` → `packages/react/src` for local dev; docs live in `docs/`

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

- Versioning: semver, currently `1.0.1`.
