/* ============================================================
   INK OF BABYLON — actors.js
   player · guards · rival operatives · projectiles · pickups
   ============================================================ */
'use strict';

/* ---------- permanent save (XP is permanent, gold only counts once banked at home) ---------- */
const SAVE = (() => { let s = { xp: 0, bank: 0, runs: 0, best: 0 }; try { s = Object.assign(s, JSON.parse(localStorage.getItem('inkOfBabylon') || '{}')); } catch (e) { } return s; })();
const saveGame = () => { try { localStorage.setItem('inkOfBabylon', JSON.stringify(SAVE)); } catch (e) { } };
const rankOf = xp => Math.floor(xp / 150);
function addXP(n) {
  const r0 = rankOf(SAVE.xp); SAVE.xp += n; G.xpRun = (G.xpRun || 0) + n; saveGame();
  if (rankOf(SAVE.xp) > r0) { UI.toast(`<b>RANK UP!</b> You are now Rank ${rankOf(SAVE.xp)} — your skills grow permanently.`, 4600, 'gold'); Aud.sfx('card'); }
}
const baseSkill = i => Math.floor((rankOf(SAVE.xp) + 2 - i) / 3);

/* ---------- the player ---------- */
const P = {
  x: 0, z: 0, vx: 0, vz: 0, hp: 100, maxhp: 100, san: 100, face: 1, sneak: false, sprint: false, moving: false, aim: false,
  rollT: 0, rdx: 0, rdz: 0, cdShot: 0, cdMelee: 0, cdRoll: 0, inv: 0, ammo: 10, bombs: 2, gold: 0, skills: [0, 0, 0], dead: false, flash: 0,
  ax: 0, az: -1, lunge: 0, noiseT: 0, ph: 0, b: null, reload: 0
};
function resetPlayer() {
  Object.assign(P, { hp: 100, san: 100, vx: 0, vz: 0, ammo: 10, bombs: 2, gold: 0, dead: false, rollT: 0, inv: 0, cdShot: 0, cdMelee: 0, cdRoll: 0 });
  P.skills = [baseSkill(0), baseSkill(1), baseSkill(2)];
}

/* ---------- enemy / rival definitions ---------- */
const RIVAL = { rival: true, hp: 75, spd: 3.0, chase: 5.2, view: 30, fov: 1.25, H: 2.05, ranged: true, dmg: 11, cd: 1.05, keep: 12, melee: 0 };
const TYPES = {
  spear: { hp: 50, spd: 2.5, chase: 5.2, view: 19, fov: .95, H: 2.55, melee: 2.8, dmg: 14, cd: 1.15, char: 'spear', name: 'Crusader spearman' },
  sword: { hp: 70, spd: 2.7, chase: 5.7, view: 18, fov: 1.0, H: 2.15, melee: 2.1, dmg: 18, cd: 1.0, char: 'sword', name: 'Crusader swordsman' },
  archer: { hp: 40, spd: 2.4, chase: 4.6, view: 28, fov: .9, H: 2.15, ranged: true, dmg: 12, cd: 1.9, char: 'archer', keep: 12, name: 'Crusader archer' },
  captain: { hp: 170, spd: 3.2, chase: 6.4, view: 34, fov: 1.2, H: 3.1, melee: 3.4, dmg: 22, cd: 1.3, char: 'captain', charge: true, name: 'Mounted captain', big: true },
  fox: Object.assign({}, RIVAL, { char: 'fox', name: 'Fox' }), rabbit: Object.assign({}, RIVAL, { char: 'rabbit', name: 'Rabbit' }),
  bird: Object.assign({}, RIVAL, { char: 'bird', name: 'Bird' }), dog: Object.assign({}, RIVAL, { char: 'dog', name: 'Dog' }),
  scribe: { hp: 1, H: 2.1, char: 'scribe', name: 'Scribe' }, keeper: { hp: 1, H: 2.1, char: 'keeper', name: 'Keeper' }, patron: { hp: 1, H: 2.0, char: 'patron', name: 'Patron' }
};

const projectiles = [], clouds = [];
function inCloud(x, z, L) { for (const c of clouds) if (c.L === L && Math.hypot(x - c.x, z - c.z) < c.r) return true; return false; }

function spawnActor(L, kind, x, z, o = {}) { return new Actor(L, kind, x, z, o); }

class Actor {
  constructor(L, kind, x, z, o = {}) {
    const T = this.T = TYPES[kind]; this.L = L; this.kind = kind;
    Object.assign(this, {
      x, z, hx: x, hz: z, f0: o.f || 0, fa: o.f || 0, hp: T.hp, maxhp: T.hp, state: o.npc ? 'npc' : o.route ? 'patrol' : 'idle', alert: 0, route: o.route || null, ri: 1, wait: 0, cd: rand(.3, 1.4),
      lose: 0, dead: false, deadT: 0, flash: 0, ph: Math.random() * 9, name: o.name || T.name, rival: !!T.rival, npc: !!o.npc, sleepy: !!o.sleepy, wind: 0, side: Math.random() < .5 ? 1 : -1,
      facing: 1, react: 0, moving: false, stun: 0, tele: 0, chg: 0, invX: 0, invZ: 0, invT: 0, lastX: x, lastZ: z, vx: 0, vz: 0, stuckT: 0, px: x, pz: z, spot: 0
    });
    this.b = makeBill(L, ART.charTex(T.char), T.H, { ownMat: true });
    this.b.g.position.set(x, 0, z); L.scene.add(this.b.g); L.bills.push(this.b.g);
    if (!o.npc) {
      const ic = new THREE.Mesh(PLANE, new THREE.MeshBasicMaterial({ map: ART.fxTex('excl'), transparent: true, depthTest: false, fog: false, color: 0xffd34a }));
      ic.scale.set(.8, .8, 1); ic.position.y = T.H + .55; ic.visible = false; ic.renderOrder = 20; this.b.g.add(ic); this.icon = ic;
    }
    L.actors.push(this);
  }
  get r() { return this.T.big ? 1.5 : .85; }
  facingVec() { return [Math.cos(this.fa), Math.sin(this.fa)]; }

