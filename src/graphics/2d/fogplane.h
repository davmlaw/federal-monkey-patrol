// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sun Feb  6 00:02:51 2005
// Last modified: Sun Feb  6 00:02:51 2005

#ifndef FOGPLANE
#define FOGPLANE

#include "graphics/2d/drawable2d.h"

/**
 * Drawn in the far distance (so fogged out) and objects disappear into the distance
 */
class FogPlane : public Drawable2D {
public:
    FogPlane(GLfloat w, GLfloat h, GLfloat d):
	Drawable2D(w,h), fog(w,h), distance(d) { };
    virtual ~FogPlane() { };
    virtual void representation(GLfloat alpha);
 private:
    Quad fog;
    GLfloat distance; // into the horizon
};


#endif // FOGPLANE
