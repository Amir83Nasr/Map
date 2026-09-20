// ── STATE ───────────────────────────────────────────────────
const S = {
  mode: "fixed", lat: 34.6416, lng: 50.8764,
  address: "", resolving: false, gpsWatch: false,
};
const $ = (id) => document.getElementById(id);
const els = {
  addr: $("addr"), coords: $("coords"), pin: $("centerPin"),
  cross: $("crosshair"), hint: $("hint"), toast: $("toast"),
  gps: $("gpsBtn"), confirm: $("confirm"), results: $("results"),
  searchBar: $("searchBar"), searchInput: $("searchInput"),
  wrap: document.querySelector(".map-wrap"),
};

// ── MAP ─────────────────────────────────────────────────────
const map = L.map("map", { zoomControl: false }).setView([S.lat, S.lng], 14);
map.attributionControl.setPrefix(false);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19, attribution: "© OpenStreetMap",
}).addTo(map);

const marker = L.marker([S.lat, S.lng], { draggable: true }).addTo(map);

// ── GEOCODE API (swappable) ─────────────────────────────────
async function reverseGeocode(lat, lng) {
  if ($("devGeoErr").checked) throw new Error("simulated");
  const r = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=fa`,
    { headers: { Accept: "application/json" } }
  );
  if (!r.ok) throw new Error("http " + r.status);
  const j = await r.json();
  if (!j.display_name) throw new Error("empty");
  return j.display_name;
}

// debounced resolve: only after user stops
let revTimer = 0, revSeq = 0;
function scheduleResolve(lat, lng, delay = 600) {
  clearTimeout(revTimer);
  revTimer = setTimeout(() => resolveAddress(lat, lng), delay);
}
async function resolveAddress(lat, lng) {
  const seq = ++revSeq;
  S.resolving = true;
  els.addr.classList.add("skeleton");
  els.addr.textContent = "در حال تعیین آدرس...";
  renderCoords();
  try {
    if ($("devLoad").checked) await new Promise((r) => setTimeout(r, 1500));
    const a = await reverseGeocode(lat, lng);
    if (seq !== revSeq) return; // stale
    S.address = a;
  } catch {
    if (seq !== revSeq) return;
    S.address = "";
  } finally {
    if (seq !== revSeq) return;
    S.resolving = false;
    renderSheet();
  }
}

// ── RENDER ──────────────────────────────────────────────────
function fa(n, d = 5) {
  return Number(n).toFixed(d).replace(/\d/g, (c) => "۰۱۲۳۴۵۶۷۸۹"[c]);
}
function renderCoords() {
  const show = $("devCoords").checked;
  els.coords.textContent = show ? `Lat: ${S.lat.toFixed(5)} · Lng: ${S.lng.toFixed(5)}` : "";
  els.coords.style.display = show ? "" : "none";
}
function renderSheet() {
  els.addr.classList.remove("skeleton");
  const showAddr = $("devAddr").checked;
  els.addr.textContent = !showAddr ? "نمایش آدرس خاموش است"
    : S.address || "آدرس دقیق در دسترس نیست";
  renderCoords();
  $("devLat").textContent = S.lat.toFixed(5);
  $("devLng").textContent = S.lng.toFixed(5);
  $("devMode").textContent = S.mode;
  $("devAddress").textContent = S.address || "—";
}

function setSelected(lat, lng, { moveMarker = true, moveMap = false, resolve = true } = {}) {
  S.lat = lat; S.lng = lng;
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

// ── MODES ───────────────────────────────────────────────────
const HINTS = {
  fixed: "نقشه را جابه‌جا کنید تا نشانگر روی موقعیت قرار گیرد",
  drag: "پین را بکشید و روی موقعیت رها کنید",
  cross: "نقشه را حرکت دهید؛ مرکز نقشه انتخاب می‌شود",
  tap: "روی هر نقطه از نقشه ضربه بزنید",
  search: "آدرس را جستجو کنید یا پین را جابه‌جا کنید",
  gps: "در حال تلاش برای موقعیت فعلی؛ یا دستی انتخاب کنید",
};
function setMode(m) {
  S.mode = m;
  document.querySelectorAll(".mode").forEach((b) => b.classList.toggle("active", b.dataset.mode === m));
  const centerModes = m === "fixed" || m === "cross";
  els.pin.style.display = m === "fixed" ? "" : "none";
  els.cross.classList.toggle("hidden", m !== "cross");
  els.searchBar.classList.toggle("hidden", m !== "search");
  marker.options.draggable = m !== "fixed" && m !== "cross";
  // refresh draggable state
  if (marker.dragging) marker.dragging[m !== "fixed" && m !== "cross" ? "enable" : "disable"]();
  marker.setOpacity(centerModes ? 0 : 1);
  els.hint.textContent = HINTS[m] || "";
  renderSheet();
  if (centerModes) {
    const c = map.getCenter();
    setSelected(c.lat, c.lng, { moveMarker: false });
  }
  if (m === "gps") locate(true);
}
document.querySelectorAll(".mode").forEach((b) => b.onclick = () => setMode(b.dataset.mode));

// ── MAP EVENTS ──────────────────────────────────────────────
let moveTimer = 0;
map.on("movestart", () => els.wrap.classList.add("map-moving"));
map.on("move", () => {
  if (S.mode === "fixed" || S.mode === "cross") {
    const c = map.getCenter();
    S.lat = c.lat; S.lng = c.lng;
    marker.setLatLng([c.lat, c.lng]);
    renderCoords();
  }
});
map.on("moveend", () => {
  els.wrap.classList.remove("map-moving");
  if (S.mode === "cross") {
    els.cross.classList.remove("pulse");
    void els.cross.offsetWidth;
    els.cross.classList.add("pulse");
  }
  if (S.mode === "fixed" || S.mode === "cross") {
    const c = map.getCenter();
    clearTimeout(moveTimer);
    moveTimer = setTimeout(() => setSelected(c.lat, c.lng, { moveMarker: false }), 350);
  }
});
map.on("click", (e) => {
  if (S.mode === "tap") setSelected(e.latlng.lat, e.latlng.lng);
});
marker.on("dragstart", () => marker.getElement()?.classList.add("dragging-pin"));
marker.on("dragend", () => {
  marker.getElement()?.classList.remove("dragging-pin");
  const p = marker.getLatLng();
  setSelected(p.lat, p.lng, { moveMarker: false });
});

// ── GPS ─────────────────────────────────────────────────────
function locate(first = false) {
  if ($("devNoGps").checked) {
    toast("دسترسی به موقعیت رد شد؛ دستی انتخاب کنید");
    scheduleResolve(S.lat, S.lng, 100);
    return;
  }
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
    () => {
      els.gps.classList.remove("locating");
      toast("دسترسی به موقعیت رد شد؛ دستی انتخاب کنید");
      if (first) scheduleResolve(S.lat, S.lng, 100);
    },
    { timeout: 10000 }
  );
}
els.gps.onclick = () => locate(false);

// ── SEARCH ──────────────────────────────────────────────────
let searchTimer = 0;
async function search(q) {
  els.results.innerHTML = `<div class="err">در حال جستجو...</div>`;
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&accept-language=fa&limit=5&q=${encodeURIComponent(q)}`
    );
    if (!r.ok) throw new Error();
    const list = await r.json();
    if (!list.length) {
      els.results.innerHTML = `<div class="err">نتیجه‌ای پیدا نشد؛ عبارت دیگری امتحان کنید</div>`;
      return;
    }
    els.results.innerHTML = "";
    for (const it of list) {
      const b = document.createElement("button");
      b.textContent = it.display_name;
      b.onclick = () => {
        els.results.innerHTML = "";
        setSelected(parseFloat(it.lat), parseFloat(it.lon), { moveMap: true });
      };
      els.results.appendChild(b);
    }
  } catch {
    els.results.innerHTML = `<div class="err">خطا در جستجو؛ اتصال را بررسی کنید</div>`;
  }
}
$("searchBtn").onclick = () => {
  const q = els.searchInput.value.trim();
  if (q) search(q);
};
els.searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  const q = els.searchInput.value.trim();
  if (q.length > 2) searchTimer = setTimeout(() => search(q), 700);
});

// ── SHEET ACTIONS ───────────────────────────────────────────
els.confirm.onclick = async () => {
  els.confirm.disabled = true;
  els.confirm.textContent = "در حال ثبت...";
  await new Promise((r) => setTimeout(r, 900));
  els.confirm.disabled = false;
  els.confirm.textContent = "تأیید این موقعیت";
  toast(`موقعیت ثبت شد (${fa(S.lat)}, ${fa(S.lng)})`);
};
$("pickOnMap").onclick = () => {
  setMode(S.mode === "tap" ? S.mode : "tap");
  document.querySelector(".map-wrap").scrollIntoView({ behavior: "smooth", block: "nearest" });
  toast("روی نقشه ضربه بزنید");
};

// ── DEV PANEL ───────────────────────────────────────────────
$("devToggle").onclick = () => $("devPanel").classList.toggle("hidden");
$("devDefault").onchange = (e) => {
  const [lat, lng] = e.target.value.split(",").map(Number);
  setSelected(lat, lng, { moveMap: true });
};
["devCoords", "devAddr"].forEach((id) => $(id).onchange = renderSheet);

// ── INIT ────────────────────────────────────────────────────
setMode("fixed");
setSelected(S.lat, S.lng, { moveMarker: true });