  /* -------- perception -------- */
  look(d) {
    const T = this.T, L = this.L;
    if (P.dead || G.mode !== 'play') return false;
    const stealth = (P.sneak ? .5 : P.sprint ? 1.35 : 1) * (P.moving ? 1 : .78) * (P.rollT > 0 ? 1.2 : 1) * (L.dark ? .88 : 1) * (P.aim ? 1.1 : 1);
    const range = T.view * stealth, dx = P.x - this.x, dz = P.z - this.z;
    const pc = inCloud(P.x, P.z, L), mc = inCloud(this.x, this.z, L);
    if (mc && d > 2.2) return false;
    if (pc && d > 3.2) return false;
    const close = P.sneak ? 2.2 : 3.6;
    if (d > range && d > close) return false;
    const cosA = (Math.cos(this.fa) * dx + Math.sin(this.fa) * dz) / (d || 1);
    if (d > close && cosA < Math.cos(T.fov)) return false;
    return rayHit(L, this.x, this.z, P.x, P.z, 2.4) === null ? { range, stealth } : false;
  }
  spotPlayer() {
    this.state = 'chase'; this.alert = 1; this.lose = 0; this.lastX = P.x; this.lastZ = P.z; G.spotted = (G.spotted || 0) + 1;
    Aud.tone(740, .18, 'square', .09, -200);
    for (const a of this.L.actors) if (a !== this && !a.dead && !a.npc && !a.rival && a.state !== 'chase' && Math.hypot(a.x - this.x, a.z - this.z) < 15) { a.alert = 1; a.state = 'chase'; a.lose = 0; a.lastX = P.x; a.lastZ = P.z; }
    G.noticeFlag = true;
  }
  hear(x, z) { if (this.dead || this.npc || this.rival || this.state === 'chase') return; this.state = 'investigate'; this.invX = x; this.invZ = z; this.invT = 0; this.alert = Math.max(this.alert, .35); }

  /* -------- movement helper -------- */
  go(tx, tz, speed, dt) {
    const ang = steer(this.L, this, tx, tz), nx = Math.cos(ang), nz = Math.sin(ang);
    this.vx = nx * speed; this.vz = nz * speed; this.x += this.vx * dt; this.z += this.vz * dt;
    for (const a of this.L.actors) if (a !== this && !a.dead && !a.npc) { const dx = this.x - a.x, dz = this.z - a.z, d = Math.hypot(dx, dz); if (d < 1.1 && d > 1e-4) { this.x += dx / d * (1.1 - d) * .4; this.z += dz / d * (1.1 - d) * .4; } }
    collide(this.L, this, .55); this.moving = true;
    const want = Math.atan2(nz, nx); this.fa -= angDiff(this.fa, want) * Math.min(1, dt * 9);
  }
  turnTo(x, z, dt, k = 8) { const want = Math.atan2(z - this.z, x - this.x); this.fa -= angDiff(this.fa, want) * Math.min(1, dt * k); }

