
// ================= Calculation engines — pure, offline, no DOM =================
export const ENGINE_VERSION = '1.0.0';
const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
const norm = (x, m = 360) => ((x % m) + m) % m;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const msToJd = ms => ms / 86400000 + 2440587.5;
export const jdToMs = jd => (jd - 2440587.5) * 86400000;
export { clamp, norm };

/* ---------- Gregorian (integer JDN, proleptic, DST-safe) ---------- */
export function gregToJdn(y, m, d) {
  const a = Math.floor((14 - m) / 12), y2 = y + 4800 - a, m2 = m + 12 * a - 3;
  return d + Math.floor((153 * m2 + 2) / 5) + 365 * y2 + Math.floor(y2 / 4) - Math.floor(y2 / 100) + Math.floor(y2 / 400) - 32045;
}
export function jdnToGreg(j) {
  const a = j + 32044, b = Math.floor((4 * a + 3) / 146097), c = a - Math.floor(146097 * b / 4);
  const dd = Math.floor((4 * c + 3) / 1461), e = c - Math.floor(1461 * dd / 4), m = Math.floor((5 * e + 2) / 153);
  return { y: 100 * b + dd - 4800 + Math.floor(m / 10), m: m + 3 - 12 * Math.floor(m / 10), d: e - Math.floor((153 * m + 2) / 5) + 1 };
}
export const weekdayOf = j => norm(j + 1, 7); // 0 = Sunday
export function monthLenGreg(y, m) { return gregToJdn(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1, 1) - gregToJdn(y, m, 1); }

