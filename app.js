// ── STATE ────────────────────────────────────────────────
const S = {
  mode: "snap", lat: 35.6892, lng: 51.3890,
  address: "", parts: null, resolving: false,
  taps: 0, permState: "نامشخص", geoState: "idle", searchState: "idle",
};
const $ = (id) => document.getElementById(id);
const els = {
  addr: $("addr"), meta: $("addrMeta"), coords: $("coords"),
  label: $("addrLabel"), pin: $("centerPin"), cross: $("crosshair"),
  hint: $("hint"), toast: $("toast"), gps: $("gpsBtn"),
  confirm: $("confirm"), ghost: $("ghostBtn"), results: $("results"),
  searchInput: $("searchInput"), wrap: document.querySelector(".map-wrap"),
  modal: $("permModal"), permHint: $("permHint"),
};

// ── MAP ──────────────────────────────────────────────────
const map = L.map("map", { zoomControl: false }).setView([S.lat, S.lng], 14);
map.attributionControl.setPrefix(false);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19, attribution: "© OpenStreetMap",
}).addTo(map);

const marker = L.marker([S.lat, S.lng], {
  draggable: true,
  icon: L.divIcon({ className: "pin-icon", html: `<i data-lucide="map-pin"></i>`, iconSize: [36, 36], iconAnchor: [18, 34] }),
}).addTo(map);
if (window.lucide) lucide.createIcons();
function refreshIcons() { if (window.lucide) lucide.createIcons(); }

