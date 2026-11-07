/* ============================================================
   INK OF BABYLON — engine.js
   input · audio · collision · toon-lit levels · FX · camera · sequences · UI
   ============================================================ */
'use strict';
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const $ = id => document.getElementById(id);
const angDiff = (a, b) => { let d = (a - b) % 6.283185307; if (d > Math.PI) d -= 6.283185307; else if (d < -Math.PI) d += 6.283185307; return d; };
const dist2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

const G = { mode: 'title', level: null, levels: {}, time: 0, camYaw: 0, shake: 0, flags: {}, hitstop: 0, chapter: null, fp: false, fpAuto: true, items: {}, alert: 0 };

/* ---------------------------------------------------------- renderer */
const renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6)); renderer.autoClear = false;
const camera = new THREE.PerspectiveCamera(64, 1, .15, 700);
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); if (window.VM) VM.camera.aspect = w / h, VM.camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

/* ---------------------------------------------------------- input */
const Input = { keys: {}, pressed: {}, cnt: {}, mb: [false, false, false], mbp: [false, false, false], dx: 0, dy: 0, wheel: 0, locked: false };
const BLOCK = new Set(['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
addEventListener('keydown', e => { if (BLOCK.has(e.code)) e.preventDefault(); if (e.repeat) return; Input.keys[e.code] = true; Input.pressed[e.code] = true; Input.cnt[e.code] = (Input.cnt[e.code] || 0) + 1; });
addEventListener('keyup', e => { Input.keys[e.code] = false; });
addEventListener('blur', () => { Input.keys = {}; Input.mb = [false, false, false]; });
addEventListener('mousedown', e => { if (!Input.locked && (G.mode === 'play' || G.mode === 'cine') && e.target === $('gl')) lockPointer(); Input.mb[e.button] = true; Input.mbp[e.button] = true; });
addEventListener('mouseup', e => { Input.mb[e.button] = false; });
addEventListener('wheel', e => { Input.wheel += Math.sign(e.deltaY); }, { passive: true });
addEventListener('contextmenu', e => e.preventDefault());
addEventListener('mousemove', e => { if (Input.locked && performance.now() - (Input.lockT || 0) > 120 && Math.abs(e.movementX) < 250 && Math.abs(e.movementY) < 250) { Input.dx += e.movementX; Input.dy += e.movementY; } });
document.addEventListener('pointerlockerror', () => { Input.lockFailed = true; });
document.addEventListener('pointerlockchange', () => { Input.locked = document.pointerLockElement === $('gl'); if (Input.locked) Input.lockT = performance.now(); if (!Input.locked && G.mode === 'play' && !G.noPause) G.onUnlock && G.onUnlock(); });
function lockPointer() { try { const p = $('gl').requestPointerLock(); if (p && p.catch) p.catch(() => { }); } catch (e) { } }
function unlockPointer() { try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) { } }
const key = c => !!Input.keys[c];
const tap = c => { const v = Input.pressed[c]; Input.pressed[c] = false; return !!v; };
const endInput = () => { Input.pressed = {}; Input.mbp = [false, false, false]; Input.dx = Input.dy = 0; Input.wheel = 0; };

/* ---------------------------------------------------------- audio (everything is synthesized) */
const VOW = { a: [800, 1150], e: [400, 1700], i: [300, 2300], o: [450, 800], u: [325, 700] };
const Aud = {
  ctx: null, master: null, tension: 0, next: 0, beat: 0, muted: false, amb: { crowd: 0, wind: .3, chant: 0, dread: 0, market: 0 }, ambT: { crowd: 0, wind: .3, chant: 0, dread: 0, market: 0 }, music: 1,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext, c = this.ctx = new AC();
      this.master = c.createGain(); this.master.gain.value = .6; this.master.connect(c.destination);
      const noiseBuf = (secs, sm) => { const len = c.sampleRate * secs, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0); let l = 0; for (let i = 0; i < len; i++) { l = l * sm + (Math.random() * 2 - 1) * (1 - sm); d[i] = l * (sm > .9 ? 7 : 1.4); } return b; };
      const loopNoise = (buf, ftype, freq, q) => { const s = c.createBufferSource(); s.buffer = buf; s.loop = true; const f = c.createBiquadFilter(); f.type = ftype; f.frequency.value = freq; f.Q.value = q; const g = c.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(this.master); s.start(); return { f, g }; };
      this.wind = loopNoise(noiseBuf(2, .97), 'bandpass', 520, .6); this.crowd = loopNoise(noiseBuf(3, .78), 'bandpass', 700, 1.2); this.market = loopNoise(noiseBuf(3, .55), 'bandpass', 1800, .9);
      const lfo = c.createOscillator(); lfo.frequency.value = .35; const lg = c.createGain(); lg.gain.value = 260; lfo.connect(lg); lg.connect(this.crowd.f.frequency); lfo.start();
      /* drone + chant (formant-filtered saws) */
      [55, 82.4, 110].forEach((fr, i) => { const o = c.createOscillator(); o.type = i ? 'triangle' : 'sawtooth'; o.frequency.value = fr; const g = c.createGain(); g.gain.value = i ? .02 : .014; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300; o.connect(lp); lp.connect(g); g.connect(this.master); o.start(); });
      this.chantG = c.createGain(); this.chantG.gain.value = 0; this.chantG.connect(this.master);
      [130.8, 196, 261.6, 98].forEach((fr, i) => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr * (1 + (i - 1.5) * .003); const f1 = c.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 650; f1.Q.value = 6; const f2 = c.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1100; f2.Q.value = 7; const g = c.createGain(); g.gain.value = .5; o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g); g.connect(this.chantG); o.start(); const l = c.createOscillator(); l.frequency.value = .08 + i * .03; const lgn = c.createGain(); lgn.gain.value = 140; l.connect(lgn); lgn.connect(f1.frequency); l.start(); });
      this.next = c.currentTime + .3; setInterval(() => this.sched(), 120);
    } catch (e) { this.ctx = null; }
  },
  setAmb(o) { Object.assign(this.ambT, { crowd: 0, wind: .25, chant: 0, dread: 0, market: 0 }, o); },
  tickAmb(dt) {
    if (!this.ctx) return; const k = Math.min(1, dt * 1.5);
    for (const n in this.amb) this.amb[n] += (this.ambT[n] - this.amb[n]) * k;
    this.wind.g.gain.value = .05 + this.amb.wind * .22; this.crowd.g.gain.value = this.amb.crowd * .2; this.market.g.gain.value = this.amb.market * .055; this.chantG.gain.value = this.amb.chant * .1;
  },
  sched() {
    const c = this.ctx; if (!c || this.muted) return;
    const dread = this.amb.dread, step = .5 - this.tension * .17;
    while (this.next < c.currentTime + .35) {
      const t = this.next, scale = [146.8, 155.6, 185, 196, 220, 233.1, 261.6, 293.7];
      if (this.music > 0 && Math.random() < (.4 + this.tension * .45) * (1 - dread * .6)) this.pluck(scale[(Math.random() * scale.length) | 0] * (Math.random() < .3 ? .5 : 1), t, (.16 - this.tension * .06) * this.music);
      if (this.beat % 4 === 0 && this.tension > .15) this.drum(t, .3 * this.music);
      if (this.tension > .55 && this.beat % 2 === 1) this.drum(t, .14 * this.music);
      if (dread > .25 && this.beat % 2 === 0) { this.drum(t, .22 * dread); this.drum(t + .16, .15 * dread); }
      this.beat++; this.next += step;
    }
  },
  pluck(f, t, v) { const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * .5, t + .01); g.gain.exponentialRampToValueAtTime(.0008, t + 1.5); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 1.6); },
  drum(t, v) { const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(40, t + .18); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + .25); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + .3); },
  tone(f, d = .15, type = 'sine', v = .2, slide = 0, delay = 0) { const c = this.ctx; if (!c || this.muted) return; const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + d); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + d + .02); },
  noise(d = .2, v = .2, f = 1200, type = 'lowpass', delay = 0) { const c = this.ctx; if (!c || this.muted) return; const t = c.currentTime + delay, n = (c.sampleRate * d) | 0, b = c.createBuffer(1, n, c.sampleRate), a = b.getChannelData(0); for (let i = 0; i < n; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / n); const s = c.createBufferSource(); s.buffer = b; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; const g = c.createGain(); g.gain.value = v; s.connect(fl); fl.connect(g); g.connect(this.master); s.start(t); },
  /* babble speech: one vowel blip per syllable. returns approximate duration */
  voice(pitch, text, vol = .5) {
    const c = this.ctx; const syl = (text.toLowerCase().match(/[aeiouāēīōū]+/g) || ['a']).slice(0, 40); const dt = .105; if (!c || this.muted) return syl.length * dt;
    syl.forEach((s, i) => {
      const v = VOW[s[0].replace('ā', 'a').replace('ē', 'e').replace('ī', 'i').replace('ō', 'o').replace('ū', 'u')] || VOW.a, t = c.currentTime + i * dt + .02, p = pitch * (1 + Math.sin(i * 1.7) * .08 + (i % 7 === 6 ? .12 : 0));
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(p, t); o.frequency.linearRampToValueAtTime(p * .94, t + .09);
      const f1 = c.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = v[0]; f1.Q.value = 5; const f2 = c.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = v[1]; f2.Q.value = 6;
      const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * .09, t + .02); g.gain.linearRampToValueAtTime(0, t + .095);
      o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g); g.connect(this.master); o.start(t); o.stop(t + .11);
    });
    return syl.length * dt;
  },
  sfx(n) {
    if (!this.ctx) return;
    switch (n) {
      case 'shot': this.tone(180, .1, 'triangle', .1, -90); this.noise(.14, .1, 3000, 'highpass'); break;
      case 'draw': this.tone(90, .35, 'triangle', .05, 40); break;
      case 'hit': this.noise(.1, .3, 900); this.tone(110, .1, 'sine', .22, -60); break;
      case 'tear': this.noise(.35, .26, 3500, 'highpass'); this.noise(.25, .14, 1400, 'bandpass', .05); break;
      case 'fold': this.noise(.3, .12, 2200, 'bandpass'); break;
      case 'slash': this.noise(.12, .2, 3200, 'highpass'); break;
      case 'hurt': this.tone(150, .2, 'sawtooth', .2, -90); this.noise(.14, .26, 500); break;
      case 'block': this.tone(520, .1, 'square', .1, -200); this.noise(.08, .2, 4000, 'highpass'); break;
      case 'coin': this.tone(1320, .1, 'triangle', .12); this.tone(1760, .18, 'triangle', .12, 0, .07); break;
      case 'pick': this.tone(660, .1, 'triangle', .13); this.tone(880, .12, 'triangle', .13, 0, .06); break;
      case 'door': this.noise(.35, .22, 350); this.tone(70, .3, 'sine', .28, -20); break;
      case 'bell': this.tone(392, 2.2, 'sine', .3, -4); this.tone(588, 1.6, 'sine', .14); this.tone(784, 1.2, 'sine', .08); break;
      case 'horn': this.tone(196, 1.1, 'sawtooth', .13, 12); this.tone(294, 1.1, 'sawtooth', .07, 10); break;
      case 'alarm': for (let i = 0; i < 4; i++) { this.tone(392, .36, 'sawtooth', .12, 60, i * .5); this.tone(588, .36, 'sawtooth', .06, 60, i * .5); } break;
      case 'gong': this.tone(110, 2.4, 'sine', .32, -20); this.tone(165, 2, 'sine', .14, -10); this.tone(222, 1.6, 'sine', .09); break;
      case 'rumble': this.noise(2.6, .45, 160); this.tone(48, 2.4, 'sine', .38, -10); break;
      case 'whisper': this.noise(1, .07, 3500, 'bandpass'); break;
      case 'ui': this.tone(520, .05, 'square', .04); break;
      case 'step': this.noise(.07, .05, 500); break;
      case 'clink': this.tone(1760, .3, 'sine', .1); this.tone(2490, .2, 'sine', .05); break;
      case 'pour': this.noise(.9, .08, 1800, 'bandpass'); break;
      case 'sip': this.noise(.5, .05, 900, 'bandpass'); this.tone(120, .3, 'sine', .08, -30); break;
      case 'choke': this.noise(.8, .1, 700, 'bandpass'); this.tone(90, .8, 'sawtooth', .07, -30); break;
      case 'thump': this.tone(70, .3, 'sine', .35, -30); this.noise(.12, .2, 400); break;
      case 'scare': this.tone(60, 1.2, 'sawtooth', .22, -20); this.tone(94, 1, 'sawtooth', .14, 30); this.noise(.9, .2, 2500, 'highpass'); break;
      case 'paper': this.noise(.25, .1, 2500, 'highpass'); break;
      case 'creak': this.tone(150, .6, 'sawtooth', .05, -40); break;
      case 'win': [293, 370, 440, 587, 740].forEach((f, i) => this.tone(f, .9, 'triangle', .13, 0, i * .16)); break;
      case 'lose': [330, 262, 196, 131].forEach((f, i) => this.tone(f, .8, 'sawtooth', .09, 0, i * .22)); break;
    }
  },
  setTension(t) { this.tension += (t - this.tension) * .02; }
};

