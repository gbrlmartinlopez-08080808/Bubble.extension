/* ============================================================
   INK OF BABYLON — actors.js
   player · weapons · people · social-stealth guard AI · bodies · projectiles
   ============================================================ */
'use strict';

/* ---------- permanent save (XP is permanent) ---------- */
const SAVE = (() => { let s = { xp: 0, bank: 0, best: 0, done: {} }; try { s = Object.assign(s, JSON.parse(localStorage.getItem('inkOfBabylon2') || '{}')); } catch (e) { } return s; })();
const saveGame = () => { try { localStorage.setItem('inkOfBabylon2', JSON.stringify(SAVE)); } catch (e) { } };
const rankOf = xp => Math.floor(xp / 150);
function addXP(n, quiet) { const r0 = rankOf(SAVE.xp); SAVE.xp += n; G.xpRun = (G.xpRun || 0) + n; saveGame(); if (!quiet) UI.pop(P.x, 2.8, P.z, '+' + n + ' XP', 'gold'); if (rankOf(SAVE.xp) > r0) { UI.toast(`<b>RANK UP</b> — Rank ${rankOf(SAVE.xp)}. Your skills grow permanently.`, 4600, 'gold'); Aud.sfx('win'); } }
const baseSkill = i => Math.floor((rankOf(SAVE.xp) + 2 - i) / 3);

/* ---------- the player (Tabni, posing as General Nabû-nāṣir) ---------- */
const WEAPONS = ['bow', 'knife', 'sling', 'pot'];
const P = {
  x: 0, z: 0, vx: 0, vz: 0, hp: 100, maxhp: 100, san: 100, face: 1, moving: false, sprint: false, sneak: false, aim: false, drawT: 0, weapon: null, ammo: { bow: 14, sling: 10, pot: 2 }, gold: 30,
  skills: [0, 0, 0], dead: false, flash: 0, ax: 0, az: -1, cdAtk: 0, cdRoll: 0, rollT: 0, rdx: 0, rdz: 0, inv: 0, hidden: false, hideSpot: null, clearance: 0, permit: {}, cover: 'intact', fig: null, noiseT: 0, stepT: 0, kbT: 0, carry: null, busy: 0
};
function resetPlayer(opts = {}) {
  Object.assign(P, { hp: 100, san: 100, vx: 0, vz: 0, weapon: null, ammo: { bow: 14, sling: 10, pot: 2 }, gold: 30, dead: false, rollT: 0, inv: 0, cdAtk: 0, cdRoll: 0, hidden: false, hideSpot: null, clearance: 0, permit: {}, cover: 'intact', carry: null, drawT: 0, busy: 0 }, opts);
  P.skills = [baseSkill(0), baseSkill(1), baseSkill(2)]; G.items = {}; G.alert = 0; if (P.fig) P.fig.setHold(null);
}
function setWeapon(w) {
  if (P.busy > 0 || G.mode !== 'play') return; if (w === P.weapon) w = null; P.weapon = w; P.drawT = 0;
  if (P.fig) P.fig.setHold(w); Aud.sfx('paper'); if (window.VM) VM.hold(w);
  $('wslot').innerHTML = w ? `<img src="${ART.iconURL(w)}"> ${{ bow: 'Bow', knife: 'Knife', sling: 'Sling', pot: 'Clay pot' }[w]}` : `<img src="${ART.iconURL('hand')}"> Empty hands`;
}

/* ---------- NPC types ---------- */
const TY = {
  soldier: { hp: 60, spd: 2.4, chase: 5.2, view: 21, fov: 1.0, melee: 2.4, dmg: 14, cd: 1.1, name: 'Guard', role: 'guard', hold: 'spear' },
  shield: { hp: 80, spd: 2.3, chase: 4.8, view: 20, fov: .95, melee: 2.1, dmg: 16, cd: 1.1, name: 'Shield-bearer', role: 'guard', hold: 'sword', off: 'shield', shield: true },
  archer: { hp: 42, spd: 2.4, chase: 4.8, view: 30, fov: .9, name: 'Archer', role: 'guard', hold: 'bow', ranged: true, dmg: 12, cd: 1.8, keep: 12 },
  captain: { hp: 180, spd: 2.8, chase: 6.2, view: 30, fov: 1.15, melee: 3, dmg: 24, cd: 1.3, name: 'Captain', role: 'guard', hold: 'sword', off: 'shield', shield: true, big: true, charge: true },
  citizen: { hp: 30, spd: 1.6, role: 'civ', name: 'Citizen' }
};
const NPCS = []; const projectiles = [];
class NPC {
  constructor(L, d) {
    const T = this.T = Object.assign({}, TY[d.type] || TY.citizen, d.T || {}); this.L = L; this.d = d; const fk = d.fig || 'citizenM';
    Object.assign(this, {
      x: d.x, z: d.z, hx: d.x, hz: d.z, f0: d.f || 0, fa: d.f || 0, hp: T.hp, maxhp: T.hp, name: d.name || T.name, role: d.role || T.role || 'civ', state: d.route ? 'patrol' : 'idle', route: d.route || null, ri: 1, wait: 0, cd: rand(.4, 1.4), sus: 0, hostile: false,
      lose: 0, lastX: d.x, lastZ: d.z, dead: false, ph: Math.random() * 9, wind: 0, moving: false, side: Math.random() < .5 ? 1 : -1, stun: 0, talk: d.talk || null, salCd: rand(0, 8), reason: null, vis: false, chatWith: null, mvK: 0, inv: 0, atk: 0, flank: 0, fled: false, panic: 0, speed: 0, hide: null
    });
    this.fig = new Paper.Figure(L, fk, { hold: d.hold !== undefined ? d.hold : T.hold, off: d.off !== undefined ? d.off : T.off, scale: d.scale });
    this.fig.shadow.material = L.shadowMat; this.fig.addTo(L.scene); this.fig.place(d.x, d.z);
    if (d.anim) this.fig.pose(d.anim); if (d.seated) this.fig.pose({ sit: 1 });
    if (this.role === 'guard' || d.icon) {
      const ic = new THREE.Mesh(PLANE, new THREE.MeshBasicMaterial({ map: ART.fxTex('excl'), transparent: true, depthTest: false, color: 0xffd34a })); ic.scale.set(.8, .8, 1); ic.position.y = 2.3; ic.visible = false; ic.renderOrder = 20; this.fig.root.add(ic); this.icon = ic;
    }
    L.actors.push(this); NPCS.push(this);
  }
  facingVec() { return [Math.cos(this.fa), Math.sin(this.fa)]; }
  get r() { return this.T.big ? 1 : .6; }

