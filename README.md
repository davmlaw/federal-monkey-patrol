# Federal Monkey Patrol

*(codename: Kong)*

**[Play it in your browser](https://davmlaw.github.io/federal-monkey-patrol/)**

A game started in 2004–2006 and finished for the web in 2026. Giant apes are attacking the city. Harlow, a disgraced ex-army pilot who runs the forgotten Federal Monkey Patrol, takes the janitor's biplane and flies through a procedurally generated 1930s New York to shoot kongs and rescue blondes.

The original was written in C++ with OpenGL and SDL 1.2. This version is TypeScript with [Three.js](https://threejs.org/), built with Vite and deployed to GitHub Pages. The design notes from 2006 are in [game.txt](game.txt), and the author's TODO list of the time is in [todo.html](todo.html).

## What's in it

- **The story** (`data/federal_monkey_patrol.game`): five missions with short flashback cutscenes between them, under an old-movie look.
  1. *Kill 3 Kongs*: three kongs in the patrol area.
  2. *Survive*: top-down, kongs on the roofs throwing bananas.
  3. *Save 3 Blondes*: kongs carry blondes up the skyscrapers; shoot the kong and catch her as she floats down.
  4. *Survive Again*: top-down with steering.
  5. *Save 3 Blondes, Lose None, Kill 5 Kongs*: everything at once, against the clock.
- **Free play**: the last mission with no goal or clock, and two top-down rooftop modes.
- **The city**: generated from a fixed seed, so it's always the same city; patches of it are built round the plane as it flies, with a simpler version of each building further away.
- **Kongs and blondes**: the 2006 models, rigged and animated procedurally (walking, climbing, chest-beating, falling).

### Game files

Pick one from the menu, or link to it with `?game=` (and `&mission=N` to start the story at its Nth mission):

| Link | What it plays |
|---|---|
| [`?game=data/federal_monkey_patrol.game`](https://davmlaw.github.io/federal-monkey-patrol/?game=data/federal_monkey_patrol.game) | The story (default) |
| [`?game=freeplay.game`](https://davmlaw.github.io/federal-monkey-patrol/?game=freeplay.game) | Free play: the story's last mission with no goal or clock |
| [`?game=rooftops.game`](https://davmlaw.github.io/federal-monkey-patrol/?game=rooftops.game) | Rooftops: top-down, 1942 controls |
| [`?game=rooftops_steer.game`](https://davmlaw.github.io/federal-monkey-patrol/?game=rooftops_steer.game) | Rooftops: top-down, steering |

### Controls

| Key | Action |
|---|---|
| Arrow keys / stick | Pitch and turn (up pitches the nose down, like a plane). Top-down missions: slide or steer left/right, up/down change speed |
| W / S (or + / −, PgUp / PgDn) | Throttle |
| Space / Enter | Fire; in the story, on to the next line |
| Esc | Pause |

A gamepad works too: left stick, A/B to fire, and the triggers for the throttle.

On a touch screen the on-screen controls appear during missions: the stick bottom-left, and the throttle and FIRE on the right. The throttle stays where you leave it.

## Running locally

Needs Node.js 20 or later.

```sh
npm install
npm run dev       # http://localhost:5173
npm run build     # type-checks, then builds the static site in dist/
```

Pushes to `main` are built and deployed to GitHub Pages by `.github/workflows/pages.yml`.

### Checking changes

There are no unit tests beyond the type check. The game is checked by running it in a headless browser:

```sh
npm run shoot -- 'gametest.html?scenario=blonde&catch=1'      # a scripted scenario, with pass/fail checks
npm run shoot -- 'gametest.html?scenario=perf&mission=freeplay.xml'   # frame times, draw calls, triangles
npm run shoot -- 'kongtest.html?sheet=walk&views=side,front'  # a contact sheet of an animation
```

`gametest.html` (`src/gametest.ts`) loads a mission without the menu and runs a scenario in game time; `kongtest.html` (`src/kongtest.ts`) is a viewer for the kong's and blonde's animations. See [CLAUDE.md](CLAUDE.md) for the details and the layout of the code.

## The 2006 C++ version

The original source is in [`legacy/`](legacy/), and the tag [`v2006-native`](https://github.com/davmlaw/federal-monkey-patrol/releases/tag/v2006-native) has the repo as it was before the port, including the original data files (the longer 2006 cutscenes, the Giant Claw art, textures and models) that the web version no longer uses. See [legacy/README.md](legacy/README.md) for building it (SDL 1.2, libxml2, VS2005 for Windows).

## Credits

- Dave Lawrence: code and design
- Sam Norman: art and design

The C++ version includes code adapted from Cube (sound, text drawing, MD2 loading), Slickworm (frustum culling), the MTX matrix library and the Mersenne Twister RNG. See [AUTHORS.txt](AUTHORS.txt).

## License

GPL v2. See [LICENSE.txt](LICENSE.txt).