/* ---------- Timezone utilities (Intl-based, cached, DST two-pass) ---------- */
const DTF = new Map();
export function validTz(tz) { try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; } }
function dtf(tz) {
  let f = DTF.get(tz);
  if (!f) { f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }); DTF.set(tz, f); }
  return f;
}
export function tzParts(ms, tz) {
  const o = {}; for (const p of dtf(tz).formatToParts(ms)) if (p.type !== 'literal') o[p.type] = +p.value;
  return { y: o.year, m: o.month, d: o.day, h: o.hour, mi: o.minute, s: o.second };
}
export function tzOffsetMs(ms, tz) { const p = tzParts(ms, tz); return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(ms / 1000) * 1000; }
export function utcFromCivil(y, m, d, h, mi, s, tz) {
  const guess = Date.UTC(y, m - 1, d, h, mi, s);
  let t = guess - tzOffsetMs(guess, tz);
  return guess - tzOffsetMs(t, tz);
}
export function civilJdnOf(ms, tz) { const p = tzParts(ms, tz); return gregToJdn(p.y, p.m, p.d); }
export function tzAbbrev(ms, tz) {
  try { const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' }).formatToParts(ms).find(x => x.type === 'timeZoneName'); return p ? p.value : ''; } catch { return ''; }
}

/* ---------- Hijri: civil / tabular (deterministic) ---------- */
export function hijriToJdnCivil(y, m, d) { return d + Math.ceil(29.5 * (m - 1)) + (y - 1) * 354 + Math.floor((3 + 11 * y) / 30) + 1948439; }
export function jdnToHijriCivil(j) {
  const y = Math.floor((30 * (j - 1948440) + 10646) / 10631);
  const m = Math.min(12, Math.ceil((j - 29 - hijriToJdnCivil(y, 1, 1)) / 29.5) + 1);
  return { y, m, d: j - hijriToJdnCivil(y, m, 1) + 1 };
}

/* ---------- Hijri: Umm al-Qura via bundled ICU (fully offline) ---------- */
let UAQ = null, UAQ_OK = false;
try {
  UAQ = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric' });
  UAQ_OK = UAQ.resolvedOptions().calendar === 'islamic-umalqura';
} catch { UAQ_OK = false; }
export const uaqSupported = () => UAQ_OK;
function uaqFromJdn(j) {
  const g = jdnToGreg(j); let y = 0, m = 0, d = 0;
  for (const p of UAQ.formatToParts(Date.UTC(g.y, g.m - 1, g.d, 12))) {
    if (p.type === 'year') y = parseInt(p.value, 10); else if (p.type === 'month') m = +p.value; else if (p.type === 'day') d = +p.value;
  }
  return { y, m, d };
}

/* ---------- Moon position (Meeus abridged, ~0.05° accuracy) ---------- */
const MOON_L = [[0,0,1,0,6288774,-20905355],[2,0,-1,0,1274027,-3699111],[2,0,0,0,658314,-2955968],[0,0,2,0,213618,-569925],[0,1,0,0,-185116,48888],[0,0,0,2,-114332,-3149],[2,0,-2,0,58793,246158],[2,-1,-1,0,57066,-152138],[2,0,1,0,53322,-170733],[2,-1,0,0,45758,-204586],[0,1,-1,0,-40923,-129620],[1,0,0,0,-34720,108743],[0,1,1,0,-30383,104755],[2,0,0,-2,15327,10321],[0,0,1,2,-12528,0],[0,0,1,-2,10980,79661],[4,0,-1,0,10675,-34782],[0,0,3,0,10034,-23210],[4,0,-2,0,8548,-21636],[2,1,-1,0,-7888,24208],[2,1,0,0,-6766,30824],[1,0,-1,0,-5163,-8379],[1,1,0,0,4987,-16675],[2,-1,1,0,4036,-12831],[2,0,2,0,3994,-10445],[4,0,0,0,3861,-11650],[2,0,-3,0,3665,14403],[0,1,-2,0,-2689,-7003],[2,0,-1,2,-2602,0],[2,-1,-2,0,2390,10056],[1,0,1,0,-2348,6322],[2,-2,0,0,2236,-9884],[0,1,2,0,-2120,5751],[0,2,0,0,-2069,0],[2,-2,-1,0,2048,-4950],[2,0,1,-2,-1773,4130],[2,0,0,2,-1595,0],[4,-1,-1,0,1215,-3958],[0,0,2,2,-1110,0],[3,0,-1,0,-892,3258]];
const MOON_B = [[0,0,0,1,5128122],[0,0,1,1,280602],[0,0,1,-1,277693],[2,0,0,-1,173237],[2,0,-1,1,55413],[2,0,-1,-1,46271],[2,0,0,1,32573],[0,0,2,1,17198],[2,0,1,-1,9266],[0,0,2,-1,8822],[2,-1,0,-1,8216],[2,0,-2,-1,4324],[2,0,1,1,4200],[2,1,0,-1,-3359],[2,-1,-1,1,2463],[2,-1,0,1,2211],[2,-1,-1,-1,2065],[0,1,-1,-1,-1870],[4,0,-1,-1,1828],[0,1,0,1,-1794],[0,0,0,3,-1749],[0,1,-1,1,-1565],[1,0,0,1,-1491],[0,1,1,1,-1475],[0,1,1,-1,-1410],[0,1,0,-1,-1344],[1,0,0,-1,-1335],[0,0,3,1,1107],[4,0,0,-1,1021],[4,0,-1,1,833]];
export function moonPos(jd) {
  const T = (jd - 2451545) / 36525;
  const Lp = norm(218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + T ** 3 / 538841 - T ** 4 / 65194000);
  const D = norm(297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + T ** 3 / 545868 - T ** 4 / 113065000);
  const M = norm(357.5291092 + 35999.0502909 * T - 0.0001536 * T * T + T ** 3 / 24490000);
  const Mp = norm(134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + T ** 3 / 69699 - T ** 4 / 14712000);
  const F = norm(93.272095 + 483202.0175233 * T - 0.0036539 * T * T - T ** 3 / 3526000 + T ** 4 / 863310000);
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;
  let sl = 0, sr = 0, sb = 0;
  for (const [d, m, mp, f, cl, cr] of MOON_L) {
    const e = Math.abs(m) === 2 ? E * E : Math.abs(m) === 1 ? E : 1, a = rad(norm(d * D + m * M + mp * Mp + f * F));
    sl += cl * e * Math.sin(a); sr += cr * e * Math.cos(a);
  }
  for (const [d, m, mp, f, cb] of MOON_B) {
    const e = Math.abs(m) === 2 ? E * E : Math.abs(m) === 1 ? E : 1;
    sb += cb * e * Math.sin(rad(norm(d * D + m * M + mp * Mp + f * F)));
  }
  const A1 = rad(norm(119.75 + 131.849 * T)), A2 = rad(norm(53.09 + 479264.29 * T)), A3 = rad(norm(313.45 + 481266.484 * T));
  sl += 3958 * Math.sin(A1) + 1962 * Math.sin(rad(Lp - F)) + 318 * Math.sin(A2);
  sb += -2235 * Math.sin(rad(Lp)) + 382 * Math.sin(A3) + 175 * Math.sin(A1 - rad(F)) + 175 * Math.sin(A1 + rad(F)) + 127 * Math.sin(rad(Lp - Mp)) - 115 * Math.sin(rad(Lp + Mp));
  return { lon: norm(Lp + sl / 1e6), lat: sb / 1e6, dist: 385000.56 + sr / 1000 };
}
export function newMoonJD(k) {
  const T = k / 1236.85, T2 = T * T, T3 = T2 * T, T4 = T2 * T2;
  let jde = 2451550.09766 + 29.530588861 * k + 0.00015437 * T2 - 0.00000015 * T3 + 0.00000000073 * T4;
  const M = rad(norm(2.5534 + 29.1053567 * k - 0.0000014 * T2 - 0.00000011 * T3));
  const Mp = rad(norm(201.5643 + 385.81693528 * k + 0.0107582 * T2 + 0.00001238 * T3 - 0.000000058 * T4));
  const F = rad(norm(160.7108 + 390.67050284 * k - 0.0016118 * T2 - 0.00000227 * T3 + 0.000000011 * T4));
  const O = rad(norm(124.7746 - 1.56375588 * k + 0.0020672 * T2 + 0.00000215 * T3));
  const E = 1 - 0.002516 * T - 0.0000074 * T2;
  jde += -0.4072 * Math.sin(Mp) + 0.17241 * E * Math.sin(M) + 0.01608 * Math.sin(2 * Mp) + 0.01039 * Math.sin(2 * F)
    + 0.00739 * E * Math.sin(Mp - M) - 0.00514 * E * Math.sin(Mp + M) + 0.00208 * E * E * Math.sin(2 * M)
    - 0.00111 * Math.sin(Mp - 2 * F) - 0.00057 * Math.sin(Mp + 2 * F) + 0.00056 * E * Math.sin(2 * Mp + M)
    - 0.00042 * Math.sin(3 * Mp) + 0.00042 * E * Math.sin(M + 2 * F) + 0.00038 * E * Math.sin(M - 2 * F)
    - 0.00024 * E * Math.sin(2 * Mp - M) - 0.00017 * Math.sin(O) - 0.00007 * Math.sin(Mp + 2 * M)
    + 0.00004 * Math.sin(2 * Mp - 2 * F) + 0.00004 * Math.sin(3 * M) + 0.00003 * Math.sin(Mp + M - 2 * F)
    + 0.00003 * Math.sin(2 * Mp + 2 * F) - 0.00003 * Math.sin(Mp + M + 2 * F) + 0.00003 * Math.sin(Mp - M + 2 * F)
    - 0.00002 * Math.sin(Mp - M - 2 * F) - 0.00002 * Math.sin(3 * Mp + M) + 0.00002 * Math.sin(4 * Mp);
  return jde;
}

/* ---------- Solar position (NOAA / Meeus) ---------- */
export function solarCalc(jd) {
  const T = (jd - 2451545) / 36525;
  const L0 = norm(280.46646 + T * (36000.76983 + T * 0.0003032));
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const C = Math.sin(rad(M)) * (1.914602 - T * (0.004817 + 0.000014 * T)) + Math.sin(rad(2 * M)) * (0.019993 - 0.000101 * T) + Math.sin(rad(3 * M)) * 0.000289;
  const omega = 125.04 - 1934.136 * T;
  const lambda = L0 + C - 0.00569 - 0.00478 * Math.sin(rad(omega));
  const eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(rad(omega));
  const decl = deg(Math.asin(Math.sin(rad(eps)) * Math.sin(rad(lambda))));
  const y = Math.tan(rad(eps / 2)) ** 2;
  const eqtime = 4 * deg(y * Math.sin(2 * rad(L0)) - 2 * e * Math.sin(rad(M)) + 4 * e * y * Math.sin(rad(M)) * Math.cos(2 * rad(L0)) - 0.5 * y * y * Math.sin(4 * rad(L0)) - 1.25 * e * e * Math.sin(2 * rad(M)));
  return { decl, eqtime, lambda: norm(lambda), eps, distAU: 1.000001018 * (1 - e * e) / (1 + e * Math.cos(rad(M + C))) };
}
function refraction(alt) {
  if (alt > 85) return 0;
  const t = Math.tan(rad(alt)); let r;
  if (alt > 5) r = 58.1 / t - 0.07 / t ** 3 + 0.000086 / t ** 5;
  else if (alt > -0.575) r = 1735 + alt * (-518.2 + alt * (103.4 + alt * (-12.79 + alt * 0.711)));
  else r = -20.774 / t;
  return r / 3600;
}
export function sunPosition(ms, lat, lon) {
  const jd = msToJd(ms), sc = solarCalc(jd);
  const utcMin = norm(ms, 86400000) / 60000;
  const tst = norm(utcMin + sc.eqtime + 4 * lon, 1440);
  let ha = tst / 4 - 180; if (ha < -180) ha += 360;
  const latR = rad(lat), decR = rad(sc.decl);
  const cosZen = clamp(Math.sin(latR) * Math.sin(decR) + Math.cos(latR) * Math.cos(decR) * Math.cos(rad(ha)), -1, 1);
  const zen = Math.acos(cosZen);
  const alt = 90 - deg(zen) + refraction(90 - deg(zen));
  const denom = Math.cos(latR) * Math.sin(zen);
  let az = 180;
  if (Math.abs(denom) > 1e-9) {
    const c = clamp((Math.sin(latR) * Math.cos(zen) - Math.sin(decR)) / denom, -1, 1);
    az = ha > 0 ? norm(deg(Math.acos(c)) + 180) : norm(540 - deg(Math.acos(c)));
  }
  return { alt, az, ha, decl: sc.decl, eqtime: sc.eqtime };
}
const EV_CACHE = new Map();
export function sunEvents(jdn, lat, lon, tz) {
  const key = `${jdn}|${lat.toFixed(3)}|${lon.toFixed(3)}|${tz}`;
  if (EV_CACHE.has(key)) return EV_CACHE.get(key);
  if (EV_CACHE.size > 900) EV_CACHE.clear();
  const g = jdnToGreg(jdn);
  const noonGuess = utcFromCivil(g.y, g.m, g.d, 12, 0, 0, tz);
  const sc0 = solarCalc(msToJd(noonGuess));
  const latR = rad(lat);
  function event(zen, kind) { // kind: -1 rise, +1 set, 0 noon
    const refine = t => {
      const sc = solarCalc(msToJd(t));
      let ha = 0;
      if (zen != null) {
        const c = Math.cos(rad(zen)) / (Math.cos(latR) * Math.cos(rad(sc.decl))) - Math.tan(latR) * Math.tan(rad(sc.decl));
        if (c < -1 || c > 1) return null;
        ha = deg(Math.acos(c));
      }
      const dt = new Date(t), base = Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());
      const min = kind === 0 ? 720 - 4 * lon - sc.eqtime : kind < 0 ? 720 - 4 * (lon + ha) - sc.eqtime : 720 - 4 * (lon - ha) - sc.eqtime;
      return base + min * 60000;
    };
    let t = refine(noonGuess); if (t == null) return null;
    t = refine(t) ?? t;
    for (let i = 0; i < 3; i++) {
      const cj = civilJdnOf(t, tz); if (cj === jdn) break;
      t += (jdn - cj) * 86400000; t = refine(t) ?? t;
    }
    return civilJdnOf(t, tz) === jdn ? t : null;
  }
  const polarHa = Math.cos(rad(90.833)) / (Math.cos(latR) * Math.cos(rad(sc0.decl))) - Math.tan(latR) * Math.tan(rad(sc0.decl));
  const polar = polarHa < -1 || polarHa > 1;
  const out = polar ? { sunrise: null, sunset: null } : { sunrise: event(90.833, -1), sunset: event(90.833, 1) };
  out.noon = event(null, 0);
  out.civilDawn = event(96, -1); out.civilDusk = event(96, 1);
  out.nautDawn = event(102, -1); out.nautDusk = event(102, 1);
  out.astroDawn = event(108, -1); out.astroDusk = event(108, 1);
  out.polar = polar || out.sunrise == null || out.sunset == null;
  EV_CACHE.set(key, out);
  return out;
}
export function periodOf(ms, pos, ev, opts = {}) {
  const wR = (opts.winRise ?? 15) * 60000, wS = (opts.winSet ?? 15) * 60000, wN = (opts.winNoon ?? 10) * 60000;
  const near = (t, w) => t != null && Math.abs(ms - t) <= w;
  if (near(ev.sunrise, wR)) return 'sunrise';
  if (near(ev.noon, wN)) return 'noon';
  if (near(ev.sunset, wS)) return 'sunset';
  if (pos.alt >= 0) return pos.ha < 0 ? 'morning' : 'afternoon';
  if (pos.alt >= -6) return pos.ha > 0 ? 'evening' : 'civil';
  if (pos.alt >= -12) return 'naut';
  if (pos.alt >= -18) return 'astro';
  return 'night';
}
export function solarNow(ms, lat, lon, tz, opts = {}) {
  const jdn = civilJdnOf(ms, tz);
  const ev = sunEvents(jdn, lat, lon, tz), prev = sunEvents(jdn - 1, lat, lon, tz), next = sunEvents(jdn + 1, lat, lon, tz);
  const pos = sunPosition(ms, lat, lon);
  const midnight = ev.sunset != null && next.sunrise != null ? (ev.sunset + next.sunrise) / 2 : null;
  const prevMid = prev.sunset != null && ev.sunrise != null ? (prev.sunset + ev.sunrise) / 2 : null;
  let progress;
  const { sunrise, noon, sunset } = ev;
  if (!ev.polar && noon != null && next.sunrise != null && prev.sunset != null && midnight != null && prevMid != null) {
    if (ms >= sunrise && ms <= noon) progress = 90 * (ms - sunrise) / (noon - sunrise);
    else if (ms > noon && ms <= sunset) progress = 90 + 90 * (ms - noon) / (sunset - noon);
    else if (ms > sunset) progress = ms <= midnight ? 180 + 90 * (ms - sunset) / (midnight - sunset) : 270 + 90 * (ms - midnight) / (next.sunrise - midnight);
    else progress = ms >= prevMid ? 270 + 90 * (ms - prevMid) / (sunrise - prevMid) : 180 + 90 * (ms - prev.sunset) / (prevMid - prev.sunset);
    progress = norm(progress);
  } else progress = norm(pos.ha + 90); // polar / missing-event fallback (FR-SOLAR-006)
  const rawShadow = pos.alt > 0 ? 1 / Math.tan(rad(pos.alt)) : null;
  return {
    ...pos, jdn, ev, midnight, prevMid, progress, polar: ev.polar,
    period: periodOf(ms, pos, ev, opts),
    shadow: rawShadow == null ? null : clamp(rawShadow, 0, 999),
    shadowClamped: rawShadow != null && rawShadow > 999,
    dayLength: !ev.polar ? sunset - sunrise : (pos.alt > 0 ? 86400000 : 0)
  };
}

