/* ============================================================
   INK OF BABYLON — story.js
   A Mesopotamian spy thriller in five chapters.
   You are Tabni, Chief of the King's Eyes of Elam, wearing the face
   (and the ring) of General Nabû-nāṣir of Babylon.
   ============================================================ */
'use strict';
const ME = 'Tabni';
const sleep = s => Seq.wait(s);
const say = (w, t, o) => UI.say(w, t, o);
const thought = t => UI.say(ME, t, { vol: .3 });
const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0;[b[i], b[j]] = [b[j], b[i]]; } return b; };
const waitFor = fn => Seq.until(fn);
const inRect = (x0, z0, x1, z1) => P.x > x0 && P.x < x1 && P.z > z0 && P.z < z1;
async function cinematic(fn) { Cine.begin(); Cine.skippable = true; try { await fn(); } finally { Cine.end(); G.vmScripted = false; VM.items(null, null); } }
const holdPov = o => { Cine.shot(Object.assign({ dur: 9999, cap: '' }, o)); };
function walkTo(n, x, z, spd = 2.4, stop = .4) { return Seq.run(dt => { const dx = x - n.x, dz = z - n.z, d = Math.hypot(dx, dz); if (d < stop) return true; const s = Math.min(d, spd * dt); n.x += dx / d * s; n.z += dz / d * s; n.fa = Math.atan2(dz, dx); n.scriptMove = true; n.speed = spd; n.fig.root.position.x = n.x; n.fig.root.position.z = n.z; return false; }); }
function faceNpc(n, x, z) { n.fa = Math.atan2(z - n.z, x - n.x); }
function teleportPlayer(x, z, yaw) { P.x = x; P.z = z; P.vx = P.vz = 0; if (yaw !== undefined) Cam.yaw = yaw; Cam.snap = true; }
const pos2 = (n, h = 1.55) => [n.x, h, n.z];
function cupMesh(L, x, y, z) { const g = Paper.weaponGroup('cup', Paper.toon({ vertexColors: true })); g.position.set(x, y, z); g.scale.setScalar(1.5); L.scene.add(g); return g; }
function addFact(t) { (G.facts = G.facts || []).push(t); UI.toast(`<img src="${ART.iconURL('tablet')}"> <b>Journal:</b> ${t}`, 5200, 'gold'); Aud.sfx('pick'); }
function title(t, s, ms = 2800) { const e = $('chapterCard'); e.innerHTML = `<div class="n">${s || ''}</div><div class="t">${t}</div>`; e.classList.add('on'); setTimeout(() => e.classList.remove('on'), ms); }

/* ---------------------------------------------------------- chapters registry */
const CHAPTERS = [
  { id: 'cart', num: 'I', title: 'The Road to Babylon', sub: 'A sealed letter, a borrowed ring, and a bundle in the corner of the cart.', preset() { P.skills = [baseSkill(0), baseSkill(1), baseSkill(2)]; }, run: chCart },
  { id: 'gate', num: 'II', title: 'The Ishtar Gate', sub: 'Walk like a general beneath the blue glazed bricks.', preset() { baseKit(); }, run: chGate },
  { id: 'market', num: 'III', title: 'The Market of Marduk', sub: 'Thousands of voices, one contact, and a spy-catcher on the way.', preset() { baseKit(); G.flags.escortGone = true; }, run: chMarket },
  { id: 'temple', num: 'IV', title: 'The House Whose Head Is Lofty', sub: 'Three floors, a cistern, and an Inspector who smells lies.', preset() { baseKit(); G.items.seal = true; P.clearance = 1; }, run: chTemple },
  { id: 'banquet', num: 'V', title: 'The Marshal’s Table', sub: 'Three drops of henbane. One old friend. Steady hands.', preset() { baseKit(); G.items.seal = true; G.items.invitation = true; P.clearance = 2; G.flags.invited = true; }, run: chBanquet },
  { id: 'escape', num: 'VI', title: 'Forty Cubits Above the Street', sub: 'The ledger is yours. The rooftops are not.', preset() { baseKit(); G.items.ledger = true; G.items.seal = true; G.flags.generalDead = true; }, run: chEscape }
];
function baseKit() { G.facts = ['Nabû-nāṣir: born in Borsippa, son of a scribe of Nabû.', 'Wounded in the left hand at Carchemish, under the Crown Prince.', 'Honored by the king himself at the Akītu festival.', 'Contact: Zer-Bāni the herbalist. Answer her: “The barley is ripe.”']; G.items = { letter: true, vial: true }; }

async function startChapter(id, keep) {
  const ch = CHAPTERS.find(c => c.id === id); if (!ch) return; const token = G.token = (G.token || 0) + 1;
  Seq.reset(); try { UI.qte.hide(); } catch (e) { } $('dialog').classList.remove('on'); UI.hideLines(); $('dead').classList.remove('on'); $('end').classList.remove('on'); $('pause').classList.remove('on'); $('title').classList.remove('on'); Talk.on = false; if (Cine.on) Cine.end();
  G.vmScripted = false; VM.items(null, null);
  if (!keep) { resetPlayer(); G.flags = {}; G.facts = []; G.kills = 0; G.xpRun = 0; G.alert = 0; ch.preset(); } else { P.dead = false; P.hp = Math.max(P.hp, 30); }
  G.chapter = id; G.mode = 'wipe'; document.body.classList.add('playing'); P.dead = false; P.hidden = false;
  UI.wipe(`${ch.num} — ${ch.title}`, ch.sub, () => { resetLevels(); P.fig = new Paper.Figure({}, 'player'); P.fig.addTo(new THREE.Scene()); P.weapon = null; if (!keep) P.fig.setHold(null); }, () => { G.mode = 'play'; if (token === G.token) ch.run(token); });
}