  /* -------- main brain -------- */
  update(dt) {
    const L = this.L, T = this.T;
    if (this.dead) { this.animate(dt); return; }
    if (this.npc) { this.moving = false; this.turnTo(P.x, P.z, dt, 3); this.animate(dt); return; }
    this.moving = false; this.cd -= dt; this.flash -= dt; this.stun -= dt;
    const dx = P.x - this.x, dz = P.z - this.z, d = Math.hypot(dx, dz);
    if (this.stun > 0) { this.animate(dt); return; }

    /* --- rivals --- */
    if (this.rival) { this.rivalBrain(dt, d); this.animate(dt); return; }

    /* --- perception & alert --- */
    const seen = this.look(d), sees = !!seen;
    if (this.state !== 'chase') {
      if (sees) {
        const rate = (1.5 * (1 - d / seen.range) + .55) * (this.sleepy ? .55 : 1) * (1 - .06 * P.skills[1]);
        this.alert = Math.min(1, this.alert + rate * dt); this.lastX = P.x; this.lastZ = P.z;
        if (this.state !== 'suspicious' && this.alert > .12) { this.state = 'suspicious'; this.wait = 0; }
        if (this.alert >= 1) this.spotPlayer();
      } else this.alert = Math.max(0, this.alert - dt * .22);
    } else if (sees) { this.lose = 0; this.lastX = P.x; this.lastZ = P.z; } else this.lose += dt;

    switch (this.state) {
      case 'idle': {
        const sw = this.sleepy ? .25 : .55;
        this.fa = this.f0 + Math.sin(G.time * (this.sleepy ? .4 : .7) + this.ph) * sw;
        if (Math.hypot(this.x - this.hx, this.z - this.hz) > 1) this.go(this.hx, this.hz, T.spd, dt);
        break;
      }
      case 'patrol': {
        if (this.wait > 0) { this.wait -= dt; this.fa += Math.sin(G.time * 1.3 + this.ph) * dt * .6; break; }
        const [tx, tz] = this.route[this.ri]; this.go(tx, tz, T.spd, dt);
        if (Math.hypot(tx - this.x, tz - this.z) < 1) { this.ri = (this.ri + 1) % this.route.length; this.wait = rand(.6, 1.8); }
        break;
      }
      case 'suspicious':
        this.turnTo(this.lastX, this.lastZ, dt, 5);
        if (this.alert <= 0) this.state = this.route ? 'patrol' : 'idle';
        break;
      case 'investigate': {
        this.invT += dt; const dd = Math.hypot(this.invX - this.x, this.invZ - this.z);
        if (dd > 1.4 && this.invT < 8) this.go(this.invX, this.invZ, T.spd * 1.5, dt); else { this.fa += Math.sin(G.time * 2 + this.ph) * dt * 1.4; if (this.invT > 5 + dd) { this.state = this.route ? 'patrol' : 'idle'; } }
        break;
      }
      case 'chase': this.chase(dt, d, sees); break;
      case 'search': {
        const dd = Math.hypot(this.lastX - this.x, this.lastZ - this.z);
        if (dd > 1.5) this.go(this.lastX, this.lastZ, T.chase * .7, dt); else { this.fa += Math.sin(G.time * 2.4) * dt * 2; this.wait += dt; }
        if (this.wait > 3.5) { this.wait = 0; this.alert = 0; this.state = this.route ? 'patrol' : 'idle'; }
        if (sees && this.alert > .5) this.spotPlayer();
        break;
      }
    }
    this.animate(dt);
  }

  chase(dt, d, sees) {
    const T = this.T;
    if (this.lose > 7) { this.state = 'search'; this.wait = 0; this.alert = .6; return; }
    const tx = sees ? P.x : this.lastX, tz = sees ? P.z : this.lastZ;
    /* attack wind-up in progress */
    if (this.wind > 0) { this.wind -= dt; this.turnTo(P.x, P.z, dt, 12); if (this.wind <= 0) this.strike(d); return; }
    if (T.charge) { this.captainBrain(dt, d, sees, tx, tz); return; }
    if (T.ranged) {
      if (sees && d < T.keep - 3) { const ang = Math.atan2(this.z - P.z, this.x - P.x); this.go(this.x + Math.cos(ang) * 4, this.z + Math.sin(ang) * 4, T.chase * .8, dt); }
      else if (!sees || d > T.keep + 5) this.go(tx, tz, T.chase, dt);
      else { this.turnTo(P.x, P.z, dt, 9); const a = Math.atan2(P.z - this.z, P.x - this.x) + 1.57 * this.side; this.go(this.x + Math.cos(a) * 3, this.z + Math.sin(a) * 3, 1.6, dt); }
      if (sees && d < T.view && this.cd <= 0) { this.wind = .55; this.cd = T.cd + rand(0, .6); }
    } else {
      if (d > T.melee * .85) this.go(tx, tz, T.chase, dt); else this.turnTo(P.x, P.z, dt, 12);
      if (d < T.melee && this.cd <= 0 && sees) { this.wind = .34; this.cd = T.cd; this.lunge = .3; }
    }
  }
  captainBrain(dt, d, sees, tx, tz) {
    const T = this.T;
    if (this.tele > 0) { this.tele -= dt; this.turnTo(P.x, P.z, dt, 12); this.chgDx = Math.cos(this.fa); this.chgDz = Math.sin(this.fa); if (this.tele <= 0) { this.chg = .85; Aud.sfx('horn'); } return; }
    if (this.chg > 0) {
      this.chg -= dt; this.moving = true; this.x += this.chgDx * 15 * dt; this.z += this.chgDz * 15 * dt; collide(this.L, this, .9); FX.puff(this.x, .3, this.z, 1, 0xe3cf9d, 1);
      if (!this.hitC && Math.hypot(P.x - this.x, P.z - this.z) < 2.1) { this.hitC = true; hurtPlayer(26, this, { kb: 7 }); }
      if (this.chg <= 0) { this.stun = 1.2; this.cd = 2.6; this.hitC = false; UI.sub('The captain is winded — strike now!', 1800); }
      return;
    }
    if (sees && d > 7 && d < 24 && this.cd <= 0) { this.tele = .85; UI.sub('The captain lowers his lance — ROLL!', 1600); Aud.tone(300, .5, 'sawtooth', .1, 120); return; }
    if (d > T.melee * .85) this.go(tx, tz, T.chase, dt); else this.turnTo(P.x, P.z, dt, 12);
    if (d < T.melee && this.cd <= 0 && sees) { this.wind = .5; this.cd = T.cd; }
  }
  strike(d) {
    const T = this.T, dx = P.x - this.x, dz = P.z - this.z, dd = Math.hypot(dx, dz) || 1;
    if (T.ranged) {
      const lead = this.rival ? .22 : .14, tx = P.x + P.vx * lead, tz = P.z + P.vz * lead, a = Math.atan2(tz - this.z, tx - this.x) + (this.rival ? rand(-.08, .08) : rand(-.04, .04));
      fireProjectile(this.L, this.x + Math.cos(a) * .8, this.z + Math.sin(a) * .8, Math.cos(a), Math.sin(a), this.rival ? 36 : 24, T.dmg, 'enemy', this.rival ? 0 : 1);
    } else {
      FX.slash(this.x, 1.1, this.z, dx / dd, dz / dd); Aud.sfx('slash');
      if (dd < T.melee * 1.4) hurtPlayer(T.dmg, this, { kb: 2.5 });
    }
  }

