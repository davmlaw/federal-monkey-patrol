# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Federal Monkey Patrol" (codename Kong) — a 2004–2006 C++ / OpenGL / SDL 1.2 game by Dave Lawrence (code) and Sam Norman (art), GPL. You fly a biplane over a procedurally generated city shooting monkeys; `game.txt` holds the design notes and `todo.html` the author's TODO/refactoring ideas.

## Build & run

- Build (Linux): `make` from the repo root (just recurses into `src/`). Output binary is `./kongtest` in the repo root. `make clean` to clean.
- Dependencies: g++, OpenGL/GLU, SDL 1.2 (`sdl-config` must be on PATH), SDL_image, SDL_mixer, libxml2 (`xml2-config`). Note: `sdl-config` is not currently installed on this machine, so the build will fail until SDL 1.2 dev packages (or sdl12-compat) are installed.
- Compile flags include `-g -pg` (gprof profiling).
- Run from the repo root (data paths are relative, e.g. `data/etc/`): `./kongtest [file.game]`. With no argument it runs `default_game` from `data/etc/main.properties` (`data/federal_monkey_patrol.game`). `./kongtest fly.game` jumps straight into a mission.
- `window.sh` / `fullscreen.sh` copy a display preset over `data/etc/display.properties` then run the binary.
- Windows: Visual Studio 2005 project in `win32/Kong.sln` (`old-win32/` is an older VC++ project). It expects SDL/libxml2 headers and libs in `win32/include` and `win32/lib`, which are not in the repo, and `kong.bat`/`kong_fly.bat` expect the built exe at `bin/Kong.exe`.
- Docs: `doxygen Doxyfile` (generated output is not checked in).

### Makefile structure (important when adding files)
Every source directory has its own Makefile with an explicit `OBJECTS = ...` list and `SUBDIRS`; the top-level `src/Makefile` links by globbing `dir/*.o` for a **hard-coded list of directories**. When adding a `.cpp`, add its `.o` to that directory's Makefile; when adding a new directory, also add it to the parent's `SUBDIRS` and to the link line in `src/Makefile`. `.d` dependency files are generated per object. `src/ktemplate.pl CLASSNAME` generates a skeleton `.h`/`.cpp` in the house style (GPL header, include guard, disabled copy ctor/assignment).

### Tests
There is no test framework. `src/testing.cpp` contains ad-hoc test hooks (`before_test()`, `graphics_test()`, `testing_area()`) that `main()` calls before the main loop; enable/disable experiments there.

## Architecture

Includes are rooted at `src/` (e.g. `#include "game/mission/mission.h"`).

- **Main loop** (`src/main.cpp`): creates `Display` singleton, a `GameManager` from a `.game` file, `InputManager`/`Input`, then loops `inputmanager->update(input); game->play(timer.tick(), input)` until status is `QUIT`. Globals `settings` and `gamestats` are defined in main.cpp. Errors are thrown as `std::string`.
- **Game script (`.game` files)** — parsed by `game/gamefilereader.cpp`, one component per line: `storyteller <file.shot|.story>`, `mission <file.xml>`, `blank <hexcolor>`, `picture <img> ...`, `music ...`, and `transition <fade|spin|hwipe|vwipe|starwipe|NNwipe> <msecs>` which links the previous and next components. `#` comments.
- **GameComponent** (`game/gamecomponent.h`): base for everything in the sequence (Blank, Picture, Soundtrack, Storyteller, Transition, Mission, plus the Tuner overlay). Subclasses implement `getName()`, `_load()`, `_play(msecs, input, alpha)` and set status (`PLAYING`/`NEXT`/`LOST`/`QUIT`). `GameManager` holds a list of ref-counted `GameComponentRef`s and advances on `NEXT`; an in-game **Tuner** (`game/tuner/`, configured by `data/etc/toggles.xml` + `tuner.properties`) lets you tweak values live via toggle menus.
- **Mission** (`game/mission/`): built from `data/missions/*.xml` by `MissionBuilder` (startconditions: height, player model, Giant Claw params; optional constraints; outcomes). `outcomes/` implements Scenario → Condition (stat comparisons against `GameStatistics`) → Result. `world/` holds the `World` and `entities/` (Entity, Plane, Monkey, Projectile) driven by `Controller`s — `AIController` or input-filter controllers (`FollowPlaneFilter`, `TopDownPlaneFilter` for the two flight modes). `GiantClaw` is the above-the-rooftops penalty mechanic.
- **Graphics** (`graphics/`): `Display` singleton (SDL/GL setup from `display.properties`), `Texture`, `Timer`. `3d/` is a `Drawable` composite hierarchy (`draw()` calls virtual `representation()`; `BoundedDrawable`, containers, LOD, flyweights, quadtree, billboards, L-system trees via `util/lsystem`), with `3d/city/` procedurally generating skyscrapers/city blocks and `3d/collision/`. Models: `.obj` and `.md2`. `2d/` is HUD/overlay widgets (text, chyron, slidebars, claw alert, fog plane). `camera/` has camera + cameraman implementations.
- **Input** (`input/`): `InputManager` dispatches SDL events to device handlers (Keyboard, Mouse, Joystick, MiscEventHandler) filling an `Input` struct; `InputFilter`s (e.g. `MenuFilter`) interpret it.
- **Config** (`util/settings.cpp`): loads `data/etc/{display,story,physics,game,main,tuner,city}.properties` as key=value; access via `settings.gets("<module>", "<key>")`, etc. A module/key must exist or an exception is thrown. Math uses `util/mtxlib` (`vector3` etc.); RNG is `util/MersenneTwister.h`.
- **Data** (`data/`): `etc/` config, `missions/` XML, `story/` `.shot`/`.story` cutscene scripts and images, `models/`, `images/`, `sound/`.
