/* ============================================================
   INK OF BABYLON — levels.js
   The great city, the Esagila temple floors, the cistern, the general's
   office, rooftops, and the little cart that carries you in.
   ============================================================ */
'use strict';
const PI = Math.PI;
const CYL = new THREE.CylinderGeometry(1, 1, 1, 14);
function freeSpot(L, x, z, r, extra) {
  for (const s of L.solids) { if (s.r !== undefined) { if (Math.hypot(x - s.cx, z - s.cz) < r + s.r) return false; } else if (x > s.x0 - r && x < s.x1 + r && z > s.z0 - r && z < s.z1 + r) return false; }
  if (extra) for (const p of extra) if (Math.hypot(x - p[0], z - p[1]) < p[2] + r) return false; return true;
}
const guard = (L, x, z, f, o = {}) => spawnNPC(L, Object.assign({ type: 'soldier', fig: 'soldier', x, z, f, name: 'Guard' }, o));
const shieldG = (L, x, z, f, o = {}) => spawnNPC(L, Object.assign({ type: 'shield', fig: 'shield', x, z, f, name: 'Guard' }, o));
const archerG = (L, x, z, f, o = {}) => spawnNPC(L, Object.assign({ type: 'archer', fig: 'archer', x, z, f, name: 'Archer' }, o));
const civ = (L, fig, x, z, o = {}) => spawnNPC(L, Object.assign({ type: 'citizen', fig, x, z, hold: o.hold || null, off: null }, o));
function column(L, x, z, r, h, tex = 'stone') {
  const m = new THREE.Mesh(CYL, L.mat(ART.surf(tex, 2, Math.max(1, Math.round(h / 4))))); m.scale.set(r, h, r); m.position.set(x, h / 2, z); L.scene.add(m);
  const hm = new THREE.Mesh(CYL, HULL); hm.scale.set(r + .07, h + .07, r + .07); hm.position.copy(m.position); L.scene.add(hm); L.solidCirc(x, z, r, h, { map: true });
}
function lampPost(L, x, z, s = 1) { addProp(L, 'torch', x, z, s, { shadow: false }); addFlame(L, x, 2.4 * s, z, .9 * s); }
function doorFrame(L, x, z, face, w = 4, h = 4.2) { /* decorative arch inset on a wall face */ const m = new THREE.Mesh(PLANE, L.mat(ART.plainCanvasTex('door'), { at: true, double: true, basic: true, tint: 0xffffff })); m.scale.set(w, h, 1); const o = .08; if (face === 's') { m.position.set(x, h / 2, z + o); } if (face === 'n') { m.position.set(x, h / 2, z - o); m.rotation.y = PI; } if (face === 'e') { m.position.set(x + o, h / 2, z); m.rotation.y = PI / 2; } if (face === 'w') { m.position.set(x - o, h / 2, z); m.rotation.y = -PI / 2; } L.scene.add(m); return m; }
/* paper-cut dune ridges: layered silhouettes ring the world */
function paperRidge(L, radius, hmin, hmax, color, seedN) {
  ART.seed(seedN); const N = 120, pos = [], idx = [];
  for (let i = 0; i <= N; i++) { const a = i / N * Math.PI * 2, h = hmin + (hmax - hmin) * (.5 + .5 * Math.sin(a * 3 + seedN) * Math.cos(a * 5 + seedN * 2) + .25 * Math.sin(a * 11 + seedN)) * (.7 + ART.rnd() * .3); pos.push(Math.cos(a) * radius, -2, Math.sin(a) * radius, Math.cos(a) * radius, h, Math.sin(a) * radius); if (i < N) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, fog: true })); L.scene.add(m);
  const o = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x14110e, side: THREE.DoubleSide, fog: true })); o.scale.set(1.004, 1.07, 1.004); o.position.y = -.5; L.scene.add(o); o.renderOrder = -1; m.renderOrder = 0;
}
/* instanced distant skyline: hundreds of paper house-blocks in two draw calls */
function skyline(L, count, r0, r1, seedN, keepOut) {
  ART.seed(seedN); const mesh = new THREE.InstancedMesh(BOXG, Paper.toon({}), count), hull = new THREE.InstancedMesh(BOXG, HULL, count), m4 = new THREE.Matrix4(), c = new THREE.Color();
  for (let i = 0; i < count; i++) { const a = ART.rnd() * 6.283, r = r0 + ART.rnd() * (r1 - r0); let w = 8 + ART.rnd() * 16, d = 8 + ART.rnd() * 16, h = 6 + ART.rnd() * ART.rnd() * 30; if (keepOut && Math.abs(Math.cos(a) * r - keepOut[0]) < keepOut[2] && Math.abs(Math.sin(a) * r - keepOut[1]) < keepOut[3]) { w = d = h = .001; } m4.makeScale(w, h, d).setPosition(Math.cos(a) * r, h / 2 - 1, Math.sin(a) * r); mesh.setMatrixAt(i, m4); c.setHSL(.1 + ART.rnd() * .02, .25, .6 + ART.rnd() * .15); mesh.setColorAt(i, c); m4.makeScale(w + 1.2, h + 1.2, d + 1.2).setPosition(Math.cos(a) * r, h / 2 - 1, Math.sin(a) * r); hull.setMatrixAt(i, m4); }
  L.scene.add(mesh, hull);
}
function crowdLine(spots, x0, z0, x1, z1, n, lateral, opts = {}) {
  const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz), ux = dx / len, uz = dz / len;
  for (let i = 0; i < n; i++) { const t = Math.random(), lat = (Math.random() - .5) * lateral, dir = Math.random() < .5 ? 1 : -1; spots.push({ x: x0 + dx * t - uz * lat, z: z0 + dz * t + ux * lat, dx: ux * dir, dz: uz * dir, len: opts.len || (10 + Math.random() * 22), spd: opts.spd }); }
}
function crowdArea(spots, x0, z0, x1, z1, n, o = {}) { for (let i = 0; i < n; i++) { const a = Math.random() < .5 ? 1 : -1; spots.push({ x: lerp(x0, x1, Math.random()), z: lerp(z0, z1, Math.random()), y: o.y || 0, dx: o.walk ? Math.random() - .5 : 0, dz: o.walk ? Math.random() - .5 : 0, len: o.walk ? 6 + Math.random() * 10 : 0, spd: o.walk ? .3 + Math.random() * .3 : 0, sc: o.sc }); } }