  /* -------- rival operatives (battle-royale opponents) -------- */
  rivalBrain(dt, d) {
    const T = this.T, L = this.L;
    const see = !P.dead && G.mode === 'play' && d < T.view && !inCloud(P.x, P.z, L) && (Math.cos(this.fa) * (P.x - this.x) + Math.sin(this.fa) * (P.z - this.z)) / (d || 1) > Math.cos(T.fov) && rayHit(L, this.x, this.z, P.x, P.z, 2.4) === null && (!P.sneak || d < 16);
    if (see) { this.react += dt; this.lastX = P.x; this.lastZ = P.z; this.lose = 0; if (this.react > .5) this.state = 'chase'; } else { this.react = Math.max(0, this.react - dt); if (this.state === 'chase') { this.lose += dt; if (this.lose > 6) this.state = 'patrol'; } }
    const stormOut = G.zoneOut && G.zoneOut(this.x, this.z);
    if (this.state === 'chase') {
      this.alert = 1;
      if (this.wind > 0) { this.wind -= dt; this.turnTo(P.x, P.z, dt, 12); if (this.wind <= 0) this.strike(d); return; }
      if (see && d < T.keep - 3) { const a = Math.atan2(this.z - P.z, this.x - P.x); this.go(this.x + Math.cos(a) * 4, this.z + Math.sin(a) * 4, T.chase * .8, dt); }
      else if (!see || d > T.keep + 6) this.go(this.lastX, this.lastZ, T.chase, dt);
      else { this.turnTo(P.x, P.z, dt, 9); const a = Math.atan2(P.z - this.z, P.x - this.x) + 1.57 * this.side; this.go(this.x + Math.cos(a) * 3, this.z + Math.sin(a) * 3, 2.4, dt); if (Math.random() < dt * .6) this.side *= -1; }
      if (see && this.cd <= 0) { this.wind = .4; this.cd = T.cd + rand(0, .5); }
    } else {
      this.alert = Math.max(0, this.alert - dt);
      if (this.wait > 0) { this.wait -= dt; return; }
      const [tx, tz] = stormOut ? [-4, -2] : this.route[this.ri]; this.go(tx, tz, T.spd * (stormOut ? 1.7 : 1), dt);
      if (Math.hypot(tx - this.x, tz - this.z) < 1.4) { this.ri = (this.ri + 1) % this.route.length; this.wait = rand(.5, 2.5); }
    }
  }

  /* -------- taking damage / dying -------- */
  hurt(dmg, o = {}) {
    if (this.dead || this.npc) return;
    this.hp -= dmg; this.flash = .14; Aud.sfx('hit'); UI.hit(); FX.ink(this.x, this.z); FX.paper(this.x, 1.2, this.z, 5);
    UI.pop(this.x, this.T.H + .4, this.z, '-' + Math.round(dmg), o.crit ? 'crit' : '');
    if (this.hp <= 0) { this.die(o); return; }
    if (this.rival) { this.state = 'chase'; this.lose = 0; this.lastX = P.x; this.lastZ = P.z; this.react = 1; }
    else if (this.state !== 'chase') { this.alert = 1; this.spotPlayer(); }
    if (o.kb) { this.x += o.kbx * o.kb * .1; this.z += o.kbz * o.kb * .1; collide(this.L, this, .6); }
  }
  die(o = {}) {
    this.dead = true; this.deadT = 0; this.state = 'dead'; if (this.icon) this.icon.visible = false; G.kills++; P.san = Math.max(0, P.san - (o.silent ? 1 : 2.5));
    Aud.sfx('kill'); FX.ink(this.x, this.z); FX.paper(this.x, 1, this.z, 14, 4.5); FX.puff(this.x, .4, this.z, 4, 0xf5edd8, 1.5);
    const lk = 1 + P.skills[1] * .22, L = this.L;
    if (this.rival) {
      G.rivalsAlive--; addXP(60); UI.feed(`<b>You</b> eliminated <b>${this.name}</b> — ${opsLeft()}`, 'kill');
      spawnPickup(L, 'coin', Math.round(rand(8, 14) * lk), this.x + .6, this.z); spawnPickup(L, 'bolt', 4, this.x - .6, this.z + .4);
      if (Math.random() < .55) spawnPickup(L, pick(['eye', 'clover', 'sun', 'sword']), 1, this.x, this.z - .8);
    } else {
      addXP(o.silent ? 35 : 20); if (o.silent) { G.silentKills = (G.silentKills || 0) + 1; UI.toast('<b>Silent takedown</b> +35 XP'); }
      spawnPickup(L, 'coin', Math.max(1, Math.round(rand(1, 5) * lk)), this.x + .5, this.z);
      if (Math.random() < .4) spawnPickup(L, 'bolt', 2, this.x - .5, this.z + .3);
      if (Math.random() < .12) spawnPickup(L, 'herb', 15, this.x, this.z - .7);
      if (this.T.big) { G.captainDead = true; spawnPickup(L, 'coin', 25, this.x, this.z + 1); spawnPickup(L, pick(['eye', 'clover', 'sun', 'sword']), 1, this.x + 1, this.z); addXP(150); UI.feed('<b>The mounted captain falls!</b>', 'kill'); }
    }
  }

