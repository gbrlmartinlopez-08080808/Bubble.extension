/* ============================================================
   INK OF BABYLON — main.js
   camera (1st/3rd person) · level management · interaction · HUD · loop
   ============================================================ */
'use strict';
const Cam = { yaw: 0, pitch: .3, look: 0, cur: 6.8, aimK: 0, snap: false, kick: 0, fp: false, pvx: 0, pvz: 0, pe: undefined, eye: 1.6, bobT: 0 };
const BUILDERS = { city: buildCity, cart: buildCart, temple0: buildTemple0, temple1: buildTemple1, temple2: buildTemple2, cistern: buildCistern, office: buildOffice, roof: buildRoof, dock: buildDock };
const AMB = { city: { crowd: .5, wind: .35, market: .3 }, cart: { wind: .55, crowd: .1 }, temple0: { chant: .8, wind: .1 }, temple1: { wind: .1, chant: .12 }, temple2: { wind: .1 }, cistern: { wind: .3, dread: .7 }, office: { wind: .08 }, roof: { wind: .8, crowd: .12 }, dock: { wind: .4 } };
const MUSIC = { cistern: 0.05 };

function ensureLevel(id) { if (!G.levels[id]) { G.levels[id] = BUILDERS[id](); } return G.levels[id]; }
function resetLevels() { for (const k in G.levels) { const L = G.levels[k]; L.scene.traverse(o => { if (o.geometry && o.geometry !== BOXG && o.geometry !== PLANE && o.geometry !== FLAT && o.geometry !== CYL) o.geometry.dispose && 0; }); } G.levels = {}; NPCS.length = 0; Paper.clearCrowds(); projectiles.length = 0; G.bombs = []; clouds0(); FX.decals.forEach(d => d.m.visible = false); FX.decals.length = 0; }
function clouds0() { }
function switchLevel(id, spawn) {
  const L = ensureLevel(id); G.level = L; FX.attach(L.scene); L.scene.add(P.fig.root); L.scene.add(G.beacon);
  P.fig.shadow.material = L.shadowMat; const sp = spawn && L.spawns[spawn]; if (sp) { P.x = sp.x; P.z = sp.z; Cam.yaw = sp.yaw; P.vx = P.vz = 0; Cam.look = 0; Cam.pitch = .3; }
  Cam.snap = true; Cam.cur = L.camDist; $('maplabel').textContent = L.name.split('—').pop().trim(); document.body.classList.toggle('indoor', L.indoor);
  if (G.fpAuto) G.fp = !!L.indoor; Aud.setAmb(AMB[id] || {}); Aud.music = MUSIC[id] === undefined ? 1 : MUSIC[id]; P.hidden = false; P.hideSpot = null; G.listening = false;
  if (L.crowdMesh) { } return L;
}
G.goLevel = (id, spawn, title) => {
  if (G.mode !== 'play') return; Aud.sfx('door'); const L = ensureLevel(id);
  UI.wipe(title === undefined ? L.name : title, '', () => { switchLevel(id, spawn); G.onEnterLevel && G.onEnterLevel(id, spawn); }, () => { G.mode = 'play'; lockPointer(); });
};

