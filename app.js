// ── STATE ────────────────────────────────────────────────
const S = {
  lat: 34.6416, lng: 50.8764,
  address: "", resolving: false,
};
const $ = (id) => document.getElementById(id);
const els = {
  toast: $("toast"), gps: $("gpsBtn"),
  confirm: $("confirm"), results: $("results"),
  searchInput: $("searchInput"), wrap: document.querySelector(".map-wrap"),
  modal: $("permModal"), permHint: $("permHint"),
  overlay: $("searchOverlay"), openBtn: $("searchOpen"),
  backBtn: $("searchBack"), label: $("searchLabel"),
  home: $("homeContent"), suggestList: $("suggestList"),
  deskInput: $("deskInput"), deskHome: $("deskHome"),
  deskSuggest: $("deskSuggest"), deskResults: $("deskResults"),
  searchClear: $("searchClear"), deskClear: $("deskClear"),
};

// ── MAP ──────────────────────────────────────────────────
const TILE_URL = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const map = L.map("map", {
  zoomControl: false, attributionControl: false,
  preferCanvas: true, fadeAnimation: false, worldCopyJump: true,
  minZoom: 11, maxZoom: 19,
  wheelDebounceTime: 60, wheelPxPerZoomLevel: 90,
  maxBounds: [[34.15, 50.35], [35.05, 51.45]], maxBoundsViscosity: 1.0,
}).setView([S.lat, S.lng], 14);
L.tileLayer(TILE_URL, {
  maxZoom: 19, maxNativeZoom: 19, subdomains: "abcd",
  keepBuffer: 8, updateWhenIdle: false, unloadInvisibleTiles: false,
  reuseTiles: true, crossOrigin: true,
}).addTo(map);

if (window.lucide) lucide.createIcons();
function refreshIcons() { if (window.lucide) lucide.createIcons(); }

// ── CLEAR BUTTON ───────────────────────────────────────────
function wireClear(input, btn, onClear) {
  if (!input || !btn) return;
  const field = input.closest(".search-field");
  const toggle = () => {
    const has = input.value.length > 0;
    btn.hidden = !has;
    if (field) field.classList.toggle("has-text", has);
  };
  input.addEventListener("input", toggle);
  btn.addEventListener("click", () => {
    input.value = "";
    toggle();
    if (onClear) onClear();
    input.focus();
  });
  toggle();
  refreshIcons();
}

// ── QOM WARM CACHE ───────────────────────────────────────
// ponytail: حافظه HTTP مرورگر کافی است؛ آفلاین واقعی (Service Worker) اضافه نشد، لازم شد اضافه کن
const RETINA = (window.L && L.Browser.retina) ? "@2x" : "";
function tileUrl(z, x, y) {
  const n = 2 ** z;
  const xx = ((x % n) + n) % n;
  return TILE_URL.replace("{s}", "abcd"[(xx + y) & 3])
    .replace("{z}", z).replace("{x}", xx).replace("{y}", y).replace("{r}", RETINA);
}
const _q = [];
const _seen = new Set();
let _active = 0;
function pumpQom() {
  while (_active < 4 && _q.length) {
    const u = _q.shift();
    _active++;
    const img = new Image();
    img.decoding = "async"; img.referrerPolicy = "no-referrer";
    img.onload = img.onerror = () => { _active--; pumpQom(); };
    img.src = u;
  }
}
function queueTiles(z, cx, cy, r) {
  for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
    const u = tileUrl(z, cx + dx, cy + dy);
    if (_seen.has(u)) continue;
    _seen.add(u);
    _q.push(u);
  }
  pumpQom();
}
function xyz(lat, lng, z) {
  const n = 2 ** z;
  const xt = Math.floor(((lng + 180) / 360) * n);
  const rad = (lat * Math.PI) / 180;
  const yt = Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n);
  return [xt, yt];
}
function prefetchQom(lat = S.lat, lng = S.lng, baseZ = 14) {
  // حیاتی اول: زوم فعلی + همسایه، بدون انتظار load
  const [cx0, cy0] = xyz(lat, lng, baseZ);
  queueTiles(baseZ, cx0, cy0, 2);
  const idle = (fn) => ("requestIdleCallback" in window ? requestIdleCallback(fn, { timeout: 4000 }) : setTimeout(fn, 1500));
  idle(() => {
    for (const z of [baseZ + 1, baseZ - 1, baseZ + 2, baseZ - 2]) {
      if (z < 11 || z > 16) continue;
      const [cx, cy] = xyz(lat, lng, z);
      queueTiles(z, cx, cy, z >= 14 ? 2 : 1);
    }
  });
}
function prefetchAround(lat, lng) {
  const z = Math.round(map.getZoom());
  const [cx, cy] = xyz(lat, lng, z);
  queueTiles(z, cx, cy, 2);
}
requestAnimationFrame(() => { map.invalidateSize(); prefetchQom(); });
window.addEventListener("load", () => { map.invalidateSize(); });