  /* ---- perception ---- */
  see() {
    const L = this.L, T = this.T; if (P.dead || P.hidden || !T.view) return false;
    const dx = P.x - this.x, dz = P.z - this.z, d = Math.hypot(dx, dz) || .01;
    const range = T.view * (P.sneak ? .6 : P.sprint ? 1.3 : 1) * (P.moving ? 1 : .8) * (L.o.dark ? .8 : 1) * (G.alert >= 1 ? 1.25 : 1) * (1 - .05 * P.skills[1]), close = P.sneak ? 1.8 : 3;
    if (d > range && d > close) return false;
    if (d > close) { const cs = (Math.cos(this.fa) * dx + Math.sin(this.fa) * dz) / d; if (cs < Math.cos(T.fov)) return false; }
    if (rayHit(L, this.x, this.z, P.x, P.z, 2.2) !== null) return false;
    this._d = d; this._range = range; return true;
  }
  violation() {
    const L = this.L, z = L.zoneAt(P.x, P.z), permit = z && P.permit[z.id] && P.permit[z.id] > G.time;
    if (P.carry) return { why: 'body', rate: 1.4, hard: true };
    if (P.weapon && P.weapon !== 'knife' && P.weapon !== 'pot' || P.weapon === 'knife' && P.atkFlash > 0) return (z && z.level > 0) || this.role === 'guard' ? { why: 'armed', rate: .55 } : null;
    if (z && z.level > P.clearance && !permit) { if (P.sprint) return { why: 'running', rate: .7 }; if (P.sneak) return { why: 'sneaking', rate: .7 }; return { why: 'trespass', rate: .38 }; }
    if (P.sneak && this.role === 'guard' && z) return { why: 'sneaking', rate: .4 };
    return null;
  }

  /* ---- reactions ---- */
  makeHostile(reason) {
    if (this.dead || this.hostile || this.role !== 'guard') return; this.hostile = true; this.state = 'chase'; this.sus = 1; this.lose = 0; this.lastX = P.x; this.lastZ = P.z; this.flank = Math.random() < .4 ? (Math.random() < .5 ? 1 : -1) : 0; this.reason = reason;
    G.alert = 2; G.alertT = 0; if (!G.hornT || G.time - G.hornT > 8) { G.hornT = G.time; Aud.sfx('horn'); UI.sub('"Intruder!" — the garrison is alerted.', 2200); }
    for (const o of this.L.actors) if (o !== this && !o.dead && o.role === 'guard' && !o.hostile && Math.hypot(o.x - this.x, o.z - this.z) < 28) { o.makeHostile('shout'); o.lastX = P.x; o.lastZ = P.z; }
  }
  hear(x, z, loud) { if (this.dead || this.hostile || this.role !== 'guard' || this.state === 'challenge') return; this.state = 'investigate'; this.invX = x; this.invZ = z; this.invT = 0; this.sus = Math.max(this.sus, loud ? .5 : .25); }
  go(tx, tz, speed, dt) {
    const ang = steer(this.L, this, tx, tz), nx = Math.cos(ang), nz = Math.sin(ang); this.x += nx * speed * dt; this.z += nz * speed * dt;
    for (const a of this.L.actors) if (a !== this && !a.dead) { const dx = this.x - a.x, dz = this.z - a.z, d = Math.hypot(dx, dz); if (d < .95 && d > 1e-4) { this.x += dx / d * (.95 - d) * .4; this.z += dz / d * (.95 - d) * .4; } }
    collide(this.L, this, .5); this.moving = true; this.speed = speed; this.fa -= angDiff(this.fa, Math.atan2(nz, nx)) * Math.min(1, dt * 9);
  }
  turnTo(x, z, dt, k = 8) { this.fa -= angDiff(this.fa, Math.atan2(z - this.z, x - this.x)) * Math.min(1, dt * k); }

