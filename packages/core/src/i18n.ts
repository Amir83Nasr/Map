import type { Labels } from './types.js';

export const FA_LABELS: Labels = {
  searchPlaceholder: 'جست‌وجوی موقعیت...',
  searchTitle: 'جستجوی موقعیت',
  suggestedPlaces: 'مکان‌های پیشنهادی',
  searching: 'در حال جستجو...',
  noResults: 'نتیجه‌ای پیدا نشد؛ عبارت دیگری امتحان کنید',
  searchError: 'خطا در جستجو؛ اتصال را بررسی کنید',
  confirmLocation: 'تایید موقعیت',
  confirm: 'تایید',
  editOnMap: 'ویرایش روی نقشه',
  chosenAddress: 'آدرس انتخابی',
  coordsToServer: 'مختصات ارسالی به سرور',
  close: 'بستن',
  clearSearch: 'پاک کردن جستجو',
  currentLocation: 'موقعیت فعلی',
  locating: 'در حال پیدا کردن آدرس...',
  resolving: 'در حال پیدا کردن آدرس...',
  registered: 'موقعیت ثبت شد',
  gpsUnsupported: 'GPS در این مرورگر پشتیبانی نمی‌شود',
  locateTimeout: 'دریافت موقعیت طول کشید؛ دستی انتخاب کنید',
  locateUnavailable: 'موقعیت در دسترس نیست؛ دستی انتخاب کنید',
  geoTitle: 'دسترسی به موقعیت مکانی',
  geoText: 'برای انتخاب موقعیت فعلی شما، لازم است دسترسی موقعیت مکانی را فعال کنید.',
  geoBlocked:
    'مرورگر قبلاً دسترسی را بسته است. از تنظیمات سایت مرورگر، دسترسی Location را مجاز کنید.',
  enableAccess: 'فعال کردن دسترسی',
};

export const EN_LABELS: Labels = { ...FA_LABELS };
