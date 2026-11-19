// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Mon Jun 20 00:48:03 2005
// Last modified: Mon Jun 20 00:48:03 2005

#include "constraints.h"
#include "util/util.h"

using namespace std;


Constraints::Constraints():
    max_height(10000),
    min_height(0),
    max_speed(1000),
    min_speed(0)
{

}


Constraints::~Constraints()
{

}


void Constraints::restrict(Player* player)
{
    vector3 pos = player->entity->drawable->getPosition();
    pos.y = clamp<float>( min_height, pos.y, max_height );


/*
#define DIST 500

  // FIXME: get it to stay certain dist either side of a vector

    vector3 up(0.0f, 1.0f, 0.0f);
    vector3 cp = CrossProduct(direction, up);
    vector3 left  = cp *  DIST;
    vector3 right = cp * -DIST;

    pos.x = clamp<float>( min<float>(left.x, right.x),
			  pos.x,
			  max<float>(left.x, right.x) );
*/  

    player->entity->drawable->setPosition( pos );

/*
	static bool mode = true;
	if ( 0 && input->buttonToggled( Input::FIRE2 )) {
	    mode = !mode;
	    if( mode ) {
		player->setMode(Player::TOPDOWN);
	    } else {
		player->setMode(Player::FOLLOW);
	    }
	}





void TopDownPlaneFilter::constrain(Entity* ent, Uint32 msecs)
{


    if( pos.x < left ) {
	pos.x = left;
	ent->velocity.x = 0.0f;
    } else if( pos.x > right ) {
	pos.x = right;
	ent->velocity.x = 0.0f;
    }

    //cout << "pos was (" << pos.x << "," << pos.y << "," << pos.z << "\n";

}


*/

}
