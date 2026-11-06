/* ============================================================
   INK OF BABYLON — art.js
   Everything you see is drawn at runtime onto <canvas> with
   wobbly ink lines, then wrapped onto paper cut-outs / 3D walls.
   ============================================================ */
const ART = (function () {
  'use strict';
  const INK = '#1c1a17', PAPER = '#f5edd8';
  const RED = '#b5412e', BLUE = '#2f6c9c', OCHRE = '#d9a441', OLIVE = '#7d9a52', SAND = '#e3cf9d', CLOAK = '#3f5d86';

  /* ---------- seeded random so art is stable between loads ---------- */
  let _s = 1;
  function rnd() { _s = (_s + 0x6D2B79F5) | 0; let t = Math.imul(_s ^ (_s >>> 15), 1 | _s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  function seed(n) { _s = n | 0; }
  function hash(str) { let h = 7; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return h; }
  const jit = a => (rnd() - .5) * 2 * a;
  const ri = (a, b) => a + rnd() * (b - a);

  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function texOf(c, repeat) {
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }
  const cache = {};
  const memo = (k, f) => cache[k] || (cache[k] = f());

  /* ---------- ink primitives ---------- */
  function line(c, x1, y1, x2, y2, w = 3, col = INK) {
    c.strokeStyle = col; c.lineCap = 'round';
    for (let k = 0; k < 2; k++) {
      c.beginPath(); c.moveTo(x1 + jit(1.2), y1 + jit(1.2));
      c.quadraticCurveTo((x1 + x2) / 2 + jit(2.4), (y1 + y2) / 2 + jit(2.4), x2 + jit(1.2), y2 + jit(1.2));
      c.lineWidth = k ? w * .4 : w; c.stroke();
    }
  }
  function poly(c, pts, fill, w = 3) {
    c.beginPath();
    pts.forEach(([x, y], i) => { const px = x + jit(1.1), py = y + jit(1.1); i ? c.lineTo(px, py) : c.moveTo(px, py); });
    c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); }
    c.strokeStyle = INK; c.lineWidth = w; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke();
  }
  function rect(c, x, y, w, h, fill, lw = 3) { poly(c, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], fill, lw); }
  function ell(c, cx, cy, rx, ry, fill, lw = 3, a0 = 0, a1 = Math.PI * 2) {
    c.beginPath();
    const n = 28;
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; const px = cx + Math.cos(a) * rx + jit(.7), py = cy + Math.sin(a) * ry + jit(.7); i ? c.lineTo(px, py) : c.moveTo(px, py); }
    if (fill) { c.closePath(); c.fillStyle = fill; c.fill(); }
    c.strokeStyle = INK; c.lineWidth = lw; c.lineCap = 'round'; c.stroke();
  }
  function curve(c, pts, w = 3, col = INK) {
    c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; c.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); }
    const l = pts[pts.length - 1]; c.lineTo(l[0], l[1]); c.stroke();
  }
  function hatchPoly(c, pts, gap = 7, ang = .8, alpha = .45, w = 1.6) {
    c.save(); c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.clip();
    let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9; pts.forEach(([x, y]) => { minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); });
    c.strokeStyle = INK; c.globalAlpha = alpha; c.lineWidth = w;
    const R = Math.hypot(maxx - minx, maxy - miny);
    const cx = (minx + maxx) / 2, cy = (miny + maxy) / 2;
    for (let d = -R; d < R; d += gap) {
      const ox = Math.cos(ang + 1.57) * d, oy = Math.sin(ang + 1.57) * d;
      c.beginPath(); c.moveTo(cx + ox - Math.cos(ang) * R, cy + oy - Math.sin(ang) * R); c.lineTo(cx + ox + Math.cos(ang) * R, cy + oy + Math.sin(ang) * R); c.stroke();
    }
    c.restore();
  }

  /* ---------- paper cut-out: white border + ink outline + thickness ---------- */
  function cutout(src, b = 7) {
    const w = src.width + b * 2, h = src.height + b * 2;
    const out = mk(w, h), o = out.getContext('2d');
    const tint = col => { const t = mk(src.width, src.height), x = t.getContext('2d'); x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, t.width, t.height); return t; };
    const inkS = tint(INK), papS = tint(PAPER), shadeS = tint('#cdbf9f');
    const ring = (img, r, n, dx = 0, dy = 0) => { for (let a = 0; a < n; a++) { const an = a / n * Math.PI * 2; o.drawImage(img, b + dx + Math.cos(an) * r, b + dy + Math.sin(an) * r); } };
    ring(inkS, b + 1.5, 28);            // thin ink edge
    ring(shadeS, b - 1, 24, 1.5, 2.5);  // paper thickness
    ring(papS, b - 1, 24);              // white paper margin
    o.drawImage(src, b, b);
    return out;
  }

  /* ================= ICONS (stats / cards) ================= */
  const ICONS = {
    heart(c, x, y, s, col = RED) { c.beginPath(); c.moveTo(x, y + s * .75); c.bezierCurveTo(x - s * 1.2, y - s * .1, x - s * .55, y - s * .95, x, y - s * .35); c.bezierCurveTo(x + s * .55, y - s * .95, x + s * 1.2, y - s * .1, x, y + s * .75); c.fillStyle = col; c.fill(); c.strokeStyle = INK; c.lineWidth = s * .13; c.stroke(); },
    smile(c, x, y, s) { ell(c, x, y, s, s, '#f6e7a9', s * .12); ell(c, x - s * .35, y - s * .2, s * .09, s * .13, INK, 1); ell(c, x + s * .35, y - s * .2, s * .09, s * .13, INK, 1); ell(c, x, y + s * .1, s * .5, s * .38, null, s * .11, .25, 2.9); },
    sword(c, x, y, s) { poly(c, [[x, y - s], [x + s * .17, y + s * .25], [x - s * .17, y + s * .25]], '#dfe3e6', s * .1); line(c, x - s * .5, y + s * .3, x + s * .5, y + s * .3, s * .17); line(c, x, y + s * .3, x, y + s * .85, s * .2); },
    clover(c, x, y, s) { const r = s * .42; [[-.42, 0], [.42, 0], [0, -.5], [0, .38]].forEach(([dx, dy]) => ell(c, x + dx * s, y + dy * s, r, r, '#8fb067', s * .1)); line(c, x, y + s * .5, x + s * .25, y + s * 1, s * .12); },
    eye(c, x, y, s) { c.beginPath(); c.moveTo(x - s, y); c.quadraticCurveTo(x, y - s * .95, x + s, y); c.quadraticCurveTo(x, y + s * .95, x - s, y); c.fillStyle = '#fbf6e6'; c.fill(); c.strokeStyle = INK; c.lineWidth = s * .12; c.stroke(); ell(c, x, y, s * .33, s * .33, '#6e8fa6', s * .09); ell(c, x, y, s * .13, s * .13, INK, 1); },
    coin(c, x, y, s) { ell(c, x, y, s, s * .75, OCHRE, s * .12); ell(c, x, y, s * .6, s * .42, null, s * .07); line(c, x - s * .15, y - s * .15, x + s * .15, y + s * .15, s * .08); },
    sun(c, x, y, s) { line(c, x - s, y + s * .35, x + s, y + s * .35, s * .12); ell(c, x, y + s * .35, s * .55, s * .55, '#f3d27a', s * .1, Math.PI, Math.PI * 2); for (let i = 0; i < 5; i++) { const a = Math.PI + (i + .5) / 5 * Math.PI; line(c, x + Math.cos(a) * s * .75, y + .35 * s + Math.sin(a) * s * .75, x + Math.cos(a) * s * 1.05, y + .35 * s + Math.sin(a) * s * 1.05, s * .1); } },
    star(c, x, y, s) { const p = []; for (let i = 0; i < 10; i++) { const r = i % 2 ? s * .42 : s; const a = -Math.PI / 2 + i * Math.PI / 5; p.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); } poly(c, p, '#f4efe0', s * .1); },
    tablet(c, x, y, s) { poly(c, [[x - s * .8, y - s * .6], [x + s * .8, y - s * .7], [x + s * .85, y + s * .6], [x - s * .75, y + s * .7]], '#cf9a62', s * .1); for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) line(c, x - s * .5 + j * s * .3, y - s * .35 + i * s * .3, x - s * .38 + j * s * .3, y - s * .28 + i * s * .3, s * .07); },
    bomb(c, x, y, s) { ell(c, x, y + s * .15, s * .75, s * .7, '#33302b', s * .1); line(c, x + s * .3, y - s * .5, x + s * .6, y - s * .85, s * .12); ell(c, x + s * .65, y - s * .92, s * .13, s * .13, OCHRE, 1); },
    bolt(c, x, y, s) { line(c, x - s, y + s * .6, x + s * .8, y - s * .6, s * .13, '#6b5030'); poly(c, [[x + s * .65, y - s * .45], [x + s * 1.1, y - s * .85], [x + s * .9, y - s * .35]], '#cfd3d6', s * .08); },
    herb(c, x, y, s) { for (let i = -2; i <= 2; i++) { const a = -1.57 + i * .45; poly(c, [[x, y + s * .7], [x + Math.cos(a - .2) * s, y + s * .7 + Math.sin(a - .2) * s * 1.4], [x + Math.cos(a + .2) * s, y + s * .7 + Math.sin(a + .2) * s * 1.4]], OLIVE, s * .07); } },
    wine(c, x, y, s) { poly(c, [[x - s * .3, y - s * .9], [x + s * .3, y - s * .9], [x + s * .3, y - s * .35], [x + s * .6, y + s * .1], [x + s * .6, y + s * .8], [x - s * .6, y + s * .8], [x - s * .6, y + s * .1], [x - s * .3, y - s * .35]], '#7b2f3b', s * .09); }
  };
  const iconCache = {};
  function iconCanvas(name, size = 64) { const c = mk(size, size), x = c.getContext('2d'); seed(hash(name) + 3); ICONS[name](x, size / 2, size / 2, size * .36); return c; }
  function iconURL(name, size = 64) { return iconCache[name + size] || (iconCache[name + size] = iconCanvas(name, size).toDataURL()); }

  /* ================= CHARACTERS (paper standees, facing right) ================= */
  function legs(c, col = '#2c2a27') {
    rect(c, 90, 252, 20, 34, col, 3); rect(c, 120, 252, 20, 34, col, 3);
    poly(c, [[84, 286], [112, 286], [118, 295], [84, 295]], '#4a3a2c', 3); poly(c, [[116, 286], [144, 286], [150, 295], [116, 295]], '#4a3a2c', 3);
  }
  function cloak(c, col) {
    const p = [[88, 126], [140, 126], [160, 258], [68, 258]];
    poly(c, p, col, 3.5); hatchPoly(c, [[118, 130], [140, 126], [160, 258], [128, 258]], 7, .9, .35);
    line(c, 84, 196, 146, 196, 3);                                                     // belt
    rect(c, 108, 188, 16, 16, OCHRE, 2.5);                                             // buckle
  }
  function scarf(c, col) {
    poly(c, [[82, 116], [142, 116], [146, 138], [80, 138]], col, 3);
    poly(c, [[86, 128], [58, 150], [44, 196], [70, 176], [88, 146]], col, 3);
  }
  function crossbow(c, x = 150, y = 168) {
    line(c, x - 14, y, x + 56, y, 6, '#5a4630'); line(c, x + 40, y - 30, x + 40, y + 30, 4, '#5a4630');
    curve(c, [[x + 40, y - 32], [x + 58, y - 10], [x + 58, y + 10], [x + 40, y + 32]], 3); curve(c, [[x + 40, y - 30], [x + 8, y], [x + 40, y + 30]], 1.6);
    line(c, x + 4, y - 4, x + 62, y - 4, 2.6); poly(c, [[x + 60, y - 4], [x + 70, y - 8], [x + 70, y]], '#cfd3d6', 2);
    ell(c, x - 6, y + 4, 9, 9, '#f2d8b0', 2.6);                                          // hand
  }
  function heads(c, kind, cx, cy) {
    const FOX = '#d9792e', CRM = '#f6ecd6';
    switch (kind) {
      case 'hero':
        ell(c, cx, cy, 46, 46, CLOAK, 3.5); ell(c, cx + 11, cy + 3, 32, 33, '#f7f0de', 3); line(c, cx + 20, cy - 9, cx + 20, cy + 11, 5);
        hatchPoly(c, [[cx - 40, cy - 10], [cx - 10, cy - 44], [cx - 8, cy + 40], [cx - 40, cy + 20]], 6, .7, .35); break;
      case 'fox':
        poly(c, [[cx - 26, cy - 24], [cx - 14, cy - 74], [cx + 6, cy - 34]], FOX, 3); poly(c, [[cx + 4, cy - 34], [cx + 24, cy - 72], [cx + 34, cy - 20]], FOX, 3);
        ell(c, cx, cy, 40, 36, FOX, 3.5); poly(c, [[cx + 14, cy - 2], [cx + 66, cy + 14], [cx + 14, cy + 30]], CRM, 3); ell(c, cx + 66, cy + 14, 6, 5, INK, 1);
        ell(c, cx + 10, cy - 10, 4.5, 6, INK, 1); break;
      case 'rabbit':
        ell(c, cx - 14, cy - 46, 11, 28, CRM, 3); ell(c, cx + 12, cy - 49, 11, 29, CRM, 3); line(c, cx - 14, cy - 60, cx - 14, cy - 34, 2); line(c, cx + 12, cy - 64, cx + 12, cy - 36, 2);
        ell(c, cx, cy, 40, 37, CRM, 3.5); poly(c, [[cx + 32, cy + 2], [cx + 46, cy + 6], [cx + 34, cy + 14]], '#e7a3a0', 2); ell(c, cx + 14, cy - 8, 4.5, 6.5, INK, 1);
        line(c, cx + 34, cy + 10, cx + 56, cy + 4, 1.6); line(c, cx + 34, cy + 14, cx + 56, cy + 16, 1.6); break;
      case 'bird':
        curve(c, [[cx - 6, cy - 32], [cx - 18, cy - 54], [cx - 2, cy - 66]], 4); ell(c, cx - 2, cy - 70, 10, 10, CRM, 3);
        ell(c, cx, cy, 36, 33, CRM, 3.5); poly(c, [[cx + 28, cy - 6], [cx + 64, cy + 8], [cx + 28, cy + 16]], OCHRE, 3); ell(c, cx + 12, cy - 8, 4.5, 5.5, INK, 1);
        hatchPoly(c, [[cx - 30, cy], [cx - 6, cy - 28], [cx - 6, cy + 30]], 6, .6, .3); break;
      case 'dog':
        poly(c, [[cx - 38, cy - 22], [cx - 56, cy + 30], [cx - 24, cy + 18]], '#6b5036', 3);
        ell(c, cx, cy, 40, 36, '#b88a58', 3.5); poly(c, [[cx + 16, cy - 8], [cx + 66, cy + 4], [cx + 66, cy + 26], [cx + 16, cy + 30]], '#e5cfa8', 3); ell(c, cx + 66, cy + 8, 6, 5, INK, 1);
        ell(c, cx + 8, cy - 10, 4.5, 6, INK, 1); poly(c, [[cx - 6, cy - 34], [cx + 8, cy - 58], [cx + 22, cy - 30]], '#6b5036', 3); break;
    }
  }
  function agent(c, kind, col, scarfCol, prop) {
    legs(c); cloak(c, col); scarf(c, scarfCol);
    heads(c, kind, 112, 80);
    if (prop === 'scroll') { rect(c, 134, 150, 46, 26, '#efe3c4', 3); line(c, 140, 158, 172, 158, 2); line(c, 140, 166, 168, 166, 2); ell(c, 134, 164, 7, 7, '#f2d8b0', 2.5); }
    else if (prop === 'mug') { rect(c, 140, 150, 22, 26, '#a4703c', 3); curve(c, [[162, 156], [174, 160], [162, 170]], 3); ell(c, 138, 168, 8, 8, '#f2d8b0', 2.5); }
    else crossbow(c);
  }
  const CH = {
    hero(c) { legs(c); cloak(c, CLOAK); scarf(c, OCHRE); heads(c, 'hero', 112, 80); crossbow(c); rect(c, 82, 214, 10, 28, '#8a8e93', 2.5); },
    fox(c) { agent(c, 'fox', '#8a3b2a', '#e4c35a'); },
    rabbit(c) { agent(c, 'rabbit', '#5b7f4e', '#e5e0cf'); },
    bird(c) { agent(c, 'bird', '#6a4f86', '#7ec0b8'); },
    dog(c) { agent(c, 'dog', '#4a4a52', '#c0562f'); },
    scribe(c) { agent(c, 'rabbit', '#a8764a', '#efe3c4', 'scroll'); },
    keeper(c) { agent(c, 'fox', '#9a7a4a', '#efe3c4', 'mug'); rect(c, 90, 190, 50, 60, '#efe3c4', 3); },
    patron(c) { agent(c, 'dog', '#7b4a3a', '#d9a441', 'mug'); },
    spear(c) {
      line(c, 172, 22, 172, 290, 4.5, '#5a4630'); poly(c, [[172, 2], [163, 30], [181, 30]], '#cfd3d6', 3); poly(c, [[172, 36], [208, 46], [172, 60]], RED, 3);
      legs(c); poly(c, [[110, 106], [66, 262], [154, 262]], '#efe7d2', 3.5); hatchPoly(c, [[112, 110], [154, 262], [118, 262]], 7, .9, .3);
      rect(c, 104, 150, 12, 54, RED, 2.5); rect(c, 92, 162, 36, 12, RED, 2.5);
      ell(c, 110, 84, 25, 27, '#f2d8b0', 3); poly(c, [[84, 78], [110, 36], [136, 78], [124, 70], [96, 70]], '#b9bdc0', 3); line(c, 114, 74, 114, 96, 3.5); ell(c, 120, 82, 3.5, 3.5, INK, 1);
      line(c, 130, 150, 172, 168, 5, '#f2d8b0'); },
    sword(c) {
      legs(c); rect(c, 82, 118, 58, 62, '#efe7d2', 3.5); rect(c, 82, 182, 58, 62, '#efe7d2', 3.5);
      [[111, 150], [111, 212]].forEach(([x, y]) => { rect(c, x - 5, y - 20, 10, 40, RED, 2.5); rect(c, x - 16, y - 8, 32, 10, RED, 2.5); });
      ell(c, 112, 90, 26, 28, '#f2d8b0', 3); ell(c, 112, 70, 28, 22, '#b9bdc0', 3, Math.PI, Math.PI * 2); line(c, 122, 78, 122, 100, 3.5); ell(c, 108, 40, 9, 16, '#2a2825', 2.5); ell(c, 124, 90, 3.4, 3.4, INK, 1);
      ell(c, 66, 232, 27, 31, RED, 3.5); line(c, 66, 206, 66, 258, 3); line(c, 42, 232, 90, 232, 3);
      line(c, 142, 190, 196, 138, 7, '#d6dadd'); line(c, 142, 190, 196, 138, 1.5, INK); line(c, 132, 176, 154, 200, 6, '#5a4630'); ell(c, 138, 190, 8, 8, '#f2d8b0', 2.5); },
    archer(c) {
      legs(c); rect(c, 84, 124, 56, 120, '#e2d7b8', 3.5); rect(c, 108, 150, 8, 44, RED, 2.5); rect(c, 96, 164, 32, 8, RED, 2.5);
      ell(c, 112, 94, 28, 28, '#2d4f3f', 3.5); ell(c, 120, 98, 18, 19, '#f2d8b0', 3); ell(c, 126, 96, 3.2, 3.2, INK, 1);
      curve(c, [[150, 60], [186, 120], [186, 200], [150, 262]], 6, '#6b5030'); line(c, 150, 62, 150, 260, 1.8);
      line(c, 132, 160, 206, 160, 3); poly(c, [[206, 160], [190, 153], [190, 167]], '#cfd3d6', 2); line(c, 132, 160, 144, 152, 2); line(c, 132, 160, 144, 168, 2);
      ell(c, 132, 160, 8, 8, '#f2d8b0', 2.5); },
    captain(c) {
      // horse
      ell(c, 150, 200, 92, 48, '#ece0c4', 3.5); hatchPoly(c, [[100, 220], [240, 220], [230, 246], [110, 246]], 7, .7, .35);
      poly(c, [[222, 176], [270, 112], [300, 122], [262, 206]], '#ece0c4', 3.5);                                // neck
      poly(c, [[274, 108], [326, 150], [318, 166], [262, 134]], '#ece0c4', 3.5); ell(c, 306, 152, 5, 5, INK, 1); poly(c, [[276, 108], [282, 82], [292, 112]], '#ece0c4', 3);
      for (let i = 0; i < 6; i++) line(c, 250 - i * 6, 118 + i * 14, 232 - i * 6, 124 + i * 14, 4);              // mane
      [[96, 226, 92, 288], [124, 236, 124, 288], [182, 236, 184, 288], [210, 228, 218, 288]].forEach(([a, b, d, e]) => { line(c, a, b, d, e, 9, '#ece0c4'); line(c, a, b, d, e, 2.5); rect(c, d - 8, e - 4, 16, 8, '#3a2f26', 2.5); });
      curve(c, [[60, 190], [34, 200], [36, 250], [52, 270]], 7, '#3a2f26');                                       // tail
      poly(c, [[88, 168], [230, 168], [244, 252], [226, 262], [208, 250], [188, 262], [168, 250], [148, 262], [128, 250], [108, 262], [88, 250], [76, 252]], '#efe7d2', 3.5);
      rect(c, 150, 190, 12, 48, RED, 2.5); rect(c, 136, 204, 40, 12, RED, 2.5);
      // rider
      rect(c, 128, 96, 56, 40, '#d6dadd', 3.5); rect(c, 128, 132, 56, 40, '#efe7d2', 3.5); rect(c, 150, 138, 10, 28, RED, 2.5); rect(c, 140, 148, 30, 9, RED, 2.5);
      ell(c, 156, 80, 22, 24, '#b9bdc0', 3.5); line(c, 162, 76, 162, 92, 3.5); ell(c, 152, 52, 8, 14, '#2a2825', 2.5);
      ell(c, 118, 150, 22, 28, RED, 3.5); line(c, 118, 128, 118, 172, 2.5); line(c, 98, 150, 138, 150, 2.5);
      line(c, 180, 128, 260, 14, 5, '#5a4630'); poly(c, [[260, 14], [248, 20], [266, 30]], '#cfd3d6', 2.5); poly(c, [[218, 66], [248, 62], [232, 80]], RED, 2.5); }
  };
  const CH_W = { captain: 340 };
  function charTex(key) {
    return memo('c:' + key, () => {
      seed(hash(key)); const w = CH_W[key] || 225, h = 300; const c = mk(w, h);
      CH[key](c.getContext('2d'), w, h);
      const out = cutout(c, 7);
      return { tex: texOf(out), aspect: out.width / out.height, pad: 7 / out.height };
    });
  }

  /* ================= PROPS (ink sketches, no paper border) ================= */
  const PR = {};
  PR.tuft = { w: 128, h: 96, H: .75, d(c) { for (let i = -3; i <= 3; i++) { const a = -1.57 + i * .3, L = ri(44, 80); const tx = 64 + Math.cos(a) * L, ty = 92 + Math.sin(a) * L; poly(c, [[64 + i * 5 - 5, 92], [tx, ty], [64 + i * 5 + 5, 92]], i % 2 ? '#98ad62' : '#7d9a52', 2.5); } } };
  PR.bush = { w: 192, h: 128, H: 1.5, d(c) { [[40, 80, 34], [76, 62, 40], [118, 76, 38], [150, 88, 30], [96, 96, 36]].forEach(([x, y, r]) => ell(c, x, y, r, r * .9, OLIVE, 3)); for (let i = 0; i < 9; i++) { const x = ri(30, 160), y = ri(50, 110); curve(c, [[x, y], [x + 6, y - 6], [x + 12, y]], 1.6); } line(c, 20, 120, 170, 120, 3); } };
  PR.flower = { w: 64, h: 80, H: .42, d(c) { line(c, 32, 78, 32, 34, 3); const col = ['#f4efe0', '#e7a3a0', '#e9c75c'][(rnd() * 3) | 0]; for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28; ell(c, 32 + Math.cos(a) * 11, 30 + Math.sin(a) * 11, 8, 8, col, 2); } ell(c, 32, 30, 6, 6, OCHRE, 2); } };
  PR.rock = { w: 128, h: 96, H: .9, d(c) { poly(c, [[10, 90], [22, 46], [54, 24], [92, 30], [118, 60], [122, 90]], '#c3b49a', 3.5); hatchPoly(c, [[70, 30], [118, 60], [122, 90], [60, 90]], 6, .8, .4); line(c, 38, 60, 52, 70, 2); } };
  PR.palm = { w: 256, h: 400, H: 7.5, d(c) {
    poly(c, [[118, 392], [138, 392], [150, 150], [134, 150]], '#b58e5c', 3.5);
    for (let y = 170; y < 390; y += 20) line(c, 119 + (390 - y) * -.03, y, 142 + (390 - y) * -.03 + 4, y + 4, 2);
    const cx = 142, cy = 148;
    for (let i = 0; i < 8; i++) {
      const a = Math.PI + i / 7 * Math.PI, L = 105 + (i % 2) * 14; const ex = cx + Math.cos(a) * L, ey = cy + Math.sin(a) * L * .55 + 38;
      const mx = cx + Math.cos(a) * L * .55, my = cy + Math.sin(a) * L * .85 - 16;
      c.beginPath(); c.moveTo(cx, cy); c.quadraticCurveTo(mx, my - 14, ex, ey); c.quadraticCurveTo(mx, my + 14, cx, cy); c.fillStyle = i % 2 ? '#6f8f45' : OLIVE; c.fill(); c.strokeStyle = INK; c.lineWidth = 3; c.stroke();
      for (let k = 1; k < 7; k++) { const t = k / 7, px = (1 - t) * (1 - t) * cx + 2 * (1 - t) * t * mx + t * t * ex, py = (1 - t) * (1 - t) * cy + 2 * (1 - t) * t * (my - 2) + t * t * ey; line(c, px, py, px + (ex - cx) * .06, py + 14, 1.6); }
    }
    ell(c, 132, 160, 7, 9, '#c9772e', 2); ell(c, 146, 164, 7, 9, '#c9772e', 2); ell(c, 138, 172, 7, 9, '#c9772e', 2); } };
  PR.barrel = { w: 96, h: 112, H: 1.1, d(c) { poly(c, [[20, 20], [76, 20], [88, 60], [76, 102], [20, 102], [8, 60]], '#a4703c', 3.5); line(c, 10, 42, 86, 42, 3); line(c, 10, 80, 86, 80, 3); for (let x = 30; x < 70; x += 14) line(c, x, 22, x - 2, 100, 1.4); } };
  PR.crate = { w: 112, h: 112, H: 1.0, d(c) { rect(c, 10, 14, 92, 92, '#b88a58', 3.5); line(c, 10, 14, 102, 106, 3); line(c, 102, 14, 10, 106, 3); rect(c, 22, 26, 68, 68, null, 2); } };
  PR.jar = { w: 80, h: 112, H: 1.2, d(c) { poly(c, [[28, 10], [52, 10], [54, 28], [72, 52], [66, 92], [50, 104], [30, 104], [14, 92], [8, 52], [26, 28]], '#c47b4a', 3.5); line(c, 18, 50, 62, 50, 3); line(c, 14, 70, 66, 70, 2); hatchPoly(c, [[46, 30], [70, 54], [64, 92], [48, 102]], 6, .8, .35); } };
  PR.torch = { w: 64, h: 144, H: 2.4, d(c) { line(c, 32, 138, 32, 50, 6, '#6b5030'); poly(c, [[20, 52], [44, 52], [40, 40], [24, 40]], '#555', 3); } };
  PR.brazier = { w: 96, h: 112, H: 1.4, d(c) { poly(c, [[18, 50], [78, 50], [66, 70], [56, 104], [40, 104], [30, 70]], '#4a4640', 3.5); line(c, 20, 52, 76, 52, 4); line(c, 26, 104, 70, 104, 4); } };
  PR.banner = { w: 128, h: 320, H: 4.6, d(c) { line(c, 20, 316, 20, 8, 5, '#5a4630'); ell(c, 20, 8, 7, 7, OCHRE, 2.5); poly(c, [[24, 24], [112, 30], [112, 190], [68, 160], [24, 190]], '#efe7d2', 3.5); rect(c, 62, 56, 12, 80, RED, 2.5); rect(c, 46, 74, 44, 12, RED, 2.5); } };
  PR.bannerLong = { w: 96, h: 256, H: 4.2, d(c) { poly(c, [[10, 6], [86, 6], [86, 220], [48, 196], [10, 220]], '#e9dfc2', 3.5); rect(c, 42, 36, 12, 90, RED, 2.5); rect(c, 24, 62, 48, 12, RED, 2.5); line(c, 10, 6, 86, 6, 6, '#5a4630'); } };
  PR.stele = { w: 96, h: 176, H: 2.6, d(c) { poly(c, [[14, 170], [14, 50], [24, 20], [72, 20], [82, 50], [82, 170]], '#cdbd98', 3.5); for (let i = 0; i < 9; i++) for (let j = 0; j < 4; j++) { const x = 28 + j * 12, y = 52 + i * 12; line(c, x, y, x + 6, y + 2, 2); line(c, x + 3, y - 3, x + 3, y + 4, 1.4); } hatchPoly(c, [[56, 22], [82, 50], [82, 170], [52, 170]], 6, .8, .3); } };
  PR.statue = { w: 224, h: 224, H: 3.4, d(c) { // lamassu: winged bull
    rect(c, 22, 190, 180, 28, '#c3b49a', 3.5); ell(c, 110, 150, 72, 38, '#d1bf93', 3.5); poly(c, [[150, 130], [172, 60], [196, 70], [186, 140]], '#d1bf93', 3.5); ell(c, 182, 62, 24, 20, '#d1bf93', 3.5); ell(c, 188, 58, 3.5, 3.5, INK, 1);
    poly(c, [[160, 50], [150, 28], [172, 42]], '#e9c75c', 2.5); poly(c, [[200, 50], [210, 28], [194, 42]], '#e9c75c', 2.5);
    poly(c, [[60, 130], [30, 60], [64, 40], [110, 90], [118, 132]], '#e0d2a8', 3.5); for (let i = 0; i < 5; i++) line(c, 62 + i * 10, 130, 44 + i * 10, 62 + i * 3, 1.6);
    [[56, 176], [92, 176], [128, 176], [160, 176]].forEach(([x, y]) => line(c, x, y, x, 192, 9, '#d1bf93')); } };
  PR.tablet = { w: 96, h: 96, H: .8, d(c) { poly(c, [[10, 24], [84, 14], [88, 76], [14, 84]], '#d29a62', 3.5); for (let i = 0; i < 4; i++) for (let j = 0; j < 6; j++) { const x = 20 + j * 11, y = 30 + i * 12; line(c, x, y, x + 6, y + 1, 2); line(c, x + 3, y - 3, x + 3, y + 3, 1.4); } } };
  PR.chest = { w: 128, h: 96, H: .9, d(c) { rect(c, 10, 40, 108, 50, '#a4703c', 3.5); poly(c, [[10, 40], [20, 14], [108, 14], [118, 40]], '#b88252', 3.5); rect(c, 56, 38, 16, 22, OCHRE, 2.5); line(c, 36, 40, 36, 90, 2.5); line(c, 92, 40, 92, 90, 2.5); } };
  PR.campfire = { w: 128, h: 80, H: .8, d(c) { line(c, 20, 66, 100, 50, 10, '#6b5030'); line(c, 24, 50, 104, 68, 10, '#6b5030'); ell(c, 62, 70, 52, 12, null, 2.5); for (let i = 0; i < 7; i++) ell(c, 14 + i * 16, 74, 8, 6, '#9a948a', 2); } };
  PR.table = { w: 160, h: 120, H: 1.15, d(c) { rect(c, 8, 20, 144, 22, '#b88a58', 3.5); line(c, 20, 42, 16, 112, 7, '#6b5030'); line(c, 140, 42, 144, 112, 7, '#6b5030'); line(c, 24, 28, 140, 28, 1.5); } };
  PR.bed = { w: 192, h: 112, H: 1.2, d(c) { rect(c, 8, 50, 176, 50, '#a4703c', 3.5); rect(c, 14, 28, 164, 30, '#efe7d2', 3); rect(c, 14, 28, 44, 24, '#fff7e4', 2.5); hatchPoly(c, [[70, 30], [176, 30], [176, 58], [70, 58]], 8, .6, .3); line(c, 14, 100, 14, 108, 6); line(c, 176, 100, 176, 108, 6); } };
  PR.shelf = { w: 192, h: 192, H: 2.6, d(c) { rect(c, 10, 8, 172, 176, '#9a6e40', 3.5); for (let r = 0; r < 3; r++) { const y = 20 + r * 56; line(c, 10, y + 40, 182, y + 40, 4); for (let i = 0; i < 6; i++) poly(c, [[22 + i * 27, y + 38], [20 + i * 27, y + 10], [44 + i * 27, y + 8], [46 + i * 27, y + 38]], '#d29a62', 2.5); } } };
  PR.sign = { w: 128, h: 144, H: 1.9, d(c) { line(c, 64, 140, 64, 30, 6, '#5a4630'); poly(c, [[16, 14], [112, 14], [112, 70], [16, 70]], '#d6b379', 3.5); ell(c, 64, 42, 18, 16, '#c9772e', 2.5); line(c, 46, 28, 82, 28, 3); } };
  PR.stool = { w: 64, h: 64, H: .55, d(c) { rect(c, 8, 10, 48, 14, '#b88a58', 3); line(c, 14, 24, 10, 58, 5); line(c, 50, 24, 54, 58, 5); } };
  PR.pedestal = { w: 96, h: 112, H: 1.3, d(c) { poly(c, [[14, 104], [22, 30], [74, 30], [82, 104]], '#cdbd98', 3.5); rect(c, 10, 20, 76, 16, '#dccdaa', 3.5); hatchPoly(c, [[50, 32], [82, 104], [44, 104]], 6, .8, .3); } };
  PR.cloud = { w: 256, h: 96, H: 14, d(c) { [[50, 60, 34], [92, 44, 40], [140, 50, 42], [188, 62, 32], [120, 70, 36]].forEach(([x, y, r]) => ell(c, x, y, r, r * .7, '#faf3e0', 3)); } };
  PR.skull = { w: 64, h: 64, H: .6, d(c) { ell(c, 32, 28, 22, 20, '#f4efe0', 3); rect(c, 22, 44, 20, 12, '#f4efe0', 3); ell(c, 24, 28, 5, 6, INK, 1); ell(c, 40, 28, 5, 6, INK, 1); } };

  function propTex(key) {
    return memo('p:' + key, () => {
      const P = PR[key]; seed(hash(key)); const c = mk(P.w, P.h); P.d(c.getContext('2d'));
      return { tex: texOf(c), aspect: P.w / P.h, H: P.H, pad: 0 };
    });
  }
  /* pickups drawn as small icons on a card/sprite */
  function pickTex(type) {
    return memo('k:' + type, () => {
      const c = mk(96, 96), x = c.getContext('2d'); seed(hash(type));
      if (['eye', 'clover', 'sun', 'sword'].includes(type)) {
        poly(x, [[22, 6], [74, 6], [74, 90], [22, 90]], '#dedbd2', 3.5); line(x, 28, 18, 68, 18, 2); ICONS[type](x, 48, 52, 20); ICONS.star(x, 30, 80, 6);
      } else ICONS[type] ? ICONS[type](x, 48, 50, 30) : 0;
      const out = cutout(c, 4); return { tex: texOf(out), aspect: 1, pad: 0 };
    });
  }

  /* ================= SURFACES (3D walls & floors) ================= */
  function stain(x, n, a, w, h, col) { for (let i = 0; i < n; i++) { x.fillStyle = col.replace('A', (a * (.4 + rnd() * .6)).toFixed(3)); const r = ri(10, 40); x.beginPath(); x.ellipse(rnd() * w, rnd() * h, r, r * ri(.5, 1), rnd() * 3, 0, 6.3); x.fill(); } }
  function brickCanvas(base, rows, cols, lineA = .7) {
    const c = mk(256, 256), x = c.getContext('2d'); x.fillStyle = base; x.fillRect(0, 0, 256, 256);
    stain(x, 26, .09, 256, 256, 'rgba(80,55,20,A)'); stain(x, 14, .07, 256, 256, 'rgba(255,245,210,A)');
    const bh = 256 / rows, bw = 256 / cols;
    x.strokeStyle = `rgba(28,26,23,${lineA})`; x.lineWidth = 2.4; x.lineCap = 'round';
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * bw / 2;
      for (let i = -1; i < cols + 1; i++) {
        const X = i * bw + off, Y = r * bh;
        x.beginPath(); x.moveTo(X + jit(1.5), Y + jit(1.5)); x.lineTo(X + bw + jit(1.5), Y + jit(1.5)); x.stroke();
        x.beginPath(); x.moveTo(X + jit(1.5), Y + jit(1.5)); x.lineTo(X + jit(1.5), Y + bh + jit(1.5)); x.stroke();
        if (rnd() < .5) { x.globalAlpha = .25; x.lineWidth = 1.4; for (let k = 0; k < 3; k++) { x.beginPath(); x.moveTo(X + 8 + k * 5, Y + bh - 5); x.lineTo(X + 16 + k * 5, Y + 5); x.stroke(); } x.globalAlpha = 1; x.lineWidth = 2.4; }
      }
    }
    return c;
  }
  const SURF = {
    mud: () => brickCanvas('#dcc08a', 6, 3), mudDark: () => brickCanvas('#bfa26c', 6, 3), stone: () => brickCanvas('#cdbf9f', 4, 2), temple: () => brickCanvas('#a8916a', 5, 3, .8),
    zig: () => { const c = brickCanvas('#d4b57a', 4, 2); const x = c.getContext('2d'); x.fillStyle = 'rgba(123,63,40,.28)'; x.fillRect(0, 100, 256, 18); x.fillRect(0, 228, 256, 14); return c; },
    blue() {
      const c = brickCanvas('#2c6a9b', 8, 4, .75), x = c.getContext('2d'); seed(77);
      x.fillStyle = 'rgba(255,255,255,.12)'; for (let i = 0; i < 40; i++) x.fillRect(rnd() * 256, rnd() * 256, ri(6, 24), 3);
      const bull = (px, py, s, dir) => { x.save(); x.translate(px, py); x.scale(dir * s, s); const g = x; ell(g, 0, 0, 26, 13, '#f1e2b4', 2.4); poly(g, [[22, -6], [32, -22], [42, -18], [38, -2]], '#f1e2b4', 2.4); poly(g, [[34, -20], [36, -32], [40, -20]], OCHRE, 2); [[-14, 8], [-4, 10], [10, 10], [18, 8]].forEach(([a, b]) => line(g, a, b, a, b + 14, 3, '#f1e2b4')); curve(g, [[-26, -2], [-38, 4], [-34, 18]], 3, '#f1e2b4'); x.restore(); };
      x.fillStyle = 'rgba(20,45,70,.6)'; x.fillRect(0, 70, 256, 36); x.fillRect(0, 170, 256, 36);
      bull(64, 88, .9, 1); bull(190, 88, .9, 1); bull(70, 188, .85, -1); bull(194, 188, .85, -1);
      x.strokeStyle = 'rgba(241,226,180,.8)'; x.lineWidth = 3; for (let i = 0; i < 8; i++) { x.beginPath(); x.arc(16 + i * 32, 130, 8, 0, 6.3); x.stroke(); }
      return c;
    },
    wood() { const c = mk(256, 256), x = c.getContext('2d'); x.fillStyle = '#9a7a4e'; x.fillRect(0, 0, 256, 256); seed(5); for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#a98859' : '#8a6a3f'; x.fillRect(i * 32, 0, 32, 256); line(x, i * 32 + 1, 0, i * 32 + 1, 256, 3); for (let k = 0; k < 6; k++) line(x, i * 32 + ri(6, 26), ri(0, 240), i * 32 + ri(6, 26), ri(0, 256), 1.2); } return c; },
    tile() { const c = mk(256, 256), x = c.getContext('2d'); seed(9); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? '#b09a70' : '#9a8460'; x.fillRect(j * 64, i * 64, 64, 64); } stain(x, 22, .12, 256, 256, 'rgba(40,25,10,A)'); x.strokeStyle = 'rgba(28,26,23,.7)'; x.lineWidth = 2.4; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * 64, 0); x.lineTo(i * 64, 256); x.stroke(); x.beginPath(); x.moveTo(0, i * 64); x.lineTo(256, i * 64); x.stroke(); } for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const cx = 64 + j * 128, cy = 64 + i * 128; ell(x, cx, cy, 16, 16, null, 1.8); for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; line(x, cx + Math.cos(a) * 6, cy + Math.sin(a) * 6, cx + Math.cos(a) * 15, cy + Math.sin(a) * 15, 1.5); } } return c; },
    floorHouse() { const c = mk(256, 256), x = c.getContext('2d'); seed(12); x.fillStyle = '#b79a68'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 6; i++) { x.fillStyle = i % 2 ? '#c4a874' : '#a98c5b'; x.fillRect(0, i * 43, 256, 43); line(x, 0, i * 43, 256, i * 43, 3); for (let k = 0; k < 3; k++) { const px = ri(0, 256); line(x, px, i * 43, px, i * 43 + 43, 1.5); } } return c; },
    sand() {
      const c = mk(512, 512), x = c.getContext('2d'); seed(31); x.fillStyle = SAND; x.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(190,150,80,${.06 + rnd() * .08})`; const r = ri(18, 60); x.beginPath(); x.ellipse(40 + rnd() * 432, 40 + rnd() * 432, r, r * ri(.4, 1), rnd() * 3, 0, 6.3); x.fill(); }
      for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(255,248,220,${.08 + rnd() * .1})`; const r = ri(12, 40); x.beginPath(); x.ellipse(40 + rnd() * 432, 40 + rnd() * 432, r, r * ri(.4, 1), rnd() * 3, 0, 6.3); x.fill(); }
      x.strokeStyle = INK; x.lineCap = 'round';
      for (let i = 0; i < 70; i++) { const px = ri(20, 480), py = ri(20, 480), n = 2 + ((rnd() * 3) | 0); x.globalAlpha = ri(.25, .5); x.lineWidth = 1.5; for (let k = 0; k < n; k++) { x.beginPath(); x.moveTo(px + k * 5, py); x.lineTo(px + k * 5 + 7, py - 9); x.stroke(); } }
      x.globalAlpha = .45; for (let i = 0; i < 14; i++) { const px = ri(30, 470), py = ri(30, 470); x.lineWidth = 1.8; x.beginPath(); x.ellipse(px, py, ri(3, 7), ri(2, 5), rnd() * 3, 0, 6.3); x.stroke(); }
      x.globalAlpha = .28; for (let i = 0; i < 10; i++) { const py = ri(30, 480), px = ri(20, 300); x.lineWidth = 2; x.beginPath(); x.moveTo(px, py); x.bezierCurveTo(px + 40, py - 8, px + 80, py + 8, px + 120, py - 4); x.stroke(); }
      return c;
    },
    road() { const c = mk(256, 256), x = c.getContext('2d'); seed(8); x.fillStyle = '#c8a97a'; x.fillRect(0, 0, 256, 256); stain(x, 18, .1, 256, 256, 'rgba(70,45,20,A)'); x.strokeStyle = 'rgba(28,26,23,.65)'; x.lineWidth = 2.4; for (let r = 0; r < 4; r++) { const off = (r % 2) * 32; for (let i = -1; i < 4; i++) { x.strokeRect(i * 64 + off + jit(1), r * 64 + jit(1), 64, 64); } } x.fillStyle = 'rgba(47,108,156,.55)'; x.fillRect(0, 0, 12, 256); x.fillRect(244, 0, 12, 256); return c; },
    water() { const c = mk(256, 256), x = c.getContext('2d'); seed(14); x.fillStyle = '#86b8c8'; x.fillRect(0, 0, 256, 256); stain(x, 14, .12, 256, 256, 'rgba(255,255,255,A)'); x.strokeStyle = 'rgba(28,26,23,.5)'; x.lineWidth = 2; for (let i = 0; i < 26; i++) { const px = ri(10, 220), py = ri(10, 250); x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + 14, py - 8, px + 28, py); x.quadraticCurveTo(px + 42, py + 8, px + 56, py); x.stroke(); } return c; },
    door() { const c = mk(128, 192), x = c.getContext('2d'); seed(3); x.fillStyle = '#7b5836'; x.beginPath(); x.moveTo(14, 192); x.lineTo(14, 70); x.quadraticCurveTo(64, -10, 114, 70); x.lineTo(114, 192); x.closePath(); x.fill(); x.strokeStyle = INK; x.lineWidth = 6; x.stroke(); for (let i = 1; i < 4; i++) line(x, 14 + i * 25, 60 + (i % 2) * 6, 14 + i * 25, 190, 2.5); line(x, 14, 110, 114, 110, 4); line(x, 14, 156, 114, 156, 4); ell(x, 92, 118, 6, 6, OCHRE, 2.5); x.strokeStyle = INK; x.lineWidth = 9; x.beginPath(); x.moveTo(4, 192); x.lineTo(4, 70); x.quadraticCurveTo(64, -22, 124, 70); x.lineTo(124, 192); x.stroke(); return c; },
    curtain() { const c = mk(128, 192), x = c.getContext('2d'); seed(3); x.fillStyle = '#4c3322'; x.fillRect(10, 10, 108, 182); x.strokeStyle = INK; x.lineWidth = 6; x.strokeRect(10, 10, 108, 182); for (let i = 1; i < 4; i++) line(x, 10 + i * 27, 10, 10 + i * 27, 190, 3); return c; },
    storm() { const c = mk(512, 256), x = c.getContext('2d'); seed(21); x.clearRect(0, 0, 512, 256); for (let i = 0; i < 90; i++) { const y = rnd() * 256, px = rnd() * 512, L = ri(60, 200); x.strokeStyle = `rgba(${rnd() < .5 ? '90,62,30' : '245,225,170'},${ri(.15, .45)})`; x.lineWidth = ri(2, 9); x.lineCap = 'round'; x.beginPath(); x.moveTo(px, y); x.bezierCurveTo(px + L * .3, y - 14, px + L * .6, y + 14, px + L, y); x.stroke(); if (px + L > 512) { x.beginPath(); x.moveTo(px - 512, y); x.bezierCurveTo(px - 512 + L * .3, y - 14, px - 512 + L * .6, y + 14, px - 512 + L, y); x.stroke(); } } const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, 'rgba(230,200,140,.0)'); g.addColorStop(.35, 'rgba(210,170,100,.5)'); g.addColorStop(1, 'rgba(190,140,70,.85)'); x.globalCompositeOperation = 'destination-over'; x.fillStyle = g; x.fillRect(0, 0, 512, 256); return c; },
    hills() {
      const c = mk(1024, 256), x = c.getContext('2d'); seed(41);
      const layer = (base, amp, col, a, hatch) => { x.beginPath(); x.moveTo(0, 256); for (let i = 0; i <= 64; i++) { const t = i / 64, y = base - Math.abs(Math.sin(t * 6.28 * 2 + a)) * amp * .6 - Math.sin(t * 6.28 * 5 + a * 2) * amp * .3 - Math.sin(t * 6.28 * 11 + a) * amp * .1; x.lineTo(t * 1024, y); } x.lineTo(1024, 256); x.closePath(); x.fillStyle = col; x.fill(); x.strokeStyle = INK; x.lineWidth = 3; x.stroke(); if (hatch) { x.globalAlpha = .3; x.lineWidth = 1.6; for (let i = 0; i < 160; i++) { const px = rnd() * 1024, py = base + ri(-amp * .3, 30); x.beginPath(); x.moveTo(px, py); x.lineTo(px + 10, py + 14); x.stroke(); } x.globalAlpha = 1; } };
      layer(190, 110, '#d8c79c', 1, false); layer(225, 80, '#c6ae78', 3, true); layer(256, 40, '#b79c62', 5, true);
      return c;
    },
    sky() { const c = mk(16, 256), x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#8fb3be'); g.addColorStop(.55, '#d7dfc8'); g.addColorStop(1, '#f1e2b8'); x.fillStyle = g; x.fillRect(0, 0, 16, 256); return c; },
    skyDark() { const c = mk(16, 256), x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#0e0b08'); g.addColorStop(1, '#241a10'); x.fillStyle = g; x.fillRect(0, 0, 16, 256); return c; }
  };
  const surfBase = {};
  function surf(key, rx = 1, ry = 1) {
    const rk = key + '|' + (Math.round(rx * 4) / 4) + '|' + (Math.round(ry * 4) / 4);
    return memo('s:' + rk, () => {
      const base = surfBase[key] || (surfBase[key] = (seed(hash(key)), SURF[key]()));
      const t = new THREE.CanvasTexture(base); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 4; return t;
    });
  }
  function skyTexture(dark) { return memo('sky' + dark, () => { const t = new THREE.CanvasTexture(SURF[dark ? 'skyDark' : 'sky']()); return t; }); }
  function plainCanvasTex(key) { return memo('pc:' + key, () => { seed(hash(key)); const t = new THREE.CanvasTexture(SURF[key]()); t.anisotropy = 4; return t; }); }

  /* ================= FX textures ================= */
  function fxTex(key) {
    return memo('f:' + key, () => {
      const c = mk(128, 128), x = c.getContext('2d'); seed(hash(key));
      if (key === 'glow') { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,240,190,1)'); g.addColorStop(.4, 'rgba(255,200,110,.5)'); g.addColorStop(1, 'rgba(255,170,60,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }
      else if (key === 'shadow') { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(20,16,10,.55)'); g.addColorStop(.7, 'rgba(20,16,10,.3)'); g.addColorStop(1, 'rgba(20,16,10,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }
      else if (key === 'splat') { x.fillStyle = INK; x.beginPath(); x.arc(64, 64, 18, 0, 6.3); x.fill(); for (let i = 0; i < 12; i++) { const a = rnd() * 6.28, d = ri(20, 46); x.beginPath(); x.arc(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, ri(3, 11), 0, 6.3); x.fill(); x.lineWidth = ri(3, 8); x.strokeStyle = INK; x.beginPath(); x.moveTo(64, 64); x.lineTo(64 + Math.cos(a) * d, 64 + Math.sin(a) * d); x.stroke(); } }
      else if (key === 'slash') { x.strokeStyle = '#fff'; x.lineCap = 'round'; x.lineWidth = 12; x.beginPath(); x.arc(30, 64, 60, -1.0, 1.0); x.stroke(); x.strokeStyle = INK; x.lineWidth = 3; x.beginPath(); x.arc(30, 64, 66, -1.0, 1.0); x.stroke(); x.beginPath(); x.arc(30, 64, 54, -.9, .9); x.stroke(); }
      else if (key === 'puff') { x.fillStyle = 'rgba(240,225,185,.9)'; [[64, 70, 30], [44, 80, 22], [84, 80, 24], [60, 50, 22]].forEach(([a, b, r]) => { x.beginPath(); x.arc(a, b, r, 0, 6.3); x.fill(); x.strokeStyle = INK; x.lineWidth = 3; x.stroke(); }); }
      else if (key === 'ink') { x.fillStyle = 'rgba(25,22,20,.92)'; for (let i = 0; i < 9; i++) { x.beginPath(); x.arc(64 + ri(-26, 26), 64 + ri(-26, 26), ri(18, 34), 0, 6.3); x.fill(); } }
      else if (key === 'excl') { x.clearRect(0, 0, 128, 128); x.font = 'bold 110px "IM Fell English SC", Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 12; x.strokeStyle = INK; x.strokeText('!', 64, 70); x.fillStyle = '#fff'; x.fillText('!', 64, 70); }
      else if (key === 'ques') { x.font = 'bold 110px "IM Fell English SC", Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 12; x.strokeStyle = INK; x.strokeText('?', 64, 70); x.fillStyle = '#fff'; x.fillText('?', 64, 70); }
      else if (key === 'beacon') { x.clearRect(0, 0, 128, 128); poly(x, [[64, 124], [20, 60], [64, 6], [108, 60]], '#f3d27a', 5); line(x, 64, 20, 64, 100, 3); line(x, 36, 60, 92, 60, 3); }
      else if (key === 'mapdoor') { x.clearRect(0, 0, 128, 128); }
      return texOf(c);
    });
  }
  function ringTex() { return memo('ring', () => { const c = mk(128, 128), x = c.getContext('2d'); x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 10; x.beginPath(); x.arc(64, 64, 52, 0, 6.3); x.stroke(); return texOf(c); }); }

  return { INK, PAPER, RED, BLUE, OCHRE, CLOAK, charTex, propTex, pickTex, surf, skyTexture, plainCanvasTex, fxTex, ringTex, iconURL, iconCanvas, ICONS, mk, texOf, seed, hash, PR, cutout, poly, line, ell, rect, curve, hatchPoly, rnd };
})();
