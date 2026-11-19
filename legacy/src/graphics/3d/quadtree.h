// (C) David Lawrence released under the GPL (see license.txt)

// Quadtree, for k-ary tree use DrawableContainer (see drawable.h)

#ifndef QUADTREE_H
#define QUADTREE_H

#include "graphics/3d/boundeddrawable.h"

/**
* 3d spatial data structure with 4 children
* Very simple implementation
*/
class Quadtree : public DrawableAABB {
public:
	Quadtree(const vector3& dim);
	Quadtree(const AABB& aabb);
	~Quadtree();
	virtual Quadtree* clone(void) const;
	virtual void add(Drawable *);
	// This sets which order the quadtree children are drawn.
	// rendering FRONT-TO-BACK is faster due to Z-buffer quick rejects
	static void setup_render_front_to_back(const vector3& heading);
protected:
	virtual void representation(drawdetails_t& drawdetails);
private:
	Drawable *child[4];
	unsigned int num_children;
	static unsigned int render_order[4];
};

#endif
