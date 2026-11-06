/* ============================================================
   INK OF BABYLON — engine.js
   input · audio · collision · level builders · FX · camera · cinematics · UI
   ============================================================ */
'use strict';
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const $ = id => document.getElementById(id);
const angDiff = (a, b) => { let d = (a - b) % 6.283185307; if (d > Math.PI) d -= 6.283185307; else if (d < -Math.PI) d += 6.283185307; return d; };

/* global game state shared by every file */
const G = { mode: 'title', level: null, levels: {}, time: 0, camYaw: 0, shake: 0, flags: {}, kills: 0, alarm: false, hitstop: 0, tablets: 0, startTime: 0 };

/* ---------------------------------------------------------- renderer */
const renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
const camera = new THREE.PerspectiveCamera(58, 1, .1, 400);
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

/* ---------------------------------------------------------- input */
const Input = { keys: {}, pressed: {}, mb: [false, false, false], mbp: [false, false, false], dx: 0, dy: 0, locked: false };
const BLOCK = new Set(['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
addEventListener('keydown', e => { if (BLOCK.has(e.code)) e.preventDefault(); if (e.repeat) return; Input.keys[e.code] = true; Input.pressed[e.code] = true; });
addEventListener('keyup', e => { Input.keys[e.code] = false; });
addEventListener('blur', () => { Input.keys = {}; Input.mb = [false, false, false]; });
addEventListener('mousedown', e => { if (!Input.locked && G.mode === 'play' && e.target === $('gl')) { lockPointer(); } Input.mb[e.button] = true; Input.mbp[e.button] = true; });
addEventListener('mouseup', e => { Input.mb[e.button] = false; });
addEventListener('contextmenu', e => e.preventDefault());
addEventListener('mousemove', e => { if (Input.locked && performance.now() - (Input.lockT || 0) > 120 && Math.abs(e.movementX) < 250 && Math.abs(e.movementY) < 250) { Input.dx += e.movementX; Input.dy += e.movementY; } });
document.addEventListener('pointerlockerror', () => { Input.lockFailed = true; });
document.addEventListener('pointerlockchange', () => { Input.locked = document.pointerLockElement === $('gl'); if (Input.locked) Input.lockT = performance.now(); if (!Input.locked && G.mode === 'play' && !G.noPause) G.onUnlock && G.onUnlock(); });
function lockPointer() { try { const p = $('gl').requestPointerLock(); if (p && p.catch) p.catch(() => { }); } catch (e) { } }
function unlockPointer() { try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) { } }
const key = c => !!Input.keys[c];
const tap = c => { const v = Input.pressed[c]; Input.pressed[c] = false; return !!v; };
const endInput = () => { Input.pressed = {}; Input.mbp = [false, false, false]; Input.dx = Input.dy = 0; };

/* ---------------------------------------------------------- audio (all synthesized) */
const Aud = {
  ctx: null, master: null, tension: 0, next: 0, beat: 0, muted: false,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext; const c = this.ctx = new AC();
      this.master = c.createGain(); this.master.gain.value = .55; this.master.connect(c.destination);
      // wind
      const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0); let l = 0;
      for (let i = 0; i < len; i++) { l = l * .97 + (Math.random() * 2 - 1) * .03; d[i] = l * 6; }
      const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 520; f.Q.value = .6; this.windF = f;
      const g = c.createGain(); g.gain.value = .08; this.windG = g; src.connect(f); f.connect(g); g.connect(this.master); src.start();
      // drone
      [73.4, 110.0, 146.8].forEach((fr, i) => { const o = c.createOscillator(); o.type = i ? 'triangle' : 'sawtooth'; o.frequency.value = fr; const og = c.createGain(); og.gain.value = i ? .018 : .012; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380; o.connect(lp); lp.connect(og); og.connect(this.master); o.start(); });
      this.next = c.currentTime + .3;
      setInterval(() => this.sched(), 120);
    } catch (e) { this.ctx = null; }
  },
  sched() {
    const c = this.ctx; if (!c || this.muted) return;
    const step = .46 - this.tension * .17;
    while (this.next < c.currentTime + .35) {
      const t = this.next, scale = [293.66, 311.13, 369.99, 392, 440, 466.16, 523.25, 587.33];
      if (Math.random() < .5 + this.tension * .4) { const n = scale[(Math.random() * scale.length) | 0] * (Math.random() < .25 ? .5 : 1); this.pluck(n, t, .22 - this.tension * .08); }
      if (this.beat % 4 === 0 && this.tension > .15) this.drum(t, .35);
      if (this.tension > .55 && this.beat % 2 === 1) this.drum(t, .16);
      this.beat++; this.next += step;
    }
  },
  pluck(f, t, v) { const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * .5, t + .01); g.gain.exponentialRampToValueAtTime(.0008, t + 1.4); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 1.5); },
  drum(t, v) { const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(42, t + .18); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + .25); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + .3); },
  tone(f, d = .15, type = 'sine', v = .2, slide = 0, delay = 0) { const c = this.ctx; if (!c || this.muted) return; const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + d); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + d + .02); },
  noise(d = .2, v = .2, f = 1200, type = 'lowpass', delay = 0) { const c = this.ctx; if (!c || this.muted) return; const t = c.currentTime + delay, n = (c.sampleRate * d) | 0, b = c.createBuffer(1, n, c.sampleRate), a = b.getChannelData(0); for (let i = 0; i < n; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / n); const s = c.createBufferSource(); s.buffer = b; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; const g = c.createGain(); g.gain.value = v; s.connect(fl); fl.connect(g); g.connect(this.master); s.start(t); },
  sfx(n) {
    if (!this.ctx) return;
    switch (n) {
      case 'shot': this.tone(220, .12, 'square', .08, -150); this.noise(.12, .12, 2400, 'highpass'); break;
      case 'hit': this.noise(.12, .3, 900); this.tone(110, .12, 'sine', .25, -60); break;
      case 'slash': this.noise(.14, .22, 3200, 'highpass'); break;
      case 'kill': this.tone(180, .25, 'sawtooth', .12, -120); this.noise(.2, .25, 700); break;
      case 'hurt': this.tone(150, .2, 'sawtooth', .22, -90); this.noise(.15, .3, 500); break;
      case 'coin': this.tone(1320, .1, 'triangle', .13); this.tone(1760, .18, 'triangle', .13, 0, .07); break;
      case 'pick': this.tone(660, .1, 'triangle', .14); this.tone(880, .12, 'triangle', .14, 0, .06); break;
      case 'card': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, .3, 'triangle', .12, 0, i * .08)); break;
      case 'door': this.noise(.35, .25, 350); this.tone(70, .3, 'sine', .3, -20); break;
      case 'bomb': this.noise(.5, .35, 500); this.tone(90, .4, 'sine', .3, -50); break;
      case 'roll': this.noise(.25, .12, 1500, 'bandpass'); break;
      case 'ui': this.tone(520, .06, 'square', .05); break;
      case 'alarm': for (let i = 0; i < 4; i++) { this.tone(392, .36, 'sawtooth', .13, 60, i * .5); this.tone(392 * 1.5, .36, 'sawtooth', .07, 60, i * .5); } break;
      case 'horn': this.tone(196, 1.1, 'sawtooth', .15, 12); this.tone(294, 1.1, 'sawtooth', .08, 10); break;
      case 'gong': this.tone(110, 2.4, 'sine', .35, -20); this.tone(165, 2, 'sine', .15, -10); this.tone(222, 1.6, 'sine', .1); break;
      case 'rumble': this.noise(2.6, .5, 160); this.tone(48, 2.4, 'sine', .4, -10); break;
      case 'tablet': [392, 494, 587, 784].forEach((f, i) => this.tone(f, .8, 'sine', .14, 0, i * .12)); this.tone(98, 1.6, 'sine', .3); break;
      case 'whisper': this.noise(.9, .07, 3500, 'bandpass'); break;
      case 'win': [392, 494, 587, 784, 988].forEach((f, i) => this.tone(f, .9, 'triangle', .14, 0, i * .16)); break;
      case 'lose': [330, 262, 196, 131].forEach((f, i) => this.tone(f, .8, 'sawtooth', .1, 0, i * .22)); break;
    }
  },
  setTension(t) { this.tension += (t - this.tension) * .02; if (this.windF) { this.windF.frequency.value = 480 + G.stormMix * 520 || 480; this.windG.gain.value = .05 + (G.stormMix || 0) * .22; } }
};