/* ---------------------------------------------------------- I · THE ROAD TO BABYLON */
async function chCart() {
  const L = ensureLevel('cart'); switchLevel('cart', 'main'); P.x = -1.1; P.z = 0; Cam.yaw = -PI / 2; P.fig.root.visible = false; G.mode = 'cine'; G.fpAuto = true; Cine.begin(); G.vmScripted = true; VM.items('tablet', null); VM.state.pose = 'letter'; VM.state.on = true;
  const nin = L.key.ninsun, pov = o => holdPov(Object.assign({ pos: [-1.15, 1.22, 0], yaw: -PI / 2, pitch: -.06, free: true, sway: .012 }, o));
  Aud.setAmb({ wind: .55, crowd: .05 }); L.speed = 1;
  await Cine.shot({ pos: [-1.15, 1.22, 0], yaw: -PI / 2, pitch: -.35, yawTo: -PI / 2, pitchTo: -.06, dur: 4, free: true, sway: .014, cap: 'The Damascus road. Dusk. The eighteenth year of King Nebuchadnezzar.' }); pov();
  nin.fig.pose({ talk: 1 });
  await say('Ninsun', 'You are awake. Good. The road is nearly done, Tabni.'); await thought('How long until the gate?'); await say('Ninsun', 'One hour. Look at your hand, child. That ring is not yours.');
  await say('Ninsun', 'It belonged to General Nabû-nāṣir, commander of Babylon’s western army. Three days ago, on the road, our riders took his caravan.');
  pov({ yawTo: -PI / 2 + .75, pitchTo: -.25, yaw: -PI / 2, pitch: -.06, dur: 3 }); Aud.sfx('creak'); await sleep(1.4); await say('Ninsun', 'He will not be missed until he fails to answer his own letters. We wrapped him in a reed mat. Do not look at it too long.');
  Aud.setAmb({ wind: .5, dread: .4 }); await sleep(.6); pov(); Aud.setAmb({ wind: .5, dread: 0 });
  await say('Ninsun', 'From tonight you are Nabû-nāṣir. No one in the capital has seen his face in five years.');
  let asked = [false, false];
  while (!(asked[0] && asked[1])) {
    const opts = [asked[0] ? null : 'Who is the target?', asked[1] ? null : 'What if someone recognizes me?'].filter(Boolean); const k = await UI.ask('Ninsun watches you.', opts); const which = asked[0] ? 1 : (k === 0 ? 0 : 1);
    if (which === 0) { asked[0] = true; await say('Ninsun', 'Rimut-Marduk, Marshal of the Chariots. In spring he marches on Elam. His war ledger, a wooden case of clay tablets, names every spy we have in Babylon.'); await say('Ninsun', 'Bring me the ledger. Or burn it. But it must not stay in Babylon.'); }
    else { asked[1] = true; await say('Ninsun', 'Then you charm them or you kill them, quietly. Fear the Inspector, Sîn-leqi. He smells a lie across a river.'); }
  }
  await say('Ninsun', 'Read the General’s letter. Learn his life. The Inspector will test you.');
  VM.state.pose = 'letter'; await sleep(.6); addFact('Nabû-nāṣir: born in Borsippa, son of a scribe of Nabû.'); await thought('Born in Borsippa. A scribe’s son.'); addFact('Wounded in the left hand at Carchemish, under the Crown Prince.'); await thought('Wounded in the left hand, at Carchemish.'); addFact('Honored by the king himself at the Akītu festival.'); await thought('Honored by the king at the New Year festival.');
  await say('Ninsun', 'Your contact is a herbalist, Zer-Bāni, in the great market. She will ask the weather in Susa. Say: “The barley is ripe.”'); addFact('Contact: Zer-Bāni the herbalist. Answer her: “The barley is ripe.”');
  VM.state.pose = 'pour'; VM.items('vial', null); await say('Ninsun', 'Now the ring. The bezel is hollow: henbane and nightshade. Three drops in his cup. No more, or he will taste it.'); G.items.vial = true;
  await UI.qte.press('KeyE', 10, 'Open the ring’s hollow bezel'); Aud.sfx('clink'); UI.toast(`<img src="${ART.iconURL('vial')}"> You carry <b>the poison ring</b>.`, 3000, 'gold'); VM.items('tablet', null); VM.state.pose = 'letter';
  /* the cart stops */
  await sleep(1); L.speed = 0; Aud.sfx('creak'); L.pl[0].intensity = .4; Aud.setAmb({ wind: .2, dread: .6 }); Aud.sfx('scare'); nin.fig.pose({ talk: 0 }); await say('Ninsun', 'Be still.', { vol: .15 });
  const sold = civ(L, 'soldier', 3.15, 0, { name: 'Guard', static: true, f: PI, hold: 'spear' }); sold.fig.pose({}); sold.fig.root.position.y = 0; sold.fig.facing = -1;
  holdPov({ pos: [-1.15, 1.22, 0], yaw: -PI / 2, pitch: -.02, free: true, sway: .02 }); await sleep(1.2); Aud.sfx('door');
  await say('Guard', 'Halt. In the name of the Marshal, papers.'); VM.state.pose = 'letter';
  const steady = await UI.qte.hold('KeyE', 1.8, 'Hold your hand steady… (hold E)'); if (!steady) { G.flags.nervous = true; UI.sub('Your hand trembles. The guard notices.', 2400); }
  await say('Guard', 'General Nabû-nāṣir? The western army’s General?... you look thinner than your seal.');
  const a1 = await UI.ask('The soldier squints at your face.', ['“Do I look like a man who enjoys being kept waiting?”', '“Forgive the delay, soldier. It was a long road.”', '(Say nothing.)']);
  if (a1 === 2) { G.flags.nervous = true; await say('Guard', '…Pass. Forgive me.'); } else if (a1 === 0) { await say('Guard', 'Of course, General. At once.'); addXP(10); } else { await say('Guard', 'Forgive us, General. Captain Ibbi-Adad will meet you inside the gate.'); }
  await sleep(.5); L.removeActor && 0; sold.fig.root.visible = false; L.speed = 1; Aud.setAmb({ wind: .4, crowd: .3, dread: 0 }); L.pl[0].intensity = 1.2;
  L.key.city.material.opacity = 0; Seq.run(dt => { L.key.city.material.opacity = Math.min(1, L.key.city.material.opacity + dt * .25); L.key.desert.material.opacity = 1; return L.key.city.material.opacity >= 1; });
  Aud.setAmb({ crowd: .55, wind: .3, market: .25 }); await sleep(3);
  await say('Ninsun', 'Remember: the Esagila, the Marshal’s wing, the ledger, then the river stairs. A boat waits there.'); await say('Ninsun', 'If you cannot walk out of Babylon, crawl. We part at the gate. Walk like a general.');
  VM.items(null, null); VM.state.pose = 'idle'; holdPov({ pos: [-1.15, 1.22, 0], yaw: -PI / 2, pitchTo: .15, pitch: -.02, dur: 9999, free: true }); await sleep(.4);
  Aud.sfx('door'); UI.flash('alarmflash', 1); $('flash').className = 'whiteflash'; $('flash').style.opacity = 1; await sleep(1.2); startChapter('gate', true); setTimeout(() => { $('flash').style.opacity = 0; $('flash').className = ''; }, 900);
}

