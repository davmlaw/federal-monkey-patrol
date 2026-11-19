// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sat Mar 12 18:07:39 2005
// Last modified: Sat Mar 12 18:07:39 2005

#include "input/joystick.h"
#include <iostream>

using namespace std;


Joystick::Joystick()
{
    if( (joy=SDL_JoystickOpen(0)) ) {
	SDL_JoystickEventState(SDL_ENABLE);
	    
	// Ok, we can handle joystick now...
	accepted_events.push_back( SDL_JOYAXISMOTION );
	accepted_events.push_back( SDL_JOYBUTTONUP );
	accepted_events.push_back( SDL_JOYBUTTONDOWN );
	    
	num_buttons = SDL_JoystickNumButtons(joy);
	button_config = new Input::buttons[ num_buttons ];
	for( int i=0 ; i<num_buttons ; ++i ) {
	    button_config[i] = Input::NONE;
	}
	button_config[0] = Input::FIRE1;
	button_config[1] = Input::FIRE2;
	button_config[8] = Input::TUNER;
    } else {
	cout << "Couldn't open Joystick 0" << endl;
    }
}


Joystick::~Joystick()
{
    if(SDL_JoystickOpened(0))
	SDL_JoystickClose(joy);
}

// FIXME: Hack
#define TOLERANCE 0.1f

void Joystick::processEvent(SDL_Event& event, Input& input)
{
    float pos;
    bool pressed = false;
    Uint8 button;

    switch( event.type ) {
    case SDL_JOYAXISMOTION:
	pos = (float)event.jaxis.value / (1<<15);
	if( pos > -TOLERANCE && pos < TOLERANCE ) {
	    pos = 0.0f;
	}
	if( event.jaxis.axis == 0 ) {
	    axis.x =  pos;
	} else if( event.jaxis.axis == 1 ) {
	    axis.y = -pos;
	}
//	cout << "axis = " << axis.x << " , " << axis.y << endl;
	break;
    case SDL_JOYBUTTONDOWN: pressed = true; //fall through
    case SDL_JOYBUTTONUP:
	button = event.jbutton.button;
	if ( button < num_buttons )
	    input.setButton( button_config[button], pressed );

	cout << "button = " << (unsigned int)button << "." << endl;
    }

}
