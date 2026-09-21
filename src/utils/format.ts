const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

export function faStr(value: string | number): string {
  return String(value)
    .replace(/\d/g, (c) => FA_DIGITS[Number(c)])
    .replace(/[٠-٩]/g, (c) => FA_DIGITS['٠١٢٣٤٥٦٧٨٩'.indexOf(c)]);
}

export function faCoord(n: number, digits = 5): string {
  return faStr(Number(n).toFixed(digits));
}

/** Normalize Persian/Arabic digits to ASCII so the geocoder gets plain numbers. */
export function enDigits(s: string): string {
  return String(s)
    .replace(/[۰-۹]/g, (c) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)))
    .replace(/[٠-٩]/g, (c) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)));
}

/** Trim a Nominatim display_name down to the most useful local parts. */
export function shortAddr(display: string | undefined): string {
  if (!display) return '';
  const parts = String(display)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const isDrop = (p: string): boolean => {
    if (/^(ایران|Iran)$/i.test(p)) return true;
    if (/^استان\b/.test(p)) return true;
    if (/^شهرستان\b/.test(p)) return true;
    if (/^بخش\b/.test(p)) return true;
    if (/^[\d\s\-–—]+$/.test(enDigits(p))) return true;
    return false;
  };
  return parts
    .filter((p) => !isDrop(p))
    .slice(0, 4)
    .reverse()
    .join(', ');
}