/* ---------------------------------------------------------- the camera */
function updateCamera(dt, live) {
  const L = G.level; Cam.fp = G.fp;
  if (live) { Cam.yaw -= Input.dx * .0024; if (Cam.fp) Cam.look = clamp(Cam.look - Input.dy * .0021, -1.35, 1.35); else Cam.pitch = clamp(Cam.pitch + Input.dy * .0021, -.35, 1.1); }
  const aim = live && P.aim; Cam.aimK = lerp(Cam.aimK, aim ? 1 : 0, Math.min(1, dt * 9));
  const Fx = -Math.sin(Cam.yaw), Fz = -Math.cos(Cam.yaw), Rx = Math.cos(Cam.yaw), Rz = -Math.sin(Cam.yaw);
  if (Cam.fp) {
    const tgtEye = (P.sneak ? 1.15 : 1.62) + (P.rollT > 0 ? -.5 : 0); Cam.eye = lerp(Cam.eye, tgtEye, Math.min(1, dt * 10)); if (P.moving) Cam.bobT += dt * (P.sprint ? 12 : 8); const bob = P.moving ? Math.sin(Cam.bobT) * .035 * (P.sprint ? 1.5 : 1) : 0;
    camera.position.set(P.x + Fx * .1, Cam.eye + bob, P.z + Fz * .1); const cl = Math.cos(Cam.look + Cam.kick * 3);
    camera.lookAt(camera.position.x + Fx * cl, camera.position.y + Math.sin(Cam.look + Cam.kick * 3), camera.position.z + Fz * cl); Cam.pvx = P.x; Cam.pvz = P.z; Cam.kick *= .8;
    const fov = lerp(72, 52, Cam.aimK) + (P.sprint ? 4 : 0); if (Math.abs(camera.fov - fov) > .05) { camera.fov = lerp(camera.fov, fov, .2); camera.updateProjectionMatrix(); }
  } else {
    const minP = L.indoor ? .15 : -.3, maxP = L.indoor ? 1.15 : 1.1; Cam.pitch = clamp(Cam.pitch, minP, maxP); const shoulder = lerp(.95, .65, Cam.aimK), want = lerp(L.camDist, L.camDist * .66, Cam.aimK);
    const px = P.x + Rx * shoulder, pz = P.z + Rz * shoulder, py = 1.6 + (P.sneak ? -.25 : 0); Cam.pvx = px; Cam.pvz = pz;
    const solve = pitch => { const cp = Math.cos(pitch), sp = Math.sin(pitch), dx = Fx * cp, dy = -sp, dz = Fz * cp, cx = px - dx * want, cy = py - dy * want, cz = pz - dz * want; let best = 1; if (cy < .3) best = Math.min(best, (py - .3) / Math.max(.01, py - cy)); for (const s of L.solids) { if (!s.active || s.h < 2.2 || s.glass) continue; const t = s.r !== undefined ? segCirc(px, pz, cx, cz, s) : segAABB(px, pz, cx, cz, s); if (t === null) continue; const y = py + (cy - py) * t; if (y < s.h + .35 && t < best) best = t; } return { best, dx, dy, dz }; };
    let pitchUse = Cam.pitch, r = solve(pitchUse); const cap = Math.min(maxP + .1, Cam.pitch + .42);
    for (let k = 0; k < 6 && r.best < 1 && pitchUse < cap; k++) { pitchUse = Math.min(cap, pitchUse + .08); r = solve(pitchUse); }
    Cam.pe = Cam.snap || Cam.pe === undefined ? pitchUse : lerp(Cam.pe, pitchUse, Math.min(1, dt * (pitchUse > Cam.pe ? 9 : 3)));
    const cpe = Math.cos(Cam.pe), spe = Math.sin(Cam.pe), dirx = Fx * cpe, diry = -spe, dirz = Fz * cpe, dist = r.best < 1 ? Math.max(2.4, r.best * want - .55) : want;
    if (Cam.snap || dist < Cam.cur) { Cam.cur = dist; Cam.snap = false; } else Cam.cur = lerp(Cam.cur, dist, Math.min(1, dt * 4));
    camera.position.set(px - dirx * Cam.cur, Math.max(.35, py - diry * Cam.cur + (P.rollT > 0 ? -.2 : 0)), pz - dirz * Cam.cur); camera.lookAt(px, py + Cam.kick * 4, pz); Cam.kick *= .8;
    const fov = lerp(62, 46, Cam.aimK) + (P.sprint ? 3 : 0); if (Math.abs(camera.fov - fov) > .05) { camera.fov = lerp(camera.fov, fov, .2); camera.updateProjectionMatrix(); }
  }
  if (G.shake > 0) { camera.position.x += rand(-1, 1) * G.shake * .5; camera.position.y += rand(-1, 1) * G.shake * .4; G.shake = Math.max(0, G.shake - dt * 1.4); }
  document.body.classList.toggle('aimon', !!(aim || Cam.fp && P.weapon));
}

