
// ================= App shell: state, panels, settings, PWA wiring =================
import * as E from './engines.js';
import { t as tr, LOCALES, UI_LANGS, CAL_LANGS, fmtDateParts, fmtClock, fmtNum, resolveNS, digits } from './i18n.js';
import { DEFAULTS, sanitize, getPath, putPath, resolveLocation, countryHint, TZ_TABLE, CITIES, HOLIDAYS, COUNTRY_CODES, HOLIDAY_TYPES, flagOf, validateHolidayDataset, TZ_VERSION, ENGINE_VERSION as _ev } from './data.js';
import { LOCALE_VERSION } from './i18n.js';
import { Sky, skyPalette } from './theme.js';
import { embedSnippet } from './widget.js';

const APP_VERSION = '1.0.0', STORE_KEY = 'dcsw.settings.v1', HOL_KEY = 'dcsw.holidays.override';
const $ = s => document.querySelector(s);
let storageOk = true;
function loadSettings() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return sanitize(JSON.parse(raw));
  } catch { storageOk = false; }
  const s = structuredClone(DEFAULTS);
  const navs = navigator.languages || [navigator.language || 'en'];
  for (const n of navs) { const l = String(n).slice(0, 2).toLowerCase(); if (UI_LANGS.includes(l)) { s.language.app = l; s.language.gregorian = l; break; } }
  try { const tz = Intl.DateTimeFormat().resolvedOptions().timeZone; const hint = countryHint(tz); if (hint) s.holidays.countries = [hint]; } catch {}
  return s;
}
function saveSettings() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S.settings)); }
  catch { if (storageOk) { storageOk = false; toast(t('w.storage')); } }
}

const S = {
  settings: loadSettings(), now: Date.now(), tz: 'UTC', loc: null, solar: null, moon: null,
  dates: null, hols: [], holsToday: [], holDataset: HOLIDAYS,
  view: { tab: 'today', y: 0, m: 0, selJdn: 0, range: '30', query: '' },
  prevAlt: null, lastDateKey: '', dirty: true, geoBusy: false
};
try { const o = localStorage.getItem(HOL_KEY); if (o) { const d = JSON.parse(o); if (validateHolidayDataset(d)) S.holDataset = d; } } catch {}

const t = (k, v) => tr(S.settings.language.app, k, v);
const N = (n, dec = 0, group = false) => fmtNum(n, S.settings.language.app, S.settings.language.numbers, dec, group);
const pct = () => (LOCALES[S.settings.language.app] || LOCALES.en).pct;
const uiDir = () => S.settings.language.direction === 'auto' ? (LOCALES[S.settings.language.app] || LOCALES.en).dir : S.settings.language.direction;
const gLang = () => S.settings.language.gregorian, hLang = () => S.settings.language.hijri;
const gDir = () => (LOCALES[gLang()] || LOCALES.en).dir, hDir = () => (LOCALES[hLang()] || LOCALES.en).dir;
const method = () => S.settings.calendar.method, adj = () => S.settings.calendar.adj;
const periodName = key => { const o = S.settings.solar.periodNames[S.settings.language.app]; return (o && o[key]) || t('p.' + key); };
function fmtG(jdn, style, lang) { const g = E.jdnToGreg(jdn); return fmtDateParts({ ...g, wd: E.weekdayOf(jdn) }, lang || gLang(), 'gregorian', style || S.settings.calendar.style, S.settings.language.numbers); }
function fmtH(jdn, style, lang) { const h = E.toHijri(jdn, method(), adj()); return fmtDateParts({ ...h, wd: E.weekdayOf(jdn) }, lang || hLang(), 'hijri', style || S.settings.calendar.style, S.settings.language.numbers); }
function fmtT(ms) { return ms == null ? '—' : fmtClock(E.tzParts(ms, S.tz), S.settings.language.app, S.settings.solar.clock, false, S.settings.language.numbers); }
const reduced = () => S.settings.theme.reducedMotion === 'reduce' || (S.settings.theme.reducedMotion === 'auto' && matchMedia('(prefers-reduced-motion: reduce)').matches);

/* ---------- DOM helpers ---------- */
let UID = 0;
function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (k === 'value') e.value = v;
    else if (k === 'checked') e.checked = !!v;
    else e.setAttribute(k, v === true ? '' : String(v));
  }
  for (const kid of kids.flat(9)) { if (kid == null || kid === false) continue; e.append(kid.nodeType ? kid : document.createTextNode(String(kid))); }
  return e;
}
function svgEl(tag, attrs = {}, ...kids) {
  const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, String(v));
  for (const kid of kids.flat(9)) if (kid != null) e.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return e;
}
const ICONS = {
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z',
  calendar: 'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2ZM4 9h16M8 2v4m8-4v4',
  star: 'M12 3l2.7 5.6 6.1.8-4.5 4.3 1.1 6-5.4-2.9-5.4 2.9 1.1-6L3.2 9.4l6.1-.8Z',
  settings: 'M4 7h10m4 0h2M4 12h2m4 0h10M4 17h10m4 0h2M14 5v4M6 10v4M14 15v4',
  pin: 'M12 21s-6-5.1-6-10a6 6 0 1 1 12 0c0 4.9-6 10-6 10Zm0-8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  warn: 'M12 3 2 20h20L12 3Zm0 7v4m0 3v.5',
  x: 'M5 5l14 14M19 5 5 19',
  chevL: 'M15 18l-6-6 6-6', chevR: 'M9 6l6 6-6 6', dblL: 'M11 18l-6-6 6-6m8 12-6-6 6-6', dblR: 'M13 6l6 6-6 6M5 6l6 6-6 6',
  download: 'M12 3v12m0 0-4-4m4 4 4-4M4 21h16', upload: 'M12 21V9m0 0-4 4m4-4 4 4M4 3h16',
  refresh: 'M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6', clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v5l3 3',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-9-9h18M12 3c2.5 2.4 3.8 5.6 3.8 9S14.5 18.6 12 21c-2.5-2.4-3.8-5.6-3.8-9S9.5 5.4 12 3Z',
  layout: 'M4 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Zm0 7h16M12 12v8',
  sparkles: 'M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6ZM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8ZM5 3l.7 1.8L7.5 5.5l-1.8.7L5 8l-.7-1.8L2.5 5.5l1.8-.7Z',
  copy: 'M9 9h10v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9Zm-2 6H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2',
  check: 'M4 12l5 5L20 6', install: 'M12 3v10m0 0-4-4m4 4 4-4M5 21h14a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2',
  database: 'M12 8c4.4 0 8-1.3 8-3s-3.6-3-8-3-8 1.3-8 3 3.6 3 8 3Zm8-3v14c0 1.7-3.6 3-8 3s-8-1.3-8-3V5m16 7c0 1.7-3.6 3-8 3s-8-1.3-8-3',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v.5m0 3V16'
};
function icon(name, size = 18, cls = '') {
  return svgEl('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', class: cls }, svgEl('path', { d: ICONS[name] || ICONS.info }));
}
function moonSVG(k, elong, roll, size, showRoll = true) {
  const r = 40, tt = r * Math.cos(elong * Math.PI / 180);
  const path = `M ${-r} 0 A ${r} ${r} 0 0 1 ${r} 0 A ${r} ${Math.abs(tt).toFixed(2)} 0 0 ${tt > 0 ? 1 : 0} ${-r} 0 Z`;
  const id = 'mg' + (++UID);
  const g = svgEl('g', { transform: `rotate(${showRoll && roll != null ? roll.toFixed(1) : 0})` },
    svgEl('circle', { r, fill: '#252b4a', stroke: 'rgba(205,215,255,.45)', 'stroke-width': .8 }),
    svgEl('circle', { cx: -12, cy: 8, r: 7, fill: 'rgba(255,255,255,.05)' }),
    svgEl('circle', { cx: 14, cy: -6, r: 5, fill: 'rgba(255,255,255,.05)' }),
    svgEl('circle', { cx: 6, cy: 18, r: 4, fill: 'rgba(255,255,255,.04)' }),
    svgEl('path', { d: path, fill: `url(#${id})` }));
  return svgEl('svg', { width: size, height: size, viewBox: '-46 -46 92 92', role: 'img' },
    svgEl('defs', {}, svgEl('radialGradient', { id }, svgEl('stop', { offset: 0, 'stop-color': '#fdf7de' }), svgEl('stop', { offset: 1, 'stop-color': '#d6cfb4' }))), g);
}
function toast(msg, opts = {}) {
  const box = $('#toasts');
  const tt = el('div', { class: 'toast', role: 'status' }, el('span', { text: msg }),
    opts.action ? el('button', { type: 'button', text: opts.action, onclick: () => { opts.onAction?.(); tt.remove(); } }) : null);
  box.appendChild(tt);
  setTimeout(() => tt.remove(), opts.timeout || 6000);
}
function announce(msg) { const l = $('#live'); l.textContent = ''; setTimeout(() => { l.textContent = msg; }, 60); }

/* ---------- computation ---------- */
function recompute() {
  S.now = Date.now();
  const deviceTz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; } })();
  S.loc = resolveLocation(S.settings, deviceTz);
  S.tz = S.loc.tz;
  const prev = S.solar;
  S.solar = E.solarNow(S.now, S.loc.lat, S.loc.lon, S.tz, S.settings.solar);
  S.solar.trend = prev ? S.solar.alt - prev.alt : 0;
  S.moon = E.moonNow(S.now, S.loc.lat, S.loc.lon, S.tz, !S.loc.missing);
  const jdn = E.civilJdnOf(S.now, S.tz), ro = S.settings.calendar.rollover;
  let hAnchor = jdn, evening = false, roFallback = false;
  if (ro.mode === 'sunset') {
    if (S.solar.ev.sunset != null) { if (S.now >= S.solar.ev.sunset + ro.offset * 60000) { hAnchor = jdn + 1; evening = true; } }
    else roFallback = true;
  }
  const gJdn = ro.applyTo === 'both' && evening ? jdn + 1 : jdn;
  S.dates = { jdn, gJdn, hAnchor, evening, roFallback, g: E.jdnToGreg(gJdn), h: E.toHijri(hAnchor, method(), adj()) };
  const yr = S.dates.g.y;
  const holKey = `${yr}|${S.settings.holidays.countries.join()}|${method()}|${adj()}|${S.holDataset.version}`;
  if (S._holKey !== holKey) {
    S._holKey = holKey;
    S.hols = E.expandHolidays(S.holDataset, S.settings.holidays.countries, [yr - 1, yr, yr + 1], method(), adj());
  }
  S.holsToday = filteredHols().filter(e2 => jdn >= e2.jdn && jdn < e2.jdn + e2.duration);
  sky.update(S.solar, S.moon);
  const pal = skyPalette(S.solar.alt, { mode: S.settings.theme.mode, custom: S.settings.theme.custom, systemDark: matchMedia('(prefers-color-scheme: dark)').matches });
  $('#metaTheme').setAttribute('content', pal.mid);
}
function filteredHols() {
  const h = S.settings.holidays;
  const ok = { national: h.national, religious: h.religious, observance: h.observances, bank: h.bank, regional: h.regional };
  return S.hols.filter(e2 => ok[e2.type]);
}
function locLabel() {
  const L = S.loc, lang = S.settings.language.app;
  if (L.source === 'city' && L.city) return lang === 'ar' ? L.city[5] : L.city[4];
  if (L.source === 'manual') return S.settings.location.label || `${N(L.lat, 2)}°, ${N(L.lon, 2)}°`;
  if (L.source === 'geo') return `${N(L.lat, 3)}°, ${N(L.lon, 3)}°`;
  if (L.place) return lang === 'ar' ? L.place[3] : L.place[2];
  return S.tz;
}

