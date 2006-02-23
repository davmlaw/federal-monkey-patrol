// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Tue Mar 15 20:11:16 2005
// Last modified: Tue Mar 15 20:11:16 2005

#ifndef INPUT_H
#define INPUT_H

#include "util/mtxlib.h"

/**
 * Input from a controller
 */
class Input {
public:
	Input();
	enum buttons {
		NONE,
		FIRE1,
		FIRE2,
		QUIT,
		TUNER,
		NUM_BUTTONS
	};
	void clear(void);
	bool buttonPressed(buttons b);
	bool buttonToggled(buttons b);
	vector2 getAxis(void);
	void setButton(buttons b, bool down=true);
	void centerAxis(void);
	void modifyAxis(vector2& a);
private:
	bool button_state[NUM_BUTTONS];
	bool button_toggle[NUM_BUTTONS];
	vector2 axis;
};

#endif // INPUT_H
