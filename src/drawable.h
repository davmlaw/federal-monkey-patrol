#ifndef DRAWABLE_H
#define DRAWABLE_H

#include <GL/gl.h>
#include <GL/glu.h>
#include "SDL.h"

// Something that draws something in OpenGL

class myDrawable {
 public:
    myDrawable(void) { }
    virtual ~myDrawable(void) { };

    virtual void draw(void) = 0;
};


#endif
