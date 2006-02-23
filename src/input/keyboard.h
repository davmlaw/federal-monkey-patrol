// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sat Mar 12 18:07:52 2005
// Last modified: Sat Mar 12 18:07:52 2005

#ifndef KEYBOARD
#define KEYBOARD

#include "input/inputdevice.h"

/**
 * Keyboard input device
 */
class Keyboard : public InputDevice {
public:
    Keyboard();
    virtual ~Keyboard() { };
    virtual void processEvent(SDL_Event& event, Input& input);
    virtual std::string getName(void) { return "Keyboard"; };
private:
    
};

#endif // KEYBOARD
