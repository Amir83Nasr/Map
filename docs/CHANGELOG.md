# Changelog — qompick-react

## Unreleased

- Collapse `qompick-core` into `packages/react`: engine (`picker`, `map-style`, `geocode`, `snap`, `format`, `i18n`, …) now ships inside `qompick-react`, no `workspace:*` dependency
- `LocationPickerView` forwards all engine callbacks (`onAddressResolved`, `onSearchResults`, `onPick`, `onLocate`) via stable refs; bundles `styles.css` import
- Package ships `dist/qompick-react.css` (`style` field, `./styles.css` export, `sideEffects: *.css`); tests move to `packages/react/test` (`vitest`)
- README rewritten React-only (quick start, props table, dev-docs section); demo aliases `qompick-react` → `packages/react/src` for local dev

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

- Known doc/code gap: README documents `theme` and `marker` props that are not implemented (theme locked to no-ops, pin always default). Either implement or correct README before publish.
- Versioning: semver, currently `1.0.0`.