/* ---------------------------------------------------------- collision (top-down) */
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
  for (const s of L.solids) { if (!s.active || s.h < minH || s.glass) continue; const t = s.r !== undefined ? segCirc(ax, az, bx, bz, s) : segAABB(ax, az, bx, bz, s); if (t !== null && (best === null || t < best)) best = t; }
  return best;
}
function collide(L, o, r) {
  for (let it = 0; it < 2; it++) for (const s of L.solids) {
    if (!s.active || s.nocol) continue;
    if (s.r !== undefined) { const dx = o.x - s.cx, dz = o.z - s.cz, d = Math.hypot(dx, dz), m = r + s.r; if (d < m && d > 1e-6) { o.x = s.cx + dx / d * m; o.z = s.cz + dz / d * m; } }
    else {
      const cx = clamp(o.x, s.x0, s.x1), cz = clamp(o.z, s.z0, s.z1), dx = o.x - cx, dz = o.z - cz, d = Math.hypot(dx, dz);
      if (d < r) { if (d > 1e-6) { o.x = cx + dx / d * r; o.z = cz + dz / d * r; } else { const l = o.x - s.x0, rr = s.x1 - o.x, t = o.z - s.z0, b = s.z1 - o.z, m = Math.min(l, rr, t, b); if (m === l) o.x = s.x0 - r; else if (m === rr) o.x = s.x1 + r; else if (m === t) o.z = s.z0 - r; else o.z = s.z1 + r; } }
    }
  }
  const b = L.bounds; o.x = clamp(o.x, b.x0, b.x1); o.z = clamp(o.z, b.z0, b.z1);
}
function steer(L, a, tx, tz) {
  const base = Math.atan2(tz - a.z, tx - a.x), pref = a.side || 1;
  for (let i = 0; i < 9; i++) {
    const sgn = (i % 2) ? pref : -pref, ang = base + (i === 0 ? 0 : Math.ceil(i / 2) * .5 * sgn);
    if (rayHit(L, a.x, a.z, a.x + Math.cos(ang) * 2.4, a.z + Math.sin(ang) * 2.4, 0) === null) { if (i > 0) a.side = sgn; return ang; }
  }
  a.side = -pref; return base + 1.57 * pref;
}