/* ---------------------------------------------------------- II · THE ISHTAR GATE */
async function chGate() {
  const L = ensureLevel('city'), K = L.key; switchLevel('city', 'cart'); teleportPlayer(0, 198, 0); P.fig.root.visible = true; G.fpAuto = true; G.fp = false; Aud.setAmb({ crowd: .55, wind: .3, market: .1 });
  K.escort.fig.root.visible = true; K.escort.x = 0; K.escort.z = 128;
  await cinematic(async () => {
    await Cine.shot({ from: [-30, 2.2, 214], to: [-6, 3.4, 198], look: [0, 9, 160], lookTo: [0, 16, 150], dur: 5.5, cap: 'Babylon. Not a city: a world with walls.' });
    await Cine.shot({ from: [0, 1.4, 190], to: [0, 5, 182], look: [0, 22, 150], lookTo: [0, 30, 150], dur: 5, fov: [78, 56], cap: 'The Ishtar Gate: forty cubits of blue glazed brick, and thousands waiting beneath it.' });
    await Cine.shot({ from: [14, 2.2, 182], to: [4, 2.2, 182], look: [0, 1.6, 176], dur: 3, cap: 'At the foot of the gate, an officer inspects every traveler.' });
  });
  setObj('Present your letter at the Ishtar Gate', 'Walk to the gate officer.', { x: 0, z: 177 }); setWeapon(null);
  await waitFor(() => Math.hypot(P.x - K.inspector.x, P.z - K.inspector.z) < 5.5);
  Talk.begin(K.inspector); await say('Gate officer', 'Name, rank, and business in Babylon.');
  const c = await UI.ask('Your hands know the answer.', ['“General Nabû-nāṣir, returned from the western war.”', '“A traveler. Let me pass.”']);
  if (c === 1) { await say('Gate officer', 'A traveler does not carry the seal of a General. Forgive me, my lord, I did not know.'); G.flags.nervous = true; }
  else { await say('Gate officer', 'General! Forgive us. The roads, the dust… Captain Ibbi-Adad is waiting within to escort you.'); addXP(10); }
  K.inspector.fig.pose({ salute: 1 }); [K.inspector].forEach(n => n.fig.pose({ salute: 1 })); Talk.end();
  for (const a of L.actors) if (a.role === 'guard') { a.fig.pose({ salute: 1 }); } setTimeout(() => { for (const a of L.actors) if (a.role === 'guard') a.fig.pose({ salute: 0 }); K.inspector.fig.pose({ salute: 0 }); }, 4000);
  setObj('Enter Babylon through the Ishtar Gate', 'The gate stands open for a General.', { x: 0, z: 140 });
  await waitFor(() => P.z < 148);
  await cinematic(async () => {
    P.fig.root.visible = true; const f = (n, p) => n.fig.pose(p); [K.escort].forEach(n => f(n, { salute: 1 }));
    await Cine.shot({ from: [0, 1.3, 150], to: [0, 3.5, 140], look: [0, 3, 120], lookTo: [0, 2, 124], dur: 4, fov: [84, 66], cap: 'Within the walls, the honor guard of the Marshal lines the plaza.' });
    await Cine.shot({ from: [-8, 2.2, 134], to: [-3.6, 1.9, 132], look: [0, 1.8, 128], dur: 3 });
  });
  Talk.begin(K.escort); await say('Captain Ibbi-Adad', 'General Nabû-nāṣir! By Marduk, it is good to see you whole. The city has not seen you since the Carchemish victories.');
  const r = await UI.ask('How do you greet him?', ['“Captain. The western roads were long, and the dust is longer.”', '“Ibbi-Adad! Still thin as a spear-shaft.”', '“Lead on. I am tired.”']);
  if (r === 1) { await say('Captain Ibbi-Adad', 'Ha! Nabû-nāṣir never called me thin. He called me “the Reed”. But the years change a man.'); G.flags.escortSuspicious = true; } else await say('Captain Ibbi-Adad', 'You will be tired no longer, my lord. The Marshal prepares a feast in your honor.');
  await say('Captain Ibbi-Adad', 'Walk the market with me. The people wish to see their General.'); Talk.end(); K.escort.fig.pose({ salute: 0 });
  /* the captain walks with you */
  setObj('Follow Captain Ibbi-Adad into the market', 'Stay close. Say little.', { x: 0, z: 92 }); G.flags.escortNear = true; const esc = K.escort; esc.static = false; esc.d.static = true;
  Seq.run(dt => { if (G.flags.escortGone) return true; const d = Math.hypot(P.x - esc.x, P.z - esc.z); if (G.mode !== 'cine') { if (d > 4.5) { const dx = P.x - esc.x, dz = P.z - esc.z, s = Math.min(d - 3, 3.6 * dt); esc.x += dx / d * s; esc.z += dz / d * s; esc.fa = Math.atan2(dz, dx); esc.scriptMove = true; esc.speed = 3.2; esc.fig.root.position.x = esc.x; esc.fig.root.position.z = esc.z; } } return false; });
  await waitFor(() => P.z < 100);
  Talk.begin(K.escort); await say('Captain Ibbi-Adad', 'I must report your arrival to the Marshal. Walk the market, my lord. Let them look at you.'); await say('Captain Ibbi-Adad', 'Meet me at the Marduk Gate, north along the Processional Way, when the evening bell rings.'); Talk.end(); G.flags.escortGone = true; G.flags.escortNear = false;
  walkTo(K.escort, 0, -40, 3.6); startChapter('market', true);
}