/* ---------- header / tabs / banners ---------- */
const TABS = [['today', 'clock'], ['calendar', 'calendar'], ['solar', 'sun'], ['moon', 'moon'], ['holidays', 'star'], ['settings', 'settings']];
let deferredInstall = null;
function renderHeader() {
  const h = $('#topbar'); h.innerHTML = '';
  const mark = svgEl('svg', { class: 'mark', viewBox: '0 0 32 32', 'aria-hidden': 'true' },
    svgEl('defs', {}, svgEl('linearGradient', { id: 'lgm', x1: 0, y1: 0, x2: 1, y2: 1 }, svgEl('stop', { offset: 0, 'stop-color': '#2f74d4' }), svgEl('stop', { offset: 1, 'stop-color': '#0a1434' }))),
    svgEl('rect', { x: 1, y: 1, width: 30, height: 30, rx: 8, fill: 'url(#lgm)' }),
    svgEl('circle', { cx: 12, cy: 21, r: 5, fill: '#ffb347' }),
    svgEl('path', { d: 'M23 8a8 8 0 1 0 3 12A9.5 9.5 0 0 1 23 8Z', fill: '#f2e9c9' }),
    svgEl('circle', { cx: 25, cy: 7, r: 1.2, fill: '#fff' }));
  h.append(el('div', { class: 'brand' }, mark, el('div', {}, el('h1', { text: t('app.title') }), el('small', { text: t('app.tag') }))), el('div', { class: 'spacer' }));
  const online = navigator.onLine, ready = !!navigator.serviceWorker?.controller;
  const pill = el('span', { class: 'pill' + (online ? '' : ' off'), id: 'netPill', title: t('app.tag') },
    el('i', { class: 'dot' }), el('span', { text: !online ? t('st.offline') : ready ? t('st.ready') : t('st.caching') }));
  h.append(pill);
  const modeBtn = el('button', { type: 'button', class: 'btn icon', title: t('set.tmode') + ': ' + t('set.t' + S.settings.theme.mode), 'aria-label': t('set.tmode'),
    onclick: () => { const modes = ['auto', 'dynamic', 'day', 'night', 'system', 'custom']; const i = modes.indexOf(S.settings.theme.mode);
      S.settings.theme.mode = modes[(i + 1) % modes.length]; saveSettings(); applySettings(); toast(t('set.tmode') + ': ' + t('set.t' + S.settings.theme.mode)); } }, icon('sparkles'));
  h.append(modeBtn,
    el('button', { type: 'button', class: 'btn icon', title: t('t.preview'), 'aria-label': t('t.preview'), onclick: openCompact }, icon('layout')),
    el('button', { type: 'button', class: 'btn primary', id: 'installBtn', style: { display: deferredInstall ? '' : 'none' }, onclick: async () => {
      if (!deferredInstall) return; deferredInstall.prompt(); const r = await deferredInstall.userChoice; deferredInstall = null; $('#installBtn').style.display = 'none';
      if (r.outcome === 'accepted') toast(t('c.install') + ' ✓'); } }, icon('install'), el('span', { text: t('c.install') })),
    el('button', { type: 'button', class: 'btn icon', title: t('tab.settings'), 'aria-label': t('tab.settings'), onclick: () => switchTab('settings') }, icon('settings')));
}
function renderTabs() {
  const nav = $('#tabs'); nav.innerHTML = ''; nav.setAttribute('aria-label', t('a.tabs'));
  for (const [id, ic] of TABS) {
    const b = el('button', { type: 'button', role: 'tab', id: 'tab-' + id, 'aria-controls': 'panel-' + id, 'aria-selected': S.view.tab === id, tabindex: S.view.tab === id ? 0 : -1,
      onclick: () => switchTab(id) }, icon(ic, 17), el('span', { text: t('tab.' + id) }));
    nav.append(b);
  }
  nav.onkeydown = ev => {
    const idx = TABS.findIndex(x => x[0] === S.view.tab);
    let n = null;
    const rtl = uiDir() === 'rtl';
    if (ev.key === 'ArrowRight') n = (idx + (rtl ? -1 : 1) + TABS.length) % TABS.length;
    else if (ev.key === 'ArrowLeft') n = (idx + (rtl ? 1 : -1) + TABS.length) % TABS.length;
    else if (ev.key === 'Home') n = 0; else if (ev.key === 'End') n = TABS.length - 1;
    if (n != null) { ev.preventDefault(); switchTab(TABS[n][0]); $('#tab-' + TABS[n][0]).focus(); }
  };
}
function renderBanners() {
  const box = $('#banners'); box.innerHTML = '';
  const add = msg => box.append(el('div', { class: 'banner', role: 'note' }, icon('warn', 17), el('span', { text: msg })));
  const y = S.dates.g.y;
  if (y < 2024 || y > 2100) add(t('w.clock', { y: N(y) }));
  if (!storageOk) add(t('w.storage'));
  if (S.loc.missing) add(t('w.noloc'));
  if (S.dates.roFallback) add(t('w.sunsetFallback'));
  if (method() === 'islamic-umalqura' && !E.uaqSupported()) add(t('w.uaq'));
}
function renderFoot() {
  $('#foot').innerHTML = '';
  $('#foot').append(el('span', { text: t('set.privacy') }), el('span', { text: `${t('app.title')} v${APP_VERSION} · ${t('st.ready')} ✓` }));
}

/* ---------- panels ---------- */
const P = {};
function switchTab(id) {
  S.view.tab = id;
  for (const [tid] of TABS) {
    const b = $('#tab-' + tid), p = $('#panel-' + tid);
    b?.setAttribute('aria-selected', tid === id); b?.setAttribute('tabindex', tid === id ? 0 : -1);
    p.hidden = tid !== id;
  }
  buildPanel(id, true);
}
function buildPanel(id, force) {
  const root = $('#panel-' + id);
  if (!force && !S.dirty) return;
  root.innerHTML = '';
  ({ today: buildToday, calendar: buildCalendar, solar: buildSolar, moon: buildMoon, holidays: buildHolidays, settings: buildSettings })[id](root);
}
function rebuildActive() { buildPanel(S.view.tab, true); }

