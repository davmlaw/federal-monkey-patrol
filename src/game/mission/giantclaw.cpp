// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sun Jul  3 14:13:20 2005
// Last modified: Sun Jul  3 14:13:20 2005

#include "giantclaw.h"
#include <iostream>

using namespace std;


GiantClaw::GiantClaw(float mvh):
    anger(0.0f),
    min_visible_height(mvh),
    inc(0.0f),
    dec(0.0f)
{
    
}


GiantClaw::~GiantClaw()
{

}


void GiantClaw::update(const vector3& playerPos, Uint32 msecs)
{
    float change;
    if( playerPos.y > min_visible_height )
	change = inc;
    else
	change = -dec;
   
    anger.setState( anger.getState() + change * msecs / 1000.0f );
}

/*
	shadow = new Shadow(1.2f, 0.4f);
	hud->add( shadow );
*/