let myMarker = null;
function showMyPos(lat, lng) {
  if (myMarker) {
    myMarker.setLatLng([lat, lng]);
    return;
  }
  myMarker = L.marker([lat, lng], {
    interactive: false,
    keyboard: false,
    zIndexOffset: 500,
    icon: L.divIcon({ className: "my-wrap", html: '<div class="my-dot"></div>', iconSize: [20, 20], iconAnchor: [10, 10] }),
  }).addTo(map);
}

// ── GEOCODE API ──────────────────────────────────────────
async function reverseGeocode(lat, lng) {
  const r = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=fa`,
    { headers: { Accept: "application/json" } }
  );
  if (!r.ok) throw new Error("http " + r.status);
  const j = await r.json();
  if (!j.display_name) throw new Error("empty result");
  return j.display_name;
}

async function searchLocation(query) {
  const r = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&accept-language=fa&limit=5&viewbox=50.35,35.05,51.45,34.15&bounded=1&q=${encodeURIComponent(enDigits(query))}`,
    { headers: { Accept: "application/json" } }
  );
  if (!r.ok) throw new Error("http " + r.status);
  return r.json();
}

let revTimer = 0, revSeq = 0;
function scheduleResolve(lat, lng, delay = 600) {
  clearTimeout(revTimer);
  revTimer = setTimeout(() => resolveAddress(lat, lng), delay);
}
async function resolveAddress(lat, lng) {
  const seq = ++revSeq;
  S.resolving = true;
  els.label.textContent = "در حال پیدا کردن آدرس...";
  try {
    const text = await reverseGeocode(lat, lng);
    if (seq !== revSeq) return;
    S.address = shortAddr(text);
  } catch {
    if (seq !== revSeq) return;
    S.address = "";
  } finally {
    if (seq !== revSeq) return;
    S.resolving = false;
    renderSheet();
  }
}

// ── RENDER ───────────────────────────────────────────────
const FA_D = "۰۱۲۳۴۵۶۷۸۹";
function faStr(s) {
  return String(s).replace(/\d/g, (c) => FA_D[c]);
}
function fa(n, d = 5) {
  return faStr(Number(n).toFixed(d));
}
function enDigits(s) {
  return String(s)
    .replace(/[۰-۹]/g, (c) => "۰۱۲۳۴۵۶۷۸۹".indexOf(c))
    .replace(/[٠-٩]/g, (c) => "٠١٢٣٤٥٦٧٨٩".indexOf(c));
}
function shortAddr(display) {
  if (!display) return "";
  const parts = String(display).split(",").map((s) => s.trim()).filter(Boolean);
  const isDrop = (p) => {
    if (/^(ایران|Iran)$/i.test(p)) return true;
    if (/^استان\b/.test(p)) return true;
    if (/^شهرستان\b/.test(p)) return true;
    if (/^بخش\b/.test(p)) return true;
    const en = enDigits(p);
    if (/^[\d\s\-–—]+$/.test(en)) return true;
    return false;
  };
  return parts.filter((p) => !isDrop(p)).slice(0, 4).reverse().join(", ");
}
function renderSheet() {
  els.label.textContent = S.address ? faStr(S.address) : "جستجوی آدرس یا مکان";
}

