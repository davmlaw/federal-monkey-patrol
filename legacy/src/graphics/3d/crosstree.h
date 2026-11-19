// (C) David Lawrence released under the GPL (see license.txt)
// Started:       25 May 2004
// Last modified: 25 May 2004

#ifndef CROSSTREE_H
#define CROSSTREE_H

#include <string>
#include "util/MersenneTwister.h"
#include "graphics/3d/drawable.h"
#include "graphics/texture.h"
#include "billboards.h"

/**
 * Tree.
 * Uses billboards
 */
class CrossTree : public Drawable {
public:
    CrossTree(MTRand& mt, GLfloat w, GLfloat h);
    CrossTree(const CrossTree& rhs);
    ~CrossTree() { };
    virtual void draw(drawdetails_t drawdetails);
    // FIXME: Do all drawables shouldn't need a representation or should
    //        I use a subclass to contain matrices, representation etc?
    virtual void representation(drawdetails_t& drawdetails) { };
    virtual Drawable* clone(void) const;
private:
    GLfloat width;
    GLuint texid;
    float rot;
    billboard_t tree;
};

#endif