/* ===== TODAY ===== */
function buildToday(root) {
  const s = S.settings, d = S.dates;
  const hero = el('div', { class: 'card hero' });
  const clock = el('div', { class: 'clock', dir: 'ltr', 'aria-label': t('a.clock') });
  const tzline = el('div', { class: 'tzline' });
  const period = el('span', { class: 'periodchip' });
  const primBox = el('div', { class: 'dateline' });
  const badges = el('div', { class: 'badges' });
  const statrow = el('div', { class: 'statrow' });
  hero.append(el('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' } }, clock, period), tzline, primBox, badges, statrow);
  const side = el('div', { class: 'stack' });
  const moonCard = el('div', { class: 'card' });
  const holCard = el('div', { class: 'card' });
  side.append(moonCard, holCard);
  root.append(el('div', { class: 'grid-today' }, hero, side));
  P.today = { clock, tzline, period, primBox, badges, statrow, moonCard, holCard };
  tickToday(true);
}
function dateBlock(which) {
  const s = S.settings, d = S.dates;
  const isH = which === 'hijri';
  const jdn = isH ? d.hAnchor : d.gJdn;
  const lang = isH ? hLang() : gLang(), dir = isH ? hDir() : gDir();
  const main = el('div', { class: 'primary', dir, role: 'text', 'aria-label': t(isH ? 'a.hijri' : 'a.greg') + ': ' + (isH ? fmtH(jdn) : fmtG(jdn)) }, el('bdi', { text: isH ? fmtH(jdn) : fmtG(jdn) }));
  const wrap = el('div', {}, main);
  if (s.language.bilingual) {
    const l2 = isH ? s.language.secondHij : s.language.secondGreg;
    if (l2 !== lang) wrap.append(el('div', { class: 'bilang', dir: (LOCALES[l2] || LOCALES.en).dir }, el('bdi', { text: isH ? fmtH(jdn, 'long', l2) : fmtG(jdn, 'long', l2) })));
  }
  return wrap;
}
function tickToday(full) {
  const r = P.today; if (!r || S.view.tab !== 'today') return;
  const s = S.settings, d = S.dates, so = S.solar, m = S.moon;
  r.clock.innerHTML = '';
  const tp = E.tzParts(S.now, S.tz);
  r.clock.append(el('bdi', { text: fmtClock(tp, s.language.app, s.solar.clock, s.solar.seconds, s.language.numbers) }));
  r.tzline.textContent = `${E.tzAbbrev(S.now, S.tz)} · UTC${E.tzOffsetMs(S.now, S.tz) >= 0 ? '+' : '−'}${fmtClock({ h: Math.floor(Math.abs(E.tzOffsetMs(S.now, S.tz)) / 3600000), mi: Math.floor(Math.abs(E.tzOffsetMs(S.now, S.tz)) % 3600000 / 60000), s: 0 }, 'en', '24', false, 'latn')} · ${S.tz}`;
  r.period.innerHTML = ''; r.period.append(icon(so.alt >= 0 ? 'sun' : 'moon', 15), el('bdi', { text: periodName(so.period) }));
  r.period.setAttribute('aria-label', t('a.period') + ': ' + periodName(so.period));
  if (full || r._dateKey !== d.gJdn + '|' + d.hAnchor + '|' + s.language.app + gLang() + hLang()) {
    r._dateKey = d.gJdn + '|' + d.hAnchor + '|' + s.language.app + gLang() + hLang();
    r.primBox.innerHTML = '';
    const prim = s.calendar.primary, sec = prim === 'gregorian' ? 'hijri' : 'gregorian';
    r.primBox.append(el('div', { class: 'micro', text: t(prim === 'gregorian' ? 't.greg' : 't.hijri') }), dateBlock(prim));
    if (s.calendar.showSecondary) r.primBox.append(el('div', { class: 'secondary' }, el('span', { class: 'micro', text: t(sec === 'gregorian' ? 't.greg' : 't.hijri') + ' · ' }), dateBlock(sec)));
    r.badges.innerHTML = '';
    if (d.evening) r.badges.append(el('span', { class: 'chip gold' }, icon('moon', 13), el('bdi', { text: t('t.evening') })));
    if (s.calendar.rollover.mode === 'sunset' && !d.roFallback)
      r.badges.append(el('span', { class: 'chip' }, el('bdi', { text: `${t('t.begins')} · ${fmtT(so.ev.sunset)}${s.calendar.rollover.offset ? ' +' + N(s.calendar.rollover.offset) + t('c.min') : ''}` })));
    if (adj() !== 0) r.badges.append(el('span', { class: 'chip est' }, el('bdi', { text: t('t.adj', { n: N(adj()) }) })));
    if (method() === 'islamic-astronomical') r.badges.append(el('span', { class: 'chip est' }, el('bdi', { text: '≈ ' + t('set.mastro') })));
    r.badges.append(el('span', { class: 'chip', title: t('t.method') }, icon('pin', 13), el('bdi', { text: locLabel() + (S.loc.approx ? ' · ' + t('c.approx') : '') })));
    // holidays
    r.holCard.innerHTML = '';
    r.holCard.append(el('div', { class: 'minihead' }, icon('star', 16), el('span', { class: 'micro', text: t('h.today') })));
    if (S.holsToday.length) {
      for (const h of S.holsToday.slice(0, 3)) r.holCard.append(holButton(h));
      if (S.holsToday.length > 3) r.holCard.append(el('div', { class: 'dim', style: { fontSize: '.75rem' }, text: '+' + N(S.holsToday.length - 3) }));
    } else {
      const next = filteredHols().find(e2 => e2.jdn > d.jdn);
      r.holCard.append(el('div', { class: 'dim', style: { fontSize: '.82rem' }, text: t('c.none') }));
      if (next) r.holCard.append(el('div', { style: { marginBlockStart: '8px' } }, holButton(next, true)));
    }
    // moon card
    r.moonCard.innerHTML = '';
    r.moonCard.append(el('div', { class: 'minihead' }, icon('moon', 16), el('span', { class: 'micro', text: t('t.moon') })));
    const ms = moonSVG(m.k, m.elong, m.roll, 52, s.moon.showRoll);
    ms.setAttribute('aria-label', t('a.moon') + ': ' + t('m.' + m.phaseKey));
    r.moonCard.append(el('div', { style: { display: 'flex', gap: '12px', alignItems: 'center' } }, ms,
      el('div', {}, el('div', { style: { fontWeight: 700 } }, el('bdi', { text: t('m.' + m.phaseKey) })),
        el('div', { class: 'dim', style: { fontSize: '.78rem' }, text: `${t('m.illum')} ${N(m.k * 100, 1)}${pct()} · ${t('m.age')} ${N(m.age, 1)} ${t('c.day')}` }),
        m.next.ms ? el('div', { class: 'dim', style: { fontSize: '.78rem' } }, el('bdi', { text: `${t('t.next')}: ${t('m.' + m.next.key)} ${t('t.indays', { n: N(Math.max(0, (m.next.ms - S.now) / 86400000), 0) })}` })) : null)));
  }
  r.statrow.innerHTML = '';
  const stat = (label, v, sub, aria) => el('div', { class: 'stat', 'aria-label': aria || (label + ': ' + v) }, el('div', { class: 'micro', text: label }), el('div', { class: 'v', dir: 'ltr' }, el('bdi', { text: v })), sub ? el('div', { class: 's', text: sub }) : null);
  if (s.solar.altitude) r.statrow.append(stat(t('t.alt'), `${N(so.alt, 1)}°`, null, `${t('a.alt')}: ${N(so.alt, 1)}°`));
  if (s.solar.shadow) r.statrow.append(stat(t('t.shadow'), so.shadow == null ? '—' : `${so.shadowClamped ? '999+' : N(so.shadow, 2)}×`, so.shadow == null ? t('t.noshadow') : null, `${t('a.shadow')}: ${so.shadow == null ? t('t.noshadow') : N(so.shadow, 2) + '×'}`));
  r.statrow.append(stat(t('t.progress'), `${N(so.progress, 0)}°`, so.polar ? t('c.approx') : null));
  r.statrow.append(stat(t('t.sunrise'), so.ev.sunrise == null ? t('s.norise') : fmtT(so.ev.sunrise)));
  r.statrow.append(stat(t('t.sunset'), so.ev.sunset == null ? t('s.noset') : fmtT(so.ev.sunset)));
}
function holButton(h, upcoming = false) {
  const lang = S.settings.language.app;
  return el('button', { type: 'button', class: 'holbtn', 'aria-label': t('a.holiday') + ': ' + (h.names[lang] || h.names.en),
    onclick: () => { S.view.selJdn = h.jdn; const g = E.jdnToGreg(h.jdn); S.view.y = g.y; S.view.m = g.m; S.settings.calendar.primary = 'gregorian'; saveSettings(); switchTab('calendar'); } },
    el('span', { style: { fontSize: '1.3rem' }, text: flagOf(h.country) }),
    el('span', {}, el('bdi', { text: h.names[lang] || h.names.en }),
      el('div', { class: 'dim', style: { fontSize: '.72rem', fontWeight: 500 } }, el('bdi', { text: (upcoming ? t('h.upcoming') + ' · ' : '') + fmtG(h.jdn, 'long') }))),
    h.estimated && S.settings.holidays.estBadge ? el('span', { class: 'badge est', text: '≈ ' + t('c.estimated'), title: t('h.estnote') }) : null);
}