function setSelected(lat, lng, { moveMap = false, resolve = true, zoom } = {}) {
  S.lat = lat; S.lng = lng;
  if (moveMap) {
    const z = zoom ?? Math.max(map.getZoom(), 15);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) map.setView([lat, lng], z, { animate: false });
    else if (map.distance(map.getCenter(), L.latLng(lat, lng)) < 1000) map.setView([lat, lng], z, { animate: true });
    else map.flyTo([lat, lng], z, { duration: 1.2 });
  }
  if (resolve) scheduleResolve(lat, lng);
  else renderSheet();
}

function toast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => els.toast.classList.remove("show"), 2600);
}

// ── MAP EVENTS ───────────────────────────────────────────
let moveTimer = 0, preTimer = 0;
map.on("movestart", () => els.wrap.classList.add("map-moving"));
map.on("move", () => {
  const c = map.getCenter();
  S.lat = c.lat; S.lng = c.lng;
  clearTimeout(preTimer);
  preTimer = setTimeout(() => prefetchAround(c.lat, c.lng), 200);
});
map.on("moveend", () => {
  els.wrap.classList.remove("map-moving");
  const c = map.getCenter();
  clearTimeout(moveTimer);
  moveTimer = setTimeout(() => setSelected(c.lat, c.lng), 350);
});

// ── GPS / PERMISSION ─────────────────────────────────────
function showModal(wasDenied) {
  els.permHint.classList.toggle("hidden", !wasDenied);
  els.modal.classList.remove("hidden");
}
function hideModal() { els.modal.classList.add("hidden"); }
function locate() {
  if (!navigator.geolocation) {
    toast("GPS در این مرورگر پشتیبانی نمی‌شود");
    return;
  }
  els.gps.classList.add("locating");
  navigator.geolocation.getCurrentPosition(
    (p) => {
      els.gps.classList.remove("locating");
      showMyPos(p.coords.latitude, p.coords.longitude);
      setSelected(p.coords.latitude, p.coords.longitude, { moveMap: true, zoom: 18 });
    },
    (err) => {
      els.gps.classList.remove("locating");
      if (err && err.code === err.PERMISSION_DENIED) {
        showModal(true);
      } else if (err && err.code === err.TIMEOUT) {
        toast("دریافت موقعیت طول کشید؛ دستی انتخاب کنید");
        scheduleResolve(S.lat, S.lng, 100);
      } else {
        toast("موقعیت در دسترس نیست؛ دستی انتخاب کنید");
        scheduleResolve(S.lat, S.lng, 100);
      }
    },
    { timeout: 10000 }
  );
}
els.gps.onclick = locate;
$("permRetry").onclick = () => { hideModal(); locate(); };
$("permClose").onclick = hideModal;
els.modal.addEventListener("click", (e) => { if (e.target === els.modal) hideModal(); });