  /* ---- brain ---- */
  update(dt) {
    const L = this.L, T = this.T; this.moving = false; this.speed = 0; this.cd -= dt; this.stun -= dt; this.salCd -= dt; this.inv -= dt; this.atk -= dt;
    if (this.dead) return;
    if (this.stun > 0) { this.animate(dt); return; }
    const dx = P.x - this.x, dz = P.z - this.z, d = Math.hypot(dx, dz);
    if (this.role === 'guard') this.guardBrain(dt, d); else this.civBrain(dt, d);
    this.animate(dt);
  }
  civBrain(dt, d) {
    const T = this.T;
    if (this.panic > 0) { this.panic -= dt; const a = Math.atan2(this.z - this.fz, this.x - this.fx); this.go(this.x + Math.cos(a) * 5, this.z + Math.sin(a) * 5, 4.8, dt); if (this.icon) this.icon.visible = true; return; }
    if (this.icon) this.icon.visible = false;
    if (this.d.static) { this.fa = this.f0 + (this.d.sweep ? Math.sin(G.time * .5 + this.ph) * .3 : 0); if (this.d.lookAtPlayer && d < 6) this.turnTo(P.x, P.z, dt, 3); return; }
    if (this.state === 'patrol' && this.route) { if (this.wait > 0) { this.wait -= dt; return; } const [tx, tz] = this.route[this.ri]; this.go(tx, tz, T.spd, dt); if (Math.hypot(tx - this.x, tz - this.z) < 1) { this.ri = (this.ri + 1) % this.route.length; this.wait = rand(.5, 3); } }
    else this.fa = this.f0 + Math.sin(G.time * .6 + this.ph) * .25;
    if (!this.d.noTurn && d < 3.5 && !this.route) this.turnTo(P.x, P.z, dt, 2);
    /* witnesses of a visible corpse panic */
    for (const c of this.L.corpses) if (!c.hidden && !c.found && Math.hypot(c.x - this.x, c.z - this.z) < 14 && rayHit(this.L, this.x, this.z, c.x, c.z, 2.2) === null) { c.found = true; this.fx = c.x; this.fz = c.z; this.panic = 7; Aud.sfx('scare'); G.alarmBody(c, this); }
  }
  guardBrain(dt, d) {
    const L = this.L, T = this.T, sees = this.see(); this.vis = sees;
    /* greetings for a cover that's intact */
    if (!this.hostile && sees && d < 7 && this.salCd <= 0 && G.alert < 1 && !this.violation()) { this.salCd = 22 + rand(0, 14); this.fig.pose({ salute: 1 }); this.saluteT = 1.6; if (d < 5 && Math.random() < .6) UI.sub(pick(['"Hail, General!"', '"May Marduk bless you, my lord."', '"General."', '"Honor to you, Rab-ṣābi."']), 1800); }
    if (this.saluteT > 0) { this.saluteT -= dt; this.turnTo(P.x, P.z, dt, 5); if (this.saluteT <= 0) this.fig.pose({ salute: 0 }); }
    /* bodies */
    if (!this.hostile) for (const c of L.corpses) if (!c.hidden && !c.found && Math.hypot(c.x - this.x, c.z - this.z) < 16 && rayHit(L, this.x, this.z, c.x, c.z, 2.2) === null) { c.found = true; G.alarmBody(c, this); this.state = 'investigate'; this.invX = c.x; this.invZ = c.z; this.invT = 0; this.sus = Math.max(this.sus, .7); UI.sub('"A body! Search the area!"', 2400); }
    /* suspicion */
    if (!this.hostile) {
      const v = sees ? this.violation() : null;
      if (v) {
        const k = v.rate * (1 - this._d / this._range * .6) * (1 - .04 * P.skills[1]); this.sus = Math.min(1, this.sus + k * dt); this.reason = v.why; this.lastX = P.x; this.lastZ = P.z;
        if (this.state !== 'challenge' && this.state !== 'suspicious') this.state = 'suspicious';
        if (this.sus >= 1) { if (v.hard) this.makeHostile(v.why); else this.startChallenge(v.why); }
      } else this.sus = Math.max(0, this.sus - dt * .22);
    }
    switch (this.state) {
      case 'idle': {
        if (this.chatWith && !this.chatWith.dead) { const o = this.chatWith; this.turnTo(o.x, o.z, dt, 4); this.fig.pose({ talk: (Math.sin(G.time * .8 + this.ph) > .1) ? 1 : 0 }); this.fig.T.talk = Math.sin(G.time * .7 + this.ph) > 0 ? 1 : 0; this.overhear(dt, d); break; }
        this.fa = this.f0 + Math.sin(G.time * .6 + this.ph) * (this.d.sleepy ? .15 : .5);
        if (Math.hypot(this.x - this.hx, this.z - this.hz) > 1) this.go(this.hx, this.hz, T.spd, dt); break;
      }
      case 'patrol': {
        if (this.wait > 0) { this.wait -= dt; this.fa += Math.sin(G.time * 1.3 + this.ph) * dt * .6; break; }
        const [tx, tz] = this.route[this.ri]; this.go(tx, tz, T.spd, dt); if (Math.hypot(tx - this.x, tz - this.z) < 1) { this.ri = (this.ri + 1) % this.route.length; this.wait = rand(.6, 2); } break;
      }
      case 'suspicious': this.turnTo(this.lastX, this.lastZ, dt, 5); if (this.sus <= 0) { this.state = this.route ? 'patrol' : 'idle'; this.reason = null; } break;
      case 'challenge': this.challengeTick(dt); break;
      case 'investigate': {
        this.invT += dt; const dd = Math.hypot(this.invX - this.x, this.invZ - this.z);
        if (dd > 1.6 && this.invT < 10) this.go(this.invX, this.invZ, T.spd * 1.5, dt); else { this.fa += Math.sin(G.time * 2 + this.ph) * dt * 1.6; if (this.invT > 5 + dd * .4) { this.sus = 0; this.state = this.route ? 'patrol' : 'idle'; } }
        break;
      }
      case 'chase': this.combat(dt, d, sees); break;
      case 'search': {
        const sp = this.spot || { x: this.lastX, z: this.lastZ }, dd = Math.hypot(sp.x - this.x, sp.z - this.z);
        if (dd > 1.6) this.go(sp.x, sp.z, T.chase * .65, dt); else { this.fa += Math.sin(G.time * 2.4 + this.ph) * dt * 2.2; this.wait += dt; for (const h of L.hides) if (P.hidden && P.hideSpot === h && Math.hypot(h.x - this.x, h.z - this.z) < 3.2 && this.wait > 1.2) { this.state = 'chase'; this.lose = 0; this.lastX = P.x; this.lastZ = P.z; UI.sub('"There! He is hiding!"', 1800); P.hidden = false; P.hideSpot = null; } }
        if (this.wait > 4.2) { this.wait = 0; this.spot = { x: this.lastX + rand(-9, 9), z: this.lastZ + rand(-9, 9) }; this.searchN = (this.searchN || 0) + 1; }
        if ((this.searchN || 0) >= 3) { this.searchN = 0; this.hostile = false; this.sus = 0; this.state = this.route ? 'patrol' : 'idle'; this.spot = null; }
        if (sees) this.makeHostileAgain(); break;
      }
      case 'flee': { const a = Math.atan2(this.z - P.z, this.x - P.x); this.go(this.x + Math.cos(a) * 6, this.z + Math.sin(a) * 6, T.chase, dt); if (this.state === 'flee' && (d > 18 || (this.fleeT -= dt) < 0)) { this.state = 'chase'; this.fled = true; } break; }
    }
    if (this.icon) {
      const show = this.sus > .05 || this.hostile, hot = this.hostile; this.icon.visible = show && !this.dead;
      if (show) { this.icon.material.map = ART.fxTex(hot || this.sus >= 1 ? 'excl' : 'ques'); this.icon.material.color.setHex(hot ? 0xc0392b : this.reason === 'running' || this.reason === 'armed' ? 0xe08040 : 0xffd34a); const s = hot ? .95 + Math.sin(G.time * 12) * .08 : .35 + this.sus * .55; this.icon.scale.set(s, s, 1); this.icon.position.y = 2.3 * (this.fig.size || 1) + (hot ? Math.abs(Math.sin(G.time * 8)) * .1 : 0); }
    }
  }
  makeHostileAgain() { this.hostile = true; this.state = 'chase'; this.lose = 0; this.lastX = P.x; this.lastZ = P.z; G.alert = 2; G.alertT = 0; }
  overhear(dt, d) {
    const o = this.d.overhear; if (!o || o.done || d > 7 || !this.vis && d > 5) return; o.t = (o.t || 0) + dt * (1 + P.skills[2] * .3); if (o.t > 2.2 && !G.listening) { G.listening = true; o.done = true; (async () => { for (const [who, line] of o.lines) { await UI.say(who, line, { keep: true }); } UI.hideLines(); G.listening = false; if (o.flag) { G.flags[o.flag] = true; UI.toast(`<img src="${ART.iconURL('ear' in ART.ICONS ? 'ear' : 'eye')}"> <b>Overheard:</b> ${o.intel}`, 6000, 'gold'); addXP(20); } })(); }
  }

  /* ---- being challenged ---- */
  startChallenge(why) { if (this.state === 'challenge' || G.mode !== 'play' || G.challenging) return; this.state = 'challenge'; G.challenging = this; this.why = why; this.approachT = 0; }
  challengeTick(dt) {
    this.approachT += dt; const d = Math.hypot(P.x - this.x, P.z - this.z);
    if (d > 2.4 && this.approachT < 6) { this.go(P.x, P.z, 4, dt); this.turnTo(P.x, P.z, dt, 10); if (this.icon) { this.icon.visible = true; this.icon.material.map = ART.fxTex('excl'); this.icon.material.color.setHex(0xe08040); } }
    else { G.challenging = null; runChallenge(this, this.why); }
  }

