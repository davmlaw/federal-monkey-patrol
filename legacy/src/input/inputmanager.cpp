// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sat Mar 12 21:41:05 2005
// Last modified: Sat Mar 12 21:41:05 2005

#include "graphics/display.h"
#include "input/inputmanager.h"
#include "input/joystick.h"
#include "input/keyboard.h"
#include "input/misceventhandler.h"
#include "input/mouse.h"
#include "util/util.h"
#include <iostream>

using namespace std;


static string SDL_Event_Name(int event); // Why doesn't SDL have this?

InputManager::InputManager()
{
    Display::Instance();    // To ensure other SDL stuff is setup

    // Add handling devices
    devices.push_back( new MiscEventHandler() );
    devices.push_back( new Keyboard() );
    //devices.push_back( new Mouse() );
    if( Joystick::exists() ) {
	devices.push_back( new Joystick() );
    }

    devicelist_t::iterator dev, end = devices.end();
    for( dev = devices.begin() ; dev != end ; ++dev ) {
	sdlevent_list_t eventlist = (*dev)->getAcceptedEvents();
	sdlevent_list_t::iterator e, e_end = eventlist.end();
	for( e = eventlist.begin() ; e != e_end ; ++e ) {
	    handler[*e] =  *dev;
	    cout << "handler[" << SDL_Event_Name( *e ) << "] = "
		 << (*dev)->getName() << endl;
	}
    }

}


InputManager::~InputManager()
{
    vector<InputDevice*>::iterator i, end = devices.end();
    for( i=devices.begin() ; i != end ; ++i ) {
	delete (*i);
    }
}


void InputManager::update(Input& input)
{
    SDL_Event event;

    while ( SDL_PollEvent(&event) ) {
	sdltype_device_map_t::iterator h = handler.find(event.type);
	if( h != handler.end() ) {
	    h->second->processEvent( event, input );
	}
    }

    input.centerAxis();

    vector<InputDevice*>::iterator i, end = devices.end();
    for( i=devices.begin() ; i != end ; ++i ) {
	vector2 axis = (*i)->getAxis();
	input.modifyAxis( axis );
    }

}


static string SDL_Event_Name(int event)
{
    char* names[SDL_NUMEVENTS];
    memset( names, 0, SDL_NUMEVENTS * sizeof(char*) );

    names[SDL_KEYDOWN]         = "SDL_KEYDOWN";
    names[SDL_KEYUP]           = "SDL_KEYUP";
    names[SDL_MOUSEMOTION]     = "SDL_MOUSEMOTION";
    names[SDL_MOUSEBUTTONDOWN] = "SDL_MOUSEBUTTONDOWN";
    names[SDL_MOUSEBUTTONUP]   = "SDL_MOUSEBUTTONUP";
    names[SDL_JOYAXISMOTION]   = "SDL_JOYAXISMOTION";
    names[SDL_JOYBALLMOTION]   = "SDL_JOYBALLMOTION";
    names[SDL_JOYHATMOTION]    = "SDL_JOYHATMOTION";
    names[SDL_JOYBUTTONDOWN]   = "SDL_JOYBUTTONDOWN";
    names[SDL_JOYBUTTONUP]     = "SDL_JOYBUTTONUP";
    names[SDL_QUIT]            = "SDL_QUIT";
    names[SDL_SYSWMEVENT]      = "SDL_SYSWMEVENT";
    names[SDL_VIDEORESIZE]     = "SDL_VIDEORESIZE";
    names[SDL_VIDEOEXPOSE]     = "SDL_VIDEOEXPOSE";
    
    string n = "UNKNOWN EVENT"; // not really, but for all we care it is.
    if( 0 <= event && event < SDL_NUMEVENTS )
	n = names[event];
    return n;
}