// ── SEARCH OVERLAY ───────────────────────────────────────
const SUGGEST = [
  { name: "صفائیه، قم", addr: "محله صفائیه، شهر قم", lat: 34.6327, lng: 50.8713 },
  { name: "زنبیل‌آباد، قم", addr: "محله زنبیل‌آباد، شهر قم", lat: 34.6221, lng: 50.8912 },
  { name: "عطاران، قم", addr: "محله عطاران، شهر قم", lat: 34.6548, lng: 50.8895 },
  { name: "باجک، قم", addr: "محله باجک، شهر قم", lat: 34.6601, lng: 50.8823 },
  { name: "دورشهر، قم", addr: "محله دورشهر، شهر قم", lat: 34.6442, lng: 50.8744 },
  { name: "نیروگاه، قم", addr: "محله نیروگاه، شهر قم", lat: 34.6712, lng: 50.8851 },
  { name: "سالاریه، قم", addr: "محله سالاریه، شهر قم", lat: 34.6289, lng: 50.8624 },
  { name: "پردیسان، قم", addr: "شهرک پردیسان، شهر قم", lat: 34.6021, lng: 50.8412 },
  { name: "جمکران، قم", addr: "محله جمکران، شهر قم", lat: 34.5853, lng: 50.9068 },
  { name: "حرم، قم", addr: "محله حرم، شهر قم", lat: 34.6448, lng: 50.8791 },
  { name: "چهارمردان، قم", addr: "محله چهارمردان، شهر قم", lat: 34.6401, lng: 50.8873 },
  { name: "آذر، قم", addr: "محله آذر، شهر قم", lat: 34.6492, lng: 50.8965 },
  { name: "بلوار امین، قم", addr: "محله بلوار امین، شهر قم", lat: 34.6248, lng: 50.8792 },
  { name: "بنیاد، قم", addr: "محله بنیاد، شهر قم", lat: 34.6475, lng: 50.8985 },
  { name: "نوبهار، قم", addr: "محله نوبهار، شهر قم", lat: 34.6623, lng: 50.8952 },
  { name: "دروازه ری، قم", addr: "محله دروازه ری، شهر قم", lat: 34.6352, lng: 50.8958 },
  { name: "توحید، قم", addr: "محله توحید، شهر قم", lat: 34.6685, lng: 50.8748 },
  { name: "فرهنگیان، قم", addr: "محله فرهنگیان، شهر قم", lat: 34.6105, lng: 50.8702 },
  { name: "شهرقائم، قم", addr: "شهرک قائم، شهر قم", lat: 34.6158, lng: 50.8505 },
  { name: "۱۹ دی، قم", addr: "محله ۱۹ دی، شهر قم", lat: 34.6558, lng: 50.9055 },
  { name: "انقلاب، قم", addr: "خیابان انقلاب، شهر قم", lat: 34.6462, lng: 50.8915 },
  { name: "شهدا، قم", addr: "خیابان شهدا، شهر قم", lat: 34.6425, lng: 50.8831 },
  { name: "خاکفرج، قم", addr: "محله خاکفرج، شهر قم", lat: 34.6798, lng: 50.9012 },
  { name: "کیوانفر، قم", addr: "محله کیوانفر، شهر قم", lat: 34.6172, lng: 50.8856 },
  { name: "شیخ‌آباد، قم", addr: "محله شیخ‌آباد، شهر قم", lat: 34.6582, lng: 50.8718 },
  { name: "عسگریه، قم", addr: "محله عسگریه، شهر قم", lat: 34.6305, lng: 50.9018 },
  { name: "یزدانشهر، قم", addr: "محله یزدانشهر، شهر قم", lat: 34.6012, lng: 50.8628 },
  { name: "شهرک مهدیه، قم", addr: "شهرک مهدیه، شهر قم", lat: 34.6258, lng: 50.8452 },
  { name: "شهرک امام حسن، قم", addr: "شهرک امام حسن، شهر قم", lat: 34.6358, lng: 50.8521 },
  { name: "انسجام، قم", addr: "محله انسجام، شهر قم", lat: 34.6058, lng: 50.8752 },
  { name: "زاویه، قم", addr: "محله زاویه، شهر قم", lat: 34.6385, lng: 50.8682 },
  { name: "سمیه، قم", addr: "خیابان سمیه، شهر قم", lat: 34.6521, lng: 50.8842 },
  { name: "صدوق، قم", addr: "خیابان صدوق، شهر قم", lat: 34.6198, lng: 50.8725 },
  { name: "مطهری، قم", addr: "خیابان مطهری، شهر قم", lat: 34.6485, lng: 50.8878 },
  { name: "امام حسین، قم", addr: "میدان امام حسین، شهر قم", lat: 34.6512, lng: 50.8932 },
  { name: "هفت‌تیر، قم", addr: "خیابان هفت‌تیر، شهر قم", lat: 34.6442, lng: 50.8995 },
  { name: "حافظ، قم", addr: "خیابان حافظ، شهر قم", lat: 34.6368, lng: 50.8785 },
  { name: "معلم، قم", addr: "میدان معلم، شهر قم", lat: 34.6275, lng: 50.8942 },
  { name: "کشاورز، قم", addr: "محله کشاورز، شهر قم", lat: 34.6642, lng: 50.8885 },
  { name: "کلهری، قم", addr: "منطقه کلهری، شهر قم", lat: 34.6211, lng: 50.9055 },
  { name: "شهرک ولیعصر، قم", addr: "شهرک ولیعصر، شهر قم", lat: 34.6125, lng: 50.8585 },
].sort((a, b) => a.name.localeCompare(b.name, "fa"));
function histRow({ name, addr }) {
  const b = document.createElement("button");
  b.className = "hist-row";
  b.type = "button";
  b.innerHTML = `<span class="side-ic right"><i data-lucide="map-pin"></i></span><span class="t"><b></b><small></small></span>`;
  b.querySelector("b").textContent = String(name).replace(/،\s*قم\s*$/, "");
  b.querySelector("small").textContent = String(addr).split(/[،,]/).map((s) => s.trim()).filter(Boolean).reverse().join("، ");
  return b;
}
function renderHome(q) {
  const needle = enDigits(q || "").trim();
  const match = (t) => !needle || String(t).includes(needle);
  els.suggestList.innerHTML = "";
  const sug = SUGGEST.filter((s) => match(s.name) || match(s.addr));
  for (const s of sug) {
    const el = histRow({ name: s.name, addr: s.addr });
    el.onclick = () => {
      closeSearch();
      setSelected(s.lat, s.lng, { moveMap: true, zoom: 14 });
    };
    els.suggestList.appendChild(el);
  }
  refreshIcons();
}
let searchPushed = false;
function openSearch() {
  if (!els.overlay.hidden) return;
  els.overlay.hidden = false;
  els.results.innerHTML = "";
  els.searchInput.value = "";
  els.searchInput.dispatchEvent(new Event("input"));
  renderHome("");
  els.home.hidden = false;
  history.pushState({ search: true }, "");
  searchPushed = true;
  setTimeout(() => els.searchInput.focus(), 50);
  refreshIcons();
}
function doCloseSearch() {
  els.overlay.hidden = true;
  clearTimeout(searchTimer);
  els.results.innerHTML = "";
  els.searchInput.value = "";
  els.searchInput.dispatchEvent(new Event("input"));
  els.searchInput.blur();
}
function closeSearch() {
  if (els.overlay.hidden) return;
  const pushed = searchPushed;
  searchPushed = false;
  doCloseSearch();
  if (pushed) history.back();
}
els.openBtn.onclick = openSearch;
els.backBtn.onclick = closeSearch;
window.addEventListener("popstate", () => {
  if (!els.overlay.hidden) {
    searchPushed = false;
    doCloseSearch();
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !els.overlay.hidden) closeSearch();
});

