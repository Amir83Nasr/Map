import type { MapView } from './map-view.js';
import type { Selection } from './selection.js';
import { state } from './state.js';

export function initLocate(
  gps: HTMLButtonElement,
  modal: HTMLElement,
  permHint: HTMLElement,
  map: MapView,
  selection: Selection,
  toast: (msg: string) => void,
): void {
  function showModal(wasDenied: boolean): void {
    permHint.classList.toggle('hidden', !wasDenied);
    modal.classList.remove('hidden');
  }
  function hideModal(): void {
    modal.classList.add('hidden');
  }

  function locate(): void {
    if (!navigator.geolocation) {
      toast('GPS در این مرورگر پشتیبانی نمی‌شود');
      return;
    }
    gps.classList.add('locating');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        gps.classList.remove('locating');
        map.showMyPos(p.coords.latitude, p.coords.longitude);
        selection.setSelected(p.coords.latitude, p.coords.longitude, { moveMap: true, zoom: 18 });
      },
      (err) => {
        gps.classList.remove('locating');
        if (err?.code === err.PERMISSION_DENIED) {
          showModal(true);
        } else if (err?.code === err.TIMEOUT) {
          toast('دریافت موقعیت طول کشید؛ دستی انتخاب کنید');
          selection.scheduleResolve(state.lat, state.lng, 100);
        } else {
          toast('موقعیت در دسترس نیست؛ دستی انتخاب کنید');
          selection.scheduleResolve(state.lat, state.lng, 100);
        }
      },
      { timeout: 10000 },
    );
  }

  gps.addEventListener('click', locate);
  document.getElementById('permRetry')?.addEventListener('click', () => {
    hideModal();
    locate();
  });
  document.getElementById('permClose')?.addEventListener('click', hideModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) hideModal();
  });
}
