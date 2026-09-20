import { refreshIcons } from './icons.js';

/** Show/hide a clear button based on input content; clear + refocus on click. */
export function wireClear(
  input: HTMLInputElement,
  btn: HTMLButtonElement,
  onClear?: () => void,
): void {
  const field = input.closest('.search-field');
  const toggle = (): void => {
    const has = input.value.length > 0;
    btn.hidden = !has;
    field?.classList.toggle('has-text', has);
  };
  input.addEventListener('input', toggle);
  btn.addEventListener('click', () => {
    input.value = '';
    toggle();
    onClear?.();
    input.focus();
  });
  toggle();
  refreshIcons();
}