/* ---------------------------------------------------------- levels (toon-lit paper dioramas) */
const PLANE = new THREE.PlaneGeometry(1, 1);
const FLAT = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
const BOXG = new THREE.BoxGeometry(1, 1, 1);
const HULL = new THREE.MeshBasicMaterial({ color: 0x14110e, side: THREE.BackSide });
class Level {
  constructor(id, o) {
    this.id = id; this.name = o.name || id; this.scene = new THREE.Scene(); this.o = o;
    this.scene.background = ART.skyTexture(o.sky || false); if (o.fog) this.scene.fog = new THREE.Fog(o.fog, o.fogNear, o.fogFar);
    this.bounds = o.bounds; this.indoor = !!o.indoor; this.tint = o.tint || 0xffffff;
    this.hemi = new THREE.HemisphereLight(o.hemi ? o.hemi[0] : 0xfff0d8, o.hemi ? o.hemi[1] : 0x8a7a60, o.hemi ? o.hemi[2] : .6);
    this.sun = new THREE.DirectionalLight(o.sunC || 0xffe2b0, o.sunI === undefined ? .75 : o.sunI); this.sun.position.set(...(o.sunDir || [-40, 60, 30]));
    this.pl = [0, 1, 2].map(() => { const l = new THREE.PointLight(0xffb468, 0, 24, 1.5); return l; });
    this.scene.add(this.hemi, this.sun, ...this.pl);
    this.solids = []; this.actors = []; this.inter = []; this.pick = []; this.bills = []; this.sway = []; this.flick = []; this.lamps = []; this.zones = []; this.corpses = []; this.ceilings = []; this.tickers = []; this.hides = [];
    this.camDist = o.camDist || 6.8; this.mapScale = o.mapScale || 1.6; this.matCache = {}; this.lineMat = new THREE.LineBasicMaterial({ color: 0x14110e });
    this.shadowMat = new THREE.MeshBasicMaterial({ color: 0x14110e, transparent: true, opacity: .28, depthWrite: false });
  }
  mat(tex, o = {}) {
    const k = tex.uuid + (o.at ? 'a' : '') + (o.double ? 'd' : '') + (o.tr ? 't' : '') + (o.add ? '+' : '') + (o.basic ? 'b' : '') + (o.tint || 0);
    if (this.matCache[k]) return this.matCache[k];
    const base = { map: tex, alphaTest: o.at ? .5 : 0, transparent: !!o.tr, depthWrite: !o.tr, side: o.double ? THREE.DoubleSide : THREE.FrontSide, blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending };
    return this.matCache[k] = o.basic ? new THREE.MeshBasicMaterial(Object.assign(base, { color: o.tint !== undefined ? o.tint : this.tint })) : Paper.toon(Object.assign(base, { color: o.tint !== undefined ? o.tint : 0xffffff }));
  }
  flat(color, o = {}) { const k = 'f' + color + (o.double ? 'd' : ''); return this.matCache[k] || (this.matCache[k] = Paper.toon({ color, side: o.double ? THREE.DoubleSide : THREE.FrontSide })); }
  solidBox(x, z, w, d, h, ex) { const s = Object.assign({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, h, active: true }, ex); this.solids.push(s); return s; }
  solidCirc(x, z, r, h = 3, ex) { const s = Object.assign({ cx: x, cz: z, r, h, active: true }, ex); this.solids.push(s); return s; }
  add(o) { this.scene.add(o); return o; }
  zoneAt(x, z) { let best = null; for (const zn of this.zones) if (x > zn.x0 && x < zn.x1 && z > zn.z0 && z < zn.z1 && (!best || zn.level > best.level)) best = zn; return best; }
}

