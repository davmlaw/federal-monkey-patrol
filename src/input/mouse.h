// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sat Mar 12 22:27:17 2005
// Last modified: Sat Mar 12 22:27:17 2005

#ifndef MOUSE
#define MOUSE

#include "input/inputdevice.h"

/**
 * Mouse input device
 */
class Mouse : public InputDevice {
public:
    Mouse();
    virtual ~Mouse();
    virtual void processEvent(SDL_Event& event, Input& input);
    virtual std::string getName(void) { return "Mouse"; };
private:
};

#endif // MOUSE
