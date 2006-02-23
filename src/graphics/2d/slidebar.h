// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Thu Feb 10 21:58:29 2005
// Last modified: Thu Feb 10 21:58:29 2005

#ifndef SLIDEBAR
#define SLIDEBAR

#include "graphics/2d/drawable2d.h"

/**
 * Menu Slidebar used in Tuner
 * @see Tuner
 */
class SlideBar : public Transitional2D {
public:
    SlideBar(GLfloat w, GLfloat h): Transitional2D(w,h) {};
    virtual ~SlideBar() { };
    virtual void representation(GLfloat alpha);
private:
};

#endif // SLIDEBAR
