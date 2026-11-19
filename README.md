# Federal Monkey Patrol

*(codename: Kong)*

**[Play it in your browser](https://davmlaw.github.io/federal-monkey-patrol/)**

A 3D game from 2004–2006. Giant apes are attacking the city. Harlow, a disgraced ex-army pilot who runs the forgotten Federal Monkey Patrol, takes the janitor's biplane and flies through a procedurally generated city to shoot monkeys and rescue blondes. Fly above the skyscrapers and shooting gets easier, but stay up there too long and The Giant Claw comes for you.

Design notes are in [game.txt](game.txt), and the author's TODO list is in [todo.html](todo.html).

It was written in C++ with OpenGL and SDL 1.2, and has been ported to the browser with [Three.js](https://threejs.org/). The first commit in the history is the 2002–2003 prototype, which used GLUT and ODE.

## What's in it

The browser version recreates what the 2006 version actually did, using the original models, textures, story scripts and missions in `data/`:

- **The story**: `data/federal_monkey_patrol.game` plays the film leader, the intro and the four story chapters, with the original transitions (fade, spin, star wipe, angled wipes). The missions were commented out of the story in 2006, because their win conditions (monkey kills, blonde rescues) couldn't be met yet.
- **Missions**, played on their own: the procedurally generated city, the biplane, bombs, the HUD (FPS, countdown timer) and the XML outcome system.
- **Two flying modes**, switched with a button: *follow* (pitch and turn, the chase camera from 2006) and *top-down* (level flight seen from above, sliding left and right like 1942). The design in `game.txt` switched modes by height; for now it's a button.
- **On-screen controls** for touch screens (or a mouse): a stick, a throttle lever, fire, mode switch and quit.
- **The tuner**: press Insert (or <kbd>`</kbd>) to tweak settings live.

Some things were written but switched off in 2006, and are still off: the Giant Claw meter and the skip key. Monkeys, blondes and collisions were never implemented. In 2006 the plane's forward speed was commented out, so it turned on the spot; the browser version adds a throttle (starting at 60%, the speed in that commented-out line), and the city scrolls with the plane as the C++ `PatchGrid` was written to.

### Game files

Pick one from the menu, or link to it with `?game=`:

| Link | What it plays |
|---|---|
| [`?game=data/federal_monkey_patrol.game`](https://davmlaw.github.io/federal-monkey-patrol/?game=data/federal_monkey_patrol.game) | The story (default) |
| [`?game=fly.game`](https://davmlaw.github.io/federal-monkey-patrol/?game=fly.game) | Mission `claw.xml` |
| [`?game=mission.game`](https://davmlaw.github.io/federal-monkey-patrol/?game=mission.game) | Mission `test.xml`, with a countdown |
| [`?game=fade_test.game`](https://davmlaw.github.io/federal-monkey-patrol/?game=fade_test.game) | Transition effects demo |

### Controls

| Key | Action |
|---|---|
| Arrow keys / stick | Follow mode: pitch and turn (up pitches the nose down, like a plane). Top-down mode: slide left/right, speed up/slow down |
| W / S (or + / −, PgUp / PgDn) | Throttle |
| Space / Enter | Fire forward |
| Ctrl | Drop bombs |
| M or Tab | Switch flying mode (follow / top-down) |
| Insert or <kbd>`</kbd> | Tuner |
| Esc | Quit |

A gamepad works too: left stick, A/B to fire, Y to switch mode, the triggers for throttle, and button 9 for the tuner.

On a touch screen the on-screen controls appear during missions: the stick bottom-left, and the throttle, mode button and FIRE on the right. The throttle stays where you leave it.

## Running locally

Needs Node.js 20 or later.

```sh
npm install
npm run dev       # http://localhost:5173
npm run build     # static site in dist/
```

Pushes to `main` are built and deployed to GitHub Pages by `.github/workflows/pages.yml`.

## The 2006 C++ version

The original source is in [`legacy/`](legacy/), and the tag [`v2006-native`](https://github.com/davmlaw/federal-monkey-patrol/releases/tag/v2006-native) has the repo as it was before the port. See [legacy/README.md](legacy/README.md) for building it (SDL 1.2, libxml2, VS2005 for Windows).

## Credits

- Dave Lawrence: code and design
- Sam Norman: art and design

The C++ version includes code adapted from Cube (sound, text drawing, MD2 loading), Slickworm (frustum culling), the MTX matrix library and the Mersenne Twister RNG. See [AUTHORS.txt](AUTHORS.txt).

## License

GPL v2. See [LICENSE.txt](LICENSE.txt).