  /* ---- combat ---- */
  combat(dt, d, sees) {
    const T = this.T, L = this.L;
    if (sees) { this.lose = 0; this.lastX = P.x; this.lastZ = P.z; } else this.lose += dt;
    if (this.lose > 6.5) { this.state = 'search'; this.wait = 0; this.searchN = 0; const k = L.actors.filter(o => o.role === 'guard' && o.hostile && !o.dead).indexOf(this), n = Math.max(1, L.actors.filter(o => o.role === 'guard' && o.hostile && !o.dead).length); const a = k / n * 6.28; this.spot = { x: this.lastX + Math.cos(a) * 8, z: this.lastZ + Math.sin(a) * 8 }; return; }
    const tx = sees ? P.x : this.lastX, tz = sees ? P.z : this.lastZ, dd = Math.hypot(tx - this.x, tz - this.z);
    if (this.hp < this.maxhp * .3 && !this.fled && !T.big) { this.state = 'flee'; this.fleeT = 5; UI.sub('"Reinforcements! Help!"', 1600); G.alert = 2; for (const o of L.actors) if (o.role === 'guard' && !o.hostile && !o.dead && Math.hypot(o.x - this.x, o.z - this.z) < 40) o.makeHostile('call'); return; }
    if (this.wind > 0) { this.wind -= dt; this.turnTo(P.x, P.z, dt, 12); if (this.wind <= 0) this.strike(d); return; }
    if (T.charge && this.chargeBrain(dt, d, sees, tx, tz)) return;
    if (T.ranged) {
      if (sees && d < T.keep - 4) { const a = Math.atan2(this.z - P.z, this.x - P.x); this.go(this.x + Math.cos(a) * 5, this.z + Math.sin(a) * 5, T.chase, dt); }
      else if (!sees || d > T.keep + 6) this.go(tx, tz, T.chase * .9, dt);
      else { this.turnTo(P.x, P.z, dt, 9); const a = Math.atan2(P.z - this.z, P.x - this.x) + 1.57 * this.side; this.go(this.x + Math.cos(a) * 3, this.z + Math.sin(a) * 3, 1.8, dt); if (Math.random() < dt * .4) this.side *= -1; }
      if (sees && d < T.view && this.cd <= 0) { this.wind = .65; this.cd = T.cd + rand(0, .7); this.fig.pose({ aim: 1, draw: 1 }); this.fig.facing = (P.x - this.x) * Math.cos(G.camYaw) - (P.z - this.z) * Math.sin(G.camYaw) >= 0 ? 1 : -1; }
      return;
    }
    /* melee: flank, circle until a token is free, strike, back off */
    const attackers = L.actors.filter(o => !o.dead && o.hostile && o.atk > 0).length;
    if (this.backoff > 0) { this.backoff -= dt; const a = Math.atan2(this.z - P.z, this.x - P.x); this.go(this.x + Math.cos(a) * 3, this.z + Math.sin(a) * 3, T.chase * .6, dt); return; }
    if (this.flank && dd > 8 && sees) { const a = Math.atan2(this.z - P.z, this.x - P.x) + this.flank * 1.4; this.go(P.x + Math.cos(a) * 7, P.z + Math.sin(a) * 7, T.chase, dt); if (Math.hypot(this.x - (P.x + Math.cos(a) * 7), this.z - (P.z + Math.sin(a) * 7)) < 3) this.flank = 0; return; }
    if (dd > T.melee * .9 && (attackers < 2 || this.atk > 0 || dd > 7)) this.go(tx, tz, T.chase, dt);
    else if (dd <= 7 && attackers >= 2 && this.atk <= 0) { this.turnTo(P.x, P.z, dt, 8); const a = Math.atan2(this.z - P.z, this.x - P.x) + this.side * .6 * dt; this.go(P.x + Math.cos(a) * 5.2, P.z + Math.sin(a) * 5.2, 2.2, dt); }
    else this.turnTo(P.x, P.z, dt, 12);
    if (sees && dd < T.melee && this.cd <= 0 && (attackers < 2 || this.atk > 0)) { this.wind = .42; this.atk = 1.2; this.cd = T.cd + rand(0, .5); this.fig.pose({ swing: 1 }); this.fig.pose({ lunge: 1 }); this.fig.facing = (P.x - this.x) * Math.cos(G.camYaw) - (P.z - this.z) * Math.sin(G.camYaw) >= 0 ? 1 : -1; }
  }
  chargeBrain(dt, d, sees, tx, tz) {
    if (this.tele > 0) { this.tele -= dt; this.turnTo(P.x, P.z, dt, 12); this.cdx = Math.cos(this.fa); this.cdz = Math.sin(this.fa); if (this.tele <= 0) { this.chg = .8; Aud.sfx('horn'); } return true; }
    if (this.chg > 0) { this.chg -= dt; this.moving = true; this.speed = 15; this.x += this.cdx * 15 * dt; this.z += this.cdz * 15 * dt; collide(this.L, this, .9); FX.puff(this.x, .3, this.z, 1, 0xd8c8a0, 1); if (!this.hitC && Math.hypot(P.x - this.x, P.z - this.z) < 2) { this.hitC = true; hurtPlayer(28, this, { kb: 7 }); } if (this.chg <= 0) { this.stun = 1.3; this.cd = 2.4; this.hitC = false; UI.sub('The captain is winded — strike now!', 1800); } return true; }
    if (sees && d > 7 && d < 22 && this.cd <= 0) { this.tele = .8; UI.sub('He lowers his spear — ROLL!', 1500); Aud.tone(300, .5, 'sawtooth', .08, 120); return true; }
    return false;
  }
  strike(d) {
    const T = this.T, dx = P.x - this.x, dz = P.z - this.z, dd = Math.hypot(dx, dz) || 1; this.fig.pose({ swing: 0, lunge: 0, aim: 0, draw: 0 });
    if (T.ranged) { const a = Math.atan2(P.z + P.vz * .15 - this.z, P.x + P.vx * .15 - this.x) + rand(-.05, .05); fireProjectile(this.L, this.x + Math.cos(a) * .8, this.z + Math.sin(a) * .8, Math.cos(a), Math.sin(a), 24, T.dmg, 'enemy', 'arrow'); Aud.sfx('shot'); }
    else { FX.slash(this.x, 1.1, this.z, dx / dd, dz / dd); Aud.sfx('slash'); if (dd < T.melee * 1.35) hurtPlayer(T.dmg, this, { kb: 2.4 }); this.backoff = rand(.5, 1.1); }
  }

