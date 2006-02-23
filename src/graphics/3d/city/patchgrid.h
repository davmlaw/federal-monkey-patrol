// (C) David Lawrence released under the GPL (see license.txt)
// Started:       05 Apr 2004
// Last modified: 03 May 2004

#ifndef PATCHGRID_H
#define PATCHGRID_H

#include "graphics/3d/boundeddrawable.h"
#include "graphics/texture.h"

/**
 * Holds the city blocks, loads/unloads appropriately to scroll through world
 */
class PatchGrid : public DrawableAABB {
    friend class Patch;
public:
    PatchGrid(const vector3& dimensions, int blocksPerChild);
    ~PatchGrid();
    void setPosition(const vector3& position);
    virtual Drawable* clone(void) const {
	throw "FIXME: PatchGrid.clone() not implemented";
	return 0;
    };
    enum { patches = 8 }; // enum hack for MSVC++
protected:
    virtual void representation(drawdetails_t& drawdetails);
private:
    void draw_patch(drawdetails_t& drawdetails, const int col, const int row);
    GLfloat getPatchHeight( const int col, const int row );
    int center_x, center_z;
    GLfloat blocksize;
    GLfloat child_length;
    Texture* groundtex;
    Drawable* qtree;
    Drawable* child[patches][patches];
    Drawable* create_patch_tree(int x, int y, int n);
    Drawable* ground;
};



class Patch : public Drawable {
public:
    Patch(PatchGrid* p, int c, int r);
    ~Patch() { };
    void representation(drawdetails_t& drawdetails);
    virtual Drawable* clone(void) const {
	throw "FIXME: Patch.clone() not implemented";
	return 0;
    };
private:
    // not implemented
    Patch(const Patch& rhs);
    Patch& operator=(const Patch& rhs);
    float mycolor[3];
    int col, row;
    PatchGrid* pgrid;
};




#endif
