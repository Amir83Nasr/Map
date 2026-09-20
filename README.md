# Map

Vanilla TypeScript map location picker centered on Qom, Iran. Pan the Leaflet map under a
fixed center pin, resolve the address via Nominatim reverse geocoding, search places, use
GPS, and confirm a location.

## Tech stack

- Vanilla TypeScript (strict)
- Vite 6 (dev server, HMR, production build)
- Tailwind CSS v4 (`@tailwindcss/vite` plugin; design tokens via `@theme`, component
  styles in `src/styles/`)
- MapLibre GL JS (vector tiles) + custom Snapp-like style in `src/map/` (OpenFreeMap planet source, no API key)
- Lucide icons (tree-shaken ESM imports, only icons we use)
- pnpm, Prettier, ESLint (`typescript-eslint`)

## Requirements

- Node.js 20+
- pnpm 9+

## Installation

```sh
pnpm install
```

## Development

```sh
pnpm dev
```

Runs Vite locally with HMR (default `http://localhost:5173`).

## Production build

```sh
pnpm build
```

Output goes to `dist/` (not committed). Preview it with:

```sh
pnpm preview
```

## Formatting

```sh
pnpm format
pnpm format:check
```

## Linting

```sh
pnpm lint
```

## Type checking

```sh
pnpm typecheck
```

## Project structure

```text
index.html               # static shell; mounts /src/main.ts
src/
  main.ts                # composition root: wires map + features together
  vite-env.d.ts
  assets/fonts/          # IRANYekanX woff2 (bundled by Vite)
  components/            # icons, toast, result-row, clear-input
  constants/             # map defaults, timing, Qom suggestions
  features/              # map-view, selection, search, overlay, locate, confirm, state
  map/                   # vector style: colors.ts (palette) + style.ts (layers)
  services/              # geocode (Nominatim)
  styles/                # tokens (@theme) + sectioned CSS per concern
  types/                 # Suggestion, NominatimResult, AppState
  utils/                 # typed DOM lookup, Persian digit/address formatting
```
