// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Wed Oct 26 15:36:41 2005

#include "boundeddrawable.h"
#include <iostream>

using namespace std;


int BoundedDrawable::isOccluded(drawdetails_t& drawdetails)
{
	BoundingVolume* bv = getBoundingVolume(drawdetails.offset);
	intersection_t clip = bv->intersects(drawdetails.frustum);
	if( clip == INSIDE ) {
		drawdetails.flags |= INSIDE_FRUSTUM_BIT;
	}

	//    cout << "BV " << bv->getName() << " was " << clip << " occluded = "
	//	 << (int)!clip << endl;
	return (int)!clip; // 0 = outside
}

/// Container

BoundedDrawableContainer::~BoundedDrawableContainer()
{
	drawable_list_t::iterator i;
	for( i=unboundedChildren.begin() ; i != unboundedChildren.end() ; ++i) {
		delete *i;
	}	

	bounded_drawable_list_t::iterator j;
	for( j=boundedChildren.begin() ; j != boundedChildren.end() ; ++j) {
		delete *j;
	}	
}


// draw all children
void BoundedDrawableContainer::representation(drawdetails_t& drawdetails)
{
	drawable_list_t::iterator i;
	for( i=unboundedChildren.begin() ; i != unboundedChildren.end() ; ++i) {
		(*i)->draw(drawdetails);
	}	

	bounded_drawable_list_t::iterator j;
	for( j=boundedChildren.begin() ; j != boundedChildren.end() ; ++j) {
		(*j)->draw(drawdetails);
	}	
}

void BoundedDrawableContainer::add(Drawable *d)
{
	unboundedChildren.push_back(d);
}

void BoundedDrawableContainer::add(BoundedDrawable *bd)
{
	boundedChildren.push_back(bd);
}



//////////////// AABB
DrawableAABB::DrawableAABB(const vector3& dim):
	aabb(dim)
{

}

DrawableAABB::DrawableAABB(const AABB& a):
	aabb(a)
{

}


BoundingVolume* DrawableAABB::getBoundingVolume(const vector3& offset)
{
	aabb.setPosition(offset);
	return &aabb;
}


//////////////// Sphere
DrawableSphere::DrawableSphere(float radius):
sphere(radius)
{

}


BoundingVolume* DrawableSphere::getBoundingVolume(const vector3& offset)
{
	sphere.setPosition(offset);
	return &sphere;
}