/* ---------- Equatorial / horizontal helpers ---------- */
function obliquity(jd) { const T = (jd - 2451545) / 36525; return 23.4392911 - 0.013004167 * T - 1.63889e-7 * T * T + 5.03611e-7 * T ** 3; }
function eclToEq(lon, lat, eps) {
  const l = rad(lon), b = rad(lat), e = rad(eps);
  return { ra: norm(deg(Math.atan2(Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e), Math.cos(l)))), dec: deg(Math.asin(Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l))) };
}
function altAz(ra, dec, ms, lat, lon) {
  const jd = msToJd(ms), T = (jd - 2451545) / 36525;
  const gmst = norm(280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * T * T - T ** 3 / 38710000);
  const H = rad(norm(gmst + lon - ra, 360)), d = rad(dec), p = rad(lat);
  const alt = deg(Math.asin(clamp(Math.sin(p) * Math.sin(d) + Math.cos(p) * Math.cos(d) * Math.cos(H), -1, 1)));
  const az = norm(deg(Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(p) - Math.tan(d) * Math.cos(p))) + 180);
  return { alt, az };
}
const enu = (alt, az) => { const a = rad(alt), z = rad(az); return [Math.cos(a) * Math.sin(z), Math.cos(a) * Math.cos(z), Math.sin(a)]; };
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scl3 = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len3 = a => Math.hypot(a[0], a[1], a[2]);
const nrm3 = a => { const l = len3(a) || 1; return scl3(a, 1 / l); };

