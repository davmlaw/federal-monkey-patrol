// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Tue Mar 15 20:07:37 2005
// Last modified: Tue Mar 15 20:07:37 2005

#ifndef INPUTDEVICE
#define INPUTDEVICE

#include "../sdl_opengl.h"
#include "input/input.h"
#include "util/mtxlib.h"
#include <set>
#include <string>
#include <iostream>
#include <vector>

typedef std::vector<Uint8> sdlevent_list_t;

class InputDevice {
public:
    InputDevice(): axis(0.0f, 0.0f) { };
    virtual ~InputDevice() { };
    virtual void processEvent(SDL_Event& event, Input& input) = 0;
    virtual std::string getName(void) = 0;
    sdlevent_list_t getAcceptedEvents(void) {
	return accepted_events;
    };
    vector2 getAxis(void) { return axis; };
protected:
    sdlevent_list_t accepted_events;
    vector2 axis;
};

#endif // INPUTDEVICE