  /* -------- sprite animation -------- */
  animate(dt) {
    const b = this.b, g = b.g, T = this.T;
    g.position.x = this.x; g.position.z = this.z;
    const cy = G.camYaw, dot = Math.cos(this.fa) * Math.cos(cy) + Math.sin(this.fa) * -Math.sin(cy);
    if (Math.abs(dot) > .2) this.facing = dot > 0 ? 1 : -1;
    const W = b.W;
    if (this.dead) {
      this.deadT += dt; const k = Math.min(1, this.deadT / .35), e = 1 - Math.pow(1 - k, 3);
      b.p.rotation.z = -this.facing * e * 1.5; b.p.position.y = -.05 * e; b.mesh.scale.x = this.facing * W; b.mat.color.setHex(0x9a958a); return;
    }
    const t = G.time * 9 + this.ph;
    const mv = this.moving ? 1 : 0; this.mvK = lerp(this.mvK || 0, mv, Math.min(1, dt * 10));
    b.p.position.y = Math.abs(Math.sin(t)) * .09 * this.mvK + Math.sin(G.time * 2 + this.ph) * .012;
    b.p.rotation.z = Math.sin(t) * .06 * this.mvK + (this.wind > 0 ? -.18 * this.facing : 0) + (this.tele > 0 ? .25 * this.facing * Math.sin(G.time * 40) : 0);
    b.p.scale.y = 1 + Math.sin(G.time * 2 + this.ph) * .01;
    b.mesh.scale.x = this.facing * W;
    if (this.lunge > 0) { this.lunge -= dt; }
    b.mat.color.setHex(this.flash > 0 ? 0xff7766 : (this.stun > 0 ? 0xb8c8ff : this.L.tint));
    if (this.icon) {
      const a = this.alert, show = a > .05 && this.state !== 'dead';
      this.icon.visible = show;
      if (show) { const chasing = this.state === 'chase'; this.icon.material.map = ART.fxTex(chasing || a >= 1 ? 'excl' : 'ques'); this.icon.material.color.setHex(chasing ? 0xff4b3a : 0xffd34a); const s = chasing ? .95 + Math.sin(G.time * 12) * .08 : .4 + a * .5; this.icon.scale.set(s, s, 1); this.icon.position.y = T.H + .55 + (chasing ? Math.abs(Math.sin(G.time * 8)) * .1 : 0); }
    }
  }
}

/* ---------- combat helpers ---------- */
function makeNoise(x, z, r) { if (!G.level) return; for (const a of G.level.actors) if (!a.dead && !a.npc && !a.rival && Math.hypot(a.x - x, a.z - z) < r) a.hear(x, z); }

function hurtPlayer(dmg, from, o = {}) {
  if (P.dead || P.inv > 0 || G.mode !== 'play') return;
  P.hp -= dmg; P.flash = .25; P.inv = .5; Aud.sfx('hurt'); G.shake = Math.max(G.shake, .35); UI.flash('hurtflash', 380);
  FX.paper(P.x, 1.3, P.z, 6); if (from && o.kb) { const dx = P.x - from.x, dz = P.z - from.z, d = Math.hypot(dx, dz) || 1; P.vx = dx / d * o.kb * 1.4; P.vz = dz / d * o.kb * 1.4; P.kbT = .25; }
  if (P.hp <= 0) { P.hp = 0; playerDied(from && from.name ? from.name : 'the Esagila'); }
}