function addBox(L, x, z, w, d, h, o = {}) {
  const key = o.tex || 'mud', tw = o.tile || 4, y0 = o.y0 || 0;
  const rep = len => Math.max(1, Math.round(len / tw)), ry = Math.max(1, Math.round(h / tw));
  const side = len => L.mat(ART.surf(key, rep(len), ry));
  const top = L.mat(ART.surf(o.topTex || (o.tex === 'blue' ? 'stone' : key), rep(w), rep(d)));
  const m = new THREE.Mesh(BOXG, [side(d), side(d), top, top, side(w), side(w)]); m.scale.set(w, h, d); m.position.set(x, y0 + h / 2, z); L.scene.add(m);
  if (o.hull !== false) { const t = o.hullT || (Math.max(w, d) > 8 ? .16 : .07), hm = new THREE.Mesh(BOXG, HULL); hm.scale.set(w + t * 2, h + t * 2, d + t * 2); hm.position.copy(m.position); L.scene.add(hm); m.userData.hull = hm; }
  if (o.solid !== false) { const s = L.solidBox(x, z, w, d, y0 + h, { map: o.map !== false }); m.userData.solid = s; }
  return m;
}
function addCrenel(L, x0, z0, x1, z1, y, tex = 'mud', size = .9) {
  const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.floor(len / (size * 1.8))), ang = Math.atan2(x1 - x0, z1 - z0), mt = L.mat(ART.surf(tex, 1, 1));
  for (let i = 0; i < n; i++) { const t = (i + .5) / n, m = new THREE.Mesh(BOXG, mt); m.scale.set(size, size, size); m.position.set(lerp(x0, x1, t), y + size / 2, lerp(z0, z1, t)); m.rotation.y = ang; L.scene.add(m); }
}
function addFlat(L, texKey, x, z, w, d, y = .02, rx = 1, ry = 1, o = {}) { const m = new THREE.Mesh(FLAT, L.mat(ART.surf(texKey, rx, ry), o)); m.scale.set(w, 1, d); m.position.set(x, y, z); L.scene.add(m); return m; }
function addCeiling(L, x0, z0, x1, z1, y, tex = 'ceiling') { const m = new THREE.Mesh(FLAT, L.mat(ART.surf(tex, Math.max(1, (x1 - x0) / 5), Math.max(1, (z1 - z0) / 5)), { double: true })); m.scale.set(x1 - x0, 1, z1 - z0); m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.rotation.x = Math.PI; L.scene.add(m); L.ceilings.push(m); return m; }
/* straight wall along x or z with doorway gaps; gaps = [[from,to]] measured along the wall */
function wallLine(L, x0, z0, x1, z1, o = {}) {
  const h = o.h || 6, t = o.t || 1.2, horiz = Math.abs(z1 - z0) < 1e-6, len = horiz ? Math.abs(x1 - x0) : Math.abs(z1 - z0), gaps = (o.gaps || []).slice().sort((a, b) => a[0] - b[0]);
  const seg = (a, b) => { if (b - a < .05) return; const cx = horiz ? Math.min(x0, x1) + (a + b) / 2 : x0, cz = horiz ? z0 : Math.min(z0, z1) + (a + b) / 2; addBox(L, cx, cz, horiz ? b - a : t, horiz ? t : b - a, h, { tex: o.tex || 'plaster', tile: o.tile || 3.5, hull: o.hull !== false, map: true }); };
  let cur = 0; for (const g of gaps) { seg(cur, g[0]); const gh = g[2] || 3.4, w = g[1] - g[0], cx = horiz ? Math.min(x0, x1) + (g[0] + g[1]) / 2 : x0, cz = horiz ? z0 : Math.min(z0, z1) + (g[0] + g[1]) / 2; if (h - gh > .2) addBox(L, cx, cz, horiz ? w : t, horiz ? t : w, h - gh, { tex: o.tex || 'plaster', tile: o.tile || 3.5, y0: gh, solid: false, hull: false }); cur = g[1]; }
  seg(cur, len);
}
function makeBill(L, def, H, o = {}) {
  const g = new THREE.Group(), p = new THREE.Group(); g.add(p);
  const mat = L.mat(def.tex, { at: true, double: true, basic: true }); const mesh = new THREE.Mesh(PLANE, mat), W = H * def.aspect; mesh.scale.set(W, H, 1); mesh.position.y = H / 2; p.add(mesh);
  if (o.shadow) { const sh = new THREE.Mesh(FLAT, L.mat(ART.fxTex('shadow'), { tr: true, basic: true, tint: 0xffffff })); sh.scale.set(Math.min(W * .8, 2.6), 1, Math.min(W * .45, 1.4)); sh.position.y = .03; sh.renderOrder = 1; g.add(sh); }
  return { g, p, mesh, H, W };
}
function addProp(L, key, x, z, s = 1, o = {}) {
  const d = ART.propTex(key), H = d.H * s, b = makeBill(L, d, H, { shadow: o.shadow !== undefined ? o.shadow : H > 1.2 });
  b.g.position.set(x, o.y || 0, z); if (o.flip) b.mesh.scale.x *= -1; L.scene.add(b.g); L.bills.push(b.g);
  if (o.sway !== false && ['palm', 'tuft', 'bush', 'spade', 'star', 'reeds'].includes(key)) L.sway.push({ p: b.p, ph: Math.random() * 6, amp: key === 'palm' ? .018 : (key === 'spade' || key === 'star') ? .06 : .05 });
  if (o.solid) L.solidCirc(x, z, o.solid, o.solidH || 1.5, { map: false });
  return b;
}
function addFlame(L, x, y, z, s = 1, o = {}) {
  const m = new THREE.Mesh(PLANE, L.mat(ART.fxTex('glow'), { tr: true, add: true, basic: true, tint: 0xffffff })); m.scale.set(1.5 * s, 1.8 * s, 1); m.position.set(x, y + .7 * s, z); L.scene.add(m); L.bills.push(m);
  const core = new THREE.Mesh(PLANE, L.mat(ART.fxTex('glow'), { tr: true, add: true, basic: true, tint: 0xffddaa })); core.scale.set(.6 * s, .9 * s, 1); core.position.set(x, y + .35 * s, z); L.scene.add(core); L.bills.push(core);
  L.flick.push({ m, core, ph: Math.random() * 9, s }); if (o.light !== false) L.lamps.push({ x, y: y + .8 * s, z, i: (o.i || 1.5) * s });
  return m;
}
function addLightPool(L, x, z, r = 5, a = .5) { const m = new THREE.Mesh(FLAT, L.mat(ART.fxTex('glow'), { tr: true, add: true, basic: true, tint: 0xffffff }).clone()); m.scale.set(r * 2, 1, r * 2); m.position.set(x, .05, z); m.material.opacity = a; m.material.transparent = true; L.scene.add(m); L.flick.push({ pool: m, base: a, ph: Math.random() * 9 }); return m; }
function addInter(L, o) { o.r = o.r || 2.2; o.L = L; L.inter.push(o); return o; }
function spawnPickup(L, type, val, x, z) {
  const d = ART.pickTex(type), b = makeBill(L, d, .6, { shadow: true }); b.g.position.set(x, 0, z); L.scene.add(b.g); L.bills.push(b.g);
  const p = { x, z, type, val, b, t: Math.random() * 6, L }; L.pick.push(p); return p;
}

