/* ============================================================
   INK OF BABYLON — paper.js
   Paper dolls: layered, extruded card cut-outs with inked outlines,
   joints that animate, a tear-apart death, and an instanced crowd.
   ============================================================ */
'use strict';
const Paper = (function () {
  const V3 = THREE.Vector3;
  const INKC = 0x14110e;
  const gradTex = (() => { const t = new THREE.DataTexture(new Uint8Array([78, 132, 188, 255]), 4, 1, THREE.LuminanceFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
  const hullMat = new THREE.MeshBasicMaterial({ color: INKC, side: THREE.BackSide });
  const toon = (o = {}) => new THREE.MeshToonMaterial(Object.assign({ gradientMap: gradTex }, o));

  /* ---------- 2D shapes ---------- */
  const S_circle = r => { const s = new THREE.Shape(); s.absarc(0, 0, r, 0, Math.PI * 2, false); return s; };
  const S_rrect = (w, h, r = .02) => {
    const s = new THREE.Shape(), x = -w / 2, y = -h / 2; r = Math.min(r, w / 2 - .001, h / 2 - .001);
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
  };
  const S_poly = pts => { const s = new THREE.Shape(); pts.forEach(([x, y], i) => i ? s.lineTo(x, y) : s.moveTo(x, y)); return s; };
  const S_arc = (r, th, a0, a1) => { const s = new THREE.Shape(); s.absarc(0, 0, r + th / 2, a0, a1, false); s.absarc(0, 0, r - th / 2, a1, a0, true); return s; };
  const S_semi = r => { const s = new THREE.Shape(); s.absarc(0, 0, r, 0, Math.PI, false); return s; };

  /* ---------- merge many extruded pieces into one geometry + one outline hull ---------- */
  function mergePieces(pieces) {
    const P = [], N = [], C = [], HP = [];
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new V3(), sc = new V3();
    for (const pc of pieces) {
      const d = pc.d || .06;
      const g = new THREE.ExtrudeGeometry(pc.s, { depth: d, bevelEnabled: true, bevelThickness: .006, bevelSize: .006, bevelSegments: 1, curveSegments: 10 });
      g.translate(0, 0, -d / 2);
      e.set(0, 0, pc.r || 0); q.setFromEuler(e); v.set(pc.x || 0, pc.y || 0, pc.z || 0); sc.set(pc.sx || 1, pc.sy || 1, 1);
      m4.compose(v, q, sc); g.applyMatrix4(m4);
      const pos = g.attributes.position.array, nor = g.attributes.normal.array, c = new THREE.Color(pc.c === undefined ? 0xffffff : pc.c);
      for (let i = 0; i < pos.length; i++) { P.push(pos[i]); N.push(nor[i]); }
      for (let i = 0; i < pos.length / 3; i++) C.push(c.r, c.g, c.b);
      const hh = pc.h === undefined ? .024 : pc.h;
      if (hh > 0) {
        g.computeBoundingBox(); const bb = g.boundingBox, cx = (bb.min.x + bb.max.x) / 2, cy = (bb.min.y + bb.max.y) / 2, cz = (bb.min.z + bb.max.z) / 2;
        const sx = bb.max.x - bb.min.x, sy = bb.max.y - bb.min.y, sz = bb.max.z - bb.min.z;
        const kx = 1 + 2 * hh / Math.max(sx, .06), ky = 1 + 2 * hh / Math.max(sy, .06), kz = 1 + hh / Math.max(sz, .04);
        for (let i = 0; i < pos.length; i += 3) HP.push(cx + (pos[i] - cx) * kx, cy + (pos[i + 1] - cy) * ky, cz + (pos[i + 2] - cz) * kz);
      }
      g.dispose();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
    const hull = new THREE.BufferGeometry(); hull.setAttribute('position', new THREE.Float32BufferAttribute(HP, 3));
    return { geo, hull };
  }

  /* ---------- palette ---------- */
  const K = { cream: 0xf1e8d4, white: 0xe9e2d0, sep1: 0xc8b48c, sep2: 0xa38b64, sep3: 0x7a6548, brown: 0x5b4630, dk: 0x3b2d20, bronze: 0xb58a3f, gold: 0xd6a940, blue: 0x2e5d85, teal: 0x3f6f78, red: 0x8d3a2a, wood: 0x8a6c46, hair: 0x2a211a, leather: 0x6a4a30, steel: 0xb9b6ac };
  const Z = { cloak: -.12, legB: -.07, legF: -.03, torso: 0, belt: .07, scarf: .13, armB: -.1, armF: .15, head: .22, beard: .31, face: .33, hat: .31 };

  /* ---------- costume → bone geometries ---------- */
  function fringeRow(y, w, n, c, z, len = .07) { const out = []; for (let i = 0; i < n; i++) { const x = -w / 2 + (i + .5) * w / n, hw = w / n * .42; out.push({ s: S_poly([[-hw, 0], [hw, 0], [0, -len]]), x, y, z, d: .03, c, h: 0 }); } return out; }

  function headPieces(sp) {
    const skin = sp.skin || K.cream, p = [];
    if (sp.hair === 'long') p.push({ s: S_rrect(.8, .95, .32), y: .1, z: Z.head - .1, d: .06, c: K.hair, h: .02 });
    p.push({ s: S_circle(.31), y: .34, z: Z.head, d: .12, c: skin, h: .026 });
    const m = sp.mark || 'c';
    if (m === 'c') p.push({ s: S_arc(.075, .042, .85 * Math.PI, 2.15 * Math.PI), x: .1, y: .38, z: Z.face, d: .03, c: INKC, h: 0 });
    else if (m === 'smile') p.push({ s: S_arc(.12, .042, 1.18 * Math.PI, 1.82 * Math.PI), x: .06, y: .47, z: Z.face, d: .03, c: INKC, h: 0 });
    else if (m === 'flat') p.push({ s: S_rrect(.036, .15, .016), x: .12, y: .38, z: Z.face, d: .03, c: INKC, h: 0 });
    else if (m === 'eyes') { p.push({ s: S_circle(.032), x: .02, y: .4, z: Z.face, d: .03, c: INKC, h: 0 }, { s: S_circle(.032), x: .2, y: .4, z: Z.face, d: .03, c: INKC, h: 0 }); }
    else if (m === 'frown') p.push({ s: S_arc(.12, .04, .18 * Math.PI, .82 * Math.PI), x: .08, y: .22, z: Z.face, d: .03, c: INKC, h: 0 });
    if (sp.beard) {
      const long = sp.beard === 'long', col = sp.beardC || K.hair;
      p.push({ s: S_poly(long ? [[-.17, .13], [.17, .13], [.14, -.06], [.07, -.22], [0, -.27], [-.07, -.22], [-.14, -.06]] : [[-.16, .1], [.16, .1], [.12, -.03], [0, -.07], [-.12, -.03]]), x: .02, y: .06, z: Z.beard, d: .05, c: col, h: .012 });
    }
    const hat = sp.hat;
    if (hat === 'helm') {
      p.push({ s: S_poly([[-.35, 0], [.35, 0], [.23, .26], [0, .42], [-.23, .26]]), y: .5, z: Z.hat, d: .1, c: sp.hatC || K.bronze, h: .02 });
      p.push({ s: S_rrect(.74, .07, .02), y: .51, z: Z.hat + .06, d: .04, c: K.brown, h: .01 }); p.push({ s: S_rrect(.07, .2, .02), y: .94, z: Z.hat, d: .05, c: sp.plume || K.red, h: .012 });
    } else if (hat === 'crown') {
      p.push({ s: S_poly([[-.22, 0], [.22, 0], [.26, .42], [-.26, .42]]), y: .58, z: Z.hat, d: .1, c: K.gold, h: .02 });
      [.12, .24, .36].forEach(yy => p.push({ s: S_rrect(.5, .035, .01), y: .58 + yy, z: Z.hat + .06, d: .03, c: K.dk, h: 0 }));
    } else if (hat === 'band') p.push({ s: S_rrect(.66, .09, .03), y: .56, z: Z.hat, d: .05, c: sp.hatC || K.red, h: .012 });
    else if (hat === 'cap') p.push({ s: S_semi(.33), y: .5, z: Z.hat, d: .09, c: sp.hatC || K.sep3, h: .02 });
    else if (hat === 'turban') p.push({ s: S_circle(.36), y: .58, z: Z.hat, d: .1, c: sp.hatC || K.white, h: .02, sy: .62 });
    else if (hat === 'hood') { p.push({ s: S_circle(.36), y: .34, z: Z.head - .02, d: .1, c: sp.hatC || K.brown, h: .024 }); }
    if (sp.hair === 'tuft') p.push({ s: S_semi(.2), y: .6, z: Z.head + .02, d: .06, c: K.hair, h: .01, r: .1 });
    return p;
  }
  function bodyPieces(sp) {
    const p = [], robe = !!sp.robe, bot = robe ? -.42 : 0, trim = sp.trim || K.sep3, body = sp.body || K.sep2;
    if (sp.cloak) p.push({ s: S_poly([[-.3, .68], [.3, .68], [.4, -.12], [-.4, -.12]]), z: Z.cloak, d: .05, c: sp.cloak, h: .02 });
    const wb = robe ? .27 : .22;
    p.push({ s: S_poly([[-wb, bot], [wb, bot], [.19, .62], [-.19, .62]]), z: Z.torso, d: .09, c: body, h: .022 });
    if (robe) { p.push({ s: S_rrect(wb * 2, .06, .02), y: bot + .03, z: Z.belt - .02, d: .04, c: trim, h: 0 }); fringeRow(bot, wb * 2, 9, trim, Z.belt - .02).forEach(f => p.push(f)); }
    else fringeRow(0, .44, 7, trim, Z.belt - .02, .06).forEach(f => p.push(f));
    p.push({ s: S_poly([[-.2, .62], [.2, .62], [.2, .5], [0, .42], [-.2, .5]]), z: Z.belt, d: .04, c: sp.yoke || trim, h: .01 });
    p.push({ s: S_rrect(.46, .07, .02), y: .1, z: Z.belt, d: .05, c: sp.belt || K.dk, h: .012 });
    p.push({ s: S_rrect(.09, .09, .015), y: .1, z: Z.belt + .04, d: .03, c: K.steel, h: .008 });
    if (sp.sash) p.push({ s: S_poly([[-.2, .6], [-.1, .6], [.2, .1], [.1, .1]]), z: Z.belt + .02, d: .03, c: sp.sash, h: .008 });
    if (sp.armor) { p.push({ s: S_rrect(.38, .34, .06), y: .38, z: Z.belt + .01, d: .05, c: sp.armor, h: .014 }); [.3, .4, .5].forEach(yy => p.push({ s: S_rrect(.34, .018, .005), y: yy, z: Z.belt + .05, d: .02, c: K.dk, h: 0 })); }
    if (sp.scarf) {
      p.push({ s: S_rrect(.5, .15, .06), y: .62, z: Z.scarf, d: .08, c: sp.scarf, h: .016 });
      p.push({ s: S_poly([[-.18, .6], [-.02, .6], [-.04, .12], [-.2, .08]]), x: -.1, z: Z.scarf + .02, d: .05, c: sp.scarf, h: .012 });
    }
    if (sp.mantle) { p.push({ s: S_poly([[-.36, .62], [.36, .62], [.4, .32], [0, .22], [-.4, .32]]), z: Z.scarf - .02, d: .05, c: sp.mantle, h: .016 }); fringeRow(.28, .72, 10, sp.mantleTrim || K.gold, Z.scarf - .01, .06).forEach(f => p.push(f)); }
    return p;
  }
  function legPieces(sp, back) {
    const z = back ? Z.legB : Z.legF, pc = sp.pants || sp.body || K.sep3, b = sp.boots || K.dk, p = [];
    p.push({ s: S_rrect(.16, .4, .05), y: -.2, z, d: .07, c: pc, h: .02 });
    p.push({ s: S_rrect(.23, .16, .06), x: .03, y: -.41, z: z + .02, d: .08, c: b, h: .022 });
    p.push({ s: S_rrect(.2, .03, .01), y: -.34, z: z + .07, d: .03, c: K.steel, h: 0 });
    return p;
  }
  function armPieces(sp, back) {
    const z = back ? Z.armB : Z.armF, p = [], sl = sp.sleeve || sp.body || K.sep2, mit = sp.mitt === undefined ? K.cream : sp.mitt;
    p.push({ s: S_rrect(.15, .4, .06), y: -.2, z, d: .07, c: sl, h: .02 });
    p.push({ s: S_rrect(.16, .04, .01), y: -.36, z: z + .04, d: .03, c: sp.trim || K.sep3, h: 0 });
    p.push({ s: S_circle(.11), y: -.48, z: z + .03, d: .09, c: mit, h: .022 });
    p.push({ s: S_circle(.055), x: back ? -.1 : .1, y: -.44, z: z + .03, d: .07, c: mit, h: .016 });
    return p;
  }
  const defCache = {};
  function buildDef(key, sp) {
    if (defCache[key]) return defCache[key];
    const bones = {
      head: mergePieces(headPieces(sp)), body: mergePieces(bodyPieces(sp)), legF: mergePieces(legPieces(sp, false)), legB: mergePieces(legPieces(sp, true)),
      armF: mergePieces(armPieces(sp, false)), armB: mergePieces(armPieces(sp, true))
    };
    return defCache[key] = { bones, sp, scale: sp.scale || 1 };
  }

  /* ---------- held items (built around the grip at 0,0; +y is "up" along the item) ---------- */
  const WEAPONS = {
    spear: () => ({ pcs: [{ s: S_rrect(.05, 2.2, .02), y: .6, z: .06, d: .05, c: K.wood, h: .014 }, { s: S_poly([[-.1, 0], [.1, 0], [0, .38]]), y: 1.7, z: .06, d: .04, c: K.steel, h: .012 }, { s: S_rrect(.16, .05, .01), y: 1.68, z: .06, d: .05, c: K.bronze, h: 0 }], rest: 0, mode: 'free' }),
    shield: () => ({ pcs: [{ s: S_circle(.34), y: .1, z: .2, d: .05, c: K.wood, h: .02 }, { s: S_circle(.12), y: .1, z: .25, d: .05, c: K.bronze, h: .012 }, { s: S_arc(.27, .035, 0, 6.2), y: .1, z: .24, d: .02, c: K.dk, h: 0 }], rest: 0, mode: 'up' }),
    bow: () => ({ pcs: [{ s: S_arc(.64, .06, -.95, .95), x: -.64, z: .06, d: .06, c: K.wood, h: .014 }, { s: S_rrect(.014, 1.02, .005), x: -.28, z: .06, d: .015, c: K.dk, h: 0 }, { s: S_rrect(.07, .22, .02), z: .08, d: .06, c: K.leather, h: .01 }], rest: 0, mode: 'up', arrow: [{ s: S_rrect(.95, .02, .008), x: .1, z: .08, d: .02, c: K.wood, h: 0 }, { s: S_poly([[0, -.04], [0, .04], [.1, 0]]), x: .58, z: .08, d: .02, c: K.steel, h: 0 }, { s: S_poly([[0, 0], [.1, .05], [.1, -.05]]), x: -.36, z: .08, d: .02, c: K.cream, h: 0 }] }),
    knife: () => ({ pcs: [{ s: S_poly([[-.045, 0], [.045, 0], [.03, .34], [0, .4]]), y: .06, z: .08, d: .03, c: K.steel, h: .01 }, { s: S_rrect(.14, .035, .01), y: .05, z: .08, d: .04, c: K.bronze, h: 0 }, { s: S_rrect(.05, .14, .015), y: -.03, z: .08, d: .05, c: K.dk, h: .008 }], rest: 0, mode: 'free' }),
    sword: () => ({ pcs: [{ s: S_poly([[-.06, 0], [.06, 0], [.045, .7], [0, .78]]), y: .06, z: .08, d: .03, c: K.steel, h: .012 }, { s: S_rrect(.26, .05, .015), y: .05, z: .08, d: .05, c: K.bronze, h: .008 }, { s: S_rrect(.06, .16, .015), y: -.04, z: .08, d: .05, c: K.dk, h: .008 }], rest: 0, mode: 'free' }),
    cup: () => ({ pcs: [{ s: S_poly([[-.1, 0], [.1, 0], [.085, -.16], [-.085, -.16]]), y: .1, z: .09, d: .07, c: K.gold, h: .012 }, { s: S_rrect(.04, .09, .01), y: -.1, z: .09, d: .05, c: K.gold, h: 0 }, { s: S_rrect(.14, .03, .01), y: -.16, z: .09, d: .06, c: K.gold, h: 0 }], rest: 0, mode: 'up' }),
    jar: () => ({ pcs: [{ s: S_poly([[-.09, .28], [.09, .28], [.2, .1], [.17, -.18], [-.17, -.18], [-.2, .1]]), z: .1, d: .1, c: 0xa8764a, h: .016 }, { s: S_rrect(.14, .06, .02), y: .3, z: .1, d: .08, c: 0x8a5e38, h: 0 }], rest: 0, mode: 'up' }),
    tablet: () => ({ pcs: [{ s: S_rrect(.3, .22, .03), y: .06, z: .1, d: .05, c: 0xc79a62, h: .012 }, ...[0, 1, 2].flatMap(i => [0, 1, 2, 3].map(j => ({ s: S_rrect(.04, .012, .004), x: -.1 + j * .065, y: .12 - i * .06, z: .14, d: .01, c: K.dk, h: 0 })))], rest: 0, mode: 'up' }),
    staff: () => ({ pcs: [{ s: S_rrect(.05, 1.9, .02), y: .5, z: .06, d: .05, c: K.wood, h: .012 }, { s: S_circle(.1), y: 1.5, z: .07, d: .05, c: K.gold, h: .012 }], rest: 0, mode: 'free' }),
    torch: () => ({ pcs: [{ s: S_rrect(.06, .6, .02), y: .2, z: .08, d: .05, c: K.wood, h: .01 }, { s: S_poly([[-.08, 0], [.08, 0], [.05, .1], [-.05, .1]]), y: .5, z: .08, d: .06, c: K.dk, h: .01 }], rest: 0, mode: 'up', flame: [0, .72] }),
    sling: () => ({ pcs: [{ s: S_rrect(.03, .5, .01), y: -.1, z: .08, d: .02, c: K.leather, h: 0 }, { s: S_circle(.06), y: -.38, z: .08, d: .05, c: K.sep3, h: .008 }], rest: 0, mode: 'free' }),
    pot: () => ({ pcs: [{ s: S_poly([[-.07, .24], [.07, .24], [.17, .08], [.14, -.14], [-.14, -.14], [-.17, .08]]), z: .1, d: .1, c: 0x9a6a42, h: .014 }], rest: 0, mode: 'up' }),
    vial: () => ({ pcs: [{ s: S_rrect(.07, .2, .03), y: .06, z: .1, d: .06, c: 0x7d9a7a, h: .008 }, { s: S_rrect(.04, .06, .01), y: .2, z: .1, d: .05, c: K.dk, h: 0 }], rest: 0, mode: 'up' }),
    scroll: () => ({ pcs: [{ s: S_rrect(.32, .2, .04), y: .06, z: .1, d: .05, c: K.cream, h: .01 }, { s: S_rrect(.34, .04, .02), y: .16, z: .12, d: .05, c: K.sep3, h: 0 }], rest: 0, mode: 'up' })
  };
  const wCache = {};
  function weaponDef(kind) {
    if (wCache[kind]) return wCache[kind]; const w = WEAPONS[kind](); const g = mergePieces(w.pcs);
    const ar = w.arrow ? mergePieces(w.arrow) : null; return wCache[kind] = { geo: g.geo, hull: g.hull, arrow: ar, mode: w.mode, flame: w.flame };
  }
  function weaponGroup(kind, mat) {
    const wd = weaponDef(kind), g = new THREE.Group(); g.add(new THREE.Mesh(wd.geo, mat), new THREE.Mesh(wd.hull, hullMat));
    if (wd.arrow) { const a = new THREE.Group(); a.add(new THREE.Mesh(wd.arrow.geo, mat), new THREE.Mesh(wd.arrow.hull, hullMat)); a.visible = false; g.add(a); g.userData.arrow = a; }
    g.userData.mode = wd.mode; g.userData.kind = kind; return g;
  }

  /* ---------- costumes ---------- */
  const COS = {
    player: { body: 0x6a533c, trim: K.gold, belt: K.dk, scarf: 0x8a5a38, cloak: 0x4b3a2c, boots: 0x4a3626, mitt: K.leather, sleeve: 0x5e4733, hair: 'tuft', mark: 'c', mantle: 0x2f4a5c, mantleTrim: K.gold },
    spy: { body: 0x6a533c, trim: K.sep3, belt: K.dk, scarf: 0x8a5a38, cloak: 0x4b3a2c, boots: 0x4a3626, mitt: K.leather, sleeve: 0x5e4733, hair: 'tuft', mark: 'c' },
    soldier: { body: 0xb9a57c, trim: K.dk, armor: K.sep3, boots: K.dk, hat: 'helm', mark: 'c', beard: 'short', mitt: K.cream, pants: 0xa39063 },
    shield: { body: 0xb9a57c, trim: K.dk, armor: K.sep3, boots: K.dk, hat: 'helm', hatC: 0x9a7a3a, plume: K.blue, mark: 'frown', beard: 'short', mitt: K.cream, pants: 0xa39063 },
    archer: { body: 0x7a6a4a, trim: K.dk, boots: K.dk, hat: 'hood', hatC: 0x5a4a35, mark: 'c', cloak: 0x4a3f2f, mitt: K.leather, pants: 0x6a5a40 },
    captain: { body: 0x7b3b2c, trim: K.gold, armor: K.bronze, boots: K.dk, hat: 'helm', hatC: K.gold, plume: K.red, mark: 'frown', beard: 'long', cloak: 0x3b2d20, mitt: K.cream, scale: 1.12 },
    general: { body: 0x7b3b2c, trim: K.gold, robe: true, hat: 'helm', hatC: K.gold, plume: K.blue, mark: 'frown', beard: 'long', mantle: 0x2c3f52, mantleTrim: K.gold, mitt: K.cream, scale: 1.14, belt: K.gold },
    handler: { body: 0x5d5a52, trim: K.sep1, robe: true, hair: 'long', hat: 'cap', hatC: 0x3a342c, mark: 'smile', mitt: K.cream, scarf: 0x8a7a5a, scale: .9, cloak: 0x3a342c },
    escort: { body: 0x7d6a46, trim: K.gold, armor: K.bronze, hat: 'helm', hatC: K.bronze, plume: K.red, mark: 'smile', beard: 'short', boots: K.dk, mitt: K.cream, cloak: 0x4a3a2a, scale: 1.05 },
    inspector: { body: 0x3d3a34, trim: K.sep2, robe: true, hat: 'cap', hatC: 0x2a2620, mark: 'eyes', beard: 'short', mitt: K.cream, scarf: 0x6a6252, scale: 1.0 },
    chamberlain: { body: 0xe3dccb, trim: K.blue, robe: true, hat: 'turban', hatC: K.white, mark: 'smile', beard: 'long', mitt: K.cream, mantle: K.blue, mantleTrim: K.white, scale: 1.04 },
    priest: { body: 0xe3dccb, trim: K.blue, robe: true, mark: 'c', mitt: K.cream, mantle: 0xcfc6ad, mantleTrim: K.blue },
    scribe: { body: 0xb4a07a, trim: K.sep3, robe: true, hat: 'cap', hatC: K.sep3, mark: 'c', beard: 'short', mitt: K.cream },
    secretary: { body: 0x8a7a58, trim: K.gold, robe: true, hat: 'band', hatC: K.blue, mark: 'frown', beard: 'short', mitt: K.cream, sash: K.blue },
    merchant: { body: 0xa8895a, trim: K.red, robe: true, hat: 'turban', hatC: 0xb8643a, mark: 'smile', beard: 'long', mitt: K.cream, sash: K.red },
    herbalist: { body: 0x76805a, trim: K.sep3, robe: true, hat: 'hood', hatC: 0x5c6444, mark: 'c', mitt: K.cream, scarf: 0xb59a5a, scale: .94 },
    citizenM: { body: 0xb5a27c, trim: K.sep3, mark: 'c', hat: 'band', hatC: K.sep3, beard: 'short', mitt: K.cream, pants: 0x9a8a68 },
    citizenF: { body: 0x9a7a62, trim: K.sep1, robe: true, hair: 'long', mark: 'smile', mitt: K.cream, scale: .95 },
    child: { body: 0xb5a27c, trim: K.sep3, mark: 'smile', mitt: K.cream, scale: .62 },
    servant: { body: 0xc9bea4, trim: K.sep3, robe: true, hat: 'band', hatC: K.sep3, mark: 'c', mitt: K.cream, scale: .98 },
    laborer: { body: 0xa8957a, trim: K.sep3, mark: 'c', hat: 'cap', hatC: K.sep2, mitt: K.cream, pants: 0x8a7a5c },
    noble: { body: 0x3f5c6e, trim: K.gold, robe: true, hat: 'crown', mark: 'smile', beard: 'long', mitt: K.cream, mantle: 0x7b3b2c, mantleTrim: K.gold },
    shade: { body: 0x1b1814, trim: 0x1b1814, robe: true, hat: 'hood', hatC: 0x1b1814, mark: 'eyes', skin: 0x1b1814, mitt: 0x1b1814, scale: 1.25 }
  };
  const get = key => buildDef(key, COS[key] || COS.citizenM);

  /* ---------- debris physics (the tear-apart) ---------- */
  const debris = [];
  function tickDebris(dt, camYaw) {
    for (let i = debris.length - 1; i >= 0; i--) {
      const d = debris[i], g = d.g; d.t += dt;
      if (d.landed) { if (d.fade > 0 && d.t > d.fade) { const k = Math.max(0, 1 - (d.t - d.fade) / 1.2); g.scale.setScalar(k * d.s0); if (k <= 0) { if (g.parent) g.parent.remove(g); debris.splice(i, 1); } } continue; }
      d.vy -= 6.5 * dt; if (d.vy < -d.term) d.vy = -d.term;
      const dr = Math.max(0, 1 - d.drag * dt); d.vx *= dr; d.vz *= dr;
      g.position.x += (d.vx + Math.sin(d.t * 6 + d.ph) * d.sway) * dt; g.position.z += (d.vz + Math.cos(d.t * 5 + d.ph) * d.sway) * dt; g.position.y += d.vy * dt;
      g.rotation.x += d.wx * dt; g.rotation.y += d.wy * dt; g.rotation.z += d.wz * dt;
      if (g.position.y <= d.floor) {
        g.position.y = d.floor + (d.k % 7) * .006; d.landed = true; g.rotation.set(-Math.PI / 2 + (Math.random() - .5) * .2, 0, Math.random() * 6.28);
        if (d.onLand) d.onLand();
      }
    }
  }

  /* ---------- the figure ---------- */
  class Figure {
    constructor(L, key, opt = {}) {
      this.L = L; this.def = get(key); this.key = key; this.facing = 1; this.t = Math.random() * 10; this.flashT = 0; this.dead = false;
      this.root = new THREE.Group(); this.pivot = new THREE.Group(); this.root.add(this.pivot);
      this.mat = toon({ vertexColors: true }); this.baseTint = new THREE.Color(1, 1, 1);
      const B = this.def.bones, mk = n => { const g = new THREE.Group(); g.add(new THREE.Mesh(B[n].geo, this.mat), new THREE.Mesh(B[n].hull, hullMat)); return g; };
      this.legB = mk('legB'); this.legF = mk('legF'); this.body = mk('body'); this.head = mk('head'); this.armB = mk('armB'); this.armF = mk('armF');
      this.legB.position.set(-.11, .48, 0); this.legF.position.set(.11, .48, 0); this.body.position.set(0, .48, 0); this.head.position.set(0, 1.1, 0);
      this.armB.position.set(-.25, 1.04, 0); this.armF.position.set(.25, 1.04, 0);
      this.pivot.add(this.legB, this.legF, this.body, this.armB, this.armF, this.head);
      const s = (opt.scale || 1) * this.def.scale; this.pivot.scale.setScalar(s); this.size = s;
      /* ground shadow blob */
      this.shadow = new THREE.Mesh(FLATG, L && L.shadowMat ? L.shadowMat : new THREE.MeshBasicMaterial({ color: 0x14110e, transparent: true, opacity: .28, depthWrite: false }));
      this.shadow.scale.set(.9 * s, 1, .5 * s); this.shadow.position.y = .03; this.root.add(this.shadow);
      this.P = { walk: 0, aim: 0, draw: 0, swing: 0, salute: 0, talk: 0, drink: 0, sit: 0, crouch: 0, hands: 0, point: 0, carry: 0, choke: 0, lunge: 0 }; this.T = Object.assign({}, this.P);
      this.hold = null; this.off = null; this.aimPitch = 0; this.speed = 0; this.lean = 0; this.tilt = .3;
      if (opt.hold) this.setHold(opt.hold); if (opt.off) this.setOff(opt.off);
    }
    setHold(kind) { if (this.hold) this.armF.remove(this.hold); this.hold = null; this.holdKind = kind; if (!kind) return; const g = weaponGroup(kind, this.mat); g.position.set(0, -.48, .02); this.armF.add(g); this.hold = g; }
    setOff(kind) { if (this.off) this.armB.remove(this.off); this.off = null; this.offKind = kind; if (!kind) return; const g = weaponGroup(kind, this.mat); g.position.set(0, -.48, .02); g.scale.x = -1; this.armB.add(g); this.off = g; }
    addTo(scene) { scene.add(this.root); return this; }
    place(x, z, y = 0) { this.root.position.set(x, y, z); }
    flash(t = .14) { this.flashT = t; }
    /* animate; speed = 0..1 walking intensity, called every frame */
    update(dt, camYaw, speed) {
      if (this.dead) return;
      const P = this.P, T = this.T; this.speed = speed === undefined ? this.speed : speed;
      for (const k in T) P[k] += (T[k] - P[k]) * Math.min(1, dt * (k === 'swing' || k === 'lunge' ? 26 : 10));
      const walk = Math.min(1, this.speed), t = this.t += dt * (3 + walk * 6);
      const sw = Math.sin(t) * walk, sw2 = Math.sin(t + Math.PI) * walk;
      const sit = P.sit, hands = P.hands, crouch = P.crouch;
      this.legF.rotation.z = sw * .62 * (1 - sit) + sit * 1.2; this.legB.rotation.z = sw2 * .62 * (1 - sit) + sit * 1.0;
      let aF = sw2 * .55, aB = sw * .55;
      aF = lerp(aF, 1.52 + this.aimPitch, P.aim); aB = lerp(aB, 1.5 + this.aimPitch - P.draw * .95, P.aim);
      aF = lerp(aF, 3.0 - P.swing * 2.8, P.swing > .02 ? 1 : 0); // stab/slash swing
      aF = lerp(aF, 2.9 + Math.sin(this.t * 2) * .06, P.salute); aF = lerp(aF, 2.35 + Math.sin(this.t * 3) * .1, P.drink);
      aF = lerp(aF, .5 + Math.sin(this.t * 1.7) * .3, P.talk * (1 - P.aim) * (1 - P.salute) * (1 - P.drink)); aB = lerp(aB, -.25 + Math.sin(this.t * 1.3) * .12, P.talk * (1 - P.aim));
      aF = lerp(aF, 1.55, P.point); aF = lerp(aF, 1.2, P.carry); aB = lerp(aB, 1.2, P.carry);
      aF = lerp(aF, 3.0, hands); aB = lerp(aB, -3.0, hands);
      aF = lerp(aF, 1.4 + P.lunge * .5, P.choke); aB = lerp(aB, 1.35, P.choke);
      this.armF.rotation.z = aF; this.armB.rotation.z = aB;
      if (this.hold) { const m = this.hold.userData.mode; this.hold.rotation.z = m === 'up' ? -aF + Math.PI * 0 : (this.holdKind === 'spear' ? -aF * P.aim * .0 + P.swing * 0 : 0); if (this.holdKind === 'spear') this.hold.rotation.z = lerp(0, -1.5 - aF, Math.max(P.swing, P.aim * .6)); if (this.hold.userData.arrow) this.hold.userData.arrow.visible = P.aim > .4; }
      if (this.off) this.off.rotation.z = this.offKind === 'shield' ? -aB * .3 : -aB;
      const bob = Math.abs(Math.sin(t)) * .06 * walk + Math.sin(this.t * 1.8) * .012;
      this.pivot.position.y = bob - sit * .26 - crouch * .2; this.body.rotation.z = this.lean + Math.sin(t) * .035 * walk + (P.lunge > .02 ? -P.lunge * .22 : 0); this.head.rotation.z = Math.sin(t * .5) * .03 * walk + P.talk * Math.sin(this.t * 4) * .06 - this.lean * .5 + P.choke * .3;
      this.head.position.y = 1.1 - crouch * .08;
      this.pivot.scale.y = this.size * (1 - crouch * .08);
      /* face camera, turn slightly toward travel */
      this.root.rotation.y = camYaw - this.tilt * this.facing; this.pivot.scale.x = this.size * this.facing;
      if (this.flashT > 0) { this.flashT -= dt; this.mat.color.setRGB(1.9, .75, .65); } else { this.mat.color.copy(this.baseTint); }
    }
    pose(o) { for (const k in o) this.T[k] = o[k]; return this; }
    clearPose() { for (const k in this.T) this.T[k] = 0; this.aimPitch = 0; return this; }
    /* tear-apart: the doll shreds into its cut-outs which flutter down. kind: 'shatter' (loud) | 'fold' (silent) */
    shatter(dx, dz, kind = 'shatter') {
      if (this.dead) return null; this.dead = true; const scene = this.root.parent; if (!scene) return null; this.root.updateMatrixWorld(true);
      const pieces = [this.head, this.body, this.armF, this.armB, this.legF, this.legB]; const out = [], floor = this.root.position.y + .02, quiet = kind === 'fold';
      pieces.forEach((g, k) => {
        scene.attach(g); const sp = quiet ? .5 : 3.4;
        const d = { g, vx: dx * sp * (.4 + Math.random()) + (Math.random() - .5) * sp, vz: dz * sp * (.4 + Math.random()) + (Math.random() - .5) * sp, vy: quiet ? .4 : 2.2 + Math.random() * 3.2, wx: (Math.random() - .5) * (quiet ? 2 : 9), wy: (Math.random() - .5) * (quiet ? 2 : 9), wz: (Math.random() - .5) * (quiet ? 3 : 12), t: 0, ph: Math.random() * 6, sway: quiet ? .3 : .9, term: quiet ? 1.2 : 2.4, drag: quiet ? 3 : 1.6, floor, k: k + (debris.length % 5), landed: false, fade: 0, s0: g.scale.x };
        debris.push(d); out.push(d);
      });
      [this.hold, this.off].forEach(g => { if (!g || !g.parent) return; scene.attach(g); debris.push({ g, vx: dx * 2 + (Math.random() - .5) * 2, vz: dz * 2 + (Math.random() - .5) * 2, vy: 2 + Math.random() * 2, wx: (Math.random() - .5) * 6, wy: (Math.random() - .5) * 6, wz: (Math.random() - .5) * 10, t: 0, ph: Math.random() * 6, sway: .5, term: 3, drag: 1.2, floor, k: 5, landed: false, fade: 0, s0: g.scale.x }); });
      scene.remove(this.root);
      this.root.remove(this.shadow);
      return out;
    }
    dispose() { if (this.root.parent) this.root.parent.remove(this.root); }
  }
  const FLATG = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* ---------- instanced crowd (thousands of paper people, one draw call) ---------- */
  const crowds = [];
  function makeCrowd(L, atlas, spots, opts = {}) {
    const n = spots.length, variants = opts.variants || 8;
    const base = new THREE.PlaneGeometry(1, 1), geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index; geo.setAttribute('position', base.attributes.position); geo.setAttribute('uv', base.attributes.uv);
    const iPos = new Float32Array(n * 3), iA = new Float32Array(n * 4), iDir = new Float32Array(n * 3);
    spots.forEach((s, i) => { iPos[i * 3] = s.x; iPos[i * 3 + 1] = s.y || 0; iPos[i * 3 + 2] = s.z; iA[i * 4] = s.sc || (.9 + Math.random() * .25); iA[i * 4 + 1] = (Math.random() * variants) | 0; iA[i * 4 + 2] = Math.random(); iA[i * 4 + 3] = s.spd === undefined ? .35 + Math.random() * .4 : s.spd; iDir[i * 3] = s.dx || 0; iDir[i * 3 + 1] = s.dz || 0; iDir[i * 3 + 2] = s.len || 0; });
    geo.setAttribute('iPos', new THREE.InstancedBufferAttribute(iPos, 3)); geo.setAttribute('iA', new THREE.InstancedBufferAttribute(iA, 4)); geo.setAttribute('iDir', new THREE.InstancedBufferAttribute(iDir, 3)); geo.instanceCount = n;
    const mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uMap: { value: atlas }, uVar: { value: variants }, uCam: { value: new V3() }, uTint: { value: new THREE.Color(opts.tint || 0xffffff) } }]), fog: true, transparent: false,
      vertexShader: `attribute vec3 iPos; attribute vec4 iA; attribute vec3 iDir; uniform float uTime; uniform float uVar; uniform vec3 uCam; varying vec2 vUv;
#include <fog_pars_vertex>
void main(){ float spd=iA.w, ph=iA.z, len=iDir.z; vec3 p=iPos; float f=0.5;
 if(len>0.0){ f=fract(uTime*spd/len+ph); p.x+=iDir.x*len*(f-.5); p.z+=iDir.y*len*(f-.5); }
 float walk = len>0.0 ? abs(sin(uTime*spd*4.0+ph*40.0))*0.09 : 0.0;
 vec3 right=vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]);
 float dcam=distance(p,uCam); float fade=smoothstep(1.4,3.4,dcam); if(len>0.0) fade*=smoothstep(0.0,0.05,f)*smoothstep(1.0,0.95,f);
 float flip = len>0.0 ? sign(iDir.x*right.x+iDir.y*right.z) : (fract(ph*7.0)>.5?1.0:-1.0); if(flip==0.0) flip=1.0;
 float sc=iA.x*fade;
 vec3 wp=p+right*position.x*sc*0.62+vec3(0.0,(position.y+.5)*sc*1.75+walk,0.0);
 float u = flip>0.0 ? uv.x : 1.0-uv.x; vUv=vec2((iA.y+u)/uVar, uv.y);
 vec4 mvPosition=viewMatrix*vec4(wp,1.0); gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}`,
      fragmentShader: `uniform sampler2D uMap; uniform vec3 uTint; varying vec2 vUv;
#include <fog_pars_fragment>
void main(){ vec4 c=texture2D(uMap,vUv); if(c.a<.5) discard; gl_FragColor=vec4(c.rgb*uTint,1.0);
#include <fog_fragment>
}`
    });
    const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; L.scene.add(mesh); crowds.push(mat); return mesh;
  }
  function tick(time, camPos) { for (const m of crowds) { m.uniforms.uTime.value = time; m.uniforms.uCam.value.copy(camPos); } }

  return { Figure, get, COS, K, tickDebris, debris, makeCrowd, tick, gradTex, hullMat, toon, S_circle, S_rrect, S_poly, S_arc, S_semi, mergePieces, weaponGroup, WEAPONS, INKC, clearCrowds: () => { crowds.length = 0; debris.length = 0; } };
})();
