// (C) David Lawrence released under the GPL (see license.txt)
// Started:       15 Sep 2004

#include "game/transition/transition.h"
#include "game/transition/transitionfade.h"
#include "game/transition/transitionwipe.h"
#include "graphics/display.h"
#include <iostream>

using namespace std;

Transition* Transition_Factory(string name, Uint32 msecs)
{
	Transition* tran = NULL;

	if( name == "fade" ) {
		tran = new TransitionFade();
	} else if( name == "starwipe" ) {
		tran = new TransitionStarWipe();
	} else if( name == "spin" ) {
		tran = new TransitionSpin();
	} else {
		string::size_type p;
		if( (p = name.find("wipe")) != string::npos ) {
			string type = name.substr(0, p);
			float angle;
			if( type == "v" ) {        // Vertical convenience token
				angle = 180.0f;
			} else if( type == "h" ) { // Horizontal
				angle = 90.0f;
			} else {
				sscanf(type.c_str(), "%f_", &angle);
			}
			TransitionAngleWipe* taw = new TransitionAngleWipe(angle);
			tran = taw; 
		}
	}

	if( tran ) {
		//cout << "made type of " << tran->getName() << endl;
		tran->setTime(msecs);
	} else {
		cout << "ERROR: Could not find wipe of type \"" << name << "\"\n";
	}
	return tran;
}


Transition::Transition(): GameComponent(), Transitional2D(),
prev(0), next(0),
transition_time(0), time_displayed(0)
{
	GameComponent::status = PLAYING;
}


void Transition::_play(Uint32 msecs, Input* input, GLfloat alpha)
{
	time_displayed += msecs;
	setState( (float)time_displayed / (float)transition_time );    
	Display::Instance().draw_context_2d( this );
	if( getState() >= 1.0f ) {
		GameComponent::status = NEXT;
	}
}

