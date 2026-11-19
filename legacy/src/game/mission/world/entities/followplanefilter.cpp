// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sun Mar 20 21:55:05 2005
// Last modified: Sun Mar 20 21:55:05 2005

#include "entity.h"
#include "followplanefilter.h"

using namespace std;


FollowPlaneFilter::FollowPlaneFilter()
{

}


FollowPlaneFilter::~FollowPlaneFilter()
{

}


void FollowPlaneFilter::_read(Input& in)
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



void FollowPlaneFilter::control(Entity* ent, Uint32 msecs)
{
    ent->drawable->rotate( -1.0f * axis.y, -axis.x, 0.0f );
    ent->setFiring( firing );
}


