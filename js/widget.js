
// ================= <dual-calendar-sky-widget> — embeddable compact mode =================
import { solarNow, moonNow, toHijri, fromHijri, civilJdnOf, jdnToGreg, gregToJdn, weekdayOf, tzParts, expandHolidays } from './engines.js';
import { t, fmtDateParts, fmtClock, fmtNum, LOCALES } from './i18n.js';
import { DEFAULTS, sanitize, resolveLocation, HOLIDAYS, flagOf } from './data.js';
import { skyPalette } from './theme.js';

const CSS = `
:host{display:block;contain:content;font-family:ui-sans-serif,system-ui,"Segoe UI","Noto Kufi Arabic",Tahoma,sans-serif}
.w{position:relative;border-radius:16px;padding:14px 16px;overflow:hidden;border:1px solid rgba(128,150,200,.35);color:var(--wt,#eef3ff);background:linear-gradient(180deg,var(--wt0,#04081c),var(--wt1,#0a1434) 55%,var(--wt2,#182652))}
.scrim{position:absolute;inset:0;background:var(--ws,rgba(2,4,14,.18));pointer-events:none}
.row{position:relative;display:flex;align-items:baseline;justify-content:space-between;gap:10px}
.clock{font-size:1.7rem;font-weight:800;font-variant-numeric:tabular-nums;letter-spacing:-.01em}
.period{font-size:.72rem;font-weight:700;padding:3px 9px;border-radius:99px;background:rgba(232,182,76,.2);border:1px solid rgba(232,182,76,.5)}
.d1{position:relative;font-size:.95rem;font-weight:700;margin-block-start:8px}
.d2{position:relative;font-size:.85rem;font-weight:600;opacity:.85;margin-block-start:2px}
.b{position:relative;display:flex;align-items:center;gap:8px;margin-block-start:10px;flex-wrap:wrap}
.chip{display:inline-flex;align-items:center;gap:5px;font-size:.68rem;font-weight:650;padding:3px 8px;border-radius:99px;border:1px solid rgba(128,150,200,.4)}
.gold{background:rgba(232,182,76,.2);border-color:rgba(232,182,76,.55)}
small{opacity:.75;font-weight:500}
svg{display:block}
`;
let UID = 0;
function moonMini(k, elong, roll, size) {
  const r = 10, t = r * Math.cos(elong * Math.PI / 180);
  const path = `M ${-r} 0 A ${r} ${r} 0 0 1 ${r} 0 A ${r} ${Math.abs(t).toFixed(2)} 0 0 ${t > 0 ? 1 : 0} ${-r} 0 Z`;
  const id = 'wm' + (++UID);
  return `<svg width="${size}" height="${size}" viewBox="-13 -13 26 26" aria-hidden="true">
  <defs><radialGradient id="${id}"><stop offset="0" stop-color="#fdf6dd"/><stop offset="1" stop-color="#d9d2b8"/></radialGradient></defs>
  <g transform="rotate(${roll == null ? 0 : roll.toFixed(1)})">
  <circle r="${r}" fill="#2a3050" stroke="rgba(200,210,255,.4)" stroke-width=".6"/>
  <path d="${path}" fill="url(#${id})"/></g></svg>`;
}
export class DualCalendarSkyWidget extends HTMLElement {
  static get observedAttributes() {
    return ['app-language','gregorian-language','hijri-language','direction','primary-calendar','hijri-method','hijri-adjustment-days','rollover','sunset-offset-minutes','latitude','longitude','timezone','country','countries','theme'];
  }
  connectedCallback() {
    if (this._built) return; this._built = true;
    const sh = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style'); style.textContent = CSS; sh.appendChild(style);
    this._root = document.createElement('div'); this._root.className = 'w'; sh.appendChild(this._root);
    this._applyAttrs();
    this._timer = setInterval(() => this._tick(), 1000);
    this._io = new IntersectionObserver(en => { this._visible = en[0].isIntersecting; }, { threshold: 0 });
    this._io.observe(this); this._visible = true;
    this._tick(true);
  }
  disconnectedCallback() { clearInterval(this._timer); this._io?.disconnect(); this._built = false; }
  attributeChangedCallback() { if (this._built) { this._applyAttrs(); this._tick(true); this.dispatchEvent(new CustomEvent('settings-change', { detail: { settings: this._s } })); } }
  _applyAttrs() {
    const g = n => this.getAttribute(n);
    const raw = structuredClone(DEFAULTS);
    if (g('app-language')) raw.language.app = g('app-language');
    if (g('gregorian-language')) raw.language.gregorian = g('gregorian-language');
    if (g('hijri-language')) raw.language.hijri = g('hijri-language');
    if (g('direction')) raw.language.direction = g('direction');
    if (g('primary-calendar')) raw.calendar.primary = g('primary-calendar');
    if (g('hijri-method')) raw.calendar.method = g('hijri-method');
    if (g('hijri-adjustment-days')) raw.calendar.adj = +g('hijri-adjustment-days');
    if (g('rollover')) raw.calendar.rollover.mode = g('rollover');
    if (g('sunset-offset-minutes')) raw.calendar.rollover.offset = +g('sunset-offset-minutes');
    if (g('latitude')) { raw.location.source = 'manual'; raw.location.latitude = +g('latitude'); raw.location.longitude = g('longitude') ? +g('longitude') : null; }
    if (g('timezone')) raw.location.timezone = g('timezone');
    const cc = g('countries') || g('country');
    if (cc) raw.holidays.countries = cc.split(',').map(s => s.trim().toUpperCase());
    if (g('theme')) raw.theme.mode = g('theme');
    this._s = sanitize(raw);
    this._holCache = null;
  }
  _tick(force) {
    if (!this._visible && !force) return;
    try {
      const s = this._s, lang = s.language.app, now = Date.now();
      const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const loc = resolveLocation(s, deviceTz);
      const solar = solarNow(now, loc.lat, loc.lon, loc.tz, s.solar);
      const jdn = civilJdnOf(now, loc.tz);
      let hAnchor = jdn, evening = false;
      if (s.calendar.rollover.mode === 'sunset' && solar.ev.sunset != null && now >= solar.ev.sunset + s.calendar.rollover.offset * 60000) { hAnchor = jdn + 1; evening = true; }
      const gJdn = s.calendar.rollover.applyTo === 'both' && evening ? jdn + 1 : jdn;
      const g = jdnToGreg(gJdn), h = toHijri(hAnchor, s.calendar.method, s.calendar.adj);
      const gp = { ...g, wd: weekdayOf(gJdn) }, hp = { ...h, wd: weekdayOf(hAnchor) };
      const moon = moonNow(now, loc.lat, loc.lon, loc.tz, !loc.missing);
      const p = skyPalette(solar.alt, { mode: s.theme.mode, custom: s.theme.custom, systemDark: matchMedia('(prefers-color-scheme: dark)').matches });
      const yr = g.y;
      if (!this._holCache || this._holCache.yr !== yr) this._holCache = { yr, list: expandHolidays(HOLIDAYS, s.holidays.countries, [yr], s.calendar.method, s.calendar.adj) };
      const todays = this._holCache.list.filter(e => jdn >= e.jdn && jdn < e.jdn + e.duration);
      const gStr = fmtDateParts(gp, s.language.gregorian, 'gregorian', 'long', s.language.numbers);
      const hStr = fmtDateParts(hp, s.language.hijri, 'hijri', 'long', s.language.numbers);
      const key = gStr + '|' + hStr;
      if (this._lastKey && this._lastKey !== key) this.dispatchEvent(new CustomEvent('date-change', { detail: { gregorian: gp, hijri: hp } }));
      this._lastKey = key;
      const tp = tzParts(now, loc.tz);
      const dir = s.language.direction === 'auto' ? (LOCALES[lang] || LOCALES.en).dir : s.language.direction;
      const per = (s.solar.periodNames[lang] && s.solar.periodNames[lang][solar.period]) || t(lang, 'p.' + solar.period);
      const r = this._root;
      r.dir = dir;
      r.style.setProperty('--wt0', p.top); r.style.setProperty('--wt1', p.mid); r.style.setProperty('--wt2', p.hor);
      r.style.setProperty('--wt', p.text); r.style.setProperty('--ws', p.scrim);
      const prim = s.calendar.primary === 'hijri' ? hStr : gStr, sec = s.calendar.primary === 'hijri' ? gStr : hStr;
      const primDir = s.calendar.primary === 'hijri' ? (LOCALES[s.language.hijri] || LOCALES.en).dir : (LOCALES[s.language.gregorian] || LOCALES.en).dir;
      const secDir = s.calendar.primary === 'hijri' ? (LOCALES[s.language.gregorian] || LOCALES.en).dir : (LOCALES[s.language.hijri] || LOCALES.en).dir;
      const hol = todays[0];
      const holName = hol ? (hol.names[lang] || hol.names.en) : '';
      r.innerHTML = `<div class="scrim"></div>
      <div class="row"><span class="clock" dir="ltr"><bdi>${fmtClock(tp, lang, s.solar.clock, false, s.language.numbers)}</bdi></span>
      <span class="period"><bdi>${per}</bdi></span></div>
      <div class="d1" dir="${primDir}"><bdi>${prim}</bdi></div>
      <div class="d2" dir="${secDir}"><bdi>${sec}</bdi></div>
      <div class="b">${moonMini(moon.k, moon.elong, s.moon.showRoll ? moon.roll : null, 26)}
      <span class="chip"><bdi>${t(lang, 'm.' + moon.phaseKey)} · ${fmtNum(moon.k * 100, lang, s.language.numbers, 0)}${(LOCALES[lang] || LOCALES.en).pct}</bdi></span>
      ${evening ? `<span class="chip gold"><bdi>☾ ${t(lang, 't.evening')}</bdi></span>` : ''}
      ${hol ? `<span class="chip gold" role="status"><bdi>${flagOf(hol.country)} ${holName}${todays.length > 1 ? ' +' + (todays.length - 1) : ''}</bdi></span>` : ''}
      ${loc.approx ? `<small><bdi>≈ ${loc.place ? loc.place[2] : loc.tz}</bdi></small>` : ''}</div>`;
      if (hol) this.dispatchEvent(new CustomEvent('holiday-select', { detail: { id: hol.id } }));
    } catch (err) {
      this.dispatchEvent(new CustomEvent('error', { detail: { message: String(err && err.message || err) } }));
    }
  }
}
if (!customElements.get('dual-calendar-sky-widget')) customElements.define('dual-calendar-sky-widget', DualCalendarSkyWidget);
export function embedSnippet(settings, base) {
  const s = settings, attrs = [
    `app-language="${s.language.app}"`, `gregorian-language="${s.language.gregorian}"`, `hijri-language="${s.language.hijri}"`,
    `primary-calendar="${s.calendar.primary}"`, `hijri-method="${s.calendar.method}"`,
    `rollover="${s.calendar.rollover.mode}"`, `sunset-offset-minutes="${s.calendar.rollover.offset}"`,
    `countries="${s.holidays.countries.join(',')}"`, `theme="${s.theme.mode}"`];
  if (s.location.source === 'manual' && s.location.latitude != null) attrs.push(`latitude="${s.location.latitude}"`, `longitude="${s.location.longitude ?? ''}"`);
  return `<script type="module" src="${base}js/widget.js"></scr` + `ipt>\n<dual-calendar-sky-widget\n  ${attrs.join('\n  ')}>\n</dual-calendar-sky-widget>`;
}
