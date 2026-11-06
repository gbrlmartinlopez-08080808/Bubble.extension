/* ============================================================
   INK OF BABYLON — world.js
   Builds the open city of Babylon, the interiors, and the Esagila temple.
   ============================================================ */
'use strict';
const PI = Math.PI;
let _tent = null;
function tentTexture() {
  if (_tent) return _tent;
  const c = ART.mk(256, 128), x = c.getContext('2d');
  for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#efe7d2' : '#b5412e'; x.fillRect(i * 32, 0, 32, 128); }
  x.strokeStyle = '#1c1a17'; x.lineWidth = 3; for (let i = 0; i <= 8; i++) { x.beginPath(); x.moveTo(i * 32, 0); x.lineTo(i * 32 + 2, 128); x.stroke(); }
  _tent = ART.texOf(c, true); return _tent;
}
function addTent(L, x, z, s = 1) {
  const g = new THREE.ConeGeometry(3.2 * s, 3.8 * s, 9, 1, true);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tentTexture(), side: THREE.DoubleSide, color: L.tint }));
  m.position.set(x, 1.9 * s, z); m.rotation.y = Math.random() * 6; L.scene.add(m);
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(g), L.lineMat); e.position.copy(m.position); e.rotation.y = m.rotation.y; L.scene.add(e);
  L.solidCirc(x, z, 2.7 * s, 3.5, { map: true });
  addProp(L, 'banner', x + 2.4 * s, z + 2.2 * s, .55, { sway: true });
  return m;
}

/* free-spot test for scatter decor */
function freeSpot(L, x, z, r, extra) {
  for (const s of L.solids) {
    if (s.r !== undefined) { if (Math.hypot(x - s.cx, z - s.cz) < r + s.r) return false; }
    else if (x > s.x0 - r && x < s.x1 + r && z > s.z0 - r && z < s.z1 + r) return false;
  }
  if (extra) for (const p of extra) if (Math.hypot(x - p[0], z - p[1]) < p[2] + r) return false;
  return true;
}