const boltTex = () => ART.fxTex('glow');
function fireProjectile(L, x, z, dx, dz, speed, dmg, owner, kind = 0, opts = {}) {
  const geo = new THREE.BoxGeometry(kind ? 1.0 : .8, .07, .07), m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: owner === 'player' ? 0x2a2218 : (kind ? 0x6b5030 : 0x7a2b1e), fog: true }));
  m.position.set(x, 1.15, z); m.rotation.y = -Math.atan2(dz, dx); L.scene.add(m);
  const p = { L, x, z, dx, dz, speed, dmg, owner, life: 1.6, m, crit: opts.crit }; projectiles.push(p); return p;
}
function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i]; if (p.L !== G.level) { p.L.scene.remove(p.m); projectiles.splice(i, 1); continue; }
    const px = p.x, pz = p.z; p.x += p.dx * p.speed * dt; p.z += p.dz * p.speed * dt; p.life -= dt; let dead = p.life <= 0;
    if (!dead && rayHit(p.L, px, pz, p.x, p.z, 1.9) !== null) { dead = true; FX.puff(p.x, 1.1, p.z, 3, 0xe3cf9d, 1.5); }
    if (!dead && p.owner === 'player') {
      for (const a of p.L.actors) { if (a.dead || a.npc) continue; const r = a.r; if (segPointDist(px, pz, p.x, p.z, a.x, a.z) < r) { a.hurt(p.dmg, { crit: p.crit, kb: 1, kbx: p.dx, kbz: p.dz }); dead = true; break; } }
    } else if (!dead && p.owner === 'enemy') {
      if (segPointDist(px, pz, p.x, p.z, P.x, P.z) < .65) { hurtPlayer(p.dmg, { x: p.x - p.dx, z: p.z - p.dz }, { kb: 1.5 }); dead = true; }
    }
    p.m.position.set(p.x, 1.15, p.z); if (Math.random() < .6) FX.spawn({ tex: ART.fxTex('glow'), x: p.x, y: 1.15, z: p.z, s0: .4, s1: .05, life: .22, add: true, color: p.owner === 'player' ? 0xffe9b0 : 0xff8866 });
    if (dead) { p.L.scene.remove(p.m); projectiles.splice(i, 1); }
  }
}
function segPointDist(ax, az, bx, bz, px, pz) { const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz; let t = l2 ? ((px - ax) * dx + (pz - az) * dz) / l2 : 0; t = clamp(t, 0, 1); return Math.hypot(px - (ax + dx * t), pz - (az + dz * t)); }

/* ---------- player actions ---------- */
function aimDir() {
  /* shoot toward the crosshair (camera centre), with a little aim-assist */
  const L = G.level, pvx = Cam.pvx, pvz = Cam.pvz;
  let tx = pvx + P.ax * 60, tz = pvz + P.az * 60, dx = tx - P.x, dz = tz - P.z, d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
  let best = null, bd = .1;
  for (const a of L.actors) { if (a.dead || a.npc) continue; const ex = a.x - P.x, ez = a.z - P.z, ed = Math.hypot(ex, ez); if (ed > 40 || ed < 1) continue; const ang = Math.acos(clamp((ex * dx + ez * dz) / ed, -1, 1)); if (ang < bd && rayHit(L, P.x, P.z, a.x, a.z, 1.9) === null) { bd = ang; best = a; } }
  if (best) { const ex = best.x - P.x, ez = best.z - P.z, ed = Math.hypot(ex, ez); return [ex / ed, ez / ed]; }
  return [dx, dz];
}
function fireBolt() {
  if (P.cdShot > 0 || P.rollT > 0) return;
  if (P.ammo <= 0) { P.cdShot = .3; UI.sub('Out of bolts! Search the fallen and the chests.', 1500); Aud.tone(120, .08, 'square', .1); return; }
  P.ammo--; const [dx, dz] = aimDir(); const crit = Math.random() < .06 + .08 * P.skills[1];
  const dmg = 30 * (1 + .18 * P.skills[0]) * (crit ? 2 : 1);
  fireProjectile(G.level, P.x + dx * .8, P.z + dz * .8, dx, dz, 48, dmg, 'player', 0, { crit });
  P.cdShot = .8 / (1 + .12 * P.skills[0]); P.lunge = .1; Aud.sfx('shot'); makeNoise(P.x, P.z, 13); G.shake = Math.max(G.shake, .05); FX.puff(P.x + dx, 1.1, P.z + dz, 2, 0xffffff, .8, .5);
  P.face = (dx * Math.cos(G.camYaw) - dz * Math.sin(G.camYaw)) >= 0 ? 1 : -1; Cam.kick = .035;
}
function meleeAttack() {
  if (P.cdMelee > 0 || P.rollT > 0) return;
  P.cdMelee = .5; P.lunge = .22; const L = G.level; const dx = P.ax, dz = P.az;
  FX.slash(P.x, 1.1, P.z, dx, dz); Aud.sfx('slash'); makeNoise(P.x, P.z, 4);
  P.face = (dx * Math.cos(G.camYaw) - dz * Math.sin(G.camYaw)) >= 0 ? 1 : -1;
  let best = null, bs = 1e9;
  for (const a of L.actors) {
    if (a.dead || a.npc) continue; const ex = a.x - P.x, ez = a.z - P.z, d = Math.hypot(ex, ez);
    if (d > 2.6 + a.r * .4) continue; const cs = (ex * dx + ez * dz) / (d || 1); if (cs < .35) continue;
    if (d < bs) { bs = d; best = a; }
  }
  if (!best) return;
  const fv = best.facingVec(), toP = [P.x - best.x, P.z - best.z], tl = Math.hypot(toP[0], toP[1]) || 1;
  const behind = (fv[0] * toP[0] + fv[1] * toP[1]) / tl < .25, unaware = !best.rival && best.state !== 'chase' && best.alert < .99 && !best.T.big;
  if (unaware && behind) { G.hitstop = .12; best.hurt(999, { silent: true }); }
  else { const crit = Math.random() < .08 + .08 * P.skills[1]; best.hurt(34 * (1 + .18 * P.skills[0]) * (crit ? 2 : 1), { crit, kb: 3, kbx: dx, kbz: dz }); if (!unaware) G.hitstop = .05; }
}
function rollDodge(mx, mz) {
  if (P.cdRoll > 0 || P.rollT > 0) return;
  let dx = mx, dz = mz; if (!dx && !dz) { dx = -P.ax; dz = -P.az; }
  const l = Math.hypot(dx, dz) || 1; P.rdx = dx / l; P.rdz = dz / l; P.rollT = .42; P.inv = .42; P.cdRoll = .85; Aud.sfx('roll'); makeNoise(P.x, P.z, 5); FX.puff(P.x, .3, P.z, 4, 0xe3cf9d, 2);
  P.face = (P.rdx * Math.cos(G.camYaw) - P.rdz * Math.sin(G.camYaw)) >= 0 ? 1 : -1;
}
function throwBomb() {
  if (P.bombs <= 0) { UI.sub('No ink bombs left. The scribe sells them.', 1500); return; }
  P.bombs--; const d = Math.min(13, 6 + 7), tx = P.x + P.ax * d, tz = P.z + P.az * d;
  const hit = rayHit(G.level, P.x, P.z, tx, tz, 2.2), t = hit === null ? 1 : Math.max(.15, hit - .06), lx = P.x + (tx - P.x) * t, lz = P.z + (tz - P.z) * t;
  const m = new THREE.Mesh(PLANE, G.level.mat(ART.pickTex('bomb').tex, { at: true, double: true })); m.scale.set(.6, .6, 1); m.position.set(P.x, 1.4, P.z); G.level.scene.add(m); G.level.bills.push(m);
  G.bombs = G.bombs || []; G.bombs.push({ m, sx: P.x, sz: P.z, lx, lz, t: 0, T: .6, L: G.level }); Aud.sfx('roll'); P.lunge = .15;
}
function updateBombs(dt) {
  if (!G.bombs) return;
  for (let i = G.bombs.length - 1; i >= 0; i--) {
    const b = G.bombs[i]; b.t += dt; const k = Math.min(1, b.t / b.T);
    b.m.position.set(lerp(b.sx, b.lx, k), 1.4 + Math.sin(k * Math.PI) * 2.2 - k * 1.2, lerp(b.sz, b.lz, k)); b.m.rotation.z += dt * 10;
    if (k >= 1) {
      b.L.scene.remove(b.m); G.bombs.splice(i, 1);
      const cm = new THREE.Mesh(PLANE, new THREE.MeshBasicMaterial({ map: ART.fxTex('ink'), transparent: true, depthWrite: false, opacity: .94, fog: true, side: THREE.DoubleSide })); cm.position.set(b.lx, 2, b.lz); cm.scale.set(.5, .5, 1); b.L.scene.add(cm); b.L.bills.push(cm);
      clouds.push({ L: b.L, x: b.lx, z: b.lz, r: 4.4, t: 0, life: 7, m: cm }); Aud.sfx('bomb'); makeNoise(b.lx, b.lz, 11); FX.puff(b.lx, 1, b.lz, 10, 0x2a2622, 3);
    }
  }
  for (let i = clouds.length - 1; i >= 0; i--) {
    const c = clouds[i]; c.t += dt; const k = c.t / c.life, s = Math.min(c.r * 2.4, c.t * 12 + .5); c.m.scale.set(s, s * .8, 1); c.m.position.y = s * .38; c.m.material.opacity = k > .7 ? (1 - k) / .3 * .9 : .9;
    if (k >= 1) { c.L.scene.remove(c.m); clouds.splice(i, 1); }
  }
}

