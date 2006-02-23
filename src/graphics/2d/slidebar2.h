// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Thu Feb 10 21:58:29 2005
// Last modified: Thu Feb 10 21:58:29 2005

#ifndef SLIDEBAR2
#define SLIDEBAR2

#include "graphics/2d/drawable2d.h"
#include "graphics/2d/image.h"

class SlideBar2 : public Transitional2D {
public:
    SlideBar2(GLfloat w, GLfloat h);
    virtual ~SlideBar2();
    virtual void representation(GLfloat alpha);
private:
    Image* background;
    Image* foreground;
};

#endif // SLIDEBAR2
