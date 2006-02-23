// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sat Mar 12 18:07:52 2005
// Last modified: Sat Mar 12 18:07:52 2005

#include "input/keyboard.h"
#include "graphics/display.h"
#include <iostream>
#include <map>

using namespace std;


Keyboard::Keyboard()
{
	accepted_events.push_back( SDL_KEYUP );
	accepted_events.push_back( SDL_KEYDOWN );
}


void Keyboard::processEvent(SDL_Event& event, Input& input)
{
	SDLKey key = event.key.keysym.sym;
	int pressed = (event.type == SDL_KEYDOWN);

	map<SDLKey,Input::buttons> keys;
	keys[SDLK_SPACE]  = input.FIRE1;
	keys[SDLK_RETURN] = input.FIRE1;
	keys[SDLK_LCTRL]  = input.FIRE2;
	keys[SDLK_RCTRL]  = input.FIRE2;
	keys[SDLK_ESCAPE] = input.QUIT;
	keys[SDLK_INSERT] = input.TUNER;

	map<SDLKey,Input::buttons>::iterator button;
	button = keys.find( key );
	if( button != keys.end() ) {
		input.setButton( button->second, pressed != 0 );
	} else {
		switch( key ) {
			case SDLK_LEFT:  axis.x = (float)(-1 * pressed); break;
			case SDLK_RIGHT: axis.x = (float)( 1 * pressed); break;
			case SDLK_UP:    axis.y = (float)( 1 * pressed); break;
			case SDLK_DOWN:  axis.y = (float)(-1 * pressed); break;
			case SDLK_F12:   Display::Instance().screenshot("foo"); break;
			default:
			;
		}
	}

}


