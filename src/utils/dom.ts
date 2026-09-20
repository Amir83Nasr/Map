// ── TYPED DOM LOOKUP ────────────────────────────────────────
export function getById<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
}

export function query<T extends Element>(root: ParentNode, selector: string): T {
  const el = root.querySelector(selector);
  if (!el) throw new Error(`Missing element ${selector}`);
  return el as T;
}
