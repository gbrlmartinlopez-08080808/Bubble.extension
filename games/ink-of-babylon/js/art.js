/* ============================================================
   INK OF BABYLON — art.js
   Sepia cardboard textures, inked props, icons and FX sprites,
   all drawn at runtime on <canvas>. Nothing is loaded from disk.
   ============================================================ */
const ART = (function () {
  'use strict';
  const INK = '#14110e', PAPER = '#efe6d0', RED = '#8d3a2a', BLUE = '#2e5d85', OCHRE = '#c9983f', OLIVE = '#8a8a62', SAND = '#d4c19a';

  let _s = 1;
  function rnd() { _s = (_s + 0x6D2B79F5) | 0; let t = Math.imul(_s ^ (_s >>> 15), 1 | _s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  function seed(n) { _s = n | 0; }
  function hash(str) { let h = 7; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return h; }
  const jit = a => (rnd() - .5) * 2 * a, ri = (a, b) => a + rnd() * (b - a);
  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function texOf(c, repeat) { const t = new THREE.CanvasTexture(c); t.anisotropy = 4; if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
  const cache = {}, memo = (k, f) => cache[k] || (cache[k] = f());

  /* ---------- ink primitives ---------- */
  function line(c, x1, y1, x2, y2, w = 3, col = INK) {
    c.strokeStyle = col; c.lineCap = 'round';
    for (let k = 0; k < 2; k++) { c.beginPath(); c.moveTo(x1 + jit(1.2), y1 + jit(1.2)); c.quadraticCurveTo((x1 + x2) / 2 + jit(2.4), (y1 + y2) / 2 + jit(2.4), x2 + jit(1.2), y2 + jit(1.2)); c.lineWidth = k ? w * .4 : w; c.stroke(); }
  }
  function poly(c, pts, fill, w = 3) { c.beginPath(); pts.forEach(([x, y], i) => { const px = x + jit(1.1), py = y + jit(1.1); i ? c.lineTo(px, py) : c.moveTo(px, py); }); c.closePath(); if (fill) { c.fillStyle = fill; c.fill(); } c.strokeStyle = INK; c.lineWidth = w; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); }
  function rect(c, x, y, w, h, fill, lw = 3) { poly(c, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], fill, lw); }
  function ell(c, cx, cy, rx, ry, fill, lw = 3, a0 = 0, a1 = Math.PI * 2) {
    c.beginPath(); for (let i = 0; i <= 28; i++) { const a = a0 + (a1 - a0) * i / 28, px = cx + Math.cos(a) * rx + jit(.7), py = cy + Math.sin(a) * ry + jit(.7); i ? c.lineTo(px, py) : c.moveTo(px, py); }
    if (fill) { c.closePath(); c.fillStyle = fill; c.fill(); } c.strokeStyle = INK; c.lineWidth = lw; c.lineCap = 'round'; c.stroke();
  }
  function curve(c, pts, w = 3, col = INK) { c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length - 1; i++) c.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2); const l = pts[pts.length - 1]; c.lineTo(l[0], l[1]); c.stroke(); }
  function hatchPoly(c, pts, gap = 7, ang = .8, alpha = .4, w = 1.6) {
    c.save(); c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.clip();
    let a = 1e9, b = -1e9, d = 1e9, e = -1e9; pts.forEach(([x, y]) => { a = Math.min(a, x); b = Math.max(b, x); d = Math.min(d, y); e = Math.max(e, y); });
    c.strokeStyle = INK; c.globalAlpha = alpha; c.lineWidth = w; const R = Math.hypot(b - a, e - d), cx = (a + b) / 2, cy = (d + e) / 2;
    for (let k = -R; k < R; k += gap) { const ox = Math.cos(ang + 1.57) * k, oy = Math.sin(ang + 1.57) * k; c.beginPath(); c.moveTo(cx + ox - Math.cos(ang) * R, cy + oy - Math.sin(ang) * R); c.lineTo(cx + ox + Math.cos(ang) * R, cy + oy + Math.sin(ang) * R); c.stroke(); }
    c.restore();
  }

  /* ---------- icons ---------- */
  const ICONS = {
    heart(c, x, y, s, col = RED) { c.beginPath(); c.moveTo(x, y + s * .75); c.bezierCurveTo(x - s * 1.2, y - s * .1, x - s * .55, y - s * .95, x, y - s * .35); c.bezierCurveTo(x + s * .55, y - s * .95, x + s * 1.2, y - s * .1, x, y + s * .75); c.fillStyle = col; c.fill(); c.strokeStyle = INK; c.lineWidth = s * .13; c.stroke(); },
    smile(c, x, y, s) { ell(c, x, y, s, s, '#efe0b0', s * .12); ell(c, x - s * .35, y - s * .2, s * .09, s * .13, INK, 1); ell(c, x + s * .35, y - s * .2, s * .09, s * .13, INK, 1); ell(c, x, y + s * .1, s * .5, s * .38, null, s * .11, .25, 2.9); },
    sword(c, x, y, s) { poly(c, [[x, y - s], [x + s * .17, y + s * .25], [x - s * .17, y + s * .25]], '#dfe0dc', s * .1); line(c, x - s * .5, y + s * .3, x + s * .5, y + s * .3, s * .17); line(c, x, y + s * .3, x, y + s * .85, s * .2); },
    clover(c, x, y, s) { const r = s * .42;[[-.42, 0], [.42, 0], [0, -.5], [0, .38]].forEach(([dx, dy]) => ell(c, x + dx * s, y + dy * s, r, r, '#a0a878', s * .1)); line(c, x, y + s * .5, x + s * .25, y + s, s * .12); },
    eye(c, x, y, s) { c.beginPath(); c.moveTo(x - s, y); c.quadraticCurveTo(x, y - s * .95, x + s, y); c.quadraticCurveTo(x, y + s * .95, x - s, y); c.fillStyle = '#f6f0e0'; c.fill(); c.strokeStyle = INK; c.lineWidth = s * .12; c.stroke(); ell(c, x, y, s * .33, s * .33, '#7a8a8a', s * .09); ell(c, x, y, s * .13, s * .13, INK, 1); },
    coin(c, x, y, s) { ell(c, x, y, s, s * .75, OCHRE, s * .12); ell(c, x, y, s * .6, s * .42, null, s * .07); line(c, x - s * .15, y - s * .15, x + s * .15, y + s * .15, s * .08); },
    tablet(c, x, y, s) { poly(c, [[x - s * .8, y - s * .6], [x + s * .8, y - s * .7], [x + s * .85, y + s * .6], [x - s * .75, y + s * .7]], '#c79a62', s * .1); for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) line(c, x - s * .5 + j * s * .3, y - s * .35 + i * s * .3, x - s * .38 + j * s * .3, y - s * .28 + i * s * .3, s * .07); },
    bow(c, x, y, s) { curve(c, [[x - s * .4, y - s], [x + s * .5, y - s * .3], [x + s * .5, y + s * .3], [x - s * .4, y + s]], s * .14, '#6a4a30'); line(c, x - s * .4, y - s, x - s * .4, y + s, s * .05); },
    knife(c, x, y, s) { poly(c, [[x - s * .12, y + s * .1], [x + s * .12, y + s * .1], [x + s * .08, y - s * .9], [x, y - s]], '#d8d6cc', s * .08); line(c, x - s * .3, y + s * .12, x + s * .3, y + s * .12, s * .12); line(c, x, y + s * .12, x, y + s * .8, s * .16); },
    sling(c, x, y, s) { ell(c, x, y + s * .35, s * .3, s * .3, '#7a6548', s * .1); curve(c, [[x - s * .3, y + s * .3], [x - s * .6, y - s * .4], [x, y - s * .9]], s * .08); curve(c, [[x + s * .3, y + s * .3], [x + s * .6, y - s * .4], [x, y - s * .9]], s * .08); },
    pot(c, x, y, s) { poly(c, [[x - s * .3, y - s * .6], [x + s * .3, y - s * .6], [x + s * .7, y - s * .1], [x + s * .5, y + s * .7], [x - s * .5, y + s * .7], [x - s * .7, y - s * .1]], '#9a6a42', s * .1); },
    vial(c, x, y, s) { poly(c, [[x - s * .22, y - s * .9], [x + s * .22, y - s * .9], [x + s * .22, y - s * .3], [x + s * .5, y + s * .5], [x - s * .5, y + s * .5], [x - s * .22, y - s * .3]], '#7d9a7a', s * .09); },
    hand(c, x, y, s) { ell(c, x, y, s * .8, s * .8, '#efe6d0', s * .12); ell(c, x + s * .7, y - s * .3, s * .35, s * .3, '#efe6d0', s * .1); },
    star(c, x, y, s) { const p = []; for (let i = 0; i < 10; i++) { const r = i % 2 ? s * .42 : s, a = -Math.PI / 2 + i * Math.PI / 5; p.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); } poly(c, p, '#efe6d0', s * .1); },
    herb(c, x, y, s) { for (let i = -2; i <= 2; i++) { const a = -1.57 + i * .45; poly(c, [[x, y + s * .7], [x + Math.cos(a - .2) * s, y + s * .7 + Math.sin(a - .2) * s * 1.4], [x + Math.cos(a + .2) * s, y + s * .7 + Math.sin(a + .2) * s * 1.4]], OLIVE, s * .07); } },
    wine(c, x, y, s) { poly(c, [[x - s * .3, y - s * .9], [x + s * .3, y - s * .9], [x + s * .3, y - s * .35], [x + s * .6, y + s * .1], [x + s * .6, y + s * .8], [x - s * .6, y + s * .8], [x - s * .6, y + s * .1], [x - s * .3, y - s * .35]], '#6b3a30', s * .09); },
    sun(c, x, y, s) { line(c, x - s, y + s * .35, x + s, y + s * .35, s * .12); ell(c, x, y + s * .35, s * .55, s * .55, '#ecd08a', s * .1, Math.PI, Math.PI * 2); for (let i = 0; i < 5; i++) { const a = Math.PI + (i + .5) / 5 * Math.PI; line(c, x + Math.cos(a) * s * .75, y + .35 * s + Math.sin(a) * s * .75, x + Math.cos(a) * s * 1.05, y + .35 * s + Math.sin(a) * s * 1.05, s * .1); } }
  };
  const iconCache = {};
  function iconURL(name, size = 64) { return iconCache[name + size] || (iconCache[name + size] = (() => { const c = mk(size, size), x = c.getContext('2d'); seed(hash(name) + 3); ICONS[name](x, size / 2, size / 2, size * .36); return c.toDataURL(); })()); }

  /* ---------- sprite props (inked billboards) ---------- */
  const PR = {};
  PR.tuft = { w: 128, h: 96, H: .7, d(c) { for (let i = -3; i <= 3; i++) { const a = -1.57 + i * .3, L = ri(44, 80); poly(c, [[64 + i * 5 - 5, 92], [64 + Math.cos(a) * L, 92 + Math.sin(a) * L], [64 + i * 5 + 5, 92]], i % 2 ? '#a3a276' : '#8a8a62', 2.5); } } };
  PR.bush = { w: 192, h: 128, H: 1.4, d(c) { [[40, 80, 34], [76, 62, 40], [118, 76, 38], [150, 88, 30], [96, 96, 36]].forEach(([x, y, r]) => ell(c, x, y, r, r * .9, '#8a8a62', 3)); for (let i = 0; i < 9; i++) { const x = ri(30, 160), y = ri(50, 110); curve(c, [[x, y], [x + 6, y - 6], [x + 12, y]], 1.6); } } };
  PR.rock = { w: 128, h: 96, H: .9, d(c) { poly(c, [[10, 90], [22, 46], [54, 24], [92, 30], [118, 60], [122, 90]], '#b8a98e', 3.5); hatchPoly(c, [[70, 30], [118, 60], [122, 90], [60, 90]], 6, .8, .4); line(c, 38, 60, 52, 70, 2); } };
  PR.palm = { w: 256, h: 400, H: 8, d(c) {
    poly(c, [[118, 392], [138, 392], [150, 150], [134, 150]], '#a98a5c', 3.5); for (let y = 170; y < 390; y += 20) line(c, 119, y, 146, y + 4, 2);
    const cx = 142, cy = 148;
    for (let i = 0; i < 8; i++) { const a = Math.PI + i / 7 * Math.PI, L = 105 + (i % 2) * 14, ex = cx + Math.cos(a) * L, ey = cy + Math.sin(a) * L * .55 + 38, mx = cx + Math.cos(a) * L * .55, my = cy + Math.sin(a) * L * .85 - 16;
      c.beginPath(); c.moveTo(cx, cy); c.quadraticCurveTo(mx, my - 14, ex, ey); c.quadraticCurveTo(mx, my + 14, cx, cy); c.fillStyle = i % 2 ? '#7d7d54' : '#8f8f66'; c.fill(); c.strokeStyle = INK; c.lineWidth = 3.5; c.stroke();
      for (let k = 1; k < 7; k++) { const t = k / 7, px = (1 - t) * (1 - t) * cx + 2 * (1 - t) * t * mx + t * t * ex, py = (1 - t) * (1 - t) * cy + 2 * (1 - t) * t * (my - 2) + t * t * ey; line(c, px, py, px + (ex - cx) * .06, py + 14, 1.6); } }
    ell(c, 132, 160, 7, 9, '#9a6a3a', 2); ell(c, 146, 164, 7, 9, '#9a6a3a', 2); } };
  PR.amphora = { w: 80, h: 112, H: 1.3, d(c) { poly(c, [[28, 10], [52, 10], [54, 28], [72, 52], [66, 92], [50, 104], [30, 104], [14, 92], [8, 52], [26, 28]], '#b4825a', 3.5); line(c, 18, 50, 62, 50, 3); line(c, 14, 70, 66, 70, 2); hatchPoly(c, [[46, 30], [70, 54], [64, 92], [48, 102]], 6, .8, .35); curve(c, [[10, 40], [0, 50], [10, 60]], 3); curve(c, [[70, 40], [80, 50], [70, 60]], 3); } };
  PR.basket = { w: 112, h: 96, H: .8, d(c) { poly(c, [[10, 30], [102, 30], [92, 88], [20, 88]], '#b99a62', 3.5); for (let i = 0; i < 5; i++) line(c, 16, 38 + i * 11, 98, 38 + i * 11, 1.6); for (let i = 0; i < 7; i++) line(c, 22 + i * 12, 30, 22 + i * 11, 88, 1.4); ell(c, 40, 26, 14, 8, '#c9a64a', 2); ell(c, 66, 24, 14, 8, '#b8683a', 2); ell(c, 82, 27, 12, 7, '#c9a64a', 2); } };
  PR.crate = { w: 112, h: 112, H: 1.0, d(c) { rect(c, 10, 14, 92, 92, '#b0925f', 3.5); line(c, 10, 14, 102, 106, 3); line(c, 102, 14, 10, 106, 3); rect(c, 22, 26, 68, 68, null, 2); } };
  PR.reeds = { w: 96, h: 160, H: 2.2, d(c) { for (let i = 0; i < 9; i++) { const x = 20 + i * 7, t = ri(10, 60); poly(c, [[x - 2, 156], [x + ri(-14, 14), t], [x + 3, 156]], i % 2 ? '#b8a56a' : '#a39052', 2); } line(c, 14, 130, 84, 130, 4); } };
  PR.brazier = { w: 96, h: 112, H: 1.4, d(c) { poly(c, [[18, 50], [78, 50], [66, 70], [56, 104], [40, 104], [30, 70]], '#4a4640', 3.5); line(c, 20, 52, 76, 52, 4); line(c, 26, 104, 70, 104, 4); } };
  PR.torch = { w: 64, h: 144, H: 2.4, d(c) { line(c, 32, 138, 32, 50, 6, '#6b5030'); poly(c, [[20, 52], [44, 52], [40, 40], [24, 40]], '#555', 3); } };
  PR.spade = { w: 112, h: 320, H: 5.2, d(c) { line(c, 56, 316, 56, 8, 5, '#5a4630'); poly(c, [[16, 22], [96, 22], [96, 200], [56, 172], [16, 200]], '#d7ccb0', 3.5); poly(c, [[56, 54], [78, 118], [56, 146], [34, 118]], '#5a4a38', 3); line(c, 56, 40, 56, 150, 4); line(c, 36, 60, 76, 60, 3); } };
  PR.star = { w: 112, h: 320, H: 5.2, d(c) { line(c, 56, 316, 56, 8, 5, '#5a4630'); poly(c, [[16, 22], [96, 22], [96, 200], [56, 172], [16, 200]], '#2e5d85', 3.5); const p = []; for (let i = 0; i < 16; i++) { const r = i % 2 ? 11 : 30, a = -1.57 + i * Math.PI / 8; p.push([56 + Math.cos(a) * r, 96 + Math.sin(a) * r]); } poly(c, p, '#efe6d0', 2.5); } };
  PR.stele = { w: 96, h: 176, H: 2.6, d(c) { poly(c, [[14, 170], [14, 50], [24, 20], [72, 20], [82, 50], [82, 170]], '#c4b592', 3.5); for (let i = 0; i < 9; i++) for (let j = 0; j < 4; j++) { const x = 28 + j * 12, y = 52 + i * 12; line(c, x, y, x + 6, y + 2, 2); line(c, x + 3, y - 3, x + 3, y + 4, 1.4); } hatchPoly(c, [[56, 22], [82, 50], [82, 170], [52, 170]], 6, .8, .3); } };
  PR.statue = { w: 224, h: 224, H: 3.6, d(c) {
    rect(c, 22, 190, 180, 28, '#b8a98e', 3.5); ell(c, 110, 150, 72, 38, '#cdbb90', 3.5); poly(c, [[150, 130], [172, 60], [196, 70], [186, 140]], '#cdbb90', 3.5); ell(c, 182, 62, 24, 20, '#cdbb90', 3.5); ell(c, 188, 58, 3.5, 3.5, INK, 1);
    poly(c, [[160, 50], [150, 28], [172, 42]], '#d4b050', 2.5); poly(c, [[200, 50], [210, 28], [194, 42]], '#d4b050', 2.5);
    poly(c, [[60, 130], [30, 60], [64, 40], [110, 90], [118, 132]], '#ddd0a8', 3.5); for (let i = 0; i < 5; i++) line(c, 62 + i * 10, 130, 44 + i * 10, 62 + i * 3, 1.6);
    [[56, 176], [92, 176], [128, 176], [160, 176]].forEach(([x, y]) => line(c, x, y, x, 192, 9, '#cdbb90')); } };
  PR.lion = { w: 224, h: 144, H: 1.8, d(c) { ell(c, 100, 84, 62, 32, '#d4b050', 3.5); ell(c, 160, 60, 34, 34, '#a8782e', 3.5); ell(c, 170, 62, 20, 20, '#d4b050', 3); ell(c, 177, 58, 3, 3, INK, 1); [[56, 104], [84, 106], [116, 106], [140, 104]].forEach(([x, y]) => line(c, x, y, x, 130, 10, '#d4b050')); curve(c, [[40, 80], [14, 60], [22, 38], [34, 46]], 6, '#d4b050'); curve(c, [[40, 80], [14, 60], [22, 38], [34, 46]], 1.5); } };
  PR.donkey = { w: 192, h: 160, H: 1.5, d(c) { ell(c, 96, 78, 56, 30, '#9a8a72', 3.5); poly(c, [[136, 60], [160, 22], [180, 34], [168, 74]], '#9a8a72', 3.5); poly(c, [[156, 26], [160, 4], [170, 28]], '#8a7a62', 2.5); ell(c, 174, 36, 3, 3, INK, 1); [[56, 100], [76, 104], [118, 104], [138, 100]].forEach(([x, y]) => { line(c, x, y, x, 148, 8, '#9a8a72'); }); curve(c, [[40, 70], [18, 90], [24, 118]], 5, '#7a6a52'); rect(c, 66, 42, 50, 34, '#a8433a', 3); rect(c, 66, 76, 50, 8, '#3a342c', 2); } };
  PR.pedestal = { w: 96, h: 112, H: 1.3, d(c) { poly(c, [[14, 104], [22, 30], [74, 30], [82, 104]], '#c4b592', 3.5); rect(c, 10, 20, 76, 16, '#d4c8a4', 3.5); hatchPoly(c, [[50, 32], [82, 104], [44, 104]], 6, .8, .3); } };
  PR.tabletshelf = { w: 192, h: 192, H: 2.7, d(c) { rect(c, 10, 8, 172, 176, '#8a6c46', 3.5); for (let r = 0; r < 3; r++) { const y = 20 + r * 56; line(c, 10, y + 40, 182, y + 40, 4); for (let i = 0; i < 6; i++) poly(c, [[22 + i * 27, y + 38], [20 + i * 27, y + 10], [44 + i * 27, y + 8], [46 + i * 27, y + 38]], '#c79a62', 2.5); } } };
  PR.cloud = { w: 256, h: 96, H: 16, d(c) { [[50, 60, 34], [92, 44, 40], [140, 50, 42], [188, 62, 32], [120, 70, 36]].forEach(([x, y, r]) => ell(c, x, y, r, r * .7, '#f4eddc', 3)); } };
  PR.boat = { w: 320, h: 160, H: 3.2, d(c) { poly(c, [[10, 90], [310, 90], [270, 140], [50, 140]], '#8a6c46', 4); poly(c, [[10, 90], [30, 50], [40, 90]], '#8a6c46', 3); poly(c, [[310, 90], [290, 50], [280, 90]], '#8a6c46', 3); for (let i = 0; i < 6; i++) line(c, 60 + i * 40, 92, 55 + i * 40, 138, 2); line(c, 160, 90, 160, 10, 5, '#5a4630'); poly(c, [[160, 14], [230, 30], [160, 76]], '#d7ccb0', 3); } };
  PR.window = { w: 128, h: 160, H: 2.4, d(c) { c.fillStyle = INK; c.beginPath(); c.moveTo(14, 156); c.lineTo(14, 70); c.quadraticCurveTo(64, -8, 114, 70); c.lineTo(114, 156); c.closePath(); c.fill(); c.fillStyle = '#d8c9a4'; c.beginPath(); c.moveTo(26, 148); c.lineTo(26, 74); c.quadraticCurveTo(64, 10, 102, 74); c.lineTo(102, 148); c.closePath(); c.fill(); line(c, 64, 28, 64, 148, 3); } };
  PR.table = { w: 160, h: 120, H: 1.15, d(c) { rect(c, 8, 20, 144, 22, '#a8885a', 3.5); line(c, 20, 42, 16, 112, 7, '#6b5030'); line(c, 140, 42, 144, 112, 7, '#6b5030'); line(c, 24, 28, 140, 28, 1.5); } };
  PR.stool = { w: 64, h: 64, H: .55, d(c) { rect(c, 8, 10, 48, 14, '#a8885a', 3); line(c, 14, 24, 10, 58, 5); line(c, 50, 24, 54, 58, 5); } };
  PR.bed = { w: 192, h: 112, H: 1.2, d(c) { rect(c, 8, 50, 176, 50, '#8a6c46', 3.5); rect(c, 14, 28, 164, 30, '#e9e2d0', 3); rect(c, 14, 28, 44, 24, '#f6f0e0', 2.5); hatchPoly(c, [[70, 30], [176, 30], [176, 58], [70, 58]], 8, .6, .3); } };
  PR.skull = { w: 64, h: 64, H: .6, d(c) { ell(c, 32, 28, 22, 20, '#efe6d0', 3); rect(c, 22, 44, 20, 12, '#efe6d0', 3); ell(c, 24, 28, 5, 6, INK, 1); ell(c, 40, 28, 5, 6, INK, 1); } };
  PR.pazuzu = { w: 192, h: 288, H: 3.4, d(c) { rect(c, 40, 262, 112, 20, '#4a443a', 3.5); poly(c, [[70, 262], [64, 120], [128, 120], [122, 262]], '#5a5246', 3.5); ell(c, 96, 90, 38, 40, '#5a5246', 3.5); poly(c, [[60, 80], [30, 30], [76, 64]], '#4a443a', 3); poly(c, [[132, 80], [162, 30], [116, 64]], '#4a443a', 3); ell(c, 84, 90, 6, 6, '#e8d9a0', 2); ell(c, 108, 90, 6, 6, '#e8d9a0', 2); rect(c, 80, 112, 32, 16, '#3a352d', 2.5); poly(c, [[64, 140], [10, 110], [14, 190], [66, 200]], '#4a443a', 3.5); poly(c, [[128, 140], [182, 110], [178, 190], [126, 200]], '#4a443a', 3.5); } };
  function propTex(key) { return memo('p:' + key, () => { const P = PR[key]; seed(hash(key)); const c = mk(P.w, P.h); P.d(c.getContext('2d')); return { tex: texOf(c), aspect: P.w / P.h, H: P.H, pad: 0 }; }); }
  function pickTex(type) { return memo('k:' + type, () => { const c = mk(96, 96), x = c.getContext('2d'); seed(hash(type)); (ICONS[type] || ICONS.coin)(x, 48, 50, 32); return { tex: texOf(c), aspect: 1, pad: 0 }; }); }

  /* ---------- crowd atlas: 8 paper people ---------- */
  function crowdAtlas() {
    return memo('crowd', () => {
      const W = 96, H = 160, c = mk(W * 8, H), x = c.getContext('2d'); seed(88);
      const cols = ['#b5a27c', '#9a7a62', '#e3dccb', '#a8895a', '#76805a', '#c9bea4', '#8a7a58', '#b8643a'];
      for (let i = 0; i < 8; i++) {
        x.save(); x.translate(i * W, 0);
        const body = cols[i], kid = i === 4, ox = 48, top = kid ? 70 : 44, bh = kid ? 48 : 70;
        ell(x, ox, top + 6, 20, 20, '#efe6d0', 4); x.strokeStyle = INK; x.lineWidth = 3.5; x.beginPath(); x.arc(ox + 5, top + 6, 8, 2.6, 5.7); x.stroke();
        poly(x, [[ox - 18, top + 28], [ox + 18, top + 28], [ox + 24, top + 28 + bh + 24], [ox - 24, top + 28 + bh + 24]], body, 4);
        rect(x, ox - 14, top + 56, 28, 6, '#5a4630', 2.5);
        line(x, ox - 20, top + 36, ox - 28, top + 74, 6, body); line(x, ox + 20, top + 36, ox + 28, top + 74, 6, body); ell(x, ox - 29, top + 78, 6, 6, '#efe6d0', 3); ell(x, ox + 29, top + 78, 6, 6, '#efe6d0', 3);
        if (i === 0) { poly(x, [[ox - 12, top - 8], [ox + 12, top - 8], [ox + 15, top - 40], [ox - 15, top - 40]], '#b4825a', 3.5); }
        if (i === 1) { rect(x, ox + 20, top + 60, 28, 22, '#b99a62', 3); }
        if (i === 2) { line(x, ox + 30, top - 10, ox + 30, top + 130, 5, '#6b5030'); }
        if (i === 3) { ell(x, ox - 4, top + 52, 26, 22, '#9a7a52', 3.5); }
        if (i === 5) { poly(x, [[ox - 24, top - 6], [ox + 24, top - 6], [ox + 28, top + 52], [ox - 28, top + 52]], '#2a211a', 3); ell(x, ox, top + 6, 19, 19, '#efe6d0', 3.5); x.beginPath(); x.arc(ox + 5, top + 6, 8, 2.6, 5.7); x.stroke(); }
        if (i === 6) { ell(x, ox, top - 10, 24, 12, '#d9d0b8', 3.5); }
        if (i === 7) { poly(x, [[ox - 20, top - 6], [ox + 20, top - 6], [ox + 12, top - 24], [ox - 12, top - 24]], '#8a8a8a', 3); line(x, ox + 34, top - 20, ox + 34, top + 140, 5, '#5a4630'); poly(x, [[ox + 34, top - 38], [ox + 28, top - 14], [ox + 40, top - 14]], '#d8d6cc', 2.5); }
        x.restore();
      }
      return texOf(c);
    });
  }

  /* ---------- 3D surface textures ---------- */
  function stain(x, n, a, w, h, col) { for (let i = 0; i < n; i++) { x.fillStyle = col.replace('A', (a * (.4 + rnd() * .6)).toFixed(3)); const r = ri(10, 40); x.beginPath(); x.ellipse(rnd() * w, rnd() * h, r, r * ri(.5, 1), rnd() * 3, 0, 6.3); x.fill(); } }
  function grain(x, w, h, n = 700, a = .06) { for (let i = 0; i < n; i++) { x.fillStyle = `rgba(30,22,10,${rnd() * a})`; x.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2); } }
  function brickCanvas(base, rows, cols, lineA = .8) {
    const c = mk(256, 256), x = c.getContext('2d'); x.fillStyle = base; x.fillRect(0, 0, 256, 256);
    stain(x, 26, .1, 256, 256, 'rgba(70,50,25,A)'); stain(x, 14, .08, 256, 256, 'rgba(255,248,225,A)'); grain(x, 256, 256);
    const bh = 256 / rows, bw = 256 / cols; x.strokeStyle = `rgba(20,17,14,${lineA})`; x.lineWidth = 3; x.lineCap = 'round';
    for (let r = 0; r < rows; r++) { const off = (r % 2) * bw / 2; for (let i = -1; i < cols + 1; i++) { const X = i * bw + off, Y = r * bh; x.beginPath(); x.moveTo(X + jit(1.5), Y + jit(1.5)); x.lineTo(X + bw + jit(1.5), Y + jit(1.5)); x.stroke(); x.beginPath(); x.moveTo(X + jit(1.5), Y + jit(1.5)); x.lineTo(X + jit(1.5), Y + bh + jit(1.5)); x.stroke(); if (rnd() < .5) { x.globalAlpha = .25; x.lineWidth = 1.4; for (let k = 0; k < 3; k++) { x.beginPath(); x.moveTo(X + 8 + k * 5, Y + bh - 5); x.lineTo(X + 16 + k * 5, Y + 5); x.stroke(); } x.globalAlpha = 1; x.lineWidth = 3; } } }
    return c;
  }
  function lion(x, px, py, s, dir, col) { x.save(); x.translate(px, py); x.scale(dir * s, s); ell(x, 0, 0, 28, 13, col, 2.4); ell(x, 28, -10, 11, 11, '#a8782e', 2.2); ell(x, 31, -8, 7, 7, col, 2); [[-16, 8], [-6, 10], [10, 10], [18, 8]].forEach(([a, b]) => line(x, a, b, a, b + 13, 3, col)); curve(x, [[-28, -2], [-40, -14], [-34, -24]], 3, col); x.restore(); }
  const SURF = {
    mud: () => brickCanvas('#cdbb98', 6, 3), mudDark: () => brickCanvas('#a8946f', 6, 3), stone: () => brickCanvas('#c4b79c', 4, 2), temple: () => brickCanvas('#a89570', 5, 3, .85),
    zig: () => { const c = brickCanvas('#c9b48c', 4, 2), x = c.getContext('2d'); x.fillStyle = 'rgba(80,50,30,.25)'; x.fillRect(0, 100, 256, 18); x.fillRect(0, 228, 256, 14); return c; },
    plaster() { const c = mk(256, 256), x = c.getContext('2d'); x.fillStyle = '#d6c8a6'; x.fillRect(0, 0, 256, 256); stain(x, 24, .1, 256, 256, 'rgba(90,65,35,A)'); grain(x, 256, 256, 900); x.fillStyle = 'rgba(46,93,133,.55)'; x.fillRect(0, 196, 256, 22); x.fillStyle = 'rgba(20,17,14,.8)'; x.fillRect(0, 194, 256, 3); x.fillRect(0, 217, 256, 3); for (let i = 0; i < 8; i++) { ell(x, 16 + i * 32, 207, 7, 7, '#efe6d0', 2); } return c; },
    blue() {
      const c = brickCanvas('#2e5d85', 8, 4, .8), x = c.getContext('2d'); seed(77); x.fillStyle = 'rgba(255,255,255,.1)'; for (let i = 0; i < 40; i++) x.fillRect(rnd() * 256, rnd() * 256, ri(6, 24), 3);
      const bull = (px, py, s, dir) => { x.save(); x.translate(px, py); x.scale(dir * s, s); ell(x, 0, 0, 26, 13, '#e8dcb8', 2.4); poly(x, [[22, -6], [32, -22], [42, -18], [38, -2]], '#e8dcb8', 2.4); poly(x, [[34, -20], [36, -32], [40, -20]], OCHRE, 2); [[-14, 8], [-4, 10], [10, 10], [18, 8]].forEach(([a, b]) => line(x, a, b, a, b + 14, 3, '#e8dcb8')); curve(x, [[-26, -2], [-38, 4], [-34, 18]], 3, '#e8dcb8'); x.restore(); };
      x.fillStyle = 'rgba(15,35,55,.55)'; x.fillRect(0, 70, 256, 36); x.fillRect(0, 170, 256, 36); bull(64, 88, .9, 1); bull(190, 88, .9, 1); bull(70, 188, .85, -1); bull(194, 188, .85, -1);
      x.strokeStyle = 'rgba(232,220,184,.8)'; x.lineWidth = 3; for (let i = 0; i < 8; i++) { x.beginPath(); x.arc(16 + i * 32, 130, 8, 0, 6.3); x.stroke(); } return c;
    },
    lionwall() { const c = mk(256, 256), x = c.getContext('2d'); seed(33); x.fillStyle = '#2e5d85'; x.fillRect(0, 0, 256, 256); stain(x, 18, .12, 256, 256, 'rgba(255,255,255,A)'); grain(x, 256, 256); x.fillStyle = '#c9a85a'; x.fillRect(0, 0, 256, 20); x.fillRect(0, 236, 256, 20); x.fillStyle = '#e8dcb8'; x.fillRect(0, 22, 256, 6); x.fillRect(0, 228, 256, 6); x.strokeStyle = INK; x.lineWidth = 3; for (let i = 0; i <= 256; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 20); x.stroke(); } lion(x, 70, 130, 1.5, 1, '#e0c070'); lion(x, 200, 130, 1.5, 1, '#e0c070'); return c; },
    wood() { const c = mk(256, 256), x = c.getContext('2d'); x.fillStyle = '#8a6c46'; x.fillRect(0, 0, 256, 256); seed(5); for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#977a52' : '#7d6140'; x.fillRect(i * 32, 0, 32, 256); line(x, i * 32 + 1, 0, i * 32 + 1, 256, 3); for (let k = 0; k < 6; k++) line(x, i * 32 + ri(6, 26), ri(0, 240), i * 32 + ri(6, 26), ri(0, 256), 1.2); } grain(x, 256, 256); return c; },
    ceiling() { const c = mk(256, 256), x = c.getContext('2d'); x.fillStyle = '#4a3a2a'; x.fillRect(0, 0, 256, 256); seed(6); for (let i = 0; i < 4; i++) { x.fillStyle = '#5e4a34'; x.fillRect(0, i * 64 + 6, 256, 20); line(x, 0, i * 64 + 6, 256, i * 64 + 6, 3); line(x, 0, i * 64 + 26, 256, i * 64 + 26, 3); } for (let i = 0; i < 4; i++) line(x, i * 64, 0, i * 64, 256, 4); grain(x, 256, 256, 500); return c; },
    tile() { const c = mk(256, 256), x = c.getContext('2d'); seed(9); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? '#b09a70' : '#9c8662'; x.fillRect(j * 64, i * 64, 64, 64); } stain(x, 22, .12, 256, 256, 'rgba(40,25,10,A)'); grain(x, 256, 256, 800); x.strokeStyle = 'rgba(20,17,14,.75)'; x.lineWidth = 3; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * 64, 0); x.lineTo(i * 64, 256); x.stroke(); x.beginPath(); x.moveTo(0, i * 64); x.lineTo(256, i * 64); x.stroke(); } for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const cx = 64 + j * 128, cy = 64 + i * 128; ell(x, cx, cy, 16, 16, null, 2); for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; line(x, cx + Math.cos(a) * 6, cy + Math.sin(a) * 6, cx + Math.cos(a) * 15, cy + Math.sin(a) * 15, 1.6); } } return c; },
    floorHouse() { const c = mk(256, 256), x = c.getContext('2d'); seed(12); x.fillStyle = '#8f7a52'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#9a8458' : '#86714c'; x.fillRect(0, i * 32, 256, 32); line(x, 0, i * 32, 256, i * 32, 2.6); for (let k = 0; k < 6; k++) { const px = ri(0, 256); line(x, px, i * 32, px - 8, i * 32 + 32, 1.2); } } grain(x, 256, 256); return c; },
    carpet() { const c = mk(256, 256), x = c.getContext('2d'); x.fillStyle = '#7a3a2c'; x.fillRect(0, 0, 256, 256); seed(16); x.strokeStyle = '#d6b060'; x.lineWidth = 6; x.strokeRect(14, 14, 228, 228); x.lineWidth = 3; x.strokeStyle = '#e8dcb8'; x.strokeRect(30, 30, 196, 196); for (let i = 0; i < 4; i++) { const cx = 128, cy = 40 + i * 56; poly(x, [[cx, cy - 18], [cx + 18, cy], [cx, cy + 18], [cx - 18, cy]], '#d6b060', 3); } grain(x, 256, 256, 600); return c; },
    sand() {
      const c = mk(512, 512), x = c.getContext('2d'); seed(31); x.fillStyle = SAND; x.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(170,140,90,${.06 + rnd() * .08})`; const r = ri(18, 60); x.beginPath(); x.ellipse(40 + rnd() * 432, 40 + rnd() * 432, r, r * ri(.4, 1), rnd() * 3, 0, 6.3); x.fill(); }
      for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(255,248,225,${.08 + rnd() * .1})`; const r = ri(12, 40); x.beginPath(); x.ellipse(40 + rnd() * 432, 40 + rnd() * 432, r, r * ri(.4, 1), rnd() * 3, 0, 6.3); x.fill(); }
      grain(x, 512, 512, 2500, .1); x.strokeStyle = INK; x.lineCap = 'round';
      for (let i = 0; i < 70; i++) { const px = ri(20, 480), py = ri(20, 480), n = 2 + ((rnd() * 3) | 0); x.globalAlpha = ri(.25, .5); x.lineWidth = 1.6; for (let k = 0; k < n; k++) { x.beginPath(); x.moveTo(px + k * 5, py); x.lineTo(px + k * 5 + 7, py - 9); x.stroke(); } }
      x.globalAlpha = .28; for (let i = 0; i < 10; i++) { const py = ri(30, 480), px = ri(20, 300); x.lineWidth = 2; x.beginPath(); x.moveTo(px, py); x.bezierCurveTo(px + 40, py - 8, px + 80, py + 8, px + 120, py - 4); x.stroke(); } return c;
    },
    road() { const c = mk(256, 256), x = c.getContext('2d'); seed(8); x.fillStyle = '#c4a97c'; x.fillRect(0, 0, 256, 256); stain(x, 18, .1, 256, 256, 'rgba(70,45,20,A)'); grain(x, 256, 256, 900); x.strokeStyle = 'rgba(20,17,14,.7)'; x.lineWidth = 3; for (let r = 0; r < 4; r++) { const off = (r % 2) * 32; for (let i = -1; i < 4; i++) x.strokeRect(i * 64 + off + jit(1), r * 64 + jit(1), 64, 64); } x.fillStyle = 'rgba(46,93,133,.6)'; x.fillRect(0, 0, 12, 256); x.fillRect(244, 0, 12, 256); return c; },
    cobble() { const c = mk(256, 256), x = c.getContext('2d'); seed(18); x.fillStyle = '#c8b994'; x.fillRect(0, 0, 256, 256); stain(x, 16, .1, 256, 256, 'rgba(90,70,40,A)'); grain(x, 256, 256, 1400); x.globalAlpha = .28; for (let i = 0; i < 60; i++) { ell(x, ri(10, 246), ri(10, 246), ri(9, 16), ri(6, 10), null, 1.6); } x.globalAlpha = 1; return c; },
    water() { const c = mk(256, 256), x = c.getContext('2d'); seed(14); x.fillStyle = '#6f929a'; x.fillRect(0, 0, 256, 256); stain(x, 14, .12, 256, 256, 'rgba(255,255,255,A)'); x.strokeStyle = 'rgba(20,17,14,.5)'; x.lineWidth = 2; for (let i = 0; i < 26; i++) { const px = ri(10, 220), py = ri(10, 250); x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + 14, py - 8, px + 28, py); x.quadraticCurveTo(px + 42, py + 8, px + 56, py); x.stroke(); } return c; },
    door() { const c = mk(128, 192), x = c.getContext('2d'); seed(3); x.fillStyle = '#6e5232'; x.beginPath(); x.moveTo(14, 192); x.lineTo(14, 70); x.quadraticCurveTo(64, -10, 114, 70); x.lineTo(114, 192); x.closePath(); x.fill(); x.strokeStyle = INK; x.lineWidth = 6; x.stroke(); for (let i = 1; i < 4; i++) line(x, 14 + i * 25, 60 + (i % 2) * 6, 14 + i * 25, 190, 2.5); line(x, 14, 110, 114, 110, 4); line(x, 14, 156, 114, 156, 4); ell(x, 92, 118, 6, 6, OCHRE, 2.5); x.strokeStyle = INK; x.lineWidth = 9; x.beginPath(); x.moveTo(4, 192); x.lineTo(4, 70); x.quadraticCurveTo(64, -22, 124, 70); x.lineTo(124, 192); x.stroke(); return c; },
    curtain() { const c = mk(128, 192), x = c.getContext('2d'); seed(3); x.fillStyle = '#5a4430'; x.fillRect(10, 10, 108, 182); x.strokeStyle = INK; x.lineWidth = 6; x.strokeRect(10, 10, 108, 182); for (let i = 1; i < 4; i++) line(x, 10 + i * 27, 10, 10 + i * 27, 190, 3); return c; },
    awning() { const c = mk(256, 128), x = c.getContext('2d'); const cs = ['#a8433a', '#e3dccb', '#2e5d85', '#e3dccb']; for (let i = 0; i < 8; i++) { x.fillStyle = cs[i % cs.length]; x.fillRect(i * 32, 0, 32, 128); } x.strokeStyle = INK; x.lineWidth = 3; for (let i = 0; i <= 8; i++) { x.beginPath(); x.moveTo(i * 32, 0); x.lineTo(i * 32, 128); x.stroke(); } x.strokeRect(0, 0, 256, 128); grain(x, 256, 128, 400); return c; },
    sky() { const c = mk(16, 256), x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#a9b0a0'); g.addColorStop(.55, '#dcd6bc'); g.addColorStop(1, '#efe0b8'); x.fillStyle = g; x.fillRect(0, 0, 16, 256); return c; },
    skyDark() { const c = mk(16, 256), x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#0c0a08'); g.addColorStop(1, '#1d1710'); x.fillStyle = g; x.fillRect(0, 0, 16, 256); return c; },
    skyDusk() { const c = mk(16, 256), x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#3a3a40'); g.addColorStop(.5, '#8a7a68'); g.addColorStop(1, '#d9a86a'); x.fillStyle = g; x.fillRect(0, 0, 16, 256); return c; }
  };
  const surfBase = {};
  function surf(key, rx = 1, ry = 1) { const rk = key + '|' + (Math.round(rx * 4) / 4) + '|' + (Math.round(ry * 4) / 4); return memo('s:' + rk, () => { const base = surfBase[key] || (surfBase[key] = (seed(hash(key)), SURF[key]())); const t = new THREE.CanvasTexture(base); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 4; return t; }); }
  const skyTexture = k => memo('sky' + k, () => new THREE.CanvasTexture(SURF[k === true ? 'skyDark' : k === false || !k ? 'sky' : k]()));
  const plainCanvasTex = key => memo('pc:' + key, () => { seed(hash(key)); const t = new THREE.CanvasTexture(SURF[key]()); t.anisotropy = 4; return t; });

  /* ---------- FX sprites ---------- */
  function fxTex(key) {
    return memo('f:' + key, () => {
      const c = mk(128, 128), x = c.getContext('2d'); seed(hash(key));
      if (key === 'glow') { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,238,190,1)'); g.addColorStop(.4, 'rgba(255,196,110,.5)'); g.addColorStop(1, 'rgba(255,170,60,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }
      else if (key === 'shadow') { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(20,16,10,.55)'); g.addColorStop(.7, 'rgba(20,16,10,.3)'); g.addColorStop(1, 'rgba(20,16,10,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }
      else if (key === 'splat') { x.fillStyle = INK; x.beginPath(); x.arc(64, 64, 18, 0, 6.3); x.fill(); for (let i = 0; i < 12; i++) { const a = rnd() * 6.28, d = ri(20, 46); x.beginPath(); x.arc(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, ri(3, 11), 0, 6.3); x.fill(); x.lineWidth = ri(3, 8); x.strokeStyle = INK; x.beginPath(); x.moveTo(64, 64); x.lineTo(64 + Math.cos(a) * d, 64 + Math.sin(a) * d); x.stroke(); } }
      else if (key === 'slash') { x.strokeStyle = '#fff'; x.lineCap = 'round'; x.lineWidth = 12; x.beginPath(); x.arc(30, 64, 60, -1, 1); x.stroke(); x.strokeStyle = INK; x.lineWidth = 3; x.beginPath(); x.arc(30, 64, 66, -1, 1); x.stroke(); x.beginPath(); x.arc(30, 64, 54, -.9, .9); x.stroke(); }
      else if (key === 'puff') { x.fillStyle = 'rgba(230,215,180,.9)'; [[64, 70, 30], [44, 80, 22], [84, 80, 24], [60, 50, 22]].forEach(([a, b, r]) => { x.beginPath(); x.arc(a, b, r, 0, 6.3); x.fill(); x.strokeStyle = INK; x.lineWidth = 3; x.stroke(); }); }
      else if (key === 'paper') { x.fillStyle = '#efe6d0'; x.strokeStyle = INK; x.lineWidth = 6; x.beginPath(); x.moveTo(20, 30); x.lineTo(100, 20); x.lineTo(110, 90); x.lineTo(30, 100); x.closePath(); x.fill(); x.stroke(); }
      else if (key === 'ink') { x.fillStyle = 'rgba(25,22,20,.92)'; for (let i = 0; i < 9; i++) { x.beginPath(); x.arc(64 + ri(-26, 26), 64 + ri(-26, 26), ri(18, 34), 0, 6.3); x.fill(); } }
      else if (key === 'smoke') { for (let i = 0; i < 14; i++) { x.fillStyle = `rgba(200,190,170,${ri(.25, .5)})`; x.beginPath(); x.arc(64 + ri(-30, 30), 64 + ri(-30, 30), ri(14, 30), 0, 6.3); x.fill(); } }
      else if (key === 'excl' || key === 'ques') { x.font = 'bold 110px "IM Fell English SC", Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 12; x.strokeStyle = INK; const ch = key === 'excl' ? '!' : '?'; x.strokeText(ch, 64, 70); x.fillStyle = '#fff'; x.fillText(ch, 64, 70); }
      else if (key === 'beacon') { poly(x, [[64, 124], [20, 60], [64, 6], [108, 60]], '#e0b858', 5); line(x, 64, 20, 64, 100, 3); line(x, 36, 60, 92, 60, 3); }
      else if (key === 'eyeico') { ICONS.eye(x, 64, 64, 50); }
      else if (key === 'speech') { poly(x, [[14, 20], [114, 20], [114, 86], [70, 86], [52, 112], [54, 86], [14, 86]], '#efe6d0', 6); [40, 64, 88].forEach(px => { x.fillStyle = INK; x.beginPath(); x.arc(px, 53, 6, 0, 6.3); x.fill(); }); }
      return texOf(c);
    });
  }

  return { INK, PAPER, RED, BLUE, OCHRE, SAND, propTex, pickTex, surf, skyTexture, plainCanvasTex, fxTex, iconURL, ICONS, mk, texOf, seed, hash, PR, poly, line, ell, rect, curve, hatchPoly, rnd, crowdAtlas };
})();
