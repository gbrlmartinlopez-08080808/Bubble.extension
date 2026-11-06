# Ink of Babylon

A paper-cut espionage battle-royale that runs entirely in the browser — no engine, no build step.
Flat **paper standees** (drawn procedurally with wobbly ink lines onto `<canvas>`) walk through a real **3D Babylon** rendered with Three.js.

> Babylon, A.D. 1187. A Crusader garrison has made camp among the glazed bricks of the Ishtar Gate.
> Under the ziggurat of the Esagila, three clay tablets still sleep. Seven operatives crossed the river for them. Only one will leave.

## Run it

Open `index.html` in a desktop browser (double-click works), or serve the folder:

```bash
cd games/ink-of-babylon && python3 -m http.server 8000   # then open http://localhost:8000
```

Three.js r128 is vendored in `lib/`, so it works offline. (Google Fonts are optional; it falls back to system serif/handwriting.)

## The mission (≈10 minutes)

1. **Reach the Esagila** along the Processional Way — through the Ishtar Gate (heavily guarded) or around the wall ends.
   Visit the **House of Beer** and ask Ur-Nanshe: she'll tell you about a hidden **water-carriers' door** into the temple cistern.
2. **Steal three tablets** inside the temple: *Enūma Eliš* (west archive), *Gilgamesh XI* (east archive). Taking both opens the sealed sanctum for *MUL.APIN*.
3. Lifting the last tablet **raises the alarm** — reinforcements and a **mounted captain** pour in. **Escape home alive.**
4. Meanwhile a **sandstorm** closes in on the city and the other operatives are being eliminated, battle-royale style.

Enterable places: your safehouse (bank gold, resupply, rest), the Scribe's House (shop, floor-plan), the tavern (drink, rumours), and the temple.

## Controls

| Key | Action |
| --- | --- |
| `W A S D` | move (relative to camera) |
| Mouse / arrow keys | look · aim |
| `Shift` | sprint (noisy) |
| `C` (hold) | sneak — halves how far guards see you |
| `LMB` | crossbow (quiet, aim-assisted) · `RMB` / `V` steady aim |
| `F` | dagger — **from behind an unaware guard = silent takedown** |
| `Q` | ink bomb — blinds guards in the cloud and draws them to the noise |
| `Space` | dodge roll (invulnerable) — dodge arrows and the captain's charge |
| `E` | enter · talk · steal · open |
| `Esc` / `Tab` | pause · `M` mute |

## Systems

- **Stats** (from the design sketch): HP, Sanity, skills *Combat / Luck / Observation*, Gold, XP.
  - **Sanity** drains in the storm and deep in the sanctum; low sanity brings whispers and a purple vignette; at 0 you bleed.
  - **Observation** widens your minimap, loot sense and shows guard vision cones. **Luck** improves loot, crits and stealth. **Combat** raises damage and reload.
  - **Gold** is only yours once it reaches *home* (carried gold is lost on death). **XP is permanent** (saved in `localStorage`); every Rank grants permanent starting skill.
  - Collectable **cards** (eye / clover / sun / sword) found in chests, the world and on fallen rivals give skill levels.
- **Stealth AI**: vision cones with line-of-sight, alert meter (`?` → `!`), noise from sprinting/shots/bombs, search & return states, shouting for help.
- **Rival operatives** (fox, rabbit, bird, dog) hunt you with crossbows; others are eliminated by the garrison and the storm as the counter ticks down.
- **Cinematics**: scripted camera flythroughs with typed captions, letterbox bars, ink-wipe transitions between places, camera shake. Press `Space` to skip.
- **Procedural audio**: wind, a Phrygian-dominant drone and plucks, frame-drum tension when you're hunted — all synthesized with WebAudio.

## Layout

```
index.html        page, HUD and paper-style CSS
js/art.js         all artwork: ink primitives, paper cut-outs, props, textures
js/engine.js      input, audio, collision, level builders, particles, camera, cinematics, UI
js/world.js       the open city, the interiors, the Esagila temple
js/actors.js      player, guards, rivals, projectiles, pickups, save data
js/main.js        flow, mission logic, sandstorm, camera, HUD, minimap, main loop
```