/* ===== CALENDAR ===== */
function ensureView() {
  if (!S.view.y) { const g = S.dates.g; S.view.y = g.y; S.view.m = g.m; S.view.selJdn = S.dates.jdn; }
}
function buildCalendar(root) {
  ensureView();
  const s = S.settings, primary = s.calendar.primary;
  const card = el('div', { class: 'card' });
  const head = el('div', { class: 'calhead' });
  const nav = (ic, label, fn, flip = true) => el('button', { type: 'button', class: 'btn icon', title: label, 'aria-label': label, onclick: fn }, icon(ic, 16, flip ? 'flip' : ''));
  const shift = (months) => {
    if (primary === 'gregorian') { let y = S.view.y, m = S.view.m + months; while (m < 1) { m += 12; y--; } while (m > 12) { m -= 12; y++; } S.view.y = y; S.view.m = m; }
    else { const h = E.toHijri(E.fromHijri(S.view.y, S.view.m, 1, method(), adj()), method(), adj());
      let y = h.y, m = h.m + months; while (m < 1) { m += 12; y--; } while (m > 12) { m -= 12; y++; } S.view.y = y; S.view.m = m; }
    buildCalendar(rootRefresh());
  };
  const rootRefresh = () => { const r = $('#panel-calendar'); r.innerHTML = ''; return r; };
  head.append(
    nav('dblL', t('cal.prevY'), () => shift(-12)), nav('chevL', t('cal.prevM'), () => shift(-1)),
    el('div', { class: 'caltitle', id: 'calTitle' }),
    nav('chevR', t('cal.nextM'), () => shift(1)), nav('dblR', t('cal.nextY'), () => shift(12)),
    el('button', { type: 'button', class: 'btn', onclick: () => { const g = S.dates.g; S.view.y = g.y; S.view.m = g.m; S.view.selJdn = S.dates.jdn;
      if (primary === 'hijri') { const h = S.dates.h; S.view.y = h.y; S.view.m = h.m; S.view.selJdn = S.dates.hAnchor; } buildCalendar(rootRefresh()); } }, icon('clock', 15), t('c.today')));
  const seg = el('div', { class: 'seg', role: 'group', 'aria-label': t('set.primary') },
    ...['gregorian', 'hijri'].map(c => el('button', { type: 'button', 'aria-pressed': primary === c, text: t(c === 'gregorian' ? 'cal.greg' : 'cal.hijri'),
      onclick: () => { if (s.calendar.primary === c) return;
        const anchor = S.view.selJdn || S.dates.jdn;
        s.calendar.primary = c; saveSettings();
        if (c === 'hijri') { const h = E.toHijri(anchor, method(), adj()); S.view.y = h.y; S.view.m = h.m; }
        else { const g = E.jdnToGreg(anchor); S.view.y = g.y; S.view.m = g.m; }
        applySettings(false); } })));
  card.append(head, seg);
  // title
  const L = primary === 'hijri' ? (LOCALES[hLang()] || LOCALES.en) : (LOCALES[gLang()] || LOCALES.en);
  const months = primary === 'hijri' ? L.hijri.months : L.greg.months;
  const title = el('bdi', { text: `${months[S.view.m - 1]} ${N(S.view.y)}` });
  const titleBox = head.querySelector('#calTitle');
  titleBox.append(title);
  if (s.language.bilingual) {
    const l2 = primary === 'hijri' ? s.language.secondHij : s.language.secondGreg;
    const L2 = LOCALES[l2] || LOCALES.en, m2 = primary === 'hijri' ? L2.hijri.months : L2.greg.months;
    titleBox.append(el('small', { dir: L2.dir }, el('bdi', { text: `${m2[S.view.m - 1]} ${fmtNum(S.view.y, l2, s.language.numbers)}` })));
  }
  // range hint in other calendar
  const firstJdn = primary === 'gregorian' ? E.gregToJdn(S.view.y, S.view.m, 1) : E.fromHijri(S.view.y, S.view.m, 1, method(), adj());
  const len = primary === 'gregorian' ? E.monthLenGreg(S.view.y, S.view.m) : E.hijriMonthLen(S.view.y, S.view.m, method(), adj());
  const lastJdn = firstJdn + len - 1;
  titleBox.append(el('small', { text: primary === 'gregorian' ? `${fmtH(firstJdn, 'long')} → ${fmtH(lastJdn, 'long')}` : `${fmtG(firstJdn, 'long')} → ${fmtG(lastJdn, 'long')}` }));
  // grid
  const ws = s.calendar.weekStart === 'auto' ? (LOCALES[s.language.app] || LOCALES.en).firstDay : +s.calendar.weekStart;
  const grid = el('div', { class: 'calgrid', role: 'grid', 'aria-label': t('a.grid') });
  const dowL = LOCALES[primary === 'hijri' ? hLang() : gLang()] || LOCALES.en;
  const headerRow = el('div', { role: 'row', style: { display: 'contents' } });
  for (let i = 0; i < 7; i++) headerRow.append(el('div', { class: 'dow', role: 'columnheader', text: dowL.greg.wdShort[(ws + i) % 7] }));
  grid.append(headerRow);
  const lead = (E.weekdayOf(firstJdn) - ws + 7) % 7;
  const todayAnchor = primary === 'hijri' ? S.dates.hAnchor : S.dates.jdn;
  const holSet = new Map();
  for (const h of filteredHols()) for (let k = 0; k < h.duration; k++) holSet.set(h.jdn + k, true);
  const cells = [];
  let rowEl = el('div', { role: 'row', style: { display: 'contents' } });
  grid.append(rowEl);
  for (let i = 0; i < 42; i++) {
    if (i > 0 && i % 7 === 0) { rowEl = el('div', { role: 'row', style: { display: 'contents' } }); grid.append(rowEl); }
    const cellJdn = firstJdn - lead + i;
    const inMonth = cellJdn >= firstJdn && cellJdn <= lastJdn;
    const isToday = cellJdn === todayAnchor, isSel = cellJdn === S.view.selJdn;
    let n1, n2, n1dir = 'ltr';
    if (primary === 'gregorian') {
      const g = E.jdnToGreg(cellJdn); n1 = N(g.d);
      const h = E.toHijri(cellJdn, method(), adj());
      const hl = LOCALES[hLang()] || LOCALES.en;
      n2 = h.d === 1 ? `${fmtNum(1, hLang(), s.language.numbers)} ${hl.hijri.months[h.m - 1].split(' ')[0]}` : fmtNum(h.d, hLang(), s.language.numbers);
    } else {
      const h = E.toHijri(cellJdn, method(), adj()); n1 = fmtNum(h.d, hLang(), s.language.numbers);
      const g = E.jdnToGreg(cellJdn);
      const gl = LOCALES[gLang()] || LOCALES.en;
      n2 = g.d === 1 ? `${fmtNum(1, gLang(), s.language.numbers)} ${gl.greg.short[g.m - 1]}` : fmtNum(g.d, gLang(), s.language.numbers);
    }
    const label = `${fmtG(cellJdn)} — ${fmtH(cellJdn)}`;
    const b = el('button', { type: 'button', role: 'gridcell', class: 'cell' + (inMonth ? '' : ' out') + (isToday ? ' today' : '') + (isSel ? ' sel' : ''),
      'aria-label': label, 'aria-selected': isSel, 'aria-current': isToday ? 'date' : null, tabindex: isSel ? 0 : -1, 'data-jdn': cellJdn,
      onclick: () => selectDate(cellJdn) },
      el('span', { class: 'n1', dir: 'ltr' }, el('bdi', { text: n1 })),
      s.calendar.showSecondary ? el('span', { class: 'n2' }, el('bdi', { text: n2 })) : null,
      holSet.has(cellJdn) ? el('i', { class: 'hdot', title: t('cal.hols') }) : null);
    rowEl.append(b); cells.push(b);
  }
  grid.addEventListener('keydown', ev => {
    const cur = cells.findIndex(c => +c.dataset.jdn === S.view.selJdn);
    let delta = null;
    if (ev.key === 'ArrowRight') delta = uiDir() === 'rtl' ? -1 : 1;
    else if (ev.key === 'ArrowLeft') delta = uiDir() === 'rtl' ? 1 : -1;
    else if (ev.key === 'ArrowDown') delta = 7; else if (ev.key === 'ArrowUp') delta = -7;
    else if (ev.key === 'PageDown') return shift(1); else if (ev.key === 'PageUp') return shift(-1);
    if (delta != null) {
      ev.preventDefault();
      const nj = S.view.selJdn + delta;
      selectDate(nj, true);
    }
  });
  card.append(grid);
  if (s.calendar.rollover.mode === 'sunset') card.append(el('p', { class: 'dim', style: { fontSize: '.72rem', marginBlockEnd: 0 }, text: t('cal.anchor') }));
  const detail = el('div', { class: 'card detail', id: 'calDetail' });
  root.append(card, detail);
  renderDetail(detail);
  function selectDate(jdn, focus) {
    S.view.selJdn = jdn;
    const inCur = jdn >= firstJdn - lead && jdn < firstJdn - lead + 42 && jdn >= firstJdn && jdn <= lastJdn;
    if (!inCur) {
      if (primary === 'gregorian') { const g = E.jdnToGreg(jdn); S.view.y = g.y; S.view.m = g.m; }
      else { const h = E.toHijri(jdn, method(), adj()); S.view.y = h.y; S.view.m = h.m; }
      buildCalendar(rootRefresh());
      if (focus) $('#panel-calendar').querySelector(`.cell[data-jdn="${jdn}"]`)?.focus();
    } else {
      grid.querySelectorAll('.cell').forEach(c => { const sel = +c.dataset.jdn === jdn; c.classList.toggle('sel', sel); c.setAttribute('aria-selected', sel); c.tabIndex = sel ? 0 : -1; });
      renderDetail($('#calDetail'));
      if (focus) grid.querySelector(`.cell[data-jdn="${jdn}"]`)?.focus();
    }
  }
}
function renderDetail(box) {
  if (!box) return;
  box.innerHTML = '';
  const jdn = S.view.selJdn || S.dates.jdn;
  const noonJdn = jdn; // FR-ROLLOVER-006: noon anchor
  const g = E.jdnToGreg(noonJdn);
  const noonMs = E.utcFromCivil(g.y, g.m, g.d, 12, 0, 0, S.tz);
  const ev = E.sunEvents(noonJdn, S.loc.lat, S.loc.lon, S.tz);
  const moon = E.moonNow(noonMs, S.loc.lat, S.loc.lon, S.tz, !S.loc.missing);
  box.append(el('h3', {}, el('bdi', { text: t('cal.sel') })),
    el('div', { class: 'kv' },
      el('dt', { text: t('t.greg') }), el('dd', { dir: gDir() }, el('bdi', { text: fmtG(noonJdn) })),
      el('dt', { text: t('t.hijri') }), el('dd', { dir: hDir() }, el('bdi', { text: fmtH(noonJdn) })),
      el('dt', { text: t('t.method') }), el('dd', {}, el('bdi', { text: t('set.m' + { 'islamic-civil': 'civil', 'islamic-astronomical': 'astro', 'islamic-umalqura': 'umalqura', 'islamic-local': 'local' }[method()]) + (adj() ? ` (${N(adj(), 0)} d)` : '') })),
      el('dt', { text: t('t.sunrise') }), el('dd', { dir: 'ltr' }, el('bdi', { text: ev.sunrise == null ? t('s.norise') : fmtT(ev.sunrise) })),
      el('dt', { text: t('t.noon') }), el('dd', { dir: 'ltr' }, el('bdi', { text: fmtT(ev.noon) })),
      el('dt', { text: t('t.sunset') }), el('dd', { dir: 'ltr' }, el('bdi', { text: ev.sunset == null ? t('s.noset') : fmtT(ev.sunset) })),
      el('dt', { text: t('cal.moonAtNoon') }), el('dd', {}, el('bdi', { text: `${t('m.' + moon.phaseKey)} · ${N(moon.k * 100, 0)}${pct()}` }))));
  const hols = filteredHols().filter(h => noonJdn >= h.jdn && noonJdn < h.jdn + h.duration);
  box.append(el('div', { class: 'micro', style: { marginBlock: '12px 6px' }, text: t('cal.hols') }));
  if (hols.length) for (const h of hols) box.append(holItem(h));
  else box.append(el('div', { class: 'dim', style: { fontSize: '.8rem' }, text: t('cal.nohols') }));
}

