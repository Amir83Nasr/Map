import type { ThemeOption } from './types.js';

// Map theme options to --qp-* vars; unset keys fall back to stylesheet defaults.
export function themeVars(t: ThemeOption = {}): Record<string, string> {
  const out: Record<string, string> = {};
  if (t.brand) out['--qp-brand'] = t.brand;
  if (t.brandDark) out['--qp-brand-dark'] = t.brandDark;
  if (t.bg) out['--qp-bg'] = t.bg;
  if (t.card) out['--qp-card'] = t.card;
  if (t.ink) out['--qp-ink'] = t.ink;
  if (t.muted) out['--qp-muted'] = t.muted;
  if (t.line) out['--qp-line'] = t.line;
  if (t.radius != null) out['--qp-radius'] = `${t.radius}px`;
  if (t.shadow) out['--qp-shadow'] = t.shadow;
  if (t.fontFamily) out['--qp-font'] = t.fontFamily;
  return out;
}

export function applyTheme(root: HTMLElement, t: ThemeOption = {}): void {
  for (const [k, v] of Object.entries(themeVars(t))) root.style.setProperty(k, v);
}
