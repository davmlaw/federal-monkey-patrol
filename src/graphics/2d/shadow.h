// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Wed Apr 20 00:34:48 2005
// Last modified: Wed Apr 20 00:34:48 2005

#ifndef SHADOW
#define SHADOW

#include "graphics/2d/drawable2d.h"
#include "graphics/texture.h"

/**
 * Dodgy looking shadow
 */
class Shadow : public Drawable2D {
public:
    Shadow(GLfloat w, GLfloat h);
    virtual ~Shadow();
    virtual void representation(float alpha);
private:
    Texture* tex;
    Drawable2D* quad;
};

#endif // SHADOW