  /* ---- damage / death ---- */
  hurt(dmg, o = {}) {
    if (this.dead) return;
    if (this.T.shield && o.dir && !this.hostileUnaware()) { const f = this.facingVec(), dot = -(o.dir[0] * f[0] + o.dir[1] * f[1]); if (dot > .45) { Aud.sfx('block'); FX.puff(this.x, 1.2, this.z, 3, 0xffffff, 1.5, .6); UI.pop(this.x, 2.4, this.z, 'BLOCKED', ''); this.makeHostile('shot'); return; } }
    this.hp -= dmg; this.fig.flash(.14); Aud.sfx('hit'); UI.hit(); UI.pop(this.x, 2.4, this.z, '-' + Math.round(dmg), o.crit ? 'crit' : ''); FX.paper(this.x, 1.3, this.z, 5);
    if (this.hp <= 0) { this.die(o); return; }
    if (this.role === 'guard') { if (!this.hostile) { this.makeHostile('hurt'); } } else { this.fx = P.x; this.fz = P.z; this.panic = 8; }
    if (o.stun) this.stun = o.stun;
  }
  hostileUnaware() { return !this.hostile; }
  die(o = {}) {
    this.dead = true; this.state = 'dead'; if (this.icon) this.icon.visible = false; G.kills = (G.kills || 0) + 1; P.san = Math.max(0, P.san - (o.silent ? 1 : 3));
    const dir = o.dir || [0, 0]; Aud.sfx(o.silent ? 'fold' : 'tear'); FX.paper(this.x, 1.2, this.z, o.silent ? 6 : 16, o.silent ? 2 : 5); if (!o.silent) FX.ink(this.x, this.z);
    const pieces = this.fig.shatter(dir[0], dir[1], o.silent ? 'fold' : 'shatter'); const c = { x: this.x, z: this.z, L: this.L, npc: this, hidden: false, found: !!o.noFind, pieces, name: this.name }; this.L.corpses.push(c); this.corpse = c;
    if (this.role === 'guard') addXP(o.silent ? 40 : 20); else addXP(0, true);
    if (this.d.drop) spawnPickup(this.L, this.d.drop.type, this.d.drop.val, this.x, this.z + .5);
    if (this.role === 'guard' && Math.random() < .5) spawnPickup(this.L, 'coin', 2 + (Math.random() * 6 | 0), this.x + .4, this.z);
    G.onKill && G.onKill(this, o);
    const i = this.L.actors.indexOf(this); if (i >= 0) this.L.actors.splice(i, 1);
  }
  animate(dt) {
    const f = this.fig; f.root.position.x = this.x; f.root.position.z = this.z;
    const cy = G.camYaw, dot = Math.cos(this.fa) * Math.cos(cy) - Math.sin(this.fa) * Math.sin(cy); if (Math.abs(dot) > .22 && this.wind <= 0 && !this.keepFacing) f.facing = dot > 0 ? 1 : -1;
    const mv = this.moving || this.scriptMove; this.scriptMove = false; this.mvK += ((mv ? 1 : 0) - this.mvK) * Math.min(1, dt * 8); f.update(dt, cy, mv ? Math.min(1.4, (this.speed || 2.4) / 3.2) : 0);
    f.root.visible = true;
  }
}
function spawnNPC(L, d) { return new NPC(L, d); }
function pairUp(a, b, overhear) { a.chatWith = b; b.chatWith = a; if (overhear) a.d.overhear = overhear; }

/* ---------- crimes & events ---------- */
G.alarmBody = (c, finder) => { G.alert = Math.max(G.alert, 1); G.alertT = 0; for (const o of finder.L.actors) if (o.role === 'guard' && !o.hostile && !o.dead && Math.hypot(o.x - c.x, o.z - c.z) < 40) o.hear(c.x, c.z, true); };
/* an act was seen: who saw it hostile-ly? */
function witnessAct(silent, victim) {
  for (const o of G.level.actors) {
    if (o === victim || o.dead) continue;
    if (o.role === 'guard') { if (o.hostile) continue; if (o.see()) { o.makeHostile('witness'); } else if (!silent && Math.hypot(o.x - P.x, o.z - P.z) < 18) o.hear(P.x, P.z, true); }
    else if (!o.d.static && Math.hypot(o.x - P.x, o.z - P.z) < 16 && rayHit(o.L, o.x, o.z, P.x, P.z, 2.2) === null) { o.fx = P.x; o.fz = P.z; o.panic = 8; Aud.sfx('scare'); if (!silent) for (const g of G.level.actors) if (g.role === 'guard' && !g.hostile && Math.hypot(g.x - o.x, g.z - o.z) < 30) g.hear(o.x, o.z, true); }
  }
}
function makeNoise(x, z, r) { if (!G.level) return; for (const a of G.level.actors) if (!a.dead && a.role === 'guard' && !a.hostile && Math.hypot(a.x - x, a.z - z) < r) a.hear(x, z, r > 12); }