/* ---------------------------------------------------------- FX */
const FX = {
  pool: [], live: [], decals: [],
  init() { for (let i = 0; i < 200; i++) { const m = new THREE.Mesh(PLANE, new THREE.MeshBasicMaterial({ map: ART.fxTex('puff'), transparent: true, depthWrite: false, side: THREE.DoubleSide })); m.visible = false; m.frustumCulled = false; this.pool.push(m); } },
  attach(scene) { this.pool.forEach(m => scene.add(m)); this.decals.forEach(d => scene.add(d.m)); },
  spawn(o) {
    const m = this.pool.pop(); if (!m) return null;
    m.material.map = o.tex; m.material.color.set(o.color !== undefined ? o.color : 0xffffff); m.material.blending = o.add ? THREE.AdditiveBlending : THREE.NormalBlending; m.material.opacity = 1; m.material.needsUpdate = true;
    m.position.set(o.x, o.y, o.z); m.scale.set(o.s0, o.s0, 1); m.rotation.set(0, 0, o.rot || 0); m.visible = true;
    const p = Object.assign({ m, vx: 0, vy: 0, vz: 0, g: 0, life: .6, t: 0, s0: 1, s1: 1, spin: 0, fade: true, bill: true, drag: 0 }, o); this.live.push(p); return p;
  },
  puff(x, y, z, n = 6, col = 0xffffff, sp = 2, s1 = 1.2) { for (let i = 0; i < n; i++) this.spawn({ tex: ART.fxTex('puff'), x, y, z, s0: .25, s1: rand(.7, 1) * s1, vx: rand(-sp, sp), vy: rand(.2, 1.2), vz: rand(-sp, sp), life: rand(.4, .8), color: col, drag: 2 }); },
  paper(x, y, z, n = 8, sp = 3.5) { const t = ART.fxTex('paper'); for (let i = 0; i < n; i++) this.spawn({ tex: t, x, y, z, s0: rand(.12, .24), s1: .1, vx: rand(-sp, sp), vy: rand(1, 4), vz: rand(-sp, sp), g: 5, life: rand(.8, 1.8), color: i % 3 ? 0xefe6d0 : 0xc8b48c, spin: rand(-9, 9), drag: 1.2 }); },
  ink(x, z) {
    for (let i = 0; i < 5; i++) this.spawn({ tex: ART.fxTex('splat'), x, y: 1.1, z, s0: .3, s1: .12, vx: rand(-3, 3), vy: rand(1, 3.5), vz: rand(-3, 3), g: 10, life: rand(.4, .7), color: 0x14110e });
    const m = this.decalMesh(); if (!m) return; m.material.map = ART.fxTex('splat'); m.material.color.set(0x14110e); m.material.opacity = .8; m.position.set(x, .04 + Math.random() * .01, z); const s = rand(.7, 1.3); m.scale.set(s, 1, s); m.rotation.y = rand(0, 6); m.visible = true; this.decals.push({ m, t: 0, life: 30 });
  },
  decalMesh() { if (this.decals.length > 24) { const d = this.decals.shift(); d.m.visible = false; return d.m; } const m = new THREE.Mesh(FLAT, new THREE.MeshBasicMaterial({ map: ART.fxTex('splat'), transparent: true, depthWrite: false })); m.renderOrder = 1; G.level && G.level.scene.add(m); return m; },
  slash(x, y, z, dx, dz) { this.spawn({ tex: ART.fxTex('slash'), x: x + dx * 1.1, y, z: z + dz * 1.1, s0: 1.5, s1: 2.1, life: .16, bill: true, rot: Math.atan2(dz, dx) > 0 ? .3 : -.3 }); },
  glow(x, y, z, s = 3, life = .4, col = 0xffd890) { this.spawn({ tex: ART.fxTex('glow'), x, y, z, s0: s * .5, s1: s, life, add: true, color: col }); },
  update(dt) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i], m = p.m; p.t += dt; const k = p.t / p.life;
      if (k >= 1) { m.visible = false; this.pool.push(m); this.live.splice(i, 1); continue; }
      p.vy -= p.g * dt; const dr = Math.max(0, 1 - p.drag * dt); p.vx *= dr; p.vz *= dr; m.position.x += p.vx * dt; m.position.y = Math.max(.05, m.position.y + p.vy * dt); m.position.z += p.vz * dt;
      const s = lerp(p.s0, p.s1, k); m.scale.set(s, s, 1); if (p.bill) m.rotation.y = G.camYaw; if (p.spin) m.rotation.z += p.spin * dt; if (p.fade) m.material.opacity = k < .5 ? 1 : 1 - (k - .5) * 2;
    }
    for (let i = this.decals.length - 1; i >= 0; i--) { const d = this.decals[i]; d.t += dt; if (d.t > d.life - 4) d.m.material.opacity = Math.max(0, .8 * (d.life - d.t) / 4); if (d.t > d.life) { d.m.visible = false; this.decals.splice(i, 1); } }
  }
};