// ── SEARCH ───────────────────────────────────────────────
let searchTimer = 0;
async function search(q) {
  els.home.hidden = true;
  els.results.innerHTML = `<div class="err">در حال جستجو...</div>`;
  try {
    const list = await searchLocation(q);
    if (!list.length) {
      els.results.innerHTML = `<div class="err">نتیجه‌ای پیدا نشد؛ عبارت دیگری امتحان کنید</div>`;
      return;
    }
    els.results.innerHTML = "";
    for (const it of list) {
      const name = String(it.display_name).split(",")[0];
      const b = document.createElement("button");
      b.className = "result-card";
      b.innerHTML = `<span class="ic"><i data-lucide="map-pin"></i></span><span><b></b><small></small></span>`;
      b.querySelector("b").textContent = faStr(name);
      b.querySelector("small").textContent = faStr(shortAddr(it.display_name));
      b.onclick = () => {
        closeSearch();
        setSelected(parseFloat(it.lat), parseFloat(it.lon), { moveMap: true, zoom: 14 });
      };
      els.results.appendChild(b);
    }
    refreshIcons();
  } catch {
    els.results.innerHTML = `<div class="err">خطا در جستجو؛ اتصال را بررسی کنید</div>`;
  }
}
function submitSearch() {
  const q = els.searchInput.value.trim();
  if (q) { clearTimeout(searchTimer); search(q); }
}
els.searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  const q = els.searchInput.value.trim();
  if (q.length < 1) { els.results.innerHTML = ""; els.home.hidden = false; return; }
  if (q.length < 3) { renderHome(q); els.home.hidden = false; els.results.innerHTML = ""; return; }
  searchTimer = setTimeout(() => search(q), 600);
});
els.searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") { clearTimeout(searchTimer); submitSearch(); }
});

