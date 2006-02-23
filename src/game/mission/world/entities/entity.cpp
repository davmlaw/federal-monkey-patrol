// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Mon Jun 20 01:09:56 2005
// Last modified: Mon Jun 20 01:09:56 2005

#include "entity.h"

using namespace std;


Entity::Entity(Drawable* d):
drawable(d),
velocity(0.0f, 0.0f, 0.0f),
firing(0),
dead(false),
controller(0)
{

}


Entity::~Entity() {
	delete drawable;
	delete controller;
}


void Entity::update(World& w, Uint32 msecs) {
	if( controller )
		controller->control( this, msecs );

	// physics...
	matrix44 r = drawable->getRotMat();
	drawable->move( r * velocity * (float)msecs * 0.001f );
	//velocity *= (1.0f - getFriction() * msecs);

	_update(w, msecs);
}
