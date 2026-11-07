/* ============================================================
   INK OF BABYLON — vm.js
   First-person view-model: big flat paper mittens in the foreground
   (drawn in a second pass so they never clip into walls).
   ============================================================ */
'use strict';
const VM = (function () {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, .02, 20);
  scene.add(new THREE.HemisphereLight(0xfff0d8, 0x8a7a60, .85)); const sun = new THREE.DirectionalLight(0xffe2b0, .7); sun.position.set(-1, 2, 1); scene.add(sun);
  const mat = Paper.toon({ vertexColors: true });
  const K = Paper.K;
  function handGeo(sleeveCol, mitt) {
    return Paper.mergePieces([
      { s: Paper.S_rrect(.2, 1.3, .08), y: -.72, z: -.03, d: .06, c: sleeveCol, h: .018 }, { s: Paper.S_rrect(.22, .05, .02), y: -.2, z: .03, d: .04, c: K.gold, h: 0 },
      { s: Paper.S_circle(.15), z: .04, d: .08, c: mitt, h: .02 }, { s: Paper.S_circle(.07), x: .12, y: .06, z: .04, d: .07, c: mitt, h: .015 }
    ]);
  }
  const mk = (flip) => { const g = new THREE.Group(), inner = new THREE.Group(), G2 = handGeo(0x5e4733, K.cream); inner.add(new THREE.Mesh(G2.geo, mat), new THREE.Mesh(G2.hull, Paper.hullMat)); if (flip) inner.scale.x = -1; g.add(inner); scene.add(g); g.userData.item = null; return g; };
  const R = mk(false), Lh = mk(true); R.scale.setScalar(.42); Lh.scale.setScalar(.42);
  const state = { on: false, pose: 'idle', draw: 0, fireT: 0, slashT: 0, bob: 0, tp: 0 };
  const T = {
    idle: { R: [.36, -.38, -.8, .15], L: [-.36, -.4, -.8, -.15] },
    bow: { R: [.24, -.3, -.72, .3], L: [-.2, -.12, -.9, -.05] },
    knife: { R: [.32, -.22, -.75, .1], L: [-.36, -.42, -.8, -.15] },
    sling: { R: [.32, -.22, -.75, .15], L: [-.36, -.42, -.8, -.15] },
    pot: { R: [.24, -.16, -.75, .1], L: [-.36, -.42, -.8, -.15] },
    letter: { R: [.17, -.06, -.55, .45], L: [-.17, -.06, -.55, -.45] },
    pour: { R: [.15, .04, -.55, .7], L: [-.36, -.42, -.8, -.15] },
    cup: { R: [.13, -.04, -.5, .2], L: [-.36, -.42, -.8, -.15] },
    reach: { R: [.24, -.02, -.5, .8], L: [-.24, -.02, -.5, -.8] },
    struggle: { R: [.14, .02, -.45, 1.0], L: [-.14, .02, -.45, -1.0] },
    stab: { R: [.14, .0, -.5, 1.3], L: [-.2, -.2, -.5, -1.2] },
    hide: { R: [.5, -.95, -.8, .2], L: [-.5, -.95, -.8, -.2] }
  };
  let cur = { R: [...T.idle.R], L: [...T.idle.L] };
  function holdKind(g, kind) {
    if (g.userData.item) { g.remove(g.userData.item); g.userData.item = null; } g.userData.kind = kind; if (!kind) return;
    const w = Paper.weaponGroup(kind, mat); w.scale.setScalar(1.1); w.position.set(0, .08, .05); g.add(w); g.userData.item = w;
    if (kind === 'bow') { w.rotation.z = 0; w.position.set(.05, 0, .04); } if (kind === 'knife') { w.position.set(0, .02, .06); }
  }
  const api = {
    scene, camera, state, T, get visible() { return state.on; },
    set(pose) { if (!pose) { state.on = false; return; } state.on = true; state.pose = pose; },
    hold(weapon) { state.weapon = weapon; if (!G.vmScripted) { holdKind(R, weapon === 'bow' ? null : weapon); holdKind(Lh, weapon === 'bow' ? 'bow' : null); } },
    items(r, l) { holdKind(R, r); holdKind(Lh, l); },
    fire() { state.fireT = .25; }, slash() { state.slashT = .22; },
    update(dt) {
      if (!state.on) return; const P2 = typeof P !== 'undefined' ? P : null; let pose = G.vmScripted ? state.pose : (state.weapon || 'idle'); const tgt = T[pose] || T.idle;
      const walk = P2 && P2.moving ? 1 : 0; state.bob += dt * (P2 && P2.sprint ? 12 : 8) * walk; const bx = Math.sin(state.bob) * .012 * walk, by = Math.abs(Math.cos(state.bob)) * .018 * walk + Math.sin(G.time * 1.6) * .004;
      state.fireT = Math.max(0, state.fireT - dt); state.slashT = Math.max(0, state.slashT - dt);
      const draw = P2 && pose === 'bow' ? clamp(P2.drawT / .6, 0, 1) : 0; state.draw += (draw - state.draw) * Math.min(1, dt * 14);
      const k = Math.min(1, dt * 12); const set = (g, c, tv, extra) => { for (let i = 0; i < 4; i++) c[i] += (tv[i] + (extra ? extra[i] : 0) - c[i]) * k; g.position.set(c[0] + bx, c[1] + by, c[2]); g.rotation.z = c[3]; };
      let eR = [0, 0, 0, 0], eL = [0, 0, 0, 0];
      if (pose === 'bow') { eR = [-state.draw * .1, state.draw * .06, state.draw * .2, -state.draw * .25]; if (state.fireT > 0) { eR = [.1, -.02, -.1, .2]; eL = [0, .02, .02, 0]; } }
      if (pose === 'knife' && state.slashT > 0) { const t = 1 - state.slashT / .22; eR = [-.5 + t * .9, .1 - t * .3, -.15, -.8 + t * 1.6]; }
      if (pose === 'sling' || pose === 'pot') { if (state.fireT > 0) { const t = 1 - state.fireT / .25; eR = [-.1, .2 * (1 - t), -.3 * (1 - t), -.6 * (1 - t)]; } }
      if (pose === 'struggle') { eR = [Math.sin(G.time * 22) * .03, Math.cos(G.time * 18) * .03, 0, Math.sin(G.time * 25) * .08]; eL = [Math.cos(G.time * 20) * .03, Math.sin(G.time * 24) * .03, 0, Math.cos(G.time * 27) * .08]; }
      set(R, cur.R, tgt.R, eR); set(Lh, cur.L, tgt.L, eL);
      if (R.userData.item && R.userData.kind === 'knife') R.userData.item.rotation.z = -.2 + state.slashT * 1.5;
      /* tint for dark places */
      const lv = G.level; if (lv) { const d = lv.o.dark || lv.indoor ? .65 : 1; scene.children.forEach(o => { if (o.isHemisphereLight) o.intensity = .85 * d; }); sun.intensity = lv.indoor ? .3 : .7; }
    },
    render() { if (!state.on) return; camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.clearDepth(); renderer.render(scene, camera); }
  };
  return api;
})();
window.VM = VM;