/* ---------- pickups ---------- */
function updatePickups(dt) {
  const L = G.level, mag = 1.5 + P.skills[2] * .35;
  for (let i = L.pick.length - 1; i >= 0; i--) {
    const p = L.pick[i]; p.t += dt; p.b.g.position.y = p.manual ? 1.55 + Math.sin(p.t * 2) * .08 : .15 + Math.sin(p.t * 3) * .07 + .1;
    if (p.type === 'tablet') { p.b.p.rotation.z = Math.sin(p.t * 1.6) * .08; continue; }
    const d = Math.hypot(P.x - p.x, P.z - p.z);
    if (d < mag + 1.5 && d > .6) { p.x += (P.x - p.x) / d * 4 * dt * (d < mag ? 2.2 : 0); p.z += (P.z - p.z) / d * 4 * dt * (d < mag ? 2.2 : 0); p.b.g.position.x = p.x; p.b.g.position.z = p.z; }
    if (d < .85) { collectPickup(p); L.scene.remove(p.b.g); L.pick.splice(i, 1); }
  }
}
function collectPickup(p) {
  switch (p.type) {
    case 'coin': P.gold += p.val; Aud.sfx('coin'); UI.pop(P.x, 2.6, P.z, '+' + p.val + ' gold', 'gold'); break;
    case 'bolt': P.ammo = Math.min(30, P.ammo + p.val); Aud.sfx('pick'); UI.pop(P.x, 2.6, P.z, '+' + p.val + ' bolts'); break;
    case 'bomb': P.bombs = Math.min(6, P.bombs + p.val); Aud.sfx('pick'); UI.pop(P.x, 2.6, P.z, '+ink bomb'); break;
    case 'herb': P.hp = Math.min(P.maxhp, P.hp + p.val); Aud.sfx('pick'); UI.pop(P.x, 2.6, P.z, '+' + p.val + ' HP', 'heal'); break;
    case 'wine': P.san = Math.min(100, P.san + p.val); Aud.sfx('pick'); break;
    case 'eye': case 'clover': case 'sun': case 'sword': giveCard(p.type); break;
  }
}
function giveCard(type) {
  Aud.sfx('card');
  if (type === 'eye') { P.skills[2] = Math.min(5, P.skills[2] + 1); UI.toast(`<img src="${ART.iconURL('eye')}"> <b>Card: Observation +1</b> — you spot more, from farther away`, 4200, 'gold'); }
  if (type === 'clover') { P.skills[1] = Math.min(5, P.skills[1] + 1); UI.toast(`<img src="${ART.iconURL('clover')}"> <b>Card: Luck +1</b> — richer loot, sneakier steps, more crits`, 4200, 'gold'); }
  if (type === 'sword') { P.skills[0] = Math.min(5, P.skills[0] + 1); UI.toast(`<img src="${ART.iconURL('sword')}"> <b>Card: Combat +1</b> — harder hits, faster crossbow`, 4200, 'gold'); }
  if (type === 'sun') { P.san = 100; P.hp = Math.min(P.maxhp, P.hp + 30); UI.toast(`<img src="${ART.iconURL('sun')}"> <b>Card: Dawn</b> — sanity restored, wounds close`, 4200, 'gold'); }
  addXP(25);
}