/* ---------------------------------------------------------- interaction */
function defaultTalk(n) {
  return (async () => {
    Talk.begin(n); const R = { child: [['Child', 'Are you a soldier? You look like a soldier! Do you have a sword?'], ['Child', 'My mother says never to talk to generals. She says they eat children. Is it true?']], civ: [['Citizen', 'Peace upon you, my lord. Marduk keep your house.'], ['Citizen', 'The barley is dear this year, my lord, and the taxes dearer.'], ['Citizen', 'Have you seen the great procession of Ishtar? There was never such a procession.']], guard: [['Guard', 'Move along, honored one. Nothing here to see.'], ['Guard', 'The Inspector wants every guard alert tonight. Forgive me, General, I must stay at my post.']] };
    const set = n.name === 'Child' ? R.child : n.role === 'guard' ? R.guard : R.civ; const [w, t] = pick(set); await UI.say(w, t); Talk.end();
  })();
}
function talkTo(n) { if (n.talk) n.talk(n); else defaultTalk(n); }
function hideBody(c) { if (c.hidden) return; c.hidden = true; P.busy = .9; Aud.sfx('paper'); (c.pieces || []).forEach(d => { d.landed = true; d.fade = .01; d.t = 0; }); UI.toast('You sweep the paper remains into a basket.', 1800); G.flags.bodyHidden = true; }
function hideIn(h) { P.hidden = true; P.hideSpot = h; P.x = h.x; P.z = h.z; P.vx = P.vz = 0; Aud.sfx('creak'); UI.sub('Hidden. Move or press E to come out.', 1800); }
function nearestInteract() {
  const L = G.level; let best = null, bd = 1e9; const consider = (x, z, r, label, fn, bias = 0) => { const d = Math.hypot(P.x - x, P.z - z) + bias; if (d < r && d < bd) { bd = d; best = { label, fn }; } };
  for (const it of L.inter) { if (it.dead || (it.hidden && it.hidden())) continue; consider(it.x, it.z, it.r, it.label, () => { it.fn(it); if (it.once) it.dead = true; }); }
  for (const n of L.actors) if (!n.dead && !n.hostile && n.state !== 'chase' && (n.role === 'civ' || n.talk) && !n.d.noTalk) consider(n.x, n.z, 2.8, 'Talk to ' + n.name, () => talkTo(n), 0);
  for (const c of L.corpses) if (!c.hidden) consider(c.x, c.z, 2.4, 'Hide the body', () => hideBody(c), -.6);
  if (!P.hidden) for (const h of L.hides) consider(h.x, h.z, h.r + 1.2, h.label, () => hideIn(h), 0);
  return best;
}
function updateInteract() {
  const best = nearestInteract(), pr = $('prompt'); G.near = best;
  if (best && G.mode === 'play' && P.busy <= 0 && !P.hidden) { pr.innerHTML = `<kbd>E</kbd>${best.label}`; pr.classList.add('on'); if (tap('KeyE')) { Aud.sfx('ui'); best.fn(); } } else { pr.classList.remove('on'); if (P.hidden) { } tap('KeyE'); }
}