/* ---------------------------------------------------------- collision (2D, top-down) */
function segAABB(ax, az, bx, bz, s) {
  let t0 = 0, t1 = 1; const dx = bx - ax, dz = bz - az;
  if (Math.abs(dx) < 1e-9) { if (ax < s.x0 || ax > s.x1) return null; } else { let a = (s.x0 - ax) / dx, b = (s.x1 - ax) / dx; if (a > b) { const t = a; a = b; b = t; } t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) return null; }
  if (Math.abs(dz) < 1e-9) { if (az < s.z0 || az > s.z1) return null; } else { let a = (s.z0 - az) / dz, b = (s.z1 - az) / dz; if (a > b) { const t = a; a = b; b = t; } t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) return null; }
  return t0;
}
function segCirc(ax, az, bx, bz, s) {
  const dx = bx - ax, dz = bz - az, fx = ax - s.cx, fz = az - s.cz, A = dx * dx + dz * dz; if (A < 1e-9) return null;
  const B = 2 * (fx * dx + fz * dz), C = fx * fx + fz * fz - s.r * s.r; let D = B * B - 4 * A * C; if (D < 0) return null; D = Math.sqrt(D);
  const t = (-B - D) / (2 * A); if (t >= 0 && t <= 1) return t; if (C < 0) return 0; return null;
}
function rayHit(L, ax, az, bx, bz, minH = 0) {
  let best = null;
  for (const s of L.solids) { if (!s.active || s.h < minH) continue; const t = s.r !== undefined ? segCirc(ax, az, bx, bz, s) : segAABB(ax, az, bx, bz, s); if (t !== null && (best === null || t < best)) best = t; }
  return best;
}
function collide(L, o, r) {
  for (let it = 0; it < 2; it++) for (const s of L.solids) {
    if (!s.active) continue;
    if (s.r !== undefined) { const dx = o.x - s.cx, dz = o.z - s.cz, d = Math.hypot(dx, dz), m = r + s.r; if (d < m && d > 1e-6) { o.x = s.cx + dx / d * m; o.z = s.cz + dz / d * m; } }
    else {
      const cx = clamp(o.x, s.x0, s.x1), cz = clamp(o.z, s.z0, s.z1), dx = o.x - cx, dz = o.z - cz, d = Math.hypot(dx, dz);
      if (d < r) { if (d > 1e-6) { o.x = cx + dx / d * r; o.z = cz + dz / d * r; } else { const l = o.x - s.x0, rr = s.x1 - o.x, t = o.z - s.z0, b = s.z1 - o.z, m = Math.min(l, rr, t, b); if (m === l) o.x = s.x0 - r; else if (m === rr) o.x = s.x1 + r; else if (m === t) o.z = s.z0 - r; else o.z = s.z1 + r; } }
    }
  }
  const b = L.bounds; o.x = clamp(o.x, b.x0, b.x1); o.z = clamp(o.z, b.z0, b.z1);
}
/* steering with feelers so guards walk around walls instead of through them */
function steer(L, a, tx, tz) {
  const base = Math.atan2(tz - a.z, tx - a.x), pref = a.side || 1;
  for (let i = 0; i < 9; i++) {
    const sgn = (i % 2) ? pref : -pref, ang = base + (i === 0 ? 0 : Math.ceil(i / 2) * .5 * sgn);
    if (rayHit(L, a.x, a.z, a.x + Math.cos(ang) * 2.4, a.z + Math.sin(ang) * 2.4, 0) === null) { if (i > 0) a.side = sgn; return ang; }
  }
  a.side = -pref; return base + 1.57 * pref;
}

