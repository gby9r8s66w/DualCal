
// ================= Dynamic sky engine — layered, GPU-friendly, reduced-motion aware =================
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const hex2rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const rgb2hex = c => '#' + c.map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(A.map((v, i) => v + (B[i] - v) * t)); };
const smooth = (x, e0, e1) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
function relLum(hex) {
  const [r, g, b] = hex2rgb(hex).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const KEYS = [
  [-90, '#02040f', '#050b20', '#0a1230'], [-18, '#04081c', '#0a1434', '#182652'],
  [-12, '#071026', '#12204a', '#2c3a70'], [-6, '#0e1a3c', '#233468', '#7c5060'],
  [0, '#1a2c58', '#4a5a90', '#ff9d45'], [6, '#2b5fa8', '#7d9cd0', '#ffc873'],
  [30, '#2f74d4', '#82b4ea', '#dceefb'], [90, '#2a6ad0', '#78aee9', '#d4e9f9']
];
export function skyPalette(alt, opts = {}) {
  const { mode = 'auto', custom = null, systemDark = false } = opts;
  let a = alt;
  if (mode === 'day') a = 45; else if (mode === 'night') a = -30; else if (mode === 'system') a = systemDark ? -30 : 45;
  let top, mid, hor;
  if (mode === 'custom' && custom) { top = custom.top; hor = custom.horizon; mid = mix(top, hor, 0.5); a = 0; }
  else {
    let i = 0; while (i < KEYS.length - 2 && a > KEYS[i + 1][0]) i++;
    const A = KEYS[i], B = KEYS[i + 1], t = smooth(a, A[0], B[0]);
    top = mix(A[1], B[1], t); mid = mix(A[2], B[2], t); hor = mix(A[3], B[3], t);
  }
  const warm = Math.exp(-((a / 7) ** 2));
  const night = 1 - smooth(a, -12, 4);
  const light = relLum(mid) > 0.44;
  return {
    top, mid, hor, warm, night, light,
    sunGlow: mix('#fff4cf', '#ff7b2e', clamp(warm * 1.15, 0, 1)), moonGlow: '#dfe9ff',
    text: light ? '#101b30' : '#eef3ff',
    dim: light ? 'rgba(16,27,48,.72)' : 'rgba(238,243,255,.72)',
    card: light ? 'rgba(255,255,255,.62)' : 'rgba(9,13,30,.55)',
    border: light ? 'rgba(16,27,48,.16)' : 'rgba(238,243,255,.16)',
    scrim: light ? 'rgba(255,255,255,.10)' : 'rgba(2,4,14,.18)',
    accent: (mode === 'custom' && custom && custom.accent) || '#e8b64c',
    info: light ? '#0b57d0' : '#8ecbff'
  };
}
export class Sky {
  constructor(root, getSettings, getReduced) {
    this.root = root; this.getSettings = getSettings; this.getReduced = getReduced;
    this.cur = null; this.target = null; this.raf = 0; this.last = 0; this.running = false;
    this.inputs = { alt: -30, az: 180, trend: 0, moonAlt: -30, moonAz: 180, moonK: 0 };
    root.innerHTML = '';
    const mk = (cls, tag = 'div') => { const e = document.createElement(tag); e.className = cls; root.appendChild(e); return e; };
    mk('ambient amb-a'); mk('ambient amb-b');
    this.st1 = mk('stars st1', 'canvas'); this.st2 = mk('stars st2', 'canvas');
    mk('horizon-glow'); mk('sun-glow'); mk('moon-glow');
    const comet = mk('comet'); comet.appendChild(document.createElement('i'));
    mk('grain'); mk('scrim');
    this.systemMq = matchMedia('(prefers-color-scheme: dark)');
    this._resize = () => this.drawStars();
    addEventListener('resize', this._resize, { passive: true });
    this.drawStars();
  }
  drawStars() {
    const dpr = Math.min(devicePixelRatio || 1, 1.5), w = innerWidth, h = innerHeight;
    for (const [cv, n, seed] of [[this.st1, 130, 7], [this.st2, 70, 13]]) {
      cv.width = w * dpr; cv.height = h * dpr; cv.style.width = w + 'px'; cv.style.height = h + 'px';
      const ctx = cv.getContext('2d'); if (!ctx) continue;
      ctx.scale(dpr, dpr); ctx.clearRect(0, 0, w, h);
      let s = seed;
      const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < n; i++) {
        const x = rnd() * w, y = rnd() * h * 0.85, r = 0.4 + rnd() * 1.2, a = 0.35 + rnd() * 0.65;
        ctx.fillStyle = `rgba(${220 + rnd() * 35 | 0},${225 + rnd() * 30 | 0},255,${a})`;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      }
    }
  }
  update(solar, moon) {
    this.inputs = { alt: solar.alt, az: solar.az, trend: solar.trend || 0, moonAlt: moon ? moon.alt : -30, moonAz: moon ? moon.az : 180, moonK: moon ? moon.k : 0 };
    this.computeTarget();
    if (this.getReduced()) { this.cur = structuredClone(this.target); this.apply(); }
    else this.setRunning(true);
  }
  computeTarget() {
    const s = this.getSettings(), i = this.inputs, inten = s.theme.intensity / 100;
    const p = skyPalette(i.alt, { mode: s.theme.mode, custom: s.theme.custom, systemDark: this.systemMq.matches });
    const dyn = s.theme.mode === 'dynamic' ? 1.6 : 1;
    const sunX = clamp((i.az - 90) / 180 * 100, 4, 96);
    const sunY = clamp(96 - i.alt * 1.02, -10, 112);
    const moonX = clamp((i.moonAz - 90) / 180 * 100, 4, 96);
    const moonY = clamp(96 - i.moonAlt * 1.02, -10, 112);
    const warmGate = Math.abs(i.alt) < 8 ? 1 : 0;
    const breath = 1 + (i.trend > 0 ? 0.14 : i.trend < 0 ? -0.11 : 0) * warmGate * inten * dyn;
    this.target = {
      p,
      num: {
        '--sun-x': sunX, '--sun-y': sunY, '--moon-x': moonX, '--moon-y': moonY,
        '--sun-int': clamp(0.06 + p.warm * 0.8 + smooth(i.alt, 0, 25) * 0.35, 0, 1) * (i.alt > -12 ? 1 : 0.05),
        '--moon-int': s.theme.moonGlow ? p.night * i.moonK * clamp(i.moonAlt / 25, 0, 1) * 0.55 : 0,
        '--horizon-int': clamp(0.3 + p.warm * 0.7, 0, 1),
        '--night': s.theme.stars ? p.night : 0,
        '--breath': breath,
        '--ambient': (0.25 + 0.5 * inten) * dyn,
        '--scrim-op': s.theme.overlay ? 1 : 0
      }
    };
    if (!this.cur) this.cur = structuredClone(this.target);
  }
  apply() {
    const c = this.cur, st = this.root.style, rs = document.documentElement.style;
    const set = (k, v) => { st.setProperty(k, v); rs.setProperty(k, v); };
    set('--sky-top', c.p.top); set('--sky-mid', c.p.mid); set('--sky-horizon', c.p.horizon);
    set('--sun-glow', c.p.sunGlow); set('--moon-glow', c.p.moonGlow);
    set('--text-color', c.p.text); set('--text-dim', c.p.dim);
    set('--card-bg', c.p.card); set('--card-border', c.p.border); set('--scrim-color', c.p.scrim);
    set('--accent', c.p.accent); set('--info', c.p.info);
    for (const k in c.num) set(k, k.endsWith('-x') || k.endsWith('-y') ? c.num[k].toFixed(2) + '%' : c.num[k].toFixed(3));
  }
  tick = ts => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.tick);
    if (ts - this.last < 33) return; // ~30 fps
    this.last = ts;
    const c = this.cur, t = this.target, f = 0.055;
    for (const k of ['top', 'mid', 'hor', 'sunGlow']) c.p[k] = mix(c.p[k], t.p[k], f);
    c.p = { ...t.p, top: c.p.top, mid: c.p.mid, hor: c.p.hor, sunGlow: c.p.sunGlow };
    const drift = Math.sin(ts / 9000) * 0.02 * (this.getSettings().theme.intensity / 100);
    for (const k in t.num) {
      c.num[k] += (t.num[k] - c.num[k]) * f;
      if (k === '--breath') c.num[k] = t.num[k] + drift;
    }
    this.apply();
  };
  setRunning(on) {
    if (on && !this.running && !this.getReduced()) { this.running = true; this.raf = requestAnimationFrame(this.tick); }
    else if (!on && this.running) { this.running = false; cancelAnimationFrame(this.raf); }
    if (this.getReduced()) { this.running = false; cancelAnimationFrame(this.raf); }
  }
  refresh() { this.computeTarget(); if (this.getReduced()) { this.cur = structuredClone(this.target); this.apply(); } }
}