/* ---------------------------------------------------------- HUD + minimap */
const mapC = $('map').getContext('2d'), HC = {};
function setText(id, v) { if (HC[id] !== v) { HC[id] = v; $(id).textContent = v; } }
G.obj = { main: '', sub: '', target: null };
function setObj(main, sub, target) { G.obj = { main, sub: sub || '', target: target || null }; const o = $('objective'); o.classList.remove('pulse'); void o.offsetWidth; o.classList.add('pulse'); Aud.sfx('pick'); }
function updateHUD() {
  $('hpbar').style.width = (P.hp / P.maxhp * 100) + '%'; $('sanbar').style.width = P.san + '%';
  for (let i = 0; i < 3; i++) setText('sk' + i, '●'.repeat(P.skills[i]) + '○'.repeat(Math.max(0, 3 - P.skills[i])));
  setText('gold', String(P.gold)); setText('xp', String(SAVE.xp)); setText('rank', String(rankOf(SAVE.xp)));
  setText('objmain', G.obj.main); setText('objsub', G.obj.sub);
  const wl = P.weapon || 'hand'; if (HC.wl !== wl) { HC.wl = wl; $('wslot').innerHTML = `<img src="${ART.iconURL(wl)}"> ${{ bow: 'Bow', knife: 'Knife', sling: 'Sling', pot: 'Clay pot', hand: 'Empty hands' }[wl]}`; }
  const w = P.weapon; setText('ammo', w === 'bow' ? String(P.ammo.bow) : w === 'sling' ? String(P.ammo.sling) : w === 'pot' ? String(P.ammo.pot) : '');
  const cv = G.alert >= 2 ? 'blown' : (G.level.actors.some(a => a.sus > .3 && !a.dead) || G.alert >= 1) ? 'suspected' : 'intact';
  if (HC.cover !== cv) { HC.cover = cv; $('cover').className = cv; $('covertxt').textContent = { intact: 'Disguise intact', suspected: 'Under suspicion', blown: 'COVER BLOWN' }[cv]; } P.cover = cv;
  const bc = G.beacon, tg = G.obj.target ? (typeof G.obj.target === 'function' ? G.obj.target() : G.obj.target) : null;
  if (tg && G.mode === 'play' && tg.level === undefined || tg && tg.level === G.level.id && G.mode === 'play') { bc.visible = true; bc.position.set(tg.x, (tg.y || 4.4) + Math.sin(G.time * 3) * .3, tg.z); bc.rotation.y = G.camYaw; bc.scale.setScalar(Math.max(1, Math.hypot(tg.x - P.x, tg.z - P.z) * .02 + 1)); } else bc.visible = false; G.tg = tg;
}
function drawMap() {
  const L = G.level, c = mapC, W = 214, cx = 107, cy = 107, sc = L.mapScale, yaw = G.camYaw, F = [-Math.sin(yaw), -Math.cos(yaw)], R = [Math.cos(yaw), -Math.sin(yaw)];
  const m = (x, z) => { const dx = x - P.x, dz = z - P.z; return [cx + (dx * R[0] + dz * R[1]) * sc, cy - (dx * F[0] + dz * F[1]) * sc]; };
  c.clearRect(0, 0, W, W); c.save(); c.beginPath(); c.arc(cx, cy, 104, 0, 6.3); c.clip(); c.fillStyle = L.indoor ? '#d2c3a0' : '#e4d6b4'; c.fillRect(0, 0, W, W);
  if (L.id === 'city') { c.strokeStyle = 'rgba(150,115,70,.5)'; c.lineWidth = 16 * sc; c.beginPath(); const a = m(0, 215), b = m(0, -46); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
  for (const z of L.zones) { if (!z.level) continue; const q = [m(z.x0, z.z0), m(z.x1, z.z0), m(z.x1, z.z1), m(z.x0, z.z1)]; c.fillStyle = z.level >= 3 ? 'rgba(141,58,42,.34)' : 'rgba(201,152,63,.26)'; c.beginPath(); q.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.fill(); }
  c.fillStyle = L.indoor ? '#7a6648' : '#b2a07a'; c.strokeStyle = '#14110e'; c.lineWidth = 1.4;
  for (const s of L.solids) { if (!s.active || s.map === false || s.h < 2.4 || s.glass) continue; if (s.r !== undefined) { const p = m(s.cx, s.cz); c.beginPath(); c.arc(p[0], p[1], Math.max(2, s.r * sc), 0, 6.3); c.fill(); continue; } const q = [m(s.x0, s.z0), m(s.x1, s.z0), m(s.x1, s.z1), m(s.x0, s.z1)]; if (q.every(p => Math.hypot(p[0] - cx, p[1] - cy) > 170)) continue; c.beginPath(); q.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.fill(); c.stroke(); }
  for (const it of L.inter) { if (!it.door || it.dead || (it.hidden && it.hidden())) continue; const p = m(it.x, it.z); c.fillStyle = '#c9983f'; c.strokeStyle = '#14110e'; c.lineWidth = 1.5; c.beginPath(); c.arc(p[0], p[1], 4.4, 0, 6.3); c.fill(); c.stroke(); }
  const obs = 18 + P.skills[2] * 12;
  for (const cp of L.corpses) { if (cp.hidden) continue; const p = m(cp.x, cp.z); c.strokeStyle = '#8d3a2a'; c.lineWidth = 2; c.beginPath(); c.moveTo(p[0] - 3, p[1] - 3); c.lineTo(p[0] + 3, p[1] + 3); c.moveTo(p[0] + 3, p[1] - 3); c.lineTo(p[0] - 3, p[1] + 3); c.stroke(); }
  for (const a of L.actors) {
    if (a.dead) continue; const d = Math.hypot(a.x - P.x, a.z - P.z); const chasing = a.hostile, isG = a.role === 'guard'; if (!isG && d > obs * .6 && !(G.talkNPC === a)) { if (d > 34) continue; } if (d > obs + 10 && !chasing) continue; const q = m(a.x, a.z);
    if (isG && P.skills[2] >= 1 && !a.dead) { const fx = Math.cos(a.fa), fz = Math.sin(a.fa), th = Math.atan2(-(fx * F[0] + fz * F[1]), fx * R[0] + fz * R[1]); c.fillStyle = chasing ? 'rgba(141,58,42,.32)' : 'rgba(201,152,63,.34)'; c.beginPath(); c.moveTo(q[0], q[1]); c.arc(q[0], q[1], Math.min(a.T.view * sc * .5, 40), th - a.T.fov * .85, th + a.T.fov * .85); c.closePath(); c.fill(); }
    c.fillStyle = isG ? (chasing ? '#8d3a2a' : '#4a3f33') : a.talk ? '#2e5d85' : '#9a8a6a'; c.strokeStyle = '#14110e'; c.lineWidth = 1.4; c.beginPath(); c.arc(q[0], q[1], isG && chasing ? 4.6 + Math.sin(G.time * 10) : 3.4, 0, 6.3); c.fill(); c.stroke();
  }
  const tg = G.tg; if (tg && (tg.level === undefined || tg.level === L.id)) { let q = m(tg.x, tg.z); const dx = q[0] - cx, dy = q[1] - cy, d = Math.hypot(dx, dy), edge = d > 92; if (edge) q = [cx + dx / d * 92, cy + dy / d * 92]; c.save(); c.translate(q[0], q[1]); if (edge) c.rotate(Math.atan2(dy, dx) + 1.57); c.fillStyle = '#c9983f'; c.strokeStyle = '#14110e'; c.lineWidth = 2; c.beginPath(); if (edge) { c.moveTo(0, -9); c.lineTo(8, 6); c.lineTo(-8, 6); } else { for (let i = 0; i < 10; i++) { const r = i % 2 ? 4.5 : 10, an = -1.57 + i * .628; c.lineTo(Math.cos(an) * r, Math.sin(an) * r); } } c.closePath(); c.fill(); c.stroke(); c.restore(); }
  c.save(); c.translate(cx, cy); c.fillStyle = '#efe6d0'; c.strokeStyle = '#14110e'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(0, -9); c.lineTo(7, 7); c.lineTo(0, 3); c.lineTo(-7, 7); c.closePath(); c.fill(); c.stroke(); c.restore(); c.restore();
}

/* ---------------------------------------------------------- light assignment: nearest flames light the dolls and the walls */
function updateLights(dt) {
  const L = G.level, ref = camera.position, lamps = L.lamps; if (!L.indoor && !lamps.length) { L.pl.forEach(p => p.intensity = 0); return; }
  const near = lamps.map(l => ({ l, d: (l.x - P.x) ** 2 + (l.z - P.z) ** 2 })).sort((a, b) => a.d - b.d).slice(0, 3);
  for (let i = 0; i < 3; i++) { const p = L.pl[i], n = near[i]; if (!n || n.d > 1700) { p.intensity += (0 - p.intensity) * .3; continue; } const f = 1 + Math.sin(G.time * 11 + i * 3) * .1 + Math.sin(G.time * 27 + i) * .06; p.position.set(n.l.x, n.l.y, n.l.z); p.intensity += (n.l.i * (L.indoor ? (L.o.lampK || .9) : .12) * f - p.intensity) * .5; p.distance = L.indoor ? (L.o.dark ? 34 : 24) : 9; }
}

/* ---------------------------------------------------------- the loop */
let lastT = performance.now(), mapT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(G.dtCap || .05, (now - lastT) / 1000); lastT = now; const L = G.level; if (!L) return;
  if (G.hitstop > 0) { G.hitstop -= dt; dt *= .12; }
  const paused = G.mode === 'pause' || G.mode === 'title' || G.mode === 'dead' || G.mode === 'end';
  if (!paused) G.time += dt;
  if (G.mode === 'play') {
    if (tap('Escape') || tap('Tab')) { pauseGame(tap('Tab') ? 'journal' : 'pause'); }
    if (tap('KeyV')) { G.fpAuto = false; G.fp = !G.fp; UI.sub(G.fp ? 'First-person view' : 'Third-person view', 1200); }
    if (tap('KeyM')) { Aud.muted = !Aud.muted; if (Aud.master) Aud.master.gain.value = Aud.muted ? 0 : .6; UI.toast(Aud.muted ? 'Sound off' : 'Sound on', 1200); }
    updatePlayer(dt);
  }
  if (G.mode === 'play' || G.mode === 'cine' || G.mode === 'talk') Seq.tick(dt);
  if (G.mode === 'play') {
    for (const a of L.actors.slice()) { const d = Math.hypot(a.x - P.x, a.z - P.z); a.fig.root.visible = d < 170; if (d < 150 || a.hostile) a.update(dt); else a.animate(dt); }
    updateProjectiles(dt); updatePots(dt); updatePickups(dt); updateInteract(); stealthLogic(dt); updateSanity(dt);
    let tn = 0; for (const a of L.actors) if (!a.dead && a.hostile) tn += .3; Aud.setTension(Math.min(1, tn + (G.alert >= 1 ? .1 : 0)));
  } else { for (const a of L.actors) { a.moving = false; a.animate(dt); } }
  if (G.mode === 'cine' || G.mode === 'talk') Cine.update(dt);
  if (G.mode !== 'cine' && G.mode !== 'talk') updateCamera(dt, G.mode === 'play');
  const dir = camera.getWorldDirection(new THREE.Vector3()); G.camYaw = Math.atan2(-dir.x, -dir.z);
  for (const g of L.bills) g.rotation.y = G.camYaw;
  if (!paused || G.mode === 'title') {
    animatePlayer(dt); FX.update(dt); Paper.tickDebris(dt, G.camYaw); L.tickers.forEach(f => f(dt));
    for (const s of L.sway) s.p.rotation.z = Math.sin(G.time * 1.6 + s.ph) * s.amp;
    for (const f of L.flick) { if (f.pool) { f.pool.material.opacity = f.base * (.85 + Math.sin(G.time * 9 + f.ph) * .1 + Math.sin(G.time * 23 + f.ph) * .05); continue; } const k = .9 + Math.sin(G.time * 11 + f.ph) * .1 + Math.sin(G.time * 27 + f.ph) * .06; f.m.scale.set(1.5 * f.s * k, 1.8 * f.s * k, 1); f.core.scale.set(.6 * f.s * k, .9 * f.s * k, 1); }
    updateLights(dt); Aud.tickAmb(dt);
  }
  Paper.tick(G.time, camera.position);
  /* viewmodel: visible in first person, or when a cinematic asks for hands */
  VM.state.on = (Cam.fp && G.mode === 'play' && !P.hidden && !P.dead) || G.vmScripted && (G.mode === 'cine'); VM.update(dt);
  renderer.clear(); renderer.render(L.scene, camera); VM.render();
  if (G.mode !== 'cine') { mapT -= dt; if (mapT <= 0) { mapT = .05; drawMap(); updateHUD(); } } else { updateHUD(); }
  endInput();
}

