// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Tue Apr  5 23:22:45 2005
// Last modified: Tue Apr  5 23:22:45 2005

#include "graphics/3d/drawablecontainers.h"
#include "graphics/3d/collision/boundingvolume.h"
#include "graphics/3d/collision/sphere.h"
#include "graphics/3d/collision/aabb.h"
#include "graphics/texture.h"
#include <iostream>
#include <algorithm>

using namespace std;

////////////////////// DrawableContainer /////////////// 
// FIXME: STL containers are probably too slow, especially using windows

DrawableContainer::~DrawableContainer()
{
	for( kid=children.begin() ; kid != children.end() ; ++kid ) {
		delete *kid;
	}
}


void DrawableContainer::representation(drawdetails_t& drawdetails)
{
	for( kid=children.begin() ; kid != children.end() ; ++kid ) {
		(*kid)->draw(drawdetails);
	}
}


// Add a new child and update container height if necessary.
void DrawableContainer::add(Drawable *d)
{
	children.push_back(d);
	if( d->getHeight() > this->getHeight() )
		setHeight( d->getHeight() );
}


////////////// FLYWEIGHTS

DrawableFlyweight::DrawableFlyweight(Drawable *d):
Drawable(), child(d)
{
	setHeight( child->getHeight() );
}


void DrawableFlyweight::representation(drawdetails_t& drawdetails) {
	child->draw(drawdetails);
}

// FIXME: bv BoundingVolume = return child->getBoundingVolume();
/*
int DrawableFlyweight::isOccluded(drawdetails_t& drawdetails) {
return child->isOccluded(drawdetails);
}
*/

//// A flyweight that uses an opengl list (ok if the flyweight is static)
DrawableStaticFlyweight::DrawableStaticFlyweight(Drawable *d, GLuint l):
DrawableFlyweight(d), list(l)
{

}

void DrawableStaticFlyweight::representation(drawdetails_t& drawdetails)
{
	glCallList(list);
}