/* ---------------------------------------------------------- levels & builders */
const PLANE = new THREE.PlaneGeometry(1, 1);
const FLAT = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
class Level {
  constructor(id, o) {
    this.id = id; this.name = o.name || id; this.scene = new THREE.Scene();
    this.scene.background = ART.skyTexture(!!o.dark);
    if (o.fog) this.scene.fog = new THREE.Fog(o.fog, o.fogNear, o.fogFar);
    this.bounds = o.bounds; this.tint = o.tint || 0xffffff; this.dark = !!o.dark; this.indoor = !!o.indoor;
    this.solids = []; this.actors = []; this.inter = []; this.pick = []; this.bills = []; this.sway = []; this.flick = []; this.tickers = [];
    this.camDist = o.camDist || 6.6; this.mapScale = o.mapScale || 1.7; this.camMaxPitch = o.camMaxPitch || .9;
    this.lineMat = new THREE.LineBasicMaterial({ color: 0x1c1a17, fog: true });
    this.matCache = {};
  }
  mat(tex, o = {}) {
    const k = tex.uuid + (o.at ? 'a' : '') + (o.double ? 'd' : '') + (o.tr ? 't' : '') + (o.add ? '+' : '') + (o.tint || 0);
    return this.matCache[k] || (this.matCache[k] = new THREE.MeshBasicMaterial({
      map: tex, color: o.tint !== undefined ? o.tint : this.tint, alphaTest: o.at ? .5 : 0, transparent: !!o.tr, depthWrite: !o.tr, side: o.double ? THREE.DoubleSide : THREE.FrontSide,
      blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending, fog: o.fog !== false
    }));
  }
  solidBox(x, z, w, d, h, ex) { const s = Object.assign({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, h, active: true }, ex); this.solids.push(s); return s; }
  solidCirc(x, z, r, h = 3, ex) { const s = Object.assign({ cx: x, cz: z, r, h, active: true }, ex); this.solids.push(s); return s; }
  add(o) { this.scene.add(o); return o; }
}

