/* ============================================================
   INK OF BABYLON — main.js
   flow · mission · storm · camera · HUD · minimap · loop
   ============================================================ */
'use strict';
const M = { stage: 0 };
const ZONE = { cx: -4, cz: -2, r0: 118, r1: 68, t0: 45, dur: 240, r: 118, mesh: null, warned: 0, nextElim: 70 };
G.zoneOut = (x, z) => Math.hypot(x - ZONE.cx, z - ZONE.cz) > ZONE.r;
const opsLeft = () => { const n = G.rivalsAlive + G.ghosts + 1; return n === 1 ? 'you are the last operative standing' : n + ' operatives remain'; };
const WHISPERS = ['…the clay remembers you…', 'Someone is counting your footsteps.', 'The tablets are watching.', 'Marduk sees all.', '…not yours… not yours…', 'The ink is crawling.'];

/* ============================================================ level management */
function switchLevel(id) {
  const L = G.levels[id]; G.level = L; FX.attach(L.scene); L.scene.add(P.b.g); P.b.mat.color.setHex(L.tint);
  Cam.dist = L.camDist; if (L.camMinPitch) Cam.pitch = Math.max(Cam.pitch, L.camMinPitch); else Cam.pitch = Math.min(Cam.pitch, .6);
  $('maplabel').textContent = L.name.split('—')[0].trim(); Cam.snap = true;
  if (G.beacon) L.scene.add(G.beacon);
  document.body.classList.toggle('indoor', L.indoor);
  if (ZONE.mesh) ZONE.mesh.visible = id === 'world' && ZONE.r < 112;
}
function buildAll() {
  G.levels = { world: buildWorld(), home: buildHome(), scribe: buildScribe(), tavern: buildTavern(), temple: buildTemple() };
  FX.decals.forEach(d => d.m.visible = false); FX.decals.length = 0;
  /* sandstorm wall */
  const tex = ART.plainCanvasTex('storm').clone(); tex.needsUpdate = true; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(5, 1);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 70, 72, 1, true), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: .88, side: THREE.DoubleSide, depthWrite: false, fog: false }));
  m.position.set(ZONE.cx, 26, ZONE.cz); m.renderOrder = 5; ZONE.mesh = m; ZONE.tex = tex; G.levels.world.scene.add(m);
  /* objective beacon */
  G.beacon = new THREE.Mesh(PLANE, new THREE.MeshBasicMaterial({ map: ART.fxTex('beacon'), transparent: true, depthTest: false, fog: false })); G.beacon.scale.set(1.1, 1.1, 1); G.beacon.renderOrder = 15; G.beacon.visible = false;
}
function newRun(first) {
  if (!G.fresh) { buildAll(); G.fresh = true; }
  G.fresh = false; projectiles.length = 0; clouds.length = 0; G.bombs = [];
  resetPlayer(); Object.assign(G, { kills: 0, tablets: 0, alarm: false, flags: {}, runT: 0, spotted: 0, silentKills: 0, xpRun: 0, rivalsAlive: 4, ghosts: 2, captainDead: false, hitstop: 0, shake: 0, goldBanked: 0 });
  M.stage = 0; ZONE.warned = 0; ZONE.nextElim = 70; ZONE.r = ZONE.r0; SAVE.runs++; saveGame();
  P.x = -21.5; P.z = 65.5; P.face = 1; Cam.yaw = -Math.PI / 2; Cam.pitch = .32; P.b.g.visible = true; P.b.p.rotation.z = 0; P.b.p.position.y = 0;
  switchLevel('world'); document.body.classList.add('playing');
  $('feed').innerHTML = ''; $('toasts').innerHTML = '';
  const intro = first ? [
    { d: 6.5, from: [62, 17, 72], to: [36, 12, 48], look: [0, 10, -10], lookTo: [0, 8, -30], cap: 'Babylon. The year of Our Lord 1187.' },
    { d: 6.2, from: [-36, 5, -26], to: [-15, 17, -36], look: [0, 12, -62], cap: 'A Crusader garrison has pitched its tents among the glazed bricks of the oldest city on earth.' },
    { d: 6.2, from: [0, 3.2, 52], to: [0, 7.5, 28], look: [0, 8, 10], lookTo: [0, 11, -30], cap: 'Beneath the ziggurat of the Esagila, three clay tablets still hold the secrets of creation.' },
    { d: 5.2, from: [-8, 2.4, 52], to: [-17, 3.2, 63], look: [-30, 1.8, 66], cap: 'Seven operatives crossed the river for them. Only one will leave.' },
    { d: 3.6, from: [-46, 10, 74], to: [-28, 3.7, 66.45], look: [-30, 3, 70], lookTo: [-21.5, 1.55, 66.45], cap: 'Take the transcripts. Leave no name.' }
  ] : [{ d: 3, from: [-46, 10, 74], to: [-28, 3.7, 66.45], look: [-30, 3, 70], lookTo: [-21.5, 1.55, 66.45], cap: 'Another dawn in Babylon. The ink is fresh.' }];
  playCine(intro, () => { G.mode = 'play'; Cam.snap = true; G.startTime = performance.now(); UI.toast('Follow the <b>Processional Way</b> north to the Esagila. <b>Visit the tavern</b> if you want another way in.', 6500); UI.sub('Hold C to sneak · F behind a guard for a silent kill', 5000); lockPointer(); });
}