/* ---------------------------------------------------------- stealth bookkeeping */
function stealthLogic(dt) {
  const L = G.level; let anyHostile = false, anySearch = false;
  for (const a of L.actors) if (!a.dead && a.role === 'guard') { if (a.hostile) anyHostile = true; if (a.state === 'search') anySearch = true; }
  if (!anyHostile) { G.alertT = (G.alertT || 0) + dt; if (G.alertT > (anySearch ? 18 : 12) && G.alert > 0) { G.alert = Math.max(0, G.alert - 1); G.alertT = 0; if (G.alert === 0) UI.sub('The garrison relaxes. Your disguise holds.', 2400); } } else G.alertT = 0;
  for (const k in P.permit) if (P.permit[k] < G.time) delete P.permit[k];
  if (G.challenging && (G.challenging.dead || G.challenging.hostile)) G.challenging = null;
}
function updateSanity(dt) {
  const L = G.level; if (L.id === 'cistern') P.san = Math.max(0, P.san - .35 * dt); if (P.san <= 0) { P.hp -= 1.2 * dt; if (P.hp <= 0) { P.hp = 0; G.onPlayerDeath && G.onPlayerDeath('madness'); } }
  const low = P.san < 40; $('insane').style.opacity = low ? (1 - P.san / 40) * .85 : 0; Aud.ambT.dread = Math.max(Aud.ambT.dread, low ? (1 - P.san / 40) * .8 : 0);
  if (low && (G.whisperT = (G.whisperT || 0) - dt) < 0) { G.whisperT = rand(8, 15); UI.sub(pick(['…the clay remembers you…', 'Someone is counting your footsteps.', 'He is not Nabû-nāṣir… he is not…', 'Marduk sees all.', 'The ink is crawling.']), 2600); Aud.sfx('whisper'); }
}