function addBox(L, x, z, w, d, h, o = {}) {
  const key = o.tex || 'mud', tw = o.tile || 4, y0 = o.y0 || 0;
  const rep = len => Math.max(1, Math.round(len / tw)), ry = Math.max(1, Math.round(h / tw));
  const side = len => L.mat(ART.surf(key, rep(len), ry));
  const top = L.mat(ART.surf(o.topTex || 'stone', Math.max(1, rep(w)), Math.max(1, rep(d))));
  const geo = new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(geo, [side(d), side(d), top, top, side(w), side(w)]);
  m.position.set(x, y0 + h / 2, z); L.scene.add(m);
  if (o.edges !== false) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), L.lineMat); e.position.copy(m.position); L.scene.add(e); m.userData.edges = e; }
  if (o.solid !== false) L.solidBox(x, z, w, d, y0 + h, { map: o.map !== false });
  return m;
}
function addCrenel(L, x0, z0, x1, z1, y, tex = 'mud') {
  const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.floor(len / 1.6)), ang = Math.atan2(x1 - x0, z1 - z0);
  const geo = new THREE.BoxGeometry(.9, .9, .9), mt = L.mat(ART.surf(tex, 1, 1));
  for (let i = 0; i < n; i += 2) { const t = (i + .5) / n; const m = new THREE.Mesh(geo, mt); m.position.set(lerp(x0, x1, t), y + .45, lerp(z0, z1, t)); m.rotation.y = ang; L.scene.add(m); }
}
function addFlat(L, texKey, x, z, w, d, y = .02, rx = 1, ry = 1, o = {}) {
  const m = new THREE.Mesh(FLAT, L.mat(ART.surf(texKey, rx, ry), o)); m.scale.set(w, 1, d); m.position.set(x, y, z); L.scene.add(m); return m;
}
function makeBill(L, def, H, o = {}) {
  const g = new THREE.Group(), p = new THREE.Group(); g.add(p);
  const mat = o.ownMat ? new THREE.MeshBasicMaterial({ map: def.tex, color: L.tint, alphaTest: .5, side: THREE.DoubleSide, fog: true }) : L.mat(def.tex, { at: true, double: true });
  const mesh = new THREE.Mesh(PLANE, mat); const W = H * def.aspect; mesh.scale.set(W, H, 1); mesh.position.y = H / 2 - (def.pad || 0) * H; p.add(mesh);
  if (o.shadow !== false) { const sh = new THREE.Mesh(FLAT, L.mat(ART.fxTex('shadow'), { tr: true, tint: 0xffffff })); sh.scale.set(Math.min(W * .8, 2.4), 1, Math.min(W * .45, 1.3)); sh.position.y = .03; sh.renderOrder = 1; g.add(sh); }
  return { g, p, mesh, mat, H, W };
}
function addProp(L, key, x, z, s = 1, o = {}) {
  const d = ART.propTex(key), H = d.H * s;
  const b = makeBill(L, d, H, { shadow: o.shadow !== undefined ? o.shadow : H > 1.2 });
  b.g.position.set(x, o.y || 0, z); if (o.flip) b.mesh.scale.x *= -1;
  L.scene.add(b.g); L.bills.push(b.g);
  if (o.sway !== false && (key === 'palm' || key === 'tuft' || key === 'bush' || key === 'flower' || key === 'banner' || key === 'bannerLong')) L.sway.push({ p: b.p, ph: Math.random() * 6, amp: key === 'palm' ? .018 : key.startsWith('banner') ? .07 : .05 });
  if (o.solid) L.solidCirc(x, z, o.solid, o.solidH || 1.5, { map: false });
  return b;
}
function addFlame(L, x, y, z, s = 1) {
  const m = new THREE.Mesh(PLANE, L.mat(ART.fxTex('glow'), { tr: true, add: true, tint: 0xffffff })); m.scale.set(1.5 * s, 1.8 * s, 1); m.position.set(x, y + .7 * s, z); L.scene.add(m); L.bills.push(m);
  const core = new THREE.Mesh(PLANE, L.mat(ART.fxTex('glow'), { tr: true, add: true, tint: 0xffddaa })); core.scale.set(.6 * s, .9 * s, 1); core.position.set(x, y + .35 * s, z); L.scene.add(core); L.bills.push(core);
  L.flick.push({ m, core, ph: Math.random() * 9, s });
  return m;
}
function addLightPool(L, x, z, r = 5, a = .5) {
  const m = new THREE.Mesh(FLAT, L.mat(ART.fxTex('glow'), { tr: true, add: true, tint: 0xffffff })); m.scale.set(r * 2, 1, r * 2); m.position.set(x, .04, z); m.material = m.material.clone(); m.material.opacity = a; m.material.transparent = true; L.scene.add(m); L.flick.push({ pool: m, base: a, ph: Math.random() * 9 }); return m;
}
function addDoorDecal(L, x, z, face, key = 'door', w = 2.2, h = 3.1) {
  const m = new THREE.Mesh(PLANE, L.mat(ART.plainCanvasTex(key), { at: true, double: true, tint: 0xffffff }));
  m.scale.set(w, h, 1); const off = .06;
  if (face === 's') { m.position.set(x, h / 2, z + off); }
  if (face === 'n') { m.position.set(x, h / 2, z - off); m.rotation.y = Math.PI; }
  if (face === 'e') { m.position.set(x + off, h / 2, z); m.rotation.y = Math.PI / 2; }
  if (face === 'w') { m.position.set(x - off, h / 2, z); m.rotation.y = -Math.PI / 2; }
  L.scene.add(m); return m;
}
function addInter(L, o) { o.r = o.r || 2.2; o.L = L; L.inter.push(o); return o; }