function enterBuilding(to, spawn, ret) {
  if (G.mode !== 'play') return;
  G.ret = ret; Aud.sfx('door'); const L = G.levels[to];
  UI.wipe(L.name, to === 'temple' ? 'the House whose head is lofty' : '', () => {
    switchLevel(to); const s = L.spawns[spawn] || L.spawns.main; P.x = s.x; P.z = s.z; P.vx = P.vz = 0; Cam.yaw = spawn === 'side' ? -Math.PI / 2 : 0; Cam.pitch = Math.max(.5, L.camMinPitch || .5);
    P.b.mat.color.setHex(L.tint);
  }, () => { G.mode = 'play'; onEnter(to, spawn); lockPointer(); });
}
function exitBuilding(key) {
  if (G.mode !== 'play') return; const cur = G.level.id; Aud.sfx('door');
  let ret = G.ret || { x: 0, z: 60, yaw: 0 }; if (cur === 'temple') ret = key === 'side' ? { x: 28.4, z: -72, yaw: -Math.PI / 2 } : { x: 0, z: -51.2, yaw: Math.PI };
  UI.wipe(G.levels.world.name, '', () => { switchLevel('world'); P.x = ret.x; P.z = ret.z; P.vx = P.vz = 0; Cam.yaw = ret.yaw; Cam.pitch = .32; if (cur === 'temple' && G.alarm) worldAlarm(); }, () => { G.mode = 'play'; lockPointer(); });
}
function onEnter(to, spawn) {
  if (to === 'home') {
    if (P.gold > 0) { const g = P.gold; SAVE.bank += g; G.goldBanked += g; P.gold = 0; saveGame(); UI.toast(`<img src="${ART.iconURL('coin')}"> <b>${g} gold banked</b> — now it is truly yours`, 4200, 'gold'); Aud.sfx('coin'); }
    if (G.tablets >= 3) finishMission();
    else if (G.tablets > 0) UI.sub('You still need all three tablets…', 3500);
  }
  if (to === 'temple') {
    M.stage = Math.max(M.stage, 1);
    if (!G.flags.templeIntro) {
      G.flags.templeIntro = true; const L = G.levels.temple; const side = spawn === 'side';
      const shots = side ? [{ d: 3.4, from: [-23, 3, -9], to: [-26, 3.4, -13], look: [-14, 2, -14], lookTo: [-16, 2, -14], cap: 'The cistern passage. Dust, cold water, the smell of old incense.' }]
        : [{ d: 3.6, from: [-9, 2.4, 17.5], to: [-3.5, 3.4, 11], look: [0, 2, 2], lookTo: [0, 3, -10], cap: 'ESAGILA. Torches gutter beneath Crusader banners. The garrison has made a barracks of a holy place.' }];
      playCine(shots, () => { G.mode = 'play'; Cam.snap = true; UI.toast('Two tablets lie in the <b>archive wings</b>. The third is sealed in the <b>sanctum</b>.', 6000); });
    }
  }
}

/* ============================================================ shops & menus */
function homeMenu() {
  UI.dialog({
    who: 'Planning table', text: `Carried gold: <b>${P.gold}</b> · Banked: <b>${SAVE.bank}</b>. <i>Gold only becomes yours once it reaches home.</i>`,
    opts: [
      { t: `Stash carried gold (${P.gold})`, fn: () => { if (P.gold > 0) { SAVE.bank += P.gold; G.goldBanked += P.gold; P.gold = 0; saveGame(); Aud.sfx('coin'); } homeMenu(); return 'keep'; } },
      { t: 'Resupply: 6 bolts + 1 ink bomb  (20 banked)', fn: () => { if (SAVE.bank >= 20) { SAVE.bank -= 20; P.ammo = Math.min(30, P.ammo + 6); P.bombs = Math.min(6, P.bombs + 1); saveGame(); Aud.sfx('pick'); } else UI.sub('Not enough banked gold.', 1400); homeMenu(); return 'keep'; } },
      { t: 'Poultice for your wounds, +40 HP  (12 banked)', fn: () => { if (SAVE.bank >= 12 && P.hp < P.maxhp) { SAVE.bank -= 12; P.hp = Math.min(P.maxhp, P.hp + 40); saveGame(); Aud.sfx('pick'); } else UI.sub(P.hp >= P.maxhp ? 'You are not hurt.' : 'Not enough banked gold.', 1400); homeMenu(); return 'keep'; } },
      { t: 'Close', fn: () => null }
    ]
  });
}
function scribeMenu() {
  const buy = (cost, fn) => () => { if (P.gold >= cost) { P.gold -= cost; fn(); Aud.sfx('coin'); } else UI.sub('You cannot afford that.', 1400); scribeMenu(); return 'keep'; };
  UI.dialog({
    who: 'Nabu the Scribe', text: `"Clay, reed and a little silence, friend. You carry <b>${P.gold}</b> gold. What do you need?"`,
    opts: [
      { t: 'Crossbow bolts ×6 — 8 gold', fn: buy(8, () => P.ammo = Math.min(30, P.ammo + 6)) },
      { t: 'Ink bomb — 10 gold', fn: buy(10, () => P.bombs = Math.min(6, P.bombs + 1)) },
      { t: 'Wound-herb, +40 HP — 6 gold', fn: buy(6, () => P.hp = Math.min(P.maxhp, P.hp + 40)) },
      { t: G.flags.plan ? 'Temple floor-plan (already yours)' : "Floor-plan of the Esagila — 15 gold <i>(marks every tablet on your map)</i>", fn: G.flags.plan ? () => 'keep' : buy(15, () => { G.flags.plan = true; UI.toast('<b>Floor-plan acquired.</b> Tablets are marked on your map.', 4200, 'gold'); }) },
      { t: 'Leave', fn: () => null }
    ]
  });
}
function tavernMenu() {
  UI.dialog({
    who: 'Ur-Nanshe, keeper of the House of Beer', text: '"Sit, sit. The Franks drink my beer and talk too loud. Ask — or drink."',
    opts: [
      { t: 'Spiced date-beer — 4 gold  (+30 sanity, +10 HP)', fn: () => { if (P.gold >= 4) { P.gold -= 4; P.san = Math.min(100, P.san + 30); P.hp = Math.min(P.maxhp, P.hp + 10); Aud.sfx('pick'); UI.toast('Warm, sweet, strangely calming.'); } else UI.sub('Gold first, friend.', 1400); tavernMenu(); return 'keep'; } },
      { t: 'Ask: "Is there a way into the Esagila besides the gate?"', fn: () => { G.flags.rumor = true; UI.toast('<b>Rumor:</b> the water-carriers\' door — east wall of the precinct, by the palms. Marked on your map.', 6500, 'gold'); Aud.sfx('card'); addXP(15); return null; } },
      { t: 'Ask: "What\'s inside the temple?"', fn: () => { UI.dialog({ who: 'Ur-Nanshe', text: '"Two archive wings, west and east, one tablet each. When both are taken, the sanctum door opens by itself — old magic. The third tablet sleeps there. Steal it and the whole garrison wakes. Plan your way out."', opts: [{ t: 'Thank her', fn: () => null }] }); return 'keep'; } },
      { t: 'Leave', fn: () => null }
    ]
  });
}