/* ============================================================ OPEN WORLD */
function buildWorld() {
  const L = new Level('world', { name: 'Babylon', fog: 0xefdfb2, fogNear: 50, fogFar: 185, bounds: { x0: -72, x1: 62, z0: -90, z1: 86 }, camDist: 6.8, mapScale: 1.6 });
  ART.seed(2024); const R = ART.rnd, rr = (a, b) => a + R() * (b - a);
  L.interDoors = [];

  /* ground, road, backdrop */
  addFlat(L, 'sand', 0, 0, 520, 520, 0, 62, 62);
  addFlat(L, 'road', 0, 25, 7.4, 124, .02, 1, 17);
  addFlat(L, 'road', 0, -60, 40, 48, .015, 6, 7);          // temple courtyard paving
  addFlat(L, 'road', -20, 52, 24, 3.4, .02, 4, .5);        // alley to home
  addFlat(L, 'road', 17, 42, 22, 3.4, .02, 4, .5);         // alley to tavern
  const hills = new THREE.Mesh(new THREE.CylinderGeometry(210, 210, 64, 48, 1, true), new THREE.MeshBasicMaterial({ map: (() => { const t = ART.plainCanvasTex('hills'); t.wrapS = THREE.RepeatWrapping; t.repeat.set(2, 1); return t; })(), side: THREE.BackSide, transparent: true, alphaTest: .5, fog: false }));
  hills.position.set(0, 27, 0); L.scene.add(hills); L.hills = hills;
  const river = new THREE.Mesh(FLAT, L.mat(ART.surf('water', 10, 60), { tint: 0xffffff })); river.scale.set(70, 1, 240); river.position.set(98, .05, 0); L.scene.add(river);
  for (let i = 0; i < 40; i++) addProp(L, 'tuft', rr(63, 66), rr(-90, 88), rr(1, 1.5));
  for (let i = 0; i < 7; i++) { const c = addProp(L, 'cloud', rr(-170, 170), rr(-170, 100), rr(.8, 1.5), { y: rr(46, 70), shadow: false, sway: false }); }

  /* ---- Ishtar Gate ---- */
  addBox(L, -8, 10, 8, 8, 16, { tex: 'blue' }); addBox(L, 8, 10, 8, 8, 16, { tex: 'blue' });
  addBox(L, 0, 10, 8.2, 5.5, 3.6, { tex: 'blue', y0: 9.2, solid: false });
  addBox(L, 0, 10, 9, 6.4, .8, { tex: 'stone', y0: 12.8, solid: false });
  addCrenel(L, -12, 6, -4, 6, 16, 'blue'); addCrenel(L, 4, 6, 12, 6, 16, 'blue'); addCrenel(L, -12, 14, -4, 14, 16, 'blue'); addCrenel(L, 4, 14, 12, 14, 16, 'blue');
  addBox(L, 30, 10, 36, 3, 7, { tex: 'mud' }); addBox(L, -30, 10, 36, 3, 7, { tex: 'mud' });
  addCrenel(L, 12, 10, 48, 10, 7); addCrenel(L, -12, 10, -48, 10, 7);
  addBox(L, -64, 10, 16, 1.6, 2.8, { tex: 'wood', tile: 3, map: true }); addBox(L, 57, 10, 10, 1.6, 2.8, { tex: 'wood', tile: 3 });
  addProp(L, 'statue', -4.6, 20, 1, { solid: 1.2 }); addProp(L, 'statue', 4.6, 20, 1, { solid: 1.2, flip: true });
  addProp(L, 'banner', -5.2, 4, 1); addProp(L, 'banner', 5.2, 4, 1);

  /* ---- Processional Way furniture ---- */
  for (let z = 70; z > -32; z -= 14) { addProp(L, 'stele', -4.8, z, 1, { solid: .6 }); addProp(L, 'torch', 4.8, z - 7, 1); }
  for (let z = -4; z > -32; z -= 12) { addProp(L, 'bannerLong', -4.6, z, 1.1); addProp(L, 'bannerLong', 4.6, z - 6, 1.1); }

  /* ---- crusader camp (north of the gate) ---- */
  [[-22, -4], [-32, -14], [-18, -24], [22, -4], [31, -16], [18, -26], [-44, -6], [44, -8], [-40, -26], [40, -28]].forEach(([x, z], i) => addTent(L, x, z, i % 3 ? 1 : 1.25));
  [[-22, -12], [24, -14], [0, -17]].forEach(([x, z]) => { addProp(L, 'campfire', x, z, 1); addFlame(L, x, .1, z, 1.2); [[-2, 1.5], [2, 1.8]].forEach(([dx, dz]) => addProp(L, 'stool', x + dx, z + dz, 1, { shadow: false })); });
  [[-10, -8], [10, -6], [-12, -27], [12, -29], [-26, 2], [27, 1]].forEach(([x, z]) => addBox(L, x, z, 5.4, 1.2, 2.7, { tex: 'wood', tile: 3, topTex: 'wood' }));
  [[-26, -20], [-26, -21.2], [27, -8], [29, -9], [-3, -33], [3, -33]].forEach(([x, z], i) => addProp(L, i % 2 ? 'barrel' : 'crate', x, z, 1, { solid: .55, solidH: 1 }));

  /* ---- south district: enterable buildings ---- */
  const placed = [];
  const house = (x, z, w, d, h, tex, face, opt = {}) => {
    addBox(L, x, z, w, d, h, { tex });
    addBox(L, x, z, w + .6, d + .6, .5, { tex: 'stone', y0: h, solid: false });
    placed.push([x, z, Math.max(w, d) * .5 + 1.8]);
    const dx = face === 'e' ? w / 2 : face === 'w' ? -w / 2 : 0, dz = face === 's' ? d / 2 : face === 'n' ? -d / 2 : 0;
    addDoorDecal(L, x + dx, z + dz, face, opt.door || 'door');
    const px = x + dx + (face === 'e' ? 1.5 : face === 'w' ? -1.5 : 0), pz = z + dz + (face === 's' ? 1.5 : face === 'n' ? -1.5 : 0);
    return { px, pz, x, z };
  };
  const home = house(-34, 66, 6.4, 6.4, 3.6, 'mudDark', 'e');
  addProp(L, 'jar', -30.2, 63, 1); addProp(L, 'palm', -37.5, 61, 1);
  const scribe = house(-27, 38, 8.4, 8.4, 4.4, 'mud', 'e');
  addProp(L, 'stele', -21, 33.6, .8); addProp(L, 'jar', -21.6, 42, 1);
  const tavern = house(27, 44, 10, 9, 4.2, 'mud', 'w');
  addProp(L, 'sign', 19.4, 48, 1); addProp(L, 'barrel', 21.4, 39.4, 1, { solid: .5, solidH: 1 }); addProp(L, 'barrel', 22.6, 39.4, 1, { solid: .5, solidH: 1 });

  const door = (b, id, label, to, spawn, ret) => { const i = addInter(L, { x: b.px, z: b.pz, r: 2.1, label, door: true, fn: () => enterBuilding(to, spawn, { x: b.px, z: b.pz, yaw: ret }) }); L.interDoors.push(i); return i; };
  door(home, 'home', 'Enter your safehouse', 'home', 'main', -PI / 2);
  door(scribe, 'scribe', "Enter the Scribe's House", 'scribe', 'main', -PI / 2);
  door(tavern, 'tavern', 'Enter the House of Beer', 'tavern', 'main', PI / 2);
  L.homePos = { x: home.px, z: home.pz }; L.tavernPos = { x: tavern.px, z: tavern.pz };

  /* decorative houses (closed doors) */
  let tries = 0, n = 0;
  while (n < 15 && tries++ < 400) {
    const side = R() < .5 ? -1 : 1, x = side * rr(14, 58), z = rr(20, 82), w = rr(5, 8.5), d = rr(5, 8.5);
    if (x > 56 || x < -66 || Math.abs(x) < 9) continue;
    if (!freeSpot(L, x, z, Math.max(w, d) * .5 + 2.6, placed)) continue;
    const h = rr(3.2, 5.2), face = side < 0 ? 'e' : 'w';
    house(x, z, w, d, h, R() < .5 ? 'mud' : 'mudDark', face, { door: R() < .5 ? 'curtain' : 'door' }); n++;
    if (R() < .6) addProp(L, 'jar', x + (side < 0 ? w / 2 + 1 : -w / 2 - 1), z + rr(-2, 2), 1);
  }
  /* decor scatter */
  const sp = (key, cnt, x0, x1, z0, z1, rad, s0, s1, o) => { let k = 0, t = 0; while (k < cnt && t++ < cnt * 12) { const x = rr(x0, x1), z = rr(z0, z1); if (Math.abs(x) < 5.5 && z > -38 && z < 80 && key !== 'tuft' && key !== 'flower') continue; if (!freeSpot(L, x, z, rad, placed)) continue; addProp(L, key, x, z, rr(s0, s1), o); k++; } };
  sp('palm', 38, -70, 60, -88, 84, 2.4, .85, 1.2, { solid: .45, solidH: 3 });
  sp('bush', 22, -70, 60, -88, 84, 2, .8, 1.3);
  sp('rock', 20, -70, 60, -88, 84, 1.6, .8, 1.8, { solid: .8, solidH: 1 });
  sp('tuft', 180, -70, 62, -88, 86, .6, .8, 1.4);
  sp('flower', 110, -70, 62, -88, 86, .6, .8, 1.3);
  sp('skull', 4, -60, 55, -40, 60, 1, .8, 1);

  /* ---- temple precinct (Esagila) ---- */
  addBox(L, -16, -36, 20, 2, 8.5, { tex: 'stone' }); addBox(L, 16, -36, 20, 2, 8.5, { tex: 'stone' });
  addBox(L, -6, -36, 4, 4, 12, { tex: 'blue' }); addBox(L, 6, -36, 4, 4, 12, { tex: 'blue' });
  addBox(L, 0, -36, 4.4, 4, 2.6, { tex: 'blue', y0: 9.4, solid: false });
  addCrenel(L, -8, -38, -4, -38, 12, 'blue'); addCrenel(L, 4, -38, 8, -38, 12, 'blue');
  addCrenel(L, -26, -36, -8, -36, 8.5, 'stone'); addCrenel(L, 8, -36, 26, -36, 8.5, 'stone');
  addBox(L, -26, -61, 2, 51, 8.5, { tex: 'stone' }); addBox(L, 26, -61, 2, 51, 8.5, { tex: 'stone' }); addBox(L, 0, -86, 54, 2, 8.5, { tex: 'stone' });
  addCrenel(L, -26, -36, -26, -86, 8.5, 'stone'); addCrenel(L, 26, -36, 26, -86, 8.5, 'stone');
  /* ziggurat */
  addBox(L, 0, -66, 30, 26, 3.4, { tex: 'zig', topTex: 'zig' });
  addBox(L, 0, -67, 24, 20, 3.4, { tex: 'zig', y0: 3.4, solid: false }); addBox(L, 0, -68, 18, 15, 3.4, { tex: 'zig', y0: 6.8, solid: false });
  addBox(L, 0, -69, 12, 10, 3.4, { tex: 'zig', y0: 10.2, solid: false }); addBox(L, 0, -69.5, 7, 6, 3.6, { tex: 'blue', y0: 13.6, solid: false });
  addCrenel(L, -3.5, -72.5, 3.5, -72.5, 17.2, 'blue');
  addDoorDecal(L, 0, -53, 's', 'door', 2.6, 3.1);
  addProp(L, 'statue', -5.4, -50.4, 1.1, { solid: 1.2 }); addProp(L, 'statue', 5.4, -50.4, 1.1, { solid: 1.2, flip: true });
  [[-10, -46], [10, -46], [-18, -70], [18, -70]].forEach(([x, z]) => { addProp(L, 'brazier', x, z, 1.1, { solid: .5 }); addFlame(L, x, 1.05, z, 1.2); });
  [[-8, -41], [8, -41]].forEach(([x, z]) => addProp(L, 'statue', x, z, 1.1, { solid: 1.2, flip: x > 0 }));
  [[-21, -44], [21, -44], [-21, -78], [21, -78], [-22, -60], [22, -60]].forEach(([x, z]) => addProp(L, 'palm', x, z, 1.05, { solid: .45, solidH: 3 }));
  [[-12, -40], [12, -40], [-20, -52], [20, -52], [-20, -84], [20, -84]].forEach(([x, z]) => addProp(L, 'bannerLong', x, z, 1.2));
  [[-13, -52], [13, -52], [-16, -79]].forEach(([x, z]) => addProp(L, 'jar', x, z, 1.1, { solid: .4, solidH: 1.2 }));
  const mainDoor = addInter(L, { x: 0, z: -51.2, r: 2.3, label: 'Enter the Esagila temple', door: true, temple: true, fn: () => enterBuilding('temple', 'main', { x: 0, z: -51, yaw: -PI / 2 }) });
  L.interDoors.push(mainDoor);
  /* hidden service door in the east wall (water-carriers' door) + cistern */
  addDoorDecal(L, 27, -72, 'e', 'door', 2, 2.8);
  addProp(L, 'jar', 28.4, -69, 1.1); addProp(L, 'jar', 28.6, -75, 1.1); addProp(L, 'palm', 32, -66, 1.1, { solid: .45, solidH: 3 }); addProp(L, 'bush', 31, -78, 1);
  addBox(L, 33, -73, 4, 3, .7, { tex: 'stone', topTex: 'water', edges: true });
  const sideDoor = addInter(L, { x: 28.4, z: -72, r: 2.3, label: "Slip through the water-carriers' door", door: true, side: true, hidden: () => !(G.flags.rumor || (P.skills && P.skills[2] >= 2)), fn: () => enterBuilding('temple', 'side', { x: 28.4, z: -72, yaw: 0 }) });
  L.sideDoor = sideDoor;

  /* ---- pickups & loot ---- */
  [[-24, -18], [26, -9], [-48, 60], [51, 66], [-20, -60], [20, -73], [-64, 22], [48, 20]].forEach(([x, z]) => addLoot(L, 'chest', x, z));
  [['eye', -62, 70], ['clover', 55, -48], ['sun', -58, -58], ['sword', 38, 72]].forEach(([t, x, z]) => spawnPickup(L, t, 1, x, z));
  for (let i = 0; i < 14; i++) { const x = rr(-60, 56), z = rr(-34, 80); if (freeSpot(L, x, z, 1.5, placed)) spawnPickup(L, 'coin', 1 + ((R() * 3) | 0), x, z); }
  spawnPickup(L, 'bolt', 4, -8, 56); spawnPickup(L, 'bolt', 4, 36, 26); spawnPickup(L, 'herb', 20, -46, 30);

  /* ---- people ---- */
  const S = (k, x, z, o) => spawnActor(L, k, x, z, o);
  S('spear', -3, 16, { f: PI / 2, idle: true }); S('spear', 3, 16, { f: PI / 2, idle: true }); S('archer', 0, 20, { f: PI / 2, idle: true });
  S('sword', -2.6, 4, { route: [[-2.6, 4], [-2.6, -24], [2.6, -24], [2.6, 4]] });
  S('sword', -26, -10, { f: 0, idle: true }); S('sword', -19, -15, { f: PI, idle: true });
  S('sword', 21, -11, { f: PI, idle: true }); S('sword', 26, -17, { f: PI, idle: true });
  S('spear', -34, -6, { route: [[-34, -6], [-34, -25], [-12, -25], [-12, -6]] });
  S('archer', 12, -30, { f: PI / 2, idle: true }); S('archer', -12, -31, { f: PI / 2, idle: true });
  S('spear', -2.4, -34, { f: PI / 2, idle: true }); S('spear', 2.4, -34, { f: PI / 2, idle: true });
  S('sword', -14, -32, { route: [[-14, -32], [14, -32]] });
  S('sword', -19, -49, { route: [[-19, -49], [19, -49], [19, -83], [-19, -83]] });
  S('sword', 19, -83, { route: [[19, -83], [-19, -83], [-19, -49], [19, -49]] });
  S('spear', -4, -49, { f: PI / 2, idle: true }); S('spear', 4, -49, { f: PI / 2, idle: true });
  S('archer', -14, -43, { f: 0, idle: true });
  S('spear', 49, 12, { f: PI / 2, idle: true }); S('sword', 54, 15, { f: PI / 2, idle: true });
  S('spear', -50, 13, { f: PI / 2, idle: true }); S('sword', -53, 17, { f: PI / 2, idle: true });
  S('fox', -62, 40, { rival: true, name: 'Fox', route: [[-62, 40], [-56, 20], [-60, 0], [-52, -16], [-62, 30]] });
  S('rabbit', 54, 32, { rival: true, name: 'Rabbit', route: [[54, 32], [50, 50], [40, 70], [55, 60]] });
  S('bird', -56, -30, { rival: true, name: 'Bird', route: [[-56, -30], [-44, -60], [-34, -78], [-50, -70]] });
  S('dog', 46, -40, { rival: true, name: 'Dog', route: [[46, -40], [40, -64], [34, -82], [52, -60]] });
  return L;
}

