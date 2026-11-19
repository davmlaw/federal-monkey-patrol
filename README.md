# Federal Monkey Patrol

*(codename: Kong)*

**[Play it in your browser](https://davmlaw.github.io/federal-monkey-patrol/)**

A 3D game from 2004–2006. Giant apes are attacking the city. Harlow, a disgraced ex-army pilot who runs the forgotten Federal Monkey Patrol, takes the janitor's biplane and flies through a procedurally generated city to shoot monkeys and rescue blondes. Fly above the skyscrapers and shooting gets easier, but stay up there too long and The Giant Claw comes for you.

Design notes are in [game.txt](game.txt), and the author's TODO list is in [todo.html](todo.html).

It was written in C++ with OpenGL and SDL 1.2, and has been ported to the browser with [Three.js](https://threejs.org/). The first commit in the history is the 2002–2003 prototype, which used GLUT and ODE.

## What's in it

The browser version recreates what the 2006 version actually did, using the original models, textures, story scripts and missions in `data/`:

- **The story**: `data/federal_monkey_patrol.game` plays the film leader, the intro and the four story chapters, with the original transitions (fade, spin, star wipe, angled wipes). The missions were commented out of the story in 2006, because their win conditions (monkey kills, blonde rescues) couldn't be met yet.
- **Missions**, played on their own: the procedurally generated city, the biplane with its chase camera, bombs, the HUD (FPS, countdown timer) and the XML outcome system.
- **The tuner**: press Insert (or <kbd>`</kbd>) to tweak settings live.

Some things were written but switched off in 2006, so they're still off: top-down flight, the Giant Claw meter, the skip key. Monkeys, blondes and collisions were never implemented. In 2006 the plane's forward speed was also commented out, so in missions the plane turns and pitches on the spot above the city.

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
| Arrow keys | Pitch and turn (up pitches the nose down, like a plane) |
| Space / Enter | Fire forward |
| Ctrl | Drop bombs |
| Insert or <kbd>`</kbd> | Tuner |
| Esc | Quit |

A gamepad works too (stick, buttons 1, 2 and 9).

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