/* ============================================================ mission */
function takeTablet(t, p, it) {
  if (t.taken || G.mode !== 'play') return; const L = G.levels.temple; t.taken = true; it.dead = true; G.tablets++; Aud.sfx('tablet'); addXP(100); P.san = Math.max(0, P.san - 8);
  L.scene.remove(p.b.g); const k = L.pick.indexOf(p); if (k >= 0) L.pick.splice(k, 1); FX.glow(t.x, 1.6, t.z, 6, .8);
  const shots = [{ d: 2.6, from: [t.x + 2.6, 2.7, t.z + 4.2], to: [t.x + .9, 2.1, t.z + 2.4], look: [t.x, 1.7, t.z], cap: `“${t.name}” — ${t.desc}. Yours now.` }];
  const both = G.levels.temple.tablets[0].taken && G.levels.temple.tablets[1].taken;
  if (G.tablets === 3) shots.push({ d: 3.4, from: [0, 5.5, 9], to: [0, 4.2, 2], look: [0, 2, -18], shake: .08, sfx: 'alarm', cap: 'The temple wakes. Horns. Iron boots thunder in the dark.', fn: () => raiseAlarm() });
  else if (both && L.sealed.active) shots.push({ d: 3.6, from: [0, 4.5, -12], to: [0, 3.6, -17], look: [0, 3, -26], shake: .22, sfx: 'rumble', cap: 'Deep in the stone, something answers. The sanctum door grinds open.', fn: () => { L.sealed.active = false; L.sealedMesh.visible = false; if (L.sealedMesh.userData.edges) L.sealedMesh.userData.edges.visible = false; } });
  playCine(shots, () => { G.mode = 'play'; Cam.snap = true; if (G.tablets === 3) UI.toast('<b>ESCAPE!</b> Get the tablets to your safehouse alive.', 6000); });
}
function raiseAlarm() {
  if (G.alarm) return; G.alarm = true; G.spottedPre = G.spotted; M.stage = 2; UI.flash('alarmflash', 4200);
  const L = G.levels.temple;
  for (const a of L.actors) if (!a.dead && !a.npc) { a.state = 'chase'; a.alert = 1; a.lose = 0; a.lastX = P.x; a.lastZ = P.z; }
  [['sword', -3, 13], ['sword', 3, 13.5], ['spear', 0, 12], ['archer', 0, 15]].forEach(([k, x, z]) => { const a = spawnActor(L, k, x, z, {}); a.state = 'chase'; a.alert = 1; a.lastX = P.x; a.lastZ = P.z; });
  const c = spawnActor(L, 'captain', 0, 16, {}); c.state = 'chase'; c.alert = 1; c.lastX = P.x; c.lastZ = P.z; c.cd = 1.2;
}
function worldAlarm() {
  const W = G.levels.world; UI.flash('alarmflash', 2600); Aud.sfx('horn'); UI.sub('Horns sound across Babylon — the thief is loose!', 3200);
  for (const a of W.actors) { if (a.dead || a.npc || a.rival) continue; const d = Math.hypot(a.x - P.x, a.z - P.z); if (d < 38) { a.state = 'chase'; a.alert = 1; a.lose = 0; a.lastX = P.x; a.lastZ = P.z; } else if (d < 90) a.hear(P.x, P.z); }
  if (!G.captainDead && !G.flags.worldCaptain) { G.flags.worldCaptain = true; const c = spawnActor(W, 'captain', 0, -42, {}); c.state = 'chase'; c.alert = 1; c.lastX = P.x; c.lastZ = P.z; c.cd = 1.5; }
}
function finishMission() {
  const L = G.levels.home; M.stage = 3; G.mode = 'cine';
  [[-.5, -1.1, 1.3], [.3, -1.3, 1.3], [1.1, -1.1, 1.3]].forEach(([x, z, s]) => addProp(L, 'tablet', x + 1.2, z, s, { y: 1.12, shadow: false }));
  Aud.sfx('win');
  playCine([
    { d: 3.6, from: [-4.5, 3.8, 3.8], to: [0, 3.1, 1.8], look: [1.2, 1.2, -1.2], cap: 'Three tablets. Three thousand years of stories, pressed in clay.' },
    { d: 3.6, from: [2.6, 2.4, 1.6], to: [1.4, 2.0, -.2], look: [1.2, 1.3, -1.2], lookTo: [1.2, 1.2, -1.2], cap: 'And the world will never know your name.' }
  ], () => { showEnd(); });
}