/* loot containers */
function addLoot(L, kind, x, z) {
  const b = addProp(L, 'chest', x, z, 1, { solid: .55, solidH: 1 });
  addInter(L, { x, z, r: 1.9, label: 'Open the chest', once: true, fn(it) { openLoot(L, x, z); it.dead = true; b.g.visible = false; } });
}
function openLoot(L, x, z) {
  Aud.sfx('pick'); FX.paper(x, 1, z, 12); addXP(5);
  const lk = 1 + P.skills[1] * .22;
  spawnPickup(L, 'coin', Math.round(rand(3, 8) * lk), x + .8, z + .3);
  if (Math.random() < .7) spawnPickup(L, 'bolt', 3 + (Math.random() * 3 | 0), x - .8, z + .2);
  if (Math.random() < .35 + P.skills[1] * .1) spawnPickup(L, 'bomb', 1, x, z + 1);
  if (Math.random() < .3) spawnPickup(L, 'herb', 25, x + .3, z - 1);
  if (Math.random() < .12 + P.skills[1] * .06) spawnPickup(L, pick(['eye', 'clover', 'sun', 'sword']), 1, x - .4, z - 1.2);
}

/* ============================================================ INTERIOR ROOMS */
function roomShell(id, name, w, d, o = {}) {
  const L = new Level(id, { name, dark: true, indoor: true, tint: o.tint || 0xe2d2b0, fog: 0x1d1610, fogNear: 14, fogFar: 46, bounds: { x0: -w / 2 + .9, x1: w / 2 - .9, z0: -d / 2 + .9, z1: d / 2 - .9 }, camDist: 6.2, mapScale: 3.1 });
  L.camMinPitch = .66; ART.seed(ART.hash(id));
  addFlat(L, 'floorHouse', 0, 0, w, d, 0, w / 4, d / 4);
  const t = 1.2, h = 5.2;
  addBox(L, 0, -d / 2 - t / 2 + .0, w + t * 2, t, h, { tex: 'mudDark', tile: 3 }); addBox(L, 0, d / 2 + t / 2, w + t * 2, t, h, { tex: 'mudDark', tile: 3 });
  addBox(L, -w / 2 - t / 2, 0, t, d, h, { tex: 'mudDark', tile: 3 }); addBox(L, w / 2 + t / 2, 0, t, d, h, { tex: 'mudDark', tile: 3 });
  addDoorDecal(L, 0, d / 2, 'n', 'door', 2.4, 3.2);
  return L;
}
function exitInter(L, d, label = 'Step outside') { return addInter(L, { x: 0, z: d / 2 - 1.3, r: 1.7, label, door: true, exit: true, fn: () => exitBuilding() }); }
function addTorchFlame(L, x, z) { addProp(L, 'torch', x, z, 1.1); addFlame(L, x, 2.5, z, 1); addLightPool(L, x, z + .6, 4, .35); }

