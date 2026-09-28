# Contributing

1. `pnpm install` (Node >= 22, pnpm >= 12 — see `.nvmrc`).
2. Dev: `pnpm dev` (demo on `:5500`, aliases `package/src`). Publish check: `USE_DIST=1` demo build.
3. Before push: `pnpm typecheck && pnpm lint --max-warnings 0 && pnpm format:check && pnpm test && pnpm build` (pre-push hook runs this).
4. Keep `src/react` (React only), `src/engine` (map logic), `src/style` (basemap+CSS), `src/core` (types/utils) separated — no cross-layer imports backwards.
5. Vector tiles only — never raster. Demo changes must be mirrored into the package.
6. After package API/usage/structure changes, update in the same turn: in-map docs (`controls.developers` → `.qp-docs`), `docs/ARCHITECTURE.md`, developers section of `README.md`.