/* ============================================================ sandstorm / royale pressure */
function updateRoyale(dt) {
  const t = G.runT;
  ZONE.r = t < ZONE.t0 ? ZONE.r0 : lerp(ZONE.r0, ZONE.r1, clamp((t - ZONE.t0) / ZONE.dur, 0, 1));
  if (ZONE.mesh) { ZONE.mesh.scale.set(ZONE.r, 1, ZONE.r); ZONE.tex.offset.x += dt * .03; ZONE.mesh.visible = G.level.id === 'world' && ZONE.r < 112; }
  if (t > 35 && ZONE.warned < 1) { ZONE.warned = 1; UI.toast('<b>A sandstorm is rising</b> — the ring will close around the temple.', 5500); Aud.sfx('rumble'); }
  if (t > ZONE.t0 + 120 && ZONE.warned < 2) { ZONE.warned = 2; UI.feed('<b>The storm tightens</b> — head for the Processional Way'); }
  const L = G.level; G.stormMix = 0;
  if (L.id === 'world') {
    const d = Math.hypot(P.x - ZONE.cx, P.z - ZONE.cz), over = d - ZONE.r; G.stormMix = clamp(over / 8 + .15, 0, 1) * (over > -6 ? 1 : 0);
    if (over > 0) { const k = Math.min(2, 1 + over / 25); P.hp -= 2.2 * k * dt; P.san = Math.max(0, P.san - 1.6 * dt); P.flash = Math.max(P.flash, .01); if (P.hp <= 0) { P.hp = 0; playerDied('the sandstorm'); } if (Math.random() < dt * 3) G.shake = Math.max(G.shake, .08); }
  }
  $('storm').style.opacity = G.stormMix > .2 ? Math.min(.85, G.stormMix) : 0;
  /* battle-royale attrition: other operatives fall to the garrison and the storm */
  if (t > ZONE.nextElim) {
    ZONE.nextElim += rand(32, 52);
    const W = G.levels.world, cand = W.actors.filter(a => a.rival && !a.dead && Math.hypot(a.x - P.x, a.z - P.z) > 45 && (L.id !== 'world' || true));
    const why = ['was cut down by the garrison', 'was swallowed by the sandstorm', 'fell to a Crusader arrow', 'was dragged away in chains'];
    if (cand.length && (!G.ghosts || Math.random() < .55)) { const a = pick(cand); a.dead = true; a.state = 'dead'; a.deadT = 0; if (a.icon) a.icon.visible = false; G.rivalsAlive--; UI.feed(`<b>${a.name}</b> ${pick(why)} — ${opsLeft()}`); }
    else if (G.ghosts > 0) { G.ghosts--; UI.feed(`An unseen operative ${pick(why)} — ${opsLeft()}`); }
  }
}
function updateSanity(dt) {
  const L = G.level;
  if (L.id === 'temple' && P.z < -26) P.san = Math.max(0, P.san - .5 * dt);
  if (L.id === 'temple' && G.alarm) P.san = Math.max(0, P.san - .2 * dt);
  if (P.san <= 0) { P.hp -= 1.4 * dt; if (P.hp <= 0) { P.hp = 0; playerDied('madness'); } }
  const low = P.san < 35; $('insane').style.opacity = low ? (1 - P.san / 35) * .85 : 0;
  if (low && (G.whisperT = (G.whisperT || 0) - dt) < 0) { G.whisperT = rand(7, 14); UI.sub(pick(WHISPERS), 2600); Aud.sfx('whisper'); }
}

