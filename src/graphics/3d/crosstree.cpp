// (C) David Lawrence released under the GPL (see license.txt)
// Started:       25 May 2004
// Last modified: 25 May 2004

#include "graphics/3d/crosstree.h"
#include <iostream>
#include <string>

using namespace std;

CrossTree::CrossTree(MTRand& mt, GLfloat w, GLfloat h):
    Drawable(), width(w)
{
    setHeight(h);
    tree.width = width;
    tree.height = getHeight();
    rot = (float)mt.rand() * 90.0f;  

    static const unsigned int NUM_TREES = 4;
    string treename[NUM_TREES] = {
	"tree1.png",
	"tree2.png",
	"tree3.png",
	"tree_autumn.png"
    };

    string filename("data/images/billboards/");
    filename = "data/images/billboards/" + treename[ mt.randInt(NUM_TREES-1) ];
    Texture* texture = Texture_Factory(filename);
    texid = texture->getTexId();
    delete texture;
}

CrossTree::CrossTree(const CrossTree& rhs):
Drawable(rhs),
width(rhs.width),
texid(rhs.texid),
rot(rhs.rot),
tree(rhs.tree)
{

}


void CrossTree::draw(drawdetails_t drawdetails)
{
    tree.pos = drawdetails.offset + getPosition();
    tree.rot = rot;
    billboards_addv( texid, tree );

    tree.rot += 90.0f; // 2nd billboard is at right angles
    billboards_addv( texid, tree );
}


Drawable* CrossTree::clone(void) const
{
    return new CrossTree(*this);
}
