// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sun Mar 20 23:25:08 2005
// Last modified: Sun Mar 20 23:25:08 2005

#include "game/mission/world/entities/plane.h"
#include "game/mission/world/entities/followplanefilter.h"
#include "game/mission/world/entities/topdownplanefilter.h"
#include "graphics/3d/model.h"
#include "graphics/display.h"
#include <iostream>
#include "player.h"

using namespace std;

Player::Player(const string& model, const string& skin,
	       float start_height, playermode_t m):
    mode(m)
{

    Drawable* d = Model::Factory(model, skin);
    d->setPosition(0.0f, start_height, 0.0f);
    d->setScale( 0.01f );

    entity = new Plane(d);
    //entity->velocity.z = -600.0f;
    
    controller[TOPDOWN] = new TopDownPlaneFilter();
    controller[FOLLOW]  = new FollowPlaneFilter();
    setMode( mode );
}


Player::~Player()
{
    //cout << "~player1" << endl;
    for( int i=0 ; i<NUM_MODES ; ++i ) {
	//cout << "i = " << i << endl;
	delete controller[i];  // FIXME: here, or in ~entity?
    }
    //delete entity; // this is deleted in world()
    //cout << "~player2" << endl;
}


void Player::read(Input& input)
{
    controller[mode]->read(input);

}


void Player::setMode(playermode_t m)
{
    if( mode < NUM_MODES )
	mode = m;
    entity->setController( controller[mode] );
}