/* ============================================================ death / end */
function playerDied(by) {
  if (G.mode === 'dead' || G.mode === 'end') return; P.dead = true; G.mode = 'dead'; Aud.sfx('lose'); unlockPointer(); document.body.classList.remove('aimon');
  const lost = P.gold; P.gold = 0; $('deadwhy').textContent = `Slain by ${by}.` + (lost ? ` ${lost} carried gold lost.` : '');
  setTimeout(() => $('dead').classList.add('on'), 1100);
}
function showEnd() {
  G.mode = 'end'; unlockPointer(); document.body.classList.remove('aimon');
  const T = Math.round((performance.now() - G.startTime) / 1000), mm = Math.floor(T / 60), ss = String(T % 60).padStart(2, '0');
  const bonus = 200 + (G.silentKills || 0) * 10 + ((G.spottedPre || 0) <= 1 ? 100 : 0) + (T < 480 ? 80 : 0); addXP(bonus);
  const ghost = (G.spottedPre || 0) <= 1, rich = G.goldBanked >= 50, swift = T < 480;
  $('cardnum').textContent = 'No. ' + String(SAVE.runs).padStart(3, '0');
  $('endlines').innerHTML = `Tablets 3 / 3 · Time ${mm}:${ss}<br>Guards &amp; rivals felled: ${G.kills} (${G.silentKills || 0} silent)<br>Gold banked: ${G.goldBanked} · Vault total: ${SAVE.bank}<br>XP earned: <b>+${G.xpRun}</b> · Rank ${rankOf(SAVE.xp)}`;
  $('medals').innerHTML = [['eye', 'Unseen', ghost], ['clover', 'Fortune', rich], ['sun', 'Swift', swift]].map(([i, n, g]) => `<div class="${g ? 'got' : ''}"><img src="${ART.iconURL(i, 96)}">${n}</div>`).join('');
  const c = $('cardart').getContext('2d'); c.clearRect(0, 0, 300, 300);
  c.strokeStyle = 'rgba(28,26,23,.22)'; c.lineWidth = 3; for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283; c.beginPath(); c.moveTo(150 + Math.cos(a) * 40, 150 + Math.sin(a) * 40); c.lineTo(150 + Math.cos(a) * 150, 150 + Math.sin(a) * 150); c.stroke(); }
  const hero = ART.charTex('hero').tex.image; c.drawImage(hero, 150 - hero.width * .47, 300 - hero.height * .94, hero.width * .94, hero.height * .94);
  const tb = ART.propTex('tablet').tex.image; c.save(); c.translate(236, 70); c.rotate(.2); c.drawImage(tb, -50, -50, 100, 100); c.restore();
  $('end').classList.add('on'); document.body.classList.remove('playing'); Aud.sfx('win');
}

/* ============================================================ camera */
function updateCamera(dt, live) {
  const L = G.level;
  if (live) {
    Cam.yaw -= Input.dx * .0024; Cam.pitch += Input.dy * .0021;
  }
  const minP = L.camMinPitch !== undefined ? L.camMinPitch : .03, maxP = L.indoor ? 1.15 : .95; Cam.pitch = clamp(Cam.pitch, minP, maxP);
  const aim = live && P.aim; Cam.aimK = lerp(Cam.aimK, aim ? 1 : 0, Math.min(1, dt * 9));
  const shoulder = lerp(.95, .65, Cam.aimK), want = lerp(L.camDist, L.camDist * .66, Cam.aimK);
  const Fx = -Math.sin(Cam.yaw), Fz = -Math.cos(Cam.yaw), Rx = Math.cos(Cam.yaw), Rz = -Math.sin(Cam.yaw);
  const px = P.x + Rx * shoulder, pz = P.z + Rz * shoulder, py = 1.6 + (P.sneak ? -.25 : 0);
  Cam.pvx = px; Cam.pvz = pz;
  /* find the first pitch (lifting upward) at which the boom clears every wall; fall back to a shorter boom */
  const solve = pitch => {
    const cp = Math.cos(pitch), sp = Math.sin(pitch), dx = Fx * cp, dy = -sp, dz = Fz * cp;
    const cx = px - dx * want, cy = py - dy * want, cz = pz - dz * want; let best = 1;
    for (const s of L.solids) {
      if (!s.active || s.h < 2.2) continue; const t = s.r !== undefined ? segCirc(px, pz, cx, cz, s) : segAABB(px, pz, cx, cz, s);
      if (t === null) continue; const y = py + (cy - py) * t; if (y < s.h + .35 && t < best) best = t;
    }
    return { best, dx, dy, dz };
  };
  let pitchUse = Cam.pitch, r = solve(pitchUse);
  const cap = Math.min(maxP + .1, Cam.pitch + .42);
  for (let k = 0; k < 6 && r.best < 1 && pitchUse < cap; k++) { pitchUse = Math.min(cap, pitchUse + .08); r = solve(pitchUse); }
  Cam.pe = Cam.snap || Cam.pe === undefined ? pitchUse : lerp(Cam.pe, pitchUse, Math.min(1, dt * (pitchUse > Cam.pe ? 9 : 3)));
  const cpe = Math.cos(Cam.pe), spe = Math.sin(Cam.pe), dirx = Fx * cpe, diry = -spe, dirz = Fz * cpe;
  const dist = r.best < 1 ? Math.max(2.6, r.best * want - .55) : want;
  if (Cam.snap || dist < Cam.cur) { Cam.cur = dist; Cam.snap = false; } else Cam.cur = lerp(Cam.cur, dist, Math.min(1, dt * 4));
  const kick = Cam.kick || 0; Cam.kick = kick * .8;
  camera.position.set(px - dirx * Cam.cur, py - diry * Cam.cur + (P.rollT > 0 ? -.2 : 0), pz - dirz * Cam.cur);
  if (G.shake > 0) { camera.position.x += rand(-1, 1) * G.shake * .5; camera.position.y += rand(-1, 1) * G.shake * .4; G.shake = Math.max(0, G.shake - dt * 1.4); }
  camera.lookAt(px, py + kick * 4, pz);
  const fov = lerp(58, 44, Cam.aimK) + (P.sprint ? 3 : 0); if (Math.abs(camera.fov - fov) > .05) { camera.fov = lerp(camera.fov, fov, .2); camera.updateProjectionMatrix(); }
  document.body.classList.toggle('aimon', !!aim);
}