/* ---------------------------------------------------------- III · THE MARKET OF MARDUK */
async function chMarket() {
  const L = ensureLevel('city'), K = L.key; switchLevel('city', 'market'); teleportPlayer(0, 108, 0); P.fig.root.visible = true; G.fp = false; G.fpAuto = true; Aud.setAmb({ crowd: .8, wind: .3, market: .6 }); K.escort.x = 0; K.escort.z = -40; K.escort.fig.root.position.set(0, 0, -40); G.flags.escortGone = true;
  K.herbalist.talk = herbalistTalk; K.merchantBeer.talk = beerTalk; K.scribeMk.talk = async n => { Talk.begin(n); await say('Scribe', 'Letters written, tablets read, prayers sealed in clay. Does my lord need a scribe?'); await say('Scribe', 'They say the Inspector Sîn-leqi is back in the capital. Be careful what you have written, my lord.'); G.flags.heardInspector = true; Talk.end(); };
  setObj('Find your contact in the market', 'Zer-Bāni the herbalist keeps a stall near the western potters. Listen to the crowd as you go.', K.herbalist.d ? { x: K.herbalist.x, z: K.herbalist.z } : null);
  await waitFor(() => G.flags.contactDone);
  setObj('Meet Captain Ibbi-Adad at the Marduk Gate', 'Follow the Processional Way north, beneath the lions, and through the Marduk Gate.', { x: 0, z: -58 }); P.clearance = Math.max(P.clearance, 1);
  await waitFor(() => P.z < -50);
  await cinematic(async () => {
    G.vmScripted = false;
    await Cine.shot({ from: [-24, 3, -48], to: [-4, 12, -66], look: [0, 20, -160], lookTo: [0, 34, -190], dur: 6.5, fov: [76, 58], cap: 'The sacred precinct. The Esagila, and above it the Etemenanki, the tower whose summit touches heaven.' });
    await Cine.shot({ from: [0, 3, -60], to: [0, 5, -100], look: [0, 40, -250], dur: 5, cap: 'Seven tiers. Thousands of pilgrims on the stairs like ants on a honey-cake.' });
  });
  const dx = K.escort; teleportPlayer(P.x, P.z, 0); walkTo(K.escort, P.x + 2, P.z - 4, 3.4); await sleep(1.8);
  Talk.begin(K.escort); await say('Captain Ibbi-Adad', 'Here I leave you, General. The Chamberlain Kabti will take you inside; the Marshal waits above.'); await say('Captain Ibbi-Adad', 'One thing, my lord. Be careful of the Inspector. He asked me three times today whether you scarred your left hand.');
  G.flags.warnedHand = true; await thought('He asks about the left hand. I know why.'); Talk.end(); K.escort.fig.pose({ salute: 1 }); await sleep(1.4); walkTo(K.escort, 24, -60, 3.2);
  setObj('Enter the Esagila', 'Chamberlain Kabti waits at the temple doors.', { x: 0, z: -146, y: 6 }); G.enterTemple = () => { startChapter('temple', true); };
}
async function herbalistTalk(n) {
  if (G.flags.contactDone) { Talk.begin(n); await say('Zer-Bāni', 'Go with the gods, my lord. And keep your hands steady.'); Talk.end(); return; }
  Talk.begin(n); await say('Zer-Bāni', 'Henbane, nightshade, poppy milk… what does my lord need?'); await say('Zer-Bāni', 'A hot day for the road. Tell me, my lord, what is the weather in Susa?');
  let tries = 0, ok = false;
  while (tries < 2 && !ok) { const opts = shuffle([{ t: '“The barley is ripe.”', ok: true }, { t: '“Rain, I think. Cold rain.”' }, { t: '“I have never been to Susa.”' }]); const k = await UI.ask('She waits, hands in the herbs.', opts); if (opts[k].ok) ok = true; else { tries++; await say('Zer-Bāni', tries < 2 ? 'No. Think again, my lord, and quietly.' : 'Wrong again. Perhaps a little gold will refresh your memory.'); } }
  if (!ok) { const k = await UI.ask('She names a price.', [P.gold >= 20 ? 'Pay her 20 gold' : '(You cannot afford it)', 'Threaten her']); if (k === 0 && P.gold >= 20) { P.gold -= 20; Aud.sfx('coin'); ok = true; await say('Zer-Bāni', 'Gold speaks Susian well. Come, my lord.'); } else { await say('Zer-Bāni', 'Get out of my stall! Guards!'); G.flags.contactFail = true; UI.toast('She will not help you now. Find another way.', 3000); Talk.end(); return; } }
  else await say('Zer-Bāni', 'Then you are the one we were told of. Welcome to Babylon, whoever you are.');
  await say('Zer-Bāni', 'Take this. The Seal of the Esagila, from our man among the temple scribes. It opens the doors a General may open.'); G.items.seal = true; P.clearance = 1; Aud.sfx('card'); UI.toast(`<img src="${ART.iconURL('tablet')}"> <b>Seal of the Esagila</b> acquired. Guards will let you through the temple’s lower doors.`, 5200, 'gold');
  await say('Zer-Bāni', 'And listen. The Inspector arrived this morning. He will test you on the General’s life. Your story must be perfect.'); P.ammo.bow = Math.min(30, P.ammo.bow + 6); P.hp = P.maxhp; UI.toast('She presses six arrows and a poultice into your hands.', 3200);
  G.flags.contactDone = true; addXP(60); Talk.end();
}
async function beerTalk(n) {
  Talk.begin(n); await say('Merchant', 'Date-beer, my lord! Brewed with the best Dilmun dates. The Marshal drinks nothing else.');
  const k = await UI.ask('Buy a jar of date-beer? (12 gold)', [G.items.gift ? '(You already have a gift)' : P.gold >= 12 ? 'Buy it as a gift' : '(Not enough gold)', 'Not today']);
  if (k === 0 && !G.items.gift && P.gold >= 12) { P.gold -= 12; G.items.gift = true; Aud.sfx('coin'); await say('Merchant', 'A fine choice, my lord. He will weep for joy.'); UI.toast('A gift for the Marshal. He loves date-beer.', 3000, 'gold'); }
  Talk.end();
}