/* social challenge when a guard catches you somewhere you don't belong */
async function runChallenge(n, why) {
  if (G.mode !== 'play') { n.state = 'suspicious'; return; } Talk.begin(n);
  const z = n.L.zoneAt(P.x, P.z), perm = id => { if (id) P.permit[id] = G.time + 90; };
  const intro = { armed: ['"A drawn weapon in the sacred precinct, my lord? Explain yourself."'], trespass: ['"Forgive me, General — this wing is closed. By whose order are you here?"'], running: ['"Slow down, my lord! Why the haste?"'], sneaking: ['"My lord… why are you creeping about like a thief?"'] }[why] || ['"Halt. State your business."'];
  await UI.say('Guard', intro[0].replace(/"/g, ''), { akk: null });
  const luck = P.skills[1], hasSeal = !!G.items.seal || P.clearance > 0;
  const opts = [`"I am General Nabû-nāṣir. Step aside."` + (hasSeal ? '' : ' <i>(bluff)</i>'), `Show the sealed tablet <i>(${G.items.seal ? 'you hold the Esagila seal' : 'a forged letter'})</i>`, P.gold >= 20 ? 'Slip him 20 gold' : '<i>(not enough gold to bribe)</i>', 'Draw steel'];
  const ch = await UI.ask('How do you answer?', opts);
  let ok = false, line = '';
  if (ch === 0) { ok = Math.random() < (.35 + .12 * luck + (hasSeal ? .35 : 0) + (G.flags.escortNear ? .25 : 0)); line = ok ? 'Forgive me, General. Of course.' : 'The General does not usually forget his orders. Come with me.'; }
  else if (ch === 1) { ok = G.items.seal ? true : Math.random() < (.45 + .1 * luck); line = ok ? 'The seal of the Esagila… pass, my lord.' : 'This seal looks… new. Seize him!'; }
  else if (ch === 2 && P.gold >= 20) { P.gold -= 20; ok = true; line = 'A generous man. I saw nothing, General.'; Aud.sfx('coin'); }
  else if (ch === 3) { ok = false; line = ''; }
  if (ch !== 3 && ch !== 2 || (ch === 2 && P.gold < 20 && !ok)) { }
  if (ok) { await UI.say('Guard', line); perm(z && z.id); P.permit.any = G.time + 60; n.sus = 0; n.state = n.route ? 'patrol' : 'idle'; n.reason = null; n.salCd = 30; UI.toast('The guard lets you pass.', 2200); addXP(15); Talk.end(); }
  else { if (line) await UI.say('Guard', line); Talk.end(); n.makeHostile('failed'); }
}
const Talk = {
  on: false, npc: null,
  begin(n) {
    Talk.on = true; Talk.npc = n; G.modeBeforeTalk = G.mode; Cine.begin(); G.mode = 'talk'; unlockPointer();
    const dx = n.x - P.x, dz = n.z - P.z, d = Math.hypot(dx, dz) || 1, ux = dx / d, uz = dz / d, sx = -uz, sz = ux;
    const mid = [P.x + dx * .55, 1.55, P.z + dz * .55];
    Cine.s = { _pos: [P.x - ux * 1.5 + sx * .9, 1.9, P.z - uz * 1.5 + sz * .9], _posTo: [P.x - ux * .9 + sx * .7, 1.8, P.z - uz * .9 + sz * .7], _look: mid, _lookTo: mid, dur: 1.2, t: 0, res: () => { }, hold: true };
    Cine.s._pos = null; Cine.s._from = [P.x - ux * 1.6 + sx * 1, 1.9, P.z - uz * 1.6 + sz * 1]; Cine.s._to = [P.x - ux * 1.0 + sx * .8, 1.75, P.z - uz * 1.0 + sz * .8]; Cine.s._look = [n.x - ux * .2, 1.6, n.z - uz * .2]; Cine.s._lookTo = Cine.s._look;
    P.fig.root.visible = true; G.talkNPC = n; n.fig.pose({ talk: 1 }); P.fig.pose({ talk: 1 }); P.fig.facing = (dx * Math.cos(G.camYaw) - dz * Math.sin(G.camYaw)) >= 0 ? 1 : -1; if (!n.dead) { n.fa = Math.atan2(-dz, -dx); }
  },
  end() { Talk.on = false; G.talkNPC = null; if (Talk.npc) Talk.npc.fig.pose({ talk: 0 }); P.fig.pose({ talk: 0 }); Cine.end(); G.mode = 'play'; Cam.snap = true; lockPointer(); Seq.skipping = false; UI.hideLines(); }
};

/* ---------- projectiles ---------- */
function segPointDist(ax, az, bx, bz, px, pz) { const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz; let t = l2 ? ((px - ax) * dx + (pz - az) * dz) / l2 : 0; t = clamp(t, 0, 1); return Math.hypot(px - (ax + dx * t), pz - (az + dz * t)); }
function fireProjectile(L, x, z, dx, dz, speed, dmg, owner, kind = 'arrow', o = {}) {
  const geo = kind === 'stone' ? new THREE.SphereGeometry(.07, 6, 6) : new THREE.BoxGeometry(1, .06, .06), m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: kind === 'stone' ? 0x7a6a50 : owner === 'player' ? 0x2a2218 : 0x5a3a28 }));
  m.position.set(x, o.y || 1.25, z); m.rotation.y = -Math.atan2(dz, dx); L.scene.add(m); const p = Object.assign({ L, x, z, dx, dz, speed, dmg, owner, kind, life: 2, m, y: o.y || 1.25 }, o); projectiles.push(p); return p;
}
function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i]; if (p.L !== G.level) { p.L.scene.remove(p.m); projectiles.splice(i, 1); continue; }
    const px = p.x, pz = p.z; p.x += p.dx * p.speed * dt; p.z += p.dz * p.speed * dt; p.life -= dt; let dead = p.life <= 0;
    if (!dead && rayHit(p.L, px, pz, p.x, p.z, 1.6) !== null) { dead = true; FX.puff(p.x, 1.1, p.z, 3, 0xe3cf9d, 1.5); if (p.kind === 'stone') { makeNoise(p.x, p.z, 11); } }
    if (!dead && p.owner === 'player') {
      for (const a of p.L.actors) { if (a.dead) continue; if (segPointDist(px, pz, p.x, p.z, a.x, a.z) < a.r + .1) {
        if (p.kind === 'stone') { a.hurt(p.dmg, { dir: [p.dx, p.dz], stun: 3 }); if (!a.dead && a.role === 'guard') { a.stun = 3; a.hostile = false; a.state = 'investigate'; a.invX = P.x; a.invZ = P.z; a.invT = 0; } }
        else a.hurt(p.dmg, { dir: [p.dx, p.dz], crit: p.crit }); if (!a.dead && a.role === 'guard') { witnessAct(false, a); } dead = true; break; } }
    } else if (!dead && p.owner === 'enemy') { if (segPointDist(px, pz, p.x, p.z, P.x, P.z) < .6) { hurtPlayer(p.dmg, { x: p.x - p.dx, z: p.z - p.dz }, { kb: 1.4 }); dead = true; } }
    p.m.position.set(p.x, p.y, p.z); if (p.kind === 'stone') p.m.position.y = p.y - (1 - p.life / 2) * .5;
    if (Math.random() < .5 && p.kind === 'arrow') FX.spawn({ tex: ART.fxTex('glow'), x: p.x, y: p.y, z: p.z, s0: .3, s1: .05, life: .18, add: true, color: 0xe8d9b0 });
    if (dead) { p.L.scene.remove(p.m); projectiles.splice(i, 1); }
  }
}
function hurtPlayer(dmg, from, o = {}) {
  if (P.dead || P.inv > 0 || G.mode !== 'play' || G.invulnerable) return;
  P.hp -= dmg; P.flash = .25; P.inv = .5; Aud.sfx('hurt'); G.shake = Math.max(G.shake, .35); UI.flash('hurtflash', 380); FX.paper(P.x, 1.3, P.z, 6);
  if (from && o.kb) { const dx = P.x - from.x, dz = P.z - from.z, d = Math.hypot(dx, dz) || 1; P.vx = dx / d * o.kb * 1.4; P.vz = dz / d * o.kb * 1.4; P.kbT = .25; }
  if (P.hp <= 0) { P.hp = 0; G.onPlayerDeath && G.onPlayerDeath(from && from.name ? from.name : 'the garrison'); }
}