function moonTopo(ms, lat, lon) {
  const jd = msToJd(ms), mp = moonPos(jd), eq = eclToEq(mp.lon, mp.lat, obliquity(jd));
  const g = altAz(eq.ra, eq.dec, ms, lat, lon);
  const parallax = deg(Math.asin(6378.14 / mp.dist));
  return { alt: g.alt - parallax * Math.cos(rad(g.alt)), az: g.az, mp, jd };
}
function elongAt(jd) { return norm(moonPos(jd).lon - solarCalc(jd).lambda); }

const PHASE_CACHE = new Map();
function nextPhases(jd) {
  const key = Math.floor(jd * 24);
  if (PHASE_CACHE.has(key)) return PHASE_CACHE.get(key);
  if (PHASE_CACHE.size > 200) PHASE_CACHE.clear();
  const res = {};
  for (const target of [0, 90, 180, 270]) {
    let t = jd, prev = norm(elongAt(t) - target), found = null;
    for (let i = 0; i < 130; i++) {
      t += 0.25; const d = norm(elongAt(t) - target);
      if (prev > 270 && d < 90) {
        let lo = t - 0.25, hi = t;
        for (let j = 0; j < 28; j++) { const mid = (lo + hi) / 2; if (norm(elongAt(mid) - target) > 180) lo = mid; else hi = mid; }
        found = jdToMs((lo + hi) / 2); break;
      }
      prev = d;
    }
    res[target] = found;
  }
  PHASE_CACHE.set(key, res);
  return res;
}
const RISESET_CACHE = new Map();
function moonRiseSet(ms, lat, lon, tz) {
  const jdn = civilJdnOf(ms, tz), key = `${jdn}|${lat.toFixed(2)}|${lon.toFixed(2)}|${tz}`;
  if (RISESET_CACHE.has(key)) return RISESET_CACHE.get(key);
  if (RISESET_CACHE.size > 120) RISESET_CACHE.clear();
  const g = jdnToGreg(jdn), start = utcFromCivil(g.y, g.m, g.d, 0, 0, 0, tz);
  let rise = null, set = null, prevAlt = moonTopo(start, lat, lon).alt;
  for (let i = 1; i <= 146; i++) {
    const t = start + i * 600000, alt = moonTopo(t, lat, lon).alt;
    const cross = (prevAlt + 0.3) * (alt + 0.3) < 0;
    if (cross) {
      let lo = t - 600000, hi = t;
      for (let j = 0; j < 14; j++) { const mid = (lo + hi) / 2; ((moonTopo(lo, lat, lon).alt + 0.3) * (moonTopo(mid, lat, lon).alt + 0.3) < 0) ? hi = mid : lo = mid; }
      const at = (lo + hi) / 2;
      if (alt > prevAlt && rise == null) rise = at;
      if (alt < prevAlt && set == null) set = at;
    }
    prevAlt = alt;
  }
  const out = { rise, set }; RISESET_CACHE.set(key, out); return out;
}
export function phaseKeyOf(elong) {
  const e = norm(elong);
  if (e < 12 || e > 348) return 'new';
  if (Math.abs(e - 180) < 12) return 'full';
  if (Math.abs(e - 90) < 12) return 'fq';
  if (Math.abs(e - 270) < 12) return 'lq';
  if (e < 90) return 'waxc'; if (e < 180) return 'waxg'; if (e < 270) return 'wang'; return 'wanc';
}
const MOON_CACHE = new Map();
export function moonNow(ms, lat, lon, tz, locValid = true) {
  const key = `${Math.floor(ms / 60000)}|${lat.toFixed(2)}|${lon.toFixed(2)}|${tz}|${locValid}`;
  if (MOON_CACHE.has(key)) return MOON_CACHE.get(key);
  if (MOON_CACHE.size > 240) MOON_CACHE.clear();
  const jd = msToJd(ms), mt = moonTopo(ms, lat, lon), sc = solarCalc(jd);
  const elong = norm(mt.mp.lon - sc.lambda);
  const psi = Math.acos(clamp(Math.cos(rad(mt.mp.lat)) * Math.cos(rad(elong)), -1, 1));
  const R = sc.distAU * 149597870.7;
  const i = Math.atan2(R * Math.sin(psi), mt.mp.dist - R * Math.cos(psi));
  const k = clamp((1 + Math.cos(i)) / 2, 0, 1);
  let kk = Math.floor((jd - 2451550.09766) / 29.530588861), conj = newMoonJD(kk);
  if (conj > jd) conj = newMoonJD(--kk);
  const age = jd - conj;
  const sp = sunPosition(ms, lat, lon);
  let roll = null;
  if (locValid && mt.alt > -0.5 && mt.alt < 85 && k > 0.02) {
    const m = enu(mt.alt, mt.az), s = enu(sp.alt, sp.az), up = [0, 0, 1];
    const proj = sub3(s, scl3(m, dot3(s, m)));
    const upP = sub3(up, scl3(m, dot3(up, m)));
    if (len3(proj) > 1e-6 && len3(upP) > 1e-3) {
      const u = nrm3(upP), right = nrm3(cross3(m, u));
      roll = norm(deg(Math.atan2(dot3(proj, right), dot3(proj, u))));
    }
  }
  const phases = nextPhases(jd);
  let nextKey = 'new', nextMs = Infinity;
  for (const [ang, keyName] of [[0, 'new'], [90, 'fq'], [180, 'full'], [270, 'lq']])
    if (phases[ang] != null && phases[ang] < nextMs) { nextMs = phases[ang]; nextKey = keyName; }
  const rs = moonRiseSet(ms, lat, lon, tz);
  const out = { elong, k, age, phaseKey: phaseKeyOf(elong), alt: mt.alt, az: mt.az, roll, dist: mt.mp.dist, rise: rs.rise, set: rs.set, next: { key: nextKey, ms: nextMs === Infinity ? null : nextMs }, nextNew: phases[0], nextFull: phases[180] };
  MOON_CACHE.set(key, out);
  return out;
}

