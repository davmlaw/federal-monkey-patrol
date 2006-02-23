// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Tue Apr  5 22:52:03 2005
// Last modified: Tue Apr  5 22:52:03 2005

// This deals with non-input SDL events eg from the windowing system

#ifndef MISCEVENTHANDLER
#define MISCEVENTHANDLER

#include "input/inputdevice.h"

/**
 * Handles non-input SDL events
 * @see http://www.libsdl.org
 */
class MiscEventHandler : public InputDevice {
public:
    MiscEventHandler();
    virtual ~MiscEventHandler() { };
    virtual void processEvent(SDL_Event& event, Input& input);
    virtual std::string getName(void) { return "MiscEventHandler"; };
private:
};

#endif // MISCEVENTHANDLER