/* ============================================================ interaction prompt */
function updateInteract() {
  const L = G.level; let best = null, bd = 1e9;
  for (const it of L.inter) { if (it.dead || (it.hidden && it.hidden())) continue; const d = Math.hypot(P.x - it.x, P.z - it.z); if (d < it.r && d < bd) { bd = d; best = it; } }
  G.near = best; const pr = $('prompt');
  if (best && G.mode === 'play') { pr.innerHTML = `<kbd>E</kbd>${best.label}`; pr.classList.add('on'); if (tap('KeyE')) { Aud.sfx('ui'); best.fn(best); } } else { pr.classList.remove('on'); tap('KeyE'); }
}

/* ============================================================ HUD + minimap */
const mapC = $('map').getContext('2d'), HUDC = {};
function setText(id, v) { if (HUDC[id] !== v) { HUDC[id] = v; $(id).textContent = v; } }
function objective() {
  const t = G.tablets;
  if (M.stage === 0) return { main: 'Reach the Esagila at the end of the Processional Way', sub: 'Sneak past the garrison — or find another way in. The tavern hears things.' };
  if (M.stage === 1) return { main: `Steal the three tablets (${t}/3)`, sub: G.level.id === 'temple' ? (t >= 2 ? 'The sanctum door stands open…' : 'Two lie in the archive wings. The third is sealed in the sanctum.') : 'Return to the temple.', tabs: true };
  if (M.stage === 2) return { main: 'ESCAPE! Get the tablets home alive', sub: 'Reach your safehouse. The whole garrison is hunting you.', tabs: true };
  return { main: 'Mission complete', sub: '' };
}
function objTarget() {
  const L = G.level, id = L.id;
  if (M.stage === 3) return null;
  if (id === 'world') {
    if (M.stage === 2 && G.tablets >= 3) return L.homePos;
    if (G.flags.rumor && M.stage < 2 && Math.hypot(P.x - 28, P.z + 72) < Math.hypot(P.x, P.z + 51) * .9) return { x: 28.4, z: -72 };
    return { x: 0, z: -51.2 };
  }
  if (id === 'temple') {
    if (M.stage === 2) { const a = { x: 0, z: 15.4 }, b = { x: -28.4, z: -14 }; return Math.hypot(P.x - a.x, P.z - a.z) < Math.hypot(P.x - b.x, P.z - b.z) ? a : b; }
    let best = null, bd = 1e9; for (const t of L.tablets) { if (t.taken) continue; if (t.id === 2 && L.sealed.active && !G.flags.plan) continue; const d = Math.hypot(P.x - t.x, P.z - t.z); if ((G.flags.plan || d < 16) && d < bd) { bd = d; best = t; } } return best;
  }
  const ex = L.inter.find(i => i.exit); return ex ? { x: ex.x, z: ex.z } : null;
}
function updateHUD(dt) {
  $('hpbar').style.width = (P.hp / P.maxhp * 100) + '%'; $('sanbar').style.width = P.san + '%';
  for (let i = 0; i < 3; i++) setText('sk' + i, '●'.repeat(P.skills[i]) + '○'.repeat(Math.max(0, 3 - P.skills[i])));
  setText('gold', String(P.gold)); setText('bank', String(SAVE.bank)); setText('xp', String(SAVE.xp)); setText('rank', String(rankOf(SAVE.xp)));
  setText('ammo', String(P.ammo)); setText('bombs', String(P.bombs));
  const o = objective(); setText('objmain', o.main); setText('objsub', o.sub);
  const tabs = o.tabs ? [0, 1, 2].map(i => `<span class="${G.levels.temple.tablets[i].taken ? 'got' : ''}"><img src="${ART.iconURL('tablet')}">${['Enūma Eliš', 'Gilgamesh XI', 'MUL.APIN'][i]}</span>`).join('') : '';
  if (HUDC.tabs !== tabs) { HUDC.tabs = tabs; $('objtabs').innerHTML = tabs; }
  /* royale panel */
  const alive = G.rivalsAlive + G.ghosts + 1; let z = `<b>${alive}</b> operative${alive === 1 ? '' : 's'} alive`;
  const t = G.runT;
  if (t < ZONE.t0) z += `<br>Sandstorm in ${Math.max(0, Math.ceil(ZONE.t0 - t))}s`; else if (t < ZONE.t0 + ZONE.dur) z += `<br>Storm radius ${Math.round(ZONE.r)}m ↘`; else z += `<br>Final ring ${Math.round(ZONE.r)}m`;
  if (G.level.id === 'world' && G.zoneOut(P.x, P.z)) z += '<br><span class="warn">IN THE SANDSTORM!</span>';
  if (HUDC.zone !== z) { HUDC.zone = z; $('zone').innerHTML = z; }
  /* beacon */
  const tg = objTarget(), bc = G.beacon;
  if (tg && G.mode === 'play') { bc.visible = true; bc.position.set(tg.x, 4.4 + Math.sin(G.time * 3) * .3, tg.z); bc.rotation.y = G.camYaw; } else bc.visible = false;
}
function drawMap() {
  const L = G.level, c = mapC, W = 214, cx = 107, cy = 107, sc = L.mapScale, yaw = G.camYaw;
  const F = [-Math.sin(yaw), -Math.cos(yaw)], R = [Math.cos(yaw), -Math.sin(yaw)];
  const m = (x, z) => { const dx = x - P.x, dz = z - P.z; return [cx + (dx * R[0] + dz * R[1]) * sc, cy - (dx * F[0] + dz * F[1]) * sc]; };
  c.clearRect(0, 0, W, W); c.save(); c.beginPath(); c.arc(cx, cy, 104, 0, 6.3); c.clip();
  c.fillStyle = L.indoor ? '#d9cba8' : '#eadfc2'; c.fillRect(0, 0, W, W);
  if (L.id === 'world') {
    c.strokeStyle = 'rgba(168,130,80,.55)'; c.lineWidth = 7.4 * sc; c.lineCap = 'butt'; c.beginPath(); const a = m(0, 86), b = m(0, -36); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
    c.fillStyle = 'rgba(134,184,200,.7)'; c.beginPath(); [[64, -100], [64, 100], [120, 100], [120, -100]].forEach(([x, z], i) => { const p = m(x, z); i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }); c.fill();
    const zc = m(ZONE.cx, ZONE.cz); c.fillStyle = 'rgba(181,65,46,.38)'; c.beginPath(); c.rect(-300, -300, 900, 900); c.arc(zc[0], zc[1], ZONE.r * sc, 0, 6.3, true); c.fill('evenodd');
    c.strokeStyle = 'rgba(181,65,46,.9)'; c.lineWidth = 2.5; c.beginPath(); c.arc(zc[0], zc[1], ZONE.r * sc, 0, 6.3); c.stroke();
  }
  c.fillStyle = L.indoor ? '#8b7550' : '#bba47a'; c.strokeStyle = '#1c1a17'; c.lineWidth = 1.5;
  for (const s of L.solids) {
    if (!s.active || s.map === false || s.h < 2.4) continue;
    if (s.r !== undefined) { const p = m(s.cx, s.cz); c.beginPath(); c.arc(p[0], p[1], Math.max(2, s.r * sc), 0, 6.3); c.fill(); continue; }
    const q = [m(s.x0, s.z0), m(s.x1, s.z0), m(s.x1, s.z1), m(s.x0, s.z1)]; if (q.every(p => Math.hypot(p[0] - cx, p[1] - cy) > 160)) continue;
    c.beginPath(); q.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.fill(); c.stroke();
  }
  /* doors */
  for (const it of L.inter) { if (!it.door || it.dead || (it.hidden && it.hidden())) continue; const p = m(it.x, it.z); c.fillStyle = it.exit ? '#7d9a52' : '#d9a441'; c.strokeStyle = '#1c1a17'; c.lineWidth = 1.5; c.beginPath(); c.arc(p[0], p[1], 4.5, 0, 6.3); c.fill(); c.stroke(); }
  /* loot (Observation) */
  const obsR = 16 + P.skills[2] * 12;
  for (const p of L.pick) { const d = Math.hypot(p.x - P.x, p.z - P.z); if (d > obsR && p.type !== 'tablet') continue; if (p.type === 'tablet' && !G.flags.plan && d > 16) continue; const q = m(p.x, p.z); c.fillStyle = p.type === 'tablet' ? '#b5412e' : '#f3c64a'; c.beginPath(); c.arc(q[0], q[1], p.type === 'tablet' ? 5 : 2.5, 0, 6.3); c.fill(); c.strokeStyle = '#1c1a17'; c.lineWidth = 1; c.stroke(); }
  /* actors */
  for (const a of L.actors) {
    if (a.dead || a.npc) continue; const d = Math.hypot(a.x - P.x, a.z - P.z), chasing = a.state === 'chase'; if (d > obsR + 6 && !chasing) continue; if (d > 70) continue;
    const q = m(a.x, a.z);
    if (P.skills[2] >= 1 && !a.rival && !a.dead) { const fx = Math.cos(a.fa), fz = Math.sin(a.fa), th = Math.atan2(-(fx * F[0] + fz * F[1]), fx * R[0] + fz * R[1]); c.fillStyle = chasing ? 'rgba(181,65,46,.3)' : 'rgba(217,164,65,.34)'; c.beginPath(); c.moveTo(q[0], q[1]); c.arc(q[0], q[1], Math.min(a.T.view * sc * .55, 42), th - a.T.fov * .85, th + a.T.fov * .85); c.closePath(); c.fill(); }
    c.fillStyle = a.rival ? '#e0782c' : chasing ? '#b5412e' : '#4a3f33'; c.strokeStyle = '#1c1a17'; c.lineWidth = 1.5; c.beginPath(); c.arc(q[0], q[1], chasing ? 4.6 + Math.sin(G.time * 10) : 3.6, 0, 6.3); c.fill(); c.stroke();
  }
  /* objective */
  const tg = objTarget();
  if (tg) { let q = m(tg.x, tg.z); const dx = q[0] - cx, dy = q[1] - cy, d = Math.hypot(dx, dy), edge = d > 92; if (edge) q = [cx + dx / d * 92, cy + dy / d * 92]; c.save(); c.translate(q[0], q[1]); if (edge) c.rotate(Math.atan2(dy, dx) + 1.57); c.fillStyle = '#d9a441'; c.strokeStyle = '#1c1a17'; c.lineWidth = 2; c.beginPath(); if (edge) { c.moveTo(0, -9); c.lineTo(8, 6); c.lineTo(-8, 6); } else { for (let i = 0; i < 10; i++) { const r = i % 2 ? 4.5 : 10, an = -1.57 + i * .628; c.lineTo(Math.cos(an) * r, Math.sin(an) * r); } } c.closePath(); c.fill(); c.stroke(); c.restore(); }
  /* player */
  c.save(); c.translate(cx, cy); c.fillStyle = '#3f5d86'; c.strokeStyle = '#1c1a17'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(0, -9); c.lineTo(7, 7); c.lineTo(0, 3); c.lineTo(-7, 7); c.closePath(); c.fill(); c.stroke(); c.restore();
  c.restore();
}