/* ---------- player actions ---------- */
function aimDir() {
  const L = G.level; let dx = P.ax, dz = P.az;
  if (!Cam.fp) { const tx = Cam.pvx + P.ax * 60, tz = Cam.pvz + P.az * 60; dx = tx - P.x; dz = tz - P.z; const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d; }
  let best = null, bd = .1;
  for (const a of L.actors) { if (a.dead || a.role === 'civ') continue; const ex = a.x - P.x, ez = a.z - P.z, ed = Math.hypot(ex, ez); if (ed > 40 || ed < 1) continue; const ang = Math.acos(clamp((ex * dx + ez * dz) / ed, -1, 1)); if (ang < bd && rayHit(L, P.x, P.z, a.x, a.z, 1.6) === null) { bd = ang; best = a; } }
  if (best) { const ex = best.x - P.x, ez = best.z - P.z, ed = Math.hypot(ex, ez); return [ex / ed, ez / ed]; } return [dx, dz];
}
function faceDir(dx, dz) { P.face = (dx * Math.cos(G.camYaw) - dz * Math.sin(G.camYaw)) >= 0 ? 1 : -1; P.fig.facing = P.face; }
function fireBow() {
  const draw = clamp(P.drawT / .6, .35, 1); if (P.ammo.bow <= 0) { UI.sub('No arrows left — loot the fallen.', 1400); return; } P.ammo.bow--; const [dx, dz] = aimDir();
  const crit = Math.random() < .05 + .07 * P.skills[1], dmg = (18 + 34 * draw) * (1 + .15 * P.skills[0]) * (crit ? 1.8 : 1);
  fireProjectile(G.level, P.x + dx * .8, P.z + dz * .8, dx, dz, 26 + 30 * draw, dmg, 'player', 'arrow', { crit });
  Aud.sfx('shot'); makeNoise(P.x, P.z, 9); P.cdAtk = .35; P.drawT = 0; faceDir(dx, dz); Cam.kick = .03; if (window.VM) VM.fire(); P.atkFlash = 1.2;
}
function throwSling() {
  if (P.cdAtk > 0) return; if (P.ammo.sling <= 0) { UI.sub('No stones left.', 1200); return; } P.ammo.sling--; const [dx, dz] = aimDir();
  fireProjectile(G.level, P.x + dx * .8, P.z + dz * .8, dx, dz, 38, 6, 'player', 'stone', { y: 1.5 }); Aud.sfx('slash'); P.cdAtk = .8; faceDir(dx, dz); if (window.VM) VM.fire();
}
function throwPot() {
  if (P.cdAtk > 0) return; if (P.ammo.pot <= 0) { UI.sub('No clay pots left.', 1200); return; } P.ammo.pot--; const d = 12, tx = P.x + P.ax * d, tz = P.z + P.az * d;
  const hit = rayHit(G.level, P.x, P.z, tx, tz, 2), t = hit === null ? 1 : Math.max(.15, hit - .05), lx = P.x + (tx - P.x) * t, lz = P.z + (tz - P.z) * t;
  const b = makeBill(G.level, ART.pickTex('pot'), .5, { shadow: false }); b.g.position.set(P.x, 1.4, P.z); G.level.scene.add(b.g); G.level.bills.push(b.g);
  G.bombs = G.bombs || []; G.bombs.push({ b, sx: P.x, sz: P.z, lx, lz, t: 0, T: .7, L: G.level }); P.cdAtk = .8; Aud.sfx('paper'); if (window.VM) VM.fire();
}
function updatePots(dt) {
  if (!G.bombs) return;
  for (let i = G.bombs.length - 1; i >= 0; i--) {
    const b = G.bombs[i]; b.t += dt; const k = Math.min(1, b.t / b.T); b.b.g.position.set(lerp(b.sx, b.lx, k), 1.4 + Math.sin(k * Math.PI) * 2.2 - k * 1.3, lerp(b.sz, b.lz, k)); b.b.p.rotation.z += dt * 10;
    if (k >= 1) { b.L.scene.remove(b.b.g); G.bombs.splice(i, 1); Aud.sfx('door'); FX.paper(b.lx, .6, b.lz, 10, 3); FX.puff(b.lx, .4, b.lz, 6, 0xc8a878, 2); makeNoise(b.lx, b.lz, 20); }
  }
}
function meleeAttack() {
  if (P.cdAtk > 0 || P.rollT > 0 || P.busy > 0) return; if (P.weapon !== 'knife') { setWeapon('knife'); }
  P.cdAtk = .5; const L = G.level, dx = P.ax, dz = P.az; faceDir(dx, dz); P.fig.pose({ swing: 1 }); setTimeout(() => P.fig && P.fig.pose({ swing: 0 }), 160); if (window.VM) VM.slash(); Aud.sfx('slash'); P.atkFlash = 1.5; makeNoise(P.x, P.z, 4);
  let best = null, bs = 1e9;
  for (const a of L.actors) { if (a.dead) continue; const ex = a.x - P.x, ez = a.z - P.z, d = Math.hypot(ex, ez); if (d > 2.7 + a.r * .3) continue; if ((ex * dx + ez * dz) / (d || 1) < .3) continue; if (d < bs) { bs = d; best = a; } }
  if (!best) return;
  const fv = best.facingVec(), toP = [P.x - best.x, P.z - best.z], tl = Math.hypot(toP[0], toP[1]) || 1, behind = (fv[0] * toP[0] + fv[1] * toP[1]) / tl < .3, unaware = !best.hostile && !best.T.big && best.stun <= 0 || best.stun > 0 && !best.T.big;
  if (unaware && (behind || best.stun > 0 || best.role === 'civ')) { G.hitstop = .1; witnessAct(true, best); best.hurt(999, { silent: true, dir: [dx, dz] }); best.corpseSilent = true; }
  else { const crit = Math.random() < .07 + .07 * P.skills[1]; best.hurt(26 * (1 + .15 * P.skills[0]) * (crit ? 2 : 1), { crit, dir: [dx, dz] }); witnessAct(false, best); }
}
function rollDodge(mx, mz) {
  if (P.cdRoll > 0 || P.rollT > 0 || P.busy > 0) return; let dx = mx, dz = mz; if (!dx && !dz) { dx = -P.ax; dz = -P.az; } const l = Math.hypot(dx, dz) || 1; P.rdx = dx / l; P.rdz = dz / l; P.rollT = .42; P.inv = .42; P.cdRoll = .9; Aud.sfx('paper'); makeNoise(P.x, P.z, 5); P.hidden = false;
}

