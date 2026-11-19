// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sat Mar 12 21:41:05 2005
// Last modified: Sat Mar 12 21:41:05 2005

#ifndef INPUTMANAGER
#define INPUTMANAGER

#include "input/input.h"
#include "input/inputdevice.h"
#include "util/mtxlib.h"
#include <vector>
#include <map>
#include <iostream>

typedef std::vector<InputDevice*> devicelist_t;
typedef std::map<Uint8, InputDevice*> sdltype_device_map_t;

/**
 * Manages input devices and sets input.
 * @see Input
 * @see InputDevice
 */
class InputManager {
public:
    InputManager();
    virtual ~InputManager();
    void update(Input& input);
private:
    devicelist_t devices;
    sdltype_device_map_t handler;
};

#endif // INPUTMANAGER
