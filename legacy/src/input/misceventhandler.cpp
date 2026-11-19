// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Tue Apr  5 22:52:03 2005
// Last modified: Tue Apr  5 22:52:03 2005

#include "misceventhandler.h"
#include <iostream>

using namespace std;


MiscEventHandler::MiscEventHandler()
{
    accepted_events.push_back( SDL_QUIT );
}


void MiscEventHandler::processEvent(SDL_Event& event, Input& input)
{
    switch( event.type ) {
    case SDL_QUIT:
	input.setButton(Input::QUIT);
	break;
    default:
	;
    }

}

