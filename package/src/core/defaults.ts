import type { I18nOption, Labels, LocationPickerOptions, SearchSuggestion } from './types.js';
import { FA_LABELS } from './i18n.js';

// Coordinates verified against Nominatim (2026-09): neighbourhood boundary
// centroids where OSM has them, else the named road/square/landmark point.
// Dropped: عسگریه + شهرک قائم (no OSM record at all), شهرک ولیعصر (only hit
// is ساوه, 63km away — name collision, kept pin would mislead).
export const QOM_SUGGESTIONS: SearchSuggestion[] = [
  { name: '۱۹ دی', addr: 'شهر قم، خیابان ۱۹ دی', lat: 34.6457, lng: 50.8851 },
  { name: '۷۲ تن', addr: 'شهر قم، میدان ۷۲ تن', lat: 34.6753, lng: 50.8922 },
  { name: 'آبشار', addr: 'شهر قم، بوستان آبشار', lat: 34.6869, lng: 50.8899 },
  { name: 'آذر', addr: 'شهر قم، بوستان شهدای آذر', lat: 34.6341, lng: 50.906 },
  { name: 'ارم', addr: 'شهر قم، محله ارم', lat: 34.6424, lng: 50.8804 },
  { name: 'امام حسین', addr: 'شهر قم، میدان امام حسین', lat: 34.6426, lng: 50.8491 },
  { name: 'امام خمینی', addr: 'شهر قم، خیابان امام خمینی', lat: 34.6633, lng: 50.8759 },
  { name: 'انسجام', addr: 'شهر قم، محله انسجام', lat: 34.6081, lng: 50.8783 },
  { name: 'انقلاب', addr: 'شهر قم، خیابان انقلاب', lat: 34.6354, lng: 50.8906 },
  { name: 'باجک', addr: 'شهر قم، محله باجک', lat: 34.6496, lng: 50.8906 },
  { name: 'بلوار امین', addr: 'شهر قم، بلوار امین', lat: 34.6335, lng: 50.8676 },
  { name: 'بلوار الغدیر', addr: 'شهر قم، بلوار الغدیر', lat: 34.5956, lng: 50.8209 },
  { name: 'بلوار جمهوری اسلامی', addr: 'شهر قم، بلوار جمهوری اسلامی', lat: 34.6056, lng: 50.8866 },
  { name: 'بلوار پیامبر اعظم', addr: 'شهر قم، بلوار پیامبر اعظم', lat: 34.6113, lng: 50.8973 },
  { name: 'بنیاد', addr: 'شهر قم، محله بنیاد', lat: 34.5944, lng: 50.8768 },
  { name: 'پردیسان', addr: 'شهر قم، شهرک پردیسان', lat: 34.5588, lng: 50.8331 },
  { name: 'توحید', addr: 'شهر قم، میدان توحید', lat: 34.6436, lng: 50.8628 },
  { name: 'جمکران', addr: 'شهر قم، مسجد مقدس جمکران', lat: 34.5841, lng: 50.9146 },
  { name: 'چهارمردان', addr: 'شهر قم، محله چهارمردان', lat: 34.6335, lng: 50.889 },
  { name: 'حافظ', addr: 'شهر قم، خیابان حافظ', lat: 34.6494, lng: 50.8611 },
  { name: 'حرم', addr: 'شهر قم، حرم حضرت معصومه', lat: 34.6419, lng: 50.8787 },
  { name: 'خاکفرج', addr: 'شهر قم، محله خاکفرج', lat: 34.6517, lng: 50.8853 },
  { name: 'دروازه ری', addr: 'شهر قم، محله دروازه ری', lat: 34.6446, lng: 50.9023 },
  { name: 'دورشهر', addr: 'شهر قم، محله دورشهر', lat: 34.6296, lng: 50.8705 },
  { name: 'زاویه', addr: 'شهر قم، محله زاویه', lat: 34.6214, lng: 50.9078 },
  { name: 'زنبیل‌آباد', addr: 'شهر قم، محله زنبیل‌آباد', lat: 34.6075, lng: 50.862 },
  { name: 'سالاریه', addr: 'شهر قم، محله سالاریه', lat: 34.6116, lng: 50.8471 },
  { name: 'سعیدی', addr: 'شهر قم، میدان سعیدی', lat: 34.65, lng: 50.878 },
  { name: 'سمیه', addr: 'شهر قم، خیابان سمیه', lat: 34.632, lng: 50.8826 },
  { name: 'شهدا', addr: 'شهر قم، خیابان شهدا', lat: 34.6362, lng: 50.872 },
  { name: 'شهرک امام حسن', addr: 'شهر قم، شهرک امام حسن', lat: 34.6782, lng: 50.88 },
  { name: 'شهرک صنعتی شکوهیه', addr: 'شهر قم، شهرک صنعتی شکوهیه', lat: 34.7956, lng: 50.8177 },
  { name: 'شهرک فاطمیه', addr: 'شهر قم، شهرک فاطمیه', lat: 34.6746, lng: 50.8521 },
  { name: 'شهرک قدس', addr: 'شهر قم، شهرک قدس', lat: 34.5969, lng: 50.8426 },
  { name: 'شهرک مهدیه', addr: 'شهر قم، شهرک مهدیه', lat: 34.5823, lng: 50.8238 },
  { name: 'شیخ‌آباد', addr: 'شهر قم، محله شیخ‌آباد', lat: 34.6474, lng: 50.8344 },
  { name: 'صدوق', addr: 'شهر قم، محله صدوق', lat: 34.6313, lng: 50.8743 },
  { name: 'صفائیه', addr: 'شهر قم، محله صفائیه', lat: 34.6362, lng: 50.8721 },
  { name: 'طالقانی', addr: 'شهر قم، خیابان طالقانی', lat: 34.6734, lng: 50.8704 },
  { name: 'عطاران', addr: 'شهر قم، محله عطاران', lat: 34.624, lng: 50.8714 },
  { name: 'علی‌بن‌جعفر', addr: 'شهر قم، آستان علی‌بن‌جعفر', lat: 34.6313, lng: 50.8973 },
  { name: 'فرهنگیان', addr: 'شهر قم، محله فرهنگیان', lat: 34.6682, lng: 50.8984 },
  { name: 'کشاورز', addr: 'شهر قم، خیابان کشاورز', lat: 34.656, lng: 50.8446 },
  { name: 'کلهری', addr: 'شهر قم، منطقه کلهری', lat: 34.6257, lng: 50.9034 },
  { name: 'کیوانفر', addr: 'شهر قم، بلوار شهید کیوانفر', lat: 34.6582, lng: 50.8821 },
  { name: 'مطهری', addr: 'شهر قم، خیابان مطهری', lat: 34.646, lng: 50.8486 },
  { name: 'معلم', addr: 'شهر قم، میدان معلم', lat: 34.6328, lng: 50.8848 },
  { name: 'نوبهار', addr: 'شهر قم، محله نوبهار', lat: 34.6409, lng: 50.9053 },
  { name: 'نیروگاه', addr: 'شهر قم، محله نیروگاه', lat: 34.6487, lng: 50.8587 },
  { name: 'هفت‌تیر', addr: 'شهر قم، خیابان هفت‌تیر', lat: 34.6571, lng: 50.8848 },
  { name: 'هنرستان', addr: 'شهر قم، محله هنرستان', lat: 34.628, lng: 50.8878 },
  { name: 'یزدانشهر', addr: 'شهر قم، محله یزدانشهر', lat: 34.6154, lng: 50.8824 },
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
