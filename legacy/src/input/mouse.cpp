// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sat Mar 12 22:27:17 2005
// Last modified: Sat Mar 12 22:27:17 2005

#include "input/mouse.h"
#include <iostream>

using namespace std;


Mouse::Mouse()
{
    accepted_events.push_back( SDL_MOUSEMOTION );
    accepted_events.push_back( SDL_MOUSEBUTTONUP );
    accepted_events.push_back( SDL_MOUSEBUTTONDOWN );

    //	SDL_WM_GrabInput(SDL_GRAB_ON); // Mouse

}


Mouse::~Mouse()
{

}


void Mouse::processEvent(SDL_Event& event, Input& input)
{
    /*




static const float MAXPITCH_RATE = 90.0f;
void Input::handle_mouse(int dx, int dy)
{

    x += dx * sensitivity;
    y -= dy * sensitivity;

    if( y > MAXPITCH_RATE)
	y = MAXPITCH_RATE;
    else if( y < -MAXPITCH_RATE)
	y = -MAXPITCH_RATE;

}

    */


}
