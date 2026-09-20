// ── STATE ────────────────────────────────────────────────
const S = {
  lat: 35.6892, lng: 51.3890,
  address: "", resolving: false,
};
const $ = (id) => document.getElementById(id);
const els = {
  toast: $("toast"), gps: $("gpsBtn"),
  confirm: $("confirm"), results: $("results"),
  searchInput: $("searchInput"), wrap: document.querySelector(".map-wrap"),
  modal: $("permModal"), permHint: $("permHint"),
};

// ── MAP ──────────────────────────────────────────────────
const map = L.map("map", { zoomControl: false, attributionControl: false }).setView([S.lat, S.lng], 14);
L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
  maxZoom: 19, subdomains: "abcd",
}).addTo(map);

if (window.lucide) lucide.createIcons();
function refreshIcons() { if (window.lucide) lucide.createIcons(); }

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
    `https://nominatim.openstreetmap.org/search?format=jsonv2&accept-language=fa&limit=5&q=${encodeURIComponent(query)}`,
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
  els.searchInput.placeholder = "در حال پیدا کردن آدرس...";
  try {
    const text = await reverseGeocode(lat, lng);
    if (seq !== revSeq) return;
    S.address = text;
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
function fa(n, d = 5) {
  return Number(n).toFixed(d).replace(/\d/g, (c) => "۰۱۲۳۴۵۶۷۸۹"[c]);
}
function renderSheet() {
  els.searchInput.placeholder = "جستجوی آدرس یا مکان";
  if (document.activeElement !== els.searchInput) {
    els.searchInput.value = S.address || "";
  }
}

function setSelected(lat, lng, { moveMap = false, resolve = true } = {}) {
  S.lat = lat; S.lng = lng;
  if (moveMap) map.setView([lat, lng], Math.max(map.getZoom(), 15));
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
let moveTimer = 0;
map.on("movestart", () => els.wrap.classList.add("map-moving"));
map.on("move", () => {
  const c = map.getCenter();
  S.lat = c.lat; S.lng = c.lng;
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
      setSelected(p.coords.latitude, p.coords.longitude, { moveMap: true });
      toast("موقعیت فعلی شما ثبت شد");
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

// ── SEARCH ───────────────────────────────────────────────
let searchTimer = 0;
async function search(q) {
  els.results.hidden = false;
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
      b.querySelector("b").textContent = name;
      b.querySelector("small").textContent = it.display_name;
      b.onclick = () => {
        els.results.hidden = true; els.results.innerHTML = "";
        setSelected(parseFloat(it.lat), parseFloat(it.lon), { moveMap: true });
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
  if (q.length < 3) { els.results.hidden = true; els.results.innerHTML = ""; return; }
  searchTimer = setTimeout(() => search(q), 600);
});
els.searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") { clearTimeout(searchTimer); submitSearch(); }
});

// ── SHEET ACTIONS ────────────────────────────────────────
els.confirm.onclick = async () => {
  els.confirm.disabled = true;
  els.confirm.textContent = "در حال ثبت...";
  await new Promise((r) => setTimeout(r, 800));
  els.confirm.disabled = false;
  els.confirm.textContent = "تایید مبدا";
  toast(`موقعیت ثبت شد (${fa(S.lat)}, ${fa(S.lng)})`);
  renderSheet();
};

// ── INIT ─────────────────────────────────────────────────
setSelected(S.lat, S.lng);