/* pickups */
function spawnPickup(L, type, val, x, z, o = {}) {
  const d = ART.pickTex(type), size = type === 'tablet' ? 1 : ['eye', 'clover', 'sun', 'sword'].includes(type) ? .95 : .6;
  const b = makeBill(L, d, size, { shadow: true }); b.g.position.set(x, 0, z); L.scene.add(b.g); L.bills.push(b.g);
  const p = { x, z, type, val, b, t: Math.random() * 6, life: o.life || 0, y0: size * .5 + .25, L };
  if (type === 'tablet') { const gl = new THREE.Mesh(PLANE, L.mat(ART.fxTex('glow'), { tr: true, add: true, tint: 0xffffff })); gl.scale.set(3, 3, 1); gl.position.y = 1; b.g.add(gl); }
  L.pick.push(p); return p;
}

/* ---------------------------------------------------------- FX particle pool */
const FX = {
  pool: [], live: [], decals: [],
  init() { for (let i = 0; i < 170; i++) { const m = new THREE.Mesh(PLANE, new THREE.MeshBasicMaterial({ map: ART.fxTex('puff'), transparent: true, depthWrite: false, fog: true, side: THREE.DoubleSide })); m.visible = false; m.frustumCulled = false; this.pool.push(m); } },
  attach(scene) { this.pool.forEach(m => scene.add(m)); this.decals.forEach(d => scene.add(d.m)); },
  spawn(o) {
    const m = this.pool.pop(); if (!m) return null;
    m.material.map = o.tex; m.material.color.set(o.color !== undefined ? o.color : 0xffffff); m.material.blending = o.add ? THREE.AdditiveBlending : THREE.NormalBlending; m.material.opacity = 1; m.material.needsUpdate = true;
    m.position.set(o.x, o.y, o.z); m.scale.set(o.s0, o.s0, 1); m.rotation.set(0, 0, o.rot || 0); m.visible = true;
    const p = Object.assign({ m, vx: 0, vy: 0, vz: 0, g: 0, life: .6, t: 0, s0: 1, s1: 1, spin: 0, fade: true, bill: true, drag: 0 }, o); this.live.push(p); return p;
  },
  puff(x, y, z, n = 6, col = 0xffffff, sp = 2, s1 = 1.2) { for (let i = 0; i < n; i++) this.spawn({ tex: ART.fxTex('puff'), x, y, z, s0: .25, s1: rand(.7, 1) * s1, vx: rand(-sp, sp), vy: rand(.2, 1.2), vz: rand(-sp, sp), life: rand(.4, .8), color: col, drag: 2 }); },
  paper(x, y, z, n = 8, sp = 3.5) { const t = ART.fxTex('splat'); for (let i = 0; i < n; i++) this.spawn({ tex: t, x, y, z, s0: .16, s1: .12, vx: rand(-sp, sp), vy: rand(1, 4), vz: rand(-sp, sp), g: 9, life: rand(.5, 1), color: i % 3 ? 0xf5edd8 : 0x1c1a17, spin: rand(-9, 9) }); },
  ink(x, z) {
    for (let i = 0; i < 6; i++) this.spawn({ tex: ART.fxTex('splat'), x, y: 1.1, z, s0: .3, s1: .12, vx: rand(-3, 3), vy: rand(1, 3.5), vz: rand(-3, 3), g: 10, life: rand(.4, .7), color: 0x1c1a17 });
    const m = this.decalMesh(); if (!m) return; m.material.map = ART.fxTex('splat'); m.material.color.set(0x1c1a17); m.material.opacity = .85; m.position.set(x, .03 + Math.random() * .01, z); const s = rand(.8, 1.5); m.scale.set(s, 1, s); m.rotation.y = rand(0, 6); m.visible = true; this.decals.push({ m, t: 0, life: 22 });
  },
  decalMesh() { if (this.decals.length > 30) { const d = this.decals.shift(); d.m.visible = false; return d.m; } const m = new THREE.Mesh(FLAT, new THREE.MeshBasicMaterial({ map: ART.fxTex('splat'), transparent: true, depthWrite: false, fog: true })); m.renderOrder = 1; G.level && G.level.scene.add(m); return m; },
  slash(x, y, z, dx, dz, col = 0xffffff) { this.spawn({ tex: ART.fxTex('slash'), x: x + dx * 1.2, y, z: z + dz * 1.2, s0: 1.7, s1: 2.3, life: .18, rot: -Math.atan2(dz, dx) + Math.PI * 0, bill: false, yaw: Math.atan2(dx, dz) - 1.57, color: col, flat: true }); },
  glow(x, y, z, s = 3, life = .4, col = 0xffd890) { this.spawn({ tex: ART.fxTex('glow'), x, y, z, s0: s * .5, s1: s, life, add: true, color: col }); },
  update(dt) {
    const camQ = G.camYaw;
    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i], m = p.m; p.t += dt; const k = p.t / p.life;
      if (k >= 1) { m.visible = false; this.pool.push(m); this.live.splice(i, 1); continue; }
      p.vy -= p.g * dt; const dr = Math.max(0, 1 - p.drag * dt); p.vx *= dr; p.vz *= dr;
      m.position.x += p.vx * dt; m.position.y = Math.max(.05, m.position.y + p.vy * dt); m.position.z += p.vz * dt;
      const s = lerp(p.s0, p.s1, k); m.scale.set(s, s, 1);
      if (p.bill) m.rotation.y = camQ; if (p.spin) m.rotation.z += p.spin * dt;
      if (p.fade) m.material.opacity = k < .5 ? 1 : 1 - (k - .5) * 2;
    }
    for (let i = this.decals.length - 1; i >= 0; i--) { const d = this.decals[i]; d.t += dt; if (d.t > d.life - 4) d.m.material.opacity = Math.max(0, .85 * (d.life - d.t) / 4); if (d.t > d.life) { d.m.visible = false; this.decals.splice(i, 1); } }
  }
};

