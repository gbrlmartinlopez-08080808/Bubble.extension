/* ============================================================
   INK OF BABYLON — lang.js
   Characters speak a made-up Akkadian-flavoured tongue; English subtitles
   always accompany it. Real-ish words where it's easy, invented elsewhere.
   ============================================================ */
'use strict';
const LANG = (function () {
  const D = {
    peace: 'šulmu', lord: 'bēlu', lady: 'bēltu', king: 'šarru', general: 'rab ṣābi', marshal: 'rab ṣābi', temple: 'bītu', god: 'ilu', gods: 'ilāni', welcome: 'ṭābtu', friend: 'ibru', hello: 'šulmu', greetings: 'šulmu', yes: 'ūmma', no: 'lā', you: 'atta', your: 'ša kâta', i: 'anāku', my: 'ša yâti', we: 'nīnu', the: '', a: '', an: '', is: '', are: '', was: '', and: 'u', to: 'ana', in: 'ina', of: 'ša', with: 'itti', for: 'ana', from: 'ištu', not: 'lā', come: 'alka', go: 'alik', see: 'amur', look: 'amur', speak: 'qibi', listen: 'šime', water: 'mê', beer: 'šikaru', bread: 'akalu', barley: 'šeʾu', gold: 'ḫurāṣu', silver: 'kaspu', night: 'mūšu', day: 'ūmu', tonight: 'ina mūši', land: 'mātu', city: 'ālu', gate: 'abullu', road: 'ṭarṣu', guard: 'maṣṣaru', guards: 'maṣṣarī', soldier: 'ṣābu', tablet: 'ṭuppu', tablets: 'ṭuppī', scribe: 'ṭupšarru', blood: 'damu', death: 'mūtu', life: 'balāṭu', sun: 'šamšu', moon: 'sîn', star: 'kakkabu', heart: 'libbu', name: 'šumu', mother: 'ummu', father: 'abu', brother: 'aḫu', wine: 'karānu', today: 'ūmišam', hurry: 'ṣabit', quiet: 'šuqalmu', wait: 'zizzu', please: 'lū damqu', thank: 'ikrubu', thanks: 'ikrubu', have: 'išû', has: 'išû', will: 'ana', be: 'išû', there: 'šamma', here: 'kâm', what: 'mīnu', who: 'mannu', where: 'ayyiš', why: 'aššumi', how: 'kî', this: 'annû', that: 'ša', it: 'šū', he: 'šū', she: 'šī', they: 'šunu', all: 'kalu', every: 'kalu', old: 'šību', young: 'ṣeḫru', good: 'damqu', bad: 'lā ṭābu', very: 'mādiš', much: 'mādu', many: 'mādūtu', one: 'ištēn', two: 'šina', three: 'šalāš', river: 'nāru', boat: 'eleppu', rope: 'eblu', window: 'nappaḫu', door: 'daltu', key: 'nakkaptu', seal: 'kunukku', letter: 'egirtu', poison: 'imtu', drink: 'šiti', eat: 'akal', kill: 'dūk', die: 'mūt', live: 'balaṭ', truth: 'kittu', lie: 'sarrātu', secret: 'niṣirtu', war: 'tamḫāru', army: 'ummānu', bow: 'qaštu', arrow: 'ṣēṭu', sword: 'patru', spear: 'ṣīrītu', home: 'bītu', house: 'bītu', mercy: 'tazzimtu', honor: 'kabattu', fear: 'puluḫtu', pray: 'ikribu', prayer: 'ikribu', offer: 'nīqu', market: 'maḫīru', merchant: 'tamkāru', camel: 'ibilu', donkey: 'imēru', ox: 'alpu', sheep: 'immeru', grain: 'šeʾu', oil: 'šamnu', honey: 'dišpu', dates: 'suluppī', date: 'suluppu', men: 'awīlū', man: 'awīlu', woman: 'sinništu', child: 'ṣeḫru', children: 'ṣeḫrūtu', morning: 'ṣētu', evening: 'līlâtu', long: 'arku', live: 'balaṭ', rest: 'nāḫu', sleep: 'šuttu', dream: 'šuttu', fool: 'lā', help: 'ēzib', stop: 'izziz', halt: 'izziz', pass: 'ebir', enter: 'erub', leave: 'aṣi', up: 'elû', down: 'šaplû'
  };
  const NAMES = { babylon: 'Bābili', marduk: 'Marduk', ishtar: 'Ištar', elam: 'Elamtu', assyria: 'Aššur', nabu: 'Nabû', shamash: 'Šamaš', esagila: 'Esagila', euphrates: 'Purattu' };
  const SYL = ['ba', 'bi', 'bu', 'da', 'di', 'du', 'ga', 'gi', 'ha', 'hu', 'ka', 'ki', 'ku', 'la', 'li', 'lu', 'ma', 'mi', 'mu', 'na', 'ni', 'nu', 'pa', 'pi', 'ra', 'ri', 'ru', 'sa', 'si', 'ša', 'ši', 'šu', 'ta', 'ti', 'tu', 'za', 'zi', 'a', 'i', 'u'];
  const END = ['um', 'u', 'im', 'at', 'a', 'ti', 'ūtu', 'īšu', 'āni'];
  function pseudo(w) {
    let h = 5381; for (let i = 0; i < w.length; i++) h = ((h << 5) + h + w.charCodeAt(i)) | 0; h = Math.abs(h);
    const n = clampN(Math.ceil(w.length / 3.2), 1, 3); let out = ''; for (let k = 0; k < n; k++) { out += SYL[(h >> (k * 5)) % SYL.length]; h = (h * 7 + 13) | 0; h = Math.abs(h); }
    if (w.length > 4) out += END[h % END.length]; return out;
  }
  const clampN = (x, a, b) => Math.max(a, Math.min(b, x));
  function say(en) {
    const out = en.replace(/[A-Za-z'’-]+/g, (w, off) => {
      const lw = w.toLowerCase().replace(/['’]s$/, ''); if (NAMES[lw]) return NAMES[lw]; if (lw in D) return D[lw];
      if (/^[A-Z]/.test(w) && off > 0 && !/[.!?]\s*$/.test(en.slice(0, off))) return w; // proper noun stays
      return pseudo(lw);
    });
    return out.replace(/\s+/g, ' ').replace(/\s+([,.!?;:])/g, '$1').replace(/^\s+/, '').replace(/^./, c => c.toUpperCase());
  }
  return { say };
})();
const VOICES = {
  Ninsun: { pitch: 175, color: '#8a6a3a' }, Tabni: { pitch: 120, color: '#5a4630' }, Guard: { pitch: 105, color: '#6a5a40' }, 'Ibbi-Adad': { pitch: 124, color: '#8a5a2a' },
  'Zer-Bāni': { pitch: 150, color: '#5c6a3a' }, Kabti: { pitch: 102, color: '#2e5d85' }, 'Sîn-leqi': { pitch: 132, color: '#5a3a4a' }, 'Rimut-Marduk': { pitch: 86, color: '#8d3a2a' },
  Secretary: { pitch: 118, color: '#6a5a2a' }, Merchant: { pitch: 128, color: '#8a5a3a' }, Citizen: { pitch: 140, color: '#6a5a4a' }, Child: { pitch: 280, color: '#8a7a5a' }, Priest: { pitch: 96, color: '#4a5a6a' },
  Scribe: { pitch: 128, color: '#6a5a3a' }, Servant: { pitch: 146, color: '#7a6a4a' }, Captain: { pitch: 92, color: '#8d3a2a' }, Archer: { pitch: 112, color: '#6a5a40' }, Chamberlain: { pitch: 102, color: '#2e5d85' }, _: { pitch: 125, color: '#5a4630' }
};