/* ---------------------------------------------------------- IV · THE HOUSE WHOSE HEAD IS LOFTY */
async function chTemple() {
  const L = ensureLevel('temple0'), K = L.key; switchLevel('temple0', 'main'); G.fpAuto = true; G.fp = true; P.fig.root.visible = false; Aud.setAmb({ chant: .85, wind: .1 }); G.mode = 'play'; G.flags.t0 = G.time; G.flags.inspectorDone = false; K.kabti.d.static = true;
  await cinematic(async () => {
    await Cine.shot({ from: [0, 1.7, 39], to: [0, 3.2, 28], look: [0, 6, -20], lookTo: [0, 9, -34], dur: 6, fov: [84, 62], sfx: 'gong', cap: 'ESAGILA. Torches gutter below the gaze of Marduk; priests sing in the dark.' });
    await Cine.shot({ from: [0, 14, 10], to: [0, 9, -6], look: [0, 3, -34], dur: 4.5, cap: 'A light-shaft from the oculus falls on the altar. Even a spy feels small here.' });
  });
  Talk.begin(K.kabti); await say('Chamberlain Kabti', 'General Nabû-nāṣir! Marduk be praised, you have come safely from the west.'); await say('Chamberlain Kabti', 'The Marshal receives you in his wing, three floors above. But the evening bell has not yet rung.');
  await say('Chamberlain Kabti', 'The Inspector Sîn-leqi has asked to speak with you in the Scriptorium. A formality, I assure you.'); const q = await UI.ask('The Chamberlain waits.', ['“I will see the Inspector at once.”', '“I would rather rest first.”']);
  if (q === 1) await say('Chamberlain Kabti', 'As you wish. I will tell him you are resting. He is… persistent.'); Talk.end(); G.fp = true;
  setObj('Reach the Marshal’s wing, the third floor', 'Take the east stair to the Scriptorium. Mind the guards; your seal opens the lower doors.', wingTarget);
  inspectorWatch();
  await waitFor(() => G.flags.inWing);
}
async function inspectorWatch() {
  await waitFor(() => (G.level.id === 'temple1' && P.x < 26 && G.mode === 'play') || (G.level.id === 'temple0' && G.time - G.flags.t0 > 140 && G.mode === 'play'));
  if (G.flags.inspectorDone) return; G.flags.inspectorDone = true; const L = G.level, inTemple1 = L.id === 'temple1', sp = inTemple1 ? L.key.inspectorSpawn : [0, 8];
  const ins = civ(L, 'inspector', sp[0], sp[1], { name: 'Inspector Sîn-leqi', static: true, f: PI, hold: 'scroll', lookAtPlayer: true }); ins.d.noTalk = true;
  await cinematic(async () => {
    const [px, pz] = [P.x, P.z]; Aud.setAmb({ dread: .3, chant: .3 }); Aud.sfx('scare');
    await Cine.shot({ from: [px + 8, 2, pz + 8], to: [px + 3, 1.7, pz + 3], look: pos2(ins, 1.6), dur: 3, fov: [70, 50], cap: 'A thin man in dark robes has been watching you since you arrived.' });
    await walkTo(ins, P.x + (ins.x > P.x ? 3 : -3), P.z, 1.8, .4); faceNpc(ins, P.x, P.z);
  });
  Talk.begin(ins); await say('Inspector Sîn-leqi', 'General Nabû-nāṣir. At last. I have read every report from the western campaign, and never once did the reports mention your face.');
  await say('Inspector Sîn-leqi', 'Forgive an old man’s curiosity. A few questions, for the archive, if you please.');
  const qs = [{ q: 'Where were you wounded at Carchemish, General?', o: ['The left hand.', 'The right shoulder.', 'I was never wounded.'], c: 0 }, { q: 'And where were you born? I like to know my countrymen.', o: ['Borsippa, a scribe’s son.', 'Babylon, a captain’s son.', 'Uruk, a potter’s son.'], c: 0 }, { q: 'The king honored you himself. At which festival?', o: ['The Akītu, the New Year.', 'The harvest feast of Ishtar.', 'I do not recall.'], c: 0 }];
  let right = 0; for (const [i, Q] of qs.entries()) { await say('Inspector Sîn-leqi', Q.q); const opts = shuffle(Q.o.map((t, j) => ({ t, ok: j === Q.c }))); const k = await UI.ask('You feel the heat of a hundred torches.', opts.map(o => '“' + o.t + '”')); const saved = !opts[k].ok && Math.random() < .12 * P.skills[1]; if (opts[k].ok || saved) { right++; await say('Inspector Sîn-leqi', i < 2 ? 'Hm.' : 'Hm. Hm.'); } else await say('Inspector Sîn-leqi', 'Interesting.'); }
  const need = G.flags.nervous ? 3 : 2;
  if (right >= need) { await say('Inspector Sîn-leqi', 'Forgive an old man’s suspicion, General. A man like me sees spies in every shadow. Take this tablet. It will open the Marshal’s door.'); G.items.invitation = true; P.clearance = 2; G.flags.invited = true; Aud.sfx('card'); UI.toast(`<img src="${ART.iconURL('tablet')}"> <b>Invitation tablet</b> from the Inspector. The Marshal’s wing is open to you.`, 5200, 'gold'); addXP(100); setObj('Reach the Marshal’s wing, the third floor', 'The wing stair is in the west of the Scriptorium.', wingTarget); Talk.end(); ins.static = true; walkTo(ins, ins.x + 10, ins.z, 1.6); }
  else { await say('Inspector Sîn-leqi', 'Strange. The General I have read about would know these things as he knows his own hands. Guards. Seize this man.'); Talk.end(); G.flags.testFailed = true; blowCover(ins); }
}
function blowCover(ins) {
  const L = G.level; UI.flash('alarmflash', 3200); Aud.sfx('alarm'); G.alert = 2; for (const a of L.actors) if (a.role === 'guard' && !a.dead) a.makeHostile('inspector'); setObj('ESCAPE the garrison', 'The cellars beneath the Great Hall may hide you. Lose them, then find another way up.', wingTarget); G.flags.pantryHint = true;
  if (ins) walkTo(ins, ins.x + 14, ins.z, 3);
}
async function cisternHaunt() {
  const L = G.level, K = L.key; setObj('Find a way up beneath the Marshal’s wing', 'Follow the plank-walks through the dark water. Something is moving in here.', wingTarget); Aud.setAmb({ wind: .3, dread: .8 }); Aud.music = .05; G.alert = Math.min(G.alert, 1);
  await sleep(4); UI.sub('…you should not be here…', 2600); Aud.sfx('whisper'); await sleep(5); Aud.sfx('creak'); L.pl.forEach(p => { p.intensity *= .3; });
  const shadeAt = [[-24, 28], [-8, 12], [8, -4], [18, -24]];
  for (const [sx, sz] of shadeAt) {
    await waitFor(() => G.level.id === 'cistern' && Math.hypot(P.x - sx, P.z - sz) < 24 && Math.hypot(P.x - sx, P.z - sz) > 10); if (G.level.id !== 'cistern') return;
    const sh = civ(L, 'shade', sx, sz, { name: 'Shade', static: true, f: 0, noTalk: true }); sh.d.noTalk = true; sh.fig.baseTint.setRGB(.4, .4, .4); Aud.sfx('scare'); UI.sub('Something stands on the walkway.', 2000); let seen = 0;
    await Seq.until(() => { if (G.level.id !== 'cistern') return true; sh.fa = Math.atan2(P.z - sh.z, P.x - sh.x); const dx = sh.x - P.x, dz = sh.z - P.z, d = Math.hypot(dx, dz) || 1, fx = -Math.sin(Cam.yaw), fz = -Math.cos(Cam.yaw), dot = (dx * fx + dz * fz) / d; if (dot > .9) seen += .016 * 3; else seen = Math.max(0, seen - .01); return seen > 1.2 || d < 4; });
    Aud.sfx('scare'); G.shake = .5; P.san = Math.max(0, P.san - 8); UI.flash('hurtflash', 300); sh.fig.shatter(0, 1, 'fold'); const i = L.actors.indexOf(sh); if (i >= 0) L.actors.splice(i, 1); await sleep(2);
  }
}

function wingTarget() {
  const id = G.level.id, fail = G.flags.testFailed;
  if (id === 'temple0') return fail ? { x: -40, z: -6, y: 3 } : { x: 40, z: -6, y: 3 };
  if (id === 'temple1') return fail ? { x: 39.5, z: 0, y: 3 } : { x: -39.5, z: 20, y: 3 };
  if (id === 'cistern') return { x: 20, z: -44, y: 3 };
  if (id === 'temple2') return G.flags.secOk || G.flags.invited && G.flags.secDone ? { x: 0, z: -4.2, y: 3 } : { x: 0, z: 10, y: 3 };
  return null;
}
/* entering and leaving the temple from the city */
G.exitTemple = () => { G.goLevel('city', 'templeDoor', ''); };
G.onEnterLevel = (id) => { if (id === 'cistern') cisternHaunt(); if (id === 'temple2') { G.flags.inWing = true; if (G.chapter === 'temple') secretaryScene(); } };
async function secretaryScene() {
  const L = G.level, K = L.key, s = K.secretary; if (G.flags.secDone) return; G.flags.secDone = true; await waitFor(() => Math.hypot(P.x - s.x, P.z - s.z) < 6 && G.mode === 'play');
  Talk.begin(s); if (G.flags.invited) { await say('Secretary Aḫat-abūša', 'The Inspector’s tablet. General, forgive the delay. The Marshal is waiting. Please.'); G.flags.secOk = true; } else { await say('Secretary Aḫat-abūša', 'The Marshal’s wing is closed this evening. Who sent you up unannounced?'); const k = await UI.ask('She holds the key on a cord at her neck.', ['Show the Esagila seal', '“I am the General Nabû-nāṣir. He expects me.”', '(Draw the knife.)']); if (k === 0 && G.items.seal) { await say('Secretary Aḫat-abūša', 'The seal… forgive me. Go in, my lord.'); G.flags.secOk = true; } else if (k === 1 && Math.random() < .5 + .1 * P.skills[1]) { await say('Secretary Aḫat-abūša', 'The General? Nabû-nāṣir? Oh… yes. Please, my lord.'); G.flags.secOk = true; } else { await say('Secretary Aḫat-abūša', 'Guards!'); Talk.end(); for (const g of K.wingGuards) g.makeHostile('secretary'); return; } }
  Talk.end(); setObj('Enter the Marshal’s office', 'He waits through the door to the north.', { x: 0, z: -4.2, y: 2.4 });
}
G.enterOffice = () => { if (G.flags.inOffice) return; G.flags.inOffice = true; startChapter('banquet', true); };