// ── DESK SEARCH (desktop sidebar, inline) ──────────────────
let deskTimer = 0;
function deskPick(lat, lng) {
  setSelected(lat, lng, { moveMap: true, zoom: 16 });
}
function renderDeskHome(q) {
  if (!els.deskSuggest) return;
  const needle = enDigits(q || "").trim();
  const match = (t) => !needle || String(t).includes(needle);
  els.deskSuggest.innerHTML = "";
  const sug = SUGGEST.filter((s) => match(s.name) || match(s.addr));
  for (const s of sug) {
    const el = histRow({ name: s.name, addr: s.addr });
    el.onclick = () => deskPick(s.lat, s.lng);
    els.deskSuggest.appendChild(el);
  }
  refreshIcons();
}
async function deskSearch(q) {
  if (!els.deskResults) return;
  els.deskHome.hidden = true;
  els.deskResults.innerHTML = `<div class="err">در حال جستجو...</div>`;
  try {
    const list = await searchLocation(q);
    if (!list.length) {
      els.deskResults.innerHTML = `<div class="err">نتیجه‌ای پیدا نشد؛ عبارت دیگری امتحان کنید</div>`;
      return;
    }
    els.deskResults.innerHTML = "";
    for (const it of list) {
      const name = String(it.display_name).split(",")[0];
      const b = document.createElement("button");
      b.className = "result-card";
      b.innerHTML = `<span class="ic"><i data-lucide="map-pin"></i></span><span><b></b><small></small></span>`;
      b.querySelector("b").textContent = faStr(name);
      b.querySelector("small").textContent = faStr(shortAddr(it.display_name));
      b.onclick = () => deskPick(parseFloat(it.lat), parseFloat(it.lon));
      els.deskResults.appendChild(b);
    }
    refreshIcons();
  } catch {
    els.deskResults.innerHTML = `<div class="err">خطا در جستجو؛ اتصال را بررسی کنید</div>`;
  }
}
if (els.deskInput) {
  renderDeskHome("");
  els.deskInput.addEventListener("input", () => {
    clearTimeout(deskTimer);
    const q = els.deskInput.value.trim();
    if (q.length < 1) { els.deskResults.innerHTML = ""; els.deskHome.hidden = false; renderDeskHome(""); return; }
    if (q.length < 3) { renderDeskHome(q); els.deskHome.hidden = false; els.deskResults.innerHTML = ""; return; }
    deskTimer = setTimeout(() => deskSearch(q), 600);
  });
  els.deskInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { clearTimeout(deskTimer); const q = els.deskInput.value.trim(); if (q) deskSearch(q); }
  });
}

// ── CONFIRM DIALOG ─────────────────────────────────────────
const confirmModal = $("confirmModal"), confirmAddress = $("confirmAddress"),
  confirmCoords = $("confirmCoords"), confirmFinal = $("confirmFinal");
function openConfirm() {
  confirmAddress.value = S.address ? faStr(S.address) : "";
  confirmCoords.textContent = `${Number(S.lat).toFixed(6)}, ${Number(S.lng).toFixed(6)}`;
  confirmModal.classList.remove("hidden");
  refreshIcons();
}
function closeConfirm() { confirmModal.classList.add("hidden"); }
els.confirm.onclick = () => {
  if (!S.address && !S.resolving) scheduleResolve(S.lat, S.lng, 100);
  openConfirm();
};
$("confirmClose").onclick = closeConfirm;
$("confirmEdit").onclick = closeConfirm;
confirmModal.addEventListener("click", (e) => { if (e.target === confirmModal) closeConfirm(); });
confirmFinal.onclick = async () => {
  const btn = confirmFinal;
  btn.disabled = true;
  const prev = btn.textContent;
  btn.textContent = "در حال ثبت...";
  await new Promise((r) => setTimeout(r, 800));
  btn.disabled = false;
  btn.textContent = prev;
  closeConfirm();
  toast(`موقعیت ثبت شد (${fa(S.lat)}, ${fa(S.lng)})`);
  renderSheet();
};

// ── INIT ─────────────────────────────────────────────────
wireClear(els.searchInput, els.searchClear, () => {
  clearTimeout(searchTimer);
  els.results.innerHTML = "";
  els.home.hidden = false;
  renderHome("");
});
wireClear(els.deskInput, els.deskClear, () => {
  clearTimeout(deskTimer);
  if (els.deskResults) els.deskResults.innerHTML = "";
  if (els.deskHome) els.deskHome.hidden = false;
  renderDeskHome("");
});
setSelected(S.lat, S.lng);