/* ============================================================ main loop */
let lastT = performance.now(), mapT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(.05, (now - lastT) / 1000); lastT = now;
  const L = G.level; if (!L) return;
  if (G.hitstop > 0) { G.hitstop -= dt; dt *= .12; }
  if (G.mode !== 'pause') G.time += dt;
  if (G.mode === 'play') {
    G.runT += dt;
    if (tap('Escape') || tap('Tab')) { pauseGame(); }
    if (tap('KeyM')) { Aud.muted = !Aud.muted; if (Aud.master) Aud.master.gain.value = Aud.muted ? 0 : .55; UI.toast(Aud.muted ? 'Sound off' : 'Sound on', 1200); }
    updatePlayer(dt); if (G.mode === 'play') {
      for (const a of L.actors) a.update(dt);
      updateProjectiles(dt); updateBombs(dt); updatePickups(dt); updateInteract(); updateRoyale(dt); updateSanity(dt);
      /* music tension: how many hunters are on us */
      let tn = 0; for (const a of L.actors) if (!a.dead && a.state === 'chase') tn += .35; Aud.setTension(Math.min(1, tn));
    }
  } else if (G.mode === 'cine') { updateCine(dt); for (const a of L.actors) a.animate(dt); }
  else { for (const a of L.actors) a.animate(dt); if (G.mode === 'dialog' && (tap('Escape'))) UI.closeDialog(); else if (G.mode === 'dialog') { for (let i = 0; i < 4; i++) if (tap('Digit' + (i + 1))) UI.choose(i); } if (G.mode === 'pause' && (tap('Escape') || tap('Tab'))) resumeGame(); }
  if (G.mode !== 'cine') updateCamera(dt, G.mode === 'play');
  /* billboard yaw from the actual camera */
  const dir = camera.getWorldDirection(new THREE.Vector3()); G.camYaw = Math.atan2(-dir.x, -dir.z);
  for (const g of L.bills) g.rotation.y = G.camYaw; P.b.g.rotation.y = G.camYaw;
  if (G.mode !== 'pause') {
    animatePlayer(dt); FX.update(dt);
    for (const s of L.sway) s.p.rotation.z = Math.sin(G.time * 1.6 + s.ph) * s.amp;
    for (const f of L.flick) { if (f.pool) { f.pool.material.opacity = f.base * (.85 + Math.sin(G.time * 9 + f.ph) * .1 + Math.sin(G.time * 23 + f.ph) * .05); continue; } const k = .9 + Math.sin(G.time * 11 + f.ph) * .1 + Math.sin(G.time * 27 + f.ph) * .06; f.m.scale.set(1.5 * f.s * k, 1.8 * f.s * k, 1); f.core.scale.set(.6 * f.s * k, .9 * f.s * k, 1); }
    if (G.level.hills) G.level.hills.rotation.y += 0;
  }
  if (P.dead) { P.b.p.rotation.z = -P.face * 1.5; }
  renderer.render(L.scene, camera);
  if (G.mode !== 'cine') { mapT -= dt; if (mapT <= 0) { mapT = .05; drawMap(); updateHUD(dt); } } else updateHUD(dt);
  endInput();
}

