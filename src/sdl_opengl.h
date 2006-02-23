// (C) 2005 David Lawrence released under the GPL (see license.txt)
// Started:            ? 2003
// Last modified: 28 Jan 2004

#ifndef SDL_OPENGL_H
#define SDL_OPENGL_H

#define USE_MIXER 1

#if defined __MACOSX__ || defined __APPLE__

#include <OpenGL/gl.h>
#include <OpenGL/glu.h>
#include "SDL.h"
#include <SDL_image/SDL_image.h>
#ifdef USE_MIXER
#include <SDL_mixer/SDL_mixer.h>
#endif

#else ////// Unix / Windows

#ifdef WIN32
#include <windows.h>
#endif

#include <GL/gl.h>
#include <GL/glu.h>				
#include "SDL.h"
#include "SDL_image.h"

#ifdef USE_MIXER
#include "SDL_mixer.h"
#endif

#endif


#endif // SDL_OPENGL