/* ---------------------------------------------------------- sequences (async story scripting) */
const Seq = {
  t: 0, skipping: false, waiters: [], polls: [], frames: [],
  wait(s) { return new Promise(r => { if (Seq.skipping) return r(); Seq.waiters.push({ at: Seq.t + s, r }); }); },
  until(fn) { return new Promise(r => { if (fn()) return r(); Seq.polls.push({ fn, r }); }); },
  run(fn) { return new Promise(r => { Seq.frames.push({ fn, r }); }); },
  tick(dt) {
    Seq.t += dt;
    for (let i = Seq.waiters.length - 1; i >= 0; i--) if (Seq.waiters[i].at <= Seq.t || Seq.skipping) { const w = Seq.waiters[i]; Seq.waiters.splice(i, 1); w.r(); }
    for (let i = Seq.polls.length - 1; i >= 0; i--) if (Seq.polls[i].fn() || Seq.skipping) { const w = Seq.polls[i]; Seq.polls.splice(i, 1); w.r(); }
    for (let i = Seq.frames.length - 1; i >= 0; i--) { const f = Seq.frames[i]; if (f.fn(dt)) { Seq.frames.splice(i, 1); f.r(); } }
  },
  reset() { Seq.waiters.length = Seq.polls.length = Seq.frames.length = 0; Seq.skipping = false; }
};

