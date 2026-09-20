import { TOAST_TIMEOUT } from '../constants/index.js';

export function createToast(el: HTMLElement): (msg: string) => void {
  let timer = 0;
  return (msg: string) => {
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(timer);
    timer = window.setTimeout(() => el.classList.remove('show'), TOAST_TIMEOUT);
  };
}
