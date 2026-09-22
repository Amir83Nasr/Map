// Locked: theme customization removed; stylesheet defaults (commit 4a36411) win.
// Kept as no-op shims so old imports don't break.
export function themeVars(): Record<string, string> {
  return {};
}

export function applyTheme(): void {}