/* ============================================================ THE GREAT CITY */
function stall(L, x, z, face, goods) {
  addBox(L, x, z, 4.4, 1.6, 1.1, { tex: 'wood', tile: 2.5, hullT: .05 }); const aw = new THREE.Mesh(PLANE, L.mat(ART.surf('awning', 1, 1), { double: true })); aw.scale.set(4.8, 2.4, 1); aw.position.set(x, 2.9, z - 1.1 * face); aw.rotation.x = -.55 * face; L.scene.add(aw);
  [-2.1, 2.1].forEach(dx => addBox(L, x + dx, z - 1.8 * face, .22, .22, 3.2, { tex: 'wood', tile: 2, hull: false, solid: false }));
  goods.forEach((g, i) => addProp(L, g, x - 1.4 + i * 1.4, z - .1 * face, .8, { shadow: false, y: 1.1 }));
}
function buildCity() {
  const L = new Level('city', { name: 'Babylon', sky: 'sky', fog: 0xe6d9b8, fogNear: 120, fogFar: 560, bounds: { x0: -164, x1: 164, z0: -188, z1: 222 }, hemi: [0xeadcbc, 0x8a7a5c, .46], sunC: 0xffe2b0, sunI: .5, sunDir: [-70, 90, 50], tint: 0xf1e6cc, camDist: 6.8, mapScale: 1.1 });
  ART.seed(515); const R = ART.rnd, rr = (a, b) => a + R() * (b - a); L.spawns = { cart: { x: 0, z: 200, yaw: PI }, gate: { x: 0, z: 168, yaw: 0 }, market: { x: 0, z: 118, yaw: 0 }, temple: { x: 0, z: -100, yaw: 0 }, templeDoor: { x: 0, z: -146, yaw: PI } };
  addFlat(L, 'sand', 0, 0, 1600, 1600, 0, 190, 190); addFlat(L, 'road', 0, 186, 18, 70, .02, 1, 9); addFlat(L, 'road', 0, 52, 18, 196, .02, 2, 24); addFlat(L, 'cobble', 0, 124, 110, 50, .025, 30, 14); addFlat(L, 'cobble', 0, 66, 160, 70, .025, 44, 20); addFlat(L, 'tile', 0, -100, 150, 100, .03, 18, 12); addFlat(L, 'road', 0, -146, 40, 6, .035, 4, .8);
  /* world backdrop */
  paperRidge(L, 600, 14, 46, 0xcdbb92, 3); paperRidge(L, 520, 10, 36, 0xc2ae82, 7); paperRidge(L, 450, 8, 26, 0xb69f72, 11); skyline(L, 520, 290, 430, 21);
  for (let i = 0; i < 7; i++) { const c = addProp(L, 'cloud', rr(-380, 380), rr(-380, 200), rr(1, 1.8), { y: rr(70, 120), shadow: false, sway: false }); }
  const sunG = new THREE.Mesh(PLANE, L.mat(ART.fxTex('glow'), { tr: true, add: true, basic: true, tint: 0xffffff })); sunG.scale.set(160, 160, 1); sunG.position.set(-260, 150, -300); L.scene.add(sunG); L.bills.push(sunG);
  /* boundary walls (the city is enclosed) */
  addBox(L, -170, 15, 4, 420, 24, { tex: 'mudDark', tile: 6, hullT: .3 }); addBox(L, 170, 15, 4, 420, 24, { tex: 'mudDark', tile: 6, hullT: .3 }); addBox(L, 0, -192, 344, 4, 24, { tex: 'mudDark', tile: 6, hullT: .3 });
  /* ---- the Ishtar Gate (outer wall) ---- */
  addBox(L, -15, 150, 16, 14, 36, { tex: 'blue', tile: 5, hullT: .45 }); addBox(L, 15, 150, 16, 14, 36, { tex: 'blue', tile: 5, hullT: .45 }); addBox(L, 0, 150, 14.4, 11, 7, { tex: 'blue', tile: 5, y0: 24, solid: false, hullT: .3 }); addBox(L, 0, 150, 16, 13, 1.4, { tex: 'stone', y0: 31, solid: false, hullT: .15 });
  addCrenel(L, -23, 143, -7, 143, 36, 'blue', 1.6); addCrenel(L, 7, 143, 23, 143, 36, 'blue', 1.6); addCrenel(L, -23, 157, -7, 157, 36, 'blue', 1.6); addCrenel(L, 7, 157, 23, 157, 36, 'blue', 1.6);
  addBox(L, -96, 150, 146, 6, 20, { tex: 'mud', tile: 6, hullT: .3 }); addBox(L, 96, 150, 146, 6, 20, { tex: 'mud', tile: 6, hullT: .3 }); addCrenel(L, 23, 147, 169, 147, 20, 'mud', 1.4); addCrenel(L, -169, 147, -23, 147, 20, 'mud', 1.4);
  [-70, 70, -130, 130].forEach(x => addBox(L, x, 150, 14, 14, 28, { tex: 'mud', tile: 6, hullT: .3 }));
  addProp(L, 'statue', -9, 162, 1.7, { solid: 1.8 }); addProp(L, 'statue', 9, 162, 1.7, { solid: 1.8, flip: true }); addProp(L, 'star', -5.5, 157, 1.8); addProp(L, 'star', 5.5, 157, 1.8); addProp(L, 'spade', -12, 140, 1.6); addProp(L, 'spade', 12, 140, 1.6);
  /* ---- Processional Way ---- */
  addBox(L, -9.3, -4, 1.6, 78, 4, { tex: 'lionwall', tile: 4, hullT: .1 }); addBox(L, 9.3, -4, 1.6, 78, 4, { tex: 'lionwall', tile: 4, hullT: .1 });
  for (let z = 120; z > -38; z -= 16) { lampPost(L, -9.8, z); lampPost(L, 9.8, z - 8); }
  for (let z = 30; z > -36; z -= 22) { addProp(L, 'lion', -7, z, 1.6, { shadow: false, y: 4 }); addProp(L, 'lion', 7, z - 11, 1.6, { shadow: false, y: 4, flip: true }); }
  /* ---- the marketplace ---- */
  const goods = [['amphora', 'basket', 'crate'], ['basket', 'reeds', 'amphora'], ['crate', 'amphora', 'basket'], ['reeds', 'basket', 'crate']];
  for (const z of [50, 66, 82, 98]) for (let x = -84; x <= 84; x += 17) { if (Math.abs(x) < 14) continue; if (Math.random() < .12) continue; stall(L, x + rr(-1.5, 1.5), z, (z % 32 === 18 || z === 66) ? 1 : -1, pick(goods)); }
  /* houses + back lanes */
  const hs = [];
  for (let gx = 0; gx < 7; gx++) for (let gz = 0; gz < 10; gz++) { for (const sg of [-1, 1]) { const x = sg * (100 + gx * 9.5 * 1.0 + rr(0, 6)), z = 20 + gz * 13.4 + rr(-2, 2); if (Math.abs(x) > 158 || z > 140) continue; if (R() < .22) continue; const w = rr(7, 11), d = rr(8, 11), h = rr(7, 15); addBox(L, x, z, w, d, h, { tex: R() < .5 ? 'mud' : 'mudDark', tile: 4 }); hs.push([x, z]); if (R() < .3) addProp(L, 'palm', x + rr(-5, 5), z + d / 2 + 2, rr(.9, 1.2), { solid: .5, solidH: 3 }); } }
  for (let gz = 0; gz < 10; gz++) for (const sg of [-1, 1]) { const x = sg * rr(26, 38), z = 112 + rr(0, 26); if (gz % 3) continue; }
  /* ---- the Marduk Gate into the sacred precinct ---- */
  addBox(L, -14, -42, 12, 11, 30, { tex: 'blue', tile: 5, hullT: .4 }); addBox(L, 14, -42, 12, 11, 30, { tex: 'blue', tile: 5, hullT: .4 }); addBox(L, 0, -42, 16.4, 9, 6, { tex: 'blue', tile: 5, y0: 20, solid: false, hullT: .3 });
  addBox(L, -94, -42, 148, 4, 18, { tex: 'zig', tile: 6, hullT: .3 }); addBox(L, 94, -42, 148, 4, 18, { tex: 'zig', tile: 6, hullT: .3 }); addCrenel(L, 20, -44, 168, -44, 18, 'zig', 1.4); addCrenel(L, -168, -44, -20, -44, 18, 'zig', 1.4);
  addProp(L, 'star', -8, -36, 1.8); addProp(L, 'star', 8, -36, 1.8); addProp(L, 'spade', -22, -36, 1.4); addProp(L, 'spade', 22, -36, 1.4);
  /* precinct: colonnades, the Esagila, and the colossal ziggurat behind it */
  for (let z = -62; z > -140; z -= 13) { column(L, -38, z, 1.5, 11, 'zig'); column(L, 38, z, 1.5, 11, 'zig'); }
  [[-20, -70], [20, -70], [-20, -112], [20, -112], [-56, -100], [56, -100]].forEach(([x, z]) => { addProp(L, 'brazier', x, z, 1.5, { solid: .6 }); addFlame(L, x, 1.6, z, 1.8); });
  for (let i = 0; i < 9; i++) addProp(L, 'palm', i % 2 ? rr(-150, -60) : rr(60, 150), rr(-170, -55), rr(1, 1.3), { solid: .5, solidH: 3 });
  addBox(L, 0, -168, 104, 38, 22, { tex: 'zig', tile: 6, hullT: .4 }); addBox(L, 0, -168, 84, 30, 12, { tex: 'zig', tile: 6, y0: 22, solid: false, hullT: .3 }); addBox(L, 0, -168, 64, 22, 8, { tex: 'blue', tile: 6, y0: 34, solid: false, hullT: .3 });
  [[-20, -149.5], [20, -149.5]].forEach(([x, z]) => addBox(L, x, z, 14, 4, 22, { tex: 'blue', tile: 5, solid: false, hullT: .2 })); addBox(L, 0, -148, 20, 3, 1, { tex: 'stone', solid: false }); addBox(L, 0, -146.5, 24, 3, .5, { tex: 'stone', solid: false });
  doorFrame(L, 0, -149, 's', 7, 11); addProp(L, 'statue', -14, -145, 2, { solid: 2 }); addProp(L, 'statue', 14, -145, 2, { solid: 2, flip: true }); addProp(L, 'spade', -26, -146, 2); addProp(L, 'spade', 26, -146, 2); addProp(L, 'star', -32, -146, 2); addProp(L, 'star', 32, -146, 2);
  [[130, 130, 16], [100, 100, 16], [74, 74, 14], [52, 52, 12], [34, 34, 10]].reduce((y, [w, d, h]) => { addBox(L, 0, -256, w, d, h, { tex: 'zig', tile: 8, y0: y, solid: false, hullT: .7 }); return y + h; }, 0);
  addBox(L, 0, -256, 20, 20, 10, { tex: 'blue', tile: 6, y0: 78, solid: false, hullT: .5 }); addBox(L, 0, -202, 14, 56, 1, { tex: 'stone', y0: 0, solid: false, hull: false });
  /* the hanging gardens: green terraces on the horizon */
  [[-300, -60, 60, 10], [-300, -60, 46, 20], [-300, -60, 34, 30], [-300, -60, 22, 40]].forEach(([x, z, w, y]) => { addBox(L, x, z, w + 20, w, 10, { tex: 'stone', tile: 6, y0: y - 10, solid: false, hullT: .6 }); for (let i = 0; i < 5; i++) addProp(L, 'palm', x + rr(-w / 2, w / 2), z + rr(-w / 3, w / 3), 1.6, { y, shadow: false }); });
  /* props: palms, reeds, rocks */
  for (let i = 0; i < 70; i++) { const x = rr(-160, 160), z = rr(-180, 215); if (Math.abs(x) < 12 && z > -45 && z < 150) continue; if (!freeSpot(L, x, z, 3, hs.map(h => [h[0], h[1], 9]))) continue; addProp(L, R() < .55 ? 'palm' : R() < .5 ? 'bush' : 'rock', x, z, rr(.9, 1.3), { solid: .5, solidH: 2 }); }
  for (let i = 0; i < 160; i++) addProp(L, 'tuft', rr(-160, 160), rr(150, 220), rr(.8, 1.4));
  /* the outskirts: caravans waiting at the gate */
  [[-24, 190], [26, 196], [-40, 176], [38, 180], [-14, 208]].forEach(([x, z], i) => { addProp(L, 'donkey', x, z, 1.2, { flip: i % 2 }); addProp(L, 'basket', x + 1.6, z, 1, {}); });
  /* ---- zones ---- */
  L.zones.push({ id: 'precinct', x0: -168, z0: -190, x1: 168, z1: -46, level: 0 });
  /* ---- instanced crowds: thousands of paper people ---- */
  const spots = [];
  crowdLine(spots, 0, 215, 0, 156, 160, 14, { spd: .5 }); crowdLine(spots, 0, 140, 0, 30, 220, 15, { spd: .6 }); crowdArea(spots, -90, 40, 90, 105, 520, { walk: true }); crowdArea(spots, -50, 100, 50, 146, 260, { walk: true });
  crowdLine(spots, 0, -48, 0, -140, 130, 16, { spd: .5 }); crowdArea(spots, -60, -135, 60, -60, 160, { walk: true });
  [[0, 10], [30, 24], [60, 38], [80, 54]].forEach(() => { });
  crowdArea(spots, -168, 0, -112, 140, 180); crowdArea(spots, 112, 0, 168, 140, 180, { sc: 1 });
  let y = 0; for (const [w, h] of [[130, 16], [100, 16], [74, 14], [52, 12]]) { y += h; crowdArea(spots, -w / 2 + 6, -256 + w / 2 - 2, w / 2 - 6, -256 + w / 2 + 2, 70, { y: y, sc: 2.2 }); }
  for (let i = 0; i < 700; i++) { const a = R() * 6.283, r = 300 + R() * 90; spots.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, y: 6 + R() * 8, spd: 0, sc: 2.5 }); }
  L.crowdMesh = Paper.makeCrowd(L, ART.crowdAtlas(), spots, { tint: 0xefe6d0 });
  /* ---- people with names and stories ---- */
  const K = L.key = {};
  /* the gate inspection */
  guard(L, -5, 172, PI / 2, { name: 'Gate guard' }); shieldG(L, 5, 172, PI / 2, { name: 'Gate guard' }); K.inspector = civ(L, 'inspector', 0, 176, { name: 'Gate officer', static: true, f: PI / 2, icon: false, hold: 'scroll' });
  shieldG(L, -10, 140, PI / 2); shieldG(L, 10, 140, PI / 2); guard(L, -8, 160, PI / 2); guard(L, 8, 160, PI / 2);
  /* welcome party inside the gate */
  K.escort = civ(L, 'escort', 0, 128, { name: 'Captain Ibbi-Adad', static: true, f: -PI / 2, hold: 'sword' });
  [[-5, 132], [5, 132], [-5, 124], [5, 124]].forEach(([x, z], i) => (i % 2 ? guard : shieldG)(L, x, z, i < 2 ? PI / 2 : -PI / 2, { T: { view: 18 } }));
  /* market life */
  K.herbalist = civ(L, 'herbalist', -36, 62, { name: 'Zer-Bāni', static: true, f: PI / 2, hold: 'jar' }); K.merchantBeer = civ(L, 'merchant', 34, 66, { name: 'Beer-seller', static: true, f: PI / 2, sweep: true, hold: 'cup' }); K.scribeMk = civ(L, 'scribe', 52, 50, { name: 'Street scribe', static: true, f: PI / 2, hold: 'tablet' });
  [[-62, 82], [-48, 52], [20, 88], [46, 100], [-24, 100], [64, 74], [-70, 66], [8, 58]].forEach(([x, z], i) => civ(L, ['citizenM', 'citizenF', 'merchant', 'laborer'][i % 4], x, z, { name: 'Citizen', route: [[x, z], [x + rr(-14, 14), z + rr(-8, 8)], [x + rr(-14, 14), z + rr(-8, 8)]] }));
  for (let i = 0; i < 7; i++) civ(L, i % 3 ? 'child' : 'servant', rr(-60, 60), rr(54, 100), { name: 'Child', route: [[rr(-60, 60), rr(54, 100)], [rr(-60, 60), rr(54, 100)]], T: { spd: 2.4 } });
  const sA = guard(L, 28, 92, PI, { name: 'Guard' }), sB = guard(L, 25, 92, 0, { name: 'Guard' }); pairUp(sA, sB, { lines: [['Guard', 'They say Sîn-leqi the spy-catcher arrived at the Esagila this morning.'], ['Guard', 'Then the Marshal had better watch his guests. That one smells a lie from across a river.']], flag: 'heardInspector', intel: 'the spy-catcher Sîn-leqi hunts impostors at the Esagila.' });
  const mA = civ(L, 'merchant', -14, 80, { name: 'Merchant', static: true, f: 0 }), mB = civ(L, 'citizenM', -11, 80, { name: 'Merchant', static: true, f: PI }); mA.chatWith = mB; mB.chatWith = mA; mA.d.overhear = { lines: [['Merchant', 'The Marshal feasts his guests tonight in the high chambers.'], ['Merchant', 'He feasts, he smiles, and he never lets anyone near that wooden case of tablets.']], flag: 'heardLedger', intel: 'the Marshal keeps his war ledger in a wooden case of tablets in his office.' };
  /* the precinct */
  K.chamberlain = civ(L, 'chamberlain', 0, -128, { name: 'Chamberlain Kabti', static: true, f: PI / 2, hold: 'staff' });
  shieldG(L, -6, -52, PI / 2); shieldG(L, 6, -52, PI / 2); guard(L, -22, -80, 0, { route: [[-22, -60], [-22, -130], [-8, -130], [-8, -60]] }); guard(L, 22, -80, PI, { route: [[22, -130], [22, -60], [8, -60], [8, -130]] });
  for (let i = 0; i < 6; i++) civ(L, i % 2 ? 'priest' : 'citizenM', rr(-50, 50), rr(-125, -70), { name: 'Pilgrim', route: [[rr(-50, 50), rr(-125, -70)], [rr(-50, 50), rr(-125, -70)]] });
  for (let i = 0; i < 4; i++) civ(L, 'priest', -14 + i * 9, -132, { name: 'Priest', static: true, f: PI / 2, anim: { talk: 1 } });
  /* doors */
  const td = addInter(L, { x: 0, z: -145.5, r: 3, label: 'Enter the Esagila temple', door: true, fn: () => G.enterTemple && G.enterTemple() }); K.templeDoor = td;
  L.maskPlayerYaw = 0; return L;
}