/* ---------------------------------------------------------- camera rig + cinematics */
const Cam = { yaw: 0, pitch: .32, dist: 6.6, cur: 6.6, fov: 58, aimK: 0, v: new THREE.Vector3() };
const CINE = { active: false, shots: [], i: 0, t: 0, done: null, skip: 0 };
function vecOf(v) { return typeof v === 'function' ? v() : v; }
function playCine(shots, done, opt = {}) {
  CINE.active = true; CINE.shots = shots; CINE.i = -1; CINE.t = 0; CINE.done = done; CINE.skippable = opt.skippable !== false; G.prevMode = G.mode; G.mode = 'cine';
  document.body.classList.add('cine'); $('bars').classList.add('on'); nextShot();
}
function nextShot() {
  CINE.i++; CINE.t = 0; const s = CINE.shots[CINE.i];
  if (!s) { endCine(); return; }
  s._from = vecOf(s.from); s._to = vecOf(s.to || s.from); s._look = vecOf(s.look); s._lookTo = vecOf(s.lookTo || s.look);
  if (s.cap) UI.caption(s.cap, s.d); else UI.caption('');
  if (s.sfx) Aud.sfx(s.sfx); if (s.fn) s.fn();
  if (s.level) switchLevel(s.level);
}
function endCine() {
  CINE.active = false; document.body.classList.remove('cine'); $('bars').classList.remove('on'); UI.caption(''); G.mode = 'play'; camera.fov = Cam.fov = 58; camera.updateProjectionMatrix();
  const d = CINE.done; CINE.done = null; if (d) d();
}
function updateCine(dt) {
  const s = CINE.shots[CINE.i]; if (!s) return;
  if (CINE.skippable && (tap('Space') || tap('Enter') || tap('Escape'))) { for (let j = CINE.i + 1; j < CINE.shots.length; j++) { const q = CINE.shots[j]; if (q.level) switchLevel(q.level); if (q.fn) q.fn(); } endCine(); return; }
  CINE.t += dt; const k = clamp(CINE.t / s.d, 0, 1), e = s.lin ? k : ease(k);
  camera.position.set(lerp(s._from[0], s._to[0], e), lerp(s._from[1], s._to[1], e), lerp(s._from[2], s._to[2], e));
  camera.lookAt(lerp(s._look[0], s._lookTo[0], e), lerp(s._look[1], s._lookTo[1], e), lerp(s._look[2], s._lookTo[2], e));
  if (s.shake) camera.position.add(new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(s.shake * (1 - k * .5)));
  if (s.fov) { camera.fov = lerp(s.fov[0], s.fov[1], e); camera.updateProjectionMatrix(); }
  if (CINE.t >= s.d) nextShot();
}

