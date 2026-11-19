# Federal Monkey Patrol

*(codename: Kong)*

A 3D game from 2004–2006, written in C++ with OpenGL and SDL. Giant apes are attacking the city. Harlow, a disgraced ex-army pilot who runs the forgotten Federal Monkey Patrol, takes the janitor's biplane and flies through a procedurally generated city to shoot monkeys and rescue blondes. Fly above the skyscrapers and shooting gets easier, but stay up there too long and The Giant Claw comes for you.

Design notes are in [game.txt](game.txt), and the author's TODO list is in [todo.html](todo.html).

This is an archived hobby project and is no longer developed. The first commit in the history is the 2002–2003 prototype, which used GLUT and ODE.

## Building (Linux)

Dependencies: g++, OpenGL/GLU, SDL 1.2 (`sdl-config`), SDL_image, SDL_mixer and libxml2. On modern distros, sdl12-compat provides SDL 1.2.

```sh
make            # builds ./kongtest
./kongtest      # plays data/federal_monkey_patrol.game
./kongtest fly.game   # jumps straight into a mission
```

Run it from the repo root, because data paths are relative. Display settings are in `data/etc/display.properties`; `window.sh` and `fullscreen.sh` switch between presets.

## Building (Windows)

There's a Visual Studio 2005 project in `win32/Kong.sln`. You need to supply the SDL, SDL_image, SDL_mixer and libxml2 headers and libraries in `win32/include` and `win32/lib`.

## Credits

- Dave Lawrence: code and design
- Sam Norman: art and design

Includes code adapted from Cube (sound, text drawing, MD2 loading), Slickworm (frustum culling), the MTX matrix library and the Mersenne Twister RNG. See [AUTHORS.txt](AUTHORS.txt).

## License

GPL v2. See [LICENSE.txt](LICENSE.txt).