/* ===== SOLAR ===== */
function buildSolar(root) {
  const s = S.settings;
  const card = el('div', { class: 'card' });
  card.append(el('div', { class: 'minihead' }, icon('sun', 17), el('span', { class: 'micro', text: t('tab.solar') })));
  const wrap = el('div', { class: 'solarwrap' });
  const dialBox = el('div', { class: 'dialbox' });
  const statsBox = el('div', {});
  wrap.append(dialBox, statsBox);
  card.append(wrap);
  const curveCard = el('div', { class: 'card', style: { marginBlockStart: '14px' } });
  curveCard.append(el('div', { class: 'minihead' }, icon('sparkles', 16), el('span', { class: 'micro', text: t('s.curve') })));
  const curveBox = el('div', { class: 'curvebox' });
  curveCard.append(curveBox);
  root.append(card, curveCard);
  // dial
  const D = { cx: 110, cy: 110, r: 80 };
  const pt = (p, r = D.r) => { const a = (p + 180) * Math.PI / 180; return [D.cx + r * Math.cos(a), D.cy + r * Math.sin(a)]; };
  const arc = (p0, p1, r) => { const [x0, y0] = pt(p0, r), [x1, y1] = pt(p1, r); return `M ${x0} ${y0} A ${r} ${r} 0 ${p1 - p0 > 180 ? 1 : 0} 1 ${x1} ${y1}`; };
  const dial = svgEl('svg', { viewBox: '0 0 220 220', dir: 'ltr', role: 'img', 'aria-label': t('s.dial') });
  const defs = svgEl('defs', {},
    svgEl('linearGradient', { id: 'dayG', x1: 0, y1: 1, x2: 0, y2: 0 }, svgEl('stop', { offset: 0, 'stop-color': '#ff9d45' }), svgEl('stop', { offset: 1, 'stop-color': '#ffd98a' })),
    svgEl('linearGradient', { id: 'nightG', x1: 0, y1: 0, x2: 0, y2: 1 }, svgEl('stop', { offset: 0, 'stop-color': '#31427c' }), svgEl('stop', { offset: 1, 'stop-color': '#131b3c' })));
  dial.append(defs,
    svgEl('circle', { cx: D.cx, cy: D.cy, r: D.r, fill: 'none', stroke: 'var(--card-border)', 'stroke-width': 1 }),
    svgEl('path', { d: arc(0, 180, D.r), fill: 'none', stroke: 'url(#dayG)', 'stroke-width': 9, 'stroke-linecap': 'round', opacity: .9 }),
    svgEl('path', { d: arc(180, 359.9, D.r), fill: 'none', stroke: 'url(#nightG)', 'stroke-width': 9, 'stroke-linecap': 'round', opacity: .9 }));
  for (let p = 0; p < 360; p += 30) {
    const [x0, y0] = pt(p, D.r - 9), [x1, y1] = pt(p, D.r - (p % 90 === 0 ? 16 : 12));
    dial.append(svgEl('line', { x1: x0, y1: y0, x2: x1, y2: y1, stroke: 'var(--text-dim)', 'stroke-width': p % 90 === 0 ? 2 : 1, opacity: .6 }));
  }
  const majors = [[0, t('t.sunrise')], [90, t('t.noon')], [180, t('t.sunset')], [270, t('t.midnight')]];
  for (const [p, label] of majors) {
    const [x, y] = pt(p, D.r + 19);
    dial.append(svgEl('text', { x, y: y - 2, 'text-anchor': 'middle', 'font-size': 8.5, fill: 'var(--text-dim)', 'font-weight': 700 }, label),
      svgEl('text', { x, y: y + 8, 'text-anchor': 'middle', 'font-size': 8, fill: 'var(--text-dim)' }, digits(p + '°', resolveNS(s.language.app, s.language.numbers))));
  }
  const cProg = svgEl('text', { x: D.cx, y: D.cy - 4, 'text-anchor': 'middle', 'font-size': 26, 'font-weight': 800, fill: 'var(--text-color)' });
  const cPer = svgEl('text', { x: D.cx, y: D.cy + 14, 'text-anchor': 'middle', 'font-size': 10, fill: 'var(--text-dim)', 'font-weight': 700 });
  const cAlt = svgEl('text', { x: D.cx, y: D.cy + 28, 'text-anchor': 'middle', 'font-size': 9, fill: 'var(--text-dim)' });
  const halo = svgEl('circle', { r: 10, fill: 'var(--accent)', opacity: .3 });
  const dot = svgEl('circle', { r: 5.5, fill: 'var(--accent)', stroke: 'var(--accent-ink)', 'stroke-width': 1 });
  dial.append(cProg, cPer, cAlt, halo, dot);
  if (s.solar.dial) dialBox.append(dial);
  // curve
  const W = 720, H = 210, pad = 28;
  const g = S.dates.g, dayStart = E.utcFromCivil(g.y, g.m, g.d, 0, 0, 0, S.tz);
  const X = i => pad + i / 144 * (W - 2 * pad), Y = a => H - pad - (a + 90) / 180 * (H - 2 * pad);
  const curve = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, dir: 'ltr', role: 'img', 'aria-label': t('s.curve') });
  for (const a of [-18, -12, -6]) curve.append(svgEl('line', { x1: pad, y1: Y(a), x2: W - pad, y2: Y(a), stroke: 'var(--card-border)', 'stroke-dasharray': '3 5', 'stroke-width': 1 }));
  curve.append(svgEl('line', { x1: pad, y1: Y(0), x2: W - pad, y2: Y(0), stroke: 'var(--text-dim)', 'stroke-width': 1.4, 'stroke-dasharray': '6 4' }),
    svgEl('text', { x: W - pad, y: Y(0) - 5, 'text-anchor': 'end', 'font-size': 9, fill: 'var(--text-dim)' }, t('s.horizon')));
  let dPath = '';
  for (let i = 0; i <= 144; i++) { const alt = E.sunPosition(dayStart + i * 600000, S.loc.lat, S.loc.lon).alt; dPath += (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(alt).toFixed(1); }
  curve.append(svgEl('path', { d: dPath + `L ${X(144)} ${H - pad} L ${X(0)} ${H - pad} Z`, fill: 'var(--accent)', opacity: .1 }),
    svgEl('path', { d: dPath, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.2, 'stroke-linejoin': 'round' }));
  for (let hh = 0; hh <= 24; hh += 6) curve.append(svgEl('text', { x: X(hh * 6), y: H - 8, 'text-anchor': 'middle', 'font-size': 9, fill: 'var(--text-dim)' }, digits(String(hh).padStart(2, '0'), resolveNS(s.language.app, s.language.numbers))));
  const nowLine = svgEl('line', { y1: pad, y2: H - pad, stroke: 'var(--info)', 'stroke-width': 1.6, 'stroke-dasharray': '4 3' });
  const nowDot = svgEl('circle', { r: 4.5, fill: 'var(--info)', stroke: 'var(--text-color)', 'stroke-width': 1.2 });
  curve.append(nowLine, nowDot);
  curveBox.append(curve, el('div', { class: 'legend' },
    el('span', {}, el('i', { style: { background: 'var(--accent)' } }), t('s.alt')),
    el('span', {}, el('i', { style: { background: 'var(--info)' } }), t('c.now')),
    el('span', { text: '−6° / −12° / −18°: ' + t('s.civtw') + ' / ' + t('s.nauttw') + ' / ' + t('s.asttw') })));
  P.solar = { dot, halo, cProg, cPer, cAlt, nowLine, nowDot, statsBox, pt, dayStart, X, Y };
  tickSolar(true);
}
function tickSolar(full) {
  const r = P.solar; if (!r || S.view.tab !== 'solar') return;
  const s = S.settings, so = S.solar;
  const [x, y] = r.pt(so.progress);
  r.dot.setAttribute('cx', x); r.dot.setAttribute('cy', y); r.halo.setAttribute('cx', x); r.halo.setAttribute('cy', y);
  r.cProg.textContent = digits(so.progress.toFixed(0) + '°', resolveNS(s.language.app, s.language.numbers));
  r.cPer.textContent = periodName(so.period);
  r.cAlt.textContent = `${t('s.alt')} ${digits(so.alt.toFixed(1) + '°', resolveNS(s.language.app, s.language.numbers))}`;
  const frac = Math.min(1, Math.max(0, (S.now - r.dayStart) / 86400000));
  const nx = r.X(frac * 144), ny = r.Y(so.alt);
  r.nowLine.setAttribute('x1', nx); r.nowLine.setAttribute('x2', nx);
  r.nowDot.setAttribute('cx', nx); r.nowDot.setAttribute('cy', ny);
  r.statsBox.innerHTML = '';
  const kv = el('dl', { class: 'kv' });
  const row = (k, v, aria) => { kv.append(el('dt', { text: k }), el('dd', { dir: 'ltr', 'aria-label': aria }, el('bdi', { text: v }))); };
  row(t('s.clock'), fmtClock(E.tzParts(S.now, S.tz), s.language.app, s.solar.clock, s.solar.seconds, s.language.numbers), t('a.clock'));
  row(t('t.period'), periodName(so.period), t('a.period') + ': ' + periodName(so.period));
  row(t('s.progress'), N(so.progress, 1) + '°' + (so.polar ? ' · ' + t('c.approx') : ''));
  if (s.solar.altitude) row(t('s.alt'), N(so.alt, 1) + '°', `${t('a.alt')}: ${N(so.alt, 1)}°`);
  row(t('s.az'), N(so.az, 1) + '°');
  if (s.solar.shadow) {
    row(t('s.shadow'), so.shadow == null ? t('t.noshadow') : `${so.shadowClamped ? '999+' : N(so.shadow, 2)}×`, `${t('a.shadow')}: ${so.shadow == null ? t('t.noshadow') : N(so.shadow, 2)}`);
    if (s.solar.objectHeight != null && so.shadow != null) {
      const unit = { m: t('set.um'), cm: t('set.ucm'), ft: t('set.uft'), none: '×' }[s.solar.unit];
      row(t('s.shadowlen'), `${N(Math.min(so.shadow * s.solar.objectHeight, 999999), 2)} ${unit}`);
    }
  }
  row(t('t.sunrise'), so.ev.sunrise == null ? t('s.norise') : fmtT(so.ev.sunrise));
  row(t('t.noon'), fmtT(so.ev.noon));
  row(t('t.sunset'), so.ev.sunset == null ? t('s.noset') : fmtT(so.ev.sunset));
  row(t('t.midnight'), so.midnight == null ? '—' : fmtT(so.midnight));
  row(t('s.civtw'), `${so.ev.civilDawn == null ? '—' : fmtT(so.ev.civilDawn)} / ${so.ev.civilDusk == null ? '—' : fmtT(so.ev.civilDusk)}`);
  row(t('s.nauttw'), `${so.ev.nautDawn == null ? '—' : fmtT(so.ev.nautDawn)} / ${so.ev.nautDusk == null ? '—' : fmtT(so.ev.nautDusk)}`);
  row(t('s.asttw'), `${so.ev.astroDawn == null ? '—' : fmtT(so.ev.astroDawn)} / ${so.ev.astroDusk == null ? '—' : fmtT(so.ev.astroDusk)}`);
  if (so.dayLength != null) { const hh = Math.floor(so.dayLength / 3600000), mm = Math.round(so.dayLength % 3600000 / 60000); row(t('s.daylen'), `${N(hh)}h ${N(mm)}m`); }
  row(t('s.eq'), N(so.eqtime, 1) + ' ' + t('c.min'));
  row(t('s.decl'), N(so.decl, 1) + '°');
  row(t('s.tz'), `${S.tz} (${E.tzAbbrev(S.now, S.tz)})`);
  r.statsBox.append(kv);
  if (so.polar) r.statsBox.append(el('p', { class: 'dim', style: { fontSize: '.74rem' }, text: t('s.polar') }));
  // quick object height control (live)
  const oh = el('input', { type: 'number', min: 0, step: '0.1', value: s.solar.objectHeight ?? '', 'aria-label': t('s.objh'),
    onchange: ev => { const v = ev.target.value === '' ? null : Math.max(0, +ev.target.value); s.solar.objectHeight = v; saveSettings(); tickSolar(true); } });
  r.statsBox.append(el('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBlockStart: '12px' } },
    el('span', { class: 'micro', text: t('s.objh') }), oh,
    el('span', { class: 'dim', style: { fontSize: '.75rem' }, text: { m: t('set.um'), cm: t('set.ucm'), ft: t('set.uft'), none: t('set.unone') }[s.solar.unit] })));
}

