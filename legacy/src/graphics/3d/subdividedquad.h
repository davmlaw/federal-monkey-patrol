// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sat May  7 11:46:03 2005
// Last modified: Sat May  7 11:46:03 2005

#ifndef SUBDIVIDEDQUAD
#define SUBDIVIDEDQUAD

#include "graphics/3d/drawable.h"

/**
 * Quad that can be split into multiple numbers of polygons for better appearance
 */
class SubdividedQuad : public Drawable {
public:
    SubdividedQuad(float x_width, float z_width, unsigned int s = 1);
    virtual ~SubdividedQuad();
    void setSubdivisions(unsigned int s) { subdivisions = s; };
    void setTextureRepeats(unsigned int r) { repeats = r; };
    void setTextureOffsets(GLfloat nu, GLfloat nv) { ou = nu; ov = nv; };
    virtual void representation(drawdetails_t& drawdetails);
    virtual Drawable* clone(void) const {
	return new SubdividedQuad(*this);
    };
private:
    float x_width;
    float z_width;
    unsigned int subdivisions;
    unsigned int repeats;
    GLfloat ou; // texture offsets
    GLfloat ov;
};

#endif // SUBDIVIDEDQUAD