/* ---------------------------------------------------------- death */
G.onPlayerDeath = by => {
  if (G.mode === 'dead' || G.mode === 'end') return; P.dead = true; G.mode = 'dead'; Aud.sfx('lose'); unlockPointer(); document.body.classList.remove('aimon'); P.fig.root.visible = true; P.fig.shatter(0, 0, 'fold');
  $('deadwhy').textContent = `Slain by ${by}.`; setTimeout(() => $('dead').classList.add('on'), 1200);
};

/* ---------------------------------------------------------- screens */
function pauseGame(which) { if (G.mode !== 'play') return; G.mode = 'pause'; unlockPointer(); document.body.classList.remove('aimon'); fillJournal(); $('pause').classList.add('on'); }
function resumeGame() { $('pause').classList.remove('on'); G.mode = 'play'; lockPointer(); }
G.onUnlock = () => { if (G.mode === 'play') pauseGame(); };
function fillJournal() {
  const facts = (G.facts || []).map(f => `<li>${f}</li>`).join('') || '<li><i>Nothing learned yet.</i></li>', items = Object.keys(G.items).filter(k => G.items[k]).map(k => ({ vial: 'Poison ring (3 drops of henbane)', seal: 'Seal of the Esagila', letter: "General's sealed letter", invitation: "Marshal's invitation tablet", ledger: "The Marshal's ledger", gift: 'Gift of date-beer' }[k] || k)).map(i => `<li>${i}</li>`).join('') || '<li><i>Empty pockets.</i></li>';
  $('jobj').textContent = G.obj.main || '—'; $('jsub').textContent = G.obj.sub || ''; $('jfacts').innerHTML = facts; $('jitems').innerHTML = items;
  $('chapList2').innerHTML = CHAPTERS.map((c, i) => `<button class="chap" data-id="${c.id}"><b>${c.num}</b> ${c.title}<small>${c.sub}</small></button>`).join(''); $('chapList2').querySelectorAll('.chap').forEach(b => b.onclick = () => { $('pause').classList.remove('on'); startChapter(b.dataset.id); });
}
function fillTitle() { $('chapList').innerHTML = CHAPTERS.map(c => `<button class="chap" data-id="${c.id}"><b>${c.num}</b> ${c.title}<small>${c.sub}</small></button>`).join(''); $('chapList').querySelectorAll('.chap').forEach(b => b.onclick = () => { Aud.init(); $('title').classList.remove('on'); startChapter(b.dataset.id); }); }
$('resumeBtn').onclick = resumeGame; $('retryBtn').onclick = () => { $('dead').classList.remove('on'); startChapter(G.chapter); }; $('againBtn').onclick = () => { $('end').classList.remove('on'); fillTitle(); $('title').classList.add('on'); G.mode = 'title'; document.body.classList.remove('playing'); };
$('restartBtn').onclick = () => { $('pause').classList.remove('on'); startChapter(G.chapter); };
$('startBtn').onclick = () => { Aud.init(); $('title').classList.remove('on'); startChapter('cart'); };
$('muteBtn').onclick = () => { Aud.muted = !Aud.muted; if (Aud.master) Aud.master.gain.value = Aud.muted ? 0 : .6; $('muteBtn').textContent = Aud.muted ? 'Sound: off' : 'Sound: on'; };
addEventListener('keydown', e => { if (G.mode === 'pause' && (e.code === 'Escape' || e.code === 'Tab')) { e.preventDefault(); if (!e.repeat) resumeGame(); } });

