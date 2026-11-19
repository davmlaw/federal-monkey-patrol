// (C) David Lawrence released under the GPL (see license.txt)
// Started:       12 Jul 2004
// Last modified: 12 Jul 2004

#ifndef IMAGE_H
#define IMAGE_H

#include <string>
#include "graphics/2d/drawable2d.h"
#include "graphics/display.h"
#include "graphics/texture.h"

/**
 * A textured quad
 */
class Image : public Quad {
public:
    Image(std::string filename,
	  GLfloat w=Display::ORTHO_W, GLfloat h=Display::ORTHO_H);
    virtual ~Image(void);
    virtual void setWidth(GLfloat w);
    virtual void setHeight(GLfloat h);
    void setAspectLock(bool l) { aspectLock = l; }; // FIXME: For all 2d?
protected:
    virtual void representation(GLfloat alpha);
private:
    Texture* tex;
    bool aspectLock;
};

#endif