/* ---------- Hijri: astronomical (computed, approximate) ---------- */
const ANCHOR_CACHE = new Map();
function astroAnchor(hy, hm) {
  const key = `${hy}-${hm}`;
  if (ANCHOR_CACHE.has(key)) return ANCHOR_CACHE.get(key);
  const est = hijriToJdnCivil(hy, hm, 1);
  let k = Math.round((est - 0.5 - 2451550.09766) / 29.530588861);
  let conj = newMoonJD(k);
  while (conj > est + 2) conj = newMoonJD(--k);
  while (conj < est - 4) conj = newMoonJD(++k);
  const cjdn = Math.floor(conj + 0.5 + 3 / 24); // civil date at reference (UTC+3)
  let visible = false;
  const ev = sunEvents(cjdn, 21.4225, 39.8262, 'Asia/Riyadh');
  if (ev.sunset != null) {
    const mt = moonTopo(ev.sunset, 21.4225, 39.8262);
    visible = mt.alt > 0 && elongAt(msToJd(ev.sunset)) > 8 && elongAt(msToJd(ev.sunset)) < 60;
  }
  const anchor = cjdn + (visible ? 1 : 2);
  ANCHOR_CACHE.set(key, anchor);
  return anchor;
}
function astroToHijri(j) {
  const c = jdnToHijriCivil(j);
  let { y, m } = c;
  let a = astroAnchor(y, m);
  if (j < a) { m--; if (m < 1) { m = 12; y--; } a = astroAnchor(y, m); }
  else { const nm = m === 12 ? [y + 1, 1] : [y, m + 1]; if (j >= astroAnchor(nm[0], nm[1])) { y = nm[0]; m = nm[1]; a = astroAnchor(y, m); } }
  return { y, m, d: j - a + 1 };
}

