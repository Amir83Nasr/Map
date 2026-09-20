import type { Selection } from './selection.js';
import type { SearchPane } from './search.js';
import { initSearchHost } from './search.js';

/** Mobile fullscreen overlay: open/close + history-backed back button. */
export function initOverlay(
  overlay: HTMLElement,
  openBtn: HTMLButtonElement,
  backBtn: HTMLButtonElement,
  pane: SearchPane,
  selection: Selection,
): { reset(): void } {
  const host = initSearchHost(pane, selection, 14, () => closeSearch());

  let pushed = false;

  function openSearch(): void {
    if (!overlay.hidden) return;
    overlay.hidden = false;
    pane.input.value = '';
    pane.input.dispatchEvent(new Event('input'));
    host.reset();
    pane.home.hidden = false;
    history.pushState({ search: true }, '');
    pushed = true;
    window.setTimeout(() => pane.input.focus(), 50);
  }

  function doClose(): void {
    overlay.hidden = true;
    pane.results.innerHTML = '';
    pane.input.value = '';
    pane.input.dispatchEvent(new Event('input'));
    pane.input.blur();
  }

  function closeSearch(): void {
    if (overlay.hidden) return;
    const wasPushed = pushed;
    pushed = false;
    doClose();
    if (wasPushed) history.back();
  }

  openBtn.addEventListener('click', openSearch);
  backBtn.addEventListener('click', closeSearch);
  window.addEventListener('popstate', () => {
    if (!overlay.hidden) {
      pushed = false;
      doClose();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.hidden) closeSearch();
  });

  return { reset: host.reset };
}