/* ---------------------------------------------------------- cinematic camera */
const Cine = {
  on: false, s: null, pose: null, lookYaw: 0, lookPitch: 0,
  begin() { Cine.on = true; G.prevMode = G.mode; G.mode = 'cine'; document.body.classList.add('cine'); $('bars').classList.add('on'); Cine.lookYaw = Cine.lookPitch = 0; },
  end() { Cine.on = false; Cine.s = null; if (G.mode === 'cine') G.mode = 'play'; document.body.classList.remove('cine'); $('bars').classList.remove('on'); UI.caption(''); camera.fov = 64; camera.updateProjectionMatrix(); Seq.skipping = false; if (window.VM) VM.set(null); },
  /* third-person style shot: from/to/look/lookTo are [x,y,z]; pov shot: pos(+posTo), yaw(+yawTo), pitch(+pitchTo), free (allow mouse look) */
  shot(o) {
    return new Promise(res => {
      if (!Cine.on) Cine.begin();
      const ev = v => typeof v === 'function' ? v() : v; Cine.s = Object.assign({}, o, { t: 0, res, _from: ev(o.from), _to: ev(o.to || o.from), _look: ev(o.look), _lookTo: ev(o.lookTo || o.look), _pos: ev(o.pos), _posTo: ev(o.posTo || o.pos) });
      if (o.cap !== undefined) UI.caption(o.cap, o.dur); else if (o.dur < 100) { } if (o.sfx) Aud.sfx(o.sfx); if (o.fn) o.fn();
      if (Seq.skipping) { Cine.apply(Cine.s, 1, 0); Cine.s = null; res(); }
    });
  },
  apply(s, e, dt) {
    if (s._pos) {
      const yaw = lerp(s.yaw || 0, s.yawTo === undefined ? (s.yaw || 0) : s.yawTo, e), pit = lerp(s.pitch || 0, s.pitchTo === undefined ? (s.pitch || 0) : s.pitchTo, e);
      if (s.free) { Cine.lookYaw = clamp(Cine.lookYaw - Input.dx * .0022, -1.1, 1.1); Cine.lookPitch = clamp(Cine.lookPitch - Input.dy * .0022, -.8, .8); }
      const y = yaw + Cine.lookYaw, p = pit + Cine.lookPitch;
      camera.position.set(lerp(s._pos[0], s._posTo[0], e), lerp(s._pos[1], s._posTo[1], e), lerp(s._pos[2], s._posTo[2], e));
      const cp = Math.cos(p); camera.lookAt(camera.position.x - Math.sin(y) * cp, camera.position.y + Math.sin(p), camera.position.z - Math.cos(y) * cp);
      if (s.sway) { camera.position.y += Math.sin(G.time * 1.3) * s.sway; camera.rotation.z += Math.sin(G.time * .9) * s.sway * .5; }
    } else {
      camera.position.set(lerp(s._from[0], s._to[0], e), lerp(s._from[1], s._to[1], e), lerp(s._from[2], s._to[2], e));
      camera.lookAt(lerp(s._look[0], s._lookTo[0], e), lerp(s._look[1], s._lookTo[1], e), lerp(s._look[2], s._lookTo[2], e));
    }
    if (s.shake) camera.position.add(new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(s.shake * (1 - e * .5)));
    const f = s.fov ? lerp(s.fov[0], s.fov[1], e) : 64; if (Math.abs(camera.fov - f) > .02) { camera.fov = f; camera.updateProjectionMatrix(); }
    Cine.pose = { pos: camera.position.clone() };
  },
  update(dt) {
    const s = Cine.s; if (!s) return;
    if (Cine.skippable !== false && (tap('Space') || tap('Escape'))) { Seq.skipping = true; }
    s.t += dt; const k = clamp(s.t / s.dur, 0, 1), e = s.lin ? k : ease(k); Cine.apply(s, e, dt);
    if (k >= 1 || Seq.skipping) { Cine.s = null; if (s.hold) Cine.holdS = s; s.res(); }
  }
};