function buildHome() {
  const w = 12, d = 9, L = roomShell('home', 'Your Safehouse', w, d);
  L.spawns = { main: { x: 0, z: d / 2 - 3.8, yaw: PI } }; exitInter(L, d, 'Step outside');
  addProp(L, 'bed', -3.6, -2.6, 1.4, { solid: 1.3, solidH: 1 }); addProp(L, 'shelf', 4.4, -d / 2 + .8, 1, { shadow: false });
  addProp(L, 'table', 1.2, -1.2, 1.4, { solid: 1, solidH: 1 }); addProp(L, 'stool', -.6, .2, 1); addProp(L, 'jar', -5, 2.6, 1.1); addProp(L, 'barrel', 5, 2.4, 1, { solid: .5, solidH: 1 });
  addTorchFlame(L, -4.6, -3.6); addTorchFlame(L, 4.8, 0);
  addProp(L, 'bannerLong', -1.4, -d / 2 + .5, 1.1, { shadow: false });
  addInter(L, { x: 1.2, z: .5, r: 2.3, label: 'Planning table  (stash gold · resupply)', fn: () => homeMenu() });
  addInter(L, { x: 4.6, z: 3.4, r: 1.8, label: 'Lie down and rest  (+sanity)', fn: () => { P.san = Math.min(100, P.san + 25); UI.toast('You steady your breathing. <b>+25 sanity</b>'); Aud.sfx('pick'); } });
  return L;
}
function buildScribe() {
  const w = 12, d = 9, L = roomShell('scribe', "The Scribe's House (Edubba)", w, d);
  L.spawns = { main: { x: 0, z: d / 2 - 3.8, yaw: PI } }; exitInter(L, d);
  addProp(L, 'shelf', -3.6, -d / 2 + .8, 1.1, { shadow: false }); addProp(L, 'shelf', 0, -d / 2 + .8, 1.1, { shadow: false }); addProp(L, 'shelf', 3.6, -d / 2 + .8, 1.1, { shadow: false });
  addProp(L, 'table', 0, -1.8, 1.7, { solid: 1.2, solidH: 1 }); addProp(L, 'tablet', -.8, -1.4, 1.2, { y: 1.1, shadow: false }); addProp(L, 'tablet', .9, -1.6, 1, { y: 1.1, shadow: false });
  addProp(L, 'stele', -4.8, 1, 1); addProp(L, 'jar', 4.8, 1.4, 1.1);
  addTorchFlame(L, -5, -2.8); addTorchFlame(L, 5, -2.8);
  const sc = spawnActor(L, 'scribe', 0, -3.4, { npc: true, f: PI / 2, name: 'Nabu the Scribe' });
  addInter(L, { x: 0, z: -2.2, r: 3, label: 'Talk to Nabu the scribe', fn: () => scribeMenu() });
  return L;
}
function buildTavern() {
  const w = 16, d = 11, L = roomShell('tavern', 'The House of Beer', w, d);
  L.spawns = { main: { x: 0, z: d / 2 - 3.8, yaw: PI } }; exitInter(L, d);
  for (let i = -2; i <= 2; i++) addProp(L, 'table', i * 1.9, -2.7, 1.2, { shadow: false });
  L.solids.push({ x0: -4.8, x1: 4.8, z0: -3.4, z1: -2.2, h: 1.2, active: true, map: false });
  addProp(L, 'shelf', -5.6, -d / 2 + .8, 1, { shadow: false }); addProp(L, 'shelf', 5.6, -d / 2 + .8, 1, { shadow: false });
  addProp(L, 'barrel', -7, -3, 1.2, { solid: .55, solidH: 1 }); addProp(L, 'barrel', 7, -3, 1.2, { solid: .55, solidH: 1 }); addProp(L, 'barrel', 7, -1.8, 1.2, { solid: .55, solidH: 1 });
  addProp(L, 'table', -5, 1.5, 1.3, { solid: 1, solidH: 1 }); addProp(L, 'table', 5, 2, 1.3, { solid: 1, solidH: 1 });
  addProp(L, 'stool', -6.6, 1.8, 1); addProp(L, 'stool', -3.6, 1.8, 1); addProp(L, 'stool', 3.6, 2.4, 1); addProp(L, 'stool', 6.6, 2.4, 1);
  addTorchFlame(L, -7.2, 0); addTorchFlame(L, 7.2, 0); addTorchFlame(L, 0, d / 2 - 1.4); addProp(L, 'banner', -2.6, -d / 2 + .6, .8, { shadow: false });
  spawnActor(L, 'keeper', 0, -4.2, { npc: true, f: PI / 2, name: 'Ur-Nanshe' });
  spawnActor(L, 'patron', -4.6, 1.4, { npc: true, f: 0, name: 'Patron' }); spawnActor(L, 'patron', 5.4, 2.4, { npc: true, f: PI, name: 'Patron' });
  addInter(L, { x: 0, z: -2.6 + 1.2, r: 3, label: 'Talk to Ur-Nanshe, the keeper', fn: () => tavernMenu() });
  addLoot(L, 'chest', 6.8, 4.2);
  return L;
}