/* ---------- Unified Hijri conversion API ---------- */
const TO_CACHE = new Map(), FROM_CACHE = new Map();
function rawToHijri(j, method) {
  if (method === 'islamic-umalqura' && UAQ_OK) return uaqFromJdn(j);
  if (method === 'islamic-astronomical') return astroToHijri(j);
  return jdnToHijriCivil(j);
}
export function toHijri(jdn, method = 'islamic-umalqura', adj = 0) {
  const j = jdn + adj, key = `${method}|${j}`;
  if (TO_CACHE.has(key)) return TO_CACHE.get(key);
  if (TO_CACHE.size > 6000) TO_CACHE.clear();
  const out = rawToHijri(j, method);
  TO_CACHE.set(key, out);
  return out;
}
export function fromHijri(y, m, d, method = 'islamic-umalqura', adj = 0) {
  const key = `${method}|${y}-${m}-${d}`;
  if (FROM_CACHE.has(key)) return FROM_CACHE.get(key) - adj;
  if (FROM_CACHE.size > 6000) FROM_CACHE.clear();
  let jdn;
  if (method === 'islamic-astronomical') jdn = astroAnchor(y, m) + d - 1;
  else if (method === 'islamic-umalqura' && UAQ_OK) {
    const est = hijriToJdnCivil(y, m, d); jdn = null;
    for (let dl = 0; dl <= 40 && jdn == null; dl++)
      for (const s of dl === 0 ? [0] : [-dl, dl]) {
        const h = rawToHijri(est + s, method);
        if (h.y === y && h.m === m && h.d === d) { jdn = est + s; break; }
      }
    if (jdn == null) jdn = est;
  } else jdn = hijriToJdnCivil(y, m, d);
  FROM_CACHE.set(key, jdn);
  return jdn - adj;
}
export function hijriMonthLen(y, m, method, adj = 0) {
  const ny = m === 12 ? y + 1 : y, nm = m === 12 ? 1 : m + 1;
  return fromHijri(ny, nm, 1, method, adj) - fromHijri(y, m, 1, method, adj);
}

