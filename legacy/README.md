# Legacy C++ version

The original 2004–2006 C++ / OpenGL / SDL 1.2 source, kept as a reference for the browser port. The tag [`v2006-native`](https://github.com/davmlaw/federal-monkey-patrol/releases/tag/v2006-native) has the tree exactly as it was before the move.

The code still expects to run from the repo root, because data paths like `data/etc/` are relative:

```sh
make -C legacy          # builds legacy/kongtest
./legacy/kongtest       # run from the repo root
```

Dependencies: g++, OpenGL/GLU, SDL 1.2 (`sdl-config`, or sdl12-compat), SDL_image, SDL_mixer, libxml2. The Visual Studio 2005 project is in `win32/Kong.sln`.
