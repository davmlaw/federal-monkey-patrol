# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Federal Monkey Patrol" (codename Kong): a 2004–2006 game by Dave Lawrence (code) and Sam Norman (art), GPL v2. You fly a biplane over a procedurally generated city shooting monkeys; `game.txt` holds the design notes and `todo.html` the author's TODO/refactoring ideas.

The main version is now a browser port (Vite + Three.js, plain ES modules) deployed to GitHub Pages. The original C++ / OpenGL / SDL 1.2 code is in `legacy/` as a reference (tag `v2006-native` has the pre-port tree). Milestone 1 (issue #1) is a faithful recreation of what the 2006 build actually did: no new gameplay. Things that were switched off or never implemented in 2006 (Giant Claw meter, skip key, monkeys, blondes, collision) stay off until later milestones. Since milestone 1, the user has asked for some additions: a throttle (the plane had no forward velocity in 2006), a button to switch between follow and top-down flying, and on-screen touch controls.

## Build & run

- `npm install`, then `npm run dev` (Vite dev server) or `npm run build` (static site in `dist/`).
- The game fetches its original data files at runtime, with paths relative to the site root (the repo root): `data/`, and the `*.game` files at the root. The build copies them into `dist/` as-is (see `vite.config.js`); they don't go through Vite's asset pipeline.
- `?game=<path>` picks the `.game` file (default: `default_game` in `data/etc/main.properties`). The page always starts at a menu, because browsers need a click before audio can play.
- Deploy: `.github/workflows/pages.yml` builds and deploys to Pages on every push to `main`.
- There are no tests. Check changes by running the game; a headless browser needs WebGL (e.g. Chromium with `--use-angle=swiftshader`).

## Architecture (`src/`)

Each JS module names the C++ file it ports; read the C++ in `legacy/src/` when behaviour is in doubt.

- `main.js`: menu, then the main loop: `inputmanager.update(); display.beginFrame(); game.play(display, msecs, input)` until status is `QUIT`.
- `core/`: `display.js` (renderer, 4:3 letterboxed view, offscreen targets), `draw2d.js` (immediate-mode 2D batcher in the original's ortho space of 1.0 x 0.75, plus `Drawable2D`/`Quad`/`Image`/`Container2D`/`Text2D` with the original bitmap font metrics, `WordList2D`), `assets.js` (text, textures, OBJ models, Web Audio), `settings.js` (`data/etc/*.properties`), `input.js` (keyboard/gamepad into an `Input` struct with buttons, axis and a persistent `throttle`; `InputFilter`/`MenuFilter`), `touch.js` (on-screen stick/throttle/fire/mode/quit, another InputManager device; shown by `main.js` only while a mission is flying), `mtrand.js` (exact Mersenne Twister port, so seeds match the C++).
- `game/`: `component.js` (`GameComponent` with status `PLAYING`/`NEXT`/`LOST`/`QUIT`; async `load()`, `play()` draws nothing until loaded), `manager.js` (`GameManager` + `.game` file reader), `simple.js` (Blank, Picture, SoundTrack), `storyteller.js` (`.shot` cutscenes), `transition.js` (fade, spin, starwipe, `hwipe`/`vwipe`/`NNwipe`; wipes render the next component offscreen and draw the mask with it).
- `mission/`: `mission.js` (Mission + MissionBuilder from `data/missions/*.xml` via `DOMParser`), `outcomes.js` (Scenario/Condition/Result, Constraints), `stats.js` (global `gamestats`), `world.js` (World scene, Entity/Plane/Projectile, FollowPlaneFilter and TopDownPlaneFilter, Player with its two modes, CameraMan/SmoothCamera blending between the follow and top-down views), `city.js` (`CityGrid`: 8x8 patches of 8x8 blocks kept centred on the camera, generated with `MTRand(42)` and merged into per-patch meshes; new patches are generated one per frame as the plane flies), `hud.js` (FogPlane, CountDownTimer, ClawAlert, FPS readout, LoadBar).
- `tuner.js`: lil-gui built from `data/etc/toggles.xml`; Insert or backquote toggles it and pauses the current component.

Conventions kept from the C++ on purpose: textures use `flipY = false` so texcoord v=0 is the top of the image (as SDL uploaded it), and `Picture`/`Blank` default to status `NEXT`, so they show for one frame unless a transition is drawing them. Some 2006 bugs are kept and commented where they matter (e.g. the constraint keys in `mission.js`).

## Game data (`data/`)

- `.game` files: one component per line: `storyteller <file.shot>`, `mission <file.xml>`, `blank <hexcolor>`, `picture <img> [msecs] [hexcolor]`, `music <file>`, and `transition <type> <msecs>`, which links the previous and next components. `#` comments.
- `etc/`: config (`display`, `story`, `physics`, `game`, `main`, `tuner`, `city` properties; `toggles.xml`; `projectiles/`), `missions/` XML, `story/` `.shot` scripts and images, `models/` (`.obj`), `images/`, `sound/`.