/* ---------- Holiday expansion ---------- */
export function easter(Y) {
  const a = Y % 19, b = Math.floor(Y / 100), c = Y % 100, d = Math.floor(b / 4), e = b % 4,
    f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30,
    i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
    mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1;
  return gregToJdn(Y, mo, da);
}
export function nthDow(Y, mo, dow, n) {
  const first = gregToJdn(Y, mo, 1), fd = weekdayOf(first);
  return first + ((dow - fd + 7) % 7) + 7 * (n - 1);
}
export function lastDow(Y, mo, dow) {
  const last = gregToJdn(Y, mo, monthLenGreg(Y, mo)), ld = weekdayOf(last);
  return last - ((ld - dow + 7) % 7);
}
function applySub(jdn, sub) {
  const wd = weekdayOf(jdn);
  if (wd === 6 && sub.sat) return jdn + sub.sat;
  if (wd === 0 && sub.sun) return jdn + sub.sun;
  return jdn;
}
export function expandHolidays(dataset, countries, years, method, adj) {
  const out = [], seen = new Set();
  const y0 = years[0], y1 = years[years.length - 1];
  const hy0 = jdnToHijriCivil(gregToJdn(y0, 1, 1)).y - 1, hy1 = jdnToHijriCivil(gregToJdn(y1, 12, 31)).y + 1;
  for (const c of dataset.countries) {
    if (!countries.includes(c.code)) continue;
    for (const def of c.holidays) {
      const base = { id: def.id, type: def.type, calendar: def.calendar, country: c.code, names: def.names, duration: def.durationDays || 1, beginsSunset: def.calendar === 'islamic' && def.type === 'religious' };
      if (def.calendar === 'gregorian') {
        for (const Y of years) {
          let jdn;
          if (def.rule === 'easter') jdn = easter(Y) + (def.offset || 0);
          else if (def.rule === 'nthDow') jdn = nthDow(Y, def.month, def.dow, def.n);
          else if (def.rule === 'lastDow') jdn = lastDow(Y, def.month, def.dow);
          else jdn = gregToJdn(Y, def.month, def.day);
          if (def.sub) jdn = applySub(jdn, def.sub);
          const key = def.id + '|' + jdn;
          if (!seen.has(key)) { seen.add(key); out.push({ ...base, jdn, estimated: false, official: true }); }
        }
      } else {
        for (let hy = hy0; hy <= hy1; hy++) {
          let jdn = fromHijri(hy, def.month, def.day, method, adj);
          const gY = jdnToGreg(jdn).y;
          if (!years.includes(gY)) continue;
          let official = false;
          const od = def.observedDates && (def.observedDates[String(gY)] || def.observedDates['h' + hy]);
          if (od) { const [oy, om, odd] = od.split('-').map(Number); jdn = gregToJdn(oy, om, odd); official = true; }
          const key = def.id + '|' + jdn;
          if (!seen.has(key)) { seen.add(key); out.push({ ...base, jdn, estimated: !official, official }); }
        }
      }
    }
  }
  out.sort((a, b) => a.jdn - b.jdn || a.country.localeCompare(b.country));
  return out;
}
