/*  (C) 2004 David Lawrence
 *  Started:       Feb 20 2004
 *  Last modified: May 27 2004
 */

#ifndef BILLBOARDS_H
#define BILLBOARDS_H

#include <string>
#include "util/mtxlib.h"
#include "graphics/3d/drawable.h"
#include "graphics/texture.h"
#include <iostream>

typedef struct {
    vector3 pos;
    GLfloat rot;
    GLfloat width;
    GLfloat height;
} billboard_t;

void billboards_draw(void);
void billboards_addv(GLuint tex_id, billboard_t& b);
void billboards_addh(GLuint tex_id, billboard_t& b);

/**
 * Billboard (textured quad) for special effects.
 */
class Billboard : public Drawable {
public:
    Billboard(std::string tex, GLfloat w, GLfloat h, GLfloat r = 0.0f) {
	bb.pos.set(0.0f, 0.0f, 0.0f);
	bb.rot    = r;
	bb.width  = w;
	bb.height = h;
	std::string dir = "data/images/billboards/";

	Texture* t = Texture_Factory(dir + tex);
	texId = t->getTexId();
	delete t;
    };
    virtual void representation(drawdetails_t& drawdetails) {
	billboard_t temp_bb = bb;
	temp_bb.pos += drawdetails.offset;
	billboards_addh(texId, temp_bb);
    };
    virtual Drawable* clone(void) const {
	return new Billboard(*this);
    }
protected:
    Billboard(const Billboard& rhs): Drawable(rhs),
				     bb(rhs.bb), texId(rhs.texId) { };
private:
    billboard_t bb;
    GLuint texId;
};




#endif