/* ===== MOON ===== */
function buildMoon(root) {
  const s = S.settings, m = S.moon;
  const card = el('div', { class: 'card' });
  card.append(el('div', { class: 'minihead' }, icon('moon', 17), el('span', { class: 'micro', text: t('tab.moon') })));
  const wrap = el('div', { class: 'moonwrap' });
  const big = el('div', { class: 'moonbig' });
  const iconBox = moonSVG(m.k, m.elong, m.roll, 240, s.moon.showRoll);
  iconBox.setAttribute('aria-label', t('a.moon') + ': ' + t('m.' + m.phaseKey));
  big.append(iconBox);
  const info = el('div', {});
  wrap.append(big, info);
  card.append(wrap);
  root.append(card);
  P.moon = { info, big };
  tickMoon(true);
}
function tickMoon() {
  const r = P.moon; if (!r || S.view.tab !== 'moon') return;
  const s = S.settings, m = S.moon;
  r.big.innerHTML = '';
  const ic = moonSVG(m.k, m.elong, m.roll, 240, s.moon.showRoll);
  ic.setAttribute('aria-label', t('a.moon') + ': ' + t('m.' + m.phaseKey));
  r.big.append(ic);
  r.info.innerHTML = '';
  const kv = el('dl', { class: 'kv' });
  const row = (k, v, aria) => kv.append(el('dt', { text: k }), el('dd', { 'aria-label': aria }, el('bdi', { text: v })));
  row(t('m.phase'), t('m.' + m.phaseKey), t('a.moon') + ': ' + t('m.' + m.phaseKey));
  row(t('m.illum'), N(m.k * 100, 1) + pct());
  row(t('m.age'), t('m.agedays', { n: N(m.age, 1) }));
  if (s.moon.showRoll) row(t('m.roll'), m.roll == null ? t('m.rollhide') : N(m.roll, 0) + '°');
  row(m.alt >= 0 ? t('m.above') : t('m.below'), N(m.alt, 1) + '°');
  row(t('s.az'), N(m.az, 1) + '°');
  if (s.moon.riseSet) { row(t('m.rise'), m.rise == null ? '—' : '≈ ' + fmtT(m.rise)); row(t('m.set'), m.set == null ? '—' : '≈ ' + fmtT(m.set)); }
  row(t('m.dist'), N(m.dist, 0, true) + ' km');
  row(t('m.nextnew'), m.nextNew == null ? '—' : fmtG(E.civilJdnOf(m.nextNew, S.tz), 'long') + ' · ' + fmtT(m.nextNew));
  row(t('m.nextfull'), m.nextFull == null ? '—' : fmtG(E.civilJdnOf(m.nextFull, S.tz), 'long') + ' · ' + fmtT(m.nextFull));
  row(t('m.locused'), locLabel() + (S.loc.approx ? ' · ' + t('c.approx') : ''));
  r.info.append(el('div', { style: { fontWeight: 800, fontSize: '1.25rem', marginBlockEnd: '8px' } }, el('bdi', { text: t('m.' + m.phaseKey) })), kv);
  if (s.moon.showRoll) r.info.append(el('p', { class: 'dim', style: { fontSize: '.72rem' }, text: t('m.rollconv') }));
  if (S.loc.approx) r.info.append(el('p', { class: 'chip warn', style: { display: 'inline-flex', fontSize: '.72rem' }, text: '≈ ' + t('m.inferred') }));
}