/* ---------------------------------------------------------- V · THE MARSHAL'S TABLE */
async function chBanquet() {
  const L = ensureLevel('office'), K = L.key; switchLevel('office', 'main'); G.fp = true; G.fpAuto = false; P.fig.root.visible = false; teleportPlayer(0, 6, 0); G.mode = 'cine'; Cine.begin(); G.vmScripted = true; VM.items(null, null); VM.state.pose = 'idle'; VM.state.on = true; Aud.setAmb({ wind: .1, dread: .1 });
  const gen = K.general, srv = K.servant; let susp = G.flags.invited ? 0 : 2; gen.fig.pose({ sit: 1 }); const cupG = cupMesh(L, K.cupG[0], K.cupG[1], K.cupG[2]), cupP = cupMesh(L, K.cupP[0], K.cupP[1], K.cupP[2]); cupG.visible = cupP.visible = false;
  const pov = o => holdPov(Object.assign({ pos: [0, 1.62, 6], yaw: 0, pitch: -.04, free: true, sway: .01 }, o));
  await Cine.shot({ pos: [0, 1.62, 7.4], posTo: [0, 1.62, 5.2], yaw: 0, pitch: -.02, dur: 4.5, free: true, sway: .014, cap: 'The Marshal’s office. A feast laid out, and a man who will be dead by dawn.' }); pov({ pos: [0, 1.62, 5.2] });
  gen.fig.pose({ sit: 0 }); gen.fig.root.position.y = 0; await walkTo(gen, 0, -1.6, 1.6); gen.fig.facing = -1; gen.fig.pose({ talk: 1 });
  if (!G.flags.invited) { await say('Rimut-Marduk', 'Who let you in? Guards!', {}); } else await say('Rimut-Marduk', 'Nabû-nāṣir! My old friend. Five years, and the western sun has made you thin as a spear!');
  const o1 = await UI.ask('His arms open wide.', ['“And the capital has made you fat, Marshal.”', '“It is an honor, Marshal.”', '“The west has no good beer. Pour me something.”']);
  if (o1 === 0) { await say('Rimut-Marduk', 'Ha! Yes. Fat on the king’s grain!'); } else if (o1 === 1) { await say('Rimut-Marduk', 'So formal! You never were formal before the war.'); susp += .5; } else { await say('Rimut-Marduk', 'Beer, he says! The same Nabû-nāṣir, thirsty as a camel. Servant!'); }
  if (G.items.gift) { G.flags.giftGiven = true; await say('Rimut-Marduk', 'Dilmun date-beer?! You remembered! Oh, you are forgiven everything.'); susp -= .5; }
  await say('Rimut-Marduk', 'Leave us. A friend and I have things to say.'); const gs = [K.g1, K.g2]; await Promise.all(gs.map((g, i) => walkTo(g, i ? 3 : -3, 6.9, 2.2))); gs.forEach(g => { g.fig.root.visible = false; g.dead = true; const k = L.actors.indexOf(g); if (k >= 0) L.actors.splice(k, 1); }); Aud.sfx('door');
  await walkTo(gen, 0, -4.6, 1.4); gen.fig.pose({ sit: 1, talk: 1 }); gen.fig.root.position.y = 0; pov({ pos: [0, 1.28, 3.2], yaw: 0, pitch: -.1 }); await sleep(.8);
  cupG.visible = cupP.visible = true; Aud.sfx('pour'); srv.fig.pose({ drink: 0 }); await walkTo(srv, 1.6, -5.8, 1.6); await sleep(1.4); Aud.sfx('pour'); await sleep(1.2);
  await say('Rimut-Marduk', 'Date-wine from my own cellars. A toast: to the king!'); VM.items('cup', null); VM.state.pose = 'cup'; await sleep(.6); Aud.sfx('clink'); cupP.visible = false; await sleep(.8); Aud.sfx('sip'); await sleep(.8); cupP.visible = true; VM.items(null, null); VM.state.pose = 'idle';
  /* conversation: three questions about the western war */
  const talkRound = async (qq, opts, correct, wrong) => { await say('Rimut-Marduk', qq); const o = shuffle(opts.map((t, i) => ({ t, ok: i === correct }))); const k = await UI.ask('He studies you over the rim of the cup.', o.map(x => '“' + x.t + '”')); if (o[k].ok) await say('Rimut-Marduk', 'Hah! Exactly as I remember.'); else { susp += 1; await say('Rimut-Marduk', wrong); } };
  await talkRound('Tell me of Carchemish, my friend. Where did the arrow find you?', ['It found my left hand.', 'It found my right shoulder.', 'It missed me entirely.'], 0, 'Hm? I could have sworn… no matter.');
  /* poison window #1: a messenger interrupts */
  await say('_', 'A knock at the door. A messenger bursts in with sealed tablets for the Marshal.', { akk: '…' }); Aud.sfx('door'); gen.fig.facing = 1; await sleep(.5);
  const win1 = Seq.t + 5.5; setObj('Poison the Marshal’s cup', 'He is reading. Hold E to pour three drops. Release if he looks up.', null); VM.items('vial', null); VM.state.pose = 'pour'; UI.sub('He looks away. NOW.', 2000);
  let poured = await UI.qte.hold('KeyE', 1.7, 'Pour the poison (hold E)', () => Seq.t > win1); if (poured) { G.flags.poisoned = true; Aud.sfx('pour'); UI.toast(`<img src="${ART.iconURL('vial')}"> <b>Three drops.</b> Colorless, odorless… almost.`, 3000, 'gold'); addXP(80); } else { susp += 1; UI.sub('He glanced up. You jerk your hand away.', 2200); }
  VM.items(null, null); VM.state.pose = 'idle'; gen.fig.facing = -1; await sleep(.8); await say('Rimut-Marduk', 'Pardon me. The king’s business never sleeps.');
  if (!poured) { await say('Rimut-Marduk', 'Here, my friend. Your cup is empty. Another toast!'); await sleep(.6); pov({ pos: [0, 1.28, 3.2] }); const win2 = Seq.t + 3.5; Aud.sfx('door'); await say('_', 'A servant drops a tray by the door. The Marshal turns to scold him.', { akk: '…' }); setObj('Poison the Marshal’s cup', 'Second chance. Hold E.', null); VM.items('vial', null); VM.state.pose = 'pour'; poured = await UI.qte.hold('KeyE', 1.5, 'Pour the poison (hold E)', () => Seq.t > win2); if (poured) { G.flags.poisoned = true; Aud.sfx('pour'); addXP(60); } else susp += 1; VM.items(null, null); VM.state.pose = 'idle'; }
  await talkRound('The Inspector writes to me that the General has changed. What do you say to that?', ['War changes every man. I am no exception.', 'The Inspector sees spies in his soup.', 'I have not changed. Have you?'], 0, 'A careless answer, my friend. A careless answer.');
  /* the toast */
  await say('Rimut-Marduk', 'Come. Drink with me. To old friends, and the road we walked!'); VM.items('cup', null); VM.state.pose = 'cup'; await sleep(.7); Aud.sfx('clink'); gen.fig.pose({ drink: 1 }); await sleep(.8); Aud.sfx('sip'); await sleep(.9); gen.fig.pose({ drink: 0 }); VM.items(null, null); VM.state.pose = 'idle';
  Aud.setAmb({ wind: .1, dread: .6 }); if (G.flags.poisoned) { await say('Rimut-Marduk', 'Hm. A touch bitter, this year’s wine. Is it bitter to you?'); await sleep(.4); gen.fig.pose({ talk: 1 }); gen.fig.baseTint.setRGB(.9, .85, .8); await say('Rimut-Marduk', 'Strange… the room is… warm. Nabû-nāṣir.'); } else await say('Rimut-Marduk', 'One more thing, my friend.');
  await sleep(.6); await say('Rimut-Marduk', 'Show me your left hand. The one the arrow found at Carchemish.'); Aud.sfx('scare'); const showOpts = ['Hold out the hand.', 'Move it under the table.', 'Strike first.']; await UI.ask('The lamp flames lean toward you.', showOpts); await sleep(.4);
  await say('Rimut-Marduk', 'There is no scar. Nabû-nāṣir… who… are you?'); gen.fig.pose({ sit: 0 }); gen.fig.root.position.y = 0; Aud.sfx('thump'); G.shake = .6;
  /* the grab: he comes round the table and seizes your throat */
  await walkTo(gen, 0, .6, 3.2); gen.fig.pose({ choke: 1, lunge: 1 }); VM.state.pose = 'struggle'; Aud.sfx('choke'); UI.flash('hurtflash', 800);
  holdPov({ pos: [0, 1.5, 3.2], posTo: [0, 1.2, 3.2], yaw: 0, yawTo: 0, pitch: .0, pitchTo: .35, dur: 2, shake: .05, free: false });
  const need = Math.round(14 + susp * 3 - (G.flags.poisoned ? 6 : 0)), dur = 8 + (G.flags.poisoned ? 2 : 0); $('insane').style.opacity = .6; Seq.skipping = false; Cine.skippable = false;
  const won = await UI.qte.mash('KeyE', need, dur, 2.8, 'BREAK HIS GRIP — mash E!'); Cine.skippable = true; $('insane').style.opacity = 0;
  if (!won) { Cine.end(); G.onPlayerDeath('the Marshal’s hands'); return; }
  /* lift him; the knife */
  gen.fig.pose({ choke: 0 }); VM.items(null, 'knife'); VM.state.pose = 'stab'; Aud.sfx('thump'); await Cine.shot({ from: [3.5, 1.7, 1.4], to: [2.6, 1.6, .3], look: [0, 1.4, .6], dur: 2.2, shake: .04, cap: 'You throw your weight forward. He is old. He is heavy. He is dying.' });
  await Cine.shot({ from: [-1.6, 1.4, 3.0], to: [-.9, 1.5, 2.0], look: [0, 1.5, .5], dur: 2.4, fov: [60, 44], sfx: 'choke' }); Aud.sfx('slash'); await sleep(.25);
  gen.dead = true; gen.hp = 0; G.flags.generalDead = true; gen.fig.shatter(0, -1, 'fold'); Aud.sfx('fold'); FX.paper(0, 1.2, .6, 10, 2); const gi = L.actors.indexOf(gen); if (gi >= 0) L.actors.splice(gi, 1);
  await Cine.shot({ from: [0, 3, 3.5], to: [0, 2.2, 2.4], look: [0, .4, .6], dur: 3, cap: 'Silence. The lamps burn on. Marduk, at least, was not watching.' }); VM.items(null, null); VM.state.pose = 'idle'; Aud.setAmb({ wind: .1 });
  await Cine.shot({ pos: [0, 1.4, 2.4], yaw: 0, pitch: -.3, dur: 2, free: false, cap: '' });
  Cine.end(); G.vmScripted = false; G.fp = true; G.fpAuto = true; teleportPlayer(0, 2.6, 0); G.mode = 'play'; P.san = Math.max(20, P.san - 20); lockPointer(); addXP(150);
  await thought('Forgive me, old friend.'); setObj('Find the Marshal’s war ledger', 'A wooden case of clay tablets. Search the desk-chest by the shelves.', { x: -3.6, z: -6.2, y: 2 });
  G.takeLedger = async () => { if (G.items.ledger) return; Talk.begin({ x: -3.6, z: -7, fig: P.fig, role: 'x', fa: 0, name: 'x' }); await sleep(.1); Talk.end(); G.items.ledger = true; Aud.sfx('card'); addXP(120); UI.toast(`<img src="${ART.iconURL('tablet')}"> <b>The war ledger.</b> Forty tablets, every Elamite spy in Babylon.`, 5200, 'gold'); await thought('Every name we have in this city. Written in his own hand.'); setObj('Get out through the window', 'The guards will find him soon. Climb out onto the ledge.', { x: 7, z: -1, y: 2 }); ledgerTimer(); };
}
async function ledgerTimer() { let t = 70; UI.sub('Someone is coming to check on the Marshal…', 2600); while (t > 0 && G.chapter === 'banquet' && !G.flags.leaving) { await sleep(5); t -= 5; if (t === 35) UI.sub('Footsteps in the antechamber.', 2200); if (G.flags.leaving) return; } if (G.flags.leaving || G.chapter !== 'banquet') return; const L = G.level; Aud.sfx('door'); UI.sub('"The Marshal! Guards!"', 2000); for (const [x, z] of [[-2, 6.4], [2, 6.4]]) { const g = shieldG(L, x, z, -PI / 2); g.makeHostile('body'); } }
G.startEscape = async () => {
  if (G.flags.leaving) return; G.flags.leaving = true; G.mode = 'cine'; Cine.begin(); G.vmScripted = true; VM.items(null, null); VM.state.pose = 'reach'; Aud.setAmb({ wind: .9, dread: .5 }); P.fig.root.visible = false;
  await Cine.shot({ pos: [6.4, 1.5, -1], yaw: -PI / 2, pitch: -.05, dur: 2.2, free: false, cap: 'Out of the window. Do not look down.' });
  switchLevel('roof', 'window'); P.fig.root.visible = false; Aud.setAmb({ wind: 1, dread: .5 });
  await Cine.shot({ pos: [-8, 30, 21], posTo: [-6, 30, 21], yaw: PI, pitch: -.15, pitchTo: -1.05, dur: 3.6, sway: .02, cap: 'Forty cubits above the street. A hundred thousand lamps below.' });
  VM.state.pose = 'hide'; let steps = 0, last = 'KeyA', t = 0, slip = false; UI.qte.show('Shuffle along the ledge: alternate A and D', 'A D'); Cine.skippable = false;
  holdPov({ pos: [-6, 30, 21], yaw: PI, pitch: -1.05, dur: 9999, sway: .03 });
  await Seq.run(dt => { t += dt; $('qteBar').style.width = (steps / 12 * 100) + '%'; const exp = last === 'KeyA' ? 'KeyD' : 'KeyA'; if (tap(exp)) { last = exp; steps++; t = 0; Aud.sfx('step'); G.shake = .04; if (Cine.s) { Cine.s._pos[0] += .6; Cine.s._posTo[0] = Cine.s._pos[0]; } } if (t > 3.2) { slip = true; return true; } return steps >= 12; });
  UI.qte.hide(); Cine.skippable = true; if (slip) { Cine.end(); G.vmScripted = false; G.onPlayerDeath('the fall'); return; }
  await Cine.shot({ pos: [1, 30, 21], yaw: PI, pitch: -1.05, pitchTo: .05, yawTo: 0, dur: 2.6, cap: 'The roof of the east terrace. Behind you, a bell begins to ring.' }); Aud.sfx('bell'); Cine.end(); G.vmScripted = false; startChapter('escape', true);
};

