import { faCoord, faStr } from '../utils/format.js';
import { state } from './state.js';
import type { Selection } from './selection.js';

export function initConfirm(selection: Selection, toast: (msg: string) => void): void {
  const modal = document.getElementById('confirmModal') as HTMLElement;
  const confirmBtn = document.getElementById('confirm') as HTMLButtonElement;
  const address = document.getElementById('confirmAddress') as HTMLTextAreaElement;
  const coords = document.getElementById('confirmCoords') as HTMLElement;
  const finalBtn = document.getElementById('confirmFinal') as HTMLButtonElement;

  function openConfirm(): void {
    address.value = state.address ? faStr(state.address) : '';
    coords.textContent = `${faCoord(state.lat, 6)}, ${faCoord(state.lng, 6)}`;
    modal.classList.remove('hidden');
  }
  function closeConfirm(): void {
    modal.classList.add('hidden');
  }

  confirmBtn.addEventListener('click', () => {
    if (!state.address && !state.resolving) selection.scheduleResolve(state.lat, state.lng, 100);
    openConfirm();
  });
  document.getElementById('confirmClose')?.addEventListener('click', closeConfirm);
  document.getElementById('confirmEdit')?.addEventListener('click', closeConfirm);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeConfirm();
  });
  finalBtn.addEventListener('click', () => {
    finalBtn.disabled = true;
    const prev = finalBtn.textContent ?? '';
    finalBtn.textContent = 'در حال ثبت...';
    window.setTimeout(() => {
      finalBtn.disabled = false;
      finalBtn.textContent = prev;
      closeConfirm();
      toast(`موقعیت ثبت شد (${faCoord(state.lat)}, ${faCoord(state.lng)})`);
    }, 800);
  });
}