/* ---------------------------------------------------------- UI helpers */
const UI = {
  _cap: null,
  toast(text, ms = 3200, cls = '') { const d = document.createElement('div'); d.className = 'toast ' + cls; d.innerHTML = text; $('toasts').appendChild(d); setTimeout(() => d.classList.add('out'), ms); setTimeout(() => d.remove(), ms + 600); },
  sub(text, ms = 3200) { const el = $('subs'); el.textContent = text; el.classList.add('on'); clearTimeout(this._st); this._st = setTimeout(() => el.classList.remove('on'), ms); },
  feed(text, cls = '') { const d = document.createElement('div'); d.className = 'feed ' + cls; d.innerHTML = text; $('feed').appendChild(d); while ($('feed').children.length > 5) $('feed').firstChild.remove(); setTimeout(() => d.classList.add('out'), 5200); setTimeout(() => d.remove(), 5800); },
  caption(text, dur = 3) {
    const el = $('caption'); clearInterval(this._cap); el.textContent = ''; if (!text) { el.classList.remove('on'); return; }
    el.classList.add('on'); let i = 0; const per = Math.max(18, Math.min(60, (dur * 1000 * .7) / text.length));
    this._cap = setInterval(() => { el.textContent = text.slice(0, ++i); if (i >= text.length) clearInterval(this._cap); }, per);
  },
  project(x, y, z) { const v = new THREE.Vector3(x, y, z).project(camera); return [(v.x * .5 + .5) * innerWidth, (-v.y * .5 + .5) * innerHeight, v.z]; },
  pop(x, y, z, text, cls = '') { const [sx, sy, sz] = this.project(x, y, z); if (sz > 1) return; const d = document.createElement('div'); d.className = 'pop ' + cls; d.textContent = text; d.style.left = sx + 'px'; d.style.top = sy + 'px'; $('hud').appendChild(d); setTimeout(() => d.remove(), 1100); },
  hit() { const c = $('cross'); c.classList.remove('hit'); void c.offsetWidth; c.classList.add('hit'); },
  flash(cls, ms = 400) { const e = $('flash'); e.className = cls; e.style.opacity = 1; setTimeout(() => { e.style.opacity = 0; }, ms); },
  dialog(d) {
    const el = $('dialog'); G.dialog = d; G.prevMode2 = G.mode; G.mode = 'dialog'; unlockPointer();
    el.innerHTML = `<div class="dlg-name">${d.who || ''}</div><div class="dlg-text">${d.text}</div><div class="dlg-opts">${(d.opts || []).map((o, i) => `<button data-i="${i}"><b>${i + 1}</b> ${o.t}</button>`).join('')}</div>`;
    el.classList.add('on'); el.querySelectorAll('button').forEach(b => b.onclick = () => this.choose(+b.dataset.i)); Aud.sfx('ui');
  },
  choose(i) { const d = G.dialog; if (!d) return; const o = d.opts[i]; if (!o) return; Aud.sfx('ui'); const r = o.fn ? o.fn() : null; if (r === 'keep') return; this.closeDialog(); },
  closeDialog() { $('dialog').classList.remove('on'); G.dialog = null; if (G.mode === 'dialog') G.mode = 'play'; lockPointer(); },
  wipe(title, sub, mid, after) {
    const w = $('wipe'); G.mode = 'wipe'; unlockPointer(); $('wipeT').textContent = title || ''; $('wipeS').textContent = sub || '';
    w.classList.remove('out'); w.classList.add('in');
    setTimeout(() => { mid && mid(); w.classList.add('hold'); setTimeout(() => { w.classList.remove('in', 'hold'); w.classList.add('out'); setTimeout(() => { w.classList.remove('out'); after && after(); }, 650); }, title ? 900 : 250); }, 700);
  }
};
