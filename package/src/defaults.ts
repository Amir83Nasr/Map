import type { I18nOption, Labels, LocationPickerOptions, SearchSuggestion } from './types.js';
import { FA_LABELS } from './i18n.js';

export const QOM_SUGGESTIONS: SearchSuggestion[] = [
  { name: '۱۹ دی، قم', addr: 'محله ۱۹ دی، شهر قم', lat: 34.6558, lng: 50.9055 },
  { name: 'آذر، قم', addr: 'محله آذر، شهر قم', lat: 34.6492, lng: 50.8965 },
  { name: 'امام حسین، قم', addr: 'میدان امام حسین، شهر قم', lat: 34.6512, lng: 50.8932 },
  { name: 'انسجام، قم', addr: 'محله انسجام، شهر قم', lat: 34.6058, lng: 50.8752 },
  { name: 'انقلاب، قم', addr: 'خیابان انقلاب، شهر قم', lat: 34.6462, lng: 50.8915 },
  { name: 'باجک، قم', addr: 'محله باجک، شهر قم', lat: 34.6601, lng: 50.8823 },
  { name: 'بلوار امین، قم', addr: 'محله بلوار امین، شهر قم', lat: 34.6248, lng: 50.8792 },
  { name: 'بنیاد، قم', addr: 'محله بنیاد، شهر قم', lat: 34.6475, lng: 50.8985 },
  { name: 'پردیسان، قم', addr: 'شهرک پردیسان، شهر قم', lat: 34.6021, lng: 50.8412 },
  { name: 'توحید، قم', addr: 'محله توحید، شهر قم', lat: 34.6685, lng: 50.8748 },
  { name: 'جمکران، قم', addr: 'محله جمکران، شهر قم', lat: 34.5853, lng: 50.9068 },
  { name: 'چهارمردان، قم', addr: 'محله چهارمردان، شهر قم', lat: 34.6401, lng: 50.8873 },
  { name: 'حافظ، قم', addr: 'خیابان حافظ، شهر قم', lat: 34.6368, lng: 50.8785 },
  { name: 'حرم، قم', addr: 'محله حرم، شهر قم', lat: 34.6448, lng: 50.8791 },
  { name: 'خاکفرج، قم', addr: 'محله خاکفرج، شهر قم', lat: 34.6798, lng: 50.9012 },
  { name: 'دروازه ری، قم', addr: 'محله دروازه ری، شهر قم', lat: 34.6352, lng: 50.8958 },
  { name: 'دورشهر، قم', addr: 'محله دورشهر، شهر قم', lat: 34.6442, lng: 50.8744 },
  { name: 'زاویه، قم', addr: 'محله زاویه، شهر قم', lat: 34.6385, lng: 50.8682 },
  { name: 'زنبیل‌آباد، قم', addr: 'محله زنبیل‌آباد، شهر قم', lat: 34.6221, lng: 50.8912 },
  { name: 'سالاریه، قم', addr: 'محله سالاریه، شهر قم', lat: 34.6289, lng: 50.8624 },
  { name: 'سمیه، قم', addr: 'خیابان سمیه، شهر قم', lat: 34.6521, lng: 50.8842 },
  { name: 'شهدا، قم', addr: 'خیابان شهدا، شهر قم', lat: 34.6425, lng: 50.8831 },
  { name: 'شهرقائم، قم', addr: 'شهرک قائم، شهر قم', lat: 34.6158, lng: 50.8505 },
  { name: 'شهرک امام حسن، قم', addr: 'شهرک امام حسن، شهر قم', lat: 34.6358, lng: 50.8521 },
  { name: 'شهرک مهدیه، قم', addr: 'شهرک مهدیه، شهر قم', lat: 34.6258, lng: 50.8452 },
  { name: 'شهرک ولیعصر، قم', addr: 'شهرک ولیعصر، شهر قم', lat: 34.6125, lng: 50.8585 },
  { name: 'شیخ‌آباد، قم', addr: 'محله شیخ‌آباد، شهر قم', lat: 34.6582, lng: 50.8718 },
  { name: 'صدوق، قم', addr: 'خیابان صدوق، شهر قم', lat: 34.6198, lng: 50.8725 },
  { name: 'صفائیه، قم', addr: 'محله صفائیه، شهر قم', lat: 34.6327, lng: 50.8713 },
  { name: 'عسگریه، قم', addr: 'محله عسگریه، شهر قم', lat: 34.6305, lng: 50.9018 },
  { name: 'عطاران، قم', addr: 'محله عطاران، شهر قم', lat: 34.6548, lng: 50.8895 },
  { name: 'فرهنگیان، قم', addr: 'محله فرهنگیان، شهر قم', lat: 34.6105, lng: 50.8702 },
  { name: 'کشاورز، قم', addr: 'محله کشاورز، شهر قم', lat: 34.6642, lng: 50.8885 },
  { name: 'کلهری، قم', addr: 'منطقه کلهری، شهر قم', lat: 34.6211, lng: 50.9055 },
  { name: 'کیوانفر، قم', addr: 'محله کیوانفر، شهر قم', lat: 34.6172, lng: 50.8856 },
  { name: 'مطهری، قم', addr: 'خیابان مطهری، شهر قم', lat: 34.6485, lng: 50.8878 },
  { name: 'معلم، قم', addr: 'میدان معلم، شهر قم', lat: 34.6275, lng: 50.8942 },
  { name: 'نوبهار، قم', addr: 'محله نوبهار، شهر قم', lat: 34.6623, lng: 50.8952 },
  { name: 'نیروگاه، قم', addr: 'محله نیروگاه، شهر قم', lat: 34.6712, lng: 50.8851 },
  { name: 'هفت‌تیر، قم', addr: 'خیابان هفت‌تیر، شهر قم', lat: 34.6442, lng: 50.8995 },
  { name: 'یزدانشهر، قم', addr: 'محله یزدانشهر، شهر قم', lat: 34.6012, lng: 50.8628 },
];

