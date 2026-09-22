import type { EventHandler, PickerEvent } from './types.js';

export class Emitter {
  private map = new Map<PickerEvent, Set<EventHandler>>();
  on(ev: PickerEvent, fn: EventHandler): () => void {
    let s = this.map.get(ev);
    if (!s) this.map.set(ev, (s = new Set()));
    s.add(fn);
    return () => this.off(ev, fn);
  }
  off(ev: PickerEvent, fn: EventHandler): void {
    this.map.get(ev)?.delete(fn);
  }
  emit(ev: PickerEvent, payload?: unknown): void {
    for (const fn of this.map.get(ev) ?? []) {
      try {
        fn(payload);
      } catch {
        /* listener errors must not break picker */
      }
    }
  }
}