// ── GEOCODE API ──────────────────────────────────────────
async function reverseGeocode(lat, lng) {
  if ($("devApiErr").checked) throw new Error("simulated api error");
  const r = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=fa`,
    { headers: { Accept: "application/json" } }
  );
  if (!r.ok) throw new Error("http " + r.status);
  const j = await r.json();
  if (!j.display_name) throw new Error("empty result");
  return { text: j.display_name, parts: j.address || null };
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
  els.addr.classList.add("skeleton");
  els.addr.textContent = "در حال پیدا کردن آدرس...";
  renderCoords();
  try {
    const { text, parts } = await reverseGeocode(lat, lng);
    if (seq !== revSeq) return;
    S.address = text; S.parts = parts;
  } catch {
    if (seq !== revSeq) return;
    S.address = ""; S.parts = null;
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
function renderCoords() {
  const show = $("devCoords").checked;
  els.coords.textContent = show ? `Lat: ${S.lat.toFixed(5)} · Lng: ${S.lng.toFixed(5)}` : "";
  els.coords.style.display = show ? "" : "none";
}
function renderMeta() {
  const isDigi = S.mode === "digi";
  els.meta.classList.toggle("hidden", !isDigi);
  if (!isDigi || !S.parts) { if (!isDigi) els.meta.textContent = ""; return; }
  const p = S.parts;
  const prov = p.state || "—";
  const city = p.city || p.town || p.village || p.county || "—";
  const road = [p.road, p.suburb, p.neighbourhood].filter(Boolean).join("، ") || "—";
  els.meta.textContent = `استان: ${prov} · شهر: ${city} · ${road}`;
}
function renderSheet() {
  els.addr.classList.remove("skeleton");
  const showAddr = $("devAddr").checked;
  els.addr.textContent = !showAddr ? "نمایش آدرس خاموش است"
    : S.address || "آدرس دقیق پیدا نشد";
  renderMeta();
  renderCoords();
  $("devLat").textContent = S.lat.toFixed(5);
  $("devLng").textContent = S.lng.toFixed(5);
  $("devMode").textContent = S.mode;
  $("devAddress").textContent = S.address || "—";
  $("devPerm").textContent = S.permState;
  $("devGeo").textContent = S.geoState;
  $("devSearch").textContent = S.searchState;
  $("devTaps").textContent = String(S.taps);
}

function setSelected(lat, lng, { moveMarker = true, moveMap = false, resolve = true } = {}) {
  S.lat = lat; S.lng = lng; S.taps += 1;
  if (moveMarker) marker.setLatLng([lat, lng]);
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

// ── MODES ────────────────────────────────────────────────
const MODES = {
  snap:   { cta: "تأیید موقعیت", ghost: "استفاده از موقعیت فعلی", label: "موقعیت انتخاب‌شده", hint: "نقشه را جابه‌جا کنید تا نشانگر روی موقعیت قرار گیرد", ph: "جستجوی آدرس یا مکان", center: true, pin: true },
  market: { cta: "تأیید آدرس", ghost: "تغییر موقعیت روی نقشه", label: "آدرس تحویل", hint: "پین را بکشید یا روی نقشه ضربه بزنید", ph: "جستجوی آدرس تحویل", center: false, drag: true, tap: true },
  digi:   { cta: "تأیید و ادامه", ghost: null, label: "آدرس", hint: "اول جستجو کنید، بعد روی نقشه دقیق کنید", ph: "جستجوی شهر، خیابان، محله...", center: false, drag: true, tap: true },
  fixed:  { cta: "تأیید موقعیت", ghost: null, label: "موقعیت انتخاب‌شده", hint: "نقشه را حرکت دهید؛ پین ثابت است", ph: "جستجوی آدرس یا مکان", center: true, pin: true },
  drag:   { cta: "تأیید موقعیت", ghost: null, label: "موقعیت انتخاب‌شده", hint: "پین را بکشید و روی موقعیت رها کنید", ph: "جستجوی آدرس یا مکان", center: false, drag: true, tap: true },
  cross:  { cta: "تأیید مرکز نقشه", ghost: null, label: "مرکز نقشه", hint: "نقشه را حرکت دهید؛ مرکز نقشه انتخاب می‌شود", ph: "جستجوی آدرس یا مکان", center: true, cross: true },
  search: { cta: "تأیید موقعیت", ghost: null, label: "موقعیت انتخاب‌شده", hint: "جستجو کنید یا پین را جابه‌جا کنید", ph: "جستجوی آدرس یا مکان", center: false, drag: true, tap: true },
};
function setMode(m) {
  S.mode = m;
  const cfg = MODES[m];
  document.querySelectorAll(".mode").forEach((b) => b.classList.toggle("active", b.dataset.mode === m));
  els.pin.style.display = cfg.pin ? "" : "none";
  els.cross.classList.toggle("hidden", !cfg.cross);
  els.searchInput.placeholder = cfg.ph;
  els.confirm.textContent = cfg.cta;
  els.label.textContent = cfg.label;
  els.hint.textContent = cfg.hint;
  if (cfg.ghost) { els.ghost.textContent = cfg.ghost; els.ghost.classList.remove("hidden"); }
  else els.ghost.classList.add("hidden");
  els.results.hidden = true; els.results.innerHTML = "";
  const draggable = !!cfg.drag;
  if (marker.dragging) marker.dragging[draggable ? "enable" : "disable"]();
  marker.setOpacity(cfg.center ? 0 : 1);
  renderSheet();
  if (cfg.center) {
    const c = map.getCenter();
    setSelected(c.lat, c.lng, { moveMarker: false });
  }
}
document.querySelectorAll(".mode").forEach((b) => b.onclick = () => setMode(b.dataset.mode));

// ── MAP EVENTS ───────────────────────────────────────────
let moveTimer = 0;
map.on("movestart", () => els.wrap.classList.add("map-moving"));
map.on("move", () => {
  if (!MODES[S.mode].center) return;
  const c = map.getCenter();
  S.lat = c.lat; S.lng = c.lng;
  renderCoords();
});
map.on("moveend", () => {
  els.wrap.classList.remove("map-moving");
  if (S.mode === "cross") {
    els.cross.classList.remove("pulse");
    void els.cross.offsetWidth;
    els.cross.classList.add("pulse");
  }
  if (MODES[S.mode].center) {
    const c = map.getCenter();
    clearTimeout(moveTimer);
    moveTimer = setTimeout(() => setSelected(c.lat, c.lng, { moveMarker: false }), 350);
  }
});
map.on("click", (e) => {
  if (MODES[S.mode].tap) setSelected(e.latlng.lat, e.latlng.lng);
});
marker.on("dragstart", () => marker.getElement()?.classList.add("dragging-pin"));
marker.on("dragend", () => {
  marker.getElement()?.classList.remove("dragging-pin");
  const p = marker.getLatLng();
  setSelected(p.lat, p.lng, { moveMarker: false });
});

// ── GPS / PERMISSION ─────────────────────────────────────
function showModal(wasDenied) {
  els.permHint.classList.toggle("hidden", !wasDenied);
  els.modal.classList.remove("hidden");
}
function hideModal() { els.modal.classList.add("hidden"); }
function locate() {
  if ($("devNoGps").checked) {
    S.permState = "denied (شبیه‌سازی)";
    renderSheet();
    showModal(true);
    scheduleResolve(S.lat, S.lng, 100);
    return;
  }
  if (!navigator.geolocation) {
    S.geoState = "unsupported";
    renderSheet();
    toast("GPS در این مرورگر پشتیبانی نمی‌شود");
    return;
  }
  S.geoState = "locating…";
  S.searchState = S.searchState; // no-op, keep panel stable
  els.gps.classList.add("locating");
  els.hint.textContent = "در حال دریافت موقعیت...";
  renderSheet();
  navigator.geolocation.getCurrentPosition(
    (p) => {
      els.gps.classList.remove("locating");
      S.permState = "granted"; S.geoState = "fixed";
      setSelected(p.coords.latitude, p.coords.longitude, { moveMap: true });
      els.hint.textContent = MODES[S.mode].hint;
      toast("موقعیت فعلی شما ثبت شد");
    },
    (err) => {
      els.gps.classList.remove("locating");
      els.hint.textContent = MODES[S.mode].hint;
      if (err && err.code === err.PERMISSION_DENIED) {
        S.permState = "denied"; S.geoState = "error";
        renderSheet();
        showModal(true);
      } else if (err && err.code === err.TIMEOUT) {
        S.geoState = "timeout";
        renderSheet();
        toast("دریافت موقعیت طول کشید؛ دستی انتخاب کنید");
        scheduleResolve(S.lat, S.lng, 100);
      } else {
        S.geoState = $("devGeoErr").checked ? "error (شبیه‌سازی)" : "error";
        renderSheet();
        toast("موقعیت در دسترس نیست؛ دستی انتخاب کنید");
        scheduleResolve(S.lat, S.lng, 100);
      }
    },
    { timeout: 10000 }
  );
}
els.gps.onclick = locate;
$("permRetry").onclick = () => { hideModal(); locate(); };
$("permManual").onclick = () => { hideModal(); toast("روی نقشه انتخاب کنید"); };
els.modal.addEventListener("click", (e) => { if (e.target === els.modal) hideModal(); });
if (navigator.permissions?.query) {
  navigator.permissions.query({ name: "geolocation" }).then((st) => {
    S.permState = st.state;
    renderSheet();
    st.onchange = () => { S.permState = st.state; renderSheet(); };
  }).catch(() => {});
}

// ── SEARCH ───────────────────────────────────────────────
let searchTimer = 0;
async function search(q) {
  S.searchState = "loading";
  els.results.hidden = false;
  els.results.innerHTML = `<div class="err">در حال جستجو...</div>`;
  renderSheet();
  try {
    if ($("devApiErr").checked) throw new Error("simulated api error");
    const list = await searchLocation(q);
    if (!list.length) {
      S.searchState = "empty";
      els.results.innerHTML = `<div class="err">نتیجه‌ای پیدا نشد؛ عبارت دیگری امتحان کنید</div>`;
      renderSheet();
      return;
    }
    S.searchState = `${list.length} result`;
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
        S.searchState = "selected";
        setSelected(parseFloat(it.lat), parseFloat(it.lon), { moveMap: true });
      };
      els.results.appendChild(b);
    }
    refreshIcons();
  } catch {
    S.searchState = "error";
    els.results.innerHTML = `<div class="err">خطا در جستجو؛ اتصال را بررسی کنید</div>`;
  }
  renderSheet();
}
function submitSearch() {
  const q = els.searchInput.value.trim();
  if (q) { clearTimeout(searchTimer); search(q); }
}
$("searchBtn").onclick = submitSearch;
els.searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  const q = els.searchInput.value.trim();
  if (q.length < 3) { els.results.hidden = true; els.results.innerHTML = ""; return; }
  searchTimer = setTimeout(() => search(q), 600);
});

// ── SHEET ACTIONS ────────────────────────────────────────
els.confirm.onclick = async () => {
  els.confirm.disabled = true;
  els.confirm.textContent = "در حال ثبت...";
  await new Promise((r) => setTimeout(r, 800));
  els.confirm.disabled = false;
  els.confirm.textContent = MODES[S.mode].cta;
  S.taps += 1;
  toast(`موقعیت ثبت شد (${fa(S.lat)}, ${fa(S.lng)})`);
  renderSheet();
};
els.ghost.onclick = () => {
  if (S.mode === "snap") locate();
  else if (S.mode === "market") {
    map.setView([S.lat, S.lng], Math.max(map.getZoom(), 15));
    toast("نقشه روی آدرس تنظیم شد");
  }
};

// ── DEV PANEL ────────────────────────────────────────────
$("devToggle").onclick = () => $("devPanel").classList.toggle("hidden");
$("devDefault").onchange = (e) => {
  const [lat, lng] = e.target.value.split(",").map(Number);
  setSelected(lat, lng, { moveMap: true });
};
$("devReset").onclick = () => {
  els.searchInput.value = "";
  els.results.hidden = true; els.results.innerHTML = "";
  ["devNoGps", "devGeoErr", "devApiErr"].forEach((id) => $(id).checked = false);
  S.taps = 0; S.geoState = "idle"; S.searchState = "idle";
  $("devDefault").value = "35.6892,51.3890";
  setSelected(35.6892, 51.3890, { moveMap: true });
  toast("دمو ریست شد");
};
["devCoords", "devAddr"].forEach((id) => $(id).onchange = renderSheet);
$("zoomIn").onclick = () => map.zoomIn();
$("zoomOut").onclick = () => map.zoomOut();

// ── INIT ─────────────────────────────────────────────────
setMode("snap");
setSelected(S.lat, S.lng, { moveMarker: true });