/* ============================================================ THE ESAGILA (temple interior) */
function buildTemple() {
  const L = new Level('temple', { name: 'Esagila — House whose head is lofty', dark: true, indoor: true, tint: 0xcdbd9a, fog: 0x16100a, fogNear: 8, fogFar: 44, bounds: { x0: -29.6, x1: 29.6, z0: -43.4, z1: 18 }, camDist: 6.4, mapScale: 2.1 });
  L.camMinPitch = .6; ART.seed(555);
  const H = 7, T = 1.4;
  const wall = (x0, z0, x1, z1, tex = 'temple') => { const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = Math.abs(x1 - x0) || T, d = Math.abs(z1 - z0) || T; return addBox(L, cx, cz, w, d, H, { tex, tile: 3.5 }); };
  /* floors */
  addFlat(L, 'tile', 0, 8, 20, 18, 0, 5, 4.5); addFlat(L, 'tile', 0, -13, 32, 26, 0, 8, 6.5);
  addFlat(L, 'tile', -23, -14, 14, 20, 0, 3.5, 5); addFlat(L, 'tile', 23, -14, 14, 20, 0, 3.5, 5); addFlat(L, 'tile', 0, -35, 20, 18, 0, 5, 4.5);
  addFlat(L, 'road', 0, -13, 5.2, 36, .03, 1, 7);                     // carpet runner
  /* entry hall */
  wall(-10 - T / 2, 0, -10 - T / 2, 18 + T); wall(10 + T / 2, 0, 10 + T / 2, 18 + T); wall(-11, 18 + T / 2, 11, 18 + T / 2);
  /* great hall */
  wall(-16 - T / 2, -26, -16 - T / 2, -16); wall(-16 - T / 2, -12, -16 - T / 2, 0); wall(16 + T / 2, -26, 16 + T / 2, -16); wall(16 + T / 2, -12, 16 + T / 2, 0);
  wall(-17, 0 - T / 2, -4, 0 - T / 2); wall(4, 0 - T / 2, 17, 0 - T / 2);
  wall(-17, -26 - T / 2, -2.5, -26 - T / 2); wall(2.5, -26 - T / 2, 17, -26 - T / 2);
  /* archives */
  wall(-30 - T / 2, -25, -30 - T / 2, -3); wall(30 + T / 2, -25, 30 + T / 2, -3);
  wall(-30, -24 - T / 2, -16, -24 - T / 2); wall(16, -24 - T / 2, 30, -24 - T / 2); wall(-30, -4 + T / 2, -16, -4 + T / 2); wall(16, -4 + T / 2, 30, -4 + T / 2);
  /* sanctum */
  wall(-10 - T / 2, -44, -10 - T / 2, -26); wall(10 + T / 2, -44, 10 + T / 2, -26); wall(-11, -44 - T / 2, 11, -44 - T / 2);
  /* sealed sanctum door */
  const sealed = addBox(L, 0, -26 - T / 2, 5, T, H, { tex: 'blue', tile: 2.5 }); L.sealed = L.solids[L.solids.length - 1]; L.sealedMesh = sealed;
  /* pillars */
  [[-7, -6], [-7, -14], [-7, -22], [7, -6], [7, -14], [7, -22]].forEach(([x, z]) => {
    const g = new THREE.CylinderGeometry(.85, 1, H, 10), m = new THREE.Mesh(g, L.mat(ART.surf('stone', 2, 2))); m.position.set(x, H / 2, z); L.scene.add(m);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(g, 40), L.lineMat); e.position.copy(m.position); L.scene.add(e); L.solidCirc(x, z, 1, H);
    addFlame(L, x + (x > 0 ? -1.35 : 1.35), 2.3, z, .9); addLightPool(L, x, z, 5.6, .42);
  });
  /* dressing */
  [[-12.5, -23.4], [12.5, -23.4]].forEach(([x, z]) => addProp(L, 'statue', x, z, 1.25, { solid: 1.4, flip: x > 0 }));
  [[-13, -2.6], [13, -2.6], [-9, 14], [9, 14]].forEach(([x, z]) => { addProp(L, 'brazier', x, z, 1.1, { solid: .5 }); addFlame(L, x, 1.05, z, 1.2); addLightPool(L, x, z, 5, .4); });
  [[-6.5, 17.1], [6.5, 17.1], [-9.3, 4], [9.3, 4], [-14.5, -17], [14.5, -17]].forEach(([x, z]) => addProp(L, 'bannerLong', x, z, 1.3, { shadow: false }));
  [[-4.4, -1.1], [4.4, -1.1]].forEach(([x, z]) => addProp(L, 'banner', x, z, .75, { shadow: false }));
  for (let i = 0; i < 5; i++) { addProp(L, 'jar', rr2(-9, 9), rr2(-2, 15), 1.1, { solid: .4, solidH: 1.2 }); }
  [[-28, -22], [-28, -6], [28, -22], [28, -6]].forEach(([x, z]) => addProp(L, 'shelf', x, z, 1.2, { shadow: false, flip: x > 0 }));
  [[-24, -22.4], [-19, -22.4], [24, -22.4], [19, -22.4]].forEach(([x, z]) => addProp(L, 'shelf', x, z, 1.2, { shadow: false }));
  [[-4, -42], [4, -42]].forEach(([x, z]) => { addProp(L, 'brazier', x, z, 1.2, { solid: .5 }); addFlame(L, x, 1.15, z, 1.4); });
  addLightPool(L, -23, -14, 7, .38); addLightPool(L, 23, -14, 7, .38); addLightPool(L, 0, -36, 9, .5);
  addDoorDecal(L, 0, 18, 'n', 'door', 3.4, 4.6); addDoorDecal(L, -30, -14, 'e', 'door', 2, 2.8);
  /* chests */
  addLoot(L, 'chest', -9, 15.4); addLoot(L, 'chest', 27.4, -6); addLoot(L, 'chest', -27.4, -22);
  /* exits */
  L.spawns = { main: { x: 0, z: 14.4, yaw: -PI / 2 }, side: { x: -27.4, z: -14, yaw: PI } };
  addInter(L, { x: 0, z: 15.4, r: 2.4, label: 'Leave the temple (main gate)', door: true, exit: true, fn: () => exitBuilding('main') });
  addInter(L, { x: -28.4, z: -14, r: 2.3, label: 'Leave through the water-carriers\' door', door: true, exit: true, fn: () => exitBuilding('side') });
  /* tablets */
  const tabs = [
    { x: -25, z: -14, id: 0, name: 'Enūma Eliš', desc: 'the Epic of Creation' },
    { x: 25, z: -14, id: 1, name: 'Gilgamesh XI', desc: 'the Great Flood' },
    { x: 0, z: -37, id: 2, name: 'MUL.APIN', desc: 'the Star Catalogue' }
  ];
  L.tablets = tabs.map(t => {
    addProp(L, 'pedestal', t.x, t.z, 1.1, { solid: .6, solidH: 1.3 });
    const p = spawnPickup(L, 'tablet', t.id, t.x, t.z); p.b.g.position.y = 1.55; p.manual = true; p.b.g.scale.setScalar(1.15);
    const it = addInter(L, { x: t.x, z: t.z + 1.2, r: 2.3, label: `Steal the tablet: ${t.name}`, tablet: t, pick: p, fn: () => takeTablet(t, p, it) });
    t.inter = it; t.pick = p; return t;
  });
  /* guards */
  const S = (k, x, z, o) => spawnActor(L, k, x, z, o);
  S('spear', -5, 11, { f: PI / 2, idle: true }); S('spear', 5, 4, { f: PI / 2, idle: true });
  S('sword', -11, -8, { route: [[-11, -8], [11, -8], [11, -22], [-11, -22]] }); S('sword', 11, -22, { route: [[11, -22], [-11, -22], [-11, -8], [11, -8]] });
  S('archer', -23, -10, { f: PI, idle: true, sleepy: true }); S('sword', 23, -18, { f: 0, idle: true, sleepy: true });
  S('spear', -5.5, -34, { f: PI / 2, idle: true }); S('spear', 5.5, -34, { f: PI / 2, idle: true });
  return L;
}
const rr2 = (a, b) => a + ART.rnd() * (b - a);