export const DEFAULT_CENTER: { lat: number; lng: number } = { lat: 34.6416, lng: 50.8764 };
export const DEFAULT_ZOOM = 14;

export function resolveLabels(i18n?: I18nOption): Labels {
  return { ...FA_LABELS, ...(i18n?.labels ?? {}) };
}

export function resolveDir(): 'rtl' {
  return 'rtl';
}

// Deep-merge user options over library defaults (arrays replace, objects merge).
export function mergeOptions(
  user: LocationPickerOptions,
): Required<
  Omit<LocationPickerOptions, 'container' | keyof import('./types.js').PickerCallbacks>
> & { container: LocationPickerOptions['container'] } {
  const o = user ?? {};
  return {
    container: o.container,
    map: {
      center: { ...DEFAULT_CENTER },
      zoom: DEFAULT_ZOOM,
      minZoom: 11,
      maxZoom: 19,
      bounds: [
        [34.15, 50.35],
        [35.05, 51.45],
      ],
      ...(o.map ?? {}),
    },
    controls: {
      gps: true,
      confirmButton: true,
      searchTrigger: true,
      developers: false,
      ...(o.controls ?? {}),
    },
    search: {
      enabled: true,
      suggestions: QOM_SUGGESTIONS,
      minLength: 3,
      debounceMs: 350,
      limit: 5,
      ...(o.search ?? {}),
    },
    sheet: { enabled: true, ...(o.sheet ?? {}) },
    behavior: {
      snapToRoad: true,
      resolveOnMove: true,
      resolveDelayMs: 400,
      settleDelayMs: 250,
      snapDelayMs: 900,
      pickZoom: 15,
      locateZoom: 18,
      ...(o.behavior ?? {}),
    },
    i18n: { labels: resolveLabels(o.i18n) },
    markers: o.markers ?? [],
  };
}
