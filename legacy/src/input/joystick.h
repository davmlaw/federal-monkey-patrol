// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sat Mar 12 18:07:39 2005
// Last modified: Sat Mar 12 18:07:39 2005

#ifndef JOYSTICK
#define JOYSTICK

#include "input/inputdevice.h"

/**
 * Joystick/Gamepad device
 */
class Joystick : public InputDevice {
public:
    Joystick();
    virtual ~Joystick();
    virtual void processEvent(SDL_Event& event, Input& input);
    virtual std::string getName(void) {
	return std::string(SDL_JoystickName( SDL_JoystickIndex(joy) ));
    };
    static bool exists(void) {
	return SDL_NumJoysticks() > 0;
    }
private:
    SDL_Joystick *joy;
    int num_buttons;
    Input::buttons* button_config;
};

#endif // JOYSTICK