/* ---------- player update ---------- */
function updatePlayer(dt) {
  const L = G.level; P.cdAtk -= dt; P.cdRoll -= dt; P.inv -= dt; P.flash -= dt; P.busy -= dt; if (P.atkFlash > 0) P.atkFlash -= dt;
  const fwd = (key('KeyW') ? 1 : 0) - (key('KeyS') ? 1 : 0), sd = (key('KeyD') ? 1 : 0) - (key('KeyA') ? 1 : 0);
  Cam.yaw += ((key('ArrowLeft') ? 1 : 0) - (key('ArrowRight') ? 1 : 0)) * 2 * dt; if (Cam.fp) Cam.look = clamp(Cam.look + ((key('ArrowUp') ? 1 : 0) - (key('ArrowDown') ? 1 : 0)) * 1.2 * dt, -1.35, 1.35); else Cam.pitch += ((key('ArrowDown') ? 1 : 0) - (key('ArrowUp') ? 1 : 0)) * 1.2 * dt;
  const Fx = -Math.sin(Cam.yaw), Fz = -Math.cos(Cam.yaw), Rx = Math.cos(Cam.yaw), Rz = -Math.sin(Cam.yaw); P.ax = Fx; P.az = Fz;
  let mx = Fx * fwd + Rx * sd, mz = Fz * fwd + Rz * sd; const ml = Math.hypot(mx, mz); if (ml > 0) { mx /= ml; mz /= ml; }
  P.sneak = key('KeyC') || key('ControlLeft'); P.aim = Input.mb[2]; P.sprint = key('ShiftLeft') && !P.sneak && ml > 0 && !P.aim && !P.carry;
  if (P.hidden) { if (ml > 0 || tap('KeyE')) { P.hidden = false; P.hideSpot = null; Aud.sfx('creak'); } else { P.moving = false; P.fig.root.visible = false; return; } }
  P.fig.root.visible = !(Cam.fp && G.mode === 'play');
  const speed = P.carry ? 2 : P.sneak ? 2.1 : P.aim ? 2.4 : P.sprint ? 6.6 : 4.2;
  if (P.rollT > 0) { P.rollT -= dt; P.vx = P.rdx * 11; P.vz = P.rdz * 11; } else if (P.kbT > 0) P.kbT -= dt; else { const k = Math.min(1, dt * 13); P.vx = lerp(P.vx, mx * speed, k); P.vz = lerp(P.vz, mz * speed, k); }
  P.x += P.vx * dt; P.z += P.vz * dt; collide(L, P, .45); P.moving = Math.hypot(P.vx, P.vz) > .6;
  if (P.moving) { P.stepT -= dt; if (P.stepT <= 0) { P.stepT = P.sprint ? .28 : P.sneak ? .7 : .45; Aud.sfx('step'); if (P.sprint) { makeNoise(P.x, P.z, 8); FX.puff(P.x, .2, P.z, 1, 0xd8c8a0, .6, .7); } } }
  /* weapons */
  if (tap('Digit1')) setWeapon('bow'); if (tap('Digit2')) setWeapon('knife'); if (tap('Digit3')) setWeapon('sling'); if (tap('Digit4')) setWeapon('pot'); if (tap('Digit0') || tap('KeyX')) setWeapon(null);
  if (Input.wheel) { const i = WEAPONS.indexOf(P.weapon); setWeapon(WEAPONS[(i + (Input.wheel > 0 ? 1 : WEAPONS.length - 1) + (i < 0 ? 1 : 0)) % WEAPONS.length]); }
  const lmb = Input.mb[0] && (Input.locked || Input.lockFailed);
  if (P.weapon === 'bow') { if (lmb && P.cdAtk <= 0 && P.busy <= 0) { if (P.drawT === 0) Aud.sfx('draw'); P.drawT = Math.min(.7, P.drawT + dt); } else if (P.drawT > 0) { if (P.drawT > .12) fireBow(); else P.drawT = 0; } }
  else if (P.weapon === 'knife') { if (Input.mbp[0] && (Input.locked || Input.lockFailed)) meleeAttack(); }
  else if (P.weapon === 'sling') { if (Input.mbp[0] && (Input.locked || Input.lockFailed)) throwSling(); }
  else if (P.weapon === 'pot') { if (Input.mbp[0] && (Input.locked || Input.lockFailed)) throwPot(); }
  if (tap('KeyF') || Input.mbp[1]) meleeAttack();
  if (tap('Space')) rollDodge(mx, mz);
  if (P.moving && ml > 0 && P.rollT <= 0) { const dot = P.vx * Rx + P.vz * Rz; if (Math.abs(dot) > .8) { P.face = dot > 0 ? 1 : -1; P.fig.facing = P.face; } }
  /* the paper doll's pose */
  const f = P.fig; f.pose({ aim: P.weapon === 'bow' && (P.drawT > 0 || P.aim) ? 1 : 0, draw: clamp(P.drawT / .6, 0, 1), crouch: P.sneak ? 1 : 0, carry: P.carry ? 1 : 0 });
  const [adx, adz] = [P.ax, P.az]; f.aimPitch = 0;
}
function animatePlayer(dt) {
  const f = P.fig; if (!f) return; f.root.position.x = P.x; f.root.position.z = P.z; f.tilt = P.rollT > 0 ? 0 : .3;
  f.update(dt, G.camYaw, P.moving ? Math.min(1.5, Math.hypot(P.vx, P.vz) / 3.5) : 0);
  if (P.rollT > 0) { f.pivot.rotation.z = -P.face * (1 - P.rollT / .42) * 6.283; f.pivot.position.y = .5; } else { f.pivot.rotation.z = 0; }
  if (P.flash > 0 && Math.floor(G.time * 30) % 2) f.mat.color.setRGB(1.9, .75, .65); else f.mat.color.setRGB(1, 1, 1);
  if (P.dead) { f.root.visible = true; }
}

/* ---------- pickups ---------- */
function updatePickups(dt) {
  const L = G.level, mag = 1.4 + P.skills[2] * .35;
  for (let i = L.pick.length - 1; i >= 0; i--) {
    const p = L.pick[i]; p.t += dt; p.b.g.position.y = .2 + Math.sin(p.t * 3) * .06; const d = Math.hypot(P.x - p.x, P.z - p.z);
    if (d < mag + 1.3 && d > .6) { p.x += (P.x - p.x) / d * 4 * dt * (d < mag ? 2 : 0); p.z += (P.z - p.z) / d * 4 * dt * (d < mag ? 2 : 0); p.b.g.position.x = p.x; p.b.g.position.z = p.z; }
    if (d < .85) { collectPickup(p); L.scene.remove(p.b.g); L.pick.splice(i, 1); }
  }
}
function collectPickup(p) {
  switch (p.type) {
    case 'coin': P.gold += p.val; Aud.sfx('coin'); UI.pop(P.x, 2.6, P.z, '+' + p.val + ' gold', 'gold'); break;
    case 'bow': P.ammo.bow = Math.min(30, P.ammo.bow + p.val); Aud.sfx('pick'); UI.pop(P.x, 2.6, P.z, '+' + p.val + ' arrows'); break;
    case 'sling': P.ammo.sling = Math.min(24, P.ammo.sling + p.val); Aud.sfx('pick'); break;
    case 'pot': P.ammo.pot = Math.min(6, P.ammo.pot + p.val); Aud.sfx('pick'); UI.pop(P.x, 2.6, P.z, '+clay pot'); break;
    case 'herb': P.hp = Math.min(P.maxhp, P.hp + p.val); Aud.sfx('pick'); UI.pop(P.x, 2.6, P.z, '+' + p.val + ' HP', 'heal'); break;
    case 'wine': P.san = Math.min(100, P.san + p.val); Aud.sfx('pick'); UI.pop(P.x, 2.6, P.z, '+calm', 'heal'); break;
    default: Aud.sfx('pick');
  }
}