/* ===== HOLIDAYS ===== */
function holItem(h) {
  const s = S.settings, lang = s.language.app;
  const c = S.holDataset.countries.find(x => x.code === h.country);
  const badges = el('div', { class: 'hb' },
    el('span', { class: 'badge ' + h.type, text: t('h.' + h.type) }),
    el('span', { class: 'badge cal', text: t(h.calendar === 'islamic' ? 'h.lunar' : 'h.solar') }),
    h.estimated && s.holidays.estBadge ? el('span', { class: 'badge est', title: t('h.estnote'), text: '≈ ' + t('c.estimated') }) : null,
    h.official && h.calendar === 'islamic' ? el('span', { class: 'badge off', title: t('h.offnote'), text: '✓ ' + t('c.official') }) : null,
    h.beginsSunset ? el('span', { class: 'badge cal', title: t('h.begins'), text: '☾ ' + t('h.begins') }) : null);
  const dates = [fmtG(h.jdn, 'long')];
  if (h.duration > 1) dates[0] += ' → ' + fmtG(h.jdn + h.duration - 1, 'long') + ` (${t('h.duration', { n: N(h.duration) })})`;
  if (h.calendar === 'islamic') dates.push(fmtH(h.jdn, 'long'));
  return el('button', { type: 'button', class: 'holitem', 'aria-label': `${h.names[lang] || h.names.en} — ${dates[0]}`,
    onclick: () => { S.view.selJdn = h.jdn; const g = E.jdnToGreg(h.jdn); S.view.y = g.y; S.view.m = g.m;
      S.settings.calendar.primary = 'gregorian'; saveSettings(); switchTab('calendar'); } },
    el('span', { class: 'flag', 'aria-hidden': 'true', text: flagOf(h.country) }),
    el('span', { style: { flex: 1, minWidth: 0 } },
      el('div', { class: 'hn' }, el('bdi', { text: h.names[lang] || h.names.en })),
      el('div', { class: 'hd' }, el('bdi', { text: dates.join(' · ') })),
      el('div', { class: 'hd' }, el('bdi', { text: (c && (c.name[lang] || c.name.en)) || h.country })),
      badges));
}
function buildHolidays(root) {
  const s = S.settings;
  const card = el('div', { class: 'card' });
  card.append(el('div', { class: 'minihead' }, icon('star', 17), el('span', { class: 'micro', text: t('tab.holidays') }),
    el('span', { class: 'spacer' }), el('span', { class: 'dim', style: { fontSize: '.7rem' }, text: `${t('set.versions')}: ${S.holDataset.version}` })));
  // country chips
  const cc = el('div', { class: 'filters' }, el('span', { class: 'micro', text: t('h.countries') }));
  for (const c of S.holDataset.countries) {
    const on = s.holidays.countries.includes(c.code);
    cc.append(el('button', { type: 'button', class: 'tog', 'aria-pressed': on,
      onclick: ev => { const i = s.holidays.countries.indexOf(c.code);
        if (i >= 0 && s.holidays.countries.length > 1) s.holidays.countries.splice(i, 1); else if (i < 0) s.holidays.countries.push(c.code);
        saveSettings(); recompute(); buildHolidays(refresh('holidays')); } },
      el('span', { text: flagOf(c.code) }), el('bdi', { text: c.name[s.language.app] || c.name.en })));
  }
  card.append(cc);
  // type toggles
  const tt = el('div', { class: 'filters' });
  const typeMap = { national: 'shownat', religious: 'showrel', observance: 'showobs', bank: 'showbank', regional: 'showreg' };
  for (const ty of HOLIDAY_TYPES) tt.append(el('button', { type: 'button', class: 'tog', 'aria-pressed': s.holidays[typeMap[ty]], text: t('h.' + ty),
    onclick: () => { s.holidays[typeMap[ty]] = !s.holidays[typeMap[ty]]; saveSettings(); recompute(); buildHolidays(refresh('holidays')); } }));
  card.append(tt);
  // range
  const ranges = [['today', 'h.rtoday'], ['7', 'h.r7'], ['30', 'h.r30'], ['year', 'h.ryear']];
  const rg = el('div', { class: 'seg', role: 'group', style: { marginBlockEnd: '14px' } },
    ...ranges.map(([r, k]) => el('button', { type: 'button', 'aria-pressed': S.view.range === r, text: t(k),
      onclick: () => { S.view.range = r; buildHolidays(refresh('holidays')); } })));
  card.append(rg);
  const jdn = S.dates.jdn;
  let lo = jdn, hi = jdn;
  if (S.view.range === '7') hi = jdn + 7; else if (S.view.range === '30') hi = jdn + 30;
  else if (S.view.range === 'year') { lo = E.gregToJdn(S.dates.g.y, 1, 1); hi = E.gregToJdn(S.dates.g.y, 12, 31); }
  const list = filteredHols().filter(h => h.jdn + h.duration - 1 >= lo && h.jdn <= hi);
  const todays = list.filter(h => jdn >= h.jdn && jdn < h.jdn + h.duration);
  const rest = list.filter(h => !todays.includes(h));
  if (todays.length) {
    const tc = el('div', { class: 'card todaycard', style: { marginBlockEnd: '12px' } }, el('div', { class: 'micro', style: { marginBlockEnd: '8px' }, text: t('h.today') }));
    for (const h of todays) tc.append(holItem(h));
    card.append(tc);
  }
  card.append(el('div', { class: 'micro', style: { marginBlockEnd: '8px' }, text: S.view.range === 'today' && !todays.length ? t('h.today') : t('h.upcoming') }));
  if (rest.length) for (const h of rest.slice(0, 80)) card.append(holItem(h));
  else if (!todays.length) card.append(el('div', { class: 'dim', text: t('h.none') }));
  card.append(el('div', { style: { marginBlockStart: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' } },
    el('button', { type: 'button', class: 'btn', onclick: checkUpdates }, icon('refresh', 15), t('h.update')),
    el('span', { class: 'dim', style: { fontSize: '.7rem', alignSelf: 'center' }, text: t('h.estnote') })));
  root.append(card);
}
function refresh(id) { const r = $('#panel-' + id); r.innerHTML = ''; return r; }

/* ===== SETTINGS ===== */
function buildSettings(root) {
  const s = S.settings;
  const search = el('div', { class: 'setsearch' }, icon('settings', 16),
    el('input', { type: 'text', placeholder: t('set.search'), 'aria-label': t('set.search'), value: S.view.query,
      oninput: ev => { S.view.query = ev.target.value.toLowerCase(); filterRows(); },
      onkeydown: ev => { if (ev.key === 'Escape') { ev.target.value = ''; S.view.query = ''; filterRows(); } } }));
  root.append(search);
  const groups = [];
  const langOpts = UI_LANGS.map(l => [l, LOCALES[l].name]);
  const calLangOpts = CAL_LANGS.map(l => [l, LOCALES[l].name]);
  const sec = (id, ic, rows) => {
    const g = el('section', { class: 'card setgroup', 'data-group': id }, el('h3', {}, icon(ic, 17), t('set.' + id)));
    for (const r of rows) g.append(r);
    groups.push(g); root.append(g);
  };
  const row = (label, ctl, hint) => {
    const r = el('div', { class: 'setrow', 'data-search': (label + ' ' + (hint || '')).toLowerCase() },
      el('div', { class: 'lab' }, el('b', { text: label }), hint ? el('small', { text: hint }) : null),
      el('div', { class: 'ctl' }, ctl));
    return r;
  };
  const apply = (rebuild = true) => { saveSettings(); applySettings(rebuild); };
  const sel = (path, opts, rebuild = true) => {
    const e = el('select', { 'aria-label': path, onchange: ev => { putPath(s, path, ev.target.value); apply(rebuild); } });
    for (const [v, lab] of opts) e.append(el('option', { value: v, selected: getPath(s, path) === v, text: lab }));
    return e;
  };
  const tog = (path, rebuild = true) => el('button', { type: 'button', class: 'switch', role: 'switch', 'aria-checked': getPath(s, path),
    onclick: ev => { putPath(s, path, !getPath(s, path)); ev.currentTarget.setAttribute('aria-checked', getPath(s, path)); apply(rebuild); } });
  const num = (path, min, max, step = 1, nullable = false) => el('input', { type: 'number', min, max, step, value: getPath(s, path) ?? '',
    onchange: ev => { let v = ev.target.value === '' ? (nullable ? null : min) : +ev.target.value;
      if (v != null) v = Math.min(max, Math.max(min, v)); putPath(s, path, v); apply(); } });
  const txt = (path, ph = '') => el('input', { type: 'text', value: getPath(s, path) ?? '', placeholder: ph,
    onchange: ev => { putPath(s, path, ev.target.value.trim() || null); apply(); } });
  const range = (path, min, max, fmt = v => N(v)) => {
    const val = el('span', { class: 'rangeval', text: fmt(getPath(s, path)) });
    const r = el('input', { type: 'range', min, max, step: 1, value: getPath(s, path), 'aria-label': path,
      oninput: ev => { putPath(s, path, +ev.target.value); val.textContent = fmt(+ev.target.value); saveSettings(); applySettings(false); tickActive(); },
      onchange: () => apply() });
    return el('span', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, r, val);
  };
  const color = path => el('input', { type: 'color', value: getPath(s, path), 'aria-label': path,
    oninput: ev => { putPath(s, path, ev.target.value); saveSettings(); sky.refresh(); } });
  // Language
  sec('language', 'globe', [
    row(t('set.applang'), sel('language.app', langOpts)),
    row(t('set.dir'), sel('language.direction', [['auto', t('c.auto')], ['ltr', t('set.ltr')], ['rtl', t('set.rtl')]])),
    row(t('set.greglang'), sel('language.gregorian', calLangOpts)),
    row(t('set.hijrilang'), sel('language.hijri', calLangOpts)),
    row(t('set.nums'), sel('language.numbers', [['auto', t('c.auto')], ['latn', t('set.nlatn')], ['arab', t('set.narab')], ['arabext', t('set.narabext')]])),
    row(t('set.bilingual'), tog('language.bilingual')),
    row(t('set.second') + ' · ' + t('t.greg'), sel('language.secondGreg', calLangOpts)),
    row(t('set.second') + ' · ' + t('t.hijri'), sel('language.secondHij', calLangOpts))]);
  // Calendars
  sec('calendars', 'calendar', [
    row(t('set.primary'), sel('calendar.primary', [['gregorian', t('cal.greg')], ['hijri', t('cal.hijri')]])),
    row(t('set.method'), sel('calendar.method', [['islamic-umalqura', t('set.mumalqura')], ['islamic-civil', t('set.mcivil')], ['islamic-astronomical', t('set.mastro')], ['islamic-local', t('set.mlocal')]]),
      t('set.methodhint') + ' ' + (E.uaqSupported() ? t('set.uaqhint') : t('w.uaq'))),
    row(t('set.adj'), range('calendar.adj', -3, 3, v => (v > 0 ? '+' : '') + N(v))),
    row(t('set.ws'), sel('calendar.weekStart', [['auto', t('set.wsauto')], ['0', t('set.wssun')], ['1', t('set.wsmon')], ['6', t('set.wssat')]])),
    row(t('set.style'), sel('calendar.style', [['full', t('set.full')], ['long', t('set.long')], ['medium', t('set.medium')]])),
    row(t('set.showsec'), tog('calendar.showSecondary'))]);
  // Rollover
  sec('rollover', 'moon', [
    row(t('set.rmode'), sel('calendar.rollover.mode', [['midnight', t('set.rmid')], ['sunset', t('set.rsun')]]), S.dates.roFallback ? t('w.sunsetFallback') : null),
    row(t('set.roffset'), range('calendar.rollover.offset', 0, 30, v => N(v) + ' ' + t('c.min'))),
    row(t('set.rapply'), sel('calendar.rollover.applyTo', [['hijri', t('set.rhijri')], ['both', t('set.rboth')]]))]);
  // Location
  const citySel = el('select', { 'aria-label': t('set.city'), onchange: ev => { s.location.city = ev.target.value; s.location.source = 'city'; apply(); } });
  for (const c of CITIES) citySel.append(el('option', { value: c[0], selected: s.location.city === c[0], text: (s.language.app === 'ar' ? c[5] : c[4]) }));
  const tzList = el('datalist', { id: 'tzlist' });
  for (const z of Object.keys(TZ_TABLE)) tzList.append(el('option', { value: z }));
  sec('location', 'pin', [
    row(t('set.src'), sel('location.source', [['timezone', t('set.srctz')], ['city', t('set.srccity')], ['manual', t('set.srcmanual')], ['geo', t('set.srcgeo')]]),
      S.loc.missing ? t('w.noloc') : S.loc.latOnly ? t('w.latonly') : S.loc.approx ? t('m.inferred') : null),
    row(t('set.city'), citySel),
    row(t('set.lat'), num('location.latitude', -90, 90, 0.0001, true)),
    row(t('set.lon'), num('location.longitude', -180, 180, 0.0001, true)),
    row(t('set.tzover'), el('span', {}, txt('location.timezone', S.tz), tzList)),
    row(t('set.usegeo'), el('button', { type: 'button', class: 'btn', disabled: S.geoBusy, onclick: useGeo }, icon('pin', 15), t('set.usegeo')),
      `${t('t.loc')}: ${locLabel()} · ${N(S.loc.lat, 3)}°, ${N(S.loc.lon, 3)}°`),
    row(t('set.city') + ' · ' + t('c.optional'), txt('location.label', locLabel()))]);
  // Solar
  const pn = key => {
    const lang = s.language.app;
    const cur = (s.solar.periodNames[lang] && s.solar.periodNames[lang][key]) || '';
    return el('input', { type: 'text', value: cur, placeholder: t('p.' + key),
      onchange: ev => { const v = ev.target.value.trim();
        s.solar.periodNames[lang] = s.solar.periodNames[lang] || {};
        if (v) s.solar.periodNames[lang][key] = v; else delete s.solar.periodNames[lang][key];
        apply(); } });
  };
  sec('solar', 'sun', [
    row(t('set.cfmt'), sel('solar.clock', [['auto', t('c.auto')], ['12', t('set.cf12')], ['24', t('set.cf24')]])),
    row(t('set.seconds'), tog('solar.seconds')),
    row(t('set.dial'), tog('solar.dial')),
    row(t('set.alt'), tog('solar.altitude')),
    row(t('set.shadow'), tog('solar.shadow')),
    row(t('set.objh'), num('solar.objectHeight', 0, 100000, 0.1, true)),
    row(t('set.unit'), sel('solar.unit', [['m', t('set.um')], ['cm', t('set.ucm')], ['ft', t('set.uft')], ['none', t('set.unone')]])),
    row(t('s.winrise'), num('solar.winRise', 0, 60), t('c.min')),
    row(t('s.winset'), num('solar.winSet', 0, 60), t('c.min')),
    row(t('s.winnoon'), num('solar.winNoon', 0, 60), t('c.min')),
    row(t('s.pnmorning'), pn('morning'), t('s.pnames')),
    row(t('s.pnnoon'), pn('noon')),
    row(t('s.pnafternoon'), pn('afternoon'))]);
  // Moon
  sec('moon', 'moon', [
    row(t('set.showroll'), tog('moon.showRoll'), t('m.rollconv')),
    row(t('set.riseset'), tog('moon.riseSet'))]);
  // Holidays
  const hchips = el('div', { class: 'countrychips' });
  for (const c of S.holDataset.countries) {
    const on = s.holidays.countries.includes(c.code);
    hchips.append(el('button', { type: 'button', class: 'tog', 'aria-pressed': on,
      onclick: () => { const i = s.holidays.countries.indexOf(c.code);
        if (i >= 0 && s.holidays.countries.length > 1) s.holidays.countries.splice(i, 1); else if (i < 0) s.holidays.countries.push(c.code);
        apply(); } }, el('span', { text: flagOf(c.code) }), c.code));
  }
  sec('holidays', 'star', [
    row(t('h.countries'), hchips),
    row(t('set.shownat'), tog('holidays.national')),
    row(t('set.showrel'), tog('holidays.religious')),
    row(t('set.showobs'), tog('holidays.observances')),
    row(t('set.showbank'), tog('holidays.bank')),
    row(t('set.showreg'), tog('holidays.regional')),
    row(t('set.showest'), tog('holidays.estBadge'), t('h.estnote')),
    row(t('h.update'), el('button', { type: 'button', class: 'btn', onclick: checkUpdates }, icon('refresh', 15), t('set.check')), `v${S.holDataset.version}`)]);
  // Theme
  sec('theme', 'sparkles', [
    row(t('set.tmode'), sel('theme.mode', [['auto', t('set.tauto')], ['dynamic', t('set.tdynamic')], ['day', t('set.tday')], ['night', t('set.tnight')], ['system', t('set.tsystem')], ['custom', t('set.tcustom')]])),
    row(t('set.intensity'), range('theme.intensity', 0, 100, v => N(v) + pct())),
    row(t('set.rm'), sel('theme.reducedMotion', [['auto', t('set.rmauto')], ['reduce', t('set.rmreduce')], ['full', t('set.rmfull')]])),
    row(t('set.stars'), tog('theme.stars', false)),
    row(t('set.mglow'), tog('theme.moonGlow', false)),
    row(t('set.overlay'), tog('theme.overlay', false)),
    row(t('set.ctop'), color('theme.custom.top')),
    row(t('set.chor'), color('theme.custom.horizon')),
    row(t('set.caccent'), color('theme.custom.accent'))]);
  // Data
  const fileIn = el('input', { type: 'file', accept: 'application/json', style: { display: 'none' }, onchange: importSettings });
  sec('data', 'database', [
    row(t('c.export'), el('button', { type: 'button', class: 'btn', onclick: exportSettings }, icon('download', 15), t('c.export'))),
    row(t('c.import'), el('span', {}, el('button', { type: 'button', class: 'btn', onclick: () => fileIn.click() }, icon('upload', 15), t('c.import')), fileIn)),
    row(t('c.reset'), el('button', { type: 'button', class: 'btn danger', onclick: resetSettings }, icon('refresh', 15), t('c.reset'))),
    row(t('set.versions'), el('span', { class: 'dim', style: { fontSize: '.72rem', textAlign: 'end' }, dir: 'ltr' },
      el('bdi', { text: `app ${APP_VERSION} · engines ${E.ENGINE_VERSION} · holidays ${S.holDataset.version} · locales ${LOCALE_VERSION} · tz ${TZ_VERSION}` }))),
    row(t('set.data'), el('span', { class: 'chip' + (storageOk ? '' : ' warn'), text: storageOk ? '✓ ' + t('set.storok') : '⚠ ' + t('set.storbad') })),
    row(t('set.check'), el('button', { type: 'button', class: 'btn', onclick: checkUpdates }, icon('refresh', 15), t('set.check')))]);
  // About
  const base = location.href.replace(/[^/]*$/, '');
  const snippet = embedSnippet(s, base);
  const about = el('div', { class: 'aboutblock' },
    el('p', { text: t('set.abouttext') }), el('p', { text: t('set.privacy') }),
    el('b', { text: t('set.embed') }), el('code', { text: snippet }),
    el('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
      el('button', { type: 'button', class: 'btn', onclick: async ev => { try { await navigator.clipboard.writeText(snippet); toast(t('c.copied')); } catch { toast(t('set.importbad')); } } }, icon('copy', 15), t('c.copy')),
      el('button', { type: 'button', class: 'btn', onclick: openCompact }, icon('layout', 15), t('t.preview')),
      el('a', { class: 'btn', href: 'embed.html', target: '_blank', rel: 'noopener' }, t('t.compact'))));
  sec('about', 'info', [about]);
  function filterRows() {
    const q = S.view.query;
    for (const g of groups) {
      let any = false;
      g.querySelectorAll('.setrow').forEach(r => { const hit = !q || r.dataset.search.includes(q); r.style.display = hit ? '' : 'none'; if (hit) any = true; });
      g.style.display = any || !q ? '' : 'none';
    }
  }
  filterRows();
}
function useGeo() {
  if (!navigator.geolocation) return toast(t('w.geo'));
  S.geoBusy = true;
  navigator.geolocation.getCurrentPosition(pos => {
    S.geoBusy = false;
    S.settings.location.source = 'geo';
    S.settings.location.latitude = +pos.coords.latitude.toFixed(4);
    S.settings.location.longitude = +pos.coords.longitude.toFixed(4);
    saveSettings(); applySettings(); toast(t('set.geok'));
  }, () => { S.geoBusy = false; toast(t('w.geo')); rebuildActive(); }, { timeout: 12000, maximumAge: 600000 });
}
function exportSettings() {
  const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), settings: S.settings }, null, 2)], { type: 'application/json' });
  const a = el('a', { href: URL.createObjectURL(blob), download: 'sky-widget-settings.json' });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast(t('c.export') + ' ✓');
}
function importSettings(ev) {
  const f = ev.target.files[0]; ev.target.value = '';
  if (!f) return;
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const j = JSON.parse(String(rd.result));
      const raw = j && j.settings ? j.settings : j;
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('bad');
      const snapshot = structuredClone(S.settings);
      S.settings = sanitize(raw); saveSettings(); applySettings();
      toast(t('set.importok'), { action: t('c.undo'), onAction: () => { S.settings = snapshot; saveSettings(); applySettings(); } });
    } catch { toast(t('set.importbad')); }
  };
  rd.readAsText(f);
}
function resetSettings() {
  const snapshot = structuredClone(S.settings);
  S.settings = structuredClone(DEFAULTS);
  S.settings.language.app = snapshot.language.app;
  saveSettings(); applySettings();
  toast(t('set.resetdone'), { action: t('c.undo'), onAction: () => { S.settings = snapshot; saveSettings(); applySettings(); } });
}
async function checkUpdates() {
  try {
    const res = await fetch('updates/manifest.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('http');
    const man = await res.json();
    let updated = false;
    if (man.holidays && man.holidays !== S.holDataset.version && man.holidaysFile) {
      const r2 = await fetch(man.holidaysFile, { cache: 'no-store' });
      if (r2.ok) {
        const d = await r2.json();
        if (validateHolidayDataset(d)) {
          S.holDataset = d; updated = true;
          try { localStorage.setItem(HOL_KEY, JSON.stringify(d)); } catch { toast(t('w.storage')); }
        }
      }
    }
    toast(updated ? t('st.updated') : t('h.uptodate'));
    if (updated) { S._holKey = null; recompute(); rebuildActive(); }
  } catch { toast(t('h.updatefail')); }
}

/* ---------- compact preview dialog ---------- */
function openCompact() {
  const dlg = $('#dlg'), body = $('#dlgBody');
  body.innerHTML = '';
  const s = S.settings;
  const w = el('dual-calendar-sky-widget', {
    'app-language': s.language.app, 'gregorian-language': s.language.gregorian, 'hijri-language': s.language.hijri,
    direction: s.language.direction, 'primary-calendar': s.calendar.primary, 'hijri-method': s.calendar.method,
    'hijri-adjustment-days': s.calendar.adj, rollover: s.calendar.rollover.mode,
    'sunset-offset-minutes': s.calendar.rollover.offset, countries: s.holidays.countries.join(','), theme: s.theme.mode });
  if (s.location.source === 'manual' && s.location.latitude != null) { w.setAttribute('latitude', s.location.latitude); if (s.location.longitude != null) w.setAttribute('longitude', s.location.longitude); }
  if (s.location.timezone) w.setAttribute('timezone', s.location.timezone);
  body.append(el('h3', {}, t('t.preview'), el('button', { type: 'button', class: 'btn icon', 'aria-label': t('c.close'), onclick: () => dlg.close() }, icon('x', 16))),
    w, el('p', { class: 'dim', style: { fontSize: '.75rem', marginBlockEnd: 0 }, text: t('t.compact') + ' · <dual-calendar-sky-widget>' }));
  dlg.showModal();
  dlg.onclick = ev => { if (ev.target === dlg) dlg.close(); };
}

/* ---------- apply / lifecycle ---------- */
let sky;
function applySettings(rebuild = true) {
  const html = document.documentElement;
  html.lang = S.settings.language.app;
  html.dir = uiDir();
  document.title = t('app.title');
  document.body.classList.toggle('no-motion', reduced());
  S._holKey = null;
  recompute();
  renderHeader(); renderTabs(); renderBanners(); renderFoot();
  sky.refresh(); sky.setRunning(!document.hidden);
  if (rebuild) rebuildActive(); else tickActive();
}
function tickActive() {
  ({ today: tickToday, solar: tickSolar, moon: tickMoon })[S.view.tab]?.(false);
}
let secTimer = 0, tickCount = 0;
function startClock() {
  stopClock();
  secTimer = setInterval(() => {
    S.now = Date.now();
    tickCount++;
    if (S.view.tab === 'today' || S.view.tab === 'solar') {
      const r = P.today;
      if (S.view.tab === 'today' && r) r.clock.innerHTML = '', r.clock.append(el('bdi', { text: fmtClock(E.tzParts(S.now, S.tz), S.settings.language.app, S.settings.solar.clock, S.settings.solar.seconds, S.settings.language.numbers) }));
    }
    if (tickCount % 15 === 0) {
      recompute();
      const key = S.dates.gJdn + '|' + S.dates.hAnchor;
      if (S.lastDateKey && S.lastDateKey !== key) {
        announce(t('a.datechanged', { d: fmtG(S.dates.gJdn) + ' — ' + fmtH(S.dates.hAnchor) }));
        renderBanners();
        if (['today', 'calendar', 'holidays'].includes(S.view.tab)) rebuildActive(); else tickActive();
      } else tickActive();
      S.lastDateKey = key;
    }
  }, 1000);
}
function stopClock() { clearInterval(secTimer); }
function boot() {
  sky = new Sky($('#sky'), () => S.settings, reduced);
  applySettings();
  S.lastDateKey = S.dates.gJdn + '|' + S.dates.hAnchor;
  const urlTab = new URLSearchParams(location.search).get('tab');
  switchTab(TABS.some(x => x[0] === urlTab) ? urlTab : 'today');
  startClock();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { stopClock(); sky.setRunning(false); }
    else { recompute(); tickActive(); startClock(); sky.setRunning(true); }
  });
  addEventListener('online', renderHeader); addEventListener('offline', renderHeader);
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', () => applySettings(false));
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { if (S.settings.theme.mode === 'system') applySettings(false); });
  addEventListener('beforeinstallprompt', ev => { ev.preventDefault(); deferredInstall = ev; renderHeader(); });
  addEventListener('appinstalled', () => { deferredInstall = null; renderHeader(); toast(t('c.install') + ' ✓'); });
  addEventListener('keydown', ev => { if (ev.key === 'Escape' && $('#dlg').open) $('#dlg').close(); });
  // Service worker — offline shell
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(reg => {
      renderHeader();
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw?.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller)
            toast(t('st.updated'), { action: t('c.refresh'), timeout: 15000, onAction: () => nw.postMessage('SKIP_WAITING') });
        });
      });
      if (S.settings.updates.enabled && navigator.onLine) checkUpdates();
    }).catch(() => renderHeader());
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded) { reloaded = true; location.reload(); } });
  }
}
boot();