/* ---------------------------------------------------------- UI helpers */
const UI = {
  _cap: null,
  toast(text, ms = 3200, cls = '') { const d = document.createElement('div'); d.className = 'toast ' + cls; d.innerHTML = text; $('toasts').appendChild(d); setTimeout(() => d.classList.add('out'), ms); setTimeout(() => d.remove(), ms + 600); },
  sub(text, ms = 3200) { const el = $('subs'); el.textContent = text; el.classList.add('on'); clearTimeout(this._st); this._st = setTimeout(() => el.classList.remove('on'), ms); },
  feed(text, cls = '') { const d = document.createElement('div'); d.className = 'feed ' + cls; d.innerHTML = text; $('feed').appendChild(d); while ($('feed').children.length > 4) $('feed').firstChild.remove(); setTimeout(() => d.classList.add('out'), 5200); setTimeout(() => d.remove(), 5800); },
  caption(text, dur = 3) {
    const el = $('caption'); clearInterval(this._cap); el.textContent = ''; if (!text) { el.classList.remove('on'); return; }
    el.classList.add('on'); let i = 0; const per = Math.max(18, Math.min(60, (dur * 1000 * .7) / text.length)); this._cap = setInterval(() => { el.textContent = text.slice(0, ++i); if (i >= text.length) clearInterval(this._cap); }, per);
  },
  project(x, y, z) { const v = new THREE.Vector3(x, y, z).project(camera); return [(v.x * .5 + .5) * innerWidth, (-v.y * .5 + .5) * innerHeight, v.z]; },
  pop(x, y, z, text, cls = '') { const [sx, sy, sz] = this.project(x, y, z); if (sz > 1) return; const d = document.createElement('div'); d.className = 'pop ' + cls; d.textContent = text; d.style.left = sx + 'px'; d.style.top = sy + 'px'; $('hud').appendChild(d); setTimeout(() => d.remove(), 1100); },
  hit() { const c = $('cross'); c.classList.remove('hit'); void c.offsetWidth; c.classList.add('hit'); },
  flash(cls, ms = 400) { const e = $('flash'); e.className = cls; e.style.opacity = 1; setTimeout(() => { e.style.opacity = 0; }, ms); },
  /* spoken line: pseudo-Akkadian + English subtitle; resolves after reading time (E / click advances) */
  async say(who, en, o = {}) {
    if (Seq.skipping) return; const V = VOICES[who] || VOICES._; const akk = o.akk || LANG.say(en), el = $('lines');
    el.innerHTML = `<div class="who" style="color:${V.color}">${who === '_' ? '' : who}</div><div class="akk">${akk}</div><div class="en">${en}</div>`; el.classList.add('on');
    const vd = Aud.voice(V.pitch, akk, o.vol || .5), dur = Math.max(2.1, en.length * .052 + .7, vd + .3); let adv = false;
    const onAdv = e => { if (e.code === 'KeyE' || e.code === 'Enter') adv = true; }; addEventListener('keydown', onAdv);
    const done = Seq.t + dur; await Seq.until(() => Seq.t >= done || adv); removeEventListener('keydown', onAdv);
    if (!o.keep) el.classList.remove('on');
  },
  hideLines() { $('lines').classList.remove('on'); },
  /* choice list: resolves with the chosen index */
  ask(prompt, opts) {
    return new Promise(res => {
      if (Seq.skipping) return res(0); const el = $('dialog'); unlockPointer(); G.askPrev = G.mode;
      el.innerHTML = `<div class="dlg-text">${prompt}</div><div class="dlg-opts">${opts.map((o, i) => `<button data-i="${i}"><b>${i + 1}</b> ${typeof o === 'string' ? o : o.t}</button>`).join('')}</div>`; el.classList.add('on');
      const fin = i => { removeEventListener('keydown', kd); el.classList.remove('on'); Aud.sfx('ui'); if (G.askPrev === 'play' || G.askPrev === 'cine') lockPointer(); res(i); };
      const kd = e => { const i = parseInt(e.key) - 1; if (i >= 0 && i < opts.length) fin(i); }; addEventListener('keydown', kd);
      el.querySelectorAll('button').forEach(b => b.onclick = () => fin(+b.dataset.i)); Aud.sfx('ui');
    });
  },
  wipe(title, sub, mid, after) {
    const w = $('wipe'); G.modeBeforeWipe = G.mode; G.mode = 'wipe'; unlockPointer(); $('wipeT').textContent = title || ''; $('wipeS').textContent = sub || '';
    w.classList.remove('out'); w.classList.add('in');
    setTimeout(() => { mid && mid(); w.classList.add('hold'); setTimeout(() => { w.classList.remove('in', 'hold'); w.classList.add('out'); setTimeout(() => { w.classList.remove('out'); after && after(); }, 650); }, title ? 1100 : 250); }, 700);
  },
  /* quick-time events */
  qte: {
    el: null,
    show(label, k) { const e = $('qte'); e.classList.add('on'); $('qteKey').textContent = k; $('qteLabel').textContent = label; $('qteBar').style.width = '0%'; $('qte').classList.remove('bad'); },
    hide() { $('qte').classList.remove('on'); },
    press(k, timeout, label) { return new Promise(res => { UI.qte.show(label, k.replace('Key', '')); let t = 0; Input.pressed[k] = false; Seq.frames.push({ fn: dt => { t += dt; $('qteBar').style.width = (t / timeout * 100) + '%'; if (tap(k)) { UI.qte.hide(); res(true); return true; } if (t > timeout) { UI.qte.hide(); res(false); return true; } return false; }, r: () => { } }); }); },
    mash(k, need, dur, decay, label) { return new Promise(res => { UI.qte.show(label, k.replace('Key', '') + ' ×'); let v = need * .3, t = 0, last = Input.cnt[k] || 0; Seq.skipping = false; Seq.frames.push({ fn: dt => { t += dt; v = Math.max(0, v - decay * dt); const c = Input.cnt[k] || 0; if (c > last) { v += c - last; last = c; Aud.sfx('thump'); G.shake = Math.max(G.shake, .05); } $('qteBar').style.width = Math.min(100, v / need * 100) + '%'; if (v >= need) { UI.qte.hide(); res(true); return true; } if (t > dur) { UI.qte.hide(); res(false); return true; } return false; }, r: () => { } }); }); },
    hold(k, secs, label, abortIf) { return new Promise(res => { UI.qte.show(label, k.replace('Key', '') + ' (hold)'); let v = 0; Seq.frames.push({ fn: dt => { if (key(k)) v += dt; else v = Math.max(0, v - dt * 1.5); if (abortIf && abortIf()) { UI.qte.hide(); res(false); return true; } $('qteBar').style.width = Math.min(100, v / secs * 100) + '%'; if (v >= secs) { UI.qte.hide(); res(true); return true; } return false; }, r: () => { } }); }); }
  }
};
