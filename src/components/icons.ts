import { createIcons, LocateFixed, MapPin, Search, X } from 'lucide';

const ICONS = { LocateFixed, MapPin, Search, X };

/** Replace <i data-lucide> placeholders with inline SVGs (scoped to icons we use). */
export function refreshIcons(): void {
  createIcons({ icons: ICONS });
}
