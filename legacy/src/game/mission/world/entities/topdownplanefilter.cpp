// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sun Mar 20 20:45:26 2005
// Last modified: Sun Mar 20 20:45:26 2005

#include "entity.h"
#include "topdownplanefilter.h"
#include "util/util.h"
#include <iostream>

using namespace std;

#define ACCEL 20;

TopDownPlaneFilter::TopDownPlaneFilter(): axis(0.0f, 0.0f, 0.0f)
{
    left  = -2000.0f;
    right =  2000.0f;

}


TopDownPlaneFilter::~TopDownPlaneFilter()
{

}


void TopDownPlaneFilter::_read(Input& in)
{
    axis = in.getAxis();

    if( in.buttonPressed( Input::FIRE1 ) ) {
	firing = 1;
    } else if( in.buttonPressed( Input::FIRE2 ) ) {
	firing = 2;
    } else {
	firing = 0;
    }
}


void TopDownPlaneFilter::control(Entity* ent, Uint32 msecs)
{
    ent->velocity.x +=  axis.x * ACCEL;
    ent->velocity.z += -axis.y * ACCEL;

    ent->setFiring( firing );

}