/* ============================================================ ROOM BUILDERS (interiors) */
function interiorLevel(id, name, bounds, o = {}) {
  const L = new Level(id, { name, sky: 'skyDark', indoor: true, dark: !!o.dark, fog: o.fog || 0x15110c, fogNear: o.fogNear || 10, fogFar: o.fogFar || 66, bounds, hemi: o.hemi || [0x9a8a70, 0x2a2218, .3], sunI: 0, tint: o.tint || 0x8e8068, camDist: 5.8, mapScale: o.mapScale || 2.2 });
  L.spawns = {}; L.o.height = o.height || 8; return L;
}
function floorAndCeil(L, x0, z0, x1, z1, o = {}) { addFlat(L, o.floor || 'tile', (x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, 0, (x1 - x0) / 5, (z1 - z0) / 5); if (o.ceil !== false) addCeiling(L, x0, z0, x1, z1, o.h || L.o.height); }
function torchPair(L, x, z) { lampPost(L, x, z, 1.15); addLightPool(L, x, z, 4.5, .3); }

/* ---------- the cart (chapter 1) ---------- */
function buildCart() {
  const L = interiorLevel('cart', 'The Cart', { x0: -1.6, x1: 1.6, z0: -2.6, z1: 2.6 }, { fog: 0x2a2014, fogNear: 4, fogFar: 22, hemi: [0xb59a70, 0x3a2c1c, .5], tint: 0xb09a78, mapScale: 6, height: 2.5 }); L.o.dark = false;
  addFlat(L, 'floorHouse', 0, 0, 3.4, 5.6, 0, 1, 2); addCeiling(L, -1.7, -2.8, 1.7, 2.8, 2.5, 'wood');
  wallLine(L, -1.8, -2.8, -1.8, 2.8, { h: 2.5, t: .2, tex: 'wood', tile: 2, hull: false }); wallLine(L, 1.8, -2.8, 1.8, 2.8, { h: 2.5, t: .2, tex: 'wood', tile: 2, hull: false, gaps: [[1.8, 3.8, 2.2]] });
  addBox(L, 0, -2.8, 3.6, .2, 2.5, { tex: 'wood', tile: 2, hull: false }); addBox(L, 0, 2.8, 3.6, .2, 2.5, { tex: 'wood', tile: 2, hull: false });
  addBox(L, 1.8, 0, .2, 1.6, 1.1, { tex: 'wood', tile: 2, y0: 0, solid: false, hull: false }); addBox(L, 1.8, 2.3, .2, .6, .1, { tex: 'wood', tile: 2, y0: 2.4, solid: false, hull: false });
  [[-1.25, -1.2], [-1.25, 1.2]].forEach(([x, z]) => addBox(L, x, z, .6, 2, .55, { tex: 'wood', tile: 2, hull: false })); [[1.25, -2], [1.25, 2]].forEach(([x, z]) => addBox(L, x, z, .6, 1.2, .55, { tex: 'wood', tile: 2, hull: false }));
  /* the scenery sliding past the window */
  const mk = (kind) => { const c = ART.mk(1024, 256), x = c.getContext('2d'); ART.seed(kind === 'city' ? 4 : 2); const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#d8d0b4'); g.addColorStop(1, '#efe0b8'); x.fillStyle = g; x.fillRect(0, 0, 1024, 256);
    for (let l = 0; l < 3; l++) { x.beginPath(); x.moveTo(0, 256); for (let i = 0; i <= 64; i++) x.lineTo(i * 16, 150 + l * 34 - Math.abs(Math.sin(i * .35 + l * 2)) * (50 - l * 10) - Math.sin(i * 1.1 + l) * 8); x.lineTo(1024, 256); x.closePath(); x.fillStyle = ['#cdbb92', '#bda877', '#a99362'][l]; x.fill(); x.strokeStyle = '#14110e'; x.lineWidth = 4; x.stroke(); }
    if (kind === 'city') { for (let i = 0; i < 30; i++) { const w = 20 + ART.rnd() * 34, h = 30 + ART.rnd() * 60, px = i * 34 + ART.rnd() * 10; x.fillStyle = '#c4b088'; x.fillRect(px, 200 - h, w, h + 60); x.strokeRect(px, 200 - h, w, h + 60); } x.fillStyle = '#2e5d85'; x.fillRect(430, 60, 90, 150); x.strokeRect(430, 60, 90, 150); x.fillRect(560, 60, 90, 150); x.strokeRect(560, 60, 90, 150); x.fillStyle = '#c9b48c'; x.fillRect(660, 20, 160, 190); x.strokeRect(660, 20, 160, 190); }
    else for (let i = 0; i < 9; i++) { const px = 40 + i * 120 + ART.rnd() * 40; x.fillStyle = '#7d7d54'; x.fillRect(px, 130, 8, 70); x.strokeRect(px, 130, 8, 70); x.beginPath(); x.ellipse(px + 4, 126, 30, 12, 0, 0, 6.3); x.fill(); x.stroke(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; return t; };
  const sd = new THREE.Mesh(PLANE, new THREE.MeshBasicMaterial({ map: mk('desert'), fog: false })), sc = new THREE.Mesh(PLANE, new THREE.MeshBasicMaterial({ map: mk('city'), fog: false, transparent: true, opacity: 0 }));
  [sd, sc].forEach((m, i) => { m.scale.set(30, 7.5, 1); m.position.set(14 - i * .2, 3.2, 0); m.rotation.y = -PI / 2; L.scene.add(m); }); L.key = { desert: sd, city: sc };
  L.tickers.push(dt => { sd.material.map.offset.x += dt * .02 * (L.speed === undefined ? 1 : L.speed); sc.material.map.offset.x += dt * .02 * (L.speed === undefined ? 1 : L.speed); });
  /* cart contents */
  const lan = addProp(L, 'torch', -1.5, -2.4, .7, { shadow: false }); addFlame(L, -1.5, 1.7, -2.4, .5, { i: 1.1 }); addProp(L, 'amphora', 1.4, 2.2, .7, { shadow: false }); addProp(L, 'basket', -1.4, 2.2, .8, { shadow: false });
  const bundle = addProp(L, 'reeds', 0, 2.1, 1, { shadow: false }); bundle.mesh.rotation.z = 1.4; bundle.g.position.y = .1; L.key.bundle = bundle;
  L.pl[0].position.set(0, 2, 0); L.pl[0].intensity = 1.2; L.pl[0].distance = 12;
  L.spawns.main = { x: -1.1, z: 0, yaw: -PI / 2 };
  const nin = civ(L, 'handler', 1.1, 0, { name: 'Ninsun', static: true, f: PI, seated: true, hold: null, scale: .95 }); L.key.ninsun = nin; nin.fig.root.position.y = .05; nin.animate = nin.animate; return L;
}

/* ---------- Esagila ground floor: the Great Hall of Marduk ---------- */
function buildTemple0() {
  const L = interiorLevel('temple0', 'Esagila — The Great Hall', { x0: -43, x1: 43, z0: -41, z1: 40 }, { fogNear: 12, fogFar: 80, height: 16, hemi: [0xa89878, 0x302618, .3], tint: 0xa09078 });
  L.spawns = { main: { x: 0, z: 36, yaw: 0 }, fromUp: { x: 35.5, z: -6, yaw: PI / 2 }, fromCellar: { x: -35.5, z: -6, yaw: -PI / 2 } };
  floorAndCeil(L, -26, -40, 26, 24, { h: 16 }); floorAndCeil(L, -10, 24, 10, 40, { h: 10 }); floorAndCeil(L, -43, -14, -26, 2, { h: 8, floor: 'floorHouse' }); floorAndCeil(L, 26, -14, 43, 2, { h: 8, floor: 'floorHouse' });
  addFlat(L, 'carpet', 0, -8, 7, 64, .03, 1, 8);
  wallLine(L, -26, -40, 26, -40, { h: 16, t: 1.6, tex: 'temple' }); wallLine(L, -26, 24, -10, 24, { h: 16 }); wallLine(L, 10, 24, 26, 24, { h: 16 }); wallLine(L, -26, 24, -26, -40, { h: 16, gaps: [[26, 40]] }); wallLine(L, 26, 24, 26, -40, { h: 16, gaps: [[26, 40]] });
  wallLine(L, -10, 40, -10, 24, { h: 10 }); wallLine(L, 10, 40, 10, 24, { h: 10 }); wallLine(L, -10, 41, 10, 41, { h: 10 });
  wallLine(L, -43, -14, -26, -14, { h: 8 }); wallLine(L, -43, 2, -26, 2, { h: 8 }); wallLine(L, -43, -14, -43, 2, { h: 8 }); wallLine(L, 26, -14, 43, -14, { h: 8 }); wallLine(L, 26, 2, 43, 2, { h: 8 }); wallLine(L, 43, -14, 43, 2, { h: 8 });
  for (let z = -32; z <= 8; z += 8) { column(L, -11, z, 1.1, 16, 'zig'); column(L, 11, z, 1.1, 16, 'zig'); torchPair(L, -13.5, z + 4); torchPair(L, 13.5, z + 4); }
  addProp(L, 'statue', 0, -37, 4.2, { shadow: false }); addProp(L, 'spade', -6, -37, 2.2); addProp(L, 'star', 6, -37, 2.2); addBox(L, 0, -30, 5, 2, 1.2, { tex: 'stone' }); addProp(L, 'brazier', -3, -30, 1.2, { solid: .5 }); addProp(L, 'brazier', 3, -30, 1.2, { solid: .5 }); addFlame(L, -3, 1.2, -30, 1.6); addFlame(L, 3, 1.2, -30, 1.6);
  const beam = new THREE.Mesh(PLANE, L.mat(ART.fxTex('glow'), { tr: true, add: true, basic: true, tint: 0xffffff }).clone()); beam.material.opacity = .35; beam.scale.set(12, 30, 1); beam.position.set(0, 8, -16); L.scene.add(beam); L.bills.push(beam);
  [[-20, -8], [20, -8], [-20, 10], [20, 10]].forEach(([x, z]) => { addProp(L, 'pedestal', x, z, 1, { solid: .6 }); addProp(L, 'amphora', x, z, 1, { y: 1.3, shadow: false }); });
  addProp(L, 'spade', -18, 21.5, 1.6); addProp(L, 'star', 18, 21.5, 1.6); addProp(L, 'pazuzu', -38, -12, .6, { shadow: false });
  /* ground-floor people */
  const K = L.key = {}; K.kabti = civ(L, 'chamberlain', 0, 20, { name: 'Chamberlain Kabti', static: true, f: PI / 2, hold: 'staff' });
  for (let i = 0; i < 4; i++) civ(L, 'priest', -6 + i * 4, -26, { name: 'Priest', static: true, f: PI / 2, anim: { talk: 1 } });
  civ(L, 'scribe', -18, -22, { name: 'Scribe', static: true, f: 0, hold: 'tablet' }); civ(L, 'servant', 16, 6, { name: 'Servant', route: [[16, 6], [16, -20], [20, -20], [20, 6]] }); civ(L, 'citizenM', 8, -4, { name: 'Pilgrim', route: [[8, -4], [-8, -4], [-8, 10], [8, 10]] });
  const gA = guard(L, 17, -2, PI, { name: 'Guard' }), gB = guard(L, 14, -2, 0, { name: 'Guard' }); pairUp(gA, gB, { lines: [['Guard', 'The Inspector has been asking about the General from the western war.'], ['Guard', 'Asking what? He was seen by half the army.'], ['Guard', 'Asking who has seen his face in the last five years.']], flag: 'heardFace', intel: 'the Inspector will test the General with questions about the western war.' });
  guard(L, -2, 28, PI / 2); shieldG(L, 2, 28, PI / 2);
  /* east stairs up (Scriptorium) — guarded */
  K.stairUp = addInter(L, { x: 40, z: -6, r: 2.5, label: 'Climb to the Scriptorium', door: true, fn: () => G.goLevel('temple1', 'fromBelow') }); addProp(L, 'tabletshelf', 41, -12, .6, { shadow: false }); shieldG(L, 36, -9, 0); guard(L, 36, -3, 0);
  L.zones.push({ id: 'stairE', x0: 26, z0: -14, x1: 43, z1: 2, level: 1 });
  /* west door to the cellar (to the cistern) — forbidden */
  K.cellar = addInter(L, { x: -40, z: -6, r: 2.5, label: 'Slip down to the cellar', door: true, fn: () => { G.goLevel('cistern', 'fromTemple'); } }); L.zones.push({ id: 'cellar', x0: -43, z0: -14, x1: -26, z1: 2, level: 2 }); shieldG(L, -34, -2, PI); guard(L, -34, -10, PI);
  K.exit = addInter(L, { x: 0, z: 38.5, r: 2.4, label: 'Leave the temple', door: true, fn: () => G.exitTemple && G.exitTemple() });
  L.hides.push({ x: -22, z: -28, r: 1.6, label: 'Hide behind the offering jars' }); return L;
}

/* ---------- Scriptorium (floor 2) ---------- */
function buildTemple1() {
  const L = interiorLevel('temple1', 'Esagila — The Scriptorium', { x0: -42, x1: 42, z0: -32, z1: 33 }, { fogNear: 10, fogFar: 70, height: 11, hemi: [0xb09c7c, 0x30261a, .3], tint: 0xa89a7c });
  L.spawns = { fromBelow: { x: 35.5, z: 0, yaw: PI / 2 }, fromUp: { x: -35.5, z: 20, yaw: -PI / 2 } };
  floorAndCeil(L, -41, -31, 41, 32, { h: 11, floor: 'floorHouse' }); addFlat(L, 'carpet', 0, 0, 6, 62, .03, 1, 8);
  wallLine(L, -42, -32, 42, -32, { h: 11, tex: 'plaster' }); wallLine(L, -42, 33, 42, 33, { h: 11, tex: 'plaster' }); wallLine(L, -42, -32, -42, 33, { h: 11, tex: 'plaster' }); wallLine(L, 42, -32, 42, 33, { h: 11, tex: 'plaster' });
  /* inspector's study (NW) + aisles of tablet shelves */
  wallLine(L, -42, -14, -24, -14, { h: 11, gaps: [[10, 14]] }); wallLine(L, -24, -32, -24, -14, { h: 11 });
  for (const x of [-16, -6, 6, 16]) for (const z of [-24, -12, 12, 24]) { addBox(L, x, z, 1.4, 7, 3.6, { tex: 'wood', tile: 2, hullT: .06 }); addProp(L, 'tabletshelf', x, z + 3.7, 1.2, { shadow: false, flip: false }); addProp(L, 'tabletshelf', x, z - 3.7, 1.2, { shadow: false }); }
  [[-34, -22], [-30, -26]].forEach(([x, z]) => addProp(L, 'table', x, z, 1.5, { solid: 1.2, solidH: 1.1 }));
  for (let i = 0; i < 5; i++) { const x = -11 + i * 5.4; addProp(L, 'table', x, 0, 1.4, { solid: 1.1, solidH: 1.1 }); civ(L, 'scribe', x, -1.6, { name: 'Scribe', static: true, f: PI / 2, hold: 'tablet', seated: true, anim: { sit: 1 } }); }
  for (const x of [-30, 30]) for (const z of [-24, -8, 8, 24]) torchPair(L, x, z);
  const K = L.key = {}; K.friend = civ(L, 'scribe', 10, 6, { name: 'Nabû-ahu', static: true, f: PI, hold: 'scroll', lookAtPlayer: true });
  const sA = civ(L, 'scribe', -22, 8, { name: 'Scribe', static: true, f: 0 }), sB = civ(L, 'servant', -19.5, 8, { name: 'Servant', static: true, f: PI }); sA.chatWith = sB; sB.chatWith = sA; sA.d.overhear = { lines: [['Scribe', 'The secretary has the key to the Marshal\'s door. She never takes it off.'], ['Servant', 'Then how will anyone bring him wine tonight?'], ['Scribe', 'The servants go through the pantry stair. Up from the cellar, behind the hall.']], flag: 'heardPantry', intel: 'servants reach the Marshal\'s wing through a pantry stair from the cellars.' };
  guard(L, 0, 18, PI, { route: [[0, 18], [0, -20], [-4, -20], [-4, 18]] }); shieldG(L, 0, -26, PI / 2, { route: [[10, -26], [-10, -26]] });
  K.inspectorSpawn = [28, -4];
  K.down = addInter(L, { x: 39.5, z: 0, r: 2.4, label: 'Descend to the Great Hall', door: true, fn: () => G.goLevel('temple0', 'fromUp') });
  /* the stair to the Marshal's wing — closed to all but the invited */
  K.stairUp = addInter(L, { x: -39.5, z: 20, r: 2.4, label: "Climb to the Marshal's wing", door: true, fn: () => G.goLevel('temple2', 'fromBelow') });
  L.zones.push({ id: 'wingStair', x0: -42, z0: 10, x1: -32, z1: 33, level: 2 }); shieldG(L, -35, 16, 0, { name: 'Wing guard' }); shieldG(L, -35, 25, 0, { name: 'Wing guard' });
  L.hides.push({ x: -2, z: -29, r: 1.6, label: 'Crouch behind the shelves' }); L.hides.push({ x: 24, z: 28, r: 1.6, label: 'Hide in a storage basket' }); addProp(L, 'basket', 24, 28, 1.4, { solid: .5, solidH: 1 });
  return L;
}

/* ---------- the Marshal's wing (floor 3) ---------- */
function buildTemple2() {
  const L = interiorLevel('temple2', "Esagila — The Marshal's Wing", { x0: -34, x1: 34, z0: -30, z1: 30 }, { fogNear: 10, fogFar: 64, height: 10, hemi: [0xb09c7c, 0x30261a, .3], tint: 0xa89a7c });
  L.spawns = { fromBelow: { x: -28.5, z: 22, yaw: -PI / 2 }, fromPantry: { x: -28, z: 4, yaw: -PI / 2 }, fromOffice: { x: 0, z: -2, yaw: 0 } };
  floorAndCeil(L, -33, -29, 33, 29, { h: 10, floor: 'floorHouse' }); addFlat(L, 'carpet', 0, 8, 6, 36, .03, 1, 6);
  wallLine(L, -34, -30, 34, -30, { h: 10 }); wallLine(L, -34, 30, 34, 30, { h: 10 }); wallLine(L, -34, -30, -34, 30, { h: 10 }); wallLine(L, 34, -30, 34, 30, { h: 10 });
  wallLine(L, -24, 30, -24, 14, { h: 10, gaps: [[3, 8]] }); wallLine(L, -24, 14, -14, 14, { h: 10 }); /* corridor wall */
  wallLine(L, -14, 14, -14, -6, { h: 10, gaps: [] }); wallLine(L, -14, -6, 14, -6, { h: 10, gaps: [[10, 18]] }); wallLine(L, 14, -6, 14, 14, { h: 10 }); wallLine(L, -24, 14, -24, -2, { h: 10 }); wallLine(L, -34, -2, -24, -2, { h: 10, gaps: [[4, 8]] });
  [[-8, 22], [8, 22], [-8, 4], [8, 4]].forEach(([x, z]) => torchPair(L, x, z)); torchPair(L, -29, 20); torchPair(L, -29, 6);
  addProp(L, 'spade', 0, 28.6, 2); [[-30, 18], [-30, 26]].forEach(([x, z]) => addProp(L, 'amphora', x, z, 1.2, { solid: .4, solidH: 1.2 }));
  addProp(L, 'window', 16, 29.4, 2, { shadow: false }); addProp(L, 'window', -16, 29.4, 2, { shadow: false });
  const K = L.key = {}; addProp(L, 'table', 0, 14, 1.9, { solid: 1.4, solidH: 1.1 }); K.secretary = civ(L, 'secretary', 0, 12.4, { name: 'Secretary Aḫat-abūša', static: true, f: -PI / 2, hold: 'tablet', lookAtPlayer: true });
  K.wingGuards = [shieldG(L, -4, 1, -PI / 2, { name: 'Door guard' }), shieldG(L, 4, 1, -PI / 2, { name: 'Door guard' })]; guard(L, 22, 18, PI, { route: [[22, 18], [22, -2], [-10, -2], [-10, 18]] });
  L.zones.push({ id: 'wing', x0: -14, z0: -6, x1: 14, z1: 16, level: 3 });
  K.officeDoor = addInter(L, { x: 0, z: -4.2, r: 2.4, label: "Enter the Marshal's office", door: true, fn: () => G.enterOffice && G.enterOffice() });
  K.down = addInter(L, { x: -32, z: 22, r: 2.4, label: 'Descend the stair', door: true, fn: () => G.goLevel('temple1', 'fromUp') });
  K.pantry = addInter(L, { x: -32, z: 4, r: 2.4, label: 'Down the pantry stair (to the cellars)', door: true, hidden: () => !G.flags.pantryOpen, fn: () => G.goLevel('cistern', 'fromPantry') });
  addProp(L, 'amphora', -31, 2, 1.2, { solid: .4, solidH: 1.2 }); addProp(L, 'table', -29, 8, 1.2, { solid: 1, solidH: 1 });
  L.hides.push({ x: 30, z: 26, r: 1.6, label: 'Hide behind the tapestry' }); return L;
}

/* ---------- the cistern beneath the temple (dark) ---------- */
function buildCistern() {
  const L = interiorLevel('cistern', 'The Cistern of Apsu', { x0: -40, x1: 40, z0: -48, z1: 37 }, { dark: true, fog: 0x0a0807, fogNear: 6, fogFar: 44, height: 12, hemi: [0x8a7a64, 0x30261c, .9], tint: 0x8a7a64, mapScale: 2.2, lampK: 2.2 });
  L.spawns = { fromTemple: { x: -34, z: 30, yaw: -PI / 2 }, fromPantry: { x: 20, z: -41, yaw: PI } };
  addFlat(L, 'cobble', 0, -6, 80, 85, 0, 10, 10); addCeiling(L, -40, -48, 40, 37, 12);
  wallLine(L, -40, -48, 40, -48, { h: 12, tex: 'temple' }); wallLine(L, -40, 37, 40, 37, { h: 12, tex: 'temple' }); wallLine(L, -40, -48, -40, 37, { h: 12, tex: 'temple' }); wallLine(L, 40, -48, 40, 37, { h: 12, tex: 'temple' });
  const pool = (x0, z0, x1, z1) => { addFlat(L, 'water', (x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, -.35, (x1 - x0) / 6, (z1 - z0) / 6); L.solidBox((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, .6, { map: true, glass: true }); };
  pool(-40, -48, -14, 26); pool(-6, -48, 16, -4); pool(-6, 4, 40, 37); pool(24, -48, 40, 4);
  for (const [x, z] of [[-10, 14], [-10, -20], [8, 0], [20, -10], [-30, 30], [30, -30], [4, -30], [-24, -10], [-24, 10], [20, 20]]) column(L, x, z, 1.1, 12, 'temple');
  L.pl[0].color.setHex(0xffa860);
  lampPost(L, -36, 27, 1.2); lampPost(L, -10, 6, 1); lampPost(L, 20, -40, 1.1); addProp(L, 'pazuzu', -10, -10, 1.4, { shadow: false });
  for (const [x, z] of [[-26, 29], [-20, 31], [-14, 29]]) addProp(L, 'skull', x, z, 1.2); addProp(L, 'reeds', -4, 20, 1.4); addProp(L, 'reeds', 22, 8, 1.2);
  const K = L.key = {}; K.patrol = guard(L, -16, 30, 0, { route: [[-16, 30], [-8, 30], [-10, 18], [-10, 4], [-4, 0], [16, 0], [-10, 0]], hold: 'torch', T: { view: 14, spd: 1.8 } }); K.patrol.fig.setOff(null);
  K.ladder = addInter(L, { x: 20, z: -45.5, r: 2.4, label: 'Climb the service ladder', door: true, fn: () => { G.flags.pantryOpen = true; G.goLevel('temple2', 'fromPantry'); } });
  K.stairOut = addInter(L, { x: -38, z: 30, r: 2.4, label: 'Climb back to the temple', door: true, fn: () => G.goLevel('temple0', 'fromCellar') });
  L.hides.push({ x: -22, z: 32, r: 1.6, label: 'Press into the shadows' }); L.hides.push({ x: 8, z: -2, r: 1.6, label: 'Wait behind the column' }); return L;
}

/* ---------- the Marshal's office (the banquet) ---------- */
function buildOffice() {
  const L = interiorLevel('office', "The Marshal's Office", { x0: -8.5, x1: 8.5, z0: -7.5, z1: 7.5 }, { fogNear: 7, fogFar: 36, height: 6, hemi: [0xb09c7c, 0x30261a, .3], tint: 0xb4a284, mapScale: 5 }); L.o.dark = false;
  L.spawns = { main: { x: 0, z: 6, yaw: 0 } }; floorAndCeil(L, -9, -8, 9, 8, { h: 6, floor: 'floorHouse' }); addFlat(L, 'carpet', 0, 0, 7, 11, .03, 1, 2);
  wallLine(L, -9, -8, 9, -8, { h: 6, tex: 'plaster', hull: false, t: .8 }); wallLine(L, -9, 8, 9, 8, { h: 6, tex: 'plaster', hull: false, t: .8 }); wallLine(L, -9, -8, -9, 8, { h: 6, tex: 'plaster', hull: false, t: .8 }); wallLine(L, 9, -8, 9, 8, { h: 6, tex: 'plaster', hull: false, t: .8 });
  const K = L.key = {}; addBox(L, 0, -3, 4.2, 1.6, .95, { tex: 'wood', tile: 2, hull: true, hullT: .04 }); addBox(L, 0, -3, 4.4, 1.7, .08, { tex: 'carpet', y0: .95, solid: false, hull: false });
  K.cupG = [0, 1.05, -2.5]; K.cupP = [.9, 1.05, -2.2];
  addProp(L, 'window', 7.6, -1, 2.2, { shadow: false }); const win = new THREE.Mesh(PLANE, new THREE.MeshBasicMaterial({ map: ART.surf('sand', 1, 1), color: 0xd8c8a0 })); win.visible = false;
  addProp(L, 'spade', -6.6, -6.8, 1.5); addProp(L, 'star', 6.6, -6.8, 1.5); addProp(L, 'tabletshelf', -5.5, -7.2, 1.4, { shadow: false }); addProp(L, 'statue', 5.5, -6.6, .9, { shadow: false });
  [[-8, -1], [-8, 3], [7.5, 4], [-3, -6.6], [3, -6.6]].forEach(([x, z]) => { lampPost(L, x, z, .95); });
  addProp(L, 'stool', 0, 3.6, 1.2, { shadow: false }); addProp(L, 'stool', 0, -4.7, 1.3, { shadow: false });
  K.general = civ(L, 'general', 0, -4.6, { name: 'Marshal Rimut-Marduk', static: true, f: PI / 2, hold: null, seated: true, T: { hp: 140 }, noTurn: true }); K.general.fig.pose({ sit: 1 }); K.general.keepFacing = true; K.general.fig.facing = -1;
  K.g1 = shieldG(L, -6.2, -3.2, 0, { static: true }); K.g2 = shieldG(L, 6.2, -3.6, PI, { static: true }); K.servant = civ(L, 'servant', 3.2, -5.8, { name: 'Servant', static: true, f: PI / 2, hold: 'jar' });
  L.key.ledger = addInter(L, { x: -3.6, z: -6.2, r: 2.2, label: "Search the Marshal's desk-chest", hidden: () => !G.flags.generalDead, fn: () => G.takeLedger && G.takeLedger() });
  L.key.window = addInter(L, { x: 7, z: -1, r: 2.2, label: 'Climb out of the window', hidden: () => !G.items.ledger, door: true, fn: () => G.startEscape && G.startEscape() });
  return L;
}

/* ---------- the rooftops (escape) ---------- */
function buildRoof() {
  const L = new Level('roof', { name: 'The Rooftops of Babylon', sky: 'skyDusk', fog: 0xb98e68, fogNear: 50, fogFar: 420, bounds: { x0: -26, x1: 26, z0: -170, z1: 20 }, hemi: [0xe8c8a0, 0x5a4a3a, .42], sunC: 0xffb878, sunI: .5, sunDir: [-80, 25, -40], tint: 0xd8bc98, camDist: 6.4, mapScale: 1.5 });
  L.spawns = { window: { x: 0, z: 10, yaw: 0 }, end: { x: 0, z: -160, yaw: 0 } }; ART.seed(909);
  const ground = new THREE.Mesh(FLAT, L.mat(ART.surf('cobble', 80, 80))); ground.scale.set(1600, 1, 1600); ground.position.set(0, -70, -70); L.scene.add(ground);
  skyline(L, 420, 40, 340, 55, [0, -75, 60, 130]); paperRidge(L, 560, 10, 40, 0xb08a68, 5); paperRidge(L, 480, 8, 28, 0x9a7a58, 9);
  const sunG = new THREE.Mesh(PLANE, L.mat(ART.fxTex('glow'), { tr: true, add: true, basic: true, tint: 0xffffff })); sunG.scale.set(220, 220, 1); sunG.position.set(-300, 20, -250); L.scene.add(sunG); L.bills.push(sunG);
  const roof = (x0, z0, x1, z1, y = 0) => { addBox(L, (x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, 1.2, { tex: 'stone', y0: -1.2, solid: false, hullT: .1, topTex: 'road' }); };
  roof(-26, -170, 26, 20);
  const parapet = (x0, z0, x1, z1) => addBox(L, (x0 + x1) / 2, (z0 + z1) / 2, Math.max(.8, x1 - x0), Math.max(.8, z1 - z0), 1.7, { tex: 'zig', tile: 3, hullT: .06 });
  parapet(-27, -170, -26, 20); parapet(26, -170, 27, 20); parapet(-26, 20, 26, 21);
  /* buildings forming cover and chokepoints along the run */
  for (const [x, z, w, d, h] of [[-14, -20, 8, 14, 5], [14, -30, 8, 16, 5], [-12, -56, 10, 14, 5], [13, -70, 9, 10, 5], [-14, -92, 8, 18, 5], [12, -110, 10, 14, 5], [-10, -134, 12, 10, 5]]) addBox(L, x, z, w, d, h, { tex: 'mudDark', tile: 3 });
  [[0, -12], [-2, -46], [2, -80], [0, -124]].forEach(([x, z]) => { addProp(L, 'brazier', x, z, 1.3, { solid: .6 }); addFlame(L, x, 1.5, z, 1.6); });
  for (let z = 5; z > -150; z -= 12) { lampPost(L, -24, z, 1.1); lampPost(L, 24, z - 6, 1.1); }
  addProp(L, 'amphora', -4, -34, 1.3, { solid: .4, solidH: 1.2 }); addProp(L, 'basket', 5, -64, 1.4, { solid: .5, solidH: 1 }); addProp(L, 'basket', -3, -100, 1.4, { solid: .5, solidH: 1 }); addProp(L, 'crate', 4, -118, 1.3, { solid: .6, solidH: 1.1 });
  addProp(L, 'spade', -22, -168, 2); addProp(L, 'star', 22, -168, 2);
  const K = L.key = {}; archerG(L, -14, -8, PI / 2, {}); archerG(L, 16, -26, PI / 2); shieldG(L, 0, -38, PI / 2, { route: [[-6, -38], [6, -38]] }); shieldG(L, -4, -66, PI / 2); guard(L, 6, -66, PI / 2); archerG(L, 8, -86, PI / 2); archerG(L, -10, -88, PI / 2); guard(L, 0, -104, PI / 2); shieldG(L, 4, -104, PI / 2); archerG(L, -6, -120, PI / 2);
  K.captain = spawnNPC(L, { type: 'captain', fig: 'captain', x: 0, z: -148, f: PI / 2, name: 'Captain Ṣilli-Adad', hold: 'spear', off: 'shield' });
  K.leap = addInter(L, { x: 0, z: -166, r: 3, label: 'Leap into the Euphrates', door: true, hidden: () => !G.flags.roofClear, fn: () => G.finishEscape && G.finishEscape() });
  L.hides.push({ x: -22, z: -50, r: 1.6, label: 'Duck behind the parapet' }); return L;
}

/* ---------- the quay (epilogue) ---------- */
function buildDock() {
  const L = new Level('dock', { name: 'The Euphrates', sky: 'skyDusk', fog: 0x8a6a58, fogNear: 30, fogFar: 300, bounds: { x0: -20, x1: 20, z0: -20, z1: 20 }, hemi: [0xd0b898, 0x4a4a4a, .5], sunC: 0xffb070, sunI: .5, sunDir: [-60, 20, -30], tint: 0xd0b898 });
  L.spawns = { main: { x: 0, z: 0, yaw: 0 } }; addFlat(L, 'water', 0, 0, 800, 800, -.5, 100, 100); paperRidge(L, 300, 8, 30, 0x9a7a58, 4); skyline(L, 220, 120, 280, 77);
  L.key = {}; const bt = addProp(L, 'boat', 0, -4, 1.8, { shadow: false, y: -.2 }); L.key.boat = bt;
  [-6, 6].forEach(x => { lampPost(L, x, 6, 1.3); }); L.key.nin = civ(L, 'handler', 1.2, -3.6, { name: 'Ninsun', static: true, f: PI / 2, scale: .95 }); L.key.nin.fig.root.position.y = .15; L.tickers.push(dt => { bt.g.position.y = -.2 + Math.sin(G.time * 1.4) * .08; bt.p.rotation.z = Math.sin(G.time * .9) * .02; });
  return L;
}
