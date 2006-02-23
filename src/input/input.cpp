// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Tue Mar 15 20:11:16 2005
// Last modified: Tue Mar 15 20:11:16 2005

#include "input/input.h"
#include "util/util.h"
#include <iostream>

using namespace std;


Input::Input()
{
    clear();
}

void Input::clear()
{
    for( int i=0 ; i<NUM_BUTTONS ; ++i ) {
	button_state[i] = false;
	button_toggle[i] = false;
    }
    axis.x = 0.0f;
    axis.y = 0.0f;
}


bool Input::buttonPressed(buttons b) {
    return (b < NUM_BUTTONS)? button_state[b] : false;
}


bool Input::buttonToggled(buttons b) {
    return (b < NUM_BUTTONS)? button_toggle[b] : false;
}


vector2 Input::getAxis(void)
{
    //axis.x = clamp<float>(-1.0f, axis.x, 1.0f);
    //axis.y = clamp<float>(-1.0f, axis.y, 1.0f);
    return axis;
}

void Input::centerAxis(void)
{
    axis.x = 0.0f;
    axis.y = 0.0f;
}

void Input::modifyAxis(vector2& a)
{
    axis += a;
}


void Input::setButton(buttons b, bool down)
{
    if( b < NUM_BUTTONS ) {
	button_state[b] = down;
	if( down ) {
	    button_toggle[b] = !button_toggle[b];
	}
    }
}

