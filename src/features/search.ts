import type { Selection } from './selection.js';
import { MIN_QUERY_LEN, SEARCH_DEBOUNCE, SUGGEST } from '../constants/index.js';
import { searchLocation } from '../services/geocode.js';
import { enDigits } from '../utils/format.js';
import { createResultCard, createSuggestRow, showStatus } from '../components/result-row.js';
import { refreshIcons } from '../components/icons.js';

export interface SearchPane {
  input: HTMLInputElement;
  home: HTMLElement;
  suggestList: HTMLElement;
  results: HTMLElement;
}

interface SearchController {
  reset(): void;
}

function filterSuggest(q: string): typeof SUGGEST {
  const needle = enDigits(q).trim();
  const match = (t: string): boolean => !needle || String(t).includes(needle);
  return SUGGEST.filter((s) => match(s.name) || match(s.addr));
}

/** Wire one search pane (mobile overlay or desktop sidebar) to the shared geocoder. */
export function initSearchHost(
  pane: SearchPane,
  selection: Selection,
  pickZoom: number,
  afterPick?: () => void,
): SearchController {
  let timer = 0;
  let seq = 0;

  function renderHome(q: string): void {
    pane.suggestList.innerHTML = '';
    for (const s of filterSuggest(q)) {
      const el = createSuggestRow(s.name, s.addr);
      el.addEventListener('click', () => {
        selection.setSelected(s.lat, s.lng, { moveMap: true, zoom: pickZoom });
        afterPick?.();
      });
      pane.suggestList.appendChild(el);
    }
    refreshIcons();
  }

  async function run(q: string): Promise<void> {
    const mySeq = ++seq;
    pane.home.hidden = true;
    showStatus(pane.results, 'در حال جستجو...');
    try {
      const list = await searchLocation(q);
      if (mySeq !== seq) return;
      if (!list.length) {
        showStatus(pane.results, 'نتیجه‌ای پیدا نشد؛ عبارت دیگری امتحان کنید');
        return;
      }
      pane.results.innerHTML = '';
      for (const it of list) {
        const b = createResultCard(it.display_name);
        b.addEventListener('click', () => {
          seq++;
          selection.setSelected(parseFloat(it.lat), parseFloat(it.lon), {
            moveMap: true,
            zoom: pickZoom,
          });
          afterPick?.();
        });
        pane.results.appendChild(b);
      }
      refreshIcons();
    } catch {
      if (mySeq !== seq) return;
      showStatus(pane.results, 'خطا در جستجو؛ اتصال را بررسی کنید');
    }
  }

  function reset(): void {
    seq++;
    clearTimeout(timer);
    pane.results.innerHTML = '';
    pane.home.hidden = false;
    renderHome('');
  }

  pane.input.addEventListener('input', () => {
    seq++;
    clearTimeout(timer);
    const q = pane.input.value.trim();
    if (q.length < 1) {
      pane.results.innerHTML = '';
      pane.home.hidden = false;
      renderHome('');
      return;
    }
    if (q.length < MIN_QUERY_LEN) {
      renderHome(q);
      pane.home.hidden = false;
      pane.results.innerHTML = '';
      return;
    }
    timer = window.setTimeout(() => void run(q), SEARCH_DEBOUNCE);
  });
  pane.input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const q = pane.input.value.trim();
      if (!q) return;
      seq++;
      clearTimeout(timer);
      void run(q);
    }
  });

  renderHome('');
  return { reset };
}