/* ---------- player update ---------- */
function updatePlayer(dt) {
  const L = G.level;
  P.cdShot -= dt; P.cdMelee -= dt; P.cdRoll -= dt; P.inv -= dt; P.flash -= dt;
  const fwd = (key('KeyW') ? 1 : 0) - (key('KeyS') ? 1 : 0), sd = (key('KeyD') ? 1 : 0) - (key('KeyA') ? 1 : 0);
  Cam.yaw += ((key('ArrowLeft') ? 1 : 0) - (key('ArrowRight') ? 1 : 0)) * 2 * dt; Cam.pitch += ((key('ArrowDown') ? 1 : 0) - (key('ArrowUp') ? 1 : 0)) * 1.2 * dt;
  const Fx = -Math.sin(Cam.yaw), Fz = -Math.cos(Cam.yaw), Rx = Math.cos(Cam.yaw), Rz = -Math.sin(Cam.yaw);
  P.ax = Fx; P.az = Fz;
  let mx = Fx * fwd + Rx * sd, mz = Fz * fwd + Rz * sd; const ml = Math.hypot(mx, mz); if (ml > 0) { mx /= ml; mz /= ml; }
  P.sneak = key('KeyC') || key('ControlLeft'); P.aim = Input.mb[2] || key('KeyV'); P.sprint = key('ShiftLeft') && !P.sneak && ml > 0 && !P.aim;
  const speed = P.sneak ? 2.2 : P.aim ? 2.6 : P.sprint ? 7 : 4.4;
  if (P.rollT > 0) { P.rollT -= dt; P.vx = P.rdx * 11.5; P.vz = P.rdz * 11.5; }
  else if (P.kbT > 0) { P.kbT -= dt; }
  else { const k = Math.min(1, dt * 13); P.vx = lerp(P.vx, mx * speed, k); P.vz = lerp(P.vz, mz * speed, k); }
  P.x += P.vx * dt; P.z += P.vz * dt; collide(L, P, .45);
  P.moving = Math.hypot(P.vx, P.vz) > .6;
  if (P.sprint && P.moving) { P.noiseT -= dt; if (P.noiseT <= 0) { makeNoise(P.x, P.z, 9 - P.skills[1] * .5); P.noiseT = .45; FX.puff(P.x, .2, P.z, 1, 0xe3cf9d, .6, .7); } }
  if ((Input.mbp[0] || Input.mb[0]) && (Input.locked || Input.lockFailed)) fireBolt();
  if (tap('KeyF') || (Input.mbp[1])) meleeAttack();
  if (tap('KeyQ')) throwBomb();
  if (tap('Space')) rollDodge(mx, mz);
  if (P.moving && Math.abs(sd) + Math.abs(fwd) > 0 && P.rollT <= 0) { const dot = P.vx * Rx + P.vz * Rz; if (Math.abs(dot) > .8) P.face = dot > 0 ? 1 : -1; }
}
function animatePlayer(dt) {
  const b = P.b; if (!b) return; const g = b.g; g.position.set(P.x, 0, P.z);
  const t = G.time * (P.sprint ? 14 : 9), mv = P.moving ? 1 : 0; P.mvK = lerp(P.mvK || 0, mv, Math.min(1, dt * 12));
  b.p.position.y = Math.abs(Math.sin(t)) * (P.sprint ? .13 : .09) * P.mvK + (P.sneak ? 0 : Math.sin(G.time * 2) * .012);
  let roll = Math.sin(t) * .07 * P.mvK;
  if (P.rollT > 0) roll = -P.face * (1 - P.rollT / .42) * 6.283;
  b.p.rotation.z = roll + (P.lunge > 0 ? -.2 * P.face : 0); P.lunge = Math.max(0, P.lunge - dt);
  b.p.scale.set(1, P.sneak ? .78 : 1 + Math.sin(G.time * 2) * .01, 1);
  b.mesh.scale.x = P.face * b.W;
  b.mat.color.setHex(P.flash > 0 && Math.floor(G.time * 30) % 2 ? 0xff6655 : (P.inv > 0 && P.rollT <= 0 ? 0xffffff : G.level.tint));
  b.mat.opacity = 1;
}