/* ============================================================ screens */
function pauseGame() { if (G.mode !== 'play') return; G.mode = 'pause'; unlockPointer(); $('pause').classList.add('on'); document.body.classList.remove('aimon'); }
function resumeGame() { $('pause').classList.remove('on'); G.mode = 'play'; lockPointer(); }
G.onUnlock = () => { if (G.mode === 'play') pauseGame(); };
$('resumeBtn').onclick = resumeGame;
$('retryBtn').onclick = () => { $('dead').classList.remove('on'); G.fresh = false; newRun(false); };
$('againBtn').onclick = () => { $('end').classList.remove('on'); G.fresh = false; newRun(false); };
$('startBtn').onclick = () => { Aud.init(); $('title').classList.remove('on'); newRun(true); };
addEventListener('keydown', e => { if (e.code === 'Enter' && $('title').classList.contains('on') && !$('startBtn').disabled) $('startBtn').click(); });

['heart', 'smile', 'sword', 'clover', 'eye', 'coin', 'bolt', 'bomb'].forEach(n => { const el = $('ic-' + n); if (el) el.src = ART.iconURL(n); });
setTimeout(() => {
  try {
    FX.init(); buildAll(); G.fresh = true;
    P.b = makeBill(G.levels.world, ART.charTex('hero'), 2.15, { ownMat: true });
    G.level = G.levels.world; FX.attach(G.level.scene); G.level.scene.add(P.b.g); P.b.g.visible = false;
    camera.position.set(-20, 14, 70); camera.lookAt(0, 6, 10);
    $('loadnote').textContent = ''; $('startBtn').disabled = false;
    $('titlestats').innerHTML = SAVE.runs ? `Rank ${rankOf(SAVE.xp)} · ${SAVE.xp} XP · ${SAVE.bank} gold in the vault · ${SAVE.runs} run${SAVE.runs > 1 ? 's' : ''}` : 'First time in Babylon? Welcome.';
    G.mode = 'title'; requestAnimationFrame(frame);
  } catch (err) { $('loadnote').textContent = 'Could not start: ' + err.message; console.error(err); }
}, 60);
window.__G = { G, P, M, ZONE, Cam, SAVE, Input, spawnActor, raiseAlarm, takeTablet };