/* ---------------------------------------------------------- VI · FORTY CUBITS ABOVE THE STREET */
async function chEscape() {
  const L = ensureLevel('roof'), K = L.key; switchLevel('roof', 'window'); G.fp = false; G.fpAuto = false; P.fig.root.visible = true; Aud.setAmb({ wind: .8, crowd: .1 }); Aud.music = 1; G.mode = 'play'; P.hp = Math.max(P.hp, 60); G.flags.roofClear = false; G.alert = 2;
  setObj('Reach the river stairs to the north', 'The garrison is awake. Run, hide, shoot, whatever keeps you alive. Leap when you reach the end.', { x: 0, z: -164, y: 3 }); Aud.sfx('bell'); UI.sub('Bells ring across Babylon. The Marshal is dead.', 3200);
  await sleep(4); for (const a of L.actors) if (a.role === 'guard' && !a.dead) { a.makeHostile('bell'); }
  G.onKill = (n) => { if (n === K.captain) { G.flags.roofClear = true; UI.toast('The captain falls. The river stairs are open.', 3000); } };
  await waitFor(() => P.z < -156); G.flags.roofClear = true; UI.sub('The edge of the roof. The river waits below.', 3000);
}
G.finishEscape = async () => {
  G.mode = 'cine'; Cine.begin(); P.fig.root.visible = false; Aud.setAmb({ wind: 1, dread: .2 });
  await Cine.shot({ from: [0, 4, -150], to: [0, 3, -168], look: [0, 0, -178], dur: 2.2, cap: 'You do not look back.' });
  await Cine.shot({ pos: [0, 40, -170], posTo: [0, 1.5, -190], yaw: PI, pitch: -.3, pitchTo: -.9, dur: 3.4, shake: .03 }); Aud.sfx('thump'); UI.flash('whiteflash', 700);
  await sleep(.6); Cine.end(); G.mode = 'wipe'; UI.wipe('The Euphrates', 'Midnight', () => { switchLevel('dock', 'main'); teleportPlayer(0, 4, PI); P.fig.root.visible = false; }, () => { epilogue(); });
};
async function epilogue() {
  const L = G.levels.dock, K = L.key; G.mode = 'cine'; Cine.begin(); Aud.setAmb({ wind: .35 }); P.fig.root.visible = true; P.fig.place(P.x, P.z); teleportPlayer(0, -2.8, PI); P.fig.facing = 1;
  await Cine.shot({ from: [4, 1.2, 8], to: [1, 1.5, 3], look: [0, 1.2, -3], lookTo: [.6, 1.4, -3], dur: 5, cap: 'Cold water, hard hands, a boat the color of the river.' });
  await say('Ninsun', 'You are wet. You are alive. Do you have it?'); G.vmScripted = false; await say('Tabni', 'Every name. Every tablet.', { vol: .4 }); await say('Ninsun', 'And the Marshal?'); await say('Tabni', 'He asked me to show him a scar I never had.');
  await Cine.shot({ from: [-4, 2.2, -8], to: [-2, 3, -12], look: [0, 6, -80], lookTo: [0, 12, -140], dur: 6, fov: [64, 52], cap: 'Behind them, Babylon burns with torches: a city that will wake to a dead Marshal and an empty ledger-case.' });
  await say('Ninsun', 'They will look for a general. Let them look. Tabni of the Eyes does not exist.'); await sleep(1); Cine.end(); showEnd();
}
function showEnd() {
  G.mode = 'end'; unlockPointer(); document.body.classList.remove('aimon', 'playing'); const bonus = 300 + (G.kills ? 0 : 150) + (G.flags.poisoned ? 100 : 0); addXP(bonus, true); SAVE.done.all = true; saveGame();
  const ghost = !G.kills, poison = !!G.flags.poisoned, calm = !G.flags.testFailed;
  $('cardnum').textContent = 'No. ' + String(1 + Object.keys(SAVE.done).length).padStart(3, '0');
  $('endlines').innerHTML = `Chapters: 6 / 6 · Disguise kept: ${calm ? 'yes' : 'no'}<br>Guards felled: ${G.kills || 0} · Poison used: ${poison ? 'yes' : 'no'}<br>Ledger: <b>stolen</b> · Gold: ${P.gold}<br>XP earned: <b>+${G.xpRun}</b> · Rank ${rankOf(SAVE.xp)}`;
  $('medals').innerHTML = [['eye', 'Unseen', ghost], ['vial', 'Poisoner', poison], ['clover', 'Perfect cover', calm]].map(([i, n, g]) => `<div class="${g ? 'got' : ''}"><img src="${ART.iconURL(i, 96)}">${n}</div>`).join('');
  const c = $('cardart').getContext('2d'); c.clearRect(0, 0, 300, 300); c.strokeStyle = 'rgba(20,17,14,.2)'; c.lineWidth = 3; for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283; c.beginPath(); c.moveTo(150 + Math.cos(a) * 40, 150 + Math.sin(a) * 40); c.lineTo(150 + Math.cos(a) * 150, 150 + Math.sin(a) * 150); c.stroke(); }
  ART.ICONS.tablet(c, 150, 130, 80); ART.ICONS.eye(c, 150, 230, 38); $('end').classList.add('on'); Aud.sfx('win');
}