/* ---------------------------------------------------------- boot */
['heart', 'smile', 'sword', 'clover', 'eye', 'coin', 'hand'].forEach(n => { const el = $('ic-' + n); if (el) el.src = ART.iconURL(n); });
setTimeout(() => {
  try {
    FX.init(); G.beacon = new THREE.Mesh(PLANE, new THREE.MeshBasicMaterial({ map: ART.fxTex('beacon'), transparent: true, depthTest: false, fog: false })); G.beacon.scale.set(1.1, 1.1, 1); G.beacon.renderOrder = 15; G.beacon.visible = false;
    const stub = new Level('stub', { sky: 'sky', bounds: { x0: -5, x1: 5, z0: -5, z1: 5 } }); G.level = stub; P.fig = new Paper.Figure(stub, 'player'); P.fig.addTo(stub.scene); P.fig.root.visible = false; FX.attach(stub.scene);
    camera.position.set(0, 3, 8); camera.lookAt(0, 1, 0); fillTitle(); $('loadnote').textContent = ''; $('startBtn').disabled = false; G.mode = 'title';
    $('titlestats').innerHTML = SAVE.xp ? `Rank ${rankOf(SAVE.xp)} · ${SAVE.xp} XP (permanent)` : 'First time in Babylon? Begin with Chapter I.'; requestAnimationFrame(frame);
  } catch (err) { $('loadnote').textContent = 'Could not start: ' + err.message; console.error(err); }
}, 60);
window.__G = { G, P, Cam, SAVE, Input, Seq, Cine, UI, ensureLevel, switchLevel, startChapter: id => startChapter(id), NPCS };
